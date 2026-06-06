---
title: "CloudWatch Metrics, Alarms, and Dashboards"
type: content
estimated_minutes: 13
cert_tags: ["CLF-C02", "SAA-C03", "SAP-C02"]
---

# CloudWatch Metrics, Alarms, and Dashboards

## Overview

Amazon CloudWatch is the observability backbone of AWS. Every AWS service — EC2, RDS, Lambda, ALB, DynamoDB, and over 70 others — publishes performance and health data to CloudWatch automatically, with no configuration required. That data takes the form of metrics: numerical measurements sampled over time, like CPU utilization, request count, or error rate. CloudWatch stores these metrics, evaluates them against thresholds you define, and triggers actions when thresholds are crossed.

Before CloudWatch, teams discovered problems the hard way — a customer reported a slow page, a database ran out of connections, a server ran out of disk space. CloudWatch shifts that discovery from reactive to proactive: you define what "normal" looks like, set an alarm when behavior drifts outside that range, and get notified before customers notice. Pair that alarm with an Auto Scaling action or a Lambda remediation function, and the system can respond to problems before a human even reads the alert.

The SAA exam tests CloudWatch metrics, alarms, and dashboards heavily. You need to know metric retention periods, alarm states, composite alarms, and the difference between standard and high-resolution metrics. The SAP exam adds metric math, cross-account and cross-region dashboards, and Embedded Metric Format for custom application telemetry. After this lesson, you will be able to configure alarms for any AWS service, publish custom metrics from application code, and build an operational dashboard for an on-call team.

---

## Core Concepts

### Metrics, Namespaces, and Dimensions

A CloudWatch **metric** is a time-series of data points — a measurement sampled at regular intervals. Every metric belongs to a **namespace** (a logical grouping) and has a **metric name** and zero or more **dimensions** (key-value pairs that identify the source).

Examples:
- Namespace `AWS/EC2`, metric `CPUUtilization`, dimension `InstanceId=i-abc123`
- Namespace `AWS/RDS`, metric `DatabaseConnections`, dimension `DBInstanceIdentifier=prod-db`
- Namespace `MyApp/Orders`, metric `OrdersPerMinute`, dimension `Environment=prod`

AWS services publish metrics in their own namespaces automatically. You publish application metrics in a custom namespace using the `PutMetricData` API or Embedded Metric Format (EMF).

**Metric resolution**: standard metrics arrive at 1-minute or 5-minute granularity. **High-resolution custom metrics** can be published at 1-second granularity for workloads requiring sub-minute alerting. High-resolution metrics cost more and are retained at full 1-second resolution for only **3 hours** before being rolled up to 1-minute data. This means alarms evaluating 1-second resolution metrics must fire within the 3-hour window, and historical analysis below 1-minute granularity is not available after that window closes. Design alerting systems accordingly.

**Retention policy**: CloudWatch retains metric data for 15 months, with progressive rollups as data ages — 1-second data is kept for 3 hours, 1-minute data for 15 days, 5-minute data for 63 days, 1-hour data for 15 months. When building dashboards for long-term capacity planning, you are viewing rolled-up data, not the original samples.

---

### CloudWatch Alarms

A CloudWatch alarm watches a single metric (or a metric math expression) and transitions between three states: **OK** (the metric is within the threshold), **ALARM** (the threshold has been breached), and **INSUFFICIENT_DATA** (not enough data points to evaluate).

You configure: the metric to watch, the statistic (Average, Sum, Maximum, p99), the period (how long each data point covers), the evaluation periods (how many consecutive periods must breach the threshold before the alarm fires), and the threshold value. Requiring multiple consecutive periods reduces false positives from momentary spikes.

When an alarm enters ALARM state, it can trigger:
- **SNS notification** — delivers email, SMS, HTTP webhook, or invokes Lambda
- **Auto Scaling policy** — triggers a scale-out or scale-in action
- **EC2 action** — stops, starts, reboots, or recovers an EC2 instance
- **Systems Manager OpsCenter** — creates an OpsItem for incident management

**Composite Alarms** combine multiple alarms using AND/OR Boolean logic. Use composite alarms to reduce alert noise: "alert only if both CPU is high AND error rate is elevated" (AND logic) prevents paging for CPU spikes caused by legitimate traffic. "Alert if CPU is high OR disk is full" (OR logic) catches either condition independently.

---

### Custom Metrics and Embedded Metric Format

AWS publishes dozens of metrics per service automatically, but they cannot publish metrics specific to your application's business logic — orders per minute, active sessions, checkout errors by payment method. For these you publish **custom metrics**.

**PutMetricData API**: call directly from application code to publish a metric value with a timestamp, namespace, metric name, dimensions, and value. Each API call publishes up to 1,000 data points. Costs $0.30 per 1,000 custom metric ingestions.

**Embedded Metric Format (EMF)**: the recommended approach for Lambda, ECS, and any log-producing workload. Instead of calling PutMetricData, you write structured JSON to stdout (or a CloudWatch Logs stream) in the EMF schema. CloudWatch automatically extracts metrics from the log entries — no additional API call, no additional latency in your function, and the log entry serves double duty as both a log record and a metric data point.

EMF is especially valuable in Lambda because PutMetricData calls add Lambda invocation time and cost. With EMF, metric publishing is free from the function's perspective — the cost is in log ingestion, which you're paying for anyway.

---

### Dashboards

CloudWatch **Dashboards** are customizable visualization panels combining graphs, number widgets, alarms, and text annotations. A dashboard can show metrics from multiple services, accounts, and regions on a single screen — the operational view an on-call engineer needs during an incident.

**Cross-account and cross-region dashboards**: a single dashboard can show metrics from multiple AWS accounts and regions. This requires sharing metrics from source accounts to a central monitoring account using CloudWatch cross-account observability. For organizations running 10+ accounts, a central NOC dashboard eliminates the need to switch between accounts during incidents.

**Automatic dashboards**: CloudWatch provides pre-built dashboards for common services (EC2, Lambda, DynamoDB, API Gateway). These appear automatically in the console when you navigate to a service and show the most important metrics for that service without configuration.

**Metric math**: dashboard widgets can display computed expressions — for example, displaying e