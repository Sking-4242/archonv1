---
title: "Log Storage, Analysis, and Correlation"
type: content
estimated_minutes: 17
cert_tags: ["SCS-C03"]
---

# Log Storage, Analysis, and Correlation

## Overview

Capturing logs is only half of detection; the other half is turning a sea of raw events into answers — querying them at scale, normalizing them so different sources can be compared, and correlating across services to reconstruct what happened. The Security Specialty exam (Task 1.2, skills around storing, analyzing, normalizing, and correlating logs) tests whether you can choose the right analysis tool for a requirement: ad-hoc SQL over archived logs, real-time log queries, full-text search and dashboards, or a normalized security data lake for a SIEM. Each has a distinct sweet spot, and the exam presents scenarios — "analyze months of archived logs cost-effectively," "build a security dashboard," "feed a third-party SIEM in a common schema" — that map to specific services.

The hard problem this lesson addresses is **heterogeneity and scale**. AWS produces dozens of log formats across dozens of services and accounts; a SOC needs to ask questions that span them ("show every action by this credential across CloudTrail, VPC Flow Logs, and DNS in the last 24 hours"). Doing that requires either centralizing into a queryable store (Athena over S3), streaming into a search engine (OpenSearch), or normalizing everything to a common schema (Security Lake/OCSF) so tools can consume it uniformly. The specialty skill is matching the analysis architecture to the requirement, balancing cost, latency, retention, and integration.

This lesson covers the log-analysis services and how they correlate data, with the decision logic the exam rewards. After it you will be able to design a log analysis and correlation pipeline appropriate to a given security requirement.

---

## Core Concepts

### Athena — Serverless SQL Over Archived Logs

**Amazon Athena** runs standard SQL directly against data in S3 — including CloudTrail logs, VPC Flow Logs, ELB/CloudFront/WAF logs, and Security Lake data — without loading it into a database. It is **serverless** and you pay per data scanned, which makes it ideal for **cost-effective, ad-hoc analysis of large volumes of archived logs**: investigating an incident across months of CloudTrail, or running a one-off query over flow logs. Cost and speed are improved by partitioning and by columnar formats (Parquet) — which is exactly why Security Lake stores OCSF data as partitioned Parquet for Athena. Tell: "query large volumes of logs in S3 with SQL, cost-effectively, no infrastructure" → Athena.

### CloudWatch Logs Insights — Interactive Queries on Live Logs

**CloudWatch Logs Insights** provides an interactive query language over logs stored in **CloudWatch Logs** (application logs, Lambda, VPC Flow Logs sent to CloudWatch, CloudTrail delivered to CloudWatch). It's the tool for **near-real-time, interactive investigation** of recent operational and security logs — filtering, aggregating, and visualizing without setting up anything. Where Athena queries archived data in S3, Logs Insights queries data already in CloudWatch Logs. Tell: "interactively query recent logs already in CloudWatch Logs" → Logs Insights.

### Amazon OpenSearch Service — Search, Correlation, and Dashboards

**Amazon OpenSearch Service** provides full-text search, complex correlation, and rich visualization (OpenSearch Dashboards) over large log volumes streamed in (often via CloudWatch Logs subscription filters or Kinesis Data Firehose). It's the choice when you need **powerful search, real-time dashboards, alerting, and correlation across many sources** — effectively a self-managed SIEM-like capability on AWS. OpenSearch also has security analytics features (detectors, correlation rules). Tell: "full-text search, security dashboards, and cross-source correlation at scale" → OpenSearch.

### Amazon Security Lake and OCSF — Normalization for Correlation

The deepest correlation problem is that logs from different sources use different schemas, so comparing them is painful. **Amazon Security Lake** solves this by centralizing security data from AWS and third-party sources into your S3 and **normalizing it to the Open Cybersecurity Schema Framework (OCSF)** — one consistent schema in Parquet. Once everything speaks OCSF, you can query across sources uniformly with Athena, and **subscribers** (a SIEM, OpenSearch, or analytics tools) consume the normalized data in parallel. Security Lake is the answer for "centralize and normalize logs across the organization and many sources into a common schema for analysis and third-party integration." It is the data-lake counterpart to Security Hub's findings.

### Managed Grafana and Visualization

**Amazon Managed Grafana** provides dashboards and visualization across multiple data sources (CloudWatch, OpenSearch, Athena, Prometheus), useful for unified operational and security dashboards. The exam mentions it as a normalization/visualization option alongside OpenSearch; recognize it as a managed visualization layer rather than a log store.

### Correlation Across Sources

The point of all this is **correlation** — answering questions that span services. A credential-compromise investigation might correlate CloudTrail (what API calls the credential made), VPC Flow Logs (what it connected to), Route 53 Resolver logs (what domains it resolved), and GuardDuty findings (what was flagged). Three approaches: query each in Athena and join on common fields; stream all into OpenSearch and correlate there; or normalize to OCSF in Security Lake so the fields already align. **Amazon Detective** (from the monitoring lesson) automates correlation for investigation by pre-building the behavior graph. The specialty skill is choosing the correlation approach that fits the latency, scale, retention, and integration needs.

### CloudTrail Lake for Audit-Specific Analysis

When the analysis target is specifically **CloudTrail audit events**, **AWS CloudTrail Lake** is a purpose-built alternative to building your own Athena tables over S3. It stores events in immutable **event data stores** with multi-year retention and lets you run SQL directly — including across an organization and multiple Regions — without managing partitions, schemas, or Glue tables. The trade-off versus Athena-over-S3 is convenience and immutability against cost and flexibility: CloudTrail Lake is faster to stand up and tamper-resistant for audit, while Athena over a raw-log data lake (or Security Lake) is cheaper at very large scale and queries *all* log types, not just CloudTrail. On the exam, "query our API audit history with SQL, minimal setup, long retention" points to CloudTrail Lake, whereas "cost-effectively analyze many log types across months" points to Athena/Security Lake.

### Cost, Retention, and Tiering

Analysis architecture is also a cost decision. Hot, recent logs in CloudWatch Logs (queryable with Logs Insights) cost more per GB than cold archives in S3 (queryable with Athena). A common design tiers logs: stream to CloudWatch/OpenSearch for real-time needs with short retention, and archive to S3 (and Security Lake) for cheap long-term storage and ad-hoc Athena queries. S3 lifecycle policies move older logs to cheaper storage classes. The exam rewards picking the cost-appropriate tool: long-term archived analysis → Athena/S3; real-time interactive → Logs Insights/OpenSearch.

---

## Configuration Reference

Analysis tool → best fit:

```text
Tool                      Best for
------------------------- ----------------------------------------------
Amazon Athena             ad-hoc SQL over large archived logs in S3 (cheap, serverless)
CloudWatch Logs Insights  interactive queries on recent logs in CloudWatch Logs
Amazon OpenSearch Service full-text search, dashboards, cross-source correlation (SIEM-like)
Amazon Security Lake      centralize + normalize logs to OCSF for analysis/subscribers
Amazon Managed Grafana    unified visualization across multiple data sources
Amazon Detective          automated behavior-graph correlation for investigations
```

Correlation pipeline options:

```text
Option A (archive):  logs → S3 → Athena (join CloudTrail + flow + DNS on fields)
Option B (search):   logs → CloudWatch subscription/Firehose → OpenSearch (correlate, dashboard)
Option C (normalize): sources → Security Lake (OCSF in S3) → Athena/SIEM subscribers
```

Tiering for cost vs. latency:

```text
Real-time / recent    → CloudWatch Logs (+ Insights) / OpenSearch  (higher $/GB, short retention)
Long-term / archive   → S3 (+ Athena) / Security Lake             (cheap, lifecycle to colder tiers)
```

Example Athena pattern (CloudTrail): query all actions by a suspected credential:

```sql
SELECT eventtime, eventsource, eventname, sourceipaddress
FROM cloudtrail_logs
WHERE useridentity.accesskeyid = 'AKIA...'
  AND eventtime > '2026-06-01T00:00:00Z'
ORDER BY eventtime;
```
Partitioning the table by date keeps the scan (and cost) small.

---

## How to Decide

- **Ad-hoc analysis of months of archived logs, cost-sensitive?** → Athena over S3.
- **Interactive query of recent logs already in CloudWatch Logs?** → CloudWatch Logs Insights.
- **Full-text search, security dashboards, real-time correlation (SIEM-like)?** → OpenSearch Service.
- **Normalize many sources to one schema for analysis and third-party SIEM?** → Security Lake (OCSF).
- **Automated investigation/correlation of a finding?** → Amazon Detective.
- **Unified dashboards across several data sources?** → Managed Grafana.
- **Control cost?** → tier hot logs (CloudWatch/OpenSearch) vs. cold archives (S3/Athena + lifecycle).

---

## How This Connects

This lesson completes the detection data pipeline started in the logging lesson and consumed by the monitoring services — Security Lake centralizes, Athena/OpenSearch analyze, Detective correlates. It feeds directly into Incident Response (searching and correlating logs as forensic evidence) and connects to Data Protection (encrypting and masking the analyzed data) and cost optimization (tiering and lifecycle).

---

## Exam Traps

- **Confusing Athena and Logs Insights.** Athena queries archived data in *S3*; Logs Insights queries data in *CloudWatch Logs*.
- **Reaching for OpenSearch when Athena fits.** For cheap ad-hoc analysis of large archived logs, Athena is usually more cost-effective than standing up OpenSearch.
- **Treating Security Lake as an analysis tool.** It *centralizes and normalizes* (OCSF) the data; you still analyze with Athena/OpenSearch/SIEM.
- **Ignoring cost tiering.** Keeping everything hot in CloudWatch/OpenSearch is expensive; archive to S3 for long-term, query with Athena.
- **Forgetting normalization for correlation.** Cross-source correlation is far easier once data is in a common schema (OCSF) — that's Security Lake's value.

---

## Summary

Turning logs into security insight means choosing the right analysis and correlation architecture. Athena runs cost-effective serverless SQL over large archived logs in S3 (including Security Lake's OCSF Parquet); CloudWatch Logs Insights interactively queries recent logs in CloudWatch Logs; OpenSearch Service delivers full-text search, dashboards, and cross-source correlation like a SIEM; and Security Lake centralizes and normalizes data from many sources to the OCSF schema so tools and subscribers can consume it uniformly. Detective automates investigation-time correlation, and Managed Grafana unifies visualization. Match the tool to the requirement and tier hot versus cold logs to control cost — real-time interactive work in CloudWatch/OpenSearch, long-term ad-hoc analysis in S3/Athena.

---

## Examples

**Example 1 — Athena investigation.** An incident requires tracing one access key's activity across three months of CloudTrail in S3 → partitioned **Athena** queries, cheap and serverless.

**Example 2 — Security dashboards.** A SOC wants real-time search and dashboards correlating flow logs, WAF logs, and findings → stream into **OpenSearch Service** with dashboards and detectors.

**Example 3 — SIEM in a common schema.** A third-party SIEM must ingest all AWS and partner logs in one normalized format → **Security Lake** (OCSF) with the SIEM as a subscriber.

**Example 4 — Cost tiering.** A team's CloudWatch Logs bill is huge from retaining everything hot → shorten CloudWatch retention for real-time needs and **archive to S3** for long-term **Athena** analysis with lifecycle policies.

---

## Think About It

A security team needs to (a) build live dashboards of web-attack and network activity, and (b) cost-effectively investigate incidents across a year of archived CloudTrail and flow logs. Explain why a single tool is a poor fit for both needs, which tool you'd use for each, and how normalizing to OCSF in Security Lake would simplify correlating the archived sources during an investigation.

---

## Quick Check

1. What is the key difference between Amazon Athena and CloudWatch Logs Insights?
2. When would you choose OpenSearch Service over Athena for log analysis?
3. What problem does normalizing logs to OCSF (via Security Lake) solve?
4. How do you control the cost of large-scale log analysis?

*Answers: (1) Athena runs SQL over archived logs in S3 (pay per scan), while Logs Insights interactively queries logs already stored in CloudWatch Logs; (2) when you need full-text search, real-time dashboards, and cross-source correlation (SIEM-like capability) rather than cheap ad-hoc SQL on archives; (3) it makes logs from many different sources share one common schema so they can be queried and correlated uniformly and consumed by multiple tools/subscribers; (4) tier hot logs (CloudWatch/OpenSearch, short retention) versus cold archives (S3/Athena with lifecycle policies), and use partitioned columnar (Parquet) data to reduce scanned bytes.*

---

## What's Next

Next: **Troubleshooting Detection, Logging, and Alerting** — diagnosing missing logs, agent and permission misconfigurations, and broken alerting across the detection pipeline.
