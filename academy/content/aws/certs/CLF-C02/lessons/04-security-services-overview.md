---
title: "AWS Security Services Overview"
type: content
estimated_minutes: 14
cert_tags: ["CLF-C02"]
---

# AWS Security Services Overview

## Overview

Security and compliance is the largest domain on the Cloud Practitioner exam — 30% of scored content — and while IAM and the shared responsibility model carry much of it, a significant portion tests whether you can recognize AWS's broader catalog of security services and know where to find security information. Domain 2, Task 2.2 ("security, governance, and compliance concepts") and Task 2.4 ("components and resources for security") ask you to describe services like Amazon GuardDuty, Amazon Inspector, AWS Security Hub, AWS Shield, AWS WAF, and AWS Trusted Advisor, to understand encryption options, and to know where AWS publishes compliance and security guidance.

This breadth matters because securing a cloud environment isn't one tool — it's a layered set of services that detect threats, find vulnerabilities, protect against attacks, audit activity, and centralize findings. A practitioner doesn't configure these in depth, but must know what each one *does* and *when* it applies: which service detects malicious activity, which scans for vulnerabilities, which blocks web attacks, which defends against DDoS. The exam consistently presents a security need and asks you to name the matching service. Knowing the catalog by purpose — and knowing where to find AWS's compliance reports and security documentation — is exactly what these task statements reward.

This lesson surveys the AWS security services at Cloud Practitioner depth, covers encryption and logging/auditing services, and points to where AWS security and compliance information lives. After it you will be able to match a security requirement to the right AWS service.

---

## Core Concepts

### Threat Detection and Vulnerability Management

Two services are easy to confuse, so anchor the distinction. **Amazon GuardDuty** is a **threat-detection** service that continuously monitors your account and workloads for malicious or unauthorized activity — analyzing logs to flag things like unusual API calls, compromised instances, or reconnaissance. It *detects* active threats. **Amazon Inspector** is a **vulnerability-management** service that automatically scans workloads (such as EC2 instances and container images) for software vulnerabilities and unintended network exposure. It *finds weaknesses* before they're exploited. The exam tell: "detect malicious/unusual activity" → GuardDuty; "scan for software vulnerabilities" → Inspector.

### Protecting Applications: WAF, Shield, and Firewall Manager

Three services protect applications from external attacks. **AWS WAF (Web Application Firewall)** filters malicious web traffic — blocking common exploits like SQL injection and cross-site scripting, and unwanted requests — at the application layer. **AWS Shield** protects against **DDoS (distributed denial-of-service)** attacks; Shield Standard is automatic and free, while Shield Advanced adds enhanced protection and support. **AWS Firewall Manager** centrally manages firewall rules (WAF, Shield, and more) across multiple accounts and resources from one place. Tells: web exploits → WAF; DDoS → Shield; central firewall management across accounts → Firewall Manager.

### Centralizing Findings and Protecting Data

**AWS Security Hub** aggregates and centralizes security findings from GuardDuty, Inspector, and other services into a single dashboard, giving you one place to see your security posture and run automated compliance checks against best-practice standards. **Amazon Macie** uses machine learning to discover and classify **sensitive data** (such as personally identifiable information) stored in Amazon S3, so you know where sensitive data is and can protect it. Tells: "single view of all security findings" → Security Hub; "find sensitive data / PII in S3" → Macie.

### Encryption: In Transit and At Rest

A core exam concept is the two states in which data is encrypted. **Encryption at rest** protects stored data — data sitting in S3, EBS volumes, RDS databases — typically using **AWS Key Management Service (KMS)** to manage the encryption keys. **Encryption in transit** protects data moving across networks — between a user and a service, or between services — typically using **TLS/SSL**. A common best practice (and a Well-Architected security principle) is to encrypt data both at rest and in transit. The exam expects you to recognize these two states and that AWS provides services (KMS, ACM for certificates) to implement them.

### Logging and Auditing for Governance

Security and compliance depend on knowing what happened. The exam names several services: **AWS CloudTrail** records **API activity** — who did what, when, and from where — providing an audit trail of every action in your account. **AWS Config** records and evaluates **resource configurations** over time and checks them against rules for compliance. **Amazon CloudWatch** provides **monitoring** — metrics, logs, alarms, and dashboards for operational and security visibility. **AWS Audit Manager** automates collecting evidence to demonstrate compliance with frameworks. Tells: who-did-what audit trail → CloudTrail; resource configuration compliance → Config; monitoring/metrics/alarms → CloudWatch; audit evidence → Audit Manager.

### Trusted Advisor

**AWS Trusted Advisor** inspects your AWS environment and recommends improvements across several categories — including **security** (e.g., flagging open security groups, missing MFA on the root account, or public S3 buckets), as well as cost optimization, performance, reliability (service limits), and operational excellence. For security, it's a quick way to identify common misconfigurations against best practices. Tell: "check my environment against best practices / find security misconfigurations" → Trusted Advisor.

### Where to Find AWS Security and Compliance Information

The exam expects you to know *where* AWS publishes security and compliance resources. **AWS Artifact** provides on-demand access to AWS's **compliance reports and certifications** (such as SOC and ISO reports) — your source for proving the platform's compliance posture. Beyond Artifact, AWS publishes guidance through the **AWS Security Center**, the **AWS Security Blog**, and the **AWS Knowledge Center**, and third-party security products are available in the **AWS Marketplace**. The recognition point: compliance documents/reports → AWS Artifact; security best-practice guidance and documentation → Security Center/Blog/Knowledge Center.

---

## Configuration Reference

Security services by purpose:

```text
Need                                      Service
----------------------------------------- -----------------------
Detect malicious / unusual activity        Amazon GuardDuty
Scan workloads for vulnerabilities         Amazon Inspector
Block web exploits (SQLi, XSS)             AWS WAF
Protect against DDoS                       AWS Shield
Manage firewall rules across accounts      AWS Firewall Manager
Centralize all security findings           AWS Security Hub
Discover sensitive data (PII) in S3        Amazon Macie
Check environment vs. best practices       AWS Trusted Advisor
```

Encryption and auditing:

```text
Encryption at rest    stored data (S3, EBS, RDS) — keys via AWS KMS
Encryption in transit data on the network — TLS/SSL (certs via ACM)
CloudTrail            API activity audit log (who did what, when)
AWS Config            resource configuration compliance over time
Amazon CloudWatch     monitoring: metrics, logs, alarms, dashboards
AWS Audit Manager     automate compliance evidence collection
```

Where to find security/compliance info:

```text
AWS Artifact                compliance reports & certifications (SOC, ISO)
AWS Security Center/Blog     security guidance and best practices
AWS Knowledge Center         documentation and how-to answers
AWS Marketplace              third-party security products
```

---

## How to Decide

- **Detect threats / unusual activity?** → GuardDuty. **Find software vulnerabilities?** → Inspector.
- **Block web attacks?** → WAF. **Stop DDoS?** → Shield. **Manage firewalls across accounts?** → Firewall Manager.
- **One view of all findings?** → Security Hub. **Find PII in S3?** → Macie.
- **Audit who did what?** → CloudTrail. **Track config compliance?** → Config. **Monitor metrics/alarms?** → CloudWatch.
- **Find common misconfigurations?** → Trusted Advisor. **Get AWS compliance reports?** → AWS Artifact.

---

## How This Connects

This lesson extends the IAM and shared-responsibility lessons (the customer's security responsibilities) into the broader security catalog, and it overlaps Domain 3 (CloudWatch monitoring) and Domain 4 (Trusted Advisor's cost and support roles). The encryption concepts connect to the Well-Architected security pillar, and the logging/auditing services (CloudTrail, Config, Audit Manager) reappear in governance and compliance discussions.

---

## Exam Traps

- **Confusing GuardDuty and Inspector.** GuardDuty *detects* active threats from activity; Inspector *scans* for vulnerabilities/exposure.
- **Confusing WAF and Shield.** WAF blocks web-layer exploits (SQLi/XSS); Shield defends against DDoS.
- **Confusing CloudTrail and Config.** CloudTrail logs *who did what* (API activity); Config tracks *resource configuration* compliance.
- **Confusing Artifact with a security tool.** Artifact provides AWS's *compliance reports/certifications*; it doesn't secure resources.
- **Forgetting both encryption states.** Best practice encrypts data at rest *and* in transit.

---

## Summary

Beyond IAM, AWS provides a layered catalog of security services the exam expects you to recognize by purpose: GuardDuty detects threats, Inspector scans for vulnerabilities, WAF blocks web exploits, Shield defends against DDoS, Firewall Manager centralizes firewall rules, Security Hub aggregates findings, and Macie discovers sensitive data. Encryption protects data at rest (via KMS) and in transit (via TLS), and logging/auditing services — CloudTrail (API activity), Config (resource compliance), CloudWatch (monitoring), and Audit Manager (evidence) — support governance. Trusted Advisor flags best-practice and security issues, and AWS Artifact is where you obtain AWS's compliance reports. Match each security need to the right service, and remember where AWS publishes compliance and security information.

---

## Examples

**Example 1 — GuardDuty.** A team wants AWS to automatically flag compromised instances and unusual API calls → **Amazon GuardDuty**.

**Example 2 — WAF vs. Shield.** A public website must block SQL-injection attempts (**WAF**) and absorb a volumetric DDoS attack (**AWS Shield**).

**Example 3 — Macie.** A company needs to find where customer PII is stored across its S3 buckets → **Amazon Macie**.

**Example 4 — Artifact.** An auditor requests AWS's SOC 2 report; the team downloads it from **AWS Artifact**.

---

## Think About It

A company says it wants to "improve security" and lists four needs: detect malicious activity, find unpatched vulnerabilities, block web attacks, and prove compliance to an auditor. Match each need to an AWS service, and explain why no single service covers all four — what does that reveal about how cloud security is layered?

---

## Quick Check

1. What is the difference between Amazon GuardDuty and Amazon Inspector?
2. Which service blocks web exploits, and which defends against DDoS?
3. What are the two states of data encryption, and which AWS service manages keys for encryption at rest?
4. Where do you obtain AWS's compliance reports and certifications?

*Answers: (1) GuardDuty detects malicious or unusual activity (threat detection); Inspector scans workloads for software vulnerabilities and exposure (vulnerability management); (2) AWS WAF blocks web exploits like SQL injection/XSS; AWS Shield defends against DDoS; (3) at rest and in transit — AWS KMS manages keys for encryption at rest; (4) AWS Artifact.*

---

## What's Next

Next: **Analytics Services Overview** — the AWS analytics and AI/ML services (Athena, Kinesis, Glue, QuickSight, Kendra, SageMaker) and the tasks they accomplish.
