import uuid

from sqlalchemy.orm import Session

from app.models.canvas_save import CanvasSave
from app.models.user import User


def list_saves(db: Session, user: User) -> list[CanvasSave]:
    return (
        db.query(CanvasSave)
        .filter(CanvasSave.user_id == user.id)
        .order_by(CanvasSave.updated_at.desc())
        .all()
    )


def get_save(db: Session, user: User, save_id: uuid.UUID) -> CanvasSave | None:
    return (
        db.query(CanvasSave)
        .filter(CanvasSave.id == save_id, CanvasSave.user_id == user.id)
        .first()
    )


def create_save(
    db: Session,
    user: User,
    *,
    name: str,
    graph_json: dict,
    provider: str | None,
) -> CanvasSave:
    row = CanvasSave(
        user_id=user.id,
        name=name or "Untitled Architecture",
        graph_json=graph_json,
        provider=provider,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def update_save(
    db: Session,
    user: User,
    save_id: uuid.UUID,
    *,
    name: str | None,
    graph_json: dict | None,
    provider: str | None,
) -> CanvasSave | None:
    row = get_save(db, user, save_id)
    if row is None:
        return None
    if name is not None:
        row.name = name
    if graph_json is not None:
        row.graph_json = graph_json
    if provider is not None:
        row.provider = provider
    db.commit()
    db.refresh(row)
    return row


def delete_save(db: Session, user: User, save_id: uuid.UUID) -> bool:
    row = get_save(db, user, save_id)
    if row is None:
        return False
    db.delete(row)
    db.commit()
    return True
