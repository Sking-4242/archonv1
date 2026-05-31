"""Tests for voluntary instructor organization tracking."""

import os
import sys
import uuid

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import app.models  # noqa: F401

from app.db import SessionLocal
from app.models.user import AcademyProfile, User
from app.services.auth_service import hash_password
from app.services import org_tracking_service as org_svc


def _make_instructor(db):
    user = User(
        email=f"instr-{uuid.uuid4()}@school.edu",
        display_name="Prof",
        password_hash=hash_password("secret123"),
        role="user",
    )
    db.add(user)
    db.flush()
    db.add(AcademyProfile(user_id=user.id, role="instructor"))
    db.commit()
    db.refresh(user)
    return user


def test_create_and_join_organization():
    db = SessionLocal()
    try:
        leader = _make_instructor(db)
        created = org_svc.create_instructor_organization(db, leader, "State U CS")
        assert created["organization_code"]
        assert created["linked_organization_name"] == "State U CS"

        colleague = _make_instructor(db)
        joined = org_svc.join_organization(db, colleague, created["organization_code"])
        assert joined["linked_organization_name"] == "State U CS"

        summary = org_svc.admin_usage_summary(db)
        org_rows = [r for r in summary["organizations"] if r["name"] == "State U CS"]
        assert len(org_rows) == 1
        assert org_rows[0]["instructor_count"] == 2
    finally:
        db.close()


def test_free_text_org_name_rollup():
    db = SessionLocal()
    try:
        user = _make_instructor(db)
        org_svc.update_affiliation(db, user, "Community College")
        summary = org_svc.admin_usage_summary(db)
        named = [r for r in summary["organizations"] if r["name"] == "Community College"]
        assert len(named) == 1
        assert named[0]["kind"] == "named"
        assert named[0]["instructor_count"] == 1
    finally:
        db.close()
