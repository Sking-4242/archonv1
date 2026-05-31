"""AWS data sources for FinOps live analysis (CloudWatch + Cost Explorer)."""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any

from app.models.graph import Component, Graph

logger = logging.getLogger(__name__)

# Canvas config keys tried in order when resolving AWS resource identifiers.
_EC2_ID_KEYS = ("instance_id", "aws_instance_id", "resource_id")
_RDS_ID_KEYS = ("db_instance_identifier", "identifier", "resource_id")
_LAMBDA_ID_KEYS = ("function_name", "resource_id")


def _cfg(component: Component, key: str, default: Any = None) -> Any:
    return (component.config or {}).get(key, default)


def _first_cfg(component: Component, keys: tuple[str, ...]) -> str | None:
    for key in keys:
        val = _cfg(component, key)
        if val:
            return str(val)
    return None


def _safe_label_slug(label: str) -> str:
    return "".join(c if c.isalnum() else "_" for c in label.lower()).strip("_") or "resource"


def _get_boto3_session(profile: str | None = None):
    try:
        import boto3
    except ImportError:
        return None, "boto3 is not installed on the backend server"
    try:
        session = boto3.Session(profile_name=profile) if profile else boto3.Session()
        return session, None
    except Exception as exc:
        return None, str(exc)


def _metric_average(
    cloudwatch,
    *,
    namespace: str,
    metric_name: str,
    dimensions: list[dict[str, str]],
    days: int,
    stat: str = "Average",
) -> float | None:
    end = datetime.now(timezone.utc)
    start = end - timedelta(days=days)
    try:
        resp = cloudwatch.get_metric_statistics(
            Namespace=namespace,
            MetricName=metric_name,
            Dimensions=dimensions,
            StartTime=start,
            EndTime=end,
            Period=3600 * 6,
            Statistics=[stat],
        )
    except Exception as exc:
        logger.debug("CloudWatch metric failed %s/%s: %s", namespace, metric_name, exc)
        return None
    points = resp.get("Datapoints") or []
    if not points:
        return None
    values = [float(p[stat]) for p in points if p.get(stat) is not None]
    if not values:
        return None
    return sum(values) / len(values)


def fetch_cloudwatch_utilization(
    graph: Graph,
    *,
    days: int = 14,
    profile: str | None = None,
) -> tuple[dict[str, dict[str, float]], dict[str, str]]:
    """
    Return (utilization_by_component_id, status_messages).

    utilization values use keys like cpu_avg_percent, memory_avg_percent,
    connections_avg, invocations_sum.
    """
    utilization: dict[str, dict[str, float]] = {}
    status: dict[str, str] = {"state": "skipped", "detail": "Not requested"}

    provider = (graph.provider or "aws").lower()
    if provider != "aws":
        status["state"] = "skipped"
        status["detail"] = f"CloudWatch metrics apply to AWS graphs (provider={provider})"
        return utilization, status

    session, err = _get_boto3_session(profile)
    if session is None:
        status["state"] = "error"
        status["detail"] = err or "Could not create AWS session"
        return utilization, status

    region = graph.region or "us-east-1"
    try:
        cw = session.client("cloudwatch", region_name=region)
    except Exception as exc:
        status["state"] = "error"
        status["detail"] = f"CloudWatch client error: {exc}"
        return utilization, status

    matched = 0
    skipped = 0
    for component in graph.components:
        metrics: dict[str, float] = {}

        if component.type == "ec2":
            instance_id = _first_cfg(component, _EC2_ID_KEYS)
            if not instance_id:
                skipped += 1
                continue
            cpu = _metric_average(
                cw,
                namespace="AWS/EC2",
                metric_name="CPUUtilization",
                dimensions=[{"Name": "InstanceId", "Value": instance_id}],
                days=days,
            )
            if cpu is not None:
                metrics["cpu_avg_percent"] = round(cpu, 1)
            matched += 1 if metrics else 0

        elif component.type == "rds":
            db_id = _first_cfg(component, _RDS_ID_KEYS) or _safe_label_slug(component.label)
            cpu = _metric_average(
                cw,
                namespace="AWS/RDS",
                metric_name="CPUUtilization",
                dimensions=[{"Name": "DBInstanceIdentifier", "Value": db_id}],
                days=days,
            )
            conns = _metric_average(
                cw,
                namespace="AWS/RDS",
                metric_name="DatabaseConnections",
                dimensions=[{"Name": "DBInstanceIdentifier", "Value": db_id}],
                days=days,
            )
            if cpu is not None:
                metrics["cpu_avg_percent"] = round(cpu, 1)
            if conns is not None:
                metrics["connections_avg"] = round(conns, 1)
            if metrics:
                matched += 1
            else:
                skipped += 1

        elif component.type == "lambda":
            fn_name = _first_cfg(component, _LAMBDA_ID_KEYS) or _safe_label_slug(component.label)
            invocations = _metric_average(
                cw,
                namespace="AWS/Lambda",
                metric_name="Invocations",
                dimensions=[{"Name": "FunctionName", "Value": fn_name}],
                days=days,
                stat="Sum",
            )
            duration = _metric_average(
                cw,
                namespace="AWS/Lambda",
                metric_name="Duration",
                dimensions=[{"Name": "FunctionName", "Value": fn_name}],
                days=days,
            )
            if invocations is not None:
                metrics["invocations_sum"] = round(invocations, 0)
            if duration is not None:
                metrics["duration_avg_ms"] = round(duration, 1)
            if metrics:
                matched += 1
            else:
                skipped += 1

        if metrics:
            utilization[component.id] = metrics

    if matched:
        status["state"] = "ok"
        status["detail"] = f"Fetched metrics for {matched} component(s)"
        if skipped:
            status["detail"] += f"; {skipped} skipped (set instance_id / db_instance_identifier / function_name in config)"
    else:
        status["state"] = "empty"
        status["detail"] = (
            "No CloudWatch metrics found. Set aws resource IDs on EC2/RDS/Lambda components "
            "or import resources from discovery."
        )

    return utilization, status


def fetch_cost_explorer_by_service(
    *,
    region: str = "us-east-1",
    days: int = 30,
    profile: str | None = None,
) -> tuple[dict[str, float], dict[str, str]]:
    """
    Fetch unblended cost grouped by AWS service for the last `days` days.
    Returns canvas-type totals (same mapping as CSV parser).
    """
    from app.services.finops_analyzer import parse_cost_explorer_csv

    # Re-use service→type mapping via a synthetic row set built from CE API response.
    status: dict[str, str] = {"state": "skipped", "detail": "Not requested"}

    session, err = _get_boto3_session(profile)
    if session is None:
        status["state"] = "error"
        status["detail"] = err or "Could not create AWS session"
        return {}, status

    end = datetime.now(timezone.utc).date()
    start = end - timedelta(days=days)
    try:
        ce = session.client("ce", region_name="us-east-1")
        resp = ce.get_cost_and_usage(
            TimePeriod={"Start": start.isoformat(), "End": end.isoformat()},
            Granularity="MONTHLY",
            Metrics=["UnblendedCost"],
            GroupBy=[{"Type": "DIMENSION", "Key": "SERVICE"}],
        )
    except Exception as exc:
        status["state"] = "error"
        status["detail"] = f"Cost Explorer API error: {exc}"
        return {}, status

    # Build pseudo-CSV for the shared parser.
    lines = ["Service,Unblended Cost"]
    for item in resp.get("ResultsByTime") or []:
        for group in item.get("Groups") or []:
            service = group.get("Keys", [""])[0]
            amount = group.get("Metrics", {}).get("UnblendedCost", {}).get("Amount", "0")
            lines.append(f'"{service}","{amount}"')

    parsed = parse_cost_explorer_csv("\n".join(lines))
    if not parsed:
        status["state"] = "empty"
        status["detail"] = "Cost Explorer returned no mappable service rows"
        return {}, status

    status["state"] = "ok"
    status["detail"] = f"Loaded {len(parsed)} service cost bucket(s) for last {days} days"
    return parsed, status


def parse_utilization_csv(text: str) -> dict[str, dict[str, float]] | None:
    """
    Parse utilization CSV with header:
    component_id,cpu_avg_percent,memory_avg_percent
    Extra numeric columns are accepted.
    """
    lines = [ln.strip() for ln in text.strip().splitlines() if ln.strip()]
    if len(lines) < 2:
        return None
    headers = [h.strip().lower() for h in lines[0].split(",")]
    if "component_id" not in headers:
        return None
    cid_idx = headers.index("component_id")
    result: dict[str, dict[str, float]] = {}
    for line in lines[1:]:
        cols = [c.strip() for c in line.split(",")]
        if cid_idx >= len(cols):
            continue
        cid = cols[cid_idx]
        metrics: dict[str, float] = {}
        for i, header in enumerate(headers):
            if i == cid_idx or i >= len(cols):
                continue
            try:
                metrics[header] = float(cols[i])
            except ValueError:
                continue
        if metrics:
            result[cid] = metrics
    return result or None
