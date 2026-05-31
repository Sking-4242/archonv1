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

## Examples

A global e-commerce company with customers in the US, Europe, and Asia-Pacific deploys Aurora Global Database with a primary cluster in us-east-1 and secondary read-only clusters in eu-west-1 and ap-southeast-1. European users query the EU cluster for product catalog lookups at under 10ms latency instead of crossing the Atlantic. When a regional AWS outage affects us-east-1, the ops team promotes the eu-west-1 secondary to primary in under 1 minute, meeting the company's contractual RTO. This is the canonical Aurora Global Database use case: low-latency global reads with cross-region DR in a single feature.

A data science team at a retail company wants to run weekly inventory trend analysis directly on the production Aurora MySQL database without spinning up a separate analytics cluster or ETL pipeline. They enable Parallel Query on the Aurora cluster. Analytical queries that previously took 8 minutes now complete in 45 seconds because thousands of storage nodes execute filter and aggregation in parallel before sending results to the compute layer. OLTP query latency is unaffected because the heavy lifting happens in the storage tier. This shows Parallel Query's appeal: analytics performance gains without infrastructure proliferation.

A product team building a customer support tool wants to add real-time sentiment analysis to support tickets stored in Aurora PostgreSQL. Instead of building a separate NLP microservice with an API call on each new ticket, a developer adds a database trigger that calls `aws_comprehend.detect_sentiment()` directly in SQL whenever a row is inserted. The sentiment score is written back to the same row immediately. This is a more advanced use of Aurora ML integration that trades off tight coupling to AWS services for operational simplicity.

## Think About It

1. Aurora Global Database promises under 1 second replication lag and under 1 minute RTO for regional promotion. What is the difference between RPO and RTO, and why does the replication lag matter specifically for RPO?
2. Parallel Query pushes computation to the storage layer. What types of queries benefit most from this architecture, and what types of queries would see little or no improvement?
3. Aurora Backtrack rewinds the live cluster in place rather than restoring to a new instance. What are the operational advantages of Backtrack over PITR snapshot restore — and what are the risks of using it in a production environment?
4. Aurora ML lets you call SageMaker endpoints from SQL. What architectural trade-offs does this introduce compared to a separate application-layer ML service that reads from the database?
5. If you needed to decide between Aurora Global Database and a Cross-Region Read Replica of standard RDS, what factors would drive you toward the Aurora option despite its higher cost?

## Quick Check

**Q1.** What is the typical replication lag for Aurora Global Database secondary regions?
- A) Under 100 milliseconds
- B) Under 1 second
- C) 1–5 seconds
- D) Up to 30 seconds

**Answer: B** — Aurora Global Database uses a dedicated replication infrastructure that achieves under 1 second replication lag to secondary regions, enabling near-real-time global reads.

**Q2.** Aurora Backtrack is available on which Aurora engine?
- A) Aurora PostgreSQL only
- B) Aurora MySQL only
- C) Both Aurora MySQL and Aurora PostgreSQL
- D) All RDS and Aurora engines

**Answer: B** — Backtrack is an Aurora MySQL-specific feature; Aurora PostgreSQL uses standard PITR snapshot restore for point-in-time recovery.

**Q3.** What is the primary benefit of Aurora Parallel Query over running the same analytical query on a standard Aurora cluster?
- A) It uses larger compute instances automatically
- B) It caches query results in ElastiCache
- C) It pushes filter and aggregation processing down to the distributed storage layer for parallel execution
- D) It creates a temporary read replica dedicated to the query

**Answer: C** — Parallel Query offloads computation to thousands of storage nodes in the Aurora storage layer, dramatically speeding up analytical queries without adding compute capacity or impacting OLTP performance.

## What's Next

Next up: RDS Proxy — connection pooling and IAM database authentication.