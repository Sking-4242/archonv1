import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session, joinedload

from app.db import get_db
from app.dependencies.academy_auth import require_instructor, require_student
from app.models.academy import (
    Assignment,
    ClassAssignmentLink,
    ClassEnrollment,
    ClassModuleLink,
    InstructorClass,
    Module,
    User,
)
from app.services.class_service import (
    _utcnow,
    compute_class_progress,
    compute_student_progress,
    generate_class_code,
    instructor_dashboard,
)

router = APIRouter(prefix="/academy/classes", tags=["academy-classes"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class ClassIn(BaseModel):
    name: str
    description: str = ""
    course: str = "aws"


class ClassUpdateIn(BaseModel):
    name: str | None = None
    description: str | None = None
    course: str | None = None
    is_active: bool | None = None


class ClassOut(BaseModel):
    id: int
    name: str
    description: str
    class_code: str
    course: str
    is_active: bool
    created_at: datetime
    student_count: int = 0
    module_count: int = 0
    assignment_count: int = 0
    at_risk_count: int = 0
    pending_review: int = 0

    model_config = {"from_attributes": True}


class EnrollIn(BaseModel):
    email: str


class BulkEnrollIn(BaseModel):
    emails: list[str] = Field(default_factory=list)


class AssignContentIn(BaseModel):
    due_date: datetime | None = None


class JoinClassIn(BaseModel):
    class_code: str


class GraduatingUpdateIn(BaseModel):
    is_graduating: bool


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_owned_class(db: Session, class_id: int, instructor_id: uuid.UUID) -> InstructorClass:
    cls = (
        db.query(InstructorClass)
        .options(
            joinedload(InstructorClass.enrollments).joinedload(ClassEnrollment.student),
            joinedload(InstructorClass.assignment_links).joinedload(ClassAssignmentLink.assignment),
            joinedload(InstructorClass.module_links).joinedload(ClassModuleLink.module),
        )
        .filter(InstructorClass.id == class_id, InstructorClass.instructor_id == instructor_id)
        .first()
    )
    if cls is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class not found")
    return cls


def _serialize_class(cls: InstructorClass, db: Session) -> ClassOut:
    progress = compute_class_progress(db, cls)
    return ClassOut(
        id=cls.id,
        name=cls.name,
        description=cls.description,
        class_code=cls.class_code,
        course=cls.course,
        is_active=cls.is_active,
        created_at=cls.created_at,
        student_count=progress["student_count"],
        module_count=len(cls.module_links),
        assignment_count=len(cls.assignment_links),
        at_risk_count=progress["at_risk_count"],
        pending_review=progress["pending_review"],
    )


def _find_student_by_email(db: Session, email: str) -> User:
    user = db.query(User).filter(User.email == email.strip().lower()).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No account found for {email}",
        )
    if user.academy_role != "student":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{email} is not a student account",
        )
    return user


# ── Instructor routes ─────────────────────────────────────────────────────────

@router.get("/dashboard")
def get_dashboard(
    current_user: User = Depends(require_instructor),
    db: Session = Depends(get_db),
):
    return instructor_dashboard(db, current_user.id)


# ── Student routes (before /{class_id} to avoid path conflicts) ───────────────

@router.get("/my/enrolled")
def my_classes(
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db),
):
    enrollments = (
        db.query(ClassEnrollment)
        .options(
            joinedload(ClassEnrollment.instructor_class).joinedload(InstructorClass.instructor),
        )
        .filter(ClassEnrollment.student_id == current_user.id)
        .all()
    )
    return [
        {
            "id": e.instructor_class.id,
            "name": e.instructor_class.name,
            "course": e.instructor_class.course,
            "instructor_name": (
                e.instructor_class.instructor.display_name
                or e.instructor_class.instructor.email
                if e.instructor_class.instructor
                else ""
            ),
            "enrolled_at": e.enrolled_at.isoformat(),
        }
        for e in enrollments
        if e.instructor_class and e.instructor_class.is_active
    ]


@router.post("/join")
def join_class(
    body: JoinClassIn,
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db),
):
    code = body.class_code.strip().upper()
    cls = (
        db.query(InstructorClass)
        .filter(InstructorClass.class_code == code, InstructorClass.is_active.is_(True))
        .first()
    )
    if cls is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invalid class code")
    existing = (
        db.query(ClassEnrollment)
        .filter(ClassEnrollment.class_id == cls.id, ClassEnrollment.student_id == current_user.id)
        .first()
    )
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Already enrolled in this class")
    db.add(ClassEnrollment(class_id=cls.id, student_id=current_user.id))
    db.commit()
    return {"class_id": cls.id, "name": cls.name}


@router.get("")
def list_classes(
    current_user: User = Depends(require_instructor),
    db: Session = Depends(get_db),
):
    classes = (
        db.query(InstructorClass)
        .options(
            joinedload(InstructorClass.enrollments),
            joinedload(InstructorClass.assignment_links),
            joinedload(InstructorClass.module_links),
        )
        .filter(InstructorClass.instructor_id == current_user.id)
        .order_by(InstructorClass.created_at.desc())
        .all()
    )
    return [_serialize_class(c, db) for c in classes]


@router.post("", status_code=status.HTTP_201_CREATED, response_model=ClassOut)
def create_class(
    body: ClassIn,
    current_user: User = Depends(require_instructor),
    db: Session = Depends(get_db),
):
    cls = InstructorClass(
        name=body.name.strip(),
        description=body.description.strip(),
        course=body.course,
        class_code=generate_class_code(db),
        instructor_id=current_user.id,
    )
    db.add(cls)
    db.commit()
    db.refresh(cls)
    return _serialize_class(cls, db)


@router.get("/{class_id}", response_model=ClassOut)
def get_class(
    class_id: int,
    current_user: User = Depends(require_instructor),
    db: Session = Depends(get_db),
):
    cls = _get_owned_class(db, class_id, current_user.id)
    return _serialize_class(cls, db)


@router.patch("/{class_id}", response_model=ClassOut)
def update_class(
    class_id: int,
    body: ClassUpdateIn,
    current_user: User = Depends(require_instructor),
    db: Session = Depends(get_db),
):
    cls = _get_owned_class(db, class_id, current_user.id)
    if body.name is not None:
        cls.name = body.name.strip()
    if body.description is not None:
        cls.description = body.description.strip()
    if body.course is not None:
        cls.course = body.course
    if body.is_active is not None:
        cls.is_active = body.is_active
    db.commit()
    db.refresh(cls)
    return _serialize_class(cls, db)


@router.delete("/{class_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_class(
    class_id: int,
    current_user: User = Depends(require_instructor),
    db: Session = Depends(get_db),
):
    cls = _get_owned_class(db, class_id, current_user.id)
    db.delete(cls)
    db.commit()


@router.get("/{class_id}/roster")
def get_roster(
    class_id: int,
    current_user: User = Depends(require_instructor),
    db: Session = Depends(get_db),
):
    cls = _get_owned_class(db, class_id, current_user.id)
    return [
        {
            "id": e.id,
            "student_id": str(e.student_id),
            "student_name": (e.student.display_name or e.student.email) if e.student else "",
            "student_email": e.student.email if e.student else "",
            "enrolled_at": e.enrolled_at.isoformat(),
            "is_graduating": e.is_graduating,
            "graduating_marked_at": e.graduating_marked_at.isoformat()
            if e.graduating_marked_at
            else None,
        }
        for e in sorted(cls.enrollments, key=lambda x: (x.student.display_name or x.student.email or "").lower())
    ]


@router.post("/{class_id}/enroll", status_code=status.HTTP_201_CREATED)
def enroll_student(
    class_id: int,
    body: EnrollIn,
    current_user: User = Depends(require_instructor),
    db: Session = Depends(get_db),
):
    cls = _get_owned_class(db, class_id, current_user.id)
    student = _find_student_by_email(db, body.email)
    existing = (
        db.query(ClassEnrollment)
        .filter(ClassEnrollment.class_id == cls.id, ClassEnrollment.student_id == student.id)
        .first()
    )
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Student already enrolled")
    enrollment = ClassEnrollment(class_id=cls.id, student_id=student.id)
    db.add(enrollment)
    db.commit()
    return {"student_id": str(student.id), "email": student.email}


@router.post("/{class_id}/enroll/bulk")
def bulk_enroll(
    class_id: int,
    body: BulkEnrollIn,
    current_user: User = Depends(require_instructor),
    db: Session = Depends(get_db),
):
    cls = _get_owned_class(db, class_id, current_user.id)
    enrolled = []
    errors = []
    for raw in body.emails:
        email = raw.strip().lower()
        if not email:
            continue
        try:
            student = _find_student_by_email(db, email)
            exists = (
                db.query(ClassEnrollment)
                .filter(ClassEnrollment.class_id == cls.id, ClassEnrollment.student_id == student.id)
                .first()
            )
            if exists:
                errors.append({"email": email, "error": "Already enrolled"})
                continue
            db.add(ClassEnrollment(class_id=cls.id, student_id=student.id))
            enrolled.append(email)
        except HTTPException as exc:
            errors.append({"email": email, "error": exc.detail})
    db.commit()
    return {"enrolled": enrolled, "errors": errors}


@router.delete("/{class_id}/enroll/{student_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_student(
    class_id: int,
    student_id: uuid.UUID,
    current_user: User = Depends(require_instructor),
    db: Session = Depends(get_db),
):
    cls = _get_owned_class(db, class_id, current_user.id)
    enrollment = (
        db.query(ClassEnrollment)
        .filter(ClassEnrollment.class_id == cls.id, ClassEnrollment.student_id == student_id)
        .first()
    )
    if enrollment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Enrollment not found")
    db.delete(enrollment)
    db.commit()


@router.patch("/{class_id}/enroll/{student_id}/graduating")
def mark_graduating(
    class_id: int,
    student_id: uuid.UUID,
    body: GraduatingUpdateIn,
    current_user: User = Depends(require_instructor),
    db: Session = Depends(get_db),
):
    cls = _get_owned_class(db, class_id, current_user.id)
    enrollment = (
        db.query(ClassEnrollment)
        .filter(ClassEnrollment.class_id == cls.id, ClassEnrollment.student_id == student_id)
        .first()
    )
    if enrollment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Enrollment not found")
    enrollment.is_graduating = body.is_graduating
    enrollment.graduating_marked_at = _utcnow() if body.is_graduating else None
    db.commit()
    return {
        "student_id": str(student_id),
        "is_graduating": enrollment.is_graduating,
        "graduating_marked_at": enrollment.graduating_marked_at.isoformat()
        if enrollment.graduating_marked_at
        else None,
    }


@router.get("/{class_id}/progress")
def get_class_progress(
    class_id: int,
    current_user: User = Depends(require_instructor),
    db: Session = Depends(get_db),
):
    cls = _get_owned_class(db, class_id, current_user.id)
    return compute_class_progress(db, cls)


@router.get("/{class_id}/students/{student_id}")
def get_student_detail(
    class_id: int,
    student_id: uuid.UUID,
    current_user: User = Depends(require_instructor),
    db: Session = Depends(get_db),
):
    cls = _get_owned_class(db, class_id, current_user.id)
    enrollment = next((e for e in cls.enrollments if e.student_id == student_id), None)
    if enrollment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not in class")
    student = enrollment.student
    progress = compute_student_progress(db, cls, student_id)
    return {
        "student_id": str(student_id),
        "student_name": student.display_name or student.email if student else "",
        "student_email": student.email if student else "",
        "enrolled_at": enrollment.enrolled_at.isoformat(),
        "is_graduating": enrollment.is_graduating,
        "assignments": [
            {
                "assignment_id": link.assignment_id,
                "title": link.assignment.title if link.assignment else "",
                "due_date": link.due_date.isoformat() if link.due_date else None,
            }
            for link in cls.assignment_links
        ],
        "modules": [
            {
                "module_id": link.module_id,
                "title": link.module.title if link.module else "",
                "due_date": link.due_date.isoformat() if link.due_date else None,
            }
            for link in cls.module_links
        ],
        **progress,
    }


@router.get("/{class_id}/assignments")
def list_class_assignments(
    class_id: int,
    current_user: User = Depends(require_instructor),
    db: Session = Depends(get_db),
):
    cls = _get_owned_class(db, class_id, current_user.id)
    return [
        {
            "link_id": link.id,
            "assignment_id": link.assignment_id,
            "title": link.assignment.title if link.assignment else "",
            "due_date": link.due_date.isoformat() if link.due_date else None,
            "assigned_at": link.assigned_at.isoformat(),
        }
        for link in cls.assignment_links
    ]


@router.post("/{class_id}/assignments/{assignment_id}", status_code=status.HTTP_201_CREATED)
def assign_assignment(
    class_id: int,
    assignment_id: int,
    body: AssignContentIn,
    current_user: User = Depends(require_instructor),
    db: Session = Depends(get_db),
):
    cls = _get_owned_class(db, class_id, current_user.id)
    assignment = db.get(Assignment, assignment_id)
    if assignment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")
    if assignment.created_by != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your assignment")
    exists = (
        db.query(ClassAssignmentLink)
        .filter(
            ClassAssignmentLink.class_id == cls.id,
            ClassAssignmentLink.assignment_id == assignment_id,
        )
        .first()
    )
    if exists:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Already assigned")
    link = ClassAssignmentLink(
        class_id=cls.id,
        assignment_id=assignment_id,
        due_date=body.due_date,
    )
    db.add(link)
    db.commit()
    return {"assignment_id": assignment_id, "due_date": body.due_date}


@router.delete("/{class_id}/assignments/{assignment_id}", status_code=status.HTTP_204_NO_CONTENT)
def unassign_assignment(
    class_id: int,
    assignment_id: int,
    current_user: User = Depends(require_instructor),
    db: Session = Depends(get_db),
):
    cls = _get_owned_class(db, class_id, current_user.id)
    link = (
        db.query(ClassAssignmentLink)
        .filter(
            ClassAssignmentLink.class_id == cls.id,
            ClassAssignmentLink.assignment_id == assignment_id,
        )
        .first()
    )
    if link is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not linked")
    db.delete(link)
    db.commit()


@router.get("/{class_id}/modules")
def list_class_modules(
    class_id: int,
    current_user: User = Depends(require_instructor),
    db: Session = Depends(get_db),
):
    cls = _get_owned_class(db, class_id, current_user.id)
    return [
        {
            "link_id": link.id,
            "module_id": link.module_id,
            "title": link.module.title if link.module else "",
            "due_date": link.due_date.isoformat() if link.due_date else None,
            "assigned_at": link.assigned_at.isoformat(),
        }
        for link in cls.module_links
    ]


@router.post("/{class_id}/modules/{module_id}", status_code=status.HTTP_201_CREATED)
def assign_module(
    class_id: int,
    module_id: int,
    body: AssignContentIn,
    current_user: User = Depends(require_instructor),
    db: Session = Depends(get_db),
):
    cls = _get_owned_class(db, class_id, current_user.id)
    module = db.get(Module, module_id)
    if module is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Module not found")
    exists = (
        db.query(ClassModuleLink)
        .filter(ClassModuleLink.class_id == cls.id, ClassModuleLink.module_id == module_id)
        .first()
    )
    if exists:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Already assigned")
    link = ClassModuleLink(class_id=cls.id, module_id=module_id, due_date=body.due_date)
    db.add(link)
    db.commit()
    return {"module_id": module_id, "due_date": body.due_date}


@router.delete("/{class_id}/modules/{module_id}", status_code=status.HTTP_204_NO_CONTENT)
def unassign_module(
    class_id: int,
    module_id: int,
    current_user: User = Depends(require_instructor),
    db: Session = Depends(get_db),
):
    cls = _get_owned_class(db, class_id, current_user.id)
    link = (
        db.query(ClassModuleLink)
        .filter(ClassModuleLink.class_id == cls.id, ClassModuleLink.module_id == module_id)
        .first()
    )
    if link is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Module not linked")
    db.delete(link)
    db.commit()
