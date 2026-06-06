---
title: "Amazon Kinesis: Real-Time Data Streaming"
type: content
estimated_minutes: 13
cert_tags: ["SAA-C03", "SAP-C02"]
---

# Amazon Kinesis: Real-Time Data Streaming

## Overview

SQS and SNS are designed for message-based decoupling: a producer sends a message, a consumer processes it, the message is deleted. Kinesis is built for a different model — the **ordered, durable, replayable data stream**. Data written to Kinesis is retained for a configurable window (24 hours by default, up to 365 days). Multiple independent consumers can read the same records simultaneously at different positions in the stream. Records are not deleted when consumed — they expire naturally at the end of the retention window.

This model enables a class of use cases that SQS cannot support: three services independently consuming the same clickstream data, reprocessing a bug-fixed fraud model against the last 24 hours of transactions, or running a real-time dashboard and a data warehouse ingestion pipeline from the same event source simultaneously. Kinesis is the foundation for real-time streaming data architectures on AWS, and its three-service family — Kinesis Data Streams (KDS), Kinesis Data Firehose, and Amazon Managed Service for Apache Flink — covers ingestion, delivery, and stateful stream processing respectively.

For the SAA exam, understand KDS shard capacity math, the Kinesis vs. SQS decision, Firehose's buffered delivery model, and when each service is appropriate. SAP adds Enhanced Fan-Out (dedicated read throughput per consumer), Kinesis Client Library (KCL) consumer configuration, and stateful stream processing with Flink including windowing and stream joins. After this lesson, you will be able to architect a real-time data pipeline using the right Kinesis component at each layer.

---

## Core Concepts

### Kinesis Data Streams (KDS)

Kinesis Data Streams is a durable, ordered, real-time data stream. Producers write **records** (partition key + data blob, up to 1 MB per record) to a **stream**. Records with the same partition key always go to the same **shard** — the fundamental unit of capacity in Kinesis.

**Shard capacity:**
- **Write**: 1 MB/second or 1,000 records/second per shard
- **Read (shared)**: 2 MB/second per shard, shared across all standard consumers on that shard
- **Read (Enhanced Fan-Out)**: 2 MB/second per shard, *per registered consumer* — dedicated, not shared

Total stream throughput = number of shards × per-shard limits. To support 10 MB/s of writes, you need at least 10 shards. Scale out by adding shards (splitting); scale in by removing them (merging). **KDS On-Demand mode** eliminates manual shard management — KDS automatically scales to handle fluctuating throughput.

**Retention**: records are retained for 24 hours by default. Extended retention is configurable: up to 7 days at standard pricing, and up to 365 days with Long-Term Data Retention. During the retention window, any consumer can seek to any position (by sequence number or timestamp) and re-read records — this is the replay capability that SQS does not have.

**Partition key design matters**: all records with the same partition key go to the same shard. A poorly chosen key (e.g., a single constant, or a field with very low cardinality) concentrates writes on one shard — a "hot shard" — while others sit idle. Design partition keys with high cardinality and even distribution (user ID, device ID, session ID) to spread load evenly across shards.

---

### Kinesis vs. SQS

This is the most frequently tested comparison in this module. Three dimensions determine the right choice:

**Single consumer vs. multiple independent consumers**: SQS messages are deleted after consumption — only one consumer processes each message. Kinesis records persist through the retention window and multiple independent consumers can read the same record concurrently. If three services need to process the same event stream independently, Kinesis is the right choice.

**Replay**: SQS does not support replay — a deleted message is gone. Kinesis retains records for the retention window, enabling reprocessing (re-running a corrected consumer against historical data).

**Throughput model**: SQS scales automatically with no capacity planning. Kinesis requires shard provisioning (unless using On-Demand mode). Forgetting this distinction is a common exam mistake.

**Ordering**: SQS Standard provides best-effort ordering; FIFO provides ordering within message groups. Kinesis provides strict ordering within a shard.

| Decision factor | Use SQS | Use Kinesis |
|---|---|---|
| Consumers of same data | Only one consumer | Multiple independent consumers |
| Replay / reprocessing | Not needed | Required |
| Throughput | Unpredictable, auto-scales | High and predictable |
| Ordering | Per-group (FIFO) or best-effort | Per-shard, strict |
| Use case type | Task queue, work distribution | Analytics, event streaming pipelines |

---

### Kinesis Data Firehose

Kinesis Data Firehose is a fully managed, near-real-time delivery service for streaming data. Producers write to a Firehose delivery stream; Firehose buffers records and automatically delivers them to a destination. No shards, no consumer applications, no capacity management — Firehose is fully serverless.

**Destinations**: Amazon S3 (most common), Amazon Redshift (via S3 staging), Amazon OpenSearch Service, Splunk, Datadog, New Relic, MongoDB, and any custom HTTPS endpoint.

**Buffering**: Firehose accumulates records until a buffer threshold is met, then flushes:
- **Buffer size**: 1–128 MB (delivery triggers when this size is reached)
- **Buffer interval**: 60–900 seconds (delivery triggers when this time elapses)
Delivery occurs when *either* threshold is hit first. The minimum end-to-end latency from record arrival to destination write is approximately 60 seconds — Firehose is near-real-time, not true real-time.

**Data transformation**: Firehose can invoke a Lambda function on each buffer batch before delivery — for format conversion (JSON to Apache Parquet, JSON to ORC), PII masking, filtering, or enrichment. This is the managed ETL layer for streaming data destined for analytics storage.

Use Firehose when: you want streaming data delivered to S3, Redshift, or OpenSearch without writing or managing a consumer application. Do not use Firehose when sub-minute latency is required or when per-record processing logic belongs in a stateful consumer — that is KDS + Lambda or KDS + Flink.

---

### Amazon Managed Service for Apache Flink

Amazon Managed Service for Apache Flink (formerly Kinesis Data Analytics for Apache Flink) runs Apache Flink applications on fully managed infrastructure. Flink is a stateful stream processing engine that extends beyond per-record Lambda processing:

- **Tumbling windows**: aggregate over fixed, non-overlapping intervals (sum of sales per 5-minute window)
- **Sliding windows**: aggregate over overlapping intervals (rolling 10-minute average, updated every minute)
- **Session windows**: group events by activity periods separated by gaps of inactivity
- **Stream joins**: join two streams within a time window (join bid requests with win events arriving within 500ms)
- **Stateful processing**: maintain running state per key across events (running total per user, running count per device)

Input sources: Kinesis Data Streams, Amazon MSK. Output: KDS, Firehose, Lambda, S3, or other targets via Flink connectors.

Use Flink when: per-record Lambda processing is insufficient because the computation requires windowed aggregation, state across events, or joining multiple concurrent streams.

---

## Configuration Reference

### Example: Create a KDS Stream and Attach a Lambda Consumer

```bash
# Step 1: Create a Kinesis Data Stream with 4 shards
# 4 shards = 4 MB/s write throughput, 8 MB/s read throughput (shared)
aws kinesis create-stream \
  --stream-name prod-clickstream \
  --shard-count 4 \
  --region us-east-1

# Step 2: Enable 7-day extended retention (default is 24 hours)
aws kinesis increase-stream-retention-period \
  --stream-name prod-clickstream \
  --retention-period-hours 168 \
  --region us-east-1

# Step 3: Attach a Lambda event source mapping to consume from the stream
aws lambda create-event-source-mapping \
  --function-name clickstream-processor \
  --event-source-arn arn:aws:kinesis:us-east-1:123456789012:stream/prod-clickstream \
  --batch-size 100 \
  --starting-position LATEST \
  --bisect-batch-on-function-error true \
  --destination-config '{"OnFailure":{"Destination":"arn:aws:sqs:us-east-1:123456789012:clickstream-dlq"}}' \
  --region us-east-1
# starting-position LATEST: only process new records; use TRIM_HORIZON to start from beginning
# bisect-batch-on-function-error true: on failure, split the batch in half and retry each half
#   separately — isolates a single bad record without reprocessing the entire batch
# destination-config: after all retries exhausted, failed records go to an SQS DLQ
```

---

### Example: Kinesis Data Firehose Delivery to S3 with Lambda Transform

```bash
# Create a Firehose delivery stream: raw JSON → Lambda transforms to Parquet → S3
aws firehose create-delivery-stream \
  --delivery-stream-name prod-events-to-s3 \
  --delivery-stream-type DirectPut \
  --extended-s3-destination-configuration '{
    "RoleARN": "arn:aws:iam::123456789012:role/firehose-delivery-role",
    "BucketARN": "arn:aws:s3:::prod-data-lake",
    "Prefix": "events/year=!{timestamp:yyyy}/month=!{timestamp:MM}/day=!{timestamp:dd}/",
    "ErrorOutputPrefix": "errors/!{firehose:error-output-type}/",
    "BufferingHints": {
      "SizeInMBs": 64,
      "IntervalInSeconds": 300
    },
    "CompressionFormat": "UNCOMPRESSED",
    "DataFormatConversionConfiguration": {
      "Enabled": true,
      "InputFormatConfiguration": {"Deserializer": {"OpenXJsonSerDe": {}}},
      "OutputFormatConfiguration": {"Serializer": {"ParquetSerDe": {}}}
    },
    "ProcessingConfiguration": {
      "Enabled": true,
      "Processors": [{
        "Type": "Lambda",
        "Parameters": [{"ParameterName": "LambdaArn",
          "ParameterValue": "arn:aws:lambda:us-east-1:123456789012:function:enrich-events"}]
      }]
    }
  }' \
  --region us-east-1
# BufferingHints: deliver when 64 MB is buffered OR 300 seconds have elapsed, whichever first
# DataFormatConversion: converts JSON input to Parquet on delivery — cheaper Athena queries
# Prefix with !{timestamp}: creates Hive-partitioned S3 prefix for efficient Athena scanning
```

> **Note:** The `ErrorOutputPrefix` is important — records that fail Lambda transformation or S3 delivery are written here instead of being silently dropped. Always configure it in production.

---

## How to Decide

**KDS vs. Firehose:**

| Requirement | KDS | Firehose |
|---|---|---|
| Custom consumer application (Flink, KCL, Lambda) | ✅ | ❌ |
| Sub-60-second latency | ✅ | ❌ |
| Multiple independent consumers | ✅ | ❌ (single destination) |
| Replay from stored records | ✅ | ❌ |
| Deliver to S3/Redshift/OpenSearch without code | ❌ | ✅ |
| Fully serverless, no capacity management | On-Demand mode | ✅ |
| Built-in format conversion (JSON → Parquet) | ❌ | ✅ |

**Sizing KDS shards:**

1. Calculate peak write throughput in MB/s (record size × records/second)
2. Divide by 1 MB/s → minimum shards required for writes
3. Calculate read throughput: number of consumers × MB/s each needs; divide by 2 MB/s per shard (or use Enhanced Fan-Out for dedicated throughput)
4. Take the larger of write-based and read-based shard counts, then add 20% headroom
5. For unpredictable workloads, use KDS On-Demand mode instead

**When to add Enhanced Fan-Out:**

If two or more consumers need to read from the same stream at high throughput, the 2 MB/s shared read limit becomes a bottleneck — consumers compete for the same bandwidth. Register each as an Enhanced Fan-Out consumer to give each its own dedicated 2 MB/s per shard. This costs more but eliminates read-side contention.

---

## How This Connects

- **Lambda** — Lambda's Kinesis event source mapping polls shards and invokes the function with batches of records. Supports `bisect-batch-on-function-error` to isolate bad records, and a failure destination (SQS or SNS) for records that exhaust all retries.
- **S3** — Firehose's primary destination. Records buffered by Firehose land in S3 with configurable partitioning prefixes. Once in S3, they are queryable by Athena and loadable by Glue.
- **Amazon Redshift** — Firehose can load directly into Redshift via S3 staging, automating the `COPY` command for streaming data warehouse ingestion.
- **Amazon OpenSearch Service** — Firehose delivers to OpenSearch for real-time log analytics and full-text search pipelines.
- **CloudWatch** — KDS publishes shard-level metrics: `IncomingRecords`, `GetRecords.IteratorAgeMilliseconds` (how far behind consumers are — a rising iterator age signals under-provisioned consumer capacity), and `WriteProvisionedThroughputExceeded` (signal to add shards).
- **AWS Glue** — Glue crawlers catalog Firehose-delivered S3 data for Athena queries. Glue ETL jobs process historical Kinesis data for batch analytics alongside real-time Flink pipelines.

---

## Exam Traps

- **Kinesis and SQS are not interchangeable**: SQS messages are deleted after consumption (one consumer per message). Kinesis records persist and support multiple consumers and replay. A question describing "multiple independent consumers of the same data stream" always points to Kinesis, not SQS.
- **Firehose has a minimum 60-second latency**: the buffer interval minimum is 60 seconds. Firehose is near-real-time, not real-time. Questions describing sub-minute latency requirements should point to KDS, not Firehose.
- **Shard hot spots from bad partition keys**: using a low-cardinality partition key (e.g., a boolean flag, a constant, or a region with only a few values) concentrates writes on a small number of shards. The exam tests this by describing write throttling on a stream that appears to have enough shards — the diagnosis is hot-shard concentration from a poor partition key.
- **Enhanced Fan-Out costs extra**: standard consumers share 2 MB/s read throughput per shard at no additional charge. Enhanced Fan-Out consumers each get dedicated 2 MB/s per shard but incur additional per-shard-hour and per-GB charges. Do not default to EFO for all consumers.
- **KDS On-Demand vs. Provisioned**: On-Demand mode scales automatically but costs more per GB than a correctly provisioned stream. It is the right default for new or unpredictable workloads, but for well-understood, stable throughput, Provisioned mode is cheaper.

---

## Summary

- Kinesis Data Streams provides a durable, ordered, replayable stream — unlike SQS, records are not deleted on consumption and multiple independent consumers can read the same data simultaneously.
- KDS throughput is shard-based: each shard provides 1 MB/s write and 2 MB/s shared read; scale by adding or removing shards, or use On-Demand mode for automatic scaling.
- Kinesis Data Firehose is a fully managed delivery service — it buffers, optionally transforms via Lambda, and delivers to S3, Redshift, or OpenSearch without a custom consumer application, with a minimum ~60-second latency.
- Amazon Managed Service for Apache Flink runs stateful stream processing (windowing, stream joins, running aggregations) on KDS or MSK data — for computations that exceed what per-record Lambda processing can express.
- Choose KDS over SQS when multiple independent consumers need the same data, replay is required, or strict per-shard ordering matters.
- `GetRecords.IteratorAgeMilliseconds` is the key CloudWatch metric for KDS — a rising iterator age means consumers are falling behind and additional capacity or consumers are needed.

---

## Examples

A mobile gaming company captures 50,000 player events per second — level completions, item purchases, match results. Three independent services consume these events: a real-time leaderboard (needs sub-second updates), a fraud detection engine (scans for account anomalies), and a data warehouse pipeline (loads into Redshift every hour). The team creates a KDS stream with 60 shards (50 MB/s write capacity with 20% headroom). Each of the three services registers as an Enhanced Fan-Out consumer, giving each its own dedicated 120 MB/s read throughput across the 60 shards. All three consume independently — the hourly Redshift pipeline does not affect the leaderboard's real-time reads.

A media company streams video playback telemetry to analyze viewer dropout rates. They need the data in S3 for Athena queries within 5 minutes, formatted as Parquet for cost-efficient querying. They use Kinesis Data Firehose with a 128 MB / 300-second buffer, a Lambda transform that converts JSON to Parquet, and Hive-partitioned S3 prefixes (`year=/month=/day=/hour=`). No consumer application to manage, no shards to provision — Firehose handles delivery automatically. The 5-minute latency requirement is comfortably met by the 300-second buffer interval.

A financial exchange needs to detect wash trading — a pattern where an account places a buy and a sell order for the same instrument within 30 seconds. No per-record Lambda function can detect this because the pattern spans multiple events over time. The team uses KDS as the event source and deploys a Flink application with a 30-second session window keyed on account ID and instrument. Flink maintains in-flight state per key, detects the buy-sell pair within the window, and emits an alert to an SNS topic. The same raw event stream also feeds a Firehose delivery to S3 for regulatory archiving — demonstrating multiple consumers of one KDS stream for different purposes.

---

## Think About It

1. You have a KDS stream with 10 shards receiving 8 MB/s of writes. You add a second consumer application. Shortly after, both consumers begin reporting read throttling. What is the cause, and what are two ways to resolve it?
2. Your team is deciding between SQS and Kinesis for an order processing pipeline. The requirements are: exactly-once processing, one consumer, no replay needed, variable throughput. Which would you choose and why — and which Kinesis mode (if you chose Kinesis) would be appropriate?
3. A Firehose delivery stream is configured with a 60-second buffer interval and a Lambda transform. Your Lambda transform function takes an average of 90 seconds to execute due to an external API call. What happens, and how would you fix the architecture?
4. You are designing a KDS stream partition key strategy for a stream that receives events from 500 IoT sensors. Each sensor sends 2 KB events at 100 events/second. How many shards do you need, and what would you use as the partition key?
5. A colleague proposes using Kinesis Data Firehose to replace an existing KDS + Lambda pipeline because Firehose is "simpler and serverless." Under what conditions would this be a valid migration, and when would it break the existing system's requirements?

---

## Quick Check

**Q1.** An application publishes 4,000 records per second to a Kinesis Data Stream, each record averaging 500 bytes. The stream has 3 shards. What will happen?

- A) The stream handles the load because 3 shards provide 3,000 records/second write capacity
- B) Writes are throttled — the `WriteProvisionedThroughputExceeded` metric spikes when shard write capacity is exceeded. Add shards or switch to On-Demand mode.