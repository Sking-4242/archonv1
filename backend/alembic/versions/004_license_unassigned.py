"""Allow individual licenses without an owner until activation."""

from typing import Sequence, Union

from alembic import op

revision: str = "004_license_unassigned"
down_revision: Union[str, None] = "003_password_reset_tokens"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_constraint("owner_or_org", "licenses", type_="check")
    op.create_check_constraint(
        "owner_or_org",
        "licenses",
        "(type = 'individual' AND org_id IS NULL) OR "
        "(type = 'institutional' AND org_id IS NOT NULL AND owner_id IS NULL)",
    )


def downgrade() -> None:
    op.drop_constraint("owner_or_org", "licenses", type_="check")
    op.create_check_constraint(
        "owner_or_org",
        "licenses",
        "(type = 'individual' AND owner_id IS NOT NULL AND org_id IS NULL) OR "
        "(type = 'institutional' AND org_id IS NOT NULL AND owner_id IS NULL)",
    )
