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
_DEFAULT_GB = 100.0

# Stable GCP Cloud Billing service IDs
_SVC: dict[str, str] = {
    "compute": "6F81-5844-456A",
    "storage": "95FF-2EF5-5EA1",
    "sql": "9662-B51E-5089",
    "functions": "152E-C115-5142",
    "run": "152E-C115-5142",
    "gke": "52E2-CCC6-A42C",
    "pubsub": "A1E8-BE35-2544",
    "networking": "E505-1604-58F8",
    "dns": "FA26-5236-BEB5",
    "cdn": "4754-D6F9-D750",
    "redis": "E718-8438-5D74",
    "firestore": "96A2-DF48-3484",
    "bigquery": "24E6-881D-C892",
    "secrets": "EE82-7A57-8965",
    "kms": "EE2F-D110-890C",
    "logging": "5497-F7B7-9D96",
    "monitoring": "58CD-E7-7C23",
    "artifact": "149C-F9EC-2142",
    "spanner": "CC63-0873-48FD",
    "bigtable": "C3BE-8779-6D52",
    "dataflow": "42FF-0667-AAD7",
    "dataproc": "363B-6451-DDA7",
    "filestore": "DDAE-7987-CCED",
    "armor": "EAB7-8A62-64D4",
    "tasks": "F3A6-D7B7-9BDA",
    "scheduler": "213C-9623-1402",
    "workflows": "E722-8437-AFBC",
    "build": "8B5D-EF7E-9343",
    "composer": "6290-28B2-939A",
}

_FREE = {
    "gcp_vpc", "gcp_subnet", "gcp_firewall", "gcp_gke", "gcp_iam",
    "gcp_firestore", "gcp_datastore", "gcp_bigquery", "gcp_scc",
    "gcp_monitoring", "gcp_trace", "gcp_error_reporting",
    "gcp_cloud_deploy", "gcp_analytics_hub", "gcp_vertex_ai",
    "gcp_automl", "gcp_looker", "gcp_apigee", "gcp_network_endpoint_grp",
    "gcp_cloud_batch",
}

# component type -> (service key, unit_hint)
_COMPONENT_MAP: dict[str, tuple[str, str]] = {
    "gcp_gce": ("compute", "hourly"),
    "gcp_mig": ("compute", "hourly"),
    "gcp_app_engine": ("compute", "hourly"),
    "gcp_cloud_run": ("run", "monthly"),
    "gcp_cloud_functions": ("functions", "monthly"),
    "gcp_gcs": ("storage", "per_gb"),
    "gcp_persistent_disk": ("compute", "monthly"),
    "gcp_filestore": ("filestore", "monthly"),
    "gcp_backup": ("storage", "per_gb"),
    "gcp_cloudsql": ("sql", "hourly"),
    "gcp_alloydb": ("sql", "hourly"),
    "gcp_spanner": ("spanner", "hourly"),
    "gcp_bigtable": ("bigtable", "hourly"),
    "gcp_memorystore": ("redis", "hourly"),
    "gcp_lb": ("networking", "hourly"),
    "gcp_nat": ("networking", "hourly"),
    "gcp_vpn": ("networking", "hourly"),
    "gcp_interconnect": ("networking", "hourly"),
    "gcp_private_sc": ("networking", "monthly"),
    "gcp_cdn": ("cdn", "monthly"),
    "gcp_dns": ("dns", "monthly"),
    "gcp_pubsub": ("pubsub", "monthly"),
    "gcp_secret_manager": ("secrets", "monthly"),
    "gcp_kms": ("kms", "monthly"),
    "gcp_armor": ("armor", "monthly"),
    "gcp_certificate_manager": ("networking", "monthly"),
    "gcp_dataflow": ("dataflow", "hourly"),
    "gcp_dataproc": ("dataproc", "hourly"),
    "gcp_cloud_composer": ("composer", "hourly"),
    "gcp_logging": ("logging", "per_gb"),
    "gcp_artifact_registry": ("artifact", "monthly"),
    "gcp_cloud_build": ("build", "monthly"),
    "gcp_tasks": ("tasks", "monthly"),
    "gcp_scheduler": ("scheduler", "monthly"),
    "gcp_workflows": ("workflows", "monthly"),
    "gcp_data_catalog": ("bigquery", "monthly"),
    "gcp_vision_ai": ("compute", "monthly"),
    "gcp_speech": ("compute", "monthly"),
    "gcp_translation": ("compute", "monthly"),
    "gcp_natural_lang": ("compute", "monthly"),
    "gcp_source_repo": ("compute", "monthly"),
}


def _usage_float(usage: dict | None, key: str, default: float) -> float:
    val = (usage or {}).get(key, default)
    try:
        return float(val)
    except (TypeError, ValueError):
        return float(default)


def _api_key() -> str | None:
    return os.environ.get("GCP_BILLING_API_KEY") or None


def _unit_price_usd(unit_price: dict) -> float:
    units = int(unit_price.get("units", 0) or 0)
    nanos = int(unit_price.get("nanos", 0) or 0)
    return units + nanos / 1_000_000_000


def _base_rate(sku: dict) -> float | None:
    for pricing_info in sku.get("pricingInfo", []):
        rates = pricing_info.get("pricingExpression", {}).get("tieredRates", [])
        for rate in rates:
            if rate.get("startUsageAmount", -1) == 0:
                val = _unit_price_usd(rate.get("unitPrice", {}))
                if val > 0:
                    return val
    return None


def _fetch_skus(service_id: str, api_key: str, region: str) -> list[dict]:
    url = f"{_BILLING_API}/services/{service_id}/skus"
    results: list[dict] = []
    page_token: str | None = None

    for _ in range(10):
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


def _parse_gce_shape(instance_type: str) -> tuple[int, float]:
    shapes: dict[str, tuple[int, float]] = {
        "e2-micro": (2, 1.0),
        "e2-small": (2, 2.0),
        "e2-medium": (2, 4.0),
        "e2-standard-2": (2, 8.0),
        "e2-standard-4": (4, 16.0),
        "e2-standard-8": (8, 32.0),
        "e2-highcpu-2": (2, 2.0),
        "e2-highmem-2": (2, 16.0),
        "n1-standard-1": (1, 3.75),
        "n1-standard-2": (2, 7.5),
        "n1-standard-4": (4, 15.0),
        "n2-standard-2": (2, 8.0),
        "n2-standard-4": (4, 16.0),
        "c2-standard-4": (4, 16.0),
    }
    return shapes.get(instance_type, (2, 4.0))


def _compute_price(api_key: str, config: dict, region: str, usage: dict | None) -> float | None:
    skus = _fetch_skus(_SVC["compute"], api_key, region)
    if not skus:
        return None

    instance_type = config.get("machine_type", config.get("instance_type", "e2-medium")).lower()
    family = instance_type.split("-")[0].upper()
    vcpu, ram_gb = _parse_gce_shape(instance_type)

    cpu_price: float | None = None
    ram_price: float | None = None

    for sku in skus:
        desc = sku.get("description", "")
        if sku.get("category", {}).get("usageType", "") != "OnDemand":
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

    if cpu_price is None or ram_price is None:
        return None

    hours = _usage_float(usage, "hours_per_month", _HOURS_PER_MONTH)
    hourly = vcpu * cpu_price + ram_gb * ram_price
    return round(hourly * hours, 2)


def _storage_price(api_key: str, region: str, usage: dict | None) -> float | None:
    skus = _fetch_skus(_SVC["storage"], api_key, region)
    for sku in skus:
        desc = sku.get("description", "")
        if "Standard Storage" in desc and "Early Delete" not in desc:
            p = _base_rate(sku)
            if p:
                gb = _usage_float(usage, "storage_gb", _DEFAULT_GB)
                return round(p * gb, 2)
    return None


def _sql_price(api_key: str, config: dict, region: str, usage: dict | None) -> float | None:
    skus = _fetch_skus(_SVC["sql"], api_key, region)
    tier = config.get("tier", config.get("instance_type", "db-f1-micro")).lower()
    target = "Shared Core" if "f1" in tier or "g1" in tier else "DB Instance"
    for sku in skus:
        desc = sku.get("description", "")
        if target in desc and sku.get("category", {}).get("usageType", "") == "OnDemand":
            p = _base_rate(sku)
            if p:
                hours = _usage_float(usage, "hours_per_month", _HOURS_PER_MONTH)
                return round(p * hours, 2)
    return None


def _first_sku_price(
    api_key: str,
    service_key: str,
    region: str,
    *,
    desc_contains: str = "",
    usage_type: str = "OnDemand",
) -> float | None:
    service_id = _SVC.get(service_key)
    if not service_id:
        return None
    skus = _fetch_skus(service_id, api_key, region)
    needle = desc_contains.lower()
    for sku in skus:
        desc = sku.get("description", "")
        if needle and needle not in desc.lower():
            continue
        if usage_type and sku.get("category", {}).get("usageType", "") != usage_type:
            continue
        p = _base_rate(sku)
        if p:
            return p
    return None


def _scale_monthly(
    unit_price: float,
    unit_hint: str,
    usage: dict | None,
) -> float:
    if unit_hint == "hourly":
        hours = _usage_float(usage, "hours_per_month", _HOURS_PER_MONTH)
        return round(unit_price * hours, 2)
    if unit_hint == "per_gb":
        gb = _usage_float(usage, "storage_gb", _DEFAULT_GB)
        return round(unit_price * gb, 2)
    return round(unit_price, 2)


def _generic_price(
    api_key: str,
    service_key: str,
    region: str,
    unit_hint: str,
    usage: dict | None,
    desc_contains: str = "",
) -> float | None:
    p = _first_sku_price(api_key, service_key, region, desc_contains=desc_contains)
    if p is None:
        return None
    return _scale_monthly(p, unit_hint, usage)


def fetch_gcp_price(
    component_type: str,
    config: dict,
    region: str,
    usage: dict | None = None,
) -> float | None:
    """Return estimated monthly USD cost, or None when unavailable."""
    if component_type in _FREE:
        return 0.0

    key = _api_key()
    if not key:
        return None

    cfg = config or {}
    ctype = component_type.lower()

    try:
        if ctype in ("gcp_gce", "gcp_app_engine"):
            return _compute_price(key, cfg, region, usage)

        if ctype == "gcp_mig":
            p = _compute_price(key, cfg, region, usage)
            return round(p * 2, 2) if p else None

        if ctype == "gcp_gcs":
            return _storage_price(key, region, usage)

        if ctype in ("gcp_cloudsql", "gcp_alloydb"):
            return _sql_price(key, cfg, region, usage)

        mapping = _COMPONENT_MAP.get(ctype)
        if mapping is None:
            return None

        service_key, unit_hint = mapping
        desc_hints = {
            "gcp_lb": "Network Load Balancing",
            "gcp_nat": "Cloud NAT",
            "gcp_vpn": "Cloud VPN",
            "gcp_cdn": "Cloud CDN",
            "gcp_dns": "Cloud DNS",
            "gcp_pubsub": "Pub/Sub",
            "gcp_secret_manager": "Secret",
            "gcp_kms": "Cloud KMS",
            "gcp_armor": "Cloud Armor",
            "gcp_logging": "Log Storage",
            "gcp_memorystore": "Redis",
            "gcp_filestore": "Filestore",
            "gcp_dataflow": "Dataflow",
            "gcp_dataproc": "Dataproc",
            "gcp_cloud_composer": "Composer",
            "gcp_artifact_registry": "Artifact Registry",
            "gcp_cloud_build": "Cloud Build",
        }
        desc = desc_hints.get(ctype, "")
        return _generic_price(key, service_key, region, unit_hint, usage, desc_contains=desc)
    except Exception:
        return None
