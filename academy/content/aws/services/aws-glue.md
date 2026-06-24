---
title: "AWS Glue"
type: content
estimated_minutes: 16
cert_tags: ["AIF-C01", "SAA-C03", "SOA-C03"]
---

# AWS Glue

## Overview

AWS Glue is a fully managed, serverless **data integration (ETL)** service that discovers, catalogs, cleans, transforms, and moves data between sources for analytics and machine learning. It removes the heavy lifting of provisioning and managing ETL infrastructure, letting you prepare data with little or no server management. This *service reference* lesson covers the Glue Data Catalog, crawlers, ETL jobs, and what each certification expects.

Glue matters because raw data is rarely analysis-ready: it's scattered across stores, in inconsistent formats, with unknown schemas. Before you can query it with Athena, load it into Redshift, or train a model, you must discover, catalog, and transform it — and doing that with self-managed Spark clusters is operationally costly. Glue provides this as a serverless service. The core mental model has two parts: the **Glue Data Catalog** (a central metadata repository — the metastore that Athena, Redshift Spectrum, EMR, and Lake Formation all share) and **Glue ETL jobs** (serverless Spark or Python jobs that transform data). Crawlers populate the catalog automatically by inferring schemas from your data.

---

## How It Works

- **Data Catalog** — a persistent metadata store of **databases and tables** describing your data's schema, format, and S3 (or other) location. It is the **central schema source** shared by Athena, Redshift Spectrum, EMR, and Lake Formation, so cataloging data once makes it queryable everywhere.
- **Crawlers** — scan data sources (S3, JDBC databases, etc.), **infer schemas and partitions**, and create/update Data Catalog tables automatically, on demand or on a schedule.
- **ETL jobs** — serverless **Apache Spark** (Scala/PySpark) or **Python shell** jobs that read from sources, transform (clean, join, deduplicate, convert formats — e.g., CSV → Parquet), and write to targets. **Glue Studio** offers a visual job builder, and **DynamicFrames** handle semi-structured/evolving schemas.
- **Glue triggers and workflows** orchestrate crawlers and jobs into pipelines; **job bookmarks** track processed data to avoid reprocessing.

For data preparation without code, **Glue DataBrew** offers a visual data-cleaning interface.

---

## Key Features

- **Serverless ETL** (Spark/Python) with no clusters to manage; scales automatically.
- **Data Catalog** as the shared metastore for the AWS analytics stack.
- **Crawlers** for automatic schema and partition discovery.
- **Glue Studio** (visual ETL), **DataBrew** (visual prep), and **DynamicFrames** for messy/evolving data.
- **Job bookmarks** for incremental processing and **workflows/triggers** for orchestration.
- **Streaming ETL** to transform data from Kinesis/MSK in near real time.

---

## Configuration Reference

- **Run a crawler** to populate the Data Catalog from your S3/JDBC sources, then query via Athena or load via jobs.
- **Build ETL jobs** in Glue Studio or code; convert to **columnar (Parquet/ORC)** and **partition** output to optimize downstream Athena/Redshift cost.
- **Use job bookmarks** for incremental runs and **workflows** to orchestrate crawl → transform → load.
- **Control access** with IAM and **Lake Formation** (which builds on the Data Catalog for fine-grained, table/column-level permissions), and encrypt with KMS.

---

## Operations and Troubleshooting

- **Athena/Redshift can't see the data.** The Data Catalog table or partitions may be missing — run/schedule a **crawler**, or add partitions; the catalog is the shared schema source.
- **Jobs slow or costly.** Right-size **DPUs/workers**, use job bookmarks to avoid reprocessing, push filters down, and write partitioned columnar output.
- **Reprocessing the same data.** Enable **job bookmarks**.
- **Schema drift.** Use **DynamicFrames** and crawler updates to handle evolving/semi-structured schemas.

---

## Integrations

Glue's **Data Catalog** is the shared metastore for **Amazon Athena**, **Redshift Spectrum**, **Amazon EMR**, and **Lake Formation**; its **ETL jobs** read/write **S3**, JDBC databases (**RDS/Aurora/Redshift**), and stream from **Kinesis/MSK**; it's secured with **IAM/Lake Formation** and **KMS**; orchestrated with **Step Functions**/workflows; and feeds **data lakes** and **ML pipelines** (preparing features for SageMaker). It is the standard serverless ETL and cataloging layer of the AWS analytics ecosystem.

---

## Pricing and Cost Considerations

Glue bills ETL and crawler usage by **Data Processing Units (DPUs) per hour** (per-second billing with a minimum), and the **Data Catalog** charges a small fee for stored objects and requests above a free tier; DataBrew and other features bill separately. Because cost scales with DPU-hours, the levers are right-sizing workers, using **job bookmarks** to process only new data, efficient transforms, and producing optimized (columnar/partitioned) output that lowers downstream Athena/Redshift cost too. Exact prices vary by Region and job type.

---

## Exam Relevance

**AIF-C01:** Know Glue as serverless ETL/data preparation that catalogs and transforms data for analytics and ML. Conceptual.

**SAA-C03:** Know the **Glue Data Catalog** as the shared metastore for Athena/Redshift Spectrum/EMR, crawlers for schema discovery, serverless ETL jobs, and Glue's role in building a data lake. Design depth.

**SOA-C03:** Operate ETL — crawlers/scheduling, job bookmarks, DPU sizing, and workflow orchestration. Operations depth.

---

## Summary

AWS Glue is serverless data integration with two pillars: the **Data Catalog** (a central, shared metastore — used by Athena, Redshift Spectrum, EMR, and Lake Formation — populated automatically by **crawlers** that infer schemas/partitions) and **ETL jobs** (serverless Spark/Python transforms, built in code or visually in Glue Studio, with DynamicFrames for messy data and job bookmarks for incremental processing). It prepares and converts data (e.g., to partitioned Parquet) for analytics and ML, orchestrated by workflows and secured with IAM/Lake Formation/KMS. The recurring exam points are the Data Catalog as the shared schema source, crawlers for discovery, and serverless ETL feeding the data lake.

---

## Quick Check

1. What are the two pillars of Glue, and which one is the shared metastore for Athena/Redshift Spectrum/EMR?
2. What does a crawler do?
3. Why convert data to partitioned Parquet in a Glue job, and how does that affect downstream Athena cost?
4. What do job bookmarks prevent?
5. How does Lake Formation relate to the Glue Data Catalog?

---

## What's Next

Pair this with **Amazon Athena** and **Amazon Redshift** (consumers of the catalog), **Amazon S3** (the data lake), and **Amazon Kinesis** (streaming ETL sources).
