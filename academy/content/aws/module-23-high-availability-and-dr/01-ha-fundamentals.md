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

## What's Next

Next up: Disaster Recovery — RPO, RTO, and DR strategies from backup-restore to multi-site active-active.