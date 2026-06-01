"""
Rubric grader — evaluates a list of criterion dicts against a submitted graph.

Each criterion dict has:
    label   — display string shown to the student
    type    — one of the supported criterion types below
    params  — dict of type-specific parameters
    points  — integer point value

Returns a list of result dicts:
    label   — same as criterion label
    passed  — bool
    points  — points available (not earned — frontend calculates earned)
    message — plain-English explanation of why it passed or failed
"""

from typing import Any


# ── Helpers ───────────────────────────────────────────────────────────────────

def _node_types(graph: dict) -> list[str]:
    """Return a list of all component types (awsType or type) in the graph."""
    types = []
    for node in graph.get("nodes", []):
        data = node.get("data", {})
        t = data.get("awsType") or data.get("type") or node.get("type", "")
        if t:
            types.append(t.lower())
    return types


def _edges(graph: dict) -> list[dict[str, Any]]:
    return graph.get("edges", [])


def _node_by_id(graph: dict) -> dict[str, dict]:
    return {n["id"]: n for n in graph.get("nodes", [])}


def _node_type(node: dict) -> str:
    data = node.get("data", {})
    return (data.get("awsType") or data.get("type") or node.get("type", "")).lower()


def _nodes_of_type(graph: dict, component_type: str) -> list[dict]:
    target = component_type.lower()
    return [n for n in graph.get("nodes", []) if _node_type(n) == target]


def _security_groups(graph: dict) -> list[dict]:
    return graph.get("securityGroups") or graph.get("security_groups") or []


def _iam_roles(graph: dict) -> list[dict]:
    return graph.get("iamRoles") or graph.get("iam_roles") or []


def _node_config(node: dict) -> dict:
    return node.get("data", {}).get("config") or {}


def _config_matches(value: Any, expected: Any) -> bool:
    if expected is True:
        return bool(value) and value not in (False, "false", "none", "None", 0)
    if expected is False:
        return value in (False, "false", None, "", 0)
    return value == expected


# ── Criterion evaluators ──────────────────────────────────────────────────────

def _component_present(graph: dict, params: dict) -> tuple[bool, str]:
    target = params.get("component_type", "").lower()
    found = target in _node_types(graph)
    if found:
        return True, f"{target.upper()} found in architecture."
    return False, f"No {target.upper()} found. Add one to your canvas."


def _component_absent(graph: dict, params: dict) -> tuple[bool, str]:
    target = params.get("component_type", "").lower()
    found = target in _node_types(graph)
    if not found:
        return True, f"{target.upper()} correctly excluded."
    return False, f"{target.upper()} is present but should not be in this architecture."


def _min_count(graph: dict, params: dict) -> tuple[bool, str]:
    target = params.get("component_type", "").lower()
    required = int(params.get("count", 1))
    actual = _node_types(graph).count(target)
    if actual >= required:
        return True, f"Found {actual} {target.upper()} (required {required})."
    return False, f"Found {actual} {target.upper()} but need at least {required}."


def _edge_exists(graph: dict, params: dict) -> tuple[bool, str]:
    source_type = params.get("source_type", "").lower()
    target_type = params.get("target_type", "").lower()
    by_id = _node_by_id(graph)

    for edge in _edges(graph):
        src_node = by_id.get(edge.get("source", ""))
        tgt_node = by_id.get(edge.get("target", ""))
        if not src_node or not tgt_node:
            continue
        if _node_type(src_node) == source_type and _node_type(tgt_node) == target_type:
            return True, f"Connection from {source_type.upper()} to {target_type.upper()} found."
        if edge.get("data", {}).get("bidirectional"):
            if _node_type(src_node) == target_type and _node_type(tgt_node) == source_type:
                return True, f"Connection from {source_type.upper()} to {target_type.upper()} found."

    return False, (
        f"No connection found from {source_type.upper()} to {target_type.upper()}. "
        "Add an edge between them on the canvas."
    )


def _security_port_restricted(graph: dict, params: dict) -> tuple[bool, str]:
    """
    Checks that no security group allows the given port from the forbidden source
    (typically 0.0.0.0/0 for publicly exposed admin ports).
    """
    port = int(params.get("port", 0))
    forbidden = params.get("forbidden_source", "0.0.0.0/0")

    for sg in _security_groups(graph):
        for rule in sg.get("inbound", []):
            rule_port = rule.get("port")
            rule_source = rule.get("source", "")
            if rule_port == port and rule_source == forbidden:
                return False, (
                    f"Port {port} is open to {forbidden} in security group "
                    f"'{sg.get('name', sg.get('id', ''))}'. "
                    "Restrict this to a specific CIDR or remove the rule."
                )

    return True, f"Port {port} is not exposed to {forbidden}. Good."


def _any_of(graph: dict, params: dict) -> tuple[bool, str]:
    """Passes if at least one of the listed component types is present in the graph."""
    options = [t.lower() for t in params.get("component_types", [])]
    types = _node_types(graph)
    found = [t for t in options if t in types]
    if found:
        return True, f"Found required component: {found[0].upper()}."
    readable = ", ".join(t.upper() for t in options)
    return False, f"Need at least one of: {readable}. Add any of these to your canvas."


def _min_node_count(graph: dict, params: dict) -> tuple[bool, str]:
    """Passes if the total number of nodes in the graph is at least count."""
    required = int(params.get("count", 1))
    actual = len(graph.get("nodes", []))
    if actual >= required:
        return True, f"Architecture has {actual} components (required at least {required})."
    missing = required - actual
    return False, (
        f"Architecture has only {actual} component{'s' if actual != 1 else ''} — "
        f"add at least {missing} more to meet the minimum complexity requirement."
    )


def _min_security_groups(graph: dict, params: dict) -> tuple[bool, str]:
    required = int(params.get("count", 1))
    actual = len(_security_groups(graph))
    if actual >= required:
        return True, f"Defined {actual} security group(s) (required {required})."
    return False, (
        f"Only {actual} security group(s) defined — open the Security tab and "
        f"create at least {required}."
    )


def _min_iam_roles(graph: dict, params: dict) -> tuple[bool, str]:
    required = int(params.get("count", 1))
    actual = len(_iam_roles(graph))
    if actual >= required:
        return True, f"Defined {actual} IAM role(s) (required {required})."
    return False, (
        f"Only {actual} IAM role(s) defined — open the IAM tab and "
        f"create at least {required}."
    )


def _nodes_have_security_groups(graph: dict, params: dict) -> tuple[bool, str]:
    component_types = [t.lower() for t in params.get("component_types", ["ec2", "rds", "lambda"])]
    nodes = [n for n in graph.get("nodes", []) if _node_type(n) in component_types]
    if not nodes:
        readable = ", ".join(t.upper() for t in component_types)
        return False, f"No matching compute/data components found ({readable})."

    missing = []
    for node in nodes:
        sg_ids = node.get("data", {}).get("security_group_ids") or []
        if not sg_ids:
            label = node.get("data", {}).get("label") or _node_type(node).upper()
            missing.append(label)

    if missing:
        return False, (
            f"Assign security groups to: {', '.join(missing)}. "
            "Use the Component or Security tab."
        )
    return True, "All required components have security groups assigned."


def _nodes_have_iam_roles(graph: dict, params: dict) -> tuple[bool, str]:
    component_types = [
        t.lower()
        for t in params.get("component_types", ["lambda", "ec2", "ecs / fargate"])
    ]
    nodes = [n for n in graph.get("nodes", []) if _node_type(n) in component_types]
    if not nodes:
        readable = ", ".join(t.upper() for t in component_types)
        return False, f"No matching compute components found ({readable})."

    missing = []
    for node in nodes:
        role_id = node.get("data", {}).get("iam_role_id")
        if not role_id:
            label = node.get("data", {}).get("label") or _node_type(node).upper()
            missing.append(label)

    if missing:
        return False, (
            f"Attach IAM roles to: {', '.join(missing)}. "
            "Create roles in the IAM tab and assign them in the Component panel."
        )
    return True, "All required compute components have IAM roles attached."


def _component_config(graph: dict, params: dict) -> tuple[bool, str]:
    target = params.get("component_type", "").lower()
    config_key = params.get("config_key", "")
    expected = params.get("expected")
    forbidden_values = params.get("forbidden_values", [])
    require_all = bool(params.get("require_all", True))

    nodes = _nodes_of_type(graph, target)
    if not nodes:
        return False, f"No {target.upper()} found to check configuration."

    failures = []
    passes = 0
    for node in nodes:
        value = _node_config(node).get(config_key)
        label = node.get("data", {}).get("label") or target.upper()

        if forbidden_values and value in forbidden_values:
            failures.append(f"{label}: {config_key} must not be {value!r}")
            continue

        if expected is not None:
            if _config_matches(value, expected):
                passes += 1
            else:
                failures.append(f"{label}: {config_key} not set correctly")
        elif value:
            passes += 1
        else:
            failures.append(f"{label}: {config_key} is not enabled")

    if require_all:
        if failures:
            return False, failures[0]
        return True, f"{target.upper()} {config_key} configured correctly."

    if passes > 0:
        return True, f"At least one {target.upper()} has {config_key} configured."
    return False, failures[0] if failures else f"Enable {config_key} on {target.upper()}."


# ── Dispatch table ────────────────────────────────────────────────────────────

_EVALUATORS = {
    "component_present": _component_present,
    "component_absent": _component_absent,
    "min_count": _min_count,
    "edge_exists": _edge_exists,
    "security_port_restricted": _security_port_restricted,
    "any_of": _any_of,
    "min_node_count": _min_node_count,
    "min_security_groups": _min_security_groups,
    "min_iam_roles": _min_iam_roles,
    "nodes_have_security_groups": _nodes_have_security_groups,
    "nodes_have_iam_roles": _nodes_have_iam_roles,
    "component_config": _component_config,
}


# ── Public interface ──────────────────────────────────────────────────────────

def grade(graph: dict, rubric: list[dict]) -> tuple[int, int, list[dict]]:
    """
    Evaluate the rubric against a submitted graph.

    Returns:
        automated_score  -- total points earned
        total_points     -- total points possible
        criteria_results -- list of result dicts (one per criterion)
    """
    results = []
    earned = 0
    total = 0

    for criterion in rubric:
        ctype = criterion.get("type", "")
        params = criterion.get("params", {})
        points = int(criterion.get("points", 0))
        label = criterion.get("label", ctype)
        total += points

        evaluator = _EVALUATORS.get(ctype)
        if evaluator is None:
            results.append({
                "label": label,
                "passed": False,
                "points": points,
                "message": f"Unknown criterion type '{ctype}' — contact your instructor.",
            })
            continue

        try:
            passed, message = evaluator(graph, params)
        except Exception:
            passed, message = False, "Grader error evaluating this criterion — contact your instructor."

        if passed:
            earned += points

        results.append({"label": label, "passed": passed, "points": points, "message": message})

    return earned, total, results
