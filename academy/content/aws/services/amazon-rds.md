---
title: "Amazon RDS"
type: content
estimated_minutes: 21
cert_tags: ["CLF-C02", "SAA-C03", "SOA-C03", "SCS-C03"]
---

# Amazon RDS

## Overview

Amazon Relational Database Service (RDS) is a managed service for running relational databases — handling provisioning, patching, backups, replication, and failover so you operate a database without operating its infrastructure. It supports multiple engines and frees teams from the undifferentiated heavy lifting of database administration. This *service reference* lesson covers the RDS model, the critical Multi-AZ-vs-read-replica distinction, backups and recovery, security, Aurora, and what each certification expects.

RDS matters because relational databases back a huge share of applications, and running them reliably — with backups, patching, replication, and failover — is hard and error-prone. RDS automates that operational work while you keep your familiar SQL engine and data model. The key mental model is a managed **DB instance** running a chosen **engine**, optionally configured for **Multi-AZ** high availability and **read replicas** for read scaling, with automated backups, point-in-time recovery, and maintenance handled by AWS. You still own schema design, query tuning, and capacity choices.

---

## How It Works

You launch a **DB instance** choosing an **engine** — **Amazon Aurora** (MySQL/PostgreSQL-compatible, cloud-native), **MySQL**, **PostgreSQL**, **MariaDB**, **Oracle**, or **SQL Server** — an instance class (CPU/memory), and EBS storage (with provisioned IOPS options). AWS manages the OS, engine patching, and backups within your maintenance window.

Two concepts are central and frequently confused:

- **Multi-AZ** is a **high-availability** feature. RDS maintains a **synchronous standby** in another AZ (or, in Multi-AZ DB cluster mode, two readable standbys) and **automatically fails over** to it on instance failure, AZ failure, or maintenance — typically in a minute or two — by repointing the DB endpoint's DNS. It improves **availability and durability**, not read performance; the standby does not serve reads in the classic two-instance setup.
- **Read replicas** are a **read-scaling** feature. **Asynchronous** copies serve read-only traffic to offload the primary, can be created **cross-Region** (and cross-engine in some cases), and can be **promoted** to standalone databases. Because replication is async, replicas can **lag**.

**Automated backups** enable **point-in-time recovery (PITR)** within the retention window; manual **snapshots** persist until you delete them. Both can be encrypted and copied across Regions.

---

## Key Features

- **Automated backups + PITR** and manual snapshots for recovery; cross-Region snapshot copy for DR.
- **Encryption at rest** with **KMS** (set at creation; encrypting an existing DB requires an encrypted **snapshot copy** and restore) and **in transit** with TLS.
- **Multi-AZ** automatic failover for HA; **read replicas** for read scaling and cross-Region resilience.
- **Parameter and option groups** to tune engine configuration; **Performance Insights** and **Enhanced Monitoring** for deep observability.
- **IAM database authentication** (tokens instead of passwords) and **Secrets Manager** integration for managed credential rotation.
- **RDS Proxy** to pool connections (smoothing failover and protecting the database from connection storms), and **Aurora** features (storage auto-scaling, up to 15 low-lag replicas, Serverless v2, Global Database).

---

## Configuration Reference

- **Choose the engine and instance class**; pick **Aurora** for cloud-native performance/availability or a standard engine for compatibility/licensing.
- **Enable Multi-AZ** for production HA; add **read replicas** to offload reads (and for cross-Region DR).
- **Encrypt at creation** with KMS and enforce TLS; place the DB in **private subnets** with a tight security group; avoid public accessibility.
- **Configure backups, the maintenance window, and Secrets Manager rotation**; consider RDS Proxy for serverless or connection-heavy apps.

---

## Operations and Troubleshooting

- **Failover behavior.** Multi-AZ failover updates the **DB endpoint DNS** to the standby; applications must reconnect via the endpoint name (not a cached IP), and RDS Proxy can make failover nearly transparent.
- **Replica lag / stale reads.** Read replicas are asynchronous; design for eventual consistency on replica reads and monitor `ReplicaLag`.
- **Cannot connect.** Check security groups, subnet/route configuration, the public-accessibility setting, credentials/TLS, and (for IAM auth) the token and policy.
- **Performance.** Use **Performance Insights** to find slow queries and waits; scale the instance class or storage IOPS, offload reads to replicas, or add RDS Proxy to relieve connection pressure.
- **Encryption change.** You cannot encrypt an unencrypted instance in place — snapshot, copy with encryption (KMS), and restore.

---

## Integrations

RDS runs inside a **VPC** (private subnets, security groups), encrypts with **KMS** and TLS, stores and rotates credentials with **Secrets Manager**, is monitored by **CloudWatch**/Performance Insights, backed up via **AWS Backup**, and audited by **CloudTrail** (API) and engine logs to CloudWatch Logs. Anomalous Aurora logins are detected by **GuardDuty RDS Protection**, and **RDS Proxy** sits between applications (often **Lambda**) and the database. For non-relational needs, the counterpart is **DynamoDB**; **Aurora** is the high-performance cloud-native engine within the RDS family.

---

## Pricing and Cost Considerations

RDS charges for **DB instance hours** (by class, with **Reserved Instances** discounting steady workloads), **storage and provisioned IOPS**, **backup storage** beyond the free amount equal to your DB size, **data transfer**, and additional cost for **Multi-AZ** (the standby is billable) and each **read replica** (a billable instance). The cost levers are right-sizing the instance class, Reserved Instances for steady databases, scaling reads with replicas only as needed, and managing backup retention. **Aurora** bills compute + consumption-based storage/IO (or I/O-Optimized), and **Aurora Serverless v2** scales capacity in fine-grained units for variable workloads. Exact prices vary by engine, class, and Region.

---

## Exam Relevance

**CLF-C02:** Know RDS as managed relational databases (multiple engines) where AWS handles patching, backups, and failover, and the shared-responsibility split. Foundational.

**SAA-C03:** Know **Multi-AZ (HA) vs. read replicas (read scaling)** — a classic, near-guaranteed distinction — plus engine selection, backups/snapshots, encryption, Aurora, and RDS Proxy. Design depth.

**SOA-C03:** Operate databases — backups and PITR, failover behavior and the DNS endpoint, monitoring with Performance Insights, parameter groups, replica lag, and maintenance windows. Operations depth.

**SCS-C03:** Secure databases — KMS encryption and the snapshot-copy re-encryption pattern, TLS, private placement and security groups, Secrets Manager rotation, IAM authentication, and GuardDuty RDS Protection. Security depth.

---

## Summary

Amazon RDS runs managed relational databases (Aurora, MySQL, PostgreSQL, MariaDB, Oracle, SQL Server), automating patching, backups, and failover. **Multi-AZ** provides automatic failover for high availability (synchronous standby; not read scaling), while **read replicas** offload reads (asynchronous, can lag, promotable, cross-Region). Data is protected by KMS encryption, TLS, automated backups with point-in-time recovery, and snapshots; access is controlled by VPC placement, security groups, Secrets Manager, and IAM authentication; and RDS Proxy smooths connections and failover. The recurring exam points are the Multi-AZ-vs-read-replica distinction, reconnecting via the DB endpoint after failover, and the snapshot-copy pattern to encrypt an existing database.

---

## Quick Check

1. What problem does Multi-AZ solve, what problem do read replicas solve, and which one improves read performance?
2. After a Multi-AZ failover, why must the application connect via the DB endpoint rather than an IP, and what makes failover nearly transparent?
3. How do you encrypt an existing unencrypted RDS database?
4. Why might reads from a replica be slightly stale, and which metric tracks it?
5. Which service rotates RDS credentials, and which detects anomalous Aurora logins?

---

## What's Next

Pair this with **Amazon DynamoDB** (the NoSQL counterpart), **AWS Secrets Manager** (credential rotation), **AWS KMS** (encryption), and **Amazon VPC** (private placement).
