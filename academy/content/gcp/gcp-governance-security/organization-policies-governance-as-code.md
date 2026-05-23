---
title: "Organization Policies (Governance as Code)"
type: content
estimated_minutes: 9
cert_tags: ["ace", "pca", "pcse"]
---

# Organization Policies (Governance as Code)

## Overview

If an organization operates 500 different GCP Projects, relying on individual administrators to correctly configure security settings in each project is a recipe for a data breach. You need a mechanism to enforce non-negotiable guardrails globally. 

In AWS, this is handled by Service Control Policies (SCPs). In GCP, it is handled by **Organization Policies**.

## Defining the Guardrails

Organization Policies are configuration constraints applied at the Organization, Folder, or Project level. Because of GCP's top-down hierarchy, a constraint applied at the Organization root cascades down and restricts every single resource in the company.

**Critical Organizational Policies to Memorize:**
* **Restrict Resource Locations:** Forces all developers to only deploy infrastructure in `europe-west` to comply with strict EU data residency laws. If a developer tries to spin up a VM in `us-central1`, the API request is denied.
* **Define Allowed External IPs for VM Instances:** Prevents developers from attaching public IP addresses to their Virtual Machines, forcing all internet traffic through approved Cloud NAT and proxy architectures.
* **Enforce Uniform Bucket-Level Access:** Prevents users from making individual files inside a Cloud Storage bucket public via Access Control Lists (ACLs), forcing all access to be governed strictly by IAM.
* **Skip Default Network Creation:** By default, every new GCP Project comes with an "Auto Mode" VPC network. This policy blocks that creation, ensuring developers only use approved "Custom Mode" or Shared VPC networks.

## Boolean vs. List Constraints

When writing these policies, architects work with two types of constraints:
* **Boolean Constraints:** A simple True/False toggle. (e.g., `constraints/compute.disableNestedVirtualization = True`).
* **List Constraints:** Allowing or denying specific values from a list. (e.g., `constraints/gcp.resourceLocations` where you specify `allowedValues: [in:eu]`).

## Summary

Organization Policies act as the ultimate governance mechanism in GCP. By applying constraints at the top of the resource hierarchy, security architects can establish absolute guardrails—such as enforcing data residency, blocking public IP assignments, and securing Cloud Storage—that overrule any local project-level permissions or configurations.