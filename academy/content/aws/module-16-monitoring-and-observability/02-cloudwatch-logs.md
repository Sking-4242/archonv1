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

## What's Next

Next up: AWS X-Ray and distributed tracing — following a request through microservices.