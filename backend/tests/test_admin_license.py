"""Tests for admin license generation."""

import os
import sys
import uuid

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import app.models  # noqa: F401

from app.db import SessionLocal
from app.models.user import AcademyProfile, User
from app.services.access_service import open_access_enabled, resolve_access
from app.services.admin_license_service import create_individual_license
from app.services.auth_service import MASTER_EMAIL, authenticate_user, hash_password


def test_admin_has_full_access():
    db = SessionLocal()
    try:
        user = User(
            email=f"admin-test-{uuid.uuid4()}@test.local",
            display_name="testadmin",
            password_hash=hash_password("secret123"),
            role="admin",
        )
        db.add(user)
        db.flush()
        db.add(AcademyProfile(user_id=user.id, role="instructor"))
        db.commit()
        db.refresh(user)

        access = resolve_access(db, user)
        assert access.has_full_access is True
        assert access.tier == "admin"
    finally:
        db.close()


def test_open_access_grants_paid_access(monkeypatch):
    monkeypatch.setenv("ARCHON_OPEN_ACCESS", "true")
    assert open_access_enabled() is True

    db = SessionLocal()
    try:
        user = User(
            email=f"student-dev-{uuid.uuid4()}@test.local",
            display_name="devstudent",
            password_hash=hash_password("secret123"),
            role="user",
        )
        db.add(user)
        db.flush()
        db.add(AcademyProfile(user_id=user.id, role="student"))
        db.commit()
        db.refresh(user)

        access = resolve_access(db, user)
        assert access.has_full_access is True
        assert access.tier == "open"
        assert access.features.get("instructor_dashboard") is True
        assert access.features.get("academy_ai_tutor") is True
    finally:
        db.close()


def test_create_unassigned_license():
    db = SessionLocal()
    try:
        result = create_individual_license(db, valid_days=30)
        assert result["key"]
        assert result["assigned_to"] is None
    finally:
        db.close()


def test_authenticate_master_alias():
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == MASTER_EMAIL).first()
        if user is None:
            return
        assert authenticate_user(db, "archon", "archon") is not None
    finally:
        db.close()
