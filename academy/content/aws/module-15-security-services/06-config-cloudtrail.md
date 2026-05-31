---
title: "AWS Config and CloudTrail"
type: content
estimated_minutes: 8
cert_tags: ["SAA-C03", "SAP-C02", "SCS-C02"]
---

# AWS Config and CloudTrail

## Overview

AWS Config tracks the configuration state of your AWS resources over time and evaluates compliance against rules. CloudTrail records every API call made to your AWS account. Together they answer two critical questions: 'What changed and when?' (Config) and 'Who did it?' (CloudTrail).

## AWS CloudTrail

CloudTrail captures every AWS API call — from the console, SDK, CLI, or AWS services — as an event with: who made the call (IAM ARN), when, from where (IP address), what service and action, what resource, and the result. Management events (control plane: create, modify, delete) are enabled by default and stored for 90 days in the CloudTrail Event History. Enable a Trail to store events in S3 for longer retention, query with Athena, or stream to CloudWatch Logs for alerting. Data events (S3 object reads/writes, Lambda invocations) must be explicitly enabled — they generate high volume and cost.

## CloudTrail Integrity

CloudTrail log files can be validated with log file integrity verification — each log file has a digest file with SHA-256 hashes. If a log file is modified or deleted, validation fails. Enable this for forensically reliable audit trails. Store Trail logs in a dedicated security account with S3 Object Lock to prevent tampering even by account administrators.

## AWS Config

Config continuously records the configuration state of supported resources (EC2, S3, IAM, VPC, RDS, etc.) and stores configuration history in S3. You can query the configuration of any resource at any point in the retention period. Config Rules evaluate resources against compliance rules: `ec2-instance-no-public-ip`, `s3-bucket-server-side-encryption-enabled`, `iam-root-access-key-check`. Rules can be AWS managed (100+ available) or custom Lambda-backed. Conformance Packs bundle multiple rules for a compliance framework (CIS, NIST, PCI).

## Config Remediation

When Config detects a non-compliant resource, it can trigger automatic remediation via Systems Manager Automation documents. Example: a Config rule finds an S3 bucket with public access enabled → SSM Automation runs `EnableS3BucketBlockPublicAccess` automatically. This closes the loop from detection to remediation without human intervention. Remediation can also just notify via SNS if automatic action is too aggressive.

## Summary

CloudTrail answers 'who did what and when' for every API call in your account. Config answers 'what is the current and historical configuration of my resources' and 'are they compliant?' Enable both at the Organization level with a centralized Log Archive account. Enable CloudTrail log file integrity verification. Use Config rules for continuous compliance monitoring with automated or manual remediation.

## Examples

A financial services firm is investigated after a suspected insider threat: someone allegedly deleted S3 objects containing audit logs. The security team opens CloudTrail and filters by `s3:DeleteObject` events on the log bucket over the past 30 days. Within minutes they have the IAM ARN, source IP address, timestamp, and exact bucket and key for every deletion. The CloudTrail log file integrity verification — configured with SHA-256 digest files stored in a separate security account — proves the logs themselves have not been tampered with, making the evidence forensically admissible.

A cloud operations team is investigating why an RDS instance is publicly accessible. They use AWS Config's resource timeline to step back through the security group and RDS instance configurations over the past two weeks. At 2:14 AM on a Tuesday, the `PubliclyAccessible` flag was flipped from `false` to `true`. Cross-referencing that timestamp with CloudTrail, they find the exact API call, the IAM role that made it, and the assumed session name — which traces back to a CI/CD pipeline using a misconfigured deployment role. Config showed *what* changed; CloudTrail showed *who* changed it.

A platform engineering team at a logistics company needs to enforce that all new EC2 instances launched in any of their 20 AWS accounts must not have a public IP address. Instead of relying on developers remembering the rule, they deploy a Config Conformance Pack that includes the `ec2-instance-no-public-ip` managed rule. They configure automatic remediation via an SSM Automation document that calls `ModifyInstanceAttribute` to remove the public IP. When a developer accidentally launches an instance with a public IP, Config detects it within minutes and the automation remediates it — no ticket, no on-call page.

## Think About It

1. CloudTrail records management events by default but not data events. What is the cost-risk trade-off of enabling S3 data events (object-level reads and writes) for all buckets, and how would you decide which buckets justify the additional cost?
2. Config captures configuration state continuously, but there is a delay between a change and Config detecting it. What types of security incidents could exploit this detection window, and how would you reduce the risk during that gap?
3. A CloudTrail Trail is stored in S3 without Object Lock. An attacker who gains S3 admin access in the same account could delete or overwrite log files. How would you architect a tamper-proof audit trail that even a compromised account administrator cannot destroy?
4. Config Remediation can be set to automatic or to notify-only. What factors would lead you to choose notify-only remediation over automatic remediation, even when the rule violation is clearly wrong?
5. An auditor asks you to prove that no IAM policy granting `s3:*` was attached to any role in the past 90 days. Which AWS service(s) would you use to answer this question, and what would the investigation workflow look like?

## Quick Check

**Q1.** CloudTrail Management Events are enabled by default. How long does CloudTrail retain these events in the Event History without any additional configuration?

- A) 7 days
- B) 30 days
- C) 90 days
- D) 1 year

**Answer: C** — CloudTrail Event History retains management events for 90 days at no additional cost; you must configure a Trail writing to S3 for longer-term retention.

**Q2.** A Config rule detects that an S3 bucket has public access enabled. Automatic remediation is configured. What AWS service executes the remediation action?

- A) AWS Lambda invoked directly by Config
- B) AWS Systems Manager Automation
- C) AWS CloudFormation StackSets
- D) Amazon EventBridge with a direct API call

**Answer: B** — Config automatic remediation runs SSM Automation documents to correct non-compliant resources; the document defines the specific API calls needed to fix the violation.

**Q3.** Which statement best describes the difference between AWS Config and AWS CloudTrail?

- A) Config logs API calls; CloudTrail tracks resource configuration changes
- B) Config evaluates resource compliance and tracks configuration state over time; CloudTrail records who made each API call and when
- C) Config is for security finding aggregation; CloudTrail is for infrastructure compliance checks
- D) Both services do the same thing but Config is for AWS resources and CloudTrail is for IAM activity only

**Answer: B** — Config answers "what is the state of my resources and are they compliant?"; CloudTrail answers "who performed which API action and when?" — they are complementary, not redundant.

## What's Next

Next up: the Module 15 Security Canvas Labs — spot the gaps and design the fixes.