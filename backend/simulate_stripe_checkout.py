"""
Simulate a Stripe checkout.session.completed webhook locally (no Stripe CLI required).

    docker compose exec backend python simulate_stripe_checkout.py student@archon.academy

Uses STRIPE_WEBHOOK_SECRET from the environment. Prints the created license key.
"""

import hashlib
import hmac
import json
import os
import sys
import time
import uuid

sys.path.insert(0, os.path.dirname(__file__))

import app.models  # noqa: F401

from app.db import SessionLocal
from app.models.licensing import License
from app.models.user import User
from app.services import stripe_service

WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET", "whsec_dev_test_secret")


def _stripe_test_signature(payload: str, secret: str) -> str:
    timestamp = int(time.time())
    signed_payload = f"{timestamp}.{payload}"
    signature = hmac.new(
        secret.encode("utf-8"),
        signed_payload.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    return f"t={timestamp},v1={signature}"


def main() -> None:
    email = (sys.argv[1] if len(sys.argv) > 1 else "student@archon.academy").strip().lower()

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if user is None:
            print(f"User not found: {email}")
            sys.exit(1)

        event_id = f"evt_sim_{uuid.uuid4().hex[:16]}"
        session = {
            "id": f"cs_sim_{uuid.uuid4().hex[:12]}",
            "customer": f"cus_sim_{uuid.uuid4().hex[:12]}",
            "subscription": None,
            "metadata": {
                "user_id": str(user.id),
                "license_type": "individual",
            },
        }
        payload = json.dumps(
            {
                "id": event_id,
                "type": "checkout.session.completed",
                "data": {"object": session},
            }
        )
        signature = _stripe_test_signature(payload, WEBHOOK_SECRET)

        os.environ["STRIPE_WEBHOOK_SECRET"] = WEBHOOK_SECRET
        result = stripe_service.handle_webhook_event(db, payload.encode(), signature)
        print("Webhook result:", result)

        license_row = (
            db.query(License)
            .filter(License.owner_id == user.id, License.type == "individual")
            .order_by(License.created_at.desc())
            .first()
        )
        if license_row:
            print(f"License key: {license_row.key}")
            print(f"Expires: {license_row.expires_at}")
        else:
            print("No individual license found after simulation")
    finally:
        db.close()


if __name__ == "__main__":
    main()
