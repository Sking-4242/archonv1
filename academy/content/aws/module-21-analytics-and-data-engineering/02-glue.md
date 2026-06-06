---
title: "AWS Glue: Managed ETL and Data Integration"
type: content
estimated_minutes: 12
cert_tags: ["SAA-C03", "SAP-C02"]
---

# AWS Glue: Managed ETL and Data Integration

## Overview

AWS Glue is a serverless data integration service that provides everything needed to move data between zones in a data lake: managed Apache Spark execution for large-scale ETL jobs, visual job design through Glue Studio, visual data preparation through Glue DataBrew, multi-step pipeline orchestration through Glue Workflows, and the Glue Data Catalog (covered in the previous lesson). Together these tools cover the full spectrum from automated, code-driven ETL at scale to self-service, no-code data preparation for non-engineers.

The problem Glue solves is operational overhead for data transformation. Before managed ETL, data engineering teams provisioned and managed Spark clusters (often EMR), wrote PySpark scripts, scheduled them on Airflow instances they operated themselves, and debugged cluster configuration when transforms failed. With Glue, there are no clusters to manage, no infrastructure to patch — submit a job, and Glue provisions the Spark workers, runs the transform, stores the output, and terminates. You pay per DPU-hour of compute used, not for idle time.

For the SAA exam, understand Glue's role in the analytics stack (ETL between zones), the Glue Data Catalog, Crawlers, and the Glue vs. Lambda vs. EMR decision. SAP adds Glue Workflows for orchestration, DynamicFrames for schema-flexible transforms, DataBrew recipes, and Glue Data Quality. After this lesson, you will be able to design the transformation layer for a data lake and select the right Glue feature for a given use case.

---

## Core Concepts

### Glue ETL Jobs

Glue ETL jobs run PySpark or Scala Spark scripts on fully managed compute. Glue handles: cluster provisioning, Spark version management, job execution, and cluster termination. You provide the script (or let Glue Studio generate it) and the data source/destination locations.

**Data Processing Units (DPUs)**: Glue compute is measured in DPUs (1 DPU = 4 vCPU, 16 GB RAM). You specify the number of DPUs for a job; Glue provisions the equivalent Spark workers. Billed per DPU-second of actual execution. G.1X workers are standard; G.2X workers offer more memory for jobs with large joins or aggregations.

**Sources and destinations**: S3 (primary), RDS, Aurora, Redshift, DynamoDB, JDBC (any database with a driver), Kafka/MSK. Write to S3, Redshift (via S3 staging), JDBC targets. Most ETL in a data lake reads from the raw zone (S3) and writes to the curated zone (S3 in Parquet format).

**DynamicFrames**: Glue's extended version of Spark DataFrames. DynamicFrames handle inconsistent schemas (columns that appear in some records but not others), nested JSON structures, and schema evolution more gracefully than standard DataFrames. Use `ResolveChoice` to handle fields with multiple data types in the same column.

---

### Glue Studio (Visual Job Designer)

Glue Studio provides a visual drag-and-drop interface for building ETL jobs. You add source nodes (S3, Glue Catalog table), transform nodes (filter, join, aggregate, apply mapping), and target nodes (S3, Redshift). Glue Studio generates the PySpark script automatically. The generated script can be viewed, edited, and version-controlled.

Use Glue Studio when: the transform is standard (filter, join, column mapping), the data engineer is more comfortable with visual tools, or you want a starting-point script to customize. The visual job makes the data lineage (which source feeds which target through which transforms) immediately visible.

---

### Glue Workflows

Glue Workflows orchestrate sequences of Glue crawlers and ETL jobs with dependencies. A workflow defines which jobs and crawlers run, in what order, and under what conditions.

**Trigger types**:
- **On-demand**: manually triggered via console, CLI, or API
- **Scheduled**: cron-based (hourly, daily, weekly)
- **Conditional**: trigger when a previous job or crawler in the workflow completes with a specified status (succeeded, failed, any)

A typical workflow: Crawl landing zone S3 → (on crawler success) run Raw-to-Curated ETL job → (on job success) run Curated-to-Presentation Aggregation job → (on aggregation success) send EventBridge notification. If any step fails, downstream steps are blocked and an alert is sent.

---

### Glue DataBrew

Glue DataBrew is a visual data preparation tool aimed at data analysts and non-engineers. It provides 250+ pre-built transformations via point-and-click: rename columns, normalize dates, filter rows, pivot tables, handle nulls, mask PII, join datasets, parse strings. No Spark or Python knowledge required.

**Profile**: before transforming, DataBrew can run a profile job that produces statistics for each column — value distributions, missing data percentages, outlier detection, uniqueness. This helps analysts understand data quality before deciding which transformations to apply.

**Recipes**: a sequence of transformation steps applied to a dataset. Recipes are reusable and version-controlled. Once a recipe is validated on a sample, it can be applied to the full dataset as a recipe job outputting to S3.

Use DataBrew when: the data preparation task is owned by a business analyst or data analyst who understands the data but is not a software engineer; or when rapid prototyping of transformations is needed before formalizing them into Glue ETL scripts.

---

### Glue Data Quality

Glue Data Quality (powered by the open-source Deequ library) validates datasets against defined rules within ETL jobs. Rule types include: completeness (required fields have values), uniqueness (no duplicate keys), referential integrity, value ranges, string patterns (regex), and statistical distributions.

Configure data quality checks as a gate in Glue Workflows: if critical checks fail (e.g., more than 5% null values in a required field), fail the job before writing bad data to the curated zone. This is the "bad data circuit breaker" — it stops malformed or incomplete data from propagating to Athena tables, Redshift, and dashboards.

---

## Configuration Reference

### Example: Glue ETL Job — Raw CSV to Curated Parquet with Partitioning

```python
# glue_etl_raw_to_curated.py
import sys
from awsglue.transforms import *
from awsglue.utils import getResolvedOptions
from pyspark.context import SparkContext
from awsglue.context import GlueContext
from awsglue.job import Job
from awsglue.dynamicframe import DynamicFrame
import pyspark.sql.functions as F

args = getResolvedOptions(sys.argv, ['JOB_NAME', 'source_path', 'target_path'])
sc = SparkContext()
glueContext = GlueContext(sc)
spark = glueContext.spark_session
job = Job(glueContext)
job.init(args['JOB_NAME'], args)

# Read from raw zone (CSV, inconsistent schemas handled by DynamicFrame)
raw_dyf = glueContext.create_dynamic_frame.from_options(
    connection_type="s3",
    connection_options={"paths": [args['source_path']]},
    format="csv",
    format_options={"withHeader": True, "separator": ","},
    transformation_ctx="raw_source"
)

# Apply schema resolving for inconsistent types in "amount" column
resolved_dyf = ResolveChoice.apply(
    frame=raw_dyf,
    choice="make_struct",          # wrap ambiguous types in a struct rather than failing
    transformation_ctx="resolve"
)

# Convert to DataFrame for richer transformations
df = resolved_dyf.toDF()

# Add partition columns from the event_date field
df = df.withColumn("year",  F.year(F.col("event_date")))
df = df.withColumn("month", F.month(F.col("event_date")))
df = df.withColumn("day",   F.dayofmonth(F.col("event_date")))

# Remove duplicates on order_id
df = df.dropDuplicates(["order_id"])

# Convert back to DynamicFrame and write as partitioned Parquet
curated_dyf = DynamicFrame.fromDF(df, glueContext, "curated_output")

glueContext.write_dynamic_frame.from_options(
    frame=curated_dyf,
    connection_type="s3",
    connection_options={
        "path": args['target_path'],
        "partitionKeys": ["year", "month", "day"]   # Hive-partitioned output
    },
    format="parquet",
    format_options={"compression": "snappy"},
    transformation_ctx="curated_output"
)

job.commit()
```

```bash
# Create and run the Glue job via CLI
aws glue create-job \
  --name raw-to-curated-orders \
  --role arn:aws:iam::123456789012:role/glue-etl-role \
  --command '{"Name": "glueetl", "ScriptLocation": "s3://my-scripts/glue_etl_raw_to_curated.py", "PythonVersion": "3"}' \
  --default-arguments '{
    "--source_path": "s3://company-data-lake/raw/orders/",
    "--target_path": "s3://company-data-lake/curated/orders/",
    "--job-bookmark-option": "job-bookmark-enable"
  }' \
  --glue-version "4.0" \
  --number-of-workers 10 \
  --worker-type "G.1X" \
  --region us-east-1
# job-bookmark-enable: Glue tracks which S3 files have been processed; 
#   only processes new files on subsequent runs — prevents reprocessing all raw data daily
```

> **Note:** Job bookmarks (`--job-bookmark-option: job-bookmark-enable`) are critical for incremental ETL jobs. Without bookmarks, every job run reprocesses all files in the source path — expensive and incorrect for daily incremental pipelines. Enable bookmarks unless you intentionally want full reprocessing (e.g., a backfill job).

---

### Example: Glue Workflow with Conditional Triggers

```bash
# Create a Glue Workflow
aws glue create-workflow \
  --name nightly-etl-pipeline \
  --region us-east-1

# Add a scheduled trigger to start the crawler at 2 AM
aws glue create-trigger \
  --name start-crawler-trigger \
  --workflow-name nightly-etl-pipeline \
  --type SCHEDULED \
  --schedule "cron(0 2 * * ? *)" \
  --actions '[{"CrawlerName": "raw-zone-crawler"}]' \
  --region us-east-1

# Add a conditional trigger to run ETL only after crawler succeeds
aws glue create-trigger \
  --name run-etl-after-crawler \
  --workflow-name nightly-etl-pipeline \
  --type CONDITIONAL \
  --predicate '{
    "Logical": "AND",
    "Conditions": [{
      "LogicalOperator": "EQUALS",
      "CrawlerName": "raw-zone-crawler",
      "CrawlState": "SUCCEEDED"
    }]
  }' \
  --actions '[{"JobName": "raw-to-curated-orders"}]' \
  --region us-east-1
# CrawlState SUCCEEDED: ETL job only runs if the crawler completed without errors
# This prevents the ETL from processing S3 data with stale or incorrect catalog metadata
```

---

## How to Decide

**Glue ETL vs. Lambda vs. EMR:**

| Factor | Glue ETL (Spark) | Lambda | EMR |
|---|---|---|---|
| Data volume | GBs to TBs | < 1 GB typically | TBs to PBs |
| Transform complexity | Medium-high (joins, aggregations) | Simple (per-record) | Complex, custom |
| Execution time | Minutes to hours | Up to 15 minutes | Hours |
| Cluster control | None (managed) | N/A | Full control |
| Custom libraries / frameworks | Standard Spark libs | Any (within Lambda limits) | Any (bootstrap actions) |
| Cost model | Per DPU-second | Per invocation | Per EC2 instance-hour |
| Operational overhead | Low | Very low | High |

Use **Glue** for: standard ETL transformations (50 MB to 1 TB), scheduled batch pipelines, raw-to-curated zone transforms.
Use **Lambda** for: lightweight event-driven transforms (< 15 minutes, small payloads), Firehose record transformation, per-record enrichment.
Use **EMR** for: custom Spark workloads with specialized libraries, extremely large datasets, persistent clusters with complex job scheduling, cost-optimized large-scale compute with spot instances.

**Glue Studio vs. custom PySpark:**

Use Glue Studio when: transform is standard (join, filter, aggregate, map columns) and the data engineer wants visual lineage. Use custom PySpark when: complex logic, custom windowing, DynamicFrame-specific operations, or the generated code is insufficient.

---

## How This Connects

- **S3 / Data Lake zones** — Glue ETL is the engine that moves data from the raw zone to the curated zone and from the curated zone to the presentation zone. Every data lake pipeline in AWS runs through Glue or EMR.
- **Glue Data Catalog** — Glue ETL jobs read table definitions from the Glue Catalog (source schema) and write updated partition metadata back to the Catalog (new partitions in the curated zone). Crawlers and ETL jobs share the same Catalog.
- **Athena** — Athena queries the Glue Catalog to find where curated Parquet files live in S3. Glue ETL creates those files. They are directly linked — Glue produces what Athena queries.
- **Redshift** — Glue ETL can load data directly into Redshift using the AWS Glue Redshift connector, using S3 as staging. This is an alternative to Redshift's native `COPY` command for ETL-orchestrated loads.
- **Step Functions / MWAA** — For complex pipelines that combine Glue jobs with Lambda functions, DMS, and other services, Step Functions or MWAA orchestrate at a higher level than Glue Workflows. Glue Workflows orchestrates Glue-internal resources; Step Functions orchestrates across all AWS services.
- **EventBridge** — Glue job state changes emit EventBridge events (job succeeded, job failed, job timeout). Route these to SNS (alert on failure) or Lambda (trigger downstream pipeline stages) for pipeline observability.

---

## Exam Traps

- **Glue Crawlers catalog metadata, not data**: Crawlers detect schemas and update the Glue Data Catalog. They do not move, copy, transform, or validate data. A question about detecting schema changes points to Crawlers; a question about transforming data points to Glue ETL jobs.
- **Job bookmarks prevent reprocessing but must be reset for backfills**: job bookmarks track which files have been processed. If you need to reprocess all historical data (backfill), you must reset the bookmark via the Glue console or CLI before running the job, or enable bookmarks only for incremental jobs.
- **DynamicFrames are not always better than DataFrames**: DynamicFrames handle schema inconsistencies well but have fewer optimization opportunities than native Spark DataFrames. For large, well-structured datasets, converting to a DataFrame after resolving schema issues and using DataFrame operations is more performant.
- **Glue Workflows orchestrate Glue resources only**: Glue Workflows can trigger Glue crawlers and Glue ETL jobs. They cannot trigger Lambda functions, ECS tasks, or other non-Glue resources directly. For cross-service orchestration, use Step Functions.
- **Glue Studio generates a starting point, not production-grade code**: generated PySpark code is correct but not always optimal. For performance-sensitive jobs on large datasets, review and optimize the generated script — especially for large joins and aggregations.

---

## Summary

- AWS Glue provides managed Apache Spark ETL (no cluster management), visual job design (Glue Studio), visual data preparation (DataBrew), pipeline orchestration (Glue Workflows), and data quality validation (Glue Data Quality).
- Glue ETL jobs are the primary mechanism for moving data from the raw zone to the curated zone in a data lake, applying deduplication, schema normalization, Parquet conversion, and partitioning.
- DynamicFrames handle inconsistent schemas and nested structures more gracefully than standard Spark DataFrames — the right choice for raw zone data with variable schemas.
- Job bookmarks track which S3 files have been processed, enabling incremental ETL that only processes new files rather than reprocessing the full raw zone on every run.
- Glue Workflows orchestrate Glue-internal resources (crawlers and ETL jobs) with conditional triggers — stopping downstream jobs if an upstream step fails to prevent bad data from propagating.
- Use Glue for standard ETL at GB-to-TB scale; Lambda for lightweight per-record transforms; EMR for custom Spark workloads requiring full cluster control or specialized libraries.

---

## Examples

A national logistics company needed to join shipment records from an Oracle database with customer data from a Salesforce export in S3. Their data engineer used Glue Studio's visual job designer to configure the join, apply date normalization, and write the output to S3 as Parquet in under two hours — without writing a single line of Spark code. The generated PySpark script was committed to CodeCommit for version control, and the Glue job was added to a Glue Workflow triggered nightly. Glue handled all cluster provisioning; the engineer never opened a terminal during the build.

A digital media company ran a Glue Workflow each morning at 5 AM: a Crawler first scanned overnight S3 uploads to update partition metadata in the Glue Catalog, then a conditional trigger fired a Raw-to-Curated ETL job only if the Crawler succeeded. A second conditional trigger fired a Presentation aggregation job only after the ETL job succeeded. When the ETL job failed one morning due to a malformed source file, the aggregation job never ran — the BI team received an error alert within five minutes rather than incorrect dashboard data they might not have noticed until a business meeting.

A healthcare analytics startup had business analysts who needed to clean incoming CSV exports from insurance providers — removing duplicates, standardizing date formats, masking SSN fields — without writing Python. They used Glue DataBrew to build a reusable recipe: 12 transformation steps applied via point-and-click. The recipe ran as a scheduled DataBrew job each weekday morning, delivering clean Parquet files to the curated zone. When a new insurance provider sent data with slightly different column names, the analyst updated two steps in the recipe through the console — no engineering ticket required.

---

## Think About It

1. Why would you choose a Glue Spark ETL job over a Lambda function for a transformation that processes 50 GB of data, even though Lambda is simpler to deploy and cheaper per invocation for small payloads?
2. A Glue ETL job processes a day's worth of data and writes it to the curated zone. Without job bookmarks enabled, what happens on the second run — and what is the operational consequence for the downstream Athena tables?
3. How would you decide between Glue DataBrew and Glue Studio for a new data preparation task? What questions would you ask to determine which tool fits the situation?
4. Glue DynamicFrames handle schema evolution, but converting raw records with 20 different schema variants into a consistent curated schema is still complex. What strategy would you use to handle schema evolution in a long-running data lake where the source schema changes quarterly?
5. Your Glue ETL job takes 45 minutes on 10 G.1X DPUs. A business requirement calls for it to complete within 20 minutes. What are three different approaches to reduce execution time, and what are the trade-offs of each?

---

## Quick Check

**Q1.** A Glue ETL job is configured to run nightly and processes all files in the S3 raw zone on every run, even files from previous days that were already processed. What configuration change would make the job process only new files each night?

- A) Set `--job-bookmark-option: job-bookmark-disable` to enable incremental mode
- B) Set `--job-bookmark-option: job-bookmark-enable` so Glue tracks and skips already-processed files
- C) Configure a Glue Crawler to move processed files to an archive prefix before the job runs
- D) Set a time-based S3 filter in the `connection_options` to skip files older than 24 hours

**Answer: B** — Job bookmarks (`job-bookmark-enable`) cause Glue to track which S3 objects (and offsets within objects) have already been processed. On subsequent runs, Glue skips those objects and processes only new ones. A is incorrect — `job-bookmark-disable` turns bookmarks off (the current behavior). C is incorrect — Crawlers catalog metadata; they don't move files. D is not a Glue feature.

---

**Q2.** What is the primary difference between Glue DataBrew and Glue Studio?

- A) DataBrew runs Spark on EMR; Glue Studio runs Spark on Glue managed compute
- B) DataBrew is a point-and-click tool for analysts with no coding required; Glue Studio is a visual code generator for engineers
- C) DataBrew writes to Redshift only; Glue Studio writes to S3 and Redshift
- D) DataBrew requires pre-defined schemas; Glue Studio handles schema-on-read data

**Answer: B** — DataBrew is purpose-built for non-engineers: a visual interface with 250+ pre-built transformations. Glue Studio generates PySpark code visually for engineers who want visual lineage but may need to edit the generated script. Both write output to S3. Both handle variable schemas. The key differentiator is the intended user and whether code generation is involved.

---

**Q3.** A Glue ETL job fails with a schema mismatch error because the source CSV has a column that sometimes contains integers and sometimes contains strings. Which Glue feature is designed to handle this?

- A) Glue DynamicFrame with `ResolveChoice` to handle ambiguous column types
- B) Glue Crawler schema update policy set to `NONE`
- C) Glue Studio's automatic type inference during visual job design
- D) Converting the DynamicFrame to a Spark DataFrame immediately after reading

**Answer: A** — Glue DynamicFrames support columns with mixed or ambiguous types. `ResolveChoice` resolves the ambiguity — either casting to a single type, creating a struct with both representations, or projecting to a specific type. Standard Spark DataFrames require a single consistent type per column and will fail or produce nulls on mixed-type data. B controls catalog behavior for schema changes, not ETL execution. C infers types but doesn't resolve conflicts at runtime. D would fail on the mixed-type column before conversion.

---

## What's Next

The next lesson covers Amazon Athena — the serverless SQL query engine that runs directly against the curated zone Glue creates. Understanding Athena's cost model, partitioning benefits, and workgroup configuration is essential for building cost-efficient analytics on top of your data lake.
