"""
One-time seed script — creates the initial admin/instructor account.
Run inside the backend container after the stack is up:

    docker compose exec backend python seed.py

Safe to run multiple times — skips creation if the email already exists.
"""

import os
import sys

# Ensure app is importable
sys.path.insert(0, os.path.dirname(__file__))

from app.db import Base, SessionLocal, engine
from app.models.academy import User
from app.services.academy.auth_service import hash_password

SEED_USERS = [
    {
        "name": "admin",
        "email": "admin@archon.academy",
        "password": "pass123",
        "role": "instructor",
    },
    {
        "name": "Test Student",
        "email": "student@archon.academy",
        "password": "pass123",
        "role": "student",
    },
]


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        for u in SEED_USERS:
            existing = db.query(User).filter(User.email == u["email"]).first()
            if existing:
                print(f"  SKIP  {u['email']} (already exists)")
                continue
            user = User(
                name=u["name"],
                email=u["email"],
                password_hash=hash_password(u["password"]),
                role=u["role"],
            )
            db.add(user)
            db.commit()
            print(f"  CREATED  {u['role']}  {u['email']}")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
    print("Seed complete.")
