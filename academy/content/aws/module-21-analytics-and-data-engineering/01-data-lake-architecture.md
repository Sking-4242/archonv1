---
title: "Data Lake Architecture on AWS"
type: content
estimated_minutes: 12
cert_tags: ["SAA-C03", "SAP-C02"]
---

# Data Lake Architecture on AWS

## Overview

A data lake is a centralized repository that stores structured, semi-structured, and unstructured data in its raw form — without requiring a predefined schema. Unlike a data warehouse (which imposes schema before loading), a data lake stores data as-is and applies schema at query time. Amazon S3 is the universal data lake storage layer on AWS, and the AWS analytics ecosystem — Glue, Athena, Redshift Spectrum, EMR, Kinesis — is built around it.

The problem data lakes solve is inflexibility. Traditional data warehouses force schema decisions at ingestion time. If you don't know what questions you'll ask, you cannot design the right schema — and wrong schema decisions are expensive to reverse. A data lake stores everything first, in its original form, and lets analysts define schemas when they know what they need. The tradeoff: without governance, a data lake degrades into a "data swamp" — disorganized files with unknown schemas, inconsistent formats, and no access controls. AWS Lake Formation exists specifically to prevent this outcome.

For the SAA exam, understand S3 as the storage layer, the Glue Data Catalog as the metadata layer, zone architecture (raw/curated/presentation), and ingestion patterns. SAP adds Lake Formation governance (row/column-level access), data lake formation from existing stores, and multi-tenant analytics patterns. After this lesson, you will be able to design a complete data lake architecture and explain how each AWS service plays its role.

---

## Core Concepts

### S3 as the Data Lake Foundation

S3 is the universal data lake storage layer due to its unlimited scalability, 11 nines of durability, deep integration with every AWS analytics service, and per-GB storage cost far below any warehouse. Every analytics service — Athena, Redshift Spectrum, EMR, Glue, SageMaker — reads from and writes to S3 natively.

**Zone architecture**: structure S3 with three zones, each with a dedicated prefix or bucket:

- **Raw zone**: data lands here exactly as received — unchanged, unmodified. CSV exports from transactional databases, JSON from Kinesis Firehose, images, logs. Nothing is ever deleted from the raw zone. It is the source of truth for reprocessing.
- **Curated zone**: cleaned, validated, and transformed data in columnar format (Parquet or ORC), partitioned by commonly queried dimensions (date, region, category). Queries against the curated zone are 10–100x faster and cheaper than against the raw zone.
- **Presentation zone**: aggregated, denormalized data ready for BI tools and specific use cases. Pre-joined tables, daily summaries, ML feature tables.

**Columnar formats**: Parquet and ORC store data column-by-column rather than row-by-row. Analytical queries that read only a few columns from large datasets scan dramatically less data. A query selecting 3 columns from a 100-column dataset reads only 3% of the stored data in Parquet vs. 100% in CSV.

**Partitioning**: organize S3 objects in Hive-compatible prefixes (`year=2024/month=12/day=01/`). Query engines skip entire partitions when the query's `WHERE` clause doesn't match — a query with `WHERE year='2024' AND month='12'` reads only December 2024 data, not the full dataset.

---

### AWS Glue Data Catalog

The Glue Data Catalog is a managed, Hive Metastore-compatible metadata repository. It stores: database and table definitions (column names, data types, partition keys), table locations (S3 paths), and partition metadata. Athena, EMR, Redshift Spectrum, and Glue ETL jobs all share the same catalog — one source of truth for where data lives and how it is structured.

**Glue Crawlers** automatically scan S3 paths, detect schemas (column names, types, nested structures), infer partition structures, and write the results to the Data Catalog. Schedule crawlers to run after each ingestion batch to keep catalog metadata current. Without crawlers, schema definitions must be maintained manually — error-prone and time-consuming.

**Without a shared catalog**: each analytics tool maintains its own schema definitions in different formats. A schema change requires updates in Athena, EMR, and the Glue ETL job independently. With the Glue Data Catalog, change the schema once; all consumers see the updated definition at their next query.

---

### Data Ingestion Patterns

Every data lake has multiple ingestion sources, each with an appropriate path to the raw zone:

**Streaming ingestion**: Kinesis Data Streams → Kinesis Data Firehose → S3. Firehose buffers and delivers in near-real-time (60-second minimum latency), optionally converting JSON to Parquet before landing in the raw zone.

**Batch file ingestion**: AWS Transfer Family (SFTP/FTP/FTPS) for partner file drops, S3 direct upload for application exports, AWS DataSync for large-scale on-premises-to-S3 data movement.

**Database CDC (Change Data Capture)**: AWS Database Migration Service (DMS) reads database transaction logs and streams row-level changes (INSERT, UPDATE, DELETE) to S3 as Parquet or CSV — without impacting source database performance.

**SaaS ingestion**: Amazon AppFlow connects to Salesforce, Zendesk, Google Analytics, Marketo, and 50+ SaaS platforms with no-code configured flows, delivering records to S3 on schedule or on event trigger.

All ingestion paths land in the raw zone. Downstream Glue ETL jobs transform and move data to the curated zone.

---

### AWS Lake Formation

Lake Formation adds a governance layer on top of the Glue Catalog and S3. It provides:

**Fine-grained access control**: grant specific IAM principals access to specific databases, tables, columns, or rows. Athena and Redshift Spectrum enforce these permissions at query time — a user can only see data they are authorized for, even if the underlying S3 data is more broadly accessible.

**Row-level security**: define filter conditions per principal — a regional analyst sees only their region's rows, a junior analyst with PII restrictions sees masked columns, an auditor sees a full dataset. All controlled via Lake Formation grants without creating separate data copies.

**Data lake formation from existing sources**: Lake Formation can pull data from RDS, Aurora, and on-premises databases using blueprints — pre-defined workflows that orchestrate DMS, Glue, and S3 to build a data lake from existing relational databases.

---

## Configuration Reference

### Example: Create a Data Lake Zone Structure and Glue Crawler

```bash
# Step 1: Create the S3 bucket with zone prefixes
aws s3api create-bucket \
  --bucket company-data-lake \
  --region us-east-1

# Create logical zone prefixes (objects define the zones, not separate buckets)
aws s3api put-object --bucket company-data-lake --key raw/    --content-length 0
aws s3api put-object --bucket company-data-lake --key curated/ --content-length 0
aws s3api put-object --bucket company-data-lake --key presentation/ --content-length 0

# Enable versioning and encryption on the bucket
aws s3api put-bucket-versioning \
  --bucket company-data-lake \
  --versioning-configuration Status=Enabled

aws s3api put-bucket-encryption \
  --bucket company-data-lake \
  --server-side-encryption-configuration '{
    "Rules": [{"ApplyServerSideEncryptionByDefault": {"SSEAlgorithm": "aws:kms"}}]
  }'

# Step 2: Create a Glue Crawler to catalog the curated zone
aws glue create-crawler \
  --name curated-zone-crawler \
  --role arn:aws:iam::123456789012:role/glue-crawler-role \
  --database-name company_analytics \
  --targets '{
    "S3Targets": [{
      "Path": "s3://company-data-lake/curated/",
      "Exclusions": ["**/_temporary/**", "**/.DS_Store"]
    }]
  }' \
  --schedule "cron(0 6 * * ? *)" \
  --schema-change-policy '{
    "UpdateBehavior": "UPDATE_IN_DATABASE",
    "DeleteBehavior": "LOG"
  }' \
  --region us-east-1
# schedule: run daily at 6am UTC to pick up overnight ETL outputs
# UpdateBehavior UPDATE_IN_DATABASE: update catalog schema when S3 schema changes
# DeleteBehavior LOG: log deleted partitions but don't remove from catalog
```

---

### Example: Kinesis Firehose → S3 with Parquet Conversion and Hive Partitioning

```bash
aws firehose create-delivery-stream \
  --delivery-stream-name clickstream-to-raw \
  --delivery-stream-type DirectPut \
  --extended-s3-destination-configuration '{
    "RoleARN": "arn:aws:iam::123456789012:role/firehose-delivery-role",
    "BucketARN": "arn:aws:s3:::company-data-lake",
    "Prefix": "raw/clickstream/year=!{timestamp:yyyy}/month=!{timestamp:MM}/day=!{timestamp:dd}/",
    "ErrorOutputPrefix": "raw/clickstream-errors/!{firehose:error-output-type}/",
    "BufferingHints": {"SizeInMBs": 128, "IntervalInSeconds": 300},
    "DataFormatConversionConfiguration": {
      "Enabled": true,
      "InputFormatConfiguration": {"Deserializer": {"OpenXJsonSerDe": {}}},
      "OutputFormatConfiguration": {
        "Serializer": {
          "ParquetSerDe": {
            "Compression": "SNAPPY"    
          }
        }
      },
      "SchemaConfiguration": {
        "DatabaseName": "company_analytics",
        "TableName": "clickstream_raw",
        "RoleARN": "arn:aws:iam::123456789012:role/firehose-delivery-role"
      }
    }
  }' \
  --region us-east-1
# Hive-partitioned prefix: Athena automatically discovers year/month/day partitions
# Parquet + Snappy: columnar format with fast compression — optimal for Athena
# SchemaConfiguration: Firehose uses the Glue catalog table schema for Parquet conversion
```

> **Note:** The Glue catalog table (`clickstream_raw`) must exist before creating the Firehose stream with Parquet conversion enabled. Run a Glue Crawler against sample data first, or create the table definition manually.

---

## How to Decide

**When to use a data lake vs. a data warehouse:**

| Factor | Data Lake (S3 + Athena/Glue) | Data Warehouse (Redshift) |
|---|---|---|
| Schema known at ingestion? | No — use data lake | Yes — use warehouse |
| Data types | Mixed: structured + semi-structured + unstructured | Structured / relational |
| Query frequency on same data | Low (ad-hoc) | High (repeated queries) |
| Cost model | Pay per query (Athena) | Pay for running cluster |
| Data exploration / discovery | ✅ Data lake | ❌ |
| BI reporting with fast refresh | ❌ | ✅ Warehouse |
| Machine learning training data | ✅ Data lake | ❌ |

In practice, most mature data platforms use both: a data lake as the raw/canonical store and Redshift as the serving layer for structured BI workloads — connected via Redshift Spectrum or Glue ETL pipelines.

**Columnar format selection:**

- **Parquet**: default recommendation. Widely supported (Athena, Glue, Spark, Redshift Spectrum, SageMaker), good compression, fast for analytical queries.
- **ORC**: similar performance to Parquet, preferred by Hive/EMR workloads. Use Parquet unless your toolchain specifically benefits from ORC.

**Partition key selection:**

Partition by the columns most commonly used in `WHERE` clauses. Date (`year/month/day`) is almost always a partition key. Add a second level (e.g., `region`, `event_type`) only if queries frequently filter on that dimension AND the partition granularity does not create too many small files (aim for 128 MB–1 GB per Parquet file per partition).

---

## How This Connects

- **Glue ETL** — Reads from the raw zone, transforms data (deduplicate, normalize, partition), and writes to the curated zone in Parquet. Glue is the transformation engine that moves data through zones.
- **Athena** — Queries the curated zone directly via the Glue Data Catalog. The catalog provides table definitions; Athena translates SQL into distributed S3 reads without loading data into any database.
- **Redshift Spectrum** — Extends Redshift SQL to query the curated zone (S3) via the Glue Catalog, enabling joins between loaded Redshift tables and S3 data lake data in a single SQL statement.
- **Kinesis Firehose** — The primary streaming ingestion path. Firehose buffers events and delivers them to the raw zone, with optional Parquet conversion and Lambda transformation.
- **Lake Formation** — Provides row and column-level access control over the Glue Catalog. All Athena and Redshift Spectrum queries enforce these permissions automatically.
- **SageMaker** — Reads training datasets from the curated zone directly into SageMaker Training Jobs. The curated zone's Parquet format and partitioning minimize data load time at training scale.

---

## Exam Traps

- **Schema-on-read vs. schema-on-write**: data lakes use schema-on-read (schema applied at query time by Athena or Glue). Data warehouses use schema-on-write (data must conform to the schema before ingestion). A question about handling data with an unknown or evolving schema points to a data lake pattern.
- **Glue Crawlers update the catalog, they don't transform data**: Crawlers scan S3 and update metadata (column names, types, partitions) in the Glue Data Catalog. They do not move, clean, or transform data. Data transformation is done by Glue ETL jobs.
- **Parquet + partitioning reduces Athena cost, not just performance**: Athena bills per TB scanned. Parquet reduces bytes scanned per column; partitioning skips irrelevant partitions entirely. Both directly reduce the bill. This is a frequently tested cost optimization pattern.
- **The raw zone should never be modified or deleted**: the raw zone is the immutable source of truth. If a downstream transformation produces bad output, you can reprocess from the raw zone. If raw data is modified or deleted, that reprocessing capability is lost.
- **Lake Formation permissions and S3 bucket policies are separate**: Lake Formation grants control which Glue Catalog tables a principal can access. S3 bucket policies control which principals can perform S3 API operations. Both must allow access for a query to succeed — Lake Formation permission alone does not bypass an S3 bucket policy that denies access.

---

## Summary

- S3 is the data lake storage layer; structure it with raw (unchanged originals), curated (Parquet, partitioned), and presentation (aggregated, BI-ready) zones.
- The Glue Data Catalog is the shared metadata layer — Athena, Glue ETL, Redshift Spectrum, and EMR all use it so schema changes propagate to all consumers from one place.
- Glue Crawlers automate schema discovery by scanning S3, inferring column types and partition structures, and writing metadata to the catalog.
- Curated zone data stored in Parquet with date-based partitioning reduces Athena query cost by 90%+ compared to unpartitioned CSV.
- Lake Formation adds fine-grained row and column-level access control enforced at query time by Athena and Redshift Spectrum — enabling multi-tenant analytics without duplicating data.
- Ingestion paths: Firehose for streaming, DMS for CDC from databases, AppFlow for SaaS, Transfer Family for file-based — all land in the raw zone; Glue ETL moves data to the curated zone.

---

## Examples

A regional hospital network wanted to preserve every patient monitoring event, imaging file, and clinical note for future research without knowing in advance which questions researchers would ask. They landed all raw data in an S3 raw zone with no transformation. Glue Crawlers cataloged the data nightly. Researchers query using Athena with Lake Formation column-level grants masking PII fields — clinical researchers can analyze aggregate trends without ever seeing patient names or SSNs. The schema-on-read model means new analyses can be performed on historical data without reprocessing or schema migration.

A mid-size e-commerce retailer ingested clickstream events via Kinesis Firehose into the raw zone. They ran a Glue ETL job nightly that converted raw JSON to Parquet, applied date partitioning, and deduplicated records in the curated zone. Their analytics team queried curated tables from both Athena (ad-hoc exploration) and Redshift Spectrum (joined with loaded Redshift transaction data) without coordination — both used the same Glue Catalog table definitions. When the analytics team shifted to a new BI tool, they connected it to the catalog endpoint with no data migration.

A fintech startup initially stored all transaction logs as CSV in a single S3 prefix with no partitioning. A single broad Athena query scanned 4 TB of data and cost $20. After a data engineering sprint that converted the curated zone to Parquet with year/month/day partitioning, the same query scanned under 200 GB and cost under $1. The team also added Lake Formation grants so the compliance team could only see their required columns — without creating a separate, expensive copy of the data. The architectural investment paid back in saved Athena costs within two weeks.

---

## Think About It

1. Schema-on-read gives data lakes flexibility but introduces risks. What are three specific risks that arise when multiple teams independently define schemas for the same S3 dataset — and how does the Glue Data Catalog mitigate them?
2. A company's raw zone holds three years of data in CSV format. Converting everything to Parquet would save 90% on Athena costs. What are the operational risks and considerations of performing this conversion, and how would you execute it safely?
3. Your data lake has data from ten business units, each needing to see only their own records. You have two architectural options: one S3 bucket per business unit with separate IAM bucket policies, or one bucket with Lake Formation row-level security. Compare the trade-offs in terms of cost, operational complexity, and governance.
4. How would you design a data quality gate that prevents bad data (malformed records, out-of-range values) from moving from the raw zone to the curated zone in your Glue ETL pipeline?
5. An analyst says "our data lake has become a data swamp — nobody can find anything." What specific architectural elements are likely missing, and which AWS services would you add to address each one?

---

## Quick Check

**Q1.** What is the primary advantage of storing curated data in Parquet format rather than CSV in an S3 data lake?

- A) Parquet files are human-readable, making debugging easier
- B) Parquet's columnar format allows Athena to read only the queried columns, reducing data scanned and lowering query cost
- C) Parquet is the only format supported by the Glue Data Catalog
- D) Parquet files are automatically encrypted by S3 at no additional cost

**Answer: B** — Columnar formats like Parquet store each column's data contiguously. An Athena query selecting 3 columns from a 50-column dataset reads approximately 6% of the stored data instead of 100%, directly reducing bytes scanned and therefore cost. A is incorrect — Parquet is a binary format, not human-readable. C is incorrect — the Glue Catalog supports CSV, JSON, Parquet, ORC, Avro, and more. D is incorrect — S3 encryption is independent of file format.

---

**Q2.** An analyst runs an Athena query that scans 4 TB even though they're only analyzing last month's data. The table uses Parquet format but has no partitioning. What change would most reduce the data scanned?

- A) Switch from Parquet to ORC format
- B) Add S3 Intelligent-Tiering to the data lake bucket
- C) Add year/month/day partitioning to the Glue Catalog table and reorganize S3 objects into matching prefixes
- D) Enable Athena query result caching

**Answer: C** — Partitioning causes Athena to skip S3 prefixes that don't match the `WHERE` clause. With `year=2024/month=11/` partitioning and a query filtering to November 2024, Athena reads only that partition rather than scanning all 4 TB. A provides no additional benefit since Parquet is already columnar. B controls storage tiering costs, not query scan volume. D caches exact query results but doesn't help for queries with different parameters.

---

**Q3.** Which AWS service provides row-level and column-level access control on top of an S3-based data lake, enforced at query time by Athena?

- A) S3 bucket policies with prefix-based conditions
- B) IAM policy conditions on `s3:GetObject`
- C) AWS Lake Formation
- D) Amazon Macie

**Answer: C** — Lake Formation grants fine-grained permissions (specific tables, specific columns, row-filter conditions) on Glue Catalog objects. When a user runs an Athena query, the Athena engine enforces these permissions, returning only the rows and columns the user is authorized to see. A and B control S3 API access but cannot filter at the row or column level within a file. D is a data classification and PII detection service, not an access control service.

---

## What's Next

The next lesson covers AWS Glue in depth — the ETL service that moves and transforms data between zones. Understanding Glue ETL jobs, workflows, and DataBrew is essential for designing the transformation layer that turns raw data into analytics-ready curated datasets.
