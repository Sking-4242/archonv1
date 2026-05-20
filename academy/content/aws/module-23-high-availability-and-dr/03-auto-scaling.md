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

## What's Next

Next up: AWS Resilience Hub and operational resilience testing.