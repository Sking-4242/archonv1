import pytest

from app.services.academy_tutor_service import build_tutor_system_prompt, format_chat_history


def test_build_tutor_system_prompt_includes_lesson_and_hint_mode():
    prompt = build_tutor_system_prompt(
        context_type="lesson",
        lesson_title="What is VPC?",
        lesson_content="A VPC is an isolated network in AWS.",
        module_title="VPC Fundamentals",
        hint_mode=True,
    )
    assert "Hint mode is ON" in prompt
    assert "What is VPC?" in prompt
    assert "isolated network" in prompt
    assert "VPC Fundamentals" in prompt


def test_build_tutor_system_prompt_includes_canvas():
    from app.models.graph import Graph

    graph = Graph(
        id="g1",
        name="Lab",
        components=[
            {
                "id": "c1",
                "type": "vpc",
                "label": "Main VPC",
                "position": {"x": 0, "y": 0},
                "config": {},
            }
        ],
        edges=[],
    )
    prompt = build_tutor_system_prompt(
        context_type="lab",
        lesson_title="VPC Lab",
        graph=graph,
    )
    assert "Main VPC" in prompt
    assert "Student canvas" in prompt


def test_format_chat_history():
    text = format_chat_history(
        [
            {"role": "user", "content": "What is an AZ?"},
            {"role": "assistant", "content": "Think about redundancy first."},
        ]
    )
    assert "Student: What is an AZ?" in text
    assert "Tutor: Think about redundancy first." in text
