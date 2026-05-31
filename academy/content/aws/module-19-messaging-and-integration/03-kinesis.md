---
title: "Amazon Kinesis: Real-Time Data Streaming"
type: content
estimated_minutes: 10
cert_tags: ["SAA-C03", "DVA-C02"]
---

# Amazon Kinesis: Real-Time Data Streaming

## Overview

Amazon Kinesis is a family of services for real-time data streaming and analytics. Kinesis Data Streams ingests and processes data streams at scale. Kinesis Data Firehose delivers streaming data to destinations like S3, Redshift, and OpenSearch. Kinesis Data Analytics processes streams with SQL or Apache Flink. This lesson covers the key services and patterns.

## Kinesis Data Streams (KDS)

KDS is a durable, scalable real-time data stream. Producers write records (up to 1 MB each) to named shards. Each shard provides 1 MB/s write throughput and 2 MB/s read throughput. A stream's total throughput = number of shards × per-shard limits. Records are retained for 24 hours by default (up to 7 days extended, 365 days with long-term retention). Multiple consumer applications can read from the same stream independently (different sequence positions). Use KDS for: real-time log processing, clickstream analysis, live leaderboards, fraud detection pipelines.

## Kinesis vs. SQS

SQS: message queue for decoupled processing. Messages are consumed and deleted — only one consumer per message. No ordering guarantee (Standard) or strict order (FIFO). Replay is not possible. Kinesis: ordered log stream. Multiple consumers can read independently. Records persist for the retention window, enabling replay. Shards determine throughput (capacity planning required). Choose SQS for: task queuing, work distribution, at-least-once processing. Choose Kinesis for: multiple consumers of the same data, replay/reprocessing, time-series data, real-time analytics pipelines.

## Kinesis Data Firehose

Firehose is the simplest way to load streaming data into AWS storage and analytics services. Producers write to a Firehose delivery stream; Firehose buffers, optionally transforms (via Lambda), and delivers to: S3, Redshift (via S3), OpenSearch, Splunk, or HTTP endpoint. No capacity planning — Firehose scales automatically. Delivery is near-real-time (60-second buffer minimum, up to 128 MB). Use Firehose for: log archival to S3, streaming ETL into Redshift, real-time dashboards in OpenSearch.

## Kinesis Data Analytics for Apache Flink

Kinesis Data Analytics (KDA) runs Apache Flink applications fully managed. Flink processes streams with windowing (tumbling, sliding, session windows), aggregations, joins between streams, and complex event detection. Input: Kinesis Data Streams or MSK (Amazon Managed Streaming for Kafka). Output: KDS, Firehose, Lambda, S3. Use for: real-time anomaly detection, sessionization, complex stream transformations, and anything that needs stateful stream processing beyond simple Lambda-per-record patterns.

## Summary

Kinesis Data Streams: ordered, multi-consumer, durable stream with replay. Firehose: managed delivery to S3/Redshift/OpenSearch with buffering and optional Lambda transformation. KDA with Flink for complex stateful stream processing. Use KDS when multiple services consume the same stream or replay is needed; use SQS for simple one-consumer task queuing.

## Examples

A mobile gaming company tracks every in-game action — item pickups, kills, level completions — across millions of concurrent players. They write events to Kinesis Data Streams, which feeds three independent consumers: a real-time leaderboard service, a fraud/cheat-detection Lambda, and a Firehose delivery stream archiving raw events to S3. All three read the same stream independently at their own positions. This multi-consumer replay capability is impossible with SQS, where a message is gone once consumed.

A SaaS platform needs to load application logs into Amazon OpenSearch for live dashboards and simultaneously archive them to S3 in Parquet for long-term analysis. They use Kinesis Data Firehose with two delivery streams: one to OpenSearch with a 60-second buffer, one to S3 with a Lambda transformation that converts JSON to Parquet. The operations team configures this entirely in the console — no producers or consumers to manage, no capacity planning, near-real-time delivery with automatic scaling.

A digital advertising exchange processes billions of bid events per day and needs to detect bid-shading patterns — where a buyer consistently bids just below the clearing price — within a 5-minute rolling window. They run a Kinesis Data Analytics Apache Flink application with a sliding-window aggregation joining two streams: bid requests and win notifications. The stateful Flink job maintains per-buyer running averages and emits anomalies to a downstream Lambda for action. This is a scenario where neither a simple Lambda-per-record pattern nor Firehose is sufficient — stateful stream joining requires Flink.

## Think About It

1. Kinesis Data Streams retains records for 24 hours by default. What specific operational or business scenarios would justify paying for 7-day or 365-day retention, and what scenarios would not?
2. You have a stream with 4 shards and your write throughput has grown to consistently hit the per-shard limits. What are your options, and what are the trade-offs of each?
3. Why can't you replay messages from SQS the way you can replay records from Kinesis? What architectural decision in SQS makes replay structurally impossible?
4. How would you decide whether to use Kinesis Data Firehose alone versus Kinesis Data Streams feeding into a Lambda and then Firehose? What does the extra hop through KDS buy you?
5. Kinesis Data Analytics with Flink supports windowing operations (tumbling, sliding, session). What real business problem does a session window solve that a fixed tumbling window cannot?

## Quick Check

**Q1.** A Kinesis Data Stream has 5 shards. What is its maximum sustained write throughput?

- A) 1 MB/s total
- B) 5 MB/s total
- C) 10 MB/s total
- D) Unlimited — Kinesis scales automatically

**Answer: B** — Each shard provides 1 MB/s write throughput, so 5 shards = 5 MB/s total sustained write capacity.

**Q2.** Which Kinesis service is best suited for delivering streaming log data to Amazon S3 with optional Lambda transformation and no capacity planning?

- A) Kinesis Data Streams
- B) Kinesis Data Analytics
- C) Kinesis Data Firehose
- D) Kinesis Enhanced Fan-Out

**Answer: C** — Kinesis Data Firehose is a fully managed delivery service that buffers, optionally transforms via Lambda, and delivers to S3, Redshift, OpenSearch, and other destinations with no shard management required.

**Q3.** What is the key capability that makes Kinesis Data Streams fundamentally different from SQS for analytics pipelines?

- A) Kinesis messages can be larger than 256 KB
- B) Multiple independent consumer applications can read the same stream at different positions, and records can be replayed within the retention window
- C) Kinesis guarantees exactly-once delivery while SQS does not
- D) Kinesis integrates with Lambda but SQS does not

**Answer: B** — The durable, ordered, replayable log model allows multiple consumers to read independently and enables reprocessing of historical records — neither of which is possible with SQS's consume-and-delete model.

## What's Next

Next up: Amazon MQ and MSK — managed message broker and Kafka services.