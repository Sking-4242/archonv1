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
 full validation pipeline against a pre-parsed graph.
    Accepts the same four arguments produced by parse_plan_json().
    """
    nodes, edges, sgs, iam_roles = parse_plan_json(plan)
    return run_validation(nodes, edges, sgs, iam_roles)
 full validation pipeline against a pre-parsed graph.
    Accepts the same four arguments produced by parse_plan_json().
    """
    nodes, edges, sgs, iam_roles = parse_plan_json(plan)
    return run_validation(nodes, edges, sgs, iam_roles)
pology_findings(nodes, edges))
    findings.extend(_sg_findings(security_groups))
    findings.extend(_iam_findings(iam_roles))

    for f in findings:
        f.standards = get_standards_for_rule(f.rule_id)

    severity_order = {"critical": 0, "warning": 1, "info": 2}
    findings.sort(key=lambda f: severity_order.get(f.level, 3))
    return findings


def validate_plan_json(plan: dict) -> list[Finding]:
    """Run the full validation pipeline against a terraform plan JSON dict."""
    nodes, edges, sgs, iam_roles = parse_plan_json(plan)
    return run_validation(nodes, edges, sgs, iam_roles)
 findings.
    Equivalent to calling parse_plan_json() then run_validation().
    """
    nodes, edges, sgs, iam_roles = parse_plan_json(plan)
    return run_validation(nodes, edges, sgs, iam_roles)
