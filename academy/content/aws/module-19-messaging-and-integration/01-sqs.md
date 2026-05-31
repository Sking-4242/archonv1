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

## Examples

A regional e-commerce retailer runs daily flash sales that spike order volume 50x for 15 minutes. Instead of over-provisioning their fulfillment service, they push every order confirmation into a Standard SQS queue. The fulfillment workers pull at their own pace and process orders long after the spike subsides — a textbook use of SQS as a traffic buffer. No orders are lost, and the fulfillment fleet stays at steady-state size.

A healthcare startup processes insurance claim submissions that must be handled in strict sequence per patient: each claim adjustment must follow the previous one or the ledger corrupts. They use a FIFO queue keyed by patient ID as the message group, guaranteeing that all messages for patient 12345 are processed in order and exactly once — even when multiple Lambda workers are running concurrently across different patient groups.

A payment platform sees occasional failures in their third-party fraud-scoring API. When the fraud scorer is down, messages hit the visibility timeout and re-enqueue. After five failed attempts (`maxReceiveCount=5`) those messages land in a DLQ. The on-call engineer inspects the DLQ, sees a batch of transactions stuck on a specific card BIN range, and triggers a redrive once the upstream vendor fixes their issue — demonstrating how DLQs transform silent data loss into a recoverable operational event.

## Think About It

1. Why must a consumer that reads from a Standard SQS queue be idempotent, and what could go wrong in a payment system if it isn't?
2. What would happen if you set the visibility timeout shorter than your average Lambda processing time? Walk through the sequence of events.
3. How would you decide between a Standard queue and a FIFO queue for an application that processes user-generated social media posts? What trade-offs would guide your choice?
4. If a Lambda function processes a batch of 10 SQS messages and 3 fail, what happens to the 7 that succeeded if you do NOT use `batchItemFailures`? Why does this matter at scale?
5. Long polling reduces empty receives by up to 95% on intermittent queues. Why might you still choose short polling in any real scenario?

## Quick Check

**Q1.** A message has been received by a consumer but not yet deleted. Another consumer calls ReceiveMessage. What happens?

- A) The second consumer also receives the message immediately
- B) The message is invisible to the second consumer until the visibility timeout expires
- C) SQS deletes the message automatically after the first receive
- D) The second consumer receives a duplicate and both process it simultaneously

**Answer: B** — During the visibility timeout window the message is hidden from all other consumers, preventing double-processing while the first consumer works on it.

**Q2.** Which SQS queue type guarantees exactly-once processing and strict ordering within a message group?

- A) Standard queue with deduplication enabled
- B) Standard queue with long polling
- C) FIFO queue
- D) Dead Letter Queue

**Answer: C** — FIFO queues provide deduplication by message ID or content hash and preserve strict order within each message group, at up to 3,000 messages/second with batching.

**Q3.** What is the maximum amount of time SQS long polling will wait for a message before returning an empty response?

- A) 5 seconds
- B) 10 seconds
- C) 20 seconds
- D) 60 seconds

**Answer: C** — The maximum WaitTimeSeconds value for long polling is 20 seconds, which dramatically reduces wasted API calls on queues with intermittent traffic.

## What's Next

Next up: Amazon SNS — pub/sub notification for fan-out messaging.