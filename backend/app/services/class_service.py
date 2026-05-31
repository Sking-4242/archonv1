"""Instructor class roster, content assignment, and progress aggregation."""

from __future__ import annotations

import secrets
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.models.academy import (
    Assignment,
    ClassAssignmentLink,
    ClassEnrollment,
    ClassModuleLink,
    InstructorClass,
    Lesson,
    LessonProgress,
    LibraryLessonProgress,
    Module,
    ModuleLibraryLink,
    PracticeTestAttempt,
    Submission,
    User,
)

AT_RISK_LESSON_PCT = 30
INACTIVE_DAYS = 14


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def generate_class_code(db: Session, length: int = 8) -> str:
    """Return a unique uppercase alphanumeric class join code."""
    for _ in range(20):
        code = secrets.token_hex(length // 2).upper()[:length]
        exists = db.query(InstructorClass.id).filter(InstructorClass.class_code == code).first()
        if not exists:
            return code
    raise RuntimeError("Could not generate unique class code")


def _student_display(user: User | None) -> str:
    if user is None:
        return ""
    return user.display_name or user.email


def _module_lesson_counts(db: Session, module_ids: list[int]) -> dict[int, int]:
    if not module_ids:
        return {}
    counts: dict[int, int] = {mid: 0 for mid in module_ids}
    lesson_rows = (
        db.query(Lesson.module_id)
        .filter(Lesson.module_id.in_(module_ids))
        .all()
    )
    for (module_id,) in lesson_rows:
        counts[module_id] = counts.get(module_id, 0) + 1
    link_rows = (
        db.query(ModuleLibraryLink.module_id)
        .filter(ModuleLibraryLink.module_id.in_(module_ids))
        .all()
    )
    for (module_id,) in link_rows:
        counts[module_id] = counts.get(module_id, 0) + 1
    return counts


def _student_completed_lessons(
    db: Session,
    student_id: uuid.UUID,
    module_ids: list[int],
) -> int:
    if not module_ids:
        return 0
    lesson_ids = [
        row[0]
        for row in db.query(Lesson.id).filter(Lesson.module_id.in_(module_ids)).all()
    ]
    lib_ids = [
        row[0]
        for row in db.query(ModuleLibraryLink.library_lesson_id)
        .filter(ModuleLibraryLink.module_id.in_(module_ids))
        .all()
    ]
    completed = 0
    if lesson_ids:
        completed += (
            db.query(LessonProgress)
            .filter(
                LessonProgress.student_id == student_id,
                LessonProgress.lesson_id.in_(lesson_ids),
            )
            .count()
        )
    if lib_ids:
        completed += (
            db.query(LibraryLessonProgress)
            .filter(
                LibraryLessonProgress.student_id == student_id,
                LibraryLessonProgress.library_lesson_id.in_(lib_ids),
            )
            .count()
        )
    return completed


def _student_last_activity(
    db: Session,
    student_id: uuid.UUID,
    assignment_ids: list[int],
) -> datetime | None:
    timestamps: list[datetime] = []

    lp = (
        db.query(LessonProgress.completed_at)
        .filter(LessonProgress.student_id == student_id)
        .order_by(LessonProgress.completed_at.desc())
        .first()
    )
    if lp:
        timestamps.append(lp[0])

    llp = (
        db.query(LibraryLessonProgress.completed_at)
        .filter(LibraryLessonProgress.student_id == student_id)
        .order_by(LibraryLessonProgress.completed_at.desc())
        .first()
    )
    if llp:
        timestamps.append(llp[0])

    if assignment_ids:
        sub = (
            db.query(Submission.submitted_at)
            .filter(
                Submission.student_id == student_id,
                Submission.assignment_id.in_(assignment_ids),
            )
            .order_by(Submission.submitted_at.desc())
            .first()
        )
        if sub:
            timestamps.append(sub[0])

    pt = (
        db.query(PracticeTestAttempt.started_at)
        .filter(PracticeTestAttempt.student_id == student_id)
        .order_by(PracticeTestAttempt.started_at.desc())
        .first()
    )
    if pt:
        timestamps.append(pt[0])

    return max(timestamps) if timestamps else None


def _is_at_risk(
    *,
    lesson_pct: int,
    overdue_missing: int,
    last_activity: datetime | None,
    now: datetime,
) -> bool:
    if lesson_pct < AT_RISK_LESSON_PCT:
        return True
    if overdue_missing > 0:
        return True
    if last_activity is None:
        return True
    if last_activity < now - timedelta(days=INACTIVE_DAYS):
        return True
    return False


def compute_student_progress(
    db: Session,
    instructor_class: InstructorClass,
    student_id: uuid.UUID,
) -> dict:
    module_ids = [link.module_id for link in instructor_class.module_links]
    assignment_ids = [link.assignment_id for link in instructor_class.assignment_links]

    lesson_totals = _module_lesson_counts(db, module_ids)
    total_lessons = sum(lesson_totals.values())
    completed_lessons = _student_completed_lessons(db, student_id, module_ids)
    lesson_pct = round(completed_lessons / total_lessons * 100) if total_lessons else 0

    submissions = []
    if assignment_ids:
        submissions = (
            db.query(Submission)
            .filter(
                Submission.student_id == student_id,
                Submission.assignment_id.in_(assignment_ids),
            )
            .all()
        )

    submitted_assignment_ids = {s.assignment_id for s in submissions}
    now = _utcnow()
    overdue_missing = 0
    for link in instructor_class.assignment_links:
        due = link.due_date
        if due and due < now and link.assignment_id not in submitted_assignment_ids:
            overdue_missing += 1

    graded_scores: list[int] = []
    pending_review = 0
    for sub in submissions:
        if sub.instructor_score is None:
            pending_review += 1
        score = sub.instructor_score if sub.instructor_score is not None else sub.automated_score
        if score is not None and sub.total_points:
            graded_scores.append(round(score / sub.total_points * 100))

    last_activity = _student_last_activity(db, student_id, assignment_ids)
    at_risk = _is_at_risk(
        lesson_pct=lesson_pct,
        overdue_missing=overdue_missing,
        last_activity=last_activity,
        now=now,
    )

    practice_attempts = (
        db.query(PracticeTestAttempt)
        .filter(
            PracticeTestAttempt.student_id == student_id,
            PracticeTestAttempt.status == "completed",
        )
        .order_by(PracticeTestAttempt.completed_at.desc())
        .limit(5)
        .all()
    )

    return {
        "student_id": str(student_id),
        "lessons_completed": completed_lessons,
        "lessons_total": total_lessons,
        "lesson_completion_pct": lesson_pct,
        "assignments_submitted": len(submitted_assignment_ids),
        "assignments_total": len(assignment_ids),
        "overdue_assignments": overdue_missing,
        "pending_review": pending_review,
        "avg_score_pct": round(sum(graded_scores) / len(graded_scores)) if graded_scores else None,
        "last_activity": last_activity.isoformat() if last_activity else None,
        "at_risk": at_risk,
        "recent_practice_tests": [
            {
                "cert": a.cert,
                "test_number": a.test_number,
                "percent": a.percent,
                "passed": a.passed,
                "completed_at": a.completed_at.isoformat() if a.completed_at else None,
            }
            for a in practice_attempts
        ],
    }


def compute_class_progress(db: Session, instructor_class: InstructorClass) -> dict:
    enrollments = instructor_class.enrollments
    students = []
    at_risk_count = 0
    for enrollment in enrollments:
        student = enrollment.student
        progress = compute_student_progress(db, instructor_class, enrollment.student_id)
        if progress["at_risk"]:
            at_risk_count += 1
        students.append(
            {
                "student_id": str(enrollment.student_id),
                "student_name": _student_display(student),
                "student_email": student.email if student else "",
                "enrolled_at": enrollment.enrolled_at.isoformat(),
                "is_graduating": enrollment.is_graduating,
                **progress,
            }
        )

    assignment_ids = [link.assignment_id for link in instructor_class.assignment_links]
    pending_review = 0
    score_pcts: list[int] = []
    if assignment_ids:
        subs = (
            db.query(Submission)
            .filter(Submission.assignment_id.in_(assignment_ids))
            .all()
        )
        for sub in subs:
            if sub.instructor_score is None:
                pending_review += 1
            score = sub.instructor_score if sub.instructor_score is not None else sub.automated_score
            if score is not None and sub.total_points:
                score_pcts.append(round(score / sub.total_points * 100))

    return {
        "class_id": instructor_class.id,
        "student_count": len(enrollments),
        "at_risk_count": at_risk_count,
        "pending_review": pending_review,
        "avg_score_pct": round(sum(score_pcts) / len(score_pcts)) if score_pcts else None,
        "students": sorted(students, key=lambda s: s["student_name"].lower()),
    }


def instructor_dashboard(db: Session, instructor_id: uuid.UUID) -> dict:
    classes = (
        db.query(InstructorClass)
        .filter(
            InstructorClass.instructor_id == instructor_id,
            InstructorClass.is_active.is_(True),
        )
        .order_by(InstructorClass.created_at.desc())
        .all()
    )

    total_students = 0
    total_at_risk = 0
    total_pending = 0
    all_scores: list[int] = []
    class_summaries = []

    for cls in classes:
        progress = compute_class_progress(db, cls)
        total_students += progress["student_count"]
        total_at_risk += progress["at_risk_count"]
        total_pending += progress["pending_review"]
        if progress["avg_score_pct"] is not None:
            all_scores.append(progress["avg_score_pct"])
        class_summaries.append(
            {
                "id": cls.id,
                "name": cls.name,
                "class_code": cls.class_code,
                "course": cls.course,
                "student_count": progress["student_count"],
                "at_risk_count": progress["at_risk_count"],
                "pending_review": progress["pending_review"],
                "module_count": len(cls.module_links),
                "assignment_count": len(cls.assignment_links),
            }
        )

    owned_ids = [
        row[0]
        for row in db.query(Assignment.id).filter(Assignment.created_by == instructor_id).all()
    ]
    if owned_ids:
        owned_pending = (
            db.query(Submission)
            .filter(
                Submission.assignment_id.in_(owned_ids),
                Submission.instructor_score.is_(None),
            )
            .count()
        )
        total_pending = max(total_pending, owned_pending)

    return {
        "class_count": len(classes),
        "student_count": total_students,
        "at_risk_count": total_at_risk,
        "pending_review": total_pending,
        "avg_score_pct": round(sum(all_scores) / len(all_scores)) if all_scores else None,
        "classes": class_summaries,
    }
