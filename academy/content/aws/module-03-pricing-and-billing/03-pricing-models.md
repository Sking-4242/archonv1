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

## What's Next

Next: AWS Support Plans — the five tiers from Basic to Enterprise On-Ramp and Enterprise, and what each provides.
