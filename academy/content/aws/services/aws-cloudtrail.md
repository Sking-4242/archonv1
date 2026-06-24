---
title: "AWS CloudTrail"
type: content
estimated_minutes: 18
cert_tags: ["CLF-C02", "SAA-C03", "SOA-C03", "SCS-C03"]
---

# AWS CloudTrail

## Overview

AWS CloudTrail records **API activity** across your AWS account — who did what, when, from where, with which credentials, and to which resource. It is the audit log of AWS: every console action, SDK call, and CLI command becomes an event you can review for security analysis, compliance, and operational troubleshooting. This *service reference* lesson covers event types, trails, log integrity, organization-wide capture, CloudTrail Lake, and what each certification expects.

CloudTrail matters because accountability and investigation depend on a reliable record of activity. When an incident occurs, CloudTrail answers "what happened and who did it"; for compliance, it proves controls are followed; for operations, it explains an unexpected change. The crucial distinction to internalize is **CloudTrail records API activity (who did what), AWS Config records resource configuration state (what a resource looks like over time), and CloudWatch records performance metrics/logs (how it's behaving).** They are complementary, not interchangeable, and the exams test that you can pick the right one.

---

## How It Works

CloudTrail captures **events** in categories:

- **Management events** — control-plane operations (launching an instance, changing a policy, assuming a role). These are recorded in **Event history** (last 90 days, queryable, no setup) but require a **trail** to be retained and delivered durably.
- **Data events** — high-volume, resource-level operations (S3 object GET/PUT, Lambda invokes, DynamoDB item access). **Off by default** and opt-in because of volume and cost.
- **Insights events** — automatically detect unusual operational patterns (e.g., a spike in a rarely used API or in error rates).

A **trail** delivers events to an **S3 bucket** (durable retention and analysis), and optionally to **CloudWatch Logs** (for alarming via metric filters) and **EventBridge** (for automated response). A **multi-Region trail** captures activity in all Regions; an **organization trail** captures every account's activity into a central bucket. **CloudTrail Lake** is a managed, immutable, SQL-queryable event store for longer retention and investigation.

---

## Key Features

- **Organization trail** — one trail capturing every account's activity, centralized in a logging account.
- **Log file integrity validation** — digest files (hash chains) let you prove logs were not altered or deleted.
- **Multi-Region trails** — capture activity everywhere, including Regions you don't normally use (where attackers often operate).
- **CloudWatch Logs integration** — alarm on sensitive events (root login, policy changes, security-group edits) via metric filters.
- **EventBridge integration** — drive automated, near-real-time response from API events.
- **CloudTrail Lake** — immutable, queryable storage with retention up to years for compliance and forensics.

---

## Configuration Reference

- **Create a multi-Region organization trail** delivering to a dedicated, locked-down S3 bucket in a central **logging account**, with **log file validation** enabled.
- **Protect the log bucket** with SSE-KMS, restrictive bucket policy, **versioning**, and **S3 Object Lock** so logs are tamper-resistant; an SCP can deny disabling the trail.
- **Send to CloudWatch Logs** to alarm on sensitive events.
- **Enable data events selectively** for sensitive resources (specific S3 buckets, Lambda functions) given their volume and cost.

---

## Operations and Troubleshooting

- **Missing an action in logs.** Confirm a **trail** exists (Event history is limited to 90 days and management events only), that the trail covers the right **Region(s)**, and that the **event category** (management vs. data) is enabled.
- **Investigations.** Use **CloudTrail Lake** or **Athena** over the S3 logs to query by principal, action, time, source IP, and user agent.
- **Tamper concerns.** Use **log file integrity validation** plus a write-restricted, versioned, Object-Locked, KMS-encrypted bucket so logs are trustworthy for forensics.
- **Cost from data events.** Data events are high-volume; scope them to genuinely sensitive resources.

---

## Integrations

CloudTrail delivers to **S3** (retention, queried by **Athena**), **CloudWatch Logs** (alarming), and **EventBridge** (automation); centralizes via **AWS Organizations** (organization trail); protects logs with **KMS** and S3 **Object Lock**; and feeds detection in **Security Hub**, **GuardDuty** (which consumes CloudTrail directly), and **Amazon Detective**. It is the authoritative activity record underpinning security monitoring, incident response, and compliance.

---

## Pricing and Cost Considerations

CloudTrail **management events** are **free for the first copy** delivered to a trail (additional copies, and **data** and **Insights** events, are charged), so the typical surprise is enabling **data events** broadly or **Insights**. Storage cost accrues in the destination **S3** bucket and any **CloudWatch Logs** ingestion; **CloudTrail Lake** charges for ingestion and storage. The cost levers are scoping data events to sensitive resources, applying S3 lifecycle on log storage, and using **one organization trail** rather than many redundant trails. Exact prices vary by Region and event type.

---

## Exam Relevance

**CLF-C02:** Know CloudTrail as the service that records account API activity for audit and governance, distinct from Config (configuration state) and CloudWatch (monitoring). Foundational — the three-way distinction is common.

**SAA-C03:** Know trails to S3/CloudWatch Logs, multi-Region and organization trails, and management vs. data events. Design depth.

**SOA-C03:** Operate auditing — trail setup, querying with Athena, alarming on events via metric filters, and troubleshooting missing logs. Operations depth.

**SCS-C03:** Deepest. Organization trails to a locked logging account, log file integrity validation, KMS/Object Lock protection, alarming on sensitive events, and CloudTrail as the foundation of detection and forensics. Security depth.

---

## Summary

AWS CloudTrail records API activity — management events (control-plane, first copy free), opt-in data events (resource-level, high-volume), and Insights events (anomalous patterns) — delivering them to S3, CloudWatch Logs, and EventBridge. Organization trails centralize all accounts in a logging account, log file integrity validation plus an Object-Locked KMS-encrypted bucket make logs tamper-evident, and CloudTrail Lake enables queryable long-term retention. It is the audit backbone for security investigation, compliance, and operations, and the key contrast is CloudTrail (who did what) vs. Config (resource state) vs. CloudWatch (performance). The recurring exam points are management-vs-data events, multi-Region/org trails, and protecting log integrity.

---

## Quick Check

1. What does CloudTrail record, and how does that differ from AWS Config and CloudWatch?
2. Why are data events off by default, and when would you enable them?
3. How do you capture and centralize activity across every account and Region in an organization?
4. Which features together make CloudTrail logs tamper-evident and tamper-resistant?
5. Which detection services consume CloudTrail data?

---

## What's Next

Pair this with **AWS Config** (resource state), **Amazon CloudWatch** (monitoring), **Amazon S3** + **AWS KMS** (log storage/protection), and the SCS-C03 logging-at-scale lessons.
