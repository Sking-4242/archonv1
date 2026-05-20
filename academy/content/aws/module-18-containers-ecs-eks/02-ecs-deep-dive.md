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

## What's Next

Next up: EKS architecture — nodes, pods, and the managed control plane.