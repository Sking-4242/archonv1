"""Class practice test assignments."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "008_class_practice_tests"
down_revision: Union[str, None] = "007_org_affiliation"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "class_practice_test_links",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("class_id", sa.Integer(), sa.ForeignKey("instructor_classes.id"), nullable=False),
        sa.Column("cert", sa.String(length=20), nullable=False),
        sa.Column("test_number", sa.Integer(), nullable=False),
        sa.Column("due_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("assigned_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("class_id", "cert", "test_number", name="uq_class_practice_test_link"),
    )
    op.create_index("ix_class_practice_test_links_class_id", "class_practice_test_links", ["class_id"])
    op.create_index("ix_class_practice_test_links_cert", "class_practice_test_links", ["cert"])


def downgrade() -> None:
    op.drop_index("ix_class_practice_test_links_cert", table_name="class_practice_test_links")
    op.drop_index("ix_class_practice_test_links_class_id", table_name="class_practice_test_links")
    op.drop_table("class_practice_test_links")
