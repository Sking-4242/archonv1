/**
 * On-premises validation rules for the Archon Pro canvas engine.
 * Parity with archon-cli/archon_cli/onprem_validate.py + onprem_helpers.py.
 */

// ─── Helpers ──────────────────────────────────────────────────────────────────

function nodeConfig(node) {
  return node.data?.config ?? {};
}

function cfg(node, key, fallback = undefined) {
  const value = nodeConfig(node)[key];
  return value === undefined || value === null ? fallback : value;
}

function isTruthy(value) {
  if (typeof value === "boolean") return value;
  if (value === undefined || value === null) return false;
  if (typeof value === "string") {
    return ["1", "true", "yes", "on", "enabled"].includes(value.trim().toLowerCase());
  }
  return Boolean(value);
}

function intCfg(node, key, fallback = 0) {
  const raw = cfg(node, key, fallback);
  return parseInt(raw ?? fallback ?? 0, 10) || 0;
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

const CLOUD_PREFIXES = ["aws_", "azure_", "gcp_"];

function isOnpremType(nodeType) {
  return nodeType.startsWith("onprem_");
}

function isCloudType(nodeType) {
  return CLOUD_PREFIXES.some((p) => nodeType.startsWith(p));
}

function hasHybridEdge(nodes, edges) {
  const nodeMap = Object.fromEntries(nodes.map((n) => [n.id, n]));
  for (const edge of edges) {
    const src = nodeMap[edge.source];
    const tgt = nodeMap[edge.target];
    if (!src || !tgt) continue;
    if (isOnpremType(src.type) && isCloudType(tgt.type)) return true;
    if (isOnpremType(tgt.type) && isCloudType(src.type)) return true;
  }
  return false;
}

const DB_TYPES = new Set([
  "onprem_postgres",
  "onprem_mysql",
  "onprem_mssql",
  "onprem_redis",
  "onprem_elasticsearch",
  "onprem_mongodb",
  "onprem_cassandra",
]);

const COMPUTE_TYPES = new Set([
  "onprem_bare_metal",
  "onprem_vm",
  "onprem_k8s",
  "onprem_container",
  "onprem_hyperconverged",
  "onprem_gpu_server",
]);

const STATEFUL_TYPES = new Set([
  "onprem_bare_metal",
  "onprem_vm",
  "onprem_postgres",
  "onprem_mysql",
  "onprem_mssql",
  "onprem_san",
  "onprem_nas",
]);

const PUBLIC_EDGE_TYPES = new Set(["onprem_load_balancer", "onprem_proxy", "onprem_api_gateway"]);

const WAF_TYPES = new Set(["onprem_waf", "onprem_firewall"]);

const SECURITY_STACK_TYPES = new Set([
  "onprem_firewall",
  "onprem_waf",
  "onprem_ids_ips",
  "onprem_pam",
  "onprem_vault",
]);

// ─── Config rules (~12) ────────────────────────────────────────────────────────

export const ONPREM_CONFIG_RULES = [
  configRule({
    id: "onprem_firewall_ha_disabled",
    level: "warning",
    title: "Firewall: HA mode disabled",
    types: "onprem_firewall",
    check: (n) => !isTruthy(cfg(n, "ha_mode")),
    message: (n) => `${label(n)} runs as a single firewall without high availability.`,
    fix: "Enable active/passive or active/active HA for perimeter firewalls.",
    standards: ["NIST", "SOC2"],
  }),
  configRule({
    id: "onprem_lb_ha_disabled",
    level: "warning",
    title: "Load balancer: HA mode disabled",
    types: "onprem_load_balancer",
    check: (n) => !isTruthy(cfg(n, "ha_mode", true)),
    message: (n) => `${label(n)} has no load balancer redundancy configured.`,
    fix: "Enable HA mode (Keepalived/VRRP or clustered LB pair).",
    standards: ["NIST", "SOC2"],
  }),
  configRule({
    id: "onprem_vpn_ha_disabled",
    level: "warning",
    title: "VPN gateway: HA mode disabled",
    types: "onprem_vpn",
    check: (n) => !isTruthy(cfg(n, "ha_mode")),
    message: (n) => `${label(n)} is a single VPN endpoint without failover.`,
    fix: "Deploy redundant VPN concentrators for hybrid connectivity.",
    standards: ["NIST", "SOC2"],
  }),
  configRule({
    id: "onprem_dns_ha_disabled",
    level: "warning",
    title: "DNS: HA mode disabled",
    types: "onprem_dns",
    check: (n) => !isTruthy(cfg(n, "ha_mode", true)),
    message: (n) => `${label(n)} runs DNS without a secondary resolver.`,
    fix: "Enable HA DNS (secondary BIND/Unbound or Windows DNS replica).",
    standards: ["NIST"],
  }),
  configRule({
    id: "onprem_k8s_single_control_plane",
    level: "critical",
    title: "Kubernetes: single control plane node",
    types: "onprem_k8s",
    check: (n) => intCfg(n, "control_plane_nodes", 3) < 2,
    message: (n) => `${label(n)} has fewer than two control plane nodes.`,
    fix: "Run at least three control plane nodes for etcd quorum.",
    suggestion: "Set control_plane_nodes >= 3 for production clusters.",
    standards: ["CIS", "NIST", "SOC2"],
  }),
  configRule({
    id: "onprem_postgres_standalone_ha",
    level: "warning",
    title: "PostgreSQL: standalone HA mode",
    types: "onprem_postgres",
    check: (n) => cfg(n, "ha_mode", "streaming_replication") === "standalone",
    message: (n) => `${label(n)} runs PostgreSQL without replication or Patroni.`,
    fix: "Use streaming_replication or patroni for database HA.",
    standards: ["NIST", "SOC2"],
  }),
  configRule({
    id: "onprem_mysql_standalone_ha",
    level: "warning",
    title: "MySQL: standalone HA mode",
    types: "onprem_mysql",
    check: (n) => cfg(n, "ha_mode", "replication") === "standalone",
    message: (n) => `${label(n)} runs MySQL without replication or Galera.`,
    fix: "Enable replication or galera_cluster for HA.",
    standards: ["NIST", "SOC2"],
  }),
  configRule({
    id: "onprem_mssql_standalone_ha",
    level: "warning",
    title: "SQL Server: standalone HA mode",
    types: "onprem_mssql",
    check: (n) => cfg(n, "ha_mode", "standalone") === "standalone",
    message: (n) => `${label(n)} uses standalone SQL Server without AlwaysOn or FCI.`,
    fix: "Configure AlwaysOn AG or a failover cluster instance.",
    standards: ["NIST", "SOC2"],
  }),
  configRule({
    id: "onprem_backup_short_retention",
    level: "warning",
    title: "Backup: retention under 7 days",
    types: "onprem_backup_server",
    check: (n) => intCfg(n, "retention_days", 30) < 7,
    message: (n) => `${label(n)} retains backups for fewer than seven days.`,
    fix: "Increase retention_days to meet recovery objectives.",
    standards: ["NIST", "SOC2"],
  }),
  configRule({
    id: "onprem_object_store_low_replication",
    level: "warning",
    title: "Object store: replication factor below 3",
    types: "onprem_object_store",
    check: (n) => intCfg(n, "replication", 3) < 3,
    message: (n) => `${label(n)} uses a replication factor below three.`,
    fix: "Set replication >= 3 for erasure coding and node failure tolerance.",
    standards: ["NIST"],
  }),
  configRule({
    id: "onprem_proxy_tls_off",
    level: "warning",
    title: "Proxy: TLS termination disabled",
    types: "onprem_proxy",
    check: (n) => !isTruthy(cfg(n, "tls_termination", true)),
    message: (n) => `${label(n)} does not terminate TLS at the proxy.`,
    fix: "Enable tls_termination for reverse proxy ingress.",
    standards: ["CIS", "PCI", "NIST"],
  }),
  configRule({
    id: "onprem_redis_standalone",
    level: "warning",
    title: "Redis: standalone mode",
    types: "onprem_redis",
    check: (n) => cfg(n, "mode", "sentinel") === "standalone",
    message: (n) => `${label(n)} runs Redis without sentinel or cluster HA.`,
    fix: "Use sentinel or cluster mode for Redis resilience.",
    standards: ["NIST", "SOC2"],
  }),
];

// ─── Topology rules (~12) ─────────────────────────────────────────────────────

let hybridNoVpnReported = false;

function resetHybridVpnFlag() {
  hybridNoVpnReported = false;
}

export const ONPREM_TOPOLOGY_RULES = [
  topologyRule({
    id: "onprem_db_no_vault",
    level: "warning",
    title: "Database without secrets vault",
    applies: (n) => DB_TYPES.has(n.type),
    check: (n, edges, nodes) => !nodes.some((x) => x.type === "onprem_vault"),
    message: (n) => `${label(n)} exists without a Vault/HSM for credential management.`,
    fix: "Add onprem_vault (HashiCorp Vault, HSM, or CyberArk).",
    standards: ["CIS", "NIST", "SOC2"],
  }),
  topologyRule({
    id: "onprem_compute_no_firewall",
    level: "warning",
    title: "Compute without firewall path",
    applies: (n) => COMPUTE_TYPES.has(n.type),
    check: (n, edges, nodes) => {
      if (!nodes.some((x) => x.type === "onprem_firewall")) return true;
      if (hasNeighborType(n.id, "onprem_firewall", nodes, edges)) return false;
      return !reachableTypes(n.id, edges, nodes).has("onprem_firewall");
    },
    message: (n) => `${label(n)} has no firewall in the architecture or adjacency.`,
    fix: "Place compute behind onprem_firewall with least-privilege rules.",
    standards: ["CIS", "NIST", "PCI"],
  }),
  topologyRule({
    id: "onprem_stateful_no_backup",
    level: "warning",
    title: "Stateful resource without backup",
    applies: (n) => STATEFUL_TYPES.has(n.type),
    check: (n, edges, nodes) =>
      !nodes.some((x) => x.type === "onprem_backup_server" || x.type === "onprem_tape_library") &&
      !hasNeighborType(n.id, ["onprem_backup_server", "onprem_tape_library"], nodes, edges),
    message: (n) => `${label(n)} has no backup server or tape library in the architecture.`,
    fix: "Add onprem_backup_server with adequate retention.",
    standards: ["NIST", "SOC2"],
  }),
  topologyRule({
    id: "onprem_public_edge_no_waf",
    level: "warning",
    title: "Public edge without WAF",
    applies: (n) => PUBLIC_EDGE_TYPES.has(n.type),
    check: (n, edges, nodes) => !nodes.some((x) => WAF_TYPES.has(x.type)),
    message: (n) => `${label(n)} serves traffic without a WAF or inspecting firewall.`,
    fix: "Add onprem_waf or WAF-capable firewall in front of public ingress.",
    standards: ["PCI", "SOC2", "CIS"],
  }),
  topologyRule({
    id: "onprem_k8s_no_monitoring",
    level: "warning",
    title: "Kubernetes without monitoring",
    applies: (n) => n.type === "onprem_k8s",
    check: (n, edges, nodes) =>
      !nodes.some((x) => x.type === "onprem_monitoring") &&
      !hasNeighborType(n.id, "onprem_monitoring", nodes, edges),
    message: (n) => `${label(n)} has no monitoring stack in the architecture.`,
    fix: "Add onprem_monitoring (Prometheus/Grafana or equivalent).",
    standards: ["NIST", "SOC2"],
  }),
  topologyRule({
    id: "onprem_security_stack_no_siem",
    level: "info",
    title: "Security stack without SIEM",
    applies: (n) => SECURITY_STACK_TYPES.has(n.type),
    check: (n, edges, nodes) => !nodes.some((x) => x.type === "onprem_siem"),
    message: (n) => `${label(n)} is present but no SIEM collects security telemetry.`,
    fix: "Add onprem_siem for centralized detection and audit.",
    standards: ["NIST", "SOC2", "CIS"],
  }),
  topologyRule({
    id: "onprem_orphaned_nodes",
    level: "info",
    title: "Resource not connected on canvas",
    applies: () => true,
    check: (n, edges, nodes) =>
      nodes.length > 1 && neighborIds(n.id, edges).length === 0,
    message: (n) => `${label(n)} has no edges to other components.`,
    fix: "Connect nodes to document traffic flows and dependencies.",
    standards: ["NIST"],
  }),
  topologyRule({
    id: "onprem_single_switch_spof",
    level: "warning",
    title: "Single network switch (SPOF)",
    applies: (n, edges, nodes) =>
      n.type === "onprem_switch" && nodes.filter((x) => x.type === "onprem_switch").length === 1,
    check: () => true,
    message: (n) => `${label(n)} is the only switch — a single point of failure.`,
    fix: "Add redundant core/distribution switches with LACP or stacking.",
    standards: ["NIST", "SOC2"],
  }),
  topologyRule({
    id: "onprem_compute_no_network_zone",
    level: "info",
    title: "Compute without network zone",
    applies: (n) => COMPUTE_TYPES.has(n.type),
    check: (n, edges, nodes) =>
      !nodes.some((x) => x.type === "onprem_network_zone" || x.type === "onprem_vlan") &&
      !hasNeighborType(n.id, ["onprem_network_zone", "onprem_vlan"], nodes, edges),
    message: (n) => `${label(n)} is not scoped to a network zone or VLAN.`,
    fix: "Add onprem_network_zone or onprem_vlan for segmentation.",
    standards: ["NIST", "CIS"],
  }),
  topologyRule({
    id: "onprem_lb_not_behind_firewall",
    level: "warning",
    title: "Load balancer not behind firewall",
    applies: (n) => n.type === "onprem_load_balancer",
    check: (n, edges, nodes) => !hasNeighborType(n.id, "onprem_firewall", nodes, edges),
    message: (n) => `${label(n)} is not adjacent to a perimeter firewall.`,
    fix: "Connect the load balancer behind onprem_firewall for ingress control.",
    standards: ["CIS", "NIST", "PCI"],
  }),
  topologyRule({
    id: "onprem_db_no_backup_path",
    level: "info",
    title: "Database not connected to backup",
    applies: (n) => DB_TYPES.has(n.type),
    check: (n, edges, nodes) =>
      nodes.some((x) => x.type === "onprem_backup_server") &&
      !hasNeighborType(n.id, "onprem_backup_server", nodes, edges),
    message: (n) => `${label(n)} has no canvas path to a backup server.`,
    fix: "Draw an edge to onprem_backup_server documenting backup flow.",
    standards: ["NIST", "SOC2"],
  }),
  topologyRule({
    id: "hybrid_no_vpn",
    level: "warning",
    title: "Hybrid connectivity without VPN gateway",
    applies: () => true,
    check: (n, edges, nodes) => {
      if (hybridNoVpnReported) return false;
      const types = nodeTypes(nodes);
      if (!hasHybridEdge(nodes, edges) || types.has("onprem_vpn")) return false;
      hybridNoVpnReported = true;
      return true;
    },
    message: () =>
      "On-premises resources connect to cloud resources without an onprem_vpn node.",
    fix: "Add onprem_vpn (WireGuard, IPsec, or site-to-site) for hybrid links.",
    standards: ["NIST", "SOC2", "CIS"],
  }),
];

export { resetHybridVpnFlag };

// ─── Firewall rules (~6) ───────────────────────────────────────────────────────

function isPublicSource(source) {
  return ["0.0.0.0/0", "::/0", "all", "0.0.0.0", "*"].includes(source);
}

function ruleMatchesPort(rule, port) {
  if (["all", "-1", "icmp"].includes(rule.protocol)) return true;
  const text = String(rule.port);
  if (["-1", "*", "all"].includes(text)) return true;
  if (text.includes("-")) {
    const [start, end] = text.split("-", 2);
    const s = parseInt(start, 10);
    const e = parseInt(end, 10);
    if (!Number.isNaN(s) && !Number.isNaN(e)) return s <= port && port <= e;
    return false;
  }
  return parseInt(text, 10) === port;
}

function sgAllowsAllPublic(sg) {
  return (sg.inbound ?? []).some(
    (r) =>
      isPublicSource(r.source) &&
      ["all", "-1", "tcp", "udp"].includes(r.protocol) &&
      ["-1", "*", "all", "0-65535"].includes(String(r.port)),
  );
}

function firewallPortRule(ruleId, port, level, label, fix) {
  return {
    id: ruleId,
    level,
    title: `Firewall: ${label} (${port}) open to internet`,
    check: (sg) =>
      (sg.inbound ?? []).some((r) => ruleMatchesPort(r, port) && isPublicSource(r.source)),
    message: (sg) => `Firewall "${sg.name}" allows ${label} port ${port} from the internet.`,
    fix,
    standards: ["CIS", "NIST", "PCI"],
  };
}

export const ONPREM_FIREWALL_RULES = [
  {
    id: "onprem_fw_all_traffic_open",
    level: "critical",
    title: "Firewall: all traffic allowed from internet",
    check: (sg) => sgAllowsAllPublic(sg),
    message: (sg) => `Firewall "${sg.name}" allows all inbound traffic from the internet.`,
    fix: "Replace catch-all allow rules with least-privilege port rules.",
    standards: ["CIS", "NIST", "PCI", "SOC2"],
  },
  firewallPortRule(
    "onprem_fw_ssh_open",
    22,
    "critical",
    "SSH",
    "Restrict SSH to bastion or management VLAN CIDR only.",
  ),
  firewallPortRule(
    "onprem_fw_rdp_open",
    3389,
    "critical",
    "RDP",
    "Block RDP from the internet; use VPN or bastion.",
  ),
  firewallPortRule(
    "onprem_fw_postgres_open",
    5432,
    "critical",
    "PostgreSQL",
    "Scope PostgreSQL to application subnet CIDR only.",
  ),
  firewallPortRule(
    "onprem_fw_mysql_open",
    3306,
    "critical",
    "MySQL",
    "Scope MySQL to application subnet CIDR only.",
  ),
  {
    id: "onprem_fw_icmp_open",
    level: "warning",
    title: "Firewall: ICMP open to internet",
    check: (sg) =>
      (sg.inbound ?? []).some((r) => r.protocol === "icmp" && isPublicSource(r.source)),
    message: (sg) => `Firewall "${sg.name}" allows ICMP from the internet.`,
    fix: "Remove ICMP from public ingress unless required.",
    standards: ["CIS", "NIST"],
  },
];

export const ONPREM_RULE_IDS = [
  ...ONPREM_CONFIG_RULES.map((r) => r.id),
  ...ONPREM_TOPOLOGY_RULES.map((r) => r.id),
  ...ONPREM_FIREWALL_RULES.map((r) => r.id),
];
