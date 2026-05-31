from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.dependencies.auth import get_optional_user
from app.models.user import User
from app.services.access_service import access_to_dict, resolve_access

router = APIRouter(prefix="/access", tags=["access"])


@router.get("/status")
def access_status(
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_user),
):
    status = resolve_access(db, current_user)
    payload = access_to_dict(status)
    if current_user is not None:
        from app.services.license_service import get_user_license_summary

        payload["license"] = get_user_license_summary(db, current_user)
    else:
        payload["license"] = None
    return payload
