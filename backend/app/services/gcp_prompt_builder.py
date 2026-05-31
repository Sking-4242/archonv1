"""Builds system + user prompts for GCP Terraform generation (google provider)."""

from __future__ import annotations

import json

from app.models.graph import Graph
from app.services.gcp_resource_map import _GCP_RESOURCE_MAP

_SYSTEM = (
    "You are an expert Google Cloud infrastructure engineer. "
    "You generate valid, production-ready Terraform HCL (google provider) "
    "from architecture diagrams described as JSON. "
    "Follow these rules strictly:\n"
    "1. Output ONLY Terraform HCL. No prose, no markdown fences, no comments unless "
    "they clarify non-obvious resource relationships.\n"
    "2. Every resource must have a unique, snake_case resource name.\n"
    "3. Use the google provider. Declare 'terraform { required_providers { google = { "
    "source = \"hashicorp/google\" version = \"~> 5.0\" } } }' at the top.\n"
    "4. Add 'provider \"google\" { project = var.project_id region = var.region }' block.\n"
    "5. Use variables for sensitive values (project_id, credentials, etc.).\n"
    "6. Reference resources by Terraform identifiers, not hardcoded IDs.\n"
    "7. Include firewall rules based on the security_groups array when present.\n"
    "8. Edge types: network=VPC connectivity, data_flow=data transfer, "
    "dependency=logical dependency, streaming=Pub/Sub or Dataflow stream, "
    "batch=scheduled batch job, event=Cloud Functions or Eventarc trigger.\n"
    "9. Respect the region in the graph meta for the GCP region field.\n"
    "10. If instructions are provided on a component, honour them in the resource config.\n"
    "11. If a component lists config values, treat them as the authoritative Terraform "
    "resource configuration. Reproduce those attribute key-value pairs exactly in the "
    "generated HCL resource block for that component.\n\n"
    "COMPANION RESOURCE RULES — these must never be omitted:\n"
    "- GCE (gcp_gce): MUST include google_compute_disk for boot disk. "
    "Enable shielded_instance_config and OS Login. Avoid access_config unless public IP required.\n"
    "- GKE (gcp_gke): MUST include google_container_node_pool. Enable private_cluster_config, "
    "workload_identity_config, and network_policy.\n"
    "- Cloud SQL (gcp_cloudsql): MUST set ipv4_enabled = false with private_network. "
    "Enable backup_configuration with point_in_time_recovery_enabled = true.\n"
    "- GCS (gcp_gcs): MUST set uniform_bucket_level_access = true and "
    "public_access_prevention = \"enforced\".\n"
    "- Cloud Run (gcp_cloud_run): Restrict ingress unless public LB fronts the service. "
    "Do not grant allUsers invoker role.\n"
    "- External LB (gcp_lb): MUST attach google_compute_security_policy (Cloud Armor).\n"
    "- Every password/secret: MUST use Secret Manager or var.* — never hardcode.\n\n"
    "RESOURCE HINTS:\n"
    "Each component below includes → hints describing required Terraform resources, "
    "companion resources, variables, and outputs. These hints are MANDATORY — follow them exactly.\n"
)


def _get_gcp_resource_hint(component_type: str) -> list[str]:
    spec = _GCP_RESOURCE_MAP.get(component_type)
    if not spec:
        return []
    lines: list[str] = []
    if spec["primary"]:
        lines.append(f"    → primary: {', '.join(spec['primary'])}")
    else:
        lines.append("    → primary: (managed/API service — enable API or reference existing resource)")
    if spec["companions"]:
        lines.append(f"    → companions: {', '.join(spec['companions'])}")
    if spec["key_vars"]:
        lines.append(f"    → variables: {', '.join('var.' + v for v in spec['key_vars'])}")
    if spec["outputs"]:
        lines.append(f"    → outputs: {', '.join(spec['outputs'])}")
    if spec.get("notes"):
        lines.append(f"    → note: {spec['notes']}")
    return lines


def build_gcp_prompt(graph: Graph) -> tuple[str, str]:
    safe = _sanitize(graph)
    user = (
        f"Graph: {safe['name']}\n"
        f"Region: {safe['region']}\n\n"
        f"COMPONENTS:\n{_serialize_components(graph.components)}\n\n"
        f"EDGES:\n{_serialize_edges(graph.edges)}\n\n"
        f"FIREWALL RULES:\n{_serialize_security_groups(graph.security_groups)}\n\n"
        f"Generate complete Terraform HCL for this GCP architecture.\n\n"
        f"Architecture JSON (reference):\n```json\n{json.dumps(safe, indent=2)}\n```"
    )
    return _SYSTEM, user


def _serialize_components(components) -> str:
    if not components:
        return "(none)"
    MAX_LABEL = 120
    MAX_INSTRUCTIONS = 500

    def _clean_str(s: str, limit: int) -> str:
        return s.replace("\x00", "").strip()[:limit]

    lines: list[str] = []
    for c in components:
        lines.append(f"- [{_clean_str(c.type, 64)}] {_clean_str(c.label, MAX_LABEL)} (id: {c.id[:64]})")
        for k, v in (c.config or {}).items():
            if isinstance(k, str) and len(k) <= 64:
                lines.append(f"    {_clean_str(k, 64)}: {_clean_str(str(v), 200)}")
        instructions = c.config.get("instructions", "") if c.config else ""
        if instructions:
            lines.append(f"    instructions: {_clean_str(instructions, MAX_INSTRUCTIONS)}")
        lines.extend(_get_gcp_resource_hint(c.type))
    return "\n".join(lines)


def _serialize_edges(edges) -> str:
    if not edges:
        return "(none)"
    _EDGE_LABELS = {
        "network": "network connectivity",
        "data_flow": "data transfer",
        "dependency": "logical dependency",
        "streaming": "real-time stream",
        "batch": "scheduled batch transfer",
        "event": "event-driven trigger",
    }
    lines: list[str] = []
    for e in edges:
        label = _EDGE_LABELS.get(e.type, e.type)
        direction = "↔" if e.bidirectional else "→"
        lines.append(f"- {e.source[:64]} {direction} {e.target[:64]} [{label}]")
    return "\n".join(lines)


def _serialize_security_groups(sgs) -> str:
    if not sgs:
        return "(none)"
    MAX_LABEL = 120
    lines: list[str] = []
    for sg in sgs:
        lines.append(f"- {_sanitize_str(sg.name, MAX_LABEL)} (id: {sg.id})")
        for rule in sg.inbound:
            port_str = str(rule.port) if rule.port is not None else "any"
            lines.append(
                f"    inbound: protocol={rule.protocol} port={port_str} source={_sanitize_str(rule.source)}"
            )
        for rule in sg.outbound:
            port_str = str(rule.port) if rule.port is not None else "any"
            lines.append(
                f"    outbound: protocol={rule.protocol} port={port_str} dest={_sanitize_str(rule.source)}"
            )
    return "\n".join(lines)


def _sanitize_str(s: str, limit: int = 500) -> str:
    return s.replace("\x00", "").strip()[:limit]


def _sanitize(graph: Graph) -> dict:
    MAX_LABEL = 120
    MAX_INSTRUCTIONS = 500

    def _clean_str(s: str, limit: int) -> str:
        return s.replace("\x00", "").strip()[:limit]

    components = []
    for c in graph.components:
        components.append(
            {
                "id": c.id[:64],
                "type": c.type,
                "label": _clean_str(c.label, MAX_LABEL),
                "config": {
                    k: v
                    for k, v in (c.config or {}).items()
                    if isinstance(k, str) and len(k) <= 64
                },
                "instructions": _clean_str(
                    c.config.get("instructions", "") if c.config else "",
                    MAX_INSTRUCTIONS,
                ),
            }
        )

    edges = [
        {
            "source": e.source[:64],
            "target": e.target[:64],
            "type": e.type,
            "bidirectional": e.bidirectional,
        }
        for e in graph.edges
    ]

    security_groups = [
        {
            "name": _clean_str(sg.name, MAX_LABEL),
            "inbound": sg.inbound,
            "outbound": sg.outbound,
        }
        for sg in graph.security_groups
    ]

    return {
        "name": _clean_str(graph.name or "GCP Architecture", MAX_LABEL),
        "provider": "gcp",
        "region": graph.region or "us-central1",
        "components": components,
        "edges": edges,
        "security_groups": security_groups,
    }
