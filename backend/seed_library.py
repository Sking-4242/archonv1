"""
seed_library.py — Seed the Archon content library from academy/content/.

Run from the backend directory:
    python seed_library.py

Idempotent: existing lessons are updated if content has changed.
New lessons are inserted. Lessons whose slugs no longer exist in the files
are left in place (no destructive deletes).
"""

import json
import os
import re
import sys

from sqlalchemy.orm import Session

# Allow running from backend/ or project root
sys.path.insert(0, os.path.dirname(__file__))

from app.db import engine, Base
from app.models import academy as _models  # noqa — registers all ORM models

CONTENT_ROOT = os.environ.get(
    "CONTENT_ROOT",
    os.path.join(os.path.dirname(__file__), "..", "academy", "content"),
)


def parse_frontmatter(text: str) -> tuple[dict, str]:
    """Extract YAML-ish frontmatter and return (meta, body)."""
    meta: dict = {}
    if not text.startswith("---"):
        return meta, text
    end = text.find("---", 3)
    if end == -1:
        return meta, text
    fm_block = text[3:end].strip()
    body = text[end + 3:].strip()
    for line in fm_block.splitlines():
        if ":" in line:
            k, _, v = line.partition(":")
            meta[k.strip()] = v.strip().strip('"').strip("'")
    return meta, body


def seed_course(course: str, db: Session) -> int:
    course_dir = os.path.join(CONTENT_ROOT, course)
    curriculum_path = os.path.join(course_dir, "curriculum.json")
    if not os.path.exists(curriculum_path):
        print(f"  No curriculum.json found in {course_dir}, skipping.")
        return 0

    curriculum = json.load(open(curriculum_path))
    upserted = 0

    for mod in curriculum["modules"]:
        mod_slug = mod["slug"]
        mod_dir = os.path.join(course_dir, mod_slug)

        for lesson_meta in mod["lessons"]:
            fpath = os.path.join(mod_dir, lesson_meta["file"])
            if not os.path.exists(fpath):
                print(f"  WARNING: file not found: {fpath}")
                continue

            raw = open(fpath, encoding="utf-8").read()
            fm, content = parse_frontmatter(raw)

            slug = f"{course}/{mod_slug}/{os.path.splitext(lesson_meta['file'])[0]}"

            existing = db.query(_models.LibraryLesson).filter_by(slug=slug).first()
            if existing:
                existing.title = lesson_meta["title"]
                existing.content = content
                existing.lesson_type = lesson_meta.get("type", "content")
                existing.estimated_minutes = lesson_meta.get("minutes", 10)
                existing.module_slug = mod_slug
                existing.module_title = mod["title"]
                existing.module_order = mod["order"]
                existing.order_index = mod["lessons"].index(lesson_meta)
                existing.difficulty_level = mod.get("difficulty", "beginner")
                existing.certification_tags = mod.get("cert_tags", [])
            else:
                db.add(_models.LibraryLesson(
                    slug=slug,
                    course=course,
                    module_slug=mod_slug,
                    module_title=mod["title"],
                    module_order=mod["order"],
                    title=lesson_meta["title"],
                    content=content,
                    lesson_type=lesson_meta.get("type", "content"),
                    estimated_minutes=lesson_meta.get("minutes", 10),
                    order_index=mod["lessons"].index(lesson_meta),
                    difficulty_level=mod.get("difficulty", "beginner"),
                    certification_tags=mod.get("cert_tags", []),
                ))
            upserted += 1

    upserted += _seed_cert_lessons(course, course_dir, db)
    upserted += _seed_service_lessons(course, course_dir, db)

    db.commit()
    return upserted


def _seed_service_lessons(course: str, course_dir: str, db: Session) -> int:
    """Seed shared service-reference lessons under <course>/services/*.md.

    These are deep, reusable per-service lessons (e.g. GuardDuty, KMS) referenced
    by multiple cert manifests via "services/<name>.md". They are seeded with slug
    "<course>/services/<name>" so those refs resolve, grouped under a single
    "Service Reference" module, and tagged from each file's frontmatter cert_tags
    so they surface for every certification that uses the service."""
    services_dir = os.path.join(course_dir, "services")
    if not os.path.isdir(services_dir):
        return 0

    upserted = 0
    for idx, fname in enumerate(sorted(os.listdir(services_dir))):
        if not fname.endswith(".md"):
            continue
        fpath = os.path.join(services_dir, fname)
        raw = open(fpath, encoding="utf-8").read()
        fm, content = parse_frontmatter(raw)

        name = os.path.splitext(fname)[0]
        slug = f"{course}/services/{name}"

        # cert_tags in frontmatter is a JSON-ish list on one line; parse leniently.
        raw_tags = fm.get("cert_tags", "")
        tags = re.findall(r"[A-Z]{2,4}-C?\d{2,3}", raw_tags)

        fields = dict(
            course=course,
            module_slug="services",
            module_title="AWS Service Reference",
            module_order=950,
            title=fm.get("title", name),
            content=content,
            lesson_type=fm.get("type", "content"),
            estimated_minutes=int(fm.get("estimated_minutes", 15) or 15),
            order_index=idx,
            difficulty_level="intermediate",
            certification_tags=tags,
        )

        existing = db.query(_models.LibraryLesson).filter_by(slug=slug).first()
        if existing:
            for k, v in fields.items():
                setattr(existing, k, v)
        else:
            db.add(_models.LibraryLesson(slug=slug, **fields))
        upserted += 1

    return upserted


def _seed_cert_lessons(course: str, course_dir: str, db: Session) -> int:
    """Seed published cert-specific lessons referenced by certs/<CODE>.json manifests.

    These lessons live under certs/<CODE>/lessons/ and are NOT part of curriculum.json.
    They are seeded with slug "<course>/certs/<CODE>/lessons/<name>" so manifest refs
    ("certs/<CODE>/lessons/<file>") resolve in the cert track view. They are kept out of
    the general Full Learning Path by the frontend (which filters the "<course>/certs/"
    slug prefix)."""
    certs_dir = os.path.join(course_dir, "certs")
    if not os.path.isdir(certs_dir):
        return 0

    upserted = 0
    for fname in sorted(os.listdir(certs_dir)):
        if not fname.endswith(".json") or fname.endswith(".schema.json"):
            continue
        try:
            manifest = json.load(open(os.path.join(certs_dir, fname), encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            continue
        code = manifest.get("cert", {}).get("code")
        if not code:
            continue

        for idx, cl in enumerate(manifest.get("cert_specific_lessons", [])):
            if cl.get("status") != "published":
                continue
            rel = cl["file"]  # e.g. "certs/SAA-C03/lessons/cross-account-access-patterns.md"
            fpath = os.path.join(course_dir, rel)
            if not os.path.exists(fpath):
                print(f"  WARNING: cert lesson file not found: {fpath}")
                continue

            raw = open(fpath, encoding="utf-8").read()
            fm, content = parse_frontmatter(raw)
            slug = f"{course}/{os.path.splitext(rel)[0]}"

            fields = dict(
                course=course,
                module_slug=f"certs/{code}",
                module_title=f"{code} — Cert-Specific Lessons",
                module_order=900,
                title=fm.get("title", cl.get("title", rel)),
                content=content,
                lesson_type=fm.get("type", "content"),
                estimated_minutes=int(fm.get("estimated_minutes", cl.get("minutes", 12) or 12)),
                order_index=idx,
                difficulty_level="intermediate",
                certification_tags=[code],
            )

            existing = db.query(_models.LibraryLesson).filter_by(slug=slug).first()
            if existing:
                for k, v in fields.items():
                    setattr(existing, k, v)
            else:
                db.add(_models.LibraryLesson(slug=slug, **fields))
            upserted += 1

    return upserted


def main():
    Base.metadata.create_all(bind=engine)

    if not os.path.isdir(CONTENT_ROOT):
        print(f"Content root not found: {CONTENT_ROOT}")
        sys.exit(1)

    courses = [
        d for d in os.listdir(CONTENT_ROOT)
        if os.path.isdir(os.path.join(CONTENT_ROOT, d))
    ]

    with Session(engine) as db:
        total = 0
        for course in sorted(courses):
            print(f"Seeding course: {course}")
            n = seed_course(course, db)
            print(f"  {n} lessons upserted")
            total += n

    print(f"\nDone — {total} library lessons seeded.")


if __name__ == "__main__":
    main()
