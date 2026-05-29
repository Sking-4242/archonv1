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


def _node(id, type, config=None, parent_id=None, sg_ids=None, iam_role_id=None, label=None):
    return Node(
        id=id, type=type, tf_type="", label=label or id,
        config=config or {}, parent_id=parent_id,
        security_group_ids=sg_ids or [],
        iam_role_id=iam_role_id,
    )


def _edge(source, target):
    return Edge(source=source, target=target)


def _sg(name, inbound):
    return SecurityGroup(
        id=f"sg-{name}", name=name,
        inbound=[SGRule(**r) for r in inbound],
    )


def _role(name, stmts, id_suffix=""):
    policies = [
        IAMStatement(effect=s["effect"], actions=s["actions"], resources=s["resources"])
        for s in stmts
    ]
    return IAMRole(id=f"role-{name}{id_suffix}", name=name, policies=policies)


# ─── Config rule tests ────────────────────────────────────────────────────────


class TestConfigRules:

    # ── RDS ──────────────────────────────────────────────────────────────────

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

    def test_rds_no_logging(self):
        findings = validate_plan_json(_plan([
            _r("aws_db_instance", "db", {"enabled_cloudwatch_logs_exports": []}),
        ]))
        assert "rds_no_logging" in _findings_by_rule(findings)

    def test_rds_logging_ok(self):
        findings = validate_plan_json(_plan([
            _r("aws_db_instance", "db", {
                "enabled_cloudwatch_logs_exports": ["error", "general"],
                "storage_encrypted": True, "backup_retention_period": 7,
                "deletion_protection": True,
            }),
        ]))
        assert "rds_no_logging" not in _findings_by_rule(findings)

    def test_rds_no_perf_insights(self):
        findings = validate_plan_json(_plan([
            _r("aws_db_instance", "db", {"performance_insights_enabled": False}),
        ]))
        assert "rds_no_perf_insights" in _findings_by_rule(findings)

    def test_rds_perf_insights_ok(self):
        findings = validate_plan_json(_plan([
            _r("aws_db_instance", "db", {
                "performance_insights_enabled": True,
                "storage_encrypted": True, "backup_retention_period": 7,
                "deletion_protection": True,
            }),
        ]))
        assert "rds_no_perf_insights" not in _findings_by_rule(findings)

    def test_rds_no_storage_autoscaling(self):
        findings = validate_plan_json(_plan([
            _r("aws_db_instance", "db", {"max_allocated_storage": 0}),
        ]))
        assert "rds_no_storage_autoscaling" in _findings_by_rule(findings)

    def test_rds_storage_autoscaling_ok(self):
        findings = validate_plan_json(_plan([
            _r("aws_db_instance", "db", {
                "max_allocated_storage": 200,
                "storage_encrypted": True, "backup_retention_period": 7,
                "deletion_protection": True,
            }),
        ]))
        assert "rds_no_storage_autoscaling" not in _findings_by_rule(findings)

    def test_rds_no_reserved(self):
        findings = validate_plan_json(_plan([
            _r("aws_db_instance", "db", {}),
        ]))
        assert "rds_no_reserved" in _findings_by_rule(findings)

    def test_rds_reserved_ok(self):
        findings = validate_plan_json(_plan([
            _r("aws_db_instance", "db", {
                "reserved_instance": True,
                "storage_encrypted": True, "backup_retention_period": 7,
                "deletion_protection": True,
            }),
        ]))
        assert "rds_no_reserved" not in _findings_by_rule(findings)

    def test_rds_gp2_storage(self):
        findings = validate_plan_json(_plan([
            _r("aws_db_instance", "db", {"storage_type": "gp2"}),
        ]))
        assert "rds_gp2_storage" in _findings_by_rule(findings)

    def test_rds_gp3_storage_no_finding(self):
        findings = validate_plan_json(_plan([
            _r("aws_db_instance", "db", {
                "storage_type": "gp3",
                "storage_encrypted": True, "backup_retention_period": 7,
                "deletion_protection": True,
            }),
        ]))
        assert "rds_gp2_storage" not in _findings_by_rule(findings)

    def test_rds_io1_consider_gp3(self):
        findings = validate_plan_json(_plan([
            _r("aws_db_instance", "db", {"storage_type": "io1"}),
        ]))
        assert "rds_io1_consider_gp3" in _findings_by_rule(findings)

    # ── Aurora ───────────────────────────────────────────────────────────────

    def test_aurora_unencrypted(self):
        findings = validate_plan_json(_plan([
            _r("aws_rds_cluster", "cluster", {"storage_encrypted": False}),
        ]))
        assert "aurora_unencrypted" in _findings_by_rule(findings)

    def test_aurora_encrypted_no_finding(self):
        findings = validate_plan_json(_plan([
            _r("aws_rds_cluster", "cluster", {
                "storage_encrypted": True, "backup_retention_period": 7,
            }),
        ]))
        assert "aurora_unencrypted" not in _findings_by_rule(findings)

    def test_aurora_no_backup(self):
        findings = validate_plan_json(_plan([
            _r("aws_rds_cluster", "cluster", {"backup_retention_period": 0}),
        ]))
        assert "aurora_no_backup" in _findings_by_rule(findings)

    def test_aurora_backup_ok(self):
        findings = validate_plan_json(_plan([
            _r("aws_rds_cluster", "cluster", {
                "storage_encrypted": True, "backup_retention_period": 7,
            }),
        ]))
        assert "aurora_no_backup" not in _findings_by_rule(findings)

    def test_aurora_not_graviton(self):
        findings = validate_plan_json(_plan([
            _r("aws_rds_cluster", "cluster", {"instance_class": "db.r5.large"}),
        ]))
        assert "aurora_not_graviton" in _findings_by_rule(findings)

    def test_aurora_graviton_no_finding(self):
        findings = validate_plan_json(_plan([
            _r("aws_rds_cluster", "cluster", {
                "instance_class": "db.r6g.large",
                "storage_encrypted": True, "backup_retention_period": 7,
            }),
        ]))
        assert "aurora_not_graviton" not in _findings_by_rule(findings)

    # ── EBS ──────────────────────────────────────────────────────────────────

    def test_ebs_unencrypted(self):
        findings = validate_plan_json(_plan([
            _r("aws_ebs_volume", "vol", {"encrypted": False}),
        ]))
        assert "ebs_unencrypted" in _findings_by_rule(findings)

    def test_ebs_encrypted_no_finding(self):
        findings = validate_plan_json(_plan([
            _r("aws_ebs_volume", "vol", {"encrypted": True, "volume_type": "gp3"}),
        ]))
        assert "ebs_unencrypted" not in _findings_by_rule(findings)

    def test_ebs_gp2_upgrade(self):
        findings = validate_plan_json(_plan([
            _r("aws_ebs_volume", "vol", {"volume_type": "gp2"}),
        ]))
        assert "ebs_gp2_upgrade" in _findings_by_rule(findings)

    def test_ebs_gp3_no_finops_finding(self):
        findings = validate_plan_json(_plan([
            _r("aws_ebs_volume", "vol", {"encrypted": True, "volume_type": "gp3"}),
        ]))
        assert "ebs_gp2_upgrade" not in _findings_by_rule(findings)

    # ── EC2 ──────────────────────────────────────────────────────────────────

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

    def test_ec2_prev_gen_m4(self):
        findings = validate_plan_json(_plan([
            _r("aws_instance", "web", {"instance_type": "m4.large"}),
        ]))
        assert "ec2_prev_gen" in _findings_by_rule(findings)

    def test_ec2_current_gen_no_finding(self):
        findings = validate_plan_json(_plan([
            _r("aws_instance", "web", {"instance_type": "t3.micro"}),
        ]))
        assert "ec2_prev_gen" not in _findings_by_rule(findings)

    # ── Lambda ───────────────────────────────────────────────────────────────

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
        findings = validate_plan_json(_plan([
            _r("aws_lambda_function", "fn", {"tracing_config": [{"mode": "PassThrough"}]}),
        ]))
        assert "lambda_no_tracing" in _findings_by_rule(findings)

    def test_lambda_active_tracing_list_wrapped_no_finding(self):
        findings = validate_plan_json(_plan([
            _r("aws_lambda_function", "fn", {"tracing_config": [{"mode": "Active"}]}),
        ]))
        assert "lambda_no_tracing" not in _findings_by_rule(findings)

    def test_lambda_not_arm64_default(self):
        findings = validate_plan_json(_plan([
            _r("aws_lambda_function", "fn", {}),
        ]))
        assert "lambda_not_arm64" in _findings_by_rule(findings)

    def test_lambda_not_arm64_explicit_x86(self):
        findings = validate_plan_json(_plan([
            _r("aws_lambda_function", "fn", {"architecture": "x86_64"}),
        ]))
        assert "lambda_not_arm64" in _findings_by_rule(findings)

    def test_lambda_arm64_no_finding(self):
        findings = validate_plan_json(_plan([
            _r("aws_lambda_function", "fn", {
                "architecture": "arm64", "tracing_mode": "Active",
            }),
        ]))
        assert "lambda_not_arm64" not in _findings_by_rule(findings)

    def test_lambda_high_timeout(self):
        findings = validate_plan_json(_plan([
            _r("aws_lambda_function", "fn", {"timeout": 900}),
        ]))
        assert "lambda_high_timeout" in _findings_by_rule(findings)

    def test_lambda_timeout_ok(self):
        findings = validate_plan_json(_plan([
            _r("aws_lambda_function", "fn", {
                "timeout": 60, "tracing_mode": "Active",
            }),
        ]))
        assert "lambda_high_timeout" not in _findings_by_rule(findings)

    def test_lambda_default_memory(self):
        findings = validate_plan_json(_plan([
            _r("aws_lambda_function", "fn", {"memory_size": 128}),
        ]))
        assert "lambda_default_memory" in _findings_by_rule(findings)

    def test_lambda_memory_ok(self):
        findings = validate_plan_json(_plan([
            _r("aws_lambda_function", "fn", {
                "memory_size": 512, "tracing_mode": "Active",
            }),
        ]))
        assert "lambda_default_memory" not in _findings_by_rule(findings)

    def test_lambda_public_access(self):
        findings = validate_plan_json(_plan([
            _r("aws_lambda_function", "fn", {"authorization_type": "NONE"}),
        ]))
        assert "lambda_public_access" in _findings_by_rule(findings)

    def test_lambda_iam_auth_no_finding(self):
        findings = validate_plan_json(_plan([
            _r("aws_lambda_function", "fn", {"authorization_type": "AWS_IAM"}),
        ]))
        assert "lambda_public_access" not in _findings_by_rule(findings)

    def test_lambda_no_vpc(self):
        findings = validate_plan_json(_plan([
            _r("aws_lambda_function", "fn", {}),
        ]))
        assert "lambda_no_vpc" in _findings_by_rule(findings)

    def test_lambda_in_vpc_no_finding(self):
        findings = validate_plan_json(_plan([
            _r("aws_lambda_function", "fn", {
                "vpc_config": [{"subnet_ids": ["subnet-1"], "security_group_ids": ["sg-1"]}],
                "tracing_mode": "Active",
            }),
        ]))
        assert "lambda_no_vpc" not in _findings_by_rule(findings)

    # ── S3 ───────────────────────────────────────────────────────────────────

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

    def test_s3_no_block_public_access(self):
        findings = validate_plan_json(_plan([
            _r("aws_s3_bucket", "bucket", {}),
        ]))
        assert "s3_no_block_public_access" in _findings_by_rule(findings)

    def test_s3_no_ssl_policy(self):
        findings = validate_plan_json(_plan([
            _r("aws_s3_bucket", "bucket", {}),
        ]))
        assert "s3_no_ssl_policy" in _findings_by_rule(findings)

    def test_s3_ssl_policy_ok(self):
        findings = validate_plan_json(_plan([
            _r("aws_s3_bucket", "bucket", {
                "block_public_policy": True,
                "server_side_encryption_configuration": "AES256",
                "versioning": "Enabled",
                "block_public_acls": True,
            }),
        ]))
        assert "s3_no_ssl_policy" not in _findings_by_rule(findings)

    def test_s3_versioning_no_lifecycle(self):
        findings = validate_plan_json(_plan([
            _r("aws_s3_bucket", "bucket", {"versioning": "Enabled"}),
        ]))
        assert "s3_versioning_no_lifecycle" in _findings_by_rule(findings)

    def test_s3_versioning_with_lifecycle_no_finding(self):
        findings = validate_plan_json(_plan([
            _r("aws_s3_bucket", "bucket", {
                "versioning": "Enabled",
                "lifecycle_rule": [{"enabled": True}],
                "server_side_encryption_configuration": "AES256",
                "block_public_acls": True,
                "block_public_policy": True,
            }),
        ]))
        assert "s3_versioning_no_lifecycle" not in _findings_by_rule(findings)

    # ── DynamoDB ─────────────────────────────────────────────────────────────

    def test_dynamodb_no_pitr(self):
        findings = validate_plan_json(_plan([
            _r("aws_dynamodb_table", "tbl", {}),
        ]))
        assert "dynamodb_no_pitr" in _findings_by_rule(findings)

    def test_dynamodb_high_provisioned(self):
        findings = validate_plan_json(_plan([
            _r("aws_dynamodb_table", "tbl", {
                "billing_mode": "PROVISIONED",
                "read_capacity": 200,
                "write_capacity": 150,
            }),
        ]))
        assert "dynamodb_high_provisioned" in _findings_by_rule(findings)

    def test_dynamodb_pay_per_request_no_finops(self):
        findings = validate_plan_json(_plan([
            _r("aws_dynamodb_table", "tbl", {
                "billing_mode": "PAY_PER_REQUEST",
                "point_in_time_recovery_enabled": True,
            }),
        ]))
        assert "dynamodb_high_provisioned" not in _findings_by_rule(findings)

    def test_dynamodb_provisioned_low_no_finops(self):
        findings = validate_plan_json(_plan([
            _r("aws_dynamodb_table", "tbl", {
                "billing_mode": "PROVISIONED",
                "read_capacity": 50,
                "write_capacity": 50,
            }),
        ]))
        assert "dynamodb_high_provisioned" not in _findings_by_rule(findings)

    # ── ALB ──────────────────────────────────────────────────────────────────

    def test_alb_no_access_logging(self):
        findings = validate_plan_json(_plan([
            _r("aws_lb", "alb", {}),
        ]))
        assert "alb_no_access_logging" in _findings_by_rule(findings)

    # ── Redshift ─────────────────────────────────────────────────────────────

    def test_redshift_unencrypted(self):
        findings = validate_plan_json(_plan([
            _r("aws_redshift_cluster", "rs", {"encrypted": False}),
        ]))
        assert "redshift_unencrypted" in _findings_by_rule(findings)

    def test_redshift_encrypted_no_finding(self):
        findings = validate_plan_json(_plan([
            _r("aws_redshift_cluster", "rs", {
                "encrypted": True, "require_ssl": True,
            }),
        ]))
        assert "redshift_unencrypted" not in _findings_by_rule(findings)

    def test_redshift_no_tls(self):
        findings = validate_plan_json(_plan([
            _r("aws_redshift_cluster", "rs", {}),
        ]))
        assert "redshift_no_tls" in _findings_by_rule(findings)

    def test_redshift_tls_ok(self):
        findings = validate_plan_json(_plan([
            _r("aws_redshift_cluster", "rs", {
                "encrypted": True, "require_ssl": True,
            }),
        ]))
        assert "redshift_no_tls" not in _findings_by_rule(findings)

    # ── ElastiCache ──────────────────────────────────────────────────────────

    def test_elasticache_no_encryption_rest(self):
        findings = validate_plan_json(_plan([
            _r("aws_elasticache_replication_group", "ec", {}),
        ]))
        assert "elasticache_no_encryption_rest" in _findings_by_rule(findings)

    def test_elasticache_encryption_rest_ok(self):
        findings = validate_plan_json(_plan([
            _r("aws_elasticache_replication_group", "ec", {
                "at_rest_encryption_enabled": True,
                "transit_encryption_mode": "required",
                "auth_token": "secret",
                "snapshot_retention_limit": 1,
            }),
        ]))
        assert "elasticache_no_encryption_rest" not in _findings_by_rule(findings)

    def test_elasticache_no_encryption_transit(self):
        findings = validate_plan_json(_plan([
            _r("aws_elasticache_replication_group", "ec", {
                "transit_encryption_mode": "disabled",
            }),
        ]))
        assert "elasticache_no_encryption_transit" in _findings_by_rule(findings)

    def test_elasticache_transit_ok(self):
        findings = validate_plan_json(_plan([
            _r("aws_elasticache_replication_group", "ec", {
                "at_rest_encryption_enabled": True,
                "transit_encryption_mode": "required",
                "auth_token": "secret",
                "snapshot_retention_limit": 1,
            }),
        ]))
        assert "elasticache_no_encryption_transit" not in _findings_by_rule(findings)

    def test_elasticache_no_auth(self):
        findings = validate_plan_json(_plan([
            _r("aws_elasticache_replication_group", "ec", {"engine": "redis"}),
        ]))
        assert "elasticache_no_auth" in _findings_by_rule(findings)

    def test_elasticache_auth_ok(self):
        findings = validate_plan_json(_plan([
            _r("aws_elasticache_replication_group", "ec", {
                "engine": "redis", "auth_token": "hunter2",
                "at_rest_encryption_enabled": True,
                "transit_encryption_mode": "required",
                "snapshot_retention_limit": 1,
            }),
        ]))
        assert "elasticache_no_auth" not in _findings_by_rule(findings)

    def test_elasticache_memcached_no_auth_finding(self):
        """Memcached doesn't support AUTH — rule should not fire."""
        findings = validate_plan_json(_plan([
            _r("aws_elasticache_replication_group", "ec", {
                "engine": "memcached",
                "at_rest_encryption_enabled": True,
                "transit_encryption_mode": "required",
                "snapshot_retention_limit": 1,
            }),
        ]))
        assert "elasticache_no_auth" not in _findings_by_rule(findings)

    def test_elasticache_no_backup(self):
        findings = validate_plan_json(_plan([
            _r("aws_elasticache_replication_group", "ec", {
                "snapshot_retention_limit": 0,
            }),
        ]))
        assert "elasticache_no_backup" in _findings_by_rule(findings)

    def test_elasticache_backup_ok(self):
        findings = validate_plan_json(_plan([
            _r("aws_elasticache_replication_group", "ec", {
                "at_rest_encryption_enabled": True,
                "transit_encryption_mode": "required",
                "auth_token": "secret",
                "snapshot_retention_limit": 5,
            }),
        ]))
        assert "elasticache_no_backup" not in _findings_by_rule(findings)

    def test_elasticache_prev_gen_node_m3(self):
        findings = validate_plan_json(_plan([
            _r("aws_elasticache_cluster", "ec", {"node_type": "cache.m3.medium"}),
        ]))
        assert "elasticache_prev_gen_node" in _findings_by_rule(findings)

    def test_elasticache_prev_gen_node_r4(self):
        findings = validate_plan_json(_plan([
            _r("aws_elasticache_cluster", "ec", {"node_type": "cache.r4.large"}),
        ]))
        assert "elasticache_prev_gen_node" in _findings_by_rule(findings)

    def test_elasticache_current_gen_no_finding(self):
        findings = validate_plan_json(_plan([
            _r("aws_elasticache_cluster", "ec", {"node_type": "cache.t4g.micro"}),
        ]))
        assert "elasticache_prev_gen_node" not in _findings_by_rule(findings)

    # ── SQS ──────────────────────────────────────────────────────────────────

    def test_sqs_no_encryption(self):
        findings = validate_plan_json(_plan([
            _r("aws_sqs_queue", "q", {}),
        ]))
        assert "sqs_no_encryption" in _findings_by_rule(findings)

    def test_sqs_sse_enabled_no_finding(self):
        findings = validate_plan_json(_plan([
            _r("aws_sqs_queue", "q", {
                "sqs_managed_sse_enabled": True,
                "redrive_max_receive_count": 5,
            }),
        ]))
        assert "sqs_no_encryption" not in _findings_by_rule(findings)

    def test_sqs_kms_no_finding(self):
        findings = validate_plan_json(_plan([
            _r("aws_sqs_queue", "q", {
                "kms_master_key_id": "arn:aws:kms:us-east-1:123:key/abc",
                "redrive_max_receive_count": 5,
            }),
        ]))
        assert "sqs_no_encryption" not in _findings_by_rule(findings)

    def test_sqs_no_dlq(self):
        findings = validate_plan_json(_plan([
            _r("aws_sqs_queue", "q", {}),
        ]))
        assert "sqs_no_dlq" in _findings_by_rule(findings)

    def test_sqs_dlq_ok(self):
        findings = validate_plan_json(_plan([
            _r("aws_sqs_queue", "q", {
                "sqs_managed_sse_enabled": True,
                "redrive_max_receive_count": 5,
            }),
        ]))
        assert "sqs_no_dlq" not in _findings_by_rule(findings)

    # ── SNS ──────────────────────────────────────────────────────────────────

    def test_sns_no_encryption(self):
        findings = validate_plan_json(_plan([
            _r("aws_sns_topic", "topic", {}),
        ]))
        assert "sns_no_encryption" in _findings_by_rule(findings)

    def test_sns_kms_no_finding(self):
        findings = validate_plan_json(_plan([
            _r("aws_sns_topic", "topic", {
                "kms_master_key_id": "arn:aws:kms:us-east-1:123:key/abc",
            }),
        ]))
        assert "sns_no_encryption" not in _findings_by_rule(findings)

    # ── CloudFront ───────────────────────────────────────────────────────────

    def test_cloudfront_no_https(self):
        findings = validate_plan_json(_plan([
            _r("aws_cloudfront_distribution", "cf", {
                "viewer_protocol_policy": "allow-all",
            }),
        ]))
        assert "cloudfront_no_https" in _findings_by_rule(findings)

    def test_cloudfront_https_ok(self):
        findings = validate_plan_json(_plan([
            _r("aws_cloudfront_distribution", "cf", {
                "viewer_protocol_policy": "redirect-to-https",
                "logging_config": {"bucket": "logs.s3.amazonaws.com"},
            }),
        ]))
        assert "cloudfront_no_https" not in _findings_by_rule(findings)

    def test_cloudfront_no_waf(self):
        findings = validate_plan_json(_plan([
            _r("aws_cloudfront_distribution", "cf", {
                "viewer_protocol_policy": "redirect-to-https",
                "logging_config": {"bucket": "logs.s3.amazonaws.com"},
            }),
        ]))
        assert "cloudfront_no_waf" in _findings_by_rule(findings)

    def test_cloudfront_waf_present_no_finding(self):
        findings = validate_plan_json(_plan([
            _r("aws_cloudfront_distribution", "cf", {
                "viewer_protocol_policy": "redirect-to-https",
                "logging_config": {"bucket": "logs.s3.amazonaws.com"},
            }),
            _r("aws_wafv2_web_acl", "waf", {}),
        ]))
        assert "cloudfront_no_waf" not in _findings_by_rule(findings)

    def test_cloudfront_no_logging(self):
        findings = validate_plan_json(_plan([
            _r("aws_cloudfront_distribution", "cf", {
                "viewer_protocol_policy": "redirect-to-https",
            }),
        ]))
        assert "cloudfront_no_logging" in _findings_by_rule(findings)

    def test_cloudfront_logging_ok(self):
        findings = validate_plan_json(_plan([
            _r("aws_cloudfront_distribution", "cf", {
                "viewer_protocol_policy": "redirect-to-https",
                "logging_config": {"bucket": "logs.s3.amazonaws.com"},
            }),
            _r("aws_wafv2_web_acl", "waf", {}),
        ]))
        assert "cloudfront_no_logging" not in _findings_by_rule(findings)

    # ── EKS ──────────────────────────────────────────────────────────────────

    def test_eks_public_endpoint(self):
        findings = validate_plan_json(_plan([
            _r("aws_eks_cluster", "cluster", {
                "endpoint_public_access": True,
                "public_access_cidrs": "0.0.0.0/0",
            }),
        ]))
        assert "eks_public_endpoint" in _findings_by_rule(findings)

    def test_eks_restricted_cidrs_no_finding(self):
        findings = validate_plan_json(_plan([
            _r("aws_eks_cluster", "cluster", {
                "endpoint_public_access": True,
                "public_access_cidrs": "10.0.0.0/8",
                "enabled_cluster_log_types": ["api", "audit"],
            }),
        ]))
        assert "eks_public_endpoint" not in _findings_by_rule(findings)

    def test_eks_no_logging(self):
        findings = validate_plan_json(_plan([
            _r("aws_eks_cluster", "cluster", {}),
        ]))
        assert "eks_no_logging" in _findings_by_rule(findings)

    def test_eks_logging_ok(self):
        findings = validate_plan_json(_plan([
            _r("aws_eks_cluster", "cluster", {
                "enabled_cluster_log_types": ["api", "audit", "authenticator"],
                "endpoint_public_access": False,
            }),
        ]))
        assert "eks_no_logging" not in _findings_by_rule(findings)

    # ── EFS ──────────────────────────────────────────────────────────────────

    def test_efs_no_encryption(self):
        findings = validate_plan_json(_plan([
            _r("aws_efs_file_system", "efs", {"encrypted": False}),
        ]))
        assert "efs_no_encryption" in _findings_by_rule(findings)

    def test_efs_encrypted_no_finding(self):
        findings = validate_plan_json(_plan([
            _r("aws_efs_file_system", "efs", {"encrypted": True}),
        ]))
        assert "efs_no_encryption" not in _findings_by_rule(findings)

    # ── ECS Fargate ──────────────────────────────────────────────────────────

    def test_ecs_no_fargate_spot(self):
        findings = validate_plan_json(_plan([
            _r("aws_ecs_service", "svc", {"launch_type": "FARGATE"}),
        ]))
        assert "ecs_no_fargate_spot" in _findings_by_rule(findings)

    def test_ecs_fargate_spot_no_finding(self):
        findings = validate_plan_json(_plan([
            _r("aws_ecs_service", "svc", {"launch_type": "FARGATE_SPOT"}),
        ]))
        assert "ecs_no_fargate_spot" not in _findings_by_rule(findings)

    # ── KMS ──────────────────────────────────────────────────────────────────

    def test_kms_no_rotation(self):
        nodes = [_node("kms1", "kms_key", config={"enable_key_rotation": False})]
        findings = run_validation(nodes, [], [], [])
        assert "kms_no_rotation" in _findings_by_rule(findings)

    def test_kms_rotation_ok(self):
        nodes = [_node("kms1", "kms_key", config={"enable_key_rotation": True})]
        findings = run_validation(nodes, [], [], [])
        assert "kms_no_rotation" not in _findings_by_rule(findings)

    # ── CloudTrail ───────────────────────────────────────────────────────────

    def test_cloudtrail_no_encryption(self):
        findings = validate_plan_json(_plan([
            _r("aws_cloudtrail", "trail", {}),
        ]))
        assert "cloudtrail_no_encryption" in _findings_by_rule(findings)

    def test_cloudtrail_encrypted_no_finding(self):
        findings = validate_plan_json(_plan([
            _r("aws_cloudtrail", "trail", {
                "kms_key_id": "arn:aws:kms:us-east-1:123:key/abc",
            }),
        ]))
        assert "cloudtrail_no_encryption" not in _findings_by_rule(findings)

    # ── Secrets Manager ──────────────────────────────────────────────────────

    def test_secrets_no_rotation(self):
        findings = validate_plan_json(_plan([
            _r("aws_secretsmanager_secret", "secret", {}),
        ]))
        assert "secrets_no_rotation" in _findings_by_rule(findings)

    def test_secrets_rotation_ok(self):
        findings = validate_plan_json(_plan([
            _r("aws_secretsmanager_secret", "secret", {"rotation_enabled": True}),
        ]))
        assert "secrets_no_rotation" not in _findings_by_rule(findings)

    # ── Subnet ───────────────────────────────────────────────────────────────

    def test_subnet_auto_public_ip(self):
        findings = validate_plan_json(_plan([
            _r("aws_subnet", "sub", {"map_public_ip_on_launch": True}),
        ]))
        assert "subnet_auto_public_ip" in _findings_by_rule(findings)

    def test_subnet_no_auto_public_ip_no_finding(self):
        findings = validate_plan_json(_plan([
            _r("aws_subnet", "sub", {"map_public_ip_on_launch": False}),
        ]))
        assert "subnet_auto_public_ip" not in _findings_by_rule(findings)

    # ── CloudWatch log retention ─────────────────────────────────────────────

    def test_cloudwatch_no_log_retention(self):
        nodes = [_node("cw1", "cloudwatch", config={"retention_in_days": 0})]
        findings = run_validation(nodes, [], [], [])
        assert "cloudwatch_no_log_retention" in _findings_by_rule(findings)

    def test_cloudwatch_retention_ok(self):
        nodes = [_node("cw1", "cloudwatch", config={"retention_in_days": 30})]
        ec2 = _node("ec2a", "ec2", sg_ids=["sg-1"])
        findings = run_validation([nodes[0], ec2], [_edge("ec2a", "cw1")], [], [])
        assert "cloudwatch_no_log_retention" not in _findings_by_rule(findings)


# ─── Topology rule tests ─────────────────────────────────────────────────────


class TestTopologyRules:

    def test_exposed_database(self):
        nodes = [_node("igw", "internet_gateway"), _node("db", "rds")]
        findings = run_validation(nodes, [_edge("igw", "db")], [], [])
        assert any(f.rule_id == "exposed_database" for f in findings)

    def test_exposed_database_no_direct_edge(self):
        nodes = [
            _node("igw", "internet_gateway"),
            _node("ec2", "ec2", sg_ids=["sg-1"]),
            _node("db", "rds"),
        ]
        findings = run_validation(nodes, [_edge("igw", "ec2"), _edge("ec2", "db")], [], [])
        assert not any(f.rule_id == "exposed_database" for f in findings)

    def test_direct_internet_compute(self):
        nodes = [_node("igw", "internet_gateway"), _node("ec2a", "ec2")]
        findings = run_validation(nodes, [_edge("igw", "ec2a")], [], [])
        assert any(f.rule_id == "direct_internet_compute" for f in findings)

    def test_direct_internet_compute_behind_alb(self):
        nodes = [
            _node("igw", "internet_gateway"),
            _node("alb1", "alb"),
            _node("ec2a", "ec2", sg_ids=["sg-1"]),
        ]
        findings = run_validation(
            nodes,
            [_edge("igw", "alb1"), _edge("alb1", "ec2a")],
            [], []
        )
        assert not any(f.rule_id == "direct_internet_compute" for f in findings)

    def test_orphaned_node(self):
        nodes = [_node("ec2", "ec2")]
        findings = run_validation(nodes, [], [], [])
        assert any(f.rule_id == "orphaned_node" for f in findings)

    def test_orphaned_node_exempt_infrastructure(self):
        nodes = [_node("vpc1", "vpc")]
        findings = run_validation(nodes, [], [], [])
        assert not any(f.rule_id == "orphaned_node" for f in findings)

    def test_missing_sg(self):
        nodes = [_node("ec2", "ec2")]
        findings = run_validation(nodes, [], [], [])
        assert any(f.rule_id == "missing_sg" for f in findings)

    def test_missing_sg_not_fired_when_assigned(self):
        nodes = [_node("ec2", "ec2", sg_ids=["sg-123"])]
        findings = run_validation(nodes, [], [], [])
        assert not any(f.rule_id == "missing_sg" for f in findings)

    def test_missing_iam(self):
        nodes = [_node("fn1", "lambda"), _node("db1", "rds")]
        findings = run_validation(nodes, [_edge("fn1", "db1")], [], [])
        assert any(f.rule_id == "missing_iam" for f in findings)

    def test_missing_iam_not_fired_when_role_assigned(self):
        nodes = [
            _node("fn1", "lambda", iam_role_id="role-123"),
            _node("db1", "rds"),
        ]
        findings = run_validation(nodes, [_edge("fn1", "db1")], [], [])
        assert not any(f.rule_id == "missing_iam" for f in findings)

    def test_missing_iam_not_fired_without_data_neighbor(self):
        """Lambda not connected to any data store — IAM rule should not fire."""
        nodes = [_node("fn1", "lambda"), _node("igw", "internet_gateway")]
        findings = run_validation(nodes, [_edge("fn1", "igw")], [], [])
        assert not any(f.rule_id == "missing_iam" for f in findings)

    def test_alb_no_targets(self):
        nodes = [_node("alb1", "alb"), _node("igw", "internet_gateway")]
        findings = run_validation(nodes, [_edge("igw", "alb1")], [], [])
        assert any(f.rule_id == "alb_no_targets" for f in findings)

    def test_alb_has_target_no_finding(self):
        nodes = [_node("alb1", "alb"), _node("ec2a", "ec2", sg_ids=["sg-1"])]
        findings = run_validation(nodes, [_edge("alb1", "ec2a")], [], [])
        assert not any(f.rule_id == "alb_no_targets" for f in findings)

    def test_missing_waf(self):
        nodes = [_node("igw", "internet_gateway"), _node("alb1", "alb")]
        findings = run_validation(nodes, [_edge("igw", "alb1")], [], [])
        assert any(f.rule_id == "missing_waf" for f in findings)

    def test_missing_waf_not_fired_when_present(self):
        nodes = [
            _node("igw", "internet_gateway"),
            _node("alb1", "alb"),
            _node("waf1", "waf"),
        ]
        findings = run_validation(
            nodes,
            [_edge("igw", "alb1"), _edge("waf1", "alb1")],
            [], []
        )
        assert not any(f.rule_id == "missing_waf" for f in findings)

    def test_lambda_no_dlq(self):
        nodes = [_node("fn1", "lambda")]
        findings = run_validation(nodes, [], [], [])
        assert any(f.rule_id == "lambda_no_dlq" for f in findings)

    def test_lambda_dlq_present_no_finding(self):
        nodes = [_node("fn1", "lambda"), _node("q1", "sqs")]
        findings = run_validation(nodes, [_edge("fn1", "q1")], [], [])
        assert not any(f.rule_id == "lambda_no_dlq" for f in findings)

    def test_no_multi_az(self):
        nodes = [_node("db1", "rds", config={"multi_az": False})]
        findings = run_validation(nodes, [], [], [])
        assert any(f.rule_id == "no_multi_az" for f in findings)

    def test_multi_az_enabled_no_finding(self):
        nodes = [_node("db1", "rds", config={
            "multi_az": True, "storage_encrypted": True,
            "backup_retention_period": 7, "deletion_protection": True,
        })]
        findings = run_validation(nodes, [], [], [])
        assert not any(f.rule_id == "no_multi_az" for f in findings)

    def test_missing_cloudwatch(self):
        nodes = [_node("fn1", "lambda")]
        findings = run_validation(nodes, [], [], [])
        assert any(f.rule_id == "missing_cloudwatch" for f in findings)

    def test_cloudwatch_connected_no_finding(self):
        nodes = [
            _node("fn1", "lambda"),
            _node("cw1", "cloudwatch", config={"retention_in_days": 30}),
        ]
        findings = run_validation(nodes, [_edge("fn1", "cw1")], [], [])
        assert not any(f.rule_id == "missing_cloudwatch" for f in findings)

    def test_rds_in_public_subnet(self):
        nodes = [
            _node("sub1", "subnet", config={"map_public_ip_on_launch": True}),
            _node("db1", "rds", parent_id="sub1"),
        ]
        findings = run_validation(nodes, [], [], [])
        assert any(f.rule_id == "rds_in_public_subnet" for f in findings)

    def test_missing_secrets_manager(self):
        nodes = [_node("fn1", "lambda"), _node("db1", "rds")]
        findings = run_validation(nodes, [_edge("fn1", "db1")], [], [])
        assert any(f.rule_id == "missing_secrets_manager" for f in findings)

    def test_secrets_manager_present_no_finding(self):
        nodes = [
            _node("fn1", "lambda"),
            _node("db1", "rds"),
            _node("sm1", "secretsmanager"),
        ]
        findings = run_validation(
            nodes,
            [_edge("fn1", "db1"), _edge("fn1", "sm1")],
            [], []
        )
        assert not any(f.rule_id == "missing_secrets_manager" for f in findings)

    def test_nat_gateway_missing(self):
        nodes = [
            _node("sub1", "subnet", config={"map_public_ip_on_launch": False}),
            _node("fn1", "lambda", parent_id="sub1"),
        ]
        findings = run_validation(nodes, [], [], [])
        assert any(f.rule_id == "nat_gateway_missing" for f in findings)

    def test_nat_gateway_present_no_finding(self):
        nodes = [
            _node("sub1", "subnet", config={"map_public_ip_on_launch": False}),
            _node("fn1", "lambda", parent_id="sub1"),
            _node("nat1", "nat_gateway"),
        ]
        findings = run_validation(nodes, [_edge("sub1", "nat1")], [], [])
        assert not any(f.rule_id == "nat_gateway_missing" for f in findings)

    def test_nat_single_az(self):
        nodes = [
            _node("nat1", "nat_gateway"),
            _node("sub1", "subnet", config={"map_public_ip_on_launch": False}),
            _node("sub2", "subnet", config={"map_public_ip_on_launch": False}),
        ]
        findings = run_validation(nodes, [], [], [])
        assert any(f.rule_id == "nat_single_az" for f in findings)

    def test_nat_single_az_one_private_subnet_no_finding(self):
        """One NAT + one private subnet is fine — no redundancy needed."""
        nodes = [
            _node("nat1", "nat_gateway"),
            _node("sub1", "subnet", config={"map_public_ip_on_launch": False}),
        ]
        findings = run_validation(nodes, [], [], [])
        assert not any(f.rule_id == "nat_single_az" for f in findings)

    def test_alb_http_no_redirect(self):
        nodes = [_node("alb1", "alb", config={"scheme": "internet-facing"})]
        findings = run_validation(nodes, [], [], [])
        assert any(f.rule_id == "alb_http_no_redirect" for f in findings)

    def test_alb_https_configured_no_finding(self):
        nodes = [_node("alb1", "alb", config={
            "scheme": "internet-facing",
            "certificate_arn": "arn:aws:acm:us-east-1:123:certificate/abc",
        })]
        findings = run_validation(nodes, [], [], [])
        assert not any(f.rule_id == "alb_http_no_redirect" for f in findings)

    def test_alb_internal_no_redirect_finding(self):
        nodes = [_node("alb1", "alb", config={"scheme": "internal", "internal": True})]
        findings = run_validation(nodes, [], [], [])
        assert not any(f.rule_id == "alb_http_no_redirect" for f in findings)

    def test_alb_single_az(self):
        nodes = [
            _node("alb1", "alb"),
            _node("sub1", "subnet"),
        ]
        findings = run_validation(nodes, [_edge("alb1", "sub1")], [], [])
        assert any(f.rule_id == "alb_single_az" for f in findings)

    def test_alb_multi_az_no_finding(self):
        nodes = [
            _node("alb1", "alb"),
            _node("sub1", "subnet"),
            _node("sub2", "subnet"),
        ]
        findings = run_validation(
            nodes,
            [_edge("alb1", "sub1"), _edge("alb1", "sub2")],
            [], []
        )
        assert not any(f.rule_id == "alb_single_az" for f in findings)


# ─── SG rule tests ────────────────────────────────────────────────────────────


class TestSGRules:

    def test_sg_open_all(self):
        sg = _sg("wide-open", [{"protocol": "-1", "port": "-1", "source": "0.0.0.0/0"}])
        findings = run_validation([], [], [sg], [])
        assert any(f.rule_id == "sg_open_all" for f in findings)

    def test_sg_open_ssh(self):
        sg = _sg("ssh-open", [{"protocol": "tcp", "port": "22", "source": "0.0.0.0/0"}])
        findings = run_validation([], [], [sg], [])
        assert any(f.rule_id == "sg_open_ssh" for f in findings)

    def test_sg_open_rdp(self):
        sg = _sg("rdp-open", [{"protocol": "tcp", "port": "3389", "source": "0.0.0.0/0"}])
        findings = run_validation([], [], [sg], [])
        assert any(f.rule_id == "sg_open_rdp" for f in findings)

    def test_sg_open_db_port_mysql(self):
        sg = _sg("db-open", [{"protocol": "tcp", "port": "3306", "source": "0.0.0.0/0"}])
        findings = run_validation([], [], [sg], [])
        assert any(f.rule_id == "sg_open_db_port" for f in findings)

    def test_sg_open_db_port_postgres(self):
        sg = _sg("db-open", [{"protocol": "tcp", "port": "5432", "source": "0.0.0.0/0"}])
        findings = run_validation([], [], [sg], [])
        assert any(f.rule_id == "sg_open_db_port" for f in findings)

    def test_sg_open_db_port_redis(self):
        sg = _sg("db-open", [{"protocol": "tcp", "port": "6379", "source": "0.0.0.0/0"}])
        findings = run_validation([], [], [sg], [])
        assert any(f.rule_id == "sg_open_db_port" for f in findings)

    def test_sg_restricted_no_finding(self):
        sg = _sg("restricted", [{"protocol": "tcp", "port": "22", "source": "10.0.0.0/8"}])
        findings = run_validation([], [], [sg], [])
        assert not any(f.rule_id == "sg_open_ssh" for f in findings)

    def test_sg_http_without_https(self):
        sg = _sg("http-only", [{"protocol": "tcp", "port": "80", "source": "0.0.0.0/0"}])
        findings = run_validation([], [], [sg], [])
        assert any(f.rule_id == "sg_http_not_https" for f in findings)

    def test_sg_http_and_https_no_finding(self):
        sg = _sg("https", [
            {"protocol": "tcp", "port": "80", "source": "0.0.0.0/0"},
            {"protocol": "tcp", "port": "443", "source": "0.0.0.0/0"},
        ])
        findings = run_validation([], [], [sg], [])
        assert not any(f.rule_id == "sg_http_not_https" for f in findings)

    def test_sg_wide_port_range(self):
        sg = _sg("wide-range", [{"protocol": "tcp", "port": "1024-65535", "source": "0.0.0.0/0"}])
        findings = run_validation([], [], [sg], [])
        assert any(f.rule_id == "sg_ephemeral_ports" for f in findings)

    def test_sg_telnet_open(self):
        sg = _sg("telnet", [{"protocol": "tcp", "port": "23", "source": "0.0.0.0/0"}])
        findings = run_validation([], [], [sg], [])
        assert any(f.rule_id == "sg_open_telnet" for f in findings)

    def test_sg_open_ftp(self):
        sg = _sg("ftp", [{"protocol": "tcp", "port": "21", "source": "0.0.0.0/0"}])
        findings = run_validation([], [], [sg], [])
        assert any(f.rule_id == "sg_open_ftp" for f in findings)

    def test_sg_open_ftp_data_port(self):
        sg = _sg("ftp-data", [{"protocol": "tcp", "port": "20", "source": "0.0.0.0/0"}])
        findings = run_validation([], [], [sg], [])
        assert any(f.rule_id == "sg_open_ftp" for f in findings)

    def test_sg_open_ftp_internal_no_finding(self):
        sg = _sg("ftp-internal", [{"protocol": "tcp", "port": "21", "source": "10.0.0.0/8"}])
        findings = run_validation([], [], [sg], [])
        assert not any(f.rule_id == "sg_open_ftp" for f in findings)

    def test_sg_open_smtp(self):
        sg = _sg("smtp", [{"protocol": "tcp", "port": "25", "source": "0.0.0.0/0"}])
        findings = run_validation([], [], [sg], [])
        assert any(f.rule_id == "sg_open_smtp" for f in findings)

    def test_sg_open_smtp_internal_no_finding(self):
        sg = _sg("smtp-internal", [{"protocol": "tcp", "port": "25", "source": "10.0.0.0/8"}])
        findings = run_validation([], [], [sg], [])
        assert not any(f.rule_id == "sg_open_smtp" for f in findings)

    def test_sg_open_pop3(self):
        sg = _sg("pop3", [{"protocol": "tcp", "port": "110", "source": "0.0.0.0/0"}])
        findings = run_validation([], [], [sg], [])
        assert any(f.rule_id == "sg_open_pop3_imap" for f in findings)

    def test_sg_open_imap(self):
        sg = _sg("imap", [{"protocol": "tcp", "port": "143", "source": "0.0.0.0/0"}])
        findings = run_validation([], [], [sg], [])
        assert any(f.rule_id == "sg_open_pop3_imap" for f in findings)

    def test_sg_open_imaps(self):
        sg = _sg("imaps", [{"protocol": "tcp", "port": "993", "source": "0.0.0.0/0"}])
        findings = run_validation([], [], [sg], [])
        assert any(f.rule_id == "sg_open_pop3_imap" for f in findings)

    def test_sg_admin_port_elasticsearch(self):
        sg = _sg("es-admin", [{"protocol": "tcp", "port": "9200", "source": "0.0.0.0/0"}])
        findings = run_validation([], [], [sg], [])
        assert any(f.rule_id == "sg_open_admin_port" for f in findings)

    def test_default_sg_unrestricted(self):
        sg = _sg("default", [{"protocol": "tcp", "port": "443", "source": "0.0.0.0/0"}])
        findings = run_validation([], [], [sg], [])
        assert any(f.rule_id == "default_sg_unrestricted" for f in findings)

    def test_default_sg_no_rules_no_finding(self):
        sg = SecurityGroup(id="sg-default", name="default", inbound=[])
        findings = run_validation([], [], [sg], [])
        assert not any(f.rule_id == "default_sg_unrestricted" for f in findings)


# ─── IAM rule tests ───────────────────────────────────────────────────────────


class TestIAMRules:

    def test_iam_admin_policy(self):
        role = _role("admin", [{"effect": "Allow", "actions": ["*"], "resources": ["*"]}])
        findings = run_validation([], [], [], [role])
        assert any(f.rule_id == "iam_admin_policy" for f in findings)

    def test_iam_wildcard_sensitive_s3(self):
        role = _role("s3-admin", [{"effect": "Allow", "actions": ["s3:*"], "resources": ["*"]}])
        findings = run_validation([], [], [], [role])
        assert any(f.rule_id == "iam_wildcard_sensitive" for f in findings)

    def test_iam_wildcard_sensitive_kms(self):
        role = _role("kms-admin", [{"effect": "Allow", "actions": ["kms:*"], "resources": ["*"]}])
        findings = run_validation([], [], [], [role])
        assert any(f.rule_id == "iam_wildcard_sensitive" for f in findings)

    def test_iam_specific_actions_no_finding(self):
        role = _role("readonly", [
            {"effect": "Allow", "actions": ["s3:GetObject", "s3:ListBucket"],
             "resources": ["arn:aws:s3:::my-bucket/*"]},
        ])
        findings = run_validation([], [], [], [role])
        assert not any(f.rule_id in ("iam_admin_policy", "iam_wildcard_sensitive") for f in findings)

    def test_iam_deny_not_flagged(self):
        role = _role("deny-all", [{"effect": "Deny", "actions": ["*"], "resources": ["*"]}])
        findings = run_validation([], [], [], [role])
        assert not any(f.rule_id == "iam_admin_policy" for f in findings)

    def test_iam_no_resource_constraint(self):
        role = _role("no-scope", [
            {"effect": "Allow", "actions": ["s3:GetObject"], "resources": ["*"]},
        ])
        findings = run_validation([], [], [], [role])
        assert any(f.rule_id == "iam_no_resource_constraint" for f in findings)

    def test_iam_resource_scoped_no_finding(self):
        role = _role("scoped", [
            {"effect": "Allow", "actions": ["s3:GetObject"],
             "resources": ["arn:aws:s3:::my-bucket/*"]},
        ])
        findings = run_validation([], [], [], [role])
        assert not any(f.rule_id == "iam_no_resource_constraint" for f in findings)

    def test_iam_inline_policy(self):
        role = _role("my_inline", [
            {"effect": "Allow", "actions": ["s3:GetObject"], "resources": ["*"]},
        ], id_suffix="_role_policy")
        findings = run_validation([], [], [], [role])
        assert any(f.rule_id == "iam_inline_policy" for f in findings)

    def test_iam_attached_policy_no_inline_finding(self):
        role = _role("my_attached", [
            {"effect": "Allow", "actions": ["s3:GetObject"],
             "resources": ["arn:aws:s3:::my-bucket/*"]},
        ])
        findings = run_validation([], [], [], [role])
        assert not any(f.rule_id == "iam_inline_policy" for f in findings)


# ─── Compliance rule tests ────────────────────────────────────────────────────


class TestComplianceRules:

    def test_cloudtrail_not_enabled(self):
        nodes = [
            _node("vpc1", "vpc"),
            _node("ec2a", "ec2", sg_ids=["sg-1"]),
        ]
        findings = run_validation(nodes, [_edge("vpc1", "ec2a")], [], [])
        assert any(f.rule_id == "cloudtrail_not_enabled" for f in findings)

    def test_cloudtrail_not_enabled_fires_once(self):
        """Should produce exactly one finding even with multiple auditable resources."""
        nodes = [
            _node("vpc1", "vpc"),
            _node("ec2a", "ec2", sg_ids=["sg-1"]),
            _node("db1", "rds"),
            _node("bkt1", "s3"),
        ]
        findings = run_validation(nodes, [], [], [])
        ct_findings = [f for f in findings if f.rule_id == "cloudtrail_not_enabled"]
        assert len(ct_findings) == 1

    def test_cloudtrail_present_no_finding(self):
        nodes = [
            _node("vpc1", "vpc"),
            _node("trail1", "cloudtrail"),
        ]
        findings = run_validation(nodes, [], [], [])
        assert not any(f.rule_id == "cloudtrail_not_enabled" for f in findings)

    def test_vpc_flow_logs_disabled(self):
        nodes = [_node("vpc1", "vpc")]
        findings = run_validation(nodes, [], [], [])
        assert any(f.rule_id == "vpc_flow_logs_disabled" for f in findings)

    def test_vpc_flow_logs_present_no_finding(self):
        nodes = [
            _node("vpc1", "vpc"),
            _node("fl1", "flow_log"),
        ]
        findings = run_validation(nodes, [], [], [])
        assert not any(f.rule_id == "vpc_flow_logs_disabled" for f in findings)

    def test_kms_no_cmk_rds(self):
        nodes = [_node("db1", "rds", config={})]
        findings = run_validation(nodes, [], [], [])
        assert any(f.rule_id == "kms_no_cmk" for f in findings)

    def test_kms_no_cmk_s3(self):
        nodes = [_node("bkt1", "s3", config={})]
        findings = run_validation(nodes, [], [], [])
        assert any(f.rule_id == "kms_no_cmk" for f in findings)

    def test_kms_cmk_present_no_finding(self):
        nodes = [_node("db1", "rds", config={
            "kms_key_id": "arn:aws:kms:us-east-1:123:key/abc",
            "storage_encrypted": True,
            "backup_retention_period": 7,
            "deletion_protection": True,
        })]
        findings = run_validation(nodes, [], [], [])
        assert not any(f.rule_id == "kms_no_cmk" for f in findings)

    def test_waf_required_on_public_alb(self):
        nodes = [_node("alb1", "alb", config={"internal": False})]
        findings = run_validation(nodes, [], [], [])
        assert any(f.rule_id == "waf_required_on_public_alb" for f in findings)

    def test_waf_present_no_compliance_finding(self):
        nodes = [
            _node("alb1", "alb", config={"internal": False}),
            _node("waf1", "waf"),
        ]
        findings = run_validation(nodes, [], [], [])
        assert not any(f.rule_id == "waf_required_on_public_alb" for f in findings)

    def test_internal_alb_no_waf_finding(self):
        nodes = [_node("alb1", "alb", config={"internal": True})]
        findings = run_validation(nodes, [], [], [])
        assert not any(f.rule_id == "waf_required_on_public_alb" for f in findings)


# ─── Standards tagging tests ──────────────────────────────────────────────────


class TestStandardsTagging:

    def test_rds_unencrypted_has_standards(self):
        nodes = [_node("db1", "rds", config={"storage_encrypted": False})]
        findings = run_validation(nodes, [], [], [])
        f = next((f for f in findings if f.rule_id == "rds_unencrypted"), None)
        assert f is not None
        assert len(f.standards) > 0

    def test_cloudtrail_not_enabled_has_standards(self):
        nodes = [_node("vpc1", "vpc")]
        findings = run_validation(nodes, [], [], [])
        f = next((f for f in findings if f.rule_id == "cloudtrail_not_enabled"), None)
        assert f is not None
        assert "CIS" in f.standards or "SOC2" in f.standards

    def test_finops_rule_has_no_standards(self):
        """FinOps rules are pure cost — no compliance standard should be tagged."""
        nodes = [_node("vol1", "ebs", config={"volume_type": "gp2"})]
        findings = run_validation(nodes, [], [], [])
        f = next((f for f in findings if f.rule_id == "ebs_gp2_upgrade"), None)
        assert f is not None
        assert f.standards == []


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


# ─── Tests for 23 parity rules added in v0.9 ─────────────────────────────────


class TestParityConfigRules:
    """Tests for the 13 config-level rules added to achieve JS/CLI parity."""

    # ── cis_cloudtrail_log_validation ─────────────────────────────────────────

    def test_cloudtrail_log_validation_disabled(self):
        nodes = [_node("ct", "cloudtrail", config={"enable_log_file_validation": False})]
        findings = run_validation(nodes, [], [], [])
        assert any(f.rule_id == "cis_cloudtrail_log_validation" for f in findings)

    def test_cloudtrail_log_validation_string_false(self):
        nodes = [_node("ct", "cloudtrail", config={"enable_log_file_validation": "false"})]
        findings = run_validation(nodes, [], [], [])
        assert any(f.rule_id == "cis_cloudtrail_log_validation" for f in findings)

    def test_cloudtrail_log_validation_enabled_no_finding(self):
        nodes = [_node("ct", "cloudtrail", config={"enable_log_file_validation": True})]
        findings = run_validation(nodes, [], [], [])
        assert not any(f.rule_id == "cis_cloudtrail_log_validation" for f in findings)

    # ── cis_cloudtrail_multi_region ───────────────────────────────────────────

    def test_cloudtrail_multi_region_disabled(self):
        nodes = [_node("ct", "cloudtrail", config={"is_multi_region_trail": False})]
        findings = run_validation(nodes, [], [], [])
        assert any(f.rule_id == "cis_cloudtrail_multi_region" for f in findings)

    def test_cloudtrail_multi_region_enabled_no_finding(self):
        nodes = [_node("ct", "cloudtrail", config={"is_multi_region_trail": True})]
        findings = run_validation(nodes, [], [], [])
        assert not any(f.rule_id == "cis_cloudtrail_multi_region" for f in findings)

    # ── cis_rds_auto_minor_upgrade ────────────────────────────────────────────

    def test_rds_auto_minor_upgrade_false(self):
        nodes = [_node("db", "rds", config={"auto_minor_version_upgrade": False})]
        findings = run_validation(nodes, [], [], [])
        assert any(f.rule_id == "cis_rds_auto_minor_upgrade" for f in findings)

    def test_aurora_auto_minor_upgrade_false(self):
        nodes = [_node("db", "aurora", config={"auto_minor_version_upgrade": False})]
        findings = run_validation(nodes, [], [], [])
        assert any(f.rule_id == "cis_rds_auto_minor_upgrade" for f in findings)

    def test_rds_auto_minor_upgrade_true_no_finding(self):
        nodes = [_node("db", "rds", config={"auto_minor_version_upgrade": True})]
        findings = run_validation(nodes, [], [], [])
        assert not any(f.rule_id == "cis_rds_auto_minor_upgrade" for f in findings)

    # ── cis_s3_mfa_delete ─────────────────────────────────────────────────────

    def test_s3_versioning_without_mfa_delete(self):
        nodes = [_node("bkt", "s3", config={
            "versioning": {"enabled": True, "mfa_delete": "Disabled"}
        })]
        findings = run_validation(nodes, [], [], [])
        assert any(f.rule_id == "cis_s3_mfa_delete" for f in findings)

    def test_s3_versioning_with_mfa_delete_no_finding(self):
        nodes = [_node("bkt", "s3", config={
            "versioning": {"enabled": True, "mfa_delete": "Enabled"}
        })]
        findings = run_validation(nodes, [], [], [])
        assert not any(f.rule_id == "cis_s3_mfa_delete" for f in findings)

    def test_s3_no_versioning_no_mfa_finding(self):
        nodes = [_node("bkt", "s3", config={})]
        findings = run_validation(nodes, [], [], [])
        assert not any(f.rule_id == "cis_s3_mfa_delete" for f in findings)

    # ── guardduty_detector_disabled ───────────────────────────────────────────

    def test_guardduty_disabled(self):
        nodes = [_node("gd", "guardduty", config={"enable": False})]
        findings = run_validation(nodes, [], [], [])
        assert any(f.rule_id == "guardduty_detector_disabled" for f in findings)

    def test_guardduty_enabled_no_finding(self):
        nodes = [_node("gd", "guardduty", config={"enable": True})]
        findings = run_validation(nodes, [], [], [])
        assert not any(f.rule_id == "guardduty_detector_disabled" for f in findings)

    # ── macie_disabled ────────────────────────────────────────────────────────

    def test_macie_paused(self):
        nodes = [_node("mac", "macie", config={"status": "PAUSED"})]
        findings = run_validation(nodes, [], [], [])
        assert any(f.rule_id == "macie_disabled" for f in findings)

    def test_macie_enabled_false(self):
        nodes = [_node("mac", "macie", config={"enabled": False})]
        findings = run_validation(nodes, [], [], [])
        assert any(f.rule_id == "macie_disabled" for f in findings)

    def test_macie_enabled_no_finding(self):
        nodes = [_node("mac", "macie", config={"status": "ENABLED"})]
        findings = run_validation(nodes, [], [], [])
        assert not any(f.rule_id == "macie_disabled" for f in findings)

    # ── nist_ec2_detailed_monitoring ──────────────────────────────────────────

    def test_ec2_monitoring_false(self):
        nodes = [_node("ec2a", "ec2", config={"monitoring": False})]
        findings = run_validation(nodes, [], [], [])
        assert any(f.rule_id == "nist_ec2_detailed_monitoring" for f in findings)

    def test_ec2_monitoring_enabled_no_finding(self):
        nodes = [_node("ec2a", "ec2", config={"monitoring": True})]
        findings = run_validation(nodes, [], [], [])
        assert not any(f.rule_id == "nist_ec2_detailed_monitoring" for f in findings)

    # ── nist_lambda_env_encryption ────────────────────────────────────────────

    def test_lambda_env_vars_no_kms(self):
        nodes = [_node("fn", "lambda", config={
            "environment": {"DB_HOST": "localhost"},
        })]
        findings = run_validation(nodes, [], [], [])
        assert any(f.rule_id == "nist_lambda_env_encryption" for f in findings)

    def test_lambda_env_vars_with_kms_no_finding(self):
        nodes = [_node("fn", "lambda", config={
            "environment": {"DB_HOST": "localhost"},
            "kms_key_arn": "arn:aws:kms:us-east-1:123:key/abc",
        })]
        findings = run_validation(nodes, [], [], [])
        assert not any(f.rule_id == "nist_lambda_env_encryption" for f in findings)

    def test_lambda_no_env_vars_no_finding(self):
        nodes = [_node("fn", "lambda", config={})]
        findings = run_validation(nodes, [], [], [])
        assert not any(f.rule_id == "nist_lambda_env_encryption" for f in findings)

    # ── nist_rds_iam_auth ─────────────────────────────────────────────────────

    def test_rds_iam_auth_disabled(self):
        nodes = [_node("db", "rds", config={"iam_database_authentication_enabled": False})]
        findings = run_validation(nodes, [], [], [])
        assert any(f.rule_id == "nist_rds_iam_auth" for f in findings)

    def test_rds_iam_auth_enabled_no_finding(self):
        nodes = [_node("db", "rds", config={"iam_database_authentication_enabled": True})]
        findings = run_validation(nodes, [], [], [])
        assert not any(f.rule_id == "nist_rds_iam_auth" for f in findings)

    # ── nist_rds_no_ssl ───────────────────────────────────────────────────────

    def test_rds_no_ssl_config(self):
        nodes = [_node("db", "rds", config={})]
        findings = run_validation(nodes, [], [], [])
        assert any(f.rule_id == "nist_rds_no_ssl" for f in findings)

    def test_rds_ssl_via_parameter_group_no_finding(self):
        nodes = [_node("db", "rds", config={"parameter_group_name": "pg-ssl"})]
        findings = run_validation(nodes, [], [], [])
        assert not any(f.rule_id == "nist_rds_no_ssl" for f in findings)

    def test_rds_ssl_enforcement_no_finding(self):
        nodes = [_node("db", "rds", config={"ssl_enforcement_enabled": True})]
        findings = run_validation(nodes, [], [], [])
        assert not any(f.rule_id == "nist_rds_no_ssl" for f in findings)

    # ── nist_s3_access_logging ────────────────────────────────────────────────

    def test_s3_no_access_logging(self):
        nodes = [_node("bkt", "s3", config={})]
        findings = run_validation(nodes, [], [], [])
        assert any(f.rule_id == "nist_s3_access_logging" for f in findings)

    def test_s3_access_logging_enabled_no_finding(self):
        nodes = [_node("bkt", "s3", config={
            "logging": {"target_bucket": "logs-bucket", "target_prefix": "access/"}
        })]
        findings = run_validation(nodes, [], [], [])
        assert not any(f.rule_id == "nist_s3_access_logging" for f in findings)

    # ── s3_public_acl ─────────────────────────────────────────────────────────

    def test_s3_public_read_acl(self):
        nodes = [_node("bkt", "s3", config={"acl": "public-read"})]
        findings = run_validation(nodes, [], [], [])
        assert any(f.rule_id == "s3_public_acl" for f in findings)

    def test_s3_public_read_write_acl(self):
        nodes = [_node("bkt", "s3", config={"acl": "public-read-write"})]
        findings = run_validation(nodes, [], [], [])
        assert any(f.rule_id == "s3_public_acl" for f in findings)

    def test_s3_private_acl_no_finding(self):
        nodes = [_node("bkt", "s3", config={"acl": "private"})]
        findings = run_validation(nodes, [], [], [])
        assert not any(f.rule_id == "s3_public_acl" for f in findings)

    # ── waf_no_logging ────────────────────────────────────────────────────────

    def test_waf_no_logging_config(self):
        nodes = [_node("waf1", "waf", config={})]
        findings = run_validation(nodes, [], [], [])
        assert any(f.rule_id == "waf_no_logging" for f in findings)

    def test_waf_with_logging_no_finding(self):
        nodes = [_node("waf1", "waf", config={
            "logging_configuration": {"log_destination_configs": ["arn:aws:firehose:..."]}
        })]
        findings = run_validation(nodes, [], [], [])
        assert not any(f.rule_id == "waf_no_logging" for f in findings)


class TestParityTopologyRules:
    """Tests for the 10 topology-level rules added to achieve JS/CLI parity."""

    # ── cis_config_missing ────────────────────────────────────────────────────

    def test_cis_config_missing_fires_with_ec2(self):
        nodes = [_node("ec2a", "ec2")]
        findings = run_validation(nodes, [], [], [])
        assert any(f.rule_id == "cis_config_missing" for f in findings)

    def test_cis_config_missing_not_fired_when_present(self):
        nodes = [_node("ec2a", "ec2"), _node("cfg", "config")]
        findings = run_validation(nodes, [], [], [])
        assert not any(f.rule_id == "cis_config_missing" for f in findings)

    def test_cis_config_missing_not_fired_empty_arch(self):
        nodes = [_node("waf1", "waf")]
        findings = run_validation(nodes, [], [], [])
        assert not any(f.rule_id == "cis_config_missing" for f in findings)

    # ── guardduty_missing ─────────────────────────────────────────────────────

    def test_guardduty_missing_fires_with_vpc(self):
        nodes = [_node("vpc1", "vpc")]
        findings = run_validation(nodes, [], [], [])
        assert any(f.rule_id == "guardduty_missing" for f in findings)

    def test_guardduty_missing_not_fired_when_present(self):
        nodes = [_node("vpc1", "vpc"), _node("gd", "guardduty")]
        findings = run_validation(nodes, [], [], [])
        assert not any(f.rule_id == "guardduty_missing" for f in findings)

    # ── nist_backup_plan_missing ──────────────────────────────────────────────

    def test_backup_missing_fires_with_rds(self):
        nodes = [_node("db", "rds")]
        findings = run_validation(nodes, [], [], [])
        assert any(f.rule_id == "nist_backup_plan_missing" for f in findings)

    def test_backup_missing_fires_with_dynamodb(self):
        nodes = [_node("tbl", "dynamodb")]
        findings = run_validation(nodes, [], [], [])
        assert any(f.rule_id == "nist_backup_plan_missing" for f in findings)

    def test_backup_missing_not_fired_when_present(self):
        nodes = [_node("db", "rds"), _node("bkp", "backup")]
        findings = run_validation(nodes, [], [], [])
        assert not any(f.rule_id == "nist_backup_plan_missing" for f in findings)

    # ── nist_cloudwatch_no_alerting ───────────────────────────────────────────

    def test_cloudwatch_no_sns_fires(self):
        nodes = [_node("cw", "cloudwatch")]
        findings = run_validation(nodes, [], [], [])
        assert any(f.rule_id == "nist_cloudwatch_no_alerting" for f in findings)

    def test_cloudwatch_connected_to_sns_no_finding(self):
        nodes = [_node("cw", "cloudwatch"), _node("sns1", "sns")]
        findings = run_validation(nodes, [_edge("cw", "sns1")], [], [])
        assert not any(f.rule_id == "nist_cloudwatch_no_alerting" for f in findings)

    # ── nist_shield_missing ───────────────────────────────────────────────────

    def test_shield_missing_fires_with_cloudfront(self):
        nodes = [_node("cf", "cloudfront")]
        findings = run_validation(nodes, [], [], [])
        assert any(f.rule_id == "nist_shield_missing" for f in findings)

    def test_shield_missing_fires_with_alb(self):
        nodes = [_node("alb1", "alb")]
        findings = run_validation(nodes, [], [], [])
        assert any(f.rule_id == "nist_shield_missing" for f in findings)

    def test_shield_missing_not_fired_when_present(self):
        nodes = [_node("cf", "cloudfront"), _node("sh", "shield")]
        findings = run_validation(nodes, [], [], [])
        assert not any(f.rule_id == "nist_shield_missing" for f in findings)

    # ── nist_ssm_missing ──────────────────────────────────────────────────────

    def test_ssm_missing_fires_for_ec2(self):
        nodes = [_node("ec2a", "ec2", config={})]
        findings = run_validation(nodes, [], [], [])
        assert any(f.rule_id == "nist_ssm_missing" for f in findings)

    def test_ssm_missing_not_fired_when_connected(self):
        nodes = [_node("ec2a", "ec2"), _node("ssm1", "systems_manager")]
        findings = run_validation(nodes, [_edge("ec2a", "ssm1")], [], [])
        assert not any(f.rule_id == "nist_ssm_missing" for f in findings)

    def test_ssm_missing_not_fired_with_flag(self):
        nodes = [_node("ec2a", "ec2", config={"ssm_managed": True})]
        findings = run_validation(nodes, [], [], [])
        assert not any(f.rule_id == "nist_ssm_missing" for f in findings)

    # ── nist_xray_missing ─────────────────────────────────────────────────────

    def test_xray_missing_fires_for_lambda(self):
        nodes = [_node("fn", "lambda", config={})]
        findings = run_validation(nodes, [], [], [])
        assert any(f.rule_id == "nist_xray_missing" for f in findings)

    def test_xray_missing_fires_for_api_gateway(self):
        nodes = [_node("apigw", "api_gateway", config={})]
        findings = run_validation(nodes, [], [], [])
        assert any(f.rule_id == "nist_xray_missing" for f in findings)

    def test_xray_missing_not_fired_when_neighbor_present(self):
        nodes = [_node("fn", "lambda"), _node("xr", "xray")]
        findings = run_validation(nodes, [_edge("fn", "xr")], [], [])
        assert not any(f.rule_id == "nist_xray_missing" for f in findings)

    def test_xray_missing_not_fired_when_tracing_active(self):
        nodes = [_node("fn", "lambda", config={"tracing_mode": "Active"})]
        findings = run_validation(nodes, [], [], [])
        assert not any(f.rule_id == "nist_xray_missing" for f in findings)

    # ── pci_inspector_missing ─────────────────────────────────────────────────

    def test_inspector_missing_fires_with_ec2(self):
        nodes = [_node("ec2a", "ec2")]
        findings = run_validation(nodes, [], [], [])
        assert any(f.rule_id == "pci_inspector_missing" for f in findings)

    def test_inspector_missing_fires_with_lambda(self):
        nodes = [_node("fn", "lambda")]
        findings = run_validation(nodes, [], [], [])
        assert any(f.rule_id == "pci_inspector_missing" for f in findings)

    def test_inspector_missing_not_fired_when_present(self):
        nodes = [_node("ec2a", "ec2"), _node("insp", "inspector")]
        findings = run_validation(nodes, [], [], [])
        assert not any(f.rule_id == "pci_inspector_missing" for f in findings)

    # ── security_hub_missing ──────────────────────────────────────────────────

    def test_security_hub_missing_fires_with_lambda(self):
        nodes = [_node("fn", "lambda")]
        findings = run_validation(nodes, [], [], [])
        assert any(f.rule_id == "security_hub_missing" for f in findings)

    def test_security_hub_missing_not_fired_when_present(self):
        nodes = [_node("fn", "lambda"), _node("sechub", "security_hub")]
        findings = run_validation(nodes, [], [], [])
        assert not any(f.rule_id == "security_hub_missing" for f in findings)

    # ── cis_cloudtrail_bucket_logging ─────────────────────────────────────────

    def test_cloudtrail_bucket_logging_missing(self):
        nodes = [
            _node("ct", "cloudtrail"),
            _node("bkt", "s3", config={}),
        ]
        findings = run_validation(nodes, [_edge("ct", "bkt")], [], [])
        assert any(f.rule_id == "cis_cloudtrail_bucket_logging" for f in findings)

    def test_cloudtrail_bucket_logging_present_no_finding(self):
        nodes = [
            _node("ct", "cloudtrail"),
            _node("bkt", "s3", config={
                "logging": {"target_bucket": "other-bucket"}
            }),
        ]
        findings = run_validation(nodes, [_edge("ct", "bkt")], [], [])
        assert not any(f.rule_id == "cis_cloudtrail_bucket_logging" for f in findings)

    def test_cloudtrail_no_s3_neighbor_no_finding(self):
        nodes = [_node("ct", "cloudtrail")]
        findings = run_validation(nodes, [], [], [])
        assert not any(f.rule_id == "cis_cloudtrail_bucket_logging" for f in findings)


# ─── Azure Config Rule tests ──────────────────────────────────────────────────


class TestAzureConfigRules:

    def test_vm_password_auth_fires(self):
        nodes = [_node("v", "azure_vm", config={"disable_password_authentication": False})]
        findings = run_validation(nodes, [], [], [])
        assert any(f.rule_id == "azure_vm_password_auth" for f in findings)

    def test_vm_password_auth_no_fire_when_true(self):
        nodes = [_node("v", "azure_vm", config={"disable_password_authentication": True})]
        findings = run_validation(nodes, [], [], [])
        assert not any(f.rule_id == "azure_vm_password_auth" for f in findings)

    def test_vm_password_auth_no_fire_when_unset(self):
        nodes = [_node("v", "azure_vm", config={})]
        findings = run_validation(nodes, [], [], [])
        assert not any(f.rule_id == "azure_vm_password_auth" for f in findings)

    def test_vm_boot_diagnostics_fires_when_missing(self):
        nodes = [_node("v", "azure_vm", config={})]
        findings = run_validation(nodes, [], [], [])
        assert any(f.rule_id == "azure_vm_no_boot_diagnostics" for f in findings)

    def test_vm_boot_diagnostics_no_fire_when_enabled(self):
        nodes = [_node("v", "azure_vm", config={"boot_diagnostics_enabled": True})]
        findings = run_validation(nodes, [], [], [])
        assert not any(f.rule_id == "azure_vm_no_boot_diagnostics" for f in findings)

    def test_aks_rbac_disabled_fires(self):
        nodes = [_node("k", "azure_aks", config={"role_based_access_control_enabled": False})]
        findings = run_validation(nodes, [], [], [])
        assert any(f.rule_id == "azure_aks_rbac_disabled" for f in findings)

    def test_aks_rbac_disabled_no_fire_when_true(self):
        nodes = [_node("k", "azure_aks", config={"role_based_access_control_enabled": True})]
        findings = run_validation(nodes, [], [], [])
        assert not any(f.rule_id == "azure_aks_rbac_disabled" for f in findings)

    def test_aks_no_private_cluster_fires(self):
        nodes = [_node("k", "azure_aks", config={})]
        findings = run_validation(nodes, [], [], [])
        assert any(f.rule_id == "azure_aks_no_private_cluster" for f in findings)

    def test_aks_no_private_cluster_no_fire_when_enabled(self):
        nodes = [_node("k", "azure_aks", config={"private_cluster_enabled": True})]
        findings = run_validation(nodes, [], [], [])
        assert not any(f.rule_id == "azure_aks_no_private_cluster" for f in findings)

    def test_aks_no_authorized_ips_fires(self):
        nodes = [_node("k", "azure_aks", config={})]
        findings = run_validation(nodes, [], [], [])
        assert any(f.rule_id == "azure_aks_no_authorized_ips" for f in findings)

    def test_aks_no_authorized_ips_no_fire_when_set(self):
        nodes = [_node("k", "azure_aks", config={"api_server_authorized_ip_ranges": "10.0.0.0/8"})]
        findings = run_validation(nodes, [], [], [])
        assert not any(f.rule_id == "azure_aks_no_authorized_ips" for f in findings)

    def test_aks_no_authorized_ips_no_fire_when_private(self):
        nodes = [_node("k", "azure_aks", config={"private_cluster_enabled": True})]
        findings = run_validation(nodes, [], [], [])
        assert not any(f.rule_id == "azure_aks_no_authorized_ips" for f in findings)

    def test_aks_no_network_policy_fires(self):
        nodes = [_node("k", "azure_aks", config={})]
        findings = run_validation(nodes, [], [], [])
        assert any(f.rule_id == "azure_aks_no_network_policy" for f in findings)

    def test_aks_no_network_policy_no_fire_when_set(self):
        nodes = [_node("k", "azure_aks", config={"network_policy": "azure"})]
        findings = run_validation(nodes, [], [], [])
        assert not any(f.rule_id == "azure_aks_no_network_policy" for f in findings)

    def test_sql_tde_disabled_fires(self):
        nodes = [_node("s", "azure_sql", config={"transparent_data_encryption_enabled": False})]
        findings = run_validation(nodes, [], [], [])
        assert any(f.rule_id == "azure_sql_tde_disabled" for f in findings)

    def test_sql_tde_disabled_no_fire_when_true(self):
        nodes = [_node("s", "azure_sql", config={"transparent_data_encryption_enabled": True})]
        findings = run_validation(nodes, [], [], [])
        assert not any(f.rule_id == "azure_sql_tde_disabled" for f in findings)

    def test_sql_min_tls_fires_for_old_version(self):
        nodes = [_node("s", "azure_sql", config={"minimum_tls_version": "1.0"})]
        findings = run_validation(nodes, [], [], [])
        assert any(f.rule_id == "azure_sql_min_tls_old" for f in findings)

    def test_sql_min_tls_no_fire_when_12(self):
        nodes = [_node("s", "azure_sql", config={"minimum_tls_version": "1.2"})]
        findings = run_validation(nodes, [], [], [])
        assert not any(f.rule_id == "azure_sql_min_tls_old" for f in findings)

    def test_sql_min_tls_no_fire_when_unset(self):
        nodes = [_node("s", "azure_sql", config={})]
        findings = run_validation(nodes, [], [], [])
        assert not any(f.rule_id == "azure_sql_min_tls_old" for f in findings)

    def test_sql_no_auditing_fires(self):
        nodes = [_node("s", "azure_sql", config={})]
        findings = run_validation(nodes, [], [], [])
        assert any(f.rule_id == "azure_sql_no_auditing" for f in findings)

    def test_sql_no_auditing_no_fire_when_enabled(self):
        nodes = [_node("s", "azure_sql", config={"auditing_enabled": True})]
        findings = run_validation(nodes, [], [], [])
        assert not any(f.rule_id == "azure_sql_no_auditing" for f in findings)

    def test_storage_public_access_fires(self):
        for t in ["azure_blob", "azure_files", "azure_datalake", "azure_table", "azure_queue"]:
            nodes = [_node("s", t, config={"allow_nested_items_to_be_public": True})]
            findings = run_validation(nodes, [], [], [])
            assert any(f.rule_id == "azure_storage_public_access" for f in findings), f"expected fire for {t}"

    def test_storage_public_access_no_fire_when_false(self):
        nodes = [_node("s", "azure_blob", config={"allow_nested_items_to_be_public": False})]
        findings = run_validation(nodes, [], [], [])
        assert not any(f.rule_id == "azure_storage_public_access" for f in findings)

    def test_storage_https_only_fires(self):
        nodes = [_node("s", "azure_blob", config={"enable_https_traffic_only": False})]
        findings = run_validation(nodes, [], [], [])
        assert any(f.rule_id == "azure_storage_https_only" for f in findings)

    def test_storage_https_only_no_fire_when_true(self):
        nodes = [_node("s", "azure_blob", config={"enable_https_traffic_only": True})]
        findings = run_validation(nodes, [], [], [])
        assert not any(f.rule_id == "azure_storage_https_only" for f in findings)

    def test_storage_min_tls_fires_for_old(self):
        nodes = [_node("s", "azure_blob", config={"min_tls_version": "TLS1_0"})]
        findings = run_validation(nodes, [], [], [])
        assert any(f.rule_id == "azure_storage_min_tls_old" for f in findings)

    def test_storage_min_tls_no_fire_when_tls12(self):
        nodes = [_node("s", "azure_blob", config={"min_tls_version": "TLS1_2"})]
        findings = run_validation(nodes, [], [], [])
        assert not any(f.rule_id == "azure_storage_min_tls_old" for f in findings)

    def test_keyvault_soft_delete_fires_when_zero(self):
        nodes = [_node("k", "azure_keyvault", config={"soft_delete_retention_days": 0})]
        findings = run_validation(nodes, [], [], [])
        assert any(f.rule_id == "azure_keyvault_soft_delete_disabled" for f in findings)

    def test_keyvault_soft_delete_fires_when_false(self):
        nodes = [_node("k", "azure_keyvault", config={"soft_delete_enabled": False})]
        findings = run_validation(nodes, [], [], [])
        assert any(f.rule_id == "azure_keyvault_soft_delete_disabled" for f in findings)

    def test_keyvault_soft_delete_no_fire_when_set(self):
        nodes = [_node("k", "azure_keyvault", config={"soft_delete_retention_days": 90})]
        findings = run_validation(nodes, [], [], [])
        assert not any(f.rule_id == "azure_keyvault_soft_delete_disabled" for f in findings)

    def test_keyvault_purge_protection_fires(self):
        nodes = [_node("k", "azure_keyvault", config={"purge_protection_enabled": False})]
        findings = run_validation(nodes, [], [], [])
        assert any(f.rule_id == "azure_keyvault_purge_protection_disabled" for f in findings)

    def test_keyvault_purge_protection_no_fire_when_true(self):
        nodes = [_node("k", "azure_keyvault", config={"purge_protection_enabled": True})]
        findings = run_validation(nodes, [], [], [])
        assert not any(f.rule_id == "azure_keyvault_purge_protection_disabled" for f in findings)

    def test_functions_https_only_fires(self):
        nodes = [_node("f", "azure_functions", config={"https_only": False})]
        findings = run_validation(nodes, [], [], [])
        assert any(f.rule_id == "azure_functions_https_only" for f in findings)

    def test_functions_https_only_no_fire_when_true(self):
        nodes = [_node("f", "azure_functions", config={"https_only": True})]
        findings = run_validation(nodes, [], [], [])
        assert not any(f.rule_id == "azure_functions_https_only" for f in findings)

    def test_app_service_https_only_fires(self):
        nodes = [_node("a", "azure_app_service", config={"https_only": False})]
        findings = run_validation(nodes, [], [], [])
        assert any(f.rule_id == "azure_app_service_https_only" for f in findings)

    def test_app_service_https_only_no_fire_when_true(self):
        nodes = [_node("a", "azure_app_service", config={"https_only": True})]
        findings = run_validation(nodes, [], [], [])
        assert not any(f.rule_id == "azure_app_service_https_only" for f in findings)

    def test_app_service_min_tls_fires(self):
        nodes = [_node("a", "azure_app_service", config={"minimum_tls_version": "1.0"})]
        findings = run_validation(nodes, [], [], [])
        assert any(f.rule_id == "azure_app_service_min_tls_old" for f in findings)

    def test_app_service_min_tls_no_fire_when_12(self):
        nodes = [_node("a", "azure_app_service", config={"minimum_tls_version": "1.2"})]
        findings = run_validation(nodes, [], [], [])
        assert not any(f.rule_id == "azure_app_service_min_tls_old" for f in findings)

    def test_redis_non_ssl_port_fires(self):
        nodes = [_node("r", "azure_redis", config={"enable_non_ssl_port": True})]
        findings = run_validation(nodes, [], [], [])
        assert any(f.rule_id == "azure_redis_non_ssl_port" for f in findings)

    def test_redis_non_ssl_port_no_fire_when_false(self):
        nodes = [_node("r", "azure_redis", config={"enable_non_ssl_port": False})]
        findings = run_validation(nodes, [], [], [])
        assert not any(f.rule_id == "azure_redis_non_ssl_port" for f in findings)

    def test_redis_min_tls_fires(self):
        nodes = [_node("r", "azure_redis", config={"minimum_tls_version": "1.0"})]
        findings = run_validation(nodes, [], [], [])
        assert any(f.rule_id == "azure_redis_min_tls_old" for f in findings)

    def test_redis_min_tls_no_fire_when_12(self):
        nodes = [_node("r", "azure_redis", config={"minimum_tls_version": "1.2"})]
        findings = run_validation(nodes, [], [], [])
        assert not any(f.rule_id == "azure_redis_min_tls_old" for f in findings)

    def test_postgres_ssl_disabled_fires(self):
        nodes = [_node("p", "azure_postgres", config={"ssl_enforcement_enabled": False})]
        findings = run_validation(nodes, [], [], [])
        assert any(f.rule_id == "azure_postgres_ssl_disabled" for f in findings)

    def test_postgres_ssl_disabled_no_fire_when_true(self):
        nodes = [_node("p", "azure_postgres", config={"ssl_enforcement_enabled": True})]
        findings = run_validation(nodes, [], [], [])
        assert not any(f.rule_id == "azure_postgres_ssl_disabled" for f in findings)

    def test_mysql_ssl_disabled_fires(self):
        nodes = [_node("m", "azure_mysql", config={"ssl_enforcement_enabled": False})]
        findings = run_validation(nodes, [], [], [])
        assert any(f.rule_id == "azure_mysql_ssl_disabled" for f in findings)

    def test_mysql_ssl_disabled_no_fire_when_true(self):
        nodes = [_node("m", "azure_mysql", config={"ssl_enforcement_enabled": True})]
        findings = run_validation(nodes, [], [], [])
        assert not any(f.rule_id == "azure_mysql_ssl_disabled" for f in findings)

    def test_acr_admin_enabled_fires(self):
        nodes = [_node("a", "azure_acr", config={"admin_enabled": True})]
        findings = run_validation(nodes, [], [], [])
        assert any(f.rule_id == "azure_acr_admin_enabled" for f in findings)

    def test_acr_admin_enabled_no_fire_when_false(self):
        nodes = [_node("a", "azure_acr", config={"admin_enabled": False})]
        findings = run_validation(nodes, [], [], [])
        assert not any(f.rule_id == "azure_acr_admin_enabled" for f in findings)

    def test_agw_no_waf_fires_for_standard_v2(self):
        nodes = [_node("a", "azure_agw", config={"sku_name": "Standard_v2"})]
        findings = run_validation(nodes, [], [], [])
        assert any(f.rule_id == "azure_agw_no_waf" for f in findings)

    def test_agw_no_waf_no_fire_for_waf_v2(self):
        nodes = [_node("a", "azure_agw", config={"sku_name": "WAF_v2"})]
        findings = run_validation(nodes, [], [], [])
        assert not any(f.rule_id == "azure_agw_no_waf" for f in findings)

    def test_cosmosdb_public_access_fires_when_unrestricted(self):
        nodes = [_node("c", "azure_cosmosdb", config={})]
        findings = run_validation(nodes, [], [], [])
        assert any(f.rule_id == "azure_cosmosdb_public_access" for f in findings)

    def test_cosmosdb_public_access_no_fire_with_ip_filter(self):
        nodes = [_node("c", "azure_cosmosdb", config={"ip_range_filter": "10.0.0.1"})]
        findings = run_validation(nodes, [], [], [])
        assert not any(f.rule_id == "azure_cosmosdb_public_access" for f in findings)

    def test_vpn_gateway_basic_sku_fires(self):
        nodes = [_node("v", "azure_vpn_gateway", config={"sku": "Basic"})]
        findings = run_validation(nodes, [], [], [])
        assert any(f.rule_id == "azure_vpn_gateway_basic_sku" for f in findings)

    def test_vpn_gateway_basic_sku_no_fire_for_vpngw1(self):
        nodes = [_node("v", "azure_vpn_gateway", config={"sku": "VpnGw1"})]
        findings = run_validation(nodes, [], [], [])
        assert not any(f.rule_id == "azure_vpn_gateway_basic_sku" for f in findings)


# ─── Azure Topology Rule tests ────────────────────────────────────────────────


class TestAzureTopologyRules:

    def test_no_keyvault_fires_when_sql_present(self):
        nodes = [_node("s", "azure_sql")]
        findings = run_validation(nodes, [], [], [])
        assert any(f.rule_id == "azure_no_keyvault" for f in findings)

    def test_no_keyvault_no_fire_when_keyvault_present(self):
        nodes = [_node("s", "azure_sql"), _node("k", "azure_keyvault")]
        findings = run_validation(nodes, [], [], [])
        assert not any(f.rule_id == "azure_no_keyvault" for f in findings)

    def test_no_keyvault_fires_for_each_db_type(self):
        for t in ["azure_cosmosdb", "azure_postgres", "azure_mysql", "azure_redis"]:
            nodes = [_node("d", t)]
            findings = run_validation(nodes, [], [], [])
            assert any(f.rule_id == "azure_no_keyvault" for f in findings), f"expected for {t}"

    def test_no_log_analytics_fires_for_aks(self):
        nodes = [_node("k", "azure_aks")]
        findings = run_validation(nodes, [], [], [])
        assert any(f.rule_id == "azure_no_log_analytics" for f in findings)

    def test_no_log_analytics_no_fire_when_workspace_present(self):
        nodes = [_node("k", "azure_aks"), _node("la", "azure_log_analytics")]
        findings = run_validation(nodes, [], [], [])
        assert not any(f.rule_id == "azure_no_log_analytics" for f in findings)

    def test_no_monitor_fires_for_vm(self):
        nodes = [_node("v", "azure_vm")]
        findings = run_validation(nodes, [], [], [])
        assert any(f.rule_id == "azure_no_monitor" for f in findings)

    def test_no_monitor_no_fire_with_app_insights(self):
        nodes = [_node("v", "azure_vm"), _node("ai", "azure_app_insights")]
        findings = run_validation(nodes, [], [], [])
        assert not any(f.rule_id == "azure_no_monitor" for f in findings)

    def test_no_monitor_no_fire_with_monitor(self):
        nodes = [_node("v", "azure_vm"), _node("m", "azure_monitor")]
        findings = run_validation(nodes, [], [], [])
        assert not any(f.rule_id == "azure_no_monitor" for f in findings)

    def test_no_backup_fires_for_sql(self):
        nodes = [_node("s", "azure_sql")]
        findings = run_validation(nodes, [], [], [])
        assert any(f.rule_id == "azure_no_backup" for f in findings)

    def test_no_backup_no_fire_when_backup_present(self):
        nodes = [_node("s", "azure_sql"), _node("b", "azure_backup")]
        findings = run_validation(nodes, [], [], [])
        assert not any(f.rule_id == "azure_no_backup" for f in findings)

    def test_aks_no_acr_fires(self):
        nodes = [_node("k", "azure_aks")]
        findings = run_validation(nodes, [], [], [])
        assert any(f.rule_id == "azure_aks_no_acr" for f in findings)

    def test_aks_no_acr_no_fire_when_acr_present(self):
        nodes = [_node("k", "azure_aks"), _node("r", "azure_acr")]
        findings = run_validation(nodes, [], [], [])
        assert not any(f.rule_id == "azure_aks_no_acr" for f in findings)

    def test_vm_no_bastion_fires(self):
        nodes = [_node("v", "azure_vm")]
        findings = run_validation(nodes, [], [], [])
        assert any(f.rule_id == "azure_vm_no_bastion" for f in findings)

    def test_vm_no_bastion_no_fire_when_bastion_present(self):
        nodes = [_node("v", "azure_vm"), _node("b", "azure_bastion")]
        findings = run_validation(nodes, [], [], [])
        assert not any(f.rule_id == "azure_vm_no_bastion" for f in findings)

    def test_no_ddos_protection_fires_for_vnet(self):
        nodes = [_node("vn", "azure_vnet")]
        findings = run_validation(nodes, [], [], [])
        assert any(f.rule_id == "azure_no_ddos_protection" for f in findings)

    def test_no_ddos_protection_no_fire_when_ddos_present(self):
        nodes = [_node("vn", "azure_vnet"), _node("d", "azure_ddos")]
        findings = run_validation(nodes, [], [], [])
        assert not any(f.rule_id == "azure_no_ddos_protection" for f in findings)

    def test_sql_no_private_endpoint_fires(self):
        nodes = [_node("s", "azure_sql")]
        findings = run_validation(nodes, [], [], [])
        assert any(f.rule_id == "azure_sql_no_private_endpoint" for f in findings)

    def test_sql_no_private_endpoint_no_fire_when_pe_neighbor(self):
        nodes = [_node("s", "azure_sql"), _node("pe", "azure_private_endpoint")]
        edges = [_edge("s", "pe")]
        findings = run_validation(nodes, edges, [], [])
        assert not any(f.rule_id == "azure_sql_no_private_endpoint" for f in findings)

    def test_storage_no_private_endpoint_fires(self):
        nodes = [_node("b", "azure_blob")]
        findings = run_validation(nodes, [], [], [])
        assert any(f.rule_id == "azure_storage_no_private_endpoint" for f in findings)

    def test_storage_no_private_endpoint_no_fire_when_pe_neighbor(self):
        nodes = [_node("b", "azure_blob"), _node("pe", "azure_private_endpoint")]
        edges = [_edge("b", "pe")]
        findings = run_validation(nodes, edges, [], [])
        assert not any(f.rule_id == "azure_storage_no_private_endpoint" for f in findings)

    def test_apim_no_waf_fires(self):
        nodes = [_node("a", "azure_apim")]
        findings = run_validation(nodes, [], [], [])
        assert any(f.rule_id == "azure_apim_no_waf" for f in findings)

    def test_apim_no_waf_no_fire_when_agw_neighbor(self):
        nodes = [_node("a", "azure_apim"), _node("g", "azure_agw")]
        edges = [_edge("g", "a")]
        findings = run_validation(nodes, edges, [], [])
        assert not any(f.rule_id == "azure_apim_no_waf" for f in findings)

    def test_aks_no_defender_fires(self):
        nodes = [_node("k", "azure_aks")]
        findings = run_validation(nodes, [], [], [])
        assert any(f.rule_id == "azure_aks_no_defender" for f in findings)

    def test_aks_no_defender_no_fire_when_defender_present(self):
        nodes = [_node("k", "azure_aks"), _node("d", "azure_defender")]
        findings = run_validation(nodes, [], [], [])
        assert not any(f.rule_id == "azure_aks_no_defender" for f in findings)

    def test_no_sentinel_fires_when_log_analytics_present(self):
        nodes = [_node("la", "azure_log_analytics")]
        findings = run_validation(nodes, [], [], [])
        assert any(f.rule_id == "azure_no_sentinel" for f in findings)

    def test_no_sentinel_no_fire_when_sentinel_present(self):
        nodes = [_node("la", "azure_log_analytics"), _node("s", "azure_sentinel")]
        findings = run_validation(nodes, [], [], [])
        assert not any(f.rule_id == "azure_no_sentinel" for f in findings)


# ─── Azure NSG Rule tests ─────────────────────────────────────────────────────


class TestAzureNSGRules:

    def test_ssh_open_fires(self):
        sgs = [_sg("nsg1", [{"protocol": "tcp", "port": 22, "source": "0.0.0.0/0"}])]
        findings = run_validation([], [], sgs, [])
        assert any(f.rule_id == "azure_nsg_ssh_open" for f in findings)

    def test_ssh_open_no_fire_when_restricted(self):
        sgs = [_sg("nsg1", [{"protocol": "tcp", "port": 22, "source": "10.0.0.0/8"}])]
        findings = run_validation([], [], sgs, [])
        assert not any(f.rule_id == "azure_nsg_ssh_open" for f in findings)

    def test_rdp_open_fires(self):
        sgs = [_sg("nsg1", [{"protocol": "tcp", "port": 3389, "source": "0.0.0.0/0"}])]
        findings = run_validation([], [], sgs, [])
        assert any(f.rule_id == "azure_nsg_rdp_open" for f in findings)

    def test_rdp_open_no_fire_when_restricted(self):
        sgs = [_sg("nsg1", [{"protocol": "tcp", "port": 3389, "source": "192.168.1.0/24"}])]
        findings = run_validation([], [], sgs, [])
        assert not any(f.rule_id == "azure_nsg_rdp_open" for f in findings)

    def test_all_traffic_open_fires(self):
        sgs = [_sg("nsg1", [{"protocol": "-1", "port": None, "source": "0.0.0.0/0"}])]
        findings = run_validation([], [], sgs, [])
        assert any(f.rule_id == "azure_nsg_all_traffic_open" for f in findings)

    def test_all_traffic_open_no_fire_when_specific(self):
        sgs = [_sg("nsg1", [{"protocol": "tcp", "port": 443, "source": "0.0.0.0/0"}])]
        findings = run_validation([], [], sgs, [])
        assert not any(f.rule_id == "azure_nsg_all_traffic_open" for f in findings)

    def test_sql_server_open_fires(self):
        sgs = [_sg("nsg1", [{"protocol": "tcp", "port": 1433, "source": "0.0.0.0/0"}])]
        findings = run_validation([], [], sgs, [])
        assert any(f.rule_id == "azure_nsg_sql_server_open" for f in findings)

    def test_sql_server_open_no_fire_when_restricted(self):
        sgs = [_sg("nsg1", [{"protocol": "tcp", "port": 1433, "source": "10.0.1.0/24"}])]
        findings = run_validation([], [], sgs, [])
        assert not any(f.rule_id == "azure_nsg_sql_server_open" for f in findings)

    def test_postgres_open_fires(self):
        sgs = [_sg("nsg1", [{"protocol": "tcp", "port": 5432, "source": "0.0.0.0/0"}])]
        findings = run_validation([], [], sgs, [])
        assert any(f.rule_id == "azure_nsg_postgres_open" for f in findings)

    def test_mysql_open_fires(self):
        sgs = [_sg("nsg1", [{"protocol": "tcp", "port": 3306, "source": "0.0.0.0/0"}])]
        findings = run_validation([], [], sgs, [])
        assert any(f.rule_id == "azure_nsg_mysql_open" for f in findings)

    def test_redis_open_fires(self):
        sgs = [_sg("nsg1", [{"protocol": "tcp", "port": 6380, "source": "0.0.0.0/0"}])]
        findings = run_validation([], [], sgs, [])
        assert any(f.rule_id == "azure_nsg_redis_open" for f in findings)

    def test_redis_open_no_fire_when_restricted(self):
        sgs = [_sg("nsg1", [{"protocol": "tcp", "port": 6380, "source": "10.0.0.0/8"}])]
        findings = run_validation([], [], sgs, [])
        assert not any(f.rule_id == "azure_nsg_redis_open" for f in findings)

    def test_mongodb_open_fires(self):
        sgs = [_sg("nsg1", [{"protocol": "tcp", "port": 27017, "source": "0.0.0.0/0"}])]
        findings = run_validation([], [], sgs, [])
        assert any(f.rule_id == "azure_nsg_mongodb_open" for f in findings)

    def test_mongodb_open_no_fire_when_restricted(self):
        sgs = [_sg("nsg1", [{"protocol": "tcp", "port": 27017, "source": "10.0.0.0/8"}])]
        findings = run_validation([], [], sgs, [])
        assert not any(f.rule_id == "azure_nsg_mongodb_open" for f in findings)

    def test_wide_range_open_fires(self):
        sgs = [_sg("nsg1", [{"protocol": "tcp", "port": "0-65535", "source": "0.0.0.0/0"}])]
        findings = run_validation([], [], sgs, [])
        assert any(f.rule_id == "azure_nsg_wide_range_open" for f in findings)

    def test_wide_range_no_fire_for_restricted_source(self):
        sgs = [_sg("nsg1", [{"protocol": "tcp", "port": "0-65535", "source": "10.0.0.0/8"}])]
        findings = run_validation([], [], sgs, [])
        assert not any(f.rule_id == "azure_nsg_wide_range_open" for f in findings)

    def test_wide_range_no_fire_for_narrow_range(self):
        sgs = [_sg("nsg1", [{"protocol": "tcp", "port": "80-443", "source": "0.0.0.0/0"}])]
        findings = run_validation([], [], sgs, [])
        assert not any(f.rule_id == "azure_nsg_wide_range_open" for f in findings)
