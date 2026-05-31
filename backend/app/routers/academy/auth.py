from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session, joinedload

from app.db import get_db
from app.models.user import User
from app.services.auth_service import authenticate_user, create_token, register_user, user_to_dict

router = APIRouter(prefix="/academy/auth", tags=["academy-auth"])


class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    display_name: str | None = None
    email: str
    password: str = Field(min_length=8)
    role: str = "student"


class UserOut(BaseModel):
    id: str
    display_name: str | None
    email: str
    role: str

    model_config = {"from_attributes": True}


class LoginResponse(BaseModel):
    user: UserOut
    token: str


def _legacy_user_out(user: User) -> dict:
    data = user_to_dict(user)
    display = data["display_name"] or data["email"]
    return {
        "id": data["id"],
        "display_name": data["display_name"],
        "name": display,
        "email": data["email"],
        "role": data["academy_role"],
    }


@router.post("/login", response_model=LoginResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    user = authenticate_user(db, body.email, body.password)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    user = (
        db.query(User)
        .options(joinedload(User.academy_profile))
        .filter(User.id == user.id)
        .first()
    )
    token = create_token(user.id)
    return {"user": _legacy_user_out(user), "token": token}


@router.post("/register", response_model=LoginResponse, status_code=status.HTTP_201_CREATED)
def register(body: RegisterRequest, db: Session = Depends(get_db)):
    if body.role not in ("student", "instructor"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Role must be 'student' or 'instructor'")

    existing = db.query(User).filter(User.email == body.email.strip().lower()).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    user = register_user(
        db,
        email=body.email,
        password=body.password,
        display_name=body.display_name,
        academy_role=body.role,
    )
    user = (
        db.query(User)
        .options(joinedload(User.academy_profile))
        .filter(User.id == user.id)
        .first()
    )
    token = create_token(user.id)
    return {"user": _legacy_user_out(user), "token": token}
