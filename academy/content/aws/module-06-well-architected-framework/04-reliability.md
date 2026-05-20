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

## What's Next

Next: Performance Efficiency — choosing the right resources for the job and adapting as technology evolves.
