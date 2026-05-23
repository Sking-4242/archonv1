###############################################################################
# LARGE COMPANY — "CapexCloud" Enterprise Financial Services Platform
#
# Business context:
#   A 1,400-person financial services firm managing ~$12B AUM through a
#   cloud-native investment platform. Products: retail brokerage, robo-advisor,
#   institutional FIX trading gateway, and a compliance/reporting suite.
#   Regulated under SOX, PCI-DSS L1, FINRA, and SEC Rule 17a-4.
#   ~200k DAU retail. SLA: 99.99% uptime. RPO: 1 min. RTO: 15 min.
#   Multi-region active-active (us-east-1 primary, us-west-2 DR).
#   This file represents the PRIMARY REGION shared services + core platform.
#
# AWS footprint:
#   Hub-and-spoke architecture via Transit Gateway.
#   Separate VPCs: shared-services, trading, retail, compliance, mgmt.
#   EKS (managed node groups) for microservices workloads.
#   MSK (Kafka) for trade event streaming.
#   DynamoDB Global Tables for low-latency order state.
#   Aurora Global Database (Postgres) for relational workloads.
#   ElastiCache Global Datastore (Redis) for session/rate-limit state.
#   Step Functions for regulatory workflow orchestration.
#   Macie + GuardDuty + Security Hub + Config for compliance posture.
#   CloudTrail + Kinesis Firehose → S3 WORM for SEC 17a-4 immutable audit logs.
#   KMS CMKs per data classification.  WAF + Shield Advanced.
#   Direct Connect (simulated) via DX Gateway + TGW.
###############################################################################

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.25"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }

  backend "s3" {
    bucket         = "capexcloud-tfstate-us-east-1"
    key            = "primary/shared-services/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    kms_key_id     = "alias/capexcloud-tfstate-cmk"
    dynamodb_table = "capexcloud-tf-locks"
  }
}

###############################################################################
# VARIABLES
###############################################################################

variable "primary_region"   { type = string; default = "us-east-1" }
variable "dr_region"        { type = string; default = "us-west-2" }
variable "company"          { type = string; default = "capexcloud" }
variable "environment"      { type = string; default = "prod" }
variable "domain_name"      { type = string; default = "capexcloud.com" }
variable "internal_domain"  { type = string; default = "capex.internal" }

variable "primary_azs" {
  type    = list(string)
  default = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

variable "alert_pagerduty_endpoint" {
  description = "PagerDuty HTTPS endpoint for SNS subscription"
  type        = string
  default     = "https://events.pagerduty.com/integration/REPLACE/enqueue"
}

variable "direct_connect_bgp_asn"     { type = number; default = 64999 }
variable "direct_connect_gateway_id"  { type = string; default = "REPLACE_WITH_DX_GW_ID" }

variable "eks_node_instance_types" {
  type    = list(string)
  default = ["m6i.2xlarge", "m6i.4xlarge"]
}

variable "eks_desired_nodes"  { type = number; default = 6 }
variable "eks_min_nodes"      { type = number; default = 3 }
variable "eks_max_nodes"      { type = number; default = 30 }

variable "kafka_broker_count"          { type = number; default = 3 }
variable "kafka_instance_type"         { type = string; default = "kafka.m5.2xlarge" }
variable "kafka_ebs_volume_size"       { type = number; default = 2000 }

variable "aws_account_id"              { type = string; default = "123456789012" }
variable "security_account_id"         { type = string; default = "234567890123" }
variable "log_archive_account_id"      { type = string; default = "345678901234" }

###############################################################################
# LOCALS
###############################################################################

locals {
  name = "${var.company}-${var.environment}"

  # VPC CIDR allocations per domain
  vpcs = {
    shared    = "10.100.0.0/16"
    trading   = "10.101.0.0/16"
    retail    = "10.102.0.0/16"
    compliance = "10.103.0.0/16"
    mgmt      = "10.104.0.0/16"
  }

  # Subnet slicing: /20 each → 4,094 hosts
  az_count = length(var.primary_azs)

  tags = {
    Company        = var.company
    Environment    = var.environment
    ManagedBy      = "terraform"
    DataClass      = "confidential"
    ComplianceScope = "sox,pci,finra"
  }
}

###############################################################################
# PROVIDERS
###############################################################################

provider "aws" {
  region = var.primary_region
  default_tags { tags = local.tags }
}

provider "aws" {
  alias  = "dr"
  region = var.dr_region
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
# KMS CMKs — one per data classification domain
###############################################################################

locals {
  cmk_keys = [
    "trading-data",
    "retail-pii",
    "audit-logs",
    "secrets",
    "eks-etcd",
    "kafka-data",
    "aurora-data",
    "dynamo-data",
  ]
}

resource "aws_kms_key" "domain" {
  for_each                = toset(local.cmk_keys)
  description             = "${local.name} CMK — ${each.key}"
  deletion_window_in_days = 30
  enable_key_rotation     = true
  multi_region            = contains(["aurora-data", "dynamo-data", "retail-pii"], each.key)

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "Enable IAM User Permissions"
        Effect = "Allow"
        Principal = { AWS = "arn:aws:iam::${var.aws_account_id}:root" }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "Allow CloudTrail"
        Effect = "Allow"
        Principal = { Service = "cloudtrail.amazonaws.com" }
        Action   = ["kms:GenerateDataKey*", "kms:DescribeKey"]
        Resource = "*"
      }
    ]
  })

  tags = { Name = "${local.name}-cmk-${each.key}", KeyDomain = each.key }
}

resource "aws_kms_alias" "domain" {
  for_each      = toset(local.cmk_keys)
  name          = "alias/${local.name}-${each.key}"
  target_key_id = aws_kms_key.domain[each.key].key_id
}

###############################################################################
# VPCs — one per business domain
###############################################################################

resource "aws_vpc" "domain" {
  for_each             = local.vpcs
  cidr_block           = each.value
  enable_dns_support   = true
  enable_dns_hostnames = true
  tags                 = { Name = "${local.name}-vpc-${each.key}", Domain = each.key }
}

resource "aws_internet_gateway" "public_vpcs" {
  for_each = { for k, v in local.vpcs : k => v if contains(["shared", "retail"], k) }
  vpc_id   = aws_vpc.domain[each.key].id
  tags     = { Name = "${local.name}-igw-${each.key}" }
}

# Public subnets — only shared and retail VPCs have public tiers
resource "aws_subnet" "public" {
  for_each = {
    for combo in flatten([
      for vpc_key in ["shared", "retail"] : [
        for az_idx in range(local.az_count) : {
          key     = "${vpc_key}-${az_idx}"
          vpc_key = vpc_key
          az_idx  = az_idx
        }
      ]
    ]) : combo.key => combo
  }

  vpc_id            = aws_vpc.domain[each.value.vpc_key].id
  cidr_block        = cidrsubnet(local.vpcs[each.value.vpc_key], 4, each.value.az_idx)
  availability_zone = var.primary_azs[each.value.az_idx]
  tags = {
    Name   = "${local.name}-public-${each.value.vpc_key}-${var.primary_azs[each.value.az_idx]}"
    Tier   = "public"
    Domain = each.value.vpc_key
  }
}

# Private subnets — all VPCs
resource "aws_subnet" "private" {
  for_each = {
    for combo in flatten([
      for vpc_key, vpc_cidr in local.vpcs : [
        for az_idx in range(local.az_count) : {
          key      = "${vpc_key}-${az_idx}"
          vpc_key  = vpc_key
          vpc_cidr = vpc_cidr
          az_idx   = az_idx
        }
      ]
    ]) : combo.key => combo
  }

  vpc_id            = aws_vpc.domain[each.value.vpc_key].id
  cidr_block        = cidrsubnet(each.value.vpc_cidr, 4, each.value.az_idx + 4)
  availability_zone = var.primary_azs[each.value.az_idx]
  tags = {
    Name   = "${local.name}-private-${each.value.vpc_key}-${var.primary_azs[each.value.az_idx]}"
    Tier   = "private"
    Domain = each.value.vpc_key
    # Tag for EKS node discovery
    "kubernetes.io/role/internal-elb" = "1"
  }
}

# Data subnets — all VPCs
resource "aws_subnet" "data" {
  for_each = {
    for combo in flatten([
      for vpc_key, vpc_cidr in local.vpcs : [
        for az_idx in range(local.az_count) : {
          key      = "${vpc_key}-${az_idx}"
          vpc_key  = vpc_key
          vpc_cidr = vpc_cidr
          az_idx   = az_idx
        }
      ]
    ]) : combo.key => combo
  }

  vpc_id            = aws_vpc.domain[each.value.vpc_key].id
  cidr_block        = cidrsubnet(each.value.vpc_cidr, 4, each.value.az_idx + 8)
  availability_zone = var.primary_azs[each.value.az_idx]
  tags = {
    Name   = "${local.name}-data-${each.value.vpc_key}-${var.primary_azs[each.value.az_idx]}"
    Tier   = "data"
    Domain = each.value.vpc_key
  }
}

# NAT Gateways — shared VPC only (all others egress via TGW → shared)
resource "aws_eip" "nat" {
  count  = local.az_count
  domain = "vpc"
  tags   = { Name = "${local.name}-nat-eip-${count.index}" }
}

resource "aws_nat_gateway" "shared" {
  count         = local.az_count
  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public["shared-${count.index}"].id
  tags          = { Name = "${local.name}-natgw-${count.index}" }
  depends_on    = [aws_internet_gateway.public_vpcs]
}

###############################################################################
# TRANSIT GATEWAY — hub for all VPCs + Direct Connect
###############################################################################

resource "aws_ec2_transit_gateway" "main" {
  description                     = "${local.name} hub TGW"
  amazon_side_asn                 = 64512
  auto_accept_shared_attachments  = "disable"
  default_route_table_association = "disable"
  default_route_table_propagation = "disable"
  dns_support                     = "enable"
  vpn_ecmp_support                = "enable"
  multicast_support               = "disable"

  tags = { Name = "${local.name}-tgw" }
}

# TGW VPC attachments — one per VPC
resource "aws_ec2_transit_gateway_vpc_attachment" "domain" {
  for_each           = local.vpcs
  transit_gateway_id = aws_ec2_transit_gateway.main.id
  vpc_id             = aws_vpc.domain[each.key].id
  subnet_ids = [
    for az_idx in range(local.az_count) :
    aws_subnet.private["${each.key}-${az_idx}"].id
  ]

  transit_gateway_default_route_table_association = false
  transit_gateway_default_route_table_propagation = false

  tags = { Name = "${local.name}-tgw-attach-${each.key}", Domain = each.key }
}

# Separate TGW route tables per security domain
resource "aws_ec2_transit_gateway_route_table" "domain" {
  for_each           = toset(["spoke", "shared", "compliance", "mgmt"])
  transit_gateway_id = aws_ec2_transit_gateway.main.id
  tags               = { Name = "${local.name}-tgw-rt-${each.key}" }
}

# Direct Connect Gateway attachment to TGW
resource "aws_ec2_transit_gateway_direct_connect_gateway_attachment" "on_prem" {
  transit_gateway_id      = aws_ec2_transit_gateway.main.id
  direct_connect_gateway_id = var.direct_connect_gateway_id
  tags                    = { Name = "${local.name}-tgw-dx-attach" }
}

###############################################################################
# SECURITY GROUPS — core platform
###############################################################################

resource "aws_security_group" "alb_public" {
  name   = "${local.name}-sg-alb-public"
  vpc_id = aws_vpc.domain["retail"].id
  ingress { from_port = 443;  to_port = 443;  protocol = "tcp"; cidr_blocks = ["0.0.0.0/0"]; description = "HTTPS" }
  ingress { from_port = 80;   to_port = 80;   protocol = "tcp"; cidr_blocks = ["0.0.0.0/0"]; description = "HTTP redirect" }
  egress  { from_port = 0;    to_port = 0;    protocol = "-1";  cidr_blocks = ["0.0.0.0/0"] }
  tags   = { Name = "${local.name}-sg-alb-public" }
}

resource "aws_security_group" "eks_nodes" {
  name   = "${local.name}-sg-eks-nodes"
  vpc_id = aws_vpc.domain["shared"].id
  ingress { from_port = 0; to_port = 65535; protocol = "tcp"; self = true; description = "Node-to-node" }
  ingress { from_port = 443; to_port = 443; protocol = "tcp"; cidr_blocks = ["10.100.0.0/16"]; description = "API server" }
  egress  { from_port = 0; to_port = 0; protocol = "-1"; cidr_blocks = ["0.0.0.0/0"] }
  tags   = { Name = "${local.name}-sg-eks-nodes" }
}

resource "aws_security_group" "kafka" {
  name   = "${local.name}-sg-kafka"
  vpc_id = aws_vpc.domain["trading"].id
  ingress { from_port = 9092; to_port = 9092; protocol = "tcp"; cidr_blocks = ["10.0.0.0/8"]; description = "Kafka plaintext (internal only)" }
  ingress { from_port = 9094; to_port = 9094; protocol = "tcp"; cidr_blocks = ["10.0.0.0/8"]; description = "Kafka TLS" }
  ingress { from_port = 2181; to_port = 2181; protocol = "tcp"; self = true; description = "ZooKeeper" }
  egress  { from_port = 0; to_port = 0; protocol = "-1"; cidr_blocks = ["0.0.0.0/0"] }
  tags   = { Name = "${local.name}-sg-kafka" }
}

resource "aws_security_group" "aurora" {
  name   = "${local.name}-sg-aurora"
  vpc_id = aws_vpc.domain["shared"].id
  ingress { from_port = 5432; to_port = 5432; protocol = "tcp"; security_groups = [aws_security_group.eks_nodes.id]; description = "EKS nodes" }
  ingress { from_port = 5432; to_port = 5432; protocol = "tcp"; cidr_blocks = ["10.0.0.0/8"]; description = "All internal VPCs via TGW" }
  egress  { from_port = 0; to_port = 0; protocol = "-1"; cidr_blocks = ["10.0.0.0/8"] }
  tags   = { Name = "${local.name}-sg-aurora" }
}

resource "aws_security_group" "redis" {
  name   = "${local.name}-sg-redis"
  vpc_id = aws_vpc.domain["shared"].id
  ingress { from_port = 6379; to_port = 6379; protocol = "tcp"; security_groups = [aws_security_group.eks_nodes.id]; description = "EKS" }
  egress  { from_port = 0; to_port = 0; protocol = "-1"; cidr_blocks = ["10.0.0.0/8"] }
  tags   = { Name = "${local.name}-sg-redis" }
}

###############################################################################
# EKS CLUSTER — shared services platform
###############################################################################

resource "aws_iam_role" "eks_cluster" {
  name = "${local.name}-eks-cluster-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "eks.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "eks_cluster" {
  for_each = toset([
    "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy",
    "arn:aws:iam::aws:policy/AmazonEKSVPCResourceController",
  ])
  role       = aws_iam_role.eks_cluster.name
  policy_arn = each.value
}

resource "aws_iam_role" "eks_nodes" {
  name = "${local.name}-eks-node-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "eks_nodes" {
  for_each = toset([
    "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy",
    "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy",
    "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly",
    "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore",
  ])
  role       = aws_iam_role.eks_nodes.name
  policy_arn = each.value
}

resource "aws_eks_cluster" "main" {
  name     = "${local.name}-eks"
  role_arn = aws_iam_role.eks_cluster.arn
  version  = "1.29"

  vpc_config {
    subnet_ids              = [for az_idx in range(local.az_count) : aws_subnet.private["shared-${az_idx}"].id]
    security_group_ids      = [aws_security_group.eks_nodes.id]
    endpoint_private_access = true
    endpoint_public_access  = false # Private cluster only
  }

  encryption_config {
    resources = ["secrets"]
    provider { key_arn = aws_kms_key.domain["eks-etcd"].arn }
  }

  enabled_cluster_log_types = ["api", "audit", "authenticator", "controllerManager", "scheduler"]

  access_config {
    authentication_mode                         = "API_AND_CONFIG_MAP"
    bootstrap_cluster_creator_admin_permissions = false
  }

  tags = { Name = "${local.name}-eks" }

  depends_on = [aws_iam_role_policy_attachment.eks_cluster]
}

# Managed Node Groups — separated by workload class
resource "aws_eks_node_group" "platform" {
  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "${local.name}-platform-nodes"
  node_role_arn   = aws_iam_role.eks_nodes.arn
  subnet_ids      = [for az_idx in range(local.az_count) : aws_subnet.private["shared-${az_idx}"].id]
  instance_types  = var.eks_node_instance_types
  capacity_type   = "ON_DEMAND"

  scaling_config {
    desired_size = var.eks_desired_nodes
    min_size     = var.eks_min_nodes
    max_size     = var.eks_max_nodes
  }

  update_config { max_unavailable = 1 }

  launch_template {
    id      = aws_launch_template.eks_nodes.id
    version = aws_launch_template.eks_nodes.latest_version
  }

  labels = { role = "platform", environment = var.environment }

  taint {
    key    = "workload"
    value  = "platform"
    effect = "NO_SCHEDULE"
  }

  lifecycle { ignore_changes = [scaling_config[0].desired_size] }

  tags = { Name = "${local.name}-eks-platform-ng" }
  depends_on = [aws_iam_role_policy_attachment.eks_nodes]
}

resource "aws_eks_node_group" "trading" {
  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "${local.name}-trading-nodes"
  node_role_arn   = aws_iam_role.eks_nodes.arn
  subnet_ids      = [for az_idx in range(local.az_count) : aws_subnet.private["trading-${az_idx}"].id]
  instance_types  = ["c6i.4xlarge"] # Compute-optimised for FIX gateway
  capacity_type   = "ON_DEMAND"

  scaling_config {
    desired_size = 3
    min_size     = 3
    max_size     = 12
  }

  update_config { max_unavailable = 1 }

  launch_template {
    id      = aws_launch_template.eks_nodes.id
    version = aws_launch_template.eks_nodes.latest_version
  }

  labels = { role = "trading", environment = var.environment }

  taint {
    key    = "workload"
    value  = "trading"
    effect = "NO_SCHEDULE"
  }

  lifecycle { ignore_changes = [scaling_config[0].desired_size] }

  tags = { Name = "${local.name}-eks-trading-ng" }
  depends_on = [aws_iam_role_policy_attachment.eks_nodes]
}

resource "aws_launch_template" "eks_nodes" {
  name_prefix            = "${local.name}-eks-lt-"
  update_default_version = true

  block_device_mappings {
    device_name = "/dev/xvda"
    ebs {
      volume_size           = 100
      volume_type           = "gp3"
      encrypted             = true
      kms_key_id            = aws_kms_key.domain["eks-etcd"].arn
      delete_on_termination = true
    }
  }

  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "required" # IMDSv2 enforced
    http_put_response_hop_limit = 1
  }

  monitoring { enabled = true }

  tag_specifications {
    resource_type = "instance"
    tags          = merge(local.tags, { Name = "${local.name}-eks-node" })
  }

  tag_specifications {
    resource_type = "volume"
    tags          = merge(local.tags, { Name = "${local.name}-eks-node-volume" })
  }
}

# EKS Add-ons
resource "aws_eks_addon" "core" {
  for_each = {
    "vpc-cni"            = "v1.16.0-eksbuild.1"
    "coredns"            = "v1.11.1-eksbuild.4"
    "kube-proxy"         = "v1.29.0-eksbuild.1"
    "aws-ebs-csi-driver" = "v1.26.0-eksbuild.1"
    "aws-guardduty-agent" = "v1.5.0-eksbuild.1"
  }

  cluster_name             = aws_eks_cluster.main.name
  addon_name               = each.key
  addon_version            = each.value
  resolve_conflicts_on_update = "OVERWRITE"

  tags = { Name = "${local.name}-eks-addon-${each.key}" }
}

###############################################################################
# MSK (KAFKA) — trade event streaming
###############################################################################

resource "aws_msk_configuration" "trading" {
  name           = "${local.name}-kafka-config"
  kafka_versions = ["3.5.1"]
  server_properties = <<-PROPERTIES
    auto.create.topics.enable=false
    default.replication.factor=3
    min.insync.replicas=2
    num.partitions=12
    log.retention.hours=168
    log.retention.bytes=107374182400
    message.max.bytes=10485760
    replica.lag.time.max.ms=30000
    unclean.leader.election.enable=false
    delete.topic.enable=true
    compression.type=lz4
  PROPERTIES
}

resource "aws_msk_cluster" "trading" {
  cluster_name           = "${local.name}-kafka-trading"
  kafka_version          = "3.5.1"
  number_of_broker_nodes = var.kafka_broker_count

  broker_node_group_info {
    instance_type   = var.kafka_instance_type
    client_subnets  = [for az_idx in range(local.az_count) : aws_subnet.data["trading-${az_idx}"].id]
    security_groups = [aws_security_group.kafka.id]

    storage_info {
      ebs_storage_info {
        volume_size = var.kafka_ebs_volume_size
        provisioned_throughput {
          enabled           = true
          volume_throughput = 500
        }
      }
    }

    connectivity_info {
      public_access { type = "DISABLED" }
    }
  }

  encryption_info {
    encryption_in_transit {
      client_broker = "TLS"
      in_cluster    = true
    }
    encryption_at_rest_kms_key_arn = aws_kms_key.domain["kafka-data"].arn
  }

  client_authentication {
    sasl { iam = true }
    tls { certificate_authority_arns = [] }
  }

  configuration_info {
    arn      = aws_msk_configuration.trading.arn
    revision = aws_msk_configuration.trading.latest_revision
  }

  open_monitoring {
    prometheus {
      jmx_exporter  { enabled_in_broker = true }
      node_exporter { enabled_in_broker = true }
    }
  }

  logging_info {
    broker_logs {
      cloudwatch_logs {
        enabled   = true
        log_group = aws_cloudwatch_log_group.kafka.name
      }
      s3 {
        enabled = true
        bucket  = aws_s3_bucket.audit_logs.id
        prefix  = "kafka/broker-logs/"
      }
    }
  }

  tags = { Name = "${local.name}-kafka", Domain = "trading" }
}

resource "aws_cloudwatch_log_group" "kafka" {
  name              = "/msk/${local.name}/trading"
  retention_in_days = 90
  kms_key_id        = aws_kms_key.domain["audit-logs"].arn
  tags              = { Name = "${local.name}-kafka-logs" }
}

###############################################################################
# AURORA GLOBAL DATABASE — primary region (Postgres)
###############################################################################

resource "aws_db_subnet_group" "shared" {
  name       = "${local.name}-aurora-subnet-group"
  subnet_ids = [for az_idx in range(local.az_count) : aws_subnet.data["shared-${az_idx}"].id]
  tags       = { Name = "${local.name}-aurora-subnet-group" }
}

resource "aws_rds_cluster_parameter_group" "main" {
  name   = "${local.name}-aurora-pg15"
  family = "aurora-postgresql15"

  parameter { name = "log_min_duration_statement"; value = "500" }
  parameter { name = "log_connections";             value = "1" }
  parameter { name = "log_disconnections";          value = "1" }
  parameter { name = "log_lock_waits";              value = "1" }
  parameter { name = "shared_preload_libraries";    value = "pg_stat_statements,pgaudit"; apply_method = "pending-reboot" }
  parameter { name = "pgaudit.log";                 value = "all"; apply_method = "pending-reboot" }

  tags = { Name = "${local.name}-aurora-params" }
}

resource "aws_rds_global_cluster" "main" {
  global_cluster_identifier = "${local.name}-aurora-global"
  engine                    = "aurora-postgresql"
  engine_version            = "15.4"
  database_name             = "capexcloud"
  storage_encrypted         = true

  deletion_protection = true
}

resource "aws_rds_cluster" "primary" {
  cluster_identifier            = "${local.name}-aurora-primary"
  engine                        = "aurora-postgresql"
  engine_version                = "15.4"
  global_cluster_identifier     = aws_rds_global_cluster.main.id
  db_subnet_group_name          = aws_db_subnet_group.shared.name
  vpc_security_group_ids        = [aws_security_group.aurora.id]
  db_cluster_parameter_group_name = aws_rds_cluster_parameter_group.main.name

  serverlessv2_scaling_configuration {
    min_capacity = 2
    max_capacity = 64
  }

  storage_encrypted         = true
  kms_key_id                = aws_kms_key.domain["aurora-data"].arn
  deletion_protection       = true
  skip_final_snapshot       = false
  final_snapshot_identifier = "${local.name}-aurora-final"
  backup_retention_period   = 35
  preferred_backup_window   = "01:00-02:00"

  enabled_cloudwatch_logs_exports  = ["postgresql"]
  performance_insights_enabled     = true
  performance_insights_kms_key_id  = aws_kms_key.domain["aurora-data"].arn
  performance_insights_retention_period = 731 # 2 years

  tags = { Name = "${local.name}-aurora-primary", Role = "primary" }
}

resource "aws_rds_cluster_instance" "primary_writer" {
  identifier         = "${local.name}-aurora-writer"
  cluster_identifier = aws_rds_cluster.primary.id
  instance_class     = "db.serverless"
  engine             = aws_rds_cluster.primary.engine
  engine_version     = aws_rds_cluster.primary.engine_version
  monitoring_interval = 15
  tags               = { Name = "${local.name}-aurora-writer", Role = "writer" }
}

resource "aws_rds_cluster_instance" "primary_readers" {
  count              = 2
  identifier         = "${local.name}-aurora-reader-${count.index}"
  cluster_identifier = aws_rds_cluster.primary.id
  instance_class     = "db.serverless"
  engine             = aws_rds_cluster.primary.engine
  engine_version     = aws_rds_cluster.primary.engine_version
  monitoring_interval = 15
  tags               = { Name = "${local.name}-aurora-reader-${count.index}", Role = "reader" }
}

###############################################################################
# DYNAMODB GLOBAL TABLES — order state (low-latency)
###############################################################################

resource "aws_dynamodb_table" "orders" {
  name         = "${local.name}-orders"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "orderId"
  range_key    = "timestamp"

  attribute { name = "orderId";    type = "S" }
  attribute { name = "timestamp";  type = "S" }
  attribute { name = "accountId";  type = "S" }
  attribute { name = "status";     type = "S" }

  global_secondary_index {
    name            = "accountId-status-index"
    hash_key        = "accountId"
    range_key       = "status"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "status-timestamp-index"
    hash_key        = "status"
    range_key       = "timestamp"
    projection_type = "INCLUDE"
    non_key_attributes = ["orderId", "accountId", "symbol", "quantity", "price"]
  }

  stream_enabled   = true
  stream_view_type = "NEW_AND_OLD_IMAGES"

  server_side_encryption {
    enabled     = true
    kms_key_arn = aws_kms_key.domain["dynamo-data"].arn
  }

  point_in_time_recovery { enabled = true }

  ttl {
    attribute_name = "expiresAt"
    enabled        = true
  }

  replica {
    region_name = var.dr_region
    kms_key_arn = aws_kms_key.domain["dynamo-data"].arn # DR replica CMK
    point_in_time_recovery = true
    propagate_tags         = true
  }

  tags = { Name = "${local.name}-orders-table", DataClass = "trading-sensitive" }
}

resource "aws_dynamodb_table" "positions" {
  name         = "${local.name}-positions"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "accountId"
  range_key    = "symbol"

  attribute { name = "accountId"; type = "S" }
  attribute { name = "symbol";    type = "S" }

  stream_enabled   = true
  stream_view_type = "NEW_AND_OLD_IMAGES"

  server_side_encryption {
    enabled     = true
    kms_key_arn = aws_kms_key.domain["dynamo-data"].arn
  }

  point_in_time_recovery { enabled = true }

  replica {
    region_name = var.dr_region
    kms_key_arn = aws_kms_key.domain["dynamo-data"].arn
    propagate_tags = true
  }

  tags = { Name = "${local.name}-positions-table", DataClass = "trading-sensitive" }
}

###############################################################################
# ELASTICACHE REDIS GLOBAL DATASTORE — session + rate limiting
###############################################################################

resource "aws_elasticache_subnet_group" "shared" {
  name       = "${local.name}-redis-subnet-group"
  subnet_ids = [for az_idx in range(local.az_count) : aws_subnet.data["shared-${az_idx}"].id]
  tags       = { Name = "${local.name}-redis-subnet" }
}

resource "aws_elasticache_replication_group" "primary" {
  replication_group_id = "${local.name}-redis"
  description          = "Global session store and rate limiter — primary"
  node_type            = "cache.r7g.xlarge"
  num_cache_clusters   = 3
  engine_version       = "7.1"
  port                 = 6379

  subnet_group_name  = aws_elasticache_subnet_group.shared.name
  security_group_ids = [aws_security_group.redis.id]

  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  kms_key_id                 = aws_kms_key.domain["secrets"].arn
  automatic_failover_enabled = true
  multi_az_enabled           = true
  auto_minor_version_upgrade = true
  snapshot_retention_limit   = 7

  log_delivery_configuration {
    destination      = aws_cloudwatch_log_group.redis.name
    destination_type = "cloudwatch-logs"
    log_format       = "json"
    log_type         = "slow-log"
  }

  log_delivery_configuration {
    destination      = aws_cloudwatch_log_group.redis.name
    destination_type = "cloudwatch-logs"
    log_format       = "json"
    log_type         = "engine-log"
  }

  tags = { Name = "${local.name}-redis-primary" }
}

resource "aws_cloudwatch_log_group" "redis" {
  name              = "/elasticache/${local.name}/redis"
  retention_in_days = 90
  kms_key_id        = aws_kms_key.domain["audit-logs"].arn
  tags              = { Name = "${local.name}-redis-logs" }
}

resource "aws_elasticache_global_replication_group" "session" {
  global_replication_group_id_suffix = "${local.name}-session"
  primary_replication_group_id       = aws_elasticache_replication_group.primary.id
  automatic_failover_enabled         = true
}

###############################################################################
# STEP FUNCTIONS — regulatory workflow orchestration
###############################################################################

resource "aws_iam_role" "step_functions" {
  name = "${local.name}-sfn-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "states.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "step_functions" {
  name = "${local.name}-sfn-policy"
  role = aws_iam_role.step_functions.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["lambda:InvokeFunction"]
        Resource = "arn:aws:lambda:${var.primary_region}:${var.aws_account_id}:function:${local.name}-*"
      },
      {
        Effect   = "Allow"
        Action   = ["sns:Publish"]
        Resource = aws_sns_topic.trading_alerts.arn
      },
      {
        Effect   = "Allow"
        Action   = ["xray:PutTraceSegments", "xray:GetSamplingRules"]
        Resource = "*"
      },
      {
        Effect   = "Allow"
        Action   = ["logs:CreateLogDelivery", "logs:PutLogEvents", "logs:GetLogDelivery"]
        Resource = "*"
      }
    ]
  })
}

# Trade settlement regulatory workflow
resource "aws_sfn_state_machine" "trade_settlement" {
  name     = "${local.name}-trade-settlement"
  role_arn = aws_iam_role.step_functions.arn
  type     = "STANDARD"

  logging_configuration {
    log_destination        = "${aws_cloudwatch_log_group.sfn.arn}:*"
    include_execution_data = true
    level                  = "ALL"
  }

  tracing_configuration { enabled = true }

  definition = jsonencode({
    Comment = "Trade settlement and regulatory reporting workflow"
    StartAt = "ValidateTrade"
    States = {
      ValidateTrade = {
        Type     = "Task"
        Resource = "arn:aws:states:::lambda:invoke"
        Parameters = {
          FunctionName = "arn:aws:lambda:${var.primary_region}:${var.aws_account_id}:function:${local.name}-validate-trade"
          "Payload.$"  = "$"
        }
        Next = "CheckComplianceRules"
        Retry = [{
          ErrorEquals     = ["Lambda.ServiceException", "Lambda.TooManyRequestsException"]
          IntervalSeconds = 2
          MaxAttempts     = 3
          BackoffRate     = 2
        }]
        Catch = [{
          ErrorEquals = ["States.ALL"]
          Next        = "HandleTradeError"
        }]
      }
      CheckComplianceRules = {
        Type = "Parallel"
        Branches = [
          {
            StartAt = "CheckPatternDayTrader"
            States = {
              CheckPatternDayTrader = {
                Type     = "Task"
                Resource = "arn:aws:states:::lambda:invoke"
                Parameters = {
                  FunctionName = "arn:aws:lambda:${var.primary_region}:${var.aws_account_id}:function:${local.name}-check-pdt"
                  "Payload.$"  = "$"
                }
                End = true
              }
            }
          },
          {
            StartAt = "CheckPositionLimits"
            States = {
              CheckPositionLimits = {
                Type     = "Task"
                Resource = "arn:aws:states:::lambda:invoke"
                Parameters = {
                  FunctionName = "arn:aws:lambda:${var.primary_region}:${var.aws_account_id}:function:${local.name}-check-position-limits"
                  "Payload.$"  = "$"
                }
                End = true
              }
            }
          },
          {
            StartAt = "CheckAML"
            States = {
              CheckAML = {
                Type     = "Task"
                Resource = "arn:aws:states:::lambda:invoke"
                Parameters = {
                  FunctionName = "arn:aws:lambda:${var.primary_region}:${var.aws_account_id}:function:${local.name}-aml-screen"
                  "Payload.$"  = "$"
                }
                End = true
              }
            }
          }
        ]
        Next = "RouteTradeToExchange"
      }
      RouteTradeToExchange = {
        Type    = "Choice"
        Choices = [
          {
            Variable      = "$.order.type"
            StringEquals  = "MARKET"
            Next          = "SubmitMarketOrder"
          },
          {
            Variable      = "$.order.type"
            StringEquals  = "LIMIT"
            Next          = "SubmitLimitOrder"
          }
        ]
        Default = "HandleTradeError"
      }
      SubmitMarketOrder = {
        Type     = "Task"
        Resource = "arn:aws:states:::lambda:invoke"
        Parameters = {
          FunctionName = "arn:aws:lambda:${var.primary_region}:${var.aws_account_id}:function:${local.name}-submit-market-order"
          "Payload.$"  = "$"
        }
        Next = "RecordForRegulatoryReporting"
      }
      SubmitLimitOrder = {
        Type     = "Task"
        Resource = "arn:aws:states:::lambda:invoke"
        Parameters = {
          FunctionName = "arn:aws:lambda:${var.primary_region}:${var.aws_account_id}:function:${local.name}-submit-limit-order"
          "Payload.$"  = "$"
        }
        Next = "RecordForRegulatoryReporting"
      }
      RecordForRegulatoryReporting = {
        Type     = "Task"
        Resource = "arn:aws:states:::lambda:invoke"
        Parameters = {
          FunctionName = "arn:aws:lambda:${var.primary_region}:${var.aws_account_id}:function:${local.name}-regulatory-record"
          "Payload.$"  = "$"
        }
        End = true
      }
      HandleTradeError = {
        Type = "Task"
        Resource = "arn:aws:states:::sns:publish"
        Parameters = {
          TopicArn   = aws_sns_topic.trading_alerts.arn
          "Message.$" = "States.Format('Trade error: {}', $.error)"
        }
        End = true
      }
    }
  })

  tags = { Name = "${local.name}-sfn-trade-settlement" }
}

resource "aws_cloudwatch_log_group" "sfn" {
  name              = "/aws/states/${local.name}"
  retention_in_days = 90
  kms_key_id        = aws_kms_key.domain["audit-logs"].arn
  tags              = { Name = "${local.name}-sfn-logs" }
}

###############################################################################
# CLOUDTRAIL + KINESIS FIREHOSE — SEC 17a-4 immutable audit
###############################################################################

resource "aws_cloudtrail" "main" {
  name                          = "${local.name}-trail"
  s3_bucket_name                = aws_s3_bucket.audit_logs.id
  s3_key_prefix                 = "cloudtrail"
  include_global_service_events = true
  is_multi_region_trail         = true
  enable_log_file_validation    = true
  kms_key_id                    = aws_kms_key.domain["audit-logs"].arn
  cloud_watch_logs_group_arn    = "${aws_cloudwatch_log_group.cloudtrail.arn}:*"
  cloud_watch_logs_role_arn     = aws_iam_role.cloudtrail_cw.arn

  event_selector {
    read_write_type           = "All"
    include_management_events = true

    data_resource {
      type   = "AWS::S3::Object"
      values = ["${aws_s3_bucket.audit_logs.arn}/"]
    }

    data_resource {
      type   = "AWS::DynamoDB::Table"
      values = [aws_dynamodb_table.orders.arn, aws_dynamodb_table.positions.arn]
    }
  }

  insight_selector { insight_type = "ApiCallRateInsight" }
  insight_selector { insight_type = "ApiErrorRateInsight" }

  tags = { Name = "${local.name}-cloudtrail" }
}

resource "aws_cloudwatch_log_group" "cloudtrail" {
  name              = "/aws/cloudtrail/${local.name}"
  retention_in_days = 365
  kms_key_id        = aws_kms_key.domain["audit-logs"].arn
  tags              = { Name = "${local.name}-cloudtrail-logs" }
}

resource "aws_iam_role" "cloudtrail_cw" {
  name = "${local.name}-cloudtrail-cw-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "cloudtrail.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "cloudtrail_cw" {
  name = "${local.name}-cloudtrail-cw-policy"
  role = aws_iam_role.cloudtrail_cw.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["logs:CreateLogStream", "logs:PutLogEvents"]
      Resource = "${aws_cloudwatch_log_group.cloudtrail.arn}:*"
    }]
  })
}

# S3 WORM bucket (Object Lock) for 17a-4 compliance
resource "aws_s3_bucket" "audit_logs" {
  bucket        = "${local.name}-audit-logs-${data.aws_caller_identity.current.account_id}"
  force_destroy = false
  object_lock_enabled = true
  tags          = { Name = "${local.name}-audit-logs", DataClass = "audit", Compliance = "17a-4" }
}

resource "aws_s3_bucket_object_lock_configuration" "audit_logs" {
  bucket = aws_s3_bucket.audit_logs.id

  rule {
    default_retention {
      mode  = "COMPLIANCE"
      years = 7 # SEC 17a-4 requirement
    }
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "audit_logs" {
  bucket = aws_s3_bucket.audit_logs.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.domain["audit-logs"].arn
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_versioning" "audit_logs" {
  bucket = aws_s3_bucket.audit_logs.id
  versioning_configuration { status = "Enabled" }
}

resource "aws_s3_bucket_public_access_block" "audit_logs" {
  bucket                  = aws_s3_bucket.audit_logs.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_replication_configuration" "audit_logs" {
  bucket = aws_s3_bucket.audit_logs.id
  role   = aws_iam_role.s3_replication.arn

  rule {
    id     = "replicate-to-dr"
    status = "Enabled"
    destination {
      bucket        = "arn:aws:s3:::${local.name}-audit-logs-dr-${data.aws_caller_identity.current.account_id}"
      storage_class = "STANDARD_IA"
      replication_time {
        status = "Enabled"
        time { minutes = 15 }
      }
    }
  }
}

resource "aws_iam_role" "s3_replication" {
  name = "${local.name}-s3-replication-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "s3.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

###############################################################################
# SECURITY SERVICES — GuardDuty, Security Hub, Macie, Config, Inspector
###############################################################################

resource "aws_guardduty_detector" "main" {
  enable = true

  datasources {
    s3_logs              { enable = true }
    kubernetes { audit_logs { enable = true } }
    malware_protection   { scan_ec2_instance_with_findings { ebs_volumes { enable = true } } }
  }

  finding_publishing_frequency = "FIFTEEN_MINUTES"
  tags                         = { Name = "${local.name}-guardduty" }
}

resource "aws_securityhub_account" "main" {
  enable_default_standards = true
  auto_enable_controls     = true
  control_finding_generator = "SECURITY_CONTROL"
}

resource "aws_securityhub_standards_subscription" "pci_dss" {
  standards_arn = "arn:aws:securityhub:${var.primary_region}::standards/pci-dss/v/3.2.1"
  depends_on    = [aws_securityhub_account.main]
}

resource "aws_securityhub_standards_subscription" "cis" {
  standards_arn = "arn:aws:securityhub:${var.primary_region}::standards/cis-aws-foundations-benchmark/v/1.4.0"
  depends_on    = [aws_securityhub_account.main]
}

resource "aws_securityhub_standards_subscription" "nist" {
  standards_arn = "arn:aws:securityhub:${var.primary_region}::standards/nist-800-53/v/5.0.0"
  depends_on    = [aws_securityhub_account.main]
}

resource "aws_macie2_account" "main" {
  finding_publishing_frequency = "FIFTEEN_MINUTES"
  status                       = "ENABLED"
}

resource "aws_macie2_classification_job" "pii_scan" {
  name       = "${local.name}-pii-scan"
  job_type   = "SCHEDULED"

  schedule_frequency { weekly_schedule = "MONDAY" }

  s3_job_definition {
    bucket_definitions {
      account_id = data.aws_caller_identity.current.account_id
      buckets    = [aws_s3_bucket.audit_logs.id]
    }
  }

  tags = { Name = "${local.name}-macie-pii-scan" }
}

resource "aws_inspector2_enabler" "main" {
  account_ids    = [data.aws_caller_identity.current.account_id]
  resource_types = ["ECR", "EC2", "LAMBDA"]
}

resource "aws_config_configuration_recorder" "main" {
  name     = "${local.name}-config-recorder"
  role_arn = aws_iam_role.config.arn

  recording_group {
    all_supported                 = true
    include_global_resource_types = true
  }
}

resource "aws_iam_role" "config" {
  name = "${local.name}-config-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "config.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "config" {
  role       = aws_iam_role.config.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWS_ConfigRole"
}

resource "aws_config_delivery_channel" "main" {
  name           = "${local.name}-config-delivery"
  s3_bucket_name = aws_s3_bucket.audit_logs.id
  s3_key_prefix  = "config"
  depends_on     = [aws_config_configuration_recorder.main]
}

resource "aws_config_configuration_recorder_status" "main" {
  name       = aws_config_configuration_recorder.main.name
  is_enabled = true
  depends_on = [aws_config_delivery_channel.main]
}

# Key compliance Config rules
locals {
  config_rules = {
    "root-mfa-enabled"                      = {}
    "iam-root-access-key-check"             = {}
    "encrypted-volumes"                     = {}
    "s3-bucket-ssl-requests-only"           = {}
    "rds-storage-encrypted"                 = {}
    "dynamodb-pitr-enabled"                 = {}
    "cloudtrail-enabled"                    = {}
    "cloud-trail-encryption-enabled"        = {}
    "guardduty-enabled-centralized"         = {}
    "securityhub-enabled"                   = {}
    "vpc-flow-logs-enabled"                 = {}
    "eks-secrets-encrypted"                 = {}
    "mfa-enabled-for-iam-console-access"    = {}
  }
}

resource "aws_config_config_rule" "compliance" {
  for_each = local.config_rules
  name     = "${local.name}-${each.key}"

  source {
    owner             = "AWS"
    source_identifier = upper(replace(each.key, "-", "_"))
  }

  tags = { Name = "${local.name}-config-rule-${each.key}" }

  depends_on = [aws_config_configuration_recorder.main]
}

###############################################################################
# WAF + SHIELD ADVANCED
###############################################################################

resource "aws_shield_protection" "alb" {
  name         = "${local.name}-shield-alb"
  resource_arn = aws_lb.retail.arn
}

resource "aws_shield_protection" "cloudfront" {
  name         = "${local.name}-shield-cloudfront"
  resource_arn = aws_cloudfront_distribution.retail.arn
}

resource "aws_wafv2_web_acl" "retail" {
  name  = "${local.name}-waf-retail"
  scope = "REGIONAL"

  default_action { allow {} }

  rule {
    name = "CommonRuleSet"; priority = 1
    override_action { none {} }
    statement {
      managed_rule_group_statement { name = "AWSManagedRulesCommonRuleSet"; vendor_name = "AWS" }
    }
    visibility_config { cloudwatch_metrics_enabled = true; metric_name = "${local.name}-waf-common"; sampled_requests_enabled = true }
  }

  rule {
    name = "SQLi"; priority = 2
    override_action { none {} }
    statement {
      managed_rule_group_statement { name = "AWSManagedRulesSQLiRuleSet"; vendor_name = "AWS" }
    }
    visibility_config { cloudwatch_metrics_enabled = true; metric_name = "${local.name}-waf-sqli"; sampled_requests_enabled = true }
  }

  rule {
    name = "BotControl"; priority = 3
    override_action { none {} }
    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesBotControlRuleSet"
        vendor_name = "AWS"
        managed_rule_group_configs {
          aws_managed_rules_bot_control_rule_set {
            inspection_level = "TARGETED"
          }
        }
      }
    }
    visibility_config { cloudwatch_metrics_enabled = true; metric_name = "${local.name}-waf-bot"; sampled_requests_enabled = true }
  }

  rule {
    name = "RateLimit"; priority = 10
    action { block {} }
    statement {
      rate_based_statement {
        limit              = 1000
        aggregate_key_type = "IP"
      }
    }
    visibility_config { cloudwatch_metrics_enabled = true; metric_name = "${local.name}-waf-rate"; sampled_requests_enabled = true }
  }

  visibility_config { cloudwatch_metrics_enabled = true; metric_name = "${local.name}-waf"; sampled_requests_enabled = true }
  tags = { Name = "${local.name}-waf-retail" }
}

###############################################################################
# RETAIL ALB + CLOUDFRONT (placeholder — references trading VPC resources above)
###############################################################################

resource "aws_lb" "retail" {
  name                       = "${local.name}-alb-retail"
  internal                   = false
  load_balancer_type         = "application"
  security_groups            = [aws_security_group.alb_public.id]
  subnets                    = [for az_idx in range(local.az_count) : aws_subnet.public["retail-${az_idx}"].id]
  enable_deletion_protection = true
  drop_invalid_header_fields = true
  tags                       = { Name = "${local.name}-alb-retail" }
}

resource "aws_acm_certificate" "retail" {
  provider          = aws.us_east_1
  domain_name       = var.domain_name
  validation_method = "DNS"
  subject_alternative_names = ["*.${var.domain_name}"]
  lifecycle { create_before_destroy = true }
  tags = { Name = "${local.name}-cert-retail" }
}

resource "aws_cloudfront_distribution" "retail" {
  enabled         = true
  is_ipv6_enabled = true
  comment         = "${local.name} retail platform CDN"
  aliases         = [var.domain_name, "www.${var.domain_name}"]
  price_class     = "PriceClass_All"

  origin {
    origin_id   = "retail-alb"
    domain_name = aws_lb.retail.dns_name
    custom_origin_config {
      http_port = 80; https_port = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  default_cache_behavior {
    target_origin_id       = "retail-alb"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD"]
    forwarded_values {
      query_string = true
      headers      = ["Authorization", "X-Correlation-ID", "X-Request-ID"]
      cookies { forward = "all" }
    }
    min_ttl = 0; default_ttl = 0; max_ttl = 0
  }

  restrictions { geo_restriction { restriction_type = "none" } }
  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate.retail.arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  tags = { Name = "${local.name}-cloudfront-retail" }
}

###############################################################################
# SNS ALERTS — multi-tier severity
###############################################################################

resource "aws_sns_topic" "trading_alerts" {
  name              = "${local.name}-trading-alerts"
  kms_master_key_id = aws_kms_key.domain["secrets"].arn
  tags              = { Name = "${local.name}-trading-alerts" }
}

resource "aws_sns_topic" "security_alerts" {
  name              = "${local.name}-security-alerts"
  kms_master_key_id = aws_kms_key.domain["secrets"].arn
  tags              = { Name = "${local.name}-security-alerts" }
}

resource "aws_sns_topic" "ops_alerts" {
  name              = "${local.name}-ops-alerts"
  kms_master_key_id = aws_kms_key.domain["secrets"].arn
  tags              = { Name = "${local.name}-ops-alerts" }
}

resource "aws_sns_topic_subscription" "pagerduty_trading" {
  topic_arn              = aws_sns_topic.trading_alerts.arn
  protocol               = "https"
  endpoint               = var.alert_pagerduty_endpoint
  endpoint_auto_confirms = true
}

resource "aws_sns_topic_subscription" "pagerduty_security" {
  topic_arn              = aws_sns_topic.security_alerts.arn
  protocol               = "https"
  endpoint               = var.alert_pagerduty_endpoint
  endpoint_auto_confirms = true
}

###############################################################################
# CLOUDWATCH ALARMS — production SLA critical path
###############################################################################

resource "aws_cloudwatch_metric_alarm" "eks_node_count" {
  alarm_name          = "${local.name}-eks-node-count-low"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 2
  metric_name         = "cluster_node_count"
  namespace           = "ContainerInsights"
  period              = 60
  statistic           = "Average"
  threshold           = var.eks_min_nodes
  alarm_description   = "EKS node count below minimum — possible AZ failure"
  alarm_actions       = [aws_sns_topic.ops_alerts.arn]
  dimensions          = { ClusterName = aws_eks_cluster.main.name }
  tags                = { Name = "${local.name}-eks-node-alarm" }
}

resource "aws_cloudwatch_metric_alarm" "kafka_under_replicated" {
  alarm_name          = "${local.name}-kafka-under-replicated"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "UnderReplicatedPartitions"
  namespace           = "AWS/Kafka"
  period              = 60
  statistic           = "Maximum"
  threshold           = 0
  alarm_description   = "Kafka under-replicated partitions — data durability risk"
  alarm_actions       = [aws_sns_topic.trading_alerts.arn]
  dimensions          = { Cluster_Name = aws_msk_cluster.trading.cluster_name }
  tags                = { Name = "${local.name}-kafka-replication-alarm" }
}

resource "aws_cloudwatch_metric_alarm" "aurora_replica_lag" {
  alarm_name          = "${local.name}-aurora-replica-lag"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "AuroraGlobalDBReplicationLag"
  namespace           = "AWS/RDS"
  period              = 60
  statistic           = "Average"
  threshold           = 30000 # 30 seconds — RPO breach risk
  alarm_description   = "Aurora global replication lag exceeds RPO threshold"
  alarm_actions       = [aws_sns_topic.trading_alerts.arn]
  dimensions          = { DBClusterIdentifier = aws_rds_cluster.primary.cluster_identifier }
  tags                = { Name = "${local.name}-aurora-lag-alarm" }
}

resource "aws_cloudwatch_metric_alarm" "dynamo_system_errors" {
  for_each = {
    orders    = aws_dynamodb_table.orders.name
    positions = aws_dynamodb_table.positions.name
  }
  alarm_name          = "${local.name}-dynamo-${each.key}-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "SystemErrors"
  namespace           = "AWS/DynamoDB"
  period              = 60
  statistic           = "Sum"
  threshold           = 0
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.trading_alerts.arn]
  dimensions          = { TableName = each.value }
  tags                = { Name = "${local.name}-dynamo-${each.key}-alarm" }
}

resource "aws_cloudwatch_metric_alarm" "alb_5xx" {
  alarm_name          = "${local.name}-alb-5xx"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "HTTPCode_ELB_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Sum"
  threshold           = 10
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.ops_alerts.arn]
  dimensions          = { LoadBalancer = aws_lb.retail.arn_suffix }
  tags                = { Name = "${local.name}-alb-5xx-alarm" }
}

resource "aws_cloudwatch_metric_alarm" "guardduty_high_findings" {
  alarm_name          = "${local.name}-guardduty-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "FindingCount"
  namespace           = "AWS/GuardDuty"
  period              = 300
  statistic           = "Sum"
  threshold           = 0
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.security_alerts.arn]
  dimensions          = { DetectorId = aws_guardduty_detector.main.id, Severity = "HIGH" }
  tags                = { Name = "${local.name}-guardduty-alarm" }
}

###############################################################################
# ROUTE53 + PRIVATE HOSTED ZONE
###############################################################################

resource "aws_route53_zone" "internal" {
  name = var.internal_domain

  dynamic "vpc" {
    for_each = aws_vpc.domain
    content {
      vpc_id = vpc.value.id
    }
  }

  tags = { Name = "${local.name}-internal-zone" }
}

resource "aws_route53_record" "aurora_writer" {
  zone_id = aws_route53_zone.internal.zone_id
  name    = "aurora-writer.${var.internal_domain}"
  type    = "CNAME"
  ttl     = 60
  records = [aws_rds_cluster.primary.endpoint]
}

resource "aws_route53_record" "aurora_reader" {
  zone_id = aws_route53_zone.internal.zone_id
  name    = "aurora-reader.${var.internal_domain}"
  type    = "CNAME"
  ttl     = 60
  records = [aws_rds_cluster.primary.reader_endpoint]
}

resource "aws_route53_record" "redis" {
  zone_id = aws_route53_zone.internal.zone_id
  name    = "redis.${var.internal_domain}"
  type    = "CNAME"
  ttl     = 60
  records = [aws_elasticache_replication_group.primary.primary_endpoint_address]
}

###############################################################################
# OUTPUTS
###############################################################################

output "eks_cluster_name"         { value = aws_eks_cluster.main.name }
output "eks_cluster_endpoint"     { value = aws_eks_cluster.main.endpoint }
output "eks_oidc_issuer"          { value = aws_eks_cluster.main.identity[0].oidc[0].issuer }
output "kafka_bootstrap_brokers"  { value = aws_msk_cluster.trading.bootstrap_brokers_sasl_iam }
output "aurora_writer_endpoint"   { value = aws_rds_cluster.primary.endpoint }
output "aurora_reader_endpoint"   { value = aws_rds_cluster.primary.reader_endpoint }
output "aurora_global_cluster_id" { value = aws_rds_global_cluster.main.id }
output "dynamo_orders_table"      { value = aws_dynamodb_table.orders.name }
output "dynamo_positions_table"   { value = aws_dynamodb_table.positions.name }
output "redis_primary_endpoint"   { value = aws_elasticache_replication_group.primary.primary_endpoint_address }
output "redis_global_id"          { value = aws_elasticache_global_replication_group.session.id }
output "tgw_id"                   { value = aws_ec2_transit_gateway.main.id }
output "audit_logs_bucket"        { value = aws_s3_bucket.audit_logs.id }
output "trade_settlement_sfn_arn" { value = aws_sfn_state_machine.trade_settlement.arn }
output "guardduty_detector_id"    { value = aws_guardduty_detector.main.id }
output "cmk_arns"                 { value = { for k, v in aws_kms_key.domain : k => v.arn } }
output "retail_alb_dns"           { value = aws_lb.retail.dns_name }
output "cloudfront_domain"        { value = aws_cloudfront_distribution.retail.domain_name }
