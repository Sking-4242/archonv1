from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    email: Mapped[str] = mapped_column(String(200), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(200))
    role: Mapped[str] = mapped_column(String(20))  # "student" | "instructor"
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    assignments: Mapped[list["Assignment"]] = relationship(back_populates="creator")
    submissions: Mapped[list["Submission"]] = relationship(back_populates="student")


class Assignment(Base):
    """
    An assignment created by an instructor.

    rubric is a JSON list of criterion dicts:
        [
          {
            "label": "Must include a VPC",
            "type": "component_present",
            "params": {"component_type": "vpc"},
            "points": 10
          },
          ...
        ]

    Supported criterion types (evaluated by grader.py):
        component_present  — params: {component_type: str}
        component_absent   — params: {component_type: str}
        min_count          — params: {component_type: str, count: int}
        edge_exists        — params: {source_type: str, target_type: str}
        security_port_restricted — params: {port: int, forbidden_source: str}
    """

    __tablename__ = "assignments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(300))
    brief: Mapped[str] = mapped_column(Text)
    due_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_by: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"))
    rubric: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    creator: Mapped["User"] = relationship(back_populates="assignments")
    submissions: Mapped[list["Submission"]] = relationship(back_populates="assignment")


class Submission(Base):
    """
    A student's submitted canvas state for an assignment.

    graph        — serialized Archon canvas JSON (nodes + edges)
    criteria_results — JSON list produced by grader.py:
        [
          {
            "label": "Must include a VPC",
            "passed": true,
            "points": 10,
            "message": "VPC found in architecture"
          },
          ...
        ]
    """

    __tablename__ = "submissions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    assignment_id: Mapped[int] = mapped_column(Integer, ForeignKey("assignments.id"), index=True)
    student_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), index=True)
    graph: Mapped[dict] = mapped_column(JSON)
    automated_score: Mapped[int] = mapped_column(Integer, default=0)
    total_points: Mapped[int] = mapped_column(Integer, default=0)
    criteria_results: Mapped[list] = mapped_column(JSON, default=list)
    instructor_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    instructor_feedback: Mapped[str | None] = mapped_column(Text, nullable=True)
    submitted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    assignment: Mapped["Assignment"] = relationship(back_populates="submissions")
    student: Mapped["User"] = relationship(back_populates="submissions")
