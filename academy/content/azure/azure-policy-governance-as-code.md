---
title: "Azure Policy: Governance as Code"
type: content
estimated_minutes: 10
cert_tags: ["az_104", "az_305", "az_500"]
---

# Azure Policy: Governance as Code

## Overview

In a large enterprise, you might have hundreds of developers spinning up infrastructure. If a developer accidentally creates a Virtual Machine in the `Japan East` region instead of `East US`, it might violate data sovereignty laws (e.g., GDPR or HIPAA). 

You cannot rely on human vigilance to catch these errors. You need automated guardrails. **Azure Policy** is the mechanism for enforcing organizational standards and assessing compliance at scale. It is the Azure equivalent of AWS Organizations Service Control Policies (SCPs) combined with AWS Config.

## How Azure Policy Works

Azure Policy evaluates resources in Azure by comparing their properties to business rules. These rules, described in JSON format, are known as **Policy Definitions**. 

Azure Policy operates at the control plane (Azure Resource Manager - ARM). When a user submits an API request to create a resource, ARM checks the request against assigned policies *before* the resource is provisioned. 

**Common Policy Use Cases:**
* **Allowed Locations:** Restrict resource creation to specific geographic regions to maintain compliance with local laws.
* **Allowed Virtual Machine SKUs:** Prevent junior developers from spinning up massive, $5,000/month GPU instances (M-Series or N-Series) for simple web testing.
* **Require Tags:** Reject the creation of any resource that does not include a `CostCenter` or `Environment` tag. This is critical for billing attribution.
* **Require Secure Transfer:** Force all Storage Accounts to only accept HTTPS traffic.

## Policy Effects: Audit vs. Deny vs. Modify

When a resource violates a policy, the policy triggers an "Effect." Understanding these effects is vital for the AZ-104 and AZ-305:

1.  **Deny:** The strictest effect. If a deployment violates the rule, ARM flat-out rejects the API request. The resource is never created.
2.  **Audit:** The resource is created (or already exists), but it is flagged as "Non-compliant" in the Azure Policy dashboard. This is heavily used when introducing new policies to an existing environment to avoid breaking production workloads.
3.  **Modify / Append:** Automatically alters the deployment request. For example, if a user forgets to add the `Environment=Prod` tag to a resource group, a Modify policy can silently add the tag for them during creation.
4.  **DeployIfNotExists (DINE):** Highly powerful. If you deploy a Virtual Machine, a DINE policy can automatically deploy the Log Analytics monitoring agent extension onto that VM without human intervention.

## Initiatives (Policy Sets)

Assigning 100 individual policies to a Subscription is an administrative nightmare. To solve this, Azure allows you to group related policies into an **Initiative** (also called a Policy Set).

Microsoft provides built-in Initiatives for major regulatory frameworks. Instead of manually writing 50 policies to comply with the Payment Card Industry Data Security Standard (PCI DSS), you simply assign the built-in "PCI DSS v3.2.1" Initiative to your Management Group. Azure Policy immediately begins auditing your environment against every control required by the framework.

## Summary

Azure Policy is the engine for Governance as Code. It evaluates resource deployments against JSON-based rules (Policy Definitions) at the ARM control plane. Policies can Audit existing infrastructure, Deny non-compliant creations, or Modify requests to enforce standards (like tagging or allowed regions). To manage compliance at scale, related policies are grouped into Initiatives, allowing organizations to easily audit against massive frameworks like HIPAA, ISO 27001, or PCI DSS.

## What's Next

With our compliance guardrails in place, we need a secure location to store the cryptographic keys, connection strings, and certificates our applications rely on. Our final security lesson covers Azure Key Vault.