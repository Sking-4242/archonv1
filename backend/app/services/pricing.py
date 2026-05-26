"""
AWS pricing estimates.

All usage-billed services accept a `usage` dict whose keys match the field
keys defined in frontend/src/utils/usageSchema.js. If a key is absent the
function falls back to the same default value used in the schema so the
Quick Estimate (no usage input) matches the Usage Model baseline.

Prices are as of 2025-01 (us-east-1 reference rates).
"""

PRICES_AS_OF = "2025-01"

_FREE_TYPES = {
    "vpc", "subnet", "route_table", "internet_gateway", "nat_gateway_route",
    "elastic_ip", "auto_scaling_group", "security_group", "iam_role",
    "cloudformation", "lakeformation", "batch", "shield", "codedeploy",
    "acm", "elastic_beanstalk", "systems_manager",
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

_DEFAULT_HOURS = 730  # always-on baseline


def _u(usage, key, default):
    """Extract a usage value with fallback to default."""
    val = (usage or {}).get(key, default)
    try:
        return float(val)
    except (TypeError, ValueError):
        return float(default)


def estimate_component(
    component_type: str,
    config: dict,
    region: str = "us-east-1",
    usage: dict = None,
):
    """
    Return { monthly_cost: float, description: str } or None for free resources.

    `usage` is a flat dict of field_key -> value matching usageSchema.js.
    When usage is None or a key is absent the schema default is used.
    """
    ctype = component_type.lower()

    if ctype in _FREE_TYPES:
        return None

    # ── Compute ──────────────────────────────────────────────────────────────

    if ctype == "ec2":
        it = config.get("instance_type", "t3.micro")
        hourly = _EC2_HOURLY.get(it, _EC2_HOURLY["t3.micro"])
        hours = _u(usage, "hours_per_month", _DEFAULT_HOURS)
        transfer = _u(usage, "data_transfer_gb", 10)
        compute = hourly * hours
        xfer_cost = transfer * 0.09
        total = compute + xfer_cost
        return {
            "monthly_cost": round(total, 2),
            "description": f"EC2 {it} ({hours:.0f} hrs + {transfer:.0f} GB transfer)",
        }

    if ctype == "lambda":
        invocations = _u(usage, "invocations_monthly", 1_000_000)
        duration_ms = _u(usage, "avg_duration_ms", 200)
        memory_mb = _u(usage, "memory_mb", 128)
        billable_invocations = max(0, invocations - 1_000_000)
        request_cost = (billable_invocations / 1_000_000) * 0.20
        gb_seconds = (memory_mb / 1024) * (duration_ms / 1000) * invocations
        billable_gb_seconds = max(0, gb_seconds - 400_000)
        duration_cost = billable_gb_seconds * 0.0000166667
        total = request_cost + duration_cost
        return {
            "monthly_cost": round(total, 2),
            "description": (
                f"Lambda {invocations/1e6:.1f}M reqs · {duration_ms:.0f} ms · {memory_mb:.0f} MB"
            ),
        }

    if ctype == "ecs_fargate":
        vcpu = _u(usage, "vcpu", 0.25)
        memory_gb = _u(usage, "memory_gb", 0.5)
        hours = _u(usage, "hours_per_month", _DEFAULT_HOURS)
        total = (vcpu * 0.04048 + memory_gb * 0.004445) * hours
        return {
            "monthly_cost": round(total, 2),
            "description": f"Fargate {vcpu} vCPU · {memory_gb} GB · {hours:.0f} hrs",
        }

    if ctype == "eks":
        hours = _u(usage, "hours_per_month", _DEFAULT_HOURS)
        total = 0.10 * hours
        return {
            "monthly_cost": round(total, 2),
            "description": f"EKS cluster {hours:.0f} hrs",
        }

    if ctype == "app_runner":
        vcpu = _u(usage, "vcpu", 1)
        memory_gb = _u(usage, "memory_gb", 2)
        hours = _u(usage, "hours_per_month", _DEFAULT_HOURS)
        total = (vcpu * 0.064 + memory_gb * 0.007) * hours
        return {
            "monthly_cost": round(total, 2),
            "description": f"App Runner {vcpu} vCPU · {memory_gb} GB · {hours:.0f} hrs",
        }

    if ctype == "lightsail":
        return {"monthly_cost": 10.00, "description": "Lightsail small_2_0 bundle"}

    if ctype == "ecr":
        return {"monthly_cost": 1.00, "description": "ECR (10 GB storage)"}

    # ── Storage ───────────────────────────────────────────────────────────────

    if ctype == "s3":
        storage_gb = _u(usage, "storage_gb", 100)
        puts_k = _u(usage, "put_requests", 100)
        gets_k = _u(usage, "get_requests", 1_000)
        transfer_gb = _u(usage, "data_transfer_gb", 10)
        storage_cost = storage_gb * 0.023
        put_cost = puts_k * 0.005
        get_cost = gets_k * 0.0004
        xfer_cost = transfer_gb * 0.09
        total = storage_cost + put_cost + get_cost + xfer_cost
        return {
            "monthly_cost": round(total, 2),
            "description": f"S3 {storage_gb:.0f} GB · {puts_k:.0f}k PUTs · {gets_k:.0f}k GETs",
        }

    if ctype == "ebs":
        storage_gb = _u(usage, "storage_gb", 80)
        iops = _u(usage, "iops", 3000)
        storage_cost = storage_gb * 0.08
        extra_iops = max(0, iops - 3000)
        iops_cost = extra_iops * 0.005
        total = storage_cost + iops_cost
        return {
            "monthly_cost": round(total, 2),
            "description": f"EBS gp3 {storage_gb:.0f} GB · {iops:.0f} IOPS",
        }

    if ctype == "efs":
        storage_gb = _u(usage, "storage_gb", 10)
        total = storage_gb * 0.30
        return {
            "monthly_cost": round(total, 2),
            "description": f"EFS Standard {storage_gb:.0f} GB",
        }

    if ctype == "s3_glacier":
        storage_gb = _u(usage, "storage_gb", 10)
        total = storage_gb * 0.004
        return {
            "monthly_cost": round(total, 2),
            "description": f"S3 Glacier {storage_gb:.0f} GB",
        }

    if ctype == "fsx":
        storage_gb = _u(usage, "storage_gb", 300)
        total = storage_gb * 0.23
        return {
            "monthly_cost": round(total, 2),
            "description": f"FSx for Windows {storage_gb:.0f} GB SSD",
        }

    if ctype == "backup":
        storage_gb = _u(usage, "storage_gb", 100)
        total = storage_gb * 0.05
        return {
            "monthly_cost": round(total, 2),
            "description": f"AWS Backup {storage_gb:.0f} GB warm storage",
        }

    if ctype == "storage_gateway":
        return {"monthly_cost": 12.60, "description": "Storage Gateway (File, 100 GB)"}

    # ── Database ──────────────────────────────────────────────────────────────

    if ctype == "rds":
        ic = config.get("instance_class", "db.t3.micro")
        hourly = _RDS_HOURLY.get(ic, _RDS_HOURLY["db.t3.micro"])
        hours = _u(usage, "hours_per_month", _DEFAULT_HOURS)
        storage_gb = _u(usage, "storage_gb", 20)
        instance_cost = hourly * hours
        storage_cost = storage_gb * 0.115
        total = instance_cost + storage_cost
        return {
            "monthly_cost": round(total, 2),
            "description": f"RDS {ic} {hours:.0f} hrs · {storage_gb:.0f} GB",
        }

    if ctype == "aurora":
        ic = config.get("instance_class", "db.t3.medium")
        hourly = _RDS_HOURLY.get(ic, _RDS_HOURLY["db.t3.medium"])
        hours = _u(usage, "hours_per_month", _DEFAULT_HOURS)
        storage_gb = _u(usage, "storage_gb", 20)
        io_m = _u(usage, "io_millions", 1)
        total = (hourly * hours) + (storage_gb * 0.10) + (io_m * 0.20)
        return {
            "monthly_cost": round(total, 2),
            "description": f"Aurora {ic} {hours:.0f} hrs · {storage_gb:.0f} GB",
        }

    if ctype == "dynamodb":
        writes_m = _u(usage, "write_units_monthly", 1)
        reads_m = _u(usage, "read_units_monthly", 4)
        storage_gb = _u(usage, "storage_gb", 1)
        total = (writes_m * 1.25) + (reads_m * 0.25) + (storage_gb * 0.25)
        return {
            "monthly_cost": round(total, 2),
            "description": f"DynamoDB {writes_m:.1f}M WRU · {reads_m:.1f}M RRU · {storage_gb:.0f} GB",
        }

    if ctype == "elasticache":
        hours = _u(usage, "hours_per_month", _DEFAULT_HOURS)
        nt = config.get("node_type", "cache.t3.micro")
        total = 0.017 * hours
        return {
            "monthly_cost": round(total, 2),
            "description": f"ElastiCache {nt} {hours:.0f} hrs",
        }

    if ctype == "redshift":
        num_nodes = int(_u(usage, "num_nodes", 1))
        hours = _u(usage, "hours_per_month", _DEFAULT_HOURS)
        total = 0.25 * num_nodes * hours
        return {
            "monthly_cost": round(total, 2),
            "description": f"Redshift {num_nodes}x dc2.large {hours:.0f} hrs",
        }

    if ctype == "documentdb":
        hours = _u(usage, "hours_per_month", _DEFAULT_HOURS)
        total = 0.096 * hours
        return {
            "monthly_cost": round(total, 2),
            "description": f"DocumentDB db.t3.medium {hours:.0f} hrs",
        }

    if ctype == "neptune":
        hours = _u(usage, "hours_per_month", _DEFAULT_HOURS)
        total = 0.096 * hours
        return {
            "monthly_cost": round(total, 2),
            "description": f"Neptune db.t3.medium {hours:.0f} hrs",
        }

    if ctype == "opensearch":
        num_nodes = int(_u(usage, "num_nodes", 2))
        hours = _u(usage, "hours_per_month", _DEFAULT_HOURS)
        total = 0.036 * num_nodes * hours
        return {
            "monthly_cost": round(total, 2),
            "description": f"OpenSearch {num_nodes}x t3.small.search {hours:.0f} hrs",
        }

    if ctype == "timestream":
        writes_gb = _u(usage, "writes_gb", 1)
        queries_gb = _u(usage, "queries_gb", 10)
        total = (writes_gb * 0.50) + (queries_gb * 0.01)
        return {
            "monthly_cost": round(total, 2),
            "description": f"Timestream {writes_gb:.0f} GB writes · {queries_gb:.0f} GB scanned",
        }

    # ── Networking ────────────────────────────────────────────────────────────

    if ctype == "nat_gateway":
        hours = _u(usage, "hours_per_month", _DEFAULT_HOURS)
        data_gb = _u(usage, "data_processed_gb", 100)
        total = (0.045 * hours) + (0.045 * data_gb)
        return {
            "monthly_cost": round(total, 2),
            "description": f"NAT Gateway {hours:.0f} hrs · {data_gb:.0f} GB",
        }

    if ctype == "cloudfront":
        requests_m = _u(usage, "requests_monthly", 10)
        transfer_gb = _u(usage, "data_transfer_gb", 10)
        total = (requests_m * 0.85) + (transfer_gb * 0.085)
        return {
            "monthly_cost": round(total, 2),
            "description": f"CloudFront {requests_m:.0f}M reqs · {transfer_gb:.0f} GB",
        }

    if ctype in ("elb", "alb"):
        hours = _u(usage, "hours_per_month", _DEFAULT_HOURS)
        lcus = _u(usage, "lcus_per_hour", 1)
        total = (0.008 + 0.008 * lcus) * hours
        return {
            "monthly_cost": round(total, 2),
            "description": f"ALB {hours:.0f} hrs · {lcus:.1f} LCU/hr",
        }

    if ctype == "nlb":
        hours = _u(usage, "hours_per_month", _DEFAULT_HOURS)
        lcus = _u(usage, "lcus_per_hour", 1)
        total = (0.006 + 0.006 * lcus) * hours
        return {
            "monthly_cost": round(total, 2),
            "description": f"NLB {hours:.0f} hrs · {lcus:.1f} NLCU/hr",
        }

    if ctype == "vpc_endpoint":
        hours = _u(usage, "hours_per_month", _DEFAULT_HOURS)
        data_gb = _u(usage, "data_processed_gb", 10)
        total = (0.01 * hours) + (0.01 * data_gb)
        return {
            "monthly_cost": round(total, 2),
            "description": f"VPC Endpoint {hours:.0f} hrs · {data_gb:.0f} GB",
        }

    if ctype == "transit_gateway":
        return {"monthly_cost": 36.50, "description": "Transit Gateway (1 attachment x 730 hrs)"}

    if ctype == "vpn_gateway":
        return {"monthly_cost": round(0.05 * _DEFAULT_HOURS, 2), "description": "VPN Gateway"}

    if ctype == "direct_connect":
        return {"monthly_cost": 219.00, "description": "Direct Connect 1 Gbps (dedicated)"}

    if ctype == "global_accelerator":
        return {"monthly_cost": 18.25, "description": "Global Accelerator (2 IPs, light traffic)"}

    # ── API & Integration ─────────────────────────────────────────────────────

    if ctype == "api_gateway":
        calls_m = _u(usage, "calls_monthly", 1)
        transfer_gb = _u(usage, "data_transfer_gb", 1)
        total = (calls_m * 3.50) + (transfer_gb * 0.09)
        return {
            "monthly_cost": round(total, 2),
            "description": f"API Gateway {calls_m:.1f}M calls",
        }

    if ctype == "sqs":
        requests_m = _u(usage, "requests_monthly", 1)
        billable = max(0, requests_m - 1)
        total = billable * 0.40
        return {
            "monthly_cost": round(total, 2),
            "description": f"SQS {requests_m:.1f}M requests",
        }

    if ctype == "sns":
        notifications_m = _u(usage, "notifications_monthly", 1)
        total = notifications_m * 0.50
        return {
            "monthly_cost": round(total, 2),
            "description": f"SNS {notifications_m:.1f}M notifications",
        }

    if ctype == "kinesis":
        shards = _u(usage, "shards", 1)
        put_units_m = _u(usage, "put_units_monthly", 1)
        shard_cost = shards * 0.015 * _DEFAULT_HOURS
        put_cost = put_units_m * 0.014
        total = shard_cost + put_cost
        return {
            "monthly_cost": round(total, 2),
            "description": f"Kinesis {shards:.0f} shard(s) · {put_units_m:.1f}M PUT units",
        }

    if ctype == "kinesis_firehose":
        data_gb = _u(usage, "data_ingested_gb", 1)
        total = data_gb * 0.029
        return {
            "monthly_cost": round(total, 2),
            "description": f"Firehose {data_gb:.0f} GB ingested",
        }

    if ctype == "eventbridge":
        events_m = _u(usage, "events_monthly", 1)
        total = events_m * 1.00
        return {
            "monthly_cost": round(total, 2),
            "description": f"EventBridge {events_m:.1f}M custom events",
        }

    if ctype == "mq":
        hours = _u(usage, "hours_per_month", _DEFAULT_HOURS)
        total = 0.149 * hours
        return {
            "monthly_cost": round(total, 2),
            "description": f"Amazon MQ mq.m5.large {hours:.0f} hrs",
        }

    if ctype == "appsync":
        ops_m = _u(usage, "operations_monthly", 4)
        total = ops_m * 4.00
        return {
            "monthly_cost": round(total, 2),
            "description": f"AppSync {ops_m:.1f}M operations",
        }

    if ctype == "step_functions":
        transitions_k = _u(usage, "transitions_monthly", 1_000)
        total = transitions_k * 0.025
        return {
            "monthly_cost": round(total, 2),
            "description": f"Step Functions {transitions_k:.0f}k transitions",
        }

    # ── Analytics ─────────────────────────────────────────────────────────────

    if ctype == "athena":
        tb_scanned = _u(usage, "tb_scanned_monthly", 1)
        total = tb_scanned * 5.00
        return {
            "monthly_cost": round(total, 2),
            "description": f"Athena {tb_scanned:.1f} TB scanned",
        }

    if ctype == "glue":
        dpu_hours = _u(usage, "dpu_hours_monthly", 88)
        total = dpu_hours * 0.44
        return {
            "monthly_cost": round(total, 2),
            "description": f"Glue {dpu_hours:.0f} DPU-hrs",
        }

    if ctype == "msk":
        brokers = int(_u(usage, "brokers", 3))
        hours = _u(usage, "hours_per_month", _DEFAULT_HOURS)
        total = 0.149 * brokers * hours
        return {
            "monthly_cost": round(total, 2),
            "description": f"MSK {brokers}x kafka.m5.large {hours:.0f} hrs",
        }

    if ctype == "emr":
        return {"monthly_cost": 120.00, "description": "EMR m5.xlarge 2-node cluster"}

    if ctype == "quicksight":
        return {"monthly_cost": 24.00, "description": "QuickSight Enterprise (1 author)"}

    # ── Monitoring & Security ─────────────────────────────────────────────────

    if ctype == "cloudwatch":
        custom_metrics = _u(usage, "custom_metrics", 10)
        log_ingest_gb = _u(usage, "log_gb_monthly", 5)
        log_storage_gb = _u(usage, "log_storage_gb", 20)
        total = (custom_metrics * 0.30) + (log_ingest_gb * 0.50) + (log_storage_gb * 0.03)
        return {
            "monthly_cost": round(total, 2),
            "description": f"CloudWatch {custom_metrics:.0f} metrics · {log_ingest_gb:.0f} GB logs",
        }

    if ctype == "cloudtrail":
        return {"monthly_cost": 2.00, "description": "CloudTrail (management events trail)"}

    if ctype == "guardduty":
        ct_gb = _u(usage, "cloudtrail_gb", 5)
        dns_gb = _u(usage, "dns_gb", 2)
        ct_cost = max(0, ct_gb - 2) * 3.50
        dns_cost = dns_gb * 1.00
        total = ct_cost + dns_cost
        return {
            "monthly_cost": round(total, 2),
            "description": f"GuardDuty {ct_gb:.0f} GB CloudTrail · {dns_gb:.0f} GB DNS",
        }

    if ctype == "inspector":
        instances = int(_u(usage, "ec2_instances", 1))
        total = instances * 2.00
        return {
            "monthly_cost": round(total, 2),
            "description": f"Inspector {instances} EC2 instance(s)",
        }

    if ctype == "security_hub":
        checks_k = _u(usage, "checks_monthly", 10)
        total = checks_k * 1.00
        return {
            "monthly_cost": round(total, 2),
            "description": f"Security Hub {checks_k:.0f}k checks",
        }

    if ctype == "macie":
        gb_scanned = _u(usage, "s3_gb_scanned", 1)
        total = gb_scanned * 1.00
        return {
            "monthly_cost": round(total, 2),
            "description": f"Macie {gb_scanned:.0f} GB S3 scanned",
        }

    if ctype in ("waf", "wafv2"):
        requests_m = _u(usage, "requests_monthly", 1)
        total = 5.00 + (requests_m * 0.60)
        return {
            "monthly_cost": round(total, 2),
            "description": f"WAF WebACL · {requests_m:.1f}M requests",
        }

    if ctype == "xray":
        traces_k = _u(usage, "traces_monthly", 100)
        billable_k = max(0, traces_k - 100)
        total = billable_k * 0.005
        return {
            "monthly_cost": round(total, 2),
            "description": f"X-Ray {traces_k:.0f}k traces",
        }

    if ctype == "config":
        items_k = _u(usage, "config_items_monthly", 100)
        total = items_k * 3.00
        return {
            "monthly_cost": round(total, 2),
            "description": f"AWS Config {items_k:.0f}k config items",
        }

    # ── Secrets & Identity ────────────────────────────────────────────────────

    if ctype == "secretsmanager":
        secrets = _u(usage, "secrets", 1)
        api_calls_k = _u(usage, "api_calls_monthly", 10)
        total = (secrets * 0.40) + ((api_calls_k / 10) * 0.05)
        return {
            "monthly_cost": round(total, 2),
            "description": f"Secrets Manager {secrets:.0f} secret(s)",
        }

    if ctype == "cognito":
        maus = _u(usage, "maus", 1_000)
        billable = max(0, maus - 50_000)
        total = billable * 0.0055
        return {
            "monthly_cost": round(total, 2),
            "description": f"Cognito {maus:.0f} MAUs",
        }

    if ctype in ("kms_key", "kms"):
        keys = _u(usage, "keys", 1)
        api_calls_k = _u(usage, "api_calls_monthly", 20)
        total = (keys * 1.00) + ((api_calls_k / 10) * 0.03)
        return {
            "monthly_cost": round(total, 2),
            "description": f"KMS {keys:.0f} key(s)",
        }

    if ctype == "route53":
        zones = _u(usage, "hosted_zones", 1)
        queries_m = _u(usage, "queries_monthly", 1)
        total = (zones * 0.50) + (queries_m * 0.40)
        return {
            "monthly_cost": round(total, 2),
            "description": f"Route 53 {zones:.0f} zone(s) · {queries_m:.1f}M queries",
        }

    # ── AI / ML ───────────────────────────────────────────────────────────────

    if ctype == "bedrock":
        input_m = _u(usage, "input_tokens_monthly", 1)
        output_m = _u(usage, "output_tokens_monthly", 0.5)
        total = (input_m * 3.00) + (output_m * 15.00)
        return {
            "monthly_cost": round(total, 2),
            "description": f"Bedrock {input_m:.1f}M in · {output_m:.1f}M out tokens",
        }

    if ctype == "sagemaker":
        hours = _u(usage, "hours_per_month", _DEFAULT_HOURS)
        total = 0.046 * hours
        return {
            "monthly_cost": round(total, 2),
            "description": f"SageMaker ml.t3.medium {hours:.0f} hrs",
        }

    if ctype == "rekognition":
        images_k = _u(usage, "images_monthly", 1)
        total = images_k * 1.00
        return {
            "monthly_cost": round(total, 2),
            "description": f"Rekognition {images_k:.0f}k image analyses",
        }

    if ctype == "comprehend":
        units_k = _u(usage, "units_monthly", 100)
        total = units_k * 0.10
        return {
            "monthly_cost": round(total, 2),
            "description": f"Comprehend {units_k:.0f}k units",
        }

    if ctype == "textract":
        pages_k = _u(usage, "pages_monthly", 1)
        total = pages_k * 1.50
        return {
            "monthly_cost": round(total, 2),
            "description": f"Textract {pages_k:.0f}k pages",
        }

    if ctype == "polly":
        chars_k = _u(usage, "characters_monthly", 100)
        total = chars_k * 0.004
        return {
            "monthly_cost": round(total, 2),
            "description": f"Polly {chars_k:.0f}k characters",
        }

    if ctype == "translate":
        chars_k = _u(usage, "characters_monthly", 100)
        total = chars_k * 0.015
        return {
            "monthly_cost": round(total, 2),
            "description": f"Translate {chars_k:.0f}k characters",
        }

    if ctype == "lex":
        requests_k = _u(usage, "requests_monthly", 1)
        total = requests_k * 0.75
        return {
            "monthly_cost": round(total, 2),
            "description": f"Lex {requests_k:.0f}k requests",
        }

    # ── DevOps ────────────────────────────────────────────────────────────────

    if ctype == "codebuild":
        build_mins = _u(usage, "build_minutes_monthly", 100)
        total = build_mins * 0.005
        return {
            "monthly_cost": round(total, 2),
            "description": f"CodeBuild {build_mins:.0f} build-minutes",
        }

    if ctype == "codepipeline":
        pipelines = int(_u(usage, "active_pipelines", 1))
        total = max(0, pipelines - 1) * 1.00
        return {
            "monthly_cost": round(total, 2),
            "description": f"CodePipeline {pipelines} pipeline(s)",
        }

    if ctype == "codecommit":
        return {"monthly_cost": 1.00, "description": "CodeCommit (5 active users)"}

    return None
