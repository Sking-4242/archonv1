import os
import uuid
from datetime import datetime, timedelta, timezone

import httpx
from sqlalchemy.orm import Session

from app.models.licensing import License, Seat
from app.models.user import User

_OFFLINE_GRACE_DAYS = int(os.environ.get("LICENSE_OFFLINE_GRACE_DAYS", "7"))
_PORTAL_API_URL = os.environ.get("ARCHONPRO_LICENSE_API_URL", "").rstrip("/")


class LicenseError(Exception):
    def __init__(self, message: str, code: str = "invalid"):
        super().__init__(message)
        self.code = code


def _parse_key(key: str) -> uuid.UUID:
    try:
        return uuid.UUID(str(key).strip())
    except ValueError as exc:
        raise LicenseError("Invalid license key format", "invalid_format") from exc


def _validate_via_portal(key: uuid.UUID) -> dict | None:
    if not _PORTAL_API_URL:
        return None
    url = f"{_PORTAL_API_URL}/license/validate"
    try:
        with httpx.Client(timeout=10.0) as client:
            resp = client.post(url, json={"key": str(key)})
            if resp.status_code == 404:
                raise LicenseError("License key not found", "not_found")
            resp.raise_for_status()
            return resp.json()
    except httpx.HTTPError as exc:
        raise LicenseError(
            "Could not reach the license server. Try again when online.",
            "portal_unreachable",
        ) from exc


def _find_local_license(db: Session, key: uuid.UUID) -> License | None:
    return db.query(License).filter(License.key == key).first()


def _seat_count(db: Session, license_id: uuid.UUID) -> int:
    return db.query(Seat).filter(Seat.license_id == license_id).count()


def activate_license(db: Session, user: User, key_raw: str) -> License:
    key = _parse_key(key_raw)
    portal_result = _validate_via_portal(key)

    license_row = _find_local_license(db, key)
    if license_row is None and portal_result is None:
        raise LicenseError("License key not found", "not_found")

    if license_row is None and portal_result is not None:
        license_row = License(
            key=key,
            type=portal_result.get("type", "individual"),
            status=portal_result.get("status", "active"),
            seat_limit=portal_result.get("seat_limit"),
            expires_at=_parse_dt(portal_result.get("expires_at")),
        )
        db.add(license_row)
        db.flush()

    assert license_row is not None

    if license_row.status in ("expired", "cancelled"):
        raise LicenseError("This license has expired or been cancelled", "expired")

    now = datetime.now(timezone.utc)
    if license_row.status == "active" and license_row.expires_at and license_row.expires_at <= now:
        raise LicenseError("This license has expired", "expired")

    if license_row.type == "individual":
        if license_row.owner_id and license_row.owner_id != user.id:
            raise LicenseError("This license key is already linked to another account", "in_use")
        license_row.owner_id = user.id
    else:
        if license_row.seat_limit is not None and _seat_count(db, license_row.id) >= license_row.seat_limit:
            raise LicenseError("This institutional license has no seats available", "seats_full")
        existing_seat = (
            db.query(Seat)
            .filter(Seat.license_id == license_row.id, Seat.user_id == user.id)
            .first()
        )
        if existing_seat is None:
            db.add(Seat(license_id=license_row.id, user_id=user.id))

    db.commit()
    db.refresh(license_row)
    return license_row


def get_user_license_summary(db: Session, user: User) -> dict | None:
    individual = (
        db.query(License)
        .filter(License.owner_id == user.id, License.type == "individual")
        .order_by(License.created_at.desc())
        .first()
    )
    if individual:
        return _license_summary(individual)

    seat = (
        db.query(Seat)
        .join(License, Seat.license_id == License.id)
        .filter(Seat.user_id == user.id)
        .order_by(Seat.enrolled_at.desc())
        .first()
    )
    if seat:
        license_row = db.get(License, seat.license_id)
        if license_row:
            return _license_summary(license_row)
    return None


def _license_summary(license_row: License) -> dict:
    return {
        "key": str(license_row.key),
        "type": license_row.type,
        "status": license_row.status,
        "expires_at": license_row.expires_at.isoformat() if license_row.expires_at else None,
        "grace_until": license_row.grace_until.isoformat() if license_row.grace_until else None,
    }


def _parse_dt(value: str | None) -> datetime | None:
    if not value:
        return None
    return datetime.fromisoformat(value.replace("Z", "+00:00"))
