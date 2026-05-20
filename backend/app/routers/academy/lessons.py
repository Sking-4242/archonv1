from datetime import datetime
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import exc as sa_exc
from sqlalchemy.orm import Session

from app.db import get_db
from app.dependencies.academy_auth import require_any_role, require_instructor
from app.models.academy import Lesson, LessonProgress, Module, User

router = APIRouter(prefix="/academy/lessons", tags=["academy-lessons"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class LessonIn(BaseModel):
    module_id: int
    title: str
    content: str = ""
    lesson_type: str = "content"          # "content" | "canvas"
    canvas_template: Optional[Any] = None  # JSON { nodes, edges, graphMeta } or null
    estimated_minutes: int = 10
    order_index: int = 0


class LessonOut(BaseModel):
    id: int
    module_id: int
    title: str
    content: str
    lesson_type: str
    canvas_template: Optional[Any] = None
    estimated_minutes: int
    order_index: int
    created_at: datetime
    completed: bool = False

    model_config = {"from_attributes": True}


class LessonListItem(BaseModel):
    """Lighter shape for list views — omits full content and template."""
    id: int
    module_id: int
    module_title: str
    title: str
    lesson_type: str
    estimated_minutes: int
    order_index: int
    completed: bool = False

    model_config = {"from_attributes": True}


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("")
def list_lessons(
    current_user: User = Depends(require_any_role),
    db: Session = Depends(get_db),
):
    """Flat list of all lessons across all published modules, grouped for the reading-list view."""
    query = db.query(Lesson).join(Module, Lesson.module_id == Module.id)
    if current_user.role == "student":
        query = query.filter(Module.is_published.is_(True))
    lessons = query.order_by(Module.order_index, Lesson.order_index).all()

    lesson_ids = [l.id for l in lessons]
    if current_user.role == "student" and lesson_ids:
        completed_rows = (
            db.query(LessonProgress.lesson_id)
            .filter(
                LessonProgress.student_id == current_user.id,
                LessonProgress.lesson_id.in_(lesson_ids),
            )
            .all()
        )
        completed = {r.lesson_id for r in completed_rows}
    else:
        completed = set()

    return [
        LessonListItem(
            id=l.id,
            module_id=l.module_id,
            module_title=l.module.title,
            title=l.title,
            lesson_type=l.lesson_type,
            estimated_minutes=l.estimated_minutes,
            order_index=l.order_index,
            completed=(l.id in completed),
        )
        for l in lessons
    ]


@router.get("/{lesson_id}", response_model=LessonOut)
def get_lesson(
    lesson_id: int,
    current_user: User = Depends(require_any_role),
    db: Session = Depends(get_db),
):
    lesson = db.get(Lesson, lesson_id)
    if lesson is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson not found")
    if current_user.role == "student" and not lesson.module.is_published:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson not found")

    completed = False
    if current_user.role == "student":
        progress = (
            db.query(LessonProgress)
            .filter_by(lesson_id=lesson_id, student_id=current_user.id)
            .first()
        )
        completed = progress is not None

    out = LessonOut.model_validate(lesson)
    out.completed = completed
    return out


@router.post("", status_code=status.HTTP_201_CREATED, response_model=LessonOut)
def create_lesson(
    body: LessonIn,
    current_user: User = Depends(require_instructor),
    db: Session = Depends(get_db),
):
    module = db.get(Module, body.module_id)
    if module is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Module not found")
    lesson = Lesson(
        module_id=body.module_id,
        title=body.title,
        content=body.content,
        lesson_type=body.lesson_type,
        canvas_template=body.canvas_template,
        estimated_minutes=body.estimated_minutes,
        order_index=body.order_index,
    )
    db.add(lesson)
    db.commit()
    db.refresh(lesson)
    out = LessonOut.model_validate(lesson)
    out.completed = False
    return out


@router.put("/{lesson_id}", response_model=LessonOut)
def update_lesson(
    lesson_id: int,
    body: LessonIn,
    current_user: User = Depends(require_instructor),
    db: Session = Depends(get_db),
):
    lesson = db.get(Lesson, lesson_id)
    if lesson is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson not found")
    lesson.title = body.title
    lesson.content = body.content
    lesson.lesson_type = body.lesson_type
    lesson.canvas_template = body.canvas_template
    lesson.estimated_minutes = body.estimated_minutes
    lesson.order_index = body.order_index
    db.commit()
    db.refresh(lesson)
    out = LessonOut.model_validate(lesson)
    out.completed = False
    return out


@router.delete("/{lesson_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_lesson(
    lesson_id: int,
    current_user: User = Depends(require_instructor),
    db: Session = Depends(get_db),
):
    lesson = db.get(Lesson, lesson_id)
    if lesson is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson not found")
    db.delete(lesson)
    db.commit()


@router.post("/{lesson_id}/complete", status_code=status.HTTP_200_OK)
def mark_complete(
    lesson_id: int,
    current_user: User = Depends(require_any_role),
    db: Session = Depends(get_db),
):
    """Mark a lesson as complete for the current student. Idempotent."""
    lesson = db.get(Lesson, lesson_id)
    if lesson is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson not found")
    existing = (
        db.query(LessonProgress)
        .filter_by(lesson_id=lesson_id, student_id=current_user.id)
        .first()
    )
    if existing:
        return {"completed": True, "lesson_id": lesson_id}
    progress = LessonProgress(lesson_id=lesson_id, student_id=current_user.id)
    try:
        db.add(progress)
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
    """Unmark a lesson as complete for the current student."""
    existing = (
        db.query(LessonProgress)
        .filter_by(lesson_id=lesson_id, student_id=current_user.id)
        .first()
    )
    if existing:
        db.delete(existing)
        db.commit()
    return {"completed": False, "lesson_id": lesson_id}
