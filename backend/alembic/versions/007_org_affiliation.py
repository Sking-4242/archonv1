"""Organization affiliation for instructors (no paywall)."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "007_org_affiliation"
down_revision: Union[str, None] = "006_instructor_classes"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("organizations", sa.Column("code", sa.Text(), nullable=True))
    op.add_column(
        "organizations",
        sa.Column("created_by_id", sa.UUID(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
    )
    op.create_index("ix_organizations_code", "organizations", ["code"], unique=True)
    op.create_index("ix_organizations_created_by_id", "organizations", ["created_by_id"])

    op.add_column(
        "academy_profiles",
        sa.Column("organization_id", sa.UUID(), sa.ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True),
    )
    op.add_column("academy_profiles", sa.Column("organization_name", sa.Text(), nullable=True))
    op.create_index("ix_academy_profiles_organization_id", "academy_profiles", ["organization_id"])


def downgrade() -> None:
    op.drop_index("ix_academy_profiles_organization_id", table_name="academy_profiles")
    op.drop_column("academy_profiles", "organization_name")
    op.drop_column("academy_profiles", "organization_id")

    op.drop_index("ix_organizations_created_by_id", table_name="organizations")
    op.drop_index("ix_organizations_code", table_name="organizations")
    op.drop_column("organizations", "created_by_id")
    op.drop_column("organizations", "code")
