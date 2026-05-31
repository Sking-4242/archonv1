"""
Seed a dev license for local testing.

    docker compose exec backend python seed_license.py

Creates an individual license for student@archon.academy if none exists.
Prints the license key to stdout.
"""

import os
import sys
import uuid
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.dirname(__file__))

import app.models  # noqa: F401

from app.db import SessionLocal
from app.models.licensing import License
from app.models.user import User

DEV_EMAIL = "student@archon.academy"


def seed_license():
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == DEV_EMAIL).first()
        if user is None:
            print(f"  SKIP  user {DEV_EMAIL} not found — run seed.py first")
            return

        existing = (
            db.query(License)
            .filter(License.owner_id == user.id, License.type == "individual")
            .first()
        )
        if existing:
            print(f"  EXISTS  key={existing.key}")
            return

        key = uuid.uuid4()
        license_row = License(
            key=key,
            type="individual",
            status="active",
            owner_id=user.id,
            expires_at=datetime.now(timezone.utc) + timedelta(days=365),
        )
        db.add(license_row)
        db.commit()
        print(f"  CREATED  individual license for {DEV_EMAIL}")
        print(f"  KEY  {key}")
    finally:
        db.close()


if __name__ == "__main__":
    seed_license()
