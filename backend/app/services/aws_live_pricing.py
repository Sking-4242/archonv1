"""
AWS live pricing via the public AWS Price List bulk pricing files.
No credentials or AWS account required.

Each handler returns a usage-aware monthly USD estimate, or None when the
pricing file is unavailable or the SKU cannot be matched (static fallback).
"""
from __future__ import annotations

import gzip
import json
import time
import urllib.error
import urllib.request
from typing import Callable

_HOURS = 730.0
_DOWNLOAD_TIMEOUT = 60
_TTL = 3600.0

_SVC_CACHE: dict[tuple[str, str | None], tuple[float, dict, dict]] = {}

_PRICING_REGIONAL = (
    "https://pricing.us-east-1.amazonaws.com"
    "/offers/v1.0/aws/{svc}/current/{region}/index.json"
)
_PRICING_GLOBAL = (
    "https://pricing.us-east-1.amazonaws.com"
    "/offers/v1.0/aws/{svc}/current/index.json"
)

_RDS_ENGINES = {
    "mysql": "MySQL",
    "postgres": "PostgreSQL",
    "postgresql": "PostgreSQL",
    "mariadb": "MariaDB",
    "oracle": "Oracle",
    "sqlserver": "SQL Server",
    "sql server": "SQL Server",
}


def _usage_float(usage: dict | None, key: str, default: float) -> float:
    val = (usage or {}).get(key, default)
    try:
        return float(val)
    except (TypeError, ValueError):
        return float(default)


def _load_service(svc: str, region: str | None) -> tuple[dict, dict] | None:
    now = time.monotonic()
    key = (svc, region)
    entry = _SVC_CACHE.get(key)
    if entry and now < entry[0]:
        return entry[1], entry[2]

    url = _PRICING_GLOBAL.format(svc=svc) if region is None else _PRICING_REGIONAL.format(
        svc=svc, region=region
    )
    req = urllib.request.Request(
        url,
        headers={"Accept-Encoding": "gzip, deflate", "User-Agent": "Archon/1.0"},
    )
    try:
        with urllib.request.urlopen(req, timeout=_DOWNLOAD_TIMEOUT) as resp:
            raw = resp.read()
            if "gzip" in resp.headers.get("Content-Encoding", ""):
                raw = gzip.decompress(raw)
        data = json.loads(raw)
    except (urllib.error.URLError, OSError, ValueError):
        return None

    products = data.get("products", {})
    terms = data.get("terms", {}).get("OnDemand", {})
    _SVC_CACHE[key] = (now + _TTL, products, terms)
    return products, terms


def _on_demand_rate(sku: str, terms: dict) -> float | None:
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


def _match_attrs(products: dict, terms: dict, attrs: dict[str, str]) -> float | None:
    for sku, prod in products.items():
        product_attrs = prod.get("attributes", {})
        if all(product_attrs.get(k) == v for k, v in attrs.items()):
            rate = _on_demand_rate(sku, terms)
            if rate is not None:
                return rate
    return None


def _match_any_attrs(products: dict, terms: dict, options: list[dict[str, str]]) -> float | None:
    for attrs in options:
        rate = _match_attrs(products, terms, attrs)
        if rate is not None:
            return rate
    return None


def _group_rate(products: dict, terms: dict, group_contains: str) -> float | None:
    needle = group_contains.lower()
    for sku, prod in products.items():
        group = prod.get("attributes", {}).get("group", "")
        if needle in group.lower():
            rate = _on_demand_rate(sku, terms)
            if rate is not None:
                return rate
    return None


def _family_rate(products: dict, terms: dict, family: str) -> float | None:
    return _match_attrs(products, terms, {"productFamily": family})


def _hours_cost(hourly: float, usage: dict | None, hours_key: str = "hours_per_month") -> float:
    hours = _usage_float(usage, hours_key, _HOURS)
    return round(hourly * hours, 2)


def _rds_engine(config: dict) -> str:
    raw = str(config.get("engine", "MySQL")).lower()
    return _RDS_ENGINES.get(raw, config.get("engine", "MySQL"))


# ─── Handlers ──────────────────────────────────────────────────────────────────

def _ec2(config: dict, region: str, usage: dict | None) -> float | None:
    data = _load_service("AmazonEC2", region)
    if data is None:
        return None
    products, terms = data
    hourly = _match_attrs(products, terms, {
        "instanceType": config.get("instance_type", "t3.micro"),
        "operatingSystem": "Linux",
        "tenancy": "Shared",
        "capacitystatus": "Used",
        "preInstalledSw": "NA",
    })
    if hourly is None:
        return None
    transfer_gb = _usage_float(usage, "data_transfer_gb", 10)
    return round(_hours_cost(hourly, usage) + transfer_gb * 0.09, 2)


def _rds(config: dict, region: str, usage: dict | None) -> float | None:
    data = _load_service("AmazonRDS", region)
    if data is None:
        return None
    products, terms = data
    hourly = _match_any_attrs(products, terms, [
        {
            "instanceType": config.get("instance_class", "db.t3.micro"),
            "databaseEngine": _rds_engine(config),
            "deploymentOption": "Single-AZ",
        },
        {
            "instanceType": config.get("instance_class", "db.t3.micro"),
            "databaseEngine": _rds_engine(config),
        },
    ])
    if hourly is None:
        return None
    storage_gb = _usage_float(usage, "storage_gb", 20)
    return round(_hours_cost(hourly, usage) + storage_gb * 0.115, 2)


def _aurora(config: dict, region: str, usage: dict | None) -> float | None:
    engine = _rds_engine(config)
    aurora_engine = "Aurora PostgreSQL" if "postgres" in engine.lower() else "Aurora MySQL"
    data = _load_service("AmazonRDS", region)
    if data is None:
        return None
    products, terms = data
    hourly = _match_any_attrs(products, terms, [
        {
            "instanceType": config.get("instance_class", "db.t3.medium"),
            "databaseEngine": aurora_engine,
            "deploymentOption": "Single-AZ",
        },
        {
            "instanceType": config.get("instance_class", "db.t3.medium"),
            "databaseEngine": aurora_engine,
        },
    ])
    if hourly is None:
        return None
    storage_gb = _usage_float(usage, "storage_gb", 20)
    io_m = _usage_float(usage, "io_millions", 1)
    return round(_hours_cost(hourly, usage) + storage_gb * 0.10 + io_m * 0.20, 2)


def _elasticache(config: dict, region: str, usage: dict | None) -> float | None:
    data = _load_service("AmazonElastiCache", region)
    if data is None:
        return None
    products, terms = data
    hourly = _match_any_attrs(products, terms, [
        {
            "instanceType": config.get("node_type", "cache.t3.micro"),
            "cacheEngine": "Redis",
        },
        {
            "instanceType": config.get("node_type", "cache.t3.micro"),
        },
    ])
    return _hours_cost(hourly, usage) if hourly else None


def _elb(config: dict, region: str, usage: dict | None) -> float | None:
    data = _load_service("AWSELB", region)
    if data is None:
        return None
    products, terms = data
    hourly = _match_any_attrs(products, terms, [
        {"productFamily": "Load Balancer-Application"},
        {"productFamily": "Load Balancer"},
    ])
    if hourly is None:
        return None
    lcus = _usage_float(usage, "lcus_per_hour", 1)
    hours = _usage_float(usage, "hours_per_month", _HOURS)
    return round((hourly + hourly * lcus) * hours, 2)


def _nlb(config: dict, region: str, usage: dict | None) -> float | None:
    data = _load_service("AWSELB", region)
    if data is None:
        return None
    products, terms = data
    hourly = _match_any_attrs(products, terms, [
        {"productFamily": "Load Balancer-Network"},
        {"productFamily": "Load Balancer"},
    ])
    if hourly is None:
        return None
    lcus = _usage_float(usage, "lcus_per_hour", 1)
    hours = _usage_float(usage, "hours_per_month", _HOURS)
    return round((hourly + hourly * lcus) * hours, 2)


def _nat(config: dict, region: str, usage: dict | None) -> float | None:
    data = _load_service("AmazonEC2", region)
    if data is None:
        return None
    products, terms = data
    hourly = _match_any_attrs(products, terms, [
        {"productFamily": "NAT Gateway", "group": "NGW:NatGatewayHours"},
        {"productFamily": "NAT Gateway"},
    ])
    if hourly is None:
        return None
    data_gb = _usage_float(usage, "data_processed_gb", 100)
    per_gb = _group_rate(products, terms, "NatGateway-Bytes") or 0.045
    return round(_hours_cost(hourly, usage) + data_gb * per_gb, 2)


def _s3(config: dict, region: str, usage: dict | None) -> float | None:
    data = _load_service("AmazonS3", region)
    if data is None:
        return None
    products, terms = data
    per_gb = _match_any_attrs(products, terms, [
        {
            "productFamily": "Storage",
            "storageClass": "General Purpose",
            "volumeType": "Standard",
        },
        {"productFamily": "Storage", "volumeType": "Standard"},
    ])
    if per_gb is None:
        return None
    storage_gb = _usage_float(usage, "storage_gb", 100)
    puts_k = _usage_float(usage, "put_requests", 100)
    gets_k = _usage_float(usage, "get_requests", 1_000)
    put_rate = _group_rate(products, terms, "Requests-Tier1") or 0.005
    get_rate = _group_rate(products, terms, "Requests-Tier2") or 0.0004
    total = storage_gb * per_gb + puts_k * put_rate + gets_k * get_rate
    return round(total, 2)


def _ebs(config: dict, region: str, usage: dict | None) -> float | None:
    data = _load_service("AmazonEC2", region)
    if data is None:
        return None
    products, terms = data
    per_gb = _match_any_attrs(products, terms, [
        {"productFamily": "Storage", "volumeType": "General Purpose"},
        {"productFamily": "Storage", "volumeType": "gp3"},
    ])
    if per_gb is None:
        return None
    storage_gb = _usage_float(usage, "storage_gb", 80)
    return round(storage_gb * per_gb, 2)


def _efs(config: dict, region: str, usage: dict | None) -> float | None:
    data = _load_service("AmazonEFS", region)
    if data is None:
        return None
    products, terms = data
    per_gb = _match_any_attrs(products, terms, [
        {"productFamily": "Storage", "storageClass": "General Purpose"},
        {"productFamily": "Storage"},
    ])
    if per_gb is None:
        return None
    storage_gb = _usage_float(usage, "storage_gb", 10)
    return round(storage_gb * per_gb, 2)


def _lambda_fn(config: dict, region: str, usage: dict | None) -> float | None:
    data = _load_service("AWSLambda", region)
    if data is None:
        return None
    products, terms = data
    req_rate = _group_rate(products, terms, "Request") or _group_rate(products, terms, "Requests")
    gb_sec_rate = _group_rate(products, terms, "Duration") or _group_rate(products, terms, "Lambda-GB")
    if req_rate is None and gb_sec_rate is None:
        return None
    invocations = _usage_float(usage, "invocations_monthly", 1_000_000)
    duration_ms = _usage_float(usage, "avg_duration_ms", 200)
    memory_mb = _usage_float(usage, "memory_mb", 128)
    billable_invocations = max(0, invocations - 1_000_000)
    request_cost = billable_invocations * (req_rate or 0.0000000002)
    gb_seconds = (memory_mb / 1024) * (duration_ms / 1000) * invocations
    billable_gb_seconds = max(0, gb_seconds - 400_000)
    duration_cost = billable_gb_seconds * (gb_sec_rate or 0.0000166667)
    return round(request_cost + duration_cost, 2)


def _dynamodb(config: dict, region: str, usage: dict | None) -> float | None:
    data = _load_service("AmazonDynamoDB", region)
    if data is None:
        return None
    products, terms = data
    write_rate = _group_rate(products, terms, "WriteCapacityUnit") or _group_rate(products, terms, "WriteRequestUnits")
    read_rate = _group_rate(products, terms, "ReadCapacityUnit") or _group_rate(products, terms, "ReadRequestUnits")
    storage_rate = _group_rate(products, terms, "Storage") or _group_rate(products, terms, "TimedStorage")
    writes_m = _usage_float(usage, "write_units_monthly", 1)
    reads_m = _usage_float(usage, "read_units_monthly", 4)
    storage_gb = _usage_float(usage, "storage_gb", 1)
    total = 0.0
    if write_rate:
        total += writes_m * 1_000_000 * write_rate
    if read_rate:
        total += reads_m * 1_000_000 * read_rate
    if storage_rate:
        total += storage_gb * storage_rate
    if total <= 0:
        return None
    return round(total, 2)


def _api_gateway(config: dict, region: str, usage: dict | None) -> float | None:
    data = _load_service("AmazonApiGateway", region)
    if data is None:
        return None
    products, terms = data
    per_call = _group_rate(products, terms, "ApiGatewayRequest") or _family_rate(products, terms, "API calls")
    if per_call is None:
        return None
    calls_m = _usage_float(usage, "calls_monthly", 1)
    transfer_gb = _usage_float(usage, "data_transfer_gb", 1)
    return round(calls_m * 1_000_000 * per_call + transfer_gb * 0.09, 2)


def _sqs(config: dict, region: str, usage: dict | None) -> float | None:
    data = _load_service("AmazonSQS", region)
    if data is None:
        data = _load_service("AWSQueueService", region)
    if data is None:
        return None
    products, terms = data
    per_req = _group_rate(products, terms, "Requests") or _family_rate(products, terms, "API Request")
    if per_req is None:
        return None
    requests_m = _usage_float(usage, "requests_monthly", 1)
    billable = max(0, requests_m - 1) * 1_000_000
    return round(billable * per_req, 2)


def _sns(config: dict, region: str, usage: dict | None) -> float | None:
    data = _load_service("AmazonSNS", region)
    if data is None:
        return None
    products, terms = data
    per_note = _group_rate(products, terms, "DeliveryAttempts") or _group_rate(products, terms, "Requests")
    if per_note is None:
        return None
    notifications_m = _usage_float(usage, "notifications_monthly", 1)
    return round(notifications_m * 1_000_000 * per_note, 2)


def _kinesis(config: dict, region: str, usage: dict | None) -> float | None:
    data = _load_service("AmazonKinesis", region)
    if data is None:
        return None
    products, terms = data
    shard_hour = _group_rate(products, terms, "ShardHour") or _group_rate(products, terms, "Storage")
    put_rate = _group_rate(products, terms, "PUT")
    shards = _usage_float(usage, "shards", 1)
    put_units_m = _usage_float(usage, "put_units_monthly", 1)
    total = 0.0
    if shard_hour:
        total += shards * shard_hour * _HOURS
    if put_rate:
        total += put_units_m * 1_000_000 * put_rate
    return round(total, 2) if total > 0 else None


def _kinesis_firehose(config: dict, region: str, usage: dict | None) -> float | None:
    data = _load_service("AmazonKinesisFirehose", region)
    if data is None:
        return None
    products, terms = data
    per_gb = _group_rate(products, terms, "DataFormatConversion") or _group_rate(products, terms, "Delivery")
    if per_gb is None:
        per_gb = _family_rate(products, terms, "Kinesis Firehose")
    if per_gb is None:
        return None
    data_gb = _usage_float(usage, "data_ingested_gb", 1)
    return round(data_gb * per_gb, 2)


def _eventbridge(config: dict, region: str, usage: dict | None) -> float | None:
    data = _load_service("AWSEvents", region)
    if data is None:
        return None
    products, terms = data
    per_event = _group_rate(products, terms, "Event") or _family_rate(products, terms, "EventBridge")
    if per_event is None:
        return None
    events_m = _usage_float(usage, "events_monthly", 1)
    return round(events_m * 1_000_000 * per_event, 2)


def _step_functions(config: dict, region: str, usage: dict | None) -> float | None:
    data = _load_service("AmazonStates", region)
    if data is None:
        return None
    products, terms = data
    per_transition = _group_rate(products, terms, "StateTransition") or _family_rate(products, terms, "Step Functions")
    if per_transition is None:
        return None
    transitions_k = _usage_float(usage, "transitions_monthly", 1_000)
    return round(transitions_k * 1_000 * per_transition, 2)


def _eks(config: dict, region: str, usage: dict | None) -> float | None:
    data = _load_service("AmazonEKS", region)
    if data is None:
        return None
    products, terms = data
    hourly = _group_rate(products, terms, "Cluster") or _family_rate(products, terms, "Amazon EKS")
    if hourly is None:
        return None
    return _hours_cost(hourly, usage)


def _ecs_fargate(config: dict, region: str, usage: dict | None) -> float | None:
    data = _load_service("AmazonECS", region)
    if data is None:
        return None
    products, terms = data
    vcpu_rate = _group_rate(products, terms, "Fargate-vCPU") or _group_rate(products, terms, "vCPU")
    mem_rate = _group_rate(products, terms, "Fargate-GB") or _group_rate(products, terms, "Memory")
    vcpu = _usage_float(usage, "vcpu", 0.25)
    memory_gb = _usage_float(usage, "memory_gb", 0.5)
    hours = _usage_float(usage, "hours_per_month", _HOURS)
    if vcpu_rate and mem_rate:
        return round((vcpu * vcpu_rate + memory_gb * mem_rate) * hours, 2)
    return None


def _redshift(config: dict, region: str, usage: dict | None) -> float | None:
    data = _load_service("AmazonRedshift", region)
    if data is None:
        return None
    products, terms = data
    hourly = _group_rate(products, terms, "Compute") or _family_rate(products, terms, "Compute Instance")
    if hourly is None:
        return None
    nodes = _usage_float(usage, "num_nodes", 1)
    hours = _usage_float(usage, "hours_per_month", _HOURS)
    return round(hourly * nodes * hours, 2)


def _documentdb(config: dict, region: str, usage: dict | None) -> float | None:
    data = _load_service("AmazonDocDB", region)
    if data is None:
        return None
    products, terms = data
    hourly = _group_rate(products, terms, "Instance") or _family_rate(products, terms, "Database Instance")
    return _hours_cost(hourly, usage) if hourly else None


def _neptune(config: dict, region: str, usage: dict | None) -> float | None:
    data = _load_service("AmazonNeptune", region)
    if data is None:
        return None
    products, terms = data
    hourly = _group_rate(products, terms, "Instance") or _family_rate(products, terms, "Database Instance")
    return _hours_cost(hourly, usage) if hourly else None


def _opensearch(config: dict, region: str, usage: dict | None) -> float | None:
    data = _load_service("AmazonES", region)
    if data is None:
        return None
    products, terms = data
    hourly = _group_rate(products, terms, "Instance") or _family_rate(products, terms, "Amazon OpenSearch Service")
    if hourly is None:
        return None
    nodes = _usage_float(usage, "num_nodes", 2)
    hours = _usage_float(usage, "hours_per_month", _HOURS)
    return round(hourly * nodes * hours, 2)


def _athena(config: dict, region: str, usage: dict | None) -> float | None:
    data = _load_service("AmazonAthena", region)
    if data is None:
        return None
    products, terms = data
    per_tb = _group_rate(products, terms, "Scan") or _family_rate(products, terms, "Athena")
    if per_tb is None:
        return None
    tb_scanned = _usage_float(usage, "tb_scanned_monthly", 1)
    return round(tb_scanned * per_tb, 2)


def _glue(config: dict, region: str, usage: dict | None) -> float | None:
    data = _load_service("AWSGlue", region)
    if data is None:
        return None
    products, terms = data
    per_dpu = _group_rate(products, terms, "DPU") or _family_rate(products, terms, "AWS Glue")
    if per_dpu is None:
        return None
    dpu_hours = _usage_float(usage, "dpu_hours_monthly", 88)
    return round(dpu_hours * per_dpu, 2)


def _msk(config: dict, region: str, usage: dict | None) -> float | None:
    data = _load_service("AmazonMSK", region)
    if data is None:
        return None
    products, terms = data
    hourly = _group_rate(products, terms, "Broker") or _family_rate(products, terms, "Amazon MSK")
    if hourly is None:
        return None
    brokers = _usage_float(usage, "brokers", 3)
    hours = _usage_float(usage, "hours_per_month", _HOURS)
    return round(hourly * brokers * hours, 2)


def _mq(config: dict, region: str, usage: dict | None) -> float | None:
    data = _load_service("AmazonMQ", region)
    if data is None:
        return None
    products, terms = data
    hourly = _group_rate(products, terms, "Instance") or _family_rate(products, terms, "Amazon MQ")
    return _hours_cost(hourly, usage) if hourly else None


def _appsync(config: dict, region: str, usage: dict | None) -> float | None:
    data = _load_service("AWSAppSync", region)
    if data is None:
        return None
    products, terms = data
    per_million = _group_rate(products, terms, "Operation") or _family_rate(products, terms, "AppSync")
    if per_million is None:
        return None
    ops_m = _usage_float(usage, "operations_monthly", 4)
    return round(ops_m * 1_000_000 * per_million, 2)


def _waf(config: dict, region: str, usage: dict | None) -> float | None:
    data = _load_service("awswaf", region)
    if data is None:
        return None
    products, terms = data
    acl_rate = _group_rate(products, terms, "WebACL") or _family_rate(products, terms, "Web Application Firewall")
    req_rate = _group_rate(products, terms, "Request")
    requests_m = _usage_float(usage, "requests_monthly", 1)
    total = 0.0
    if acl_rate:
        total += acl_rate * _HOURS
    if req_rate:
        total += requests_m * 1_000_000 * req_rate
    return round(total, 2) if total > 0 else None


def _secrets(config: dict, region: str, usage: dict | None) -> float | None:
    data = _load_service("AWSSecretsManager", region)
    if data is None:
        return None
    products, terms = data
    per_secret = _group_rate(products, terms, "Secret") or _family_rate(products, terms, "Secret")
    if per_secret is None:
        return None
    secrets = _usage_float(usage, "secrets", 1)
    return round(secrets * per_secret, 2)


def _cloudwatch(config: dict, region: str, usage: dict | None) -> float | None:
    data = _load_service("AmazonCloudWatch", region)
    if data is None:
        return None
    products, terms = data
    metric_rate = _group_rate(products, terms, "Metric") or _family_rate(products, terms, "CloudWatch Metrics")
    ingest_rate = _group_rate(products, terms, "DataProcessing") or _group_rate(products, terms, "Logs")
    storage_rate = _group_rate(products, terms, "Storage")
    custom_metrics = _usage_float(usage, "custom_metrics", 10)
    log_ingest_gb = _usage_float(usage, "log_gb_monthly", 5)
    log_storage_gb = _usage_float(usage, "log_storage_gb", 20)
    total = 0.0
    if metric_rate:
        total += custom_metrics * metric_rate
    if ingest_rate:
        total += log_ingest_gb * ingest_rate
    if storage_rate:
        total += log_storage_gb * storage_rate
    return round(total, 2) if total > 0 else None


def _kms(config: dict, region: str, usage: dict | None) -> float | None:
    data = _load_service("awskms", region)
    if data is None:
        return None
    products, terms = data
    per_key = _group_rate(products, terms, "KMS-Keys") or _family_rate(products, terms, "Key Management Service")
    if per_key is None:
        return None
    keys = _usage_float(usage, "keys", 1)
    return round(keys * per_key, 2)


def _route53(config: dict, region: str, usage: dict | None) -> float | None:
    data = _load_service("AmazonRoute53", None)
    if data is None:
        return None
    products, terms = data
    zone_rate = _group_rate(products, terms, "HostedZone") or _family_rate(products, terms, "Hosted Zone")
    query_rate = _group_rate(products, terms, "DNS-Queries") or _group_rate(products, terms, "Queries")
    zones = _usage_float(usage, "hosted_zones", 1)
    queries_m = _usage_float(usage, "queries_monthly", 1)
    total = 0.0
    if zone_rate:
        total += zones * zone_rate
    if query_rate:
        total += queries_m * 1_000_000 * query_rate
    return round(total, 2) if total > 0 else None


def _cloudfront(config: dict, region: str, usage: dict | None) -> float | None:
    data = _load_service("AmazonCloudFront", None)
    if data is None:
        return None
    products, terms = data
    req_rate = _group_rate(products, terms, "Requests") or _family_rate(products, terms, "Request")
    transfer_rate = _group_rate(products, terms, "DataTransfer") or _group_rate(products, terms, "Bytes")
    requests_m = _usage_float(usage, "requests_monthly", 10)
    transfer_gb = _usage_float(usage, "data_transfer_gb", 10)
    total = 0.0
    if req_rate:
        total += requests_m * 1_000_000 * req_rate
    if transfer_rate:
        total += transfer_gb * transfer_rate
    return round(total, 2) if total > 0 else None


def _sagemaker(config: dict, region: str, usage: dict | None) -> float | None:
    data = _load_service("AmazonSageMaker", region)
    if data is None:
        return None
    products, terms = data
    hourly = _group_rate(products, terms, "Host") or _family_rate(products, terms, "ML Instance")
    return _hours_cost(hourly, usage) if hourly else None


def _guardduty(config: dict, region: str, usage: dict | None) -> float | None:
    data = _load_service("AmazonGuardDuty", region)
    if data is None:
        return None
    products, terms = data
    ct_rate = _group_rate(products, terms, "CloudTrail") or _family_rate(products, terms, "GuardDuty")
    dns_rate = _group_rate(products, terms, "DNS")
    ct_gb = _usage_float(usage, "cloudtrail_gb", 5)
    dns_gb = _usage_float(usage, "dns_gb", 2)
    total = 0.0
    if ct_rate:
        total += max(0, ct_gb - 2) * ct_rate
    if dns_rate:
        total += dns_gb * dns_rate
    return round(total, 2) if total > 0 else None


def _xray(config: dict, region: str, usage: dict | None) -> float | None:
    data = _load_service("AWSXRay", region)
    if data is None:
        return None
    products, terms = data
    per_trace = _group_rate(products, terms, "Trace") or _family_rate(products, terms, "X-Ray")
    if per_trace is None:
        return None
    traces_k = _usage_float(usage, "traces_monthly", 100)
    billable_k = max(0, traces_k - 100)
    return round(billable_k * 1_000 * per_trace, 2)


def _config(config: dict, region: str, usage: dict | None) -> float | None:
    data = _load_service("AWSConfig", region)
    if data is None:
        return None
    products, terms = data
    per_item = _group_rate(products, terms, "ConfigurationItem") or _family_rate(products, terms, "AWS Config")
    if per_item is None:
        return None
    items_k = _usage_float(usage, "config_items_monthly", 100)
    return round(items_k * 1_000 * per_item, 2)


def _cognito(config: dict, region: str, usage: dict | None) -> float | None:
    data = _load_service("AmazonCognito", region)
    if data is None:
        return None
    products, terms = data
    per_mau = _group_rate(products, terms, "MAU") or _family_rate(products, terms, "Cognito")
    if per_mau is None:
        return None
    maus = _usage_float(usage, "maus", 1_000)
    billable = max(0, maus - 50_000)
    return round(billable * per_mau, 2)


_HANDLERS: dict[str, Callable[[dict, str, dict | None], float | None]] = {
    "ec2": _ec2,
    "rds": _rds,
    "aurora": _aurora,
    "elasticache": _elasticache,
    "elb": _elb,
    "alb": _elb,
    "nlb": _nlb,
    "nat_gateway": _nat,
    "s3": _s3,
    "ebs": _ebs,
    "efs": _efs,
    "lambda": _lambda_fn,
    "dynamodb": _dynamodb,
    "api_gateway": _api_gateway,
    "sqs": _sqs,
    "sns": _sns,
    "kinesis": _kinesis,
    "kinesis_firehose": _kinesis_firehose,
    "eventbridge": _eventbridge,
    "step_functions": _step_functions,
    "eks": _eks,
    "ecs_fargate": _ecs_fargate,
    "redshift": _redshift,
    "documentdb": _documentdb,
    "neptune": _neptune,
    "opensearch": _opensearch,
    "athena": _athena,
    "glue": _glue,
    "msk": _msk,
    "mq": _mq,
    "appsync": _appsync,
    "waf": _waf,
    "wafv2": _waf,
    "secretsmanager": _secrets,
    "cloudwatch": _cloudwatch,
    "kms": _kms,
    "kms_key": _kms,
    "route53": _route53,
    "cloudfront": _cloudfront,
    "sagemaker": _sagemaker,
    "guardduty": _guardduty,
    "xray": _xray,
    "config": _config,
    "cognito": _cognito,
}


def fetch_aws_price(
    component_type: str,
    config: dict,
    region: str,
    usage: dict | None = None,
) -> float | None:
    """Return a usage-aware monthly USD estimate, or None when unavailable."""
    handler = _HANDLERS.get(component_type.lower())
    if handler is None:
        return None
    try:
        return handler(config or {}, region, usage)
    except Exception:
        return None
