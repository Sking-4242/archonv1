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

## What's Next

Next up: RDS Backups and Snapshots — automated backups, point-in-time recovery, and manual snapshots.