import os
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.models.licensing import License, Organization
from app.models.user import User
from app.services import email_service

GRACE_DAYS = int(os.environ.get("LICENSE_GRACE_DAYS", "7"))
REMINDER_DAYS = int(os.environ.get("LICENSE_REMINDER_DAYS", "14"))


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _format_dt(dt: datetime | None) -> str | None:
    if dt is None:
        return None
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%d")


def _recipient_for_license(db: Session, license_row: License) -> tuple[str, str | None]:
    if license_row.type == "individual" and license_row.owner_id:
        user = db.get(User, license_row.owner_id)
        if user:
            return user.email, user.display_name
    if license_row.org_id:
        org = db.get(Organization, license_row.org_id)
        if org:
            return org.contact_email, org.contact_name
    return "", None


def create_individual_license(
    db: Session,
    *,
    user: User,
    stripe_customer_id: str,
    stripe_subscription_id: str | None,
    expires_at: datetime,
    auto_renew: bool = True,
) -> License:
    license_row = License(
        key=uuid.uuid4(),
        type="individual",
        status="active",
        owner_id=user.id,
        stripe_customer_id=stripe_customer_id,
        stripe_subscription_id=stripe_subscription_id,
        expires_at=expires_at,
        auto_renew=auto_renew,
    )
    db.add(license_row)
    db.commit()
    db.refresh(license_row)
    return license_row


def create_institutional_license(
    db: Session,
    *,
    org: Organization,
    stripe_customer_id: str,
    stripe_subscription_id: str | None,
    expires_at: datetime,
    seat_limit: int,
    auto_renew: bool,
) -> License:
    license_row = License(
        key=uuid.uuid4(),
        type="institutional",
        status="active",
        org_id=org.id,
        seat_limit=seat_limit,
        stripe_customer_id=stripe_customer_id,
        stripe_subscription_id=stripe_subscription_id,
        expires_at=expires_at,
        auto_renew=auto_renew,
    )
    db.add(license_row)
    db.commit()
    db.refresh(license_row)
    return license_row


def extend_license_period(db: Session, license_row: License, *, months: int = 1) -> License:
    now = _utcnow()
    base = license_row.expires_at if license_row.expires_at and license_row.expires_at > now else now
    license_row.expires_at = base + timedelta(days=30 * months)
    license_row.status = "active"
    license_row.grace_until = None
    license_row.renewal_reminder_sent_at = None
    db.commit()
    db.refresh(license_row)
    return license_row


def enter_grace_period(db: Session, license_row: License) -> License:
    now = _utcnow()
    license_row.status = "grace"
    license_row.grace_until = now + timedelta(days=GRACE_DAYS)
    db.commit()
    db.refresh(license_row)

    email, name = _recipient_for_license(db, license_row)
    if email:
        email_service.send_grace_period_email(
            email,
            grace_until=_format_dt(license_row.grace_until) or "",
            display_name=name,
        )
    return license_row


def hard_expire_license(db: Session, license_row: License) -> License:
    license_row.status = "expired"
    db.commit()
    db.refresh(license_row)

    email, name = _recipient_for_license(db, license_row)
    if email:
        email_service.send_hard_cut_email(email, display_name=name)
    return license_row


def find_license_by_subscription(db: Session, subscription_id: str) -> License | None:
    return (
        db.query(License)
        .filter(License.stripe_subscription_id == subscription_id)
        .order_by(License.created_at.desc())
        .first()
    )


def run_daily_license_jobs(db: Session) -> dict:
    now = _utcnow()
    stats = {"reminders": 0, "grace_started": 0, "expired": 0}

    active_licenses = db.query(License).filter(License.status == "active").all()
    for license_row in active_licenses:
        if license_row.expires_at is None:
            continue

        reminder_at = license_row.expires_at - timedelta(days=REMINDER_DAYS)
        if (
            now >= reminder_at
            and now < license_row.expires_at
            and license_row.renewal_reminder_sent_at is None
        ):
            email, name = _recipient_for_license(db, license_row)
            if email:
                email_service.send_renewal_reminder_email(
                    email,
                    expires_at=_format_dt(license_row.expires_at) or "",
                    display_name=name,
                )
            license_row.renewal_reminder_sent_at = now
            stats["reminders"] += 1

        if now >= license_row.expires_at:
            enter_grace_period(db, license_row)
            stats["grace_started"] += 1

    grace_licenses = db.query(License).filter(License.status == "grace").all()
    for license_row in grace_licenses:
        if license_row.grace_until and now >= license_row.grace_until:
            hard_expire_license(db, license_row)
            stats["expired"] += 1

    db.commit()
    return stats
