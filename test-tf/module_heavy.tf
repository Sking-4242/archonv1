###############################################################################
# MODULE-HEAVY FIXTURE — "NexaCloud" Multi-Tenant SaaS Platform
#
# Purpose: Exercise every module-handling path in tf_import_catalog.py
#   1. All 5 known terraform-aws-modules registry modules (vpc, eks,
#      rds-aurora, s3-bucket, alb) — should produce registry placeholders
#      with curated metadata.
#   2. Local module references (./modules/networking, ./modules/security,
#      ./modules/monitoring) — should trigger local expansion if source
#      files are present, placeholder node if not.
#   3. Unknown registry modules (hashicorp/consul/aws,
#      cloudposse/ecr/aws) — should produce generic placeholder nodes.
#   4. Module outputs referenced in resources + data sources — cross-module
#      dependency wiring.
#   5. Companion-type resources hanging off module-created primaries
#      (s3 bucket companions, lb listener rules, etc.)
#   6. for_each module instantiation — multiple instances from one block.
#   7. count-based module instantiation.
#   8. Version-pinned registry source strings (semver constraint).
#   9. git:: source strings that normalize to known modules.
#  10. registry.terraform.io/modules/ prefix normalization.
#
# Business context:
#   A 300-person B2B SaaS company serving 800 enterprise tenants.
#   Multi-AZ single-region (us-east-1) with per-tenant namespace isolation
#   on shared EKS. Five environments: dev, staging, perf, prod-blue, prod-green.
#   GitOps via Atlantis; this file represents the prod-blue root module.
###############################################################################

terraform {
  required_version = ">= 1.6.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.40"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.27"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.13"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }

  backend "s3" {
    bucket         = "nexacloud-tfstate-prod"
    key            = "prod-blue/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "nexacloud-tf-locks"
  }
}

provider "aws" {
  region = var.region
  default_tags {
    tags = {
      Project     = "nexacloud"
      Environment = var.environment
      ManagedBy   = "terraform"
      CostCenter  = "engineering"
    }
  }
}

###############################################################################
# VARIABLES
###############################################################################

variable "region"      { type = string; default = "us-east-1" }
variable "environment" { type = string; default = "prod-blue" }
variable "company"     { type = string; default = "nexacloud" }

variable "vpc_cidr" { type = string; default = "10.50.0.0/16" }
variable "azs" {
  type    = list(string)
  default = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

variable "private_subnets" {
  type    = list(string)
  default = ["10.50.1.0/24", "10.50.2.0/24", "10.50.3.0/24"]
}

variable "public_subnets" {
  type    = list(string)
  default = ["10.50.101.0/24", "10.50.102.0/24", "10.50.103.0/24"]
}

variable "database_subnets" {
  type    = list(string)
  default = ["10.50.201.0/24", "10.50.202.0/24", "10.50.203.0/24"]
}

variable "eks_cluster_version" { type = string; default = "1.29" }

variable "node_groups" {
  type = map(object({
    instance_types = list(string)
    min_size       = number
    max_size       = number
    desired_size   = number
  }))
  default = {
    system = {
      instance_types = ["m6i.large"]
      min_size       = 2
      max_size       = 4
      desired_size   = 2
    }
    workers = {
      instance_types = ["m6i.2xlarge", "m6i.4xlarge"]
      min_size       = 3
      max_size       = 30
      desired_size   = 6
    }
    spot = {
      instance_types = ["m6i.2xlarge", "m5.2xlarge", "m5n.2xlarge"]
      min_size       = 0
      max_size       = 50
      desired_size   = 0
    }
  }
}

variable "tenant_buckets" {
  description = "Per-tenant artifact buckets to create via for_each module"
  type = map(object({
    versioning = bool
    lifecycle_days = number
  }))
  default = {
    "tenant-alpha"   = { versioning = true,  lifecycle_days = 90 }
    "tenant-beta"    = { versioning = true,  lifecycle_days = 180 }
    "tenant-gamma"   = { versioning = false, lifecycle_days = 30 }
  }
}

###############################################################################
# DATA SOURCES (minimal — data_source_heavy.tf covers this in depth)
###############################################################################

data "aws_caller_identity" "current" {}
data "aws_partition" "current" {}
data "aws_region" "current" {}

data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_route53_zone" "primary" {
  name         = "nexacloud.io"
  private_zone = false
}

data "aws_acm_certificate" "wildcard" {
  domain      = "*.nexacloud.io"
  statuses    = ["ISSUED"]
  most_recent = true
}

###############################################################################
# LOCALS
###############################################################################

locals {
  name           = "${var.company}-${var.environment}"
  account_id     = data.aws_caller_identity.current.account_id
  partition      = data.aws_partition.current.partition
  region         = data.aws_region.current.name

  common_tags = {
    Project     = var.company
    Environment = var.environment
  }
}

###############################################################################
# ── MODULE 1: terraform-aws-modules/vpc/aws ──────────────────────────────────
# Tests: registry normalization, expected_resources metadata, archon_types
###############################################################################

module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.8"

  name = "${local.name}-vpc"
  cidr = var.vpc_cidr

  azs              = var.azs
  private_subnets  = var.private_subnets
  public_subnets   = var.public_subnets
  database_subnets = var.database_subnets

  enable_nat_gateway     = true
  single_nat_gateway     = false
  one_nat_gateway_per_az = true

  enable_dns_hostnames = true
  enable_dns_support   = true

  enable_flow_log                      = true
  create_flow_log_cloudwatch_log_group = true
  create_flow_log_cloudwatch_iam_role  = true
  flow_log_max_aggregation_interval    = 60

  # Kubernetes tags for EKS subnet discovery
  private_subnet_tags = {
    "kubernetes.io/role/internal-elb" = "1"
    "kubernetes.io/cluster/${local.name}-eks" = "shared"
  }
  public_subnet_tags = {
    "kubernetes.io/role/elb" = "1"
    "kubernetes.io/cluster/${local.name}-eks" = "shared"
  }

  tags = local.common_tags
}

###############################################################################
# ── MODULE 2: terraform-aws-modules/eks/aws ──────────────────────────────────
# Tests: expected_resources (cluster, node groups, iam, sg), cross-module refs
###############################################################################

module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 20.8"

  cluster_name    = "${local.name}-eks"
  cluster_version = var.eks_cluster_version

  vpc_id                         = module.vpc.vpc_id
  subnet_ids                     = module.vpc.private_subnets
  cluster_endpoint_public_access = false

  cluster_addons = {
    coredns                = { most_recent = true }
    kube-proxy             = { most_recent = true }
    vpc-cni                = { most_recent = true }
    aws-ebs-csi-driver     = { most_recent = true }
    aws-efs-csi-driver     = { most_recent = true }
    eks-pod-identity-agent = { most_recent = true }
  }

  eks_managed_node_groups = {
    for name, cfg in var.node_groups : name => {
      instance_types = cfg.instance_types
      min_size       = cfg.min_size
      max_size       = cfg.max_size
      desired_size   = cfg.desired_size
      capacity_type  = name == "spot" ? "SPOT" : "ON_DEMAND"

      block_device_mappings = {
        xvda = {
          device_name = "/dev/xvda"
          ebs = {
            volume_size           = 100
            volume_type           = "gp3"
            iops                  = 3000
            throughput            = 125
            encrypted             = true
            delete_on_termination = true
          }
        }
      }

      labels = {
        "nexacloud.io/node-group" = name
        "nexacloud.io/env"        = var.environment
      }

      taints = name == "system" ? [
        { key = "CriticalAddonsOnly", value = "true", effect = "NO_SCHEDULE" }
      ] : []
    }
  }

  # Access entries for GitOps + admin
  access_entries = {
    atlantis = {
      kubernetes_groups = []
      principal_arn     = aws_iam_role.atlantis.arn
      policy_associations = {
        admin = {
          policy_arn   = "arn:${local.partition}:eks::aws:cluster-access-policy/AmazonEKSClusterAdminPolicy"
          access_scope = { type = "cluster" }
        }
      }
    }
  }

  tags = local.common_tags
}

###############################################################################
# ── MODULE 3: terraform-aws-modules/rds-aurora/aws ───────────────────────────
# Tests: Aurora cluster + instances from module, companion detection
###############################################################################

module "aurora_postgres" {
  source  = "terraform-aws-modules/rds-aurora/aws"
  version = "~> 9.3"

  name            = "${local.name}-aurora-pg"
  engine          = "aurora-postgresql"
  engine_version  = "16.2"
  instance_class  = "db.r7g.2xlarge"
  instances = {
    writer = {}
    reader-1 = { instance_class = "db.r7g.xlarge", promotion_tier = 2 }
    reader-2 = { instance_class = "db.r7g.xlarge", promotion_tier = 3 }
  }

  vpc_id               = module.vpc.vpc_id
  db_subnet_group_name = module.vpc.database_subnet_group_name
  security_group_rules = {
    eks_ingress = {
      source_security_group_id = module.eks.node_security_group_id
    }
  }

  storage_encrypted   = true
  apply_immediately   = false
  skip_final_snapshot = false
  deletion_protection = true

  enabled_cloudwatch_logs_exports = ["postgresql"]

  performance_insights_enabled          = true
  performance_insights_retention_period = 7

  monitoring_interval = 60

  backup_retention_period = 14
  preferred_backup_window = "03:00-04:00"
  preferred_maintenance_window = "sun:05:00-sun:06:00"

  tags = local.common_tags
}

###############################################################################
# ── MODULE 4: terraform-aws-modules/alb/aws ──────────────────────────────────
# Tests: ALB + listeners + target groups from module, cross-module output refs
###############################################################################

module "alb_public" {
  source  = "terraform-aws-modules/alb/aws"
  version = "~> 9.9"

  name    = "${local.name}-alb-public"
  vpc_id  = module.vpc.vpc_id
  subnets = module.vpc.public_subnets

  # Security group
  security_group_ingress_rules = {
    all_http = {
      from_port   = 80
      to_port     = 80
      ip_protocol = "tcp"
      cidr_ipv4   = "0.0.0.0/0"
    }
    all_https = {
      from_port   = 443
      to_port     = 443
      ip_protocol = "tcp"
      cidr_ipv4   = "0.0.0.0/0"
    }
  }
  security_group_egress_rules = {
    all = {
      ip_protocol = "-1"
      cidr_ipv4   = module.vpc.vpc_cidr_block
    }
  }

  listeners = {
    http_redirect = {
      port     = 80
      protocol = "HTTP"
      redirect = {
        port        = "443"
        protocol    = "HTTPS"
        status_code = "HTTP_301"
      }
    }
    https = {
      port            = 443
      protocol        = "HTTPS"
      certificate_arn = data.aws_acm_certificate.wildcard.arn
      forward = {
        target_group_key = "api"
      }
      rules = {
        tenant_routing = {
          actions = [{
            type             = "forward"
            target_group_key = "api"
          }]
          conditions = [{
            host_header = { values = ["*.nexacloud.io"] }
          }]
        }
      }
    }
  }

  target_groups = {
    api = {
      name_prefix      = "api-"
      protocol         = "HTTP"
      port             = 8080
      target_type      = "ip"
      create_attachment = false
      health_check = {
        enabled             = true
        healthy_threshold   = 2
        interval            = 15
        matcher             = "200"
        path                = "/health"
        port                = "traffic-port"
        protocol            = "HTTP"
        timeout             = 5
        unhealthy_threshold = 3
      }
    }
  }

  tags = local.common_tags
}

###############################################################################
# ── MODULE 5: terraform-aws-modules/s3-bucket/aws — for_each instantiation ──
# Tests: for_each module, multiple instances, companion merging per instance
###############################################################################

module "tenant_bucket" {
  source  = "terraform-aws-modules/s3-bucket/aws"
  version = "~> 4.1"

  for_each = var.tenant_buckets

  bucket = "${local.name}-${each.key}-artifacts"

  versioning = {
    enabled = each.value.versioning
  }

  server_side_encryption_configuration = {
    rule = {
      apply_server_side_encryption_by_default = {
        sse_algorithm     = "aws:kms"
        kms_master_key_id = aws_kms_key.tenant.arn
      }
    }
  }

  lifecycle_rule = [
    {
      id      = "expire-old-artifacts"
      enabled = true
      expiration = {
        days = each.value.lifecycle_days
      }
      noncurrent_version_expiration = {
        noncurrent_days = 30
      }
    }
  ]

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true

  tags = merge(local.common_tags, { Tenant = each.key })
}

###############################################################################
# ── MODULE 6: git:: source → known registry module normalization ─────────────
# Tests: normalize_registry_source() git:: branch
###############################################################################

module "vpc_dr" {
  source = "git::https://github.com/terraform-aws-modules/terraform-aws-vpc.git?ref=v5.8.1"

  name = "${local.name}-vpc-dr"
  cidr = "10.51.0.0/16"

  azs             = ["us-east-1a", "us-east-1b"]
  private_subnets = ["10.51.1.0/24", "10.51.2.0/24"]
  public_subnets  = ["10.51.101.0/24", "10.51.102.0/24"]

  enable_nat_gateway = true
  single_nat_gateway = true

  tags = merge(local.common_tags, { Role = "dr-network" })
}

###############################################################################
# ── MODULE 7: registry.terraform.io/modules/ prefix normalization ────────────
# Tests: normalize_registry_source() registry.terraform.io branch
###############################################################################

module "alb_internal" {
  source  = "registry.terraform.io/modules/terraform-aws-modules/alb/aws"
  version = "9.9.0"

  name    = "${local.name}-alb-internal"
  vpc_id  = module.vpc.vpc_id
  subnets = module.vpc.private_subnets

  internal = true

  security_group_ingress_rules = {
    eks_api = {
      from_port                    = 8080
      to_port                      = 8090
      ip_protocol                  = "tcp"
      referenced_security_group_id = module.eks.node_security_group_id
    }
  }

  listeners = {
    http = {
      port     = 80
      protocol = "HTTP"
      forward  = { target_group_key = "grpc" }
    }
  }

  target_groups = {
    grpc = {
      name_prefix  = "grpc-"
      protocol     = "HTTP"
      port         = 9090
      target_type  = "ip"
      create_attachment = false
    }
  }

  tags = local.common_tags
}

###############################################################################
# ── MODULE 8: LOCAL module — ./modules/security ──────────────────────────────
# Tests: local path expansion, normalize_module_path()
###############################################################################

module "security" {
  source = "./modules/security"

  name       = local.name
  account_id = local.account_id
  region     = local.region
  vpc_id     = module.vpc.vpc_id

  kms_key_arns = [
    aws_kms_key.tenant.arn,
    aws_kms_key.rds.arn,
  ]

  enable_guardduty    = true
  enable_securityhub  = true
  enable_config       = true
  enable_macie        = true
}

###############################################################################
# ── MODULE 9: LOCAL module — ./modules/monitoring ────────────────────────────
# Tests: second local path, monitoring resources
###############################################################################

module "monitoring" {
  source = "./modules/monitoring"

  name               = local.name
  account_id         = local.account_id
  region             = local.region
  eks_cluster_name   = module.eks.cluster_name
  aurora_cluster_id  = module.aurora_postgres.cluster_id
  alb_arn_suffix     = module.alb_public.arn_suffix
  sns_alert_arn      = aws_sns_topic.alerts.arn
}

###############################################################################
# ── MODULE 10: UNKNOWN registry module — cloudposse/ecr ─────────────────────
# Tests: unknown module → generic placeholder node with source + explanation
###############################################################################

module "ecr" {
  source  = "cloudposse/ecr/aws"
  version = "~> 0.41"

  namespace   = var.company
  environment = var.environment
  name        = "api"

  image_names = [
    "nexacloud/api-gateway",
    "nexacloud/tenant-service",
    "nexacloud/billing-service",
    "nexacloud/notification-service",
  ]

  image_tag_mutability = "IMMUTABLE"
  scan_images_on_push  = true
  enable_lifecycle_policy = true
  max_image_count         = 50

  principals_full_access  = [aws_iam_role.atlantis.arn]
  principals_push_access  = [aws_iam_role.ci_pipeline.arn]
}

###############################################################################
# ── MODULE 11: UNKNOWN registry module — hashicorp/consul ───────────────────
# Tests: second unknown module (completely different namespace)
###############################################################################

module "consul" {
  source  = "hashicorp/consul/aws"
  version = "~> 0.1"

  datacenter          = local.name
  vpc_id              = module.vpc.vpc_id
  private_subnet_ids  = module.vpc.private_subnets
  allowed_cidr_blocks = [var.vpc_cidr]
  num_servers         = 3
  num_clients         = 0
  cluster_name        = "${local.name}-consul"
  ami_id              = "ami-0abcdef1234567890"
}

###############################################################################
# ── MODULE 12: count-based instantiation ─────────────────────────────────────
# Tests: module count meta-argument (both index 0 and 1 wired separately)
###############################################################################

module "nat_monitor" {
  source = "./modules/nat_monitor"
  count  = length(var.azs)

  name      = "${local.name}-nat-monitor-${count.index}"
  region    = var.region
  az        = var.azs[count.index]
  alarm_arn = aws_sns_topic.alerts.arn
}

###############################################################################
# STANDALONE RESOURCES — cross-module wiring + companions
###############################################################################

# KMS keys referenced by modules
resource "aws_kms_key" "tenant" {
  description             = "${local.name} tenant data CMK"
  deletion_window_in_days = 30
  enable_key_rotation     = true
  multi_region            = false

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "Enable IAM User Permissions"
        Effect    = "Allow"
        Principal = { AWS = "arn:${local.partition}:iam::${local.account_id}:root" }
        Action    = "kms:*"
        Resource  = "*"
      }
    ]
  })

  tags = local.common_tags
}

resource "aws_kms_alias" "tenant" {
  name          = "alias/${local.name}-tenant"
  target_key_id = aws_kms_key.tenant.key_id
}

resource "aws_kms_key" "rds" {
  description             = "${local.name} RDS CMK"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  tags = local.common_tags
}

resource "aws_kms_alias" "rds" {
  name          = "alias/${local.name}-rds"
  target_key_id = aws_kms_key.rds.key_id
}

# SNS alerts topic (consumed by monitoring module + standalone alarms)
resource "aws_sns_topic" "alerts" {
  name              = "${local.name}-alerts"
  kms_master_key_id = aws_kms_key.tenant.arn
  tags              = local.common_tags
}

resource "aws_sns_topic_subscription" "pagerduty" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "https"
  endpoint  = "https://events.pagerduty.com/integration/REPLACE/enqueue"
  endpoint_auto_confirms = true
}

# IAM roles referenced by modules (outputs consumed as module inputs)
resource "aws_iam_role" "atlantis" {
  name = "${local.name}-atlantis"

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

resource "aws_iam_role_policy_attachment" "atlantis_eks_admin" {
  role       = aws_iam_role.atlantis.name
  policy_arn = "arn:${local.partition}:iam::aws:policy/AmazonEKSClusterPolicy"
}

resource "aws_iam_role" "ci_pipeline" {
  name = "${local.name}-ci-pipeline"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Federated = "arn:${local.partition}:iam::${local.account_id}:oidc-provider/token.actions.githubusercontent.com" }
      Action    = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringLike = {
          "token.actions.githubusercontent.com:sub" = "repo:nexacloud/*:*"
        }
      }
    }]
  })

  tags = local.common_tags
}

# S3 companion resources — hanging off buckets created outside a module
# These should merge onto their parent S3 bucket nodes
resource "aws_s3_bucket" "logs" {
  bucket = "${local.name}-alb-logs"
  tags   = merge(local.common_tags, { Role = "logs" })
}

resource "aws_s3_bucket_public_access_block" "logs" {
  bucket                  = aws_s3_bucket.logs.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "logs" {
  bucket = aws_s3_bucket.logs.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "logs" {
  bucket = aws_s3_bucket.logs.id
  rule {
    id     = "expire-logs"
    status = "Enabled"
    expiration { days = 90 }
  }
}

resource "aws_s3_bucket_policy" "logs" {
  bucket = aws_s3_bucket.logs.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "elasticloadbalancing.amazonaws.com" }
      Action    = "s3:PutObject"
      Resource  = "${aws_s3_bucket.logs.arn}/AWSLogs/*"
    }]
  })
}

# ALB access logs — wires standalone S3 bucket to ALB (cross-module output ref)
resource "aws_lb_listener_rule" "maintenance" {
  listener_arn = module.alb_public.listeners["https"].arn
  priority     = 100

  action {
    type = "fixed-response"
    fixed_response {
      content_type = "application/json"
      message_body = "{\"status\":\"maintenance\"}"
      status_code  = "503"
    }
  }

  condition {
    http_header {
      http_header_name = "X-Maintenance-Mode"
      values           = ["true"]
    }
  }
}

# Standalone EKS add-on — companion to the EKS cluster created by module
resource "aws_eks_addon" "karpenter" {
  cluster_name             = module.eks.cluster_name
  addon_name               = "eks-pod-identity-agent"
  resolve_conflicts_on_update = "OVERWRITE"
  tags                     = local.common_tags
}

# Route53 record pointing to public ALB (uses data source + module output)
resource "aws_route53_record" "api" {
  zone_id = data.aws_route53_zone.primary.zone_id
  name    = "api.nexacloud.io"
  type    = "A"

  alias {
    name                   = module.alb_public.dns_name
    zone_id                = module.alb_public.zone_id
    evaluate_target_health = true
  }
}

resource "aws_route53_record" "wildcard" {
  zone_id = data.aws_route53_zone.primary.zone_id
  name    = "*.nexacloud.io"
  type    = "A"

  alias {
    name                   = module.alb_public.dns_name
    zone_id                = module.alb_public.zone_id
    evaluate_target_health = true
  }
}

# DynamoDB table for Terraform state locking (referenced in backend config)
resource "aws_dynamodb_table" "tf_locks" {
  name         = "nexacloud-tf-locks"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  server_side_encryption {
    enabled     = true
    kms_key_arn = aws_kms_key.tenant.arn
  }

  tags = merge(local.common_tags, { Role = "tf-state-lock" })
}

# CloudWatch log group — companion to EKS cluster
resource "aws_cloudwatch_log_group" "eks" {
  name              = "/aws/eks/${module.eks.cluster_name}/cluster"
  retention_in_days = 90
  kms_key_id        = aws_kms_key.tenant.arn
  tags              = local.common_tags
}

###############################################################################
# OUTPUTS — expose module outputs for consumption by child modules / CI
###############################################################################

output "vpc_id"              { value = module.vpc.vpc_id }
output "private_subnet_ids"  { value = module.vpc.private_subnets }
output "public_subnet_ids"   { value = module.vpc.public_subnets }
output "database_subnet_ids" { value = module.vpc.database_subnets }
output "eks_cluster_name"    { value = module.eks.cluster_name }
output "eks_cluster_endpoint" { value = module.eks.cluster_endpoint }
output "aurora_cluster_endpoint" { value = module.aurora_postgres.cluster_endpoint }
output "alb_public_dns"      { value = module.alb_public.dns_name }
output "alb_internal_dns"    { value = module.alb_internal.dns_name }
output "logs_bucket_arn"     { value = aws_s3_bucket.logs.arn }
