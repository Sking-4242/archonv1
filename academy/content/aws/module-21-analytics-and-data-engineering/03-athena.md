---
title: "Amazon Athena: Serverless SQL Analytics"
type: content
estimated_minutes: 8
cert_tags: ["SAA-C03", "SAP-C02"]
---

# Amazon Athena: Serverless SQL Analytics

## Overview

Amazon Athena lets you run SQL queries directly against S3 data using standard ANSI SQL — no servers to manage, no data loading required. You pay per query based on data scanned ($5 per TB). Athena is the fastest path to ad-hoc analytics on a data lake.

## How Athena Works

Athena reads table definitions from the Glue Data Catalog (or its own Athena-managed catalog) and translates SQL queries into distributed reads against S3. Query results are stored in an S3 results bucket. Athena uses Presto (now Trino) and Apache Spark under the hood. There is no cluster to provision, no data to import — query directly against S3 data files. Federated Query lets you query RDS, DynamoDB, Redshift, and other sources from Athena alongside S3 data using Lambda-based connectors.

## Cost Optimization

Athena charges per TB scanned. Reduce scan cost by: (1) using columnar formats (Parquet/ORC — typically 10x less data scanned vs. CSV for selective queries), (2) compressing data (Snappy, GZIP — reduces bytes transferred), (3) partitioning by commonly filtered columns (date, region — Athena reads only relevant partitions), (4) using partition projection (define partition structure in table metadata to avoid listing S3 paths). Partitioning by date and then running `WHERE year='2024' AND month='12'` reads only that partition's files.

## Athena Workgroups

Workgroups separate query execution for different teams or cost centers. Each workgroup has: query result location, per-query data scan limit (to prevent accidentally expensive queries), per-workgroup cost controls, CloudWatch metrics per workgroup, and separate IAM access. Use workgroups to isolate production analytical queries from ad-hoc exploration and enforce cost guardrails per team.

## Athena for Logs

Athena is the standard tool for querying CloudTrail logs, ALB access logs, VPC Flow Logs, and CloudFront logs stored in S3. AWS provides pre-built table schemas and SQL examples for each log type. Instead of downloading logs and running grep, create a Glue table over the S3 log prefix and query with SQL. Example: find all API calls by a specific IAM role in the last week with a 3-second SQL query against 6 months of CloudTrail logs.

## Summary

Athena is serverless SQL over S3 — no cluster, no data loading, pay per query. Use Parquet + partitioning to minimize scan cost. Federated Query extends Athena to RDS, DynamoDB, and other sources. Workgroups enforce cost and access boundaries. Athena + Glue Catalog + S3 is the core serverless analytics stack for AWS data lakes.

## What's Next

Next up: Amazon Redshift — cloud data warehouse for structured analytics.