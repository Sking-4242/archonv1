import { create } from "zustand";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function directEdge(aId, bId, edges) {
  return edges.some(
    (e) =>
      (e.source === aId && e.target === bId) ||
      (e.source === bId && e.target === aId),
  );
}

function neighborIds(nodeId, edges) {
  return edges
    .filter((e) => e.source === nodeId || e.target === nodeId)
    .map((e) => (e.source === nodeId ? e.target : e.source));
}

function hasNeighborOfType(nodeId, types, edges, nodes) {
  const typeSet = Array.isArray(types) ? types : [types];
  const ids = neighborIds(nodeId, edges);
  return nodes.some((n) => ids.includes(n.id) && typeSet.includes(n.type));
}

function reachableTypes(nodeId, edges, nodes, maxHops = 3) {
  const visited = new Set([nodeId]);
  const queue = [nodeId];
  const types = new Set();
  let hops = 0;
  while (queue.length && hops < maxHops) {
    const nextQueue = [];
    for (const id of queue) {
      for (const nid of neighborIds(id, edges)) {
        if (!visited.has(nid)) {
          visited.add(nid);
          const n = nodes.find((x) => x.id === nid);
          if (n) types.add(n.type);
          nextQueue.push(nid);
        }
      }
    }
    queue.length = 0;
    queue.push(...nextQueue);
    hops++;
  }
  return types;
}

// Parse a port field which may be a number, "80", "80-443", etc.
// Returns { from, to } integers, or null if unparseable.
function parsePort(port) {
  if (port === null || port === undefined || port === "") return null;
  const s = String(port).trim();
  if (s === "-1" || s === "*") return { from: 0, to: 65535 };
  const rangeParts = s.split("-");
  if (rangeParts.length === 2) {
    const f = parseInt(rangeParts[0], 10);
    const t = parseInt(rangeParts[1], 10);
    if (!isNaN(f) && !isNaN(t)) return { from: f, to: t };
  }
  const single = parseInt(s, 10);
  if (!isNaN(single)) return { from: single, to: single };
  return null;
}

function isPublicCidr(source) {
  if (!source) return false;
  const s = String(source).trim();
  return s === "0.0.0.0/0" || s === "::/0";
}

function ruleMatchesPort(rule, targetPort) {
  if (rule.protocol === "-1") return true;
  const r = parsePort(rule.port);
  if (!r) return false;
  return r.from <= targetPort && r.to >= targetPort;
}

function sgAllowsPortFromPublic(sg, port) {
  if (!sg?.inbound) return false;
  return sg.inbound.some(
    (rule) =>
      isPublicCidr(rule.source) && ruleMatchesPort(rule, port),
  );
}

function sgAllowsAllTrafficFromPublic(sg) {
  if (!sg?.inbound) return false;
  return sg.inbound.some(
    (rule) => rule.protocol === "-1" && isPublicCidr(rule.source),
  );
}

function isWideRange(rule) {
  if (rule.protocol === "-1") return false; // handled separately
  const r = parsePort(rule.port);
  if (!r) return false;
  return (r.to - r.from) >= 1000 && isPublicCidr(rule.source);
}

// ─── Node type sets ───────────────────────────────────────────────────────────

const INFRASTRUCTURE_TYPES = new Set([
  "vpc", "subnet", "note", "route_table", "elastic_ip",
]);
const IGW_TYPES = new Set(["internet_gateway"]);

// ─── Config-based rules ───────────────────────────────────────────────────────

const CONFIG_RULES = [
  {
    id: "rds_unencrypted",
    level: "warning",
    title: "RDS storage not encrypted",
    applies: (n) => n.type === "rds",
    check: (n) => !n.data?.config?.storage_encrypted,
    message: (n) => `${n.data.label} does not have storage encryption enabled.`,
    fix: "Enable Storage Encrypted in the component config panel.",
  },
  {
    id: "rds_no_backup",
    level: "warning",
    title: "RDS backup retention disabled",
    applies: (n) => n.type === "rds",
    check: (n) => {
      const v = n.data?.config?.backup_retention_period;
      return v === undefined || v === null || Number(v) < 1;
    },
    message: (n) =>
      `${n.data.label} has backup retention set to 0. Set at least 7 days.`,
    fix: "Set Backup Retention to 7 or more days in the component config.",
  },
  {
    id: "rds_publicly_accessible",
    level: "critical",
    title: "RDS instance publicly accessible",
    applies: (n) => n.type === "rds",
    check: (n) => n.data?.config?.publicly_accessible === true,
    message: (n) =>
      `${n.data.label} has Publicly Accessible enabled. RDS should never be internet-facing.`,
    fix: "Disable Publicly Accessible in the component config.",
  },
  {
    id: "rds_no_deletion_protection",
    level: "info",
    title: "RDS deletion protection off",
    applies: (n) => n.type === "rds",
    check: (n) => !n.data?.config?.deletion_protection,
    message: (n) =>
      `${n.data.label} has no deletion protection. Enable it to prevent accidental drops.`,
    fix: "Enable Deletion Protection in the component config.",
  },
  {
    id: "aurora_unencrypted",
    level: "warning",
    title: "Aurora storage not encrypted",
    applies: (n) => n.type === "aurora",
    check: (n) => !n.data?.config?.storage_encrypted,
    message: (n) => `${n.data.label} does not have storage encryption enabled.`,
    fix: "Enable Storage Encrypted in the component config.",
  },
  {
    id: "aurora_no_backup",
    level: "warning",
    title: "Aurora backup retention disabled",
    applies: (n) => n.type === "aurora",
    check: (n) => {
      const v = n.data?.config?.backup_retention_period;
      return v === undefined || v === null || Number(v) < 1;
    },
    message: (n) =>
      `${n.data.label} has backup retention set to 0. Set at least 7 days.`,
    fix: "Set Backup Retention to 7 or more days in the component config.",
  },
  {
    id: "ebs_unencrypted",
    level: "warning",
    title: "EBS volume not encrypted",
    applies: (n) => n.type === "ebs",
    check: (n) => !n.data?.config?.encrypted,
    message: (n) =>
      `${n.data.label} is not encrypted. Enable encryption for data at rest.`,
    fix: "Enable Encrypted in the component config.",
  },
  {
    id: "lambda_no_tracing",
    level: "info",
    title: "Lambda X-Ray tracing disabled",
    applies: (n) => n.type === "lambda",
    check: (n) => {
      const v = n.data?.config?.tracing_mode;
      return !v || v === "PassThrough";
    },
    message: (n) =>
      `${n.data.label} has X-Ray tracing set to PassThrough. Enable Active tracing for observability.`,
    fix: "Set X-Ray Tracing to Active in the component config.",
  },
  {
    id: "dynamodb_no_pitr",
    level: "info",
    title: "DynamoDB point-in-time recovery off",
    applies: (n) => n.type === "dynamodb",
    check: (n) => !n.data?.config?.point_in_time_recovery,
    message: (n) =>
      `${n.data.label} does not have Point-in-Time Recovery enabled.`,
    fix: "Enable Point-in-Time Recovery in the component config.",
  },
  {
    id: "redshift_unencrypted",
    level: "warning",
    title: "Redshift cluster not encrypted",
    applies: (n) => n.type === "redshift",
    check: (n) => !n.data?.config?.encrypted,
    message: (n) => `${n.data.label} is not encrypted at rest.`,
    fix: "Enable Encrypted in the component config.",
  },
  {
    id: "s3_no_encryption",
    level: "warning",
    title: "S3 bucket has no server-side encryption",
    applies: (n) => n.type === "s3",
    check: (n) => {
      const v = n.data?.config?.server_side_encryption;
      return v === "none" || v === undefined || v === null;
    },
    message: (n) =>
      `${n.data.label} has no server-side encryption configured.`,
    fix: "Set Server-Side Encryption to AES256 or aws:kms in the component config.",
  },
  {
    id: "s3_versioning_off",
    level: "info",
    title: "S3 bucket versioning disabled",
    applies: (n) => n.type === "s3",
    check: (n) => !n.data?.config?.versioning,
    message: (n) =>
      `${n.data.label} does not have versioning enabled. Enable it to protect against accidental deletes.`,
    fix: "Enable Versioning in the component config.",
  },
  {
    id: "ec2_imdsv2_optional",
    level: "warning",
    title: "EC2 IMDSv2 not enforced",
    applies: (n) => n.type === "ec2",
    check: (n) => {
      const v = n.data?.config?.metadata_http_tokens;
      return !v || v === "optional";
    },
    message: (n) =>
      `${n.data.label} does not enforce IMDSv2. Set metadata tokens to required to prevent SSRF attacks.`,
    fix: "Set IMDSv2 (Metadata Tokens) to required in the component config.",
  },
  // ── FinOps rules ────────────────────────────────────────────────────────────
  {
    id: "ec2_prev_gen",
    level: "info",
    title: "Previous-generation EC2 instance type",
    applies: (n) => n.type === "ec2",
    check: (n) => {
      const t = (n.data?.config?.instance_type ?? "").toLowerCase();
      return /^(t1|t2|m1|m2|m3|m4|c1|c3|c4|r3|r4|i2|d2|g2|cr1|hs1)\./.test(t);
    },
    message: (n) =>
      `${n.data.label} uses instance type "${n.data.config?.instance_type}". This is a previous-generation type with worse price-performance than current equivalents.`,
    fix: "Upgrade to a current-generation equivalent: t2→t3/t4g, m4→m6i/m7g, c4→c6i/c7g, r4→r6i/r7g.",
  },
  {
    id: "rds_no_reserved",
    level: "info",
    title: "RDS instance not marked for reserved pricing",
    applies: (n) => n.type === "rds",
    check: (n) => !n.data?.config?.reserved_instance,
    message: (n) =>
      `${n.data.label} is not marked as a reserved instance. Reserved instances save 30–60% for production databases.`,
    fix: "Enable Reserved Instance in the component config to document the intent, then purchase an RI in the AWS Console.",
  },
  // ── Architecture rules ───────────────────────────────────────────────────────
  {
    id: "alb_no_access_logging",
    level: "warning",
    title: "ALB access logging disabled",
    applies: (n) => n.type === "alb",
    check: (n) => !n.data?.config?.access_logs_enabled,
    message: (n) =>
      `${n.data.label} does not have access logging enabled. Access logs are required for auditing and incident response.`,
    fix: "Enable Access Logs in the component config and specify an S3 bucket to receive them.",
  },
  {
    id: "s3_no_block_public_access",
    level: "warning",
    title: "S3 bucket missing Block Public Access",
    applies: (n) => n.type === "s3",
    check: (n) => !n.data?.config?.block_public_access,
    message: (n) =>
      `${n.data.label} does not have Block Public Access enabled. Without it, a misconfigured bucket policy or ACL could expose data publicly.`,
    fix: "Enable Block Public Access in the component config. Disable only on buckets intentionally serving public content.",
  },
];

// ─── Topology-based rules ─────────────────────────────────────────────────────

const TOPOLOGY_RULES = [
  {
    id: "exposed_database",
    level: "critical",
    title: "Database exposed to public internet",
    applies: (n) => ["rds", "elasticache", "aurora", "dynamodb"].includes(n.type),
    check: (n, edges, nodes) => {
      const igwIds = nodes.filter((nd) => IGW_TYPES.has(nd.type)).map((nd) => nd.id);
      return igwIds.some((igwId) => directEdge(igwId, n.id, edges));
    },
    message: (n) =>
      `${n.data.label} is directly connected to an Internet Gateway. Databases must never be publicly accessible.`,
    fix: "Remove the direct IGW connection. Place the database in a private subnet accessed only through compute.",
  },
  {
    id: "direct_internet_compute",
    level: "critical",
    title: "Compute directly exposed to internet",
    applies: (n) => ["ec2", "ecs", "ecs_fargate"].includes(n.type),
    check: (n, edges, nodes) => {
      const igwIds = nodes.filter((nd) => IGW_TYPES.has(nd.type)).map((nd) => nd.id);
      return igwIds.some((igwId) => directEdge(igwId, n.id, edges));
    },
    message: (n) =>
      `${n.data.label} is directly connected to an Internet Gateway. Place compute behind an ALB.`,
    fix: "Add an ALB between the Internet Gateway and this compute resource.",
  },
  {
    id: "missing_sg",
    level: "warning",
    title: "No security group assigned",
    applies: (n) =>
      ["ec2", "rds", "elasticache", "alb", "nlb", "ecs", "ecs_fargate", "lambda"].includes(n.type),
    check: (n) => !n.data.security_group_ids || n.data.security_group_ids.length === 0,
    message: (n) =>
      `${n.data.label} has no security group. Define explicit ingress/egress rules.`,
    fix: "Open the Security tab and create or assign a security group to this component.",
  },
  {
    id: "missing_iam",
    level: "warning",
    title: "No IAM role — connected to AWS services",
    applies: (n) => ["lambda", "ec2", "ecs", "ecs_fargate"].includes(n.type),
    check: (n, edges, nodes) => {
      if (n.data.iam_role_id) return false;
      return hasNeighborOfType(
        n.id,
        ["s3", "dynamodb", "sqs", "sns", "rds", "secretsmanager", "kms", "efs"],
        edges,
        nodes,
      );
    },
    message: (n) =>
      `${n.data.label} accesses AWS services but has no IAM role. Assign a least-privilege role.`,
    fix: "Open the IAM tab and assign a role with the minimum required permissions.",
  },
  {
    id: "missing_waf",
    level: "warning",
    title: "Public-facing load balancer without WAF",
    applies: (n) => n.type === "alb",
    check: (n, edges, nodes) => {
      const igwIds = nodes.filter((nd) => IGW_TYPES.has(nd.type)).map((nd) => nd.id);
      const isPublic = igwIds.some((igwId) => directEdge(igwId, n.id, edges));
      return isPublic && !hasNeighborOfType(n.id, "waf", edges, nodes);
    },
    message: (n) =>
      `${n.data.label} is internet-facing but has no WAF attached.`,
    fix: "Add a WAF component and connect it to this ALB.",
  },
  {
    id: "orphaned_node",
    level: "warning",
    title: "Orphaned component — no connections",
    applies: (n) => !INFRASTRUCTURE_TYPES.has(n.type),
    check: (n, edges) =>
      !edges.some((e) => e.source === n.id || e.target === n.id),
    message: (n) =>
      `${n.data.label} has no connections. Connect it or remove it.`,
    fix: "Draw an edge from this component to a related resource, or delete it if it is no longer needed.",
  },
  {
    id: "alb_no_targets",
    level: "warning",
    title: "Load balancer has no targets",
    applies: (n) => ["alb", "nlb"].includes(n.type),
    check: (n, edges, nodes) =>
      !hasNeighborOfType(n.id, ["ec2", "lambda", "ecs", "ecs_fargate"], edges, nodes),
    message: (n) =>
      `${n.data.label} has no compute targets. Connect to EC2, Lambda, or ECS.`,
    fix: "Draw an edge from this load balancer to a compute component.",
  },
  {
    id: "missing_cloudwatch",
    level: "info",
    title: "No CloudWatch monitoring",
    applies: (n) =>
      ["lambda", "ec2", "rds", "alb", "ecs", "ecs_fargate"].includes(n.type),
    check: (n, edges, nodes) => {
      const cwNodes = nodes.filter((nd) => nd.type === "cloudwatch");
      return (
        cwNodes.length === 0 ||
        !cwNodes.some((cw) => directEdge(n.id, cw.id, edges))
      );
    },
    message: (n) =>
      `${n.data.label} has no CloudWatch connection.`,
    fix: "Add a CloudWatch component and connect it to this resource.",
  },
  {
    id: "no_multi_az",
    level: "info",
    title: "Single AZ — no high availability",
    applies: (n) => ["rds", "aurora"].includes(n.type),
    check: (n) => !n.data?.config?.multi_az,
    message: (n) =>
      `${n.data.label} does not have Multi-AZ enabled. Enable it for production workloads.`,
    fix: "Enable Multi-AZ in the component config.",
  },
  {
    id: "missing_secrets_manager",
    level: "warning",
    title: "Credentials may be hardcoded — no Secrets Manager path",
    applies: (n) => ["ec2", "lambda", "ecs", "ecs_fargate"].includes(n.type),
    check: (n, edges, nodes) => {
      const neighbors = neighborIds(n.id, edges);
      const connectsToData = neighbors.some((nid) => {
        const nd = nodes.find((x) => x.id === nid);
        return nd && ["rds", "elasticache", "aurora"].includes(nd.type);
      });
      if (!connectsToData) return false;
      const reachable = reachableTypes(n.id, edges, nodes, 2);
      return !reachable.has("secretsmanager");
    },
    message: (n) =>
      `${n.data.label} connects to a database but has no path to Secrets Manager. Credentials may be hardcoded.`,
    fix: "Add a Secrets Manager component and connect it to this compute resource to manage database credentials.",
  },
  {
    id: "nat_gateway_missing",
    level: "warning",
    title: "Private subnet compute has no NAT gateway",
    applies: (n) => ["ec2", "ecs", "ecs_fargate", "lambda"].includes(n.type),
    check: (n, edges, nodes) => {
      // Only applies to nodes whose parent subnet is not public
      const parentSubnet = nodes.find(
        (nd) => nd.type === "subnet" && nd.id === n.parentId,
      );
      if (!parentSubnet) return false;
      if (parentSubnet.data?.config?.public) return false;
      // Check no nat_gateway reachable within 2 hops
      const reachable = reachableTypes(parentSubnet.id, edges, nodes, 2);
      return !reachable.has("nat_gateway");
    },
    message: (n) =>
      `${n.data.label} is in a private subnet with no NAT Gateway. It cannot reach the internet for updates or external calls.`,
    fix: "Add a NAT Gateway in a public subnet and connect it to the private subnet's route table.",
  },
  {
    id: "rds_in_public_subnet",
    level: "warning",
    title: "Database in a public subnet",
    applies: (n) => ["rds", "aurora", "elasticache"].includes(n.type),
    check: (n, nodes) => {
      const parentSubnet = nodes.find(
        (nd) => nd.type === "subnet" && nd.id === n.parentId,
      );
      return parentSubnet?.data?.config?.public === true;
    },
    message: (n) =>
      `${n.data.label} is placed in a public subnet. Databases should always be in private subnets.`,
    fix: "Move this component into a private subnet (one without a direct Internet Gateway route).",
  },
  {
    id: "alb_single_az",
    level: "info",
    title: "Load balancer spans only one subnet",
    applies: (n) => ["alb", "nlb"].includes(n.type),
    check: (n, edges, nodes) => {
      const subnetNeighbors = neighborIds(n.id, edges).filter((nid) => {
        const nd = nodes.find((x) => x.id === nid);
        return nd?.type === "subnet";
      });
      // Also count if the ALB is a child of a subnet
      const inSubnet = n.parentId
        ? nodes.find((nd) => nd.type === "subnet" && nd.id === n.parentId)
        : null;
      const total = new Set([...subnetNeighbors, ...(inSubnet ? [inSubnet.id] : [])]);
      return total.size < 2;
    },
    message: (n) =>
      `${n.data.label} appears to span only one subnet. ALBs require at least two subnets in different AZs.`,
    fix: "Connect this load balancer to subnets in at least two Availability Zones.",
  },
  {
    id: "lambda_no_dlq",
    level: "info",
    title: "Lambda function has no dead-letter queue",
    applies: (n) => n.type === "lambda",
    check: (n, edges, nodes) =>
      !hasNeighborOfType(n.id, ["sqs", "sns"], edges, nodes),
    message: (n) =>
      `${n.data.label} has no dead-letter queue. Failed async invocations will be silently dropped.`,
    fix: "Add an SQS queue or SNS topic and connect it to this Lambda as a DLQ.",
  },
  {
    id: "nat_single_az",
    level: "warning",
    title: "Single NAT Gateway — no cross-AZ redundancy",
    applies: (n) => n.type === "nat_gateway",
    check: (n, edges, nodes) => {
      // Fire when there is exactly one NAT gateway but multiple private subnets
      const natCount = nodes.filter((nd) => nd.type === "nat_gateway").length;
      if (natCount > 1) return false;
      const privateSubnets = nodes.filter(
        (nd) => nd.type === "subnet" && !nd.data?.config?.public,
      );
      return privateSubnets.length >= 2;
    },
    message: (n) =>
      `Only one NAT Gateway exists across ${
        (() => {
          // count not easily accessible here — use generic wording
          return "multiple private subnets";
        })()
      }. If its AZ goes down, all private subnet egress fails.`,
    fix: "Add a second NAT Gateway in a different Availability Zone and update each private subnet's route table.",
  },
];

// ─── SG port inspection rules ─────────────────────────────────────────────────
// These produce findings on both the SG node (if present) and any component
// whose security_group_ids includes the SG.

const SG_RULES = [
  {
    id: "sg_open_all",
    level: "critical",
    title: "Security group allows all traffic from internet",
    canAcknowledge: false,
    check: (sg) => sgAllowsAllTrafficFromPublic(sg),
    message: (sg) =>
      `Security group "${sg.name}" allows all traffic (protocol -1) from 0.0.0.0/0.`,
    fix: "Remove the all-traffic inbound rule and replace with specific port allowances.",
  },
  {
    id: "sg_open_db_port",
    level: "critical",
    title: "Database port open to internet",
    canAcknowledge: false,
    check: (sg) => {
      const dbPorts = [3306, 5432, 1521, 27017, 6379, 5439, 1433];
      return dbPorts.some((p) => sgAllowsPortFromPublic(sg, p));
    },
    message: (sg) =>
      `Security group "${sg.name}" allows a database port (MySQL/Postgres/Redis/etc.) from 0.0.0.0/0.`,
    fix: "Restrict database port access to specific security group sources, not public CIDRs.",
  },
  {
    id: "sg_open_ssh",
    level: "warning",
    title: "SSH open to internet",
    canAcknowledge: false,
    check: (sg) => sgAllowsPortFromPublic(sg, 22),
    message: (sg) =>
      `Security group "${sg.name}" allows SSH (port 22) from 0.0.0.0/0.`,
    fix: "Restrict SSH to specific IP ranges or use AWS Systems Manager Session Manager instead.",
  },
  {
    id: "sg_open_rdp",
    level: "warning",
    title: "RDP open to internet",
    canAcknowledge: false,
    check: (sg) => sgAllowsPortFromPublic(sg, 3389),
    message: (sg) =>
      `Security group "${sg.name}" allows RDP (port 3389) from 0.0.0.0/0.`,
    fix: "Restrict RDP to specific IP ranges or use AWS Systems Manager Fleet Manager.",
  },
  {
    id: "sg_open_telnet",
    level: "warning",
    title: "Telnet port open to internet",
    canAcknowledge: true,
    check: (sg) => sgAllowsPortFromPublic(sg, 23),
    message: (sg) =>
      `Security group "${sg.name}" allows Telnet (port 23) from 0.0.0.0/0. Telnet is unencrypted.`,
    fix: "Replace Telnet with SSH. If intentional, acknowledge this warning.",
  },
  {
    id: "sg_open_ftp",
    level: "warning",
    title: "FTP port open to internet",
    canAcknowledge: true,
    check: (sg) =>
      sgAllowsPortFromPublic(sg, 20) || sgAllowsPortFromPublic(sg, 21),
    message: (sg) =>
      `Security group "${sg.name}" allows FTP (port 20/21) from 0.0.0.0/0. FTP is unencrypted.`,
    fix: "Use SFTP (port 22) or AWS Transfer Family instead. If intentional, acknowledge this warning.",
  },
  {
    id: "sg_open_smtp",
    level: "warning",
    title: "SMTP port open to internet",
    canAcknowledge: true,
    check: (sg) => sgAllowsPortFromPublic(sg, 25),
    message: (sg) =>
      `Security group "${sg.name}" allows SMTP (port 25) from 0.0.0.0/0.`,
    fix: "Use Amazon SES for outbound email. If intentional for a mail server, acknowledge this warning.",
  },
  {
    id: "sg_open_pop3_imap",
    level: "warning",
    title: "Mail retrieval port open to internet",
    canAcknowledge: true,
    check: (sg) =>
      [110, 143, 993, 995].some((p) => sgAllowsPortFromPublic(sg, p)),
    message: (sg) =>
      `Security group "${sg.name}" allows POP3/IMAP (110/143/993/995) from 0.0.0.0/0.`,
    fix: "Restrict mail port access. If running a mail server, acknowledge this warning.",
  },
  {
    id: "sg_ephemeral_ports",
    level: "info",
    title: "Wide port range open to internet",
    canAcknowledge: true,
    check: (sg) => sg?.inbound?.some((rule) => isWideRange(rule)) ?? false,
    message: (sg) =>
      `Security group "${sg.name}" has a wide port range open to 0.0.0.0/0. Verify this is intentional.`,
    fix: "Narrow the port range to only required ports. If intentional, acknowledge this warning.",
  },
  {
    id: "sg_http_not_https",
    level: "info",
    title: "HTTP allowed without HTTPS",
    canAcknowledge: false,
    check: (sg) =>
      sgAllowsPortFromPublic(sg, 80) && !sgAllowsPortFromPublic(sg, 443),
    message: (sg) =>
      `Security group "${sg.name}" allows HTTP (80) from the internet but not HTTPS (443).`,
    fix: "Add an HTTPS (443) inbound rule and redirect HTTP to HTTPS at the load balancer.",
  },
  {
    id: "sg_open_admin_port",
    level: "warning",
    title: "Admin or debug port open to internet",
    canAcknowledge: true,
    check: (sg) => {
      const adminPorts = [
        8080, 8443, 8888,  // common web admin / Jupyter
        9200, 9300,        // Elasticsearch
        5601,              // Kibana
        9000,              // Portainer / SonarQube
        2375, 2376,        // Docker daemon
        6443,              // Kubernetes API
        10250,             // Kubelet
        4848,              // GlassFish admin
        4040,              // Spark UI
        8161,              // ActiveMQ admin
      ];
      return adminPorts.some((p) => sgAllowsPortFromPublic(sg, p));
    },
    message: (sg) =>
      `Security group "${sg.name}" exposes an admin or debug port to 0.0.0.0/0. These interfaces often lack production-grade authentication.`,
    fix: "Restrict admin port access to a specific IP range or VPN CIDR. If this is intentional, acknowledge the warning.",
  },
];

// ─── IAM-based rules ─────────────────────────────────────────────────────────
// Operate on the iamRoles array: [{ id, name, policies: [{ effect, actions[], resources[] }] }]

const _SENSITIVE_SERVICES = new Set([
  "iam", "s3", "ec2", "rds", "kms", "secretsmanager",
  "cloudtrail", "guardduty", "organizations", "sts",
]);

function _hasWildcardOnSensitive(policies) {
  for (const stmt of policies) {
    if (stmt.effect !== "Allow") continue;
    const actions = Array.isArray(stmt.actions)
      ? stmt.actions
      : String(stmt.actions ?? "").split(/[\s,]+/);
    for (const action of actions) {
      const a = action.trim().toLowerCase();
      if (a === "*") return true;                     // allow everything
      const [svc] = a.split(":");
      if (a.endsWith(":*") && _SENSITIVE_SERVICES.has(svc)) return true;
    }
  }
  return false;
}

function _hasAdminPolicy(policies) {
  for (const stmt of policies) {
    if (stmt.effect !== "Allow") continue;
    const actions = Array.isArray(stmt.actions)
      ? stmt.actions
      : String(stmt.actions ?? "").split(/[\s,]+/);
    const resources = Array.isArray(stmt.resources)
      ? stmt.resources
      : String(stmt.resources ?? "").split(/[\s,]+/);
    const allActions = actions.some((a) => a.trim() === "*");
    const allResources = resources.some((r) => r.trim() === "*");
    if (allActions && allResources) return true;
  }
  return false;
}

const IAM_RULES = [
  {
    id: "iam_admin_policy",
    level: "critical",
    title: "IAM role grants full administrator access",
    check: (role) => _hasAdminPolicy(role.policies ?? []),
    message: (role) => `IAM role "${role.name}" has a policy allowing Action:* on Resource:*. This is equivalent to AdministratorAccess.`,
    fix: "Replace the wildcard policy with specific actions and resources. Follow the principle of least privilege.",
    canAcknowledge: false,
  },
  {
    id: "iam_wildcard_sensitive",
    level: "critical",
    title: "IAM role has wildcard actions on sensitive service",
    check: (role) => !_hasAdminPolicy(role.policies ?? []) && _hasWildcardOnSensitive(role.policies ?? []),
    message: (role) => `IAM role "${role.name}" allows wildcard (*) actions on a sensitive service (IAM, S3, KMS, etc.). This is overly permissive.`,
    fix: "Replace service-level wildcards (e.g. s3:*) with specific actions (e.g. s3:GetObject, s3:PutObject).",
    canAcknowledge: false,
  },
];

// ─── Acknowledge persistence ──────────────────────────────────────────────────

const LS_KEY = "archon_acknowledged_findings";

function loadAcknowledged() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveAcknowledged(map) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(map));
  } catch {}
}

// ─── Main compute function ────────────────────────────────────────────────────

function computeFindings(nodes, edges, securityGroups, iamRoles) {
  const sgs = Array.isArray(securityGroups) ? securityGroups : [];
  const roles = Array.isArray(iamRoles) ? iamRoles : [];
  const findings = [];

  // 1. Config-based rules
  for (const node of nodes) {
    for (const rule of CONFIG_RULES) {
      if (rule.applies(node) && rule.check(node, edges, nodes)) {
        findings.push({
          id: `${rule.id}::${node.id}`,
          ruleId: rule.id,
          nodeId: node.id,
          nodeLabel: node.data?.label ?? node.type,
          nodeType: node.type,
          level: rule.level,
          title: rule.title,
          message: rule.message(node),
          fix: rule.fix,
          canAcknowledge: rule.canAcknowledge ?? false,
          sgId: null,
        });
      }
    }
  }

  // 2. Topology-based rules
  for (const node of nodes) {
    for (const rule of TOPOLOGY_RULES) {
      if (rule.applies(node) && rule.check(node, edges, nodes)) {
        findings.push({
          id: `${rule.id}::${node.id}`,
          ruleId: rule.id,
          nodeId: node.id,
          nodeLabel: node.data?.label ?? node.type,
          nodeType: node.type,
          level: rule.level,
          title: rule.title,
          message: rule.message(node),
          fix: rule.fix,
          canAcknowledge: rule.canAcknowledge ?? false,
          sgId: null,
        });
      }
    }
  }

  // 3. SG port inspection rules
  const sgUsers = {};
  for (const node of nodes) {
    for (const sgId of node.data?.security_group_ids ?? []) {
      if (!sgUsers[sgId]) sgUsers[sgId] = [];
      sgUsers[sgId].push(node.id);
    }
  }
  const sgNodeById = {};
  for (const node of nodes) {
    if (node.type === "security_group") sgNodeById[node.id] = node;
  }
  for (const sg of sgs) {
    for (const rule of SG_RULES) {
      if (!rule.check(sg)) continue;
      const sgNode = sgNodeById[sg.id];
      const sgFindingBase = {
        ruleId: rule.id,
        level: rule.level,
        title: rule.title,
        message: rule.message(sg),
        fix: rule.fix,
        canAcknowledge: rule.canAcknowledge,
        sgId: sg.id,
        sgName: sg.name,
      };
      if (sgNode) {
        findings.push({
          ...sgFindingBase,
          id: `${rule.id}::${sgNode.id}`,
          nodeId: sgNode.id,
          nodeLabel: sgNode.data?.label ?? sg.name,
          nodeType: "security_group",
        });
      }
      for (const nodeId of sgUsers[sg.id] ?? []) {
        const node = nodes.find((n) => n.id === nodeId);
        if (!node) continue;
        findings.push({
          ...sgFindingBase,
          id: `${rule.id}::${sg.id}::${nodeId}`,
          nodeId,
          nodeLabel: node.data?.label ?? node.type,
          nodeType: node.type,
        });
      }
    }
  }

  // 4. IAM-based rules
  for (const role of roles) {
    for (const rule of IAM_RULES) {
      if (!rule.check(role)) continue;
      findings.push({
        id: `${rule.id}::${role.id}`,
        ruleId: rule.id,
        nodeId: role.id,
        nodeLabel: role.name,
        nodeType: "iam_role",
        level: rule.level,
        title: rule.title,
        message: rule.message(role),
        fix: rule.fix,
        canAcknowledge: rule.canAcknowledge ?? false,
        sgId: null,
      });
    }
  }

  const ORDER = { critical: 0, warning: 1, info: 2 };
  findings.sort((a, b) => ORDER[a.level] - ORDER[b.level]);

  const nodeFindings = {};
  for (const f of findings) {
    if (!nodeFindings[f.nodeId]) nodeFindings[f.nodeId] = [];
    nodeFindings[f.nodeId].push(f);
  }

  const warnings = {};
  for (const [nid, flist] of Object.entries(nodeFindings)) {
    warnings[nid] = flist.map((f) => ({ message: f.message, level: f.level }));
  }

  return { findings, nodeFindings, warnings };
}

// ─── Store ────────────────────────────────────────────────────────────────────

const useValidationStore = create((set, get) => ({
  findings: [],
  nodeFindings: {},
  warnings: {},
  acknowledgedFindings: loadAcknowledged(),

  update: (nodes, edges, securityGroups, iamRoles) =>
    set(computeFindings(nodes, edges, securityGroups, iamRoles)),

  acknowledge: (findingId, reason = "") => {
    const next = { ...get().acknowledgedFindings, [findingId]: { reason, timestamp: Date.now() } };
    saveAcknowledged(next);
    set({ acknowledgedFindings: next });
  },

  unacknowledge: (findingId) => {
    const next = { ...get().acknowledgedFindings };
    delete next[findingId];
    saveAcknowledged(next);
    set({ acknowledgedFindings: next });
  },

  activeFindingCount: () => {
    const { findings, acknowledgedFindings } = get();
    return findings.filter((f) => !acknowledgedFindings[f.id]).length;
  },
}));

export default useValidationStore;
