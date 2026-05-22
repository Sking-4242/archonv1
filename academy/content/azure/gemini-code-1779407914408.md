---
title: "Discount Mechanisms: Reservations & Hybrid Benefit"
type: content
estimated_minutes: 12
cert_tags: ["az_900", "az_104", "az_305"]
---

# Discount Mechanisms: Reservations & Hybrid Benefit

## Overview

Standard "Pay-As-You-Go" (PAYG) is the most expensive way to run a cloud environment. It is designed for volatility. If you are running a stable, predictable enterprise workload, paying the PAYG rate is a massive architectural failure. 

Microsoft rewards financial commitment with massive discounts. Understanding the difference between Reservations, Savings Plans, and the Azure Hybrid Benefit is critical for passing the AZ-104 and for operating as a senior cloud architect.

## Azure Reservations

If you know you are going to need a specific Virtual Machine running 24/7 for the next year, you should purchase an **Azure Reservation**. 

* **The Mechanism:** You commit to a 1-year or 3-year term for a specific VM Series (e.g., D-Series) in a specific Region (e.g., East US).
* **The Discount:** Up to 72% off the Pay-As-You-Go compute cost.
* **The Constraint:** Reservations are rigid. If you buy a reservation for a D-Series VM in East US, and your developers decide to migrate the application to an E-Series VM in West US, your reservation is completely wasted. You must manually exchange it, which carries limits and penalties.

## Azure Savings Plans for Compute

Because Reservations are so rigid, Microsoft introduced the **Azure Savings Plan**. This is the direct equivalent to AWS Compute Savings Plans.

* **The Mechanism:** Instead of committing to a specific VM type in a specific region, you commit to a specific *dollar amount per hour* (e.g., "I promise to spend at least $50/hour on compute for the next 3 years"). 
* **The Flexibility:** It applies universally. It automatically covers VMs, Azure App Service, Azure Container Apps, and Azure Functions Premium—across any region globally. If your developers switch from VMs to serverless containers, the discount moves with them automatically.
* **The Trade-off:** Because it is highly flexible, the discount is slightly lower than a rigid Reservation (up to 65% off).

## The Killer Feature: Azure Hybrid Benefit (AHB)

When you spin up a Windows Server VM in Azure, you are actually paying for two things simultaneously:
1. The physical compute hardware (CPU, RAM).
2. The Windows Server Operating System licensing tax.

For decades, enterprises have bought perpetual, on-premises licenses for Windows Server and Microsoft SQL Server. If an enterprise migrates to Azure and pays the standard PAYG rate, they are effectively paying for Windows twice (once on-premises, once in the cloud).

**Azure Hybrid Benefit (AHB)** allows you to bring your existing, on-premises licenses (with active Software Assurance) into the cloud. By checking a single box in the Azure Portal, Microsoft strips the OS licensing tax entirely out of your hourly rate. 

* *The Impact:* When you combine a 3-Year Reservation with the Azure Hybrid Benefit, a Virtual Machine can be up to **80% cheaper** than the standard Pay-As-You-Go rate. Because AWS does not own Windows or SQL Server, they cannot offer a natively integrated, deep discount like this, making AHB Azure's biggest competitive advantage for enterprise migrations.

## Summary

Never run steady-state production workloads on Pay-As-You-Go pricing. For highly predictable workloads where the VM type and region will not change, use **Azure Reservations** for maximum discount. For dynamic, modern architectures utilizing a mix of VMs and PaaS services, use **Azure Savings Plans** for global flexibility. Finally, always apply the **Azure Hybrid Benefit** to eliminate the software tax if your organization owns existing Windows Server or SQL Server licenses.