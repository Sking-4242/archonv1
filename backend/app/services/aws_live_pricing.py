"""
AWS live pricing via the boto3 Pricing API.

Requires AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY in the environment
(or a mounted credentials file / IAM instance role).  When credentials
are absent every function returns None and the static fallback in
pricing.py is used instead.

The Pricing API endpoint is always us-east-1 regardless of the target
product region.
"""
from __future__ import annotations

import json
import os

_HOURS_PER_MONTH = 730.0

# Pricing API uses human-readable location names, not region codes.
_LOCATION_MAP: dict[str, str] = {
    "us-east-1":      "US East (N. Virginia)",
    "us-east-2":      "US East (Ohio)",
    "us-west-1":      "US West (N. California)",
    "us-west-2":      "US West (Oregon)",
    "eu-west-1":      "Europe (Ireland)",
    "eu-west-2":      "Europe (London)",
    "eu-west-3":      "Europe (Paris)",
    "eu-central-1":   "Europe (Frankfurt)",
    "eu-north-1":     "Europe (Stockholm)",
    "eu-south-1":     "Europe (Milan)",
    "ap-southeast-1": "Asia Pacific (Singapore)",
    "ap-southeast-2": "Asia Pacific (Sydney)",
    "ap-northeast-1": "Asia Pacific (Tokyo)",
    "ap-northeast-2": "Asia Pacific (Seoul)",
    "ap-northeast-3": "Asia Pacific (Osaka)",
    "ap-south-1":     "Asia Pacific (Mumbai)",
    "ap-east-1":      "Asia Pacific (Hong Kong)",
    "ca-central-1":   "Canada (Central)",
    "sa-east-1":      "South America (Sao Paulo)",
    "me-south-1":     "Middle East (Bahrain)",
    "af-south-1":     "Africa (Cape Town)",
}


def _has_credentials() -> bool:
    return bool(
        os.environ.get("AWS_ACCESS_KEY_ID")
        or os.environ.get("AWS_SHARED_CREDENTIALS_FILE")
        or os.path.exists(os.path.expanduser("~/.aws/credentials"))
    )


def _get_client():
    import boto3  # imported lazily so missing package does not crash startup
    return boto3.client("pricing", region_name="us-east-1")


def _on_demand_hourly(price_item_str: str) -> float | None:
    """Extract the first positive on-demand hourly USD rate from a PriceList entry."""
    data = json.loads(price_item_str)
    for term in data.get("terms", {}).get("OnDemand", {}).values():
        for dim in term.get("priceDimensions", {}).values():
            usd = dim.get("pricePerUnit", {}).get("USD")
            if usd:
                val = float(usd)
                if val > 0:
                    return val
    return None


def _on_demand_unit_price(price_item_str: str) -> float | None:
    """Return the first positive USD unit price without assuming hourly units."""
    return _on_demand_hourly(price_item_str)


def fetch_aws_price(component_type: str, config: dict, region: str) -> float | None:
    """Return an estimated monthly USD cost, or None when unavailable."""
    if not _has_credentials():
        return None

    location = _LOCATION_MAP.get(region, "US East (N. Virginia)")

    try:
        client = _get_client()
    except Exception:
        return None

    try:
        dispatch = {
            "ec2":           lambda: _ec2(client, config, location),
            "rds":           lambda: _rds(client, config, location),
            "elasticache":   lambda: _elasticache(client, config, location),
            "elb":           lambda: _elb(client, location),
            "nat_gateway":   lambda: _nat(client, location),
            "s3":            lambda: _s3(client, location),
            "efs":           lambda: _efs(client, location),
            "waf":           lambda: _waf(client, location),
            "wafv2":         lambda: _waf(client, location),
            "secretsmanager": lambda: _secrets(client, location),
            "cloudwatch":    lambda: _cloudwatch(client, location),
        }
        fn = dispatch.get(component_type)
        return fn() if fn else None
    except Exception:
        return None


# ─── Per-service helpers ───────────────────────────────────────────────────────

def _ec2(client, config: dict, location: str) -> float | None:
    instance_type = config.get("instance_type", "t3.micro")
    r = client.get_products(
        ServiceCode="AmazonEC2",
        Filters=[
            {"Type": "TERM_MATCH", "Field": "instanceType",    "Value": instance_type},
            {"Type": "TERM_MATCH", "Field": "location",        "Value": location},
            {"Type": "TERM_MATCH", "Field": "operatingSystem", "Value": "Linux"},
            {"Type": "TERM_MATCH", "Field": "tenancy",         "Value": "Shared"},
            {"Type": "TERM_MATCH", "Field": "capacitystatus",  "Value": "Used"},
            {"Type": "TERM_MATCH", "Field": "preInstalledSw",  "Value": "NA"},
        ],
        MaxResults=5,
    )
    for item in r.get("PriceList", []):
        h = _on_demand_hourly(item)
        if h:
            return round(h * _HOURS_PER_MONTH, 2)
    return None


def _rds(client, config: dict, location: str) -> float | None:
    instance_class = config.get("instance_class", "db.t3.micro")
    engine = config.get("engine", "MySQL")
    r = client.get_products(
        ServiceCode="AmazonRDS",
        Filters=[
            {"Type": "TERM_MATCH", "Field": "instanceType",      "Value": instance_class},
            {"Type": "TERM_MATCH", "Field": "location",          "Value": location},
            {"Type": "TERM_MATCH", "Field": "databaseEngine",    "Value": engine},
            {"Type": "TERM_MATCH", "Field": "deploymentOption",  "Value": "Single-AZ"},
        ],
        MaxResults=5,
    )
    for item in r.get("PriceList", []):
        h = _on_demand_hourly(item)
        if h:
            return round(h * _HOURS_PER_MONTH, 2)
    return None


def _elasticache(client, config: dict, location: str) -> float | None:
    node_type = config.get("node_type", "cache.t3.micro")
    r = client.get_products(
        ServiceCode="AmazonElastiCache",
        Filters=[
            {"Type": "TERM_MATCH", "Field": "instanceType", "Value": node_type},
            {"Type": "TERM_MATCH", "Field": "location",     "Value": location},
            {"Type": "TERM_MATCH", "Field": "cacheEngine",  "Value": "Redis"},
        ],
        MaxResults=5,
    )
    for item in r.get("PriceList", []):
        h = _on_demand_hourly(item)
        if h:
            return round(h * _HOURS_PER_MONTH, 2)
    return None


def _elb(client, location: str) -> float | None:
    r = client.get_products(
        ServiceCode="AWSELB",
        Filters=[
            {"Type": "TERM_MATCH", "Field": "location", "Value": location},
            {"Type": "TERM_MATCH", "Field": "group",    "Value": "ALB"},
        ],
        MaxResults=5,
    )
    for item in r.get("PriceList", []):
        h = _on_demand_hourly(item)
        if h:
            return round(h * _HOURS_PER_MONTH, 2)
    return None


def _nat(client, location: str) -> float | None:
    r = client.get_products(
        ServiceCode="AmazonEC2",
        Filters=[
            {"Type": "TERM_MATCH", "Field": "location",      "Value": location},
            {"Type": "TERM_MATCH", "Field": "productFamily", "Value": "NAT Gateway"},
        ],
        MaxResults=5,
    )
    for item in r.get("PriceList", []):
        h = _on_demand_hourly(item)
        if h:
            return round(h * _HOURS_PER_MONTH, 2)
    return None


def _s3(client, location: str) -> float | None:
    r = client.get_products(
        ServiceCode="AmazonS3",
        Filters=[
            {"Type": "TERM_MATCH", "Field": "location",     "Value": location},
            {"Type": "TERM_MATCH", "Field": "storageClass", "Value": "General Purpose"},
            {"Type": "TERM_MATCH", "Field": "volumeType",   "Value": "Standard"},
        ],
        MaxResults=5,
    )
    for item in r.get("PriceList", []):
        p = _on_demand_unit_price(item)
        if p:
            return round(p * 100, 2)  # estimate: 100 GB stored
    return None


def _efs(client, location: str) -> float | None:
    r = client.get_products(
        ServiceCode="AmazonEFS",
        Filters=[
            {"Type": "TERM_MATCH", "Field": "location",     "Value": location},
            {"Type": "TERM_MATCH", "Field": "storageClass", "Value": "General Purpose"},
        ],
        MaxResults=5,
    )
    for item in r.get("PriceList", []):
        p = _on_demand_unit_price(item)
        if p:
            return round(p * 10, 2)  # estimate: 10 GB stored
    return None


def _waf(client, location: str) -> float | None:
    r = client.get_products(
        ServiceCode="awswaf",
        Filters=[
            {"Type": "TERM_MATCH", "Field": "location", "Value": location},
            {"Type": "TERM_MATCH", "Field": "group",    "Value": "WebACL"},
        ],
        MaxResults=5,
    )
    for item in r.get("PriceList", []):
        h = _on_demand_hourly(item)
        if h:
            return round(h * _HOURS_PER_MONTH, 2)
    return None


def _secrets(client, location: str) -> float | None:
    r = client.get_products(
        ServiceCode="AWSSecretsManager",
        Filters=[
            {"Type": "TERM_MATCH", "Field": "location", "Value": location},
            {"Type": "TERM_MATCH", "Field": "group",    "Value": "Secret"},
        ],
        MaxResults=5,
    )
    for item in r.get("PriceList", []):
        p = _on_demand_unit_price(item)
        if p:
            return round(p, 2)  # per-secret per-month price
    return None


def _cloudwatch(client, location: str) -> float | None:
    r = client.get_products(
        ServiceCode="AmazonCloudWatch",
        Filters=[
            {"Type": "TERM_MATCH", "Field": "location", "Value": location},
            {"Type": "TERM_MATCH", "Field": "group",    "Value": "Metrics"},
        ],
        MaxResults=5,
    )
    for item in r.get("PriceList", []):
        p = _on_demand_unit_price(item)
        if p:
            return round(p * 10, 2)  # estimate: 10 custom metrics
    return None
