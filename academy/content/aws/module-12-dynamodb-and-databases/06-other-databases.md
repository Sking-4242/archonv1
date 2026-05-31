---
title: "AWS Specialized Databases: Redshift, Neptune, and More"
type: content
estimated_minutes: 8
cert_tags: ["SAA-C03", "CLF-C02"]
---

# AWS Specialized Databases: Redshift, Neptune, and More

## Overview

AWS offers purpose-built databases for specific workloads: data warehousing, graph, time-series, ledger, and document. This lesson surveys the major specialized databases, their key characteristics, and when to reach for each.

## Amazon Redshift

Redshift is a cloud data warehouse — a columnar, MPP (massively parallel processing) database designed for analytics on petabytes of structured data. Uses columnar storage for high compression and fast aggregation scans. Redshift Spectrum extends queries to S3-based data lakes without loading data into Redshift. Redshift Serverless auto-scales capacity for variable analytics workloads. Use Redshift for BI tools, historical analytics, and complex SQL on large datasets — not for OLTP.

## Amazon Neptune

Neptune is a fully managed graph database supporting both Property Graph (Gremlin, openCypher queries) and RDF/SPARQL for semantic data. Graph databases excel when relationships between entities are the primary query concern: social networks (friends of friends), fraud detection (transaction rings), recommendation engines (bought-together graphs), and knowledge graphs. Neptune replicates across 3 AZs with up to 15 read replicas, similar to Aurora.

## Amazon Timestream

Timestream is a serverless time-series database designed for IoT sensor data, application metrics, and operational data. It has built-in time-series functions (interpolation, smoothing, approximation), automatic tiering of recent data to memory and historical data to magnetic store, and SQL-compatible query syntax. Much more cost-effective than storing time-series data in RDS or DynamoDB at IoT scale.

## Amazon QLDB and DocumentDB

QLDB (Quantum Ledger Database) is a purpose-built immutable ledger — every change to data is cryptographically verified and appended to a permanent journal. Use for financial systems, supply chain, and any use case needing an auditable history of all changes. DocumentDB is MongoDB-compatible document storage — managed, replicated across 3 AZs. Use if your application uses the MongoDB driver and you don't want to manage MongoDB yourself.

## Summary

AWS's purpose-built databases: Redshift for data warehouse analytics, Neptune for graph relationships, Timestream for time-series IoT/metrics, QLDB for immutable audit ledgers, DocumentDB for MongoDB compatibility. Match the database to the data model — using RDS for everything is a common anti-pattern. Exam tip: questions about 'which database for X workload' almost always have a specific purpose-built answer.

## Examples

A retail chain runs nightly business intelligence reports to calculate weekly sales trends, top-performing products, and regional revenue breakdowns across three years of transaction history. They loaded their historical order data into Amazon Redshift and connected Tableau to it. Queries that would take hours on their operational RDS MySQL instance finish in seconds on Redshift because columnar storage allows Redshift to read only the `amount` and `category` columns when aggregating revenue — skipping the 40+ other columns in each row. This is why data warehouses use columnar storage for analytics: aggregation reads a fraction of the total data.

A cybersecurity company built a fraud detection system that needed to identify transaction rings — where money flows through multiple seemingly-unrelated accounts to obscure its origin. They modeled accounts as graph nodes and transfers as edges in Amazon Neptune. A Gremlin traversal query could follow chains of transfers 5 hops deep in milliseconds, a query that would require multiple self-joins on a relational database and become exponentially slower as depth increased. Graph databases shine precisely when the relationships between entities are the primary subject of queries.

A pharmaceutical company needed a regulatory-grade record of every change ever made to clinical trial data — who changed what, when, and in what sequence — with cryptographic proof that the history had not been tampered with. They used Amazon QLDB for this audit journal. QLDB's immutable ledger and built-in cryptographic verification gave them a court-admissible record without building a custom blockchain or maintaining append-only triggers on an RDS instance. QLDB's value is the combination of immutability and verifiability, not just append-only storage.

## Think About It

1. Redshift is designed for analytics (OLAP) and not for transactional operations (OLTP). What specific characteristics of columnar storage and MPP make them unsuitable for high-volume individual row inserts and updates?
2. If you already have an RDS PostgreSQL database with a large dataset, why might you NOT just run your analytics queries directly on RDS instead of loading data into Redshift? What happens to your OLTP application when analytics queries run?
3. A product manager asks why the company needs both DynamoDB and DocumentDB if both store JSON-like documents. How would you explain when you'd choose each one?
4. Timestream automatically tiers recent data to memory and older data to magnetic storage. What assumptions does this make about access patterns in time-series data? Can you think of a time-series use case where this tiering strategy would not work well?
5. QLDB provides an immutable, cryptographically verified audit ledger. What are the trade-offs of choosing QLDB versus building audit logging yourself by appending records to a table in RDS and never deleting them?

## Quick Check

**Q1.** Which AWS database service is purpose-built for petabyte-scale SQL analytics and is not suitable for high-volume transactional OLTP workloads?
- A) Amazon Aurora
- B) Amazon DynamoDB
- C) Amazon Redshift
- D) Amazon RDS

**Answer: C** — Amazon Redshift is a columnar MPP data warehouse designed for large-scale analytical queries (OLAP); its architecture is optimized for scans and aggregations, not individual row transactions.

**Q2.** A startup is building a recommendation engine that needs to find "users who bought this also bought" relationships across millions of purchase records. Which AWS database is best suited for this?
- A) Amazon Redshift
- B) Amazon Neptune
- C) Amazon Timestream
- D) Amazon QLDB

**Answer: B** — Amazon Neptune is a graph database that efficiently traverses relationships between entities (products, users, purchases), which is the core operation in collaborative filtering recommendation engines.

**Q3.** What makes Amazon QLDB different from simply storing audit records in an append-only RDS table?
- A) QLDB stores data in columnar format for faster historical queries
- B) QLDB is serverless and scales automatically; RDS does not
- C) QLDB provides cryptographic verification of the entire change history, making tampering detectable
- D) QLDB automatically replicates across all AWS regions

**Answer: C** — QLDB maintains a cryptographically chained journal where every change is hashed and linked to the previous entry, so any attempt to alter historical records produces a detectable hash mismatch — a guarantee append-only RDS tables cannot provide.

## What's Next

Next up: the Module 12 Canvas Lab — designing a DynamoDB table for a real-world access pattern.