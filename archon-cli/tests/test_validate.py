"""Unit tests for archon_cli.validate."""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest
from archon_cli.validate import (
    validate_plan_json,
    parse_plan_json,
    run_validation,
    Node,
    Edge,
    SecurityGroup,
    IAMRole,
    IAMStatement,
    SGRule,
)


# ─── Helpers ──────────────────────────────────────────────────────────────────


def _plan(resources):
    """Build a minimal TF plan JSON from a list of resource dicts."""
    return {
        "planned_values": {"root_module": {"resources": resources}},
        "configuration": {"root_module": {"resources": []}},
    }


def _r(tf_type, name, values=None):
    addr = f"{tf_type}.{name}"
    return {"type": tf_type, "name": name, "address": addr, "values": values or {}}


def _findings_by_rule(findings):
    return {f.rule_id for f in findings}


# ─── Config rule tests ────────────────────────────────────────────────────────


class TestConfigRules:
    def test_rds_publicly_accessible(self):
        findings = validate_plan_json(_plan([
            _r("aws_db_instance", "db", {"publicly_accessible": True}),
        ]))
        assert "rds_publicly_accessible" in _findings_by_rule(findings)

    def test_rds_not_publicly_accessible_no_finding(self):
        findings = validate_plan_json(_plan([
            _r("aws_db_instance", "db", {"publicly_accessible": False}),
        ]))
        assert "rds_publicly_accessible" not in _findings_by_rule(findings)

    def test_rds_unencrypted(self):
        findings = validate_plan_json(_plan([
            _r("aws_db_instance", "db", {"storage_encrypted": False}),
        ]))
        assert "rds_unencrypted" in _findings_by_rule(findings)

    def test_rds_encrypted_no_finding(self):
        findings = validate_plan_json(_plan([
            _r("aws_db_instance", "db", {"storage_encrypted": True,
                                          "backup_retention_period": 7,
                                          "deletion_protection": True}),
        ]))
        assert "rds_unencrypted" not in _findings_by_rule(findings)

    def test_rds_no_backup(self):
        findings = validate_plan_json(_plan([
            _r("aws_db_instance", "db", {"backup_retention_period": 0}),
        ]))
        assert "rds_no_backup" in _findings_by_rule(findings)

    def test_rds_backup_ok(self):
        findings = validate_plan_json(_plan([
            _r("aws_db_instance", "db", {"backup_retention_period": 7,
                                          "storage_encrypted": True,
                                          "deletion_protection": True}),
        ]))
        assert "rds_no_backup" not in _findings_by_rule(findings)

    def test_rds_no_deletion_protection(self):
        findings = validate_plan_json(_plan([
            _r("aws_db_instance", "db", {}),
        ]))
        assert "rds_no_deletion_protection" in _findings_by_rule(findings)

    def test_ebs_unencrypted(self):
        findings = validate_plan_json(_plan([
            _r("aws_ebs_volume", "vol", {"encrypted": False}),
        ]))
        assert "ebs_unencrypted" in _findings_by_rule(findings)

    def test_ebs_encrypted_no_finding(self):
        findings = validate_plan_json(_plan([
            _r("aws_ebs_volume", "vol", {"encrypted": True}),
        ]))
        assert "ebs_unencrypted" not in _findings_by_rule(findings)

    def test_ec2_imdsv2_optional(self):
        findings = validate_plan_json(_plan([
            _r("aws_instance", "web", {}),
        ]))
        assert "ec2_imdsv2_optional" in _findings_by_rule(findings)

    def test_ec2_imdsv2_required_no_finding(self):
        findings = validate_plan_json(_plan([
            _r("aws_instance", "web", {"metadata_http_tokens": "required",
                                        "instance_type": "t3.micro"}),
        ]))
        assert "ec2_imdsv2_optional" not in _findings_by_rule(findings)

    def test_ec2_prev_gen_t2(self):
        findings = validate_plan_json(_plan([
            _r("aws_instance", "web", {"instance_type": "t2.micro"}),
        ]))
        assert "ec2_prev_gen" in _findings_by_rule(findings)

    def test_ec2_current_gen_no_finding(self):
        findings = validate_plan_json(_plan([
            _r("aws_instance", "web", {"instance_type": "t3.micro"}),
        ]))
        assert "ec2_prev_gen" not in _findings_by_rule(findings)

    def test_s3_no_encryption(self):
        findings = validate_plan_json(_plan([
            _r("aws_s3_bucket", "bucket", {}),
        ]))
        assert "s3_no_encryption" in _findings_by_rule(findings)

    def test_s3_versioning_off(self):
        findings = validate_plan_json(_plan([
            _r("aws_s3_bucket", "bucket", {}),
        ]))
        assert "s3_versioning_off" in _findings_by_rule(findings)

    def test_lambda_no_tracing(self):
        findings = validate_plan_json(_plan([
            _r("aws_lambda_function", "fn", {}),
        ]))
        assert "lambda_no_tracing" in _findings_by_rule(findings)

    def test_lambda_active_tracing_no_finding(self):
        findings = validate_plan_json(_plan([
            _r("aws_lambda_function", "fn", {"tracing_mode": "Active"}),
        ]))
        assert "lambda_no_tracing" not in _findings_by_rule(findings)

    def test_lambda_no_tracing_list_wrapped(self):
        # terraform show -json wraps tracing_config in a list: [{"mode": "PassThrough"}]
        findings = validate_plan_json(_plan([
            _r("aws_lambda_function", "fn", {"tracing_config": [{"mode": "PassThrough"}]}),
        ]))
        assert "lambda_no_tracing" in _findings_by_rule(findings)

    def test_lambda_active_tracing_list_wrapped_no_finding(self):
        findings = validate_plan_json(_plan([
            _r("aws_lambda_function", "fn", {"tracing_config": [{"mode": "Active"}]}),
        ]))
        assert "lambda_no_tracing" not in _findings_by_rule(findings)

    def test_dynamodb_no_pitr(self):
        findings = validate_plan_json(_plan([
            _r("aws_dynamodb_table", "tbl", {}),
        ]))
        assert "dynamodb_no_pitr" in _findings_by_rule(findings)

    def test_alb_no_access_logging(self):
        findings = validate_plan_json(_plan([
            _r("aws_lb", "alb", {}),
        ]))
        assert "alb_no_access_logging" in _findings_by_rule(findings)

    def test_s3_no_block_public_access(self):
        findings = validate_plan_json(_plan([
            _r("aws_s3_bucket", "bucket", {}),
        ]))
        assert "s3_no_block_public_access" in _findings_by_rule(findings)


# ─── Topology rule tests ─────────────────────────────────────────────────────


class TestTopologyRules:
    def _make_nodes_edges(self, node_specs, edge_pairs=None):
        nodes = [
            Node(id=n["id"], type=n["type"], tf_type="", label=n.get("label", n["id"]),
                 config=n.get("config", {}), parent_id=n.get("parent_id"),
                 security_group_ids=n.get("sg_ids", []))
            for n in node_specs
        ]
        edges = [Edge(source=a, target=b) for a, b in (edge_pairs or [])]
        return nodes, edges

    def test_exposed_database(self):
        nodes, edges = self._make_nodes_edges(
            [{"id": "igw", "type": "internet_gateway"},
             {"id": "db", "type": "rds"}],
            [("igw", "db")],
        )
        findings = run_validation(nodes, edges, [], [])
        assert any(f.rule_id == "exposed_database" for f in findings)

    def test_exposed_database_no_direct_edge(self):
        nodes, edges = self._make_nodes_edges(
            [{"id": "igw", "type": "internet_gateway"},
             {"id": "ec2", "type": "ec2"},
             {"id": "db", "type": "rds"}],
            [("igw", "ec2"), ("ec2", "db")],
        )
        findings = run_validation(nodes, edges, [], [])
        assert not any(f.rule_id == "exposed_database" for f in findings)

    def test_orphaned_node(self):
        nodes, edges = self._make_nodes_edges(
            [{"id": "ec2", "type": "ec2"}],
        )
        findings = run_validation(nodes, edges, [], [])
        assert any(f.rule_id == "orphaned_node" for f in findings)

    def test_orphaned_node_exempt_infrastructure(self):
        nodes, edges = self._make_nodes_edges(
            [{"id": "vpc1", "type": "vpc"}],
        )
        findings = run_validation(nodes, edges, [], [])
        assert not any(f.rule_id == "orphaned_node" for f in findings)

    def test_missing_sg(self):
        nodes, edges = self._make_nodes_edges(
            [{"id": "ec2", "type": "ec2"}],
        )
        findings = run_validation(nodes, edges, [], [])
        assert any(f.rule_id == "missing_sg" for f in findings)

    def test_missing_sg_not_fired_when_assigned(self):
        nodes, edges = self._make_nodes_edges(
            [{"id": "ec2", "type": "ec2", "sg_ids": ["sg-123"]}],
        )
        findings = run_validation(nodes, edges, [], [])
        assert not any(f.rule_id == "missing_sg" for f in findings)

    def test_alb_no_targets(self):
        nodes, edges = self._make_nodes_edges(
            [{"id": "alb1", "type": "alb"},
             {"id": "igw", "type": "internet_gateway"}],
            [("igw", "alb1")],
        )
        findings = run_validation(nodes, edges, [], [])
        assert any(f.rule_id == "alb_no_targets" for f in findings)

    def test_alb_has_target_no_finding(self):
        nodes, edges = self._make_nodes_edges(
            [{"id": "alb1", "type": "alb"},
             {"id": "ec2a", "type": "ec2", "sg_ids": ["sg-1"]}],
            [("alb1", "ec2a")],
        )
        findings = run_validation(nodes, edges, [], [])
        assert not any(f.rule_id == "alb_no_targets" for f in findings)

    def test_missing_waf(self):
        nodes, edges = self._make_nodes_edges(
            [{"id": "igw", "type": "internet_gateway"},
             {"id": "alb1", "type": "alb"}],
            [("igw", "alb1")],
        )
        findings = run_validation(nodes, edges, [], [])
        assert any(f.rule_id == "missing_waf" for f in findings)

    def test_missing_waf_not_fired_when_present(self):
        nodes, edges = self._make_nodes_edges(
            [{"id": "igw", "type": "internet_gateway"},
             {"id": "alb1", "type": "alb"},
             {"id": "waf1", "type": "waf"}],
            [("igw", "alb1"), ("waf1", "alb1")],
        )
        findings = run_validation(nodes, edges, [], [])
        assert not any(f.rule_id == "missing_waf" for f in findings)

    def test_lambda_no_dlq(self):
        nodes, edges = self._make_nodes_edges(
            [{"id": "fn1", "type": "lambda"}],
        )
        findings = run_validation(nodes, edges, [], [])
        assert any(f.rule_id == "lambda_no_dlq" for f in findings)

    def test_lambda_dlq_present_no_finding(self):
        nodes, edges = self._make_nodes_edges(
            [{"id": "fn1", "type": "lambda"},
             {"id": "q1", "type": "sqs"}],
            [("fn1", "q1")],
        )
        findings = run_validation(nodes, edges, [], [])
        assert not any(f.rule_id == "lambda_no_dlq" for f in findings)

    def test_no_multi_az(self):
        nodes, edges = self._make_nodes_edges(
            [{"id": "db1", "type": "rds", "config": {"multi_az": False}}],
        )
        findings = run_validation(nodes, edges, [], [])
        assert any(f.rule_id == "no_multi_az" for f in findings)

    def test_multi_az_enabled_no_finding(self):
        nodes, edges = self._make_nodes_edges(
            [{"id": "db1", "type": "rds", "config": {
                "multi_az": True, "storage_encrypted": True,
                "backup_retention_period": 7, "deletion_protection": True,
            }}],
        )
        findings = run_validation(nodes, edges, [], [])
        assert not any(f.rule_id == "no_multi_az" for f in findings)

    def test_rds_in_public_subnet(self):
        nodes, edges = self._make_nodes_edges(
            [{"id": "sub1", "type": "subnet",
              "config": {"map_public_ip_on_launch": True}},
             {"id": "db1", "type": "rds", "parent_id": "sub1"}],
        )
        findings = run_validation(nodes, edges, [], [])
        assert any(f.rule_id == "rds_in_public_subnet" for f in findings)

    def test_missing_secrets_manager(self):
        nodes, edges = self._make_nodes_edges(
            [{"id": "fn1", "type": "lambda"},
             {"id": "db1", "type": "rds"}],
            [("fn1", "db1")],
        )
        findings = run_validation(nodes, edges, [], [])
        assert any(f.rule_id == "missing_secrets_manager" for f in findings)

    def test_secrets_manager_present_no_finding(self):
        nodes, edges = self._make_nodes_edges(
            [{"id": "fn1", "type": "lambda"},
             {"id": "db1", "type": "rds"},
             {"id": "sm1", "type": "secretsmanager"}],
            [("fn1", "db1"), ("fn1", "sm1")],
        )
        findings = run_validation(nodes, edges, [], [])
        assert not any(f.rule_id == "missing_secrets_manager" for f in findings)


# ─── SG rule tests ────────────────────────────────────────────────────────────


class TestSGRules:
    def _sg(self, name, inbound):
        return SecurityGroup(
            id=f"sg-{name}",
            name=name,
            inbound=[SGRule(**r) for r in inbound],
        )

    def test_sg_open_all(self):
        sg = self._sg("wide-open", [{"protocol": "-1", "port": "-1", "source": "0.0.0.0/0"}])
        findings = run_validation([], [], [sg], [])
        assert any(f.rule_id == "sg_open_all" for f in findings)

    def test_sg_open_ssh(self):
        sg = self._sg("ssh-open", [{"protocol": "tcp", "port": "22", "source": "0.0.0.0/0"}])
        findings = run_validation([], [], [sg], [])
        assert any(f.rule_id == "sg_open_ssh" for f in findings)

    def test_sg_open_rdp(self):
        sg = self._sg("rdp-open", [{"protocol": "tcp", "port": "3389", "source": "0.0.0.0/0"}])
        findings = run_validation([], [], [sg], [])
        assert any(f.rule_id == "sg_open_rdp" for f in findings)

    def test_sg_open_db_port_mysql(self):
        sg = self._sg("db-open", [{"protocol": "tcp", "port": "3306", "source": "0.0.0.0/0"}])
        findings = run_validation([], [], [sg], [])
        assert any(f.rule_id == "sg_open_db_port" for f in findings)

    def test_sg_open_db_port_postgres(self):
        sg = self._sg("db-open", [{"protocol": "tcp", "port": "5432", "source": "0.0.0.0/0"}])
        findings = run_validation([], [], [sg], [])
        assert any(f.rule_id == "sg_open_db_port" for f in findings)

    def test_sg_open_db_port_redis(self):
        sg = self._sg("db-open", [{"protocol": "tcp", "port": "6379", "source": "0.0.0.0/0"}])
        findings = run_validation([], [], [sg], [])
        assert any(f.rule_id == "sg_open_db_port" for f in findings)

    def test_sg_restricted_no_finding(self):
        sg = self._sg("restricted", [{"protocol": "tcp", "port": "22", "source": "10.0.0.0/8"}])
        findings = run_validation([], [], [sg], [])
        assert not any(f.rule_id == "sg_open_ssh" for f in findings)

    def test_sg_http_without_https(self):
        sg = self._sg("http-only", [{"protocol": "tcp", "port": "80", "source": "0.0.0.0/0"}])
        findings = run_validation([], [], [sg], [])
        assert any(f.rule_id == "sg_http_not_https" for f in findings)

    def test_sg_http_and_https_no_finding(self):
        sg = self._sg("https", [
            {"protocol": "tcp", "port": "80", "source": "0.0.0.0/0"},
            {"protocol": "tcp", "port": "443", "source": "0.0.0.0/0"},
        ])
        findings = run_validation([], [], [sg], [])
        assert not any(f.rule_id == "sg_http_not_https" for f in findings)

    def test_sg_wide_port_range(self):
        sg = self._sg("wide-range", [{"protocol": "tcp", "port": "1024-65535", "source": "0.0.0.0/0"}])
        findings = run_validation([], [], [sg], [])
        assert any(f.rule_id == "sg_ephemeral_ports" for f in findings)

    def test_sg_telnet_open(self):
        sg = self._sg("telnet", [{"protocol": "tcp", "port": "23", "source": "0.0.0.0/0"}])
        findings = run_validation([], [], [sg], [])
        assert any(f.rule_id == "sg_open_telnet" for f in findings)

    def test_sg_admin_port_elasticsearch(self):
        sg = self._sg("es-admin", [{"protocol": "tcp", "port": "9200", "source": "0.0.0.0/0"}])
        findings = run_validation([], [], [sg], [])
        assert any(f.rule_id == "sg_open_admin_port" for f in findings)


# ─── IAM rule tests ───────────────────────────────────────────────────────────


class TestIAMRules:
    def _role(self, name, stmts):
        policies = [
            IAMStatement(effect=s["effect"], actions=s["actions"], resources=s["resources"])
            for s in stmts
        ]
        return IAMRole(id=f"role-{name}", name=name, policies=policies)

    def test_iam_admin_policy(self):
        role = self._role("admin", [
            {"effect": "Allow", "actions": ["*"], "resources": ["*"]},
        ])
        findings = run_validation([], [], [], [role])
        assert any(f.rule_id == "iam_admin_policy" for f in findings)

    def test_iam_wildcard_sensitive_s3(self):
        role = self._role("s3-admin", [
            {"effect": "Allow", "actions": ["s3:*"], "resources": ["*"]},
        ])
        findings = run_validation([], [], [], [role])
        assert any(f.rule_id == "iam_wildcard_sensitive" for f in findings)

    def test_iam_wildcard_sensitive_kms(self):
        role = self._role("kms-admin", [
            {"effect": "Allow", "actions": ["kms:*"], "resources": ["*"]},
        ])
        findings = run_validation([], [], [], [role])
        assert any(f.rule_id == "iam_wildcard_sensitive" for f in findings)

    def test_iam_specific_actions_no_finding(self):
        role = self._role("readonly", [
            {"effect": "Allow", "actions": ["s3:GetObject", "s3:ListBucket"], "resources": ["arn:aws:s3:::my-bucket/*"]},
        ])
        findings = run_validation([], [], [], [role])
        assert not any(f.rule_id in ("iam_admin_policy", "iam_wildcard_sensitive") for f in findings)

    def test_iam_deny_not_flagged(self):
        role = self._role("deny-all", [
            {"effect": "Deny", "actions": ["*"], "resources": ["*"]},
        ])
        findings = run_validation([], [], [], [role])
        assert not any(f.rule_id == "iam_admin_policy" for f in findings)


# ─── Severity ordering test ───────────────────────────────────────────────────


def test_findings_sorted_by_severity():
    sg = SecurityGroup(
        id="sg-1", name="test",
        inbound=[
            SGRule(protocol="-1", port="-1", source="0.0.0.0/0"),   # critical
            SGRule(protocol="tcp", port="22", source="0.0.0.0/0"),  # warning
        ],
    )
    findings = run_validation([], [], [sg], [])
    levels = [f.level for f in findings]
    order = {"critical": 0, "warning": 1, "info": 2}
    for i in range(len(levels) - 1):
        assert order[levels[i]] <= order[levels[i + 1]], (
            f"Out of order: {levels[i]} before {levels[i+1]}"
        )


# ─── parse_plan_json tests ────────────────────────────────────────────────────


class TestParsePlanJSON:
    def test_basic_resource_mapping(self):
        plan = {
            "planned_values": {"root_module": {"resources": [
                _r("aws_instance", "web", {"instance_type": "t3.micro"}),
                _r("aws_db_instance", "db", {}),
                _r("aws_lambda_function", "fn", {}),
            ]}},
            "configuration": {"root_module": {"resources": []}},
        }
        nodes, edges, sgs, iam_roles = parse_plan_json(plan)
        types = {n.type for n in nodes}
        assert "ec2" in types
        assert "rds" in types
        assert "lambda" in types

    def test_security_group_parsed(self):
        plan = {
            "planned_values": {"root_module": {"resources": [
                _r("aws_security_group", "web_sg", {
                    "name": "web-sg",
                    "ingress": [
                        {"protocol": "tcp", "from_port": 22, "to_port": 22,
                         "cidr_blocks": ["0.0.0.0/0"], "ipv6_cidr_blocks": [],
                         "security_groups": []},
                    ],
                }),
            ]}},
            "configuration": {"root_module": {"resources": []}},
        }
        nodes, edges, sgs, iam_roles = parse_plan_json(plan)
        assert len(sgs) == 1
        assert sgs[0].name == "web-sg"
        assert len(sgs[0].inbound) == 1
        assert sgs[0].inbound[0].port == "22"

    def test_edge_from_config_references(self):
        plan = {
            "planned_values": {"root_module": {"resources": [
                _r("aws_instance", "web", {}),
                _r("aws_subnet", "main", {}),
            ]}},
            "configuration": {"root_module": {"resources": [
                {"address": "aws_instance.web", "expressions": {
                    "subnet_id": {"references": ["aws_subnet.main"]},
                }},
                {"address": "aws_subnet.main", "expressions": {}},
            ]}},
        }
        nodes, edges, sgs, iam_roles = parse_plan_json(plan)
        assert len(edges) == 1
        node_ids = {n.id for n in nodes}
        assert edges[0].source in node_ids
        assert edges[0].target in node_ids

    def test_unmapped_type_becomes_generic(self):
        plan = {
            "planned_values": {"root_module": {"resources": [
                _r("aws_some_new_service_xyz", "svc", {}),
            ]}},
            "configuration": {"root_module": {"resources": []}},
        }
        nodes, edges, sgs, iam_roles = parse_plan_json(plan)
        assert len(nodes) == 1
        assert nodes[0].type == "generic_tf"
