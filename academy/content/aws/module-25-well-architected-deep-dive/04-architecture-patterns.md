---
title: "Architecture Patterns: Putting It All Together"
type: content
estimated_minutes: 12
cert_tags: ["SAA-C03", "SAP-C02"]
---

# Architecture Patterns: Putting It All Together

## Overview

After learning individual AWS services, the next challenge is knowing how they fit together into coherent, production-ready architectures. AWS exams — especially the SAA-C03 and SAP-C02 — test this synthesis heavily. A question rarely asks "what does SQS do?" It asks "a company needs to decouple a high-throughput order processing system from its fulfillment backend — which architecture handles back-pressure and retry correctly?" That question requires recognizing a pattern, not just recalling a service.

Four patterns appear repeatedly across exam questions and real-world AWS deployments: the three-tier web application (the foundational pattern for traditional workloads), the serverless API backend (the default for new event-driven services), event-driven microservices (the pattern for large-scale decoupled systems), and the data lake and analytics platform (the pattern for business intelligence and ML). Real architectures mix these patterns — a three-tier application may fan out events to a microservices backbone, which feeds a data lake. Understanding each pattern individually makes the combinations legible.

For the SAA-C03 exam, know which services belong at each layer of each pattern and why. SAP-C02 adds migration scenarios (how do you evolve from a monolith to event-driven microservices?), multi-region patterns (how do you make the three-tier pattern globally available?), and governance concerns (how do you secure a data lake with row-level access control?). After this lesson, you will be able to design any of these four patterns from scratch and identify the Well-Architected gaps in a described architecture.

---

## Core Concepts

### Pattern 1: Three-Tier Web Application

The foundational AWS architecture for user-facing web and mobile applications. Layers from edge to data:

**Edge/CDN tier**: Route 53 (DNS, health-check-based failover) → CloudFront (global CDN, TLS termination, WAF integration for edge protection, S3 static asset serving).

**Load balancing tier**: Application Load Balancer (HTTP/HTTPS routing, host and path-based rules, sticky sessions, target group health checks). The ALB is the single entry point for all application traffic from CloudFront.

**Compute tier**: EC2 Auto Scaling Group (or ECS Fargate tasks) across a minimum of two Availability Zones. The ASG maintains a minimum of instances and scales out on CPU or custom CloudWatch metrics. Application code runs here; no business logic runs in the database layer.

**Data tier**: Aurora Multi-AZ (primary writer + standby replica for automatic failover) and one or more Aurora Read Replicas for read scaling. RDS Proxy sits between the compute tier and Aurora to pool database connections — critical when Lambda or auto-scaling EC2 causes connection count spikes. ElastiCache Redis provides session storage and application-layer caching.

**Supporting services**: S3 (static assets, file uploads, application logs), Secrets Manager (database credentials, API keys), KMS (encryption at rest), CloudWatch (logs, metrics, alarms).

---

### Pattern 2: Serverless API Backend

The default pattern for greenfield API services and event-driven backends. Eliminates idle compute cost and operational overhead of instance management.

**API layer**: API Gateway (HTTP API or REST API) with JWT authorization via Cognito (or Lambda authorizer for custom auth). API Gateway handles TLS, throttling, usage plans, and request/response mapping.

**Compute layer**: Lambda functions — one function per route, or a single "monolambda" that handles routing internally (useful for migrating an existing Express.js app to Lambda). Functions are stateless; all state lives in data stores.

**Data layer**: DynamoDB (primary key-value/document store, on-demand capacity for unpredictable traffic), S3 (file and object storage, static assets), Secrets Manager (credentials), ElastiCache Redis (session store and hot data cache for repeated queries).

**Async processing**: Lambda → SQS → Lambda (background workers with automatic retries and dead-letter queue for failed messages). Step Functions orchestrates multi-step workflows with error handling, retries, and parallel branches.

**Event streaming**: DynamoDB Streams → Lambda (process every item-level change, fan out to downstream services). Kinesis Data Streams → Lambda (high-throughput event ingestion and processing).

**Observability**: X-Ray (distributed tracing across API Gateway, Lambda, DynamoDB), CloudWatch EMF (emit custom metrics from Lambda without a separate PutMetricData call), CloudWatch Logs Insights (query structured Lambda logs).

---

### Pattern 3: Event-Driven Microservices

Services communicate through events rather than synchronous API calls. Each service owns its data store (bounded context). Failures in one service do not cascade to others.

**Event bus**: EventBridge is the central event routing engine. Services publish domain events (`order.confirmed`, `payment.failed`, `inventory.reserved`) to EventBridge. Other services subscribe to the event types they care about via EventBridge rules. The publisher has no knowledge of consumers — loose coupling.

**Fan-out**: SNS (publish-subscribe) fans out a single message to multiple SQS queues, Lambda functions, or HTTP endpoints simultaneously. Use when one event needs to trigger multiple independent downstream actions.

**Buffered consumption**: SQS provides durable message queuing between producers and consumers. Consumers pull from SQS at their own pace — decouples producers from consumer capacity and handles back-pressure. Configure dead-letter queues (DLQ) for messages that fail processing repeatedly.

**Orchestration**: Step Functions coordinates multi-step workflows across multiple services with explicit state, retries, error handling, and parallel branches. Use Step Functions when the workflow has dependencies between steps; use EventBridge when steps are independent reactions to the same event.

**Service discovery**: Route 53 private hosted zones resolve service hostnames within the VPC. AWS App Mesh provides service mesh capabilities (mutual TLS between services, circuit breaking, traffic shifting for canary deployments of microservices).

---

### Pattern 4: Data Lake and Analytics Platform

The pattern for ingesting, transforming, and analyzing large volumes of structured and semi-structured data at scale.

**Ingestion layer**: Kinesis Data Firehose (real-time streaming data → S3 raw zone with optional Glue-based transformation), AWS DMS (change data capture from operational RDS/Aurora databases), AppFlow (SaaS data sources: Salesforce, Marketo, ServiceNow), S3 direct upload (batch file drops from on-premises systems).

**Storage zones** (all in S3):
- **Raw zone**: exactly as received, no transformation. Never delete.
- **Curated zone**: transformed, validated, partitioned by date, stored as Parquet. This is the query-optimized layer.
- **Aggregated/presentation zone**: pre-aggregated tables or materialized views optimized for specific dashboard queries.

**Transformation**: AWS Glue ETL jobs (serverless Spark-based transformation from raw to curated), Glue Crawlers (auto-detect schema and update the Glue Data Catalog), Lambda (lightweight record-level transformation at ingest time via Firehose).

**Query layer**: Athena (interactive SQL against S3 Parquet using the Glue Catalog, pay per TB scanned), Redshift (structured warehouse queries, joins across petabyte-scale tables), Redshift Spectrum (query S3 from within Redshift without loading data).

**Governance**: AWS Lake Formation (table-level, column-level, and row-level access control on top of the Glue Catalog — controls which IAM principals can query which tables and columns). Lake Formation is the correct answer for "restrict data lake access to specific columns for specific teams."

**Visualization**: Amazon QuickSight (dashboards connected to Athena, Redshift, or S3 directly; SPICE in-memory engine for fast dashboard queries).

---

## Configuration Reference

### Example: Three-Tier Application — ALB Listener Rules

```bash
# Create ALB listener rules for path-based routing
# /api/* → API target group (EC2/ECS application servers)
# /* → static assets target group (or redirect to CloudFront S3 origin)

aws elbv2 create-rule \
  --listener-arn "arn:aws:elasticloadbalancing:us-east-1:123456789012:listener/a