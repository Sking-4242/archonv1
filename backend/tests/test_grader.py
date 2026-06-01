"""Unit tests for the assignment rubric grader."""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.services.academy.grader import grade


def _node(node_id: str, aws_type: str, **data_extra):
    return {
        "id": node_id,
        "type": aws_type.replace(" ", "_"),
        "data": {"awsType": aws_type, **data_extra},
    }


def test_min_security_groups_passes():
    graph = {"nodes": [], "edges": [], "securityGroups": [{"id": "sg-1", "inbound": []}]}
    rubric = [{"label": "SG", "type": "min_security_groups", "params": {"count": 1}, "points": 10}]
    earned, total, results = grade(graph, rubric)
    assert earned == 10
    assert results[0]["passed"] is True


def test_nodes_have_iam_roles_passes():
    graph = {
        "nodes": [_node("l1", "lambda", iam_role_id="role-1")],
        "edges": [],
        "iamRoles": [{"id": "role-1", "name": "lambda-exec"}],
    }
    rubric = [{
        "label": "Lambda role",
        "type": "nodes_have_iam_roles",
        "params": {"component_types": ["lambda"]},
        "points": 10,
    }]
    earned, _, results = grade(graph, rubric)
    assert earned == 10
    assert results[0]["passed"] is True


def test_nodes_have_security_groups_fails_without_assignment():
    graph = {
        "nodes": [_node("e1", "ec2")],
        "edges": [],
        "securityGroups": [{"id": "sg-1", "inbound": []}],
    }
    rubric = [{
        "label": "EC2 SG",
        "type": "nodes_have_security_groups",
        "params": {"component_types": ["ec2"]},
        "points": 10,
    }]
    earned, _, results = grade(graph, rubric)
    assert earned == 0
    assert results[0]["passed"] is False


def test_component_config_encryption():
    graph = {
        "nodes": [
            _node("r1", "rds", config={"storage_encrypted": True, "publicly_accessible": False}),
        ],
        "edges": [],
    }
    rubric = [
        {
            "label": "RDS encrypted",
            "type": "component_config",
            "params": {
                "component_type": "rds",
                "config_key": "storage_encrypted",
                "expected": True,
            },
            "points": 10,
        },
        {
            "label": "RDS private",
            "type": "component_config",
            "params": {
                "component_type": "rds",
                "config_key": "publicly_accessible",
                "expected": False,
            },
            "points": 10,
        },
    ]
    earned, total, results = grade(graph, rubric)
    assert earned == total == 20
    assert all(r["passed"] for r in results)


def test_security_port_restricted_blocks_ssh():
    graph = {
        "nodes": [],
        "edges": [],
        "securityGroups": [{
            "id": "sg-1",
            "name": "web",
            "inbound": [{"port": 22, "source": "0.0.0.0/0", "protocol": "tcp"}],
        }],
    }
    rubric = [{
        "label": "No public SSH",
        "type": "security_port_restricted",
        "params": {"port": 22},
        "points": 10,
    }]
    earned, _, results = grade(graph, rubric)
    assert earned == 0
    assert results[0]["passed"] is False
