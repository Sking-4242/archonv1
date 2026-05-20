---
title: "EBS Volumes and Snapshots"
type: content
estimated_minutes: 9
cert_tags: ["aws_saa", "aws_soa", "aws_dva"]
---

# EBS Volumes and Snapshots

## Overview

Amazon Elastic Block Store (EBS) provides persistent block storage for EC2 instances. Block storage presents as a hard drive to the OS — you partition it, format it, and use it with any file system. Unlike instance store (physically attached, ephemeral), EBS volumes persist independently of the EC2 instance lifecycle.

## EBS Volume Types

EBS offers four volume categories: **SSD-backed:** **gp3** (General Purpose SSD, 3,000 IOPS baseline, independently configurable up to 16,000 IOPS — recommended default for most workloads), **io2 Block Express** (Provisioned IOPS SSD, up to 256,000 IOPS, sub-millisecond latency, for I/O-intensive databases like Oracle or SQL Server). **HDD-backed:** **st1** (Throughput Optimized HDD, high throughput for sequential workloads like ETL, log processing — cannot be boot volume), **sc1** (Cold HDD, lowest cost, infrequently accessed data — cannot be boot volume).

Key distinction: SSDs are optimized for IOPS (random I/O, small block sizes — databases, OS volumes). HDDs are optimized for throughput (sequential I/O, large block sizes — data lakes, log processing).

## EBS Snapshots

EBS Snapshots are point-in-time backups stored in S3 (managed by AWS — you don't see them in your S3 buckets). Snapshots are incremental: the first snapshot copies all data, subsequent snapshots copy only changed blocks. You're billed for the storage consumed by all snapshots, but restore always reconstructs the full volume.

Snapshots are the mechanism for creating EBS volume backups, sharing volumes between accounts, copying volumes across Regions (copy the snapshot to the target Region, then create a volume from it), and creating AMIs (AMIs reference the root EBS snapshot).

**Amazon Data Lifecycle Manager (DLM)** automates snapshot creation and deletion based on policies — create hourly snapshots, retain 24, then create daily snapshots, retain 7, etc. DLM eliminates manual snapshot management.

## EBS Multi-Attach and Encryption

**Multi-Attach:** io1/io2 volumes can be attached to multiple EC2 instances simultaneously (within the same AZ) — useful for shared storage in clustered databases (Oracle RAC). The application must handle concurrent writes explicitly; EBS doesn't provide distributed locking.

**Encryption:** EBS encryption uses AES-256 with keys managed by KMS. Encrypting an existing unencrypted volume requires: create a snapshot of the volume, copy the snapshot with encryption enabled, create a new volume from the encrypted snapshot, and swap volumes on the instance. For new volumes, enable encryption by default in the EC2 console → EBS settings — all new volumes will then be encrypted automatically.

## Summary

EBS provides persistent block storage: gp3 (general purpose SSD, recommended default), io2 (high IOPS databases), st1/sc1 (HDD for sequential and cold workloads). Snapshots are incremental S3-backed backups — use DLM for automated lifecycle. Encryption uses KMS (AES-256), enabled per-region for automatic encryption. io2 volumes support Multi-Attach for clustered applications.

## What's Next

Next: Placement Groups and Elastic IPs — advanced EC2 placement strategies and persistent public IP addressing.
