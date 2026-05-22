---
title: "Azure Site Recovery (ASR): Orchestrated DR"
type: content
estimated_minutes: 12
cert_tags: ["az_104", "az_305"]
---

# Azure Site Recovery (ASR): Orchestrated DR

## Overview

If your organization has an RTO (Recovery Time Objective) of 15 minutes, Azure Backup is useless. You cannot provision a new Virtual Machine, attach a disk, and stream 2 TB of backup data from a vault into that disk in 15 minutes. 

To achieve rapid recovery, you need **Azure Site Recovery (ASR)**. ASR is Microsoft's Disaster Recovery as a Service (DRaaS). It provides continuous block-level replication of your Virtual Machines to a secondary Azure region (or from an on-premises VMware/Hyper-V environment into Azure). It is the direct equivalent of AWS Elastic Disaster Recovery (formerly CloudEndure).

## How ASR Works (The Mechanics)

ASR is not a snapshot tool. It operates at the hypervisor or OS level.

1. **Replication:** ASR intercepts disk writes on the source VM. As soon as a block of data is written to the primary Managed Disk in `East US`, ASR silently replicates that block over the Microsoft backbone to a target Storage Account or Managed Disk in the paired region (`West US`).
2. **Continuous Sync:** Because this replication is continuous, your RPO drops from 24 hours (nightly backups) to *seconds* or *minutes*.
3. **The Compute Cost Advantage:** During normal operations, you pay for the storage in the target region and the ASR license. **You do not pay for compute.** The target VMs in `West US` do not actually exist yet; Azure simply holds the replicated disks and the configuration files.

## The Failover Process

When a disaster strikes, you initiate a **Failover**. ASR reads the configuration file, spins up the target Virtual Machines in `West US`, attaches the synchronized disks, and boots the OS. This process takes minutes, satisfying strict RTOs.

ASR supports three distinct types of failovers. You must know the difference:

**1. Test Failover (The DR Drill)**
DR plans are worthless unless tested. A Test Failover allows you to boot up the target VMs in a completely isolated, non-routable Virtual Network. You can verify the application works without disrupting the continuous replication of your live production environment. *Architects should mandate automated Test Failovers every quarter.*

**2. Planned Failover**
Used for anticipated events (e.g., a massive hurricane is forecasted to hit your primary data center's coast in 48 hours). ASR gracefully shuts down the source VMs, completes one final replication sync to guarantee **zero data loss**, and boots the target VMs in the secondary region.

**3. Unplanned Failover**
The data center is already on fire or a severed fiber cable has caused a hard outage. ASR immediately boots the target VMs using the most recent recovery point. Some minimal data loss (a few seconds to minutes) is expected.

## Reprotect and Failback

A disaster recovery event is not a one-way street. Eventually, the primary region comes back online.

Once `East US` is repaired, you must initiate the **Reprotect** phase. ASR reverses the replication flow. It takes the changed data from the VMs currently running in `West US` and begins synchronizing it *back* to `East US`. 

Once the data is fully synced, you initiate a **Failback** (which is essentially a Planned Failover in reverse), gracefully shutting down the `West US` VMs and restoring primary operations in `East US`.

## Summary

Azure Site Recovery (ASR) provides continuous block-level replication to achieve near-zero RPOs and minute-level RTOs. It saves OpEx because the target VMs do not accrue compute charges until a failover is actually triggered. ASR orchestrates the entire lifecycle: from isolated Test Failovers for compliance drills, to Unplanned Failovers during disasters, and finally the Reprotect and Failback processes to restore normalcy.