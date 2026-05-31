"""
Seed a dev institutional license for portal admin testing.

    docker compose exec backend python seed_institutional.py

Creates:
  - Organization "Archon University"
  - Institutional license (50 seats) with contact admin@archon.academy
  - Seat for student@archon.academy
"""

import os
import sys
import uuid
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.dirname(__file__))

import app.models  # noqa: F401

from app.db import SessionLocal
from app.models.licensing import License, Organization, Seat
from app.models.user import User

ORG_NAME = "Archon University"
CONTACT_EMAIL = "admin@archon.academy"
STUDENT_EMAIL = "student@archon.academy"
SEAT_LIMIT = 50


def seed_institutional():
    db = SessionLocal()
    try:
        admin = db.query(User).filter(User.email == CONTACT_EMAIL).first()
        if admin is None:
            print(f"  SKIP  contact user {CONTACT_EMAIL} not found — run seed.py first")
            return

        org = db.query(Organization).filter(Organization.contact_email == CONTACT_EMAIL).first()
        if org is None:
            org = Organization(
                name=ORG_NAME,
                contact_email=CONTACT_EMAIL,
                contact_name=admin.display_name or "IT Admin",
            )
            db.add(org)
            db.flush()
            print(f"  CREATED  organization {ORG_NAME}")
        else:
            print(f"  EXISTS  organization {org.name}")

        license_row = (
            db.query(License)
            .filter(License.org_id == org.id, License.type == "institutional")
            .order_by(License.created_at.desc())
            .first()
        )
        if license_row is None:
            license_row = License(
                key=uuid.uuid4(),
                type="institutional",
                status="active",
                org_id=org.id,
                seat_limit=SEAT_LIMIT,
                expires_at=datetime.now(timezone.utc) + timedelta(days=120),
                auto_renew=False,
            )
            db.add(license_row)
            db.flush()
            print(f"  CREATED  institutional license key={license_row.key}")
        else:
            print(f"  EXISTS  institutional license key={license_row.key}")

        student = db.query(User).filter(User.email == STUDENT_EMAIL).first()
        for email in (STUDENT_EMAIL, CONTACT_EMAIL):
            user = db.query(User).filter(User.email == email).first()
            if not user:
                continue
            seat = (
                db.query(Seat)
                .filter(Seat.license_id == license_row.id, Seat.user_id == user.id)
                .first()
            )
            if seat is None:
                db.add(Seat(license_id=license_row.id, user_id=user.id))
                print(f"  CREATED  seat for {email}")
            else:
                print(f"  EXISTS  seat for {email}")

        db.commit()
        print(f"\n  Portal login as {CONTACT_EMAIL} to manage seats.")
        print(f"  Pool key: {license_row.key}")
    finally:
        db.close()


if __name__ == "__main__":
    seed_institutional()
