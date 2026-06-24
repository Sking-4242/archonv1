---
title: "Analytics and AI/ML Services Overview"
type: content
estimated_minutes: 12
cert_tags: ["CLF-C02"]
---

# Analytics and AI/ML Services Overview

## Overview

The Cloud Practitioner exam expects you to recognize AWS's data analytics and AI/ML services and the tasks they accomplish. Domain 3, Task 3.7, names analytics services like Amazon Athena, Amazon Kinesis, AWS Glue, and Amazon QuickSight, and AI/ML services like Amazon SageMaker AI, Amazon Lex, and Amazon Kendra. You are not asked to build data pipelines or train models — you are asked to identify which service fits a described data or AI task, the same "match the service to the job" skill that runs through Domain 3.

These services matter because turning raw data into insight is one of the cloud's biggest value areas, and AWS offers a managed service for each step: collecting streaming data, transforming it, querying it, and visualizing it — plus AI services that add intelligence without requiring data-science expertise. A practitioner should be able to hear "we need to run SQL queries directly on files in S3" or "we need a real-time dashboard" or "we want to add a chatbot" and name the right service. The exam keeps these at a recognition level: what each service does, in one line, and the kind of problem it solves.

This lesson surveys the core analytics services and the headline AI/ML services at Cloud Practitioner depth (the shared library lessons cover Bedrock, SageMaker, and the AI services in more detail). After it you will be able to map a data or AI task to the appropriate AWS service.

---

## Core Concepts

### Amazon Athena — Query Data in S3 with SQL

**Amazon Athena** lets you run standard **SQL queries directly against data stored in Amazon S3** — no servers to manage and no data to load into a database first. It is **serverless**, and you pay per query based on the data scanned. Athena is the answer when someone wants to analyze files (logs, exports, data-lake data) sitting in S3 using familiar SQL without setting up a database or cluster. Tell: "query data in S3 with SQL," "serverless interactive queries."

### Amazon Kinesis — Real-Time Streaming Data

**Amazon Kinesis** collects, processes, and analyzes **real-time streaming data** — continuous data such as clickstreams, application logs, IoT telemetry, or video. Where batch tools process data after it lands, Kinesis handles data *as it arrives*, enabling real-time dashboards, alerts, and analytics. Tell: "real-time," "streaming data ingestion and processing." (Kinesis is the streaming counterpart to batch analytics.)

### AWS Glue — Managed ETL and Data Catalog

**AWS Glue** is a **serverless data integration / ETL (extract, transform, load)** service. It discovers, catalogs, cleans, and transforms data so it's ready for analysis — for example, converting and organizing raw files into a queryable form, and maintaining a **data catalog** of your datasets. Glue is the "prepare and transform the data" service that often sits between raw storage and analytics tools like Athena. Tell: "ETL," "prepare/transform/catalog data."

### Amazon QuickSight — Business Intelligence and Dashboards

**Amazon QuickSight** is AWS's **business intelligence (BI)** service for building interactive **dashboards and visualizations**. It connects to your data sources and lets business users explore data and share visual reports. QuickSight is the answer when the need is to *visualize* data or build dashboards for decision-makers. Tell: "dashboards," "visualize data," "business intelligence reports."

### Seeing the Analytics Pipeline

These services compose into a pipeline: **Kinesis** ingests streaming data → **Glue** transforms and catalogs it → it lands in **S3** → **Athena** queries it with SQL → **QuickSight** visualizes the results. Recognizing each service by its role in this collect-transform-query-visualize flow is the key exam skill, and seeing how they chain helps with scenario questions.

### AI/ML Services at a Glance

Domain 3.7 also covers AI/ML services, which the shared library lessons detail. At recognition level: **Amazon SageMaker AI** is the platform for building, training, and deploying custom machine-learning models (for teams that need their own models). **Amazon Lex** builds conversational **chatbots and voice assistants** (intents and natural-language understanding). **Amazon Kendra** is an **intelligent enterprise search** service that lets users find information across documents using natural-language questions. Other pre-built AI services — Rekognition (images), Comprehend (text/NLP), Transcribe (speech-to-text), Translate, Polly (text-to-speech) — solve specific tasks via API, and **Amazon Bedrock** provides access to foundation models for generative AI. Tells: build custom models → SageMaker; chatbot → Lex; smart document search → Kendra; generative AI / foundation models → Bedrock.

### Data Lakes and Where Analytics Data Lives

A concept that ties these services together is the **data lake** — a central repository, typically built on **Amazon S3**, that stores large amounts of structured and unstructured data in its raw form until it's needed. The data-lake pattern is popular because S3 is cheap, durable, and virtually unlimited, and because the analytics services are designed to work directly against it: Glue catalogs and transforms the data, Athena queries it in place with SQL, and QuickSight visualizes the results — all without moving the data into a separate database first. **AWS Lake Formation** is a service that helps set up, secure, and govern a data lake more quickly. For the exam, the takeaway is that S3 frequently serves as the storage foundation for analytics, and the analytics services operate on top of it. Recognizing "central store of raw data for analysis" as a data lake on S3 helps you connect the storage and analytics domains.

### Batch vs. Real-Time Analytics

A useful framing for analytics scenarios is whether the data is processed in **batch** (after it accumulates) or in **real time** (as it arrives). Batch analytics suits reporting and historical analysis — querying data already stored in S3 with Athena, or transforming it with Glue on a schedule. Real-time analytics suits live dashboards, monitoring, and immediate reactions — ingesting and processing continuous streams with Kinesis. When a scenario stresses "as it happens," "live," or "streaming," lean toward Kinesis; when it stresses "analyze historical data" or "run reports on stored data," lean toward Athena and Glue over S3. This batch-vs-real-time distinction is one of the fastest ways to orient an analytics question.

### Recognition Over Depth

The unifying exam lesson is that AWS provides a managed service for each data and AI task, and your job is to match the service to the job: SQL on S3 → Athena; streaming → Kinesis; ETL → Glue; dashboards → QuickSight; custom ML → SageMaker; chatbot → Lex; enterprise search → Kendra. You don't need configuration detail — you need the one-line purpose of each.

---

## Configuration Reference

Analytics services by task:

```text
Task                                       Service
------------------------------------------ ----------------
Run SQL queries on data in S3 (serverless)  Amazon Athena
Ingest/process real-time streaming data     Amazon Kinesis
ETL: transform, clean, catalog data         AWS Glue
Dashboards and data visualization (BI)      Amazon QuickSight
```

AI/ML services by task:

```text
Build/train/deploy custom ML models         Amazon SageMaker AI
Build a chatbot / voice assistant           Amazon Lex
Intelligent enterprise document search      Amazon Kendra
Generative AI via foundation models         Amazon Bedrock
Pre-built tasks (image/text/speech)         Rekognition, Comprehend, Transcribe, Translate, Polly
```

The analytics pipeline:

```text
Kinesis (ingest) → Glue (transform/catalog) → S3 (store) → Athena (query) → QuickSight (visualize)
```

---

## How to Decide

- **"Query files in S3 with SQL, no servers"?** → Amazon Athena.
- **"Real-time / streaming data"?** → Amazon Kinesis.
- **"Transform, clean, or catalog data (ETL)"?** → AWS Glue.
- **"Dashboards / visualize data for the business"?** → Amazon QuickSight.
- **"Build custom ML models"?** → SageMaker. **"Chatbot"?** → Lex. **"Search across documents in natural language"?** → Kendra. **"Generative AI"?** → Bedrock.

---

## How This Connects

This lesson rounds out Domain 3's services survey and reuses the shared module-22 ML/AI lessons (Bedrock, SageMaker, AI services) for deeper coverage. Athena builds on S3 (storage), Kinesis relates to the messaging/streaming services (SQS/SNS/EventBridge in Domain 3.8), and the collect-transform-query-visualize pipeline mirrors how data flows through the storage and compute services covered elsewhere.

---

## Exam Traps

- **Confusing Athena and QuickSight.** Athena *queries* data with SQL; QuickSight *visualizes* it in dashboards.
- **Confusing Kinesis and batch tools.** Kinesis is for *real-time streaming*; Athena/Glue handle data at rest.
- **Confusing Glue and a database.** Glue is ETL/cataloging (prepare data), not a database to store and serve it.
- **Confusing Kendra and Athena.** Kendra is natural-language *enterprise search over documents*; Athena is SQL over structured data in S3.
- **Over-thinking depth.** The exam wants the one-line purpose and the right match, not configuration.

---

## Summary

AWS offers a managed service for each analytics and AI task, and the exam tests recognition. For analytics: Athena runs serverless SQL on data in S3, Kinesis handles real-time streaming data, Glue performs ETL and cataloging, and QuickSight builds BI dashboards — together forming a collect-transform-query-visualize pipeline. For AI/ML: SageMaker builds custom models, Lex builds chatbots, Kendra provides intelligent document search, Bedrock delivers generative AI via foundation models, and pre-built services (Rekognition, Comprehend, Transcribe, Translate, Polly) handle specific tasks. Match the service to the job by its one-line purpose.

---

## Examples

**Example 1 — Athena.** Analysts want to run SQL on months of log files already in S3 without loading a database → **Amazon Athena**.

**Example 2 — Kinesis.** A retailer needs to process clickstream events in real time for live recommendations → **Amazon Kinesis**.

**Example 3 — QuickSight.** Executives want an interactive sales dashboard → **Amazon QuickSight**.

**Example 4 — Kendra.** Employees need to ask natural-language questions and get answers from thousands of internal documents → **Amazon Kendra**.

---

## Think About It

A company collects streaming sensor data, needs to clean and organize it, wants analysts to query it with SQL, and wants executives to see dashboards. Name the AWS service for each of the four steps, and explain how recognizing this collect-transform-query-visualize pattern helps you answer analytics scenario questions quickly.

---

## Quick Check

1. Which service runs serverless SQL queries directly on data in S3?
2. Which service handles real-time streaming data?
3. Which service performs ETL and data cataloging, and which builds BI dashboards?
4. Which AI service provides intelligent natural-language search across enterprise documents?

*Answers: (1) Amazon Athena; (2) Amazon Kinesis; (3) AWS Glue for ETL/cataloging, Amazon QuickSight for BI dashboards; (4) Amazon Kendra.*

---

## What's Next

Next: **Other AWS Services Survey** — the breadth of in-scope services across application integration, business applications, developer tools, end-user computing, frontend/mobile, and IoT.
