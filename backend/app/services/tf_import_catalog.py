"""
Terraform import catalog — companion detection, parent resolution, import reporting.

Single source of truth for which AWS resource types are:
  - canvas primaries (typed nodes)
  - companions (merged onto parent config)
  - tab-managed (SG / IAM)
  - metadata data sources (merged into referrers)
"""
from __future__ import annotations

import re
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Any

from app.services.prompt_builder import _AWS_RESOURCE_MAP

# ─── Companion catalog (derived from generator map) ───────────────────────────

def build_companion_catalog() -> tuple[frozenset[str], dict[str, frozenset[str]], frozenset[str]]:
    """
    Returns:
      companion_only_types — TF types that appear as companions but never as primaries
      companion_to_primaries — companion TF type -> possible parent TF types
      primary_types — all primary TF types from the Archon resource map
    """
    primary_types: set[str] = set()
    companion_types: set[str] = set()
    companion_to_primaries: dict[str, set[str]] = defaultdict(set)

    for spec in _AWS_RESOURCE_MAP.values():
        primaries = spec.get("primary", [])
        companions = spec.get("companions", [])
        primary_types.update(primaries)
        companion_types.update(companions)
        for companion in companions:
            for primary in primaries:
                companion_to_primaries[companion].add(primary)

    companion_only = companion_types - primary_types
    return (
        frozenset(companion_only),
        {k: frozenset(v) for k, v in companion_to_primaries.items()},
        frozenset(primary_types),
    )


COMPANION_ONLY_TYPES, COMPANION_TO_PRIMARIES, PRIMARY_TF_TYPES = build_companion_catalog()

# Prefix rules: aws_<parent>_<suffix> → parent TF type
_PREFIX_PARENT_RULES: tuple[tuple[str, str], ...] = (
    ("aws_s3_bucket_", "aws_s3_bucket"),
    ("aws_lb_", "aws_lb"),
    ("aws_alb_", "aws_lb"),
    ("aws_cloudfront_", "aws_cloudfront_distribution"),
    ("aws_ecs_", "aws_ecs_cluster"),  # fallback; service/task resolved via refs
    ("aws_rds_", "aws_rds_cluster"),
    ("aws_db_", "aws_db_instance"),
    ("aws_elasticache_", "aws_elasticache_replication_group"),
    ("aws_dynamodb_", "aws_dynamodb_table"),
    ("aws_eks_", "aws_eks_cluster"),
    ("aws_msk_", "aws_msk_cluster"),
    ("aws_sfn_", "aws_sfn_state_machine"),
    ("aws_ses_", "aws_ses_domain_identity"),
    ("aws_sns_", "aws_sns_topic"),
    ("aws_sqs_", "aws_sqs_queue"),
    ("aws_wafv2_", "aws_wafv2_web_acl"),
    ("aws_acm_", "aws_acm_certificate"),
    ("aws_secretsmanager_", "aws_secretsmanager_secret"),
    ("aws_config_", "aws_config_configuration_recorder"),
    ("aws_securityhub_", "aws_securityhub_account"),
    ("aws_macie2_", "aws_macie2_account"),
    ("aws_cloudwatch_event_", "aws_cloudwatch_event_rule"),
    ("aws_redshiftserverless_", "aws_redshiftserverless_namespace"),
)

# Explicit companion types not always listed in the generator map
_EXTRA_COMPANION_TYPES = frozenset({
    "aws_s3_bucket_object_lock_configuration",
    "aws_s3_bucket_metric",
    "aws_s3_bucket_inventory",
    "aws_s3_bucket_accelerate_configuration",
    "aws_s3_bucket_request_payment_configuration",
    "aws_ec2_transit_gateway_route_table_association",
    "aws_ec2_transit_gateway_route_table_propagation",
    "aws_ec2_transit_gateway_peering_attachment",
    "aws_ec2_transit_gateway_connect",
    "aws_eks_fargate_profile",
    "aws_eks_identity_provider_config",
    "aws_rds_cluster_role_association",
    "aws_cloudwatch_log_subscription_filter",
    "aws_cloudwatch_log_metric_filter",
    "aws_cloudwatch_log_resource_policy",
    "aws_cloudwatch_log_data_protection_policy",
    "aws_route53_zone_association",
    "aws_route53_domains_registered_domain",
    "aws_kinesis_firehose_delivery_stream",
    "aws_glue_catalog_table",
    "aws_glue_connection",
    "aws_apigatewayv2_stage",
    "aws_apigatewayv2_integration",
    "aws_apigatewayv2_route",
    "aws_apigatewayv2_authorizer",
    "aws_apigatewayv2_deployment",
    "aws_apigatewayv2_domain_name",
    "aws_apigatewayv2_api_mapping",
    "aws_lambda_layer_version",
    "aws_lambda_function_event_invoke_config",
    "aws_lambda_provisioned_concurrency_config",
    "aws_iam_role_policy",
    "aws_iam_user_policy",
    "aws_iam_group_policy",
    "aws_iam_openid_connect_provider",
    "aws_iam_saml_provider",
    "aws_iam_service_linked_role",
    "aws_network_interface",
    "aws_network_interface_attachment",
    "aws_ebs_snapshot",
    "aws_ebs_encryption_by_default",
    "aws_flow_log",
    "aws_vpc_peering_connection",
    "aws_vpc_peering_connection_accepter",
    "aws_vpc_ipv4_cidr_block_association",
    "aws_default_vpc",
    "aws_default_subnet",
    "aws_default_route_table",
    "aws_default_security_group",
    "aws_default_network_acl",
})

ALL_COMPANION_TYPES = COMPANION_ONLY_TYPES | _EXTRA_COMPANION_TYPES

# Tab-managed — never canvas nodes
_TAB_MANAGED_TYPES = frozenset({
    "aws_security_group", "aws_security_group_rule",
    "aws_iam_role", "aws_iam_policy", "aws_iam_role_policy",
    "aws_iam_role_policy_attachment", "aws_iam_instance_profile",
    "aws_iam_user", "aws_iam_group",
})

# Metadata data sources — merge into referrers, no canvas node
METADATA_DATA_SOURCE_TYPES = frozenset({
    "aws_caller_identity",
    "aws_region",
    "aws_partition",
    "aws_availability_zones",
    "aws_canonical_user_id",
    "aws_default_tags",
    "aws_service",
    "aws_arn",
    "aws_iam_policy_document",
    "aws_iam_session_context",
})

# Selection/filter data sources — merge into referrers
SELECTION_DATA_SOURCE_TYPES = frozenset({
    "aws_ami",
    "aws_ami_ids",
    "aws_subnets",
    "aws_subnet",
    "aws_vpc",
    "aws_security_group",
    "aws_security_groups",
    "aws_kms_key",
    "aws_kms_alias",
    "aws_kms_secrets",
    "aws_secretsmanager_secret",
    "aws_secretsmanager_secret_version",
    "aws_ssm_parameter",
    "aws_elb_service_account",
    "aws_cloudfront_log_delivery_canonical_user_id",
    "aws_route53_zone",
    "aws_acm_certificate",
    "aws_lb",
    "aws_lb_listener",
    "aws_nat_gateway",
    "aws_ecr_image",
    "aws_ecr_repository",
})

# Known Terraform Registry modules (Phase 3 — professional placeholder metadata)
KNOWN_REGISTRY_MODULES: dict[str, dict[str, Any]] = {
    "terraform-aws-modules/vpc/aws": {
        "label": "AWS VPC Module",
        "expected_resources": [
            "aws_vpc", "aws_subnet", "aws_internet_gateway",
            "aws_route_table", "aws_route_table_association",
            "aws_nat_gateway", "aws_eip",
        ],
        "archon_types": ["vpc", "subnet", "internet_gateway", "route_table", "nat_gateway"],
        "note": "Popular community VPC module — upload module source files for full canvas expansion.",
    },
    "terraform-aws-modules/eks/aws": {
        "label": "AWS EKS Module",
        "expected_resources": [
            "aws_eks_cluster", "aws_eks_node_group", "aws_iam_role",
            "aws_security_group", "aws_launch_template",
        ],
        "archon_types": ["eks", "iam_role", "security_group"],
        "note": "Community EKS module — upload ./modules/* source for full expansion.",
    },
    "terraform-aws-modules/rds-aurora/aws": {
        "label": "Aurora RDS Module",
        "expected_resources": [
            "aws_rds_cluster", "aws_rds_cluster_instance",
            "aws_db_subnet_group", "aws_security_group",
        ],
        "archon_types": ["aurora", "rds", "security_group"],
        "note": "Community Aurora module — internal resources not visible without module source.",
    },
    "terraform-aws-modules/s3-bucket/aws": {
        "label": "S3 Bucket Module",
        "expected_resources": [
            "aws_s3_bucket", "aws_s3_bucket_public_access_block",
            "aws_s3_bucket_server_side_encryption_configuration",
        ],
        "archon_types": ["s3"],
        "note": "Community S3 module — merges encryption and public-access-block companions.",
    },
    "terraform-aws-modules/alb/aws": {
        "label": "Application Load Balancer Module",
        "expected_resources": [
            "aws_lb", "aws_lb_target_group", "aws_lb_listener", "aws_security_group",
        ],
        "archon_types": ["alb", "security_group"],
        "note": "Community ALB module — listeners/target groups merged onto ALB in Archon.",
    },
}

# Map archon canvas type → first matching TF type label (for registry synthesis)
_ARCHON_TYPE_DISPLAY: dict[str, tuple[str, str, str, str]] = {
    "vpc": ("vpc", "networking", "🌐", "VPC"),
    "subnet": ("subnet", "networking", "🔲", "Subnet"),
    "internet_gateway": ("internet_gateway", "networking", "🌍", "Internet GW"),
    "route_table": ("route_table", "networking", "🗺️", "Route Table"),
    "nat_gateway": ("nat_gateway", "networking", "🔀", "NAT Gateway"),
    "eks": ("eks", "compute", "☸️", "EKS"),
    "alb": ("alb", "load_balancing", "⚡", "ALB"),
    "aurora": ("aurora", "database", "🗄️", "Aurora"),
    "rds": ("rds", "database", "🗄️", "RDS"),
    "s3": ("s3", "storage", "🪣", "S3"),
    "iam_role": ("iam_role", "security", "👤", "IAM Role"),
    "security_group": ("security_group", "security", "🛡️", "Security Group"),
}


def get_archon_type_display(archon_type: str) -> tuple[str, str, str, str] | None:
    """Return (archon_type, category, icon, display_name) for synthesis."""
    return _ARCHON_TYPE_DISPLAY.get(archon_type)

_DATA_REF_RE = re.compile(
    r'\$\{data\.([A-Za-z][A-Za-z0-9_]*)\.([A-Za-z0-9][A-Za-z0-9_-]*)[\.\[]'
)


def prefix_parent_type(resource_type: str) -> str | None:
    """Infer parent TF type from resource-type prefix."""
    if resource_type in _TYPE_MAP_STANDALONE_PREFIX_EXCEPTIONS:
        return None
    for prefix, parent in _PREFIX_PARENT_RULES:
        if resource_type.startswith(prefix) and resource_type != parent:
            return parent
    return None


# Types that share a prefix with companions but are standalone canvas nodes
_TYPE_MAP_STANDALONE_PREFIX_EXCEPTIONS = frozenset({
    "aws_cloudwatch_event_bus",
})


def is_companion_type(
    resource_type: str,
    *,
    mapped_types: frozenset[str] | None = None,
) -> bool:
    """
    Return True when a TF type should merge onto a parent instead of a canvas node.

    Types explicitly mapped in the importer TYPE_MAP are always rendered as nodes.
    """
    if mapped_types and resource_type in mapped_types:
        return False
    if resource_type in PRIMARY_TF_TYPES:
        return False
    if resource_type in ALL_COMPANION_TYPES:
        return True
    if prefix_parent_type(resource_type):
        return True
    return resource_type in COMPANION_TO_PRIMARIES


def normalize_registry_source(source: str) -> str | None:
    """Return registry module key if source points at the public registry."""
    source = source.strip().strip('"')
    if source.startswith("git::"):
        for key in KNOWN_REGISTRY_MODULES:
            module_slug = key.split("/")[1] if "/" in key else key
            if module_slug in source:
                return key
    if source.startswith("registry.terraform.io/modules/"):
        path = source.removeprefix("registry.terraform.io/modules/").split("?")[0]
        parts = path.strip("/").split("/")
        if len(parts) >= 3:
            candidate = "/".join(parts[:3])
            if candidate in KNOWN_REGISTRY_MODULES:
                return candidate
    base = source.split("?")[0].strip("/")
    if base in KNOWN_REGISTRY_MODULES:
        return base
    if base.startswith("terraform-aws-modules/"):
        parts = base.split("/")
        if len(parts) >= 3:
            candidate = "/".join(parts[:3])
            if candidate in KNOWN_REGISTRY_MODULES:
                return candidate
    return None


def normalize_module_path(source: str) -> str | None:
    """Return relative module directory path for local sources."""
    source = source.strip().strip('"')
    if source.startswith("./"):
        return source[2:].strip("/").replace("\\", "/")
    if source.startswith("../"):
        return source.replace("\\", "/")
    return None


def find_module_file_indices(source_path: str, filenames: list[str]) -> list[int]:
    """Find uploaded file indices belonging to a local module directory."""
    if not source_path:
        return []
    norm_source = source_path.replace("\\", "/").rstrip("/")
    module_leaf = norm_source.rsplit("/", 1)[-1]
    indices: list[int] = []

    for idx, filename in enumerate(filenames):
        norm = filename.replace("\\", "/").lstrip("./")
        candidates = (
            norm == f"{norm_source}.tf",
            norm.startswith(f"{norm_source}/") and norm.endswith(".tf"),
            norm.endswith(f"/{norm_source}/main.tf"),
            norm == f"{module_leaf}/main.tf",
            norm.endswith(f"/{module_leaf}/main.tf"),
            norm == f"modules/{module_leaf}/main.tf",
            norm.endswith(f"/modules/{module_leaf}/main.tf"),
        )
        if any(candidates):
            indices.append(idx)

    return sorted(set(indices))


@dataclass
class ImportReport:
    """Structured import report returned to the frontend."""

    entries: list[dict[str, Any]] = field(default_factory=list)

    def add(
        self,
        action: str,
        *,
        resource_type: str,
        resource_name: str = "",
        archon_type: str | None = None,
        parent_type: str | None = None,
        parent_name: str | None = None,
        reason: str = "",
        detail: str | None = None,
    ) -> None:
        self.entries.append({
            "action": action,
            "resource_type": resource_type,
            "resource_name": resource_name,
            "archon_type": archon_type,
            "parent_type": parent_type,
            "parent_name": parent_name,
            "reason": reason,
            "detail": detail,
        })

    @property
    def summary(self) -> dict[str, int]:
        counts: dict[str, int] = defaultdict(int)
        for entry in self.entries:
            counts[entry["action"]] += 1
        counts["total"] = len(self.entries)
        return dict(counts)

    def warnings(self) -> list[str]:
        """Legacy flat warning strings for backward compatibility."""
        out: list[str] = []
        for entry in self.entries:
            action = entry["action"]
            rt = entry["resource_type"]
            rn = entry["resource_name"]
            label = f"{rt}.{rn}" if rn else rt
            reason = entry.get("reason") or action
            if action in ("generic", "companion_orphan", "parse_error", "module_placeholder"):
                out.append(f"{label}: {reason}")
            elif action == "unknown_type":
                out.append(f"Unknown resource type '{rt}' rendered as generic node")
        return out

    def to_dict(self) -> dict[str, Any]:
        return {
            "summary": self.summary,
            "entries": self.entries,
        }


def companion_config_key(companion_type: str, companion_name: str) -> str:
    return f"{companion_type}.{companion_name}"


def merge_companion_config(
    parent_config: dict[str, Any],
    companion_type: str,
    companion_name: str,
    attrs: dict[str, Any],
    *,
    config_skip_keys: frozenset[str],
) -> None:
    """Fold companion resource attributes into parent config._companions."""
    filtered = {
        k: v for k, v in attrs.items()
        if k not in config_skip_keys and not k.startswith("_")
    }
    companions = parent_config.setdefault("_companions", {})
    by_type = companions.setdefault(companion_type, {})
    by_type[companion_name] = filtered


def merge_data_source_config(
    target_config: dict[str, Any],
    data_type: str,
    data_name: str,
    attrs: dict[str, Any],
    *,
    config_skip_keys: frozenset[str],
) -> None:
    filtered = {
        k: v for k, v in attrs.items()
        if k not in config_skip_keys and not k.startswith("_")
    }
    data_sources = target_config.setdefault("_data_sources", {})
    by_type = data_sources.setdefault(data_type, {})
    by_type[data_name] = filtered


def resource_references_data(
    value: Any,
    data_type: str,
    data_name: str,
) -> bool:
    needle = f"data.{data_type}.{data_name}"
    if isinstance(value, str):
        return needle in value
    if isinstance(value, list):
        return any(resource_references_data(item, data_type, data_name) for item in value)
    if isinstance(value, dict):
        return any(resource_references_data(v, data_type, data_name) for v in value.values())
    return False


def resolve_companion_parent(
    companion_type: str,
    companion_name: str,
    attrs: dict[str, Any],
    resources: dict[str, dict[str, dict]],
    collect_refs_fn,
) -> tuple[str, str] | None:
    """
    Resolve which primary resource instance should receive this companion config.
    """
    allowed: set[str] = set(COMPANION_TO_PRIMARIES.get(companion_type, ()))
    prefix_parent = prefix_parent_type(companion_type)
    if prefix_parent:
        allowed.add(prefix_parent)

    refs: set[tuple[str, str]] = set()
    collect_refs_fn(attrs, refs)
    for ref_type, ref_name in refs:
        if ref_type in resources and ref_name in resources[ref_type]:
            if not allowed or ref_type in allowed:
                return (ref_type, ref_name)

    # App autoscaling uses resource_id instead of direct refs
    resource_id = attrs.get("resource_id")
    if isinstance(resource_id, str):
        stripped = resource_id.strip().strip('"')
        if stripped.startswith("service/"):
            for primary in ("aws_ecs_service", "aws_rds_cluster"):
                if primary in allowed or not allowed:
                    for svc_name in resources.get(primary, {}):
                        return (primary, svc_name)

    for primary in allowed:
        if companion_name in resources.get(primary, {}):
            return (primary, companion_name)

    for primary in allowed:
        instances = resources.get(primary, {})
        if len(instances) == 1:
            return (primary, next(iter(instances)))

    return None
