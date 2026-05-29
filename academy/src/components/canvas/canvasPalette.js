/**
 * canvasPalette.js
 * AWS component palette for the assignment canvas.
 * Each component has a `category` field so AssignmentNode can pick the right colors.
 */

export const CANVAS_PALETTE = [
  {
    category: "networking",
    label: "Networking",
    components: [
      { type: "vpc",                label: "VPC",               icon: "🌐", awsType: "VPC",               category: "networking" },
      { type: "subnet",             label: "Subnet",            icon: "🔲", awsType: "Subnet",             category: "networking" },
      { type: "internet_gateway",   label: "Internet GW",       icon: "🌍", awsType: "Internet Gateway",   category: "networking" },
      { type: "nat_gateway",        label: "NAT Gateway",       icon: "🔀", awsType: "NAT Gateway",        category: "networking" },
      { type: "route_table",        label: "Route Table",       icon: "🗺️", awsType: "Route Table",        category: "networking" },
      { type: "cloudfront",         label: "CloudFront",        icon: "☁️", awsType: "CloudFront",         category: "networking" },
      { type: "route53",            label: "Route 53",          icon: "🌏", awsType: "Route 53",           category: "networking" },
      { type: "transit_gateway",    label: "Transit GW",        icon: "🔗", awsType: "Transit Gateway",    category: "networking" },
      { type: "vpn_gateway",        label: "VPN Gateway",       icon: "🔒", awsType: "VPN Gateway",        category: "networking" },
      { type: "vpc_endpoint",       label: "VPC Endpoint",      icon: "🎯", awsType: "VPC Endpoint",       category: "networking" },
      { type: "waf",                label: "WAF",               icon: "🛡️", awsType: "AWS WAF",            category: "networking" },
    ],
  },
  {
    category: "compute",
    label: "Compute",
    components: [
      { type: "ec2",                label: "EC2",               icon: "🖥️", awsType: "EC2",               category: "compute" },
      { type: "lambda",             label: "Lambda",            icon: "λ",  awsType: "Lambda",             category: "compute" },
      { type: "auto_scaling_group", label: "Auto Scaling",      icon: "⚖️", awsType: "Auto Scaling Group", category: "compute" },
      { type: "ecs_fargate",        label: "ECS / Fargate",     icon: "🐳", awsType: "ECS / Fargate",      category: "compute" },
      { type: "eks",                label: "EKS",               icon: "☸️", awsType: "EKS",               category: "compute" },
      { type: "elastic_beanstalk",  label: "Beanstalk",         icon: "🌱", awsType: "Elastic Beanstalk",  category: "compute" },
      { type: "batch",              label: "AWS Batch",         icon: "📦", awsType: "AWS Batch",          category: "compute" },
    ],
  },
  {
    category: "load_balancing",
    label: "Load Balancing",
    components: [
      { type: "alb",                label: "App LB",            icon: "⚡", awsType: "ALB",               category: "load_balancing" },
      { type: "nlb",                label: "Network LB",        icon: "🔌", awsType: "NLB",               category: "load_balancing" },
      { type: "api_gateway",        label: "API Gateway",       icon: "🚪", awsType: "API Gateway",        category: "load_balancing" },
    ],
  },
  {
    category: "storage",
    label: "Storage",
    components: [
      { type: "s3",                 label: "S3",                icon: "🪣", awsType: "S3",                category: "storage" },
      { type: "ebs",                label: "EBS",               icon: "💾", awsType: "EBS",               category: "storage" },
      { type: "efs",                label: "EFS",               icon: "📁", awsType: "EFS",               category: "storage" },
      { type: "s3_glacier",         label: "S3 Glacier",        icon: "🧊", awsType: "S3 Glacier",        category: "storage" },
      { type: "backup",             label: "AWS Backup",        icon: "🔄", awsType: "AWS Backup",         category: "storage" },
    ],
  },
  {
    category: "database",
    label: "Database",
    components: [
      { type: "rds",                label: "RDS",               icon: "🗄️", awsType: "RDS",               category: "database" },
      { type: "aurora",             label: "Aurora",            icon: "✨", awsType: "Amazon Aurora",      category: "database" },
      { type: "dynamodb",           label: "DynamoDB",          icon: "⚡", awsType: "DynamoDB",           category: "database" },
      { type: "elasticache",        label: "ElastiCache",       icon: "🚀", awsType: "ElastiCache",        category: "database" },
      { type: "redshift",           label: "Redshift",          icon: "📊", awsType: "Amazon Redshift",    category: "database" },
      { type: "documentdb",         label: "DocumentDB",        icon: "📄", awsType: "DocumentDB",         category: "database" },
      { type: "opensearch",         label: "OpenSearch",        icon: "🔍", awsType: "OpenSearch Service", category: "database" },
    ],
  },
  {
    category: "security",
    label: "Security",
    components: [
      { type: "security_group",     label: "Security Group",    icon: "🛡️", awsType: "Security Group",    category: "security" },
      { type: "iam_role",           label: "IAM Role",          icon: "🔑", awsType: "IAM Role",           category: "security" },
      { type: "kms",                label: "KMS",               icon: "🗝️", awsType: "AWS KMS",            category: "security" },
      { type: "secrets_manager",    label: "Secrets Manager",   icon: "🤫", awsType: "Secrets Manager",    category: "security" },
      { type: "acm",                label: "ACM",               icon: "📜", awsType: "ACM",               category: "security" },
      { type: "cognito",            label: "Cognito",           icon: "👤", awsType: "Amazon Cognito",     category: "security" },
    ],
  },
  {
    category: "integration",
    label: "Integration",
    components: [
      { type: "sns",                label: "SNS",               icon: "📢", awsType: "SNS",               category: "integration" },
      { type: "sqs",                label: "SQS",               icon: "📨", awsType: "SQS",               category: "integration" },
      { type: "eventbridge",        label: "EventBridge",       icon: "⚡", awsType: "EventBridge",        category: "integration" },
      { type: "step_functions",     label: "Step Functions",    icon: "🔄", awsType: "Step Functions",     category: "integration" },
      { type: "kinesis",            label: "Kinesis",           icon: "🌊", awsType: "Kinesis",            category: "integration" },
    ],
  },
  {
    category: "management",
    label: "Management",
    components: [
      { type: "cloudwatch",         label: "CloudWatch",        icon: "📈", awsType: "CloudWatch",         category: "management" },
      { type: "cloudtrail",         label: "CloudTrail",        icon: "🔍", awsType: "CloudTrail",         category: "management" },
      { type: "config",             label: "AWS Config",        icon: "⚙️", awsType: "AWS Config",         category: "management" },
      { type: "systems_manager",    label: "Systems Manager",   icon: "🖥️", awsType: "Systems Manager",    category: "management" },
    ],
  },
  {
    category: "ai_ml",
    label: "AI / ML",
    components: [
      { type: "bedrock",            label: "Bedrock",           icon: "🤖", awsType: "Amazon Bedrock",     category: "ai_ml" },
      { type: "sagemaker",          label: "SageMaker",         icon: "🧠", awsType: "Amazon SageMaker",   category: "ai_ml" },
      { type: "rekognition",        label: "Rekognition",       icon: "👁️", awsType: "Rekognition",        category: "ai_ml" },
    ],
  },
];

export default CANVAS_PALETTE;
