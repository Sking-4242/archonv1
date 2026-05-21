"""
AWS live pricing via the public AWS Price List bulk pricing files.
No credentials or AWS account required.

On the first call for a (service, region) pair, this module downloads
the service's regional pricing index from the public AWS endpoint, parses
it, and caches the products + on-demand terms in-process for one hour.
Subsequent calls query the in-memory cache at zero network cost.

Public endpoint pattern (no auth, gzip-compressed in transit):
  https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/
  {SERVICE_CODE}/current/{REGION_CODE}/index.json

First-call latency by service (approximate, compressed):
  EC2: 30-60 s  — large file (~40 MB gzip), cached for the session
  RDS: 3-5 s    — ~12 MB gzip
  Others: <2 s  — <5 MB gzip
"""
from __future__ import annotations

import gzip
import json
import time
import urllib.request
import urllib.error

_HOURS_PER_MONTH = 730.0
_DOWNLOAD_TIMEOUT = 60  # seconds — EC2 file is large
_TTL = 3600.0           # cache lifetime in seconds

# (service_code, region) -> (expires_at, products_dict, on_demand_terms_dict)
_SVC_CACHE: dict[tuple[str, str], tuple[float, dict, dict]] = {}

_PRICING_BASE = (
    "https://pricing.us-east-1.amazonaws.com"
    "/offers/v1.0/aws/{svc}/current/{region}/index.json"
)

# Map component types to AWS service codes
_COMPONENT_SERVICE: dict[str, str] = {
    "ec2":            "AmazonEC2",
    "rds":            "AmazonRDS",
    "elasticache":    "AmazonElastiCache",
    "elb":            "AWSELB",
    "alb":            "AWSELB",
    "nat_gateway":    "AmazonEC2",
    "s3":             "AmazonS3",
    "efs":            "AmazonEFS",
    "waf":            "awswaf",
    "wafv2":          "awswaf",
    "secretsmanager": "AWSSecretsManager",
    "cloudwatch":     "AmazonCloudWatch",
}


def _load_service(svc: str, region: str) -> tuple[dict, dict] | None:
    """
    Return (products, on_demand_terms) for a service+region combo.

    Downloads and parses the bulk pricing file on a cache miss.
    Returns None if the download fails or times out.
    """
    now = time.monotonic()
    key = (svc, region)
    entry = _SVC_CACHE.get(key)
    if entry and now < entry[0]:
        return entry[1], entry[2]

    url = _PRICING_BASE.format(svc=svc, region=region)
    req = urllib.request.Request(
        url,
        headers={"Accept-Encoding": "gzip, deflate", "User-Agent": "Archon/1.0"},
    )
    try:
        with urllib.request.urlopen(req, timeout=_DOWNLOAD_TIMEOUT) as resp:
            raw = resp.read()
            encoding = resp.headers.get("Content-Encoding", "")
            if "gzip" in encoding:
                raw = gzip.decompress(raw)
        data = json.loads(raw)
    except (urllib.error.URLError, OSError, ValueError):
        return None

    products: dict = data.get("products", {})
    terms: dict = data.get("terms", {}).get("OnDemand", {})
    _SVC_CACHE[key] = (now + _TTL, products, terms)
    return products, terms


def _on_demand_hourly(sku: str, terms: dict) -> float | None:
    """Return the first positive on-demand USD price for a SKU."""
    for term in terms.get(sku, {}).values():
        for dim in term.get("priceDimensions", {}).values():
            usd = dim.get("pricePerUnit", {}).get("USD", "0")
            try:
                val = float(usd)
            except (TypeError, ValueError):
                continue
            if val > 0:
                return val
    return None


def _match_price(
    products: dict,
    terms: dict,
    match: dict[str, str],
) -> float | None:
    """
    Find the first product whose attributes contain all key=value pairs
    in `match`, then return its on-demand USD hourly price.

    Because we download per-region files, there is no need to filter on
    location — every product in the file is already for the target region.
    """
    for sku, prod in products.items():
        attrs = prod.get("attributes", {})
        if all(attrs.get(k) == v for k, v in match.items()):
            price = _on_demand_hourly(sku, terms)
            if price is not None:
                return price
    return None


def fetch_aws_price(component_type: str, config: dict, region: str) -> float | None:
    """
    Return an estimated monthly USD cost for the given component, or None
    when the pricing data is unavailable (network error, unsupported type).

    Results for the same (service, region) share a single downloaded file.
    """
    fn = {
        "ec2":            _ec2,
        "rds":            _rds,
        "elasticache":    _elasticache,
        "elb":            _elb,
        "alb":            _elb,
        "nat_gateway":    _nat,
        "s3":             _s3,
        "efs":            _efs,
        "waf":            _waf,
        "wafv2":          _waf,
        "secretsmanager": _secrets,
        "cloudwatch":     _cloudwatch,
    }.get(component_type)

    if fn is None:
        return None
    try:
        return fn(config, region)
    except Exception:
        return None


# ─── Per-service helpers ───────────────────────────────────────────────────────

def _ec2(config: dict, region: str) -> float | None:
    data = _load_service("AmazonEC2", region)
    if data is None:
        return None
    products, terms = data
    instance_type = config.get("instance_type", "t3.micro")
    h = _match_price(products, terms, {
        "instanceType":    instance_type,
        "operatingSystem": "Linux",
        "tenancy":         "Shared",
        "capacitystatus":  "Used",
        "preInstalledSw":  "NA",
    })
    return round(h * _HOURS_PER_MONTH, 2) if h else None


def _rds(config: dict, region: str) -> float | None:
    data = _load_service("AmazonRDS", region)
    if data is None:
        return None
    products, terms = data
    instance_class = config.get("instance_class", "db.t3.micro")
    engine = config.get("engine", "MySQL")
    h = _match_price(products, terms, {
        "instanceType":     instance_class,
        "databaseEngine":   engine,
        "deploymentOption": "Single-AZ",
    })
    return round(h * _HOURS_PER_MONTH, 2) if h else None


def _elasticache(config: dict, region: str) -> float | None:
    data = _load_service("AmazonElastiCache", region)
    if data is None:
        return None
    products, terms = data
    node_type = config.get("node_type", "cache.t3.micro")
    h = _match_price(products, terms, {
        "instanceType": node_type,
        "cacheEngine":  "Redis",
    })
    return round(h * _HOURS_PER_MONTH, 2) if h else None


def _elb(config: dict, region: str) -> float | None:
    data = _load_service("AWSELB", region)
    if data is None:
        return None
    products, terms = data
    # Try ALB first, fall back to generic Load Balancer family
    h = _match_price(products, terms, {"productFamily": "Load Balancer-Application"})
    if h is None:
        h = _match_price(products, terms, {"productFamily": "Load Balancer"})
    return round(h * _HOURS_PER_MONTH, 2) if h else None


def _nat(config: dict, region: str) -> float | None:
    data = _load_service("AmazonEC2", region)
    if data is None:
        return None
    products, terms = data
    # NAT Gateway hourly charge (not the per-GB data charge)
    h = _match_price(products, terms, {
        "productFamily": "NAT Gateway",
        "group":         "NGW:NatGatewayHours",
    })
    if h is None:
        h = _match_price(products, terms, {"productFamily": "NAT Gateway"})
    return round(h * _HOURS_PER_MONTH, 2) if h else None


def _s3(config: dict, region: str) -> float | None:
    data = _load_service("AmazonS3", region)
    if data is None:
        return None
    products, terms = data
    p = _match_price(products, terms, {
        "productFamily": "Storage",
        "storageClass":  "General Purpose",
        "volumeType":    "Standard",
    })
    if p is None:
        return None
    return round(p * 100, 2)  # estimate: 100 GB stored


def _efs(config: dict, region: str) -> float | None:
    data = _load_service("AmazonEFS", region)
    if data is None:
        return None
    products, terms = data
    p = _match_price(products, terms, {
        "productFamily": "Storage",
        "storageClass":  "General Purpose",
    })
    if p is None:
        return None
    return round(p * 10, 2)  # estimate: 10 GB stored


def _waf(config: dict, region: str) -> float | None:
    data = _load_service("awswaf", region)
    if data is None:
        return None
    products, terms = data
    h = _match_price(products, terms, {"group": "WebACL"})
    if h is None:
        h = _match_price(products, terms, {"productFamily": "Web Application Firewall"})
    return round(h * _HOURS_PER_MONTH, 2) if h else None


def _secrets(config: dict, region: str) -> float | None:
    data = _load_service("AWSSecretsManager", region)
    if data is None:
        return None
    products, terms = data
    p = _match_price(products, terms, {"group": "Secret"})
    if p is None:
        p = _match_price(products, terms, {"productFamily": "Secret"})
    return round(p, 2) if p else None  # per-secret per-month price


def _cloudwatch(config: dict, region: str) -> float | None:
    data = _load_service("AmazonCloudWatch", region)
    if data is None:
        return None
    products, terms = data
    p = _match_price(products, terms, {"group": "Metrics"})
    if p is None:
        p = _match_price(products, terms, {"productFamily": "CloudWatch Metrics"})
    return round(p * 10, 2) if p else None  # estimate: 10 custom metrics
