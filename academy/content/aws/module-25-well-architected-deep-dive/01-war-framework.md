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

## What's Next

Next up: Operational Excellence pillar — operations as code, deployment safety, and incident response.