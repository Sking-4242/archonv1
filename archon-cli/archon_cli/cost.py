"""
cost.py — TF plan cost delta calculator for Archon CLI.

Reads a terraform show -json plan, maps each resource change to a monthly
cost estimate, and returns a CostReport with per-resource line items and an
overall delta (added - removed).

Pricing data comes from the bundled pricing_db.json (offline, no API calls).
"""

from __future__ import annotations

import importlib.resources
import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from archon_cli.azure_tf_map import AZURE_TF_TYPE_MAP

# ─── Load bundled pricing DB ──────────────────────────────────────────────────

def _load_pricing_db() -> dict:
    """Load pricing_db.json from the package data directory."""
    # Try importlib.resources first (installed package)
    try:
        ref = importlib.resources.files("archon_cli.data").joinpath("pricing_db.json")
        with ref.open() as fh:
            return json.load(fh)
    except Exception:
        pass
    # Fallback: relative path for development
    here = Path(__file__).parent
    db_path = here / "data" / "pricing_db.json"
    with open(db_path) as fh:
        return json.load(fh)


_DB: dict = _load_pricing_db()
_FREE_TYPES: set[str] = set(_DB.get("free_types", []))
_EC2_HOURLY: dict[str, float] = _DB.get("ec2_hourly", {})
_RDS_HOURLY: dict[str, float] = _DB.get("rds_hourly", {})
_GCE_HOURLY: dict[str, float] = _DB.get("gce_hourly", {})
_CLOUDSQL_HOURLY: dict[str, float] = _DB.get("cloudsql_hourly", {})
_AZURE_VM_HOURLY: dict[str, float] = _DB.get("azure_vm_hourly", {})
_HOURS: int = _DB.get("hours_per_month", 730)
_FLAT: dict[str, dict] = _DB.get("flat_prices", {})

# ─── TF resource type → canvas type (same mapping as validate.py) ─────────────

_TF_TYPE_MAP: dict[str, str] = {
    "aws_vpc": "vpc", "aws_subnet": "subnet",
    "aws_internet_gateway": "internet_gateway", "aws_nat_gateway": "nat_gateway",
    "aws_route_table": "route_table", "aws_route_table_association": "route_table",
    "aws_eip": "elastic_ip", "aws_cloudfront_distribution": "cloudfront",
    "aws_route53_zone": "route53", "aws_route53_record": "route53",
    "aws_ec2_transit_gateway": "transit_gateway",
    "aws_ec2_transit_gateway_vpc_attachment": "transit_gateway",
    "aws_vpn_gateway": "vpn_gateway", "aws_customer_gateway": "vpn_gateway",
    "aws_vpn_connection": "vpn_gateway", "aws_dx_connection": "direct_connect",
    "aws_dx_gateway": "direct_connect", "aws_vpc_endpoint": "vpc_endpoint",
    "aws_globalaccelerator_accelerator": "global_accelerator",
    "aws_wafv2_web_acl": "waf", "aws_waf_web_acl": "waf",
    "aws_wafregional_web_acl": "waf", "aws_network_acl": "subnet",
    "aws_instance": "ec2", "aws_launch_template": "ec2",
    "aws_launch_configuration": "ec2",
    "aws_lambda_function": "lambda", "aws_lambda_event_source_mapping": "lambda",
    "aws_autoscaling_group": "auto_scaling_group",
    "aws_autoscaling_policy": "auto_scaling_group",
    "aws_ecs_cluster": "ecs_fargate", "aws_ecs_service": "ecs_fargate",
    "aws_ecs_task_definition": "ecs_fargate",
    "aws_eks_cluster": "eks", "aws_eks_node_group": "eks",
    "aws_elastic_beanstalk_environment": "elastic_beanstalk",
    "aws_elastic_beanstalk_application": "elastic_beanstalk",
    "aws_apprunner_service": "app_runner",
    "aws_batch_compute_environment": "batch", "aws_batch_job_definition": "batch",
    "aws_batch_job_queue": "batch", "aws_ecr_repository": "ecr",
    "aws_lightsail_instance": "lightsail",
    "aws_lb": "alb", "aws_alb": "alb", "aws_lb_listener": "alb",
    "aws_lb_target_group": "alb", "aws_alb_listener": "alb",
    "aws_api_gateway_rest_api": "api_gateway", "aws_apigatewayv2_api": "api_gateway",
    "aws_api_gateway_stage": "api_gateway",
    "aws_s3_bucket": "s3", "aws_s3_bucket_policy": "s3",
    "aws_s3_bucket_versioning": "s3", "aws_ebs_volume": "ebs",
    "aws_volume_attachment": "ebs", "aws_efs_file_system": "efs",
    "aws_efs_mount_target": "efs", "aws_fsx_lustre_file_system": "fsx",
    "aws_fsx_windows_file_system": "fsx", "aws_fsx_ontap_file_system": "fsx",
    "aws_backup_vault": "backup", "aws_backup_plan": "backup",
    "aws_storagegateway_gateway": "storage_gateway",
    "aws_db_instance": "rds", "aws_db_subnet_group": "rds",
    "aws_db_parameter_group": "rds", "aws_rds_cluster": "aurora",
    "aws_rds_cluster_instance": "aurora", "aws_dynamodb_table": "dynamodb",
    "aws_elasticache_cluster": "elasticache",
    "aws_elasticache_replication_group": "elasticache",
    "aws_elasticache_subnet_group": "elasticache",
    "aws_redshift_cluster": "redshift", "aws_docdb_cluster": "documentdb",
    "aws_docdb_cluster_instance": "documentdb", "aws_neptune_cluster": "neptune",
    "aws_elasticsearch_domain": "opensearch", "aws_opensearch_domain": "opensearch",
    "aws_security_group": "security_group", "aws_security_group_rule": "security_group",
    "aws_iam_role": "iam_role", "aws_iam_policy": "iam_role",
    "aws_iam_role_policy": "iam_role", "aws_iam_role_policy_attachment": "iam_role",
    "aws_iam_instance_profile": "iam_role", "aws_iam_user": "iam_role",
    "aws_iam_group": "iam_role", "aws_kms_key": "kms", "aws_kms_alias": "kms",
    "aws_acm_certificate": "acm", "aws_cognito_user_pool": "cognito",
    "aws_cognito_identity_pool": "cognito",
    "aws_secretsmanager_secret": "secretsmanager",
    "aws_secretsmanager_secret_version": "secretsmanager",
    "aws_guardduty_detector": "guardduty", "aws_cloudtrail": "cloudtrail",
    "aws_config_configuration_recorder": "config", "aws_config_rule": "config",
    "aws_shield_protection": "shield", "aws_macie2_account": "macie",
    "aws_sns_topic": "sns", "aws_sns_topic_subscription": "sns",
    "aws_sqs_queue": "sqs", "aws_sqs_queue_policy": "sqs",
    "aws_cloudwatch_event_rule": "eventbridge",
    "aws_cloudwatch_event_target": "eventbridge",
    "aws_scheduler_schedule": "eventbridge",
    "aws_sfn_state_machine": "step_functions", "aws_kinesis_stream": "kinesis",
    "aws_mq_broker": "mq", "aws_appsync_graphql_api": "appsync",
    "aws_glue_job": "glue", "aws_glue_crawler": "glue",
    "aws_glue_catalog_database": "glue", "aws_athena_workgroup": "athena",
    "aws_emr_cluster": "emr", "aws_msk_cluster": "msk",
    "aws_kinesis_firehose_delivery_stream": "kinesis_firehose",
    "aws_sagemaker_endpoint": "sagemaker", "aws_sagemaker_model": "sagemaker",
    "aws_sagemaker_domain": "sagemaker",
    "aws_bedrock_model_invocation_logging_configuration": "bedrock",
    "aws_lex_bot": "lex", "aws_lex_bot_alias": "lex",
    "aws_cloudwatch_log_group": "cloudwatch",
    "aws_cloudwatch_metric_alarm": "cloudwatch",
    "aws_cloudwatch_dashboard": "cloudwatch",
    "aws_xray_group": "xray", "aws_ssm_parameter": "systems_manager",
    "aws_ssm_document": "systems_manager",
    "aws_codepipeline": "codepipeline", "aws_codebuild_project": "codebuild",
    "aws_codedeploy_app": "codedeploy",
    "aws_codedeploy_deployment_group": "codedeploy",
    "aws_codecommit_repository": "codecommit",
    "aws_cloudformation_stack": "cloudformation",
    "aws_cloudformation_stack_set": "cloudformation",
    # GCP — Networking
    "google_compute_network": "gcp_vpc",
    "google_compute_subnetwork": "gcp_subnet",
    "google_compute_firewall": "gcp_firewall",
    "google_compute_global_forwarding_rule": "gcp_lb",
    "google_compute_forwarding_rule": "gcp_lb",
    "google_compute_backend_service": "gcp_lb",
    "google_compute_url_map": "gcp_lb",
    "google_compute_target_http_proxy": "gcp_lb",
    "google_compute_target_https_proxy": "gcp_lb",
    "google_compute_security_policy": "gcp_armor",
    "google_dns_managed_zone": "gcp_dns",
    "google_compute_router_nat": "gcp_nat",
    "google_compute_vpn_gateway": "gcp_vpn",
    "google_compute_ha_vpn_gateway": "gcp_vpn",
    "google_compute_interconnect_attachment": "gcp_interconnect",
    "google_compute_global_address": "gcp_lb",
    "google_compute_network_endpoint_group": "gcp_network_endpoint_grp",
    "google_compute_service_attachment": "gcp_private_sc",
    "google_compute_backend_bucket": "gcp_cdn",
    # GCP — Compute
    "google_compute_instance": "gcp_gce",
    "google_compute_instance_group_manager": "gcp_mig",
    "google_container_cluster": "gcp_gke",
    "google_container_node_pool": "gcp_gke",
    "google_cloud_run_v2_service": "gcp_cloud_run",
    "google_cloudfunctions2_function": "gcp_cloud_functions",
    "google_cloudfunctions_function": "gcp_cloud_functions",
    "google_app_engine_standard_app_version": "gcp_app_engine",
    "google_cloud_batch_job": "gcp_cloud_batch",
    "google_composer_environment": "gcp_cloud_composer",
    # GCP — Storage
    "google_storage_bucket": "gcp_gcs",
    "google_filestore_instance": "gcp_filestore",
    "google_compute_disk": "gcp_persistent_disk",
    "google_backup_dr_backup_plan": "gcp_backup",
    # GCP — Database
    "google_sql_database_instance": "gcp_cloudsql",
    "google_alloydb_cluster": "gcp_alloydb",
    "google_spanner_instance": "gcp_spanner",
    "google_firestore_database": "gcp_firestore",
    "google_bigtable_instance": "gcp_bigtable",
    "google_redis_instance": "gcp_memorystore",
    "google_datastore_index": "gcp_datastore",
    # GCP — Security
    "google_project_iam_binding": "gcp_iam",
    "google_project_iam_member": "gcp_iam",
    "google_service_account": "gcp_iam",
    "google_secret_manager_secret": "gcp_secret_manager",
    "google_kms_key_ring": "gcp_kms",
    "google_kms_crypto_key": "gcp_kms",
    "google_scc_source": "gcp_scc",
    "google_certificate_manager_certificate": "gcp_certificate_manager",
    # GCP — Integration
    "google_pubsub_topic": "gcp_pubsub",
    "google_pubsub_subscription": "gcp_pubsub",
    "google_dataflow_job": "gcp_dataflow",
    "google_cloud_tasks_queue": "gcp_tasks",
    "google_cloud_scheduler_job": "gcp_scheduler",
    "google_workflows_workflow": "gcp_workflows",
    # GCP — Analytics / AI / Monitoring / DevOps
    "google_bigquery_dataset": "gcp_bigquery",
    "google_dataproc_cluster": "gcp_dataproc",
    "google_looker_instance": "gcp_looker",
    "google_vertex_ai_endpoint": "gcp_vertex_ai",
    "google_vertex_ai_dataset": "gcp_automl",
    "google_logging_project_sink": "gcp_logging",
    "google_monitoring_alert_policy": "gcp_monitoring",
    "google_cloudbuild_trigger": "gcp_cloud_build",
    "google_artifact_registry_repository": "gcp_artifact_registry",
    "google_sourcerepo_repository": "gcp_source_repo",
    **AZURE_TF_TYPE_MAP,
}


# ─── Pricing lookup ───────────────────────────────────────────────────────────


def _estimate(canvas_type: str, values: dict[str, Any]) -> tuple[float, str] | tuple[None, str]:
    """Return (monthly_cost, description), or (None, reason) for free/unknown."""
    ctype = canvas_type.lower()

    if ctype in _FREE_TYPES:
        return None, "No charge"

    # EC2 — look up by instance type
    if ctype == "ec2":
        it = (values.get("instance_type") or "t3.micro").lower()
        h = _EC2_HOURLY.get(it, _EC2_HOURLY.get("t3.micro", 0.0104))
        return round(h * _HOURS, 2), f"EC2 {it}"

    # RDS — look up by instance class
    if ctype == "rds":
        ic = values.get("instance_class") or "db.t3.micro"
        h = _RDS_HOURLY.get(ic, _RDS_HOURLY.get("db.t3.micro", 0.017))
        return round(h * _HOURS, 2), f"RDS {ic}"

    # Aurora — same RDS table
    if ctype == "aurora":
        ic = values.get("instance_class") or "db.t3.medium"
        h = _RDS_HOURLY.get(ic, _RDS_HOURLY.get("db.t3.medium", 0.068))
        return round(h * _HOURS, 2), f"Aurora {ic}"

    # GCE — look up by machine type
    if ctype == "gcp_gce":
        mt = (values.get("machine_type") or "e2-medium").lower()
        if "/" in mt:
            mt = mt.rsplit("/", 1)[-1]
        h = _GCE_HOURLY.get(mt, _GCE_HOURLY.get("e2-medium", 0.0335))
        return round(h * _HOURS, 2), f"GCE {mt}"

    # Azure VM — look up by size SKU
    if ctype == "azure_vm":
        size = values.get("size") or "Standard_B1s"
        h = _AZURE_VM_HOURLY.get(size, _AZURE_VM_HOURLY.get("Standard_B1s", 0.0104))
        return round(h * _HOURS, 2), f"Azure VM {size}"

    # Cloud SQL — look up by tier / settings tier
    if ctype == "gcp_cloudsql":
        tier = values.get("tier")
        if not tier:
            settings = values.get("settings")
            if isinstance(settings, list) and settings:
                settings = settings[0]
            if isinstance(settings, dict):
                tier = settings.get("tier")
        tier = (tier or "db-f1-micro").lower()
        h = _CLOUDSQL_HOURLY.get(tier, _CLOUDSQL_HOURLY.get("db-f1-micro", 0.015))
        return round(h * _HOURS, 2), f"Cloud SQL {tier}"

    # Everything else — flat price table
    entry = _FLAT.get(ctype)
    if entry:
        return entry["monthly_cost"], entry["description"]

    return None, "Cost unknown (not in pricing DB)"


# ─── Data model ───────────────────────────────────────────────────────────────


@dataclass
class CostLineItem:
    address: str            # e.g. "aws_instance.web"
    tf_type: str
    canvas_type: str
    action: str             # "create" | "delete" | "update" | "no-op" | "read"
    monthly_cost: float | None
    description: str        # human-readable description of the estimate

    def to_dict(self) -> dict:
        return {
            "address": self.address,
            "tfType": self.tf_type,
            "canvasType": self.canvas_type,
            "action": self.action,
            "monthlyCost": self.monthly_cost,
            "description": self.description,
        }


@dataclass
class CostReport:
    line_items: list[CostLineItem] = field(default_factory=list)
    pricing_as_of: str = _DB.get("as_of", "unknown")

    # Computed properties
    @property
    def added_monthly(self) -> float:
        return round(sum(
            i.monthly_cost for i in self.line_items
            if i.action == "create" and i.monthly_cost is not None
        ), 2)

    @property
    def removed_monthly(self) -> float:
        return round(sum(
            i.monthly_cost for i in self.line_items
            if i.action == "delete" and i.monthly_cost is not None
        ), 2)

    @property
    def net_delta(self) -> float:
        return round(self.added_monthly - self.removed_monthly, 2)

    @property
    def total_after(self) -> float:
        """Sum of create + no-op/update costs (estimate of post-apply monthly bill)."""
        return round(sum(
            i.monthly_cost for i in self.line_items
            if i.action in ("create", "update", "no-op") and i.monthly_cost is not None
        ), 2)

    def to_dict(self) -> dict:
        return {
            "pricingAsOf": self.pricing_as_of,
            "addedMonthly": self.added_monthly,
            "removedMonthly": self.removed_monthly,
            "netDelta": self.net_delta,
            "totalAfter": self.total_after,
            "lineItems": [i.to_dict() for i in self.line_items],
        }


# ─── Plan parser ─────────────────────────────────────────────────────────────


def _action_label(actions: list[str]) -> str:
    """Normalise the TF action array to a single verb."""
    if not actions:
        return "no-op"
    joined = ",".join(actions)
    if "delete" in joined and "create" in joined:
        return "replace"
    if "delete" in joined:
        return "delete"
    if "create" in joined:
        return "create"
    if "update" in joined:
        return "update"
    if "read" in joined:
        return "read"
    return "no-op"


def _get_values_for_action(change: dict, action: str) -> dict:
    """Pick the right values object for cost estimation based on action direction."""
    if action in ("delete",):
        return change.get("before") or {}
    # For create / update / replace use the after state
    return change.get("after") or change.get("after_unknown") or {}


def cost_plan_json(plan: dict) -> CostReport:
    """
    Parse a terraform show -json plan and return a CostReport.

    Only resource_changes with known actions are included.
    Resources with no cost (free types or unmapped) appear in line_items
    with monthly_cost=None.
    """
    report = CostReport()

    resource_changes = plan.get("resource_changes") or []

    for rc in resource_changes:
        tf_type = rc.get("type", "")
        address = rc.get("address", "")
        change = rc.get("change") or {}
        actions = change.get("actions") or ["no-op"]

        action = _action_label(actions)
        if action == "no-op":
            continue  # skip unchanged resources

        canvas_type = _TF_TYPE_MAP.get(tf_type, "")
        values = _get_values_for_action(change, action)

        monthly_cost: float | None = None
        description = "No cost data"

        if canvas_type:
            monthly_cost, description = _estimate(canvas_type, values)
        else:
            description = f"Unmapped resource type: {tf_type}"

        report.line_items.append(CostLineItem(
            address=address,
            tf_type=tf_type,
            canvas_type=canvas_type or tf_type,
            action=action,
            monthly_cost=monthly_cost,
            description=description,
        ))

    # Sort: creates first, then updates, then deletes, then replacements
    action_order = {"create": 0, "update": 1, "replace": 2, "delete": 3, "read": 4}
    report.line_items.sort(key=lambda i: (action_order.get(i.action, 5), i.address))

    return report
