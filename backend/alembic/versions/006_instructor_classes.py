"""Instructor classes, enrollments, and class content links."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "006_instructor_classes"
down_revision: Union[str, None] = "005_practice_tests"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "instructor_classes",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=300), nullable=False),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        sa.Column("class_code", sa.String(length=12), nullable=False),
        sa.Column("course", sa.String(length=20), nullable=False, server_default="aws"),
        sa.Column("instructor_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_instructor_classes_class_code", "instructor_classes", ["class_code"], unique=True)
    op.create_index("ix_instructor_classes_instructor_id", "instructor_classes", ["instructor_id"])
    op.create_index("ix_instructor_classes_course", "instructor_classes", ["course"])

    # Replace stub enrollments table (empty in fresh installs).
    op.execute("DROP TABLE IF EXISTS class_enrollments CASCADE")
    op.create_table(
        "class_enrollments",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("class_id", sa.Integer(), sa.ForeignKey("instructor_classes.id"), nullable=False),
        sa.Column("student_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("enrolled_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("is_graduating", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("graduating_marked_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("class_id", "student_id", name="uq_class_enrollment"),
    )
    op.create_index("ix_class_enrollments_class_id", "class_enrollments", ["class_id"])
    op.create_index("ix_class_enrollments_student_id", "class_enrollments", ["student_id"])

    op.create_table(
        "class_assignment_links",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("class_id", sa.Integer(), sa.ForeignKey("instructor_classes.id"), nullable=False),
        sa.Column("assignment_id", sa.Integer(), sa.ForeignKey("assignments.id"), nullable=False),
        sa.Column("due_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("assigned_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("class_id", "assignment_id", name="uq_class_assignment_link"),
    )
    op.create_index("ix_class_assignment_links_class_id", "class_assignment_links", ["class_id"])
    op.create_index("ix_class_assignment_links_assignment_id", "class_assignment_links", ["assignment_id"])

    op.create_table(
        "class_module_links",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("class_id", sa.Integer(), sa.ForeignKey("instructor_classes.id"), nullable=False),
        sa.Column("module_id", sa.Integer(), sa.ForeignKey("modules.id"), nullable=False),
        sa.Column("due_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("assigned_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("class_id", "module_id", name="uq_class_module_link"),
    )
    op.create_index("ix_class_module_links_class_id", "class_module_links", ["class_id"])
    op.create_index("ix_class_module_links_module_id", "class_module_links", ["module_id"])


def downgrade() -> None:
    op.drop_index("ix_class_module_links_module_id", table_name="class_module_links")
    op.drop_index("ix_class_module_links_class_id", table_name="class_module_links")
    op.drop_table("class_module_links")

    op.drop_index("ix_class_assignment_links_assignment_id", table_name="class_assignment_links")
    op.drop_index("ix_class_assignment_links_class_id", table_name="class_assignment_links")
    op.drop_table("class_assignment_links")

    op.drop_index("ix_class_enrollments_student_id", table_name="class_enrollments")
    op.drop_index("ix_class_enrollments_class_id", table_name="class_enrollments")
    op.drop_table("class_enrollments")

    op.drop_index("ix_instructor_classes_course", table_name="instructor_classes")
    op.drop_index("ix_instructor_classes_instructor_id", table_name="instructor_classes")
    op.drop_index("ix_instructor_classes_class_code", table_name="instructor_classes")
    op.drop_table("instructor_classes")

    op.create_table(
        "class_enrollments",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("instructor_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("student_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("enrolled_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("instructor_id", "student_id", name="uq_class_enrollment"),
    )
