"""FinOps live analysis — rule-based cost optimization recommendations."""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any

from app.models.graph import Component, Graph

# Maps Cost Explorer service names → canvas types (mirrors frontend EstimatePanel).
_CSV_SERVICE_MAP: dict[str, str] = {
    "amazon elastic compute cloud - compute": "ec2",
    "ec2 - other": "ec2",
    "amazon ec2": "ec2",
    "amazon relational database service": "rds",
    "amazon simple storage service": "s3",
    "amazon virtual private cloud": "vpc",
    "amazon elastic load balancing": "alb",
    "aws lambda": "lambda",
    "amazon elastic container service": "ecs_fargate",
    "amazon elastic kubernetes service": "eks",
    "amazon cloudfront": "cloudfront",
    "amazon route 53": "route53",
    "amazon elasticache": "elasticache",
    "amazon dynamodb": "dynamodb",
    "amazon elastic file system": "efs",
    "amazon elastic block store": "ebs",
    "aws key management service": "kms",
    "amazon cloudwatch": "cloudwatch",
    "amazon simple notification service": "sns",
    "amazon simple queue service": "sqs",
    "aws secrets manager": "secretsmanager",
    "amazon api gateway": "api_gateway",
    "amazon elastic mapreduce": "emr",
    "amazon redshift": "redshift",
    "amazon kinesis": "kinesis",
    "amazon kinesis firehose": "kinesis_firehose",
    "amazon managed streaming for apache kafka": "msk",
    "amazon mq": "mq",
    "aws direct connect": "direct_connect",
    "aws transit gateway": "transit_gateway",
}

_PREV_GEN_EC2 = re.compile(r"^(t1|t2|m1|m2|m3|m4|c1|c3|c4|r3|r4|i2|d2|g2|cr1|hs1)\.", re.I)

_RIGHTSIZE_MAP: dict[str, tuple[str, float]] = {
    "t3.xlarge": ("t3.large", 0.5),
    "t3.large": ("t3.medium", 0.5),
    "t3.medium": ("t3.small", 0.5),
    "t3.2xlarge": ("t3.xlarge", 0.5),
    "m5.2xlarge": ("m5.xlarge", 0.5),
    "m5.xlarge": ("m5.large", 0.5),
    "m5.large": ("t3.large", 0.45),
}


@dataclass
class FinOpsRecommendation:
    id: str
    level: str
    category: str
    title: str
    description: str
    component_ids: list[str]
    fix: str
    terraform_hint: str
    current_monthly_cost: float | None = None
    projected_monthly_cost: float | None = None
    projected_savings_monthly: float = 0.0
    projected_savings_percent: float | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "level": self.level,
            "category": self.category,
            "title": self.title,
            "description": self.description,
            "componentIds": self.component_ids,
            "fix": self.fix,
            "terraformHint": self.terraform_hint,
            "currentMonthlyCost": self.current_monthly_cost,
            "projectedMonthlyCost": self.projected_monthly_cost,
            "projectedSavingsMonthly": round(self.projected_savings_monthly, 2),
            "projectedSavingsPercent": (
                round(self.projected_savings_percent, 1)
                if self.projected_savings_percent is not None
                else None
            ),
        }


@dataclass
class FinOpsReport:
    recommendations: list[FinOpsRecommendation] = field(default_factory=list)
    modeled_monthly_total: float = 0.0
    actual_monthly_total: float | None = None
    summary: str | None = None
    data_sources: dict[str, Any] = field(default_factory=dict)

    @property
    def total_savings_monthly(self) -> float:
        return round(sum(r.projected_savings_monthly for r in self.recommendations), 2)

    @property
    def total_savings_yearly(self) -> float:
        return round(self.total_savings_monthly * 12, 2)

    def to_dict(self) -> dict[str, Any]:
        return {
            "recommendations": [r.to_dict() for r in self.recommendations],
            "modeledMonthlyTotal": round(self.modeled_monthly_total, 2),
            "actualMonthlyTotal": (
                round(self.actual_monthly_total, 2)
                if self.actual_monthly_total is not None
                else None
            ),
            "totalSavingsMonthly": self.total_savings_monthly,
            "totalSavingsYearly": self.total_savings_yearly,
            "summary": self.summary,
            "dataSources": self.data_sources,
        }


def parse_cost_explorer_csv(text: str) -> dict[str, float] | None:
    """Parse AWS Cost Explorer monthly-by-service CSV into canvas-type totals."""
    lines = [ln.strip() for ln in text.strip().splitlines() if ln.strip()]
    if len(lines) < 2:
        return None
    headers = [h.strip().strip('"').lower() for h in lines[0].split(",")]
    service_idx = next((i for i, h in enumerate(headers) if h == "service"), -1)
    if service_idx == -1:
        return None
    cost_idx = next((i for i, h in enumerate(headers) if h == "unblended cost"), -1)
    if cost_idx == -1:
        cost_idx = next((i for i, h in enumerate(headers) if h == "cost"), -1)
    if cost_idx == -1:
        cost_idx = next((i for i, h in enumerate(headers) if "cost" in h), -1)
    if cost_idx == -1:
        return None

    result: dict[str, float] = {}
    for line in lines[1:]:
        cols = [c.strip().strip('"') for c in line.split(",")]
        if service_idx >= len(cols) or cost_idx >= len(cols):
            continue
        service = " ".join(cols[service_idx].lower().split())
        raw = cols[cost_idx].replace("$", "").replace(",", "")
        try:
            cost = float(raw)
        except ValueError:
            continue
        canvas_type = _CSV_SERVICE_MAP.get(service)
        if canvas_type:
            result[canvas_type] = result.get(canvas_type, 0.0) + cost
    return result if result else None


def _cfg(component: Component, key: str, default: Any = None) -> Any:
    return (component.config or {}).get(key, default)


def _line_cost(line_items: list[dict], component_id: str) -> float | None:
    for item in line_items:
        if item.get("component_id") == component_id:
            cost = item.get("monthly_cost")
            return float(cost) if cost is not None else None
    return None


def _type_cost(line_items: list[dict], canvas_type: str) -> float:
    return sum(
        float(i.get("monthly_cost") or 0)
        for i in line_items
        if i.get("component_type") == canvas_type
    )


def analyze_finops(
    graph: Graph,
    *,
    line_items: list[dict] | None = None,
    actual_costs: dict[str, float] | None = None,
    utilization: dict[str, dict[str, float]] | None = None,
) -> FinOpsReport:
    """
    Generate ranked FinOps recommendations from canvas config, modeled costs,
    optional Cost Explorer actuals, and optional utilization metrics.
    """
    provider = (graph.provider or "aws").lower()
    items = line_items or []
    util = utilization or {}
    report = FinOpsReport(
        modeled_monthly_total=sum(float(i.get("monthly_cost") or 0) for i in items),
        actual_monthly_total=sum(actual_costs.values()) if actual_costs else None,
    )
    recs: list[FinOpsRecommendation] = []

    if provider != "aws":
        recs.append(
            FinOpsRecommendation(
                id="finops_provider_limited",
                level="info",
                category="general",
                title="FinOps analysis optimized for AWS",
                description=(
                    f"Graph provider is '{provider}'. Core right-sizing rules target AWS; "
                    "upload CSV actuals for cross-checks where service types align."
                ),
                component_ids=[],
                fix="Switch to AWS provider or use validation FinOps rules for other clouds.",
                terraform_hint="",
            )
        )

    for component in graph.components:
        ctype = component.type
        cfg = component.config or {}
        monthly = _line_cost(items, component.id)

        if ctype == "ec2":
            instance_type = str(_cfg(component, "instance_type", "t3.micro")).lower()
            cpu = util.get(component.id, {}).get("cpu_avg_percent")

            if cpu is not None and cpu < 30 and monthly:
                target, ratio = _RIGHTSIZE_MAP.get(instance_type, (None, 0.4))
                savings = monthly * (ratio if target else 0.35)
                recs.append(
                    FinOpsRecommendation(
                        id=f"finops_ec2_rightsize::{component.id}",
                        level="high",
                        category="compute",
                        title="EC2 instance under-utilized",
                        description=(
                            f'"{component.label}" ({instance_type}) averages {cpu:.0f}% CPU. '
                            f"Consider a smaller instance type."
                        ),
                        component_ids=[component.id],
                        fix=f"Downsize from {instance_type} to {target or 'next size down'}.",
                        terraform_hint=(
                            f'instance_type = "{target or "t3.medium"}"  # was {instance_type}'
                        ),
                        current_monthly_cost=monthly,
                        projected_monthly_cost=round(monthly - savings, 2),
                        projected_savings_monthly=savings,
                        projected_savings_percent=round((savings / monthly) * 100, 1),
                    )
                )

            if _PREV_GEN_EC2.match(instance_type) and monthly:
                savings = monthly * 0.25
                recs.append(
                    FinOpsRecommendation(
                        id=f"finops_ec2_prev_gen::{component.id}",
                        level="medium",
                        category="compute",
                        title="Previous-generation EC2 instance",
                        description=(
                            f'"{component.label}" uses {instance_type}. '
                            "Current-generation types offer better price-performance."
                        ),
                        component_ids=[component.id],
                        fix="Migrate to t3/t4g, m6i, or c6i equivalent.",
                        terraform_hint=f"# Replace {instance_type} with a current-gen equivalent",
                        current_monthly_cost=monthly,
                        projected_savings_monthly=savings,
                        projected_savings_percent=25.0,
                    )
                )

        if ctype == "ebs" and (_cfg(component, "volume_type", "gp2") == "gp2"):
            savings = (monthly or 8.0) * 0.2
            recs.append(
                FinOpsRecommendation(
                    id=f"finops_ebs_gp3::{component.id}",
                    level="medium",
                    category="storage",
                    title="EBS gp2 → gp3 upgrade",
                    description=f'"{component.label}" uses gp2. gp3 is ~20% cheaper with equal baseline IOPS.',
                    component_ids=[component.id],
                    fix="Change volume type to gp3.",
                    terraform_hint='volume_type = "gp3"',
                    current_monthly_cost=monthly,
                    projected_savings_monthly=savings,
                    projected_savings_percent=20.0,
                )
            )

        if ctype in ("rds", "aurora") and _cfg(component, "storage_type", "gp2") == "gp2":
            savings = (monthly or 50.0) * 0.2
            recs.append(
                FinOpsRecommendation(
                    id=f"finops_rds_gp3::{component.id}",
                    level="medium",
                    category="database",
                    title="RDS gp2 storage → gp3",
                    description=f'"{component.label}" uses gp2 storage. gp3 reduces storage cost ~20%.',
                    component_ids=[component.id],
                    fix="Set storage_type to gp3.",
                    terraform_hint='storage_type = "gp3"',
                    current_monthly_cost=monthly,
                    projected_savings_monthly=savings,
                    projected_savings_percent=20.0,
                )
            )

        if ctype == "rds":
            cpu = util.get(component.id, {}).get("cpu_avg_percent")
            if cpu is not None and cpu < 25 and monthly:
                savings = monthly * 0.35
                instance_class = _cfg(component, "instance_class", "db.t3.medium")
                recs.append(
                    FinOpsRecommendation(
                        id=f"finops_rds_rightsize::{component.id}",
                        level="high",
                        category="database",
                        title="RDS instance under-utilized",
                        description=(
                            f'"{component.label}" ({instance_class}) averages {cpu:.0f}% CPU. '
                            "Consider a smaller instance class."
                        ),
                        component_ids=[component.id],
                        fix=f"Downsize {instance_class} after reviewing connection counts.",
                        terraform_hint=f"# instance_class = db.t3.small  # was {instance_class}",
                        current_monthly_cost=monthly,
                        projected_monthly_cost=round(monthly - savings, 2),
                        projected_savings_monthly=savings,
                        projected_savings_percent=round((savings / monthly) * 100, 1),
                    )
                )

        if ctype == "rds" and not _cfg(component, "reserved_instance"):
            savings = (monthly or 50.0) * 0.4
            recs.append(
                FinOpsRecommendation(
                    id=f"finops_rds_ri::{component.id}",
                    level="medium",
                    category="database",
                    title="RDS Reserved Instance opportunity",
                    description=(
                        f'"{component.label}" is not marked for reserved pricing. '
                        "1-year RIs typically save 30–40% for steady-state databases."
                    ),
                    component_ids=[component.id],
                    fix="Purchase a 1-year RI in AWS Console for this instance class.",
                    terraform_hint="# Document RI intent; purchase via aws_db_instance_reserved_instance or Console",
                    current_monthly_cost=monthly,
                    projected_savings_monthly=savings,
                    projected_savings_percent=40.0,
                )
            )

        if ctype == "lambda":
            arch = _cfg(component, "architecture", "x86_64")
            if arch in (None, "", "x86_64") and monthly:
                savings = monthly * 0.2
                recs.append(
                    FinOpsRecommendation(
                        id=f"finops_lambda_arm64::{component.id}",
                        level="medium",
                        category="compute",
                        title="Lambda on Graviton (arm64)",
                        description=f'"{component.label}" uses x86_64. arm64 is ~20% cheaper.',
                        component_ids=[component.id],
                        fix="Set architecture to arm64 after compatibility testing.",
                        terraform_hint='architectures = ["arm64"]',
                        current_monthly_cost=monthly,
                        projected_savings_monthly=savings,
                        projected_savings_percent=20.0,
                    )
                )

        if ctype == "s3" and _cfg(component, "versioning") and not _cfg(component, "lifecycle_rule"):
            recs.append(
                FinOpsRecommendation(
                    id=f"finops_s3_lifecycle::{component.id}",
                    level="low",
                    category="storage",
                    title="S3 versioning without lifecycle policy",
                    description=(
                        f'"{component.label}" has versioning but no lifecycle rule. '
                        "Non-current versions accumulate storage cost."
                    ),
                    component_ids=[component.id],
                    fix="Add lifecycle rule to expire non-current versions after 30–90 days.",
                    terraform_hint="noncurrent_version_expiration { noncurrent_days = 30 }",
                    projected_savings_monthly=(monthly or 5.0) * 0.15,
                    projected_savings_percent=15.0,
                )
            )

        if ctype == "nat_gateway":
            recs.append(
                FinOpsRecommendation(
                    id=f"finops_nat_review::{component.id}",
                    level="low",
                    category="network",
                    title="Review NAT Gateway placement",
                    description=(
                        f'"{component.label}" adds ~$32/mo per gateway plus data processing. '
                        "Consolidate NAT per AZ or use VPC endpoints for S3/DynamoDB."
                    ),
                    component_ids=[component.id],
                    fix="Use gateway endpoints for S3/DynamoDB; one NAT per AZ max.",
                    terraform_hint="# aws_vpc_endpoint (gateway) for com.amazonaws.region.s3",
                    current_monthly_cost=monthly or 32.0,
                    projected_savings_monthly=8.0,
                )
            )

    if actual_costs and items:
        modeled_by_type: dict[str, float] = {}
        for item in items:
            t = item.get("component_type", "")
            modeled_by_type[t] = modeled_by_type.get(t, 0.0) + float(item.get("monthly_cost") or 0)
        for canvas_type, actual in actual_costs.items():
            modeled = modeled_by_type.get(canvas_type, 0.0)
            if modeled > 0 and actual > modeled * 1.25:
                delta = actual - modeled
                recs.append(
                    FinOpsRecommendation(
                        id=f"finops_actual_over_modeled::{canvas_type}",
                        level="high",
                        category="general",
                        title=f"Actual spend exceeds model for {canvas_type}",
                        description=(
                            f"Cost Explorer shows ${actual:.2f}/mo for {canvas_type} "
                            f"but the canvas model estimates ${modeled:.2f}/mo. "
                            "Review usage inputs or add missing resources."
                        ),
                        component_ids=[],
                        fix="Update usage parameters in the Estimate panel or add missing components.",
                        terraform_hint="",
                        current_monthly_cost=actual,
                        projected_monthly_cost=modeled,
                        projected_savings_monthly=delta * 0.5,
                        projected_savings_percent=round((delta / actual) * 100, 1),
                    )
                )
            elif modeled > 0 and actual < modeled * 0.5:
                savings = modeled - actual
                recs.append(
                    FinOpsRecommendation(
                        id=f"finops_over_modeled::{canvas_type}",
                        level="medium",
                        category="general",
                        title=f"Canvas over-estimates {canvas_type} cost",
                        description=(
                            f"Model estimates ${modeled:.2f}/mo but actual is ${actual:.2f}/mo. "
                            "Right-size usage inputs to avoid over-provisioning designs."
                        ),
                        component_ids=[],
                        fix="Lower usage parameters to match observed billing.",
                        terraform_hint="",
                        current_monthly_cost=modeled,
                        projected_monthly_cost=actual,
                        projected_savings_monthly=savings,
                        projected_savings_percent=round((savings / modeled) * 100, 1),
                    )
                )

    _level_order = {"high": 0, "medium": 1, "low": 2, "info": 3}
    recs.sort(key=lambda r: (-r.projected_savings_monthly, _level_order.get(r.level, 9)))
    report.recommendations = recs
    return report
