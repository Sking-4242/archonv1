import uuid
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db import get_db
from app.dependencies.academy_auth import require_any_role, require_instructor
from app.models.academy import Assignment, Submission, User

router = APIRouter(prefix="/academy/assignments", tags=["academy-assignments"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class CriterionIn(BaseModel):
    label: str
    type: str
    params: dict[str, Any] = {}
    points: int


class AssignmentIn(BaseModel):
    title: str
    brief: str
    due_date: datetime | None = None
    rubric: list[CriterionIn] = []


class AssignmentOut(BaseModel):
    id: int
    title: str
    brief: str
    due_date: datetime | None
    rubric: list[dict]
    created_by: uuid.UUID
    submission_count: int = 0
    pending_review_count: int = 0

    model_config = {"from_attributes": True}


class StudentAssignmentOut(BaseModel):
    """Assignment as seen by a student — includes their submission status."""
    id: int
    title: str
    brief: str
    due_date: datetime | None
    rubric: list[dict]
    status: str = "not_started"
    score: int | None = None
    total_points: int | None = None

    model_config = {"from_attributes": True}


# ── Helpers ───────────────────────────────────────────────────────────────────

def _assignment_counts(db: Session, assignment_id: int) -> tuple[int, int]:
    subs = db.query(Submission).filter(Submission.assignment_id == assignment_id).all()
    pending = sum(1 for s in subs if s.instructor_score is None)
    return len(subs), pending


def _build_assignment_out(db: Session, assignment: Assignment) -> AssignmentOut:
    submission_count, pending_review = _assignment_counts(db, assignment.id)
    out = AssignmentOut.model_validate(assignment)
    out.submission_count = submission_count
    out.pending_review_count = pending_review
    return out


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("")
def list_assignments(
    current_user: User = Depends(require_any_role),
    db: Session = Depends(get_db),
):
    assignments = db.query(Assignment).all()

    if current_user.academy_role == "instructor":
        assignments = (
            db.query(Assignment)
            .filter(Assignment.created_by == current_user.id)
            .order_by(Assignment.created_at.desc())
            .all()
        )
        return [_build_assignment_out(db, a) for a in assignments]

    # Student view — include their submission status
    result = []
    for a in assignments:
        submission = (
            db.query(Submission)
            .filter(Submission.assignment_id == a.id, Submission.student_id == current_user.id)
            .order_by(Submission.submitted_at.desc())
            .first()
        )
        total_points = sum(int(c.get("points", 0)) for c in (a.rubric or []))
        if submission is None:
            s_status = "not_started"
            score = None
        elif submission.instructor_score is not None:
            s_status = "graded"
            score = submission.instructor_score
        else:
            s_status = "submitted"
            score = submission.automated_score

        result.append(StudentAssignmentOut(
            id=a.id,
            title=a.title,
            brief=a.brief,
            due_date=a.due_date,
            rubric=a.rubric or [],
            status=s_status,
            score=score,
            total_points=total_points,
        ))
    return result


@router.get("/{assignment_id}")
def get_assignment(
    assignment_id: int,
    current_user: User = Depends(require_any_role),
    db: Session = Depends(get_db),
):
    a = db.get(Assignment, assignment_id)
    if a is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")
    total_points = sum(int(c.get("points", 0)) for c in (a.rubric or []))

    if current_user.academy_role == "instructor":
        if a.created_by != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your assignment")
        return _build_assignment_out(db, a)

    submission = (
        db.query(Submission)
        .filter(Submission.assignment_id == a.id, Submission.student_id == current_user.id)
        .order_by(Submission.submitted_at.desc())
        .first()
    )
    if submission is None:
        s_status, score = "not_started", None
    elif submission.instructor_score is not None:
        s_status, score = "graded", submission.instructor_score
    else:
        s_status, score = "submitted", submission.automated_score

    return StudentAssignmentOut(
        id=a.id,
        title=a.title,
        brief=a.brief,
        due_date=a.due_date,
        rubric=a.rubric or [],
        status=s_status,
        score=score,
        total_points=total_points,
    )


@router.post("", status_code=status.HTTP_201_CREATED, response_model=AssignmentOut)
def create_assignment(
    body: AssignmentIn,
    current_user: User = Depends(require_instructor),
    db: Session = Depends(get_db),
):
    a = Assignment(
        title=body.title,
        brief=body.brief,
        due_date=body.due_date,
        created_by=current_user.id,
        rubric=[c.model_dump() for c in body.rubric],
    )
    db.add(a)
    db.commit()
    db.refresh(a)
    return _build_assignment_out(db, a)


@router.put("/{assignment_id}", response_model=AssignmentOut)
def update_assignment(
    assignment_id: int,
    body: AssignmentIn,
    current_user: User = Depends(require_instructor),
    db: Session = Depends(get_db),
):
    a = db.get(Assignment, assignment_id)
    if a is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")
    if a.created_by != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your assignment")
    a.title = body.title
    a.brief = body.brief
    a.due_date = body.due_date
    a.rubric = [c.model_dump() for c in body.rubric]
    db.commit()
    db.refresh(a)
    return _build_assignment_out(db, a)


@router.delete("/{assignment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_assignment(
    assignment_id: int,
    current_user: User = Depends(require_instructor),
    db: Session = Depends(get_db),
):
    a = db.get(Assignment, assignment_id)
    if a is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")
    if a.created_by != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your assignment")
    db.delete(a)
    db.commit()
