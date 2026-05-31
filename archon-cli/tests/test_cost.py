"""Unit tests for archon_cli.cost."""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest
from archon_cli.cost import cost_plan_json, _estimate, _action_label


# ─── _estimate tests ──────────────────────────────────────────────────────────


class TestEstimate:
    def test_ec2_t3_micro(self):
        cost, desc = _estimate("ec2", {"instance_type": "t3.micro"})
        assert cost == pytest.approx(7.59, abs=0.01)
        assert "t3.micro" in desc

    def test_ec2_t3_medium(self):
        cost, desc = _estimate("ec2", {"instance_type": "t3.medium"})
        assert cost == pytest.approx(30.37, abs=0.01)
        assert "t3.medium" in desc

    def test_ec2_unknown_type_fallback(self):
        cost, desc = _estimate("ec2", {"instance_type": "z99.superlarge"})
        # Falls back to t3.micro hourly rate
        assert cost is not None
        assert cost > 0

    def test_rds_db_t3_micro(self):
        cost, desc = _estimate("rds", {"instance_class": "db.t3.micro"})
        assert cost == pytest.approx(12.41, abs=0.01)
        assert "db.t3.micro" in desc

    def test_rds_db_m5_large(self):
        cost, desc = _estimate("rds", {"instance_class": "db.m5.large"})
        assert cost == pytest.approx(124.83, abs=0.01)
        assert "db.m5.large" in desc

    def test_s3_flat_price(self):
        cost, desc = _estimate("s3", {})
        assert cost == pytest.approx(2.30, abs=0.01)
        assert cost is not None

    def test_lambda_flat_price(self):
        cost, desc = _estimate("lambda", {})
        assert cost is not None
        assert cost > 0

    def test_vpc_free(self):
        cost, desc = _estimate("vpc", {})
        assert cost is None
        assert "No charge" in desc

    def test_subnet_free(self):
        cost, desc = _estimate("subnet", {})
        assert cost is None

    def test_unknown_type_returns_none(self):
        cost, desc = _estimate("some_totally_unknown_type_xyz", {})
        assert cost is None

    def test_aurora_uses_rds_table(self):
        cost, desc = _estimate("aurora", {"instance_class": "db.r6g.large"})
        assert cost is not None
        assert cost > 0
        assert "Aurora" in desc

    def test_gcp_gce_estimate(self):
        cost, desc = _estimate("gcp_gce", {"machine_type": "e2-medium"})
        assert cost == pytest.approx(24.46, abs=0.05)
        assert "GCE" in desc

    def test_gcp_cloudsql_estimate(self):
        cost, desc = _estimate("gcp_cloudsql", {"tier": "db-f1-micro"})
        assert cost == pytest.approx(10.95, abs=0.05)
        assert "Cloud SQL" in desc

    def test_gcp_gcs_flat_price(self):
        cost, desc = _estimate("gcp_gcs", {})
        assert cost == pytest.approx(20.0, abs=0.01)

    def test_gcp_vpc_free(self):
        cost, desc = _estimate("gcp_vpc", {})
        assert cost is None
        assert "No charge" in desc


# ─── _action_label tests ──────────────────────────────────────────────────────


class TestActionLabel:
    def test_create(self):
        assert _action_label(["create"]) == "create"

    def test_delete(self):
        assert _action_label(["delete"]) == "delete"

    def test_update(self):
        assert _action_label(["update"]) == "update"

    def test_no_op(self):
        assert _action_label(["no-op"]) == "no-op"

    def test_replace_is_delete_then_create(self):
        assert _action_label(["delete", "create"]) == "replace"

    def test_empty_is_no_op(self):
        assert _action_label([]) == "no-op"


# ─── cost_plan_json integration tests ────────────────────────────────────────


def _plan(resource_changes):
    return {"resource_changes": resource_changes}


def _rc(tf_type, address, actions, after=None, before=None):
    return {
        "type": tf_type,
        "address": address,
        "change": {
            "actions": actions,
            "after": after or {},
            "before": before or {},
        },
    }


class TestCostPlanJSON:
    def test_create_ec2(self):
        report = cost_plan_json(_plan([
            _rc("aws_instance", "aws_instance.web", ["create"],
                after={"instance_type": "t3.micro"}),
        ]))
        assert len(report.line_items) == 1
        item = report.line_items[0]
        assert item.action == "create"
        assert item.monthly_cost == pytest.approx(7.59, abs=0.01)

    def test_delete_ec2(self):
        report = cost_plan_json(_plan([
            _rc("aws_instance", "aws_instance.old", ["delete"],
                before={"instance_type": "t3.small"}),
        ]))
        item = report.line_items[0]
        assert item.action == "delete"
        assert item.monthly_cost == pytest.approx(15.18, abs=0.01)

    def test_no_op_skipped(self):
        report = cost_plan_json(_plan([
            _rc("aws_instance", "aws_instance.web", ["no-op"]),
        ]))
        assert len(report.line_items) == 0

    def test_net_delta_positive(self):
        report = cost_plan_json(_plan([
            _rc("aws_instance", "aws_instance.new", ["create"],
                after={"instance_type": "t3.large"}),
            _rc("aws_instance", "aws_instance.old", ["delete"],
                before={"instance_type": "t3.micro"}),
        ]))
        assert report.net_delta > 0
        assert report.added_monthly > report.removed_monthly

    def test_net_delta_negative(self):
        report = cost_plan_json(_plan([
            _rc("aws_instance", "aws_instance.new", ["create"],
                after={"instance_type": "t3.micro"}),
            _rc("aws_instance", "aws_instance.old", ["delete"],
                before={"instance_type": "t3.large"}),
        ]))
        assert report.net_delta < 0

    def test_free_resource_no_cost(self):
        report = cost_plan_json(_plan([
            _rc("aws_vpc", "aws_vpc.main", ["create"]),
        ]))
        assert len(report.line_items) == 1
        assert report.line_items[0].monthly_cost is None

    def test_unmapped_type_still_included(self):
        report = cost_plan_json(_plan([
            _rc("aws_some_new_service", "aws_some_new_service.x", ["create"]),
        ]))
        assert len(report.line_items) == 1
        assert report.line_items[0].monthly_cost is None

    def test_sort_order_create_before_delete(self):
        report = cost_plan_json(_plan([
            _rc("aws_instance", "aws_instance.old", ["delete"],
                before={"instance_type": "t3.micro"}),
            _rc("aws_instance", "aws_instance.new", ["create"],
                after={"instance_type": "t3.micro"}),
        ]))
        actions = [i.action for i in report.line_items]
        assert actions.index("create") < actions.index("delete")

    def test_rds_uses_after_values_for_create(self):
        report = cost_plan_json(_plan([
            _rc("aws_db_instance", "aws_db_instance.db", ["create"],
                after={"instance_class": "db.m5.large"}),
        ]))
        item = report.line_items[0]
        assert item.monthly_cost == pytest.approx(124.83, abs=0.01)
        assert "db.m5.large" in item.description

    def test_rds_uses_before_values_for_delete(self):
        report = cost_plan_json(_plan([
            _rc("aws_db_instance", "aws_db_instance.db", ["delete"],
                before={"instance_class": "db.t3.micro"}),
        ]))
        item = report.line_items[0]
        assert item.action == "delete"
        assert item.monthly_cost == pytest.approx(12.41, abs=0.01)

    def test_to_dict_has_required_keys(self):
        report = cost_plan_json(_plan([
            _rc("aws_instance", "aws_instance.web", ["create"],
                after={"instance_type": "t3.micro"}),
        ]))
        d = report.to_dict()
        for key in ("pricingAsOf", "addedMonthly", "removedMonthly", "netDelta", "totalAfter", "lineItems"):
            assert key in d

    def test_gcp_instance_in_plan(self):
        report = cost_plan_json(_plan([
            _rc("google_compute_instance", "google_compute_instance.web", ["create"],
                after={"machine_type": "e2-medium"}),
        ]))
        assert len(report.line_items) == 1
        item = report.line_items[0]
        assert item.canvas_type == "gcp_gce"
        assert item.monthly_cost == pytest.approx(24.46, abs=0.05)

    def test_gcp_bucket_in_plan(self):
        report = cost_plan_json(_plan([
            _rc("google_storage_bucket", "google_storage_bucket.data", ["create"], after={}),
        ]))
        item = report.line_items[0]
        assert item.canvas_type == "gcp_gcs"
        assert item.monthly_cost == pytest.approx(20.0, abs=0.01)
