---
title: "Amazon SNS"
type: content
estimated_minutes: 16
cert_tags: ["CLF-C02", "SAA-C03", "SOA-C03", "SCS-C03"]
---

# Amazon SNS

## Overview

Amazon Simple Notification Service (SNS) is a fully managed **publish/subscribe (pub/sub) messaging** service. Publishers send messages to a **topic**, and SNS pushes (fans out) each message to all of the topic's subscribers — Lambda functions, SQS queues, HTTP/S endpoints, email, SMS, or mobile push. This *service reference* lesson covers the pub/sub model, fan-out, filtering, ordering, durability, security, and what each certification expects.

SNS matters because decoupling producers from consumers is central to scalable, resilient architectures, and SNS provides the **push-based, one-to-many** half of AWS messaging. One event can trigger many independent reactions without the publisher knowing about or waiting for any of them. The core mental model is a **topic** as a broadcast channel: publish once, and every subscriber receives its own copy — the **fan-out** pattern. Contrast it with SQS, which is **pull-based, point-to-point** buffering; the two are frequently combined.

---

## How It Works

- **Topic** — the access point publishers send to. **Standard** topics offer nearly unlimited throughput with at-least-once delivery and best-effort ordering; **FIFO** topics provide **strict ordering and deduplication** (and deliver only to **FIFO SQS** queues).
- **Subscribers / protocols** — **SQS** queues, **Lambda** functions, **HTTP/S** endpoints, **email/email-JSON**, **SMS**, and mobile **push** (and Kinesis Data Firehose for archiving).
- **Push delivery** — SNS actively delivers to subscribers (push), with retry policies per protocol; unlike SQS where consumers poll.
- **Message filtering** — subscription **filter policies** match on message **attributes** (or body) so each subscriber receives only the messages it cares about, removing the need for many narrowly-scoped topics.

The classic **fan-out** architecture publishes to one SNS topic that has multiple **SQS** queues subscribed, so several services each process the event independently and durably (each from its own queue, at its own pace).

---

## Key Features

- **Fan-out** to many subscribers from a single publish.
- **Message filtering** by attributes/body to route subsets per subscriber.
- **FIFO topics** for ordered, deduplicated delivery (paired with FIFO SQS).
- **Encryption** at rest with **KMS** and in transit with TLS; access controlled by **topic access policies** (resource-based).
- **Delivery retries and dead-letter queues** (an SQS DLQ on the subscription) to capture undeliverable messages.
- **Message archiving and replay** (FIFO) and **delivery status logging** to CloudWatch.

---

## Configuration Reference

- **Choose Standard vs. FIFO** by ordering/deduplication needs (FIFO only delivers to FIFO SQS).
- **Add filter policies** on subscriptions to deliver only relevant messages.
- **Encrypt** the topic with KMS and restrict publishers/subscribers with a topic access policy; for cross-account, the policy must name the principals.
- **Configure DLQs** on subscriptions to capture delivery failures.

---

## Operations and Troubleshooting

- **Subscriber not receiving.** Check that the subscription is **confirmed** (HTTP/email require confirmation), the **filter policy** isn't excluding messages, and permissions allow delivery (e.g., the topic allowed to invoke the Lambda or to send to the SQS queue — the SQS queue policy must allow SNS).
- **Messages lost on delivery failure.** Configure a **DLQ**; without one, repeated delivery failures to some endpoints can be dropped after retries exhaust.
- **Ordering needed.** Use a **FIFO topic** with FIFO SQS subscribers; Standard topics don't guarantee order.
- **Access denied to publish.** Verify the **topic policy** and the publisher's IAM permissions; for KMS-encrypted topics, the publisher needs KMS permissions too.

---

## Integrations

SNS commonly fans out to **SQS** (durable per-consumer queues) and **Lambda** (event processing), notifies humans via **email/SMS**, archives via **Kinesis Data Firehose**, and is the standard target for **CloudWatch alarms** and many AWS service notifications (including Budgets and security findings). It encrypts with **KMS**, audits with **CloudTrail**, and complements **EventBridge** (which offers richer content-based routing and many SaaS/AWS event sources for event-driven integration). SNS + SQS fan-out is one of the most common decoupling patterns on AWS.

---

## Pricing and Cost Considerations

SNS charges per **request/publish** and per **notification delivered**, with delivery priced by endpoint type — **SMS and some HTTP/mobile-push deliveries cost notably more**, while deliveries to **SQS/Lambda are inexpensive**; a free tier applies. The cost levers are using **message filtering** to avoid delivering irrelevant messages, choosing appropriate endpoint types (SMS is comparatively expensive), and batching publishes where possible. Exact prices vary by endpoint type and Region.

---

## Exam Relevance

**CLF-C02:** Know SNS as a managed pub/sub notification service that pushes messages to many subscribers (and can send email/SMS), distinct from SQS. Foundational.

**SAA-C03:** Know pub/sub **fan-out (SNS → multiple SQS)**, Standard vs. FIFO, message filtering, and SNS+SQS decoupling patterns — common design content. Design depth.

**SOA-C03:** Operate notifications — CloudWatch alarm targets, DLQs, delivery-status logging, and subscription/permission troubleshooting. Operations depth.

**SCS-C03:** Secure messaging — KMS encryption, topic access policies, cross-account publishing, and using SNS for security alerting from findings. Security depth.

---

## Summary

Amazon SNS is managed pub/sub messaging where publishers send to a topic and SNS pushes each message to all subscribers (SQS, Lambda, HTTP/S, email, SMS, push). Standard topics maximize throughput; FIFO topics give ordering and deduplication (to FIFO SQS). Subscription filter policies deliver only relevant messages, DLQs capture failures, and KMS/TLS plus topic policies secure it. The hallmark pattern is **fan-out** — one publish triggering many independent, durable consumers (often SNS → multiple SQS queues) — making SNS a core decoupling and notification building block, including for CloudWatch alarms and security alerts. The recurring exam points are SNS-vs-SQS (push/pull, one-to-many/point-to-point), fan-out with SQS, and the SQS queue policy that must allow SNS.

---

## Quick Check

1. How does SNS's push model differ from SQS's pull model, and how do they combine in fan-out?
2. Why is SNS → multiple SQS queues a common implementation of fan-out?
3. What do subscription filter policies let you avoid?
4. When would you use a FIFO topic, and what subscriber type does it require?
5. A subscribed SQS queue isn't receiving messages — what permission is commonly missing?

---

## What's Next

Pair this with **Amazon SQS** (the queue half of decoupling), **AWS Lambda** (event processing), **Amazon EventBridge** (richer routing), and **Amazon CloudWatch** (alarms → SNS).
