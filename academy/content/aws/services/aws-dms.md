---
title: "AWS Database Migration Service (DMS)"
type: content
estimated_minutes: 14
cert_tags: ["SAA-C03", "SOA-C03"]
---

# AWS Database Migration Service (DMS)

## Overview

AWS Database Migration Service (DMS) helps you **migrate databases to AWS quickly and with minimal downtime**, and to **continuously replicate** data between sources and targets. It supports homogeneous migrations (e.g., Oracle→Oracle) and heterogeneous ones (e.g., Oracle→Aurora PostgreSQL), keeping the source fully operational during the migration. This *service reference* lesson covers how DMS works, the role of the Schema Conversion Tool, ongoing replication, and what each certification expects.

DMS matters because migrating a production database is risky and traditionally requires extended downtime; ongoing data replication for analytics or DR is also operationally hard. DMS makes both manageable: it copies existing data and then **continuously replicates changes (CDC)** so the target stays in sync until you cut over, minimizing downtime. The core mental model is a **replication instance** that connects to a **source endpoint** and a **target endpoint** and runs a **task** that does a full load and/or ongoing change-data-capture, transforming data as needed. For heterogeneous migrations, the **Schema Conversion Tool (SCT)** / DMS Schema Conversion converts the schema and code first.

---

## How It Works

- **Replication instance** — a managed compute resource that runs the migration; DMS Serverless can provision capacity automatically.
- **Source and target endpoints** — connection definitions for the databases/stores. Sources and targets include most commercial and open-source databases, plus targets like **S3, Redshift, DynamoDB, OpenSearch, and Kinesis**.
- **Task** — defines what to migrate and the **migration type**:
  - **Full load** — copy existing data once.
  - **Full load + CDC** — copy existing data, then **continuously replicate changes** so the target stays current until cutover (this is what enables minimal downtime).
  - **CDC only** — ongoing replication from an already-loaded target (e.g., for continuous data feeds).

For **heterogeneous** migrations (different engines), the **Schema Conversion Tool / DMS Schema Conversion** converts tables, indexes, views, stored procedures, and other objects to the target engine and flags what needs manual rework. **Homogeneous** migrations (same engine) typically don't need conversion.

---

## Key Features

- **Minimal-downtime migration** via full load + **CDC** continuous replication.
- **Homogeneous and heterogeneous** migrations, with **SCT/DMS Schema Conversion** for the latter.
- **Broad source/target support**, including non-database targets (S3, Redshift, DynamoDB, OpenSearch, Kinesis) for analytics and streaming.
- **DMS Serverless** to auto-provision replication capacity.
- **Data validation** to confirm source and target match, and transformation rules during migration.
- **Security**: VPC deployment, KMS encryption, and IAM/Secrets Manager for credentials.

---

## Configuration Reference

- **Provision a replication instance** (or use Serverless), define **source/target endpoints**, and create a **task** with the right migration type (full load, full load + CDC, or CDC only).
- **For heterogeneous migrations**, run **Schema Conversion** first and address flagged manual changes.
- **Enable validation** to verify data integrity, and use **transformation rules** for renaming/reshaping.
- **Secure** with VPC, KMS, and Secrets Manager-managed credentials.

---

## Operations and Troubleshooting

- **Need near-zero downtime.** Use **full load + CDC**: load data, let CDC keep the target in sync, then cut over during a brief window.
- **Heterogeneous migration issues.** SCT/Schema Conversion handles most objects but flags incompatible ones (proprietary features, certain stored procedures) for manual rework.
- **Replication lag / failures.** Right-size the replication instance, check source CDC settings (e.g., binlog/redo log access), and monitor task statistics and validation results.
- **Continuous replication.** CDC-only tasks support ongoing feeds into analytics targets (Redshift/S3/Kinesis), not just one-time migrations.

---

## Integrations

DMS migrates and replicates between most databases and into **S3, Redshift, DynamoDB, OpenSearch, and Kinesis**; uses **SCT/DMS Schema Conversion** for heterogeneous schema/code conversion; runs in a **VPC** with **KMS** encryption and **Secrets Manager** credentials; and is monitored by **CloudWatch**. It commonly migrates on-premises or EC2 databases to **RDS/Aurora** and feeds **data lakes** and warehouses via CDC. It pairs with the **AWS Application Migration Service** (for servers) and **DataSync** (for files) in the broader migration toolkit.

---

## Pricing and Cost Considerations

DMS bills primarily by the **replication instance** (instance type × hours, or capacity for **DMS Serverless**) plus storage and data transfer; the **Schema Conversion Tool** is free. The cost is generally modest relative to a migration's value; the levers are right-sizing the replication instance, using Serverless for variable workloads, and shutting down tasks/instances after cutover (for one-time migrations) versus keeping them for ongoing CDC replication. Exact prices vary by instance and Region.

---

## Exam Relevance

**SAA-C03:** Know DMS for low-downtime migrations using **full load + CDC**, homogeneous vs. heterogeneous migrations and the role of **SCT/Schema Conversion**, non-database targets (S3/Redshift/Kinesis) for analytics, and the source stays online during migration. Design depth.

**SOA-C03:** Operate migrations/replication — task types, validation, lag troubleshooting, and ongoing CDC feeds. Operations depth.

---

## Summary

AWS DMS migrates and continuously replicates databases with minimal downtime: a replication instance runs a task between source and target endpoints, doing a full load and/or change-data-capture (CDC) so the target stays in sync until cutover. It supports homogeneous and heterogeneous migrations (the latter using the Schema Conversion Tool to convert schema/code), and can target not just databases but S3, Redshift, DynamoDB, OpenSearch, and Kinesis for analytics and streaming. It's secured with VPC/KMS/Secrets Manager and offers a Serverless option. The recurring exam points are full-load-plus-CDC for low-downtime migration, SCT for heterogeneous conversion, and DMS as a continuous-replication tool feeding analytics targets.

---

## Quick Check

1. How does DMS achieve minimal-downtime migration, and what does CDC do?
2. What is the difference between a homogeneous and a heterogeneous migration, and which needs the Schema Conversion Tool?
3. Besides databases, what targets can DMS replicate into, and why is that useful?
4. Does the source database have to go offline during migration?
5. When would you use a CDC-only task?

---

## What's Next

Pair this with **Amazon RDS/Aurora** (common targets), **Amazon S3/Redshift/Kinesis** (analytics targets), and **AWS KMS**/**Secrets Manager** (security).
