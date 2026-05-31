---
title: "Data Lake Architecture on AWS"
type: content
estimated_minutes: 10
cert_tags: ["SAA-C03", "SAP-C02"]
---

# Data Lake Architecture on AWS

## Overview

A data lake is a centralized repository for all your data — structured, semi-structured, and unstructured — stored in its raw form until needed for analysis. AWS S3 is the standard data lake storage layer. This lesson covers the data lake pattern, ingestion options, and the AWS Glue Data Catalog.

## What Is a Data Lake?

Unlike a data warehouse (structured, schema-on-write, optimized for SQL queries), a data lake stores raw data in any format (CSV, JSON, Parquet, images, logs) and applies schema when reading (schema-on-read). This flexibility accommodates unknown future analysis needs. The tradeoff: without governance, a data lake becomes a 'data swamp' — disorganized, inconsistently formatted, and hard to query. AWS Lake Formation provides governance on top of S3-based data lakes.

## S3 as the Data Lake Foundation

S3 is the universal data lake storage due to its durability, scalability, and deep integration with analytics services. Best practice: raw zone (unchanged original data), curated zone (cleaned, validated, partitioned), and presentation zone (aggregated, ready for BI tools). Use S3 intelligent-tiering for the raw zone (accessed infrequently once ingested). Store data in columnar formats (Parquet, ORC) in the curated zone — queries with Athena are 10-100x faster and cheaper against Parquet than CSV.

## AWS Glue Data Catalog

The Glue Data Catalog is a managed metadata repository — a Hive-metastore-compatible catalog of databases and tables pointing to S3 data. Define table schemas (column names, types, partition keys) in the catalog; Athena, EMR, Glue ETL jobs, and Redshift Spectrum all share the same catalog as a single source of truth for data location and schema. Glue Crawlers automatically scan S3 paths, detect schemas, and populate the catalog — eliminating manual schema definition for most data sources.

## Data Lake Ingestion Patterns

Batch: data files land in S3 from on-premises (Transfer Family), Kinesis Firehose, AWS DMS, or direct uploads. Real-time: Kinesis Data Streams → Firehose → S3 (with Parquet conversion). Change Data Capture (CDC): DMS reads database transaction logs and streams row-level changes to S3. API-based: AppFlow ingests SaaS data. Regardless of ingestion path, the data lands in the raw zone; downstream Glue ETL jobs transform and move it to the curated zone.

## Summary

S3 is the data lake storage layer. Structure it with raw, curated, and presentation zones. Store curated data in Parquet for query efficiency. The Glue Data Catalog is the shared metadata layer for all analytics services. Glue Crawlers automate schema discovery. Ingestion paths: Firehose for streaming, DMS for CDC, AppFlow for SaaS, Transfer Family for file-based. Lake Formation adds governance (row/column-level security) on top.

## Examples

A regional hospital network wanted to preserve every patient monitoring event, imaging file, and clinical note for future research — but didn't know in advance which analysis questions researchers would ask. They landed all raw data in an S3 raw zone with no transformation, relying on schema-on-read so future queries could interpret each record however the research needed. This is the foundational data lake promise: store everything now, define meaning later.

A mid-sized e-commerce retailer ingested clickstream events via Kinesis Firehose into S3, then ran a Glue Crawler nightly to update the Glue Data Catalog with new partition metadata. Their analytics team queried the catalog-backed tables from both Athena and Redshift Spectrum without any coordination — because the catalog served as a single shared metadata source. This illustrates how the Glue Data Catalog decouples storage from compute, letting multiple query engines access the same data without duplication.

A fintech startup initially stored all transaction logs in CSV format in a single S3 prefix. Athena queries took minutes and cost hundreds of dollars daily. After converting the curated zone to Parquet with date-based partitioning and re-running the same queries, scan volume dropped by roughly 95% and query times fell to seconds. This is the real-world payoff of the raw → curated → presentation zone pattern combined with columnar storage — a decision that looks like extra work upfront but compounds in savings every day.

## Think About It

1. Why does schema-on-read make a data lake more flexible than a data warehouse, and what new risks does that flexibility introduce?
2. What would happen if multiple teams each maintained their own S3 path and schema definitions in separate tools, rather than sharing a Glue Data Catalog?
3. How would you decide what belongs in the raw zone versus the curated zone — and should anything ever be deleted from the raw zone?
4. What trade-offs would you weigh when choosing between Kinesis Firehose, AWS DMS, and AppFlow as ingestion paths for the same dataset?
5. If a data lake becomes a "data swamp," what are the operational and business consequences — and which AWS service is designed to prevent that outcome?

## Quick Check

**Q1.** What is the primary advantage of storing curated data in Parquet format rather than CSV in an S3 data lake?
- A) Parquet files are human-readable and easier to debug
- B) Parquet's columnar format reduces data scanned and lowers Athena query costs
- C) Parquet is the only format supported by the Glue Data Catalog
- D) Parquet files are automatically encrypted by S3

**Answer: B** — Columnar formats like Parquet allow Athena to read only the columns a query needs, dramatically reducing the bytes scanned and therefore the cost per query.

**Q2.** Which AWS service provides row-level and column-level access control on top of an S3-based data lake?
- A) S3 Bucket Policies
- B) AWS Glue Data Catalog
- C) AWS Lake Formation
- D) Amazon Macie

**Answer: C** — Lake Formation adds fine-grained governance including row and column-level permissions on top of the Glue Catalog, enforced at query time by Athena and Redshift Spectrum.

**Q3.** What does a Glue Crawler do?
- A) Runs Spark ETL jobs to transform data between S3 zones
- B) Scans S3 paths to detect schemas and populate the Glue Data Catalog automatically
- C) Streams real-time data from Kinesis into S3
- D) Enforces data quality rules on incoming records

**Answer: B** — Glue Crawlers inspect S3 data, infer column types and partition structures, and write that metadata into the Glue Data Catalog, eliminating manual schema definition.

## What's Next

Next up: AWS Glue — ETL, data quality, and data catalog management.