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

## What's Next

Next up: the Module 25 Canvas Lab — conduct a Well-Architected Review on a real architecture.