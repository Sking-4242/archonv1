"""
Live pricing dispatcher with in-process TTL cache.

Each provider module tries to fetch a real-time monthly USD cost.
Returns None when credentials are absent, the API is unreachable, or
the component type has no live-pricing implementation — the estimate
router falls back to static pricing in all of those cases.

Cache TTL: 1 hour, keyed on (provider, component_type, region, relevant_config).
"""
from __future__ import annotations

import json
import time

from app.services.aws_live_pricing import fetch_aws_price
from app.services.azure_live_pricing import fetch_azure_price
from app.services.gcp_live_pricing import fetch_gcp_price

_CACHE: dict[str, tuple[float, float]] = {}
_TTL = 3600.0  # seconds


def _cache_key(provider: str, component_type: str, config: dict, region: str) -> str:
    # Only include config keys that actually affect pricing
    relevant = {
        k: config[k]
        for k in ("instance_type", "instance_class", "node_type", "engine",
                  "machine_type", "tier", "size")
        if k in config
    }
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
) -> float | None:
    """
    Return a live monthly USD cost estimate or None.

    Results are cached in-process for up to one hour so that an
    architecture with many components of the same type does not
    generate redundant API calls.
    """
    key = _cache_key(provider, component_type, config, region)
    cached = _cache_get(key)
    if cached is not None:
        return cached

    price: float | None = None

    if provider == "aws":
        price = fetch_aws_price(component_type, config, region)
    elif provider == "azure":
        price = fetch_azure_price(component_type, region)
    elif provider == "gcp":
        price = fetch_gcp_price(component_type, config, region)
    # "onprem" intentionally has no live pricing — hardware costs are static

    if price is not None:
        _cache_set(key, price)

    return price
