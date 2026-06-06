---
title: "Data Engineering Pipelines and Orchestration"
type: content
estimated_minutes: 12
cert_tags: ["SAA-C03", "SAP-C02"]
---

# Data Engineering Pipelines and Orchestration

## Overview

Building individual analytics services is one challenge. Wiring them into reliable, observable, governed data pipelines is another. This lesson covers the AWS services that orchestrate multi-step data workflows, enforce data quality, and control access to the data lake — turning a collection of ETL jobs and crawlers into a production-grade data platform.

The gap this lesson addresses is operational reliability. A data pipeline that runs a Glue job and a COPY into Redshift but has no orchestration, no data quality gates, and no access control will eventually fail silently — propagating bad data to dashboards, running steps out of order after partial failures, or exposing restricted data to the wrong teams. AWS Step Functions, Amazon MWAA, Glue Data Quality, and Lake Formation are the tools that close these gaps.

For the SAA exam, understand Step Functions for pipeline orchestration, MWAA for Airflow-based workflows, and Lake Formation for fine-grained data access. SAP adds MWAA operator integration depth, Lake Formation column-level and row-level security implementation, and designing idempotent pipeline steps for safe retries. After this lesson, you will be able to design a production-grade data pipeline with orchestration, quality gates, and governed access.

---

## Core Concepts

### AWS Step Functions for Data Pipelines

Step Functions Standard Workflows are increasingly the preferred orchestrator for AWS-native data pipelines. The state machine model maps naturally to ETL pipelines: each step is a state, each step's outcome determines the next, and failures route to error-handling states rather than crashing the pipeline silently.

**Data pipeline state machine pattern**:
1. Start Glue Crawler → wait for completion
2. Check crawler status — if FAILED, route to alert state and stop
3. Start Glue ETL job → wait for completion (Step Functions integrates with Glue natively — no Lambda needed)
4. Check job status — if FAILED, route to alert and stop
5. Run data quality checks (Lambda or Glue Data Quality evaluation)
6. Conditional: if quality passed → run COPY to Redshift, if failed → alert and stop
7. Send EventBridge notification on success

**Why Step Functions over scheduling cron jobs**: cron jobs (Lambda scheduled by EventBridge, MWAA DAGs) run steps regardless of prior step success. Step Functions executes steps conditionally — a failed Glue job stops the pipeline at that point, rather than running the COPY command on bad or incomplete data.

**Execution history**: every Step Functions Standard Workflow execution records the full history — each state entered, its input and output, any errors — retained for 90 days. When a pipeline fails at 3 AM, the execution history shows exactly which step failed, what the input was, and what error was returned.

---

### Amazon MWAA (Managed Workflows for Apache Airflow)

MWAA is fully managed Apache Airflow — the most widely used open-source workflow orchestrator in data engineering. MWAA eliminates the operational burden of managing Airflow's scheduler, webserver, metadata database, and worker fleet. DAGs (Directed Acyclic Graphs) are stored in S3; MWAA picks them up automatically.

**Airflow operators for AWS services**: `GlueJobOperator`, `GlueCrawlerOperator`, `EmrAddStepsOperator`, `RedshiftSQLOperator`, `S3KeySensor`, `AthenaOperator`, and dozens more. The operator ecosystem is extensive — teams can trigger any AWS service step from an Airflow DAG.

**When MWAA beats Step Functions**: if your team already has Airflow DAGs (on-premises, self-managed, or another cloud), MWAA preserves that investment — existing DAGs run on MWAA without rewriting. If you need Airflow-specific features (XCom for inter-task data passing, dynamic DAG generation, a large third-party operator ecosystem), MWAA is the right choice.

**When Step Functions beats MWAA**: for greenfield AWS pipelines with no existing Airflow investment, Step Functions is simpler to set up (no scheduler infrastructure), integrates more deeply with AWS services via SDK integrations, and requires no Python DAG authoring skills. For workflows that primarily call AWS service APIs (Glue, Lambda, ECS, SNS), Step Functions is more natural.

---

### Glue Data Quality

Glue Data Quality (powered by Deequ) validates datasets against defined rules within ETL jobs or as standalone check jobs. Rule types:

- **Completeness**: `IsComplete("customer_id")` — no nulls in required fields
- **Uniqueness**: `IsUnique("order_id")` — no duplicate keys
- **Range check**: `ColumnValues("amount") BETWEEN 0 AND 100000` — values within business bounds
- **Pattern match**: `Matches("email", "^[^@]+@[^@]+\.[^@]+$")` — format validation
- **Referential integrity**: `ReferentialIntegrity("product_id", "s3://curated/products", "id")` — foreign key exists

**Integration with pipeline orchestration**: a Glue Data Quality check can be embedded directly in a Glue ETL job or run as a separate `RunDataQualityRulesetEvaluationRun` job step. In Step Functions, a Conditional state evaluates the quality results — if critical checks fail, route to the compensation path (alert, quarantine, stop). This is the "data quality gate" pattern: bad data is blocked before reaching downstream consumers.

---

### AWS Lake Formation

Lake Formation provides fine-grained governance over the Glue Data Catalog and the S3 data lake. It implements a grant-based permission model on top of IAM:

**Table-level grants**: grant a specific IAM principal `SELECT` on a specific Glue database and table.

**Column-level grants**: grant access to only a subset of columns. An analyst granted `SELECT` on `orders` with only `[order_id, amount, status]` cannot see `customer_name` or `address` columns even if they physically exist in the Parquet files.

**Row-level security (data filters)**: define a filter that limits visible rows. `customer_region = 'EU'` applied to the EU analytics role means queries only return EU rows, regardless of what `WHERE` clause the analyst writes.

**Lake Formation + Athena enforcement**: when a user runs an Athena query on a Lake Formation-governed table, Athena's Lake Formation integration enforces the grants — adding implicit WHERE clauses for row filters and projecting only authorized columns. The enforcement is transparent to the query engine.

**LF-Tags (attribute-based access control)**: assign tags (`sensitivity=PII`, `classification=confidential`) to catalog objects and define LF-Tag policies. All tables tagged `sensitivity=PII` can be governed with one policy instead of per-table grants — scalable governance for large data catalogs.

---

## Configuration Reference

### Example: Step Functions State Machine for ETL Pipeline

```json
{
  "Comment": "Nightly ETL pipeline: crawl → transform → quality check → load",
  "StartAt": "RunGlueCrawler",
  "States": {
    "RunGlueCrawler": {
      "Type": "Task",
      "Resource": "arn:aws:states:::glue:startCrawler.sync",
      "Parameters": {
        "Name": "raw-zone-crawler"
      },
      "Catch": [{
        "ErrorEquals": ["States.ALL"],
        "Next": "NotifyPipelineFailure"
      }],
      "Next": "RunETLJob"
    },
    "RunETLJob": {
      "Type": "Task",
      "Resource": "arn:aws:states:::glue:startJobRun.sync",
      "Parameters": {
        "JobName": "raw-to-curated-orders",
        "Arguments": {
          "--source_path.$": "$.sourcePath",
          "--target_path.$": "$.targetPath"
        }
      },
      "Catch": [{
        "ErrorEquals": ["States.ALL"],
        "Next": "NotifyPipelineFailure"
      }],
      "Next": "CheckDataQuality"
    },
    "CheckDataQuality": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:us-east-1:123456789012:function:run-dq-checks",
      "ResultPath": "$.qualityResult",
      "Next": "EvaluateQuality"
    },
    "EvaluateQuality": {
      "Type": "Choice",
      "Choices": [{
        "Variable": "$.qualityResult.passed",
        "BooleanEquals": true,
        "Next": "LoadToRedshift"
      }],
      "Default": "QuarantineBadData"
    },
    "LoadToRedshift": {
      "Type": "Task",
      "Resource": "arn:aws:states:::redshift-data:executeStatement.sync",
      "Parameters": {
        "ClusterIdentifier": "prod-analytics",
        "Database": "analytics",
        "DbUser": "etl_user",
        "Sql": "COPY orders FROM 's3://company-data-lake/curated/orders/' IAM_ROLE 'arn:aws:iam::123456789012:role/redshift-s3-role' FORMAT AS PARQUET;"
      },
      "Next": "NotifyPipelineSuccess"
    },
    "QuarantineBadData": {
      "Type": "Task",
      "Resource": "arn:aws:states:::sns:publish",
      "Parameters": {
        "TopicArn": "arn:aws:sns:us-east-1:123456789012:pipeline-alerts",
        "Message": "Data quality checks failed — pipeline halted. Bad data quarantined."
      },
      "End": true
    },
    "NotifyPipelineSuccess": {
      "Type": "Task",
      "Resource": "arn:aws:states:::sns:publish",
      "Parameters": {
        "TopicArn": "arn:aws:sns:us-east-1:123456789012:pipeline-success",
        "Message": "Nightly ETL pipeline completed successfully."
      },
      "End": true
    },
    "NotifyPipelineFailure": {
      "Type": "Task",
      "Resource": "arn:aws:states:::sns:publish",
      "Parameters": {
        "TopicArn": "arn:aws:sns:us-east-1:123456789012:pipeline-alerts",
        "Message.$": "States.Format('Pipeline step failed: {}', $$.State.Name)"
      },
      "End": true
    }
  }
}
```

> **Note:** The `.sync` suffix on Glue integrations (`startJobRun.sync`) makes Step Functions wait for the Glue job to complete before advancing to the next state. Without `.sync`, Step Functions starts the job and immediately moves to the next state — which would trigger the quality check before the ETL job finishes.

---

### Example: Lake Formation Column-Level Grant (AWS CLI)

```bash
# Grant an analyst role SELECT access to orders table, specific columns only
aws lakeformation grant-permissions \
  --principal '{"DataLakePrincipalIdentifier": "arn:aws:iam::123456789012:role/analyst-role"}' \
  --resource '{
    "TableWithColumns": {
      "DatabaseName": "company_analytics",
      "Name": "orders",
      "ColumnNames": ["order_id", "order_date", "total_amount", "status"]
    }
  }' \
  --permissions '["SELECT"]' \
  --region us-east-1
# The analyst can run: SELECT order_id, total_amount FROM orders
# But NOT: SELECT customer_name, customer_email FROM orders — those columns are not granted
# Enforcement happens at query time in Athena — no separate data copy needed

# Add row-level filter for the EU analyst role
aws lakeformation create-data-cells-filter \
  --table-data '{
    "TableCatalogId": "123456789012",
    "DatabaseName": "company_analytics",
    "Name": "eu-orders-only",
    "TableName": "orders",
    "RowFilter": {
      "FilterExpression": "customer_region = '\''EU'\''"
    },
    "ColumnNames": ["order_id", "order_date", "total_amount", "status", "customer_region"]
  }' \
  --region us-east-1
```

---

## How to Decide

**Step Functions vs. MWAA for data pipeline orchestration:**

| Factor | Step Functions | Amazon MWAA (Airflow) |
|---|---|---|
| Existing Airflow DAGs / Airflow expertise | ❌ Must rewrite | ✅ Preserve investment |
| AWS-native services (Glue, Lambda, ECS) | ✅ SDK integrations built-in | ✅ Via AWS operators |
| Setup complexity | Low (create state machine) | Higher (Airflow environment) |
| Visual execution history | ✅ Built-in per execution | Via Airflow UI + logs |
| Long-running (days/weeks) pipelines | ✅ Up to 1 year | ✅ Unlimited |
| Dynamic workflow generation | Harder | ✅ Native in Python |
| Cost | Per state transition | Per Airflow environment/hour |

Use **Step Functions** for: greenfield AWS pipelines, pipelines primarily calling AWS SDK, teams without Airflow expertise.
Use **MWAA** for: teams with existing Airflow DAGs, pipelines requiring Airflow's Python operator ecosystem, cross-cloud pipelines.

**Lake Formation grant strategy:**

Start with table-level grants for simplicity. Add column-level grants when: tables contain PII or sensitive fields that some users must not see. Add row-level filters when: users from different teams or regions should only see their data subset. Use LF-Tags when: you have hundreds of tables that need consistent, category-based access policies.

---

## How This Connects

- **Glue ETL / Crawlers** — Step Functions and MWAA orchestrate Glue jobs and crawlers as pipeline steps. The orchestrator provides conditional execution, retry logic, and failure routing that Glue's own scheduling cannot provide.
- **Athena / Redshift Spectrum** — Lake Formation permissions are enforced by Athena and Redshift Spectrum at query time. All governed tables respect column and row grants transparently.
- **EventBridge** — Pipelines are triggered by EventBridge events: new S3 object arrival (Firehose batch lands), scheduled cron (nightly ETL), or upstream pipeline success. EventBridge starts a Step Functions execution or triggers an MWAA DAG run via API.
- **SNS** — Alert notifications from Step Functions failure states and MWAA task failure callbacks route to SNS topics that email the on-call data engineer or post to Slack.
- **S3** — MWAA stores DAG files in S3, loading them automatically. Step Functions state machine definitions are stored in the Step Functions service but reference S3 paths for data inputs and outputs.
- **CloudTrail + Lake Formation** — All Lake Formation permission grants and revocations are recorded in CloudTrail, providing an audit trail for data access governance — critical for compliance (GDPR, HIPAA, SOX).

---

## Exam Traps

- **Step Functions `.sync` integration is required for Glue**: calling `startJobRun` without `.sync` starts the Glue job and immediately advances to the next state — the pipeline proceeds before the ETL job completes. Always use `.sync` (or `.waitForTaskToken` for Lambda-backed polling) for Glue ETL job steps.
- **Lake Formation does not replace S3 bucket policies**: Lake Formation governs access to the Glue Catalog (table, column, row level). S3 bucket policies control S3 API access. Both layers must grant access. A Lake Formation grant with a restrictive S3 bucket policy that denies the principal results in denied access — the more restrictive policy wins.
- **MWAA is not free — it charges per environment per hour regardless of DAG activity**: an MWAA environment runs continuously (Airflow scheduler and workers are always on). This differs from Step Functions (pay per state transition) and Lambda (pay per invocation). An idle MWAA environment still costs ~$0.49/hour.
- **Data quality failures should halt the pipeline, not just log**: a common mistake is configuring data quality as a logging step that records failures but does not stop the pipeline. If the data quality check runs but the pipeline continues to the COPY step regardless of the result, bad data still reaches Redshift. The quality check must be a conditional gate that actually stops execution.
- **LF-Tag policies apply at catalog time, not query time**: when you change an LF-Tag policy, it takes effect on the next query. Existing query results cached in QuickSight SPICE or Athena result caching may still show data from before the policy change. Flush caches after significant permission changes.

---

## Summary

- Step Functions Standard Workflows orchestrate data pipelines with conditional execution — failed ETL steps stop the pipeline rather than running COPY commands on incomplete or bad data.
- Amazon MWAA is the right choice when existing Airflow DAGs or expertise must be preserved; Step Functions is simpler for greenfield AWS-native pipelines.
- Glue Data Quality validates datasets against completeness, uniqueness, range, and format rules within ETL jobs, acting as a blocking gate before bad data reaches downstream consumers.
- AWS Lake Formation adds table, column, and row-level access control over the Glue Data Catalog — enforced by Athena and Redshift Spectrum at query time, without duplicating data.
- LF-Tags provide attribute-based access control at scale — tag thousands of tables by sensitivity and manage access via tag policies instead of per-table grants.
- Production data pipelines require all four layers: orchestration (Step Functions/MWAA), quality gates (Glue Data Quality), access control (Lake Formation), and operational monitoring (CloudWatch + SNS alerts).

---

## Examples

A financial services company built a nightly data pipeline that moved transaction data from RDS through Glue ETL into Redshift. Early on, a schema change upstream caused the Glue job to silently produce malformed output — propagating to Redshift dashboards and going undetected for three days. After rebuilding the pipeline as a Step Functions state machine with Glue Data Quality checks as a conditional gate, the next schema mismatch failed loudly at the quality step. Step Functions routed execution to the NotifyPipelineFailure state, the on-call engineer received an SNS alert within two minutes, and no bad data reached any dashboard. The full failure history — input data, Glue job output, quality check results — was visible in the Step Functions console execution detail.

A government data agency already had years of Apache Airflow DAGs orchestrating dozens of pipelines across multiple data sources. Moving to Step Functions would have required rewriting hundreds of DAG-equivalent state machines and retraining their entire data engineering team. By migrating to Amazon MWAA, every existing DAG ran unchanged on the first deployment. MWAA eliminated the operational burden of managing Airflow's scheduler, workers, and metadata database — a two-person platform team had previously spent 30% of their time on Airflow infrastructure. After MWAA, that time dropped to near zero, and they redirected it to building new pipelines.

A healthcare analytics company needed to serve the same S3 claims data to three teams with different access requirements: billing analysts (full access), clinical researchers (no patient name or SSN columns), and external auditors (only their state's records, PII masked). Rather than creating three separate data copies — expensive, inconsistent, and hard to govern — they configured Lake Formation grants: billing analysts received table-level SELECT, clinical researchers received column-level SELECT excluding PII columns, and auditors received a row-level data filter scoping their view to their state. One dataset, three governed views. When a new state was onboarded, the data team added one row filter and one grant — no new S3 data required.

---

## Think About It

1. Why is a data quality check that logs failures but does not halt the pipeline less useful than one that stops execution — and under what specific business conditions might you intentionally allow the pipeline to continue despite a quality failure?
2. Your Step Functions pipeline calls `startJobRun` for a Glue ETL job without the `.sync` suffix. The next state immediately runs the COPY command into Redshift. What is the outcome, and what does the Redshift table contain?
3. How would you design Lake Formation grants for a healthcare organization with 12 clinical departments, each needing to see only their department's records across 50 data lake tables, without creating 600 individual grants?
4. You need to choose between Step Functions and MWAA for a new pipeline that orchestrates Glue ETL, an EMR Spark job, a Lambda data quality check, and a Redshift COPY. What factors drive the decision, assuming your team has no existing Airflow expertise?
5. A data pipeline runs nightly. The Step Functions execution history shows the pipeline failed at the data quality step 15 times in the past month, always on Mondays. The failure is silently recovered by the pipeline's retry logic and doesn't reach the alert state. What business risk does this represent, and how would you change the pipeline design to surface it?

---

## Quick Check

**Q1.** A Step Functions state machine calls `startJobRun` for a Glue ETL job. The next state runs a Redshift COPY command. The COPY command runs immediately after the `startJobRun` state completes, before the Glue job finishes. What is the most likely configuration error?

- A) The Glue job IAM role lacks permission to write to S3
- B) The `startJobRun` integration uses the asynchronous resource (without `.sync`), so Step Functions advances immediately after starting the job
- C) The Step Functions execution role lacks `glue:StartJobRun` permission
- D) The Redshift COPY command is using an incorrect S3 path

**Answer: B** — Without the `.sync` suffix on the Glue SDK integration, Step Functions starts the Glue job and immediately transitions to the next state. The COPY command runs before the ETL job completes, loading empty or partial data. Use `arn:aws:states:::glue:startJobRun.sync` to make Step Functions wait for the job to complete before advancing.

---

**Q2.** An Athena user runs `SELECT * FROM orders` against a Lake Formation-governed table. The user's IAM role has been granted `SELECT` on the `orders` table with a column grant including only `[order_id, amount, status]` and a row filter for `customer_region = 'US'`. What does the query return?

- A) All columns and all rows — Lake Formation grants are advisory, not enforced at query time
- B) Only the columns `order_id`, `amount`, `status`, and only rows where `customer_region = 'US'`
- C) An error — Lake Formation does not support `SELECT *` on governed tables
- D) All columns but only rows where `customer_region = 'US'`

**Answer: B** — Lake Formation column and row-level permissions are enforced by Athena at query time. Even a `SELECT *` is silently projected to only the granted columns, and the row filter is applied as an implicit WHERE clause. The user sees only their authorized view of the data — no error, no visible restriction, just the governed result.

---

**Q3.** When is Amazon MWAA the better orchestration choice compared to AWS Step Functions for a data pipeline?

- A) When the pipeline has fewer than 5 steps and doesn't need conditional branching
- B) When your team has existing Apache Airflow DAGs and expertise you want to preserve without rewriting workflows
- C) When the pipeline needs to run longer than 24 hours
- D) When you need native integration with EventBridge to trigger pipeline executions

**Answer: B** — MWAA's primary advantage is compatibility with existing Airflow DAGs and the Airflow operator ecosystem. If your team already invests in Airflow, MWAA eliminates infrastructure management without requiring DAG rewrites. Step Functions is the better choice for greenfield AWS-native pipelines. A is incorrect — simple pipelines favor Step Functions (lower cost, simpler setup). C is incorrect — both support long-running workflows. D is incorrect — Step Functions also integrates with EventBridge.

---

## What's Next

This completes Module 21: Analytics and Data Engineering. You now understand the complete AWS data platform — from S3 data lake storage through Glue ETL, Athena and Redshift for querying, OpenSearch and EMR for specialized workloads, QuickSight for visualization, and Step Functions / MWAA for orchestration with Lake Formation for governance. The next module covers AWS Machine Learning and AI services — from pre-built AI APIs to custom model development with SageMaker to generative AI with Amazon Bedrock.
