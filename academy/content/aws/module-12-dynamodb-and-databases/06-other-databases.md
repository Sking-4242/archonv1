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

## What's Next

Next up: the Module 12 Canvas Lab — designing a DynamoDB table for a real-world access pattern.