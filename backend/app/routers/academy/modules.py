from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db import get_db
from app.dependencies.academy_auth import require_any_role, require_instructor
from app.models.academy import Assignment, Lesson, LessonProgress, Module, ModuleAssignment, User

router = APIRouter(prefix="/academy/modules", tags=["academy-modules"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class ModuleIn(BaseModel):
    title: str
    description: str = ""
    order_index: int = 0
    difficulty_level: str = "beginner"
    certification_tags: list[str] = []
    is_published: bool = False


class ModuleReorderIn(BaseModel):
    items: list[dict]


class LessonSummary(BaseModel):
    id: int
    title: str
    estimated_minutes: int
    order_index: int
    lesson_type: str = "content"
    completed: bool = False

    model_config = {"from_attributes": True}


class AssignmentSummary(BaseModel):
    id: int
    title: str
    order_index: int

    model_config = {"from_attributes": True}


class ModuleOut(BaseModel):
    id: int
    title: str
    description: str
    order_index: int
    difficulty_level: str
    certification_tags: list
    is_published: bool
    created_by: int
    created_at: datetime
    lesson_count: int = 0
    completed_lesson_count: int = 0
    assignment_count: int = 0

    model_config = {"from_attributes": True}


class ModuleDetailOut(ModuleOut):
    lessons: list[LessonSummary] = []
    assignments: list[AssignmentSummary] = []


class LinkAssignmentIn(BaseModel):
    assignment_id: int
    order_index: int = 0


class LessonReorderIn(BaseModel):
    items: list[dict]


# ── Helpers ───────────────────────────────────────────────────────────────────

def _completed_ids(db: Session, student_id: int, lesson_ids: list[int]) -> set[int]:
    if not lesson_ids:
        return set()
    rows = (
        db.query(LessonProgress.lesson_id)
        .filter(
            LessonProgress.student_id == student_id,
            LessonProgress.lesson_id.in_(lesson_ids),
        )
        .all()
    )
    return {r.lesson_id for r in rows}


def _build_module_out(module: Module, completed: set[int]) -> ModuleOut:
    lesson_ids = [l.id for l in module.lessons]
    completed_count = sum(1 for lid in lesson_ids if lid in completed)
    return ModuleOut(
        id=module.id,
        title=module.title,
        description=module.description,
        order_index=module.order_index,
        difficulty_level=module.difficulty_level,
        certification_tags=module.certification_tags or [],
        is_published=module.is_published,
        created_by=module.created_by,
        created_at=module.created_at,
        lesson_count=len(lesson_ids),
        completed_lesson_count=completed_count,
        assignment_count=len(module.assignment_links),
    )


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("")
def list_modules(
    course: Optional[str] = Query(None, description="Filter by course: aws | azure | gcp"),
    current_user: User = Depends(require_any_role),
    db: Session = Depends(get_db),
):
    query = db.query(Module).order_by(Module.order_index)
    if current_user.role == "student":
        query = query.filter(Module.is_published.is_(True))
    if course:
        query = query.filter(Module.course == course)
    modules = query.all()

    all_lesson_ids = [l.id for m in modules for l in m.lessons]
    if current_user.role == "student":
        completed = _completed_ids(db, current_user.id, all_lesson_ids)
    else:
        completed = set()

    return [_build_module_out(m, completed) for m in modules]


@router.get("/{module_id}")
def get_module(
    module_id: int,
    current_user: User = Depends(require_any_role),
    db: Session = Depends(get_db),
):
    module = db.get(Module, module_id)
    if module is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Module not found")
    if current_user.role == "student" and not module.is_published:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Module not found")

    lesson_ids = [l.id for l in module.lessons]
    if current_user.role == "student":
        completed = _completed_ids(db, current_user.id, lesson_ids)
    else:
        completed = set()

    lessons = [
        LessonSummary(
            id=l.id,
            title=l.title,
            estimated_minutes=l.estimated_minutes,
            order_index=l.order_index,
            lesson_type=getattr(l, "lesson_type", "content"),
            completed=(l.id in completed),
        )
        for l in module.lessons
    ]

    assignments = [
        AssignmentSummary(
            id=link.assignment_id,
            title=link.assignment.title,
            order_index=link.order_index,
        )
        for link in sorted(module.assignment_links, key=lambda x: x.order_index)
    ]

    base = _build_module_out(module, completed)
    return ModuleDetailOut(
        **base.model_dump(),
        lessons=lessons,
        assignments=assignments,
    )


@router.post("", status_code=status.HTTP_201_CREATED, response_model=ModuleOut)
def create_module(
    body: ModuleIn,
    current_user: User = Depends(require_instructor),
    db: Session = Depends(get_db),
):
    module = Module(
        title=body.title,
        description=body.description,
        order_index=body.order_index,
        difficulty_level=body.difficulty_level,
        certification_tags=body.certification_tags,
        is_published=body.is_published,
        created_by=current_user.id,
    )
    db.add(module)
    db.commit()
    db.refresh(module)
    return _build_module_out(module, set())


@router.put("/{module_id}", response_model=ModuleOut)
def update_module(
    module_id: int,
    body: ModuleIn,
    current_user: User = Depends(require_instructor),
    db: Session = Depends(get_db),
):
    module = db.get(Module, module_id)
    if module is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Module not found")
    module.title = body.title
    module.description = body.description
    module.order_index = body.order_index
    module.difficulty_level = body.difficulty_level
    module.certification_tags = body.certification_tags
    module.is_published = body.is_published
    db.commit()
    db.refresh(module)
    return _build_module_out(module, set())


@router.post("/reorder", status_code=status.HTTP_204_NO_CONTENT)
def reorder_modules(
    body: ModuleReorderIn,
    current_user: User = Depends(require_instructor),
    db: Session = Depends(get_db),
):
    for item in body.items:
        module = db.get(Module, item["id"])
        if module:
            module.order_index = item["order_index"]
    db.commit()


@router.delete("/{module_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_module(
    module_id: int,
    current_user: User = Depends(require_instructor),
    db: Session = Depends(get_db),
):
    module = db.get(Module, module_id)
    if module is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Module not found")
    db.delete(module)
    db.commit()


@router.post("/{module_id}/assignments", status_code=status.HTTP_201_CREATED)
def link_assignment(
    module_id: int,
    body: LinkAssignmentIn,
    current_user: User = Depends(require_instructor),
    db: Session = Depends(get_db),
):
    module = db.get(Module, module_id)
    if module is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Module not found")
    assignment = db.get(Assignment, body.assignment_id)
    if assignment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")
    existing = (
        db.query(ModuleAssignment)
        .filter_by(module_id=module_id, assignment_id=body.assignment_id)
        .first()
    )
    if existing:
        return {"id": existing.id, "module_id": module_id, "assignment_id": body.assignment_id}
    link = ModuleAssignment(
        module_id=module_id,
        assignment_id=body.assignment_id,
        order_index=body.order_index,
    )
    db.add(link)
    db.commit()
    db.refresh(link)
    return {"id": link.id, "module_id": module_id, "assignment_id": body.assignment_id}


@router.delete("/{module_id}/assignments/{assignment_id}", status_code=status.HTTP_204_NO_CONTENT)
def unlink_assignment(
    module_id: int,
    assignment_id: int,
    current_user: User = Depends(require_instructor),
    db: Session = Depends(get_db),
):
    link = (
        db.query(ModuleAssignment)
        .filter_by(module_id=module_id, assignment_id=assignment_id)
        .first()
    )
    if link:
        db.delete(link)
        db.commit()


@router.post("/{module_id}/lessons/reorder", status_code=status.HTTP_204_NO_CONTENT)
def reorder_lessons(
    module_id: int,
    body: LessonReorderIn,
    current_user: User = Depends(require_instructor),
    db: Session = Depends(get_db),
):
    for item in body.items:
        lesson = db.get(Lesson, item["id"])
        if lesson and lesson.module_id == module_id:
            lesson.order_index = item["order_index"]
    db.commit()
