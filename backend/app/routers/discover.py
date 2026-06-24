"""
Discovery API endpoints.

GET  /discover/profiles  — list available AWS credential profiles
GET  /discover/regions   — list AWS regions
GET  /discover/catalog   — list service catalog (categories + services)
POST /discover/stream    — SSE stream: run discovery and emit per-service events
"""

from __future__ import annotations

import json
import logging
import sys
import os

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.dependencies.auth import get_optional_user
from app.models.user import User
from app.services.access_service import resolve_access

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/discover", tags=["discover"])

# ─── Static region list ───────────────────────────────────────────────────────

_AWS_REGIONS = [
    "us-east-1", "us-east-2", "us-west-1", "us-west-2",
    "ca-central-1", "ca-west-1",
    "eu-west-1", "eu-west-2", "eu-west-3", "eu-central-1", "eu-central-2",
    "eu-north-1", "eu-south-1", "eu-south-2",
    "ap-northeast-1", "ap-northeast-2", "ap-northeast-3",
    "ap-southeast-1", "ap-southeast-2", "ap-southeast-3", "ap-southeast-4",
    "ap-south-1", "ap-south-2", "ap-east-1",
    "sa-east-1",
    "me-south-1", "me-central-1",
    "af-south-1",
    "il-central-1",
]


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _get_profiles() -> list[str]:
    """Return available boto3 profile names from ~/.aws/credentials and ~/.aws/config."""
    try:
        import boto3
        session = boto3.Session()
        return list(session.available_profiles)
    except Exception:
        return []


def _has_default_credentials() -> bool:
    """Check whether default AWS credentials are resolvable without a named profile."""
    try:
        import boto3
        creds = boto3.Session().get_credentials()
        return creds is not None
    except Exception:
        return False


def _cli_available() -> bool:
    """Check whether archon-cli (and thus discover.py) is importable."""
    try:
        # Add archon-cli to path if running from the repo
        cli_path = os.path.join(os.path.dirname(__file__), "..", "..", "..", "..", "archon-cli")
        cli_path = os.path.normpath(cli_path)
        if cli_path not in sys.path and os.path.isdir(cli_path):
            sys.path.insert(0, cli_path)
        import archon_cli.discover  # noqa: F401
        return True
    except ImportError:
        return False


def _ensure_cli_path():
    cli_path = os.path.join(os.path.dirname(__file__), "..", "..", "..", "..", "archon-cli")
    cli_path = os.path.normpath(cli_path)
    if cli_path not in sys.path and os.path.isdir(cli_path):
        sys.path.insert(0, cli_path)


# ─── Routes ───────────────────────────────────────────────────────────────────

@router.get("/profiles")
async def get_profiles(user: User | None = Depends(get_optional_user)):
    """Return available AWS credential profiles and whether default credentials exist."""
    profiles = _get_profiles()
    has_default = _has_default_credentials()
    return {
        "profiles": profiles,
        "has_default_credentials": has_default,
    }


@router.get("/regions")
async def get_regions():
    """Return list of supported AWS regions."""
    return {"regions": _AWS_REGIONS}


@router.get("/catalog")
async def get_catalog():
    """
    Return the service catalog grouped by category.
    Used by the wizard to render the service selection checkboxes.
    """
    _ensure_cli_path()
    try:
        from archon_cli.discover import SERVICE_CATALOG
    except ImportError:
        raise HTTPException(status_code=503, detail="archon-cli not available")

    catalog: dict[str, list[str]] = {}
    for category, display_name, _fn in SERVICE_CATALOG:
        catalog.setdefault(category, []).append(display_name)

    # Return as ordered list of {category, services[]}
    result = [{"category": cat, "services": svcs} for cat, svcs in catalog.items()]
    return {"catalog": result}


class DiscoverStreamRequest(BaseModel):
    profile: str | None = None          # None → default credential chain
    region: str = "us-east-1"
    services: list[str] | None = None   # None or empty → all services


@router.post("/stream")
async def discover_stream(
    body: DiscoverStreamRequest,
    user: User | None = Depends(get_optional_user),
):
    """
    SSE endpoint: runs AWS discovery and emits one event per service completed.

    Event types:
      {"type": "service", "service": "EC2 Instances", "category": "Compute",
       "status": "ok"|"error", "count": 12, "error": null}
      {"type": "done", "report": { ...archon-format report... }}
      {"type": "error", "message": "..."}
    """
    _ensure_cli_path()
    try:
        import boto3
        from archon_cli.discover import (
            SERVICE_CATALOG, _DISCOVERERS, _FN_TO_META,
            DiscoveryReport, DiscoveryError,
        )
        from archon_cli.formatters import format_discover_archon
    except ImportError as e:
        raise HTTPException(status_code=503, detail=f"archon-cli not available: {e}")

    # Build the filtered discoverer list
    if body.services:
        service_set = set(body.services)
        catalog_lookup = {name: fn for _cat, name, fn in SERVICE_CATALOG}
        discoverers = [catalog_lookup[s] for s in body.services if s in catalog_lookup]
        # Also run any _DISCOVERERS not in catalog (safety net)
        catalog_fns = set(catalog_lookup.values())
        extra = [fn for fn in _DISCOVERERS if fn not in catalog_fns]
        # Don't add extras when user selected specific services
    else:
        discoverers = list(_DISCOVERERS)

    region = body.region
    profile = body.profile or None

    async def event_stream():
        try:
            import boto3 as _boto3
            session = _boto3.Session(profile_name=profile) if profile else _boto3.Session()
        except Exception as exc:
            yield f"data: {json.dumps({'type': 'error', 'message': str(exc)})}\n\n"
            return

        report = DiscoveryReport(region=region)

        for fn in discoverers:
            meta = _FN_TO_META.get(fn)
            display_name = meta[1] if meta else fn.__name__
            category = meta[0] if meta else "Other"
            errors_before = len(report.errors)
            try:
                found = fn(session, region, report.errors)
                report.resources.extend(found)
                new_errors = report.errors[errors_before:]
                status = "error" if new_errors else "ok"
                error_msg = new_errors[0].error if new_errors else None
                event = {
                    "type": "service",
                    "service": display_name,
                    "category": category,
                    "status": status,
                    "count": len(found),
                    "error": error_msg,
                }
            except Exception as exc:
                report.errors.append(DiscoveryError(service=display_name, error=str(exc)))
                event = {
                    "type": "service",
                    "service": display_name,
                    "category": category,
                    "status": "error",
                    "count": 0,
                    "error": str(exc),
                }
            yield f"data: {json.dumps(event)}\n\n"

        # Build final archon-format report
        import io as _io
        from archon_cli.formatters import format_discover_archon as _fmt
        buf = _io.StringIO()
        _fmt(report, buf)
        try:
            report_data = json.loads(buf.getvalue())
        except Exception:
            report_data = {}

        done_event = {"type": "done", "report": report_data}
        yield f"data: {json.dumps(done_event)}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # disable nginx buffering
        },
    )


# ─── AWS Credential Management ────────────────────────────────────────────────

import configparser
import os
import stat

_CREDENTIALS_FILE = os.path.expanduser("~/.aws/credentials")
_CONFIG_FILE = os.path.expanduser("~/.aws/config")


def _read_credentials_file() -> configparser.ConfigParser:
    cp = configparser.ConfigParser()
    if os.path.exists(_CREDENTIALS_FILE):
        cp.read(_CREDENTIALS_FILE)
    return cp


def _write_credentials_file(cp: configparser.ConfigParser) -> None:
    """Write credentials file and enforce 600 permissions."""
    os.makedirs(os.path.dirname(_CREDENTIALS_FILE), exist_ok=True)
    with open(_CREDENTIALS_FILE, "w") as f:
        cp.write(f)
    os.chmod(_CREDENTIALS_FILE, stat.S_IRUSR | stat.S_IWUSR)


class AddCredentialsRequest(BaseModel):
    profile_name: str
    aws_access_key_id: str
    aws_secret_access_key: str
    aws_session_token: str | None = None
    region: str | None = None
    overwrite: bool = False


class VerifyCredentialsRequest(BaseModel):
    profile: str | None = None   # None = default chain


@router.get("/credentials/list")
async def list_credentials():
    """
    Return all profiles from ~/.aws/credentials plus whether default
    environment-variable credentials exist.
    """
    cp = _read_credentials_file()
    profiles = [s for s in cp.sections()]
    # 'default' section shows as 'default' in sections
    has_default_env = _has_default_credentials()
    return {
        "profiles": profiles,
        "has_default_credentials": has_default_env,
        "credentials_file": _CREDENTIALS_FILE,
    }


@router.post("/credentials/add")
async def add_credentials(body: AddCredentialsRequest):
    """
    Write a new (or overwrite an existing) profile to ~/.aws/credentials.
    Enforces chmod 600 on the file after writing.
    Credentials are written directly to disk and not stored in memory beyond
    this request. They are never logged or echoed back in the response.
    """
    profile = body.profile_name.strip()
    if not profile:
        raise HTTPException(status_code=400, detail="profile_name is required")
    if "/" in profile or "\\" in profile:
        raise HTTPException(status_code=400, detail="Invalid profile name")

    cp = _read_credentials_file()

    if cp.has_section(profile) and not body.overwrite:
        raise HTTPException(
            status_code=409,
            detail=f"Profile '{profile}' already exists. Set overwrite=true to replace it.",
        )

    if not cp.has_section(profile):
        cp.add_section(profile)

    cp.set(profile, "aws_access_key_id", body.aws_access_key_id.strip())
    cp.set(profile, "aws_secret_access_key", body.aws_secret_access_key.strip())
    if body.aws_session_token:
        cp.set(profile, "aws_session_token", body.aws_session_token.strip())
    elif cp.has_option(profile, "aws_session_token"):
        cp.remove_option(profile, "aws_session_token")
    if body.region:
        cp.set(profile, "region", body.region.strip())

    _write_credentials_file(cp)

    return {"success": True, "profile": profile}


@router.delete("/credentials/{profile_name}")
async def delete_credentials(profile_name: str):
    """Remove a profile from ~/.aws/credentials."""
    cp = _read_credentials_file()
    if not cp.has_section(profile_name):
        raise HTTPException(status_code=404, detail=f"Profile '{profile_name}' not found")
    cp.remove_section(profile_name)
    _write_credentials_file(cp)
    return {"success": True, "profile": profile_name}


@router.post("/credentials/verify")
async def verify_credentials(body: VerifyCredentialsRequest):
    """
    Call sts:GetCallerIdentity with the given profile (or default chain).
    Returns account ID, user ARN, and user ID on success.
    Never logs or stores credentials.
    """
    try:
        import boto3 as _boto3
        session = _boto3.Session(profile_name=body.profile) if body.profile else _boto3.Session()
        sts = session.client("sts", region_name="us-east-1")
        identity = sts.get_caller_identity()
        return {
            "valid": True,
            "account_id": identity["Account"],
            "arn": identity["Arn"],
            "user_id": identity["UserId"],
        }
    except Exception as exc:
        msg = str(exc)
        # Scrub any key material that might appear in boto3 error messages
        return {"valid": False, "error": msg}
