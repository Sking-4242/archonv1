---
title: "The Container Ecosystem: ACR and ACI"
type: content
estimated_minutes: 10
cert_tags: ["az_104", "az_305"]
---

# The Container Ecosystem: ACR and ACI

## Overview

Containers have revolutionized software deployment by packaging application code, runtime, and system libraries into a single, immutable artifact. If it runs on the developer's laptop, it will run exactly the same way in the cloud.

However, once you build a container image, you need a secure place to store it, and a compute engine to run it. Azure provides a tiered ecosystem for this. We begin with the foundational elements: the vault where images are stored (**Azure Container Registry**) and the simplest way to execute them (**Azure Container Instances**).

## Azure Container Registry (ACR)

Before you can run a container in Azure, it must be stored in a registry. While you *could* pull images directly from the public Docker Hub, doing so in an enterprise production environment is a massive security risk (supply chain attacks, rate limiting, and data exfiltration).

**Azure Container Registry (ACR)** is a managed, private Docker registry. It is the direct equivalent to AWS Elastic Container Registry (ECR).

**Architectural Features:**
* **Network Security:** ACR Premium tier supports **Private Link**. This allows your Virtual Networks to pull container images securely over the Microsoft backbone without the traffic ever traversing the public internet.
* **Geo-Replication:** If you have an application deployed in `East US` and `Japan East`, pulling a 1GB container image from the US to Japan will cause massive latency during auto-scaling events. ACR allows turnkey geo-replication. You push the image once to a single registry, and Azure automatically distributes it to regional nodes globally.
* **Security Scanning:** ACR integrates directly with Microsoft Defender for Cloud to automatically scan pushed images for known CVEs (Common Vulnerabilities and Exposures) before they are ever deployed.

## Azure Container Instances (ACI)

Once the image is in ACR, you need to run it. If you just need to run a single container for a batch processing job, spinning up an entire Virtual Machine, installing the Docker daemon, and managing the OS is administrative overkill.

**Azure Container Instances (ACI)** is "Containers as a Service." It is the Azure equivalent to AWS Fargate. 

**How it Works:**
You do not provision a Virtual Machine. You simply point ACI at your container image in ACR, specify how much CPU and RAM it needs, and Azure runs it. You are billed by the second for the memory and CPU consumed.

**Architectural Use Cases:**
* **Task Automation:** Running a Python script that wakes up once a day, processes files in Blob Storage, and shuts down.
* **Burst Compute:** ACI is frequently used as a "burst" node for Azure Kubernetes Service (AKS). If the primary AKS cluster runs out of capacity, it can rapidly spin up pods in ACI to handle the traffic spike without waiting for a new underlying VM to boot.

## Summary

In enterprise architectures, container images must be stored privately and securely. Azure Container Registry (ACR) provides that vault, offering geo-replication for global performance and Private Link for network isolation. To run simple, isolated containers without managing any underlying infrastructure, architects use Azure Container Instances (ACI), a serverless container engine billed by the second.

## What's Next

ACI is perfect for a single container, but modern applications are built on dozens of interconnected microservices. Next, we will explore the industry standard for orchestrating them: Azure Kubernetes Service (AKS).