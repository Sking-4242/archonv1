---
title: "AWS Support, Partners, and Technical Resources"
type: content
estimated_minutes: 13
cert_tags: ["CLF-C02"]
---

# AWS Support, Partners, and Technical Resources

## Overview

When something goes wrong, or when you need help designing, optimizing, or operating on AWS, where do you turn? The Cloud Practitioner exam, Domain 4, Task 4.3, asks you to identify AWS technical resources and Support options: the **AWS Support plans** and what each includes, the **AWS Partner Network** and **AWS Marketplace**, the technical resources like **AWS Trusted Advisor**, the **AWS Health Dashboard**, and **AWS re:Post**, and the assistance options such as **AWS Professional Services**. Although Domain 4 is only 12% of the exam, these resource-and-support questions are common and very answerable once you know the catalog.

This matters because using AWS well is not just about services — it's about knowing the support and ecosystem around them. A small dev team experimenting needs a different support plan than a bank running production workloads. A company that wants pre-vetted third-party software looks to Marketplace; one that wants implementation help looks to Partners or Professional Services. And several built-in tools — Trusted Advisor, the Health Dashboard — help customers optimize cost and stay ahead of issues. The exam tests whether you can match a need (faster response times, third-party software, best-practice checks, service health, community answers) to the right Support tier, partner channel, or resource.

This lesson covers the Support plans and their differences, the Partner Network and Marketplace, and the key technical resources and tools. After it you will be able to recommend an appropriate Support plan and point to the right AWS resource for a given need.

---

## Core Concepts

### The AWS Support Plans

AWS offers tiered **Support plans**, and the exam expects you to know the progression and the key differentiators:

- **Basic Support** — included free for all accounts. Provides access to documentation, whitepapers, AWS re:Post (community), and a core set of Trusted Advisor checks, plus account and billing support. No technical case support from AWS engineers.
- **Developer Support** — paid, entry level. Adds technical support via email (business-hours), suited to experimentation and early development. One contact, general guidance.
- **Business Support** — paid, for production workloads. Adds **24/7** technical support by phone, chat, and email; **faster response times**; full Trusted Advisor checks; and support for third-party software. The common choice for companies running production on AWS.
- **Enterprise On-Ramp** — paid, between Business and Enterprise. Adds faster critical-case response and a pool of Technical Account Managers, for businesses with some critical workloads.
- **Enterprise Support** — paid, top tier. Adds the **fastest response times** (critical cases in ~15 minutes), a **designated Technical Account Manager (TAM)**, concierge billing/account support, and access to AWS subject-matter experts. For large or mission-critical deployments.

The key exam differentiators: **Basic and Developer have no 24/7 phone support; Business and above do.** A **designated Technical Account Manager (TAM)** comes with **Enterprise** (and a pool with Enterprise On-Ramp). The fastest response times and a dedicated TAM signal **Enterprise Support**; 24/7 production support at a moderate cost signals **Business Support**.

### AWS Trusted Advisor

**AWS Trusted Advisor** inspects your environment and provides recommendations across five categories: **cost optimization, performance, security, fault tolerance (reliability), and service limits (service quotas)**. It's how customers proactively find savings (idle resources), close security gaps (open ports, missing MFA), and avoid hitting service limits. The number of checks available depends on your Support plan — Basic and Developer get a core subset, while Business and Enterprise get the **full set of checks**. Tell: "automatically check my environment for cost/security/best-practice improvements" → Trusted Advisor.

### AWS Health Dashboard

The **AWS Health Dashboard** shows the health and status of AWS services and any events that may affect your specific resources. The **Service Health Dashboard** view shows the general status of AWS services, while the personalized **Your Account Health** view (and the **AWS Health API**) alerts you to events impacting *your* account — such as scheduled maintenance or service issues affecting resources you use. Tell: "is AWS having an issue / will an event affect my resources" → AWS Health Dashboard.

### AWS re:Post and Knowledge Resources

AWS provides a rich set of self-service technical resources the exam names: **AWS re:Post** is a community question-and-answer site (the successor to the AWS forums) where you can get answers from the community and AWS experts. **AWS Knowledge Center** offers answers to common questions, **AWS Prescriptive Guidance** provides patterns and best-practice playbooks, and AWS publishes **whitepapers, documentation, and blogs** on official sites. These are where practitioners find guidance without opening a support case. Tell: "community Q&A" → re:Post; "best-practice guidance/patterns" → Prescriptive Guidance; "official deep guidance documents" → whitepapers.

### The AWS Partner Network (APN) and Marketplace

AWS has a large ecosystem of partners. The **AWS Partner Network (APN)** is the global community of partners that help customers build and run on AWS, including **independent software vendors (ISVs)** who build software on AWS and **systems integrators (SIs)** who provide implementation and consulting services. Partners earn benefits like training, certification, events, and volume discounts. **AWS Marketplace** is a digital catalog where customers can find, buy, and deploy **third-party software** (and services) that run on AWS, with consolidated billing and governance/entitlement controls. Tells: "find/buy third-party software" → AWS Marketplace; "implementation help or consulting from a partner" → Partner Network (SI); "software built on AWS by a vendor" → ISV.

### Professional Assistance and Trust & Safety

For hands-on help, **AWS Professional Services** and AWS Solutions Architects provide expert guidance to design and implement solutions. And the **AWS Trust & Safety team** is who you contact to **report abuse** of AWS resources (e.g., a resource being used for spam or attacks). Tells: "expert help implementing" → Professional Services/Solutions Architects; "report abuse of AWS resources" → Trust & Safety team.

---

## Configuration Reference

Support plans, key differences:

```text
Plan                 24/7 phone/chat?  TAM?              Best for
-------------------- ----------------- ----------------- --------------------------
Basic (free)         no                no                all accounts; docs, re:Post
Developer            no (email, hours) no                experimentation/early dev
Business             yes               no                production workloads
Enterprise On-Ramp   yes               pool of TAMs      some critical workloads
Enterprise           yes (fastest)     designated TAM    large/mission-critical
```

Resources and tools by need:

```text
Need                                    Resource
--------------------------------------- ----------------------------
Check env for cost/security/limits       AWS Trusted Advisor
AWS or my-resource service health         AWS Health Dashboard (+ Health API)
Community Q&A                             AWS re:Post
Best-practice patterns/playbooks          AWS Prescriptive Guidance
Buy third-party software                  AWS Marketplace
Implementation/consulting help            AWS Partner Network (SIs) / Professional Services
Report abuse of AWS resources             AWS Trust & Safety team
```

---

## How to Decide

- **Need 24/7 production support at moderate cost?** → Business Support. **Need a designated TAM and fastest response?** → Enterprise Support. **Just experimenting?** → Developer (or free Basic).
- **Want best-practice/cost/security checks?** → Trusted Advisor.
- **Checking whether an AWS issue affects you?** → AWS Health Dashboard.
- **Need third-party software?** → AWS Marketplace. **Need implementation help?** → Partner Network / Professional Services.
- **Community answers?** → re:Post. **Report abuse?** → Trust & Safety team.

---

## How This Connects

This lesson completes Domain 4, building on the support-plans and pricing lessons in the shared pricing-and-billing module. Trusted Advisor also appears in Domain 2 (security checks) and the cost-optimization material, and the Health Dashboard relates to monitoring (CloudWatch). The Partner Network and Marketplace connect to the broader AWS ecosystem and procurement/governance themes.

---

## Exam Traps

- **Assuming Basic/Developer include 24/7 phone support.** They don't — Business and above provide 24/7 technical support.
- **Putting a TAM at the wrong tier.** A *designated* Technical Account Manager comes with Enterprise Support (a pool with Enterprise On-Ramp).
- **Confusing Trusted Advisor and the Health Dashboard.** Trusted Advisor recommends improvements to *your environment*; the Health Dashboard reports *AWS service* health and events affecting you.
- **Confusing Marketplace and Partner Network.** Marketplace is for buying third-party *software*; the Partner Network is the ecosystem of *companies* (ISVs, SIs) that help you.
- **Forgetting Trust & Safety.** Reporting abuse of AWS resources goes to the AWS Trust & Safety team.

---

## Summary

AWS Support comes in tiers — Basic (free), Developer, Business, Enterprise On-Ramp, and Enterprise — with the key differentiators being 24/7 technical support (Business and above) and a designated Technical Account Manager with fastest response times (Enterprise). Trusted Advisor checks your environment for cost, performance, security, fault-tolerance, and service-limit improvements (more checks at higher tiers), while the AWS Health Dashboard reports AWS service health and events affecting your account. The AWS Partner Network (ISVs and SIs) and AWS Marketplace (third-party software) make up the ecosystem, Professional Services offers hands-on expertise, re:Post and Prescriptive Guidance provide self-service help, and the Trust & Safety team handles abuse reports. Match the need to the right plan, partner channel, or resource.

---

## Examples

**Example 1 — Business Support.** A company moving production workloads to AWS needs 24/7 phone support and full Trusted Advisor checks without the cost of a TAM → **Business Support**.

**Example 2 — Enterprise Support.** A bank running mission-critical systems needs a designated TAM and 15-minute critical-case response → **Enterprise Support**.

**Example 3 — Marketplace.** A team wants to deploy a vetted third-party firewall appliance with consolidated billing → **AWS Marketplace**.

**Example 4 — Health Dashboard.** An operations team wants alerts when AWS maintenance will affect their specific resources → the **AWS Health Dashboard** (and Health API).

---

## Think About It

A growing company is choosing a Support plan. They run production workloads, want round-the-clock help, and care about cost — but they don't yet need a dedicated account manager. Which plan fits, and what would have to change about their needs to justify stepping up to Enterprise Support?

---

## Quick Check

1. Which Support plans include 24/7 technical support, and which tier provides a designated Technical Account Manager?
2. What five categories does Trusted Advisor make recommendations in?
3. What is the difference between the AWS Partner Network and AWS Marketplace?
4. Where do you report abuse of AWS resources?

*Answers: (1) Business, Enterprise On-Ramp, and Enterprise include 24/7 technical support; a designated TAM comes with Enterprise Support; (2) cost optimization, performance, security, fault tolerance (reliability), and service limits; (3) the Partner Network is the ecosystem of partner companies (ISVs that build software, SIs that implement), while Marketplace is the catalog for finding and buying third-party software; (4) the AWS Trust & Safety team.*

---

## What's Next

Final lesson: **CLF-C02 Exam Strategy and Question Patterns** — how the Cloud Practitioner exam is structured, the qualifier-reading and elimination tactics, and how to manage your time.
