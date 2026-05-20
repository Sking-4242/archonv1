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

## What's Next

Next up: Storage Gateway — bridging on-premises storage with AWS.