---
title: "Azure Cost Management: Budgets, Tags, and Advisor"
type: content
estimated_minutes: 11
cert_tags: ["az_104", "az_305"]
---

# Azure Cost Management: Budgets, Tags, and Advisor

## Overview

"Cloud sprawl" occurs when engineers deploy resources, use them for a week, forget about them, and the company continues paying the monthly bill for years. To stop cloud sprawl, organizations rely on **Azure Cost Management + Billing**, a suite of tools designed to provide visibility, accountability, and automated governance over cloud spend.

## Cost Analysis and Resource Tagging

If you receive a monthly Azure bill for $50,000, you cannot simply pay it. Finance will ask, "How much of this $50,000 was spent by the Marketing team vs. the R&D team?" 

By default, Azure cannot answer this. A Virtual Machine is just a Virtual Machine. To enable cost attribution, architects must strictly enforce **Resource Tagging** via Azure Policy. 
A tag is a simple Key/Value pair (e.g., `CostCenter : 1045` or `Environment : Production`). Once tags are applied to all resources, you can open the Cost Analysis dashboard and slice the $50,000 bill down to the exact dollar amount spent by each specific department or application.

## Budgets and Alerts

To prevent billing surprises, you must configure **Azure Budgets**. 

A budget allows you to set a spending threshold (e.g., $5,000 per month for the "Development" subscription). 
* **The Notification:** You can configure the budget to trigger an alert when you hit 50%, 75%, and 100% of the threshold. This sends an email to the subscription owner.
* **The Architectural Truth:** By default, hitting a budget in Azure **does not turn off your resources.** Microsoft will not shut down a production database just because you crossed an arbitrary financial line. 
* **The Hard Stop:** If you actually want to shut down resources when a budget is hit (common in academic environments or sandboxes), you must wire the Budget Alert to an Action Group that triggers an Azure Automation Runbook containing a script to physically deallocate the Virtual Machines.

## Azure Advisor (The Automated Consultant)

Finding wasted money manually is tedious. **Azure Advisor** is a free service that continuously analyzes your telemetry and provides personalized recommendations across five pillars: Reliability, Security, Operational Excellence, Performance, and **Cost**.

For Cost Management, Azure Advisor acts like an automated financial auditor. It will explicitly tell you:
* "Virtual Machine 'Web-04' has had less than 5% CPU utilization for the last 14 days. You should resize it to a smaller SKU to save $140/month."
* "You have three ExpressRoute circuits provisioned that have passed zero traffic in the last month. Delete them to save $1,200/month."

## Summary

Gaining control over cloud spend requires strict architectural discipline. Resource Tagging is mandatory for attributing costs to specific business units. Budgets provide early warning alerts for cost overruns but require automated runbooks if you want to forcefully shut down resources. Finally, Azure Advisor provides actionable, AI-driven recommendations to right-size underutilized infrastructure and eliminate wasted OpEx.

## What's Next

The most effective way to lower your Azure bill isn't deleting resources; it is changing how you buy them. Our final lesson covers Azure's massive discount mechanisms: Reservations, Savings Plans, and the Azure Hybrid Benefit.