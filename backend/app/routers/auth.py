from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session, joinedload

from app.db import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.services.auth_service import (
    authenticate_user,
    create_mfa_pending_token,
    create_password_reset_token,
    create_token,
    decode_mfa_pending_token,
    register_user,
    reset_password_with_token,
    user_to_dict,
)
from app.services import email_service, mfa_service
from jose import JWTError

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    email: str
    password: str = Field(min_length=8)
    display_name: str | None = None
    academy_role: str = "student"


class UserOut(BaseModel):
    id: str
    email: str
    display_name: str | None
    role: str
    academy_role: str
    mfa_enabled: bool


class AuthResponse(BaseModel):
    user: UserOut
    token: str


class MfaRequiredResponse(BaseModel):
    mfa_required: bool = True
    mfa_token: str


class MfaVerifyRequest(BaseModel):
    mfa_token: str
    code: str


class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    token: str
    password: str = Field(min_length=8)


class MfaEnableRequest(BaseModel):
    code: str


class MfaDisableRequest(BaseModel):
    code: str


class MfaSetupResponse(BaseModel):
    secret: str
    otpauth_uri: str


def _load_user(db: Session, user_id) -> User:
    user = (
        db.query(User)
        .options(joinedload(User.academy_profile))
        .filter(User.id == user_id)
        .first()
    )
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


@router.post("/login")
def login(body: LoginRequest, db: Session = Depends(get_db)):
    user = authenticate_user(db, body.email, body.password)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password"
        )

    if user.mfa_enabled:
        if not user.mfa_secret:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="MFA is enabled but not configured",
            )
        return MfaRequiredResponse(mfa_token=create_mfa_pending_token(user.id))

    user = _load_user(db, user.id)
    token = create_token(user.id)
    return AuthResponse(user=user_to_dict(user), token=token)


@router.post("/mfa/verify", response_model=AuthResponse)
def verify_mfa(body: MfaVerifyRequest, db: Session = Depends(get_db)):
    try:
        user_id = decode_mfa_pending_token(body.mfa_token)
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired MFA session"
        ) from exc

    user = db.get(User, user_id)
    if user is None or not user.mfa_enabled or not user.mfa_secret:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid MFA session")

    if not mfa_service.verify_totp(user.mfa_secret, body.code):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid MFA code")

    user = _load_user(db, user.id)
    token = create_token(user.id)
    return AuthResponse(user=user_to_dict(user), token=token)


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(body: RegisterRequest, db: Session = Depends(get_db)):
    if body.academy_role not in ("student", "instructor"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="academy_role must be 'student' or 'instructor'",
        )

    existing = db.query(User).filter(User.email == body.email.strip().lower()).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    user = register_user(
        db,
        email=body.email,
        password=body.password,
        display_name=body.display_name,
        academy_role=body.academy_role,
    )
    user = _load_user(db, user.id)
    token = create_token(user.id)
    try:
        email_service.send_welcome_email(user.email, user.display_name)
    except Exception:
        pass
    return AuthResponse(user=user_to_dict(user), token=token)


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return user_to_dict(current_user)


@router.post("/password/forgot")
def forgot_password(body: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email.strip().lower()).first()
    if user:
        token = create_password_reset_token(db, user)
        try:
            email_service.send_password_reset_email(user.email, token, user.display_name)
        except Exception:
            pass
    return {"message": "If that email is registered, a reset link has been sent."}


@router.post("/password/reset")
def reset_password(body: ResetPasswordRequest, db: Session = Depends(get_db)):
    if not reset_password_with_token(db, body.token, body.password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token",
        )
    return {"message": "Password updated. You can sign in with your new password."}


@router.post("/mfa/setup", response_model=MfaSetupResponse)
def setup_mfa(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    secret = mfa_service.generate_totp_secret()
    current_user.mfa_secret = secret
    current_user.mfa_enabled = False
    db.commit()
    return MfaSetupResponse(
        secret=secret,
        otpauth_uri=mfa_service.get_totp_uri(secret, current_user.email),
    )


@router.post("/mfa/enable")
def enable_mfa(
    body: MfaEnableRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.mfa_secret:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Run MFA setup first",
        )
    if not mfa_service.verify_totp(current_user.mfa_secret, body.code):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid MFA code")

    current_user.mfa_enabled = True
    db.commit()
    return {"message": "MFA enabled"}


@router.post("/mfa/disable")
def disable_mfa(
    body: MfaDisableRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.mfa_enabled or not current_user.mfa_secret:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="MFA is not enabled")
    if not mfa_service.verify_totp(current_user.mfa_secret, body.code):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid MFA code")

    current_user.mfa_enabled = False
    current_user.mfa_secret = None
    db.commit()
    return {"message": "MFA disabled"}
