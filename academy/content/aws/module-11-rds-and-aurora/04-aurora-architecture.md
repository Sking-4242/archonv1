---
title: "Amazon Aurora Architecture"
type: content
estimated_minutes: 12
cert_tags: ["SAA-C03", "SAP-C02"]
---

# Amazon Aurora Architecture

## Overview

Amazon Aurora is a MySQL and PostgreSQL-compatible relational database built for the cloud. Its distributed storage architecture delivers up to 5x the throughput of MySQL and 3x that of PostgreSQL at a fraction of the cost of commercial databases. Aurora is not just managed MySQL/PostgreSQL — it has a fundamentally different storage layer.

## Aurora Storage Architecture

Aurora separates compute from storage. The storage layer is a distributed, fault-tolerant, self-healing SSD cluster that spans 3 AZs with 6 copies of data (2 copies per AZ). Write quorum requires 4/6 copies; read quorum requires 3/6. This means Aurora can tolerate losing 2 AZs and still serve reads, and losing 1 AZ and still serve writes. Storage scales automatically in 10 GB increments up to 128 TB.

## Aurora Cluster Endpoints

An Aurora cluster has multiple endpoints: Cluster Endpoint (the writer, routes to the primary instance), Reader Endpoint (load-balances across all read replicas), Custom Endpoints (route to a subset of instances — e.g., high-memory instances for analytics), and Instance Endpoints (direct connection to a specific instance — avoid for production). Use the cluster endpoint for writes and reader endpoint for reads.

## Aurora Replicas

Aurora supports up to 15 read replicas with sub-10ms replication lag (they share the same storage layer — there's no data copying). Any replica can be promoted to primary in under 30 seconds on failure. Aurora Global Database extends this cross-region with a dedicated replication infrastructure achieving under 1 second replication lag globally.

## Aurora Serverless v2

Aurora Serverless v2 scales compute capacity automatically in fine-grained units (Aurora Capacity Units, ACUs) from a minimum to a maximum you set. It scales up in seconds in response to load and scales down to near-zero when idle. Each ACU is approximately 2 GB RAM plus CPU. Use Serverless v2 for variable or unpredictable workloads, dev/test, and multi-tenant SaaS applications with per-database idle periods.

## Aurora vs. RDS

Aurora costs more per ACU than RDS instance-hours but typically delivers better total cost at scale because it eliminates provisioned IOPS costs, replicas share storage (no replication storage cost), and its performance means you need fewer or smaller instances. For new cloud-native applications, Aurora PostgreSQL-compatible is typically the first choice over plain RDS PostgreSQL.

## Summary

Aurora's shared distributed storage (6 copies across 3 AZs) gives it native HA without the overhead of binary log replication. 15 read replicas with sub-10ms lag, fast failover, and automatic storage scaling make it the premier relational database on AWS. Serverless v2 adds elastic compute for variable workloads.

## Examples

A gaming company launching a new mobile game uses Aurora MySQL with the Reader Endpoint load-balanced across 5 read replicas to handle leaderboard queries from millions of concurrent players. When a marketing campaign causes a sudden traffic spike, one replica is promoted automatically in under 30 seconds after the writer goes unhealthy — players experience no visible outage. This demonstrates Aurora's fast failover capability and shared-storage replication model: replicas are always current because they read from the same distributed storage volume, not a copy.

A B2B SaaS platform with hundreds of small-business customers needs each customer to have an isolated database, but most databases sit idle overnight and on weekends. The team deploys Aurora Serverless v2 with a minimum of 0.5 ACU and a maximum of 8 ACU per cluster. Idle databases cost nearly nothing, and active databases scale up in seconds during business hours. This would be impractical with standard provisioned RDS, where each instance incurs full hourly charges regardless of load.

A large media company migrates from a commercial Oracle database to Aurora PostgreSQL-compatible to reduce licensing costs. They benchmark Aurora's write throughput against a comparably priced RDS PostgreSQL instance and find Aurora delivers roughly 3x the transactions per second — attributable to the storage layer handling redo log writes in parallel across 6 storage nodes instead of sequentially to a single EBS volume. This illustrates why Aurora's architecture is not just "managed PostgreSQL" but a fundamentally different engine design.

## Think About It

1. Aurora stores 6 copies of data across 3 AZs and requires a write quorum of 4/6. Why is quorum-based writing more resilient than synchronous replication to a single standby, and what does it cost you in terms of write latency?
2. Aurora separates compute from storage, meaning you can scale up read replicas without adding storage. How does this change the economics of read scaling compared to standard RDS Read Replicas, which each maintain their own full copy of the data?
3. If Aurora Serverless v2 scales down to near-zero when idle, what workload characteristics would make it a poor choice despite the cost savings?
4. The Reader Endpoint load-balances across all replicas, but Custom Endpoints let you route to a subset. When would you create a Custom Endpoint, and what problem does it solve that the Reader Endpoint cannot?
5. Aurora's storage layer automatically heals corrupted blocks by fetching a good copy from one of the other 5 nodes. What does this imply about the operational burden of storage management compared to self-managed MySQL on EC2?

## Quick Check

**Q1.** How many copies of data does Aurora maintain, and across how many Availability Zones?
- A) 2 copies across 2 AZs
- B) 3 copies across 3 AZs
- C) 6 copies across 3 AZs
- D) 6 copies across 6 AZs

**Answer: C** — Aurora maintains 6 copies of data (2 per AZ) spread across 3 Availability Zones, providing high durability and enabling read/write quorum tolerances.

**Q2.** What is the maximum number of read replicas an Aurora cluster supports?
- A) 5
- B) 10
- C) 15
- D) 20

**Answer: C** — Aurora supports up to 15 read replicas per cluster, compared to 5 for standard RDS, enabled by the shared storage layer that requires no data copying to each replica.

**Q3.** Which Aurora endpoint should an application use to load-balance read traffic across all available read replicas?
- A) Cluster Endpoint
- B) Instance Endpoint
- C) Custom Endpoint
- D) Reader Endpoint

**Answer: D** — The Reader Endpoint automatically load-balances connections across all read replicas in the cluster, so applications do not need to track individual replica endpoints.

## What's Next

Next up: Aurora Advanced Features — Global Database, Parallel Query, and Machine Learning integrations.