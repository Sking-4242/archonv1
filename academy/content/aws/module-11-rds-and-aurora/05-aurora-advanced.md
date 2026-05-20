---
title: "Aurora Advanced: Global Database, Parallel Query, and ML"
type: content
estimated_minutes: 10
cert_tags: ["SAA-C03", "SAP-C02"]
---

# Aurora Advanced: Global Database, Parallel Query, and ML

## Overview

Beyond the core cluster architecture, Aurora provides advanced features that solve specific problems: Global Database for cross-region replication and DR, Parallel Query for in-place analytics, and native ML integrations. This lesson covers when and why to use each.

## Aurora Global Database

Aurora Global Database replicates an entire Aurora cluster to up to 5 secondary regions with typically under 1 second replication lag. It uses dedicated replication infrastructure (not binary logs) that avoids impacting primary region performance. In a regional outage, you can promote a secondary region to primary in under 1 minute — the RTO target. Secondary regions serve reads at local latency. Use Global Database for globally distributed applications and cross-region DR.

## Aurora Parallel Query

Parallel Query pushes query processing down to the Aurora storage layer — thousands of storage nodes execute filter and aggregation in parallel before returning results to the compute instance. This allows analytics queries to run much faster without affecting OLTP throughput on the compute tier. Available on Aurora MySQL. Enable on specific queries with a hint or globally via parameter group.

## Aurora Machine Learning

Aurora integrates natively with SageMaker and Amazon Comprehend via SQL functions. You can call `aws_sagemaker.invoke_endpoint()` directly in SQL to call a deployed ML model for predictions, or `aws_comprehend.detect_sentiment()` to run NLP on text stored in the database. This lets you add ML predictions to existing SQL workflows without ETL pipelines.

## Aurora Backtrack

Aurora MySQL supports Backtrack — rewinding the database to a specific point in time without restoring from a snapshot. Instead of creating a new instance, the current cluster is rolled back in place within the backtrack window (1–72 hours). Useful for quick recovery from accidental DML without the downtime of a full snapshot restore.

## Summary

Aurora Global Database delivers cross-region HA with sub-1-second replication and under-1-minute promotion RPO/RTO. Parallel Query enables in-database analytics without ETL. Backtrack provides fast in-place recovery without creating a new instance. These features make Aurora the most complete managed relational option on AWS.

## What's Next

Next up: RDS Proxy — connection pooling and IAM database authentication.