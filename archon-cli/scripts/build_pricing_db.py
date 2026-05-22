"""
build_pricing_db.py — serialise pricing.py into archon_cli/data/pricing_db.json

Run from repo root:
    python archon-cli/scripts/build_pricing_db.py

The output is committed to source control so the CLI works fully offline.
"""

import json
import sys
from pathlib import Path

# ---------------------------------------------------------------------------
# Resolve paths regardless of cwd
# ---------------------------------------------------------------------------
SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent.parent          # archonv1/
BACKEND_APP = REPO_ROOT / "backend" / "app"
OUTPUT = SCRIPT_DIR.parent / "archon_cli" / "data" / "pricing_db.json"

# Add backend to sys.path so we can import pricing directly
sys.path.insert(0, str(BACKEND_APP / "services"))

from pricing import (          # noqa: E402
    PRICES_AS_OF,
    _FREE_TYPES,
    _EC2_HOURLY,
    _RDS_HOURLY,
    _HOURS_PER_MONTH,
    estimate_component,
)

# ---------------------------------------------------------------------------
# Build flat_prices by probing estimate_component for every known type
# ---------------------------------------------------------------------------
_ALL_TYPES = [
    # Compute
    "ec2", "rds", "s3", "elb", "alb", "nlb", "nat_gateway", "cloudfront",
    "lambda", "dynamodb", "elasticache", "sns", "sqs", "waf", "wafv2",
    "efs", "secretsmanager", "cloudwatch", "ebs", "api_gateway", "kinesis",
    "step_functions", "eventbridge", "route53", "cognito", "kms_key", "kms",
    "acm", "eks", "ecs_fargate",
    # Networking
    "transit_gateway", "vpn_gateway", "direct_connect", "vpc_endpoint",
    "global_accelerator",
    # Compute extras
    "elastic_beanstalk", "app_runner", "ecr", "lightsail",
    # Storage
    "fsx", "s3_glacier", "backup", "storage_gateway",
    # Database
    "aurora", "redshift", "documentdb", "neptune", "opensearch", "timestream",
    # Security
    "guardduty", "cloudtrail", "inspector", "security_hub", "macie",
    # Integration
    "mq", "appsync",
    # Analytics
    "glue", "athena", "emr", "quicksight", "msk", "kinesis_firehose",
    # AI / ML
    "sagemaker", "bedrock", "rekognition", "comprehend", "textract",
    "polly", "translate", "lex",
    # Monitoring / DevOps
    "xray", "systems_manager", "config",
    "codepipeline", "codebuild", "codecommit",
    # Free resource types (captured in free_types list, not flat_prices)
    "vpc", "subnet", "route_table", "internet_gateway", "nat_gateway_route",
    "elastic_ip", "auto_scaling_group", "security_group", "iam_role",
    "cloudformation", "lakeformation", "batch", "shield", "codedeploy",
]

flat_prices: dict = {}
for ctype in _ALL_TYPES:
    result = estimate_component(ctype, {})
    if result is not None:
        flat_prices[ctype] = result

# ---------------------------------------------------------------------------
# Assemble output document
# ---------------------------------------------------------------------------
db = {
    "as_of": PRICES_AS_OF,
    "hours_per_month": _HOURS_PER_MONTH,
    "free_types": sorted(_FREE_TYPES),
    "ec2_hourly": _EC2_HOURLY,
    "rds_hourly": _RDS_HOURLY,
    "flat_prices": flat_prices,
}

OUTPUT.parent.mkdir(parents=True, exist_ok=True)
with open(OUTPUT, "w", encoding="utf-8") as fh:
    json.dump(db, fh, indent=2)
    fh.write("\n")

print(f"Wrote {OUTPUT}")
print(f"  flat_prices keys : {len(flat_prices)}")
print(f"  free_types       : {len(db['free_types'])}")
print(f"  ec2 instance types: {len(_EC2_HOURLY)}")
print(f"  rds instance types: {len(_RDS_HOURLY)}")
