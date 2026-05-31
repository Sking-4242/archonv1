"""Shared helpers for GCP validation rules."""

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


def metadata_flag(node_config: dict[str, Any] | None, key: str) -> bool:
    metadata = cfg(node_config, "metadata")
    if isinstance(metadata, dict):
        return is_truthy(metadata.get(key))
    if isinstance(metadata, list):
        for item in metadata:
            if isinstance(item, dict) and key in item:
                return is_truthy(item.get(key))
    return is_truthy(cfg(node_config, key))


def has_public_ip(node_config: dict[str, Any] | None) -> bool:
    if is_truthy(cfg(node_config, "public_ip")):
        return True
    interfaces = cfg(node_config, "network_interface") or []
    if isinstance(interfaces, dict):
        interfaces = [interfaces]
    for iface in interfaces:
        if not isinstance(iface, dict):
            continue
        access = iface.get("access_config") or []
        if isinstance(access, dict):
            access = [access]
        if access:
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
