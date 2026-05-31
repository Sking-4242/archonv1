---
title: "Architecture Patterns: Putting It All Together"
type: content
estimated_minutes: 10
cert_tags: ["SAA-C03", "SAP-C02"]
---

# Architecture Patterns: Putting It All Together

## Overview

After 25 modules of service-specific learning, this lesson synthesizes the common full-stack architecture patterns that appear on exams and in real-world AWS deployments. These patterns combine multiple services into coherent, production-ready architectures.

## Three-Tier Web Application

The canonical AWS architecture: Route 53 (DNS + health check) → CloudFront (CDN + WAF + TLS) → ALB (load balancing + HTTP routing) → EC2 Auto Scaling Group or ECS Fargate (application tier, across 2+ AZs) → Aurora Multi-AZ (primary database) + Aurora Read Replica (read scaling) → ElastiCache Redis (session store + application cache). Optionally: RDS Proxy between app tier and Aurora for connection pooling. S3 for static assets, CloudFront for serving them. This pattern handles millions of users when each layer is right-sized.

## Serverless API Backend

API Gateway (HTTP API with JWT auth via Cognito) → Lambda (function per route or monolambda with routing) → DynamoDB (primary data store) + ElastiCache Redis (session/hot data cache) + S3 (file storage) + Secrets Manager (database credentials). Async: Lambda → SQS → Lambda (background workers). Events: DynamoDB Streams → Lambda (fan-out processing). Monitoring: X-Ray (distributed tracing), CloudWatch EMF (custom metrics from Lambda), CloudWatch Logs. This pattern scales to zero and up automatically.

## Event-Driven Microservices

Services communicate through events rather than direct calls: EventBridge (event bus) + SNS (fan-out) + SQS (buffered consumption) + Kinesis (high-throughput streaming). Each service owns its data store (bounded context). Step Functions orchestrates multi-service workflows. Service discovery via Route 53 private hosted zones or App Mesh. This pattern maximizes service independence and resilience.

## Data Lake and Analytics Platform

Ingestion: Kinesis Firehose (real-time) + DMS (CDC from RDS) + AppFlow (SaaS) → S3 raw zone. Transform: Glue ETL → S3 curated zone (Parquet, partitioned). Query: Athena (ad-hoc) + Redshift Spectrum (joins with Redshift tables) + Redshift (structured warehouse queries). Visualization: QuickSight (dashboards). Governance: Lake Formation (row/column security). Orchestration: Step Functions or MWAA. Monitoring: CloudWatch alarms on Glue job failures, Athena query times, Firehose delivery.

## Summary

The core patterns: three-tier web app for traditional workloads, serverless API for event-driven services, event-driven microservices for decoupled systems, and data lake + analytics platform for business intelligence. Real architectures mix these patterns. The exam tests whether you can select the right services for each layer of each pattern. Master these four patterns and you have the foundation to design any AWS architecture.

## Examples

A startup building a B2C mobile fitness app launched their backend using the serverless API pattern: API Gateway with JWT auth via Cognito, Lambda functions per route, DynamoDB as the primary data store, and S3 for storing user-uploaded workout videos. When their app was featured in the App Store, daily active users jumped from 2,000 to 200,000 in 48 hours. Because the architecture scaled automatically — Lambda concurrency expanded, DynamoDB on-demand mode absorbed the read/write spike, and API Gateway had no capacity to pre-provision — the app stayed up without any operational intervention. The three-tier web pattern with fixed EC2 fleets would have required frantic manual scaling.

A mid-market retailer modernizing a legacy monolith decomposed it into event-driven microservices over eighteen months. Each domain team owned its service and its data store — the inventory service owned an Aurora Postgres instance; the order service owned DynamoDB. Services communicated exclusively through EventBridge events. When the shipping service needed to know about order confirmations, it subscribed to the `order.confirmed` event from EventBridge rather than calling the order service API directly. A shipping bug that caused that service to crash during peak hours no longer cascaded into order failures — the order service published events to EventBridge whether or not the shipping service was healthy, and the shipping service caught up from the event stream when it recovered. This bounded context and loose coupling is the defining property of the event-driven microservices pattern.

A digital media company built a data lake to consolidate clickstream events from their publishing platform, subscription data from Salesforce via AppFlow, and article content metadata from their CMS via DMS. Kinesis Firehose landed raw events in S3; Glue ETL jobs transformed them hourly into Parquet with date partitioning in the curated zone. Their editorial team used Athena for ad-hoc queries ("which articles drove the most subscriptions last week?") while their data warehouse team ran Redshift against structured aggregates. QuickSight dashboards showed editors real-time article performance. The pattern — raw zone → curated zone → query layer → visualization — is the data lake architecture from this lesson applied to a concrete editorial analytics use case.

## Think About It

1. Why does the three-tier web application pattern place the ALB between the internet and the application tier rather than exposing EC2 instances directly? What specific failure modes and security risks does that layer resolve?
2. What would happen if a Lambda function in the serverless API backend pattern directly queried Aurora MySQL with a new database connection on every invocation under high load? How does RDS Proxy address this, and what does it reveal about the difference between how EC2 applications and Lambda functions handle database connections?
3. How would you decide whether a new feature in an event-driven microservices system should communicate via EventBridge (fire-and-forget events) versus Step Functions (orchestrated workflow with retries and state)? What characteristics of the feature would push you toward one or the other?
4. In the data lake pattern, raw data lands in S3 before being transformed into the curated zone. What is the operational value of retaining the raw zone indefinitely rather than deleting it after transformation — and what cost and governance trade-offs does that decision create?
5. Real architectures mix these patterns. If you were asked to add a real-time recommendation engine to the three-tier web application, which elements from the other three patterns (serverless API, event-driven microservices, data lake) would you pull in, and why?

## Quick Check

**Q1.** In the three-tier web application architecture described in this lesson, what is the purpose of RDS Proxy between the application tier and Aurora?
- A) To encrypt all database traffic with TLS
- B) To provide connection pooling and reduce database connection overhead
- C) To replicate data across multiple AWS Regions
- D) To cache frequently read rows in memory

**Answer: B** — RDS Proxy sits between the application and Aurora to pool and reuse database connections, which is especially important when many Lambda functions or auto-scaling EC2 instances are opening connections simultaneously.

**Q2.** In the event-driven microservices pattern, which AWS service acts as the central event bus through which services publish and subscribe to events?
- A) Amazon SQS
- B) Amazon SNS
- C) Amazon EventBridge
- D) AWS Step Functions

**Answer: C** — EventBridge is the managed event bus in the event-driven microservices pattern; services publish domain events to EventBridge and other services subscribe to the event types they care about, enabling loose coupling.

**Q3.** In the data lake architecture pattern, what file format is used in the curated zone for query efficiency, and why?
- A) CSV, because it is human-readable and widely supported
- B) JSON, because it preserves nested document structure
- C) Parquet, because it is columnar and compresses well for analytical queries
- D) Avro, because it includes schema evolution support

**Answer: C** — Parquet is the standard curated zone format because its columnar layout allows query engines like Athena and Redshift Spectrum to read only the columns needed, dramatically reducing both query time and cost.

## What's Next

Next up: the Module 25 Canvas Lab — conduct a Well-Architected Review on a real architecture.