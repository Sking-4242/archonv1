---
title: "Canvas Lab: Data Lake and Analytics Pipeline"
type: canvas
estimated_minutes: 30
cert_tags: ["SAA-C03", "SAP-C02"]
canvas_type: open
---

# Canvas Lab: Data Lake and Analytics Pipeline

## Challenge

Design a complete analytics data pipeline for a SaaS company. Raw application events arrive via Kinesis Firehose and land in an S3 raw zone. Design the pipeline to: transform raw JSON events to Parquet format in a curated zone, make the data queryable via Athena, load a daily aggregate into Redshift for BI dashboards (QuickSight), and send a Slack alert (via SNS) if the daily pipeline fails.

## Learning Objectives

- Design the S3 bucket zone structure (raw, curated, presentation)
- Use Glue ETL for the JSON-to-Parquet transformation with partitioning
- Enable Athena queries on the curated data via the Glue Data Catalog
- Load daily aggregates into Redshift via a Glue job or COPY command
- Orchestrate the pipeline with reliable error handling and notifications

## Steps

1. Create three S3 prefixes: s3://data-lake/raw/, s3://data-lake/curated/, s3://data-lake/presentation/
2. Add Kinesis Firehose delivery stream with S3 destination: raw/ prefix, 5-minute buffer, no transformation
3. Create a Glue Data Catalog database; add a Glue Crawler on raw/ to detect JSON schema
4. Create a Glue ETL Job: read from raw table, repartition by year/month/day, convert to Parquet, write to curated/
5. Add a second Glue Crawler on curated/ to catalog the Parquet data
6. Create an Athena Workgroup with the curated S3 location as query results bucket
7. Create a Glue ETL job for daily aggregation: read from curated table, aggregate by day, write to Redshift via JDBC
8. Orchestrate with Step Functions: Trigger (scheduled EventBridge rule, daily 6am) → Run Crawler → Run ETL Job → Run Redshift Load → On success: update QuickSight dataset; On failure: SNS alert → Lambda → Slack webhook
9. Add QuickSight dataset connected to Redshift with daily refresh
10. Annotate estimated latency: events land in raw within 5 minutes; curated ready within 1 hour; Redshift updated by 7am; QuickSight dashboard fresh by 7:15am

## Archon Canvas Lab

Open the Archon canvas to complete this lab. Use the component palette on the left to drag services onto the canvas, connect them, and configure their properties.