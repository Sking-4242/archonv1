"""Practice test attempts table."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "005_practice_tests"
down_revision: Union[str, None] = "004_license_unassigned"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "practice_test_attempts",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("student_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("cert", sa.String(length=32), nullable=False),
        sa.Column("test_number", sa.Integer(), nullable=False),
        sa.Column("mode", sa.String(length=16), nullable=False),
        sa.Column("question_ids", postgresql.JSON(astext_type=sa.Text()), nullable=False),
        sa.Column("answers", postgresql.JSON(astext_type=sa.Text()), nullable=False),
        sa.Column("score", sa.Integer(), nullable=True),
        sa.Column("total", sa.Integer(), nullable=True),
        sa.Column("percent", sa.Integer(), nullable=True),
        sa.Column("passed", sa.Boolean(), nullable=True),
        sa.Column("domain_breakdown", postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column("recommendations", postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column("per_question", postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column("time_limit_seconds", sa.Integer(), nullable=True),
        sa.Column("time_spent_seconds", sa.Integer(), nullable=True),
        sa.Column("status", sa.String(length=16), nullable=False, server_default="in_progress"),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_practice_test_attempts_student_id", "practice_test_attempts", ["student_id"])
    op.create_index("ix_practice_test_attempts_cert", "practice_test_attempts", ["cert"])


def downgrade() -> None:
    op.drop_index("ix_practice_test_attempts_cert", table_name="practice_test_attempts")
    op.drop_index("ix_practice_test_attempts_student_id", table_name="practice_test_attempts")
    op.drop_table("practice_test_attempts")
