---
title: "Amazon Athena"
type: content
estimated_minutes: 16
cert_tags: ["CLF-C02", "AIF-C01", "SAA-C03", "SOA-C03", "SCS-C03"]
---

# Amazon Athena

## Overview

Amazon Athena is a **serverless, interactive query service** that lets you analyze data directly in Amazon S3 (and other sources) using standard SQL — with no servers to manage and no data to load into a database first. You point Athena at data in S3, define a schema, and run SQL queries, paying only for the data each query scans. This *service reference* lesson covers how Athena queries S3, performance and cost optimization, federated queries, security, and what each certification expects.

Athena matters because a huge amount of valuable data already sits in S3 — logs, exports, data-lake tables — and people need to query it ad hoc without building and operating a data warehouse or ETL pipeline. Athena makes S3 directly queryable with SQL in seconds. The core mental model is **schema-on-read**: the data stays in S3 in its existing format (CSV, JSON, Parquet, ORC), and Athena applies a table definition (from the **AWS Glue Data Catalog**) at query time. Because you pay per **terabyte scanned**, the central skill is structuring data so queries scan less — which is also what makes them fast.

---

## How It Works

Athena uses the **AWS Glue Data Catalog** (a metastore) to know the schema and location of your data. You define **databases and tables** (manually, via DDL, or by crawling with Glue), each pointing at an S3 prefix and a format. When you run a query, Athena (built on Presto/Trino) reads only the needed data from S3, executes the SQL, and returns results (also written to an S3 results location).

Performance and cost both come from **scanning less data**:

- **Columnar formats** (**Parquet/ORC**) let Athena read only the columns a query needs, cutting scan dramatically versus row formats like CSV/JSON.
- **Partitioning** (e.g., by date) lets queries prune to only relevant S3 prefixes via `WHERE` filters, so they don't scan the whole dataset.
- **Compression** reduces bytes scanned.

Athena also supports **federated queries** (querying data sources beyond S3 — RDS, DynamoDB, etc. — via Lambda connectors) and **CTAS**/views for transforming results.

---

## Key Features

- **Serverless SQL over S3** — no infrastructure, instant querying, pay-per-scan.
- **Glue Data Catalog integration** for schema/metadata, shared with other analytics services.
- **Performance/cost via columnar formats, partitioning, compression**, and partition projection.
- **Federated queries** to non-S3 sources via Lambda connectors.
- **Workgroups** to isolate teams, set **per-query/per-workgroup data-scan limits** (cost guardrails), and track usage.
- **Integration with QuickSight** for BI dashboards and with logging/security analytics.

---

## Configuration Reference

- **Define tables in the Glue Data Catalog** pointing at S3 data; crawl with Glue or write DDL.
- **Optimize the data**: convert to **Parquet/ORC**, **partition** by common filter columns (e.g., date), and compress — the single biggest performance/cost win.
- **Set an S3 query-results location** and use **workgroups** to enforce per-query data-scan limits and separate environments.
- **Control access** with IAM (and Lake Formation for fine-grained table/column permissions), and encrypt results in S3 with KMS.

---

## Operations and Troubleshooting

- **Queries are slow or expensive.** Almost always too much data scanned — convert to **columnar**, **partition**, and add `WHERE` filters on partition keys; check that queries actually prune partitions.
- **Costs higher than expected.** Set **workgroup data-scan limits**, use columnar/partitioned data, and avoid `SELECT *` on wide tables.
- **Schema/partition issues.** New partitions aren't visible until added (`MSCK REPAIR TABLE`, partition projection, or Glue crawler); mismatched formats cause errors.
- **Security analytics.** Athena is a standard tool to query **CloudTrail**, **VPC Flow Logs**, and other logs in S3 during investigations.

---

## Integrations

Athena queries data in **S3** using the **Glue Data Catalog** (and **Glue** ETL to prepare it), visualizes via **Amazon QuickSight**, applies fine-grained permissions with **Lake Formation**, queries non-S3 sources via **Lambda** federated connectors, and is a primary tool for analyzing **CloudTrail/VPC Flow Logs/Security Lake** data during security investigations. It complements **Redshift** (a managed data warehouse for heavy, repeated analytical workloads) — Athena suits ad-hoc, serverless querying of data already in S3.

---

## Pricing and Cost Considerations

Athena's standard pricing is **per terabyte of data scanned** by each query (with a separate provisioned-capacity option for predictable heavy usage). Because cost is driven by bytes scanned, the optimization levers are exactly the performance levers: **columnar formats (Parquet/ORC)**, **partitioning**, **compression**, selecting only needed columns, and setting **workgroup scan limits** as guardrails. Well-structured data can cut both query time and cost by an order of magnitude. There's no charge for failed queries (you pay for data scanned on successful ones), and DDL is free. Exact prices vary by Region.

---

## Exam Relevance

**CLF-C02:** Know Athena as a serverless service to query data in S3 with SQL, pay-per-query, no infrastructure. Foundational.

**AIF-C01:** Know Athena as a serverless way to explore and prepare data in S3 for analytics/ML. Conceptual.

**SAA-C03:** Know Athena for serverless ad-hoc SQL over S3, the Glue Data Catalog, columnar/partitioning for cost/performance, federated queries, and Athena vs. Redshift selection. Design depth.

**SOA-C03:** Operate analytics — querying logs (CloudTrail/Flow Logs), workgroup cost controls, and partition management. Operations depth.

**SCS-C03:** Use Athena to query security logs (CloudTrail, VPC Flow Logs, Security Lake) for investigation, with KMS-encrypted results and IAM/Lake Formation access control. Security depth.

---

## Summary

Amazon Athena is serverless, pay-per-scan SQL querying of data in S3 (and federated sources), using the Glue Data Catalog for schema-on-read over formats like CSV/JSON/Parquet/ORC. Because you pay per terabyte scanned, performance and cost are optimized the same way — columnar formats, partitioning, and compression to scan less — with workgroups enforcing scan limits. It integrates with Glue, QuickSight, Lake Formation, and Lambda federated connectors, and is a primary tool for querying CloudTrail/VPC Flow Logs during security investigations. The recurring exam points are pay-per-scan economics, the Parquet/partitioning optimization, and Athena (ad-hoc serverless over S3) vs. Redshift (managed warehouse).

---

## Quick Check

1. What does "serverless, pay-per-scan, schema-on-read" mean for how Athena queries S3?
2. What three data optimizations most reduce both query time and cost, and why?
3. Where does Athena get the schema for the data it queries?
4. How do workgroups help control Athena cost?
5. When would you choose Redshift instead of Athena?

---

## What's Next

Pair this with **Amazon S3** (the data), **AWS Glue** (catalog and ETL), **Amazon Redshift** (warehouse comparison), and the SCS-C03 log-analysis lesson (querying CloudTrail/Flow Logs).
