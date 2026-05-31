import logging
import os
import uuid
from datetime import datetime, timedelta, timezone

import stripe
from sqlalchemy.orm import Session

from app.models.licensing import License, Organization
from app.models.stripe_event import StripeWebhookEvent
from app.models.user import User
from app.services import email_service, license_lifecycle

logger = logging.getLogger(__name__)

_STRIPE_SECRET = os.environ.get("STRIPE_SECRET_KEY", "")
_STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET", "")
_PORTAL_URL = os.environ.get("ARCHONPRO_PORTAL_URL", "http://localhost:3002").rstrip("/")
_PRICE_INDIVIDUAL = os.environ.get("STRIPE_PRICE_INDIVIDUAL_MONTHLY", "")
_PRICE_INSTITUTIONAL = os.environ.get("STRIPE_PRICE_INSTITUTIONAL", "")


def _configure_stripe() -> None:
    if _STRIPE_SECRET:
        stripe.api_key = _STRIPE_SECRET


def stripe_configured() -> bool:
    return bool(_STRIPE_SECRET)


def create_checkout_session(
    db: Session,
    user: User,
    *,
    license_type: str = "individual",
    org_id: uuid.UUID | None = None,
    seat_limit: int | None = None,
) -> str:
    _configure_stripe()
    if not stripe_configured() or not _PRICE_INDIVIDUAL:
        raise RuntimeError("Stripe is not configured")

    price_id = _PRICE_INDIVIDUAL if license_type == "individual" else _PRICE_INSTITUTIONAL
    if not price_id:
        raise RuntimeError(f"No Stripe price configured for {license_type}")

    metadata = {
        "user_id": str(user.id),
        "license_type": license_type,
    }
    if org_id:
        metadata["org_id"] = str(org_id)
    if seat_limit is not None:
        metadata["seat_limit"] = str(seat_limit)

    session = stripe.checkout.Session.create(
        mode="subscription",
        customer_email=user.email,
        line_items=[{"price": price_id, "quantity": 1}],
        success_url=f"{_PORTAL_URL}/dashboard?checkout=success",
        cancel_url=f"{_PORTAL_URL}/dashboard?checkout=cancelled",
        metadata=metadata,
        subscription_data={"metadata": metadata},
    )
    if not session.url:
        raise RuntimeError("Stripe did not return a checkout URL")
    return session.url


def create_billing_portal_session(db: Session, user: User) -> str:
    _configure_stripe()
    if not stripe_configured():
        raise RuntimeError("Stripe is not configured")

    license_row = (
        db.query(License)
        .filter(License.owner_id == user.id, License.stripe_customer_id.isnot(None))
        .order_by(License.created_at.desc())
        .first()
    )
    if license_row is None or not license_row.stripe_customer_id:
        raise RuntimeError("No Stripe billing profile found for this account")

    session = stripe.billing_portal.Session.create(
        customer=license_row.stripe_customer_id,
        return_url=f"{_PORTAL_URL}/dashboard",
    )
    return session.url


def _already_processed(db: Session, event_id: str) -> bool:
    return db.get(StripeWebhookEvent, event_id) is not None


def _mark_processed(db: Session, event_id: str, event_type: str) -> None:
    db.add(StripeWebhookEvent(id=event_id, event_type=event_type))
    db.commit()


def _period_end_ts(subscription: dict) -> datetime:
    end = subscription.get("current_period_end")
    if end:
        return datetime.fromtimestamp(end, tz=timezone.utc)
    return datetime.now(timezone.utc) + timedelta(days=30)


def _handle_checkout_completed(db: Session, session: dict) -> None:
    metadata = session.get("metadata") or {}
    user_id = metadata.get("user_id")
    license_type = metadata.get("license_type", "individual")
    if not user_id:
        logger.warning("checkout.session.completed missing user_id metadata")
        return

    user = db.get(User, uuid.UUID(user_id))
    if user is None:
        logger.warning("checkout user not found: %s", user_id)
        return

    customer_id = session.get("customer")
    subscription_id = session.get("subscription")
    expires_at = datetime.now(timezone.utc) + timedelta(days=30)

    if subscription_id:
        _configure_stripe()
        subscription = stripe.Subscription.retrieve(subscription_id)
        expires_at = _period_end_ts(subscription)

    if license_type == "institutional":
        org_id_raw = metadata.get("org_id")
        seat_limit_raw = metadata.get("seat_limit")
        if not org_id_raw:
            logger.warning("institutional checkout missing org_id")
            return
        org = db.get(Organization, uuid.UUID(org_id_raw))
        if org is None:
            logger.warning("institutional checkout org not found")
            return
        license_row = license_lifecycle.create_institutional_license(
            db,
            org=org,
            stripe_customer_id=str(customer_id),
            stripe_subscription_id=str(subscription_id) if subscription_id else None,
            expires_at=expires_at,
            seat_limit=int(seat_limit_raw) if seat_limit_raw else 1,
            auto_renew=True,
        )
        email_service.send_license_purchased_email(
            org.contact_email,
            str(license_row.key),
            display_name=org.contact_name,
            expires_at=expires_at.strftime("%Y-%m-%d"),
        )
        return

    license_row = license_lifecycle.create_individual_license(
        db,
        user=user,
        stripe_customer_id=str(customer_id),
        stripe_subscription_id=str(subscription_id) if subscription_id else None,
        expires_at=expires_at,
        auto_renew=True,
    )
    email_service.send_license_purchased_email(
        user.email,
        str(license_row.key),
        display_name=user.display_name,
        expires_at=expires_at.strftime("%Y-%m-%d"),
    )


def _handle_invoice_payment_succeeded(db: Session, invoice: dict) -> None:
    subscription_id = invoice.get("subscription")
    if not subscription_id:
        return
    license_row = license_lifecycle.find_license_by_subscription(db, str(subscription_id))
    if license_row is None:
        return
    license_lifecycle.extend_license_period(db, license_row, months=1)


def _handle_invoice_payment_failed(db: Session, invoice: dict) -> None:
    customer_id = invoice.get("customer")
    if not customer_id:
        return
    license_row = (
        db.query(License)
        .filter(License.stripe_customer_id == str(customer_id))
        .order_by(License.created_at.desc())
        .first()
    )
    if license_row is None:
        return
    email, name = license_lifecycle._recipient_for_license(db, license_row)
    if email:
        email_service.send_payment_failed_email(email, display_name=name)


def _handle_subscription_deleted(db: Session, subscription: dict) -> None:
    license_row = license_lifecycle.find_license_by_subscription(db, str(subscription.get("id")))
    if license_row is None:
        return
    license_lifecycle.enter_grace_period(db, license_row)


def _handle_subscription_updated(db: Session, subscription: dict) -> None:
    license_row = license_lifecycle.find_license_by_subscription(db, str(subscription.get("id")))
    if license_row is None:
        return
    metadata = subscription.get("metadata") or {}
    if "seat_limit" in metadata:
        license_row.seat_limit = int(metadata["seat_limit"])
    license_row.auto_renew = subscription.get("cancel_at_period_end") is not True
    if subscription.get("current_period_end"):
        license_row.expires_at = _period_end_ts(subscription)
    db.commit()


def handle_webhook_event(db: Session, payload: bytes, signature: str | None) -> dict:
    _configure_stripe()
    if not _STRIPE_WEBHOOK_SECRET:
        raise RuntimeError("STRIPE_WEBHOOK_SECRET is not configured")

    event = stripe.Webhook.construct_event(payload, signature, _STRIPE_WEBHOOK_SECRET)
    if _already_processed(db, event["id"]):
        return {"status": "duplicate", "type": event["type"]}

    event_type = event["type"]
    data_object = event["data"]["object"]

    if event_type == "checkout.session.completed":
        _handle_checkout_completed(db, data_object)
    elif event_type == "invoice.payment_succeeded":
        _handle_invoice_payment_succeeded(db, data_object)
    elif event_type == "invoice.payment_failed":
        _handle_invoice_payment_failed(db, data_object)
    elif event_type == "customer.subscription.deleted":
        _handle_subscription_deleted(db, data_object)
    elif event_type == "customer.subscription.updated":
        _handle_subscription_updated(db, data_object)
    else:
        logger.info("Unhandled Stripe event type: %s", event_type)

    _mark_processed(db, event["id"], event_type)
    return {"status": "processed", "type": event_type}
