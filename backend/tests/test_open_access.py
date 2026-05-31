"""Tests for open access mode."""

import os
import sys
import uuid

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import app.models  # noqa: F401

from app.db import SessionLocal
from app.models.user import AcademyProfile, User
from app.services.access_service import access_to_dict, open_access_enabled, resolve_access
from app.services.auth_service import hash_password


def test_open_access_enabled_legacy_dev_env(monkeypatch):
    monkeypatch.delenv("ARCHON_OPEN_ACCESS", raising=False)
    monkeypatch.setenv("DEV_UNLOCK_ALL", "true")
    assert open_access_enabled() is True


def test_open_access_grants_full_features_without_cloud_save(monkeypatch):
    monkeypatch.setenv("ARCHON_OPEN_ACCESS", "true")
    monkeypatch.delenv("DEV_UNLOCK_ALL", raising=False)

    db = SessionLocal()
    try:
        user = User(
            email=f"open-{uuid.uuid4()}@test.local",
            display_name="openuser",
            password_hash=hash_password("secret123"),
            role="user",
        )
        db.add(user)
        db.flush()
        db.add(AcademyProfile(user_id=user.id, role="student"))
        db.commit()
        db.refresh(user)

        access = resolve_access(db, user)
        assert access.tier == "open"
        assert access.has_full_access is True
        assert access.features.get("academy_ai_tutor") is True
        assert access.features.get("cloud_save") is False

        payload = access_to_dict(access)
        assert payload["open_access"] is True
    finally:
        db.close()


def test_anonymous_user_stays_free_when_open_access(monkeypatch):
    monkeypatch.setenv("ARCHON_OPEN_ACCESS", "true")

    db = SessionLocal()
    try:
        access = resolve_access(db, None)
        assert access.tier == "free"
        assert access.has_full_access is False
    finally:
        db.close()
