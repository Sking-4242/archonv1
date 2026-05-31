"""Instructor organization affiliation and usage analytics (no licensing)."""

from __future__ import annotations

import secrets
import uuid
from datetime import datetime, timezone

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.academy import ClassEnrollment, InstructorClass
from app.models.licensing import Organization
from app.models.user import AcademyProfile, User


class OrgTrackingError(Exception):
    def __init__(self, message: str, code: str = "invalid"):
        super().__init__(message)
        self.code = code


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _require_instructor_profile(db: Session, user: User) -> AcademyProfile:
    profile = user.academy_profile
    if profile is None:
        profile = AcademyProfile(user_id=user.id, role="instructor")
        db.add(profile)
        db.flush()
    elif profile.role != "instructor":
        raise OrgTrackingError("Instructor role required", "forbidden")
    return profile


def generate_org_code(db: Session, length: int = 8) -> str:
    for _ in range(20):
        code = secrets.token_hex(length // 2).upper()[:length]
        exists = db.query(Organization.id).filter(Organization.code == code).first()
        if not exists:
            return code
    raise RuntimeError("Could not generate unique organization code")


def affiliation_to_dict(db: Session, profile: AcademyProfile | None) -> dict:
    if profile is None:
        return {
            "organization_id": None,
            "organization_name": None,
            "organization_code": None,
            "linked_organization_name": None,
        }

    org = db.get(Organization, profile.organization_id) if profile.organization_id else None
    return {
        "organization_id": str(profile.organization_id) if profile.organization_id else None,
        "organization_name": profile.organization_name,
        "organization_code": org.code if org else None,
        "linked_organization_name": org.name if org else None,
    }


def get_affiliation(db: Session, user: User) -> dict:
    return affiliation_to_dict(db, user.academy_profile)


def update_affiliation(db: Session, user: User, organization_name: str | None) -> dict:
    profile = _require_instructor_profile(db, user)
    name = (organization_name or "").strip()
    profile.organization_name = name or None
    db.commit()
    db.refresh(profile)
    return affiliation_to_dict(db, profile)


def create_instructor_organization(db: Session, user: User, name: str) -> dict:
    profile = _require_instructor_profile(db, user)
    clean_name = name.strip()
    if not clean_name:
        raise OrgTrackingError("Organization name is required", "invalid")

    org = Organization(
        name=clean_name,
        contact_email=user.email,
        contact_name=user.display_name,
        code=generate_org_code(db),
        created_by_id=user.id,
    )
    db.add(org)
    db.flush()
    profile.organization_id = org.id
    profile.organization_name = clean_name
    db.commit()
    db.refresh(org)
    db.refresh(profile)
    return {
        **affiliation_to_dict(db, profile),
        "message": f"Organization created. Share code {org.code} with colleagues.",
    }


def join_organization(db: Session, user: User, code: str) -> dict:
    profile = _require_instructor_profile(db, user)
    clean_code = code.strip().upper()
    if not clean_code:
        raise OrgTrackingError("Organization code is required", "invalid")

    org = db.query(Organization).filter(Organization.code == clean_code).first()
    if org is None:
        raise OrgTrackingError("Organization code not found", "not_found")

    profile.organization_id = org.id
    profile.organization_name = org.name
    db.commit()
    db.refresh(profile)
    return {
        **affiliation_to_dict(db, profile),
        "message": f"Joined {org.name}.",
    }


def _org_activity(db: Session, instructor_ids: list[uuid.UUID]) -> dict:
    if not instructor_ids:
        return {"instructor_count": 0, "class_count": 0, "student_count": 0, "last_activity_at": None}

    class_rows = (
        db.query(InstructorClass)
        .filter(InstructorClass.instructor_id.in_(instructor_ids))
        .all()
    )
    class_ids = [c.id for c in class_rows]
    class_count = len(class_ids)

    student_count = 0
    last_activity: datetime | None = None
    if class_ids:
        student_count = (
            db.query(func.count(func.distinct(ClassEnrollment.student_id)))
            .filter(ClassEnrollment.class_id.in_(class_ids))
            .scalar()
            or 0
        )
        last_enrollment = (
            db.query(func.max(ClassEnrollment.enrolled_at))
            .filter(ClassEnrollment.class_id.in_(class_ids))
            .scalar()
        )
        if last_enrollment:
            last_activity = last_enrollment

    return {
        "instructor_count": len(instructor_ids),
        "class_count": class_count,
        "student_count": student_count,
        "last_activity_at": last_activity.isoformat() if last_activity else None,
    }


def admin_usage_summary(db: Session) -> dict:
    """Roll up instructor activity by linked organization or free-text school name."""
    rows: list[dict] = []

    orgs = db.query(Organization).filter(Organization.code.isnot(None)).order_by(Organization.name).all()
    for org in orgs:
        profiles = (
            db.query(AcademyProfile)
            .filter(
                AcademyProfile.organization_id == org.id,
                AcademyProfile.role == "instructor",
            )
            .all()
        )
        instructor_ids = [p.user_id for p in profiles]
        activity = _org_activity(db, instructor_ids)
        rows.append(
            {
                "kind": "organization",
                "organization_id": str(org.id),
                "name": org.name,
                "code": org.code,
                "contact_email": org.contact_email,
                **activity,
            }
        )

    unlinked = (
        db.query(AcademyProfile)
        .filter(
            AcademyProfile.role == "instructor",
            AcademyProfile.organization_id.is_(None),
            AcademyProfile.organization_name.isnot(None),
            AcademyProfile.organization_name != "",
        )
        .all()
    )
    by_name: dict[str, list[uuid.UUID]] = {}
    for profile in unlinked:
        key = profile.organization_name.strip()
        by_name.setdefault(key, []).append(profile.user_id)

    for name, instructor_ids in sorted(by_name.items()):
        activity = _org_activity(db, instructor_ids)
        rows.append(
            {
                "kind": "named",
                "organization_id": None,
                "name": name,
                "code": None,
                "contact_email": None,
                **activity,
            }
        )

    instructors_without_org = (
        db.query(AcademyProfile)
        .filter(
            AcademyProfile.role == "instructor",
            AcademyProfile.organization_id.is_(None),
            (AcademyProfile.organization_name.is_(None) | (AcademyProfile.organization_name == "")),
        )
        .count()
    )

    return {
        "organizations": rows,
        "instructors_without_org": instructors_without_org,
        "generated_at": _utcnow().isoformat(),
    }
