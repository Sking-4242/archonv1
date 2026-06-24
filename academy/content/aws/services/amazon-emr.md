---
title: "Amazon EMR"
type: content
estimated_minutes: 15
cert_tags: ["AIF-C01", "SAA-C03", "SOA-C03"]
---

# Amazon EMR

## Overview

Amazon EMR (Elastic MapReduce) is a managed **big-data processing platform** for running open-source frameworks — **Apache Spark, Hadoop, Hive, Presto/Trino, HBase, Flink**, and more — at scale on AWS. It provisions and manages the clusters, so you can process and analyze vast datasets without operating the underlying distributed-computing infrastructure yourself. This *service reference* lesson covers the EMR deployment options, how it processes data, cost optimization, and what each certification expects.

EMR matters because some analytics and data-engineering workloads — large-scale ETL, machine-learning data prep, log and clickstream processing, genomics — need the power of distributed frameworks like Spark and Hadoop, which are operationally heavy to run yourself. EMR makes those frameworks managed and elastic. The core mental model is a **cluster of compute nodes** running a big-data framework over data that usually lives in **S3** (the decoupled storage-and-compute pattern), spun up to process a job and scaled or torn down when done. The key decisions are which deployment model to use and how to keep cost down with Spot and transient clusters.

---

## How It Works

EMR runs your chosen framework on a cluster of nodes in three roles: a **primary (master)** node coordinating the cluster, **core** nodes that run tasks and store data (HDFS), and optional **task** nodes that run tasks only (ideal for Spot). You submit **steps** (jobs) or run interactive notebooks.

Deployment options:

- **EMR on EC2** — clusters of EC2 instances you size and scale; the classic, most configurable option.
- **EMR Serverless** — run Spark/Hive jobs without provisioning or managing clusters; capacity scales automatically per job — ideal for variable or intermittent workloads.
- **EMR on EKS** — run Spark jobs on an existing Amazon EKS cluster, sharing Kubernetes capacity.

The decoupled pattern is central: store data in **S3** (via the EMR File System, EMRFS) rather than only in cluster HDFS, so you can run **transient clusters** that spin up, process S3 data, write results back to S3, and terminate — paying only for the processing time.

---

## Key Features

- **Managed open-source frameworks** (Spark, Hadoop, Hive, Presto/Trino, HBase, Flink, Hudi/Iceberg).
- **Three deployment models** — EC2, Serverless, and on EKS.
- **Decoupled storage** via S3/EMRFS, enabling transient clusters and independent scaling of storage and compute.
- **Managed scaling** and **Spot/instance-fleet** support for big cost savings on task nodes.
- **EMR Studio / Notebooks** for interactive development.
- **Security** via VPC placement, IAM roles, KMS encryption, Lake Formation, and Kerberos.

---

## Configuration Reference

- **Choose the deployment model**: EC2 for full control, **Serverless** for hands-off variable workloads, on EKS to share Kubernetes capacity.
- **Use S3 (EMRFS)** for input/output and run **transient clusters** for batch jobs to avoid paying for idle clusters.
- **Use instance fleets with Spot** for task nodes and managed scaling to cut cost.
- **Secure** with VPC, IAM roles, KMS encryption (at rest/in transit), and Lake Formation for fine-grained data access.

---

## Operations and Troubleshooting

- **Cost too high.** Use **transient clusters** (terminate after the job), **Spot** for task nodes, managed scaling, and **Serverless** for spiky workloads; long-running idle clusters are the classic waste.
- **Job failures / slow jobs.** Inspect step logs (to S3/CloudWatch), right-size the cluster, and tune the framework (e.g., Spark partitions/memory).
- **EMR vs. Glue.** Glue is serverless ETL with a managed catalog for simpler pipelines; **EMR** suits large, complex, or framework-specific big-data processing and existing Hadoop/Spark workloads.
- **Data persistence.** Keep durable data in **S3**, not only cluster HDFS, so terminating a cluster doesn't lose data.

---

## Integrations

EMR processes data in **S3** (EMRFS), catalogs schemas in the **Glue Data Catalog** (shared with Athena/Redshift Spectrum), runs in a **VPC** with **IAM** roles and **KMS** encryption, applies fine-grained access with **Lake Formation**, is orchestrated by **Step Functions**/**MWAA** (Airflow), and feeds **data lakes**, **Redshift**, and **ML pipelines** (SageMaker). It complements **Glue** (serverless ETL) and **Athena** (serverless SQL) for heavier or framework-specific workloads.

---

## Pricing and Cost Considerations

EMR on EC2 adds a small **per-instance EMR fee** on top of the **EC2** cost (so Spot/Reserved/Savings Plans apply to the EC2 portion); **EMR Serverless** bills by the **vCPU/memory-seconds** consumed per job; **EMR on EKS** bills by the EKS pods used plus an EMR fee. The dominant cost levers are transient clusters, Spot for task nodes, managed scaling, and Serverless for variable workloads — all aimed at not paying for idle big-data clusters. Exact prices vary by model, instance, and Region.

---

## Exam Relevance

**AIF-C01:** Know EMR as managed big-data processing (Spark/Hadoop) for preparing large datasets for analytics and ML. Conceptual.

**SAA-C03:** Know EMR's managed frameworks, the decoupled S3/transient-cluster pattern, deployment models (EC2/Serverless/EKS), Spot for cost, and **EMR vs. Glue vs. Athena** selection. Design depth.

**SOA-C03:** Operate clusters — transient vs. long-running, managed scaling, Spot, and cost/job troubleshooting. Operations depth.

---

## Summary

Amazon EMR is a managed big-data platform running Spark, Hadoop, Hive, Presto/Trino, HBase, and Flink across primary/core/task nodes, available as EMR on EC2, EMR Serverless, or EMR on EKS. The decoupled pattern stores data in S3 (EMRFS) so transient clusters can process and terminate, and Spot task nodes plus managed scaling minimize cost. It catalogs with Glue, secures with VPC/IAM/KMS/Lake Formation, and feeds data lakes, Redshift, and ML pipelines. The recurring exam points are the transient-cluster/S3 decoupling, Spot for cost, the three deployment models, and EMR (heavy/framework-specific) vs. Glue (serverless ETL) vs. Athena (serverless SQL).

---

## Quick Check

1. Which open-source frameworks does EMR manage, and what three node roles make up an EC2 cluster?
2. What is the decoupled storage pattern, and why does it enable transient clusters?
3. How do you minimize EMR cost for batch jobs?
4. When would you choose EMR over Glue or Athena?
5. Which deployment model removes cluster management entirely?

---

## What's Next

Pair this with **Amazon S3** (data lake), **AWS Glue** (catalog/ETL comparison), **Amazon Athena**, and **Amazon Redshift** in the analytics stack.
