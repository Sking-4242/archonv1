"""Builds system + user prompts for Azure Terraform generation via azurerm provider."""

from __future__ import annotations

import json

from app.models.graph import Graph

# ---------------------------------------------------------------------------
# System prompt
# ---------------------------------------------------------------------------

_SYSTEM_PROMPT = (
    "You are a senior Azure Terraform engineer. Your sole task is to generate valid,"
    " production-ready HCL (azurerm provider) from the architecture description provided.\n\n"
    "CORE RULES:\n"
    "- Output raw HCL only. No markdown, no explanation, no code fences.\n"
    "- Declare 'terraform { required_providers { azurerm = { source = \"hashicorp/azurerm\""
    " version = \"~> 3.0\" } } }' and 'provider \"azurerm\" { features {} }' at the top.\n"
    "- Use meaningful Terraform resource names (snake_case, descriptive).\n"
    "- Organize blocks: terraform{} and provider{} first, then variable{} blocks,"
    " then data{} blocks, then resource{} blocks, then output{} blocks last.\n"
    "- Use variables for all sensitive values (subscription_id, client_id, client_secret,"
    " admin passwords, connection strings). Set sensitive=true on those variables.\n"
    "- Reference resources by Terraform identifiers, never hardcoded IDs.\n"
    "- Use the region from graph meta as the Azure location for all resources.\n"
    "- All variable{} blocks must include a description.\n"
    "- Include output{} blocks for every resource listed in the component's → outputs hints.\n"
    "- If a component lists config values, reproduce those attribute key-value pairs exactly.\n\n"
    "COMPANION RESOURCE RULES — these must never be omitted:\n"
    "- Virtual Machine (azure_vm): MUST include azurerm_network_interface + azurerm_managed_disk."
    " OS disk MUST use managed_disk_type. Never use unmanaged disks.\n"
    "- VM Scale Set (azure_vmss): MUST include azurerm_lb + azurerm_lb_backend_address_pool"
    " when serving web traffic. Set upgrade_mode = 'Rolling' for zero-downtime.\n"
    "- AKS (azure_aks): MUST enable role_based_access_control_enabled = true."
    " Default node pool MUST set only_critical_addons_enabled = false."
    " MUST include azurerm_kubernetes_cluster_node_pool for workload pools.\n"
    "- Functions (azure_functions): MUST include azurerm_service_plan (or Consumption plan)"
    " AND azurerm_storage_account for function state. Set https_only = true.\n"
    "- App Service (azure_app_service): MUST include azurerm_service_plan."
    " Set https_only = true and minimum_tls_version = '1.2'.\n"
    "- Azure SQL (azure_sql): MUST include azurerm_mssql_server_extended_auditing_policy."
    " transparent_data_encryption_enabled = true. Set minimum_tls_version = '1.2'.\n"
    "- PostgreSQL (azure_postgres): Use azurerm_postgresql_flexible_server."
    " MUST set ssl_enforcement_enabled = true.\n"
    "- MySQL (azure_mysql): Use azurerm_mysql_flexible_server."
    " MUST set ssl_enforcement_enabled = true.\n"
    "- CosmosDB (azure_cosmosdb): MUST set ip_range_filter or virtual_network_rule to restrict access.\n"
    "- Redis (azure_redis): Set minimum_tls_version = '1.2'. enable_non_ssl_port = false.\n"
    "- Key Vault (azure_keyvault): MUST include azurerm_key_vault_access_policy."
    " Set soft_delete_retention_days >= 7 and purge_protection_enabled = true.\n"
    "- Storage (azure_blob/azure_files/azure_datalake): MUST include"
    " azurerm_storage_account with min_tls_version = 'TLS1_2'."
    " Set allow_nested_items_to_be_public = false unless explicitly public.\n"
    "- Container Registry (azure_acr): Set admin_enabled = false."
    " Use azurerm_container_registry with sku = 'Standard' or higher.\n"
    "- API Management (azure_apim): MUST declare azurerm_api_management_api."
    " Set publisher_email and publisher_name variables.\n"
    "- Service Bus (azure_servicebus): MUST include at least one azurerm_servicebus_queue"
    " or azurerm_servicebus_topic. Set sku = 'Standard' or 'Premium'.\n"
    "- Event Hub (azure_eventhub): MUST include azurerm_eventhub_namespace"
    " and azurerm_eventhub. Set partition_count >= 2.\n"
    "- Azure Firewall (azure_firewall): MUST include azurerm_public_ip with sku=Standard"
    " and azurerm_firewall_network_rule_collection.\n"
    "- Application Gateway (azure_agw): MUST include azurerm_public_ip and"
    " azurerm_subnet dedicated to the gateway (GatewaySubnet or appgw-subnet).\n"
    "- VPN Gateway (azure_vpn_gateway): MUST use GatewaySubnet subnet name exactly.\n"
    "- Managed Identity (azure_managed_id): Use azurerm_user_assigned_identity."
    " Wire to dependent resources via identity { type='UserAssigned' } blocks.\n"
    "- Every password/secret/key: MUST use var.* — never hardcode sensitive values.\n\n"
    "RESOURCE HINTS:\n"
    "Each component below includes → hints describing required Terraform resources,"
    " companion resources, variables, and outputs. These hints are MANDATORY — follow them exactly.\n"
)

# ---------------------------------------------------------------------------
# Azure resource map — deterministic TF generation specs for all 68 canvas types
# ---------------------------------------------------------------------------

_AZURE_RESOURCE_MAP: dict[str, dict] = {
    # ── Networking ────────────────────────────────────────────────────────────
    "azure_vnet": {
        "primary": ["azurerm_virtual_network"],
        "companions": ["azurerm_subnet"],
        "key_vars": ["vnet_name", "vnet_address_space", "location", "resource_group_name"],
        "outputs": ["vnet_id", "vnet_name"],
        "notes": "address_space must be a list. Generate at least one azurerm_subnet child resource. "
                 "Set dns_servers = [] unless custom DNS is required.",
    },
    "azure_subnet": {
        "primary": ["azurerm_subnet"],
        "companions": ["azurerm_subnet_network_security_group_association"],
        "key_vars": ["subnet_name", "subnet_address_prefix"],
        "outputs": ["subnet_id"],
        "notes": "address_prefixes is a list. Associate NSG via azurerm_subnet_network_security_group_association "
                 "when an NSG is present on the canvas.",
    },
    "azure_nsg": {
        "primary": ["azurerm_network_security_group"],
        "companions": ["azurerm_network_security_rule"],
        "key_vars": ["nsg_name"],
        "outputs": ["nsg_id"],
        "notes": "Generate individual azurerm_network_security_rule resources for each rule in the "
                 "security_groups array. priority values must be unique (100-4096). "
                 "Deny rules should have higher priority numbers (lower precedence).",
    },
    "azure_agw": {
        "primary": ["azurerm_application_gateway"],
        "companions": ["azurerm_public_ip", "azurerm_subnet"],
        "key_vars": ["agw_name", "agw_sku_name", "agw_capacity"],
        "outputs": ["agw_id", "agw_public_ip"],
        "notes": "MUST include dedicated subnet (not shared with VMs). "
                 "MUST include azurerm_public_ip with sku=Standard, allocation_method=Static. "
                 "frontend_ip_configuration references the public IP. "
                 "Generate backend_address_pool, backend_http_settings, http_listener, request_routing_rule.",
    },
    "azure_lb": {
        "primary": ["azurerm_lb"],
        "companions": ["azurerm_lb_backend_address_pool", "azurerm_lb_probe", "azurerm_lb_rule"],
        "key_vars": ["lb_name", "lb_sku"],
        "outputs": ["lb_id", "lb_frontend_ip"],
        "notes": "Always generate azurerm_lb_backend_address_pool, azurerm_lb_probe (HTTP/TCP), "
                 "and azurerm_lb_rule. Standard SKU required for availability zones.",
    },
    "azure_frontdoor": {
        "primary": ["azurerm_cdn_frontdoor_profile"],
        "companions": ["azurerm_cdn_frontdoor_endpoint", "azurerm_cdn_frontdoor_origin_group", "azurerm_cdn_frontdoor_origin"],
        "key_vars": ["frontdoor_name", "frontdoor_sku"],
        "outputs": ["frontdoor_id", "frontdoor_endpoint_hostname"],
        "notes": "Use the new azurerm_cdn_frontdoor_* resources (not deprecated azurerm_frontdoor). "
                 "Generate origin group + origin pointing to backend. Set session_affinity_enabled as needed.",
    },
    "azure_dns": {
        "primary": ["azurerm_dns_zone"],
        "companions": ["azurerm_dns_a_record"],
        "key_vars": ["dns_zone_name"],
        "outputs": ["dns_zone_id", "dns_zone_name_servers"],
        "notes": "For private DNS zones use azurerm_private_dns_zone instead. "
                 "Generate at least one azurerm_dns_a_record pointing to a frontend IP.",
    },
    "azure_nat_gw": {
        "primary": ["azurerm_nat_gateway"],
        "companions": ["azurerm_public_ip", "azurerm_nat_gateway_public_ip_association", "azurerm_subnet_nat_gateway_association"],
        "key_vars": ["nat_gw_name", "idle_timeout_in_minutes"],
        "outputs": ["nat_gw_id"],
        "notes": "MUST include azurerm_public_ip (static, standard SKU) and both association resources.",
    },
    "azure_vpn_gateway": {
        "primary": ["azurerm_virtual_network_gateway"],
        "companions": ["azurerm_public_ip", "azurerm_subnet"],
        "key_vars": ["vpn_gw_name", "vpn_sku", "vpn_type"],
        "outputs": ["vpn_gw_id"],
        "notes": "Subnet name MUST be exactly 'GatewaySubnet'. "
                 "type = 'Vpn', vpn_type = 'RouteBased'. Include azurerm_public_ip with standard SKU.",
    },
    "azure_expressroute": {
        "primary": ["azurerm_express_route_circuit"],
        "companions": ["azurerm_virtual_network_gateway_connection"],
        "key_vars": ["er_circuit_name", "er_service_provider", "er_peering_location", "er_bandwidth_in_mbps"],
        "outputs": ["er_circuit_id", "er_service_key"],
        "notes": "Set sku { tier = var.er_tier family = var.er_family }. "
                 "service_provider_name, peering_location, bandwidth_in_mbps are required.",
    },
    "azure_traffic_mgr": {
        "primary": ["azurerm_traffic_manager_profile"],
        "companions": ["azurerm_traffic_manager_azure_endpoint"],
        "key_vars": ["tm_name", "tm_routing_method"],
        "outputs": ["tm_id", "tm_fqdn"],
        "notes": "Generate azurerm_traffic_manager_azure_endpoint for each backend. "
                 "dns_config block with relative_name and ttl is required.",
    },
    "azure_bastion": {
        "primary": ["azurerm_bastion_host"],
        "companions": ["azurerm_public_ip", "azurerm_subnet"],
        "key_vars": ["bastion_name", "bastion_sku"],
        "outputs": ["bastion_id"],
        "notes": "Subnet name MUST be exactly 'AzureBastionSubnet' with /26 or larger prefix. "
                 "MUST include azurerm_public_ip with standard SKU.",
    },
    "azure_private_endpoint": {
        "primary": ["azurerm_private_endpoint"],
        "companions": ["azurerm_private_dns_zone", "azurerm_private_dns_zone_virtual_network_link"],
        "key_vars": ["pe_name", "pe_subresource_name"],
        "outputs": ["pe_id", "pe_private_ip"],
        "notes": "private_service_connection block requires name, private_connection_resource_id, "
                 "subresource_names, and is_manual_connection=false. "
                 "MUST link private DNS zone to VNet for name resolution.",
    },
    "azure_firewall": {
        "primary": ["azurerm_firewall"],
        "companions": ["azurerm_public_ip", "azurerm_firewall_network_rule_collection", "azurerm_firewall_application_rule_collection"],
        "key_vars": ["firewall_name", "firewall_sku_tier"],
        "outputs": ["firewall_id", "firewall_private_ip"],
        "notes": "ip_configuration block requires subnet_id (AzureFirewallSubnet, /26+) and public_ip_address_id. "
                 "Generate azurerm_firewall_network_rule_collection allowing required outbound traffic.",
    },
    "azure_ddos": {
        "primary": ["azurerm_network_ddos_protection_plan"],
        "companions": [],
        "key_vars": ["ddos_plan_name"],
        "outputs": ["ddos_plan_id"],
        "notes": "Reference the plan in azurerm_virtual_network via ddos_protection_plan { id enable=true }. "
                 "This is a high-cost resource (~$2944/month); note in comments.",
    },

    # ── Compute ───────────────────────────────────────────────────────────────
    "azure_vm": {
        "primary": ["azurerm_linux_virtual_machine"],
        "companions": ["azurerm_network_interface", "azurerm_managed_disk", "azurerm_network_interface_security_group_association"],
        "key_vars": ["vm_name", "vm_size", "admin_username", "vm_image_publisher", "vm_image_offer", "vm_image_sku"],
        "outputs": ["vm_id", "vm_private_ip", "vm_public_ip"],
        "notes": "MUST use azurerm_managed_disk (never unmanaged). "
                 "os_disk block must specify storage_account_type (Standard_LRS or Premium_LRS). "
                 "Use azurerm_linux_virtual_machine for Linux, azurerm_windows_virtual_machine for Windows. "
                 "admin_password MUST use var.admin_password with sensitive=true. "
                 "Include azurerm_network_interface_security_group_association to attach NSG.",
    },
    "azure_vmss": {
        "primary": ["azurerm_linux_virtual_machine_scale_set"],
        "companions": ["azurerm_lb", "azurerm_lb_backend_address_pool"],
        "key_vars": ["vmss_name", "vmss_sku", "vmss_instances", "vmss_upgrade_mode"],
        "outputs": ["vmss_id"],
        "notes": "network_interface block must reference the subnet. "
                 "Use azurerm_linux_virtual_machine_scale_set or windows variant. "
                 "Set upgrade_mode = 'Rolling' for production. "
                 "wire network_interface.ip_configuration.load_balancer_backend_address_pool_ids.",
    },
    "azure_aks": {
        "primary": ["azurerm_kubernetes_cluster"],
        "companions": ["azurerm_user_assigned_identity", "azurerm_role_assignment"],
        "key_vars": ["aks_name", "aks_kubernetes_version", "aks_node_count", "aks_node_vm_size", "aks_network_plugin"],
        "outputs": ["aks_id", "aks_kube_config", "aks_node_resource_group"],
        "notes": "MUST set role_based_access_control_enabled = true. "
                 "default_node_pool requires name, node_count, vm_size. "
                 "identity block: type = 'UserAssigned' referencing azurerm_user_assigned_identity. "
                 "network_profile: network_plugin = var.aks_network_plugin, load_balancer_sku = 'standard'. "
                 "NEVER put sensitive kube_config in plain output — use sensitive=true on output.",
    },
    "azure_functions": {
        "primary": ["azurerm_linux_function_app"],
        "companions": ["azurerm_service_plan", "azurerm_storage_account"],
        "key_vars": ["func_name", "func_os_type", "func_sku_tier", "func_runtime"],
        "outputs": ["func_id", "func_default_hostname"],
        "notes": "MUST include azurerm_service_plan (Consumption: Y1/Dynamic, or EP1+ for Premium). "
                 "MUST include azurerm_storage_account for internal function state. "
                 "Set https_only = true. site_config.application_stack sets the runtime. "
                 "storage_account_name and storage_account_access_key from the companion storage account.",
    },
    "azure_aci": {
        "primary": ["azurerm_container_group"],
        "companions": [],
        "key_vars": ["aci_name", "aci_os_type", "aci_cpu", "aci_memory"],
        "outputs": ["aci_id", "aci_fqdn", "aci_ip_address"],
        "notes": "container block requires name, image, cpu, memory. "
                 "os_type = 'Linux' or 'Windows'. ip_address_type = 'Public' or 'Private'.",
    },
    "azure_app_service": {
        "primary": ["azurerm_linux_web_app"],
        "companions": ["azurerm_service_plan"],
        "key_vars": ["app_name", "app_sku_name"],
        "outputs": ["app_id", "app_default_hostname"],
        "notes": "MUST include azurerm_service_plan. Set https_only = true. "
                 "site_config.minimum_tls_version = '1.2'. "
                 "Use azurerm_linux_web_app for Linux, azurerm_windows_web_app for Windows.",
    },
    "azure_container_apps": {
        "primary": ["azurerm_container_app"],
        "companions": ["azurerm_container_app_environment"],
        "key_vars": ["ca_name", "ca_image", "ca_cpu", "ca_memory"],
        "outputs": ["ca_id", "ca_latest_revision_fqdn"],
        "notes": "MUST include azurerm_container_app_environment. "
                 "template block requires container { name image cpu memory }. "
                 "ingress block sets external traffic rules.",
    },
    "azure_batch": {
        "primary": ["azurerm_batch_account"],
        "companions": ["azurerm_batch_pool"],
        "key_vars": ["batch_account_name", "batch_pool_name", "batch_vm_size"],
        "outputs": ["batch_account_id", "batch_account_endpoint"],
        "notes": "MUST include azurerm_batch_pool with vm_configuration and fixed_scale or auto_scale block.",
    },
    "azure_spring_apps": {
        "primary": ["azurerm_spring_cloud_service"],
        "companions": ["azurerm_spring_cloud_app"],
        "key_vars": ["spring_name", "spring_sku_name"],
        "outputs": ["spring_id", "spring_service_registry_id"],
        "notes": "Generate azurerm_spring_cloud_app and azurerm_spring_cloud_java_deployment for each app.",
    },
    "azure_static_web": {
        "primary": ["azurerm_static_site"],
        "companions": [],
        "key_vars": ["static_site_name", "static_sku_tier"],
        "outputs": ["static_site_id", "static_site_default_host_name", "static_site_api_key"],
        "notes": "sku_tier: 'Free' or 'Standard'. api_key output is sensitive=true.",
    },
    "azure_acr": {
        "primary": ["azurerm_container_registry"],
        "companions": ["azurerm_role_assignment"],
        "key_vars": ["acr_name", "acr_sku"],
        "outputs": ["acr_id", "acr_login_server"],
        "notes": "Set admin_enabled = false (use managed identity + role assignment instead). "
                 "Generate azurerm_role_assignment giving AcrPull to the AKS/service identity. "
                 "sku: 'Basic', 'Standard', or 'Premium'.",
    },

    # ── Storage ───────────────────────────────────────────────────────────────
    "azure_blob": {
        "primary": ["azurerm_storage_account"],
        "companions": ["azurerm_storage_container"],
        "key_vars": ["storage_account_name", "storage_replication_type", "storage_account_tier"],
        "outputs": ["storage_account_id", "storage_primary_blob_endpoint"],
        "notes": "Set min_tls_version = 'TLS1_2' and allow_nested_items_to_be_public = false. "
                 "account_replication_type: LRS/GRS/ZRS/RAGRS. Generate azurerm_storage_container.",
    },
    "azure_files": {
        "primary": ["azurerm_storage_account"],
        "companions": ["azurerm_storage_share"],
        "key_vars": ["storage_account_name", "share_name", "share_quota"],
        "outputs": ["storage_account_id", "storage_primary_file_endpoint"],
        "notes": "Generate azurerm_storage_share with quota in GB. Set min_tls_version = 'TLS1_2'.",
    },
    "azure_disk": {
        "primary": ["azurerm_managed_disk"],
        "companions": ["azurerm_virtual_machine_data_disk_attachment"],
        "key_vars": ["disk_name", "disk_storage_account_type", "disk_size_gb"],
        "outputs": ["disk_id"],
        "notes": "storage_account_type: Standard_LRS, Premium_LRS, UltraSSD_LRS. "
                 "Set encryption_settings { enabled=true } with azurerm_key_vault_key for CMK.",
    },
    "azure_table": {
        "primary": ["azurerm_storage_account"],
        "companions": ["azurerm_storage_table"],
        "key_vars": ["storage_account_name", "table_name"],
        "outputs": ["storage_account_id", "storage_primary_table_endpoint"],
        "notes": "Generate azurerm_storage_table. account_kind = 'StorageV2'.",
    },
    "azure_queue": {
        "primary": ["azurerm_storage_account"],
        "companions": ["azurerm_storage_queue"],
        "key_vars": ["storage_account_name", "queue_name"],
        "outputs": ["storage_account_id", "storage_primary_queue_endpoint"],
        "notes": "Generate azurerm_storage_queue. Set min_tls_version = 'TLS1_2'.",
    },
    "azure_datalake": {
        "primary": ["azurerm_storage_account"],
        "companions": ["azurerm_storage_data_lake_gen2_filesystem"],
        "key_vars": ["adls_name", "adls_replication_type"],
        "outputs": ["adls_id", "adls_primary_dfs_endpoint"],
        "notes": "Set is_hns_enabled = true on the storage account to enable Data Lake Gen2. "
                 "Generate azurerm_storage_data_lake_gen2_filesystem. "
                 "Set min_tls_version = 'TLS1_2' and allow_nested_items_to_be_public = false.",
    },
    "azure_backup": {
        "primary": ["azurerm_recovery_services_vault"],
        "companions": ["azurerm_backup_policy_vm"],
        "key_vars": ["vault_name", "backup_sku"],
        "outputs": ["vault_id"],
        "notes": "sku: 'Standard' or 'RS0'. Generate azurerm_backup_policy_vm with retention rules.",
    },

    # ── Database ──────────────────────────────────────────────────────────────
    "azure_sql": {
        "primary": ["azurerm_mssql_server"],
        "companions": ["azurerm_mssql_database", "azurerm_mssql_server_extended_auditing_policy", "azurerm_mssql_firewall_rule"],
        "key_vars": ["sql_server_name", "sql_db_name", "sql_sku_name", "sql_admin_login"],
        "outputs": ["sql_server_id", "sql_server_fqdn", "sql_db_id"],
        "notes": "MUST set minimum_tls_version = '1.2' on the server. "
                 "MUST generate azurerm_mssql_server_extended_auditing_policy. "
                 "transparent_data_encryption_enabled = true on the database. "
                 "admin password MUST use var.sql_admin_password with sensitive=true.",
    },
    "azure_cosmosdb": {
        "primary": ["azurerm_cosmosdb_account"],
        "companions": ["azurerm_cosmosdb_sql_database", "azurerm_cosmosdb_sql_container"],
        "key_vars": ["cosmos_name", "cosmos_offer_type", "cosmos_consistency_level"],
        "outputs": ["cosmos_id", "cosmos_endpoint", "cosmos_primary_key"],
        "notes": "offer_type = 'Standard'. geo_location block required (at least one). "
                 "consistency_policy block required. "
                 "Set ip_range_filter or virtual_network_rule. "
                 "primary_key output MUST be sensitive=true.",
    },
    "azure_redis": {
        "primary": ["azurerm_redis_cache"],
        "companions": [],
        "key_vars": ["redis_name", "redis_capacity", "redis_family", "redis_sku_name"],
        "outputs": ["redis_id", "redis_hostname", "redis_port", "redis_primary_access_key"],
        "notes": "Set minimum_tls_version = '1.2' and enable_non_ssl_port = false. "
                 "redis_configuration block: maxmemory_policy. "
                 "primary_access_key output must be sensitive=true.",
    },
    "azure_postgres": {
        "primary": ["azurerm_postgresql_flexible_server"],
        "companions": ["azurerm_postgresql_flexible_server_database", "azurerm_postgresql_flexible_server_firewall_rule"],
        "key_vars": ["postgres_name", "postgres_sku_name", "postgres_version", "postgres_admin_login"],
        "outputs": ["postgres_id", "postgres_fqdn"],
        "notes": "Use azurerm_postgresql_flexible_server (not deprecated single server). "
                 "administrator_password MUST use var.postgres_admin_password with sensitive=true. "
                 "Set ssl_enforcement_enabled = true.",
    },
    "azure_mysql": {
        "primary": ["azurerm_mysql_flexible_server"],
        "companions": ["azurerm_mysql_flexible_database", "azurerm_mysql_flexible_server_firewall_rule"],
        "key_vars": ["mysql_name", "mysql_sku_name", "mysql_version", "mysql_admin_login"],
        "outputs": ["mysql_id", "mysql_fqdn"],
        "notes": "Use azurerm_mysql_flexible_server. "
                 "administrator_password MUST use var.mysql_admin_password with sensitive=true. "
                 "Set require_secure_transport = 'ON' in azurerm_mysql_flexible_server_configuration.",
    },
    "azure_mariadb": {
        "primary": ["azurerm_mariadb_server"],
        "companions": ["azurerm_mariadb_database"],
        "key_vars": ["mariadb_name", "mariadb_sku_name", "mariadb_version"],
        "outputs": ["mariadb_id", "mariadb_fqdn"],
        "notes": "Set ssl_enforcement_enabled = true. "
                 "administrator_login_password MUST use var.mariadb_password with sensitive=true.",
    },
    "azure_synapse": {
        "primary": ["azurerm_synapse_workspace"],
        "companions": ["azurerm_synapse_sql_pool", "azurerm_storage_account"],
        "key_vars": ["synapse_name", "synapse_sql_pool_name", "synapse_pool_sku"],
        "outputs": ["synapse_id", "synapse_connectivity_endpoints"],
        "notes": "MUST include azurerm_storage_account with is_hns_enabled=true for ADLS. "
                 "sql_administrator_login_password MUST be var.synapse_sql_password with sensitive=true.",
    },
    "azure_managed_instance": {
        "primary": ["azurerm_mssql_managed_instance"],
        "companions": ["azurerm_subnet", "azurerm_network_security_group", "azurerm_route_table"],
        "key_vars": ["mi_name", "mi_sku_name", "mi_vcores", "mi_storage_size_in_gb"],
        "outputs": ["mi_id", "mi_fqdn"],
        "notes": "Requires dedicated subnet with delegation to Microsoft.Sql/managedInstances. "
                 "NSG and route table must be associated with the MI subnet. "
                 "administrator_login_password MUST use var.mi_admin_password with sensitive=true.",
    },

    # ── Security ──────────────────────────────────────────────────────────────
    "azure_keyvault": {
        "primary": ["azurerm_key_vault"],
        "companions": ["azurerm_key_vault_access_policy"],
        "key_vars": ["kv_name", "kv_sku_name", "tenant_id"],
        "outputs": ["kv_id", "kv_uri"],
        "notes": "MUST set soft_delete_retention_days >= 7 and purge_protection_enabled = true. "
                 "MUST include azurerm_key_vault_access_policy for each principal. "
                 "network_acls block: default_action='Deny', bypass=['AzureServices'].",
    },
    "azure_aad": {
        "primary": [],
        "companions": ["azurerm_role_assignment"],
        "key_vars": ["tenant_id"],
        "outputs": [],
        "notes": "Azure Active Directory is managed outside Terraform or via azuread provider. "
                 "Generate azurerm_role_assignment resources for RBAC bindings. "
                 "Reference tenant_id from data.azurerm_client_config.current.tenant_id.",
    },
    "azure_waf": {
        "primary": ["azurerm_web_application_firewall_policy"],
        "companions": [],
        "key_vars": ["waf_name", "waf_mode"],
        "outputs": ["waf_policy_id"],
        "notes": "policy_settings block: enabled=true, mode=var.waf_mode (Detection or Prevention). "
                 "managed_rules block: managed_rule_set { type='OWASP' version='3.2' }. "
                 "Associate with azurerm_application_gateway via firewall_policy_id.",
    },
    "azure_defender": {
        "primary": ["azurerm_security_center_subscription_pricing"],
        "companions": ["azurerm_security_center_contact"],
        "key_vars": ["defender_tier"],
        "outputs": [],
        "notes": "Generate one azurerm_security_center_subscription_pricing per resource_type "
                 "(VirtualMachines, SqlServers, AppServices, StorageAccounts, Containers). "
                 "tier = 'Standard' for Defender enabled.",
    },
    "azure_sentinel": {
        "primary": ["azurerm_sentinel_log_analytics_workspace_onboarding"],
        "companions": ["azurerm_log_analytics_workspace"],
        "key_vars": ["sentinel_workspace_name"],
        "outputs": ["sentinel_id"],
        "notes": "MUST include azurerm_log_analytics_workspace. "
                 "Reference the workspace in the onboarding resource.",
    },
    "azure_managed_id": {
        "primary": ["azurerm_user_assigned_identity"],
        "companions": ["azurerm_role_assignment"],
        "key_vars": ["managed_id_name"],
        "outputs": ["managed_id_id", "managed_id_principal_id", "managed_id_client_id"],
        "notes": "Wire to resources using identity { type='UserAssigned' identity_ids=[...] }. "
                 "Generate azurerm_role_assignment granting necessary roles (e.g., Storage Blob Data Reader).",
    },
    "azure_policy": {
        "primary": ["azurerm_policy_definition"],
        "companions": ["azurerm_policy_assignment"],
        "key_vars": ["policy_name", "policy_mode"],
        "outputs": ["policy_id"],
        "notes": "mode = 'All' or 'Indexed'. Generate azurerm_policy_assignment at subscription scope. "
                 "policy_rule and parameters are JSON-encoded strings.",
    },

    # ── Integration ───────────────────────────────────────────────────────────
    "azure_servicebus": {
        "primary": ["azurerm_servicebus_namespace"],
        "companions": ["azurerm_servicebus_queue", "azurerm_servicebus_topic"],
        "key_vars": ["sb_name", "sb_sku"],
        "outputs": ["sb_id", "sb_default_primary_connection_string"],
        "notes": "sku = 'Standard' or 'Premium'. "
                 "MUST generate at least one azurerm_servicebus_queue or azurerm_servicebus_topic. "
                 "default_primary_connection_string output MUST be sensitive=true.",
    },
    "azure_eventhub": {
        "primary": ["azurerm_eventhub_namespace"],
        "companions": ["azurerm_eventhub", "azurerm_eventhub_authorization_rule"],
        "key_vars": ["eh_namespace_name", "eh_name", "eh_sku", "eh_partition_count", "eh_message_retention"],
        "outputs": ["eh_namespace_id", "eh_id", "eh_connection_string"],
        "notes": "MUST include azurerm_eventhub with partition_count >= 2. "
                 "MUST include azurerm_eventhub_authorization_rule (Listen/Send). "
                 "connection_string output MUST be sensitive=true.",
    },
    "azure_logicapp": {
        "primary": ["azurerm_logic_app_workflow"],
        "companions": ["azurerm_logic_app_trigger_http_request"],
        "key_vars": ["logicapp_name"],
        "outputs": ["logicapp_id", "logicapp_access_endpoint"],
        "notes": "Generate azurerm_logic_app_trigger_http_request for HTTP-triggered workflows. "
                 "workflow_schema = 'https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#'.",
    },
    "azure_apim": {
        "primary": ["azurerm_api_management"],
        "companions": ["azurerm_api_management_api"],
        "key_vars": ["apim_name", "apim_sku_name", "apim_publisher_name", "apim_publisher_email"],
        "outputs": ["apim_id", "apim_gateway_url", "apim_portal_url"],
        "notes": "MUST generate at least one azurerm_api_management_api. "
                 "sku_name format: 'Developer_1', 'Standard_1', 'Premium_1'. "
                 "publisher_name and publisher_email MUST use variables.",
    },
    "azure_signalr": {
        "primary": ["azurerm_signalr_service"],
        "companions": [],
        "key_vars": ["signalr_name", "signalr_sku"],
        "outputs": ["signalr_id", "signalr_primary_connection_string"],
        "notes": "sku { name capacity } block required. Name: 'Free_F1', 'Standard_S1'. "
                 "primary_connection_string output MUST be sensitive=true.",
    },
    "azure_notification_hub": {
        "primary": ["azurerm_notification_hub_namespace"],
        "companions": ["azurerm_notification_hub"],
        "key_vars": ["nh_namespace_name", "nh_name", "nh_sku_name"],
        "outputs": ["nh_namespace_id", "nh_id"],
        "notes": "MUST include azurerm_notification_hub within the namespace. "
                 "namespace_type = 'NotificationHub'. sku_name = 'Free' or 'Basic' or 'Standard'.",
    },

    # ── Analytics ─────────────────────────────────────────────────────────────
    "azure_datafactory": {
        "primary": ["azurerm_data_factory"],
        "companions": ["azurerm_data_factory_linked_service_azure_blob_storage"],
        "key_vars": ["adf_name"],
        "outputs": ["adf_id"],
        "notes": "Enable managed virtual network if private connectivity needed. "
                 "Generate linked services for each connected data source.",
    },
    "azure_stream_analytics": {
        "primary": ["azurerm_stream_analytics_job"],
        "companions": ["azurerm_stream_analytics_stream_input_eventhub"],
        "key_vars": ["sa_job_name", "sa_streaming_units"],
        "outputs": ["sa_job_id"],
        "notes": "streaming_units: 1-192 (multiples of 3 above 6). "
                 "Generate stream input and output resources matching canvas edges.",
    },
    "azure_databricks": {
        "primary": ["azurerm_databricks_workspace"],
        "companions": [],
        "key_vars": ["databricks_name", "databricks_sku"],
        "outputs": ["databricks_id", "databricks_workspace_url"],
        "notes": "sku = 'standard', 'premium', or 'trial'. "
                 "custom_parameters block for VNet injection (no_public_ip, public/private subnet names).",
    },
    "azure_hdinsight": {
        "primary": ["azurerm_hdinsight_hadoop_cluster"],
        "companions": ["azurerm_storage_account"],
        "key_vars": ["hdinsight_name", "hdinsight_cluster_version", "hdinsight_tier"],
        "outputs": ["hdinsight_id", "hdinsight_https_endpoint"],
        "notes": "MUST include azurerm_storage_account for cluster storage. "
                 "roles block: head_node, worker_node, zookeeper_node with vm_size each. "
                 "gateway block: enabled=true, username/password from variables.",
    },
    "azure_purview": {
        "primary": ["azurerm_purview_account"],
        "companions": [],
        "key_vars": ["purview_name"],
        "outputs": ["purview_id", "purview_catalog_endpoint"],
        "notes": "identity block: type='SystemAssigned'. "
                 "managed_resource_group_name will be auto-created.",
    },

    # ── AI / ML ───────────────────────────────────────────────────────────────
    "azure_openai": {
        "primary": ["azurerm_cognitive_account"],
        "companions": ["azurerm_cognitive_deployment"],
        "key_vars": ["openai_name", "openai_model_name", "openai_model_version"],
        "outputs": ["openai_id", "openai_endpoint", "openai_primary_access_key"],
        "notes": "kind = 'OpenAI'. sku_name = 'S0'. "
                 "MUST generate azurerm_cognitive_deployment for each model (gpt-4, gpt-35-turbo, etc.). "
                 "primary_access_key output MUST be sensitive=true. "
                 "Set custom_subdomain_name for unique endpoint.",
    },
    "azure_cognitive": {
        "primary": ["azurerm_cognitive_account"],
        "companions": [],
        "key_vars": ["cognitive_name", "cognitive_kind", "cognitive_sku"],
        "outputs": ["cognitive_id", "cognitive_endpoint", "cognitive_primary_key"],
        "notes": "kind: 'CognitiveServices', 'ComputerVision', 'TextAnalytics', 'SpeechServices', etc. "
                 "primary_key output MUST be sensitive=true.",
    },
    "azure_ml": {
        "primary": ["azurerm_machine_learning_workspace"],
        "companions": ["azurerm_storage_account", "azurerm_key_vault", "azurerm_application_insights"],
        "key_vars": ["ml_workspace_name"],
        "outputs": ["ml_workspace_id"],
        "notes": "MUST include azurerm_storage_account, azurerm_key_vault, azurerm_application_insights. "
                 "Link all three via storage_account_id, key_vault_id, application_insights_id. "
                 "identity block: type='SystemAssigned'.",
    },
    "azure_bot": {
        "primary": ["azurerm_bot_channels_registration"],
        "companions": ["azurerm_bot_channel_ms_teams"],
        "key_vars": ["bot_name", "bot_sku", "bot_microsoft_app_id"],
        "outputs": ["bot_id", "bot_endpoint"],
        "notes": "microsoft_app_id MUST use var.bot_microsoft_app_id. "
                 "Generate channel resources (azurerm_bot_channel_ms_teams etc.) as needed.",
    },
    "azure_search": {
        "primary": ["azurerm_search_service"],
        "companions": [],
        "key_vars": ["search_name", "search_sku", "search_replica_count", "search_partition_count"],
        "outputs": ["search_id", "search_primary_key", "search_query_keys"],
        "notes": "sku: 'free', 'basic', 'standard', 'standard2', 'standard3'. "
                 "primary_key output MUST be sensitive=true.",
    },

    # ── Monitoring ────────────────────────────────────────────────────────────
    "azure_monitor": {
        "primary": ["azurerm_monitor_action_group"],
        "companions": ["azurerm_monitor_metric_alert"],
        "key_vars": ["monitor_action_group_name"],
        "outputs": ["action_group_id"],
        "notes": "Generate azurerm_monitor_metric_alert for key metrics (CPU > 80%, memory thresholds). "
                 "action_group_id referenced by each alert.",
    },
    "azure_app_insights": {
        "primary": ["azurerm_application_insights"],
        "companions": [],
        "key_vars": ["app_insights_name", "app_insights_application_type"],
        "outputs": ["app_insights_id", "app_insights_instrumentation_key", "app_insights_connection_string"],
        "notes": "application_type: 'web', 'other'. "
                 "instrumentation_key and connection_string outputs MUST be sensitive=true. "
                 "Link to azurerm_log_analytics_workspace via workspace_id.",
    },
    "azure_log_analytics": {
        "primary": ["azurerm_log_analytics_workspace"],
        "companions": [],
        "key_vars": ["log_workspace_name", "log_sku", "log_retention_in_days"],
        "outputs": ["log_workspace_id", "log_workspace_primary_shared_key"],
        "notes": "sku: 'PerGB2018'. retention_in_days: 30-730. "
                 "primary_shared_key output MUST be sensitive=true.",
    },

    # ── DevOps ────────────────────────────────────────────────────────────────
    "azure_devops": {
        "primary": [],
        "companions": [],
        "key_vars": ["devops_org_name", "devops_project_name"],
        "outputs": [],
        "notes": "Azure DevOps is managed via the azuredevops Terraform provider (not azurerm). "
                 "Declare: terraform { required_providers { azuredevops = { source='microsoft/azuredevops' } } }. "
                 "Generate azuredevops_project, azuredevops_git_repository as needed.",
    },
}


# ---------------------------------------------------------------------------
# Hint formatter
# ---------------------------------------------------------------------------

def _get_azure_resource_hint(component_type: str) -> list[str]:
    """Return hint lines for a given Azure canvas component type."""
    spec = _AZURE_RESOURCE_MAP.get(component_type)
    if not spec:
        return []
    lines = []
    if spec["primary"]:
        lines.append(f"    → primary: {', '.join(spec['primary'])}")
    else:
        lines.append("    → primary: (managed/external — no azurerm resource to provision)")
    if spec["companions"]:
        lines.append(f"    → companions: {', '.join(spec['companions'])}")
    if spec["key_vars"]:
        lines.append(f"    → variables: {', '.join('var.' + v for v in spec['key_vars'])}")
    if spec["outputs"]:
        lines.append(f"    → outputs: {', '.join(spec['outputs'])}")
    if spec.get("notes"):
        lines.append(f"    → note: {spec['notes']}")
    return lines


# ---------------------------------------------------------------------------
# Sanitisation helpers
# ---------------------------------------------------------------------------

def _sanitize_str(s: str, limit: int = 500) -> str:
    return s.replace("\x00", "").strip()[:limit]


def _serialize_components(components) -> str:
    if not components:
        return "(none)"
    lines = []
    for c in components:
        lines.append(f"- [{_sanitize_str(c.type)}] {_sanitize_str(c.label)} (id: {c.id[:64]})")
        for k, v in (c.config or {}).items():
            if isinstance(k, str) and len(k) <= 64:
                lines.append(f"    {_sanitize_str(k)}: {_sanitize_str(str(v), 200)}")
        instructions = c.config.get("instructions", "") if c.config else ""
        if instructions:
            lines.append(f"    instructions: {_sanitize_str(instructions)}")
        hint_lines = _get_azure_resource_hint(c.type)
        lines.extend(hint_lines)
    return "\n".join(lines)


def _serialize_edges(edges) -> str:
    if not edges:
        return "(none)"
    _EDGE_LABELS = {
        "network":      "network connectivity",
        "data_flow":    "data transfer",
        "dependency":   "logical dependency",
        "streaming":    "real-time stream",
        "batch":        "scheduled batch transfer",
        "event":        "event-driven trigger",
    }
    lines = []
    for e in edges:
        label = _EDGE_LABELS.get(e.type, e.type)
        direction = "↔" if e.bidirectional else "→"
        lines.append(f"- {e.source[:64]} {direction} {e.target[:64]} [{label}]")
    return "\n".join(lines)


def _serialize_security_groups(sgs) -> str:
    if not sgs:
        return "(none)"
    lines = []
    for sg in sgs:
        lines.append(f"- {_sanitize_str(sg.name)} (id: {sg.id})")
        for rule in sg.inbound:
            port_str = str(rule.port) if rule.port is not None else "any"
            lines.append(f"    inbound: protocol={rule.protocol} port={port_str} source={_sanitize_str(rule.source)}")
        for rule in sg.outbound:
            port_str = str(rule.port) if rule.port is not None else "any"
            lines.append(f"    outbound: protocol={rule.protocol} port={port_str} dest={_sanitize_str(rule.source)}")
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------

def build_azure_prompt(graph: Graph) -> tuple[str, str]:
    user = (
        f"Graph: {_sanitize_str(graph.name or 'Azure Architecture', 120)}\n"
        f"Region: {graph.region or 'eastus'}\n\n"
        f"COMPONENTS:\n{_serialize_components(graph.components)}\n\n"
        f"EDGES:\n{_serialize_edges(graph.edges)}\n\n"
        f"NSG RULES:\n{_serialize_security_groups(graph.security_groups)}\n\n"
        f"Generate complete Terraform HCL for this Azure architecture.\n"
    )
    return _SYSTEM_PROMPT, user
