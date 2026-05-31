"""Prompt construction for the Academy AI tutor."""

from __future__ import annotations

from app.models.graph import Graph
from app.services.prompt_builder import build_architecture_context

_MAX_LESSON_CHARS = 12_000

_TUTOR_BASE = """You are the Archon Academy AI tutor — a patient cloud architecture instructor.

Your job is to help students learn AWS and cloud concepts from the current lesson or lab.
Use plain language. Prefer short paragraphs and bullet points when helpful.

Teaching rules:
- Default to hint-first coaching: ask guiding questions, point to concepts, and suggest next steps.
- Do NOT give away full assignment or lab solutions in one shot unless the student has clearly
  struggled through multiple hints and explicitly asks for the answer.
- When reviewing canvas work, reference specific components by label and explain what is missing,
  misconfigured, or could be improved — do not just say "add more security".
- Stay within the scope of the lesson/module when possible.
- If you are unsure, say so and suggest which module topic to review.
"""


def _truncate(text: str | None, limit: int = _MAX_LESSON_CHARS) -> str:
    if not text:
        return ""
    text = text.strip()
    if len(text) <= limit:
        return text
    return text[: limit - 3].rstrip() + "..."


def build_tutor_system_prompt(
    *,
    context_type: str = "lesson",
    lesson_title: str | None = None,
    lesson_content: str | None = None,
    module_title: str | None = None,
    assignment_brief: str | None = None,
    rubric: list | None = None,
    hint_mode: bool = True,
    graph: Graph | None = None,
) -> str:
    parts = [_TUTOR_BASE]

    if hint_mode:
        parts.append(
            "Hint mode is ON: start with clues and Socratic questions. "
            "Reveal at most one concrete step at a time."
        )
    else:
        parts.append(
            "Hint mode is OFF: you may give direct explanations, but still teach the reasoning."
        )

    context_lines = [f"Context type: {context_type}"]
    if module_title:
        context_lines.append(f"Module: {module_title}")
    if lesson_title:
        context_lines.append(f"Lesson/Lab: {lesson_title}")
    if assignment_brief:
        context_lines.append(f"Assignment brief:\n{_truncate(assignment_brief, 4000)}")
    if rubric:
        rubric_text = "\n".join(
            f"- {item.get('label', item)} ({item.get('points', '?')} pts)"
            for item in rubric
            if isinstance(item, dict)
        )
        if rubric_text:
            context_lines.append(f"Grading rubric:\n{rubric_text}")

    content = _truncate(lesson_content)
    if content:
        context_lines.append(f"Lesson content:\n{content}")

    parts.append("--- Curriculum context ---\n" + "\n\n".join(context_lines))

    if graph and graph.components:
        parts.append(
            "--- Student canvas (current architecture) ---\n"
            + build_architecture_context(graph)
        )
    elif context_type in ("lab", "assignment"):
        parts.append(
            "No canvas state was provided yet. Coach from the lesson/assignment text and "
            "encourage the student to build on the canvas or ask again after adding components."
        )

    return "\n\n".join(parts)


def format_chat_history(messages: list[dict[str, str]]) -> str:
    lines = []
    for message in messages:
        role = message.get("role", "user")
        label = "Student" if role == "user" else "Tutor"
        content = (message.get("content") or "").strip()
        if content:
            lines.append(f"{label}: {content}")
    return "\n\n".join(lines)
