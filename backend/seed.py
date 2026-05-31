"""
One-time seed script — creates default accounts including the master admin.

Run inside the backend container after the stack is up:

    docker compose exec backend python seed.py

Safe to run multiple times — updates master password on re-run.
"""

import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

import app.models  # noqa: F401 — register all ORM mappers

from app.db import SessionLocal
from app.models.academy import ClassEnrollment, InstructorClass
from app.models.user import AcademyProfile, User
from app.services.auth_service import MASTER_EMAIL, hash_password
from app.services.class_service import generate_class_code

SEED_USERS = [
    {
        "display_name": "archon",
        "email": MASTER_EMAIL,
        "password": "archon",
        "academy_role": "instructor",
        "account_role": "admin",
        "always_reset_password": True,
    },
    {
        "display_name": "admin",
        "email": "admin@archon.academy",
        "password": "pass123",
        "academy_role": "instructor",
        "account_role": "admin",
    },
    {
        "display_name": "Test Student",
        "email": "student@archon.academy",
        "password": "pass123",
        "academy_role": "student",
        "account_role": "user",
    },
]


def seed():
    db = SessionLocal()
    try:
        for u in SEED_USERS:
            existing = db.query(User).filter(User.email == u["email"]).first()
            if existing:
                updated = False
                if u.get("always_reset_password"):
                    existing.password_hash = hash_password(u["password"])
                    existing.role = u["account_role"]
                    existing.display_name = u.get("display_name") or existing.display_name
                    updated = True
                elif not existing.display_name and u.get("display_name"):
                    existing.display_name = u["display_name"]
                    updated = True
                profile = existing.academy_profile
                if profile is None:
                    db.add(AcademyProfile(user_id=existing.id, role=u["academy_role"]))
                    updated = True
                elif u.get("always_reset_password"):
                    profile.role = u["academy_role"]
                    updated = True
                if updated:
                    db.commit()
                    print(f"  UPDATED  {u['email']}")
                else:
                    print(f"  SKIP  {u['email']} (already exists)")
                continue
            user = User(
                email=u["email"],
                display_name=u["display_name"],
                password_hash=hash_password(u["password"]),
                role=u["account_role"],
            )
            db.add(user)
            db.flush()
            db.add(AcademyProfile(user_id=user.id, role=u["academy_role"]))
            db.commit()
            print(f"  CREATED  {u['academy_role']}  {u['email']}")
        seed_demo_class(db)
    finally:
        db.close()


def seed_demo_class(db):
    instructor = db.query(User).filter(User.email == MASTER_EMAIL).first()
    student = db.query(User).filter(User.email == "student@archon.academy").first()
    if instructor is None or student is None:
        return

    existing = (
        db.query(InstructorClass)
        .filter(
            InstructorClass.instructor_id == instructor.id,
            InstructorClass.name == "AWS Cloud Practitioner — Demo",
        )
        .first()
    )
    if existing is None:
        cls = InstructorClass(
            name="AWS Cloud Practitioner — Demo",
            description="Demo cohort for instructor dashboard testing.",
            course="aws",
            class_code=generate_class_code(db),
            instructor_id=instructor.id,
        )
        db.add(cls)
        db.flush()
        print(f"  CREATED  demo class  code={cls.class_code}")
    else:
        cls = existing

    enrolled = (
        db.query(ClassEnrollment)
        .filter(ClassEnrollment.class_id == cls.id, ClassEnrollment.student_id == student.id)
        .first()
    )
    if enrolled is None:
        db.add(ClassEnrollment(class_id=cls.id, student_id=student.id))
        print(f"  ENROLLED  student@archon.academy  in demo class")
    db.commit()


if __name__ == "__main__":
    seed()
    print("Seed complete.")
    print("Master login: archon / archon  (or archon@archonpro.net / archon)")
