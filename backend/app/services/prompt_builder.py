import json

from app.models.graph import Graph

_SYSTEM_PROMPT = (
    "You are a senior Terraform engineer. Your sole task is to generate valid,"
    " production-ready HCL from the architecture description provided.\n"
    "Rules:\n"
    "- Output raw HCL only. No markdown, no explanation, no code fences.\n"
    "- All security groups must be separate aws_security_group resources.\n"
    "- Reference security groups by resource reference, never by hardcoded ID.\n"
    "- All IAM roles must be separate aws_iam_role resources with attached policies.\n"
    "- Use terraform best practices including meaningful resource names.\n"
    "- Organize blocks in this order: terraform{} and provider{} first, then"
    " variable{} blocks, then resource{} and data{} blocks, then output{} blocks"
    " last.\n"
    "- Include a terraform{} block with required_providers and backend"
    " configuration.\n"
    "- Include output{} blocks for key resource attributes (IDs, ARNs, endpoints).\n"
    "- If a component lists config values, treat them as the authoritative Terraform"
    " resource configuration. Reproduce those attribute key-value pairs exactly in"
    " the generated HCL resource block for that component."
)

_MAX_LABEL_LEN = 200
_MAX_CONFIG_VAL_LEN = 800   # longer limit for config values (may contain full blocks)


def _sanitize(value: str) -> str:
    return str(value).strip()[:_MAX_LABEL_LEN]


def _serialize_config_value(v) -> str:
    """Serialize a config value for the LLM prompt.
    Dicts and lists are JSON-encoded so nested blocks (vpc_config, environment, etc.)
    are legible.  Plain scalars are stringified directly.
    """
    if isinstance(v, (dict, list)):
        return json.dumps(v, default=str)[:_MAX_CONFIG_VAL_LEN]
    return str(v)[:_MAX_CONFIG_VAL_LEN]


def _serialize_components(components) -> str:
    if not components:
        return "(none)"
    lines = []
    for c in components:
        lines.append(f"- [{_sanitize(c.type)}] {_sanitize(c.label)} (id: {c.id})")
        for k, v in (c.config or {}).items():
            lines.append(f"    {_sanitize(str(k))}: {_serialize_config_value(v)}")
        if c.security_group_ids:
            lines.append(f"    security_group_ids: {', '.join(c.security_group_ids)}")
        if c.iam_role_id:
            lines.append(f"    iam_role_id: {c.iam_role_id}")
        if c.subnet_id:
            lines.append(f"    subnet_id: {c.subnet_id}")
        if c.vpc_id:
            lines.append(f"    vpc_id: {c.vpc_id}")
        if getattr(c, "instructions", None):
            lines.append(f"    instructions: {_sanitize(c.instructions)}")
    return "\n".join(lines)


def _serialize_security_groups(sgs) -> str:
    if not sgs:
        return "(none)"
    lines = []
    for sg in sgs:
        lines.append(
            f"- {_sanitize(sg.name)} (id: {sg.id}, vpc: {sg.vpc_id or 'unset'})"
        )
        if sg.description:
            lines.append(f"    description: {_sanitize(sg.description)}")
        for rule in sg.inbound:
            port_str = str(rule.port) if rule.port is not None else "all"
            src = _sanitize(rule.source)
            lines.append(
                f"    inbound: protocol={rule.protocol} port={port_str} source={src}"
            )
        for rule in sg.outbound:
            port_str = str(rule.port) if rule.port is not None else "all"
            dst = _sanitize(rule.source)
            lines.append(
                f"    outbound: protocol={rule.protocol} port={port_str}"
                f" destination={dst}"
            )
    return "\n".join(lines)


def _serialize_iam_roles(roles) -> str:
    if not roles:
        return "(none)"
    lines = []
    for role in roles:
        lines.append(f"- {_sanitize(role.name)} (id: {role.id})")
        if role.description:
            lines.append(f"    description: {_sanitize(role.description)}")
        for policy in role.policies:
            lines.append(f"    policy effect={policy.effect}")
            for action in policy.actions:
                lines.append(f"      action: {_sanitize(action)}")
            for res in policy.resources:
                lines.append(f"      resource: {_sanitize(res)}")
    return "\n".join(lines)


def _serialize_edges(edges) -> str:
    if not edges:
        return "(none)"
    lines = []
    for e in edges:
        edge_type = getattr(e, "edge_type", "default")
        label = getattr(e, "label", "") or ""
        label_str = f" ({_sanitize(label)})" if label else ""
        lines.append(f"- {e.source} -> {e.target} [{edge_type}]{label_str}")
    return "\n".join(lines)


def build_architecture_context(graph: Graph) -> str:
    return (
        f"Architecture: {graph.name}\n"
        f"Region: {graph.region}\n\n"
        f"Components:\n{_serialize_components(graph.components)}\n\n"
        f"Connections:\n{_serialize_edges(graph.edges)}\n\n"
        f"Security Groups:\n{_serialize_security_groups(graph.security_groups)}\n\n"
        f"IAM Roles:\n{_serialize_iam_roles(graph.iam_roles)}"
    )


def build_prompt(graph: Graph) -> tuple[str, str]:
    system = _SYSTEM_PROMPT
    user = (
        f"Architecture: {graph.name}\n"
        f"Region: {graph.region}\n\n"
        f"Components:\n{_serialize_components(graph.components)}\n\n"
        f"Connections:\n{_serialize_edges(graph.edges)}\n\n"
        f"Security Groups:\n{_serialize_security_groups(graph.security_groups)}\n\n"
        f"IAM Roles:\n{_serialize_iam_roles(graph.iam_roles)}\n\n"
        "Generate the Terraform HCL now."
    )
    return system, user
