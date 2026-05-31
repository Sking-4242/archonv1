/**
 * GCP validation rules for the Archon Pro canvas engine.
 * Full parity with archon-cli/archon_cli/gcp_validate.py + gcp_helpers.py.
 */

// ─── Helpers (ported from gcp_helpers.py) ─────────────────────────────────────

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

function metadataFlag(node, key) {
  const metadata = cfg(node, "metadata");
  if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
    return isTruthy(metadata[key]);
  }
  if (Array.isArray(metadata)) {
    for (const item of metadata) {
      if (item && typeof item === "object" && key in item) {
        return isTruthy(item[key]);
      }
    }
  }
  return isTruthy(cfg(node, key));
}

function hasPublicIp(node) {
  if (isTruthy(cfg(node, "public_ip"))) return true;
  let interfaces = cfg(node, "network_interface") ?? [];
  if (interfaces && typeof interfaces === "object" && !Array.isArray(interfaces)) {
    interfaces = [interfaces];
  }
  for (const iface of interfaces) {
    if (!iface || typeof iface !== "object") continue;
    let access = iface.access_config ?? [];
    if (access && typeof access === "object" && !Array.isArray(access)) {
      access = [access];
    }
    if (access && access.length > 0) return true;
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

function label(node) {
  return node.data?.label ?? node.type;
}

function intCfg(node, key, fallback = 0) {
  const raw = cfg(node, key, fallback);
  return parseInt(raw ?? fallback ?? 0, 10) || 0;
}

function isTruthyIsFalse(value) {
  return isTruthy(value) === false;
}

function cloudSqlIpv4Enabled(node) {
  let ipv4 = cfg(node, "ipv4_enabled");
  let settings = cfg(node, "settings");
  if (Array.isArray(settings) && settings.length) settings = settings[0];
  let ipConf =
    settings && typeof settings === "object" ? settings.ip_configuration : cfg(node, "ip_configuration");
  if (Array.isArray(ipConf) && ipConf.length) ipConf = ipConf[0];
  if (ipv4 === undefined && ipConf && typeof ipConf === "object") {
    ipv4 = ipConf.ipv4_enabled;
  }
  return ipv4;
}

function cloudSqlSslMode(node) {
  return cfg(node, "ssl_mode") ?? cfgNested(node, "settings", "ip_configuration", "ssl_mode");
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

const DB_TYPES = new Set([
  "gcp_cloudsql",
  "gcp_alloydb",
  "gcp_spanner",
  "gcp_firestore",
  "gcp_bigtable",
  "gcp_memorystore",
]);
const COMPUTE_TYPES = new Set([
  "gcp_gce",
  "gcp_gke",
  "gcp_cloud_run",
  "gcp_cloud_functions",
  "gcp_mig",
  "gcp_app_engine",
]);
const PUBLIC_EDGE_TYPES = new Set(["gcp_lb", "gcp_cdn", "gcp_dns"]);
const STATEFUL_TYPES = new Set(["gcp_gce", "gcp_cloudsql", "gcp_filestore"]);

// ─── Config rules ─────────────────────────────────────────────────────────────

export const GCP_CONFIG_RULES = [
  configRule({
    id: "gcp_vpc_auto_subnets",
    level: "warning",
    title: "VPC: auto-created subnets enabled",
    types: "gcp_vpc",
    check: (n) => isTruthy(cfg(n, "auto_create_subnetworks")),
    message: (n) => `${label(n)} uses auto-created subnets, reducing network segmentation control.`,
    fix: "Disable auto_create_subnetworks and define explicit subnetworks.",
    suggestion: "Set `auto_create_subnetworks = false` on `google_compute_network`.",
    standards: ["CIS", "NIST"],
  }),
  configRule({
    id: "gcp_subnet_no_private_google_access",
    level: "warning",
    title: "Subnet: Private Google Access disabled",
    types: "gcp_subnet",
    check: (n) => cfg(n, "private_ip_google_access") === false,
    message: (n) => `${label(n)} cannot reach Google APIs without public IPs.`,
    fix: "Enable Private Google Access on the subnetwork.",
    suggestion: "Set `private_ip_google_access = true` on `google_compute_subnetwork`.",
    standards: ["CIS", "NIST"],
  }),
  configRule({
    id: "gcp_gce_no_shielded_vm",
    level: "warning",
    title: "GCE: Shielded VM not enabled",
    types: "gcp_gce",
    check: (n) =>
      !isTruthy(cfg(n, "shielded_vm_enabled")) &&
      !isTruthy(cfgNested(n, "shielded_instance_config", "enable_integrity_monitoring")),
    message: (n) => `${label(n)} does not use Shielded VM features.`,
    fix: "Enable Shielded VM integrity monitoring and secure boot.",
    suggestion:
      "Add `shielded_instance_config { enable_integrity_monitoring = true enable_secure_boot = true }`.",
    standards: ["CIS", "NIST"],
  }),
  configRule({
    id: "gcp_gce_serial_port_enabled",
    level: "critical",
    title: "GCE: serial port enabled",
    types: "gcp_gce",
    check: (n) => metadataFlag(n, "serial-port-enable"),
    message: (n) => `${label(n)} exposes the serial port, increasing attack surface.`,
    fix: "Disable serial port access in instance metadata.",
    suggestion: 'Set metadata `serial-port-enable = "FALSE"`.',
    standards: ["CIS", "NIST", "PCI"],
  }),
  configRule({
    id: "gcp_gce_os_login_disabled",
    level: "warning",
    title: "GCE: OS Login not enabled",
    types: "gcp_gce",
    check: (n) => !metadataFlag(n, "enable-oslogin") && !isTruthy(cfg(n, "os_login_enabled")),
    message: (n) => `${label(n)} does not enforce OS Login for SSH access.`,
    fix: "Enable OS Login on the instance or project.",
    suggestion: 'Set metadata `enable-oslogin = "TRUE"` or `enable_oslogin = true`.',
    standards: ["CIS", "NIST"],
  }),
  configRule({
    id: "gcp_gce_public_ip",
    level: "warning",
    title: "GCE: instance has a public IP",
    types: "gcp_gce",
    check: (n) => hasPublicIp(n),
    message: (n) => `${label(n)} is directly reachable from the internet.`,
    fix: "Remove external access config or place the VM behind a load balancer.",
    suggestion: "Remove `access_config` from `network_interface` and use IAP or a bastion.",
    standards: ["CIS", "NIST", "PCI"],
  }),
  configRule({
    id: "gcp_gce_legacy_machine_type",
    level: "info",
    title: "GCE: legacy machine type",
    types: "gcp_gce",
    check: (n) => {
      const mt = String(cfg(n, "machine_type", ""));
      return mt.startsWith("f1-") || mt.startsWith("g1-");
    },
    message: (n) => `${label(n)} uses a deprecated shared-core machine family.`,
    fix: "Migrate to E2 or N2 machine types.",
    suggestion: "Use `e2-medium`, `n2-standard-2`, or newer machine types.",
    standards: ["NIST"],
  }),
  configRule({
    id: "gcp_gce_pd_standard_boot",
    level: "info",
    title: "GCE: pd-standard boot disk",
    types: "gcp_gce",
    check: (n) =>
      cfg(n, "boot_disk_type") === "pd-standard" ||
      cfgNested(n, "boot_disk", "initialize_params", "type") === "pd-standard",
    message: (n) => `${label(n)} uses standard persistent disks with lower performance.`,
    fix: "Use pd-balanced or pd-ssd for production boot disks.",
    suggestion: "Set boot disk type to `pd-balanced` or `pd-ssd`.",
    standards: ["NIST"],
  }),
  configRule({
    id: "gcp_gke_no_private_cluster",
    level: "warning",
    title: "GKE: private cluster not enabled",
    types: "gcp_gke",
    check: (n) =>
      !isTruthy(cfg(n, "private_cluster")) &&
      !isTruthy(cfgNested(n, "private_cluster_config", "enable_private_nodes")),
    message: (n) => `${label(n)} nodes or control plane may be publicly reachable.`,
    fix: "Enable private cluster configuration.",
    suggestion:
      "Set `private_cluster_config { enable_private_nodes = true enable_private_endpoint = true }`.",
    standards: ["CIS", "NIST", "SOC2"],
  }),
  configRule({
    id: "gcp_gke_no_master_authorized_networks",
    level: "warning",
    title: "GKE: no master authorized networks",
    types: "gcp_gke",
    check: (n) =>
      !cfg(n, "master_authorized_networks") &&
      !cfgNested(n, "master_authorized_networks_config", "cidr_blocks"),
    message: (n) => `${label(n)} control plane accepts connections from any IP.`,
    fix: "Configure master authorized networks.",
    suggestion:
      'Add `master_authorized_networks_config { cidr_blocks { cidr_block = "10.0.0.0/8" } }`.',
    standards: ["CIS", "NIST"],
  }),
  configRule({
    id: "gcp_gke_no_workload_identity",
    level: "warning",
    title: "GKE: Workload Identity not enabled",
    types: "gcp_gke",
    check: (n) => !isTruthy(cfg(n, "workload_identity_enabled")) && !cfg(n, "workload_pool"),
    message: (n) => `${label(n)} pods may use overly broad node service account permissions.`,
    fix: "Enable Workload Identity on the cluster.",
    suggestion: 'Set `workload_identity_config { workload_pool = "PROJECT.svc.id.goog" }`.',
    standards: ["CIS", "NIST", "SOC2"],
  }),
  configRule({
    id: "gcp_gke_no_network_policy",
    level: "warning",
    title: "GKE: network policy disabled",
    types: "gcp_gke",
    check: (n) => !cfg(n, "network_policy") && !cfgNested(n, "network_policy_config", "enabled"),
    message: (n) => `${label(n)} allows unrestricted pod-to-pod traffic.`,
    fix: "Enable Calico or Dataplane V2 network policy.",
    suggestion: 'Set `network_policy { enabled = true provider = "CALICO" }`.',
    standards: ["NIST", "SOC2"],
  }),
  configRule({
    id: "gcp_gke_binary_authorization_disabled",
    level: "warning",
    title: "GKE: Binary Authorization disabled",
    types: "gcp_gke",
    check: (n) => isTruthyIsFalse(cfg(n, "binary_authorization_enabled")),
    message: (n) => `${label(n)} can deploy unverified container images.`,
    fix: "Enable Binary Authorization.",
    suggestion: "Configure `google_binary_authorization_policy` and enable on the cluster.",
    standards: ["CIS", "NIST"],
  }),
  configRule({
    id: "gcp_gke_no_release_channel",
    level: "info",
    title: "GKE: no release channel configured",
    types: "gcp_gke",
    check: (n) => {
      const ch = cfg(n, "release_channel");
      return ch === undefined || ch === null || ch === "" || ch === "UNSPECIFIED";
    },
    message: (n) => `${label(n)} is not on a managed release channel.`,
    fix: "Set a release channel (REGULAR or STABLE).",
    suggestion: 'Add `release_channel { channel = "REGULAR" }`.',
    standards: ["NIST"],
  }),
  configRule({
    id: "gcp_cloudsql_public_ip",
    level: "critical",
    title: "Cloud SQL: public IPv4 enabled",
    types: "gcp_cloudsql",
    check: (n) => isTruthy(cloudSqlIpv4Enabled(n)),
    message: (n) => `${label(n)} is reachable from the public internet.`,
    fix: "Disable public IPv4 and use private IP with VPC peering.",
    suggestion:
      "Set `ip_configuration { ipv4_enabled = false private_network = google_compute_network.main.id }`.",
    standards: ["CIS", "PCI", "HIPAA", "NIST"],
  }),
  configRule({
    id: "gcp_cloudsql_weak_ssl",
    level: "warning",
    title: "Cloud SQL: weak SSL mode",
    types: "gcp_cloudsql",
    check: (n) => {
      const sslMode = cloudSqlSslMode(n);
      return sslMode === undefined || sslMode === null || sslMode === "" || sslMode === "ALLOW_UNENCRYPTED_AND_ENCRYPTED";
    },
    message: (n) => `${label(n)} allows unencrypted database connections.`,
    fix: "Require SSL/TLS for all Cloud SQL connections.",
    suggestion: 'Set `ssl_mode = "ENCRYPTED_ONLY"` or `require_ssl = true`.',
    standards: ["CIS", "PCI", "HIPAA"],
  }),
  configRule({
    id: "gcp_cloudsql_no_backup",
    level: "warning",
    title: "Cloud SQL: automated backups disabled",
    types: "gcp_cloudsql",
    check: (n) => !isTruthy(cfg(n, "backup_enabled")) && !cfg(n, "backup_configuration"),
    message: (n) => `${label(n)} has no automated backup configuration.`,
    fix: "Enable automated backups with point-in-time recovery.",
    suggestion: "Add `backup_configuration { enabled = true point_in_time_recovery_enabled = true }`.",
    standards: ["CIS", "SOC2", "NIST"],
  }),
  configRule({
    id: "gcp_cloudsql_zonal_only",
    level: "warning",
    title: "Cloud SQL: single-zone availability",
    types: "gcp_cloudsql",
    check: (n) => cfg(n, "availability_type", "ZONAL") === "ZONAL",
    message: (n) => `${label(n)} is not configured for regional high availability.`,
    fix: "Set availability type to REGIONAL for production databases.",
    suggestion: 'Set `availability_type = "REGIONAL"` on `google_sql_database_instance`.',
    standards: ["NIST", "SOC2"],
  }),
  configRule({
    id: "gcp_cloudsql_no_deletion_protection",
    level: "warning",
    title: "Cloud SQL: deletion protection disabled",
    types: "gcp_cloudsql",
    check: (n) => !isTruthy(cfg(n, "deletion_protection")),
    message: (n) => `${label(n)} can be accidentally deleted.`,
    fix: "Enable deletion protection.",
    suggestion: "Set `deletion_protection = true`.",
    standards: ["NIST", "SOC2"],
  }),
  configRule({
    id: "gcp_gcs_no_uniform_access",
    level: "warning",
    title: "GCS: uniform bucket-level access disabled",
    types: "gcp_gcs",
    check: (n) => !isTruthy(cfg(n, "uniform_bucket_level_access")),
    message: (n) => `${label(n)} uses legacy ACLs that are harder to audit.`,
    fix: "Enable uniform bucket-level access.",
    suggestion: "Set `uniform_bucket_level_access = true` on `google_storage_bucket`.",
    standards: ["CIS", "NIST", "SOC2"],
  }),
  configRule({
    id: "gcp_gcs_no_public_access_prevention",
    level: "critical",
    title: "GCS: public access prevention not enforced",
    types: "gcp_gcs",
    check: (n) => cfg(n, "public_access_prevention") !== "enforced",
    message: (n) => `${label(n)} may allow public object or bucket access.`,
    fix: "Enforce public access prevention.",
    suggestion: 'Set `public_access_prevention = "enforced"`.',
    standards: ["CIS", "NIST", "PCI", "SOC2"],
  }),
  configRule({
    id: "gcp_gcs_no_versioning",
    level: "info",
    title: "GCS: object versioning disabled",
    types: "gcp_gcs",
    check: (n) => !isTruthy(cfg(n, "versioning_enabled")) && !cfg(n, "versioning"),
    message: (n) => `${label(n)} cannot recover from accidental overwrites.`,
    fix: "Enable object versioning.",
    suggestion: "Add `versioning { enabled = true }` to the bucket.",
    standards: ["NIST", "SOC2"],
  }),
  configRule({
    id: "gcp_gcs_no_cmek",
    level: "info",
    title: "GCS: no customer-managed encryption key",
    types: "gcp_gcs",
    check: (n) => !cfg(n, "encryption") && !cfgNested(n, "encryption", "default_kms_key_name"),
    message: (n) => `${label(n)} uses Google-managed encryption only.`,
    fix: "Configure CMEK for sensitive data buckets.",
    suggestion: "Add `encryption { default_kms_key_name = google_kms_crypto_key.key.id }`.",
    standards: ["HIPAA", "PCI", "NIST"],
  }),
  configRule({
    id: "gcp_cloud_run_ingress_all",
    level: "warning",
    title: "Cloud Run: ingress open to all",
    types: "gcp_cloud_run",
    check: (n) => cfg(n, "ingress", "all") === "all",
    message: (n) => `${label(n)} accepts traffic from the entire internet.`,
    fix: "Restrict ingress to internal and load balancer traffic.",
    suggestion: 'Set `ingress = "internal-and-cloud-load-balancing"`.',
    standards: ["CIS", "NIST"],
  }),
  configRule({
    id: "gcp_cloud_run_unauthenticated",
    level: "warning",
    title: "Cloud Run: unauthenticated access allowed",
    types: "gcp_cloud_run",
    check: (n) => isTruthy(cfg(n, "allow_unauthenticated")),
    message: (n) => `${label(n)} allows unauthenticated invoke access.`,
    fix: "Require authentication for service invocation.",
    suggestion: "Remove `allUsers` invoker binding; use IAM-authenticated callers.",
    standards: ["CIS", "NIST", "SOC2"],
  }),
  configRule({
    id: "gcp_cloud_functions_ingress_all",
    level: "warning",
    title: "Cloud Functions: ingress allow all",
    types: "gcp_cloud_functions",
    check: (n) => cfg(n, "ingress_settings", "ALLOW_ALL") === "ALLOW_ALL",
    message: (n) => `${label(n)} accepts traffic from any source.`,
    fix: "Restrict ingress settings to internal traffic.",
    suggestion: 'Set `ingress_settings = "ALLOW_INTERNAL_ONLY"`.',
    standards: ["CIS", "NIST"],
  }),
  configRule({
    id: "gcp_cloud_functions_unauthenticated",
    level: "warning",
    title: "Cloud Functions: unauthenticated access",
    types: "gcp_cloud_functions",
    check: (n) => isTruthy(cfg(n, "allow_unauthenticated")),
    message: (n) => `${label(n)} allows unauthenticated HTTP triggers.`,
    fix: "Require authentication on the function.",
    suggestion: "Remove public invoker IAM bindings.",
    standards: ["CIS", "NIST", "SOC2"],
  }),
  configRule({
    id: "gcp_memorystore_basic_tier",
    level: "warning",
    title: "Memorystore: BASIC tier in use",
    types: "gcp_memorystore",
    check: (n) => cfg(n, "tier", "STANDARD_HA") === "BASIC",
    message: (n) => `${label(n)} lacks automatic failover.`,
    fix: "Use STANDARD_HA tier for production Redis.",
    suggestion: 'Set `tier = "STANDARD_HA"` on `google_redis_instance`.',
    standards: ["NIST", "SOC2"],
  }),
  configRule({
    id: "gcp_memorystore_auth_disabled",
    level: "warning",
    title: "Memorystore: AUTH disabled",
    types: "gcp_memorystore",
    check: (n) => cfg(n, "auth_enabled") === false,
    message: (n) => `${label(n)} does not require Redis AUTH.`,
    fix: "Enable Redis AUTH.",
    suggestion: "Set `auth_enabled = true` on `google_redis_instance`.",
    standards: ["CIS", "PCI", "NIST"],
  }),
  configRule({
    id: "gcp_kms_no_rotation",
    level: "warning",
    title: "Cloud KMS: key rotation not configured",
    types: "gcp_kms",
    check: (n) => {
      const rot = cfg(n, "rotation_period");
      return cfg(n, "protection_level", "SOFTWARE") === "SOFTWARE" && (rot === undefined || rot === null || rot === "" || rot === "0s");
    },
    message: (n) => `${label(n)} does not rotate automatically.`,
    fix: "Configure a rotation period on the crypto key.",
    suggestion: 'Set `rotation_period = "7776000s"` (90 days) on `google_kms_crypto_key`.',
    standards: ["CIS", "PCI", "HIPAA", "NIST"],
  }),
  configRule({
    id: "gcp_secret_manager_user_managed_replication",
    level: "info",
    title: "Secret Manager: user-managed replication",
    types: "gcp_secret_manager",
    check: (n) => cfg(n, "replication_type") === "user_managed",
    message: (n) => `${label(n)} uses user-managed replication — verify multi-region coverage.`,
    fix: "Use automatic replication or multiple user-managed replicas.",
    suggestion: "Prefer `replication { automatic = true }` unless data residency requires otherwise.",
    standards: ["NIST"],
  }),
  configRule({
    id: "gcp_bigquery_no_cmek",
    level: "info",
    title: "BigQuery: no default CMEK configured",
    types: "gcp_bigquery",
    check: (n) => !cfg(n, "default_encryption_configuration"),
    message: (n) => `${label(n)} uses Google-managed encryption only.`,
    fix: "Configure default encryption with Cloud KMS.",
    suggestion: "Add `default_encryption_configuration { kms_key_name = ... }`.",
    standards: ["HIPAA", "PCI", "NIST"],
  }),
  configRule({
    id: "gcp_spanner_regional_only",
    level: "info",
    title: "Cloud Spanner: regional instance config",
    types: "gcp_spanner",
    check: (n) => String(cfg(n, "config", "")).startsWith("regional-"),
    message: (n) => `${label(n)} is not multi-region — plan for DR requirements.`,
    fix: "Use dual-region or multi-region configs for critical workloads.",
    suggestion: "Choose `nam-eur-asia` multi-region configs when RPO/RTO requires it.",
    standards: ["NIST", "SOC2"],
  }),
  configRule({
    id: "gcp_artifact_registry_no_scanning",
    level: "warning",
    title: "Artifact Registry: vulnerability scanning disabled",
    types: "gcp_artifact_registry",
    check: (n) => !isTruthy(cfg(n, "vulnerability_scanning_enabled")),
    message: (n) => `${label(n)} does not scan images for CVEs.`,
    fix: "Enable vulnerability scanning on the repository.",
    suggestion: "Use Artifact Analysis / enable scanning in `google_artifact_registry_repository`.",
    standards: ["CIS", "NIST", "SOC2"],
  }),
  configRule({
    id: "gcp_lb_external_no_armor",
    level: "warning",
    title: "External load balancer without Cloud Armor",
    types: "gcp_lb",
    check: (n) =>
      cfg(n, "load_balancing_scheme", "EXTERNAL") === "EXTERNAL" && !isTruthy(cfg(n, "cloud_armor_enabled")),
    message: (n) => `${label(n)} exposes web traffic without WAF protection.`,
    fix: "Attach a Cloud Armor security policy.",
    suggestion: "Set `security_policy = google_compute_security_policy.policy.id` on backend service.",
    standards: ["CIS", "PCI", "SOC2"],
  }),
  configRule({
    id: "gcp_disk_pd_standard",
    level: "info",
    title: "Persistent Disk: pd-standard type",
    types: "gcp_persistent_disk",
    check: (n) => cfg(n, "type", "pd-balanced") === "pd-standard",
    message: (n) => `${label(n)} uses standard PD with lower IOPS.`,
    fix: "Use pd-balanced or pd-ssd for production disks.",
    standards: ["NIST"],
  }),
  configRule({
    id: "gcp_filestore_basic_tier",
    level: "info",
    title: "Filestore: BASIC_HDD tier",
    types: "gcp_filestore",
    check: (n) => cfg(n, "tier", "BASIC_HDD") === "BASIC_HDD",
    message: (n) => `${label(n)} lacks enterprise HA features.`,
    fix: "Use ENTERPRISE tier for production file shares.",
    standards: ["NIST"],
  }),
  configRule({
    id: "gcp_alloydb_no_backup",
    level: "warning",
    title: "AlloyDB: automated backup not enabled",
    types: "gcp_alloydb",
    check: (n) => cfg(n, "cluster_type", "PRIMARY") === "PRIMARY" && !isTruthy(cfg(n, "automated_backup_enabled")),
    message: (n) => `${label(n)} has no continuous backup configuration.`,
    fix: "Enable automated backup policy.",
    standards: ["NIST", "SOC2"],
  }),
  configRule({
    id: "gcp_bigtable_single_node",
    level: "info",
    title: "Bigtable: single-node cluster",
    types: "gcp_bigtable",
    check: (n) => intCfg(n, "num_nodes", 1) < 2,
    message: (n) => `${label(n)} has no intra-cluster redundancy.`,
    fix: "Use at least 2 nodes for production.",
    standards: ["NIST"],
  }),
  configRule({
    id: "gcp_app_engine_default_sa",
    level: "warning",
    title: "App Engine: default service account",
    types: "gcp_app_engine",
    check: (n) => isTruthy(cfg(n, "default_service_account")),
    message: (n) => `${label(n)} uses the default App Engine service account.`,
    fix: "Use a dedicated least-privilege service account.",
    standards: ["CIS", "NIST"],
  }),
  configRule({
    id: "gcp_pubsub_no_cmek",
    level: "info",
    title: "Pub/Sub: no CMEK configured",
    types: "gcp_pubsub",
    check: (n) => !cfg(n, "kms_key_name"),
    message: (n) => `${label(n)} uses Google-managed encryption only.`,
    fix: "Configure a customer-managed encryption key.",
    standards: ["HIPAA", "PCI", "NIST"],
  }),
  configRule({
    id: "gcp_apigee_evaluation",
    level: "info",
    title: "Apigee: evaluation billing type",
    types: "gcp_apigee",
    check: (n) => cfg(n, "billing_type") === "EVALUATION",
    message: (n) => `${label(n)} uses evaluation tier — not for production.`,
    fix: "Move to PAYG or subscription billing for production.",
    standards: ["NIST"],
  }),
  configRule({
    id: "gcp_composer_small_env",
    level: "info",
    title: "Cloud Composer: small environment size",
    types: "gcp_cloud_composer",
    check: (n) => cfg(n, "environment_size") === "ENVIRONMENT_SIZE_SMALL",
    message: (n) => `${label(n)} may lack capacity for production Airflow workloads.`,
    fix: "Size Composer for expected DAG load.",
    standards: ["NIST"],
  }),
  configRule({
    id: "gcp_dataproc_single_node",
    level: "warning",
    title: "Dataproc: single-node cluster",
    types: "gcp_dataproc",
    check: (n) => cfg(n, "cluster_type") === "SINGLE_NODE",
    message: (n) => `${label(n)} has no worker redundancy.`,
    fix: "Use STANDARD or HIGH_AVAILABILITY cluster types.",
    standards: ["NIST"],
  }),
  configRule({
    id: "gcp_logging_short_retention",
    level: "info",
    title: "Cloud Logging: retention below 30 days",
    types: "gcp_logging",
    check: (n) => intCfg(n, "retention_days", 30) < 30,
    message: (n) => `${label(n)} may not meet audit retention requirements.`,
    fix: "Increase log bucket retention to at least 30 days.",
    standards: ["SOC2", "NIST", "PCI"],
  }),
  configRule({
    id: "gcp_scc_standard_tier",
    level: "info",
    title: "Security Command Center: Standard tier",
    types: "gcp_scc",
    check: (n) => cfg(n, "tier") === "STANDARD",
    message: (n) => `${label(n)} lacks premium threat detection features.`,
    fix: "Evaluate Premium tier for advanced threat detection.",
    standards: ["NIST"],
  }),
  configRule({
    id: "gcp_backup_short_retention",
    level: "warning",
    title: "Backup and DR: retention too short",
    types: "gcp_backup",
    check: (n) => intCfg(n, "retention_days", 30) < 7,
    message: (n) => `${label(n)} retains backups for less than 7 days.`,
    fix: "Increase backup retention for recovery requirements.",
    standards: ["NIST", "SOC2"],
  }),
  configRule({
    id: "gcp_batch_spot",
    level: "info",
    title: "Cloud Batch: SPOT provisioning",
    types: "gcp_cloud_batch",
    check: (n) => cfg(n, "provisioning_model") === "SPOT",
    message: (n) => `${label(n)} uses preemptible capacity — jobs may be interrupted.`,
    fix: "Use STANDARD provisioning for critical batch jobs.",
    standards: ["NIST"],
  }),
  configRule({
    id: "gcp_vpn_classic",
    level: "info",
    title: "Cloud VPN: Classic VPN in use",
    types: "gcp_vpn",
    check: (n) => cfg(n, "vpn_type") === "Classic VPN",
    message: (n) => `${label(n)} uses Classic VPN instead of HA VPN.`,
    fix: "Migrate to HA VPN for production hybrid connectivity.",
    standards: ["NIST"],
  }),
  configRule({
    id: "gcp_interconnect_single_link",
    level: "warning",
    title: "Cloud Interconnect: single link",
    types: "gcp_interconnect",
    check: (n) => intCfg(n, "requested_link_count", 1) < 2,
    message: (n) => `${label(n)} has no link redundancy.`,
    fix: "Request at least two links for HA interconnect.",
    standards: ["NIST", "SOC2"],
  }),
  configRule({
    id: "gcp_dns_public_internal_name",
    level: "warning",
    title: "Cloud DNS: public zone with internal-style name",
    types: "gcp_dns",
    check: (n) => cfg(n, "visibility") === "public" && String(cfg(n, "dns_name", "")).endsWith(".internal."),
    message: (n) => `${label(n)} may expose internal naming publicly.`,
    fix: "Use private visibility for internal DNS zones.",
    standards: ["NIST"],
  }),
  configRule({
    id: "gcp_vertex_public_endpoint",
    level: "warning",
    title: "Vertex AI: public endpoint enabled",
    types: "gcp_vertex_ai",
    check: (n) => isTruthy(cfg(n, "public_endpoint_enabled")),
    message: (n) => `${label(n)} exposes a public prediction endpoint.`,
    fix: "Use private endpoints or IAM-restricted access.",
    standards: ["NIST", "HIPAA"],
  }),
  configRule({
    id: "gcp_firestore_no_delete_protection",
    level: "info",
    title: "Firestore: deletion protection disabled",
    types: "gcp_firestore",
    check: (n) => !isTruthy(cfg(n, "delete_protection_state")) && !isTruthy(cfg(n, "deletion_protection")),
    message: (n) => `${label(n)} can be deleted without protection.`,
    fix: "Enable delete protection on the database.",
    standards: ["NIST"],
  }),
  configRule({
    id: "gcp_datastore_no_location",
    level: "info",
    title: "Datastore: location not specified",
    types: "gcp_datastore",
    check: (n) => !cfg(n, "location_id"),
    message: (n) => `${label(n)} may not meet data residency requirements.`,
    fix: "Set an explicit location for the Datastore instance.",
    standards: ["NIST", "HIPAA"],
  }),
  configRule({
    id: "gcp_mig_single_instance",
    level: "warning",
    title: "MIG: target size below 2",
    types: "gcp_mig",
    check: (n) => intCfg(n, "target_size", 1) < 2,
    message: (n) => `${label(n)} is not horizontally redundant.`,
    fix: "Set target size to at least 2 for HA.",
    standards: ["NIST", "SOC2"],
  }),
  configRule({
    id: "gcp_nat_manual_no_ips",
    level: "warning",
    title: "Cloud NAT: manual IPs not configured",
    types: "gcp_nat",
    check: (n) => cfg(n, "nat_ip_allocate_option") === "MANUAL_ONLY" && !cfg(n, "nat_ips"),
    message: (n) => `${label(n)} uses MANUAL_ONLY without allocated NAT IPs.`,
    fix: "Allocate static NAT IPs or use AUTO_ONLY.",
    standards: ["NIST"],
  }),
  configRule({
    id: "gcp_private_sc_no_target",
    level: "info",
    title: "Private Service Connect: no target service",
    types: "gcp_private_sc",
    check: (n) => !cfg(n, "target_service"),
    message: (n) => `${label(n)} is missing a target service attachment.`,
    fix: "Configure the target service for PSC.",
    standards: ["NIST"],
  }),
  configRule({
    id: "gcp_neg_internet",
    level: "warning",
    title: "NEG: internet IP endpoint group",
    types: "gcp_network_endpoint_grp",
    check: (n) => cfg(n, "neg_type") === "INTERNET_IP_PORT",
    message: (n) => `${label(n)} exposes internet-routable endpoints directly.`,
    fix: "Prefer GCE_VM_IP_PORT or SERVERLESS NEG types.",
    standards: ["NIST", "PCI"],
  }),
  configRule({
    id: "gcp_cdn_no_cache_policy",
    level: "info",
    title: "Cloud CDN: cache policy not configured",
    types: "gcp_cdn",
    check: (n) => !isTruthy(cfg(n, "signed_url_cache_enabled")) && !isTruthy(cfg(n, "cache_mode")),
    message: (n) => `${label(n)} may serve stale or unauthenticated content.`,
    fix: "Configure cache mode and signed URL keys if needed.",
    standards: ["NIST"],
  }),
  configRule({
    id: "gcp_workflows_no_region",
    level: "info",
    title: "Workflows: region not set",
    types: "gcp_workflows",
    check: (n) => !cfg(n, "region"),
    message: (n) => `${label(n)} region is unspecified.`,
    fix: "Set an explicit region for the workflow.",
    standards: ["NIST"],
  }),
  configRule({
    id: "gcp_scheduler_every_minute",
    level: "info",
    title: "Cloud Scheduler: runs every minute",
    types: "gcp_scheduler",
    check: (n) => cfg(n, "schedule") === "* * * * *",
    message: (n) => `${label(n)} triggers every minute — verify this is intentional.`,
    fix: "Use a less aggressive schedule unless required.",
    standards: ["NIST"],
  }),
  configRule({
    id: "gcp_tasks_high_dispatch_rate",
    level: "info",
    title: "Cloud Tasks: high dispatch rate",
    types: "gcp_tasks",
    check: (n) => intCfg(n, "max_dispatches_per_second", 500) > 500,
    message: (n) => `${label(n)} allows very high dispatch throughput.`,
    fix: "Tune dispatch limits to protect downstream services.",
    standards: ["NIST"],
  }),
  configRule({
    id: "gcp_dataflow_high_max_workers",
    level: "info",
    title: "Dataflow: high max worker count",
    types: "gcp_dataflow",
    check: (n) => intCfg(n, "max_workers", 10) > 100,
    message: (n) => `${label(n)} can scale to a large worker fleet — review cost controls.`,
    fix: "Set autoscaling caps appropriate for workload.",
    standards: ["NIST"],
  }),
  configRule({
    id: "gcp_automl_high_budget",
    level: "info",
    title: "AutoML: high training budget",
    types: "gcp_automl",
    check: (n) => intCfg(n, "budget_milli_node_hours", 1000) > 10000,
    message: (n) => `${label(n)} has a large AutoML training budget.`,
    fix: "Set budget limits to control training spend.",
    standards: ["NIST"],
  }),
  configRule({
    id: "gcp_cert_manager_edge_scope",
    level: "info",
    title: "Certificate Manager: edge cache scope",
    types: "gcp_certificate_manager",
    check: (n) => cfg(n, "scope") === "EDGE_CACHE",
    message: (n) => `${label(n)} uses EDGE_CACHE scope — verify CDN attachment.`,
    fix: "Ensure certificates are attached to the correct load balancer/CDN.",
    standards: ["NIST"],
  }),
  configRule({
    id: "gcp_looker_trial",
    level: "info",
    title: "Looker: trial edition",
    types: "gcp_looker",
    check: (n) => cfg(n, "platform_edition") === "LOOKER_CORE_TRIAL",
    message: (n) => `${label(n)} uses trial edition — not for production.`,
    fix: "Upgrade to Standard or Enterprise edition.",
    standards: ["NIST"],
  }),
  configRule({
    id: "gcp_analytics_hub_no_description",
    level: "info",
    title: "Analytics Hub: missing description",
    types: "gcp_analytics_hub",
    check: (n) => !cfg(n, "description"),
    message: (n) => `${label(n)} listing has no description for data consumers.`,
    fix: "Add a description documenting shared datasets.",
    standards: ["NIST"],
  }),
  configRule({
    id: "gcp_data_catalog_no_region",
    level: "info",
    title: "Data Catalog: region not set",
    types: "gcp_data_catalog",
    check: (n) => !cfg(n, "region"),
    message: (n) => `${label(n)} region is unspecified.`,
    fix: "Set region for catalog resources.",
    standards: ["NIST"],
  }),
  configRule({
    id: "gcp_cloud_deploy_no_location",
    level: "info",
    title: "Cloud Deploy: location not set",
    types: "gcp_cloud_deploy",
    check: (n) => !cfg(n, "location"),
    message: (n) => `${label(n)} delivery pipeline location is unspecified.`,
    fix: "Set a delivery pipeline region.",
    standards: ["NIST"],
  }),
  configRule({
    id: "gcp_cloud_build_default_machine",
    level: "info",
    title: "Cloud Build: default machine type",
    types: "gcp_cloud_build",
    check: (n) => cfg(n, "machine_type") === "UNSPECIFIED",
    message: (n) => `${label(n)} uses unspecified machine type — may be slow or costly.`,
    fix: "Set an explicit machine type for builds.",
    standards: ["NIST"],
  }),
  configRule({
    id: "gcp_source_repo_no_name",
    level: "info",
    title: "Source Repository: name not set",
    types: "gcp_source_repo",
    check: (n) => !cfg(n, "name"),
    message: (n) => `${label(n)} repository name is missing.`,
    fix: "Set a repository name.",
    standards: ["NIST"],
  }),
  configRule({
    id: "gcp_monitoring_short_retention",
    level: "info",
    title: "Cloud Monitoring: short metric retention",
    types: "gcp_monitoring",
    check: (n) => intCfg(n, "retention_days", 42) < 14,
    message: (n) => `${label(n)} retains custom metrics for less than 14 days.`,
    fix: "Increase retention for operational history.",
    standards: ["NIST"],
  }),
  configRule({
    id: "gcp_trace_disabled",
    level: "info",
    title: "Cloud Trace: tracing not enabled",
    types: "gcp_trace",
    check: (n) => !isTruthy(cfg(n, "enabled")),
    message: (n) => `${label(n)} distributed tracing is not configured.`,
    fix: "Enable Cloud Trace for microservices observability.",
    standards: ["NIST", "SOC2"],
  }),
  configRule({
    id: "gcp_error_reporting_disabled",
    level: "info",
    title: "Error Reporting: not enabled",
    types: "gcp_error_reporting",
    check: (n) => !isTruthy(cfg(n, "enabled")),
    message: (n) => `${label(n)} application errors may go unnoticed.`,
    fix: "Enable Error Reporting for application stacks.",
    standards: ["NIST", "SOC2"],
  }),
  configRule({
    id: "gcp_natural_lang_html",
    level: "info",
    title: "Natural Language: HTML document type",
    types: "gcp_natural_lang",
    check: (n) => cfg(n, "document_type") === "HTML",
    message: (n) =>
      `${label(n)} analyzes HTML — sanitize input to avoid injection in downstream systems.`,
    fix: "Prefer PLAIN_TEXT for untrusted content.",
    standards: ["NIST"],
  }),
  configRule({
    id: "gcp_speech_phone_model",
    level: "info",
    title: "Speech-to-Text: phone_call model",
    types: "gcp_speech",
    check: (n) => cfg(n, "model") === "phone_call",
    message: (n) => `${label(n)} uses telephony-tuned model — verify accuracy for your audio source.`,
    fix: "Select the model matching your audio characteristics.",
    standards: ["NIST"],
  }),
  configRule({
    id: "gcp_translation_auto_detect",
    level: "info",
    title: "Translation: auto language detection",
    types: "gcp_translation",
    check: (n) => cfg(n, "source_language_code") === "auto",
    message: (n) => `${label(n)} auto-detects source language — may misclassify short strings.`,
    fix: "Set explicit source language when known.",
    standards: ["NIST"],
  }),
  configRule({
    id: "gcp_vision_face_detection",
    level: "info",
    title: "Vision AI: face detection enabled",
    types: "gcp_vision_ai",
    check: (n) => cfg(n, "feature_type") === "FACE_DETECTION",
    message: (n) => `${label(n)} processes biometric data — review privacy requirements.`,
    fix: "Ensure consent and data handling policies for biometric processing.",
    standards: ["HIPAA", "NIST"],
  }),
  configRule({
    id: "gcp_gce_preemptible",
    level: "info",
    title: "GCE: preemptible instance",
    types: "gcp_gce",
    check: (n) => isTruthy(cfg(n, "preemptible")),
    message: (n) => `${label(n)} uses preemptible VMs — not suitable for stateful production.`,
    fix: "Use standard instances for production workloads.",
    standards: ["NIST"],
  }),
  configRule({
    id: "gcp_gke_legacy_abac",
    level: "warning",
    title: "GKE: legacy ABAC enabled",
    types: "gcp_gke",
    check: (n) => isTruthy(cfg(n, "enable_legacy_abac")),
    message: (n) => `${label(n)} uses legacy ABAC instead of RBAC.`,
    fix: "Disable legacy ABAC and use RBAC.",
    standards: ["CIS", "NIST"],
  }),
  configRule({
    id: "gcp_gke_no_maintenance_window",
    level: "info",
    title: "GKE: no maintenance window",
    types: "gcp_gke",
    check: (n) => {
      const mw = cfg(n, "maintenance_window");
      return mw === undefined || mw === null || mw === "";
    },
    message: (n) => `${label(n)} has no configured maintenance window.`,
    fix: "Configure a recurring maintenance window.",
    standards: ["NIST"],
  }),
  configRule({
    id: "gcp_cloudsql_no_pitr",
    level: "warning",
    title: "Cloud SQL: point-in-time recovery disabled",
    types: "gcp_cloudsql",
    check: (n) => !isTruthy(cfg(n, "point_in_time_recovery_enabled")),
    message: (n) => `${label(n)} cannot restore to arbitrary timestamps.`,
    fix: "Enable point-in-time recovery in backup configuration.",
    standards: ["NIST", "SOC2"],
  }),
  configRule({
    id: "gcp_gcs_no_access_logging",
    level: "info",
    title: "GCS: access logging not configured",
    types: "gcp_gcs",
    check: (n) => !isTruthy(cfg(n, "log_bucket")),
    message: (n) => `${label(n)} has no access log sink.`,
    fix: "Configure bucket access logging.",
    standards: ["CIS", "SOC2", "NIST"],
  }),
  configRule({
    id: "gcp_cloud_run_cpu_always_allocated",
    level: "info",
    title: "Cloud Run: CPU always allocated",
    types: "gcp_cloud_run",
    check: (n) => isTruthyIsFalse(cfg(n, "cpu_throttling")),
    message: (n) => `${label(n)} keeps CPU allocated when idle — higher cost.`,
    fix: "Enable CPU throttling unless always-on processing is required.",
    standards: ["NIST"],
  }),
  configRule({
    id: "gcp_functions_cold_start_http",
    level: "info",
    title: "Cloud Functions: HTTP with min instances 0",
    types: "gcp_cloud_functions",
    check: (n) => intCfg(n, "min_instance_count", 0) === 0 && cfg(n, "trigger_type") === "http",
    message: (n) => `${label(n)} may incur cold start latency.`,
    fix: "Set min_instance_count > 0 for latency-sensitive HTTP functions.",
    standards: ["NIST"],
  }),
  configRule({
    id: "gcp_spanner_low_capacity",
    level: "info",
    title: "Cloud Spanner: low processing units",
    types: "gcp_spanner",
    check: (n) => intCfg(n, "processing_units", 100) < 100,
    message: (n) => `${label(n)} may be under-provisioned for production load.`,
    fix: "Increase processing units based on load testing.",
    standards: ["NIST"],
  }),
  configRule({
    id: "gcp_memorystore_no_transit_encryption",
    level: "warning",
    title: "Memorystore: transit encryption disabled",
    types: "gcp_memorystore",
    check: (n) => cfg(n, "transit_encryption_mode") === "DISABLED",
    message: (n) => `${label(n)} does not encrypt data in transit.`,
    fix: "Set transit_encryption_mode = SERVER_AUTHENTICATION.",
    standards: ["CIS", "PCI", "NIST"],
  }),
  configRule({
    id: "gcp_kms_software_for_hsm_required",
    level: "warning",
    title: "Cloud KMS: software key where HSM required",
    types: "gcp_kms",
    check: (n) => cfg(n, "protection_level") !== "HSM" && isTruthy(cfg(n, "requires_hsm")),
    message: (n) => `${label(n)} uses software protection for HSM-required data.`,
    fix: "Set protection_level = HSM.",
    standards: ["HIPAA", "PCI", "NIST"],
  }),
  configRule({
    id: "gcp_lb_internal_global_access",
    level: "warning",
    title: "Internal LB: global access enabled",
    types: "gcp_lb",
    check: (n) => cfg(n, "load_balancing_scheme") === "INTERNAL" && isTruthy(cfg(n, "allow_global_access")),
    message: (n) => `${label(n)} allows cross-region client access to internal LB.`,
    fix: "Disable global access unless multi-region clients are required.",
    standards: ["NIST"],
  }),
  configRule({
    id: "gcp_gce_default_service_account",
    level: "warning",
    title: "GCE: default compute service account",
    types: "gcp_gce",
    check: (n) => isTruthy(cfg(n, "use_default_service_account")),
    message: (n) => `${label(n)} uses the default compute service account.`,
    fix: "Attach a dedicated least-privilege service account.",
    standards: ["CIS", "NIST"],
  }),
  configRule({
    id: "gcp_artifact_registry_public",
    level: "critical",
    title: "Artifact Registry: public repository",
    types: "gcp_artifact_registry",
    check: (n) => isTruthy(cfg(n, "public_repository")),
    message: (n) => `${label(n)} allows public pull access to container images.`,
    fix: "Make the repository private and use IAM for access.",
    standards: ["CIS", "NIST", "SOC2"],
  }),
  configRule({
    id: "gcp_pubsub_short_retention",
    level: "info",
    title: "Pub/Sub: short message retention",
    types: "gcp_pubsub",
    check: (n) => {
      const dur = cfg(n, "message_retention_duration");
      return dur === undefined || dur === null || dur === "" || dur === "86400s";
    },
    message: (n) => `${label(n)} retains undelivered messages for less than 7 days.`,
    fix: "Increase message_retention_duration for recovery scenarios.",
    standards: ["NIST", "SOC2"],
  }),
  configRule({
    id: "gcp_bigquery_no_partitioning",
    level: "info",
    title: "BigQuery: partitioning strategy not documented",
    types: "gcp_bigquery",
    check: (n) => !isTruthy(cfg(n, "partitioned_tables")),
    message: (n) => `${label(n)} lacks partitioned table configuration.`,
    fix: "Partition large tables to reduce query cost.",
    standards: ["NIST"],
  }),
  configRule({
    id: "gcp_dataproc_no_autoscaling",
    level: "info",
    title: "Dataproc: autoscaling disabled",
    types: "gcp_dataproc",
    check: (n) => !isTruthy(cfg(n, "autoscaling_enabled")),
    message: (n) => `${label(n)} cannot scale workers with demand.`,
    fix: "Enable autoscaling policy on the cluster.",
    standards: ["NIST"],
  }),
  configRule({
    id: "gcp_vertex_no_private_connect",
    level: "info",
    title: "Vertex AI: no private connectivity",
    types: "gcp_vertex_ai",
    check: (n) => !isTruthy(cfg(n, "private_service_connect")),
    message: (n) => `${label(n)} lacks private service connect configuration.`,
    fix: "Use VPC peering or Private Service Connect for Vertex endpoints.",
    standards: ["NIST", "HIPAA"],
  }),
  configRule({
    id: "gcp_firestore_no_pitr",
    level: "info",
    title: "Firestore: PITR not enabled",
    types: "gcp_firestore",
    check: (n) => !isTruthy(cfg(n, "point_in_time_recovery_enablement")),
    message: (n) => `${label(n)} lacks point-in-time recovery.`,
    fix: "Enable PITR on Firestore database.",
    standards: ["NIST", "SOC2"],
  }),
  configRule({
    id: "gcp_vpc_no_flow_logs",
    level: "warning",
    title: "VPC: VPC Flow Logs not enabled",
    types: "gcp_vpc",
    check: (n) => !isTruthy(cfg(n, "enable_flow_logs")),
    message: (n) => `${label(n)} has no VPC Flow Logs for network visibility.`,
    fix: "Enable VPC Flow Logs on subnets.",
    suggestion: "Configure `log_config { flow_sampling = 0.5 }` on subnetworks.",
    standards: ["CIS", "NIST", "SOC2"],
  }),
  configRule({
    id: "gcp_gcs_no_lifecycle",
    level: "info",
    title: "GCS: no lifecycle rules",
    types: "gcp_gcs",
    check: (n) => !cfg(n, "lifecycle_rules"),
    message: (n) => `${label(n)} has no lifecycle transitions for cost/retention.`,
    fix: "Add lifecycle rules for infrequent access or deletion.",
    standards: ["NIST"],
  }),
  configRule({
    id: "gcp_cloudsql_no_labels",
    level: "info",
    title: "Cloud SQL: no resource labels",
    types: "gcp_cloudsql",
    check: (n) => !cfg(n, "user_labels"),
    message: (n) => `${label(n)} lacks labels for cost and ownership tracking.`,
    fix: "Add user_labels for environment, team, and cost center.",
    standards: ["NIST", "SOC2"],
  }),
  configRule({
    id: "gcp_gke_node_auto_upgrade_off",
    level: "warning",
    title: "GKE: node auto-upgrade disabled",
    types: "gcp_gke",
    check: (n) => cfg(n, "node_auto_upgrade") === false,
    message: (n) => `${label(n)} nodes may miss security patches.`,
    fix: "Enable node auto-upgrade on node pools.",
    standards: ["CIS", "NIST"],
  }),
];

// ─── Topology rules ───────────────────────────────────────────────────────────

export const GCP_TOPOLOGY_RULES = [
  topologyRule({
    id: "gcp_no_secret_manager",
    level: "warning",
    title: "No Secret Manager for data services",
    applies: (n) => DB_TYPES.has(n.type),
    check: (n, edges, nodes) => !nodes.some((x) => x.type === "gcp_secret_manager"),
    message: (n) => `${label(n)} exists without Secret Manager for credentials.`,
    fix: "Add Secret Manager for database credentials.",
    suggestion: "Store DB passwords in `google_secret_manager_secret` versions.",
    standards: ["CIS", "NIST", "SOC2"],
  }),
  topologyRule({
    id: "gcp_no_kms",
    level: "info",
    title: "No Cloud KMS for encryption keys",
    applies: (n) => DB_TYPES.has(n.type),
    check: (n, edges, nodes) => !nodes.some((x) => x.type === "gcp_kms"),
    message: (n) => `${label(n)} architecture has no customer-managed keys.`,
    fix: "Add Cloud KMS for CMEK.",
    standards: ["HIPAA", "PCI", "NIST"],
  }),
  topologyRule({
    id: "gcp_no_logging",
    level: "warning",
    title: "No Cloud Logging configured",
    applies: (n) => COMPUTE_TYPES.has(n.type),
    check: (n, edges, nodes) => !nodes.some((x) => x.type === "gcp_logging"),
    message: (n) => `${label(n)} has no centralized logging component.`,
    fix: "Add Cloud Logging for audit and troubleshooting.",
    standards: ["CIS", "SOC2", "NIST"],
  }),
  topologyRule({
    id: "gcp_no_monitoring",
    level: "info",
    title: "No Cloud Monitoring configured",
    applies: (n) => COMPUTE_TYPES.has(n.type),
    check: (n, edges, nodes) => !nodes.some((x) => x.type === "gcp_monitoring"),
    message: (n) => `${label(n)} has no monitoring/alerting component.`,
    fix: "Add Cloud Monitoring dashboards and alerts.",
    standards: ["NIST", "SOC2"],
  }),
  topologyRule({
    id: "gcp_topology_lb_no_armor",
    level: "warning",
    title: "Public load balancer without Cloud Armor",
    applies: (n) => n.type === "gcp_lb",
    check: (n, edges, nodes) =>
      cfg(n, "load_balancing_scheme") === "EXTERNAL" && !nodes.some((x) => x.type === "gcp_armor"),
    message: (n) => `${label(n)} serves public traffic without WAF.`,
    fix: "Add Cloud Armor policy to the architecture.",
    standards: ["CIS", "PCI", "SOC2"],
  }),
  topologyRule({
    id: "gcp_compute_no_vpc",
    level: "warning",
    title: "Compute resource without VPC",
    applies: (n) => COMPUTE_TYPES.has(n.type),
    check: (n, edges, nodes) => !nodes.some((x) => x.type === "gcp_vpc"),
    message: (n) => `${label(n)} is not in a VPC-scoped architecture.`,
    fix: "Add a VPC network and subnetworks.",
    standards: ["CIS", "NIST"],
  }),
  topologyRule({
    id: "gcp_gce_no_firewall",
    level: "warning",
    title: "GCE instance without firewall rules",
    applies: (n) => n.type === "gcp_gce",
    check: (n, edges, nodes) => !hasNeighborType(n.id, "gcp_firewall", nodes, edges),
    message: (n) => `${label(n)} has no associated firewall rule component.`,
    fix: "Add firewall rules restricting instance traffic.",
    standards: ["CIS", "NIST", "PCI"],
  }),
  topologyRule({
    id: "gcp_topology_sql_public",
    level: "critical",
    title: "Cloud SQL publicly accessible",
    applies: (n) => n.type === "gcp_cloudsql",
    check: (n) => hasPublicIp(n),
    message: (n) => `${label(n)} is configured with public IP access.`,
    fix: "Disable public IP; use private services access.",
    standards: ["CIS", "PCI", "HIPAA", "NIST"],
  }),
  topologyRule({
    id: "gcp_gke_no_artifact_registry",
    level: "info",
    title: "GKE without Artifact Registry",
    applies: (n) => n.type === "gcp_gke",
    check: (n, edges, nodes) => !nodes.some((x) => x.type === "gcp_artifact_registry"),
    message: (n) => `${label(n)} has no container image registry.`,
    fix: "Add Artifact Registry for trusted images.",
    standards: ["CIS", "NIST"],
  }),
  topologyRule({
    id: "gcp_no_backup",
    level: "warning",
    title: "No backup service for stateful resources",
    applies: (n) => STATEFUL_TYPES.has(n.type),
    check: (n, edges, nodes) => !nodes.some((x) => x.type === "gcp_backup"),
    message: (n) => `${label(n)} exists without Backup and DR.`,
    fix: "Add Backup and DR or native backup configs.",
    standards: ["NIST", "SOC2"],
  }),
  topologyRule({
    id: "gcp_private_compute_no_nat",
    level: "warning",
    title: "Private compute without Cloud NAT",
    applies: (n) => n.type === "gcp_vpc",
    check: (n, edges, nodes) => {
      const types = nodeTypes(nodes);
      if (types.has("gcp_nat")) return false;
      if (!nodes.some((x) => COMPUTE_TYPES.has(x.type))) return false;
      const privateCompute = nodes.some((x) => COMPUTE_TYPES.has(x.type) && !hasPublicIp(x));
      return privateCompute;
    },
    message: (n) => `${label(n)} has private compute but no NAT for outbound internet.`,
    fix: "Add Cloud NAT for private instance egress.",
    standards: ["NIST"],
  }),
  topologyRule({
    id: "gcp_no_scc",
    level: "info",
    title: "No Security Command Center",
    applies: (n) => PUBLIC_EDGE_TYPES.has(n.type),
    check: (n, edges, nodes) => !nodes.some((x) => x.type === "gcp_scc"),
    message: () => "Public-facing architecture lacks SCC for threat detection.",
    fix: "Enable Security Command Center.",
    standards: ["NIST", "SOC2"],
  }),
  topologyRule({
    id: "gcp_orphaned_nodes",
    level: "info",
    title: "Resources not connected on canvas",
    applies: () => true,
    check: (n, edges, nodes) => nodes.length > 1 && edges.length === 0,
    message: (n) => `${label(n)} is not connected to other resources.`,
    fix: "Draw edges to document relationships.",
    standards: ["NIST"],
  }),
  topologyRule({
    id: "gcp_cloud_run_sql_no_psc",
    level: "warning",
    title: "Cloud Run to database without Private Service Connect",
    applies: (n) => n.type === "gcp_cloud_run",
    check: (n, edges, nodes) => {
      const types = nodeTypes(nodes);
      const dbNeighbors = [...reachableTypes(n.id, edges, nodes)].filter((t) => DB_TYPES.has(t));
      return dbNeighbors.length > 0 && !types.has("gcp_private_sc") && !types.has("gcp_vpc");
    },
    message: (n) => `${label(n)} connects to databases without PSC/VPC egress path.`,
    fix: "Add VPC connector or Private Service Connect.",
    standards: ["NIST", "PCI"],
  }),
  topologyRule({
    id: "gcp_functions_pubsub_no_dlq",
    level: "info",
    title: "Event-driven functions without dead-letter handling",
    applies: (n) => n.type === "gcp_cloud_functions",
    check: (n, edges, nodes) => {
      const types = nodeTypes(nodes);
      return reachableTypes(n.id, edges, nodes).has("gcp_pubsub") && !types.has("gcp_tasks");
    },
    message: (n) => `${label(n)} uses Pub/Sub without dead-letter queue pattern.`,
    fix: "Configure dead-letter topics or Cloud Tasks retry policies.",
    standards: ["NIST", "SOC2"],
  }),
  topologyRule({
    id: "gcp_public_lb_no_cdn",
    level: "info",
    title: "Public load balancer without Cloud CDN",
    applies: (n) => n.type === "gcp_lb",
    check: (n, edges, nodes) =>
      !nodes.some((x) => x.type === "gcp_cdn") && cfg(n, "load_balancing_scheme") === "EXTERNAL",
    message: (n) => `${label(n)} serves static content without CDN caching.`,
    fix: "Add Cloud CDN for cacheable assets.",
    standards: ["NIST"],
  }),
  topologyRule({
    id: "gcp_public_gcs_no_armor",
    level: "warning",
    title: "Public bucket path without Cloud Armor",
    applies: (n) => n.type === "gcp_gcs",
    check: (n, edges, nodes) =>
      hasNeighborType(n.id, PUBLIC_EDGE_TYPES, nodes, edges) && !nodes.some((x) => x.type === "gcp_armor"),
    message: (n) => `${label(n)} is on a public path without edge protection.`,
    fix: "Place Cloud Armor in front of public bucket access paths.",
    standards: ["PCI", "NIST"],
  }),
  topologyRule({
    id: "gcp_iam_present_review",
    level: "info",
    title: "Review IAM bindings",
    applies: (n) => n.type === "gcp_iam",
    check: (n, edges, nodes) => nodes.length > 3,
    message: (n) => `${label(n)} — verify least-privilege IAM bindings.`,
    fix: "Audit IAM roles and remove primitive roles.",
    standards: ["CIS", "NIST"],
  }),
  topologyRule({
    id: "gcp_apigee_no_armor",
    level: "warning",
    title: "Apigee without Cloud Armor",
    applies: (n) => n.type === "gcp_apigee",
    check: (n, edges, nodes) => !nodes.some((x) => x.type === "gcp_armor"),
    message: (n) => `${label(n)} exposes APIs without edge WAF.`,
    fix: "Attach Cloud Armor to Apigee ingress.",
    standards: ["PCI", "NIST"],
  }),
  topologyRule({
    id: "gcp_spanner_no_backup",
    level: "info",
    title: "Spanner without backup policy",
    applies: (n) => n.type === "gcp_spanner",
    check: (n, edges, nodes) => !nodes.some((x) => x.type === "gcp_backup"),
    message: (n) => `${label(n)} has no backup/export policy documented.`,
    fix: "Configure backup schedules or export pipelines.",
    standards: ["NIST", "SOC2"],
  }),
  topologyRule({
    id: "gcp_alloydb_no_backup_topology",
    level: "warning",
    title: "AlloyDB without backup service",
    applies: (n) => n.type === "gcp_alloydb",
    check: (n, edges, nodes) =>
      cfg(n, "cluster_type") === "PRIMARY" && !nodes.some((x) => x.type === "gcp_backup"),
    message: (n) => `${label(n)} primary cluster has no backup component.`,
    fix: "Configure AlloyDB backup or Backup and DR.",
    standards: ["NIST", "SOC2"],
  }),
  topologyRule({
    id: "gcp_bigquery_no_kms_topology",
    level: "info",
    title: "BigQuery without KMS in architecture",
    applies: (n) => n.type === "gcp_bigquery",
    check: (n, edges, nodes) => !nodes.some((x) => x.type === "gcp_kms"),
    message: (n) => `${label(n)} sensitive analytics without CMEK path.`,
    fix: "Add Cloud KMS and default encryption config.",
    standards: ["HIPAA", "PCI"],
  }),
  topologyRule({
    id: "gcp_dataproc_no_kms",
    level: "info",
    title: "Dataproc without Cloud KMS",
    applies: (n) => n.type === "gcp_dataproc",
    check: (n, edges, nodes) => !nodes.some((x) => x.type === "gcp_kms"),
    message: (n) => `${label(n)} cluster lacks CMEK configuration in architecture.`,
    fix: "Use CMEK for Dataproc cluster disks.",
    standards: ["HIPAA", "NIST"],
  }),
  topologyRule({
    id: "gcp_composer_no_secrets",
    level: "warning",
    title: "Composer without Secret Manager",
    applies: (n) => n.type === "gcp_cloud_composer",
    check: (n, edges, nodes) => !nodes.some((x) => x.type === "gcp_secret_manager"),
    message: (n) => `${label(n)} Airflow may store connections insecurely.`,
    fix: "Use Secret Manager backend for Airflow connections.",
    standards: ["NIST", "SOC2"],
  }),
  topologyRule({
    id: "gcp_public_gke_behind_lb",
    level: "warning",
    title: "GKE: non-private cluster on public path",
    applies: (n) => n.type === "gcp_gke",
    check: (n, edges, nodes) =>
      !isTruthy(cfg(n, "private_cluster")) && hasNeighborType(n.id, "gcp_lb", nodes, edges),
    message: (n) => `${label(n)} is reachable via public load balancer without private cluster.`,
    fix: "Enable private GKE nodes and authorized networks.",
    standards: ["CIS", "NIST"],
  }),
  topologyRule({
    id: "gcp_hybrid_no_vpn_fallback",
    level: "info",
    title: "Hybrid connectivity without VPN fallback",
    applies: (n) => n.type === "gcp_interconnect",
    check: (n, edges, nodes) => {
      const types = nodeTypes(nodes);
      if (types.has("gcp_vpn")) return false;
      if (!types.has("gcp_interconnect")) return false;
      return nodes.filter((x) => x.type === "gcp_interconnect").length === 1;
    },
    message: (n) => `${label(n)} has no VPN backup path documented.`,
    fix: "Add HA VPN as failover to Interconnect.",
    standards: ["NIST", "SOC2"],
  }),
  topologyRule({
    id: "gcp_public_dns_zone",
    level: "info",
    title: "Public DNS zone in architecture",
    applies: (n) => n.type === "gcp_dns",
    check: (n) => cfg(n, "visibility") === "public",
    message: (n) => `${label(n)} is a public DNS zone — verify record exposure.`,
    fix: "Use DNSSEC and restrict zone admin access.",
    standards: ["NIST"],
  }),
  topologyRule({
    id: "gcp_mig_no_lb",
    level: "info",
    title: "MIG not behind load balancer",
    applies: (n) => n.type === "gcp_mig",
    check: (n, edges, nodes) => !hasNeighborType(n.id, "gcp_lb", nodes, edges),
    message: (n) => `${label(n)} is not connected to a load balancer.`,
    fix: "Place MIG behind Cloud Load Balancing for HA.",
    standards: ["NIST", "SOC2"],
  }),
  topologyRule({
    id: "gcp_pubsub_no_monitoring",
    level: "info",
    title: "Pub/Sub without monitoring",
    applies: (n) => n.type === "gcp_pubsub",
    check: (n, edges, nodes) => !nodes.some((x) => x.type === "gcp_monitoring"),
    message: (n) => `${label(n)} lacks monitoring for backlog/latency alerts.`,
    fix: "Add subscription monitoring alerts.",
    standards: ["NIST", "SOC2"],
  }),
  topologyRule({
    id: "gcp_workflows_no_logging",
    level: "info",
    title: "Workflows without logging",
    applies: (n) => n.type === "gcp_workflows",
    check: (n, edges, nodes) => !nodes.some((x) => x.type === "gcp_logging"),
    message: (n) => `${label(n)} executions may lack centralized audit logs.`,
    fix: "Enable workflow execution logging.",
    standards: ["SOC2", "NIST"],
  }),
  topologyRule({
    id: "gcp_build_no_registry",
    level: "info",
    title: "Cloud Build without Artifact Registry",
    applies: (n) => n.type === "gcp_cloud_build",
    check: (n, edges, nodes) => !nodes.some((x) => x.type === "gcp_artifact_registry"),
    message: (n) => `${label(n)} has no destination registry in architecture.`,
    fix: "Push images to Artifact Registry.",
    standards: ["CIS", "NIST"],
  }),
  topologyRule({
    id: "gcp_vertex_no_kms",
    level: "info",
    title: "Vertex AI without Cloud KMS",
    applies: (n) => n.type === "gcp_vertex_ai",
    check: (n, edges, nodes) => !nodes.some((x) => x.type === "gcp_kms"),
    message: (n) => `${label(n)} ML workloads lack CMEK in architecture.`,
    fix: "Use CMEK for Vertex AI stored artifacts.",
    standards: ["HIPAA", "NIST"],
  }),
  topologyRule({
    id: "gcp_gce_lb_and_public_ip",
    level: "warning",
    title: "GCE behind LB still has public IP",
    applies: (n) => n.type === "gcp_gce",
    check: (n, edges, nodes) =>
      hasNeighborType(n.id, "gcp_lb", nodes, edges) && hasPublicIp(n),
    message: (n) => `${label(n)} uses a load balancer but retains a public IP.`,
    fix: "Remove external IP when using load balancer ingress only.",
    standards: ["CIS", "NIST"],
  }),
  topologyRule({
    id: "gcp_sql_on_public_path",
    level: "critical",
    title: "Database on public edge path",
    applies: (n) => n.type === "gcp_cloudsql",
    check: (n, edges, nodes) => hasNeighborType(n.id, PUBLIC_EDGE_TYPES, nodes, edges),
    message: (n) => `${label(n)} is connected to a public-facing edge component.`,
    fix: "Remove public paths to databases; use private connectivity.",
    standards: ["CIS", "PCI", "HIPAA", "NIST"],
  }),
  topologyRule({
    id: "gcp_gke_no_scc",
    level: "info",
    title: "GKE without Security Command Center",
    applies: (n) => n.type === "gcp_gke",
    check: (n, edges, nodes) => !nodes.some((x) => x.type === "gcp_scc"),
    message: (n) => `${label(n)} lacks container threat detection in architecture.`,
    fix: "Enable SCC container threat detection.",
    standards: ["CIS", "NIST"],
  }),
  topologyRule({
    id: "gcp_functions_no_secrets",
    level: "info",
    title: "Cloud Functions without Secret Manager",
    applies: (n) => n.type === "gcp_cloud_functions",
    check: (n, edges, nodes) => !nodes.some((x) => x.type === "gcp_secret_manager"),
    message: (n) => `${label(n)} may embed secrets in environment variables.`,
    fix: "Store secrets in Secret Manager.",
    standards: ["CIS", "NIST"],
  }),
  topologyRule({
    id: "gcp_public_edge_no_dns",
    level: "info",
    title: "Public edge without Cloud DNS",
    applies: (n) => n.type === "gcp_vpc",
    check: (n, edges, nodes) =>
      !nodes.some((x) => x.type === "gcp_dns") &&
      nodes.some((x) => PUBLIC_EDGE_TYPES.has(x.type)),
    message: (n) => `${label(n)} public architecture lacks DNS management component.`,
    fix: "Add Cloud DNS for managed record lifecycle.",
    standards: ["NIST"],
  }),
  topologyRule({
    id: "gcp_serverless_no_vpc_connector",
    level: "info",
    title: "Serverless workload without VPC connector path",
    applies: (n) => n.type === "gcp_cloud_run" || n.type === "gcp_cloud_functions",
    check: (n, edges, nodes) => {
      const types = nodeTypes(nodes);
      return types.has("gcp_vpc") && !hasNeighborType(n.id, "gcp_private_sc", nodes, edges);
    },
    message: (n) => `${label(n)} may not reach private VPC resources.`,
    fix: "Add VPC connector or Private Service Connect.",
    standards: ["NIST"],
  }),
  topologyRule({
    id: "gcp_hybrid_no_cloud_router",
    level: "info",
    title: "Interconnect without Cloud Router",
    applies: (n) => n.type === "gcp_interconnect",
    check: (n, edges, nodes) => !nodes.some((x) => x.type === "gcp_nat"),
    message: (n) => `${label(n)} hybrid setup lacks Cloud Router for dynamic routing.`,
    fix: "Add Cloud Router for BGP sessions.",
    standards: ["NIST"],
  }),
];

// ─── Firewall rules ───────────────────────────────────────────────────────────

function ruleMatchesPort(rule, port) {
  if (["all", "-1", "icmp"].includes(rule.protocol)) return true;
  const text = String(rule.port ?? "");
  if (["-1", "*", "all"].includes(text)) return true;
  if (text.includes("-")) {
    const parts = text.split("-");
    const lo = parseInt(parts[0], 10);
    const hi = parseInt(parts[1], 10);
    if (!Number.isNaN(lo) && !Number.isNaN(hi)) return lo <= port && port <= hi;
    return false;
  }
  const single = parseInt(text, 10);
  return !Number.isNaN(single) && single === port;
}

function isPublicSource(source) {
  return ["0.0.0.0/0", "::/0", "all", "0.0.0.0"].includes(String(source ?? "").trim());
}

function sgAllowsAllPublic(sg) {
  for (const rule of sg.inbound ?? []) {
    if (isPublicSource(rule.source) && ["all", "-1", "tcp", "udp"].includes(rule.protocol)) {
      if (["-1", "*", "all", "0-65535"].includes(String(rule.port))) return true;
    }
  }
  return false;
}

function firewallPortRule(id, port, level, label, fix) {
  return {
    id,
    level,
    title: `Firewall: ${label} (${port}) open to internet`,
    check: (sg) =>
      (sg.inbound ?? []).some((r) => ruleMatchesPort(r, port) && isPublicSource(r.source)),
    message: (sg) => `Firewall "${sg.name}" allows ${label} port ${port} from the internet.`,
    fix,
    standards: ["CIS", "NIST", "PCI"],
  };
}

export const GCP_FIREWALL_RULES = [
  {
    id: "gcp_fw_all_traffic_open",
    level: "critical",
    title: "Firewall: all traffic allowed from internet",
    check: (sg) => sgAllowsAllPublic(sg),
    message: (sg) => `Firewall "${sg.name}" allows all inbound traffic from the internet.`,
    fix: "Replace catch-all allow rules with least-privilege port rules.",
    suggestion: "Use target tags/service accounts and specific source ranges.",
    standards: ["CIS", "NIST", "PCI", "SOC2"],
  },
  firewallPortRule("gcp_fw_ssh_open", 22, "critical", "SSH", "Restrict SSH to IAP or bastion CIDR ranges."),
  firewallPortRule("gcp_fw_rdp_open", 3389, "critical", "RDP", "Block RDP from the internet; use IAP TCP forwarding."),
  firewallPortRule(
    "gcp_fw_postgres_open",
    5432,
    "critical",
    "PostgreSQL",
    "Scope PostgreSQL to application subnet CIDR only.",
  ),
  firewallPortRule("gcp_fw_mysql_open", 3306, "critical", "MySQL", "Scope MySQL to application subnet CIDR only."),
  firewallPortRule("gcp_fw_redis_open", 6379, "critical", "Redis", "Never expose Redis to the internet."),
  firewallPortRule("gcp_fw_mongodb_open", 27017, "critical", "MongoDB", "Restrict MongoDB to private CIDR ranges."),
  firewallPortRule("gcp_fw_memcached_open", 11211, "critical", "Memcached", "Memcached must not be internet-facing."),
  firewallPortRule(
    "gcp_fw_elasticsearch_open",
    9200,
    "critical",
    "Elasticsearch",
    "Restrict search APIs to private networks.",
  ),
  firewallPortRule("gcp_fw_kafka_open", 9092, "critical", "Kafka", "Scope Kafka broker ports to client subnets."),
  firewallPortRule(
    "gcp_fw_sqlserver_open",
    1433,
    "critical",
    "SQL Server",
    "Do not expose SQL Server to the internet.",
  ),
  firewallPortRule("gcp_fw_http_open", 80, "warning", "HTTP", "Prefer HTTPS-only ingress from trusted sources."),
  firewallPortRule(
    "gcp_fw_https_open",
    443,
    "info",
    "HTTPS",
    "Verify Cloud Armor protects public HTTPS ingress.",
  ),
  {
    id: "gcp_fw_icmp_open",
    level: "warning",
    title: "Firewall: ICMP open to internet",
    check: (sg) =>
      (sg.inbound ?? []).some((r) => r.protocol === "icmp" && isPublicSource(r.source)),
    message: (sg) => `Firewall "${sg.name}" allows ICMP from the internet.`,
    fix: "Remove ICMP from public ingress unless required.",
    standards: ["CIS", "NIST"],
  },
];

// ─── IAM rules ────────────────────────────────────────────────────────────────

export const GCP_IAM_RULES = [
  {
    id: "gcp_iam_primitive_role",
    level: "critical",
    title: "IAM: primitive role binding",
    check: (role) =>
      (role.policies ?? []).some(
        (p) =>
          p.effect === "Allow" &&
          (p.actions ?? []).some((a) => ["*", "roles/owner", "roles/editor"].includes(String(a))),
      ),
    message: (role) =>
      `IAM binding "${role.name}" grants primitive Owner/Editor-equivalent access.`,
    fix: "Replace primitive roles with least-privilege custom roles.",
    suggestion: "Use predefined roles scoped to required permissions only.",
    standards: ["CIS", "NIST", "SOC2"],
  },
  {
    id: "gcp_iam_public_binding",
    level: "critical",
    title: "IAM: public principal binding",
    check: (role) =>
      (role.policies ?? []).some(
        (p) =>
          p.effect === "Allow" &&
          (p.resources ?? []).some(
            (r) => String(r).includes("allUsers") || String(r).includes("allAuthenticatedUsers"),
          ),
      ),
    message: (role) =>
      `IAM binding "${role.name}" grants access to allUsers or allAuthenticatedUsers.`,
    fix: "Remove public IAM bindings.",
    standards: ["CIS", "NIST", "PCI", "SOC2"],
  },
  {
    id: "gcp_iam_storage_wildcard",
    level: "warning",
    title: "IAM: broad Storage Object permissions",
    check: (role) =>
      (role.policies ?? []).some(
        (p) =>
          p.effect === "Allow" &&
          (p.actions ?? []).some((a) => String(a).includes("storage.objects") && String(a).endsWith("*")),
      ),
    message: (role) => `IAM binding "${role.name}" grants wildcard Storage Object access.`,
    fix: "Scope storage permissions to required buckets/objects.",
    standards: ["CIS", "NIST"],
  },
  {
    id: "gcp_iam_cloudsql_admin",
    level: "warning",
    title: "IAM: Cloud SQL admin role",
    check: (role) =>
      (role.policies ?? []).some(
        (p) =>
          p.effect === "Allow" &&
          (p.actions ?? []).some((a) => String(a).startsWith("cloudsql") && String(a).includes("admin")),
      ),
    message: (role) => `IAM binding "${role.name}" grants Cloud SQL admin privileges.`,
    fix: "Use cloudsql.client or instanceUser for applications.",
    standards: ["CIS", "NIST", "HIPAA"],
  },
  {
    id: "gcp_iam_sa_key_create",
    level: "warning",
    title: "IAM: service account key creation allowed",
    check: (role) =>
      (role.policies ?? []).some(
        (p) =>
          p.effect === "Allow" &&
          (p.actions ?? []).some((a) => String(a).includes("iam.serviceAccountKeys.create")),
      ),
    message: (role) => `IAM binding "${role.name}" can create long-lived service account keys.`,
    fix: "Prefer workload identity federation over SA keys.",
    standards: ["CIS", "NIST", "SOC2"],
  },
  {
    id: "gcp_iam_set_service_account",
    level: "info",
    title: "IAM: can change instance service accounts",
    check: (role) =>
      (role.policies ?? []).some(
        (p) =>
          p.effect === "Allow" &&
          (p.actions ?? []).some((a) => String(a).includes("compute.instances.setServiceAccount")),
      ),
    message: (role) => `IAM binding "${role.name}" can attach service accounts to VMs.`,
    fix: "Restrict setServiceAccount to admin roles only.",
    standards: ["NIST"],
  },
  {
    id: "gcp_iam_set_iam_policy",
    level: "warning",
    title: "IAM: project IAM admin",
    check: (role) =>
      (role.policies ?? []).some(
        (p) =>
          p.effect === "Allow" &&
          (p.actions ?? []).some((a) => String(a).includes("resourcemanager.projects.setIamPolicy")),
      ),
    message: (role) => `IAM binding "${role.name}" can modify project IAM policies.`,
    fix: "Limit setIamPolicy to break-glass admin accounts.",
    standards: ["CIS", "NIST", "SOC2"],
  },
  {
    id: "gcp_iam_serverless_set_policy",
    level: "warning",
    title: "IAM: can make serverless services public",
    check: (role) =>
      (role.policies ?? []).some(
        (p) =>
          p.effect === "Allow" &&
          (p.actions ?? []).some(
            (a) =>
              String(a).includes("run.services.setIamPolicy") ||
              String(a).includes("cloudfunctions.functions.setIamPolicy"),
          ),
      ),
    message: (role) => `IAM binding "${role.name}" can change Cloud Run/Functions IAM policies.`,
    fix: "Restrict invoker/admin changes to trusted principals.",
    standards: ["CIS", "NIST"],
  },
  {
    id: "gcp_iam_bigquery_owner",
    level: "info",
    title: "IAM: BigQuery data owner privileges",
    check: (role) =>
      (role.policies ?? []).some(
        (p) =>
          p.effect === "Allow" &&
          (p.actions ?? []).some((a) => String(a).includes("bigquery.dataOwner") || a === "roles/bigquery.dataOwner"),
      ),
    message: (role) => `IAM binding "${role.name}" has BigQuery data owner access.`,
    fix: "Use dataViewer/dataEditor roles instead of dataOwner where possible.",
    standards: ["NIST", "HIPAA"],
  },
  {
    id: "gcp_iam_secrets_wildcard",
    level: "warning",
    title: "IAM: Secret Manager wildcard access",
    check: (role) =>
      (role.policies ?? []).some(
        (p) =>
          p.effect === "Allow" &&
          (p.actions ?? []).some((a) => String(a).includes("secretmanager.versions.access")) &&
          (p.resources ?? []).some((r) => String(r) === "*"),
      ),
    message: (role) => `IAM binding "${role.name}" can access all secrets.`,
    fix: "Scope secretmanager.versions.access to specific secrets.",
    standards: ["CIS", "NIST", "HIPAA"],
  },
];

export const GCP_RULE_IDS = [
  ...GCP_CONFIG_RULES.map((r) => r.id),
  ...GCP_TOPOLOGY_RULES.map((r) => r.id),
  ...GCP_FIREWALL_RULES.map((r) => r.id),
  ...GCP_IAM_RULES.map((r) => r.id),
];
