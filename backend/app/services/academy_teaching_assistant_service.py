"""Prompt construction and artifact parsing for the instructor teaching assistant."""

from __future__ import annotations

import json
import re
from typing import Any

from sqlalchemy.orm import Session, joinedload

from app.models.academy import Assignment, ClassEnrollment, InstructorClass, Module, Submission
from app.models.graph import Component, Edge, Graph, Position
from app.models.user import User
from app.services.class_service import compute_class_progress
from app.services.prompt_builder import build_architecture_context

_MAX_TEXT = 12_000

_TASK_GUIDANCE = {
    "general": "Help with any instructor workflow: planning, pedagogy, cloud concepts, or Archon Academy features.",
    "assignment": (
        "Design an Archon canvas lab assignment. Include a clear student brief and an auto-gradable rubric "
        "using criterion types like node_count, edge_exists, has_component_type, sg_allows_port, etc."
    ),
    "lesson": (
        "Draft lesson content for an instructor module. Prefer markdown structure with learning objectives, "
        "key concepts, and a short knowledge check."
    ),
    "announcement": "Draft a class announcement — concise, actionable, appropriate tone for students.",
    "at_risk": (
        "Analyze the class progress snapshot and suggest concrete interventions for at-risk students "
        "(office hours topics, remediation modules, check-in email templates)."
    ),
    "rubric": (
        "Design or refine a rubric for an architecture lab. Each criterion needs label, type, params, and points."
    ),
    "feedback": (
        "Help the instructor write constructive grading feedback — specific, encouraging, tied to rubric "
        "criteria and what the student built. When submission context is provided, reference automated "
        "rubric results and architecture gaps. Offer a feedback_draft artifact the instructor can paste."
    ),
    "exam_prep": (
        "Align teaching activities with certification exam domains. Suggest module sequencing and practice focus."
    ),
    "discussion": "Generate discussion prompts or think-pair-share questions for a topic.",
}

_ASSISTANT_BASE = """You are the Archon Academy Teaching Assistant — an expert cloud instructor copilot.

You help instructors (not students) with course design, delivery, and student support inside Archon Academy.

Capabilities:
- Design canvas architecture lab assignments with rubrics Archon can auto-grade
- Outline or draft lesson plans and instructor notes
- Write class announcements and weekly agendas
- Interpret class progress data and recommend interventions for at-risk learners
- Draft rubrics, discussion questions, and exam-alignment plans
- Explain AWS/Azure/GCP concepts at instructor depth for lecture prep
- Suggest feedback language for submissions (without replacing the instructor's judgment)

Rules:
- Be practical: produce copy-paste-ready drafts the instructor can edit
- Ask clarifying questions only when critical details are missing
- For Archon canvas labs, rubric criteria use types such as:
  node_count, edge_exists, has_component_type, component_config, sg_allows_port,
  iam_role_attached, multi_az, uses_service, etc.
- Keep student-facing text separate from instructor notes when both are needed
- Do not invent student PII beyond what appears in the provided class context

When you produce a draft the instructor may import into Archon, append ONE fenced JSON block:

```json
{"type": "assignment_draft", "title": "...", "brief": "...", "rubric": [{"label": "...", "type": "...", "params": {}, "points": 10}]}
```
```json
{"type": "lesson_draft", "title": "...", "content": "markdown...", "lesson_type": "content", "estimated_minutes": 15}
```
```json
{"type": "feedback_draft", "feedback": "student-facing comment...", "suggested_score": 72}
```

Supported artifact types: assignment_draft, lesson_draft, announcement_draft, rubric_draft, feedback_draft.
Only include an artifact when the instructor asked for a draft or would clearly benefit from Apply-in-UI import.
The conversational reply should still read naturally above the JSON block.
"""


def _truncate(text: str | None, limit: int = _MAX_TEXT) -> str:
    if not text:
        return ""
    text = text.strip()
    if len(text) <= limit:
        return text
    return text[: limit - 3].rstrip() + "..."


def graph_dict_to_graph(graph: dict | None) -> Graph | None:
    """Convert a React-flow canvas payload to a Graph model for prompt context."""
    if not graph or not graph.get("nodes"):
        return None

    components: list[Component] = []
    for node in graph.get("nodes", []):
        data = node.get("data") or {}
        pos = node.get("position") or {"x": 0, "y": 0}
        components.append(
            Component(
                id=str(node.get("id", "")),
                type=str(data.get("awsType") or data.get("type") or node.get("type") or "unknown"),
                label=str(data.get("label") or node.get("type") or node.get("id", "")),
                position=Position(x=float(pos.get("x", 0)), y=float(pos.get("y", 0))),
                config=data.get("config") or {},
                security_group_ids=data.get("security_group_ids") or [],
                iam_role_id=data.get("iam_role_id"),
                subnet_id=data.get("subnet_id"),
                vpc_id=data.get("vpc_id"),
                category=str(data.get("category") or ""),
            )
        )

    edges: list[Edge] = []
    for edge in graph.get("edges") or []:
        edge_data = edge.get("data") or {}
        edge_type = edge.get("type") or edge_data.get("type") or "network"
        if edge_type not in ("network", "data_flow", "dependency", "streaming", "batch", "event"):
            edge_type = "network"
        edges.append(
            Edge(
                id=str(edge.get("id", f"{edge.get('source')}-{edge.get('target')}")),
                source=str(edge.get("source", "")),
                target=str(edge.get("target", "")),
                type=edge_type,
                bidirectional=bool(edge_data.get("bidirectional")),
                suggested_rules=edge_data.get("suggested_rules") or [],
            )
        )

    meta = graph.get("graphMeta") or {}
    return Graph(
        id=str(graph.get("id") or "submission"),
        name=str(meta.get("name") or graph.get("name") or "Student submission"),
        provider=str(meta.get("provider") or graph.get("provider") or "aws"),
        region=str(meta.get("region") or graph.get("region") or "us-east-1"),
        components=components,
        edges=edges,
        security_groups=[],
        iam_roles=[],
    )


def load_teaching_context(
    db: Session,
    *,
    instructor_id,
    class_id: int | None = None,
    module_id: int | None = None,
    assignment_id: int | None = None,
    submission_id: int | None = None,
) -> str:
    sections: list[str] = []

    if class_id is not None:
        cls = (
            db.query(InstructorClass)
            .options(joinedload(InstructorClass.enrollments).joinedload(ClassEnrollment.student))
            .filter(
                InstructorClass.id == class_id,
                InstructorClass.instructor_id == instructor_id,
            )
            .first()
        )
        if cls:
            progress = compute_class_progress(db, cls)
            lines = [
                f"Class: {cls.name} (code {cls.class_code}, course {cls.course})",
                f"Students: {progress['student_count']} | At risk: {progress['at_risk_count']} | "
                f"Pending review: {progress['pending_review']}",
            ]
            if progress.get("avg_score_pct") is not None:
                lines.append(f"Class avg score: {progress['avg_score_pct']}%")
            at_risk = [s for s in progress.get("students", []) if s.get("at_risk")]
            if at_risk:
                lines.append("At-risk students:")
                for s in at_risk[:12]:
                    lines.append(
                        f"  - {s.get('student_name', '?')}: "
                        f"{s.get('lesson_completion_pct', 0)}% lessons, "
                        f"{s.get('assignments_submitted', 0)}/{s.get('assignments_total', 0)} labs submitted, "
                        f"{s.get('overdue_assignments', 0)} overdue"
                    )
            sections.append("--- Class context ---\n" + "\n".join(lines))

    if module_id is not None:
        module = db.get(Module, module_id)
        if module:
            lesson_lines = [
                f"Module: {module.title}",
                f"Description: {_truncate(module.description, 2000)}",
                f"Difficulty: {module.difficulty_level} | Published: {module.is_published}",
                f"Certs: {', '.join(module.certification_tags or []) or 'none'}",
                "Lessons:",
            ]
            for lesson in module.lessons[:20]:
                lesson_lines.append(
                    f"  - [{lesson.lesson_type}] {lesson.title} (~{lesson.estimated_minutes} min)"
                )
            sections.append("--- Module context ---\n" + "\n".join(lesson_lines))

    if assignment_id is not None:
        assignment = db.get(Assignment, assignment_id)
        if assignment and assignment.created_by == instructor_id:
            rubric_lines = "\n".join(
                f"  - {c.get('label', '?')} ({c.get('type', '?')}, {c.get('points', 0)} pts)"
                for c in (assignment.rubric or [])
                if isinstance(c, dict)
            )
            sections.append(
                "--- Assignment context ---\n"
                f"Title: {assignment.title}\n"
                f"Brief:\n{_truncate(assignment.brief, 3000)}\n"
                f"Rubric:\n{rubric_lines or '  (empty)'}"
            )

    if submission_id is not None:
        sub = db.get(Submission, submission_id)
        if sub:
            assignment = db.get(Assignment, sub.assignment_id)
            if assignment and assignment.created_by == instructor_id:
                student = db.get(User, sub.student_id)
                student_name = (student.display_name or student.email) if student else "Student"
                lines = [
                    "--- Submission context ---",
                    f"Student: {student_name}",
                    f"Assignment: {assignment.title}",
                    f"Automated score: {sub.automated_score}/{sub.total_points}",
                    f"Instructor score: {sub.instructor_score if sub.instructor_score is not None else '(not set)'}",
                    f"Submitted: {sub.submitted_at.isoformat()}",
                    "Rubric results:",
                ]
                for result in sub.criteria_results or []:
                    if not isinstance(result, dict):
                        continue
                    status = "PASS" if result.get("passed") else "FAIL"
                    lines.append(
                        f"  - [{status}] {result.get('label', '?')}: {result.get('message', '')}"
                    )
                brief = _truncate(assignment.brief, 2000)
                if brief:
                    lines.append(f"Assignment brief:\n{brief}")
                sections.append("\n".join(lines))

                graph = graph_dict_to_graph(sub.graph if isinstance(sub.graph, dict) else None)
                if graph and graph.components:
                    sections.append(
                        "--- Student canvas (submission) ---\n" + build_architecture_context(graph)
                    )

    return "\n\n".join(sections)


def build_teaching_assistant_system_prompt(
    *,
    task: str = "general",
    teaching_context: str | None = None,
) -> str:
    parts = [_ASSISTANT_BASE]
    guidance = _TASK_GUIDANCE.get(task, _TASK_GUIDANCE["general"])
    parts.append(f"Active task focus: {task}\n{guidance}")
    if teaching_context:
        parts.append(teaching_context)
    return "\n\n".join(parts)


def format_assistant_chat_history(messages: list[dict[str, str]]) -> str:
    lines = []
    for message in messages:
        role = message.get("role", "user")
        label = "Instructor" if role == "user" else "Assistant"
        content = (message.get("content") or "").strip()
        if content:
            lines.append(f"{label}: {content}")
    return "\n\n".join(lines)


_ARTIFACT_PATTERN = re.compile(r"```json\s*(\{.*?\})\s*```", re.DOTALL | re.IGNORECASE)

_VALID_TYPES = frozenset(
    {
        "assignment_draft",
        "lesson_draft",
        "announcement_draft",
        "rubric_draft",
        "feedback_draft",
    }
)


def parse_artifacts(reply: str) -> tuple[str, list[dict[str, Any]]]:
    """Extract JSON artifact blocks and return cleaned reply text."""
    artifacts: list[dict[str, Any]] = []

    def _collect(match: re.Match) -> str:
        raw = match.group(1).strip()
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            return match.group(0)
        if isinstance(data, dict) and data.get("type") in _VALID_TYPES:
            artifacts.append(data)
            return ""
        return match.group(0)

    cleaned = _ARTIFACT_PATTERN.sub(_collect, reply).strip()
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
    return cleaned, artifacts
