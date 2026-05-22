---
title: "Virtual Machine Scale Sets (VMSS) & Auto-scaling"
type: content
estimated_minutes: 10
cert_tags: ["az_104", "az_305"]
---

# Virtual Machine Scale Sets (VMSS) & Auto-scaling

## Overview

In the previous lesson, we looked at individual Virtual Machines. However, modern cloud architecture rarely relies on a single VM. If traffic spikes to your web application, a single VM will buckle under the load. If you try to fix this by vertically scaling (resizing the VM to a larger instance), the VM must be rebooted, causing downtime.

To achieve true elasticity and high availability, you must scale horizontally (adding more instances, not bigger instances). In Azure, this is accomplished using **Virtual Machine Scale Sets (VMSS)**, the direct equivalent to AWS Auto Scaling Groups (ASG).

## How VMSS Works

A Virtual Machine Scale Set allows you to deploy and manage a group of load-balanced VMs. The number of VM instances can automatically increase or decrease in response to demand or a defined schedule.

When you create a VMSS, you define a single "golden image" (the OS, the application code, the VM size). Azure then uses this configuration to stamp out identical clones. Because the VMs are identical, a load balancer can seamlessly distribute incoming traffic across all of them.

## Auto-scaling Rules

VMSS elasticity is driven by auto-scaling rules. As an architect, you must define the boundaries and triggers:
* **Minimum and Maximum Instances:** Always set a floor (e.g., minimum 2 for high availability) and a ceiling (e.g., maximum 10 to prevent runaway OpEx costs).
* **Metric-based Scaling:** Scale out (add VMs) when average CPU utilization across the set exceeds 75% for 5 minutes. Scale in (remove VMs) when CPU drops below 30%.
* **Schedule-based Scaling:** Proactively scale out every Friday at 8:00 AM before a known traffic spike, and scale in at 6:00 PM. 

*Exam Note:* Auto-scaling evaluates metrics at the *Scale Set level*, not the individual VM level. If one VM hits 100% CPU but the others are at 10%, the average might only be 40%, meaning a scale-out event will not trigger.

## Orchestration Modes: Uniform vs. Flexible

Azure recently introduced a critical architectural split in how Scale Sets operate. You must understand the difference for the AZ-104 and AZ-305 exams:

**1. Uniform Orchestration (The Legacy Standard)**
In Uniform mode, every VM in the scale set must be absolutely identical. They must use the same image, the same disk type, and the same VM size. The Scale Set acts as a rigid, singular resource. If you want to update the OS image, you update the scale set model, and Azure rolls out the update to the VMs.

**2. Flexible Orchestration (The Modern Standard)**
Flexible mode brings VMSS closer to the behavior of AWS Mixed Instances Policies. It allows you to mix and match VM sizes, operating systems, and billing models (Standard vs. Spot Instances) within the exact same scale set. It also allows you to manage the VMs as individual ARM resources while still benefiting from the load balancing and auto-scaling rules of the set. For new deployments, Flexible is the recommended architecture.

## Summary

Virtual Machine Scale Sets (VMSS) provide horizontal elasticity, allowing your application to automatically scale out during traffic spikes and scale in to save costs during quiet periods. While vertical scaling requires downtime, horizontal scaling via VMSS is seamless. Always set strict maximum instance limits to control costs, and prefer Flexible Orchestration for modern deployments to allow mixing instance types and Spot pricing.

## What's Next

VMs and VMSS are Infrastructure as a Service (IaaS) offerings—you still have to patch the OS and manage the scaling rules. Next, we will step up the abstraction ladder to Platform as a Service (PaaS) with Azure App Service.