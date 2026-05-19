"""
Terraform HCL import service.

Accepts the text content of one or more .tf files, parses them with
python-hcl2, maps resource types to Archon component types, infers
relationships from attribute references, extracts security groups and
IAM roles, assigns a grid layout, and returns a Graph JSON dict ready
for loadState on the frontend.

Unknown resource types are rendered as generic_tf nodes — nothing is
silently dropped.
"""
from __future__ import annotations

import io
import re
import uuid
from collections import defaultdict
from typing import Any

import hcl2

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
    "aws_kms_key":                       ("kms",               "security",      "🔑", "KMS Key"),
    "aws_kms_alias":                     ("kms",               "security",      "🔑", "KMS Alias"),
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
    "aws_sqs_queue":                     ("sqs",               "integration",   "📬", "SQS"),
    "aws_sqs_queue_policy":              ("sqs",               "integration",   "📬", "SQS Policy"),
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
}

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

_REF_RE = re.compile(r'\$\{([a-z][a-z0-9_]*)\.([a-z][a-z0-9_-]*)\.')

def _collect_refs(value: Any, out: set[tuple[str, str]]) -> None:
    """Recursively walk a parsed HCL value and collect (resource_type, resource_name) refs."""
    if isinstance(value, str):
        for m in _REF_RE.finditer(value):
            out.add((m.group(1), m.group(2)))
    elif isinstance(value, list):
        for item in value:
            _collect_refs(item, out)
    elif isinstance(value, dict):
        for v in value.values():
            _collect_refs(v, out)


def _get_attr(attrs: dict, *keys: str, default=None):
    """Return the first key found in attrs, or default."""
    for k in keys:
        if k in attrs:
            return attrs[k]
    return default


def _str_val(v: Any) -> str:
    """Coerce a parsed HCL attribute to a readable string."""
    if isinstance(v, str):
        # strip ${...} wrapper for display
        return re.sub(r'^\$\{(.+)\}$', r'\1', v)
    if isinstance(v, list) and v:
        return _str_val(v[0])
    if isinstance(v, (int, float, bool)):
        return str(v)
    return ""

# ─── HCL parsing ─────────────────────────────────────────────────────────────

def _parse_files(file_contents: list[str]) -> dict[str, dict[str, dict]]:
    """
    Parse multiple .tf file contents and merge all resource blocks into
    {resource_type: {resource_name: attrs}} — ignoring duplicates from
    separate files by suffixing conflicting names.
    """
    merged: dict[str, dict[str, dict]] = defaultdict(dict)

    for content in file_contents:
        try:
            parsed = hcl2.load(io.StringIO(content))
        except Exception:
            continue  # skip unparseable files

        # hcl2 returns {"resource": [ {type: {name: attrs}}, ... ], ...}
        for resource_list in parsed.get("resource", []):
            if not isinstance(resource_list, dict):
                continue
            for res_type, instances in resource_list.items():
                if not isinstance(instances, dict):
                    continue
                for res_name, attrs in instances.items():
                    key = res_name
                    # Handle name collisions across files
                    if key in merged[res_type]:
                        key = f"{res_name}_{uuid.uuid4().hex[:4]}"
                    merged[res_type][key] = attrs if isinstance(attrs, dict) else {}

    return dict(merged)

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

        inbound = []
        outbound = []

        for rule_block in _ensure_list(attrs.get("ingress", [])):
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
            "policies":    [],   # Inline policies deferred — pulled from aws_iam_role_policy separately
        })

    return roles

# ─── Component building ───────────────────────────────────────────────────────

def _resolve_sg_ids(
    value: Any,
    sg_id_map: dict[tuple[str, str], str],
) -> list[str]:
    """
    Given a parsed HCL attribute value (string or list), return a list of
    archon SG UUIDs for any aws_security_group references found.
    """
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


def _build_components(
    resources: dict[str, dict[str, dict]],
    sg_id_map: dict[tuple[str, str], str],
    iam_id_map: dict[tuple[str, str], str],
) -> tuple[list[dict], dict[tuple[str, str], str], list[str]]:
    """
    Build the components list.
    Returns (components, resource_node_id_map, warnings).
    resource_node_id_map: {(resource_type, resource_name) -> node_id}
    """
    components: list[dict] = []
    resource_node_id_map: dict[tuple[str, str], str] = {}
    warnings: list[str] = []

    for res_type, instances in resources.items():
        # Skip pure helper/linking resources that don't deserve their own node
        if res_type in (
            # Handled as separate SG/IAM tab entries, not canvas nodes
            "aws_security_group", "aws_security_group_rule",
            "aws_iam_role", "aws_iam_policy", "aws_iam_role_policy",
            "aws_iam_role_policy_attachment", "aws_iam_instance_profile",
            "aws_iam_user", "aws_iam_group",
            # Pure helper/linking resources — no visual value as standalone nodes
            "aws_route_table_association",
            "aws_s3_bucket_policy", "aws_s3_bucket_versioning",
            "aws_lb_listener", "aws_alb_listener", "aws_lb_target_group",
            "aws_db_subnet_group", "aws_db_parameter_group",
            "aws_elasticache_subnet_group",
            "aws_api_gateway_stage", "aws_efs_mount_target",
            "aws_sns_topic_subscription", "aws_sqs_queue_policy",
            "aws_cloudwatch_event_target", "aws_autoscaling_policy",
            "aws_volume_attachment", "aws_kms_alias",
            "aws_rds_cluster_instance", "aws_docdb_cluster_instance",
        ):
            continue

        mapped = _TYPE_MAP.get(res_type)

        for res_name, attrs in instances.items():
            node_id = str(uuid.uuid4())
            resource_node_id_map[(res_type, res_name)] = node_id
            _res_key = {"_res_type": res_type, "_res_name": res_name}

            if mapped:
                archon_type, category, icon, display_name = mapped

                # Extract well-known config fields
                config: dict[str, Any] = {}

                if res_type == "aws_instance":
                    if "instance_type" in attrs:
                        config["instance_type"] = _str_val(attrs["instance_type"])
                elif res_type in ("aws_db_instance",):
                    for field in ("instance_class", "engine", "engine_version", "multi_az",
                                  "storage_encrypted", "allocated_storage"):
                        if field in attrs:
                            config[field] = attrs[field]
                elif res_type == "aws_rds_cluster":
                    for field in ("engine", "engine_version", "master_username"):
                        if field in attrs:
                            config[field] = attrs[field]
                elif res_type == "aws_lambda_function":
                    for field in ("runtime", "memory_size", "timeout", "handler"):
                        if field in attrs:
                            config[field] = attrs[field]
                elif res_type in ("aws_elasticache_cluster", "aws_elasticache_replication_group"):
                    for field in ("node_type", "engine", "num_cache_nodes"):
                        if field in attrs:
                            config[field] = attrs[field]
                elif res_type in ("aws_lb", "aws_alb"):
                    if "load_balancer_type" in attrs:
                        lt = _str_val(attrs["load_balancer_type"])
                        archon_type = "nlb" if lt == "network" else "alb"
                        display_name = "NLB" if lt == "network" else "ALB"
                        config["load_balancer_type"] = lt
                elif res_type == "aws_eks_cluster":
                    if "version" in attrs:
                        config["version"] = _str_val(attrs["version"])
                elif res_type in ("aws_ecs_cluster", "aws_ecs_service"):
                    if "launch_type" in attrs:
                        config["launch_type"] = _str_val(attrs["launch_type"])
                elif res_type == "aws_s3_bucket":
                    if "bucket" in attrs:
                        config["bucket_name"] = _str_val(attrs["bucket"])
                elif res_type == "aws_vpc":
                    if "cidr_block" in attrs:
                        config["cidr_block"] = _str_val(attrs["cidr_block"])
                elif res_type == "aws_subnet":
                    for field in ("cidr_block", "availability_zone"):
                        if field in attrs:
                            config[field] = _str_val(attrs[field])

                # Resolve security group IDs
                sg_ids = []
                for sg_key in ("security_groups", "vpc_security_group_ids",
                               "security_group_ids", "security_group_id"):
                    if sg_key in attrs:
                        sg_ids.extend(_resolve_sg_ids(attrs[sg_key], sg_id_map))
                # Lambda vpc_config
                vpc_config = attrs.get("vpc_config", {})
                if isinstance(vpc_config, list):
                    vpc_config = vpc_config[0] if vpc_config else {}
                if "security_group_ids" in vpc_config:
                    sg_ids.extend(_resolve_sg_ids(vpc_config["security_group_ids"], sg_id_map))

                # Resolve IAM role
                iam_id = None
                for iam_key in ("role", "iam_instance_profile", "execution_role_arn"):
                    if iam_key in attrs:
                        iam_id = _resolve_iam_id(attrs[iam_key], iam_id_map)
                        if iam_id:
                            break

                # User-defined label from tags or resource name
                tags = attrs.get("tags", {})
                if isinstance(tags, list):
                    tags = tags[0] if tags else {}
                label = _str_val(tags.get("Name", "")) or res_name.replace("_", " ").title()

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
            else:
                # Unknown resource type — render as generic_tf node
                warnings.append(f"Unknown resource type '{res_type}' rendered as generic node")
                label = res_name.replace("_", " ").title()
                components.append({
                    "id":                node_id,
                    "type":              "generic_tf",
                    "label":             label,
                    "awsType":           res_type,
                    "cloudType":         None,
                    "icon":              "📦",
                    "category":          "unknown",
                    "config":            {
                        "_tf_resource_type": res_type,
                        "_tf_resource_name": res_name,
                        "_tf_description":   f"Terraform resource: {res_type}",
                    },
                    "security_group_ids": [],
                    "iam_role_id":       None,
                    "subnet_id":         None,
                    "vpc_id":            None,
                    "position":          {"x": 0, "y": 0},
                    **_res_key,
                })

    return components, resource_node_id_map, warnings

# ─── Edge inference ───────────────────────────────────────────────────────────

# Attribute names that imply a meaningful architectural relationship
# (exclude pure metadata references like tags, name, etc.)
_EDGE_ATTRS = {
    "subnet_id", "subnet_ids", "subnets", "vpc_id", "security_groups",
    "vpc_security_group_ids", "security_group_ids", "security_group_id",
    "load_balancer_arn", "target_group_arn", "target_group_arns",
    "cluster_id", "cluster_arn", "function_name", "function_arn",
    "source_arn", "destination_arn", "topic_arn", "queue_arn",
    "stream_arn", "firehose_arn", "role", "role_arn",
    "iam_instance_profile", "execution_role_arn",
    "db_subnet_group_name", "cache_subnet_group_name",
    "nat_gateway_id", "internet_gateway_id", "gateway_id",
    "transit_gateway_id", "vpc_endpoint_id",
    "allocation_id", "vpc_zone_identifier", "vpc_zone_identifiers",
}

# Skip these resource types as edge targets (they're already encoded as
# security_group_ids / iam_role_id on components, not visual edges)
_SKIP_EDGE_TARGETS = {"aws_security_group", "aws_iam_role", "aws_iam_instance_profile"}


def _build_edges(
    resources: dict[str, dict[str, dict]],
    resource_node_id_map: dict[tuple[str, str], str],
) -> list[dict]:
    edges: list[dict] = []
    seen: set[frozenset] = set()

    for res_type, instances in resources.items():
        for res_name, attrs in instances.items():
            src_key = (res_type, res_name)
            src_id = resource_node_id_map.get(src_key)
            if not src_id:
                continue

            for attr_name, attr_val in attrs.items():
                if attr_name not in _EDGE_ATTRS:
                    continue
                refs: set[tuple[str, str]] = set()
                _collect_refs(attr_val, refs)
                for ref_type, ref_name in refs:
                    if ref_type in _SKIP_EDGE_TARGETS:
                        continue
                    tgt_key = (ref_type, ref_name)
                    tgt_id = resource_node_id_map.get(tgt_key)
                    if not tgt_id or tgt_id == src_id:
                        continue
                    pair = frozenset([src_id, tgt_id])
                    if pair in seen:
                        continue
                    seen.add(pair)
                    edges.append({
                        "id":            f"e-{uuid.uuid4().hex[:8]}",
                        "source":        src_id,
                        "target":        tgt_id,
                        "type":          "network",
                        "bidirectional": False,
                        "suggested_rules": [],
                    })

    return edges


def _infer_sg_edges(
    components: list[dict],
    resources: dict[str, dict[str, dict]],
    existing_pairs: set[frozenset],
) -> list[dict]:
    """
    Derive traffic-flow edges from security-group ingress rules.

    If SG-Y allows ingress from SG-X, and resource A uses SG-X and resource B
    uses SG-Y, we create a directed edge A → B.  This is how Terraform encodes
    "EC2 can talk to RDS" — via SG rules rather than direct resource refs.
    """
    # Map sg_name → [component_id, ...]
    sg_users: dict[str, list[str]] = {}
    for comp in components:
        res_type = comp.get("_res_type")
        res_name = comp.get("_res_name")
        if not res_type or not res_name:
            continue
        attrs = resources.get(res_type, {}).get(res_name, {})
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

    # Map target_sg_name → [source_sg_name, ...] from ingress rules
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

# Attributes that place a resource inside a subnet (used for 3-level nesting)
_SUBNET_PLACEMENT_ATTRS = frozenset({
    "subnet_id", "subnets", "vpc_zone_identifier", "vpc_zone_identifiers",
})


# Subnet-group resource types and the attribute that holds their subnet IDs
_SUBNET_GROUP_TYPES: dict[str, str] = {
    "aws_db_subnet_group":          "subnet_ids",
    "aws_elasticache_subnet_group": "subnet_ids",
    "aws_redshift_subnet_group":    "subnet_ids",
    "aws_dax_subnet_group":         "subnet_ids",
    "aws_neptune_subnet_group":     "subnet_ids",
    "aws_docdb_subnet_group":       "subnet_ids",
}

# Resource attributes that point to a subnet-group (by name reference)
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

    Direct placement:  subnet_id / subnets / vpc_zone_identifier attrs
    Indirect placement: db_subnet_group_name / subnet_group_name resolved
                        through aws_db_subnet_group / aws_elasticache_subnet_group
    """
    # ── Build subnet-group → first-subnet-node lookup ─────────────────────
    _sg_to_subnet: dict[tuple[str, str], str] = {}
    for sg_type, sid_key in _SUBNET_GROUP_TYPES.items():
        for sg_name, sg_attrs in resources.get(sg_type, {}).items():
            refs: set[tuple[str, str]] = set()
            _collect_refs(sg_attrs.get(sid_key, []), refs)
            for ref_type, ref_name in refs:
                if ref_type == "aws_subnet":
                    nid = resource_node_id_map.get(("aws_subnet", ref_name))
                    if nid:
                        _sg_to_subnet[(sg_type, sg_name)] = nid
                        break  # use first matching subnet per group

    # ── Assign parentIds ──────────────────────────────────────────────────
    for comp in components:
        res_type = comp.get("_res_type")
        res_name = comp.get("_res_name")
        if not res_type or not res_name:
            continue
        attrs = resources.get(res_type, {}).get(res_name, {})

        if res_type == "aws_subnet":
            # Level 1: subnet → VPC
            refs = set()
            _collect_refs(attrs.get("vpc_id", ""), refs)
            for ref_type, ref_name in refs:
                if ref_type == "aws_vpc":
                    node_id = resource_node_id_map.get(("aws_vpc", ref_name))
                    if node_id:
                        comp["parentId"] = node_id
                        break

        elif res_type != "aws_vpc":
            # Level 2a: direct subnet reference
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

            # Level 2b: indirect via subnet group (RDS, ElastiCache, Redshift…)
            if "parentId" not in comp:
                for attr_key in _SUBNET_GROUP_ATTRS:
                    val = attrs.get(attr_key)
                    if val is None:
                        continue
                    refs = set()
                    _collect_refs(val, refs)
                    for ref_type, ref_name in refs:
                        nid = _sg_to_subnet.get((ref_type, ref_name))
                        if nid:
                            comp["parentId"] = nid
                            break
                    if "parentId" in comp:
                        break

    return components


# ─── Layout ───────────────────────────────────────────────────────────────────

# Leaf nodes (resources inside a subnet)
_LEAF_W       = 160
_LEAF_H       = 90
_LEAF_COLS    = 2     # max resource columns inside a subnet
_LEAF_GAP_H   = 12
_LEAF_GAP_V   = 12

# Subnet containers
_SUB_PAD_X    = 16
_SUB_PAD_TOP  = 36   # room for the subnet header
_SUB_PAD_BTM  = 12
_SUB_EMPTY_W  = 240  # default size when subnet has no nested children
_SUB_EMPTY_H  = 140

# VPC containers
_SUB_COLS     = 3    # max subnet columns inside a VPC
_SUB_GAP_H    = 20
_SUB_GAP_V    = 20
_VPC_PAD_X    = 24
_VPC_PAD_TOP  = 48   # room for the VPC header
_VPC_PAD_BTM  = 20

# Top-level grid
_NODE_GAP     = 40   # gap between adjacent top-level nodes


def _compute_layout(components: list[dict]) -> list[dict]:
    comp_by_id: dict[str, dict] = {c["id"]: c for c in components}

    children_by_parent: dict[str, list[dict]] = defaultdict(list)
    for c in components:
        if "parentId" in c:
            children_by_parent[c["parentId"]].append(c)

    def depth(comp: dict) -> int:
        """0 = top-level, 1 = inside VPC, 2 = inside subnet."""
        if "parentId" not in comp:
            return 0
        parent = comp_by_id.get(comp["parentId"], {})
        return 1 if "parentId" not in parent else 2

    # ── Step 1: size + position level-2 leaves (resources inside subnets) ─
    for comp in components:
        if depth(comp) == 2:
            comp["style"] = {"width": _LEAF_W, "height": _LEAF_H}

    # ── Step 2: size subnets and position their leaf children ─────────────
    for comp in components:
        if depth(comp) != 1:
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

    # ── Step 3: size VPCs and position their subnet children ──────────────
    for comp in components:
        if depth(comp) != 0:
            continue
        sub_kids = [k for k in children_by_parent.get(comp["id"], []) if depth(k) == 1]
        if not sub_kids:
            continue
        n          = len(sub_kids)
        cols       = min(n, _SUB_COLS)
        rows       = (n + cols - 1) // cols
        max_sub_w  = max(k["style"]["width"]  for k in sub_kids)
        max_sub_h  = max(k["style"]["height"] for k in sub_kids)
        vpc_w      = 2 * _VPC_PAD_X + cols * max_sub_w + (cols - 1) * _SUB_GAP_H
        vpc_h      = _VPC_PAD_TOP + rows * max_sub_h + (rows - 1) * _SUB_GAP_V + _VPC_PAD_BTM
        comp["style"] = {"width": max(vpc_w, 400), "height": max(vpc_h, 200)}

        for i, sub in enumerate(sub_kids):
            sub["position"] = {
                "x": _VPC_PAD_X + (i % cols) * (max_sub_w + _SUB_GAP_H),
                "y": _VPC_PAD_TOP + (i // cols) * (max_sub_h + _SUB_GAP_V),
            }

    # ── Step 4: position top-level nodes in a left-to-right category flow ─
    top_level = [c for c in components if depth(c) == 0]
    groups: dict[str, list[dict]] = defaultdict(list)
    for comp in top_level:
        groups[comp["category"]].append(comp)

    wrap_x = 80 + _MAX_PER_ROW * _H_SPACING + 200  # column wrap threshold

    y = 80
    for category in _CATEGORY_ORDER:
        items = groups.get(category, [])
        if not items:
            continue

        x = 80
        row_h = 0

        for comp in items:
            node_w = comp.get("style", {}).get("width",  120)
            node_h = comp.get("style", {}).get("height",  80)

            if x > 80 and x + node_w > wrap_x:
                x  = 80
                y += row_h + _CAT_GAP
                row_h = 0

            comp["position"] = {"x": x, "y": y}
            x    += node_w + _NODE_GAP
            row_h = max(row_h, node_h)

        y += row_h + _CAT_GAP

    return components

# ─── Public entry point ───────────────────────────────────────────────────────

def import_terraform(
    file_contents: list[str],
    filenames: list[str] | None = None,
) -> dict:
    """
    Parse one or more .tf file contents and return:
    {
        "graph": { ...Graph JSON... },
        "warnings": ["..."],
    }
    """
    resources = _parse_files(file_contents)

    sg_id_map:  dict[tuple[str, str], str] = {}
    iam_id_map: dict[tuple[str, str], str] = {}

    security_groups = _extract_security_groups(resources, sg_id_map)
    iam_roles       = _extract_iam_roles(resources, iam_id_map)

    components, resource_node_id_map, warnings = _build_components(
        resources, sg_id_map, iam_id_map
    )

    components = _assign_parents(components, resources, resource_node_id_map)
    components = _compute_layout(components)
    edges      = _build_edges(resources, resource_node_id_map)

    # Derive additional edges from security-group ingress rules (e.g. EC2 → RDS)
    _seen_pairs: set[frozenset] = {frozenset([e["source"], e["target"]]) for e in edges}
    edges += _infer_sg_edges(components, resources, _seen_pairs)

    # Remove edges that merely restate a parent-child containment relationship
    _parent_of: dict[str, str] = {
        c["id"]: c["parentId"] for c in components if "parentId" in c
    }
    edges = [
        e for e in edges
        if not (
            _parent_of.get(e["source"]) == e["target"] or
            _parent_of.get(e["target"]) == e["source"]
        )
    ]

    # Strip internal tracking fields before serialising
    for comp in components:
        comp.pop("_res_type", None)
        comp.pop("_res_name", None)

    # Deduplicate warnings
    seen_w: set[str] = set()
    unique_warnings: list[str] = []
    for w in warnings:
        if w not in seen_w:
            seen_w.add(w)
            unique_warnings.append(w)

    graph = {
        "id":              str(uuid.uuid4()),
        "name":            (filenames[0].replace(".tf", "") if filenames else "imported-architecture"),
        "provider":        "aws",
        "region":          "us-east-1",
        "components":      components,
        "security_groups": security_groups,
        "iam_roles":       iam_roles,
        "edges":           edges,
    }

    return {"graph": graph, "warnings": unique_warnings}
