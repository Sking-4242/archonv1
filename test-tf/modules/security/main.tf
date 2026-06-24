# Stub local module for module_heavy.tf import testing
variable "name" { type = string }
variable "account_id" { type = string }
variable "region" { type = string }
variable "vpc_id" { type = string }

resource "aws_guardduty_detector" "main" {
  enable = true
  tags   = { Name = "${var.name}-guardduty" }
}

resource "aws_securityhub_account" "main" {}

resource "aws_config_configuration_recorder" "main" {
  name     = "${var.name}-config"
  role_arn = aws_iam_role.config.arn
}

resource "aws_iam_role" "config" {
  name = "${var.name}-config-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Action    = "sts:AssumeRole"
      Principal = { Service = "config.amazonaws.com" }
    }]
  })
}
