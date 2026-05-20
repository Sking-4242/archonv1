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

## What's Next

Next up: the Module 16 Canvas Labs — monitoring architecture design.