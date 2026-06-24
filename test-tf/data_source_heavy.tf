###############################################################################
# DATA-SOURCE-HEAVY FIXTURE — "ObservaCo" Analytics & Observability Platform
#
# Purpose: Exercise every data-source handling path in tf_import_catalog.py
#
#   METADATA data sources (merged into importer metadata, not canvas nodes):
#     aws_caller_identity, aws_region, aws_partition, aws_availability_zones,
#     aws_canonical_user_id, aws_default_tags, aws_iam_policy_document,
#     aws_iam_session_context, aws_arn, aws_service
#
#   SELECTION / filter data sources (merged into referencing resources):
#     aws_ami, aws_ami_ids, aws_subnets, aws_subnet, aws_vpc,
#     aws_security_group, aws_security_groups, aws_kms_key, aws_kms_alias,
#     aws_kms_secrets, aws_secretsmanager_secret, aws_secretsmanager_secret_version,
#     aws_ssm_parameter, aws_elb_service_account, aws_route53_zone,
#     aws_acm_certificate, aws_lb, aws_lb_listener, aws_nat_gateway,
#     aws_ecr_image, aws_ecr_repository,
#     aws_cloudfront_log_delivery_canonical_user_id
#
#   EDGE CASES:
#     - Data source referenced by multiple resources (fan-out merge)
#     - Data source never referenced (data_skipped action expected)
#     - Data source referenced only in locals{} (should still merge via
#       string interpolation scan)
#     - Same data type, multiple named instances
#     - Data source used in for_each / dynamic blocks
#     - Orphan companion resources (no primary found)
#
# Business context:
#   A 150-person observability SaaS, ingesting metrics/logs/traces for 500+
#   customers. Built on top of existing shared networking (cross-account refs
#   via data sources). Assumes VPC, subnets, and KMS keys live in a
#   separate "platform" account and are looked up, not created.
###############################################################################

terraform {
  required_version = ">= 1.6.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.40"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
  }

  backend "s3" {
    bucket = "observaco-tfstate"
    key    = "prod/terraform.tfstate"
    region = "us-west-2"
  }
}

provider "aws" { region = "us-west-2" }

provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}

###############################################################################
# VARIABLES
###############################################################################

variable "environment"    { type = string; default = "prod" }
variable "company"        { type = string; default = "observaco" }
variable "platform_vpc_id" {
  description = "VPC ID from the shared platform account (looked up via data source)"
  type        = string
  default     = "vpc-0platform12345"
}
variable "allowed_cidr_blocks" {
  type    = list(string)
  default = ["10.0.0.0/8"]
}

###############################################################################
# ── METADATA DATA SOURCES ────────────────────────────────────────────────────
# These should NOT appear as canvas nodes. They fold into importer metadata.
###############################################################################

# 1. aws_caller_identity — account/user info
data "aws_caller_identity" "current" {}

# 2. aws_region — current region
data "aws_region" "current" {}

# 3. aws_partition — govcloud vs commercial
data "aws_partition" "current" {}

# 4. aws_availability_zones — dynamic AZ list
data "aws_availability_zones" "available" {
  state = "available"
  filter {
    name   = "opt-in-status"
    values = ["opt-in-not-required"]
  }
}

# 5. aws_canonical_user_id — needed for S3 ACL grants
data "aws_canonical_user_id" "current" {}

# 6. aws_cloudfront_log_delivery_canonical_user_id — for CF log bucket ACL
data "aws_cloudfront_log_delivery_canonical_user_id" "current" {}

# 7. aws_iam_policy_document — generates inline IAM policy JSON (multiple instances)
data "aws_iam_policy_document" "kinesis_assume" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["firehose.amazonaws.com"]
    }
  }
}

data "aws_iam_policy_document" "kinesis_s3_write" {
  statement {
    effect = "Allow"
    actions = [
      "s3:AbortMultipartUpload",
      "s3:GetBucketLocation",
      "s3:GetObject",
      "s3:ListBucket",
      "s3:ListBucketMultipartUploads",
      "s3:PutObject",
    ]
    resources = [
      aws_s3_bucket.ingestion.arn,
      "${aws_s3_bucket.ingestion.arn}/*",
    ]
  }
  statement {
    effect    = "Allow"
    actions   = ["kms:GenerateDataKey", "kms:Decrypt"]
    resources = [data.aws_kms_key.platform.arn]
  }
}

data "aws_iam_policy_document" "lambda_assume" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

data "aws_iam_policy_document" "bucket_policy" {
  statement {
    sid    = "DenyNonTLS"
    effect = "Deny"
    principals { type = "*"; identifiers = ["*"] }
    actions   = ["s3:*"]
    resources = [
      aws_s3_bucket.ingestion.arn,
      "${aws_s3_bucket.ingestion.arn}/*",
    ]
    condition {
      test     = "Bool"
      variable = "aws:SecureTransport"
      values   = ["false"]
    }
  }
  statement {
    sid    = "AllowFirehose"
    effect = "Allow"
    principals {
      type        = "Service"
      identifiers = ["firehose.amazonaws.com"]
    }
    actions   = ["s3:PutObject"]
    resources = ["${aws_s3_bucket.ingestion.arn}/*"]
    condition {
      test     = "StringEquals"
      variable = "aws:SourceAccount"
      values   = [data.aws_caller_identity.current.account_id]
    }
  }
}

# 8. aws_iam_session_context — resolves assumed-role back to role ARN
data "aws_iam_session_context" "current" {
  arn = data.aws_caller_identity.current.arn
}

# 9. aws_arn — parse an ARN into components
data "aws_arn" "firehose_role" {
  arn = aws_iam_role.firehose.arn
}

# 10. aws_service — service endpoint lookup (NEVER REFERENCED — tests data_skipped)
data "aws_service" "s3" {
  service_id = "S3"
}

###############################################################################
# ── SELECTION / FILTER DATA SOURCES ─────────────────────────────────────────
# These should merge into the resources that reference them.
###############################################################################

# 11. aws_vpc — look up existing shared VPC
data "aws_vpc" "platform" {
  id = var.platform_vpc_id
}

# 12. aws_subnets — all private subnets in the platform VPC
data "aws_subnets" "private" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.platform.id]
  }
  tags = { Tier = "private" }
}

# 13. aws_subnet — single specific subnet (multiple instances)
data "aws_subnet" "primary" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.platform.id]
  }
  filter {
    name   = "availability-zone"
    values = [data.aws_availability_zones.available.names[0]]
  }
  tags = { Tier = "private" }
}

data "aws_subnet" "secondary" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.platform.id]
  }
  filter {
    name   = "availability-zone"
    values = [data.aws_availability_zones.available.names[1]]
  }
  tags = { Tier = "private" }
}

# 14. aws_security_group — shared default SG
data "aws_security_group" "default" {
  vpc_id = data.aws_vpc.platform.id
  name   = "default"
}

# 15. aws_security_groups — all SGs tagged as platform-baseline
data "aws_security_groups" "baseline" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.platform.id]
  }
  tags = { Role = "platform-baseline" }
}

# 16. aws_kms_key — look up existing CMK by alias
data "aws_kms_key" "platform" {
  key_id = "alias/observaco-platform-cmk"
}

# 17. aws_kms_alias — look up alias object itself
data "aws_kms_alias" "platform" {
  name = "alias/observaco-platform-cmk"
}

# 18. aws_kms_secrets — decrypt an encrypted ciphertext blob inline
data "aws_kms_secrets" "db_credentials" {
  secret {
    name    = "password"
    payload = "AQICAHi..."   # base64 ciphertext placeholder
  }
}

# 19. aws_secretsmanager_secret — look up secret ARN by name
data "aws_secretsmanager_secret" "db_master" {
  name = "${var.company}/${var.environment}/db/master"
}

# 20. aws_secretsmanager_secret_version — current version of that secret
data "aws_secretsmanager_secret_version" "db_master" {
  secret_id = data.aws_secretsmanager_secret.db_master.id
}

# 21. aws_ssm_parameter — multiple parameters (fan-out test)
data "aws_ssm_parameter" "db_host" {
  name            = "/${var.company}/${var.environment}/db/host"
  with_decryption = true
}

data "aws_ssm_parameter" "db_port" {
  name = "/${var.company}/${var.environment}/db/port"
}

data "aws_ssm_parameter" "redis_host" {
  name            = "/${var.company}/${var.environment}/redis/host"
  with_decryption = false
}

# Parameter used ONLY in locals{} — tests string-interpolation scan
data "aws_ssm_parameter" "datadog_api_key" {
  name            = "/${var.company}/${var.environment}/datadog/api-key"
  with_decryption = true
}

# 22. aws_ami — latest ECS-optimized Amazon Linux 2 AMI
data "aws_ami" "ecs_optimized" {
  most_recent = true
  owners      = ["amazon"]
  filter {
    name   = "name"
    values = ["amzn2-ami-ecs-hvm-*-x86_64-ebs"]
  }
  filter {
    name   = "state"
    values = ["available"]
  }
}

# 23. aws_ami_ids — all approved base AMIs (for launch template choices)
data "aws_ami_ids" "approved_base" {
  owners = ["self"]
  filter {
    name   = "tag:Approved"
    values = ["true"]
  }
  filter {
    name   = "tag:OS"
    values = ["AmazonLinux2023"]
  }
}

# 24. aws_elb_service_account — for ALB access log S3 bucket policy
data "aws_elb_service_account" "main" {}

# 25. aws_route53_zone — public and private zones
data "aws_route53_zone" "public" {
  name         = "observaco.io"
  private_zone = false
}

data "aws_route53_zone" "internal" {
  name         = "observaco.internal"
  private_zone = true
  vpc_id       = data.aws_vpc.platform.id
}

# 26. aws_acm_certificate — wildcard cert (multiple instances for different domains)
data "aws_acm_certificate" "wildcard" {
  domain      = "*.observaco.io"
  statuses    = ["ISSUED"]
  most_recent = true
}

data "aws_acm_certificate" "api" {
  domain   = "api.observaco.io"
  statuses = ["ISSUED"]
}

# 27. aws_lb — existing internal ALB from the platform account
data "aws_lb" "platform_internal" {
  name = "observaco-platform-internal"
}

# 28. aws_lb_listener — HTTPS listener on that ALB
data "aws_lb_listener" "platform_https" {
  load_balancer_arn = data.aws_lb.platform_internal.arn
  port              = 443
}

# 29. aws_nat_gateway — look up existing NAT GW for route table validation
data "aws_nat_gateway" "primary" {
  subnet_id = data.aws_subnet.primary.id
  state     = "available"
}

# 30. aws_ecr_repository — existing shared ECR repo for base images
data "aws_ecr_repository" "base" {
  name = "observaco/base"
}

# 31. aws_ecr_image — specific tagged image from that repo
data "aws_ecr_image" "api_latest" {
  repository_name = data.aws_ecr_repository.base.name
  image_tag       = "latest"
}

###############################################################################
# LOCALS — uses several data sources (tests locals-interpolation scan)
###############################################################################

locals {
  account_id     = data.aws_caller_identity.current.account_id
  region         = data.aws_region.current.name
  partition      = data.aws_partition.current.partition
  name           = "${var.company}-${var.environment}"

  # Uses aws_ssm_parameter.datadog_api_key — referenced only in locals
  datadog_key    = data.aws_ssm_parameter.datadog_api_key.value

  # Uses aws_availability_zones
  az_count       = min(length(data.aws_availability_zones.available.names), 3)
  primary_az     = data.aws_availability_zones.available.names[0]

  # Uses aws_iam_session_context
  deployer_role  = data.aws_iam_session_context.current.issuer_arn

  # Uses aws_arn (component extraction)
  firehose_role_partition = data.aws_arn.firehose_role.partition

  # Uses aws_canonical_user_id for S3 ACL
  canonical_user = data.aws_canonical_user_id.current.id

  # Uses aws_cloudfront_log_delivery_canonical_user_id
  cf_log_user    = data.aws_cloudfront_log_delivery_canonical_user_id.current.id

  common_tags = {
    Project     = var.company
    Environment = var.environment
    ManagedBy   = "terraform"
    AccountId   = local.account_id
  }
}

###############################################################################
# PRIMARY RESOURCES — each references one or more data sources
###############################################################################

# ── S3 ingestion bucket ───────────────────────────────────────────────────────
# References: aws_caller_identity (policy), aws_kms_key (encryption),
#             aws_canonical_user_id (ACL)
resource "aws_s3_bucket" "ingestion" {
  bucket = "${local.name}-ingestion-${local.account_id}"
  tags   = merge(local.common_tags, { Role = "ingestion" })
}

resource "aws_s3_bucket_public_access_block" "ingestion" {
  bucket                  = aws_s3_bucket.ingestion.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "ingestion" {
  bucket = aws_s3_bucket.ingestion.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = data.aws_kms_key.platform.arn
    }
  }
}

resource "aws_s3_bucket_policy" "ingestion" {
  bucket = aws_s3_bucket.ingestion.id
  policy = data.aws_iam_policy_document.bucket_policy.json
}

resource "aws_s3_bucket_versioning" "ingestion" {
  bucket = aws_s3_bucket.ingestion.id
  versioning_configuration { status = "Enabled" }
}

resource "aws_s3_bucket_lifecycle_configuration" "ingestion" {
  bucket = aws_s3_bucket.ingestion.id
  rule {
    id     = "intelligent-tiering"
    status = "Enabled"
    transition {
      days          = 30
      storage_class = "INTELLIGENT_TIERING"
    }
    transition {
      days          = 90
      storage_class = "GLACIER_IR"
    }
    expiration { days = 365 }
  }
}

# ── IAM Roles — use aws_iam_policy_document data sources ─────────────────────

resource "aws_iam_role" "firehose" {
  name               = "${local.name}-firehose"
  assume_role_policy = data.aws_iam_policy_document.kinesis_assume.json
  tags               = local.common_tags
}

resource "aws_iam_role_policy" "firehose_s3" {
  name   = "s3-write"
  role   = aws_iam_role.firehose.id
  policy = data.aws_iam_policy_document.kinesis_s3_write.json
}

resource "aws_iam_role" "lambda_processor" {
  name               = "${local.name}-lambda-processor"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume.json
  tags               = local.common_tags
}

resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda_processor.name
  policy_arn = "arn:${local.partition}:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

# ── Kinesis Firehose — data sources: aws_kms_key, aws_s3_bucket (own resource)
resource "aws_kinesis_firehose_delivery_stream" "metrics" {
  name        = "${local.name}-metrics"
  destination = "extended_s3"

  extended_s3_configuration {
    role_arn   = aws_iam_role.firehose.arn
    bucket_arn = aws_s3_bucket.ingestion.arn
    prefix     = "metrics/year=!{timestamp:yyyy}/month=!{timestamp:MM}/day=!{timestamp:dd}/"
    error_output_prefix = "errors/!{firehose:error-output-type}/year=!{timestamp:yyyy}/"

    buffering_size     = 128
    buffering_interval = 60
    compression_format = "GZIP"

    s3_backup_mode = "Disabled"

    cloudwatch_logging_options {
      enabled         = true
      log_group_name  = aws_cloudwatch_log_group.firehose.name
      log_stream_name = "S3Delivery"
    }

    dynamic_partitioning_configuration {
      enabled = false
    }
  }

  server_side_encryption {
    enabled  = true
    key_type = "CUSTOMER_MANAGED_CMK"
    key_arn  = data.aws_kms_key.platform.arn
  }

  tags = local.common_tags
}

# ── Lambda — references aws_ami, aws_subnet, aws_security_group, aws_ecr_image

resource "aws_security_group" "lambda" {
  name        = "${local.name}-lambda"
  description = "Lambda functions SG"
  vpc_id      = data.aws_vpc.platform.id

  ingress {
    description     = "From platform baseline SGs"
    from_port       = 0
    to_port         = 65535
    protocol        = "tcp"
    security_groups = data.aws_security_groups.baseline.ids
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = local.common_tags
}

resource "aws_lambda_function" "metric_processor" {
  function_name = "${local.name}-metric-processor"
  role          = aws_iam_role.lambda_processor.arn

  package_type = "Image"
  image_uri    = "${data.aws_ecr_repository.base.repository_url}@${data.aws_ecr_image.api_latest.image_digest}"

  timeout     = 60
  memory_size = 512

  vpc_config {
    subnet_ids         = data.aws_subnets.private.ids
    security_group_ids = [aws_security_group.lambda.id]
  }

  environment {
    variables = {
      DB_HOST          = data.aws_ssm_parameter.db_host.value
      DB_PORT          = data.aws_ssm_parameter.db_port.value
      REDIS_HOST       = data.aws_ssm_parameter.redis_host.value
      DB_PASSWORD_ARN  = data.aws_secretsmanager_secret.db_master.arn
      KMS_KEY_ID       = data.aws_kms_key.platform.key_id
      S3_BUCKET        = aws_s3_bucket.ingestion.id
      ENVIRONMENT      = var.environment
    }
  }

  tags = local.common_tags
}

resource "aws_lambda_event_source_mapping" "firehose_trigger" {
  event_source_arn  = aws_kinesis_firehose_delivery_stream.metrics.arn
  function_name     = aws_lambda_function.metric_processor.arn
  starting_position = "LATEST"
  batch_size        = 100
}

# ── EC2 Launch Template — references aws_ami, aws_subnet, aws_security_group
resource "aws_launch_template" "worker" {
  name_prefix   = "${local.name}-worker-"
  image_id      = data.aws_ami.ecs_optimized.id
  instance_type = "c6i.2xlarge"

  key_name = aws_key_pair.workers.key_name

  vpc_security_group_ids = [
    aws_security_group.workers.id,
    data.aws_security_group.default.id,
  ]

  iam_instance_profile {
    arn = aws_iam_instance_profile.worker.arn
  }

  block_device_mappings {
    device_name = "/dev/xvda"
    ebs {
      volume_size           = 50
      volume_type           = "gp3"
      iops                  = 3000
      encrypted             = true
      kms_key_id            = data.aws_kms_key.platform.arn
      delete_on_termination = true
    }
  }

  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "required"
    http_put_response_hop_limit = 1
  }

  monitoring { enabled = true }

  user_data = base64encode(<<-EOF
    #!/bin/bash
    echo ECS_CLUSTER=${local.name}-ecs >> /etc/ecs/ecs.config
    echo ECS_ENABLE_CONTAINER_METADATA=true >> /etc/ecs/ecs.config
  EOF
  )

  tag_specifications {
    resource_type = "instance"
    tags          = merge(local.common_tags, { Role = "ecs-worker" })
  }

  tags = local.common_tags
}

resource "aws_security_group" "workers" {
  name        = "${local.name}-workers"
  description = "ECS worker nodes"
  vpc_id      = data.aws_vpc.platform.id

  ingress {
    description      = "From default SG"
    from_port        = 0
    to_port          = 65535
    protocol         = "tcp"
    security_groups  = [data.aws_security_group.default.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = local.common_tags
}

resource "aws_iam_role" "worker" {
  name = "${local.name}-ecs-worker"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
  tags = local.common_tags
}

resource "aws_iam_instance_profile" "worker" {
  name = "${local.name}-worker"
  role = aws_iam_role.worker.name
}

resource "tls_private_key" "workers" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

resource "aws_key_pair" "workers" {
  key_name   = "${local.name}-workers"
  public_key = tls_private_key.workers.public_key_openssh
}

# ── Auto Scaling Group — uses aws_subnet ids from data source
resource "aws_autoscaling_group" "workers" {
  name                = "${local.name}-workers"
  min_size            = 2
  max_size            = 20
  desired_capacity    = 4
  vpc_zone_identifier = data.aws_subnets.private.ids
  health_check_type   = "ELB"
  health_check_grace_period = 300

  launch_template {
    id      = aws_launch_template.worker.id
    version = "$Latest"
  }

  target_group_arns = [aws_lb_target_group.workers.arn]

  tag {
    key                 = "Name"
    value               = "${local.name}-worker"
    propagate_at_launch = true
  }
  tag {
    key                 = "Environment"
    value               = var.environment
    propagate_at_launch = true
  }

  lifecycle {
    create_before_destroy = true
    ignore_changes        = [desired_capacity]
  }
}

# ── ALB + Target Group — references aws_acm_certificate, aws_elb_service_account
resource "aws_lb" "public" {
  name               = "${local.name}-alb"
  load_balancer_type = "application"
  internal           = false
  security_groups    = [aws_security_group.alb.id]
  subnets            = [data.aws_subnet.primary.id, data.aws_subnet.secondary.id]

  access_logs {
    bucket  = aws_s3_bucket.alb_logs.bucket
    prefix  = "alb"
    enabled = true
  }

  tags = local.common_tags
}

resource "aws_security_group" "alb" {
  name        = "${local.name}-alb"
  description = "Public ALB"
  vpc_id      = data.aws_vpc.platform.id

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = local.common_tags
}

resource "aws_lb_target_group" "workers" {
  name        = "${local.name}-workers"
  port        = 8080
  protocol    = "HTTP"
  vpc_id      = data.aws_vpc.platform.id
  target_type = "instance"

  health_check {
    enabled             = true
    path                = "/health"
    port                = "traffic-port"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 15
    matcher             = "200"
  }

  tags = local.common_tags
}

resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.public.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = data.aws_acm_certificate.wildcard.arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.workers.arn
  }
}

resource "aws_lb_listener" "http_redirect" {
  load_balancer_arn = aws_lb.public.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "redirect"
    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

resource "aws_lb_listener_certificate" "api" {
  listener_arn    = aws_lb_listener.https.arn
  certificate_arn = data.aws_acm_certificate.api.arn
}

# ALB listener rule using data-source-looked-up platform LB
resource "aws_lb_listener_rule" "forward_to_platform" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 50

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.workers.arn
  }

  condition {
    path_pattern { values = ["/platform/*"] }
  }
}

# ALB log bucket — uses aws_elb_service_account for bucket policy
resource "aws_s3_bucket" "alb_logs" {
  bucket = "${local.name}-alb-logs-${local.account_id}"
  tags   = merge(local.common_tags, { Role = "alb-logs" })
}

resource "aws_s3_bucket_public_access_block" "alb_logs" {
  bucket                  = aws_s3_bucket.alb_logs.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_policy" "alb_logs" {
  bucket = aws_s3_bucket.alb_logs.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect    = "Allow"
        Principal = { AWS = data.aws_elb_service_account.main.arn }
        Action    = "s3:PutObject"
        Resource  = "${aws_s3_bucket.alb_logs.arn}/alb/AWSLogs/${local.account_id}/*"
      },
      {
        Effect    = "Allow"
        Principal = { Service = "delivery.logs.amazonaws.com" }
        Action    = "s3:PutObject"
        Resource  = "${aws_s3_bucket.alb_logs.arn}/alb/AWSLogs/${local.account_id}/*"
        Condition = {
          StringEquals = { "s3:x-amz-acl" = "bucket-owner-full-control" }
        }
      }
    ]
  })
}

# ── CloudFront — references aws_acm_certificate, aws_cloudfront_log_delivery_canonical_user_id
resource "aws_cloudfront_distribution" "portal" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "${local.name} customer portal"
  default_root_object = "index.html"
  price_class         = "PriceClass_100"

  aliases = ["app.observaco.io"]

  origin {
    domain_name = aws_lb.public.dns_name
    origin_id   = "alb-public"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  default_cache_behavior {
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "alb-public"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    forwarded_values {
      query_string = true
      headers      = ["Authorization", "Host", "Origin"]
      cookies { forward = "all" }
    }

    min_ttl     = 0
    default_ttl = 0
    max_ttl     = 0
  }

  viewer_certificate {
    acm_certificate_arn      = data.aws_acm_certificate.wildcard.arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  restrictions {
    geo_restriction { restriction_type = "none" }
  }

  logging_config {
    bucket          = aws_s3_bucket.cf_logs.bucket_domain_name
    include_cookies = false
    prefix          = "cf/"
  }

  tags = local.common_tags
}

# CloudFront log bucket — uses aws_canonical_user_id + aws_cloudfront_log_delivery_canonical_user_id
resource "aws_s3_bucket" "cf_logs" {
  bucket = "${local.name}-cf-logs-${local.account_id}"
  tags   = merge(local.common_tags, { Role = "cf-logs" })
}

resource "aws_s3_bucket_ownership_controls" "cf_logs" {
  bucket = aws_s3_bucket.cf_logs.id
  rule { object_ownership = "BucketOwnerPreferred" }
}

resource "aws_s3_bucket_acl" "cf_logs" {
  depends_on = [aws_s3_bucket_ownership_controls.cf_logs]
  bucket     = aws_s3_bucket.cf_logs.id
  access_control_policy {
    owner { id = data.aws_canonical_user_id.current.id }
    grant {
      grantee {
        id   = data.aws_cloudfront_log_delivery_canonical_user_id.current.id
        type = "CanonicalUser"
      }
      permission = "FULL_CONTROL"
    }
  }
}

# ── Route53 records — reference data.aws_route53_zone (fan-out test)
resource "aws_route53_record" "portal" {
  zone_id = data.aws_route53_zone.public.zone_id
  name    = "app.observaco.io"
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.portal.domain_name
    zone_id                = aws_cloudfront_distribution.portal.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "api" {
  zone_id = data.aws_route53_zone.public.zone_id
  name    = "api.observaco.io"
  type    = "A"

  alias {
    name                   = aws_lb.public.dns_name
    zone_id                = aws_lb.public.zone_id
    evaluate_target_health = true
  }
}

resource "aws_route53_record" "api_internal" {
  zone_id = data.aws_route53_zone.internal.zone_id
  name    = "api.observaco.internal"
  type    = "A"

  alias {
    name                   = data.aws_lb.platform_internal.dns_name
    zone_id                = data.aws_lb.platform_internal.zone_id
    evaluate_target_health = true
  }
}

# ── RDS instance — references aws_kms_key, aws_secretsmanager_secret_version
resource "aws_db_subnet_group" "main" {
  name       = "${local.name}-db"
  subnet_ids = data.aws_subnets.private.ids
  tags       = local.common_tags
}

resource "aws_security_group" "rds" {
  name        = "${local.name}-rds"
  description = "RDS PostgreSQL"
  vpc_id      = data.aws_vpc.platform.id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.workers.id, aws_security_group.lambda.id]
  }

  tags = local.common_tags
}

resource "aws_db_instance" "primary" {
  identifier              = "${local.name}-pg"
  engine                  = "postgres"
  engine_version          = "16.2"
  instance_class          = "db.r7g.2xlarge"
  allocated_storage       = 500
  max_allocated_storage   = 2000
  storage_type            = "gp3"
  storage_encrypted       = true
  kms_key_id              = data.aws_kms_key.platform.arn

  db_name  = "observaco"
  username = "master"
  password = jsondecode(data.aws_secretsmanager_secret_version.db_master.secret_string)["password"]

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  multi_az               = true
  publicly_accessible    = false
  deletion_protection    = true
  skip_final_snapshot    = false
  final_snapshot_identifier = "${local.name}-pg-final"
  backup_retention_period = 14
  backup_window           = "03:00-04:00"
  maintenance_window      = "sun:05:00-sun:06:00"

  performance_insights_enabled          = true
  performance_insights_kms_key_id       = data.aws_kms_key.platform.arn
  performance_insights_retention_period = 7

  monitoring_interval = 60
  monitoring_role_arn = aws_iam_role.rds_monitoring.arn

  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]

  tags = local.common_tags
}

resource "aws_iam_role" "rds_monitoring" {
  name = "${local.name}-rds-monitoring"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "monitoring.rds.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
  managed_policy_arns = ["arn:${local.partition}:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"]
  tags = local.common_tags
}

# ── ECS Cluster + Service — uses aws_ami via launch template
resource "aws_ecs_cluster" "main" {
  name = "${local.name}-ecs"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = local.common_tags
}

resource "aws_ecs_cluster_capacity_providers" "main" {
  cluster_name       = aws_ecs_cluster.main.name
  capacity_providers = [aws_ecs_capacity_provider.workers.name]

  default_capacity_provider_strategy {
    base              = 1
    weight            = 100
    capacity_provider = aws_ecs_capacity_provider.workers.name
  }
}

resource "aws_ecs_capacity_provider" "workers" {
  name = "${local.name}-workers"

  auto_scaling_group_provider {
    auto_scaling_group_arn         = aws_autoscaling_group.workers.arn
    managed_termination_protection = "ENABLED"

    managed_scaling {
      maximum_scaling_step_size = 10
      minimum_scaling_step_size = 1
      status                    = "ENABLED"
      target_capacity           = 80
    }
  }
}

resource "aws_ecs_task_definition" "api" {
  family                   = "${local.name}-api"
  requires_compatibilities = ["EC2"]
  network_mode             = "awsvpc"
  cpu                      = "2048"
  memory                   = "4096"
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([{
    name  = "api"
    image = "${data.aws_ecr_repository.base.repository_url}:latest"
    portMappings = [{ containerPort = 8080, hostPort = 8080, protocol = "tcp" }]
    environment = [
      { name = "DB_HOST",    value = data.aws_ssm_parameter.db_host.value },
      { name = "DB_PORT",    value = data.aws_ssm_parameter.db_port.value },
      { name = "REDIS_HOST", value = data.aws_ssm_parameter.redis_host.value },
    ]
    secrets = [
      { name = "DB_PASSWORD", valueFrom = data.aws_secretsmanager_secret.db_master.arn }
    ]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.ecs_api.name
        "awslogs-region"        = local.region
        "awslogs-stream-prefix" = "api"
      }
    }
  }])

  tags = local.common_tags
}

resource "aws_iam_role" "ecs_execution" {
  name = "${local.name}-ecs-execution"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{ Effect = "Allow", Principal = { Service = "ecs-tasks.amazonaws.com" }, Action = "sts:AssumeRole" }]
  })
  managed_policy_arns = ["arn:${local.partition}:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"]
  tags = local.common_tags
}

resource "aws_iam_role" "ecs_task" {
  name = "${local.name}-ecs-task"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{ Effect = "Allow", Principal = { Service = "ecs-tasks.amazonaws.com" }, Action = "sts:AssumeRole" }]
  })
  tags = local.common_tags
}

resource "aws_ecs_service" "api" {
  name            = "api"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.api.arn
  desired_count   = 4

  capacity_provider_strategy {
    capacity_provider = aws_ecs_capacity_provider.workers.name
    base              = 1
    weight            = 100
  }

  network_configuration {
    subnets          = data.aws_subnets.private.ids
    security_groups  = [aws_security_group.workers.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.workers.arn
    container_name   = "api"
    container_port   = 8080
  }

  lifecycle { ignore_changes = [desired_count] }
}

# ── CloudWatch Log Groups ─────────────────────────────────────────────────────

resource "aws_cloudwatch_log_group" "firehose" {
  name              = "/aws/firehose/${local.name}-metrics"
  retention_in_days = 30
  kms_key_id        = data.aws_kms_key.platform.arn
  tags              = local.common_tags
}

resource "aws_cloudwatch_log_group" "ecs_api" {
  name              = "/ecs/${local.name}/api"
  retention_in_days = 60
  kms_key_id        = data.aws_kms_key.platform.arn
  tags              = local.common_tags
}

resource "aws_cloudwatch_log_group" "rds" {
  name              = "/aws/rds/instance/${local.name}-pg/postgresql"
  retention_in_days = 90
  kms_key_id        = data.aws_kms_key.platform.arn
  tags              = local.common_tags
}

# ── CloudWatch Alarms — reference data source outputs in names/descriptions

resource "aws_cloudwatch_metric_alarm" "rds_cpu" {
  alarm_name          = "${local.name}-rds-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = 60
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "RDS CPU > 80% in account ${data.aws_caller_identity.current.account_id}"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.primary.id
  }

  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "alb_5xx" {
  alarm_name          = "${local.name}-alb-5xx"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "HTTPCode_Target_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Sum"
  threshold           = 10
  alarm_description   = "ALB 5XX errors > 10/min"
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    LoadBalancer = aws_lb.public.arn_suffix
  }

  tags = local.common_tags
}

resource "aws_sns_topic" "alerts" {
  name              = "${local.name}-alerts"
  kms_master_key_id = data.aws_kms_key.platform.arn
  tags              = local.common_tags
}

###############################################################################
# ORPHAN COMPANION RESOURCES — no matching primary in this file
# Tests: companion_orphan action in import report
###############################################################################

# aws_s3_bucket_metric — companion, but the bucket it targets is
# in a different TF state file (cross-state reference via bucket name string)
resource "aws_s3_bucket_metric" "ingestion_requests" {
  bucket = "observaco-legacy-ingestion"   # NOT aws_s3_bucket.ingestion — orphan
  name   = "EntireBucket"
}

resource "aws_s3_bucket_inventory" "legacy_weekly" {
  bucket = "observaco-legacy-ingestion"   # same orphan parent
  name   = "WeeklyInventory"

  included_object_versions = "All"
  schedule { frequency = "Weekly" }
  destination {
    bucket {
      format     = "CSV"
      bucket_arn = aws_s3_bucket.ingestion.arn
    }
  }
}

# aws_cloudwatch_log_subscription_filter — companion, but target log group
# is defined in a different state file
resource "aws_cloudwatch_log_subscription_filter" "legacy_to_firehose" {
  name            = "legacy-to-firehose"
  log_group_name  = "/app/observaco-legacy/api"   # orphan — not in this state
  filter_pattern  = ""
  destination_arn = aws_kinesis_firehose_delivery_stream.metrics.arn
  role_arn        = aws_iam_role.firehose.arn
}

# aws_cloudwatch_log_metric_filter — also companion-type, orphan parent
resource "aws_cloudwatch_log_metric_filter" "error_count" {
  name           = "error-count"
  log_group_name = "/app/observaco-legacy/api"   # orphan parent
  pattern        = "ERROR"

  metric_transformation {
    name          = "ErrorCount"
    namespace     = "ObservaCo/Legacy"
    value         = "1"
    default_value = "0"
  }
}

###############################################################################
# OUTPUTS
###############################################################################

output "account_id"            { value = local.account_id }
output "region"                { value = local.region }
output "alb_dns_name"          { value = aws_lb.public.dns_name }
output "cloudfront_domain"     { value = aws_cloudfront_distribution.portal.domain_name }
output "rds_endpoint"          { value = aws_db_instance.primary.endpoint }
output "ingestion_bucket"      { value = aws_s3_bucket.ingestion.bucket }
output "firehose_stream_arn"   { value = aws_kinesis_firehose_delivery_stream.metrics.arn }
output "ecs_cluster_name"      { value = aws_ecs_cluster.main.name }
output "platform_vpc_cidr"     { value = data.aws_vpc.platform.cidr_block }
output "platform_nat_gw_ip"    { value = data.aws_nat_gateway.primary.public_ip }
