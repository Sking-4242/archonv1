---
title: "Azure Kubernetes Service (AKS) Architecture"
type: content
estimated_minutes: 13
cert_tags: ["az_104", "az_305"]
---

# Azure Kubernetes Service (AKS) Architecture

## Overview

When an application consists of 50 different containerized microservices that need to discover each other, securely communicate, load balance traffic, and automatically heal when they crash, Azure Container Instances (ACI) is not enough. You need an orchestrator. 

Kubernetes is the undisputed industry standard for container orchestration. Managing a Kubernetes cluster from scratch ("the hard way") is notoriously difficult. **Azure Kubernetes Service (AKS)** is a managed offering that abstracts away the most painful administrative tasks. It is the Azure equivalent of AWS EKS.

## The Shared Responsibility of AKS

To understand AKS, you must understand the Kubernetes architecture split: the **Control Plane** and the **Worker Nodes**. 

**1. The Control Plane (Managed by Microsoft)**
The Control Plane is the brain of the cluster. It contains the API Server, the scheduler, and the etcd database holding the cluster state. 
* *The Azure Advantage:* In AKS, Microsoft completely manages the Control Plane. You do not patch it, you do not configure its high availability, and—crucially—**you do not pay for it.** (Unless you opt-in to the Uptime SLA tier for production). The Control Plane is abstracted away entirely.

**2. The Node Pools (Managed by You)**
The worker nodes are the actual Azure Virtual Machines (usually running in a Virtual Machine Scale Set) where your containerized applications (Pods) run. 
* *Your Responsibility:* Because these VMs live in your Azure subscription, you pay for the compute, storage, and networking they consume. You are also responsible for upgrading the Kubernetes version of these nodes (though Azure makes this a one-click operation).

## Networking in AKS (Kubenet vs. Azure CNI)

Networking is the most heavily tested AKS topic on the AZ-104 and AZ-305 exams. When creating a cluster, you must choose between two network plugins. *You cannot change this after the cluster is built.*

**1. Kubenet (Basic Network)**
* **How it works:** The Virtual Network only provides IP addresses to the underlying VM Nodes. The Pods running *inside* the VMs get private IP addresses from a completely separate, logically isolated address space. Traffic leaving the Pod is NAT'd (Network Address Translation) through the Node's IP address.
* **Pros:** Conserves VNet IP addresses. Good for small clusters.
* **Cons:** Pods cannot be directly reached by external on-premises resources via ExpressRoute without complex routing tables.

**2. Azure CNI (Advanced Network)**
* **How it works:** Every single Pod running in the cluster receives its own dedicated IP address directly from the Azure Virtual Network subnet. 
* **Pros:** Pods are first-class citizens on the network. They can communicate directly with on-premises resources, and you can apply standard Network Security Groups (NSGs) directly to them.
* **Cons:** IP Exhaustion. If you have a cluster with 50 nodes, and each node can run 30 pods, you instantly consume 1,500 IP addresses from your VNet. You must mathematically plan your subnets carefully before deploying Azure CNI.

## Summary

Azure Kubernetes Service (AKS) simplifies container orchestration by completely managing the complex Kubernetes Control Plane at no base cost. Architects must manage the underlying worker nodes (Node Pools) where the Pods execute. The most critical architectural decision during deployment is the network plugin: Kubenet (which conserves IPs via NAT) or Azure CNI (which assigns VNet IPs directly to every Pod, requiring massive subnet address spaces).

## What's Next

Kubernetes is powerful, but it requires deep operational expertise to manage YAML manifests and cluster upgrades. What if you want the power of microservices without the overhead of Kubernetes? Next, we explore Azure Container Apps.