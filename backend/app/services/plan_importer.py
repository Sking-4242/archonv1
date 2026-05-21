"""
Terraform plan import service.

Accepts the JSON output of `terraform show -json plan.tfplan`, extracts
resource_changes and prior_state, maps resource types to Archon component
types, and returns a Graph JSON with change_action on each node plus a
plain-English change summary.
"""
from __future__ import annotations

import re
import uuid
from collections import defaultdict
from typing import Any

from app.services.tf_importer import _TYPE_MAP, _compute_layout

# ─── Action normalisation ─────────────────────────────────────────────────────

def _normalize_action(actions: list[str]) -> str:
    """Collapse a Terraform change-actions array to a single label."""
    if not actions:
        return "no-op"
    a = set(actions)
    if a == {"no-op"}:
        return "no-op"
    if a == {"create"}:
        return "create"
    if a == {"delete"}:
        return "delete"
    if a == {"update"}:
        return "update"
    # create + delete = in-place replacement
    if "create" in a and "delete" in a:
        return "replace"
    return "update"


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _friendly_type(tf_type: str) -> str:
    mapping = _TYPE_MAP.get(tf_type)
    if mapping:
        return mapping[3]
    return tf_type.replace("aws_", "").replace("_", " ").title()


def _extract_region(plan: dict) -> str:
    config = plan.get("configuration", {})
    provider_config = config.get("provider_config", {})
    for key, val in provider_config.items():
        if "aws" in key.lower():
            exprs = val.get("expressions", {})
            region_expr = exprs.get("region", {})
            const_val = region_expr.get("constant_value")
            if const_val:
                return str(const_val)
    return "us-east-1"


def _label_from_config(config: dict, res_name: str) -> str:
    for key in (
        "name", "function_name", "bucket", "cluster_id",
        "domain_name", "table_name", "queue_name", "topic_name",
        "db_instance_identifier", "cluster_identifier",
    ):
        val = config.get(key)
        if val and isinstance(val, str):
            return val
    return res_name


def _build_description(
    action: str,
    display_name: str,
    res_name: str,
    before: dict,
    after: dict,
) -> str:
    label = f'{display_name} "{res_name}"'
    if action == "create":
        return f"{label} will be created."
    if action == "delete":
        return f"{label} will be destroyed."
    if action == "replace":
        return f"{label} will be replaced (destroyed and re-created)."
    if action == "no-op":
        return f"{label} is unchanged."
    if action == "update" and before and after:
        skip = {"id", "arn", "tags_all", "owner_id", "last_modified"}
        changed = [
            k for k in set(list(before) + list(after))
            if before.get(k) != after.get(k)
            and k not in skip
            and not isinstance(after.get(k), (dict, list))
        ]
        if changed:
            attrs = ", ".join(sorted(changed)[:3])
            suffix = (
                f" (changed: {attrs})"
                if len(changed) <= 3
                else f" ({len(changed)} attributes changed)"
            )
            return f"{label} will be updated{suffix}."
    return f"{label} will be updated."


def _extract_sg_rules(rules_raw: Any) -> list[dict]:
    out = []
    for r in (rules_raw if isinstance(rules_raw, list) else []):
        if not isinstance(r, dict):
            continue
        out.append({
            "id": str(uuid.uuid4()),
            "protocol": r.get("protocol", "tcp"),
            "from_port": r.get("from_port", 0),
            "to_port": r.get("to_port", 0),
            "cidr": ", ".join(r.get("cidr_blocks") or []) or "0.0.0.0/0",
            "description": r.get("description", ""),
        })
    return out


# ─── Public entry point ───────────────────────────────────────────────────────

# Simple pattern to find "type.name" references in stringified config
_ADDR_RE = re.compile(r'\b([a-z][a-z0-9_]*)\.([a-z][a-z0-9_-]*)\b')

def import_plan(plan_json: dict) -> dict:
    """
    Parse a `terraform show -json` plan dict and return:
      - "graph":   Graph-compatible dict ready for frontend loadState
      - "summary": change counts + plain-English change list + prior summary
      - "warnings": list of human-readable warning strings
    """
    warnings: list[str] = []
    resource_changes: list[dict] = plan_json.get("resource_changes", [])
    region = _extract_region(plan_json)

    # ── Prior state summary (for modal left panel) ────────────────────────────
    prior_state = plan_json.get("prior_state", {})
    prior_resources = (
        prior_state.get("values", {})
        .get("root_module", {})
        .get("resources", [])
    )
    prior_by_type: dict[str, int] = defaultdict(int)
    for r in prior_resources:
        prior_by_type[r.get("type", "unknown")] += 1

    prior_summary = [
        {
            "tf_type": k,
            "display": _TYPE_MAP.get(k, (k, "", "", k))[3],
            "count": v,
        }
        for k, v in sorted(prior_by_type.items(), key=lambda x: -x[1])
    ]

    # ── Process resource changes ──────────────────────────────────────────────
    counts: dict[str, int] = defaultdict(int)
    change_descriptions: list[dict] = []
    components: list[dict] = []
    security_groups: list[dict] = []
    iam_roles: list[dict] = []
    resource_node_id_map: dict[tuple[str, str], str] = {}

    for rc in resource_changes:
        tf_type = rc.get("type", "")
        res_name = rc.get("name", "")
        address = rc.get("address", f"{tf_type}.{res_name}")
        change = rc.get("change", {})
        actions = change.get("actions", ["no-op"])
        before: dict = change.get("before") or {}
        after: dict = change.get("after") or {}

        action = _normalize_action(actions)
        counts[action] += 1

        # Use "after" for create/update/replace; "before" for delete
        config = after if action != "delete" else before

        # Map to Archon component type
        mapping = _TYPE_MAP.get(tf_type)
        if mapping:
            archon_type, category, icon, display_name = mapping
        else:
            archon_type = "generic_tf"
            category = "unknown"
            icon = "📦"
            display_name = _friendly_type(tf_type)
            warnings.append(f"Unknown type '{tf_type}' mapped to generic node.")

        node_id = str(uuid.uuid4())
        resource_node_id_map[(tf_type, res_name)] = node_id

        label = _label_from_config(config, res_name)

        # Security groups — extract into the security_groups side-list
        if tf_type == "aws_security_group" and action != "delete":
            security_groups.append({
                "id": node_id,
                "name": label,
                "description": config.get("description", ""),
                "ingress": _extract_sg_rules(config.get("ingress", [])),
                "egress": _extract_sg_rules(config.get("egress", [])),
            })

        # IAM roles
        if tf_type in ("aws_iam_role", "aws_iam_policy") and action != "delete":
            iam_roles.append({
                "id": node_id,
                "name": label,
                "policies": [],
            })

        components.append({
            "id": node_id,
            "type": archon_type,
            "category": category,
            "position": {"x": 0, "y": 0},
            "data": {
                "label": str(label),
                "awsType": display_name,
                "icon": icon,
                "nodeType": archon_type,
                "category": category,
                "change_action": action,
                "config": config,
                "tf_address": address,
            },
            "_res_type": tf_type,
            "_res_name": res_name,
        })

        change_descriptions.append({
            "action": action,
            "address": address,
            "display_name": display_name,
            "description": _build_description(action, display_name, res_name, before, after),
        })

    # ── Infer edges from config cross-references ──────────────────────────────
    edges: list[dict] = []
    existing_pairs: set[frozenset] = set()
    for comp in components:
        src_id = comp["id"]
        config_str = str(comp["data"].get("config", {}))
        for m in _ADDR_RE.finditer(config_str):
            ref_type, ref_name = m.group(1), m.group(2)
            tgt_id = resource_node_id_map.get((ref_type, ref_name))
            if tgt_id and tgt_id != src_id:
                pair = frozenset([src_id, tgt_id])
                if pair not in existing_pairs:
                    existing_pairs.add(pair)
                    edges.append({
                        "id": str(uuid.uuid4()),
                        "source": src_id,
                        "target": tgt_id,
                        "type": "default",
                        "data": {"edgeType": "default"},
                    })

    # ── Layout ────────────────────────────────────────────────────────────────
    components = _compute_layout(components)

    # Strip internal keys
    for comp in components:
        comp.pop("_res_type", None)
        comp.pop("_res_name", None)

    # ── Assemble output ───────────────────────────────────────────────────────
    graph = {
        "id": str(uuid.uuid4()),
        "name": "Terraform Plan",
        "region": region,
        "components": components,
        "edges": edges,
        "security_groups": security_groups,
        "iam_roles": iam_roles,
    }

    summary = {
        "counts": dict(counts),
        "changes": change_descriptions,
        "prior_summary": prior_summary,
        "region": region,
    }

    return {"graph": graph, "summary": summary, "warnings": warnings}
