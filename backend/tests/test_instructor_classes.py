import pytest

from app.services.class_service import _is_at_risk, generate_class_code


def test_is_at_risk_low_lesson_completion():
    now = __import__("datetime").datetime.now(__import__("datetime").timezone.utc)
    assert _is_at_risk(lesson_pct=10, overdue_missing=0, last_activity=now, now=now) is True


def test_is_at_risk_overdue_assignments():
    now = __import__("datetime").datetime.now(__import__("datetime").timezone.utc)
    assert _is_at_risk(lesson_pct=80, overdue_missing=1, last_activity=now, now=now) is True


def test_is_at_risk_inactive():
    from datetime import timedelta

    now = __import__("datetime").datetime.now(__import__("datetime").timezone.utc)
    stale = now - timedelta(days=20)
    assert _is_at_risk(lesson_pct=80, overdue_missing=0, last_activity=stale, now=now) is True


def test_is_at_risk_healthy():
    now = __import__("datetime").datetime.now(__import__("datetime").timezone.utc)
    assert _is_at_risk(lesson_pct=75, overdue_missing=0, last_activity=now, now=now) is False


def test_generate_class_code_format():
    class FakeQuery:
        def filter(self, *args, **kwargs):
            return self

        def first(self):
            return None

    class FakeDb:
        def query(self, *args):
            return FakeQuery()

    code = generate_class_code(FakeDb())
    assert len(code) == 8
    assert code.isupper()
