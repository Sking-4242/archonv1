"""
Terraform import endpoint.

Accepts one or more .tf file uploads (multipart/form-data), parses them
with python-hcl2, and returns a Graph JSON ready for the frontend
loadState path.
"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import Any

from app.services.tf_importer import import_terraform

router = APIRouter(prefix="/import-tf", tags=["import"])


class ImportResponse(BaseModel):
    graph: dict[str, Any]
    warnings: list[str]


@router.post("", response_model=ImportResponse)
async def import_tf_files(
    files: list[UploadFile] = File(...),
) -> ImportResponse:
    """
    Parse one or more Terraform .tf files and return a Graph JSON.

    - Accepts multipart/form-data with one or more files named `files`
    - Each file must be a valid HCL2 Terraform configuration file
    - Returns graph (ready for frontend loadState) and a warnings list
      describing any resource types that were mapped to generic nodes
    """
    if not files:
        raise HTTPException(status_code=422, detail="No files provided.")

    contents: list[str] = []
    filenames: list[str] = []

    for upload in files:
        if not upload.filename:
            continue
        raw = await upload.read()
        try:
            contents.append(raw.decode("utf-8"))
        except UnicodeDecodeError:
            raise HTTPException(
                status_code=422,
                detail=f"File '{upload.filename}' is not valid UTF-8.",
            )
        filenames.append(upload.filename)

    if not contents:
        raise HTTPException(status_code=422, detail="No readable .tf files provided.")

    try:
        result = import_terraform(contents, filenames)
    except Exception as exc:
        raise HTTPException(
            status_code=422,
            detail=f"Failed to parse Terraform files: {str(exc)}",
        )

    return ImportResponse(graph=result["graph"], warnings=result["warnings"])
