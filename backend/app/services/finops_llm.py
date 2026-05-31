"""Optional LLM summary for FinOps analysis results."""

from __future__ import annotations

import json
import logging

from app.models.graph import Graph
from app.services.finops_analyzer import FinOpsReport

logger = logging.getLogger(__name__)


def summarize_finops_llm(graph: Graph, report: FinOpsReport) -> str | None:
    """
    Return a short executive summary of recommendations using the configured LLM.
    Returns None when LLM is unavailable or the call fails.
    """
    if not report.recommendations:
        return None

    try:
        from app.services.llm.factory import get_provider
    except Exception:
        return None

    top = report.recommendations[:8]
    payload = {
        "architecture": graph.name,
        "provider": graph.provider,
        "region": graph.region,
        "modeled_monthly_total": report.modeled_monthly_total,
        "actual_monthly_total": report.actual_monthly_total,
        "total_savings_monthly": report.total_savings_monthly,
        "recommendations": [
            {
                "title": r.title,
                "level": r.level,
                "savings_monthly": r.projected_savings_monthly,
                "description": r.description,
            }
            for r in top
        ],
    }

    system = (
        "You are a FinOps advisor. Summarize the cost optimization findings in 2-3 sentences "
        "for an infrastructure engineer. Be specific about the top savings opportunities. "
        "Do not use markdown headings."
    )
    user = f"Analyze this FinOps report JSON and respond with a concise summary only:\n{json.dumps(payload, indent=2)}"

    try:
        provider = get_provider()
        raw = provider.generate(system, user)
        text = (raw or "").strip()
        return text[:800] if text else None
    except Exception as exc:
        logger.debug("FinOps LLM summary failed: %s", exc)
        return None
