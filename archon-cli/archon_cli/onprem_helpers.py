"""Shared helpers for on-premises validation rules."""

from __future__ import annotations

from typing import Any

CLOUD_PREFIXES = ("aws_", "azure_", "gcp_")

COMPUTE_TYPES = frozenset({
    "onprem_bare_metal",
    "onprem_vm",
    "onprem_k8s",
    "onprem_container",
    "onprem_hyperconverged",
    "onprem_gpu_server",
})

DB_TYPES = frozenset({
    "onprem_postgres",
    "onprem_mysql",
    "onprem_mssql",
    "onprem_redis",
    "onprem_elasticsearch",
    "onprem_mongodb",
    "onprem_cassandra",
})

STATEFUL_TYPES = frozenset({
    "onprem_bare_metal",
    "onprem_vm",
    "onprem_postgres",
    "onprem_mysql",
    "onprem_mssql",
    "onprem_san",
    "onprem_nas",
})

PUBLIC_EDGE_TYPES = frozenset({
    "onprem_load_balancer",
    "onprem_proxy",
    "onprem_api_gateway",
})

WAF_TYPES = frozenset({"onprem_waf", "onprem_firewall"})

SECURITY_STACK_TYPES = frozenset({
    "onprem_firewall",
    "onprem_waf",
    "onprem_ids_ips",
    "onprem_pam",
    "onprem_vault",
})


def cfg(node_config: dict[str, Any] | None, key: str, default: Any = None) -> Any:
    if not node_config:
        return default
    return node_config.get(key, default)


def is_truthy(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    if value is None:
        return False
    if isinstance(value, str):
        return value.strip().lower() in {"1", "true", "yes", "on", "enabled"}
    return bool(value)


def int_cfg(node_config: dict[str, Any] | None, key: str, default: int = 0) -> int:
    raw = cfg(node_config, key, default)
    try:
        return int(raw)
    except (TypeError, ValueError):
        return default


def node_types(nodes) -> set[str]:
    return {n.type for n in nodes}


def neighbor_ids(node_id: str, edges) -> list[str]:
    result: list[str] = []
    for edge in edges:
        if edge.source == node_id:
            result.append(edge.target)
        elif edge.target == node_id:
            result.append(edge.source)
    return result


def has_neighbor_type(node_id: str, types: set[str], nodes, edges) -> bool:
    neighbors = neighbor_ids(node_id, edges)
    return any(n.type in types for n in nodes if n.id in neighbors)


def reachable_types(node_id: str, edges, nodes, max_hops: int = 3) -> set[str]:
    visited = {node_id}
    frontier = [node_id]
    found: set[str] = set()
    for _ in range(max_hops):
        next_frontier: list[str] = []
        for current in frontier:
            for nid in neighbor_ids(current, edges):
                if nid in visited:
                    continue
                visited.add(nid)
                node = next((n for n in nodes if n.id == nid), None)
                if node:
                    found.add(node.type)
                next_frontier.append(nid)
        frontier = next_frontier
    return found


def is_onprem_type(node_type: str) -> bool:
    return node_type.startswith("onprem_")


def is_cloud_type(node_type: str) -> bool:
    return any(node_type.startswith(prefix) for prefix in CLOUD_PREFIXES)


def has_hybrid_edge(nodes, edges) -> bool:
    node_map = {n.id: n for n in nodes}
    for edge in edges:
        src = node_map.get(edge.source)
        tgt = node_map.get(edge.target)
        if not src or not tgt:
            continue
        if is_onprem_type(src.type) and is_cloud_type(tgt.type):
            return True
        if is_onprem_type(tgt.type) and is_cloud_type(src.type):
            return True
    return False
