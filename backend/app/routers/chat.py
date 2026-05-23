"""
Chat endpoint — conversational AI assistance about the current architecture.
"""

import logging
import time
import traceback

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

logger = logging.getLogger(__name__)

from app.models.graph import Graph
from app.services.llm.factory import get_provider
from app.services.prompt_builder import build_architecture_context

router = APIRouter(prefix="/chat", tags=["chat"])

_MAX_RETRIES = 2
_RETRY_BASE_SECONDS = 1.0
_AUTH_KEYS = ("401", "unauthorized", "invalid api key", "authentication")

_SYSTEM_PROMPT = (
    "You are an expert AWS cloud architect and Terraform engineer embedded in Archon, "
    "a visual AWS infrastructure design tool.\n\n"
    "The user's current architecture is described below. Use this context to answer "
    "questions, suggest improvements, explain trade-offs, identify issues, and help "
    "with Terraform snippets. Be concise but precise. If you reference specific "
    "components, use their labels.\n\n"
    "{architecture_context}"
)


def _build_system_prompt(graph: Graph) -> str:
    context = build_architecture_context(graph)
    return _SYSTEM_PROMPT.format(architecture_context=context)


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    graph: Graph
    messages: list[ChatMessage]
    provider: str | None = None
    api_key: str | None = None
    model: str | None = None
    base_url: str | None = None


class ChatResponse(BaseModel):
    reply: str


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
    raise last_exc


@router.post("", response_model=ChatResponse)
def chat(body: ChatRequest) -> ChatResponse:
    if not body.messages:
        raise HTTPException(status_code=400, detail="No messages provided.")

    try:
        provider = get_provider(
            provider_name=body.provider,
            api_key=body.api_key,
            model=body.model,
            base_url=body.base_url,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    system_prompt = _build_system_prompt(body.graph)
    user_prompt = "\n\n".join(
        f"{'User' if m.role == 'user' else 'Assistant'}: {m.content}"
        for m in body.messages
    ).strip()

    try:
        reply = _call_with_retry(provider, system_prompt, user_prompt)
    except RuntimeError as exc:
        msg = str(exc)
        logger.error("Chat RuntimeError: %s\n%s", msg, traceback.format_exc())
        if "not reachable" in msg:
            raise HTTPException(status_code=503, detail=msg)
        raise HTTPException(status_code=500, detail=f"Chat failed: {msg}")
    except Exception as exc:
        msg = str(exc)
        logger.error("Chat Exception [%s]: %s\n%s", type(exc).__name__, msg, traceback.format_exc())
        if any(k in msg.lower() for k in _AUTH_KEYS):
            raise HTTPException(status_code=401, detail="Invalid API key.")
        raise HTTPException(status_code=500, detail=f"Chat failed: {msg}")

    return ChatResponse(reply=reply.strip())
