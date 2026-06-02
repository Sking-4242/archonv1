"""
Live pricing dispatcher with in-process TTL cache.

Each provider module tries to fetch a real-time monthly USD cost.
Returns None when credentials are absent, the API is unreachable, or
the component type has no live-pricing implementation — the estimate
router falls back to static pricing in all of those cases.

Cache TTL: 1 hour, keyed on provider, component type, region, config, and usage.
"""
from __future__ import annotations

import json
import time

from app.services.aws_live_pricing import fetch_aws_price
from app.services.azure_live_pricing import fetch_azure_price
from app.services.gcp_live_pricing import fetch_gcp_price

_CACHE: dict[str, tuple[float, float]] = {}
_TTL = 3600.0  # seconds

_CONFIG_KEYS = (
    "instance_type", "instance_class", "node_type", "engine",
    "machine_type", "tier", "size", "vm_size",
)
_USAGE_KEYS = (
    "hours_per_month", "storage_gb", "data_transfer_gb", "data_processed_gb",
    "invocations_monthly", "avg_duration_ms", "memory_mb", "vcpu", "memory_gb",
    "calls_monthly", "requests_monthly", "notifications_monthly", "events_monthly",
    "write_units_monthly", "read_units_monthly", "shards", "brokers", "num_nodes",
    "tb_scanned_monthly", "dpu_hours_monthly", "lcus_per_hour", "secrets", "keys",
)


def _cache_key(
    provider: str,
    component_type: str,
    config: dict,
    region: str,
    usage: dict | None,
) -> str:
    relevant: dict[str, object] = {
        k: config[k]
        for k in _CONFIG_KEYS
        if k in config
    }
    if usage:
        for key in _USAGE_KEYS:
            if key in usage:
                relevant[f"u:{key}"] = usage[key]
    return f"{provider}|{component_type}|{region}|{json.dumps(relevant, sort_keys=True)}"


def _cache_get(key: str) -> float | None:
    entry = _CACHE.get(key)
    if entry is None:
        return None
    price, ts = entry
    if time.monotonic() - ts > _TTL:
        del _CACHE[key]
        return None
    return price


def _cache_set(key: str, price: float) -> None:
    _CACHE[key] = (price, time.monotonic())


def fetch_live_price(
    provider: str,
    component_type: str,
    config: dict,
    region: str,
    usage: dict | None = None,
) -> float | None:
    """
    Return a live monthly USD cost estimate or None.

    Results are cached in-process for up to one hour so that an
    architecture with many components of the same type does not
    generate redundant API calls.
    """
    key = _cache_key(provider, component_type, config, region, usage)
    cached = _cache_get(key)
    if cached is not None:
        return cached

    price: float | None = None

    if provider == "aws":
        price = fetch_aws_price(component_type, config, region, usage)
    elif provider == "azure":
        price = fetch_azure_price(component_type, region, config, usage)
    elif provider == "gcp":
        price = fetch_gcp_price(component_type, config, region, usage)
    # "onprem" intentionally has no live pricing — hardware costs are static

    if price is not None:
        _cache_set(key, price)

    return price
