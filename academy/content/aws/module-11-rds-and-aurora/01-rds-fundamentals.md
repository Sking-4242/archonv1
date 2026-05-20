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

## What's Next

Next up: RDS Multi-AZ and Read Replicas — how to make RDS highly available and horizontally scalable for reads.