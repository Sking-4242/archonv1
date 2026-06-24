---
title: "Amazon EventBridge"
type: content
estimated_minutes: 17
cert_tags: ["SAA-C03", "SOA-C03", "SCS-C03"]
---

# Amazon EventBridge

## Overview

Amazon EventBridge is a **serverless event bus** that connects application components, AWS services, and SaaS providers using events. Producers publish events to a bus; **rules** match events by their content and route them to targets — Lambda functions, Step Functions, SQS/SNS, and many more. It is the backbone of event-driven and automation architectures on AWS. This *service reference* lesson covers buses, rules and event patterns, the scheduler, schema and SaaS integration, and what each certification expects.

EventBridge matters because modern systems are increasingly event-driven: something happens (an object is uploaded, a finding fires, an order is placed) and multiple independent components should react. EventBridge decouples producers from consumers and routes events based on **content**, so you add or change reactions without touching producers. It is also the connective tissue for **automated remediation** — AWS services emit events about state changes (Config noncompliance, GuardDuty findings, EC2 state changes), and EventBridge rules trigger the response. The core mental model is **event → rule (pattern match) → target(s)**, on a bus.

---

## How It Works

- **Event buses** — the **default bus** receives events from AWS services automatically; **custom buses** carry your application events; **partner buses** receive events from SaaS providers (Datadog, Zendesk, etc.).
- **Events** — JSON messages with a source, detail-type, and detail payload (AWS services publish a rich stream of these automatically).
- **Rules** — each rule has an **event pattern** that matches on fields in the event (source, detail-type, specific values, prefixes, ranges) and routes matching events to one or more **targets**. Rules can transform the event (input transformer) before delivery.
- **Targets** — Lambda, Step Functions, SQS, SNS, Kinesis, API destinations (any HTTP endpoint), other event buses, Systems Manager Automation, and more, with retry policies and dead-letter queues.

Beyond routing, **EventBridge Scheduler** runs tasks on a one-time or recurring (cron/rate) schedule at scale (the modern replacement for CloudWatch Events scheduled rules), and the **Schema Registry** discovers and versions event schemas for code generation. **EventBridge Pipes** connect a source (SQS, DynamoDB/Kinesis streams) to a target with optional filtering and enrichment.

---

## Key Features

- **Content-based routing** via rich **event patterns** — far more expressive than SNS topic-based filtering.
- **Broad integration** — most AWS services as event sources, **SaaS partner** event sources, and **API destinations** to call external HTTP APIs.
- **EventBridge Scheduler** for scalable cron/rate scheduling with flexible time windows and time zones.
- **Pipes** for point-to-point source-to-target integration with filtering/enrichment.
- **Schema Registry** for discovering, versioning, and generating code bindings for events.
- **Archive and replay** of events for recovery and testing; **resource policies** and cross-account/cross-Region event delivery.

---

## Configuration Reference

- **Use the default bus** for AWS-service events (Config, GuardDuty, EC2, etc.); a **custom bus** for your application's domain events; a **partner bus** for SaaS sources.
- **Write event patterns** to match precisely (source + detail-type + specific detail fields), and attach **DLQs** to targets to capture delivery failures.
- **Use EventBridge Scheduler** for scheduled jobs rather than legacy scheduled rules.
- **Grant least-privilege** target permissions and use resource policies for cross-account event sharing.

---

## Operations and Troubleshooting

- **Target not invoked.** Check the **event pattern** (a too-strict pattern silently matches nothing), the rule is on the correct **bus**, and EventBridge has **permission** to invoke the target (target resource policy / IAM).
- **Lost events on failure.** Configure a **DLQ** and retry policy on the target; use **archive/replay** to recover.
- **EventBridge vs. SNS.** EventBridge offers content-based routing, many AWS/SaaS sources, scheduling, and replay; SNS is simpler, lower-latency, high-fanout pub/sub. For complex routing and AWS-event-driven automation, EventBridge; for high-throughput fan-out notifications, SNS.
- **Scheduling confusion.** Use **EventBridge Scheduler** (scalable, one-time or recurring) for scheduled tasks.

---

## Integrations

EventBridge routes events from most **AWS services** (and **SaaS partners**) to targets including **Lambda**, **Step Functions**, **SQS/SNS**, **Kinesis**, **Systems Manager Automation**, and **API destinations**. It is central to **automated remediation** — **AWS Config** noncompliance, **GuardDuty/Security Hub** findings, and resource state changes trigger rules that run Lambda or SSM Automation. It complements **CloudWatch** (alarms can target EventBridge/SNS), **SQS** (durable buffering of events), and **Step Functions** (orchestration of multi-step responses). It is the standard glue for event-driven and security-automation architectures.

---

## Pricing and Cost Considerations

EventBridge charges per **event published** to a custom or partner bus (AWS-service events on the default bus are generally **free to receive**), plus charges for **Scheduler** invocations, **Pipes** (per request processed), and **schema discovery**. Costs are typically low and scale with event volume; the levers are precise event patterns (so you don't fan out unnecessary processing), appropriate use of Pipes vs. rules, and awareness that custom-bus event ingestion is metered. Exact prices vary by Region and feature.

---

## Exam Relevance

**SAA-C03:** Know EventBridge as the serverless event bus for event-driven architectures, content-based routing with event patterns, broad AWS/SaaS sources, Scheduler, and EventBridge-vs-SNS selection. Design depth.

**SOA-C03:** Operate automation — routing AWS service events (Config, EC2 state, GuardDuty) to Lambda/SSM Automation for **automated remediation**, scheduling jobs, and troubleshooting rules. Operations depth; central to the automation domain.

**SCS-C03:** Security automation — routing GuardDuty/Security Hub/Config findings to automated response (Lambda/SSM), cross-account event delivery, and archive/replay. Security depth.

---

## Summary

Amazon EventBridge is a serverless event bus where producers publish events to a default, custom, or partner bus, and rules with **content-based event patterns** route matching events to targets (Lambda, Step Functions, SQS/SNS, SSM Automation, API destinations). It adds **EventBridge Scheduler** for scalable cron/rate scheduling, **Pipes** for source-to-target integration with filtering/enrichment, a **Schema Registry**, and archive/replay. It is the backbone of event-driven architectures and the trigger layer for **automated remediation** from Config/GuardDuty/Security Hub events. The recurring exam points are content-based routing vs. SNS topic fan-out, EventBridge as the automation trigger, and Scheduler for scheduled tasks.

---

## Quick Check

1. How does EventBridge route events, and how does that differ from SNS's topic-based model?
2. What are the three kinds of event buses, and what does each receive?
3. How is EventBridge used to build automated remediation from a Config or GuardDuty finding?
4. A rule's target is never invoked — what two causes should you check first?
5. Which EventBridge feature replaces legacy scheduled rules for cron/rate jobs?

---

## What's Next

Pair this with **AWS Lambda** and **AWS Step Functions** (common targets), **AWS Systems Manager** (Automation remediation), **Amazon SQS/SNS** (buffering and fan-out), and the SOA-C03 automation lessons.
