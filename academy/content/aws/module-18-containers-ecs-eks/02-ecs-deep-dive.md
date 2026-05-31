---
title: "ECS Deep Dive: Tasks, Services, and Deployments"
type: content
estimated_minutes: 10
cert_tags: ["SAA-C03", "DVA-C02"]
---

# ECS Deep Dive: Tasks, Services, and Deployments

## Overview

This lesson goes deep on ECS architecture: how task definitions and services work, how ECS integrates with ALB, and how to roll out updates with zero downtime using rolling and blue/green deployment strategies.

## Task Definitions

A task definition is a blueprint for one or more containers: Docker image URI (from ECR or Docker Hub), CPU and memory allocations, port mappings, environment variables, secrets (from Secrets Manager or Parameter Store via `valueFrom`), log configuration (CloudWatch Logs driver), IAM Task Role (permissions for the running container), and health check command. Versions (revisions) are immutable — each update creates a new revision. A task is a running instance of a task definition.

## ECS Services

An ECS Service maintains a desired count of running tasks, replaces unhealthy tasks, registers tasks with a load balancer, and applies deployment configuration. Service configuration includes: task definition revision, desired count, placement strategy (binpack, spread, random), capacity provider (Fargate, Fargate Spot, EC2), and deployment type. Services support auto-scaling: CPU/memory target tracking, scheduled scaling, and step scaling based on CloudWatch metrics.

## Load Balancer Integration

Attach an ALB (for HTTP/HTTPS), NLB (for TCP), or no load balancer to an ECS service. ECS registers and deregisters task ENIs automatically as tasks start and stop. Use dynamic port mapping (hostPort=0) for EC2 launch type to let multiple tasks of the same service run on one instance using different host ports — the ALB target group handles routing. With Fargate, each task gets its own ENI and a dedicated port.

## Rolling vs. Blue/Green Deployments

Rolling deployment (default): ECS replaces old tasks with new ones gradually. Configure minimum healthy percent (keep N% of old tasks during deploy) and maximum percent (allow up to N% above desired count). Blue/Green deployment (via CodeDeploy): deploys the new version as a separate 'green' target group behind the ALB, runs health checks and optional canary traffic shift, then switches all traffic at once. Blue/Green enables instant rollback by switching traffic back to the blue group. Best for production services where rollback speed matters.

## Summary

Task definitions blueprint containers; services maintain desired count, handle load balancer registration, and apply deployment strategy. Rolling updates suit most services; blue/green via CodeDeploy enables instant rollback. ALB integration registers tasks automatically. Fargate eliminates EC2 cluster management — use it as the default launch type for new ECS services.

## Examples

A SaaS company runs a REST API as an ECS service behind an ALB. When they ship a new feature, they trigger a rolling deployment configured with minimum healthy percent at 100% and maximum percent at 200%. ECS launches new task instances first, waits until the ALB health check passes, then terminates old ones. Because the minimum healthy threshold is 100%, no capacity is removed before replacements are healthy — users experience zero downtime during a weekday release.

A payments platform needs to deploy a critical pricing-engine update with the ability to roll back in under a minute if error rates spike. They adopt blue/green deployments via CodeDeploy: the new version is deployed to a "green" target group, canary traffic (10%) is shifted to green for five minutes, and CloudWatch alarms monitor 5xx rates. If an alarm fires, CodeDeploy switches all traffic back to the blue target group instantly. This scenario illustrates exactly why blue/green exists — the rollback is a traffic switch, not a re-deployment.

A data-processing company uses ECS task definitions with secrets referenced via `valueFrom` pointing to SSM Parameter Store paths. When the database password is rotated in Secrets Manager, the old task definition revision still holds the previous ARN reference — but since revisions are immutable, they create a new task definition revision pointing to the updated secret. The service is updated to the new revision. This shows how task definition immutability interacts with operational practices: secret rotation requires a new revision and a service update, not an in-place edit.

## Think About It

1. Why are task definition revisions immutable rather than editable in place? What operational or audit benefit does immutability provide?
2. What would happen if you set minimum healthy percent to 0% and maximum percent to 100% during a rolling deployment? Describe the failure mode this creates for a user-facing API.
3. How would you decide between a rolling deployment and a blue/green deployment for a service that processes financial transactions? What specific properties of each strategy are relevant to that decision?
4. An ECS service is configured with target tracking auto-scaling on CPU at 70%. A sudden traffic spike hits and CPU jumps to 90% — but new tasks take 45 seconds to start and register with the ALB. What architectural options exist to reduce the time-to-capacity gap?
5. A task definition references an environment variable for the database hostname directly in the definition. What are the trade-offs of this approach versus using AWS Systems Manager Parameter Store, and under what conditions does each become the right choice?

## Quick Check

**Q1.** In ECS, what is the relationship between a task definition and a task?
- A) A task definition is a running instance; a task is the blueprint
- B) A task is a running instance of a task definition
- C) They are the same concept — the terms are interchangeable
- D) A task definition is specific to Fargate; a task is for EC2 launch type

**Answer: B** — A task definition is the immutable blueprint (image, CPU, memory, IAM role, etc.), and a task is a single running instance of that blueprint.

**Q2.** Which ECS deployment strategy enables the fastest rollback by switching traffic between target groups rather than re-deploying containers?
- A) Rolling deployment with 100% minimum healthy percent
- B) In-place deployment via ECS console
- C) Blue/green deployment via AWS CodeDeploy
- D) Canary deployment via ALB weighted routing alone

**Answer: C** — Blue/green deployments keep the old version running in a separate target group; rollback is a traffic switch with no new container launches required.

**Q3.** What does dynamic port mapping (hostPort=0) accomplish on an EC2 ECS launch type?
- A) It exposes all container ports to the public internet
- B) It allows multiple tasks of the same service to run on one EC2 instance using different host ports
- C) It disables port mapping and relies on service discovery only
- D) It binds the container to port 80 automatically

**Answer: B** — With hostPort=0, the EC2 host assigns a random available port per task, allowing multiple task instances to run on the same EC2 host without port conflicts; the ALB handles routing.

## What's Next

Next up: EKS architecture — nodes, pods, and the managed control plane.