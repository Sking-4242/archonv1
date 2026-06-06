---
title: "Canvas Lab: Querying Partitioned S3 Data with Athena and Parquet Optimization"
type: canvas
estimated_minutes: 30
cert_tags: ["SAA-C03", "DVA-C02"]
canvas_type: open   # "starter" for guided, "open" for design challenge
---

# Canvas Lab: Querying Partitioned S3 Data with Athena and Parquet Optimization

## Challenge

A data team has 12 months of web access logs stored in S3 partitioned by year, month, and day. They need to query specific date ranges without scanning the entire dataset, demonstrating how partitioning and columnar formats reduce both query time and cost. Sample CSV log files in the correct S3 partition structure are pre-uploaded. Your goal is to design and validate a query strategy that minimizes data scanned.

## Learning Objectives

- Create an Athena database and external table with partition projection enabled for automatic partition discovery
- Run queries against partitioned data and verify that only the relevant partitions are scanned
- Compare bytes scanned between a partitioned query and a full-table scan to quantify the cost difference
- Use CTAS (CREATE TABLE AS SELECT) to convert CSV logs to Parquet with Snappy compression for further savings
- Apply Athena's $5 per TB pricing model to calculate real cost differences between query strategies

## Steps

1. Create an S3 bucket and upload sample CSV access log files following the key prefix structure `logs/year=2024/month=01/day=01/access.csv` for at least two months of data
2. In the Athena console, run `CREATE DATABASE webanalytics` and set it as the active database
3. Run a CREATE EXTERNAL TABLE statement for `access_logs` with columns matching the CSV schema, set `LOCATION` to `s3://bucket/logs/`, and enable partition projection with year range 2023-2024 and month range 01-12
4. Run `SELECT count(*) FROM access_logs WHERE year='2024' AND month='01'` and note the "Data scanned" value shown after the query completes
5. Run `SELECT count(*) FROM access_logs` without any WHERE clause and note the "Data scanned" value; calculate the ratio compared to Step 4
6. Run a CTAS query to create a Parquet version: `CREATE TABLE access_logs_parquet WITH (format='PARQUET', parquet_compression='SNAPPY', external_location='s3://bucket/parquet/') AS SELECT * FROM access_logs`
7. Re-run the same filtered query (`WHERE year='2024' AND month='01'`) against `access_logs_parquet` and compare bytes scanned to the CSV result from Step 4
8. Calculate the cost of each query using the $5 per TB rate: (bytes_scanned / 1,099,511,627,776) * 5 and record all three costs in a comparison table

## Archon Canvas Lab

Open the Archon canvas to complete this lab. Use the component palette on the left to drag services onto the canvas, connect them, and configure their properties.
