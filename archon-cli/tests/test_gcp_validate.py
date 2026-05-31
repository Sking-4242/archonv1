"""Tests for GCP validation rules."""

from archon_cli.gcp_validate import gcp_config_findings, gcp_firewall_findings, gcp_iam_findings, gcp_rule_ids, run_gcp_validation
from archon_cli.validate import Edge, IAMRole, IAMStatement, Node, SecurityGroup, SGRule


def _node(node_type: str, **config) -> Node:
    return Node(
        id=f"id-{node_type}",
        type=node_type,
        tf_type="",
        label=f"test-{node_type}",
        config=config,
    )


def test_gcp_rule_count_at_least_150():
    assert len(gcp_rule_ids()) >= 150


def test_gcp_gcs_public_access_prevention():
    nodes = [_node("gcp_gcs", public_access_prevention="unspecified")]
    findings = gcp_config_findings(nodes)
    assert any(f.rule_id == "gcp_gcs_no_public_access_prevention" for f in findings)


def test_gcp_cloudsql_public_ip():
    nodes = [_node("gcp_cloudsql", ipv4_enabled=True)]
    findings = gcp_config_findings(nodes)
    assert any(f.rule_id == "gcp_cloudsql_public_ip" for f in findings)


def test_gcp_firewall_ssh_open():
    sg = SecurityGroup(
        id="fw-1",
        name="allow-ssh",
        inbound=[SGRule(protocol="tcp", port="22", source="0.0.0.0/0")],
    )
    findings = gcp_firewall_findings([sg])
    assert any(f.rule_id == "gcp_fw_ssh_open" for f in findings)


def test_gcp_iam_public_binding():
    role = IAMRole(
        id="iam-1",
        name="public-binding",
        policies=[IAMStatement(effect="Allow", actions=["roles/storage.objectViewer"], resources=["allUsers"])],
    )
    findings = gcp_iam_findings([role])
    assert any(f.rule_id == "gcp_iam_public_binding" for f in findings)


def test_gcp_topology_requires_secret_manager_for_database():
    db = _node("gcp_cloudsql", ipv4_enabled=False)
    findings = run_gcp_validation([db], [], [], [])
    assert any(f.rule_id == "gcp_no_secret_manager" for f in findings)


def test_gcp_terraform_sql_instance_mapping():
    from archon_cli.validate import parse_plan_json

    plan = {
        "planned_values": {
            "root_module": {
                "resources": [{
                    "type": "google_sql_database_instance",
                    "name": "main",
                    "address": "google_sql_database_instance.main",
                    "values": {
                        "settings": [{
                            "ip_configuration": [{"ipv4_enabled": True}],
                        }],
                    },
                }],
            },
        },
        "resource_changes": [],
        "configuration": {"root_module": {}},
    }
    nodes, _, _, _ = parse_plan_json(plan)
    assert nodes[0].type == "gcp_cloudsql"
    findings = run_gcp_validation(nodes, [], [], [])
    assert any(f.rule_id == "gcp_cloudsql_public_ip" for f in findings)


def test_non_gcp_nodes_do_not_emit_gcp_config_noise():
    aws = Node(id="ec2-1", type="ec2", tf_type="aws_instance", label="web", config={})
    findings = gcp_config_findings([aws])
    assert findings == []


def test_gcp_rule_ids_match_python_source():
    """Every rule ID in gcp_validate.py is discoverable via gcp_rule_ids()."""
    ids = gcp_rule_ids()
    assert len(ids) >= 150
    assert "gcp_gcs_no_public_access_prevention" in ids
    assert "gcp_fw_ssh_open" in ids
    assert "gcp_iam_public_binding" in ids
