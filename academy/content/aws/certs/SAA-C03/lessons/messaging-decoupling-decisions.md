---
title: "Choosing Decoupling Services: SQS, SNS, Kinesis, and EventBridge"
type: content
estimated_minutes: 15
cert_tags: ["SAA-C03"]
---

# Choosing Decoupling Services: SQS, SNS, Kinesis, and EventBridge

## Overview

The shared lessons in this domain teach each messaging service on its own — SQS, SNS, Kinesis, and EventBridge each get their own treatment. But the SAA exam almost never asks "what is SQS?" Instead it hands you a scenario — an order-processing backend that occasionally spikes, a fan-out notification system, a clickstream that must be replayed, an event router between SaaS apps — and asks which service is the *right* choice. The skill the exam tests is selection under constraints, and that skill only forms once you can see all four services side by side.

This lesson exists to build that comparative judgment. Decoupling is the heart of resilient architecture: when components communicate through a buffer or broker instead of calling each other directly, a failure or slowdown in one component no longer cascades to the others. A queue absorbs a traffic spike; a topic lets you add subscribers without touching the publisher; a stream lets multiple consumers read the same data at their own pace. Choosing the wrong primitive produces designs that are subtly fragile or needlessly complex — and on the exam, produces wrong answers.

Domain 2, Task 2.1 ("Design scalable and loosely coupled architectures") is where this lives, and the decision recurs throughout the exam. After this lesson you will be able to map any messaging scenario to the correct service by reasoning about delivery model, ordering, retention, consumer count, and replay.

---

## Core Concepts

### The Four Primitives at a Glance

Each service embodies a different communication pattern. **SQS** is a queue: one message is processed by one consumer, then deleted. **SNS** is pub/sub: one message is pushed to many subscribers at once (fan-out), with no storage after delivery. **Kinesis Data Streams** is a durable, replayable log: many consumers can independently read the same ordered records, and records persist for a retention window (default 24 hours, up to 365 days). **EventBridge** is a serverless event *router*: it matches events against rules and delivers them to targets, with deep integration to AWS services and third-party SaaS sources.

The single biggest distinction is **push vs. pull and one vs. many**. SQS consumers *pull* and each message goes to *one* of them. SNS and EventBridge *push* to *many* targets. Kinesis lets *many* consumers pull the *same* records independently.

### SQS — Buffering and Load Leveling

Reach for SQS when you need to decouple a producer from a consumer so the consumer can process work at its own rate. The queue absorbs spikes: if 10,000 orders arrive in a minute but workers handle 100/second, the queue simply holds the backlog and drains it. **Standard queues** offer near-unlimited throughput with at-least-once delivery and best-effort ordering. **FIFO queues** guarantee exactly-once processing and strict ordering, at a throughput ceiling (high, but bounded). A dead-letter queue (DLQ) captures messages that repeatedly fail so they don't block the queue or get lost. SQS is the default answer for "smooth out a spiky workload" and "process tasks asynchronously."

### SNS — Fan-Out to Many Subscribers

SNS pushes each published message to every subscriber of a topic: Lambda functions, SQS queues, HTTP endpoints, email, or SMS. Use it when one event must trigger several independent reactions. The canonical resilient pattern is **SNS + SQS fan-out**: a topic publishes to multiple queues, each owned by a different downstream service, so each service gets its own durable buffer and can fail or scale independently. SNS itself does not store messages — if a subscriber is unavailable and has no queue, the message can be lost (mitigated by delivery retries and DLQs). SNS also offers FIFO topics for ordered fan-out.

### Kinesis Data Streams — Replayable, Multi-Consumer Streaming

Choose Kinesis when you need to ingest a high-volume, continuous stream of records *and* let multiple consumers process it independently, possibly replaying history. Because records persist for the retention period, a new consumer can start from the beginning, and a failed consumer can re-read from where it left off. This is the model for clickstreams, IoT telemetry, log aggregation, and real-time analytics. Ordering is preserved *per shard*, and throughput scales by adding shards. The tell-tale exam keywords are "real-time," "streaming," "multiple consumers," "replay," and "ordered by key."

### EventBridge — Event Routing and SaaS Integration

EventBridge is the right tool when you need content-based *routing* of events between decoupled services — especially when AWS service events or third-party SaaS events are involved. Rules match on event content and dispatch to up to many targets, with optional transformation. It shines for event-driven architectures built from AWS services (e.g., react to an EC2 state change, an S3 upload, or a custom application event) and for schema-discoverable integrations. Compared to SNS, EventBridge trades raw throughput and ultra-low latency for far richer filtering, a schema registry, and a large catalog of built-in event sources.

---

## Configuration Reference

The decision in one table:

```text
Need                                          → Service
--------------------------------------------- → -----------------------------
Buffer work; one consumer per message         → SQS (Standard)
Strict order + exactly-once, one consumer      → SQS FIFO
One event → many independent reactions         → SNS (often SNS→SQS fan-out)
High-volume stream, many consumers, replay     → Kinesis Data Streams
Route AWS/SaaS events by content to targets    → EventBridge
```

A resilient order pipeline combining several (a very common SAA reference design):

```text
API Gateway → SNS "OrderPlaced" topic
                 ├── SQS  → Fulfillment workers (durable buffer, DLQ)
                 ├── SQS  → Billing workers      (independent scaling)
                 └── Lambda → Analytics/EventBridge

• SNS fans the event out so each consumer is decoupled.
• Each SQS queue absorbs spikes and isolates failures (a billing outage
  does not stall fulfillment).
• DLQs capture poison messages for later inspection.
```

Decision signals to memorize:

```text
"smooth out spikes" / "process later"          → SQS
"exactly once" / "in order"                     → SQS FIFO
"notify several systems" / "fan-out"            → SNS
"real-time" / "replay" / "multiple readers"     → Kinesis
"react to AWS service events" / "SaaS events"    → EventBridge
```

---

## How to Decide

Walk the questions in order:

- **Is one event consumed once, or by many systems?** Once → SQS. Many → SNS/EventBridge/Kinesis.
- **Do consumers need to replay or re-read the same data?** Yes → Kinesis (SQS deletes after consumption; SNS doesn't store).
- **Is strict ordering or exactly-once required?** → SQS FIFO (or Kinesis per-shard order).
- **Are you routing AWS-service or third-party SaaS events by content?** → EventBridge.
- **Do you need a durable buffer behind a fan-out?** → SNS → SQS.

---

## How This Connects

This lesson sits on top of the shared SQS, SNS, Kinesis, and EventBridge lessons and the integration-patterns lesson — read those first for mechanics. It directly supports **Auto Scaling** (queue depth is a superb scaling metric for SQS consumers) and **Lambda** (the common serverless consumer for all four). It reappears in Domain 3 (Kinesis under data-ingestion, Task 3.5) and underpins the resilient, loosely coupled designs the exam rewards. The cross-domain **Scenario Decision Drills** lesson drills these choices under exam-style pressure.

---

## Exam Traps

- **SQS for fan-out.** A single SQS queue delivers each message to one consumer. If many systems must react, that's SNS (or SNS→SQS), not one queue.
- **Kinesis where SQS suffices.** If you just need to buffer tasks for one worker pool with no replay, SQS is simpler and cheaper. Kinesis is for streaming/replay/multi-consumer.
- **SNS for durable delivery.** SNS doesn't retain messages; pair it with SQS when consumers may be offline.
- **EventBridge vs. SNS confusion.** High-throughput, low-latency fan-out → SNS. Content-based routing with rich filtering and AWS/SaaS sources → EventBridge.
- **Forgetting the DLQ.** Resilient designs isolate poison messages; the absence of a DLQ is often the flaw in a "what's wrong with this architecture" question.

---

## Summary

Decoupling is the core of resilient architecture, and the SAA exam tests your ability to choose the right primitive. SQS buffers work for a single consumer (FIFO when order/exactly-once matters). SNS fans one event out to many subscribers, ideally backed by SQS queues for durability. Kinesis Data Streams ingests high-volume, ordered records that multiple consumers can read and replay. EventBridge routes events by content with deep AWS and SaaS integration. Decide by asking whether an event is consumed once or by many, whether replay is needed, whether ordering is strict, and whether you're routing service/SaaS events.

---

## Examples

**Example 1 — Spiky order backend.** Orders arrive in bursts; one worker pool fulfills them. SQS Standard buffers the bursts; workers scale on queue depth; a DLQ catches failures.

**Example 2 — One event, many reactions.** A new user signup must send a welcome email, provision resources, and update analytics. SNS fans out to three SQS queues, each owned by an independent service.

**Example 3 — Clickstream analytics.** A website streams millions of click events that several teams analyze differently and occasionally reprocess. Kinesis Data Streams retains records so each consumer reads independently and can replay.

**Example 4 — Cross-service automation.** When an S3 object is uploaded, route to different processors based on file type. EventBridge rules match the event and dispatch to the right target.

---

## Think About It

An architecture publishes order events to a single SQS queue, and three teams complain they each need to process every order but only one team's workers ever see a given message. What's the architectural mistake, and which two-service pattern fixes it while keeping each team's processing durable and independently scalable?

---

## Quick Check

1. Which service delivers each message to exactly one consumer and then deletes it?
2. Which service should front multiple SQS queues to fan an event out durably?
3. Which service lets multiple consumers independently read and replay the same ordered records?
4. Which service is best for content-based routing of AWS and SaaS events?

*Answers: (1) SQS; (2) SNS (SNS→SQS fan-out); (3) Kinesis Data Streams; (4) EventBridge.*

---

## What's Next

Next module: **Domain 3 — Design High-Performing Architectures**, beginning with the cross-service **Caching Strategies on AWS** lesson, which determines how you accelerate reads across the edge, the database, and in-memory layers.
