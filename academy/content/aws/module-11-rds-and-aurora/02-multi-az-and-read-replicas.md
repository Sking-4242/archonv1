---
title: "RDS Multi-AZ and Read Replicas"
type: content
estimated_minutes: 10
cert_tags: ["SAA-C03", "SAP-C02"]
---

# RDS Multi-AZ and Read Replicas

## Overview

RDS offers two key scalability and availability features: Multi-AZ for high availability via synchronous standby replication, and Read Replicas for scaling read throughput via asynchronous replication. Understanding the difference — and when each applies — is fundamental to RDS architecture and exam questions.

## Multi-AZ Deployments

Multi-AZ creates a synchronous standby replica in a different AZ. The standby receives every transaction before the primary commits — guaranteeing zero data loss on failover. The standby is invisible to your application; it does not serve reads. On failure, RDS flips the DNS endpoint to the standby within ~60-120 seconds. Use Multi-AZ for production databases that need HA. Multi-AZ also enables zero-downtime maintenance windows (patch standby, failover, patch old primary).

## Multi-AZ Cluster (RDS Optimized Reads)

A newer Multi-AZ Cluster deploys one writer and two readable standby instances across 3 AZs. Standbys can serve reads, reducing read load on the writer. Failover is faster (typically under 35 seconds). This is a middle ground between standard Multi-AZ and Aurora clusters — available for MySQL and PostgreSQL.

## Read Replicas

Read Replicas are asynchronous copies of the primary for scaling read-heavy workloads. Replication lag is typically sub-second but is not zero — reads may return slightly stale data. You can have up to 5 read replicas per source DB (15 for Aurora). Read Replicas can be in the same AZ, different AZ, or a different region (Cross-Region Read Replica). They have their own endpoint; your application must route read queries there explicitly.

## Promoting a Read Replica

A Read Replica can be promoted to a standalone writable database — breaking replication. Used for major version upgrades (create read replica, upgrade it in isolation, promote and cut over), for creating test databases from production, or for DR (if the primary region fails, promote the cross-region read replica to primary).

## Multi-AZ vs. Read Replica Summary

Multi-AZ: synchronous replication, automatic failover, standby not readable, for availability. Read Replica: asynchronous, manual promotion, readable, for read scaling and DR. A common architecture uses both: Multi-AZ primary for HA, plus read replicas for reporting workloads.

## Summary

Multi-AZ = high availability via synchronous standby with automatic failover. Read Replicas = read scaling via asynchronous replication. Know the replication type, whether the secondary is readable, and the failover mechanism for each. Combine them in production: Multi-AZ for HA, read replicas for analytics.

## Examples

A healthcare SaaS company runs a patient records application on RDS PostgreSQL with Multi-AZ enabled. During a routine maintenance window, AWS patches the standby first, then performs an automatic failover to promote it — the application experiences a brief connection blip rather than minutes of downtime. This is the core value of Multi-AZ: planned and unplanned outages both result in automatic, fast failover without manual intervention.

A retail analytics team generates daily reports by joining large order and product tables. These heavy queries were slowing down the production OLTP database. They create two Read Replicas and point the reporting application at the Reader Endpoint, routing all `SELECT` traffic for analytics there. Production write throughput is no longer affected. This illustrates how Read Replicas solve a specific problem — read scaling — but require the application to explicitly direct queries to them.

A company is preparing for a major PostgreSQL version upgrade and cannot afford downtime. They create a Read Replica running the new engine version, test their application against it for two weeks, then promote the replica and update the connection string in a 30-second maintenance window. The old primary becomes a standalone standby they can roll back to if needed. This demonstrates the promote-for-upgrade pattern, which requires understanding that promotion breaks replication permanently.

## Think About It

1. Multi-AZ uses synchronous replication while Read Replicas use asynchronous replication. What specific failure scenarios does each design choice optimize for, and what does each sacrifice?
2. If your application reads from a Read Replica and replication lag spikes to 5 seconds during a heavy write burst, what business problems could this cause — and how would you design around it?
3. Why does RDS use DNS failover for Multi-AZ promotion rather than floating IP addresses, and what does that mean for your application connection strings?
4. What trade-offs would you consider when deciding whether to place a Read Replica in the same AZ as the primary versus a different region entirely?
5. A Read Replica can serve as a DR target if the primary region fails. How does this differ from Multi-AZ in terms of RTO, RPO, and the manual steps required?

## Quick Check

**Q1.** During an RDS Multi-AZ failover, what does the standby instance do for read traffic before the failover occurs?
- A) It serves read-only queries to reduce primary load
- B) It serves reads only during the maintenance window
- C) It does not serve any traffic — it is purely a standby
- D) It serves reads when replication lag is below 1 second

**Answer: C** — In standard Multi-AZ (not the newer Multi-AZ Cluster), the standby is completely invisible to applications and serves no traffic until it is promoted to primary.

**Q2.** What type of replication do RDS Read Replicas use?
- A) Synchronous with zero data loss
- B) Asynchronous with potential replication lag
- C) Synchronous with eventual consistency
- D) Semi-synchronous with 1-second guarantee

**Answer: B** — Read Replicas replicate asynchronously, meaning reads may return slightly stale data if there is replication lag between the primary and the replica.

**Q3.** You need to perform a major version upgrade of an RDS database with minimal downtime. Which approach uses a Read Replica?
- A) Upgrade the primary in-place, then upgrade the Multi-AZ standby
- B) Create a Read Replica, upgrade it to the new version, promote it, then cut over
- C) Restore a snapshot to a new instance running the new version and swap endpoints
- D) Enable automatic minor version upgrade and wait for the next maintenance window

**Answer: B** — Creating a replica, upgrading it in isolation, and promoting it allows you to test the new version against production data before committing to the cutover, minimizing risk and downtime.

## What's Next

Next up: RDS Backups and Snapshots — automated backups, point-in-time recovery, and manual snapshots.