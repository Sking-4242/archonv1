/**
 * Architecture templates — pre-built node/edge sets ready to load onto the canvas.
 */

function nd(id, type, x, y, label, awsType, icon, category, extra = {}) {
  const isContainer = ["vpc", "subnet"].includes(type);
  return {
    id,
    type,
    position: { x, y },
    zIndex: type === "vpc" ? 0 : type === "subnet" ? 1 : 2,
    ...(isContainer
      ? { style: extra.style ?? { width: 360, height: 200 } }
      : {}),
    data: {
      label,
      awsType,
      icon,
      category,
      config: extra.config ?? {},
      security_group_ids: extra.sg ?? [],
      iam_role_id: extra.iam ?? null,
      subnet_id: extra.subnet_id ?? null,
      vpc_id: extra.vpc_id ?? null,
      instructions: extra.instructions ?? "",
    },
  };
}

function ed(id, source, target, type = "network", bidirectional = false) {
  return {
    id,
    source,
    target,
    type,
    data: { bidirectional },
    suggested_rules: [],
  };
}

// ── Template 1: 3-Tier Web App ────────────────────────────────────────────────
const threeTier = {
  id: "tpl-3tier",
  name: "3-Tier Web App",
  description:
    "Internet Gateway → ALB → EC2 (private) → RDS. Classic load-balanced web application with VPC and public/private subnets.",
  category: "Web",
  nodes: [
    nd("t1-vpc", "vpc", 50, 50, "Production VPC", "VPC", "🌐", "networking", {
      style: { width: 680, height: 420 },
      config: { cidr_block: "10.0.0.0/16" },
    }),
    nd(
      "t1-pub",
      "subnet",
      80,
      120,
      "Public Subnet",
      "Subnet",
      "🔲",
      "networking",
      {
        style: { width: 280, height: 140 },
        config: { cidr_block: "10.0.1.0/24", public: true },
        vpc_id: "t1-vpc",
      },
    ),
    nd(
      "t1-priv",
      "subnet",
      400,
      120,
      "Private Subnet",
      "Subnet",
      "🔲",
      "networking",
      {
        style: { width: 280, height: 140 },
        config: { cidr_block: "10.0.2.0/24", public: false },
        vpc_id: "t1-vpc",
      },
    ),
    nd(
      "t1-igw",
      "internet_gateway",
      340,
      -80,
      "Internet Gateway",
      "Internet Gateway",
      "🌍",
      "networking",
    ),
    nd(
      "t1-nat",
      "nat_gateway",
      120,
      320,
      "NAT Gateway",
      "NAT Gateway",
      "🔀",
      "networking",
      {
        config: { connectivity_type: "public" },
      },
    ),
    nd(
      "t1-alb",
      "alb",
      180,
      160,
      "App Load Balancer",
      "ALB",
      "⚡",
      "load_balancing",
      {
        subnet_id: "t1-pub",
        vpc_id: "t1-vpc",
        config: { scheme: "internet-facing" },
      },
    ),
    nd("t1-ec2", "ec2", 450, 160, "Web Server", "EC2", "🖥️", "compute", {
      subnet_id: "t1-priv",
      vpc_id: "t1-vpc",
      config: { instance_type: "t3.small" },
    }),
    nd("t1-rds", "rds", 450, 370, "Primary DB", "RDS", "🗄️", "database", {
      subnet_id: "t1-priv",
      vpc_id: "t1-vpc",
      config: {
        engine: "mysql",
        instance_class: "db.t3.micro",
        multi_az: false,
      },
    }),
  ],
  edges: [
    ed("t1-e1", "t1-igw", "t1-alb"),
    ed("t1-e2", "t1-alb", "t1-ec2"),
    ed("t1-e3", "t1-ec2", "t1-rds"),
    ed("t1-e4", "t1-ec2", "t1-nat", "network"),
  ],
  graphMeta: { name: "3-Tier Web App", provider: "aws", region: "us-east-1" },
};

// ── Template 2: Serverless Event Pipeline ────────────────────────────────────
const serverlessPipeline = {
  id: "tpl-serverless",
  name: "Serverless Event Pipeline",
  description:
    "EventBridge rule triggers Lambda, fans out to SQS queue and S3, with DynamoDB for state. Fully serverless — no EC2 or VPC required.",
  category: "Serverless",
  nodes: [
    nd(
      "t2-eb",
      "eventbridge",
      100,
      200,
      "Scheduled Rule",
      "EventBridge",
      "🌉",
      "integration",
      {
        config: { schedule_expression: "rate(5 minutes)" },
      },
    ),
    nd("t2-lam1", "lambda", 320, 200, "Processor", "Lambda", "λ", "compute", {
      config: { runtime: "python3.12", memory_size: 512, timeout: 30 },
    }),
    nd("t2-sqs", "sqs", 540, 120, "Work Queue", "SQS", "📬", "integration", {
      config: { fifo_queue: false },
    }),
    nd("t2-lam2", "lambda", 760, 120, "Consumer", "Lambda", "λ", "compute", {
      config: { runtime: "python3.12", memory_size: 256, timeout: 60 },
    }),
    nd("t2-s3", "s3", 540, 300, "Results Bucket", "S3", "🪣", "storage", {
      config: { versioning: false },
    }),
    nd(
      "t2-ddb",
      "dynamodb",
      760,
      300,
      "State Table",
      "DynamoDB",
      "⚡",
      "database",
      {
        config: { billing_mode: "PAY_PER_REQUEST", hash_key: "id" },
      },
    ),
    nd("t2-sns", "sns", 980, 200, "Notifications", "SNS", "📣", "integration"),
  ],
  edges: [
    ed("t2-e1", "t2-eb", "t2-lam1", "dataflow"),
    ed("t2-e2", "t2-lam1", "t2-sqs", "dataflow"),
    ed("t2-e3", "t2-sqs", "t2-lam2", "dataflow"),
    ed("t2-e4", "t2-lam1", "t2-s3", "dataflow"),
    ed("t2-e5", "t2-lam2", "t2-ddb", "dataflow"),
    ed("t2-e6", "t2-lam2", "t2-sns", "dataflow"),
  ],
  graphMeta: {
    name: "Serverless Event Pipeline",
    provider: "aws",
    region: "us-east-1",
  },
};

// ── Template 3: VPC Foundation ────────────────────────────────────────────────
const vpcFoundation = {
  id: "tpl-vpc",
  name: "VPC Foundation",
  description:
    "Production-ready VPC with public and private subnets, Internet Gateway, NAT Gateway, and Elastic IP.",
  category: "Networking",
  nodes: [
    nd("t3-vpc", "vpc", 50, 50, "Production VPC", "VPC", "🌐", "networking", {
      style: { width: 680, height: 400 },
      config: {
        cidr_block: "10.0.0.0/16",
        enable_dns_support: true,
        enable_dns_hostnames: true,
      },
    }),
    nd(
      "t3-pub1",
      "subnet",
      80,
      120,
      "Public Subnet AZ-1",
      "Subnet",
      "🔲",
      "networking",
      {
        style: { width: 270, height: 130 },
        config: {
          cidr_block: "10.0.1.0/24",
          availability_zone: "us-east-1a",
          public: true,
        },
        vpc_id: "t3-vpc",
      },
    ),
    nd(
      "t3-pub2",
      "subnet",
      390,
      120,
      "Public Subnet AZ-2",
      "Subnet",
      "🔲",
      "networking",
      {
        style: { width: 270, height: 130 },
        config: {
          cidr_block: "10.0.2.0/24",
          availability_zone: "us-east-1b",
          public: true,
        },
        vpc_id: "t3-vpc",
      },
    ),
    nd(
      "t3-priv",
      "subnet",
      80,
      290,
      "Private Subnet",
      "Subnet",
      "🔲",
      "networking",
      {
        style: { width: 580, height: 130 },
        config: {
          cidr_block: "10.0.3.0/24",
          availability_zone: "us-east-1a",
          public: false,
        },
        vpc_id: "t3-vpc",
      },
    ),
    nd(
      "t3-igw",
      "internet_gateway",
      360,
      -80,
      "Internet Gateway",
      "Internet Gateway",
      "🌍",
      "networking",
    ),
    nd(
      "t3-eip",
      "elastic_ip",
      800,
      -80,
      "NAT EIP",
      "Elastic IP",
      "📌",
      "networking",
      {
        config: { domain: "vpc" },
      },
    ),
    nd(
      "t3-nat",
      "nat_gateway",
      140,
      165,
      "NAT Gateway",
      "NAT Gateway",
      "🔀",
      "networking",
      {
        config: { connectivity_type: "public" },
      },
    ),
    nd(
      "t3-rt1",
      "route_table",
      490,
      -80,
      "Public Route Table",
      "Route Table",
      "🗺️",
      "networking",
    ),
    nd(
      "t3-rt2",
      "route_table",
      640,
      -80,
      "Private Route Table",
      "Route Table",
      "🗺️",
      "networking",
    ),
  ],
  edges: [
    ed("t3-e1", "t3-igw", "t3-rt1", "dependency"),
    ed("t3-e2", "t3-eip", "t3-nat", "dependency"),
    ed("t3-e3", "t3-nat", "t3-rt2", "dependency"),
    ed("t3-e4", "t3-rt1", "t3-pub1", "dependency"),
    ed("t3-e5", "t3-rt1", "t3-pub2", "dependency"),
    ed("t3-e6", "t3-rt2", "t3-priv", "dependency"),
  ],
  graphMeta: { name: "VPC Foundation", provider: "aws", region: "us-east-1" },
};

// ── Template 4: HA Web App + Cache ────────────────────────────────────────────
const haWebCache = {
  id: "tpl-ha-cache",
  name: "HA Web App + Cache",
  description:
    "ALB → Auto Scaling EC2 → ElastiCache (Redis) + RDS (Multi-AZ). Horizontally scalable web tier with caching and a highly available database.",
  category: "Web",
  nodes: [
    nd("t4-vpc", "vpc", 50, 50, "Production VPC", "VPC", "🌐", "networking", {
      style: { width: 800, height: 460 },
      config: { cidr_block: "10.0.0.0/16" },
    }),
    nd(
      "t4-pub",
      "subnet",
      80,
      120,
      "Public Subnet",
      "Subnet",
      "🔲",
      "networking",
      {
        style: { width: 300, height: 140 },
        config: { cidr_block: "10.0.1.0/24", public: true },
        vpc_id: "t4-vpc",
      },
    ),
    nd(
      "t4-priv",
      "subnet",
      430,
      120,
      "Private Subnet",
      "Subnet",
      "🔲",
      "networking",
      {
        style: { width: 380, height: 140 },
        config: { cidr_block: "10.0.2.0/24", public: false },
        vpc_id: "t4-vpc",
      },
    ),
    nd(
      "t4-igw",
      "internet_gateway",
      400,
      -80,
      "Internet Gateway",
      "Internet Gateway",
      "🌍",
      "networking",
    ),
    nd(
      "t4-alb",
      "alb",
      180,
      160,
      "App Load Balancer",
      "ALB",
      "⚡",
      "load_balancing",
      {
        subnet_id: "t4-pub",
        vpc_id: "t4-vpc",
        config: { scheme: "internet-facing" },
      },
    ),
    nd(
      "t4-asg",
      "auto_scaling_group",
      480,
      160,
      "Web Tier ASG",
      "Auto Scaling Group",
      "⚖️",
      "compute",
      {
        subnet_id: "t4-priv",
        vpc_id: "t4-vpc",
        config: { min_size: 2, max_size: 6, desired_capacity: 2 },
      },
    ),
    nd(
      "t4-redis",
      "elasticache",
      480,
      330,
      "Redis Cache",
      "ElastiCache",
      "🚀",
      "database",
      {
        subnet_id: "t4-priv",
        vpc_id: "t4-vpc",
        config: { engine: "redis", node_type: "cache.t3.micro" },
      },
    ),
    nd("t4-rds", "rds", 680, 330, "Primary DB", "RDS", "🗄️", "database", {
      subnet_id: "t4-priv",
      vpc_id: "t4-vpc",
      config: {
        engine: "postgres",
        instance_class: "db.t3.small",
        multi_az: true,
      },
    }),
    nd(
      "t4-kms",
      "kms_key",
      900,
      300,
      "Encryption Key",
      "KMS Key",
      "🔐",
      "security",
    ),
  ],
  edges: [
    ed("t4-e1", "t4-igw", "t4-alb"),
    ed("t4-e2", "t4-alb", "t4-asg"),
    ed("t4-e3", "t4-asg", "t4-redis", "network"),
    ed("t4-e4", "t4-asg", "t4-rds"),
    ed("t4-e5", "t4-rds", "t4-kms", "dependency"),
    ed("t4-e6", "t4-redis", "t4-kms", "dependency"),
  ],
  graphMeta: {
    name: "HA Web App + Cache",
    provider: "aws",
    region: "us-east-1",
  },
};

// ── Template 5: Event-Driven Analytics ───────────────────────────────────────
const analyticsIngestion = {
  id: "tpl-analytics",
  name: "Event-Driven Analytics",
  description:
    "SNS fan-out to SQS queues, Lambda processors write to DynamoDB and S3 data lake. Supports multiple parallel processing paths.",
  category: "Data",
  nodes: [
    nd("t5-sns", "sns", 300, 80, "Ingest Topic", "SNS", "📣", "integration"),
    nd(
      "t5-sqs1",
      "sqs",
      100,
      250,
      "Processing Queue",
      "SQS",
      "📬",
      "integration",
      {
        config: { visibility_timeout_seconds: 300 },
      },
    ),
    nd(
      "t5-sqs2",
      "sqs",
      500,
      250,
      "Analytics Queue",
      "SQS",
      "📬",
      "integration",
      {
        config: { visibility_timeout_seconds: 300 },
      },
    ),
    nd(
      "t5-lam1",
      "lambda",
      100,
      420,
      "Record Processor",
      "Lambda",
      "λ",
      "compute",
      {
        config: { runtime: "python3.12", memory_size: 512, timeout: 300 },
      },
    ),
    nd(
      "t5-lam2",
      "lambda",
      500,
      420,
      "Analytics Writer",
      "Lambda",
      "λ",
      "compute",
      {
        config: { runtime: "python3.12", memory_size: 1024, timeout: 300 },
      },
    ),
    nd(
      "t5-ddb",
      "dynamodb",
      -80,
      580,
      "Records Table",
      "DynamoDB",
      "⚡",
      "database",
      {
        config: {
          billing_mode: "PAY_PER_REQUEST",
          hash_key: "pk",
          range_key: "sk",
        },
      },
    ),
    nd("t5-s3", "s3", 300, 580, "Data Lake", "S3", "🪣", "storage", {
      config: { versioning: true, server_side_encryption: "AES256" },
    }),
    nd(
      "t5-eb",
      "eventbridge",
      740,
      80,
      "Schedule",
      "EventBridge",
      "🌉",
      "integration",
    ),
    nd("t5-kms", "kms_key", 300, -80, "Data Key", "KMS Key", "🔐", "security"),
  ],
  edges: [
    ed("t5-e1", "t5-sns", "t5-sqs1", "dataflow"),
    ed("t5-e2", "t5-sns", "t5-sqs2", "dataflow"),
    ed("t5-e3", "t5-sqs1", "t5-lam1", "dataflow"),
    ed("t5-e4", "t5-sqs2", "t5-lam2", "dataflow"),
    ed("t5-e5", "t5-lam1", "t5-ddb", "dataflow"),
    ed("t5-e6", "t5-lam1", "t5-s3", "dataflow"),
    ed("t5-e7", "t5-lam2", "t5-s3", "dataflow"),
    ed("t5-e8", "t5-eb", "t5-lam2", "dataflow"),
    ed("t5-e9", "t5-s3", "t5-kms", "dependency"),
  ],
  graphMeta: {
    name: "Event-Driven Analytics",
    provider: "aws",
    region: "us-east-1",
  },
};

export const TEMPLATES = [
  threeTier,
  serverlessPipeline,
  vpcFoundation,
  haWebCache,
  analyticsIngestion,
];
