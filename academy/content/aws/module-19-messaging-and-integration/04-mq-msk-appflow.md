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

## What's Next

Next up: the Module 19 Canvas Lab — design a decoupled event-driven architecture.