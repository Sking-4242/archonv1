"""Static Azure monthly price estimates (USD). Used when live pricing is unavailable."""

from __future__ import annotations

from app.models.graph import Component

PRICES_AS_OF = "2025-01"

_PRICES: dict[str, float] = {
    # Networking
    "azure_vnet": 0.0,
    "azure_subnet": 0.0,
    "azure_nsg": 0.0,
    "azure_agw": 180.0,
    "azure_lb": 18.0,
    "azure_frontdoor": 35.0,
    "azure_dns": 5.0,
    "azure_nat_gw": 32.0,
    "azure_vpn_gateway": 138.0,
    "azure_expressroute": 270.0,
    "azure_traffic_mgr": 6.0,
    "azure_bastion": 140.0,
    "azure_private_endpoint": 10.0,
    "azure_firewall": 912.0,
    "azure_ddos": 2944.0,
    # Compute
    "azure_vm": 70.0,
    "azure_vmss": 140.0,
    "azure_aks": 0.0,
    "azure_functions": 10.0,
    "azure_aci": 30.0,
    "azure_app_service": 55.0,
    "azure_container_apps": 20.0,
    "azure_batch": 0.0,
    "azure_spring_apps": 90.0,
    "azure_static_web": 0.0,
    "azure_acr": 20.0,
    # Storage
    "azure_blob": 20.0,
    "azure_files": 25.0,
    "azure_disk": 15.0,
    "azure_table": 5.0,
    "azure_queue": 5.0,
    "azure_datalake": 23.0,
    "azure_backup": 18.0,
    # Database
    "azure_sql": 150.0,
    "azure_cosmosdb": 25.0,
    "azure_redis": 55.0,
    "azure_postgres": 90.0,
    "azure_mysql": 80.0,
    "azure_mariadb": 75.0,
    "azure_synapse": 240.0,
    "azure_managed_instance": 1400.0,
    # Security
    "azure_keyvault": 5.0,
    "azure_aad": 0.0,
    "azure_waf": 40.0,
    "azure_defender": 15.0,
    "azure_sentinel": 0.0,
    "azure_managed_id": 0.0,
    "azure_policy": 0.0,
    # Integration
    "azure_servicebus": 10.0,
    "azure_eventhub": 22.0,
    "azure_logicapp": 12.0,
    "azure_apim": 50.0,
    "azure_signalr": 49.0,
    "azure_notification_hub": 10.0,
    # Analytics
    "azure_datafactory": 50.0,
    "azure_stream_analytics": 80.0,
    "azure_databricks": 200.0,
    "azure_hdinsight": 300.0,
    "azure_purview": 0.0,
    # AI / ML
    "azure_openai": 0.0,
    "azure_cognitive": 20.0,
    "azure_ml": 0.0,
    "azure_bot": 0.0,
    "azure_search": 75.0,
    # Monitoring
    "azure_monitor": 0.0,
    "azure_app_insights": 12.0,
    "azure_log_analytics": 25.0,
    # DevOps
    "azure_devops": 6.0,
}

_NOTES: dict[str, str] = {
    "azure_vm": "Standard_B2s estimate",
    "azure_vmss": "2× Standard_B2s estimate",
    "azure_aks": "Node pool VMs billed separately",
    "azure_functions": "Consumption plan estimate",
    "azure_agw": "Standard_v2, 2 CUs estimate",
    "azure_sql": "S0 tier estimate",
    "azure_cosmosdb": "400 RU/s estimate",
    "azure_vpn_gateway": "VpnGw1, no P2S estimate",
    "azure_expressroute": "Standard, 1 Gbps, MeteredData estimate",
    "azure_bastion": "Standard SKU estimate",
    "azure_firewall": "Standard SKU, ~1000 rules estimate",
    "azure_ddos": "DDoS Standard plan — per-VNet charge",
    "azure_container_apps": "Consumption plan, ~1M requests estimate",
    "azure_batch": "Compute nodes billed separately",
    "azure_spring_apps": "Standard tier, 2 instances estimate",
    "azure_static_web": "Free tier — Standard billed per app",
    "azure_acr": "Standard tier estimate",
    "azure_synapse": "DW100c, 100 hours/month estimate",
    "azure_managed_instance": "GP_Gen5, 4 vCores estimate",
    "azure_sentinel": "Billed per GB ingested via Log Analytics",
    "azure_purview": "Usage-based — no fixed monthly cost",
    "azure_openai": "Usage-based — billed per token",
    "azure_ml": "Compute clusters billed separately",
    "azure_bot": "Standard tier, per-message billed",
    "azure_monitor": "Metrics and alerts billed separately",
    "azure_devops": "Basic plan, per user estimate",
}


def estimate_azure_component(component: Component, region: str = "eastus") -> dict:
    ctype = component.type
    monthly = _PRICES.get(ctype)
    if monthly is None:
        return {
            "component_id": component.id,
            "component_label": component.label,
            "component_type": ctype,
            "description": "Azure resource",
            "monthly_cost": 0.0,
            "note": "No pricing data available",
        }
    return {
        "component_id": component.id,
        "component_label": component.label,
        "component_type": ctype,
        "description": f"Azure {ctype.replace('azure_', '').replace('_', ' ').title()}",
        "monthly_cost": monthly,
        "note": _NOTES.get(ctype, ""),
    }
