---
title: "Data Engineering Pipelines and Orchestration"
type: content
estimated_minutes: 8
cert_tags: ["SAA-C03", "SAP-C02"]
---

# Data Engineering Pipelines and Orchestration

## Overview

Building individual analytics services is one challenge; orchestrating them into reliable data pipelines is another. This lesson covers AWS data pipeline orchestration tools and best practices for production data engineering.

## AWS Step Functions for Data Pipelines

Step Functions is increasingly used for data pipeline orchestration. A pipeline state machine: trigger Glue crawler → wait for completion → run Glue ETL job → check job status → run data quality checks → if pass, copy to presentation zone; if fail, alert via SNS. Step Functions handles retries, error branching, and long-running jobs (standard workflow up to 1 year). Direct Glue integration (no Lambda needed) makes orchestrating Glue jobs straightforward.

## Amazon MWAA (Managed Workflows for Apache Airflow)

MWAA is managed Apache Airflow — the most popular open-source workflow orchestrator for data engineering. If your team already uses Airflow, MWAA eliminates the need to manage the Airflow infrastructure. DAGs (Directed Acyclic Graphs) define pipeline workflows with operators for Glue, EMR, Redshift, S3, RDS, Lambda, and more. Use MWAA when you need Airflow's extensive operator ecosystem or have existing Airflow expertise.

## Data Quality and Testing

Data quality is often the most critical and neglected part of analytics pipelines. AWS Glue Data Quality (powered by Deequ) validates datasets against rules (completeness, uniqueness, value ranges, format checks) within Glue ETL jobs. Great Expectations (open source, runs in Glue or EMR) provides expressive data quality tests. Integrate data quality checks as a gate in your pipeline: fail the pipeline if critical quality checks don't pass, preventing bad data from reaching downstream dashboards.

## Lake Formation Row and Column Security

AWS Lake Formation adds fine-grained access control to S3-based data lakes. Grant specific IAM principals (users, roles, groups) access to specific tables, columns, and rows in the Glue catalog. Athena and Redshift Spectrum enforce these permissions at query time — users can only see the data they're allowed to see. This enables multi-tenant analytics: the same S3 data serves different teams, each seeing only their relevant partition or columns (e.g., mask PII columns from non-authorized analysts).

## Summary

Orchestrate data pipelines with Step Functions (AWS-native) or MWAA (Apache Airflow managed). Add data quality gates to prevent bad data from propagating. Lake Formation provides row and column-level security for multi-tenant data lake access. Production data pipelines require orchestration, quality validation, and access control — not just the transformation jobs themselves.

## Examples

A financial services company built a nightly data pipeline that moved transaction data from RDS through Glue ETL into Redshift for reporting. Early on, a schema change upstream caused the Glue job to silently produce malformed output — which propagated to the Redshift dashboards and went undetected for three days. After adding AWS Glue Data Quality checks as a blocking gate between the ETL job and the Redshift COPY step, the next schema mismatch failed loudly, triggered an SNS alert, and stopped bad data from reaching any dashboard. This is the real cost of skipping data quality: downstream trust erodes faster than you can rebuild it.

A government data agency already had years of Apache Airflow DAGs orchestrating dozens of pipelines across multiple data sources. Moving to a new orchestration framework would have required rewriting hundreds of operators and retraining the team. By migrating to Amazon MWAA, they kept every existing DAG unchanged and eliminated the operational burden of managing Airflow's scheduler, workers, and metadata database. This illustrates when MWAA wins: not because it's technically superior to Step Functions, but because it removes infrastructure toil without requiring workflow rewrites for teams already invested in Airflow.

A healthcare analytics company needed to serve the same S3-based claims data to three different teams: billing analysts (full access), clinical researchers (no patient name or SSN columns), and external auditors (only their state's records, with PII masked). Rather than creating three separate copies of the dataset, they configured AWS Lake Formation grants at the column and row level on the Glue Catalog tables. Each team's Athena queries automatically returned only the rows and columns their IAM principal was permitted to see — one dataset, three views, no duplication. This is the multi-tenant data lake pattern that Lake Formation was designed for.

## Think About It

1. Why is a data quality check that silently logs failures less useful than one that halts the pipeline — and what circumstances might justify letting a pipeline continue despite a quality failure?
2. What would happen to the downstream Redshift dashboards if the Step Functions pipeline had no error-branching logic and the Glue ETL job silently produced zero output rows due to a bug?
3. How would you decide between Step Functions and MWAA to orchestrate a new data pipeline for a team that has no prior Airflow experience but already uses Lambda and EventBridge heavily?
4. What trade-offs exist between granting Lake Formation column-level permissions versus creating separate S3 data copies for each team — in terms of storage cost, consistency, and operational overhead?
5. If your pipeline passes data quality checks today but your source system changes its schema next month without notice, what architectural patterns would make that change easier to detect and handle?

## Quick Check

**Q1.** What is the primary role of AWS Glue Data Quality in a data pipeline?
- A) It monitors Glue job execution time and scales compute automatically
- B) It validates datasets against defined rules and can halt pipeline execution if checks fail
- C) It encrypts data at rest in S3 to meet compliance requirements
- D) It crawls S3 to detect schema changes and update the Glue Data Catalog

**Answer: B** — Glue Data Quality (powered by Deequ) applies completeness, uniqueness, and value-range rules to datasets within ETL jobs and can be configured to fail the job if critical checks do not pass, preventing bad data from propagating.

**Q2.** When is Amazon MWAA the better orchestration choice compared to AWS Step Functions?
- A) When you need native integration with EventBridge and want to minimize IAM configuration
- B) When your team has existing Apache Airflow DAGs and expertise you want to preserve
- C) When pipelines need to run longer than 24 hours without state management
- D) When you need to orchestrate fewer than five tasks per pipeline

**Answer: B** — MWAA's primary advantage is compatibility with existing Airflow workflows and the broader Airflow operator ecosystem, making it the natural choice for teams already invested in Airflow.

**Q3.** How does AWS Lake Formation enable multiple teams with different data access needs to query the same S3 dataset?
- A) It creates separate S3 bucket copies for each team with different IAM bucket policies
- B) It applies row-level and column-level access controls on Glue Catalog tables, enforced at query time by Athena and Redshift Spectrum
- C) It encrypts different columns with different KMS keys so only authorized users can decrypt their columns
- D) It uses VPC endpoint policies to route each team's queries to a different S3 prefix

**Answer: B** — Lake Formation grants fine-grained permissions on catalog tables; when a user runs an Athena or Redshift Spectrum query, the engine enforces those permissions, returning only the rows and columns the user is authorized to see.

## What's Next

Next up: the Module 21 Canvas Lab — design a data lake and analytics pipeline.