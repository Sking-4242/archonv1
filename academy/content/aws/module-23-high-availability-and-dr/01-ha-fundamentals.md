---
title: "High Availability Fundamentals"
type: content
estimated_minutes: 10
cert_tags: ["SAA-C03", "SAP-C02"]
---

# High Availability Fundamentals

## Overview

High Availability (HA) means designing systems that continue operating during failures — eliminating single points of failure through redundancy. This lesson covers HA design principles, key AWS services for HA, and how to quantify availability targets.

## Availability Math

Availability is expressed as a percentage of time a system is operational. 99% availability = 87.6 hours of downtime per year. 99.9% (three nines) = 8.76 hours/year. 99.99% (four nines) = 52.6 minutes/year. 99.999% (five nines) = 5.26 minutes/year. For a system of N independent components in series (all must work), availability = product of each component's availability. Redundant (parallel) components: availability = 1 - (1 - each component's availability)^N. Adding a second AZ dramatically increases availability even when each AZ is only 99.9% available.

## Eliminating Single Points of Failure

Every single instance, single NAT Gateway, single database, or single region is a SPOF. Eliminate SPOFs by: deploying across multiple AZs (auto scaling groups, Multi-AZ RDS, multi-AZ ECS services behind ALB), using managed services (the service provider manages HA — RDS Multi-AZ, Aurora, EFS, S3, DynamoDB are all HA by design), using load balancers to distribute traffic and health-check instances, and using Route 53 with health checks for DNS-level failover between regions.

## AWS Global Infrastructure for HA

AZs within a region are connected by high-bandwidth, low-latency fiber — traffic between AZs is typically sub-millisecond and cheaper than cross-region. Deploy across 2+ AZs for most workloads. Regions are independent — regional failures are rare but exist. Use Global Accelerator, CloudFront with origin failover, or Route 53 failover routing for cross-region HA. S3, DynamoDB, and IAM are global or multi-region by design.

## Health Checks as HA Mechanism

HA only works if failures are detected and traffic is redirected quickly. ALB health checks detect unhealthy EC2/ECS instances in seconds and stop routing to them. RDS Multi-AZ automatically promotes the standby on primary failure. Route 53 health checks trigger DNS failover. CloudWatch alarms trigger Auto Scaling. Auto Scaling replaces terminated instances. Every layer needs automated health detection — relying on human detection is not HA.

## Summary

HA = redundancy across failure domains (AZs, regions) + automated failure detection + automatic traffic redirection. Eliminate every SPOF. Quantify your availability target and design the redundancy level to meet it. AWS managed services provide built-in HA; for EC2-based workloads, you must architect it explicitly. Health checks at every layer are the mechanism that makes redundancy work.

## Examples

A regional online retailer runs their product catalog on a single EC2 instance in us-east-1. When that instance's disk fails, the store goes dark until the team manually launches a replacement — a classic single point of failure. After learning HA principles, they move to an Auto Scaling Group across two AZs behind an ALB. The next disk failure is invisible to customers: the ALB stops routing to the unhealthy instance within seconds, and the ASG replaces it automatically. This is textbook SPOF elimination using redundancy and health checks.

A mid-size SaaS company calculates that their payment service must maintain four-nines availability (99.99% = 52.6 minutes of downtime per year). They're currently running Multi-AZ RDS (each AZ at 99.95%), which in parallel yields approximately 99.9998% availability for the data tier — well above their target. But their application layer sits on a single EC2 instance. Applying the series multiplication formula, the combined availability drops to roughly 99.9%. Adding a second AZ for the application tier brings the series product back above four nines. This example shows how availability math forces architects to quantify, not just guess.

A global fintech company serving 40 countries uses Route 53 latency-based routing with health checks to split traffic between us-east-1 and eu-west-1. Each region has its own ALB, ASG, and Aurora cluster. Route 53 health checks poll each region's ALB every 10 seconds; if us-east-1 health checks fail, Route 53 automatically shifts all DNS resolution to eu-west-1 within 30–60 seconds. This multi-layer approach — health checks at the DNS layer, the load balancer layer, and the instance layer — illustrates how HA requires automated detection and redirection at every tier, not just redundant hardware.

## Think About It

1. Why is a single NAT Gateway a SPOF even if your EC2 instances are spread across multiple AZs? What would you do to eliminate that SPOF, and what does it cost you?
2. A system has three components in series, each with 99.9% availability. What is the overall system availability? What would happen to that number if one of those components were upgraded to 99.99%?
3. Your team argues that because RDS Multi-AZ handles automatic failover, you no longer need health checks on the application tier. Why is this reasoning flawed?
4. How would you decide whether to use AWS Global Accelerator versus Route 53 failover routing for cross-region HA? What trade-offs does each approach involve?
5. What trade-offs do you accept when you rely exclusively on AWS managed services (Aurora, DynamoDB, S3) for HA rather than designing your own redundancy with EC2?

## Quick Check

**Q1.** A system has two independent components in parallel, each with 99% availability. What is the combined availability?
- A) 99%
- B) 99.99%
- C) 98%
- D) 100%

**Answer: B** — Parallel availability = 1 - (1 - 0.99)^2 = 1 - 0.0001 = 99.99%.

**Q2.** Which AWS service provides DNS-level automated failover between regions?
- A) Application Load Balancer
- B) CloudWatch Alarms
- C) Route 53 with health checks
- D) AWS Global Accelerator

**Answer: C** — Route 53 health checks monitor endpoints and automatically update DNS routing when a health check fails, enabling region-level failover.

**Q3.** What mechanism makes redundancy actually work during an instance failure?
- A) Adding more AZs
- B) Increasing instance size
- C) Automated health checks that detect failure and redirect traffic
- D) Manual monitoring by the operations team

**Answer: C** — Redundancy without automated health detection relies on human reaction time; automated health checks at every layer are what convert redundant infrastructure into true high availability.

## What's Next

Next up: Disaster Recovery — RPO, RTO, and DR strategies from backup-restore to multi-site active-active.