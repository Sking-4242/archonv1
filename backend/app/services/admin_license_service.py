"""Admin-only helpers (dev / pre-launch license issuance)."""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.licensing import License
from app.models.user import User


class AdminLicenseError(Exception):
    def __init__(self, message: str, code: str = "invalid"):
        super().__init__(message)
        self.code = code


def create_individual_license(
    db: Session,
    *,
    valid_days: int = 365,
    assign_email: str | None = None,
) -> dict:
    owner: User | None = None
    if assign_email:
        owner = db.query(User).filter(User.email == assign_email.strip().lower()).first()
        if owner is None:
            raise AdminLicenseError(f"No account found for {assign_email}", "user_not_found")

    expires_at = datetime.now(timezone.utc) + timedelta(days=valid_days)
    license_row = License(
        key=uuid.uuid4(),
        type="individual",
        status="active",
        owner_id=owner.id if owner else None,
        expires_at=expires_at,
    )
    db.add(license_row)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise AdminLicenseError(
            "Could not create license — database constraint failed. Run migrations: alembic upgrade head",
            "db_error",
        ) from exc
    db.refresh(license_row)

    return {
        "key": str(license_row.key),
        "type": license_row.type,
        "status": license_row.status,
        "expires_at": license_row.expires_at.isoformat() if license_row.expires_at else None,
        "assigned_to": owner.email if owner else None,
        "created_at": license_row.created_at.isoformat(),
    }


def list_recent_licenses(db: Session, *, limit: int = 20) -> list[dict]:
    rows = (
        db.query(License)
        .filter(License.type == "individual")
        .order_by(License.created_at.desc())
        .limit(limit)
        .all()
    )
    result = []
    for row in rows:
        owner_email = None
        if row.owner_id:
            owner = db.get(User, row.owner_id)
            owner_email = owner.email if owner else None
        result.append(
            {
                "key": str(row.key),
                "status": row.status,
                "expires_at": row.expires_at.isoformat() if row.expires_at else None,
                "assigned_to": owner_email,
                "created_at": row.created_at.isoformat(),
            }
        )
    return result
