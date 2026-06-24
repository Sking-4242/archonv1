---
title: "Amazon Kinesis"
type: content
estimated_minutes: 17
cert_tags: ["AIF-C01", "SAA-C03", "SOA-C03"]
---

# Amazon Kinesis

## Overview

Amazon Kinesis is a family of services for collecting, processing, and analyzing **real-time streaming data** at scale — clickstreams, logs, IoT telemetry, application events, and media. Instead of batching data and processing it later, Kinesis lets you ingest and react to data continuously, within seconds of its creation. This *service reference* lesson covers the main Kinesis services, how streams work, the choice between them and other streaming options, and what each certification expects.

Kinesis matters because many use cases need data *now*: real-time dashboards, anomaly detection, live personalization, log aggregation, and feeding machine-learning inference. Building a durable, scalable, ordered streaming pipeline by hand is hard; Kinesis provides it managed. The key is to distinguish the family members, because they solve different problems: **Kinesis Data Streams** (durable, low-latency stream you build consumers on), **Kinesis Data Firehose** (zero-administration delivery of streams to storage/analytics destinations), and **Kinesis Video Streams** (media). The most common exam decision is Data Streams vs. Firehose, and Kinesis vs. SQS vs. MSK (Kafka).

---

## How It Works

- **Kinesis Data Streams** — a durable, real-time stream divided into **shards**, each providing a fixed ingest/egress throughput. Producers write **records** (with a **partition key** that maps to a shard and preserves per-shard ordering); multiple consumers can read the same data independently, and records are retained (default 24 hours, up to 365 days). You manage capacity via **provisioned shards** or **on-demand** mode that scales automatically. Consumers include Lambda, the Kinesis Client Library, and analytics services — and because data is retained and replayable, multiple applications can process the same stream.
- **Kinesis Data Firehose** — a fully managed **delivery stream** that buffers and loads streaming data into destinations like **S3, Redshift, OpenSearch, and Splunk** (and HTTP endpoints), with optional **transformation** (via Lambda) and format conversion. It is **near-real-time** (buffered by size/time), requires no shard management, and scales automatically — the simplest path from stream to storage/analytics.
- **Kinesis Video Streams** — securely ingest and process video/media streams.

For SQL-style stream analytics, **Amazon Managed Service for Apache Flink** (formerly Kinesis Data Analytics) processes Kinesis streams.

---

## Key Features

- **Real-time, ordered, replayable** ingestion (Data Streams), with multiple independent consumers and configurable retention.
- **On-demand or provisioned** capacity for Data Streams; **Enhanced Fan-Out** for dedicated per-consumer throughput.
- **Zero-admin delivery** to S3/Redshift/OpenSearch/Splunk with buffering, compression, and Lambda transformation (Firehose).
- **Encryption** at rest (KMS) and in transit, with IAM-controlled access.
- **Integration with Lambda** for serverless stream processing and with Managed Flink for SQL/streaming analytics.

---

## Configuration Reference

- **Choose the service**: **Data Streams** when you need custom/multiple consumers, low latency, ordering, or replay; **Firehose** when you just need to land streaming data in S3/Redshift/OpenSearch/Splunk with minimal management.
- **Pick a good partition key** (Data Streams) for even shard distribution and to avoid hot shards; use **on-demand** mode to avoid manual shard scaling.
- **Set retention** for replay needs; enable **KMS encryption**.
- **For Firehose**, configure the destination, buffering hints, optional Lambda transform, and format conversion.

---

## Operations and Troubleshooting

- **Throttling / `ProvisionedThroughputExceeded`.** A hot shard from a skewed partition key, or insufficient shards — improve the partition key, add shards, or switch to on-demand.
- **Consumer falling behind.** Watch the **iterator age**; scale consumers, use **Enhanced Fan-Out** for dedicated throughput, or increase parallelism.
- **Data Streams vs. Firehose confusion.** If the requirement is "deliver to S3/Redshift/OpenSearch with no code/management," that's **Firehose**; if it's "multiple custom consumers, replay, sub-second latency," that's **Data Streams**.
- **Kinesis vs. SQS.** SQS is a queue (each message consumed once, then deleted, no replay); Kinesis is a stream (ordered, retained, multiple consumers, replay) — choose by whether you need streaming/replay/multiple consumers.

---

## Integrations

Kinesis ingests from producers (SDK, Kinesis Agent, IoT) and integrates with **Lambda** (stream processing), **Amazon Managed Service for Apache Flink** (SQL/streaming analytics), **S3/Redshift/OpenSearch/Splunk** (Firehose destinations, feeding **Athena**/analytics), **KMS** (encryption), and **CloudWatch** (metrics). It commonly feeds **data lakes** and **ML pipelines** (real-time features/inference). For Kafka-compatible workloads, the alternative is **Amazon MSK**; for simple decoupling, **SQS**.

---

## Pricing and Cost Considerations

**Kinesis Data Streams** bills by **shard-hour** plus per-record (PUT payload) units in provisioned mode, or by data volume in **on-demand** mode; extended retention and Enhanced Fan-Out add cost. **Firehose** bills by the **volume of data ingested** (plus format conversion/transformation), with no shard management. The cost levers are choosing on-demand vs. provisioned by traffic predictability, using Firehose when you don't need custom consumers (it's simpler and often cheaper for plain delivery), and right-sizing retention and fan-out. Exact prices vary by Region and mode.

---

## Exam Relevance

**AIF-C01:** Know Kinesis as real-time streaming ingestion that feeds data lakes and ML pipelines. Conceptual.

**SAA-C03:** Know **Data Streams vs. Firehose** (custom consumers/replay/low-latency vs. zero-admin delivery to S3/Redshift/OpenSearch), partition keys and shards, on-demand mode, and **Kinesis vs. SQS vs. MSK** selection. Design depth.

**SOA-C03:** Operate streams — shard scaling, iterator-age/throughput monitoring, on-demand mode, and Firehose delivery troubleshooting. Operations depth.

---

## Summary

Amazon Kinesis is a family for real-time streaming data: **Data Streams** (durable, sharded, ordered, replayable streams you build multiple consumers on, in provisioned or on-demand mode), **Firehose** (zero-administration, near-real-time delivery of streams into S3/Redshift/OpenSearch/Splunk with optional Lambda transformation), and **Video Streams** (media), with **Managed Service for Apache Flink** for SQL/streaming analytics. It encrypts with KMS, integrates with Lambda and the analytics/data-lake stack, and feeds ML pipelines. The recurring exam points are Data-Streams-vs-Firehose, partition keys/shards and hot-shard throttling, and Kinesis (streaming, replay, multiple consumers) versus SQS (queue, consume-once).

---

## Quick Check

1. When would you choose Kinesis Data Streams versus Kinesis Data Firehose?
2. What does a shard provide, and what role does the partition key play (and how does a bad one cause throttling)?
3. How does a stream (Kinesis) differ from a queue (SQS) in ordering, retention, and number of consumers?
4. Which Firehose feature lets you reshape records before they land in S3?
5. Which metric indicates a Data Streams consumer is falling behind?

---

## What's Next

Pair this with **Amazon S3** and **Amazon Athena** (common downstream of Firehose), **AWS Lambda** (stream processing), and **Amazon SQS** (queue vs. stream comparison).
