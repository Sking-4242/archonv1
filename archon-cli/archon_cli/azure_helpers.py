"""Shared helpers for Azure validation rules."""

from __future__ import annotations

from typing import Any


def cfg(node_config: dict[str, Any] | None, key: str, default: Any = None) -> Any:
    if not node_config:
        return default
    return node_config.get(key, default)


def cfg_nested(node_config: dict[str, Any] | None, *keys: str, default: Any = None) -> Any:
    current: Any = node_config or {}
    for key in keys:
        if not isinstance(current, dict):
            return default
        current = current.get(key)
        if current is None:
            return default
    return current


def is_truthy(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    if value is None:
        return False
    if isinstance(value, str):
        return value.strip().lower() in {"1", "true", "yes", "on", "enabled"}
    return bool(value)


def is_falsy_explicit(value: Any) -> bool:
    if isinstance(value, bool):
        return value is False
    if isinstance(value, str):
        return value.strip().lower() in {"0", "false", "no", "off", "disabled"}
    return False


def has_public_ip(node_config: dict[str, Any] | None) -> bool:
    if is_truthy(cfg(node_config, "public_ip")):
        return True
    if cfg(node_config, "public_ip_address"):
        return True
    interfaces = cfg(node_config, "network_interface") or []
    if isinstance(interfaces, dict):
        interfaces = [interfaces]
    for iface in interfaces:
        if not isinstance(iface, dict):
            continue
        if iface.get("public_ip_address") or iface.get("public_ip_address_id"):
            return True
    return False


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


def label_has_internet(node_id: str, nodes, edges) -> bool:
    node_map = {n.id: n for n in nodes}
    for nid in neighbor_ids(node_id, edges):
        neighbor = node_map.get(nid)
        if neighbor and "internet" in (neighbor.label or "").lower():
            return True
    return False


STORAGE_TYPES = frozenset({
    "azure_blob", "azure_files", "azure_datalake", "azure_table", "azure_queue",
})

DB_TYPES = frozenset({
    "azure_sql", "azure_cosmosdb", "azure_postgres", "azure_mysql",
    "azure_redis", "azure_servicebus", "azure_eventhub", "azure_synapse",
})

COMPUTE_TYPES = frozenset({
    "azure_aks", "azure_vm", "azure_vmss", "azure_app_service", "azure_functions",
    "azure_container_apps", "azure_aci", "azure_batch", "azure_spring_apps",
})

STATEFUL_TYPES = frozenset({
    "azure_vm", "azure_sql", "azure_postgres", "azure_mysql", "azure_cosmosdb",
})

PUBLIC_EDGE_TYPES = frozenset({
    "azure_agw", "azure_lb", "azure_frontdoor", "azure_apim", "azure_traffic_mgr",
})

WAF_TYPES = frozenset({"azure_agw", "azure_waf", "azure_frontdoor"})
