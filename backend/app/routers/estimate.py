from datetime import datetime, timezone

from fastapi import APIRouter
from pydantic import BaseModel

from app.models.graph import Graph
from app.services.live_pricing import fetch_live_price
from app.services.pricing import estimate_component as estimate_aws
from app.services.pricing import PRICES_AS_OF as AWS_STATIC_DATE
from app.services.azure_pricing import estimate_azure_component
from app.services.azure_pricing import PRICES_AS_OF as AZURE_STATIC_DATE
from app.services.gcp_pricing import estimate_gcp_component
from app.services.gcp_pricing import PRICES_AS_OF as GCP_STATIC_DATE
from app.services.onprem_pricing import estimate_onprem_component
from app.services.onprem_pricing import PRICES_AS_OF as ONPREM_STATIC_DATE

router = APIRouter(prefix="/estimate", tags=["estimate"])

WEEKS_PER_MONTH = 730.0 / (24.0 * 7)

_EXCLUDED_NOTES = {
    "aws": (
        "Excludes: data transfer, Lambda invocations, SQS/SNS request fees, "
        "KMS API calls, S3 request fees, and DynamoDB on-demand request costs."
    ),
    "azure": (
        "Excludes: data transfer, Azure Functions invocations, "
        "storage transaction costs, and Azure AD premium features."
    ),
    "gcp": (
        "Excludes: data transfer, Cloud Functions invocations, "
        "BigQuery query costs, and Pub/Sub message fees."
    ),
    "onprem": (
        "Estimates are amortized hardware costs (3yr depreciation). "
        "Excludes: power, cooling, rack space, staffing, and software licensing unless noted."
    ),
}

_STATIC_DATES = {
    "aws":    AWS_STATIC_DATE,
    "azure":  AZURE_STATIC_DATE,
    "gcp":    GCP_STATIC_DATE,
    "onprem": ONPREM_STATIC_DATE,
}


class LineItem(BaseModel):
    component_id: str
    component_label: str
    component_type: str
    description: str
    monthly_cost: float
    note: str = ""
    live: bool = False


class Totals(BaseModel):
    weekly: float
    monthly: float
    yearly: float


class EstimateResponse(BaseModel):
    line_items: list[LineItem]
    totals: Totals
    prices_as_of: str
    region: str
    excluded_note: str
    live_prices: bool = False


def _static_estimate(infra_provider: str, component, region: str) -> dict | None:
    """Return a static-pricing dict, or None for free/unknown resources."""
    if infra_provider == "azure":
        return estimate_azure_component(component, region)
    if infra_provider == "gcp":
        return estimate_gcp_component(component, region)
    if infra_provider == "onprem":
        return estimate_onprem_component(component, region)

    # AWS
    result = estimate_aws(component.type, component.config or {}, region=region)
    if result is None:
        return None
    return {
        "component_id":    component.id,
        "component_label": component.label,
        "component_type":  component.type,
        "description":     result["description"],
        "monthly_cost":    result["monthly_cost"],
        "note":            result.get("note", ""),
        "live":            False,
    }


def _estimate_component(infra_provider: str, component, region: str) -> dict | None:
    """
    Build a cost estimate for one component.

    Tries the live pricing API first; falls back to static values when
    the live call returns None (no credentials, unsupported type, etc.).
    """
    base = _static_estimate(infra_provider, component, region)
    if base is None:
        return None

    live_cost = fetch_live_price(
        infra_provider,
        component.type,
        component.config or {},
        region,
    )

    if live_cost is not None:
        base["monthly_cost"] = live_cost
        base["live"] = True

    return base


@router.post("", response_model=EstimateResponse)
def estimate(graph: Graph) -> EstimateResponse:
    infra_provider = (graph.provider or "aws").lower()
    line_items: list[LineItem] = []
    any_live = False

    for component in graph.components:
        result = _estimate_component(infra_provider, component, graph.region)
        if result is None:
            continue
        if result.get("live"):
            any_live = True
        line_items.append(
            LineItem(
                component_id=result["component_id"],
                component_label=result["component_label"],
                component_type=result["component_type"],
                description=result["description"],
                monthly_cost=result["monthly_cost"],
                note=result.get("note", ""),
                live=result.get("live", False),
            )
        )

    monthly_total = round(sum(item.monthly_cost for item in line_items), 2)
    weekly_total  = round(monthly_total / WEEKS_PER_MONTH, 2)
    yearly_total  = round(monthly_total * 12, 2)

    if any_live:
        ts = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
        prices_as_of = f"live · fetched {ts}"
    else:
        prices_as_of = _STATIC_DATES.get(infra_provider, "static")

    return EstimateResponse(
        line_items=line_items,
        totals=Totals(
            weekly=weekly_total,
            monthly=monthly_total,
            yearly=yearly_total,
        ),
        prices_as_of=prices_as_of,
        region=graph.region,
        excluded_note=_EXCLUDED_NOTES.get(infra_provider, ""),
        live_prices=any_live,
    )
