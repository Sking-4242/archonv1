"""Academy AI tutor chat endpoint."""

from __future__ import annotations

import logging
import time
import traceback

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.db import get_db
from app.dependencies.academy_auth import require_student
from app.models.graph import Graph
from app.models.user import User
from app.services.academy_tutor_service import build_tutor_system_prompt, format_chat_history
from app.services.access_service import resolve_access
from app.services.llm.factory import get_provider

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/academy/tutor", tags=["academy-tutor"])

_MAX_RETRIES = 2
_RETRY_BASE_SECONDS = 1.0
_AUTH_KEYS = ("401", "unauthorized", "invalid api key", "authentication")


class TutorMessage(BaseModel):
    role: str
    content: str


class TutorChatRequest(BaseModel):
    messages: list[TutorMessage] = Field(min_length=1)
    context_type: str = "lesson"
    lesson_title: str | None = None
    lesson_content: str | None = None
    module_title: str | None = None
    assignment_brief: str | None = None
    rubric: list | None = None
    hint_mode: bool = True
    graph: Graph | None = None
    provider: str | None = None
    model: str | None = None
    base_url: str | None = None


class TutorChatResponse(BaseModel):
    reply: str


def require_tutor_access(
    user: User = Depends(require_student),
    db: Session = Depends(get_db),
) -> User:
    access = resolve_access(db, user)
    if not access.features.get("academy_ai_tutor"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="AI tutor requires an Academy license",
        )
    return user


def _call_with_retry(provider, system_prompt: str, user_prompt: str) -> str:
    last_exc: Exception | None = None
    for attempt in range(_MAX_RETRIES + 1):
        if attempt > 0:
            time.sleep(_RETRY_BASE_SECONDS * (2 ** (attempt - 1)))
        try:
            return provider.generate(system_prompt, user_prompt)
        except Exception as exc:
            last_exc = exc
            if any(k in str(exc).lower() for k in _AUTH_KEYS):
                raise
    raise last_exc  # type: ignore[misc]


@router.post("/chat", response_model=TutorChatResponse)
def tutor_chat(
    body: TutorChatRequest,
    current_user: User = Depends(require_tutor_access),
) -> TutorChatResponse:
    del current_user  # access verified

    try:
        provider = get_provider(
            provider_name=body.provider,
            model=body.model,
            base_url=body.base_url,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    system_prompt = build_tutor_system_prompt(
        context_type=body.context_type,
        lesson_title=body.lesson_title,
        lesson_content=body.lesson_content,
        module_title=body.module_title,
        assignment_brief=body.assignment_brief,
        rubric=body.rubric,
        hint_mode=body.hint_mode,
        graph=body.graph,
    )

    history = [{"role": m.role, "content": m.content} for m in body.messages]
    user_prompt = format_chat_history(history)

    try:
        reply = _call_with_retry(provider, system_prompt, user_prompt)
    except RuntimeError as exc:
        msg = str(exc)
        logger.error("Tutor RuntimeError: %s\n%s", msg, traceback.format_exc())
        if "not reachable" in msg.lower():
            raise HTTPException(status_code=503, detail=msg)
        raise HTTPException(status_code=500, detail=f"Tutor chat failed: {msg}")
    except Exception as exc:
        msg = str(exc)
        logger.error("Tutor Exception [%s]: %s\n%s", type(exc).__name__, msg, traceback.format_exc())
        if any(k in msg.lower() for k in _AUTH_KEYS):
            raise HTTPException(
                status_code=503,
                detail="LLM provider is not configured. Set API keys in the backend environment.",
            )
        raise HTTPException(status_code=500, detail=f"Tutor chat failed: {msg}")

    return TutorChatResponse(reply=reply.strip())
