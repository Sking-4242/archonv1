from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db import get_db
from app.dependencies.academy_auth import require_any_role
from app.models.academy import LessonNote, User

router = APIRouter(prefix="/academy/notes", tags=["academy-notes"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class NoteIn(BaseModel):
    lesson_id: Optional[int] = None
    library_lesson_id: Optional[int] = None
    content: str
    is_visible: bool = False


class NoteOut(BaseModel):
    id: int
    user_id: str
    lesson_id: Optional[int]
    library_lesson_id: Optional[int]
    content: str
    is_visible: bool
    author_name: str
    author_role: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("", response_model=list[NoteOut])
def list_notes(
    lesson_id: Optional[int] = Query(None),
    library_lesson_id: Optional[int] = Query(None),
    current_user: User = Depends(require_any_role),
    db: Session = Depends(get_db),
):
    """
    Return notes visible to the current user for a given lesson.

    Rules:
    - Always return the current user's own notes.
    - Also return instructor notes that are toggled visible (is_visible=True).
      While class enrollment is not yet implemented, visible instructor notes
      are shown to all users.
    """
    if lesson_id is None and library_lesson_id is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Provide lesson_id or library_lesson_id",
        )

    q = db.query(LessonNote)
    if lesson_id is not None:
        q = q.filter(LessonNote.lesson_id == lesson_id)
    else:
        q = q.filter(LessonNote.library_lesson_id == library_lesson_id)

    notes = q.all()

    visible = []
    for note in notes:
        is_mine = note.user_id == current_user.id
        is_visible_instructor = note.author.academy_role == "instructor" and note.is_visible
        if is_mine or is_visible_instructor:
            visible.append(_to_out(note))

    return visible


@router.post("", status_code=status.HTTP_201_CREATED, response_model=NoteOut)
def create_note(
    body: NoteIn,
    current_user: User = Depends(require_any_role),
    db: Session = Depends(get_db),
):
    if body.lesson_id is None and body.library_lesson_id is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Provide lesson_id or library_lesson_id",
        )
    note = LessonNote(
        user_id=current_user.id,
        lesson_id=body.lesson_id,
        library_lesson_id=body.library_lesson_id,
        content=body.content,
        is_visible=body.is_visible,
    )
    db.add(note)
    db.commit()
    db.refresh(note)
    return _to_out(note)


@router.put("/{note_id}", response_model=NoteOut)
def update_note(
    note_id: int,
    body: NoteIn,
    current_user: User = Depends(require_any_role),
    db: Session = Depends(get_db),
):
    note = db.get(LessonNote, note_id)
    if note is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")
    if note.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your note")
    note.content = body.content
    note.is_visible = body.is_visible
    db.commit()
    db.refresh(note)
    return _to_out(note)


@router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_note(
    note_id: int,
    current_user: User = Depends(require_any_role),
    db: Session = Depends(get_db),
):
    note = db.get(LessonNote, note_id)
    if note is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")
    if note.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your note")
    db.delete(note)
    db.commit()


def _to_out(note: LessonNote) -> NoteOut:
    return NoteOut(
        id=note.id,
        user_id=str(note.user_id),
        lesson_id=note.lesson_id,
        library_lesson_id=note.library_lesson_id,
        content=note.content,
        is_visible=note.is_visible,
        author_name=note.author.display_name or note.author.email,
        author_role=note.author.academy_role,
        created_at=note.created_at,
        updated_at=note.updated_at,
    )
