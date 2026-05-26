/**
 * usageSchema.js
 *
 * Defines the usage input fields for every AWS service type that is billed on
 * usage rather than (or in addition to) a flat hourly rate.
 *
 * Structure per entry:
 *   [component_type]: {
 *     label:       Human-readable service name shown in the Usage panel
 *     fields: [
 *       {
 *         key:         Storage key used in usageStore
 *         label:       Field label shown in the UI
 *         unit:        Unit suffix displayed next to the input
 *         default:     Pre-filled default value (matches pricing.py assumptions)
 *         description: Tooltip / helper text
 *       }
 *     ]
 *   }
 *
 * Services that are purely instance-hour billed (EC2, RDS, etc.) get a single
 * "hours_per_month" field so users can model partial utilisation.
 *
 * If a service type is not present here it has no usage inputs (free tier or
 * flat-rate services such as VPC, subnet, IAM role).
 */

const USAGE_SCHEMA = {

  // ── Compute ────────────────────────────────────────────────────────────────

  ec2: {
    label: "EC2 Instance",
    fields: [
      {
        key: "hours_per_month",
        label: "Hours running / month",
        unit: "hrs",
        default: 730,
        description: "730 = always on. Reduce for scheduled or dev instances.",
      },
      {
        key: "data_transfer_gb",
        label: "Data transfer out",
        unit: "GB/mo",
        default: 10,
        description: "Outbound data transfer. First 100 GB/mo is $0.09/GB.",
      },
    ],
  },

  lambda: {
    label: "Lambda",
    fields: [
      {
        key: "invocations_monthly",
        label: "Invocations / month",
        unit: "requests",
        default: 1_000_000,
        description: "Total function invocations per month.",
      },
      {
        key: "avg_duration_ms",
        label: "Avg duration",
        unit: "ms",
        default: 200,
        description: "Average execution time per invocation in milliseconds.",
      },
      {
        key: "memory_mb",
        label: "Memory",
        unit: "MB",
        default: 128,
        description: "Allocated memory. Affects GB-second cost.",
      },
    ],
  },

  ecs_fargate: {
    label: "ECS Fargate",
    fields: [
      {
        key: "vcpu",
        label: "vCPU",
        unit: "vCPU",
        default: 0.25,
        description: "vCPU allocated to the task.",
      },
      {
        key: "memory_gb",
        label: "Memory",
        unit: "GB",
        default: 0.5,
        description: "Memory allocated to the task in GB.",
      },
      {
        key: "hours_per_month",
        label: "Hours running / month",
        unit: "hrs",
        default: 730,
        description: "730 = always on.",
      },
    ],
  },

  eks: {
    label: "EKS Cluster",
    fields: [
      {
        key: "hours_per_month",
        label: "Cluster hours / month",
        unit: "hrs",
        default: 730,
        description: "EKS charges $0.10/hr per cluster.",
      },
    ],
  },

  app_runner: {
    label: "App Runner",
    fields: [
      {
        key: "vcpu",
        label: "vCPU",
        unit: "vCPU",
        default: 1,
        description: "vCPU allocated.",
      },
      {
        key: "memory_gb",
        label: "Memory",
        unit: "GB",
        default: 2,
        description: "Memory allocated in GB.",
      },
      {
        key: "hours_per_month",
        label: "Active hours / month",
        unit: "hrs",
        default: 730,
        description: "Hours the service is actively processing requests.",
      },
    ],
  },

  // ── Storage ─────────────────────────────────────────────────────────────

  s3: {
    label: "S3",
    fields: [
      {
        key: "storage_gb",
        label: "Storage",
        unit: "GB/mo",
        default: 100,
        description: "Total data stored in Standard storage class.",
      },
      {
        key: "put_requests",
        label: "PUT / COPY / POST requests",
        unit: "k/mo",
        default: 100,
        description: "Thousands of write requests per month.",
      },
      {
        key: "get_requests",
        label: "GET / SELECT requests",
        unit: "k/mo",
        default: 1_000,
        description: "Thousands of read requests per month.",
      },
      {
        key: "data_transfer_gb",
        label: "Data transfer out",
        unit: "GB/mo",
        default: 10,
        description: "Outbound data transfer from S3.",
      },
    ],
  },

  ebs: {
    label: "EBS Volume",
    fields: [
      {
        key: "storage_gb",
        label: "Volume size",
        unit: "GB",
        default: 80,
        description: "Provisioned volume size. gp3 at $0.08/GB-month.",
      },
      {
        key: "iops",
        label: "Provisioned IOPS",
        unit: "IOPS",
        default: 3000,
        description: "IOPS above 3,000 baseline cost $0.005/IOPS-month.",
      },
    ],
  },

  efs: {
    label: "EFS",
    fields: [
      {
        key: "storage_gb",
        label: "Storage",
        unit: "GB/mo",
        default: 10,
        description: "Data stored in EFS Standard at $0.30/GB-month.",
      },
    ],
  },

  s3_glacier: {
    label: "S3 Glacier",
    fields: [
      {
        key: "storage_gb",
        label: "Storage",
        unit: "GB/mo",
        default: 10,
        description: "Data stored in Glacier Flexible Retrieval at $0.004/GB-month.",
      },
    ],
  },

  fsx: {
    label: "FSx",
    fields: [
      {
        key: "storage_gb",
        label: "Storage",
        unit: "GB",
        default: 300,
        description: "Provisioned SSD storage.",
      },
    ],
  },

  backup: {
    label: "AWS Backup",
    fields: [
      {
        key: "storage_gb",
        label: "Warm backup storage",
        unit: "GB/mo",
        default: 100,
        description: "Data stored in warm backup tier at $0.05/GB-month.",
      },
    ],
  },

  // ── Database ───────────────────────────────────────────────────────────

  rds: {
    label: "RDS",
    fields: [
      {
        key: "hours_per_month",
        label: "Hours running / month",
        unit: "hrs",
        default: 730,
        description: "730 = always on. Reduce for dev/test instances.",
      },
      {
        key: "storage_gb",
        label: "Storage",
        unit: "GB",
        default: 20,
        description: "Provisioned storage at $0.115/GB-month (gp2).",
      },
    ],
  },

  aurora: {
    label: "Aurora",
    fields: [
      {
        key: "hours_per_month",
        label: "Instance hours / month",
        unit: "hrs",
        default: 730,
        description: "730 = always on.",
      },
      {
        key: "storage_gb",
        label: "Storage",
        unit: "GB/mo",
        default: 20,
        description: "Aurora storage at $0.10/GB-month.",
      },
      {
        key: "io_millions",
        label: "I/O requests",
        unit: "M/mo",
        default: 1,
        description: "Millions of I/O requests at $0.20/million.",
      },
    ],
  },

  dynamodb: {
    label: "DynamoDB",
    fields: [
      {
        key: "write_units_monthly",
        label: "Write request units",
        unit: "M/mo",
        default: 1,
        description: "Millions of write request units (WRU) at $1.25/million.",
      },
      {
        key: "read_units_monthly",
        label: "Read request units",
        unit: "M/mo",
        default: 4,
        description: "Millions of read request units (RRU) at $0.25/million.",
      },
      {
        key: "storage_gb",
        label: "Storage",
        unit: "GB/mo",
        default: 1,
        description: "Data stored at $0.25/GB-month.",
      },
    ],
  },

  elasticache: {
    label: "ElastiCache",
    fields: [
      {
        key: "hours_per_month",
        label: "Hours running / month",
        unit: "hrs",
        default: 730,
        description: "730 = always on.",
      },
    ],
  },

  redshift: {
    label: "Redshift",
    fields: [
      {
        key: "hours_per_month",
        label: "Hours running / month",
        unit: "hrs",
        default: 730,
        description: "730 = always on. dc2.large at $0.25/node-hr.",
      },
      {
        key: "num_nodes",
        label: "Nodes",
        unit: "nodes",
        default: 1,
        description: "Number of dc2.large nodes.",
      },
    ],
  },

  documentdb: {
    label: "DocumentDB",
    fields: [
      {
        key: "hours_per_month",
        label: "Hours running / month",
        unit: "hrs",
        default: 730,
        description: "730 = always on.",
      },
    ],
  },

  neptune: {
    label: "Neptune",
    fields: [
      {
        key: "hours_per_month",
        label: "Hours running / month",
        unit: "hrs",
        default: 730,
        description: "730 = always on.",
      },
    ],
  },

  opensearch: {
    label: "OpenSearch",
    fields: [
      {
        key: "hours_per_month",
        label: "Hours running / month",
        unit: "hrs",
        default: 730,
        description: "730 = always on. 2× t3.small.search nodes.",
      },
      {
        key: "num_nodes",
        label: "Nodes",
        unit: "nodes",
        default: 2,
        description: "Number of data nodes.",
      },
    ],
  },

  timestream: {
    label: "Timestream",
    fields: [
      {
        key: "writes_gb",
        label: "Data written",
        unit: "GB/mo",
        default: 1,
        description: "Data ingested at $0.50/GB.",
      },
      {
        key: "queries_gb",
        label: "Data scanned (queries)",
        unit: "GB/mo",
        default: 10,
        description: "Data scanned by queries at $0.01/GB.",
      },
    ],
  },

  // ── Networking ─────────────────────────────────────────────────────────

  nat_gateway: {
    label: "NAT Gateway",
    fields: [
      {
        key: "hours_per_month",
        label: "Hours active / month",
        unit: "hrs",
        default: 730,
        description: "NAT Gateway charges $0.045/hr.",
      },
      {
        key: "data_processed_gb",
        label: "Data processed",
        unit: "GB/mo",
        default: 100,
        description: "Data processed at $0.045/GB.",
      },
    ],
  },

  cloudfront: {
    label: "CloudFront",
    fields: [
      {
        key: "requests_monthly",
        label: "HTTPS requests",
        unit: "M/mo",
        default: 10,
        description: "Millions of HTTPS requests per month.",
      },
      {
        key: "data_transfer_gb",
        label: "Data transfer out",
        unit: "GB/mo",
        default: 10,
        description: "Outbound data transferred from CloudFront edge.",
      },
    ],
  },

  elb: {
    label: "Application Load Balancer",
    fields: [
      {
        key: "hours_per_month",
        label: "Hours active / month",
        unit: "hrs",
        default: 730,
        description: "ALB charges $0.008/hr regardless of traffic.",
      },
      {
        key: "lcus_per_hour",
        label: "LCUs per hour",
        unit: "LCU",
        default: 1,
        description: "Load Balancer Capacity Units. Each LCU costs $0.008/hr.",
      },
    ],
  },

  alb: {
    label: "Application Load Balancer",
    fields: [
      {
        key: "hours_per_month",
        label: "Hours active / month",
        unit: "hrs",
        default: 730,
        description: "ALB charges $0.008/hr regardless of traffic.",
      },
      {
        key: "lcus_per_hour",
        label: "LCUs per hour",
        unit: "LCU",
        default: 1,
        description: "Load Balancer Capacity Units. Each LCU costs $0.008/hr.",
      },
    ],
  },

  nlb: {
    label: "Network Load Balancer",
    fields: [
      {
        key: "hours_per_month",
        label: "Hours active / month",
        unit: "hrs",
        default: 730,
        description: "NLB charges $0.006/hr.",
      },
      {
        key: "lcus_per_hour",
        label: "LCUs per hour",
        unit: "LCU",
        default: 1,
        description: "Each NLCU costs $0.006/hr.",
      },
    ],
  },

  vpc_endpoint: {
    label: "VPC Interface Endpoint",
    fields: [
      {
        key: "hours_per_month",
        label: "Hours active / month",
        unit: "hrs",
        default: 730,
        description: "$0.01/hr per endpoint per AZ.",
      },
      {
        key: "data_processed_gb",
        label: "Data processed",
        unit: "GB/mo",
        default: 10,
        description: "$0.01/GB processed through the endpoint.",
      },
    ],
  },

  // ── API & Integration ──────────────────────────────────────────────────

  api_gateway: {
    label: "API Gateway",
    fields: [
      {
        key: "calls_monthly",
        label: "API calls",
        unit: "M/mo",
        default: 1,
        description: "Millions of REST API calls at $3.50/million.",
      },
      {
        key: "data_transfer_gb",
        label: "Data transfer out",
        unit: "GB/mo",
        default: 1,
        description: "Outbound data at $0.09/GB.",
      },
    ],
  },

  sqs: {
    label: "SQS",
    fields: [
      {
        key: "requests_monthly",
        label: "Requests",
        unit: "M/mo",
        default: 1,
        description: "Millions of SQS API requests at $0.40/million (standard queue).",
      },
    ],
  },

  sns: {
    label: "SNS",
    fields: [
      {
        key: "notifications_monthly",
        label: "Notifications",
        unit: "M/mo",
        default: 1,
        description: "Millions of SNS notifications at $0.50/million.",
      },
    ],
  },

  kinesis: {
    label: "Kinesis Data Streams",
    fields: [
      {
        key: "shards",
        label: "Shards",
        unit: "shards",
        default: 1,
        description: "Each shard costs $0.015/hr.",
      },
      {
        key: "put_units_monthly",
        label: "PUT payload units",
        unit: "M/mo",
        default: 1,
        description: "Millions of 25 KB PUT units at $0.014/million.",
      },
    ],
  },

  kinesis_firehose: {
    label: "Kinesis Firehose",
    fields: [
      {
        key: "data_ingested_gb",
        label: "Data ingested",
        unit: "GB/mo",
        default: 1,
        description: "Data delivered at $0.029/GB (first 500 TB).",
      },
    ],
  },

  eventbridge: {
    label: "EventBridge",
    fields: [
      {
        key: "events_monthly",
        label: "Custom events",
        unit: "M/mo",
        default: 1,
        description: "Millions of custom events at $1.00/million.",
      },
    ],
  },

  mq: {
    label: "Amazon MQ",
    fields: [
      {
        key: "hours_per_month",
        label: "Broker hours / month",
        unit: "hrs",
        default: 730,
        description: "mq.m5.large single-instance broker at $0.149/hr.",
      },
    ],
  },

  appsync: {
    label: "AppSync",
    fields: [
      {
        key: "operations_monthly",
        label: "Query / mutation operations",
        unit: "M/mo",
        default: 4,
        description: "Millions of GraphQL operations at $4.00/million.",
      },
    ],
  },

  step_functions: {
    label: "Step Functions",
    fields: [
      {
        key: "transitions_monthly",
        label: "State transitions",
        unit: "k/mo",
        default: 1_000,
        description: "Thousands of state transitions at $0.025/1,000 (Standard).",
      },
    ],
  },

  // ── Analytics ──────────────────────────────────────────────────────────

  athena: {
    label: "Athena",
    fields: [
      {
        key: "tb_scanned_monthly",
        label: "Data scanned",
        unit: "TB/mo",
        default: 1,
        description: "TB of data scanned per query run at $5.00/TB.",
      },
    ],
  },

  glue: {
    label: "AWS Glue",
    fields: [
      {
        key: "dpu_hours_monthly",
        label: "DPU-hours / month",
        unit: "DPU-hrs",
        default: 88,
        description: "Data Processing Units × hours. Each DPU-hour costs $0.44.",
      },
    ],
  },

  msk: {
    label: "Amazon MSK",
    fields: [
      {
        key: "brokers",
        label: "Broker count",
        unit: "brokers",
        default: 3,
        description: "Number of kafka.m5.large brokers.",
      },
      {
        key: "hours_per_month",
        label: "Hours running / month",
        unit: "hrs",
        default: 730,
        description: "730 = always on. Each broker at $0.149/hr.",
      },
    ],
  },

  // ── Monitoring & Security ──────────────────────────────────────────────

  cloudwatch: {
    label: "CloudWatch",
    fields: [
      {
        key: "custom_metrics",
        label: "Custom metrics",
        unit: "metrics",
        default: 10,
        description: "Custom metrics at $0.30/metric/month.",
      },
      {
        key: "log_gb_monthly",
        label: "Log data ingested",
        unit: "GB/mo",
        default: 5,
        description: "Log ingestion at $0.50/GB.",
      },
      {
        key: "log_storage_gb",
        label: "Log storage",
        unit: "GB/mo",
        default: 20,
        description: "Log archive storage at $0.03/GB-month.",
      },
    ],
  },

  cloudtrail: {
    label: "CloudTrail",
    fields: [
      {
        key: "events_monthly",
        label: "Management events",
        unit: "k/mo",
        default: 100,
        description: "First trail free. Additional event delivery $2.00/100k.",
      },
    ],
  },

  guardduty: {
    label: "GuardDuty",
    fields: [
      {
        key: "cloudtrail_gb",
        label: "CloudTrail data analyzed",
        unit: "GB/mo",
        default: 5,
        description: "GB of CloudTrail events analyzed per month.",
      },
      {
        key: "dns_gb",
        label: "DNS logs analyzed",
        unit: "GB/mo",
        default: 2,
        description: "GB of DNS query logs analyzed per month.",
      },
    ],
  },

  inspector: {
    label: "Inspector",
    fields: [
      {
        key: "ec2_instances",
        label: "EC2 instances scanned",
        unit: "instances",
        default: 1,
        description: "EC2 assessments at $2.00/instance-month.",
      },
    ],
  },

  security_hub: {
    label: "Security Hub",
    fields: [
      {
        key: "checks_monthly",
        label: "Security checks",
        unit: "k/mo",
        default: 10,
        description: "Thousands of security checks at $0.0010/check.",
      },
    ],
  },

  macie: {
    label: "Macie",
    fields: [
      {
        key: "s3_gb_scanned",
        label: "S3 data scanned",
        unit: "GB/mo",
        default: 1,
        description: "GB of S3 data classified at $1.00/GB.",
      },
    ],
  },

  waf: {
    label: "WAF",
    fields: [
      {
        key: "requests_monthly",
        label: "Web requests",
        unit: "M/mo",
        default: 1,
        description: "Millions of web requests at $0.60/million.",
      },
    ],
  },

  xray: {
    label: "X-Ray",
    fields: [
      {
        key: "traces_monthly",
        label: "Traces recorded",
        unit: "k/mo",
        default: 100,
        description: "Thousands of traces. First 100K/mo free, then $5.00/million.",
      },
    ],
  },

  config: {
    label: "AWS Config",
    fields: [
      {
        key: "config_items_monthly",
        label: "Config items recorded",
        unit: "k/mo",
        default: 100,
        description: "Thousands of configuration item recordings at $0.003/item.",
      },
    ],
  },

  // ── Secrets & Identity ─────────────────────────────────────────────────

  secretsmanager: {
    label: "Secrets Manager",
    fields: [
      {
        key: "secrets",
        label: "Secrets stored",
        unit: "secrets",
        default: 1,
        description: "$0.40/secret/month.",
      },
      {
        key: "api_calls_monthly",
        label: "API calls",
        unit: "k/mo",
        default: 10,
        description: "Thousands of GetSecretValue calls at $0.05/10,000.",
      },
    ],
  },

  cognito: {
    label: "Cognito",
    fields: [
      {
        key: "maus",
        label: "Monthly Active Users",
        unit: "MAUs",
        default: 1_000,
        description: "First 50K MAUs free, then $0.0055/MAU.",
      },
    ],
  },

  kms: {
    label: "KMS",
    fields: [
      {
        key: "keys",
        label: "Customer managed keys",
        unit: "keys",
        default: 1,
        description: "$1.00/key/month.",
      },
      {
        key: "api_calls_monthly",
        label: "API requests",
        unit: "k/mo",
        default: 20,
        description: "Thousands of cryptographic requests at $0.03/10,000.",
      },
    ],
  },

  route53: {
    label: "Route 53",
    fields: [
      {
        key: "hosted_zones",
        label: "Hosted zones",
        unit: "zones",
        default: 1,
        description: "$0.50/hosted zone/month.",
      },
      {
        key: "queries_monthly",
        label: "DNS queries",
        unit: "M/mo",
        default: 1,
        description: "Millions of DNS queries at $0.40/million (first 1B).",
      },
    ],
  },

  // ── AI / ML ────────────────────────────────────────────────────────────

  bedrock: {
    label: "Bedrock",
    fields: [
      {
        key: "input_tokens_monthly",
        label: "Input tokens",
        unit: "M/mo",
        default: 1,
        description: "Millions of input tokens. Sonnet ~$3.00/million.",
      },
      {
        key: "output_tokens_monthly",
        label: "Output tokens",
        unit: "M/mo",
        default: 0.5,
        description: "Millions of output tokens. Sonnet ~$15.00/million.",
      },
    ],
  },

  sagemaker: {
    label: "SageMaker",
    fields: [
      {
        key: "hours_per_month",
        label: "Instance hours / month",
        unit: "hrs",
        default: 730,
        description: "ml.t3.medium notebook at $0.046/hr.",
      },
    ],
  },

  rekognition: {
    label: "Rekognition",
    fields: [
      {
        key: "images_monthly",
        label: "Image analyses",
        unit: "k/mo",
        default: 1,
        description: "Thousands of image analyses at $1.00/1,000.",
      },
    ],
  },

  comprehend: {
    label: "Comprehend",
    fields: [
      {
        key: "units_monthly",
        label: "Units processed",
        unit: "k/mo",
        default: 100,
        description: "Thousands of 100-character units at $0.0001/unit.",
      },
    ],
  },

  textract: {
    label: "Textract",
    fields: [
      {
        key: "pages_monthly",
        label: "Pages analyzed",
        unit: "k/mo",
        default: 1,
        description: "Thousands of pages with DetectDocumentText at $1.50/1,000.",
      },
    ],
  },

  polly: {
    label: "Polly",
    fields: [
      {
        key: "characters_monthly",
        label: "Characters synthesized",
        unit: "k/mo",
        default: 100,
        description: "Thousands of characters at $4.00/million.",
      },
    ],
  },

  translate: {
    label: "Translate",
    fields: [
      {
        key: "characters_monthly",
        label: "Characters translated",
        unit: "k/mo",
        default: 100,
        description: "Thousands of characters at $15.00/million.",
      },
    ],
  },

  lex: {
    label: "Lex",
    fields: [
      {
        key: "requests_monthly",
        label: "Speech/text requests",
        unit: "k/mo",
        default: 1,
        description: "Thousands of bot requests at $0.75/1,000.",
      },
    ],
  },

  // ── DevOps ─────────────────────────────────────────────────────────────

  codebuild: {
    label: "CodeBuild",
    fields: [
      {
        key: "build_minutes_monthly",
        label: "Build minutes",
        unit: "min/mo",
        default: 100,
        description: "Build minutes on general1.small at $0.005/minute.",
      },
    ],
  },

  codepipeline: {
    label: "CodePipeline",
    fields: [
      {
        key: "active_pipelines",
        label: "Active pipelines",
        unit: "pipelines",
        default: 1,
        description: "$1.00/active pipeline/month (first pipeline free).",
      },
    ],
  },

};

/**
 * Returns the usage schema entry for a component type, or null if the service
 * has no usage-based billing dimensions (free tier / flat-rate only).
 */
export function getUsageSchema(componentType) {
  return USAGE_SCHEMA[componentType?.toLowerCase()] ?? null;
}

/**
 * Returns the default value for a specific field on a component type.
 * Returns undefined if the type or field is not found.
 */
export function getFieldDefault(componentType, fieldKey) {
  const schema = getUsageSchema(componentType);
  if (!schema) return undefined;
  return schema.fields.find((f) => f.key === fieldKey)?.default;
}

/**
 * Returns all component types that have a usage schema entry.
 */
export function usageBilledTypes() {
  return Object.keys(USAGE_SCHEMA);
}

export default USAGE_SCHEMA;
