"""
Deterministic Terraform scaffold generator for AWS canvas graphs.

Phase 1 of the hybrid generator: map-driven HCL skeleton with resolved
cross-resource references. Semantic completion is handled by LLM refinement.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass, field

from app.models.graph import Component, Graph, Position
from app.services.prompt_builder import _AWS_RESOURCE_MAP

_TF_NAME_RE = re.compile(r"[^a-z0-9_]")
_SENSITIVE_VAR_RE = re.compile(r"password|secret|key|token", re.IGNORECASE)

_TF_REF_RE = re.compile(
    r"^(var\.|data\.|module\.|local\.|aws_[a-z0-9_]+\.[a-z0-9_]+(\.[a-z0-9_]+)*)$"
)
_CANVAS_TYPE_ALIASES: dict[str, str] = {
    "secrets_manager": "secretsmanager",
}


def _map_spec(component_type: str) -> dict | None:
    key = _CANVAS_TYPE_ALIASES.get(component_type, component_type)
    return _AWS_RESOURCE_MAP.get(key)


_KEY_VAR_TO_ATTR: dict[str, str] = {
    "vpc_cidr_block": "cidr_block",
    "subnet_cidr_block": "cidr_block",
    "lambda_function_name": "function_name",
    "lambda_runtime": "runtime",
    "lambda_handler": "handler",
    "alb_name": "name",
    "nlb_name": "name",
    "api_name": "name",
    "ecr_repository_name": "name",
    "domain_name": "name",
}

_COMPANION_SUFFIX: dict[str, str] = {
    "aws_internet_gateway": "igw",
    "aws_route_table": "rt",
    "aws_route_table_association": "rta",
    "aws_eip": "eip",
    "aws_iam_role": "role",
    "aws_cloudwatch_log_group": "logs",
}

# (source_type, target_type) → (attribute_on_source, ref_suffix, comment_only)
# ref_suffix: "id" | "arn" | None for comment-only rules
_EDGE_WIRING: dict[tuple[str, str], tuple[str | None, str | None, str]] = {
    ("subnet", "vpc"): ("vpc_id", "id", ""),
    ("ec2", "subnet"): ("subnet_id", "id", ""),
    ("nat_gateway", "subnet"): ("subnet_id", "id", ""),
    ("lambda", "sqs"): (None, None, "event source: {ref}.arn"),
    ("lambda", "sns"): (None, None, "trigger: {ref}.arn"),
    ("lambda", "api_gateway"): (None, None, "integrated with: {ref}"),
    ("api_gateway", "lambda"): (None, None, "integration → {ref}"),
    ("alb", "ec2"): (None, None, "target group points to: {ref}.id"),
    ("alb", "ecs_fargate"): (None, None, "target group points to ECS service ({ref})"),
    ("ecs_fargate", "alb"): (None, None, "load_balancer → {ref}"),
    ("cloudfront", "s3"): (
        None,
        None,
        "origin: {ref}.bucket_regional_domain_name",
    ),
    ("eks", "subnet"): (None, None, "node group subnet_ids: include {ref}.id"),
    ("rds", "subnet"): (None, None, "db subnet group must include {ref}.id"),
}

_OUTPUT_ATTR_HINTS: dict[str, str] = {
    "id": "id",
    "arn": "arn",
    "name": "name",
    "dns_name": "dns_name",
    "endpoint": "endpoint",
    "invoke_arn": "invoke_arn",
    "function_name": "function_name",
    "cidr_block": "cidr_block",
    "account_id": "account_id",
}


@dataclass
class ResourceBlock:
    tf_type: str
    tf_name: str
    component_id: str | None
    attributes: dict[str, str] = field(default_factory=dict)
    comments: list[str] = field(default_factory=list)
    body_lines: list[str] = field(default_factory=list)
    is_primary: bool = False


@dataclass
class ScaffoldContext:
    nodes: dict[str, Component] = field(default_factory=dict)
    tf_names: dict[str, str] = field(default_factory=dict)
    outgoing: dict[str, list[str]] = field(default_factory=dict)
    incoming: dict[str, list[str]] = field(default_factory=dict)
    has_ec2: bool = False
    variables: set[str] = field(default_factory=set)
    outputs: list[tuple[str, str, str, str]] = field(default_factory=list)
    blocks: list[ResourceBlock] = field(default_factory=list)
    sg_tf_names: dict[str, str] = field(default_factory=dict)
    iam_tf_names: dict[str, str] = field(default_factory=dict)
    managed_comments: list[str] = field(default_factory=list)


def tf_name(component: Component, used: set[str] | None = None) -> str:
    """Convert a canvas component label + id into a unique Terraform resource name."""
    used = used or set()
    slug = _TF_NAME_RE.sub("_", component.label.lower()).strip("_")
    slug = re.sub(r"_+", "_", slug)
    if not slug or slug[0].isdigit():
        slug = f"r_{slug}" if slug else "resource"

    id_part = _TF_NAME_RE.sub("_", component.id.lower())[:4].strip("_") or "node"
    name = f"{slug}_{id_part}"[:63]

    base = name
    counter = 2
    while name in used:
        suffix = f"_{counter}"
        name = f"{base[: 63 - len(suffix)]}{suffix}"
        counter += 1
    used.add(name)
    return name


def _companion_suffix(tf_type: str) -> str:
    if tf_type in _COMPANION_SUFFIX:
        return _COMPANION_SUFFIX[tf_type]
    parts = tf_type.removeprefix("aws_").split("_")
    return parts[-1] if parts else "companion"


def _is_valid_hcl_identifier(key: str) -> bool:
    return bool(re.match(r"^[A-Za-z_][A-Za-z0-9_]*$", key))


_UNSAFE_HCL_STRING_CHARS = re.compile(r"[$%{}]")
_MAX_SCAFFOLD_STRING_LEN = 240


def _safe_scaffold_string(text: str, max_len: int = _MAX_SCAFFOLD_STRING_LEN) -> str:
    """Conservative HCL string literal for canvas-derived scaffold values.

    Scaffolds are placeholders for LLM refinement — the architecture context
    carries the original labels/config. Strip characters that break parsers
    when canvas data comes from imports (e.g. ``${local.name}``).
    """
    cleaned = _UNSAFE_HCL_STRING_CHARS.sub("", str(text))
    cleaned = cleaned.replace("\\", "\\\\").replace('"', '\\"')
    cleaned = re.sub(r"[\n\r\t]+", " ", cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    if not cleaned:
        cleaned = "canvas-value"
    return f'"{cleaned[:max_len]}"'


def _format_hcl_value(value) -> str:
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, (int, float)):
        return str(value)
    if isinstance(value, dict):
        if not value:
            return "jsonencode({})"
        parts: list[str] = []
        for k, v in value.items():
            if not _is_valid_hcl_identifier(str(k)):
                parts.append(f"{_safe_scaffold_string(str(k))} = {_format_hcl_value(v)}")
            else:
                parts.append(f"{k} = {_format_hcl_value(v)}")
        return "{ " + ", ".join(parts) + " }"
    if isinstance(value, list):
        if not value:
            return "[]"
        items = ", ".join(_format_hcl_value(v) for v in value)
        return "[ " + items + " ]"
    text = str(value)
    if _TF_REF_RE.match(text):
        return text
    return _safe_scaffold_string(text)


def _build_edge_index(graph: Graph) -> tuple[dict[str, list[str]], dict[str, list[str]]]:
    outgoing: dict[str, list[str]] = {}
    incoming: dict[str, list[str]] = {}
    for edge in graph.edges:
        outgoing.setdefault(edge.source, []).append(edge.target)
        incoming.setdefault(edge.target, []).append(edge.source)
    return outgoing, incoming


def _build_context(graph: Graph) -> ScaffoldContext:
    used_names: set[str] = set()
    ctx = ScaffoldContext()
    ctx.nodes = {c.id: c for c in graph.components}
    ctx.outgoing, ctx.incoming = _build_edge_index(graph)
    ctx.has_ec2 = any(c.type == "ec2" for c in graph.components)

    for component in graph.components:
        ctx.tf_names[component.id] = tf_name(component, used_names)

    return ctx


def _primary_tf_type(component: Component) -> str | None:
    spec = _map_spec(component.type)
    if not spec or not spec.get("primary"):
        return None
    return spec["primary"][0]


def _tf_reference(
    component: Component,
    ctx: ScaffoldContext,
    suffix: str = "id",
) -> str | None:
    name = ctx.tf_names.get(component.id)
    if not name:
        return None
    tf_type = _primary_tf_type(component)
    if not tf_type:
        return None
    return f"{tf_type}.{name}.{suffix}"


def _resolve_node_ref(
    node_id: str | None,
    ctx: ScaffoldContext,
    suffix: str = "id",
) -> str | None:
    if not node_id:
        return None
    component = ctx.nodes.get(node_id)
    if not component:
        return None
    return _tf_reference(component, ctx, suffix)


def _set_ref_attribute(
    block: ResourceBlock,
    attr: str,
    node_id: str | None,
    ctx: ScaffoldContext,
    suffix: str = "id",
) -> None:
    if attr in block.attributes:
        return
    ref = _resolve_node_ref(node_id, ctx, suffix)
    if ref:
        block.attributes[attr] = ref
    elif node_id:
        block.comments.append(
            f"# REQUIRED: {attr} — unresolved canvas reference {node_id}"
        )


def _find_primary_block(ctx: ScaffoldContext, component_id: str) -> ResourceBlock | None:
    for block in ctx.blocks:
        if block.component_id == component_id and block.is_primary:
            return block
    return None


def _apply_config_to_block(
    component: Component,
    block: ResourceBlock,
    spec: dict,
    ctx: ScaffoldContext,
) -> None:
    for key, value in (component.config or {}).items():
        if key == "public" and isinstance(value, bool) and value:
            if "map_public_ip_on_launch" not in block.attributes:
                block.attributes["map_public_ip_on_launch"] = "true"
            continue
        if not _is_valid_hcl_identifier(str(key)):
            block.comments.append(
                f"# REQUIRED: set {key} = {_format_hcl_value(value)}"
            )
            continue
        block.attributes[key] = _format_hcl_value(value)

    for key_var in spec.get("key_vars", []):
        attr = _KEY_VAR_TO_ATTR.get(key_var)
        if not attr or attr in block.attributes:
            continue
        block.comments.append(f"# REQUIRED: set {attr} or supply var.{key_var}")
        block.attributes[attr] = f"var.{key_var}"
        ctx.variables.add(key_var)


def _apply_explicit_fields(component: Component, ctx: ScaffoldContext) -> None:
    block = _find_primary_block(ctx, component.id)
    if not block:
        return

    if component.vpc_id:
        _set_ref_attribute(block, "vpc_id", component.vpc_id, ctx, "id")

    if component.subnet_id:
        _set_ref_attribute(block, "subnet_id", component.subnet_id, ctx, "id")

    if component.security_group_ids and "vpc_security_group_ids" not in block.attributes:
        refs: list[str] = []
        unresolved: list[str] = []
        for sg_id in component.security_group_ids:
            if sg_id in ctx.nodes:
                ref = _tf_reference(ctx.nodes[sg_id], ctx, "id")
                if ref:
                    refs.append(ref)
                else:
                    unresolved.append(sg_id)
            elif sg_id in ctx.sg_tf_names:
                refs.append(f"aws_security_group.{ctx.sg_tf_names[sg_id]}.id")
            else:
                unresolved.append(sg_id)
        if refs:
            block.attributes["vpc_security_group_ids"] = f"[{', '.join(refs)}]"
        if unresolved:
            block.comments.append(
                "# REQUIRED: vpc_security_group_ids — unresolved: "
                + ", ".join(unresolved)
            )

    if component.iam_role_id:
        attr = "role" if component.type == "lambda" else "iam_role"
        if attr not in block.attributes:
            if component.iam_role_id in ctx.iam_tf_names:
                block.attributes[attr] = (
                    f"aws_iam_role.{ctx.iam_tf_names[component.iam_role_id]}.arn"
                )
            else:
                _set_ref_attribute(
                    block, attr, component.iam_role_id, ctx, "arn"
                )


def _guess_output_value(output_name: str, tf_type: str, tf_resource_name: str) -> str:
    for suffix, attr in _OUTPUT_ATTR_HINTS.items():
        if output_name.endswith(suffix) or output_name == suffix:
            return f"{tf_type}.{tf_resource_name}.{attr}"
    if output_name.endswith("_id"):
        return f"{tf_type}.{tf_resource_name}.id"
    if output_name.endswith("_arn"):
        return f"{tf_type}.{tf_resource_name}.arn"
    return f"{tf_type}.{tf_resource_name}.id"


def _generate_component_blocks(component: Component, ctx: ScaffoldContext) -> None:
    spec = _map_spec(component.type)
    if spec is None:
        ctx.managed_comments.append(
            f"# Unknown canvas type: {component.type} ({component.label}) — skipped"
        )
        return

    if not spec.get("primary"):
        ctx.managed_comments.append(
            f"# Managed service: {component.type} ({component.label}) — {spec.get('notes', '')}"
        )
        parent_name = ctx.tf_names[component.id]
        for companion_type in spec.get("companions", []):
            ctx.managed_comments.append(
                f"# REQUIRED companion for {component.label}: {companion_type}"
            )
        return

    parent_name = ctx.tf_names[component.id]
    primary_types = spec["primary"]
    primary_block: ResourceBlock | None = None

    for idx, tf_type in enumerate(primary_types):
        block = ResourceBlock(
            tf_type=tf_type,
            tf_name=parent_name if idx == 0 else f"{parent_name}_{_companion_suffix(tf_type)}",
            component_id=component.id,
            is_primary=(idx == 0),
        )
        if idx == 0:
            primary_block = block
        _apply_config_to_block(component, block, spec, ctx)
        ctx.blocks.append(block)

    if primary_block:
        note = (spec.get("notes") or "").replace("$", "")
        for companion_type in spec.get("companions", []):
            primary_block.comments.append(
                f"# REQUIRED companion: {companion_type}"
            )
            if note:
                primary_block.comments.append(f"# NOTE: {note[:240]}")

    primary_type = primary_types[0]
    for output_name in spec.get("outputs", []):
        value = _guess_output_value(output_name, primary_type, parent_name)
        ctx.outputs.append(
            (
                output_name,
                value,
                f"Canvas component {component.id} ({component.type})",
                parent_name,
            )
        )


def _lookup_edge_rule(
    src_type: str,
    tgt_type: str,
) -> tuple[str | None, str | None, str] | None:
    rule = _EDGE_WIRING.get((src_type, tgt_type))
    if rule:
        return rule
    return _EDGE_WIRING.get((tgt_type, src_type))


def _apply_edge_wiring(graph: Graph, ctx: ScaffoldContext) -> None:
    for edge in graph.edges:
        src = ctx.nodes.get(edge.source)
        tgt = ctx.nodes.get(edge.target)
        if not src or not tgt:
            continue

        rule = _lookup_edge_rule(src.type, tgt.type)
        src_block = _find_primary_block(ctx, src.id)
        if not src_block:
            continue

        if rule:
            attr, suffix, comment_tpl = rule

            if attr and attr not in src_block.attributes:
                ref = _tf_reference(tgt, ctx, suffix or "id")
                if ref:
                    src_block.attributes[attr] = ref
                else:
                    src_block.comments.append(
                        f"# REQUIRED: {attr} — wire to {tgt.label} ({tgt.type})"
                    )
            elif comment_tpl:
                ref = _tf_reference(tgt, ctx, "arn" if ".arn" in comment_tpl else "id")
                if ref:
                    src_block.comments.append(f"# {comment_tpl.format(ref=ref)}")
                else:
                    src_block.comments.append(
                        f"# REQUIRED: connection to {tgt.label} ({tgt.type})"
                    )
            continue

        src_block.comments.append(
            f"# Connected to: {tgt.label} ({tgt.type})"
        )


def _register_security_group_names(graph: Graph, ctx: ScaffoldContext) -> None:
    used: set[str] = set()
    for sg in graph.security_groups:
        slug = tf_name(
            Component(
                id=sg.id,
                type="security_group",
                label=sg.name,
                position=Position(x=0, y=0),
            ),
            used,
        )
        ctx.sg_tf_names[sg.id] = slug


def _render_sg_rule(protocol: str, port: int | None, source: str, direction: str) -> list[str]:
    lines = [f"  {direction} {{"]
    lines.append(f"    protocol    = {_format_hcl_value(protocol)}")
    if port is not None:
        lines.append(f"    from_port   = {port}")
        lines.append(f"    to_port     = {port}")
    else:
        lines.append("    from_port   = 0")
        lines.append("    to_port     = 0")
    lines.append(f"    cidr_blocks = [{source}]")
    lines.append("  }")
    return lines


def _format_sg_source(source: str, ctx: ScaffoldContext) -> str:
    if source in ctx.nodes:
        ref = _tf_reference(ctx.nodes[source], ctx, "id")
        if ref:
            return ref
        return _format_hcl_value("0.0.0.0/0")
    if source in ctx.sg_tf_names:
        return f"aws_security_group.{ctx.sg_tf_names[source]}.id"
    return _format_hcl_value(source)


def _generate_security_groups(graph: Graph, ctx: ScaffoldContext) -> None:
    for sg in graph.security_groups:
        slug = ctx.sg_tf_names[sg.id]
        block = ResourceBlock(
            tf_type="aws_security_group",
            tf_name=slug,
            component_id=sg.id,
            comments=[f"# Security group: {sg.name}"],
        )
        block.attributes["name"] = _format_hcl_value(sg.name)
        block.attributes["description"] = _format_hcl_value(sg.description or sg.name)
        vpc_ref = _resolve_node_ref(sg.vpc_id, ctx, "id")
        if vpc_ref:
            block.attributes["vpc_id"] = vpc_ref
        else:
            block.comments.append("# REQUIRED: set vpc_id reference")
            block.attributes["vpc_id"] = "null"

        for rule in sg.inbound:
            block.body_lines.extend(
                _render_sg_rule(
                    rule.protocol,
                    rule.port,
                    _format_sg_source(rule.source, ctx),
                    "ingress",
                )
            )
        if not sg.inbound:
            block.comments.append("# REQUIRED: add ingress rules")

        for rule in sg.outbound:
            block.body_lines.extend(
                _render_sg_rule(
                    rule.protocol,
                    rule.port,
                    _format_sg_source(rule.source, ctx),
                    "egress",
                )
            )
        if not sg.outbound:
            block.comments.append("# REQUIRED: add egress rules")

        ctx.blocks.append(block)


def _register_iam_role_names(graph: Graph, ctx: ScaffoldContext) -> None:
    used: set[str] = set()
    for role in graph.iam_roles:
        slug = tf_name(
            Component(
                id=role.id,
                type="iam_role",
                label=role.name,
                position=Position(x=0, y=0),
            ),
            used,
        )
        ctx.iam_tf_names[role.id] = slug


def _generate_iam_roles(graph: Graph, ctx: ScaffoldContext) -> None:
    for role in graph.iam_roles:
        slug = ctx.iam_tf_names[role.id]
        block = ResourceBlock(
            tf_type="aws_iam_role",
            tf_name=slug,
            component_id=role.id,
            comments=[
                f"# IAM role: {role.name}",
                f"# REQUIRED: inline or attached policies ({len(role.policies)} statement(s) in canvas)",
            ],
        )
        block.attributes["name"] = _format_hcl_value(role.name)
        block.comments.append("# REQUIRED: complete trust policy (assume_role_policy)")
        block.attributes["assume_role_policy"] = "jsonencode({})"
        ctx.blocks.append(block)


def _render_preamble(ctx: ScaffoldContext, graph: Graph) -> str:
    lines = [
        "# SCAFFOLD — generated deterministically from canvas. Completed by AI refinement.",
        "",
        'terraform {',
        "  required_providers {",
        "    aws = {",
        '      source  = "hashicorp/aws"',
        '      version = "~> 5.0"',
        "    }",
        "  }",
        "",
        "  backend \"s3\" {",
        "    bucket = var.tf_state_bucket",
        "    key    = var.tf_state_key",
        "    region = var.aws_region",
        "  }",
        "}",
        "",
        'provider "aws" {',
        "  region = var.aws_region",
        "}",
        "",
    ]

    base_vars = [
        ("aws_region", "string", graph.region, "AWS region for all resources"),
        ("tf_state_bucket", "string", None, "S3 bucket for Terraform state"),
        ("tf_state_key", "string", None, "S3 key path for Terraform state"),
    ]
    seen = set()
    for var_name, var_type, default, description in base_vars:
        seen.add(var_name)
        lines.extend(_render_variable(var_name, var_type, default, description))

    for var_name in sorted(ctx.variables):
        if var_name in seen:
            continue
        seen.add(var_name)
        sensitive = bool(_SENSITIVE_VAR_RE.search(var_name))
        lines.extend(
            _render_variable(
                var_name,
                "string",
                None,
                f"Variable for {var_name.replace('_', ' ')}",
                sensitive=sensitive,
            )
        )

    lines.extend(
        [
            "",
            'data "aws_availability_zones" "available" {',
            '  state = "available"',
            "}",
            "",
            'data "aws_caller_identity" "current" {}',
            "",
        ]
    )

    if ctx.has_ec2:
        lines.extend(
            [
                'data "aws_ami" "amazon_linux" {',
                "  most_recent = true",
                '  owners      = ["amazon"]',
                "",
                "  filter {",
                '    name   = "name"',
                '    values = ["amzn2-ami-hvm-*-x86_64-gp2"]',
                "  }",
                "}",
                "",
            ]
        )

    return "\n".join(lines)


def _render_variable(
    name: str,
    var_type: str,
    default,
    description: str,
    sensitive: bool = False,
) -> list[str]:
    lines = [f'variable "{name}" {{', f'  type        = {var_type}']
    if default is not None:
        if var_type == "string":
            lines.append(f"  default     = {_safe_scaffold_string(default)}")
        else:
            lines.append(f"  default     = {default}")
    lines.append(f"  description = {_safe_scaffold_string(description)}")
    if sensitive:
        lines.append("  sensitive   = true")
    lines.append("}")
    lines.append("")
    return lines


def _render_resource_block(block: ResourceBlock) -> str:
    lines: list[str] = []
    for comment in block.comments:
        if comment.startswith("  "):
            lines.append(comment)
        else:
            lines.append(comment if comment.startswith("#") else f"# {comment}")

    lines.append(f'resource "{block.tf_type}" "{block.tf_name}" {{')
    for key, value in block.attributes.items():
        lines.append(f"  {key} = {value}")
    lines.extend(block.body_lines)
    if (
        not block.attributes
        and not block.body_lines
        and not any(c.startswith("  ") for c in block.comments)
    ):
        lines.append("  # REQUIRED: add resource attributes")
    lines.append("}")
    return "\n".join(lines)


def _render_outputs(ctx: ScaffoldContext) -> str:
    if not ctx.outputs:
        return ""

    seen: set[str] = set()
    lines: list[str] = [""]
    for output_name, value, description, _ in ctx.outputs:
        if output_name in seen:
            continue
        seen.add(output_name)
        lines.extend(
            [
                f'output "{output_name}" {{',
                f"  value       = {value}",
                f"  description = {_safe_scaffold_string(description)}",
                "}",
                "",
            ]
        )
    return "\n".join(lines)


def generate_scaffold(graph: Graph) -> str:
    """Build a syntactically valid Terraform scaffold from a canvas graph."""
    ctx = _build_context(graph)

    for component in graph.components:
        _generate_component_blocks(component, ctx)

    _register_security_group_names(graph, ctx)
    _register_iam_role_names(graph, ctx)

    for component in graph.components:
        _apply_explicit_fields(component, ctx)

    _apply_edge_wiring(graph, ctx)
    _generate_security_groups(graph, ctx)
    _generate_iam_roles(graph, ctx)

    parts = [_render_preamble(ctx, graph)]

    if ctx.managed_comments:
        parts.append("\n".join(ctx.managed_comments))
        parts.append("")

    resource_sections = [_render_resource_block(b) for b in ctx.blocks]
    if resource_sections:
        parts.append("\n\n".join(resource_sections))

    parts.append(_render_outputs(ctx))
    return "\n".join(parts).rstrip() + "\n"
