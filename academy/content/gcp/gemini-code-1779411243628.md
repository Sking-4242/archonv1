---
title: "Cloud Logging and the Log Router"
type: content
estimated_minutes: 10
cert_tags: ["ace", "pca"]
---

# Cloud Logging and the Log Router

## Overview

A mature cloud environment produces terabytes of logs every day: VPC Flow Logs showing network traffic, Compute Engine syslogs, and Cloud IAM audit logs detailing exactly who changed a firewall rule. 

In GCP, all of this telemetry flows into a single, centralized service: **Cloud Logging** (formerly Stackdriver Logging). The most heavily tested operational concept on the ACE and PCA exams is how to securely and cost-effectively manage the lifecycle of these logs using the **Log Router**.

## The Log Router (Log Sinks)

By default, Cloud Logging holds onto your logs for a limited retention period (e.g., 30 days). If your compliance department mandates that all administrative audit logs be kept for 7 years, the default retention is insufficient.

Furthermore, keeping terabytes of logs inside the active Cloud Logging dashboard is incredibly expensive. 

Architects solve this by configuring **Log Sinks** within the Log Router. A Log Sink intercepts incoming logs and automatically routes them to an external, cheaper, or more specialized destination based on a filter.

**The Three Primary Sink Destinations:**
1. **Cloud Storage (Compliance Archiving):** Route all logs to a Coldline or Archive Cloud Storage bucket. This satisfies the 7-year legal retention requirement at the absolute lowest possible OpEx cost.
2. **BigQuery (Security Analytics):** Route all VPC Flow logs to BigQuery. This allows your security analysts to write complex SQL queries across massive datasets to hunt for Advanced Persistent Threats (APTs) or track network exfiltration.
3. **Cloud Pub/Sub (Third-Party SIEM Integration):** Route critical security alerts to Pub/Sub. From there, a third-party Security Information and Event Management (SIEM) tool, like Splunk or Datadog, can ingest the logs in real-time.

## Log Exclusion Filters

Ingesting logs costs money. If your development environment's web servers are emitting millions of "HTTP 200 OK" informational logs, you are wasting budget analyzing useless data.

In the Log Router, you can configure **Exclusion Filters**. You write a query that states: "Discard all HTTP 200 logs from the `Dev` project." Cloud Logging drops the logs at the door, ensuring you are never billed for their ingestion or storage.

## Summary

Cloud Logging centralizes all operational and audit telemetry in GCP. Because active log storage is expensive and time-limited, architects heavily utilize the **Log Router**. By creating Log Sinks, specific logs are routed to Cloud Storage for cheap long-term compliance archiving, to BigQuery for deep SQL-based security analytics, or to Pub/Sub for export to external SIEM platforms.