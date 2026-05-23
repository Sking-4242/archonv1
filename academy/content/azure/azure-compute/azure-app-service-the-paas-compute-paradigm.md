---
title: "Azure App Service: The PaaS Compute Paradigm"
type: content
estimated_minutes: 12
cert_tags: ["az_104", "az_305"]
---

# Azure App Service: The PaaS Compute Paradigm

## Overview

Managing Virtual Machines—even in a Scale Set—carries a heavy operational burden. You are responsible for OS patching, antivirus updates, network interface configurations, and web server installation (IIS, Apache, Nginx). 

**Azure App Service** removes this burden. It is Azure's flagship Platform as a Service (PaaS) offering for hosting web applications, REST APIs, and mobile backends. You bring your code (C#, Java, Python, Node.js) or your Docker container, and Azure handles the underlying infrastructure. 

If you are coming from AWS, App Service is roughly equivalent to AWS Elastic Beanstalk, but with much deeper native integration into the Azure ecosystem.

## The App Service Plan (The Billing Boundary)

To understand App Service, you must understand the **App Service Plan**. This is one of the most frequently tested concepts on the AZ-104 exam.

When you create a web app in Azure, it does not run in a vacuum. It must run on an App Service Plan. 
* **Think of the App Service Plan as the physical server (or farm of servers) that hosts your apps.** * The Plan dictates the operating system (Windows or Linux), the region, the amount of RAM/CPU, and the feature tier (Free, Basic, Standard, Premium, Isolated).
* **The Billing Rule:** You do not pay for the Web App; you pay for the App Service Plan. You can host 10 different web apps on a single Standard App Service Plan, and you will only pay one flat hourly rate for the Plan itself. 

*Architectural Warning:* Because multiple apps on the same Plan share the same underlying compute resources, a memory leak in Web App A can crash Web App B. For business-critical production workloads, isolate them onto their own App Service Plans.

## Deployment Slots (Blue/Green Deployments)

One of the most powerful features of the Standard and Premium App Service tiers is **Deployment Slots**. 

In a traditional IaaS deployment, updating your application code requires taking the server offline, installing the new code, and bringing it back up—causing downtime. 

Deployment Slots allow you to create a "staging" environment that runs live in Azure right next to your "production" environment.
1. You deploy your new version (v2) to the Staging Slot.
2. You test v2 in Azure to ensure it connects to the database and functions correctly.
3. You click **"Swap"**.
4. Azure instantaneously swaps the IP addresses of the two slots. Staging becomes Production, and Production becomes Staging. 

There is zero downtime. If users immediately start reporting bugs on the new version, you simply click "Swap" again to instantly roll back to v1.

## Scaling App Services

Because App Service is PaaS, scaling is incredibly streamlined, but it happens at the **App Service Plan** level, not the individual app level.

* **Scale Up (Vertical):** Changing the tier of your App Service Plan (e.g., moving from Standard to Premium). This gives the underlying servers more CPU and RAM. It also unlocks advanced features like higher limits for Deployment Slots and daily backups.
* **Scale Out (Horizontal):** Adding more VM instances to your existing App Service Plan. If you scale out to 3 instances, Azure automatically distributes incoming web traffic across all three instances.

## Summary

Azure App Service shifts the operational burden of OS management to Microsoft, allowing developers to focus purely on code. The underlying compute and billing boundary is the App Service Plan. Multiple apps can run on a single plan to save costs, but they will share compute resources. Utilizing Deployment Slots provides zero-downtime Blue/Green deployments and instant rollback capabilities for production workloads.

## What's Next

We will conclude the Compute module by looking at two specialized compute scenarios: Dedicated Hosts for strict compliance, and Azure Spot Instances for cost-saving batch processing.