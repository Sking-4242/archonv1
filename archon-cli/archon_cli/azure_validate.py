"""Azure validation rules — config, topology, NSG, and RBAC."""

from __future__ import annotations

from archon_cli.azure_helpers import (
    COMPUTE_TYPES,
    DB_TYPES,
    PUBLIC_EDGE_TYPES,
    STATEFUL_TYPES,
    STORAGE_TYPES,
    WAF_TYPES,
    cfg,
    cfg_nested,
    has_neighbor_type,
    has_public_ip,
    is_falsy_explicit,
    is_truthy,
    label_has_internet,
    neighbor_ids,
    node_types,
    reachable_types,
)
from archon_cli.validate import Finding, IAMRole, Node, SecurityGroup, SGRule


def _finding(
    rule_id: str,
    node: Node,
    *,
    level: str,
    title: str,
    message: str,
    fix: str,
    suggestion: str = "",
    standards: list[str] | None = None,
    sg_id: str | None = None,
) -> Finding:
    return Finding(
        id=f"{rule_id}::{node.id}",
        rule_id=rule_id,
        node_id=node.id,
        node_label=node.label,
        node_type=node.type,
        level=level,
        title=title,
        message=message,
        fix=fix,
        suggestion=suggestion,
        standards=standards or [],
        sg_id=sg_id,
    )


def _sg_finding(
    rule_id: str,
    sg: SecurityGroup,
    *,
    level: str,
    title: str,
    message: str,
    fix: str,
    suggestion: str = "",
    standards: list[str] | None = None,
) -> Finding:
    return Finding(
        id=f"{rule_id}::{sg.id}",
        rule_id=rule_id,
        node_id=sg.id,
        node_label=sg.name,
        node_type="azure_nsg",
        level=level,
        title=title,
        message=message,
        fix=fix,
        suggestion=suggestion,
        standards=standards or [],
        sg_id=sg.id,
    )


def _iam_finding(rule_id: str, role: IAMRole, **kwargs) -> Finding:
    return Finding(
        id=f"{rule_id}::{role.id}",
        rule_id=rule_id,
        node_id=role.id,
        node_label=role.name,
        node_type="azure_iam",
        standards=kwargs.pop("standards", []) or [],
        **kwargs,
    )


# ─── Config rules (~105) ──────────────────────────────────────────────────────


def azure_config_findings(nodes: list[Node]) -> list[Finding]:
    findings: list[Finding] = []
    for n in nodes:
        t = n.type
        c = n.config or {}

        if t == "azure_vm":
            if is_falsy_explicit(cfg(c, "disable_password_authentication")):
                findings.append(_finding(
                    "azure_vm_password_auth", n, level="warning",
                    title="Azure VM: password authentication enabled",
                    message=f"{n.label} allows password authentication. Use SSH keys only.",
                    fix="Set disable_password_authentication = true.",
                    standards=["CIS", "NIST"],
                ))
            if not is_truthy(cfg(c, "boot_diagnostics_enabled")):
                findings.append(_finding(
                    "azure_vm_no_boot_diagnostics", n, level="info",
                    title="Azure VM: boot diagnostics not enabled",
                    message=f"{n.label} does not have boot diagnostics enabled.",
                    fix="Add boot_diagnostics block to the VM resource.",
                    standards=["NIST"],
                ))
            if has_public_ip(c):
                findings.append(_finding(
                    "azure_vm_public_ip", n, level="warning",
                    title="Azure VM: public IP assigned",
                    message=f"{n.label} has a public IP and may be directly internet-reachable.",
                    fix="Remove public IP or place the VM behind a load balancer or Bastion.",
                    standards=["CIS", "NIST", "PCI"],
                ))
            if is_falsy_explicit(cfg(c, "encryption_at_host_enabled")):
                findings.append(_finding(
                    "azure_vm_no_encryption_at_host", n, level="warning",
                    title="Azure VM: encryption at host disabled",
                    message=f"{n.label} does not use encryption at host.",
                    fix="Set encryption_at_host_enabled = true on the VM.",
                    standards=["CIS", "HIPAA", "NIST"],
                ))
            if not is_truthy(cfg(c, "vm_agent_enabled")) and cfg(c, "vm_agent_enabled") is not None:
                findings.append(_finding(
                    "azure_vm_agent_disabled", n, level="info",
                    title="Azure VM: guest agent disabled",
                    message=f"{n.label} has the VM guest agent disabled.",
                    fix="Enable the VM agent for extensions and monitoring.",
                    standards=["NIST"],
                ))
            if cfg(c, "availability_zone") in (None, "") and not cfg(c, "availability_set_id"):
                findings.append(_finding(
                    "azure_vm_no_az", n, level="info",
                    title="Azure VM: no availability zone or set",
                    message=f"{n.label} is not placed in an availability zone or set.",
                    fix="Use availability zones or an availability set for HA.",
                    standards=["NIST", "SOC2"],
                ))

        if t == "azure_vmss":
            if not cfg(c, "automatic_instance_repair") and not is_truthy(cfg(c, "automatic_instance_repair_enabled")):
                findings.append(_finding(
                    "azure_vmss_no_automatic_repair", n, level="info",
                    title="VMSS: automatic instance repair not enabled",
                    message=f"{n.label} does not automatically repair unhealthy instances.",
                    fix="Enable automatic instance repair on the scale set.",
                    standards=["NIST", "SOC2"],
                ))
            if int(cfg(c, "instances", 1) or 1) < 2:
                findings.append(_finding(
                    "azure_vmss_single_instance", n, level="warning",
                    title="VMSS: fewer than two instances",
                    message=f"{n.label} runs a single instance without scale-set redundancy.",
                    fix="Set instances >= 2 for production workloads.",
                    standards=["NIST", "SOC2"],
                ))
            if is_falsy_explicit(cfg(c, "overprovision")):
                findings.append(_finding(
                    "azure_vmss_overprovision_disabled", n, level="info",
                    title="VMSS: overprovisioning disabled",
                    message=f"{n.label} may have slower scale-out without overprovisioning.",
                    fix="Enable overprovision for faster scaling unless using proximity groups.",
                    standards=["NIST"],
                ))
            if cfg(c, "upgrade_mode", "Manual") == "Manual":
                findings.append(_finding(
                    "azure_vmss_manual_upgrade", n, level="info",
                    title="VMSS: manual upgrade mode",
                    message=f"{n.label} uses manual rolling upgrades.",
                    fix="Use Rolling upgrade mode for safer deployments.",
                    standards=["NIST"],
                ))

        if t == "azure_aks":
            if is_falsy_explicit(cfg(c, "role_based_access_control_enabled")):
                findings.append(_finding(
                    "azure_aks_rbac_disabled", n, level="critical",
                    title="AKS: RBAC disabled",
                    message=f"{n.label} has RBAC disabled. All users have unrestricted cluster access.",
                    fix="Set role_based_access_control_enabled = true.",
                    standards=["CIS", "NIST", "SOC2"],
                ))
            if not is_truthy(cfg(c, "private_cluster_enabled")):
                findings.append(_finding(
                    "azure_aks_no_private_cluster", n, level="warning",
                    title="AKS: API server not private",
                    message=f"{n.label} has a public-facing API server endpoint.",
                    fix="Set private_cluster_enabled = true.",
                    standards=["CIS", "NIST", "SOC2"],
                ))
            if (
                not is_truthy(cfg(c, "private_cluster_enabled"))
                and not cfg(c, "api_server_authorized_ip_ranges")
            ):
                findings.append(_finding(
                    "azure_aks_no_authorized_ips", n, level="warning",
                    title="AKS: no authorized IP ranges on API server",
                    message=f"{n.label} API server is open to all IPs with no restriction.",
                    fix="Set api_server_authorized_ip_ranges or enable private cluster.",
                    standards=["CIS", "NIST"],
                ))
            if not cfg(c, "network_policy"):
                findings.append(_finding(
                    "azure_aks_no_network_policy", n, level="warning",
                    title="AKS: no network policy configured",
                    message=f"{n.label} has no network policy. All pods can communicate freely.",
                    fix="Set network_policy = 'azure' or 'calico' in network_profile.",
                    standards=["CIS", "NIST"],
                ))
            if is_truthy(cfg(c, "local_account_disabled")) is False and cfg(c, "local_account_disabled") is not None:
                findings.append(_finding(
                    "azure_aks_local_accounts_enabled", n, level="warning",
                    title="AKS: local accounts enabled",
                    message=f"{n.label} allows local Kubernetes accounts.",
                    fix="Set local_account_disabled = true.",
                    standards=["CIS", "NIST"],
                ))
            if not is_truthy(cfg(c, "azure_policy_enabled")):
                findings.append(_finding(
                    "azure_aks_azure_policy_disabled", n, level="warning",
                    title="AKS: Azure Policy add-on disabled",
                    message=f"{n.label} does not enforce Azure Policy on the cluster.",
                    fix="Enable the Azure Policy add-on.",
                    standards=["CIS", "NIST"],
                ))
            if is_truthy(cfg(c, "http_application_routing_enabled")):
                findings.append(_finding(
                    "azure_aks_http_routing_enabled", n, level="warning",
                    title="AKS: HTTP application routing enabled",
                    message=f"{n.label} enables the legacy HTTP application routing add-on.",
                    fix="Disable http_application_routing and use Ingress + AGW/NGINX.",
                    standards=["NIST"],
                ))
            if not is_truthy(cfg(c, "oidc_issuer_enabled")):
                findings.append(_finding(
                    "azure_aks_oidc_disabled", n, level="info",
                    title="AKS: OIDC issuer not enabled",
                    message=f"{n.label} cannot use workload identity federation easily.",
                    fix="Enable OIDC issuer for workload identity.",
                    standards=["CIS", "NIST"],
                ))
            if not cfg(c, "sku_tier") or str(cfg(c, "sku_tier")).lower() == "free":
                findings.append(_finding(
                    "azure_aks_free_tier", n, level="info",
                    title="AKS: Free tier SKU",
                    message=f"{n.label} uses the Free control plane tier without SLA.",
                    fix="Use Standard tier for production SLA.",
                    standards=["NIST", "SOC2"],
                ))

        if t == "azure_sql":
            if is_falsy_explicit(cfg(c, "transparent_data_encryption_enabled")):
                findings.append(_finding(
                    "azure_sql_tde_disabled", n, level="critical",
                    title="Azure SQL: Transparent Data Encryption disabled",
                    message=f"{n.label} has Transparent Data Encryption disabled.",
                    fix="Set transparent_data_encryption_enabled = true on the database.",
                    standards=["CIS", "PCI", "HIPAA", "NIST"],
                ))
            if cfg(c, "minimum_tls_version") not in (None, "1.2"):
                findings.append(_finding(
                    "azure_sql_min_tls_old", n, level="warning",
                    title="Azure SQL: minimum TLS version below 1.2",
                    message=f"{n.label} accepts TLS versions older than 1.2.",
                    fix="Set minimum_tls_version = '1.2' on the SQL server.",
                    standards=["CIS", "PCI", "NIST"],
                ))
            if not is_truthy(cfg(c, "auditing_enabled")):
                findings.append(_finding(
                    "azure_sql_no_auditing", n, level="warning",
                    title="Azure SQL: auditing not enabled",
                    message=f"{n.label} does not have auditing enabled.",
                    fix="Generate azurerm_mssql_server_extended_auditing_policy.",
                    standards=["CIS", "SOC2", "NIST"],
                ))
            if is_truthy(cfg(c, "public_network_access_enabled")):
                findings.append(_finding(
                    "azure_sql_public_network", n, level="critical",
                    title="Azure SQL: public network access enabled",
                    message=f"{n.label} allows connections from public networks.",
                    fix="Set public_network_access_enabled = false and use Private Endpoint.",
                    standards=["CIS", "PCI", "HIPAA", "NIST"],
                ))
            if not is_truthy(cfg(c, "azuread_administrator")) and not cfg(c, "azuread_administrator_login"):
                findings.append(_finding(
                    "azure_sql_no_aad_admin", n, level="warning",
                    title="Azure SQL: no Azure AD administrator",
                    message=f"{n.label} relies on SQL authentication only.",
                    fix="Configure an Azure AD administrator on the server.",
                    standards=["CIS", "NIST"],
                ))

        if t == "azure_postgres":
            if is_falsy_explicit(cfg(c, "ssl_enforcement_enabled")):
                findings.append(_finding(
                    "azure_postgres_ssl_disabled", n, level="critical",
                    title="Azure PostgreSQL: SSL not enforced",
                    message=f"{n.label} does not enforce SSL connections.",
                    fix="Set ssl_enforcement_enabled = true.",
                    standards=["CIS", "PCI", "HIPAA", "NIST"],
                ))
            if is_truthy(cfg(c, "public_network_access_enabled")):
                findings.append(_finding(
                    "azure_postgres_public_access", n, level="critical",
                    title="Azure PostgreSQL: public network access enabled",
                    message=f"{n.label} is reachable from public networks.",
                    fix="Disable public network access and use Private Endpoint.",
                    standards=["CIS", "PCI", "HIPAA", "NIST"],
                ))
            if is_falsy_explicit(cfg(c, "geo_redundant_backup_enabled")):
                findings.append(_finding(
                    "azure_postgres_no_geo_backup", n, level="warning",
                    title="Azure PostgreSQL: geo-redundant backup disabled",
                    message=f"{n.label} stores backups only in a single region.",
                    fix="Enable geo_redundant_backup_enabled for DR.",
                    standards=["NIST", "SOC2"],
                ))
            if is_falsy_explicit(cfg(c, "infrastructure_encryption_enabled")):
                findings.append(_finding(
                    "azure_postgres_infra_encryption_disabled", n, level="info",
                    title="Azure PostgreSQL: infrastructure encryption disabled",
                    message=f"{n.label} does not use double encryption at rest.",
                    fix="Enable infrastructure_encryption_enabled where supported.",
                    standards=["HIPAA", "NIST"],
                ))

        if t == "azure_mysql":
            if is_falsy_explicit(cfg(c, "ssl_enforcement_enabled")):
                findings.append(_finding(
                    "azure_mysql_ssl_disabled", n, level="critical",
                    title="Azure MySQL: SSL not enforced",
                    message=f"{n.label} does not enforce SSL connections.",
                    fix="Set ssl_enforcement_enabled = true.",
                    standards=["CIS", "PCI", "HIPAA", "NIST"],
                ))
            if is_truthy(cfg(c, "public_network_access_enabled")):
                findings.append(_finding(
                    "azure_mysql_public_access", n, level="critical",
                    title="Azure MySQL: public network access enabled",
                    message=f"{n.label} is reachable from public networks.",
                    fix="Disable public network access and use Private Endpoint.",
                    standards=["CIS", "PCI", "HIPAA", "NIST"],
                ))
            if is_falsy_explicit(cfg(c, "geo_redundant_backup_enabled")):
                findings.append(_finding(
                    "azure_mysql_no_geo_backup", n, level="warning",
                    title="Azure MySQL: geo-redundant backup disabled",
                    message=f"{n.label} stores backups only in a single region.",
                    fix="Enable geo_redundant_backup_enabled for DR.",
                    standards=["NIST", "SOC2"],
                ))

        if t == "azure_cosmosdb":
            if not cfg(c, "ip_range_filter") and not cfg(c, "virtual_network_rule"):
                findings.append(_finding(
                    "azure_cosmosdb_public_access", n, level="warning",
                    title="CosmosDB: no network access restriction",
                    message=f"{n.label} is accessible from all networks.",
                    fix="Set ip_range_filter or virtual_network_rule.",
                    standards=["CIS", "NIST", "PCI"],
                ))
            if not cfg(c, "key_vault_key_id") and not cfg_nested(c, "identity", "type"):
                findings.append(_finding(
                    "azure_cosmosdb_no_cmek", n, level="info",
                    title="CosmosDB: no customer-managed key",
                    message=f"{n.label} uses service-managed keys only.",
                    fix="Configure customer-managed keys via Key Vault.",
                    standards=["HIPAA", "PCI", "NIST"],
                ))
            if not is_truthy(cfg(c, "continuous_backup_enabled")) and not cfg(c, "backup"):
                findings.append(_finding(
                    "azure_cosmosdb_no_continuous_backup", n, level="info",
                    title="CosmosDB: continuous backup not configured",
                    message=f"{n.label} may not support point-in-time restore.",
                    fix="Enable continuous backup for production accounts.",
                    standards=["NIST", "SOC2"],
                ))

        if t == "azure_redis":
            if is_truthy(cfg(c, "enable_non_ssl_port")):
                findings.append(_finding(
                    "azure_redis_non_ssl_port", n, level="warning",
                    title="Azure Redis: non-SSL port enabled",
                    message=f"{n.label} has the unencrypted Redis port (6379) enabled.",
                    fix="Set enable_non_ssl_port = false.",
                    standards=["CIS", "PCI", "NIST"],
                ))
            if cfg(c, "minimum_tls_version") not in (None, "1.2"):
                findings.append(_finding(
                    "azure_redis_min_tls_old", n, level="warning",
                    title="Azure Redis: minimum TLS below 1.2",
                    message=f"{n.label} accepts TLS versions below 1.2.",
                    fix="Set minimum_tls_version = '1.2'.",
                    standards=["CIS", "NIST"],
                ))
            if is_truthy(cfg(c, "public_network_access_enabled")):
                findings.append(_finding(
                    "azure_redis_public_access", n, level="critical",
                    title="Azure Redis: public network access enabled",
                    message=f"{n.label} is reachable from public networks.",
                    fix="Disable public network access and use Private Endpoint.",
                    standards=["CIS", "PCI", "NIST"],
                ))
            if not cfg(c, "patch_schedule"):
                findings.append(_finding(
                    "azure_redis_no_patch_schedule", n, level="info",
                    title="Azure Redis: no patch schedule",
                    message=f"{n.label} has no maintenance patch window configured.",
                    fix="Add patch_schedule for controlled maintenance.",
                    standards=["NIST"],
                ))

        if t in STORAGE_TYPES:
            if is_truthy(cfg(c, "allow_nested_items_to_be_public")):
                findings.append(_finding(
                    "azure_storage_public_access", n, level="critical",
                    title="Azure Storage: public blob access allowed",
                    message=f"{n.label} allows public blob/container access.",
                    fix="Set allow_nested_items_to_be_public = false.",
                    standards=["CIS", "PCI", "NIST"],
                ))
            if is_falsy_explicit(cfg(c, "enable_https_traffic_only")):
                findings.append(_finding(
                    "azure_storage_https_only", n, level="warning",
                    title="Azure Storage: HTTPS not enforced",
                    message=f"{n.label} allows unencrypted HTTP traffic.",
                    fix="Set enable_https_traffic_only = true.",
                    standards=["CIS", "PCI", "NIST"],
                ))
            if cfg(c, "min_tls_version") not in (None, "TLS1_2"):
                findings.append(_finding(
                    "azure_storage_min_tls_old", n, level="warning",
                    title="Azure Storage: minimum TLS below 1.2",
                    message=f"{n.label} accepts TLS versions older than 1.2.",
                    fix="Set min_tls_version = 'TLS1_2' on the storage account.",
                    standards=["CIS", "NIST"],
                ))
            if is_truthy(cfg(c, "shared_access_key_enabled")):
                findings.append(_finding(
                    "azure_storage_shared_key_enabled", n, level="warning",
                    title="Azure Storage: shared key access enabled",
                    message=f"{n.label} allows storage account key authentication.",
                    fix="Disable shared_access_key_enabled and use Azure AD RBAC.",
                    standards=["CIS", "NIST", "SOC2"],
                ))
            if is_falsy_explicit(cfg(c, "infrastructure_encryption_enabled")):
                findings.append(_finding(
                    "azure_storage_no_infra_encryption", n, level="info",
                    title="Azure Storage: infrastructure encryption disabled",
                    message=f"{n.label} does not use double encryption at rest.",
                    fix="Enable infrastructure_encryption_enabled.",
                    standards=["HIPAA", "NIST"],
                ))

        if t == "azure_blob":
            if not is_truthy(cfg(c, "versioning_enabled")) and not cfg(c, "blob_properties"):
                findings.append(_finding(
                    "azure_blob_no_versioning", n, level="info",
                    title="Blob Storage: versioning disabled",
                    message=f"{n.label} cannot recover from accidental overwrites.",
                    fix="Enable blob versioning on the storage account.",
                    standards=["NIST", "SOC2"],
                ))
            if not cfg(c, "delete_retention_policy") and not cfg_nested(c, "blob_properties", "delete_retention_policy"):
                findings.append(_finding(
                    "azure_blob_no_soft_delete", n, level="warning",
                    title="Blob Storage: soft delete not configured",
                    message=f"{n.label} has no blob soft-delete retention policy.",
                    fix="Configure delete_retention_policy on blob properties.",
                    standards=["NIST", "SOC2"],
                ))

        if t == "azure_files" and cfg(c, "smb_channel_encryption") not in (None, "AES-256-GCM", "AES-256-GCM-AES-128-GCM"):
            findings.append(_finding(
                "azure_files_weak_smb_encryption", n, level="warning",
                title="Azure Files: weak SMB channel encryption",
                message=f"{n.label} does not require AES-256-GCM SMB channel encryption.",
                fix="Set smb_channel_encryption to AES-256-GCM.",
                standards=["CIS", "NIST"],
            ))

        if t == "azure_disk" and not is_truthy(cfg(c, "encryption_enabled")) and not cfg(c, "disk_encryption_set_id"):
            findings.append(_finding(
                "azure_disk_unencrypted", n, level="critical",
                title="Managed Disk: encryption not enabled",
                message=f"{n.label} is not encrypted with a platform or customer-managed key.",
                fix="Enable encryption or attach a disk_encryption_set_id.",
                standards=["CIS", "PCI", "HIPAA", "NIST"],
            ))

        if t == "azure_keyvault":
            if cfg(c, "soft_delete_retention_days") == 0 or is_falsy_explicit(cfg(c, "soft_delete_enabled")):
                findings.append(_finding(
                    "azure_keyvault_soft_delete_disabled", n, level="critical",
                    title="Key Vault: soft delete not enabled",
                    message=f"{n.label} does not have soft delete enabled.",
                    fix="Set soft_delete_retention_days >= 7.",
                    standards=["CIS", "NIST", "PCI"],
                ))
            if is_falsy_explicit(cfg(c, "purge_protection_enabled")):
                findings.append(_finding(
                    "azure_keyvault_purge_protection_disabled", n, level="critical",
                    title="Key Vault: purge protection not enabled",
                    message=f"{n.label} does not have purge protection enabled.",
                    fix="Set purge_protection_enabled = true.",
                    standards=["CIS", "NIST", "PCI"],
                ))
            if is_truthy(cfg(c, "public_network_access_enabled")):
                findings.append(_finding(
                    "azure_keyvault_public_network", n, level="critical",
                    title="Key Vault: public network access enabled",
                    message=f"{n.label} is reachable from public networks.",
                    fix="Set public_network_access_enabled = false and use Private Endpoint.",
                    standards=["CIS", "PCI", "NIST"],
                ))
            if cfg(c, "network_acls_default_action", "Allow") == "Allow":
                findings.append(_finding(
                    "azure_keyvault_network_default_allow", n, level="warning",
                    title="Key Vault: network ACL default Allow",
                    message=f"{n.label} allows access from networks not explicitly denied.",
                    fix="Set network_acls default_action = Deny with trusted IP/subnet rules.",
                    standards=["CIS", "NIST"],
                ))
            if cfg(c, "enable_rbac_authorization") is False:
                findings.append(_finding(
                    "azure_keyvault_no_rbac", n, level="warning",
                    title="Key Vault: RBAC authorization disabled",
                    message=f"{n.label} uses legacy access policies instead of Azure RBAC.",
                    fix="Set enable_rbac_authorization = true.",
                    standards=["CIS", "NIST", "SOC2"],
                ))

        if t == "azure_functions":
            if is_falsy_explicit(cfg(c, "https_only")):
                findings.append(_finding(
                    "azure_functions_https_only", n, level="warning",
                    title="Azure Functions: HTTPS not enforced",
                    message=f"{n.label} allows unencrypted HTTP traffic.",
                    fix="Set https_only = true.",
                    standards=["CIS", "NIST"],
                ))
            if cfg(c, "minimum_tls_version") not in (None, "1.2"):
                findings.append(_finding(
                    "azure_functions_min_tls_old", n, level="warning",
                    title="Azure Functions: minimum TLS below 1.2",
                    message=f"{n.label} accepts TLS versions below 1.2.",
                    fix="Set minimum_tls_version = '1.2' in site_config.",
                    standards=["CIS", "NIST"],
                ))
            if is_truthy(cfg(c, "public_network_access_enabled")):
                findings.append(_finding(
                    "azure_functions_public_access", n, level="warning",
                    title="Azure Functions: public network access enabled",
                    message=f"{n.label} allows public inbound access to the function app.",
                    fix="Disable public network access and integrate with VNet.",
                    standards=["CIS", "NIST"],
                ))
            if not cfg(c, "virtual_network_subnet_id"):
                findings.append(_finding(
                    "azure_functions_no_vnet", n, level="info",
                    title="Azure Functions: no VNet integration",
                    message=f"{n.label} is not integrated with a virtual network.",
                    fix="Add VNet integration for private resource access.",
                    standards=["NIST"],
                ))

        if t == "azure_app_service":
            if is_falsy_explicit(cfg(c, "https_only")):
                findings.append(_finding(
                    "azure_app_service_https_only", n, level="warning",
                    title="App Service: HTTPS not enforced",
                    message=f"{n.label} allows unencrypted HTTP traffic.",
                    fix="Set https_only = true.",
                    standards=["CIS", "NIST"],
                ))
            if cfg(c, "minimum_tls_version") not in (None, "1.2"):
                findings.append(_finding(
                    "azure_app_service_min_tls_old", n, level="warning",
                    title="App Service: minimum TLS below 1.2",
                    message=f"{n.label} accepts TLS versions below 1.2.",
                    fix="Set minimum_tls_version = '1.2' in site_config.",
                    standards=["CIS", "NIST"],
                ))
            if is_truthy(cfg(c, "public_network_access_enabled")):
                findings.append(_finding(
                    "azure_app_service_public_access", n, level="warning",
                    title="App Service: public network access enabled",
                    message=f"{n.label} allows public inbound access.",
                    fix="Disable public_network_access_enabled for internal apps.",
                    standards=["CIS", "NIST"],
                ))
            if cfg(c, "ftps_state") in ("AllAllowed", "FtpsOnly"):
                findings.append(_finding(
                    "azure_app_service_ftps_enabled", n, level="warning",
                    title="App Service: FTPS enabled",
                    message=f"{n.label} allows FTPS deployments which expand attack surface.",
                    fix="Set ftps_state = Disabled.",
                    standards=["CIS", "NIST"],
                ))
            if is_truthy(cfg(c, "remote_debugging_enabled")):
                findings.append(_finding(
                    "azure_app_service_remote_debugging", n, level="warning",
                    title="App Service: remote debugging enabled",
                    message=f"{n.label} allows remote debugging in production.",
                    fix="Disable remote debugging on production slots.",
                    standards=["NIST"],
                ))

        if t == "azure_acr":
            if is_truthy(cfg(c, "admin_enabled")):
                findings.append(_finding(
                    "azure_acr_admin_enabled", n, level="warning",
                    title="Container Registry: admin user enabled",
                    message=f"{n.label} has the admin user enabled. Use managed identity instead.",
                    fix="Set admin_enabled = false and use role assignments.",
                    standards=["CIS", "NIST", "SOC2"],
                ))
            if is_truthy(cfg(c, "public_network_access_enabled")):
                findings.append(_finding(
                    "azure_acr_public_access", n, level="warning",
                    title="Container Registry: public network access enabled",
                    message=f"{n.label} is reachable from public networks.",
                    fix="Disable public network access and use Private Endpoint.",
                    standards=["CIS", "NIST"],
                ))
            if not cfg(c, "retention_policy") and not is_truthy(cfg(c, "retention_policy_enabled")):
                findings.append(_finding(
                    "azure_acr_no_retention_policy", n, level="info",
                    title="Container Registry: no retention policy",
                    message=f"{n.label} does not automatically purge untagged manifests.",
                    fix="Configure retention_policy for image lifecycle.",
                    standards=["NIST"],
                ))

        if t == "azure_agw":
            sku = str(cfg(c, "sku_name") or "")
            if sku and not sku.startswith("WAF"):
                findings.append(_finding(
                    "azure_agw_no_waf", n, level="warning",
                    title="Application Gateway: WAF not enabled",
                    message=f"{n.label} is not using the WAF_v2 SKU.",
                    fix="Set sku_name = 'WAF_v2' and enable WAF configuration.",
                    standards=["CIS", "PCI", "SOC2"],
                ))
            if cfg(c, "ssl_policy_min_protocol_version") not in (None, "TLSv1_2"):
                findings.append(_finding(
                    "azure_agw_weak_ssl_policy", n, level="warning",
                    title="Application Gateway: weak SSL policy",
                    message=f"{n.label} allows TLS versions below 1.2 on listeners.",
                    fix="Set ssl_policy_min_protocol_version = TLSv1_2.",
                    standards=["CIS", "NIST"],
                ))
            if is_truthy(cfg(c, "http2_enabled")) is False and cfg(c, "listener_protocol") == "Http":
                findings.append(_finding(
                    "azure_agw_http_listener", n, level="warning",
                    title="Application Gateway: HTTP listener present",
                    message=f"{n.label} exposes plain HTTP listeners.",
                    fix="Redirect HTTP to HTTPS or terminate TLS on listeners.",
                    standards=["PCI", "NIST"],
                ))

        if t == "azure_frontdoor":
            if is_falsy_explicit(cfg(c, "https_redirect_enabled")):
                findings.append(_finding(
                    "azure_frontdoor_no_https_redirect", n, level="warning",
                    title="Front Door: HTTPS redirect disabled",
                    message=f"{n.label} does not redirect HTTP to HTTPS.",
                    fix="Enable https_redirect on routing rules.",
                    standards=["PCI", "NIST"],
                ))
            if cfg(c, "minimum_tls_version") not in (None, "1.2"):
                findings.append(_finding(
                    "azure_frontdoor_min_tls_old", n, level="warning",
                    title="Front Door: minimum TLS below 1.2",
                    message=f"{n.label} accepts TLS versions below 1.2.",
                    fix="Set minimum_tls_version = 1.2 on custom domains.",
                    standards=["CIS", "NIST"],
                ))

        if t == "azure_apim":
            if is_truthy(cfg(c, "public_network_access_enabled")):
                findings.append(_finding(
                    "azure_apim_public_access", n, level="warning",
                    title="API Management: public network access enabled",
                    message=f"{n.label} exposes management plane on public networks.",
                    fix="Use internal VNet mode or disable public network access.",
                    standards=["CIS", "NIST"],
                ))
            if cfg(c, "min_api_version") not in (None, "2021-08-01") and cfg(c, "protocols") and "http" in str(cfg(c, "protocols")).lower():
                findings.append(_finding(
                    "azure_apim_http_backend", n, level="info",
                    title="API Management: HTTP backend protocols allowed",
                    message=f"{n.label} may call backends over unencrypted HTTP.",
                    fix="Restrict backends to HTTPS-only.",
                    standards=["PCI", "NIST"],
                ))

        if t == "azure_servicebus":
            if is_truthy(cfg(c, "public_network_access_enabled")):
                findings.append(_finding(
                    "azure_servicebus_public_access", n, level="warning",
                    title="Service Bus: public network access enabled",
                    message=f"{n.label} is reachable from public networks.",
                    fix="Disable public network access and use Private Endpoint.",
                    standards=["CIS", "NIST"],
                ))
            if is_truthy(cfg(c, "local_auth_enabled")):
                findings.append(_finding(
                    "azure_servicebus_local_auth", n, level="warning",
                    title="Service Bus: local authentication enabled",
                    message=f"{n.label} allows shared access signature keys.",
                    fix="Disable local_auth_enabled and use Azure AD RBAC.",
                    standards=["CIS", "NIST", "SOC2"],
                ))

        if t == "azure_eventhub":
            if is_truthy(cfg(c, "public_network_access_enabled")):
                findings.append(_finding(
                    "azure_eventhub_public_access", n, level="warning",
                    title="Event Hubs: public network access enabled",
                    message=f"{n.label} is reachable from public networks.",
                    fix="Disable public network access and use Private Endpoint.",
                    standards=["CIS", "NIST"],
                ))
            if not cfg(c, "capture_description") and not is_truthy(cfg(c, "capture_enabled")):
                findings.append(_finding(
                    "azure_eventhub_no_capture", n, level="info",
                    title="Event Hubs: capture not configured",
                    message=f"{n.label} does not archive events for long-term retention.",
                    fix="Enable capture to Storage or Data Lake for audit pipelines.",
                    standards=["SOC2", "NIST"],
                ))

        if t == "azure_firewall":
            if str(cfg(c, "sku_name", "")).lower() == "basic":
                findings.append(_finding(
                    "azure_firewall_basic_sku", n, level="warning",
                    title="Azure Firewall: Basic SKU",
                    message=f"{n.label} uses Basic SKU without full threat intelligence features.",
                    fix="Use Standard or Premium SKU for production.",
                    standards=["CIS", "NIST"],
                ))
            if is_falsy_explicit(cfg(c, "threat_intel_mode")) or cfg(c, "threat_intel_mode") == "Off":
                findings.append(_finding(
                    "azure_firewall_threat_intel_off", n, level="warning",
                    title="Azure Firewall: threat intelligence off",
                    message=f"{n.label} does not block malicious FQDNs/IPs.",
                    fix="Set threat_intel_mode = Alert or Deny.",
                    standards=["CIS", "NIST"],
                ))
            if not is_truthy(cfg(c, "dns_proxy_enabled")):
                findings.append(_finding(
                    "azure_firewall_dns_proxy_disabled", n, level="info",
                    title="Azure Firewall: DNS proxy disabled",
                    message=f"{n.label} cannot inspect/filter outbound DNS.",
                    fix="Enable DNS proxy for FQDN filtering.",
                    standards=["NIST"],
                ))

        if t == "azure_bastion" and str(cfg(c, "sku", "Basic")).lower() == "basic":
            findings.append(_finding(
                "azure_bastion_basic_sku", n, level="info",
                title="Azure Bastion: Basic SKU",
                message=f"{n.label} uses Basic SKU without zone redundancy or scale units.",
                fix="Use Standard or Premium SKU for production.",
                standards=["NIST", "SOC2"],
            ))

        if t == "azure_waf" and cfg(c, "policy_settings_mode", "Prevention") != "Prevention":
            findings.append(_finding(
                "azure_waf_detection_mode", n, level="warning",
                title="WAF Policy: detection-only mode",
                message=f"{n.label} runs in Detection mode and does not block attacks.",
                fix="Set policy_settings mode to Prevention.",
                standards=["CIS", "PCI", "SOC2"],
            ))

        if t == "azure_vpn_gateway" and cfg(c, "sku") == "Basic":
            findings.append(_finding(
                "azure_vpn_gateway_basic_sku", n, level="info",
                title="VPN Gateway: Basic SKU does not support SLAs",
                message=f"{n.label} uses the Basic SKU which lacks SLA and zone-redundancy.",
                fix="Upgrade to VpnGw1 or higher.",
                standards=["NIST"],
            ))

        if t == "azure_lb" and has_public_ip(c) and not cfg(c, "sku") == "Gateway":
            findings.append(_finding(
                "azure_lb_public_frontend", n, level="info",
                title="Load Balancer: public frontend IP",
                message=f"{n.label} exposes a public frontend — verify WAF protection.",
                fix="Place Application Gateway or Front Door with WAF in front.",
                standards=["PCI", "NIST"],
            ))

        if t == "azure_vnet" and not cfg(c, "ddos_protection_plan"):
            findings.append(_finding(
                "azure_vnet_no_ddos_attachment", n, level="info",
                title="Virtual Network: no DDoS plan attached on resource",
                message=f"{n.label} is not associated with a DDoS Protection Plan at the VNet level.",
                fix="Associate azurerm_network_ddos_protection_plan.",
                standards=["NIST"],
            ))

        if t == "azure_subnet" and not cfg(c, "service_endpoints") and not cfg(c, "delegation"):
            findings.append(_finding(
                "azure_subnet_no_service_endpoints", n, level="info",
                title="Subnet: no service endpoints",
                message=f"{n.label} has no service endpoints for PaaS private access.",
                fix="Add service_endpoints for Storage, SQL, or Key Vault as needed.",
                standards=["NIST"],
            ))

        if t == "azure_openai" and is_truthy(cfg(c, "public_network_access_enabled")):
            findings.append(_finding(
                "azure_openai_public_access", n, level="warning",
                title="Azure OpenAI: public network access enabled",
                message=f"{n.label} is reachable from public networks.",
                fix="Disable public network access and use Private Endpoint.",
                standards=["NIST", "HIPAA"],
            ))

        if t == "azure_search" and is_truthy(cfg(c, "public_network_access_enabled")):
            findings.append(_finding(
                "azure_search_public_access", n, level="warning",
                title="Azure AI Search: public network access enabled",
                message=f"{n.label} is reachable from public networks.",
                fix="Disable public network access and use Private Endpoint.",
                standards=["NIST"],
            ))

        if t == "azure_synapse":
            if is_truthy(cfg(c, "public_network_access_enabled")):
                findings.append(_finding(
                    "azure_synapse_public_access", n, level="critical",
                    title="Azure Synapse: public network access enabled",
                    message=f"{n.label} allows public connectivity to the workspace.",
                    fix="Disable public network access and use managed private endpoints.",
                    standards=["CIS", "PCI", "HIPAA", "NIST"],
                ))
            if not is_truthy(cfg(c, "azuread_authentication_only")):
                findings.append(_finding(
                    "azure_synapse_no_aad_only", n, level="warning",
                    title="Azure Synapse: SQL authentication allowed",
                    message=f"{n.label} allows SQL authentication in addition to Azure AD.",
                    fix="Set azuread_authentication_only = true.",
                    standards=["CIS", "NIST"],
                ))

        if t == "azure_databricks":
            if not cfg(c, "custom_parameters") and not cfg(c, "private_subnet_name"):
                findings.append(_finding(
                    "azure_databricks_no_private_link", n, level="warning",
                    title="Databricks: no private connectivity configured",
                    message=f"{n.label} may use default public control plane paths.",
                    fix="Deploy with VNet injection and private endpoints.",
                    standards=["CIS", "NIST"],
                ))
            if not is_truthy(cfg(c, "diagnostic_logs_enabled")):
                findings.append(_finding(
                    "azure_databricks_no_diag_logs", n, level="info",
                    title="Databricks: diagnostic logs not enabled",
                    message=f"{n.label} lacks audit logging to Log Analytics.",
                    fix="Enable diagnostic settings for clusters and accounts.",
                    standards=["SOC2", "NIST"],
                ))

        if t == "azure_datafactory":
            if is_truthy(cfg(c, "public_network_enabled")):
                findings.append(_finding(
                    "azure_datafactory_public", n, level="warning",
                    title="Data Factory: public network access enabled",
                    message=f"{n.label} allows public connectivity.",
                    fix="Disable public_network_enabled and use managed VNet.",
                    standards=["NIST"],
                ))
            if not cfg(c, "github_configuration") and not cfg(c, "vsts_configuration"):
                findings.append(_finding(
                    "azure_datafactory_no_git", n, level="info",
                    title="Data Factory: no Git integration",
                    message=f"{n.label} is not backed by Git for change control.",
                    fix="Configure GitHub or Azure DevOps integration.",
                    standards=["SOC2", "NIST"],
                ))

        if t == "azure_container_apps":
            ingress = cfg(c, "ingress")
            external = cfg(c, "ingress_external_enabled") is True
            if isinstance(ingress, dict):
                external = external or ingress.get("external_enabled") is True
            if external:
                findings.append(_finding(
                    "azure_container_apps_external_ingress", n, level="warning",
                    title="Container Apps: external ingress enabled",
                    message=f"{n.label} accepts traffic from the public internet.",
                    fix="Use internal ingress with Application Gateway or Front Door.",
                    standards=["CIS", "NIST"],
                ))

        if t == "azure_aci" and has_public_ip(c):
            findings.append(_finding(
                "azure_aci_public_ip", n, level="warning",
                title="Container Instances: public IP assigned",
                message=f"{n.label} exposes container groups on a public IP.",
                fix="Run inside a VNet without public IP.",
                standards=["CIS", "NIST"],
            ))

        if t == "azure_spring_apps" and is_truthy(cfg(c, "is_public")):
            findings.append(_finding(
                "azure_spring_public_endpoint", n, level="warning",
                title="Spring Apps: public endpoint enabled",
                message=f"{n.label} exposes apps on a public URL.",
                fix="Use VNet injection and private DNS.",
                standards=["NIST"],
            ))

        if t == "azure_log_analytics" and int(cfg(c, "retention_in_days", 30) or 0) < 90:
            findings.append(_finding(
                "azure_log_analytics_short_retention", n, level="info",
                title="Log Analytics: retention below 90 days",
                message=f"{n.label} may not meet long-term audit retention requirements.",
                fix="Increase retention_in_days to at least 90 for compliance workloads.",
                standards=["SOC2", "NIST", "PCI"],
            ))

        if t == "azure_app_insights" and int(cfg(c, "retention_in_days", 90) or 0) < 90:
            findings.append(_finding(
                "azure_app_insights_short_retention", n, level="info",
                title="Application Insights: retention below 90 days",
                message=f"{n.label} retains telemetry for less than 90 days.",
                fix="Increase retention or export to Log Analytics with longer retention.",
                standards=["SOC2", "NIST"],
            ))

        if t == "azure_defender" and is_falsy_explicit(cfg(c, "enabled")):
            findings.append(_finding(
                "azure_defender_disabled", n, level="warning",
                title="Microsoft Defender: plan disabled",
                message=f"{n.label} has Defender pricing/plan disabled.",
                fix="Enable Defender plans for servers, containers, or databases as applicable.",
                standards=["CIS", "NIST", "SOC2"],
            ))

        if t == "azure_traffic_mgr" and is_falsy_explicit(cfg(c, "https_only")):
            findings.append(_finding(
                "azure_traffic_mgr_http_allowed", n, level="warning",
                title="Traffic Manager: HTTP endpoints allowed",
                message=f"{n.label} may route traffic to HTTP-only endpoints.",
                fix="Use HTTPS-only endpoints or enable HTTPS monitoring.",
                standards=["PCI", "NIST"],
            ))

        if t == "azure_logicapp" and is_truthy(cfg(c, "public_network_access_enabled")):
            findings.append(_finding(
                "azure_logicapp_public_access", n, level="warning",
                title="Logic Apps: public network access enabled",
                message=f"{n.label} allows public workflow triggers or connectors.",
                fix="Disable public network access and use private endpoints.",
                standards=["NIST"],
            ))

        if t == "azure_signalr" and is_truthy(cfg(c, "public_network_access_enabled")):
            findings.append(_finding(
                "azure_signalr_public_access", n, level="warning",
                title="SignalR: public network access enabled",
                message=f"{n.label} is reachable from public networks.",
                fix="Disable public network access and use private endpoints.",
                standards=["NIST"],
            ))

        if t == "azure_monitor" and not cfg(c, "action_group_id") and not cfg(c, "scopes"):
            findings.append(_finding(
                "azure_monitor_no_action_group", n, level="info",
                title="Monitor alert without action group",
                message=f"{n.label} has no action group for notifications.",
                fix="Associate an action group with metric or activity log alerts.",
                standards=["SOC2", "NIST"],
            ))

    return findings


# ─── Topology rules (~40) ─────────────────────────────────────────────────────


def azure_topology_findings(nodes: list[Node], edges) -> list[Finding]:
    findings: list[Finding] = []
    types = node_types(nodes)
    node_map = {n.id: n for n in nodes}

    for n in nodes:
        t = n.type

        if t in DB_TYPES and "azure_keyvault" not in types:
            findings.append(_finding(
                "azure_no_keyvault", n, level="warning",
                title="No Key Vault in architecture",
                message="Architecture has databases/services but no Key Vault for secrets management.",
                fix="Add azurerm_key_vault with purge_protection_enabled = true.",
                standards=["CIS", "NIST", "SOC2"],
            ))

        if t in COMPUTE_TYPES and "azure_log_analytics" not in types:
            findings.append(_finding(
                "azure_no_log_analytics", n, level="warning",
                title="No Log Analytics workspace",
                message=f"{n.label} has no Log Analytics workspace for centralized logging.",
                fix="Add azurerm_log_analytics_workspace.",
                standards=["CIS", "SOC2", "NIST"],
            ))

        if t in COMPUTE_TYPES and not types & {"azure_monitor", "azure_app_insights"}:
            findings.append(_finding(
                "azure_no_monitor", n, level="info",
                title="No Azure Monitor or App Insights",
                message=f"{n.label} has no observability infrastructure.",
                fix="Add azurerm_application_insights or azurerm_monitor_metric_alert.",
                standards=["NIST", "SOC2"],
            ))

        if t in STATEFUL_TYPES and "azure_backup" not in types:
            findings.append(_finding(
                "azure_no_backup", n, level="warning",
                title="No backup vault for stateful resources",
                message=f"{n.label} has no Azure Backup vault configured.",
                fix="Add azurerm_recovery_services_vault.",
                standards=["NIST", "SOC2"],
            ))

        if t == "azure_aks" and "azure_acr" not in types:
            findings.append(_finding(
                "azure_aks_no_acr", n, level="info",
                title="AKS without Container Registry",
                message=f"{n.label} has no Container Registry for storing container images.",
                fix="Add azurerm_container_registry linked to AKS.",
                standards=["CIS", "NIST"],
            ))

        if t == "azure_vm" and "azure_bastion" not in types:
            findings.append(_finding(
                "azure_vm_no_bastion", n, level="warning",
                title="VMs present without Azure Bastion",
                message=f"{n.label} is accessible without a Bastion host.",
                fix="Add azurerm_bastion_host in a dedicated AzureBastionSubnet.",
                standards=["CIS", "NIST"],
            ))

        if t == "azure_vnet" and "azure_ddos" not in types:
            findings.append(_finding(
                "azure_no_ddos_protection", n, level="info",
                title="No DDoS Protection Plan",
                message=f"{n.label} has no DDoS Protection Plan attached.",
                fix="Add azurerm_network_ddos_protection_plan.",
                standards=["NIST"],
            ))

        if t == "azure_vm":
            has_lb_or_agw = has_neighbor_type(
                n.id, {"azure_agw", "azure_lb", "azure_frontdoor"}, nodes, edges,
            )
            if label_has_internet(n.id, nodes, edges) and not has_lb_or_agw:
                findings.append(_finding(
                    "azure_internet_facing_vm", n, level="critical",
                    title="VM directly internet-facing",
                    message=f"{n.label} appears to be directly internet-facing without a load balancer.",
                    fix="Place an Application Gateway or Load Balancer in front of the VM.",
                    standards=["CIS", "PCI", "NIST"],
                ))
            if not has_neighbor_type(n.id, {"azure_nsg"}, nodes, edges):
                findings.append(_finding(
                    "azure_vm_no_nsg", n, level="warning",
                    title="VM without NSG in topology",
                    message=f"{n.label} has no associated NSG component on the canvas.",
                    fix="Associate an NSG with the VM subnet or NIC.",
                    standards=["CIS", "NIST", "PCI"],
                ))

        if t == "azure_sql" and not has_neighbor_type(n.id, {"azure_private_endpoint"}, nodes, edges):
            findings.append(_finding(
                "azure_sql_no_private_endpoint", n, level="warning",
                title="Azure SQL: no Private Endpoint",
                message=f"{n.label} has no Private Endpoint. Database may be publicly accessible.",
                fix="Add azurerm_private_endpoint with subresource 'sqlServer'.",
                standards=["CIS", "PCI", "HIPAA", "NIST"],
            ))

        if t in {"azure_blob", "azure_datalake"} and not has_neighbor_type(n.id, {"azure_private_endpoint"}, nodes, edges):
            findings.append(_finding(
                "azure_storage_no_private_endpoint", n, level="info",
                title="Storage: no Private Endpoint",
                message=f"{n.label} has no Private Endpoint. Storage is accessible over the internet.",
                fix="Add azurerm_private_endpoint with subresource 'blob'.",
                standards=["NIST"],
            ))

        if t == "azure_postgres" and not has_neighbor_type(n.id, {"azure_private_endpoint"}, nodes, edges):
            findings.append(_finding(
                "azure_postgres_no_private_endpoint", n, level="warning",
                title="PostgreSQL: no Private Endpoint",
                message=f"{n.label} has no Private Endpoint in the architecture.",
                fix="Add azurerm_private_endpoint for PostgreSQL.",
                standards=["CIS", "HIPAA", "NIST"],
            ))

        if t == "azure_mysql" and not has_neighbor_type(n.id, {"azure_private_endpoint"}, nodes, edges):
            findings.append(_finding(
                "azure_mysql_no_private_endpoint", n, level="warning",
                title="MySQL: no Private Endpoint",
                message=f"{n.label} has no Private Endpoint in the architecture.",
                fix="Add azurerm_private_endpoint for MySQL.",
                standards=["CIS", "HIPAA", "NIST"],
            ))

        if t == "azure_cosmosdb" and not has_neighbor_type(n.id, {"azure_private_endpoint"}, nodes, edges):
            findings.append(_finding(
                "azure_cosmosdb_no_private_endpoint", n, level="warning",
                title="CosmosDB: no Private Endpoint",
                message=f"{n.label} has no Private Endpoint in the architecture.",
                fix="Add azurerm_private_endpoint for Cosmos DB.",
                standards=["CIS", "NIST"],
            ))

        if t == "azure_redis" and not has_neighbor_type(n.id, {"azure_private_endpoint"}, nodes, edges):
            findings.append(_finding(
                "azure_redis_no_private_endpoint", n, level="warning",
                title="Redis: no Private Endpoint",
                message=f"{n.label} has no Private Endpoint in the architecture.",
                fix="Add azurerm_private_endpoint for Redis.",
                standards=["CIS", "NIST"],
            ))

        if t == "azure_keyvault" and not has_neighbor_type(n.id, {"azure_private_endpoint"}, nodes, edges):
            findings.append(_finding(
                "azure_keyvault_no_private_endpoint", n, level="info",
                title="Key Vault: no Private Endpoint",
                message=f"{n.label} has no Private Endpoint in the architecture.",
                fix="Add azurerm_private_endpoint for Key Vault.",
                standards=["NIST"],
            ))

        if t == "azure_apim":
            if not has_neighbor_type(n.id, WAF_TYPES, nodes, edges):
                findings.append(_finding(
                    "azure_apim_no_waf", n, level="warning",
                    title="APIM: no WAF or Application Gateway in front",
                    message=f"{n.label} has no WAF protecting the API gateway.",
                    fix="Place azurerm_application_gateway (WAF_v2) or Azure Front Door in front of APIM.",
                    standards=["PCI", "SOC2", "CIS"],
                ))

        if t == "azure_aks" and "azure_defender" not in types:
            findings.append(_finding(
                "azure_aks_no_defender", n, level="warning",
                title="AKS: Microsoft Defender for Containers not enabled",
                message=f"{n.label} has no Microsoft Defender for Containers.",
                fix="Add azurerm_security_center_subscription_pricing for Containers.",
                standards=["CIS", "NIST", "SOC2"],
            ))

        if t == "azure_log_analytics" and "azure_sentinel" not in types:
            findings.append(_finding(
                "azure_no_sentinel", n, level="info",
                title="No Microsoft Sentinel (SIEM)",
                message="Log Analytics workspace present but no Sentinel SIEM enabled.",
                fix="Add azurerm_sentinel_log_analytics_workspace_onboarding.",
                standards=["NIST", "SOC2"],
            ))

        if t in COMPUTE_TYPES and "azure_vnet" not in types:
            findings.append(_finding(
                "azure_compute_no_vnet", n, level="warning",
                title="Compute without Virtual Network",
                message=f"{n.label} is not in a VNet-scoped architecture.",
                fix="Add azurerm_virtual_network and subnets.",
                standards=["CIS", "NIST"],
            ))

        if t in PUBLIC_EDGE_TYPES and not types & WAF_TYPES:
            findings.append(_finding(
                "azure_public_edge_no_waf", n, level="warning",
                title="Public edge without WAF",
                message=f"{n.label} serves public traffic without a WAF component.",
                fix="Add Application Gateway WAF_v2, Front Door, or standalone WAF policy.",
                standards=["PCI", "SOC2", "CIS"],
            ))

        if t == "azure_vnet" and "azure_firewall" not in types and any(x.type in COMPUTE_TYPES for x in nodes):
            findings.append(_finding(
                "azure_vnet_no_firewall", n, level="info",
                title="VNet without Azure Firewall",
                message=f"{n.label} hub/spoke design lacks a central Azure Firewall.",
                fix="Add azurerm_firewall for egress/ingress inspection.",
                standards=["NIST"],
            ))

        if t == "azure_vmss" and not has_neighbor_type(n.id, {"azure_lb", "azure_agw"}, nodes, edges):
            findings.append(_finding(
                "azure_vmss_no_lb", n, level="info",
                title="VMSS not behind load balancer",
                message=f"{n.label} is not connected to a load balancer on the canvas.",
                fix="Attach VMSS to Application Gateway or Load Balancer backend pool.",
                standards=["NIST", "SOC2"],
            ))

        if t == "azure_openai" and not has_neighbor_type(n.id, {"azure_private_endpoint"}, nodes, edges):
            findings.append(_finding(
                "azure_openai_no_private_endpoint", n, level="warning",
                title="Azure OpenAI: no Private Endpoint",
                message=f"{n.label} has no Private Endpoint in the architecture.",
                fix="Add azurerm_private_endpoint for Azure OpenAI.",
                standards=["NIST", "HIPAA"],
            ))

        if t == "azure_servicebus" and not has_neighbor_type(n.id, {"azure_private_endpoint"}, nodes, edges):
            findings.append(_finding(
                "azure_servicebus_no_private_endpoint", n, level="info",
                title="Service Bus: no Private Endpoint",
                message=f"{n.label} has no Private Endpoint in the architecture.",
                fix="Add azurerm_private_endpoint for Service Bus.",
                standards=["NIST"],
            ))

        if t == "azure_eventhub" and not has_neighbor_type(n.id, {"azure_private_endpoint"}, nodes, edges):
            findings.append(_finding(
                "azure_eventhub_no_private_endpoint", n, level="info",
                title="Event Hubs: no Private Endpoint",
                message=f"{n.label} has no Private Endpoint in the architecture.",
                fix="Add azurerm_private_endpoint for Event Hubs.",
                standards=["NIST"],
            ))

        if t == "azure_app_service" and not has_neighbor_type(n.id, {"azure_private_endpoint"}, nodes, edges):
            findings.append(_finding(
                "azure_app_service_no_private_endpoint", n, level="info",
                title="App Service: no Private Endpoint",
                message=f"{n.label} has no Private Endpoint for inbound private access.",
                fix="Add azurerm_private_endpoint for sites.",
                standards=["NIST"],
            ))

        if t == "azure_functions" and "azure_keyvault" not in types:
            findings.append(_finding(
                "azure_functions_no_keyvault", n, level="info",
                title="Functions without Key Vault",
                message=f"{n.label} may store secrets in app settings.",
                fix="Reference secrets from Key Vault.",
                standards=["CIS", "NIST"],
            ))

        if t == "azure_acr" and not has_neighbor_type(n.id, {"azure_private_endpoint"}, nodes, edges):
            findings.append(_finding(
                "azure_acr_no_private_endpoint", n, level="info",
                title="ACR: no Private Endpoint",
                message=f"{n.label} has no Private Endpoint for pull/push from VNet.",
                fix="Add azurerm_private_endpoint for Container Registry.",
                standards=["CIS", "NIST"],
            ))

        if t in DB_TYPES and "azure_defender" not in types:
            findings.append(_finding(
                "azure_db_no_defender", n, level="info",
                title="Database without Defender for Cloud",
                message=f"{n.label} architecture lacks Defender database plan.",
                fix="Enable Defender for SQL, Cosmos DB, or open-source databases.",
                standards=["CIS", "NIST"],
            ))

        if len(nodes) > 1 and not edges:
            findings.append(_finding(
                "azure_orphaned_nodes", n, level="info",
                title="Resources not connected on canvas",
                message=f"{n.label} is not connected to other resources.",
                fix="Draw edges to document data flows and dependencies.",
                standards=["NIST"],
            ))

        if t == "azure_databricks" and "azure_vnet" not in types:
            findings.append(_finding(
                "azure_databricks_no_vnet", n, level="warning",
                title="Databricks without VNet in architecture",
                message=f"{n.label} is not deployed into a customer-managed VNet.",
                fix="Use VNet injection for Databricks workspaces.",
                standards=["CIS", "NIST"],
            ))

        if t == "azure_sql" and reachable_types(n.id, edges, nodes).intersection(PUBLIC_EDGE_TYPES):
            findings.append(_finding(
                "azure_sql_public_path", n, level="critical",
                title="SQL on public edge path",
                message=f"{n.label} is connected to a public-facing edge component.",
                fix="Remove public paths; use Private Endpoint only.",
                standards=["CIS", "PCI", "HIPAA", "NIST"],
            ))

        if t == "azure_synapse" and not has_neighbor_type(n.id, {"azure_private_endpoint"}, nodes, edges):
            findings.append(_finding(
                "azure_synapse_no_private_endpoint", n, level="warning",
                title="Synapse: no Private Endpoint",
                message=f"{n.label} has no Private Endpoint in the architecture.",
                fix="Add managed private endpoints for Synapse workspace.",
                standards=["CIS", "HIPAA", "NIST"],
            ))

        if t == "azure_frontdoor" and "azure_waf" not in types and not cfg(n.config, "web_application_firewall_policy_id"):
            findings.append(_finding(
                "azure_frontdoor_no_waf_policy", n, level="warning",
                title="Front Door without WAF policy",
                message=f"{n.label} has no linked WAF policy in architecture.",
                fix="Associate a WAF policy with Front Door routes.",
                standards=["PCI", "SOC2", "CIS"],
            ))

        if t == "azure_hybrid" and "azure_vpn_gateway" not in types and "azure_firewall" not in types:
            if t == "azure_hybrid":
                findings.append(_finding(
                    "azure_hybrid_no_vpn", n, level="info",
                    title="Hybrid connection without VPN gateway",
                    message=f"{n.label} lacks VPN/ExpressRoute gateway in architecture.",
                    fix="Add VPN Gateway or ExpressRoute for hybrid connectivity.",
                    standards=["NIST"],
                ))

    return findings


# ─── NSG rules (~16) ──────────────────────────────────────────────────────────

AZURE_NSG_PORT_RULES: tuple[tuple[str, int, str, str, str], ...] = (
    ("azure_nsg_ssh_open", 22, "critical", "SSH", "Restrict SSH to known IP ranges or use Azure Bastion."),
    ("azure_nsg_rdp_open", 3389, "critical", "RDP", "Block RDP from the internet; use Azure Bastion."),
    ("azure_nsg_postgres_open", 5432, "critical", "PostgreSQL", "Scope PostgreSQL to application subnet CIDR only."),
    ("azure_nsg_mysql_open", 3306, "critical", "MySQL", "Scope MySQL to application subnet CIDR only."),
    ("azure_nsg_redis_open", 6380, "critical", "Redis (TLS)", "Never expose Redis to the internet."),
    ("azure_nsg_redis_plain_open", 6379, "critical", "Redis", "Disable non-TLS Redis port exposure."),
    ("azure_nsg_mongodb_open", 27017, "critical", "MongoDB", "Restrict MongoDB to private CIDR ranges."),
    ("azure_nsg_memcached_open", 11211, "critical", "Memcached", "Memcached must not be internet-facing."),
    ("azure_nsg_elasticsearch_open", 9200, "critical", "Elasticsearch", "Restrict search APIs to private networks."),
    ("azure_nsg_kafka_open", 9092, "critical", "Kafka", "Scope Kafka broker ports to client subnets."),
    ("azure_nsg_sql_server_open", 1433, "critical", "SQL Server", "Do not expose SQL Server to the internet."),
    ("azure_nsg_http_open", 80, "warning", "HTTP", "Prefer HTTPS-only ingress from trusted sources."),
    ("azure_nsg_https_open", 443, "info", "HTTPS", "Verify WAF protects public HTTPS ingress."),
)


def _rule_matches_port(rule: SGRule, port: int) -> bool:
    if rule.protocol in ("all", "-1", "icmp"):
        return True
    text = str(rule.port)
    if text in ("-1", "*", "all"):
        return True
    if "-" in text:
        start, end = text.split("-", 1)
        try:
            return int(start) <= port <= int(end)
        except ValueError:
            return False
    try:
        return int(text) == port
    except ValueError:
        return False


def _is_public_source(source: str) -> bool:
    return source in ("0.0.0.0/0", "::/0", "all", "0.0.0.0", "*")


def _sg_allows_all_public(sg: SecurityGroup) -> bool:
    for rule in sg.inbound:
        if rule.protocol in ("all", "-1", "*") and _is_public_source(rule.source):
            return True
        if _is_public_source(rule.source) and rule.protocol in ("tcp", "udp"):
            port = str(rule.port)
            if port in ("-1", "*", "all", "0-65535", "None"):
                return True
    return False


def _is_wide_range(rule: SGRule) -> bool:
    text = str(rule.port)
    if text in ("-1", "*", "all"):
        return False
    if "-" in text:
        start, end = text.split("-", 1)
        try:
            return (int(end) - int(start)) >= 1000 and _is_public_source(rule.source)
        except ValueError:
            return False
    return False


def azure_nsg_findings(security_groups: list[SecurityGroup]) -> list[Finding]:
    findings: list[Finding] = []
    for sg in security_groups:
        if _sg_allows_all_public(sg):
            findings.append(_sg_finding(
                "azure_nsg_all_traffic_open", sg, level="critical",
                title="NSG: all inbound traffic allowed from internet",
                message=f'NSG "{sg.name}" allows all inbound traffic from the internet.',
                fix="Remove the catch-all allow-all inbound rule.",
                standards=["CIS", "NIST", "PCI"],
            ))
        for rule_id, port, level, label, fix in AZURE_NSG_PORT_RULES:
            for inbound in sg.inbound:
                if _rule_matches_port(inbound, port) and _is_public_source(inbound.source):
                    findings.append(_sg_finding(
                        rule_id, sg, level=level,
                        title=f"NSG: {label} ({port}) open to internet",
                        message=f'NSG "{sg.name}" allows {label} port {port} from the internet.',
                        fix=fix,
                        standards=["CIS", "NIST", "PCI"],
                    ))
                    break
        for inbound in sg.inbound:
            if inbound.protocol == "icmp" and _is_public_source(inbound.source):
                findings.append(_sg_finding(
                    "azure_nsg_icmp_open", sg, level="warning",
                    title="NSG: ICMP open to internet",
                    message=f'NSG "{sg.name}" allows ICMP from the internet.',
                    fix="Remove ICMP from public ingress unless required.",
                    standards=["CIS", "NIST"],
                ))
                break
        if any(_is_wide_range(r) for r in sg.inbound):
            findings.append(_sg_finding(
                "azure_nsg_wide_range_open", sg, level="warning",
                title="NSG: wide port range open to internet",
                message=f'NSG "{sg.name}" allows a wide port range from the internet.',
                fix="Narrow the port range to only required ports.",
                standards=["CIS", "NIST"],
            ))
    return findings


# ─── RBAC / IAM rules (~10) ───────────────────────────────────────────────────


def _action_matches(actions: list[str], *patterns: str) -> bool:
    joined = " ".join(actions).lower()
    return any(p.lower() in joined for p in patterns)


def azure_iam_findings(iam_roles: list[IAMRole]) -> list[Finding]:
    findings: list[Finding] = []
    for role in iam_roles:
        for stmt in role.policies:
            if stmt.effect != "Allow":
                continue
            actions = [str(a) for a in stmt.actions]
            resources = [str(r) for r in stmt.resources]
            if _action_matches(actions, "owner", "/owner"):
                findings.append(_iam_finding(
                    "azure_iam_owner_binding", role,
                    level="critical",
                    title="RBAC: Owner role assignment",
                    message=f'RBAC binding "{role.name}" grants Owner at subscription or resource group scope.',
                    fix="Replace Owner with least-privilege custom roles.",
                    standards=["CIS", "NIST", "SOC2"],
                ))
            if _action_matches(actions, "contributor", "/contributor") and any(r == "*" for r in resources):
                findings.append(_iam_finding(
                    "azure_iam_contributor_wildcard", role,
                    level="critical",
                    title="RBAC: Contributor on broad scope",
                    message=f'RBAC binding "{role.name}" grants Contributor with wildcard scope.',
                    fix="Scope Contributor to specific resource groups.",
                    standards=["CIS", "NIST", "SOC2"],
                ))
            if any(
                p in r.lower()
                for r in resources
                for p in ("allusers", "allauthenticatedusers", "everyone", "public")
            ):
                findings.append(_iam_finding(
                    "azure_iam_public_principal", role,
                    level="critical",
                    title="RBAC: public principal assignment",
                    message=f'RBAC binding "{role.name}" grants access to a public principal.',
                    fix="Remove public principal assignments.",
                    standards=["CIS", "NIST", "PCI", "SOC2"],
                ))
            if _action_matches(actions, "user access administrator"):
                findings.append(_iam_finding(
                    "azure_iam_user_access_admin", role,
                    level="warning",
                    title="RBAC: User Access Administrator",
                    message=f'RBAC binding "{role.name}" can grant roles to others (privilege escalation).',
                    fix="Limit User Access Administrator to break-glass admins.",
                    standards=["CIS", "NIST", "SOC2"],
                ))
            if _action_matches(actions, "key vault administrator", "keyvault administrator"):
                findings.append(_iam_finding(
                    "azure_iam_keyvault_admin", role,
                    level="warning",
                    title="RBAC: Key Vault Administrator",
                    message=f'RBAC binding "{role.name}" has full Key Vault administrative access.',
                    fix="Use Key Vault Secrets User/Crypto Officer scoped to vaults.",
                    standards=["CIS", "NIST", "HIPAA"],
                ))
            if _action_matches(actions, "storage blob data owner") and any(r == "*" for r in resources):
                findings.append(_iam_finding(
                    "azure_iam_storage_blob_owner", role,
                    level="warning",
                    title="RBAC: Storage Blob Data Owner on wildcard",
                    message=f'RBAC binding "{role.name}" can modify all blob data in scope.',
                    fix="Use Storage Blob Data Contributor on specific containers.",
                    standards=["CIS", "NIST", "PCI"],
                ))
            if _action_matches(actions, "sql db contributor", "sql server contributor"):
                findings.append(_iam_finding(
                    "azure_iam_sql_contributor", role,
                    level="warning",
                    title="RBAC: broad SQL contributor role",
                    message=f'RBAC binding "{role.name}" can modify SQL servers or databases.',
                    fix="Use SQL DB Contributor only on required databases.",
                    standards=["CIS", "NIST", "HIPAA"],
                ))
            if _action_matches(actions, "managed identity operator", "managed identity contributor"):
                findings.append(_iam_finding(
                    "azure_iam_managed_identity_operator", role,
                    level="info",
                    title="RBAC: managed identity management",
                    message=f'RBAC binding "{role.name}" can assign or manage managed identities.',
                    fix="Restrict identity role assignments to platform admins.",
                    standards=["NIST", "SOC2"],
                ))
            if _action_matches(actions, "key vault secrets officer") and any(r == "*" for r in resources):
                findings.append(_iam_finding(
                    "azure_iam_secrets_officer_wildcard", role,
                    level="warning",
                    title="RBAC: Key Vault Secrets Officer on wildcard",
                    message=f'RBAC binding "{role.name}" can read secrets across all vaults in scope.',
                    fix="Scope secrets officer to specific Key Vault resources.",
                    standards=["CIS", "NIST", "HIPAA"],
                ))
            if _action_matches(actions, "classic administrator", "co-administrator"):
                findings.append(_iam_finding(
                    "azure_iam_classic_admin", role,
                    level="critical",
                    title="RBAC: classic co-administrator",
                    message=f'RBAC binding "{role.name}" uses legacy subscription co-administrator rights.',
                    fix="Remove classic administrators; use Azure RBAC only.",
                    standards=["CIS", "NIST", "SOC2"],
                ))
    return findings


def run_azure_validation(
    nodes: list[Node],
    edges,
    security_groups: list[SecurityGroup],
    iam_roles: list[IAMRole],
) -> list[Finding]:
    findings: list[Finding] = []
    findings.extend(azure_config_findings(nodes))
    findings.extend(azure_topology_findings(nodes, edges))
    findings.extend(azure_nsg_findings(security_groups))
    findings.extend(azure_iam_findings(iam_roles))
    return findings


def azure_rule_ids() -> set[str]:
    """Return all Azure rule IDs for parity tests."""
    import re
    from pathlib import Path
    text = Path(__file__).with_name("azure_validate.py").read_text(encoding="utf-8")
    ids = set(re.findall(r'_finding\(\s*"(azure_[^"]+)"', text))
    ids |= set(re.findall(r'_sg_finding\(\s*"(azure_[^"]+)"', text))
    ids |= set(re.findall(r'_iam_finding\(\s*"(azure_[^"]+)"', text))
    ids |= {rule_id for rule_id, *_ in AZURE_NSG_PORT_RULES}
    return ids
