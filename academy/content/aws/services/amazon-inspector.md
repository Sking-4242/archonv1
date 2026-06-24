---
title: "Amazon Inspector"
type: content
estimated_minutes: 16
cert_tags: ["SAA-C03", "SOA-C03", "SCS-C03"]
---

# Amazon Inspector

## Overview

Amazon Inspector is an automated **vulnerability management** service that continuously scans your AWS workloads — EC2 instances, container images, and Lambda functions — for software vulnerabilities and unintended network exposure. Where GuardDuty detects active threats and Macie finds sensitive data, Inspector answers a different question: *what known weaknesses exist in my workloads that an attacker could exploit?* This *service reference* lesson covers what Inspector scans, how findings are produced and prioritized, multi-account operation, and what each certification expects.

Inspector matters because most successful attacks exploit **known, unpatched vulnerabilities (CVEs)** or misconfigured exposure, and at scale you cannot track these by hand. Inspector automates discovery: it continuously inventories your compute, correlates installed software against vulnerability databases, evaluates network reachability, and produces prioritized findings so teams fix the riskiest issues first. The key mental model is **continuous, automated assessment** — Inspector re-scans automatically when software changes or new CVEs are published, rather than running point-in-time audits. The crucial exam distinction is **Inspector = vulnerabilities/CVEs and exposure; GuardDuty = active threats; Macie = sensitive data; Config = configuration compliance.**

---

## How It Works

Once enabled (ideally org-wide via a delegated administrator), Inspector continuously assesses:

- **Amazon EC2** — using the **SSM Agent** to inventory installed packages and matching them against CVE data; it also evaluates **network reachability** (whether a path from the internet reaches a port) to flag unintended exposure. No separate scan scheduling is required — it's event-driven on inventory changes and new CVEs.
- **Container images in Amazon ECR** — scanning images on push (and continuously re-scanning for newly disclosed CVEs) for OS and programming-language package vulnerabilities.
- **AWS Lambda functions** — scanning function code dependencies and, optionally, the code itself for vulnerabilities.

Each **finding** describes the vulnerability, affected resource, and remediation, and carries an Inspector **risk score** that contextualizes the CVE's severity with factors like network reachability and exploitability — so a remotely reachable, exploitable vulnerability ranks above a theoretical one. Findings flow to Security Hub and EventBridge.

---

## Key Features

- **Continuous, automatic scanning** triggered by software changes and newly published CVEs — not scheduled point-in-time scans.
- **Coverage across EC2, ECR container images, and Lambda** in one service.
- **Contextual risk scoring** that factors in network reachability and exploitability, prioritizing what matters.
- **Network reachability analysis** to flag unintended internet exposure of ports/services.
- **Multi-account management** through AWS Organizations with a delegated administrator and automatic enablement for new accounts.
- **SBOM export** (software bill of materials) and suppression rules to manage findings at scale.

---

## Configuration Reference

- **Enable Inspector** (org-wide via a delegated administrator account) and turn on the scan types you need (EC2, ECR, Lambda).
- **Ensure the SSM Agent and instance role** are present on EC2 so package inventory works (Inspector relies on Systems Manager for EC2 scanning).
- **Use suppression rules** to filter accepted-risk or non-applicable findings, and **export SBOMs** for supply-chain visibility.
- **Route findings** to Security Hub and EventBridge for centralized posture and automated ticketing/remediation.

---

## Operations and Troubleshooting

- **EC2 instance not being scanned.** The usual cause is a missing/unhealthy **SSM Agent** or instance role — Inspector depends on Systems Manager to inventory packages.
- **Too many findings.** Prioritize by the Inspector **risk score** (reachable + exploitable first), and use **suppression rules** for accepted risk.
- **Confusing services.** If the requirement is *threat detection* use GuardDuty, *sensitive-data discovery* use Macie, *config compliance* use Config — Inspector is specifically **vulnerabilities and exposure**.
- **Container coverage gaps.** Ensure ECR enhanced scanning is enabled for the repositories you care about.

---

## Integrations

Inspector sends findings to **AWS Security Hub** (aggregation and posture) and **EventBridge** (automated ticketing/remediation), relies on **AWS Systems Manager** (SSM Agent) for EC2 package inventory, scans **Amazon ECR** images and **AWS Lambda** functions, and is managed org-wide through **AWS Organizations**. It complements **GuardDuty** (threats), **Macie** (sensitive data), and **Config** (compliance) in the detection ecosystem, and pairs with **ECS/EKS** workflows by scanning the container images they run.

---

## Pricing and Cost Considerations

Inspector pricing is **usage-based** per scanned resource: per **EC2 instance** scanned, per **container image** scan (initial and re-scans), and per **Lambda function** scanned, typically billed monthly with automatic re-scans included. The cost scales with fleet size and image churn, so the levers are enabling only the scan types you need, scoping ECR scanning to relevant repositories, and using suppression to reduce noise (which doesn't change cost but improves focus). A free trial is available. Exact prices vary by Region and resource type.

---

## Exam Relevance

**SAA-C03:** Know Inspector as automated vulnerability scanning for EC2, ECR images, and Lambda, and where it fits in a secure architecture. Design depth.

**SOA-C03:** Operate vulnerability management — continuous scanning, the SSM dependency for EC2, risk-based prioritization, and routing findings for remediation. Operations depth.

**SCS-C03:** Deepest. Know Inspector for CVE/vulnerability detection across compute, network-reachability analysis, contextual risk scoring, org-wide delegated administration, and its distinction from GuardDuty/Macie/Config. Security depth (it's the answer for "find and prioritize vulnerabilities").

---

## Summary

Amazon Inspector is automated, continuous vulnerability management that scans EC2 instances (via the SSM Agent), ECR container images (on push and on new CVEs), and Lambda functions for known vulnerabilities and unintended network exposure, producing findings with a contextual risk score that prioritizes reachable, exploitable issues. It re-scans automatically as software changes or CVEs are disclosed, is managed org-wide via a delegated administrator, and routes findings to Security Hub and EventBridge. The defining idea is continuous, prioritized vulnerability assessment, and the recurring exam point is distinguishing Inspector (vulnerabilities/exposure) from GuardDuty (threats), Macie (sensitive data), and Config (compliance).

---

## Quick Check

1. What does Inspector scan, and what question does it answer compared with GuardDuty and Macie?
2. Why does Inspector re-scan automatically rather than on a fixed schedule?
3. What does Inspector rely on to inventory packages on EC2 instances?
4. How does Inspector's risk score help you prioritize beyond raw CVE severity?
5. Which service do you choose for vulnerabilities versus active threats versus sensitive data versus configuration compliance?

---

## What's Next

Pair this with **Amazon GuardDuty** and **AWS Security Hub** (detection ecosystem), **AWS Systems Manager** (the EC2 scanning dependency), and **Amazon ECS/EKS** (the container images it scans).
