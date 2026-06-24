---
title: "Scaling and High-Availability Operations"
type: content
estimated_minutes: 15
cert_tags: ["SOA-C03"]
---

# Scaling and High-Availability Operations

## Overview

Reliability and Business Continuity is 22% of the SOA-C03 exam, and its first two tasks are about *operating* scalability, elasticity, and high availability — configuring Auto Scaling, managing load balancer and Route 53 health checks, and running fault-tolerant Multi-AZ systems. Where the architecture exam asks you to *design* these, the CloudOps exam asks you to *configure, troubleshoot, and keep them working*: "instances aren't scaling, why?", "the load balancer marks healthy targets unhealthy, why?", "how do you make this database survive an AZ failure?".

The operational principle is **elasticity and redundancy that actually function under load and failure**. An Auto Scaling group that's misconfigured won't add capacity when demand spikes; a health check pointed at the wrong path will pull healthy instances out of service or send traffic to broken ones; a single-AZ deployment will go down when that AZ does. CloudOps engineers make these mechanisms reliable by configuring the right scaling policies, getting health checks correct, and deploying across Availability Zones. This lesson collects the operational scaling and HA knowledge — Auto Scaling behavior, ELB and Route 53 health checks, caching for scalability, database scaling, and Multi-AZ — that the exam tests through configuration and troubleshooting scenarios.

After it you will be able to operate and troubleshoot scaling, health checks, and high-availability configurations.

## Core Concepts

### Auto Scaling Operations

**EC2 Auto Scaling** maintains a desired number of instances and scales based on policies. Operationally, you configure: **minimum/desired/maximum** capacity, a **launch template** (the instance configuration), and **scaling policies** — **target tracking** (keep a metric like average CPU at a target, the recommended default), **step scaling** (add/remove capacity in steps based on alarm breach size), **simple scaling**, and **scheduled scaling** (for predictable load). The group spreads instances across **multiple Availability Zones** for resilience and replaces unhealthy instances automatically. Common operational issues: instances not scaling (a wrong metric, a too-high threshold, or **cooldown** suppressing actions), or instances launching and immediately terminating (a failing **health check** or launch error). The exam pairs "keep utilization at a target" with target tracking, "scale at known times" with scheduled scaling, and "scaling isn't happening" with policy/cooldown/health-check misconfiguration.

### ELB and Route 53 Health Checks — A Top Troubleshooting Topic

Health checks decide which targets receive traffic, and misconfigured health checks are one of the most common CloudOps problems. An **ELB health check** probes a target on a configured **protocol, port, and path**, with thresholds (healthy/unhealthy count, interval, timeout) and a **success matcher** (e.g., HTTP 200). If the path returns a non-matching code, the target is marked **unhealthy** and removed — so a health check pointed at a path that requires auth, or returns 302/403, will pull healthy instances out of service. The exam's frequent scenario: "the ALB shows targets as unhealthy even though the app works" → the **health-check path/port/matcher is wrong**, the **security group** doesn't allow the load balancer to reach the target, or the app isn't listening on the checked port. **Route 53 health checks** monitor endpoints for DNS failover (route away from an unhealthy endpoint). Troubleshooting health checks — path, port, matcher, timeout, and the security-group path from LB to target — is a guaranteed exam skill.

### Caching for Scalability

The exam (Task 2.1) calls out **caching to enhance dynamic scalability**: **Amazon CloudFront** caches content at the edge, offloading origins and absorbing traffic spikes, and **Amazon ElastiCache** caches database reads (and sessions) in memory, relieving the database under load. Operationally, caching is a scalability lever — it lets the backend handle more users without scaling the origin or database linearly. The exam pairs "reduce load on the origin/database to scale" with CloudFront (edge) and ElastiCache (in-memory).

### Scaling Managed Databases

Databases scale differently from stateless compute, and the exam names the mechanisms. **Amazon RDS** scales reads with **read replicas** and can change instance size (with downtime unless Multi-AZ), while **Aurora** offers Auto Scaling for replicas and Aurora Serverless for automatic capacity. **Amazon DynamoDB** scales with **on-demand** capacity (automatic) or **provisioned capacity with Auto Scaling** (target utilization). The operational decisions: read-heavy RDS → read replicas; spiky/unpredictable DynamoDB → on-demand; steady DynamoDB → provisioned with auto scaling. The exam pairs database-scaling symptoms with these specific mechanisms.

### Multi-AZ and Fault Tolerance

**Multi-AZ** is the baseline for high availability: deploying across at least two Availability Zones so the failure of one AZ doesn't take down the system. Operationally: **RDS Multi-AZ** maintains a synchronous standby in another AZ with automatic failover; **Auto Scaling groups** and **load balancers** span AZs; and stateless tiers behind an ELB tolerate instance and AZ loss. The exam pairs "survive an AZ failure / automatic failover" with Multi-AZ deployments, and expects you to recognize a single-AZ design as the reliability flaw when a question describes downtime from one AZ's failure.

### Operating for Continuous Availability

Putting it together, a reliable operational setup is: an Auto Scaling group across multiple AZs behind a load balancer with correct health checks, target-tracking scaling on the right metric, Multi-AZ databases with read replicas for read load, and caching (CloudFront/ElastiCache) to absorb spikes. CloudOps work is keeping this functioning — verifying health checks, tuning scaling policies, and confirming AZ redundancy — and troubleshooting when capacity or failover doesn't behave. The exam rewards recognizing the misconfigured piece in such a setup.

## Configuration Reference

Auto Scaling policies:

```text
Target tracking   keep a metric at a target (e.g., 50% CPU) — recommended default
Step scaling      add/remove capacity by steps based on alarm breach size
Scheduled         scale at known times (predictable load)
min/desired/max + launch template; spread across AZs; auto-replace unhealthy
"not scaling" → wrong metric/threshold, cooldown, or failing health check
```

Health-check troubleshooting (ELB):

```text
Check: protocol · port · path · success matcher (e.g., HTTP 200) · interval/timeout/thresholds
"healthy app, unhealthy targets" → wrong path/port/matcher, or security group blocks LB→target,
   or app not listening on the checked port
Route 53 health checks → DNS failover away from unhealthy endpoints
```

Scaling and HA mechanisms:

```text
Caching for scale     CloudFront (edge) · ElastiCache (in-memory DB cache)
RDS scaling           read replicas (reads) · instance resize · Aurora auto scaling
DynamoDB scaling      on-demand (spiky) · provisioned + auto scaling (steady)
Multi-AZ              RDS Multi-AZ (sync standby, auto failover) · ASG/ELB across AZs
```

## How to Decide

- **Keep utilization at a target?** → target-tracking scaling. **Predictable load?** → scheduled. **Granular response to breach size?** → step scaling.
- **Targets unhealthy but app works?** → check health-check path/port/matcher and the LB→target security group.
- **Absorb traffic spikes without scaling the backend?** → CloudFront (edge) / ElastiCache (DB cache).
- **Scale a read-heavy RDS?** → read replicas. **Spiky DynamoDB?** → on-demand. **Steady DynamoDB?** → provisioned + auto scaling.
- **Survive an AZ failure with automatic failover?** → Multi-AZ.

## How This Connects

This lesson operationalizes the shared scaling/load-balancing and HA/DR lessons for the CloudOps reliability domain, building on monitoring (scaling is driven by CloudWatch metrics/alarms) and feeding the next lesson on backup and DR. Health-check troubleshooting connects to the networking domain (security groups, target reachability), and caching connects to the performance lesson.

## Exam Traps

- **Misconfigured health-check path/matcher** pulling healthy targets out of service — the top reliability-troubleshooting trap.
- **Forgetting the LB→target security group** as a cause of "unhealthy" targets.
- **Scaling not happening** due to cooldown, a wrong metric, or a too-high threshold.
- **Single-AZ deployments** presented as the cause of downtime — the fix is Multi-AZ.
- **Read replicas vs. instance resize.** Replicas scale reads; they don't increase write capacity.
- **Wrong DynamoDB capacity mode.** On-demand for spiky/unpredictable; provisioned+auto-scaling for steady.

## Summary

Operating for reliability means making elasticity and redundancy actually work. Auto Scaling maintains capacity across AZs using target-tracking (default), step, or scheduled policies, and "not scaling" usually traces to a wrong metric/threshold, cooldown, or a failing health check. Health checks are a top troubleshooting area: when an app works but targets show unhealthy, suspect the health-check path/port/matcher or a security group blocking the load balancer from reaching the target; Route 53 health checks drive DNS failover. Caching (CloudFront at the edge, ElastiCache in memory) scales the backend by absorbing load, and databases scale via RDS read replicas, Aurora auto scaling, or DynamoDB on-demand/provisioned-with-auto-scaling. Multi-AZ is the baseline for surviving an AZ failure with automatic failover. The CloudOps job is keeping these configured correctly and diagnosing the misconfigured piece.

## Examples

**Example 1 — Unhealthy targets.** An ALB marks working instances unhealthy → the health-check path returns 302 (redirect) not 200; fix the **path/matcher** (and confirm the LB→target security group).

**Example 2 — No scale-out.** CPU is pegged but no instances launch → the scaling policy watches the wrong metric or a long **cooldown** suppresses it; correct the policy.

**Example 3 — AZ outage downtime.** A database goes down when one AZ fails → it was **single-AZ**; enable **RDS Multi-AZ** for synchronous standby and automatic failover.

**Example 4 — Spike absorption.** A read-heavy app overwhelms RDS during peaks → add **ElastiCache** (and CloudFront for static content) to offload load without scaling the database linearly.

## Think About It

An Application Load Balancer reports half of a healthy Auto Scaling group's instances as unhealthy, and the group keeps launching replacements that also go unhealthy. Walk through the health-check settings and network path you'd inspect, explain how a single wrong setting can cause both the false-unhealthy status and the launch-terminate loop, and name the metric you'd watch to confirm the fix.

## Quick Check

1. Which Auto Scaling policy type keeps a metric at a target value, and which suits predictable load?
2. An app works but the load balancer shows targets unhealthy — what are the two most likely causes?
3. How does caching improve scalability, and which two services provide it?
4. What does Multi-AZ provide, and what's the telltale sign a design lacks it?

*Answers: (1) target tracking keeps a metric (e.g., CPU) at a target; scheduled scaling suits predictable load; (2) the health-check configuration is wrong (path/port/success matcher) or a security group blocks the load balancer from reaching the target (also: app not listening on the checked port); (3) caching offloads origins/databases so the backend serves more load without scaling linearly — CloudFront caches at the edge and ElastiCache caches in memory; (4) Multi-AZ provides redundancy across Availability Zones with automatic failover (e.g., RDS synchronous standby); the telltale sign it's missing is downtime caused by a single AZ's failure.*

## What's Next

Next: **Backup, Restore, and Disaster Recovery Operations** — automating backups, restoring to meet RTO/RPO, versioning, and DR procedures.
