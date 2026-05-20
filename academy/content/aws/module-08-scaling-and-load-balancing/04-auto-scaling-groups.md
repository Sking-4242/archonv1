---
title: "Auto Scaling Groups"
type: content
estimated_minutes: 9
cert_tags: ["aws_ccp", "aws_saa", "aws_soa"]
---

# Auto Scaling Groups

## Overview

Auto Scaling Groups (ASGs) automatically manage a fleet of EC2 instances, scaling out (adding instances) when demand increases and scaling in (removing instances) when demand decreases. ASGs are the core elasticity mechanism for EC2-based workloads and a foundational component of every production architecture.

## ASG Configuration

An ASG is configured with: **Launch Template** (defines what instance to launch — AMI, type, security group, IAM role, user data), **Min/Max/Desired capacity** (min prevents scale-in below a floor; max prevents runaway scaling; desired is the target the ASG maintains when no scaling policy is active), **VPC and Subnets** (ASG places instances across specified subnets — use subnets in multiple AZs for multi-AZ deployment), and **Load Balancer** (optional — the ASG registers and deregisters instances with the target group automatically).

ASGs maintain the desired capacity continuously — if an instance fails its health check (ELB health check or EC2 status check), the ASG terminates it and launches a replacement. This automatic instance replacement is a critical reliability feature even if you never need to scale.

## ASG Lifecycle Hooks

Lifecycle hooks let you pause instance launch or termination to run custom actions. **Launch hook:** When a new instance is launched, the ASG pauses it in a 'Pending:Wait' state before registering it with the load balancer. Your hook runs (install agents, warm a cache, run integration tests) and completes the lifecycle action. Only then does the instance enter 'InService'. **Termination hook:** When scale-in triggers, the ASG pauses the instance in 'Terminating:Wait'. Your hook drains connections, uploads logs, deregisters from external services, then completes the action.

Lifecycle hooks are the mechanism for ensuring instances are fully ready before receiving traffic and for gracefully shutting down before termination.

## Summary

ASGs maintain a fleet of EC2 instances between min and max capacity, replacing failed instances automatically. They integrate with ALB for seamless scale-out (register new instances) and scale-in (drain connections before deregistration). Launch Templates define what to launch. Lifecycle hooks enable custom initialization and termination logic. ASGs are non-negotiable for production EC2 workloads.

## What's Next

Next: Scaling policies — how ASGs decide when and how much to scale.
