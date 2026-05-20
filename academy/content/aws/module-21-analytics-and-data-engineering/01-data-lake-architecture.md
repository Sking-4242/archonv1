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

## What's Next

Next up: AWS Glue — ETL, data quality, and data catalog management.