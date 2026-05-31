from datetime import datetime, timezone
from typing import Any, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.db import get_db
from app.dependencies.academy_auth import require_student
from app.models.academy import PracticeTestAttempt, User
from app.services.access_service import resolve_access
from app.services.practice_test_service import (
    CERT_CATALOG,
    build_feedback,
    can_access_test,
    grade_attempt,
    list_catalog,
    prepare_question_set,
    questions_by_ids,
    sanitize_question,
    time_limit_seconds,
)

router = APIRouter(prefix="/academy/practice-tests", tags=["academy-practice-tests"])


class StartAttemptIn(BaseModel):
    cert: str = "aws-cp"
    test_number: int = Field(ge=1, le=10)
    mode: Literal["study", "live"] = "study"


class SaveAnswerIn(BaseModel):
    question_id: str
    answer: Any


class CheckAnswerIn(BaseModel):
    question_id: str
    answer: Any


class SubmitAttemptIn(BaseModel):
    answers: Optional[dict[str, Any]] = None
    time_spent_seconds: Optional[int] = None


def _user_features(db: Session, user: User) -> dict[str, bool]:
    access = resolve_access(db, user)
    return access.features


def _require_test_access(db: Session, user: User, cert: str, test_number: int) -> None:
    if cert not in CERT_CATALOG:
        raise HTTPException(status_code=404, detail="Certification not found")
    features = _user_features(db, user)
    if not can_access_test(features, cert, test_number):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This practice test requires an Academy license",
        )


def _attempt_out(attempt: PracticeTestAttempt, *, include_results: bool = False) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "id": attempt.id,
        "cert": attempt.cert,
        "test_number": attempt.test_number,
        "mode": attempt.mode,
        "status": attempt.status,
        "question_count": len(attempt.question_ids or []),
        "time_limit_seconds": attempt.time_limit_seconds,
        "time_spent_seconds": attempt.time_spent_seconds,
        "started_at": attempt.started_at,
        "completed_at": attempt.completed_at,
        "score": attempt.score,
        "total": attempt.total,
        "percent": attempt.percent,
        "passed": attempt.passed,
    }
    if include_results and attempt.status == "completed":
        payload["domain_breakdown"] = attempt.domain_breakdown or []
        payload["recommendations"] = attempt.recommendations or []
        payload["per_question"] = attempt.per_question or []
    return payload


@router.get("/catalog")
def practice_test_catalog(
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db),
):
    features = _user_features(db, current_user)
    certs = []
    for cert in CERT_CATALOG:
        catalog = list_catalog(cert)
        tests = []
        for test in catalog["available_tests"]:
            tests.append(
                {
                    **test,
                    "accessible": can_access_test(features, cert, test["test_number"]),
                }
            )
        certs.append({**catalog, "available_tests": tests})
    return {"certs": certs}


@router.get("/attempts")
def list_attempts(
    cert: Optional[str] = None,
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db),
):
    query = (
        db.query(PracticeTestAttempt)
        .filter(PracticeTestAttempt.student_id == current_user.id)
        .order_by(PracticeTestAttempt.started_at.desc())
    )
    if cert:
        query = query.filter(PracticeTestAttempt.cert == cert)
    attempts = query.limit(50).all()
    return [_attempt_out(a, include_results=a.status == "completed") for a in attempts]


@router.post("/attempts/start")
def start_attempt(
    body: StartAttemptIn,
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db),
):
    _require_test_access(db, current_user, body.cert, body.test_number)

    questions = prepare_question_set(body.cert, body.test_number)
    if not questions:
        raise HTTPException(status_code=404, detail="No questions available for this test")

    attempt = PracticeTestAttempt(
        student_id=current_user.id,
        cert=body.cert,
        test_number=body.test_number,
        mode=body.mode,
        question_ids=[q["id"] for q in questions],
        answers={},
        time_limit_seconds=time_limit_seconds(body.test_number, len(questions)),
        status="in_progress",
        started_at=datetime.now(timezone.utc),
    )
    db.add(attempt)
    db.commit()
    db.refresh(attempt)

    return {
        "attempt": _attempt_out(attempt),
        "questions": [sanitize_question(q) for q in questions],
    }


@router.get("/attempts/{attempt_id}")
def get_attempt(
    attempt_id: int,
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db),
):
    attempt = _get_owned_attempt(db, attempt_id, current_user)
    questions = questions_by_ids(attempt.cert, attempt.question_ids or [])
    payload = {
        "attempt": _attempt_out(attempt, include_results=attempt.status == "completed"),
        "questions": [sanitize_question(q) for q in questions],
        "answers": attempt.answers or {},
    }
    if attempt.status == "completed":
        payload["results"] = {
            "domain_breakdown": attempt.domain_breakdown or [],
            "recommendations": attempt.recommendations or [],
            "per_question": attempt.per_question or [],
        }
    return payload


@router.put("/attempts/{attempt_id}/answer")
def save_answer(
    attempt_id: int,
    body: SaveAnswerIn,
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db),
):
    attempt = _get_owned_attempt(db, attempt_id, current_user, require_in_progress=True)
    answers = dict(attempt.answers or {})
    answers[body.question_id] = body.answer
    attempt.answers = answers
    db.commit()
    return {"saved": True, "answers": attempt.answers}


@router.post("/attempts/{attempt_id}/check")
def check_answer(
    attempt_id: int,
    body: CheckAnswerIn,
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db),
):
    attempt = _get_owned_attempt(db, attempt_id, current_user, require_in_progress=True)
    if attempt.mode != "study":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Answer feedback is only available in study mode",
        )

    questions = {q["id"]: q for q in questions_by_ids(attempt.cert, attempt.question_ids or [])}
    question = questions.get(body.question_id)
    if not question:
        raise HTTPException(status_code=404, detail="Question not found in this attempt")

    answers = dict(attempt.answers or {})
    answers[body.question_id] = body.answer
    attempt.answers = answers
    db.commit()

    return build_feedback(question, body.answer)


@router.post("/attempts/{attempt_id}/submit")
def submit_attempt(
    attempt_id: int,
    body: SubmitAttemptIn,
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db),
):
    attempt = _get_owned_attempt(db, attempt_id, current_user, require_in_progress=True)
    questions = questions_by_ids(attempt.cert, attempt.question_ids or [])
    if not questions:
        raise HTTPException(status_code=404, detail="Attempt has no questions")

    answers = dict(attempt.answers or {})
    if body.answers:
        answers.update(body.answers)
    attempt.answers = answers

    meta = CERT_CATALOG.get(attempt.cert, {})
    results = grade_attempt(
        questions,
        answers,
        pass_threshold_pct=meta.get("pass_threshold_pct", 70),
    )

    attempt.score = results["score"]
    attempt.total = results["total"]
    attempt.percent = results["percent"]
    attempt.passed = results["passed"]
    attempt.domain_breakdown = results["domain_breakdown"]
    attempt.recommendations = results["recommendations"]
    attempt.per_question = results["per_question"]
    attempt.time_spent_seconds = body.time_spent_seconds
    attempt.status = "completed"
    attempt.completed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(attempt)

    return {
        "attempt": _attempt_out(attempt, include_results=True),
        "results": results,
    }


def _get_owned_attempt(
    db: Session,
    attempt_id: int,
    user: User,
    *,
    require_in_progress: bool = False,
) -> PracticeTestAttempt:
    attempt = db.get(PracticeTestAttempt, attempt_id)
    if not attempt or attempt.student_id != user.id:
        raise HTTPException(status_code=404, detail="Attempt not found")
    if require_in_progress and attempt.status != "in_progress":
        raise HTTPException(status_code=400, detail="Attempt is already completed")
    return attempt
