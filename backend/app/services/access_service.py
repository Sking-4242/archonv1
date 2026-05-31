import os
from dataclasses import dataclass
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.licensing import License, Seat
from app.models.user import User

OFFLINE_GRACE_DAYS = int(os.environ.get("LICENSE_OFFLINE_GRACE_DAYS", "7"))


def _truthy_env(name: str, legacy_name: str | None = None) -> bool:
    raw = os.environ.get(name, "")
    if not raw.strip() and legacy_name:
        raw = os.environ.get(legacy_name, "")
    return raw.strip().lower() in ("1", "true", "yes", "on")


def open_access_enabled() -> bool:
    """When true, any logged-in user gets full product access (commerce parked)."""
    return _truthy_env("ARCHON_OPEN_ACCESS", "DEV_UNLOCK_ALL")


def _dev_unlock_all_enabled() -> bool:
    """Backward-compatible alias for tests and legacy env."""
    return open_access_enabled()


@dataclass
class AccessStatus:
    tier: str
    is_logged_in: bool
    has_full_access: bool
    show_renewal_warning: bool
    renewal_message: str | None
    features: dict[str, bool]


def _paid_features() -> dict[str, bool]:
    return {
        "validation_engine": True,
        "finops_live": True,
        "terraform_import": True,
        "terraform_plan": True,
        "discovery": True,
        "live_pricing": True,
        "gitops": True,
        "unlimited_iac": True,
        "academy_all_certs": True,
        "academy_ai_tutor": True,
        "academy_teaching_assistant": True,
        "academy_all_practice_tests": True,
        "instructor_dashboard": True,
        "lti": True,
    }


def _free_features() -> dict[str, bool]:
    return {
        "validation_engine": False,
        "finops_live": False,
        "terraform_import": False,
        "terraform_plan": False,
        "discovery": False,
        "live_pricing": False,
        "gitops": False,
        "unlimited_iac": False,
        "academy_all_certs": False,
        "academy_ai_tutor": False,
        "academy_all_practice_tests": False,
        "instructor_dashboard": False,
        "lti": False,
        "canvas": True,
        "basic_iac": True,
        "static_pricing": True,
        "cloud_save": False,
        "academy_cp_modules": True,
        "academy_one_practice_test": True,
    }


def _open_access_features() -> dict[str, bool]:
    features = _paid_features()
    features["cloud_save"] = False
    return features


def _open_access_status(user: User) -> AccessStatus:
    del user
    return AccessStatus(
        tier="open",
        is_logged_in=True,
        has_full_access=True,
        show_renewal_warning=False,
        renewal_message=None,
        features=_open_access_features(),
    )


def _license_is_usable(license_row: License, now: datetime) -> bool:
    if license_row.status == "active":
        if license_row.expires_at is None or license_row.expires_at > now:
            return True
    if license_row.status == "grace":
        if license_row.grace_until and license_row.grace_until > now:
            return True
    return False


def resolve_access(db: Session, user: User | None) -> AccessStatus:
    free = AccessStatus(
        tier="free",
        is_logged_in=user is not None,
        has_full_access=False,
        show_renewal_warning=False,
        renewal_message=None,
        features=_free_features(),
    )
    if user is None:
        return free

    if open_access_enabled():
        return _open_access_status(user)

    if user.role == "admin":
        return AccessStatus(
            tier="admin",
            is_logged_in=True,
            has_full_access=True,
            show_renewal_warning=False,
            renewal_message=None,
            features={**_paid_features(), "cloud_save": False},
        )

    now = datetime.now(timezone.utc)

    individual = (
        db.query(License)
        .filter(License.owner_id == user.id, License.type == "individual")
        .order_by(License.created_at.desc())
        .first()
    )
    if individual and _license_is_usable(individual, now):
        if individual.status == "grace":
            return AccessStatus(
                tier="paid",
                is_logged_in=True,
                has_full_access=True,
                show_renewal_warning=True,
                renewal_message="Your license is in a grace period. Renew soon to keep full access.",
                features={**_paid_features(), "cloud_save": False},
            )
        return AccessStatus(
            tier="paid",
            is_logged_in=True,
            has_full_access=True,
            show_renewal_warning=False,
            renewal_message=None,
            features={**_paid_features(), "cloud_save": False},
        )

    seat = (
        db.query(Seat)
        .join(License, Seat.license_id == License.id)
        .filter(Seat.user_id == user.id, License.type == "institutional")
        .order_by(Seat.enrolled_at.desc())
        .first()
    )
    if seat:
        license_row = db.get(License, seat.license_id)
        if license_row and _license_is_usable(license_row, now):
            warning = license_row.status == "grace"
            return AccessStatus(
                tier="paid",
                is_logged_in=True,
                has_full_access=True,
                show_renewal_warning=warning,
                renewal_message=(
                    "Your institutional license is in a grace period. Contact your administrator."
                    if warning
                    else None
                ),
                features={**_paid_features(), "cloud_save": False},
            )

    graduating_seat = (
        db.query(Seat)
        .filter(
            Seat.user_id == user.id,
            Seat.is_graduating.is_(True),
            Seat.graduating_perk_expires_at.isnot(None),
            Seat.graduating_perk_expires_at > now,
        )
        .first()
    )
    if graduating_seat:
        return AccessStatus(
            tier="paid",
            is_logged_in=True,
            has_full_access=True,
            show_renewal_warning=False,
            renewal_message=None,
            features={**_paid_features(), "cloud_save": False},
        )

    grace_individual = (
        db.query(License)
        .filter(
            License.owner_id == user.id,
            License.status == "grace",
            License.grace_until.isnot(None),
            License.grace_until > now,
        )
        .first()
    )
    if grace_individual:
        return AccessStatus(
            tier="paid",
            is_logged_in=True,
            has_full_access=True,
            show_renewal_warning=True,
            renewal_message="Your license expired. You have limited grace access — renew to continue.",
            features={**_paid_features(), "cloud_save": False},
        )

    return free


def access_to_dict(status: AccessStatus) -> dict:
    return {
        "tier": status.tier,
        "is_logged_in": status.is_logged_in,
        "has_full_access": status.has_full_access,
        "show_renewal_warning": status.show_renewal_warning,
        "renewal_message": status.renewal_message,
        "features": status.features,
        "open_access": open_access_enabled(),
    }
