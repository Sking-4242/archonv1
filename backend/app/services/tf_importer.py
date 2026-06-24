"""
Terraform HCL import service.

Accepts the text content of one or more .tf files, parses them with
python-hcl2, maps resource types to Archon component types, infers
relationships from attribute references, extracts security groups and
IAM roles, assigns a grid layout, and returns a Graph JSON dict ready
for loadState on the frontend.

Unknown resource types are rendered as generic_tf nodes — nothing is
silently dropped.

Handles:
  - resource {} blocks (regular resources)
  - data {} blocks (data sources, keyed "data.TYPE" in the resource map)
  - locals {} blocks (resolved for label display)
  - module {} blocks (rendered as placeholder Module nodes)
  - count / for_each multiplicity labels
  - ${data.TYPE.NAME.attr} reference patterns (proper edge inference)
"""
from __future__ import annotations

import io
import re
import uuid
from collections import defaultdict
from typing import Any

import hcl2

from app.services.tf_import_catalog import (
    ImportReport,
    KNOWN_REGISTRY_MODULES,
    METADATA_DATA_SOURCE_TYPES,
    SELECTION_DATA_SOURCE_TYPES,
    find_module_file_indices,
    get_archon_type_display,
    is_companion_type,
    merge_companion_config,
    merge_data_source_config,
    normalize_module_path,
    normalize_registry_source,
    resolve_companion_parent,
    resource_references_data,
)

# ─── Resource type → (archon_type, category, icon, display_name) ─────────────

_TYPE_MAP: dict[str, tuple[str, str, str, str]] = {
    # Networking
    "aws_vpc":                           ("vpc",               "networking",    "🌐", "VPC"),
    "aws_subnet":                        ("subnet",            "networking",    "🔲", "Subnet"),
    "aws_internet_gateway":              ("internet_gateway",  "networking",    "🌍", "Internet GW"),
    "aws_nat_gateway":                   ("nat_gateway",       "networking",    "🔀", "NAT Gateway"),
    "aws_route_table":                   ("route_table",       "networking",    "🗺️", "Route Table"),
    "aws_route_table_association":       ("route_table",       "networking",    "🗺️", "Route Table Assoc"),
    "aws_eip":                           ("elastic_ip",        "networking",    "📌", "Elastic IP"),
    "aws_cloudfront_distribution":       ("cloudfront",        "networking",    "☁️", "CloudFront"),
    "aws_route53_zone":                  ("route53",           "networking",    "🌏", "Route 53"),
    "aws_route53_record":                ("route53",           "networking",    "🌏", "Route 53 Record"),
    "aws_ec2_transit_gateway":           ("transit_gateway",   "networking",    "🔗", "Transit Gateway"),
    "aws_ec2_transit_gateway_vpc_attachment": ("transit_gateway", "networking", "🔗", "TGW Attachment"),
    "aws_vpn_gateway":                   ("vpn_gateway",       "networking",    "🔒", "VPN Gateway"),
    "aws_customer_gateway":              ("vpn_gateway",       "networking",    "🔒", "Customer GW"),
    "aws_vpn_connection":                ("vpn_gateway",       "networking",    "🔒", "VPN Connection"),
    "aws_dx_connection":                 ("direct_connect",    "networking",    "🔌", "Direct Connect"),
    "aws_dx_gateway":                    ("direct_connect",    "networking",    "🔌", "DX Gateway"),
    "aws_vpc_endpoint":                  ("vpc_endpoint",      "networking",    "🎯", "VPC Endpoint"),
    "aws_globalaccelerator_accelerator": ("global_accelerator","networking",    "⚡", "Global Accelerator"),
    "aws_wafv2_web_acl":                 ("waf",               "networking",    "🔒", "WAF"),
    "aws_waf_web_acl":                   ("waf",               "networking",    "🔒", "WAF (Classic)"),
    "aws_wafregional_web_acl":           ("waf",               "networking",    "🔒", "WAF Regional"),
    "aws_network_acl":                   ("subnet",            "networking",    "🔲", "Network ACL"),
    # Compute
    "aws_instance":                      ("ec2",               "compute",       "🖥️", "EC2"),
    "aws_launch_template":               ("ec2",               "compute",       "🖥️", "Launch Template"),
    "aws_launch_configuration":          ("ec2",               "compute",       "🖥️", "Launch Config"),
    "aws_lambda_function":               ("lambda",            "compute",       "λ",  "Lambda"),
    "aws_lambda_event_source_mapping":   ("lambda",            "compute",       "λ",  "Lambda ESM"),
    "aws_autoscaling_group":             ("auto_scaling_group","compute",       "⚖️", "Auto Scaling"),
    "aws_autoscaling_policy":            ("auto_scaling_group","compute",       "⚖️", "Scaling Policy"),
    "aws_ecs_cluster":                   ("ecs_fargate",       "compute",       "🐳", "ECS Cluster"),
    "aws_ecs_service":                   ("ecs_fargate",       "compute",       "🐳", "ECS Service"),
    "aws_ecs_task_definition":           ("ecs_fargate",       "compute",       "🐳", "ECS Task Def"),
    "aws_eks_cluster":                   ("eks",               "compute",       "☸️", "EKS"),
    "aws_eks_node_group":                ("eks",               "compute",       "☸️", "EKS Node Group"),
    "aws_elastic_beanstalk_environment": ("elastic_beanstalk", "compute",       "🌱", "Elastic Beanstalk"),
    "aws_elastic_beanstalk_application": ("elastic_beanstalk", "compute",       "🌱", "Beanstalk App"),
    "aws_apprunner_service":             ("app_runner",        "compute",       "🏃", "App Runner"),
    "aws_batch_compute_environment":     ("batch",             "compute",       "📦", "Batch Compute"),
    "aws_batch_job_definition":          ("batch",             "compute",       "📦", "Batch Job Def"),
    "aws_batch_job_queue":               ("batch",             "compute",       "📦", "Batch Queue"),
    "aws_ecr_repository":                ("ecr",               "compute",       "🗂️", "ECR"),
    "aws_lightsail_instance":            ("lightsail",         "compute",       "💡", "Lightsail"),
    # Load Balancing
    "aws_lb":                            ("alb",               "load_balancing","⚡", "Load Balancer"),
    "aws_alb":                           ("alb",               "load_balancing","⚡", "ALB"),
    "aws_lb_listener":                   ("alb",               "load_balancing","⚡", "LB Listener"),
    "aws_lb_target_group":               ("alb",               "load_balancing","⚡", "Target Group"),
    "aws_alb_listener":                  ("alb",               "load_balancing","⚡", "ALB Listener"),
    "aws_api_gateway_rest_api":          ("api_gateway",       "load_balancing","🚪", "API Gateway"),
    "aws_apigatewayv2_api":              ("api_gateway",       "load_balancing","🚪", "API Gateway v2"),
    "aws_api_gateway_stage":             ("api_gateway",       "load_balancing","🚪", "API GW Stage"),
    # Storage
    "aws_s3_bucket":                     ("s3",                "storage",       "🪣", "S3"),
    "aws_s3_bucket_policy":              ("s3",                "storage",       "🪣", "S3 Policy"),
    "aws_s3_bucket_versioning":          ("s3",                "storage",       "🪣", "S3 Versioning"),
    "aws_ebs_volume":                    ("ebs",               "storage",       "💾", "EBS"),
    "aws_volume_attachment":             ("ebs",               "storage",       "💾", "EBS Attachment"),
    "aws_efs_file_system":               ("efs",               "storage",       "📁", "EFS"),
    "aws_efs_mount_target":              ("efs",               "storage",       "📁", "EFS Mount"),
    "aws_fsx_lustre_file_system":        ("fsx",               "storage",       "💽", "FSx Lustre"),
    "aws_fsx_windows_file_system":       ("fsx",               "storage",       "💽", "FSx Windows"),
    "aws_fsx_ontap_file_system":         ("fsx",               "storage",       "💽", "FSx ONTAP"),
    "aws_backup_vault":                  ("backup",            "storage",       "🔄", "Backup Vault"),
    "aws_backup_plan":                   ("backup",            "storage",       "🔄", "Backup Plan"),
    "aws_storagegateway_gateway":        ("storage_gateway",   "storage",       "🔗", "Storage GW"),
    # Database
    "aws_db_instance":                   ("rds",               "database",      "🗄️", "RDS"),
    "aws_db_subnet_group":               ("rds",               "database",      "🗄️", "DB Subnet Group"),
    "aws_db_parameter_group":            ("rds",               "database",      "🗄️", "DB Param Group"),
    "aws_rds_cluster":                   ("aurora",            "database",      "🗄️", "Aurora"),
    "aws_rds_cluster_instance":          ("aurora",            "database",      "🗄️", "Aurora Instance"),
    "aws_dynamodb_table":                ("dynamodb",          "database",      "⚡", "DynamoDB"),
    "aws_elasticache_cluster":           ("elasticache",       "database",      "⚡", "ElastiCache"),
    "aws_elasticache_replication_group": ("elasticache",       "database",      "⚡", "ElastiCache RG"),
    "aws_elasticache_subnet_group":      ("elasticache",       "database",      "⚡", "ElastiCache Subnet"),
    "aws_redshift_cluster":              ("redshift",          "database",      "📊", "Redshift"),
    "aws_docdb_cluster":                 ("documentdb",        "database",      "🍃", "DocumentDB"),
    "aws_docdb_cluster_instance":        ("documentdb",        "database",      "🍃", "DocDB Instance"),
    "aws_neptune_cluster":               ("neptune",           "database",      "🔮", "Neptune"),
    "aws_elasticsearch_domain":          ("opensearch",        "database",      "🔍", "OpenSearch"),
    "aws_opensearch_domain":             ("opensearch",        "database",      "🔍", "OpenSearch"),
    "aws_memorydb_cluster":              ("memorydb",          "database",      "🧠", "MemoryDB"),
    # Security
    "aws_security_group":                ("security_group",    "security",      "🛡️", "Security Group"),
    "aws_security_group_rule":           ("security_group",    "security",      "🛡️", "SG Rule"),
    "aws_iam_role":                      ("iam_role",          "security",      "👤", "IAM Role"),
    "aws_iam_policy":                    ("iam_role",          "security",      "👤", "IAM Policy"),
    "aws_iam_role_policy":               ("iam_role",          "security",      "👤", "IAM Role Policy"),
    "aws_iam_role_policy_attachment":    ("iam_role",          "security",      "👤", "IAM Policy Attach"),
    "aws_iam_instance_profile":          ("iam_role",          "security",      "👤", "IAM Instance Profile"),
    "aws_iam_user":                      ("iam_role",          "security",      "👤", "IAM User"),
    "aws_iam_group":                     ("iam_role",          "security",      "👤", "IAM Group"),
    "aws_kms_key":                       ("kms_key",           "security",      "🔑", "KMS Key"),
    "aws_kms_alias":                     ("kms_key",           "security",      "🔑", "KMS Alias"),
    "aws_acm_certificate":               ("acm",               "security",      "📜", "ACM Certificate"),
    "aws_cognito_user_pool":             ("cognito",           "security",      "👥", "Cognito User Pool"),
    "aws_cognito_identity_pool":         ("cognito",           "security",      "👥", "Cognito Identity"),
    "aws_secretsmanager_secret":         ("secrets_manager",   "security",      "🔐", "Secrets Manager"),
    "aws_secretsmanager_secret_version": ("secrets_manager",   "security",      "🔐", "Secret Version"),
    "aws_guardduty_detector":            ("guardduty",         "security",      "🔍", "GuardDuty"),
    "aws_cloudtrail":                    ("cloudtrail",        "security",      "📋", "CloudTrail"),
    "aws_config_configuration_recorder": ("config",            "security",      "⚙️", "AWS Config"),
    "aws_config_rule":                   ("config",            "security",      "⚙️", "Config Rule"),
    "aws_shield_protection":             ("shield",            "security",      "🛡️", "Shield"),
    "aws_macie2_account":                ("macie",             "security",      "🔍", "Macie"),
    # Integration
    "aws_sns_topic":                     ("sns",               "integration",   "📢", "SNS"),
    "aws_sns_topic_subscription":        ("sns",               "integration",   "📢", "SNS Subscription"),
    "aws_ses_domain_identity":           ("ses",               "integration",   "📧", "SES"),
    "aws_sqs_queue":                     ("sqs",               "integration",   "📬", "SQS"),
    "aws_sqs_queue_policy":              ("sqs",               "integration",   "📬", "SQS Policy"),
    "aws_cloudwatch_event_bus":          ("eventbridge",       "integration",   "⚡", "EventBridge Bus"),
    "aws_cloudwatch_event_rule":         ("eventbridge",       "integration",   "⚡", "EventBridge"),
    "aws_cloudwatch_event_target":       ("eventbridge",       "integration",   "⚡", "Event Target"),
    "aws_scheduler_schedule":            ("eventbridge",       "integration",   "⚡", "Scheduler"),
    "aws_sfn_state_machine":             ("step_functions",    "integration",   "🔄", "Step Functions"),
    "aws_kinesis_stream":                ("kinesis",           "integration",   "🌊", "Kinesis"),
    "aws_mq_broker":                     ("amazon_mq",         "integration",   "📨", "Amazon MQ"),
    "aws_appsync_graphql_api":           ("appsync",           "integration",   "🔗", "AppSync"),
    # Analytics
    "aws_glue_job":                      ("glue",              "analytics",     "🔧", "Glue Job"),
    "aws_glue_crawler":                  ("glue",              "analytics",     "🔧", "Glue Crawler"),
    "aws_glue_catalog_database":         ("glue",              "analytics",     "🔧", "Glue Catalog"),
    "aws_athena_workgroup":              ("athena",            "analytics",     "🔍", "Athena"),
    "aws_emr_cluster":                   ("emr",               "analytics",     "📊", "EMR"),
    "aws_quicksight_account_subscription":("quicksight",       "analytics",     "📈", "QuickSight"),
    "aws_lakeformation_resource":        ("lake_formation",    "analytics",     "🏞️", "Lake Formation"),
    "aws_msk_cluster":                   ("msk",               "analytics",     "📨", "MSK (Kafka)"),
    "aws_kinesis_firehose_delivery_stream":("kinesis_firehose","analytics",     "🌊", "Kinesis Firehose"),
    # AI / ML
    "aws_sagemaker_endpoint":            ("sagemaker",         "ai_ml",         "🤖", "SageMaker"),
    "aws_sagemaker_model":               ("sagemaker",         "ai_ml",         "🤖", "SageMaker Model"),
    "aws_sagemaker_domain":              ("sagemaker",         "ai_ml",         "🤖", "SageMaker Domain"),
    "aws_bedrock_model_invocation_logging_configuration": ("bedrock", "ai_ml",  "🧠", "Bedrock"),
    "aws_lex_bot":                       ("lex",               "ai_ml",         "💬", "Lex"),
    "aws_lex_bot_alias":                 ("lex",               "ai_ml",         "💬", "Lex Alias"),
    # Monitoring
    "aws_cloudwatch_log_group":          ("cloudwatch",        "monitoring",    "📊", "CloudWatch Logs"),
    "aws_cloudwatch_metric_alarm":       ("cloudwatch",        "monitoring",    "📊", "CloudWatch Alarm"),
    "aws_cloudwatch_dashboard":          ("cloudwatch",        "monitoring",    "📊", "CloudWatch"),
    "aws_xray_group":                    ("xray",              "monitoring",    "🔭", "X-Ray"),
    "aws_ssm_parameter":                 ("systems_manager",   "monitoring",    "⚙️", "SSM Parameter"),
    "aws_ssm_document":                  ("systems_manager",   "monitoring",    "⚙️", "SSM Document"),
    # DevOps
    "aws_codepipeline":                  ("codepipeline",      "devops",        "🔄", "CodePipeline"),
    "aws_codebuild_project":             ("codebuild",         "devops",        "🔨", "CodeBuild"),
    "aws_codedeploy_app":                ("codedeploy",        "devops",        "🚀", "CodeDeploy"),
    "aws_codedeploy_deployment_group":   ("codedeploy",        "devops",        "🚀", "Deploy Group"),
    "aws_codecommit_repository":         ("codecommit",        "devops",        "📂", "CodeCommit"),
    "aws_cloudformation_stack":          ("cloudformation",    "devops",        "☁️", "CloudFormation"),
    "aws_cloudformation_stack_set":      ("cloudformation",    "devops",        "☁️", "CFN StackSet"),
    # Extended coverage for real-world Terraform imports
    "aws_rds_cluster":                   ("aurora",            "database",      "🗄️", "Aurora Cluster"),
    "aws_rds_global_cluster":            ("aurora",            "database",      "🗄️", "Aurora Global"),
    "aws_redshiftserverless_namespace":  ("redshift",          "database",      "📊", "Redshift Serverless"),
    "aws_redshiftserverless_workgroup":  ("redshift",          "database",      "📊", "Redshift Serverless WG"),
    "aws_ec2_transit_gateway_route_table": ("transit_gateway",   "networking",    "🔗", "TGW Route Table"),
    "aws_ec2_transit_gateway_direct_connect_gateway_attachment": ("direct_connect", "networking", "🔌", "TGW DX Attach"),
    "aws_eks_addon":                     ("eks",               "compute",       "☸️", "EKS Addon"),
    "aws_msk_configuration":           ("msk",               "analytics",     "📨", "MSK Config"),
    "aws_elasticache_global_replication_group": ("elasticache", "database",      "⚡", "ElastiCache Global"),
    "aws_securityhub_account":           ("security_hub",      "security",      "🛡️", "Security Hub"),
    "aws_macie2_classification_job":     ("macie",             "security",      "🔍", "Macie Job"),
    "aws_inspector2_enabler":            ("inspector",         "security",      "🔍", "Inspector"),
    "aws_config_delivery_channel":       ("config",            "security",      "⚙️", "Config Delivery"),
    "aws_kinesis_firehose_delivery_stream": ("kinesis_firehose", "analytics",     "🌊", "Firehose"),
    "aws_athena_database":               ("athena",            "analytics",     "🔍", "Athena Database"),
    "aws_glue_catalog_database":         ("glue",              "analytics",     "🔧", "Glue Database"),
    "aws_ecr_lifecycle_policy":          ("ecr",               "compute",       "🗂️", "ECR Lifecycle"),
    "aws_apigatewayv2_integration":      ("api_gateway",       "load_balancing","🚪", "API GW Integration"),
    "aws_apigatewayv2_stage":            ("api_gateway",       "load_balancing","🚪", "API GW Stage"),
    "aws_backup_selection":              ("backup",            "storage",       "🔄", "Backup Selection"),
    "aws_dx_gateway_association":        ("direct_connect",    "networking",    "🔌", "DX GW Association"),
    "aws_globalaccelerator_listener":    ("global_accelerator","networking",    "⚡", "GA Listener"),
    "aws_globalaccelerator_endpoint_group": ("global_accelerator", "networking", "⚡", "GA Endpoint Group"),
    "aws_neptune_cluster":               ("neptune",           "database",      "🔮", "Neptune Cluster"),
    "aws_neptune_cluster_instance":      ("neptune",           "database",      "🔮", "Neptune Instance"),
    "aws_docdb_subnet_group":            ("documentdb",        "database",      "🍃", "DocDB Subnet Group"),
    "aws_redshift_subnet_group":         ("redshift",          "database",      "📊", "Redshift Subnet Group"),
    "aws_memorydb_subnet_group":         ("memorydb",          "database",      "🧠", "MemoryDB Subnet Group"),
    "aws_cognito_user_pool_client":      ("cognito",           "security",      "👥", "Cognito Client"),
    "aws_cognito_user_pool_domain":      ("cognito",           "security",      "👥", "Cognito Domain"),
    "aws_xray_sampling_rule":            ("xray",              "monitoring",    "🔭", "X-Ray Sampling"),
    "aws_scheduler_schedule":            ("eventbridge",       "integration",   "⚡", "EventBridge Scheduler"),
    "aws_cloudwatch_composite_alarm":    ("cloudwatch",        "monitoring",    "📊", "Composite Alarm"),
    "aws_sagemaker_endpoint_configuration": ("sagemaker",      "ai_ml",         "🤖", "SageMaker Endpoint Config"),
    "aws_bedrock_model_invocation_logging_configuration": ("bedrock", "ai_ml", "🧠", "Bedrock Logging"),
    "aws_elasticache_cluster":           ("elasticache",       "database",      "⚡", "ElastiCache Cluster"),
    "aws_timestreamwrite_database":      ("timestream",        "database",      "⏱️", "Timestream DB"),
    "aws_timestreamwrite_table":         ("timestream",        "database",      "⏱️", "Timestream Table"),
    "aws_opensearch_domain_policy":      ("opensearch",        "database",      "🔍", "OpenSearch Policy"),
    "aws_lakeformation_resource":        ("lakeformation",     "analytics",     "🏞️", "Lake Formation"),
    "aws_apprunner_auto_scaling_configuration_version": ("app_runner", "compute", "🏃", "App Runner Autoscaling"),
    "aws_apprunner_vpc_connector":       ("app_runner",        "compute",       "🏃", "App Runner VPC Connector"),
    "aws_apprunner_connection":          ("app_runner",        "compute",       "🏃", "App Runner Connection"),
    "aws_apprunner_observability_configuration": ("app_runner", "compute",       "🏃", "App Runner Observability"),
    "aws_cloudwatch_log_destination":    ("cloudwatch",        "monitoring",    "📊", "CW Logs Destination"),
    "aws_cloudwatch_query_definition":   ("cloudwatch",        "monitoring",    "📊", "Logs Insights Query"),
    "aws_route53_resolver_endpoint":     ("route53",           "networking",    "🌏", "Route 53 Resolver"),
    "aws_route53_resolver_rule":         ("route53",           "networking",    "🌏", "Route 53 Resolver Rule"),
    "aws_networkfirewall_firewall":      ("network_firewall",  "networking",    "🔥", "Network Firewall"),
    "aws_networkfirewall_firewall_policy": ("network_firewall","networking",    "🔥", "Network Firewall Policy"),
    "aws_networkfirewall_rule_group":    ("network_firewall",  "networking",    "🔥", "Network Firewall Rules"),
}

_TYPE_MAP_KEYS = frozenset(_TYPE_MAP.keys())


def _skip_canvas_node(res_type: str) -> bool:
    """Return True when a resource should not receive its own canvas node."""
    if res_type in _TYPE_MAP_KEYS:
        return False
    if res_type in _SKIP_RESOURCE_TYPES:
        return True
    return is_companion_type(res_type, mapped_types=_TYPE_MAP_KEYS)

# Category display order for layout
_CATEGORY_ORDER = [
    "networking", "compute", "load_balancing", "storage", "database",
    "security", "integration", "analytics", "ai_ml", "monitoring", "devops", "unknown",
]

_MAX_PER_ROW = 5
_H_SPACING   = 240
_V_SPACING   = 160
_CAT_GAP     = 60

# ─── Reference detection ─────────────────────────────────────────────────────

# Matches ${resource_type.resource_name.attr} and ${resource_type.resource_name[…]}
# Negative lookahead skips data./module./local./var. — these are handled separately.
_REF_RE = re.compile(
    r'\$\{(?!data\.|module\.|local\.|var\.)([A-Za-z][A-Za-z0-9_]*)\.([A-Za-z0-9][A-Za-z0-9_-]*)[\.\[]'
)

# Matches ${data.data_type.data_name.attr} — data source references.
# Group 1 = data_type (e.g. "aws_ami"), group 2 = data_name (e.g. "ubuntu")
_DATA_REF_RE = re.compile(
    r'\$\{data\.([A-Za-z][A-Za-z0-9_]*)\.([A-Za-z0-9][A-Za-z0-9_-]*)[\.\[]'
)

# Matches bare references without ${} wrapper — e.g. depends_on entries like
# "aws_instance.web" that python-hcl2 sometimes leaves as plain strings.
_BARE_REF_RE = re.compile(
    r'^([A-Za-z][A-Za-z0-9_]*)\.([A-Za-z0-9][A-Za-z0-9_-]*)$'
)

# Matches ${module.module_name.output} — module output references.
_MODULE_REF_RE = re.compile(
    r'\$\{module\.([A-Za-z][A-Za-z0-9_-]*)[\.\[]'
)


def _collect_refs(value: Any, out: set[tuple[str, str]]) -> None:
    """
    Recursively walk a parsed HCL value and collect (resource_type, resource_name) refs.

    For regular resources: emits ("aws_vpc", "main")
    For data sources:      emits ("data.aws_ami", "ubuntu")
    Skips local./var./module. references (not resolvable to canvas nodes here).
    """
    if isinstance(value, str):
        # Interpolated refs: ${type.name.attr}
        for m in _REF_RE.finditer(value):
            out.add((m.group(1), m.group(2)))
        # Data source refs: ${data.type.name.attr}
        for m in _DATA_REF_RE.finditer(value):
            out.add(("data." + m.group(1), m.group(2)))
        # Bare string refs (e.g. from depends_on lists)
        stripped = value.strip()
        bm = _BARE_REF_RE.match(stripped)
        if bm and not stripped.startswith(("local.", "var.", "module.", "data.")):
            out.add((bm.group(1), bm.group(2)))
    elif isinstance(value, list):
        for item in value:
            _collect_refs(item, out)
    elif isinstance(value, dict):
        for v in value.values():
            _collect_refs(v, out)


def _collect_module_refs(value: Any, out: set[str]) -> None:
    """Collect module block names referenced in HCL values."""
    if isinstance(value, str):
        for m in _MODULE_REF_RE.finditer(value):
            out.add(m.group(1))
        stripped = value.strip()
        if stripped.startswith("module."):
            parts = stripped.split(".")
            if len(parts) >= 2:
                out.add(parts[1])
    elif isinstance(value, list):
        for item in value:
            _collect_module_refs(item, out)
    elif isinstance(value, dict):
        for v in value.values():
            _collect_module_refs(v, out)


def _get_attr(attrs: dict, *keys: str, default=None):
    """Return the first key found in attrs, or default."""
    for k in keys:
        if k in attrs:
            return attrs[k]
    return default


def _unquote_hcl(value: str) -> str:
    """
    Strip spurious surrounding double-quotes from python-hcl2 strings.

    Some parser versions (notably on Python 3.14) emit identifiers and
    literals with embedded quote characters, e.g. '"aws_vpc"' instead of
    'aws_vpc'.  A single strip is sufficient for all observed cases.
    """
    if len(value) >= 2 and value[0] == '"' and value[-1] == '"':
        return value[1:-1]
    return value


def _normalize_parsed_value(value: Any) -> Any:
    """Recursively normalise parsed HCL values for Archon graph storage."""
    if isinstance(value, str):
        return _unquote_hcl(value)
    if isinstance(value, list):
        return [_normalize_parsed_value(item) for item in value]
    if isinstance(value, dict):
        return {
            _unquote_hcl(k) if isinstance(k, str) else k: _normalize_parsed_value(v)
            for k, v in value.items()
            if k != "__is_block__"
        }
    return value


def _str_val(v: Any) -> str:
    """Coerce a parsed HCL attribute to a readable string."""
    if isinstance(v, str):
        v = _unquote_hcl(v)
        # strip ${...} wrapper for display
        return re.sub(r'^\$\{(.+)\}$', r'\1', v)
    if isinstance(v, list) and v:
        return _str_val(v[0])
    if isinstance(v, (int, float, bool)):
        return str(v)
    return ""

# ─── HCL pre-processing ──────────────────────────────────────────────────────

def _preprocess_hcl(content: str) -> str:
    """
    Normalise HCL content so python-hcl2 can parse it.

    python-hcl2 does not support semicolons as attribute separators even
    though they are valid in the HCL2 spec.  This function replaces every
    semicolon that sits outside a string literal or comment with a newline,
    which is equivalent and fully accepted by the parser.
    """
    result: list[str] = []
    in_string        = False
    in_line_comment  = False
    in_block_comment = False
    i = 0
    n = len(content)

    while i < n:
        ch  = content[i]
        nxt = content[i + 1] if i + 1 < n else ""

        if in_block_comment:
            result.append(ch)
            if ch == "*" and nxt == "/":
                result.append(nxt)
                i += 2
                in_block_comment = False
            else:
                i += 1

        elif in_line_comment:
            result.append(ch)
            if ch == "\n":
                in_line_comment = False
            i += 1

        elif in_string:
            result.append(ch)
            if ch == "\\" and i + 1 < n:
                i += 1
                result.append(content[i])
            elif ch == '"':
                in_string = False
            i += 1

        else:
            if ch == "/" and nxt == "*":
                in_block_comment = True
                result.append(ch)
                i += 1
            elif ch == "/" and nxt == "/":
                in_line_comment = True
                result.append(ch)
                i += 1
            elif ch == "#":
                in_line_comment = True
                result.append(ch)
                i += 1
            elif ch == '"':
                in_string = True
                result.append(ch)
                i += 1
            elif ch == ";":
                result.append("\n")
                i += 1
            else:
                result.append(ch)
                i += 1

    return "".join(result)


# ─── HCL parsing ─────────────────────────────────────────────────────────────

def _parse_files(
    file_contents: list[str],
    parse_warnings: list[str] | None = None,
) -> tuple[dict[str, dict[str, dict]], dict[str, Any]]:
    """
    Parse multiple .tf file contents.

    Returns a tuple of (resources, locals_map) where:

    resources  — merged dict keyed by resource type string:
      • Regular resources:  "aws_vpc"          → {name: attrs}
      • Data sources:       "data.aws_ami"     → {name: attrs}
      • Module blocks:      "_module"           → {mod_name: attrs}

    locals_map — flattened locals for display-time substitution:
                 {"env": "prod", "region": "us-east-1", ...}

    Parse errors are appended to parse_warnings (if provided) rather than
    silently swallowed.
    """
    merged: dict[str, dict[str, dict]] = defaultdict(dict)
    locals_map: dict[str, Any] = {}

    for idx, raw_content in enumerate(file_contents):
        content = _preprocess_hcl(raw_content)
        try:
            parsed = hcl2.load(io.StringIO(content))
        except Exception as exc:
            label = f"file {idx + 1}"
            msg   = f"Could not parse {label}: {exc}"
            if len(msg) > 300:
                msg = msg[:300] + "…"
            if parse_warnings is not None:
                parse_warnings.append(msg)
            continue

        # ── Regular resource blocks ───────────────────────────────────────
        for resource_list in parsed.get("resource", []):
            if not isinstance(resource_list, dict):
                continue
            for res_type, instances in resource_list.items():
                res_type = _unquote_hcl(res_type) if isinstance(res_type, str) else res_type
                if not isinstance(instances, dict):
                    continue
                for res_name, attrs in instances.items():
                    res_name = _unquote_hcl(res_name) if isinstance(res_name, str) else res_name
                    key = res_name
                    if key in merged[res_type]:
                        key = f"{res_name}_{uuid.uuid4().hex[:4]}"
                    merged[res_type][key] = (
                        _normalize_parsed_value(attrs) if isinstance(attrs, dict) else {}
                    )

        # ── Data source blocks ────────────────────────────────────────────
        # data "aws_ami" "ubuntu" { ... }
        # Stored as merged["data.aws_ami"]["ubuntu"] = attrs
        for data_list in parsed.get("data", []):
            if not isinstance(data_list, dict):
                continue
            for data_type, instances in data_list.items():
                data_type = _unquote_hcl(data_type) if isinstance(data_type, str) else data_type
                if not isinstance(instances, dict):
                    continue
                prefixed = "data." + data_type
                for data_name, attrs in instances.items():
                    data_name = _unquote_hcl(data_name) if isinstance(data_name, str) else data_name
                    key = data_name
                    if key in merged[prefixed]:
                        key = f"{data_name}_{uuid.uuid4().hex[:4]}"
                    merged[prefixed][key] = (
                        _normalize_parsed_value(attrs) if isinstance(attrs, dict) else {}
                    )

        # ── Locals blocks ─────────────────────────────────────────────────
        for locals_block in parsed.get("locals", []):
            if isinstance(locals_block, dict):
                for local_key, local_val in locals_block.items():
                    key = _unquote_hcl(local_key) if isinstance(local_key, str) else local_key
                    locals_map[key] = _normalize_parsed_value(local_val)

        # ── Module blocks ─────────────────────────────────────────────────
        # module "vpc" { source = "./modules/vpc" ... }
        # Stored as merged["_module"]["vpc"] = attrs
        for module_list in parsed.get("module", []):
            if not isinstance(module_list, dict):
                continue
            for mod_name, attrs in module_list.items():
                mod_name = _unquote_hcl(mod_name) if isinstance(mod_name, str) else mod_name
                key = mod_name
                if key in merged["_module"]:
                    key = f"{mod_name}_{uuid.uuid4().hex[:4]}"
                merged["_module"][key] = (
                    _normalize_parsed_value(attrs) if isinstance(attrs, dict) else {}
                )

    return dict(merged), locals_map

# ─── Security group extraction ────────────────────────────────────────────────

def _extract_security_groups(
    resources: dict[str, dict[str, dict]],
    sg_id_map: dict[tuple[str, str], str],
) -> list[dict]:
    """
    Build the graph.security_groups list from aws_security_group resources.
    Populates sg_id_map: {("aws_security_group", name) -> archon_sg_uuid}
    """
    sgs = []
    for sg_name, attrs in resources.get("aws_security_group", {}).items():
        sg_id = str(uuid.uuid4())
        sg_id_map[("aws_security_group", sg_name)] = sg_id

        inbound  = []
        outbound = []

        for rule_block in _ensure_list(attrs.get("ingress", [])):
            if not isinstance(rule_block, dict):
                continue
            inbound.append({
                "protocol": _str_val(rule_block.get("protocol", "tcp")),
                "port":     rule_block.get("from_port"),
                "source":   _str_val(
                    _get_attr(rule_block, "cidr_blocks", "ipv6_cidr_blocks", default="")
                    if isinstance(rule_block.get("cidr_blocks"), list)
                    else rule_block.get("cidr_blocks", "")
                ),
            })

        for rule_block in _ensure_list(attrs.get("egress", [])):
            if not isinstance(rule_block, dict):
                continue
            outbound.append({
                "protocol": _str_val(rule_block.get("protocol", "-1")),
                "port":     rule_block.get("from_port"),
                "source":   _str_val(
                    rule_block.get("cidr_blocks", "0.0.0.0/0")
                    if isinstance(rule_block.get("cidr_blocks"), list)
                    else rule_block.get("cidr_blocks", "0.0.0.0/0")
                ),
            })

        vpc_ref = _str_val(attrs.get("vpc_id", ""))
        sgs.append({
            "id":          sg_id,
            "name":        _str_val(attrs.get("name", sg_name)),
            "description": _str_val(attrs.get("description", "")),
            "vpc_id":      vpc_ref,
            "inbound":     inbound,
            "outbound":    outbound,
        })

    return sgs


def _ensure_list(v: Any) -> list:
    if isinstance(v, list):
        return v
    if v is None:
        return []
    return [v]

# ─── IAM role extraction ──────────────────────────────────────────────────────

def _extract_iam_roles(
    resources: dict[str, dict[str, dict]],
    iam_id_map: dict[tuple[str, str], str],
) -> list[dict]:
    """
    Build the graph.iam_roles list from aws_iam_role resources.
    Populates iam_id_map: {("aws_iam_role", name) -> archon_role_uuid}
    """
    roles = []
    for role_name, attrs in resources.get("aws_iam_role", {}).items():
        role_id = str(uuid.uuid4())
        iam_id_map[("aws_iam_role", role_name)] = role_id

        roles.append({
            "id":          role_id,
            "name":        _str_val(attrs.get("name", role_name)),
            "description": _str_val(attrs.get("description", "")),
            "policies":    [],
        })

    return roles

# Config keys handled by other mechanisms — not stored in raw config dict.
_CONFIG_SKIP_KEYS = frozenset({
    "depends_on", "lifecycle", "count", "for_each",
    "security_groups", "vpc_security_group_ids", "security_group_ids", "security_group_id",
    "iam_instance_profile", "execution_role_arn", "role",
    "tags",
})

# ─── Component building ───────────────────────────────────────────────────────

def _resolve_sg_ids(
    value: Any,
    sg_id_map: dict[tuple[str, str], str],
) -> list[str]:
    """Return archon SG UUIDs for any aws_security_group refs found in value."""
    refs: set[tuple[str, str]] = set()
    _collect_refs(value, refs)
    result = []
    for ref_type, ref_name in refs:
        if ref_type == "aws_security_group":
            sg_id = sg_id_map.get(("aws_security_group", ref_name))
            if sg_id:
                result.append(sg_id)
    return result


def _resolve_iam_id(
    value: Any,
    iam_id_map: dict[tuple[str, str], str],
) -> str | None:
    refs: set[tuple[str, str]] = set()
    _collect_refs(value, refs)
    for ref_type, ref_name in refs:
        if ref_type in ("aws_iam_role", "aws_iam_instance_profile"):
            iam_id = iam_id_map.get(("aws_iam_role", ref_name))
            if iam_id:
                return iam_id
    return None


# Resource types that are managed by other mechanisms and should not
# create their own canvas nodes.
_SKIP_RESOURCE_TYPES = frozenset({
    # Handled as separate SG/IAM tab entries
    "aws_security_group", "aws_security_group_rule",
    "aws_iam_role", "aws_iam_policy", "aws_iam_role_policy",
    "aws_iam_role_policy_attachment", "aws_iam_instance_profile",
    "aws_iam_user", "aws_iam_group",
    # Pure helper/linking resources — no visual value as standalone nodes
    "aws_route_table_association",
    # S3 bucket sub-resources (config lives on the bucket node)
    "aws_s3_bucket_policy", "aws_s3_bucket_versioning",
    "aws_s3_bucket_server_side_encryption_configuration",
    "aws_s3_bucket_public_access_block",
    "aws_s3_bucket_cors_configuration",
    "aws_s3_bucket_lifecycle_configuration",
    "aws_s3_bucket_notification",
    "aws_s3_bucket_acl",
    "aws_s3_bucket_ownership_controls",
    "aws_s3_bucket_replication_configuration",
    "aws_s3_bucket_logging",
    "aws_s3_bucket_website_configuration",
    "aws_s3_bucket_intelligent_tiering_configuration",
    # Load balancer sub-resources
    "aws_lb_listener", "aws_alb_listener", "aws_lb_target_group",
    "aws_lb_listener_rule", "aws_lb_listener_certificate",
    # ACM / CloudFront companions
    "aws_acm_certificate_validation",
    "aws_cloudfront_origin_access_control",
    "aws_cloudfront_cache_policy",
    "aws_cloudfront_origin_request_policy",
    "aws_cloudfront_response_headers_policy",
    # ECS / autoscaling companions
    "aws_ecs_cluster_capacity_providers",
    "aws_appautoscaling_target", "aws_appautoscaling_policy",
    "aws_autoscaling_policy",
    # Database companions
    "aws_db_subnet_group", "aws_db_parameter_group",
    "aws_elasticache_subnet_group",
    "aws_redshift_subnet_group", "aws_docdb_subnet_group",
    "aws_neptune_subnet_group", "aws_neptune_parameter_group",
    "aws_memorydb_subnet_group",
    # Secrets / SES companions
    "aws_secretsmanager_secret_version",
    "aws_ses_domain_dkim", "aws_ses_configuration_set",
    "aws_ses_event_destination", "aws_ses_identity_policy",
    # Other linking / policy attachments
    "aws_api_gateway_stage", "aws_efs_mount_target",
    "aws_sns_topic_subscription", "aws_sqs_queue_policy",
    "aws_cloudwatch_event_target",
    "aws_volume_attachment", "aws_kms_alias",
    "aws_rds_cluster_instance", "aws_docdb_cluster_instance",
    "aws_lambda_permission",
    "aws_cognito_user_pool_client", "aws_cognito_user_pool_domain",
    "aws_opensearch_domain_policy",
    "aws_wafv2_web_acl_association",
})

# Metadata data sources — used in expressions, not architectural components.
_SKIP_DATA_SOURCE_TYPES = frozenset({
    "aws_caller_identity",
    "aws_region",
    "aws_partition",
    "aws_availability_zones",
    "aws_canonical_user_id",
    "aws_default_tags",
}) | METADATA_DATA_SOURCE_TYPES

_MERGE_DATA_SOURCE_TYPES = METADATA_DATA_SOURCE_TYPES | SELECTION_DATA_SOURCE_TYPES


def _build_components(
    resources: dict[str, dict[str, dict]],
    sg_id_map: dict[tuple[str, str], str],
    iam_id_map: dict[tuple[str, str], str],
    report: ImportReport | None = None,
) -> tuple[list[dict], dict[tuple[str, str], str], list[str]]:
    """
    Build the components list from the merged resource map.
    Handles regular resources, data sources (keyed "data.TYPE"), and
    module placeholders (keyed "_module").

    Returns (components, resource_node_id_map, warnings).
    resource_node_id_map: {(resource_type, resource_name) -> node_id}
    """
    components: list[dict]                        = []
    resource_node_id_map: dict[tuple[str, str], str] = {}
    warnings: list[str]                           = []

    for res_type, instances in resources.items():

        # ── Module placeholder nodes ──────────────────────────────────────
        if res_type == "_module":
            for mod_name, attrs in instances.items():
                node_id = str(uuid.uuid4())
                resource_node_id_map[("_module", mod_name)] = node_id
                source   = _str_val(attrs.get("source", ""))
                registry_hint = attrs.get("_registry_hint") or {}
                aws_type = f"module ({source})" if source else "Terraform Module"
                label    = registry_hint.get("label") or mod_name.replace("_", " ").title()
                mod_config: dict[str, Any] = {
                    k: v for k, v in attrs.items()
                    if k not in _CONFIG_SKIP_KEYS and not k.startswith("_")
                }
                mod_config["_tf_resource_type"] = "_module"
                mod_config["_tf_resource_name"] = mod_name
                mod_config["_tf_description"] = (
                    f"Terraform module: {mod_name}" + (f" (source: {source})" if source else "")
                )
                if registry_hint:
                    mod_config["_registry_module"] = attrs.get("_registry_module")
                    mod_config["_expected_resources"] = registry_hint.get("expected_resources", [])
                    mod_config["_expected_archon_types"] = registry_hint.get("archon_types", [])
                components.append({
                    "id":                node_id,
                    "type":              "terraform_module",
                    "label":             label,
                    "awsType":           aws_type,
                    "cloudType":         None,
                    "icon":              "📦",
                    "category":          "devops",
                    "config": mod_config,
                    "security_group_ids": [],
                    "iam_role_id":       None,
                    "subnet_id":         None,
                    "vpc_id":            None,
                    "position":          {"x": 0, "y": 0},
                    "_res_type":         "_module",
                    "_res_name":         mod_name,
                })
            continue

        # ── Data source nodes ─────────────────────────────────────────────
        if res_type.startswith("data."):
            actual_type = res_type[5:]  # strip "data." prefix
            if actual_type in _SKIP_DATA_SOURCE_TYPES or actual_type in SELECTION_DATA_SOURCE_TYPES:
                if report:
                    tier = "metadata" if actual_type in METADATA_DATA_SOURCE_TYPES else "selection"
                    for data_name in instances:
                        report.add(
                            "data_pending_merge",
                            resource_type=f"data.{actual_type}",
                            resource_name=data_name,
                            reason=(
                                f"{tier.title()} data source — will merge into referencing "
                                "resources (no standalone canvas node)."
                            ),
                        )
                continue
            mapped      = _TYPE_MAP.get(actual_type)
            for data_name, attrs in instances.items():
                node_id = str(uuid.uuid4())
                resource_node_id_map[(res_type, data_name)] = node_id
                label = data_name.replace("_", " ").title()

                if mapped:
                    archon_type, category, icon, display_name = mapped
                    config: dict[str, Any] = {
                        k: v for k, v in attrs.items()
                        if k not in _CONFIG_SKIP_KEYS and not k.startswith("_")
                    }
                    components.append({
                        "id":                node_id,
                        "type":              archon_type,
                        "label":             label,
                        "awsType":           f"data.{display_name}",
                        "cloudType":         None,
                        "icon":              icon,
                        "category":          category,
                        "config":            config,
                        "security_group_ids": [],
                        "iam_role_id":       None,
                        "subnet_id":         None,
                        "vpc_id":            None,
                        "position":          {"x": 0, "y": 0},
                        "_res_type":         res_type,
                        "_res_name":         data_name,
                    })
                else:
                    components.append({
                        "id":                node_id,
                        "type":              "generic_tf",
                        "label":             label,
                        "awsType":           f"data.{actual_type}",
                        "cloudType":         None,
                        "icon":              "🔍",
                        "category":          "unknown",
                        "config": {
                            "_tf_resource_type": res_type,
                            "_tf_resource_name": data_name,
                            "_tf_description":   f"Terraform data source: {actual_type}",
                        },
                        "security_group_ids": [],
                        "iam_role_id":       None,
                        "subnet_id":         None,
                        "vpc_id":            None,
                        "position":          {"x": 0, "y": 0},
                        "_res_type":         res_type,
                        "_res_name":         data_name,
                    })
            continue

        # ── Skip helper/managed resource types ────────────────────────────
        if _skip_canvas_node(res_type):
            if report and is_companion_type(res_type, mapped_types=_TYPE_MAP_KEYS):
                for res_name in instances:
                    report.add(
                        "companion_pending_merge",
                        resource_type=res_type,
                        resource_name=res_name,
                        reason="Companion resource — will merge onto parent config.",
                    )
            continue

        # ── Regular resources ─────────────────────────────────────────────
        mapped = _TYPE_MAP.get(res_type)

        for res_name, attrs in instances.items():
            node_id  = str(uuid.uuid4())
            resource_node_id_map[(res_type, res_name)] = node_id
            _res_key = {"_res_type": res_type, "_res_name": res_name}

            if mapped:
                archon_type, category, icon, display_name = mapped

                config: dict[str, Any] = {
                    k: v for k, v in attrs.items()
                    if k not in _CONFIG_SKIP_KEYS and not k.startswith("_")
                }

                # Type overrides that depend on attribute values
                if res_type in ("aws_lb", "aws_alb"):
                    lt = _str_val(config.get("load_balancer_type", ""))
                    if lt == "network":
                        archon_type  = "nlb"
                        display_name = "NLB"

                # Resolve security group IDs
                sg_ids = []
                for sg_key in ("security_groups", "vpc_security_group_ids",
                               "security_group_ids", "security_group_id"):
                    if sg_key in attrs:
                        sg_ids.extend(_resolve_sg_ids(attrs[sg_key], sg_id_map))
                vpc_config = attrs.get("vpc_config", {})
                if isinstance(vpc_config, list):
                    vpc_config = vpc_config[0] if vpc_config else {}
                if not isinstance(vpc_config, dict):
                    vpc_config = {}
                if "security_group_ids" in vpc_config:
                    sg_ids.extend(_resolve_sg_ids(vpc_config["security_group_ids"], sg_id_map))

                # Resolve IAM role
                iam_id = None
                for iam_key in ("role", "iam_instance_profile", "execution_role_arn"):
                    if iam_key in attrs:
                        iam_id = _resolve_iam_id(attrs[iam_key], iam_id_map)
                        if iam_id:
                            break

                # Label from tags or resource name
                tags = attrs.get("tags", {})
                if isinstance(tags, list):
                    tags = tags[0] if tags else {}
                if not isinstance(tags, dict):
                    tags = {}
                label = _str_val(tags.get("Name", "")) or res_name.replace("_", " ").title()

                # Count / for_each multiplicity label
                count_val    = attrs.get("count")
                for_each_val = attrs.get("for_each")
                if count_val is not None:
                    count_str = _str_val(count_val)
                    if count_str and count_str not in ("1", ""):
                        label = f"{label} ×{count_str}"
                elif for_each_val is not None:
                    label = f"{label} [for_each]"

                components.append({
                    "id":                node_id,
                    "type":              archon_type,
                    "label":             label,
                    "awsType":           display_name,
                    "cloudType":         None,
                    "icon":              icon,
                    "category":          category,
                    "config":            config,
                    "security_group_ids": list(dict.fromkeys(sg_ids)),
                    "iam_role_id":       iam_id,
                    "subnet_id":         None,
                    "vpc_id":            None,
                    "position":          {"x": 0, "y": 0},
                    **_res_key,
                })
                if report:
                    report.add(
                        "mapped",
                        resource_type=res_type,
                        resource_name=res_name,
                        archon_type=archon_type,
                        reason=f"Mapped to Archon type '{archon_type}' ({display_name}).",
                    )
            else:
                # Unknown resource type — render as generic_tf node with full config
                warnings.append(f"Unknown resource type '{res_type}' rendered as generic node")
                tags = attrs.get("tags", {})
                if isinstance(tags, list):
                    tags = tags[0] if tags else {}
                if not isinstance(tags, dict):
                    tags = {}
                label = _str_val(tags.get("Name", "")) or res_name.replace("_", " ").title()

                # Count / for_each multiplicity label
                count_val    = attrs.get("count")
                for_each_val = attrs.get("for_each")
                if count_val is not None:
                    count_str = _str_val(count_val)
                    if count_str and count_str not in ("1", ""):
                        label = f"{label} ×{count_str}"
                elif for_each_val is not None:
                    label = f"{label} [for_each]"

                full_config = {
                    k: v for k, v in attrs.items()
                    if k not in _CONFIG_SKIP_KEYS and not k.startswith("_")
                }
                full_config["_tf_resource_type"] = res_type
                full_config["_tf_resource_name"] = res_name
                full_config["_tf_description"] = f"Terraform resource: {res_type}"

                components.append({
                    "id":                node_id,
                    "type":              "generic_tf",
                    "label":             label,
                    "awsType":           res_type,
                    "cloudType":         None,
                    "icon":              "📦",
                    "category":          "unknown",
                    "config":            full_config,
                    "security_group_ids": [],
                    "iam_role_id":       None,
                    "subnet_id":         None,
                    "vpc_id":            None,
                    "position":          {"x": 0, "y": 0},
                    **_res_key,
                })
                if report:
                    report.add(
                        "generic",
                        resource_type=res_type,
                        resource_name=res_name,
                        archon_type="generic_tf",
                        reason=(
                            "Resource type not in Archon catalog — rendered as generic node "
                            "with full Terraform config preserved."
                        ),
                    )

    return components, resource_node_id_map, warnings

# ─── Edge inference ───────────────────────────────────────────────────────────

# Attributes whose values are pure metadata — never contain useful resource refs.
_EDGE_ATTR_SKIP = frozenset({
    "name", "description", "comment", "display_name", "friendly_name",
    "type", "id", "environment", "lifecycle",
    "cidr_block", "cidr_blocks", "ipv6_cidr_blocks", "prefix_list_ids",
    "availability_zone", "availability_zones", "region",
    "from_port", "to_port", "protocol", "self",
    "ami", "image_id", "instance_type", "key_name", "user_data",
    "runtime", "handler", "package_type", "filename", "s3_key", "s3_bucket",
    "node_type", "instance_class", "engine", "engine_version",
    "master_username", "master_password", "password", "username",
    "access_key", "secret_key", "token",
    "tags", "default_tags",
    "port", "allocated_storage", "max_capacity", "min_capacity",
    "desired_count", "min_size", "max_size",
    "assume_role_policy", "policy", "inline_policy",
    # Data source filter blocks — not resource refs
    "filter", "owners", "most_recent", "values",
})

# Skip these resource types as edge targets (encoded differently on the component)
_SKIP_EDGE_TARGETS = {"aws_security_group", "aws_iam_role", "aws_iam_instance_profile"}


def _build_edges(
    resources: dict[str, dict[str, dict]],
    resource_node_id_map: dict[tuple[str, str], str],
) -> list[dict]:
    edges: list[dict] = []
    seen:  set[frozenset] = set()

    def _add_edge(src_id: str, tgt_id: str | None) -> None:
        if not tgt_id or tgt_id == src_id:
            return
        pair = frozenset([src_id, tgt_id])
        if pair in seen:
            return
        seen.add(pair)
        edges.append({
            "id":              f"e-{uuid.uuid4().hex[:8]}",
            "source":          src_id,
            "target":          tgt_id,
            "type":            "network",
            "bidirectional":   False,
            "suggested_rules": [],
        })

    for res_type, instances in resources.items():
        for res_name, attrs in instances.items():
            # Use the canonical key for the source node
            src_key = (res_type, res_name)
            src_id  = resource_node_id_map.get(src_key)
            if not src_id:
                continue

            # ── Attribute reference scan ──────────────────────────────────
            for attr_name, attr_val in attrs.items():
                if attr_name.startswith("_") or attr_name in _EDGE_ATTR_SKIP:
                    continue
                refs: set[tuple[str, str]] = set()
                _collect_refs(attr_val, refs)
                for ref_type, ref_name in refs:
                    if ref_type in _SKIP_EDGE_TARGETS:
                        continue
                    tgt_id = resource_node_id_map.get((ref_type, ref_name))
                    _add_edge(src_id, tgt_id)

                mod_refs: set[str] = set()
                _collect_module_refs(attr_val, mod_refs)
                for mod_name in mod_refs:
                    tgt_id = resource_node_id_map.get(("_module", mod_name))
                    _add_edge(src_id, tgt_id)

            # ── depends_on edge pass ──────────────────────────────────────
            for dep in _ensure_list(attrs.get("depends_on", [])):
                if not isinstance(dep, str):
                    continue
                parts = dep.strip().split(".")
                if len(parts) >= 2:
                    tgt_id = resource_node_id_map.get((parts[0], parts[1]))
                    _add_edge(src_id, tgt_id)

    return edges


def _infer_sg_edges(
    components: list[dict],
    resources: dict[str, dict[str, dict]],
    existing_pairs: set[frozenset],
) -> list[dict]:
    """
    Derive traffic-flow edges from security-group ingress rules.

    If SG-Y allows ingress from SG-X, and resource A uses SG-X and resource B
    uses SG-Y, we create a directed edge A → B.
    """
    sg_users: dict[str, list[str]] = {}
    for comp in components:
        res_type = comp.get("_res_type")
        res_name = comp.get("_res_name")
        if not res_type or not res_name:
            continue
        attrs   = resources.get(res_type, {}).get(res_name, {})
        comp_id = comp["id"]
        for sg_key in ("security_groups", "vpc_security_group_ids",
                       "security_group_ids", "security_group_id"):
            val = attrs.get(sg_key)
            if val is None:
                continue
            refs: set[tuple[str, str]] = set()
            _collect_refs(val, refs)
            for ref_type, ref_name in refs:
                if ref_type == "aws_security_group":
                    sg_users.setdefault(ref_name, [])
                    if comp_id not in sg_users[ref_name]:
                        sg_users[ref_name].append(comp_id)

    sg_ingress: dict[str, list[str]] = {}
    for sg_name, sg_attrs in resources.get("aws_security_group", {}).items():
        ingress_list = sg_attrs.get("ingress", [])
        if isinstance(ingress_list, dict):
            ingress_list = [ingress_list]
        for rule in ingress_list:
            if isinstance(rule, list):
                rule = rule[0] if rule else {}
            if not isinstance(rule, dict):
                continue
            refs: set[tuple[str, str]] = set()
            _collect_refs(rule.get("security_groups", []), refs)
            for ref_type, ref_name in refs:
                if ref_type == "aws_security_group":
                    sg_ingress.setdefault(sg_name, [])
                    if ref_name not in sg_ingress[sg_name]:
                        sg_ingress[sg_name].append(ref_name)

    edges: list[dict] = []
    for target_sg, source_sgs in sg_ingress.items():
        target_ids = sg_users.get(target_sg, [])
        for source_sg in source_sgs:
            for src_id in sg_users.get(source_sg, []):
                for tgt_id in target_ids:
                    if src_id == tgt_id:
                        continue
                    pair = frozenset([src_id, tgt_id])
                    if pair in existing_pairs:
                        continue
                    existing_pairs.add(pair)
                    edges.append({
                        "id":             f"e-{uuid.uuid4().hex[:8]}",
                        "source":         src_id,
                        "target":         tgt_id,
                        "type":           "network",
                        "bidirectional":  False,
                        "suggested_rules": [],
                    })
    return edges


# ─── Parent assignment ────────────────────────────────────────────────────────

_SUBNET_PLACEMENT_ATTRS = frozenset({
    "subnet_id", "subnets", "vpc_zone_identifier", "vpc_zone_identifiers",
})

_SUBNET_GROUP_TYPES: dict[str, str] = {
    "aws_db_subnet_group":          "subnet_ids",
    "aws_elasticache_subnet_group": "subnet_ids",
    "aws_redshift_subnet_group":    "subnet_ids",
    "aws_dax_subnet_group":         "subnet_ids",
    "aws_neptune_subnet_group":     "subnet_ids",
    "aws_docdb_subnet_group":       "subnet_ids",
}

_SUBNET_GROUP_ATTRS: tuple[str, ...] = (
    "db_subnet_group_name",
    "subnet_group_name",
    "cluster_subnet_group_name",
    "elasticache_subnet_group_name",
)


def _assign_parents(
    components: list[dict],
    resources: dict[str, dict[str, dict]],
    resource_node_id_map: dict[tuple[str, str], str],
) -> list[dict]:
    """
    Assign parentId for 3 nesting levels:
      resource node  →  aws_subnet  →  aws_vpc

    Direct placement:   subnet_id / subnets / vpc_zone_identifier attrs
    Indirect placement: db_subnet_group_name / subnet_group_name resolved
                        through aws_db_subnet_group / aws_elasticache_subnet_group
    """
    _sg_to_vpc: dict[tuple[str, str], str] = {}
    for sg_type, sid_key in _SUBNET_GROUP_TYPES.items():
        for sg_name, sg_attrs in resources.get(sg_type, {}).items():
            refs: set[tuple[str, str]] = set()
            _collect_refs(sg_attrs.get(sid_key, []), refs)
            for ref_type, ref_name in refs:
                if ref_type == "aws_subnet":
                    subnet_attrs = resources.get("aws_subnet", {}).get(ref_name, {})
                    vpc_refs: set[tuple[str, str]] = set()
                    _collect_refs(subnet_attrs.get("vpc_id", ""), vpc_refs)
                    for vpc_type, vpc_name in vpc_refs:
                        if vpc_type == "aws_vpc":
                            vpc_nid = resource_node_id_map.get(("aws_vpc", vpc_name))
                            if vpc_nid:
                                _sg_to_vpc[(sg_type, sg_name)] = vpc_nid
                                break
                    if (sg_type, sg_name) in _sg_to_vpc:
                        break

    for comp in components:
        res_type = comp.get("_res_type")
        res_name = comp.get("_res_name")
        if not res_type or not res_name:
            continue
        # Data sources and modules don't get VPC/subnet placement
        if res_type.startswith("data.") or res_type == "_module":
            continue
        attrs = resources.get(res_type, {}).get(res_name, {})

        if res_type == "aws_subnet":
            refs = set()
            _collect_refs(attrs.get("vpc_id", ""), refs)
            for ref_type, ref_name in refs:
                if ref_type == "aws_vpc":
                    node_id = resource_node_id_map.get(("aws_vpc", ref_name))
                    if node_id:
                        comp["parentId"] = node_id
                        break

        elif res_type != "aws_vpc":
            for attr_key in _SUBNET_PLACEMENT_ATTRS:
                val = attrs.get(attr_key)
                if val is None:
                    continue
                refs = set()
                _collect_refs(val, refs)
                for ref_type, ref_name in refs:
                    if ref_type == "aws_subnet":
                        node_id = resource_node_id_map.get(("aws_subnet", ref_name))
                        if node_id:
                            comp["parentId"] = node_id
                            break
                if "parentId" in comp:
                    break

            if "parentId" not in comp:
                for attr_key in _SUBNET_GROUP_ATTRS:
                    val = attrs.get(attr_key)
                    if val is None:
                        continue
                    refs = set()
                    _collect_refs(val, refs)
                    for ref_type, ref_name in refs:
                        vpc_nid = _sg_to_vpc.get((ref_type, ref_name))
                        if vpc_nid:
                            comp["parentId"] = vpc_nid
                            break
                    if "parentId" in comp:
                        break

    return components


# ─── Layout ───────────────────────────────────────────────────────────────────

_LEAF_W       = 160
_LEAF_H       = 90
_LEAF_COLS    = 2
_LEAF_GAP_H   = 12
_LEAF_GAP_V   = 12

_SUB_PAD_X    = 16
_SUB_PAD_TOP  = 36
_SUB_PAD_BTM  = 16
_SUB_EMPTY_W  = 240
_SUB_EMPTY_H  = 140

_SUB_GAP_H       = 24
_SUB_GAP_V       = 24
_VPC_PAD_X       = 28
_VPC_PAD_TOP     = 52
_VPC_PAD_BTM     = 24
_VPC_MAX_INNER_W = 1100

_NODE_W        = 160
_NODE_H        = 80
_NODE_GAP_H    = 48
_NODE_GAP_V    = 60
_TOP_WRAP_W    = 1400
_CANVAS_X0     = 80
_CANVAS_Y0     = 80


def _compute_layout(components: list[dict]) -> list[dict]:
    comp_by_id: dict[str, dict] = {c["id"]: c for c in components}

    children_by_parent: dict[str, list[dict]] = defaultdict(list)
    for c in components:
        if "parentId" in c:
            children_by_parent[c["parentId"]].append(c)

    def depth(comp: dict) -> int:
        if "parentId" not in comp:
            return 0
        parent = comp_by_id.get(comp["parentId"], {})
        return 1 if "parentId" not in parent else 2

    # Step 1: size leaf nodes
    for comp in components:
        if depth(comp) == 2:
            comp["style"] = {"width": _LEAF_W, "height": _LEAF_H}

    # Step 2: size depth-1 nodes (subnets or VPC-level resources)
    for comp in components:
        if depth(comp) != 1:
            continue
        if comp.get("type") != "subnet":
            comp["style"] = {"width": _LEAF_W, "height": _LEAF_H}
            continue
        kids = children_by_parent.get(comp["id"], [])
        if not kids:
            comp["style"] = {"width": _SUB_EMPTY_W, "height": _SUB_EMPTY_H}
        else:
            n    = len(kids)
            cols = min(n, _LEAF_COLS)
            rows = (n + cols - 1) // cols
            w    = 2 * _SUB_PAD_X + cols * _LEAF_W + (cols - 1) * _LEAF_GAP_H
            h    = _SUB_PAD_TOP + rows * _LEAF_H + (rows - 1) * _LEAF_GAP_V + _SUB_PAD_BTM
            comp["style"] = {
                "width":  max(w, _SUB_EMPTY_W),
                "height": max(h, _SUB_EMPTY_H),
            }
            for i, kid in enumerate(kids):
                kid["position"] = {
                    "x": _SUB_PAD_X + (i % cols) * (_LEAF_W + _LEAF_GAP_H),
                    "y": _SUB_PAD_TOP + (i // cols) * (_LEAF_H + _LEAF_GAP_V),
                }

    # Step 3: size VPCs
    _VPC_RES_GAP_H = 16
    _VPC_RES_GAP_V = 20
    for comp in components:
        if depth(comp) != 0 or comp.get("type") != "vpc":
            continue
        all_kids  = children_by_parent.get(comp["id"], [])
        sub_kids  = [k for k in all_kids if k.get("type") == "subnet"]
        res_kids  = [k for k in all_kids if k.get("type") != "subnet"]

        if not sub_kids and not res_kids:
            continue

        sx = _VPC_PAD_X
        sy = _VPC_PAD_TOP
        row_h         = 0
        max_row_right = _VPC_PAD_X

        for sub in sub_kids:
            sw = sub["style"]["width"]
            sh = sub["style"]["height"]
            if sx > _VPC_PAD_X and sx + sw > _VPC_PAD_X + _VPC_MAX_INNER_W:
                sy   += row_h + _SUB_GAP_V
                sx    = _VPC_PAD_X
                row_h = 0
            sub["position"] = {"x": sx, "y": sy}
            max_row_right   = max(max_row_right, sx + sw)
            sx   += sw + _SUB_GAP_H
            row_h = max(row_h, sh)

        if res_kids:
            sy   += row_h + _VPC_RES_GAP_V
            row_h = 0
            sx    = _VPC_PAD_X
            for res in res_kids:
                rw = res.get("style", {}).get("width",  _LEAF_W)
                rh = res.get("style", {}).get("height", _LEAF_H)
                if sx > _VPC_PAD_X and sx + rw > _VPC_PAD_X + _VPC_MAX_INNER_W:
                    sy   += row_h + _SUB_GAP_V
                    sx    = _VPC_PAD_X
                    row_h = 0
                res["position"]   = {"x": sx, "y": sy}
                max_row_right     = max(max_row_right, sx + rw)
                sx   += rw + _VPC_RES_GAP_H
                row_h = max(row_h, rh)

        vpc_w = max_row_right + _VPC_PAD_X
        vpc_h = sy + row_h + _VPC_PAD_BTM
        comp["style"] = {
            "width":  max(vpc_w, 400),
            "height": max(vpc_h, 200),
        }

    # Step 4: position top-level nodes
    top_level = [c for c in components if depth(c) == 0]
    groups: dict[str, list[dict]] = defaultdict(list)
    for comp in top_level:
        groups[comp["category"]].append(comp)

    y = _CANVAS_Y0
    for category in _CATEGORY_ORDER:
        items = groups.get(category, [])
        if not items:
            continue

        x     = _CANVAS_X0
        row_h = 0

        for comp in items:
            node_w = comp.get("style", {}).get("width",  _NODE_W)
            node_h = comp.get("style", {}).get("height", _NODE_H)

            if x > _CANVAS_X0 and x + node_w > _CANVAS_X0 + _TOP_WRAP_W:
                y    += row_h + _NODE_GAP_V
                x     = _CANVAS_X0
                row_h = 0

            comp["position"] = {"x": x, "y": y}
            x     += node_w + _NODE_GAP_H
            row_h  = max(row_h, node_h)

        y += row_h + _NODE_GAP_V

    return components


# ─── Module expansion ────────────────────────────────────────────────────────

def _expand_modules(
    resources: dict[str, dict[str, dict]],
    file_contents: list[str],
    filenames: list[str] | None,
    report: ImportReport,
) -> dict[str, dict[str, dict]]:
    """Expand local module sources; annotate registry modules; keep placeholders."""
    modules = dict(resources.get("_module", {}))
    if not modules:
        return resources

    filenames = filenames or []
    remaining_modules: dict[str, dict] = {}

    for mod_name, mod_attrs in modules.items():
        source_raw = _str_val(mod_attrs.get("source", ""))
        registry_key = normalize_registry_source(source_raw)
        local_path = normalize_module_path(source_raw)

        if local_path and filenames:
            indices = find_module_file_indices(local_path, filenames)
            if indices:
                sub_warnings: list[str] = []
                sub_resources, _ = _parse_files(
                    [file_contents[i] for i in indices],
                    sub_warnings,
                )
                for warn in sub_warnings:
                    report.add(
                        "parse_error",
                        resource_type="_module",
                        resource_name=mod_name,
                        reason=warn,
                    )
                merged_count = 0
                for res_type, instances in sub_resources.items():
                    if res_type == "_module":
                        continue
                    for res_name, attrs in instances.items():
                        key = res_name
                        if key in resources.get(res_type, {}):
                            key = f"{mod_name}_{res_name}"
                        resources.setdefault(res_type, {})[key] = attrs
                        merged_count += 1
                report.add(
                    "module_expanded",
                    resource_type="_module",
                    resource_name=mod_name,
                    reason=(
                        f"Expanded local module from '{local_path}' — "
                        f"{merged_count} inner resource(s) added to canvas."
                    ),
                    detail=source_raw,
                )
                continue

        if registry_key and registry_key in KNOWN_REGISTRY_MODULES:
            meta = KNOWN_REGISTRY_MODULES[registry_key]
            remaining_modules[mod_name] = {
                **mod_attrs,
                "_registry_module": registry_key,
                "_registry_hint": meta,
            }
            report.add(
                "module_registry",
                resource_type="_module",
                resource_name=mod_name,
                archon_type="terraform_module",
                reason=(
                    f"Registry module '{registry_key}' not expanded — source not in upload. "
                    f"{meta.get('note', '')}"
                ),
                detail=source_raw,
            )
            continue

        remaining_modules[mod_name] = mod_attrs
        report.add(
            "module_placeholder",
            resource_type="_module",
            resource_name=mod_name,
            archon_type="terraform_module",
            reason=(
                "Module source not included in upload — placeholder node created. "
                "Upload the module directory (e.g. modules/vpc/*.tf) for full expansion."
            ),
            detail=source_raw,
        )

    if remaining_modules:
        resources["_module"] = remaining_modules
    else:
        resources.pop("_module", None)
    return resources


# ─── Companion + data-source merging ─────────────────────────────────────────

def _component_index(components: list[dict]) -> dict[tuple[str, str], dict]:
    return {
        (comp["_res_type"], comp["_res_name"]): comp
        for comp in components
        if comp.get("_res_type") and comp.get("_res_name")
    }


def _merge_companion_resources(
    components: list[dict],
    resources: dict[str, dict[str, dict]],
    resource_node_id_map: dict[tuple[str, str], str],
    report: ImportReport,
) -> None:
    """Merge companion/sub-resource blocks onto parent component configs."""
    index = _component_index(components)
    orphans: list[tuple[str, str, dict]] = []

    for res_type, instances in resources.items():
        if res_type.startswith("data.") or res_type == "_module":
            continue
        if res_type in {
            "aws_security_group", "aws_iam_role", "aws_iam_policy",
            "aws_iam_role_policy", "aws_iam_role_policy_attachment",
            "aws_iam_instance_profile", "aws_iam_user", "aws_iam_group",
        }:
            continue
        if not _skip_canvas_node(res_type):
            continue

        for res_name, attrs in instances.items():
            if not isinstance(attrs, dict):
                continue
            parent = resolve_companion_parent(res_type, res_name, attrs, resources, _collect_refs)
            if parent:
                parent_comp = index.get(parent)
                if parent_comp:
                    merge_companion_config(
                        parent_comp["config"],
                        res_type,
                        res_name,
                        attrs,
                        config_skip_keys=_CONFIG_SKIP_KEYS,
                    )
                    report.add(
                        "companion_merged",
                        resource_type=res_type,
                        resource_name=res_name,
                        parent_type=parent[0],
                        parent_name=parent[1],
                        archon_type=parent_comp.get("type"),
                        reason=(
                            f"Companion merged onto parent {parent[0]}.{parent[1]} "
                            f"(Archon type: {parent_comp.get('type')})."
                        ),
                    )
                    continue
            orphans.append((res_type, res_name, attrs))

    for res_type, res_name, attrs in orphans:
        if _skip_canvas_node(res_type):
            node_id = str(uuid.uuid4())
            resource_node_id_map[(res_type, res_name)] = node_id
            tags = attrs.get("tags", {})
            if isinstance(tags, list):
                tags = tags[0] if tags else {}
            if not isinstance(tags, dict):
                tags = {}
            label = _str_val(tags.get("Name", "")) or res_name.replace("_", " ").title()
            components.append({
                "id":                node_id,
                "type":              "generic_tf",
                "label":             label,
                "awsType":           res_type,
                "cloudType":         None,
                "icon":              "📦",
                "category":          "unknown",
                "config": {
                    k: v for k, v in attrs.items()
                    if k not in _CONFIG_SKIP_KEYS and not k.startswith("_")
                },
                "security_group_ids": [],
                "iam_role_id":       None,
                "subnet_id":         None,
                "vpc_id":            None,
                "position":          {"x": 0, "y": 0},
                "_res_type":         res_type,
                "_res_name":         res_name,
            })
            report.add(
                "companion_orphan",
                resource_type=res_type,
                resource_name=res_name,
                archon_type="generic_tf",
                reason=(
                    "Companion resource could not be linked to a parent — "
                    "rendered as generic node with full config."
                ),
            )


def _merge_data_sources(
    components: list[dict],
    resources: dict[str, dict[str, dict]],
    report: ImportReport,
) -> None:
    """Merge metadata/selection data sources into referencing component configs."""
    index = _component_index(components)

    for res_type, instances in resources.items():
        if not res_type.startswith("data."):
            continue
        data_type = res_type[5:]
        if data_type not in _MERGE_DATA_SOURCE_TYPES:
            continue
        for data_name, attrs in instances.items():
            if not isinstance(attrs, dict):
                continue
            merged_into: list[str] = []
            for (comp_type, comp_name), comp in index.items():
                comp_attrs = resources.get(comp_type, {}).get(comp_name, {})
                if resource_references_data(comp_attrs, data_type, data_name):
                    merge_data_source_config(
                        comp["config"],
                        data_type,
                        data_name,
                        attrs,
                        config_skip_keys=_CONFIG_SKIP_KEYS,
                    )
                    merged_into.append(f"{comp_type}.{comp_name}")

            if merged_into:
                tier = "metadata" if data_type in METADATA_DATA_SOURCE_TYPES else "selection"
                report.add(
                    "data_merged",
                    resource_type=f"data.{data_type}",
                    resource_name=data_name,
                    reason=(
                        f"{tier.title()} data source merged into "
                        f"{len(merged_into)} referencing resource(s): "
                        + ", ".join(merged_into[:5])
                        + ("…" if len(merged_into) > 5 else "")
                    ),
                )
            else:
                report.add(
                    "data_skipped",
                    resource_type=f"data.{data_type}",
                    resource_name=data_name,
                    reason=(
                        "Metadata/selection data source — no canvas node "
                        "(not referenced by any mapped resource)."
                    ),
                )


def _synthesize_registry_modules(
    components: list[dict],
    resources: dict[str, dict[str, dict]],
    resource_node_id_map: dict[tuple[str, str], str],
    report: ImportReport,
) -> list[tuple[str, str]]:
    """
    Create typed skeleton nodes for known registry modules when source is not uploaded.

    Returns list of (module_node_id, synthesized_node_id) pairs for edge wiring.
    """
    modules = resources.get("_module", {})
    if not modules:
        return []

    module_edges: list[tuple[str, str]] = []
    seen_archon: dict[str, set[str]] = defaultdict(set)

    for mod_name, attrs in modules.items():
        if not attrs.get("_registry_module") or not attrs.get("_registry_hint"):
            continue

        mod_node_id = resource_node_id_map.get(("_module", mod_name))
        if not mod_node_id:
            continue

        registry_key = attrs["_registry_module"]
        hint = attrs["_registry_hint"]
        archon_types = hint.get("archon_types") or []

        for archon_type in archon_types:
            if archon_type in seen_archon[mod_name]:
                continue
            seen_archon[mod_name].add(archon_type)

            display = get_archon_type_display(archon_type)
            if not display:
                continue

            _, category, icon, display_name = display
            synth_name = f"{mod_name}_{archon_type}"
            node_id = str(uuid.uuid4())
            synth_key = (f"_synth.{registry_key}", synth_name)
            resource_node_id_map[synth_key] = node_id

            components.append({
                "id":                node_id,
                "type":              archon_type,
                "label":             f"{mod_name} {display_name}",
                "awsType":           f"{display_name} (via {mod_name})",
                "cloudType":         None,
                "icon":              icon,
                "category":          category,
                "config": {
                    "_synthesized": True,
                    "_module": mod_name,
                    "_registry_module": registry_key,
                    "_tf_description": (
                        f"Synthesized from registry module '{registry_key}' — "
                        "upload module source for exact resources."
                    ),
                },
                "security_group_ids": [],
                "iam_role_id":       None,
                "subnet_id":         None,
                "vpc_id":            None,
                "position":          {"x": 0, "y": 0},
                "_res_type":         f"_synth.{registry_key}",
                "_res_name":         synth_name,
            })
            module_edges.append((mod_node_id, node_id))
            report.add(
                "module_synthesized",
                resource_type="_module",
                resource_name=mod_name,
                archon_type=archon_type,
                reason=(
                    f"Synthesized {display_name} skeleton from registry module "
                    f"'{registry_key}'."
                ),
            )

    return module_edges


# ─── Public entry point ──────────────────────────────────────────────────

def import_terraform(
    file_contents: list[str],
    filenames: list[str] | None = None,
) -> dict:
    """
    Parse one or more Terraform file contents and return a dict with:
      - "graph": Graph-compatible dict (components, edges, security_groups,
                 iam_roles, name, region)
      - "report": structured import report (summary + per-resource entries)
      - "warnings": flat warning strings (backward compatible)
    """
    report = ImportReport()
    parse_warnings: list[str] = []
    resources, _locals_map = _parse_files(file_contents, parse_warnings)

    for warn in parse_warnings:
        report.add("parse_error", resource_type="file", reason=warn)

    resources = _expand_modules(resources, file_contents, filenames or [], report)

    # Security groups & IAM (extracted before components so IDs are ready)
    sg_id_map: dict[tuple[str, str], str]  = {}
    iam_id_map: dict[tuple[str, str], str] = {}

    security_groups = _extract_security_groups(resources, sg_id_map)
    iam_roles       = _extract_iam_roles(resources, iam_id_map)

    for sg_name in resources.get("aws_security_group", {}):
        report.add(
            "tab_managed",
            resource_type="aws_security_group",
            resource_name=sg_name,
            reason="Extracted to Security Groups tab — not shown as a canvas node.",
        )
    for role_name in resources.get("aws_iam_role", {}):
        report.add(
            "tab_managed",
            resource_type="aws_iam_role",
            resource_name=role_name,
            reason="Extracted to IAM tab — not shown as a canvas node.",
        )

    # Components
    components, resource_node_id_map, comp_warnings = _build_components(
        resources, sg_id_map, iam_id_map, report
    )

    module_synth_edges = _synthesize_registry_modules(
        components, resources, resource_node_id_map, report
    )

    # Merge companions + data sources onto parent configs
    _merge_companion_resources(components, resources, resource_node_id_map, report)
    _merge_data_sources(components, resources, report)

    # Parent assignment (VPC / subnet nesting)
    components = _assign_parents(components, resources, resource_node_id_map)

    # Edges
    edges = _build_edges(resources, resource_node_id_map)

    seen_pairs: set[frozenset] = {
        frozenset([e["source"], e["target"]]) for e in edges
    }
    for src_id, tgt_id in module_synth_edges:
        pair = frozenset([src_id, tgt_id])
        if pair in seen_pairs:
            continue
        seen_pairs.add(pair)
        edges.append({
            "id":              f"e-{uuid.uuid4().hex[:8]}",
            "source":          src_id,
            "target":          tgt_id,
            "type":            "network",
            "bidirectional":   False,
            "suggested_rules": [],
        })

    existing_pairs: set[frozenset] = seen_pairs
    edges += _infer_sg_edges(components, resources, existing_pairs)

    # Layout
    components = _compute_layout(components)

    # Strip internal keys before returning
    for comp in components:
        comp.pop("_res_type", None)
        comp.pop("_res_name", None)

    # Infer architecture name from filenames
    arch_name = "Imported Architecture"
    if filenames:
        stem = filenames[0].removesuffix(".tf").replace("_", " ").replace("-", " ")
        if stem:
            arch_name = stem.title()

    graph = {
        "id":              str(uuid.uuid4()),
        "name":            arch_name,
        "region":          "us-east-1",
        "provider":        "aws",
        "components":      components,
        "edges":           edges,
        "security_groups": security_groups,
        "iam_roles":       iam_roles,
    }

    return {
        "graph":    graph,
        "report":   report.to_dict(),
        "warnings": report.warnings() + comp_warnings,
    }
