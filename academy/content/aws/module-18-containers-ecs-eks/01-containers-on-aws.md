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

## What's Next

Next up: ECS Deep Dive — task definitions, services, and deployment strategies.