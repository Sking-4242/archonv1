"""Tests for Azure validation rules."""

from archon_cli.azure_validate import (
    azure_config_findings,
    azure_iam_findings,
    azure_nsg_findings,
    azure_rule_ids,
    run_azure_validation,
)
from archon_cli.validate import Edge, IAMRole, IAMStatement, Node, SecurityGroup, SGRule


def _node(node_type: str, **config) -> Node:
    return Node(
        id=f"id-{node_type}",
        type=node_type,
        tf_type="",
        label=f"test-{node_type}",
        config=config,
    )


def test_azure_rule_count_at_least_150():
    assert len(azure_rule_ids()) >= 150


def test_azure_vm_password_auth():
    nodes = [_node("azure_vm", disable_password_authentication=False)]
    findings = azure_config_findings(nodes)
    assert any(f.rule_id == "azure_vm_password_auth" for f in findings)


def test_azure_sql_tde_disabled():
    nodes = [_node("azure_sql", transparent_data_encryption_enabled=False)]
    findings = azure_config_findings(nodes)
    assert any(f.rule_id == "azure_sql_tde_disabled" for f in findings)


def test_azure_nsg_ssh_open():
    sg = SecurityGroup(
        id="nsg-1",
        name="allow-ssh",
        inbound=[SGRule(protocol="tcp", port="22", source="0.0.0.0/0")],
    )
    findings = azure_nsg_findings([sg])
    assert any(f.rule_id == "azure_nsg_ssh_open" for f in findings)


def test_azure_nsg_elasticsearch_open():
    sg = SecurityGroup(
        id="nsg-2",
        name="allow-es",
        inbound=[SGRule(protocol="tcp", port="9200", source="0.0.0.0/0")],
    )
    findings = azure_nsg_findings([sg])
    assert any(f.rule_id == "azure_nsg_elasticsearch_open" for f in findings)


def test_azure_nsg_icmp_open():
    sg = SecurityGroup(
        id="nsg-3",
        name="allow-icmp",
        inbound=[SGRule(protocol="icmp", port="-1", source="0.0.0.0/0")],
    )
    findings = azure_nsg_findings([sg])
    assert any(f.rule_id == "azure_nsg_icmp_open" for f in findings)


def test_azure_iam_owner_binding():
    role = IAMRole(
        id="iam-1",
        name="owner-binding",
        policies=[IAMStatement(effect="Allow", actions=["Owner"], resources=["/subscriptions/xxx"])],
    )
    findings = azure_iam_findings([role])
    assert any(f.rule_id == "azure_iam_owner_binding" for f in findings)


def test_azure_iam_public_principal():
    role = IAMRole(
        id="iam-2",
        name="public-storage",
        policies=[IAMStatement(effect="Allow", actions=["Storage Blob Data Reader"], resources=["allUsers"])],
    )
    findings = azure_iam_findings([role])
    assert any(f.rule_id == "azure_iam_public_principal" for f in findings)


def test_azure_topology_requires_keyvault_for_database():
    db = _node("azure_sql", transparent_data_encryption_enabled=True, auditing_enabled=True)
    findings = run_azure_validation([db], [], [], [])
    assert any(f.rule_id == "azure_no_keyvault" for f in findings)


def test_azure_storage_public_access():
    nodes = [_node("azure_blob", allow_nested_items_to_be_public=True)]
    findings = azure_config_findings(nodes)
    assert any(f.rule_id == "azure_storage_public_access" for f in findings)


def test_non_azure_nodes_do_not_emit_azure_config_noise():
    aws = Node(id="ec2-1", type="ec2", tf_type="aws_instance", label="web", config={})
    findings = azure_config_findings([aws])
    assert findings == []


def test_run_validation_integrates_azure_rules():
    from archon_cli.validate import run_validation

    nodes = [_node("azure_vm", disable_password_authentication=False)]
    findings = run_validation(nodes, [], [], [])
    assert any(f.rule_id == "azure_vm_password_auth" for f in findings)
