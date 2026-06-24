---
title: "Amazon DynamoDB"
type: content
estimated_minutes: 20
cert_tags: ["CLF-C02", "SAA-C03", "SOA-C03", "SCS-C03"]
---

# Amazon DynamoDB

## Overview

Amazon DynamoDB is a fully managed, serverless **NoSQL** key-value and document database that delivers single-digit-millisecond performance at any scale. There are no servers to provision, no patching, and it scales to handle massive throughput automatically. This *service reference* lesson covers the data model and key design, capacity modes, indexes, the durability and global features, security, and what each certification expects.

DynamoDB matters because many modern, high-scale applications need predictable low latency and effectively unlimited horizontal scale that relational databases struggle to provide. It trades the flexible ad-hoc querying of SQL for guaranteed performance and operational simplicity. The core mental model is a **table** of **items** (rows) made of **attributes**, where every item is identified by a **primary key**, and you design around your access patterns up front because DynamoDB rewards key-based access and penalizes scans. Understanding partition keys, capacity modes, and indexes is the heart of using it well.

---

## How It Works

- **Table / item / attribute** — a table holds items; each item is a set of attributes; only the key attributes are required, so the schema is otherwise flexible.
- **Primary key** — either a **partition key** alone, or a **partition key + sort key** (composite, enabling many items per partition key and range queries on the sort key). The partition key is hashed to choose a physical partition, so a **high-cardinality, evenly accessed** partition key is essential to avoid **hot partitions** that throttle.
- **Secondary indexes** — a **Global Secondary Index (GSI)** allows querying on different attributes with its own partition/sort key and its own throughput; a **Local Secondary Index (LSI)** shares the table's partition key with an alternate sort key (created only at table creation).

**Capacity modes**:

- **On-demand** — pay per request, scales instantly with no capacity planning; ideal for unpredictable, spiky, or new workloads.
- **Provisioned** — you set Read/Write Capacity Units (RCUs/WCUs), optionally with **auto scaling**; cheaper for steady, predictable traffic, and reservable for further discount.

DynamoDB replicates every write across **three Availability Zones** synchronously for durability and high availability.

---

## Key Features

- **DynamoDB Streams** — an ordered, 24-hour change log of item modifications that triggers **Lambda** for event-driven processing, replication, and aggregation.
- **Global Tables** — multi-Region, **active-active** replication for low-latency global access and regional DR.
- **DynamoDB Accelerator (DAX)** — an in-memory cache delivering microsecond reads for read-heavy workloads.
- **Point-in-time recovery (PITR)** (continuous, ~35 days) and on-demand backups for data protection; export to S3 for analytics.
- **Time to Live (TTL)** to auto-expire items at no cost; **transactions** for all-or-nothing multi-item writes; **conditional writes** and **optimistic concurrency**.
- **Strong or eventual consistency** on reads (strongly consistent reads cost more and aren't available on GSIs).

---

## Configuration Reference

- **Model around access patterns first.** Design the primary key and GSIs for the exact queries you need — DynamoDB does not do joins or efficient ad-hoc filtering. Single-table design is common.
- **Choose capacity mode** — on-demand for spiky/unknown traffic, provisioned (with auto scaling) for steady, cost-sensitive workloads.
- **Encryption at rest is always on** (KMS — AWS-owned, AWS-managed, or customer-managed keys).
- **Enable PITR**, set TTL where useful, and add **Global Tables/DAX** as the workload requires; use **VPC gateway endpoints** for private access.

---

## Operations and Troubleshooting

- **Throttling.** In provisioned mode, exceeding capacity throttles — enable auto scaling, switch to on-demand, or fix a **hot partition** (a skewed or low-cardinality partition key) by improving key design or **write sharding**. Even on-demand can briefly throttle on extreme instantaneous spikes against a cold table.
- **Hot partitions.** Concentrated traffic on one partition key value limits throughput regardless of total provisioning; redesign the key or add a random/calculated suffix.
- **Expensive or slow scans.** Replace table `Scan` with `Query` on well-designed keys/indexes; scans read the whole table.
- **Monitoring.** CloudWatch reports consumed capacity, throttled requests, and latency; **Contributor Insights** surfaces the most-accessed keys to find hotspots.

---

## Integrations

DynamoDB integrates with **Lambda** via **Streams** (event-driven processing), **KMS** (always-on encryption), **CloudWatch** (metrics), **CloudTrail** (control-plane and optional data-event auditing), **VPC gateway endpoints** (free private access, like S3), **AWS Backup** (backups/PITR), and **S3** (table export for analytics with Athena/EMR). It is a foundational store for serverless and high-scale applications, complementing **RDS** (relational) for workloads that prioritize scale and predictable latency over rich querying.

---

## Pricing and Cost Considerations

DynamoDB charges differently by capacity mode: **on-demand** bills per read/write request (the safe default for unpredictable traffic), while **provisioned** bills for reserved RCUs/WCUs (cheaper for steady, well-understood load, especially with auto scaling and reserved capacity). Additional charges include **stored data** per GB, **Global Tables** replicated writes, **DAX** nodes, backups/PITR, and Streams reads. The cost levers are matching capacity mode to traffic shape, avoiding over-provisioning, designing keys to avoid wasted capacity from hot partitions, and using TTL to expire stale data. Strongly consistent reads cost twice the RCUs of eventually consistent reads. Exact prices vary by Region.

---

## Exam Relevance

**CLF-C02:** Know DynamoDB as a fully managed, serverless NoSQL database with fast, predictable performance at scale, distinct from relational RDS. Foundational.

**SAA-C03:** Know the data model and partition-key/hot-partition concept, on-demand vs. provisioned capacity, GSIs vs. LSIs, Streams + Lambda, Global Tables, DAX, and when to choose DynamoDB over RDS — common design content. Design depth.

**SOA-C03:** Operate tables — capacity/auto scaling, throttling and hot-partition troubleshooting, backups/PITR, Contributor Insights, and monitoring. Operations depth.

**SCS-C03:** Secure data — always-on KMS encryption with key choice, fine-grained IAM (including condition keys for item/attribute-level access), VPC endpoints, and PITR. Security depth.

---

## Summary

Amazon DynamoDB is a fully managed, serverless NoSQL database delivering single-digit-millisecond latency at any scale, with tables of items keyed by a partition key (optionally plus a sort key) and queried via primary keys and GSIs/LSIs. Capacity is on-demand (spiky/unknown) or provisioned (steady/cost-sensitive); durability comes from synchronous three-AZ replication, PITR, and backups; and Streams, Global Tables, DAX, TTL, and transactions extend it. It is always KMS-encrypted, accessed with fine-grained IAM, and reachable privately via gateway endpoints. The recurring exam points are partition-key design and hot partitions, on-demand vs. provisioned, Query vs. Scan, and Streams→Lambda. DynamoDB is the high-scale complement to relational RDS.

---

## Quick Check

1. What does the partition key determine, and what is a hot partition?
2. When would you choose on-demand capacity versus provisioned, and what does auto scaling add?
3. What is the difference between a GSI and an LSI, and which can only be created at table creation?
4. What do DynamoDB Streams enable, and which service commonly consumes them?
5. Why are table scans discouraged, and how do strongly consistent reads affect cost?

---

## What's Next

Pair this with **Amazon RDS** (relational comparison), **AWS Lambda** (Streams processing), and **AWS KMS** (encryption). DynamoDB recurs in the serverless architecture cert lessons.
