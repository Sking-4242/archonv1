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

## What's Next

Next: Cost Explorer and AWS Budgets — the tools for understanding and controlling your actual AWS spending.
