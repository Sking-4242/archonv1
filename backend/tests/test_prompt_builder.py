"""Tests for the prompt builder service."""

from app.models.graph import Component, Graph
from app.services.prompt_builder import build_prompt


def _make_graph(components=None, edges=None):
    return Graph(
        id="test-graph",
        name="Test Architecture",
        provider="aws",
        region="us-east-1",
        components=components or [],
        edges=edges or [],
        security_groups=[],
        iam_roles=[],
    )


class TestBuildPrompt:
    def test_returns_two_strings(self):
        graph = _make_graph()
        system_prompt, user_prompt = build_prompt(graph)
        assert isinstance(system_prompt, str)
        assert isinstance(user_prompt, str)

    def test_system_prompt_not_empty(self):
        graph = _make_graph()
        system_prompt, _ = build_prompt(graph)
        assert len(system_prompt) > 0

    def test_user_prompt_contains_arch_name(self):
        graph = _make_graph()
        _, user_prompt = build_prompt(graph)
        assert "Test Architecture" in user_prompt

    def test_user_prompt_contains_region(self):
        graph = _make_graph()
        _, user_prompt = build_prompt(graph)
        assert "us-east-1" in user_prompt

    def test_component_label_in_prompt(self):
        component = Component(
            id="c1",
            type="ec2",
            label="WebServer",
            position={"x": 0, "y": 0},
            config={},
            security_group_ids=[],
        )
        graph = _make_graph(components=[component])
        _, user_prompt = build_prompt(graph)
        assert "WebServer" in user_prompt
