"""FinOps live analysis API."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.db import get_db
from app.dependencies.auth import get_optional_user
from app.models.graph import Graph
from app.models.user import User
from app.services.access_service import resolve_access
from app.services.finops_analyzer import analyze_finops, parse_cost_explorer_csv
from app.services.finops_aws import (
    fetch_cloudwatch_utilization,
    fetch_cost_explorer_by_service,
    parse_utilization_csv,
)
from app.services.finops_llm import summarize_finops_llm
from app.services.finops_terraform import generate_terraform_diff
from app.services.pricing import estimate_component as estimate_aws

router = APIRouter(prefix="/finops", tags=["finops"])


class UtilizationMetrics(BaseModel):
    cpu_avg_percent: float | None = None
    memory_avg_percent: float | None = None


class FinOpsAnalyzeRequest(BaseModel):
    graph: Graph
    actual_costs: dict[str, float] | None = None
    csv_text: str | None = None
    utilization: dict[str, UtilizationMetrics | dict] = Field(default_factory=dict)
    utilization_csv: str | None = None
    usage_params: dict[str, dict] = Field(default_factory=dict)
    fetch_cloudwatch: bool = False
    fetch_cost_explorer: bool = False
    summary_llm: bool = False
    aws_profile: str | None = None
    cloudwatch_days: int = Field(default=14, ge=1, le=90)


class FinOpsAnalyzeResponse(BaseModel):
    recommendations: list[dict]
    modeled_monthly_total: float
    actual_monthly_total: float | None
    total_savings_monthly: float
    total_savings_yearly: float
    summary: str | None = None
    data_sources: dict = Field(default_factory=dict)


class FinOpsTerraformRequest(BaseModel):
    graph: Graph
    recommendations: list[dict]


class FinOpsTerraformResponse(BaseModel):
    hcl: str


def _require_finops_access(db: Session, current_user: User | None) -> None:
    access = resolve_access(db, current_user)
    if not access.features.get("finops_live") and not access.has_full_access:
        raise HTTPException(
            status_code=403,
            detail="FinOps live analysis requires a Professional license.",
        )


def _build_line_items(graph: Graph, usage_params: dict) -> list[dict]:
    items: list[dict] = []
    provider = (graph.provider or "aws").lower()
    if provider != "aws":
        return items
    for component in graph.components:
        node_usage = usage_params.get(component.id, {})
        result = estimate_aws(
            component.type,
            component.config or {},
            graph.region or "us-east-1",
            node_usage,
        )
        if result is None or result.get("monthly_cost") is None:
            continue
        items.append(
            {
                "component_id": component.id,
                "component_label": component.label,
                "component_type": component.type,
                "monthly_cost": result["monthly_cost"],
                "description": result.get("description", ""),
            }
        )
    return items


def _merge_utilization(
    body: FinOpsAnalyzeRequest,
) -> tuple[dict[str, dict[str, float]], dict[str, dict]]:
    utilization: dict[str, dict[str, float]] = {}
    data_sources: dict[str, dict] = {}

    for cid, metrics in body.utilization.items():
        if isinstance(metrics, dict):
            utilization[cid] = {
                k: float(v)
                for k, v in metrics.items()
                if v is not None and isinstance(v, (int, float))
            }
        else:
            util_dict: dict[str, float] = {}
            if metrics.cpu_avg_percent is not None:
                util_dict["cpu_avg_percent"] = float(metrics.cpu_avg_percent)
            if metrics.memory_avg_percent is not None:
                util_dict["memory_avg_percent"] = float(metrics.memory_avg_percent)
            if util_dict:
                utilization[cid] = util_dict

    if body.utilization_csv:
        parsed = parse_utilization_csv(body.utilization_csv)
        if parsed:
            for cid, metrics in parsed.items():
                utilization.setdefault(cid, {}).update(metrics)
            data_sources["utilization_csv"] = {
                "state": "ok",
                "detail": f"Loaded metrics for {len(parsed)} component(s)",
            }
        else:
            data_sources["utilization_csv"] = {
                "state": "error",
                "detail": "Could not parse utilization CSV (need component_id,cpu_avg_percent,...)",
            }

    if body.fetch_cloudwatch:
        cw_util, cw_status = fetch_cloudwatch_utilization(
            body.graph,
            days=body.cloudwatch_days,
            profile=body.aws_profile,
        )
        for cid, metrics in cw_util.items():
            utilization.setdefault(cid, {}).update(metrics)
        data_sources["cloudwatch"] = cw_status

    return utilization, data_sources


@router.post("/analyze", response_model=FinOpsAnalyzeResponse)
def finops_analyze(
    body: FinOpsAnalyzeRequest,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_user),
) -> FinOpsAnalyzeResponse:
    _require_finops_access(db, current_user)

    actual_costs = body.actual_costs
    data_sources: dict[str, dict] = {}

    if body.csv_text and not actual_costs:
        actual_costs = parse_cost_explorer_csv(body.csv_text)
        if actual_costs:
            data_sources["cost_explorer_csv"] = {
                "state": "ok",
                "detail": f"Parsed {len(actual_costs)} service bucket(s) from CSV",
            }

    if body.fetch_cost_explorer and not actual_costs:
        ce_costs, ce_status = fetch_cost_explorer_by_service(
            region=body.graph.region or "us-east-1",
            profile=body.aws_profile,
        )
        data_sources["cost_explorer_api"] = ce_status
        if ce_costs:
            actual_costs = ce_costs

    utilization, util_sources = _merge_utilization(body)
    data_sources.update(util_sources)

    line_items = _build_line_items(body.graph, body.usage_params)
    report = analyze_finops(
        body.graph,
        line_items=line_items,
        actual_costs=actual_costs,
        utilization=utilization,
    )
    report.data_sources = data_sources

    if body.summary_llm:
        report.summary = summarize_finops_llm(body.graph, report)

    payload = report.to_dict()
    return FinOpsAnalyzeResponse(
        recommendations=payload["recommendations"],
        modeled_monthly_total=payload["modeledMonthlyTotal"],
        actual_monthly_total=payload["actualMonthlyTotal"],
        total_savings_monthly=payload["totalSavingsMonthly"],
        total_savings_yearly=payload["totalSavingsYearly"],
        summary=payload.get("summary"),
        data_sources=payload.get("dataSources") or {},
    )


@router.post("/terraform", response_model=FinOpsTerraformResponse)
def finops_terraform(
    body: FinOpsTerraformRequest,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_user),
) -> FinOpsTerraformResponse:
    _require_finops_access(db, current_user)
    hcl = generate_terraform_diff(body.graph, body.recommendations)
    return FinOpsTerraformResponse(hcl=hcl)
