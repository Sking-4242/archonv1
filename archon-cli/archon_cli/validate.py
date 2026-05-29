"""
validate.py — Architecture validation for Archon CLI.

Parses a Terraform plan JSON file (terraform show -json <plan>) into a
simplified node/edge graph and runs the same rule set defined in the
Archon Pro frontend validationStore.js.

Usage
-----
from archon_cli.validate import validate_plan_json
with open("plan.json") as f:
    plan = json.load(f)
findings = validate_plan_json(plan)
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from typing import Any

from archon_cli.compliance import get_standards_for_rule

# ─── Type mapping (TF resource type → canvas type) ───────────────────────────

_TF_TYPE_MAP: dict[str, str] = {
    # Networking
    "aws_vpc":                              "vpc",
    "aws_subnet":                           "subnet",
    "aws_internet_gateway":                 "internet_gateway",
    "aws_nat_gateway":                      "nat_gateway",
    "aws_route_table":                      "route_table",
    "aws_route_table_association":          "route_table",
    "aws_eip":                              "elastic_ip",
    "aws_cloudfront_distribution":          "cloudfront",
    "aws_route53_zone":                     "route53",
    "aws_route53_record":                   "route53",
    "aws_ec2_transit_gateway":              "transit_gateway",
    "aws_ec2_transit_gateway_vpc_attachment": "transit_gateway",
    "aws_vpn_gateway":                      "vpn_gateway",
    "aws_customer_gateway":                 "vpn_gateway",
    "aws_vpn_connection":                   "vpn_gateway",
    "aws_dx_connection":                    "direct_connect",
    "aws_dx_gateway":                       "direct_connect",
    "aws_vpc_endpoint":                     "vpc_endpoint",
    "aws_globalaccelerator_accelerator":    "global_accelerator",
    "aws_wafv2_web_acl":                    "waf",
    "aws_waf_web_acl":                      "waf",
    "aws_wafregional_web_acl":              "waf",
    "aws_network_acl":                      "subnet",
    # Compute
    "aws_instance":                         "ec2",
    "aws_launch_template":                  "ec2",
    "aws_launch_configuration":             "ec2",
    "aws_lambda_function":                  "lambda",
    "aws_lambda_event_source_mapping":      "lambda",
    "aws_autoscaling_group":                "auto_scaling_group",
    "aws_autoscaling_policy":               "auto_scaling_group",
    "aws_ecs_cluster":                      "ecs_fargate",
    "aws_ecs_service":                      "ecs_fargate",
    "aws_ecs_task_definition":              "ecs_fargate",
    "aws_eks_cluster":                      "eks",
    "aws_eks_node_group":                   "eks",
    "aws_elastic_beanstalk_environment":    "elastic_beanstalk",
    "aws_elastic_beanstalk_application":    "elastic_beanstalk",
    "aws_apprunner_service":                "app_runner",
    "aws_batch_compute_environment":        "batch",
    "aws_batch_job_definition":             "batch",
    "aws_batch_job_queue":                  "batch",
    "aws_ecr_repository":                   "ecr",
    "aws_lightsail_instance":               "lightsail",
    # Load Balancing
    "aws_lb":                               "alb",
    "aws_alb":                              "alb",
    "aws_lb_listener":                      "alb",
    "aws_lb_target_group":                  "alb",
    "aws_alb_listener":                     "alb",
    "aws_api_gateway_rest_api":             "api_gateway",
    "aws_apigatewayv2_api":                 "api_gateway",
    "aws_api_gateway_stage":                "api_gateway",
    # Storage
    "aws_s3_bucket":                        "s3",
    "aws_s3_bucket_policy":                 "s3",
    "aws_s3_bucket_versioning":             "s3",
    "aws_ebs_volume":                       "ebs",
    "aws_volume_attachment":                "ebs",
    "aws_efs_file_system":                  "efs",
    "aws_efs_mount_target":                 "efs",
    "aws_fsx_lustre_file_system":           "fsx",
    "aws_fsx_windows_file_system":          "fsx",
    "aws_fsx_ontap_file_system":            "fsx",
    "aws_backup_vault":                     "backup",
    "aws_backup_plan":                      "backup",
    "aws_storagegateway_gateway":           "storage_gateway",
    # Database
    "aws_db_instance":                      "rds",
    "aws_db_subnet_group":                  "rds",
    "aws_db_parameter_group":               "rds",
    "aws_rds_cluster":                      "aurora",
    "aws_rds_cluster_instance":             "aurora",
    "aws_dynamodb_table":                   "dynamodb",
    "aws_elasticache_cluster":              "elasticache",
    "aws_elasticache_replication_group":    "elasticache",
    "aws_elasticache_subnet_group":         "elasticache",
    "aws_redshift_cluster":                 "redshift",
    "aws_docdb_cluster":                    "documentdb",
    "aws_docdb_cluster_instance":           "documentdb",
    "aws_neptune_cluster":                  "neptune",
    "aws_elasticsearch_domain":             "opensearch",
    "aws_opensearch_domain":                "opensearch",
    # Security
    "aws_security_group":                   "security_group",
    "aws_security_group_rule":              "security_group",
    "aws_iam_role":                         "iam_role",
    "aws_iam_policy":                       "iam_role",
    "aws_iam_role_policy":                  "iam_role",
    "aws_iam_role_policy_attachment":       "iam_role",
    "aws_iam_instance_profile":             "iam_role",
    "aws_iam_user":                         "iam_role",
    "aws_iam_group":                        "iam_role",
    "aws_kms_key":                          "kms",
    "aws_kms_alias":                        "kms",
    "aws_acm_certificate":                  "acm",
    "aws_cognito_user_pool":                "cognito",
    "aws_cognito_identity_pool":            "cognito",
    "aws_secretsmanager_secret":            "secretsmanager",
    "aws_secretsmanager_secret_version":    "secretsmanager",
    "aws_guardduty_detector":               "guardduty",
    "aws_cloudtrail":                       "cloudtrail",
    "aws_config_configuration_recorder":    "config",
    "aws_config_rule":                      "config",
    "aws_shield_protection":                "shield",
    "aws_macie2_account":                   "macie",
    # Integration
    "aws_sns_topic":                        "sns",
    "aws_sns_topic_subscription":           "sns",
    "aws_sqs_queue":                        "sqs",
    "aws_sqs_queue_policy":                 "sqs",
    "aws_cloudwatch_event_rule":            "eventbridge",
    "aws_cloudwatch_event_target":          "eventbridge",
    "aws_scheduler_schedule":               "eventbridge",
    "aws_sfn_state_machine":               "step_functions",
    "aws_kinesis_stream":                   "kinesis",
    "aws_mq_broker":                        "mq",
    "aws_appsync_graphql_api":              "appsync",
    # Analytics
    "aws_glue_job":                         "glue",
    "aws_glue_crawler":                     "glue",
    "aws_glue_catalog_database":            "glue",
    "aws_athena_workgroup":                 "athena",
    "aws_emr_cluster":                      "emr",
    "aws_msk_cluster":                      "msk",
    "aws_kinesis_firehose_delivery_stream": "kinesis_firehose",
    # AI / ML
    "aws_sagemaker_endpoint":               "sagemaker",
    "aws_sagemaker_model":                  "sagemaker",
    "aws_sagemaker_domain":                 "sagemaker",
    "aws_bedrock_model_invocation_logging_configuration": "bedrock",
    "aws_lex_bot":                          "lex",
    "aws_lex_bot_alias":                    "lex",
    # Monitoring
    "aws_cloudwatch_log_group":             "cloudwatch",
    "aws_cloudwatch_metric_alarm":          "cloudwatch",
    "aws_cloudwatch_dashboard":             "cloudwatch",
    "aws_xray_group":                       "xray",
    "aws_ssm_parameter":                    "systems_manager",
    "aws_ssm_document":                     "systems_manager",
    # DevOps
    "aws_codepipeline":                     "codepipeline",
    "aws_codebuild_project":                "codebuild",
    "aws_codedeploy_app":                   "codedeploy",
    "aws_codedeploy_deployment_group":      "codedeploy",
    "aws_codecommit_repository":            "codecommit",
    "aws_cloudformation_stack":             "cloudformation",
    "aws_cloudformation_stack_set":         "cloudformation",
}

# ─── Data model ──────────────────────────────────────────────────────────────


@dataclass
class Node:
    id: str
    type: str               # canvas type (e.g. "ec2", "rds")
    tf_type: str            # original TF resource type
    label: str
    config: dict[str, Any] = field(default_factory=dict)
    parent_id: str | None = None
    security_group_ids: list[str] = field(default_factory=list)
    iam_role_id: str | None = None


@dataclass
class Edge:
    source: str
    target: str


@dataclass
class SGRule:
    protocol: str       # "tcp", "udp", "-1" (all)
    port: str           # "22", "80-443", "-1"
    source: str         # CIDR or SG ID


@dataclass
class SecurityGroup:
    id: str
    name: str
    inbound: list[SGRule] = field(default_factory=list)


@dataclass
class IAMStatement:
    effect: str
    actions: list[str]
    resources: list[str]


@dataclass
class IAMRole:
    id: str
    name: str
    policies: list[IAMStatement] = field(default_factory=list)


@dataclass
class Finding:
    id: str
    rule_id: str
    node_id: str
    node_label: str
    node_type: str
    level: str          # "critical" | "warning" | "info"
    title: str
    message: str
    fix: str
    suggestion: str = ""
    can_acknowledge: bool = False
    sg_id: str | None = None
    standards: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "ruleId": self.rule_id,
            "nodeId": self.node_id,
            "nodeLabel": self.node_label,
            "nodeType": self.node_type,
            "level": self.level,
            "title": self.title,
            "message": self.message,
            "fix": self.fix,
            "suggestion": self.suggestion,
            "canAcknowledge": self.can_acknowledge,
            "sgId": self.sg_id,
            "standards": self.standards,
        }


# ─── Graph helpers ────────────────────────────────────────────────────────────


def _direct_edge(a_id: str, b_id: str, edges: list[Edge]) -> bool:
    return any(
        (e.source == a_id and e.target == b_id) or
        (e.source == b_id and e.target == a_id)
        for e in edges
    )


def _neighbor_ids(node_id: str, edges: list[Edge]) -> list[str]:
    result = []
    for e in edges:
        if e.source == node_id:
            result.append(e.target)
        elif e.target == node_id:
            result.append(e.source)
    return result


def _has_neighbor_of_type(
    node_id: str,
    types: str | list[str],
    edges: list[Edge],
    nodes: list[Node],
) -> bool:
    type_set = {types} if isinstance(types, str) else set(types)
    ids = set(_neighbor_ids(node_id, edges))
    return any(n.type in type_set for n in nodes if n.id in ids)


def _reachable_types(
    node_id: str,
    edges: list[Edge],
    nodes: list[Node],
    max_hops: int = 3,
) -> set[str]:
    node_map = {n.id: n for n in nodes}
    visited: set[str] = {node_id}
    queue = [node_id]
    types: set[str] = set()
    for _ in range(max_hops):
        next_queue = []
        for nid in queue:
            for nbr in _neighbor_ids(nid, edges):
                if nbr not in visited:
                    visited.add(nbr)
                    nd = node_map.get(nbr)
                    if nd:
                        types.add(nd.type)
                    next_queue.append(nbr)
        queue = next_queue
        if not queue:
            break
    return types


# ─── SG port helpers ──────────────────────────────────────────────────────────


def _parse_port(port: str | int | None) -> tuple[int, int] | None:
    if port is None or port == "":
        return None
    s = str(port).strip()
    if s in ("-1", "*"):
        return (0, 65535)
    if "-" in s:
        parts = s.split("-", 1)
        try:
            return (int(parts[0]), int(parts[1]))
        except ValueError:
            pass
    try:
        v = int(s)
        return (v, v)
    except ValueError:
        return None


def _is_public_cidr(source: str | None) -> bool:
    if not source:
        return False
    return source.strip() in ("0.0.0.0/0", "::/0")


def _rule_matches_port(rule: SGRule, target_port: int) -> bool:
    if rule.protocol == "-1":
        return True
    r = _parse_port(rule.port)
    if r is None:
        return False
    return r[0] <= target_port <= r[1]


def _sg_allows_port_from_public(sg: SecurityGroup, port: int) -> bool:
    return any(
        _is_public_cidr(r.source) and _rule_matches_port(r, port)
        for r in sg.inbound
    )


def _sg_allows_all_from_public(sg: SecurityGroup) -> bool:
    return any(
        r.protocol == "-1" and _is_public_cidr(r.source)
        for r in sg.inbound
    )


def _is_wide_range(rule: SGRule) -> bool:
    if rule.protocol == "-1":
        return False
    r = _parse_port(rule.port)
    if r is None:
        return False
    return (r[1] - r[0]) >= 1000 and _is_public_cidr(rule.source)


# ─── Infrastructure node types (exempt from orphan rule) ─────────────────────

_INFRA_TYPES = {"vpc", "subnet", "note", "route_table", "elastic_ip"}
_IGW_TYPES = {"internet_gateway"}

# ─── IAM helpers ─────────────────────────────────────────────────────────────

_SENSITIVE_SERVICES = {
    "iam", "s3", "ec2", "rds", "kms", "secretsmanager",
    "cloudtrail", "guardduty", "organizations", "sts",
}


def _has_admin_policy(policies: list[IAMStatement]) -> bool:
    for stmt in policies:
        if stmt.effect.lower() != "allow":
            continue
        all_actions = any(a.strip() == "*" for a in stmt.actions)
        all_resources = any(r.strip() == "*" for r in stmt.resources)
        if all_actions and all_resources:
            return True
    return False


def _has_wildcard_on_sensitive(policies: list[IAMStatement]) -> bool:
    for stmt in policies:
        if stmt.effect.lower() != "allow":
            continue
        for action in stmt.actions:
            a = action.strip().lower()
            if a == "*":
                return True
            if ":" in a:
                svc, act = a.split(":", 1)
                if act == "*" and svc in _SENSITIVE_SERVICES:
                    return True
    return False


# ─── Rule definitions ─────────────────────────────────────────────────────────
# Each rule dict mirrors the JS structure as close as practical.


def _config_findings(nodes: list[Node]) -> list[Finding]:
    findings: list[Finding] = []

    for n in nodes:
        cfg = n.config
        label = n.label

        # RDS checks
        if n.type == "rds":
            if not cfg.get("storage_encrypted"):
                findings.append(Finding(
                    id=f"rds_unencrypted::{n.id}",
                    rule_id="rds_unencrypted", node_id=n.id,
                    node_label=label, node_type=n.type, level="warning",
                    title="RDS storage not encrypted",
                    message=f"{label} does not have storage encryption enabled.",
                    fix="Enable Storage Encrypted in the component config panel.",
                ))
            br = cfg.get("backup_retention_period")
            if br is None or int(br) < 1:
                findings.append(Finding(
                    id=f"rds_no_backup::{n.id}",
                    rule_id="rds_no_backup", node_id=n.id,
                    node_label=label, node_type=n.type, level="warning",
                    title="RDS backup retention disabled",
                    message=f"{label} has backup retention set to 0. Set at least 7 days.",
                    fix="Set Backup Retention to 7 or more days in the component config.",
                ))
            if cfg.get("publicly_accessible") is True:
                findings.append(Finding(
                    id=f"rds_publicly_accessible::{n.id}",
                    rule_id="rds_publicly_accessible", node_id=n.id,
                    node_label=label, node_type=n.type, level="critical",
                    title="RDS instance publicly accessible",
                    message=f"{label} has Publicly Accessible enabled. RDS should never be internet-facing.",
                    fix="Disable Publicly Accessible in the component config.",
                ))
            if not cfg.get("deletion_protection"):
                findings.append(Finding(
                    id=f"rds_no_deletion_protection::{n.id}",
                    rule_id="rds_no_deletion_protection", node_id=n.id,
                    node_label=label, node_type=n.type, level="info",
                    title="RDS deletion protection off",
                    message=f"{label} has no deletion protection. Enable it to prevent accidental drops.",
                    fix="Enable Deletion Protection in the component config.",
                ))
            if not cfg.get("reserved_instance"):
                findings.append(Finding(
                    id=f"rds_no_reserved::{n.id}",
                    rule_id="rds_no_reserved", node_id=n.id,
                    node_label=label, node_type=n.type, level="info",
                    title="RDS instance not marked for reserved pricing",
                    message=f"{label} is not marked as a reserved instance. Reserved instances save 30-60% for production databases.",
                    fix="Enable Reserved Instance in the component config to document the intent.",
                ))

        # Aurora checks
        if n.type == "aurora":
            if not cfg.get("storage_encrypted"):
                findings.append(Finding(
                    id=f"aurora_unencrypted::{n.id}",
                    rule_id="aurora_unencrypted", node_id=n.id,
                    node_label=label, node_type=n.type, level="warning",
                    title="Aurora storage not encrypted",
                    message=f"{label} does not have storage encryption enabled.",
                    fix="Enable Storage Encrypted in the component config.",
                ))
            br = cfg.get("backup_retention_period")
            if br is None or int(br) < 1:
                findings.append(Finding(
                    id=f"aurora_no_backup::{n.id}",
                    rule_id="aurora_no_backup", node_id=n.id,
                    node_label=label, node_type=n.type, level="warning",
                    title="Aurora backup retention disabled",
                    message=f"{label} has backup retention set to 0. Set at least 7 days.",
                    fix="Set Backup Retention to 7 or more days in the component config.",
                ))

        # EBS
        if n.type == "ebs":
            if not cfg.get("encrypted"):
                findings.append(Finding(
                    id=f"ebs_unencrypted::{n.id}",
                    rule_id="ebs_unencrypted", node_id=n.id,
                    node_label=label, node_type=n.type, level="warning",
                    title="EBS volume not encrypted",
                    message=f"{label} is not encrypted. Enable encryption for data at rest.",
                    fix="Enable Encrypted in the component config.",
                ))

        # Lambda
        if n.type == "lambda":
            tracing = cfg.get("tracing_mode") or cfg.get("tracing_config", {})
            if isinstance(tracing, list):
                tracing = tracing[0] if tracing else {}
            if isinstance(tracing, dict):
                tracing = tracing.get("mode", "")
            if not tracing or tracing == "PassThrough":
                findings.append(Finding(
                    id=f"lambda_no_tracing::{n.id}",
                    rule_id="lambda_no_tracing", node_id=n.id,
                    node_label=label, node_type=n.type, level="info",
                    title="Lambda X-Ray tracing disabled",
                    message=f"{label} has X-Ray tracing set to PassThrough. Enable Active tracing for observability.",
                    fix="Set X-Ray Tracing to Active in the component config.",
                ))

        # DynamoDB
        if n.type == "dynamodb":
            pitr = cfg.get("point_in_time_recovery") or cfg.get("point_in_time_recovery_enabled")
            if isinstance(pitr, list) and pitr:
                pitr = pitr[0].get("enabled") if isinstance(pitr[0], dict) else pitr[0]
            if not pitr:
                findings.append(Finding(
                    id=f"dynamodb_no_pitr::{n.id}",
                    rule_id="dynamodb_no_pitr", node_id=n.id,
                    node_label=label, node_type=n.type, level="info",
                    title="DynamoDB point-in-time recovery off",
                    message=f"{label} does not have Point-in-Time Recovery enabled.",
                    fix="Enable Point-in-Time Recovery in the component config.",
                ))

        # Redshift
        if n.type == "redshift":
            if not cfg.get("encrypted"):
                findings.append(Finding(
                    id=f"redshift_unencrypted::{n.id}",
                    rule_id="redshift_unencrypted", node_id=n.id,
                    node_label=label, node_type=n.type, level="warning",
                    title="Redshift cluster not encrypted",
                    message=f"{label} is not encrypted at rest.",
                    fix="Enable Encrypted in the component config.",
                ))

        # S3
        if n.type == "s3":
            sse = cfg.get("server_side_encryption_configuration") or cfg.get("server_side_encryption")
            if not sse or sse == "none":
                findings.append(Finding(
                    id=f"s3_no_encryption::{n.id}",
                    rule_id="s3_no_encryption", node_id=n.id,
                    node_label=label, node_type=n.type, level="warning",
                    title="S3 bucket has no server-side encryption",
                    message=f"{label} has no server-side encryption configured.",
                    fix="Set Server-Side Encryption to AES256 or aws:kms in the component config.",
                ))
            versioning = cfg.get("versioning") or cfg.get("versioning_configuration")
            if isinstance(versioning, list) and versioning:
                versioning = versioning[0].get("status", "") if isinstance(versioning[0], dict) else versioning[0]
            if not versioning or versioning in ("Disabled", "Suspended", False):
                findings.append(Finding(
                    id=f"s3_versioning_off::{n.id}",
                    rule_id="s3_versioning_off", node_id=n.id,
                    node_label=label, node_type=n.type, level="info",
                    title="S3 bucket versioning disabled",
                    message=f"{label} does not have versioning enabled. Enable it to protect against accidental deletes.",
                    fix="Enable Versioning in the component config.",
                ))
            if not cfg.get("block_public_acls") and not cfg.get("block_public_access"):
                findings.append(Finding(
                    id=f"s3_no_block_public_access::{n.id}",
                    rule_id="s3_no_block_public_access", node_id=n.id,
                    node_label=label, node_type=n.type, level="warning",
                    title="S3 bucket missing Block Public Access",
                    message=f"{label} does not have Block Public Access enabled.",
                    fix="Enable Block Public Access in the component config.",
                ))

        # EC2
        if n.type == "ec2":
            tokens = cfg.get("metadata_http_tokens") or (
                cfg.get("metadata_options", [{}] if isinstance(cfg.get("metadata_options"), list) else [cfg.get("metadata_options", {})])[0] or {}
            ).get("http_tokens", "optional") if not cfg.get("metadata_http_tokens") else cfg.get("metadata_http_tokens")
            if not tokens or tokens == "optional":
                findings.append(Finding(
                    id=f"ec2_imdsv2_optional::{n.id}",
                    rule_id="ec2_imdsv2_optional", node_id=n.id,
                    node_label=label, node_type=n.type, level="warning",
                    title="EC2 IMDSv2 not enforced",
                    message=f"{label} does not enforce IMDSv2. Set metadata tokens to required to prevent SSRF attacks.",
                    fix="Set IMDSv2 (Metadata Tokens) to required in the component config.",
                ))
            itype = (cfg.get("instance_type") or "").lower()
            if re.match(r'^(t1|t2|m1|m2|m3|m4|c1|c3|c4|r3|r4|i2|d2|g2|cr1|hs1)\.', itype):
                findings.append(Finding(
                    id=f"ec2_prev_gen::{n.id}",
                    rule_id="ec2_prev_gen", node_id=n.id,
                    node_label=label, node_type=n.type, level="info",
                    title="Previous-generation EC2 instance type",
                    message=f"{label} uses instance type \"{cfg.get('instance_type')}\". This is a previous-generation type with worse price-performance.",
                    fix="Upgrade to a current-generation equivalent: t2→t3/t4g, m4→m6i/m7g, c4→c6i/c7g, r4→r6i/r7g.",
                ))

        # ALB
        if n.type == "alb":
            if not cfg.get("access_logs_enabled") and not cfg.get("access_logs"):
                findings.append(Finding(
                    id=f"alb_no_access_logging::{n.id}",
                    rule_id="alb_no_access_logging", node_id=n.id,
                    node_label=label, node_type=n.type, level="warning",
                    title="ALB access logging disabled",
                    message=f"{label} does not have access logging enabled.",
                    fix="Enable Access Logs in the component config.",
                ))


        # ElastiCache checks
        if n.type == "elasticache":
            if not cfg.get("at_rest_encryption_enabled"):
                findings.append(Finding(
                    id=f"elasticache_no_encryption_rest::{n.id}",
                    rule_id="elasticache_no_encryption_rest", node_id=n.id,
                    node_label=label, node_type=n.type, level="critical",
                    title="ElastiCache at-rest encryption disabled",
                    message=f"{label} does not have at-rest encryption enabled.",
                    fix="Enable At-Rest Encryption in the component config.",
                ))
            transit = cfg.get("transit_encryption_mode", "preferred")
            if str(transit).lower() == "disabled":
                findings.append(Finding(
                    id=f"elasticache_no_encryption_transit::{n.id}",
                    rule_id="elasticache_no_encryption_transit", node_id=n.id,
                    node_label=label, node_type=n.type, level="critical",
                    title="ElastiCache in-transit encryption disabled",
                    message=f"{label} has In-Transit Encryption set to disabled.",
                    fix="Set In-Transit Encryption to required in the component config.",
                ))
            engine = str(cfg.get("engine", "redis")).lower()
            if engine == "redis" and not cfg.get("auth_token"):
                findings.append(Finding(
                    id=f"elasticache_no_auth::{n.id}",
                    rule_id="elasticache_no_auth", node_id=n.id,
                    node_label=label, node_type=n.type, level="warning",
                    title="ElastiCache Redis AUTH token not set",
                    message=f"{label} (Redis) has no AUTH token configured. Unauthenticated access is possible within the VPC.",
                    fix="Set an AUTH Token in the component config to require password authentication.",
                ))
            try:
                limit = int(cfg.get("snapshot_retention_limit", 0))
            except (TypeError, ValueError):
                limit = 0
            if limit < 1:
                findings.append(Finding(
                    id=f"elasticache_no_backup::{n.id}",
                    rule_id="elasticache_no_backup", node_id=n.id,
                    node_label=label, node_type=n.type, level="warning",
                    title="ElastiCache snapshot retention disabled",
                    message=f"{label} has snapshot retention set to 0. No backups will be created.",
                    fix="Set Snapshot Retention to 1 or more days in the component config.",
                ))

        # SQS checks
        if n.type == "sqs":
            has_sse = cfg.get("sqs_managed_sse_enabled") or cfg.get("kms_master_key_id")
            if not has_sse:
                findings.append(Finding(
                    id=f"sqs_no_encryption::{n.id}",
                    rule_id="sqs_no_encryption", node_id=n.id,
                    node_label=label, node_type=n.type, level="warning",
                    title="SQS queue not encrypted",
                    message=f"{label} has no server-side encryption configured.",
                    fix="Enable SQS-Managed SSE or set a KMS Key ID in the component config.",
                ))
            try:
                redrive = int(cfg.get("redrive_max_receive_count", 0))
            except (TypeError, ValueError):
                redrive = 0
            if redrive < 1:
                findings.append(Finding(
                    id=f"sqs_no_dlq::{n.id}",
                    rule_id="sqs_no_dlq", node_id=n.id,
                    node_label=label, node_type=n.type, level="warning",
                    title="SQS queue has no dead-letter queue",
                    message=f"{label} has no dead-letter queue configured. Failed messages will be lost.",
                    fix="Set Dead Letter Max Receive Count > 0 and configure a DLQ target.",
                ))

        # SNS checks
        if n.type == "sns":
            if not cfg.get("kms_master_key_id"):
                findings.append(Finding(
                    id=f"sns_no_encryption::{n.id}",
                    rule_id="sns_no_encryption", node_id=n.id,
                    node_label=label, node_type=n.type, level="warning",
                    title="SNS topic not encrypted",
                    message=f"{label} has no KMS key configured for at-rest encryption.",
                    fix="Set a KMS Key ID in the component config.",
                ))

        # CloudFront checks
        if n.type == "cloudfront":
            vpp = cfg.get("viewer_protocol_policy", "redirect-to-https")
            if str(vpp).lower() == "allow-all":
                findings.append(Finding(
                    id=f"cloudfront_no_https::{n.id}",
                    rule_id="cloudfront_no_https", node_id=n.id,
                    node_label=label, node_type=n.type, level="critical",
                    title="CloudFront allows unencrypted HTTP traffic",
                    message=f"{label} Viewer Protocol Policy is set to allow-all, permitting plaintext HTTP.",
                    fix="Set Viewer Protocol Policy to redirect-to-https or https-only.",
                ))

        # EKS checks
        if n.type == "eks":
            if cfg.get("endpoint_public_access", True):
                cidrs = cfg.get("public_access_cidrs", "0.0.0.0/0")
                if "0.0.0.0/0" in str(cidrs):
                    findings.append(Finding(
                        id=f"eks_public_endpoint::{n.id}",
                        rule_id="eks_public_endpoint", node_id=n.id,
                        node_label=label, node_type=n.type, level="critical",
                        title="EKS API endpoint publicly accessible",
                        message=f"{label} has a public API endpoint accessible from 0.0.0.0/0.",
                        fix="Restrict Public Access CIDRs to known IP ranges, or disable public endpoint access.",
                    ))
            log_types = cfg.get("enabled_cluster_log_types", "") or cfg.get("cluster_log_types", "")
            if not log_types:
                findings.append(Finding(
                    id=f"eks_no_logging::{n.id}",
                    rule_id="eks_no_logging", node_id=n.id,
                    node_label=label, node_type=n.type, level="warning",
                    title="EKS control plane logging disabled",
                    message=f"{label} has no control plane log types enabled. API, audit, and authenticator logs are recommended.",
                    fix="Set Enabled Log Types to api,audit,authenticator in the component config.",
                ))

        # KMS checks
        if n.type == "kms_key":
            if not cfg.get("enable_key_rotation", True):
                findings.append(Finding(
                    id=f"kms_no_rotation::{n.id}",
                    rule_id="kms_no_rotation", node_id=n.id,
                    node_label=label, node_type=n.type, level="warning",
                    title="KMS key rotation disabled",
                    message=f"{label} does not have automatic key rotation enabled.",
                    fix="Enable Key Rotation in the component config.",
                ))

        # CloudTrail encryption check
        if n.type == "cloudtrail":
            if not cfg.get("kms_key_id") and not cfg.get("kms_key_arn"):
                findings.append(Finding(
                    id=f"cloudtrail_no_encryption::{n.id}",
                    rule_id="cloudtrail_no_encryption", node_id=n.id,
                    node_label=label, node_type=n.type, level="warning",
                    title="CloudTrail logs not encrypted with KMS",
                    message=f"{label} does not have a KMS key configured for log encryption.",
                    fix="Set kms_key_id to the ARN of a KMS key in the Terraform resource.",
                ))

        # Lambda checks
        if n.type == "lambda":
            auth_type = cfg.get("authorization_type") or cfg.get("function_url_auth_type")
            if auth_type and str(auth_type).upper() == "NONE":
                findings.append(Finding(
                    id=f"lambda_public_access::{n.id}",
                    rule_id="lambda_public_access", node_id=n.id,
                    node_label=label, node_type=n.type, level="critical",
                    title="Lambda function URL publicly accessible without auth",
                    message=f"{label} has a function URL with authorization_type NONE — anyone can invoke it.",
                    fix="Set authorization_type to AWS_IAM on the aws_lambda_function_url resource.",
                ))
            has_vpc = cfg.get("vpc_id") or cfg.get("subnet_ids") or cfg.get("vpc_subnet_ids") or cfg.get("vpc_config")
            if not has_vpc:
                findings.append(Finding(
                    id=f"lambda_no_vpc::{n.id}",
                    rule_id="lambda_no_vpc", node_id=n.id,
                    node_label=label, node_type=n.type, level="warning",
                    title="Lambda function not in a VPC",
                    message=f"{label} is not configured in a VPC. Functions handling sensitive data should run in a private VPC.",
                    fix="Add a vpc_config block referencing your VPC subnets and security groups.",
                ))

        # EFS checks
        if n.type == "efs":
            if not cfg.get("encrypted", True):
                findings.append(Finding(
                    id=f"efs_no_encryption::{n.id}",
                    rule_id="efs_no_encryption", node_id=n.id,
                    node_label=label, node_type=n.type, level="critical",
                    title="EFS file system not encrypted",
                    message=f"{label} does not have encryption at rest enabled.",
                    fix="Enable Encrypted in the component config.",
                ))

        # Redshift TLS check
        if n.type == "redshift":
            require_ssl = cfg.get("require_ssl") or cfg.get("require_ssl_parameter")
            if not require_ssl:
                findings.append(Finding(
                    id=f"redshift_no_tls::{n.id}",
                    rule_id="redshift_no_tls", node_id=n.id,
                    node_label=label, node_type=n.type, level="critical",
                    title="Redshift cluster does not require TLS",
                    message=f"{label} does not enforce TLS for client connections.",
                    fix="Set require_ssl = true in the Redshift parameter group.",
                ))

        # RDS logging check
        if n.type == "rds":
            logs = cfg.get("enabled_cloudwatch_logs_exports", [])
            if isinstance(logs, str):
                logs = [x.strip() for x in logs.split(",") if x.strip()]
            if not logs:
                findings.append(Finding(
                    id=f"rds_no_logging::{n.id}",
                    rule_id="rds_no_logging", node_id=n.id,
                    node_label=label, node_type=n.type, level="warning",
                    title="RDS CloudWatch log exports not configured",
                    message=f"{label} has no CloudWatch log exports enabled. Error and audit logs are not being captured.",
                    fix="Set enabled_cloudwatch_logs_exports to include error, general, and slowquery.",
                ))

        # Secrets Manager check
        if n.type == "secretsmanager":
            if not cfg.get("rotation_enabled"):
                findings.append(Finding(
                    id=f"secrets_no_rotation::{n.id}",
                    rule_id="secrets_no_rotation", node_id=n.id,
                    node_label=label, node_type=n.type, level="warning",
                    title="Secrets Manager secret rotation disabled",
                    message=f"{label} does not have automatic rotation enabled.",
                    fix="Enable Rotation and configure a rotation Lambda in the component config.",
                ))

        # S3 SSL policy check
        if n.type == "s3":
            if not cfg.get("block_public_policy"):
                findings.append(Finding(
                    id=f"s3_no_ssl_policy::{n.id}",
                    rule_id="s3_no_ssl_policy", node_id=n.id,
                    node_label=label, node_type=n.type, level="warning",
                    title="S3 bucket policy may allow non-SSL access",
                    message=f"{label} has Block Public Policy disabled. An aws:SecureTransport deny policy is recommended to enforce HTTPS.",
                    fix="Enable Block Public Policy and add a bucket policy denying requests where aws:SecureTransport is false.",
                ))

        # Subnet public IP check
        if n.type == "subnet":
            if cfg.get("map_public_ip_on_launch"):
                findings.append(Finding(
                    id=f"subnet_auto_public_ip::{n.id}",
                    rule_id="subnet_auto_public_ip", node_id=n.id,
                    node_label=label, node_type=n.type, level="warning",
                    title="Subnet auto-assigns public IP on launch",
                    message=f"{label} has map_public_ip_on_launch enabled. Instances launched in this subnet receive public IPs automatically.",
                    fix="Disable Auto-assign Public IP unless this subnet is intentionally a public DMZ.",
                ))


        # FinOps — EBS gp2 upgrade
        if n.type == "ebs":
            vtype = cfg.get("volume_type", "gp2")
            if vtype == "gp2":
                findings.append(Finding(
                    id=f"ebs_gp2_upgrade::{n.id}",
                    rule_id="ebs_gp2_upgrade", node_id=n.id,
                    node_label=label, node_type=n.type, level="info",
                    title="EBS volume is gp2 — upgrade to gp3",
                    message=f"{label} uses gp2 storage. gp3 provides the same baseline performance at 20% lower cost.",
                    fix="Change Volume Type to gp3 in the component config.",
                    suggestion='Set `volume_type = "gp3"` on `aws_ebs_volume`. gp3 delivers 3000 IOPS and 125 MiBps baseline at 20% less than gp2 with no performance trade-off.',
                ))

        # FinOps — RDS/Aurora gp2 storage upgrade
        if n.type in ("rds", "aurora"):
            stype = cfg.get("storage_type", "gp2")
            if stype == "gp2":
                findings.append(Finding(
                    id=f"rds_gp2_storage::{n.id}",
                    rule_id="rds_gp2_storage", node_id=n.id,
                    node_label=label, node_type=n.type, level="info",
                    title="RDS uses gp2 storage — upgrade to gp3",
                    message=f"{label} uses gp2 storage. gp3 provides the same baseline IOPS at 20% lower cost.",
                    fix="Change Storage Type to gp3 in the component config.",
                    suggestion='Set `storage_type = "gp3"` on `aws_db_instance`. gp3 delivers 3000 IOPS baseline; add `iops` if you need more than 3000 (up to 16,000 on gp3).',
                ))
            elif stype == "io1":
                findings.append(Finding(
                    id=f"rds_io1_consider_gp3::{n.id}",
                    rule_id="rds_io1_consider_gp3", node_id=n.id,
                    node_label=label, node_type=n.type, level="info",
                    title="RDS io1 storage — evaluate gp3 at this IOPS range",
                    message=f"{label} uses io1 storage. gp3 supports up to 16,000 IOPS at significantly lower cost per IOPS.",
                    fix="Evaluate switching to gp3 if peak IOPS is under 16,000. Set iops explicitly on gp3.",
                    suggestion='Check CloudWatch `ReadIOPS`/`WriteIOPS`. If peak is under 16,000, change `storage_type = "gp3"` and set `iops` explicitly — gp3 at 16,000 IOPS costs far less than io1.',
                ))

        # FinOps — RDS storage autoscaling
        if n.type == "rds":
            max_storage = cfg.get("max_allocated_storage")
            if not max_storage or int(max_storage) == 0:
                findings.append(Finding(
                    id=f"rds_no_storage_autoscaling::{n.id}",
                    rule_id="rds_no_storage_autoscaling", node_id=n.id,
                    node_label=label, node_type=n.type, level="info",
                    title="RDS storage autoscaling not configured",
                    message=f"{label} has no max_allocated_storage set. Storage must be manually resized.",
                    fix="Set Max Allocated Storage to 2–3x the initial allocation in the component config.",
                    suggestion='Set `max_allocated_storage` to 2–3x `allocated_storage` on `aws_db_instance`. RDS autoscales within this limit with zero downtime.',
                ))

        # FinOps — RDS performance insights
        if n.type == "rds":
            if not cfg.get("performance_insights_enabled"):
                findings.append(Finding(
                    id=f"rds_no_perf_insights::{n.id}",
                    rule_id="rds_no_perf_insights", node_id=n.id,
                    node_label=label, node_type=n.type, level="info",
                    title="RDS Performance Insights disabled",
                    message=f"{label} has Performance Insights disabled. Without it you cannot identify slow queries or right-size the instance.",
                    fix="Enable Performance Insights in the component config.",
                    suggestion='Set `performance_insights_enabled = true` on `aws_db_instance`. The free tier retains 7 days of data. Required for any right-sizing exercise.',
                ))

        # FinOps — S3 versioning without lifecycle
        if n.type == "s3":
            if cfg.get("versioning") and not cfg.get("lifecycle_rule"):
                findings.append(Finding(
                    id=f"s3_versioning_no_lifecycle::{n.id}",
                    rule_id="s3_versioning_no_lifecycle", node_id=n.id,
                    node_label=label, node_type=n.type, level="info",
                    title="S3 versioning enabled with no lifecycle policy",
                    message=f"{label} has versioning enabled but no lifecycle policy. Non-current versions accumulate indefinitely.",
                    fix="Add a lifecycle rule to expire non-current versions after 30–90 days.",
                    suggestion='Add `aws_s3_bucket_lifecycle_configuration` with `noncurrent_version_expiration { noncurrent_days = 30 }`. Consider transitioning to Glacier Instant Retrieval after 7 days.',
                ))

        # FinOps — Lambda arm64
        if n.type == "lambda":
            arch = cfg.get("architecture", "x86_64")
            if not arch or arch == "x86_64":
                findings.append(Finding(
                    id=f"lambda_not_arm64::{n.id}",
                    rule_id="lambda_not_arm64", node_id=n.id,
                    node_label=label, node_type=n.type, level="info",
                    title="Lambda using x86_64 — Graviton2 (arm64) is cheaper",
                    message=f"{label} uses x86_64. arm64 (Graviton2) is 20% cheaper and typically 20% faster.",
                    fix="Set Architecture to arm64 in the component config.",
                    suggestion='Set `architectures = ["arm64"]` on `aws_lambda_function`. Test with your runtime — Python, Node.js, Java, and Go support arm64 natively.',
                ))

        # FinOps — Lambda high timeout
        if n.type == "lambda":
            timeout = cfg.get("timeout", 0)
            if int(timeout) >= 900:
                findings.append(Finding(
                    id=f"lambda_high_timeout::{n.id}",
                    rule_id="lambda_high_timeout", node_id=n.id,
                    node_label=label, node_type=n.type, level="info",
                    title="Lambda timeout set to maximum (900s)",
                    message=f"{label} has a 900-second timeout. Errors will silently retry for 15 minutes, accumulating compute charges.",
                    fix="Set timeout to the actual expected max execution time plus a small buffer.",
                    suggestion='Set `timeout` to the p99 execution time + 20%. Use X-Ray or CloudWatch Logs Insights to measure actual duration before setting a tight timeout.',
                ))

        # FinOps — Lambda default memory
        if n.type == "lambda":
            mem = cfg.get("memory_size", 128)
            if not mem or int(mem) == 128:
                findings.append(Finding(
                    id=f"lambda_default_memory::{n.id}",
                    rule_id="lambda_default_memory", node_id=n.id,
                    node_label=label, node_type=n.type, level="info",
                    title="Lambda at default 128 MB memory",
                    message=f"{label} uses the default 128 MB memory allocation. Increasing memory often reduces duration enough to lower total cost.",
                    fix="Use AWS Lambda Power Tuning to find the optimal memory/cost balance.",
                    suggestion='Run AWS Lambda Power Tuning (github.com/alexcasalboni/aws-lambda-power-tuning). Most functions are cheapest at 512 MB–1 GB, not 128 MB.',
                ))

        # FinOps — ECS Fargate Spot
        if n.type == "ecs_fargate":
            launch = cfg.get("launch_type", "FARGATE")
            if launch != "FARGATE_SPOT":
                findings.append(Finding(
                    id=f"ecs_no_fargate_spot::{n.id}",
                    rule_id="ecs_no_fargate_spot", node_id=n.id,
                    node_label=label, node_type=n.type, level="info",
                    title="ECS Fargate not using Spot capacity",
                    message=f"{label} uses on-demand Fargate. Fargate Spot can reduce compute cost by 70% for fault-tolerant workloads.",
                    fix="Use a capacity provider strategy with FARGATE_SPOT for non-critical tasks.",
                    suggestion='Add `capacity_provider_strategy` with FARGATE_SPOT (weight=4) and FARGATE (weight=1) fallback on `aws_ecs_service`. Ensure tasks handle SIGTERM for graceful Spot interruption.',
                ))

        # FinOps — DynamoDB high provisioned capacity
        if n.type == "dynamodb":
            billing = cfg.get("billing_mode", "PAY_PER_REQUEST")
            if billing == "PROVISIONED":
                rcu = int(cfg.get("read_capacity", 0))
                wcu = int(cfg.get("write_capacity", 0))
                if rcu > 100 or wcu > 100:
                    findings.append(Finding(
                        id=f"dynamodb_high_provisioned::{n.id}",
                        rule_id="dynamodb_high_provisioned", node_id=n.id,
                        node_label=label, node_type=n.type, level="warning",
                        title="DynamoDB PROVISIONED with high static capacity",
                        message=f"{label} has PROVISIONED billing with {rcu} RCU / {wcu} WCU. Static provisioning at this level is likely over-allocated.",
                        fix="Switch to PAY_PER_REQUEST billing or enable DynamoDB Auto Scaling.",
                        suggestion='Either set `billing_mode = "PAY_PER_REQUEST"` or add `aws_appautoscaling_target` + `aws_appautoscaling_policy` for both read and write capacity.',
                    ))

        # FinOps — Aurora non-Graviton instance
        if n.type == "aurora":
            cls = cfg.get("instance_class", "").lower()
            import re as _re
            if cls and "g." not in cls and not _re.search(r"\.(t4g|m6g|m7g|r6g|r7g|r8g|x2g)", cls):
                findings.append(Finding(
                    id=f"aurora_not_graviton::{n.id}",
                    rule_id="aurora_not_graviton", node_id=n.id,
                    node_label=label, node_type=n.type, level="info",
                    title="Aurora instance not using Graviton2/3",
                    message=f"{label} uses instance class '{cls}'. Graviton2/3 instances (r6g, r7g, m6g) are 10–20% cheaper.",
                    fix="Switch to a Graviton2 instance class (e.g. db.r6g.large instead of db.r5.large).",
                    suggestion='Change `instance_class` to the Graviton2 equivalent: r5→r6g, r6i→r7g, m5→m6g, t3→t4g. Aurora MySQL 3.x and Aurora PostgreSQL 13+ support Graviton natively.',
                ))

        # FinOps — ElastiCache previous-gen node
        if n.type == "elasticache":
            import re as _re
            node_type = cfg.get("node_type", "")
            if _re.match(r"^cache\.(t2|m3|m2|r3|r4|c1)\.", node_type, _re.IGNORECASE):
                findings.append(Finding(
                    id=f"elasticache_prev_gen_node::{n.id}",
                    rule_id="elasticache_prev_gen_node", node_id=n.id,
                    node_label=label, node_type=n.type, level="info",
                    title="ElastiCache previous-generation node type",
                    message=f"{label} uses node type '{node_type}'. Current-generation equivalents offer better price-performance.",
                    fix="Upgrade to a current-generation node type: t2→t4g, r3/r4→r6g, m3→m6g.",
                    suggestion='Update `node_type`: cache.t2→cache.t4g (40% cheaper), cache.r3/r4→cache.r6g, cache.m3→cache.m6g. Requires a maintenance window cluster replacement.',
                ))

        # FinOps — CloudWatch no log retention
        if n.type == "cloudwatch":
            retention = cfg.get("retention_in_days", 0)
            if not retention or int(retention) == 0:
                findings.append(Finding(
                    id=f"cloudwatch_no_log_retention::{n.id}",
                    rule_id="cloudwatch_no_log_retention", node_id=n.id,
                    node_label=label, node_type=n.type, level="warning",
                    title="CloudWatch log group has no retention policy",
                    message=f"{label} has no log retention configured. Logs are kept indefinitely and cost accumulates without bound.",
                    fix="Set a retention period (30–365 days) in the component config.",
                    suggestion='Set `retention_in_days` on `aws_cloudwatch_log_group`. Common: 30 days app logs, 90 days audit, 365 days compliance. 1 GB/day at 365-day retention = $11/month vs $0.90/month at 30 days.',
                ))


        # Lambda: deprecated runtime
        if n.type == "lambda":
            deprecated_runtimes = {
                "nodejs", "nodejs4.3", "nodejs6.10", "nodejs8.10", "nodejs10.x",
                "nodejs12.x", "nodejs14.x", "nodejs16.x",
                "python2.7", "python3.6", "python3.7", "python3.8",
                "dotnetcore1.0", "dotnetcore2.0", "dotnetcore2.1", "dotnetcore3.1",
                "java8", "ruby2.5", "ruby2.7", "provided",
            }
            runtime = cfg.get("runtime", "")
            if runtime and runtime in deprecated_runtimes:
                findings.append(Finding(
                    id=f"lambda_deprecated_runtime::{n.id}",
                    rule_id="lambda_deprecated_runtime", node_id=n.id,
                    node_label=label, node_type=n.type, level="critical",
                    title="Lambda function uses a deprecated runtime",
                    message=f'{label} uses runtime "{runtime}", which is deprecated or end-of-life.',
                    fix="Update the runtime to a supported version (e.g. python3.12, nodejs22.x, java21).",
                    suggestion='Update `runtime` to a currently supported value: `python3.12`, `nodejs22.x`, `java21`, `dotnet8`, or `provided.al2023`.',
                    standards=["CIS", "SOC2", "PCI", "NIST"],
                ))
            if (cfg.get("reserved_concurrent_executions") is None or
                    cfg.get("reserved_concurrent_executions") == ""):
                findings.append(Finding(
                    id=f"lambda_no_reserved_concurrency::{n.id}",
                    rule_id="lambda_no_reserved_concurrency", node_id=n.id,
                    node_label=label, node_type=n.type, level="info",
                    title="Lambda function has no reserved concurrency limit",
                    message=f"{label} has no reserved concurrency. A traffic spike can exhaust the account concurrency pool.",
                    fix="Set Reserved Concurrency in the component config to cap parallel executions.",
                    suggestion='Set `reserved_concurrent_executions` on `aws_lambda_function` to cap runaway invocations.',
                    can_acknowledge=True,
                    standards=["NIST"],
                ))

        # EC2: no IAM instance profile
        if n.type == "ec2":
            if not cfg.get("iam_instance_profile") and not n.iam_role_id:
                findings.append(Finding(
                    id=f"ec2_no_iam_profile::{n.id}",
                    rule_id="ec2_no_iam_profile", node_id=n.id,
                    node_label=label, node_type=n.type, level="warning",
                    title="EC2 instance has no IAM instance profile",
                    message=f"{label} has no IAM instance profile. Applications must use hard-coded credentials for AWS API access.",
                    fix="Attach an IAM Role to this EC2 instance.",
                    suggestion='Create `aws_iam_instance_profile` referencing an `aws_iam_role` and set `iam_instance_profile` on `aws_instance`.',
                    standards=["CIS", "SOC2", "NIST"],
                ))

        # ECS: privileged container, no readonly root filesystem
        if n.type == "ecs_fargate":
            if cfg.get("privileged"):
                findings.append(Finding(
                    id=f"ecs_privileged_container::{n.id}",
                    rule_id="ecs_privileged_container", node_id=n.id,
                    node_label=label, node_type=n.type, level="critical",
                    title="ECS task definition allows privileged container execution",
                    message=f"{label} has privileged mode enabled. A container escape grants full host root access.",
                    fix="Disable privileged mode in the ECS task definition.",
                    suggestion='Remove `privileged = true`. Use `linuxParameters.capabilities.add` for specific capabilities only. Privileged mode is incompatible with Fargate.',
                    standards=["CIS", "SOC2", "PCI", "NIST"],
                ))
            if not cfg.get("readonly_root_filesystem"):
                findings.append(Finding(
                    id=f"ecs_no_readonly_root_fs::{n.id}",
                    rule_id="ecs_no_readonly_root_fs", node_id=n.id,
                    node_label=label, node_type=n.type, level="warning",
                    title="ECS container does not use a read-only root filesystem",
                    message=f"{label} has a writable root filesystem. Malicious code can modify system binaries.",
                    fix="Enable readonlyRootFilesystem in the container definition.",
                    suggestion='Set `readonly_root_filesystem = true` in the container definition. Mount writable paths via `mountPoints`.',
                    can_acknowledge=True,
                    standards=["CIS", "SOC2", "NIST"],
                ))

        # EKS: secrets not encrypted, old version
        if n.type == "eks":
            if not cfg.get("encryption_config") and not cfg.get("secrets_encryption_key"):
                findings.append(Finding(
                    id=f"eks_secrets_not_encrypted::{n.id}",
                    rule_id="eks_secrets_not_encrypted", node_id=n.id,
                    node_label=label, node_type=n.type, level="critical",
                    title="EKS cluster does not encrypt Kubernetes Secrets with KMS",
                    message=f"{label} has no KMS encryption_config for secrets. etcd secrets are stored without envelope encryption.",
                    fix="Configure an encryption_config block with a KMS key ARN for secrets.",
                    suggestion='Add `encryption_config { resources = ["secrets"] provider { key_arn = aws_kms_key.eks.arn } }` to `aws_eks_cluster`.',
                    standards=["CIS", "SOC2", "PCI", "HIPAA", "NIST"],
                ))
            import re as _re2
            ver_str = str(cfg.get("kubernetes_version", cfg.get("version", "0")))
            m = _re2.match(r"(\d+\.\d+)", ver_str)
            if m:
                ver = float(m.group(1))
                if 0 < ver < 1.29:
                    findings.append(Finding(
                        id=f"eks_old_version::{n.id}",
                        rule_id="eks_old_version", node_id=n.id,
                        node_label=label, node_type=n.type, level="warning",
                        title="EKS cluster is running an outdated Kubernetes version",
                        message=f"{label} specifies Kubernetes {ver_str}, which is approaching or past end-of-support.",
                        fix="Upgrade the EKS cluster to Kubernetes 1.29 or later.",
                        suggestion='Set `version = "1.30"` on `aws_eks_cluster`.',
                        can_acknowledge=True,
                        standards=["CIS", "SOC2", "NIST"],
                    ))

        # OpenSearch: public endpoint, no encryption at rest, no node-to-node
        if n.type == "opensearch":
            if not cfg.get("vpc_options") and not cfg.get("vpc_id"):
                findings.append(Finding(
                    id=f"opensearch_public_endpoint::{n.id}",
                    rule_id="opensearch_public_endpoint", node_id=n.id,
                    node_label=label, node_type=n.type, level="critical",
                    title="OpenSearch domain has a public endpoint",
                    message=f"{label} is not deployed in a VPC. The endpoint is reachable from the internet.",
                    fix="Configure vpc_options with subnet_ids and security_group_ids.",
                    suggestion='Add a `vpc_options` block to `aws_opensearch_domain`. VPC deployment eliminates the public endpoint entirely.',
                    standards=["CIS", "SOC2", "PCI", "HIPAA", "NIST"],
                ))
            if not cfg.get("encrypt_at_rest"):
                findings.append(Finding(
                    id=f"opensearch_no_encryption_at_rest::{n.id}",
                    rule_id="opensearch_no_encryption_at_rest", node_id=n.id,
                    node_label=label, node_type=n.type, level="critical",
                    title="OpenSearch domain is not encrypted at rest",
                    message=f"{label} does not have encryption at rest enabled.",
                    fix="Enable Encrypt at Rest in the OpenSearch domain config.",
                    suggestion='Set `encrypt_at_rest { enabled = true }` on `aws_opensearch_domain`.',
                    standards=["CIS", "SOC2", "PCI", "HIPAA", "NIST"],
                ))
            if not cfg.get("node_to_node_encryption"):
                findings.append(Finding(
                    id=f"opensearch_no_node_to_node::{n.id}",
                    rule_id="opensearch_no_node_to_node", node_id=n.id,
                    node_label=label, node_type=n.type, level="critical",
                    title="OpenSearch domain does not encrypt node-to-node traffic",
                    message=f"{label} has node-to-node encryption disabled.",
                    fix="Enable Node-to-Node Encryption in the OpenSearch domain config.",
                    suggestion='Set `node_to_node_encryption { enabled = true }` on `aws_opensearch_domain`.',
                    standards=["SOC2", "PCI", "HIPAA", "NIST"],
                ))

        # Cognito: no MFA, weak password, no advanced security
        if n.type == "cognito":
            mfa = cfg.get("mfa_configuration", "")
            if not mfa or mfa.upper() == "OFF":
                findings.append(Finding(
                    id=f"cognito_no_mfa::{n.id}",
                    rule_id="cognito_no_mfa", node_id=n.id,
                    node_label=label, node_type=n.type, level="critical",
                    title="Cognito user pool does not require MFA",
                    message=f"{label} has MFA set to OFF. Accounts are protected by password only.",
                    fix="Set MFA Configuration to OPTIONAL or ON.",
                    suggestion='Set `mfa_configuration = "ON"` and `software_token_mfa_configuration { enabled = true }`.',
                    standards=["CIS", "SOC2", "PCI", "HIPAA", "NIST"],
                ))
            pw = cfg.get("password_policy") or {}
            min_len = int(pw.get("minimum_length", pw.get("min_length", 0)) or 0)
            if not pw or min_len < 12 or not pw.get("require_uppercase") or not pw.get("require_numbers"):
                findings.append(Finding(
                    id=f"cognito_weak_password_policy::{n.id}",
                    rule_id="cognito_weak_password_policy", node_id=n.id,
                    node_label=label, node_type=n.type, level="warning",
                    title="Cognito user pool has no or weak password policy",
                    message=f"{label} has an insufficient password policy (minimum < 12 chars or missing complexity requirements).",
                    fix="Configure password_policy with minimum 12 chars, uppercase, lowercase, numbers, and symbols.",
                    suggestion='Set `minimum_length = 12`, `require_uppercase = true`, `require_lowercase = true`, `require_numbers = true`, `require_symbols = true`.',
                    can_acknowledge=True,
                    standards=["CIS", "SOC2", "NIST"],
                ))
            add_ons = cfg.get("user_pool_add_ons") or {}
            mode = add_ons.get("advanced_security_mode", cfg.get("advanced_security_mode", ""))
            if mode not in ("ENFORCED", "AUDIT"):
                findings.append(Finding(
                    id=f"cognito_advanced_security_off::{n.id}",
                    rule_id="cognito_advanced_security_off", node_id=n.id,
                    node_label=label, node_type=n.type, level="warning",
                    title="Cognito advanced security (adaptive authentication) is disabled",
                    message=f"{label} does not have advanced security mode enabled.",
                    fix="Enable User Pool Add-Ons > Advanced Security Mode = ENFORCED.",
                    suggestion='Add `user_pool_add_ons { advanced_security_mode = "ENFORCED" }`.',
                    can_acknowledge=True,
                    standards=["SOC2", "NIST"],
                ))

        # API Gateway: no auth, no access logging
        if n.type == "api_gateway":
            auth = (cfg.get("authorization_type") or cfg.get("authorizer_type") or
                    cfg.get("default_authorizer") or "")
            if not auth or auth.upper() == "NONE":
                findings.append(Finding(
                    id=f"apigw_no_auth::{n.id}",
                    rule_id="apigw_no_auth", node_id=n.id,
                    node_label=label, node_type=n.type, level="critical",
                    title="API Gateway endpoint has no authorization configured",
                    message=f"{label} has no authorization type configured. The API is publicly accessible.",
                    fix="Configure a JWT, Lambda, IAM, or Cognito authorizer.",
                    suggestion='Set `authorization_type` on API methods: "JWT", "AWS_IAM", or "CUSTOM".',
                    standards=["CIS", "SOC2", "PCI", "NIST"],
                ))
            if (not cfg.get("access_log_destination_arn") and
                    not cfg.get("access_log_settings") and
                    not cfg.get("logging_level")):
                findings.append(Finding(
                    id=f"apigw_no_access_logging::{n.id}",
                    rule_id="apigw_no_access_logging", node_id=n.id,
                    node_label=label, node_type=n.type, level="warning",
                    title="API Gateway stage has no access logging configured",
                    message=f"{label} has no access logging. API requests and errors are not captured.",
                    fix="Set an Access Log Destination ARN (CloudWatch log group) in the stage config.",
                    suggestion='Set `access_log_settings { destination_arn = aws_cloudwatch_log_group.<name>.arn }`.',
                    standards=["CIS", "SOC2", "PCI", "HIPAA", "NIST"],
                ))

        # Kinesis: no server-side encryption
        if n.type == "kinesis":
            enc_type = cfg.get("encryption_type", "")
            if not enc_type or enc_type.upper() == "NONE":
                findings.append(Finding(
                    id=f"kinesis_no_encryption::{n.id}",
                    rule_id="kinesis_no_encryption", node_id=n.id,
                    node_label=label, node_type=n.type, level="warning",
                    title="Kinesis stream is not encrypted at rest",
                    message=f"{label} has no server-side encryption. Data records are stored unencrypted.",
                    fix="Enable server-side encryption on the Kinesis stream using KMS.",
                    suggestion='Add `server_side_encryption { enabled = true key_id = "alias/aws/kinesis" }` to `aws_kinesis_stream`.',
                    standards=["SOC2", "PCI", "HIPAA", "NIST"],
                ))

        # MSK: plaintext allowed
        if n.type == "msk":
            enc_info = cfg.get("encryption_info") or {}
            in_transit = enc_info.get("encryption_in_transit") or {}
            client_broker = in_transit.get("client_broker", cfg.get("client_broker", ""))
            if not client_broker or client_broker.upper() in ("PLAINTEXT", "TLS_PLAINTEXT"):
                findings.append(Finding(
                    id=f"msk_plaintext_allowed::{n.id}",
                    rule_id="msk_plaintext_allowed", node_id=n.id,
                    node_label=label, node_type=n.type, level="critical",
                    title="MSK cluster allows unencrypted (plaintext) client connections",
                    message=f"{label} allows plaintext connections. Kafka traffic can be intercepted.",
                    fix="Set client_broker to TLS in the MSK encryption configuration.",
                    suggestion='Set `encryption_info { encryption_in_transit { client_broker = "TLS" in_cluster = true } }`.',
                    standards=["CIS", "SOC2", "PCI", "HIPAA", "NIST"],
                ))

        # ECR: mutable tags, no scan on push
        if n.type == "ecr":
            if cfg.get("image_tag_mutability", "MUTABLE").upper() == "MUTABLE":
                findings.append(Finding(
                    id=f"ecr_image_tag_mutable::{n.id}",
                    rule_id="ecr_image_tag_mutable", node_id=n.id,
                    node_label=label, node_type=n.type, level="warning",
                    title="ECR repository allows mutable image tags",
                    message=f"{label} has mutable image tags. Tagged images can be overwritten with malicious payloads.",
                    fix='Set Image Tag Mutability to IMMUTABLE.',
                    suggestion='Set `image_tag_mutability = "IMMUTABLE"` on `aws_ecr_repository`.',
                    standards=["CIS", "SOC2", "PCI", "NIST"],
                ))
            scan_cfg = cfg.get("image_scanning_configuration") or {}
            if not scan_cfg.get("scan_on_push") and not cfg.get("scan_on_push"):
                findings.append(Finding(
                    id=f"ecr_no_scan_on_push::{n.id}",
                    rule_id="ecr_no_scan_on_push", node_id=n.id,
                    node_label=label, node_type=n.type, level="warning",
                    title="ECR repository does not scan images on push",
                    message=f"{label} does not scan container images for vulnerabilities on push.",
                    fix="Enable Scan on Push in the ECR repository config.",
                    suggestion='Set `image_scanning_configuration { scan_on_push = true }`.',
                    standards=["CIS", "SOC2", "PCI", "NIST"],
                ))

        # Step Functions: no logging, no X-Ray
        if n.type == "step_functions":
            if not cfg.get("logging_configuration") and not cfg.get("log_destination"):
                findings.append(Finding(
                    id=f"sfn_no_logging::{n.id}",
                    rule_id="sfn_no_logging", node_id=n.id,
                    node_label=label, node_type=n.type, level="warning",
                    title="Step Functions state machine has no CloudWatch logging",
                    message=f"{label} has no logging configuration. Execution failures and audit trails are invisible.",
                    fix="Configure a logging_configuration block with a CloudWatch log group destination.",
                    suggestion='Add `logging_configuration { log_destination = "${aws_cloudwatch_log_group.<name>.arn}:*" level = "ERROR" include_execution_data = true }`.',
                    standards=["SOC2", "NIST"],
                ))
            tracing = cfg.get("tracing_configuration") or {}
            if not tracing.get("enabled") and not cfg.get("xray_enabled"):
                findings.append(Finding(
                    id=f"sfn_no_xray::{n.id}",
                    rule_id="sfn_no_xray", node_id=n.id,
                    node_label=label, node_type=n.type, level="info",
                    title="Step Functions state machine does not have X-Ray tracing enabled",
                    message=f"{label} has X-Ray tracing disabled.",
                    fix="Enable X-Ray tracing in the state machine config.",
                    suggestion='Set `tracing_configuration { enabled = true }` on `aws_sfn_state_machine`.',
                    can_acknowledge=True,
                    standards=["NIST"],
                ))

        # ALB/NLB: deletion protection
        if n.type in ("alb", "nlb"):
            if not cfg.get("enable_deletion_protection"):
                findings.append(Finding(
                    id=f"alb_deletion_protection::{n.id}",
                    rule_id="alb_deletion_protection", node_id=n.id,
                    node_label=label, node_type=n.type, level="warning",
                    title="Load balancer has deletion protection disabled",
                    message=f"{label} has deletion protection disabled. It can be deleted accidentally via Terraform or the console.",
                    fix="Enable Deletion Protection in the load balancer config.",
                    suggestion='Set `enable_deletion_protection = true` on `aws_lb`.',
                    can_acknowledge=True,
                    standards=["SOC2", "NIST"],
                ))

        # CloudFront: outdated TLS version
        if n.type == "cloudfront":
            import re as _re3
            cert_cfg = cfg.get("viewer_certificate") or {}
            protocol = cert_cfg.get("minimum_protocol_version", cfg.get("minimum_protocol_version", ""))
            insecure = ("SSLv3", "TLSv1", "TLSv1_2016", "TLSv1.1_2016")
            if not protocol or any(p in protocol for p in insecure):
                findings.append(Finding(
                    id=f"cloudfront_min_tls_version::{n.id}",
                    rule_id="cloudfront_min_tls_version", node_id=n.id,
                    node_label=label, node_type=n.type, level="warning",
                    title="CloudFront distribution allows TLS versions older than 1.2",
                    message=f"{label} allows TLS 1.0 or 1.1 connections (POODLE, BEAST vulnerabilities).",
                    fix='Set Minimum Protocol Version to TLSv1.2_2021.',
                    suggestion='Set `viewer_certificate { minimum_protocol_version = "TLSv1.2_2021" ssl_support_method = "sni-only" }`.',
                    standards=["CIS", "SOC2", "PCI", "NIST"],
                ))

        # Secrets Manager: no CMK
        if n.type == "secretsmanager":
            if not cfg.get("kms_key_id"):
                findings.append(Finding(
                    id=f"secretsmanager_no_kms_cmk::{n.id}",
                    rule_id="secretsmanager_no_kms_cmk", node_id=n.id,
                    node_label=label, node_type=n.type, level="warning",
                    title="Secrets Manager secret uses the default AWS-managed KMS key",
                    message=f"{label} does not use a CMK. You cannot audit, rotate, or disable the key independently.",
                    fix="Add a custom KMS Key ID to the Secrets Manager secret config.",
                    suggestion='Set `kms_key_id = aws_kms_key.<name>.arn` on `aws_secretsmanager_secret`.',
                    can_acknowledge=True,
                    standards=["SOC2", "PCI", "HIPAA", "NIST"],
                ))

        # DynamoDB: no CMK
        if n.type == "dynamodb":
            sse = cfg.get("server_side_encryption") or {}
            enabled = str(sse.get("enabled", "")).lower() in ("true", "1")
            has_cmk = bool(sse.get("kms_key_arn") or cfg.get("kms_key_arn"))
            if not enabled or not has_cmk:
                findings.append(Finding(
                    id=f"dynamodb_no_cmk::{n.id}",
                    rule_id="dynamodb_no_cmk", node_id=n.id,
                    node_label=label, node_type=n.type, level="warning",
                    title="DynamoDB table is not encrypted with a customer-managed KMS key",
                    message=f"{label} uses the default AWS-owned key. You have no control over key rotation or audit trail.",
                    fix="Enable server-side encryption with a CMK by setting kms_key_arn.",
                    suggestion='Set `server_side_encryption { enabled = true kms_key_arn = aws_kms_key.<name>.arn }`.',
                    can_acknowledge=True,
                    standards=["SOC2", "PCI", "HIPAA", "NIST"],
                ))
    # cis_cloudtrail_log_validation
    for n in nodes:
        if n.type == "cloudtrail":
            label = n.label
            cfg = n.config
            if not cfg.get("enable_log_file_validation", True) is True and str(cfg.get("enable_log_file_validation", "true")).lower() != "true":
                findings.append(Finding(
                    id=f"cis_cloudtrail_log_validation::{n.id}",
                    rule_id="cis_cloudtrail_log_validation", node_id=n.id,
                    node_label=label, node_type=n.type, level="critical",
                    title="CloudTrail log file validation is disabled",
                    message=f"{label} does not have log file validation enabled. Logs could be tampered without detection.",
                    fix="Enable log file validation by setting enable_log_file_validation = true.",
                    suggestion='Set `enable_log_file_validation = true` on `aws_cloudtrail`.',
                    can_acknowledge=False,
                    standards=["CIS", "SOC2", "PCI", "HIPAA", "NIST"],
                ))

    # cis_cloudtrail_multi_region
    for n in nodes:
        if n.type == "cloudtrail":
            label = n.label
            cfg = n.config
            if not cfg.get("is_multi_region_trail", True) is True and str(cfg.get("is_multi_region_trail", "true")).lower() != "true":
                findings.append(Finding(
                    id=f"cis_cloudtrail_multi_region::{n.id}",
                    rule_id="cis_cloudtrail_multi_region", node_id=n.id,
                    node_label=label, node_type=n.type, level="warning",
                    title="CloudTrail is not configured for multi-region coverage",
                    message=f"{label} only captures events in a single region. Activity in other regions will not be audited.",
                    fix="Enable multi-region trail by setting is_multi_region_trail = true.",
                    suggestion='Set `is_multi_region_trail = true` on `aws_cloudtrail`.',
                    can_acknowledge=True,
                    standards=["CIS", "SOC2", "PCI", "NIST"],
                ))

    # cis_rds_auto_minor_upgrade
    for n in nodes:
        if n.type in ("rds", "aurora"):
            label = n.label
            cfg = n.config
            val = cfg.get("auto_minor_version_upgrade", True)
            if str(val).lower() == "false" or val is False:
                findings.append(Finding(
                    id=f"cis_rds_auto_minor_upgrade::{n.id}",
                    rule_id="cis_rds_auto_minor_upgrade", node_id=n.id,
                    node_label=label, node_type=n.type, level="warning",
                    title="RDS auto minor version upgrade is disabled",
                    message=f"{label} has auto_minor_version_upgrade = false. Security patches won't be applied automatically.",
                    fix="Enable auto_minor_version_upgrade to receive security patches automatically.",
                    suggestion='Set `auto_minor_version_upgrade = true` on `aws_db_instance` or `aws_rds_cluster`.',
                    can_acknowledge=True,
                    standards=["CIS", "SOC2", "NIST"],
                ))

    # cis_s3_mfa_delete
    for n in nodes:
        if n.type == "s3":
            label = n.label
            cfg = n.config
            versioning = cfg.get("versioning", {})
            if isinstance(versioning, dict):
                enabled = versioning.get("enabled", False) or versioning.get("status", "").lower() == "enabled"
                mfa_delete = versioning.get("mfa_delete", "")
            else:
                enabled = False
                mfa_delete = ""
            has_versioning = enabled or str(cfg.get("versioning_enabled", "")).lower() == "true"
            has_mfa_delete = str(mfa_delete).lower() in ("enabled", "true")
            if has_versioning and not has_mfa_delete:
                findings.append(Finding(
                    id=f"cis_s3_mfa_delete::{n.id}",
                    rule_id="cis_s3_mfa_delete", node_id=n.id,
                    node_label=label, node_type=n.type, level="warning",
                    title="S3 bucket versioning enabled but MFA delete is not enforced",
                    message=f"{label} has versioning enabled without MFA delete. Object versions can be permanently deleted without MFA verification.",
                    fix="Enable MFA delete on the versioning configuration.",
                    suggestion='Set `versioning { enabled = true mfa_delete = "Enabled" }` on `aws_s3_bucket`.',
                    can_acknowledge=True,
                    standards=["CIS", "SOC2", "PCI"],
                ))

    # guardduty_detector_disabled
    for n in nodes:
        if n.type == "guardduty":
            label = n.label
            cfg = n.config
            enabled = cfg.get("enable", True)
            if str(enabled).lower() == "false" or enabled is False:
                findings.append(Finding(
                    id=f"guardduty_detector_disabled::{n.id}",
                    rule_id="guardduty_detector_disabled", node_id=n.id,
                    node_label=label, node_type=n.type, level="critical",
                    title="GuardDuty detector is disabled",
                    message=f"{label} has enable = false. GuardDuty will not detect threats when disabled.",
                    fix="Set enable = true on the GuardDuty detector.",
                    suggestion='Set `enable = true` on `aws_guardduty_detector`.',
                    can_acknowledge=False,
                    standards=["CIS", "SOC2", "PCI", "NIST"],
                ))

    # macie_disabled
    for n in nodes:
        if n.type == "macie":
            label = n.label
            cfg = n.config
            status = cfg.get("status", "ENABLED")
            enabled = cfg.get("enabled", True)
            is_disabled = str(status).upper() == "PAUSED" or str(enabled).lower() == "false" or enabled is False
            if is_disabled:
                findings.append(Finding(
                    id=f"macie_disabled::{n.id}",
                    rule_id="macie_disabled", node_id=n.id,
                    node_label=label, node_type=n.type, level="warning",
                    title="Amazon Macie is disabled or paused",
                    message=f"{label} is not actively scanning for sensitive data. Set status to ENABLED.",
                    fix="Set status = ENABLED on the Macie account.",
                    suggestion='Set `status = "ENABLED"` on `aws_macie2_account`.',
                    can_acknowledge=True,
                    standards=["SOC2", "PCI", "HIPAA", "NIST"],
                ))

    # nist_ec2_detailed_monitoring
    for n in nodes:
        if n.type == "ec2":
            label = n.label
            cfg = n.config
            monitoring = cfg.get("monitoring", False)
            if not monitoring or str(monitoring).lower() == "false":
                findings.append(Finding(
                    id=f"nist_ec2_detailed_monitoring::{n.id}",
                    rule_id="nist_ec2_detailed_monitoring", node_id=n.id,
                    node_label=label, node_type=n.type, level="info",
                    title="EC2 instance does not have detailed monitoring enabled",
                    message=f"{label} has monitoring = false. Detailed monitoring provides 1-minute metric resolution instead of 5-minute.",
                    fix="Enable detailed monitoring by setting monitoring = true.",
                    suggestion='Set `monitoring = true` on `aws_instance`.',
                    can_acknowledge=True,
                    standards=["NIST", "SOC2"],
                ))

    # nist_lambda_env_encryption
    for n in nodes:
        if n.type == "lambda":
            label = n.label
            cfg = n.config
            env_vars = cfg.get("environment", {}) or cfg.get("environment_variables", {})
            has_env = bool(env_vars)
            kms_key = cfg.get("kms_key_arn", "") or cfg.get("environment_kms_key_arn", "")
            if has_env and not kms_key:
                findings.append(Finding(
                    id=f"nist_lambda_env_encryption::{n.id}",
                    rule_id="nist_lambda_env_encryption", node_id=n.id,
                    node_label=label, node_type=n.type, level="warning",
                    title="Lambda environment variables are not encrypted with a CMK",
                    message=f"{label} has environment variables without a KMS key. AWS encrypts them with an AWS-managed key, but you have no control over key rotation.",
                    fix="Add a kms_key_arn to encrypt environment variables with a customer-managed key.",
                    suggestion='Set `kms_key_arn = aws_kms_key.<name>.arn` on `aws_lambda_function`.',
                    can_acknowledge=True,
                    standards=["NIST", "SOC2", "PCI", "HIPAA"],
                ))

    # nist_rds_iam_auth
    for n in nodes:
        if n.type in ("rds", "aurora"):
            label = n.label
            cfg = n.config
            iam_auth = cfg.get("iam_database_authentication_enabled", False)
            if not iam_auth or str(iam_auth).lower() == "false":
                findings.append(Finding(
                    id=f"nist_rds_iam_auth::{n.id}",
                    rule_id="nist_rds_iam_auth", node_id=n.id,
                    node_label=label, node_type=n.type, level="info",
                    title="RDS IAM database authentication is not enabled",
                    message=f"{label} does not use IAM authentication. Password-based access lacks the auditability and rotation controls of IAM auth.",
                    fix="Enable IAM database authentication.",
                    suggestion='Set `iam_database_authentication_enabled = true` on `aws_db_instance`.',
                    can_acknowledge=True,
                    standards=["NIST", "SOC2", "CIS"],
                ))

    # nist_rds_no_ssl
    for n in nodes:
        if n.type in ("rds", "aurora"):
            label = n.label
            cfg = n.config
            require_ssl = cfg.get("require_ssl", False)
            ssl_enforcement = cfg.get("ssl_enforcement_enabled", False)
            param_group = cfg.get("parameter_group_name", "")
            has_ssl = (
                (str(require_ssl).lower() not in ("false", "")) or
                (str(ssl_enforcement).lower() == "true") or
                bool(param_group)
            )
            if not require_ssl and not ssl_enforcement and not param_group:
                findings.append(Finding(
                    id=f"nist_rds_no_ssl::{n.id}",
                    rule_id="nist_rds_no_ssl", node_id=n.id,
                    node_label=label, node_type=n.type, level="warning",
                    title="RDS instance does not enforce SSL connections",
                    message=f"{label} does not have SSL enforcement configured. Database connections may be transmitted unencrypted.",
                    fix="Set require_ssl or attach a parameter group that enforces SSL.",
                    suggestion='Set `require_ssl = true` or reference a parameter group with `rds.force_ssl = 1`.',
                    can_acknowledge=True,
                    standards=["NIST", "SOC2", "PCI", "HIPAA"],
                ))

    # nist_s3_access_logging
    for n in nodes:
        if n.type == "s3":
            label = n.label
            cfg = n.config
            logging_cfg = cfg.get("logging", {})
            access_logging = cfg.get("access_logging_enabled", False)
            has_logging = bool(logging_cfg) or bool(access_logging) or str(access_logging).lower() == "true"
            if not has_logging:
                findings.append(Finding(
                    id=f"nist_s3_access_logging::{n.id}",
                    rule_id="nist_s3_access_logging", node_id=n.id,
                    node_label=label, node_type=n.type, level="info",
                    title="S3 bucket does not have server access logging enabled",
                    message=f"{label} has no access logging configured. Without logs you cannot audit who accessed or modified objects.",
                    fix="Enable server access logging on the bucket.",
                    suggestion='Add `logging { target_bucket = aws_s3_bucket.<logs>.id target_prefix = "access-logs/" }` on `aws_s3_bucket`.',
                    can_acknowledge=True,
                    standards=["NIST", "SOC2", "CIS", "PCI"],
                ))

    # s3_public_acl
    for n in nodes:
        if n.type == "s3":
            label = n.label
            cfg = n.config
            acl = cfg.get("acl", "")
            if acl in ("public-read", "public-read-write"):
                findings.append(Finding(
                    id=f"s3_public_acl::{n.id}",
                    rule_id="s3_public_acl", node_id=n.id,
                    node_label=label, node_type=n.type, level="critical",
                    title="S3 bucket has a public ACL",
                    message=f'{label} has acl = "{acl}". The bucket and its objects are publicly readable.',
                    fix="Remove the public ACL and restrict access via bucket policy or Origin Access Control.",
                    suggestion='Set `acl = "private"` and add `aws_s3_bucket_public_access_block` with all four block flags enabled.',
                    can_acknowledge=False,
                    standards=["CIS", "SOC2", "PCI", "HIPAA", "NIST"],
                ))

    # waf_no_logging
    for n in nodes:
        if n.type == "waf":
            label = n.label
            cfg = n.config
            logging_config = cfg.get("logging_configuration", {})
            log_destinations = cfg.get("log_destination_configs", [])
            has_logging = bool(logging_config) or bool(log_destinations)
            if not has_logging:
                findings.append(Finding(
                    id=f"waf_no_logging::{n.id}",
                    rule_id="waf_no_logging", node_id=n.id,
                    node_label=label, node_type=n.type, level="warning",
                    title="WAF does not have logging configured",
                    message=f"{label} has no logging configuration. WAF block/allow decisions are not captured for audit or analysis.",
                    fix="Add a logging_configuration block pointing to a Kinesis Firehose or S3 bucket.",
                    suggestion='Add `logging_configuration { log_destination_configs = [aws_kinesis_firehose_delivery_stream.<name>.arn] }` on `aws_wafv2_web_acl`.',
                    can_acknowledge=True,
                    standards=["SOC2", "PCI", "NIST"],
                ))

    return findings


def _topology_findings(nodes: list[Node], edges: list[Edge]) -> list[Finding]:
    findings: list[Finding] = []
    node_map = {n.id: n for n in nodes}
    igw_ids = [n.id for n in nodes if n.type in _IGW_TYPES]

    for n in nodes:
        label = n.label

        # exposed_database
        if n.type in ("rds", "elasticache", "aurora", "dynamodb"):
            if any(_direct_edge(igw_id, n.id, edges) for igw_id in igw_ids):
                findings.append(Finding(
                    id=f"exposed_database::{n.id}",
                    rule_id="exposed_database", node_id=n.id,
                    node_label=label, node_type=n.type, level="critical",
                    title="Database exposed to public internet",
                    message=f"{label} is directly connected to an Internet Gateway. Databases must never be publicly accessible.",
                    fix="Remove the direct IGW connection. Place the database in a private subnet accessed only through compute.",
                ))

        # direct_internet_compute
        if n.type in ("ec2", "ecs_fargate"):
            if any(_direct_edge(igw_id, n.id, edges) for igw_id in igw_ids):
                findings.append(Finding(
                    id=f"direct_internet_compute::{n.id}",
                    rule_id="direct_internet_compute", node_id=n.id,
                    node_label=label, node_type=n.type, level="critical",
                    title="Compute directly exposed to internet",
                    message=f"{label} is directly connected to an Internet Gateway. Place compute behind an ALB.",
                    fix="Add an ALB between the Internet Gateway and this compute resource.",
                ))

        # missing_sg
        if n.type in ("ec2", "rds", "elasticache", "alb", "nlb", "ecs_fargate", "lambda"):
            if not n.security_group_ids:
                findings.append(Finding(
                    id=f"missing_sg::{n.id}",
                    rule_id="missing_sg", node_id=n.id,
                    node_label=label, node_type=n.type, level="warning",
                    title="No security group assigned",
                    message=f"{label} has no security group. Define explicit ingress/egress rules.",
                    fix="Open the Security tab and create or assign a security group to this component.",
                ))

        # missing_iam
        if n.type in ("lambda", "ec2", "ecs_fargate"):
            if not n.iam_role_id:
                if _has_neighbor_of_type(n.id, ["s3", "dynamodb", "sqs", "sns", "rds", "secretsmanager", "kms", "efs"], edges, nodes):
                    findings.append(Finding(
                        id=f"missing_iam::{n.id}",
                        rule_id="missing_iam", node_id=n.id,
                        node_label=label, node_type=n.type, level="warning",
                        title="No IAM role — connected to AWS services",
                        message=f"{label} accesses AWS services but has no IAM role. Assign a least-privilege role.",
                        fix="Open the IAM tab and assign a role with the minimum required permissions.",
                    ))

        # missing_waf
        if n.type == "alb":
            is_public = any(_direct_edge(igw_id, n.id, edges) for igw_id in igw_ids)
            if is_public and not _has_neighbor_of_type(n.id, "waf", edges, nodes):
                findings.append(Finding(
                    id=f"missing_waf::{n.id}",
                    rule_id="missing_waf", node_id=n.id,
                    node_label=label, node_type=n.type, level="warning",
                    title="Public-facing load balancer without WAF",
                    message=f"{label} is internet-facing but has no WAF attached.",
                    fix="Add a WAF component and connect it to this ALB.",
                ))

        # orphaned_node
        if n.type not in _INFRA_TYPES:
            if not any(e.source == n.id or e.target == n.id for e in edges):
                findings.append(Finding(
                    id=f"orphaned_node::{n.id}",
                    rule_id="orphaned_node", node_id=n.id,
                    node_label=label, node_type=n.type, level="warning",
                    title="Orphaned component — no connections",
                    message=f"{label} has no connections. Connect it or remove it.",
                    fix="Draw an edge from this component to a related resource, or delete it if no longer needed.",
                ))

        # alb_no_targets
        if n.type in ("alb", "nlb"):
            if not _has_neighbor_of_type(n.id, ["ec2", "lambda", "ecs_fargate"], edges, nodes):
                findings.append(Finding(
                    id=f"alb_no_targets::{n.id}",
                    rule_id="alb_no_targets", node_id=n.id,
                    node_label=label, node_type=n.type, level="warning",
                    title="Load balancer has no targets",
                    message=f"{label} has no compute targets. Connect to EC2, Lambda, or ECS.",
                    fix="Draw an edge from this load balancer to a compute component.",
                ))

        # alb_single_az
        if n.type in ("alb", "nlb"):
            subnet_neighbors = [
                nd for nd in nodes
                if nd.type == "subnet" and (
                    _direct_edge(n.id, nd.id, edges) or _direct_edge(nd.id, n.id, edges)
                    or nd.id == n.parent_id
                )
            ]
            if len(subnet_neighbors) < 2:
                findings.append(Finding(
                    id=f"alb_single_az::{n.id}",
                    rule_id="alb_single_az", node_id=n.id,
                    node_label=label, node_type=n.type, level="info",
                    title="Load balancer spans only one subnet",
                    message=(
                        f"{label} appears to span only one subnet. "
                        "ALBs require at least two subnets in different AZs."
                    ),
                    fix="Connect this load balancer to subnets in at least two Availability Zones.",
                    suggestion=(
                        "Add subnet IDs from at least two Availability Zones to "
                        "`subnets` on `aws_lb`. AWS requires multi-AZ for ALB "
                        "and will reject single-AZ configurations at apply time."
                    ),
                ))

        # missing_cloudwatch
        if n.type in ("lambda", "ec2", "rds", "alb", "ecs_fargate"):
            cw_nodes = [nd for nd in nodes if nd.type == "cloudwatch"]
            if not cw_nodes or not any(_direct_edge(n.id, cw.id, edges) for cw in cw_nodes):
                findings.append(Finding(
                    id=f"missing_cloudwatch::{n.id}",
                    rule_id="missing_cloudwatch", node_id=n.id,
                    node_label=label, node_type=n.type, level="info",
                    title="No CloudWatch monitoring",
                    message=f"{label} has no CloudWatch connection.",
                    fix="Add a CloudWatch component and connect it to this resource.",
                ))

        # no_multi_az
        if n.type in ("rds", "aurora"):
            if not n.config.get("multi_az"):
                findings.append(Finding(
                    id=f"no_multi_az::{n.id}",
                    rule_id="no_multi_az", node_id=n.id,
                    node_label=label, node_type=n.type, level="info",
                    title="Single AZ — no high availability",
                    message=f"{label} does not have Multi-AZ enabled. Enable it for production workloads.",
                    fix="Enable Multi-AZ in the component config.",
                ))

        # missing_secrets_manager
        if n.type in ("ec2", "lambda", "ecs_fargate"):
            nbr_ids = _neighbor_ids(n.id, edges)
            connects_to_data = any(
                node_map[nid].type in ("rds", "elasticache", "aurora")
                for nid in nbr_ids if nid in node_map
            )
            if connects_to_data:
                reachable = _reachable_types(n.id, edges, nodes, 2)
                if "secretsmanager" not in reachable:
                    findings.append(Finding(
                        id=f"missing_secrets_manager::{n.id}",
                        rule_id="missing_secrets_manager", node_id=n.id,
                        node_label=label, node_type=n.type, level="warning",
                        title="Credentials may be hardcoded — no Secrets Manager path",
                        message=f"{label} connects to a database but has no path to Secrets Manager. Credentials may be hardcoded.",
                        fix="Add a Secrets Manager component and connect it to this compute resource.",
                    ))

        # nat_gateway_missing — compute in a private parent subnet
        if n.type in ("ec2", "ecs_fargate", "lambda"):
            if n.parent_id:
                parent = node_map.get(n.parent_id)
                if parent and parent.type == "subnet" and not parent.config.get("public") and not parent.config.get("map_public_ip_on_launch"):
                    reachable = _reachable_types(n.parent_id, edges, nodes, 2)
                    if "nat_gateway" not in reachable:
                        findings.append(Finding(
                            id=f"nat_gateway_missing::{n.id}",
                            rule_id="nat_gateway_missing", node_id=n.id,
                            node_label=label, node_type=n.type, level="warning",
                            title="Private subnet compute has no NAT gateway",
                            message=f"{label} is in a private subnet with no NAT Gateway. It cannot reach the internet for updates or external calls.",
                            fix="Add a NAT Gateway in a public subnet and connect it to the private subnet's route table.",
                        ))

        # rds_in_public_subnet
        if n.type in ("rds", "aurora", "elasticache"):
            if n.parent_id:
                parent = node_map.get(n.parent_id)
                if parent and parent.type == "subnet":
                    is_pub = parent.config.get("map_public_ip_on_launch") or parent.config.get("public")
                    if is_pub:
                        findings.append(Finding(
                            id=f"rds_in_public_subnet::{n.id}",
                            rule_id="rds_in_public_subnet", node_id=n.id,
                            node_label=label, node_type=n.type, level="warning",
                            title="Database in a public subnet",
                            message=f"{label} is placed in a public subnet. Databases should always be in private subnets.",
                            fix="Move this component into a private subnet.",
                        ))

        # lambda_no_dlq
        if n.type == "lambda":
            if not _has_neighbor_of_type(n.id, ["sqs", "sns"], edges, nodes):
                findings.append(Finding(
                    id=f"lambda_no_dlq::{n.id}",
                    rule_id="lambda_no_dlq", node_id=n.id,
                    node_label=label, node_type=n.type, level="info",
                    title="Lambda function has no dead-letter queue",
                    message=f"{label} has no dead-letter queue. Failed async invocations will be silently dropped.",
                    fix="Add an SQS queue or SNS topic and connect it to this Lambda as a DLQ.",
                ))

        # nat_single_az
        if n.type == "nat_gateway":
            nat_count = sum(1 for nd in nodes if nd.type == "nat_gateway")
            if nat_count == 1:
                private_subnets = [nd for nd in nodes if nd.type == "subnet" and not nd.config.get("map_public_ip_on_launch") and not nd.config.get("public")]
                if len(private_subnets) >= 2:
                    findings.append(Finding(
                        id=f"nat_single_az::{n.id}",
                        rule_id="nat_single_az", node_id=n.id,
                        node_label=label, node_type=n.type, level="warning",
                        title="Single NAT Gateway — no cross-AZ redundancy",
                        message="Only one NAT Gateway exists across multiple private subnets. If its AZ goes down, all private subnet egress fails.",
                        fix="Add a second NAT Gateway in a different Availability Zone.",
                    ))


    # CloudFront WAF and logging checks
    for n in nodes:
        if n.type == "cloudfront":
            label = f"{n.label} ({n.tf_type or n.type})"
            has_waf = any(e.source == n.id or e.target == n.id
                          for e in edges
                          for m in nodes
                          if m.type == "waf" and (e.source == m.id or e.target == m.id))
            if not has_waf:
                node_map_local = {nd.id: nd for nd in nodes}
                connected = {e.target for e in edges if e.source == n.id} | {e.source for e in edges if e.target == n.id}
                has_waf = any(node_map_local[nid].type == "waf" for nid in connected if nid in node_map_local)
            if not has_waf:
                node_types_set = {nd.type for nd in nodes}
                if "waf" not in node_types_set:
                    findings.append(Finding(
                        id=f"cloudfront_no_waf::{n.id}",
                        rule_id="cloudfront_no_waf", node_id=n.id,
                        node_type=n.type, node_label=label, level="warning",
                        title="CloudFront distribution has no WAF",
                        message=(
                            "No WAF WebACL is associated with this CloudFront distribution. "
                            "Application-layer attacks including SQLi and XSS are unmitigated."
                        ),
                        fix="Add an aws_wafv2_web_acl_association or set web_acl_id on the distribution.",
                    ))
            # CloudFront logging check — look for S3 logging bucket connected
            has_logging = (n.config or {}).get("logging_config") or (n.config or {}).get("logging")
            if not has_logging:
                findings.append(Finding(
                    id=f"cloudfront_no_logging::{n.id}",
                    rule_id="cloudfront_no_logging", node_id=n.id,
                    node_type=n.type, node_label=label, level="warning",
                    title="CloudFront access logging not configured",
                    message=(
                        "CloudFront access logs are not enabled on this distribution. "
                        "Request-level logging is required by PCI DSS 10.2."
                    ),
                    fix="Add a logging_config block pointing to an S3 bucket for access log storage.",
                ))

    # ALB HTTP → HTTPS redirect check
    for n in nodes:
        if n.type == "alb":
            label = f"{n.label} ({n.tf_type or n.type})"
            cfg = n.config or {}
            scheme = cfg.get("scheme", "internet-facing")
            internal = cfg.get("internal", False)
            if scheme == "internet-facing" and not internal:
                # Check if any connected resource has HTTPS configured
                has_https = cfg.get("ssl_policy") or cfg.get("certificate_arn") or cfg.get("https_listener")
                if not has_https:
                    findings.append(Finding(
                        id=f"alb_http_no_redirect::{n.id}",
                        rule_id="alb_http_no_redirect", node_id=n.id,
                        node_type=n.type, node_label=label, level="warning",
                        title="Internet-facing ALB may lack HTTPS redirect",
                        message=(
                            f"{n.label} is internet-facing. Verify that HTTP listeners redirect to HTTPS. "
                            "PCI DSS ELB.1 requires all HTTP traffic to be redirected."
                        ),
                        fix="Add an aws_lb_listener with action type redirect pointing to HTTPS port 443.",
                    ))


        # API Gateway: no WAF in architecture
        if n.type == "api_gateway":
            has_waf = any(nd.type == "waf" for nd in nodes)
            if not has_waf and not _has_neighbor_of_type(n.id, "waf", edges, nodes):
                findings.append(Finding(
                    id=f"apigw_missing_waf::{n.id}",
                    rule_id="apigw_missing_waf", node_id=n.id,
                    node_label=n.label, node_type=n.type, level="warning",
                    title="Public API Gateway has no WAF associated in the architecture",
                    message=f"{n.label} is not associated with a WAF. The API endpoint is exposed to SQL injection, XSS, and HTTP flood without Layer 7 inspection.",
                    fix="Add a WAF component to the architecture and connect it to the API Gateway.",
                    suggestion='Create `aws_wafv2_web_acl` with `scope = "REGIONAL"` and associate via `aws_wafv2_web_acl_association` targeting the API Gateway stage ARN.',
                    can_acknowledge=True,
                    standards=["CIS", "SOC2", "PCI", "NIST"],
                ))

        # ALB: no ACM certificate in architecture
        if n.type == "alb":
            has_acm = any(nd.type == "acm" for nd in nodes)
            if not has_acm and not _has_neighbor_of_type(n.id, "acm", edges, nodes):
                findings.append(Finding(
                    id=f"missing_acm_on_alb::{n.id}",
                    rule_id="missing_acm_on_alb", node_id=n.id,
                    node_label=n.label, node_type=n.type, level="warning",
                    title="Application Load Balancer has no ACM certificate in the architecture",
                    message=f"{n.label} has no ACM certificate. Without TLS, the ALB cannot serve HTTPS traffic.",
                    fix="Add an ACM certificate component and connect it to the ALB.",
                    suggestion='Create `aws_acm_certificate` with `validation_method = "DNS"` and reference the ARN in `aws_lb_listener` HTTPS forward action.',
                    can_acknowledge=True,
                    standards=["CIS", "SOC2", "PCI", "NIST"],
                ))

        # Data stores: no KMS key anywhere in architecture
        if n.type in ("rds", "aurora", "dynamodb", "s3", "redshift",
                      "documentdb", "opensearch", "elasticache"):
            has_data_store = any(
                nd.type in ("rds", "aurora", "dynamodb", "s3", "redshift",
                            "documentdb", "opensearch", "elasticache")
                for nd in nodes
            )
            has_kms = any(nd.type == "kms_key" for nd in nodes)
            if has_data_store and not has_kms:
                findings.append(Finding(
                    id=f"sensitive_data_no_kms::{n.id}",
                    rule_id="sensitive_data_no_kms", node_id=n.id,
                    node_label=n.label, node_type=n.type, level="warning",
                    title="Architecture contains data stores but no KMS key resource",
                    message=f"{n.label} and other data stores have no KMS key. Encryption uses AWS-managed keys with no audit trail or revocation capability.",
                    fix="Add a KMS Key component and reference it from data store encryption configs.",
                    suggestion='Add `aws_kms_key` with `enable_key_rotation = true`. Reference CMK ARNs in each data store encryption config.',
                    can_acknowledge=True,
                    standards=["SOC2", "PCI", "HIPAA", "NIST"],
                ))

        # Lambda: no IAM execution role connected
        if n.type == "lambda":
            if not n.iam_role_id and not _has_neighbor_of_type(n.id, "iam_role", edges, nodes):
                findings.append(Finding(
                    id=f"lambda_no_execution_role::{n.id}",
                    rule_id="lambda_no_execution_role", node_id=n.id,
                    node_label=n.label, node_type=n.type, level="critical",
                    title="Lambda function has no IAM execution role connected",
                    message=f"{n.label} has no IAM execution role. Lambda cannot write CloudWatch logs or call any AWS service.",
                    fix="Attach an IAM Role with AWSLambdaBasicExecutionRole to this Lambda function.",
                    suggestion='Create `aws_iam_role` with trust policy for `lambda.amazonaws.com` and attach `AWSLambdaBasicExecutionRole`. Set `role = aws_iam_role.<name>.arn` on `aws_lambda_function`.',
                    standards=["CIS", "SOC2", "NIST"],
                ))

        # ECS: no IAM execution role connected
        if n.type == "ecs_fargate":
            if not n.iam_role_id and not _has_neighbor_of_type(n.id, "iam_role", edges, nodes):
                findings.append(Finding(
                    id=f"ecs_no_execution_role::{n.id}",
                    rule_id="ecs_no_execution_role", node_id=n.id,
                    node_label=n.label, node_type=n.type, level="critical",
                    title="ECS Fargate task has no IAM execution role connected",
                    message=f"{n.label} has no IAM execution role. ECS Fargate cannot pull images from ECR or write CloudWatch logs without it.",
                    fix="Attach an IAM Role with AmazonECSTaskExecutionRolePolicy.",
                    suggestion='Create `aws_iam_role` with trust policy for `ecs-tasks.amazonaws.com`. Attach `AmazonECSTaskExecutionRolePolicy`. Set `execution_role_arn` on `aws_ecs_task_definition`.',
                    standards=["CIS", "SOC2", "NIST"],
                ))

        # RDS: single-AZ with no backup plan
        if n.type == "rds":
            cfg = n.config
            no_multi_az = not cfg.get("multi_az") and str(cfg.get("multi_az", "")).lower() != "true"
            retention = int(cfg.get("backup_retention_period", 0) or 0)
            no_backup_plan = not _has_neighbor_of_type(n.id, "backup", edges, nodes)
            if no_multi_az and (retention < 7) and no_backup_plan:
                findings.append(Finding(
                    id=f"rds_single_az_no_backup::{n.id}",
                    rule_id="rds_single_az_no_backup", node_id=n.id,
                    node_label=n.label, node_type=n.type, level="warning",
                    title="RDS instance is single-AZ with no connection to a backup plan",
                    message=f"{n.label} is single-AZ with backup_retention_period < 7 days. An AZ failure causes extended downtime with limited recovery options.",
                    fix="Enable Multi-AZ and set backup_retention_period >= 7.",
                    suggestion='Set `multi_az = true` and `backup_retention_period = 7` on `aws_db_instance`. Add `aws_backup_plan` for longer-term retention.',
                    can_acknowledge=True,
                    standards=["SOC2", "PCI", "HIPAA", "NIST"],
                ))
    # cis_config_missing
    _config_trigger_types = {"vpc", "ec2", "rds", "s3", "lambda"}
    _has_config_service = any(n.type == "config" for n in nodes)
    _has_config_trigger = any(n.type in _config_trigger_types for n in nodes)
    if _has_config_trigger and not _has_config_service:
        _trigger_node = next(n for n in nodes if n.type in _config_trigger_types)
        findings.append(Finding(
            id=f"cis_config_missing::{_trigger_node.id}",
            rule_id="cis_config_missing", node_id=_trigger_node.id,
            node_label=_trigger_node.label, node_type=_trigger_node.type, level="warning",
            title="AWS Config service is not present in the architecture",
            message="No AWS Config recorder is included. Without Config you cannot track resource changes, enforce compliance rules, or audit configuration drift.",
            fix="Add an AWS Config node to the architecture.",
            suggestion='Add `aws_config_configuration_recorder` and `aws_config_delivery_channel` to record all resource changes.',
            can_acknowledge=True,
            standards=["CIS", "SOC2", "PCI", "NIST"],
        ))

    # guardduty_missing
    _guardduty_trigger_types = {"vpc", "ec2", "rds", "s3"}
    _has_guardduty = any(n.type == "guardduty" for n in nodes)
    _has_guardduty_trigger = any(n.type in _guardduty_trigger_types for n in nodes)
    if _has_guardduty_trigger and not _has_guardduty:
        _gd_trigger = next(n for n in nodes if n.type in _guardduty_trigger_types)
        findings.append(Finding(
            id=f"guardduty_missing::{_gd_trigger.id}",
            rule_id="guardduty_missing", node_id=_gd_trigger.id,
            node_label=_gd_trigger.label, node_type=_gd_trigger.type, level="warning",
            title="Amazon GuardDuty is not present in the architecture",
            message="No GuardDuty detector is included. GuardDuty provides threat detection for AWS accounts and workloads.",
            fix="Add a GuardDuty node to the architecture.",
            suggestion='Add `aws_guardduty_detector` with `enable = true`.',
            can_acknowledge=True,
            standards=["CIS", "SOC2", "PCI", "NIST"],
        ))

    # nist_backup_plan_missing
    _backup_trigger_types = {"rds", "aurora", "dynamodb", "efs", "ebs"}
    _has_backup = any(n.type == "backup" for n in nodes)
    _has_backup_trigger = any(n.type in _backup_trigger_types for n in nodes)
    if _has_backup_trigger and not _has_backup:
        _backup_trigger = next(n for n in nodes if n.type in _backup_trigger_types)
        findings.append(Finding(
            id=f"nist_backup_plan_missing::{_backup_trigger.id}",
            rule_id="nist_backup_plan_missing", node_id=_backup_trigger.id,
            node_label=_backup_trigger.label, node_type=_backup_trigger.type, level="warning",
            title="No AWS Backup plan is present in the architecture",
            message="Stateful resources are present but no AWS Backup plan is defined. Without a backup plan, data recovery after an incident is not guaranteed.",
            fix="Add an AWS Backup plan to the architecture and connect it to stateful resources.",
            suggestion='Add `aws_backup_plan` with a `rule` block and `aws_backup_selection` targeting stateful resources.',
            can_acknowledge=True,
            standards=["NIST", "SOC2", "PCI", "HIPAA"],
        ))

    # nist_cloudwatch_no_alerting
    for n in nodes:
        if n.type == "cloudwatch":
            label = n.label
            if not _has_neighbor_of_type(n.id, "sns", edges, nodes):
                findings.append(Finding(
                    id=f"nist_cloudwatch_no_alerting::{n.id}",
                    rule_id="nist_cloudwatch_no_alerting", node_id=n.id,
                    node_label=label, node_type=n.type, level="warning",
                    title="CloudWatch is not connected to an SNS topic for alerting",
                    message=f"{label} has no connection to an SNS topic. CloudWatch alarms will trigger but no notifications will be sent.",
                    fix="Connect CloudWatch to an SNS topic to enable alarm notifications.",
                    suggestion='Add an `aws_sns_topic` and reference it in `aws_cloudwatch_metric_alarm` alarm_actions.',
                    can_acknowledge=True,
                    standards=["NIST", "SOC2", "CIS"],
                ))

    # nist_shield_missing
    _shield_trigger_types = {"cloudfront", "alb", "route53"}
    _has_shield = any(n.type == "shield" for n in nodes)
    _has_shield_trigger = any(n.type in _shield_trigger_types for n in nodes)
    if _has_shield_trigger and not _has_shield:
        _shield_trigger = next(n for n in nodes if n.type in _shield_trigger_types)
        findings.append(Finding(
            id=f"nist_shield_missing::{_shield_trigger.id}",
            rule_id="nist_shield_missing", node_id=_shield_trigger.id,
            node_label=_shield_trigger.label, node_type=_shield_trigger.type, level="info",
            title="AWS Shield is not present for internet-facing resources",
            message="Internet-facing resources (CloudFront, ALB, Route53) are present but no AWS Shield protection is defined. DDoS attacks may degrade availability.",
            fix="Add AWS Shield (Standard is automatic; add Shield Advanced for SLA-backed protection).",
            suggestion='Add `aws_shield_protection` referencing the CloudFront distribution or ALB ARN.',
            can_acknowledge=True,
            standards=["NIST", "SOC2"],
        ))

    # nist_ssm_missing
    for n in nodes:
        if n.type == "ec2":
            label = n.label
            cfg = n.config
            has_ssm = _has_neighbor_of_type(n.id, "systems_manager", edges, nodes)
            ssm_managed = cfg.get("ssm_managed", False)
            if not has_ssm and not ssm_managed:
                findings.append(Finding(
                    id=f"nist_ssm_missing::{n.id}",
                    rule_id="nist_ssm_missing", node_id=n.id,
                    node_label=label, node_type=n.type, level="info",
                    title="EC2 instance is not connected to Systems Manager",
                    message=f"{label} has no Systems Manager connection. Without SSM you must open SSH ports for management, increasing attack surface.",
                    fix="Connect the EC2 instance to a Systems Manager node and attach the AmazonSSMManagedInstanceCore policy.",
                    suggestion='Add `aws_ssm_association` or attach `AmazonSSMManagedInstanceCore` policy to the instance role. Remove SSH ingress rules.',
                    can_acknowledge=True,
                    standards=["NIST", "SOC2", "CIS"],
                ))

    # nist_xray_missing
    _xray_trigger_types = {"lambda", "ecs_fargate", "eks", "api_gateway"}
    for n in nodes:
        if n.type in _xray_trigger_types:
            label = n.label
            cfg = n.config
            has_xray = _has_neighbor_of_type(n.id, "xray", edges, nodes)
            tracing_mode = cfg.get("tracing_mode", "") or cfg.get("tracing", {}).get("mode", "")
            has_tracing = bool(has_xray) or str(tracing_mode).lower() == "active"
            if not has_tracing:
                findings.append(Finding(
                    id=f"nist_xray_missing::{n.id}",
                    rule_id="nist_xray_missing", node_id=n.id,
                    node_label=label, node_type=n.type, level="info",
                    title="Service does not have AWS X-Ray tracing enabled",
                    message=f"{label} has no X-Ray tracing configured. Without distributed tracing, performance issues and errors are difficult to diagnose.",
                    fix="Enable X-Ray active tracing or connect an X-Ray node.",
                    suggestion='Set `tracing_config { mode = "Active" }` on Lambda or enable X-Ray on ECS/API Gateway.',
                    can_acknowledge=True,
                    standards=["NIST", "SOC2"],
                ))

    # pci_inspector_missing
    _inspector_trigger_types = {"ec2", "ecs_fargate", "eks", "lambda"}
    _has_inspector = any(n.type == "inspector" for n in nodes)
    _has_inspector_trigger = any(n.type in _inspector_trigger_types for n in nodes)
    if _has_inspector_trigger and not _has_inspector:
        _inspector_trigger = next(n for n in nodes if n.type in _inspector_trigger_types)
        findings.append(Finding(
            id=f"pci_inspector_missing::{_inspector_trigger.id}",
            rule_id="pci_inspector_missing", node_id=_inspector_trigger.id,
            node_label=_inspector_trigger.label, node_type=_inspector_trigger.type, level="info",
            title="Amazon Inspector is not present in the architecture",
            message="Compute resources are present but no Amazon Inspector is defined. Without Inspector, container images and EC2 instances are not scanned for vulnerabilities.",
            fix="Add Amazon Inspector to continuously scan EC2 instances and container images.",
            suggestion='Enable `aws_inspector2_enabler` for EC2 and ECR resource types.',
            can_acknowledge=True,
            standards=["PCI", "SOC2", "NIST"],
        ))

    # security_hub_missing
    _sec_hub_trigger_types = {"vpc", "ec2", "rds", "s3", "lambda"}
    _has_security_hub = any(n.type == "security_hub" for n in nodes)
    _has_sec_hub_trigger = any(n.type in _sec_hub_trigger_types for n in nodes)
    if _has_sec_hub_trigger and not _has_security_hub:
        _sec_hub_trigger = next(n for n in nodes if n.type in _sec_hub_trigger_types)
        findings.append(Finding(
            id=f"security_hub_missing::{_sec_hub_trigger.id}",
            rule_id="security_hub_missing", node_id=_sec_hub_trigger.id,
            node_label=_sec_hub_trigger.label, node_type=_sec_hub_trigger.type, level="info",
            title="AWS Security Hub is not present in the architecture",
            message="No Security Hub is included. Security Hub aggregates findings from GuardDuty, Inspector, Macie, and other services into a single security posture view.",
            fix="Add AWS Security Hub to the architecture.",
            suggestion='Add `aws_securityhub_account` and enable relevant standards (AWS Foundational, CIS, PCI).',
            can_acknowledge=True,
            standards=["SOC2", "PCI", "NIST"],
        ))

    # cis_cloudtrail_bucket_logging
    for n in nodes:
        if n.type == "cloudtrail":
            label = n.label
            # Find S3 neighbors
            s3_neighbors = [
                node_map[eid]
                for e in edges
                for eid in ([e.source, e.target] if e.source == n.id or e.target == n.id else [])
                if eid in node_map and node_map[eid].type == "s3"
            ]
            for s3n in s3_neighbors:
                s3_cfg = s3n.config
                logging_cfg = s3_cfg.get("logging", {})
                access_logging = s3_cfg.get("access_logging_enabled", False)
                has_logging = bool(logging_cfg) or bool(access_logging) or str(access_logging).lower() == "true"
                if not has_logging:
                    findings.append(Finding(
                        id=f"cis_cloudtrail_bucket_logging::{n.id}",
                        rule_id="cis_cloudtrail_bucket_logging", node_id=n.id,
                        node_label=label, node_type=n.type, level="warning",
                        title="CloudTrail S3 bucket does not have access logging enabled",
                        message=f"{label} stores logs in an S3 bucket without access logging. Access to the audit trail itself is not audited.",
                        fix="Enable access logging on the S3 bucket used by CloudTrail.",
                        suggestion='Add `logging { target_bucket = aws_s3_bucket.<access_logs>.id }` to the CloudTrail S3 bucket.',
                        can_acknowledge=True,
                        standards=["CIS", "SOC2", "PCI", "NIST"],
                    ))
                    break

    return findings


def _sg_findings(sgs: list[SecurityGroup]) -> list[Finding]:
    findings: list[Finding] = []
    for sg in sgs:
        if _sg_allows_all_from_public(sg):
            findings.append(Finding(
                id=f"sg_open_all::{sg.id}",
                rule_id="sg_open_all", node_id=sg.id,
                node_label=sg.name, node_type="security_group", level="critical",
                title="Security group allows all traffic from internet",
                message=f'Security group "{sg.name}" allows all traffic (protocol -1) from 0.0.0.0/0.',
                fix="Remove the all-traffic inbound rule and replace with specific port allowances.",
                sg_id=sg.id,
            ))

        db_ports = [3306, 5432, 1521, 27017, 6379, 5439, 1433]
        if any(_sg_allows_port_from_public(sg, p) for p in db_ports):
            findings.append(Finding(
                id=f"sg_open_db_port::{sg.id}",
                rule_id="sg_open_db_port", node_id=sg.id,
                node_label=sg.name, node_type="security_group", level="critical",
                title="Database port open to internet",
                message=f'Security group "{sg.name}" allows a database port (MySQL/Postgres/Redis/etc.) from 0.0.0.0/0.',
                fix="Restrict database port access to specific security group sources, not public CIDRs.",
                sg_id=sg.id,
            ))

        if _sg_allows_port_from_public(sg, 22):
            findings.append(Finding(
                id=f"sg_open_ssh::{sg.id}",
                rule_id="sg_open_ssh", node_id=sg.id,
                node_label=sg.name, node_type="security_group", level="warning",
                title="SSH open to internet",
                message=f'Security group "{sg.name}" allows SSH (port 22) from 0.0.0.0/0.',
                fix="Restrict SSH to specific IP ranges or use AWS Systems Manager Session Manager instead.",
                sg_id=sg.id,
            ))

        if _sg_allows_port_from_public(sg, 3389):
            findings.append(Finding(
                id=f"sg_open_rdp::{sg.id}",
                rule_id="sg_open_rdp", node_id=sg.id,
                node_label=sg.name, node_type="security_group", level="warning",
                title="RDP open to internet",
                message=f'Security group "{sg.name}" allows RDP (port 3389) from 0.0.0.0/0.',
                fix="Restrict RDP to specific IP ranges or use AWS Systems Manager Fleet Manager.",
                sg_id=sg.id,
            ))

        if _sg_allows_port_from_public(sg, 23):
            findings.append(Finding(
                id=f"sg_open_telnet::{sg.id}",
                rule_id="sg_open_telnet", node_id=sg.id,
                node_label=sg.name, node_type="security_group", level="warning",
                title="Telnet port open to internet",
                message=f'Security group "{sg.name}" allows Telnet (port 23) from 0.0.0.0/0. Telnet is unencrypted.',
                fix="Replace Telnet with SSH.",
                can_acknowledge=True, sg_id=sg.id,
            ))

        if _sg_allows_port_from_public(sg, 20) or _sg_allows_port_from_public(sg, 21):
            findings.append(Finding(
                id=f"sg_open_ftp::{sg.id}",
                rule_id="sg_open_ftp", node_id=sg.id,
                node_label=sg.name, node_type="security_group", level="warning",
                title="FTP port open to internet",
                message=f'Security group "{sg.name}" allows FTP (port 20/21) from 0.0.0.0/0. FTP is unencrypted.',
                fix="Use SFTP (port 22) or AWS Transfer Family instead.",
                can_acknowledge=True, sg_id=sg.id,
            ))

        if _sg_allows_port_from_public(sg, 25):
            findings.append(Finding(
                id=f"sg_open_smtp::{sg.id}",
                rule_id="sg_open_smtp", node_id=sg.id,
                node_label=sg.name, node_type="security_group", level="warning",
                title="SMTP port open to internet",
                message=f'Security group "{sg.name}" allows SMTP (port 25) from 0.0.0.0/0.',
                fix="Use Amazon SES for outbound email.",
                can_acknowledge=True, sg_id=sg.id,
            ))

        if any(_sg_allows_port_from_public(sg, p) for p in [110, 143, 993, 995]):
            findings.append(Finding(
                id=f"sg_open_pop3_imap::{sg.id}",
                rule_id="sg_open_pop3_imap", node_id=sg.id,
                node_label=sg.name, node_type="security_group", level="warning",
                title="Mail retrieval port open to internet",
                message=f'Security group "{sg.name}" allows POP3/IMAP (110/143/993/995) from 0.0.0.0/0.',
                fix="Restrict mail port access.",
                can_acknowledge=True, sg_id=sg.id,
            ))

        if any(_is_wide_range(r) for r in sg.inbound):
            findings.append(Finding(
                id=f"sg_ephemeral_ports::{sg.id}",
                rule_id="sg_ephemeral_ports", node_id=sg.id,
                node_label=sg.name, node_type="security_group", level="info",
                title="Wide port range open to internet",
                message=f'Security group "{sg.name}" has a wide port range open to 0.0.0.0/0.',
                fix="Narrow the port range to only required ports.",
                can_acknowledge=True, sg_id=sg.id,
            ))

        if _sg_allows_port_from_public(sg, 80) and not _sg_allows_port_from_public(sg, 443):
            findings.append(Finding(
                id=f"sg_http_not_https::{sg.id}",
                rule_id="sg_http_not_https", node_id=sg.id,
                node_label=sg.name, node_type="security_group", level="info",
                title="HTTP allowed without HTTPS",
                message=f'Security group "{sg.name}" allows HTTP (80) from the internet but not HTTPS (443).',
                fix="Add an HTTPS (443) inbound rule and redirect HTTP to HTTPS at the load balancer.",
                sg_id=sg.id,
            ))

        admin_ports = [8080, 8443, 8888, 9200, 9300, 5601, 9000, 2375, 2376, 6443, 10250, 4848, 4040, 8161]
        if any(_sg_allows_port_from_public(sg, p) for p in admin_ports):
            findings.append(Finding(
                id=f"sg_open_admin_port::{sg.id}",
                rule_id="sg_open_admin_port", node_id=sg.id,
                node_label=sg.name, node_type="security_group", level="warning",
                title="Admin or debug port open to internet",
                message=f'Security group "{sg.name}" exposes an admin or debug port to 0.0.0.0/0.',
                fix="Restrict admin port access to a specific IP range or VPN CIDR.",
                can_acknowledge=True, sg_id=sg.id,
            ))

        # Default SG should have no inbound rules (CIS 5.2)
        if sg.name.lower() in ("default", "default-sg") and sg.inbound:
            findings.append(Finding(
                id=f"default_sg_unrestricted::{sg.id}",
                rule_id="default_sg_unrestricted", node_id=sg.id,
                node_label=sg.name, node_type="security_group", level="warning",
                title="Default security group has inbound rules",
                message=(
                    f'Security group "{sg.name}" appears to be the default VPC SG but has '
                    f"{len(sg.inbound)} inbound rule(s). CIS requires default SGs to allow no traffic."
                ),
                fix="Remove all inbound and outbound rules from the default security group. Use purpose-built SGs instead.",
            ))

        if _sg_allows_port_from_public(sg, 6379):
            findings.append(Finding(
                id=f"sg_open_redis::{sg.id}",
                rule_id="sg_open_redis", node_id=sg.id,
                node_label=sg.name, node_type="security_group", level="critical",
                title="Redis port (6379) open to internet",
                message=f'Security group "{sg.name}" exposes Redis port 6379 to 0.0.0.0/0. Redis has no authentication by default — any internet actor can read, write, or delete all cache data.',
                fix="Restrict port 6379 to the application security group only.",
                suggestion='Replace `cidr_blocks = ["0.0.0.0/0"]` with `source_security_group_id`. Enable Redis AUTH and `transit_encryption_enabled = true` on the ElastiCache replication group.',
                can_acknowledge=False, sg_id=sg.id,
                standards=["CIS", "SOC2", "PCI", "HIPAA", "NIST"],
            ))

        if _sg_allows_port_from_public(sg, 11211):
            findings.append(Finding(
                id=f"sg_open_memcached::{sg.id}",
                rule_id="sg_open_memcached", node_id=sg.id,
                node_label=sg.name, node_type="security_group", level="critical",
                title="Memcached port (11211) open to internet",
                message=f'Security group "{sg.name}" exposes Memcached port 11211 to 0.0.0.0/0. Memcached has no auth or encryption and enables DDoS amplification (~50,000x factor).',
                fix="Remove the 0.0.0.0/0 inbound rule on port 11211 immediately.",
                suggestion='Restrict Memcached to `source_security_group_id` of the app tier. Memcached has no native auth — never expose externally.',
                can_acknowledge=False, sg_id=sg.id,
                standards=["CIS", "SOC2", "PCI", "HIPAA", "NIST"],
            ))

        if (_sg_allows_port_from_public(sg, 9200) or
                _sg_allows_port_from_public(sg, 9300) or
                _sg_allows_port_from_public(sg, 5601)):
            findings.append(Finding(
                id=f"sg_open_elasticsearch::{sg.id}",
                rule_id="sg_open_elasticsearch", node_id=sg.id,
                node_label=sg.name, node_type="security_group", level="critical",
                title="Elasticsearch/OpenSearch port (9200/9300/5601) open to internet",
                message=f'Security group "{sg.name}" exposes Elasticsearch or Kibana ports to 0.0.0.0/0. Unauthenticated clusters expose entire indices for download in seconds.',
                fix="Remove 0.0.0.0/0 inbound rules on ports 9200, 9300, and 5601.",
                suggestion='Restrict to internal security group references. Deploy OpenSearch inside a VPC with fine-grained access control enabled.',
                can_acknowledge=False, sg_id=sg.id,
                standards=["CIS", "SOC2", "PCI", "HIPAA", "NIST"],
            ))

        if (_sg_allows_port_from_public(sg, 27017) or
                _sg_allows_port_from_public(sg, 27018) or
                _sg_allows_port_from_public(sg, 27019)):
            findings.append(Finding(
                id=f"sg_open_mongodb::{sg.id}",
                rule_id="sg_open_mongodb", node_id=sg.id,
                node_label=sg.name, node_type="security_group", level="critical",
                title="MongoDB port (27017) open to internet",
                message=f'Security group "{sg.name}" exposes MongoDB ports to 0.0.0.0/0. Automated scanners exfiltrate exposed MongoDB databases within minutes.',
                fix="Remove 0.0.0.0/0 inbound rules on MongoDB ports immediately.",
                suggestion='Restrict to `source_security_group_id` of the app tier. Enable auth (`--auth`), TLS, and bindIp restriction.',
                can_acknowledge=False, sg_id=sg.id,
                standards=["CIS", "SOC2", "PCI", "HIPAA", "NIST"],
            ))

        if (_sg_allows_port_from_public(sg, 9092) or
                _sg_allows_port_from_public(sg, 9093) or
                _sg_allows_port_from_public(sg, 9094)):
            findings.append(Finding(
                id=f"sg_open_kafka::{sg.id}",
                rule_id="sg_open_kafka", node_id=sg.id,
                node_label=sg.name, node_type="security_group", level="critical",
                title="Kafka broker port (9092/9093/9094) open to internet",
                message=f'Security group "{sg.name}" exposes Kafka broker ports to 0.0.0.0/0. Unauthenticated brokers allow anyone to produce or consume messages from any topic.',
                fix="Restrict Kafka ports to producer/consumer security groups only.",
                suggestion='Use `source_security_group_id` for producer and consumer tiers. Enable SASL/SCRAM auth and set `client_broker = "TLS"` on MSK.',
                can_acknowledge=False, sg_id=sg.id,
                standards=["CIS", "SOC2", "PCI", "NIST"],
            ))

        icmp_open = any(
            r.protocol == "icmp" and _is_public_cidr(r.source)
            for r in (sg.inbound or [])
        )
        if icmp_open:
            findings.append(Finding(
                id=f"sg_icmp_unrestricted::{sg.id}",
                rule_id="sg_icmp_unrestricted", node_id=sg.id,
                node_label=sg.name, node_type="security_group", level="info",
                title="ICMP traffic unrestricted from internet",
                message=f'Security group "{sg.name}" allows unrestricted ICMP from 0.0.0.0/0. Enables ping sweeps, network topology mapping, and ICMP data exfiltration tunnels.',
                fix="Restrict ICMP to specific trusted CIDRs or block entirely from public sources.",
                suggestion='Remove unrestricted ICMP ingress. Use AWS Reachability Analyzer for connectivity testing instead of relying on public ping.',
                can_acknowledge=True, sg_id=sg.id,
                standards=["CIS", "SOC2", "NIST"],
            ))
    return findings


def _iam_findings(iam_roles: list[IAMRole]) -> list[Finding]:
    findings: list[Finding] = []
    for role in iam_roles:
        if _has_admin_policy(role.policies):
            findings.append(Finding(
                id=f"iam_admin_policy::{role.id}",
                rule_id="iam_admin_policy", node_id=role.id,
                node_label=role.name, node_type="iam_role", level="critical",
                title="IAM role grants full administrator access",
                message=f'IAM role "{role.name}" has a policy allowing Action:* on Resource:*. This is equivalent to AdministratorAccess.',
                fix="Replace the wildcard policy with specific actions and resources. Follow the principle of least privilege.",
            ))
        elif _has_wildcard_on_sensitive(role.policies):
            findings.append(Finding(
                id=f"iam_wildcard_sensitive::{role.id}",
                rule_id="iam_wildcard_sensitive", node_id=role.id,
                node_label=role.name, node_type="iam_role", level="critical",
                title="IAM role has wildcard actions on sensitive service",
                message=f'IAM role "{role.name}" allows wildcard (*) actions on a sensitive service.',
                fix="Replace service-level wildcards (e.g. s3:*) with specific actions (e.g. s3:GetObject, s3:PutObject).",
            ))
        # No resource constraint — specific actions but resource:*
        if not _has_admin_policy(role.policies):
            for stmt in role.policies:
                if stmt.effect.lower() != "allow":
                    continue
                actions = stmt.actions if isinstance(stmt.actions, list) else [stmt.actions]
                resources = stmt.resources if isinstance(stmt.resources, list) else [stmt.resources]
                has_wildcard_action = any(a.strip() == "*" for a in actions)
                has_wildcard_resource = any(r.strip() == "*" for r in resources)
                if has_wildcard_resource and not has_wildcard_action:
                    findings.append(Finding(
                        id=f"iam_no_resource_constraint::{role.id}",
                        rule_id="iam_no_resource_constraint", node_id=role.id,
                        node_label=role.name, node_type="iam_role", level="warning",
                        title="IAM role actions not scoped to specific resources",
                        message=(
                            f'IAM role "{role.name}" has allow statements with resource: "*" but specific actions. '
                            "This grants those actions on ALL resources in the account."
                        ),
                        fix="Restrict the Resource field to specific ARNs (e.g. arn:aws:s3:::my-bucket/*).",
                    ))
                    break  # one finding per role is enough
        # Inline policy check: aws_iam_role_policy resources produce node IDs
        # derived from their TF address (e.g. aws_iam_role_policy_my_inline).
        if "role_policy" in role.id and "attachment" not in role.id:
            findings.append(Finding(
                id=f"iam_inline_policy::{role.id}",
                rule_id="iam_inline_policy", node_id=role.id,
                node_label=role.name, node_type="iam_role", level="info",
                title="IAM inline policy detected",
                message=(
                    f'IAM role "{role.name}" uses an inline policy. '
                    "Inline policies cannot be reused, audited centrally, or attached to multiple roles."
                ),
                fix="Convert this to a standalone aws_iam_policy resource and attach via aws_iam_role_policy_attachment.",
            ))

        # Cross-account role with no ExternalId condition
        has_cross_account_assume = False
        has_external_id = False
        for stmt in role.policies:
            actions = stmt.actions if isinstance(stmt.actions, list) else [str(stmt.actions or "")]
            resources = stmt.resources if isinstance(stmt.resources, list) else [str(stmt.resources or "")]
            is_trust = any(a.strip() == "sts:AssumeRole" for a in actions)
            is_cross_account = any(
                bool(__import__('re').match(r'arn:aws:iam::\d{12}', r)) and ":root" not in r
                for r in resources
            )
            if is_trust and is_cross_account:
                has_cross_account_assume = True
                # Check for ExternalId condition (stored as condition dict on statement)
                cond = getattr(stmt, "condition", {}) or {}
                if (cond.get("StringEquals", {}).get("sts:ExternalId") or
                        cond.get("StringLike", {}).get("sts:ExternalId")):
                    has_external_id = True
        if has_cross_account_assume and not has_external_id:
            findings.append(Finding(
                id=f"iam_cross_account_no_external_id::{role.id}",
                rule_id="iam_cross_account_no_external_id", node_id=role.id,
                node_label=role.name, node_type="iam_role", level="critical",
                title="Cross-account IAM role has no ExternalId condition",
                message=f'IAM role "{role.name}" allows cross-account sts:AssumeRole without a sts:ExternalId condition. Any AWS account that knows the role ARN can assume it (confused deputy attack).',
                fix='Add a Condition block requiring sts:ExternalId to the cross-account trust policy.',
                suggestion='Add `"Condition": { "StringEquals": { "sts:ExternalId": "<unique-secret>" } }` to the trust policy. ExternalId prevents confused deputy attacks.',
                can_acknowledge=False,
                standards=["CIS", "SOC2", "PCI", "NIST"],
            ))

        # iam:PassRole on resource: *
        for stmt in role.policies:
            if stmt.effect.lower() != "allow":
                continue
            actions = stmt.actions if isinstance(stmt.actions, list) else [str(stmt.actions or "")]
            resources = stmt.resources if isinstance(stmt.resources, list) else [str(stmt.resources or "")]
            has_pass_role = any(a.strip() in ("iam:PassRole", "*") for a in actions)
            all_resources = any(r.strip() == "*" for r in resources)
            if has_pass_role and all_resources:
                findings.append(Finding(
                    id=f"iam_pass_role_unrestricted::{role.id}",
                    rule_id="iam_pass_role_unrestricted", node_id=role.id,
                    node_label=role.name, node_type="iam_role", level="critical",
                    title="IAM role grants iam:PassRole on all resources",
                    message=f'IAM role "{role.name}" can pass any IAM role to any AWS service — a classic privilege escalation path to Administrator.',
                    fix='Restrict iam:PassRole Resource to specific role ARN patterns.',
                    suggestion='Change Resource from `"*"` to `"arn:aws:iam::ACCOUNT_ID:role/allowed-prefix-*"`. iam:PassRole on * is a top IAM privilege escalation technique.',
                    can_acknowledge=False,
                    standards=["CIS", "SOC2", "PCI", "NIST"],
                ))
                break

        # Trust policy allows all AWS services (*.amazonaws.com)
        for stmt in role.policies:
            if stmt.effect.lower() != "allow":
                continue
            actions = stmt.actions if isinstance(stmt.actions, list) else [str(stmt.actions or "")]
            resources = stmt.resources if isinstance(stmt.resources, list) else [str(stmt.resources or "")]
            is_trust = any(a.strip() == "sts:AssumeRole" for a in actions)
            all_services = any(r.strip() in ("*", "*.amazonaws.com") for r in resources)
            if is_trust and all_services:
                findings.append(Finding(
                    id=f"iam_trust_all_services::{role.id}",
                    rule_id="iam_trust_all_services", node_id=role.id,
                    node_label=role.name, node_type="iam_role", level="warning",
                    title="IAM role trust policy allows all AWS services to assume it",
                    message=f'IAM role "{role.name}" allows *.amazonaws.com to assume it. Any AWS service in any account could assume this role.',
                    fix='Restrict the Principal to a specific service (e.g. "lambda.amazonaws.com").',
                    suggestion='Replace `"Service": "*.amazonaws.com"` with the specific service principal needed (e.g. `"lambda.amazonaws.com"`, `"ecs-tasks.amazonaws.com"`).',
                    can_acknowledge=False,
                    standards=["CIS", "SOC2", "PCI", "NIST"],
                ))
                break

        # Human-access role without MFA condition
        for stmt in role.policies:
            if stmt.effect.lower() != "allow":
                continue
            actions = stmt.actions if isinstance(stmt.actions, list) else [str(stmt.actions or "")]
            resources = stmt.resources if isinstance(stmt.resources, list) else [str(stmt.resources or "")]
            is_trust = any(a.strip() == "sts:AssumeRole" for a in actions)
            is_user_principal = any(":user/" in r or ":root" in r for r in resources)
            cond = getattr(stmt, "condition", {}) or {}
            has_mfa = (
                cond.get("BoolIfExists", {}).get("aws:MultiFactorAuthPresent") == "true" or
                cond.get("Bool", {}).get("aws:MultiFactorAuthPresent") == "true" or
                "aws:MultiFactorAuthAge" in cond.get("NumericLessThan", {})
            )
            if is_trust and is_user_principal and not has_mfa:
                findings.append(Finding(
                    id=f"iam_no_mfa_condition::{role.id}",
                    rule_id="iam_no_mfa_condition", node_id=role.id,
                    node_label=role.name, node_type="iam_role", level="critical",
                    title="IAM role with console access has no MFA required condition",
                    message=f'IAM role "{role.name}" can be assumed by IAM users without requiring MFA. A compromised password alone is sufficient.',
                    fix='Add a Condition block requiring aws:MultiFactorAuthPresent = true.',
                    suggestion='Add `"Condition": { "BoolIfExists": { "aws:MultiFactorAuthPresent": "true" } }` to the trust policy.',
                    can_acknowledge=False,
                    standards=["CIS", "SOC2", "PCI", "HIPAA", "NIST"],
                ))
                break
    return findings


# ─── TF plan JSON parser ──────────────────────────────────────────────────────


def _parse_ingress_rules(values: dict) -> list[SGRule]:
    """Parse ingress blocks from aws_security_group planned_values."""
    rules: list[SGRule] = []
    ingress_list = values.get("ingress") or []
    for ing in ingress_list:
        if not isinstance(ing, dict):
            continue
        protocol = str(ing.get("protocol", "tcp"))
        from_port = ing.get("from_port", 0)
        to_port = ing.get("to_port", 0)
        port = "-1" if protocol == "-1" else (
            str(from_port) if from_port == to_port else f"{from_port}-{to_port}"
        )
        for cidr in (ing.get("cidr_blocks") or []):
            rules.append(SGRule(protocol=protocol, port=port, source=cidr))
        for cidr in (ing.get("ipv6_cidr_blocks") or []):
            rules.append(SGRule(protocol=protocol, port=port, source=cidr))
        # Self-referencing or SG-sourced rules — use sg id as source
        for sg_src in (ing.get("security_groups") or []):
            rules.append(SGRule(protocol=protocol, port=port, source=str(sg_src)))
    return rules


def _parse_iam_policy_document(doc: str | dict | None) -> list[IAMStatement]:
    """Parse an IAM policy document (JSON string or dict) into IAMStatements."""
    if not doc:
        return []
    if isinstance(doc, str):
        try:
            doc = json.loads(doc)
        except (json.JSONDecodeError, TypeError):
            return []
    stmts: list[IAMStatement] = []
    for stmt in (doc.get("Statement") or []):
        if not isinstance(stmt, dict):
            continue
        effect = stmt.get("Effect", "Allow")
        actions = stmt.get("Action", [])
        if isinstance(actions, str):
            actions = [actions]
        resources = stmt.get("Resource", [])
        if isinstance(resources, str):
            resources = [resources]
        stmts.append(IAMStatement(effect=effect, actions=actions, resources=resources))
    return stmts


def _collect_resources(plan: dict) -> list[dict]:
    """Flatten all resources from planned_values root_module (recursively)."""
    resources: list[dict] = []

    def _walk(module: dict) -> None:
        for r in module.get("resources") or []:
            resources.append(r)
        for child in module.get("child_modules") or []:
            _walk(child)

    pv = plan.get("planned_values") or plan.get("values") or {}
    root = pv.get("root_module") or {}
    _walk(root)
    return resources


def _collect_config_resources(plan: dict) -> list[dict]:
    """Collect config-level resources for reference/dependency extraction."""
    cfg_resources: list[dict] = []

    def _walk(module: dict) -> None:
        for r in module.get("resources") or []:
            cfg_resources.append(r)
        for child in (module.get("module_calls") or {}).values():
            _walk(child.get("module", {}))

    root = (plan.get("configuration") or {}).get("root_module") or {}
    _walk(root)
    return cfg_resources


def parse_plan_json(plan: dict) -> tuple[list[Node], list[Edge], list[SecurityGroup], list[IAMRole]]:
    """
    Parse a terraform show -json plan into (nodes, edges, sgs, iam_roles).

    Edges are inferred from resource dependency references in the
    configuration block.
    """
    raw_resources = _collect_resources(plan)
    cfg_resources = _collect_config_resources(plan)

    nodes: list[Node] = []
    sgs: list[SecurityGroup] = []
    iam_roles: list[IAMRole] = []

    # address → node.id map for edge building
    addr_to_id: dict[str, str] = {}

    for r in raw_resources:
        tf_type = r.get("type", "")
        name = r.get("name", "")
        address = r.get("address", f"{tf_type}.{name}")
        values = r.get("values") or {}

        canvas_type = _TF_TYPE_MAP.get(tf_type, "generic_tf")
        node_id = address.replace(".", "_").replace("[", "_").replace("]", "_").replace('"', "")
        label = f"{name} ({tf_type.replace('aws_', '')})"

        # Infer SG IDs referenced by this resource
        sg_ids: list[str] = []
        for key in ("vpc_security_group_ids", "security_group_ids", "security_groups"):
            raw_sg = values.get(key) or []
            if isinstance(raw_sg, list):
                sg_ids.extend(str(s) for s in raw_sg if s)

        # Infer IAM role
        iam_role_id: str | None = None
        for key in ("iam_instance_profile", "role", "execution_role_arn", "task_role_arn"):
            if values.get(key):
                iam_role_id = str(values[key])
                break

        # Build SecurityGroup objects
        if canvas_type == "security_group":
            sg = SecurityGroup(
                id=node_id,
                name=values.get("name") or name,
                inbound=_parse_ingress_rules(values),
            )
            sgs.append(sg)

        # Build IAMRole objects
        if canvas_type == "iam_role":
            stmts: list[IAMStatement] = []
            # Inline policy document
            for key in ("assume_role_policy", "policy"):
                if values.get(key):
                    stmts.extend(_parse_iam_policy_document(values[key]))
            iam_roles.append(IAMRole(id=node_id, name=values.get("name") or name, policies=stmts))

        node = Node(
            id=node_id,
            type=canvas_type,
            tf_type=tf_type,
            label=label,
            config=values,
            security_group_ids=sg_ids,
            iam_role_id=iam_role_id,
        )
        nodes.append(node)
        addr_to_id[address] = node_id

    # ── Build edges from configuration references ────────────────────────────
    edges: list[Edge] = []
    seen_edges: set[frozenset[str]] = set()

    _ref_pattern = re.compile(r'([a-zA-Z][a-zA-Z0-9_]*)\.([a-zA-Z0-9_-]+)')

    for cfg_r in cfg_resources:
        src_addr = cfg_r.get("address", "")
        src_id = addr_to_id.get(src_addr)
        if not src_id:
            continue

        expressions = cfg_r.get("expressions") or {}
        # Flatten all reference lists from all expression values
        all_refs: list[str] = []

        def _collect_refs(obj: Any) -> None:
            if isinstance(obj, dict):
                refs = obj.get("references")
                if isinstance(refs, list):
                    all_refs.extend(refs)
                for v in obj.values():
                    _collect_refs(v)
            elif isinstance(obj, list):
                for item in obj:
                    _collect_refs(item)

        _collect_refs(expressions)

        for ref in all_refs:
            # ref might be "aws_subnet.main" or "aws_subnet.main.id"
            parts = ref.split(".")
            if len(parts) >= 2:
                candidate = f"{parts[0]}.{parts[1]}"
                tgt_id = addr_to_id.get(candidate)
                if tgt_id and tgt_id != src_id:
                    key = frozenset([src_id, tgt_id])
                    if key not in seen_edges:
                        seen_edges.add(key)
                        edges.append(Edge(source=src_id, target=tgt_id))

    return nodes, edges, sgs, iam_roles


# ─── Compliance-specific rules ────────────────────────────────────────────────


def _compliance_findings(nodes: list[Node], edges: list[Edge]) -> list[Finding]:
    """Rules required by compliance standards that aren't covered above."""
    findings: list[Finding] = []

    node_types = {n.type for n in nodes}
    has_cloudtrail = "cloudtrail" in node_types
    has_vpc = "vpc" in node_types

    for n in nodes:
        label = f"{n.label} ({n.tf_type or n.type})"
        cfg = n.config or {}

        # cloudtrail_not_enabled fires ONCE per plan if there are auditable
        # resources (VPC / EC2 / RDS / S3) but no aws_cloudtrail resource.
        if n.type in {"vpc", "ec2", "rds", "s3"} and not has_cloudtrail:
            if not any(f.rule_id == "cloudtrail_not_enabled" for f in findings):
                findings.append(Finding(
                    id=f"cloudtrail_not_enabled::{n.id}",
                    rule_id="cloudtrail_not_enabled", node_id=n.id,
                    node_type=n.type, node_label=label, level="warning",
                    title="CloudTrail not enabled",
                    message=(
                        "No AWS CloudTrail resource found in this plan. "
                        "Audit logging will not be enabled."
                    ),
                    fix=(
                        "Add an aws_cloudtrail resource with multi_region_trail = true "
                        "and enable_log_file_validation = true."
                    ),
                ))

        # VPC flow logs disabled
        if n.type == "vpc":
            has_flow_log = any(m.type == "flow_log" for m in nodes)
            if not has_flow_log:
                findings.append(Finding(
                    id=f"vpc_flow_logs_disabled::{n.id}",
                    rule_id="vpc_flow_logs_disabled", node_id=n.id,
                    node_type=n.type, node_label=label, level="warning",
                    title="VPC flow logs disabled",
                    message=(
                        "No VPC flow log resource found. "
                        "Network traffic to and from this VPC is not being logged."
                    ),
                    fix=(
                        'Add an aws_flow_log resource with vpc_id referencing '
                        'this VPC and traffic_type = "ALL".'
                    ),
                ))

        # No KMS CMK on data stores
        if n.type in {"rds", "s3", "ebs"}:
            kms = cfg.get("kms_key_id") or cfg.get("kms_master_key_id")
            if not kms:
                findings.append(Finding(
                    id=f"kms_no_cmk::{n.id}",
                    rule_id="kms_no_cmk", node_id=n.id,
                    node_type=n.type, node_label=label, level="warning",
                    title="No customer-managed KMS key",
                    message=(
                        f"No customer-managed KMS key configured on this "
                        f"{n.type.upper()} resource. PCI DSS and HIPAA require CMKs."
                    ),
                    fix=(
                        "Set kms_key_id to the ARN of an aws_kms_key resource "
                        "with rotation enabled."
                    ),
                ))

        # WAF required on public ALB
        if n.type == "alb":
            internal = cfg.get("internal", False)
            if not internal:
                has_waf = any(m.type == "waf" for m in nodes)
                if not has_waf:
                    findings.append(Finding(
                        id=f"waf_required_on_public_alb::{n.id}",
                        rule_id="waf_required_on_public_alb", node_id=n.id,
                        node_type=n.type, node_label=label, level="warning",
                        title="WAF required on public ALB",
                        message=(
                            "Public-facing ALB has no WAF WebACL association. "
                            "Application-layer attacks are unmitigated."
                        ),
                        fix=(
                            "Add an aws_wafv2_web_acl_association linking a "
                            "WAF WebACL to this load balancer ARN."
                        ),
                    ))

    return findings


# === Public API ===============================================================


def run_validation(
    nodes: list[Node],
    edges: list[Edge],
    security_groups: list[SecurityGroup],
    iam_roles: list[IAMRole],
) -> list[Finding]:
    """
    Run all validation rules against a graph and return findings.

    Parameters
    ----------
    nodes:           Canvas nodes (from parse_plan_json or the UI graph).
    edges:           Canvas edges.
    security_groups: Security group objects (may be empty).
    iam_roles:       IAM role objects (may be empty).
    """
    from archon_cli.compliance import get_standards_for_rule

    findings: list[Finding] = []
    findings.extend(_config_findings(nodes))
    findings.extend(_topology_findings(nodes, edges))
    findings.extend(_sg_findings(security_groups))
    findings.extend(_iam_findings(iam_roles))
    findings.extend(_compliance_findings(nodes, edges))
    # Azure rules
    findings.extend(_azure_config_findings(nodes))
    findings.extend(_azure_topology_findings(nodes, edges))
    findings.extend(_azure_nsg_findings(security_groups))

    # Attach compliance standards to each finding
    for f in findings:
        f.standards = get_standards_for_rule(f.rule_id)

    # Sort: critical > warning > info
    _order = {"critical": 0, "warning": 1, "info": 2}
    findings.sort(key=lambda f: _order.get(f.level, 9))

    return findings


def validate_plan_json(plan: dict) -> list[Finding]:
    """
    Parse a TF plan JSON dict and return all validation findings.

    This is the main entry point used by the CLI validate command.
    """
    nodes, edges, sgs, iam_roles = parse_plan_json(plan)
    return run_validation(nodes, edges, sgs, iam_roles)


# ─── Azure config findings ─────────────────────────────────────────────────────

def _azure_config_findings(nodes: list[Node]) -> list[Finding]:
    findings: list[Finding] = []
    for n in nodes:
        t = n.type
        cfg = n.config or {}

        # VM: password auth enabled
        if t == "azure_vm" and cfg.get("disable_password_authentication") is False:
            findings.append(Finding(
                id=f"azure_vm_password_auth::{n.id}",
                rule_id="azure_vm_password_auth",
                node_id=n.id, node_label=n.label, node_type=t,
                level="warning",
                title="Azure VM: password authentication enabled",
                message=f"{n.label} allows password authentication. Use SSH keys only.",
                fix="Set disable_password_authentication = true.",
            ))

        # VM: boot diagnostics not enabled
        if t == "azure_vm" and not cfg.get("boot_diagnostics_enabled"):
            findings.append(Finding(
                id=f"azure_vm_no_boot_diagnostics::{n.id}",
                rule_id="azure_vm_no_boot_diagnostics",
                node_id=n.id, node_label=n.label, node_type=t,
                level="info",
                title="Azure VM: boot diagnostics not enabled",
                message=f"{n.label} does not have boot diagnostics enabled.",
                fix="Add boot_diagnostics block to the VM resource.",
            ))

        # AKS: RBAC disabled
        if t == "azure_aks" and cfg.get("role_based_access_control_enabled") is False:
            findings.append(Finding(
                id=f"azure_aks_rbac_disabled::{n.id}",
                rule_id="azure_aks_rbac_disabled",
                node_id=n.id, node_label=n.label, node_type=t,
                level="critical",
                title="AKS: RBAC disabled",
                message=f"{n.label} has RBAC disabled. All users have unrestricted cluster access.",
                fix="Set role_based_access_control_enabled = true.",
            ))

        # AKS: no private cluster
        if t == "azure_aks" and not cfg.get("private_cluster_enabled"):
            findings.append(Finding(
                id=f"azure_aks_no_private_cluster::{n.id}",
                rule_id="azure_aks_no_private_cluster",
                node_id=n.id, node_label=n.label, node_type=t,
                level="warning",
                title="AKS: API server not private",
                message=f"{n.label} has a public-facing API server endpoint.",
                fix="Set private_cluster_enabled = true.",
            ))

        # AKS: no authorized IP ranges
        if (t == "azure_aks"
                and not cfg.get("private_cluster_enabled")
                and not cfg.get("api_server_authorized_ip_ranges")):
            findings.append(Finding(
                id=f"azure_aks_no_authorized_ips::{n.id}",
                rule_id="azure_aks_no_authorized_ips",
                node_id=n.id, node_label=n.label, node_type=t,
                level="warning",
                title="AKS: no authorized IP ranges on API server",
                message=f"{n.label} API server is open to all IPs with no restriction.",
                fix="Set api_server_authorized_ip_ranges or enable private cluster.",
            ))

        # AKS: no network policy
        if t == "azure_aks" and not cfg.get("network_policy"):
            findings.append(Finding(
                id=f"azure_aks_no_network_policy::{n.id}",
                rule_id="azure_aks_no_network_policy",
                node_id=n.id, node_label=n.label, node_type=t,
                level="warning",
                title="AKS: no network policy configured",
                message=f"{n.label} has no network policy. All pods can communicate freely.",
                fix="Set network_policy = 'azure' or 'calico' in network_profile.",
            ))

        # Azure SQL: TDE disabled
        if t == "azure_sql" and cfg.get("transparent_data_encryption_enabled") is False:
            findings.append(Finding(
                id=f"azure_sql_tde_disabled::{n.id}",
                rule_id="azure_sql_tde_disabled",
                node_id=n.id, node_label=n.label, node_type=t,
                level="critical",
                title="Azure SQL: Transparent Data Encryption disabled",
                message=f"{n.label} has Transparent Data Encryption disabled.",
                fix="Set transparent_data_encryption_enabled = true on the database.",
            ))

        # Azure SQL: min TLS old
        if t == "azure_sql" and cfg.get("minimum_tls_version") not in (None, "1.2"):
            findings.append(Finding(
                id=f"azure_sql_min_tls_old::{n.id}",
                rule_id="azure_sql_min_tls_old",
                node_id=n.id, node_label=n.label, node_type=t,
                level="warning",
                title="Azure SQL: minimum TLS version below 1.2",
                message=f"{n.label} accepts TLS versions older than 1.2.",
                fix="Set minimum_tls_version = '1.2' on the SQL server.",
            ))

        # Azure SQL: auditing not enabled
        if t == "azure_sql" and not cfg.get("auditing_enabled"):
            findings.append(Finding(
                id=f"azure_sql_no_auditing::{n.id}",
                rule_id="azure_sql_no_auditing",
                node_id=n.id, node_label=n.label, node_type=t,
                level="warning",
                title="Azure SQL: auditing not enabled",
                message=f"{n.label} does not have auditing enabled.",
                fix="Generate azurerm_mssql_server_extended_auditing_policy.",
            ))

        # Storage: public blob access
        _STORAGE_TYPES = {"azure_blob", "azure_files", "azure_datalake", "azure_table", "azure_queue"}
        if t in _STORAGE_TYPES and cfg.get("allow_nested_items_to_be_public") is True:
            findings.append(Finding(
                id=f"azure_storage_public_access::{n.id}",
                rule_id="azure_storage_public_access",
                node_id=n.id, node_label=n.label, node_type=t,
                level="critical",
                title="Azure Storage: public blob access allowed",
                message=f"{n.label} allows public blob/container access.",
                fix="Set allow_nested_items_to_be_public = false.",
            ))

        # Storage: HTTPS not enforced
        if t in _STORAGE_TYPES and cfg.get("enable_https_traffic_only") is False:
            findings.append(Finding(
                id=f"azure_storage_https_only::{n.id}",
                rule_id="azure_storage_https_only",
                node_id=n.id, node_label=n.label, node_type=t,
                level="warning",
                title="Azure Storage: HTTPS not enforced",
                message=f"{n.label} allows unencrypted HTTP traffic.",
                fix="Set enable_https_traffic_only = true.",
            ))

        # Storage: min TLS old
        if t in _STORAGE_TYPES and cfg.get("min_tls_version") not in (None, "TLS1_2"):
            findings.append(Finding(
                id=f"azure_storage_min_tls_old::{n.id}",
                rule_id="azure_storage_min_tls_old",
                node_id=n.id, node_label=n.label, node_type=t,
                level="warning",
                title="Azure Storage: minimum TLS below 1.2",
                message=f"{n.label} accepts TLS versions older than 1.2.",
                fix="Set min_tls_version = 'TLS1_2' on the storage account.",
            ))

        # Key Vault: soft delete disabled
        if (t == "azure_keyvault"
                and (cfg.get("soft_delete_retention_days") == 0
                     or cfg.get("soft_delete_enabled") is False)):
            findings.append(Finding(
                id=f"azure_keyvault_soft_delete_disabled::{n.id}",
                rule_id="azure_keyvault_soft_delete_disabled",
                node_id=n.id, node_label=n.label, node_type=t,
                level="critical",
                title="Key Vault: soft delete not enabled",
                message=f"{n.label} does not have soft delete enabled.",
                fix="Set soft_delete_retention_days >= 7.",
            ))

        # Key Vault: purge protection disabled
        if t == "azure_keyvault" and cfg.get("purge_protection_enabled") is False:
            findings.append(Finding(
                id=f"azure_keyvault_purge_protection_disabled::{n.id}",
                rule_id="azure_keyvault_purge_protection_disabled",
                node_id=n.id, node_label=n.label, node_type=t,
                level="critical",
                title="Key Vault: purge protection not enabled",
                message=f"{n.label} does not have purge protection enabled.",
                fix="Set purge_protection_enabled = true.",
            ))

        # Functions: HTTPS not enforced
        if t == "azure_functions" and cfg.get("https_only") is False:
            findings.append(Finding(
                id=f"azure_functions_https_only::{n.id}",
                rule_id="azure_functions_https_only",
                node_id=n.id, node_label=n.label, node_type=t,
                level="warning",
                title="Azure Functions: HTTPS not enforced",
                message=f"{n.label} allows unencrypted HTTP traffic.",
                fix="Set https_only = true.",
            ))

        # App Service: HTTPS not enforced
        if t == "azure_app_service" and cfg.get("https_only") is False:
            findings.append(Finding(
                id=f"azure_app_service_https_only::{n.id}",
                rule_id="azure_app_service_https_only",
                node_id=n.id, node_label=n.label, node_type=t,
                level="warning",
                title="App Service: HTTPS not enforced",
                message=f"{n.label} allows unencrypted HTTP traffic.",
                fix="Set https_only = true.",
            ))

        # App Service: min TLS old
        if t == "azure_app_service" and cfg.get("minimum_tls_version") not in (None, "1.2"):
            findings.append(Finding(
                id=f"azure_app_service_min_tls_old::{n.id}",
                rule_id="azure_app_service_min_tls_old",
                node_id=n.id, node_label=n.label, node_type=t,
                level="warning",
                title="App Service: minimum TLS below 1.2",
                message=f"{n.label} accepts TLS versions below 1.2.",
                fix="Set minimum_tls_version = '1.2' in site_config.",
            ))

        # Redis: non-SSL port enabled
        if t == "azure_redis" and cfg.get("enable_non_ssl_port") is True:
            findings.append(Finding(
                id=f"azure_redis_non_ssl_port::{n.id}",
                rule_id="azure_redis_non_ssl_port",
                node_id=n.id, node_label=n.label, node_type=t,
                level="warning",
                title="Azure Redis: non-SSL port enabled",
                message=f"{n.label} has the unencrypted Redis port (6379) enabled.",
                fix="Set enable_non_ssl_port = false.",
            ))

        # Redis: min TLS old
        if t == "azure_redis" and cfg.get("minimum_tls_version") not in (None, "1.2"):
            findings.append(Finding(
                id=f"azure_redis_min_tls_old::{n.id}",
                rule_id="azure_redis_min_tls_old",
                node_id=n.id, node_label=n.label, node_type=t,
                level="warning",
                title="Azure Redis: minimum TLS below 1.2",
                message=f"{n.label} accepts TLS versions below 1.2.",
                fix="Set minimum_tls_version = '1.2'.",
            ))

        # PostgreSQL: SSL disabled
        if t == "azure_postgres" and cfg.get("ssl_enforcement_enabled") is False:
            findings.append(Finding(
                id=f"azure_postgres_ssl_disabled::{n.id}",
                rule_id="azure_postgres_ssl_disabled",
                node_id=n.id, node_label=n.label, node_type=t,
                level="critical",
                title="Azure PostgreSQL: SSL not enforced",
                message=f"{n.label} does not enforce SSL connections.",
                fix="Set ssl_enforcement_enabled = true.",
            ))

        # MySQL: SSL disabled
        if t == "azure_mysql" and cfg.get("ssl_enforcement_enabled") is False:
            findings.append(Finding(
                id=f"azure_mysql_ssl_disabled::{n.id}",
                rule_id="azure_mysql_ssl_disabled",
                node_id=n.id, node_label=n.label, node_type=t,
                level="critical",
                title="Azure MySQL: SSL not enforced",
                message=f"{n.label} does not enforce SSL connections.",
                fix="Set require_secure_transport = 'ON'.",
            ))

        # ACR: admin user enabled
        if t == "azure_acr" and cfg.get("admin_enabled") is True:
            findings.append(Finding(
                id=f"azure_acr_admin_enabled::{n.id}",
                rule_id="azure_acr_admin_enabled",
                node_id=n.id, node_label=n.label, node_type=t,
                level="warning",
                title="Container Registry: admin user enabled",
                message=f"{n.label} has the admin user enabled. Use managed identity instead.",
                fix="Set admin_enabled = false and use role assignments.",
            ))

        # App Gateway: WAF not enabled
        if (t == "azure_agw"
                and cfg.get("sku_name")
                and not str(cfg["sku_name"]).startswith("WAF")):
            findings.append(Finding(
                id=f"azure_agw_no_waf::{n.id}",
                rule_id="azure_agw_no_waf",
                node_id=n.id, node_label=n.label, node_type=t,
                level="warning",
                title="Application Gateway: WAF not enabled",
                message=f"{n.label} is not using the WAF_v2 SKU.",
                fix="Set sku_name = 'WAF_v2' and enable WAF configuration.",
            ))

        # CosmosDB: no IP restriction
        if (t == "azure_cosmosdb"
                and not cfg.get("ip_range_filter")
                and not cfg.get("virtual_network_rule")):
            findings.append(Finding(
                id=f"azure_cosmosdb_public_access::{n.id}",
                rule_id="azure_cosmosdb_public_access",
                node_id=n.id, node_label=n.label, node_type=t,
                level="warning",
                title="CosmosDB: no network access restriction",
                message=f"{n.label} is accessible from all networks.",
                fix="Set ip_range_filter or virtual_network_rule.",
            ))

        # VPN Gateway: Basic SKU
        if t == "azure_vpn_gateway" and cfg.get("sku") == "Basic":
            findings.append(Finding(
                id=f"azure_vpn_gateway_basic_sku::{n.id}",
                rule_id="azure_vpn_gateway_basic_sku",
                node_id=n.id, node_label=n.label, node_type=t,
                level="info",
                title="VPN Gateway: Basic SKU does not support SLAs",
                message=f"{n.label} uses the Basic SKU which lacks SLA and zone-redundancy.",
                fix="Upgrade to VpnGw1 or higher.",
            ))

    return findings


# ─── Azure topology findings ───────────────────────────────────────────────────

def _azure_topology_findings(nodes: list[Node], edges: list[Edge]) -> list[Finding]:
    findings: list[Finding] = []
    node_types = {n.type for n in nodes}

    _DB_TYPES = {"azure_sql", "azure_cosmosdb", "azure_postgres", "azure_mysql",
                 "azure_redis", "azure_servicebus", "azure_eventhub"}
    _COMPUTE_TYPES = {"azure_aks", "azure_vm", "azure_app_service", "azure_functions"}

    for n in nodes:
        t = n.type

        # No Key Vault for DB/messaging architectures
        if t in _DB_TYPES and "azure_keyvault" not in node_types:
            findings.append(Finding(
                id=f"azure_no_keyvault::{n.id}",
                rule_id="azure_no_keyvault",
                node_id=n.id, node_label=n.label, node_type=t,
                level="warning",
                title="No Key Vault in architecture",
                message="Architecture has databases/services but no Key Vault for secrets management.",
                fix="Add azurerm_key_vault with purge_protection_enabled = true.",
            ))

        # No Log Analytics for compute types
        if t in _COMPUTE_TYPES and "azure_log_analytics" not in node_types:
            findings.append(Finding(
                id=f"azure_no_log_analytics::{n.id}",
                rule_id="azure_no_log_analytics",
                node_id=n.id, node_label=n.label, node_type=t,
                level="warning",
                title="No Log Analytics workspace",
                message=f"{n.label} has no Log Analytics workspace for centralized logging.",
                fix="Add azurerm_log_analytics_workspace.",
            ))

        # No Monitor/App Insights
        if t in _COMPUTE_TYPES and not node_types & {"azure_monitor", "azure_app_insights"}:
            findings.append(Finding(
                id=f"azure_no_monitor::{n.id}",
                rule_id="azure_no_monitor",
                node_id=n.id, node_label=n.label, node_type=t,
                level="info",
                title="No Azure Monitor or App Insights",
                message=f"{n.label} has no observability infrastructure.",
                fix="Add azurerm_application_insights or azurerm_monitor_metric_alert.",
            ))

        # No Backup vault
        _STATEFUL_TYPES = {"azure_vm", "azure_sql", "azure_postgres", "azure_mysql"}
        if t in _STATEFUL_TYPES and "azure_backup" not in node_types:
            findings.append(Finding(
                id=f"azure_no_backup::{n.id}",
                rule_id="azure_no_backup",
                node_id=n.id, node_label=n.label, node_type=t,
                level="warning",
                title="No backup vault for stateful resources",
                message=f"{n.label} has no Azure Backup vault configured.",
                fix="Add azurerm_recovery_services_vault.",
            ))

        # AKS without Container Registry
        if t == "azure_aks" and "azure_acr" not in node_types:
            findings.append(Finding(
                id=f"azure_aks_no_acr::{n.id}",
                rule_id="azure_aks_no_acr",
                node_id=n.id, node_label=n.label, node_type=t,
                level="info",
                title="AKS without Container Registry",
                message=f"{n.label} has no Container Registry for storing container images.",
                fix="Add azurerm_container_registry linked to AKS.",
            ))

        # VMs without Bastion
        if t == "azure_vm" and "azure_bastion" not in node_types:
            findings.append(Finding(
                id=f"azure_vm_no_bastion::{n.id}",
                rule_id="azure_vm_no_bastion",
                node_id=n.id, node_label=n.label, node_type=t,
                level="warning",
                title="VMs present without Azure Bastion",
                message=f"{n.label} is accessible without a Bastion host.",
                fix="Add azurerm_bastion_host in a dedicated AzureBastionSubnet.",
            ))

        # VNet without DDoS Protection
        if t == "azure_vnet" and "azure_ddos" not in node_types:
            findings.append(Finding(
                id=f"azure_no_ddos_protection::{n.id}",
                rule_id="azure_no_ddos_protection",
                node_id=n.id, node_label=n.label, node_type=t,
                level="info",
                title="No DDoS Protection Plan",
                message=f"{n.label} has no DDoS Protection Plan attached.",
                fix="Add azurerm_network_ddos_protection_plan.",
            ))

        # VM directly internet-facing (has internet neighbor, no LB/AGW neighbor)
        if t == "azure_vm":
            neighbor_ids = _neighbor_ids(n.id, edges)
            neighbor_map = {x.id: x for x in nodes}
            has_lb_or_agw = any(
                neighbor_map.get(nid, None) and
                neighbor_map[nid].node_type in {"azure_agw", "azure_lb", "azure_frontdoor"}
                for nid in neighbor_ids
            )
            has_internet = any(
                "internet" in (neighbor_map.get(nid, None) and
                               neighbor_map[nid].label or "").lower()
                for nid in neighbor_ids
            )
            if has_internet and not has_lb_or_agw:
                findings.append(Finding(
                    id=f"azure_internet_facing_vm::{n.id}",
                    rule_id="azure_internet_facing_vm",
                    node_id=n.id, node_label=n.label, node_type=t,
                    level="critical",
                    title="VM directly internet-facing",
                    message=f"{n.label} appears to be directly internet-facing without a load balancer.",
                    fix="Place an Application Gateway or Load Balancer in front of the VM.",
                ))

        # SQL without Private Endpoint
        if t == "azure_sql":
            neighbor_ids = _neighbor_ids(n.id, edges)
            neighbor_types = {nodes_map.type for nodes_map in nodes if nodes_map.id in neighbor_ids}
            if "azure_private_endpoint" not in neighbor_types:
                findings.append(Finding(
                    id=f"azure_sql_no_private_endpoint::{n.id}",
                    rule_id="azure_sql_no_private_endpoint",
                    node_id=n.id, node_label=n.label, node_type=t,
                    level="warning",
                    title="Azure SQL: no Private Endpoint",
                    message=f"{n.label} has no Private Endpoint. Database may be publicly accessible.",
                    fix="Add azurerm_private_endpoint with subresource 'sqlServer'.",
                ))

        # Storage without Private Endpoint
        if t in {"azure_blob", "azure_datalake"}:
            neighbor_ids = _neighbor_ids(n.id, edges)
            neighbor_types = {x.type for x in nodes if x.id in neighbor_ids}
            if "azure_private_endpoint" not in neighbor_types:
                findings.append(Finding(
                    id=f"azure_storage_no_private_endpoint::{n.id}",
                    rule_id="azure_storage_no_private_endpoint",
                    node_id=n.id, node_label=n.label, node_type=t,
                    level="info",
                    title="Storage: no Private Endpoint",
                    message=f"{n.label} has no Private Endpoint. Storage is accessible over the internet.",
                    fix="Add azurerm_private_endpoint with subresource 'blob'.",
                ))

        # APIM without WAF
        if t == "azure_apim":
            neighbor_ids = _neighbor_ids(n.id, edges)
            neighbor_types = {x.type for x in nodes if x.id in neighbor_ids}
            if not neighbor_types & {"azure_agw", "azure_waf", "azure_frontdoor"}:
                findings.append(Finding(
                    id=f"azure_apim_no_waf::{n.id}",
                    rule_id="azure_apim_no_waf",
                    node_id=n.id, node_label=n.label, node_type=t,
                    level="warning",
                    title="APIM: no WAF or Application Gateway in front",
                    message=f"{n.label} has no WAF protecting the API gateway.",
                    fix="Place azurerm_application_gateway (WAF_v2) or Azure Front Door in front of APIM.",
                ))

        # AKS without Defender
        if t == "azure_aks" and "azure_defender" not in node_types:
            findings.append(Finding(
                id=f"azure_aks_no_defender::{n.id}",
                rule_id="azure_aks_no_defender",
                node_id=n.id, node_label=n.label, node_type=t,
                level="warning",
                title="AKS: Microsoft Defender for Containers not enabled",
                message=f"{n.label} has no Microsoft Defender for Containers.",
                fix="Add azurerm_security_center_subscription_pricing for Containers.",
            ))

        # Log Analytics without Sentinel
        if t == "azure_log_analytics" and "azure_sentinel" not in node_types:
            findings.append(Finding(
                id=f"azure_no_sentinel::{n.id}",
                rule_id="azure_no_sentinel",
                node_id=n.id, node_label=n.label, node_type=t,
                level="info",
                title="No Microsoft Sentinel (SIEM)",
                message="Log Analytics workspace present but no Sentinel SIEM enabled.",
                fix="Add azurerm_sentinel_log_analytics_workspace_onboarding.",
            ))

    return findings


# ─── Azure NSG findings ────────────────────────────────────────────────────────

def _azure_nsg_findings(security_groups: list) -> list[Finding]:
    findings: list[Finding] = []
    for sg in security_groups:
        inbound = sg.inbound if hasattr(sg, "inbound") else []

        def _port_open(port: int) -> bool:
            return any(
                _rule_matches_port(r, port) and _is_public_cidr(r.source)
                for r in inbound
            )

        # SSH open
        if _port_open(22):
            findings.append(Finding(
                id=f"azure_nsg_ssh_open::{sg.id}",
                rule_id="azure_nsg_ssh_open",
                node_id=sg.id, node_label=sg.name, node_type="nsg",
                level="critical",
                title="NSG: SSH (22) open to internet",
                message=f'NSG "{sg.name}" allows SSH (port 22) from the internet.',
                fix="Restrict SSH to known IP ranges or use Azure Bastion.",
            ))

        # RDP open
        if _port_open(3389):
            findings.append(Finding(
                id=f"azure_nsg_rdp_open::{sg.id}",
                rule_id="azure_nsg_rdp_open",
                node_id=sg.id, node_label=sg.name, node_type="nsg",
                level="critical",
                title="NSG: RDP (3389) open to internet",
                message=f'NSG "{sg.name}" allows RDP (port 3389) from the internet.',
                fix="Restrict RDP to known IP ranges or use Azure Bastion.",
            ))

        # All traffic open
        if _sg_allows_all_from_public(sg):
            findings.append(Finding(
                id=f"azure_nsg_all_traffic_open::{sg.id}",
                rule_id="azure_nsg_all_traffic_open",
                node_id=sg.id, node_label=sg.name, node_type="nsg",
                level="critical",
                title="NSG: all inbound traffic allowed from internet",
                message=f'NSG "{sg.name}" allows all inbound traffic from the internet.',
                fix="Remove the catch-all allow-all inbound rule.",
            ))

        # SQL Server open
        if _port_open(1433):
            findings.append(Finding(
                id=f"azure_nsg_sql_server_open::{sg.id}",
                rule_id="azure_nsg_sql_server_open",
                node_id=sg.id, node_label=sg.name, node_type="nsg",
                level="critical",
                title="NSG: SQL Server (1433) open to internet",
                message=f'NSG "{sg.name}" allows SQL Server (1433) from the internet.',
                fix="Restrict SQL Server port to the application subnet CIDR only.",
            ))

        # PostgreSQL open
        if _port_open(5432):
            findings.append(Finding(
                id=f"azure_nsg_postgres_open::{sg.id}",
                rule_id="azure_nsg_postgres_open",
                node_id=sg.id, node_label=sg.name, node_type="nsg",
                level="critical",
                title="NSG: PostgreSQL (5432) open to internet",
                message=f'NSG "{sg.name}" allows PostgreSQL (5432) from the internet.',
                fix="Restrict PostgreSQL to the app tier subnet only.",
            ))

        # MySQL open
        if _port_open(3306):
            findings.append(Finding(
                id=f"azure_nsg_mysql_open::{sg.id}",
                rule_id="azure_nsg_mysql_open",
                node_id=sg.id, node_label=sg.name, node_type="nsg",
                level="critical",
                title="NSG: MySQL (3306) open to internet",
                message=f'NSG "{sg.name}" allows MySQL (3306) from the internet.',
                fix="Restrict MySQL to the app tier subnet only.",
            ))

        # Redis open
        if _port_open(6380):
            findings.append(Finding(
                id=f"azure_nsg_redis_open::{sg.id}",
                rule_id="azure_nsg_redis_open",
                node_id=sg.id, node_label=sg.name, node_type="nsg",
                level="critical",
                title="NSG: Redis (6380) open to internet",
                message=f'NSG "{sg.name}" allows Redis SSL port (6380) from the internet.',
                fix="Restrict Redis to the app tier subnet only.",
            ))

        # MongoDB open
        if _port_open(27017):
            findings.append(Finding(
                id=f"azure_nsg_mongodb_open::{sg.id}",
                rule_id="azure_nsg_mongodb_open",
                node_id=sg.id, node_label=sg.name, node_type="nsg",
                level="critical",
                title="NSG: MongoDB (27017) open to internet",
                message=f'NSG "{sg.name}" allows MongoDB (27017) from the internet.',
                fix="Restrict MongoDB port to the application subnet.",
            ))

        # Wide port range

        # Wide port range
        if any(_is_wide_range(r) for r in inbound):
            findings.append(Finding(
                id=f"azure_nsg_wide_range_open::{sg.id}",
                rule_id="azure_nsg_wide_range_open",
                node_id=sg.id, node_label=sg.name, node_type="nsg",
                level="warning",
                title="NSG: wide port range open to internet",
                message=f'NSG "{sg.name}" allows a wide port range from the internet.',
                fix="Narrow the port range to only required ports.",
            ))

    return findings
