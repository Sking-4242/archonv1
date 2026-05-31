---
title: "Amazon EventBridge: Event-Driven Architecture"
type: content
estimated_minutes: 8
cert_tags: ["SAA-C03", "DVA-C02"]
---

# Amazon EventBridge: Event-Driven Architecture

## Overview

Amazon EventBridge (formerly CloudWatch Events) is a serverless event bus that routes events from AWS services, your applications, and SaaS providers to target services. It's the foundation of event-driven architecture on AWS — decoupling event producers from event consumers.

## Event Buses and Rules

An event bus receives events. The default event bus receives events from AWS services automatically. Custom event buses receive events from your applications. Partner event buses receive events from AWS Partner SaaS providers (Zendesk, Shopify, Datadog). Rules are patterns that match incoming events and route them to one or more targets. A rule can match on event source, type, and specific fields in the JSON payload using pattern matching.

## Event Sources and Targets

Sources: any AWS service (S3 puts, EC2 state changes, CodePipeline state changes, GuardDuty findings, etc.), custom app events via PutEvents API, scheduled events (cron or rate expressions — replaced CloudWatch Events scheduled rules). Targets: Lambda, Step Functions, SQS, SNS, Kinesis, API Gateway, ECS tasks, SSM Run Command, CodePipeline, and more. One rule can have multiple targets, and targets receive a copy of the event.

## Schema Registry and Discovery

EventBridge Schema Registry maintains a catalog of event schemas. Enable schema discovery and EventBridge automatically infers schemas from observed events. From a schema, you can generate typed binding code (TypeScript, Python, Java, Go) for type-safe event handling in your consumers. The registry also hosts AWS service schemas — useful for understanding the exact shape of events from S3, EC2, etc.

## EventBridge Pipes and Archive

EventBridge Pipes provides point-to-point integration between event sources and targets with built-in filtering, enrichment (via Lambda or Step Functions), and transformation. Sources: SQS, Kinesis, DynamoDB Streams, Kafka. Targets: same as rules. Archive stores all events on an event bus with configurable retention — enabling replay. Replay sends archived events through rules again, useful for testing new rule targets against historical event data.

## Summary

EventBridge is the hub of event-driven architecture on AWS. Default bus for AWS service events; custom buses for application events; partner buses for SaaS. Rules match patterns and route to targets. Schema registry provides typed event contracts. Archive and replay enable event sourcing patterns. Use EventBridge over direct service invocation — it decouples producers from consumers and makes the system more extensible.

## Examples

A retailer integrated their AWS environment with Shopify (an EventBridge Partner). When a new order was placed in Shopify, an event arrived on the partner event bus automatically — no polling, no custom webhook plumbing. An EventBridge rule matched events where `detail-type` was `"Order Created"` and routed them to a Lambda function that reserved inventory in DynamoDB. The entire integration required zero changes to the Shopify configuration and no servers to manage. This demonstrates how partner event buses eliminate the custom integration work that would otherwise require building and maintaining webhook receivers.

A DevOps team at a software company wanted to enforce a governance rule: every time an EC2 instance was launched without the required `cost-center` tag, an alert should fire and the instance should be stopped. They created an EventBridge rule on the default bus matching the `EC2 Instance State-change Notification` event (state: running), with a pattern filter checking for the absence of the tag. The rule triggered a Step Functions workflow that checked the tag, sent an SNS alert to the team, and stopped the non-compliant instance. This shows EventBridge turning an AWS service event into an automated governance enforcement action — with no polling and sub-second reaction time.

A platform team building a microservices order management system used EventBridge Archive and Replay to validate a new rule they were deploying for their billing service. They had 30 days of archived `OrderCompleted` events on their custom bus. Before going live, they replayed one week of archived events through the new billing rule in a staging environment, verified the Lambda target processed them correctly, and only then deployed the rule to production. This illustrates the archive-and-replay pattern as a testing and event sourcing tool — one of EventBridge's most powerful but under-used capabilities.

## Think About It

1. Why does routing events through EventBridge (rather than having Service A directly invoke Service B via API call) make a system more extensible — what happens when you need to add a third consumer for the same event?
2. What trade-offs do you accept when using EventBridge scheduled rules (rate/cron) to trigger Lambda functions instead of using CloudWatch Events or a dedicated scheduler like EventBridge Scheduler?
3. How would you design an EventBridge rule that handles events from multiple sources (S3 and DynamoDB Streams) but routes them to different targets based on which service produced the event?
4. EventBridge delivers events at least once but does not guarantee exactly-once delivery. How should your Lambda targets be designed to handle this, and what pattern addresses idempotency concerns?
5. The Schema Registry can generate typed code bindings from event schemas. What problem does this solve in a team environment where multiple services must agree on event structure, and what happens to consumers if a producer changes the schema without notice?

## Quick Check

**Q1.** Which EventBridge event bus receives events from AWS services (like S3 and EC2) automatically without any configuration?
- A) Custom event bus
- B) Partner event bus
- C) Default event bus
- D) Global event bus

**Answer: C** — The default event bus in every AWS account automatically receives events published by AWS services; custom buses are for your own application events and partner buses are for SaaS provider events.

**Q2.** What does EventBridge Archive and Replay enable?
- A) Cross-region replication of events to a backup event bus
- B) Storage of events on an event bus with configurable retention, and the ability to re-send those stored events through current rules
- C) Automatic retry of failed rule targets up to 24 hours after the original event
- D) Versioning of EventBridge rules so previous rule configurations can be restored

**Answer: B** — Archive captures all events on a bus with a configurable retention period; Replay sends those archived events back through the bus's current rules, enabling use cases like testing new rule targets against historical data or recovering from processing failures.

**Q3.** What is the purpose of the EventBridge Schema Registry?
- A) To enforce that all events on a custom bus conform to a predefined JSON schema before they are routed
- B) To store a catalog of event schemas and optionally generate typed code bindings for event consumers
- C) To validate IAM permissions before allowing a producer to publish events to a bus
- D) To deduplicate events that match the same schema within a five-minute window

**Answer: B** — The Schema Registry maintains a searchable catalog of event schemas (including all AWS service schemas), supports automatic schema discovery from observed events, and generates typed code in multiple languages so consumers can handle events with compile-time type safety.

## What's Next

Next up: the Module 16 Canvas Labs — monitoring architecture design.