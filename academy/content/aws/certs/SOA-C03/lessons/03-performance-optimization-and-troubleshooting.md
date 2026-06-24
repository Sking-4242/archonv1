---
title: "Performance Optimization and Troubleshooting"
type: content
estimated_minutes: 16
cert_tags: ["SOA-C03"]
---

# Performance Optimization and Troubleshooting

## Overview

A CloudOps engineer is often the person who gets paged when something is slow, and the SOA-C03 exam reflects this with Task 1.3, "implement performance optimization strategies for compute, storage, and database resources." This is hands-on, metric-driven work: read the performance metrics, identify the bottleneck, and apply the right remediation — resize a volume, change a volume type, add an RDS read replica, enable Performance Insights, accelerate an S3 transfer. The questions are diagnostic ("throughput is throttled — why and how do you fix it") and selection-based ("which storage/volume type fits this access pattern at lowest cost").

The unifying skill is **matching the resource and its configuration to the workload's performance characteristics, using metrics to find the constraint**. Performance problems are usually a mismatch — a gp2 volume too small to deliver the needed IOPS, an RDS instance maxed on read IOPS, an S3 transfer not using the right acceleration. CloudOps engineers fix these by interpreting the specific metrics each service exposes (EBS volume queue length and throughput, RDS Performance Insights, CloudWatch compute metrics) and choosing the optimization that resolves the constraint at acceptable cost. This lesson collects the performance-and-troubleshooting knowledge across compute, EBS, S3, shared file storage, and RDS that the exam draws on.

After it you will be able to diagnose a performance bottleneck from metrics and apply the correct optimization for compute, storage, and database resources.

## Core Concepts

### Compute Performance and Right-Sizing

Compute performance starts with reading CloudWatch metrics (CPU utilization, plus memory and processes via the agent) and matching the **instance type/family** to the workload — compute-optimized, memory-optimized, burstable (T-family), etc. A common operational issue is **T-family (burstable) instances exhausting CPU credits**, which throttles them; the fix is to monitor `CPUCreditBalance` and either enable unlimited mode or move to a non-burstable family. **Right-sizing** uses metrics (and tools like AWS Compute Optimizer) to pick an instance that fits actual usage, and **resource tags** help group and analyze resources for optimization. **Placement groups** (cluster for low-latency/high-throughput networking, spread for fault isolation, partition for large distributed workloads) optimize EC2 networking for specific patterns. The exam pairs "throttled burstable instance" with CPU credits and "low-latency inter-instance networking" with cluster placement groups.

### EBS Performance and Volume Types

**Amazon EBS** performance is one of the most-tested operational topics. Each volume type has a performance profile: **gp3** (general-purpose SSD, baseline 3,000 IOPS / 125 MB/s with independently provisionable IOPS and throughput — usually the best price/performance and the modern default), **gp2** (older SSD where IOPS scale with size at 3 IOPS/GB, so a small gp2 volume is IOPS-starved), **io1/io2** (provisioned IOPS SSD for the highest, consistent IOPS — databases), and **st1/sc1** (throughput-optimized/cold HDD for large sequential workloads). The classic operational problem: a **gp2 volume is too small and hits its IOPS cap**, causing I/O throttling — diagnosed via the `VolumeQueueLength`, throughput, and IOPS metrics, and remediated by **switching to gp3** (decoupling IOPS from size and often cheaper) or increasing size/provisioned IOPS. The exam pairs "EBS I/O throttling on a small gp2 volume" with migrating to gp3 (or provisioning more IOPS), improving performance and often reducing cost.

### S3 Performance Strategies

For S3, the exam names specific performance tools: **multipart upload** (parallelize large-object uploads for speed and resilience), **S3 Transfer Acceleration** (use CloudFront edge locations to speed long-distance uploads/downloads), **AWS DataSync** (fast, managed bulk transfer between on-premises and S3 or between AWS storage), and **S3 Lifecycle policies** (transition/expire objects to optimize storage cost and access). S3 itself scales to very high request rates per prefix automatically, so performance work is mostly about the transfer path and access patterns. The exam pairs "speed up large/long-distance transfers" with multipart + Transfer Acceleration (or DataSync for bulk migration) and "optimize storage cost by access pattern" with Lifecycle policies.

### Shared File Storage: EFS and FSx

When workloads need shared file storage, you select and optimize between **Amazon EFS** (elastic NFS for Linux, with **lifecycle policies** to move infrequently accessed files to cheaper IA storage and **throughput/performance modes** to match the workload) and **Amazon FSx** (purpose-built: FSx for Windows for SMB/Windows workloads, FSx for Lustre for HPC/high-throughput). The operational decisions: choose EFS for shared Linux file access and apply EFS lifecycle policies to control cost; choose the right FSx flavor for Windows or HPC. The exam pairs "shared Linux file system, optimize cost" with EFS + lifecycle policies and "Windows file shares / HPC scratch" with the appropriate FSx.

### RDS Performance: Insights, Replicas, and Proxy

For database performance, the exam names **Amazon RDS Performance Insights** (a dashboard that visualizes database load and identifies the top SQL, waits, and hosts driving it — the primary tool for diagnosing RDS performance and now offering **proactive recommendations**), **CloudWatch alarms** on RDS metrics (CPU, connections, read/write IOPS, replica lag), **read replicas** (offload read traffic to relieve a read-bound primary), and **RDS Proxy** (connection pooling that prevents connection exhaustion from many short-lived clients — common with Lambda). The operational diagnosis: read IOPS or CPU maxed → consider a larger instance, **read replicas** for read-heavy load, or storage/IOPS changes; too many connections / connection storms → **RDS Proxy**; find the offending queries → **Performance Insights**. The exam pairs these symptoms with these specific remediations.

### A Metric-Driven Troubleshooting Method

Across all of these, the method is the same: **read the right metric to find the constraint, then apply the matching fix**. EBS throttling → volume queue length/IOPS → gp3 or more IOPS; RDS slow → Performance Insights → replicas/Proxy/sizing; compute throttled → CPU credits → unlimited mode/non-burstable; transfer slow → multipart/Transfer Acceleration/DataSync. The exam rewards engineers who reason from the symptom and metric to the specific service feature that resolves it.

## Configuration Reference

Symptom → diagnosis → fix:

```text
Burstable instance throttled    CPUCreditBalance low      → unlimited mode / non-burstable family
EBS I/O throttling (small gp2)  VolumeQueueLength, IOPS    → migrate to gp3 (decouple IOPS/size) or +IOPS
Need highest consistent IOPS    DB workload                → io1/io2 provisioned IOPS
Large sequential throughput     big data / logs            → st1 (throughput-optimized HDD)
Slow large/long-distance S3      transfer time             → multipart upload + S3 Transfer Acceleration
Bulk on-prem→S3 migration       data volume                → AWS DataSync
Shared Linux files, cut cost    access pattern             → EFS + lifecycle policies (IA tier)
Windows shares / HPC            workload type              → FSx for Windows / FSx for Lustre
RDS read-bound / high read IOPS  CloudWatch, Perf Insights  → read replicas (and/or larger instance)
RDS connection exhaustion       many short-lived clients    → RDS Proxy (connection pooling)
Find slow queries               DB load                     → RDS Performance Insights
Low-latency inter-instance net  HPC/cluster                 → cluster placement group
```

## How to Decide

- **EBS volume throttling?** → check IOPS/queue length; migrate gp2→**gp3** (or provision more IOPS); use **io1/io2** for the highest consistent IOPS.
- **Burstable instance slow?** → check **CPU credits**; enable unlimited or move family.
- **Speed up S3 transfers?** → **multipart** + **Transfer Acceleration** (or **DataSync** for bulk migration); **Lifecycle** for cost.
- **Shared file storage?** → **EFS** (+lifecycle) for Linux, **FSx** for Windows/HPC.
- **RDS slow?** → **Performance Insights** to diagnose; **read replicas** for reads, **RDS Proxy** for connection storms, sizing/IOPS for resource limits.
- **Inter-instance latency?** → **cluster placement group**.

## How This Connects

This lesson is the "optimize" half of Domain 1, building on the monitoring lesson (you optimize from metrics) and the automation lesson (remediation can be automated). It reuses the shared EBS, EFS/FSx, RDS, and S3 lessons, taking them to a performance-troubleshooting angle, and connects to reliability (scaling relieves load) and cost (gp3 and lifecycle reduce cost while improving performance).

## Exam Traps

- **Leaving small gp2 volumes IOPS-starved.** gp2 IOPS scale with size; migrate to **gp3** to decouple IOPS from size (usually cheaper and faster).
- **Missing CPU credit exhaustion** on burstable (T-family) instances as the cause of throttling.
- **Using read replicas for connection problems.** Connection exhaustion is **RDS Proxy**; read replicas are for read *throughput*.
- **Ignoring Performance Insights.** It's the primary tool to find what's driving RDS load.
- **Forgetting the transfer-path tools.** Multipart/Transfer Acceleration/DataSync address S3 transfer speed, not bucket configuration.
- **Wrong shared-storage choice.** EFS for Linux NFS; FSx for Windows/SMB or HPC/Lustre.

## Summary

Performance work in CloudOps is metric-driven matching of resources to workloads. For compute, watch CPU (and memory via the agent), right-size with Compute Optimizer, fix burstable throttling via CPU credits, and use placement groups for network-sensitive workloads. For EBS, know the volume types — migrate IOPS-starved small gp2 volumes to gp3 (decoupling IOPS from size, often cheaper), use io1/io2 for the highest consistent IOPS, and st1 for sequential throughput — diagnosing with queue-length and IOPS metrics. For S3, speed transfers with multipart upload, Transfer Acceleration, and DataSync, and control cost with Lifecycle. For shared files, pick EFS (+lifecycle) for Linux or the right FSx for Windows/HPC. For RDS, diagnose with Performance Insights and remediate with read replicas (reads), RDS Proxy (connections), or sizing/IOPS. In every case, read the right metric to find the constraint, then apply the matching service feature.

## Examples

**Example 1 — gp2 throttling.** A 100 GB gp2 volume throttles at ~300 IOPS → migrate to **gp3** (3,000 IOPS baseline, independent of size) — faster and cheaper.

**Example 2 — RDS connection storm.** A Lambda-backed app exhausts RDS connections under load → put **RDS Proxy** in front for connection pooling.

**Example 3 — Slow cross-region upload.** Users worldwide upload large files slowly → enable **multipart upload** and **S3 Transfer Acceleration**.

**Example 4 — Read-bound database.** An RDS primary is maxed on read IOPS for reporting queries → add **read replicas** to offload reads (and use Performance Insights to confirm the load source).

## Think About It

An application's database is slow under load. The team's instinct is to immediately scale up to a larger RDS instance. Describe how you'd use RDS Performance Insights and CloudWatch metrics to first determine whether the real constraint is read throughput, connection exhaustion, or a few expensive queries — and how the correct diagnosis points to read replicas, RDS Proxy, or query tuning instead of (or before) a bigger instance.

## Quick Check

1. A small gp2 volume is throttling on IOPS. What's the most cost-effective fix and why?
2. What causes a burstable (T-family) instance to suddenly throttle, and how do you address it?
3. Which RDS feature fixes connection exhaustion, and which fixes read-throughput limits?
4. Which tools speed up large or long-distance S3 transfers?

*Answers: (1) migrate to gp3, which provides a 3,000 IOPS baseline independent of volume size (gp2's IOPS scale with size at 3 IOPS/GB, so small volumes are starved) — gp3 is usually both faster and cheaper; (2) exhausting its CPU credit balance — enable unlimited mode or move to a non-burstable instance family; (3) RDS Proxy fixes connection exhaustion (connection pooling), read replicas fix read-throughput limits by offloading read traffic; (4) multipart upload and S3 Transfer Acceleration (and AWS DataSync for bulk migration).*

## What's Next

Next: **Scaling and High-Availability Operations** — operating Auto Scaling, load balancer and Route 53 health checks, and Multi-AZ fault tolerance.
