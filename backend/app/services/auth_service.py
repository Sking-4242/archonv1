import os
import secrets
import uuid
from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.models.password_reset_token import PasswordResetToken
from app.models.user import AcademyProfile, User

MASTER_LOGIN = "archon"
MASTER_EMAIL = "archon@archonpro.net"

_SECRET_KEY = os.environ.get("ACADEMY_SECRET_KEY", "change-me-in-production")
_ALGORITHM = "HS256"
_TOKEN_EXPIRE_HOURS = int(os.environ.get("AUTH_TOKEN_EXPIRE_HOURS", str(24 * 7)))

_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return _pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return _pwd_context.verify(plain, hashed)


def create_token(user_id: uuid.UUID) -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=_TOKEN_EXPIRE_HOURS)
    payload = {"sub": str(user_id), "exp": expire}
    return jwt.encode(payload, _SECRET_KEY, algorithm=_ALGORITHM)


def decode_token(token: str) -> uuid.UUID:
    """Returns user id or raises JWTError."""
    payload = jwt.decode(token, _SECRET_KEY, algorithms=[_ALGORITHM])
    if payload.get("mfa_pending"):
        raise JWTError("MFA pending token cannot be used as session token")
    return uuid.UUID(payload["sub"])


def create_mfa_pending_token(user_id: uuid.UUID) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=5)
    payload = {"sub": str(user_id), "exp": expire, "mfa_pending": True}
    return jwt.encode(payload, _SECRET_KEY, algorithm=_ALGORITHM)


def decode_mfa_pending_token(token: str) -> uuid.UUID:
    payload = jwt.decode(token, _SECRET_KEY, algorithms=[_ALGORITHM])
    if not payload.get("mfa_pending"):
        raise JWTError("Not an MFA pending token")
    return uuid.UUID(payload["sub"])


def get_user_by_id(db: Session, user_id: uuid.UUID) -> User | None:
    return db.get(User, user_id)


def register_user(
    db: Session,
    *,
    email: str,
    password: str,
    display_name: str | None = None,
    academy_role: str = "student",
    account_role: str = "user",
) -> User:
    if academy_role not in ("student", "instructor"):
        raise ValueError("academy_role must be 'student' or 'instructor'")
    if account_role not in ("user", "admin"):
        raise ValueError("account_role must be 'user' or 'admin'")

    user = User(
        email=email.strip().lower(),
        display_name=display_name,
        password_hash=hash_password(password),
        role=account_role,
    )
    db.add(user)
    db.flush()

    profile = AcademyProfile(user_id=user.id, role=academy_role)
    db.add(profile)
    db.commit()
    db.refresh(user)
    return user


def authenticate_user(db: Session, email: str, password: str) -> User | None:
    identifier = email.strip()
    lowered = identifier.lower()

    user = db.query(User).filter(User.email == lowered).first()
    if user is None and "@" not in identifier:
        user = (
            db.query(User)
            .filter(User.display_name.isnot(None))
            .filter(User.display_name.ilike(identifier))
            .first()
        )
    if user is None and lowered == MASTER_LOGIN:
        user = db.query(User).filter(User.email == MASTER_EMAIL).first()

    if user is None or not verify_password(password, user.password_hash):
        return None
    return user


def user_to_dict(user: User) -> dict:
    display = user.display_name or user.email
    return {
        "id": str(user.id),
        "email": user.email,
        "display_name": user.display_name,
        "name": display,
        "role": user.role,
        "academy_role": user.academy_role,
        "mfa_enabled": user.mfa_enabled,
    }


def create_password_reset_token(db: Session, user: User) -> str:
    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
    row = PasswordResetToken(user_id=user.id, token=token, expires_at=expires_at)
    db.add(row)
    db.commit()
    return token


def reset_password_with_token(db: Session, token: str, new_password: str) -> bool:
    now = datetime.now(timezone.utc)
    row = (
        db.query(PasswordResetToken)
        .filter(
            PasswordResetToken.token == token,
            PasswordResetToken.used_at.is_(None),
            PasswordResetToken.expires_at > now,
        )
        .first()
    )
    if row is None:
        return False

    user = db.get(User, row.user_id)
    if user is None:
        return False

    user.password_hash = hash_password(new_password)
    row.used_at = now
    db.commit()
    return True
