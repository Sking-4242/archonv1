from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.services.access_service import access_to_dict, resolve_access
from app.services.license_service import LicenseError, activate_license, get_user_license_summary
from app.services.rate_limit import allow_request

router = APIRouter(prefix="/license", tags=["license"])


class ActivateRequest(BaseModel):
    key: str


@router.post("/activate")
def activate_license_key(
    body: ActivateRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    client_ip = request.client.host if request.client else "unknown"
    rate_key = f"license:{client_ip}:{current_user.id}"
    if not allow_request(rate_key):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many license activation attempts. Try again later.",
        )

    try:
        license_row = activate_license(db, current_user, body.key)
    except LicenseError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    access = resolve_access(db, current_user)
    return {
        "license": get_user_license_summary(db, current_user),
        "access": access_to_dict(access),
        "message": f"License activated ({license_row.type}).",
    }


@router.get("/status")
def license_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return {
        "license": get_user_license_summary(db, current_user),
        "access": access_to_dict(resolve_access(db, current_user)),
    }
