---
title: "Amazon EventBridge: Event-Driven Architecture"
type: content
estimated_minutes: 13
cert_tags: ["SAA-C03", "SAP-C02"]
---

# Amazon EventBridge: Event-Driven Architecture

## Overview

Every lesson in this module has described monitoring and responding to events — CloudWatch alarms firing when metrics cross thresholds, GuardDuty findings triggering Lambda remediation, Config rules detecting non-compliance. The connective tissue behind all of that is Amazon EventBridge: the serverless event bus that routes events from AWS services, your applications, and SaaS providers to targets like Lambda, Step Functions, SQS, and SSM. EventBridge is the foundation of event-driven architecture on AWS.

The problem EventBridge solves is coupling. Without it, if you want Service A to trigger Service B when something happens, Service A must directly invoke Service B — it must know B's endpoint, handle B's failures, and be updated every time you add a Service C. With EventBridge, Service A publishes an event to an event bus and knows nothing about who consumes it. A rule matches the event and routes it to any number of targets simultaneously. Adding Service C as a consumer requires no changes to Service A — just a new rule. This decoupling makes systems more extensible, more testable, and more resilient.

For the SAA exam, understand event buses (default, custom, partner), rules and pattern matching, common sources and targets, and scheduled rules. The SAP exam adds schema registry, EventBridge Pipes for enrichment pipelines, archive and replay for event sourcing, and cross-account event routing. After this lesson, you will be able to design an event-driven automation architecture on AWS using EventBridge as the central routing layer.

---

## Core Concepts

### Event Buses and Event Structure

An **event bus** is the channel through which events flow. Every AWS account has three types:

**Default event bus**: receives events from AWS services automatically — EC2 state changes, S3 object creation, CloudTrail API activity, GuardDuty findings, CodePipeline state changes, Config rule evaluations, and dozens more. You do not need to configure AWS services to send events here; it happens automatically.

**Custom event buses**: receive events from your own applications via the `PutEvents` API. You create custom buses to logically separate different applications or domains — an `orders` bus for order service events, a `payments` bus for payment events. Custom buses can also receive events from other AWS accounts, enabling cross-account event routing.

**Partner event buses**: receive events from AWS Partner SaaS providers — Shopify, Zendesk, Datadog, PagerDuty, GitHub, and others. You subscribe to a partner's event source in the EventBridge Partner section, and their events arrive on a partner bus without custom webhook infrastructure.

All events share the same JSON structure: `source` (the producer), `detail-type` (a human-readable classification), `detail` (the event payload), `time`, `region`, and `account`. This consistent structure is what makes pattern matching across diverse event sources possible.

---

### Rules and Pattern Matching

A **rule** watches an event bus for events matching a pattern, then routes matching events to one or more targets. Rules are evaluated against every event that arrives on the bus; matching is done on the event's JSON fields.

**Event patterns** are JSON documents that specify the conditions for a match. You can match on:
- **Source**: `"source": ["aws.ec2"]` — only EC2 events
- **Detail-type**: `"detail-type": ["EC2 Instance State-change Notification"]`
- **Specific field values**: `"detail": {"state": ["running"]}` — only when state is "running"
- **Absence of a field**: match events where a specific key does not exist (e.g., missing required tags)
- **Prefix matching**: `"detail": {"bucketName": [{"prefix": "prod-"}]}`

A rule can have **up to five targets**. All matching targets receive a copy of the event simultaneously. Targets can be Lambda functions, Step Functions state machines, SQS queues, SNS topics, Kinesis streams, API Gateway endpoints, ECS tasks, SSM Run Command documents, CodePipeline pipelines, and more. EventBridge retries failed deliveries to targets for up to 24 hours with exponential backoff.

---

### Scheduled Rules and EventBridge Scheduler

Rules can also be triggered on a **schedule** rather than in response to events — using a cron expression (`cron(0 8 * * ? *)` for 8 AM daily) or a rate expression (`rate(5 minutes)`). Scheduled rules are the replacement for CloudWatch Events scheduled rules and the standard mechanism for triggering Lambda functions or ECS tasks on a schedule.

**EventBridge Scheduler** is a newer, more powerful scheduled invocation service. Unlike scheduled rules (which create events on a bus), Scheduler directly invokes targets with configurable time zones, one-time schedules (fire once at a specific timestamp), and flexible time windows (deliver within a time range rather than at an exact time). Scheduler supports over 270 API targets directly — not just Lambda and Step Functions.

---

### Schema Registry and EventBridge Pipes

The **Schema Registry** maintains a searchable catalog of event schemas. AWS publishes schemas for all service events — the exact JSON structure of every EC2, S3, CloudTrail, and GuardDuty event. For custom buses, enable **schema discovery** and EventBridge automatically infers schemas from events as they arrive.

From any schema, you can generate **typed code bindings** in TypeScript, Python, Java, or Go — pre-built data classes that represent the event structure, enabling compile-time type safety in event handlers. This eliminates the "what fields does this event have?" question and prevents schema drift from silently breaking consumers.

**EventBridge Pipes** provides point-to-point integration with built-in filtering, enrichment, and transformation. A Pipe has a source (SQS queue, Kinesis stream, DynamoDB stream, Kafka topic), optional filtering, optional enrichment (call a Lambda or Step Functions to add data to the event), and a target. Pipes are designed for use cases where you need to transform or enrich events before they reach the consumer, without writing custom routing infrastructure.

---

### Archive and Replay

**Archive** captures all events published to an event bus with a configurable retention period (1 day to indefinitely). Every event that flows through the bus is stored in the archive.

**Replay** sends archived events back through the bus's current rules as if they were arriving now. The events pass through all rules and reach all matching targets exactly as they would have when originally published.

Archive and replay enable several patterns: testing a new rule target against historical event data before going live, recovering from a processing failure by replaying events that targets missed while offline, implementing event sourcing where the event log is the source of truth for rebuilding application state.

---

## Configuration Reference

### Creating a Rule for GuardDuty Findings → Lambda Remediation

```bash
# Create a rule on the default bus matching HIGH/CRITICAL GuardDuty findings
aws events put-rule \
  --name "guardduty-high-severity-response" \
  --event-bus-name default \
  --event-pattern '{
    "source": ["aws.guardduty"],
    "detail-type": ["GuardDuty Finding"],
    "detail": {
      "severity": [{"numeric": [">=", 7.0]}]
    }
  }' \
  --state ENABLED \
  --description "Route HIGH/CRITICAL GuardDuty findings to remediation Lambda" \
  --region us-east-1

# Add a Lambda target to the rule
aws events put-targets \
  --rule "guardduty-high-severity-response" \
  --event-bus-name default \
