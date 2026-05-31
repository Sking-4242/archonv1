---
title: "Amazon SNS: Simple Notification Service"
type: content
estimated_minutes: 8
cert_tags: ["SAA-C03", "DVA-C02", "CLF-C02"]
---

# Amazon SNS: Simple Notification Service

## Overview

Amazon SNS is a fully managed pub/sub messaging service. Publishers send a message to a topic; SNS delivers it to all subscribed endpoints simultaneously. Unlike SQS (pull-based), SNS is push-based — subscribers receive messages immediately without polling.

## SNS Topics and Subscriptions

A topic is a named channel for messages. Publishers send to the topic; subscribers receive from it. Subscription protocols: SQS (fan-out to queues), Lambda (direct invocation), HTTP/HTTPS (webhooks), email, SMS, and mobile push (APNs, FCM). Multiple protocols can be subscribed to the same topic simultaneously. A common pattern: SNS topic → multiple SQS queues, each consumed by a different service — the 'fan-out' pattern for reliable parallel processing.

## SNS Fan-out Pattern

The fan-out pattern solves the 'notify multiple services on an event' problem. An S3 event (or application event) publishes to an SNS topic. Three SQS queues are subscribed: one for inventory update service, one for analytics, one for fulfillment. Each service independently polls its queue at its own pace. Even if one service is down, its messages queue in SQS; when the service recovers, it processes the backlog. This is more resilient than direct Lambda-to-Lambda calls.

## Message Filtering

SNS message filtering lets each subscription specify a JSON filter policy. Only messages with attributes matching the policy are delivered to that subscription. Example: an 'orders' topic has three subscribed SQS queues — one subscribed with filter `{"order_type": "international"}`, one with `{"order_type": "domestic"}`, one with no filter (receives all). This reduces the number of topics needed and lets publishers send all events to one topic while consumers receive only relevant events.

## SNS FIFO

SNS FIFO topics deliver messages in strict order within a message group (same as SQS FIFO). Only SQS FIFO queues can subscribe to SNS FIFO topics. Use SNS FIFO when you need ordered, deduplicated fan-out to multiple SQS queues — for example, fan-out financial transaction events to audit and accounting queues in order.

## Summary

SNS is push-based pub/sub — publishers send once, all subscribers receive immediately. Fan-out (SNS → multiple SQS queues) is the standard pattern for decoupled parallel processing. Message filtering reduces topic proliferation. FIFO topics for ordered fan-out. Use SNS + SQS fan-out instead of direct service calls for resilient, decoupled architectures.

## Examples

A food-delivery platform publishes every completed order to a single SNS topic. Three SQS queues are subscribed: one for the loyalty-points service, one for the restaurant analytics pipeline, and one for the customer receipt emailer. When the receipt service goes down for a deployment, no events are lost — they queue in SQS and are processed once the service recovers. This fan-out pattern lets each team own their queue and scale independently without any of them knowing about each other.

A global retail company sells products across multiple regions and order types. Rather than maintaining separate SNS topics per region, they publish all orders to one topic and use SNS message filtering. The EU fulfillment queue subscribes with `{"region": "EU"}`, the US queue with `{"region": "US"}`, and the fraud-detection service subscribes with no filter so it sees everything. Adding a new regional queue requires zero changes to the publisher — just a new subscription with the right filter policy.

A fintech company processes ACH bank transfers that legally must be applied in the exact sequence they were authorized. They use an SNS FIFO topic fanning out to both an audit-log SQS FIFO queue and an accounting SQS FIFO queue. Both queues receive every transfer event in the same strict order. This is the scenario where SNS FIFO earns its complexity overhead: unordered delivery would corrupt the running balance in the accounting service.

## Think About It

1. Why is the SNS + SQS fan-out pattern more resilient than having a producer call multiple Lambda functions directly?
2. What would happen if a subscriber's HTTP/HTTPS endpoint is unreachable when SNS attempts delivery? How does this differ from an SQS subscription in the same scenario?
3. How would you decide how many SNS topics to create for a large e-commerce platform versus using message filtering on fewer topics? What trade-offs drive that decision?
4. SNS is push-based while SQS is pull-based. In what situations does push-based delivery create problems, and how does the fan-out pattern address them?
5. If you need ordered, deduplicated fan-out to multiple queues, you must use SNS FIFO + SQS FIFO. What additional operational complexity does this introduce compared to a standard topic and standard queues?

## Quick Check

**Q1.** Which of the following is NOT a valid SNS subscription protocol?

- A) SQS
- B) Lambda
- C) Kinesis Data Streams
- D) SMS

**Answer: C** — SNS cannot push directly to a Kinesis Data Stream; valid protocols include SQS, Lambda, HTTP/HTTPS, email, SMS, and mobile push. Data can reach Kinesis through a Lambda subscriber.

**Q2.** An 'orders' SNS topic has three SQS queue subscriptions. One queue has the filter `{"order_type": "international"}`. What messages does that queue receive?

- A) All messages published to the topic
- B) Only messages that include the attribute `order_type` set to `international`
- C) All messages except those with `order_type` set to `international`
- D) Messages in the order they were published, filtered by timestamp

**Answer: B** — SNS message filtering delivers a message to a subscription only when the message attributes match the subscription's JSON filter policy.

**Q3.** What is the primary advantage of the SNS fan-out pattern over a producer directly invoking multiple downstream services?

- A) It reduces message size limits
- B) It allows the producer to remain unaware of consumers and protects against consumer downtime
- C) It guarantees FIFO ordering across all consumers
- D) It eliminates the need for IAM permissions

**Answer: B** — Fan-out decouples the publisher from its consumers; adding or removing consumers requires no change to the publisher, and SQS queues absorb messages even when consumers are temporarily unavailable.

## What's Next

Next up: Amazon Kinesis — real-time data streaming and analytics.