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

## What's Next

Next up: S3 Access Points — simplifying access management for shared datasets.