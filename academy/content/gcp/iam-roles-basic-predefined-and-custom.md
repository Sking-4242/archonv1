---
title: "IAM Roles: Basic, Predefined, and Custom"
type: content
estimated_minutes: 12
cert_tags: ["ace", "pca", "pcse"]
---

# IAM Roles: Basic, Predefined, and Custom

## Overview

Identity and Access Management (IAM) in GCP revolves around a single, declarative question: **Who** can do **What** on **Which Resource**? 

* The **Who** is the Identity (User, Group, or Service Account).
* The **Which Resource** is the Scope (Organization, Folder, or Project).
* The **What** is the **Role**. 

A Role is simply a collection of permissions. Unlike AWS, where you frequently write custom JSON policies from scratch for every workload, GCP heavily relies on predefined bundles of permissions. You must know the difference between the three types of roles.

## 1. Basic Roles (Primitive Roles)

Historically known as "Primitive Roles," these are the legacy roles that existed before GCP introduced granular IAM. **They are extremely dangerous and violate the Principle of Least Privilege.**

There are three Basic Roles:
* **Viewer:** Can read almost all resources and data.
* **Editor:** Has Viewer access, PLUS the ability to modify and delete almost all resources.
* **Owner:** Has Editor access, PLUS the ability to manage IAM permissions and billing.

*Architectural Rule:* **Never use Basic Roles in a production environment.** If you give a developer the "Editor" role on a Project just so they can restart a Virtual Machine, they also silently gain the ability to delete production Cloud SQL databases and wipe out Cloud Storage buckets. 

## 2. Predefined Roles

Predefined Roles are the modern standard. They are created, managed, and updated by Google. There are thousands of them, carefully scoped to specific services and tasks.

* **Format:** `roles/service.role` (e.g., `roles/compute.networkAdmin`)
* **Granularity:** If a developer needs to restart a Virtual Machine, you grant them `roles/compute.instanceAdmin`. They can now manage VMs, but if they try to view a Cloud Storage bucket, they will get a `403 Forbidden` error. 
* **Maintenance:** Because Google manages these, if Google releases a new feature for Compute Engine, they automatically update the `compute.instanceAdmin` role to include the new necessary permissions.

## 3. Custom Roles

Sometimes, even Predefined Roles are too broad. If your organization's security policy states that a specific tier of administrators can *start* and *stop* Virtual Machines, but cannot *delete* them, no Predefined Role fits perfectly.

In this scenario, you create a **Custom Role**. 
You manually select the exact API permissions you want to grant (e.g., `compute.instances.start` and `compute.instances.stop`) and bundle them into a custom role.

* **The Trade-off:** Custom Roles provide perfect least privilege, but they carry a high maintenance burden. If Google releases a new feature, your Custom Role will not automatically inherit the permissions to use it. You must manually update the role. 

## IAM Conditions

GCP allows you to attach **Conditions** to role bindings based on contextual attributes. 
Instead of just saying "John is a Compute Admin," you can use an IAM Condition to say: "John is a Compute Admin, **BUT ONLY IF** he is accessing the console between 9 AM and 5 PM on weekdays, **AND** his request originates from the corporate headquarters IP address." 

## Summary

GCP IAM utilizes three tiers of roles. Basic Roles (Owner/Editor/Viewer) are overly broad and should be avoided in production to prevent catastrophic blast-radius expansion. Predefined Roles are granular, Google-managed bundles that should be your default choice. Custom Roles offer exact permission mapping but require manual maintenance. IAM Conditions can further restrict these roles based on time, date, or network location.

## What's Next

Human users require MFA and browsers. But how does a Python script running on a Virtual Machine securely authenticate to a Cloud Storage bucket? Next, we introduce the most critical identity concept in GCP: Service Accounts.