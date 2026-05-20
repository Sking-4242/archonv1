"""
seed_modules.py — Seed Module and Lesson records from academy/content/aws/curriculum.json.

Run from the backend directory inside the container:
    docker compose exec backend python seed_modules.py

Idempotent: skips modules/lessons that already exist by title.
Creates one instructor user (admin@archon.academy) as the course author if not present.
"""

import json
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from app.db import Base, SessionLocal, engine
from app.models.academy import Lesson, Module, User
from app.services.academy.auth_service import hash_password

CONTENT_ROOT = os.environ.get(
    "CONTENT_ROOT",
    os.path.join(os.path.dirname(__file__), "..", "academy", "content"),
)
AWS_CURRICULUM = os.path.join(CONTENT_ROOT, "aws", "curriculum.json")


def parse_frontmatter(text: str) -> tuple[dict, str]:
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
            k = k.strip()
            v = v.strip().strip('"').strip("'")
            meta[k] = v
    return meta, body


def ensure_instructor(db) -> User:
    instructor = db.query(User).filter(User.email == "admin@archon.academy").first()
    if not instructor:
        instructor = User(
            name="Admin",
            email="admin@archon.academy",
            password_hash=hash_password("pass123"),
            role="instructor",
        )
        db.add(instructor)
        db.commit()
        db.refresh(instructor)
        print("  CREATED instructor: admin@archon.academy")
    return instructor


def seed():
    Base.metadata.create_all(bind=engine)
    curriculum = json.load(open(AWS_CURRICULUM, encoding="utf-8"))
    db = SessionLocal()
    content_root = os.path.join(CONTENT_ROOT, "aws")

    try:
        instructor = ensure_instructor(db)
        modules_created = 0
        lessons_created = 0

        for mod_data in curriculum["modules"]:
            slug = mod_data["slug"]
            mod_dir = os.path.join(content_root, slug)

            # Check if module already exists
            existing_mod = db.query(Module).filter(Module.title == mod_data["title"]).first()
            if existing_mod:
                module = existing_mod
                print(f"  SKIP module: {mod_data['title']}")
            else:
                module = Module(
                    title=mod_data["title"],
                    description=mod_data.get("description", ""),
                    order_index=mod_data.get("order", 0),
                    difficulty_level=mod_data.get("difficulty", "beginner"),
                    certification_tags=mod_data.get("cert_tags", []),
                    is_published=True,
                    created_by=instructor.id,
                )
                db.add(module)
                db.flush()  # get module.id before adding lessons
                modules_created += 1
                print(f"  CREATE module [{module.id}]: {mod_data['title']}")

            for order_idx, lesson_meta in enumerate(mod_data["lessons"]):
                fpath = os.path.join(mod_dir, lesson_meta["file"])
                if not os.path.exists(fpath):
                    print(f"    WARNING: file not found: {fpath}")
                    continue

                raw = open(fpath, encoding="utf-8").read()
                fm, content = parse_frontmatter(raw)

                lesson_type = lesson_meta.get("type", "content")

                # Check if lesson already exists on this module
                existing_lesson = (
                    db.query(Lesson)
                    .filter(
                        Lesson.module_id == module.id,
                        Lesson.title == lesson_meta["title"],
                    )
                    .first()
                )
                if existing_lesson:
                    # Update content in case it changed
                    existing_lesson.content = content
                    existing_lesson.lesson_type = lesson_type
                    existing_lesson.estimated_minutes = lesson_meta.get("minutes", 10)
                    existing_lesson.order_index = order_idx
                    continue

                lesson = Lesson(
                    module_id=module.id,
                    title=lesson_meta["title"],
                    content=content,
                    lesson_type=lesson_type,
                    canvas_template=None,
                    estimated_minutes=lesson_meta.get("minutes", 10),
                    order_index=order_idx,
                )
                db.add(lesson)
                lessons_created += 1

        db.commit()
        print(f"\nDone — {modules_created} modules created, {lessons_created} lessons created.")
        print("Existing records were updated in place.")

    finally:
        db.close()


if __name__ == "__main__":
    seed()
