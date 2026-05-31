"""Unified auth schema — UUID users, academy_profiles, licensing, canvas_saves.

Revision ID: 001_unified_auth
Revises:
Create Date: 2026-05-29

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "001_unified_auth"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_USER_FK_COLUMNS = [
    ("assignments", "created_by"),
    ("submissions", "student_id"),
    ("modules", "created_by"),
    ("lesson_progress", "student_id"),
    ("library_lesson_progress", "student_id"),
    ("lesson_notes", "user_id"),
    ("class_enrollments", "instructor_id"),
    ("class_enrollments", "student_id"),
]


def _table_exists(conn, name: str) -> bool:
    return conn.execute(
        sa.text(
            "SELECT EXISTS (SELECT 1 FROM information_schema.tables "
            "WHERE table_schema = 'public' AND table_name = :name)"
        ),
        {"name": name},
    ).scalar()


def _column_exists(conn, table: str, column: str) -> bool:
    return conn.execute(
        sa.text(
            "SELECT EXISTS (SELECT 1 FROM information_schema.columns "
            "WHERE table_schema = 'public' AND table_name = :table AND column_name = :column)"
        ),
        {"table": table, "column": column},
    ).scalar()


def _column_type(conn, table: str, column: str) -> str | None:
    return conn.execute(
        sa.text(
            "SELECT data_type FROM information_schema.columns "
            "WHERE table_schema = 'public' AND table_name = :table AND column_name = :column"
        ),
        {"table": table, "column": column},
    ).scalar()


def _drop_foreign_keys_to_users(conn) -> None:
    rows = conn.execute(
        sa.text(
            """
            SELECT tc.table_name, tc.constraint_name
            FROM information_schema.table_constraints AS tc
            JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name
            JOIN information_schema.constraint_column_usage AS ccu
              ON ccu.constraint_name = tc.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY'
              AND ccu.table_name = 'users'
              AND ccu.column_name = 'id'
            """
        )
    ).fetchall()
    for table_name, constraint_name in rows:
        op.drop_constraint(constraint_name, table_name, type_="foreignkey")


def _create_new_tables() -> None:
    if not _table_exists(op.get_bind(), "academy_profiles"):
        op.create_table(
            "academy_profiles",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column(
                "user_id",
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey("users.id", ondelete="CASCADE"),
                nullable=False,
                unique=True,
            ),
            sa.Column("role", sa.Text(), nullable=False, server_default="student"),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("NOW()"),
                nullable=False,
            ),
        )
        op.create_index("ix_academy_profiles_user_id", "academy_profiles", ["user_id"])

    if not _table_exists(op.get_bind(), "organizations"):
        op.create_table(
            "organizations",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("name", sa.Text(), nullable=False),
            sa.Column("contact_email", sa.Text(), nullable=False),
            sa.Column("contact_name", sa.Text(), nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("NOW()"),
                nullable=False,
            ),
        )

    if not _table_exists(op.get_bind(), "licenses"):
        op.create_table(
            "licenses",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("key", postgresql.UUID(as_uuid=True), nullable=False, unique=True),
            sa.Column("type", sa.Text(), nullable=False),
            sa.Column("status", sa.Text(), nullable=False, server_default="active"),
            sa.Column(
                "owner_id",
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey("users.id", ondelete="SET NULL"),
                nullable=True,
            ),
            sa.Column(
                "org_id",
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey("organizations.id", ondelete="SET NULL"),
                nullable=True,
            ),
            sa.Column("seat_limit", sa.Integer(), nullable=True),
            sa.Column("auto_renew", sa.Boolean(), nullable=False, server_default=sa.text("false")),
            sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("grace_until", sa.DateTime(timezone=True), nullable=True),
            sa.Column("stripe_subscription_id", sa.Text(), nullable=True),
            sa.Column("stripe_customer_id", sa.Text(), nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("NOW()"),
                nullable=False,
            ),
            sa.CheckConstraint(
                "(type = 'individual' AND owner_id IS NOT NULL AND org_id IS NULL) OR "
                "(type = 'institutional' AND org_id IS NOT NULL AND owner_id IS NULL)",
                name="owner_or_org",
            ),
        )
        op.create_index("idx_licenses_key", "licenses", ["key"])
        op.create_index("idx_licenses_owner", "licenses", ["owner_id"])
        op.create_index("idx_licenses_org", "licenses", ["org_id"])

    if not _table_exists(op.get_bind(), "seats"):
        op.create_table(
            "seats",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column(
                "license_id",
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey("licenses.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column(
                "user_id",
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey("users.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column(
                "enrolled_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("NOW()"),
                nullable=False,
            ),
            sa.Column("is_graduating", sa.Boolean(), nullable=False, server_default=sa.text("false")),
            sa.Column("graduating_perk_expires_at", sa.DateTime(timezone=True), nullable=True),
            sa.UniqueConstraint("license_id", "user_id", name="uq_seat_license_user"),
        )
        op.create_index("idx_seats_license", "seats", ["license_id"])
        op.create_index("idx_seats_user", "seats", ["user_id"])

    if not _table_exists(op.get_bind(), "canvas_saves"):
        op.create_table(
            "canvas_saves",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column(
                "user_id",
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey("users.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column("name", sa.Text(), nullable=False, server_default="Untitled Architecture"),
            sa.Column("graph_json", postgresql.JSONB(), nullable=False),
            sa.Column("provider", sa.Text(), nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("NOW()"),
                nullable=False,
            ),
            sa.Column(
                "updated_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("NOW()"),
                nullable=False,
            ),
        )
        op.create_index("idx_canvas_saves_user", "canvas_saves", ["user_id"])


def _seed_academy_profiles(conn) -> None:
    op.execute(
        """
        INSERT INTO academy_profiles (id, user_id, role, created_at)
        SELECT gen_random_uuid(), u.id,
               CASE WHEN u.role IN ('student', 'instructor') THEN u.role ELSE 'student' END,
               COALESCE(u.created_at, NOW())
        FROM users u
        WHERE u.role IN ('student', 'instructor')
          AND NOT EXISTS (
              SELECT 1 FROM academy_profiles ap WHERE ap.user_id = u.id
          )
        """
    )
    op.execute("UPDATE users SET role = 'user' WHERE role IN ('student', 'instructor')")
    op.execute("UPDATE users SET role = 'admin' WHERE email = 'admin@archon.academy'")


def _migrate_legacy_users(conn) -> None:
    op.execute('CREATE EXTENSION IF NOT EXISTS "pgcrypto"')

    op.add_column("users", sa.Column("id_uuid", postgresql.UUID(as_uuid=True), nullable=True))
    op.execute("UPDATE users SET id_uuid = gen_random_uuid() WHERE id_uuid IS NULL")

    for table, column in _USER_FK_COLUMNS:
        if not _table_exists(conn, table):
            continue
        uuid_col = f"{column}_uuid"
        if _column_exists(conn, table, uuid_col):
            continue
        op.add_column(table, sa.Column(uuid_col, postgresql.UUID(as_uuid=True), nullable=True))
        op.execute(
            sa.text(
                f"UPDATE {table} AS t SET {uuid_col} = u.id_uuid "
                f"FROM users AS u WHERE t.{column} = u.id"
            )
        )

    _drop_foreign_keys_to_users(conn)
    op.execute("ALTER TABLE users DROP CONSTRAINT users_pkey")
    op.drop_column("users", "id")
    op.alter_column("users", "id_uuid", new_column_name="id", nullable=False)
    op.create_primary_key("users_pkey", "users", ["id"])

    for table, column in _USER_FK_COLUMNS:
        if not _table_exists(conn, table):
            continue
        uuid_col = f"{column}_uuid"
        if not _column_exists(conn, table, uuid_col):
            continue
        op.drop_column(table, column)
        op.alter_column(table, uuid_col, new_column_name=column, nullable=False)
        op.create_foreign_key(
            f"fk_{table}_{column}_users",
            table,
            "users",
            [column],
            ["id"],
        )

    if _column_exists(conn, "users", "name"):
        op.add_column("users", sa.Column("display_name", sa.Text(), nullable=True))
        op.execute("UPDATE users SET display_name = name")
        op.drop_column("users", "name")

    if _column_exists(conn, "users", "class_code"):
        op.drop_column("users", "class_code")

    if not _column_exists(conn, "users", "mfa_secret"):
        op.add_column("users", sa.Column("mfa_secret", sa.Text(), nullable=True))
    if not _column_exists(conn, "users", "mfa_enabled"):
        op.add_column(
            "users",
            sa.Column("mfa_enabled", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        )
    if not _column_exists(conn, "users", "updated_at"):
        op.add_column(
            "users",
            sa.Column(
                "updated_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("NOW()"),
                nullable=False,
            ),
        )


def upgrade() -> None:
    conn = op.get_bind()

    if not _table_exists(conn, "users"):
        from app.db import Base

        Base.metadata.create_all(bind=conn)
        return

    id_type = _column_type(conn, "users", "id")
    if id_type == "uuid":
        _create_new_tables()
        return

    _migrate_legacy_users(conn)
    _create_new_tables()
    _seed_academy_profiles(conn)


def downgrade() -> None:
    raise NotImplementedError("Downgrade is not supported for unified auth migration.")
