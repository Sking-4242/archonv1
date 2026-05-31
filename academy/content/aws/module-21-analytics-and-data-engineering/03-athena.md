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

## Examples

A startup's security team needed to investigate a suspected credential misuse incident. Rather than downloading gigabytes of CloudTrail log files and parsing them locally, an engineer created an Athena table pointing to the S3 bucket where CloudTrail delivered logs, used the AWS-provided table schema, and ran a SQL query filtering by the suspicious IAM role ARN and a one-week time window. The full investigation query returned results in under five seconds. This is Athena's strongest use case: ad-hoc forensic or operational queries over log data that would otherwise require purpose-built tooling.

A media streaming company let data analysts run exploratory queries against 18 months of user behavior data stored in S3. Before adopting Athena best practices, a single broad query could scan 4 TB and cost $20. After the data engineering team converted the dataset from JSON to Parquet and added date-based partitioning, the same query scanned under 200 GB and cost under $1. This is a textbook example of how storage format and partitioning choices have a direct, measurable financial impact — and why those decisions belong in the architecture conversation, not as an afterthought.

A retail analytics team used Athena Federated Query to join their S3 data lake (historical order records) with live inventory data in RDS MySQL — all from a single SQL statement, without building an ETL pipeline to synchronize the two stores first. They configured the RDS connector via Lambda and added the RDS table as an Athena data source. This illustrates how Federated Query lets analysts reason across data stores that live in fundamentally different systems, deferring or eliminating the need for replication pipelines.

## Think About It

1. Why does partitioning reduce Athena query cost, and what happens at the S3 level when Athena evaluates a `WHERE year='2024'` clause against a partitioned table?
2. If a team runs the same 10 summary queries against a 10 TB dataset every hour, is Athena the right tool — or would a different service be more cost-effective over time? What would drive that decision?
3. What trade-offs would you weigh when deciding whether to use Athena Federated Query to join S3 and RDS data versus building a Glue ETL job that copies RDS data into S3 first?
4. How would you design Athena Workgroups for an organization with a finance team, an engineering team, and a data science team — all with different budgets and data access requirements?
5. Why might storing data in many small files (thousands of 1 MB files) hurt Athena performance even if the total data volume is the same as fewer large files?

## Quick Check

**Q1.** How does Amazon Athena charge for queries?
- A) Per query execution, regardless of data volume
- B) Per TB of data scanned by each query
- C) Per hour of cluster runtime, like Redshift
- D) Per row returned in the query result

**Answer: B** — Athena bills based on the amount of data scanned per query, which is why reducing scan volume through columnar formats and partitioning directly lowers cost.

**Q2.** Which combination of techniques most effectively reduces Athena query cost and latency for a large dataset?
- A) Using CSV format with GZIP compression and no partitioning
- B) Using Parquet format with date-based partitioning
- C) Loading data into Athena's internal storage before querying
- D) Increasing the Athena workgroup's per-query scan limit

**Answer: B** — Parquet's columnar format reduces bytes read per query, and partitioning ensures Athena reads only the relevant S3 prefixes rather than the entire dataset.

**Q3.** What does Athena Federated Query enable?
- A) Running Athena queries faster by caching results in ElastiCache
- B) Querying data sources beyond S3, such as RDS or DynamoDB, from within Athena SQL
- C) Distributing a single Athena query across multiple AWS regions
- D) Allowing multiple users to share query results without re-executing the query

**Answer: B** — Federated Query uses Lambda-based connectors to let Athena issue SQL against non-S3 sources like RDS, DynamoDB, and Redshift alongside S3 data.

## What's Next

Next up: Amazon Redshift — cloud data warehouse for structured analytics.