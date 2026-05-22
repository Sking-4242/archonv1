---
title: "The GCP Resource Hierarchy: Organizations, Folders, and Projects"
type: content
estimated_minutes: 10
cert_tags: ["cdl", "ace", "pca"]
---

# The GCP Resource Hierarchy: Organizations, Folders, and Projects

## Overview

If you attempt to build infrastructure in Google Cloud Platform (GCP) using the exact same mental model you use for AWS, you will immediately run into architectural roadblocks. The foundation of GCP is its **Resource Hierarchy**. 

Unlike AWS, where an "Account" is the primary container for resources, GCP uses a strict, top-down, multi-layered hierarchy. Understanding this structure is non-negotiable for passing the Associate Cloud Engineer (ACE) or Professional Cloud Architect (PCA) exams, because it dictates exactly how billing, networking, and identity permissions are inherited.

## The Four Levels of the Hierarchy

GCP organizes resources mathematically, almost like a massive file system on a computer. Policies applied at a higher level cascade downward to everything below them.

**1. The Organization Node (The Root)**
This is the absolute top of the hierarchy. It represents your company (e.g., `archon.academy`). All resources created within your GCP environment belong to this organization. 
* *Security Focus:* This is where global security guardrails—known as Organization Policies—are applied. If you apply a policy here that says "No resources can be provisioned outside of the United States," that rule restricts every single developer, administrator, and automation script in the entire company.

**2. Folders (The Logical Grouping)**
Below the Organization are Folders. Folders act as an isolation boundary for different departments, environments, or teams. 
* *Example:* You might create a Folder named "Production" and another named "Development." Or, you might organize by department: "HR," "Finance," and "Engineering." Crucially, Folders can be nested inside other Folders (e.g., `Engineering -> Project Alpha -> Dev`).

**3. Projects (The Trust Boundary)**
**A Project is the most important concept in GCP.** Every single resource you deploy—a Virtual Machine, a Cloud Storage bucket, a BigQuery dataset—must belong to exactly one Project. 
* *The Difference from AWS:* In AWS, you deploy resources into an Account. In GCP, you deploy resources into a Project. A single company might have thousands of independent Projects. 
* Projects form a strict trust and blast-radius boundary. By default, a Virtual Machine in Project A cannot communicate with a Virtual Machine in Project B using private IP addresses.
* Projects are also the primary mechanism for tracking costs and API quotas.

**4. Resources (The Infrastructure)**
These are the actual fundamental components you provision: Compute Engine instances, Pub/Sub topics, Cloud Spanner databases. They sit at the very bottom of the hierarchy inside a specific Project.

## The Principle of Inheritance

The entire point of this hierarchy is **policy inheritance**. 

When you assign an Identity and Access Management (IAM) role, it applies to the node where you assigned it, and to *everything beneath it*. 
* If you give a developer the "Compute Admin" role at the **Project** level, they can manage Virtual Machines only inside that specific Project. 
* If you give that same developer the "Compute Admin" role at the **Folder** level, they can manage Virtual Machines in *every* Project contained within that Folder.

*Exam Trap:* In GCP, **allow policies are additive**. You cannot explicitly "Deny" access in GCP IAM like you can in AWS. If an engineer is granted the "Editor" role at the Folder level, but you try to restrict them to "Viewer" at the Project level, the broader Folder-level permission wins. They will still have Editor access.

## Summary

The GCP Resource Hierarchy provides a structured way to manage access, billing, and governance at scale. The Organization is the root, Folders provide logical grouping (like departments or environments), Projects act as the strict trust boundary where resources are actually deployed, and Resources sit at the bottom. IAM permissions and Organization Policies inherit strictly from the top down and are additive. 

## What's Next

Now that we understand how resources are grouped, we must understand how they are paid for. Next, we will explore the critical architectural disconnect between GCP Projects and Cloud Billing Accounts.