---
title: "Persistent Disks & Local SSDs"
type: content
estimated_minutes: 9
cert_tags: ["ace", "pca"]
---

# Persistent Disks & Local SSDs

## Overview

While Cloud Storage handles unstructured objects via REST APIs, your Virtual Machines require block storage to run operating systems and databases. In GCP, block storage is provided primarily by **Persistent Disks (PD)**.

Unlike a physical hard drive slotted into a server, a Persistent Disk is a network-attached storage construct. This allows the disk to survive the death of the Virtual Machine it is attached to.

## Persistent Disk Tiers

GCP abstracts the underlying hardware into distinct performance tiers:

1. **Standard (pd-standard):** Backed by spinning magnetic hard drives (HDD). Used only for cheap, sequential I/O (like massive log processing) or cold storage.
2. **Balanced (pd-balanced):** Backed by Solid State Drives (SSD). This is the default choice for most enterprise workloads, balancing cost with solid IOPS performance.
3. **Performance (pd-ssd):** Backed by high-performance SSDs for heavy, transactional databases.
4. **Extreme (pd-extreme):** For massive, mission-critical workloads (like SAP HANA) where you must provision IOPS completely independently of the disk's storage capacity.

## Regional Persistent Disks

By default, a Persistent Disk is Zonal. If it lives in `us-central1-a` and that zone floods, the VM crashes and the disk goes offline.

For high-availability databases without application-level replication, you can provision a **Regional Persistent Disk**. 
* *How it works:* GCP synchronously replicates every block written to the disk across two separate Zones (e.g., Zone A and Zone B).
* *The Failover:* If Zone A fails, you simply spin up a new Virtual Machine in Zone B and attach the replicated disk. You achieve near-zero RPO (Recovery Point Objective) natively at the storage layer.

## Local SSDs (The Ephemeral Speed Demon)

Sometimes, network-attached storage is not fast enough. If you are building a massive NoSQL cache or a high-frequency trading algorithm, you need sub-millisecond latency. 

You achieve this using **Local SSDs**. These are physical NVMe solid-state drives slotted directly into the motherboard of the host server running your Virtual Machine. 
* *The Advantage:* Extreme, unparalleled IOPS and lowest possible latency.
* *The Catch:* **They are strictly ephemeral.** If you stop the VM, or if Google performs host maintenance, the data on the Local SSD is permanently and instantly destroyed. You must never store persistent database records on a Local SSD; they are exclusively for caching, scratch space, and swap files.

## Summary

Compute Engine utilizes network-attached Persistent Disks for block storage. Workloads are matched to Standard (HDD), Balanced (SSD), or Performance tiers based on IOPS requirements. To protect against zonal failures, architects utilize Regional Persistent Disks for synchronous cross-zone replication. For extreme, low-latency requirements, Local SSDs are utilized, provided the architecture accounts for their strictly ephemeral nature.