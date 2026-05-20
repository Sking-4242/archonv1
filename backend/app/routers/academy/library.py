from datetime import datetime
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import exc as sa_exc
from sqlalchemy.orm import Session

from app.db import get_db
from app.dependencies.academy_auth import require_any_role
from app.models.academy import LibraryLesson, LibraryLessonProgress, LessonNote, User

router = APIRouter(prefix="/academy/library", tags=["academy-library"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class LibraryLessonOut(BaseModel):
    id: int
    slug: str
    course: str
    module_slug: str
    module_title: str
    module_order: int
    title: str
    content: str
    lesson_type: str
    canvas_template: Optional[Any] = None
    estimated_minutes: int
    order_index: int
    difficulty_level: str
    certification_tags: list
    completed: bool = False

    model_config = {"from_attributes": True}


class LibraryLessonSummary(BaseModel):
    """Lighter shape for list and search views — no content body."""
    id: int
    slug: str
    course: str
    module_slug: str
    module_title: str
    module_order: int
    title: str
    lesson_type: str
    estimated_minutes: int
    order_index: int
    difficulty_level: str
    certification_tags: list
    completed: bool = False

    model_config = {"from_attributes": True}


# ── Helpers ───────────────────────────────────────────────────────────────────

def _completed_ids(user: User, db: Session) -> set[int]:
    if user.role != "student":
        return set()
    rows = (
        db.query(LibraryLessonProgress.library_lesson_id)
        .filter_by(student_id=user.id)
        .all()
    )
    return {r.library_lesson_id for r in rows}


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("", response_model=list[LibraryLessonSummary])
def list_library(
    course: Optional[str] = Query(None),
    current_user: User = Depends(require_any_role),
    db: Session = Depends(get_db),
):
    """All library lessons, optionally filtered by course, ordered by module then lesson."""
    q = db.query(LibraryLesson)
    if course:
        q = q.filter(LibraryLesson.course == course)
    lessons = q.order_by(LibraryLesson.module_order, LibraryLesson.order_index).all()

    done = _completed_ids(current_user, db)
    results = []
    for l in lessons:
        item = LibraryLessonSummary.model_validate(l)
        item.completed = l.id in done
        results.append(item)
    return results


@router.get("/search", response_model=list[LibraryLessonSummary])
def search_library(
    q: str = Query(..., min_length=1),
    course: Optional[str] = Query(None),
    current_user: User = Depends(require_any_role),
    db: Session = Depends(get_db),
):
    """Full-text search across title and module_title. Used for inline picker."""
    query = db.query(LibraryLesson)
    if course:
        query = query.filter(LibraryLesson.course == course)
    term = f"%{q.lower()}%"
    from sqlalchemy import func
    query = query.filter(
        func.lower(LibraryLesson.title).like(term)
        | func.lower(LibraryLesson.module_title).like(term)
    )
    lessons = query.order_by(LibraryLesson.module_order, LibraryLesson.order_index).limit(20).all()
    done = _completed_ids(current_user, db)
    results = []
    for l in lessons:
        item = LibraryLessonSummary.model_validate(l)
        item.completed = l.id in done
        results.append(item)
    return results


@router.get("/{lesson_id}", response_model=LibraryLessonOut)
def get_library_lesson(
    lesson_id: int,
    current_user: User = Depends(require_any_role),
    db: Session = Depends(get_db),
):
    lesson = db.get(LibraryLesson, lesson_id)
    if lesson is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Library lesson not found")
    done = _completed_ids(current_user, db)
    out = LibraryLessonOut.model_validate(lesson)
    out.completed = lesson.id in done
    return out


@router.post("/{lesson_id}/complete", status_code=status.HTTP_200_OK)
def mark_complete(
    lesson_id: int,
    current_user: User = Depends(require_any_role),
    db: Session = Depends(get_db),
):
    """Mark a library lesson complete. Idempotent."""
    lesson = db.get(LibraryLesson, lesson_id)
    if lesson is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Library lesson not found")
    existing = (
        db.query(LibraryLessonProgress)
        .filter_by(library_lesson_id=lesson_id, student_id=current_user.id)
        .first()
    )
    if existing:
        return {"completed": True, "lesson_id": lesson_id}
    try:
        db.add(LibraryLessonProgress(library_lesson_id=lesson_id, student_id=current_user.id))
        db.commit()
    except sa_exc.IntegrityError:
        db.rollback()
    return {"completed": True, "lesson_id": lesson_id}


@router.delete("/{lesson_id}/complete", status_code=status.HTTP_200_OK)
def unmark_complete(
    lesson_id: int,
    current_user: User = Depends(require_any_role),
    db: Session = Depends(get_db),
):
    existing = (
        db.query(LibraryLessonProgress)
        .filter_by(library_lesson_id=lesson_id, student_id=current_user.id)
        .first()
    )
    if existing:
        db.delete(existing)
        db.commit()
    return {"completed": False, "lesson_id": lesson_id}
