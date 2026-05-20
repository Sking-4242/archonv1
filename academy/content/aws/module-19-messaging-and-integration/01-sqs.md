---
title: "Amazon SQS: Simple Queue Service"
type: content
estimated_minutes: 10
cert_tags: ["SAA-C03", "DVA-C02", "CLF-C02"]
---

# Amazon SQS: Simple Queue Service

## Overview

Amazon SQS is a fully managed message queue service that decouples producers from consumers. Producers send messages to the queue; consumers poll for and process messages at their own pace. SQS absorbs traffic spikes, smooths processing load, and provides resilience when consumers are temporarily unavailable.

## SQS Basics

Messages are up to 256 KB (larger messages use S3 via the extended client library). Producers call SendMessage; consumers call ReceiveMessage (receives up to 10 messages at once), process them, then call DeleteMessage. While a message is being processed, it's hidden from other consumers (visibility timeout — default 30 seconds). If not deleted within the visibility timeout, it becomes visible again for re-processing. This at-least-once delivery guarantee means your consumer must be idempotent.

## Standard vs. FIFO Queues

Standard: unlimited throughput, at-least-once delivery, best-effort ordering. Messages may arrive out of order and duplicate messages are possible. FIFO: exactly-once processing (deduplication by message ID or content), strict order within a message group, 3,000 messages/second per queue (with batching). Use FIFO for: financial transactions, order processing, anything where order and exactly-once semantics matter. Use Standard for: high-throughput workloads where order and duplicates are acceptable or handled by the application.

## Visibility Timeout and Dead Letter Queues

Set visibility timeout to be longer than your maximum processing time (with margin). If processing fails and the message becomes visible, it's retried. A maxReceiveCount threshold on the queue triggers transfer to a Dead Letter Queue (DLQ) after N failed attempts. The DLQ captures poison pills — messages that consistently fail processing — for analysis and redriving. Always configure a DLQ on production queues; without it, failed messages cycle indefinitely.

## SQS and Lambda Scaling

Lambda can poll SQS as an event source. Lambda automatically scales the number of concurrent instances processing the queue — up to 1,000 concurrent Lambda functions per queue (60 new instances per minute). Lambda processes up to 10 messages per batch per invocation; increase batch size for efficiency. Lambda reports partial batch failures using `batchItemFailures` — only failed messages return to the queue, not the entire batch. This is the standard high-throughput async processing pattern on AWS.

## Long Polling

SQS ReceiveMessage waits up to 20 seconds for messages before returning an empty response (long polling). Short polling (default) returns immediately even if the queue is empty, wasting API calls and cost. Always enable long polling (WaitTimeSeconds=20) for production consumers. This reduces empty receive responses by up to 95% on queues with intermittent messages.

## Summary

SQS decouples producers and consumers, absorbing traffic spikes and providing resilience. Standard for high-throughput best-effort; FIFO for ordered exactly-once. Set visibility timeout longer than processing time. Configure DLQs for failed message capture. Lambda polls SQS with automatic scaling. Always use long polling. SQS is the backbone of async processing on AWS.

## What's Next

Next up: Amazon SNS — pub/sub notification for fan-out messaging.