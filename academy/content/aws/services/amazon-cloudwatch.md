---
title: "Amazon CloudWatch"
type: content
estimated_minutes: 21
cert_tags: ["CLF-C02", "SAA-C03", "SOA-C03", "SCS-C03"]
---

# Amazon CloudWatch

## Overview

Amazon CloudWatch is AWS's monitoring and observability service. It collects **metrics**, **logs**, and **events** from AWS services and your own applications, lets you visualize them on dashboards, alarm on thresholds, and trigger automated responses. It is the operational nerve center of AWS — how you know what your systems are doing and react when something goes wrong. This *service reference* lesson covers metrics, alarms, Logs, the relationship with EventBridge, and what each certification expects.

CloudWatch matters because you cannot operate, scale, or secure what you cannot observe. It provides the signals that drive Auto Scaling, the alarms that page on-call, the logs that explain failures, and (via EventBridge) the events that trigger automation. The core mental model has a few pillars: **metrics** (numeric time series), **alarms** (state machines watching metrics or metric math), **CloudWatch Logs** (centralized log storage, search, and pattern-based metrics), and **dashboards** (visualization) — with **EventBridge** carrying change-events to automation.

---

## How It Works

- **Metrics** — time-ordered data points (CPU utilization, request count, queue depth) published automatically by AWS services and by your apps as **custom metrics**. Metrics live in **namespaces** with **dimensions** (key/value facets), support **statistics** (avg/sum/p99/etc.), **metric math**, and resolutions (standard 1-minute or **high-resolution** 1-second).
- **Alarms** — watch a single metric, a **metric-math expression**, or **anomaly-detection band**, and move among **OK**, **ALARM**, and **INSUFFICIENT_DATA**, triggering actions: **SNS** notifications, **Auto Scaling** policies, or EC2 actions. **Composite alarms** combine multiple alarms with boolean logic to cut noise.
- **CloudWatch Logs** — ingest, store, and search logs in **log groups** (with configurable **retention**); query with **Logs Insights**; and create **metric filters** that turn matching log patterns (e.g., "ERROR", a root login) into metrics you can alarm on. Logs can be exported to S3 or streamed to OpenSearch/Lambda via subscriptions.
- **Dashboards** — customizable cross-metric, cross-account, cross-Region visualizations.

A key exam fact: EC2 publishes **CPU, network, and disk I/O** by default, but **memory utilization and disk-space usage require the CloudWatch agent**.

---

## Key Features

- **Custom metrics** and the **embedded metric format (EMF)** for high-cardinality application observability.
- **Logs Insights** for fast, ad-hoc, pay-per-scan log querying.
- **Container Insights** and **Lambda Insights** for container and serverless observability.
- **Synthetics canaries** to monitor endpoints from the outside (uptime, latency, broken flows).
- **Anomaly detection** to alarm on deviation from a learned band rather than a fixed threshold.
- **Cross-account observability** to centralize monitoring across an organization, and **RUM**/**Evidently**/**ServiceLens** (with X-Ray) for end-to-end visibility.

---

## Configuration Reference

- **Install the CloudWatch agent** on EC2 (and on-prem) to collect memory, disk, process, and custom application logs/metrics.
- **Define alarms** with appropriate thresholds, evaluation periods, datapoints-to-alarm, and **missing-data treatment**; wire actions to SNS/Auto Scaling.
- **Set log retention** (the default is **never expire**, which silently accrues cost) and route logs centrally with subscriptions.
- **Use metric filters** to alarm on security-relevant log patterns (root usage, unauthorized API calls, error spikes).

---

## Operations and Troubleshooting

- **Missing metrics.** Memory/disk require the agent; custom metrics require publishing; check the namespace/dimensions and resolution.
- **Noisy or flapping alarms.** Tune the period and datapoints-to-alarm, use **composite alarms**, choose the right missing-data behavior, and consider anomaly detection for variable baselines.
- **Logs cost surprises.** Default infinite retention and chatty logs accumulate storage; set retention, filter/sample, and export cold logs to S3. Logs Insights bills by data **scanned**, so scope queries.
- **Alarm not firing actions.** Verify the SNS topic and its permissions, the alarm's action configuration, and that the alarm actually transitioned state.

---

## Integrations

CloudWatch ingests metrics/logs from virtually every AWS service; alarms drive **EC2 Auto Scaling**, **SNS** notifications, and (via **EventBridge**) **Systems Manager** automation and **Lambda** remediation; **Logs** receive output from **Lambda**, **VPC Flow Logs**, **API Gateway**, **RDS**, and more; **metric filters** feed security alerting and **CloudTrail**-driven detections; and dashboards centralize it all. It pairs with **AWS X-Ray** (tracing) and **CloudTrail** (audit) to complete observability. It is the signal source for both operations (SOA) and security monitoring (SCS).

---

## Pricing and Cost Considerations

CloudWatch charges for **custom metrics**, **API requests** (e.g., `GetMetricData`, `PutMetricData`), **dashboards**, **alarms** (high-resolution and composite cost more), and especially **Logs ingestion and storage** plus **Logs Insights data scanned**. The most common cost surprises are high-cardinality custom metrics, chatty application logs with infinite retention, and large Logs Insights scans. The levers are setting log retention, filtering/sampling noisy logs, consolidating dashboards/alarms, using metric filters instead of storing everything, and scoping queries. Exact prices vary by Region and feature.

---

## Exam Relevance

**CLF-C02:** Know CloudWatch as AWS's monitoring service for metrics, alarms, logs, and dashboards. Foundational.

**SAA-C03:** Know metrics/alarms driving Auto Scaling, Logs for centralization, and CloudWatch's role in resilient, observable architectures. Design depth.

**SOA-C03:** Deepest operational use — the agent for memory/disk, alarms (composite, missing-data treatment, datapoints-to-alarm), Logs Insights, metric filters, dashboards, Synthetics, and anomaly detection. Operations depth; heavily weighted.

**SCS-C03:** Security monitoring — metric filters/alarms on suspicious activity (root usage, unauthorized calls), log centralization and protection, and feeding detection pipelines. Security depth.

---

## Summary

Amazon CloudWatch collects metrics, logs, and events to observe and operate AWS. Metrics (with namespaces, dimensions, statistics, math, and standard/high resolution) drive alarms that notify (SNS), scale (Auto Scaling), or automate (via EventBridge → SSM/Lambda); CloudWatch Logs centralize, search (Logs Insights), and alarm on log patterns via metric filters; dashboards visualize; and Container/Lambda Insights, Synthetics, and anomaly detection extend it. Remember that EC2 memory and disk usage need the CloudWatch agent, that Logs retention/high-cardinality metrics/Logs-Insights scans are the main cost drivers, and that composite alarms and missing-data treatment tame noise. CloudWatch is the observability foundation for both operations and security.

---

## Quick Check

1. Which two EC2 utilization metrics require the CloudWatch agent rather than being published by default?
2. What three states can an alarm be in, what does "datapoints to alarm" control, and name two actions an alarm can trigger.
3. What is a metric filter, and how is it used for security alerting?
4. Why can CloudWatch Logs become a cost surprise, and what three settings/practices control it?
5. When would you use anomaly detection or a composite alarm instead of a single static threshold?

---

## What's Next

Pair this with **EC2 Auto Scaling** (alarm-driven scaling), **Amazon SNS** (alarm notifications), **Amazon EventBridge** (event-driven automation), and **AWS CloudTrail** (audit vs. monitoring).
