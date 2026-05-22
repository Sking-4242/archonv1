---
title: "Azure Role-Based Access Control (RBAC)"
type: content
estimated_minutes: 10
cert_tags: ["az_104", "az_500", "az_305"]
---

# Azure Role-Based Access Control (RBAC)

## Overview

Identity is how you prove who you are (Microsoft Entra ID). Authorization is what you are allowed to do once your identity is proven. In Azure, authorization to manage cloud infrastructure is governed exclusively by **Azure Role-Based Access Control (RBAC)**. 

If you are accustomed to AWS IAM Policies, Azure RBAC will feel fundamentally different. AWS policies are highly granular, custom JSON documents attached directly to identities. Azure relies on a system of standardized, pre-packaged roles assigned at specific hierarchical scopes.

## The Anatomy of a Role Assignment

To grant someone permission to do something in Azure, you must create a Role Assignment. A Role Assignment requires exactly three components:

**1. The Security Principal (Who)**
This is the identity requesting access. It can be a User (John Doe), a Group (Backend Developers), a Service Principal (an application), or a Managed Identity (an Azure Virtual Machine needing to securely talk to a database).

**2. The Role Definition (What)**
A Role Definition is a collection of permissions. It lists the exact ARM API operations that are allowed or denied. Azure provides hundreds of built-in roles. The three foundational roles you must memorize are:
* **Owner:** Full access to all resources, *including* the right to delegate access to others.
* **Contributor:** Full access to create and manage all resources, but *cannot* grant access to others.
* **Reader:** Can view existing resources but cannot make any changes.

*Best Practice:* Always prefer assigning built-in roles. Only create Custom Roles if a strict security compliance mandate requires a hyper-specific combination of permissions not covered by Microsoft's defaults.

**3. The Scope (Where)**
This is the boundary where the access applies. As we learned in the Hierarchy lesson, scope in Azure is inherited top-down. 
* If you assign the "Virtual Machine Contributor" role at the **Subscription** scope, the user can restart any VM in any Resource Group within that entire subscription.
* If you assign that same role at a specific **Resource Group** scope, the user can only restart VMs inside that one specific folder. 

## The Principle of Least Privilege in Azure

To achieve least privilege in Azure, you must manipulate both the *Role Definition* and the *Scope*. 

Do not give a developer the generic "Contributor" role if they only need to manage databases; give them the "SQL DB Contributor" role. Furthermore, do not assign that role at the Subscription level; assign it strictly at the Resource Group level where their specific databases live. 

## Microsoft Entra Roles vs. Azure RBAC Roles

This is the most common point of confusion for newcomers and a frequent trick question on exams:

* **Azure RBAC Roles** control access to *Azure resources* (Virtual Machines, Storage Accounts, VNets).
* **Microsoft Entra Roles** control access to the *directory itself* (creating new users, resetting passwords, managing licenses). 

If you make someone a "Global Administrator" in Microsoft Entra ID, they can delete users and reset passwords, but they cannot inherently reboot a Virtual Machine. If you make someone an "Owner" of an Azure Subscription, they can delete every server in the cloud, but they cannot reset a coworker's email password. The control planes are kept strictly separate.

## Summary

Azure RBAC governs authorization to infrastructure. A Role Assignment requires a Principal (who), a Role Definition (what), and a Scope (where). Permissions inherit downwards through the Azure hierarchy (Management Group $\rightarrow$ Subscription $\rightarrow$ Resource Group). Always use the most restrictive role at the narrowest possible scope to maintain a strong security posture.

## What's Next

Next, we will look at how to protect the identities themselves by implementing Conditional Access and Privileged Identity Management (PIM) for high-risk administrative roles.