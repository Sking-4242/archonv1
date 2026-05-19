"""
GCP live pricing via the Cloud Billing Catalog REST API.

Endpoint: https://cloudbilling.googleapis.com/v1/services/{service}/skus
Requires GCP_BILLING_API_KEY environment variable.
(Create an API key in GCP Console → APIs & Services → Credentials,
restrict it to the Cloud Billing API.)

Cache is managed externally in live_pricing.py.
"""
from __future__ import annotations

import os
from typing import Any

import httpx

_BILLING_API = "https://cloudbilling.googleapis.com/v1"
_HOURS_PER_MONTH = 730.0
_DEFAULT_GB = 100  # GB assumed for storage estimates

# Stable GCP service IDs
_SVC_COMPUTE  = "6F81-5844-456A"
_SVC_STORAGE  = "95FF-2EF5-5EA1"
_SVC_SQL      = "9662-B51E-5089"
_SVC_FUNCTIONS = "152E-C115-5142"


def _api_key() -> str | None:
    return os.environ.get("GCP_BILLING_API_KEY") or None


def _unit_price_usd(unit_price: dict) -> float:
    """Convert a Cloud Billing unitPrice object to a float USD amount."""
    units = int(unit_price.get("units", 0) or 0)
    nanos = int(unit_price.get("nanos", 0) or 0)
    return units + nanos / 1_000_000_000


def _base_rate(sku: dict) -> float | None:
    """Extract the base tier (startUsageAmount == 0) price from a SKU."""
    for pricing_info in sku.get("pricingInfo", []):
        rates = pricing_info.get("pricingExpression", {}).get("tieredRates", [])
        for rate in rates:
            if rate.get("startUsageAmount", -1) == 0:
                up = rate.get("unitPrice", {})
                val = _unit_price_usd(up)
                if val > 0:
                    return val
    return None


def _fetch_skus(service_id: str, api_key: str, region: str) -> list[dict]:
    """Fetch all SKUs for a service that cover a specific region (paginated)."""
    url = f"{_BILLING_API}/services/{service_id}/skus"
    results: list[dict] = []
    page_token: str | None = None

    for _ in range(10):  # safety cap: 10 pages × 500 SKUs
        params: dict[str, Any] = {
            "key": api_key,
            "currencyCode": "USD",
            "pageSize": 500,
        }
        if page_token:
            params["pageToken"] = page_token

        try:
            resp = httpx.get(url, params=params, timeout=15.0)
            resp.raise_for_status()
            data = resp.json()
        except Exception:
            break

        for sku in data.get("skus", []):
            if region in sku.get("serviceRegions", []):
                results.append(sku)

        page_token = data.get("nextPageToken")
        if not page_token:
            break

    return results


# ─── Per-service price lookups ─────────────────────────────────────────────────

def _compute_price(api_key: str, config: dict, region: str) -> float | None:
    """Compute Engine: price an E2 instance (default 2 vCPU / 4 GB RAM)."""
    skus = _fetch_skus(_SVC_COMPUTE, api_key, region)
    if not skus:
        return None

    # Determine instance shape from config (fallback: e2-medium)
    instance_type = config.get("machine_type", config.get("instance_type", "e2-medium")).lower()
    family = instance_type.split("-")[0].upper()  # "E2", "N1", "N2", etc.

    # Parse vCPU and RAM from type string when possible
    # e.g. e2-medium=2vCPU/4GB, e2-standard-4=4vCPU/16GB, n1-standard-2=2vCPU/7.5GB
    vcpu, ram_gb = _parse_gce_shape(instance_type)

    cpu_price: float | None = None
    ram_price: float | None = None

    for sku in skus:
        desc = sku.get("description", "")
        category = sku.get("category", {})
        usage = category.get("usageType", "")

        if usage != "OnDemand":
            continue

        p = _base_rate(sku)
        if not p:
            continue

        if f"{family} Instance Core" in desc and cpu_price is None:
            cpu_price = p
        elif f"{family} Instance Ram" in desc and ram_price is None:
            ram_price = p

        if cpu_price is not None and ram_price is not None:
            break

    if cpu_price is not None and ram_price is not None:
        hourly = vcpu * cpu_price + ram_gb * ram_price
        return round(hourly * _HOURS_PER_MONTH, 2)
    return None


def _parse_gce_shape(instance_type: str) -> tuple[int, float]:
    """Return (vcpu, ram_gb) for common GCE instance types."""
    _SHAPES: dict[str, tuple[int, float]] = {
        "e2-micro":       (2, 1.0),
        "e2-small":       (2, 2.0),
        "e2-medium":      (2, 4.0),
        "e2-standard-2":  (2, 8.0),
        "e2-standard-4":  (4, 16.0),
        "e2-standard-8":  (8, 32.0),
        "e2-highcpu-2":   (2, 2.0),
        "e2-highmem-2":   (2, 16.0),
        "n1-standard-1":  (1, 3.75),
        "n1-standard-2":  (2, 7.5),
        "n1-standard-4":  (4, 15.0),
        "n2-standard-2":  (2, 8.0),
        "n2-standard-4":  (4, 16.0),
        "c2-standard-4":  (4, 16.0),
    }
    return _SHAPES.get(instance_type, (2, 4.0))  # default: e2-medium


def _storage_price(api_key: str, region: str) -> float | None:
    """Cloud Storage: Standard storage per GB."""
    skus = _fetch_skus(_SVC_STORAGE, api_key, region)
    for sku in skus:
        desc = sku.get("description", "")
        if "Standard Storage" in desc and "Early Delete" not in desc:
            p = _base_rate(sku)
            if p:
                return round(p * _DEFAULT_GB, 2)
    return None


def _sql_price(api_key: str, config: dict, region: str) -> float | None:
    """Cloud SQL: shared-core db-f1-micro equivalent."""
    skus = _fetch_skus(_SVC_SQL, api_key, region)
    tier = config.get("tier", config.get("instance_type", "db-f1-micro")).lower()

    # Look for shared-core CPU SKU; fall back to any DB instance SKU
    target = "Shared Core" if "f1" in tier or "g1" in tier else "DB Instance"
    for sku in skus:
        desc = sku.get("description", "")
        usage = sku.get("category", {}).get("usageType", "")
        if target in desc and usage == "OnDemand":
            p = _base_rate(sku)
            if p:
                return round(p * _HOURS_PER_MONTH, 2)
    return None


# ─── Public entry point ────────────────────────────────────────────────────────

def fetch_gcp_price(component_type: str, config: dict, region: str) -> float | None:
    """Return estimated monthly USD cost, or None when unavailable."""
    key = _api_key()
    if not key:
        return None

    try:
        if component_type in ("gcp_gce", "gcp_mig", "gcp_app_engine"):
            multiplier = 2 if component_type == "gcp_mig" else 1
            p = _compute_price(key, config, region)
            return round(p * multiplier, 2) if p else None

        if component_type == "gcp_gcs":
            return _storage_price(key, region)

        if component_type == "gcp_cloudsql":
            return _sql_price(key, config, region)

        return None
    except Exception:
        return None
