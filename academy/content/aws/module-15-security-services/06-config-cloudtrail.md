---
title: "AWS Config and CloudTrail"
type: content
estimated_minutes: 13
cert_tags: ["SAA-C03", "SAP-C02"]
---

# AWS Config and CloudTrail

## Overview

Every security incident eventually leads to two questions: what changed, and who changed it? AWS Config answers the first — it continuously records the configuration state of every supported resource in your account and evaluates whether those configurations comply with your rules. CloudTrail answers the second — it logs every API call made to your account, capturing the caller's identity, the action taken, the resource affected, and the outcome. Together they form the audit and compliance backbone of any serious AWS security architecture.

These two services are frequently confused because they both track "changes." The distinction is precise: Config tracks the state of resources (what an S3 bucket's configuration looks like at any point in time), while CloudTrail tracks the actions that caused state changes (the API call that modified the bucket, with the caller's ARN and timestamp). To investigate an incident you typically need both — Config tells you what changed and when, CloudTrail tells you who made the API call that caused it.

For the SAA exam, understand what each service records, how Config rules trigger compliance evaluation and automated remediation, how to make CloudTrail logs tamper-proof, and the 90-day default retention of Event History. SAP adds cross-account Config aggregation, Conformance Packs for framework compliance, CloudTrail Lake for SQL-based log analysis, and multi-region Trail configuration. After this lesson you will be able to design a complete audit and compliance monitoring architecture for a multi-account organization.

---

## Core Concepts

### AWS CloudTrail

CloudTrail logs every AWS API call as an **event** — whether made from the AWS console, CLI, SDK, or by an AWS service acting on your behalf. Each event includes: the IAM principal who made the call (user ARN or role ARN with assumed session), the timestamp, the source IP address, the AWS service and action (`s3:PutBucketPolicy`, `ec2:TerminateInstances`), the specific resource, and the response (success or error code).

CloudTrail records two categories of events:

**Management events** (control-plane): actions that create, modify, or delete AWS resources — creating an EC2 instance, attaching an IAM policy, modifying a security group. Management events are enabled by default and visible in the **Event History** console for the last 90 days at no additional cost.

**Data events** (data-plane): S3 object-level operations (`GetObject`, `PutObject`, `DeleteObject`), Lambda function invocations, DynamoDB item-level operations. Data events are disabled by default because they generate extremely high volume (every S3 read generates an event) and are charged per event. Enable them only on specific high-value buckets or functions where object-level audit is required.

To retain events longer than 90 days, create a **Trail** — a configuration that continuously delivers events to an S3 bucket. From S3, logs can be queried with Athena, streamed to CloudWatch Logs for real-time alerting, or ingested into a SIEM. **CloudTrail Lake** provides a managed event data store with SQL-based querying, eliminating the need to manage Athena infrastructure for log analysis. CloudTrail Lake retention is configurable from 90 days up to 7 years (default: 7 years) and is charged per GB ingested and per GB scanned during queries — in contrast to Event History (free, 90 days, no querying) and Trails to S3 (pay only for S3 storage, queryable via Athena).

---

### CloudTrail Integrity and Tamper Prevention

A Trail is only forensically reliable if the logs cannot be modified or deleted. CloudTrail provides **log file integrity validation**: each log file delivery is accompanied by a digest file containing SHA-256 hashes of the log files for that period. If any log file is modified or deleted after delivery, validation fails when the digest is checked.

But integrity validation only detects tampering — it does not prevent it. A compromised administrator in the same account as the Trail bucket can delete both the logs and the digest files. The correct architecture for tamper-proof audit logs:

1. Deliver Trail logs to a dedicated **Log Archive account** in your AWS Organization — a separate account that regular operations accounts have no write access to.
2. Enable **S3 Object Lock** (WORM — Write Once Read Many) on the log bucket in Compliance mode, preventing even the root user of the Log Archive account from deleting or overwriting log files during the retention period.
3. Enable **log file integrity validation** to detect any tampering that does occur.

This three-layer approach — cross-account delivery, Object Lock, and integrity validation — creates a forensically reliable audit trail that survives even a full account compromise.

---

### AWS Config: Resource Configuration History

Config continuously records the configuration state of supported AWS resources. Every time a resource's configuration changes — a security group rule is added, an S3 bucket's public access setting is modified, an IAM role's trust policy is updated — Config records the new configuration state and the timestamp.

The **configuration history** allows you to view a resource's configuration at any point in the retention period (up to 7 years). The **resource timeline** shows every configuration change alongside the CloudTrail events that caused each change — connecting "what changed" directly to "who changed it" in a single view.

Config stores configuration history in an S3 bucket (your own) and can stream configuration change notifications to SNS. In a multi-account organization, a Config **aggregator** in a central account collects configuration data from all accounts and regions, providing a unified compliance view.

---

### Config Rules and Compliance

Config rules evaluate resources against compliance criteria. When a rule finds a resource non-compliant, it generates a finding. Rules evaluate either continuously (when a resource configuration changes) or periodically (on a schedule, every 1–24 hours).

**AWS Managed Rules** are pre-built rules for common compliance checks. Examples: `ec2-instance-no-public-ip`, `s3-bucket-server-side-encryption-enabled`, `iam-root-access-key-check`, `rds-instance-deletion-protection-enabled`. AWS offers 200+ managed rules.

**Custom Rules** are Lambda functions you write that implement your own compliance logic — for example, checking that EC2 instances use only approved AMIs, or that all resources in an account have a specific required tag.

**Conformance Packs** bundle multiple rules into a single deployable unit aligned to a compliance framework. AWS provides Conformance Packs for CIS AWS Foundations Benchmark, NIST 800-53, PCI DSS, HIPAA, and others. Deploying a Conformance Pack to an organization OU automatically applies all included rules to every account in the OU.

---

### Config Automated Remediation

When Config detects a non-compliant resource, it can trigger automatic remediation via **Systems Manager (SSM) Automation documents**. An Automation document defines the specific API calls needed to bring the resource back to compliance — enabling S3 block public access, removing a public IP from an EC2 instance, enabling deletion protection on an RDS instance.

Remediation can be configured as **automatic** (triggers immediately when Config marks a resource non-compliant) or **manual** (requires an operator to approve the remediation action). Automatic remediation is appropriate for clear-cut violations where false positives are unlikely. Notify-only or manual remediation is appropriate when the non-compliant state might be intentional for specific resources that need to be exempted.

Config also integrates with EventBr