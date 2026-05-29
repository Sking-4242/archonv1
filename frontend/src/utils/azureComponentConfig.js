export const AZURE_COMPONENT_CONFIGS = {
  // ── Networking ────────────────────────────────────────────────────────────
  azure_vnet: [
    { key: "address_space", label: "Address Space", type: "text", default: "10.0.0.0/16", basic: true },
    { key: "location", label: "Location", type: "text", default: "East US", basic: true },
    { key: "dns_servers", label: "DNS Servers", type: "text", default: "" },
    { key: "bgp_community", label: "BGP Community", type: "text", default: "" },
  ],
  azure_subnet: [
    { key: "address_prefix", label: "Address Prefix", type: "text", default: "10.0.1.0/24", basic: true },
    { key: "service_endpoints", label: "Service Endpoints", type: "text", default: "" },
    { key: "private_endpoint_network_policies", label: "Private Endpoint Policies", type: "select", options: ["Disabled", "Enabled"], default: "Disabled" },
    { key: "service_delegation", label: "Service Delegation", type: "text", default: "" },
    { key: "route_table_association", label: "Route Table Linked", type: "boolean", default: false },
  ],
  azure_nsg: [
    { key: "location", label: "Location", type: "text", default: "East US", basic: true },
    { key: "default_deny_all_inbound", label: "Default Deny All Inbound", type: "boolean", default: true, basic: true },
    { key: "flow_logs_enabled", label: "Flow Logs", type: "boolean", default: true },
    { key: "flow_log_retention_days", label: "Flow Log Retention (days)", type: "number", default: 7 },
  ],
  azure_agw: [
    { key: "sku_name", label: "SKU", type: "select", options: ["Standard_v2", "WAF_v2"], default: "Standard_v2", basic: true },
    { key: "tier", label: "Tier", type: "select", options: ["Standard_v2", "WAF_v2"], default: "Standard_v2", basic: true },
    { key: "capacity", label: "Capacity", type: "number", default: 2, basic: true },
    { key: "waf_enabled", label: "WAF Enabled", type: "boolean", default: false },
    { key: "min_capacity", label: "Min Autoscale Capacity", type: "number", default: 1 },
  ],
  azure_lb: [
    { key: "sku", label: "SKU", type: "select", options: ["Basic", "Standard"], default: "Standard", basic: true },
    { key: "frontend_ip_config_name", label: "Frontend IP Config Name", type: "text", default: "frontend-ipconfig", basic: true },
    { key: "probe_protocol", label: "Health Probe Protocol", type: "select", options: ["Http", "Https", "Tcp"], default: "Https" },
    { key: "load_distribution", label: "Load Distribution", type: "select", options: ["Default", "SourceIP", "SourceIPProtocol"], default: "Default" },
  ],
  azure_frontdoor: [
    { key: "sku_name", label: "SKU", type: "select", options: ["Standard_AzureFrontDoor", "Premium_AzureFrontDoor"], default: "Standard_AzureFrontDoor", basic: true },
    { key: "caching_enabled", label: "Caching", type: "boolean", default: true, basic: true },
    { key: "waf_policy_enabled", label: "WAF Policy", type: "boolean", default: false },
    { key: "health_probe_path", label: "Health Probe Path", type: "text", default: "/health" },
  ],
  azure_dns: [
    { key: "zone_type", label: "Zone Type", type: "select", options: ["Public", "Private"], default: "Public", basic: true },
    { key: "ttl", label: "Default TTL (sec)", type: "number", default: 300, basic: true },
    { key: "soa_record_email", label: "SOA Email", type: "text", default: "admin.example.com" },
    { key: "registration_virtual_network_link", label: "Auto-registration VNet", type: "boolean", default: false },
  ],
  azure_nat_gw: [
    { key: "idle_timeout_in_minutes", label: "Idle Timeout (min)", type: "number", default: 10, basic: true },
    { key: "sku_name", label: "SKU", type: "select", options: ["Standard"], default: "Standard", basic: true },
    { key: "zones", label: "Availability Zones", type: "text", default: "1" },
    { key: "public_ip_count", label: "Public IP Count", type: "number", default: 1 },
  ],
  azure_vpn_gateway: [
    { key: "sku", label: "SKU", type: "select", options: ["Basic", "VpnGw1", "VpnGw2", "VpnGw3"], default: "VpnGw1", basic: true },
    { key: "vpn_type", label: "VPN Type", type: "select", options: ["RouteBased", "PolicyBased"], default: "RouteBased", basic: true },
    { key: "active_active", label: "Active-Active", type: "boolean", default: false },
    { key: "bgp_enabled", label: "BGP Enabled", type: "boolean", default: false },
  ],
  azure_expressroute: [
    { key: "sku_tier", label: "Tier", type: "select", options: ["Standard", "Premium"], default: "Standard", basic: true },
    { key: "sku_family", label: "Billing Model", type: "select", options: ["MeteredData", "UnlimitedData"], default: "MeteredData", basic: true },
    { key: "bandwidth_in_mbps", label: "Bandwidth (Mbps)", type: "select", options: ["50", "100", "200", "500", "1000", "2000", "5000", "10000"], default: "1000", basic: true },
    { key: "peering_type", label: "Peering Type", type: "select", options: ["AzurePrivatePeering", "MicrosoftPeering"], default: "AzurePrivatePeering" },
  ],
  azure_traffic_mgr: [
    { key: "traffic_routing_method", label: "Routing Method", type: "select", options: ["Performance", "Weighted", "Priority", "Geographic", "Multivalue", "Subnet"], default: "Performance", basic: true },
    { key: "dns_config_ttl", label: "DNS TTL (sec)", type: "number", default: 30 },
    { key: "monitor_protocol", label: "Monitor Protocol", type: "select", options: ["HTTP", "HTTPS", "TCP"], default: "HTTPS" },
    { key: "monitor_path", label: "Monitor Path", type: "text", default: "/health" },
  ],
  azure_bastion: [
    { key: "sku", label: "SKU", type: "select", options: ["Basic", "Standard"], default: "Basic", basic: true },
    { key: "tunneling_enabled", label: "Tunneling", type: "boolean", default: false },
    { key: "ip_connect_enabled", label: "IP-based Connection", type: "boolean", default: false },
    { key: "copy_paste_enabled", label: "Copy/Paste", type: "boolean", default: true },
  ],
  azure_private_endpoint: [
    { key: "subresource_names", label: "Sub-resource", type: "text", default: "blob", basic: true },
    { key: "is_manual_connection", label: "Manual Approval", type: "boolean", default: false, basic: true },
    { key: "request_message", label: "Request Message", type: "text", default: "" },
    { key: "private_dns_zone_link", label: "Private DNS Zone Link", type: "boolean", default: true },
  ],
  azure_firewall: [
    { key: "sku_name", label: "SKU Name", type: "select", options: ["AZFW_VNet", "AZFW_Hub"], default: "AZFW_VNet", basic: true },
    { key: "sku_tier", label: "SKU Tier", type: "select", options: ["Standard", "Premium", "Basic"], default: "Standard", basic: true },
    { key: "threat_intel_mode", label: "Threat Intel", type: "select", options: ["Off", "Alert", "Deny"], default: "Alert" },
    { key: "dns_proxy_enabled", label: "DNS Proxy", type: "boolean", default: false },
  ],
  azure_ddos: [
    { key: "sku", label: "SKU", type: "select", options: ["Basic", "Standard"], default: "Standard", basic: true },
    { key: "location", label: "Location", type: "text", default: "East US", basic: true },
    { key: "virtual_network_links", label: "VNet Links Count", type: "number", default: 1 },
  ],

  // ── Compute ───────────────────────────────────────────────────────────────
  azure_vm: [
    { key: "size", label: "VM Size", type: "select", options: ["Standard_B2s", "Standard_D2s_v3", "Standard_D4s_v3", "Standard_F4s_v2", "Standard_E4s_v3", "Standard_L8s_v3"], default: "Standard_B2s", basic: true },
    { key: "os_type", label: "OS Type", type: "select", options: ["Linux", "Windows"], default: "Linux", basic: true },
    { key: "admin_username", label: "Admin Username", type: "text", default: "adminuser", basic: true },
    { key: "disable_password_authentication", label: "SSH Key Only", type: "boolean", default: true },
    { key: "encryption_at_host_enabled", label: "Encryption at Host", type: "boolean", default: false },
  ],
  azure_vmss: [
    { key: "sku_name", label: "VM Size", type: "text", default: "Standard_D2s_v3", basic: true },
    { key: "instances", label: "Instance Count", type: "number", default: 2, basic: true },
    { key: "upgrade_mode", label: "Upgrade Mode", type: "select", options: ["Automatic", "Manual", "Rolling"], default: "Manual" },
    { key: "overprovision", label: "Overprovision", type: "boolean", default: true },
    { key: "terminate_notification_enabled", label: "Terminate Notification", type: "boolean", default: false },
  ],
  azure_aks: [
    { key: "kubernetes_version", label: "K8s Version", type: "text", default: "1.29", basic: true },
    { key: "node_count", label: "Node Count", type: "number", default: 3, basic: true },
    { key: "vm_size", label: "Node VM Size", type: "text", default: "Standard_D2s_v3", basic: true },
    { key: "network_plugin", label: "Network Plugin", type: "select", options: ["azure", "kubenet"], default: "azure" },
    { key: "role_based_access_control_enabled", label: "RBAC Enabled", type: "boolean", default: true, basic: true },
    { key: "oidc_issuer_enabled", label: "OIDC Issuer", type: "boolean", default: false },
  ],
  azure_functions: [
    { key: "os_type", label: "OS", type: "select", options: ["Linux", "Windows"], default: "Linux", basic: true },
    { key: "sku_tier", label: "SKU Tier", type: "select", options: ["Consumption", "Premium", "Dedicated"], default: "Consumption", basic: true },
    { key: "runtime", label: "Runtime", type: "select", options: ["python", "node", "dotnet", "java"], default: "python", basic: true },
    { key: "https_only", label: "HTTPS Only", type: "boolean", default: true, basic: true },
    { key: "runtime_version", label: "Runtime Version", type: "text", default: "3.11" },
  ],
  azure_aci: [
    { key: "cpu", label: "CPU Cores", type: "number", default: 1, basic: true },
    { key: "memory", label: "Memory (GB)", type: "number", default: 1.5, basic: true },
    { key: "os_type", label: "OS", type: "select", options: ["Linux", "Windows"], default: "Linux", basic: true },
    { key: "restart_policy", label: "Restart Policy", type: "select", options: ["Always", "OnFailure", "Never"], default: "OnFailure" },
  ],
  azure_app_service: [
    { key: "sku_name", label: "SKU", type: "select", options: ["F1", "B1", "B2", "S1", "P1v3", "P2v3"], default: "B1", basic: true },
    { key: "os_type", label: "OS", type: "select", options: ["Linux", "Windows"], default: "Linux", basic: true },
    { key: "https_only", label: "HTTPS Only", type: "boolean", default: true, basic: true },
    { key: "ftps_state", label: "FTPS State", type: "select", options: ["Disabled", "FtpsOnly", "AllAllowed"], default: "FtpsOnly" },
    { key: "minimum_tls_version", label: "Min TLS Version", type: "select", options: ["1.0", "1.1", "1.2"], default: "1.2" },
  ],
  azure_container_apps: [
    { key: "cpu", label: "CPU Cores", type: "number", default: 0.5, basic: true },
    { key: "memory", label: "Memory (GiB)", type: "text", default: "1.0Gi", basic: true },
    { key: "min_replicas", label: "Min Replicas", type: "number", default: 0, basic: true },
    { key: "max_replicas", label: "Max Replicas", type: "number", default: 10 },
    { key: "ingress_external_enabled", label: "External Ingress", type: "boolean", default: true },
  ],
  azure_batch: [
    { key: "pool_allocation_mode", label: "Allocation Mode", type: "select", options: ["BatchService", "UserSubscription"], default: "BatchService", basic: true },
    { key: "vm_size", label: "VM Size", type: "text", default: "Standard_D2s_v3", basic: true },
    { key: "node_count", label: "Dedicated Nodes", type: "number", default: 2, basic: true },
    { key: "auto_scale_enabled", label: "Auto Scale", type: "boolean", default: false },
  ],
  azure_spring_apps: [
    { key: "sku_name", label: "SKU", type: "select", options: ["B0", "S0", "E0"], default: "S0", basic: true },
    { key: "build_agent_pool_size", label: "Build Agent Pool", type: "select", options: ["S1", "S2", "S3", "S4", "S5"], default: "S1" },
    { key: "service_registry_enabled", label: "Service Registry", type: "boolean", default: true },
    { key: "log_streaming_enabled", label: "Log Streaming", type: "boolean", default: true },
  ],
  azure_static_web: [
    { key: "sku_tier", label: "SKU", type: "select", options: ["Free", "Standard"], default: "Free", basic: true },
    { key: "repository_url", label: "Repository URL", type: "text", default: "" },
    { key: "branch", label: "Branch", type: "text", default: "main" },
    { key: "app_location", label: "App Location", type: "text", default: "/" },
  ],
  azure_acr: [
    { key: "sku", label: "SKU", type: "select", options: ["Basic", "Standard", "Premium"], default: "Standard", basic: true },
    { key: "admin_enabled", label: "Admin Enabled", type: "boolean", default: false },
    { key: "geo_replication_locations", label: "Geo-Replication", type: "text", default: "" },
    { key: "zone_redundancy_enabled", label: "Zone Redundant", type: "boolean", default: false },
    { key: "public_network_access_enabled", label: "Public Network Access", type: "boolean", default: true },
  ],

  // ── Storage ───────────────────────────────────────────────────────────────
  azure_blob: [
    { key: "account_tier", label: "Account Tier", type: "select", options: ["Standard", "Premium"], default: "Standard", basic: true },
    { key: "replication_type", label: "Replication", type: "select", options: ["LRS", "GRS", "ZRS", "RAGRS"], default: "LRS", basic: true },
    { key: "access_tier", label: "Access Tier", type: "select", options: ["Hot", "Cool", "Archive"], default: "Hot", basic: true },
    { key: "https_traffic_only_enabled", label: "HTTPS Only", type: "boolean", default: true, basic: true },
    { key: "min_tls_version", label: "Min TLS Version", type: "select", options: ["TLS1_0", "TLS1_1", "TLS1_2"], default: "TLS1_2" },
  ],
  azure_files: [
    { key: "account_tier", label: "Tier", type: "select", options: ["Standard", "Premium"], default: "Standard", basic: true },
    { key: "quota", label: "Quota (GB)", type: "number", default: 100, basic: true },
    { key: "https_traffic_only_enabled", label: "HTTPS Only", type: "boolean", default: true, basic: true },
    { key: "min_tls_version", label: "Min TLS Version", type: "select", options: ["TLS1_0", "TLS1_1", "TLS1_2"], default: "TLS1_2" },
    { key: "large_file_share_enabled", label: "Large File Shares", type: "boolean", default: false },
  ],
  azure_disk: [
    { key: "storage_account_type", label: "Disk Type", type: "select", options: ["Standard_LRS", "StandardSSD_LRS", "Premium_LRS", "UltraSSD_LRS"], default: "StandardSSD_LRS", basic: true },
    { key: "disk_size_gb", label: "Size (GB)", type: "number", default: 128, basic: true },
    { key: "create_option", label: "Create Option", type: "select", options: ["Empty", "Import", "Copy", "FromImage"], default: "Empty", basic: true },
    { key: "encryption_type", label: "Encryption Type", type: "select", options: ["EncryptionAtRestWithPlatformKey", "EncryptionAtRestWithCustomerKey"], default: "EncryptionAtRestWithPlatformKey" },
  ],
  azure_table: [
    { key: "account_replication_type", label: "Replication", type: "select", options: ["LRS", "GRS", "ZRS"], default: "LRS", basic: true },
    { key: "https_traffic_only_enabled", label: "HTTPS Only", type: "boolean", default: true, basic: true },
    { key: "min_tls_version", label: "Min TLS Version", type: "select", options: ["TLS1_0", "TLS1_1", "TLS1_2"], default: "TLS1_2" },
    { key: "shared_access_key_enabled", label: "Shared Access Key", type: "boolean", default: true },
  ],
  azure_queue: [
    { key: "account_replication_type", label: "Replication", type: "select", options: ["LRS", "GRS", "ZRS"], default: "LRS", basic: true },
    { key: "https_traffic_only_enabled", label: "HTTPS Only", type: "boolean", default: true, basic: true },
    { key: "min_tls_version", label: "Min TLS Version", type: "select", options: ["TLS1_0", "TLS1_1", "TLS1_2"], default: "TLS1_2" },
    { key: "shared_access_key_enabled", label: "Shared Access Key", type: "boolean", default: true },
  ],
  azure_datalake: [
    { key: "account_tier", label: "Tier", type: "select", options: ["Standard", "Premium"], default: "Standard", basic: true },
    { key: "replication_type", label: "Replication", type: "select", options: ["LRS", "GRS", "ZRS", "RAGRS"], default: "LRS", basic: true },
    { key: "access_tier", label: "Default Access Tier", type: "select", options: ["Hot", "Cool"], default: "Hot", basic: true },
    { key: "hierarchical_namespace_enabled", label: "Hierarchical Namespace", type: "boolean", default: true, basic: true },
    { key: "https_traffic_only_enabled", label: "HTTPS Only", type: "boolean", default: true },
  ],
  azure_backup: [
    { key: "sku", label: "Vault SKU", type: "select", options: ["Standard"], default: "Standard", basic: true },
    { key: "soft_delete_enabled", label: "Soft Delete", type: "boolean", default: true, basic: true },
    { key: "cross_region_restore_enabled", label: "Cross-Region Restore", type: "boolean", default: false },
    { key: "storage_mode_type", label: "Storage Mode", type: "select", options: ["GeoRedundant", "LocallyRedundant", "ZoneRedundant"], default: "GeoRedundant" },
  ],

  // ── Database ──────────────────────────────────────────────────────────────
  azure_sql: [
    { key: "sku_name", label: "SKU", type: "select", options: ["Basic", "S0", "S1", "P1", "GP_Gen5_2"], default: "S0", basic: true },
    { key: "max_size_gb", label: "Max Size (GB)", type: "number", default: 32, basic: true },
    { key: "zone_redundant", label: "Zone Redundant", type: "boolean", default: false },
    { key: "auditing_enabled", label: "Auditing", type: "boolean", default: true, basic: true },
    { key: "tde_enabled", label: "Transparent Data Encryption", type: "boolean", default: true },
  ],
  azure_cosmosdb: [
    { key: "offer_type", label: "Offer Type", type: "select", options: ["Standard"], default: "Standard", basic: true },
    { key: "consistency_level", label: "Consistency", type: "select", options: ["Strong", "BoundedStaleness", "Session", "ConsistentPrefix", "Eventual"], default: "Session", basic: true },
    { key: "geo_redundant", label: "Geo-Redundant Backup", type: "boolean", default: false },
    { key: "public_network_access_enabled", label: "Public Network Access", type: "boolean", default: true },
    { key: "automatic_failover_enabled", label: "Automatic Failover", type: "boolean", default: false },
  ],
  azure_redis: [
    { key: "family", label: "Family", type: "select", options: ["C", "P"], default: "C", basic: true },
    { key: "sku_name", label: "SKU", type: "select", options: ["Basic", "Standard", "Premium"], default: "Standard", basic: true },
    { key: "capacity", label: "Capacity", type: "number", default: 1, basic: true },
    { key: "enable_non_ssl_port", label: "Non-SSL Port", type: "boolean", default: false, basic: true },
    { key: "minimum_tls_version", label: "Min TLS Version", type: "select", options: ["1.0", "1.1", "1.2"], default: "1.2" },
  ],
  azure_postgres: [
    { key: "sku_name", label: "SKU", type: "text", default: "Standard_D2s_v3", basic: true },
    { key: "storage_mb", label: "Storage (MB)", type: "number", default: 32768, basic: true },
    { key: "version", label: "PG Version", type: "select", options: ["13", "14", "15", "16"], default: "15", basic: true },
    { key: "ssl_enforcement_enabled", label: "SSL Enforcement", type: "boolean", default: true, basic: true },
    { key: "backup_retention_days", label: "Backup Retention (days)", type: "number", default: 7 },
  ],
  azure_mysql: [
    { key: "sku_name", label: "SKU", type: "text", default: "Standard_D2ds_v4", basic: true },
    { key: "storage_size_gb", label: "Storage (GB)", type: "number", default: 20, basic: true },
    { key: "version", label: "Version", type: "select", options: ["5.7", "8.0.21"], default: "8.0.21", basic: true },
    { key: "backup_retention_days", label: "Backup Retention (days)", type: "number", default: 7 },
    { key: "ssl_enforcement_enabled", label: "SSL Enforcement", type: "boolean", default: true, basic: true },
  ],
  azure_mariadb: [
    { key: "sku_name", label: "SKU", type: "select", options: ["B_Gen5_1", "B_Gen5_2", "GP_Gen5_2", "GP_Gen5_4"], default: "GP_Gen5_2", basic: true },
    { key: "storage_mb", label: "Storage (MB)", type: "number", default: 51200, basic: true },
    { key: "version", label: "Version", type: "select", options: ["10.2", "10.3"], default: "10.3", basic: true },
    { key: "ssl_enforcement_enabled", label: "SSL Enforcement", type: "boolean", default: true, basic: true },
    { key: "backup_retention_days", label: "Backup Retention (days)", type: "number", default: 7 },
  ],
  azure_synapse: [
    { key: "sql_administrator_login", label: "Admin Login", type: "text", default: "sqladminuser", basic: true },
    { key: "data_lake_storage_account_name", label: "Storage Account", type: "text", default: "", basic: true },
    { key: "sku_name", label: "DWU", type: "select", options: ["DW100c", "DW200c", "DW500c", "DW1000c"], default: "DW100c" },
    { key: "managed_virtual_network_enabled", label: "Managed VNet", type: "boolean", default: false },
    { key: "public_network_access_enabled", label: "Public Network Access", type: "boolean", default: true },
  ],
  azure_managed_instance: [
    { key: "sku_name", label: "SKU", type: "select", options: ["GP_Gen5", "BC_Gen5"], default: "GP_Gen5", basic: true },
    { key: "vcores", label: "vCores", type: "select", options: ["4", "8", "16", "24", "32"], default: "4", basic: true },
    { key: "storage_size_in_gb", label: "Storage (GB)", type: "number", default: 32, basic: true },
    { key: "license_type", label: "License Type", type: "select", options: ["LicenseIncluded", "BasePrice"], default: "LicenseIncluded" },
    { key: "public_data_endpoint_enabled", label: "Public Data Endpoint", type: "boolean", default: false },
  ],

  // ── Security ──────────────────────────────────────────────────────────────
  azure_keyvault: [
    { key: "sku_name", label: "SKU", type: "select", options: ["standard", "premium"], default: "standard", basic: true },
    { key: "purge_protection", label: "Purge Protection", type: "boolean", default: true, basic: true },
    { key: "soft_delete_retention_days", label: "Soft Delete Days", type: "number", default: 90 },
    { key: "network_acl_default_action", label: "Network ACL Default", type: "select", options: ["Allow", "Deny"], default: "Deny" },
    { key: "rbac_authorization_enabled", label: "RBAC Authorization", type: "boolean", default: true },
  ],
  azure_aad: [],
  azure_waf: [
    { key: "mode", label: "Mode", type: "select", options: ["Detection", "Prevention"], default: "Prevention", basic: true },
    { key: "sku_name", label: "SKU", type: "select", options: ["WAF_v2", "Standard_AzureFrontDoor", "Premium_AzureFrontDoor"], default: "WAF_v2", basic: true },
    { key: "rule_set_type", label: "Rule Set Type", type: "select", options: ["OWASP", "Microsoft_DefaultRuleSet"], default: "OWASP" },
    { key: "rule_set_version", label: "Rule Set Version", type: "select", options: ["3.0", "3.1", "3.2"], default: "3.2" },
  ],
  azure_defender: [
    { key: "resource_type", label: "Resource Type", type: "select", options: ["Servers", "SqlServers", "AppServices", "StorageAccounts", "Containers", "KeyVaults", "Arm", "Dns"], default: "Servers", basic: true },
    { key: "tier", label: "Tier", type: "select", options: ["Free", "Standard"], default: "Standard", basic: true },
    { key: "subplan", label: "Sub-plan", type: "select", options: ["MMA", "P1", "P2"], default: "P2" },
    { key: "mde_integration_enabled", label: "MDE Integration", type: "boolean", default: true },
  ],
  azure_sentinel: [
    { key: "daily_quota_gb", label: "Daily Quota (GB)", type: "number", default: -1, basic: true },
    { key: "retention_in_days", label: "Retention (days)", type: "number", default: 90, basic: true },
    { key: "customer_managed_key_enabled", label: "CMK Enabled", type: "boolean", default: false },
    { key: "data_connector_type", label: "Data Connector", type: "select", options: ["AzureActiveDirectory", "AzureSecurityCenter", "MicrosoftCloudAppSecurity", "None"], default: "AzureSecurityCenter" },
  ],
  azure_managed_id: [
    { key: "identity_type", label: "Type", type: "select", options: ["SystemAssigned", "UserAssigned", "SystemAssigned, UserAssigned"], default: "SystemAssigned", basic: true },
    { key: "resource_group_name", label: "Resource Group", type: "text", default: "" },
    { key: "federated_credentials_enabled", label: "Federated Credentials", type: "boolean", default: false },
  ],
  azure_policy: [
    { key: "enforcement_mode", label: "Enforcement Mode", type: "select", options: ["Default", "DoNotEnforce"], default: "Default", basic: true },
    { key: "policy_type", label: "Policy Type", type: "select", options: ["BuiltIn", "Custom", "Static"], default: "BuiltIn", basic: true },
    { key: "mode", label: "Mode", type: "select", options: ["All", "Indexed"], default: "All" },
    { key: "non_compliance_message", label: "Non-Compliance Message", type: "text", default: "" },
  ],

  // ── Integration ───────────────────────────────────────────────────────────
  azure_servicebus: [
    { key: "sku", label: "SKU", type: "select", options: ["Basic", "Standard", "Premium"], default: "Standard", basic: true },
    { key: "capacity", label: "Capacity (MU)", type: "number", default: 0 },
    { key: "zone_redundant", label: "Zone Redundant", type: "boolean", default: false },
    { key: "premium_messaging_partitions", label: "Premium Partitions", type: "number", default: 0 },
  ],
  azure_eventhub: [
    { key: "partition_count", label: "Partition Count", type: "number", default: 4, basic: true },
    { key: "message_retention", label: "Retention (days)", type: "number", default: 7, basic: true },
    { key: "sku", label: "SKU", type: "select", options: ["Basic", "Standard", "Premium"], default: "Standard", basic: true },
    { key: "capture_enabled", label: "Capture Enabled", type: "boolean", default: false },
    { key: "zone_redundant", label: "Zone Redundant", type: "boolean", default: false },
  ],
  azure_logicapp: [
    { key: "type", label: "Type", type: "select", options: ["Consumption", "Standard"], default: "Consumption", basic: true },
    { key: "sku_name", label: "SKU (Standard)", type: "select", options: ["WS1", "WS2", "WS3"], default: "WS1" },
    { key: "always_on", label: "Always On", type: "boolean", default: false },
    { key: "storage_account_required", label: "Storage Account Required", type: "boolean", default: true },
  ],
  azure_apim: [
    { key: "sku_name", label: "SKU", type: "select", options: ["Consumption", "Developer", "Basic", "Standard", "Premium"], default: "Developer", basic: true },
    { key: "publisher_name", label: "Publisher Name", type: "text", default: "My Org", basic: true },
    { key: "publisher_email", label: "Publisher Email", type: "text", default: "admin@example.com", basic: true },
    { key: "virtual_network_type", label: "VNet Type", type: "select", options: ["None", "External", "Internal"], default: "None" },
  ],
  azure_signalr: [
    { key: "sku_name", label: "SKU", type: "select", options: ["Free_F1", "Standard_S1", "Premium_P1"], default: "Standard_S1", basic: true },
    { key: "capacity", label: "Capacity (units)", type: "number", default: 1, basic: true },
    { key: "service_mode", label: "Service Mode", type: "select", options: ["Default", "Serverless", "Classic"], default: "Default" },
    { key: "cors_allowed_origins", label: "CORS Origins", type: "text", default: "*" },
    { key: "connectivity_logs_enabled", label: "Connectivity Logs", type: "boolean", default: false },
  ],
  azure_notification_hub: [
    { key: "sku_name", label: "SKU", type: "select", options: ["Free", "Basic", "Standard"], default: "Basic", basic: true },
    { key: "capacity", label: "Capacity", type: "number", default: 0 },
    { key: "location", label: "Location", type: "text", default: "East US" },
    { key: "apns_bundle_id", label: "APNS Bundle ID", type: "text", default: "" },
  ],

  // ── Analytics ─────────────────────────────────────────────────────────────
  azure_datafactory: [
    { key: "identity_type", label: "Identity", type: "select", options: ["SystemAssigned", "UserAssigned"], default: "SystemAssigned", basic: true },
    { key: "managed_virtual_network_enabled", label: "Managed VNet", type: "boolean", default: false },
    { key: "public_network_enabled", label: "Public Network Access", type: "boolean", default: true },
    { key: "git_integration_enabled", label: "Git Integration", type: "boolean", default: false },
    { key: "global_parameter_count", label: "Global Parameters", type: "number", default: 0 },
  ],
  azure_stream_analytics: [
    { key: "compatibility_level", label: "Compatibility", type: "select", options: ["1.0", "1.1", "1.2"], default: "1.2", basic: true },
    { key: "streaming_units", label: "Streaming Units", type: "number", default: 3, basic: true },
    { key: "job_type", label: "Job Type", type: "select", options: ["Cloud", "Edge"], default: "Cloud" },
    { key: "out_of_order_policy", label: "Out-of-Order Policy", type: "select", options: ["Adjust", "Drop"], default: "Adjust" },
  ],
  azure_databricks: [
    { key: "sku", label: "SKU", type: "select", options: ["standard", "premium", "trial"], default: "premium", basic: true },
    { key: "vnet_injection_enabled", label: "VNet Injection", type: "boolean", default: false, basic: true },
    { key: "public_network_access_enabled", label: "Public Network Access", type: "boolean", default: true },
    { key: "no_public_ip", label: "Secure Cluster (No Public IP)", type: "boolean", default: false },
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
    { key: "public_network_enabled", label: "Public Network Access", type: "boolean", default: true },
    { key: "identity_type", label: "Identity", type: "select", options: ["SystemAssigned", "UserAssigned"], default: "SystemAssigned" },
    { key: "managed_event_hub_enabled", label: "Managed Event Hub", type: "boolean", default: true },
  ],

  // ── AI / ML ───────────────────────────────────────────────────────────────
  azure_openai: [
    { key: "sku_name", label: "SKU", type: "select", options: ["S0"], default: "S0", basic: true },
    { key: "deployment_model", label: "Model", type: "select", options: ["gpt-4o", "gpt-4o-mini", "gpt-4", "gpt-35-turbo", "text-embedding-ada-002"], default: "gpt-4o", basic: true },
    { key: "capacity", label: "TPM Capacity (thousands)", type: "number", default: 30, basic: true },
    { key: "custom_subdomain_name", label: "Custom Subdomain", type: "text", default: "" },
    { key: "public_network_access", label: "Public Network Access", type: "select", options: ["Enabled", "Disabled"], default: "Enabled" },
  ],
  azure_cognitive: [
    { key: "kind", label: "Service Kind", type: "select", options: ["ComputerVision", "Face", "FormRecognizer", "SpeechServices", "TextAnalytics", "Translator"], default: "TextAnalytics", basic: true },
    { key: "sku_name", label: "SKU", type: "select", options: ["F0", "S0", "S1", "S2", "S3"], default: "S0", basic: true },
    { key: "public_network_access_enabled", label: "Public Network Access", type: "boolean", default: true },
    { key: "custom_subdomain_name", label: "Custom Subdomain", type: "text", default: "" },
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
    { key: "streaming_endpoint_enabled", label: "Streaming Endpoint", type: "boolean", default: false },
    { key: "local_auth_disabled", label: "Disable Local Auth", type: "boolean", default: false },
  ],
  azure_search: [
    { key: "sku", label: "SKU", type: "select", options: ["free", "basic", "standard", "standard2", "standard3"], default: "basic", basic: true },
    { key: "replica_count", label: "Replicas", type: "number", default: 1, basic: true },
    { key: "partition_count", label: "Partitions", type: "number", default: 1 },
    { key: "public_network_access_enabled", label: "Public Network Access", type: "boolean", default: true },
    { key: "local_authentication_disabled", label: "Disable Local Auth", type: "boolean", default: false },
  ],

  // ── Monitoring ────────────────────────────────────────────────────────────
  azure_monitor: [
    { key: "retention_in_days", label: "Metric Retention (days)", type: "number", default: 93, basic: true },
    { key: "data_collection_rule_enabled", label: "Data Collection Rules", type: "boolean", default: false },
    { key: "diagnostic_settings_enabled", label: "Diagnostic Settings", type: "boolean", default: true },
    { key: "alert_rule_count", label: "Alert Rules", type: "number", default: 0 },
  ],
  azure_app_insights: [
    { key: "application_type", label: "App Type", type: "select", options: ["web", "other", "ios", "java", "MobileCenter", "Node.JS", "phone", "store"], default: "web", basic: true },
    { key: "daily_data_cap_in_gb", label: "Daily Cap (GB)", type: "number", default: 1, basic: true },
    { key: "retention_in_days", label: "Retention (days)", type: "number", default: 90 },
    { key: "sampling_percentage", label: "Sampling (%)", type: "number", default: 100 },
  ],
  azure_log_analytics: [
    { key: "sku", label: "SKU", type: "select", options: ["PerGB2018", "Free", "CapacityReservation"], default: "PerGB2018", basic: true },
    { key: "retention_in_days", label: "Retention (days)", type: "number", default: 30, basic: true },
    { key: "daily_quota_gb", label: "Daily Quota (GB)", type: "number", default: -1 },
    { key: "internet_query_enabled", label: "Internet Query", type: "boolean", default: true },
    { key: "cmk_for_query_forced", label: "Force CMK for Query", type: "boolean", default: false },
  ],

  // ── DevOps ────────────────────────────────────────────────────────────────
  azure_devops: [
    { key: "org_name", label: "Org Name", type: "text", default: "my-org", basic: true },
    { key: "project_name", label: "Project Name", type: "text", default: "my-project", basic: true },
    { key: "version_control_type", label: "Version Control", type: "select", options: ["Git", "Tfvc"], default: "Git", basic: true },
    { key: "visibility", label: "Visibility", type: "select", options: ["private", "public"], default: "private" },
  ],
};

export function getAzureDefaultConfig(componentType) {
  const fields = AZURE_COMPONENT_CONFIGS[componentType] ?? [];
  return Object.fromEntries(fields.map((f) => [f.key, f.default ?? ""]));
}
