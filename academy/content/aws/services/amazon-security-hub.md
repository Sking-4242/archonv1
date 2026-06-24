---
title: "AWS Security Hub"
type: content
estimated_minutes: 18
cert_tags: ["SCS-C03", "SOA-C03", "SAA-C03", "CLF-C02"]
---

# AWS Security Hub

## Overview

AWS Security Hub is a cloud security posture management (CSPM) service that gives you a single place to see and manage your security state across AWS accounts and Regions. It does two distinct jobs that are easy to confuse: it **aggregates findings** from many security services into one normalized stream, and it **runs automated security checks** against industry and AWS best-practice standards, producing a security score. This is a *service reference* lesson — it explains both roles, how Security Hub normalizes data, how you run it across an organization, and what each certification expects.

The problem Security Hub solves is fragmentation. A real AWS environment generates security signals from GuardDuty (threats), Inspector (vulnerabilities), Macie (sensitive data), IAM Access Analyzer (over-permissive access), Firewall Manager, and often third-party tools — each with its own console and its own data format. Without aggregation, a security team has to check a dozen places and mentally translate between formats. Security Hub collects all of these into one pane, in one schema, and adds its own continuous compliance checks on top. The result is a single "how am I doing?" view and a single stream to alert and automate against.

The key to understanding Security Hub is the distinction between its **aggregation** role (a pass-through and normalizer for other services' findings) and its **standards** role (an active checker that generates its own findings). Both produce findings in the same format, which is what makes the single pane possible.

---

## How It Works

At the center of Security Hub is the **AWS Security Finding Format (ASFF)** — a standardized JSON schema for security findings. Every finding, whether it originated in GuardDuty, Inspector, a partner product, or a Security Hub control check, is expressed in ASFF. This normalization is the technical foundation of everything else: because all findings share one schema, you can search, filter, group, alert, and automate across all of them uniformly, regardless of which tool produced them.

Security Hub's two roles produce ASFF findings from two directions:

1. **Finding aggregation.** When you enable an integrated service (GuardDuty, Inspector, Macie, IAM Access Analyzer, Firewall Manager, Systems Manager Patch Manager, and many partner products), its findings flow automatically into Security Hub in ASFF. Security Hub does not re-detect anything here — it ingests and normalizes.

2. **Security standards and controls.** Security Hub continuously evaluates your resource configurations against **controls** grouped into **standards**. Each control is a specific check (for example, "S3 buckets should block public access" or "root account should have MFA"). Controls return *pass* or *fail*, and Security Hub rolls them up into a **security score** per standard so you can track posture over time.

The supported standards include the **AWS Foundational Security Best Practices (FSBP)**, the **CIS AWS Foundations Benchmark**, **PCI DSS**, and **NIST SP 800-53**. You enable the standards relevant to your compliance obligations, and Security Hub handles the continuous evaluation. Many controls are backed by AWS Config rules, so Config is a prerequisite for control evaluation.

---

## Key Features

- **Consolidated controls and cross-standard mapping.** A single underlying check often satisfies multiple standards. Security Hub consolidates these so you fix an issue once rather than seeing the "same" failure many times.
- **Security score.** A percentage per standard (and overall) that summarizes how many enabled controls are passing — the headline metric for posture trending.
- **Insights.** Saved, grouped views of findings (for example "resources with the most failed controls") that help you triage rather than scroll through raw findings.
- **Automation rules.** Rules that automatically update incoming findings — changing severity, suppressing known-acceptable findings, or adding notes — based on criteria, reducing manual triage.
- **Custom actions.** You can define a custom action that, when applied to a finding, emits an EventBridge event to trigger a downstream workflow (ticket creation, remediation, escalation).
- **Cross-Region aggregation.** Designate an aggregation Region so findings from multiple Regions roll up into one view, avoiding per-Region console hopping.

---

## Configuration Reference

- **Enablement** is per account, per Region. To get an organization-wide view you combine cross-Region aggregation with the Organizations delegated-administrator model (below).
- **Standards** are enabled or disabled individually; controls within a standard can be disabled where they do not apply, and some controls expose **parameters** you can tune (for example a maximum key-age threshold).
- **Central configuration.** Through AWS Organizations, the delegated administrator can define **configuration policies** that enable Security Hub, choose standards, and set control states across many accounts and Regions at once — so you do not configure each account by hand.
- **Config dependency.** Many controls rely on AWS Config recording the relevant resource types. If Config is not recording, those controls cannot evaluate.

---

## Operations and Troubleshooting

- **Alerting and response.** Security Hub publishes findings and custom-action events to **EventBridge**. The standard pattern is an EventBridge rule matching high-severity findings (from any source, thanks to ASFF) that notifies via SNS or triggers a Lambda remediation. Because aggregation already happened, one rule can cover GuardDuty, Inspector, and Macie findings together.
- **Noise control.** Use **automation rules** to suppress or down-rank findings you have accepted, and disable controls that do not apply to your environment, rather than ignoring the dashboard.
- **A control shows "no data" or never evaluates.** The usual cause is that AWS Config is not recording the resource type the control depends on, or the standard was only just enabled and evaluation has not completed.
- **Findings from a service are missing.** Confirm both that the source service (for example GuardDuty) is enabled in that Region and that its Security Hub integration is turned on.

---

## Integrations

Security Hub sits at the center of AWS security operations. **Upstream**, it ingests from GuardDuty, Inspector, Macie, IAM Access Analyzer, Firewall Manager, Patch Manager, Health, and partner products. **Downstream**, it emits to EventBridge for alerting and automated remediation, and its normalized findings can feed **Amazon Security Lake** (OCSF) or a SIEM. It depends on **AWS Config** for control evaluation and on **AWS Organizations** for central, multi-account configuration. A clean way to remember the ecosystem: GuardDuty/Inspector/Macie *detect*, Security Hub *aggregates and scores*, Detective *investigates*, and EventBridge *responds*.

A subtle but exam-relevant distinction: **Security Hub aggregates findings; Amazon Security Lake centralizes and normalizes raw log data**. Security Hub is about *findings and posture*; Security Lake is about *logs and analytics*. They are complementary, not interchangeable.

---

## Pricing and Cost Considerations

Security Hub pricing has two usage-based components: a charge per **security check** (each control evaluation Security Hub performs) and a charge per **finding ingested** above a generous free monthly allowance (findings from AWS integrated services are typically free to ingest; the metered ingestion mainly concerns very high volumes and certain sources). There is a **30-day free trial**, and the console shows usage so you can estimate cost. In practice the main cost lever is how many standards and controls you enable across how many accounts and Regions, since that drives the number of checks. As always, exact per-unit prices vary by Region and change over time, so reason about cost as "proportional to controls enabled × accounts × Regions, plus finding volume."

---

## Exam Relevance

**CLF-C02:** Recognize Security Hub as the service that provides a comprehensive, centralized view of security alerts and security posture across accounts, aggregating findings and running automated best-practice checks. Foundational: what it is and that it is the "single pane of glass."

**SAA-C03:** Know that Security Hub aggregates findings from GuardDuty, Inspector, and Macie in a normalized format and integrates with EventBridge, and that it runs standards like FSBP and CIS. Architecture-level: how it centralizes security visibility.

**SOA-C03:** Operate it — enable standards, interpret the security score, route findings to automated response via EventBridge, and aggregate across Regions and accounts. Operations depth.

**SCS-C03:** Deepest. Know ASFF as the normalization mechanism; the difference between aggregation and standards roles; the dependency on AWS Config; central configuration via the delegated administrator; automation rules and custom actions; and the Security Hub vs. Security Lake distinction. Expect scenarios about centralizing findings across an organization and automating response from a single normalized stream.

---

## Summary

AWS Security Hub is a CSPM service that both aggregates security findings from many AWS and third-party services into the normalized AWS Security Finding Format and continuously evaluates your environment against standards such as FSBP, CIS, PCI DSS, and NIST 800-53, producing a security score. It consolidates duplicate controls, supports insights, automation rules, and custom actions, and aggregates across Regions and (via the Organizations delegated administrator and central configuration) across accounts. It depends on AWS Config for control evaluation and emits to EventBridge for response. Remember the two big distinctions: aggregation versus standards within Security Hub, and Security Hub (findings/posture) versus Security Lake (raw normalized logs).

---

## Quick Check

1. What are the two distinct jobs Security Hub performs, and which one generates its own findings versus ingesting them?
2. What is ASFF and why does it matter for aggregation and automation?
3. Which AWS service must be recording configuration data for many Security Hub controls to evaluate?
4. How do you enable Security Hub with a consistent set of standards across every account in an organization without configuring each account manually?
5. A team confuses Security Hub with Security Lake. In one sentence each, how do they differ?

---

## What's Next

Pair this with the **Amazon GuardDuty** lesson (a primary upstream source of findings) and **AWS Config** (the configuration recorder many controls depend on). In the SCS-C03 path, this supports the Detection domain and the compliance-evaluation lesson in Domain 6; in SOA-C03 it supports operational monitoring and automated remediation.
