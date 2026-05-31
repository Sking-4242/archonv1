import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.models.user import User  # re-export for academy routers and seeds


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


# ── Assignments ───────────────────────────────────────────────────────────────

class Assignment(Base):
    __tablename__ = "assignments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(300))
    brief: Mapped[str] = mapped_column(Text)
    due_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    rubric: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    creator: Mapped["User"] = relationship()
    submissions: Mapped[list["Submission"]] = relationship(back_populates="assignment")
    module_links: Mapped[list["ModuleAssignment"]] = relationship(back_populates="assignment")


class Submission(Base):
    __tablename__ = "submissions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    assignment_id: Mapped[int] = mapped_column(Integer, ForeignKey("assignments.id"), index=True)
    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), index=True
    )
    graph: Mapped[dict] = mapped_column(JSON)
    automated_score: Mapped[int] = mapped_column(Integer, default=0)
    total_points: Mapped[int] = mapped_column(Integer, default=0)
    criteria_results: Mapped[list] = mapped_column(JSON, default=list)
    instructor_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    instructor_feedback: Mapped[str | None] = mapped_column(Text, nullable=True)
    submitted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    assignment: Mapped["Assignment"] = relationship(back_populates="submissions")
    student: Mapped["User"] = relationship()


# ── Modules & Lessons ─────────────────────────────────────────────────────────

class Module(Base):
    __tablename__ = "modules"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    course: Mapped[str] = mapped_column(String(20), default="aws", index=True)
    title: Mapped[str] = mapped_column(String(300))
    description: Mapped[str] = mapped_column(Text, default="")
    order_index: Mapped[int] = mapped_column(Integer, default=0)
    difficulty_level: Mapped[str] = mapped_column(String(20), default="beginner")
    certification_tags: Mapped[list] = mapped_column(JSON, default=list)
    is_published: Mapped[bool] = mapped_column(Boolean, default=False)
    created_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    lessons: Mapped[list["Lesson"]] = relationship(
        back_populates="module",
        cascade="all, delete-orphan",
        order_by="Lesson.order_index",
    )
    assignment_links: Mapped[list["ModuleAssignment"]] = relationship(
        back_populates="module",
        cascade="all, delete-orphan",
        order_by="ModuleAssignment.order_index",
    )
    library_links: Mapped[list["ModuleLibraryLink"]] = relationship(
        back_populates="module",
        cascade="all, delete-orphan",
        order_by="ModuleLibraryLink.order_index",
    )


class Lesson(Base):
    """
    An instructor-authored lesson inside a Module.

    lesson_type: "content" | "canvas"
    canvas_template: optional JSON { nodes, edges, graphMeta } to pre-seed the canvas.
    """

    __tablename__ = "lessons"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    module_id: Mapped[int] = mapped_column(Integer, ForeignKey("modules.id"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(300))
    content: Mapped[str] = mapped_column(Text, default="")
    lesson_type: Mapped[str] = mapped_column(String(20), default="content")
    canvas_template: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    estimated_minutes: Mapped[int] = mapped_column(Integer, default=10)
    order_index: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    module: Mapped["Module"] = relationship(back_populates="lessons")
    progress_records: Mapped[list["LessonProgress"]] = relationship(
        back_populates="lesson",
        cascade="all, delete-orphan",
    )
    notes: Mapped[list["LessonNote"]] = relationship(
        back_populates="lesson",
        cascade="all, delete-orphan",
        foreign_keys="LessonNote.lesson_id",
    )


class LessonProgress(Base):
    """Records that a student has marked an instructor lesson complete."""

    __tablename__ = "lesson_progress"
    __table_args__ = (UniqueConstraint("lesson_id", "student_id", name="uq_lesson_student"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    lesson_id: Mapped[int] = mapped_column(Integer, ForeignKey("lessons.id"), nullable=False, index=True)
    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    completed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    lesson: Mapped["Lesson"] = relationship(back_populates="progress_records")
    student: Mapped["User"] = relationship()


class ModuleAssignment(Base):
    """Join table linking existing Assignments into a Module at a specific position."""

    __tablename__ = "module_assignments"
    __table_args__ = (UniqueConstraint("module_id", "assignment_id", name="uq_module_assignment"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    module_id: Mapped[int] = mapped_column(Integer, ForeignKey("modules.id"), nullable=False, index=True)
    assignment_id: Mapped[int] = mapped_column(Integer, ForeignKey("assignments.id"), nullable=False, index=True)
    order_index: Mapped[int] = mapped_column(Integer, default=0)

    module: Mapped["Module"] = relationship(back_populates="assignment_links")
    assignment: Mapped["Assignment"] = relationship(back_populates="module_links")


# ── Content Library ───────────────────────────────────────────────────────────

class LibraryLesson(Base):
    """
    A repo-managed lesson from the Archon content library.
    Content is seeded from Markdown files under academy/content/.
    Never edited via the UI — update the source file and re-seed.

    slug: unique file-based identifier, e.g. "aws/module-01/01-what-is-cloud"
    course: top-level course key, e.g. "aws"
    module_slug: folder key, e.g. "module-01-cloud-fundamentals"
    module_title: display name of the module group
    """

    __tablename__ = "library_lessons"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    slug: Mapped[str] = mapped_column(String(400), unique=True, index=True)
    course: Mapped[str] = mapped_column(String(50), index=True)
    module_slug: Mapped[str] = mapped_column(String(200), index=True)
    module_title: Mapped[str] = mapped_column(String(300))
    module_order: Mapped[int] = mapped_column(Integer, default=0)
    title: Mapped[str] = mapped_column(String(300))
    content: Mapped[str] = mapped_column(Text, default="")
    lesson_type: Mapped[str] = mapped_column(String(20), default="content")
    canvas_template: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    estimated_minutes: Mapped[int] = mapped_column(Integer, default=10)
    order_index: Mapped[int] = mapped_column(Integer, default=0)
    difficulty_level: Mapped[str] = mapped_column(String(20), default="beginner")
    certification_tags: Mapped[list] = mapped_column(JSON, default=list)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow)

    progress_records: Mapped[list["LibraryLessonProgress"]] = relationship(
        back_populates="lesson",
        cascade="all, delete-orphan",
    )
    module_links: Mapped[list["ModuleLibraryLink"]] = relationship(
        back_populates="library_lesson",
        cascade="all, delete-orphan",
    )
    notes: Mapped[list["LessonNote"]] = relationship(
        back_populates="library_lesson",
        cascade="all, delete-orphan",
        foreign_keys="LessonNote.library_lesson_id",
    )


class LibraryLessonProgress(Base):
    """
    Tracks completion of a library lesson per student.
    Unified across all contexts — completing it once marks it done everywhere.
    """

    __tablename__ = "library_lesson_progress"
    __table_args__ = (UniqueConstraint("library_lesson_id", "student_id", name="uq_lib_lesson_student"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    library_lesson_id: Mapped[int] = mapped_column(Integer, ForeignKey("library_lessons.id"), nullable=False, index=True)
    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    completed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    lesson: Mapped["LibraryLesson"] = relationship(back_populates="progress_records")
    student: Mapped["User"] = relationship()


class ModuleLibraryLink(Base):
    """
    Links a LibraryLesson into an instructor's Module.
    The instructor can attach a module-specific note (e.g. context for their class).
    instructor_note_visible=True → students enrolled with that instructor can see the note.
    While class enrollment is not yet implemented, visible notes are shown to all students.
    """

    __tablename__ = "module_library_links"
    __table_args__ = (UniqueConstraint("module_id", "library_lesson_id", name="uq_module_library_lesson"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    module_id: Mapped[int] = mapped_column(Integer, ForeignKey("modules.id"), nullable=False, index=True)
    library_lesson_id: Mapped[int] = mapped_column(Integer, ForeignKey("library_lessons.id"), nullable=False, index=True)
    order_index: Mapped[int] = mapped_column(Integer, default=0)
    instructor_note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    instructor_note_visible: Mapped[bool] = mapped_column(Boolean, default=False)

    module: Mapped["Module"] = relationship(back_populates="library_links")
    library_lesson: Mapped["LibraryLesson"] = relationship(back_populates="module_links")


class LessonNote(Base):
    """
    A user-authored note on any lesson (instructor or library).
    Exactly one of lesson_id / library_lesson_id must be set.

    For students: private by default (is_visible=False). Future: shareable.
    For instructors: is_visible toggles whether enrolled students see the note.
    While class enrollment is not implemented, visible instructor notes show to all students.
    """

    __tablename__ = "lesson_notes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    lesson_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("lessons.id"), nullable=True, index=True)
    library_lesson_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("library_lessons.id"), nullable=True, index=True)
    content: Mapped[str] = mapped_column(Text, default="")
    is_visible: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow)

    author: Mapped["User"] = relationship()
    lesson: Mapped[Optional["Lesson"]] = relationship(
        back_populates="notes", foreign_keys=[lesson_id]
    )
    library_lesson: Mapped[Optional["LibraryLesson"]] = relationship(
        back_populates="notes", foreign_keys=[library_lesson_id]
    )


# ── Instructor Classes ─────────────────────────────────────────────────────────

class InstructorClass(Base):
    """A cohort an instructor manages — roster, assigned content, and progress."""

    __tablename__ = "instructor_classes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(300))
    description: Mapped[str] = mapped_column(Text, default="")
    class_code: Mapped[str] = mapped_column(String(12), unique=True, index=True)
    course: Mapped[str] = mapped_column(String(20), default="aws", index=True)
    instructor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    instructor: Mapped["User"] = relationship(foreign_keys=[instructor_id])
    enrollments: Mapped[list["ClassEnrollment"]] = relationship(
        back_populates="instructor_class",
        cascade="all, delete-orphan",
    )
    assignment_links: Mapped[list["ClassAssignmentLink"]] = relationship(
        back_populates="instructor_class",
        cascade="all, delete-orphan",
    )
    module_links: Mapped[list["ClassModuleLink"]] = relationship(
        back_populates="instructor_class",
        cascade="all, delete-orphan",
    )


class ClassEnrollment(Base):
    """Links a student to an instructor class."""

    __tablename__ = "class_enrollments"
    __table_args__ = (UniqueConstraint("class_id", "student_id", name="uq_class_enrollment"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    class_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("instructor_classes.id"), nullable=False, index=True
    )
    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    enrolled_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    is_graduating: Mapped[bool] = mapped_column(Boolean, default=False)
    graduating_marked_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    instructor_class: Mapped["InstructorClass"] = relationship(back_populates="enrollments")
    student: Mapped["User"] = relationship(foreign_keys=[student_id])


class ClassAssignmentLink(Base):
    """Assignment assigned to a class with an optional due date override."""

    __tablename__ = "class_assignment_links"
    __table_args__ = (
        UniqueConstraint("class_id", "assignment_id", name="uq_class_assignment_link"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    class_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("instructor_classes.id"), nullable=False, index=True
    )
    assignment_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("assignments.id"), nullable=False, index=True
    )
    due_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    assigned_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    instructor_class: Mapped["InstructorClass"] = relationship(back_populates="assignment_links")
    assignment: Mapped["Assignment"] = relationship()


class ClassModuleLink(Base):
    """Module assigned to a class with an optional due date."""

    __tablename__ = "class_module_links"
    __table_args__ = (UniqueConstraint("class_id", "module_id", name="uq_class_module_link"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    class_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("instructor_classes.id"), nullable=False, index=True
    )
    module_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("modules.id"), nullable=False, index=True
    )
    due_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    assigned_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    instructor_class: Mapped["InstructorClass"] = relationship(back_populates="module_links")
    module: Mapped["Module"] = relationship()


class PracticeTestAttempt(Base):
    """A student's practice test session (study or live mode)."""

    __tablename__ = "practice_test_attempts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    cert: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    test_number: Mapped[int] = mapped_column(Integer, nullable=False)
    mode: Mapped[str] = mapped_column(String(16), nullable=False)
    question_ids: Mapped[list] = mapped_column(JSON, default=list)
    answers: Mapped[dict] = mapped_column(JSON, default=dict)
    score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    total: Mapped[int | None] = mapped_column(Integer, nullable=True)
    percent: Mapped[int | None] = mapped_column(Integer, nullable=True)
    passed: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    domain_breakdown: Mapped[list | None] = mapped_column(JSON, nullable=True)
    recommendations: Mapped[list | None] = mapped_column(JSON, nullable=True)
    per_question: Mapped[list | None] = mapped_column(JSON, nullable=True)
    time_limit_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    time_spent_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    status: Mapped[str] = mapped_column(String(16), default="in_progress")
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    student: Mapped["User"] = relationship()
