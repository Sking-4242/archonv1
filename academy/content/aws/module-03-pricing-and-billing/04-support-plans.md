---
title: "AWS Support Plans"
type: content
estimated_minutes: 6
cert_tags: ["aws_ccp"]
---

# AWS Support Plans

## Overview

AWS offers five support plans that provide different levels of technical guidance, account management, and response time SLAs. Understanding these plans is a CCP exam topic and a practical consideration for any organization running workloads on AWS.

The five plans are: Basic, Developer, Business, Enterprise On-Ramp, and Enterprise.

## Basic Support (Included)

Every AWS account includes Basic Support at no charge. Basic includes: access to customer service for account and billing questions (24/7), access to AWS documentation, whitepapers, and the support forums (AWS re:Post), AWS Trusted Advisor (7 core checks only), and the AWS Health Dashboard for notifications about service disruptions.

Basic does not include access to AWS Support Engineers for technical questions. If you need technical guidance on your architecture, you need at minimum Developer support.

## Developer and Business Plans

**Developer ($29/month or 3% of monthly AWS charges, whichever is higher):** Adds email access to Cloud Support Associates during business hours for technical questions. Best for learning environments and non-production workloads. Response time SLA: general guidance within 24 hours, system impaired within 12 hours.

**Business ($100/month or 10%/7%/5% of monthly charges, whichever is higher):** Adds 24/7 access to Cloud Support Engineers via phone, chat, and email. Adds all 535+ Trusted Advisor checks. Response times: production system down within 1 hour, production system impaired within 4 hours. Suitable for production workloads. Includes access to AWS Support API for programmatic case management.

## Enterprise On-Ramp and Enterprise

**Enterprise On-Ramp (~$5,500/month minimum):** Adds a pool of Technical Account Managers (TAMs) for proactive guidance, Concierge Support for billing, and business-critical system down response within 30 minutes.

**Enterprise (~$15,000/month minimum):** Adds a dedicated Technical Account Manager, proactive architecture reviews, access to AWS Infrastructure Event Management (for planned large-scale events like product launches), and business/mission-critical system down response within 15 minutes.

TAMs are the key differentiator for Enterprise plans — a named AWS expert who knows your architecture, proactively flags risks, and provides guidance on optimizing your AWS usage.

## Summary

The five support plans progress from Basic (free, documentation only) to Enterprise ($15k+/month, dedicated TAM, 15-minute critical response). For development and testing use Developer; for production use Business at minimum; for mission-critical workloads consider Enterprise On-Ramp or Enterprise. On the CCP exam, know the response time SLAs and the key feature that distinguishes each tier.

## Examples

A freelance developer builds hobby projects and side experiments on AWS. They ask technical questions infrequently, and when they do, they're happy to search AWS documentation and the re:Post forums. Basic Support costs them nothing and covers their needs — community answers, documentation, and billing support if a charge ever looks wrong. For this user, upgrading to Developer Support would add real cost with marginal benefit, since their workloads carry no SLA or business risk.

A retail company runs its e-commerce platform on AWS and handles real customer orders around the clock. One Sunday night, their production RDS database starts throwing errors and order processing stalls. They are on Business Support, which gives them 24/7 access to a Cloud Support Engineer via phone. Within 40 minutes of calling, a support engineer has identified the issue — a parameter group misconfiguration — and walked them through the fix. Had they been on Developer Support, they would have waited until business hours Monday for an email response. For production workloads with revenue impact, Business Support's 1-hour critical response SLA is the practical minimum.

A Fortune 500 bank migrates its core transaction processing systems to AWS and negotiates Enterprise Support. They are assigned a dedicated Technical Account Manager who joins their architecture review calls, flags risks before they become incidents, and coordinates AWS's Infrastructure Event Management team ahead of their annual peak trading period. During a major product launch, the TAM orchestrates pre-scaled capacity and has a direct escalation path to AWS service teams. The bank's engineers value the TAM not primarily for faster ticket resolution, but for the proactive guidance that prevents tickets from being needed in the first place.

## Think About It

1. Business Support costs $100/month minimum, or 10%/7%/5% of your AWS charges. For a company spending $5,000/month on AWS, that's $500/month in support costs alone. How would you make the case to a CFO that this cost is justified compared to relying on Developer Support?
2. The key differentiator of Enterprise plans is the dedicated Technical Account Manager. What kinds of problems is a TAM well-positioned to solve that a standard support ticket system cannot — and what does that tell you about where the real risk lies in large-scale AWS deployments?
3. If you were launching a startup's first production application on AWS with a $300/month infrastructure budget, which support plan would you choose, and what factors would drive you to upgrade later?
4. AWS Trusted Advisor checks are limited to 7 core checks on Basic and Developer plans, but all 535+ checks on Business and above. What categories of problems might you miss if you're only seeing 7 checks — and how could those blind spots affect security or cost?
5. Support plan response time SLAs guarantee initial response, not resolution time. How should this distinction affect how you design your own operational runbooks and escalation procedures?

## Quick Check

**Q1.** A company needs 24/7 phone access to AWS Cloud Support Engineers for their production workload. What is the minimum support plan they must purchase?
- A) Basic
- B) Developer
- C) Business
- D) Enterprise On-Ramp

**Answer: C** — Business Support is the first tier to include 24/7 phone, chat, and email access to Cloud Support Engineers, along with a 1-hour SLA for production system down scenarios.

**Q2.** Which support plan feature is exclusive to Enterprise and Enterprise On-Ramp tiers?
- A) Access to AWS Trusted Advisor
- B) 24/7 technical support via email
- C) Technical Account Manager (TAM)
- D) Access to AWS Health Dashboard

**Answer: C** — Technical Account Managers (dedicated or from a pool) are only available at the Enterprise On-Ramp and Enterprise tiers, providing proactive architectural guidance that goes beyond reactive support.

**Q3.** What is the maximum response time SLA for a "production system impaired" case on the Business support plan?
- A) 15 minutes
- B) 1 hour
- C) 4 hours
- D) 12 hours

**Answer: C** — Business Support guarantees a 4-hour initial response for production system impaired cases, and 1 hour for production system down cases.

## What's Next

Next: Cost Explorer and AWS Budgets — the tools for understanding and controlling your actual AWS spending.
