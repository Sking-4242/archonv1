"""
seed_modules.py — Seed Module and Lesson records for all courses (aws, azure, gcp).

Run from the backend directory inside the container:
    docker compose exec backend python seed_modules.py

Idempotent: skips modules/lessons that already exist (matched by course + title).
Updates lesson content in-place if it already exists.
Handles the 'course' column migration for existing databases automatically.
"""

import json
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from sqlalchemy import text

from app.db import Base, SessionLocal, engine
from app.models.academy import Lesson, Module, User
from app.services.academy.auth_service import hash_password

CONTENT_ROOT = os.environ.get(
    "CONTENT_ROOT",
    os.path.join(os.path.dirname(__file__), "..", "academy", "content"),
)

COURSES = ["aws", "azure", "gcp"]


def parse_frontmatter(text_):
    meta = {}
    if not text_.startswith("---"):
        return meta, text_
    end = text_.find("---", 3)
    if end == -1:
        return meta, text_
    fm_block = text_[3:end].strip()
    body = text_[end + 3:].strip()
    for line in fm_block.splitlines():
        if ":" in line:
            k, _, v = line.partition(":")
            meta[k.strip()] = v.strip().strip('"').strip("'")
    return meta, body


def ensure_course_column(conn):
    """Add the 'course' column to modules if it does not exist yet."""
    result = conn.execute(text(
        "SELECT column_name FROM information_schema.columns "
        "WHERE table_name='modules' AND column_name='course'"
    ))
    if result.fetchone() is None:
        conn.execute(text(
            "ALTER TABLE modules ADD COLUMN course VARCHAR(20) NOT NULL DEFAULT 'aws'"
        ))
        conn.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_modules_course ON modules (course)"
        ))
        print("  Migrated: added 'course' column to modules table")


def ensure_instructor(db):
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


def seed_course(db, course, instructor):
    course_dir = os.path.join(CONTENT_ROOT, course)
    curriculum_path = os.path.join(course_dir, "curriculum.json")

    if not os.path.exists(curriculum_path):
        print(f"  SKIP {course}: no curriculum.json at {curriculum_path}")
        return 0, 0

    curriculum = json.load(open(curriculum_path, encoding="utf-8"))
    modules_created = 0
    lessons_created = 0

    for mod_data in curriculum["modules"]:
        slug = mod_data["slug"]
        mod_dir = os.path.join(course_dir, slug)

        existing_mod = (
            db.query(Module)
            .filter(Module.course == course, Module.title == mod_data["title"])
            .first()
        )

        if existing_mod:
            module = existing_mod
        else:
            module = Module(
                course=course,
                title=mod_data["title"],
                description=mod_data.get("description", ""),
                order_index=mod_data.get("order", 0),
                difficulty_level=mod_data.get("difficulty", "beginner"),
                certification_tags=mod_data.get("cert_tags", []),
                is_published=True,
                created_by=instructor.id,
            )
            db.add(module)
            db.flush()
            modules_created += 1
            print(f"    CREATE module [{module.id}]: {mod_data['title']}")

        for order_idx, lesson_meta in enumerate(mod_data["lessons"]):
            fpath = os.path.join(mod_dir, lesson_meta["file"])
            if not os.path.exists(fpath):
                print(f"      WARNING: file not found: {fpath}")
                continue

            raw = open(fpath, encoding="utf-8").read()
            _, content = parse_frontmatter(raw)
            lesson_type = lesson_meta.get("type", "content")

            existing_lesson = (
                db.query(Lesson)
                .filter(
                    Lesson.module_id == module.id,
                    Lesson.title == lesson_meta["title"],
                )
                .first()
            )

            if existing_lesson:
                existing_lesson.content = content
                existing_lesson.lesson_type = lesson_type
                existing_lesson.estimated_minutes = lesson_meta.get("minutes", 10)
                existing_lesson.order_index = order_idx
            else:
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

    return modules_created, lessons_created


def seed():
    Base.metadata.create_all(bind=engine)

    with engine.begin() as conn:
        ensure_course_column(conn)

    db = SessionLocal()
    try:
        instructor = ensure_instructor(db)
        total_modules = 0
        total_lessons = 0

        for course in COURSES:
            print(f"\n  Seeding course: {course}")
            m, l = seed_course(db, course, instructor)
            total_modules += m
            total_lessons += l
            print(f"    {m} modules created, {l} lessons created")

        db.commit()
        print(f"\nDone — {total_modules} modules, {total_lessons} lessons across {len(COURSES)} courses.")
        print("Existing records were updated in place.")

    finally:
        db.close()


if __name__ == "__main__":
    seed()
