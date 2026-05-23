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
    standards: ["SOC2", "PCI", "HIPAA"]
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
    standards: ["SOC2", "PCI", "HIPAA"]
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
    standards: ["SOC2", "PCI", "HIPAA"]
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
    standards: ["SOC2", "PCI", "HIPAA"]
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
    standards: ["CIS", "SOC2", "PCI"]
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
    standards: ["CIS", "PCI"],
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
    standards: ["CIS", "PCI", "HIPAA"],
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
    standards: ["PCI"],
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
    standards: ["PCI", "HIPAA"],
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
    standards: ["PCI", "HIPAA"],
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
    standards: ["CIS", "PCI"],
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
          suggestion: rule.suggestion ?? "",
          canAcknowledge: rule.canAcknowledge ?? false,
          standards: rule.standards ?? [],
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
          suggestion: rule.suggestion ?? "",
          canAcknowledge: rule.canAcknowledge ?? false,
          standards: rule.standards ?? [],
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

// ─── Store ───────────────────────────────────────────────────────────────────────────────────

const useValidationStore = create((set, get) => ({
  findings: [],
  nodeFindings: {},
  warnings: {},
  acknowledgedFindings: loadAcknowledged(),
  activeStandard: "all",  // "all" | "CIS" | "SOC2" | "PCI" | "HIPAA" | "NIST"

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

  setActiveStandard: (standard) => set({ activeStandard: standard }),

  // Returns findings filtered by activeStandard. "all" returns everything.
  filteredFindings: () => {
    const { findings, activeStandard } = get();
    if (!activeStandard || activeStandard === "all") return findings;
    return findings.filter((f) => (f.standards ?? []).includes(activeStandard));
  },

  // Load findings produced externally (archon-cli validate --format archon) into the store.
  loadExternalFindings: (rawFindings) => {
    const findings = rawFindings.map((f) => ({
      id: f.id ?? `${f.ruleId}::${f.nodeId}`,
      ruleId: f.ruleId,
      nodeId: f.nodeId,
      nodeLabel: f.nodeLabel,
      nodeType: f.nodeType,
      level: f.level,
      title: f.title,
      message: f.message,
      fix: f.fix,
      canAcknowledge: f.canAcknowledge ?? false,
      sgId: f.sgId ?? null,
      standards: f.standards ?? [],
    }));
    const nodeFindings = {};
    for (const f of findings) {
      if (!nodeFindings[f.nodeId]) nodeFindings[f.nodeId] = [];
      nodeFindings[f.nodeId].push(f);
    }
    const warnings = {};
    for (const [nid, flist] of Object.entries(nodeFindings)) {
      warnings[nid] = flist.map((f) => ({ message: f.message, level: f.level }));
    }
    set({ findings, nodeFindings, warnings });
  },
}));

export default useValidationStore;
