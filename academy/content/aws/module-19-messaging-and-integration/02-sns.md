---
title: "Amazon SNS: Simple Notification Service"
type: content
estimated_minutes: 12
cert_tags: ["CLF-C02", "SAA-C03", "SAP-C02"]
---

# Amazon SNS: Simple Notification Service

## Overview

Amazon SNS is a fully managed publish/subscribe (pub/sub) messaging service. A publisher sends one message to an SNS topic; SNS simultaneously delivers that message to every subscribed endpoint — an SQS queue, a Lambda function, an HTTPS webhook, an email address, or a mobile device. Unlike SQS (where consumers pull messages), SNS is push-based: subscribers receive messages the moment they are published, without polling.

The core problem SNS solves is notification fan-out. Without SNS, when a new order is placed and you need to notify the inventory service, the analytics service, and the fulfillment service simultaneously, the producer must make three separate API calls — knowing the address of each downstream system. When a fourth service is added, the producer code must change. With SNS, the producer publishes one message to one topic and knows nothing about who receives it. Subscribers join and leave independently, with zero changes to the publisher.

For the SAA exam, understand SNS topics, subscription protocols, the fan-out pattern (SNS → multiple SQS queues), and message filtering. SAP adds SNS FIFO for ordered fan-out, cross-account subscriptions, server-side encryption, and the architectural trade-off between a single topic with message filtering versus many specialized topics. After this lesson, you will be able to design reliable fan-out architectures and explain when SNS replaces direct service-to-service coupling.

---

## Core Concepts

### Topics and Subscription Protocols

An **SNS topic** is a named channel. Publishers call `Publish`; SNS delivers to all subscriptions in parallel within seconds. Each subscription specifies a **protocol** — the delivery mechanism to that subscriber:

- **SQS**: delivers the message to an SQS queue; the queue buffers it for asynchronous consumer processing
- **Lambda**: directly invokes a Lambda function synchronously; on failure SNS retries up to 2 additional times (3 total attempts) with delays between retries — after exhaustion the message is dropped unless a subscription-level DLQ is configured
- **HTTPS**: HTTP POST to a webhook endpoint; SNS retries per the configured retry policy on non-2xx responses
- **Email / Email-JSON**: delivers to an email address (for human notification; not suitable for programmatic processing at volume)
- **SMS**: sends a text message (subject to phone number verification and regional availability)
- **Mobile push**: delivers to Apple APNs, Google FCM, Amazon ADM, and other mobile push platforms via platform application endpoints

A single SNS topic can have thousands of subscriptions across multiple protocols simultaneously. One `Publish` call → all subscribers notified in parallel.

**Delivery retries**: retry behavior differs by protocol. For **HTTP/S endpoints** that return non-2xx, SNS retries with exponential backoff for up to 23 days (configurable). For **Lambda** subscriptions that throw an error, SNS retries up to 2 additional times (3 total attempts) before giving up — not 23 days. After exhausting retries for either protocol, messages are dropped unless a **subscription-level DLQ** (an SQS queue) is configured on that subscription.

---

### The Fan-Out Pattern

The **SNS fan-out pattern** is the standard design for triggering multiple independent downstream services from a single event. Instead of the producer calling each service directly, it publishes to an SNS topic; each service subscribes via its own dedicated SQS queue.

**Why use SQS queues as intermediaries rather than subscribing Lambda directly to SNS?**

- **Durability**: if a Lambda subscriber is throttled or temporarily broken, SNS drops the message after retries. An SQS queue buffers it indefinitely (up to 14 days), ensuring the service processes it when available.
- **Decoupled scaling**: each SQS queue absorbs its own service's traffic independently. A 10-minute backlog in one service has zero impact on others.
- **Independent retry and error handling**: each SQS queue has its own DLQ, `maxReceiveCount`, and visibility timeout configured per that service's requirements.

The canonical fan-out architecture: `OrderPlaced` → SNS topic → [inventory SQS queue → Lambda, fulfillment SQS queue → Lambda, analytics Firehose, fraud-scoring SQS queue → Lambda]. This is the most important messaging pattern in AWS architecture.

---

### Message Filtering

SNS **message filtering** allows each subscription to declare a JSON filter policy. SNS evaluates incoming message attributes against every subscription's policy and delivers the message only to subscriptions that match.

**Without filtering**: every subscriber receives every message and must internally check relevance — wasting processing capacity and adding logic to consumers.

**With filtering**: a publisher sends all order events to one topic with an `order_region` attribute. The EU fulfillment queue subscribes with `{"order_region": ["EU"]}`, the US queue with `{"order_region": ["US"]}`, and a fraud Lambda subscribes with no filter and receives everything. Adding a new region requires only a new subscription with the appropriate filter — the publisher and all existing subscribers are unchanged.

Filter policies support: exact string match, string prefix match, string exclusion, numeric ranges (greater than, less than, between), and array membership. Multiple attribute conditions in the same filter are AND-ed together.

---

### SNS FIFO Topics

**SNS FIFO topics** deliver messages in strict order within a message group and deduplicate messages by `MessageDeduplicationId` or content hash. Critically, **only SQS FIFO queues** can subscribe to SNS FIFO topics — no Lambda, email, or HTTP endpoints.

Use SNS FIFO when you need ordered, deduplicated fan-out to multiple downstream queues. For example: distributing financial transaction events to both an audit queue and an accounting queue, where both must process the same events in the same order to maintain consistent state across both systems.

SNS FIFO + SQS FIFO has lower throughput (3,000 msg/s with batching) and higher complexity than standard SNS + SQS. Use it only when ordering and deduplication are genuine cross-subscriber requirements.

---

## Configuration Reference

### Example: SNS Fan-Out to Two SQS Queues (AWS CLI)

```bash
# Step 1: Create the SNS topic
TOPIC_ARN=$(aws sns creat