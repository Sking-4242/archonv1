import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.services import canvas_save_service as saves
from app.services.access_service import resolve_access

router = APIRouter(prefix="/canvas/saves", tags=["canvas-saves"])


class SaveSummary(BaseModel):
    id: str
    name: str
    provider: str | None
    created_at: str
    updated_at: str


class SaveDetail(SaveSummary):
    graph_json: dict


class CreateSaveRequest(BaseModel):
    name: str = "Untitled Architecture"
    graph_json: dict
    provider: str | None = None


class UpdateSaveRequest(BaseModel):
    name: str | None = None
    graph_json: dict | None = None
    provider: str | None = None


def _require_cloud_save(db: Session, user: User) -> None:
    access = resolve_access(db, user)
    if not access.is_logged_in:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Log in to save architectures to the cloud.",
        )


def _to_summary(row) -> SaveSummary:
    return SaveSummary(
        id=str(row.id),
        name=row.name,
        provider=row.provider,
        created_at=row.created_at.isoformat(),
        updated_at=row.updated_at.isoformat(),
    )


def _to_detail(row) -> SaveDetail:
    summary = _to_summary(row)
    return SaveDetail(**summary.model_dump(), graph_json=row.graph_json)


@router.get("", response_model=list[SaveSummary])
def list_canvas_saves(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_cloud_save(db, current_user)
    return [_to_summary(row) for row in saves.list_saves(db, current_user)]


@router.post("", response_model=SaveDetail, status_code=status.HTTP_201_CREATED)
def create_canvas_save(
    body: CreateSaveRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_cloud_save(db, current_user)
    row = saves.create_save(
        db,
        current_user,
        name=body.name,
        graph_json=body.graph_json,
        provider=body.provider,
    )
    return _to_detail(row)


@router.get("/{save_id}", response_model=SaveDetail)
def get_canvas_save(
    save_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_cloud_save(db, current_user)
    row = saves.get_save(db, current_user, save_id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Save not found")
    return _to_detail(row)


@router.put("/{save_id}", response_model=SaveDetail)
def update_canvas_save(
    save_id: uuid.UUID,
    body: UpdateSaveRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_cloud_save(db, current_user)
    row = saves.update_save(
        db,
        current_user,
        save_id,
        name=body.name,
        graph_json=body.graph_json,
        provider=body.provider,
    )
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Save not found")
    return _to_detail(row)


@router.delete("/{save_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_canvas_save(
    save_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_cloud_save(db, current_user)
    if not saves.delete_save(db, current_user, save_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Save not found")
