---
title: "Cost Management and Committed Use Discounts (CUDs)"
type: content
estimated_minutes: 9
cert_tags: ["cdl", "ace", "pca"]
---

# Cost Management and Committed Use Discounts (CUDs)

## Overview

A cloud architect is a financial steward. Deploying a highly resilient, globally distributed Kubernetes cluster is a failure if the resulting monthly bill bankrupts the start-up. 

GCP provides specific financial instruments to optimize Operational Expenditure (OpEx). Beyond Sustained Use Discounts (which Google applies automatically if you leave a VM running all month), the most critical financial tool is the **Committed Use Discount (CUD)**.

## Resource-Based CUDs

If you are running a monolithic, legacy application on a fleet of N2 Virtual Machines, and you know you will not change that architecture for years, you use a **Resource-Based CUD**.

* **The Commitment:** You commit to paying for a specific amount of vCPUs and RAM in a *specific region* for a 1-year or 3-year term.
* **The Reward:** You receive massive discounts (up to 55% for 1 year, or 70% for 3 years) off the standard on-demand price.
* **The Risk:** It is highly rigid. If you purchase a Resource-Based CUD for 100 vCPUs in `us-central1`, and your engineering team decides to migrate the application to `europe-west1`, your CUD stays in the US. You are now paying for the idle commitment in the US *plus* the new on-demand VMs in Europe.

## Spend-Based CUDs (The Modern Standard)

Because modern cloud architectures are dynamic—shifting between Virtual Machines, Cloud Run serverless containers, and GKE clusters—rigid regional commitments are often dangerous. 

Google introduced the **Spend-Based CUD** (similar to AWS Compute Savings Plans).
* **The Commitment:** You do not commit to hardware or regions. You commit to a specific *dollar amount* per hour (e.g., "I promise to spend $50/hour on compute across my entire organization for 3 years").
* **The Reward:** A slightly lower discount (e.g., 20% to 45%), but massive architectural flexibility.
* **The Flexibility:** The discount automatically applies globally across almost all compute services: Compute Engine, Cloud Run, GKE Autopilot, and App Engine. If you migrate from VMs to serverless containers, the financial discount smoothly follows the workload.

## Budgets and Alerts

Like all clouds, GCP will not automatically turn off your servers if you run out of money. You must configure **Budgets and Alerts** in the Cloud Billing console. 
* You set a budget limit (e.g., $10,000 for the `Prod` project) and configure alerts at 50%, 90%, and 100%.
* These alerts simply send emails or push notifications to the billing administrators.
* To physically terminate resources upon hitting a budget, architects must route the budget alert to a Pub/Sub topic, which triggers a Cloud Function containing a Python script to forcefully shut down the Virtual Machines.

## Summary

Controlling cloud spend requires strict architectural and financial alignment. For highly predictable, static workloads, **Resource-Based CUDs** provide maximum discounts but lock the organization into specific regions and hardware. For modern, dynamic multi-service architectures, **Spend-Based CUDs** provide global flexibility across VMs, Kubernetes, and Serverless. Finally, architects must configure strict Budget Alerts to maintain visibility over decentralized engineering spend.