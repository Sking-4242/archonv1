from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db import get_db
from app.dependencies.academy_auth import require_instructor, require_student, require_any_role
from app.models.academy import Assignment, Submission, User
from app.services.academy.grader import grade

router = APIRouter(prefix="/academy/submissions", tags=["academy-submissions"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class SubmitRequest(BaseModel):
    assignment_id: int
    graph: dict


class CriterionResult(BaseModel):
    label: str
    passed: bool
    points: int
    message: str


class SubmissionOut(BaseModel):
    id: int
    assignment_id: int
    assignment_title: str = ""
    student_id: int
    student_name: str = ""
    automated_score: int
    total_points: int
    criteria_results: list[dict]
    instructor_score: int | None
    instructor_feedback: str | None
    submitted_at: datetime

    model_config = {"from_attributes": True}


class GradeRequest(BaseModel):
    score: int
    feedback: str | None = None


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("", status_code=status.HTTP_201_CREATED)
def submit(
    body: SubmitRequest,
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db),
):
    assignment = db.get(Assignment, body.assignment_id)
    if assignment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")

    earned, total, results = grade(body.graph, assignment.rubric or [])

    submission = Submission(
        assignment_id=body.assignment_id,
        student_id=current_user.id,
        graph=body.graph,
        automated_score=earned,
        total_points=total,
        criteria_results=results,
    )
    db.add(submission)
    db.commit()
    db.refresh(submission)

    return _serialize(submission, db)


@router.get("")
def list_submissions(
    assignment_id: int = Query(...),
    current_user: User = Depends(require_instructor),
    db: Session = Depends(get_db),
):
    subs = (
        db.query(Submission)
        .filter(Submission.assignment_id == assignment_id)
        .order_by(Submission.submitted_at.desc())
        .all()
    )
    return [_serialize(s, db) for s in subs]


@router.get("/{submission_id}")
def get_submission(
    submission_id: int,
    current_user: User = Depends(require_any_role),
    db: Session = Depends(get_db),
):
    sub = db.get(Submission, submission_id)
    if sub is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")

    # Students can only view their own submissions
    if current_user.role == "student" and sub.student_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your submission")

    return _serialize(sub, db)


@router.patch("/{submission_id}/grade")
def grade_submission(
    submission_id: int,
    body: GradeRequest,
    current_user: User = Depends(require_instructor),
    db: Session = Depends(get_db),
):
    sub = db.get(Submission, submission_id)
    if sub is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")

    if body.score < 0 or body.score > sub.total_points:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Score must be between 0 and {sub.total_points}",
        )

    sub.instructor_score = body.score
    sub.instructor_feedback = body.feedback
    db.commit()
    db.refresh(sub)
    return _serialize(sub, db)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _serialize(sub: Submission, db: Session) -> dict:
    assignment = db.get(Assignment, sub.assignment_id)
    student = db.get(User, sub.student_id)
    return {
        "id": sub.id,
        "assignment_id": sub.assignment_id,
        "assignment_title": assignment.title if assignment else "",
        "student_id": sub.student_id,
        "student_name": student.name if student else "",
        "automated_score": sub.automated_score,
        "total_points": sub.total_points,
        "criteria_results": sub.criteria_results or [],
        "instructor_score": sub.instructor_score,
        "instructor_feedback": sub.instructor_feedback,
        "submitted_at": sub.submitted_at.isoformat(),
    }
