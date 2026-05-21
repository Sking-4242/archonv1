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

# Matches ${resource_type.resource_name.attr}  and  ${resource_type.resource_name[…]}
# Case-insensitive type, names may start with a digit or contain hyphens, and splat
# expressions (name[*] or name[0]) are also captured.
_REF_RE = re.compile(
    r'\$\{([A-Za-z][A-Za-z0-9_]*)\.([A-Za-z0-9][A-Za-z0-9_-]*)[\.\[]'
)

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

# ─── HCL pre-processing ──────────────────────────────────────────────────────

def _preprocess_hcl(content: str) -> str:
    """
    Normalise HCL content so python-hcl2 can parse it.

    python-hcl2 does not support semicolons as attribute separators even
    though they are valid in the HCL2 spec.  This function replaces every
    semicolon that sits outside a string literal or comment with a newline,
    which is equivalent and fully accepted by the parser.

    Context tracked:
      - Double-quoted strings (with escape sequences)
      - Line comments: # ... newline  and  // ... newline
      - Block comments: /* ... */
    """
    result: list[str] = []
    in_string      = False
    in_line_comment  = False
    in_block_comment = False
    i = 0
    n = len(content)

    while i < n:
        ch = content[i]
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
                # Escaped character — pass through verbatim
                i += 1
                result.append(content[i])
            elif ch == '"':
                in_string = False
            i += 1

        else:
            # Normal context — check what we're entering
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
) -> dict[str, dict[str, dict]]:
    """
    Parse multiple .tf file contents and merge all resource blocks into
    {resource_type: {resource_name: attrs}} — ignoring duplicates from
    separate files by suffixing conflicting names.

    Parse errors are appended to parse_warnings (if provided) rather than
    silently swallowed so callers can surface them to the user.
    """
    merged: dict[str, dict[str, dict]] = defaultdict(dict)

    for idx, raw_content in enumerate(file_contents):
        content = _preprocess_hcl(raw_content)
        try:
            parsed = hcl2.load(io.StringIO(content))
        except Exception as exc:
            label = f"file {idx + 1}"
            msg = f"Could not parse {label}: {exc}"
            # Truncate very long parser error messages
            if len(msg) > 300:
                msg = msg[:300] + "…"
            if parse_warnings is not None:
                parse_warnings.append(msg)
            continue

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

# Config keys that are handled by other mechanisms and should not be double-stored
# in the component's raw config dict.
_CONFIG_SKIP_KEYS = frozenset({
    # Terraform meta-arguments — not resource config
    "depends_on", "lifecycle", "count", "for_each",
    # Security groups → stored as security_group_ids on the component
    "security_groups", "vpc_security_group_ids", "security_group_ids", "security_group_id",
    # IAM → stored as iam_role_id on the component
    "iam_instance_profile", "execution_role_arn", "role",
    # Tags → used only for label extraction
    "tags",
})

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

                # ── Full attribute capture ────────────────────────────────
                # Store all HCL attributes verbatim so they round-trip through
                # generation. Keys in _CONFIG_SKIP_KEYS are handled by other
                # mechanisms (SG IDs, IAM role, label from tags, etc.).
                config: dict[str, Any] = {
                    k: v for k, v in attrs.items()
                    if k not in _CONFIG_SKIP_KEYS and not k.startswith("_")
                }

                # ── Type overrides that depend on attribute values ─────────
                if res_type in ("aws_lb", "aws_alb"):
                    lt = _str_val(config.get("load_balancer_type", ""))
                    if lt == "network":
                        archon_type = "nlb"
                        display_name = "NLB"

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
                if not isinstance(tags, dict):
                    tags = {}
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

# Attributes whose values are pure metadata — never contain useful resource refs.
# Everything NOT in this set is scanned for resource references when building edges.
_EDGE_ATTR_SKIP = frozenset({
    # Human-readable strings / scalars
    "name", "description", "comment", "display_name", "friendly_name",
    "type", "id", "environment", "lifecycle",
    # Network primitives
    "cidr_block", "cidr_blocks", "ipv6_cidr_blocks", "prefix_list_ids",
    "availability_zone", "availability_zones", "region",
    "from_port", "to_port", "protocol", "self",
    # Compute image / code config
    "ami", "image_id", "instance_type", "key_name", "user_data",
    "runtime", "handler", "package_type", "filename", "s3_key", "s3_bucket",
    "node_type", "instance_class", "engine", "engine_version",
    # Credentials / secrets (strings, not refs)
    "master_username", "master_password", "password", "username",
    "access_key", "secret_key", "token",
    # Tags block — contains Name=..., Env=... etc., not resource refs
    "tags", "default_tags",
    # Pure numeric / boolean config
    "port", "allocated_storage", "max_capacity", "min_capacity",
    "desired_count", "min_size", "max_size",
    # Embedded policy JSON strings — big blobs, not HCL refs
    "assume_role_policy", "policy", "inline_policy",
})

# Skip these resource types as edge targets (they're already encoded as
# security_group_ids / iam_role_id on components, not visual edges)
_SKIP_EDGE_TARGETS = {"aws_security_group", "aws_iam_role", "aws_iam_instance_profile"}


def _build_edges(
    resources: dict[str, dict[str, dict]],
    resource_node_id_map: dict[tuple[str, str], str],
) -> list[dict]:
    edges: list[dict] = []
    seen: set[frozenset] = set()

    def _add_edge(src_id: str, tgt_id: str) -> None:
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
            src_key = (res_type, res_name)
            src_id = resource_node_id_map.get(src_key)
            if not src_id:
                continue

            # ── Attribute reference scan (blocklist approach) ─────────────
            # Scan every attribute not in the noise blocklist for resource refs.
            # We only create edges when the target is an actual canvas node, so
            # spurious strings simply produce no matches.
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

            # ── depends_on edge pass ──────────────────────────────────────
            # depends_on is a list of strings like "aws_instance.web" — these
            # are explicit architectural dependencies declared by the author.
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
_SUB_PAD_BTM  = 16
_SUB_EMPTY_W  = 240  # default size when subnet has no nested children
_SUB_EMPTY_H  = 140

# VPC containers — subnets are packed in a flowing left-to-right layout
_SUB_GAP_H       = 24   # horizontal gap between sibling subnets
_SUB_GAP_V       = 24   # vertical gap between subnet rows
_VPC_PAD_X       = 28
_VPC_PAD_TOP     = 52   # room for the VPC header
_VPC_PAD_BTM     = 24
_VPC_MAX_INNER_W = 1100 # wrap subnets to next row beyond this inner width

# Top-level grid
_NODE_W        = 160    # default width for plain (non-container) nodes
_NODE_H        = 80     # default height
_NODE_GAP_H    = 48     # horizontal gap between top-level items in the same row
_NODE_GAP_V    = 60     # vertical gap between category rows
_TOP_WRAP_W    = 1400   # wrap threshold for top-level rows
_CANVAS_X0     = 80     # left margin
_CANVAS_Y0     = 80     # top margin


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

    # ── Step 1: size leaf nodes (resources inside subnets) ────────────────
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

    # ── Step 3: size VPCs using flowing-pack subnet placement ─────────────
    # Each subnet is placed at its own width — no forced uniform grid cells.
    # Subnets wrap to a new row when the row exceeds _VPC_MAX_INNER_W.
    for comp in components:
        if depth(comp) != 0:
            continue
        sub_kids = [k for k in children_by_parent.get(comp["id"], []) if depth(k) == 1]
        if not sub_kids:
            continue

        sx = _VPC_PAD_X
        sy = _VPC_PAD_TOP
        row_h   = 0
        max_row_right = _VPC_PAD_X  # track furthest right edge reached

        for sub in sub_kids:
            sw = sub["style"]["width"]
            sh = sub["style"]["height"]

            # Wrap to next row if this subnet would overflow
            if sx > _VPC_PAD_X and sx + sw > _VPC_PAD_X + _VPC_MAX_INNER_W:
                sy   += row_h + _SUB_GAP_V
                sx    = _VPC_PAD_X
                row_h = 0

            sub["position"] = {"x": sx, "y": sy}
            max_row_right   = max(max_row_right, sx + sw)
            sx   += sw + _SUB_GAP_H
            row_h = max(row_h, sh)

        vpc_w = max_row_right + _VPC_PAD_X
        vpc_h = sy + row_h + _VPC_PAD_BTM
        comp["style"] = {
            "width":  max(vpc_w, 400),
            "height": max(vpc_h, 200),
        }

    # ── Step 4: position top-level nodes in a category-ordered flowing grid ─
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

            # Wrap to next row if we'd exceed the wrap threshold
            if x > _CANVAS_X0 and x + node_w > _CANVAS_X0 + _TOP_WRAP_W:
                y    += row_h + _NODE_GAP_V
                x     = _CANVAS_X0
                row_h = 0

            comp["position"] = {"x": x, "y": y}
            x     += node_w + _NODE_GAP_H
            row_h  = max(row_h, node_h)

        y += row_h + _NODE_GAP_V

    return components


# ─── Public entry point ───────────────────────────────────────────────────────

def import_terraform(
    file_contents: list[str],
    filenames: list[str] | None = None,
) -> dict:
    """
    Parse one or more Terraform file contents and return a dict with:
      - "graph": Graph-compatible dict (components, edges, security_groups,
                 iam_roles, name, region)
      - "warnings": list of human-readable warning strings
    """
    parse_warnings: list[str] = []
    resources = _parse_files(file_contents, parse_warnings)

    # ── Security groups & IAM (extracted before components so IDs are ready) ─
    sg_id_map: dict[tuple[str, str], str] = {}
    iam_id_map: dict[tuple[str, str], str] = {}

    security_groups = _extract_security_groups(resources, sg_id_map)
    iam_roles       = _extract_iam_roles(resources, iam_id_map)

    # ── Components ────────────────────────────────────────────────────────────
    components, resource_node_id_map, comp_warnings = _build_components(
        resources, sg_id_map, iam_id_map
    )

    # ── Parent assignment (VPC / subnet nesting) ──────────────────────────────
    components = _assign_parents(components, resources, resource_node_id_map)

    # ── Edges ─────────────────────────────────────────────────────────────────
    edges = _build_edges(resources, resource_node_id_map)

    existing_pairs: set[frozenset] = {
        frozenset([e["source"], e["target"]]) for e in edges
    }
    edges += _infer_sg_edges(components, resources, existing_pairs)

    # ── Layout ────────────────────────────────────────────────────────────────
    components = _compute_layout(components)

    # Strip internal _res_type / _res_name keys before returning
    for comp in components:
        comp.pop("_res_type", None)
        comp.pop("_res_name", None)

    # ── Infer architecture name from filenames ────────────────────────────────
    arch_name = "Imported Architecture"
    if filenames:
        stem = filenames[0].removesuffix(".tf").replace("_", " ").replace("-", " ")
        if stem:
            arch_name = stem.title()

    warnings = parse_warnings + comp_warnings

    graph = {
        "id":              str(uuid.uuid4()),
        "name":            arch_name,
        "region":          "us-east-1",
        "components":      components,
        "edges":           edges,
        "security_groups": security_groups,
        "iam_roles":       iam_roles,
    }

    return {"graph": graph, "warnings": warnings}
