import hashlib
import hmac
import time


def stripe_test_signature(payload: str, secret: str) -> str:
    """Build a valid Stripe-Signature header for webhook tests."""
    timestamp = int(time.time())
    signed_payload = f"{timestamp}.{payload}"
    signature = hmac.new(
        secret.encode("utf-8"),
        signed_payload.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    return f"t={timestamp},v1={signature}"
