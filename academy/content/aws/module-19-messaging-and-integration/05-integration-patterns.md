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

## Examples

An online marketplace publishes an `OrderPlaced` event to an SNS topic the moment a customer checks out. Four SQS queues are subscribed: inventory reservation, fraud scoring, fulfillment scheduling, and a Firehose stream for analytics. The fraud-scoring service is slower than the others and occasionally lags by minutes during peak traffic. Because each service owns its own queue, the fraud scorer's backlog has zero impact on the fulfillment team — they're processing at full speed from their own queue. This is the fan-out pattern making the system resilient to heterogeneous consumer performance.

A video transcoding platform receives uploaded video files and needs to fan each one out to four encoding workers (1080p, 720p, 480p, mobile). Instead of one worker knowing about the others, they use a Standard SQS queue where all four encoder instances poll the same queue. SQS's visibility timeout ensures each video chunk goes to exactly one encoder. When transcoding demand spikes, the Auto Scaling group for the encoder fleet scales out by watching `ApproximateNumberOfMessagesVisible`. This competing-consumers pattern lets the platform scale horizontally with zero coordination logic.

A banking platform that handles wire transfers implements the saga pattern using AWS Step Functions as the orchestrator. A transfer involves four steps: debit the source account, reserve the destination account, notify the external clearing network, and commit. If the clearing network call fails, Step Functions triggers compensating transactions — unreserve destination, credit source back — and marks the saga as rolled back. The entire sequence, including retries and compensations, is defined as a state machine. An engineer joining the team can read the state machine definition and understand the entire distributed transaction without hunting through microservice code.

## Think About It

1. The fan-out pattern decouples the publisher from its consumers. What happens to the overall system when you add a fifth consumer to an existing SNS topic? What happens if you remove one? Why is this significant from a team autonomy perspective?
2. In the competing-consumers pattern, two EC2 instances pull from the same SQS queue and both receive the same message due to a network delay extending past the visibility timeout. How does idempotency in your consumer prevent data corruption, and what would happen if the consumer were not idempotent?
3. Event sourcing stores events rather than current state. What happens when your event schema needs to evolve — for example, a field is renamed — and you have two years of historical events in the stream already?
4. The saga pattern has two implementation styles: choreography (services react to each other's events) and orchestration (Step Functions controls the flow). What are the failure modes unique to choreography that orchestration avoids, and vice versa?
5. You're designing a system where an order must trigger inventory reservation, payment processing, and email confirmation. How would you decide which of the patterns in this lesson — fan-out, competing consumers, or saga — to apply, and could you combine more than one?

## Quick Check

**Q1.** In the fan-out pattern, what is the correct AWS architecture to ensure that a slow consumer does not block faster consumers from processing the same event?

- A) Publish to a single SQS queue; all consumers poll the same queue
- B) Publish to an SNS topic; each consumer subscribes with its own SQS queue
- C) Publish directly to each consumer's Lambda function in parallel
- D) Use Kinesis with a single shard shared by all consumers

**Answer: B** — SNS fan-out delivers the event to each subscriber's independent SQS queue simultaneously; each consumer processes from its own queue at its own pace with no coupling between consumer speeds.

**Q2.** Which AWS service is the recommended native choice for orchestrating a saga pattern across multiple microservices?

- A) Amazon SQS FIFO
- B) Amazon EventBridge
- C) AWS Step Functions
- D) Amazon SNS FIFO

**Answer: C** — Step Functions is the AWS-native orchestrator for defining multi-step distributed workflows including sagas, with built-in support for retries, error handling, and compensating transaction logic via state machines.

**Q3.** The competing-consumers pattern scales SQS processing horizontally. Which CloudWatch metric should an Auto Scaling policy monitor to trigger scale-out of consumer instances?

- A) `NumberOfMessagesSent`
- B) `ApproximateNumberOfMessagesVisible`
- C) `NumberOfMessagesDeleted`
- D) `ApproximateAgeOfOldestMessage` only

**Answer: B** — `ApproximateNumberOfMessagesVisible` measures the backlog of unprocessed messages in the queue; a rising value signals that existing consumers are falling behind, making it the right trigger for scaling out the consumer fleet.

## What's Next

Next up: the Module 19 Canvas Lab — design a fan-out event processing pipeline.