---
title: "Amazon Aurora"
type: content
estimated_minutes: 18
cert_tags: ["SAA-C03", "SOA-C03", "SCS-C03"]
---

# Amazon Aurora

## Overview

Amazon Aurora is a cloud-native relational database engine within the Amazon RDS family, compatible with **MySQL and PostgreSQL** but re-architected for the cloud to deliver higher performance, availability, and durability than the standard engines. It separates compute from a distributed, self-healing storage layer, which is the source of most of its advantages. This *service reference* lesson covers the Aurora architecture, replicas and endpoints, Serverless and Global Database, security, and what each certification expects.

Aurora matters because it removes much of the operational and scaling pain of running MySQL/PostgreSQL at scale while keeping wire compatibility, so existing applications work unchanged. The defining idea is its **decoupled storage architecture**: a shared, distributed storage volume that automatically grows, replicates six ways across three Availability Zones, and is continuously backed up to S3 — while one or more lightweight compute instances run the database engine on top. Because storage is shared and replicated independently of compute, failover and read scaling are fast and cheap compared with classic RDS. Aurora is the answer when a scenario wants relational data with cloud-scale performance, availability, and minimal replication lag.

---

## How It Works

An Aurora **cluster** consists of one or more **DB instances** sharing a single **cluster storage volume**:

- The **storage layer** is distributed across **six copies in three AZs**, self-healing, and auto-scaling up to a large maximum with no pre-provisioning. Writes are acknowledged when a quorum of copies confirms, giving high durability without classic replication.
- A **writer (primary)** instance handles reads and writes; up to **15 Aurora replicas** share the same storage and serve reads with typically **single-digit-millisecond lag** (far lower than RDS read replicas, since they read the same volume rather than replaying logs). Any replica can be promoted on failover, usually within ~30 seconds.

Aurora exposes **endpoints**: a **cluster (writer) endpoint** that always points to the primary, a **reader endpoint** that load-balances across replicas, and **custom endpoints** for subsets of instances. Applications send writes to the cluster endpoint and reads to the reader endpoint.

---

## Key Features

- **Distributed, auto-scaling storage** (six-way, three-AZ) with continuous backup to S3 and point-in-time recovery; **backtrack** (rewind the cluster in place, MySQL-compatible) for quick recovery from mistakes.
- **Up to 15 low-lag read replicas** with automatic failover and reader-endpoint load balancing.
- **Aurora Serverless v2** — fine-grained, automatic compute scaling (in Aurora Capacity Units) for variable or unpredictable workloads, scaling in seconds without managing instance sizes.
- **Aurora Global Database** — replicate a cluster to other Regions with typically <1s lag for low-latency global reads and fast cross-Region DR (Regional failover).
- **Fast cloning** (copy-on-write clones for test/dev) and **parallel query** for analytical scans.
- **RDS Proxy** integration for connection pooling.

---

## Configuration Reference

- **Choose provisioned instances or Serverless v2** based on whether the workload is steady (provisioned/Reserved) or variable (Serverless v2).
- **Add read replicas** and use the **reader endpoint** to scale reads; use **custom endpoints** to isolate workloads (e.g., reporting).
- **Encrypt at creation** with KMS, enforce TLS, place in private subnets with tight security groups, and use **Secrets Manager** for managed credential rotation.
- **Enable Global Database** for multi-Region low-latency reads/DR, and **backtrack**/PITR for recovery.

---

## Operations and Troubleshooting

- **Failover.** Aurora promotes a replica to writer in ~30 seconds and the **cluster endpoint** follows automatically; applications must reconnect via endpoints (RDS Proxy makes this nearly seamless). Prioritize replicas with failover tiers.
- **Reads hitting the writer.** Ensure read traffic uses the **reader endpoint**, not the cluster endpoint, to actually offload the primary.
- **Connection storms.** Use **RDS Proxy** to pool connections, especially for Lambda or spiky clients.
- **Storage/scale.** Storage auto-scales, so capacity isn't a manual concern; cost is consumption-based — watch I/O on the standard configuration or use **I/O-Optimized** for I/O-heavy workloads.

---

## Integrations

Aurora is part of **Amazon RDS** (same console, backups, and Multi-AZ concepts), encrypts with **KMS**, rotates credentials via **Secrets Manager**, runs in a **VPC**, is monitored by **CloudWatch**/Performance Insights, backed up to **S3** and via **AWS Backup**, fronted by **RDS Proxy** (often for **Lambda**), and has anomalous logins detected by **GuardDuty RDS Protection**. **Aurora Global Database** spans Regions for DR. For NoSQL needs the counterpart is **DynamoDB**; Aurora is the high-performance relational option.

---

## Pricing and Cost Considerations

Aurora bills for **compute** (per instance-hour for provisioned, or per **Aurora Capacity Unit** for Serverless v2, with Reserved Instances for steady provisioned workloads), **storage** consumed (per GB-month, auto-scaling), and **I/O** — either pay-per-request on the standard configuration or a higher storage/compute rate on **Aurora I/O-Optimized** (which removes per-I/O charges, cheaper for I/O-heavy workloads). Each read replica is a billable instance, and Global Database adds cross-Region replication and storage costs. The levers are choosing provisioned vs. Serverless v2 to match workload variability and standard vs. I/O-Optimized to match I/O intensity. Exact prices vary by Region.

---

## Exam Relevance

**SAA-C03:** Know Aurora's decoupled six-way/three-AZ storage, up to 15 low-lag replicas with reader/cluster endpoints, Serverless v2 for variable load, Global Database for multi-Region DR, fast failover, and Aurora vs. standard RDS vs. DynamoDB selection. Design depth.

**SOA-C03:** Operate Aurora — endpoints and failover behavior, read scaling, RDS Proxy, backtrack/PITR, and monitoring. Operations depth.

**SCS-C03:** Secure Aurora — KMS encryption, TLS, private placement, Secrets Manager rotation, IAM authentication, and GuardDuty RDS Protection. Security depth.

---

## Summary

Amazon Aurora is a cloud-native, MySQL/PostgreSQL-compatible RDS engine whose distributed storage layer (six copies across three AZs, auto-scaling, continuously backed to S3) is decoupled from lightweight compute instances. A writer plus up to 15 low-lag read replicas share that storage, exposed via cluster (writer), reader, and custom endpoints, with ~30-second failover. Serverless v2 scales compute automatically for variable workloads, Global Database spans Regions for low-latency reads and DR, and backtrack/cloning aid recovery and testing. It's secured with KMS, TLS, Secrets Manager, and private VPC placement and priced by compute (instances or ACUs), auto-scaling storage, and I/O (standard or I/O-Optimized). The recurring exam points are the shared-storage architecture, reader vs. cluster endpoints, Serverless v2, and Global Database.

---

## Quick Check

1. How does Aurora's storage architecture differ from a standard RDS engine, and why does that lower replica lag and speed failover?
2. What is the difference between the cluster (writer) endpoint and the reader endpoint, and which should read traffic use?
3. When would you choose Aurora Serverless v2 over provisioned instances?
4. What does Aurora Global Database provide?
5. When would standard vs. I/O-Optimized configuration be more cost-effective?

---

## What's Next

Pair this with **Amazon RDS** (the broader family and Multi-AZ/read-replica concepts), **AWS Secrets Manager** (rotation), **AWS KMS** (encryption), and **Amazon ElastiCache** (caching in front of the database).
