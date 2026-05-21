"""
Terraform plan import endpoint.

Accepts the JSON output of `terraform show -json plan.tfplan` as a file
upload, parses it with plan_importer, and returns a Graph JSON ready for
the frontend loadState path along with a change summary.
"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import Any
import json

from app.services.plan_importer import import_plan

router = APIRouter(prefix="/import-plan", tags=["import"])


class PlanImportResponse(BaseModel):
    graph: dict[str, Any]
    summary: dict[str, Any]
    warnings: list[str]


@router.post("", response_model=PlanImportResponse)
async def import_plan_file(
    file: UploadFile = File(...),
) -> PlanImportResponse:
    """
    Parse a `terraform show -json` plan file and return a Graph JSON.

    - Accepts a single JSON file (output of `terraform show -json plan.tfplan`)
    - Returns graph (ready for frontend loadState), a change summary with
      plain-English descriptions, and any warnings about unmapped resource types
    """
    if not file.filename:
        raise HTTPException(status_code=422, detail="No file provided.")

    raw = await file.read()

    try:
        text = raw.decode("utf-8")
    except UnicodeDecodeError:
        raise HTTPException(
            status_code=422,
            detail=f"File '{file.filename}' is not valid UTF-8.",
        )

    try:
        plan_json = json.loads(text)
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=422,
            detail=f"File is not valid JSON: {str(exc)}",
        )

    if "resource_changes" not in plan_json:
        raise HTTPException(
            status_code=422,
            detail=(
                "File does not appear to be a Terraform plan JSON. "
                "Generate it with: terraform show -json plan.tfplan"
            ),
        )

    try:
        result = import_plan(plan_json)
    except Exception as exc:
        raise HTTPException(
            status_code=422,
            detail=f"Failed to parse plan: {str(exc)}",
        )

    return PlanImportResponse(
        graph=result["graph"],
        summary=result["summary"],
        warnings=result["warnings"],
    )
