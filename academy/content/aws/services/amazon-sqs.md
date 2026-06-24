---
title: "Amazon SQS"
type: content
estimated_minutes: 17
cert_tags: ["CLF-C02", "SAA-C03", "SOA-C03", "SCS-C03"]
---

# Amazon SQS

## Overview

Amazon Simple Queue Service (SQS) is a fully managed **message queuing** service that decouples and buffers communication between components. Producers send messages to a queue, and consumers pull them when ready — so a fast producer and a slow consumer can work at their own paces, and a failure in one component doesn't lose the work. This *service reference* lesson covers queue types, the message lifecycle and visibility timeout, dead-letter queues, scaling, security, and what each certification expects.

SQS matters because tightly coupled, synchronous systems fail together: if a downstream component is slow or down, requests pile up and errors cascade. A queue **absorbs bursts, smooths load, and lets components scale and fail independently**. The core mental model is a **pull-based, point-to-point buffer**: messages wait durably in the queue until a consumer retrieves and processes them, then **deletes** them — and if processing fails (no delete before the visibility timeout expires), the message reappears for another attempt. Pairing SQS (durable buffering) with SNS (fan-out) is one of the most common AWS patterns.

---

## How It Works

- **Queue types**: **Standard** queues offer nearly unlimited throughput, **at-least-once** delivery, and best-effort ordering (occasional duplicates and reordering); **FIFO** queues guarantee **strict ordering** and **exactly-once processing** with **message-group-based** ordering, at high (but bounded) throughput.
- **Message lifecycle**: a producer **sends** a message; a consumer **receives** it, which starts the **visibility timeout** during which the message is hidden from other consumers; the consumer processes and **deletes** it. If it isn't deleted before the timeout expires (e.g., the consumer crashed or is slow), the message **reappears** for another consumer — this is how SQS guarantees work isn't lost.
- **Polling**: consumers should use **long polling** (wait up to 20s for messages) rather than short polling to reduce empty responses and cost.
- **Dead-letter queues (DLQ)**: after a configured **maxReceiveCount** of failed processing attempts, a message is moved to a DLQ for inspection instead of looping forever (poison-message handling).

---

## Key Features

- **Visibility timeout** to prevent duplicate processing while a consumer works (set it slightly longer than processing time).
- **Dead-letter queues** to isolate poison messages after max receives, with **redrive** to reprocess them once fixed.
- **Long polling** to cut empty receives and cost.
- **Message retention** up to **14 days** so messages persist until processed; **delay queues** and per-message **timers** to postpone delivery.
- **FIFO** ordering, deduplication (content-based or explicit), and message groups for parallel ordered streams.
- **Encryption** at rest with **KMS** and access control via **queue policies**; **large-payload** support via the extended client (payload in S3).

---

## Configuration Reference

- **Choose Standard vs. FIFO** by ordering/deduplication needs and throughput; FIFO for order-sensitive workflows.
- **Set the visibility timeout** to exceed expected processing time (or extend it mid-processing) to avoid premature redelivery.
- **Configure a DLQ** with a sensible `maxReceiveCount`.
- **Enable long polling** (a positive `ReceiveMessageWaitTimeSeconds`) and **KMS encryption**; restrict access with a queue policy (and allow SNS to send for fan-out).
- **Trigger consumers** via a **Lambda event source mapping** or poll from EC2/containers, scaling on queue depth.

---

## Operations and Troubleshooting

- **Messages processed twice.** With Standard queues, design consumers to be **idempotent**; ensure the **visibility timeout exceeds processing time** so a slow consumer doesn't let the message reappear mid-work.
- **Messages stuck/looping.** A poison message reprocessing repeatedly means you need a **DLQ**; inspect DLQ contents to debug, then **redrive**.
- **High empty-receive cost.** Enable **long polling**.
- **Backlog growing.** Scale consumers (Lambda reserved/maximum concurrency, or more workers via Auto Scaling) using the `ApproximateNumberOfMessagesVisible` and `ApproximateAgeOfOldestMessage` CloudWatch metrics.

---

## Integrations

SQS is the durable buffer in event-driven AWS: it subscribes to **SNS** topics (fan-out), triggers **Lambda** via event source mappings (batched, with partial-batch responses), decouples **EC2/ECS** workers, scales consumers via **Auto Scaling** on queue-depth metrics, encrypts with **KMS**, and is monitored by **CloudWatch**. The SNS-to-SQS fan-out and SQS-to-Lambda processing patterns are among the most common decoupling architectures, and SQS pairs with **EventBridge** in larger event-driven designs and with **Step Functions** for orchestration.

---

## Pricing and Cost Considerations

SQS charges per **request** (each send, receive, or delete is a request; a single receive can return up to **10 messages**, and batching reduces request count), with **FIFO** priced slightly higher than Standard and a free tier available. The main cost levers are **long polling** (eliminates wasteful empty receives), **batching** sends/receives, and right-sizing consumer polling. SQS is inexpensive, and its decoupling often prevents the larger costs of cascading failures and over-provisioning. Exact prices vary by Region and queue type.

---

## Exam Relevance

**CLF-C02:** Know SQS as a managed message queue that decouples components, distinct from SNS (pub/sub push). Foundational.

**SAA-C03:** Know Standard vs. FIFO, the **visibility timeout**, **DLQs**, long polling, **SNS+SQS fan-out**, and scaling consumers by queue depth — common design topics. Design depth.

**SOA-C03:** Operate queues — visibility-timeout tuning, DLQs and redrive, scaling on queue metrics, and troubleshooting duplicates/backlogs. Operations depth.

**SCS-C03:** Secure messaging — KMS encryption, queue access policies, allowing SNS to send, and least-privilege producer/consumer access. Security depth.

---

## Summary

Amazon SQS is managed, pull-based, point-to-point message queuing that decouples and buffers components for resilience and elastic scaling. Standard queues maximize throughput with at-least-once delivery and best-effort ordering; FIFO queues guarantee order and exactly-once processing via message groups. The **visibility timeout** hides a message while a consumer works and reveals it again on failure; **dead-letter queues** isolate poison messages (with redrive); **long polling** cuts cost; and KMS plus queue policies secure it. SQS underpins the SNS fan-out and Lambda-processing patterns. The recurring exam points are idempotent consumers with a visibility timeout longer than processing time, DLQs for poison messages, and Standard-vs-FIFO trade-offs.

---

## Quick Check

1. How does a queue improve resilience between a fast producer and a slow or failing consumer?
2. What does the visibility timeout do, and why should it exceed processing time?
3. What is a dead-letter queue for, and what does redrive do?
4. Why is long polling preferred over short polling?
5. What are the guarantees of Standard versus FIFO queues, and why must Standard consumers be idempotent?

---

## What's Next

Pair this with **Amazon SNS** (pub/sub fan-out into queues), **AWS Lambda** (queue consumers), **Amazon EventBridge** (event routing), and **EC2 Auto Scaling** (scaling workers by queue depth).
