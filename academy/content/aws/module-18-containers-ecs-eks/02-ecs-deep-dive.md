---
title: "ECS Deep Dive: Tasks, Services, and Deployments"
type: content
estimated_minutes: 13
cert_tags: ["SAA-C03", "SAP-C02"]
---

# ECS Deep Dive: Tasks, Services, and Deployments

## Overview

The previous lesson established ECS as a container orchestration service. This lesson goes deep on how it actually works: the anatomy of a Task Definition, how Services maintain desired state, how load balancer integration works, how deployments happen without downtime, and how ECS auto-scales in response to demand. These are the operational mechanics that determine whether a production ECS service is reliable, cost-effective, and easy to operate.

The central operational concept in ECS is **desired state reconciliation**. You declare what you want — 5 running tasks using this task definition revision, registered to this target group, in these subnets — and ECS continuously works to make reality match that declaration. If a task fails its health check, ECS replaces it. If the auto-scaler decides 8 tasks are needed, ECS launches 3 more. If you deploy a new task definition revision, ECS orchestrates the transition from old to new according to your deployment configuration.

For the SAA exam, understand task definitions, services, rolling deployments, and ALB integration. SAP adds blue/green deployment mechanics, ECS Service Connect for service-to-service discovery, capacity providers and cluster auto-scaling, and multi-region ECS patterns. After this lesson, you will be able to configure a production ECS service with zero-downtime deployments, ALB integration, and appropriate auto-scaling.

---

## Core Concepts

### Task Definitions

A **Task Definition** is the immutable blueprint for one or more containers. Each update creates a new **revision** (task-definition:1, task-definition:2, etc.). The revision is immutable — once registered, it cannot be edited. This provides an audit trail and ensures rollback is always to a known-good revision.

Key fields in a task definition:
- **Image**: the full ECR or Docker Hub URI including the specific tag or digest (`123456789012.dkr.ecr.us-east-1.amazonaws.com/my-api:abc1234`)
- **CPU and memory**: at the task level (Fargate) and optionally at the container level (EC2)
- **Network mode**: `awsvpc` (required for Fargate, gives each task its own ENI) or `bridge`/`host` (EC2 only)
- **Task execution role**: the IAM role ECS uses to pull images from ECR, write logs to CloudWatch, and retrieve secrets from Secrets Manager
- **Task role**: the IAM role granted to the running container code — what AWS services the application can call
- **Environment variables and secrets**: plain values or references to Secrets Manager and Parameter Store via `valueFrom` (the secret is fetched at task launch, not baked into the image)
- **Log configuration**: `awslogs` driver sends container stdout/stderr to CloudWatch Logs
- **Health check**: a command ECS runs to determine if the container is healthy (separate from the ALB health check)

A **task** is a single running instance of a task definition. ECS schedules tasks onto compute capacity (EC2 instances or Fargate).

---

### ECS Services

An **ECS Service** maintains a desired count of running tasks and manages their lifecycle. The service:
- Launches tasks when running count falls below desired count (health check failure, task crash)
- Registers and deregisters task ENIs with the attached ALB target group as tasks start and stop
- Applies deployment configuration to control how new task definition revisions are rolled out
- Integrates with auto-scaling to adjust desired count based on demand

**Placement strategies** (EC2 launch type only) control how tasks are distributed across EC2 instances:
- **Binpack**: pack tasks as densely as possible onto the fewest instances (minimize cost)
- **Spread**: distribute tasks across AZs and instances (maximize availability)
- **Random**: place tasks randomly

**Capacity providers** associate a service with a compute source. For Fargate, you specify the Fargate or Fargate Spot capacity provider. For EC2, you can use managed scaling with Auto Scaling Groups — ECS automatically adjusts the ASG to match cluster demand.

---

### ALB Integration and Service Connect

ECS Services integrate with ALBs through **target groups**. The service registers each task's ENI and container port as a target when the task starts passing health checks, and deregisters it when the task stops. This happens automatically — you do not manage target group registrations manually.

The ALB sends a health check (HTTP GET to a configured path) to each task periodically. Tasks that fail health checks are removed from the target group and replaced by the service.

**ECS Service Connect** is a managed service discovery and inter-service communication layer. Rather than hard-coding DNS names or using an external service mesh, Service Connect lets services find each other by name within the cluster, with built-in load balancing, retries, and traffic metrics. Service Connect is the recommended approach for service-to-service communication in ECS, replacing manual Cloud Map configuration.

---

### Deployment Strategies

**Rolling update** (default): ECS replaces old tasks with new ones gradually. Two configuration parameters:
- **Minimum healthy percent**: the minimum percentage of desired count that must remain healthy during deployment. At 100%, ECS must launch new tasks and wait for them to be healthy before stopping old ones — zero downtime, requires temporary double capacity.
- **Maximum percent**: the maximum percentage of desired count that can run simultaneously. At 200%, ECS can run double the desired count during deployment.

For zero-downtime rolling deployments: minimum healthy percent = 100%, maximum percent = 200%.

> **Enable the ECS Deployment Circuit Breaker on all production services.** When enabled, ECS automatically rolls back to the previous task definition revision if a deployment fails to place healthy tasks within a threshold — preventing a broken deployment from looping indefinitely. Without the circuit breaker, a deployment that creates crash-looping tasks will keep retrying until you manually intervene. Enable it by setting `deploymentCircuitBreaker.enable = true` and optionally `deploymentCircuitBreaker.rollback = true` in your service configuration. This is an AWS best practice for all ECS service deployments.

**Blue/Green deployment** (via AWS CodeDeploy): deploys the new version (green) as a separate task set registered to a new target group behind the same ALB. Traffic is shifted to green in one of three modes: all-at-once, canary (small percentage first, then all if alarms don't fire), or linear (gradual shift over time). Rollback is a traffic switch back to blue — instant, no container re-deployment required.

Use blue/green when: instant rollback capability is required, canary traffic testing is needed before full rollout, or the service processes financial or sensitive transactions where a few seconds of error-state traffic is unacceptable.

---

### ECS Auto Scaling

ECS Service Auto Scaling adjusts the desired count based on demand:

**Target tracking**: maintain a target value for a metric (CPU utilization at 70%, request count per task at 1,000/minute). ECS automatically scales out when the metric exceeds the target and scales in when it falls below.

**Step scaling**: define specific scaling actions at specific metric thresholds (add 5 tasks when CPU > 80%, add 10 tasks when CPU > 90%).

**Scheduled scaling**: increase desired count before a known traffic event (sports event, marketing campaign, market open).

Scaling out is fast (30–60 seconds for Fargate tasks to start). Scaling in is delayed by the **scale-in cooldown period** (default 300 seconds) to prevent thrashing. For workloads with