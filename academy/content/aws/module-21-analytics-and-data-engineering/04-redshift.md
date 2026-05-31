---
title: "Amazon Redshift: Cloud Data Warehouse"
type: content
estimated_minutes: 10
cert_tags: ["SAA-C03", "SAP-C02"]
---

# Amazon Redshift: Cloud Data Warehouse

## Overview

Amazon Redshift is a cloud data warehouse optimized for analytics on large volumes of structured data. Unlike Athena (schema-on-read, pay-per-query), Redshift loads data into columnar storage optimized for aggregation-heavy SQL queries. Redshift Serverless removes the need to manage clusters.

## Redshift Architecture

A Redshift cluster has a Leader Node (query planning, result aggregation) and Compute Nodes (query execution, data storage). Data is stored in columnar format across nodes with automatic distribution. Two node types: RA3 (separates compute and storage — data lives in S3-based Redshift Managed Storage, you scale compute independently) and DC2 (compute and SSD storage coupled on the node — for workloads requiring fast local SSD). Use RA3 for most new clusters — storage scales automatically as data grows.

## Redshift Spectrum

Redshift Spectrum lets you query data in S3 directly from Redshift SQL — without loading the data into Redshift tables. Spectrum pushes predicate filtering and aggregation to thousands of Spectrum nodes, then returns results to Redshift for final aggregation. Use Spectrum for: querying historical data in S3 that's too large or old to keep in Redshift, joining Redshift tables with S3 data lake data, or tiering cold data to S3 while keeping hot data in Redshift.

## Redshift Serverless

Redshift Serverless automatically provisions and scales capacity for analytics workloads. You specify a base RPU (Redshift Processing Unit) capacity; Serverless scales up during query peaks and scales to zero when idle (after a configurable idle period). Billed per RPU-second. Best for: unpredictable or intermittent analytical workloads, BI tools with variable load, and eliminating cluster sizing decisions. For constant high-throughput workloads, provisioned clusters are more cost-predictable.

## Redshift Integration and Loading

COPY command loads data from S3 into Redshift tables efficiently — orders of magnitude faster than INSERT statements. Use COPY with Parquet files for best performance. Redshift Data API provides an HTTP-based SQL interface without connection management — useful for Lambda functions querying Redshift. Amazon QuickSight connects natively to Redshift for BI dashboards. AWS Glue and Apache Spark can load data into Redshift via JDBC or the Redshift connector.

## Summary

Redshift is the structured data warehouse for complex SQL analytics on large datasets. RA3 nodes decouple compute and storage. Spectrum extends queries to S3 data lake without data loading. Serverless removes cluster management for variable workloads. COPY from S3 is the standard loading pattern. Redshift is the answer when Athena's per-query model is too expensive for frequent queries on the same dataset.

## Examples

A SaaS company's finance team ran the same 50 revenue and churn reports every business day, each joining multiple large tables across two years of transaction history. They initially used Athena, but the same queries ran hourly and the per-TB costs compounded quickly. Migrating to a Redshift provisioned cluster with RA3 nodes made those queries 10–30x faster and reduced monthly analytics spend by 60%, because repeated queries against loaded columnar data in Redshift are far cheaper per execution than re-scanning S3 on every Athena call. This is the canonical "frequent queries on the same data" case where Redshift wins.

A healthcare analytics platform kept five years of claims data in S3 — too large to economically load into Redshift — but needed to join that historical data with the current year's records already loaded in Redshift tables. They configured Redshift Spectrum with an external schema pointing to the Glue Catalog, letting analysts write a single SQL query that joined Redshift-native 2024 data with S3-stored 2019–2023 data seamlessly. This shows how Spectrum blurs the boundary between warehouse and data lake without forcing a choice between them.

A growth-stage startup needed dashboards for investor reporting but had no idea how much compute their Redshift queries would require — demand varied wildly by week. Rather than sizing a provisioned cluster and paying for idle capacity, they used Redshift Serverless with a modest base RPU setting. During quarterly board prep when 20 analysts ran heavy queries simultaneously, Serverless scaled up automatically. During quiet weeks it scaled toward zero. This illustrates Serverless's core value: paying for actual work done, not for reserved capacity that sits idle most of the time.

## Think About It

1. Why is the COPY command from S3 dramatically faster than running INSERT statements to load data into Redshift, and what does that tell you about how Redshift stores data internally?
2. What would happen to query performance and cost if you used Redshift Serverless for a workload that runs 10,000 queries per day at a consistent rate, 24 hours a day — and how might that compare to a provisioned cluster?
3. How would you decide whether to keep historical data in Redshift tables or tier it to S3 and query it via Spectrum — and what metrics would drive that decision over time?
4. What trade-offs exist between RA3 and DC2 node types, and under what specific workload characteristics would you choose one over the other?
5. If both Athena and Redshift can query the same Parquet files in S3 (via Spectrum), why would you ever choose to load data into Redshift tables at all?

## Quick Check

**Q1.** What is the key architectural difference between Redshift RA3 and DC2 node types?
- A) RA3 nodes use GPU acceleration; DC2 nodes use CPU only
- B) RA3 nodes separate compute and storage (data in S3-based managed storage); DC2 nodes couple compute with local SSD storage
- C) RA3 nodes are for serverless workloads; DC2 nodes are for provisioned clusters only
- D) RA3 nodes support Redshift Spectrum; DC2 nodes do not

**Answer: B** — RA3 decouples compute from storage, allowing each to scale independently, while DC2 ties storage to the node's local SSD, making it harder to grow one without the other.

**Q2.** What does Redshift Spectrum allow you to do?
- A) Run Redshift SQL queries against data stored in DynamoDB tables
- B) Query data in S3 directly from Redshift without loading it into Redshift tables
- C) Automatically replicate Redshift tables to S3 for backup
- D) Stream query results from Redshift to Kinesis in real time

**Answer: B** — Spectrum extends Redshift SQL to S3 by pushing filtering and aggregation to Spectrum nodes, enabling joins between loaded Redshift tables and raw S3 data lake data.

**Q3.** When is Redshift Serverless the better choice compared to a provisioned Redshift cluster?
- A) When you need the lowest possible per-query latency for high-throughput constant workloads
- B) When you want to use DC2 nodes with local SSD storage
- C) When workloads are unpredictable or intermittent and you want to avoid paying for idle cluster capacity
- D) When your dataset is too large to fit in S3-based Redshift Managed Storage

**Answer: C** — Redshift Serverless shines when demand is variable, billing per RPU-second used, while provisioned clusters offer more predictable costs for steady, high-throughput workloads.

## What's Next

Next up: OpenSearch Service, EMR, and QuickSight — search, big data processing, and BI.