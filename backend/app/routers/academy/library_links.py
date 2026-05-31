from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import exc as sa_exc
from sqlalchemy.orm import Session

from app.db import get_db
from app.dependencies.academy_auth import require_any_role, require_instructor
from app.models.academy import LibraryLesson, LibraryLessonProgress, Module, ModuleLibraryLink, User

router = APIRouter(prefix="/academy/modules", tags=["academy-library-links"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class LibraryLinkIn(BaseModel):
    library_lesson_id: int
    order_index: int = 0


class LibraryLinkNoteIn(BaseModel):
    instructor_note: Optional[str] = None
    instructor_note_visible: bool = False


class LibraryLinkOut(BaseModel):
    id: int
    module_id: int
    library_lesson_id: int
    order_index: int
    instructor_note: Optional[str]
    instructor_note_visible: bool
    lesson_title: str
    lesson_slug: str
    lesson_type: str
    estimated_minutes: int
    completed: bool = False

    model_config = {"from_attributes": True}


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/{module_id}/library-links", response_model=list[LibraryLinkOut])
def list_module_library_links(
    module_id: int,
    current_user: User = Depends(require_any_role),
    db: Session = Depends(get_db),
):
    """Return all library lessons linked to a module, with completion status for the current user."""
    module = db.get(Module, module_id)
    if module is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Module not found")

    links = (
        db.query(ModuleLibraryLink)
        .filter_by(module_id=module_id)
        .order_by(ModuleLibraryLink.order_index)
        .all()
    )

    if not links:
        return []

    lesson_ids = [l.library_lesson_id for l in links]
    completed_ids: set[int] = set()
    if current_user.academy_role == "student":
        rows = (
            db.query(LibraryLessonProgress.library_lesson_id)
            .filter(
                LibraryLessonProgress.student_id == current_user.id,
                LibraryLessonProgress.library_lesson_id.in_(lesson_ids),
                LibraryLessonProgress.completed.is_(True),
            )
            .all()
        )
        completed_ids = {r.library_lesson_id for r in rows}

    return [_to_out(link, completed=(link.library_lesson_id in completed_ids)) for link in links]


@router.post("/{module_id}/library-links", status_code=status.HTTP_201_CREATED, response_model=LibraryLinkOut)
def link_library_lesson(
    module_id: int,
    body: LibraryLinkIn,
    current_user: User = Depends(require_instructor),
    db: Session = Depends(get_db),
):
    module = db.get(Module, module_id)
    if module is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Module not found")

    lesson = db.get(LibraryLesson, body.library_lesson_id)
    if lesson is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Library lesson not found")

    existing = (
        db.query(ModuleLibraryLink)
        .filter_by(module_id=module_id, library_lesson_id=body.library_lesson_id)
        .first()
    )
    if existing:
        return _to_out(existing)

    link = ModuleLibraryLink(
        module_id=module_id,
        library_lesson_id=body.library_lesson_id,
        order_index=body.order_index,
    )
    try:
        db.add(link)
        db.commit()
        db.refresh(link)
    except sa_exc.IntegrityError:
        db.rollback()
        link = (
            db.query(ModuleLibraryLink)
            .filter_by(module_id=module_id, library_lesson_id=body.library_lesson_id)
            .first()
        )
    return _to_out(link)


@router.put("/{module_id}/library-links/{link_id}", response_model=LibraryLinkOut)
def update_library_link(
    module_id: int,
    link_id: int,
    body: LibraryLinkNoteIn,
    current_user: User = Depends(require_instructor),
    db: Session = Depends(get_db),
):
    link = db.get(ModuleLibraryLink, link_id)
    if link is None or link.module_id != module_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Link not found")
    link.instructor_note = body.instructor_note
    link.instructor_note_visible = body.instructor_note_visible
    db.commit()
    db.refresh(link)
    return _to_out(link)


@router.delete("/{module_id}/library-links/{link_id}", status_code=status.HTTP_204_NO_CONTENT)
def unlink_library_lesson(
    module_id: int,
    link_id: int,
    current_user: User = Depends(require_instructor),
    db: Session = Depends(get_db),
):
    link = db.get(ModuleLibraryLink, link_id)
    if link is None or link.module_id != module_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Link not found")
    db.delete(link)
    db.commit()


def _to_out(link: ModuleLibraryLink, completed: bool = False) -> LibraryLinkOut:
    return LibraryLinkOut(
        id=link.id,
        module_id=link.module_id,
        library_lesson_id=link.library_lesson_id,
        order_index=link.order_index,
        instructor_note=link.instructor_note,
        instructor_note_visible=link.instructor_note_visible,
        lesson_title=link.library_lesson.title,
        lesson_slug=link.library_lesson.slug,
        lesson_type=link.library_lesson.lesson_type,
        estimated_minutes=link.library_lesson.estimated_minutes,
        completed=completed,
    )
