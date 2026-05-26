/**
 * findingFixes.js
 *
 * Two exports:
 *
 *  RULE_TO_CONFIG_KEY  — maps rule_id → the config field key it relates to.
 *                        Used by ValidateTab to tell ComponentPanel which field
 *                        to scroll to when a finding is clicked.
 *
 *  RULE_FIXES          — maps rule_id → { key, value, label } for rules where
 *                        the remediation is a single deterministic config change.
 *                        Topology rules (add a node, draw an edge) are NOT here
 *                        because they can't be auto-applied safely.
 */

// ── Scroll-to mapping ─────────────────────────────────────────────────────────
// Keys for topology rules are omitted intentionally — there is no config field
// to navigate to.

export const RULE_TO_CONFIG_KEY = {
  // RDS / Aurora
  rds_unencrypted:           "storage_encrypted",
  rds_no_backup:             "backup_retention_period",
  rds_no_deletion_protection:"deletion_protection",
  rds_no_logging:            "enabled_cloudwatch_logs_exports",
  rds_no_perf_insights:      "performance_insights_enabled",
  rds_no_storage_autoscaling:"max_allocated_storage",
  rds_publicly_accessible:   "publicly_accessible",
  rds_gp2_storage:           "storage_type",
  rds_io1_consider_gp3:      "storage_type",
  rds_no_reserved:           "instance_class",
  no_multi_az:               "multi_az",
  aurora_unencrypted:        "storage_encrypted",
  aurora_no_backup:          "backup_retention_period",
  aurora_not_graviton:       "instance_class",

  // EC2 / EBS
  ebs_unencrypted:           "encrypted",
  ebs_gp2_upgrade:           "volume_type",
  ec2_imdsv2_optional:       "http_tokens",
  ec2_prev_gen:              "instance_type",

  // Lambda
  lambda_no_tracing:         "tracing_config",
  lambda_not_arm64:          "architectures",
  lambda_default_memory:     "memory_size",
  lambda_high_timeout:       "timeout",
  lambda_public_access:      "function_url_auth_type",

  // S3
  s3_no_encryption:          "server_side_encryption_configuration",
  s3_versioning_off:         "versioning",
  s3_no_block_public_access: "block_public_acls",
  s3_no_ssl_policy:          "policy",
  s3_versioning_no_lifecycle:"lifecycle_rule",

  // DynamoDB
  dynamodb_no_pitr:          "point_in_time_recovery",
  dynamodb_high_provisioned:  "billing_mode",

  // ElastiCache
  elasticache_no_encryption_rest:    "at_rest_encryption_enabled",
  elasticache_no_encryption_transit: "transit_encryption_mode",
  elasticache_no_auth:               "auth_token",
  elasticache_no_backup:             "snapshot_retention_limit",

  // SQS / SNS
  sqs_no_encryption:   "sqs_managed_sse_enabled",
  sqs_no_dlq:          "redrive_max_receive_count",
  sns_no_encryption:   "kms_master_key_id",

  // EFS / ECS / EKS
  efs_no_encryption:   "encrypted",
  ecs_no_fargate_spot: "launch_type",
  eks_no_logging:      "enabled_cluster_log_types",
  eks_public_endpoint: "endpoint_public_access",

  // CloudFront
  cloudfront_no_https:   "viewer_protocol_policy",
  cloudfront_no_logging: "logging_config",
  cloudfront_no_waf:     "web_acl_id",

  // CloudTrail / KMS / Secrets
  cloudtrail_no_encryption: "kms_key_id",
  kms_no_rotation:          "enable_key_rotation",
  kms_no_cmk:               "kms_key_id",
  secrets_no_rotation:      "rotation_enabled",

  // Redshift
  redshift_unencrypted: "encrypted",
  redshift_no_tls:      "require_ssl",

  // ALB
  alb_no_access_logging: "access_logs",
  alb_http_no_redirect:  "certificate_arn",

  // Subnet / VPC
  subnet_auto_public_ip:   "map_public_ip_on_launch",

  // CloudWatch
  cloudwatch_no_log_retention: "retention_in_days",
};

// ── Auto-fix map ──────────────────────────────────────────────────────────────
// Only rules where the fix is a SINGLE safe property assignment.
// value may be a scalar or array; label is shown in the confirmation dialog.

export const RULE_FIXES = {
  // RDS
  rds_unencrypted:            { key: "storage_encrypted",              value: true,    label: "Enable storage encryption" },
  rds_no_backup:              { key: "backup_retention_period",        value: 7,       label: "Set backup retention to 7 days" },
  rds_no_deletion_protection: { key: "deletion_protection",            value: true,    label: "Enable deletion protection" },
  rds_no_perf_insights:       { key: "performance_insights_enabled",   value: true,    label: "Enable Performance Insights" },
  rds_no_storage_autoscaling: { key: "max_allocated_storage",          value: 100,     label: "Set max allocated storage to 100 GB" },
  rds_publicly_accessible:    { key: "publicly_accessible",            value: false,   label: "Disable public accessibility" },
  rds_gp2_storage:            { key: "storage_type",                   value: "gp3",  label: "Upgrade storage type to gp3" },
  rds_io1_consider_gp3:       { key: "storage_type",                   value: "gp3",  label: "Switch storage type to gp3" },
  rds_no_logging:             { key: "enabled_cloudwatch_logs_exports", value: ["error","general","slowquery"], label: 'Enable CloudWatch log exports (error, general, slowquery)' },
  no_multi_az:                { key: "multi_az",                       value: true,    label: "Enable Multi-AZ" },

  // Aurora
  aurora_unencrypted: { key: "storage_encrypted",      value: true, label: "Enable storage encryption" },
  aurora_no_backup:   { key: "backup_retention_period", value: 7,   label: "Set backup retention to 7 days" },

  // EC2 / EBS
  ebs_unencrypted:    { key: "encrypted",   value: true,   label: "Enable EBS encryption" },
  ebs_gp2_upgrade:    { key: "volume_type", value: "gp3", label: "Upgrade volume type to gp3" },
  ec2_imdsv2_optional:{ key: "http_tokens", value: "required", label: 'Require IMDSv2 (set http_tokens to "required")' },

  // Lambda
  lambda_no_tracing:    { key: "tracing_config",          value: "Active",  label: 'Enable X-Ray tracing (set to "Active")' },
  lambda_not_arm64:     { key: "architectures",            value: "arm64",   label: 'Switch architecture to arm64' },
  lambda_default_memory:{ key: "memory_size",              value: 256,       label: "Set memory to 256 MB" },
  lambda_high_timeout:  { key: "timeout",                  value: 30,        label: "Set timeout to 30 s" },
  lambda_public_access: { key: "function_url_auth_type",   value: "AWS_IAM", label: 'Restrict function URL to AWS_IAM auth' },

  // S3
  s3_versioning_off: { key: "versioning", value: true, label: "Enable versioning" },

  // DynamoDB
  dynamodb_no_pitr: { key: "point_in_time_recovery", value: true, label: "Enable point-in-time recovery" },

  // ElastiCache
  elasticache_no_encryption_rest:    { key: "at_rest_encryption_enabled", value: true,       label: "Enable at-rest encryption" },
  elasticache_no_encryption_transit: { key: "transit_encryption_mode",    value: "required", label: 'Require in-transit encryption (set to "required")' },
  elasticache_no_backup:             { key: "snapshot_retention_limit",   value: 1,          label: "Enable snapshots (retention 1 day)" },

  // SQS
  sqs_no_encryption: { key: "sqs_managed_sse_enabled", value: true, label: "Enable SQS managed SSE" },

  // EFS / Redshift / KMS / Secrets
  efs_no_encryption:    { key: "encrypted",          value: true,  label: "Enable EFS encryption" },
  redshift_unencrypted: { key: "encrypted",          value: true,  label: "Enable Redshift encryption" },
  kms_no_rotation:      { key: "enable_key_rotation", value: true, label: "Enable automatic key rotation" },
  secrets_no_rotation:  { key: "rotation_enabled",   value: true,  label: "Enable secret rotation" },

  // EKS
  eks_no_logging: {
    key: "enabled_cluster_log_types",
    value: ["api", "audit", "authenticator", "controllerManager", "scheduler"],
    label: "Enable all EKS control-plane log types",
  },

  // Subnet / CloudWatch
  subnet_auto_public_ip:       { key: "map_public_ip_on_launch", value: false, label: "Disable auto-assign public IP" },
  cloudwatch_no_log_retention: { key: "retention_in_days",       value: 90,    label: "Set log retention to 90 days" },
};

/** Returns a human-readable preview string for the confirmation dialog. */
export function fixPreview(ruleId, nodeLabel) {
  const fix = RULE_FIXES[ruleId];
  if (!fix) return null;
  const val = Array.isArray(fix.value)
    ? `[${fix.value.join(", ")}]`
    : String(fix.value);
  return `${fix.label} on "${nodeLabel}" (${fix.key} = ${val})`;
}
