---
title: "Amazon Athena: Serverless SQL Analytics"
type: content
estimated_minutes: 11
cert_tags: ["SAA-C03", "SAP-C02"]
---

# Amazon Athena: Serverless SQL Analytics

## Overview

Amazon Athena lets you run SQL queries directly against data in S3 using standard ANSI SQL — no servers to provision, no data to load, no cluster to manage. You pay only for the data scanned per query ($5 per TB scanned). Athena is the fastest path from data in S3 to a SQL result, and it is the primary query interface for AWS data lakes.

The problem Athena solves is access friction. Before Athena, querying data in S3 required spinning up an EMR cluster, writing Hive or Spark queries, waiting for cluster bootstrap, and tearing down when done. A question like "how many orders came from California last Tuesday?" required 20 minutes of infrastructure work before the first query ran. Athena eliminates that entirely — point it at a Glue Catalog table and write SQL. Results appear in seconds to minutes depending on data volume.

For the SAA exam, understand Athena's cost model (per TB scanned), how Parquet and partitioning reduce cost, Federated Query for non-S3 sources, and workgroups for multi-team cost management. SAP adds Athena for Spark (running Spark notebooks serverlessly), partition projection, and ACID table formats (Iceberg, Hudi, Delta). After this lesson, you will be able to design a cost-efficient Athena query environment and explain every technique that reduces scan volume and cost.

---

## Core Concepts

### How Athena Works

Athena uses Presto (now Trino) and optionally Apache Spark as execution engines. When you submit a SQL query, Athena:
1. Reads the table definition from the Glue Data Catalog (column names, types, format, S3 location)
2. Determines which S3 partitions match the `WHERE` clause (partition pruning)
3. Distributes parallel S3 reads across its managed compute fleet
4. Returns the result and stores it in the configured S3 results bucket

There is no cluster to start. Athena scales compute automatically per query. Each query execution is independent. The first query after a period of inactivity has no cold start — Athena is always available.

**Query results**: stored in an S3 results bucket you configure. Results are retained for 45 days by default (configurable). Re-running the same query re-scans S3 — results are not cached by default. Use query result reuse (Athena V3) to cache identical queries for up to 7 days.

---

### Cost Optimization: The Four Techniques

Athena's $5/TB pricing makes cost directly proportional to data scanned. Four techniques dramatically reduce scan volume:

**1. Columnar formats (Parquet, ORC)**: Athena reads only the columns referenced in the query. A 3-column SELECT from a 50-column Parquet table reads ~6% of the data versus 100% for CSV. For typical analytical queries, Parquet reduces scan by 10–30x compared to CSV.

**2. Compression (Snappy, GZIP, Zstd)**: compressed files transfer fewer bytes from S3 to the compute fleet. Snappy is preferred for Parquet (fast decompression, good ratio). GZIP achieves better compression ratios but is slower to decompress.

**3. Partitioning**: Athena evaluates partition keys in the `WHERE` clause and reads only matching S3 prefixes. `WHERE year='2024' AND month='12'` with `year/month/day` partitioning reads only December 2024 files. Without partitioning, Athena scans the full dataset regardless of the date filter.

**4. Partition projection**: define partition structure in the table properties rather than in the Glue Catalog. Athena generates partition paths mathematically without listing S3 objects — faster for tables with thousands of partitions and eliminates the need to run `MSCK REPAIR TABLE` after adding new partitions. Useful for continuous ingestion pipelines where new date partitions are added daily.

---

### Athena Workgroups

Workgroups isolate query execution for different teams, applications, or cost centers. Each workgroup has:
- **Query result location**: separate S3 bucket or prefix per team
- **Per-query data scan limit**: reject queries that would scan more than a threshold (e.g., 10 GB per query). Prevents a single runaway query from generating a large surprise bill.
- **Workgroup-level scan limit**: monthly cap across all queries in the workgroup
- **CloudWatch metrics**: `DataScannedInMegaBytes`, `TotalExecutionTime`, `QueryState` per workgroup
- **IAM access control**: separate IAM policies per workgroup enable cost attribution and access boundaries

Create separate workgroups for: production ETL queries (no scan limit, scheduled), analyst exploration (moderate per-query limit), and data science (high limit, but monitored). Use AWS Cost Explorer tags on workgroups for per-team cost attribution.

---

### Athena Federated Query

Federated Query extends Athena beyond S3. Using Lambda-based data source connectors, Athena can query: RDS (MySQL, PostgreSQL), Aurora, DynamoDB, Redshift, DocumentDB, CloudWatch Logs, and any custom JDBC/ODBC source. Write a single SQL JOIN that combines S3 data lake tables with a live RDS database table — without building an ETL pipeline to synchronize them.

Federated Query connectors run in Lambda; each connector handles authentication, query pushdown, and result serialization for its source. AWS provides connectors for major databases; custom connectors can be written using the Athena Query Federation SDK.

**Performance note**: Federated Query is not as fast as querying S3 directly. The Lambda connector adds latency and the source database may become a bottleneck. Federated Query is best for occasional joins against live data, not for high-frequency production workloads.

---

### ACID Table Formats

Athena supports Apache Iceberg, Apache Hudi, and Linux Foundation Delta Lake table formats stored in S3. These formats add database-like capabilities to S3 data:

- **ACID transactions**: concurrent inserts and updates without corruption
- **Row-level updates and deletes**: `UPDATE` and `DELETE` SQL on S3 data (not possible with standard Parquet/CSV tables)
- **Time travel**: query data as of a specific timestamp (`SELECT * FROM table FOR TIMESTAMP AS OF '2024-01-01'`)
- **Schema evolution**: add, rename, or drop columns without rewriting all files

Use Iceberg (the recommended format) when: data requires updates or deletes (not append-only), compliance requires data deletion (GDPR right to erasure), or time-travel queries are needed.

---

## Configuration Reference

### Example: Create an Athena Table with Partition Projection

```sql
-- Create a table with partition projection (no MSCK REPAIR TABLE needed)
CREATE EXTERNAL TABLE clickstream_events (
  user_id     STRING,
  session_id  STRING,
  event_type  STRING,
  page_url    STRING,
  duration_ms BIGINT,
  timestamp   TIMESTAMP
)
PARTITIONED BY (year INT, month INT, day INT)
STORED AS PARQUET
LOCATION 's3://company-data-lake/curated/clickstream/'
TBLPROPERTIES (
  'parquet.compress'='SNAPPY',

  -- Partition projection: Athena calculates S3 paths without listing objects
  'projection.enabled'='true',
  'projection.year.type'='integer',
  'projection.year.range'='2023,2030',
  'projection.month.type'='integer',
  'projection.month.range'='1,12',
  'projection.month.digits'='2',        -- zero-pad month: 01, 02, ... 12
  'projection.day.type'='integer',
  'projection.day.range'='1,31',
  'projection.day.digits'='2',
  'storage.location.template'='s3://company-data-lake/curated/clickstream/year=${year}/month=${month}/day=${day}/'
);

-- Query with partition pruning — reads only January 15, 2024 data
SELECT event_type, COUNT(*) as event_count
FROM clickstream_events
WHERE year = 2024 AND month = 1 AND day = 15
GROUP BY event_type
ORDER BY event_count DESC;
```

---

### Example: Create an Athena Workgroup with Scan Limit (AWS CLI)

```bash
# Create a workgroup for analyst team with per-query and monthly scan limits
aws athena create-work-group \
  --name analyst-team \
  --configuration '{
    "ResultConfiguration": {
      "OutputLocation": "s3://company-athena-results/analyst-team/",
      "EncryptionConfiguration": {
        "EncryptionOption": "SSE_KMS",
        "KmsKey": "arn:aws:kms:us-east-1:123456789012:key/abc-123"
      }
    },
    "EnforceWorkGroupConfiguration": true,
    "PublishCloudWatchMetricsEnabled": true,
    "BytesScannedCutoffPerQuery": 10737418240,
    "RequesterPaysEnabled": false
  }' \
  --tags Key=Team,Value=Analytics Key=CostCenter,Value=Analytics \
  --region us-east-1
# BytesScannedCutoffPerQuery: 10737418240 = 10 GB per query maximum
# EnforceWorkGroupConfiguration: true prevents users from overriding workgroup settings
# PublishCloudWatchMetricsEnabled: enables per-workgroup metrics in CloudWatch
# Tags: used for cost attribution in AWS Cost Explorer

# Verify workgroup query scan limit is working:
# Any query that would scan >10 GB is cancelled before it runs — protecting against
# accidental full-table scans by analysts unfamiliar with partitioning
```

---

## How to Decide

**Athena vs. Redshift for a given workload:**

| Factor | Athena | Redshift |
|---|---|---|
| Query frequency on same data | Low (ad-hoc, < daily) | High (repeated, scheduled) |
| Data already in S3 | ✅ Direct, no loading | Requires COPY from S3 |
| Structured relational data | Works but not optimized | ✅ Optimized |
| Sub-second response time required | ❌ | ✅ (with SPICE or Redshift) |
| Cost for 1 TB query, run once | $5 | Higher (cluster running) |
| Cost for 1 TB query, run 100x/day | $500/day | Cluster cost amortized |

The crossover point is roughly 20–50 queries per day against the same dataset. Below that, Athena's per-query model is cheaper. Above that, a Redshift cluster amortizes to less per query than Athena at scale.

**When to use Partition Projection vs. MSCK REPAIR TABLE:**

Use Partition Projection when: partitions are date-based (predictable range), new partitions are added continuously by Firehose or Glue ETL, or the table has more than a few hundred partitions. Projection is faster and requires no maintenance. Use `MSCK REPAIR TABLE` or `ALTER TABLE ADD PARTITION` only for small tables with infrequently added partitions.

---

## How This Connects

- **Glue Data Catalog** — Athena reads all table definitions, S3 locations, and partition metadata from the Glue Catalog. Without the Catalog, Athena has no schema. Creating a Glue table is the prerequisite for every Athena query against a new dataset.
- **S3** — Athena reads data directly from S3. No data is loaded into Athena. Result files (CSV by default) are also written to an S3 results bucket per workgroup.
- **Redshift Spectrum** — Redshift and Athena both use the Glue Catalog as their external schema layer. A table defined in Glue can be queried by both Athena and Redshift Spectrum using the same metadata — no duplication.
- **QuickSight** — QuickSight connects to Athena as a data source for BI dashboards. Each dashboard refresh runs an Athena query — SPICE import can pre-cache results to reduce repeated Athena charges.
- **Lake Formation** — Lake Formation permissions on Glue Catalog tables are enforced by Athena at query time. Users can only query tables and columns they have been granted access to.
- **Lambda (Federated Query)** — Each Federated Query connector runs in a Lambda function. Athena invokes the Lambda to delegate query execution to the target data source. The Lambda function handles source-specific authentication and query translation.

---

## Exam Traps

- **Athena bills per TB scanned, not per query**: two queries that return the same result but scan different amounts of data have very different costs. A student who understands only that "Athena is cheap" without understanding the scan-based pricing model will miss cost optimization questions.
- **Partitioning alone is not enough without matching WHERE clauses**: partitioning only helps when queries filter on the partition column. A query without a `WHERE year=...` clause on a date-partitioned table scans all partitions. Educating analysts to always filter on partition columns is as important as the partitioning itself.
- **Athena Federated Query uses Lambda — and Lambda has timeout limits**: each Federated Query connector invocation is a Lambda function with a maximum 15-minute timeout. Complex queries against slow source databases may time out. Design federated queries to push maximum filtering to the source.
- **Athena results are not automatically cached between queries**: re-running the same query re-scans S3 and incurs full cost. Use query result reuse (enabled per workgroup) to cache exact query results for up to 7 days — but be aware that cached results may become stale if the underlying data changes.
- **MSCK REPAIR TABLE is slow for large partition counts**: for tables with thousands of partitions, `MSCK REPAIR TABLE` can take minutes and times out at scale. Partition Projection or explicit `ALTER TABLE ADD PARTITION` for new partitions is preferred for large-scale continuously-ingested tables.

---

## Summary

- Athena is serverless SQL over S3 — no cluster to manage, no data to load, pay per TB scanned. It reads table definitions from the Glue Data Catalog.
- The four cost reduction techniques in order of impact: columnar format (Parquet/ORC), partitioning by query filter columns, compression (Snappy for Parquet), and partition projection to eliminate partition discovery overhead.
- Workgroups separate query execution and enforce per-query scan limits to prevent surprise bills from runaway analyst queries.
- Federated Query extends Athena to non-S3 sources (RDS, DynamoDB, Redshift) via Lambda connectors — enabling single-SQL joins across data lake and transactional databases.
- Apache Iceberg tables on S3 add ACID transactions, row-level deletes, and time-travel queries to Athena — supporting GDPR deletion requirements and compliance use cases.
- Athena is cost-efficient for ad-hoc and low-frequency queries; Redshift is more cost-efficient for high-frequency repeated queries against the same structured dataset.

---

## Examples

A startup's security team needed to investigate a suspected credential misuse incident. Rather than downloading gigabytes of CloudTrail logs and parsing them locally, an engineer created an Athena table over the S3 CloudTrail delivery bucket using the AWS-provided schema, and queried it with SQL filtering on the suspicious IAM role ARN and a one-week time window. The query returned results in four seconds and scanned only 2.3 GB (the CloudTrail logs were already Parquet with date partitioning from a Firehose delivery). Without Athena, the same investigation would have taken a developer an hour to set up a local environment and write a log parser.

A media streaming company's data analysts ran exploratory queries against 18 months of user behavior data. Before adopting Athena best practices, a single broad query scanned 4 TB and cost $20. After the data engineering team converted the dataset from JSON to Parquet with date-based partitioning and deployed partition projection, the same query scanned under 200 GB and cost under $1. They also created analyst workgroups with a 50 GB per-query scan limit — preventing accidents where a new analyst forgot to add a date filter and inadvertently triggered a full-table scan. Total monthly Athena cost dropped 95% with no change in the queries analysts were running.

A retail analytics team used Athena Federated Query to join their S3 data lake (historical order records back to 2019) with live inventory counts in RDS MySQL. A single SQL statement joined 5 years of S3 order history with the MySQL `current_inventory` table — without building a nightly ETL pipeline to synchronize inventory data into the data lake first. They configured the Federated Query connector in the `pre_build` of their analytics Lambda and accepted the slightly higher query latency (3–5 seconds vs. < 1 second for pure-S3 queries) as acceptable for their daily reporting use case.

---

## Think About It

1. Athena charges $5 per TB scanned. If a 10 TB dataset is queried with a WHERE clause that filters to 2% of rows, but the table is CSV with no partitioning, how much is charged — and what storage and partitioning changes would bring that cost below $0.05?
2. If a team runs the same 10 summary queries against a 10 TB dataset 50 times per day, is Athena the right long-term tool? What would drive the decision to migrate to Redshift?
3. You have a Glue Catalog table with 365 partitions (one per day of the year). An analyst writes `SELECT * FROM orders` without a date filter. What happens to the query cost and performance — and what workgroup configuration would prevent this?
4. Athena Federated Query joins S3 data with a live RDS PostgreSQL database. Describe the execution path: what runs where, and what are the performance and availability implications?
5. A healthcare company needs to delete all records belonging to a specific patient from their S3 data lake for GDPR compliance. With standard Parquet tables, how would you approach this? How does Apache Iceberg change the answer?

---

## Quick Check

**Q1.** How does Amazon Athena charge for queries?

- A) Per query execution, regardless of data volume
- B) Per TB of data scanned by each query
- C) Per hour of cluster runtime, similar to Redshift
- D) Per row returned in the query result set

**Answer: B** — Athena bills $5 per TB of data scanned by each query. This makes minimizing scan volume (via columnar formats, partitioning, compression) a direct cost optimization technique. A is incorrect — a query that scans 10 TB costs 1,000x more than one that scans 10 GB. C is incorrect — Athena has no cluster. D is incorrect — the result size does not affect cost.

---

**Q2.** A table in Athena stores three years of data as CSV without partitioning. An analyst queries `WHERE event_date = '2024-12-15'`. Which change would MOST reduce the data scanned?

- A) Enable query result reuse in the workgroup
- B) Convert the data to Parquet format only
- C) Add year/month/day partitioning and convert to Parquet
- D) Increase the workgroup's per-query scan limit

**Answer: C** — Adding partitioning enables Athena to skip all S3 objects except December 15, 2024 data. Converting to Parquet reduces bytes read within those objects. Together, these changes provide the greatest scan reduction. B alone helps with column pruning but doesn't skip irrelevant dates. A caches previous exact query results but doesn't help for new queries. D raises the limit without reducing what is scanned — it has no effect on cost.

---

**Q3.** What is the purpose of Athena Workgroups?

- A) To run multiple Athena queries in parallel for a single user
- B) To separate query execution environments with per-team result locations, scan limits, and CloudWatch metrics
- C) To schedule Athena queries on a recurring basis
- D) To replicate Athena query history across AWS regions

**Answer: B** — Workgroups provide isolation between teams: separate S3 result buckets, per-query scan limits to prevent surprise charges, and workgroup-level CloudWatch metrics for cost attribution. They are the primary mechanism for enterprise Athena cost governance. A is incorrect — Athena automatically runs queries in parallel; workgroups don't affect this. C is incorrect — Athena has no built-in scheduling; use EventBridge + Lambda to trigger queries. D is incorrect.

---

## What's Next

The next lesson covers Amazon Redshift — the cloud data warehouse optimized for complex SQL analytics on structured data at scale. Understanding when to use Redshift versus Athena, how Redshift Spectrum extends the warehouse to the data lake, and the Serverless vs. provisioned trade-off are the key decisions for any data platform architect.
