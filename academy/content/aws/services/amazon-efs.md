---
title: "Amazon EFS"
type: content
estimated_minutes: 18
cert_tags: ["CLF-C02", "SAA-C03", "SOA-C03"]
---

# Amazon EFS

## Overview

Amazon Elastic File System (EFS) is a fully managed, elastic **NFS file system** that can be mounted concurrently by many EC2 instances, containers, and Lambda functions across multiple Availability Zones. Where EBS gives a single instance a block device in one AZ, EFS gives a *shared file system* that scales automatically and is reachable from across a Region. This *service reference* lesson covers the EFS model, performance and throughput modes, storage classes, security, and what each certification expects.

EFS matters because many workloads need a shared, POSIX-compliant file system — content management systems, shared application/web roots, home directories, CI/CD artifacts, and lift-and-shift applications that expect a mounted NFS share. EFS provides that without you managing file servers or capacity: it grows and shrinks automatically as files are added and removed, is durable and available across multiple AZs, and is billed only for what you store. The defining contrast for the exam is **EFS = shared, multi-AZ, multi-client file storage (NFS, Linux); EBS = single-instance block storage in one AZ; S3 = object storage over an API; FSx = managed Windows (SMB) or high-performance Lustre file systems.**

---

## How It Works

You create a file system and **mount targets** — one per AZ, each an IP endpoint in a subnet, governed by a security group. Instances mount the file system over **NFS v4.1** using the mount target in their AZ (or via the EFS mount helper, which adds TLS). In **Standard** mode, data is stored redundantly across multiple AZs; **One Zone** mode stores it in a single AZ at lower cost (and lower durability). Capacity is fully elastic with no provisioning.

EFS performance has two dimensions:

- **Throughput mode**: **Elastic** (scales throughput up and down automatically with demand — the recommended default for spiky/unknown workloads), **Provisioned** (set a fixed throughput independent of size), or **Bursting** (throughput scales with stored data and accrues burst credits).
- **Performance mode**: **General Purpose** (lowest latency, the default, suitable for most workloads) or **Max I/O** (higher aggregate throughput for highly parallel workloads at slightly higher latency).

**Lifecycle management** automatically moves files not accessed for a configured period into **Infrequent Access (IA)** and **Archive** storage classes to cut cost, and can move them back on access.

---

## Key Features

- **Concurrent multi-AZ access** by thousands of clients — the core differentiator from EBS.
- **Elastic capacity** that grows/shrinks automatically with no provisioning step.
- **Storage classes and lifecycle management** (Standard/One Zone for active data; IA and Archive for cold data) for automatic cost tiering.
- **Encryption** at rest with KMS and in transit with TLS (via the EFS mount helper).
- **EFS Access Points** — application-specific entry points that enforce a POSIX user/group and a root directory, so each app is sandboxed to its own subtree.
- **Replication** to another Region (or another file system) for DR, with a managed, continuous copy.

---

## Configuration Reference

- **Mount targets** must exist in each AZ where clients run; the mount target's security group must allow **NFS (TCP 2049)** from the client instances' security group.
- **Encryption in transit** requires mounting with the EFS mount helper and TLS; at-rest encryption (KMS) is set at creation.
- **Throughput/performance modes** and **Standard vs. One Zone** are chosen by access pattern, durability needs, and cost.
- **Access Points** scope each application to a directory and POSIX identity, and IAM policies can require their use.

---

## Operations and Troubleshooting

- **Cannot mount.** Check that a mount target exists in the client's AZ, the security group allows NFS (2049) inbound from the client SG, VPC **DNS resolution/hostnames** are enabled (needed to resolve the file-system DNS name), and the NFS client/mount helper is installed.
- **Performance feels slow.** Monitor CloudWatch `PercentIOLimit`, throughput, and burst-credit metrics; switch to Elastic throughput for spiky workloads, or confirm you aren't exhausting Bursting credits on a small file system.
- **Cost control.** Enable lifecycle management to move cold files to IA/Archive, and use One Zone where multi-AZ durability isn't required.
- **No TLS.** A plain NFS mount is unencrypted in transit; use the mount helper with the TLS option to encrypt.

---

## Integrations

EFS is mounted by **EC2**, **ECS/EKS** (as a persistent volume via the EFS CSI driver), and **AWS Lambda** (attached file system), encrypted by **KMS**, monitored by **CloudWatch**, and backed up by **AWS Backup**. It complements **EBS** (single-instance block) and **S3** (object), and competes with **Amazon FSx** when a workload needs Windows/SMB or high-performance Lustre instead of Linux/NFS. DataSync can migrate on-premises NFS data into EFS.

---

## Pricing and Cost Considerations

EFS charges for the amount of data stored **per storage class** (Standard, One Zone, IA, Archive), plus throughput charges depending on mode (Elastic bills for throughput used; Provisioned bills for the throughput reserved). Because capacity is elastic, you pay only for stored data — but Standard (multi-AZ) costs more than One Zone, and **lifecycle management to IA/Archive is the main cost lever** for large file systems with cold data. There are small per-GB access charges when reading IA/Archive data, so lifecycle settings should match real access patterns. Exact prices vary by Region and class.

---

## Exam Relevance

**CLF-C02:** Know EFS as a managed, elastic, shared file system for multiple EC2 instances, distinct from EBS (single instance) and S3 (object). Foundational.

**SAA-C03:** Know when to choose EFS (shared multi-AZ NFS, Linux) vs. EBS vs. FSx (Windows/Lustre) vs. S3, plus storage classes, One Zone, throughput modes, Access Points, and encryption. Design depth — the storage-selection question is common.

**SOA-C03:** Operate it — mount targets and security groups, the DNS-resolution requirement, lifecycle management for cost, throughput-mode tuning, monitoring, and backups. Operations depth.

---

## Summary

Amazon EFS is a fully managed, elastic NFS (v4.1) file system mountable concurrently by many instances, containers, and Lambda functions across multiple AZs, with automatic capacity scaling and lifecycle tiering (Standard/One Zone for active data; IA/Archive for cold). Throughput modes (Elastic, Provisioned, Bursting) and performance modes (General Purpose, Max I/O) tune it to the workload; it is encrypted with KMS at rest and TLS in transit, accessed through per-AZ mount targets governed by security groups, sandboxed with Access Points, and backed up with AWS Backup or replicated cross-Region. The exam-critical skills are distinguishing EFS (shared multi-AZ Linux file) from EBS/S3/FSx and remembering the mount prerequisites (NFS 2049, DNS resolution, mount helper for TLS).

---

## Quick Check

1. What is the fundamental capability EFS provides that EBS cannot?
2. Which protocol and port must the mount target's security group allow, and what VPC setting must be enabled to resolve the file-system name?
3. Which throughput mode is recommended for spiky/unknown workloads, and how does Bursting differ?
4. When would you choose Amazon FSx instead of EFS?
5. How does EFS reduce cost for rarely accessed files, and what is required to encrypt traffic in transit?

---

## What's Next

Pair this with **Amazon EBS** and **Amazon S3** to compare the three storage models, and with **Amazon EC2** and the container service lessons for how workloads consume shared storage.
