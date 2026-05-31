---
title: "S3 Event Notifications and S3 Select"
type: content
estimated_minutes: 8
cert_tags: ["SAA-C03", "DVA-C02"]
---

# S3 Event Notifications and S3 Select

## Overview

S3 can trigger downstream processing automatically when objects are created, deleted, or restored. Event notifications integrate S3 with Lambda, SQS, SNS, and EventBridge. S3 Select and Glacier Select let you filter object content server-side, reducing data transfer and cost for large-scale data processing.

## Event Notification Types

S3 supports three notification destinations: Lambda functions (invoke directly on events), SQS queues (buffer events for downstream consumers), and SNS topics (fan out to multiple subscribers). You configure notifications per bucket with filters on event type (s3:ObjectCreated:*, s3:ObjectRemoved:*) and optional key prefix/suffix filters.

## Amazon EventBridge Integration

EventBridge is the recommended approach for flexible routing. Enable EventBridge on the bucket and all S3 events flow to your event bus — then you can route them to any EventBridge target (Step Functions, more Lambda functions, API Gateway, etc.) with content-based filtering and archiving. EventBridge also provides event schema discovery and replay.

## S3 Select

S3 Select lets you query the contents of a single S3 object using SQL expressions, returning only the matching subset of data. Instead of downloading a 10 GB CSV to find 10 rows, S3 Select streams just those rows. Supports CSV, JSON, and Parquet (with GZIP or BZIP2 compression). This reduces data transfer and speeds up analytics pipelines that process large individual files.

## Common Event-Driven Patterns

Thumbnail generation: S3 event → Lambda → process image → put thumbnail to destination bucket. ETL triggering: CSV lands in S3 → SQS → worker fleet processes files. Malware scanning: object created → Lambda → call AV API → tag object clean or quarantined. These patterns are staples of serverless architecture on AWS.

## Summary

S3 event notifications turn your bucket into an event source — Lambda for immediate processing, SQS for buffered queue-based workflows, SNS for fan-out. Use EventBridge for complex routing. S3 Select reduces data transfer costs by filtering object content server-side. These are core serverless integration patterns.

## Examples

A photo-sharing startup needs to generate thumbnail images whenever a user uploads a new photo. They configure an S3 event notification so that every `s3:ObjectCreated:*` event on the `uploads/` prefix triggers a Lambda function. The Lambda reads the original image, resizes it to three dimensions, and writes the thumbnails to a separate `thumbnails/` bucket. No polling loop, no scheduler, no idle compute — the entire pipeline is event-driven. The startup pays only for the Lambda invocations that actually run, which is zero during off-hours when no uploads happen.

A large e-commerce company ingests order CSV files from hundreds of regional warehouses into a shared S3 bucket throughout the day. Processing order is important — files must flow into an ETL queue and be worked sequentially per warehouse. They route S3 events to an SQS queue instead of Lambda directly. The queue buffers bursts when many warehouses upload simultaneously, and a fleet of EC2 workers drains the queue at a controlled rate. Using SQS as the intermediary decouples the arrival rate from the processing rate, preventing the ETL workers from being overwhelmed during morning upload peaks.

A security team at a fintech company needs to scan every object uploaded to their data lake for sensitive data patterns (PII, credit card numbers) before allowing downstream consumers to access it. They enable Amazon EventBridge on the bucket so all S3 events flow to their central event bus. An EventBridge rule routes `ObjectCreated` events to a Step Functions state machine that invokes a Macie scan, waits for results, then either tags the object as `pii:clean` or moves it to a quarantine prefix. The EventBridge approach is more powerful than direct Lambda notification because the state machine can handle retries, branching, and multi-step workflows that a single Lambda function would struggle to manage cleanly.

## Think About It

1. S3 event notifications to Lambda invoke the function directly without a queue. What happens if a large burst of objects is uploaded simultaneously — say 10,000 files in 30 seconds — and each triggers a Lambda? What concurrency limits might you hit, and when would you choose SQS as an intermediary instead of direct Lambda invocation?
2. EventBridge is described as the "recommended approach" for flexible routing, but it adds latency compared to direct S3-to-Lambda notifications. In what scenarios does that additional routing hop matter, and when is the flexibility worth the trade-off?
3. S3 Select filters data server-side before returning it to your application. What are the limitations of S3 Select compared to a proper query engine like Athena, and when would you choose each?
4. If you configure both an S3 event notification and an EventBridge rule on the same bucket for the same event type, will the event be delivered twice? How would you verify this, and what might go wrong if downstream consumers aren't idempotent?
5. An event-driven pipeline triggers a Lambda every time a file lands in S3. Over time the Lambda function's code changes — it now processes files differently than before. What happens to files that landed in S3 before the code change but triggered retries after it? How do you design event-driven pipelines for safe code changes?

## Quick Check

**Q1.** Which S3 event notification destination is best suited for buffering a high-volume burst of object creation events and processing them at a controlled rate?
- A) Lambda
- B) SNS
- C) SQS
- D) EventBridge

**Answer: C** — SQS decouples the event production rate from the processing rate; a queue absorbs upload bursts and lets consumers drain it at whatever pace the downstream system can handle, unlike Lambda which is invoked immediately and may hit concurrency limits.

**Q2.** What does S3 Select allow you to do that a standard S3 GetObject does not?
- A) Download objects faster using Transfer Acceleration
- B) Filter and return only the matching subset of an object's content using SQL, reducing data transfer
- C) Read objects from multiple buckets in a single API call
- D) Decompress objects automatically before returning them

**Answer: B** — S3 Select executes a SQL expression against a single object server-side (CSV, JSON, or Parquet) and returns only matching rows, avoiding the need to download the entire object to filter it client-side.

**Q3.** What is the recommended way to route S3 events to multiple different AWS services with content-based filtering and replay capability?
- A) Configure multiple S3 event notifications, one per destination service
- B) Use SNS fan-out from a single S3 notification
- C) Enable Amazon EventBridge integration on the S3 bucket and use EventBridge rules
- D) Write a Lambda function that manually fans out events to other services

**Answer: C** — Amazon EventBridge integration on S3 sends all events to an event bus where you can apply content-based filtering rules, route to any supported target, archive events, and replay them — capabilities that direct S3 notifications do not provide.

## What's Next

Next up: S3 Access Points — simplifying access management for shared datasets.