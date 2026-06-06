---
title: "Messaging Architecture Patterns"
type: content
estimated_minutes: 14
cert_tags: ["SAA-C03", "SAP-C02"]
---

# Messaging Architecture Patterns

## Overview

The previous lessons covered individual messaging services — SQS, SNS, Kinesis, Amazon MQ, and MSK. This lesson shows how they combine into the recurring architectural patterns that solve real distributed systems problems. These patterns are not AWS-specific — they are foundational solutions to problems every distributed system faces. What AWS provides are managed services that implement each pattern without requiring you to build the infrastructure yourself.

Four patterns appear throughout AWS architectures: **fan-out** (one event triggers many independent consumers), **competing consumers** (a pool of workers drains a shared queue), **event sourcing** (the event stream as the source of truth), and the **saga pattern** (coordinating multi-service transactions without a global lock). Understanding these patterns is what separates knowing what AWS services do from knowing how to combine them into systems that are resilient, independently scalable, and operationally maintainable.

For the SAA exam, fan-out and competing consumers are the most heavily tested patterns — know the SNS → SQS → Lambda combination and how SQS enables horizontal consumer scaling. SAP adds saga orchestration vs. choreography trade-offs, event sourcing with Kinesis, and multi-pattern architectures. After this lesson, you will be able to identify which pattern addresses which failure mode and design the correct AWS service combination for each.

---

## Core Concepts

### Fan-Out Pattern

**Problem**: one event needs to trigger multiple independent downstream services simultaneously, without the producer knowing which services consume it and without one slow service blocking another.

**Solution**: publish to an SNS topic; each consuming service subscribes via its own dedicated SQS queue. SNS delivers the event to all queues simultaneously. Each service processes its queue at its own pace, independently.

**Why not have the producer call each service directly?** Direct coupling creates three problems: (1) the producer must know every consumer's address — adding a new consumer requires changing the producer; (2) a slow or unavailable consumer blocks the producer or causes it to retry; (3) consumers cannot scale or fail independently.

**Why SQS queues between SNS and consumers, rather than Lambda subscribed directly to SNS?** Direct SNS → Lambda drops messages after retry exhaustion if Lambda is throttled or temporarily broken. An SQS queue buffers messages indefinitely (up to 14 days), guaranteeing delivery when the consumer recovers. Each SQS queue also has its own DLQ and retry configuration, independently tuned per service.

**Canonical implementation**: `OrderPlaced` → SNS topic → [inventory SQS → Lambda, fulfillment SQS → Lambda, analytics Firehose, fraud-scoring SQS → Lambda]. A 10-minute fulfillment backlog has zero impact on inventory processing. Adding a fifth consumer means adding one SNS subscription — the producer is never touched.

---

### Competing Consumers Pattern

**Problem**: a queue contains more messages than a single consumer instance can process — the backlog is growing.

**Solution**: run multiple consumer instances, all polling the same SQS queue. SQS's visibility timeout ensures each message is delivered to exactly one consumer at a time. The processing fleet scales horizontally — add instances to increase throughput, reduce instances when the backlog clears.

**Automatic scaling**: configure an Auto Scaling policy on the consumer fleet (ECS service, EC2 Auto Scaling Group) targeting the SQS `ApproximateNumberOfMessagesVisible` metric. When the backlog exceeds a threshold, Auto Scaling adds instances. When it clears, instances terminate.

**With Lambda**: Lambda's event source mapping implements competing consumers automatically. Lambda scales concurrency based on queue depth — up to 1,000 concurrent executions per Standard queue. No Auto Scaling policy required.

**Idempotency is required**: in rare cases (visibility timeout expiry during processing, network delay), two consumers may receive the same message. Consumers must produce the same result whether they process a message once or twice. For writes, this means: check-then-write with a conditional update (`DynamoDB ConditionExpression`), use a deduplication ID, or use database-level upsert semantics.

---

### Event Sourcing

**Problem**: you need a complete, immutable audit trail of every state change; the ability to replay history to rebuild state; or multiple independent "read models" of the same underlying data — for example, a current-state DynamoDB table for the application and a denormalized Redshift view for analytics.

**Solution**: instead of storing only the current state, store the sequence of **events** that caused each state change. The event log is the source of truth. Current state is derived by replaying events from the log. New read models are built by replaying the same events through a different projection function.

**AWS implementation**: Kinesis Data Streams (or Amazon MSK) serves as the durable, ordered event log. Producers write events (`OrderPlaced`, `PaymentProcessed`, `ItemShipped`) as they occur. Independent consumers build projections: a DynamoDB table for current order status, a Firehose → S3 pipeline for analytics, a separate Lambda that maintains a reporting aggregate.

**When event sourcing is the right choice**: complete auditability is a regulatory or business requirement, time-travel queries are needed ("what was this account's balance at 3pm yesterday?"), or multiple conflicting read models must be maintained from one source of truth.

**When event sourcing adds unnecessary complexity**: straightforward CRUD applications where only the current state matters. Event sourcing requires careful schema evolution planning (how do you handle renamed fields in historical events?), eventual consistency between the event log and derived views, and consumer idempotency. It is powerful but overkill for most applications.

---

### Saga Pattern for Distributed Transactions

**Problem**: a business transaction spans multiple microservices, each with its own database. If payment succeeds but inventory reservation fails, data is in an inconsistent state. Traditional distributed transactions (two-phase commit) require a coordinator that becomes a single point of failure and don't work well across independent services.

**Solution**: the saga pattern decomposes the distributed transaction into a sequence of **local transactions** — each isolated to one service. Each successful step publishes an event triggering the next step. If any step fails, **compensating transactions** run in reverse order to undo completed steps.

**Two implementation styles:**

**Choreography-based saga**: each service listens for events from the previous service and reacts accordingly. No central coordinator. Simple to start but becomes difficult to reason about as the number of steps grows — the overall flow is implicit in service interactions rather than visible in one place. Debugging a failed saga requires reconstructing the flow from distributed logs.

**Orchestration-based saga** (recommended for complex flows): a central **orchestrator** controls the entire flow — calling each service in sequence, handling failures with explicit error branches, and triggering compensating transactions when needed. The complete saga definition is visible and debuggable in one place.

**AWS implementation**: **AWS Step Functions Standard Workflow** is the natural orchestrator. Each saga step is a state machine state that calls a Lambda function or directly invokes a supported AWS service. `Catch` states handle failures. `Parallel` states handle concurrent steps. The full execution history — every step, every failure, every retry — is visible in the Step Functions console per transaction. Execution history is retained for 90 days.

---

### Combining Patterns

Real architectures combine these patterns. A production order processing system might use all four:

1. **Fan-out** (SNS → multiple SQS queues) to simultaneously distribute the `OrderPlaced` event to inventory, fraud, and fulfillment processing queues
2. **Competing consumers** (multiple Lambda invocations per SQS queue) to process high volumes in parallel within each service
3. **Saga** (Step Functions) to orchestrate the fulfillment sub-workflow — reserve inventory, charge payment, schedule shipping — where partial failures require compensating transactions
4. **Event sourcing** (Kinesis) to maintain a durable audit log of all order state transitions for compliance and analytics

Recognizing which pattern addresses which problem — and which combination maps to a given architecture scenario — is the design skill the exam tests in scenario-based questions.

---

## Configuration Reference

### Example: Fan-Out with SNS Filter Policies → SQS → Lambda

```bash
# Create the SNS topic
TOPIC_ARN=$(aws sns create-topic \
  --name order-events \
  --query TopicArn --output text \
  --region us-east-1)

# Create SQS queues for three independent consumers
for service in inventory fulfillment fraud; do
  aws sqs create-queue \
    --queue-name "${service}-queue" \
    --attributes \
      VisibilityTimeout=60 \
      ReceiveMessageWaitTimeSeconds=20 \
      RedrivePolicy="{\"deadLetterTargetArn\":\"arn:aws:sqs:us-east-1:123456789012:${service}-dlq\",\"maxReceiveCount\":5}" \
    --region us-east-1
done

# Subscribe each queue to the SNS topic
# Fraud gets all events (no filter); inventory and fulfillment get only standard orders
aws sns subscribe \
  --topic-arn "$TOPIC_ARN" \
  --protocol sqs \
  --notification-endpoint "arn:aws:sqs:us-east-1:123456789012:inventory-queue" \
  --attributes '{"FilterPolicy":"{\"order_type\":[\"standard\",\"express\"]}"}' \
  --region us-east-1

aws sns subscribe \
  --topic-arn "$TOPIC_ARN" \
  --protocol sqs \
  --notification-endpoint "arn:aws:sqs:us-east-1:123456789012:fulfillment-queue" \
  --attributes '{"FilterPolicy":"{\"order_type\":[\"standard\",\"express\"]}"}' \
  --region us-east-1

aws sns subscribe \
  --topic-arn "$TOPIC_ARN" \
  --protocol sqs \
  --notification-endpoint "arn:aws:sqs:us-east-1:123456789012:fraud-queue" \
  --region us-east-1
# No FilterPolicy = receives all messages regardless of order_type
```

---

### Example: Step Functions Saga Orchestration

```json
{
  "Comment": "Order fulfillment saga — orchestration-based",
  "StartAt": "ReserveInventory",
  "States": {
    "ReserveInventory": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:us-east-1:123456789012:function:reserve-inventory",
      "Catch": [{
        "ErrorEquals": ["InventoryUnavailable"],
        "Next": "NotifyOutOfStock"        
      }],
      "Next": "ChargePayment"
    },
    "ChargePayment": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:us-east-1:123456789012:function:charge-payment",
      "Catch": [{
        "ErrorEquals": ["PaymentDeclined"],
        "Next": "ReleaseInventoryReservation"    
      }],
      "Next": "ScheduleShipment"
    },
    "ReleaseInventoryReservation": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:us-east-1:123456789012:function:release-inventory",
      "Comment": "Compensating transaction — undo inventory reservation if payment fails",
      "Next": "NotifyPaymentFailed"
    },
    "ScheduleShipment": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:us-east-1:123456789012:function:schedule-shipment",
      "End": true
    },
    "NotifyOutOfStock": {
      "Type": "Task",
      "Resource": "arn:aws:states:::sns:publish",
      "Parameters": {
        "TopicArn": "arn:aws:sns:us-east-1:123456789012:order-notifications",
        "Message.$": "$.orderId"
      },
      "End": true
    },
    "NotifyPaymentFailed": {
      "Type": "Task",
      "Resource": "arn:aws:states:::sns:publish",
      "Parameters": {
        "TopicArn": "arn:aws:sns:us-east-1:123456789012:order-notifications",
        "Message.$": "$.orderId"
      },
      "End": true
    }
  }
}
```

> **Note:** The `Catch` blocks are what make this a saga — each failed step triggers a compensating path. Without `Catch` blocks, Step Functions would simply mark the execution as failed and leave the system in an inconsistent state. Always define compensation logic for every step that mutates external state.

---

## How to Decide

**Which pattern applies to your scenario:**

| Scenario | Pattern | AWS Implementation |
|---|---|---|
| One event, multiple independent processors | Fan-out | SNS → multiple SQS queues |
| Queue backlog growing, need more throughput | Competing consumers | Multiple Lambda / ECS consumers |
| Need replay, audit trail, multiple read models | Event sourcing | Kinesis + multiple consumers |
| Multi-service transaction with rollback on failure | Saga | Step Functions Standard Workflow |
| Complex workflow, many steps, long-running | Saga (orchestration) | Step Functions Standard Workflow |
| Simple 2–3 step reaction chain | Saga (choreography) | EventBridge rules + Lambda |

**Choreography vs. orchestration saga:**

Choose **choreography** when: the saga has 2–3 steps, the flow is unlikely to change, and debugging complexity is low. EventBridge rules reacting to events naturally implement choreography.

Choose **orchestration** (Step Functions) when: the saga has 4+ steps, compensating transactions are required, execution history and debugging are important, or the flow needs to be understood by non-engineers. Step Functions makes the entire flow a visible, auditable artifact.

**Fan-out: SNS → Lambda vs. SNS → SQS → Lambda:**

Use **SNS → SQS → Lambda** (standard fan-out) for all production event-driven pipelines where message durability, independent retry, and DLQ per service are required.

Use **SNS → Lambda directly** only when processing is stateless, idempotent, and the Lambda throttling/availability window is acceptable — and message loss after retry exhaustion is tolerable (e.g., monitoring, non-critical notifications).

---

## How This Connects

- **SQS** — The backbone of both fan-out (as subscriber) and competing consumers (as the shared work queue). SQS's visibility timeout is what makes competing consumers possible — it prevents two consumers from processing the same message simultaneously.
- **SNS** — The fan-out initiator. One `Publish` call reaches all subscribed SQS queues simultaneously, decoupling publishers from the set of consumers entirely.
- **Step Functions** — The natural saga orchestrator on AWS. Standard Workflows provide full execution history, retry configuration per state, and `Catch` blocks for compensation logic. Express Workflows are faster and cheaper but lack full execution history — not appropriate for sagas requiring audit trails.
- **Kinesis** — The event log for event sourcing architectures. Multiple independent consumers read the same records at different stream positions, each building its own read-side projection.
- **EventBridge** — The event router for choreography-based sagas and event-driven architectures that require content-based routing beyond what SNS filter policies support. EventBridge rules route events based on JSON body content (not just message attributes), enabling more sophisticated choreography.
- **Lambda** — The compute layer in nearly every pattern. Lambda's event source mappings for SQS (competing consumers), Kinesis (event log consumers), and direct SNS invocation (fan-out) are how serverless architectures implement all four patterns.

---

## Exam Traps

- **Fan-out requires SQS between SNS and consumers for durability**: a common exam trap is SNS → Lambda directly for fan-out. Direct SNS → Lambda drops messages if Lambda is throttled or unavailable after retries. The correct answer for durable fan-out is always SNS → SQS → Lambda.
- **Choreography sagas are harder to debug, not simpler**: students often assume choreography is "simpler" because there is no central coordinator. At scale, the absence of a coordinator makes the saga flow implicit and debugging requires correlating logs across multiple services. Orchestration with Step Functions is operationally simpler despite the additional component.
- **Step Functions Standard vs. Express**: Standard Workflows are required for sagas — they support execution history retention and long-running workflows (up to one year). Express Workflows are cheaper and faster but execution history is not guaranteed and they are limited to 5-minute executions. Using Express Workflows for long-running sagas is a common design error.
- **Competing consumers require idempotent processing**: SQS Standard queues provide at-least-once delivery. Multiple consumers can occasionally receive the same message. Idempotency is not optional in a competing consumers architecture — processing the same message twice must produce the same result as processing it once.
- **Event sourcing is not the same as logging**: an event log is the source of truth that the current state is derived from. Application logs are observability artifacts. Using CloudWatch Logs as an "event source" is not event sourcing — Kinesis or MSK is the appropriate durable, ordered event log.

---

## Summary

- The fan-out pattern uses SNS to deliver one event simultaneously to multiple SQS queues, with each queue providing independent buffering, retry, and DLQ configuration for its consumer — the canonical multi-consumer event architecture.
- The competing consumers pattern scales a single SQS queue's processing throughput horizontally by running multiple consumer instances; Lambda's event source mapping implements this automatically.
- Event sourcing uses a durable ordered stream (Kinesis or MSK) as the immutable source of truth, enabling replay, audit trails, and multiple independent read-side projections from the same event log.
- The saga pattern coordinates distributed transactions across microservices using local transactions and compensating transactions, avoiding two-phase commit across service boundaries.
- Step Functions orchestration is preferred over choreography for sagas with 4+ steps because the complete flow is visible, debuggable, and retryable from one place.
- Real architectures combine multiple patterns — fan-out to distribute, competing consumers to scale, saga to coordinate, event sourcing to audit.

---

## Examples

An e-commerce platform processes 50,000 order events per day. When an order is placed, five independent services must react: inventory reservation, fraud scoring, fulfillment scheduling, customer email, and analytics ingestion. A single SNS topic receives the `OrderPlaced` event. Five SQS queues subscribe — each with its own DLQ, visibility timeout, and Lambda consumer. Each service is fully isolated: the analytics service processing a large batch backlog has zero impact on fulfillment scheduling. Adding a sixth service (e.g., a loyalty points service) requires one new SQS queue and one new SNS subscription — the publisher and the other five services are untouched.

A travel booking platform processes flight reservations that span three external services: seat reservation with the airline, payment processing, and hotel booking. Each step is a local transaction in a separate microservice. They implement an orchestration-based saga in Step Functions: reserve seat → charge payment → book hotel. If hotel booking fails, Step Functions runs compensating transactions in reverse: refund payment → release seat reservation. The complete execution graph for every reservation — including every retry and every compensation — is visible in the Step Functions console, giving the support team full visibility into any failed booking.