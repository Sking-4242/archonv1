---
title: "How to Choose a Region"
type: content
estimated_minutes: 6
cert_tags: ["aws_ccp", "aws_saa"]
---

# How to Choose a Region

## Overview

Region selection is a decision you make at the beginning of every architecture project, and it has cascading implications for compliance, latency, cost, and available services. Getting it right early avoids expensive migrations later. This lesson provides a structured framework for region selection that works for the exam and in real-world projects.

The four factors, in priority order: Compliance → Latency → Services → Pricing.

## Factor 1: Compliance and Data Residency

Compliance is always the first filter. Data sovereignty laws, industry regulations, and contractual obligations may legally mandate that data remain within specific national or regional boundaries. GDPR (EU), data localization laws (Russia, China, India), and sector-specific regulations (HIPAA, PCI-DSS, FedRAMP) all impose geographic constraints.

If compliance mandates a specific geography, you choose the Region in that geography and accept whatever latency and pricing come with it. The EU Frankfurt region (eu-central-1) for GDPR-constrained European data; AWS GovCloud (US-West) for FedRAMP High US government workloads; ap-northeast-1 (Tokyo) for Japanese financial data governed by FSA requirements.

Always consult your legal and compliance teams before finalizing a Region. AWS provides compliance documentation for each Region at aws.amazon.com/compliance.

## Factor 2: Latency

After compliance, minimize latency by choosing the Region closest to your users. Latency is primarily determined by physical distance — light travels fast but not instantaneously. A trans-Atlantic round trip adds 80–100ms of latency; trans-Pacific adds 150–200ms. For interactive applications, this is noticeable.

Use the AWS Latency Test (cloudping.info) to measure actual latency from your users' locations to candidate Regions. If your user base is global, consider deploying to multiple Regions with Route 53 latency-based routing — each user reaches the Region closest to them.

For ultra-low latency (gaming, real-time financial, live video), explore AWS Local Zones, which place compute in metro areas closer to specific population centers.

## Factor 3: Service Availability

Not all AWS services are available in all Regions. Before finalizing your Region, enumerate every service your architecture requires and verify availability. The AWS Regional Services List is the authoritative reference.

Newer or more specialized services tend to launch first in us-east-1 and expand outward over months to years. AWS AI/ML services, newer database engines, and some analytics services have narrower regional footprints than compute and storage primitives.

If your architecture depends on a service that's only available in certain Regions, and those Regions don't meet your compliance or latency requirements, you may need to rethink your architecture or wait for the service to expand.

## Factor 4: Pricing

AWS pricing varies by Region, typically within a 10–30% range. us-east-1 (N. Virginia) is the cheapest for most services — it's the largest and most mature Region. European and Asia-Pacific Regions are typically 10–15% more expensive due to higher local costs (power, real estate, staff).

For cost-sensitive workloads where compliance and latency requirements don't constrain Region choice, use the AWS Pricing Calculator to compare total costs across candidate Regions. Factor in data transfer costs (transferring data between Regions is charged per GB) as well as service costs.

## Summary

Region selection follows a strict priority: Compliance first (legal requirements override everything), Latency second (minimize round-trip time for users), Service availability third (verify all required services exist), and Pricing last (us-east-1 is typically cheapest). Document your region selection rationale — it's an Architecture Decision Record worth keeping.

## What's Next

This completes the theory for Module 2. The lab will walk you through the AWS infrastructure map, checking service availability by region, and understanding the global footprint visually.
