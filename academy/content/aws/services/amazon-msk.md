---
title: "Amazon MSK"
type: content
estimated_minutes: 14
cert_tags: ["SAA-C03", "SOA-C03"]
---

# Amazon MSK

## Overview

Amazon Managed Streaming for Apache Kafka (MSK) is a fully managed service for running **Apache Kafka**, the open-source distributed event-streaming platform, on AWS. It provisions, configures, patches, and maintains Kafka clusters so you can build streaming pipelines and event-driven systems using the standard Kafka APIs and ecosystem without operating Kafka yourself. This *service reference* lesson covers when to choose MSK, how it works, the deployment options, and what each certification expects.

MSK matters because many organizations have standardized on **Apache Kafka** — for its ecosystem (Kafka Connect, Streams, Schema Registry), its strong ordering and replay semantics, and its portability across environments — but running production Kafka (brokers, ZooKeeper/KRaft, partitions, rebalancing, patching) is operationally demanding. MSK removes that burden while keeping full Kafka compatibility, so existing Kafka applications and tooling work unchanged. The core decision the exams test is **MSK vs. Kinesis**: choose MSK when you need Kafka compatibility, the Kafka ecosystem, or to migrate existing Kafka workloads; choose Kinesis for a simpler, fully serverless AWS-native streaming service.

---

## How It Works

MSK runs **Kafka brokers** across multiple Availability Zones for high availability. Producers publish **records** to **topics** divided into **partitions** (which provide ordering and parallelism), and consumers read from them in **consumer groups**, with data **retained** and **replayable** (unlike a queue). MSK manages broker provisioning, AZ distribution, patching, and metadata management.

Deployment options:

- **MSK provisioned** — you choose broker instance types and counts and control configuration; the most flexible.
- **MSK Serverless** — Kafka without managing broker capacity; it scales partitions/throughput automatically — ideal for variable or unpredictable workloads.

MSK supports the Kafka ecosystem: **MSK Connect** (managed Kafka Connect for source/sink connectors), schema registries, and standard client libraries. Because it's real Kafka, you keep Kafka APIs, semantics, and tooling.

---

## Key Features

- **Fully managed Apache Kafka** with multi-AZ broker deployment and automated patching.
- **Provisioned and Serverless** options.
- **MSK Connect** for managed connectors (to S3, databases, OpenSearch, etc.).
- **Kafka-native** ordering, retention, replay, and consumer groups.
- **Security**: VPC deployment, encryption (KMS) at rest and TLS in transit, and authentication via IAM, SASL/SCRAM, or mutual TLS.

---

## Configuration Reference

- **Choose provisioned vs. Serverless** by whether you want to size brokers or auto-scale throughput.
- **Deploy across multiple AZs** with replication for HA; size partitions for ordering/parallelism.
- **Secure** with VPC, **IAM access control** (or SASL/SCRAM/mTLS), KMS encryption, and TLS.
- **Use MSK Connect** for managed integration with other systems.

---

## Operations and Troubleshooting

- **MSK vs. Kinesis.** If the requirement names Kafka, needs the Kafka ecosystem/APIs, or is a Kafka migration, choose **MSK**; if it wants a simple, serverless AWS-native stream, choose **Kinesis Data Streams**. This is the core exam decision.
- **Consumer lag.** Monitor partition lag via CloudWatch; scale consumers or partitions.
- **Capacity.** Provisioned clusters need broker sizing and partition planning; **Serverless** removes this for variable loads.
- **Security.** Use IAM or SASL/SCRAM/mTLS; keep clusters in private subnets.

---

## Integrations

MSK runs in a **VPC**, encrypts with **KMS** and TLS, authenticates with **IAM**, integrates via **MSK Connect** with **S3**, databases, and **OpenSearch**, is consumed by **Lambda** (event source mapping) and stream processors (**Managed Service for Apache Flink**), and is monitored by **CloudWatch**. It is the Kafka-compatible alternative to **Amazon Kinesis** in the streaming space.

---

## Pricing and Cost Considerations

MSK **provisioned** bills by **broker-hours** (instance type × count) plus storage and data transfer; **MSK Serverless** bills by **cluster-hours plus throughput and storage** consumed. The cost levers are right-sizing brokers and partitions for provisioned clusters, using Serverless for variable workloads, and minimizing cross-AZ traffic. Compared with Kinesis, MSK can be more cost-effective at sustained high throughput but carries more operational/sizing responsibility (less so with Serverless). Exact prices vary by Region.

---

## Exam Relevance

**SAA-C03:** Know MSK as managed Apache Kafka, the provisioned/Serverless options, Kafka's ordering/retention/replay, and especially **MSK vs. Kinesis** selection (Kafka compatibility/ecosystem/migration vs. AWS-native simplicity). Design depth.

**SOA-C03:** Operate clusters — multi-AZ HA, partition/consumer scaling, MSK Connect, and monitoring lag. Operations depth.

---

## Summary

Amazon MSK is fully managed Apache Kafka — multi-AZ brokers, topics/partitions with ordering, retention, and replay, and consumer groups — available as provisioned (you size brokers) or Serverless (auto-scaling). It keeps full Kafka compatibility and ecosystem (MSK Connect, standard clients), secured with VPC/KMS/TLS and IAM/SASL/mTLS, and integrates with Lambda, Flink, and connectors. The defining exam point is MSK vs. Kinesis: choose MSK for Kafka compatibility, the Kafka ecosystem, or migrations; choose Kinesis for simple, serverless AWS-native streaming.

---

## Quick Check

1. When would you choose MSK over Amazon Kinesis Data Streams?
2. What do partitions provide in a Kafka topic?
3. What is the difference between MSK provisioned and MSK Serverless?
4. Which authentication options does MSK support?
5. What does MSK Connect enable?

---

## What's Next

Pair this with **Amazon Kinesis** (the AWS-native streaming comparison), **AWS Lambda** (consumers), and **Amazon S3/OpenSearch** (connector sinks).
