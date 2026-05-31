---
title: "Auto Scaling: Dynamic Capacity Management"
type: content
estimated_minutes: 10
cert_tags: ["SAA-C03", "SAP-C02"]
---

# Auto Scaling: Dynamic Capacity Management

## Overview

Auto Scaling automatically adjusts capacity to maintain performance during demand peaks and reduce cost during low-demand periods. This lesson covers EC2 Auto Scaling policies, predictive scaling, and how Auto Scaling contributes to both HA and cost optimization.

## Auto Scaling Groups (ASG)

An ASG defines a fleet of EC2 instances with: minimum capacity (floor — never scale below), maximum capacity (ceiling), desired capacity (current target). A Launch Template defines the instance configuration (AMI, instance type, security group, IAM role, user data). The ASG maintains desired capacity, replaces unhealthy instances, distributes instances across AZs, and adjusts capacity based on scaling policies.

## Scaling Policies

Target Tracking: the simplest — maintain a metric at a target value (e.g., 'keep average CPU at 50%'). ASG automatically adds or removes instances to hold the target. Step Scaling: define step adjustments based on metric threshold breaches (e.g., add 2 instances when CPU > 60%; add 4 when CPU > 80%). Scheduled Scaling: scale on a time schedule (scale out every Monday morning, scale in late Friday evening — for workloads with known traffic patterns). Cooldown period prevents rapid oscillation — default 300 seconds after a scaling activity before the next one.

## Predictive Scaling

Predictive Scaling analyzes historical traffic patterns and proactively adds capacity before anticipated demand spikes. It uses ML to forecast the load 2 days ahead. Example: traffic spikes every weekday at 9am — Predictive Scaling starts adding instances at 8:45am so they're available when the spike hits, avoiding the cold start penalty. Combine Predictive (for anticipated patterns) with Target Tracking (for unexpected spikes) for comprehensive coverage.

## ASG and Load Balancers for HA

Attach an ALB to an ASG — the ASG registers and deregisters instances from the ALB target group automatically. With the ALB health check: if an instance fails, the ALB stops routing to it and the ASG replaces it. This is the foundation of the self-healing application tier — a failed instance is automatically replaced and traffic continues to the healthy instances without manual intervention. Minimum 2 instances in an ASG (one per AZ) is the baseline HA configuration.

## Summary

Auto Scaling maintains desired capacity, replaces unhealthy instances, and adjusts to demand. Target Tracking is the default for CPU-based scaling. Scheduled scaling handles predictable patterns; Predictive Scaling anticipates them proactively. Attach ASGs to ALBs for self-healing fleets. Set minimum capacity ≥ 2 (across 2+ AZs) for any production workload.

## Examples

A small media company runs a blog that gets consistent but modest traffic — around 2,000 requests per hour throughout the day. They configure an Auto Scaling Group with a minimum of 2 instances and a Target Tracking policy set to keep average CPU at 50%. When a post goes unexpectedly viral and traffic triples, the ASG adds instances within minutes to absorb the load, then removes them an hour later once traffic normalizes. The engineering team did nothing — this is the self-managing property of Target Tracking, the simplest policy and the right starting point for any team new to Auto Scaling.

An ed-tech platform serving K-12 schools knows with certainty that traffic surges every weekday morning when students log in at 8:00 AM and drops sharply after 3:30 PM. Traffic on weekends is near-zero. They combine Scheduled Scaling (scale out to 20 instances at 7:45 AM weekdays, scale in to 4 at 4:00 PM) with Target Tracking (CPU target 60%) to handle unexpected load within the school day. The scheduled actions ensure capacity is available before the morning surge hits — avoiding the cold-start lag that Target Tracking alone would produce during a rapid ramp.

A large SaaS company running a customer support platform used Predictive Scaling after noticing that reactive Target Tracking was consistently too slow on Monday mornings — the first hour of the week saw significant queue build-up before Auto Scaling caught up. After enabling Predictive Scaling with two weeks of historical data, the ML model identified the Monday pattern and began pre-provisioning instances at 7:45 AM, 15 minutes before the surge. The team discovered that Predictive and Target Tracking complement each other: Predictive handles the known weekly cycle, while Target Tracking handles one-off spikes like a major marketing email blast.

## Think About It

1. Why does setting the minimum capacity of an ASG to 1 instead of 2 undermine high availability, even if the ASG is configured to span two AZs?
2. What would happen if you set your Target Tracking CPU target to 90% instead of 50%? What are the performance and cost implications of each choice?
3. The default cooldown period is 300 seconds. If your application experiences sharp, brief traffic spikes lasting 60 seconds, how might the default cooldown hurt you — and how might lowering it hurt you in a different way?
4. How would you decide between using Predictive Scaling alone versus combining it with Target Tracking? What failure mode does each policy protect against that the other does not?
5. Your ASG is attached to an ALB and an instance fails its ALB health check. Walk through exactly what happens next — what does each service do, in what order, and how long does each step take?

## Quick Check

**Q1.** Which Auto Scaling policy type automatically adjusts capacity to keep a metric like average CPU at a specified value?
- A) Step Scaling
- B) Scheduled Scaling
- C) Target Tracking
- D) Predictive Scaling

**Answer: C** — Target Tracking continuously monitors the chosen metric and adds or removes instances automatically to maintain the configured target value, without requiring manual threshold definitions.

**Q2.** What is the primary advantage of Predictive Scaling over Target Tracking for workloads with known daily traffic patterns?
- A) It is cheaper to enable
- B) It provisions capacity before the demand spike arrives, avoiding cold-start lag
- C) It replaces unhealthy instances faster
- D) It works without a Launch Template

**Answer: B** — Predictive Scaling uses ML to forecast demand and adds instances proactively, so capacity is ready when the spike hits rather than reacting after CPU has already climbed.

**Q3.** What is the minimum recommended number of instances in a production Auto Scaling Group, and why?
- A) 1 — the ASG will replace it if it fails
- B) 2 across 2 AZs — ensures traffic continues if one instance or AZ fails
- C) 3 — required for ALB health checks to function
- D) 4 — the minimum for Target Tracking to calculate averages

**Answer: B** — With only one instance, there is no redundancy; a failure takes the application offline until the ASG replacement is ready. Two instances across two AZs ensures traffic can continue on the surviving instance while the replacement launches.

## What's Next

Next up: AWS Resilience Hub and operational resilience testing.