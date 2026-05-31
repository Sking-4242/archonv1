import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session, joinedload

from app.db import get_db
from app.dependencies.auth import get_current_user
from app.models.licensing import License, Organization, Seat
from app.models.user import User
from app.services.access_service import access_to_dict, open_access_enabled, resolve_access
from app.services.auth_service import user_to_dict
from app.services.license_service import get_user_license_summary
from app.services import stripe_service
from app.services import institutional_service as inst
from app.services.admin_license_service import (
    AdminLicenseError,
    create_individual_license,
    list_recent_licenses,
)
from app.services import org_tracking_service as org_svc

router = APIRouter(prefix="/portal", tags=["portal"])


def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return user


class AdminCreateLicenseRequest(BaseModel):
    assign_email: str | None = None
    valid_days: int = Field(default=365, ge=1, le=3650)


class CheckoutRequest(BaseModel):
    license_type: str = "individual"
    org_id: str | None = None
    seat_limit: int | None = Field(default=None, ge=1)


class OrgCreateRequest(BaseModel):
    name: str
    contact_email: str
    contact_name: str | None = None


class AddSeatRequest(BaseModel):
    email: str


class OrgOut(BaseModel):
    id: str
    name: str
    contact_email: str
    contact_name: str | None


@router.get("/dashboard")
def portal_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user = (
        db.query(User)
        .options(joinedload(User.academy_profile))
        .filter(User.id == current_user.id)
        .first()
    )
    access = resolve_access(db, user)
    license_summary = get_user_license_summary(db, user)

    orgs = []
    if user.role == "admin":
        org_rows = db.query(Organization).order_by(Organization.created_at.desc()).all()
        orgs = [
            {
                "id": str(o.id),
                "name": o.name,
                "contact_email": o.contact_email,
            }
            for o in org_rows
        ]

    institutional = []
    seat_rows = (
        db.query(Seat)
        .join(License, Seat.license_id == License.id)
        .filter(License.type == "institutional")
        .all()
    )
    for seat in seat_rows:
        license_row = db.get(License, seat.license_id)
        if license_row and license_row.org_id:
            org = db.get(Organization, license_row.org_id)
            if org and org.contact_email == user.email:
                institutional.append(
                    {
                        "license_id": str(license_row.id),
                        "license_key": str(license_row.key),
                        "status": license_row.status,
                        "seat_limit": license_row.seat_limit,
                        "seats_used": db.query(Seat).filter(Seat.license_id == license_row.id).count(),
                        "expires_at": license_row.expires_at.isoformat() if license_row.expires_at else None,
                        "org_name": org.name,
                    }
                )

    return {
        "user": user_to_dict(user),
        "access": access_to_dict(access),
        "license": license_summary,
        "open_access": open_access_enabled(),
        "stripe_configured": stripe_service.stripe_configured(),
        "organizations": orgs,
        "institutional_licenses": institutional,
    }


@router.post("/checkout")
def create_checkout(
    body: CheckoutRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if body.license_type not in ("individual", "institutional"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid license_type")

    org_uuid = uuid.UUID(body.org_id) if body.org_id else None
    try:
        url = stripe_service.create_checkout_session(
            db,
            current_user,
            license_type=body.license_type,
            org_id=org_uuid,
            seat_limit=body.seat_limit,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc

    return {"checkout_url": url}


@router.post("/billing-portal")
def billing_portal(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        url = stripe_service.create_billing_portal_session(db, current_user)
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return {"portal_url": url}


@router.post("/organizations", response_model=OrgOut, status_code=status.HTTP_201_CREATED)
def create_organization(
    body: OrgCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    org = Organization(
        name=body.name.strip(),
        contact_email=body.contact_email.strip().lower(),
        contact_name=body.contact_name,
    )
    db.add(org)
    db.commit()
    db.refresh(org)
    return OrgOut(
        id=str(org.id),
        name=org.name,
        contact_email=org.contact_email,
        contact_name=org.contact_name,
    )


def _institutional_http_error(exc: inst.InstitutionalError) -> HTTPException:
    status_code = status.HTTP_403_FORBIDDEN
    if exc.code == "not_found":
        status_code = status.HTTP_404_NOT_FOUND
    elif exc.code in ("user_not_found", "already_enrolled", "seats_full", "invalid"):
        status_code = status.HTTP_400_BAD_REQUEST
    return HTTPException(status_code=status_code, detail=str(exc))


@router.get("/institutional/{license_id}/seats")
def list_institutional_seats(
    license_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return inst.list_seats(db, current_user, license_id)
    except inst.InstitutionalError as exc:
        raise _institutional_http_error(exc) from exc


@router.post("/institutional/{license_id}/seats", status_code=status.HTTP_201_CREATED)
def add_institutional_seat(
    license_id: uuid.UUID,
    body: AddSeatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return inst.add_seat_by_email(db, current_user, license_id, body.email)
    except inst.InstitutionalError as exc:
        raise _institutional_http_error(exc) from exc


@router.delete("/institutional/{license_id}/seats/{seat_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_institutional_seat(
    license_id: uuid.UUID,
    seat_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        inst.remove_seat(db, current_user, license_id, seat_id)
    except inst.InstitutionalError as exc:
        raise _institutional_http_error(exc) from exc


@router.post("/institutional/{license_id}/seats/{seat_id}/graduate")
def grant_graduating_perk(
    license_id: uuid.UUID,
    seat_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return inst.grant_graduating_perk(db, current_user, license_id, seat_id)
    except inst.InstitutionalError as exc:
        raise _institutional_http_error(exc) from exc


@router.post("/admin/licenses")
def admin_create_license(
    body: AdminCreateLicenseRequest,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    try:
        return create_individual_license(
            db,
            valid_days=body.valid_days,
            assign_email=body.assign_email,
        )
    except AdminLicenseError as exc:
        status_code = status.HTTP_400_BAD_REQUEST
        if exc.code == "user_not_found":
            status_code = status.HTTP_404_NOT_FOUND
        raise HTTPException(status_code=status_code, detail=str(exc)) from exc


@router.get("/admin/licenses")
def admin_list_licenses(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    return {"licenses": list_recent_licenses(db, limit=25)}


@router.get("/admin/usage")
def admin_usage_summary(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    return org_svc.admin_usage_summary(db)
