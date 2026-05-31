"""Instructor teaching assistant chat endpoint."""

from __future__ import annotations

import logging
import time
import traceback

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.db import get_db
from app.dependencies.academy_auth import require_instructor
from app.models.user import User
from app.services.academy_teaching_assistant_service import (
    build_teaching_assistant_system_prompt,
    format_assistant_chat_history,
    load_teaching_context,
    parse_artifacts,
)
from app.services.access_service import resolve_access
from app.services.llm.factory import get_provider

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/academy/teaching-assistant", tags=["academy-teaching-assistant"])

_MAX_RETRIES = 2
_RETRY_BASE_SECONDS = 1.0
_AUTH_KEYS = ("401", "unauthorized", "invalid api key", "authentication")

VALID_TASKS = frozenset(
    {
        "general",
        "assignment",
        "lesson",
        "announcement",
        "at_risk",
        "rubric",
        "feedback",
        "exam_prep",
        "discussion",
    }
)


class AssistantMessage(BaseModel):
    role: str
    content: str


class TeachingAssistantChatRequest(BaseModel):
    messages: list[AssistantMessage] = Field(min_length=1)
    task: str = "general"
    class_id: int | None = None
    module_id: int | None = None
    assignment_id: int | None = None
    submission_id: int | None = None
    provider: str | None = None
    model: str | None = None
    base_url: str | None = None


class TeachingAssistantChatResponse(BaseModel):
    reply: str
    artifacts: list[dict] = Field(default_factory=list)


def require_teaching_assistant_access(
    user: User = Depends(require_instructor),
    db: Session = Depends(get_db),
) -> User:
    access = resolve_access(db, user)
    if not access.features.get("academy_teaching_assistant"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Teaching assistant requires an institutional or instructor license",
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


@router.get("/tasks")
def list_tasks(
    current_user: User = Depends(require_teaching_assistant_access),
):
    del current_user
    return [
        {"id": "general", "label": "General help", "description": "Ask anything about teaching or Archon"},
        {"id": "assignment", "label": "Design a lab", "description": "Canvas assignment + rubric"},
        {"id": "lesson", "label": "Write a lesson", "description": "Outline or full lesson draft"},
        {"id": "announcement", "label": "Draft announcement", "description": "Class-wide message"},
        {"id": "at_risk", "label": "At-risk students", "description": "Interventions from class data"},
        {"id": "rubric", "label": "Build a rubric", "description": "Auto-grade criteria"},
        {"id": "feedback", "label": "Grading feedback", "description": "Comment templates"},
        {"id": "exam_prep", "label": "Exam alignment", "description": "Cert domain coverage"},
        {"id": "discussion", "label": "Discussion prompts", "description": "In-class or async questions"},
    ]


@router.post("/chat", response_model=TeachingAssistantChatResponse)
def teaching_assistant_chat(
    body: TeachingAssistantChatRequest,
    current_user: User = Depends(require_teaching_assistant_access),
    db: Session = Depends(get_db),
) -> TeachingAssistantChatResponse:
    task = body.task if body.task in VALID_TASKS else "general"

    try:
        provider = get_provider(
            provider_name=body.provider,
            model=body.model,
            base_url=body.base_url,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    teaching_context = load_teaching_context(
        db,
        instructor_id=current_user.id,
        class_id=body.class_id,
        module_id=body.module_id,
        assignment_id=body.assignment_id,
        submission_id=body.submission_id,
    )

    system_prompt = build_teaching_assistant_system_prompt(
        task=task,
        teaching_context=teaching_context or None,
    )

    history = [{"role": m.role, "content": m.content} for m in body.messages]
    user_prompt = format_assistant_chat_history(history)

    try:
        raw_reply = _call_with_retry(provider, system_prompt, user_prompt)
    except RuntimeError as exc:
        msg = str(exc)
        logger.error("Teaching assistant RuntimeError: %s\n%s", msg, traceback.format_exc())
        if "not reachable" in msg.lower():
            raise HTTPException(status_code=503, detail=msg)
        raise HTTPException(status_code=500, detail=f"Teaching assistant failed: {msg}")
    except Exception as exc:
        msg = str(exc)
        logger.error(
            "Teaching assistant Exception [%s]: %s\n%s",
            type(exc).__name__,
            msg,
            traceback.format_exc(),
        )
        if any(k in msg.lower() for k in _AUTH_KEYS):
            raise HTTPException(
                status_code=503,
                detail="LLM provider is not configured. Set API keys in the backend environment.",
            )
        raise HTTPException(status_code=500, detail=f"Teaching assistant failed: {msg}")

    reply, artifacts = parse_artifacts(raw_reply.strip())
    return TeachingAssistantChatResponse(reply=reply, artifacts=artifacts)
