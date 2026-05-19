"""Tests for the pricing service."""

from app.services.pricing import estimate_component


class TestEstimateComponent:
    def test_ec2_returns_estimate(self):
        result = estimate_component("ec2", {"instance_type": "t3.micro"})
        assert result is not None
        assert result["monthly_cost"] > 0
        assert "description" in result

    def test_rds_returns_estimate(self):
        result = estimate_component("rds", {"instance_class": "db.t3.micro"})
        assert result is not None
        assert result["monthly_cost"] > 0

    def test_s3_returns_estimate(self):
        result = estimate_component("s3", {})
        assert result is not None
        assert result["monthly_cost"] >= 0

    def test_unknown_type_returns_none(self):
        result = estimate_component("not_a_real_component", {})
        assert result is None

    def test_free_resource_returns_none(self):
        # VPC, subnets, and route tables are free
        result = estimate_component("vpc", {})
        assert result is None

    def test_region_param_accepted(self):
        result = estimate_component("ec2", {"instance_type": "t3.micro"}, region="us-west-2")
        assert result is not None
