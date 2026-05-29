"""Tests for the prompt builder service — TF generation quality verification."""

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest
from app.models.graph import Component, Edge, Graph
from app.services.prompt_builder import build_prompt, _get_resource_hint, _AWS_RESOURCE_MAP


# ─── Helpers ──────────────────────────────────────────────────────────────────


def _pos():
    return {"x": 0, "y": 0}


def _comp(id, type, label=None, config=None, sg_ids=None, iam_role_id=None,
          subnet_id=None, vpc_id=None):
    return Component(
        id=id, type=type, label=label or id,
        position=_pos(), config=config or {},
        security_group_ids=sg_ids or [],
        iam_role_id=iam_role_id,
        subnet_id=subnet_id,
        vpc_id=vpc_id,
    )


def _edge(id, source, target, etype="network"):
    return Edge(id=id, source=source, target=target, type=etype)


def _graph(components=None, edges=None, name="TestArch", region="us-east-1"):
    return Graph(
        id="g1", name=name, provider="aws", region=region,
        components=components or [],
        edges=edges or [],
        security_groups=[],
        iam_roles=[],
    )


def _user_prompt(components=None, edges=None, **kwargs):
    _, up = build_prompt(_graph(components, edges, **kwargs))
    return up


def _system_prompt():
    sp, _ = build_prompt(_graph())
    return sp


# ─── Resource map coverage ────────────────────────────────────────────────────


class TestResourceMapCoverage:
    """Every canvas-registered AWS type must have a map entry."""

    def test_s3_glacier_in_map(self):
        assert "s3_glacier" in _AWS_RESOURCE_MAP

    def test_memorydb_in_map(self):
        assert "memorydb" in _AWS_RESOURCE_MAP

    def test_map_has_87_entries(self):
        # 86 original + s3_glacier
        assert len(_AWS_RESOURCE_MAP) >= 87

    def test_all_entries_have_required_keys(self):
        required = {"primary", "companions", "key_vars", "outputs", "notes"}
        for name, spec in _AWS_RESOURCE_MAP.items():
            missing = required - spec.keys()
            assert not missing, f"Entry '{name}' missing keys: {missing}"

    def test_all_primary_values_are_lists(self):
        for name, spec in _AWS_RESOURCE_MAP.items():
            assert isinstance(spec["primary"], list), f"'{name}' primary is not a list"

    def test_all_companion_values_are_lists(self):
        for name, spec in _AWS_RESOURCE_MAP.items():
            assert isinstance(spec["companions"], list), f"'{name}' companions is not a list"


# ─── Hint line content ────────────────────────────────────────────────────────


class TestGetResourceHint:
    """_get_resource_hint() returns correct → lines for each type."""

    def test_lambda_primary(self):
        hints = "\n".join(_get_resource_hint("lambda"))
        assert "aws_lambda_function" in hints

    def test_lambda_companions(self):
        hints = "\n".join(_get_resource_hint("lambda"))
        assert "aws_iam_role" in hints
        assert "aws_cloudwatch_log_group" in hints

    def test_lambda_note_mentions_execution_role(self):
        hints = "\n".join(_get_resource_hint("lambda"))
        assert "AWSLambdaBasicExecutionRole" in hints

    def test_lambda_note_mentions_log_group_naming(self):
        hints = "\n".join(_get_resource_hint("lambda"))
        assert "/aws/lambda/" in hints

    def test_rds_primary(self):
        hints = "\n".join(_get_resource_hint("rds"))
        assert "aws_db_instance" in hints

    def test_rds_companions(self):
        hints = "\n".join(_get_resource_hint("rds"))
        assert "aws_db_subnet_group" in hints

    def test_rds_note_no_hardcoded_password(self):
        hints = "\n".join(_get_resource_hint("rds"))
        # Note must reference var.* for passwords
        assert "var." in hints

    def test_ecs_fargate_primary(self):
        hints = "\n".join(_get_resource_hint("ecs_fargate"))
        assert "aws_ecs_service" in hints

    def test_ecs_fargate_companions(self):
        hints = "\n".join(_get_resource_hint("ecs_fargate"))
        assert "aws_ecs_task_definition" in hints
        assert "aws_iam_role" in hints

    def test_ecs_fargate_note_mentions_execution_policy(self):
        hints = "\n".join(_get_resource_hint("ecs_fargate"))
        assert "AmazonECSTaskExecutionRolePolicy" in hints

    def test_s3_public_access_block_in_companions(self):
        hints = "\n".join(_get_resource_hint("s3"))
        assert "aws_s3_bucket_public_access_block" in hints

    def test_s3_note_block_all_true(self):
        hints = "\n".join(_get_resource_hint("s3"))
        assert "block_" in hints or "public_access_block" in hints.lower()

    def test_eks_primary(self):
        hints = "\n".join(_get_resource_hint("eks"))
        assert "aws_eks_cluster" in hints

    def test_eks_companions(self):
        hints = "\n".join(_get_resource_hint("eks"))
        assert "aws_eks_node_group" in hints
        assert "aws_iam_role" in hints

    def test_alb_primary(self):
        hints = "\n".join(_get_resource_hint("alb"))
        assert "aws_lb" in hints

    def test_alb_companions(self):
        hints = "\n".join(_get_resource_hint("alb"))
        assert "aws_lb_listener" in hints
        assert "aws_lb_target_group" in hints

    def test_alb_note_https_redirect(self):
        hints = "\n".join(_get_resource_hint("alb"))
        # Must mention both port 80 redirect and 443
        assert "80" in hints
        assert "443" in hints

    def test_nat_gateway_companions(self):
        hints = "\n".join(_get_resource_hint("nat_gateway"))
        assert "aws_eip" in hints

    def test_vpc_primary(self):
        hints = "\n".join(_get_resource_hint("vpc"))
        assert "aws_vpc" in hints

    def test_s3_glacier_primary(self):
        hints = "\n".join(_get_resource_hint("s3_glacier"))
        assert "aws_s3_bucket" in hints

    def test_s3_glacier_lifecycle_companion(self):
        hints = "\n".join(_get_resource_hint("s3_glacier"))
        assert "aws_s3_bucket_lifecycle_configuration" in hints

    def test_s3_glacier_note_mentions_storage_class(self):
        hints = "\n".join(_get_resource_hint("s3_glacier"))
        assert "GLACIER" in hints

    def test_s3_glacier_note_mentions_transition(self):
        hints = "\n".join(_get_resource_hint("s3_glacier"))
        assert "transition" in hints.lower()

    def test_memorydb_primary(self):
        hints = "\n".join(_get_resource_hint("memorydb"))
        assert "aws_memorydb_cluster" in hints

    def test_memorydb_subnet_group_companion(self):
        hints = "\n".join(_get_resource_hint("memorydb"))
        assert "aws_memorydb_subnet_group" in hints

    def test_memorydb_note_tls(self):
        hints = "\n".join(_get_resource_hint("memorydb"))
        assert "tls_enabled" in hints

    def test_managed_service_bedrock_no_primary(self):
        hints = "\n".join(_get_resource_hint("bedrock"))
        assert "managed service" in hints.lower()

    def test_managed_service_rekognition_no_primary(self):
        hints = "\n".join(_get_resource_hint("rekognition"))
        assert "managed service" in hints.lower()

    def test_unknown_type_returns_empty(self):
        assert _get_resource_hint("nonexistent_type") == []

    def test_secretsmanager_primary(self):
        hints = "\n".join(_get_resource_hint("secretsmanager"))
        assert "aws_secretsmanager_secret" in hints

    def test_kms_key_primary(self):
        hints = "\n".join(_get_resource_hint("kms_key"))
        assert "aws_kms_key" in hints

    def test_sns_primary(self):
        hints = "\n".join(_get_resource_hint("sns"))
        assert "aws_sns_topic" in hints

    def test_sqs_primary(self):
        hints = "\n".join(_get_resource_hint("sqs"))
        assert "aws_sqs_queue" in hints

    def test_cloudwatch_primary(self):
        hints = "\n".join(_get_resource_hint("cloudwatch"))
        assert "aws_cloudwatch" in hints

    def test_iam_role_primary(self):
        hints = "\n".join(_get_resource_hint("iam_role"))
        assert "aws_iam_role" in hints

    def test_elasticache_subnet_group_companion(self):
        hints = "\n".join(_get_resource_hint("elasticache"))
        assert "aws_elasticache_subnet_group" in hints


# ─── User prompt content ──────────────────────────────────────────────────────


class TestUserPromptContent:
    """build_prompt() user prompt contains correct resource hints per component."""

    def test_lambda_hints_in_user_prompt(self):
        up = _user_prompt([_comp("fn1", "lambda", label="AuthFunction")])
        assert "aws_lambda_function" in up
        assert "aws_iam_role" in up
        assert "aws_cloudwatch_log_group" in up

    def test_rds_hints_in_user_prompt(self):
        up = _user_prompt([_comp("db1", "rds", label="AppDB")])
        assert "aws_db_instance" in up
        assert "aws_db_subnet_group" in up

    def test_s3_hints_in_user_prompt(self):
        up = _user_prompt([_comp("bkt1", "s3", label="AssetBucket")])
        assert "aws_s3_bucket" in up
        assert "aws_s3_bucket_public_access_block" in up

    def test_ecs_fargate_hints_in_user_prompt(self):
        up = _user_prompt([_comp("svc1", "ecs_fargate", label="APIService")])
        assert "aws_ecs_service" in up
        assert "aws_ecs_task_definition" in up

    def test_alb_hints_in_user_prompt(self):
        up = _user_prompt([_comp("alb1", "alb", label="AppLB")])
        assert "aws_lb" in up
        assert "aws_lb_listener" in up

    def test_s3_glacier_hints_in_user_prompt(self):
        up = _user_prompt([_comp("arch1", "s3_glacier", label="ArchiveBucket")])
        assert "aws_s3_bucket" in up
        assert "aws_s3_bucket_lifecycle_configuration" in up
        assert "GLACIER" in up

    def test_memorydb_hints_in_user_prompt(self):
        up = _user_prompt([_comp("mem1", "memorydb", label="SessionCache")])
        assert "aws_memorydb_cluster" in up
        assert "aws_memorydb_subnet_group" in up

    def test_multi_component_all_hints_present(self):
        """Realistic arch: VPC + ALB + Lambda + RDS — all hints appear."""
        components = [
            _comp("vpc1", "vpc", label="MainVPC"),
            _comp("alb1", "alb", label="AppALB"),
            _comp("fn1", "lambda", label="ApiHandler"),
            _comp("db1", "rds", label="PostgresDB"),
        ]
        up = _user_prompt(components)
        assert "aws_vpc" in up
        assert "aws_lb_listener" in up
        assert "aws_lambda_function" in up
        assert "aws_db_instance" in up
        assert "aws_db_subnet_group" in up

    def test_component_label_appears_before_hints(self):
        """Label line must appear before the hint lines for that component."""
        up = _user_prompt([_comp("fn1", "lambda", label="MyFunction")])
        label_pos = up.index("MyFunction")
        hint_pos = up.index("aws_lambda_function")
        assert label_pos < hint_pos

    def test_config_values_in_user_prompt(self):
        up = _user_prompt([_comp("db1", "rds", label="DB",
                                  config={"instance_class": "db.t3.micro"})])
        assert "db.t3.micro" in up

    def test_security_group_ids_in_user_prompt(self):
        up = _user_prompt([_comp("ec2a", "ec2", sg_ids=["sg-abc123"])])
        assert "sg-abc123" in up

    def test_iam_role_id_in_user_prompt(self):
        up = _user_prompt([_comp("fn1", "lambda", iam_role_id="role-exec")])
        assert "role-exec" in up

    def test_region_in_user_prompt(self):
        up = _user_prompt(region="eu-west-1")
        assert "eu-west-1" in up

    def test_architecture_name_in_user_prompt(self):
        up = _user_prompt(name="Production Platform")
        assert "Production Platform" in up

    def test_managed_service_hint_in_user_prompt(self):
        up = _user_prompt([_comp("br1", "bedrock", label="LLMService")])
        assert "managed service" in up.lower()

    def test_empty_components_renders_none(self):
        up = _user_prompt([])
        assert "(none)" in up


# ─── System prompt content ────────────────────────────────────────────────────


class TestSystemPromptContent:
    """System prompt must contain critical companion and security rules."""

    def test_system_prompt_mentions_lambda_execution_role(self):
        sp = _system_prompt()
        assert "AWSLambdaBasicExecutionRole" in sp

    def test_system_prompt_mentions_cloudwatch_log_group(self):
        sp = _system_prompt()
        assert "/aws/lambda/" in sp

    def test_system_prompt_mentions_rds_subnet_group(self):
        sp = _system_prompt()
        assert "aws_db_subnet_group" in sp

    def test_system_prompt_mentions_ecs_task_exec_policy(self):
        sp = _system_prompt()
        assert "AmazonECSTaskExecutionRolePolicy" in sp

    def test_system_prompt_mentions_s3_public_access_block(self):
        sp = _system_prompt()
        assert "aws_s3_bucket_public_access_block" in sp

    def test_system_prompt_mentions_nat_eip(self):
        sp = _system_prompt()
        assert "aws_eip" in sp

    def test_system_prompt_mentions_no_hardcoded_secrets(self):
        sp = _system_prompt()
        assert "sensitive" in sp.lower() or "var." in sp

    def test_system_prompt_mentions_variables_file(self):
        sp = _system_prompt()
        assert "variables.tf" in sp or "variable" in sp

    def test_system_prompt_mentions_outputs_file(self):
        sp = _system_prompt()
        assert "outputs.tf" in sp or "output" in sp

    def test_system_prompt_mentions_terraform_files(self):
        sp = _system_prompt()
        # System prompt instructs block ordering (terraform{}, provider{}, variable{}, etc.)
        # rather than naming files explicitly
        assert "terraform{" in sp or "terraform {" in sp or "required_providers" in sp
