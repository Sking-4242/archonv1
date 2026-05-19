"""AWS pricing estimates (static fallback values)."""

PRICES_AS_OF = "2025-01"

_FREE_TYPES = {
    "vpc", "subnet", "route_table", "internet_gateway", "nat_gateway_route",
    "elastic_ip", "auto_scaling_group", "security_group", "iam_role",
    "cloudformation", "lakeformation", "batch", "shield", "codedeploy",
}

_EC2_HOURLY = {
    "t3.micro": 0.0104, "t3.small": 0.0208, "t3.medium": 0.0416,
    "t3.large": 0.0832, "t3.xlarge": 0.1664, "t3.2xlarge": 0.3328,
    "m5.large": 0.096, "m5.xlarge": 0.192, "m5.2xlarge": 0.384,
    "c5.large": 0.085, "c5.xlarge": 0.17, "r5.large": 0.126,
}

_RDS_HOURLY = {
    "db.t3.micro": 0.017, "db.t3.small": 0.034, "db.t3.medium": 0.068,
    "db.t3.large": 0.136, "db.m5.large": 0.171, "db.m5.xlarge": 0.342,
    "db.r6g.large": 0.240, "db.r6g.xlarge": 0.480,
}

_HOURS_PER_MONTH = 730


def estimate_component(component_type: str, config: dict, region: str = "us-east-1"):
    """Return a cost estimate dict or None for free/unknown resources."""
    ctype = component_type.lower()

    if ctype in _FREE_TYPES:
        return None

    # ── Networking ─────────────────────────────────────────────────────────
    if ctype == "ec2":
        it = config.get("instance_type", "t3.micro")
        h = _EC2_HOURLY.get(it, _EC2_HOURLY["t3.micro"])
        return {"monthly_cost": round(h * _HOURS_PER_MONTH, 2), "description": f"EC2 {it}"}

    if ctype == "rds":
        ic = config.get("instance_class", "db.t3.micro")
        h = _RDS_HOURLY.get(ic, _RDS_HOURLY["db.t3.micro"])
        return {"monthly_cost": round(h * _HOURS_PER_MONTH, 2), "description": f"RDS {ic}"}

    if ctype == "s3":
        return {"monthly_cost": 2.30, "description": "S3 Standard (100 GB stored)"}

    if ctype in ("elb", "alb"):
        return {"monthly_cost": round(0.008 * _HOURS_PER_MONTH, 2), "description": "Application Load Balancer"}

    if ctype == "nlb":
        return {"monthly_cost": round(0.006 * _HOURS_PER_MONTH, 2), "description": "Network Load Balancer"}

    if ctype == "nat_gateway":
        return {"monthly_cost": round(0.045 * _HOURS_PER_MONTH, 2), "description": "NAT Gateway"}

    if ctype == "cloudfront":
        return {"monthly_cost": 1.00, "description": "CloudFront (10 GB transfer)"}

    if ctype == "lambda":
        return {"monthly_cost": 0.20, "description": "Lambda (1M requests/mo)"}

    if ctype == "dynamodb":
        return {"monthly_cost": 1.25, "description": "DynamoDB (1M r/w units)"}

    if ctype == "elasticache":
        nt = config.get("node_type", "cache.t3.micro")
        return {"monthly_cost": round(0.017 * _HOURS_PER_MONTH, 2), "description": f"ElastiCache {nt}"}

    if ctype == "sns":
        return {"monthly_cost": 0.50, "description": "SNS (1M notifications/mo)"}

    if ctype == "sqs":
        return {"monthly_cost": 0.40, "description": "SQS (1M requests/mo)"}

    if ctype in ("waf", "wafv2"):
        return {"monthly_cost": 5.00, "description": "WAF WebACL (1M requests/mo)"}

    if ctype == "efs":
        return {"monthly_cost": 3.00, "description": "EFS Standard (10 GB stored)"}

    if ctype == "secretsmanager":
        return {"monthly_cost": 0.40, "description": "Secrets Manager (1 secret)"}

    if ctype == "cloudwatch":
        return {"monthly_cost": 3.00, "description": "CloudWatch (10 custom metrics)"}

    if ctype == "ebs":
        return {"monthly_cost": 8.00, "description": "EBS gp3 (80 GB)"}

    if ctype == "api_gateway":
        return {"monthly_cost": 3.50, "description": "API Gateway REST (1M calls/mo)"}

    if ctype == "kinesis":
        return {"monthly_cost": 15.00, "description": "Kinesis Data Streams (1 shard)"}

    if ctype == "step_functions":
        return {"monthly_cost": 0.25, "description": "Step Functions (1K state transitions)"}

    if ctype == "eventbridge":
        return {"monthly_cost": 1.00, "description": "EventBridge (1M events/mo)"}

    if ctype == "route53":
        return {"monthly_cost": 0.50, "description": "Route 53 (1 hosted zone)"}

    if ctype == "cognito":
        return {"monthly_cost": 0.0055, "description": "Cognito (1000 MAUs)"}

    if ctype in ("kms_key", "kms"):
        return {"monthly_cost": 1.00, "description": "KMS Customer Managed Key"}

    if ctype == "acm":
        return None  # ACM public certs are free

    if ctype == "eks":
        return {"monthly_cost": round(0.10 * _HOURS_PER_MONTH, 2), "description": "EKS Cluster"}

    if ctype == "ecs_fargate":
        return {"monthly_cost": 37.00, "description": "Fargate (0.25 vCPU, 0.5 GB, 730 hrs)"}

    # ── Networking additions ───────────────────────────────────────────────
    if ctype == "transit_gateway":
        return {"monthly_cost": 36.50, "description": "Transit Gateway (1 attachment × 730 hrs)"}

    if ctype == "vpn_gateway":
        return {"monthly_cost": round(0.05 * _HOURS_PER_MONTH, 2), "description": "VPN Gateway"}

    if ctype == "direct_connect":
        return {"monthly_cost": 219.00, "description": "Direct Connect 1 Gbps (dedicated)"}

    if ctype == "vpc_endpoint":
        return {"monthly_cost": round(0.01 * _HOURS_PER_MONTH, 2), "description": "VPC Interface Endpoint"}

    if ctype == "global_accelerator":
        return {"monthly_cost": 18.25, "description": "Global Accelerator (2 IPs, light traffic)"}

    # ── Compute additions ──────────────────────────────────────────────────
    if ctype == "elastic_beanstalk":
        return None  # billed via underlying EC2/RDS

    if ctype == "app_runner":
        return {"monthly_cost": 16.00, "description": "App Runner (1 vCPU, 2 GB, active)"}

    if ctype == "ecr":
        return {"monthly_cost": 1.00, "description": "ECR (10 GB storage)"}

    if ctype == "lightsail":
        return {"monthly_cost": 10.00, "description": "Lightsail small_2_0 bundle"}

    # ── Storage additions ──────────────────────────────────────────────────
    if ctype == "fsx":
        return {"monthly_cost": 46.00, "description": "FSx for Windows (300 GB SSD)"}

    if ctype == "s3_glacier":
        return {"monthly_cost": 0.40, "description": "S3 Glacier (10 GB stored)"}

    if ctype == "backup":
        return {"monthly_cost": 5.00, "description": "AWS Backup (100 GB warm storage)"}

    if ctype == "storage_gateway":
        return {"monthly_cost": 12.60, "description": "Storage Gateway (File, 100 GB)"}

    # ── Database additions ─────────────────────────────────────────────────
    if ctype == "aurora":
        ic = config.get("instance_class", "db.t3.medium")
        h = _RDS_HOURLY.get(ic, _RDS_HOURLY["db.t3.medium"])
        return {"monthly_cost": round(h * _HOURS_PER_MONTH, 2), "description": f"Aurora {ic}"}

    if ctype == "redshift":
        return {"monthly_cost": 180.00, "description": "Redshift dc2.large (1 node)"}

    if ctype == "documentdb":
        return {"monthly_cost": round(0.096 * _HOURS_PER_MONTH, 2), "description": "DocumentDB db.t3.medium"}

    if ctype == "neptune":
        return {"monthly_cost": round(0.096 * _HOURS_PER_MONTH, 2), "description": "Neptune db.t3.medium"}

    if ctype == "opensearch":
        return {"monthly_cost": round(0.036 * _HOURS_PER_MONTH * 2, 2), "description": "OpenSearch t3.small.search (2 nodes)"}

    if ctype == "timestream":
        return {"monthly_cost": 25.00, "description": "Timestream (write + query estimate)"}

    # ── Security additions ─────────────────────────────────────────────────
    if ctype == "guardduty":
        return {"monthly_cost": 30.00, "description": "GuardDuty (light CloudTrail + DNS usage)"}

    if ctype == "cloudtrail":
        return {"monthly_cost": 2.00, "description": "CloudTrail (management events trail)"}

    if ctype == "inspector":
        return {"monthly_cost": 2.00, "description": "Inspector (1 EC2 instance/mo)"}

    if ctype == "security_hub":
        return {"monthly_cost": 3.00, "description": "Security Hub (10K checks/mo)"}

    if ctype == "macie":
        return {"monthly_cost": 5.00, "description": "Macie (1 GB S3 data scanned)"}

    # ── Integration additions ──────────────────────────────────────────────
    if ctype == "mq":
        return {"monthly_cost": round(0.149 * _HOURS_PER_MONTH, 2), "description": "Amazon MQ mq.m5.large"}

    if ctype == "appsync":
        return {"monthly_cost": 4.00, "description": "AppSync (4M query/mutation/mo)"}

    # ── Analytics additions ────────────────────────────────────────────────
    if ctype == "glue":
        return {"monthly_cost": 44.00, "description": "AWS Glue (2 DPU × 2 hr/day)"}

    if ctype == "athena":
        return {"monthly_cost": 5.00, "description": "Athena (1 TB scanned/mo)"}

    if ctype == "emr":
        return {"monthly_cost": 120.00, "description": "EMR m5.xlarge 2-node cluster"}

    if ctype == "quicksight":
        return {"monthly_cost": 24.00, "description": "QuickSight Enterprise (1 author)"}

    if ctype == "msk":
        return {"monthly_cost": round(0.149 * _HOURS_PER_MONTH * 3, 2), "description": "MSK kafka.m5.large (3 brokers)"}

    if ctype == "kinesis_firehose":
        return {"monthly_cost": 2.00, "description": "Kinesis Firehose (1 GB/mo)"}

    # ── AI / ML additions ─────────────────────────────────────────────────
    if ctype == "sagemaker":
        return {"monthly_cost": round(0.046 * _HOURS_PER_MONTH, 2), "description": "SageMaker ml.t3.medium notebook"}

    if ctype == "bedrock":
        return {"monthly_cost": 5.00, "description": "Bedrock (light Sonnet usage)"}

    if ctype == "rekognition":
        return {"monthly_cost": 1.00, "description": "Rekognition (1K image analyses/mo)"}

    if ctype == "comprehend":
        return {"monthly_cost": 1.00, "description": "Comprehend (100K units/mo)"}

    if ctype == "textract":
        return {"monthly_cost": 1.50, "description": "Textract (1K pages/mo)"}

    if ctype == "polly":
        return {"monthly_cost": 0.40, "description": "Polly (100K characters/mo)"}

    if ctype == "translate":
        return {"monthly_cost": 0.40, "description": "Translate (100K characters/mo)"}

    if ctype == "lex":
        return {"monthly_cost": 0.75, "description": "Lex (1K speech requests/mo)"}

    # ── Monitoring additions ───────────────────────────────────────────────
    if ctype == "xray":
        return {"monthly_cost": 1.00, "description": "X-Ray (100K traces/mo)"}

    if ctype == "systems_manager":
        return None  # SSM standard tier is free

    if ctype == "config":
        return {"monthly_cost": 2.00, "description": "AWS Config (100 config items recorded)"}

    # ── DevOps additions ───────────────────────────────────────────────────
    if ctype == "codepipeline":
        return {"monthly_cost": 1.00, "description": "CodePipeline (1 active pipeline)"}

    if ctype == "codebuild":
        return {"monthly_cost": 5.00, "description": "CodeBuild (100 build-minutes/mo)"}

    if ctype == "codecommit":
        return {"monthly_cost": 1.00, "description": "CodeCommit (5 active users)"}

    return None
