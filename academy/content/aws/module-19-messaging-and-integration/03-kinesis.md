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

## What's Next

Next up: Amazon MQ and MSK — managed message broker and Kafka services.