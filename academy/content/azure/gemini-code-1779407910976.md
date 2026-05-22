---
title: "Estimating Cloud Costs: Pricing vs. TCO"
type: content
estimated_minutes: 9
cert_tags: ["az_900", "az_104"]
---

# Estimating Cloud Costs: Pricing vs. TCO

## Overview

In the on-premises world, deploying a new application required a massive Capital Expenditure (CapEx) approval process. In the cloud, a junior developer with the "Contributor" role can spin up $10,000 worth of infrastructure over a weekend. 

Because cloud operates on an Operational Expenditure (OpEx) model, architects must accurately forecast costs *before* deployment, and justify those costs to the business. Azure provides two distinct calculators for this, depending on whether you are estimating a net-new cloud architecture or justifying a migration from an existing datacenter.

## The Azure Pricing Calculator

If you are building a greenfield application, you use the **Azure Pricing Calculator**. This tool allows you to build out your exact architecture (e.g., 3 VMs, 1 Load Balancer, 1 Azure SQL Database, 500 GB of outbound bandwidth) and see the estimated monthly bill.

**The "Gotchas" of the Pricing Calculator:**
* **Region Matters:** A Virtual Machine in `West US` does not cost the same as that exact same Virtual Machine in `Brazil South`. Prices fluctuate globally based on Microsoft's facility costs and local taxes.
* **Bandwidth Egress:** Ingress (data entering Azure) is always free. Egress (data leaving Azure to the internet) costs money. Architects consistently underestimate the cost of data egress when estimating web applications with heavy media payloads.
* **Managed Disks:** When you select a Virtual Machine, the default price only includes the compute. You must explicitly add the cost of the OS Managed Disk and any attached data disks.

## The Total Cost of Ownership (TCO) Calculator

If a CIO asks, "Should we close our physical datacenter and move entirely to Azure?", the Pricing Calculator is the wrong tool. If you simply compare the cost of buying a physical Dell server against renting an Azure VM, the physical server often looks cheaper.

To make an accurate comparison, you must use the **TCO Calculator**. This tool calculates the *hidden* costs of running a datacenter that are eliminated when moving to the cloud:
1. **Facilities:** Electricity, cooling, physical security guards, and real estate leases.
2. **IT Labor:** The salary of the engineers who spend their days replacing dead hard drives and running ethernet cables.
3. **Software:** Legacy virtualization licenses (e.g., VMware vSphere).

You input your current on-premises footprint (e.g., 500 servers, 2 SANs), and the TCO Calculator produces a comprehensive financial report proving that the overall Total Cost of Ownership drops significantly when shifting those workloads to Azure over a 3-to-5-year period.

## Summary

Accurate financial forecasting is a core architectural responsibility. Use the Azure Pricing Calculator to estimate the monthly OpEx of new, specific architectures, ensuring you account for regional price variations and data egress fees. Use the TCO Calculator to justify massive migrations by comparing the holistic cost of running a physical datacenter (including power, cooling, and labor) against the managed OpEx of the Microsoft Cloud.

## What's Next

Once the infrastructure is deployed, estimates are no longer enough. We must track the actual money being spent. Next, we explore Azure Cost Management and Billing.