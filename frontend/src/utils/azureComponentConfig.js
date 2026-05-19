export const AZURE_COMPONENT_CONFIGS = {
  // ── Networking ────────────────────────────────────────────────────────────
  azure_vnet: [
    { key: "address_space", label: "Address Space", type: "text", default: "10.0.0.0/16", basic: true },
    { key: "location", label: "Location", type: "text", default: "East US", basic: true },
    { key: "dns_servers", label: "DNS Servers", type: "text", default: "" },
  ],
  azure_subnet: [
    { key: "address_prefix", label: "Address Prefix", type: "text", default: "10.0.1.0/24", basic: true },
    { key: "service_endpoints", label: "Service Endpoints", type: "text", default: "" },
  ],
  azure_nsg: [
    { key: "location", label: "Location", type: "text", default: "East US", basic: true },
  ],
  azure_agw: [
    { key: "sku_name", label: "SKU", type: "select", options: ["Standard_v2", "WAF_v2"], default: "Standard_v2", basic: true },
    { key: "capacity", label: "Capacity", type: "number", default: 2, basic: true },
  ],
  azure_lb: [
    { key: "sku", label: "SKU", type: "select", options: ["Basic", "Standard"], default: "Standard", basic: true },
  ],
  azure_frontdoor: [
    { key: "sku_name", label: "SKU", type: "select", options: ["Standard_AzureFrontDoor", "Premium_AzureFrontDoor"], default: "Standard_AzureFrontDoor", basic: true },
  ],
  azure_dns: [
    { key: "zone_type", label: "Zone Type", type: "select", options: ["Public", "Private"], default: "Public", basic: true },
  ],
  azure_nat_gw: [
    { key: "idle_timeout_in_minutes", label: "Idle Timeout (min)", type: "number", default: 10, basic: true },
  ],
  azure_vpn_gateway: [
    { key: "sku", label: "SKU", type: "select", options: ["Basic", "VpnGw1", "VpnGw2", "VpnGw3"], default: "VpnGw1", basic: true },
    { key: "vpn_type", label: "VPN Type", type: "select", options: ["RouteBased", "PolicyBased"], default: "RouteBased", basic: true },
    { key: "active_active", label: "Active-Active", type: "boolean", default: false },
  ],
  azure_expressroute: [
    { key: "sku_tier", label: "Tier", type: "select", options: ["Standard", "Premium"], default: "Standard", basic: true },
    { key: "sku_family", label: "Billing Model", type: "select", options: ["MeteredData", "UnlimitedData"], default: "MeteredData", basic: true },
    { key: "bandwidth_in_mbps", label: "Bandwidth (Mbps)", type: "select", options: ["50", "100", "200", "500", "1000", "2000", "5000", "10000"], default: "1000", basic: true },
  ],
  azure_traffic_mgr: [
    { key: "traffic_routing_method", label: "Routing Method", type: "select", options: ["Performance", "Weighted", "Priority", "Geographic", "Multivalue", "Subnet"], default: "Performance", basic: true },
    { key: "dns_config_ttl", label: "DNS TTL (sec)", type: "number", default: 30 },
  ],
  azure_bastion: [
    { key: "sku", label: "SKU", type: "select", options: ["Basic", "Standard"], default: "Basic", basic: true },
  ],
  azure_private_endpoint: [
    { key: "subresource_names", label: "Sub-resource", type: "text", default: "blob", basic: true },
  ],
  azure_firewall: [
    { key: "sku_name", label: "SKU Name", type: "select", options: ["AZFW_VNet", "AZFW_Hub"], default: "AZFW_VNet", basic: true },
    { key: "sku_tier", label: "SKU Tier", type: "select", options: ["Standard", "Premium", "Basic"], default: "Standard", basic: true },
    { key: "threat_intel_mode", label: "Threat Intel", type: "select", options: ["Off", "Alert", "Deny"], default: "Alert" },
  ],
  azure_ddos: [
    { key: "sku", label: "SKU", type: "select", options: ["Basic", "Standard"], default: "Standard", basic: true },
  ],

  // ── Compute ───────────────────────────────────────────────────────────────
  azure_vm: [
    { key: "size", label: "VM Size", type: "select", options: ["Standard_B2s", "Standard_D2s_v3", "Standard_D4s_v3", "Standard_F4s_v2", "Standard_E4s_v3", "Standard_L8s_v3"], default: "Standard_B2s", basic: true },
    { key: "os_type", label: "OS Type", type: "select", options: ["Linux", "Windows"], default: "Linux", basic: true },
    { key: "admin_username", label: "Admin Username", type: "text", default: "adminuser", basic: true },
    { key: "disable_password_authentication", label: "SSH Key Only", type: "boolean", default: true },
  ],
  azure_vmss: [
    { key: "sku_name", label: "VM Size", type: "text", default: "Standard_D2s_v3", basic: true },
    { key: "instances", label: "Instance Count", type: "number", default: 2, basic: true },
    { key: "upgrade_mode", label: "Upgrade Mode", type: "select", options: ["Automatic", "Manual", "Rolling"], default: "Manual" },
  ],
  azure_aks: [
    { key: "kubernetes_version", label: "K8s Version", type: "text", default: "1.29", basic: true },
    { key: "node_count", label: "Node Count", type: "number", default: 3, basic: true },
    { key: "vm_size", label: "Node VM Size", type: "text", default: "Standard_D2s_v3", basic: true },
    { key: "network_plugin", label: "Network Plugin", type: "select", options: ["azure", "kubenet"], default: "azure" },
  ],
  azure_functions: [
    { key: "os_type", label: "OS", type: "select", options: ["Linux", "Windows"], default: "Linux", basic: true },
    { key: "sku_tier", label: "SKU Tier", type: "select", options: ["Consumption", "Premium", "Dedicated"], default: "Consumption", basic: true },
    { key: "runtime", label: "Runtime", type: "select", options: ["python", "node", "dotnet", "java"], default: "python", basic: true },
  ],
  azure_aci: [
    { key: "cpu", label: "CPU Cores", type: "number", default: 1, basic: true },
    { key: "memory", label: "Memory (GB)", type: "number", default: 1.5, basic: true },
    { key: "os_type", label: "OS", type: "select", options: ["Linux", "Windows"], default: "Linux", basic: true },
  ],
  azure_app_service: [
    { key: "sku_name", label: "SKU", type: "select", options: ["F1", "B1", "B2", "S1", "P1v3", "P2v3"], default: "B1", basic: true },
    { key: "os_type", label: "OS", type: "select", options: ["Linux", "Windows"], default: "Linux", basic: true },
  ],
  azure_container_apps: [
    { key: "cpu", label: "CPU Cores", type: "number", default: 0.5, basic: true },
    { key: "memory", label: "Memory (GiB)", type: "text", default: "1.0Gi", basic: true },
    { key: "min_replicas", label: "Min Replicas", type: "number", default: 0, basic: true },
    { key: "max_replicas", label: "Max Replicas", type: "number", default: 10 },
  ],
  azure_batch: [
    { key: "pool_allocation_mode", label: "Allocation Mode", type: "select", options: ["BatchService", "UserSubscription"], default: "BatchService", basic: true },
    { key: "vm_size", label: "VM Size", type: "text", default: "Standard_D2s_v3", basic: true },
    { key: "node_count", label: "Dedicated Nodes", type: "number", default: 2, basic: true },
  ],
  azure_spring_apps: [
    { key: "sku_name", label: "SKU", type: "select", options: ["B0", "S0", "E0"], default: "S0", basic: true },
  ],
  azure_static_web: [
    { key: "sku_tier", label: "SKU", type: "select", options: ["Free", "Standard"], default: "Free", basic: true },
  ],
  azure_acr: [
    { key: "sku", label: "SKU", type: "select", options: ["Basic", "Standard", "Premium"], default: "Standard", basic: true },
    { key: "admin_enabled", label: "Admin Enabled", type: "boolean", default: false },
    { key: "geo_replication_locations", label: "Geo-Replication", type: "text", default: "" },
  ],

  // ── Storage ───────────────────────────────────────────────────────────────
  azure_blob: [
    { key: "account_tier", label: "Account Tier", type: "select", options: ["Standard", "Premium"], default: "Standard", basic: true },
    { key: "replication_type", label: "Replication", type: "select", options: ["LRS", "GRS", "ZRS", "RAGRS"], default: "LRS", basic: true },
    { key: "access_tier", label: "Access Tier", type: "select", options: ["Hot", "Cool", "Archive"], default: "Hot", basic: true },
  ],
  azure_files: [
    { key: "account_tier", label: "Tier", type: "select", options: ["Standard", "Premium"], default: "Standard", basic: true },
    { key: "quota", label: "Quota (GB)", type: "number", default: 100, basic: true },
  ],
  azure_disk: [
    { key: "storage_account_type", label: "Disk Type", type: "select", options: ["Standard_LRS", "StandardSSD_LRS", "Premium_LRS", "UltraSSD_LRS"], default: "StandardSSD_LRS", basic: true },
    { key: "disk_size_gb", label: "Size (GB)", type: "number", default: 128, basic: true },
  ],
  azure_table: [
    { key: "account_replication_type", label: "Replication", type: "select", options: ["LRS", "GRS", "ZRS"], default: "LRS", basic: true },
  ],
  azure_queue: [
    { key: "account_replication_type", label: "Replication", type: "select", options: ["LRS", "GRS", "ZRS"], default: "LRS", basic: true },
  ],
  azure_datalake: [
    { key: "account_tier", label: "Tier", type: "select", options: ["Standard", "Premium"], default: "Standard", basic: true },
    { key: "replication_type", label: "Replication", type: "select", options: ["LRS", "GRS", "ZRS", "RAGRS"], default: "LRS", basic: true },
    { key: "access_tier", label: "Default Access Tier", type: "select", options: ["Hot", "Cool"], default: "Hot", basic: true },
  ],
  azure_backup: [
    { key: "sku", label: "Vault SKU", type: "select", options: ["Standard"], default: "Standard", basic: true },
    { key: "soft_delete_enabled", label: "Soft Delete", type: "boolean", default: true, basic: true },
  ],

  // ── Database ──────────────────────────────────────────────────────────────
  azure_sql: [
    { key: "sku_name", label: "SKU", type: "select", options: ["Basic", "S0", "S1", "P1", "GP_Gen5_2"], default: "S0", basic: true },
    { key: "max_size_gb", label: "Max Size (GB)", type: "number", default: 32, basic: true },
    { key: "zone_redundant", label: "Zone Redundant", type: "boolean", default: false },
  ],
  azure_cosmosdb: [
    { key: "offer_type", label: "Offer Type", type: "select", options: ["Standard"], default: "Standard", basic: true },
    { key: "consistency_level", label: "Consistency", type: "select", options: ["Strong", "BoundedStaleness", "Session", "ConsistentPrefix", "Eventual"], default: "Session", basic: true },
    { key: "geo_redundant", label: "Geo-Redundant", type: "boolean", default: false },
  ],
  azure_redis: [
    { key: "family", label: "Family", type: "select", options: ["C", "P"], default: "C", basic: true },
    { key: "sku_name", label: "SKU", type: "select", options: ["Basic", "Standard", "Premium"], default: "Standard", basic: true },
    { key: "capacity", label: "Capacity", type: "number", default: 1, basic: true },
  ],
  azure_postgres: [
    { key: "sku_name", label: "SKU", type: "text", default: "Standard_D2s_v3", basic: true },
    { key: "storage_mb", label: "Storage (MB)", type: "number", default: 32768, basic: true },
    { key: "version", label: "PG Version", type: "select", options: ["13", "14", "15", "16"], default: "15", basic: true },
  ],
  azure_mysql: [
    { key: "sku_name", label: "SKU", type: "text", default: "Standard_D2ds_v4", basic: true },
    { key: "storage_size_gb", label: "Storage (GB)", type: "number", default: 20, basic: true },
    { key: "version", label: "Version", type: "select", options: ["5.7", "8.0.21"], default: "8.0.21", basic: true },
    { key: "backup_retention_days", label: "Backup Retention (days)", type: "number", default: 7 },
  ],
  azure_mariadb: [
    { key: "sku_name", label: "SKU", type: "select", options: ["B_Gen5_1", "B_Gen5_2", "GP_Gen5_2", "GP_Gen5_4"], default: "GP_Gen5_2", basic: true },
    { key: "storage_mb", label: "Storage (MB)", type: "number", default: 51200, basic: true },
    { key: "version", label: "Version", type: "select", options: ["10.2", "10.3"], default: "10.3", basic: true },
  ],
  azure_synapse: [
    { key: "sql_administrator_login", label: "Admin Login", type: "text", default: "sqladminuser", basic: true },
    { key: "data_lake_storage_account_name", label: "Storage Account", type: "text", default: "", basic: true },
    { key: "sku_name", label: "DWU", type: "select", options: ["DW100c", "DW200c", "DW500c", "DW1000c"], default: "DW100c" },
  ],
  azure_managed_instance: [
    { key: "sku_name", label: "SKU", type: "select", options: ["GP_Gen5", "BC_Gen5"], default: "GP_Gen5", basic: true },
    { key: "vcores", label: "vCores", type: "select", options: ["4", "8", "16", "24", "32"], default: "4", basic: true },
    { key: "storage_size_in_gb", label: "Storage (GB)", type: "number", default: 32, basic: true },
    { key: "license_type", label: "License Type", type: "select", options: ["LicenseIncluded", "BasePrice"], default: "LicenseIncluded" },
  ],

  // ── Security ──────────────────────────────────────────────────────────────
  azure_keyvault: [
    { key: "sku_name", label: "SKU", type: "select", options: ["standard", "premium"], default: "standard", basic: true },
    { key: "purge_protection", label: "Purge Protection", type: "boolean", default: true, basic: true },
    { key: "soft_delete_retention_days", label: "Soft Delete Days", type: "number", default: 90 },
  ],
  azure_aad: [],
  azure_waf: [
    { key: "mode", label: "Mode", type: "select", options: ["Detection", "Prevention"], default: "Prevention", basic: true },
  ],
  azure_defender: [
    { key: "resource_type", label: "Resource Type", type: "select", options: ["Servers", "SqlServers", "AppServices", "StorageAccounts", "Containers", "KeyVaults", "Arm", "Dns"], default: "Servers", basic: true },
    { key: "tier", label: "Tier", type: "select", options: ["Free", "Standard"], default: "Standard", basic: true },
  ],
  azure_sentinel: [
    { key: "daily_quota_gb", label: "Daily Quota (GB)", type: "number", default: -1, basic: true },
  ],
  azure_managed_id: [
    { key: "identity_type", label: "Type", type: "select", options: ["SystemAssigned", "UserAssigned", "SystemAssigned, UserAssigned"], default: "SystemAssigned", basic: true },
  ],
  azure_policy: [
    { key: "enforcement_mode", label: "Enforcement Mode", type: "select", options: ["Default", "DoNotEnforce"], default: "Default", basic: true },
  ],

  // ── Integration ───────────────────────────────────────────────────────────
  azure_servicebus: [
    { key: "sku", label: "SKU", type: "select", options: ["Basic", "Standard", "Premium"], default: "Standard", basic: true },
  ],
  azure_eventhub: [
    { key: "partition_count", label: "Partition Count", type: "number", default: 4, basic: true },
    { key: "message_retention", label: "Retention (days)", type: "number", default: 7, basic: true },
    { key: "sku", label: "SKU", type: "select", options: ["Basic", "Standard", "Premium"], default: "Standard", basic: true },
  ],
  azure_logicapp: [
    { key: "type", label: "Type", type: "select", options: ["Consumption", "Standard"], default: "Consumption", basic: true },
  ],
  azure_apim: [
    { key: "sku_name", label: "SKU", type: "select", options: ["Consumption", "Developer", "Basic", "Standard", "Premium"], default: "Developer", basic: true },
    { key: "publisher_name", label: "Publisher Name", type: "text", default: "My Org", basic: true },
    { key: "publisher_email", label: "Publisher Email", type: "text", default: "admin@example.com", basic: true },
  ],
  azure_signalr: [
    { key: "sku_name", label: "SKU", type: "select", options: ["Free_F1", "Standard_S1", "Premium_P1"], default: "Standard_S1", basic: true },
    { key: "capacity", label: "Capacity (units)", type: "number", default: 1, basic: true },
    { key: "service_mode", label: "Service Mode", type: "select", options: ["Default", "Serverless", "Classic"], default: "Default" },
  ],
  azure_notification_hub: [
    { key: "sku_name", label: "SKU", type: "select", options: ["Free", "Basic", "Standard"], default: "Basic", basic: true },
  ],

  // ── Analytics ─────────────────────────────────────────────────────────────
  azure_datafactory: [
    { key: "identity_type", label: "Identity", type: "select", options: ["SystemAssigned", "UserAssigned"], default: "SystemAssigned", basic: true },
    { key: "managed_virtual_network_enabled", label: "Managed VNet", type: "boolean", default: false },
  ],
  azure_stream_analytics: [
    { key: "compatibility_level", label: "Compatibility", type: "select", options: ["1.0", "1.1", "1.2"], default: "1.2", basic: true },
    { key: "streaming_units", label: "Streaming Units", type: "number", default: 3, basic: true },
  ],
  azure_databricks: [
    { key: "sku", label: "SKU", type: "select", options: ["standard", "premium", "trial"], default: "premium", basic: true },
  ],
  azure_hdinsight: [
    { key: "cluster_kind", label: "Cluster Type", type: "select", options: ["hadoop", "hbase", "storm", "spark", "kafka"], default: "spark", basic: true },
    { key: "tier", label: "Tier", type: "select", options: ["Standard", "Premium"], default: "Standard", basic: true },
    { key: "head_node_vm_size", label: "Head Node VM", type: "text", default: "Standard_D3_v2", basic: true },
    { key: "worker_count", label: "Worker Count", type: "number", default: 2, basic: true },
    { key: "worker_vm_size", label: "Worker VM", type: "text", default: "Standard_D3_v2", basic: true },
  ],
  azure_purview: [
    { key: "managed_resource_group_name", label: "Managed RG Name", type: "text", default: "purview-managed-rg", basic: true },
  ],

  // ── AI / ML ───────────────────────────────────────────────────────────────
  azure_openai: [
    { key: "sku_name", label: "SKU", type: "select", options: ["S0"], default: "S0", basic: true },
    { key: "deployment_model", label: "Model", type: "select", options: ["gpt-4o", "gpt-4o-mini", "gpt-4", "gpt-35-turbo", "text-embedding-ada-002"], default: "gpt-4o", basic: true },
    { key: "capacity", label: "TPM Capacity (thousands)", type: "number", default: 30, basic: true },
  ],
  azure_cognitive: [
    { key: "kind", label: "Service Kind", type: "select", options: ["ComputerVision", "Face", "FormRecognizer", "SpeechServices", "TextAnalytics", "Translator"], default: "TextAnalytics", basic: true },
    { key: "sku_name", label: "SKU", type: "select", options: ["F0", "S0", "S1", "S2", "S3"], default: "S0", basic: true },
  ],
  azure_ml: [
    { key: "sku_name", label: "SKU", type: "select", options: ["Basic", "Enterprise"], default: "Basic", basic: true },
    { key: "compute_type", label: "Compute Type", type: "select", options: ["AmlCompute", "ComputeInstance"], default: "AmlCompute", basic: true },
    { key: "vm_size", label: "VM Size", type: "text", default: "Standard_DS3_v2", basic: true },
    { key: "min_nodes", label: "Min Nodes", type: "number", default: 0 },
    { key: "max_nodes", label: "Max Nodes", type: "number", default: 4, basic: true },
  ],
  azure_bot: [
    { key: "sku", label: "SKU", type: "select", options: ["F0", "S1"], default: "S1", basic: true },
    { key: "microsoft_app_id", label: "App ID", type: "text", default: "", basic: true },
  ],
  azure_search: [
    { key: "sku", label: "SKU", type: "select", options: ["free", "basic", "standard", "standard2", "standard3"], default: "basic", basic: true },
    { key: "replica_count", label: "Replicas", type: "number", default: 1, basic: true },
    { key: "partition_count", label: "Partitions", type: "number", default: 1 },
  ],

  // ── Monitoring ────────────────────────────────────────────────────────────
  azure_monitor: [
    { key: "retention_in_days", label: "Metric Retention (days)", type: "number", default: 93, basic: true },
  ],
  azure_app_insights: [
    { key: "application_type", label: "App Type", type: "select", options: ["web", "other", "ios", "java", "MobileCenter", "Node.JS", "phone", "store"], default: "web", basic: true },
    { key: "daily_data_cap_in_gb", label: "Daily Cap (GB)", type: "number", default: 1, basic: true },
    { key: "retention_in_days", label: "Retention (days)", type: "number", default: 90 },
  ],
  azure_log_analytics: [
    { key: "sku", label: "SKU", type: "select", options: ["PerGB2018", "Free", "CapacityReservation"], default: "PerGB2018", basic: true },
    { key: "retention_in_days", label: "Retention (days)", type: "number", default: 30, basic: true },
    { key: "daily_quota_gb", label: "Daily Quota (GB)", type: "number", default: -1 },
  ],

  // ── DevOps ────────────────────────────────────────────────────────────────
  azure_devops: [
    { key: "org_name", label: "Org Name", type: "text", default: "my-org", basic: true },
    { key: "project_name", label: "Project Name", type: "text", default: "my-project", basic: true },
    { key: "version_control_type", label: "Version Control", type: "select", options: ["Git", "Tfvc"], default: "Git", basic: true },
  ],
};

export function getAzureDefaultConfig(componentType) {
  const fields = AZURE_COMPONENT_CONFIGS[componentType] ?? [];
  return Object.fromEntries(fields.map((f) => [f.key, f.default ?? ""]));
}
