import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.models.licensing import License, Organization, Seat
from app.models.user import User
from app.services import email_service


class InstitutionalError(Exception):
    def __init__(self, message: str, code: str = "forbidden"):
        super().__init__(message)
        self.code = code


def _get_institutional_license(db: Session, license_id: uuid.UUID) -> License:
    license_row = db.get(License, license_id)
    if license_row is None or license_row.type != "institutional":
        raise InstitutionalError("Institutional license not found", "not_found")
    return license_row


def _assert_can_manage(db: Session, user: User, license_row: License) -> Organization:
    if license_row.org_id is None:
        raise InstitutionalError("License has no organization", "invalid")
    org = db.get(Organization, license_row.org_id)
    if org is None:
        raise InstitutionalError("Organization not found", "not_found")
    if user.role != "admin" and org.contact_email != user.email:
        raise InstitutionalError("Only the organization contact can manage seats", "forbidden")
    return org


def list_seats(db: Session, user: User, license_id: uuid.UUID) -> list[dict]:
    license_row = _get_institutional_license(db, license_id)
    _assert_can_manage(db, user, license_row)

    rows = (
        db.query(Seat)
        .filter(Seat.license_id == license_row.id)
        .order_by(Seat.enrolled_at.asc())
        .all()
    )
    result = []
    for seat in rows:
        seat_user = db.get(User, seat.user_id)
        result.append(
            {
                "id": str(seat.id),
                "user_id": str(seat.user_id),
                "email": seat_user.email if seat_user else None,
                "display_name": seat_user.display_name if seat_user else None,
                "enrolled_at": seat.enrolled_at.isoformat(),
                "is_graduating": seat.is_graduating,
                "graduating_perk_expires_at": (
                    seat.graduating_perk_expires_at.isoformat()
                    if seat.graduating_perk_expires_at
                    else None
                ),
            }
        )
    return result


def add_seat_by_email(db: Session, user: User, license_id: uuid.UUID, email: str) -> dict:
    license_row = _get_institutional_license(db, license_id)
    _assert_can_manage(db, user, license_row)

    target = db.query(User).filter(User.email == email.strip().lower()).first()
    if target is None:
        raise InstitutionalError("No account found for that email", "user_not_found")

    existing = (
        db.query(Seat)
        .filter(Seat.license_id == license_row.id, Seat.user_id == target.id)
        .first()
    )
    if existing:
        raise InstitutionalError("User already has a seat on this license", "already_enrolled")

    used = db.query(Seat).filter(Seat.license_id == license_row.id).count()
    if license_row.seat_limit is not None and used >= license_row.seat_limit:
        raise InstitutionalError("No seats available on this license", "seats_full")

    seat = Seat(license_id=license_row.id, user_id=target.id)
    db.add(seat)
    db.commit()
    db.refresh(seat)
    return {
        "id": str(seat.id),
        "user_id": str(target.id),
        "email": target.email,
        "display_name": target.display_name,
        "enrolled_at": seat.enrolled_at.isoformat(),
        "is_graduating": seat.is_graduating,
        "graduating_perk_expires_at": None,
    }


def remove_seat(db: Session, user: User, license_id: uuid.UUID, seat_id: uuid.UUID) -> None:
    license_row = _get_institutional_license(db, license_id)
    _assert_can_manage(db, user, license_row)

    seat = (
        db.query(Seat)
        .filter(Seat.id == seat_id, Seat.license_id == license_row.id)
        .first()
    )
    if seat is None:
        raise InstitutionalError("Seat not found", "not_found")

    db.delete(seat)
    db.commit()


def grant_graduating_perk(
    db: Session, user: User, license_id: uuid.UUID, seat_id: uuid.UUID
) -> dict:
    license_row = _get_institutional_license(db, license_id)
    _assert_can_manage(db, user, license_row)

    seat = (
        db.query(Seat)
        .filter(Seat.id == seat_id, Seat.license_id == license_row.id)
        .first()
    )
    if seat is None:
        raise InstitutionalError("Seat not found", "not_found")

    now = datetime.now(timezone.utc)
    expires = now + timedelta(days=183)
    seat.is_graduating = True
    seat.graduating_perk_expires_at = expires
    db.commit()

    seat_user = db.get(User, seat.user_id)
    if seat_user:
        try:
            email_service.send_graduating_perk_email(
                seat_user.email,
                expires_at=expires.date().isoformat(),
                display_name=seat_user.display_name,
            )
        except Exception:
            pass

    return {
        "id": str(seat.id),
        "is_graduating": seat.is_graduating,
        "graduating_perk_expires_at": seat.graduating_perk_expires_at.isoformat(),
    }
