---
title: "Azure SQL: Deployment Options and Purchasing Models"
type: content
estimated_minutes: 12
cert_tags: ["az_900", "az_104", "az_305"]
---

# Azure SQL: Deployment Options and Purchasing Models

## Overview

When migrating a relational database to AWS, the default answer is usually Amazon RDS. Azure’s approach is more nuanced, specifically regarding its flagship product: Microsoft SQL Server. Because Microsoft owns the database engine, they offer an entire family of managed services known as **Azure SQL**. 

Choosing the right Azure SQL deployment model and purchasing tier is one of the most heavily tested areas on the AZ-104 and AZ-305 exams because making the wrong choice can lead to massive cost overruns or legacy application incompatibility.

## The Three Deployment Models

You must memorize the architectural differences between these three ways to run SQL Server in Azure:

**1. SQL Server on Azure VMs (IaaS)**
This is exactly what it sounds like. You spin up a Windows Server VM and install SQL Server on it. 
* *Pros:* 100% compatibility with on-premises SQL Server. You have full OS-level access to install third-party agents.
* *Cons:* You manage the OS, the patching, the backups, and the high availability. It is a heavy operational burden.

**2. Azure SQL Managed Instance (PaaS)**
This is the "lift-and-shift" sweet spot. It is a fully managed service, meaning Microsoft handles backups and patching. However, it provides near 100% compatibility with the latest on-premises SQL Server enterprise edition.
* *Key Architecture Feature:* It is injected directly into a delegated VNet subnet. It has a private IP address, making it incredibly secure and easy to connect to your on-premises network via ExpressRoute. 
* *Use Case:* Migrating legacy enterprise applications that require advanced SQL features like cross-database queries or SQL Server Agent.

**3. Azure SQL Database (PaaS)**
This is a modern, fully managed cloud database designed specifically for new, cloud-native applications. 
* *Pros:* True PaaS. Automatic tuning, threat detection, and seamless scaling. 
* *Cons:* It does not support some legacy SQL Server features. It also sits behind a public endpoint by default (though you can lock it down with Private Link).

## Purchasing Models: DTU vs. vCore

If you choose Azure SQL Database, you face a critical billing decision: DTU or vCore.

**The DTU Model (Database Transaction Unit)**
A DTU is a blended, arbitrary measure of Compute, Memory, and I/O. It is a "black box" package. If you buy a 100 DTU database, you get a pre-configured ratio of power.
* *Advantage:* Simplicity. It is very easy for small applications where you don't want to think about hardware configuration.
* *Disadvantage:* You cannot scale resources independently. If your database requires massive storage but very little CPU, you still have to buy a massive DTU package to get the storage, wasting money on unused compute.

**The vCore Model (Virtual Core)**
This model strips away the abstraction. You explicitly choose the number of vCPUs, the amount of memory, and the storage tier.
* *Advantage:* Independent scaling. It translates perfectly from on-premises hardware specs (if you had 8 cores on-prem, you buy 8 vCores in Azure). 
* *The Cost Killer:* The vCore model allows you to use the **Azure Hybrid Benefit**. If you already own a SQL Server license, you can apply it here to strip the software cost out of the hourly rate, saving up to 55%.

## Elastic Pools

Imagine you are a SaaS provider with 100 customers, and you give each customer their own Azure SQL Database. Most of the time, the databases sit idle. If you provisioned 50 DTUs per database to handle occasional spikes, you would pay for 5,000 DTUs—most of which are wasted.

An **Elastic Pool** solves this. You buy a single pool of eDTUs (Elastic DTUs) or vCores (e.g., a 500 eDTU pool) and place all 100 databases inside it. The databases share the underlying compute power. When Customer A spikes, they draw from the pool. When they go quiet, the resources are instantly available to Customer B. This is the ultimate PaaS cost-optimization architecture.

## Summary

Azure SQL offers three primary paths: VMs (IaaS) for full control, Managed Instance (PaaS) for secure lift-and-shift, and SQL Database (PaaS) for modern cloud-native apps. When billing a SQL Database, the DTU model offers bundled simplicity, while the vCore model provides independent scaling and Azure Hybrid Benefit cost savings. For managing multiple databases with unpredictable usage spikes, always recommend an Elastic Pool.