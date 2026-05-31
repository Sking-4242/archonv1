import logging
import os

import httpx

logger = logging.getLogger(__name__)

_PORTAL_URL = os.environ.get("ARCHONPRO_PORTAL_URL", "http://localhost:3002").rstrip("/")
_FROM_EMAIL = os.environ.get("EMAIL_FROM", "noreply@archonpro.net")
_PROVIDER = os.environ.get("EMAIL_PROVIDER", "console").lower()


def _send_postmark(to_email: str, subject: str, text_body: str, html_body: str | None = None) -> None:
    api_key = os.environ.get("POSTMARK_API_KEY", "")
    if not api_key:
        raise RuntimeError("POSTMARK_API_KEY is not configured")
    payload = {
        "From": _FROM_EMAIL,
        "To": to_email,
        "Subject": subject,
        "TextBody": text_body,
    }
    if html_body:
        payload["HtmlBody"] = html_body
    with httpx.Client(timeout=15.0) as client:
        resp = client.post(
            "https://api.postmarkapp.com/email",
            headers={
                "Accept": "application/json",
                "Content-Type": "application/json",
                "X-Postmark-Server-Token": api_key,
            },
            json=payload,
        )
        resp.raise_for_status()


def _send_sendgrid(to_email: str, subject: str, text_body: str, html_body: str | None = None) -> None:
    api_key = os.environ.get("SENDGRID_API_KEY", "")
    if not api_key:
        raise RuntimeError("SENDGRID_API_KEY is not configured")
    content = [{"type": "text/plain", "value": text_body}]
    if html_body:
        content.append({"type": "text/html", "value": html_body})
    payload = {
        "personalizations": [{"to": [{"email": to_email}]}],
        "from": {"email": _FROM_EMAIL},
        "subject": subject,
        "content": content,
    }
    with httpx.Client(timeout=15.0) as client:
        resp = client.post(
            "https://api.sendgrid.com/v3/mail/send",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json=payload,
        )
        resp.raise_for_status()


def send_email(to_email: str, subject: str, text_body: str, html_body: str | None = None) -> None:
    if _PROVIDER == "console":
        logger.info("EMAIL to=%s subject=%s\n%s", to_email, subject, text_body)
        return
    if _PROVIDER == "postmark":
        _send_postmark(to_email, subject, text_body, html_body)
        return
    if _PROVIDER == "sendgrid":
        _send_sendgrid(to_email, subject, text_body, html_body)
        return
    raise RuntimeError(f"Unsupported EMAIL_PROVIDER: {_PROVIDER}")


def send_welcome_email(to_email: str, display_name: str | None) -> None:
    name = display_name or to_email
    send_email(
        to_email,
        "Welcome to Archon",
        (
            f"Hi {name},\n\n"
            f"Your Archon account is ready. Sign in at {_PORTAL_URL} to manage your license "
            f"and subscription.\n\n"
            f"— The Archon Team"
        ),
    )


def send_license_purchased_email(
    to_email: str,
    license_key: str,
    *,
    display_name: str | None = None,
    expires_at: str | None = None,
) -> None:
    name = display_name or to_email
    expiry_line = f"\nYour license renews on {expires_at}." if expires_at else ""
    send_email(
        to_email,
        "Your Archon license key",
        (
            f"Hi {name},\n\n"
            f"Thank you for subscribing to Archon. Your license key:\n\n"
            f"  {license_key}\n\n"
            f"Open Archon → Settings → Account and paste this key to activate paid features."
            f"{expiry_line}\n\n"
            f"Manage billing: {_PORTAL_URL}\n\n"
            f"— The Archon Team"
        ),
    )


def send_renewal_reminder_email(to_email: str, *, expires_at: str, display_name: str | None = None) -> None:
    name = display_name or to_email
    send_email(
        to_email,
        "Archon license renewal reminder",
        (
            f"Hi {name},\n\n"
            f"Your Archon license expires on {expires_at}. Renew at {_PORTAL_URL} "
            f"to keep full access to Professional and Academy.\n\n"
            f"— The Archon Team"
        ),
    )


def send_grace_period_email(to_email: str, *, grace_until: str, display_name: str | None = None) -> None:
    name = display_name or to_email
    send_email(
        to_email,
        "Archon license grace period started",
        (
            f"Hi {name},\n\n"
            f"Your Archon license has expired. You have until {grace_until} to renew "
            f"before access is removed.\n\n"
            f"Renew now: {_PORTAL_URL}\n\n"
            f"— The Archon Team"
        ),
    )


def send_hard_cut_email(to_email: str, *, display_name: str | None = None) -> None:
    name = display_name or to_email
    send_email(
        to_email,
        "Archon license expired",
        (
            f"Hi {name},\n\n"
            f"Your Archon paid access has ended. Renew at {_PORTAL_URL} to restore "
            f"full Professional and Academy features.\n\n"
            f"— The Archon Team"
        ),
    )


def send_payment_failed_email(to_email: str, *, display_name: str | None = None) -> None:
    name = display_name or to_email
    send_email(
        to_email,
        "Archon payment failed",
        (
            f"Hi {name},\n\n"
            f"We could not process your latest Archon payment. Update your billing details "
            f"at {_PORTAL_URL} to avoid interruption.\n\n"
            f"— The Archon Team"
        ),
    )


def send_password_reset_email(
    to_email: str,
    token: str,
    display_name: str | None = None,
) -> None:
    name = display_name or to_email
    reset_url = f"{_PORTAL_URL}/reset-password?token={token}"
    send_email(
        to_email,
        "Reset your Archon password",
        (
            f"Hi {name},\n\n"
            f"Use this link to reset your password (expires in 1 hour):\n\n"
            f"  {reset_url}\n\n"
            f"If you did not request this, you can ignore this email.\n\n"
            f"— The Archon Team"
        ),
    )


def send_graduating_perk_email(
    to_email: str,
    *,
    expires_at: str,
    display_name: str | None = None,
) -> None:
    name = display_name or to_email
    send_email(
        to_email,
        "Your Archon graduating perk is active",
        (
            f"Hi {name},\n\n"
            f"Congratulations! Your institution has granted you 6 months of free Archon "
            f"Professional and Academy access through {expires_at}.\n\n"
            f"Sign in with your existing account — no license key required.\n\n"
            f"— The Archon Team"
        ),
    )
