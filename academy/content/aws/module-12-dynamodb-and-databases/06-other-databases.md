---
title: "AWS Specialized Databases: Redshift, Neptune, QLDB, and More"
type: content
estimated_minutes: 20
cert_tags: ["SAA-C03", "SAP-C02", "CLF-C02", "DEA-C01"]
---

# AWS Specialized Databases: Redshift, Neptune, QLDB, and More

## Overview

AWS offers a purpose-built database for nearly every data model and workload pattern. The guiding principle is that no single database engine is optimal for all workloads: columnar storage compresses and aggregates analytical data more efficiently than row storage; graph traversal algorithms operate natively on relationship data in a way that relational self-joins cannot match at depth; an append-only cryptographic ledger provides tamper-evident audit trails that no general-purpose database can replicate with triggers alone. Choosing the wrong engine for a workload wastes money, produces worse performance, and often requires more application code to compensate for the impedance mismatch between the data model and the engine.

This lesson surveys the major purpose-built AWS database services: Redshift for columnar OLAP analytics, Neptune for graph workloads, QLDB for immutable ledger audit trails, DocumentDB for MongoDB-compatible document storage, Amazon Keyspaces for Cassandra-compatible wide-column workloads, Timestream for time-series data, and Amazon OpenSearch Service for full-text search and log analytics. For each service, the focus is on what the engine actually does differently, why that matters for specific workloads, and how to recognize the right use case on an exam scenario question.

The selection framework is the most testable concept in this lesson. AWS exam questions on specialized databases almost always take the form of a scenario description — "a company needs to store financial audit records with cryptographic verification" or "a startup is building a recommendation engine based on customer purchase relationships" — and you must identify the correct service. The pattern recognition comes from understanding what makes each engine fundamentally different, not from memorizing a list of service names. By the end of this lesson, given any data workload description, you should be able to map it to the correct AWS database service and explain why the alternatives are wrong.

## Core Concepts

### Amazon Redshift: Columnar OLAP Data Warehouse

Redshift is a massively parallel processing (MPP) columnar database designed for analytical queries over large datasets. Understanding why columnar storage matters for analytics makes Redshift's use case obvious.

In a row-oriented database (RDS, Aurora), each row's data is stored contiguously on disk: `[id, name, email, amount, status, created_at, ...]`. An analytics query like `SELECT SUM(amount), category FROM orders GROUP BY category` must read every column of every row to find just `amount` and `category`. For a table with 50 columns and 500 million rows, that is a massive amount of I/O spent reading columns the query never uses.

In a columnar store, each column is stored contiguously: all `amount` values together, all `category` values together. The same analytics query reads only two columns from disk — 2/50 of the total data. Columnar storage also compresses extremely well because similar values are adjacent (all prices, all dates), enabling dictionary encoding and run-length encoding that can compress data 4–10×. The combination of reduced I/O and high compression makes Redshift dramatically faster than RDS for analytics at scale.

Redshift architecture:
- **Leader node**: receives SQL queries, builds execution plans, distributes work to compute nodes.
- **Compute nodes**: execute the parallel query slices, each holding a portion of the table data.
- **RA3 nodes**: separate compute from storage — compute nodes cache hot data locally, cold data lives in S3-backed managed storage. Scale compute and storage independently.
- **Redshift Serverless**: automatically scales compute capacity for variable analytics workloads; pay only for capacity used during query execution.
- **Redshift Spectrum**: query data directly in S3 (Parquet, ORC, CSV, JSON) without loading it into Redshift. Extends the data warehouse to the full data lake. Useful for querying historical data that is too old or too large to store in Redshift managed storage cost-effectively.

```bash
# Create a Redshift Serverless namespace and workgroup (no cluster management)
aws redshift-serverless create-namespace \
  --namespace-name analytics-ns \
  --admin-username admin \
  --admin-user-password "Str0ng!Password" \
  --db-name analytics \
  --region us-east-1

aws redshift-serverless create-workgroup \
  --workgroup-name analytics-wg \
  --namespace-name analytics-ns \
  --base-capacity 32 \          # 32 Redshift Processing Units (RPUs) as starting point
  --publicly-accessible false \
  --subnet-ids subnet-abc123 subnet-def456 \
  --security-group-ids sg-0abc123def456789 \
  --region us-east-1

# Create a provisioned RA3 cluster (when consistent workload justifies reserved pricing)
aws redshift create-cluster \
  --cluster-identifier prod-analytics \
  --node-type ra3.4xlarge \
  --number-of-nodes 4 \
  --master-username admin \
  --master-user-password "Str0ng!Password" \
  --db-name analytics \
  --cluster-subnet-group-name my-redshift-subnet-group \
  --vpc-security-group-ids sg-0abc123def456789 \
  --encrypted \
  --region us-east-1

# Query S3 data lake via Redshift Spectrum (without loading into Redshift)
# Requires an external schema pointing to a Glue Data Catalog database
# Run in Redshift query editor:
# CREATE EXTERNAL SCHEMA spectrum_schema
#   FROM DATA CATALOG
#   DATABASE 'sales_data_lake'
#   IAM_ROLE 'arn:aws:iam::123456789012:role/RedshiftSpectrumRole'
#   CREATE EXTERNAL DATABASE IF NOT EXISTS;
#
# SELECT date_trunc('month', order_date), SUM(amount)
# FROM spectrum_schema.historical_orders        -- data sits in S3, not Redshift
# WHERE order_date >= '2020-01-01'
# GROUP BY 1
# ORDER BY 1;
```

### Amazon Neptune: Graph Database

Neptune is a fully managed graph database that supports two graph models and query languages:
- **Property Graph** with **Apache TinkerPop Gremlin** or **openCypher**: nodes have labels and properties; edges have types, direction, and properties. Used for most operational graph use cases.
- **RDF (Resource Description Framework)** with **SPARQL**: triples of subject-predicate-object for semantic web and knowledge graph use cases.

Graph databases excel when the primary query is about relationships, not attribute values. In a relational database, finding all friends-of-friends of a user requires a self-join on the friends table for each hop depth. At depth 2, that is one join. At depth 5, that is five joins on a potentially large table — the query time grows exponentially with depth. A graph database stores relationships as first-class data (edges), and graph traversal algorithms follow edges in O(1) per hop — the query time for a 5-hop traversal is proportional to the number of paths found, not the total number of relationships in the graph.

Use Neptune for:
- **Social networks**: who follows whom, mutual connections, influencer reach
- **Fraud detection**: transaction rings, money laundering chains, synthetic identity networks
- **Recommendation engines**: "customers who bought X also bought Y" — collaborative filtering as a graph traversal
- **Knowledge graphs**: entity relationships, ontologies, linked data
- **Network and IT operations**: infrastructure dependency mapping, blast radius analysis

Neptune replicates storage across 3 AZs automatically (like Aurora), supports up to 15 read replicas, and provides point-in-time recovery. Neptune Analytics is a separate in-memory graph analytics engine for bulk graph algorithm workloads (PageRank, community detection) on snapshots of Neptune data.

```bash
# Create a Neptune cluster
aws neptune create-db-cluster \
  --db-cluster-identifier fraud-graph \
  --engine neptune \
  --engine-version 1.3.0.0 \
  --db-subnet-group-name my-neptune-subnet-group \
  --vpc-security-group-ids sg-0abc123def456789 \
  --storage-encrypted \
  --backup-retention-period 7 \
  --region us-east-1

# Add a writer instance to the cluster
aws neptune create-db-instance \
  --db-instance-identifier fraud-graph-writer \
  --db-cluster-identifier fraud-graph \
  --db-instance-class db.r6g.large \
  --engine neptune \
  --region us-east-1

# Neptune does not expose a traditional SQL endpoint.
# Connect via the Gremlin WebSocket endpoint:
# wss://fraud-graph.cluster-abc123.us-east-1.neptune.amazonaws.com:8182/gremlin
#
# Example Gremlin traversal — find all accounts reachable from account 'acct-001'
# within 3 hops via TRANSFER edges (fraud ring detection):
# g.V('acct-001')
#  .repeat(out('TRANSFER').simplePath()).times(3)
#  .path()
#  .by('accountId')
```

### Amazon QLDB: Quantum Ledger Database

QLDB is a purpose-built immutable ledger database. Two properties distinguish it from a standard append-only table:

1. **Immutability**: Once a document revision is written, it cannot be updated or deleted from the journal. You can update a document (creating a new revision), but the previous revision remains permanently accessible in the history. There is no `DELETE` in the sense of removing a historical record.

2. **Cryptographic verification**: QLDB maintains a SHA-256 hash chain over the journal. Each block's hash includes the hash of the previous block, similar to a blockchain. At any time, you can request a cryptographic proof (a Merkle audit path) that a specific revision existed and has not been tampered with. If any record in the journal were altered after the fact, the hash chain would break and verification would fail.

This combination — immutability plus cryptographic verification — is what makes QLDB legally defensible for audit use cases. An append-only RDS table cannot provide cryptographic proof that a row was not altered or deleted by a DBA. QLDB can.

Use QLDB for:
- Financial transaction audit trails (every debit/credit, who authorized it, in sequence)
- Supply chain provenance (every custody transfer of goods, cryptographically linked)
- Clinical trial data integrity (regulatory-grade record that data was not altered)
- HR record history (immutable employment record changes)

QLDB is serverless — no cluster to provision. Storage scales automatically. You query it using PartiQL (SQL-compatible query language).

```bash
# Create a QLDB ledger
aws qldb create-ledger \
  --name financial-audit \
  --permissions-mode STANDARD \
  --no-deletion-protection \   # In production, set --deletion-protection
  --kms-key "arn:aws:kms:us-east-1:123456789012:key/mrk-abc123" \
  --region us-east-1

# Check ledger status — wait for ACTIVE
aws qldb describe-ledger \
  --name financial-audit \
  --query '{Status:State,Endpoint:Arn}' \
  --region us-east-1

# QLDB uses the QLDB Driver (not standard SQL client) to connect.
# PartiQL examples (run via QLDB driver or console):
#
# Create a table and index:
# CREATE TABLE Transactions
# CREATE INDEX ON Transactions (transactionId)
#
# Insert a transaction document:
# INSERT INTO Transactions VALUE {
#   'transactionId': 'txn-001',
#   'accountId': 'acct-456',
#   'amount': 500.00,
#   'type': 'DEBIT',
#   'authorizedBy': 'user-789',
#   'timestamp': `2024-06-01T10:30:00Z`
# }
#
# Query full revision history of a document (QLDB built-in):
# SELECT * FROM history(Transactions)
# WHERE metadata.id = 'document-id-here'
# ORDER BY metadata.version
#
# Request a cryptographic proof digest (verifiable via SDK):
# aws qldb get-digest --name financial-audit --region us-east-1
```

### Amazon DocumentDB: MongoDB-Compatible Document Database

DocumentDB is a MongoDB-compatible managed document database. It implements enough of the MongoDB 3.6, 4.0, and 5.0 wire protocol that applications using the MongoDB driver can connect to DocumentDB with minimal or no code changes. AWS manages the underlying cluster, storage replication, backups, patching, and failover.

DocumentDB uses an Aurora-like storage architecture: the storage layer is a distributed, fault-tolerant volume that replicates 6 copies of data across 3 AZs, decoupled from the compute instances. The cluster has one primary instance and up to 15 read replicas. Failover to a read replica takes approximately 30 seconds.

Use DocumentDB when:
- Your existing application uses the MongoDB driver and you want to avoid managing MongoDB clusters on EC2.
- You need document storage (flexible JSON schema, nested objects, arrays) with MongoDB-compatible queries.
- You need managed HA and automated backups without DBA overhead.

Do not confuse DocumentDB with DynamoDB. Both store JSON-like documents, but they are architecturally different: DynamoDB is a serverless key-value/document store with single-digit millisecond latency at any scale; DocumentDB is a MongoDB-compatible relational-style document database with richer query operators, indexes, and aggregation pipelines. DynamoDB requires access-pattern-first schema design; DocumentDB supports ad-hoc queries like MongoDB.

```bash
# Create a DocumentDB cluster
aws docdb create-db-cluster \
  --db-cluster-identifier prod-docdb \
  --engine docdb \
  --engine-version 5.0.0 \
  --master-username admin \
  --master-user-password "Str0ng!Password" \
  --db-subnet-group-name my-docdb-subnet-group \
  --vpc-security-group-ids sg-0abc123def456789 \
  --storage-encrypted \
  --region us-east-1

# Add a primary instance
aws docdb create-db-instance \
  --db-instance-identifier prod-docdb-primary \
  --db-cluster-identifier prod-docdb \
  --db-instance-class db.r6g.large \
  --engine docdb \
  --region us-east-1
```

### Amazon Timestream: Time-Series Database

Timestream is a serverless, purpose-built time-series database for IoT telemetry, application metrics, DevOps observability, and industrial sensor data. Its storage architecture is designed around the observation that time-series data has a predictable access pattern: recent data is queried frequently, and older data is queried rarely.

Timestream automatically tiers data between two stores:
- **Memory store**: recent data (configurable retention, e.g., last 24 hours). Fast writes, sub-millisecond queries.
- **Magnetic store**: historical data beyond the memory store retention. Lower cost, higher query latency. Magnetic store accepts backfill writes for late-arriving data.

Timestream's query language is SQL-compatible with built-in time-series functions: `time_series()`, `interpolate_linear()`, `bin()` for time bucketing, `CREATE_TIME_SERIES()`, and window functions for moving averages and anomaly detection. These operations would require complex application-layer code in RDS or DynamoDB.

```bash
# Create a Timestream database and table
aws timestream-write create-database \
  --database-name iot-metrics \
  --region us-east-1

aws timestream-write create-table \
  --database-name iot-metrics \
  --table-name sensor-readings \
  --retention-properties '{
      "MemoryStoreRetentionPeriodInHours": 24,
      "MagneticStoreRetentionPeriodInDays": 365
  }' \
  --magnetic-store-write-properties '{
      "EnableMagneticStoreWrites": true
  }' \
  --region us-east-1

# Write time-series records (SDK/CLI)
aws timestream-write write-records \
  --database-name iot-metrics \
  --table-name sensor-readings \
  --records '[
      {
          "Dimensions": [
              {"Name": "device_id", "Value": "sensor-001"},
              {"Name": "location",  "Value": "warehouse-a"}
          ],
          "MeasureName": "temperature",
          "MeasureValue": "23.4",
          "MeasureValueType": "DOUBLE",
          "Time": "1717243800000",
          "TimeUnit": "MILLISECONDS"
      }
  ]' \
  --region us-east-1
```

### Amazon OpenSearch Service and Amazon Keyspaces

**Amazon OpenSearch Service** (formerly Elasticsearch Service) is a managed deployment of OpenSearch (Apache 2.0 fork of Elasticsearch). Use it for full-text search, log analytics (as the search/analytics layer in a log pipeline), and real-time application search with complex relevance scoring, aggregations, and geospatial queries. OpenSearch is not a primary database — data is typically ingested from DynamoDB, RDS, or S3 via Change Data Capture or Kinesis, and OpenSearch provides the search index on top.

**Amazon Keyspaces (for Apache Cassandra)** is a serverless, Cassandra-compatible wide-column store. Use it when you have an existing Cassandra application and want to move off self-managed Cassandra clusters, or when you need a wide-column data model (sparse, column-family style schema) with Cassandra's CQL query language. Like DocumentDB's relationship to MongoDB, Keyspaces provides wire-protocol compatibility so existing CQL code works without modification.

## Configuration Reference

The following table summarizes key CLI commands for creating each major specialized database:

```bash
# Redshift Serverless
aws redshift-serverless create-namespace --namespace-name <name> --db-name <db>
aws redshift-serverless create-workgroup --workgroup-name <name> --namespace-name <name>

# Neptune (Graph)
aws neptune create-db-cluster --db-cluster-identifier <name> --engine neptune
aws neptune create-db-instance --db-instance-identifier <name> --db-cluster-identifier <name> --engine neptune

# QLDB (Ledger)
aws qldb create-ledger --name <name> --permissions-mode STANDARD

# DocumentDB (MongoDB-compatible)
aws docdb create-db-cluster --db-cluster-identifier <name> --engine docdb
aws docdb create-db-instance --db-instance-identifier <name> --db-cluster-identifier <name> --engine docdb

# Timestream (Time-series)
aws timestream-write create-database --database-name <name>
aws timestream-write create-table --database-name <name> --table-name <name> --retention-properties '{...}'

# Keyspaces (Cassandra-compatible)
aws keyspaces create-keyspace --keyspace-name <name>
aws keyspaces create-table --keyspace-name <name> --table-name <name> --schema-definition '{...}'
```

## How to Decide

Use this decision matrix to match a workload description to the correct AWS database service.

| Workload / Data Model | AWS Service | Key Differentiator |
|---|---|---|
| SQL analytics on petabytes of structured data, BI dashboards, data warehouse | Amazon Redshift | Columnar MPP; fast aggregation; connects to Tableau, Power BI, QuickSight |
| Query historical data in S3 without loading into Redshift | Redshift Spectrum | External tables over S3; pay-per-query for historical data lake |
| Variable analytics workload, no cluster management | Redshift Serverless | Auto-scales RPUs; pay per query execution time |
| Relationship traversal: social graph, fraud rings, recommendations | Amazon Neptune | Graph traversal in O(hops); Gremlin or SPARQL |
| Immutable audit trail with cryptographic verification | Amazon QLDB | SHA-256 hash chain; legally defensible; full revision history |
| MongoDB-compatible, managed, avoid self-managing clusters | Amazon DocumentDB | MongoDB driver compatibility; Aurora-like HA storage |
| Flexible JSON documents, ad-hoc queries, rich aggregation pipelines | Amazon DocumentDB | MongoDB-style aggregation framework |
| High-scale key-value or document, serverless, ms latency | Amazon DynamoDB | Not DocumentDB — DynamoDB is for pattern-driven access at massive scale |
| IoT sensor data, app metrics, time-series analytics | Amazon Timestream | Built-in time functions; automatic hot/cold tiering |
| Full-text search, log analytics, relevance scoring | Amazon OpenSearch Service | Inverted index; faceted search; Kibana dashboards |
| Apache Cassandra workload, CQL queries, wide-column | Amazon Keyspaces | Cassandra-compatible; serverless; no cluster management |
| Relational OLTP, complex SQL, transactions | Amazon Aurora / RDS | Row-oriented; ACID; foreign keys; joins |

**Shortcut pattern for exam scenarios:**
- "audit," "immutable," "cryptographic," "tamper-evident," "ledger" → **QLDB**
- "graph," "relationships," "fraud detection," "recommendation," "social network," "traversal" → **Neptune**
- "analytics," "data warehouse," "OLAP," "BI," "columnar," "petabyte" → **Redshift**
- "time series," "IoT," "sensor," "metrics," "telemetry" → **Timestream**
- "MongoDB," "document," "JSON," "managed MongoDB" → **DocumentDB**
- "Cassandra," "CQL," "wide-column," "column family" → **Keyspaces**
- "search," "full-text," "Elasticsearch," "log analytics" → **OpenSearch Service**

## How This Connects

- **Redshift and S3** form the foundation of the AWS data lake architecture — Redshift Spectrum bridges structured analytics in the warehouse with unstructured/semi-structured data in the lake, enabling a single SQL query to join Redshift managed tables with S3-stored Parquet files without ETL.
- **Neptune and DynamoDB** are often deployed together in the same application — DynamoDB handles the primary operational data store (user profiles, orders, transactions) while Neptune handles the relationship layer (who follows whom, which products are connected by purchase history) as a derived, eventually-consistent graph built from DynamoDB change events via DynamoDB Streams.
- **QLDB and RDS** serve different audit requirements — RDS with audit triggers can log changes, but those logs are mutable (a DBA can delete them). QLDB's cryptographic hash chain makes historical records tamper-evident, which is the difference between an internal audit log and a legally defensible one.
- **Timestream and IoT Core / Kinesis** form a common ingestion pipeline — IoT devices publish telemetry to AWS IoT Core, which routes messages to Kinesis Data Streams, which writes batches to Timestream via Kinesis Data Firehose or a Lambda consumer. The specialized ingestion path and Timestream's automatic hot/cold tiering handle IoT-scale write throughput that would overwhelm RDS.
- **OpenSearch Service and DynamoDB/RDS** are almost never deployed in isolation — OpenSearch receives change events from primary databases via DynamoDB Streams + Lambda or RDS + Debezium/DMS, maintaining a search index that enables full-text queries and faceted search on data that the primary database cannot efficiently search. The primary database remains the source of truth.

## Exam Traps

**"Redshift is suitable for OLTP workloads with high-volume single-row inserts."** False. Redshift's columnar MPP architecture is optimized for batch-loading large datasets and running analytical aggregations over them, not for individual row inserts/updates. High-frequency OLTP inserts generate small blocks that Redshift's storage format handles inefficiently. Use Aurora or RDS for OLTP; use Redshift for the analytical query layer fed by nightly ETL or near-real-time COPY commands from S3.

**"Amazon DocumentDB is the same as Amazon DynamoDB — both store JSON documents."** False. They are architecturally different services for different workloads. DocumentDB is MongoDB-compatible with rich query operators, aggregation pipelines, and ad-hoc queries. DynamoDB is a serverless key-value/document store that requires access-pattern-first schema design and does not support ad-hoc queries or multi-table joins. The names do not indicate similarity — one letter difference, completely different engines.

**"QLDB is appropriate for any use case requiring an audit log."** Overstated. QLDB adds cryptographic verification and immutability, which are valuable but come with constraints: no multi-table joins (it is a document store, not relational), PartiQL as the query language, and higher complexity than appending rows to an RDS audit table. For internal audit logging where cryptographic proof is not required, a simple append-only RDS table may be simpler and cheaper. QLDB is specifically for when you need to prove to an external party (regulator, auditor, court) that the history has not been tampered with.

**"Neptune supports SQL queries for graph traversal."** False. Neptune uses Gremlin (Apache TinkerPop), openCypher, or SPARQL — not SQL. Neptune does not have a SQL endpoint. Gremlin uses a fluent traversal API (`g.V().out('KNOWS').values('name')`), openCypher uses a pattern-matching syntax (`MATCH (a)-[:KNOWS]->(b) RETURN b.name`), and SPARQL uses triple pattern matching. If your team is SQL-only and does not want to learn a graph query language, Neptune is not the right tool.

**"Timestream is just DynamoDB with time-based queries."** False. Timestream is purpose-built for time-series at IoT scale with fundamentally different storage (automatic hot/cold tiering, columnar time-series blocks), built-in time-series SQL functions (interpolation, binning, rolling aggregations), and a write model optimized for append-only time-ordered records from many concurrent producers. DynamoDB requires you to model time-series access patterns manually (sort key as timestamp, GSI for range queries) and has no built-in time-series functions. For true IoT telemetry at scale, Timestream is the right tool.

## Summary

- Redshift is a columnar MPP data warehouse for OLAP analytics — never for OLTP; use Redshift Spectrum to query S3 data lakes without ETL, and Redshift Serverless for variable workloads without cluster management.
- Neptune is a fully managed graph database supporting Property Graph (Gremlin/openCypher) and RDF (SPARQL); its primary advantage is O(hops) traversal speed for relationship queries that would require exponentially growing joins in a relational database.
- QLDB is an immutable ledger with a cryptographic SHA-256 hash chain over all journal entries; use it when tamper-evidence and auditability must be provable to external parties, not just recorded internally.
- DocumentDB provides MongoDB wire-protocol compatibility with managed HA (Aurora-like 6-copy storage across 3 AZs) and up to 15 read replicas; use it to migrate self-managed MongoDB without rewriting application code.
- Timestream is a serverless time-series database with automatic hot/cold data tiering and built-in time-series SQL functions; it handles IoT-scale write throughput and time-range queries more efficiently than general-purpose databases.
- The exam selection framework maps keywords in scenario descriptions to services: "graph/fraud/recommendation" → Neptune, "ledger/immutable/cryptographic" → QLDB, "analytics/columnar/warehouse" → Redshift, "time-series/IoT/metrics" → Timestream, "MongoDB/document" → DocumentDB, "Cassandra/CQL" → Keyspaces, "full-text/search/logs" → OpenSearch.

## Examples

A large retail chain consolidates three years of point-of-sale transaction history from 800 stores into Amazon Redshift — approximately 4 billion rows across 60 columns. Their BI team runs weekly category margin analysis queries that, on the operational RDS MySQL instance, timed out after 20 minutes. On Redshift with RA3.4xlarge nodes, the same query completes in 18 seconds. The reason: the margin analysis query reads only `category`, `unit_cost`, `sale_price`, and `quantity` — four of sixty columns. Redshift reads only those four columns from disk, compressing each with dictionary encoding. The operational RDS MySQL instance read all 60 columns for every row. The data volume Redshift actually reads for the query is less than 7% of the total data volume MySQL reads for the equivalent query. Columnar storage is not faster because of faster hardware — it is faster because it reads less data.

A fintech startup built an account-to-account transfer system and needed to satisfy a financial regulator's requirement for an audit trail that proved no record had been altered after the fact. Their initial implementation used an RDS PostgreSQL table with an insert-only policy and a database trigger that logged every change. The regulator's auditor pointed out that a user with `pg_superuser` privileges could disable the trigger, modify records, and re-enable it — the audit log had no protection against a privileged insider. They migrated the transaction journal to Amazon QLDB. QLDB's cryptographic proof digest, computed as a SHA-256 hash chain over all journal blocks, cannot be altered without breaking the hash chain in a way that any verifier with the original digest can detect. The regulator accepted the QLDB-backed audit trail as tamper-evident evidence. No amount of IAM permissions grants the ability to rewrite a committed QLDB journal block.

An online streaming platform built a content recommendation system. Their original approach used a PostgreSQL query with five self-joins to find "users who watched movie A also watched movie B within 30 days, and B is in the same genre as C, and C has a rating above 4.0." The query took 4 seconds on a 50M-row watch history table and got slower as the table grew. They modeled the same data in Amazon Neptune: users as vertices, movies as vertices, WATCHED edges between them with a `watched_at` property. The equivalent Gremlin traversal followed WATCHED edges outward 2 hops, filtered by genre and rating vertex properties, and returned in under 80ms. As the watch history grew to 500M events, the traversal time did not change — Neptune's graph traversal follows edges, and the cost per traversal is proportional to the number of paths explored, not the total size of the graph.

## Think About It

1. Redshift uses columnar storage and is optimized for analytical queries. Your team proposes using Redshift as the primary operational database for a web application that performs 10,000 individual row inserts per second. What specific performance problems would you expect, and what would you recommend instead?
2. A product manager argues that since you already have DynamoDB for your application data, you do not need Neptune for recommendations — you can just write the recommendation logic in application code using multiple DynamoDB Queries. At what scale or depth of relationship traversal does this argument break down, and how would you quantify the tipping point?
3. QLDB's immutability means you cannot delete records, even records that turn out to be incorrect (e.g., a transaction entered with the wrong amount). How would a system built on QLDB handle a correction or reversal? How does this compare to how accounting systems handle corrections using journal entries?
4. Timestream automatically moves data older than the memory store retention period to magnetic storage. A late-arriving sensor message arrives 48 hours after it was generated (due to a connectivity outage on the device). Your memory store retention is 24 hours. Where does this record land, and what does Timestream require you to configure to accept it?
5. You are evaluating DocumentDB vs. self-managed MongoDB on EC2 for a migration. The MongoDB application uses change streams extensively for real-time data sync. What DocumentDB limitation or version compatibility issue would you investigate first, and how would you validate that your specific change stream usage pattern is supported?

## Quick Check

**Q1.** A company processes sensor data from 500,000 IoT devices generating one reading per second each. They need to run sliding-window average queries over the last 24 hours and retain historical data for 3 years at lower cost. Which AWS service is best suited?

- A) Amazon RDS MySQL with a partitioned time-series table
- B) Amazon DynamoDB with a sort key based on timestamp
- C) Amazon Timestream with memory store and magnetic store retention configured
- D) Amazon Redshift with a COPY command loading hourly batch files from S3

**Answer: C** — Timestream is purpose-built for IoT-scale time-series ingestion. Automatic hot/cold tiering stores recent data in the memory store (fast queries, higher cost) and moves older data to the magnetic store (slower queries, lower cost). Built-in window functions support sliding average queries natively. RDS and DynamoDB can store time-series data but lack native time-series functions and automatic tiering. Redshift is batch-oriented and would not efficiently handle 500K writes per second.

**Q2.** An auditor requires proof that a financial system's transaction records have not been modified since they were originally written. Which AWS service provides cryptographic verification of record immutability?

- A) Amazon RDS with audit logging enabled
- B) Amazon DynamoDB with Streams enabled
- C) Amazon QLDB
- D) Amazon S3 with Object Lock enabled in COMPLIANCE mode

**Answer: C** — QLDB maintains a cryptographic SHA-256 hash chain over all journal entries. Any modification to a historical record breaks the hash chain, which can be verified by any party holding the original digest. RDS audit logs and DynamoDB Streams record changes but provide no cryptographic proof against tampering by a privileged user. S3 Object Lock in COMPLIANCE mode prevents deletion but does not provide a transaction-level audit journal with per-record cryptographic verification.

**Q3.** A startup is building a social network where the primary query is "find all mutual connections between two users up to 5 degrees of separation." They currently have 50 million user accounts and 2 billion connection relationships. Which database best handles this query efficiently at this scale?

- A) Amazon Aurora PostgreSQL with recursive CTEs
- B) Amazon Redshift with self-join queries on a connections table
- C) Amazon DynamoDB with a GSI on the connection target
- D) Amazon Neptune with a Gremlin traversal

**Answer: D** — Graph traversal to a fixed depth (5 hops) is Neptune's optimal workload. Neptune's graph engine follows edges in O(1) per hop — the query time scales with the number of paths found, not the total graph size. A recursive CTE on Aurora PostgreSQL would require 5 self-joins on a 2-billion-row table and would be extremely slow. Redshift is an analytical data warehouse not suited for sub-second interactive traversals. DynamoDB requires multiple sequential Queries to simulate traversal and cannot express path-based queries natively.

## What's Next

Next up: Module 12 Canvas Lab — designing and querying a multi-entity DynamoDB table, creating a Global Table replica, and building a caching layer with ElastiCache Redis using real access patterns.
