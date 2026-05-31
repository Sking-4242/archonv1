---
title: "OpenSearch, EMR, and QuickSight"
type: content
estimated_minutes: 8
cert_tags: ["SAA-C03", "SAP-C02"]
---

# OpenSearch, EMR, and QuickSight

## Overview

Three more analytics services complete the picture: OpenSearch for full-text search and log analytics, EMR for big data processing with Hadoop/Spark, and QuickSight for business intelligence dashboards.

## Amazon OpenSearch Service

OpenSearch Service (formerly Amazon Elasticsearch Service) is a managed search and analytics engine based on OpenSearch (the Apache-licensed Elasticsearch fork). Use cases: full-text search over application data, log analytics (ELK stack alternative — OpenSearch + Logstash/Firehose + Kibana/OpenSearch Dashboards), clickstream analysis, security analytics (SIEM). OpenSearch Serverless removes capacity management. Integration: Kinesis Firehose delivers streaming data directly to OpenSearch; Lambda can transform records before delivery.

## Amazon EMR (Elastic MapReduce)

EMR runs big data frameworks — Apache Spark, Hadoop, Hive, Presto, Flink, HBase — on managed EC2 clusters or serverless. Use EMR for: large-scale Spark ML training jobs, Hive transformations on data lake data, legacy Hadoop workloads, or custom Spark code that doesn't fit in Glue's managed environment. EMR on EC2 supports spot instances for cost reduction (up to 90% off on spot-tolerant workloads). EMR Serverless runs Spark/Hive jobs without cluster management — auto-provisions workers per job. Use EMR when Glue's managed Spark environment doesn't meet your custom requirements.

## Amazon QuickSight

QuickSight is a cloud-native BI service for building dashboards and visualizations. It connects to Redshift, RDS, Athena, S3, Salesforce, and many other sources. SPICE (Super-fast Parallel In-memory Calculation Engine) is QuickSight's in-memory cache — import data into SPICE for fast dashboard refresh without live database queries. ML Insights automatically detects anomalies, forecasts trends, and generates narrative summaries from your data. QuickSight is per-user subscription pricing — no server infrastructure.

## Choosing Analytics Services

Ad-hoc SQL on S3 data lake → Athena. Complex SQL on structured data, frequent queries → Redshift. Full-text search, log analytics → OpenSearch. Custom Spark, Hadoop, ML at scale → EMR. BI dashboards → QuickSight. Stream analytics → Kinesis Analytics (Flink). ETL → Glue. These services are not mutually exclusive — a complete analytics platform uses several: Firehose → S3 data lake → Glue ETL → Redshift → QuickSight dashboards + Athena for ad-hoc.

## Summary

OpenSearch for full-text search and log analytics. EMR for custom big data frameworks at scale. QuickSight for BI dashboards with SPICE caching. The complete analytics stack: Firehose ingestion, S3 data lake, Glue ETL, Redshift or Athena for queries, QuickSight for visualization. Each service has a specific role — use the right tool for each job.

## Examples

A ride-sharing company's operations team needed to search driver feedback comments for mentions of specific safety keywords — "brake," "accident," "dangerous" — across millions of free-text submissions. Redshift and Athena are optimized for structured SQL, not full-text fuzzy search; the operations team would have needed complex `LIKE` patterns with poor performance. They indexed the comments in OpenSearch Service and built a dashboard in OpenSearch Dashboards showing keyword frequency by city and week. This is a clear case where the query pattern (relevance-ranked full-text search) determines the right tool.

A genomics research organization needed to run a custom Apache Spark pipeline that used specialized bioinformatics libraries not available in the Glue managed environment. They provisioned an EMR cluster with a specific version of Apache Spark, installed their research libraries via a bootstrap action, and ran the pipeline using EC2 spot instances to cut compute costs by 70%. When the job completed the cluster terminated. This illustrates EMR's role: when Glue's managed Spark doesn't fit because of custom libraries, specific framework versions, or cost-sensitive long-running jobs, EMR gives you direct cluster control.

A retail chain's VP of merchandising wanted a self-service dashboard showing weekly sales by product category and store region — refreshed from a Redshift data warehouse — without requiring an engineering request for every new view. The data team connected QuickSight to Redshift, imported key aggregated tables into SPICE, and built a parameterized dashboard that the VP's team could filter by date range and region themselves. QuickSight's ML Insights feature automatically flagged an unexpected dip in one region's sales without the analyst having to look for it. This shows QuickSight's position in the stack: it's the human-facing endpoint where data becomes business decisions.

## Think About It

1. Why is OpenSearch a better fit than Athena for a log analytics platform where engineers need to search log messages by keyword in near real time — even though both can query data stored in S3?
2. What would happen to cost and operational complexity if you tried to run a 100-node Hadoop workload inside Glue instead of EMR — and why does that use case belong on EMR?
3. How would you decide whether to use SPICE caching in QuickSight or connect QuickSight directly to a live Redshift query — and what risks come with each approach?
4. The lesson describes a complete analytics stack: Firehose → S3 → Glue ETL → Redshift → QuickSight. At which point in that pipeline would you add OpenSearch, and for what use case?
5. What trade-offs exist between managing your own Airflow-on-EC2 cluster versus using EMR Serverless for ad-hoc Spark jobs — and which dimension matters most for a team with variable, unpredictable workloads?

## Quick Check

**Q1.** What is SPICE in Amazon QuickSight?
- A) A security encryption layer for BI dashboards
- B) An in-memory data cache that allows fast dashboard refresh without live database queries
- C) A machine learning model that automatically builds visualizations from raw data
- D) A connector that links QuickSight to OpenSearch Service

**Answer: B** — SPICE (Super-fast Parallel In-memory Calculation Engine) imports data into QuickSight's in-memory store, enabling fast dashboard interactions without running live queries against the source database on every refresh.

**Q2.** Which scenario is the best fit for Amazon EMR rather than AWS Glue?
- A) Running a standard CSV-to-Parquet conversion job on 50 GB of daily log files
- B) Building a Glue Data Catalog with automated schema discovery
- C) Running a custom Apache Spark ML pipeline that requires a specific Spark version and specialized bioinformatics libraries
- D) Visually preparing a dataset for non-technical analysts using point-and-click transforms

**Answer: C** — EMR gives you direct control over the Spark cluster, framework version, and library installation via bootstrap actions — capabilities that Glue's managed environment does not expose.

**Q3.** Which service would you use to build a full-text search experience over millions of product descriptions for a customer-facing e-commerce website?
- A) Amazon Athena with LIKE queries
- B) Amazon Redshift with full-table scans
- C) Amazon OpenSearch Service
- D) Amazon QuickSight with SPICE

**Answer: C** — OpenSearch is purpose-built for relevance-ranked full-text search with low-latency responses, which SQL-based tools like Athena and Redshift cannot match for that query pattern.

## What's Next

Next up: the Module 21 Canvas Lab — design a data lake and analytics pipeline.