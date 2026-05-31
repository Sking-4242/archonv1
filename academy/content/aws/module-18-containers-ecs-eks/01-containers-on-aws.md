---
title: "Containers on AWS: ECS, EKS, and Fargate"
type: content
estimated_minutes: 10
cert_tags: ["SAA-C03", "DVA-C02", "CLF-C02"]
---

# Containers on AWS: ECS, EKS, and Fargate

## Overview

AWS offers multiple ways to run containerized workloads: ECS (AWS-native orchestration), EKS (managed Kubernetes), and Fargate (serverless container runtime). This lesson frames the landscape and the key architectural decision between them.

## Why Containers?

Containers package application code, runtime, dependencies, and configuration into a portable, reproducible unit. The same container image runs identically in dev, staging, and production — eliminating 'works on my machine' problems. Containers are more lightweight than VMs: they share the host OS kernel, start in seconds, and achieve higher packing density per host. Docker is the dominant container runtime; images are stored in registries (Amazon ECR, Docker Hub).

## Amazon ECS (Elastic Container Service)

ECS is AWS's native container orchestration service. You define Task Definitions (CPU, memory, image, port mappings, environment variables, IAM role, logging) and Services (how many tasks to run, load balancer attachment, auto-scaling policy). ECS manages scheduling, placement, health checks, and rolling deployments. ECS integrates deeply with AWS services: ALB for load balancing, Secrets Manager for credentials, CloudWatch for logging, IAM for task-level permissions.

## Amazon EKS (Elastic Kubernetes Service)

EKS is a managed Kubernetes control plane. AWS manages the control plane (API server, etcd, scheduler) across 3 AZs with automatic patching. You manage (or use Fargate for) the worker nodes. Use EKS if: your team has existing Kubernetes expertise, you need Kubernetes-specific features (custom controllers, admission webhooks, Helm charts), you're migrating from on-premises Kubernetes, or you need portability across cloud providers. Kubernetes has a steeper learning curve than ECS but a larger ecosystem.

## AWS Fargate: Serverless Containers

Fargate is a serverless compute engine for containers — you run ECS tasks or EKS pods without managing EC2 instances. Specify CPU and memory; Fargate provisions isolated compute for each task automatically. No cluster capacity planning, no patching EC2 worker nodes, no instance over-provisioning. Pay per vCPU-second and GB-second of actual task resource usage. Best for: variable workloads, teams that don't want EC2 management overhead, batch jobs, and microservices with bursty traffic.

## ECR: Elastic Container Registry

ECR is a fully managed Docker registry integrated with IAM, ECS, EKS, Lambda, and CodeBuild. Lifecycle policies automatically delete old or untagged images. ECR image scanning (powered by Inspector) checks images for OS package vulnerabilities on push. Use ECR as your private registry in AWS — it's tightly integrated and eliminates the latency of pulling from Docker Hub in a production environment.

## Summary

AWS containers: ECS for native AWS orchestration, EKS for Kubernetes compatibility, Fargate for serverless execution of both. ECR for private image storage with vulnerability scanning. Choose ECS + Fargate for teams new to containers or prioritizing operational simplicity. Choose EKS for teams with Kubernetes expertise or needing Kubernetes-specific ecosystem.

## Examples

A small e-commerce startup running a monolithic Node.js app on a single EC2 instance decides to containerize it. They build a Docker image, push it to ECR, and run it as an ECS Fargate task. Nothing changes in the code — but now the same image is used in dev, staging, and production, eliminating the classic "it works on my laptop" bug that previously cost hours per deploy. This is the most direct illustration of why containers exist: environment consistency through packaging.

A mid-sized media company needs to migrate its on-premises Kubernetes workloads to AWS. Rather than re-learning a new orchestration model, they adopt EKS. Their existing Helm charts, custom operators, and RBAC configurations transfer with minimal changes. EKS manages the control plane — they keep their Kubernetes expertise and tooling while offloading the burden of running etcd clusters and API server upgrades. This shows when EKS wins over ECS: existing Kubernetes investment and portability requirements.

A fintech company runs a fraud-detection pipeline that processes millions of transactions in bursts around paydays, then sits near-idle the rest of the month. They model it as ECS tasks on Fargate. During burst periods, dozens of tasks spin up in seconds; during off-peak hours, desired count drops to two. Because Fargate bills per vCPU-second, they pay for actual execution time rather than keeping EC2 instances warm. The packing-density and billing model make Fargate compelling specifically for this shape of workload — high variance, unpredictable peaks.

## Think About It

1. Why might a team with strong Kubernetes expertise still choose ECS over EKS for a greenfield project on AWS?
2. What would happen if you used `latest` as the image tag in a production ECS task definition? Trace through a deployment scenario where this causes an unintended rollback.
3. How would you decide whether to store your container images in ECR versus Docker Hub for a team of five engineers shipping to AWS? What changes if the team grows to fifty engineers across multiple AWS accounts?
4. Fargate charges per vCPU-second and GB-second of task resource usage. Under what workload pattern would EC2 launch type actually cost less than Fargate, and how would you model that decision?
5. ECR vulnerability scanning flags a critical CVE in the base OS package of an image your service has been running in production for two weeks. What is the right sequence of actions, and who in the organization needs to be involved?

## Quick Check

**Q1.** Which AWS service manages the Kubernetes control plane, including the API server and etcd, so that you do not have to?
- A) Amazon ECS
- B) AWS Fargate
- C) Amazon EKS
- D) Amazon ECR

**Answer: C** — EKS is the managed Kubernetes service; AWS runs the control plane across three Availability Zones with automatic patching.

**Q2.** A team wants to run containerized batch jobs without managing any EC2 instances. Which compute model should they use?
- A) ECS with EC2 launch type
- B) ECS or EKS with Fargate
- C) Self-managed Kubernetes on EC2
- D) AWS Lambda

**Answer: B** — Fargate is the serverless compute engine for containers that removes EC2 instance management from both ECS and EKS workloads.

**Q3.** What is the primary purpose of ECR Lifecycle Policies?
- A) To control which IAM users can pull images
- B) To automatically delete old or untagged images and reduce registry size
- C) To replicate images across AWS Regions
- D) To enforce image signing before deployment

**Answer: B** — ECR Lifecycle Policies automate the cleanup of stale and untagged images, which also reduces the attack surface of the registry.

## What's Next

Next up: ECS Deep Dive — task definitions, services, and deployment strategies.