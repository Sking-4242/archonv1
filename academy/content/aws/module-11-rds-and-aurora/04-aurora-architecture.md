---
title: "Amazon Aurora Architecture"
type: content
estimated_minutes: 18
cert_tags: ["SAA-C03", "SAP-C02"]
---

# Amazon Aurora Architecture

## Overview

Amazon Aurora is a cloud-native relational database engine built by AWS that is wire-compatible with MySQL and PostgreSQL but shares almost nothing with either in terms of how data is stored, replicated, or recovered. AWS engineered Aurora from the ground up to eliminate the bottlenecks that plague traditional relational databases when run on network-attached storage — specifically, the high I/O volume of page-based replication and the latency of synchronous standby writes. The result is a database that achieves up to five times the throughput of MySQL and three times the throughput of PostgreSQL while providing higher durability guarantees and faster failover than either managed option.

The key architectural insight is the separation of compute from storage. A traditional RDS instance owns its EBS volume — the database process reads pages from disk, modifies them in the buffer pool, and writes dirty pages back as part of checkpointing. In Aurora, the storage layer is a distributed, independently managed service. The Aurora compute instance (the "DB instance" in AWS parlance) never writes full pages to storage. Instead, it sends only redo log records — the minimal description of what changed. The storage nodes reconstruct pages from those redo logs on demand. This dramatically reduces the volume of data transmitted across the network and allows storage to scale and self-heal independently of compute.

Aurora's durability model is built on quorum writes across six storage nodes in three Availability Zones. This design means no single component failure, and no single AZ failure, can cause data loss or prevent writes. Combined with automatic storage growth and up to fifteen read replicas that share the same underlying storage volume, Aurora provides a degree of built-in high availability that would require complex and expensive architecture to replicate with traditional RDS. For any greenfield cloud-native application that needs a relational database, Aurora is typically the correct starting point — the exam expects you to know why.

## Core Concepts

### Distributed Storage — Six Copies Across Three AZs

Aurora's storage layer consists of a fleet of purpose-built storage nodes distributed across three Availability Zones. Every write is replicated to six storage nodes — two in each AZ. Aurora uses a quorum model: a write is acknowledged to the compute instance once four of the six nodes confirm it (write quorum = 4/6). Reads only require three of the six nodes to agree (read quorum = 3/6).

This quorum model is why Aurora's durability and availability guarantees are so strong. Losing one AZ (two nodes) still leaves four nodes, which satisfies the write quorum — writes continue uninterrupted. Losing two AZs (four nodes) drops below write quorum, but the remaining two nodes still satisfy the read quorum — reads continue even though writes are blocked until nodes recover. Compare this to a synchronous standby in standard RDS Multi-AZ: losing the standby AZ forces writes to wait for recovery, and there is only one copy in each AZ.

Storage scales automatically as data grows, up to 128 TiB, with no provisioning or manual resizing required. You never need to pre-allocate storage or set IOPS levels — Aurora manages it entirely. AWS describes this as "storage auto-scaling," but it is more accurate to say the storage is a shared service that expands on demand. You pay for what you use, not what you provision.

### Self-Healing Storage

Because data is stored in six independent locations, Aurora can detect and automatically repair corrupted blocks without any DBA involvement. When a storage node detects a checksum mismatch, it fetches a valid copy from one of the other five nodes and repairs itself. This process is invisible to the application and the compute instance. In a traditional self-managed database on EC2, a corrupted storage block typically requires point-in-time recovery from a backup — a multi-hour outage event. In Aurora, it is handled transparently at the storage layer.

This self-healing property also means Aurora does not need fsync-heavy checkpointing strategies or crash recovery that replays large amounts of redo log. The storage layer is always consistent because each write is persisted to quorum before being acknowledged. Recovery after a compute instance crash is fast because the storage nodes already have the authoritative state.

### Why Aurora is Faster — Redo Log Architecture

Traditional MySQL replication sends binary log records from the primary to replicas, which replay them. The primary also writes full data pages to its EBS volume during checkpointing. Both operations are I/O-heavy. Aurora eliminates both. The compute instance only ships redo log records — a compact description of each change — to the storage layer. The storage nodes apply those redo logs and construct pages. No binary log replication occurs between the primary Aurora instance and its read replicas, because all replicas share the same storage volume. A replica reads the same pages the primary writes; there is nothing to copy.

This architecture reduces the network I/O from the compute instance to storage by orders of magnitude compared to page-based writes, which is why Aurora can sustain higher throughput at lower latency on equivalent hardware. The exam frequently tests this concept: Aurora replicas are not behind the primary because they do not receive replicated writes — they share the underlying storage and see the same data simultaneously.

### Aurora Cluster Endpoints

An Aurora cluster has four categories of endpoint, and using the wrong one is a common operational and exam mistake.

The **Cluster Endpoint** (also called the writer endpoint) always resolves to the current primary instance. This is the endpoint to use for all write operations. If the primary fails and a replica is promoted, the cluster endpoint automatically updates its DNS target to the new primary — your application reconnects to the right instance without any configuration change, provided it respects the DNS TTL.

The **Reader Endpoint** load-balances connections across all available read replicas in round-robin fashion. It is the correct endpoint for read-heavy query traffic. If a replica fails, the reader endpoint stops routing to it automatically.

**Custom Endpoints** let you define a named endpoint that routes to a specific subset of instances — for example, a group of larger memory-optimized instances dedicated to analytics queries. The reader endpoint does not differentiate between instance types; if you need to direct long-running analytics queries to specific hardware, custom endpoints are the solution.

**Instance Endpoints** connect directly to a named instance and bypass the routing logic of cluster and reader endpoints. AWS recommends against using instance endpoints for production because they do not support automatic failover.

### Aurora Replicas and Failover

Aurora supports up to 15 read replicas per cluster. Because replicas share the underlying storage volume rather than maintaining their own copies of data, replication lag is typically under 10 milliseconds — far below the seconds of lag common in standard RDS Read Replicas with binary log replication.

Failover when the primary fails is fast because Aurora does not need to pick up binary log replay. A replica is promoted to primary by updating the cluster endpoint DNS record and granting the new primary write access to the shared storage — the data is already there. The full failover process completes in under 30 seconds. You can assign a **failover priority tier** (0–15) to each replica. Aurora promotes the replica with the lowest tier number first. If two replicas share the same tier, Aurora prefers the one with the same size as the failed primary.

### Aurora Serverless v2

Aurora Serverless v2 adds elastic compute scaling to the Aurora architecture. Instead of choosing a fixed instance class (db.r6g.large, etc.), you configure a minimum and maximum in Aurora Capacity Units (ACUs). One ACU is approximately 2 GB of RAM plus proportional CPU and networking. Aurora scales the compute up or down in increments as small as 0.5 ACU based on measured load, typically within seconds.

Serverless v2 can scale to a minimum of 0.5 ACU, enabling near-zero cost for idle databases. Aurora Serverless v2 does **not** support scaling to 0 ACUs — the minimum is always 0.5 ACU. True pause-to-zero (scaling to 0) was a feature of Aurora Serverless v1, which is now deprecated and should not be used for new workloads. Serverless v2 is the correct choice for variable or unpredictable workloads, dev/test databases, multi-tenant SaaS architectures where individual tenant databases are mostly idle, and event-driven workloads driven by Lambda or batch jobs with irregular schedules. It is not the best choice for consistently high-load OLTP systems where a fixed instance class is more cost-predictable and avoids scaling latency.

## Configuration Reference

### Create an Aurora MySQL Cluster

```bash
# Step 1: Create the cluster (storage layer + config)
aws rds create-db-cluster \
  --db-cluster-identifier my-aurora-cluster \
  --engine aurora-mysql \
  --engine-version 8.0.mysql_aurora.3.04.0 \
  --master-username admin \
  --master-user-password MySecurePassword123! \
  --db-subnet-group-name my-subnet-group \
  --vpc-security-group-ids sg-0abc123def456789 \
  --backup-retention-period 7 \
  --preferred-backup-window "02:00-03:00" \
  --storage-encrypted \
  --kms-key-id arn:aws:kms:us-east-1:123456789012:key/my-key-id
  # --storage-encrypted enables encryption at rest via KMS
  # --backup-retention-period sets automated backup window (1–35 days)

# Step 2: Add the writer instance to the cluster
aws rds create-db-instance \
  --db-instance-identifier my-aurora-writer \
  --db-cluster-identifier my-aurora-cluster \
  --db-instance-class db.r6g.large \
  --engine aurora-mysql
  # Instance belongs to the cluster — it does NOT own storage
  # The cluster holds the storage; the instance provides compute

# Step 3: Add a read replica to the same cluster
aws rds create-db-instance \
  --db-instance-identifier my-aurora-reader-1 \
  --db-cluster-identifier my-aurora-cluster \
  --db-instance-class db.r6g.large \
  --engine aurora-mysql
  # This replica shares the same storage volume — no data copy occurs
  # Replication lag is sub-10ms because there is nothing to replicate
```

### Retrieve Cluster Endpoints

```bash
aws rds describe-db-clusters \
  --db-cluster-identifier my-aurora-cluster \
  --query 'DBClusters[0].{Writer:Endpoint,Reader:ReaderEndpoint}'

# Output:
# {
#   "Writer": "my-aurora-cluster.cluster-abc123.us-east-1.rds.amazonaws.com",
#   "Reader": "my-aurora-cluster.cluster-ro-abc123.us-east-1.rds.amazonaws.com"
# }
# The .cluster-ro- prefix identifies the reader endpoint
# Application connection strings should always use these — never instance endpoints
```

### Trigger a Manual Failover

```bash
aws rds failover-db-cluster \
  --db-cluster-identifier my-aurora-cluster \
  --target-db-instance-identifier my-aurora-reader-1
  # --target-db-instance-identifier optionally specifies which replica to promote
  # Without it, Aurora promotes the highest-priority (lowest tier) replica
  # Use this to test failover behavior before a real incident occurs
```

### Create an Aurora Serverless v2 Cluster

```bash
# Create the cluster with serverless scaling configuration
aws rds create-db-cluster \
  --db-cluster-identifier my-serverless-cluster \
  --engine aurora-mysql \
  --engine-version 8.0.mysql_aurora.3.04.0 \
  --master-username admin \
  --master-user-password MySecurePassword123! \
  --db-subnet-group-name my-subnet-group \
  --vpc-security-group-ids sg-0abc123def456789 \
  --serverless-v2-scaling-configuration MinCapacity=0.5,MaxCapacity=16
  # MinCapacity=0.5: minimum 0.5 ACU (~1 GB RAM) — near-zero idle cost
  # MaxCapacity=16: maximum 16 ACUs (~32 GB RAM) — scales up under load
  # Aurora scales between these bounds automatically, typically in seconds

# Add a Serverless v2 instance — use db.serverless as the class
aws rds create-db-instance \
  --db-instance-identifier my-serverless-writer \
  --db-cluster-identifier my-serverless-cluster \
  --db-instance-class db.serverless \
  --engine aurora-mysql
  # db.serverless is the placeholder class that enables Serverless v2 scaling
```

### Set Replica Failover Priority

```bash
aws rds modify-db-instance \
  --db-instance-identifier my-aurora-reader-1 \
  --promotion-tier 0
  # Tier 0 = highest priority — this replica is promoted first on primary failure
  # Tier range: 0 (highest) to 15 (lowest)
  # Replicas with the same tier: Aurora prefers the one matching primary size
```

## How to Decide

Use this table to choose among Aurora configurations:

| Scenario | Configuration | Reason |
|---|---|---|
| High-throughput OLTP, consistent load | Aurora provisioned, db.r6g instance | Predictable cost, best per-query performance |
| Variable load, spiky or unknown traffic | Aurora Serverless v2 | Scales in seconds, avoids over-provisioning |
| Multi-tenant SaaS, many idle databases | Aurora Serverless v2, min 0.5 ACU | Near-zero cost when idle |
| Need analytics queries on production data | Aurora + Custom Endpoint to larger readers | Isolate analytics to high-memory replicas |
| Read-heavy workload, low latency | Aurora + multiple read replicas + Reader Endpoint | 15 replicas, sub-10ms lag, load balanced |
| Standard MySQL with no HA requirements | RDS MySQL | Lower cost, simpler — Aurora HA is overkill |
| Disaster recovery across regions | Aurora Global Database | Covered in lesson 05 |

**Do not choose Aurora if:** your workload is small and cost-sensitive, you need Oracle or SQL Server compatibility, or you need features specific to RDS engines (e.g., RDS for SQL Server with Windows Authentication).

## How This Connects

- Aurora's shared storage layer is the foundation for Global Database (lesson 05) — the same redo-log-only replication model extends cross-region.
- Aurora Serverless v2 pairs naturally with RDS Proxy (lesson 06) for Lambda-heavy architectures: Serverless v2 handles variable compute, Proxy handles connection pooling.
- The cluster endpoint and reader endpoint pattern is the same DNS-based routing mechanism used by ElastiCache cluster endpoints — a recurring AWS pattern.
- Aurora's encryption at rest (KMS) and encryption in transit (TLS) integrate with AWS IAM and Secrets Manager — the same access control model used across RDS Proxy, Parameter Store, and other managed services.
- Aurora's storage auto-scaling (no EBS provisioning) contrasts with standard RDS, where you must provision storage and IOPS up front — an important cost and operational difference tested on SAA-C03.

## Exam Traps

**Trap 1: "Aurora replicates data to each read replica."**
False. Aurora replicas do not receive replicated data. They share the same distributed storage volume as the primary. There is no binary log replication between compute instances. This is why replication lag is under 10ms and why replicas can be promoted instantly — the data is already there.

**Trap 2: "Aurora Serverless v2 and Aurora Serverless v1 behave the same way."**
They do not. Aurora Serverless v1 is deprecated — it scaled in coarser ACU increments, had longer scale-up times, and supported true pause-to-zero (0 ACU). Serverless v2 scales in 0.5 ACU increments within seconds, has a minimum of 0.5 ACU (never scales to zero), and supports Multi-AZ, Global Database, and read replicas. Exam questions about "Aurora Serverless" after 2023 refer to v2 behavior unless v1 is explicitly stated. If a question describes pause-to-zero or cold-start-on-first-connection behavior, it is describing v1.

**Trap 3: "The cluster endpoint balances reads across all replicas."**
The cluster endpoint routes exclusively to the primary (writer). The reader endpoint balances reads. Sending reads to the cluster endpoint does not use replicas — it hits the primary, wasting read capacity and adding unnecessary load to the writer.

**Trap 4: "Aurora's 6-copy storage means 6x the storage cost."**
You pay for storage once. The six-copy replication is internal to the Aurora storage service. AWS prices Aurora storage per GB-month, not per copy. You do not pay six times the storage price — this is a managed overhead abstracted away from billing.

**Trap 5: "Aurora Multi-AZ is a separate feature you enable."**
Aurora is always Multi-AZ at the storage layer — the six copies across three AZs are a fundamental part of every Aurora cluster, including single-instance clusters. You do not need to "enable Multi-AZ" on Aurora the way you do on RDS. Adding read replicas in additional AZs improves compute-layer availability, but storage HA is always on.

## Summary

- Aurora stores six copies of data across three AZs (two per AZ) and requires a 4/6 write quorum and 3/6 read quorum — this makes it durable through AZ failures without synchronous standby overhead.
- Aurora sends only redo log records to storage (not full pages), eliminating binary log replication between replicas and reducing I/O by orders of magnitude compared to traditional MySQL/PostgreSQL.
- Storage scales automatically up to 128 TiB — no IOPS, volume provisioning, or manual resizing required.
- The cluster endpoint routes writes to the primary; the reader endpoint load-balances reads across up to 15 replicas; custom endpoints route to specific subsets of instances.
- Failover completes in under 30 seconds because replicas share storage — no data movement required; Aurora updates the cluster endpoint DNS and grants write access to the promoted replica.
- Aurora Serverless v2 scales compute between min and max ACUs in seconds, making it the right choice for variable, unpredictable, or multi-tenant workloads.

## Examples

A gaming company launches a new mobile title and expects millions of concurrent players to query leaderboards and player stats. The team deploys an Aurora MySQL cluster with a single writer and five read replicas, routing all leaderboard queries to the Reader Endpoint. During a peak event, traffic spikes ten-fold — the five replicas absorb all read load at sub-10ms replication lag, and the writer handles transaction commits for score updates. When the primary writer fails due to a host hardware fault, Aurora promotes the highest-priority replica in 22 seconds, and the cluster endpoint DNS updates automatically. Players experience a brief pause but no data loss. This demonstrates Aurora's core design: shared storage makes replicas always current, and fast failover requires only a DNS update.

A B2B SaaS company builds a project management tool used by 500 small-business customers. Each customer has an isolated Aurora cluster for data residency compliance. Most clusters sit completely idle on nights and weekends. The team deploys each cluster as Aurora Serverless v2 with MinCapacity=0.5 and MaxCapacity=4. Idle clusters cost less than $0.15/hour in storage charges with near-zero compute cost. During business hours, active clusters scale up within seconds as users log in. The alternative — 500 always-on db.t3.medium instances — would cost 40x more per month. This illustrates why Serverless v2 is transformative for multi-tenant architectures with irregular per-tenant usage.

A media company migrates from a commercial Oracle database to Aurora PostgreSQL-compatible after a licensing audit reveals seven-figure annual costs. During benchmarking, they run a write-intensive transaction workload against Aurora and an equivalently priced RDS PostgreSQL instance. Aurora delivers approximately 3x the transactions per second at equivalent write latency. The engineering team traces the difference to the redo-log-only architecture: Aurora's compute instance submits small log records to distributed storage nodes that write in parallel, while RDS PostgreSQL writes full 8 KB pages to a single EBS volume in sequence. The migration saves $2M per year in Oracle licensing and reduces infrastructure spend simultaneously — illustrating why Aurora is described as a commercial-database replacement at open-source pricing.

## Think About It

1. Aurora uses a 4/6 write quorum and a 3/6 read quorum. Under what failure scenario can Aurora serve reads but not writes — and is that the correct behavior for a relational database?
2. Aurora eliminates binary log replication between the primary and read replicas because replicas share the storage layer. What does this mean for replication lag, and how does it affect the decision to use Aurora replicas versus RDS Read Replicas for read scaling?
3. Aurora Serverless v2 scales down to a minimum of 0.5 ACU but never to zero. What application behavior could cause problems if compute scales down aggressively during a brief idle period between bursts of traffic? How does setting a higher minimum ACU mitigate this?
4. The Reader Endpoint load-balances in round-robin across all replicas. If you have a mix of db.r6g.large and db.r6g.4xlarge replicas and your analytics team runs expensive queries, what problem does the Reader Endpoint create — and how do custom endpoints solve it?
5. Aurora's storage self-heals by fetching a valid copy from one of the other five nodes when a block fails a checksum. What does this imply about the value of automated storage management versus managing EBS snapshots and volume health manually on EC2-hosted MySQL?

## Quick Check

**Q1.** Aurora's storage layer maintains how many copies of data, and how are they distributed?

- A) 2 copies in the same AZ for performance
- B) 3 copies, one per Availability Zone
- C) 6 copies, two per Availability Zone across 3 AZs
- D) 6 copies, all in the primary AZ with async sync to others

**Answer: C** — Aurora maintains 6 copies of data with 2 copies in each of 3 Availability Zones. This enables a 4/6 write quorum and 3/6 read quorum, sustaining writes through a full AZ failure and reads through a two-AZ failure.

**Q2.** Why do Aurora read replicas have sub-10ms replication lag compared to the minutes of potential lag in standard RDS Read Replicas?

- A) Aurora uses a faster binary log format than MySQL
- B) Aurora replicas poll the primary more frequently
- C) Aurora replicas share the same distributed storage volume as the primary — there is no data to replicate
- D) Aurora uses synchronous replication, which forces the primary to wait for all replicas to confirm each write

**Answer: C** — Aurora replicas read from the same storage layer as the primary. There is no binary log replication between compute instances. Replicas see the same data as the primary without any replication delay, which is why lag is measured in single-digit milliseconds.

**Q3.** An application team wants to route long-running analytics queries to high-memory Aurora instances without affecting OLTP read traffic on standard-memory replicas. Which endpoint type supports this?

- A) Cluster Endpoint
- B) Reader Endpoint
- C) Custom Endpoint
- D) Instance Endpoint

**Answer: C** — Custom Endpoints allow you to define a named endpoint that routes to a specific subset of Aurora instances. The Reader Endpoint routes to all replicas indiscriminately; a Custom Endpoint targeting only the high-memory instances isolates analytics traffic from OLTP readers.

## What's Next

Next up: Aurora Advanced Features — Global Database, Parallel Query, Backtrack, and native ML integrations.
