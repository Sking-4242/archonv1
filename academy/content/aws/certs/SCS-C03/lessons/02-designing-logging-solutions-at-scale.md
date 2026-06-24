---
title: "Designing Logging Solutions at Scale"
type: content
estimated_minutes: 18
cert_tags: ["SCS-C03"]
---

# Designing Logging Solutions at Scale

## Overview

Logs are the raw material of cloud security: every detection, every investigation, and every audit depends on capturing the right logs, storing them durably and tamper-evidently, and making them available to the right consumers. The Security Specialty exam's Detection domain (Task 1.2) tests your ability to *design and implement logging solutions* — identifying log sources, configuring organization-wide CloudTrail, building a dedicated logging account, and ensuring log integrity. This is architecture, not trivia: the exam gives you a multi-account organization with compliance and security requirements and asks how you centralize and protect the logs.

The central design principle is **centralization with integrity**. In a single account, logging is simple; across an organization, you must collect logs from every account into a central, locked-down location that account owners cannot tamper with — because an attacker's first move is often to disable or delete logs that would reveal them. The specialty-level patterns are an **organization CloudTrail trail** that every account inherits and cannot turn off, a **dedicated logging (or log archive) account** with restricted access, **log file validation** to detect tampering, and appropriate use of CloudWatch Logs for real-time processing. Knowing which logs to capture (management vs. data events, network logs) and how to protect them is exactly what Task 1.2 rewards.

This lesson covers the major AWS log sources, how to design organization-wide CloudTrail, the dedicated-logging-account pattern, and log integrity and protection. After it you will be able to design a centralized, tamper-resistant logging architecture for an AWS organization.

---

## Core Concepts

### AWS CloudTrail — The Audit Backbone

**AWS CloudTrail** records API activity across AWS — who made which call, when, from where, and to what — and is the single most important log source for security on AWS. Two distinctions are heavily tested. First, **event types**: **management events** record control-plane operations (creating a bucket, modifying a security group) and are logged by default; **data events** record data-plane operations (S3 object GetObject/PutObject, Lambda invocations) and must be explicitly enabled because they are high-volume; **Insights events** detect unusual operational patterns. Second, **trail scope**: a trail can be single-account/single-Region, all-Regions, or — crucially for the exam — an **organization trail** created in the management account (or delegated admin) that automatically logs events for **every account in the organization** into one S3 bucket, and member accounts **cannot modify or delete** it. The organization trail is the backbone of multi-account logging.

### Log File Validation and Integrity

Because logs are a target, CloudTrail offers **log file integrity validation**: when enabled, CloudTrail delivers a digitally signed **digest file** for each period, allowing you to prove that log files were not modified or deleted after delivery. This is the mechanism the exam expects when a question asks how to *prove* logs are tamper-free for forensics or audit. Combine it with S3 protections (below) so that even an attacker with some access cannot silently alter the record.

### The Dedicated Logging Account Pattern

The specialty best practice is to deliver all organization logs to a **dedicated logging (log archive) account** that is separate from where workloads run and where most people have access. CloudTrail (and Config, VPC Flow Logs, etc.) write to an S3 bucket in this account; access is tightly restricted (often only a few security principals), **S3 Block Public Access** is on, the bucket policy denies deletion to all but a break-glass role, and **MFA Delete** or **S3 Object Lock** prevents tampering. This isolation means that compromising a workload account does not let the attacker reach or erase the central log store. AWS Control Tower's landing zone provisions exactly such a log archive account, which is why it appears in governance scenarios too.

### CloudWatch Logs — Real-Time and Application Logs

**Amazon CloudWatch Logs** ingests logs from applications, the **CloudWatch agent** (OS, EC2, on-premises), Lambda, VPC Flow Logs, Route 53 Resolver, and more, and supports real-time processing via **subscription filters** (streaming matching log events to Lambda, Kinesis, or OpenSearch) and **metric filters** (turning log patterns into CloudWatch metrics and alarms). A common specialty pattern is a **dedicated centralized logging account** that receives CloudWatch Logs from many accounts via cross-account subscription, or aggregates them for analysis. CloudWatch Logs also supports **data protection policies** that mask sensitive data in logs (covered in Data Protection). Know the difference: CloudTrail is the API audit log; CloudWatch Logs is the general log ingestion/processing service, and the two integrate (CloudTrail can deliver to CloudWatch Logs for alerting).

### Network and Service Log Sources

Task 1.2 explicitly calls out choosing log sources based on network design and threats. Key network logs: **VPC Flow Logs** (IP traffic metadata for ENIs, subnets, or VPCs — accepted/rejected flows), **Transit Gateway Flow Logs** (traffic across a transit gateway), and **Route 53 Resolver query logs** (DNS queries from within your VPCs, useful for detecting data exfiltration and C2 domains). Service logs include **S3 server access logs / CloudTrail S3 data events**, **ELB access logs**, **CloudFront access logs**, **WAF logs**, and **API Gateway execution/access logs**. The exam expects you to pick the right source for a given threat — e.g., DNS exfiltration → Route 53 Resolver query logs; suspicious network flows → VPC Flow Logs; web-layer attacks → WAF logs.

### CloudTrail Lake — Managed Audit Queries

Beyond delivering events to S3, **AWS CloudTrail Lake** is a managed audit-data lake that stores CloudTrail (and other) events in an immutable store you can query directly with SQL, without building your own Athena tables. You create **event data stores** with a configurable retention period (up to years), optionally aggregating across an organization and Regions, and run SQL queries for investigations and audits. CloudTrail Lake is the answer when a scenario wants **long-term, queryable, immutable retention of audit events with minimal setup** — it trades some cost for convenience and tamper-resistance compared to managing raw logs in S3 plus Athena. For the exam, recognize it as the managed, SQL-queryable evolution of CloudTrail history, distinct from a plain trail-to-S3 delivery.

### Encrypting and Protecting Logs

Logs frequently contain sensitive information and must be protected. CloudTrail and CloudWatch Logs support **encryption with KMS** (SSE-KMS), and a frequent exam subtlety is that an overly restrictive KMS key policy can *break* logging (CloudTrail/CloudWatch can't write) — so key policies must grant the service the needed permissions. Protect log buckets with bucket policies, Block Public Access, Object Lock (WORM), and least-privilege access, and consider replicating to another account/Region for resilience against deletion.

---

## Configuration Reference

Organization logging architecture:

```text
Management/Delegated-Admin account
   └─ Organization CloudTrail trail (all accounts, all Regions, data+mgmt events,
       log file validation ON, SSE-KMS) ──► S3 in Log Archive account
Log Archive (dedicated) account
   └─ S3 bucket: Block Public Access ON, Object Lock/MFA Delete, restrictive
       bucket policy (deny delete except break-glass), KMS-encrypted
Each workload account
   └─ VPC Flow Logs, Route 53 Resolver query logs, CloudWatch Logs → central
```

CloudTrail event types (know the distinction):

```text
Management events  control-plane (default on) — e.g., CreateBucket, AuthorizeSecurityGroupIngress
Data events        data-plane (opt-in, high volume) — e.g., S3 GetObject, Lambda Invoke
Insights events    anomalous API call-rate detection
Org trail          one trail logs ALL org accounts; members can't disable/delete it
Log file validation digest files prove logs weren't tampered with
```

Log source → threat mapping:

```text
DNS exfiltration / C2 domains        → Route 53 Resolver query logs
Suspicious network flows / scanning   → VPC Flow Logs (and TGW flow logs)
Web exploits (SQLi/XSS, bots)         → AWS WAF logs
S3 object access                      → CloudTrail S3 data events / S3 access logs
API misuse                            → API Gateway access/execution logs
Who-did-what across the org           → organization CloudTrail trail
```

KMS-for-logs gotcha: the key policy must allow the logging service to use the key, e.g. for CloudWatch Logs:

```json
{
  "Sid": "AllowCloudWatchLogs",
  "Effect": "Allow",
  "Principal": { "Service": "logs.<region>.amazonaws.com" },
  "Action": ["kms:Encrypt","kms:Decrypt","kms:GenerateDataKey*","kms:Describe*"],
  "Resource": "*"
}
```
Omitting this is a classic "logs stopped being delivered" troubleshooting cause.

---

## How to Decide

- **Log API activity for every account, un-disableable?** → organization CloudTrail trail delivered to a dedicated log archive account.
- **Prove logs weren't tampered with?** → enable CloudTrail log file validation; protect the bucket with Object Lock/MFA Delete and restrictive policies.
- **Capture S3 object-level access?** → enable CloudTrail data events (not just management events).
- **Detect DNS-based exfiltration?** → Route 53 Resolver query logs. **Network flows?** → VPC Flow Logs.
- **Real-time log alerting?** → CloudWatch Logs metric/subscription filters → alarms/Lambda.
- **Protect log confidentiality?** → SSE-KMS (and ensure the key policy grants the logging service access).

---

## How This Connects

This lesson is the data foundation for the entire Detection domain and the Incident Response domain — Security Lake (previous lesson) consumes these logs, Detective and Athena query them, and forensic response depends on their integrity. The dedicated logging account and organization trail tie into Domain 6 (Control Tower landing zone, multi-account governance), and the KMS-for-logs subtlety connects to Domain 5 (encryption and key policies).

---

## Exam Traps

- **Logging only management events.** S3/Lambda object-level activity requires *data events*, which are opt-in.
- **Single-account trails in an org.** The specialty answer is an *organization trail* that members cannot disable, delivered to a dedicated log archive account.
- **Forgetting log integrity.** To *prove* logs are untampered, enable CloudTrail log file validation and lock the bucket (Object Lock/MFA Delete).
- **Over-tight KMS key policies breaking logging.** The key policy must let CloudTrail/CloudWatch Logs use the key, or delivery silently fails.
- **Wrong network log source.** DNS exfiltration → Resolver query logs; flow-level traffic → VPC Flow Logs; web attacks → WAF logs.
- **Keeping logs in workload accounts.** Centralize to an isolated log archive account so a compromised workload can't erase the record.

---

## Summary

Designing logging at specialty scale means centralizing every account's logs into a tamper-resistant, isolated location. CloudTrail is the API audit backbone — know management vs. data vs. Insights events, and use an organization trail that all accounts inherit and cannot disable, delivered to a dedicated log archive account with Block Public Access, Object Lock/MFA Delete, restrictive policies, and KMS encryption. Enable CloudTrail log file validation to prove integrity. Use CloudWatch Logs for application/agent logs and real-time processing via metric and subscription filters, and choose network log sources by threat — Route 53 Resolver query logs for DNS exfiltration, VPC/TGW Flow Logs for network flows, WAF logs for web attacks. Mind the KMS key-policy requirement so logging services can write, a frequent failure cause.

---

## Examples

**Example 1 — Org trail.** A company must guarantee every current and future account logs API activity to one place that account admins can't disable → an **organization CloudTrail trail** to the **log archive account**.

**Example 2 — Tamper-proof forensics.** Auditors require proof that stored logs are unaltered → enable **log file validation** and apply **S3 Object Lock** to the log bucket.

**Example 3 — DNS exfiltration.** Suspected data exfiltration via DNS tunneling → enable **Route 53 Resolver query logging** and analyze for anomalous domains.

**Example 4 — Logging broke.** After tightening a KMS key, CloudTrail stopped delivering logs → the **key policy** no longer grants the CloudTrail/CloudWatch service permission to use the key; restore the service grant.

---

## Think About It

An organization delivers CloudTrail to an S3 bucket in the same account where its production workloads run, with normal admin access. Explain two distinct risks this creates for incident response (think tampering and blast radius), and redesign the logging architecture to eliminate them — naming the account structure, the trail type, and at least two bucket protections you would apply.

---

## Quick Check

1. What is the difference between CloudTrail management events and data events, and which are on by default?
2. What does an organization CloudTrail trail provide that per-account trails do not?
3. How do you prove that stored CloudTrail logs have not been tampered with?
4. Which log source best detects DNS-based data exfiltration?

*Answers: (1) management events record control-plane API calls (on by default), data events record data-plane operations like S3 object access and Lambda invokes (opt-in, high volume); (2) it logs every account in the organization into one bucket and cannot be disabled or deleted by member accounts; (3) enable CloudTrail log file integrity validation (signed digest files) and protect the bucket with Object Lock/MFA Delete; (4) Amazon Route 53 Resolver query logs.*

---

## What's Next

Next: **Log Storage, Analysis, and Correlation** — turning centralized logs into insight with Security Lake/OCSF, Athena, CloudWatch Logs Insights, and OpenSearch, and correlating across sources.
