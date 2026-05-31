"""Tests for on-premises validation rules."""

from archon_cli.onprem_validate import (
    onprem_config_findings,
    onprem_firewall_findings,
    onprem_rule_ids,
    onprem_topology_findings,
    run_onprem_validation,
)
from archon_cli.validate import Edge, Node, SecurityGroup, SGRule


def _node(node_type: str, **config) -> Node:
    return Node(
        id=f"id-{node_type}",
        type=node_type,
        tf_type="",
        label=f"test-{node_type}",
        config=config,
    )


def test_onprem_rule_count_at_least_30():
    assert len(onprem_rule_ids()) >= 30


def test_onprem_firewall_ha_disabled():
    nodes = [_node("onprem_firewall", ha_mode=False)]
    findings = onprem_config_findings(nodes)
    assert any(f.rule_id == "onprem_firewall_ha_disabled" for f in findings)


def test_onprem_k8s_single_control_plane():
    nodes = [_node("onprem_k8s", control_plane_nodes=1)]
    findings = onprem_config_findings(nodes)
    assert any(f.rule_id == "onprem_k8s_single_control_plane" for f in findings)


def test_onprem_object_store_low_replication():
    nodes = [_node("onprem_object_store", replication=2)]
    findings = onprem_config_findings(nodes)
    assert any(f.rule_id == "onprem_object_store_low_replication" for f in findings)


def test_onprem_proxy_tls_off():
    nodes = [_node("onprem_proxy", tls_termination=False)]
    findings = onprem_config_findings(nodes)
    assert any(f.rule_id == "onprem_proxy_tls_off" for f in findings)


def test_onprem_fw_ssh_open():
    sg = SecurityGroup(
        id="fw-1",
        name="allow-ssh",
        inbound=[SGRule(protocol="tcp", port="22", source="0.0.0.0/0")],
    )
    findings = onprem_firewall_findings([sg])
    assert any(f.rule_id == "onprem_fw_ssh_open" for f in findings)


def test_onprem_fw_all_traffic_open():
    sg = SecurityGroup(
        id="fw-2",
        name="allow-all",
        inbound=[SGRule(protocol="all", port="-1", source="0.0.0.0/0")],
    )
    findings = onprem_firewall_findings([sg])
    assert any(f.rule_id == "onprem_fw_all_traffic_open" for f in findings)


def test_onprem_topology_db_no_vault():
    db = _node("onprem_postgres", ha_mode="streaming_replication")
    findings = run_onprem_validation([db], [], [], [])
    assert any(f.rule_id == "onprem_db_no_vault" for f in findings)


def test_hybrid_no_vpn():
    onprem = _node("onprem_vm")
    onprem.id = "op-1"
    cloud = _node("aws_ec2")
    cloud.id = "aws-1"
    edges = [Edge(source="op-1", target="aws-1")]
    findings = onprem_topology_findings([onprem, cloud], edges)
    assert any(f.rule_id == "hybrid_no_vpn" for f in findings)


def test_hybrid_with_vpn_no_flag():
    onprem = _node("onprem_vm")
    onprem.id = "op-1"
    cloud = _node("aws_ec2")
    cloud.id = "aws-1"
    vpn = _node("onprem_vpn", ha_mode=True)
    edges = [Edge(source="op-1", target="aws-1")]
    findings = onprem_topology_findings([onprem, cloud, vpn], edges)
    assert not any(f.rule_id == "hybrid_no_vpn" for f in findings)


def test_non_onprem_nodes_do_not_emit_onprem_config_noise():
    aws = Node(id="ec2-1", type="ec2", tf_type="aws_instance", label="web", config={})
    findings = onprem_config_findings([aws])
    assert findings == []


def test_run_validation_integrates_onprem_rules():
    from archon_cli.validate import run_validation

    nodes = [_node("onprem_firewall", ha_mode=False)]
    findings = run_validation(nodes, [], [], [])
    assert any(f.rule_id == "onprem_firewall_ha_disabled" for f in findings)
