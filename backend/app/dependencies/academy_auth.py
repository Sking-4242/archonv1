from fastapi import Depends, HTTPException, status

from app.dependencies.auth import get_current_user
from app.models.user import User


def require_student(user: User = Depends(get_current_user)) -> User:
    if user.academy_role != "student":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Student access required")
    return user


def require_instructor(user: User = Depends(get_current_user)) -> User:
    if user.academy_role != "instructor":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Instructor access required"
        )
    return user


def require_any_role(user: User = Depends(get_current_user)) -> User:
    return user
