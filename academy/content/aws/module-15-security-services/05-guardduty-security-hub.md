---
title: "GuardDuty, Inspector, and Security Hub"
type: content
estimated_minutes: 14
cert_tags: ["SAA-C03", "SAP-C02"]
---

# GuardDuty, Inspector, and Security Hub

## Overview

Encryption and access control prevent unauthorized access to resources. But what happens after an attacker gets in — through a compromised credential, a misconfigured bucket, or a vulnerable application? Threat detection, vulnerability management, and security posture monitoring are the services that tell you when something has gone wrong. Amazon GuardDuty detects active threats. Amazon Inspector finds vulnerabilities before they are exploited. AWS Security Hub aggregates findings from both — plus Macie, Firewall Manager, and IAM Access Analyzer — into a single dashboard with automated compliance scoring.

These three services address different points in the security timeline. Inspector is proactive: it finds CVEs in OS packages, container images, and Lambda dependencies before an attacker uses them. GuardDuty is reactive: it detects malicious activity in progress by analyzing CloudTrail, VPC Flow Logs, and DNS logs for known threat patterns and anomalies. Security Hub is the aggregation layer: it normalizes findings from all sources, runs compliance checks against frameworks like CIS AWS Foundations Benchmark and PCI DSS, and provides the operational view a security team needs across dozens of accounts.

The SAA exam tests what each service does, what data sources GuardDuty analyzes, how automated response works, and what Security Hub aggregates. The SAP exam adds multi-account organization management, delegated administrators, EventBridge-driven automated response design, and cross-region finding aggregation. After this lesson, you will be able to design a complete threat detection and compliance monitoring architecture for a multi-account AWS environment.

---

## Core Concepts

### Amazon GuardDuty

GuardDuty is a managed threat detection service that requires no agents, no infrastructure changes, and no configuration beyond enabling it. When enabled, it continuously analyzes three primary data sources: **CloudTrail management events** (API calls in the account), **VPC Flow Logs** (network traffic metadata), and **Route 53 DNS query logs** (DNS requests from VPC resources).

**GuardDuty Runtime Monitoring** (launched 2023) extends threat detection beyond logs to the actual runtime behavior of workloads. Using lightweight agents deployed to ECS tasks, EKS pods, and Lambda functions, Runtime Monitoring detects threats like process injection, privilege escalation, suspicious file access, and unexpected network connections — behaviors invisible to CloudTrail or Flow Logs. Runtime Monitoring is an opt-in feature with an additional charge. It is increasingly tested on SAA-C03 as the answer for "detect threats at the container/serverless runtime level."

GuardDuty uses a combination of AWS threat intelligence feeds, third-party threat intelligence (CrowdStrike, Proofpoint), and machine learning to identify threats across three categories:

**Compromise indicators**: an EC2 instance communicating with a known command-and-control IP, an IAM user calling APIs from a TOR exit node, cryptocurrency mining activity detected in network traffic.

**Anomalies**: an IAM user who has never called EC2 APIs suddenly launching 50 instances, a Lambda function making an unusual number of Secrets Manager calls, API calls from a geolocation inconsistent with the user's baseline.

**Configuration threats**: S3 bucket policy changes that expose data publicly, disabling CloudTrail logging (GuardDuty logs this before the log stream stops).

Each finding is severity-rated (LOW, MEDIUM, HIGH, CRITICAL) and describes the specific threat, the affected resource, and evidence. Findings are surfaced in the GuardDuty console, sent to EventBridge for automated response, and forwarded to Security Hub.

GuardDuty can be enabled at the **AWS Organizations level** with a delegated administrator account — a single account that can enable GuardDuty for every account in the organization, view all findings centrally, and manage suppression rules without needing access to each account.

---

### GuardDuty Automated Response

GuardDuty findings flow to **EventBridge** as events, enabling automated response without human intervention. The standard pattern:

GuardDuty finding → EventBridge rule (matches finding type or severity) → Lambda function → remediation action.

Common remediation actions: isolate a compromised EC2 instance by replacing its security group with a deny-all group (preserving the instance for forensics), disable a compromised IAM user's access keys, block an IP address in a Network ACL or WAF IP set, snapshot an EBS volume for forensic analysis, or open a ServiceNow/Jira ticket via API.

The important design principle: **isolate, don't immediately terminate**. Terminating a compromised instance destroys evidence. The correct sequence is isolate (security group replacement) → snapshot (forensics) → notify → investigate → terminate.

---

### Amazon Inspector

Inspector is an automated vulnerability management service for EC2 instances, Lambda functions, and container images stored in ECR. It scans continuously — not just on demand — using the SSM agent on EC2 (agentless from the application's perspective) and integrating directly with ECR for container images.

Inspector assesses three categories of risk:

**Software vulnerabilities (CVEs)**: known vulnerabilities in OS packages (Amazon Linux, Ubuntu, Windows Server) and application dependencies (Python packages, npm modules in Lambda). Each finding includes the CVE ID, CVSS score, affected package, and a fix recommendation.

**Network reachability**: identifies EC2 instances reachable from the internet on ports that are unexpected given the instance's role — an internal database server with port 3306 accessible from 0.0.0.0/0, for example.

**Lambda code vulnerabilities**: Inspector scans Lambda function code packages for vulnerable dependencies, flagging libraries with known CVEs in the function's deployment package.

Inspector integrates with ECR so that every image pushed to a repository is automatically scanned. A critical CVE in a base image generates an Inspector finding that surfaces in Security Hub and can block deployment via a CodePipeline quality gate.

---

### AWS Security Hub

Security Hub is the aggregation and compliance layer. It receives findings from GuardDuty, Macie, Inspector, Firewall Manager, IAM Access Analyzer, and over 50 third-party partner integrations. All findings are normalized to **ASFF (Amazon Security Finding Format)**, enabling consistent search, filtering, and automated workflow across all sources.

In addition to aggregating findings, Security Hub runs its own **compliance checks** — automated evaluations of your AWS configuration against frameworks:

- **AWS Foundational Security Best Practices** — AWS's own standard for secure configuration
- **CIS AWS Foundations Benchmark** — a widely adopted third-party security standard
- **PCI DSS** — Payment Card Industry compliance standard
- **NIST SP 800-53** — US federal security controls

Each check evaluates a specific resource configuration (e.g., "CloudTrail enabled in all regions," "S3 buckets block public access," "RDS instances are not publicly accessible") and produces a PASS or FAIL with remediation guidance.

Security Hub supports a **delegated administrator** pattern via AWS Organizations: one account manages findings and compliance across all accounts. Cross-region aggregation allows a single Security Hub region to pull findings from all regions in the organization.

---

## Configuration Reference

### Enabling GuardDuty at the Organization Level

```bash
# In the delegated administrator account — enable GuardDuty for the organization
aws guardduty create-detector \
  --enable \
  --finding-publishing-frequency FIFTEEN_MINUTES \  # How often findings are exported to S3
  --features '[{"Name":"S3_DATA_EVENTS","Status":"ENABLED"},{"Name":"EKS_AUDIT_LOGS","Status":"ENABLED"},{"Name":"MALWARE_PROTECTION","Status":"ENABLED"}]' \
  --region us-east-1

# Designate this account as the GuardDuty admin for the org 