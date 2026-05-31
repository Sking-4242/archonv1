---
title: "RDS Fundamentals: Managed Relational Databases"
type: content
estimated_minutes: 10
cert_tags: ["SAA-C03", "CLF-C02"]
---

# RDS Fundamentals: Managed Relational Databases

## Overview

Amazon RDS (Relational Database Service) provides managed relational databases so you can run MySQL, PostgreSQL, MariaDB, Oracle, SQL Server, and Db2 without managing the underlying infrastructure. AWS handles provisioning, patching, backups, and failover — you focus on schema design and queries.

## What RDS Manages for You

RDS automates: OS patching, database software patching, automated backups (daily snapshots + transaction logs for point-in-time recovery), multi-AZ failover, read replica provisioning, and storage management. You manage: schema, queries, database users, parameter groups, and option groups. You cannot SSH into the underlying instance — use the database endpoint and standard DB clients.

## Supported Engines

RDS supports MySQL, PostgreSQL, MariaDB (all open-source), Oracle Database, SQL Server (Microsoft), and IBM Db2. Each engine has multiple versions. PostgreSQL and MySQL are the most commonly used on AWS and have the widest ecosystem support. Choice of engine affects which features are available — e.g., Oracle supports advanced queuing, SQL Server supports Windows auth.

## DB Instance Classes

RDS instances come in three families: Standard (m6g, m6i — balanced CPU/memory for general production), Memory Optimized (r6g, r6i — for large in-memory datasets, high connection counts), and Burstable (t4g, t3 — for dev/test workloads with low steady-state CPU). Graviton2/3 (g-suffix) instances offer better price/performance than x86.

## Storage

RDS uses EBS for storage. Three options: gp3 (default, independently configurable IOPS), io1 (provisioned IOPS, max 64,000 IOPS), and Magnetic (legacy, not recommended). Storage Auto Scaling expands your volume automatically when free space drops below a threshold — enable it to avoid running out of disk without manual intervention. You cannot shrink storage after expansion.

## Parameter Groups and Option Groups

Parameter groups let you tune database engine settings (e.g., `max_connections`, `innodb_buffer_pool_size`) without connecting to the instance. Option groups are engine-specific feature bundles (e.g., Oracle TDE encryption, SQL Server Audit). Changes to static parameters require a DB reboot; dynamic parameters apply immediately.

## Summary

RDS is managed relational database infrastructure — AWS handles the undifferentiated heavy lifting of backups, patching, and failover. You pick the engine (PostgreSQL/MySQL for most new projects), choose an instance class and storage type, and connect as you would to any database. RDS is the starting point for almost any relational workload on AWS.

## Examples

A small e-commerce startup migrating from a self-hosted MySQL server chooses RDS MySQL on a t4g.medium Burstable instance with gp3 storage and Storage Auto Scaling enabled. They immediately stop worrying about OS patching and nightly backup scripts — RDS handles both. This is the most direct benefit of the managed model: the operational tasks AWS owns are exactly the ones that distracted the team from building features.

A mid-sized SaaS company running a multi-tenant PostgreSQL workload needs consistent low-latency queries and high connection counts. They move from t3 instances to r6g.xlarge Memory Optimized instances and tune `max_connections` and `work_mem` via a custom Parameter Group — without ever SSH-ing into the server. This illustrates how Parameter Groups give you deep engine-level control while preserving the managed boundary.

A financial services firm using Oracle Database on-premises wants to lift-and-shift to the cloud quickly. They choose RDS Oracle with an existing BYOL license, configure an Option Group to enable Oracle TDE encryption for compliance, and connect their existing Oracle clients to the RDS endpoint unchanged. This shows that RDS supports commercial engines with enterprise features — not just open-source databases.

## Think About It

1. Why can't you SSH into an RDS instance, and what does that boundary tell you about the shared responsibility model for managed databases?
2. What would happen if you enabled Storage Auto Scaling on a database running an engine that charges per GB? How might that affect your AWS bill unexpectedly?
3. How would you decide between a Standard (m6i) and a Memory Optimized (r6i) instance class? What specific workload characteristics would push you toward each?
4. Dynamic parameter changes apply immediately while static changes require a reboot. Why might a DBA treat a "dynamic" parameter change with just as much caution as a static one in a production environment?
5. If RDS manages patching for you, why would you still need to understand the maintenance window settings?

## Quick Check

**Q1.** Which RDS storage type allows you to configure IOPS and throughput independently?
- A) Magnetic
- B) gp2
- C) gp3
- D) io1

**Answer: C** — gp3 decouples IOPS and throughput from storage size, letting you tune each independently without over-provisioning capacity.

**Q2.** A developer needs to tune `innodb_buffer_pool_size` on an RDS MySQL instance. Which RDS feature do they use?
- A) Option Group
- B) Parameter Group
- C) DB Subnet Group
- D) IAM Policy

**Answer: B** — Parameter Groups hold database engine configuration settings like buffer sizes and connection limits; Option Groups control feature bundles specific to certain engines.

**Q3.** Which RDS instance family is most appropriate for a development and testing environment with low steady-state CPU usage?
- A) Memory Optimized (r6i)
- B) Standard (m6i)
- C) Burstable (t4g)
- D) High I/O (i3)

**Answer: C** — Burstable (t-family) instances accumulate CPU credits during idle periods and spend them during bursts, making them cost-effective for workloads that don't need sustained high CPU.

## What's Next

Next up: RDS Multi-AZ and Read Replicas — how to make RDS highly available and horizontally scalable for reads.