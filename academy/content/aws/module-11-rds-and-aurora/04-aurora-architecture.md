---
title: "Amazon Aurora Architecture"
type: content
estimated_minutes: 12
cert_tags: ["SAA-C03", "SAP-C02"]
---

# Amazon Aurora Architecture

## Overview

Amazon Aurora is a MySQL and PostgreSQL-compatible relational database built for the cloud. Its distributed storage architecture delivers up to 5x the throughput of MySQL and 3x that of PostgreSQL at a fraction of the cost of commercial databases. Aurora is not just managed MySQL/PostgreSQL — it has a fundamentally different storage layer.

## Aurora Storage Architecture

Aurora separates compute from storage. The storage layer is a distributed, fault-tolerant, self-healing SSD cluster that spans 3 AZs with 6 copies of data (2 copies per AZ). Write quorum requires 4/6 copies; read quorum requires 3/6. This means Aurora can tolerate losing 2 AZs and still serve reads, and losing 1 AZ and still serve writes. Storage scales automatically in 10 GB increments up to 128 TB.

## Aurora Cluster Endpoints

An Aurora cluster has multiple endpoints: Cluster Endpoint (the writer, routes to the primary instance), Reader Endpoint (load-balances across all read replicas), Custom Endpoints (route to a subset of instances — e.g., high-memory instances for analytics), and Instance Endpoints (direct connection to a specific instance — avoid for production). Use the cluster endpoint for writes and reader endpoint for reads.

## Aurora Replicas

Aurora supports up to 15 read replicas with sub-10ms replication lag (they share the same storage layer — there's no data copying). Any replica can be promoted to primary in under 30 seconds on failure. Aurora Global Database extends this cross-region with a dedicated replication infrastructure achieving under 1 second replication lag globally.

## Aurora Serverless v2

Aurora Serverless v2 scales compute capacity automatically in fine-grained units (Aurora Capacity Units, ACUs) from a minimum to a maximum you set. It scales up in seconds in response to load and scales down to near-zero when idle. Each ACU is approximately 2 GB RAM plus CPU. Use Serverless v2 for variable or unpredictable workloads, dev/test, and multi-tenant SaaS applications with per-database idle periods.

## Aurora vs. RDS

Aurora costs more per ACU than RDS instance-hours but typically delivers better total cost at scale because it eliminates provisioned IOPS costs, replicas share storage (no replication storage cost), and its performance means you need fewer or smaller instances. For new cloud-native applications, Aurora PostgreSQL-compatible is typically the first choice over plain RDS PostgreSQL.

## Summary

Aurora's shared distributed storage (6 copies across 3 AZs) gives it native HA without the overhead of binary log replication. 15 read replicas with sub-10ms lag, fast failover, and automatic storage scaling make it the premier relational database on AWS. Serverless v2 adds elastic compute for variable workloads.

## What's Next

Next up: Aurora Advanced Features — Global Database, Parallel Query, and Machine Learning integrations.