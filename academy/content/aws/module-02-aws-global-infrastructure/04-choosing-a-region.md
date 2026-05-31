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

## Examples

A US-based startup building a consumer app for the US market chose us-east-1 with no compliance constraints, no international users, and no exotic service requirements. The decision took about five minutes: cheapest Region, broadest service catalog, team already familiar with it. This is the easy, beginner-friendly case — the framework's value is most obvious when you contrast it against harder decisions.

A healthcare software company building a patient records platform for the UK National Health Service had to navigate both GDPR (EU) and UK-specific NHS data governance frameworks, which together required data to remain on UK soil. They selected eu-west-2 (London) even though it is more expensive than eu-west-1 (Ireland), because the Irish Region did not satisfy the UK data residency requirement post-Brexit. Compliance drove them past latency, then past cost, and the framework gave them a defensible rationale for each trade-off.

A machine learning platform company designed a pipeline that required Amazon SageMaker, AWS Trainium instances, and Amazon Bedrock — all of which had limited regional availability at the time. They wanted to serve customers in Southeast Asia with low latency, but none of the nearby Regions offered all three services simultaneously. They ended up running compute in us-east-1 where all services were available, and used CloudFront to reduce latency on the API delivery layer. The lesson: service availability can force you to decouple where you compute from where you deliver, and that's a legitimate architectural response.

## Think About It

1. The framework ranks Compliance first, then Latency, then Services, then Pricing. Can you construct a realistic scenario where re-ordering these factors would actually be the right call? What would that situation look like?
2. A company has users evenly distributed across the US, Europe, and Southeast Asia. They're considering a single-Region deployment in us-east-1. What specific latency and availability trade-offs should they model before dismissing a multi-Region approach?
3. If a service you want to use is only available in us-east-1 but your compliance requirement mandates eu-central-1, what architectural options do you have? Are any of them acceptable, and what risk does each carry?
4. Pricing varies across Regions by 10–30%. When would a 15% cost difference actually be worth factoring into Region selection, and when is it noise compared to other considerations?
5. AWS documentation says to "consult your legal and compliance teams" before finalizing a Region. Why can't an architect make this call alone, even if they have read all the compliance documentation?

## Quick Check

**Q1.** In the Region selection framework, what is the correct priority order of the four factors?
- A) Pricing → Latency → Compliance → Services
- B) Latency → Services → Compliance → Pricing
- C) Compliance → Latency → Services → Pricing
- D) Services → Compliance → Pricing → Latency

**Answer: C** — Compliance is always evaluated first because legal requirements are non-negotiable; latency, services, and pricing are optimized only within the boundaries compliance allows.

**Q2.** A company needs to serve users in Tokyo with minimal latency and has no compliance constraints. Which Region should they evaluate first?
- A) us-east-1 (N. Virginia)
- B) ap-southeast-1 (Singapore)
- C) ap-northeast-1 (Tokyo)
- D) eu-central-1 (Frankfurt)

**Answer: C** — With no compliance constraints, latency becomes the deciding factor, and ap-northeast-1 (Tokyo) is the AWS Region physically closest to users in Japan.

**Q3.** Which tool or resource provides the authoritative reference for which AWS services are available in which Regions?
- A) AWS Cost Explorer
- B) AWS Trusted Advisor
- C) The AWS Regional Services List
- D) AWS Config

**Answer: C** — The AWS Regional Services List (available at aws.amazon.com/about-aws/global-infrastructure/regional-product-services/) is the official reference for per-Region service availability.

## What's Next

This completes the theory for Module 2. The lab will walk you through the AWS infrastructure map, checking service availability by region, and understanding the global footprint visually.
