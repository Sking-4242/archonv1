---
title: "Managed Instance Groups (MIGs) & Auto-scaling"
type: content
estimated_minutes: 10
cert_tags: ["ace", "pca"]
---

# Managed Instance Groups (MIGs) & Auto-scaling

## Overview

A single Virtual Machine is a single point of failure. If the underlying hardware crashes, or a traffic spike overwhelms the CPU, your application goes offline. To achieve elasticity and high availability, you must deploy multiple identical VMs that can scale dynamically.

In GCP, this is accomplished using **Managed Instance Groups (MIGs)**. This is the direct equivalent of AWS Auto Scaling Groups (ASG) or Azure Virtual Machine Scale Sets (VMSS).

## The Components of a MIG

To build a MIG, you require two foundational configurations:
1.  **Instance Template:** The blueprint. It defines the machine type, the boot disk image, the subnet, and the IAM Service Account.
2.  **The MIG itself:** The engine that uses the template to stamp out identical clones.

## Zonal vs. Regional MIGs

When you create a MIG, you must decide its physical distribution footprint.

**1. Zonal MIGs**
All Virtual Machines are deployed into a single Zone (e.g., `us-central1-a`). 
* *Drawback:* If that specific data center experiences a power outage, your entire application goes offline. 

**2. Regional MIGs (The Enterprise Standard)**
The MIG deploys Virtual Machines evenly across multiple Zones within a Region (e.g., across `us-central1-a`, `b`, and `c`). 
* *Advantage:* This is the architectural standard for high availability. If Zone A goes offline, the MIG immediately detects the failure and automatically spins up replacement VMs in Zones B and C to maintain capacity.

## Auto-scaling and Auto-healing

MIGs provide two critical automated operations:

* **Auto-scaling (Elasticity):** You define a threshold (e.g., "Keep average CPU utilization at 60%"). If traffic spikes and CPU hits 80%, the MIG automatically creates new VMs. When traffic subsides, the MIG deletes the excess VMs, optimizing your billing OpEx.
* **Auto-healing (Reliability):** A VM might be running, but the application inside it might have crashed. You configure a Health Check (e.g., "HTTP GET on port 80"). If the web server stops responding to the health check, the MIG brutally terminates the unhealthy VM and provisions a brand new one from the Instance Template. 

## Summary

Managed Instance Groups (MIGs) are the foundation of IaaS high availability and elasticity in GCP. Architects define blueprints using Instance Templates. To survive data center outages, production workloads must utilize Regional MIGs distributed across multiple physical zones. By configuring CPU-based Auto-scaling and HTTP Health Checks, the MIG ensures the application automatically expands to meet demand and self-heals when software crashes.