---
title: "The Azure Hierarchy: Management Groups, Subscriptions, and Resource Groups"
type: content
estimated_minutes: 8
cert_tags: ["az_900", "az_104", "az_305"]
---

# The Azure Hierarchy: Management Groups, Subscriptions, and Resource Groups

## Overview

If you are coming from AWS, you are used to isolating workloads using separate AWS Accounts tied together by AWS Organizations. Azure handles isolation and governance differently. Understanding the Azure organizational hierarchy is the most critical first step in designing secure, compliant, and cost-effective infrastructure on the Microsoft cloud.

Azure uses a four-level hierarchy to organize resources: **Management Groups**, **Subscriptions**, **Resource Groups**, and **Resources**. This structure dictates how you apply Role-Based Access Control (RBAC), enforce Azure Policies, and track costs.

## The Four Levels of Hierarchy

**1. Management Groups**
At the very top of the hierarchy are Management Groups. These are containers that help you manage access, policies, and compliance across multiple subscriptions. You can nest Management Groups (up to six levels deep) to reflect your organization's structure (e.g., Root -> HR -> Production). If you apply an Azure Policy at a Management Group level, it cascades down to everything beneath it.

**2. Subscriptions**
A Subscription is primarily a billing boundary and a scale limit. Every resource deployed in Azure must be tied to a single subscription. Organizations typically create multiple subscriptions to separate billing (e.g., a "Development" subscription and a "Production" subscription) or to bypass strict resource limits. Unlike AWS Accounts, Subscriptions natively trust the same Microsoft Entra ID (Azure AD) tenant, making cross-subscription identity management seamless.

**3. Resource Groups (RGs)**
A Resource Group is a logical container into which Azure resources are deployed and managed. **Every resource must belong to exactly one Resource Group.** RGs are typically used to group resources that share a lifecycle. For example, the web servers, databases, and virtual networks for a specific application should sit in the same RG so they can be deployed, updated, and deleted together. 

**4. Resources**
These are the actual instances of services you create, like Virtual Machines, Storage Accounts, or SQL Databases.

## Inheritance: RBAC and Policy

The defining feature of the Azure hierarchy is **top-down inheritance**. 

If you grant a user the "Contributor" RBAC role at the Subscription level, they automatically inherit "Contributor" access to every Resource Group and Resource inside that subscription. 
If you apply an Azure Policy at the Management Group level that says "No resources can be deployed outside of the East US region," that rule flows down to all Subscriptions and Resource Groups. 

Therefore, the principle of least privilege in Azure requires applying RBAC roles at the lowest scope possible (ideally the Resource Group level) to prevent excessive permissions from bleeding downward.

## Summary

Azure's organizational model is a strict top-down hierarchy. Management Groups govern Subscriptions, Subscriptions contain Resource Groups, and Resource Groups hold the Resources. This structure provides a highly flexible way to apply access controls and compliance policies at scale through inheritance. Always group resources that share the same lifecycle into the same Resource Group.

## What's Next

Next, we look at Azure Resource Manager (ARM) — the deployment and management service that acts as the front door for creating, updating, and deleting all resources within these hierarchies.