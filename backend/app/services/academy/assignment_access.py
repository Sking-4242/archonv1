"""Assignment visibility rules for students and instructors."""

import uuid

from sqlalchemy.orm import Session

from app.models.academy import Assignment, ClassEnrollment


def student_assigned_assignment_ids(db: Session, student_id: uuid.UUID) -> set[int]:
    enrollments = (
        db.query(ClassEnrollment)
        .filter(ClassEnrollment.student_id == student_id)
        .all()
    )
    ids: set[int] = set()
    for enrollment in enrollments:
        cls = enrollment.instructor_class
        if cls is None or not cls.is_active:
            continue
        for link in cls.assignment_links:
            ids.add(link.assignment_id)
    return ids


def student_can_access(db: Session, assignment: Assignment, student_id: uuid.UUID) -> bool:
    if assignment.is_library:
        return True
    return assignment.id in student_assigned_assignment_ids(db, student_id)
