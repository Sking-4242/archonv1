"""Instructor organization affiliation (voluntary, no paywall)."""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.db import get_db
from app.dependencies.academy_auth import require_instructor
from app.models.user import User
from app.services import org_tracking_service as org_svc

router = APIRouter(prefix="/academy/organization", tags=["academy-organization"])


class AffiliationUpdate(BaseModel):
    organization_name: str | None = None


class CreateOrgRequest(BaseModel):
    name: str = Field(min_length=1, max_length=200)


class JoinOrgRequest(BaseModel):
    code: str = Field(min_length=4, max_length=12)


def _http_error(exc: org_svc.OrgTrackingError) -> HTTPException:
    code = status.HTTP_400_BAD_REQUEST
    if exc.code == "forbidden":
        code = status.HTTP_403_FORBIDDEN
    elif exc.code == "not_found":
        code = status.HTTP_404_NOT_FOUND
    return HTTPException(status_code=code, detail=str(exc))


@router.get("/affiliation")
def get_affiliation(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_instructor),
):
    return org_svc.get_affiliation(db, current_user)


@router.put("/affiliation")
def update_affiliation(
    body: AffiliationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_instructor),
):
    try:
        return org_svc.update_affiliation(db, current_user, body.organization_name)
    except org_svc.OrgTrackingError as exc:
        raise _http_error(exc) from exc


@router.post("/create", status_code=status.HTTP_201_CREATED)
def create_organization(
    body: CreateOrgRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_instructor),
):
    try:
        return org_svc.create_instructor_organization(db, current_user, body.name)
    except org_svc.OrgTrackingError as exc:
        raise _http_error(exc) from exc


@router.post("/join")
def join_organization(
    body: JoinOrgRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_instructor),
):
    try:
        return org_svc.join_organization(db, current_user, body.code)
    except org_svc.OrgTrackingError as exc:
        raise _http_error(exc) from exc
