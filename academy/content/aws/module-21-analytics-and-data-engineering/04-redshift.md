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

## What's Next

Next up: OpenSearch Service, EMR, and QuickSight — search, big data processing, and BI.