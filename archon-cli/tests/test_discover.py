"""Tests for AWS discovery and archon import formatting."""

from archon_cli.discover import (
    DiscoveredResource,
    DiscoveryReport,
    infer_discovery_edges,
)
from archon_cli.formatters import format_discover_archon
import io
import json


def _resource(resource_id, canvas_type, **attrs):
    return DiscoveredResource(
        service="Test",
        resource_type="Test",
        resource_id=resource_id,
        name=resource_id,
        region="us-east-1",
        state="available",
        canvas_type=canvas_type,
        attributes=attrs,
    )


def test_infer_discovery_edges_subnet_to_vpc():
    resources = [
        _resource("vpc-111", "vpc"),
        _resource("subnet-222", "subnet", vpc_id="vpc-111"),
    ]
    edges = infer_discovery_edges(resources)
    assert len(edges) == 1
    assert edges[0]["source"] == "subnet-222"
    assert edges[0]["target"] == "vpc-111"
    assert edges[0]["type"] == "network"


def test_infer_discovery_edges_ec2_to_subnet_and_security_group():
    resources = [
        _resource("vpc-111", "vpc"),
        _resource("subnet-222", "subnet", vpc_id="vpc-111"),
        _resource("sg-333", "security_group", vpc_id="vpc-111"),
        _resource(
            "i-444",
            "ec2",
            subnet_id="subnet-222",
            vpc_id="vpc-111",
            security_group_ids=["sg-333"],
        ),
    ]
    edges = infer_discovery_edges(resources)
    pairs = {(e["source"], e["target"], e["type"]) for e in edges}
    assert ("i-444", "subnet-222", "network") in pairs
    assert ("i-444", "sg-333", "dependency") in pairs


def test_format_discover_archon_includes_edges():
    report = DiscoveryReport(region="us-east-1")
    report.resources = [
        _resource("vpc-111", "vpc"),
        _resource("subnet-222", "subnet", vpc_id="vpc-111"),
    ]
    buf = io.StringIO()
    format_discover_archon(report, out=buf)
    data = json.loads(buf.getvalue())
    assert data["reportType"] == "discover"
    assert len(data["nodes"]) == 2
    assert len(data["edges"]) == 1


def test_kms_resources_use_kms_key_canvas_type():
    from archon_cli import discover

    source = open(discover.__file__, encoding="utf-8").read()
    assert 'canvas_type="kms_key"' in source


def test_extended_discoverers_registered():
    from archon_cli.discover import _DISCOVERERS

    assert len(_DISCOVERERS) >= 80
    names = {fn.__name__ for fn in _DISCOVERERS}
    assert "_discover_transit_gateways" in names
    assert "_discover_sagemaker" in names


def test_infer_discovery_edges_transit_gateway_to_vpc():
    resources = [
        _resource("vpc-111", "vpc"),
        _resource(
            "tgw-999",
            "transit_gateway",
            attached_vpc_ids=["vpc-111"],
        ),
    ]
    edges = infer_discovery_edges(resources)
    assert len(edges) == 1
    assert edges[0]["source"] == "tgw-999"
    assert edges[0]["target"] == "vpc-111"


def test_infer_discovery_edges_lambda_vpc():
    fn_arn = "arn:aws:lambda:us-east-1:123:function:api"
    resources = [
        _resource("vpc-111", "vpc"),
        _resource("subnet-222", "subnet", vpc_id="vpc-111"),
        _resource(
            fn_arn,
            "lambda",
            vpc_id="vpc-111",
            subnet_ids=["subnet-222"],
        ),
    ]
    edges = infer_discovery_edges(resources)
    targets = {e["target"] for e in edges}
    assert "vpc-111" in targets
    assert "subnet-222" in targets
