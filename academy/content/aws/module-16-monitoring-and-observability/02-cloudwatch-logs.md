---
title: "CloudWatch Logs: Ingestion, Filtering, and Insights"
type: content
estimated_minutes: 13
cert_tags: ["SAA-C03", "SAP-C02"]
---

# CloudWatch Logs: Ingestion, Filtering, and Insights

## Overview

Metrics tell you that something is wrong. Logs tell you why. CloudWatch Logs is the managed log storage and analysis service for AWS — it ingests log events from Lambda, ECS, EC2 (via the CloudWatch Agent), VPC Flow Logs, CloudTrail, API Gateway, and dozens of other sources. Once in CloudWatch Logs, those events can be queried interactively with Logs Insights, filtered to extract metric trends, streamed to Lambda or Kinesis for real-time processing, or exported to S3 for long-term archival.

The challenge CloudWatch Logs solves is operational: distributed applications running on dozens of EC2 instances or hundreds of Lambda invocations produce log events scattered across separate processes, servers, and containers. Without centralized log aggregation, debugging an error means SSH-ing into individual instances to read log files — a process that doesn't scale and loses data when instances terminate. CloudWatch Logs centralizes all of that into a queryable, durable store accessible from a single API and console.

For the SAA exam, understand the log group and stream hierarchy, the CloudWatch Agent for EC2, subscription filters for streaming, and Logs Insights queries. The SAP exam adds metric filters for extracting metrics from logs, cross-account log sharing, Logs Insights aggregation across accounts, and cost optimization strategies for high-volume log environments. After this lesson, you will be able to design a complete log collection and analysis architecture for a production workload.

---

## Core Concepts

### Log Groups and Log Streams

CloudWatch Logs organizes data into **log groups** and **log streams**. A log group is a container that defines retention policy, access control, and metric filters for all the log streams it contains. A log stream is a sequence of log events from a single source — one EC2 instance, one Lambda function invocation context, one ECS task, one VPC flow log for one ENI.

Best practice for naming: use a consistent, hierarchical naming convention that makes log groups easy to find and scope queries to. AWS uses `/aws/lambda/function-name` for Lambda and `/aws/ecs/cluster-name` for ECS automatically. For application logs on EC2, a convention like `/app/environment/component` (e.g., `/app/prod/api-server`) works well.

**Retention** is the most operationally important log group setting. The default is "never expire" — log events accumulate indefinitely at $0.03/GB/month. Set explicit retention policies (1 day to 10 years) on every log group. For active querying, 30–90 days is typical. For compliance requirements, export to S3 before expiry and set shorter retention in CloudWatch.

---

### CloudWatch Agent

AWS services like Lambda, ECS, and API Gateway write logs to CloudWatch automatically. EC2 instances do not — they require the **CloudWatch Agent** (formerly called the CloudWatch Unified Agent or the older CloudWatch Logs Agent).

The CloudWatch Agent is an application that runs as a daemon on EC2 (or on-premises servers). It reads log files from disk and ships them to CloudWatch Logs log streams, and it also collects additional system metrics that EC2 does not publish by default — most importantly, **memory utilization** and **disk utilization**. These are among the most commonly needed EC2 metrics and are not available without the agent.

The agent is configured via a JSON configuration file that specifies which log files to collect, which log group to send them to, and which additional metrics to collect. The recommended approach is to store this configuration in **SSM Parameter Store** and deploy it across a fleet using SSM Run Command or State Manager — so adding a new instance type or log file path is a single change that propagates to all instances automatically.

---

### Metric Filters

**Metric filters** extract metric data from log events without requiring code changes. A metric filter defines a pattern to match in log events and a value to publish as a CloudWatch metric when a match is found.

Example: a metric filter on a `/app/prod/api` log group matching the pattern `[level=ERROR]` increments a custom metric `AppErrorCount` every time an ERROR-level log event appears. You then create a CloudWatch alarm on `AppErrorCount` to alert when the error rate exceeds a threshold. The log data drives the metric without any PutMetricData API calls from application code.

Metric filters are evaluated in near-real-time as log events arrive. They can extract numeric values from log events (not just count matches), enabling metrics like average response time extracted directly from access logs. However, metric filters only count new events after the filter is created — they cannot retroactively process historical log data.

---

### Subscription Filters and Log Routing

**Subscription filters** stream matching log events from a log group to an external destination in near-real-time. Three destinations are supported: **Lambda** (for real-time processing, alerting, or transformation), **Kinesis Data Streams** (for high-throughput ingestion into analytics pipelines), and **Kinesis Data Firehose** (for buffered delivery to S3, OpenSearch, or Splunk).

Common patterns:

**Real-time alerting**: subscription filter matching `"CRITICAL"` → Lambda → PagerDuty API. Errors surface as incidents within seconds of appearing in logs.

**Long-term archival at low cost**: subscription filter (all events) → Kinesis Firehose → S3. CloudWatch retention is set to 30 days for active querying; S3 holds the full 7-year archive at a fraction of the cost.

**Log aggregation across accounts**: cross-account subscription filters stream logs from multiple source accounts to a central logging account's Kinesis Data Stream, enabling organization-wide log analysis from one place.

Each log group supports one subscription filter per destination type. For complex routing (e.g., send to both Lambda and Firehose), route through Kinesis Data Streams first, then fan out from there.

---

### CloudWatch Logs Insights

**Logs Insights** is an interactive query engine built into CloudWatch Logs. It supports a structured query language with commands for filtering, aggregation, parsing, and visualization:

- `filter` — select events matching a condition (`filter @message like /ERROR/`)
- `stats` — aggregate over fields (`stats avg(responseTime) by endpoint`)
- `parse` — extract fields from unstructured text using glob or regex patterns
- `sort` — order results
- `limit` — cap the number of results

Insights queries can visualize results as time-series charts or bar graphs directly in the console. Queries can be saved and shared. The results of a query can be exported to CloudWatch dashboards as widgets.

**Pricing**: $0.005 per GB of data scanned. A query that scans 100 GB of logs costs $0.50. Use time range selectors to limit the scan window, query specific log groups rather than all groups, and use structured JSON logging to enable field-level filtering (which scans less data than full-text search).

---

## Configuration Refer