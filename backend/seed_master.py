"""
Create or reset the master admin account for local / pre-launch testing.

    docker compose exec backend python seed_master.py

Login: archon / archon  (or archon@archonpro.net / archon)
"""

import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

import app.models  # noqa: F401

from app.db import SessionLocal
from app.models.user import AcademyProfile, User
from app.services.auth_service import MASTER_EMAIL, hash_password

MASTER = {
    "display_name": "archon",
    "email": MASTER_EMAIL,
    "password": "archon",
    "academy_role": "instructor",
    "account_role": "admin",
}


def seed_master():
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == MASTER["email"]).first()
        if user is None:
            user = User(
                email=MASTER["email"],
                display_name=MASTER["display_name"],
                password_hash=hash_password(MASTER["password"]),
                role=MASTER["account_role"],
            )
            db.add(user)
            db.flush()
            db.add(AcademyProfile(user_id=user.id, role=MASTER["academy_role"]))
            db.commit()
            print(f"  CREATED  master admin  {MASTER['email']}")
        else:
            user.display_name = MASTER["display_name"]
            user.password_hash = hash_password(MASTER["password"])
            user.role = MASTER["account_role"]
            profile = user.academy_profile
            if profile is None:
                db.add(AcademyProfile(user_id=user.id, role=MASTER["academy_role"]))
            else:
                profile.role = MASTER["academy_role"]
            db.commit()
            print(f"  UPDATED  master admin  {MASTER['email']}")

        print("  LOGIN    archon / archon")
        print("           (or archon@archonpro.net / archon)")
        print("  NOTE     Admin accounts have full access and can generate license keys in Settings.")
    finally:
        db.close()


if __name__ == "__main__":
    seed_master()
    print("Master seed complete.")
