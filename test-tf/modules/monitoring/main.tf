# Stub local module for module_heavy.tf import testing
variable "name" { type = string }
variable "account_id" { type = string }
variable "region" { type = string }
variable "eks_cluster_name" { type = string }
variable "aurora_cluster_id" { type = string }
variable "alb_arn_suffix" { type = string }
variable "sns_alert_arn" { type = string }

resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "${var.name}-ops"
  dashboard_body   = jsonencode({ widgets = [] })
}

resource "aws_cloudwatch_metric_alarm" "eks_cpu" {
  alarm_name          = "${var.name}-eks-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EKS"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_actions       = [var.sns_alert_arn]
}
