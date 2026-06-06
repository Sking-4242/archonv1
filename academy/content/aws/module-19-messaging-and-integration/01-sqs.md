---
title: "Amazon SQS: Simple Queue Service"
type: content
estimated_minutes: 13
cert_tags: ["CLF-C02", "SAA-C03", "SAP-C02"]
---

# Amazon SQS: Simple Queue Service

## Overview

Amazon SQS is a fully managed message queue service that decouples the components of a distributed application. A producer sends a message to the queue and moves on — it does not wait for the consumer to process it, does not need to know the consumer's address, and does not need the consumer to be running. The consumer polls the queue at its own pace, processes messages, and deletes them when done. This asynchronous handoff is the foundational pattern behind resilient, scalable AWS architectures.

The problem SQS solves is the synchronous dependency. When Service A directly calls Service B and Service B is slow or unavailable, Service A either fails or blocks. At scale, one slow downstream service cascades into a system-wide outage. With SQS between them, Service A writes to the queue and returns immediately. Service B processes from the queue when it can. The queue absorbs traffic spikes — 10,000 orders per minute during a flash sale — and lets a steady-state processing fleet work through the backlog at a sustainable rate.

For the SAA exam, understand Standard vs. FIFO queues, visibility timeout, Dead Letter Queues, and Lambda SQS integration. SAP adds FIFO message group scaling, partial batch failure reporting, SQS Extended Client for large messages, and load-leveling patterns. After this lesson, you will be able to design an SQS-backed async processing architecture with appropriate error handling and understand every knob that controls message delivery behavior.

---

## Core Concepts

### Message Lifecycle

A message's journey through SQS has four stages:

**Send**: the producer calls `SendMessage` with a payload up to 256 KB. For larger payloads, use the **SQS Extended Client Library** — it stores the body in S3 and puts a pointer reference in the SQS message, keeping the message itself small.

**Receive**: the consumer calls `ReceiveMessage` (up to 10 messages per call). The message becomes **invisible** to all other consumers for the duration of the **visibility timeout** — this prevents two consumers from processing the same message simultaneously.

**Delete**: after successful processing, the consumer calls `DeleteMessage` using the receipt handle. This permanently removes the message from the queue.

**Visibility timeout expiry**: if the consumer does not delete the message before the timeout expires, the message reappears in the queue for another consumer. This is how SQS provides **at-least-once delivery** — a crashed or slow consumer causes the message to be re-delivered automatically.

Set the visibility timeout **longer than your maximum expected processing time**, not your average. If processing takes up to 30 seconds, set the timeout to at least 60 seconds. A consumer that finishes early can call `ChangeMessageVisibility` to release the lock sooner.

---

### Standard vs. FIFO Queues

**Standard queues** provide nearly unlimited throughput, at-least-once delivery, and best-effort ordering. Messages may arrive out of order and rare duplicates are possible. Standard is the right choice for the vast majority of workloads — wherever high throughput matters more than strict ordering, and wherever consumers are designed to be idempotent.

**FIFO queues** provide exactly-once processing and strict ordering within a **message group** (identified by `MessageGroupId`). Deduplication is controlled by `MessageDeduplicationId` or content hash. Messages with the same group ID are processed in strict FIFO order; messages across different groups are processed concurrently. Throughput: up to 3,000 messages/second with batching, 300 without.

Use FIFO when:
- Order matters within a group (a patient's claim amendment must follow the original claim submission)
- Exactly-once processing is required (financial transactions that must never be double-applied)
- The consumer cannot tolerate duplicates even with idempotency controls

Do not use FIFO for high-throughput workloads where ordering is not required — the throughput ceiling is a genuine constraint.

---

### Dead Letter Queues

A **Dead Letter Queue (DLQ)** is an ordinary SQS queue that receives messages that consistently fail processing. You configure a **redrive policy** on the source queue with:

- **`maxReceiveCount`**: how many times a message can be received and returned to the queue (via visibility timeout expiry) before SQS moves it to the DLQ. Typical value: 3–5.

Without a DLQ, poison-pill messages — malformed payloads, data that triggers a bug in the consumer — cycle indefinitely. They consume processing capacity, fill logs, and mask the underlying problem. With a DLQ, failed messages are captured, consumer capacity is freed, and the operations team can inspect, fix the root cause, and **redrive** (replay) the messages back to the source queue.

**Best practice**: always configure a DLQ on production queues. Set a CloudWatch alarm on `ApproximateNumberOfMessagesVisible` for the DLQ — any non-zero count signals something is consistently failing and needs attention.

---

### SQS and Lambda Integration

Lambda polls SQS via an **event source mapping**. Lambda scales automatically to drain the queue:

- **Standard queues**: Lambda scales up to 1,000 concurrent executions, adding up to 60 new instances per minute
- **FIFO queues**: Lambda scales up to one concurrent execution per active message group (preserving ordering)

Lambda receives up to the configured **batch size** (1–10,000 messages per invocation). Larger batches improve efficiency but mean a single function failure affects more messages.

**Partial batch failure**: by default, if a Lambda throws on any message in a batch, SQS returns *all* messages in the batch to the queue — including ones that were already processed successfully, causing duplicate work. Fix this by enabling `ReportBatchItemFailures` in the event source mapping and returning only the failed message IDs in `batchItemFailures` from your handler. Only those messages return to the queue.

---

### Long Polling

By default, `ReceiveMessage` returns immediately even if the queue is empty — this is **short polling**. It wastes API calls and cost when traffic is intermittent.

**Long polling** (`WaitTimeSeconds` = 1–20) holds the request open until a message arrives or the wait time expires. For most production queues with non-constant traffic, always set `WaitTimeSeconds = 20`. This reduces empty receives by up to 95%, cutting SQS API costs and eliminating the tight polling loop that wastes consumer CPU.

---

## Configuration Reference

### Example: Create a Queue with DLQ (AWS CLI)

```bash
# Step 1: Create the Dead Letter Queue first
DLQ_URL=$(aws sqs create-queue \
  --queue-name prod-orders-dlq \
  --attributes MessageRetentionPeriod=1209600 \
  --query QueueUrl --output text \
  --region us-east-1)
# MessageReten