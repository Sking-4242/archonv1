---
title: "CloudWatch Metrics, Alarms, and Dashboards"
type: content
estimated_minutes: 10
cert_tags: ["SAA-C03", "DVA-C02", "CLF-C02"]
---

# CloudWatch Metrics, Alarms, and Dashboards

## Overview

Amazon CloudWatch is the observability backbone of AWS — collecting metrics, logs, and traces from your AWS resources and applications. This lesson covers CloudWatch metrics, the alarm system, and building operational dashboards.

## Metrics and Namespaces

CloudWatch metrics are time-series data points associated with a namespace (e.g., AWS/EC2, AWS/RDS), metric name (e.g., CPUUtilization), and dimensions (e.g., InstanceId=i-xxxx). Metrics are stored at 1-minute or 5-minute resolution (standard) or 1-second resolution with High Resolution custom metrics. AWS services publish metrics automatically; you publish custom metrics via the PutMetricData API. Metrics are retained for 15 months with progressive data rollups (1-second → 1-minute → 5-minute → 1-hour over time).

## CloudWatch Alarms

Alarms watch a metric over a period and transition between states: OK, ALARM, and INSUFFICIENT_DATA. When an alarm enters ALARM state, it can trigger actions: SNS notification (which triggers email, SMS, or Lambda), Auto Scaling action (scale out or in), EC2 action (reboot, stop, recover), or Systems Manager OpsCenter incident creation. Composite Alarms combine multiple alarms with AND/OR logic to reduce alert noise. Create alarms for: CPU > 80% for 5 minutes, error rate > 1%, latency p99 > 500ms.

## Custom Metrics and Embedded Metric Format

Custom metrics let you push application-level data to CloudWatch: request counts, business metrics (orders per minute), custom resource utilization. The Embedded Metric Format (EMF) lets you log structured JSON from Lambda, ECS, and other environments, and CloudWatch automatically extracts metrics from the logs — no separate PutMetricData calls needed. EMF is the recommended approach for Lambda-based metric publishing.

## CloudWatch Dashboards

Dashboards are customizable visualization panels with graphs, number widgets, and text. Cross-account and cross-region dashboards aggregate views across a large environment. Dashboards are public (accessible without sign-in) or private. Automatic dashboards are pre-built for common services like EC2, Lambda, and DynamoDB. Use dashboards for on-call operational views, SLO tracking, and executive-level metrics.

## Summary

CloudWatch is the foundation of AWS observability. Metrics are time-series data from AWS services and your applications. Alarms trigger actions on threshold violations. Custom metrics and EMF extend observability to application internals. Dashboards surface the right metrics for operators at a glance. Build alarms for every critical path before going to production.

## What's Next

Next up: CloudWatch Logs — log ingestion, filtering, and analysis.