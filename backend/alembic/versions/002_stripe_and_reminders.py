"""Add Stripe webhook idempotency table and license renewal reminder tracking."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "002_stripe_and_reminders"
down_revision: Union[str, None] = "001_unified_auth"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "stripe_webhook_events",
        sa.Column("id", sa.String(length=255), primary_key=True),
        sa.Column("event_type", sa.String(length=100), nullable=False),
        sa.Column(
            "processed_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
    )
    op.add_column(
        "licenses",
        sa.Column("renewal_reminder_sent_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("licenses", "renewal_reminder_sent_at")
    op.drop_table("stripe_webhook_events")
