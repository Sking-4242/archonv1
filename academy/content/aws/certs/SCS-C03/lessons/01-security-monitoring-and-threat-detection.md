---
title: "Security Monitoring and Threat Detection Services"
type: content
estimated_minutes: 18
cert_tags: ["SCS-C03"]
---

# Security Monitoring and Threat Detection Services

## Overview

Detection is the first domain of the Security Specialty exam (16% of scored content) and the foundation of cloud security operations: you cannot respond to, contain, or eradicate a threat you cannot see. The SCS-C03 exam expects far more than knowing that GuardDuty "detects threats." It expects you to design an organization-wide detection architecture — choosing the right combination of GuardDuty, Security Hub, Macie, Amazon Detective, and Amazon Security Lake; aggregating findings across many accounts; routing them to the right responders; and automating regular assessments. This is design-and-implement depth, and the questions are scenario-driven: given a multi-account organization with specific threats and requirements, which services do you enable, how do you centralize them, and how do you alert.

The reason this matters is that real AWS environments are multi-account organizations, and security findings scattered across dozens of accounts are nearly useless. The specialty-level skill is *centralization and correlation*: enabling detection services through AWS Organizations with delegated administration, aggregating their findings into a single security account, normalizing the data so it can be queried and correlated, and driving automated alerting and assessment. Each service plays a distinct role — GuardDuty continuously analyzes activity for threats, Macie finds sensitive data, Security Hub aggregates and scores posture, Detective builds investigation graphs, and Security Lake centralizes and normalizes the underlying log data — and the exam tests whether you can assemble them into a coherent detection pipeline.

This lesson covers each detection service in depth, how they integrate, and how to deploy them organization-wide. After it you will be able to design a multi-account threat-detection architecture and match each service to its role in a scenario.

---

## Core Concepts

### Amazon GuardDuty — Continuous Threat Detection

**Amazon GuardDuty** is a managed threat-detection service that continuously analyzes data sources — CloudTrail management and S3 data events, VPC Flow Logs, and DNS query logs — using machine learning, anomaly detection, and integrated threat intelligence to identify malicious or unauthorized behavior, with **no agents to deploy**. It produces **findings** with a type, severity (0.1–8.9+), and the affected resource. Finding types span categories like reconnaissance (port scanning), instance compromise (cryptocurrency mining, malware command-and-control), credential compromise (anomalous API calls, credentials used from a new location), and S3 threats.

For the specialty exam, go beyond the basics to GuardDuty's **protection plans**, which extend coverage: **S3 Protection** (analyzing S3 data events), **EKS/Runtime Monitoring** (a lightweight agent inspecting container and EC2 runtime behavior), **Malware Protection** (scanning EBS volumes attached to suspicious instances), **RDS Protection** (login anomalies), and **Lambda Protection**. You should know that GuardDuty can be enabled across an **entire organization** via a delegated administrator, automatically covering existing and new accounts, and that findings are exported to EventBridge for automation and to Security Hub for aggregation.

### Amazon Macie — Sensitive Data Discovery

**Amazon Macie** uses machine learning and pattern matching to discover, classify, and protect **sensitive data** (PII, financial data, credentials) in Amazon S3. It produces **sensitive-data findings** (what sensitive data was found and where) and **policy findings** (S3 buckets that are public, unencrypted, or shared externally). On the exam, Macie answers the "discover and classify sensitive data at scale" requirement, and like GuardDuty it supports organization-wide delegated administration. A common design pattern: Macie identifies buckets containing PII, and its findings feed Security Hub and drive automated remediation (e.g., blocking public access).

### AWS Security Hub — Posture Aggregation and Standards

**AWS Security Hub** is the aggregation and posture-management hub. It performs two jobs the exam tests. First, it **aggregates findings** from GuardDuty, Macie, Inspector, IAM Access Analyzer, and many partner products into a normalized format (the AWS Security Finding Format, ASFF), giving one place to see everything. Second, it runs **security standards** — automated best-practice checks such as the AWS Foundational Security Best Practices, CIS Benchmarks, and PCI DSS — generating compliance findings with pass/fail controls. Security Hub supports **cross-Region aggregation** and **central configuration** across an organization, so a delegated administrator can enable standards and policies fleet-wide. Recognize Security Hub as the "single pane of glass" and the compliance-scoring engine.

### Amazon Detective — Investigation and Root Cause

**Amazon Detective** automatically builds a linked **behavior graph** from CloudTrail, VPC Flow Logs, and GuardDuty findings, letting you investigate the scope and root cause of a finding by visualizing entity relationships and activity over time. Where GuardDuty says "this happened," Detective helps answer "how did it happen, what else is affected, and is this normal." It is the investigation/root-cause tool (it reappears in the Incident Response domain). Tell: "investigate the scope/root cause of a finding across time and entities" → Detective.

### Amazon Security Lake — Centralized, Normalized Security Data

**Amazon Security Lake** automatically centralizes security data from AWS services, SaaS providers, on-premises, and third-party sources into a purpose-built **data lake stored in your own S3**, and normalizes it to the **Open Cybersecurity Schema Framework (OCSF)** open standard, converting it to query-efficient Parquet. This solves the correlation problem: instead of many log formats in many places, you get one consistent schema in one place that many tools can consume in parallel. **Subscribers** read the OCSF data (for example, a SIEM or an analytics tool), and you can query it directly with Athena. On the exam, Security Lake is the answer for "centralize and normalize security logs across the organization and many sources for analysis and third-party integration." It complements Security Hub (findings posture) by centralizing the underlying *log data*.

### How They Fit Together

These are not alternatives; they compose into a detection pipeline. **GuardDuty, Macie, and Inspector** generate findings → **Security Hub** aggregates and scores them → **EventBridge** routes findings to alerting and automated remediation → **Detective** investigates root cause → **Security Lake** centralizes and normalizes the underlying logs for correlation and third-party tools. All of them deploy organization-wide through **delegated administrator** accounts so a central security team manages detection across every account. The specialty skill is assembling this pipeline to meet a scenario's requirements.

### Cost, Coverage, and the Trade-off Mindset

The specialty exam explicitly tests trade-offs between cost, security, and complexity, and detection is full of them. Most of these services charge by **data volume analyzed or events processed**: GuardDuty bills by the quantity of CloudTrail events, VPC Flow Logs, and DNS logs analyzed; data events in CloudTrail and Macie's data inspection add cost; Security Lake and OpenSearch incur storage and processing charges. The design question is rarely "enable everything" — it is "what coverage does the threat model justify." A high-value account handling regulated data warrants Macie, S3 Protection, Malware Protection, and long log retention; a sandbox account may warrant only baseline GuardDuty. Likewise, **Runtime Monitoring** deploys an agent (more coverage, more operational overhead) versus agentless analysis (lighter, less depth). The exam rewards answers that match the depth and cost of detection to the sensitivity of the workload, rather than blanket-enabling every feature regardless of value — while still ensuring no account is left with *zero* detection.

---

## Configuration Reference

Organization-wide detection deployment pattern:

```text
Management account ──delegates──► Security (delegated admin) account
                                   ├─ GuardDuty (org auto-enable: all + new accounts)
                                   ├─ Security Hub (central config, standards, aggregation Region)
                                   ├─ Macie (org delegated admin)
                                   ├─ Detective (org behavior graph)
                                   └─ Security Lake (org rollup region, OCSF in S3)
Findings → EventBridge → SNS/Lambda/Step Functions (alert + auto-remediate)
```

Service → role mapping (the exam's favorite matching set):

```text
Service            Primary job
------------------ -------------------------------------------------
GuardDuty          continuous threat detection (no agents) → findings
Macie              discover/classify sensitive data in S3
Inspector          vulnerability scanning (compute) → findings
Security Hub       aggregate findings + run security standards (posture)
Detective          investigate scope/root cause (behavior graph)
Security Lake      centralize + normalize logs to OCSF in your S3
```

Example: route high-severity GuardDuty findings to responders via EventBridge:

```json
{
  "source": ["aws.guardduty"],
  "detail-type": ["GuardDuty Finding"],
  "detail": { "severity": [{ "numeric": [">=", 7] }] }
}
```
This EventBridge rule matches only high-severity findings; the target (SNS topic, Lambda, or Step Functions) performs the alert or automated containment. Aggregating into the delegated-admin account first means one rule covers the whole organization.

GuardDuty protection plans to remember:

```text
S3 Protection · Runtime/EKS Monitoring (agent) · Malware Protection (EBS scan)
RDS Protection · Lambda Protection
```

---

## How to Decide

- **Continuous, agentless threat detection across accounts?** → GuardDuty (org delegated admin), add protection plans for S3/EKS/malware/RDS as needed.
- **Find sensitive data (PII) in S3?** → Macie.
- **One place to see all findings + run compliance standards?** → Security Hub (central configuration).
- **Investigate how a finding happened and its blast radius?** → Amazon Detective.
- **Centralize and normalize security logs from AWS + third parties for correlation/SIEM?** → Security Lake (OCSF).
- **Aggregate/alert across the org?** → enable services org-wide via delegated administrator; route findings through EventBridge.

---

## How This Connects

This lesson builds on the SAA-level GuardDuty/Security Hub and Macie introductions in the shared security module but takes them to organization-scale design. It feeds directly into the logging lessons that follow (Security Lake and CloudTrail are the data foundation) and into the Incident Response domain (Detective for root cause, EventBridge for automated response). The delegated-administrator and organization patterns connect to Domain 6 (multi-account governance).

---

## Exam Traps

- **Confusing Security Hub and Security Lake.** Security Hub aggregates *findings* and runs *standards* (posture); Security Lake centralizes and normalizes *log data* (OCSF) for analysis and third-party tools.
- **Confusing GuardDuty and Inspector.** GuardDuty detects active threats from activity/logs (agentless); Inspector scans for *vulnerabilities* in compute.
- **Forgetting delegated administration.** Specialty answers enable detection org-wide via a delegated admin account, not account-by-account.
- **Overlooking GuardDuty protection plans.** Runtime Monitoring, Malware Protection, S3/RDS/Lambda Protection extend coverage — a frequent "how do you detect X" answer.
- **Using Security Hub for investigation.** Root-cause/scope investigation is Detective's job, not Security Hub's.
- **Assuming Macie scans non-S3 stores.** Macie discovers sensitive data specifically in Amazon S3.

---

## Summary

AWS detection is a pipeline of specialized, composable services deployed organization-wide via delegated administrators. GuardDuty continuously and agentlessly detects threats (extended by protection plans for S3, runtime/EKS, malware, RDS, and Lambda); Macie discovers and classifies sensitive data in S3; Inspector scans compute for vulnerabilities; Security Hub aggregates all findings and runs compliance standards as the single pane of glass; Detective builds behavior graphs for root-cause investigation; and Security Lake centralizes and normalizes security logs to the OCSF schema in your own S3 for correlation and third-party consumption. Findings flow through EventBridge to alerting and automated remediation. The specialty skill is assembling these into a centralized, correlated detection architecture that meets a scenario's threats and requirements.

---

## Examples

**Example 1 — Org-wide detection.** A 60-account organization needs centralized threat detection. Enable GuardDuty and Security Hub with a delegated administrator in a security account, set an aggregation Region, and auto-enable new accounts — one console, all accounts.

**Example 2 — Sensitive-data exposure.** A requirement to find and flag PII in S3 and alert on public buckets → Macie (sensitive-data and policy findings) feeding Security Hub, with EventBridge triggering remediation of public access.

**Example 3 — Investigation.** A GuardDuty finding shows credential exfiltration; analysts must determine scope and how it started → Amazon Detective's behavior graph traces the entities and timeline.

**Example 4 — SIEM integration.** A SOC wants all AWS and third-party security logs in one normalized format for its SIEM → Amazon Security Lake centralizes them in OCSF, with the SIEM as a subscriber.

---

## Think About It

A security team complains that they have GuardDuty, Macie, and Inspector enabled in 40 accounts but "can't see anything" — findings are stranded in individual accounts, and there's no way to correlate them with raw logs for a SIEM. Design the changes you would make: which service centralizes findings, which centralizes and normalizes the underlying logs, and what organization-level mechanism makes both manageable from one place?

---

## Quick Check

1. What is the difference between AWS Security Hub and Amazon Security Lake?
2. Which service investigates the scope and root cause of a finding, and what does it build to do so?
3. How do you enable GuardDuty across an entire AWS Organization, and what does that cover?
4. Name three GuardDuty protection plans and what each adds.

*Answers: (1) Security Hub aggregates security findings and runs compliance standards (posture management), while Security Lake centralizes and normalizes the underlying log data to the OCSF schema in your own S3 for analysis and third-party tools; (2) Amazon Detective, which builds a behavior graph from CloudTrail, VPC Flow Logs, and GuardDuty findings; (3) via a delegated administrator account in AWS Organizations with auto-enable, covering all existing and new member accounts; (4) any three of S3 Protection (S3 data events), Runtime/EKS Monitoring (runtime agent), Malware Protection (EBS scanning), RDS Protection (login anomalies), Lambda Protection.*

---

## What's Next

Next: **Designing Logging Solutions at Scale** — organization CloudTrail trails, dedicated logging accounts, CloudWatch Logs, and the log-centralization and integrity patterns that feed detection.
