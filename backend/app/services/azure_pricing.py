"""
Azure pricing estimates.

All usage-billed services accept a `usage` dict whose keys match the field
keys defined in frontend/src/utils/usageSchema.js. If a key is absent the
function falls back to the same default value used in the schema so the
Quick Estimate (no usage input) matches the Usage Model baseline.

Prices are as of 2025-01 (East US reference rates).
"""

from __future__ import annotations

from app.models.graph import Component

PRICES_AS_OF = "2025-01"

_DEFAULT_HOURS = 730  # always-on baseline


def _u(usage, key, default):
    """Extract a usage value with fallback to default."""
    val = (usage or {}).get(key, default)
    try:
        return float(val)
    except (TypeError, ValueError):
        return float(default)


# ── VM size hourly rates (East US) ────────────────────────────────────────────

_VM_HOURLY = {
    "Standard_B2s": 0.0416,
    "Standard_D2s_v3": 0.096,
    "Standard_D4s_v3": 0.192,
    "Standard_F4s_v2": 0.169,
    "Standard_E4s_v3": 0.252,
    "Standard_L8s_v3": 0.624,
    "Standard_D2s_v4": 0.096,
    "Standard_D3_v2": 0.14,
}

# Flat fallback prices for resource types not covered by usage-based logic
_FLAT_PRICES: dict[str, float] = {
    "azure_vnet": 0.0,
    "azure_subnet": 0.0,
    "azure_nsg": 0.0,
    "azure_nat_gw": 32.0,
    "azure_vpn_gateway": 138.0,
    "azure_expressroute": 270.0,
    "azure_traffic_mgr": 6.0,
    "azure_bastion": 140.0,
    "azure_private_endpoint": 10.0,
    "azure_firewall": 912.0,
    "azure_ddos": 2944.0,
    "azure_aci": 30.0,
    "azure_batch": 0.0,
    "azure_spring_apps": 90.0,
    "azure_static_web": 0.0,
    "azure_acr": 20.0,
    "azure_disk": 15.0,
    "azure_table": 5.0,
    "azure_queue": 5.0,
    "azure_backup": 18.0,
    "azure_mariadb": 75.0,
    "azure_synapse": 240.0,
    "azure_managed_instance": 1400.0,
    "azure_keyvault": 5.0,
    "azure_aad": 0.0,
    "azure_waf": 40.0,
    "azure_defender": 15.0,
    "azure_managed_id": 0.0,
    "azure_policy": 0.0,
    "azure_signalr": 49.0,
    "azure_notification_hub": 10.0,
    "azure_datafactory": 50.0,
    "azure_stream_analytics": 80.0,
    "azure_hdinsight": 300.0,
    "azure_purview": 0.0,
    "azure_cognitive": 20.0,
    "azure_ml": 0.0,
    "azure_bot": 0.0,
    "azure_devops": 6.0,
    "azure_container_apps": 20.0,
}

_FLAT_NOTES: dict[str, str] = {
    "azure_nat_gw": "Standard SKU, 730 hrs estimate",
    "azure_vpn_gateway": "VpnGw1, no P2S estimate",
    "azure_expressroute": "Standard, 1 Gbps, MeteredData estimate",
    "azure_bastion": "Standard SKU estimate",
    "azure_firewall": "Standard SKU, ~1000 rules estimate",
    "azure_ddos": "DDoS Standard plan — per-VNet charge",
    "azure_aci": "1 vCPU / 1.5 GB, ~730 hrs estimate",
    "azure_batch": "Compute nodes billed separately",
    "azure_spring_apps": "Standard tier, 2 instances estimate",
    "azure_static_web": "Free tier — Standard billed per app",
    "azure_acr": "Standard tier estimate",
    "azure_synapse": "DW100c, 100 hours/month estimate",
    "azure_managed_instance": "GP_Gen5, 4 vCores estimate",
    "azure_purview": "Usage-based — no fixed monthly cost",
    "azure_ml": "Compute clusters billed separately",
    "azure_bot": "Standard tier, per-message billed",
    "azure_container_apps": "Consumption plan, ~1M requests estimate",
}


def estimate_azure_component(
    component: Component,
    region: str = "eastus",
    usage: dict = None,
) -> dict:
    """
    Return a pricing dict for the given Azure component.

    `usage` is a flat dict of field_key -> value matching usageSchema.js.
    When usage is None or a key is absent the schema default is used.
    """
    ctype = component.type
    config = component.config or {}

    result = _compute_azure(ctype, config, usage)

    if result is None:
        monthly = _FLAT_PRICES.get(ctype, 0.0)
        result = {
            "monthly_cost": monthly,
            "description": f"Azure {ctype.replace('azure_', '').replace('_', ' ').title()}",
            "note": _FLAT_NOTES.get(ctype, ""),
        }

    return {
        "component_id": component.id,
        "component_label": component.label,
        "component_type": ctype,
        **result,
    }


def _compute_azure(ctype: str, config: dict, usage) -> dict | None:
    """Return {monthly_cost, description, note} for usage-billed types, else None."""

    # ── Networking ────────────────────────────────────────────────────────────

    if ctype == "azure_agw":
        hours = _u(usage, "hours_per_month", _DEFAULT_HOURS)
        cus = _u(usage, "capacity_units_per_hour", 2)
        fixed = 0.246 * hours
        cu_cost = cus * 0.008 * hours
        total = fixed + cu_cost
        return {
            "monthly_cost": round(total, 2),
            "description": f"App Gateway Standard_v2 {hours:.0f} hrs · {cus:.1f} CU/hr",
            "note": "",
        }

    if ctype == "azure_lb":
        hours = _u(usage, "hours_per_month", _DEFAULT_HOURS)
        rules = _u(usage, "rules", 1)
        data_gb = _u(usage, "data_processed_gb", 100)
        rule_cost = rules * 0.005 * hours
        data_cost = data_gb * 0.005
        total = rule_cost + data_cost
        return {
            "monthly_cost": round(total, 2),
            "description": f"Load Balancer Standard {rules:.0f} rule(s) · {data_gb:.0f} GB",
            "note": "",
        }

    if ctype == "azure_frontdoor":
        requests_m = _u(usage, "requests_monthly", 10)
        transfer_gb = _u(usage, "data_transfer_gb", 100)
        request_cost = (requests_m / 10) * 0.025
        transfer_cost = transfer_gb * 0.0087
        total = request_cost + transfer_cost
        return {
            "monthly_cost": round(total, 2),
            "description": f"Front Door {requests_m:.0f}M reqs · {transfer_gb:.0f} GB",
            "note": "Standard tier estimate",
        }

    if ctype == "azure_dns":
        zones = _u(usage, "hosted_zones", 1)
        queries_m = _u(usage, "queries_monthly", 1)
        zone_cost = zones * 0.50
        query_cost = queries_m * 0.40
        total = zone_cost + query_cost
        return {
            "monthly_cost": round(total, 2),
            "description": f"Azure DNS {zones:.0f} zone(s) · {queries_m:.1f}M queries",
            "note": "",
        }

    # ── Compute ───────────────────────────────────────────────────────────────

    if ctype == "azure_vm":
        size = config.get("size", "Standard_B2s")
        hourly = _VM_HOURLY.get(size, _VM_HOURLY["Standard_B2s"])
        hours = _u(usage, "hours_per_month", _DEFAULT_HOURS)
        data_gb = _u(usage, "data_transfer_gb", 10)
        compute = hourly * hours
        xfer = data_gb * 0.087
        total = compute + xfer
        return {
            "monthly_cost": round(total, 2),
            "description": f"VM {size} {hours:.0f} hrs · {data_gb:.0f} GB transfer",
            "note": "",
        }

    if ctype == "azure_vmss":
        size = config.get("sku_name", "Standard_D2s_v3")
        hourly = _VM_HOURLY.get(size, _VM_HOURLY["Standard_D2s_v3"])
        instances = _u(usage, "instance_count", config.get("instances", 2))
        hours = _u(usage, "hours_per_month", _DEFAULT_HOURS)
        total = hourly * instances * hours
        return {
            "monthly_cost": round(total, 2),
            "description": f"VMSS {size} ×{instances:.0f} · {hours:.0f} hrs",
            "note": "",
        }

    if ctype == "azure_aks":
        nodes = _u(usage, "node_count", config.get("node_count", 3))
        hours = _u(usage, "hours_per_month", _DEFAULT_HOURS)
        vm_size = config.get("vm_size", "Standard_D2s_v3")
        hourly = _VM_HOURLY.get(vm_size, _VM_HOURLY["Standard_D2s_v3"])
        total = hourly * nodes * hours
        return {
            "monthly_cost": round(total, 2),
            "description": f"AKS {nodes:.0f}×{vm_size} {hours:.0f} hrs (control plane free)",
            "note": "Control plane free; node pool VMs billed",
        }

    if ctype == "azure_functions":
        executions_m = _u(usage, "invocations_monthly", 1_000_000)
        duration_ms = _u(usage, "avg_duration_ms", 200)
        memory_mb = _u(usage, "memory_mb", 128)
        billable_exec = max(0, executions_m - 1_000_000)
        exec_cost = (billable_exec / 1_000_000) * 0.20
        gb_seconds = (memory_mb / 1024) * (duration_ms / 1000) * executions_m
        billable_gbs = max(0, gb_seconds - 400_000)
        duration_cost = billable_gbs * 0.000016
        total = exec_cost + duration_cost
        return {
            "monthly_cost": round(total, 2),
            "description": (
                f"Functions {executions_m/1e6:.1f}M exec · {duration_ms:.0f} ms · {memory_mb:.0f} MB"
            ),
            "note": "Consumption plan; first 1M exec + 400k GB-s free",
        }

    if ctype == "azure_app_service":
        sku = config.get("sku_name", "B1")
        sku_hourly = {
            "F1": 0.0, "B1": 0.018, "B2": 0.036, "S1": 0.10,
            "P1v3": 0.173, "P2v3": 0.346,
        }
        hourly = sku_hourly.get(sku, 0.018)
        hours = _u(usage, "hours_per_month", _DEFAULT_HOURS)
        total = hourly * hours
        return {
            "monthly_cost": round(total, 2),
            "description": f"App Service {sku} {hours:.0f} hrs",
            "note": "",
        }

    if ctype == "azure_databricks":
        dbu_hours = _u(usage, "dbu_hours_monthly", 100)
        sku = config.get("sku", "premium")
        rate = 0.30 if sku == "standard" else 0.40
        total = dbu_hours * rate
        return {
            "monthly_cost": round(total, 2),
            "description": f"Databricks {sku} {dbu_hours:.0f} DBU-hrs",
            "note": "VM costs billed separately",
        }

    # ── Storage ───────────────────────────────────────────────────────────────

    if ctype == "azure_blob":
        storage_gb = _u(usage, "storage_gb", 100)
        write_ops_k = _u(usage, "put_requests", 100)
        read_ops_k = _u(usage, "get_requests", 1_000)
        transfer_gb = _u(usage, "data_transfer_gb", 10)
        storage_cost = storage_gb * 0.018
        write_cost = write_ops_k * 0.00005
        read_cost = read_ops_k * 0.000004
        xfer_cost = transfer_gb * 0.087
        total = storage_cost + write_cost + read_cost + xfer_cost
        return {
            "monthly_cost": round(total, 2),
            "description": f"Blob Storage {storage_gb:.0f} GB · {write_ops_k:.0f}k writes · {read_ops_k:.0f}k reads",
            "note": "Standard LRS Hot tier",
        }

    if ctype == "azure_files":
        storage_gb = _u(usage, "storage_gb", config.get("quota", 100))
        total = storage_gb * 0.06
        return {
            "monthly_cost": round(total, 2),
            "description": f"Azure Files {storage_gb:.0f} GB (Standard)",
            "note": "",
        }

    if ctype == "azure_datalake":
        storage_gb = _u(usage, "storage_gb", 100)
        reads_gb = _u(usage, "reads_gb", 10)
        writes_gb = _u(usage, "writes_gb", 10)
        storage_cost = storage_gb * 0.023
        read_cost = reads_gb * 0.004
        write_cost = writes_gb * 0.039
        total = storage_cost + read_cost + write_cost
        return {
            "monthly_cost": round(total, 2),
            "description": f"Data Lake Gen2 {storage_gb:.0f} GB · {reads_gb:.0f} GB reads",
            "note": "Standard LRS estimate",
        }

    # ── Database ──────────────────────────────────────────────────────────────

    if ctype == "azure_sql":
        hours = _u(usage, "hours_per_month", _DEFAULT_HOURS)
        sku = config.get("sku_name", "S0")
        sku_hourly = {
            "Basic": 0.0068, "S0": 0.0202, "S1": 0.0403, "P1": 0.4654,
            "GP_Gen5_2": 0.2800,
        }
        hourly = sku_hourly.get(sku, sku_hourly["S0"])
        storage_gb = _u(usage, "storage_gb", config.get("max_size_gb", 32))
        compute_cost = hourly * hours
        storage_cost = max(0, storage_gb - 250) * 0.115
        total = compute_cost + storage_cost
        return {
            "monthly_cost": round(total, 2),
            "description": f"SQL Database {sku} {hours:.0f} hrs · {storage_gb:.0f} GB",
            "note": "",
        }

    if ctype == "azure_postgres":
        hours = _u(usage, "hours_per_month", _DEFAULT_HOURS)
        sku = config.get("sku_name", "Standard_D2s_v3")
        sku_hourly = {
            "Standard_D2s_v3": 0.0793, "Standard_D4s_v3": 0.1586,
            "Standard_B2s": 0.0283,
        }
        hourly = sku_hourly.get(sku, 0.0793)
        storage_mb = _u(usage, "storage_mb", config.get("storage_mb", 32768))
        storage_gb = storage_mb / 1024
        compute_cost = hourly * hours
        storage_cost = storage_gb * 0.115
        total = compute_cost + storage_cost
        return {
            "monthly_cost": round(total, 2),
            "description": f"PostgreSQL Flexible {sku} {hours:.0f} hrs · {storage_gb:.0f} GB",
            "note": "",
        }

    if ctype == "azure_mysql":
        hours = _u(usage, "hours_per_month", _DEFAULT_HOURS)
        sku = config.get("sku_name", "Standard_D2ds_v4")
        sku_hourly = {
            "Standard_D2ds_v4": 0.0793, "Standard_D4ds_v4": 0.1586,
            "Standard_B2s": 0.0283,
        }
        hourly = sku_hourly.get(sku, 0.0793)
        storage_gb = _u(usage, "storage_gb", config.get("storage_size_gb", 20))
        total = (hourly * hours) + (storage_gb * 0.115)
        return {
            "monthly_cost": round(total, 2),
            "description": f"MySQL Flexible {sku} {hours:.0f} hrs · {storage_gb:.0f} GB",
            "note": "",
        }

    if ctype == "azure_cosmosdb":
        ru_per_second = _u(usage, "provisioned_ru", 400)
        storage_gb = _u(usage, "storage_gb", 1)
        ru_cost = (ru_per_second / 100) * 0.008 * _DEFAULT_HOURS
        storage_cost = storage_gb * 0.25
        total = ru_cost + storage_cost
        return {
            "monthly_cost": round(total, 2),
            "description": f"Cosmos DB {ru_per_second:.0f} RU/s · {storage_gb:.0f} GB",
            "note": "Provisioned throughput (manual)",
        }

    if ctype == "azure_redis":
        hours = _u(usage, "hours_per_month", _DEFAULT_HOURS)
        sku = config.get("sku_name", "Standard")
        cap = config.get("capacity", 1)
        sku_hourly = {
            "Basic": {0: 0.022, 1: 0.022, 2: 0.044, 3: 0.088, 4: 0.176},
            "Standard": {0: 0.054, 1: 0.067, 2: 0.134, 3: 0.268, 4: 0.536},
            "Premium": {1: 0.323, 2: 0.646, 3: 1.292, 4: 2.585},
        }
        hourly = sku_hourly.get(sku, {}).get(int(cap), 0.067)
        total = hourly * hours
        return {
            "monthly_cost": round(total, 2),
            "description": f"Redis Cache {sku} C{int(cap)} {hours:.0f} hrs",
            "note": "",
        }

    # ── Security ──────────────────────────────────────────────────────────────

    if ctype == "azure_sentinel":
        log_gb = _u(usage, "log_gb_monthly", 5)
        total = log_gb * 2.46
        return {
            "monthly_cost": round(total, 2),
            "description": f"Microsoft Sentinel {log_gb:.0f} GB ingested",
            "note": "Billed via Log Analytics workspace",
        }

    # ── Integration ───────────────────────────────────────────────────────────

    if ctype == "azure_servicebus":
        operations_m = _u(usage, "operations_monthly", 1)
        sku = config.get("sku", "Standard")
        if sku == "Basic":
            total = operations_m * 0.05
        else:
            total = operations_m * 0.40
        return {
            "monthly_cost": round(total, 2),
            "description": f"Service Bus {sku} {operations_m:.1f}M operations",
            "note": "",
        }

    if ctype == "azure_eventhub":
        throughput_units = _u(usage, "throughput_units", 1)
        events_m = _u(usage, "events_monthly", 10)
        tu_cost = throughput_units * 10.84
        event_cost = (events_m / 1) * 0.028
        total = tu_cost + event_cost
        return {
            "monthly_cost": round(total, 2),
            "description": f"Event Hub {throughput_units:.0f} TU · {events_m:.0f}M events",
            "note": "Standard tier",
        }

    if ctype == "azure_logicapp":
        actions_k = _u(usage, "actions_monthly", 2_000)
        connector_calls_k = _u(usage, "connector_calls_monthly", 100)
        action_cost = (actions_k / 1000) * 0.025
        connector_cost = (connector_calls_k / 1000) * 0.125
        total = action_cost + connector_cost
        return {
            "monthly_cost": round(total, 2),
            "description": f"Logic App {actions_k:.0f}k actions · {connector_calls_k:.0f}k connector calls",
            "note": "Consumption plan",
        }

    if ctype == "azure_apim":
        sku = config.get("sku_name", "Developer")
        sku_monthly = {
            "Consumption": 0.0, "Developer": 50.0,
            "Basic": 140.0, "Standard": 700.0, "Premium": 2800.0,
        }
        calls_m = _u(usage, "calls_monthly", 1)
        base = sku_monthly.get(sku, 50.0)
        overage = max(0, calls_m - 0.5) * 3.50 if sku == "Consumption" else 0.0
        total = base + overage
        return {
            "monthly_cost": round(total, 2),
            "description": f"APIM {sku} {calls_m:.1f}M calls",
            "note": "",
        }

    # ── Analytics ─────────────────────────────────────────────────────────────

    if ctype == "azure_datafactory":
        pipeline_runs = _u(usage, "pipeline_runs_monthly", 1_000)
        data_movement_gb = _u(usage, "data_movement_gb", 10)
        run_cost = (pipeline_runs / 1000) * 1.00
        movement_cost = data_movement_gb * 0.25
        total = run_cost + movement_cost
        return {
            "monthly_cost": round(total, 2),
            "description": f"Data Factory {pipeline_runs:.0f} runs · {data_movement_gb:.0f} GB moved",
            "note": "",
        }

    if ctype == "azure_stream_analytics":
        streaming_units = _u(usage, "streaming_units", config.get("streaming_units", 3))
        hours = _u(usage, "hours_per_month", _DEFAULT_HOURS)
        total = streaming_units * 0.11 * hours
        return {
            "monthly_cost": round(total, 2),
            "description": f"Stream Analytics {streaming_units:.0f} SU · {hours:.0f} hrs",
            "note": "",
        }

    # ── AI / ML ───────────────────────────────────────────────────────────────

    if ctype == "azure_openai":
        input_m = _u(usage, "input_tokens_monthly", 1)
        output_m = _u(usage, "output_tokens_monthly", 0.5)
        model = config.get("deployment_model", "gpt-4o")
        rates = {
            "gpt-4o": (5.00, 15.00),
            "gpt-4o-mini": (0.15, 0.60),
            "gpt-4": (30.00, 60.00),
            "gpt-35-turbo": (0.50, 1.50),
            "text-embedding-ada-002": (0.10, 0.10),
        }
        in_rate, out_rate = rates.get(model, rates["gpt-4o"])
        total = (input_m * in_rate) + (output_m * out_rate)
        return {
            "monthly_cost": round(total, 2),
            "description": f"Azure OpenAI {model} {input_m:.1f}M in · {output_m:.1f}M out tokens",
            "note": "Pay-as-you-go token pricing",
        }

    if ctype == "azure_search":
        sku = config.get("sku", "basic")
        sku_hourly = {
            "free": 0.0, "basic": 0.101, "standard": 0.336,
            "standard2": 0.672, "standard3": 1.344,
        }
        hourly = sku_hourly.get(sku, 0.101)
        replicas = _u(usage, "replicas", config.get("replica_count", 1))
        hours = _u(usage, "hours_per_month", _DEFAULT_HOURS)
        total = hourly * replicas * hours
        return {
            "monthly_cost": round(total, 2),
            "description": f"AI Search {sku} ×{replicas:.0f} replicas · {hours:.0f} hrs",
            "note": "",
        }

    # ── Monitoring ────────────────────────────────────────────────────────────

    if ctype == "azure_log_analytics":
        log_gb = _u(usage, "log_gb_monthly", 5)
        total = log_gb * 2.30
        return {
            "monthly_cost": round(total, 2),
            "description": f"Log Analytics {log_gb:.0f} GB ingested (PerGB2018)",
            "note": "First 5 GB/day free",
        }

    if ctype == "azure_app_insights":
        log_gb = _u(usage, "log_gb_monthly", 5)
        total = log_gb * 2.30
        return {
            "monthly_cost": round(total, 2),
            "description": f"Application Insights {log_gb:.0f} GB ingested",
            "note": "First 5 GB/day free",
        }

    if ctype == "azure_monitor":
        metrics = _u(usage, "custom_metrics", 10)
        alert_rules = _u(usage, "alert_rule_count", 5)
        metric_cost = max(0, metrics - 10) * 0.25
        alert_cost = alert_rules * 0.10
        total = metric_cost + alert_cost
        return {
            "monthly_cost": round(total, 2),
            "description": f"Azure Monitor {metrics:.0f} metrics · {alert_rules:.0f} alert rules",
            "note": "First 10 custom metrics free",
        }

    return None
