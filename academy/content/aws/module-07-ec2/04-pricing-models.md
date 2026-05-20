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

## What's Next

Next: Security Groups and Key Pairs — the primary mechanisms for controlling access to EC2 instances.
