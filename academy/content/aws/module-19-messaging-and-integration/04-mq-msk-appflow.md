---
title: "Amazon MQ, MSK, and AppFlow"
type: content
estimated_minutes: 8
cert_tags: ["SAA-C03", "SAP-C02"]
---

# Amazon MQ, MSK, and AppFlow

## Overview

Beyond SQS, SNS, and Kinesis, AWS offers managed versions of popular open-source messaging systems. Amazon MQ manages Apache ActiveMQ and RabbitMQ for teams migrating from on-premises brokers. MSK provides managed Apache Kafka. AppFlow connects SaaS applications to AWS services.

## Amazon MQ

Amazon MQ is a managed message broker for ActiveMQ and RabbitMQ. If your application uses JMS, AMQP, STOMP, MQTT, or OpenWire protocols and you're migrating from an on-premises ActiveMQ or RabbitMQ, use Amazon MQ — your application code doesn't need to change. For new applications, prefer SQS and SNS (no protocol complexity, better AWS integration, no broker management). Amazon MQ runs on EC2 instances (you choose size); Single-instance for dev, Active/Standby for production HA.

## Amazon MSK (Managed Streaming for Kafka)

MSK is fully managed Apache Kafka — the open-source standard for high-throughput, durable, partitioned log streaming. AWS manages the Kafka control plane (ZooKeeper/KRaft), broker patching, and multi-AZ cluster topology. You manage producer/consumer configuration and topic setup. Use MSK when: your team has Kafka expertise, you're migrating from on-premises Kafka, or you need Kafka-specific features (log compaction, exactly-once semantics, Kafka Connect, Kafka Streams). MSK Serverless is a new option requiring no capacity planning.

## MSK vs. Kinesis Data Streams

Kinesis: AWS-proprietary, deep AWS SDK integration, capacity in shards (auto-scaling with KDS Enhanced Fan-Out), simpler operational model, per-shard pricing. MSK: open-source Kafka, full Kafka ecosystem (Connect, Streams, Schema Registry), EC2 broker instances (requires capacity planning), portable to other Kafka-compatible systems. Choose MSK for Kafka ecosystem compatibility and existing Kafka expertise; choose KDS for AWS-native simplicity and seamless Lambda/Firehose integration.

## Amazon AppFlow

AppFlow enables no-code data flows between SaaS applications (Salesforce, Marketo, Zendesk, ServiceNow, Slack, Google Analytics) and AWS services (S3, Redshift, EventBridge). Configure flows in the console: source, destination, trigger (on-demand, scheduled, or event-based), field mappings, and transformations. No custom code. Use AppFlow for ingesting SaaS data into a data lake, syncing records between systems, or triggering AWS workflows from SaaS events — without writing API integration code.

## Summary

Amazon MQ for migrating on-premises ActiveMQ/RabbitMQ workloads. MSK for managed Kafka when you need the Kafka ecosystem or have existing Kafka expertise. AppFlow for no-code SaaS-to-AWS data integration. For new projects without legacy requirements, SQS/SNS/Kinesis are the default choices — they're simpler and more deeply integrated with AWS.

## Examples

A mid-size insurance company runs an on-premises ActiveMQ broker that ties together a policy management system, a claims processor, and a billing engine — all communicating over JMS. They're migrating to AWS but can't rewrite all three applications in the same quarter. They lift their broker onto Amazon MQ (Active/Standby for HA), point each application at the new broker endpoints, and the apps work without a single line of code change. This is precisely the use case Amazon MQ exists for: migration without re-architecture.

A ride-sharing startup has built deep internal expertise around Apache Kafka — their engineers know Kafka Connect, Kafka Streams, and Schema Registry, and several upstream partners already publish events to their Kafka topics. When they move to AWS, they choose MSK rather than Kinesis because the Kafka ecosystem tooling, existing producer/consumer code, and partner integrations are non-negotiable. MSK handles the control plane; the team keeps all their Kafka configuration and application logic intact.

A marketing operations team at a retail chain needs to pull Salesforce lead records nightly into Redshift for campaign attribution reporting. The integration requires field mapping, filtering out test accounts, and masking PII. With AppFlow, a non-engineer sets up the flow in the console in an afternoon: Salesforce as source, Redshift as destination, a scheduled nightly trigger, field mappings with a transformation to mask email addresses, and a filter to exclude `lead_source = "INTERNAL"`. No Lambda, no API integration code, no infrastructure — just a configured flow.

## Think About It

1. Amazon MQ is recommended only for migration scenarios, not new projects. Why would AWS build and offer a product they explicitly recommend against for greenfield work? What does that tell you about the real-world state of enterprise IT?
2. MSK gives you full Kafka compatibility but requires more capacity planning than Kinesis. Under what conditions would the operational overhead of MSK be worth it, and when would it be a mistake to choose it over Kinesis?
3. AppFlow requires no custom code. What are the hidden risks of relying on a no-code integration tool for a business-critical data pipeline, and how would you mitigate them?
4. MSK Serverless removes capacity planning. If MSK Serverless exists, under what circumstances would you still choose provisioned MSK brokers?
5. If your organization is 100% standardized on Apache Kafka on-premises and is moving to AWS, what is the strongest argument for migrating to Kinesis instead of MSK? What would you lose, and what would you gain?

## Quick Check

**Q1.** A company is migrating an application that uses AMQP to communicate with a RabbitMQ broker to AWS. Which service allows them to migrate without changing application code?

- A) Amazon SQS
- B) Amazon MSK
- C) Amazon MQ
- D) Amazon Kinesis Data Streams

**Answer: C** — Amazon MQ supports RabbitMQ (and ActiveMQ) with standard protocols including AMQP, STOMP, MQTT, and OpenWire, enabling lift-and-shift migrations without code changes.

**Q2.** Which of the following is a reason to choose MSK over Kinesis Data Streams?

- A) You want deep native integration with AWS Lambda event source mapping
- B) You need Kafka Connect, Kafka Streams, or Schema Registry from the Apache Kafka ecosystem
- C) You want automatic scaling with no capacity planning
- D) You need per-message delivery to HTTP endpoints

**Answer: B** — MSK's primary advantage is full compatibility with the Apache Kafka ecosystem, including Kafka Connect for data pipelines, Kafka Streams for stream processing, and the broader community tooling not available with the AWS-proprietary Kinesis API.

**Q3.** What type of trigger can AppFlow use to initiate a data flow from Salesforce to S3?

- A) Only manual, on-demand triggers
- B) Only event-based triggers from Salesforce change events
- C) On-demand, scheduled, or event-based triggers
- D) Only Lambda invocations

**Answer: C** — AppFlow supports three trigger types: on-demand (manual), scheduled (cron-like), and event-based (reacting to source-system events like Salesforce record changes).

## What's Next

Next up: the Module 19 Canvas Lab — design a decoupled event-driven architecture.