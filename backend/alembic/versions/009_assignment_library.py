"""Assignment library flag for open-access lab catalog."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "009_assignment_library"
down_revision: Union[str, None] = "008_class_practice_tests"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "assignments",
        sa.Column("is_library", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.execute(
        "UPDATE assignments SET is_library = true WHERE title LIKE 'Assignment %'"
    )
    op.alter_column("assignments", "is_library", server_default=None)


def downgrade() -> None:
    op.drop_column("assignments", "is_library")
