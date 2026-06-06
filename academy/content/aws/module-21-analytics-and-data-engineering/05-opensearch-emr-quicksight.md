---
title: "OpenSearch, EMR, and QuickSight"
type: content
estimated_minutes: 12
cert_tags: ["SAA-C03", "SAP-C02"]
---

# OpenSearch, EMR, and QuickSight

## Overview

Three more analytics services complete the AWS analytics picture. Amazon OpenSearch Service handles full-text search and log analytics — queries that SQL-based tools handle poorly. Amazon EMR runs custom big data processing frameworks (Spark, Hadoop, Hive, Flink) when Glue's managed Spark environment doesn't meet requirements. Amazon QuickSight is the cloud-native BI service for building interactive dashboards and reports from data in Redshift, Athena, S3, and other sources.

Each service exists because a different query pattern demands a different engine. Relational SQL (Athena, Redshift) is optimized for structured aggregations and JOINs. Full-text search (OpenSearch) is optimized for relevance-ranked keyword retrieval across free-text fields. Custom Spark workloads (EMR) are optimized for distributed computation with arbitrary libraries. Visualization (QuickSight) sits above the query layer, consuming results and presenting them to business users. Understanding which pattern belongs to which service is the core exam skill.

For the SAA exam, understand OpenSearch use cases (search, log analytics), EMR as the custom Spark/Hadoop platform, and QuickSight as the BI layer. SAP adds OpenSearch fine-grained access control, EMR Serverless, EMR cost optimization with spot instances, QuickSight SPICE, and ML Insights. After this lesson, you will be able to identify the correct analytics service for any query pattern.

---

## Core Concepts

### Amazon OpenSearch Service

Amazon OpenSearch Service is a managed search and analytics engine based on OpenSearch (the Apache-licensed fork of Elasticsearch). It indexes documents and provides: full-text search with relevance scoring, structured queries (range filters, term filters, aggregations), and near-real-time analytics on indexed data.

**Primary use cases**:
- **Full-text search**: customer-facing product search, document search, knowledge base search. OpenSearch scores results by relevance (BM25 algorithm) — not possible with SQL `LIKE` queries.
- **Log analytics (observability)**: ingest application logs, VPC Flow Logs, CloudTrail events via Kinesis Data Firehose or Logstash. OpenSearch Dashboards provides a Kibana-compatible visualization layer for log exploration.
- **Security analytics / SIEM**: index security events, detect anomalies, build correlation rules.

**OpenSearch Serverless**: eliminates cluster management. OpenSearch Serverless automatically provisions and scales collection capacity. Use for intermittent search workloads where managing index shard count and node sizing is undesirable.

**Integration**: Kinesis Data Firehose delivers streaming data directly to OpenSearch as a native destination. Lambda can transform records before delivery. This is the standard streaming log ingestion path: application → CloudWatch → Kinesis Firehose → Lambda transform → OpenSearch.

---

### Amazon EMR (Elastic MapReduce)

EMR runs distributed data processing frameworks — Apache Spark, Hadoop, Hive, Presto, HBase, Apache Flink, Apache Ranger — on managed EC2 clusters or serverlessly. AWS manages the cluster bootstrap, framework installation, and monitoring. You manage: cluster sizing, framework configuration, job submission, and spot instance strategy.

**When to use EMR over Glue**:
- Your workload requires a specific Apache Spark version or a custom Spark library not available in Glue's managed environment
- You need to install custom tools via bootstrap actions (bioinformatics libraries, custom JARs, ML frameworks)
- Your job runs for hours and you want to optimize cost using EC2 Spot instances (up to 90% savings vs. On-Demand)
- You need full cluster access (SSH, configuration tuning, custom Hadoop properties)
- You're migrating an existing on-premises Hadoop workload that needs identical cluster behavior

**EMR Serverless**: runs Spark and Hive jobs without provisioning or managing clusters. Submit a job with the driver and worker resource requirements; EMR Serverless provisions workers, runs the job, and terminates them when complete. No cluster to manage, no idle compute. Billed per vCPU-second and GB-second of worker compute. Best for: teams that want Spark without Glue's managed constraints but also without EMR's cluster management overhead.

**Spot instances for EMR cost optimization**: use Spot instances for task nodes (the worker fleet). Core nodes (which store HDFS data) should run On-Demand for data durability. Spot interruption handling: EMR automatically terminates a Spot task node and redistributes its work to surviving nodes — use `TASK` instance group (not `CORE`) for Spot instances.

---

### Amazon QuickSight

QuickSight is a cloud-native BI service for building interactive dashboards and analyses. It connects to Redshift, Athena, RDS, Aurora, S3 (via Athena), Salesforce, and many other sources. Pricing is per-user subscription — no server infrastructure to manage.

**SPICE (Super-fast Parallel In-memory Calculation Engine)**: QuickSight's in-memory data cache. Import datasets into SPICE for fast dashboard refresh without executing live database queries on every user interaction. SPICE data is refreshed on a schedule (hourly, daily) or triggered via API. Use SPICE when: dashboards are shared with many users (live queries at scale would load the database), data doesn't need to be real-time (daily refresh is acceptable), or you want consistent performance regardless of source database load.

**ML Insights**: QuickSight automatically applies ML to dashboards: anomaly detection (flags unexpected values), forecasting (projects time-series trends), and narrative auto-generation (writes natural language summaries of chart data). No ML expertise required — ML Insights runs on existing dashboard data without additional configuration.

**Row-level security (RLS)**: define which users see which rows in a shared dashboard dataset. An RLS dataset maps user email addresses or group names to dimension values (e.g., region=EU for the EU team). Users see only their authorized subset of data without separate datasets per team.

---

## Configuration Reference

### Example: OpenSearch Service Domain with Kinesis Firehose Ingestion

```bash
# Create an OpenSearch Service domain
aws opensearch create-domain \
  --domain-name prod-log-analytics \
  --engine-version 'OpenSearch_2.11' \
  --cluster-config '{
    "InstanceType": "r6g.large.search",
    "InstanceCount": 3,
    "ZoneAwarenessEnabled": true,
    "ZoneAwarenessConfig": {"AvailabilityZoneCount": 3},
    "DedicatedMasterEnabled": true,
    "DedicatedMasterType": "r6g.large.search",
    "DedicatedMasterCount": 3
  }' \
  --ebs-options '{
    "EBSEnabled": true,
    "VolumeType": "gp3",
    "VolumeSize": 100
  }' \
  --vpc-options '{
    "SubnetIds": ["subnet-0abc", "subnet-0def", "subnet-0ghi"],
    "SecurityGroupIds": ["sg-0opensearch"]
  }' \
  --encrypt-at-rest '{"Enabled": true}' \
  --node-to-node-encryption-options '{"Enabled": true}' \
  --advanced-security-options '{
    "Enabled": true,
    "InternalUserDatabaseEnabled": false,
    "MasterUserOptions": {
      "MasterUserARN": "arn:aws:iam::123456789012:role/opensearch-admin-role"
    }
  }' \
  --region us-east-1
# ZoneAwarenessEnabled + 3 AZs: distributes data replicas across AZs for HA
# DedicatedMasterEnabled: separates cluster state management from data nodes
# VPC placement: OpenSearch should never be publicly accessible
```

---

### Example: EMR Cluster with Spot Task Nodes and S3-Based Spark Job

```bash
# Create an EMR cluster with On-Demand core nodes and Spot task nodes
aws emr create-cluster \
  --name "genomics-spark-cluster" \
  --release-label emr-7.0.0 \
  --applications Name=Spark Name=Hadoop \
  --ec2-attributes '{"KeyName": "my-keypair", "SubnetId": "subnet-0abc123"}' \
  --instance-groups '[
    {
      "Name": "Master",
      "Market": "ON_DEMAND",
      "InstanceRole": "MASTER",
      "InstanceType": "m5.xlarge",
      "InstanceCount": 1
    },
    {
      "Name": "Core",
      "Market": "ON_DEMAND",
      "InstanceRole": "CORE",
      "InstanceType": "r5.2xlarge",
      "InstanceCount": 2
    },
    {
      "Name": "Task",
      "Market": "SPOT",
      "InstanceRole": "TASK",
      "InstanceType": "r5.2xlarge",
      "InstanceCount": 8,
      "BidPrice": "0.25"
    }
  ]' \
  --bootstrap-actions '[{
    "Name": "install-bioinformatics-libs",
    "Path": "s3://my-scripts/bootstrap/install_libs.sh"
  }]' \
  --log-uri "s3://my-emr-logs/" \
  --service-role EMR_DefaultRole \
  --auto-terminate \
  --region us-east-1
# ON_DEMAND core nodes: protect HDFS data from Spot interruptions
# SPOT task nodes: up to 90% cost savings on worker compute for fault-tolerant Spark jobs
# bootstrap-actions: install custom libraries before cluster is available for jobs
# auto-terminate: cluster shuts down after all steps complete — transient cluster pattern
```

---

## How to Decide

**Choosing the right analytics query pattern → service:**

| Query pattern / use case | Service |
|---|---|
| Full-text search (relevance ranking) | OpenSearch Service |
| Log exploration and analytics | OpenSearch Service |
| Ad-hoc SQL on S3 data lake | Athena |
| Repeated complex SQL on structured data | Redshift |
| Custom Spark with specific libraries/versions | EMR |
| Standard ETL (raw → curated zone) | Glue |
| Streaming aggregations, windowing | Kinesis Flink (Managed Apache Flink) |
| BI dashboards for business users | QuickSight |
| ML model training at scale | SageMaker (Training Jobs) |

**Glue vs. EMR: the library and control question:**

Use Glue when: the transform is standard (join, aggregate, convert format) and works with Glue's managed Spark version and available libraries. Switch to EMR when: you need a specific Spark version (Glue lags behind the latest), a Python library that can't be installed in Glue's environment, or full cluster control for performance tuning.

**QuickSight SPICE vs. Direct Query:**

Use SPICE when: dashboards are shared with many users (10+), the source database cannot handle concurrent queries from all users simultaneously, or data freshness of hourly/daily is acceptable. Use Direct Query when: data must be real-time (financial dashboards, operational metrics), or the dataset is too large for SPICE limits (10 GB per dataset in Standard edition).

---

## How This Connects

- **Kinesis Data Firehose** — The standard streaming ingestion path to OpenSearch. Firehose buffers log events and delivers them to OpenSearch in near-real-time. Lambda transforms (embedded in Firehose) can parse, enrich, or filter records before indexing.
- **S3** — EMR reads input data from S3 and writes output back to S3. This transient cluster pattern (create → run → terminate) is the standard for cost-efficient EMR batch jobs. S3 as the durable store decouples cluster lifetime from data lifetime.
- **Glue Data Catalog** — EMR can use the Glue Catalog as its Hive metastore, sharing table definitions with Athena and Glue ETL. A table defined in Glue is queryable from Hive on EMR, Athena, and Glue ETL simultaneously.
- **Redshift / Athena** — QuickSight's primary data sources. SPICE imports from Athena query results or Redshift tables. Direct Query mode runs live Athena or Redshift SQL on each dashboard refresh.
- **CloudWatch** — OpenSearch, EMR, and QuickSight all publish operational metrics to CloudWatch. OpenSearch cluster health (yellow/red status, JVM pressure), EMR step duration and Spark application metrics, and QuickSight SPICE refresh failures all surface in CloudWatch.
- **VPC** — OpenSearch domains and EMR clusters should run inside a VPC, accessible only from within the VPC or via VPN/Direct Connect. Public internet exposure for either service is a security risk and not recommended for production.

---

## Exam Traps

- **OpenSearch is not a SQL database**: OpenSearch queries use a JSON query DSL (Domain-Specific Language) or OpenSearch SQL, not standard ANSI SQL. Athena is for SQL over structured S3 data. OpenSearch is for full-text search and log analytics where relevance ranking and near-real-time indexing matter.
- **EMR Spot instances should only be used for TASK nodes, not CORE nodes**: CORE nodes store HDFS data. If a CORE Spot instance is terminated by AWS (due to capacity reclamation), HDFS blocks stored on that node are lost, potentially corrupting the job. TASK nodes are pure compute — Spot interruption causes task reassignment without data loss.
- **QuickSight SPICE has dataset size limits**: the Standard edition supports 10 GB per SPICE dataset; Enterprise edition supports larger datasets. Trying to import a 500 GB table into SPICE fails. For large datasets, use Direct Query mode or pre-aggregate in Redshift before importing into SPICE.
- **EMR Serverless is not the same as Glue**: EMR Serverless runs Spark/Hive without cluster management but still uses the EMR framework (not Glue's managed environment). You submit jobs with full Spark configuration control. Glue is opinionated and managed; EMR Serverless is flexible and unmanaged.
- **OpenSearch Dashboards ≠ Kibana**: OpenSearch Dashboards is the open-source fork of Kibana shipped with OpenSearch. It is not Kibana. Some security configurations, plugins, and APIs differ. Teams migrating from self-managed Elasticsearch + Kibana should validate dashboard compatibility before migrating to OpenSearch Service.

---

## Summary

- Amazon OpenSearch Service is the correct choice for full-text search (relevance-ranked keyword queries) and log analytics — use cases where SQL-based tools perform poorly or are not designed for.
- Amazon EMR provides direct control over Spark, Hadoop, Hive, and other frameworks — use it when Glue's managed environment is insufficient because of custom libraries, specific framework versions, or cost-optimized long-running jobs with Spot instances.
- EMR Serverless eliminates cluster management while preserving full Spark configuration control — a middle ground between Glue's opinionated managed environment and EMR's full cluster control.
- QuickSight is the BI layer — subscription-based, server-free dashboards that connect to Redshift, Athena, and other sources. SPICE caches data in-memory for fast, scale-independent dashboard refresh.
- QuickSight ML Insights automatically surfaces anomalies, forecasts, and narrative summaries from dashboard data without requiring ML expertise.
- The key skill is matching query pattern to service: structured SQL → Athena/Redshift, full-text → OpenSearch, custom compute → EMR, business visualization → QuickSight.

---

## Examples

A ride-sharing company's operations team needed to search driver feedback comments for safety keyword mentions across millions of free-text submissions. Athena with SQL `LIKE` queries performed poorly — full-table scans with no relevance ranking. They indexed the comments in OpenSearch and built a dashboard in OpenSearch Dashboards showing keyword frequency by city and week, with full-text search enabling analysts to find semantically related comments (e.g., "braking" matching "brake," "brakes," "braked"). The OpenSearch index provided sub-second results with relevance ranking — the right tool for the right query pattern.

A genomics research organization needed to run a custom Apache Spark pipeline using specialized bioinformatics libraries (`GATK`, `pysam`, a custom genomic interval library) not available in Glue's managed environment, against 200 TB of sequencing data in S3. They provisioned an EMR cluster with the required Spark version, installed their libraries via a bootstrap action, and used 50 Spot task instances to cut compute costs by 68% versus On-Demand. The cluster terminated automatically after the pipeline completed. The transient cluster pattern — create for a job, terminate when done — made cost predictable and eliminated the operational overhead of a persistent cluster.

A retail chain's merchandise VP wanted a self-service dashboard showing weekly sales by product category and store region, refreshed daily from a Redshift data warehouse, accessible to 40 non-technical stakeholders without engineering involvement. The data team connected QuickSight to Redshift, imported key aggregated tables into SPICE (50 MB total — well within limits), and published a parameterized dashboard. The 40 users could filter by date range and region without running Redshift queries directly. QuickSight ML Insights automatically flagged an unexpected regional sales dip that none of the analysts had noticed, triggering an investigation that identified a mis-configured promotion.

---

## Think About It

1. Why is OpenSearch a better fit than Athena for a log analytics platform where engineers search log messages by keyword in near-real time — even though both can query data stored in S3?
2. A team wants to run a 100-node Spark workload inside Glue instead of EMR to "keep everything in Glue." What technical and cost factors would you consider, and at what scale does EMR become the more appropriate choice?
3. Your QuickSight dashboard is slow to load because it runs live Redshift queries on every user interaction, and 50 users open it simultaneously each morning. How would SPICE address this, and what are its trade-offs?
4. An EMR cluster's task nodes are running on Spot instances. AWS reclaims 10 of the 20 Spot task nodes mid-job. What happens to the running Spark job, and how does EMR handle this?
5. You have a log analytics requirement: engineers need to search application logs by keyword, filter by time range, and view aggregated error trends — all in near real time. Design the ingestion-to-visualization pipeline using the appropriate AWS services.

---

## Quick Check

**Q1.** A company wants to build a customer-facing product search that returns results ranked by relevance to the search term. Which AWS analytics service is most appropriate?

- A) Amazon Athena with LIKE queries on S3 Parquet data
- B) Amazon Redshift with full-text search extensions
- C) Amazon OpenSearch Service
- D) Amazon QuickSight with ML Insights

**Answer: C** — OpenSearch is purpose-built for relevance-ranked full-text search using the BM25 scoring algorithm. SQL-based tools (Athena, Redshift) cannot produce relevance-ranked results — `LIKE` queries return rows that match but cannot rank by how well they match. QuickSight is a BI visualization tool, not a search engine.

---

**Q2.** A data science team needs to run a custom Apache Spark ML pipeline that uses a specific version of PySpark and a proprietary genomics library distributed as a Python package. Which service is the best fit?

- A) AWS Glue with a custom Python library uploaded to S3
- B) Amazon EMR with a bootstrap action to install the library
- C) AWS Lambda with the PySpark library in a Docker container
- D) Amazon SageMaker Processing Job with a custom Spark container

**Answer: B** — EMR gives direct cluster control: choose any EMR release label (and its corresponding Spark version), install any library via a bootstrap action shell script at cluster startup, and configure Spark settings freely. A is partially possible (Glue supports custom Python libraries via S3 wheel files) but has Spark version constraints and cannot match specific genomics library requirements. C is incorrect — PySpark workloads require distributed cluster compute, not Lambda. D is technically possible but not the standard pattern for large-scale Spark pipelines.

---

**Q3.** A QuickSight dashboard refreshes live Redshift data on every user interaction. With 30 users opening the dashboard simultaneously each morning, the Redshift cluster is showing high CPU utilization. What is the recommended solution?

- A) Add more Redshift compute nodes to handle the concurrent queries
- B) Import the dataset into QuickSight SPICE and set a daily refresh schedule
- C) Switch from Redshift to Athena as the QuickSight data source
- D) Enable QuickSight ML Insights to reduce query frequency

**Answer: B** — SPICE imports data into QuickSight's in-memory engine, serving all user interactions from SPICE without generating additional Redshift queries. A daily refresh keeps data current. A solves the symptom (add capacity) without addressing the root cause. C would move the query load to Athena, not eliminate it. D is incorrect — ML Insights is a visualization feature, not a query optimization.

---

## What's Next

The final lesson in this module covers data engineering pipeline orchestration — AWS Step Functions, Amazon MWAA (Managed Airflow), data quality validation, and AWS Lake Formation access control. These are the operational and governance layers that turn individual analytics components into reliable, auditable production data platforms.
