---
title: "Azure Container Apps (ACA): Serverless Microservices"
type: content
estimated_minutes: 11
cert_tags: ["az_104", "az_305"]
---

# Azure Container Apps (ACA): Serverless Microservices

## Overview

There is a massive capability gap in the container ecosystem. 
* **Azure Container Instances (ACI)** is too simple. It lacks service discovery and proper load balancing for complex microservices.
* **Azure Kubernetes Service (AKS)** is too complex. It requires a team of dedicated platform engineers to manage the cluster, network plugins, and YAML manifests.

**Azure Container Apps (ACA)** fills this gap. It is a fully managed, serverless container service designed specifically for building and deploying microservices. You get the benefits of Kubernetes without ever having to touch the Kubernetes API.

## The Architecture of ACA

Under the hood, Azure Container Apps *is* running on AKS. Microsoft simply hides the cluster from you. You deploy your containers into an "Environment," which acts as a secure boundary. 

Inside this Environment, your microservices can seamlessly discover each other, communicate securely, and log to a centralized Log Analytics Workspace. You do not manage VMs, you do not manage Node Pools, and you do not write Kubernetes Deployment YAMLs.

## KEDA: Event-Driven Auto-scaling

The true superpower of ACA is its native integration with **KEDA (Kubernetes Event-driven Autoscaling)**. 

In a traditional App Service, you scale based on CPU or Memory usage. But what if your container processes messages from an Azure Service Bus queue? If 10,000 messages suddenly arrive in the queue, the CPU of your single container might not spike immediately, meaning the auto-scaler won't trigger fast enough, and the queue will back up.

ACA allows you to scale based on *events*, not just CPU. You can tell ACA: "Look at this Service Bus queue. For every 100 messages in the queue, spin up another container." 

Crucially, because ACA is truly serverless, if the queue is empty, ACA can scale your containers down to **Zero**. You pay absolutely nothing when the system is idle. 

## Dapr Integration (Distributed Application Runtime)

Microservice development is hard. How does Service A securely call Service B? How do they handle retries if the network blips? How do they save state?

ACA natively integrates with **Dapr**. Dapr abstracts away the complexity of microservice communication. Instead of the developer writing complex code to authenticate and connect to Azure Key Vault or Azure Service Bus, the developer simply makes a local HTTP call to the Dapr "sidecar" running next to their container, and Dapr handles the heavy lifting.

## The Architectural Decision Matrix

When should an architect recommend which container service?

1. **"I need to run a single, isolated batch job right now without managing servers."** $\rightarrow$ Use **Azure Container Instances (ACI)**.
2. **"I am building a multi-tier microservice application, but my team doesn't know Kubernetes and we want to scale to zero."** $\rightarrow$ Use **Azure Container Apps (ACA)**.
3. **"I need full access to the Kubernetes API, custom service meshes (Istio), and GPU-optimized node pools."** $\rightarrow$ Use **Azure Kubernetes Service (AKS)**.

## Summary

Azure Container Apps (ACA) is the sweet spot for modern microservice architectures. It abstracts the complexity of Kubernetes while retaining its power. Through native integration with KEDA, ACA can scale dynamically based on external events (like queue depth) and scale down to zero to eliminate idle OpEx costs. Architects should default to ACA for new microservice deployments unless strict access to the underlying Kubernetes API is explicitly required.