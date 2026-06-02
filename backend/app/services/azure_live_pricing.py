"""
Azure live pricing via the public Retail Prices REST API.

Endpoint: https://prices.azure.com/api/retail/prices
No authentication required.  Queries are filtered per component type and
ARM region so each request returns a small result set.

Cache is managed externally in live_pricing.py.
"""
from __future__ import annotations

import httpx

_API = "https://prices.azure.com/api/retail/prices"
_HOURS_PER_MONTH = 730.0
_DEFAULT_GB = 100.0

# Maps our component type ->
#   (serviceName, default sku fragment, unit_hint)
# unit_hint: "hourly" | "monthly" | "per_gb"
_SERVICE_MAP: dict[str, tuple[str, str, str]] = {
    # Compute
    "azure_vm":               ("Virtual Machines",                   "D2s v5",          "hourly"),
    "azure_vmss":             ("Virtual Machines",                   "D2s v5",          "hourly"),
    "azure_aks":              ("Azure Kubernetes Service",           "",                "hourly"),
    "azure_functions":        ("Azure Functions",                    "",                "monthly"),
    "azure_aci":              ("Container Instances",                "",                "hourly"),
    "azure_app_service":      ("App Service",                        "B2",              "hourly"),
    "azure_container_apps":   ("Azure Container Apps",               "",                "monthly"),
    "azure_acr":              ("Container Registry",                 "Standard",        "monthly"),
    "azure_spring_apps":      ("Azure Spring Apps",                  "Standard",        "hourly"),
    "azure_batch":            ("Azure Batch",                        "",                "hourly"),
    "azure_static_web":       ("Static Web Apps",                    "Standard",        "monthly"),
    # Storage
    "azure_blob":             ("Storage",                            "Hot LRS",         "per_gb"),
    "azure_files":            ("Storage",                            "Files LRS",       "per_gb"),
    "azure_disk":             ("Storage",                            "P10 LRS",         "monthly"),
    "azure_table":            ("Storage",                            "Table LRS",       "per_gb"),
    "azure_queue":            ("Storage",                            "Queue LRS",       "per_gb"),
    "azure_datalake":         ("Storage",                            "Hot LRS",         "per_gb"),
    "azure_backup":           ("Azure Backup",                       "LRS",             "per_gb"),
    # Databases
    "azure_sql":              ("SQL Database",                       "General Purpose", "hourly"),
    "azure_cosmosdb":         ("Azure Cosmos DB",                    "",                "hourly"),
    "azure_redis":            ("Redis Cache",                        "C1",              "hourly"),
    "azure_postgres":         ("Azure Database for PostgreSQL",      "General Purpose", "hourly"),
    "azure_mysql":            ("Azure Database for MySQL",           "General Purpose", "hourly"),
    "azure_mariadb":          ("Azure Database for MariaDB",         "General Purpose", "hourly"),
    "azure_synapse":          ("Azure Synapse Analytics",            "DW100c",          "hourly"),
    "azure_managed_instance": ("SQL Managed Instance",               "General Purpose", "hourly"),
    # Networking
    "azure_lb":               ("Load Balancer",                      "Standard",        "hourly"),
    "azure_agw":              ("Application Gateway",                "Standard v2",     "hourly"),
    "azure_frontdoor":        ("Azure Front Door",                   "",                "monthly"),
    "azure_nat_gw":           ("Virtual Network NAT",                "",                "hourly"),
    "azure_dns":              ("Azure DNS",                          "",                "monthly"),
    "azure_vpn_gateway":      ("VPN Gateway",                        "VpnGw1",          "hourly"),
    "azure_expressroute":     ("ExpressRoute",                       "Standard",        "hourly"),
    "azure_bastion":          ("Azure Bastion",                      "Basic",           "hourly"),
    "azure_firewall":         ("Azure Firewall",                     "Standard",        "hourly"),
    # Security & identity
    "azure_keyvault":         ("Key Vault",                          "Standard",        "monthly"),
    "azure_waf":              ("Web Application Firewall",           "",                "hourly"),
    "azure_defender":         ("Microsoft Defender for Cloud",       "Servers",         "monthly"),
    "azure_sentinel":         ("Microsoft Sentinel",                 "",                "per_gb"),
    # Integration
    "azure_servicebus":       ("Service Bus",                        "Standard",        "monthly"),
    "azure_eventhub":         ("Event Hubs",                         "Standard",        "monthly"),
    "azure_apim":             ("API Management",                     "Developer",       "hourly"),
    "azure_logicapp":         ("Logic Apps",                         "",                "monthly"),
    "azure_signalr":          ("SignalR Service",                    "Standard",        "monthly"),
    "azure_notification_hub": ("Notification Hubs",                "Standard",        "monthly"),
    # Analytics
    "azure_datafactory":      ("Azure Data Factory v2",              "",                "monthly"),
    "azure_databricks":       ("Azure Databricks",                   "Premium",         "hourly"),
    "azure_stream_analytics": ("Stream Analytics",                   "",                "hourly"),
    "azure_hdinsight":        ("HDInsight",                          "",                "hourly"),
    "azure_cognitive":        ("Cognitive Services",                 "S0",              "monthly"),
    "azure_openai":           ("Azure OpenAI",                       "",                "monthly"),
    "azure_search":           ("Azure Cognitive Search",             "Basic",           "hourly"),
    # Monitoring
    "azure_log_analytics":    ("Log Analytics",                      "",                "per_gb"),
    "azure_app_insights":     ("Application Insights",               "",                "per_gb"),
    "azure_monitor":          ("Azure Monitor",                      "",                "per_gb"),
}

_FREE = {
    "azure_nsg", "azure_vnet", "azure_subnet", "azure_aad",
    "azure_managed_id", "azure_policy",
    "azure_ddos",
    "azure_private_endpoint",
    "azure_traffic_mgr",
    "azure_purview",
    "azure_ml",
    "azure_bot",
    "azure_devops",
}

_CONFIG_SKU_KEYS = ("vm_size", "size", "tier", "sku", "instance_type")


def _usage_float(usage: dict | None, key: str, default: float) -> float:
    val = (usage or {}).get(key, default)
    try:
        return float(val)
    except (TypeError, ValueError):
        return float(default)


def _sku_fragment(config: dict, default: str) -> str:
    for key in _CONFIG_SKU_KEYS:
        val = config.get(key)
        if val:
            return str(val)
    return default


def fetch_azure_price(
    component_type: str,
    region: str,
    config: dict | None = None,
    usage: dict | None = None,
) -> float | None:
    """Return estimated monthly USD cost, or None if the component/region is unknown."""
    if component_type in _FREE:
        return 0.0

    mapping = _SERVICE_MAP.get(component_type)
    if not mapping:
        return None

    cfg = config or {}
    service_name, default_sku, unit_hint = mapping
    sku_fragment = _sku_fragment(cfg, default_sku)
    arm_region = region.lower()

    clauses = [
        f"serviceName eq '{service_name}'",
        f"armRegionName eq '{arm_region}'",
        "priceType eq 'Consumption'",
    ]
    if sku_fragment:
        clauses.append(f"contains(skuName, '{sku_fragment}')")

    try:
        resp = httpx.get(
            _API,
            params={"$filter": " and ".join(clauses)},
            timeout=12.0,
        )
        resp.raise_for_status()
        items = resp.json().get("Items", [])
    except Exception:
        return None

    if not items:
        return None

    candidates = sorted(
        items,
        key=lambda x: (not x.get("isPrimaryMeterRegion", False), x.get("retailPrice", 0)),
    )

    for item in candidates:
        price = item.get("retailPrice", 0.0)
        if price <= 0:
            continue
        uom = item.get("unitOfMeasure", "").lower()
        return _to_monthly(price, uom, unit_hint, usage)

    return None


def _to_monthly(
    price: float,
    uom: str,
    hint: str,
    usage: dict | None,
) -> float:
    if "hour" in uom or hint == "hourly":
        hours = _usage_float(usage, "hours_per_month", _HOURS_PER_MONTH)
        return round(price * hours, 2)
    if "month" in uom or hint == "monthly":
        return round(price, 2)
    if "gb" in uom or hint == "per_gb":
        gb = _usage_float(usage, "storage_gb", _DEFAULT_GB)
        return round(price * gb, 2)
    hours = _usage_float(usage, "hours_per_month", _HOURS_PER_MONTH)
    return round(price * hours, 2)
