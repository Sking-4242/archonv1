---
title: "Evaluating Compliance of AWS Resources"
type: content
estimated_minutes: 16
cert_tags: ["SCS-C03"]
---

# Evaluating Compliance of AWS Resources

## Overview

Preventive guardrails stop bad things; **compliance evaluation** proves that what's actually deployed conforms to policy and detects and remediates when it doesn't. The Security Specialty exam's Task 6.3 covers evaluating the compliance of AWS resources: creating rules to **detect and remediate** non-compliant resources and send notifications, using AWS audit services to **collect and organize evidence**, and using AWS services to **evaluate architecture against best practices**. This is the detective-and-audit complement to the preventive controls — continuous assessment, automated remediation, and audit-ready evidence.

The principle is **continuous compliance, not point-in-time audits**. Cloud environments change constantly; a one-time review is stale within hours. The specialty approach is to continuously evaluate every resource against rules (AWS Config), aggregate and score posture across the organization (Security Hub), automatically remediate or notify on drift, and continuously collect evidence so an audit is a matter of producing reports rather than scrambling. AWS provides a layered toolkit — Config for resource-configuration compliance, Security Hub for posture and standards, Audit Manager for evidence collection mapped to frameworks, Artifact for AWS's own compliance reports, and the Well-Architected Tool for architectural review. The candidate must match each compliance need to the right service and design automated detection-and-remediation, because the exam tests "how do you continuously prove and maintain compliance," not "how do you pass one audit."

This lesson covers Config rules and remediation, Security Hub standards, Audit Manager, Artifact, and the Well-Architected Tool. After it you will be able to design continuous compliance evaluation with automated remediation and audit evidence.

## Core Concepts

### AWS Config — Resource Configuration Compliance

**AWS Config** continuously records the configuration of your AWS resources and evaluates them against **Config rules** — AWS-managed or custom rules that check whether a resource is compliant (e.g., "S3 buckets must have encryption enabled," "security groups must not allow unrestricted SSH," "EBS volumes must be encrypted"). Config tracks configuration *history* and *changes* over time, so you can see how a resource looked at any point and what changed. **Conformance packs** bundle many Config rules (and remediation actions) into a deployable compliance template you can apply across the organization. Config is the backbone of continuous resource-configuration compliance, and its rules can trigger **automatic remediation** (below). The exam pairs "continuously evaluate whether resources are configured to policy and track changes" with AWS Config and conformance packs.

### Automated Remediation and Notification

Detecting non-compliance is only useful if you act on it. Config rules integrate with **Systems Manager Automation documents** to **automatically remediate** non-compliant resources — for example, automatically enabling S3 Block Public Access on a bucket that became public, removing an over-permissive security group rule, or enabling encryption. Config and Security Hub findings also flow to **EventBridge → SNS/Lambda** for **notification** and custom remediation. The design pattern: detect drift (Config) → notify responders (SNS) and/or auto-remediate (SSM Automation/Lambda) → record the action. The exam expects you to design closed-loop compliance: a rule detects the violation, a remediation action fixes it (or a notification alerts a human), and the result is logged.

### AWS Security Hub — Standards and Posture

**AWS Security Hub** complements Config by running **security standards** — automated best-practice checks like the **AWS Foundational Security Best Practices**, **CIS AWS Foundations Benchmark**, and **PCI DSS / NIST** mappings — generating pass/fail **control** findings and an overall security score. It aggregates findings from Config, GuardDuty, Inspector, Macie, and partners into one place (from Domain 1), supports **central configuration** to enable standards across the organization, and integrates with EventBridge for automation. Where Config evaluates individual resource configurations against your rules, Security Hub evaluates your environment against curated *standards* and gives a posture score. The exam pairs "continuously check the environment against security best-practice standards and get a compliance score" with Security Hub standards.

### AWS Audit Manager — Evidence for Frameworks

**AWS Audit Manager** automates **collecting evidence** and mapping it to **compliance frameworks** (SOC 2, PCI DSS, HIPAA, GDPR, and custom frameworks). It continuously gathers evidence from Config, CloudTrail, Security Hub, and other sources, organizes it by control, and produces audit-ready assessment reports — turning audit preparation from a manual scramble into an ongoing, automated process. The distinction the exam draws: Audit Manager **collects and organizes *your* evidence to demonstrate compliance with a framework**, whereas Config/Security Hub *evaluate* compliance and Artifact provides *AWS's* compliance documents. The exam pairs "collect and organize evidence to demonstrate compliance with a framework / prepare for an audit" with Audit Manager.

### AWS Artifact — AWS's Compliance Reports

**AWS Artifact** provides on-demand access to **AWS's own compliance reports and certifications** — SOC 1/2/3, ISO, PCI, FedRAMP, and more — and AWS agreements (like BAAs). This is how you demonstrate the *platform's* compliance posture to your auditors (the AWS side of the shared responsibility model). The exam's clean distinction: **Artifact = AWS's compliance documents**; **Audit Manager = your evidence**; **Config/Security Hub = your resources' compliance state**. Don't confuse providing AWS's certifications (Artifact) with assessing your own resources.

### AWS Well-Architected Tool

The **AWS Well-Architected Tool** lets you review a workload against the **Well-Architected Framework**, including the **Security pillar**, answering a structured set of questions to surface risks and improvement opportunities. It's the service for **evaluating an architecture against AWS security best practices** at the design/workload level (as opposed to per-resource configuration checks in Config). The exam pairs "evaluate a workload/architecture against AWS security best practices" with the Well-Architected Tool, distinct from Config's resource-level rules and Security Hub's automated standards.

### Aggregating Compliance Across the Organization

Compliance evaluation must span every account, not just one, and the exam expects org-scale designs. **AWS Config** supports an **aggregator** that collects compliance and configuration data from all accounts and Regions into a central view (typically in the security/audit account), so a single dashboard shows organization-wide compliance status and which resources are non-compliant where. **Conformance packs** deploy bundled rules and remediations across the organization via the delegated administrator, and **Security Hub central configuration** enables standards and policies fleet-wide. The pattern mirrors the Detection domain's aggregation: enable evaluation everywhere, roll findings up to one place, and drive remediation centrally. This matters because a per-account compliance check that nobody aggregates leaves blind spots — the specialty answer aggregates Config and Security Hub findings organization-wide through the delegated administrator, producing a single, continuous, authoritative view of compliance that auditors and security teams can act on. Aggregation also feeds Audit Manager's evidence collection, closing the loop from continuous evaluation to audit-ready reporting across the whole organization.

### Choosing the Right Compliance Tool

The exam tests matching the need to the service: continuous **resource-configuration** compliance and remediation → **Config** (+ conformance packs + SSM remediation); **best-practice standards and a posture score** → **Security Hub**; **evidence collection mapped to a framework for an audit** → **Audit Manager**; **AWS's own compliance certifications** → **Artifact**; **architectural review against best practices** → **Well-Architected Tool**. Knowing these boundaries — especially Config vs. Security Hub vs. Audit Manager vs. Artifact — is the core exam skill for this task.

## Configuration Reference

Compliance tools → role:

```text
AWS Config              continuous resource-config compliance + history; rules; conformance packs
  + SSM Automation       auto-remediate non-compliant resources
Security Hub            best-practice STANDARDS (FSBP/CIS/PCI) + posture score + finding aggregation
AWS Audit Manager       collect/organize YOUR evidence mapped to frameworks (audit-ready)
AWS Artifact            AWS's OWN compliance reports/certifications (SOC, ISO, PCI, agreements)
AWS Well-Architected Tool  review a workload/architecture vs. best practices (Security pillar)
```

Closed-loop compliance:

```text
Config rule detects drift → EventBridge → SNS (notify) and/or SSM Automation/Lambda (remediate) → logged
Conformance packs deploy bundled rules + remediation across the org
Security Hub central config enables standards org-wide; findings drive automation
```

The four "compliance" distinctions:

```text
Config/Security Hub   evaluate YOUR resources/environment
Audit Manager         organize YOUR evidence for a framework
Artifact              provide AWS's compliance documents
Well-Architected Tool review YOUR architecture vs. best practices
```

## How to Decide

- **Continuously check resources are configured to policy and auto-fix drift?** → AWS Config rules + conformance packs + SSM remediation.
- **Check the environment against security standards and get a score?** → Security Hub standards.
- **Collect evidence mapped to a framework for an audit?** → AWS Audit Manager.
- **Show auditors AWS's own certifications?** → AWS Artifact.
- **Review a workload's architecture against best practices?** → Well-Architected Tool.
- **Notify and remediate on non-compliance?** → Config/Security Hub → EventBridge → SNS/SSM Automation/Lambda.

## How This Connects

This lesson closes the governance domain and the curriculum: Config and Security Hub are the detective layer over the preventive guardrails (SCPs/RCPs) and consistent deployment (IaC) from the prior lessons; their findings feed the Detection domain's aggregation; automated remediation reuses the Incident Response automation building blocks; and evidence collection (Audit Manager) plus AWS's certifications (Artifact) complete the shared-responsibility compliance story from the foundations.

## Exam Traps

- **Confusing Config and Security Hub.** Config evaluates individual resource configurations against your rules; Security Hub runs curated best-practice standards and gives a posture score.
- **Confusing Audit Manager and Artifact.** Audit Manager collects *your* evidence for a framework; Artifact provides *AWS's* compliance reports/certifications.
- **Detecting without remediating.** Pair Config rules with SSM Automation remediation and/or notifications — detection alone doesn't fix drift.
- **Using Config for architectural review.** Per-resource rules are Config; reviewing a workload's design against best practices is the Well-Architected Tool.
- **Point-in-time thinking.** Compliance is continuous — Config records history and conformance packs/Security Hub run constantly.
- **Forgetting org-scale.** Use conformance packs and Security Hub central configuration to apply compliance across all accounts.

## Summary

Evaluating compliance is continuous and automated. AWS Config continuously records resource configurations and evaluates them against rules (bundled as conformance packs), tracks change history, and triggers automatic remediation via Systems Manager Automation or notifications via EventBridge/SNS. Security Hub runs curated best-practice standards (Foundational Security Best Practices, CIS, PCI) across the organization and produces a posture score while aggregating findings. AWS Audit Manager continuously collects and organizes *your* evidence mapped to compliance frameworks for audit-ready reports, while AWS Artifact provides *AWS's* own compliance certifications for the platform side of shared responsibility. The Well-Architected Tool reviews a workload's architecture against best practices, including the Security pillar. Match each need to the right tool — Config/Security Hub evaluate your resources, Audit Manager organizes your evidence, Artifact provides AWS's documents, Well-Architected reviews your architecture — and design closed-loop detection-and-remediation so non-compliance is found and fixed continuously.

## Examples

**Example 1 — Auto-remediate public buckets.** Any S3 bucket that becomes public must be fixed automatically → an **AWS Config** rule with an **SSM Automation** remediation that re-enables Block Public Access, plus an SNS notification.

**Example 2 — Posture score.** Leadership wants a continuous security score against CIS and Foundational Security Best Practices → **Security Hub** standards across the org.

**Example 3 — Audit prep.** An upcoming SOC 2 audit requires organized evidence → **AWS Audit Manager** continuously collecting evidence mapped to the framework.

**Example 4 — Platform certifications.** The auditor asks for AWS's ISO and PCI attestations → download them from **AWS Artifact**.

## Think About It

An auditor makes three requests: prove your S3 buckets have stayed encrypted all year, show a continuous score of your environment against CIS benchmarks, and provide organized evidence mapped to SOC 2 — plus they want AWS's own PCI attestation. Name the AWS service for each request and explain why swapping any two of them would fail to satisfy the auditor.

## Quick Check

1. What does AWS Config evaluate, and how does it remediate non-compliance?
2. How does Security Hub differ from Config in evaluating compliance?
3. What is the difference between AWS Audit Manager and AWS Artifact?
4. Which service reviews a workload's architecture against security best practices?

*Answers: (1) Config continuously records resource configurations and evaluates them against rules (and conformance packs), tracking change history; it remediates by triggering Systems Manager Automation documents (and/or notifying via EventBridge/SNS); (2) Config evaluates individual resource configurations against your defined rules, while Security Hub runs curated best-practice standards (FSBP, CIS, PCI) and produces an overall posture score, aggregating findings across services; (3) Audit Manager collects and organizes *your* evidence mapped to a compliance framework to demonstrate *your* compliance, while Artifact provides *AWS's* own compliance reports and certifications for the platform; (4) the AWS Well-Architected Tool (Security pillar).*

## What's Next

You've completed Module 6 (Security Foundations and Governance). Final lesson: **SCS-C03 Exam Strategy and Question Patterns** — applying everything under exam conditions.
