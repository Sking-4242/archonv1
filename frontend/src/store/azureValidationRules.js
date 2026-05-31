/**
 * Azure validation rules for the Archon Pro canvas engine.
 * Full parity with archon-cli/archon_cli/azure_validate.py + azure_helpers.py.
 */

// ─── Helpers (ported from azure_helpers.py) ───────────────────────────────────

function nodeConfig(node) {
  return node.data?.config ?? {};
}

function cfg(node, key, fallback = undefined) {
  const value = nodeConfig(node)[key];
  return value === undefined || value === null ? fallback : value;
}

function cfgNested(node, ...keys) {
  let current = nodeConfig(node);
  for (const key of keys) {
    if (typeof current !== "object" || current === null) return undefined;
    current = current[key];
    if (current === undefined || current === null) return undefined;
  }
  return current;
}

function isTruthy(value) {
  if (typeof value === "boolean") return value;
  if (value === undefined || value === null) return false;
  if (typeof value === "string") {
    return ["1", "true", "yes", "on", "enabled"].includes(value.trim().toLowerCase());
  }
  return Boolean(value);
}

function isFalsyExplicit(value) {
  if (typeof value === "boolean") return value === false;
  if (typeof value === "string") {
    return ["0", "false", "no", "off", "disabled"].includes(value.trim().toLowerCase());
  }
  return false;
}

function hasPublicIp(node) {
  if (isTruthy(cfg(node, "public_ip"))) return true;
  if (cfg(node, "public_ip_address")) return true;
  let interfaces = cfg(node, "network_interface") ?? [];
  if (interfaces && typeof interfaces === "object" && !Array.isArray(interfaces)) {
    interfaces = [interfaces];
  }
  for (const iface of interfaces) {
    if (!iface || typeof iface !== "object") continue;
    if (iface.public_ip_address || iface.public_ip_address_id) return true;
  }
  return false;
}

function nodeTypes(nodes) {
  return new Set(nodes.map((n) => n.type));
}

function neighborIds(nodeId, edges) {
  const result = [];
  for (const edge of edges) {
    if (edge.source === nodeId) result.push(edge.target);
    else if (edge.target === nodeId) result.push(edge.source);
  }
  return result;
}

function hasNeighborType(nodeId, types, nodes, edges) {
  const typeSet = types instanceof Set ? types : new Set(Array.isArray(types) ? types : [types]);
  const neighbors = neighborIds(nodeId, edges);
  return nodes.some((n) => neighbors.includes(n.id) && typeSet.has(n.type));
}

function reachableTypes(nodeId, edges, nodes, maxHops = 3) {
  const visited = new Set([nodeId]);
  let frontier = [nodeId];
  const found = new Set();
  for (let hop = 0; hop < maxHops; hop++) {
    const nextFrontier = [];
    for (const current of frontier) {
      for (const nid of neighborIds(current, edges)) {
        if (visited.has(nid)) continue;
        visited.add(nid);
        const node = nodes.find((n) => n.id === nid);
        if (node) found.add(node.type);
        nextFrontier.push(nid);
      }
    }
    frontier = nextFrontier;
  }
  return found;
}

function labelHasInternet(nodeId, nodes, edges) {
  const nodeMap = Object.fromEntries(nodes.map((n) => [n.id, n]));
  for (const nid of neighborIds(nodeId, edges)) {
    const neighbor = nodeMap[nid];
    if (neighbor && label(neighbor).toLowerCase().includes("internet")) return true;
  }
  return false;
}

function label(node) {
  return node.data?.label ?? node.type;
}

function intCfg(node, key, fallback = 0) {
  const raw = cfg(node, key, fallback);
  return parseInt(raw ?? fallback ?? 0, 10) || 0;
}

function configRule({ id, level, title, types, check, message, fix, suggestion = "", standards = [] }) {
  const typeSet = Array.isArray(types) ? types : [types];
  return {
    id,
    level,
    title,
    applies: (n) => typeSet.includes(n.type),
    check: (n) => check(n),
    message: typeof message === "function" ? message : (n) => message,
    fix,
    suggestion,
    standards,
  };
}

function topologyRule({ id, level, title, applies, check, message, fix, suggestion = "", standards = [] }) {
  return {
    id,
    level,
    title,
    applies,
    check,
    message: typeof message === "function" ? message : (n) => message,
    fix,
    suggestion,
    standards,
  };
}

// ─── Topology constants ───────────────────────────────────────────────────────

const STORAGE_TYPES = new Set([
  "azure_blob",
  "azure_files",
  "azure_datalake",
  "azure_table",
  "azure_queue",
]);

const DB_TYPES = new Set([
  "azure_sql",
  "azure_cosmosdb",
  "azure_postgres",
  "azure_mysql",
  "azure_redis",
  "azure_servicebus",
  "azure_eventhub",
  "azure_synapse",
]);

const COMPUTE_TYPES = new Set([
  "azure_aks",
  "azure_vm",
  "azure_vmss",
  "azure_app_service",
  "azure_functions",
  "azure_container_apps",
  "azure_aci",
  "azure_batch",
  "azure_spring_apps",
]);

const STATEFUL_TYPES = new Set([
  "azure_vm",
  "azure_sql",
  "azure_postgres",
  "azure_mysql",
  "azure_cosmosdb",
]);

const PUBLIC_EDGE_TYPES = new Set([
  "azure_agw",
  "azure_lb",
  "azure_frontdoor",
  "azure_apim",
  "azure_traffic_mgr",
]);

const WAF_TYPES = new Set(["azure_agw", "azure_waf", "azure_frontdoor"]);

const STORAGE_TYPE_LIST = [...STORAGE_TYPES];

function containerAppsExternalIngress(node) {
  const ingress = cfg(node, "ingress");
  let external = cfg(node, "ingress_external_enabled") === true;
  if (ingress && typeof ingress === "object" && !Array.isArray(ingress)) {
    external = external || ingress.external_enabled === true;
  }
  return external;
}

// ─── Config rules ─────────────────────────────────────────────────────────────

export const AZURE_CONFIG_RULES = [
  configRule({
    id: "azure_vm_password_auth",
    level: "warning",
    title: "Azure VM: password authentication enabled",
    types: "azure_vm",
    check: (n) => isFalsyExplicit(cfg(n, "disable_password_authentication")),
    message: (n) => `${label(n)} allows password authentication. Use SSH keys only.`,
    fix: "Set disable_password_authentication = true.",
    standards: ["CIS", "NIST"],
  }),
  configRule({
    id: "azure_vm_no_boot_diagnostics",
    level: "info",
    title: "Azure VM: boot diagnostics not enabled",
    types: "azure_vm",
    check: (n) => !isTruthy(cfg(n, "boot_diagnostics_enabled")),
    message: (n) => `${label(n)} does not have boot diagnostics enabled.`,
    fix: "Add boot_diagnostics block to the VM resource.",
    standards: ["NIST"],
  }),
  configRule({
    id: "azure_vm_public_ip",
    level: "warning",
    title: "Azure VM: public IP assigned",
    types: "azure_vm",
    check: (n) => hasPublicIp(n),
    message: (n) => `${label(n)} has a public IP and may be directly internet-reachable.`,
    fix: "Remove public IP or place the VM behind a load balancer or Bastion.",
    standards: ["CIS", "NIST", "PCI"],
  }),
  configRule({
    id: "azure_vm_no_encryption_at_host",
    level: "warning",
    title: "Azure VM: encryption at host disabled",
    types: "azure_vm",
    check: (n) => isFalsyExplicit(cfg(n, "encryption_at_host_enabled")),
    message: (n) => `${label(n)} does not use encryption at host.`,
    fix: "Set encryption_at_host_enabled = true on the VM.",
    standards: ["CIS", "HIPAA", "NIST"],
  }),
  configRule({
    id: "azure_vm_agent_disabled",
    level: "info",
    title: "Azure VM: guest agent disabled",
    types: "azure_vm",
    check: (n) => !isTruthy(cfg(n, "vm_agent_enabled")) && cfg(n, "vm_agent_enabled") != null,
    message: (n) => `${label(n)} has the VM guest agent disabled.`,
    fix: "Enable the VM agent for extensions and monitoring.",
    standards: ["NIST"],
  }),
  configRule({
    id: "azure_vm_no_az",
    level: "info",
    title: "Azure VM: no availability zone or set",
    types: "azure_vm",
    check: (n) => [null, undefined, ""].includes(cfg(n, "availability_zone")) && !cfg(n, "availability_set_id"),
    message: (n) => `${label(n)} is not placed in an availability zone or set.`,
    fix: "Use availability zones or an availability set for HA.",
    standards: ["NIST", "SOC2"],
  }),
  configRule({
    id: "azure_vmss_no_automatic_repair",
    level: "info",
    title: "VMSS: automatic instance repair not enabled",
    types: "azure_vmss",
    check: (n) => !cfg(n, "automatic_instance_repair") && !isTruthy(cfg(n, "automatic_instance_repair_enabled")),
    message: (n) => `${label(n)} does not automatically repair unhealthy instances.`,
    fix: "Enable automatic instance repair on the scale set.",
    standards: ["NIST", "SOC2"],
  }),
  configRule({
    id: "azure_vmss_single_instance",
    level: "warning",
    title: "VMSS: fewer than two instances",
    types: "azure_vmss",
    check: (n) => intCfg(n, "instances", 1) < 2,
    message: (n) => `${label(n)} runs a single instance without scale-set redundancy.`,
    fix: "Set instances >= 2 for production workloads.",
    standards: ["NIST", "SOC2"],
  }),
  configRule({
    id: "azure_vmss_overprovision_disabled",
    level: "info",
    title: "VMSS: overprovisioning disabled",
    types: "azure_vmss",
    check: (n) => isFalsyExplicit(cfg(n, "overprovision")),
    message: (n) => `${label(n)} may have slower scale-out without overprovisioning.`,
    fix: "Enable overprovision for faster scaling unless using proximity groups.",
    standards: ["NIST"],
  }),
  configRule({
    id: "azure_vmss_manual_upgrade",
    level: "info",
    title: "VMSS: manual upgrade mode",
    types: "azure_vmss",
    check: (n) => cfg(n, "upgrade_mode", "Manual") === "Manual",
    message: (n) => `${label(n)} uses manual rolling upgrades.`,
    fix: "Use Rolling upgrade mode for safer deployments.",
    standards: ["NIST"],
  }),
  configRule({
    id: "azure_aks_rbac_disabled",
    level: "critical",
    title: "AKS: RBAC disabled",
    types: "azure_aks",
    check: (n) => isFalsyExplicit(cfg(n, "role_based_access_control_enabled")),
    message: (n) => `${label(n)} has RBAC disabled. All users have unrestricted cluster access.`,
    fix: "Set role_based_access_control_enabled = true.",
    standards: ["CIS", "NIST", "SOC2"],
  }),
  configRule({
    id: "azure_aks_no_private_cluster",
    level: "warning",
    title: "AKS: API server not private",
    types: "azure_aks",
    check: (n) => !isTruthy(cfg(n, "private_cluster_enabled")),
    message: (n) => `${label(n)} has a public-facing API server endpoint.`,
    fix: "Set private_cluster_enabled = true.",
    standards: ["CIS", "NIST", "SOC2"],
  }),
  configRule({
    id: "azure_aks_no_authorized_ips",
    level: "warning",
    title: "AKS: no authorized IP ranges on API server",
    types: "azure_aks",
    check: (n) => !isTruthy(cfg(n, "private_cluster_enabled")) && !cfg(n, "api_server_authorized_ip_ranges"),
    message: (n) => `${label(n)} API server is open to all IPs with no restriction.`,
    fix: "Set api_server_authorized_ip_ranges or enable private cluster.",
    standards: ["CIS", "NIST"],
  }),
  configRule({
    id: "azure_aks_no_network_policy",
    level: "warning",
    title: "AKS: no network policy configured",
    types: "azure_aks",
    check: (n) => !cfg(n, "network_policy"),
    message: (n) => `${label(n)} has no network policy. All pods can communicate freely.`,
    fix: "Set network_policy = 'azure' or 'calico' in network_profile.",
    standards: ["CIS", "NIST"],
  }),
  configRule({
    id: "azure_aks_local_accounts_enabled",
    level: "warning",
    title: "AKS: local accounts enabled",
    types: "azure_aks",
    check: (n) => isTruthy(cfg(n, "local_account_disabled")) === false && cfg(n, "local_account_disabled") != null,
    message: (n) => `${label(n)} allows local Kubernetes accounts.`,
    fix: "Set local_account_disabled = true.",
    standards: ["CIS", "NIST"],
  }),
  configRule({
    id: "azure_aks_azure_policy_disabled",
    level: "warning",
    title: "AKS: Azure Policy add-on disabled",
    types: "azure_aks",
    check: (n) => !isTruthy(cfg(n, "azure_policy_enabled")),
    message: (n) => `${label(n)} does not enforce Azure Policy on the cluster.`,
    fix: "Enable the Azure Policy add-on.",
    standards: ["CIS", "NIST"],
  }),
  configRule({
    id: "azure_aks_http_routing_enabled",
    level: "warning",
    title: "AKS: HTTP application routing enabled",
    types: "azure_aks",
    check: (n) => isTruthy(cfg(n, "http_application_routing_enabled")),
    message: (n) => `${label(n)} enables the legacy HTTP application routing add-on.`,
    fix: "Disable http_application_routing and use Ingress + AGW/NGINX.",
    standards: ["NIST"],
  }),
  configRule({
    id: "azure_aks_oidc_disabled",
    level: "info",
    title: "AKS: OIDC issuer not enabled",
    types: "azure_aks",
    check: (n) => !isTruthy(cfg(n, "oidc_issuer_enabled")),
    message: (n) => `${label(n)} cannot use workload identity federation easily.`,
    fix: "Enable OIDC issuer for workload identity.",
    standards: ["CIS", "NIST"],
  }),
  configRule({
    id: "azure_aks_free_tier",
    level: "info",
    title: "AKS: Free tier SKU",
    types: "azure_aks",
    check: (n) => !cfg(n, "sku_tier") || String(cfg(n, "sku_tier")).toLowerCase() === "free",
    message: (n) => `${label(n)} uses the Free control plane tier without SLA.`,
    fix: "Use Standard tier for production SLA.",
    standards: ["NIST", "SOC2"],
  }),
  configRule({
    id: "azure_sql_tde_disabled",
    level: "critical",
    title: "Azure SQL: Transparent Data Encryption disabled",
    types: "azure_sql",
    check: (n) => isFalsyExplicit(cfg(n, "transparent_data_encryption_enabled")),
    message: (n) => `${label(n)} has Transparent Data Encryption disabled.`,
    fix: "Set transparent_data_encryption_enabled = true on the database.",
    standards: ["CIS", "PCI", "HIPAA", "NIST"],
  }),
  configRule({
    id: "azure_sql_min_tls_old",
    level: "warning",
    title: "Azure SQL: minimum TLS version below 1.2",
    types: "azure_sql",
    check: (n) => ![null, undefined, "1.2"].includes(cfg(n, "minimum_tls_version")),
    message: (n) => `${label(n)} accepts TLS versions older than 1.2.`,
    fix: "Set minimum_tls_version = '1.2' on the SQL server.",
    standards: ["CIS", "PCI", "NIST"],
  }),
  configRule({
    id: "azure_sql_no_auditing",
    level: "warning",
    title: "Azure SQL: auditing not enabled",
    types: "azure_sql",
    check: (n) => !isTruthy(cfg(n, "auditing_enabled")),
    message: (n) => `${label(n)} does not have auditing enabled.`,
    fix: "Generate azurerm_mssql_server_extended_auditing_policy.",
    standards: ["CIS", "SOC2", "NIST"],
  }),
  configRule({
    id: "azure_sql_public_network",
    level: "critical",
    title: "Azure SQL: public network access enabled",
    types: "azure_sql",
    check: (n) => isTruthy(cfg(n, "public_network_access_enabled")),
    message: (n) => `${label(n)} allows connections from public networks.`,
    fix: "Set public_network_access_enabled = false and use Private Endpoint.",
    standards: ["CIS", "PCI", "HIPAA", "NIST"],
  }),
  configRule({
    id: "azure_sql_no_aad_admin",
    level: "warning",
    title: "Azure SQL: no Azure AD administrator",
    types: "azure_sql",
    check: (n) => !isTruthy(cfg(n, "azuread_administrator")) && !cfg(n, "azuread_administrator_login"),
    message: (n) => `${label(n)} relies on SQL authentication only.`,
    fix: "Configure an Azure AD administrator on the server.",
    standards: ["CIS", "NIST"],
  }),
  configRule({
    id: "azure_postgres_ssl_disabled",
    level: "critical",
    title: "Azure PostgreSQL: SSL not enforced",
    types: "azure_postgres",
    check: (n) => isFalsyExplicit(cfg(n, "ssl_enforcement_enabled")),
    message: (n) => `${label(n)} does not enforce SSL connections.`,
    fix: "Set ssl_enforcement_enabled = true.",
    standards: ["CIS", "PCI", "HIPAA", "NIST"],
  }),
  configRule({
    id: "azure_postgres_public_access",
    level: "critical",
    title: "Azure PostgreSQL: public network access enabled",
    types: "azure_postgres",
    check: (n) => isTruthy(cfg(n, "public_network_access_enabled")),
    message: (n) => `${label(n)} is reachable from public networks.`,
    fix: "Disable public network access and use Private Endpoint.",
    standards: ["CIS", "PCI", "HIPAA", "NIST"],
  }),
  configRule({
    id: "azure_postgres_no_geo_backup",
    level: "warning",
    title: "Azure PostgreSQL: geo-redundant backup disabled",
    types: "azure_postgres",
    check: (n) => isFalsyExplicit(cfg(n, "geo_redundant_backup_enabled")),
    message: (n) => `${label(n)} stores backups only in a single region.`,
    fix: "Enable geo_redundant_backup_enabled for DR.",
    standards: ["NIST", "SOC2"],
  }),
  configRule({
    id: "azure_postgres_infra_encryption_disabled",
    level: "info",
    title: "Azure PostgreSQL: infrastructure encryption disabled",
    types: "azure_postgres",
    check: (n) => isFalsyExplicit(cfg(n, "infrastructure_encryption_enabled")),
    message: (n) => `${label(n)} does not use double encryption at rest.`,
    fix: "Enable infrastructure_encryption_enabled where supported.",
    standards: ["HIPAA", "NIST"],
  }),
  configRule({
    id: "azure_mysql_ssl_disabled",
    level: "critical",
    title: "Azure MySQL: SSL not enforced",
    types: "azure_mysql",
    check: (n) => isFalsyExplicit(cfg(n, "ssl_enforcement_enabled")),
    message: (n) => `${label(n)} does not enforce SSL connections.`,
    fix: "Set ssl_enforcement_enabled = true.",
    standards: ["CIS", "PCI", "HIPAA", "NIST"],
  }),
  configRule({
    id: "azure_mysql_public_access",
    level: "critical",
    title: "Azure MySQL: public network access enabled",
    types: "azure_mysql",
    check: (n) => isTruthy(cfg(n, "public_network_access_enabled")),
    message: (n) => `${label(n)} is reachable from public networks.`,
    fix: "Disable public network access and use Private Endpoint.",
    standards: ["CIS", "PCI", "HIPAA", "NIST"],
  }),
  configRule({
    id: "azure_mysql_no_geo_backup",
    level: "warning",
    title: "Azure MySQL: geo-redundant backup disabled",
    types: "azure_mysql",
    check: (n) => isFalsyExplicit(cfg(n, "geo_redundant_backup_enabled")),
    message: (n) => `${label(n)} stores backups only in a single region.`,
    fix: "Enable geo_redundant_backup_enabled for DR.",
    standards: ["NIST", "SOC2"],
  }),
  configRule({
    id: "azure_cosmosdb_public_access",
    level: "warning",
    title: "CosmosDB: no network access restriction",
    types: "azure_cosmosdb",
    check: (n) => !cfg(n, "ip_range_filter") && !cfg(n, "virtual_network_rule"),
    message: (n) => `${label(n)} is accessible from all networks.`,
    fix: "Set ip_range_filter or virtual_network_rule.",
    standards: ["CIS", "NIST", "PCI"],
  }),
  configRule({
    id: "azure_cosmosdb_no_cmek",
    level: "info",
    title: "CosmosDB: no customer-managed key",
    types: "azure_cosmosdb",
    check: (n) => !cfg(n, "key_vault_key_id") && !cfgNested(n, "identity", "type"),
    message: (n) => `${label(n)} uses service-managed keys only.`,
    fix: "Configure customer-managed keys via Key Vault.",
    standards: ["HIPAA", "PCI", "NIST"],
  }),
  configRule({
    id: "azure_cosmosdb_no_continuous_backup",
    level: "info",
    title: "CosmosDB: continuous backup not configured",
    types: "azure_cosmosdb",
    check: (n) => !isTruthy(cfg(n, "continuous_backup_enabled")) && !cfg(n, "backup"),
    message: (n) => `${label(n)} may not support point-in-time restore.`,
    fix: "Enable continuous backup for production accounts.",
    standards: ["NIST", "SOC2"],
  }),
  configRule({
    id: "azure_redis_non_ssl_port",
    level: "warning",
    title: "Azure Redis: non-SSL port enabled",
    types: "azure_redis",
    check: (n) => isTruthy(cfg(n, "enable_non_ssl_port")),
    message: (n) => `${label(n)} has the unencrypted Redis port (6379) enabled.`,
    fix: "Set enable_non_ssl_port = false.",
    standards: ["CIS", "PCI", "NIST"],
  }),
  configRule({
    id: "azure_redis_min_tls_old",
    level: "warning",
    title: "Azure Redis: minimum TLS below 1.2",
    types: "azure_redis",
    check: (n) => ![null, undefined, "1.2"].includes(cfg(n, "minimum_tls_version")),
    message: (n) => `${label(n)} accepts TLS versions below 1.2.`,
    fix: "Set minimum_tls_version = '1.2'.",
    standards: ["CIS", "NIST"],
  }),
  configRule({
    id: "azure_redis_public_access",
    level: "critical",
    title: "Azure Redis: public network access enabled",
    types: "azure_redis",
    check: (n) => isTruthy(cfg(n, "public_network_access_enabled")),
    message: (n) => `${label(n)} is reachable from public networks.`,
    fix: "Disable public network access and use Private Endpoint.",
    standards: ["CIS", "PCI", "NIST"],
  }),
  configRule({
    id: "azure_redis_no_patch_schedule",
    level: "info",
    title: "Azure Redis: no patch schedule",
    types: "azure_redis",
    check: (n) => !cfg(n, "patch_schedule"),
    message: (n) => `${label(n)} has no maintenance patch window configured.`,
    fix: "Add patch_schedule for controlled maintenance.",
    standards: ["NIST"],
  }),
  configRule({
    id: "azure_storage_public_access",
    level: "critical",
    title: "Azure Storage: public blob access allowed",
    types: STORAGE_TYPE_LIST,
    check: (n) => isTruthy(cfg(n, "allow_nested_items_to_be_public")),
    message: (n) => `${label(n)} allows public blob/container access.`,
    fix: "Set allow_nested_items_to_be_public = false.",
    standards: ["CIS", "PCI", "NIST"],
  }),
  configRule({
    id: "azure_storage_https_only",
    level: "warning",
    title: "Azure Storage: HTTPS not enforced",
    types: STORAGE_TYPE_LIST,
    check: (n) => isFalsyExplicit(cfg(n, "enable_https_traffic_only")),
    message: (n) => `${label(n)} allows unencrypted HTTP traffic.`,
    fix: "Set enable_https_traffic_only = true.",
    standards: ["CIS", "PCI", "NIST"],
  }),
  configRule({
    id: "azure_storage_min_tls_old",
    level: "warning",
    title: "Azure Storage: minimum TLS below 1.2",
    types: STORAGE_TYPE_LIST,
    check: (n) => ![null, undefined, "TLS1_2"].includes(cfg(n, "min_tls_version")),
    message: (n) => `${label(n)} accepts TLS versions older than 1.2.`,
    fix: "Set min_tls_version = 'TLS1_2' on the storage account.",
    standards: ["CIS", "NIST"],
  }),
  configRule({
    id: "azure_storage_shared_key_enabled",
    level: "warning",
    title: "Azure Storage: shared key access enabled",
    types: STORAGE_TYPE_LIST,
    check: (n) => isTruthy(cfg(n, "shared_access_key_enabled")),
    message: (n) => `${label(n)} allows storage account key authentication.`,
    fix: "Disable shared_access_key_enabled and use Azure AD RBAC.",
    standards: ["CIS", "NIST", "SOC2"],
  }),
  configRule({
    id: "azure_storage_no_infra_encryption",
    level: "info",
    title: "Azure Storage: infrastructure encryption disabled",
    types: STORAGE_TYPE_LIST,
    check: (n) => isFalsyExplicit(cfg(n, "infrastructure_encryption_enabled")),
    message: (n) => `${label(n)} does not use double encryption at rest.`,
    fix: "Enable infrastructure_encryption_enabled.",
    standards: ["HIPAA", "NIST"],
  }),
  configRule({
    id: "azure_blob_no_versioning",
    level: "info",
    title: "Blob Storage: versioning disabled",
    types: "azure_blob",
    check: (n) => !isTruthy(cfg(n, "versioning_enabled")) && !cfg(n, "blob_properties"),
    message: (n) => `${label(n)} cannot recover from accidental overwrites.`,
    fix: "Enable blob versioning on the storage account.",
    standards: ["NIST", "SOC2"],
  }),
  configRule({
    id: "azure_blob_no_soft_delete",
    level: "warning",
    title: "Blob Storage: soft delete not configured",
    types: "azure_blob",
    check: (n) => !cfg(n, "delete_retention_policy") && !cfgNested(n, "blob_properties", "delete_retention_policy"),
    message: (n) => `${label(n)} has no blob soft-delete retention policy.`,
    fix: "Configure delete_retention_policy on blob properties.",
    standards: ["NIST", "SOC2"],
  }),
  configRule({
    id: "azure_files_weak_smb_encryption",
    level: "warning",
    title: "Azure Files: weak SMB channel encryption",
    types: "azure_files",
    check: (n) => ![null, undefined, "AES-256-GCM", "AES-256-GCM-AES-128-GCM"].includes(cfg(n, "smb_channel_encryption")),
    message: (n) => `${label(n)} does not require AES-256-GCM SMB channel encryption.`,
    fix: "Set smb_channel_encryption to AES-256-GCM.",
    standards: ["CIS", "NIST"],
  }),
  configRule({
    id: "azure_disk_unencrypted",
    level: "critical",
    title: "Managed Disk: encryption not enabled",
    types: "azure_disk",
    check: (n) => !isTruthy(cfg(n, "encryption_enabled")) && !cfg(n, "disk_encryption_set_id"),
    message: (n) => `${label(n)} is not encrypted with a platform or customer-managed key.`,
    fix: "Enable encryption or attach a disk_encryption_set_id.",
    standards: ["CIS", "PCI", "HIPAA", "NIST"],
  }),
  configRule({
    id: "azure_keyvault_soft_delete_disabled",
    level: "critical",
    title: "Key Vault: soft delete not enabled",
    types: "azure_keyvault",
    check: (n) => cfg(n, "soft_delete_retention_days") === 0 || isFalsyExplicit(cfg(n, "soft_delete_enabled")),
    message: (n) => `${label(n)} does not have soft delete enabled.`,
    fix: "Set soft_delete_retention_days >= 7.",
    standards: ["CIS", "NIST", "PCI"],
  }),
  configRule({
    id: "azure_keyvault_purge_protection_disabled",
    level: "critical",
    title: "Key Vault: purge protection not enabled",
    types: "azure_keyvault",
    check: (n) => isFalsyExplicit(cfg(n, "purge_protection_enabled")),
    message: (n) => `${label(n)} does not have purge protection enabled.`,
    fix: "Set purge_protection_enabled = true.",
    standards: ["CIS", "NIST", "PCI"],
  }),
  configRule({
    id: "azure_keyvault_public_network",
    level: "critical",
    title: "Key Vault: public network access enabled",
    types: "azure_keyvault",
    check: (n) => isTruthy(cfg(n, "public_network_access_enabled")),
    message: (n) => `${label(n)} is reachable from public networks.`,
    fix: "Set public_network_access_enabled = false and use Private Endpoint.",
    standards: ["CIS", "PCI", "NIST"],
  }),
  configRule({
    id: "azure_keyvault_network_default_allow",
    level: "warning",
    title: "Key Vault: network ACL default Allow",
    types: "azure_keyvault",
    check: (n) => cfg(n, "network_acls_default_action", "Allow") === "Allow",
    message: (n) => `${label(n)} allows access from networks not explicitly denied.`,
    fix: "Set network_acls default_action = Deny with trusted IP/subnet rules.",
    standards: ["CIS", "NIST"],
  }),
  configRule({
    id: "azure_keyvault_no_rbac",
    level: "warning",
    title: "Key Vault: RBAC authorization disabled",
    types: "azure_keyvault",
    check: (n) => cfg(n, "enable_rbac_authorization") === false,
    message: (n) => `${label(n)} uses legacy access policies instead of Azure RBAC.`,
    fix: "Set enable_rbac_authorization = true.",
    standards: ["CIS", "NIST", "SOC2"],
  }),
  configRule({
    id: "azure_functions_https_only",
    level: "warning",
    title: "Azure Functions: HTTPS not enforced",
    types: "azure_functions",
    check: (n) => isFalsyExplicit(cfg(n, "https_only")),
    message: (n) => `${label(n)} allows unencrypted HTTP traffic.`,
    fix: "Set https_only = true.",
    standards: ["CIS", "NIST"],
  }),
  configRule({
    id: "azure_functions_min_tls_old",
    level: "warning",
    title: "Azure Functions: minimum TLS below 1.2",
    types: "azure_functions",
    check: (n) => ![null, undefined, "1.2"].includes(cfg(n, "minimum_tls_version")),
    message: (n) => `${label(n)} accepts TLS versions below 1.2.`,
    fix: "Set minimum_tls_version = '1.2' in site_config.",
    standards: ["CIS", "NIST"],
  }),
  configRule({
    id: "azure_functions_public_access",
    level: "warning",
    title: "Azure Functions: public network access enabled",
    types: "azure_functions",
    check: (n) => isTruthy(cfg(n, "public_network_access_enabled")),
    message: (n) => `${label(n)} allows public inbound access to the function app.`,
    fix: "Disable public network access and integrate with VNet.",
    standards: ["CIS", "NIST"],
  }),
  configRule({
    id: "azure_functions_no_vnet",
    level: "info",
    title: "Azure Functions: no VNet integration",
    types: "azure_functions",
    check: (n) => !cfg(n, "virtual_network_subnet_id"),
    message: (n) => `${label(n)} is not integrated with a virtual network.`,
    fix: "Add VNet integration for private resource access.",
    standards: ["NIST"],
  }),
  configRule({
    id: "azure_app_service_https_only",
    level: "warning",
    title: "App Service: HTTPS not enforced",
    types: "azure_app_service",
    check: (n) => isFalsyExplicit(cfg(n, "https_only")),
    message: (n) => `${label(n)} allows unencrypted HTTP traffic.`,
    fix: "Set https_only = true.",
    standards: ["CIS", "NIST"],
  }),
  configRule({
    id: "azure_app_service_min_tls_old",
    level: "warning",
    title: "App Service: minimum TLS below 1.2",
    types: "azure_app_service",
    check: (n) => ![null, undefined, "1.2"].includes(cfg(n, "minimum_tls_version")),
    message: (n) => `${label(n)} accepts TLS versions below 1.2.`,
    fix: "Set minimum_tls_version = '1.2' in site_config.",
    standards: ["CIS", "NIST"],
  }),
  configRule({
    id: "azure_app_service_public_access",
    level: "warning",
    title: "App Service: public network access enabled",
    types: "azure_app_service",
    check: (n) => isTruthy(cfg(n, "public_network_access_enabled")),
    message: (n) => `${label(n)} allows public inbound access.`,
    fix: "Disable public_network_access_enabled for internal apps.",
    standards: ["CIS", "NIST"],
  }),
  configRule({
    id: "azure_app_service_ftps_enabled",
    level: "warning",
    title: "App Service: FTPS enabled",
    types: "azure_app_service",
    check: (n) => ["AllAllowed", "FtpsOnly"].includes(cfg(n, "ftps_state")),
    message: (n) => `${label(n)} allows FTPS deployments which expand attack surface.`,
    fix: "Set ftps_state = Disabled.",
    standards: ["CIS", "NIST"],
  }),
  configRule({
    id: "azure_app_service_remote_debugging",
    level: "warning",
    title: "App Service: remote debugging enabled",
    types: "azure_app_service",
    check: (n) => isTruthy(cfg(n, "remote_debugging_enabled")),
    message: (n) => `${label(n)} allows remote debugging in production.`,
    fix: "Disable remote debugging on production slots.",
    standards: ["NIST"],
  }),
  configRule({
    id: "azure_acr_admin_enabled",
    level: "warning",
    title: "Container Registry: admin user enabled",
    types: "azure_acr",
    check: (n) => isTruthy(cfg(n, "admin_enabled")),
    message: (n) => `${label(n)} has the admin user enabled. Use managed identity instead.`,
    fix: "Set admin_enabled = false and use role assignments.",
    standards: ["CIS", "NIST", "SOC2"],
  }),
  configRule({
    id: "azure_acr_public_access",
    level: "warning",
    title: "Container Registry: public network access enabled",
    types: "azure_acr",
    check: (n) => isTruthy(cfg(n, "public_network_access_enabled")),
    message: (n) => `${label(n)} is reachable from public networks.`,
    fix: "Disable public network access and use Private Endpoint.",
    standards: ["CIS", "NIST"],
  }),
  configRule({
    id: "azure_acr_no_retention_policy",
    level: "info",
    title: "Container Registry: no retention policy",
    types: "azure_acr",
    check: (n) => !cfg(n, "retention_policy") && !isTruthy(cfg(n, "retention_policy_enabled")),
    message: (n) => `${label(n)} does not automatically purge untagged manifests.`,
    fix: "Configure retention_policy for image lifecycle.",
    standards: ["NIST"],
  }),
  configRule({
    id: "azure_agw_no_waf",
    level: "warning",
    title: "Application Gateway: WAF not enabled",
    types: "azure_agw",
    check: (n) => {
      const sku = String(cfg(n, "sku_name") || "");
      return sku && !sku.startsWith("WAF");
    },
    message: (n) => `${label(n)} is not using the WAF_v2 SKU.`,
    fix: "Set sku_name = 'WAF_v2' and enable WAF configuration.",
    standards: ["CIS", "PCI", "SOC2"],
  }),
  configRule({
    id: "azure_agw_weak_ssl_policy",
    level: "warning",
    title: "Application Gateway: weak SSL policy",
    types: "azure_agw",
    check: (n) => ![null, undefined, "TLSv1_2"].includes(cfg(n, "ssl_policy_min_protocol_version")),
    message: (n) => `${label(n)} allows TLS versions below 1.2 on listeners.`,
    fix: "Set ssl_policy_min_protocol_version = TLSv1_2.",
    standards: ["CIS", "NIST"],
  }),
  configRule({
    id: "azure_agw_http_listener",
    level: "warning",
    title: "Application Gateway: HTTP listener present",
    types: "azure_agw",
    check: (n) => isTruthy(cfg(n, "http2_enabled")) === false && cfg(n, "listener_protocol") === "Http",
    message: (n) => `${label(n)} exposes plain HTTP listeners.`,
    fix: "Redirect HTTP to HTTPS or terminate TLS on listeners.",
    standards: ["PCI", "NIST"],
  }),
  configRule({
    id: "azure_frontdoor_no_https_redirect",
    level: "warning",
    title: "Front Door: HTTPS redirect disabled",
    types: "azure_frontdoor",
    check: (n) => isFalsyExplicit(cfg(n, "https_redirect_enabled")),
    message: (n) => `${label(n)} does not redirect HTTP to HTTPS.`,
    fix: "Enable https_redirect on routing rules.",
    standards: ["PCI", "NIST"],
  }),
  configRule({
    id: "azure_frontdoor_min_tls_old",
    level: "warning",
    title: "Front Door: minimum TLS below 1.2",
    types: "azure_frontdoor",
    check: (n) => ![null, undefined, "1.2"].includes(cfg(n, "minimum_tls_version")),
    message: (n) => `${label(n)} accepts TLS versions below 1.2.`,
    fix: "Set minimum_tls_version = 1.2 on custom domains.",
    standards: ["CIS", "NIST"],
  }),
  configRule({
    id: "azure_apim_public_access",
    level: "warning",
    title: "API Management: public network access enabled",
    types: "azure_apim",
    check: (n) => isTruthy(cfg(n, "public_network_access_enabled")),
    message: (n) => `${label(n)} exposes management plane on public networks.`,
    fix: "Use internal VNet mode or disable public network access.",
    standards: ["CIS", "NIST"],
  }),
  configRule({
    id: "azure_apim_http_backend",
    level: "info",
    title: "API Management: HTTP backend protocols allowed",
    types: "azure_apim",
    check: (n) =>
      ![null, undefined, "2021-08-01"].includes(cfg(n, "min_api_version")) &&
      cfg(n, "protocols") &&
      String(cfg(n, "protocols")).toLowerCase().includes("http"),
    message: (n) => `${label(n)} may call backends over unencrypted HTTP.`,
    fix: "Restrict backends to HTTPS-only.",
    standards: ["PCI", "NIST"],
  }),
  configRule({
    id: "azure_servicebus_public_access",
    level: "warning",
    title: "Service Bus: public network access enabled",
    types: "azure_servicebus",
    check: (n) => isTruthy(cfg(n, "public_network_access_enabled")),
    message: (n) => `${label(n)} is reachable from public networks.`,
    fix: "Disable public network access and use Private Endpoint.",
    standards: ["CIS", "NIST"],
  }),
  configRule({
    id: "azure_servicebus_local_auth",
    level: "warning",
    title: "Service Bus: local authentication enabled",
    types: "azure_servicebus",
    check: (n) => isTruthy(cfg(n, "local_auth_enabled")),
    message: (n) => `${label(n)} allows shared access signature keys.`,
    fix: "Disable local_auth_enabled and use Azure AD RBAC.",
    standards: ["CIS", "NIST", "SOC2"],
  }),
  configRule({
    id: "azure_eventhub_public_access",
    level: "warning",
    title: "Event Hubs: public network access enabled",
    types: "azure_eventhub",
    check: (n) => isTruthy(cfg(n, "public_network_access_enabled")),
    message: (n) => `${label(n)} is reachable from public networks.`,
    fix: "Disable public network access and use Private Endpoint.",
    standards: ["CIS", "NIST"],
  }),
  configRule({
    id: "azure_eventhub_no_capture",
    level: "info",
    title: "Event Hubs: capture not configured",
    types: "azure_eventhub",
    check: (n) => !cfg(n, "capture_description") && !isTruthy(cfg(n, "capture_enabled")),
    message: (n) => `${label(n)} does not archive events for long-term retention.`,
    fix: "Enable capture to Storage or Data Lake for audit pipelines.",
    standards: ["SOC2", "NIST"],
  }),
  configRule({
    id: "azure_firewall_basic_sku",
    level: "warning",
    title: "Azure Firewall: Basic SKU",
    types: "azure_firewall",
    check: (n) => String(cfg(n, "sku_name", "")).toLowerCase() === "basic",
    message: (n) => `${label(n)} uses Basic SKU without full threat intelligence features.`,
    fix: "Use Standard or Premium SKU for production.",
    standards: ["CIS", "NIST"],
  }),
  configRule({
    id: "azure_firewall_threat_intel_off",
    level: "warning",
    title: "Azure Firewall: threat intelligence off",
    types: "azure_firewall",
    check: (n) => isFalsyExplicit(cfg(n, "threat_intel_mode")) || cfg(n, "threat_intel_mode") === "Off",
    message: (n) => `${label(n)} does not block malicious FQDNs/IPs.`,
    fix: "Set threat_intel_mode = Alert or Deny.",
    standards: ["CIS", "NIST"],
  }),
  configRule({
    id: "azure_firewall_dns_proxy_disabled",
    level: "info",
    title: "Azure Firewall: DNS proxy disabled",
    types: "azure_firewall",
    check: (n) => !isTruthy(cfg(n, "dns_proxy_enabled")),
    message: (n) => `${label(n)} cannot inspect/filter outbound DNS.`,
    fix: "Enable DNS proxy for FQDN filtering.",
    standards: ["NIST"],
  }),
  configRule({
    id: "azure_bastion_basic_sku",
    level: "info",
    title: "Azure Bastion: Basic SKU",
    types: "azure_bastion",
    check: (n) => String(cfg(n, "sku", "Basic")).toLowerCase() === "basic",
    message: (n) => `${label(n)} uses Basic SKU without zone redundancy or scale units.`,
    fix: "Use Standard or Premium SKU for production.",
    standards: ["NIST", "SOC2"],
  }),
  configRule({
    id: "azure_waf_detection_mode",
    level: "warning",
    title: "WAF Policy: detection-only mode",
    types: "azure_waf",
    check: (n) => cfg(n, "policy_settings_mode", "Prevention") !== "Prevention",
    message: (n) => `${label(n)} runs in Detection mode and does not block attacks.`,
    fix: "Set policy_settings mode to Prevention.",
    standards: ["CIS", "PCI", "SOC2"],
  }),
  configRule({
    id: "azure_vpn_gateway_basic_sku",
    level: "info",
    title: "VPN Gateway: Basic SKU does not support SLAs",
    types: "azure_vpn_gateway",
    check: (n) => cfg(n, "sku") === "Basic",
    message: (n) => `${label(n)} uses the Basic SKU which lacks SLA and zone-redundancy.`,
    fix: "Upgrade to VpnGw1 or higher.",
    standards: ["NIST"],
  }),
  configRule({
    id: "azure_lb_public_frontend",
    level: "info",
    title: "Load Balancer: public frontend IP",
    types: "azure_lb",
    check: (n) => hasPublicIp(n) && cfg(n, "sku") !== "Gateway",
    message: (n) => `${label(n)} exposes a public frontend — verify WAF protection.`,
    fix: "Place Application Gateway or Front Door with WAF in front.",
    standards: ["PCI", "NIST"],
  }),
  configRule({
    id: "azure_vnet_no_ddos_attachment",
    level: "info",
    title: "Virtual Network: no DDoS plan attached on resource",
    types: "azure_vnet",
    check: (n) => !cfg(n, "ddos_protection_plan"),
    message: (n) => `${label(n)} is not associated with a DDoS Protection Plan at the VNet level.`,
    fix: "Associate azurerm_network_ddos_protection_plan.",
    standards: ["NIST"],
  }),
  configRule({
    id: "azure_subnet_no_service_endpoints",
    level: "info",
    title: "Subnet: no service endpoints",
    types: "azure_subnet",
    check: (n) => !cfg(n, "service_endpoints") && !cfg(n, "delegation"),
    message: (n) => `${label(n)} has no service endpoints for PaaS private access.`,
    fix: "Add service_endpoints for Storage, SQL, or Key Vault as needed.",
    standards: ["NIST"],
  }),
  configRule({
    id: "azure_openai_public_access",
    level: "warning",
    title: "Azure OpenAI: public network access enabled",
    types: "azure_openai",
    check: (n) => isTruthy(cfg(n, "public_network_access_enabled")),
    message: (n) => `${label(n)} is reachable from public networks.`,
    fix: "Disable public network access and use Private Endpoint.",
    standards: ["NIST", "HIPAA"],
  }),
  configRule({
    id: "azure_search_public_access",
    level: "warning",
    title: "Azure AI Search: public network access enabled",
    types: "azure_search",
    check: (n) => isTruthy(cfg(n, "public_network_access_enabled")),
    message: (n) => `${label(n)} is reachable from public networks.`,
    fix: "Disable public network access and use Private Endpoint.",
    standards: ["NIST"],
  }),
  configRule({
    id: "azure_synapse_public_access",
    level: "critical",
    title: "Azure Synapse: public network access enabled",
    types: "azure_synapse",
    check: (n) => isTruthy(cfg(n, "public_network_access_enabled")),
    message: (n) => `${label(n)} allows public connectivity to the workspace.`,
    fix: "Disable public network access and use managed private endpoints.",
    standards: ["CIS", "PCI", "HIPAA", "NIST"],
  }),
  configRule({
    id: "azure_synapse_no_aad_only",
    level: "warning",
    title: "Azure Synapse: SQL authentication allowed",
    types: "azure_synapse",
    check: (n) => !isTruthy(cfg(n, "azuread_authentication_only")),
    message: (n) => `${label(n)} allows SQL authentication in addition to Azure AD.`,
    fix: "Set azuread_authentication_only = true.",
    standards: ["CIS", "NIST"],
  }),
  configRule({
    id: "azure_databricks_no_private_link",
    level: "warning",
    title: "Databricks: no private connectivity configured",
    types: "azure_databricks",
    check: (n) => !cfg(n, "custom_parameters") && !cfg(n, "private_subnet_name"),
    message: (n) => `${label(n)} may use default public control plane paths.`,
    fix: "Deploy with VNet injection and private endpoints.",
    standards: ["CIS", "NIST"],
  }),
  configRule({
    id: "azure_databricks_no_diag_logs",
    level: "info",
    title: "Databricks: diagnostic logs not enabled",
    types: "azure_databricks",
    check: (n) => !isTruthy(cfg(n, "diagnostic_logs_enabled")),
    message: (n) => `${label(n)} lacks audit logging to Log Analytics.`,
    fix: "Enable diagnostic settings for clusters and accounts.",
    standards: ["SOC2", "NIST"],
  }),
  configRule({
    id: "azure_datafactory_public",
    level: "warning",
    title: "Data Factory: public network access enabled",
    types: "azure_datafactory",
    check: (n) => isTruthy(cfg(n, "public_network_enabled")),
    message: (n) => `${label(n)} allows public connectivity.`,
    fix: "Disable public_network_enabled and use managed VNet.",
    standards: ["NIST"],
  }),
  configRule({
    id: "azure_datafactory_no_git",
    level: "info",
    title: "Data Factory: no Git integration",
    types: "azure_datafactory",
    check: (n) => !cfg(n, "github_configuration") && !cfg(n, "vsts_configuration"),
    message: (n) => `${label(n)} is not backed by Git for change control.`,
    fix: "Configure GitHub or Azure DevOps integration.",
    standards: ["SOC2", "NIST"],
  }),
  configRule({
    id: "azure_container_apps_external_ingress",
    level: "warning",
    title: "Container Apps: external ingress enabled",
    types: "azure_container_apps",
    check: (n) => containerAppsExternalIngress(n),
    message: (n) => `${label(n)} accepts traffic from the public internet.`,
    fix: "Use internal ingress with Application Gateway or Front Door.",
    standards: ["CIS", "NIST"],
  }),
  configRule({
    id: "azure_aci_public_ip",
    level: "warning",
    title: "Container Instances: public IP assigned",
    types: "azure_aci",
    check: (n) => hasPublicIp(n),
    message: (n) => `${label(n)} exposes container groups on a public IP.`,
    fix: "Run inside a VNet without public IP.",
    standards: ["CIS", "NIST"],
  }),
  configRule({
    id: "azure_spring_public_endpoint",
    level: "warning",
    title: "Spring Apps: public endpoint enabled",
    types: "azure_spring_apps",
    check: (n) => isTruthy(cfg(n, "is_public")),
    message: (n) => `${label(n)} exposes apps on a public URL.`,
    fix: "Use VNet injection and private DNS.",
    standards: ["NIST"],
  }),
  configRule({
    id: "azure_log_analytics_short_retention",
    level: "info",
    title: "Log Analytics: retention below 90 days",
    types: "azure_log_analytics",
    check: (n) => intCfg(n, "retention_in_days", 30) < 90,
    message: (n) => `${label(n)} may not meet long-term audit retention requirements.`,
    fix: "Increase retention_in_days to at least 90 for compliance workloads.",
    standards: ["SOC2", "NIST", "PCI"],
  }),
  configRule({
    id: "azure_app_insights_short_retention",
    level: "info",
    title: "Application Insights: retention below 90 days",
    types: "azure_app_insights",
    check: (n) => intCfg(n, "retention_in_days", 90) < 90,
    message: (n) => `${label(n)} retains telemetry for less than 90 days.`,
    fix: "Increase retention or export to Log Analytics with longer retention.",
    standards: ["SOC2", "NIST"],
  }),
  configRule({
    id: "azure_defender_disabled",
    level: "warning",
    title: "Microsoft Defender: plan disabled",
    types: "azure_defender",
    check: (n) => isFalsyExplicit(cfg(n, "enabled")),
    message: (n) => `${label(n)} has Defender pricing/plan disabled.`,
    fix: "Enable Defender plans for servers, containers, or databases as applicable.",
    standards: ["CIS", "NIST", "SOC2"],
  }),
  configRule({
    id: "azure_traffic_mgr_http_allowed",
    level: "warning",
    title: "Traffic Manager: HTTP endpoints allowed",
    types: "azure_traffic_mgr",
    check: (n) => isFalsyExplicit(cfg(n, "https_only")),
    message: (n) => `${label(n)} may route traffic to HTTP-only endpoints.`,
    fix: "Use HTTPS-only endpoints or enable HTTPS monitoring.",
    standards: ["PCI", "NIST"],
  }),
  configRule({
    id: "azure_logicapp_public_access",
    level: "warning",
    title: "Logic Apps: public network access enabled",
    types: "azure_logicapp",
    check: (n) => isTruthy(cfg(n, "public_network_access_enabled")),
    message: (n) => `${label(n)} allows public workflow triggers or connectors.`,
    fix: "Disable public network access and use private endpoints.",
    standards: ["NIST"],
  }),
  configRule({
    id: "azure_signalr_public_access",
    level: "warning",
    title: "SignalR: public network access enabled",
    types: "azure_signalr",
    check: (n) => isTruthy(cfg(n, "public_network_access_enabled")),
    message: (n) => `${label(n)} is reachable from public networks.`,
    fix: "Disable public network access and use private endpoints.",
    standards: ["NIST"],
  }),
  configRule({
    id: "azure_monitor_no_action_group",
    level: "info",
    title: "Monitor alert without action group",
    types: "azure_monitor",
    check: (n) => !cfg(n, "action_group_id") && !cfg(n, "scopes"),
    message: (n) => `${label(n)} has no action group for notifications.`,
    fix: "Associate an action group with metric or activity log alerts.",
    standards: ["SOC2", "NIST"],
  }),
];

// ─── Topology rules ───────────────────────────────────────────────────────────

export const AZURE_TOPOLOGY_RULES = [
  topologyRule({
    id: "azure_no_keyvault",
    level: "warning",
    title: "No Key Vault in architecture",
    applies: (n) => DB_TYPES.has(n.type),
    check: (n, edges, nodes) => !nodes.some((x) => x.type === "azure_keyvault"),
    message: () => "Architecture has databases/services but no Key Vault for secrets management.",
    fix: "Add azurerm_key_vault with purge_protection_enabled = true.",
    standards: ["CIS", "NIST", "SOC2"],
  }),
  topologyRule({
    id: "azure_no_log_analytics",
    level: "warning",
    title: "No Log Analytics workspace",
    applies: (n) => COMPUTE_TYPES.has(n.type),
    check: (n, edges, nodes) => !nodes.some((x) => x.type === "azure_log_analytics"),
    message: (n) => `${label(n)} has no Log Analytics workspace for centralized logging.`,
    fix: "Add azurerm_log_analytics_workspace.",
    standards: ["CIS", "SOC2", "NIST"],
  }),
  topologyRule({
    id: "azure_no_monitor",
    level: "info",
    title: "No Azure Monitor or App Insights",
    applies: (n) => COMPUTE_TYPES.has(n.type),
    check: (n, edges, nodes) => {
      const types = nodeTypes(nodes);
      return !types.has("azure_monitor") && !types.has("azure_app_insights");
    },
    message: (n) => `${label(n)} has no observability infrastructure.`,
    fix: "Add azurerm_application_insights or azurerm_monitor_metric_alert.",
    standards: ["NIST", "SOC2"],
  }),
  topologyRule({
    id: "azure_no_backup",
    level: "warning",
    title: "No backup vault for stateful resources",
    applies: (n) => STATEFUL_TYPES.has(n.type),
    check: (n, edges, nodes) => !nodes.some((x) => x.type === "azure_backup"),
    message: (n) => `${label(n)} has no Azure Backup vault configured.`,
    fix: "Add azurerm_recovery_services_vault.",
    standards: ["NIST", "SOC2"],
  }),
  topologyRule({
    id: "azure_aks_no_acr",
    level: "info",
    title: "AKS without Container Registry",
    applies: (n) => n.type === "azure_aks",
    check: (n, edges, nodes) => !nodes.some((x) => x.type === "azure_acr"),
    message: (n) => `${label(n)} has no Container Registry for storing container images.`,
    fix: "Add azurerm_container_registry linked to AKS.",
    standards: ["CIS", "NIST"],
  }),
  topologyRule({
    id: "azure_vm_no_bastion",
    level: "warning",
    title: "VMs present without Azure Bastion",
    applies: (n) => n.type === "azure_vm",
    check: (n, edges, nodes) => !nodes.some((x) => x.type === "azure_bastion"),
    message: (n) => `${label(n)} is accessible without a Bastion host.`,
    fix: "Add azurerm_bastion_host in a dedicated AzureBastionSubnet.",
    standards: ["CIS", "NIST"],
  }),
  topologyRule({
    id: "azure_no_ddos_protection",
    level: "info",
    title: "No DDoS Protection Plan",
    applies: (n) => n.type === "azure_vnet",
    check: (n, edges, nodes) => !nodes.some((x) => x.type === "azure_ddos"),
    message: (n) => `${label(n)} has no DDoS Protection Plan attached.`,
    fix: "Add azurerm_network_ddos_protection_plan.",
    standards: ["NIST"],
  }),
  topologyRule({
    id: "azure_internet_facing_vm",
    level: "critical",
    title: "VM directly internet-facing",
    applies: (n) => n.type === "azure_vm",
    check: (n, edges, nodes) => {
      const hasLbOrAgw = hasNeighborType(n.id, ["azure_agw", "azure_lb", "azure_frontdoor"], nodes, edges);
      return labelHasInternet(n.id, nodes, edges) && !hasLbOrAgw;
    },
    message: (n) => `${label(n)} appears to be directly internet-facing without a load balancer.`,
    fix: "Place an Application Gateway or Load Balancer in front of the VM.",
    standards: ["CIS", "PCI", "NIST"],
  }),
  topologyRule({
    id: "azure_vm_no_nsg",
    level: "warning",
    title: "VM without NSG in topology",
    applies: (n) => n.type === "azure_vm",
    check: (n, edges, nodes) => !hasNeighborType(n.id, "azure_nsg", nodes, edges),
    message: (n) => `${label(n)} has no associated NSG component on the canvas.`,
    fix: "Associate an NSG with the VM subnet or NIC.",
    standards: ["CIS", "NIST", "PCI"],
  }),
  topologyRule({
    id: "azure_sql_no_private_endpoint",
    level: "warning",
    title: "Azure SQL: no Private Endpoint",
    applies: (n) => n.type === "azure_sql",
    check: (n, edges, nodes) => !hasNeighborType(n.id, "azure_private_endpoint", nodes, edges),
    message: (n) => `${label(n)} has no Private Endpoint. Database may be publicly accessible.`,
    fix: "Add azurerm_private_endpoint with subresource 'sqlServer'.",
    standards: ["CIS", "PCI", "HIPAA", "NIST"],
  }),
  topologyRule({
    id: "azure_storage_no_private_endpoint",
    level: "info",
    title: "Storage: no Private Endpoint",
    applies: (n) => n.type === "azure_blob" || n.type === "azure_datalake",
    check: (n, edges, nodes) => !hasNeighborType(n.id, "azure_private_endpoint", nodes, edges),
    message: (n) => `${label(n)} has no Private Endpoint. Storage is accessible over the internet.`,
    fix: "Add azurerm_private_endpoint with subresource 'blob'.",
    standards: ["NIST"],
  }),
  topologyRule({
    id: "azure_postgres_no_private_endpoint",
    level: "warning",
    title: "PostgreSQL: no Private Endpoint",
    applies: (n) => n.type === "azure_postgres",
    check: (n, edges, nodes) => !hasNeighborType(n.id, "azure_private_endpoint", nodes, edges),
    message: (n) => `${label(n)} has no Private Endpoint in the architecture.`,
    fix: "Add azurerm_private_endpoint for PostgreSQL.",
    standards: ["CIS", "HIPAA", "NIST"],
  }),
  topologyRule({
    id: "azure_mysql_no_private_endpoint",
    level: "warning",
    title: "MySQL: no Private Endpoint",
    applies: (n) => n.type === "azure_mysql",
    check: (n, edges, nodes) => !hasNeighborType(n.id, "azure_private_endpoint", nodes, edges),
    message: (n) => `${label(n)} has no Private Endpoint in the architecture.`,
    fix: "Add azurerm_private_endpoint for MySQL.",
    standards: ["CIS", "HIPAA", "NIST"],
  }),
  topologyRule({
    id: "azure_cosmosdb_no_private_endpoint",
    level: "warning",
    title: "CosmosDB: no Private Endpoint",
    applies: (n) => n.type === "azure_cosmosdb",
    check: (n, edges, nodes) => !hasNeighborType(n.id, "azure_private_endpoint", nodes, edges),
    message: (n) => `${label(n)} has no Private Endpoint in the architecture.`,
    fix: "Add azurerm_private_endpoint for Cosmos DB.",
    standards: ["CIS", "NIST"],
  }),
  topologyRule({
    id: "azure_redis_no_private_endpoint",
    level: "warning",
    title: "Redis: no Private Endpoint",
    applies: (n) => n.type === "azure_redis",
    check: (n, edges, nodes) => !hasNeighborType(n.id, "azure_private_endpoint", nodes, edges),
    message: (n) => `${label(n)} has no Private Endpoint in the architecture.`,
    fix: "Add azurerm_private_endpoint for Redis.",
    standards: ["CIS", "NIST"],
  }),
  topologyRule({
    id: "azure_keyvault_no_private_endpoint",
    level: "info",
    title: "Key Vault: no Private Endpoint",
    applies: (n) => n.type === "azure_keyvault",
    check: (n, edges, nodes) => !hasNeighborType(n.id, "azure_private_endpoint", nodes, edges),
    message: (n) => `${label(n)} has no Private Endpoint in the architecture.`,
    fix: "Add azurerm_private_endpoint for Key Vault.",
    standards: ["NIST"],
  }),
  topologyRule({
    id: "azure_apim_no_waf",
    level: "warning",
    title: "APIM: no WAF or Application Gateway in front",
    applies: (n) => n.type === "azure_apim",
    check: (n, edges, nodes) => !hasNeighborType(n.id, WAF_TYPES, nodes, edges),
    message: (n) => `${label(n)} has no WAF protecting the API gateway.`,
    fix: "Place azurerm_application_gateway (WAF_v2) or Azure Front Door in front of APIM.",
    standards: ["PCI", "SOC2", "CIS"],
  }),
  topologyRule({
    id: "azure_aks_no_defender",
    level: "warning",
    title: "AKS: Microsoft Defender for Containers not enabled",
    applies: (n) => n.type === "azure_aks",
    check: (n, edges, nodes) => !nodes.some((x) => x.type === "azure_defender"),
    message: (n) => `${label(n)} has no Microsoft Defender for Containers.`,
    fix: "Add azurerm_security_center_subscription_pricing for Containers.",
    standards: ["CIS", "NIST", "SOC2"],
  }),
  topologyRule({
    id: "azure_no_sentinel",
    level: "info",
    title: "No Microsoft Sentinel (SIEM)",
    applies: (n) => n.type === "azure_log_analytics",
    check: (n, edges, nodes) => !nodes.some((x) => x.type === "azure_sentinel"),
    message: () => "Log Analytics workspace present but no Sentinel SIEM enabled.",
    fix: "Add azurerm_sentinel_log_analytics_workspace_onboarding.",
    standards: ["NIST", "SOC2"],
  }),
  topologyRule({
    id: "azure_compute_no_vnet",
    level: "warning",
    title: "Compute without Virtual Network",
    applies: (n) => COMPUTE_TYPES.has(n.type),
    check: (n, edges, nodes) => !nodes.some((x) => x.type === "azure_vnet"),
    message: (n) => `${label(n)} is not in a VNet-scoped architecture.`,
    fix: "Add azurerm_virtual_network and subnets.",
    standards: ["CIS", "NIST"],
  }),
  topologyRule({
    id: "azure_public_edge_no_waf",
    level: "warning",
    title: "Public edge without WAF",
    applies: (n) => PUBLIC_EDGE_TYPES.has(n.type),
    check: (n, edges, nodes) => {
      const types = nodeTypes(nodes);
      return ![...WAF_TYPES].some((t) => types.has(t));
    },
    message: (n) => `${label(n)} serves public traffic without a WAF component.`,
    fix: "Add Application Gateway WAF_v2, Front Door, or standalone WAF policy.",
    standards: ["PCI", "SOC2", "CIS"],
  }),
  topologyRule({
    id: "azure_vnet_no_firewall",
    level: "info",
    title: "VNet without Azure Firewall",
    applies: (n) => n.type === "azure_vnet",
    check: (n, edges, nodes) => {
      const types = nodeTypes(nodes);
      return !types.has("azure_firewall") && nodes.some((x) => COMPUTE_TYPES.has(x.type));
    },
    message: (n) => `${label(n)} hub/spoke design lacks a central Azure Firewall.`,
    fix: "Add azurerm_firewall for egress/ingress inspection.",
    standards: ["NIST"],
  }),
  topologyRule({
    id: "azure_vmss_no_lb",
    level: "info",
    title: "VMSS not behind load balancer",
    applies: (n) => n.type === "azure_vmss",
    check: (n, edges, nodes) => !hasNeighborType(n.id, ["azure_lb", "azure_agw"], nodes, edges),
    message: (n) => `${label(n)} is not connected to a load balancer on the canvas.`,
    fix: "Attach VMSS to Application Gateway or Load Balancer backend pool.",
    standards: ["NIST", "SOC2"],
  }),
  topologyRule({
    id: "azure_openai_no_private_endpoint",
    level: "warning",
    title: "Azure OpenAI: no Private Endpoint",
    applies: (n) => n.type === "azure_openai",
    check: (n, edges, nodes) => !hasNeighborType(n.id, "azure_private_endpoint", nodes, edges),
    message: (n) => `${label(n)} has no Private Endpoint in the architecture.`,
    fix: "Add azurerm_private_endpoint for Azure OpenAI.",
    standards: ["NIST", "HIPAA"],
  }),
  topologyRule({
    id: "azure_servicebus_no_private_endpoint",
    level: "info",
    title: "Service Bus: no Private Endpoint",
    applies: (n) => n.type === "azure_servicebus",
    check: (n, edges, nodes) => !hasNeighborType(n.id, "azure_private_endpoint", nodes, edges),
    message: (n) => `${label(n)} has no Private Endpoint in the architecture.`,
    fix: "Add azurerm_private_endpoint for Service Bus.",
    standards: ["NIST"],
  }),
  topologyRule({
    id: "azure_eventhub_no_private_endpoint",
    level: "info",
    title: "Event Hubs: no Private Endpoint",
    applies: (n) => n.type === "azure_eventhub",
    check: (n, edges, nodes) => !hasNeighborType(n.id, "azure_private_endpoint", nodes, edges),
    message: (n) => `${label(n)} has no Private Endpoint in the architecture.`,
    fix: "Add azurerm_private_endpoint for Event Hubs.",
    standards: ["NIST"],
  }),
  topologyRule({
    id: "azure_app_service_no_private_endpoint",
    level: "info",
    title: "App Service: no Private Endpoint",
    applies: (n) => n.type === "azure_app_service",
    check: (n, edges, nodes) => !hasNeighborType(n.id, "azure_private_endpoint", nodes, edges),
    message: (n) => `${label(n)} has no Private Endpoint for inbound private access.`,
    fix: "Add azurerm_private_endpoint for sites.",
    standards: ["NIST"],
  }),
  topologyRule({
    id: "azure_functions_no_keyvault",
    level: "info",
    title: "Functions without Key Vault",
    applies: (n) => n.type === "azure_functions",
    check: (n, edges, nodes) => !nodes.some((x) => x.type === "azure_keyvault"),
    message: (n) => `${label(n)} may store secrets in app settings.`,
    fix: "Reference secrets from Key Vault.",
    standards: ["CIS", "NIST"],
  }),
  topologyRule({
    id: "azure_acr_no_private_endpoint",
    level: "info",
    title: "ACR: no Private Endpoint",
    applies: (n) => n.type === "azure_acr",
    check: (n, edges, nodes) => !hasNeighborType(n.id, "azure_private_endpoint", nodes, edges),
    message: (n) => `${label(n)} has no Private Endpoint for pull/push from VNet.`,
    fix: "Add azurerm_private_endpoint for Container Registry.",
    standards: ["CIS", "NIST"],
  }),
  topologyRule({
    id: "azure_db_no_defender",
    level: "info",
    title: "Database without Defender for Cloud",
    applies: (n) => DB_TYPES.has(n.type),
    check: (n, edges, nodes) => !nodes.some((x) => x.type === "azure_defender"),
    message: (n) => `${label(n)} architecture lacks Defender database plan.`,
    fix: "Enable Defender for SQL, Cosmos DB, or open-source databases.",
    standards: ["CIS", "NIST"],
  }),
  topologyRule({
    id: "azure_orphaned_nodes",
    level: "info",
    title: "Resources not connected on canvas",
    applies: () => true,
    check: (n, edges, nodes) => nodes.length > 1 && edges.length === 0,
    message: (n) => `${label(n)} is not connected to other resources.`,
    fix: "Draw edges to document data flows and dependencies.",
    standards: ["NIST"],
  }),
  topologyRule({
    id: "azure_databricks_no_vnet",
    level: "warning",
    title: "Databricks without VNet in architecture",
    applies: (n) => n.type === "azure_databricks",
    check: (n, edges, nodes) => !nodes.some((x) => x.type === "azure_vnet"),
    message: (n) => `${label(n)} is not deployed into a customer-managed VNet.`,
    fix: "Use VNet injection for Databricks workspaces.",
    standards: ["CIS", "NIST"],
  }),
  topologyRule({
    id: "azure_sql_public_path",
    level: "critical",
    title: "SQL on public edge path",
    applies: (n) => n.type === "azure_sql",
    check: (n, edges, nodes) => {
      const reachable = reachableTypes(n.id, edges, nodes);
      return [...PUBLIC_EDGE_TYPES].some((t) => reachable.has(t));
    },
    message: (n) => `${label(n)} is connected to a public-facing edge component.`,
    fix: "Remove public paths; use Private Endpoint only.",
    standards: ["CIS", "PCI", "HIPAA", "NIST"],
  }),
  topologyRule({
    id: "azure_synapse_no_private_endpoint",
    level: "warning",
    title: "Synapse: no Private Endpoint",
    applies: (n) => n.type === "azure_synapse",
    check: (n, edges, nodes) => !hasNeighborType(n.id, "azure_private_endpoint", nodes, edges),
    message: (n) => `${label(n)} has no Private Endpoint in the architecture.`,
    fix: "Add managed private endpoints for Synapse workspace.",
    standards: ["CIS", "HIPAA", "NIST"],
  }),
  topologyRule({
    id: "azure_frontdoor_no_waf_policy",
    level: "warning",
    title: "Front Door without WAF policy",
    applies: (n) => n.type === "azure_frontdoor",
    check: (n, edges, nodes) =>
      !nodes.some((x) => x.type === "azure_waf") && !cfg(n, "web_application_firewall_policy_id"),
    message: (n) => `${label(n)} has no linked WAF policy in architecture.`,
    fix: "Associate a WAF policy with Front Door routes.",
    standards: ["PCI", "SOC2", "CIS"],
  }),
  topologyRule({
    id: "azure_hybrid_no_vpn",
    level: "info",
    title: "Hybrid connection without VPN gateway",
    applies: (n) => n.type === "azure_hybrid",
    check: (n, edges, nodes) => {
      const types = nodeTypes(nodes);
      return !types.has("azure_vpn_gateway") && !types.has("azure_firewall");
    },
    message: (n) => `${label(n)} lacks VPN/ExpressRoute gateway in architecture.`,
    fix: "Add VPN Gateway or ExpressRoute for hybrid connectivity.",
    standards: ["NIST"],
  }),
];

// ─── NSG rules ────────────────────────────────────────────────────────────────

function ruleMatchesPort(rule, port) {
  if (["all", "-1", "icmp"].includes(rule.protocol)) return true;
  const text = String(rule.port ?? "");
  if (["-1", "*", "all"].includes(text)) return true;
  if (text.includes("-")) {
    const [start, end] = text.split("-", 2);
    const lo = parseInt(start, 10);
    const hi = parseInt(end, 10);
    if (!Number.isNaN(lo) && !Number.isNaN(hi)) return lo <= port && port <= hi;
    return false;
  }
  const single = parseInt(text, 10);
  return !Number.isNaN(single) && single === port;
}

function isPublicSource(source) {
  return ["0.0.0.0/0", "::/0", "all", "0.0.0.0", "*"].includes(String(source ?? "").trim());
}

function sgAllowsAllPublic(sg) {
  for (const rule of sg.inbound ?? []) {
    if (["all", "-1", "*"].includes(rule.protocol) && isPublicSource(rule.source)) return true;
    if (isPublicSource(rule.source) && ["tcp", "udp"].includes(rule.protocol)) {
      const port = String(rule.port);
      if (["-1", "*", "all", "0-65535", "None"].includes(port)) return true;
    }
  }
  return false;
}

function isWideRange(rule) {
  const text = String(rule.port ?? "");
  if (["-1", "*", "all"].includes(text)) return false;
  if (text.includes("-")) {
    const [start, end] = text.split("-", 2);
    const lo = parseInt(start, 10);
    const hi = parseInt(end, 10);
    if (!Number.isNaN(lo) && !Number.isNaN(hi)) {
      return hi - lo >= 1000 && isPublicSource(rule.source);
    }
    return false;
  }
  return false;
}

function nsgPortRule(id, port, level, portLabel, fix) {
  return {
    id,
    level,
    title: `NSG: ${portLabel} (${port}) open to internet`,
    check: (sg) => (sg.inbound ?? []).some((r) => ruleMatchesPort(r, port) && isPublicSource(r.source)),
    message: (sg) => `NSG "${sg.name}" allows ${portLabel} port ${port} from the internet.`,
    fix,
    standards: ["CIS", "NIST", "PCI"],
  };
}

export const AZURE_NSG_RULES = [
  {
    id: "azure_nsg_all_traffic_open",
    level: "critical",
    title: "NSG: all inbound traffic allowed from internet",
    check: (sg) => sgAllowsAllPublic(sg),
    message: (sg) => `NSG "${sg.name}" allows all inbound traffic from the internet.`,
    fix: "Remove the catch-all allow-all inbound rule.",
    standards: ["CIS", "NIST", "PCI"],
  },
  nsgPortRule("azure_nsg_ssh_open", 22, "critical", "SSH", "Restrict SSH to known IP ranges or use Azure Bastion."),
  nsgPortRule("azure_nsg_rdp_open", 3389, "critical", "RDP", "Block RDP from the internet; use Azure Bastion."),
  nsgPortRule(
    "azure_nsg_postgres_open",
    5432,
    "critical",
    "PostgreSQL",
    "Scope PostgreSQL to application subnet CIDR only.",
  ),
  nsgPortRule("azure_nsg_mysql_open", 3306, "critical", "MySQL", "Scope MySQL to application subnet CIDR only."),
  nsgPortRule("azure_nsg_redis_open", 6380, "critical", "Redis (TLS)", "Never expose Redis to the internet."),
  nsgPortRule("azure_nsg_redis_plain_open", 6379, "critical", "Redis", "Disable non-TLS Redis port exposure."),
  nsgPortRule("azure_nsg_mongodb_open", 27017, "critical", "MongoDB", "Restrict MongoDB to private CIDR ranges."),
  nsgPortRule("azure_nsg_memcached_open", 11211, "critical", "Memcached", "Memcached must not be internet-facing."),
  nsgPortRule(
    "azure_nsg_elasticsearch_open",
    9200,
    "critical",
    "Elasticsearch",
    "Restrict search APIs to private networks.",
  ),
  nsgPortRule("azure_nsg_kafka_open", 9092, "critical", "Kafka", "Scope Kafka broker ports to client subnets."),
  nsgPortRule(
    "azure_nsg_sql_server_open",
    1433,
    "critical",
    "SQL Server",
    "Do not expose SQL Server to the internet.",
  ),
  nsgPortRule("azure_nsg_http_open", 80, "warning", "HTTP", "Prefer HTTPS-only ingress from trusted sources."),
  nsgPortRule("azure_nsg_https_open", 443, "info", "HTTPS", "Verify WAF protects public HTTPS ingress."),
  {
    id: "azure_nsg_icmp_open",
    level: "warning",
    title: "NSG: ICMP open to internet",
    check: (sg) => (sg.inbound ?? []).some((r) => r.protocol === "icmp" && isPublicSource(r.source)),
    message: (sg) => `NSG "${sg.name}" allows ICMP from the internet.`,
    fix: "Remove ICMP from public ingress unless required.",
    standards: ["CIS", "NIST"],
  },
  {
    id: "azure_nsg_wide_range_open",
    level: "warning",
    title: "NSG: wide port range open to internet",
    check: (sg) => (sg.inbound ?? []).some((r) => isWideRange(r)),
    message: (sg) => `NSG "${sg.name}" allows a wide port range from the internet.`,
    fix: "Narrow the port range to only required ports.",
    standards: ["CIS", "NIST"],
  },
];

// ─── IAM rules ────────────────────────────────────────────────────────────────

function actionMatches(actions, ...patterns) {
  const joined = actions.map(String).join(" ").toLowerCase();
  return patterns.some((p) => joined.includes(p.toLowerCase()));
}

export const AZURE_IAM_RULES = [
  {
    id: "azure_iam_owner_binding",
    level: "critical",
    title: "RBAC: Owner role assignment",
    check: (role) =>
      (role.policies ?? []).some(
        (p) => p.effect === "Allow" && actionMatches(p.actions ?? [], "owner", "/owner"),
      ),
    message: (role) =>
      `RBAC binding "${role.name}" grants Owner at subscription or resource group scope.`,
    fix: "Replace Owner with least-privilege custom roles.",
    standards: ["CIS", "NIST", "SOC2"],
  },
  {
    id: "azure_iam_contributor_wildcard",
    level: "critical",
    title: "RBAC: Contributor on broad scope",
    check: (role) =>
      (role.policies ?? []).some(
        (p) =>
          p.effect === "Allow" &&
          actionMatches(p.actions ?? [], "contributor", "/contributor") &&
          (p.resources ?? []).some((r) => String(r) === "*"),
      ),
    message: (role) =>
      `RBAC binding "${role.name}" grants Contributor with wildcard scope.`,
    fix: "Scope Contributor to specific resource groups.",
    standards: ["CIS", "NIST", "SOC2"],
  },
  {
    id: "azure_iam_public_principal",
    level: "critical",
    title: "RBAC: public principal assignment",
    check: (role) =>
      (role.policies ?? []).some(
        (p) =>
          p.effect === "Allow" &&
          (p.resources ?? []).some((r) => {
            const lower = String(r).toLowerCase();
            return ["allusers", "allauthenticatedusers", "everyone", "public"].some((pat) =>
              lower.includes(pat),
            );
          }),
      ),
    message: (role) =>
      `RBAC binding "${role.name}" grants access to a public principal.`,
    fix: "Remove public principal assignments.",
    standards: ["CIS", "NIST", "PCI", "SOC2"],
  },
  {
    id: "azure_iam_user_access_admin",
    level: "warning",
    title: "RBAC: User Access Administrator",
    check: (role) =>
      (role.policies ?? []).some(
        (p) => p.effect === "Allow" && actionMatches(p.actions ?? [], "user access administrator"),
      ),
    message: (role) =>
      `RBAC binding "${role.name}" can grant roles to others (privilege escalation).`,
    fix: "Limit User Access Administrator to break-glass admins.",
    standards: ["CIS", "NIST", "SOC2"],
  },
  {
    id: "azure_iam_keyvault_admin",
    level: "warning",
    title: "RBAC: Key Vault Administrator",
    check: (role) =>
      (role.policies ?? []).some(
        (p) =>
          p.effect === "Allow" &&
          actionMatches(p.actions ?? [], "key vault administrator", "keyvault administrator"),
      ),
    message: (role) =>
      `RBAC binding "${role.name}" has full Key Vault administrative access.`,
    fix: "Use Key Vault Secrets User/Crypto Officer scoped to vaults.",
    standards: ["CIS", "NIST", "HIPAA"],
  },
  {
    id: "azure_iam_storage_blob_owner",
    level: "warning",
    title: "RBAC: Storage Blob Data Owner on wildcard",
    check: (role) =>
      (role.policies ?? []).some(
        (p) =>
          p.effect === "Allow" &&
          actionMatches(p.actions ?? [], "storage blob data owner") &&
          (p.resources ?? []).some((r) => String(r) === "*"),
      ),
    message: (role) =>
      `RBAC binding "${role.name}" can modify all blob data in scope.`,
    fix: "Use Storage Blob Data Contributor on specific containers.",
    standards: ["CIS", "NIST", "PCI"],
  },
  {
    id: "azure_iam_sql_contributor",
    level: "warning",
    title: "RBAC: broad SQL contributor role",
    check: (role) =>
      (role.policies ?? []).some(
        (p) =>
          p.effect === "Allow" &&
          actionMatches(p.actions ?? [], "sql db contributor", "sql server contributor"),
      ),
    message: (role) =>
      `RBAC binding "${role.name}" can modify SQL servers or databases.`,
    fix: "Use SQL DB Contributor only on required databases.",
    standards: ["CIS", "NIST", "HIPAA"],
  },
  {
    id: "azure_iam_managed_identity_operator",
    level: "info",
    title: "RBAC: managed identity management",
    check: (role) =>
      (role.policies ?? []).some(
        (p) =>
          p.effect === "Allow" &&
          actionMatches(p.actions ?? [], "managed identity operator", "managed identity contributor"),
      ),
    message: (role) =>
      `RBAC binding "${role.name}" can assign or manage managed identities.`,
    fix: "Restrict identity role assignments to platform admins.",
    standards: ["NIST", "SOC2"],
  },
  {
    id: "azure_iam_secrets_officer_wildcard",
    level: "warning",
    title: "RBAC: Key Vault Secrets Officer on wildcard",
    check: (role) =>
      (role.policies ?? []).some(
        (p) =>
          p.effect === "Allow" &&
          actionMatches(p.actions ?? [], "key vault secrets officer") &&
          (p.resources ?? []).some((r) => String(r) === "*"),
      ),
    message: (role) =>
      `RBAC binding "${role.name}" can read secrets across all vaults in scope.`,
    fix: "Scope secrets officer to specific Key Vault resources.",
    standards: ["CIS", "NIST", "HIPAA"],
  },
  {
    id: "azure_iam_classic_admin",
    level: "critical",
    title: "RBAC: classic co-administrator",
    check: (role) =>
      (role.policies ?? []).some(
        (p) =>
          p.effect === "Allow" &&
          actionMatches(p.actions ?? [], "classic administrator", "co-administrator"),
      ),
    message: (role) =>
      `RBAC binding "${role.name}" uses legacy subscription co-administrator rights.`,
    fix: "Remove classic administrators; use Azure RBAC only.",
    standards: ["CIS", "NIST", "SOC2"],
  },
];

export const AZURE_RULE_IDS = [
  ...AZURE_CONFIG_RULES.map((r) => r.id),
  ...AZURE_TOPOLOGY_RULES.map((r) => r.id),
  ...AZURE_NSG_RULES.map((r) => r.id),
  ...AZURE_IAM_RULES.map((r) => r.id),
];
