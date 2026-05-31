---
title: "Amazon EFS: Elastic File System"
type: content
estimated_minutes: 10
cert_tags: ["SAA-C03", "CLF-C02"]
---

# Amazon EFS: Elastic File System

## Overview

Amazon Elastic File System (EFS) provides managed NFS (Network File System) storage that multiple EC2 instances and containers can mount simultaneously across multiple AZs. Unlike EBS (one volume, one AZ), EFS scales automatically and is accessible from any AZ in its region.

## EFS vs. EBS

EBS is block storage attached to one instance in one AZ. EFS is file storage (NFS v4) mountable from thousands of clients across multiple AZs simultaneously. EFS costs more per GB (~$0.30/GB/month for Standard vs. ~$0.08 for gp3 EBS) but eliminates the need to manage capacity — it grows and shrinks automatically. Use EFS for shared filesystems; use EBS for single-instance databases and boot volumes.

## EFS Performance Modes

Bursting Throughput: throughput scales with filesystem size, bursting to high rates for short periods. Provisioned Throughput: set a fixed throughput regardless of storage size (useful when throughput demand exceeds what storage size gives you). Elastic Throughput (recommended): automatically scales throughput up and down to meet workload needs, paying only for what you use. Performance mode: General Purpose (default, low latency) vs. Max I/O (higher aggregate throughput, higher latency — for massively parallel workloads).

## EFS Storage Classes

EFS Standard stores data redundantly across 3+ AZs in the region. EFS Standard-IA and One Zone-IA are cheaper classes for infrequently accessed files. EFS Intelligent Tiering automatically moves files between Standard and IA based on access patterns (after 30 days of no access by default). Use lifecycle management rules to configure this.

## Mounting EFS

Mount EFS using the AWS EFS mount helper (amazon-efs-utils) which wraps the Linux NFS client and handles TLS encryption in transit. Mount targets must exist in each AZ where clients will connect. Each mount target gets a DNS name; use the filesystem DNS name which resolves to the correct AZ mount target based on the client's AZ. Security groups on the mount target must allow NFS traffic (port 2049) from client security groups.

## EFS Access Points

EFS Access Points are application-specific entry points that enforce a specific POSIX user identity and a root directory path. This lets multiple applications share one EFS filesystem with isolated directory trees and separate permission models. Combined with IAM authorization (require IAM identity for EFS mounts), Access Points provide strong multi-tenant isolation.

## Summary

EFS is managed NFS — scalable shared file storage mountable from thousands of clients across AZs. Choose Elastic Throughput for most workloads. Enable Intelligent Tiering to automatically move cold files to IA. Use Access Points for multi-application shared filesystems. EFS is the answer whenever EC2 or container workloads need shared persistent file storage.

## Examples

A startup runs a containerized web application on ECS Fargate across three AZs. Their app generates user-uploaded profile images that must be readable by any container regardless of which AZ it lands in. They mount an EFS filesystem into each task definition using the EFS volume driver. Because EFS Standard stores data redundantly across all AZs, every container sees the same files instantly without any synchronization logic in the application code. This is the simplest EFS use case: replacing instance-local file storage with a filesystem that "just works" across distributed compute.

A data science team at a healthcare company runs dozens of Jupyter notebooks simultaneously on EC2 instances, all reading from the same shared dataset of anonymized patient records (several hundred GB). They mount EFS with Elastic Throughput so that throughput scales automatically when fifteen researchers simultaneously kick off data loading — and drops back down when they stop, avoiding the cost of over-provisioned Provisioned Throughput. They also enable Intelligent Tiering so that datasets untouched for 30 days migrate to EFS Standard-IA automatically, cutting storage costs without any manual cleanup.

A platform engineering team builds a multi-tenant SaaS product where each customer's data must be strictly isolated on a shared EFS filesystem. They create one EFS Access Point per tenant, each enforcing a specific POSIX UID/GID and a root path like `/tenants/customer-123/`. Combined with IAM authorization on the mount, no tenant's application process can read another tenant's directory even if the code has a path traversal bug — the Access Point clamps the apparent root at the mount level. This is the nuanced case: EFS Access Points are not just for convenience, they are an architectural security boundary.

## Think About It

1. EFS costs roughly four times more per GB than gp3 EBS. Under what conditions is that price premium clearly worth paying, and when would it signal an architectural mistake?
2. What would happen if you deployed EFS with Provisioned Throughput set to a fixed value, and then your workload suddenly grew five times in a week? How does this compare to Elastic Throughput, and what does your choice say about how well you know your own traffic patterns?
3. The EFS mount target is AZ-specific, but the filesystem DNS name resolves to the correct AZ's mount target automatically. Why does this matter for high availability, and what happens to instances in an AZ if that AZ's mount target is misconfigured or missing?
4. How do EFS Access Points differ from traditional UNIX file permissions as a multi-tenancy mechanism? What threat do Access Points guard against that standard permissions cannot?
5. You are choosing between EFS Standard and EFS One Zone for a shared filesystem serving EC2 instances in a single AZ. What trade-offs in durability, cost, and failure scenario would drive your decision?

## Quick Check

**Q1.** A development team needs shared file storage accessible from EC2 instances across three Availability Zones simultaneously. Which AWS storage service is most appropriate?
- A) EBS with Multi-Attach
- B) Amazon EFS
- C) Amazon S3
- D) Instance Store

**Answer: B** — EFS is managed NFS storage that can be mounted simultaneously from thousands of clients across multiple AZs in a region; EBS Multi-Attach is limited to one AZ.

**Q2.** Which EFS throughput mode automatically scales throughput up and down based on actual workload demand, and charges only for what is used?
- A) Bursting Throughput
- B) Provisioned Throughput
- C) Elastic Throughput
- D) Max I/O

**Answer: C** — Elastic Throughput (the recommended mode) scales automatically with your workload and bills only for the throughput consumed, eliminating the need to forecast capacity.

**Q3.** What is the primary purpose of an EFS Access Point?
- A) To provide a second DNS endpoint for the filesystem for load balancing
- B) To enforce a specific POSIX user identity and root directory path for an application
- C) To enable cross-region replication of EFS data
- D) To allow EC2 instances to mount EFS without a mount target in their AZ

**Answer: B** — EFS Access Points enforce a specific POSIX UID/GID and root path at the mount level, providing isolation between multiple applications sharing one filesystem.

## What's Next

Next up: FSx — purpose-built managed file systems for Windows, Lustre, NetApp, and OpenZFS.