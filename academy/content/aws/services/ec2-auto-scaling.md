---
title: "Amazon EC2 Auto Scaling"
type: content
estimated_minutes: 18
cert_tags: ["CLF-C02", "SAA-C03", "SOA-C03"]
---

# Amazon EC2 Auto Scaling

## Overview

Amazon EC2 Auto Scaling automatically adjusts the number of EC2 instances in a group to match demand — adding instances when load rises, removing them when load falls, and replacing instances that fail. It is the mechanism that makes EC2 workloads elastic, cost-efficient, and self-healing. This *service reference* lesson covers Auto Scaling groups, launch templates, the scaling-policy types, health checks and instance refresh, and what each certification expects.

EC2 Auto Scaling matters because sizing for peak wastes money during troughs, while sizing for average fails under spikes. Auto Scaling resolves the tension by changing capacity dynamically, so you pay for what you need and maintain performance and availability. It also provides **resilience**: if an instance becomes unhealthy it is terminated and replaced, and by spreading instances across multiple Availability Zones the group survives an AZ failure. The core object is the **Auto Scaling group (ASG)**, defined by a **launch template**, a **min/desired/max** size, the AZs/subnets it spans, and the scaling policies and health checks that govern it.

---

## How It Works

An **Auto Scaling group** maintains a number of instances between a **minimum** and **maximum**, targeting a **desired capacity**, launching them from a **launch template** (AMI, instance type(s), security groups, IAM instance profile, user data, and purchase options). The ASG distributes instances across the chosen subnets/AZs and **rebalances** to keep them even.

**Scaling** is driven by policies:

- **Target tracking** — keep a metric at a target (e.g., average CPU at 50%, or ALB request count per target); the simplest and most common, automatically managing the alarms.
- **Step scaling** — add/remove specific capacity in steps tied to CloudWatch alarm breach magnitude.
- **Simple scaling** — a single adjustment per alarm with a cooldown (largely superseded by target/step).
- **Scheduled scaling** — change capacity at known times (e.g., scale up before business hours).
- **Predictive scaling** — uses machine learning on historical patterns to provision capacity *ahead* of forecast demand.

**Health checks** — EC2 status checks plus, when attached, **ELB health checks** (and custom health checks) — let the ASG detect and replace unhealthy instances. The **health check grace period** gives new instances time to boot before checks count.

---

## Key Features

- **Multi-AZ distribution** with automatic rebalancing for high availability.
- **Launch templates** (versioned) supporting **mixed instances policies** — multiple instance types and a blend of **On-Demand and Spot** to optimize cost and availability.
- **Lifecycle hooks** — pause instances entering or leaving service to run actions (warm up, install software, drain connections, copy logs) before they take traffic or terminate.
- **Warm pools** — keep pre-initialized, stopped instances ready to accelerate scale-out for slow-booting apps.
- **Instance refresh** — roll out a new launch-template version (e.g., a new AMI) across the group gradually, with rollback — enabling immutable, zero-downtime deployments.
- **Termination policies** control which instances are removed on scale-in (default favors balancing AZs and the oldest launch template).

---

## Configuration Reference

- **Set min/desired/max** deliberately — min guarantees baseline availability, max caps cost and blast radius.
- **Attach to a load balancer target group** and enable **ELB health checks** so traffic-level failures trigger replacement, not just hardware failures.
- **Use a mixed-instances policy** with Spot for fault-tolerant tiers, keeping a baseline of On-Demand for stability.
- **Tune the health-check grace period** to the app's real startup time to avoid premature termination.

---

## Operations and Troubleshooting

- **Instances launch then terminate in a loop.** Almost always failing health checks — check the ELB health-check path/port/success codes, security groups, the application's real startup time vs. the grace period, and user-data/bootstrap errors.
- **Not scaling as expected.** Verify the scaling policy's metric and target, the CloudWatch alarm state, cooldowns/warm-up settings, and that **max capacity** isn't already reached.
- **Slow scale-out.** Long AMI/bootstrap times delay readiness; use **warm pools** or bake a golden AMI so instances start serving quickly.
- **Uneven AZ distribution** undermines resilience; capacity shortfalls (especially Spot) in one AZ can skew balance — diversify instance types across AZs.

---

## Integrations

EC2 Auto Scaling launches **EC2** instances from **launch templates**, registers them with **Elastic Load Balancing**, scales on **CloudWatch** metrics and alarms, uses **IAM** instance profiles, and emits **lifecycle/EventBridge** events that can trigger **Systems Manager** or **Lambda** for bootstrap and automation. Together with ELB it forms the classic elastic, highly available web tier. The related **Application Auto Scaling** service scales other resources (ECS services, DynamoDB, Aurora replicas, Lambda provisioned concurrency) using the same policy concepts.

---

## Pricing and Cost Considerations

EC2 Auto Scaling itself is **free** — you pay only for the EC2 instances and related resources it launches. Its purpose is in fact to *reduce* cost by removing capacity when it isn't needed: scale in aggressively during low demand, use **Spot via mixed-instances policies** for tolerant tiers, set a sensible **minimum** (don't over-provision the baseline) and **maximum** (cap runaway scale-out), and use **scheduled/predictive** scaling to avoid both over- and under-provisioning. The savings come from matching capacity to real demand rather than provisioning for peak. Underlying instance cost follows EC2 pricing.

---

## Exam Relevance

**CLF-C02:** Know Auto Scaling as the service that automatically adjusts EC2 capacity to demand, supporting elasticity, availability, and cost optimization. Foundational.

**SAA-C03:** Know ASGs with launch templates, the scaling-policy types (especially target tracking and predictive), multi-AZ HA, ELB integration, mixed instances/Spot, and self-healing via health checks — one of the most tested architectures. Design depth.

**SOA-C03:** Operate ASGs — health checks and grace periods, instance refresh for AMI rollout, lifecycle hooks, warm pools, and troubleshooting scaling and launch loops. Operations depth.

---

## Summary

Amazon EC2 Auto Scaling keeps an Auto Scaling group between min and max capacity, launching instances from a versioned launch template across multiple AZs, scaling via target-tracking, step, scheduled, or predictive policies, and self-healing by replacing instances that fail EC2 or ELB health checks. Lifecycle hooks, warm pools, and instance refresh support smooth operations and zero-downtime AMI rollouts, while mixed-instances policies with Spot cut cost. The recurring exam points are the launch-and-terminate loop (failed health checks / grace period), target-tracking vs. predictive scaling, and ELB health checks for true self-healing. It is free to use and pairs with ELB to deliver elastic, highly available, cost-efficient compute.

---

## Quick Check

1. What three capacity values define an Auto Scaling group, and what does each control?
2. Which scaling-policy type keeps a metric at a target value, and which provisions capacity ahead of forecast demand?
3. How do ELB health checks improve self-healing compared to EC2 status checks alone, and what does the grace period prevent?
4. A group keeps launching and terminating instances — what is the most likely cause and what would you check?
5. How can Auto Scaling reduce cost rather than merely maintain availability?

---

## What's Next

Pair this with **Elastic Load Balancing** (the traffic front end), **Amazon EC2** (the instances), and **Amazon CloudWatch** (the scaling signals). For zero-downtime AMI rollouts, see instance refresh alongside the operations cert lessons.
