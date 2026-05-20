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

## What's Next

Next up: the Module 21 Canvas Lab — design a data lake and analytics pipeline.