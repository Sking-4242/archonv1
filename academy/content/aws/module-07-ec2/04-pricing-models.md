---
title: "EC2 Pricing Models"
type: content
estimated_minutes: 8
cert_tags: ["aws_ccp", "aws_saa", "aws_soa"]
---

# EC2 Pricing Models

## Overview

EC2 pricing is covered at a high level in Module 3, but this lesson goes deeper — applying the pricing model concepts specifically to EC2 architecture decisions. The right pricing model for a workload can reduce compute costs by 60–90% without changing the workload itself.

## On-Demand: Baseline Pricing

On-demand pricing bills per second (minimum 60 seconds) with no commitment. It's the most expensive model but the most flexible — ideal for workloads with unpredictable traffic patterns, short-duration jobs, or new applications being evaluated.

On-demand instances are also used as the "burst" tier in a cost-optimized architecture: baseline capacity is covered by Reserved Instances or Savings Plans; unexpected demand spikes are handled by on-demand instances. The savings come from having a large chunk of predictable capacity at reserved prices.

## Savings Plans and Reserved Instances Deep Dive

**EC2 Instance Savings Plans** commit to a specific instance family in a Region (e.g., m6i in us-east-1) for 1 or 3 years. The discount applies regardless of size, OS, or tenancy within that family. This is more flexible than the older Standard Reserved Instances, which locked you into a specific instance type.

**Compute Savings Plans** commit to a $ amount per hour on any EC2, Lambda, or Fargate usage — the most flexible option. Discounts are slightly lower than EC2 Instance Savings Plans but the flexibility is significantly higher.

When should you purchase Savings Plans? When a workload has run in production for at least 1-2 months and you understand its steady-state capacity. Use the Cost Explorer Savings Plans recommendation to see exactly how much to purchase and what return to expect.

## Spot Instances: Architecture for Interruption

Spot Instances are unused EC2 capacity offered at 60–90% discount. The risk: AWS can reclaim a Spot Instance with 2 minutes notice. Spot interruptions occur when the Spot price rises above your maximum price (which can be set to the on-demand price to maximize availability) or when AWS needs the capacity back.

**Spot architecture patterns:** Use Spot Instance diversification — request the same capacity across 5+ instance types and 3 AZs. Configure the interruption behavior to either terminate or stop/hibernate. Use Spot-aware workload managers: AWS Batch (automatically handles Spot interruption and retries), EMR (switches tasks to on-demand if Spot is interrupted), and EKS (node groups with Spot + on-demand mix using Karpenter).

## Summary

Choose On-Demand for unpredictable workloads. Use Savings Plans (Compute for maximum flexibility, EC2 Instance for higher discount on a single family) for steady-state capacity after observing production usage. Use Spot Instances for fault-tolerant batch workloads — the 60-90% discount justifies designing for interruption. Combine all three in a layered architecture: reserved baseline + on-demand buffer + spot batch.

## Examples

A bootstrapped startup launches their first production API on a single `t3.small` On-Demand instance. At $0.0208/hour, the monthly cost is about $15 — a reasonable price for the flexibility to resize or shut down any time. Three months in, traffic has stabilized at a consistent baseline; they purchase a 1-year Compute Savings Plan for $10/hour of compute commitment. Their monthly bill drops by 30% with no changes to the workload. This is the canonical on-demand-to-savings-plan transition: wait for stable data, then commit.

A genomics research company runs massively parallel DNA sequencing jobs using AWS Batch. Each job is fault-tolerant by design — if an instance is interrupted, Batch retries the task. They configure their Batch compute environment to use Spot Instances across `m5`, `m6i`, `m7i`, and `c5` families in three AZs. Their average compute cost is 72% below on-demand. The key architectural insight: the workload's fault-tolerance was designed first, and Spot was a natural cost consequence — not an afterthought.

A financial services firm runs a trading risk platform that processes end-of-day reports from 6 PM to 10 PM every weekday, with zero tolerance for interruption. They use On-Demand for this four-hour window rather than Reserved or Savings Plans because the workload isn't running 24/7. Meanwhile, their always-on pre-trade analytics cluster (running continuously) is covered by a 3-year EC2 Instance Savings Plan. The architecture deliberately layers pricing models: committed rates for predictable baseline, on-demand for scheduled bursts, and Spot for overnight batch reconciliation jobs.

## Think About It

1. Why might it be a mistake to purchase Reserved Instances or Savings Plans before a workload has been running in production for at least a month? What risks does early commitment create?
2. Spot Instances can be interrupted with only 2 minutes notice. What application design patterns make a workload genuinely Spot-tolerant — and what patterns make Spot dangerous to use?
3. If Compute Savings Plans offer more flexibility than EC2 Instance Savings Plans but slightly lower discounts, how would you decide which to purchase for a given team or workload?
4. A company's Cost Explorer recommends purchasing $5,000/month in Savings Plans to save $2,000/month. What questions would you ask before accepting that recommendation?
5. What trade-offs exist between using a 1-year versus a 3-year Savings Plan? Under what business conditions would each term length be the wrong choice?

## Quick Check

**Q1.** A company has a critical batch job that runs nightly and must complete successfully every time. Which pricing model is most appropriate?
- A) Spot Instances, because the discount offsets any interruption risk
- B) On-Demand Instances, because the job cannot tolerate interruption
- C) Compute Savings Plans, because the job runs on a predictable schedule
- D) Reserved Instances in Scheduled mode

**Answer: B** — Spot Instances can be interrupted with 2 minutes notice and are unsuitable for workloads that cannot tolerate failure. On-Demand guarantees availability without interruption risk.

**Q2.** What is the maximum discount available with Spot Instances compared to On-Demand pricing?
- A) Up to 30%
- B) Up to 50%
- C) Up to 75%
- D) Up to 90%

**Answer: D** — Spot Instances offer discounts of 60–90% below On-Demand prices, making them the most cost-effective EC2 option for fault-tolerant, interruption-tolerant workloads.

**Q3.** Which Savings Plan type provides the most flexibility, applying to EC2, Lambda, and Fargate usage across all Regions and instance families?
- A) EC2 Instance Savings Plans
- B) Compute Savings Plans
- C) Standard Reserved Instances
- D) Convertible Reserved Instances

**Answer: B** — Compute Savings Plans apply to any EC2, Lambda, or Fargate usage regardless of Region, instance family, or OS, making them the most flexible commitment option.

## What's Next

Next: Security Groups and Key Pairs — the primary mechanisms for controlling access to EC2 instances.
