---
title: "Amazon FSx: Purpose-Built Managed File Systems"
type: content
estimated_minutes: 8
cert_tags: ["SAA-C03", "SAP-C02"]
---

# Amazon FSx: Purpose-Built Managed File Systems

## Overview

Amazon FSx offers fully managed third-party file systems for workloads that need specific protocols or performance characteristics beyond what EFS provides. The four FSx flavors cover Windows SMB, high-performance computing, NetApp ONTAP, and OpenZFS workloads.

## FSx for Windows File Server

Provides fully managed Windows native file storage with SMB protocol, NTFS, Active Directory integration, DFS Namespaces, and VSS (Volume Shadow Copy). Use for Windows workloads, .NET apps, SQL Server databases (user databases on SMB), SharePoint, and Windows home directories. Supports single-AZ and Multi-AZ deployment for HA.

## FSx for Lustre

Lustre is a high-performance parallel filesystem used in HPC, machine learning, video processing, and financial simulations. FSx for Lustre delivers sub-millisecond latencies and hundreds of GB/s throughput. It can be linked to an S3 bucket — data is loaded lazily from S3 when first accessed and results can be exported back to S3. Choose Scratch (no replication, cheapest, for temp HPC jobs) or Persistent (replicated, for long-running workloads).

## FSx for NetApp ONTAP

Managed NetApp ONTAP for teams already running ONTAP on-premises who want to lift-and-shift or extend to AWS without retraining. Supports NFS, SMB, and iSCSI simultaneously. Includes ONTAP features like SnapMirror (replication), thin provisioning, deduplication, and compression. Multi-AZ deployments available.

## FSx for OpenZFS

Managed OpenZFS offering NFS access with ZFS features: compression, snapshots, clones, and data deduplication. Delivers up to 1 million IOPS and 12.5 GB/s throughput with sub-millisecond latency. Ideal for workloads currently on on-premises ZFS or NFS that need high performance on AWS.

## Summary

FSx offers four managed file systems for specific workload needs: Windows File Server for SMB/AD workloads, Lustre for HPC/ML, NetApp ONTAP for ONTAP migrations, OpenZFS for high-performance NFS. Choose EFS for general Linux NFS needs and FSx when you need a specific protocol, performance tier, or OS-native feature.

## Examples

A mid-sized law firm migrates its on-premises Windows file server environment to AWS. Their lawyers' PCs are joined to Active Directory, and their backup software uses VSS for consistent snapshots of open files. They deploy FSx for Windows File Server in Multi-AZ configuration, connect it to their existing AD domain, and map the SMB shares exactly as before. The lawyers notice nothing changed — they still browse `\\fileserver\cases\` from Windows Explorer, VSS backups still work, and DFS Namespaces let the IT team manage multiple file server paths as one logical tree. This is FSx for Windows doing exactly what it says: replacing a Windows file server with zero retraining.

A pharmaceutical company trains large deep learning models for drug discovery on thousands of GPU cores running in parallel. They need a shared filesystem that all GPU nodes can read simultaneously at hundreds of GB/s with sub-millisecond latency. They provision FSx for Lustre in Persistent mode, link it to an S3 bucket containing their training datasets, and mount it on their EC2 HPC cluster. Lustre lazy-loads data from S3 on first read and stripes data across nodes for parallel throughput — a single node's read speed would never saturate the filesystem. After training, results are exported back to S3. EFS could not come close to this throughput; Lustre is the only right answer at this scale.

A DevOps team runs a mixed CI/CD environment where build agents run on Linux but artifact storage must also serve Windows integration-test VMs over SMB and a legacy Oracle RAC cluster over iSCSI. Their on-premises solution was NetApp ONTAP, and the team knows its deduplication and SnapMirror replication features well. They migrate to FSx for NetApp ONTAP, which presents NFS, SMB, and iSCSI from the same managed filesystem simultaneously. The key insight: FSx for ONTAP earns its complexity premium when you already know ONTAP and need multi-protocol access — it is not the default choice for a greenfield Linux workload.

## Think About It

1. FSx for Lustre can be linked to an S3 bucket so data is loaded lazily on first read. What performance problem does this create for the first job that runs on a newly provisioned Lustre filesystem, and how would you mitigate it before launching a time-sensitive HPC job?
2. Why would a company choose FSx for NetApp ONTAP over EFS for a workload that only needs NFS access on Linux? What would that choice say about their organizational priorities and constraints?
3. FSx for Windows File Server integrates with Active Directory. What security and operational problems would arise if you tried to replicate this capability using EFS instead — and what does that tell you about when protocol-specific managed services justify their cost?
4. FSx for Lustre offers Scratch (no replication) and Persistent (replicated) deployment types. If a genomics research team runs a week-long simulation job, which type is appropriate — and what is the real cost of the cheaper option if the job fails on day six?
5. How would you decide between FSx for OpenZFS and FSx for NetApp ONTAP for a new workload that needs high-performance NFS and snapshot capabilities, with no existing investment in either platform?

## Quick Check

**Q1.** A company needs to deploy a managed file system on AWS with SMB protocol support, Active Directory integration, and VSS snapshot compatibility for Windows workloads. Which FSx option should they choose?
- A) FSx for Lustre
- B) FSx for OpenZFS
- C) FSx for NetApp ONTAP
- D) FSx for Windows File Server

**Answer: D** — FSx for Windows File Server provides native SMB, NTFS, AD integration, and VSS support — the full Windows file server feature set in a managed service.

**Q2.** An HPC cluster needs shared storage delivering hundreds of GB/s of aggregate throughput with sub-millisecond latency across thousands of parallel compute nodes. Which AWS storage service is designed for this?
- A) Amazon EFS with Max I/O performance mode
- B) FSx for Lustre
- C) FSx for NetApp ONTAP
- D) EBS io2 with Multi-Attach

**Answer: B** — FSx for Lustre is a high-performance parallel filesystem built for HPC and ML workloads, capable of hundreds of GB/s aggregate throughput with sub-millisecond latency.

**Q3.** Which FSx deployment type for Lustre is most appropriate for a short-lived, temporary HPC job where cost is the priority and data loss on failure is acceptable?
- A) Persistent HDD
- B) Persistent SSD
- C) Scratch
- D) Single-AZ

**Answer: C** — Scratch deployments offer no replication and are the cheapest option for temporary, short-duration HPC jobs where the compute results are the output and the filesystem is disposable.

## What's Next

Next up: Storage Gateway — bridging on-premises storage with AWS.