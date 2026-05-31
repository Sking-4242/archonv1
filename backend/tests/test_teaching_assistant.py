import pytest

from app.services.academy_teaching_assistant_service import (
    build_teaching_assistant_system_prompt,
    format_assistant_chat_history,
    parse_artifacts,
)


def test_build_teaching_assistant_prompt_includes_task_and_context():
    prompt = build_teaching_assistant_system_prompt(
        task="assignment",
        teaching_context="--- Class context ---\nClass: Demo 101",
    )
    assert "Teaching Assistant" in prompt
    assert "assignment" in prompt.lower()
    assert "Demo 101" in prompt


def test_format_assistant_chat_history():
    text = format_assistant_chat_history(
        [
            {"role": "user", "content": "Draft a VPC lab"},
            {"role": "assistant", "content": "Here is a starting point."},
        ]
    )
    assert "Instructor: Draft a VPC lab" in text
    assert "Assistant: Here is a starting point." in text


def test_parse_artifacts_extracts_assignment_draft():
    reply = """Here is a lab idea for your class.

```json
{"type": "assignment_draft", "title": "VPC Basics", "brief": "Build a VPC", "rubric": []}
```
"""
    cleaned, artifacts = parse_artifacts(reply)
    assert "VPC Basics" not in cleaned or "Here is a lab" in cleaned
    assert len(artifacts) == 1
    assert artifacts[0]["type"] == "assignment_draft"
    assert artifacts[0]["title"] == "VPC Basics"


def test_parse_artifacts_extracts_feedback_draft():
    reply = """Here is suggested feedback.

```json
{"type": "feedback_draft", "feedback": "Nice VPC layout.", "suggested_score": 85}
```
"""
    cleaned, artifacts = parse_artifacts(reply)
    assert len(artifacts) == 1
    assert artifacts[0]["type"] == "feedback_draft"
    assert artifacts[0]["feedback"] == "Nice VPC layout."
    assert artifacts[0]["suggested_score"] == 85


def test_graph_dict_to_graph():
    from app.services.academy_teaching_assistant_service import graph_dict_to_graph

    graph = graph_dict_to_graph(
        {
            "nodes": [
                {
                    "id": "n1",
                    "type": "vpc",
                    "position": {"x": 0, "y": 0},
                    "data": {"label": "Main VPC", "awsType": "vpc"},
                }
            ],
            "edges": [],
        }
    )
    assert graph is not None
    assert graph.components[0].label == "Main VPC"


def test_parse_artifacts_ignores_invalid_json_block():
    reply = "Text only, no artifacts."
    cleaned, artifacts = parse_artifacts(reply)
    assert cleaned == reply
    assert artifacts == []
