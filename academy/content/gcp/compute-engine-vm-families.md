---
title: "Compute Engine VM Families"
type: content
estimated_minutes: 10
cert_tags: ["cdl", "ace", "pca"]
---

# Compute Engine VM Families

## Overview

Google Compute Engine (GCE) is the foundational Infrastructure as a Service (IaaS) offering in GCP, equivalent to AWS EC2 or Azure Virtual Machines. 

Like its competitors, Google organizes its hardware fleet into specific "Machine Families" optimized for different workloads. Choosing the wrong family does not just impact application performance; it can destroy your cloud budget.

## The Core Machine Families

You must memorize the primary architectures for the certification exams:

**1. General Purpose (E2, N2, N2D, N1)**
This is the default starting point. They offer a balanced ratio of CPU to Memory. 
* **E2:** The cost-optimized tier. Ideal for web servers, microservices, and small databases. It achieves lower costs through dynamic resource management by the hypervisor. 
* **N2 / N2D:** The standard enterprise tier. Backed by Intel (N2) or AMD (N2D) processors, these provide consistent performance for standard enterprise applications.

**2. Compute Optimized (C2, C2D)**
These machines feature the highest performance per core. They are backed by ultra-high clock speed processors.
* *Use Case:* Electronic Design Automation (EDA), multiplayer gaming servers, and high-performance computing (HPC) where every microsecond of processing speed matters. 

**3. Memory Optimized (M2, M3)**
These machines provide massive amounts of RAM (up to 12 Terabytes per instance). 
* *Use Case:* In-memory databases like SAP HANA or massive data analytics workloads. They are incredibly expensive and should only be used when memory is the absolute bottleneck.

**4. Accelerator Optimized (A2, G2)**
These machines are heavily coupled with NVIDIA GPUs. 
* *Use Case:* Machine Learning (ML) training, Artificial Intelligence (AI) inference, and heavy 3D rendering.

## Scale-Out Workloads (T2D)

Recently, Google introduced the **Tau (T2D)** machine family. This is highly relevant for modern architectures. Tau VMs are designed specifically for scale-out workloads like Kubernetes clusters and massive web front-ends. They do not support attaching GPUs or Local SSDs; they are strictly designed to provide the highest absolute performance per dollar for standard, horizontally scaling microservices.

## Summary

Compute Engine offers specialized machine families to match workload profiles. General Purpose (E2/N2) provides balance, Compute Optimized (C2) provides raw processor speed, and Memory Optimized (M) handles massive in-memory databases. Architects must analyze the bottleneck of the application (CPU, RAM, or Cost) to select the correct family and optimize cloud OpEx.