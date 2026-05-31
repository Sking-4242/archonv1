---
title: "Pillar: Reliability"
type: content
estimated_minutes: 8
cert_tags: ["aws_ccp", "aws_saa", "aws_sap"]
---

# Pillar: Reliability

## Overview

The Reliability pillar focuses on the ability of a workload to perform its intended function correctly and consistently — and to recover from failures. Reliability engineering asks: how does the system behave when things go wrong? And things always go wrong.

## Reliability Design Principles

**Automatically recover from failure:** Use Auto Scaling, health checks, and automatic failover (Multi-AZ RDS, ALB health checks, Route 53 failover) so systems recover without human intervention. **Test recovery procedures:** Don't assume your DR plan works — test it regularly with simulations and chaos engineering. **Scale horizontally:** Replace one large resource with multiple smaller ones to reduce single points of failure and increase aggregate availability. **Stop guessing capacity:** Use Auto Scaling to match capacity to demand instead of over-provisioning for peak. **Manage change in automation:** Use infrastructure as code and automated deployments to eliminate manual change as a reliability risk.

## The Availability Math

Availability is expressed as a percentage of time a system is operational. The five-nines (99.999%) standard means less than 5.3 minutes of downtime per year. How do you achieve high availability? The math of combined components: if two independent systems each have 99% availability, running them in parallel (either can serve traffic) yields 99.99% combined availability. This is why multi-AZ is so powerful — it multiplies availability by reducing correlated failure probability.

AWS's individual service SLAs (EC2: 99.99%, S3: 99.99%, RDS Multi-AZ: 99.95%) are the starting points. Your end-to-end application availability is a product of all components in the critical path.

## Summary

Reliability requires automatic recovery from failure (Auto Scaling, Multi-AZ, health checks), tested recovery procedures (chaos engineering, DR drills), horizontal scaling (eliminate single points of failure), and automated change management. Availability math shows that multi-AZ dramatically improves combined availability by removing correlated failure.

## Examples

A small e-commerce site initially ran their entire application on a single EC2 instance. When that instance failed during a peak shopping period, the site went down for 45 minutes while the team scrambled to launch a replacement. After the incident, they migrated to an Auto Scaling group behind an Application Load Balancer with a minimum of two instances across two Availability Zones. The next time an instance failed, the ALB health check detected it within 30 seconds and stopped routing traffic to it — the site never went down. This is the Reliability pillar's "automatically recover from failure" principle at its most straightforward.

A ride-sharing platform used chaos engineering to validate their reliability assumptions. They ran scheduled "game days" where they would intentionally terminate random EC2 instances, inject latency into database calls, and simulate AZ failures — during business hours, with engineers ready to observe. In one exercise, they discovered their database failover worked, but the application's connection pool was not configured to retry on new connections after a failover event, causing a 90-second outage. Discovering this in a controlled test allowed them to fix it before it affected riders and drivers in production.

A global media company achieving 99.95% availability decided to pursue five-nines (99.999%) for their live sports streaming product. The engineering team worked through the availability math: their CDN layer had 99.99% availability, their origin servers 99.9%, and their authentication service 99.95%. Because these components were in series — each request depended on all three — the combined availability was approximately 99.84%, far short of their target. Understanding the multiplicative effect of serial dependencies led them to redesign the authentication flow to be decoupled and cacheable, dramatically improving end-to-end availability.

## Think About It

1. The Reliability pillar recommends testing recovery procedures regularly with chaos engineering. Many teams resist this because it feels risky. How would you make the case to a risk-averse organization that controlled failure testing actually reduces overall risk?
2. Multi-AZ architectures dramatically improve availability by removing correlated failure risk. What categories of failure does multi-AZ NOT protect against, and what additional architectural choices would address those gaps?
3. "Stop guessing capacity" means using Auto Scaling rather than over-provisioning for peak demand. What are the failure modes of Auto Scaling itself, and how would you design around them?
4. Your application has an availability target of 99.99%. You identify that your payment processing dependency has an SLA of 99.9%. How do you think through whether your overall target is achievable, and what options do you have?
5. Why might a system that recovers automatically from failure be harder to troubleshoot when problems occur, and how would you design your observability to compensate?

## Quick Check

**Q1.** An application runs on a single RDS database instance. Which change most directly improves its reliability according to the Reliability pillar?
- A) Upgrading to a larger RDS instance type
- B) Enabling RDS Multi-AZ deployment
- C) Adding a read replica in the same Availability Zone
- D) Enabling RDS automated backups with a 7-day retention period

**Answer: B** — Multi-AZ creates a synchronous standby replica in a separate AZ and automatically fails over to it if the primary fails — this is the core AWS pattern for database high availability.

**Q2.** Two independent systems each have 99% availability. If traffic can be served by either one (active-active), what is the approximate combined availability?
- A) 99%
- B) 99.9%
- C) 99.99%
- D) 100%

**Answer: C** — When two 99%-available systems operate in parallel, combined unavailability is 0.01 × 0.01 = 0.0001 (0.01%), giving approximately 99.99% combined availability — a demonstration of why redundancy multiplies reliability.

**Q3.** Which AWS service is used to implement automatic traffic rerouting when an EC2 instance fails its health check?
- A) Amazon Route 53 (DNS failover)
- B) AWS Auto Scaling
- C) Application Load Balancer with target group health checks
- D) Both B and C work together to detect failure and replace/route around unhealthy instances

**Answer: D** — The ALB health check stops routing traffic to unhealthy instances immediately, while Auto Scaling detects the unhealthy instance and launches a replacement — these two services work in concert to implement automatic failure recovery.

## What's Next

Next: Performance Efficiency — choosing the right resources for the job and adapting as technology evolves.
