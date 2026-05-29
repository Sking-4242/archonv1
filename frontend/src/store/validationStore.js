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
    suggestion: `Set \`storage_encrypted = true\` on \`aws_db_instance\` or \`aws_db_cluster\`. Encryption is set at creation and cannot be changed in place — snapshot and restore if the instance already exists.`,
    standards: ["CIS", "SOC2", "PCI", "HIPAA"]
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
    suggestion: `Set \`backup_retention_period = 7\` (minimum) on \`aws_db_instance\`. Automated backups enable point-in-time restore to any second within the retention window.`,
    standards: ["SOC2", "PCI", "HIPAA", "NIST"]
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
    suggestion: `Set \`publicly_accessible = false\` on \`aws_db_instance\`. Place the instance in a private subnet and access it through an application layer or bastion host.`,
    standards: ["CIS", "SOC2", "PCI", "HIPAA"]
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
    suggestion: `Set \`deletion_protection = true\` on \`aws_db_instance\` or \`aws_db_cluster\`. This prevents \`terraform destroy\` and console deletion without an explicit override.`,
    standards: ["SOC2"]
  },
  {
    id: "aurora_unencrypted",
    level: "warning",
    title: "Aurora storage not encrypted",
    applies: (n) => n.type === "aurora",
    check: (n) => !n.data?.config?.storage_encrypted,
    message: (n) => `${n.data.label} does not have storage encryption enabled.`,
    fix: "Enable Storage Encrypted in the component config.",
    suggestion: `Set \`storage_encrypted = true\` on \`aws_rds_cluster\`. For Aurora, encryption must be enabled at cluster creation — take a snapshot and restore into a new encrypted cluster.`,
    standards: ["CIS", "SOC2", "PCI", "HIPAA"]
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
    suggestion: `Set \`backup_retention_period = 7\` on \`aws_rds_cluster\`. Aurora automated backups are continuous and billed per GB stored.`,
    standards: ["SOC2", "PCI", "HIPAA", "NIST"]
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
    suggestion: `Set \`encrypted = true\` on \`aws_ebs_volume\`. Enable account-level default EBS encryption via \`aws_ebs_encryption_by_default\` so all new volumes are encrypted automatically.`,
    standards: ["CIS", "SOC2", "PCI", "HIPAA"]
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
    suggestion: `Set \`tracing_config { mode = "Active" }\` on \`aws_lambda_function\`. Active tracing samples all invocations and records segments to AWS X-Ray.`,
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
    suggestion: `Set \`point_in_time_recovery { enabled = true }\` on \`aws_dynamodb_table\`. PITR lets you restore to any second in the last 35 days.`,
    standards: ["SOC2", "PCI", "HIPAA", "NIST"]
  },
  {
    id: "redshift_unencrypted",
    level: "warning",
    title: "Redshift cluster not encrypted",
    applies: (n) => n.type === "redshift",
    check: (n) => !n.data?.config?.encrypted,
    message: (n) => `${n.data.label} is not encrypted at rest.`,
    fix: "Enable Encrypted in the component config.",
    suggestion: `Set \`encrypted = true\` on \`aws_redshift_cluster\`. Encryption uses AES-256 and can be enabled on an existing cluster without downtime.`,
    standards: ["CIS", "SOC2", "PCI", "HIPAA"]
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
    suggestion: `Add \`server_side_encryption_configuration { rule { apply_server_side_encryption_by_default { sse_algorithm = "aws:kms" } } }\` on \`aws_s3_bucket\` or use \`aws_s3_bucket_server_side_encryption_configuration\`.`,
    standards: ["CIS", "SOC2", "PCI", "HIPAA"]
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
    suggestion: `Add \`versioning { enabled = true }\` on \`aws_s3_bucket\` or use \`aws_s3_bucket_versioning\`. Required for S3 Object Lock and recommended before enabling lifecycle rules.`,
    standards: ["SOC2", "PCI", "HIPAA", "NIST"]
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
    suggestion: `Set \`metadata_options { http_tokens = "required" http_endpoint = "enabled" }\` on \`aws_instance\`. IMDSv2 uses session-oriented requests that prevent SSRF-based credential theft.`,
    standards: ["CIS", "PCI", "NIST"]
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
    suggestion: `Update the \`instance_type\` value on \`aws_instance\`. t2→t3/t4g (up to 30% cheaper, better baseline CPU), m4→m6i/m7g, c4→c6i/c7g, r4→r6i/r7g. Check for reservation commitments before changing.`,
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
    suggestion: `Purchase an RDS Reserved Instance in the AWS Console for 1- or 3-year terms. For Terraform state tracking, add a \`reserved_instance = true\` annotation in the config panel.`,
  },
  // ── FinOps — Storage ─────────────────────────────────────────────────────────
  {
    id: "ebs_gp2_upgrade",
    level: "info",
    title: "EBS volume is gp2 — upgrade to gp3",
    applies: (n) => n.type === "ebs",
    check: (n) => (n.data?.config?.volume_type ?? "gp2") === "gp2",
    message: (n) =>
      `${n.data?.label || n.id} uses gp2 storage. gp3 provides the same baseline performance at 20% lower cost.`,
    fix: "Change Volume Type to gp3 in the component config.",
    suggestion: `Set \`volume_type = "gp3"\` on \`aws_ebs_volume\`. gp3 delivers 3000 IOPS and 125 MiBps baseline at 20% less than gp2 with no performance trade-off. Increase IOPS/throughput independently if needed.`,
    canAcknowledge: true,
  },
  {
    id: "rds_gp2_storage",
    level: "info",
    title: "RDS uses gp2 storage — upgrade to gp3",
    applies: (n) => ["rds", "aurora"].includes(n.type),
    check: (n) => (n.data?.config?.storage_type ?? "gp2") === "gp2",
    message: (n) =>
      `${n.data?.label || n.id} uses gp2 storage. gp3 provides the same baseline IOPS at 20% lower cost.`,
    fix: "Change Storage Type to gp3 in the component config.",
    suggestion: `Set \`storage_type = "gp3"\` on \`aws_db_instance\`. gp3 delivers 3000 IOPS baseline, which covers most OLTP workloads. Add \`iops\` if you need more than 3000 (up to 16,000 on gp3 vs 64,000 on io1).`,
    canAcknowledge: true,
  },
  {
    id: "rds_io1_consider_gp3",
    level: "info",
    title: "RDS io1 storage — evaluate gp3 at this IOPS range",
    applies: (n) => ["rds", "aurora"].includes(n.type),
    check: (n) => n.data?.config?.storage_type === "io1",
    message: (n) =>
      `${n.data?.label || n.id} uses io1 storage. gp3 supports up to 16,000 IOPS at significantly lower cost per IOPS.`,
    fix: "Evaluate switching to gp3 if IOPS requirement is under 16,000. Set iops explicitly on gp3.",
    suggestion: `Compare cost: io1 charges per GB + per provisioned IOPS. gp3 charges per GB only up to 16,000 IOPS. Run \`aws rds describe-db-instances\` and check CloudWatch \`ReadIOPS\`/\`WriteIOPS\` — if peak is under 16,000, gp3 costs less. Change \`storage_type = "gp3"\` and set \`iops\` explicitly.`,
    canAcknowledge: true,
  },
  {
    id: "rds_no_storage_autoscaling",
    level: "info",
    title: "RDS storage autoscaling not configured",
    applies: (n) => n.type === "rds",
    check: (n) => {
      const max = n.data?.config?.max_allocated_storage;
      return !max || Number(max) === 0;
    },
    message: (n) =>
      `${n.data?.label || n.id} has no max_allocated_storage set. Storage must be manually resized, causing downtime or over-provisioning.`,
    fix: "Set Max Allocated Storage to 2–3x the initial allocation in the component config.",
    suggestion: `Set \`max_allocated_storage\` to 2–3x \`allocated_storage\` on \`aws_db_instance\`. RDS autoscales within this limit with zero downtime. Without it, teams over-provision upfront or face an emergency resize window.`,
    canAcknowledge: true,
  },
  {
    id: "s3_versioning_no_lifecycle",
    level: "info",
    title: "S3 versioning enabled with no lifecycle policy",
    applies: (n) => n.type === "s3",
    check: (n) => n.data?.config?.versioning === true && !n.data?.config?.lifecycle_rule,
    message: (n) =>
      `${n.data?.label || n.id} has versioning enabled but no lifecycle policy. Non-current versions accumulate indefinitely.`,
    fix: "Add a lifecycle rule to expire non-current versions after 30–90 days.",
    suggestion: `Add \`aws_s3_bucket_lifecycle_configuration\` with a rule: \`noncurrent_version_expiration { noncurrent_days = 30 }\`. Also consider transitioning non-current versions to S3 Glacier Instant Retrieval after 7 days before expiring them.`,
    canAcknowledge: true,
  },
  // ── FinOps — Compute ──────────────────────────────────────────────────────────
  {
    id: "lambda_not_arm64",
    level: "info",
    title: "Lambda using x86_64 — Graviton2 (arm64) is cheaper",
    applies: (n) => n.type === "lambda",
    check: (n) => {
      const arch = n.data?.config?.architecture;
      return !arch || arch === "x86_64";
    },
    message: (n) =>
      `${n.data?.label || n.id} uses x86_64. arm64 (Graviton2) is 20% cheaper and typically 20% faster for Lambda.`,
    fix: "Set Architecture to arm64 in the component config.",
    suggestion: `Set \`architectures = ["arm64"]\` on \`aws_lambda_function\`. Graviton2 costs 20% less per GB-second. Most Python, Node.js, Java, and Go runtimes support arm64 natively. Test with \`terraform plan\` — a redeploy is required (Lambda replaces the function).`,
    canAcknowledge: true,
  },
  {
    id: "lambda_high_timeout",
    level: "info",
    title: "Lambda timeout set to maximum (900s)",
    applies: (n) => n.type === "lambda",
    check: (n) => Number(n.data?.config?.timeout) >= 900,
    message: (n) =>
      `${n.data?.label || n.id} has a 900-second timeout. Errors will silently retry for 15 minutes, accumulating compute charges.`,
    fix: "Set timeout to the actual expected max execution time plus a small buffer.",
    suggestion: `Set \`timeout\` on \`aws_lambda_function\` to the realistic worst-case execution time (p99) + 20%. A 900s timeout on a function that normally runs in 5s means a hung invocation costs 180× more than expected before failing. Use X-Ray or CloudWatch Logs Insights to measure actual duration.`,
    canAcknowledge: true,
  },
  {
    id: "lambda_default_memory",
    level: "info",
    title: "Lambda at default 128 MB memory",
    applies: (n) => n.type === "lambda",
    check: (n) => {
      const mem = n.data?.config?.memory_size;
      return !mem || Number(mem) === 128;
    },
    message: (n) =>
      `${n.data?.label || n.id} uses the default 128 MB memory allocation. Increasing memory often reduces duration enough to lower total cost.`,
    fix: "Use AWS Lambda Power Tuning to find the optimal memory/cost balance.",
    suggestion: `Run the open-source AWS Lambda Power Tuning state machine (github.com/alexcasalboni/aws-lambda-power-tuning) against this function. It tests 6–8 memory sizes in parallel and plots cost vs duration. Most functions are cheapest at 512 MB–1 GB, not 128 MB, because Lambda bills duration × memory and higher memory finishes faster.`,
    canAcknowledge: true,
  },
  {
    id: "ecs_no_fargate_spot",
    level: "info",
    title: "ECS Fargate not using Spot capacity",
    applies: (n) => n.type === "ecs_fargate",
    check: (n) => (n.data?.config?.launch_type ?? "FARGATE") !== "FARGATE_SPOT",
    message: (n) =>
      `${n.data?.label || n.id} uses on-demand Fargate. Fargate Spot can reduce compute cost by 70% for fault-tolerant workloads.`,
    fix: "Use a capacity provider strategy with FARGATE_SPOT for non-critical tasks.",
    suggestion: `Add a \`capacity_provider_strategy\` to \`aws_ecs_service\`: \`{ capacity_provider = "FARGATE_SPOT" weight = 4 } { capacity_provider = "FARGATE" weight = 1 }\`. This runs 80% of tasks on Spot with on-demand fallback. Spot tasks receive a 2-minute warning before interruption — ensure your tasks handle SIGTERM gracefully.`,
    canAcknowledge: true,
  },
  // ── FinOps — Database ─────────────────────────────────────────────────────────
  {
    id: "rds_no_perf_insights",
    level: "info",
    title: "RDS Performance Insights disabled",
    applies: (n) => n.type === "rds",
    check: (n) => !n.data?.config?.performance_insights_enabled,
    message: (n) =>
      `${n.data?.label || n.id} has Performance Insights disabled. Without it you cannot identify slow queries or right-size the instance.`,
    fix: "Enable Performance Insights in the component config.",
    suggestion: `Set \`performance_insights_enabled = true\` on \`aws_db_instance\`. The free tier retains 7 days of data. Performance Insights is the fastest way to identify lock contention, I/O bottlenecks, and top SQL — required for any right-sizing exercise.`,
    canAcknowledge: true,
  },
  {
    id: "dynamodb_high_provisioned",
    level: "warning",
    title: "DynamoDB PROVISIONED with high static capacity",
    applies: (n) => n.type === "dynamodb",
    check: (n) => {
      if ((n.data?.config?.billing_mode ?? "PAY_PER_REQUEST") !== "PROVISIONED") return false;
      return Number(n.data?.config?.read_capacity ?? 0) > 100 ||
             Number(n.data?.config?.write_capacity ?? 0) > 100;
    },
    message: (n) =>
      `${n.data?.label || n.id} has PROVISIONED billing with over 100 RCU or WCU. Static provisioning at this level is likely over-allocated.`,
    fix: "Switch to PAY_PER_REQUEST billing or enable DynamoDB Auto Scaling.",
    suggestion: `Either set \`billing_mode = "PAY_PER_REQUEST"\` (no capacity management, pays per request) or keep PROVISIONED and add \`aws_appautoscaling_target\` + \`aws_appautoscaling_policy\` for both read and write. PAY_PER_REQUEST is typically cheaper for tables with variable or unpredictable traffic.`,
    canAcknowledge: true,
  },
  {
    id: "aurora_not_graviton",
    level: "info",
    title: "Aurora instance not using Graviton2/3",
    applies: (n) => n.type === "aurora",
    check: (n) => {
      const cls = (n.data?.config?.instance_class ?? "").toLowerCase();
      return cls.length > 0 && !cls.includes("g.") && !/\.(t4g|m6g|m7g|r6g|r7g|r8g|x2g)/.test(cls);
    },
    message: (n) =>
      `${n.data?.label || n.id} uses instance class "${n.data?.config?.instance_class}". Graviton2/3 instances (r6g, r7g, m6g) are 10–20% cheaper for the same performance.`,
    fix: "Switch to a Graviton2 instance class (e.g. db.r6g.large instead of db.r5.large).",
    suggestion: `Change \`instance_class\` to the Graviton2 equivalent: r5→r6g, r6i→r7g, m5→m6g, t3→t4g. Aurora MySQL 3.x and Aurora PostgreSQL 13+ support Graviton natively. Check the AWS docs for the compatibility matrix before switching.`,
    canAcknowledge: true,
  },
  {
    id: "elasticache_prev_gen_node",
    level: "info",
    title: "ElastiCache previous-generation node type",
    applies: (n) => n.type === "elasticache",
    check: (n) => /^cache\.(t2|m3|m2|r3|r4|c1)\./i.test(n.data?.config?.node_type ?? ""),
    message: (n) =>
      `${n.data?.label || n.id} uses node type "${n.data?.config?.node_type}". Current-generation equivalents offer better price-performance.`,
    fix: "Upgrade to a current-generation node type: t2→t4g, r3/r4→r6g, m3→m6g.",
    suggestion: `Update \`node_type\` on \`aws_elasticache_replication_group\`: cache.t2→cache.t4g (40% cheaper, higher network bandwidth), cache.r3/r4→cache.r6g (10–15% cheaper, more memory per dollar), cache.m3→cache.m6g. Requires a maintenance window cluster replacement — plan for failover.`,
    canAcknowledge: true,
  },
  // ── FinOps — Observability ────────────────────────────────────────────────────
  {
    id: "cloudwatch_no_log_retention",
    level: "warning",
    title: "CloudWatch log group has no retention policy",
    applies: (n) => n.type === "cloudwatch",
    check: (n) => {
      const ret = n.data?.config?.retention_in_days;
      return !ret || Number(ret) === 0;
    },
    message: (n) =>
      `${n.data?.label || n.id} has no log retention configured. Logs are kept indefinitely and cost accumulates without bound.`,
    fix: "Set a retention period (30–365 days) in the component config.",
    suggestion: `Set \`retention_in_days\` on \`aws_cloudwatch_log_group\`. Common values: 30 days for application logs, 90 days for audit logs, 365 days for compliance-required logs. CloudWatch Logs storage is $0.03/GB/month — a busy service generating 1 GB/day costs $11/month at 365-day retention vs $0.90/month at 30 days.`,
    canAcknowledge: true,
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
    suggestion: `Add \`access_logs { bucket = aws_s3_bucket.alb_logs.id enabled = true }\` on \`aws_lb\`. Create a dedicated S3 bucket and grant the ELB service account write permission via bucket policy.`,
    standards: ["CIS", "SOC2", "PCI", "NIST"]
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
    suggestion: `Add \`aws_s3_bucket_public_access_block\` with all four \`block_*\` attributes set to \`true\`. Only disable selectively for buckets serving public static content.`,
    standards: ["CIS", "SOC2", "PCI", "HIPAA"]
  },

  // ── ElastiCache rules ────────────────────────────────────────────────────
  {
    id: "elasticache_no_encryption_rest",
    level: "critical",
    title: "ElastiCache at-rest encryption disabled",
    applies: (n) => n.type === "elasticache",
    check: (n) => !n.data?.config?.at_rest_encryption_enabled,
    message: (n) => `${n.data?.label || n.id} does not have at-rest encryption enabled.`,
    fix: "Enable At-Rest Encryption in the component config.",
    suggestion: `Set \`at_rest_encryption_enabled = true\` on \`aws_elasticache_replication_group\`. Must be set at creation — spin up a new cluster and migrate if already running.`,
    standards: ["CIS", "SOC2", "PCI", "HIPAA", "NIST"],
    canAcknowledge: false,
  },
  {
    id: "elasticache_no_encryption_transit",
    level: "critical",
    title: "ElastiCache in-transit encryption disabled",
    applies: (n) => n.type === "elasticache",
    check: (n) => (n.data?.config?.transit_encryption_mode || "preferred") === "disabled",
    message: (n) => `${n.data?.label || n.id} has In-Transit Encryption set to disabled.`,
    fix: "Set In-Transit Encryption to required in the component config.",
    suggestion: `Set \`transit_encryption_mode = "required"\` on \`aws_elasticache_replication_group\`. When transit encryption is enabled, clients must connect via TLS and an auth token is required.`,
    standards: ["PCI", "HIPAA", "NIST"],
    canAcknowledge: false,
  },
  {
    id: "elasticache_no_auth",
    level: "warning",
    title: "ElastiCache Redis AUTH token not set",
    applies: (n) => n.type === "elasticache",
    check: (n) => (n.data?.config?.engine || "redis") === "redis" && !n.data?.config?.auth_token,
    message: (n) => `${n.data?.label || n.id} (Redis) has no AUTH token configured.`,
    fix: "Set an AUTH Token in the component config to require password authentication.",
    suggestion: `Set \`auth_token = var.elasticache_auth_token\` on \`aws_elasticache_replication_group\`. Store the token in AWS Secrets Manager and reference it via data source.`,
    standards: ["PCI"],
    canAcknowledge: true,
  },
  {
    id: "elasticache_no_backup",
    level: "warning",
    title: "ElastiCache snapshot retention disabled",
    applies: (n) => n.type === "elasticache",
    check: (n) => (Number(n.data?.config?.snapshot_retention_limit) || 0) < 1,
    message: (n) => `${n.data?.label || n.id} has snapshot retention set to 0. No backups will be created.`,
    fix: "Set Snapshot Retention to 1 or more days in the component config.",
    suggestion: `Set \`snapshot_retention_limit = 1\` (minimum) on \`aws_elasticache_replication_group\`. For production, 7+ days is recommended. Snapshots are stored in S3.`,
    standards: ["SOC2", "HIPAA", "NIST"],
    canAcknowledge: true,
  },
  // ── SQS rules ────────────────────────────────────────────────────────────
  {
    id: "sqs_no_encryption",
    level: "warning",
    title: "SQS queue not encrypted",
    applies: (n) => n.type === "sqs",
    check: (n) => !n.data?.config?.sqs_managed_sse_enabled && !n.data?.config?.kms_master_key_id,
    message: (n) => `${n.data?.label || n.id} has no server-side encryption configured.`,
    fix: "Enable SQS-Managed SSE or set a KMS Key ID in the component config.",
    suggestion: `Set \`sqs_managed_sse_enabled = true\` on \`aws_sqs_queue\` for free SSE-SQS, or set \`kms_master_key_id = aws_kms_key.sqs.arn\` for customer-managed key control.`,
    standards: ["CIS", "HIPAA"],
    canAcknowledge: true,
  },
  {
    id: "sqs_no_dlq",
    level: "warning",
    title: "SQS queue has no dead-letter queue",
    applies: (n) => n.type === "sqs",
    check: (n) => (Number(n.data?.config?.redrive_max_receive_count) || 0) < 1,
    message: (n) => `${n.data?.label || n.id} has no dead-letter queue configured. Failed messages will be lost.`,
    fix: "Set Dead Letter Max Receive Count > 0 and configure a DLQ target.",
    suggestion: `Create an \`aws_sqs_queue\` for dead-letter messages. Set \`redrive_policy = jsonencode({ deadLetterTargetArn = aws_sqs_queue.dlq.arn maxReceiveCount = 3 })\` on the source queue.`,
    standards: ["SOC2", "NIST"],
    canAcknowledge: true,
  },
  // ── SNS rules ────────────────────────────────────────────────────────────
  {
    id: "sns_no_encryption",
    level: "warning",
    title: "SNS topic not encrypted",
    applies: (n) => n.type === "sns",
    check: (n) => !n.data?.config?.kms_master_key_id,
    message: (n) => `${n.data?.label || n.id} has no KMS key configured for at-rest encryption.`,
    fix: "Set a KMS Key ID in the component config.",
    suggestion: `Set \`kms_master_key_id = aws_kms_key.sns.arn\` on \`aws_sns_topic\`. Use the managed \`alias/aws/sns\` key for zero-config encryption.`,
    standards: ["CIS", "HIPAA"],
    canAcknowledge: true,
  },
  // ── CloudFront rules ──────────────────────────────────────────────────────
  {
    id: "cloudfront_no_https",
    level: "critical",
    title: "CloudFront allows unencrypted HTTP traffic",
    applies: (n) => n.type === "cloudfront",
    check: (n) => (n.data?.config?.viewer_protocol_policy || "redirect-to-https") === "allow-all",
    message: (n) => `${n.data?.label || n.id} Viewer Protocol Policy is set to allow-all, permitting plaintext HTTP.`,
    fix: "Set Viewer Protocol Policy to redirect-to-https or https-only.",
    suggestion: `Set \`viewer_protocol_policy = "redirect-to-https"\` on \`aws_cloudfront_distribution\` default_cache_behavior and all ordered_cache_behaviors. Pair with an ACM certificate in \`us-east-1\`.`,
    standards: ["PCI"],
    canAcknowledge: false,
  },
  // ── EKS rules ────────────────────────────────────────────────────────────
  {
    id: "eks_public_endpoint",
    level: "critical",
    title: "EKS API endpoint publicly accessible",
    applies: (n) => n.type === "eks",
    check: (n) => {
      const pub = n.data?.config?.endpoint_public_access !== false;
      const cidrs = n.data?.config?.public_access_cidrs || "0.0.0.0/0";
      return pub && String(cidrs).includes("0.0.0.0/0");
    },
    message: (n) => `${n.data?.label || n.id} has a public API endpoint accessible from 0.0.0.0/0.`,
    fix: "Restrict Public Access CIDRs to known IP ranges, or disable public endpoint access.",
    suggestion: `Set \`endpoint_public_access = false\` in the \`vpc_config\` block of \`aws_eks_cluster\`, or restrict \`public_access_cidrs\` to your office/VPN CIDR. Access the API server through a bastion or VPN.`,
    standards: ["PCI", "NIST"],
    canAcknowledge: false,
  },
  {
    id: "eks_no_logging",
    level: "warning",
    title: "EKS control plane logging disabled",
    applies: (n) => n.type === "eks",
    check: (n) => !n.data?.config?.enabled_cluster_log_types && !n.data?.config?.cluster_log_types,
    message: (n) => `${n.data?.label || n.id} has no control plane log types enabled.`,
    fix: "Set Enabled Log Types to api,audit,authenticator in the component config.",
    suggestion: `Set \`enabled_cluster_log_types = ["api", "audit", "authenticator", "controllerManager", "scheduler"]\` on \`aws_eks_cluster\`. Logs are streamed to CloudWatch Logs.`,
    standards: ["PCI", "NIST"],
    canAcknowledge: true,
  },
  // ── KMS rules ────────────────────────────────────────────────────────────
  {
    id: "kms_no_rotation",
    level: "warning",
    title: "KMS key rotation disabled",
    applies: (n) => n.type === "kms_key",
    check: (n) => n.data?.config?.enable_key_rotation === false,
    message: (n) => `${n.data?.label || n.id} does not have automatic key rotation enabled.`,
    fix: "Enable Key Rotation in the component config.",
    suggestion: `Set \`enable_key_rotation = true\` on \`aws_kms_key\`. AWS rotates the backing key material annually. The key ID and ARN remain the same — no re-encryption of data is needed.`,
    standards: ["CIS", "PCI", "NIST"],
    canAcknowledge: true,
  },
  // ── CloudTrail rules ──────────────────────────────────────────────────────
  {
    id: "cloudtrail_no_encryption",
    level: "warning",
    title: "CloudTrail logs not encrypted with KMS",
    applies: (n) => n.type === "cloudtrail",
    check: (n) => !n.data?.config?.kms_key_id && !n.data?.config?.kms_key_arn,
    message: (n) => `${n.data?.label || n.id} does not have a KMS key configured for log encryption.`,
    fix: "Set kms_key_id to the ARN of a KMS key in the Terraform resource.",
    suggestion: `Set \`kms_key_id = aws_kms_key.cloudtrail.arn\` on \`aws_cloudtrail\`. Create a KMS key with a key policy allowing CloudTrail to use it for encryption.`,
    standards: ["CIS", "PCI", "HIPAA", "NIST"],
    canAcknowledge: true,
  },
  // ── Lambda rules ──────────────────────────────────────────────────────────
  {
    id: "lambda_public_access",
    level: "critical",
    title: "Lambda function URL publicly accessible without auth",
    applies: (n) => n.type === "lambda",
    check: (n) => {
      const authType = n.data?.config?.authorization_type || n.data?.config?.function_url_auth_type;
      return authType && String(authType).toUpperCase() === "NONE";
    },
    message: (n) => `${n.data?.label || n.id} has a function URL with authorization_type NONE.`,
    fix: "Set authorization_type to AWS_IAM on the aws_lambda_function_url resource.",
    suggestion: `Set \`authorization_type = "AWS_IAM"\` on \`aws_lambda_function_url\`. Grant invoke permission with \`aws_lambda_permission\` using principal-specific conditions rather than open access.`,
    standards: ["PCI", "HIPAA"],
    canAcknowledge: false,
  },
  {
    id: "lambda_no_vpc",
    level: "warning",
    title: "Lambda function not in a VPC",
    applies: (n) => n.type === "lambda",
    check: (n) => !n.data?.config?.vpc_id && !n.data?.config?.subnet_ids && !n.data?.config?.vpc_subnet_ids,
    message: (n) => `${n.data?.label || n.id} is not configured in a VPC.`,
    fix: "Add a vpc_config block referencing your VPC subnets and security groups.",
    suggestion: `Add \`vpc_config { subnet_ids = [...] security_group_ids = [...] }\` on \`aws_lambda_function\`. Ensure the Lambda execution role has \`ec2:CreateNetworkInterface\` permissions.`,
    standards: ["PCI"],
    canAcknowledge: true,
  },
  // ── EFS rules ────────────────────────────────────────────────────────────
  {
    id: "efs_no_encryption",
    level: "critical",
    title: "EFS file system not encrypted",
    applies: (n) => n.type === "efs",
    check: (n) => n.data?.config?.encrypted === false,
    message: (n) => `${n.data?.label || n.id} does not have encryption at rest enabled.`,
    fix: "Enable Encrypted in the component config.",
    suggestion: `Set \`encrypted = true\` and optionally \`kms_key_id = aws_kms_key.efs.arn\` on \`aws_efs_file_system\`. EFS encryption is set at creation and cannot be changed — create a new encrypted filesystem and migrate data.`,
    standards: ["CIS", "SOC2", "PCI", "HIPAA", "NIST"],
    canAcknowledge: false,
  },
  // ── Redshift rules ────────────────────────────────────────────────────────
  {
    id: "redshift_no_tls",
    level: "critical",
    title: "Redshift cluster does not require TLS",
    applies: (n) => n.type === "redshift",
    check: (n) => !n.data?.config?.require_ssl && !n.data?.config?.require_ssl_parameter,
    message: (n) => `${n.data?.label || n.id} does not enforce TLS for client connections.`,
    fix: "Set require_ssl = true in the Redshift parameter group.",
    suggestion: `Create an \`aws_redshift_parameter_group\` with a parameter \`require_ssl = true\`. Reference it in your \`aws_redshift_cluster\` via \`cluster_parameter_group_name\`.`,
    standards: ["CIS", "PCI", "NIST"],
    canAcknowledge: false,
  },
  // ── RDS logging rules ─────────────────────────────────────────────────────
  {
    id: "rds_no_logging",
    level: "warning",
    title: "RDS CloudWatch log exports not configured",
    applies: (n) => n.type === "rds",
    check: (n) => {
      const logs = n.data?.config?.enabled_cloudwatch_logs_exports;
      if (!logs) return true;
      const arr = Array.isArray(logs) ? logs : String(logs).split(",").filter(Boolean);
      return arr.length === 0;
    },
    message: (n) => `${n.data?.label || n.id} has no CloudWatch log exports enabled.`,
    fix: "Set enabled_cloudwatch_logs_exports to include error, general, and slowquery.",
    suggestion: `Set \`enabled_cloudwatch_logs_exports = ["error", "general", "slowquery"]\` on \`aws_db_instance\` (MySQL/MariaDB) or \`["postgresql", "upgrade"]\` for PostgreSQL. Logs appear in CloudWatch Log Groups.`,
    standards: ["CIS", "PCI", "HIPAA", "NIST"],
    canAcknowledge: true,
  },
  // ── Secrets Manager rules ─────────────────────────────────────────────────
  {
    id: "secrets_no_rotation",
    level: "warning",
    title: "Secrets Manager secret rotation disabled",
    applies: (n) => n.type === "secretsmanager",
    check: (n) => !n.data?.config?.rotation_enabled,
    message: (n) => `${n.data?.label || n.id} does not have automatic rotation enabled.`,
    fix: "Enable Rotation and configure a rotation Lambda in the component config.",
    suggestion: `Set \`rotation_rules { automatically_after_days = 30 }\` and \`rotation_lambda_arn = aws_lambda_function.rotator.arn\` on \`aws_secretsmanager_secret\`. AWS provides rotation Lambda blueprints for RDS, Redshift, and DocumentDB.`,
    standards: ["PCI", "HIPAA", "NIST"],
    canAcknowledge: true,
  },
  // ── S3 SSL policy ─────────────────────────────────────────────────────────
  {
    id: "s3_no_ssl_policy",
    level: "warning",
    title: "S3 bucket policy may allow non-SSL access",
    applies: (n) => n.type === "s3",
    check: (n) => !n.data?.config?.block_public_policy,
    message: (n) => `${n.data?.label || n.id} has Block Public Policy disabled. An aws:SecureTransport deny policy is recommended.`,
    fix: "Enable Block Public Policy and add a bucket policy denying requests where aws:SecureTransport is false.",
    suggestion: `Add an \`aws_s3_bucket_policy\` with a Deny statement on \`s3:*\` when \`aws:SecureTransport = false\`. This forces all S3 API calls over TLS and rejects unsigned requests.`,
    standards: ["CIS", "SOC2", "PCI", "HIPAA"],
    canAcknowledge: true,
  },
  // ── Subnet rules ──────────────────────────────────────────────────────────
  {
    id: "subnet_auto_public_ip",
    level: "warning",
    title: "Subnet auto-assigns public IP on launch",
    applies: (n) => n.type === "subnet",
    check: (n) => !!n.data?.config?.map_public_ip_on_launch,
    message: (n) => `${n.data?.label || n.id} has map_public_ip_on_launch enabled. Instances receive public IPs automatically.`,
    fix: "Disable Auto-assign Public IP unless this subnet is intentionally a public DMZ.",
    suggestion: `Set \`map_public_ip_on_launch = false\` on \`aws_subnet\`. Instances that need public IPs in this subnet should use Elastic IPs (\`aws_eip\`) assigned explicitly rather than auto-assigned.`,
    standards: ["PCI", "HIPAA"],
    canAcknowledge: true,
  },
  // ── CIS / SOC2 / PCI — Additional compliance rules ──────────────────────────

  // CIS 2.1.2 / S3.20 — MFA delete not enabled on versioned S3 bucket
  {
    id: "cis_s3_mfa_delete",
    level: "warning",
    title: "S3 MFA delete not enabled",
    applies: (n) => n.type === "s3",
    check: (n) => !!n.data?.config?.versioning && !n.data?.config?.mfa_delete,
    message: (n) =>
      `${n.data?.label || n.id} has versioning enabled but MFA delete is not configured. Versioned objects can be permanently deleted without MFA.`,
    fix: "Enable MFA Delete on the S3 bucket via the AWS CLI with root account credentials.",
    suggestion: `Enable MFA delete via CLI: \`aws s3api put-bucket-versioning --bucket BUCKET --versioning-configuration MFADelete=Enabled,Status=Enabled --mfa "arn:aws:iam::ACCOUNT:mfa/root-account-mfa-device TOTP_CODE"\`. In Terraform, set \`mfa_delete = "Enabled"\` inside the \`versioning\` block of \`aws_s3_bucket\`. Requires the root account — cannot be done via assumed roles.`,
    standards: ["CIS"],
    canAcknowledge: true,
  },

  // CIS 2.3.2 / RDS.13 — RDS auto minor version upgrade disabled
  {
    id: "cis_rds_auto_minor_upgrade",
    level: "info",
    title: "RDS auto minor version upgrade disabled",
    applies: (n) => ["rds", "aurora"].includes(n.type),
    check: (n) => n.data?.config?.auto_minor_version_upgrade === false,
    message: (n) =>
      `${n.data?.label || n.id} has auto minor version upgrades disabled. Minor patches include security fixes.`,
    fix: "Enable Auto Minor Version Upgrade in the component config.",
    suggestion: `Set \`auto_minor_version_upgrade = true\` on \`aws_db_instance\` or \`aws_rds_cluster\`. Use \`maintenance_window = "sun:05:00-sun:06:00"\` to control when the upgrade is applied. Minor upgrades include CVE patches — disabling them creates a manual patching burden.`,
    standards: ["CIS", "PCI", "NIST"],
    canAcknowledge: true,
  },

  // CIS 3.1 — CloudTrail not multi-region
  {
    id: "cis_cloudtrail_multi_region",
    level: "warning",
    title: "CloudTrail not configured for all regions",
    applies: (n) => n.type === "cloudtrail",
    check: (n) => !n.data?.config?.is_multi_region_trail,
    message: (n) =>
      `${n.data?.label || n.id} is not a multi-region trail. API events in other regions (including global services like IAM and STS) will not be captured.`,
    fix: "Enable Is Multi-Region Trail in the component config.",
    suggestion: `Set \`is_multi_region_trail = true\` on \`aws_cloudtrail\`. Multi-region trails capture management events across all regions and include global service events (IAM, STS, CloudFront). Pair with \`include_global_service_events = true\`.`,
    standards: ["CIS", "PCI", "SOC2"],
    canAcknowledge: false,
  },

  // CIS 3.2 / CloudTrail.4 — Log file validation disabled
  {
    id: "cis_cloudtrail_log_validation",
    level: "warning",
    title: "CloudTrail log file validation disabled",
    applies: (n) => n.type === "cloudtrail",
    check: (n) => !n.data?.config?.enable_log_file_validation,
    message: (n) =>
      `${n.data?.label || n.id} does not have log file validation enabled. Tampered or deleted logs cannot be detected.`,
    fix: "Enable Log File Validation in the component config.",
    suggestion: `Set \`enable_log_file_validation = true\` on \`aws_cloudtrail\`. This creates a signed SHA-256 digest file every hour in S3. Verify integrity with: \`aws cloudtrail validate-logs --trail-arn <ARN> --start-time <ISO8601>\`.`,
    standards: ["CIS", "PCI", "HIPAA", "SOC2"],
    canAcknowledge: false,
  },

  // CIS / SOC2 / PCI — GuardDuty disabled
  {
    id: "guardduty_detector_disabled",
    level: "warning",
    title: "GuardDuty detector disabled",
    applies: (n) => n.type === "guardduty",
    check: (n) => n.data?.config?.enable === false,
    message: (n) =>
      `${n.data?.label || n.id} has GuardDuty set to disabled. Threat detection is inactive.`,
    fix: "Set enable = true on the GuardDuty detector in the component config.",
    suggestion: `Set \`enable = true\` on \`aws_guardduty_detector\`. Enable optional protection plans: \`malware_protection\`, \`s3_logs\`, \`kubernetes { audit_logs }\`, and \`runtime_monitoring\` for complete coverage.`,
    standards: ["CIS", "SOC2", "PCI"],
    canAcknowledge: false,
  },

  // SOC2 / PCI — WAF logging not configured
  {
    id: "waf_no_logging",
    level: "warning",
    title: "WAF logging not configured",
    applies: (n) => n.type === "waf",
    check: (n) =>
      !n.data?.config?.logging_configuration &&
      !n.data?.config?.log_destination_configs,
    message: (n) =>
      `${n.data?.label || n.id} has no logging configured. WAF request logs are required for incident response and compliance auditing.`,
    fix: "Enable WAF Logging pointing to a Kinesis Firehose or S3 bucket.",
    suggestion: `Add \`aws_wafv2_web_acl_logging_configuration\` with \`resource_arn = aws_wafv2_web_acl.main.arn\` and \`log_destination_configs = [aws_kinesis_firehose_delivery_stream.waf.arn]\`. PCI DSS Req 10.2 requires logging all access to components in the cardholder data environment.`,
    standards: ["SOC2", "PCI"],
    canAcknowledge: true,
  },

  // SOC2 / PCI — Macie disabled
  {
    id: "macie_disabled",
    level: "info",
    title: "Macie disabled",
    applies: (n) => n.type === "macie",
    check: (n) => n.data?.config?.status === "PAUSED" || n.data?.config?.enabled === false,
    message: (n) =>
      `${n.data?.label || n.id} has Macie disabled. Sensitive data discovery in S3 is inactive.`,
    fix: "Enable Macie in the component config.",
    suggestion: `Set \`status = "ENABLED"\` on \`aws_macie2_account\`. Macie classifies S3 objects for PII, PHI, and financial data using ML. Enable automated sensitive data discovery for continuous scanning rather than one-time jobs.`,
    standards: ["SOC2", "PCI", "HIPAA"],
    canAcknowledge: true,
  },

  // PCI / HIPAA — S3 bucket allows public ACL reads
  {
    id: "s3_public_acl",
    level: "critical",
    title: "S3 bucket ACL allows public read",
    applies: (n) => n.type === "s3",
    check: (n) => {
      const acl = (n.data?.config?.acl || "").toLowerCase();
      return acl === "public-read" || acl === "public-read-write";
    },
    message: (n) =>
      `${n.data?.label || n.id} has ACL set to "${n.data?.config?.acl}". All objects in this bucket are publicly readable.`,
    fix: "Set ACL to private and use bucket policies to grant specific access.",
    suggestion: `Set \`acl = "private"\` on \`aws_s3_bucket\` (deprecated) or use \`aws_s3_bucket_ownership_controls\` with \`object_ownership = "BucketOwnerEnforced"\` to disable ACLs entirely. Grant access via \`aws_s3_bucket_policy\` instead.`,
    standards: ["CIS", "SOC2", "PCI", "HIPAA"],
    canAcknowledge: false,
  },


  // ── NIST SP 800-53 Rev 5 — Additional rules ─────────────────────────────────

  // NIST AU-2 / AU-3 — S3 bucket server access logging disabled
  {
    id: "nist_s3_access_logging",
    level: "warning",
    title: "S3 bucket server access logging disabled",
    applies: (n) => n.type === "s3",
    check: (n) =>
      !n.data?.config?.access_logging_enabled &&
      !n.data?.config?.logging,
    message: (n) =>
      `${n.data?.label || n.id} does not have server access logging enabled. S3 API requests are not being audited.`,
    fix: "Enable server access logging in the component config and specify a target bucket.",
    suggestion: `Add \`aws_s3_bucket_logging\` with \`target_bucket\` pointing to a dedicated logs bucket. NIST AU-2 requires auditing of read/write access to system objects. S3 access logs capture requester, operation, response code, and bytes transferred.`,
    standards: ["NIST", "SOC2"],
    canAcknowledge: true,
  },

  // NIST IA-2 / IA-5 — RDS IAM database authentication not enabled
  {
    id: "nist_rds_iam_auth",
    level: "info",
    title: "RDS IAM database authentication not enabled",
    applies: (n) => ["rds", "aurora"].includes(n.type),
    check: (n) => !n.data?.config?.iam_database_authentication_enabled,
    message: (n) =>
      `${n.data?.label || n.id} does not have IAM database authentication enabled. Password-based access is the only authentication method.`,
    fix: "Enable IAM Database Authentication in the component config.",
    suggestion: `Set \`iam_database_authentication_enabled = true\` on \`aws_db_instance\` or \`aws_rds_cluster\`. Applications authenticate with a short-lived IAM token (15-minute TTL) instead of a long-lived password. Requires the IAM user/role to have \`rds-db:connect\` permission on the specific database resource ARN.`,
    standards: ["NIST"],
    canAcknowledge: true,
  },

  // NIST SC-28 — Lambda env vars not encrypted with KMS
  {
    id: "nist_lambda_env_encryption",
    level: "warning",
    title: "Lambda environment variables not encrypted with KMS",
    applies: (n) => n.type === "lambda",
    check: (n) =>
      n.data?.config?.environment_variables &&
      !n.data?.config?.kms_key_arn,
    message: (n) =>
      `${n.data?.label || n.id} has environment variables but no KMS key for encryption at rest.`,
    fix: "Set a KMS Key ARN in the component config to encrypt Lambda environment variables.",
    suggestion: `Set \`kms_key_arn = aws_kms_key.lambda.arn\` on \`aws_lambda_function\`. Without a CMK, Lambda uses AWS-managed SSE-S3 encryption for env vars — sufficient for most cases. A CMK is required when env vars contain credentials or PII and you need key rotation control and CloudTrail visibility on decrypt operations.`,
    standards: ["NIST", "PCI", "HIPAA"],
    canAcknowledge: true,
  },

  // NIST SI-4 — EC2 detailed monitoring disabled
  {
    id: "nist_ec2_detailed_monitoring",
    level: "info",
    title: "EC2 detailed monitoring disabled",
    applies: (n) => n.type === "ec2",
    check: (n) => !n.data?.config?.monitoring,
    message: (n) =>
      `${n.data?.label || n.id} has detailed CloudWatch monitoring disabled. Metrics are sampled every 5 minutes instead of every 1 minute.`,
    fix: "Enable Monitoring (Detailed) in the component config.",
    suggestion: `Set \`monitoring = true\` on \`aws_instance\`. Detailed monitoring provides 1-minute metric granularity (vs 5-minute basic). Required for Auto Scaling policies that need fast response. NIST SI-4 requires monitoring at a level sufficient to detect attacks — 5-minute gaps can miss short burst events.`,
    standards: ["NIST"],
    canAcknowledge: true,
  },

  // NIST SC-8 / IA-5 — RDS without SSL/TLS enforcement via parameter group
  {
    id: "nist_rds_no_ssl",
    level: "warning",
    title: "RDS instance does not enforce SSL connections",
    applies: (n) => n.type === "rds",
    check: (n) =>
      !n.data?.config?.require_ssl &&
      !n.data?.config?.ssl_enforcement &&
      !n.data?.config?.parameter_group_name,
    message: (n) =>
      `${n.data?.label || n.id} has no SSL enforcement configured. Database connections may be unencrypted in transit.`,
    fix: "Create an RDS parameter group with rds.force_ssl=1 (PostgreSQL) or require_secure_transport=ON (MySQL).",
    suggestion: `Create \`aws_db_parameter_group\` with \`rds.force_ssl = 1\` (PostgreSQL) or \`require_secure_transport = ON\` (MySQL). Reference it via \`parameter_group_name\` on \`aws_db_instance\`. Without this, clients can connect unencrypted even if the application happens to use SSL.`,
    standards: ["NIST", "PCI", "HIPAA"],
    canAcknowledge: true,
  },



  // ── Lambda: deprecated/EOL runtime ──────────────────────────────────────────
  // CIS Lambda 2.1, AWS Foundational Security Best Practices Lambda.2
  {
    id: "lambda_deprecated_runtime",
    level: "critical",
    title: "Lambda function uses a deprecated runtime",
    applies: (n) => n.type === "lambda",
    check: (n) => {
      const rt = n.data?.config?.runtime || "";
      const deprecated = [
        "nodejs", "nodejs4.3", "nodejs6.10", "nodejs8.10", "nodejs10.x",
        "nodejs12.x", "nodejs14.x", "nodejs16.x",
        "python2.7", "python3.6", "python3.7", "python3.8",
        "dotnetcore1.0", "dotnetcore2.0", "dotnetcore2.1", "dotnetcore3.1",
        "java8", "ruby2.5", "ruby2.7",
        "provided",
      ];
      return rt.length > 0 && deprecated.includes(rt);
    },
    message: (n) =>
      `${n.data?.label || n.id} uses runtime "${n.data?.config?.runtime}", which is deprecated or end-of-life. AWS will block invocations after the retirement date.`,
    fix: "Update the runtime to a supported version (e.g. python3.12, nodejs22.x, java21).",
    suggestion: `Update \`runtime\` to a currently supported value: \`python3.12\`, \`nodejs22.x\`, \`java21\`, \`dotnet8\`, or \`provided.al2023\`. Deprecated runtimes no longer receive security patches — vulnerabilities discovered after EOL remain permanently unpatched. AWS eventually blocks new deployments and then invocations on retired runtimes.`,
    canAcknowledge: false,
    standards: ["CIS", "SOC2", "PCI", "NIST"],
  },

  // ── Lambda: no reserved concurrency (DoS / runaway cost risk) ──────────────
  {
    id: "lambda_no_reserved_concurrency",
    level: "info",
    title: "Lambda function has no reserved concurrency limit",
    applies: (n) => n.type === "lambda",
    check: (n) =>
      n.data?.config?.reserved_concurrent_executions === undefined ||
      n.data?.config?.reserved_concurrent_executions === null ||
      n.data?.config?.reserved_concurrent_executions === "",
    message: (n) =>
      `${n.data?.label || n.id} has no reserved concurrency. A traffic spike or misconfigured event source can exhaust the account-level concurrency pool, throttling all Lambda functions.`,
    fix: "Set Reserved Concurrency in the component config to cap this function's maximum parallel executions.",
    suggestion: `Set \`reserved_concurrent_executions\` on \`aws_lambda_function\` to an appropriate value for your workload. This prevents a single runaway function from consuming the entire regional concurrency limit (default 1,000). Setting it to 0 effectively disables the function — useful for emergency shutoff.`,
    canAcknowledge: true,
    standards: ["NIST"],
  },

  // ── EC2: IMDSv2 not required ─────────────────────────────────────────────
  // Already covered by ec2_imdsv2_optional — skip duplicate

  // ── EC2: no IAM instance profile ─────────────────────────────────────────
  // CIS EC2 1.4 — instances should use IAM roles rather than long-lived credentials
  {
    id: "ec2_no_iam_profile",
    level: "warning",
    title: "EC2 instance has no IAM instance profile",
    applies: (n) => n.type === "ec2",
    check: (n) =>
      !n.data?.iam_role_id &&
      !n.data?.config?.iam_instance_profile,
    message: (n) =>
      `${n.data?.label || n.id} has no IAM instance profile attached. Applications on this instance cannot assume AWS API permissions without embedding long-lived access keys.`,
    fix: "Attach an IAM Role to this EC2 instance via the Config panel, or connect an iam_role node.",
    suggestion: `Create \`aws_iam_instance_profile\` referencing an \`aws_iam_role\`, then set \`iam_instance_profile\` on \`aws_instance\`. Applications can then use the instance metadata service to obtain temporary credentials — no hard-coded keys needed. CIS EC2 1.4 requires all EC2 instances to use IAM roles for AWS API access.`,
    canAcknowledge: false,
    standards: ["CIS", "SOC2", "NIST"],
  },

  // ── ECS: privileged container ─────────────────────────────────────────────
  // CIS ECS 5.4 — containers should not run in privileged mode
  {
    id: "ecs_privileged_container",
    level: "critical",
    title: "ECS task definition allows privileged container execution",
    applies: (n) => n.type === "ecs_fargate",
    check: (n) => !!n.data?.config?.privileged,
    message: (n) =>
      `${n.data?.label || n.id} has privileged mode enabled. A privileged container has full root access to the host kernel and devices — a container escape is a full host compromise.`,
    fix: "Disable privileged mode in the ECS task definition config unless absolutely required.",
    suggestion: `Remove \`privileged = true\` from the container definition in \`aws_ecs_task_definition\`. If the workload genuinely needs elevated capabilities, use \`linuxParameters.capabilities.add\` to grant only the specific Linux capabilities required (e.g. NET_ADMIN) instead of full privilege escalation. Privileged mode is incompatible with Fargate.`,
    canAcknowledge: false,
    standards: ["CIS", "SOC2", "PCI", "NIST"],
  },

  // ── ECS: no read-only root filesystem ────────────────────────────────────
  {
    id: "ecs_no_readonly_root_fs",
    level: "warning",
    title: "ECS container does not use a read-only root filesystem",
    applies: (n) => n.type === "ecs_fargate",
    check: (n) => !n.data?.config?.readonly_root_filesystem,
    message: (n) =>
      `${n.data?.label || n.id} has a writable root filesystem. Malicious code executing inside the container can modify system binaries and persist state.`,
    fix: "Enable readonlyRootFilesystem in the container definition config.",
    suggestion: `Set \`readonly_root_filesystem = true\` in the container definition of \`aws_ecs_task_definition\`. Mount writable paths explicitly via \`mountPoints\` referencing EFS, EBS, or tmpfs volumes. This prevents fileless malware and supply-chain attack payloads from writing to the container's filesystem.`,
    canAcknowledge: true,
    standards: ["CIS", "SOC2", "NIST"],
  },

  // ── EKS: cluster secrets not encrypted with KMS ───────────────────────────
  // CIS EKS 5.3.1 — secrets should be encrypted with a CMK
  {
    id: "eks_secrets_not_encrypted",
    level: "critical",
    title: "EKS cluster does not encrypt Kubernetes Secrets with KMS",
    applies: (n) => n.type === "eks",
    check: (n) =>
      !n.data?.config?.encryption_config &&
      !n.data?.config?.secrets_encryption_key,
    message: (n) =>
      `${n.data?.label || n.id} does not encrypt Kubernetes Secrets at rest with a KMS CMK. Secrets (API keys, passwords, tokens) stored in etcd are protected only by the default AWS-managed key.`,
    fix: "Configure an encryption_config block on the EKS cluster specifying a KMS key for secrets.",
    suggestion: `Add an \`encryption_config\` block to \`aws_eks_cluster\`:\n\`\`\`hcl\nencryption_config {\n  resources = ["secrets"]\n  provider {\n    key_arn = aws_kms_key.eks.arn\n  }\n}\n\`\`\`\nCIS EKS 5.3.1 requires envelope encryption of etcd secrets. Without it, anyone with access to the etcd backup (or the underlying EBS snapshot) can read all cluster secrets in plaintext.`,
    canAcknowledge: false,
    standards: ["CIS", "SOC2", "PCI", "HIPAA", "NIST"],
  },

  // ── EKS: outdated Kubernetes version ─────────────────────────────────────
  {
    id: "eks_old_version",
    level: "warning",
    title: "EKS cluster is running an outdated Kubernetes version",
    applies: (n) => n.type === "eks",
    check: (n) => {
      const ver = parseFloat(n.data?.config?.kubernetes_version || n.data?.config?.version || "0");
      return ver > 0 && ver < 1.29;
    },
    message: (n) =>
      `${n.data?.label || n.id} specifies Kubernetes version ${n.data?.config?.kubernetes_version || n.data?.config?.version}, which is approaching or past end-of-support. Unsupported versions no longer receive security patches.`,
    fix: "Upgrade the EKS cluster to Kubernetes 1.29 or later.",
    suggestion: `Set \`version = "1.30"\` (or the current latest) on \`aws_eks_cluster\`. EKS supports a version for approximately 14 months after release. Plan upgrades during that window — AWS will auto-upgrade clusters on deprecated versions with no advance notice after the support window closes.`,
    canAcknowledge: true,
    standards: ["CIS", "SOC2", "NIST"],
  },

  // ── OpenSearch: domain not in VPC (public endpoint) ──────────────────────
  // AWS FSBP OpenSearch.1 — domains should be in VPC
  {
    id: "opensearch_public_endpoint",
    level: "critical",
    title: "OpenSearch domain has a public endpoint",
    applies: (n) => n.type === "opensearch",
    check: (n) =>
      !n.data?.config?.vpc_options &&
      !n.data?.config?.vpc_id &&
      !n.data?.subnet_id,
    message: (n) =>
      `${n.data?.label || n.id} is not deployed in a VPC. The OpenSearch endpoint is reachable from the public internet, relying solely on access policy and auth controls.`,
    fix: "Configure VPC options on the OpenSearch domain and place it in private subnets.",
    suggestion: `Add a \`vpc_options\` block to \`aws_opensearch_domain\` with \`subnet_ids\` and \`security_group_ids\`. VPC deployment eliminates the public endpoint entirely — access is only possible from within the VPC or via VPN. AWS FSBP OpenSearch.1 requires VPC deployment for all domains.`,
    canAcknowledge: false,
    standards: ["CIS", "SOC2", "PCI", "HIPAA", "NIST"],
  },

  // ── OpenSearch: no encryption at rest ────────────────────────────────────
  {
    id: "opensearch_no_encryption_at_rest",
    level: "critical",
    title: "OpenSearch domain is not encrypted at rest",
    applies: (n) => n.type === "opensearch",
    check: (n) =>
      !n.data?.config?.encrypt_at_rest &&
      n.data?.config?.encrypt_at_rest !== true,
    message: (n) =>
      `${n.data?.label || n.id} does not have encryption at rest enabled. Index data, automated snapshots, and swap files are stored unencrypted on EBS.`,
    fix: "Enable Encrypt at Rest in the OpenSearch domain config.",
    suggestion: `Set \`encrypt_at_rest { enabled = true }\` on \`aws_opensearch_domain\`. Optionally specify \`kms_key_id\` to use a CMK. Note: encryption at rest cannot be enabled on an existing domain without replacement — plan this at cluster creation time.`,
    canAcknowledge: false,
    standards: ["CIS", "SOC2", "PCI", "HIPAA", "NIST"],
  },

  // ── OpenSearch: no node-to-node encryption ───────────────────────────────
  {
    id: "opensearch_no_node_to_node",
    level: "critical",
    title: "OpenSearch domain does not encrypt node-to-node traffic",
    applies: (n) => n.type === "opensearch",
    check: (n) =>
      !n.data?.config?.node_to_node_encryption &&
      n.data?.config?.node_to_node_encryption !== true,
    message: (n) =>
      `${n.data?.label || n.id} has node-to-node encryption disabled. Traffic between data nodes within the cluster is unencrypted and can be intercepted by a privileged network actor.`,
    fix: "Enable Node-to-Node Encryption in the OpenSearch domain config.",
    suggestion: `Set \`node_to_node_encryption { enabled = true }\` on \`aws_opensearch_domain\`. Like encryption at rest, this cannot be enabled on a running cluster without blue-green replacement. Combined with VPC deployment and encryption at rest, this satisfies HIPAA §164.312(e)(2)(ii) transmission security requirements.`,
    canAcknowledge: false,
    standards: ["SOC2", "PCI", "HIPAA", "NIST"],
  },

  // ── Cognito: no MFA ───────────────────────────────────────────────────────
  // CIS Cognito 2.1 — user pools should require MFA
  {
    id: "cognito_no_mfa",
    level: "critical",
    title: "Cognito user pool does not require MFA",
    applies: (n) => n.type === "cognito",
    check: (n) => {
      const mfa = n.data?.config?.mfa_configuration || "";
      return mfa === "" || mfa === "OFF";
    },
    message: (n) =>
      `${n.data?.label || n.id} has MFA set to OFF. Accounts are protected only by password and are vulnerable to credential stuffing, phishing, and brute-force attacks.`,
    fix: "Set MFA Configuration to OPTIONAL or ON in the Cognito user pool config.",
    suggestion: `Set \`mfa_configuration = "ON"\` (mandatory) or \`"OPTIONAL"\` on \`aws_cognito_user_pool\`. Configure \`software_token_mfa_configuration { enabled = true }\` for TOTP-based MFA. For SMS-based MFA add \`sms_configuration\` with an SNS IAM role. PCI DSS Req 8.3 and CIS IAM 1.10 require MFA for all user accounts accessing cardholder data environments.`,
    canAcknowledge: false,
    standards: ["CIS", "SOC2", "PCI", "HIPAA", "NIST"],
  },

  // ── Cognito: weak password policy ─────────────────────────────────────────
  {
    id: "cognito_weak_password_policy",
    level: "warning",
    title: "Cognito user pool has no or weak password policy",
    applies: (n) => n.type === "cognito",
    check: (n) => {
      const pw = n.data?.config?.password_policy;
      if (!pw) return true;
      const minLen = parseInt(pw.minimum_length || pw.min_length || "0", 10);
      return minLen < 12 ||
        !pw.require_uppercase ||
        !pw.require_lowercase ||
        !pw.require_numbers;
    },
    message: (n) =>
      `${n.data?.label || n.id} has a weak or unconfigured password policy. Short or simple passwords significantly reduce brute-force resistance.`,
    fix: "Configure a password policy requiring minimum 12 characters with upper, lower, numbers, and symbols.",
    suggestion: `Add \`password_policy\` to \`aws_cognito_user_pool\` with \`minimum_length = 12\`, \`require_uppercase = true\`, \`require_lowercase = true\`, \`require_numbers = true\`, \`require_symbols = true\`, and \`temporary_password_validity_days = 1\`. NIST SP 800-63B recommends minimum 8 characters; most enterprise frameworks require 12+.`,
    canAcknowledge: true,
    standards: ["CIS", "SOC2", "NIST"],
  },

  // ── Cognito: advanced security off ────────────────────────────────────────
  {
    id: "cognito_advanced_security_off",
    level: "warning",
    title: "Cognito advanced security (adaptive authentication) is disabled",
    applies: (n) => n.type === "cognito",
    check: (n) => {
      const mode = n.data?.config?.user_pool_add_ons?.advanced_security_mode ||
        n.data?.config?.advanced_security_mode || "";
      return mode !== "ENFORCED" && mode !== "AUDIT";
    },
    message: (n) =>
      `${n.data?.label || n.id} does not have advanced security mode enabled. Cognito will not detect compromised credentials, suspicious sign-in attempts, or account takeover patterns.`,
    fix: "Enable User Pool Add-Ons > Advanced Security Mode = ENFORCED in the config.",
    suggestion: `Add \`user_pool_add_ons { advanced_security_mode = "ENFORCED" }\` to \`aws_cognito_user_pool\`. This enables adaptive authentication (automatic risk scoring per sign-in), compromised credential detection, and account takeover protection. Start with \`"AUDIT"\` to observe before enforcing blocks.`,
    canAcknowledge: true,
    standards: ["SOC2", "NIST"],
  },

  // ── API Gateway: no authorization ─────────────────────────────────────────
  // AWS FSBP APIGateway.1 — REST APIs should have authorization enabled
  {
    id: "apigw_no_auth",
    level: "critical",
    title: "API Gateway endpoint has no authorization configured",
    applies: (n) => n.type === "api_gateway",
    check: (n) => {
      const auth = n.data?.config?.authorization_type ||
        n.data?.config?.authorizer_type ||
        n.data?.config?.default_authorizer || "";
      return !auth || auth === "NONE";
    },
    message: (n) =>
      `${n.data?.label || n.id} has no authorization type configured. The API is publicly accessible without any authentication or authorization controls.`,
    fix: "Configure an authorizer (JWT, Lambda, IAM, or Cognito) in the API Gateway config.",
    suggestion: `Set \`authorization_type\` on your API methods: \`"JWT"\` for API Gateway v2 with Cognito or an OIDC provider, \`"AWS_IAM"\` for service-to-service auth, or \`"CUSTOM"\` for Lambda authorizers. Add \`aws_apigatewayv2_authorizer\` pointing to your Cognito user pool or Lambda function. Unauthenticated APIs are a top-10 OWASP API Security risk (API1:2023 — Broken Object Level Authorization starts with unauthenticated access).`,
    canAcknowledge: false,
    standards: ["CIS", "SOC2", "PCI", "NIST"],
  },

  // ── API Gateway: no access logging ────────────────────────────────────────
  {
    id: "apigw_no_access_logging",
    level: "warning",
    title: "API Gateway stage has no access logging configured",
    applies: (n) => n.type === "api_gateway",
    check: (n) =>
      !n.data?.config?.access_log_destination_arn &&
      !n.data?.config?.access_log_settings &&
      !n.data?.config?.logging_level,
    message: (n) =>
      `${n.data?.label || n.id} has no access logging configured. API requests, source IPs, and error codes are not being captured — incident investigation and compliance reporting will be impossible.`,
    fix: "Set an Access Log Destination ARN (CloudWatch log group) in the API Gateway stage config.",
    suggestion: `Create \`aws_cloudwatch_log_group\` and set \`access_log_settings { destination_arn = aws_cloudwatch_log_group.<name>.arn }\` on the API Gateway stage. Include \`$context.requestId\`, \`$context.sourceIp\`, \`$context.identity.userAgent\`, \`$context.requestTime\`, \`$context.status\`, and \`$context.protocol\` in the log format. PCI DSS Req 10.2 requires logging of all individual access to system components.`,
    canAcknowledge: false,
    standards: ["CIS", "SOC2", "PCI", "HIPAA", "NIST"],
  },

  // ── Kinesis: no server-side encryption ────────────────────────────────────
  {
    id: "kinesis_no_encryption",
    level: "warning",
    title: "Kinesis stream is not encrypted at rest",
    applies: (n) => n.type === "kinesis",
    check: (n) => {
      const enc = n.data?.config?.encryption_type || "";
      return !enc || enc === "NONE";
    },
    message: (n) =>
      `${n.data?.label || n.id} has no server-side encryption. Data records are stored unencrypted on the stream's underlying storage.`,
    fix: "Enable server-side encryption on the Kinesis stream using KMS.",
    suggestion: `Add \`server_side_encryption { enabled = true key_id = "alias/aws/kinesis" }\` to \`aws_kinesis_stream\`, or specify a CMK ARN for \`key_id\`. Encryption adds no latency overhead and protects records at rest against unauthorized shard-level access. Required for PCI DSS, HIPAA, and SOC 2 Type II.`,
    canAcknowledge: false,
    standards: ["SOC2", "PCI", "HIPAA", "NIST"],
  },

  // ── MSK: plaintext traffic allowed ────────────────────────────────────────
  {
    id: "msk_plaintext_allowed",
    level: "critical",
    title: "MSK cluster allows unencrypted (plaintext) client connections",
    applies: (n) => n.type === "msk",
    check: (n) => {
      const enc = n.data?.config?.encryption_info;
      if (!enc) return true;
      const clientBroker = enc.encryption_in_transit?.client_broker ||
        n.data?.config?.client_broker || "";
      return !clientBroker || clientBroker === "PLAINTEXT";
    },
    message: (n) =>
      `${n.data?.label || n.id} allows plaintext connections. Kafka producer and consumer traffic is transmitted unencrypted and can be intercepted by a network-level attacker.`,
    fix: "Set client_broker to TLS in the MSK encryption configuration.",
    suggestion: `Set \`encryption_info { encryption_in_transit { client_broker = "TLS" in_cluster = true } }\` on \`aws_msk_cluster\`. Also set \`encryption_at_rest { encryption_key_arn = aws_kms_key.<name>.arn }\`. Enforcing TLS prevents man-in-the-middle attacks on Kafka topic data in transit. PLAINTEXT should never be used in production environments.`,
    canAcknowledge: false,
    standards: ["CIS", "SOC2", "PCI", "HIPAA", "NIST"],
  },

  // ── ECR: mutable image tags ────────────────────────────────────────────────
  // AWS FSBP ECR.1 — repositories should have immutable image tags
  {
    id: "ecr_image_tag_mutable",
    level: "warning",
    title: "ECR repository allows mutable image tags",
    applies: (n) => n.type === "ecr",
    check: (n) => {
      const mutability = n.data?.config?.image_tag_mutability || "";
      return !mutability || mutability === "MUTABLE";
    },
    message: (n) =>
      `${n.data?.label || n.id} has mutable image tags. An attacker with ECR push permissions can overwrite a tagged image (e.g. :latest or :v1.0) with a malicious payload, affecting any subsequent deployment.`,
    fix: "Set Image Tag Mutability to IMMUTABLE in the ECR repository config.",
    suggestion: `Set \`image_tag_mutability = "IMMUTABLE"\` on \`aws_ecr_repository\`. Immutable tags prevent tag overwriting — every new image must use a new unique tag. This enables reliable image pinning in ECS/EKS task definitions and prevents supply-chain attacks via tag hijacking. Use semantic versioning or image digests (sha256:...) for reliable references.`,
    canAcknowledge: false,
    standards: ["CIS", "SOC2", "PCI", "NIST"],
  },

  // ── ECR: no scan on push ───────────────────────────────────────────────────
  {
    id: "ecr_no_scan_on_push",
    level: "warning",
    title: "ECR repository does not scan images on push",
    applies: (n) => n.type === "ecr",
    check: (n) =>
      !n.data?.config?.image_scanning_configuration?.scan_on_push &&
      !n.data?.config?.scan_on_push,
    message: (n) =>
      `${n.data?.label || n.id} does not scan container images for vulnerabilities on push. Images with known CVEs may be deployed to production without detection.`,
    fix: "Enable Scan on Push in the ECR repository image scanning configuration.",
    suggestion: `Set \`image_scanning_configuration { scan_on_push = true }\` on \`aws_ecr_repository\`. Basic scanning uses Clair (free). Enhanced scanning uses Amazon Inspector v2 for continuous scanning including OS and language packages. Add \`aws_inspector2_enabler\` with \`resource_types = ["ECR"]\` to activate Inspector-based scanning for deeper coverage.`,
    canAcknowledge: false,
    standards: ["CIS", "SOC2", "PCI", "NIST"],
  },

  // ── Step Functions: no CloudWatch logging ─────────────────────────────────
  {
    id: "sfn_no_logging",
    level: "warning",
    title: "Step Functions state machine has no CloudWatch logging",
    applies: (n) => n.type === "step_functions",
    check: (n) =>
      !n.data?.config?.logging_configuration &&
      !n.data?.config?.log_destination,
    message: (n) =>
      `${n.data?.label || n.id} has no logging configuration. State machine executions, input/output payloads, and error details are not being captured — workflow failures and audit trails are invisible.`,
    fix: "Configure a logging_configuration block with a CloudWatch log group destination.",
    suggestion: `Add \`logging_configuration { log_destination = "\${aws_cloudwatch_log_group.<name>.arn}:*" level = "ERROR" include_execution_data = true }\` to \`aws_sfn_state_machine\`. Set \`level = "ALL"\` during development, \`"ERROR"\` in production to reduce costs. SOC 2 CC7.2 requires logging of security events — failed state transitions and error states should always be captured.`,
    canAcknowledge: false,
    standards: ["SOC2", "NIST"],
  },

  // ── Step Functions: no X-Ray tracing ──────────────────────────────────────
  {
    id: "sfn_no_xray",
    level: "info",
    title: "Step Functions state machine does not have X-Ray tracing enabled",
    applies: (n) => n.type === "step_functions",
    check: (n) =>
      !n.data?.config?.tracing_configuration?.enabled &&
      !n.data?.config?.xray_enabled,
    message: (n) =>
      `${n.data?.label || n.id} has X-Ray tracing disabled. Execution latency across state transitions and downstream AWS service calls is not instrumented.`,
    fix: "Enable X-Ray tracing in the Step Functions state machine config.",
    suggestion: `Set \`tracing_configuration { enabled = true }\` on \`aws_sfn_state_machine\`. X-Ray generates a service map showing each state's latency contribution and captures errors with full context. Especially valuable for long-running workflows with Lambda, DynamoDB, and SQS integrations.`,
    canAcknowledge: true,
    standards: ["NIST"],
  },

  // ── ALB: deletion protection disabled ─────────────────────────────────────
  {
    id: "alb_deletion_protection",
    level: "warning",
    title: "Load balancer has deletion protection disabled",
    applies: (n) => ["alb", "nlb"].includes(n.type),
    check: (n) => !n.data?.config?.enable_deletion_protection,
    message: (n) =>
      `${n.data?.label || n.id} has deletion protection disabled. The load balancer can be deleted by any IAM principal with elasticloadbalancing:DeleteLoadBalancer permission — including via a misconfigured Terraform destroy or console mistake.`,
    fix: "Enable Deletion Protection in the load balancer config.",
    suggestion: `Set \`enable_deletion_protection = true\` on \`aws_lb\`. This adds a safeguard requiring explicit disabling before deletion — preventing accidental outages from \`terraform destroy\` or console deletions in production. Pair with IAM policies restricting \`elasticloadbalancing:ModifyLoadBalancerAttributes\` to prevent easy bypass.`,
    canAcknowledge: true,
    standards: ["SOC2", "NIST"],
  },

  // ── CloudFront: outdated minimum TLS version ──────────────────────────────
  // AWS FSBP CloudFront.3 — distributions should require TLS 1.2
  {
    id: "cloudfront_min_tls_version",
    level: "warning",
    title: "CloudFront distribution allows TLS versions older than 1.2",
    applies: (n) => n.type === "cloudfront",
    check: (n) => {
      const policy = n.data?.config?.minimum_protocol_version ||
        n.data?.config?.viewer_certificate?.minimum_protocol_version || "";
      const insecure = ["SSLv3", "TLSv1", "TLSv1_2016", "TLSv1.1_2016"];
      return !policy || insecure.some((p) => policy.includes(p));
    },
    message: (n) =>
      `${n.data?.label || n.id} allows TLS 1.0 or 1.1 connections. These protocols have known vulnerabilities (POODLE, BEAST) and are prohibited by PCI DSS 3.2.1+.`,
    fix: "Set Minimum Protocol Version to TLSv1.2_2021 or TLSv1.2_2019 in the CloudFront viewer certificate config.",
    suggestion: `Set \`viewer_certificate { minimum_protocol_version = "TLSv1.2_2021" ssl_support_method = "sni-only" }\` on \`aws_cloudfront_distribution\`. \`TLSv1.2_2021\` supports TLS 1.2+ only with a strong cipher suite. \`sni-only\` avoids the dedicated IP cost. PCI DSS 4.0 Req 4.2.1 prohibits TLS 1.0 and 1.1 for transmissions of cardholder data.`,
    canAcknowledge: false,
    standards: ["CIS", "SOC2", "PCI", "NIST"],
  },

  // ── Secrets Manager: no CMK (using AWS-managed key) ──────────────────────
  {
    id: "secretsmanager_no_kms_cmk",
    level: "warning",
    title: "Secrets Manager secret uses the default AWS-managed KMS key",
    applies: (n) => n.type === "secretsmanager",
    check: (n) =>
      !n.data?.config?.kms_key_id &&
      !n.data?.iam_role_id,
    message: (n) =>
      `${n.data?.label || n.id} does not specify a custom KMS key. Secrets are encrypted with the AWS-managed key (aws/secretsmanager), which cannot be disabled, audited per-secret, or have key access policies customized.`,
    fix: "Add a KMS Key ID (CMK) to the Secrets Manager secret config.",
    suggestion: `Set \`kms_key_id = aws_kms_key.<name>.arn\` on \`aws_secretsmanager_secret\`. A CMK allows fine-grained CloudTrail audit of every Decrypt call, key rotation control, and key disablement as a break-glass mechanism. Required for HIPAA BAA and strongly recommended for PCI DSS cardholder data.`,
    canAcknowledge: true,
    standards: ["SOC2", "PCI", "HIPAA", "NIST"],
  },

  // ── DynamoDB: no CMK encryption ────────────────────────────────────────────
  // AWS FSBP DynamoDB.3 — tables should use CMK for encryption
  {
    id: "dynamodb_no_cmk",
    level: "warning",
    title: "DynamoDB table is not encrypted with a customer-managed KMS key",
    applies: (n) => n.type === "dynamodb",
    check: (n) => {
      const sse = n.data?.config?.server_side_encryption;
      if (!sse) return true;
      const enabled = sse.enabled === true || sse.enabled === "true";
      const hasCmk = sse.kms_key_arn || n.data?.config?.kms_key_arn;
      return !enabled || !hasCmk;
    },
    message: (n) =>
      `${n.data?.label || n.id} is encrypted with the default AWS-owned key (or SSE is not explicitly configured). You have no control over key rotation, audit trail per table, or key revocation.`,
    fix: "Enable server-side encryption with a CMK by setting kms_key_arn in the config.",
    suggestion: `Set \`server_side_encryption { enabled = true kms_key_arn = aws_kms_key.<name>.arn }\` on \`aws_dynamodb_table\`. Using a CMK adds a CloudTrail event for every table decrypt operation, enables per-table key policies, and allows key disablement as an incident response action. AWS-owned key encryption is still encrypted at rest but provides less operational control.`,
    canAcknowledge: true,
    standards: ["SOC2", "PCI", "HIPAA", "NIST"],
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
    suggestion: `Remove the direct edge between the database and the Internet Gateway. Route traffic through a compute tier (EC2, ECS, Lambda) in the same VPC. Add a security group allowing only that compute tier's SG as source.`,
    standards: ["CIS", "SOC2", "PCI", "HIPAA", "NIST"]
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
    suggestion: `Add an ALB (\`aws_lb\`) between the Internet Gateway and this compute resource. The ALB handles TLS termination, health checks, and gives you a stable DNS endpoint.`,
    standards: ["CIS", "SOC2", "PCI", "HIPAA"]
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
    suggestion: `Add an \`aws_security_group\` resource and reference it in the \`vpc_security_group_ids\` (EC2/RDS) or \`security_group_ids\` (Lambda/EFS) attribute. Open the Security tab to configure rules.`,
    standards: ["CIS", "SOC2", "PCI", "HIPAA", "NIST"]
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
    suggestion: `Open the IAM tab, create a role for this compute resource, and assign only the actions it needs. Use \`aws_iam_role\` + \`aws_iam_role_policy_attachment\` with a policy scoped to the specific S3/DynamoDB/SQS/SNS resources this service accesses.`,
    standards: ["CIS", "SOC2", "PCI", "HIPAA", "NIST"]
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
    suggestion: `Create an \`aws_wafv2_web_acl\` (scope = REGIONAL) and associate it with the ALB via \`aws_wafv2_web_acl_association\`. Enable the AWS Managed Rules \`AWSManagedRulesCommonRuleSet\` and \`AWSManagedRulesAmazonIpReputationList\` as a baseline.`,
    standards: ["SOC2", "PCI"]
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
    suggestion: `Connect this component to a related resource or remove it. Orphaned components generate empty Terraform resources that succeed in plan but have no real effect.`,
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
    suggestion: `Add an \`aws_lb_target_group\` and \`aws_lb_target_group_attachment\` (EC2) or configure \`target_type = "lambda"\` / \`target_type = "ip"\` (ECS Fargate). Without targets, the ALB returns 503 to all requests.`,
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
    suggestion: `Add an \`aws_cloudwatch_metric_alarm\` for key metrics (CPU, error rate, latency). For Lambda/ECS, enable CloudWatch Logs via the execution role. Set \`sns_topic_arn\` on the alarm to notify an operator.`,
    standards: ["SOC2", "NIST"]
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
    suggestion: `Set \`multi_az = true\` on \`aws_db_instance\` or use \`aws_rds_cluster\` with \`availability_zones\` spanning at least two AZs. Multi-AZ adds a synchronous standby replica for automatic failover under 60 seconds.`,
    standards: ["SOC2", "PCI"]
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
    suggestion: `Store database credentials in \`aws_secretsmanager_secret\` + \`aws_secretsmanager_secret_version\`. In the application, call \`GetSecretValue\` at startup instead of reading from environment variables. Grant the compute role \`secretsmanager:GetSecretValue\` on the specific secret ARN.`,
    standards: ["CIS", "SOC2", "PCI", "HIPAA"]
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
    suggestion: `Create \`aws_nat_gateway\` in a public subnet with an Elastic IP. Add a route \`0.0.0.0/0 → nat_gateway_id\` to the private subnet's \`aws_route_table\`. Without NAT, instances cannot pull updates, call AWS APIs, or reach external services.`,
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
    suggestion: `Move the database into a private subnet — one whose route table has no \`0.0.0.0/0 → igw\` route. Application tiers in public or private subnets can still reach it via VPC routing. Public subnet placement exposes the instance to port-scanning from the internet.`,
    standards: ["CIS", "SOC2", "PCI", "HIPAA"]
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
    suggestion: `Add subnet IDs from at least two Availability Zones to \`subnets\` on \`aws_lb\`. AWS requires multi-AZ for ALB and will reject single-AZ configurations at apply time.`,
    standards: ["SOC2"]
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
    suggestion: `Add \`dead_letter_config { target_arn = aws_sqs_queue.dlq.arn }\` on \`aws_lambda_function\`. Asynchronous invocation failures (EventBridge, S3 events) are sent to the DLQ for inspection.`,
    standards: ["SOC2"]
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
    suggestion: `Deploy an \`aws_nat_gateway\` in each Availability Zone that contains private subnets. Update the route table for each AZ's private subnets to use its local NAT Gateway.`,
    standards: ["SOC2"]
  },

  // ── CloudFront topology rules ────────────────────────────────────────────
  {
    id: "cloudfront_no_waf",
    level: "warning",
    title: "CloudFront distribution has no WAF",
    applies: (n) => n.type === "cloudfront",
    check: (n, edges, nodes) => {
      const wafIds = new Set(nodes.filter((m) => m.type === "waf").map((m) => m.id));
      if (wafIds.size === 0) return true;
      return !edges.some(
        (e) =>
          (e.source === n.id && wafIds.has(e.target)) ||
          (e.target === n.id && wafIds.has(e.source))
      );
    },
    message: (n) => `${n.data?.label || n.id}: No WAF WebACL associated. Application-layer attacks are unmitigated.`,
    fix: "Add a WAF component and connect it to the CloudFront distribution.",
    suggestion: `Create an \`aws_wafv2_web_acl\` (scope = CLOUDFRONT, region = us-east-1) and set \`web_acl_id = aws_wafv2_web_acl.main.arn\` on \`aws_cloudfront_distribution\`. Add managed rule groups for common threats.`,
    standards: ["PCI", "NIST"],
    canAcknowledge: true,
  },
  {
    id: "cloudfront_no_logging",
    level: "warning",
    title: "CloudFront access logging not configured",
    applies: (n) => n.type === "cloudfront",
    check: (n) => !n.data?.config?.logging_config && !n.data?.config?.logging,
    message: (n) => `${n.data?.label || n.id}: CloudFront access logs are not enabled. Required by PCI DSS 10.2.`,
    fix: "Add a logging_config block pointing to an S3 bucket for access log storage.",
    suggestion: `Add \`logging_config { bucket = aws_s3_bucket.cf_logs.bucket_domain_name include_cookies = false }\` on \`aws_cloudfront_distribution\`. Create a dedicated S3 bucket with ACL \`log-delivery-write\`.`,
    standards: ["PCI", "SOC2", "NIST"],
    canAcknowledge: true,
  },
  // ── ALB HTTP redirect ─────────────────────────────────────────────────────
  {
    id: "alb_http_no_redirect",
    level: "warning",
    title: "Internet-facing ALB may lack HTTPS redirect",
    applies: (n) => n.type === "alb",
    check: (n) =>
      (n.data?.config?.scheme || "internet-facing") === "internet-facing" &&
      !n.data?.config?.ssl_policy &&
      !n.data?.config?.certificate_arn,
    message: (n) => `${n.data?.label || n.id} is internet-facing. Verify HTTP listeners redirect to HTTPS (PCI ELB.1).`,
    fix: "Add an aws_lb_listener with action type redirect pointing to HTTPS port 443.",
    suggestion: `Add an \`aws_lb_listener\` on port 80 with \`default_action { type = "redirect" redirect { port = "443" protocol = "HTTPS" status_code = "HTTP_301" } }\`. Add a separate HTTPS listener with an ACM certificate.`,
    standards: ["PCI", "HIPAA"],
    canAcknowledge: true,
  },
  // ── Default SG ────────────────────────────────────────────────────────────
  {
    id: "default_sg_unrestricted",
    level: "warning",
    title: "Default security group has inbound rules",
    applies: (n) => n.type === "security_group",
    check: (n) => {
      const name = (n.data?.label || n.data?.config?.name || "").toLowerCase();
      return name === "default" || name === "default-sg" || name === "default security group";
    },
    message: (n) => `Security group "${n.data?.label || n.id}" is named "default". The default VPC SG should have no inbound rules (CIS 5.2).`,
    fix: "Remove all inbound rules from the default security group. Use purpose-built security groups instead.",
    suggestion: `Remove all inbound and outbound rules from the default security group. Add \`aws_default_security_group\` with empty ingress/egress blocks to manage it via Terraform and prevent drift.`,
    standards: ["CIS", "PCI"],
    canAcknowledge: true,
  },
  // ── Compliance-specific topology rules ────────────────────────────────────
  {
    id: "cloudtrail_not_enabled",
    level: "warning",
    title: "CloudTrail not enabled",
    applies: (n) => ["vpc", "ec2", "rds", "s3", "lambda"].includes(n.type),
    check: (n, edges, nodes) => {
      // Fire once: only on the first matching node if no cloudtrail node exists
      const hasTrail = nodes.some((nd) => nd.type === "cloudtrail");
      if (hasTrail) return false;
      const targets = nodes.filter((nd) =>
        ["vpc", "ec2", "rds", "s3", "lambda"].includes(nd.type),
      );
      return targets.length > 0 && targets[0].id === n.id;
    },
    message: () =>
      "No CloudTrail resource found. API and management events are not being audited.",
    fix: "Add an aws_cloudtrail resource with multi_region_trail = true and enable_log_file_validation = true.",
    suggestion: `Add \`aws_cloudtrail\` with \`multi_region_trail = true\`, \`enable_log_file_validation = true\`, and an S3 bucket for log storage. Required by CIS AWS 3.x controls.`,
    standards: ["CIS", "SOC2", "PCI", "HIPAA"],
    canAcknowledge: true,
  },
  {
    id: "vpc_flow_logs_disabled",
    level: "warning",
    title: "VPC flow logs disabled",
    applies: (n) => n.type === "vpc",
    check: (n, edges, nodes) => !nodes.some((nd) => nd.type === "flow_log"),
    message: (n) =>
      `${n.data?.label || n.id}: No VPC flow log resource found. Network traffic to and from this VPC is not being logged.`,
    fix: 'Add an aws_flow_log resource with vpc_id referencing this VPC and traffic_type = "ALL".',
    suggestion: `Add \`aws_flow_log\` with \`vpc_id = aws_vpc.main.id\`, \`traffic_type = "ALL"\`, and a CloudWatch log group or S3 destination. Required by CIS AWS 2.9 / NIST SC-7.`,
    standards: ["CIS", "SOC2", "NIST"],
    canAcknowledge: true,
  },
  {
    id: "kms_no_cmk",
    level: "warning",
    title: "No customer-managed KMS key",
    applies: (n) => ["rds", "s3", "dynamodb", "aurora", "ebs"].includes(n.type),
    check: (n) => !n.data?.config?.kms_key_id,
    message: (n) =>
      `${n.data?.label || n.id}: No customer-managed KMS key configured. PCI DSS and HIPAA require CMKs for data at rest on regulated workloads.`,
    fix: "Set kms_key_id to the ARN of an aws_kms_key resource with rotation enabled.",
    suggestion: `Create \`aws_kms_key\` with \`enable_key_rotation = true\` and set \`kms_key_id = aws_kms_key.main.arn\` on this resource. Required by PCI DSS Req 3.5 / HIPAA 164.312(a)(2)(iv).`,
    standards: ["PCI", "HIPAA"],
    canAcknowledge: true,
  },
  {
    id: "waf_required_on_public_alb",
    level: "warning",
    title: "WAF required on public ALB",
    applies: (n) => n.type === "alb",
    check: (n, edges, nodes) => {
      const isInternal = n.data?.config?.internal === true || n.data?.config?.scheme === "internal";
      if (isInternal) return false;
      const wafIds = new Set(nodes.filter((m) => m.type === "waf").map((m) => m.id));
      if (wafIds.size === 0) return true;
      const neighborSet = new Set(neighborIds(n.id, edges));
      return ![...wafIds].some((wid) => neighborSet.has(wid));
    },
    message: (n) =>
      `${n.data?.label || n.id}: Public-facing ALB has no WAF WebACL association. Application-layer attacks are unmitigated.`,
    fix: "Add an aws_wafv2_web_acl_association linking a WAF WebACL to this load balancer ARN.",
    suggestion: `Add \`aws_wafv2_web_acl_association\` with \`resource_arn = aws_lb.main.arn\` and \`web_acl_arn\` pointing to a managed rule group WebACL. Required by PCI DSS Req 6.6.`,
    standards: ["PCI", "HIPAA", "SOC2"],
    canAcknowledge: true,
  },
  // ── CIS / SOC2 / PCI — Additional topology rules ────────────────────────────

  // CIS 3.3 / Config.1 — AWS Config not in architecture
  {
    id: "cis_config_missing",
    level: "warning",
    title: "AWS Config not in architecture",
    applies: (n) => ["vpc", "ec2", "rds", "s3", "lambda"].includes(n.type),
    check: (n, edges, nodes) => {
      const hasConfig = nodes.some((nd) => nd.type === "config");
      if (hasConfig) return false;
      const targets = nodes.filter((nd) =>
        ["vpc", "ec2", "rds", "s3", "lambda"].includes(nd.type),
      );
      return targets.length > 0 && targets[0].id === n.id;
    },
    message: () =>
      "No AWS Config resource found. Configuration changes and compliance drift are not recorded.",
    fix: "Add an AWS Config resource to continuously record resource configurations.",
    suggestion: `Add \`aws_config_configuration_recorder\`, \`aws_config_delivery_channel\`, and \`aws_config_configuration_recorder_status\`. Store snapshots in an S3 bucket. Required by CIS 3.3, SOC 2 CC7.1, and PCI DSS Req 10.2 for continuous configuration tracking.`,
    standards: ["CIS", "SOC2", "PCI"],
    canAcknowledge: true,
  },

  // CIS / SOC2 / PCI — GuardDuty not in architecture
  {
    id: "guardduty_missing",
    level: "warning",
    title: "GuardDuty not in architecture",
    applies: (n) => ["vpc", "ec2", "rds", "s3"].includes(n.type),
    check: (n, edges, nodes) => {
      const hasGD = nodes.some((nd) => nd.type === "guardduty");
      if (hasGD) return false;
      const targets = nodes.filter((nd) =>
        ["vpc", "ec2", "rds", "s3"].includes(nd.type),
      );
      return targets.length > 0 && targets[0].id === n.id;
    },
    message: () =>
      "No GuardDuty resource found. Threat detection (credential compromise, malware, recon) is inactive.",
    fix: "Add an aws_guardduty_detector resource with enable = true.",
    suggestion: `Add \`aws_guardduty_detector\` with \`enable = true\`. GuardDuty analyzes CloudTrail, VPC Flow Logs, and DNS logs for known threat signatures and ML anomalies. Findings integrate with Security Hub. Required by CIS 3.x, PCI DSS Req 10.6, and SOC 2 CC7.1/CC7.2.`,
    standards: ["CIS", "SOC2", "PCI"],
    canAcknowledge: true,
  },

  // SOC2 / PCI — AWS Security Hub not in architecture
  {
    id: "security_hub_missing",
    level: "info",
    title: "AWS Security Hub not in architecture",
    applies: (n) => ["vpc", "ec2", "rds", "s3", "lambda"].includes(n.type),
    check: (n, edges, nodes) => {
      const hasHub = nodes.some((nd) => nd.type === "security_hub");
      if (hasHub) return false;
      const targets = nodes.filter((nd) =>
        ["vpc", "ec2", "rds", "s3", "lambda"].includes(nd.type),
      );
      return targets.length > 0 && targets[0].id === n.id;
    },
    message: () =>
      "No AWS Security Hub found. Centralized security posture scoring and finding aggregation is unavailable.",
    fix: "Add aws_securityhub_account to aggregate findings from GuardDuty, Inspector, Macie, and Config.",
    suggestion: `Add \`aws_securityhub_account\` and subscribe to standards via \`aws_securityhub_standards_subscription\`: CIS AWS Foundations (\`arn:aws:securityhub:::ruleset/cis-aws-foundations-benchmark/v/1.4.0\`), PCI DSS, and AWS FSBP. Security Hub correlates findings and computes a security score per standard.`,
    standards: ["SOC2", "PCI"],
    canAcknowledge: true,
  },

  // PCI / SOC2 — AWS Inspector not in architecture
  {
    id: "pci_inspector_missing",
    level: "info",
    title: "AWS Inspector not in architecture",
    applies: (n) => ["ec2", "ecs_fargate", "eks", "lambda"].includes(n.type),
    check: (n, edges, nodes) => {
      const hasInspector = nodes.some((nd) => nd.type === "inspector");
      if (hasInspector) return false;
      const targets = nodes.filter((nd) =>
        ["ec2", "ecs_fargate", "eks", "lambda"].includes(nd.type),
      );
      return targets.length > 0 && targets[0].id === n.id;
    },
    message: () =>
      "No AWS Inspector resource found. Automated vulnerability scanning for OS/package CVEs is not configured.",
    fix: "Add aws_inspector2_enabler to continuously scan EC2, ECR images, and Lambda for vulnerabilities.",
    suggestion: `Add \`aws_inspector2_enabler\` with \`resource_types = ["EC2", "ECR", "LAMBDA"]\`. Inspector v2 continuously scans for CVEs without scheduled windows and publishes findings to Security Hub. Required by PCI DSS Req 11.3 (vulnerability scanning) and SOC 2 CC7.1.`,
    standards: ["PCI", "SOC2"],
    canAcknowledge: true,
  },

  // CIS 3.4 — CloudTrail S3 bucket has no access logging
  {
    id: "cis_cloudtrail_bucket_logging",
    level: "warning",
    title: "CloudTrail destination S3 bucket has no access logging",
    applies: (n) => n.type === "cloudtrail",
    check: (n, edges, nodes) => {
      const s3Neighbors = neighborIds(n.id, edges)
        .map((id) => nodes.find((nd) => nd.id === id))
        .filter((nd) => nd?.type === "s3");
      if (s3Neighbors.length === 0) return false;
      return s3Neighbors.every(
        (s3) =>
          !s3.data?.config?.access_logging_enabled &&
          !s3.data?.config?.logging,
      );
    },
    message: (n) =>
      `${n.data?.label || n.id}: The S3 bucket storing CloudTrail logs does not have server access logging enabled.`,
    fix: "Enable S3 access logging on the CloudTrail log bucket to detect unauthorized access to audit records.",
    suggestion: `Add \`aws_s3_bucket_logging\` on the CloudTrail destination bucket with a separate target bucket. CIS 3.4 requires server access logging on the CloudTrail bucket so that access to audit logs is itself auditable.`,
    standards: ["CIS", "PCI"],
    canAcknowledge: true,
  },


  // ── NIST SP 800-53 Rev 5 — Additional topology rules ────────────────────────

  // NIST CP-9 — No AWS Backup plan for critical data stores
  {
    id: "nist_backup_plan_missing",
    level: "warning",
    title: "No AWS Backup plan in architecture",
    applies: (n) => ["rds", "aurora", "dynamodb", "efs", "ebs"].includes(n.type),
    check: (n, edges, nodes) => {
      const hasBackup = nodes.some((nd) => nd.type === "backup");
      if (hasBackup) return false;
      const targets = nodes.filter((nd) =>
        ["rds", "aurora", "dynamodb", "efs", "ebs"].includes(nd.type),
      );
      return targets.length > 0 && targets[0].id === n.id;
    },
    message: () =>
      "No AWS Backup resource found. Critical data stores have no centralized backup policy.",
    fix: "Add an aws_backup_plan and aws_backup_selection to bring critical resources under a managed backup policy.",
    suggestion: `Add \`aws_backup_plan\` with a \`rule\` block defining schedule, retention, and cold storage transition. Add \`aws_backup_selection\` to select resources by tag or ARN. NIST CP-9 requires system backup of user-level and system-level information. Centralized AWS Backup provides compliance reporting via AWS Backup Audit Manager.`,
    standards: ["NIST", "SOC2"],
    canAcknowledge: true,
  },

  // NIST MA-2 / SI-2 — EC2 instances with no Systems Manager connection
  {
    id: "nist_ssm_missing",
    level: "info",
    title: "EC2 instance has no Systems Manager connection",
    applies: (n) => n.type === "ec2",
    check: (n, edges, nodes) => {
      const hasSsm = hasNeighborOfType(n.id, "systems_manager", edges, nodes);
      return !hasSsm && !n.data?.config?.ssm_managed;
    },
    message: (n) =>
      `${n.data?.label || n.id} has no AWS Systems Manager connection. Patch compliance and session management are unavailable.`,
    fix: "Add a Systems Manager component and connect it to this EC2 instance, or enable SSM management in the config.",
    suggestion: `Attach the \`AmazonSSMManagedInstanceCore\` policy to the EC2 IAM role. Add a VPC endpoint for \`com.amazonaws.REGION.ssm\` if the instance is in a private subnet. Systems Manager enables patch management (Patch Manager), remote access without SSH (Session Manager), and run command — required by NIST MA-2 (controlled maintenance) and SI-2 (flaw remediation).`,
    standards: ["NIST"],
    canAcknowledge: true,
  },

  // NIST IR-4 / IR-5 — CloudWatch with no SNS alerting path
  {
    id: "nist_cloudwatch_no_alerting",
    level: "info",
    title: "CloudWatch has no SNS alerting path",
    applies: (n) => n.type === "cloudwatch",
    check: (n, edges, nodes) =>
      !hasNeighborOfType(n.id, "sns", edges, nodes),
    message: (n) =>
      `${n.data?.label || n.id} is not connected to an SNS topic. CloudWatch alarms have no notification target for incident response.`,
    fix: "Add an SNS topic and connect it to CloudWatch to enable alarm notifications.",
    suggestion: `Create \`aws_sns_topic\` and \`aws_sns_topic_subscription\` (email/PagerDuty/Slack via Lambda). Set \`alarm_actions = [aws_sns_topic.alerts.arn]\` on \`aws_cloudwatch_metric_alarm\`. NIST IR-4 requires an incident-handling capability that includes containment — without alerting, incidents go undetected.`,
    standards: ["NIST", "SOC2"],
    canAcknowledge: true,
  },

  // NIST SC-5 — Internet-facing resources without Shield
  {
    id: "nist_shield_missing",
    level: "info",
    title: "No AWS Shield protection on internet-facing resources",
    applies: (n) => ["cloudfront", "alb", "route53"].includes(n.type),
    check: (n, edges, nodes) => {
      const igwIds = nodes.filter((nd) => IGW_TYPES.has(nd.type)).map((nd) => nd.id);
      const isPublic =
        n.type === "cloudfront" ||
        n.type === "route53" ||
        igwIds.some((id) => directEdge(id, n.id, edges));
      if (!isPublic) return false;
      return !nodes.some((nd) => nd.type === "shield");
    },
    message: (n) =>
      `${n.data?.label || n.id} is internet-facing but no AWS Shield resource is in the architecture.`,
    fix: "Add an aws_shield_protection resource for internet-facing endpoints.",
    suggestion: `Add \`aws_shield_protection\` with \`resource_arn\` pointing to the ALB or CloudFront distribution ARN. Shield Standard is free and automatic. Shield Advanced ($3,000/month) adds 24/7 DRT access, cost protection, and advanced detection. NIST SC-5 requires protection against denial-of-service attacks for availability-critical systems.`,
    standards: ["NIST"],
    canAcknowledge: true,
  },

  // NIST SI-4 — Compute without distributed tracing (X-Ray)
  {
    id: "nist_xray_missing",
    level: "info",
    title: "Compute service not connected to X-Ray tracing",
    applies: (n) => ["lambda", "ecs_fargate", "eks", "api_gateway"].includes(n.type),
    check: (n, edges, nodes) =>
      !hasNeighborOfType(n.id, "xray", edges, nodes) &&
      !(n.data?.config?.tracing_mode === "Active") &&
      !(n.data?.config?.xray_enabled),
    message: (n) =>
      `${n.data?.label || n.id} has no X-Ray tracing configured. Distributed request flows are not observable.`,
    fix: "Add an X-Ray component and connect it, or enable active tracing in the component config.",
    suggestion: `For Lambda: set \`tracing_config { mode = "Active" }\`. For ECS: add the X-Ray daemon as a sidecar container. For API Gateway: set \`xray_tracing_enabled = true\` on \`aws_api_gateway_stage\`. NIST SI-4 requires monitoring of information systems to detect attacks — distributed tracing enables detection of anomalous latency and error injection patterns across microservices.`,
    standards: ["NIST"],
    canAcknowledge: true,
  },



  // ── API Gateway: no WAF association in architecture ───────────────────────
  {
    id: "apigw_missing_waf",
    level: "warning",
    title: "Public API Gateway has no WAF associated in the architecture",
    applies: (n) => n.type === "api_gateway",
    check: (n, edges, nodes) =>
      !hasNeighborOfType(n.id, "waf", edges, nodes) &&
      !nodes.some((nd) => nd.type === "waf"),
    message: (n) =>
      `${n.data?.label || n.id} is not associated with a WAF (Web ACL). The API endpoint is exposed to SQL injection, XSS, HTTP flood, and bot traffic without a Layer 7 inspection layer.`,
    fix: "Add a WAF component to the architecture and connect it to the API Gateway.",
    suggestion: `Create \`aws_wafv2_web_acl\` with \`scope = "REGIONAL"\` and at least the AWS managed rule groups: \`AWSManagedRulesCommonRuleSet\` and \`AWSManagedRulesKnownBadInputsRuleSet\`. Associate it via \`aws_wafv2_web_acl_association\` targeting the API Gateway stage ARN. OWASP API Security Top 10 — API4:2023 (Unrestricted Resource Consumption) and API7:2023 (Server Side Request Forgery) are both mitigated by WAF rate-limiting and SSRF rules.`,
    canAcknowledge: true,
    standards: ["CIS", "SOC2", "PCI", "NIST"],
  },

  // ── ALB: no ACM certificate in architecture ───────────────────────────────
  {
    id: "missing_acm_on_alb",
    level: "warning",
    title: "Application Load Balancer has no ACM certificate in the architecture",
    applies: (n) => n.type === "alb",
    check: (n, edges, nodes) =>
      !hasNeighborOfType(n.id, "acm", edges, nodes) &&
      !nodes.some((nd) => nd.type === "acm"),
    message: (n) =>
      `${n.data?.label || n.id} has no ACM certificate in the architecture. Without a TLS certificate, the ALB cannot serve HTTPS (port 443) traffic — all connections will be unencrypted HTTP.`,
    fix: "Add an ACM certificate component, connect it to the ALB, and configure an HTTPS listener.",
    suggestion: `Create \`aws_acm_certificate\` with \`validation_method = "DNS"\`, generate the Route 53 validation record, and reference the certificate ARN in \`aws_lb_listener\` HTTPS forward action. ACM certificates are free, auto-renew, and are deeply integrated with ALB — there is no reason to use HTTP-only in production.`,
    canAcknowledge: true,
    standards: ["CIS", "SOC2", "PCI", "NIST"],
  },

  // ── Sensitive data stores: no KMS node in architecture ────────────────────
  {
    id: "sensitive_data_no_kms",
    level: "warning",
    title: "Architecture contains data stores but no KMS key resource",
    applies: (n) => ["rds", "aurora", "dynamodb", "s3", "redshift", "documentdb", "opensearch", "elasticache"].includes(n.type),
    check: (n, edges, nodes) => {
      const hasSensitiveStore = nodes.some((nd) =>
        ["rds", "aurora", "dynamodb", "s3", "redshift", "documentdb", "opensearch", "elasticache"].includes(nd.type)
      );
      const hasKms = nodes.some((nd) => nd.type === "kms_key");
      return hasSensitiveStore && !hasKms;
    },
    message: (n) =>
      `${n.data?.label || n.id} and other data stores in the architecture have no KMS key resource. Encryption uses AWS-managed keys with no audit trail, no access revocation capability, and no per-resource key policies.`,
    fix: "Add a KMS Key component to the architecture and reference it from data store encryption configs.",
    suggestion: `Add \`aws_kms_key\` with \`enable_key_rotation = true\` and \`deletion_window_in_days = 30\`. Create aliases per service (e.g. \`alias/archon-rds\`, \`alias/archon-s3\`). Reference key ARNs in each data store's encryption configuration. CMKs produce a CloudTrail event for every Decrypt operation — essential for detecting unauthorized data access patterns in a SIEM.`,
    canAcknowledge: true,
    standards: ["SOC2", "PCI", "HIPAA", "NIST"],
  },

  // ── Lambda: no IAM role connected ─────────────────────────────────────────
  {
    id: "lambda_no_execution_role",
    level: "critical",
    title: "Lambda function has no IAM execution role connected",
    applies: (n) => n.type === "lambda",
    check: (n, edges, nodes) =>
      !n.data?.iam_role_id &&
      !hasNeighborOfType(n.id, "iam_role", edges, nodes),
    message: (n) =>
      `${n.data?.label || n.id} has no IAM execution role. Lambda requires an execution role to write CloudWatch logs and access any AWS service. Without one, all invocations will fail with an access denied error.`,
    fix: "Attach an IAM Role to this Lambda function via the Config panel, or connect an iam_role node.",
    suggestion: `Create \`aws_iam_role\` with trust policy \`{"Service": "lambda.amazonaws.com"}\` and attach \`AWSLambdaBasicExecutionRole\` via \`aws_iam_role_policy_attachment\`. Add additional policies for any AWS services the function calls (DynamoDB, S3, SQS, etc.). Reference the role via \`role = aws_iam_role.<name>.arn\` on \`aws_lambda_function\`.`,
    canAcknowledge: false,
    standards: ["CIS", "SOC2", "NIST"],
  },

  // ── ECS: no execution role connected ──────────────────────────────────────
  {
    id: "ecs_no_execution_role",
    level: "critical",
    title: "ECS Fargate task has no IAM execution role connected",
    applies: (n) => n.type === "ecs_fargate",
    check: (n, edges, nodes) =>
      !n.data?.iam_role_id &&
      !hasNeighborOfType(n.id, "iam_role", edges, nodes),
    message: (n) =>
      `${n.data?.label || n.id} has no IAM execution role. ECS Fargate requires the execution role to pull images from ECR and write logs to CloudWatch. Without it, task placement will fail.`,
    fix: "Attach an IAM Role with AmazonECSTaskExecutionRolePolicy to this ECS task.",
    suggestion: `Create \`aws_iam_role\` with trust policy \`{"Service": "ecs-tasks.amazonaws.com"}\` and attach \`AmazonECSTaskExecutionRolePolicy\`. Reference it via \`execution_role_arn\` on \`aws_ecs_task_definition\`. Separately, define a task role (\`task_role_arn\`) with only the permissions the application code needs — keep execution role and task role separate.`,
    canAcknowledge: false,
    standards: ["CIS", "SOC2", "NIST"],
  },

  // ── RDS: no multi-AZ and no backup ────────────────────────────────────────
  {
    id: "rds_single_az_no_backup",
    level: "warning",
    title: "RDS instance is single-AZ with no connection to a backup plan",
    applies: (n) => n.type === "rds",
    check: (n, edges, nodes) => {
      const noMultiAz = !n.data?.config?.multi_az && n.data?.config?.multi_az !== true;
      const noBackup = !hasNeighborOfType(n.id, "backup", edges, nodes) &&
        (!n.data?.config?.backup_retention_period || parseInt(n.data?.config?.backup_retention_period, 10) < 7);
      return noMultiAz && noBackup;
    },
    message: (n) =>
      `${n.data?.label || n.id} is single-AZ with a backup retention period under 7 days. An AZ failure causes extended downtime, and limited backup retention restricts recovery options.`,
    fix: "Enable Multi-AZ and set backup_retention_period to at least 7 in the RDS config.",
    suggestion: `Set \`multi_az = true\` and \`backup_retention_period = 7\` (minimum; 30+ for compliance) on \`aws_db_instance\`. Consider adding \`aws_backup_plan\` for longer-term retention beyond RDS automated backups. Multi-AZ provides synchronous replication and automatic failover — typically < 60 seconds. AWS Well-Architected Reliability Pillar requires multi-AZ for production databases.`,
    canAcknowledge: true,
    standards: ["SOC2", "PCI", "HIPAA", "NIST"],
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
    suggestion: `Replace the \`0-65535\` port range rule with specific port allowances. Use \`aws_security_group_rule\` resources for each protocol/port required by the application.`,
    standards: ["CIS", "SOC2", "PCI", "HIPAA", "NIST"]
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
    suggestion: `Change the source from \`0.0.0.0/0\` to the security group ID of the application tier. Use \`source_security_group_id\` in \`aws_security_group_rule\` instead of a CIDR block.`,
    standards: ["CIS", "SOC2", "PCI", "HIPAA"]
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
    suggestion: `Restrict the SSH source to your VPN or bastion CIDR. Better: remove SSH entirely and use AWS Systems Manager Session Manager — no port 22 needed, full session audit logging.`,
    standards: ["CIS", "PCI", "NIST"]
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
    suggestion: `Restrict the RDP source CIDR to your VPN or office IP range. Consider AWS Systems Manager Fleet Manager for browser-based RDP without exposing port 3389.`,
    standards: ["CIS", "PCI"]
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
    suggestion: `Remove the Telnet rule and use SSH instead. If this is a managed device with no SSH option, restrict the source CIDR to the specific management host IP.`,
    standards: ["PCI", "NIST"]
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
    suggestion: `Replace FTP (21) with AWS Transfer Family (SFTP/FTPS) or restrict to a specific source CIDR. FTP transmits credentials in plaintext — never expose it to \`0.0.0.0/0\`.`,
    standards: ["PCI", "NIST"]
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
    suggestion: `Use Amazon SES for sending email. If running your own SMTP server, restrict port 25 to known relay IP ranges. ISPs and AWS block outbound port 25 by default.`,
    standards: ["PCI"]
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
    suggestion: `Restrict mail protocol ports to specific client IP ranges. For a modern setup, use Amazon WorkMail or a managed email service that handles encryption and authentication.`,
    standards: ["PCI"]
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
    suggestion: `Narrow \`from_port\`/\`to_port\` to only the specific ports your application needs. Ephemeral port ranges (1024–65535) are typically needed only on return traffic, handled by stateful SG rules automatically.`,
    standards: ["PCI"]
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
    suggestion: `Add an HTTPS (443) inbound rule alongside HTTP (80). Configure the ALB listener to redirect port 80 to 443 with an ACM-issued TLS certificate.`,
    standards: ["PCI", "HIPAA"]
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
    suggestion: `Restrict the admin port source to a VPN or bastion CIDR. If using a jump host, use \`source_security_group_id = aws_security_group.bastion.id\` as the inbound source instead of a public CIDR.`,
    standards: ["CIS", "SOC2", "PCI", "NIST"]
  },
  {
    id: "sg_open_redis",
    level: "critical",
    title: "Redis port (6379) open to internet",
    canAcknowledge: false,
    check: (sg) => sgAllowsPortFromPublic(sg, 6379),
    message: (sg) =>
      `Security group "${sg.name}" exposes Redis port 6379 to 0.0.0.0/0. Redis has no authentication by default and no TLS. Any internet actor can read, write, or delete all cache data.`,
    fix: "Remove the 0.0.0.0/0 inbound rule on port 6379. Restrict access to the application security group only.",
    suggestion: `Replace \`cidr_blocks = ["0.0.0.0/0"]\` with \`source_security_group_id = aws_security_group.app.id\` on the Redis inbound rule. Enable Redis AUTH (\`auth_token\`) and TLS (\`transit_encryption_enabled = true\`) on the ElastiCache replication group. CVE-2022-0543 (Lua sandbox escape) and multiple SSRF-to-RCE chains begin with unauthenticated Redis access.`,
    standards: ["CIS", "SOC2", "PCI", "HIPAA", "NIST"],
  },
  {
    id: "sg_open_memcached",
    level: "critical",
    title: "Memcached port (11211) open to internet",
    canAcknowledge: false,
    check: (sg) => sgAllowsPortFromPublic(sg, 11211),
    message: (sg) =>
      `Security group "${sg.name}" exposes Memcached port 11211 to 0.0.0.0/0. Memcached has no authentication or encryption. All cache data is readable and writable by anyone, and the UDP interface enables DDoS amplification attacks (~50,000x amplification factor).`,
    fix: "Remove the 0.0.0.0/0 inbound rule on port 11211 immediately.",
    suggestion: `Restrict Memcached to \`source_security_group_id\` of the application tier only. Memcached has no native auth — never expose it externally. The Memcached UDP amplification attack (CVE-2018-1000115) has been used in record-breaking DDoS attacks exceeding 1.3Tbps. This is one of the highest-severity misconfigurations possible.`,
    standards: ["CIS", "SOC2", "PCI", "HIPAA", "NIST"],
  },
  {
    id: "sg_open_elasticsearch",
    level: "critical",
    title: "Elasticsearch/OpenSearch port (9200/9300) open to internet",
    canAcknowledge: false,
    check: (sg) =>
      sgAllowsPortFromPublic(sg, 9200) ||
      sgAllowsPortFromPublic(sg, 9300) ||
      sgAllowsPortFromPublic(sg, 5601),
    message: (sg) =>
      `Security group "${sg.name}" exposes Elasticsearch/OpenSearch (9200/9300) or Kibana (5601) to 0.0.0.0/0. Unauthenticated Elasticsearch clusters have led to breaches of billions of records — entire indices are downloadable in seconds.`,
    fix: "Remove the 0.0.0.0/0 inbound rules on ports 9200, 9300, and 5601.",
    suggestion: `Restrict Elasticsearch to internal security group references only. Deploy OpenSearch inside a VPC (no public endpoint). Enable fine-grained access control with a master user. Shodan regularly discovers thousands of publicly exposed Elasticsearch instances — this misconfiguration is a top cause of large-scale data breaches.`,
    standards: ["CIS", "SOC2", "PCI", "HIPAA", "NIST"],
  },
  {
    id: "sg_open_mongodb",
    level: "critical",
    title: "MongoDB port (27017) open to internet",
    canAcknowledge: false,
    check: (sg) =>
      sgAllowsPortFromPublic(sg, 27017) ||
      sgAllowsPortFromPublic(sg, 27018) ||
      sgAllowsPortFromPublic(sg, 27019),
    message: (sg) =>
      `Security group "${sg.name}" exposes MongoDB port 27017/27018/27019 to 0.0.0.0/0. Exposed MongoDB instances are a leading source of data breaches — automated scanners find and exfiltrate databases within minutes of exposure.`,
    fix: "Remove the 0.0.0.0/0 inbound rule on MongoDB ports immediately.",
    suggestion: `Restrict MongoDB to \`source_security_group_id\` of the application tier. Enable authentication (\`mongod --auth\`), TLS, and IP binding (\`bindIp\`). The 2017 MongoDB ransomware wave compromised 27,000+ databases within 48 hours, deleting data and demanding Bitcoin ransoms. Never expose MongoDB to the internet.`,
    standards: ["CIS", "SOC2", "PCI", "HIPAA", "NIST"],
  },
  {
    id: "sg_open_kafka",
    level: "critical",
    title: "Kafka broker port (9092/9093) open to internet",
    canAcknowledge: false,
    check: (sg) =>
      sgAllowsPortFromPublic(sg, 9092) ||
      sgAllowsPortFromPublic(sg, 9093) ||
      sgAllowsPortFromPublic(sg, 9094),
    message: (sg) =>
      `Security group "${sg.name}" exposes Kafka broker ports to 0.0.0.0/0. Unauthenticated Kafka brokers allow anyone to produce or consume messages from any topic — reading all event streams or injecting malicious events.`,
    fix: "Remove the 0.0.0.0/0 inbound rules on Kafka ports. Restrict to producer/consumer security groups only.",
    suggestion: `Restrict Kafka ports to \`source_security_group_id\` of producer and consumer tiers. Enable SASL/SCRAM or mTLS authentication on the broker. For MSK, set \`client_authentication { sasl { scram = true } }\` and \`encryption_in_transit { client_broker = "TLS" }\`. Port 9092 (PLAINTEXT) should never be used in production — use 9094 (TLS) only.`,
    standards: ["CIS", "SOC2", "PCI", "NIST"],
  },
  {
    id: "sg_icmp_unrestricted",
    level: "info",
    title: "ICMP traffic unrestricted from internet",
    canAcknowledge: true,
    check: (sg) => {
      if (!sg?.inbound) return false;
      return sg.inbound.some(
        (rule) => rule.protocol === "icmp" && isPublicCidr(rule.source),
      );
    },
    message: (sg) =>
      `Security group "${sg.name}" allows unrestricted ICMP from 0.0.0.0/0. This enables ping sweeps, traceroute-based network topology mapping, and ICMP tunneling of data out of the network.`,
    fix: "Restrict ICMP to specific trusted CIDRs, or block it entirely from public sources.",
    suggestion: `Remove unrestricted ICMP ingress or restrict to known management CIDRs. If ping/traceroute is needed for monitoring, use specific source CIDRs or use AWS Reachability Analyzer instead. ICMP tunneling tools (e.g. ptunnel, icmptunnel) can exfiltrate data through ICMP echo payloads — useful to attackers when TCP/UDP egress is blocked.`,
    standards: ["CIS", "SOC2", "NIST"],
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
    suggestion: `Replace \`"Action": "*"\` with a specific list of required actions. Use IAM Access Analyzer to generate a least-privilege policy based on actual CloudTrail activity over 90 days.`,
    canAcknowledge: false,
    standards: ["CIS", "SOC2", "PCI", "HIPAA", "NIST"]
  },
  {
    id: "iam_wildcard_sensitive",
    level: "critical",
    title: "IAM role has wildcard actions on sensitive service",
    check: (role) => !_hasAdminPolicy(role.policies ?? []) && _hasWildcardOnSensitive(role.policies ?? []),
    message: (role) => `IAM role "${role.name}" allows wildcard (*) actions on a sensitive service (IAM, S3, KMS, etc.). This is overly permissive.`,
    fix: "Replace service-level wildcards (e.g. s3:*) with specific actions (e.g. s3:GetObject, s3:PutObject).",
    suggestion: `Replace \`s3:*\`, \`ec2:*\`, and similar wildcards with specific actions. Review CloudTrail logs to identify which actions are actually used. IAM Access Analyzer policy generation automates this.`,
    canAcknowledge: false,
    standards: ["CIS", "SOC2", "PCI", "HIPAA", "NIST"]
  },
  {
    id: "iam_no_resource_constraint",
    level: "warning",
    title: "IAM role actions not scoped to specific resources",
    check: (role) => {
      if (_hasAdminPolicy(role.policies ?? [])) return false;
      return (role.policies ?? []).some((stmt) => {
        if (stmt.effect !== "Allow") return false;
        const actions = Array.isArray(stmt.actions) ? stmt.actions : String(stmt.actions ?? "").split(/[\s,]+/);
        const resources = Array.isArray(stmt.resources) ? stmt.resources : String(stmt.resources ?? "").split(/[\s,]+/);
        const allActions = actions.some((a) => a.trim() === "*");
        const allResources = resources.some((r) => r.trim() === "*");
        return allResources && !allActions;
      });
    },
    message: (role) => `IAM role "${role.name}" has allow statements with resource: "*" but specific actions. This grants those actions on all resources.`,
    fix: "Restrict the Resource field to specific ARNs (e.g. arn:aws:s3:::my-bucket/*).",
    suggestion: `Change \`"Resource": "*"\` to a specific ARN pattern (e.g. \`arn:aws:s3:::my-bucket/*\`). For multi-resource access, list each ARN explicitly or use wildcards with a prefix.`,
    canAcknowledge: false,
    standards: ["CIS", "SOC2", "PCI", "HIPAA"]
  },
  {
    id: "iam_inline_policy",
    level: "info",
    title: "IAM inline policy detected",
    check: (role) => !!role.isInline,
    message: (role) => `IAM role "${role.name}" uses an inline policy. Inline policies cannot be reused or audited centrally.`,
    fix: "Convert to a standalone aws_iam_policy resource and attach via aws_iam_role_policy_attachment.",
    suggestion: `Extract the policy document into \`aws_iam_policy\` and attach it with \`aws_iam_role_policy_attachment\`. Managed policies are versioned, reusable, and visible in the IAM Console policy list.`,
    canAcknowledge: true,
    standards: ["SOC2", "NIST"]
  },
  // ── IAM: cross-account role with no external ID condition ─────────────────
  // CIS IAM 1.21 — confused deputy attack prevention
  {
    id: "iam_cross_account_no_external_id",
    level: "critical",
    title: "Cross-account IAM role has no ExternalId condition",
    check: (role) => {
      if (!role.policies) return false;
      return role.policies.some((stmt) => {
        const actions = Array.isArray(stmt.actions)
          ? stmt.actions
          : String(stmt.actions ?? "").split(/[\s,]+/);
        const isTrustPolicy = actions.some((a) =>
          a.trim() === "sts:AssumeRole"
        );
        const hasExternalAccount = Array.isArray(stmt.resources)
          ? stmt.resources.some((r) => /arn:aws:iam::\d{12}/.test(r) && !r.includes(":root"))
          : false;
        const hasExternalId = stmt.condition?.StringEquals?.["sts:ExternalId"];
        return isTrustPolicy && hasExternalAccount && !hasExternalId;
      });
    },
    message: (role) =>
      `IAM role "${role.name}" allows cross-account sts:AssumeRole without a sts:ExternalId condition. Any AWS account that knows the role ARN can assume it — the "confused deputy" attack.`,
    fix: "Add a Condition block requiring sts:ExternalId to the cross-account trust policy.",
    suggestion: `Add \`"Condition": { "StringEquals": { "sts:ExternalId": "<unique-secret>" } }\` to the trust policy statement. The ExternalId is a secret shared only between you and the trusted account's deployment process — it prevents a malicious third party from tricking their legitimate role into assuming yours. AWS recommends generating a UUID per customer/integration. CIS IAM 1.21 and the AWS Well-Architected Security Pillar both require ExternalId for cross-account access.`,
    canAcknowledge: false,
    standards: ["CIS", "SOC2", "PCI", "NIST"],
  },
  // ── IAM: iam:PassRole with unrestricted resource ──────────────────────────
  // Privilege escalation: PassRole on * allows promotion to any role
  {
    id: "iam_pass_role_unrestricted",
    level: "critical",
    title: "IAM role grants iam:PassRole on all resources",
    check: (role) => {
      if (!role.policies) return false;
      return role.policies.some((stmt) => {
        if (stmt.effect !== "Allow") return false;
        const actions = Array.isArray(stmt.actions)
          ? stmt.actions
          : String(stmt.actions ?? "").split(/[\s,]+/);
        const resources = Array.isArray(stmt.resources)
          ? stmt.resources
          : String(stmt.resources ?? "").split(/[\s,]+/);
        const hasPassRole = actions.some(
          (a) => a.trim() === "iam:PassRole" || a.trim() === "*",
        );
        const allResources = resources.some((r) => r.trim() === "*");
        return hasPassRole && allResources;
      });
    },
    message: (role) =>
      `IAM role "${role.name}" can pass any IAM role to any AWS service. An attacker with this permission can escalate to Administrator by passing a highly privileged role to EC2, Lambda, or ECS.`,
    fix: "Restrict iam:PassRole to specific role ARNs that this principal legitimately needs to pass.",
    suggestion: `Change the Resource from \`"*"\` to a specific role ARN pattern: \`"arn:aws:iam::ACCOUNT_ID:role/allowed-role-prefix-*"\`. For CI/CD pipelines, enumerate the exact roles the pipeline can assume. \`iam:PassRole\` on \`*\` is a classic privilege escalation path — Rhino Security Labs lists it as one of the top IAM privilege escalation techniques. Pair with a Permission Boundary on all roles to set a hard ceiling on what can be escalated to.`,
    canAcknowledge: false,
    standards: ["CIS", "SOC2", "PCI", "NIST"],
  },
  // ── IAM: trust policy allows all AWS services ─────────────────────────────
  {
    id: "iam_trust_all_services",
    level: "warning",
    title: "IAM role trust policy allows all AWS services to assume it",
    check: (role) => {
      if (!role.policies) return false;
      return role.policies.some((stmt) => {
        if (stmt.effect !== "Allow") return false;
        const actions = Array.isArray(stmt.actions)
          ? stmt.actions
          : String(stmt.actions ?? "").split(/[\s,]+/);
        const isTrust = actions.some((a) => a.trim() === "sts:AssumeRole");
        const resources = Array.isArray(stmt.resources)
          ? stmt.resources
          : String(stmt.resources ?? "").split(/[\s,]+/);
        const allServices = resources.some(
          (r) => r.trim() === "*" || r.trim() === "*.amazonaws.com",
        );
        return isTrust && allServices;
      });
    },
    message: (role) =>
      `IAM role "${role.name}" has a trust policy that allows all AWS services (*.amazonaws.com) to assume it. Any AWS service in any account could assume this role — not just your intended service.`,
    fix: "Restrict the Principal in the trust policy to the specific AWS service that needs to assume this role.",
    suggestion: `Replace \`"Service": "*.amazonaws.com"\` with the specific service principal, e.g. \`"Service": "lambda.amazonaws.com"\`, \`"Service": "ecs-tasks.amazonaws.com"\`, or \`"Service": "ec2.amazonaws.com"\`. Service principals are specific strings listed in AWS documentation for each service. Overly broad trust policies violate the principle of least privilege and may allow unexpected service-to-service assumption chains.`,
    canAcknowledge: false,
    standards: ["CIS", "SOC2", "PCI", "NIST"],
  },
  // ── IAM: human-access role without MFA condition ──────────────────────────
  // CIS IAM 1.10 — IAM console access should require MFA
  {
    id: "iam_no_mfa_condition",
    level: "critical",
    title: "IAM role with console access has no MFA required condition",
    check: (role) => {
      if (!role.policies) return false;
      return role.policies.some((stmt) => {
        if (stmt.effect !== "Allow") return false;
        const actions = Array.isArray(stmt.actions)
          ? stmt.actions
          : String(stmt.actions ?? "").split(/[\s,]+/);
        const isTrust = actions.some((a) => a.trim() === "sts:AssumeRole");
        const resources = Array.isArray(stmt.resources)
          ? stmt.resources
          : String(stmt.resources ?? "").split(/[\s,]+/);
        const isUser = resources.some((r) =>
          r.includes(":user/") || r.includes(":root"),
        );
        const hasMfa =
          stmt.condition?.BoolIfExists?.["aws:MultiFactorAuthPresent"] === "true" ||
          stmt.condition?.Bool?.["aws:MultiFactorAuthPresent"] === "true" ||
          stmt.condition?.NumericLessThan?.["aws:MultiFactorAuthAge"];
        return isTrust && isUser && !hasMfa;
      });
    },
    message: (role) =>
      `IAM role "${role.name}" can be assumed by IAM users without requiring MFA. A compromised password alone is sufficient to assume this role and access its permissions.`,
    fix: "Add a Condition block requiring aws:MultiFactorAuthPresent = true to the trust policy.",
    suggestion: `Add \`"Condition": { "BoolIfExists": { "aws:MultiFactorAuthPresent": "true" } }\` to the trust policy. Use \`BoolIfExists\` (not \`Bool\`) to handle both console and CLI with assumed-role sessions correctly. For time-bound sessions also add \`"NumericLessThan": { "aws:MultiFactorAuthAge": "3600" }\` to enforce MFA recency. CIS IAM 1.10 and PCI DSS Req 8.3 both require MFA for all access to the AWS management console.`,
    canAcknowledge: false,
    standards: ["CIS", "SOC2", "PCI", "HIPAA", "NIST"],
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

// ─── Azure Config Rules ───────────────────────────────────────────────────────

const AZURE_CONFIG_RULES = [
  {
    id: "azure_vm_password_auth",
    level: "warning",
    title: "Azure VM: password authentication enabled",
    applies: (n) => n.type === "azure_vm",
    check: (n) => n.data?.config?.disable_password_authentication === false,
    message: (n) => `${n.data.label} allows password authentication. Use SSH keys only.`,
    fix: "Set 'SSH Key Only' to true in the component config.",
    suggestion: "Set `disable_password_authentication = true` on `azurerm_linux_virtual_machine` and use `admin_ssh_key` blocks.",
    standards: ["CIS", "NIST"],
  },
  {
    id: "azure_vm_no_boot_diagnostics",
    level: "info",
    title: "Azure VM: boot diagnostics not enabled",
    applies: (n) => n.type === "azure_vm",
    check: (n) => !n.data?.config?.boot_diagnostics_enabled,
    message: (n) => `${n.data.label} does not have boot diagnostics enabled.`,
    fix: "Enable 'Boot Diagnostics' in the component config.",
    suggestion: "Add `boot_diagnostics {}` block to `azurerm_linux_virtual_machine`. Enables serial console and screenshot access for troubleshooting.",
    standards: ["NIST"],
  },
  {
    id: "azure_aks_rbac_disabled",
    level: "critical",
    title: "AKS: RBAC disabled",
    applies: (n) => n.type === "azure_aks",
    check: (n) => n.data?.config?.role_based_access_control_enabled === false,
    message: (n) => `${n.data.label} has RBAC disabled. All users have unrestricted cluster access.`,
    fix: "Enable 'RBAC' in the AKS component config.",
    suggestion: "Set `role_based_access_control_enabled = true` on `azurerm_kubernetes_cluster`. Re-enabling after disable requires cluster recreation.",
    standards: ["CIS", "NIST", "SOC2"],
  },
  {
    id: "azure_aks_no_private_cluster",
    level: "warning",
    title: "AKS: API server not private",
    applies: (n) => n.type === "azure_aks",
    check: (n) => !n.data?.config?.private_cluster_enabled,
    message: (n) => `${n.data.label} has a public-facing API server endpoint.`,
    fix: "Enable 'Private Cluster' in the AKS component config.",
    suggestion: "Set `private_cluster_enabled = true` in `azurerm_kubernetes_cluster`. Requires VNet integration and private DNS zone.",
    standards: ["CIS", "NIST"],
  },
  {
    id: "azure_aks_no_authorized_ips",
    level: "warning",
    title: "AKS: no authorized IP ranges on API server",
    applies: (n) => n.type === "azure_aks",
    check: (n) => !n.data?.config?.private_cluster_enabled && !n.data?.config?.api_server_authorized_ip_ranges,
    message: (n) => `${n.data.label} API server is open to all IPs with no IP range restriction.`,
    fix: "Set 'API Server Authorized IPs' in the AKS component config, or enable private cluster.",
    suggestion: "Set `api_server_authorized_ip_ranges` or use `private_cluster_enabled = true` on `azurerm_kubernetes_cluster`.",
    standards: ["CIS", "NIST"],
  },
  {
    id: "azure_aks_no_network_policy",
    level: "warning",
    title: "AKS: no network policy configured",
    applies: (n) => n.type === "azure_aks",
    check: (n) => !n.data?.config?.network_policy,
    message: (n) => `${n.data.label} has no network policy. All pods can communicate freely.`,
    fix: "Set 'Network Policy' (azure or calico) in the AKS component config.",
    suggestion: "Set `network_policy = 'azure'` or `'calico'` in the `network_profile` block of `azurerm_kubernetes_cluster`.",
    standards: ["NIST", "SOC2"],
  },
  {
    id: "azure_sql_tde_disabled",
    level: "critical",
    title: "Azure SQL: Transparent Data Encryption disabled",
    applies: (n) => n.type === "azure_sql",
    check: (n) => n.data?.config?.transparent_data_encryption_enabled === false,
    message: (n) => `${n.data.label} has Transparent Data Encryption disabled.`,
    fix: "Enable 'Transparent Data Encryption' in the SQL component config.",
    suggestion: "Set `transparent_data_encryption_enabled = true` on `azurerm_mssql_database`.",
    standards: ["CIS", "HIPAA", "PCI"],
  },
  {
    id: "azure_sql_min_tls_old",
    level: "warning",
    title: "Azure SQL: minimum TLS version below 1.2",
    applies: (n) => n.type === "azure_sql",
    check: (n) => n.data?.config?.minimum_tls_version && n.data.config.minimum_tls_version !== "1.2",
    message: (n) => `${n.data.label} accepts TLS versions older than 1.2.`,
    fix: "Set minimum TLS version to 1.2 in the SQL component config.",
    suggestion: "Set `minimum_tls_version = '1.2'` on `azurerm_mssql_server`.",
    standards: ["CIS", "PCI"],
  },
  {
    id: "azure_sql_no_auditing",
    level: "warning",
    title: "Azure SQL: auditing not enabled",
    applies: (n) => n.type === "azure_sql",
    check: (n) => !n.data?.config?.auditing_enabled,
    message: (n) => `${n.data.label} does not have auditing enabled.`,
    fix: "Enable 'Auditing' in the SQL component config.",
    suggestion: "Generate `azurerm_mssql_server_extended_auditing_policy` with `storage_endpoint` and `retention_in_days >= 90`.",
    standards: ["CIS", "SOC2", "PCI", "HIPAA"],
  },
  {
    id: "azure_storage_public_access",
    level: "critical",
    title: "Azure Storage: public blob access allowed",
    applies: (n) => ["azure_blob", "azure_files", "azure_datalake", "azure_table", "azure_queue"].includes(n.type),
    check: (n) => n.data?.config?.allow_nested_items_to_be_public === true,
    message: (n) => `${n.data.label} allows public blob/container access.`,
    fix: "Set 'Allow Public Access' to false in the storage component config.",
    suggestion: "Set `allow_nested_items_to_be_public = false` on `azurerm_storage_account`. Require SAS tokens or managed identity.",
    standards: ["CIS", "NIST", "SOC2"],
  },
  {
    id: "azure_storage_https_only",
    level: "warning",
    title: "Azure Storage: HTTPS not enforced",
    applies: (n) => ["azure_blob", "azure_files", "azure_datalake", "azure_table", "azure_queue"].includes(n.type),
    check: (n) => n.data?.config?.enable_https_traffic_only === false,
    message: (n) => `${n.data.label} allows unencrypted HTTP traffic.`,
    fix: "Enable 'HTTPS Only' in the storage component config.",
    suggestion: "Set `enable_https_traffic_only = true` on `azurerm_storage_account`.",
    standards: ["CIS", "PCI"],
  },
  {
    id: "azure_storage_min_tls_old",
    level: "warning",
    title: "Azure Storage: minimum TLS below 1.2",
    applies: (n) => ["azure_blob", "azure_files", "azure_datalake", "azure_table", "azure_queue"].includes(n.type),
    check: (n) => n.data?.config?.min_tls_version && n.data.config.min_tls_version !== "TLS1_2",
    message: (n) => `${n.data.label} accepts TLS versions older than 1.2.`,
    fix: "Set min TLS version to TLS1_2 in the storage component config.",
    suggestion: "Set `min_tls_version = 'TLS1_2'` on `azurerm_storage_account`.",
    standards: ["CIS", "PCI"],
  },
  {
    id: "azure_keyvault_soft_delete_disabled",
    level: "critical",
    title: "Key Vault: soft delete not enabled",
    applies: (n) => n.type === "azure_keyvault",
    check: (n) => n.data?.config?.soft_delete_retention_days === 0 || n.data?.config?.soft_delete_enabled === false,
    message: (n) => `${n.data.label} does not have soft delete enabled. Secrets can be permanently deleted.`,
    fix: "Set soft delete retention days to at least 7 in the Key Vault config.",
    suggestion: "Set `soft_delete_retention_days = 90` on `azurerm_key_vault`.",
    standards: ["CIS", "NIST", "SOC2"],
  },
  {
    id: "azure_keyvault_purge_protection_disabled",
    level: "critical",
    title: "Key Vault: purge protection not enabled",
    applies: (n) => n.type === "azure_keyvault",
    check: (n) => n.data?.config?.purge_protection_enabled === false,
    message: (n) => `${n.data.label} does not have purge protection enabled.`,
    fix: "Enable 'Purge Protection' in the Key Vault component config.",
    suggestion: "Set `purge_protection_enabled = true` on `azurerm_key_vault`.",
    standards: ["CIS", "NIST", "SOC2"],
  },
  {
    id: "azure_functions_https_only",
    level: "warning",
    title: "Azure Functions: HTTPS not enforced",
    applies: (n) => n.type === "azure_functions",
    check: (n) => n.data?.config?.https_only === false,
    message: (n) => `${n.data.label} allows unencrypted HTTP traffic.`,
    fix: "Enable 'HTTPS Only' in the Functions component config.",
    suggestion: "Set `https_only = true` on `azurerm_linux_function_app`.",
    standards: ["CIS", "PCI"],
  },
  {
    id: "azure_app_service_https_only",
    level: "warning",
    title: "App Service: HTTPS not enforced",
    applies: (n) => n.type === "azure_app_service",
    check: (n) => n.data?.config?.https_only === false,
    message: (n) => `${n.data.label} allows unencrypted HTTP traffic.`,
    fix: "Enable 'HTTPS Only' in the App Service component config.",
    suggestion: "Set `https_only = true` on `azurerm_linux_web_app` or `azurerm_windows_web_app`.",
    standards: ["CIS", "PCI"],
  },
  {
    id: "azure_app_service_min_tls_old",
    level: "warning",
    title: "App Service: minimum TLS below 1.2",
    applies: (n) => n.type === "azure_app_service",
    check: (n) => n.data?.config?.minimum_tls_version && n.data.config.minimum_tls_version !== "1.2",
    message: (n) => `${n.data.label} accepts TLS versions below 1.2.`,
    fix: "Set minimum TLS version to 1.2 in the App Service component config.",
    suggestion: "Set `minimum_tls_version = '1.2'` in `site_config` on `azurerm_linux_web_app`.",
    standards: ["CIS", "PCI"],
  },
  {
    id: "azure_redis_non_ssl_port",
    level: "warning",
    title: "Azure Redis: non-SSL port enabled",
    applies: (n) => n.type === "azure_redis",
    check: (n) => n.data?.config?.enable_non_ssl_port === true,
    message: (n) => `${n.data.label} has the unencrypted Redis port (6379) enabled.`,
    fix: "Disable 'Non-SSL Port' in the Redis component config.",
    suggestion: "Set `enable_non_ssl_port = false` on `azurerm_redis_cache`. Always use SSL port 6380.",
    standards: ["CIS", "PCI"],
  },
  {
    id: "azure_redis_min_tls_old",
    level: "warning",
    title: "Azure Redis: minimum TLS below 1.2",
    applies: (n) => n.type === "azure_redis",
    check: (n) => n.data?.config?.minimum_tls_version && n.data.config.minimum_tls_version !== "1.2",
    message: (n) => `${n.data.label} accepts TLS versions below 1.2.`,
    fix: "Set minimum TLS version to 1.2 in the Redis component config.",
    suggestion: "Set `minimum_tls_version = '1.2'` on `azurerm_redis_cache`.",
    standards: ["CIS", "PCI"],
  },
  {
    id: "azure_postgres_ssl_disabled",
    level: "critical",
    title: "Azure PostgreSQL: SSL not enforced",
    applies: (n) => n.type === "azure_postgres",
    check: (n) => n.data?.config?.ssl_enforcement_enabled === false,
    message: (n) => `${n.data.label} does not enforce SSL connections.`,
    fix: "Enable 'SSL Enforcement' in the PostgreSQL component config.",
    suggestion: "Set `ssl_enforcement_enabled = true` on `azurerm_postgresql_flexible_server`.",
    standards: ["CIS", "HIPAA", "PCI"],
  },
  {
    id: "azure_mysql_ssl_disabled",
    level: "critical",
    title: "Azure MySQL: SSL not enforced",
    applies: (n) => n.type === "azure_mysql",
    check: (n) => n.data?.config?.ssl_enforcement_enabled === false,
    message: (n) => `${n.data.label} does not enforce SSL connections.`,
    fix: "Enable 'SSL Enforcement' in the MySQL component config.",
    suggestion: "Set `require_secure_transport = 'ON'` via `azurerm_mysql_flexible_server_configuration`.",
    standards: ["CIS", "HIPAA", "PCI"],
  },
  {
    id: "azure_acr_admin_enabled",
    level: "warning",
    title: "Container Registry: admin user enabled",
    applies: (n) => n.type === "azure_acr",
    check: (n) => n.data?.config?.admin_enabled === true,
    message: (n) => `${n.data.label} has the admin user enabled. Use managed identity instead.`,
    fix: "Disable 'Admin Enabled' in the Container Registry config.",
    suggestion: "Set `admin_enabled = false` on `azurerm_container_registry`. Use `azurerm_role_assignment` with AcrPull/AcrPush roles.",
    standards: ["CIS", "NIST"],
  },
  {
    id: "azure_agw_no_waf",
    level: "warning",
    title: "Application Gateway: WAF not enabled",
    applies: (n) => n.type === "azure_agw",
    check: (n) => n.data?.config?.sku_name && !String(n.data.config.sku_name).startsWith("WAF"),
    message: (n) => `${n.data.label} is not using the WAF_v2 SKU. Web traffic is not protected.`,
    fix: "Set SKU to WAF_v2 in the Application Gateway config.",
    suggestion: "Set `sku { name='WAF_v2' tier='WAF_v2' }` and add `waf_configuration { enabled=true mode='Prevention' }` on `azurerm_application_gateway`.",
    standards: ["CIS", "PCI", "SOC2"],
  },
  {
    id: "azure_cosmosdb_public_access",
    level: "warning",
    title: "CosmosDB: no network access restriction",
    applies: (n) => n.type === "azure_cosmosdb",
    check: (n) => !n.data?.config?.ip_range_filter && !n.data?.config?.virtual_network_rule,
    message: (n) => `${n.data.label} is accessible from all networks with no IP filtering.`,
    fix: "Set IP range filter or virtual network rule in the CosmosDB component config.",
    suggestion: "Set `ip_range_filter` or `virtual_network_rule` blocks on `azurerm_cosmosdb_account` to restrict access.",
    standards: ["CIS", "NIST"],
  },
  {
    id: "azure_vpn_gateway_basic_sku",
    level: "info",
    title: "VPN Gateway: Basic SKU does not support SLAs",
    applies: (n) => n.type === "azure_vpn_gateway",
    check: (n) => n.data?.config?.sku === "Basic",
    message: (n) => `${n.data.label} uses the Basic SKU which lacks SLA and zone-redundancy.`,
    fix: "Upgrade to VpnGw1 or higher in the VPN Gateway config.",
    suggestion: "Use `sku = 'VpnGw1'` or higher for production workloads on `azurerm_virtual_network_gateway`.",
    standards: ["NIST"],
  },
];

// ─── Azure Topology Rules ─────────────────────────────────────────────────────

const AZURE_TOPOLOGY_RULES = [
  {
    id: "azure_no_keyvault",
    level: "warning",
    title: "No Key Vault in architecture",
    applies: (n) => ["azure_sql", "azure_cosmosdb", "azure_postgres", "azure_mysql", "azure_redis", "azure_servicebus", "azure_eventhub"].includes(n.type),
    check: (n, edges, nodes) => !nodes.some((x) => x.type === "azure_keyvault"),
    message: (n) => `Architecture has databases/services but no Key Vault for secrets management.`,
    fix: "Add an Azure Key Vault component to store connection strings and secrets.",
    suggestion: "Add `azurerm_key_vault` with `purge_protection_enabled = true`. Store all passwords and connection strings as Key Vault secrets.",
    standards: ["CIS", "NIST", "SOC2"],
  },
  {
    id: "azure_no_log_analytics",
    level: "warning",
    title: "No Log Analytics workspace",
    applies: (n) => ["azure_aks", "azure_vm", "azure_app_service", "azure_functions"].includes(n.type),
    check: (n, edges, nodes) => !nodes.some((x) => x.type === "azure_log_analytics"),
    message: (n) => `${n.data.label} has no Log Analytics workspace for centralized logging.`,
    fix: "Add an Azure Log Analytics component to the architecture.",
    suggestion: "Add `azurerm_log_analytics_workspace` and configure diagnostic settings on all resources to send logs/metrics to it.",
    standards: ["CIS", "NIST", "SOC2"],
  },
  {
    id: "azure_no_monitor",
    level: "info",
    title: "No Azure Monitor or App Insights",
    applies: (n) => ["azure_app_service", "azure_functions", "azure_aks", "azure_vm"].includes(n.type),
    check: (n, edges, nodes) => !nodes.some((x) => ["azure_monitor", "azure_app_insights"].includes(x.type)),
    message: (n) => `${n.data.label} has no observability infrastructure (Monitor/App Insights).`,
    fix: "Add Azure Monitor or Application Insights to the architecture.",
    suggestion: "Add `azurerm_application_insights` for APM and `azurerm_monitor_metric_alert` for key metric thresholds.",
    standards: ["NIST", "SOC2"],
  },
  {
    id: "azure_no_backup",
    level: "warning",
    title: "No backup vault for stateful resources",
    applies: (n) => ["azure_vm", "azure_sql", "azure_postgres", "azure_mysql"].includes(n.type),
    check: (n, edges, nodes) => !nodes.some((x) => x.type === "azure_backup"),
    message: (n) => `${n.data.label} has no Azure Backup vault configured.`,
    fix: "Add an Azure Backup component to the architecture.",
    suggestion: "Add `azurerm_recovery_services_vault` and `azurerm_backup_policy_vm` to protect VMs and databases.",
    standards: ["CIS", "NIST", "SOC2", "HIPAA"],
  },
  {
    id: "azure_aks_no_acr",
    level: "info",
    title: "AKS without Container Registry",
    applies: (n) => n.type === "azure_aks",
    check: (n, edges, nodes) => !nodes.some((x) => x.type === "azure_acr"),
    message: (n) => `${n.data.label} has no Container Registry for storing container images.`,
    fix: "Add an Azure Container Registry component linked to AKS.",
    suggestion: "Add `azurerm_container_registry` (sku='Standard') and wire to AKS via `azurerm_role_assignment` with AcrPull role.",
    standards: ["NIST"],
  },
  {
    id: "azure_vm_no_bastion",
    level: "warning",
    title: "VMs present without Azure Bastion",
    applies: (n) => n.type === "azure_vm",
    check: (n, edges, nodes) => !nodes.some((x) => x.type === "azure_bastion"),
    message: (n) => `${n.data.label} is accessible without a Bastion host — RDP/SSH may be publicly exposed.`,
    fix: "Add Azure Bastion to the architecture for secure VM access.",
    suggestion: "Add `azurerm_bastion_host` in a dedicated AzureBastionSubnet. Disable public IPs on VMs.",
    standards: ["CIS", "NIST"],
  },
  {
    id: "azure_no_ddos_protection",
    level: "info",
    title: "No DDoS Protection Plan",
    applies: (n) => n.type === "azure_vnet",
    check: (n, edges, nodes) => !nodes.some((x) => x.type === "azure_ddos"),
    message: (n) => `${n.data.label} has no DDoS Protection Plan attached.`,
    fix: "Add an Azure DDoS Protection component to the architecture.",
    suggestion: "Add `azurerm_network_ddos_protection_plan` and reference it in the VNet `ddos_protection_plan` block.",
    standards: ["NIST", "PCI"],
  },
  {
    id: "azure_internet_facing_vm",
    level: "critical",
    title: "VM directly internet-facing",
    applies: (n) => n.type === "azure_vm",
    check: (n, edges, nodes) => {
      const neighbors = neighborIds(n.id, edges);
      const hasLBOrAGW = neighbors.some((nid) => {
        const nb = nodes.find((x) => x.id === nid);
        return nb && ["azure_agw", "azure_lb", "azure_frontdoor"].includes(nb.type);
      });
      const hasInternet = neighbors.some((nid) => {
        const nb = nodes.find((x) => x.id === nid);
        return nb && String(nb.data?.label ?? "").toLowerCase().includes("internet");
      });
      return hasInternet && !hasLBOrAGW;
    },
    message: (n) => `${n.data.label} appears to be directly internet-facing without a load balancer or Application Gateway.`,
    fix: "Place an Application Gateway or Load Balancer in front of the VM.",
    suggestion: "Add `azurerm_application_gateway` (WAF_v2) or `azurerm_lb` between the internet and the VM. Remove the VM public IP.",
    standards: ["CIS", "NIST", "PCI"],
  },
  {
    id: "azure_sql_no_private_endpoint",
    level: "warning",
    title: "Azure SQL: no Private Endpoint",
    applies: (n) => n.type === "azure_sql",
    check: (n, edges, nodes) => {
      const neighbors = neighborIds(n.id, edges);
      return !neighbors.some((nid) => nodes.find((x) => x.id === nid && x.type === "azure_private_endpoint"));
    },
    message: (n) => `${n.data.label} has no Private Endpoint. Database may be reachable over public internet.`,
    fix: "Add a Private Endpoint component connected to the SQL database.",
    suggestion: "Add `azurerm_private_endpoint` with subresource 'sqlServer'. Set `public_network_access_enabled = false` on the server.",
    standards: ["CIS", "NIST", "PCI"],
  },
  {
    id: "azure_storage_no_private_endpoint",
    level: "info",
    title: "Storage: no Private Endpoint",
    applies: (n) => ["azure_blob", "azure_datalake"].includes(n.type),
    check: (n, edges, nodes) => {
      const neighbors = neighborIds(n.id, edges);
      return !neighbors.some((nid) => nodes.find((x) => x.id === nid && x.type === "azure_private_endpoint"));
    },
    message: (n) => `${n.data.label} has no Private Endpoint. Storage is accessible over the public internet.`,
    fix: "Add a Private Endpoint connected to the storage account.",
    suggestion: "Add `azurerm_private_endpoint` with subresource 'blob' and set `public_network_access_enabled = false`.",
    standards: ["NIST", "SOC2"],
  },
  {
    id: "azure_apim_no_waf",
    level: "warning",
    title: "APIM: no WAF or Application Gateway in front",
    applies: (n) => n.type === "azure_apim",
    check: (n, edges, nodes) => {
      const neighbors = neighborIds(n.id, edges);
      return !neighbors.some((nid) => nodes.find((x) => x.id === nid && ["azure_agw", "azure_waf", "azure_frontdoor"].includes(x.type)));
    },
    message: (n) => `${n.data.label} has no WAF or Application Gateway protecting the gateway.`,
    fix: "Add an Azure Application Gateway (WAF_v2) or Azure Front Door in front of APIM.",
    suggestion: "Place `azurerm_application_gateway` with WAF_v2 SKU in front of APIM, or use Azure Front Door Premium with WAF policy.",
    standards: ["CIS", "PCI", "SOC2"],
  },
  {
    id: "azure_aks_no_defender",
    level: "warning",
    title: "AKS: Microsoft Defender for Containers not enabled",
    applies: (n) => n.type === "azure_aks",
    check: (n, edges, nodes) => !nodes.some((x) => x.type === "azure_defender"),
    message: (n) => `${n.data.label} has no Microsoft Defender for Containers.`,
    fix: "Add an Azure Defender component to the architecture.",
    suggestion: "Add `azurerm_security_center_subscription_pricing { resource_type='Containers' tier='Standard' }`.",
    standards: ["CIS", "NIST"],
  },
  {
    id: "azure_no_sentinel",
    level: "info",
    title: "No Microsoft Sentinel (SIEM)",
    applies: (n) => n.type === "azure_log_analytics",
    check: (n, edges, nodes) => !nodes.some((x) => x.type === "azure_sentinel"),
    message: (n) => `Log Analytics workspace present but no Microsoft Sentinel SIEM enabled.`,
    fix: "Add Microsoft Sentinel to the architecture for threat detection.",
    suggestion: "Add `azurerm_sentinel_log_analytics_workspace_onboarding` referencing the Log Analytics workspace.",
    standards: ["NIST", "SOC2"],
  },
];

// ─── Azure NSG Rules ──────────────────────────────────────────────────────────

const AZURE_NSG_RULES = [
  {
    id: "azure_nsg_ssh_open",
    level: "critical",
    title: "NSG: SSH (22) open to internet",
    check: (sg) => (sg.inbound ?? []).some((r) => ruleMatchesPort(r, 22) && isPublicCidr(r.source)),
    message: (sg) => `NSG "${sg.name}" allows SSH (port 22) from the internet (0.0.0.0/0).`,
    fix: "Restrict SSH to known IP ranges or use Azure Bastion.",
    suggestion: "Replace source_address_prefix with your office IP or Bastion subnet CIDR. Use Azure Bastion for all admin access.",
    canAcknowledge: true,
    standards: ["CIS", "NIST", "PCI"],
  },
  {
    id: "azure_nsg_rdp_open",
    level: "critical",
    title: "NSG: RDP (3389) open to internet",
    check: (sg) => (sg.inbound ?? []).some((r) => ruleMatchesPort(r, 3389) && isPublicCidr(r.source)),
    message: (sg) => `NSG "${sg.name}" allows RDP (port 3389) from the internet (0.0.0.0/0).`,
    fix: "Restrict RDP to known IP ranges or use Azure Bastion.",
    suggestion: "Replace source_address_prefix with your office IP. Use Azure Bastion for all remote desktop access.",
    canAcknowledge: true,
    standards: ["CIS", "NIST", "PCI"],
  },
  {
    id: "azure_nsg_all_traffic_open",
    level: "critical",
    title: "NSG: all inbound traffic allowed from internet",
    check: (sg) => sgAllowsAllTrafficFromPublic(sg),
    message: (sg) => `NSG "${sg.name}" allows all inbound traffic from the internet.`,
    fix: "Remove the catch-all allow-all inbound rule.",
    suggestion: "Replace the protocol=* allow-all rule with explicit rules for only the ports your application requires.",
    canAcknowledge: false,
    standards: ["CIS", "NIST", "PCI", "SOC2"],
  },
  {
    id: "azure_nsg_sql_server_open",
    level: "critical",
    title: "NSG: SQL Server (1433) open to internet",
    check: (sg) => (sg.inbound ?? []).some((r) => ruleMatchesPort(r, 1433) && isPublicCidr(r.source)),
    message: (sg) => `NSG "${sg.name}" allows SQL Server traffic (1433) from the internet.`,
    fix: "Restrict SQL Server port to the application subnet CIDR only.",
    suggestion: "Set source_address_prefix to the app subnet CIDR. Never expose database ports to the internet.",
    canAcknowledge: false,
    standards: ["CIS", "NIST", "PCI", "HIPAA"],
  },
  {
    id: "azure_nsg_postgres_open",
    level: "critical",
    title: "NSG: PostgreSQL (5432) open to internet",
    check: (sg) => (sg.inbound ?? []).some((r) => ruleMatchesPort(r, 5432) && isPublicCidr(r.source)),
    message: (sg) => `NSG "${sg.name}" allows PostgreSQL (5432) from the internet.`,
    fix: "Restrict PostgreSQL to the app tier subnet only.",
    suggestion: "Scope NSG rule source to the application subnet. Use Private Endpoint to remove public exposure entirely.",
    canAcknowledge: false,
    standards: ["CIS", "NIST", "PCI", "HIPAA"],
  },
  {
    id: "azure_nsg_mysql_open",
    level: "critical",
    title: "NSG: MySQL (3306) open to internet",
    check: (sg) => (sg.inbound ?? []).some((r) => ruleMatchesPort(r, 3306) && isPublicCidr(r.source)),
    message: (sg) => `NSG "${sg.name}" allows MySQL (3306) from the internet.`,
    fix: "Restrict MySQL to the app tier subnet only.",
    suggestion: "Scope NSG rule source to the application subnet. Use Private Endpoint to remove public exposure entirely.",
    canAcknowledge: false,
    standards: ["CIS", "NIST", "PCI", "HIPAA"],
  },
  {
    id: "azure_nsg_redis_open",
    level: "critical",
    title: "NSG: Redis (6380) open to internet",
    check: (sg) => (sg.inbound ?? []).some((r) => ruleMatchesPort(r, 6380) && isPublicCidr(r.source)),
    message: (sg) => `NSG "${sg.name}" allows Redis SSL port (6380) from the internet.`,
    fix: "Restrict Redis to the app tier subnet only.",
    suggestion: "Scope source_address_prefix to the application subnet CIDR. Redis should only be reachable from within the VNet.",
    canAcknowledge: false,
    standards: ["CIS", "NIST", "PCI"],
  },
  {
    id: "azure_nsg_mongodb_open",
    level: "critical",
    title: "NSG: MongoDB (27017) open to internet",
    check: (sg) => (sg.inbound ?? []).some((r) => ruleMatchesPort(r, 27017) && isPublicCidr(r.source)),
    message: (sg) => `NSG "${sg.name}" allows MongoDB (27017) from the internet.`,
    fix: "Restrict MongoDB port to the application subnet.",
    suggestion: "Scope NSG rule source to the app subnet CIDR. Use Private Endpoint for CosmosDB/MongoDB API.",
    canAcknowledge: false,
    standards: ["CIS", "NIST", "PCI"],
  },
  {
    id: "azure_nsg_wide_range_open",
    level: "warning",
    title: "NSG: wide port range open to internet",
    check: (sg) => (sg.inbound ?? []).some((r) => isWideRange(r)),
    message: (sg) => `NSG "${sg.name}" allows a wide port range from the internet.`,
    fix: "Narrow the port range to only required ports.",
    suggestion: "Replace wide port range rules with specific allowed ports per application requirement.",
    canAcknowledge: true,
    standards: ["CIS", "NIST"],
  },
];


// ─── Main compute function ────────────────────────────────────────────────────

function computeFindings(nodes, edges, securityGroups, iamRoles) {
  const sgs = Array.isArray(securityGroups) ? securityGroups : [];
  const roles = Array.isArray(iamRoles) ? iamRoles : [];
  const findings = [];

  // 1. Config-based rules (AWS + Azure)
  const allConfigRules = [...CONFIG_RULES, ...AZURE_CONFIG_RULES];
  for (const node of nodes) {
    for (const rule of allConfigRules) {
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
          suggestion: rule.suggestion ?? "",
          canAcknowledge: rule.canAcknowledge ?? false,
          standards: rule.standards ?? [],
          sgId: null,
        });
      }
    }
  }

  // 2. Topology-based rules (AWS + Azure)
  const allTopologyRules = [...TOPOLOGY_RULES, ...AZURE_TOPOLOGY_RULES];
  for (const node of nodes) {
    for (const rule of allTopologyRules) {
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
          suggestion: rule.suggestion ?? "",
          canAcknowledge: rule.canAcknowledge ?? false,
          standards: rule.standards ?? [],
          sgId: null,
        });
      }
    }
  }

  // 3. SG/NSG port inspection rules (AWS + Azure)
  const allSGRules = [...SG_RULES, ...AZURE_NSG_RULES];
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
    for (const rule of allSGRules) {
      if (!rule.check(sg)) continue;
      const sgNode = sgNodeById[sg.id];
      const sgFindingBase = {
        ruleId: rule.id,
        level: rule.level,
        title: rule.title,
        message: rule.message(sg),
        fix: rule.fix,
        suggestion: rule.suggestion ?? "",
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
          standards: rule.standards ?? [],
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
          standards: rule.standards ?? [],
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
        suggestion: rule.suggestion ?? "",
        canAcknowledge: rule.canAcknowledge ?? false,
        standards: rule.standards ?? [],
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
  dismissedIds: loadAcknowledged(),

  updateFindings(nodes, edges, securityGroups, iamRoles) {
    const { findings, nodeFindings, warnings } = computeFindings(
      nodes,
      edges,
      securityGroups,
      iamRoles,
    );
    set({ findings, nodeFindings, warnings });
  },

  dismissFinding(findingId) {
    const next = { ...get().dismissedIds, [findingId]: true };
    saveAcknowledged(next);
    set({ dismissedIds: next });
  },

  undismissFinding(findingId) {
    const next = { ...get().dismissedIds };
    delete next[findingId];
    saveAcknowledged(next);
    set({ dismissedIds: next });
  },

  clearDismissed() {
    saveAcknowledged({});
    set({ dismissedIds: {} });
  },

  get visibleFindings() {
    const { findings, dismissedIds } = get();
    return findings.filter((f) => !dismissedIds[f.id]);
  },

  get allRules() {
    return [
      ...CONFIG_RULES,
      ...AZURE_CONFIG_RULES,
      ...TOPOLOGY_RULES,
      ...AZURE_TOPOLOGY_RULES,
      ...SG_RULES,
      ...AZURE_NSG_RULES,
      ...IAM_RULES,
    ];
  },
}));

export default useValidationStore;
