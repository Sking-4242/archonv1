---
title: "Amazon MQ, MSK, and AppFlow"
type: content
estimated_minutes: 12
cert_tags: ["SAA-C03", "SAP-C02"]
---

# Amazon MQ, MSK, and AppFlow

## Overview

SQS, SNS, and Kinesis are AWS-native messaging services designed for applications built on AWS from the ground up. But enterprises migrating existing workloads to AWS face a different challenge: applications already built around Apache ActiveMQ, RabbitMQ, or Apache Kafka — using JMS, AMQP, STOMP, and other protocols that SQS and Kinesis do not speak. Rewriting these applications to use AWS-native services is expensive, risky, and time-consuming. Amazon MQ and Amazon MSK solve this by providing fully managed versions of these open-source brokers that existing applications can connect to without changing a line of application code.

Amazon AppFlow completes the picture with a different kind of integration: connecting SaaS platforms (Salesforce, Zendesk, Marketo, Google Analytics) to AWS data services (S3, Redshift, EventBridge) through no-code configured data flows — without writing Lambda functions, managing OAuth tokens, or handling API rate limits.

For the SAA exam, understand when to use Amazon MQ (legacy broker migration) versus SQS (new AWS-native applications), and when to use MSK (Kafka ecosystem) versus Kinesis (AWS-native streaming). AppFlow is the answer to SaaS integration scenarios. SAP adds MSK cluster configuration, Kafka Connect managed connectors, MSK Serverless vs. provisioned trade-offs, and MQ network-of-brokers topology. After this lesson, you will be able to match the right managed service to any migration or integration scenario.

---

## Core Concepts

### Amazon MQ

Amazon MQ is a managed message broker service that supports **Apache ActiveMQ** and **RabbitMQ**. AWS manages broker provisioning, OS and software patching, multi-AZ replication, storage management, and CloudWatch monitoring. You retain control of broker configuration: virtual hosts, queues, topics, user permissions, and messaging policies.

**The defining use case is protocol-based migration.** If your existing application communicates over:
- **JMS** (Java Message Service) — the standard Java messaging API
- **AMQP** (Advanced Message Queuing Protocol)
- **STOMP** (Simple Text Oriented Messaging Protocol)
- **MQTT** (IoT messaging protocol)
- **OpenWire** (ActiveMQ's native binary protocol)

...then Amazon MQ supports these protocols natively. Your application changes only its broker connection URL — all messaging code remains identical.

**Deployment modes:**
- **Single-instance**: one broker in one AZ — appropriate for development and testing only
- **Active/Standby**: two broker instances across two AZs with automatic failover — required for production. The standby broker takes over within seconds if the active broker fails. Both share the same EFS-backed storage, so no messages are lost during failover.

Amazon MQ runs on EC2 instances. You choose the instance type (which determines broker memory and network throughput). This is a key difference from SQS, SNS, and Kinesis — Amazon MQ is not serverless. You pay for the broker instances whether or not they are handling traffic.

**When NOT to use Amazon MQ**: for new applications built on AWS that have no legacy protocol requirements, SQS and SNS are almost always the better choice. They are fully serverless, scale automatically, require no instance management, and integrate more deeply with Lambda, EventBridge, and other AWS services. Amazon MQ is specifically the right answer for migrating existing broker-dependent systems, not for building new ones.

---

### Amazon MSK (Managed Streaming for Apache Kafka)

Amazon Managed Streaming for Apache Kafka (MSK) provides a fully managed Apache Kafka cluster. AWS manages: broker instance provisioning, ZooKeeper or KRaft cluster coordination, multi-AZ broker placement, broker software patching, and monitoring. You manage: topic creation, producer and consumer configuration, retention policies, ACLs, and when to scale the cluster.

**MSK preserves the complete Apache Kafka API.** Applications using the standard Kafka producer and consumer client libraries, Kafka Connect connectors, Kafka Streams for stream processing, or Schema Registry work with MSK without modification. This full API compatibility is the critical differentiator from Kinesis: MSK gives you the entire Kafka ecosystem and tooling, Kinesis gives you AWS-native simplicity with deeper AWS service integration.

**MSK Serverless** eliminates capacity planning entirely — MSK Serverless automatically manages broker capacity in response to workload. The full Kafka producer/consumer API is preserved. For new MSK deployments without predictable throughput requirements, MSK Serverless is the recommended starting point because it eliminates the under-provisioning / over-provisioning trade-off.

**MSK Connect** (managed Kafka Connect) deploys Kafka Connect source and sink connectors as fully managed resources. Pre-built connectors pull data from DynamoDB, MySQL, PostgreSQL, S3, and other sources, or deliver to OpenSearch, S3, Redshift, and others — without running Kafka Connect infrastructure yourself.

---

### MSK vs. Kinesis Data Streams

This is the most tested comparison involving MSK. Both services handle real-time streaming data, but from different starting points:

**Choose MSK when:**
- Your team has existing Apache Kafka expertise (Kafka producer/consumer APIs, Connect, Kafka Streams)
- You are migrating an on-premises Kafka cluster to AWS
- Upstream producers or downstream consumers use the Kafka protocol and cannot be changed
- You need Kafka-specific features: log compaction, Kafka transactions (exactly-once semantics across topics), Kafka Streams stateful processing, or the Kafka Connect connector ecosystem
- Portability matters — Kafka API applications can run on MSK, on-premises Kafka, Confluent Cloud, or any Kafka-compatible platform

**Choose Kinesis Data Streams when:**
- Building a new AWS-native streaming application without Kafka expertise
- Deep integration with Lambda (event source mapping), Firehose, and CloudWatch is required
- Simpler operational model is valued over access to the Kafka ecosystem
- You want native AWS auto-scaling (KDS On-Demand mode)

---

### Amazon AppFlow

AppFlow is a fully managed, no-code integration service that moves data between SaaS applications and AWS services through configured flows. You define: source (Salesforce, Zendesk, Google Analytics, Marketo, ServiceNow, Slack, and 50+ others), destination (S3, Redshift, EventBridge, Salesforce), trigger type, field mappings, filters, and data transformations.

AppFlow handles OAuth authentication, API pagination, rate limiting, field-level transformation, PII masking, data validation, and error handling automatically. All traffic flows over AWS PrivateLink by default — data does not traverse the public internet.

**Trigger types:**
- **On-demand**: run manually or via API call
- **Scheduled**: run at a configured cadence (hourly, daily, specific cron expression)
- **Event-based**: trigger when a record is created or updated in the source system (e.g., a Salesforce opportunity reaches Closed Won stage)

**Use AppFlow when**: the integration is standard data movement between a SaaS platform and AWS storage — pull records, apply field mappings, store in S3 or Redshift. AppFlow replaces custom Lambda-based integration code for these common SaaS-to-AWS pipelines, without requiring engineers to manage OAuth flows, pagination, or SaaS API versioning.

**Do not use AppFlow for**: complex business logic, real-time sub-second pipelines, or data transformations that exceed AppFlow's built-in capabilities. In those cases, a Lambda-based integration or EventBridge with API Destinations is more appropriate.

---

## Configuration Reference

### Example: Amazon MQ for ActiveMQ — Key Decisions (Console Walkthrough)

Amazon MQ is primarily configured through the console. The critical decisions are:

```
Broker engine:       ActiveMQ (for JMS/AMQP/OpenWire) or RabbitMQ (for AMQP/STOMP)

Deployment mode:     Single-instance (mq.m5.large)     → development only
                     Active/Standby (mq.m5.large+)     → production HA (required)

Storage:             EFS-backed (shared between active and standby nodes)
                     Failover preserves all messages — no message loss

Network placement:   VPC private subnets — brokers should never be publicly accessible
                     Security group: allow only application servers on broker ports
                       ActiveMQ ports: 61616 (OpenWire), 5671 (AMQP+TLS), 8162 (Web Console)
                       RabbitMQ ports: 5671 (AMQP+TLS), 15671 (Management UI)

Maintenance window:  Schedule weekly maintenance (patching) during off-peak hours

Encryption:          TLS for in-transit (enabled by default on all protocols)
                     AWS-managed KMS key for at-rest encryption
```

> **Migration pattern:** Point your application's broker URL at the Amazon MQ endpoint. No code changes, no SDK changes — only the connection string changes. Test connectivity, verify SSL certificate handling (Amazon MQ uses ACM-issued certificates), and validate failover behavior before production cutover.

---

### Example: MSK Serverless Cluster Creation (AWS CLI)

```bash
# Create an MSK Serverless cluster — no broker sizing required
aws kafka create-cluster-v2 \
  --cluster-name prod-events-cluster \
  --serverless '{
    "VpcConfigs": [{
      "SubnetIds": [
        "subnet-0abc123",
        "subnet-0def456",
        "subnet-0ghi789"
      ],
      "SecurityGroupIds": ["sg-0kafka-clients"]
    }],
    "ClientAuthentication": {
      "Sasl": {
        "Iam": {"Enabled": true}
      }
    }
  }' \
  --region us-east-1
# VpcConfigs: MSK brokers are placed in your VPC subnets — one per AZ minimum
# IAM authentication: use IAM roles for producer/consumer auth (recommended over SASL/SCRAM)
# MSK Serverless auto-scales partition throughput — no shard or broker sizing needed

# Create a Kafka topic after the cluster is active
aws kafka create-topic \
  --cluster-arn arn:aws:kafka:us-east-1:123456789012:cluster/prod-events-cluster/abc-123 \
  --topic-name order-events \
  --replication-factor 3 \
  --num-partitions 12 \
  --region us-east-1
# replication-factor=3: one replica per AZ for multi-AZ durability
# num-partitions=12: determines max parallelism for consumers
```

> **Note:** MSK brokers live inside your VPC. Kafka producers and consumers must be in the same VPC or connected via VPC peering, Transit Gateway, or PrivateLink. There is no public Kafka endpoint — this is intentional for security.

---

## How to Decide

**MQ vs. SQS — the migration vs. new-build decision:**

| Scenario | Use |
|---|---|
| Existing app uses JMS, AMQP, STOMP, or MQTT | Amazon MQ |
| Migrating on-premises ActiveMQ or RabbitMQ to AWS | Amazon MQ |
| New application being built on AWS | SQS + SNS |
| No legacy protocol requirements | SQS (simpler, serverless, cheaper) |
| Need pub/sub with multiple protocol subscribers | SNS |

**MSK vs. Kinesis — the Kafka expertise decision:**

| Scenario | Use |
|---|---|
| Existing Kafka producers/consumers (Kafka API) | Amazon MSK |
| Migrating on-premises Kafka cluster | Amazon MSK |
| Need Kafka Connect ecosystem connectors | Amazon MSK |
| Need log compaction or Kafka transactions | Amazon MSK |
| New AWS-native streaming workload, no Kafka expertise | Kinesis Data Streams |
| Need Lambda event source mapping natively | Kinesis Data Streams |
| Simplest possible managed streaming with auto-scaling | KDS On-Demand |

**AppFlow vs. custom Lambda integration:**

Use AppFlow when the integration is standard data movement (pull records, map fields, store). Use Lambda when you need custom business logic, real-time sub-second triggers, or transformations AppFlow's built-in capabilities cannot express.

---

## How This Connects

- **SQS / SNS** — The AWS-native alternatives to Amazon MQ. For new workloads, always evaluate SQS and SNS first before Amazon MQ. Amazon MQ is specifically for existing applications that cannot be rewritten.
- **Kinesis Data Streams** — The AWS-native alternative to MSK for streaming. Kinesis integrates more deeply with Lambda and Firehose, while MSK preserves the full Kafka API. Both are valid streaming platforms — the choice depends on whether Kafka ecosystem compatibility or AWS-native integration is the priority.
- **VPC / PrivateLink** — Amazon MQ and MSK both run inside a VPC. Producers and consumers connect over private networking. AppFlow uses PrivateLink to connect to SaaS APIs without data leaving the AWS network.
- **EventBridge** — AppFlow can deliver records to EventBridge as a destination, enabling SaaS-triggered event-driven architectures without custom API integration code.
- **S3 / Redshift** — The most common AppFlow and MSK Connect destinations. SaaS data lands in S3 for Athena analysis or Redshift for BI reporting.

---

## Exam Traps

- **Amazon MQ is not serverless**: it runs on EC2 instances and you pay for those instances even during idle periods. Students sometimes assume it scales like SQS. It does not — you provision broker capacity explicitly.
- **Use Amazon MQ only for migration**: the exam specifically tests whether you know that SQS/SNS is the correct choice for new AWS-native applications, and Amazon MQ is only appropriate when legacy protocol compatibility (JMS, AMQP, etc.) is required.
- **MSK is not a drop-in replacement for Kinesis**: MSK uses the Kafka protocol; Kinesis uses the AWS Kinesis API. Applications must use different client libraries. You cannot switch from Kinesis to MSK without changing application code.
- **MSK Connect ≠ MSK**: MSK Connect (managed Kafka Connect) is a separate, fully managed service that runs Kafka Connect connectors. It is not included in the MSK cluster cost. Students sometimes assume MSK includes managed connectors out of the box.
- **AppFlow is for SaaS data movement, not real-time event processing**: AppFlow's minimum trigger latency is the polling interval for scheduled flows, or the propagation delay for event-based flows. It is not a sub-second real-time integration tool.

---

## Summary

- Amazon MQ provides managed Apache ActiveMQ and RabbitMQ — supporting JMS, AMQP, STOMP, MQTT, and OpenWire for applications that cannot be rewritten to use SQS/SNS. It is the correct choice for legacy broker migration, not new development.
- Amazon MQ Active/Standby deployment provides multi-AZ HA with automatic failover across two AZs using shared EFS-backed storage — required for production workloads.
- Amazon MSK provides fully managed Apache Kafka, preserving the complete Kafka API for existing Kafka producers, consumers, Kafka Connect, and Kafka Streams applications.
- MSK Serverless eliminates broker sizing and automatically scales throughput — the recommended starting point for new MSK deployments with unpredictable traffic.
- Choose MSK when Kafka API compatibility or ecosystem tooling is required; choose Kinesis when building new AWS-native streaming applications that benefit from Lambda, Firehose, and CloudWatch native integration.
- Amazon AppFlow is a no-code SaaS-to-AWS integration service that handles OAuth, API pagination, field mapping, and PII masking automatically — replacing custom Lambda integrations for standard SaaS data movement.

---

## Examples

A mid-size logistics company runs a Java fleet management application that uses JMS over ActiveMQ for internal messaging between dispatch, routing, and billing services. They are migrating to AWS but cannot rewrite the messaging layer — thousands of JMS calls are embedded across multiple services. They deploy Amazon MQ for ActiveMQ in Active/Standby mode, update each service's broker URL to point to the Amazon MQ endpoint, and validate connectivity. The migration completes in days rather than months. Zero JMS code is changed. AWS now manages broker patching, failover, and storage — freeing the team to modernize other layers on their own timeline.

A data engineering team at an e-commerce company has built extensive Kafka-based pipelines over several years: a real-time inventory update stream, a Kafka Streams application for session aggregation, and 12 Kafka Connect connectors pulling from MySQL and pushing to OpenSearch. They are migrating to AWS. They choose MSK over Kinesis because all their producers, consumers, and connectors already speak the Kafka API. After migrating the cluster to MSK and deploying their Kafka Connect connectors via MSK Connect, their pipelines run identically — with AWS now managing broker health, ZooKeeper, and AZ placement.

A marketing operations team needs Salesforce lead data in Redshift for attribution reporting, updated daily. Building a Lambda function to handle Salesforce OAuth, pagination, and API version changes would take a developer two weeks. Instead, they configure an AppFlow flow in 30 minutes: source is Salesforce Leads, destination is Redshift, schedule is daily at 2 AM, field mappings transform Salesforce field names to Redshift column names, and PII masking strips phone numbers before storage. The flow runs automatically, handles Salesforce API rate limits transparently, and requires no ongoing maintenance.

---

## Think About It

1. A team is migrating an on-premises RabbitMQ cluster to AWS. They have two options: Amazon MQ for RabbitMQ, or rewriting the messaging layer to use SQS. What technical and business factors should they weigh in making this decision, and is there a "right" answer?
2. Your MSK cluster has 6 partitions on the critical `order-events` topic, and your consumer group has 8 consumer instances. How many consumers are actively reading data, and how would you change the architecture to use all 8?
3. An architect proposes using AppFlow to deliver Salesforce event notifications to a Lambda function in real time (within 5 seconds of a record change). Is AppFlow the right tool? If not, what would you use instead?
4. You are building a new order processing system on AWS with no legacy messaging constraints. A colleague recommends Amazon MQ for "flexibility." What would you recommend instead, and why?
5. MSK and Kinesis Data Streams both retain records over time and support multiple consumers. What is the primary reason you might still choose MSK over Kinesis for a new workload that has no existing Kafka dependencies? (Portability: Kafka API applications can move between MSK, on-premises Kafka, and Confluent Cloud without code changes. Kinesis is AWS-proprietary — workloads built on Kinesis cannot be moved to a non-AWS environment without a complete rewrite.)