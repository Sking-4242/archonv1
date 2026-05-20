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

    db.commit()
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
