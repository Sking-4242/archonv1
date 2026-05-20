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

## What's Next

Next up: Amazon Kinesis — real-time data streaming and analytics.