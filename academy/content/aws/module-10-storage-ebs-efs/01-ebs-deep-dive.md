---
title: "EBS Deep Dive: Volume Types and Performance"
type: content
estimated_minutes: 10
cert_tags: ["SAA-C03", "CLF-C02"]
---

# EBS Deep Dive: Volume Types and Performance

## Overview

Amazon Elastic Block Store (EBS) provides persistent block storage for EC2 instances. Unlike instance store (ephemeral), EBS volumes survive instance stops and terminations. This lesson covers the EBS volume types, how to choose between them, and performance characteristics critical for storage-heavy workloads.

## EBS Volume Types

EBS has two main categories: SSD-backed and HDD-backed. SSD types: gp3 (General Purpose, 3,000 IOPS baseline, independently configurable up to 16,000 IOPS and 1,000 MB/s), gp2 (legacy, IOPS linked to size at 3 IOPS/GB), io2 Block Express (up to 256,000 IOPS, 4,000 MB/s, 99.999% durability — for critical databases), io1 (legacy provisioned IOPS). HDD types: st1 (Throughput Optimized, sequential workloads like Kafka, MapReduce), sc1 (Cold HDD, lowest cost, infrequently accessed).

## gp3 vs. gp2

gp3 is the recommended default for most workloads. It costs 20% less than gp2 and lets you configure IOPS and throughput independently of volume size. With gp2, you had to over-size the volume to get the IOPS you needed. gp3 starts at 3,000 IOPS and 125 MB/s baseline — already more than gp2's baseline for small volumes. Always choose gp3 for new deployments.

## Provisioned IOPS: io2 and io1

Use provisioned IOPS volumes for latency-sensitive workloads that need sustained, low-latency performance: high-transaction databases (Oracle, SQL Server, large PostgreSQL), SAP HANA. io2 Block Express is the top tier — sub-millisecond latency, 256,000 IOPS max, Multi-Attach support. The max IOPS:GB ratio is 500:1, meaning a 200 GB io2 volume can have up to 100,000 IOPS.

## EBS Multi-Attach

io1 and io2 volumes support Multi-Attach, allowing a single volume to be attached to up to 16 Nitro-based EC2 instances in the same AZ simultaneously. Each instance has full read-write access. Your application must handle concurrent writes correctly (typically with a cluster-aware filesystem like GFS2 or application-level locking). Multi-Attach is used for high-availability OLTP clusters.

## EBS Encryption

EBS encryption uses AES-256 and AWS KMS. When you encrypt a volume, all data at rest, all data in transit between instance and volume, all snapshots, and all volumes created from those snapshots are encrypted. Encryption has no effect on latency — AWS Nitro hardware handles it transparently. Enable encryption by default at the account level in EC2 settings.

## Summary

EBS is per-AZ persistent block storage for EC2. Use gp3 as the default; io2 for databases needing guaranteed IOPS; st1 for sequential throughput; sc1 for cold archival. Multi-Attach enables shared block storage clusters. Enable encryption by default — it's free from a performance perspective.

## What's Next

Next up: EBS Snapshots — point-in-time backups, fast snapshot restore, and cross-region copy.