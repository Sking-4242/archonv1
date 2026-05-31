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

## Examples

A national logistics company needed to join shipment records from an Oracle database with customer data from a Salesforce export sitting in S3. Rather than writing custom Spark code, their data engineer used Glue Studio's visual job designer to build the join, apply date normalization, and write the output to S3 as Parquet in under an hour. This demonstrates Glue's value for standard ETL: the managed Spark environment handled all cluster provisioning, and the visual interface replaced hundreds of lines of boilerplate code.

A digital media company ran a Glue Workflow each morning: a Crawler first scanned overnight S3 uploads to detect new partitions, then a conditional trigger fired an ETL job only if the Crawler succeeded, and a final aggregation job prepared daily KPI summaries for the BI team. When the ETL job failed one morning due to a malformed file, the Workflow's dependency graph stopped the aggregation from running on bad data and sent an EventBridge alert within seconds. This is orchestration with safety gates — a pattern Glue Workflows enable natively.

A healthcare analytics startup had business analysts who needed to clean incoming CSV exports from insurance providers — removing duplicates, standardizing date formats, and masking patient ID fields — without writing a single line of Python. They used Glue DataBrew's point-and-click interface to build a reusable recipe, which ran on a schedule and delivered clean Parquet files to the curated zone. This shows how DataBrew extends data preparation ownership beyond engineering teams to people who understand the data domain.

## Think About It

1. Why would you choose a Glue Spark job over a Lambda function for a transformation that runs every hour on 50 GB of data, even though Lambda is simpler to deploy?
2. What would happen if a Glue Workflow's conditional trigger was set to fire on job completion rather than job success — how might that affect data quality downstream?
3. How would you decide whether to use Glue DataBrew or Glue Studio for a new data preparation task, and what questions would you ask to make that call?
4. What trade-offs exist between auto-generated Glue ETL code and manually written Spark scripts in terms of performance, maintainability, and flexibility?
5. If you needed to transform data that arrived with highly inconsistent schemas (sometimes 10 columns, sometimes 15, with different column names), why would Glue DynamicFrames be preferable to standard Spark DataFrames?

## Quick Check

**Q1.** What execution environment does AWS Glue ETL use under the hood?
- A) AWS Lambda functions running in parallel
- B) Managed Apache Spark clusters
- C) Amazon ECS containers with custom Docker images
- D) EC2 instances running user-managed Hadoop

**Answer: B** — Glue ETL jobs run on managed Apache Spark, abstracting away cluster provisioning while giving access to Spark's distributed processing capabilities.

**Q2.** Which Glue trigger type starts a job only after a previous job in the same Workflow completes successfully?
- A) Scheduled
- B) On-Demand
- C) Conditional
- D) EventBridge

**Answer: C** — Conditional triggers evaluate the state of upstream jobs or crawlers and fire only when specified conditions (such as job success) are met.

**Q3.** Which Glue feature is best suited for a non-technical business analyst who needs to clean and reshape a dataset without writing code?
- A) Glue ETL with PySpark scripts
- B) Glue Crawlers
- C) Glue DataBrew
- D) Glue Workflows

**Answer: C** — Glue DataBrew provides a visual, point-and-click interface with over 250 pre-built transformations, designed for users who are not software engineers.

## What's Next

Next up: Amazon Athena — serverless SQL over S3 data.