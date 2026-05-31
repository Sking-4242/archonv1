---
title: "Pillar: Sustainability"
type: content
estimated_minutes: 5
cert_tags: ["aws_ccp", "aws_saa", "aws_sap"]
---

# Pillar: Sustainability

## Overview

Added to the Well-Architected Framework in 2021, the Sustainability pillar focuses on minimizing the environmental impact of your cloud workloads. The cloud is inherently more sustainable than on-premises data centers due to AWS's scale, efficiency, and renewable energy investments, but architectural choices still matter.

## Sustainability Design Principles

**Understand your impact:** Know the carbon footprint of your workloads. AWS provides the Customer Carbon Footprint Tool (in the Billing console) showing estimated CO2 emissions from your AWS usage. **Establish sustainability goals:** Set targets for reducing per-unit environmental impact, even as total usage grows. **Maximize utilization:** Idle resources waste energy. Rightsizing, Auto Scaling, and serverless architectures improve utilization, which reduces energy per unit of work. **Anticipate and adopt new, more efficient hardware and software:** AWS continuously introduces more energy-efficient instance types (Graviton processors use up to 60% less energy for equivalent performance). **Use managed services:** Shared managed services achieve higher utilization than dedicated single-customer deployments. **Reduce downstream impact:** Compress data, use efficient serialization formats, implement client-side caching to reduce unnecessary compute and transfer.

## AWS Sustainability Initiatives

AWS's own sustainability commitments are relevant context: 100% renewable energy commitment (already exceeded in some regions), Climate Pledge goal of net-zero carbon by 2040, water stewardship programs, and custom silicon (Graviton, Inferentia, Trainium) optimized for energy efficiency. When you run workloads on AWS, you benefit from these infrastructure investments.

Using AWS Graviton-based instances is one of the simplest sustainability improvements — same or better performance, lower cost, lower energy usage. Consider migrating compute-heavy workloads to Graviton-based instance types (m7g, c7g, r7g families).

## Summary

The Sustainability pillar calls for understanding workload environmental impact, maximizing resource utilization (rightsize, use serverless, eliminate idle resources), adopting efficient hardware (Graviton instances), and leveraging managed services. AWS provides the Customer Carbon Footprint Tool for visibility. Moving to AWS is inherently more sustainable than on-premises, but architecture choices still meaningfully affect environmental impact.

## Examples

A streaming analytics company migrated their data processing fleet from Intel-based c5 instances to AWS Graviton3-based c7g instances. Benchmarking showed equivalent throughput with 20% better price-performance and approximately 60% lower energy use per unit of work — matching AWS's published Graviton efficiency claims. The migration required recompiling their Go-based application for the ARM64 architecture, which took two days. The result was lower cost, lower carbon footprint, and no change to end users — a rare case where sustainability and cost optimization pointed in exactly the same direction.

A large SaaS platform ran a sustainability audit using the AWS Customer Carbon Footprint Tool and discovered that one legacy batch job — a nightly report generation process — accounted for 18% of their estimated CO2 emissions despite representing only 4% of their compute spend. The job was running on large, persistently-running EC2 instances with utilization averaging 8%. Refactoring it to run on AWS Lambda (invoked on demand, idle compute cost zero) reduced both the cost and the estimated emissions for that workload by 70%. The principle at work: idle resources waste energy; serverless eliminates idle.

A global retail company with AWS workloads across six regions used the Customer Carbon Footprint Tool to compare emissions across their regions. They found that eu-west-1 (Ireland) — one of AWS's regions with higher renewable energy coverage — produced measurably lower estimated emissions than their ap-southeast-1 workloads for equivalent compute. For a non-latency-sensitive batch analytics workload, they evaluated whether migrating it to eu-west-1 made sense from a sustainability standpoint. This kind of region-selection analysis for appropriate workloads is an emerging aspect of the Sustainability pillar that goes beyond just rightsizing.

## Think About It

1. The Sustainability pillar was added to the Well-Architected Framework in 2021 — six years after the other five pillars. What does that timing suggest about how the cloud industry's priorities have evolved, and what pressures drove the addition?
2. The pillar says to "maximize utilization" as a sustainability strategy. But the Reliability pillar recommends maintaining spare capacity for redundancy and failover. How do you reconcile these two goals — is there a right answer, or is it always a trade-off?
3. Graviton instances use less energy per unit of compute than x86 instances. But migrating to Graviton requires recompiling software and potentially debugging compatibility issues. How would you evaluate whether a sustainability-motivated migration is worth the engineering investment?
4. The Customer Carbon Footprint Tool gives you estimated CO2 emissions, but the methodology is imperfect and the estimates are approximations. How much weight should you give to this data when making architectural decisions, and what are its limitations?
5. A critic argues that the Sustainability pillar is just Cost Optimization rebranded — "use less compute" reduces both cost and carbon. Is this critique fair? Where do the pillars align, and where might pursuing sustainability genuinely require spending more?

## Quick Check

**Q1.** Which AWS tool allows customers to view the estimated carbon footprint of their AWS usage?
- A) AWS Trusted Advisor
- B) AWS Cost Explorer
- C) AWS Customer Carbon Footprint Tool
- D) AWS Compute Optimizer

**Answer: C** — The Customer Carbon Footprint Tool, available in the AWS Billing console, shows estimated CO2 emissions from your AWS resource usage broken down by service and region.

**Q2.** AWS Graviton-based instances are described as more sustainable than equivalent x86 instances primarily because they:
- A) Run only on renewable energy
- B) Use up to 60% less energy for equivalent compute performance
- C) Generate less network traffic
- D) Automatically scale to zero when idle

**Answer: B** — Graviton processors (ARM-based, designed by AWS) achieve significantly better energy efficiency per unit of compute compared to equivalent x86 instances, reducing energy consumption and associated emissions for the same workload.

**Q3.** Which of the following architectural choices BEST embodies the Sustainability pillar's "maximize utilization" principle?
- A) Running three large EC2 instances at 20% CPU utilization each for redundancy
- B) Storing all data in S3 Standard for fast retrieval
- C) Replacing a persistently-running EC2-based worker with an AWS Lambda function that only runs when events arrive
- D) Deploying in multiple AWS Regions to reduce latency

**Answer: C** — Lambda eliminates idle compute entirely — resources are consumed only when work is actually being done. Persistently-running instances consuming 20% CPU are using (and wasting) 80% of their allocated resources even when idle.

## What's Next

This completes Module 6. The lab covers the Well-Architected Tool — a guided review that scores your workload against all six pillars.
