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

## Examples

A mid-size e-commerce company running their checkout service on EC2 noticed periodic slowdowns during flash sales. By enabling the default `AWS/EC2` CPUUtilization metric and creating a CloudWatch Alarm set to trigger at 80% CPU for 5 consecutive minutes, their on-call engineer received an SNS email alert within minutes of the next spike — before any customers filed complaints. This is a textbook use of built-in AWS metrics and threshold alarms requiring zero custom code.

A SaaS startup built a multi-tenant API on Lambda and needed to track per-tenant request counts and error rates — data that AWS doesn't publish by default. They adopted the Embedded Metric Format, embedding structured JSON (with tenant ID as a dimension) in their Lambda logs. CloudWatch automatically extracted custom metrics from those logs, letting the team build a dashboard showing each tenant's usage without a separate metric-publishing pipeline. This illustrates how EMF bridges the gap between application-level business data and CloudWatch observability.

A financial services firm runs a global trading platform across three AWS regions and needs a single operational view for their NOC. They built a cross-region, cross-account CloudWatch Dashboard that aggregates API latency p99, error rates, and database connection counts from all regions into one screen. By using metric math to compute a composite SLO health score and displaying it as a number widget, the NOC can tell at a glance whether the platform is within acceptable bounds — turning raw metrics into a decision-support tool.

## Think About It

1. Why does CloudWatch retain high-resolution (1-second) data for a shorter period than lower-resolution data, and what trade-off does this create when designing long-term capacity-planning dashboards?
2. What would happen if you set an alarm threshold too aggressively (e.g., CPU > 50% for 1 minute) on an Auto Scaling group — what downstream effects could that produce, and how would you tune it?
3. How would you decide between publishing a custom metric via the PutMetricData API directly versus using the Embedded Metric Format from a Lambda function? What factors tip the decision?
4. A Composite Alarm combines multiple alarms with AND/OR logic to reduce noise. What trade-offs do you accept when you use AND logic (all alarms must fire) versus OR logic (any alarm fires)?
5. If your CloudWatch Dashboard shows a sudden drop in a metric to zero, why might that NOT indicate the system is healthy, and how would you design your monitoring to distinguish "metric is zero" from "no data is being published"?

## Quick Check

**Q1.** What is the default data retention period for CloudWatch metrics?
- A) 30 days
- B) 90 days
- C) 15 months
- D) 7 years

**Answer: C** — CloudWatch retains metric data for 15 months, with progressive rollups from high-resolution to lower-resolution aggregates over time.

**Q2.** Which alarm state indicates that CloudWatch does not have enough data to evaluate the alarm threshold?
- A) OK
- B) ALARM
- C) INSUFFICIENT_DATA
- D) PENDING

**Answer: C** — INSUFFICIENT_DATA is the third alarm state, used when CloudWatch lacks enough data points to determine whether the threshold has been breached.

**Q3.** What is the key advantage of using Embedded Metric Format (EMF) over calling PutMetricData directly from Lambda?
- A) EMF supports higher-resolution metrics (sub-second)
- B) EMF metrics are free and do not count toward CloudWatch pricing
- C) EMF extracts metrics from logs automatically, eliminating a separate API call and reducing Lambda execution overhead
- D) EMF allows metrics to be published to multiple AWS accounts simultaneously

**Answer: C** — EMF embeds metric data in structured log JSON; CloudWatch automatically extracts and publishes the metrics, removing the need for a separate PutMetricData API call during the Lambda invocation.

## What's Next

Next up: CloudWatch Logs — log ingestion, filtering, and analysis.