---
title: "Managed Disks: Block Storage for Virtual Machines"
type: content
estimated_minutes: 9
cert_tags: ["az_104", "az_305"]
---

# Managed Disks: Block Storage for Virtual Machines

## Overview

When you provision an Azure Virtual Machine, the operating system and data drives are backed by **Managed Disks**. A Managed Disk is fundamentally different from a Blob. Blobs are object storage accessed via HTTP APIs. Managed Disks are block-level storage volumes presented directly to the VM's operating system, exactly like a physical hard drive. 

This is the Azure equivalent to Amazon Elastic Block Store (EBS). Understanding the performance tiers of Managed Disks is crucial for database administrators and cloud architects to prevent storage bottlenecks.

## Unmanaged vs. Managed Disks (Historical Context)

In the early days of Azure, you had to use *Unmanaged Disks*. You created a standard Storage Account and placed the VHD (Virtual Hard Disk) files inside it. Because a single Storage Account has an IOPS (Input/Output Operations Per Second) limit, placing too many VHDs in one account caused "noisy neighbor" throttling. You had to manually math out how many disks you could safely place in each Storage Account.

**Managed Disks** abstract all of this away. You no longer create a Storage Account for your VM disks. You simply tell Azure, "I need a 128 GB Premium SSD," and Microsoft handles the underlying storage fabric, ensuring you get the exact IOPS and throughput you are paying for without ever hitting an artificial Storage Account limit. *Always use Managed Disks.*

## Disk Performance Tiers

Just like VM sizes, you must choose the right physical hardware for your Managed Disk. 

**1. Standard HDD**
Backed by spinning magnetic disks. Highly unpredictable latency. Use only for dev/test environments or non-critical backups where performance does not matter.

**2. Standard SSD**
Backed by solid-state drives, providing smoother latency than HDDs. Good for entry-level production web servers with light I/O demands.

**3. Premium SSD**
High-performance, low-latency solid-state drives. **This is the default for enterprise production workloads.** They offer provisioned IOPS and throughput. 
* *The Scaling Limitation:* On standard Premium SSDs, performance is tied to disk capacity. To get more IOPS, you must buy a larger disk, even if you don't need the actual storage space.

**4. Premium SSD v2 & Ultra Disks**
The cutting edge of Azure storage. These disks are designed for sub-millisecond latency and massive transactional databases (like SAP HANA or heavy SQL Server).
* *The Architectural Advantage:* Unlike standard Premium SSDs, **you can scale IOPS, throughput, and capacity entirely independently.** If you have a tiny 50 GB database that gets hammered with millions of reads per second, you can provision 80,000 IOPS without having to pay for a 4 TB disk.

## Host Caching

When attaching a disk to a VM, you can configure **Host Caching** (Read-only or Read/Write). Azure uses the RAM and the temporary local disk of the physical hypervisor to cache data before it travels over the network to the Managed Disk.
* **OS Disks:** Default to Read/Write caching.
* **Data Disks (Databases):** For SQL Server data files, you should generally set caching to **Read-only**. For SQL Server log files, set caching to **None** to ensure writes are immediately committed to the persistent Managed Disk.

## Summary

Managed Disks are the block storage volumes attached to Azure Virtual Machines. Microsoft handles the underlying infrastructure, guaranteeing performance without the IOPS limits of legacy Unmanaged Disks. Production workloads should default to Premium SSDs. For tier-one databases requiring extreme performance without buying unnecessary capacity, utilize Premium SSD v2 or Ultra Disks to scale IOPS independently.

## What's Next

Now that we have covered objects, files, and block storage, we must secure them. Our final storage lesson will cover the transition from legacy Access Keys to modern RBAC and Shared Access Signatures (SAS).