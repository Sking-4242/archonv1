---
title: "Containers on AWS: ECS, EKS, and Fargate"
type: content
estimated_minutes: 13
cert_tags: ["CLF-C02", "SAA-C03", "SAP-C02"]
---

# Containers on AWS: ECS, EKS, and Fargate

## Overview

A container packages application code, runtime, dependencies, and configuration into a single portable unit. The same container image runs identically in a developer's laptop, a CI/CD pipeline, and a production cluster — eliminating the class of bugs that stem from environment differences. AWS offers a complete container platform: Amazon ECR for image storage, Amazon ECS and Amazon EKS for orchestration, and AWS Fargate as a serverless compute engine for both.

The central architectural decision in this module is which orchestration service to use: ECS (AWS's native container orchestrator, simpler and deeply integrated with AWS services) or EKS (managed Kubernetes, portable across clouds and compatible with the broader Kubernetes ecosystem). Overlaid on that choice is the compute decision: EC2 launch type (you manage the worker nodes) or Fargate (AWS manages the compute, you pay per container resource usage). These two dimensions create four combinations, each suited to different team capabilities and workload characteristics.

For the SAA exam, understand the ECS vs. EKS distinction, what Fargate provides, ECR's role, and when each combination is appropriate. SAP adds EKS networking (VPC CNI), ECS service connect, Fargate Spot for cost optimization, and multi-region container deployments. After this lesson, you will be able to map a team's workload and operational profile to the right AWS container configuration and explain why.

---

## Core Concepts

### Why Containers?

Before containers, deploying an application meant configuring a server (or a VM) with the right OS version, runtime version, system libraries, and configuration files. Small differences between environments — a different Python version, a different library path, a different `ulimit` setting — caused failures that were hard to reproduce and harder to debug.

A container solves this by packaging the application and its entire environment into a single image. The Docker image includes: the OS filesystem layer (not the kernel), the runtime (Node.js, Python, JVM), all library dependencies, and the application code. When that image runs on any container runtime, it sees the same environment it was built in.

Container images are built in layers. Each instruction in a Dockerfile adds a layer. Layers are cached and shared — if 50 containers share the same base OS layer, that layer is stored once. This makes images fast to pull and efficient to store.

---

### Amazon ECR

**Amazon Elastic Container Registry (ECR)** is a fully managed private Docker registry. It stores container images and integrates natively with ECS, EKS, Lambda, and AWS CodeBuild — all can pull images from ECR without additional authentication configuration when the correct IAM permissions are in place.

ECR provides:
- **Image scanning**: powered by Amazon Inspector, scans images on push for OS package vulnerabilities (CVEs). Critical and high findings appear in the ECR console and can trigger EventBridge events for automated CI/CD pipeline blocking.
- **Lifecycle policies**: automatically delete images matching conditions (untagged images older than 7 days, images with a specific tag prefix when more than 10 exist). Keeps the registry from accumulating thousands of stale images.
- **Cross-region replication**: replicate images to other regions automatically for multi-region deployments or disaster recovery.
- **Image immutability**: prevent tag overwriting — a tag, once pushed, cannot be reassigned to a different image digest. This is a critical security and reproducibility control.

---

### Amazon ECS

**Elastic Container Service (ECS)** is AWS's native container orchestration service. It manages the scheduling, placement, health checking, and scaling of containers across a cluster of compute resources.

Two key ECS concepts: **Task Definition** and **Service**.

A **Task Definition** is a JSON blueprint for one or more containers: the Docker image, CPU/memory allocation, port mappings, environment variables, IAM task role (permissions the container code has), logging configuration, and volume mounts. Think of it as a pod spec in Kubernetes terms — but simpler.

A **Service** maintains a desired number of running tasks. If a task fails, the service replaces it. Services integrate with ALBs for load balancing, can use Auto Scaling to adjust task count based on CloudWatch metrics, and support rolling deployments (blue/green via CodeDeploy, or rolling update).

ECS is deeply integrated with AWS services: Secrets Manager and Parameter Store for environment variable injection, CloudWatch Logs for logging, IAM for task-level credentials (the task role), Service Connect for service discovery, and AWS App Mesh for advanced traffic management.

---

### Amazon EKS

**Elastic Kubernetes Service (EKS)** is managed Kubernetes. AWS manages the Kubernetes control plane — the API server, etcd (the cluster state store), controller manager, and scheduler — deployed across three Availability Zones with automatic upgrades and patches. You manage (or use Fargate for) the worker nodes.

Use EKS when: your team has existing Kubernetes expertise, you need Kubernetes-specific ecosystem components (Helm charts, custom operators, admission webhooks, CRDs), you are migrating on-premises Kubernetes workloads to AWS, or you need the option to run the same workload on other cloud providers or on-premises Kubernetes.

EKS adds significant operational complexity compared to ECS: you manage Kubernetes version upgrades for worker nodes, configure and maintain cluster add-ons (CoreDNS, kube-proxy, VPC CNI), and deal with Kubernetes's own RBAC on top of IAM. For teams without existing Kubernetes expertise building new AWS-native applications, ECS is almost always the right starting point.

---

### AWS Fargate

**Fargate** is a serverless compute engine for containers. Instead of provisioning and managing EC2 instances as worker nodes, you specify the CPU and memory a task needs and Fargate provisions isolated compute for each task automatically. There are no EC2 instances to patch, no node capacity to plan, and no over-provisioning to worry about.

Fargate works with both ECS and EKS. Pricing is per vCPU-second and GB-second of task resource usage — you pay for actual task runtime, not for the underlying hosts.

Fargate is the best choice for: variable or bursty workloads (pay only for peak periods), teams that want to minimize operational overhead, batch jobs that start and stop, and microservices with unpredictable traffic. For workloads that are densely packed, run continuously at high utilization, and need GPU access, EC2 launch type is often cheaper.

**Fargate Spot** runs Fargate tasks on spare AWS capacity at a 70%+ discount. Tasks can be interrupted with a 2-minute warning. Appropriate for fault-tolerant batch processing, not for customer-facing services.

---

## Configuration Re