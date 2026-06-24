# Stub local module for module_heavy.tf import testing
variable "name" { type = string }

resource "aws_cloudwatch_metric_alarm" "nat_errors" {
  alarm_name          = "${var.name}-nat-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ErrorPortAllocation"
  namespace           = "AWS/NATGateway"
  period              = 300
  statistic           = "Sum"
  threshold           = 0
}
