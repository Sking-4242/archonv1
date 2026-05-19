"""
On-premises cost estimates.

On-prem costs are fundamentally CapEx / amortized hardware rather than
monthly SaaS prices. These numbers are rough monthly amortized estimates
assuming a 3-year depreciation cycle. They intentionally skew high to
reflect real TCO (hardware, power, cooling, licensing).
"""

from __future__ import annotations

from app.models.graph import Component

PRICES_AS_OF = "2025-01"

_PRICES: dict[str, float] = {
    # Networking
    "onprem_network_zone": 0.0,
    "onprem_vlan": 0.0,
    "onprem_firewall": 280.0,
    "onprem_load_balancer": 150.0,
    "onprem_router": 200.0,
    "onprem_switch": 80.0,
    "onprem_dns": 0.0,
    "onprem_proxy": 0.0,
    "onprem_vpn": 80.0,
    "onprem_ids_ips": 200.0,
    # Compute
    "onprem_bare_metal": 600.0,
    "onprem_vm": 120.0,
    "onprem_k8s": 0.0,
    "onprem_container": 80.0,
    "onprem_hyperconverged": 2200.0,
    "onprem_gpu_server": 3500.0,
    # Storage
    "onprem_san": 800.0,
    "onprem_nas": 300.0,
    "onprem_object_store": 150.0,
    "onprem_backup_server": 250.0,
    "onprem_tape_library": 400.0,
    # Database
    "onprem_postgres": 0.0,
    "onprem_mysql": 0.0,
    "onprem_mssql": 700.0,
    "onprem_redis": 0.0,
    "onprem_elasticsearch": 0.0,
    "onprem_mongodb": 0.0,
    "onprem_cassandra": 0.0,
    # Security
    "onprem_idp": 0.0,
    "onprem_vault": 200.0,
    "onprem_waf": 120.0,
    "onprem_siem": 1500.0,
    "onprem_pam": 800.0,
    "onprem_ca": 0.0,
    # Integration
    "onprem_message_broker": 0.0,
    "onprem_api_gateway": 0.0,
    "onprem_service_mesh": 0.0,
    "onprem_etl": 0.0,
    # Observability
    "onprem_monitoring": 0.0,
    "onprem_log_aggregator": 0.0,
    "onprem_tracing": 0.0,
    # DevOps
    "onprem_ci_cd": 0.0,
    "onprem_artifact_repo": 0.0,
    "onprem_git_server": 0.0,
    "onprem_config_mgmt": 0.0,
}

_NOTES: dict[str, str] = {
    "onprem_bare_metal": "Amortized hardware cost (3yr)",
    "onprem_vm": "vSphere license share + hardware amortization",
    "onprem_k8s": "Cost included in underlying VMs/bare metal",
    "onprem_container": "Hardware share + container runtime licensing",
    "onprem_hyperconverged": "4-node HCI cluster amortized (3yr)",
    "onprem_gpu_server": "4× A100 GPU server amortized (3yr)",
    "onprem_firewall": "Enterprise firewall amortized",
    "onprem_ids_ips": "Suricata/Snort hardware appliance amortized",
    "onprem_vpn": "VPN appliance or server amortized",
    "onprem_san": "Enterprise SAN amortized (3yr)",
    "onprem_backup_server": "Backup appliance + software amortized",
    "onprem_tape_library": "Tape library hardware amortized (3yr)",
    "onprem_postgres": "Open source — hardware billed via server",
    "onprem_mysql": "Open source — hardware billed via server",
    "onprem_mssql": "SQL Server Standard license amortized (3yr)",
    "onprem_redis": "Open source — hardware billed via server",
    "onprem_elasticsearch": "Open source — hardware billed via server",
    "onprem_mongodb": "Community edition — hardware billed via server",
    "onprem_cassandra": "Open source — hardware billed via server",
    "onprem_vault": "HashiCorp Vault Enterprise license amortized",
    "onprem_siem": "Splunk / IBM QRadar license amortized",
    "onprem_pam": "CyberArk license amortized",
    "onprem_monitoring": "Open source stack — hardware billed via server",
    "onprem_log_aggregator": "Open source stack — hardware billed via server",
    "onprem_tracing": "Open source — hardware billed via server",
    "onprem_ci_cd": "Open source — hardware billed via server",
    "onprem_artifact_repo": "OSS or Pro license + server hardware",
    "onprem_git_server": "Open source — hardware billed via server",
    "onprem_config_mgmt": "Open source — hardware billed via server",
}


def estimate_onprem_component(component: Component, region: str = "on-prem") -> dict:
    ctype = component.type
    monthly = _PRICES.get(ctype)
    if monthly is None:
        return {
            "component_id": component.id,
            "component_label": component.label,
            "component_type": ctype,
            "description": "On-premises resource",
            "monthly_cost": 0.0,
            "note": "No pricing data available",
        }
    return {
        "component_id": component.id,
        "component_label": component.label,
        "component_type": ctype,
        "description": f"On-Prem {ctype.replace('onprem_', '').replace('_', ' ').title()}",
        "monthly_cost": monthly,
        "note": _NOTES.get(ctype, ""),
    }
