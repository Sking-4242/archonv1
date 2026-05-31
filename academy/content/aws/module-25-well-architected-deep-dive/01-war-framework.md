---
title: "The AWS Well-Architected Framework"
type: content
estimated_minutes: 10
cert_tags: ["SAA-C03", "SAP-C02", "CLF-C02"]
---

# The AWS Well-Architected Framework

## Overview

The AWS Well-Architected Framework is a set of architectural best practices developed by AWS over thousands of customer reviews. It's organized into six pillars that provide a consistent way to evaluate and improve cloud architectures. This lesson introduces the framework and each pillar.

## Why the Well-Architected Framework?

Most architectural mistakes in the cloud follow predictable patterns: hardcoded credentials, no Multi-AZ, missing backups, over-provisioned resources, no encryption at rest, manual deployments. The Well-Architected Framework encodes AWS's experience reviewing thousands of architectures into a set of questions, best practices, and design principles that help teams identify these gaps systematically — before they cause incidents.

## The Six Pillars

Operational Excellence: run and monitor systems, improve processes continuously. Security: protect data, systems, and assets, detect and respond to threats. Reliability: recover from failures, meet demand, mitigate disruptions. Performance Efficiency: use compute resources efficiently, maintain efficiency as demand evolves. Cost Optimization: deliver business value at the lowest price. Sustainability: minimize environmental impact of cloud workloads. Each pillar has design principles, best practices, and a set of questions for the Well-Architected Review.

## Well-Architected Tool and Reviews

The AWS Well-Architected Tool is a free service in the console where you conduct self-assessments against the framework. Answer questions about your workload across all six pillars; the tool generates a prioritized list of high-risk issues (HRIs) and medium-risk issues (MRIs) with recommended improvements. AWS Partners can conduct formal Well-Architected Reviews of your workload with a certified reviewer. Schedule WAR reviews for each significant workload annually or after major changes.

## Lenses

AWS provides additional Lenses that extend the framework for specific domains: Serverless Lens (Lambda, API Gateway, Step Functions), Container Lens (ECS, EKS), SaaS Lens (multi-tenant architecture), Data Analytics Lens, Game Tech Lens, IoT Lens, and more. Each lens adds pillar-specific questions and best practices for that domain. Use the relevant lens in addition to the base framework for specialized workloads.

## Summary

The Well-Architected Framework provides 6 pillars of architectural best practices: Operational Excellence, Security, Reliability, Performance Efficiency, Cost Optimization, and Sustainability. Use the Well-Architected Tool for self-assessment. Conduct formal reviews annually. Lenses extend the framework for specific workload types. It's both a learning resource and an operational tool for maintaining architecture quality.

## Examples

A mid-sized e-commerce startup decided to conduct their first Well-Architected Review using the AWS Well-Architected Tool before their peak holiday season. They answered questions across all six pillars and discovered two high-risk issues: their RDS database had no Multi-AZ failover, and their EC2 instances were using hardcoded IAM access keys. These are exactly the predictable mistakes the framework encodes — catching them before Black Friday is the entire point of the review process.

A healthcare SaaS company building on AWS used the SaaS Lens in addition to the base framework when reviewing their multi-tenant architecture. The base framework flagged general security gaps, but the SaaS Lens surfaced tenant isolation questions specific to their domain — such as whether data plane requests could accidentally cross tenant boundaries. Without the lens, those questions simply wouldn't have appeared in the review. This illustrates why domain-specific lenses exist alongside the six pillars.

An enterprise financial services firm scheduled annual Well-Architected Reviews for each of their twelve production workloads, staggered across the year with an AWS Partner conducting the formal review. After their trading platform review, the prioritized HRI list revealed that their disaster recovery runbooks hadn't been tested in eighteen months. The framework gave them a structured, auditable way to surface this risk — something their internal review processes had missed — and the remediation action item was tracked directly in the Well-Architected Tool.

## Think About It

1. Why does the Well-Architected Framework organize best practices into six separate pillars rather than one unified checklist? What does separating "Reliability" from "Security" help a review team do that a single list would not?
2. What would happen if a team conducted a Well-Architected Review and addressed every high-risk issue — but only did so once and never reviewed again? What kinds of drift would you expect to accumulate over two years?
3. How would you decide which lenses to apply to a workload? What questions would you ask about the workload's characteristics before choosing between the Serverless Lens, the Container Lens, and the SaaS Lens?
4. The framework emerged from AWS reviewing thousands of customer architectures. What trade-offs does that origin create — what kinds of architectural risks might the framework be excellent at catching, and what kinds might it systematically underweight?
5. If your team has limited time and can only address three HRIs before a product launch, how would you decide which three to prioritize — and what does that prioritization process reveal about the relationship between the six pillars?

## Quick Check

**Q1.** What does the AWS Well-Architected Tool produce after you answer its pillar questions about your workload?
- A) A cost estimate for remediating architectural gaps
- B) A prioritized list of high-risk issues (HRIs) and medium-risk issues (MRIs)
- C) An automated remediation script using AWS Config
- D) A compliance certification you can share with auditors

**Answer: B** — The tool generates a prioritized list of HRIs and MRIs with recommended improvements; it does not auto-remediate or produce compliance certifications.

**Q2.** A company is building a multi-tenant SaaS platform on AWS and wants the most relevant Well-Architected guidance. What should they use in addition to the six base pillars?
- A) The AWS Trusted Advisor dashboard
- B) The AWS Service Catalog
- C) The SaaS Lens
- D) The AWS Config conformance pack

**Answer: C** — AWS provides the SaaS Lens specifically to extend the base framework with questions and best practices for multi-tenant SaaS architecture.

**Q3.** How many pillars make up the AWS Well-Architected Framework?
- A) Four
- B) Five
- C) Six
- D) Seven

**Answer: C** — The framework has six pillars: Operational Excellence, Security, Reliability, Performance Efficiency, Cost Optimization, and Sustainability.

## What's Next

Next up: Operational Excellence pillar — operations as code, deployment safety, and incident response.