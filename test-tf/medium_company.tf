###############################################################################
# MEDIUM COMPANY — "NovaMart" E-Commerce Platform
#
# Business context:
#   A 120-person online retailer generating ~$8M ARR. Sells directly to
#   consumers via web + mobile app. Has a product catalog, checkout/payments
#   (Stripe), order management, inventory, email/SMS marketing, and a
#   lightweight data warehouse for BI dashboards. ~25k DAU, peak 80k on
#   sale events. 15-person engineering team. PCI-DSS scope (card data
#   never stored — tokenised by Stripe, but CHD flows through the network).
#
# AWS footprint:
#   Multi-AZ production VPC with separate PCI subnet tier.
#   ECS Fargate microservices: api-gateway, catalog, orders, inventory,
#   notifications. SQS + SNS event bus between services. ElastiCache Redis
#   for sessions + catalog cache. RDS Aurora Postgres (Multi-AZ).
#   S3 + CloudFront for static storefront. EventBridge for scheduled jobs.
#   Redshift Serverless for analytics. WAF + Shield Standard. CodePipeline CI/CD.
###############################################################################

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }
}

###############################################################################
# VARIABLES
###############################################################################

variable "aws_region"         { type = string; default = "us-east-1" }
variable "environment"        { type = string; default = "prod" }
variable "company"            { type = string; default = "novamart" }
variable "domain_name"        { type = string; default = "novamart.com" }
variable "vpc_cidr"           { type = string; default = "10.20.0.0/16" }
variable "alert_email"        { type = string; default = "oncall@novamart.com" }
variable "stripe_webhook_secret_arn" {
  type    = string
  default = "arn:aws:secretsmanager:us-east-1:123456789012:secret:novamart/stripe-webhook"
}
variable "db_master_username" { type = string; default = "novaadmin" }

variable "services" {
  description = "Microservice definitions"
  type = map(object({
    cpu           = number
    memory        = number
    desired_count = number
    port          = number
    image         = string
    path_pattern  = string
  }))
  default = {
    api-gateway = {
      cpu = 1024; memory = 2048; desired_count = 3; port = 4000
      image        = "123456789012.dkr.ecr.us-east-1.amazonaws.com/api-gateway:latest"
      path_pattern = "/*"
    }
    catalog = {
      cpu = 512; memory = 1024; desired_count = 2; port = 4001
      image        = "123456789012.dkr.ecr.us-east-1.amazonaws.com/catalog:latest"
      path_pattern = "/catalog/*"
    }
    orders = {
      cpu = 512; memory = 1024; desired_count = 2; port = 4002
      image        = "123456789012.dkr.ecr.us-east-1.amazonaws.com/orders:latest"
      path_pattern = "/orders/*"
    }
    inventory = {
      cpu = 256; memory = 512; desired_count = 2; port = 4003
      image        = "123456789012.dkr.ecr.us-east-1.amazonaws.com/inventory:latest"
      path_pattern = "/inventory/*"
    }
    notifications = {
      cpu = 256; memory = 512; desired_count = 1; port = 4004
      image        = "123456789012.dkr.ecr.us-east-1.amazonaws.com/notifications:latest"
      path_pattern = "/notifications/*"
    }
  }
}

###############################################################################
# LOCALS
###############################################################################

locals {
  name = "${var.company}-${var.environment}"
  azs  = ["${var.aws_region}a", "${var.aws_region}b", "${var.aws_region}c"]

  public_cidrs  = [for i in range(3) : cidrsubnet(var.vpc_cidr, 6, i)]
  private_cidrs = [for i in range(3) : cidrsubnet(var.vpc_cidr, 6, i + 8)]
  pci_cidrs     = [for i in range(3) : cidrsubnet(var.vpc_cidr, 6, i + 16)]
  data_cidrs    = [for i in range(3) : cidrsubnet(var.vpc_cidr, 6, i + 24)]

  tags = {
    Company     = var.company
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

###############################################################################
# PROVIDER
###############################################################################

provider "aws" {
  region = var.aws_region
  default_tags { tags = local.tags }
}

provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
  default_tags { tags = local.tags }
}

data "aws_caller_identity" "current" {}
data "aws_partition" "current" {}

###############################################################################
# VPC — 4 tiers: public / private / pci / data
###############################################################################

resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true
  tags                 = { Name = "${local.name}-vpc" }
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
  tags   = { Name = "${local.name}-igw" }
}

resource "aws_subnet" "public" {
  count                   = 3
  vpc_id                  = aws_vpc.main.id
  cidr_block              = local.public_cidrs[count.index]
  availability_zone       = local.azs[count.index]
  map_public_ip_on_launch = false
  tags                    = { Name = "${local.name}-public-${local.azs[count.index]}", Tier = "public" }
}

resource "aws_subnet" "private" {
  count             = 3
  vpc_id            = aws_vpc.main.id
  cidr_block        = local.private_cidrs[count.index]
  availability_zone = local.azs[count.index]
  tags              = { Name = "${local.name}-private-${local.azs[count.index]}", Tier = "private" }
}

# PCI subnet — isolated tier for anything that touches payment flows
resource "aws_subnet" "pci" {
  count             = 3
  vpc_id            = aws_vpc.main.id
  cidr_block        = local.pci_cidrs[count.index]
  availability_zone = local.azs[count.index]
  tags              = { Name = "${local.name}-pci-${local.azs[count.index]}", Tier = "pci", PCIScope = "true" }
}

resource "aws_subnet" "data" {
  count             = 3
  vpc_id            = aws_vpc.main.id
  cidr_block        = local.data_cidrs[count.index]
  availability_zone = local.azs[count.index]
  tags              = { Name = "${local.name}-data-${local.azs[count.index]}", Tier = "data" }
}

resource "aws_eip" "nat" {
  count  = 3
  domain = "vpc"
  tags   = { Name = "${local.name}-nat-eip-${count.index}" }
}

resource "aws_nat_gateway" "main" {
  count         = 3
  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id
  tags          = { Name = "${local.name}-natgw-${local.azs[count.index]}" }
  depends_on    = [aws_internet_gateway.main]
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }
  tags = { Name = "${local.name}-rt-public" }
}

resource "aws_route_table_association" "public" {
  count          = 3
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table" "private" {
  count  = 3
  vpc_id = aws_vpc.main.id
  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main[count.index].id
  }
  tags = { Name = "${local.name}-rt-private-${count.index}" }
}

resource "aws_route_table_association" "private" {
  count          = 3
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private[count.index].id
}

resource "aws_route_table" "pci" {
  count  = 3
  vpc_id = aws_vpc.main.id
  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main[count.index].id
  }
  tags = { Name = "${local.name}-rt-pci-${count.index}", PCIScope = "true" }
}

resource "aws_route_table_association" "pci" {
  count          = 3
  subnet_id      = aws_subnet.pci[count.index].id
  route_table_id = aws_route_table.pci[count.index].id
}

resource "aws_route_table" "data" {
  vpc_id = aws_vpc.main.id
  tags   = { Name = "${local.name}-rt-data" }
}

resource "aws_route_table_association" "data" {
  count          = 3
  subnet_id      = aws_subnet.data[count.index].id
  route_table_id = aws_route_table.data.id
}

###############################################################################
# SECURITY GROUPS
###############################################################################

resource "aws_security_group" "alb_public" {
  name   = "${local.name}-sg-alb-public"
  vpc_id = aws_vpc.main.id
  ingress { from_port = 443; to_port = 443; protocol = "tcp"; cidr_blocks = ["0.0.0.0/0"]; description = "HTTPS" }
  ingress { from_port = 80;  to_port = 80;  protocol = "tcp"; cidr_blocks = ["0.0.0.0/0"]; description = "HTTP redirect" }
  egress  { from_port = 0;   to_port = 0;   protocol = "-1";  cidr_blocks = ["0.0.0.0/0"] }
  tags   = { Name = "${local.name}-sg-alb-public" }
}

resource "aws_security_group" "app" {
  name   = "${local.name}-sg-app"
  vpc_id = aws_vpc.main.id
  ingress {
    from_port       = 0
    to_port         = 65535
    protocol        = "tcp"
    security_groups = [aws_security_group.alb_public.id]
    description     = "From ALB"
  }
  ingress {
    from_port   = 0
    to_port     = 65535
    protocol    = "tcp"
    self        = true
    description = "Service-to-service"
  }
  egress { from_port = 0; to_port = 0; protocol = "-1"; cidr_blocks = ["0.0.0.0/0"] }
  tags   = { Name = "${local.name}-sg-app" }
}

resource "aws_security_group" "pci" {
  name   = "${local.name}-sg-pci"
  vpc_id = aws_vpc.main.id
  ingress {
    from_port       = 4002
    to_port         = 4002
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
    description     = "Orders service only"
  }
  egress { from_port = 443; to_port = 443; protocol = "tcp"; cidr_blocks = ["0.0.0.0/0"]; description = "Stripe API egress" }
  tags   = { Name = "${local.name}-sg-pci", PCIScope = "true" }
}

resource "aws_security_group" "aurora" {
  name   = "${local.name}-sg-aurora"
  vpc_id = aws_vpc.main.id
  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id, aws_security_group.pci.id]
  }
  egress { from_port = 0; to_port = 0; protocol = "-1"; cidr_blocks = [var.vpc_cidr] }
  tags   = { Name = "${local.name}-sg-aurora" }
}

resource "aws_security_group" "redis" {
  name   = "${local.name}-sg-redis"
  vpc_id = aws_vpc.main.id
  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
  }
  egress { from_port = 0; to_port = 0; protocol = "-1"; cidr_blocks = [var.vpc_cidr] }
  tags   = { Name = "${local.name}-sg-redis" }
}

###############################################################################
# ACM
###############################################################################

resource "aws_acm_certificate" "main" {
  provider                  = aws.us_east_1
  domain_name               = var.domain_name
  subject_alternative_names = ["*.${var.domain_name}"]
  validation_method         = "DNS"
  lifecycle { create_before_destroy = true }
  tags = { Name = "${local.name}-cert" }
}

###############################################################################
# PUBLIC ALB + WAF
###############################################################################

resource "aws_lb" "public" {
  name                       = "${local.name}-alb"
  internal                   = false
  load_balancer_type         = "application"
  security_groups            = [aws_security_group.alb_public.id]
  subnets                    = aws_subnet.public[*].id
  enable_deletion_protection = true
  drop_invalid_header_fields = true
  tags                       = { Name = "${local.name}-alb" }
}

resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.public.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = aws_acm_certificate.main.arn

  default_action {
    type = "fixed-response"
    fixed_response {
      content_type = "application/json"
      message_body = "{\"error\":\"not found\"}"
      status_code  = "404"
    }
  }
}

resource "aws_lb_listener" "http_redirect" {
  load_balancer_arn = aws_lb.public.arn
  port              = 80
  protocol          = "HTTP"
  default_action {
    type = "redirect"
    redirect { port = "443"; protocol = "HTTPS"; status_code = "HTTP_301" }
  }
}

# Target groups per microservice
resource "aws_lb_target_group" "service" {
  for_each    = var.services
  name        = "${local.name}-tg-${each.key}"
  port        = each.value.port
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip"

  health_check {
    path                = "/health"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    interval            = 30
    matcher             = "200"
  }

  tags = { Name = "${local.name}-tg-${each.key}" }
}

# Path-based routing rules per service
resource "aws_lb_listener_rule" "service" {
  for_each     = var.services
  listener_arn = aws_lb_listener.https.arn
  priority     = index(keys(var.services), each.key) + 10

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.service[each.key].arn
  }

  condition {
    path_pattern { values = [each.value.path_pattern] }
  }
}

# WAF
resource "aws_wafv2_web_acl" "main" {
  name  = "${local.name}-waf"
  scope = "REGIONAL"

  default_action { allow {} }

  rule {
    name     = "CommonRuleSet"
    priority = 1
    override_action { none {} }
    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${local.name}-waf-common"
      sampled_requests_enabled   = true
    }
  }

  rule {
    name     = "SQLiRuleSet"
    priority = 2
    override_action { none {} }
    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesSQLiRuleSet"
        vendor_name = "AWS"
      }
    }
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${local.name}-waf-sqli"
      sampled_requests_enabled   = true
    }
  }

  rule {
    name     = "RateLimit"
    priority = 10
    action { block {} }
    statement {
      rate_based_statement {
        limit              = 3000
        aggregate_key_type = "IP"
      }
    }
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${local.name}-waf-rate"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "${local.name}-waf"
    sampled_requests_enabled   = true
  }

  tags = { Name = "${local.name}-waf" }
}

resource "aws_wafv2_web_acl_association" "alb" {
  resource_arn = aws_lb.public.arn
  web_acl_arn  = aws_wafv2_web_acl.main.arn
}

###############################################################################
# ECS CLUSTER + MICROSERVICES
###############################################################################

resource "aws_ecs_cluster" "main" {
  name = "${local.name}-cluster"
  setting { name = "containerInsights"; value = "enabled" }
  tags = { Name = "${local.name}-cluster" }
}

resource "aws_ecs_cluster_capacity_providers" "main" {
  cluster_name       = aws_ecs_cluster.main.name
  capacity_providers = ["FARGATE", "FARGATE_SPOT"]

  default_capacity_provider_strategy {
    capacity_provider = "FARGATE"
    weight            = 80
    base              = 1
  }

  # Blend in Spot for non-critical burst
  dynamic "default_capacity_provider_strategy" {
    for_each = [1]
    content {
      capacity_provider = "FARGATE_SPOT"
      weight            = 20
    }
  }
}

resource "aws_iam_role" "ecs_execution" {
  name = "${local.name}-ecs-execution-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_execution" {
  role       = aws_iam_role.ecs_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role" "ecs_task" {
  name = "${local.name}-ecs-task-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "ecs_task" {
  name = "${local.name}-ecs-task-policy"
  role = aws_iam_role.ecs_task.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["sqs:SendMessage", "sqs:ReceiveMessage", "sqs:DeleteMessage", "sqs:GetQueueAttributes"]
        Resource = [for q in aws_sqs_queue.service : q.arn]
      },
      {
        Effect   = "Allow"
        Action   = ["sns:Publish"]
        Resource = [aws_sns_topic.orders.arn, aws_sns_topic.inventory.arn]
      },
      {
        Effect   = "Allow"
        Action   = ["s3:PutObject", "s3:GetObject"]
        Resource = "${aws_s3_bucket.assets.arn}/*"
      },
      {
        Effect   = "Allow"
        Action   = ["secretsmanager:GetSecretValue"]
        Resource = [aws_secretsmanager_secret.db.arn, aws_secretsmanager_secret.redis.arn]
      },
      {
        Effect   = "Allow"
        Action   = ["elasticache:Connect"]
        Resource = aws_elasticache_replication_group.redis.arn
      },
      {
        Effect   = "Allow"
        Action   = ["xray:PutTraceSegments", "xray:PutTelemetryRecords"]
        Resource = "*"
      }
    ]
  })
}

resource "aws_cloudwatch_log_group" "service" {
  for_each          = var.services
  name              = "/ecs/${local.name}/${each.key}"
  retention_in_days = 30
  tags              = { Name = "${local.name}-logs-${each.key}" }
}

resource "aws_ecs_task_definition" "service" {
  for_each                 = var.services
  family                   = "${local.name}-${each.key}"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = each.value.cpu
  memory                   = each.value.memory
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([{
    name      = each.key
    image     = each.value.image
    essential = true

    portMappings = [{ containerPort = each.value.port; protocol = "tcp" }]

    environment = [
      { name = "SERVICE_NAME"; value = each.key },
      { name = "NODE_ENV"; value = var.environment },
      { name = "ORDERS_QUEUE_URL"; value = aws_sqs_queue.service["orders"].url },
      { name = "INVENTORY_QUEUE_URL"; value = aws_sqs_queue.service["inventory"].url },
      { name = "NOTIFICATIONS_QUEUE_URL"; value = aws_sqs_queue.service["notifications"].url },
      { name = "ORDERS_TOPIC_ARN"; value = aws_sns_topic.orders.arn },
      { name = "INVENTORY_TOPIC_ARN"; value = aws_sns_topic.inventory.arn },
      { name = "REDIS_HOST"; value = aws_elasticache_replication_group.redis.primary_endpoint_address },
      { name = "DB_HOST"; value = aws_rds_cluster.main.endpoint },
      { name = "ASSETS_BUCKET"; value = aws_s3_bucket.assets.bucket },
    ]

    secrets = [
      { name = "DB_PASSWORD"; valueFrom = aws_secretsmanager_secret.db.arn },
      { name = "REDIS_AUTH"; valueFrom = aws_secretsmanager_secret.redis.arn },
    ]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = "/ecs/${local.name}/${each.key}"
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = each.key
      }
    }
  }])

  tags = { Name = "${local.name}-task-${each.key}" }
}

resource "aws_ecs_service" "service" {
  for_each        = var.services
  name            = "${local.name}-${each.key}"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.service[each.key].arn
  desired_count   = each.value.desired_count

  network_configuration {
    subnets         = aws_subnet.private[*].id
    security_groups = [aws_security_group.app.id]
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.service[each.key].arn
    container_name   = each.key
    container_port   = each.value.port
  }

  deployment_circuit_breaker { enable = true; rollback = true }

  lifecycle { ignore_changes = [task_definition, desired_count] }

  tags = { Name = "${local.name}-svc-${each.key}" }
}

# Auto-scaling per service
resource "aws_appautoscaling_target" "service" {
  for_each           = var.services
  max_capacity       = 20
  min_capacity       = each.value.desired_count
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.service[each.key].name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "service_cpu" {
  for_each           = var.services
  name               = "${local.name}-${each.key}-cpu-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.service[each.key].resource_id
  scalable_dimension = aws_appautoscaling_target.service[each.key].scalable_dimension
  service_namespace  = aws_appautoscaling_target.service[each.key].service_namespace

  target_tracking_scaling_policy_configuration {
    target_value       = 65
    scale_in_cooldown  = 300
    scale_out_cooldown = 30
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
  }
}

###############################################################################
# SQS — inter-service event bus
###############################################################################

locals {
  queues = ["orders", "inventory", "notifications", "orders-dlq", "inventory-dlq", "notifications-dlq"]
}

resource "aws_sqs_queue" "service" {
  for_each                   = toset(local.queues)
  name                       = "${local.name}-${each.key}"
  visibility_timeout_seconds = 300
  message_retention_seconds  = 86400
  receive_wait_time_seconds  = 20 # Long polling

  # Wire up DLQs for non-DLQ queues
  redrive_policy = !endswith(each.key, "-dlq") ? jsonencode({
    deadLetterTargetArn = aws_sqs_queue.service["${each.key}-dlq"].arn
    maxReceiveCount     = 5
  }) : null

  kms_master_key_id = "alias/aws/sqs"

  tags = { Name = "${local.name}-sqs-${each.key}" }
}

###############################################################################
# SNS — domain events fanout
###############################################################################

resource "aws_sns_topic" "orders" {
  name              = "${local.name}-orders-events"
  kms_master_key_id = "alias/aws/sns"
  tags              = { Name = "${local.name}-sns-orders" }
}

resource "aws_sns_topic" "inventory" {
  name              = "${local.name}-inventory-events"
  kms_master_key_id = "alias/aws/sns"
  tags              = { Name = "${local.name}-sns-inventory" }
}

# Subscribe SQS queues to SNS topics
resource "aws_sns_topic_subscription" "orders_to_inventory" {
  topic_arn = aws_sns_topic.orders.arn
  protocol  = "sqs"
  endpoint  = aws_sqs_queue.service["inventory"].arn
}

resource "aws_sns_topic_subscription" "orders_to_notifications" {
  topic_arn = aws_sns_topic.orders.arn
  protocol  = "sqs"
  endpoint  = aws_sqs_queue.service["notifications"].arn
}

resource "aws_sqs_queue_policy" "allow_sns" {
  for_each  = toset(["inventory", "notifications"])
  queue_url = aws_sqs_queue.service[each.key].url

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "sns.amazonaws.com" }
      Action    = "sqs:SendMessage"
      Resource  = aws_sqs_queue.service[each.key].arn
      Condition = {
        ArnEquals = { "aws:SourceArn" = aws_sns_topic.orders.arn }
      }
    }]
  })
}

###############################################################################
# AURORA POSTGRES SERVERLESS V2
###############################################################################

resource "aws_db_subnet_group" "main" {
  name       = "${local.name}-db-subnet-group"
  subnet_ids = aws_subnet.data[*].id
  tags       = { Name = "${local.name}-db-subnet-group" }
}

resource "aws_secretsmanager_secret" "db" {
  name                    = "${local.name}/aurora/password"
  recovery_window_in_days = 30
  tags                    = { Name = "${local.name}-aurora-secret" }
}

resource "aws_secretsmanager_secret_version" "db" {
  secret_id     = aws_secretsmanager_secret.db.id
  secret_string = jsonencode({ password = "REPLACE_ON_FIRST_APPLY" })
  lifecycle { ignore_changes = [secret_string] }
}

resource "aws_rds_cluster_parameter_group" "main" {
  name   = "${local.name}-aurora-pg15"
  family = "aurora-postgresql15"

  parameter { name = "log_min_duration_statement"; value = "1000" }
  parameter { name = "shared_preload_libraries"; value = "pg_stat_statements"; apply_method = "pending-reboot" }

  tags = { Name = "${local.name}-aurora-params" }
}

resource "aws_rds_cluster" "main" {
  cluster_identifier      = "${local.name}-aurora"
  engine                  = "aurora-postgresql"
  engine_mode             = "provisioned"
  engine_version          = "15.4"
  database_name           = "novamart"
  master_username         = var.db_master_username
  master_password         = jsondecode(aws_secretsmanager_secret_version.db.secret_string)["password"]
  db_subnet_group_name    = aws_db_subnet_group.main.name
  vpc_security_group_ids  = [aws_security_group.aurora.id]
  db_cluster_parameter_group_name = aws_rds_cluster_parameter_group.main.name

  serverlessv2_scaling_configuration {
    min_capacity = 0.5
    max_capacity = 32
  }

  storage_encrypted           = true
  deletion_protection         = true
  skip_final_snapshot         = false
  final_snapshot_identifier   = "${local.name}-aurora-final"
  backup_retention_period     = 14
  preferred_backup_window     = "02:00-03:00"
  preferred_maintenance_window = "Mon:03:00-Mon:04:00"
  enabled_cloudwatch_logs_exports = ["postgresql"]

  tags = { Name = "${local.name}-aurora" }
}

resource "aws_rds_cluster_instance" "writer" {
  identifier         = "${local.name}-aurora-writer"
  cluster_identifier = aws_rds_cluster.main.id
  instance_class     = "db.serverless"
  engine             = aws_rds_cluster.main.engine
  engine_version     = aws_rds_cluster.main.engine_version

  performance_insights_enabled = true
  monitoring_interval          = 60
  auto_minor_version_upgrade   = true

  tags = { Name = "${local.name}-aurora-writer", Role = "writer" }
}

resource "aws_rds_cluster_instance" "reader" {
  count              = 2
  identifier         = "${local.name}-aurora-reader-${count.index}"
  cluster_identifier = aws_rds_cluster.main.id
  instance_class     = "db.serverless"
  engine             = aws_rds_cluster.main.engine
  engine_version     = aws_rds_cluster.main.engine_version

  performance_insights_enabled = true
  monitoring_interval          = 60

  tags = { Name = "${local.name}-aurora-reader-${count.index}", Role = "reader" }
}

###############################################################################
# ELASTICACHE REDIS (sessions + catalog cache)
###############################################################################

resource "aws_elasticache_subnet_group" "main" {
  name       = "${local.name}-redis-subnet-group"
  subnet_ids = aws_subnet.data[*].id
  tags       = { Name = "${local.name}-redis-subnet" }
}

resource "aws_secretsmanager_secret" "redis" {
  name                    = "${local.name}/redis/auth-token"
  recovery_window_in_days = 7
  tags                    = { Name = "${local.name}-redis-secret" }
}

resource "aws_secretsmanager_secret_version" "redis" {
  secret_id     = aws_secretsmanager_secret.redis.id
  secret_string = "REPLACE_WITH_STRONG_TOKEN"
  lifecycle { ignore_changes = [secret_string] }
}

resource "aws_elasticache_replication_group" "redis" {
  replication_group_id = "${local.name}-redis"
  description          = "NovaMart session + catalog cache"
  node_type            = "cache.r7g.large"
  num_cache_clusters   = 3
  engine_version       = "7.1"
  port                 = 6379

  subnet_group_name  = aws_elasticache_subnet_group.main.name
  security_group_ids = [aws_security_group.redis.id]

  at_rest_encryption_enabled  = true
  transit_encryption_enabled  = true
  auth_token                  = aws_secretsmanager_secret_version.redis.secret_string
  automatic_failover_enabled  = true
  multi_az_enabled            = true
  auto_minor_version_upgrade  = true
  snapshot_retention_limit    = 5
  snapshot_window             = "03:00-04:00"

  log_delivery_configuration {
    destination      = aws_cloudwatch_log_group.redis.name
    destination_type = "cloudwatch-logs"
    log_format       = "json"
    log_type         = "slow-log"
  }

  tags = { Name = "${local.name}-redis" }
}

resource "aws_cloudwatch_log_group" "redis" {
  name              = "/elasticache/${local.name}/redis"
  retention_in_days = 14
  tags              = { Name = "${local.name}-redis-logs" }
}

###############################################################################
# S3 — storefront static assets
###############################################################################

resource "aws_s3_bucket" "assets" {
  bucket = "${local.name}-assets-${data.aws_caller_identity.current.account_id}"
  tags   = { Name = "${local.name}-assets" }
}

resource "aws_s3_bucket_versioning" "assets" {
  bucket = aws_s3_bucket.assets.id
  versioning_configuration { status = "Enabled" }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "assets" {
  bucket = aws_s3_bucket.assets.id
  rule {
    apply_server_side_encryption_by_default { sse_algorithm = "AES256" }
  }
}

resource "aws_s3_bucket_public_access_block" "assets" {
  bucket                  = aws_s3_bucket.assets.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

###############################################################################
# CLOUDFRONT STOREFRONT
###############################################################################

resource "aws_cloudfront_origin_access_control" "assets" {
  name                              = "${local.name}-oac"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_distribution" "storefront" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "${local.name} storefront"
  default_root_object = "index.html"
  aliases             = [var.domain_name, "www.${var.domain_name}"]
  price_class         = "PriceClass_All"
  web_acl_id          = aws_wafv2_web_acl.cloudfront.arn

  origin {
    origin_id                = "s3-assets"
    domain_name              = aws_s3_bucket.assets.bucket_regional_domain_name
    origin_access_control_id = aws_cloudfront_origin_access_control.assets.id
  }

  origin {
    origin_id   = "api"
    domain_name = aws_lb.public.dns_name
    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  default_cache_behavior {
    target_origin_id       = "s3-assets"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true

    forwarded_values {
      query_string = false
      cookies { forward = "none" }
    }

    min_ttl     = 0
    default_ttl = 3600
    max_ttl     = 86400
  }

  ordered_cache_behavior {
    path_pattern           = "/api/*"
    target_origin_id       = "api"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD"]

    forwarded_values {
      query_string = true
      headers      = ["Authorization", "Content-Type", "X-Correlation-ID"]
      cookies { forward = "all" }
    }

    min_ttl     = 0
    default_ttl = 0
    max_ttl     = 0
  }

  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html" # SPA fallback
  }

  restrictions { geo_restriction { restriction_type = "none" } }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate.main.arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  tags = { Name = "${local.name}-cloudfront" }
}

# Separate WAF for CloudFront (must be us-east-1 + CLOUDFRONT scope)
resource "aws_wafv2_web_acl" "cloudfront" {
  provider = aws.us_east_1
  name     = "${local.name}-waf-cf"
  scope    = "CLOUDFRONT"

  default_action { allow {} }

  rule {
    name     = "AWSManagedRulesCommonRuleSet"
    priority = 1
    override_action { none {} }
    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${local.name}-cf-waf"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "${local.name}-waf-cf"
    sampled_requests_enabled   = true
  }

  tags = { Name = "${local.name}-waf-cf" }
}

###############################################################################
# EVENTBRIDGE — scheduled jobs
###############################################################################

resource "aws_cloudwatch_event_bus" "main" {
  name = "${local.name}-bus"
  tags = { Name = "${local.name}-event-bus" }
}

resource "aws_cloudwatch_event_rule" "inventory_sync" {
  name                = "${local.name}-inventory-sync"
  event_bus_name      = aws_cloudwatch_event_bus.main.name
  schedule_expression = "rate(15 minutes)"
  description         = "Trigger inventory sync from warehouse API"
  tags                = { Name = "${local.name}-inventory-sync-rule" }
}

resource "aws_cloudwatch_event_target" "inventory_sync" {
  rule           = aws_cloudwatch_event_rule.inventory_sync.name
  event_bus_name = aws_cloudwatch_event_bus.main.name
  target_id      = "inventory-sqs"
  arn            = aws_sqs_queue.service["inventory"].arn
}

resource "aws_cloudwatch_event_rule" "daily_report" {
  name                = "${local.name}-daily-report"
  event_bus_name      = aws_cloudwatch_event_bus.main.name
  schedule_expression = "cron(0 6 * * ? *)" # 6am UTC daily
  description         = "Trigger daily sales report generation"
  tags                = { Name = "${local.name}-daily-report-rule" }
}

resource "aws_cloudwatch_event_target" "daily_report" {
  rule           = aws_cloudwatch_event_rule.daily_report.name
  event_bus_name = aws_cloudwatch_event_bus.main.name
  target_id      = "notifications-sqs"
  arn            = aws_sqs_queue.service["notifications"].arn
}

###############################################################################
# REDSHIFT SERVERLESS — analytics / BI
###############################################################################

resource "aws_redshiftserverless_namespace" "main" {
  namespace_name      = "${local.name}-analytics"
  db_name             = "analytics"
  admin_username      = "analyticsadmin"
  admin_user_password = "REPLACE_ME_SECURELY"

  log_exports = ["userlog", "connectionlog", "useractivitylog"]
  tags        = { Name = "${local.name}-redshift-ns" }
}

resource "aws_redshiftserverless_workgroup" "main" {
  namespace_name = aws_redshiftserverless_namespace.main.namespace_name
  workgroup_name = "${local.name}-analytics-wg"
  base_capacity  = 32 # RPUs
  subnet_ids     = aws_subnet.data[*].id
  security_group_ids = [aws_security_group.aurora.id] # Reuse data-tier SG

  publicly_accessible = false
  tags                = { Name = "${local.name}-redshift-wg" }
}

###############################################################################
# SNS ALERTS + CLOUDWATCH ALARMS
###############################################################################

resource "aws_sns_topic" "alerts" {
  name = "${local.name}-alerts"
  tags = { Name = "${local.name}-alerts" }
}

resource "aws_sns_topic_subscription" "alerts_email" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

resource "aws_cloudwatch_metric_alarm" "aurora_cpu" {
  alarm_name          = "${local.name}-aurora-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_actions       = [aws_sns_topic.alerts.arn]
  dimensions          = { DBClusterIdentifier = aws_rds_cluster.main.cluster_identifier }
  tags                = { Name = "${local.name}-aurora-cpu-alarm" }
}

resource "aws_cloudwatch_metric_alarm" "redis_cpu" {
  alarm_name          = "${local.name}-redis-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ElastiCache"
  period              = 300
  statistic           = "Average"
  threshold           = 70
  alarm_actions       = [aws_sns_topic.alerts.arn]
  dimensions          = { ReplicationGroupId = aws_elasticache_replication_group.redis.id }
  tags                = { Name = "${local.name}-redis-cpu-alarm" }
}

resource "aws_cloudwatch_metric_alarm" "sqs_dlq_depth" {
  for_each            = toset(["orders-dlq", "inventory-dlq", "notifications-dlq"])
  alarm_name          = "${local.name}-${each.key}-depth"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ApproximateNumberOfMessagesVisible"
  namespace           = "AWS/SQS"
  period              = 60
  statistic           = "Sum"
  threshold           = 0
  alarm_description   = "Messages in DLQ — requires investigation"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  treat_missing_data  = "notBreaching"
  dimensions          = { QueueName = aws_sqs_queue.service[each.key].name }
  tags                = { Name = "${local.name}-${each.key}-alarm" }
}

###############################################################################
# OUTPUTS
###############################################################################

output "storefront_url"       { value = "https://${var.domain_name}" }
output "api_url"              { value = "https://api.${var.domain_name}" }
output "cloudfront_domain"    { value = aws_cloudfront_distribution.storefront.domain_name }
output "aurora_writer"        { value = aws_rds_cluster.main.endpoint }
output "aurora_reader"        { value = aws_rds_cluster.main.reader_endpoint }
output "redis_primary"        { value = aws_elasticache_replication_group.redis.primary_endpoint_address }
output "redshift_endpoint"    { value = aws_redshiftserverless_workgroup.main.endpoint }
output "orders_queue_url"     { value = aws_sqs_queue.service["orders"].url }
output "orders_dlq_url"       { value = aws_sqs_queue.service["orders-dlq"].url }
output "event_bus_arn"        { value = aws_cloudwatch_event_bus.main.arn }
