---
title: "Messaging Architecture: Service Bus vs Event Grid vs Event Hubs"
type: content
estimated_minutes: 13
cert_tags: ["az_104", "az_305"]
---

# Messaging Architecture: Service Bus vs Event Grid vs Event Hubs

## Overview

When decoupling microservices, you must pass data between them asynchronously. In AWS, the default answer is usually SQS for queues, SNS for pub/sub, and Kinesis for data streams. 

Azure divides the messaging landscape into three distinct, highly specialized services. Knowing exactly when to use each is the single most tested integration concept on the AZ-305 exam. You must first understand the fundamental difference between a **Message** and an **Event**.

## Messages vs. Events

**A Message contains raw data (Intent).** * *Example:* "Here is the customer's credit card number, the item they want to buy, and their shipping address. Process this order."
* The publisher expects the consumer to take a specific action with this data. If the message is lost, the business loses money. 

**An Event contains a notification (Fact).**
* *Example:* "A new file named `image.jpg` was just uploaded to Blob Storage."
* The publisher doesn't care who is listening or what they do with the fact. The event is lightweight; it doesn't contain the actual image, just a notification that the image exists.



## 1. Azure Service Bus (High-Value Messages)

If you are dealing with high-value financial transactions, e-commerce orders, or inventory updates, you must use **Azure Service Bus**. This is an enterprise-grade message broker (equivalent to AWS SQS/Amazon MQ).

* **Concept:** It uses traditional Queues (1-to-1) and Topics (1-to-Many). 
* **Ordered Delivery:** Service Bus guarantees First-In-First-Out (FIFO) delivery.
* **Transactions:** It supports atomic transactions. If a consumer reads a message but crashes before finishing the database update, Service Bus will seamlessly place the message back on the queue so it isn't lost.
* **Dead-Letter Queues:** If a message is malformed and cannot be processed after multiple attempts, it is moved to a Dead-Letter Queue for an engineer to inspect manually.

## 2. Azure Event Grid (Lightweight Reactive Events)

If you are building a reactive, serverless architecture, you use **Azure Event Grid**. This is a highly scalable Pub/Sub event routing service (equivalent to AWS EventBridge).

* **Concept:** It is deeply integrated into the Azure fabric. If a resource in your subscription is modified (e.g., a Virtual Machine is deleted), Event Grid instantly fires an event.
* **Push Model:** Unlike Service Bus (where the consumer has to constantly "poll" the queue to ask if there are new messages), Event Grid *pushes* the event directly to the subscriber (like an Azure Function or a Logic App) the millisecond it happens.
* **Use Case:** "Trigger my Azure Function to run an antivirus scan every time a user uploads a new file to Blob Storage."

## 3. Azure Event Hubs (Big Data Telemetry Streaming)

If you are dealing with millions of events per second, Service Bus and Event Grid will buckle. You need **Azure Event Hubs**. This is a big data streaming platform and event ingestion service (equivalent to AWS Kinesis or Apache Kafka).

* **Concept:** It is designed for massive scale—ingesting telemetry from millions of IoT devices, capturing website clickstreams, or aggregating application logs. 
* **Partitions and Retention:** Event Hubs acts like a giant tape recorder. It receives a massive stream of data and writes it sequentially to partitions. Multiple consumers can "read the tape" at their own pace.
* **Data Capture:** It has a built-in feature called "Event Hubs Capture" that automatically bundles the incoming stream of telemetry and dumps it into a Blob Storage account for long-term historical analysis.

## Summary: The Architectural Cheat Sheet

* **Need to process a high-value e-commerce order with guaranteed delivery, FIFO, and dead-letter queues?** $\rightarrow$ Use **Azure Service Bus**.
* **Need to trigger a serverless function immediately when a specific Azure resource changes state?** $\rightarrow$ Use **Azure Event Grid**.
* **Need to ingest 5 million temperature readings per second from a fleet of IoT sensors?** $\rightarrow$ Use **Azure Event Hubs**.