---
title: "Availability Zones"
type: content
estimated_minutes: 8
cert_tags: ["aws_ccp", "aws_saa"]
---

# Availability Zones

## Overview

An Availability Zone (AZ) is one or more discrete data centers within a Region, each with redundant power, networking, and connectivity. Every AWS Region has a minimum of three AZs, and most have three to six. AZs within a Region are connected by high-bandwidth, low-latency fiber — fast enough that synchronous replication between AZs is practical.

The key design principle: AZs are close enough to be fast but far enough apart that a localized failure (power outage, flooding, network cut) affects only one AZ. In the us-east-1 Region, for example, AZs are tens of miles apart — near enough for sub-millisecond latency but distant enough to isolate failures.

## AZ Naming and Physical Location

AZs are identified by a letter appended to the Region code: us-east-1a, us-east-1b, us-east-1c. Importantly, the AZ called 'us-east-1a' in your AWS account is not necessarily the same physical data center as 'us-east-1a' in another AWS account. AWS deliberately randomizes AZ-to-physical-location mapping per account to distribute load evenly across physical facilities.

For inter-account coordination (e.g., sharing a VPC subnet with another account), use AZ IDs (use1-az1, use1-az2, etc.) which are consistent across accounts and map to specific physical locations.

## Designing for Multi-AZ Availability

The fundamental rule of cloud architecture: never deploy a production workload in a single AZ. A single AZ is a single point of failure. Multi-AZ deployments survive the loss of one AZ without user impact.

**Multi-AZ patterns:** Deploy EC2 instances in multiple AZs behind a load balancer. Enable Multi-AZ on RDS (automatic failover to a standby in a second AZ). Configure Auto Scaling Groups to span multiple AZs. Place subnets in multiple AZs and distribute resources across them.

AWS managed services like ALB, ECS, EKS, and Lambda automatically span multiple AZs. When you use these services, multi-AZ is the default — one less thing to configure manually.

## AZ Failures in Practice

AWS has experienced AZ-level disruptions over the years, though they are relatively rare. The December 2021 us-east-1 event and the September 2019 us-east-1 partial outage are well-documented examples. In each case, customers who had properly implemented multi-AZ architectures continued operating with minimal or no impact.

The lesson from these incidents: multi-AZ is not optional for production workloads. The cost of running multi-AZ (roughly doubling compute resources) is much lower than the cost of an outage. Calculate your downtime cost (revenue per hour of outage) and compare it to the monthly cost of multi-AZ — the math almost always favors multi-AZ.

## Summary

Availability Zones are discrete data centers within a Region, connected by low-latency fiber. Production workloads must span multiple AZs to survive AZ-level failures. AZ names (a/b/c) are shuffled per account; use AZ IDs for cross-account coordination. AWS managed services typically handle multi-AZ automatically.

## What's Next

Next: Edge Locations and CloudFront Points of Presence — the global network AWS uses to cache and deliver content close to users, separate from the Regional infrastructure.
