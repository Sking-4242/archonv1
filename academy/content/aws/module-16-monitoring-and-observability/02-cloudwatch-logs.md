---
title: "CloudWatch Logs: Ingestion, Filtering, and Insights"
type: content
estimated_minutes: 10
cert_tags: ["SAA-C03", "DVA-C02", "SCS-C02"]
---

# CloudWatch Logs: Ingestion, Filtering, and Insights

## Overview

CloudWatch Logs collects logs from EC2 (via the CloudWatch Agent), Lambda (automatic), ECS, VPC Flow Logs, CloudTrail, and custom applications. CloudWatch Logs Insights provides a query language for fast log analysis. This lesson covers log architecture, retention, subscription filters, and Insights.

## Log Groups and Log Streams

A log group is a container for log streams sharing the same retention and access settings. A log stream is a sequence of log events from a single source (one EC2 instance, one Lambda invocation, one ECS task). Best practice: one log group per application component or service (e.g., /aws/lambda/my-function, /app/frontend, /app/backend). Set retention policies on log groups — the default is never expire, which accumulates cost indefinitely.

## CloudWatch Agent

The CloudWatch Agent runs on EC2 or on-premises servers and ships system metrics (memory, disk — not published by default) and log files to CloudWatch. Configure via SSM Parameter Store (store the agent config JSON there, centrally manage across fleets). The Unified Agent supports both metrics and logs. Use the agent for: application logs from files on disk, OS-level metrics, custom metrics from StatsD.

## Log Subscription Filters

Subscription filters stream matching log events in near-real-time to a destination: Lambda (for real-time processing and alerting), Kinesis Data Streams, or Kinesis Firehose (for archival to S3 or OpenSearch). A common pattern: CloudWatch Logs subscription filter → Kinesis Firehose → S3 for long-term log archival at lower cost than CloudWatch retention. Another pattern: subscription filter → Lambda → PagerDuty alert for specific error patterns.

## CloudWatch Logs Insights

Logs Insights is an interactive query service for CloudWatch Logs. The query language supports: `filter`, `stats`, `sort`, `limit`, and `parse` commands. Example: `filter @message like /ERROR/ | stats count(*) by bin(1h)` — count errors per hour. Queries can visualize results as time-series charts. Save queries for reuse. Logs Insights charges per GB of data scanned — use time range filters and log group selectors to keep costs controlled.

## Summary

CloudWatch Logs: log groups hold streams; set retention to avoid accumulating storage costs. The CloudWatch Agent ships OS metrics and application logs from EC2. Subscription filters stream logs to Lambda or Kinesis for real-time processing or archival. Logs Insights provides SQL-like ad-hoc analysis across large log datasets. Centralize all logs with consistent naming before production launch.

## Examples

A healthcare startup running on EC2 needed to capture application log files written to disk by their Java backend alongside OS-level memory metrics (which EC2 doesn't publish by default). They installed the CloudWatch Unified Agent, configured it via an SSM Parameter Store JSON document, and pushed both memory utilization and `/var/log/app/service.log` to CloudWatch. This eliminated the need to SSH into boxes to read logs and gave their security team a centralized, auditable log trail — a direct application of the CloudWatch Agent's dual role for metrics and file-based logs.

A logistics company processes millions of shipment events daily and needed to retain logs for audit purposes for three years without paying for three years of CloudWatch storage. They configured a log subscription filter on their `/app/shipments` log group to stream all log events through Kinesis Firehose directly to S3, where the data lands in cost-effective storage with lifecycle policies. CloudWatch retains only 30 days for active querying while S3 holds the full archive — a practical cost-vs-retention trade-off that many production teams use.

A security engineering team at a fintech company wanted instant alerts whenever their application logged a string matching `"unauthorized access attempt"`. They created a CloudWatch Logs subscription filter targeting those events and routed matching entries to a Lambda function that called their PagerDuty API. The result: an on-call alert fires within seconds of the log event, without polling or scheduled queries. This shows how subscription filters turn passive log storage into a real-time event-driven detection system.

## Think About It

1. Why does the default CloudWatch Logs retention setting of "never expire" represent a hidden cost risk, and how would you operationalize a policy to prevent log groups from accumulating unbounded storage?
2. What would happen to your log analysis capability if you structured all application logs as unformatted plain text rather than JSON? How does log format choice affect the power of Logs Insights queries?
3. How would you decide whether to use a Logs Insights query versus a CloudWatch metric filter for counting error occurrences — what are the trade-offs in cost, latency, and operational complexity?
4. A subscription filter can route to Lambda, Kinesis Data Streams, or Kinesis Firehose. How would you choose between them for a use case that requires both real-time alerting AND long-term archival from the same log group?
5. Logs Insights charges per GB of data scanned. How does this pricing model change the way you should design log groups, write queries, and set time range filters for cost-conscious observability?

## Quick Check

**Q1.** What is the relationship between a CloudWatch log group and a log stream?
- A) A log stream contains multiple log groups for different retention periods
- B) A log group is a container for log streams that share the same retention and access settings
- C) A log group can only contain one log stream per AWS account
- D) Log streams and log groups are interchangeable terms for the same resource

**Answer: B** — A log group is the organizational container that defines retention and permissions; log streams within it represent individual sources such as a single EC2 instance or Lambda invocation.

**Q2.** Which CloudWatch Logs feature allows you to stream matching log events in near-real-time to Lambda or Kinesis?
- A) Metric Filters
- B) Log Insights
- C) Subscription Filters
- D) Contributor Insights

**Answer: C** — Subscription filters match log events against a pattern and forward matching entries in near-real-time to a destination such as Lambda, Kinesis Data Streams, or Kinesis Firehose.

**Q3.** What does the following Logs Insights query do? `filter @message like /ERROR/ | stats count(*) by bin(1h)`
- A) Deletes all log events containing "ERROR" older than one hour
- B) Counts all log events per hour, grouping errors and non-errors separately
- C) Counts the number of log events containing "ERROR" grouped into one-hour time buckets
- D) Alerts when more than one error occurs within a one-hour window

**Answer: C** — The query filters log events whose message contains "ERROR" and then aggregates the count of those events into one-hour intervals, producing an error frequency time series.

## What's Next

Next up: AWS X-Ray and distributed tracing — following a request through microservices.