---
title: "The Shared Responsibility Model in Azure"
type: content
estimated_minutes: 8
cert_tags: ["az_900", "az_500"]
---

# The Shared Responsibility Model in Azure

## Overview

A pervasive and dangerous myth in cloud computing is that moving to the cloud automatically makes an organization secure. The reality is that the cloud merely shifts the *type* of security responsibility. If an administrator exposes an Azure Storage Account to the public internet, Microsoft's world-class physical datacenter security will not stop the data breach. 

To pass the AZ-900 and AZ-500, and to architect secure environments, you must understand the **Shared Responsibility Model**. It dictates exactly where Microsoft's liability ends and your organization's liability begins.

## The Three Cloud Tiers

The division of responsibility shifts dynamically based on the cloud service model you choose: IaaS, PaaS, or SaaS.

**1. Infrastructure as a Service (IaaS)**
*Examples: Azure Virtual Machines, Managed Disks, Virtual Networks.*
This carries the heaviest burden for the customer. Microsoft is responsible *only* for the physical security of the datacenter (guards, gates, power) and the foundational hypervisor fabric. 
**You are responsible for:** The Operating System (patching Windows/Linux), network controls (NSGs), application code, identity management, and the data itself.

**2. Platform as a Service (PaaS)**
*Examples: Azure App Service, Azure SQL Database, Cosmos DB.*
The burden shifts heavily toward Microsoft. They now manage the physical infrastructure, the hypervisor, and the underlying Operating System. You do not have RDP or SSH access to a PaaS service to install antivirus software; Microsoft handles it.
**You are responsible for:** Network controls (firewalls, private endpoints), identity and access management (RBAC), application-level configurations, and the data.

**3. Software as a Service (SaaS)**
*Examples: Microsoft 365, Dynamics 365.*
Microsoft manages almost the entire stack, from the physical hardware all the way up to the application software. 
**You are responsible for:** Identity (who is logging in), device security (are they using a compliant laptop), and the data (did a user accidentally email a spreadsheet of social security numbers).

## The Immutable Responsibilities

Regardless of whether you use IaaS, PaaS, or SaaS, **three things will always remain 100% your responsibility:**

1.  **The Data:** Microsoft provides the vault; you decide what to put in it and who gets the combination.
2.  **Endpoints:** The physical devices (laptops, phones) your employees use to access the cloud.
3.  **Accounts and Identities:** Enforcing Multi-Factor Authentication (MFA), Conditional Access, and managing role assignments.

## Summary

The Shared Responsibility Model defines the security boundaries of the cloud. In IaaS, you manage the OS and everything above it. In PaaS, Microsoft manages the OS, leaving you to manage the application configuration and data. In SaaS, Microsoft manages the application, leaving you to manage identities and data. No matter the model, the customer is always ultimately responsible for their data, their endpoints, and their IAM configuration.

## What's Next

Understanding what you are responsible for is step one. Step two is gaining visibility into whether you are fulfilling those responsibilities. Next, we explore Microsoft Defender for Cloud.