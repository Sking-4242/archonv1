"""
certs.py — Serve per-certification curriculum manifests.

Manifests are authored as JSON under academy/content/<course>/certs/<CODE>.json
and conform to cert-manifest.schema.json in that directory. They compose the
shared lesson library (curriculum.json) into blueprint-aligned, domain-weighted
exam-prep tracks. Lessons are referenced (by "<module-slug>/<file>"), never
copied, so the frontend resolves refs against the already-loaded library list.

This router is read-only and filesystem-backed (no DB), mirroring the content
source-of-truth model used by seed_library.py.
"""

import json
import os
from functools import lru_cache
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from app.dependencies.academy_auth import require_any_role
from app.models.academy import User

router = APIRouter(prefix="/academy/library/certs", tags=["academy-certs"])

# Resolve content root the same way seed_library.py does.
_THIS = os.path.abspath(__file__)
_BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(_THIS))))
CONTENT_ROOT = os.environ.get(
    "CONTENT_ROOT",
    os.path.join(_BACKEND_DIR, "..", "academy", "content"),
)


# ── Schemas ───────────────────────────────────────────────────────────────────

class CertSummary(BaseModel):
    """Lightweight cert metadata for the track picker."""
    code: str
    name: str
    short_name: Optional[str] = None
    level: str
    status: str
    retires_on: Optional[str] = None
    lesson_count: int = 0          # resolvable shared-lesson refs
    gap_count: int = 0             # cert-specific lessons still needed


# ── Helpers ───────────────────────────────────────────────────────────────────

def _certs_dir(course: str) -> str:
    # Guard against path traversal in the course segment.
    safe = os.path.basename(course)
    return os.path.join(CONTENT_ROOT, safe, "certs")


def _load_manifest(course: str, code: str) -> Optional[dict]:
    safe_code = os.path.basename(code)
    path = os.path.join(_certs_dir(course), f"{safe_code}.json")
    if not os.path.isfile(path):
        return None
    try:
        with open(path, encoding="utf-8") as fh:
            return json.load(fh)
    except (json.JSONDecodeError, OSError):
        return None


def _count_lesson_refs(manifest: dict) -> int:
    seen: set[str] = set()
    for domain in manifest.get("domains", []):
        for task in domain.get("tasks", []):
            for lesson in task.get("lessons", []):
                ref = lesson.get("ref")
                if ref:
                    seen.add(ref)
    return len(seen)


def _list_manifests(course: str) -> list[dict]:
    cdir = _certs_dir(course)
    if not os.path.isdir(cdir):
        return []
    out = []
    for fname in sorted(os.listdir(cdir)):
        if not fname.endswith(".json") or fname.endswith(".schema.json"):
            continue
        manifest = _load_manifest(course, fname[:-5])
        if manifest and "cert" in manifest:
            out.append(manifest)
    return out


# ── Routes ────────────────────────────────────────────────────────────────────

# Official ordering for the track picker.
_LEVEL_ORDER = {"foundational": 0, "associate": 1, "professional": 2, "specialty": 3}


@router.get("", response_model=list[CertSummary])
def list_certs(
    course: str = Query(..., description="Course/provider, e.g. 'aws'"),
    current_user: User = Depends(require_any_role),
):
    """Available certification tracks for a course, ordered by level then code.

    Retired certs are omitted from the picker (status == 'retired')."""
    summaries: list[CertSummary] = []
    for manifest in _list_manifests(course):
        cert = manifest["cert"]
        if cert.get("status") == "retired":
            continue
        needed = sum(
            1 for cl in manifest.get("cert_specific_lessons", [])
            if cl.get("status") == "needed"
        )
        summaries.append(CertSummary(
            code=cert["code"],
            name=cert["name"],
            short_name=cert.get("short_name"),
            level=cert["level"],
            status=cert.get("status", "active"),
            retires_on=cert.get("retires_on"),
            lesson_count=_count_lesson_refs(manifest),
            gap_count=needed,
        ))
    summaries.sort(key=lambda s: (_LEVEL_ORDER.get(s.level, 9), s.code))
    return summaries


@router.get("/{code}")
def get_cert(
    code: str,
    course: str = Query(..., description="Course/provider, e.g. 'aws'"),
    current_user: User = Depends(require_any_role),
) -> dict[str, Any]:
    """Full manifest for one certification. Lesson refs are resolved client-side
    against the library list (slug = '<course>/<ref-without-.md>')."""
    manifest = _load_manifest(course, code)
    if manifest is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No manifest for cert '{code}' in course '{course}'",
        )
    return manifest
