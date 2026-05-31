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

## Examples

A healthcare analytics company runs a HIPAA-compliant PostgreSQL database on RDS 24 hours a day, 365 days a year, with predictable and stable load. They purchase a 1-year Standard Reserved Instance for that database instance class and region, immediately cutting their RDS compute bill by 40% with zero architectural change. This is the clearest beginner case for Reserved Instances: a stable, always-on workload that will not change instance type is exactly what RIs are designed for.

A startup begins with EC2 but over 12 months migrates parts of their workload from EC2 to AWS Fargate containers and Lambda functions. Because they purchased a Compute Savings Plan rather than EC2 Instance RIs, their hourly dollar commitment automatically applies to Fargate and Lambda usage — they retain the discount throughout the migration without purchasing new commitments. This is the key reason Savings Plans are now preferred over RIs: flexibility across compute types means the commitment survives architectural evolution.

A media company runs video transcoding jobs nightly. Each job takes 2–4 hours, is embarrassingly parallel across hundreds of workers, and can be safely restarted if interrupted. They configure an Auto Scaling group with a mix of six different instance types across three Availability Zones using Spot Instances. Even with a 15% interruption rate, their total transcoding cost is 85% lower than On-Demand — and because interrupted jobs automatically retry, no output is lost. This scenario illustrates the architectural discipline Spot requires: multi-type, multi-AZ placement and graceful shutdown handling are non-negotiable.

## Think About It

1. Why does AWS offer a higher discount for Standard RIs than Convertible RIs? What risk does AWS take on with each, and how does that risk translate into pricing?
2. A team wants to cover their baseline compute spend with a Compute Savings Plan. They currently spend $8/hour on EC2. What information would you need before committing, and what would happen if the team's compute spend dropped to $5/hour six months into a 1-year commitment?
3. What would happen if a company applied Spot Instances to their primary production RDS-backed application server without any architectural changes? Walk through the failure scenario step by step.
4. How would you decide the right split between Savings Plan coverage, On-Demand, and Spot for a workload that has a stable base of 20 instances but scales up to 80 instances during peak hours each weekday?
5. Savings Plans commit to a dollar-per-hour spend, not a specific instance count. What are the implications of this when instance prices change — for example, when AWS releases a new generation that is cheaper per compute unit?

## Quick Check

**Q1.** A company wants the largest possible discount on EC2 but knows their production database instance type will never change. Which purchasing option best fits this requirement?
- A) Compute Savings Plan
- B) Convertible Reserved Instance
- C) Standard Reserved Instance
- D) Spot Instance

**Answer: C** — Standard RIs provide the highest discount (up to 72%) and are ideal when the instance type, family, and region are stable and predictable, as is typical for a long-running production database.

**Q2.** Why are Compute Savings Plans generally recommended over Reserved Instances for most new commitments?
- A) Compute Savings Plans always provide a higher discount percentage
- B) Compute Savings Plans apply across EC2 families, Fargate, and Lambda regardless of instance type or region
- C) Compute Savings Plans require no upfront payment
- D) Compute Savings Plans can be sold in the RI Marketplace if unused

**Answer: B** — Compute Savings Plans commit to a dollar-per-hour spend amount rather than a specific instance type, so the discount automatically applies across EC2 instance families, Fargate, and Lambda, making them resilient to architectural changes.

**Q3.** Which of the following workloads is LEAST appropriate for Spot Instances?
- A) Nightly ETL batch processing jobs that can be restarted
- B) A CI/CD build farm running automated test suites
- C) A primary production relational database
- D) A distributed video rendering pipeline

**Answer: C** — Spot Instances can be interrupted with only 2 minutes notice; a relational database cannot safely handle sudden termination without risking data corruption or loss, making it fundamentally incompatible with Spot.

## What's Next

Next up: Storage cost optimization — S3 tiering, EBS right-sizing, and data transfer costs.