---
title: "Reserved Instances, Savings Plans, and Spot"
type: content
estimated_minutes: 10
cert_tags: ["SAA-C03", "SAP-C02", "CLF-C02"]
---

# Reserved Instances, Savings Plans, and Spot

## Overview

On-Demand pricing is the most flexible but most expensive compute option. AWS offers significant discounts for committed usage (Reserved Instances, Savings Plans) and for using spare capacity with interruption tolerance (Spot). This lesson maps the options and when to use each.

## Reserved Instances (RIs)

RIs provide up to 72% discount over On-Demand in exchange for a 1 or 3-year usage commitment. Standard RIs lock in instance type and region; Convertible RIs allow changing the instance type within the same family during the term (lower discount, ~54%). Payment options: All Upfront (maximum discount), Partial Upfront, No Upfront. RIs apply automatically to matching On-Demand usage in your account or organization. Unused RI capacity can be listed in the RI Marketplace. Use Standard RIs for stable, predictable workloads running 24/7 (production databases, always-on application servers).

## Savings Plans

Savings Plans commit to a consistent dollar amount of usage per hour (e.g., $10/hr) in exchange for discounts — but are more flexible than RIs. Compute Savings Plans apply across EC2 instance families, sizes, regions, and even Fargate and Lambda — just committing to a compute spend amount. EC2 Instance Savings Plans apply to a specific instance family in a region but are fully flexible across AZ, size, OS. Savings Plans are recommended over RIs for most new commitments because of their flexibility — if you change instance type or move to Fargate, the commitment still applies.

## Spot Instances

Spot Instances use EC2 spare capacity at up to 90% discount. The catch: AWS can interrupt Spot Instances with 2-minute notice when capacity is needed elsewhere. Appropriate workloads: batch processing, big data (EMR), CI/CD build machines, stateless web tier (behind ALB with graceful shutdown), simulation and rendering. Not appropriate: databases, stateful applications, anything that can't handle interruption. Use Spot with Auto Scaling (Spot-aware ASG with multiple instance types and AZs for interruption resilience) — configure On-Demand for a minimum baseline and Spot for the rest.

## Purchasing Strategy in Practice

A well-optimized compute strategy: 1-year Compute Savings Plan covering ~70% of baseline compute spend (the stable, always-running workload). Remaining On-Demand for flexibility. Spot for batch and scale-out capacity. Review Savings Plan coverage reports monthly — if coverage is below 70%, buy more. If you're consistently underutilizing a Savings Plan, you may be over-committed. The goal is 70-80% of compute covered by commitments.

## Summary

Reserved Instances and Savings Plans provide 40-72% discounts for committed usage. Savings Plans are more flexible — recommended over RIs for most new commitments. Spot Instances provide up to 90% discounts for interruption-tolerant workloads. Strategy: Savings Plan for the stable baseline, Spot for batch/variable, On-Demand for the unpredictable edge. Review coverage monthly.

## What's Next

Next up: Storage cost optimization — S3 tiering, EBS right-sizing, and data transfer costs.