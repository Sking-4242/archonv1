"""Tests for class practice test assignment and student content."""

import os
import sys
import uuid

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import app.models  # noqa: F401

from app.db import SessionLocal
from app.models.academy import ClassPracticeTestLink, InstructorClass
from app.models.user import AcademyProfile, User
from app.services.auth_service import hash_password
from app.services.class_service import generate_class_code, student_assigned_content


def _make_instructor(db):
    user = User(
        email=f"instr-{uuid.uuid4()}@test.local",
        display_name="Instructor",
        password_hash=hash_password("secret123"),
        role="user",
    )
    db.add(user)
    db.flush()
    db.add(AcademyProfile(user_id=user.id, role="instructor"))
    db.commit()
    db.refresh(user)
    return user


def _make_student(db, suffix: str | None = None):
    tag = suffix or uuid.uuid4().hex[:8]
    user = User(
        email=f"student-{tag}@test.local",
        display_name="Student",
        password_hash=hash_password("secret123"),
        role="user",
    )
    db.add(user)
    db.flush()
    db.add(AcademyProfile(user_id=user.id, role="student"))
    db.commit()
    db.refresh(user)
    return user


def test_student_assigned_content_includes_practice_test():
    db = SessionLocal()
    try:
        instructor = _make_instructor(db)
        student = _make_student(db)
        cls = InstructorClass(
            name="AWS CP Spring",
            class_code=generate_class_code(db),
            instructor_id=instructor.id,
        )
        db.add(cls)
        db.flush()
        from app.models.academy import ClassEnrollment

        db.add(ClassEnrollment(class_id=cls.id, student_id=student.id))
        db.add(
            ClassPracticeTestLink(
                class_id=cls.id,
                cert="aws-cp",
                test_number=1,
            )
        )
        db.commit()

        payload = student_assigned_content(db, student.id)
        assert len(payload["classes"]) == 1
        tests = payload["classes"][0]["practice_tests"]
        assert len(tests) == 1
        assert tests[0]["cert"] == "aws-cp"
        assert tests[0]["test_number"] == 1
        assert tests[0]["completed"] is False
    finally:
        db.close()
