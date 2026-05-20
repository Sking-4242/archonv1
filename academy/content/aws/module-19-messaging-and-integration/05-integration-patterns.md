---
title: "Messaging Architecture Patterns"
type: content
estimated_minutes: 8
cert_tags: ["SAA-C03", "SAP-C02"]
---

# Messaging Architecture Patterns

## Overview

Messaging services are most powerful when combined in well-established patterns. This lesson covers the core architecture patterns for decoupled, resilient systems: fan-out, competing consumers, event sourcing, and the saga pattern for distributed transactions.

## Fan-Out Pattern

Problem: one event needs to trigger multiple independent services. Solution: publish to SNS → multiple SQS queues subscribed → each service consumes its own queue at its own pace. Benefits: publisher doesn't know about consumers, consumers are independently scalable and deployable, one consumer failure doesn't affect others. Example: order placed → SNS → [inventory SQS, fulfillment SQS, analytics Firehose]. The Firehose subscription gives you near-real-time S3 archival of all events.

## Competing Consumers

Problem: one queue has more work than a single consumer can handle. Solution: multiple consumer instances all polling the same SQS queue. SQS delivers each message to exactly one consumer (visibility timeout prevents double-processing). Lambda auto-scaling does this automatically. For EC2/ECS consumers, scale out the consumer fleet using Auto Scaling triggered by the SQS `ApproximateNumberOfMessagesVisible` metric. This pattern underlies most horizontal scaling of async processing.

## Event Sourcing

Instead of storing current state in a database, store the sequence of events that led to the current state. The current state is derived by replaying events. Kinesis Data Streams (or MSK) serves as the event log — durable, ordered, replayable. Consumers rebuild read models (projections) by replaying the event stream. Advantages: complete audit history, ability to replay and rebuild any view of the data, temporal queries. Complexity: eventual consistency, schema evolution for events. Common in financial systems and high-audit domains.

## Saga Pattern for Distributed Transactions

In a microservices architecture, a transaction may span multiple services (debit account, reserve inventory, schedule shipping). Without a distributed transaction coordinator, partial failures leave data inconsistent. The Saga pattern defines a sequence of local transactions, each publishing an event to trigger the next step. If a step fails, compensating transactions roll back prior steps. Implementation: Choreography-based (each service reacts to events from the previous) or Orchestration-based (Step Functions controls the saga centrally). Step Functions is the AWS-native orchestration approach.

## Summary

Fan-out, competing consumers, event sourcing, and saga are the core patterns for decoupled, resilient architectures. SNS + SQS fan-out is the most common. Lambda + SQS competing consumers handles most async processing. Step Functions orchestrates sagas. Understanding these patterns is the difference between building a collection of services and building a resilient distributed system.

## What's Next

Next up: the Module 19 Canvas Lab — design a fan-out event processing pipeline.