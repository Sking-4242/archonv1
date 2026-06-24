---
title: "Amazon Redshift"
type: content
estimated_minutes: 16
cert_tags: ["CLF-C02", "AIF-C01", "SAA-C03", "SOA-C03"]
---

# Amazon Redshift

## Overview

Amazon Redshift is a fully managed, petabyte-scale **cloud data warehouse** for running fast, complex analytical queries (OLAP) across large structured datasets. It is purpose-built for business intelligence and reporting — aggregations, joins, and scans over billions of rows — using a columnar, massively parallel architecture. This *service reference* lesson covers the Redshift architecture, Spectrum and Serverless, performance, security, and what each certification expects.

Redshift matters because transactional databases (RDS/Aurora) are optimized for many small reads/writes (OLTP), not for scanning and aggregating huge tables for analytics. A data warehouse is purpose-built for the latter, and Redshift provides it managed at scale. The core mental model is a **columnar, MPP (massively parallel processing)** database: data is stored by column (so analytical queries read only needed columns) and distributed across many compute nodes that process queries in parallel. The key exam distinctions are **Redshift (warehouse, repeated heavy analytics) vs. Athena (serverless ad-hoc over S3) vs. RDS/Aurora (transactional)**.

---

## How It Works

A Redshift **cluster** (or **Redshift Serverless** workgroup) has a **leader node** that plans queries and one or more **compute nodes** that store data and execute query fragments in parallel. Data is stored in **columnar** format with compression, and distributed across nodes by a **distribution key**; **sort keys** order data on disk to speed range-restricted scans and joins. These design choices (distribution and sort keys) are what make queries fast or slow.

Two important capabilities extend it:

- **Redshift Spectrum** — query data **directly in S3** (using the Glue Data Catalog) without loading it into the cluster, so you can join warehouse tables with vast data-lake data.
- **Redshift Serverless** — run analytics without provisioning/managing clusters, automatically scaling capacity and billing by usage — ideal for variable or intermittent workloads.

Data is loaded efficiently with `COPY` from S3, and **materialized views**, **result caching**, and **automatic table optimization** improve performance.

---

## Key Features

- **Columnar, MPP architecture** with compression for fast analytical queries at petabyte scale.
- **Distribution keys and sort keys** to optimize data layout for joins and scans.
- **Redshift Spectrum** to query S3 data-lake data directly and join it with warehouse tables.
- **Redshift Serverless** for no-cluster, usage-based analytics.
- **Concurrency Scaling** to add transient capacity for bursts of queries, and **materialized views/result caching** for speed.
- **Zero-ETL integrations** (e.g., from Aurora) and **data sharing** across clusters/accounts without copying.
- **Encryption** (KMS), VPC isolation, and audit logging.

---

## Configuration Reference

- **Choose provisioned vs. Serverless** by workload steadiness (steady heavy use vs. variable/intermittent).
- **Design distribution and sort keys** to match join and filter patterns — the primary performance lever.
- **Load via `COPY` from S3**, use **Spectrum** to query data-lake data in place, and **materialized views** for repeated aggregations.
- **Secure** with KMS encryption, VPC placement, IAM/database auth, and audit logging to S3/CloudWatch.

---

## Operations and Troubleshooting

- **Slow queries.** Usually poor **distribution/sort key** choices causing data skew or full scans, or missing statistics — review the query plan, redistribute, and run table optimization; add Concurrency Scaling for query queues.
- **Loading bottlenecks.** Use `COPY` (parallel) from S3 rather than row-by-row inserts.
- **Redshift vs. Athena confusion.** For **repeated, heavy, low-latency** analytics on data you load and manage, use **Redshift**; for **ad-hoc, serverless** queries over data already in S3, use **Athena**. Spectrum bridges the two.
- **Cost from idle clusters.** Use **Serverless** or pause clusters for intermittent workloads.

---

## Integrations

Redshift loads from and queries **S3** (via `COPY` and **Spectrum** with the **Glue Data Catalog**), is prepared by **AWS Glue** ETL, visualized by **Amazon QuickSight**, fed in near real time by **Kinesis Firehose** and **zero-ETL** from Aurora, secured with **KMS**/VPC/IAM, and monitored by **CloudWatch**. It complements **Athena** (serverless ad-hoc) and **EMR** (big-data processing) in the analytics stack and feeds BI and ML workflows.

---

## Pricing and Cost Considerations

Provisioned Redshift bills by **node type × hours** (with Reserved Instances for steady workloads) plus backup and Spectrum (per-TB-scanned) and Concurrency Scaling usage; **Redshift Serverless** bills by **Redshift Processing Units (RPUs) consumed**, scaling to zero when idle. The cost levers are choosing Serverless for variable/intermittent analytics (no idle cluster cost), right-sizing provisioned clusters with Reserved Instances for steady heavy use, optimizing data layout to scan less (which also speeds queries), and using Spectrum to avoid loading rarely-queried data. Exact prices vary by node/RPU and Region.

---

## Exam Relevance

**CLF-C02:** Know Redshift as AWS's managed data warehouse for analytics/BI on large datasets, distinct from transactional RDS. Foundational.

**AIF-C01:** Know Redshift as a data warehouse feeding analytics and ML feature pipelines. Conceptual.

**SAA-C03:** Know Redshift's columnar/MPP warehouse role, **Spectrum** (query S3 in place), **Serverless**, distribution/sort keys, and **Redshift vs. Athena vs. RDS** selection. Design depth.

**SOA-C03:** Operate the warehouse — Serverless/pause for cost, Concurrency Scaling, performance tuning, and monitoring. Operations depth.

---

## Summary

Amazon Redshift is a managed, petabyte-scale, columnar MPP data warehouse for fast complex analytics, with a leader node planning queries and compute nodes executing them in parallel; distribution and sort keys govern performance. **Spectrum** queries S3 data-lake data in place (joining it with warehouse tables via the Glue Catalog), and **Serverless** runs analytics with no cluster management, billed by usage. It loads efficiently with `COPY`, accelerates with materialized views/result caching/Concurrency Scaling, and integrates with Glue, QuickSight, Kinesis, and zero-ETL sources, secured with KMS/VPC. The recurring exam points are Redshift (managed warehouse, heavy repeated analytics) vs. Athena (serverless ad-hoc over S3) vs. RDS (transactional), plus Spectrum and Serverless.

---

## Quick Check

1. Why is a columnar MPP warehouse better than a transactional database for large analytical queries?
2. What do distribution keys and sort keys control, and why do they matter for performance?
3. What does Redshift Spectrum let you do, and what catalog does it use?
4. When would you choose Redshift Serverless, and when Athena instead of Redshift?
5. What is the most efficient way to load large data into Redshift?

---

## What's Next

Pair this with **Amazon Athena** (serverless ad-hoc comparison), **AWS Glue** (catalog/ETL), **Amazon S3** (the data lake and Spectrum source), and **Amazon Kinesis** (streaming ingestion).
