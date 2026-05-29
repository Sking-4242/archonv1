import json

from app.models.graph import Graph

# ─── AWS Resource Map ──────────────────────────────────────────────────────────
# Maps every canvas component type to its Terraform generation spec.
#
# primary    – ordered list of TF resource types to generate (main first)
# companions – supporting resources that MUST always accompany the primary
# key_vars   – attributes that must be parameterized as var.* (never hardcoded)
# outputs    – output block names to generate for this component
# notes      – single most important HCL requirement or gotcha
# ─────────────────────────────────────────────────────────────────────────────
_AWS_RESOURCE_MAP: dict[str, dict] = {
    # ── Networking ────────────────────────────────────────────────────────────
    "vpc": {
        "primary": ["aws_vpc"],
        "companions": ["aws_internet_gateway", "aws_route_table"],
        "key_vars": ["vpc_cidr_block"],
        "outputs": ["vpc_id", "vpc_cidr_block"],
        "notes": "Set enable_dns_support=true and enable_dns_hostnames=true for private hosted zones and ECS service discovery.",
    },
    "subnet": {
        "primary": ["aws_subnet"],
        "companions": ["aws_route_table_association"],
        "key_vars": ["subnet_cidr_block", "availability_zone"],
        "outputs": ["subnet_id"],
        "notes": "Set map_public_ip_on_launch=true for public subnets; false for private. Always tag with Name and Tier.",
    },
    "internet_gateway": {
        "primary": ["aws_internet_gateway"],
        "companions": [],
        "key_vars": [],
        "outputs": ["igw_id"],
        "notes": "Attach to the VPC via vpc_id. Add a default route 0.0.0.0/0 pointing here in the public route table.",
    },
    "nat_gateway": {
        "primary": ["aws_nat_gateway"],
        "companions": ["aws_eip"],
        "key_vars": [],
        "outputs": ["nat_gateway_id", "nat_eip"],
        "notes": "NAT Gateway REQUIRES an aws_eip resource; set allocation_id = aws_eip.<name>.id. Place in a public subnet.",
    },
    "route_table": {
        "primary": ["aws_route_table"],
        "companions": ["aws_route_table_association"],
        "key_vars": [],
        "outputs": ["route_table_id"],
        "notes": "Always include aws_route_table_association resources to link subnets to this table.",
    },
    "elastic_ip": {
        "primary": ["aws_eip"],
        "companions": [],
        "key_vars": [],
        "outputs": ["eip_public_ip", "eip_allocation_id"],
        "notes": "Set domain='vpc' for EIPs used with NAT Gateways or EC2 instances in a VPC.",
    },
    "cloudfront": {
        "primary": ["aws_cloudfront_distribution"],
        "companions": ["aws_cloudfront_origin_access_control"],
        "key_vars": ["cloudfront_price_class"],
        "outputs": ["cloudfront_domain_name", "cloudfront_distribution_id", "cloudfront_arn"],
        "notes": "Use aws_cloudfront_origin_access_control (OAC) instead of legacy OAI. Set restrictions.geo_restriction.restriction_type='none' if no geo-blocking needed.",
    },
    "route53": {
        "primary": ["aws_route53_zone"],
        "companions": ["aws_route53_record"],
        "key_vars": ["domain_name"],
        "outputs": ["zone_id", "name_servers"],
        "notes": "For private hosted zones set private_zone=true and associate with vpc blocks. Always output name_servers for public zones.",
    },
    "transit_gateway": {
        "primary": ["aws_ec2_transit_gateway"],
        "companions": ["aws_ec2_transit_gateway_vpc_attachment"],
        "key_vars": [],
        "outputs": ["transit_gateway_id", "transit_gateway_arn"],
        "notes": "Generate aws_ec2_transit_gateway_vpc_attachment for each VPC that connects to this gateway.",
    },
    "vpn_gateway": {
        "primary": ["aws_vpn_gateway"],
        "companions": ["aws_customer_gateway", "aws_vpn_connection"],
        "key_vars": ["bgp_asn"],
        "outputs": ["vpn_gateway_id"],
        "notes": "Always generate aws_customer_gateway (type='ipsec.1') and aws_vpn_connection linking the two.",
    },
    "direct_connect": {
        "primary": ["aws_dx_connection"],
        "companions": ["aws_dx_gateway", "aws_dx_gateway_association"],
        "key_vars": ["dx_bandwidth", "dx_location"],
        "outputs": ["dx_connection_id"],
        "notes": "dx_connection bandwidth must be one of: 1Gbps, 10Gbps, 100Gbps, or an LAG sub-connection value.",
    },
    "vpc_endpoint": {
        "primary": ["aws_vpc_endpoint"],
        "companions": [],
        "key_vars": ["service_name", "vpc_endpoint_type"],
        "outputs": ["endpoint_id", "endpoint_dns_entry"],
        "notes": "For Gateway endpoints (S3, DynamoDB) set vpc_endpoint_type='Gateway' and route_table_ids. For Interface endpoints set vpc_endpoint_type='Interface' and subnet_ids + security_group_ids.",
    },
    "global_accelerator": {
        "primary": ["aws_globalaccelerator_accelerator"],
        "companions": ["aws_globalaccelerator_listener", "aws_globalaccelerator_endpoint_group"],
        "key_vars": [],
        "outputs": ["accelerator_arn", "accelerator_dns_name"],
        "notes": "Always generate a listener and at least one endpoint_group. ip_address_type must be 'IPV4' or 'DUAL_STACK'.",
    },
    "waf": {
        "primary": ["aws_wafv2_web_acl"],
        "companions": ["aws_wafv2_web_acl_association"],
        "key_vars": ["waf_scope"],
        "outputs": ["web_acl_arn", "web_acl_id"],
        "notes": "scope must be 'REGIONAL' for ALB/API Gateway or 'CLOUDFRONT' for CloudFront (must be in us-east-1). Include at least one AWS managed rule group.",
    },
    "shield": {
        "primary": ["aws_shield_protection"],
        "companions": [],
        "key_vars": [],
        "outputs": ["shield_protection_id"],
        "notes": "Shield Advanced requires subscribing to the aws_shield_subscription resource first. Associate with an ALB, EIP, or CloudFront ARN.",
    },

    # ── Compute ───────────────────────────────────────────────────────────────
    "ec2": {
        "primary": ["aws_instance"],
        "companions": ["aws_iam_instance_profile"],
        "key_vars": ["ami_id", "instance_type", "key_name"],
        "outputs": ["instance_id", "instance_private_ip", "instance_public_ip"],
        "notes": "Use aws_iam_instance_profile to attach an IAM role. Reference ami via data.aws_ami data source rather than hardcoded AMI ID when possible.",
    },
    "lambda": {
        "primary": ["aws_lambda_function"],
        "companions": ["aws_iam_role", "aws_iam_role_policy_attachment", "aws_cloudwatch_log_group"],
        "key_vars": ["lambda_function_name", "lambda_runtime", "lambda_handler"],
        "outputs": ["lambda_function_arn", "lambda_invoke_arn", "lambda_function_name"],
        "notes": "IAM execution role MUST have AWSLambdaBasicExecutionRole attached. CloudWatch log group MUST be named /aws/lambda/<function_name> with explicit retention_in_days.",
    },
    "auto_scaling_group": {
        "primary": ["aws_autoscaling_group"],
        "companions": ["aws_launch_template", "aws_autoscaling_policy"],
        "key_vars": ["asg_min_size", "asg_max_size", "asg_desired_capacity"],
        "outputs": ["autoscaling_group_arn", "autoscaling_group_name"],
        "notes": "Use launch_template block (not launch_configuration, which is deprecated). Include at least one target_tracking_configuration policy.",
    },
    "ecs_fargate": {
        "primary": ["aws_ecs_cluster", "aws_ecs_service", "aws_ecs_task_definition"],
        "companions": ["aws_iam_role", "aws_cloudwatch_log_group"],
        "key_vars": ["ecs_cluster_name", "container_image", "task_cpu", "task_memory"],
        "outputs": ["ecs_cluster_arn", "ecs_service_name", "task_definition_arn"],
        "notes": "Task execution role MUST have AmazonECSTaskExecutionRolePolicy attached. Log group name must match the awslogs-group in the container definition. Set launch_type='FARGATE' and network_mode='awsvpc'.",
    },
    "eks": {
        "primary": ["aws_eks_cluster", "aws_eks_node_group"],
        "companions": ["aws_iam_role", "aws_iam_role_policy_attachment"],
        "key_vars": ["eks_cluster_name", "eks_version", "node_instance_type", "node_desired_size"],
        "outputs": ["eks_cluster_endpoint", "eks_cluster_name", "eks_cluster_certificate_authority"],
        "notes": "Cluster role needs AmazonEKSClusterPolicy. Node role needs AmazonEKSWorkerNodePolicy + AmazonEKS_CNI_Policy + AmazonEC2ContainerRegistryReadOnly — all three as separate aws_iam_role_policy_attachment resources.",
    },
    "elastic_beanstalk": {
        "primary": ["aws_elastic_beanstalk_application", "aws_elastic_beanstalk_environment"],
        "companions": ["aws_iam_instance_profile", "aws_iam_role"],
        "key_vars": ["eb_app_name", "eb_solution_stack"],
        "outputs": ["eb_environment_endpoint", "eb_environment_name"],
        "notes": "Use aws_elastic_beanstalk_environment setting blocks for instance type, min/max instances, and load balancer type. Always attach aws:elasticbeanstalk:ec2:vpc settings for VPC deployment.",
    },
    "app_runner": {
        "primary": ["aws_apprunner_service"],
        "companions": ["aws_iam_role"],
        "key_vars": ["app_runner_service_name", "container_image_uri"],
        "outputs": ["app_runner_service_url", "app_runner_service_arn"],
        "notes": "access_role_arn is required when source is ECR. Set health_check configuration with healthy_threshold=1, interval=5.",
    },
    "batch": {
        "primary": ["aws_batch_compute_environment", "aws_batch_job_queue", "aws_batch_job_definition"],
        "companions": ["aws_iam_role"],
        "key_vars": ["batch_compute_name"],
        "outputs": ["compute_environment_arn", "job_queue_arn"],
        "notes": "Compute environment service_role must be the AWSBatchServiceRole. For MANAGED type set compute_resources with min/max/desired_vcpus.",
    },
    "ecr": {
        "primary": ["aws_ecr_repository"],
        "companions": ["aws_ecr_lifecycle_policy"],
        "key_vars": ["ecr_repository_name"],
        "outputs": ["ecr_repository_url", "ecr_repository_arn"],
        "notes": "Always include an aws_ecr_lifecycle_policy to expire untagged images after 30 days. Set image_scanning_configuration.scan_on_push=true.",
    },
    "lightsail": {
        "primary": ["aws_lightsail_instance"],
        "companions": [],
        "key_vars": ["lightsail_bundle_id", "lightsail_blueprint_id"],
        "outputs": ["lightsail_instance_arn", "lightsail_public_ip"],
        "notes": "bundle_id sets instance size (e.g. nano_2_0, micro_2_0). blueprint_id sets the OS/app (e.g. amazon_linux_2).",
    },

    # ── Load Balancing ────────────────────────────────────────────────────────
    "alb": {
        "primary": ["aws_lb"],
        "companions": ["aws_lb_listener", "aws_lb_target_group"],
        "key_vars": ["alb_name"],
        "outputs": ["alb_dns_name", "alb_arn", "alb_target_group_arn"],
        "notes": "Set load_balancer_type='application'. Always generate aws_lb_listener (port 80 redirect + port 443 HTTPS forward) and aws_lb_target_group. HTTPS listener requires an ACM certificate ARN.",
    },
    "nlb": {
        "primary": ["aws_lb"],
        "companions": ["aws_lb_listener", "aws_lb_target_group"],
        "key_vars": ["nlb_name"],
        "outputs": ["nlb_dns_name", "nlb_arn"],
        "notes": "Set load_balancer_type='network'. NLB target groups use protocol TCP/UDP/TLS. NLBs do not use security groups.",
    },
    "api_gateway": {
        "primary": ["aws_apigatewayv2_api"],
        "companions": ["aws_apigatewayv2_stage", "aws_apigatewayv2_integration", "aws_lambda_permission"],
        "key_vars": ["api_name", "api_protocol_type"],
        "outputs": ["api_endpoint", "api_id", "api_execution_arn"],
        "notes": "For HTTP APIs use aws_apigatewayv2_api with protocol_type='HTTP'. Always generate a $default stage with auto_deploy=true. If integrating with Lambda, generate aws_lambda_permission with action='lambda:InvokeFunction'.",
    },

    # ── Storage ───────────────────────────────────────────────────────────────
    "s3": {
        "primary": ["aws_s3_bucket"],
        "companions": [
            "aws_s3_bucket_versioning",
            "aws_s3_bucket_server_side_encryption_configuration",
            "aws_s3_bucket_public_access_block",
        ],
        "key_vars": ["bucket_name"],
        "outputs": ["bucket_id", "bucket_arn", "bucket_domain_name", "bucket_regional_domain_name"],
        "notes": "ALWAYS generate aws_s3_bucket_public_access_block with all four block_* attributes set to true (unless explicitly public). ALWAYS generate server_side_encryption_configuration using aws:kms or AES256.",
    },
    "s3_glacier": {
        "primary": ["aws_s3_bucket"],
        "companions": [
            "aws_s3_bucket_lifecycle_configuration",
            "aws_s3_bucket_server_side_encryption_configuration",
            "aws_s3_bucket_public_access_block",
        ],
        "key_vars": ["bucket_name", "glacier_transition_days"],
        "outputs": ["bucket_id", "bucket_arn"],
        "notes": "S3 Glacier is implemented as an S3 bucket with lifecycle rules that transition objects to GLACIER or DEEP_ARCHIVE storage class. Generate aws_s3_bucket_lifecycle_configuration with a rule block: transition { days = var.glacier_transition_days storage_class = \"GLACIER\" }. ALWAYS generate aws_s3_bucket_public_access_block with all four block_* attributes true. Set encrypted=true with AES256 or aws:kms.",
    },
    "ebs": {
        "primary": ["aws_ebs_volume"],
        "companions": ["aws_volume_attachment"],
        "key_vars": ["ebs_size_gb", "ebs_type", "availability_zone"],
        "outputs": ["ebs_volume_id", "ebs_volume_arn"],
        "notes": "Set encrypted=true. type must be one of: gp3 (preferred), gp2, io1, io2, st1, sc1. Generate aws_volume_attachment to attach to an EC2 instance.",
    },
    "efs": {
        "primary": ["aws_efs_file_system"],
        "companions": ["aws_efs_mount_target", "aws_efs_access_point"],
        "key_vars": [],
        "outputs": ["efs_id", "efs_dns_name", "efs_arn"],
        "notes": "Generate one aws_efs_mount_target per availability zone subnet. Set encrypted=true and kms_key_id. performance_mode: generalPurpose or maxIO.",
    },
    "fsx": {
        "primary": ["aws_fsx_lustre_file_system"],
        "companions": [],
        "key_vars": ["fsx_storage_capacity", "fsx_subnet_id"],
        "outputs": ["fsx_id", "fsx_dns_name"],
        "notes": "For Windows workloads use aws_fsx_windows_file_system instead. For ONTAP use aws_fsx_ontap_file_system. deployment_type determines HA vs single-AZ.",
    },
    "backup": {
        "primary": ["aws_backup_vault", "aws_backup_plan"],
        "companions": ["aws_backup_selection", "aws_iam_role"],
        "key_vars": [],
        "outputs": ["backup_vault_arn", "backup_plan_arn"],
        "notes": "Always generate aws_backup_selection with iam_role_arn using the AWSBackupDefaultServiceRole. Include lifecycle rules for cold storage transition and deletion.",
    },
    "storage_gateway": {
        "primary": ["aws_storagegateway_gateway"],
        "companions": [],
        "key_vars": ["gateway_name", "gateway_type"],
        "outputs": ["gateway_arn", "gateway_id"],
        "notes": "gateway_type must be FILE_S3, FILE_FSX_SMB, TAPE, or CACHED/STORED (volume gateways). activation_key must be obtained out-of-band from the appliance.",
    },

    # ── Database ──────────────────────────────────────────────────────────────
    "rds": {
        "primary": ["aws_db_instance"],
        "companions": ["aws_db_subnet_group", "aws_db_parameter_group"],
        "key_vars": ["db_identifier", "db_engine", "db_engine_version", "db_instance_class", "db_name", "db_username"],
        "outputs": ["db_endpoint", "db_port", "db_instance_id", "db_arn"],
        "notes": "MUST generate aws_db_subnet_group referencing subnets in at least 2 different AZs. Password MUST use var.db_password — never hardcoded. Set deletion_protection=true and backup_retention_period>=7.",
    },
    "aurora": {
        "primary": ["aws_rds_cluster", "aws_rds_cluster_instance"],
        "companions": ["aws_db_subnet_group"],
        "key_vars": ["aurora_cluster_id", "aurora_engine", "aurora_master_username"],
        "outputs": ["aurora_cluster_endpoint", "aurora_reader_endpoint", "aurora_cluster_arn"],
        "notes": "Generate at least 2 aws_rds_cluster_instance resources across different AZs using count or for_each. engine must be aurora-mysql or aurora-postgresql. Password via var — never hardcoded.",
    },
    "dynamodb": {
        "primary": ["aws_dynamodb_table"],
        "companions": [],
        "key_vars": ["table_name", "hash_key"],
        "outputs": ["dynamodb_table_name", "dynamodb_table_arn", "dynamodb_stream_arn"],
        "notes": "For on-demand use billing_mode='PAY_PER_REQUEST' (no read/write_capacity). For provisioned set both. Enable point_in_time_recovery and server_side_encryption with KMS.",
    },
    "elasticache": {
        "primary": ["aws_elasticache_replication_group"],
        "companions": ["aws_elasticache_subnet_group"],
        "key_vars": ["elasticache_cluster_id", "elasticache_node_type", "elasticache_engine"],
        "outputs": ["elasticache_primary_endpoint", "elasticache_reader_endpoint", "elasticache_arn"],
        "notes": "MUST generate aws_elasticache_subnet_group. For Redis use aws_elasticache_replication_group (not cluster). Set automatic_failover_enabled=true for multi-AZ. at_rest_encryption_enabled=true and transit_encryption_enabled=true.",
    },
    "redshift": {
        "primary": ["aws_redshift_cluster"],
        "companions": ["aws_redshift_subnet_group"],
        "key_vars": ["redshift_cluster_id", "redshift_node_type", "redshift_db_name", "redshift_master_username"],
        "outputs": ["redshift_endpoint", "redshift_cluster_id"],
        "notes": "MUST generate aws_redshift_subnet_group. Master password via var — never hardcoded. Set encrypted=true and automated_snapshot_retention_period>=7.",
    },
    "documentdb": {
        "primary": ["aws_docdb_cluster", "aws_docdb_cluster_instance"],
        "companions": ["aws_docdb_subnet_group"],
        "key_vars": ["docdb_cluster_id", "docdb_master_username"],
        "outputs": ["docdb_cluster_endpoint", "docdb_reader_endpoint"],
        "notes": "Generate at least 2 aws_docdb_cluster_instance resources. Master password via var. MUST generate aws_docdb_subnet_group.",
    },
    "neptune": {
        "primary": ["aws_neptune_cluster", "aws_neptune_cluster_instance"],
        "companions": ["aws_neptune_subnet_group", "aws_neptune_parameter_group"],
        "key_vars": ["neptune_cluster_id"],
        "outputs": ["neptune_cluster_endpoint", "neptune_reader_endpoint"],
        "notes": "Generate aws_neptune_subnet_group and aws_neptune_parameter_group. Neptune does not use username/password — uses IAM auth or graph DB users.",
    },
    "opensearch": {
        "primary": ["aws_opensearch_domain"],
        "companions": ["aws_opensearch_domain_policy"],
        "key_vars": ["opensearch_domain_name", "opensearch_engine_version", "opensearch_instance_type"],
        "outputs": ["opensearch_endpoint", "opensearch_arn", "opensearch_domain_id"],
        "notes": "Always generate aws_opensearch_domain_policy granting access. Set encrypt_at_rest.enabled=true and node_to_node_encryption.enabled=true. engine_version format: 'OpenSearch_2.11'.",
    },
    "timestream": {
        "primary": ["aws_timestreamwrite_database", "aws_timestreamwrite_table"],
        "companions": [],
        "key_vars": ["timestream_db_name", "timestream_table_name"],
        "outputs": ["timestream_database_arn", "timestream_table_arn"],
        "notes": "Generate both aws_timestreamwrite_database and aws_timestreamwrite_table. Set magnetic_store_write_properties and retention_properties on the table.",
    },
    "memorydb": {
        "primary": ["aws_memorydb_cluster"],
        "companions": ["aws_memorydb_subnet_group"],
        "key_vars": ["memorydb_cluster_name", "memorydb_node_type"],
        "outputs": ["memorydb_cluster_endpoint", "memorydb_arn"],
        "notes": "MUST generate aws_memorydb_subnet_group. Set tls_enabled=true. MemoryDB is Redis-compatible but uses a different resource than ElastiCache.",
    },

    # ── Security / Identity ───────────────────────────────────────────────────
    "security_group": {
        "primary": ["aws_security_group"],
        "companions": [],
        "key_vars": [],
        "outputs": ["security_group_id"],
        "notes": "Never use the default VPC security group. Always reference other security groups by resource ID (not hardcoded). Avoid 0.0.0.0/0 ingress except for port 80/443 on public-facing resources.",
    },
    "iam_role": {
        "primary": ["aws_iam_role"],
        "companions": ["aws_iam_policy", "aws_iam_role_policy_attachment"],
        "key_vars": ["role_name"],
        "outputs": ["role_arn", "role_name"],
        "notes": "Always use assume_role_policy with a proper trust relationship. Attach policies via aws_iam_role_policy_attachment (managed) or aws_iam_role_policy (inline). Never use AdministratorAccess in production.",
    },
    "kms_key": {
        "primary": ["aws_kms_key"],
        "companions": ["aws_kms_alias"],
        "key_vars": [],
        "outputs": ["kms_key_id", "kms_key_arn"],
        "notes": "Always generate aws_kms_alias named alias/<service>-<purpose>. Set enable_key_rotation=true and deletion_window_in_days=30.",
    },
    "cognito": {
        "primary": ["aws_cognito_user_pool"],
        "companions": ["aws_cognito_user_pool_client", "aws_cognito_user_pool_domain"],
        "key_vars": ["cognito_pool_name"],
        "outputs": ["user_pool_id", "user_pool_arn", "user_pool_endpoint", "user_pool_client_id"],
        "notes": "Always generate aws_cognito_user_pool_client alongside the pool. Set password_policy, account_recovery_setting, and mfa_configuration. Generate aws_cognito_user_pool_domain for hosted UI.",
    },
    "acm": {
        "primary": ["aws_acm_certificate"],
        "companions": ["aws_acm_certificate_validation", "aws_route53_record"],
        "key_vars": ["acm_domain_name"],
        "outputs": ["certificate_arn"],
        "notes": "Always use validation_method='DNS'. Generate aws_route53_record for the DNS validation CNAME and aws_acm_certificate_validation to wait for issuance. For CloudFront, ACM cert must be in us-east-1.",
    },
    "secretsmanager": {
        "primary": ["aws_secretsmanager_secret"],
        "companions": ["aws_secretsmanager_secret_version"],
        "key_vars": ["secret_name"],
        "outputs": ["secret_arn", "secret_id"],
        "notes": "Always generate aws_secretsmanager_secret_version with secret_string as a JSON-encoded map using jsonencode(). Set recovery_window_in_days=30. Reference secret values with data.aws_secretsmanager_secret_version.",
    },
    "guardduty": {
        "primary": ["aws_guardduty_detector"],
        "companions": [],
        "key_vars": [],
        "outputs": ["guardduty_detector_id"],
        "notes": "Set enable=true. Enable S3 protection via datasources.s3_logs.enable=true and EKS protection via datasources.kubernetes.audit_logs.enable=true.",
    },
    "cloudtrail": {
        "primary": ["aws_cloudtrail"],
        "companions": ["aws_s3_bucket", "aws_cloudwatch_log_group"],
        "key_vars": ["trail_name"],
        "outputs": ["cloudtrail_arn", "cloudtrail_home_region"],
        "notes": "Set is_multi_region_trail=true, include_global_service_events=true, enable_log_file_validation=true. Requires an S3 bucket with a specific bucket policy allowing CloudTrail writes.",
    },
    "inspector": {
        "primary": ["aws_inspector2_enabler"],
        "companions": [],
        "key_vars": [],
        "outputs": [],
        "notes": "aws_inspector2_enabler enables Inspector v2. resource_types list must include EC2, ECR, and/or LAMBDA. account_ids must include the current account.",
    },
    "security_hub": {
        "primary": ["aws_securityhub_account"],
        "companions": ["aws_securityhub_standards_subscription"],
        "key_vars": [],
        "outputs": [],
        "notes": "Always subscribe to at least aws:foundational-security-best-practices standard via aws_securityhub_standards_subscription after enabling the account.",
    },
    "macie": {
        "primary": ["aws_macie2_account"],
        "companions": [],
        "key_vars": [],
        "outputs": [],
        "notes": "Set finding_publishing_frequency='FIFTEEN_MINUTES' and status='ENABLED'. Create aws_macie2_classification_job for ongoing S3 bucket scanning.",
    },
    "config": {
        "primary": ["aws_config_configuration_recorder"],
        "companions": ["aws_config_delivery_channel", "aws_s3_bucket", "aws_iam_role"],
        "key_vars": [],
        "outputs": ["config_recorder_id"],
        "notes": "Requires IAM role with AWSConfigRole policy, an S3 bucket for config history, and both recorder + delivery_channel resources. Set recording_group.all_supported=true.",
    },
    "systems_manager": {
        "primary": ["aws_ssm_parameter"],
        "companions": [],
        "key_vars": ["ssm_parameter_name"],
        "outputs": ["ssm_parameter_arn", "ssm_parameter_name"],
        "notes": "Use type='SecureString' for sensitive values with key_id pointing to a KMS key. Use aws_ssm_document for runbooks. Use aws_ssm_association for fleet management.",
    },
    "xray": {
        "primary": ["aws_xray_group"],
        "companions": ["aws_xray_sampling_rule"],
        "key_vars": ["xray_group_name"],
        "outputs": ["xray_group_arn"],
        "notes": "Set filter_expression to scope traces (e.g. service(\"my-service\")). Generate aws_xray_sampling_rule with reservoir_size and fixed_rate. X-Ray tracing is enabled on Lambda/API GW at the service level.",
    },

    # ── Messaging / Events ────────────────────────────────────────────────────
    "sns": {
        "primary": ["aws_sns_topic"],
        "companions": ["aws_sns_topic_subscription"],
        "key_vars": ["sns_topic_name"],
        "outputs": ["sns_topic_arn", "sns_topic_name"],
        "notes": "Generate one aws_sns_topic_subscription per downstream subscriber. Set kms_master_key_id for encryption. For FIFO topics append .fifo to the name and set fifo_topic=true.",
    },
    "sqs": {
        "primary": ["aws_sqs_queue"],
        "companions": ["aws_sqs_queue_policy"],
        "key_vars": ["sqs_queue_name"],
        "outputs": ["sqs_queue_url", "sqs_queue_arn"],
        "notes": "Always generate a dead-letter queue (aws_sqs_queue) and set redrive_policy on the main queue. Set kms_master_key_id for encryption. FIFO queues must end in .fifo.",
    },
    "eventbridge": {
        "primary": ["aws_cloudwatch_event_rule"],
        "companions": ["aws_cloudwatch_event_target"],
        "key_vars": ["event_rule_name"],
        "outputs": ["event_rule_arn"],
        "notes": "For scheduled rules use schedule_expression (rate() or cron()). For event pattern rules use event_pattern JSON. Always generate aws_cloudwatch_event_target to define where events are sent.",
    },
    "mq": {
        "primary": ["aws_mq_broker"],
        "companions": [],
        "key_vars": ["mq_broker_name", "mq_engine_type", "mq_instance_type"],
        "outputs": ["mq_broker_arn", "mq_broker_id", "mq_primary_endpoint"],
        "notes": "engine_type must be ACTIVEMQ or RABBITMQ. Set deployment_mode: SINGLE_INSTANCE or ACTIVE_STANDBY_MULTI_AZ. Credentials via user blocks with username/password from variables.",
    },
    "msk": {
        "primary": ["aws_msk_cluster"],
        "companions": ["aws_msk_configuration"],
        "key_vars": ["msk_cluster_name", "msk_kafka_version", "msk_instance_type"],
        "outputs": ["msk_cluster_arn", "msk_bootstrap_brokers", "msk_bootstrap_brokers_tls"],
        "notes": "Always set encryption_info with client_broker='TLS' and at_rest encryption. Generate aws_msk_configuration for custom Kafka settings. broker_node_group_info requires 3 subnets across AZs.",
    },
    "kinesis": {
        "primary": ["aws_kinesis_stream"],
        "companions": [],
        "key_vars": ["stream_name", "shard_count"],
        "outputs": ["kinesis_stream_arn", "kinesis_stream_name"],
        "notes": "For on-demand throughput use stream_mode_details with stream_mode='ON_DEMAND' (no shard_count needed). Set retention_period=24 to 8760 hours.",
    },
    "kinesis_firehose": {
        "primary": ["aws_kinesis_firehose_delivery_stream"],
        "companions": ["aws_iam_role"],
        "key_vars": ["firehose_stream_name", "firehose_destination"],
        "outputs": ["firehose_stream_arn", "firehose_stream_name"],
        "notes": "destination must be one of: s3, extended_s3, redshift, opensearch, splunk, http_endpoint. Always generate an IAM role with permissions to write to the destination.",
    },

    # ── Monitoring ────────────────────────────────────────────────────────────
    "cloudwatch": {
        "primary": ["aws_cloudwatch_log_group"],
        "companions": ["aws_cloudwatch_metric_alarm", "aws_cloudwatch_dashboard"],
        "key_vars": ["log_group_name"],
        "outputs": ["log_group_arn", "log_group_name"],
        "notes": "Always set retention_in_days (e.g. 30, 60, 90). Generate aws_cloudwatch_metric_alarm for key application metrics with SNS action. Never leave retention_in_days unset (results in infinite retention).",
    },

    # ── Workflow ───────────────────────────────────────────────────────────────
    "step_functions": {
        "primary": ["aws_sfn_state_machine"],
        "companions": ["aws_iam_role"],
        "key_vars": ["state_machine_name", "state_machine_type"],
        "outputs": ["state_machine_arn", "state_machine_name"],
        "notes": "type must be STANDARD or EXPRESS. IAM role must have permissions for every service the state machine calls. definition must be a valid JSON state machine definition using jsonencode().",
    },

    # ── DevOps ─────────────────────────────────────────────────────────────────
    "codepipeline": {
        "primary": ["aws_codepipeline"],
        "companions": ["aws_s3_bucket", "aws_iam_role"],
        "key_vars": ["pipeline_name"],
        "outputs": ["pipeline_arn", "pipeline_id"],
        "notes": "Requires an S3 artifact bucket and an IAM role with codepipeline:* + s3:* + codestar-connections:UseConnection. Define stages as Source, Build, Deploy minimum.",
    },
    "codebuild": {
        "primary": ["aws_codebuild_project"],
        "companions": ["aws_iam_role", "aws_cloudwatch_log_group"],
        "key_vars": ["codebuild_project_name"],
        "outputs": ["codebuild_project_arn", "codebuild_project_name"],
        "notes": "IAM role needs codebuild:*, logs:*, ecr:*, s3:* permissions. Always define logs_config pointing to the CloudWatch log group. environment image must be a valid CodeBuild image URN.",
    },
    "codedeploy": {
        "primary": ["aws_codedeploy_app", "aws_codedeploy_deployment_group"],
        "companions": ["aws_iam_role"],
        "key_vars": ["codedeploy_app_name"],
        "outputs": ["codedeploy_app_arn"],
        "notes": "compute_platform must be Server, Lambda, or ECS. IAM role must have AWSCodeDeployRole. deployment_group needs auto_rollback_configuration and alarm_configuration.",
    },
    "codecommit": {
        "primary": ["aws_codecommit_repository"],
        "companions": [],
        "key_vars": ["repository_name"],
        "outputs": ["codecommit_repository_arn", "codecommit_clone_url_http"],
        "notes": "Set default_branch='main'. CodeCommit is regional; generate aws_codecommit_trigger for SNS/Lambda notifications on push events.",
    },
    "cloudformation": {
        "primary": ["aws_cloudformation_stack"],
        "companions": [],
        "key_vars": ["stack_name", "template_url"],
        "outputs": ["cloudformation_stack_id", "cloudformation_outputs"],
        "notes": "Use template_url pointing to S3 (preferred) or template_body for inline. Set on_failure='ROLLBACK'. Output stack outputs via aws_cloudformation_stack.<name>.outputs[\"Key\"].",
    },

    # ── Analytics ──────────────────────────────────────────────────────────────
    "glue": {
        "primary": ["aws_glue_catalog_database", "aws_glue_crawler", "aws_glue_job"],
        "companions": ["aws_iam_role"],
        "key_vars": ["glue_database_name"],
        "outputs": ["glue_catalog_database_arn"],
        "notes": "IAM role must have AWSGlueServiceRole policy. Crawler role_arn must have S3 read access. glue_version should be '4.0'. Set max_retries=0 and timeout on jobs.",
    },
    "athena": {
        "primary": ["aws_athena_workgroup"],
        "companions": ["aws_athena_database", "aws_s3_bucket"],
        "key_vars": ["athena_workgroup_name"],
        "outputs": ["athena_workgroup_arn"],
        "notes": "Always generate an S3 results bucket and configure it in result_configuration.output_location. Set enforce_workgroup_configuration=true and publish_cloudwatch_metrics_enabled=true.",
    },
    "emr": {
        "primary": ["aws_emr_cluster"],
        "companions": ["aws_iam_role", "aws_iam_instance_profile", "aws_s3_bucket"],
        "key_vars": ["emr_cluster_name", "emr_release_label"],
        "outputs": ["emr_cluster_id", "emr_master_public_dns"],
        "notes": "Requires two IAM roles: service role (AmazonElasticMapReduceRole) and EC2 instance profile (AmazonElasticMapReduceforEC2Role). release_label format: 'emr-7.0.0'. S3 bucket for logs.",
    },
    "quicksight": {
        "primary": ["aws_quicksight_account_subscription"],
        "companions": [],
        "key_vars": ["quicksight_account_name"],
        "outputs": [],
        "notes": "QuickSight resources are limited in Terraform. Use aws_quicksight_account_subscription for account setup. Most QuickSight configuration (datasets, analyses) must be done via console or API.",
    },
    "lakeformation": {
        "primary": ["aws_lakeformation_data_lake_settings"],
        "companions": ["aws_lakeformation_resource"],
        "key_vars": [],
        "outputs": [],
        "notes": "Register S3 locations with aws_lakeformation_resource. Set admins in aws_lakeformation_data_lake_settings. Grant permissions via aws_lakeformation_permissions.",
    },

    # ── AI / ML ────────────────────────────────────────────────────────────────
    "sagemaker": {
        "primary": ["aws_sagemaker_endpoint"],
        "companions": ["aws_sagemaker_endpoint_configuration", "aws_sagemaker_model", "aws_iam_role"],
        "key_vars": ["sagemaker_endpoint_name"],
        "outputs": ["sagemaker_endpoint_arn", "sagemaker_endpoint_name"],
        "notes": "Must generate in order: aws_sagemaker_model → aws_sagemaker_endpoint_configuration → aws_sagemaker_endpoint. IAM role needs AmazonSageMakerFullAccess. execution_role_arn is required on the model.",
    },
    "bedrock": {
        "primary": [],
        "companions": ["aws_iam_role", "aws_iam_policy"],
        "key_vars": [],
        "outputs": [],
        "notes": "Amazon Bedrock is fully managed — no infrastructure to provision. Generate IAM policies granting bedrock:InvokeModel and bedrock:InvokeModelWithResponseStream to the caller role/service.",
    },
    "rekognition": {
        "primary": [],
        "companions": ["aws_iam_policy"],
        "key_vars": [],
        "outputs": [],
        "notes": "Amazon Rekognition is fully managed — no infrastructure to provision. Generate IAM policies granting rekognition:DetectLabels, rekognition:RecognizeCelebrities, etc. as needed.",
    },
    "comprehend": {
        "primary": [],
        "companions": ["aws_iam_policy"],
        "key_vars": [],
        "outputs": [],
        "notes": "Amazon Comprehend is fully managed — no infrastructure to provision. Generate IAM policies granting comprehend:DetectEntities, comprehend:DetectSentiment, etc. as needed.",
    },
    "textract": {
        "primary": [],
        "companions": ["aws_iam_policy"],
        "key_vars": [],
        "outputs": [],
        "notes": "Amazon Textract is fully managed. Generate IAM policies granting textract:AnalyzeDocument and textract:DetectDocumentText. For async operations also grant textract:GetDocumentAnalysis.",
    },
    "polly": {
        "primary": [],
        "companions": ["aws_iam_policy"],
        "key_vars": [],
        "outputs": [],
        "notes": "Amazon Polly is fully managed. Generate IAM policies granting polly:SynthesizeSpeech and polly:DescribeVoices. Lexicons can be managed via aws_polly_lexicon.",
    },
    "translate": {
        "primary": [],
        "companions": ["aws_iam_policy"],
        "key_vars": [],
        "outputs": [],
        "notes": "Amazon Translate is fully managed. Generate IAM policies granting translate:TranslateText and translate:GetTerminology. Custom terminology managed via aws_translate_terminology.",
    },
    "lex": {
        "primary": ["aws_lex_bot"],
        "companions": ["aws_iam_role"],
        "key_vars": ["lex_bot_name"],
        "outputs": ["lex_bot_arn", "lex_bot_name"],
        "notes": "Use aws_lexv2models_bot for Lex V2 (preferred). Lex V1 aws_lex_bot is legacy. IAM role needs AmazonLexFullAccess. child_directed must be explicitly set to true or false.",
    },

    # ── Integration ────────────────────────────────────────────────────────────
    "appsync": {
        "primary": ["aws_appsync_graphql_api"],
        "companions": ["aws_appsync_datasource", "aws_iam_role"],
        "key_vars": ["appsync_api_name", "appsync_auth_type"],
        "outputs": ["appsync_graphql_url", "appsync_api_id"],
        "notes": "authentication_type must be API_KEY, AWS_IAM, AMAZON_COGNITO_USER_POOLS, or OPENID_CONNECT. Generate aws_appsync_datasource for each backend (Lambda/DynamoDB/RDS). schema must be a valid GraphQL SDL string.",
    },
}


# ─── System Prompt ─────────────────────────────────────────────────────────────
_SYSTEM_PROMPT = (
    "You are a senior Terraform engineer. Your sole task is to generate valid,"
    " production-ready HCL from the architecture description provided.\n\n"
    "CORE RULES:\n"
    "- Output raw HCL only. No markdown, no explanation, no code fences.\n"
    "- All security groups must be separate aws_security_group resources.\n"
    "- Reference security groups by resource reference, never by hardcoded ID.\n"
    "- All IAM roles must be separate aws_iam_role resources with attached policies.\n"
    "- Use meaningful Terraform resource names (snake_case, descriptive).\n"
    "- Organize blocks: terraform{} and provider{} first, then variable{} blocks,"
    " then data{} blocks, then resource{} blocks, then output{} blocks last.\n"
    "- Include a terraform{} block with required_providers (hashicorp/aws) and an"
    " S3 backend configuration using variables for bucket/key/region.\n"
    "- Include output{} blocks for every resource listed in the component's"
    " → outputs hints.\n"
    "- If a component lists config values, reproduce those attribute key-value"
    " pairs exactly in the generated HCL resource block.\n\n"
    "COMPANION RESOURCE RULES — these must never be omitted:\n"
    "- Lambda: MUST include aws_iam_role with AWSLambdaBasicExecutionRole AND"
    " aws_cloudwatch_log_group named /aws/lambda/<function_name>.\n"
    "- RDS / Aurora: MUST include aws_db_subnet_group referencing subnets in at"
    " least 2 AZs. Database passwords MUST use var.* — never hardcoded strings.\n"
    "- ECS Fargate: MUST include task execution IAM role with"
    " AmazonECSTaskExecutionRolePolicy. Task definition MUST set"
    " network_mode='awsvpc' and launch_type='FARGATE'.\n"
    "- EKS: Node IAM role MUST have three separate policy attachments:"
    " AmazonEKSWorkerNodePolicy, AmazonEKS_CNI_Policy,"
    " AmazonEC2ContainerRegistryReadOnly.\n"
    "- S3: MUST include aws_s3_bucket_public_access_block (all four block_*=true"
    " unless explicitly public) AND aws_s3_bucket_server_side_encryption_configuration.\n"
    "- ALB: MUST include aws_lb_listener (port 443 forward to target group) AND"
    " aws_lb_target_group. HTTP port 80 listener should redirect to HTTPS.\n"
    "- NAT Gateway: MUST include aws_eip resource; set allocation_id ="
    " aws_eip.<name>.id.\n"
    "- ElastiCache / MemoryDB / Redshift / DocumentDB / Neptune:"
    " MUST include the corresponding *_subnet_group resource.\n"
    "- ACM certificates: MUST use validation_method='DNS' with"
    " aws_acm_certificate_validation.\n"
    "- Every secret/password/API key: MUST use var.* — never hardcode sensitive"
    " values.\n\n"
    "VARIABLE RULES:\n"
    "- Generate a variable{} block for every attribute listed in the component's"
    " → variables hints.\n"
    "- Variables for sensitive values (passwords, tokens, keys) must set"
    " sensitive=true.\n"
    "- All variable{} blocks must include a description.\n\n"
    "RESOURCE HINTS:\n"
    "Each component in the user prompt includes → primary, → companions,"
    " → variables, and → outputs lines. Use these as authoritative guidance for"
    " exactly which Terraform resources to generate, which companion resources are"
    " required, which attributes to parameterize, and which outputs to emit."
)

_MAX_LABEL_LEN = 200
_MAX_CONFIG_VAL_LEN = 800


def _sanitize(value: str) -> str:
    return str(value).strip()[:_MAX_LABEL_LEN]


def _serialize_config_value(v) -> str:
    """Serialize a config value for the LLM prompt.
    Dicts and lists are JSON-encoded so nested blocks are legible.
    """
    if isinstance(v, (dict, list)):
        return json.dumps(v, default=str)[:_MAX_CONFIG_VAL_LEN]
    return str(v)[:_MAX_CONFIG_VAL_LEN]


def _get_resource_hint(component_type: str) -> list[str]:
    """Return hint lines for a given canvas component type using _AWS_RESOURCE_MAP."""
    spec = _AWS_RESOURCE_MAP.get(component_type)
    if not spec:
        return []
    lines = []
    if spec["primary"]:
        lines.append(f"    → primary: {', '.join(spec['primary'])}")
    else:
        lines.append("    → primary: (managed service — no TF resource to provision)")
    if spec["companions"]:
        lines.append(f"    → companions: {', '.join(spec['companions'])}")
    if spec["key_vars"]:
        lines.append(f"    → variables: {', '.join('var.' + v for v in spec['key_vars'])}")
    if spec["outputs"]:
        lines.append(f"    → outputs: {', '.join(spec['outputs'])}")
    if spec.get("notes"):
        lines.append(f"    → note: {spec['notes']}")
    return lines


def _serialize_components(components) -> str:
    if not components:
        return "(none)"
    lines = []
    for c in components:
        lines.append(f"- [{_sanitize(c.type)}] {_sanitize(c.label)} (id: {c.id})")
        for k, v in (c.config or {}).items():
            lines.append(f"    {_sanitize(str(k))}: {_serialize_config_value(v)}")
        if c.security_group_ids:
            lines.append(f"    security_group_ids: {', '.join(c.security_group_ids)}")
        if c.iam_role_id:
            lines.append(f"    iam_role_id: {c.iam_role_id}")
        if c.subnet_id:
            lines.append(f"    subnet_id: {c.subnet_id}")
        if c.vpc_id:
            lines.append(f"    vpc_id: {c.vpc_id}")
        if getattr(c, "instructions", None):
            lines.append(f"    instructions: {_sanitize(c.instructions)}")
        # Inject deterministic resource hints from the map
        hint_lines = _get_resource_hint(c.type)
        lines.extend(hint_lines)
    return "\n".join(lines)


def _serialize_security_groups(sgs) -> str:
    if not sgs:
        return "(none)"
    lines = []
    for sg in sgs:
        lines.append(
            f"- {_sanitize(sg.name)} (id: {sg.id}, vpc: {sg.vpc_id or 'unset'})"
        )
        if sg.description:
            lines.append(f"    description: {_sanitize(sg.description)}")
        for rule in sg.inbound:
            port_str = str(rule.port) if rule.port is not None else "all"
            src = _sanitize(rule.source)
            lines.append(
                f"    inbound: protocol={rule.protocol} port={port_str} source={src}"
            )
        for rule in sg.outbound:
            port_str = str(rule.port) if rule.port is not None else "all"
            dst = _sanitize(rule.source)
            lines.append(
                f"    outbound: protocol={rule.protocol} port={port_str}"
                f" destination={dst}"
            )
    return "\n".join(lines)


def _serialize_iam_roles(roles) -> str:
    if not roles:
        return "(none)"
    lines = []
    for role in roles:
        lines.append(f"- {_sanitize(role.name)} (id: {role.id})")
        if role.description:
            lines.append(f"    description: {_sanitize(role.description)}")
        for policy in role.policies:
            lines.append(f"    policy effect={policy.effect}")
            for action in policy.actions:
                lines.append(f"      action: {_sanitize(action)}")
            for res in policy.resources:
                lines.append(f"      resource: {_sanitize(res)}")
    return "\n".join(lines)


def _serialize_edges(edges) -> str:
    if not edges:
        return "(none)"
    lines = []
    for e in edges:
        edge_type = getattr(e, "edge_type", "default")
        label = getattr(e, "label", "") or ""
        label_str = f" ({_sanitize(label)})" if label else ""
        lines.append(f"- {e.source} -> {e.target} [{edge_type}]{label_str}")
    return "\n".join(lines)


def build_architecture_context(graph: Graph) -> str:
    return (
        f"Architecture: {graph.name}\n"
        f"Region: {graph.region}\n\n"
        f"Components:\n{_serialize_components(graph.components)}\n\n"
        f"Connections:\n{_serialize_edges(graph.edges)}\n\n"
        f"Security Groups:\n{_serialize_security_groups(graph.security_groups)}\n\n"
        f"IAM Roles:\n{_serialize_iam_roles(graph.iam_roles)}"
    )


def build_prompt(graph: Graph) -> tuple[str, str]:
    system = _SYSTEM_PROMPT
    user = (
        f"Architecture: {graph.name}\n"
        f"Region: {graph.region}\n\n"
        f"Components:\n{_serialize_components(graph.components)}\n\n"
        f"Connections:\n{_serialize_edges(graph.edges)}\n\n"
        f"Security Groups:\n{_serialize_security_groups(graph.security_groups)}\n\n"
        f"IAM Roles:\n{_serialize_iam_roles(graph.iam_roles)}\n\n"
        "Generate the Terraform HCL now."
    )
    return system, user
