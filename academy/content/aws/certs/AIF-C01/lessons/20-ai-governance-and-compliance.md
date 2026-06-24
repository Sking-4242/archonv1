---
title: "AI Governance and Compliance"
type: content
estimated_minutes: 13
cert_tags: ["AIF-C01"]
---

# AI Governance and Compliance

## Overview

Securing an AI system protects it from threats; **governing** it ensures the organization can prove the system is well-managed, compliant, and accountable over its whole life. The AI Practitioner exam (Domain 5, Task 5.2) asks you to recognize governance and compliance regulations for AI systems: identify the AWS services that assist with governance and compliance, describe data-governance strategies, and describe the processes for following governance protocols — including structured frameworks like the **Generative AI Security Scoping Matrix**. Governance is the organizational discipline that turns good intentions into auditable practice.

Governance matters because AI operates in an increasingly regulated environment, and because organizations must demonstrate — to auditors, regulators, customers, and themselves — that their AI is used responsibly and lawfully. That means controlling and tracking *what configurations are allowed*, *who did what and when*, *where data lives and how long it's kept*, and *what review processes a model passes through before and after deployment*. AWS provides a set of services purpose-built for these questions — Config, CloudTrail, Audit Manager, Artifact, Inspector, Trusted Advisor — and the exam expects you to match each to its governance role. On top of the tooling sit frameworks and processes: policies, review cadences, training requirements, transparency standards, and scoping frameworks that help teams reason about risk in a structured way.

This lesson covers the AWS governance services, data-governance strategies, and the processes and frameworks that operationalize governance. After it you will be able to map a governance or compliance need to the right AWS service and describe how structured governance works.

---

## Core Concepts

### AWS Services for Governance and Compliance

The exam names specific services, each answering a governance question:

- **AWS Config** — records and evaluates the **configuration** of your AWS resources over time, and checks them against rules, so you can prove resources stay compliant with policy. Answers "are resources configured the way our rules require?"
- **AWS CloudTrail** — logs **API activity** across your account: who did what, when, and from where. The audit trail for actions, essential for accountability and investigation.
- **AWS Audit Manager** — continuously collects evidence and maps it to **compliance frameworks**, automating much of the work of preparing for audits. Answers "can we demonstrate compliance with a standard?"
- **AWS Artifact** — provides on-demand access to AWS **compliance reports and certifications** (e.g., SOC, ISO), so you can show the underlying platform's compliance posture.
- **Amazon Inspector** — automated **vulnerability** assessment for workloads, identifying security weaknesses to remediate.
- **AWS Trusted Advisor** — checks your environment against **best practices** (security, cost, performance, reliability) and recommends improvements.

The pattern to remember: Config = resource configuration compliance; CloudTrail = activity/audit logging; Audit Manager = audit evidence/frameworks; Artifact = AWS's compliance documents; Inspector = vulnerability scanning; Trusted Advisor = best-practice checks.

### Data-Governance Strategies

AI runs on data, so data governance is central. The exam highlights strategies including **data lifecycle** management (how data is created, used, archived, and deleted), **logging** (recording data access and use), **residency** (where data is physically stored, important for legal and regulatory requirements — and addressable via AWS Region choice), **monitoring and observation** (watching data use for anomalies and compliance), and **retention** (how long data is kept, balancing legal requirements against minimization). Strong data governance also covers lineage and cataloging (from the security lesson) so data's origin and transformations are known. The goal is that an organization always knows what data it has, where it is, who can access it, how long it's kept, and that all of this meets policy and law.

### Governance Processes and Protocols

Tools alone don't govern; **processes** do. The exam describes following governance protocols through **policies** (documented rules for how AI may be built and used), **review cadence and review strategies** (regular checkpoints — model reviews, risk assessments, approvals before and after deployment), **governance frameworks** (structured approaches to managing AI risk), **transparency standards** (commitments to disclose how AI is used and how decisions are made), and **team training requirements** (ensuring people understand responsible and compliant AI practices). Governance is ongoing and organizational: it defines who approves what, how often systems are reviewed, and how accountability is maintained throughout the AI lifecycle.

### The Generative AI Security Scoping Matrix

The exam specifically names the **Generative AI Security Scoping Matrix**, an AWS framework that helps organizations reason about the security and governance implications of different generative-AI usage patterns. It classifies GenAI deployments by *scope* — from simply consuming a public third-party application, to using a pre-trained model via API, to fine-tuning a model, to building and training your own — because each scope carries different data-exposure, control, and compliance considerations. The framework gives teams a structured way to ask "what are our responsibilities and risks given how we're using generative AI?" rather than treating all GenAI use the same. For the exam, recognize it as a **structured framework for scoping the governance and security of generative-AI use cases**.

### Putting Governance Into Practice

Effective AI governance combines all of the above: use the AWS services to gather evidence and enforce configuration (Config, CloudTrail, Audit Manager, Artifact, Inspector, Trusted Advisor); apply data-governance strategies for lifecycle, residency, retention, and monitoring; and run the organizational processes — policies, reviews, training, and frameworks like the scoping matrix — that hold it together. The result is AI an organization can trust and defend: compliant, accountable, auditable, and aligned with policy and regulation.

---

## Configuration Reference

AWS governance services → role:

```text
Service              Governance question it answers
-------------------- -------------------------------------------
AWS Config           are resources configured per our rules? (compliance state)
AWS CloudTrail       who did what, when? (API activity audit log)
AWS Audit Manager    can we evidence compliance with a framework?
AWS Artifact         where are AWS's compliance reports/certifications?
Amazon Inspector     what vulnerabilities exist in our workloads?
AWS Trusted Advisor  are we following AWS best practices?
```

Data-governance strategies:

```text
lifecycle · logging · residency (Region choice) ·
monitoring/observation · retention · lineage & cataloging
```

Governance processes:

```text
policies · review cadence & strategies · governance frameworks ·
transparency standards · team training requirements
Framework: Generative AI Security Scoping Matrix (scope GenAI use → risk/responsibility)
```

---

## How to Decide

- **Prove resources stay configured to policy?** → **AWS Config**.
- **Need an audit trail of who did what?** → **AWS CloudTrail**.
- **Preparing for a compliance audit / mapping to a framework?** → **AWS Audit Manager**.
- **Need AWS's own compliance certifications?** → **AWS Artifact**.
- **Scan for vulnerabilities?** → **Amazon Inspector**. **Check best practices?** → **Trusted Advisor**.
- **Data must stay in a country / be retained or deleted on schedule?** → data-governance strategy (residency via Region, retention/lifecycle policies).
- **Scoping the risk of a GenAI deployment?** → the **Generative AI Security Scoping Matrix**.

---

## How This Connects

Governance completes Domain 5 alongside the security lesson — security protects the system, governance proves it's well-managed. CloudTrail, Config, and Audit Manager reuse the shared monitoring/compliance services from the general curriculum, applied to AI. Data residency and retention build on the data-governance and lineage themes from the security lesson, and transparency standards connect to the explainability lesson (Domain 4). The scoping matrix ties together the customization approaches from Domain 3 (consuming vs. fine-tuning vs. building) with their differing governance responsibilities.

---

## Exam Traps

- **Confusing Config with CloudTrail.** Config tracks resource *configuration* and compliance state; CloudTrail logs *API activity* (who did what).
- **Confusing Audit Manager with Artifact.** Audit Manager collects *your* evidence for audits; Artifact provides *AWS's* compliance reports/certifications.
- **Treating governance as one-time.** It's ongoing: policies, regular reviews, training, and monitoring across the lifecycle.
- **Ignoring data residency/retention.** Where data lives and how long it's kept are core compliance concerns, addressable via Region choice and lifecycle/retention policies.
- **Overlooking the scoping matrix.** Different GenAI usage scopes carry different responsibilities; the framework structures that analysis.

---

## Summary

AI governance ensures an organization can prove its AI is compliant, accountable, and well-managed throughout its life. AWS provides the tooling: Config (resource configuration compliance), CloudTrail (API activity audit logs), Audit Manager (audit evidence and framework mapping), Artifact (AWS's compliance certifications), Inspector (vulnerability scanning), and Trusted Advisor (best-practice checks). Data-governance strategies cover lifecycle, logging, residency, monitoring, and retention, so the organization always knows what data it has and that it meets policy and law. And governance processes — policies, review cadences, training, transparency standards, and frameworks like the Generative AI Security Scoping Matrix — operationalize it. Match each AWS service to its governance question, and remember that governance is an ongoing organizational discipline, not a one-time checkbox.

---

## Examples

**Example 1 — Config for compliance.** A team must ensure AI infrastructure always uses encryption and approved settings; **AWS Config** rules continuously check and flag drift.

**Example 2 — CloudTrail for accountability.** After an incident, investigators use **CloudTrail** to see who invoked which model and changed which resources, and when.

**Example 3 — Audit Manager.** Preparing for an industry audit, the team uses **AWS Audit Manager** to collect evidence mapped to the relevant framework.

**Example 4 — Scoping matrix.** Before launching a GenAI feature, a company uses the **Generative AI Security Scoping Matrix** to determine its responsibilities given that it's fine-tuning a model on customer data (a higher-scope, higher-responsibility scenario than using a public app).

---

## Think About It

An auditor asks a company to (a) prove its AI resources have stayed configured to policy all year and (b) show exactly who accessed a training dataset and when. Which AWS service answers each request, and why would using the wrong one (swapping them) fail to satisfy the auditor?

---

## Quick Check

1. What is the difference between AWS Config and AWS CloudTrail?
2. Which service helps you prepare audit evidence mapped to a compliance framework, and which provides AWS's own compliance certifications?
3. Name three data-governance strategies.
4. What is the Generative AI Security Scoping Matrix used for?

*Answers: (1) AWS Config records and evaluates resource configuration and compliance state over time, while CloudTrail logs API activity — who did what, when; (2) AWS Audit Manager for collecting/mapping audit evidence; AWS Artifact for AWS's compliance reports and certifications; (3) any three of data lifecycle, logging, residency, monitoring/observation, retention, lineage/cataloging; (4) a structured framework for scoping the security and governance responsibilities and risks of different generative-AI usage patterns (from consuming a public app to building your own model).*

---

## What's Next

Final lesson: **AIF-C01 Exam Strategy and Question Patterns** — how to read the question types (including ordering and matching), apply the "use, not build" mindset, avoid distractors, and manage your time.
