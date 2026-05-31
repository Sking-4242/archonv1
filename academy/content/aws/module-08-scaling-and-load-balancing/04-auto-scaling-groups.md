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

## Examples

A retail company sets their ASG minimum to 2, maximum to 20, and desired to 4. During a normal Tuesday, the ASG runs 4 instances. One instance fails an EC2 status check — its underlying hardware has developed a fault. The ASG detects this within minutes, terminates the unhealthy instance, and launches a replacement in the same subnet. The team doesn't receive a PagerDuty alert and no engineer has to log in — the ASG has maintained the desired count automatically. This automatic instance replacement is valuable even for companies that never need to scale dynamically.

A mobile gaming company deploys a new version of their game server. Instead of updating instances in-place (which risks serving mixed versions during the rollout), they update their Launch Template to point to a new AMI with the patched code and trigger an ASG instance refresh. The ASG replaces instances in batches of 20%, verifying health before proceeding to the next batch. If a new instance fails its ELB health check, the refresh pauses and the team is alerted. The old version continues serving traffic from the remaining untouched instances while the issue is investigated. This is the ASG-native rolling deployment mechanism.

A financial data pipeline company needs every new instance to install a custom monitoring agent, pull secrets from AWS Secrets Manager, and run a 90-second warm-up script before it can serve traffic accurately. They configure a launch lifecycle hook: when the ASG launches a new instance, it pauses in `Pending:Wait`, triggers a Lambda function that runs the initialization steps over SSM Run Command, and only sends a `CONTINUE` signal once the warm-up script exits successfully. The instance enters `InService` and joins the load balancer rotation only after it is genuinely ready — no cold-start traffic errors.

## Think About It

1. An ASG is configured with min=2, max=10, desired=4. A scaling policy tries to scale in to 1 instance during a quiet period. What actually happens, and why is the minimum capacity setting important for availability guarantees?
2. Launch Templates replaced Launch Configurations. If you needed to update the AMI for all instances in an ASG, what two approaches could you take and what are the availability trade-offs of each?
3. Why does the ASG register and deregister instances with the ALB automatically, and what would you have to do manually if ASG did not have this integration? Think through the sequence of events during a scale-out.
4. Lifecycle hooks let you pause an instance before it enters service. What is the risk if your hook's custom initialization script hangs indefinitely? How does AWS protect you from this, and what should you configure?
5. An ASG can use either EC2 health checks or ELB health checks to determine if an instance is unhealthy. What is the practical difference, and when would you want to use ELB health checks instead of (or in addition to) EC2 health checks?

## Quick Check

**Q1.** An Auto Scaling Group is configured with min=3, max=12, desired=6. A scaling event tries to terminate 4 instances simultaneously. How many instances will the ASG actually maintain at minimum?

- A) 2 instances
- B) 3 instances
- C) 6 instances
- D) 0 instances — the scaling policy overrides the minimum

**Answer: B** — The minimum capacity setting is a hard floor. The ASG will never terminate instances below the minimum count, regardless of what a scaling policy requests.

**Q2.** What is the purpose of an ASG Launch Template?

- A) It defines the scaling thresholds that trigger scale-out and scale-in events
- B) It specifies the configuration of EC2 instances the ASG will launch, including AMI, instance type, security groups, and user data
- C) It sets the health check interval and unhealthy threshold for the target group
- D) It defines the subnets across which the ASG distributes instances

**Answer: B** — The Launch Template is the blueprint for every instance the ASG creates, capturing all the instance-level configuration so new instances are launched identically and consistently.

**Q3.** Which ASG feature allows you to run custom initialization logic (such as installing agents or warming a cache) before a new instance begins receiving traffic?

- A) Scheduled scaling
- B) Target tracking policy
- C) Launch lifecycle hook in the `Pending:Wait` state
- D) Cross-zone load balancing

**Answer: C** — A launch lifecycle hook pauses the new instance in `Pending:Wait` before it is registered with the load balancer, giving you a window to run initialization tasks via Lambda or SSM before the instance enters `InService`.

## What's Next

Next: Scaling policies — how ASGs decide when and how much to scale.
