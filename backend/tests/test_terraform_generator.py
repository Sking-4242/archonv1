"""Tests for the deterministic AWS Terraform scaffold generator."""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.models.graph import (
    Component,
    Edge,
    Graph,
    InboundRule,
    OutboundRule,
    SecurityGroup,
)
from app.services.prompt_builder import build_refinement_prompt
from app.services.terraform_generator import generate_scaffold, tf_name
from app.utils.validators import validate_hcl, validate_scaffold


def _pos():
    return {"x": 0, "y": 0}


def _comp(
    id,
    type,
    label=None,
    config=None,
    sg_ids=None,
    iam_role_id=None,
    subnet_id=None,
    vpc_id=None,
):
    return Component(
        id=id,
        type=type,
        label=label or id,
        position=_pos(),
        config=config or {},
        security_group_ids=sg_ids or [],
        iam_role_id=iam_role_id,
        subnet_id=subnet_id,
        vpc_id=vpc_id,
    )


def _edge(id, source, target, etype="network"):
    return Edge(id=id, source=source, target=target, type=etype)


def _graph(components=None, edges=None, name="TestArch", region="us-east-1", **kwargs):
    return Graph(
        id="g1",
        name=name,
        provider="aws",
        region=region,
        components=components or [],
        edges=edges or [],
        security_groups=kwargs.get("security_groups", []),
        iam_roles=kwargs.get("iam_roles", []),
    )


class TestTfName:
    def test_tf_name_basic(self):
        c = _comp("vpc1", "vpc", label="Production VPC")
        assert tf_name(c) == "production_vpc_vpc1"

    def test_tf_name_special_chars(self):
        c = _comp("n1", "subnet", label="Public Subnet (AZ-1)!")
        name = tf_name(c)
        assert name.startswith("public_subnet_az_1")
        assert "!" not in name

    def test_tf_name_numeric_start(self):
        c = _comp("n1", "ec2", label="123-server")
        name = tf_name(c)
        assert name.startswith("r_123")

    def test_tf_name_collision(self):
        used = set()
        c1 = _comp("a1", "subnet", label="Private Subnet")
        c2 = _comp("a2", "subnet", label="Private Subnet")
        n1 = tf_name(c1, used)
        n2 = tf_name(c2, used)
        assert n1 != n2


class TestGenerateScaffold:
    def test_scaffold_vpc_subnet(self):
        graph = _graph(
            [
                _comp("vpc1", "vpc", label="MainVPC", config={"cidr_block": "10.0.0.0/16"}),
                _comp(
                    "sn1",
                    "subnet",
                    label="PublicSubnet",
                    config={"cidr_block": "10.0.1.0/24"},
                    vpc_id="vpc1",
                ),
            ]
        )
        hcl = generate_scaffold(graph)
        assert 'resource "aws_vpc"' in hcl
        assert 'resource "aws_subnet"' in hcl
        assert "vpc_id = aws_vpc.mainvpc_vpc1.id" in hcl

    def test_explicit_vpc_id_without_edge(self):
        graph = _graph(
            [
                _comp("vpc1", "vpc", label="Core"),
                _comp("sn1", "subnet", label="App", vpc_id="vpc1"),
            ]
        )
        hcl = generate_scaffold(graph)
        assert "vpc_id = aws_vpc.core_vpc1.id" in hcl

    def test_config_override(self):
        graph = _graph(
            [_comp("vpc1", "vpc", label="Main", config={"cidr_block": "172.16.0.0/16"})]
        )
        hcl = generate_scaffold(graph)
        assert 'cidr_block = "172.16.0.0/16"' in hcl

    def test_instance_class_with_dots_is_quoted(self):
        graph = _graph(
            [
                _comp(
                    "db1",
                    "rds",
                    label="AppDB",
                    config={"instance_class": "db.t3.micro", "engine": "postgres"},
                    vpc_id="vpc1",
                ),
                _comp("vpc1", "vpc", label="Main"),
            ]
        )
        hcl = generate_scaffold(graph)
        assert 'instance_class = "db.t3.micro"' in hcl
        assert "instance_class = db.t3.micro" not in hcl
        assert validate_scaffold(hcl) == []

    def test_tf_references_in_attributes_stay_unquoted(self):
        graph = _graph(
            [
                _comp("vpc1", "vpc", label="Main"),
                _comp("sn1", "subnet", label="App", vpc_id="vpc1"),
            ]
        )
        hcl = generate_scaffold(graph)
        assert "vpc_id = aws_vpc.main_vpc1.id" in hcl

    def test_output_description_uses_canvas_id_not_raw_label(self):
        graph = _graph(
            [_comp("nat1", "nat_gateway", label="${local.name}-nat-eip")]
        )
        hcl = generate_scaffold(graph)
        assert 'description = "Canvas component nat1 (nat_gateway)"' in hcl
        assert "${local.name}" not in hcl
        assert validate_scaffold(hcl) == []

    def test_scaffold_with_imported_labels_passes_structural_validation(self):
        graph = _graph(
            [
                _comp(
                    "nat1",
                    "nat_gateway",
                    label="${local.name}-nat-eip",
                    config={"connectivity_type": "public"},
                ),
                _comp(
                    "db1",
                    "rds",
                    label="Primary DB",
                    config={"instance_class": "db.t3.micro"},
                    vpc_id="vpc1",
                ),
                _comp("vpc1", "vpc", label="Main"),
            ]
        )
        hcl = generate_scaffold(graph)
        assert validate_scaffold(hcl) == []
        assert 'instance_class = "db.t3.micro"' in hcl

    def test_edge_wiring_subnet_vpc(self):
        graph = _graph(
            [
                _comp("vpc1", "vpc", label="Net"),
                _comp("sn1", "subnet", label="Public"),
            ],
            [_edge("e1", "sn1", "vpc1")],
        )
        hcl = generate_scaffold(graph)
        assert "vpc_id = aws_vpc.net_vpc1.id" in hcl

    def test_managed_service_no_primary_resource(self):
        graph = _graph([_comp("br1", "bedrock", label="LLM")])
        hcl = generate_scaffold(graph)
        assert "Managed service: bedrock" in hcl
        assert 'resource "aws_bedrock' not in hcl

    def test_scaffold_validates(self):
        graph = _graph(
            [
                _comp("vpc1", "vpc", label="MainVPC", config={"cidr_block": "10.0.0.0/16"}),
                _comp("sn1", "subnet", label="Public", vpc_id="vpc1"),
            ]
        )
        errors = validate_scaffold(generate_scaffold(graph))
        assert errors == []

    def test_no_raw_canvas_ids_as_attribute_values(self):
        graph = _graph(
            [
                _comp("t1-vpc", "vpc", label="Production VPC"),
                _comp(
                    "t1-pub",
                    "subnet",
                    label="Public Subnet",
                    vpc_id="t1-vpc",
                ),
            ]
        )
        hcl = generate_scaffold(graph)
        assert "vpc_id = aws_vpc." in hcl
        assert 'vpc_id = "t1-vpc"' not in hcl
        assert "vpc_id = t1-vpc" not in hcl

    def test_security_group_block(self):
        graph = _graph(
            [_comp("vpc1", "vpc", label="Main")],
            security_groups=[
                SecurityGroup(
                    id="sg1",
                    name="web-sg",
                    description="Web tier",
                    vpc_id="vpc1",
                    inbound=[
                        InboundRule(protocol="tcp", port=443, source="0.0.0.0/0")
                    ],
                    outbound=[
                        OutboundRule(protocol="-1", port=None, source="0.0.0.0/0")
                    ],
                )
            ],
        )
        hcl = generate_scaffold(graph)
        assert 'resource "aws_security_group"' in hcl
        assert "ingress {" in hcl
        assert "egress {" in hcl

    def test_preamble_includes_region_default(self):
        graph = _graph([_comp("vpc1", "vpc", label="Main")], region="eu-west-1")
        hcl = generate_scaffold(graph)
        assert '"eu-west-1"' in hcl
        assert 'data "aws_availability_zones"' in hcl


class TestBuildRefinementPrompt:
    def test_refinement_prompt_includes_scaffold(self):
        graph = _graph([_comp("vpc1", "vpc", label="Main")])
        scaffold = generate_scaffold(graph)
        _, user = build_refinement_prompt(graph, scaffold)
        assert "--- SCAFFOLD ---" in user
        assert scaffold.strip() in user
        assert "Complete and correct the scaffold now" in user

    def test_unresolved_refs_produce_valid_scaffold(self):
        graph = _graph(
            [
                _comp(
                    "ec2a",
                    "ec2",
                    label="Web",
                    vpc_id="missing-vpc",
                    sg_ids=["sg-missing"],
                ),
            ]
        )
        hcl = generate_scaffold(graph)
        assert "# UNRESOLVED" not in hcl
        assert validate_scaffold(hcl) == []
