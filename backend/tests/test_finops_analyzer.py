"""Tests for FinOps analyzer, AWS helpers, and Terraform generation."""

import os
import sys
from unittest.mock import MagicMock, patch

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.models.graph import Component, Graph
from app.services.finops_analyzer import analyze_finops, parse_cost_explorer_csv
from app.services.finops_aws import parse_utilization_csv
from app.services.finops_terraform import generate_terraform_diff


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


class TestParseCostExplorerCsv:
    def test_parses_service_summary(self):
        csv_text = (
            "Service,Unblended Cost\n"
            '"Amazon Elastic Compute Cloud - Compute","$100.00"\n'
            '"Amazon Simple Storage Service","$25.50"\n'
        )
        parsed = parse_cost_explorer_csv(csv_text)
        assert parsed is not None
        assert parsed["ec2"] == 100.0
        assert parsed["s3"] == 25.5


class TestParseUtilizationCsv:
    def test_parses_component_metrics(self):
        text = "component_id,cpu_avg_percent,memory_avg_percent\nweb,15.5,40\n"
        parsed = parse_utilization_csv(text)
        assert parsed == {"web": {"cpu_avg_percent": 15.5, "memory_avg_percent": 40.0}}


class TestAnalyzeFinops:
    def test_ec2_rightsize_on_low_cpu(self):
        graph = Graph(
            id="g1",
            name="Test",
            provider="aws",
            region="us-east-1",
            components=[_comp("web", "ec2", config={"instance_type": "t3.large"})],
            edges=[],
            security_groups=[],
            iam_roles=[],
        )
        report = analyze_finops(
            graph,
            line_items=[
                {
                    "component_id": "web",
                    "component_type": "ec2",
                    "monthly_cost": 60.0,
                }
            ],
            utilization={"web": {"cpu_avg_percent": 15}},
        )
        ids = [r.id for r in report.recommendations]
        assert any("finops_ec2_rightsize" in rid for rid in ids)
        assert report.total_savings_monthly > 0

    def test_rds_rightsize_on_low_cpu(self):
        graph = Graph(
            id="g1",
            name="Test",
            provider="aws",
            region="us-east-1",
            components=[_comp("db", "rds", config={"instance_class": "db.t3.medium"})],
            edges=[],
            security_groups=[],
            iam_roles=[],
        )
        report = analyze_finops(
            graph,
            line_items=[{"component_id": "db", "component_type": "rds", "monthly_cost": 80.0}],
            utilization={"db": {"cpu_avg_percent": 10}},
        )
        assert any(r.id.startswith("finops_rds_rightsize") for r in report.recommendations)

    def test_ebs_gp2_recommendation(self):
        graph = Graph(
            id="g1",
            name="Test",
            provider="aws",
            region="us-east-1",
            components=[_comp("disk", "ebs", config={"volume_type": "gp2"})],
            edges=[],
            security_groups=[],
            iam_roles=[],
        )
        report = analyze_finops(
            graph,
            line_items=[{"component_id": "disk", "component_type": "ebs", "monthly_cost": 10.0}],
        )
        assert any(r.id.startswith("finops_ebs_gp3") for r in report.recommendations)

    def test_actual_vs_modeled_variance(self):
        graph = Graph(
            id="g1",
            name="Test",
            provider="aws",
            region="us-east-1",
            components=[_comp("web", "ec2")],
            edges=[],
            security_groups=[],
            iam_roles=[],
        )
        report = analyze_finops(
            graph,
            line_items=[{"component_id": "web", "component_type": "ec2", "monthly_cost": 50.0}],
            actual_costs={"ec2": 120.0},
        )
        assert any("finops_actual_over_modeled" in r.id for r in report.recommendations)


class TestFinopsTerraform:
    def test_generates_gp3_block(self):
        graph = Graph(
            id="g1",
            name="Test",
            provider="aws",
            region="us-east-1",
            components=[_comp("disk", "ebs", label="Data Volume")],
            edges=[],
            security_groups=[],
            iam_roles=[],
        )
        recs = [
            {
                "id": "finops_ebs_gp3::disk",
                "title": "EBS gp2 → gp3 upgrade",
                "componentIds": ["disk"],
                "terraformHint": 'volume_type = "gp3"',
            }
        ]
        hcl = generate_terraform_diff(graph, recs)
        assert "aws_ebs_volume" in hcl
        assert 'volume_type = "gp3"' in hcl


class TestFinopsCloudWatch:
    @patch("app.services.finops_aws._get_boto3_session")
    def test_fetch_cloudwatch_ec2(self, mock_session_fn):
        from app.services.finops_aws import fetch_cloudwatch_utilization

        mock_cw = MagicMock()
        mock_cw.get_metric_statistics.return_value = {
            "Datapoints": [{"Average": 12.5}],
        }
        mock_session = MagicMock()
        mock_session.client.return_value = mock_cw
        mock_session_fn.return_value = (mock_session, None)

        graph = Graph(
            id="g1",
            name="Test",
            provider="aws",
            region="us-east-1",
            components=[_comp("web", "ec2", config={"instance_id": "i-abc123"})],
            edges=[],
            security_groups=[],
            iam_roles=[],
        )
        util, status = fetch_cloudwatch_utilization(graph, days=7)
        assert status["state"] == "ok"
        assert util["web"]["cpu_avg_percent"] == 12.5
