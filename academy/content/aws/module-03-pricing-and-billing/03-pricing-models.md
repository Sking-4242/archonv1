---
title: "On-Demand, Reserved, Spot, and Savings Plans"
type: content
estimated_minutes: 10
cert_tags: ["aws_ccp", "aws_saa"]
---

# On-Demand, Reserved, Spot, and Savings Plans

## Overview

EC2 offers four distinct pricing models, each optimized for different usage patterns. Choosing the right model — or the right combination — can reduce your compute costs by 60–90% compared to always paying on-demand rates. This is one of the highest-ROI decisions in AWS cost optimization.

Understanding when to use each model is a frequent exam topic and a core cost optimization skill.

## On-Demand Pricing

On-demand instances are billed per second (minimum 60 seconds) with no upfront commitment or long-term contract. You start an instance, use it, stop it, and pay only for the seconds it ran.

**Best for:** Unpredictable workloads where upfront commitment isn't possible. New applications whose usage profile you don't understand yet. Development and test environments that run intermittently. Short-duration jobs that can't be interrupted.

**Pricing:** The baseline — all other models are discounts off on-demand rates. For a t3.medium in us-east-1: approximately $0.0416/hour on-demand (2024 pricing; check aws.amazon.com for current rates).

## Reserved Instances and Savings Plans

**Reserved Instances (RIs)** commit to a specific instance type in a specific Region for 1 or 3 years. In exchange, you get 30–60% off on-demand rates. RIs come in three payment options: All Upfront (largest discount), Partial Upfront, and No Upfront. Standard RIs lock you into specific instance types; Convertible RIs let you change instance types within a family during the term.

**Savings Plans** offer the same discounts as RIs but with more flexibility. Instead of committing to a specific instance type, you commit to spending a specific dollar amount per hour on compute (Compute Savings Plans) or EC2 (EC2 Savings Plans). Compute Savings Plans apply automatically to Lambda, Fargate, and EC2 regardless of instance type, Region, or OS — maximum flexibility. Savings Plans are recommended over RIs for most new purchases.

**Best for:** Steady-state, predictable workloads that run continuously. Production databases, always-on application tiers, baseline capacity.

## Spot Instances

Spot Instances use AWS's spare EC2 capacity at discounts of 60–90% off on-demand pricing. The trade-off: AWS can reclaim Spot Instances with 2 minutes' notice when demand for that capacity increases. Your workload must tolerate interruption.

**Best for:** Batch processing, data analysis, CI/CD jobs, machine learning training, rendering, genomics — any workload that can checkpoint and restart. Not suitable for production databases, web servers serving real-time traffic, or anything that can't handle sudden termination.

**Spot strategies:** Use multiple instance types across multiple AZs with Spot Fleet or EC2 Fleet to reduce interruption risk. Enable Spot Instance interruption notices (2-minute warning via instance metadata). Design jobs to save state frequently so restart from interruption is cheap.

## Dedicated Hosts and Dedicated Instances

**Dedicated Instances** run on hardware dedicated to a single customer — other customers' instances don't share the same physical server. Required for some software licenses that are tied to physical sockets/cores.

**Dedicated Hosts** give you visibility into the physical server's attributes (sockets, cores) and control over instance placement on that host. Required for BYOL (Bring Your Own License) software (Oracle, Windows Server with per-core licensing). Dedicated Hosts are billed per host per hour.

Both options are significantly more expensive than shared tenancy and are used exclusively for compliance or licensing requirements.

## Summary

Choose On-Demand for unpredictable or short-lived workloads. Use Savings Plans or Reserved Instances (prefer Savings Plans for new purchases) for steady-state production workloads — 30–72% savings for 1 or 3-year commitments. Use Spot Instances for fault-tolerant batch workloads — 60–90% savings with interruption risk. Use Dedicated Hosts only for BYOL licensing or strict compliance requirements.

## Examples

A financial technology company is launching a new mobile payment app. During development they have no idea how much traffic the app will receive after launch, so they deploy entirely on On-Demand EC2 instances. They pay the baseline rate but gain the ability to scale up or down instantly. Three months after launch, traffic patterns stabilize — they consistently need 8 instances running 24/7. At that point they purchase Compute Savings Plans covering those 8 instances, immediately cutting that portion of their bill by 38%. This is the classic two-phase strategy: on-demand first to understand your usage, then commit once the pattern is clear.

A genomics research lab runs large-scale DNA sequencing jobs that process terabytes of data in parallel. Each job takes 4–6 hours, involves thousands of parallel tasks, and can be safely restarted if interrupted. The lab uses Spot Instances priced at 70% below on-demand rates. Occasionally, AWS reclaims some capacity mid-job — the system saves checkpoints every 15 minutes, so at most 15 minutes of work is lost on restart. Over a year, the lab processes the same workload at roughly one-third the cost compared to on-demand pricing. The key insight: Spot Instances are not risky if your workload is designed to tolerate and recover from interruption.

A software company sells a legacy enterprise analytics platform that runs on Oracle Database with per-core licensing — the license contract explicitly specifies that it applies to physical CPU cores on the host server, not virtual cores. Running this on shared EC2 tenancy would technically violate the license agreement. The company uses Dedicated Hosts, giving them visibility into the physical host's core count and exclusive control over instance placement. This is the narrow but real use case for Dedicated Hosts: it is never about performance, always about licensing or compliance requirements.

## Think About It

1. Compute Savings Plans apply automatically across EC2, Lambda, and Fargate regardless of instance type or Region. Why is this flexibility valuable compared to older Standard Reserved Instances — and are there any scenarios where Standard RIs might still be the better choice?
2. A company's engineering team wants to use Spot Instances to cut costs on their CI/CD build pipeline. Their security team objects, arguing that interrupted builds could leave artifacts in an inconsistent state. How would you design the build system to satisfy both teams?
3. Savings Plans and Reserved Instances both commit you to a spend level for 1 or 3 years. What business factors — beyond the technical workload pattern — should influence whether you choose a 1-year or 3-year commitment?
4. On-Demand pricing is described as the "baseline" against which all discounts are measured. But if a workload genuinely needs on-demand flexibility, is the higher price a cost or an insurance premium? How does reframing it change how you'd justify the decision to a CFO?
5. What would happen to your AWS bill if you purchased Savings Plans sized for your peak load but then your traffic permanently declined by 40%? What does this reveal about the real risk in commitment-based pricing?

## Quick Check

**Q1.** A company runs batch data processing jobs that take 3 hours each, can save progress every 10 minutes, and run dozens in parallel. Which EC2 pricing model offers the best cost savings for this workload?
- A) On-Demand
- B) Reserved Instances
- C) Spot Instances
- D) Dedicated Hosts

**Answer: C** — Spot Instances offer 60–90% savings and are ideal for fault-tolerant batch workloads that can checkpoint and restart after a 2-minute interruption notice.

**Q2.** What is the key advantage of Compute Savings Plans over Standard Reserved Instances?
- A) Compute Savings Plans offer deeper discounts
- B) Compute Savings Plans apply automatically across instance types, Regions, and services (EC2, Lambda, Fargate)
- C) Compute Savings Plans have no minimum commitment period
- D) Compute Savings Plans are free for new accounts in the first 12 months

**Answer: B** — The defining feature of Compute Savings Plans is flexibility: commit to a dollar-per-hour spend rate, and AWS automatically applies the discount to any eligible compute usage regardless of type or location.

**Q3.** Which pricing model would you choose for an Oracle Database workload that requires BYOL (Bring Your Own License) with per-physical-core licensing?
- A) Spot Instances
- B) On-Demand with default shared tenancy
- C) Dedicated Hosts
- D) Convertible Reserved Instances

**Answer: C** — Dedicated Hosts provide visibility into physical host attributes (socket and core counts) and exclusive hardware tenancy, which is required for BYOL software licensed to physical cores.

## What's Next

Next: AWS Support Plans — the five tiers from Basic to Enterprise On-Ramp and Enterprise, and what each provides.
