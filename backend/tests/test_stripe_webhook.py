"""Integration tests for Stripe webhook handling."""

import json
import os
import uuid

import pytest

os.environ.setdefault("STRIPE_WEBHOOK_SECRET", "whsec_test_webhook_secret")
os.environ.setdefault("ACADEMY_SECRET_KEY", "test-secret-key-for-jwt")

import app.models  # noqa: F401

from app.db import SessionLocal, Base, engine
from app.models.licensing import License
from app.models.user import User, AcademyProfile
from app.services import stripe_service
from app.services.auth_service import hash_password
from tests.stripe_test_utils import stripe_test_signature


WEBHOOK_SECRET = os.environ["STRIPE_WEBHOOK_SECRET"]


@pytest.fixture(scope="module", autouse=True)
def ensure_tables():
    Base.metadata.create_all(bind=engine)
    yield


@pytest.fixture
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def checkout_user(db):
    email = f"stripe-test-{uuid.uuid4().hex[:8]}@archon.academy"
    user = User(
        email=email,
        display_name="Stripe Test",
        password_hash=hash_password("pass12345"),
        role="user",
    )
    db.add(user)
    db.flush()
    db.add(AcademyProfile(user_id=user.id, role="student"))
    db.commit()
    db.refresh(user)
    return user


def _signed_payload(event: dict) -> tuple[bytes, str]:
    payload = json.dumps(event)
    signature = stripe_test_signature(payload, WEBHOOK_SECRET)
    return payload.encode(), signature


def test_checkout_session_completed_creates_license(db, checkout_user):
    event_id = f"evt_{uuid.uuid4().hex}"
    session = {
        "id": f"cs_{uuid.uuid4().hex[:12]}",
        "customer": f"cus_{uuid.uuid4().hex[:12]}",
        "subscription": None,
        "metadata": {
            "user_id": str(checkout_user.id),
            "license_type": "individual",
        },
    }
    payload, signature = _signed_payload(
        {
            "id": event_id,
            "type": "checkout.session.completed",
            "data": {"object": session},
        }
    )

    result = stripe_service.handle_webhook_event(db, payload, signature)
    assert result["status"] == "processed"
    assert result["type"] == "checkout.session.completed"

    license_row = (
        db.query(License)
        .filter(License.owner_id == checkout_user.id, License.type == "individual")
        .first()
    )
    assert license_row is not None
    assert license_row.status == "active"
    assert license_row.stripe_customer_id == session["customer"]


def test_webhook_idempotency(db, checkout_user):
    event_id = f"evt_{uuid.uuid4().hex}"
    session = {
        "id": f"cs_{uuid.uuid4().hex[:12]}",
        "customer": f"cus_{uuid.uuid4().hex[:12]}",
        "subscription": None,
        "metadata": {
            "user_id": str(checkout_user.id),
            "license_type": "individual",
        },
    }
    event = {
        "id": event_id,
        "type": "checkout.session.completed",
        "data": {"object": session},
    }
    payload, signature = _signed_payload(event)

    first = stripe_service.handle_webhook_event(db, payload, signature)
    second = stripe_service.handle_webhook_event(db, payload, signature)

    assert first["status"] == "processed"
    assert second["status"] == "duplicate"

    count = (
        db.query(License)
        .filter(License.owner_id == checkout_user.id, License.type == "individual")
        .count()
    )
    assert count == 1


def test_invalid_signature_rejected(db):
    payload = json.dumps({"id": "evt_bad", "type": "checkout.session.completed", "data": {"object": {}}})
    with pytest.raises(Exception):
        stripe_service.handle_webhook_event(db, payload.encode(), "bad-signature")
