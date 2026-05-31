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

## Examples

A small e-commerce startup runs their Magento store on a single EC2 instance with a 100 GB gp3 root volume. During a flash sale, their product catalog queries slow dramatically. They realize the bottleneck is their MySQL database doing high random I/O on the same gp3 volume. They detach the DB files to a separate gp3 volume and tune its IOPS to 6,000 (independently of throughput) — a capability unique to gp3 that gp2 lacked. Query latency drops by 60%. This illustrates the most common beginner EBS lesson: gp3 lets you dial in IOPS and throughput independently, so you only pay for what you need.

A financial analytics firm runs Oracle RAC on two EC2 instances that must share a single block device for coordinated writes to a clustered tablespace. They provision an io2 Block Express volume (256,000 IOPS, sub-millisecond latency) and enable EBS Multi-Attach, connecting it to both instances in the same AZ simultaneously. Their Oracle cluster handles concurrent write coordination at the application layer. The io2 Multi-Attach setup replaces what would have previously required a SAN — delivered as a managed AWS service with no physical hardware to rack.

A data engineering team at a media company ingests 2 TB of raw log files nightly into an EC2 instance for ETL processing. They mistakenly attach a gp3 volume for this workload and notice the pipeline is throughput-constrained — high sequential reads, large block sizes. Switching to an st1 (Throughput Optimized HDD) volume cuts their storage cost by 70% and actually increases pipeline throughput, because st1 is purpose-built for exactly this sequential workload profile. The lesson: IOPS and throughput are not the same metric, and choosing the wrong optimization axis wastes both money and performance.

## Think About It

1. EBS Snapshots are incremental — only changed blocks are stored after the first snapshot. Why does AWS charge for all snapshots' cumulative storage, and how does this affect your backup retention policy design?
2. If you need to encrypt an existing unencrypted EBS volume with live data, the process requires creating a snapshot, copying it with encryption, then swapping volumes. What are the operational risks during that swap window, and how would you minimize downtime?
3. io2 Multi-Attach allows multiple EC2 instances to write to the same EBS volume simultaneously, but EBS provides no distributed locking. What could go wrong if an application is not explicitly designed for concurrent writes — and what kinds of applications are safe to use it with?
4. gp3 allows you to provision IOPS and throughput independently of volume size. How does this change your capacity-planning approach compared to gp2, where IOPS scaled automatically with size?
5. Amazon Data Lifecycle Manager can automate snapshot creation and deletion. What retention policy would you design for a production database that needs to meet a 7-day RTO/RPO target while keeping storage costs predictable?

## Quick Check

**Q1.** Which EBS volume type is recommended as the default for most EC2 workloads and allows IOPS and throughput to be configured independently of volume size?
- A) io2 Block Express
- B) gp3
- C) st1
- D) sc1

**Answer: B** — gp3 is AWS's recommended general-purpose SSD volume; unlike gp2, it decouples IOPS and throughput from volume size, so you can right-size performance without over-provisioning storage.

**Q2.** A company wants to copy an EBS volume from us-east-1 to eu-west-1. What is the correct sequence of steps?
- A) Detach the volume, then re-attach it in eu-west-1
- B) Create a snapshot, copy the snapshot to eu-west-1, then create a volume from it
- C) Use the AWS CLI `ebs copy-volume` command directly
- D) Enable EBS Multi-Attach and mount it from eu-west-1

**Answer: B** — EBS volumes are AZ-scoped; moving one cross-Region requires creating a snapshot (which is stored in S3), copying the snapshot to the target Region, and then creating a new volume from it there.

**Q3.** Which EBS volume type supports Multi-Attach, allowing a single volume to be attached to multiple EC2 instances simultaneously?
- A) gp3
- B) st1
- C) io1 and io2
- D) sc1

**Answer: C** — Only Provisioned IOPS SSD volumes (io1/io2) support Multi-Attach, enabling shared block storage for clustered applications like Oracle RAC within a single Availability Zone.

## What's Next

Next: Placement Groups and Elastic IPs — advanced EC2 placement strategies and persistent public IP addressing.
