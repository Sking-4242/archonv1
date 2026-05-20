---
title: "AWS Glue: Managed ETL and Data Integration"
type: content
estimated_minutes: 10
cert_tags: ["SAA-C03", "SAP-C02"]
---

# AWS Glue: Managed ETL and Data Integration

## Overview

AWS Glue is a serverless data integration service — it provides ETL (Extract, Transform, Load) job execution, the Data Catalog, Glue Crawlers, and Glue DataBrew for visual data preparation. This lesson covers Glue ETL jobs and when to use Glue vs. other transformation options.

## Glue ETL Jobs

Glue ETL jobs run Apache Spark or Python Shell scripts on fully managed compute (no cluster to provision). Glue generates Spark ETL code from visual job designer or you write it manually. Jobs read from S3, RDS, Redshift, DynamoDB, JDBC sources; write to S3, Redshift, JDBC. DynamicFrames extend Spark DataFrames with schema flexibility — useful when source data has inconsistent or nested schemas. For simple transformations, Glue Studio's visual interface avoids writing Spark code.

## Glue Triggers and Workflows

Glue Workflows orchestrate multiple crawlers and jobs with dependencies. Trigger types: On-Demand (manual), Scheduled (cron), Conditional (trigger when a previous job succeeds). Example workflow: Crawl landing zone → Raw-to-Curated ETL job → Curate-to-Presentation Aggregation job → notify via EventBridge. Glue Workflows visualize the dependency graph and track run history.

## Glue DataBrew

DataBrew is a visual data preparation tool — 250+ pre-built transformations accessible via point-and-click interface: filter, join, pivot, normalize dates, mask PII, handle nulls. Non-engineer users (data analysts, business analysts) can clean and transform data without writing code. DataBrew profiles datasets (statistics, value distributions, missing data percentages) to guide data quality decisions. Outputs to S3 in CSV or Parquet.

## Glue vs. Lambda vs. EMR for ETL

Glue Spark: best for large-scale data transformation (GBs to TBs). Fully managed, no infrastructure. Lambda: best for lightweight transformation of small payloads (< 15 minutes, single record or small batch). EMR: best for custom Spark/Hadoop workloads needing full cluster control, specialized libraries, or long-running persistent clusters. Choose Glue for standard ETL; choose Lambda for event-driven micro-transforms; choose EMR for specialized or cost-optimized large-scale compute.

## Summary

Glue provides managed Spark ETL with auto-generated code, visual job design (Glue Studio), and visual data prep (DataBrew). Glue Workflows orchestrate multi-step pipelines. For standard ETL at scale, Glue is the default. Use Lambda for micro-transforms; EMR for custom high-performance compute. Glue integrates with the Glue Catalog — all analytics services share the same metadata layer.

## What's Next

Next up: Amazon Athena — serverless SQL over S3 data.