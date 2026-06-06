---
title: "Amazon Redshift: Cloud Data Warehouse"
type: content
estimated_minutes: 12
cert_tags: ["SAA-C03", "SAP-C02"]
---

# Amazon Redshift: Cloud Data Warehouse

## Overview

Amazon Redshift is a cloud-native data warehouse purpose-built for complex SQL analytics on large volumes of structured, relational data. Where Athena charges per query based on S3 data scanned (ideal for ad-hoc, low-frequency queries), Redshift loads data into highly compressed columnar storage on managed compute nodes — optimized for repeated, aggregation-heavy SQL queries that would be prohibitively expensive to run repeatedly through Athena.

The problem Redshift solves is the performance and cost ceiling of query-per-scan pricing. When the same 50 reports run hourly against a 10 TB dataset, per-query S3 scanning costs accumulate rapidly. Redshift's loaded columnar storage serves those queries faster and cheaper per execution than Athena at high query volume. Redshift Serverless removes the need to size or manage clusters for variable workloads.

For the SAA exam, understand Redshift's architecture (leader node, compute nodes, RA3 vs. DC2), Redshift Spectrum for extending queries to S3, Serverless vs. provisioned, and the COPY command for loading. SAP adds Redshift distribution styles, sort keys, workload management (WLM), data sharing across clusters, and vacuum/analyze operations. After this lesson, you will be able to design the data warehouse layer of an analytics platform and explain when Redshift outperforms Athena at scale.

---

## Core Concepts

### Redshift Architecture

A Redshift cluster has two components:

**Leader node**: receives SQL queries from clients, generates query execution plans, and coordinates the compute nodes. Does not store data itself. Handles: query optimization, result aggregation, and client connections (JDBC/ODBC and Redshift Data API).

**Compute nodes**: store data in columnar format and execute query fragments in parallel. Each compute node is divided into **node slices** — individual processing units that each hold a subset of the data and execute their part of the query concurrently.

**Data distribution**: data is distributed across node slices using a distribution style:
- `EVEN`: rows distributed round-robin — uniform distribution, poor join performance
- `KEY`: rows with the same value in the distribution key column go to the same slice — optimal when two large tables are joined on that key
- `ALL`: full copy of the table on every node — best for small dimension tables joined frequently against large fact tables
- `AUTO`: Redshift automatically chooses the best style based on table size

**Sort keys**: define the physical sort order of data on disk. Queries that filter on sort key columns skip entire blocks of data (zone maps eliminate blocks outside the filter range). Define sort keys on columns commonly used in `WHERE` clauses and `ORDER BY` expressions.

---

### Node Types: RA3 vs. DC2

**RA3 (Recommended)**: separates compute and storage. Data is stored in **Redshift Managed Storage (RMS)** — an S3-backed, SSD-cached storage tier managed by Redshift. Compute scales independently of storage. As data grows, storage expands automatically at $0.024/GB/month. RA3 is the default and recommended choice for new clusters.

**DC2 (Legacy)**: compute and storage are coupled on the node's local SSD. Storage cannot scale independently — to add storage you must add compute nodes. DC2 nodes provide faster local SSD access but require careful sizing and have a maximum per-node storage limit. Use DC2 only for specific workloads requiring maximum local SSD throughput that RA3 cannot match.

**Redshift Serverless**: eliminates cluster management entirely. You specify a base RPU (Redshift Processing Units) capacity; Serverless auto-scales up during query peaks and down to a configurable minimum (including zero idle). Billed per RPU-second of actual compute used. Best for: unpredictable or intermittent workloads, BI tools with variable query patterns, and eliminating cluster sizing decisions.

---

### Loading Data: COPY Command

The `COPY` command is the standard and most efficient mechanism for loading data into Redshift tables. It reads from S3 (or DynamoDB, EMR, or SSH) in parallel — all compute nodes read simultaneously, each loading a portion of the files. `COPY` is orders of magnitude faster than `INSERT` statements for bulk loading because it bypasses the SQL engine overhead for row-by-row insertion.

**Best practices for COPY**:
- Source data in Parquet format: `COPY` with Parquet skips type conversion, is faster than CSV, and preserves nested types
- Use multiple files: one file per Redshift node slice enables full parallelism — a single large file must be split across slices sequentially
- Use Manifest files: a JSON list of S3 URIs to load exactly — ensures reproducible loads and prevents accidental re-loading of previously ingested files

---

### Redshift Spectrum

Redshift Spectrum extends Redshift SQL to query S3 data directly without loading it into Redshift tables. Spectrum reads the Glue Data Catalog for table definitions, pushes filtering and aggregation to dedicated Spectrum nodes (not your cluster's compute nodes), and returns aggregated results to the leader node.

**Key uses**:
- Join Redshift-native current-year data with S3-stored historical data in a single SQL query
- Query cold data in S3 that is too large or too old to economically keep in Redshift storage
- Enable a single query to span the warehouse (hot data) and the data lake (cold data)

Spectrum queries incur both Redshift compute cost (cluster running) and an additional charge per TB of S3 data scanned via Spectrum ($5/TB, same as Athena). Using Parquet and partitioning reduces Spectrum scan cost exactly as it reduces Athena cost.

---

## Configuration Reference

### Example: Load Data from S3 with COPY

```sql
-- Create the target table with distribution key and sort key
CREATE TABLE orders (
  order_id     BIGINT ENCODE zstd,
  customer_id  BIGINT ENCODE zstd DISTKEY,   -- distribute by customer_id for customer joins
  order_date   DATE   ENCODE az64  SORTKEY,  -- sort by date for range queries
  total_amount DECIMAL(10,2) ENCODE zstd,
  status       VARCHAR(20)   ENCODE zstd
)
DISTSTYLE KEY;                               -- use DISTKEY column for distribution

-- Load from S3 Parquet files using COPY
COPY orders
FROM 's3://company-data-lake/curated/orders/year=2024/'
IAM_ROLE 'arn:aws:iam::123456789012:role/redshift-s3-role'
FORMAT AS PARQUET
REGION 'us-east-1';
-- FORMAT AS PARQUET: faster than CSV, preserves column types, no delimiter issues
-- IAM_ROLE: Redshift assumes this role to read from S3 — no credentials in the statement
-- For multiple files use MANIFEST to list exact S3 URIs, preventing accidental re-loads

-- After large loads, run VACUUM and ANALYZE to optimize storage and statistics
VACUUM orders;       -- reclaim space from deleted rows, re-sort unsorted data
ANALYZE orders;      -- update query planner statistics for optimal execution plans
```

---

### Example: Redshift Serverless Setup (AWS CLI)

```bash
# Create a Redshift Serverless namespace (holds databases and users)
aws redshift-serverless create-namespace \
  --namespace-name prod-analytics \
  --db-name analytics \
  --admin-username admin \
  --admin-user-password '{{resolve:secretsmanager:redshift/admin:SecretString:password}}' \
  --iam-roles arn:aws:iam::123456789012:role/redshift-s3-role \
  --region us-east-1

# Create a Serverless workgroup (compute + VPC configuration)
aws redshift-serverless create-workgroup \
  --workgroup-name prod-analytics-workgroup \
  --namespace-name prod-analytics \
  --base-capacity 32 \
  --max-capacity 256 \
  --subnet-ids subnet-0abc123 subnet-0def456 \
  --security-group-ids sg-0redshift \
  --publicly-accessible false \
  --region us-east-1
# base-capacity 32 RPU: starting capacity (1 RPU ≈ 1 vCPU, 2 GB RAM; 32 RPU is the minimum)
# max-capacity 256 RPU: Serverless scales up to this during peak queries
# publicly-accessible false: Redshift is VPC-only — best practice for all environments
```

> **Note:** Redshift Serverless bills per RPU-second of compute consumed. It does NOT scale to zero automatically — a minimum capacity (`base-capacity`) keeps the cluster warm. Set `base-capacity` to the minimum needed for your steady-state workload and `max-capacity` for peaks.

---

## How to Decide

**Athena vs. Redshift:**

| Scenario | Athena | Redshift |
|---|---|---|
| Ad-hoc query on S3 data, run once per week | ✅ Cheaper per query | ❌ Cluster always costs money |
| 50 BI reports run 20x/day on same tables | ❌ Accumulated scan cost | ✅ Cluster amortizes cheaply |
| Data already in S3, no loading needed | ✅ No ETL required | Requires COPY from S3 |
| Sub-second dashboard refresh | ❌ Seconds to minutes | ✅ With SPICE or materialized views |
| Uncertain query patterns / new dataset | ✅ Start here | Migrate later if needed |

**Redshift Serverless vs. Provisioned:**

Use Serverless when: workloads are unpredictable or intermittent (daily analyst queries, BI tools with variable usage, development/test environments). Use Provisioned when: workloads are predictable and continuous, you need fine-grained WLM queuing, or your data volume exceeds Serverless's per-namespace storage limits.

**RA3 node size selection:**

Start with the smallest RA3 node type (`ra3.xlplus`) and scale up by adding nodes if queries are slow. RA3 storage is elastic — add nodes for compute, not storage. For most workloads, 2–4 `ra3.xlplus` nodes cover 1–10 TB of data with acceptable query performance.

---

## How This Connects

- **S3 / Data Lake** — COPY from S3 is the primary Redshift loading mechanism. The curated zone's Parquet files feed Redshift tables through scheduled COPY jobs.
- **Glue** — Glue ETL jobs load data into Redshift using the Glue Redshift connector or JDBC after processing in the curated zone. Some pipelines skip the curated zone and load directly into Redshift from the raw zone via Glue.
- **Redshift Spectrum + Glue Data Catalog** — Spectrum reads external table definitions from the Glue Catalog. A `CREATE EXTERNAL SCHEMA` statement in Redshift registers the Glue Catalog database, making all its tables queryable via Spectrum.
- **QuickSight** — QuickSight connects to Redshift (provisioned or Serverless) via JDBC for BI dashboards. SPICE imports Redshift query results into QuickSight's in-memory engine for fast dashboard refresh.
- **Kinesis Data Firehose** — Firehose can deliver directly to Redshift via S3 staging and the COPY command — a streaming ingestion path that keeps Redshift tables near-current without a separate ETL pipeline.
- **Redshift Data API** — An HTTP-based SQL API that executes queries against Redshift asynchronously without managing database connections. Used by Lambda functions and application code that cannot maintain a persistent JDBC connection.

---

## Exam Traps

- **RA3 decouples compute and storage; DC2 does not**: a frequently tested distinction. RA3 nodes store data in Redshift Managed Storage (S3-backed); compute nodes can be added or removed without data redistribution at the storage layer. DC2 ties storage to the node — adding storage requires adding nodes (and compute).
- **COPY is far faster than INSERT for bulk loading**: single-row `INSERT` statements bypass Redshift's parallel load optimizations and are extremely slow for large datasets. Always use `COPY` for bulk loading. This is a common trap question disguised as a performance scenario.
- **Redshift Spectrum still incurs scan charges**: Spectrum queries charge for the S3 data scanned via Spectrum ($5/TB) in addition to the Redshift cluster running cost. Using Parquet + partitioning reduces Spectrum charges exactly as it reduces Athena charges — the underlying scan pricing model is the same.
- **Redshift Serverless does not scale to zero by default**: the `base-capacity` setting keeps minimum RPUs allocated. "Scales to zero" is a misunderstanding — Serverless scales down, but `base-capacity` must be explicitly set to 0 (not supported) or the cluster stays at its minimum. Cost is always incurred when a workgroup exists.
- **VACUUM and ANALYZE are required maintenance operations**: after significant data loads or deletes, tables accumulate unsorted blocks and stale statistics. `VACUUM` reclaims space and re-sorts data; `ANALYZE` updates query planner statistics. Forgetting these operations leads to query plan degradation over time — a subtle production issue.

---

## Summary

- Redshift is a columnar data warehouse for repeated, complex SQL analytics on structured data — more cost-effective than Athena for high-frequency queries against the same loaded dataset.
- RA3 nodes separate compute from storage (Redshift Managed Storage), allowing each to scale independently; DC2 couples SSD storage to compute nodes for maximum local throughput.
- Redshift Serverless automatically scales capacity and eliminates cluster management — best for unpredictable workloads; provisioned clusters are more cost-predictable for steady-state high-throughput workloads.
- The `COPY` command is the standard bulk loading mechanism — parallel reads across all compute nodes make it orders of magnitude faster than INSERT statements.
- Redshift Spectrum extends SQL queries to S3 data lake files via the Glue Data Catalog — enabling single-query joins between loaded warehouse tables and cold historical data in S3.
- Run `VACUUM` and `ANALYZE` after significant data loads to maintain sorted storage and fresh query planner statistics.

---

## Examples

A SaaS company's finance team ran the same 50 revenue and churn reports every business day, each joining multiple large tables across two years of transaction history. They initially used Athena, but repeated hourly queries at $5/TB accumulated quickly. Migrating to a two-node `ra3.xlplus` provisioned cluster made those queries 15–30x faster and reduced monthly analytics spend by 60%. The COPY-loaded columnar tables served complex JOIN queries far more efficiently than repeatedly scanning S3 — the classic "high-frequency queries on the same data" case where Redshift wins decisively over Athena.

A healthcare analytics platform kept five years of claims data in S3 — too large to economically load into Redshift — but needed to join historical data with the current year's records. They created an external schema pointing to the Glue Catalog and used Redshift Spectrum in JOIN statements that combined Redshift-native 2024 claims with S3-stored 2019–2023 claims. A single SQL query returned results that previously required two separate queries (one in Athena, one in Redshift) merged in application code. Spectrum's Parquet + date partitioning kept the per-query scan charge to under $0.50 for the historical portion.

A growth-stage startup launched a BI tool for investor reporting but had no idea how much compute their Redshift queries would require — usage varied wildly by quarter. Rather than sizing a provisioned cluster and paying for idle capacity, they created a Redshift Serverless workgroup with `base-capacity=32` and `max-capacity=256`. During quarterly board reporting when 15 analysts ran heavy queries simultaneously, Serverless scaled to 256 RPU automatically. During quiet weeks it operated at 32 RPU. When they transitioned to predictable usage after Series B, they migrated to a provisioned `ra3.xlplus` cluster at 30% lower monthly cost — illustrating the lifecycle: start with Serverless, move to provisioned when usage stabilizes.

---

## Think About It

1. Why is the `COPY` command orders of magnitude faster than `INSERT` statements for loading 1 billion rows into Redshift — and what does that tell you about how Redshift stores and distributes data internally?
2. A provisioned Redshift cluster is running 24/7 for a BI workload that queries are only run 8 hours per day on weekdays. How would you design the architecture to reduce idle cluster cost without switching to Serverless?
3. How would you decide whether to keep historical data in Redshift tables or tier it to S3 and query it via Spectrum — and what metrics or thresholds would drive that decision over time?
4. A Redshift query that previously ran in 10 seconds now takes 90 seconds after a large data load. You haven't changed the query or schema. What Redshift maintenance operations might resolve this, and why?
5. Both Athena and Redshift Spectrum can query the same Parquet files in S3. Why would you ever choose to load data into Redshift tables at all if Spectrum can query S3 directly?

---

## Quick Check

**Q1.** What is the key architectural difference between Redshift RA3 and DC2 node types?

- A) RA3 nodes use GPU acceleration; DC2 nodes use CPU-only compute
- B) RA3 nodes separate compute from storage (data in Redshift Managed Storage); DC2 nodes couple SSD storage to compute on the same node
- C) RA3 nodes are for Redshift Serverless only; DC2 nodes are for provisioned clusters
- D) RA3 nodes support Redshift Spectrum; DC2 nodes do not support external tables

**Answer: B** — RA3 uses Redshift Managed Storage (S3-backed with local SSD cache), decoupling storage scaling from compute scaling. DC2 stores data on the node's local SSD — adding storage requires adding nodes. A is incorrect — neither type uses GPUs. C is incorrect — RA3 is available for both Serverless and provisioned. D is incorrect — both node types support Spectrum.

---

**Q2.** A data team loads data into Redshift using 1,000 individual `INSERT INTO orders VALUES (...)` statements instead of the `COPY` command. What is the most likely impact on load time?

- A) No difference — INSERT and COPY use the same underlying write path
- B) INSERT is faster for small row counts; COPY is faster for large row counts
- C) INSERT bypasses parallel loading and processes rows sequentially, making it significantly slower than COPY for bulk loads
- D) INSERT triggers automatic VACUUM and ANALYZE after each row, which is why it's slower

**Answer: C** — Redshift's `COPY` command loads in parallel across all compute node slices simultaneously. `INSERT` statements are processed sequentially through the SQL engine, one row at a time, without leveraging distributed parallelism. For any bulk load of more than a few thousand rows, `COPY` is the correct approach.

---

**Q3.** When is Redshift Serverless the more appropriate choice compared to a provisioned Redshift cluster?

- A) When maximum query performance is required for a constant 24/7 analytics workload
- B) When workloads are unpredictable or intermittent and you want to avoid paying for idle provisioned cluster capacity
- C) When data volume exceeds 100 TB and requires DC2 nodes for local SSD performance
- D) When you need fine-grained workload management (WLM) queuing with multiple query queues

**Answer: B** — Redshift Serverless scales automatically and bills per RPU-second of actual compute used, making it cost-effective for variable or intermittent workloads. Provisioned clusters with WLM (D) are better suited for constant high-throughput workloads needing fine-grained queue management.

---

## What's Next

The next lesson covers Amazon OpenSearch Service, Amazon EMR, and Amazon QuickSight — completing the analytics services picture with full-text search and log analytics, custom big data processing, and business intelligence visualization. Understanding when to choose each service for its specific query pattern is the key skill.
