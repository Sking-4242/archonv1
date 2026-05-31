"""Tests for GCP prompt builder — resource map coverage and hint generation."""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.models.graph import Component, Edge, Graph
from app.services.gcp_prompt_builder import build_gcp_prompt, _get_gcp_resource_hint
from app.services.gcp_resource_map import _GCP_RESOURCE_MAP


def _pos():
    return {"x": 0, "y": 0}


def _comp(cid, ctype, label=None, config=None):
    return Component(
        id=cid,
        type=ctype,
        label=label or cid,
        position=_pos(),
        config=config or {},
    )


class TestGcpResourceMapCoverage:
    def test_map_has_all_palette_types(self):
        # 61 canvas types from gcpPalette.js
        assert len(_GCP_RESOURCE_MAP) >= 61

    def test_all_entries_have_required_keys(self):
        required = {"primary", "companions", "key_vars", "outputs", "notes"}
        for name, spec in _GCP_RESOURCE_MAP.items():
            missing = required - spec.keys()
            assert not missing, f"Entry '{name}' missing keys: {missing}"

    def test_gce_in_map(self):
        assert "gcp_gce" in _GCP_RESOURCE_MAP
        assert "google_compute_instance" in _GCP_RESOURCE_MAP["gcp_gce"]["primary"]

    def test_cloudsql_in_map(self):
        assert "gcp_cloudsql" in _GCP_RESOURCE_MAP


class TestGcpResourceHints:
    def test_gke_hint_includes_node_pool(self):
        hints = _get_gcp_resource_hint("gcp_gke")
        text = "\n".join(hints)
        assert "google_container_node_pool" in text

    def test_gcs_hint_includes_public_access_prevention(self):
        hints = _get_gcp_resource_hint("gcp_gcs")
        text = "\n".join(hints)
        assert "public_access_prevention" in text


class TestBuildGcpPrompt:
    def test_user_prompt_includes_hints(self):
        graph = Graph(
            id="g1",
            name="Test GCP",
            provider="gcp",
            region="us-central1",
            components=[_comp("sql-1", "gcp_cloudsql", "main-db")],
            edges=[],
            security_groups=[],
            iam_roles=[],
        )
        _, user = build_gcp_prompt(graph)
        assert "google_sql_database_instance" in user
        assert "gcp_cloudsql" in user

    def test_user_prompt_includes_firewall_rules(self):
        from app.models.graph import InboundRule, SecurityGroup

        sg = SecurityGroup(
            id="fw-1",
            name="allow-web",
            description="Allow HTTPS",
            vpc_id="vpc-1",
            inbound=[InboundRule(protocol="tcp", port=443, source="0.0.0.0/0")],
        )
        graph = Graph(
            id="g1",
            name="Web",
            provider="gcp",
            region="us-central1",
            components=[_comp("lb-1", "gcp_lb")],
            edges=[],
            security_groups=[sg],
            iam_roles=[],
        )
        _, user = build_gcp_prompt(graph)
        assert "allow-web" in user
        assert "443" in user
