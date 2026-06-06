---
title: "Amazon EventBridge"
type: content
estimated_minutes: 28
cert_tags: ["SAA-C03", "DVA-C02", "SAP-C02"]
---

## Overview

Amazon EventBridge is a serverless event bus that routes events between AWS services, your own applications, and third-party SaaS providers based on the content of each event. It is the evolved successor to Amazon CloudWatch Events — both share the same underlying API, but EventBridge adds custom event buses, partner event sources, a schema registry, and EventBridge Pipes, making it a much more complete integration platform. If you see CloudWatch Events in legacy documentation or exam questions, treat it as EventBridge; they are the same service.

The fundamental value proposition of EventBridge is content-based routing at scale. Unlike a message queue (which delivers to a single consumer) or a simple pub/sub system (which fans out to all subscribers), EventBridge inspects the body of each event and routes it only to the rules that match. This means a single event bus can handle events from dozens of sources and route each event type to a completely different target — a Lambda function for one event type, SQS for another, Step Functions for a third — all based on declarative rules with no routing code to maintain.

For certification exams, EventBridge appears in scenarios that involve event-driven architectures, decoupled microservices, scheduled tasks, cross-account event routing, and SaaS integrations. The most common exam skill is distinguishing EventBridge from SNS and SQS — each serves a different integration pattern — and understanding event pattern matching, which is more flexible than SNS filter policies.

## Core Concepts

### Event Buses

An event bus is the channel through which events flow. EventBridge provides three types. The **default event bus** exists in every AWS account and receives events from AWS services automatically — when an EC2 instance changes state, when an S3 object is created, when a CodePipeline stage fails, those events arrive on the default bus without any configuration on your part. **Custom event buses** are ones you create to receive events from your own applications. Your microservices publish events by calling `PutEvents` on a named custom bus, which keeps your application events isolated from AWS service events and enables fine-grained access control. **Partner event buses** receive events directly from SaaS partners that have integrated with EventBridge — Zendesk, Salesforce, Datadog, PagerDuty, GitHub, and many others. A partner sends events to your partner event source, which you associate with a partner event bus in your account, and from there your rules apply as normal. This makes EventBridge the connection point between your AWS workloads and external SaaS applications without any polling or webhook infrastructure to manage.

### Rules and Event Patterns

A rule defines what to do when an event matches a pattern. Rules consist of two parts: an event pattern (or a schedule) that selects which events trigger the rule, and one or more targets that receive the matching events. Event pattern matching is content-based — EventBridge looks inside the JSON body of the event and evaluates it against filter conditions. You can match on exact string values, numeric ranges, prefixes, suffix, anything-but (exclusion), existence or non-existence of a field, IP address CIDR ranges, and more. Critically, EventBridge pattern matching operates on the full event body, not just message attributes. This is a meaningful difference from SNS filter policies, which can only filter on message attributes (metadata), not on the message body itself. Each event bus supports up to 300 rules. If you need more, use multiple buses or aggregate events before routing.

### Targets

When a rule matches, EventBridge delivers the event to one or more targets. Each rule supports up to five targets simultaneously, meaning a single matching event can fan out to multiple destinations in parallel. EventBridge supports over 20 target types natively, including AWS Lambda, Amazon SQS, Amazon SNS, AWS Step Functions, Amazon Kinesis Data Streams, Amazon Kinesis Firehose, Amazon ECS tasks, AWS Batch jobs, Amazon API Gateway, AWS CodeBuild, AWS CodePipeline, and another EventBridge event bus (which enables cross-account and cross-region event routing). The cross-bus target is particularly important for architectures where a central event bus in a management account fans events out to event buses in individual workload accounts — a common enterprise pattern. EventBridge handles retries automatically: it retries failed target invocations with exponential backoff for up to 24 hours, and you can configure a dead-letter queue (SQS) to capture events that exhaust all retries.

### Input Transformation

Before delivering an event to a target, EventBridge can transform it. Input transformation extracts specific fields from the event using JSONPath expressions (called input paths) and assembles a new JSON document (using an input template) to send to the target. This means the target receives exactly the data it needs in the shape it expects, without requiring a Lambda function just to reformat messages. For example, when routing an S3 object creation event to a Lambda function, you might extract only the bucket name and object key rather than sending the entire S3 event envelope. Input transformation reduces coupling between event producers and consumers and avoids unnecessary Lambda invocations just for data reformatting.

### EventBridge Pipes

EventBridge Pipes provide point-to-point integration between a single source and a single target with built-in filtering, enrichment, and transformation — without writing glue code. A Pipe connects one source (SQS, Kinesis, DynamoDB Streams, Kafka, MQ) to one target (Lambda, Step Functions, EventBridge bus, SQS, SNS, API Gateway, etc.). Between source and target, a Pipe can apply a filter to drop unwanted records, invoke an enrichment step (a Lambda function or API Gateway endpoint) to add data to the event, and apply input transformation before delivery. Pipes are ideal for the common pattern of "read from a queue, enrich the message, write to another service" — replacing custom Lambda polling code with a fully managed, low-latency pipeline. Pipes differ from standard EventBridge rules in that they handle streaming and queue sources (with batching), support enrichment, and are point-to-point rather than fan-out.

### Schema Registry

The EventBridge Schema Registry automatically discovers the schema of events flowing through your event bus and stores them as versioned schema documents. You can browse schemas for all AWS services, partner events, and your own custom events. From a stored schema, you can generate code bindings in Python, Java, TypeScript, or Go that create typed event objects in your application code — eliminating the need to manually parse raw JSON and reducing runtime errors. The Schema Registry makes EventBridge events first-class, documented contracts between services rather than loosely-typed JSON blobs. For teams building event-driven microservices, the schema registry acts as a living catalog of all events in the system.

## Configuration Reference

```json
// -------------------------------------------------------
// EVENT PATTERN EXAMPLES
// All patterns match against the full event JSON body
// -------------------------------------------------------

// 1. Match EC2 instance state changes to "stopped" or "terminated"
{
  "source": ["aws.ec2"],
  "detail-type": ["EC2 Instance State-change Notification"],
  "detail": {
    "state": ["stopped", "terminated"]
  }
}

// 2. Match S3 object creation events in a specific bucket and prefix
{
  "source": ["aws.s3"],
  "detail-type": ["Object Created"],
  "detail": {
    "bucket": {
      "name": ["my-uploads-bucket"]
    },
    "object": {
      "key": [{ "prefix": "incoming/" }]
    }
  }
}

// 3. Match CodePipeline failures (anything-but success)
{
  "source": ["aws.codepipeline"],
  "detail-type": ["CodePipeline Pipeline Execution State Change"],
  "detail": {
    "state": [{ "anything-but": ["SUCCEEDED", "STARTED"] }]
  }
}

// 4. Numeric range matching — match orders over $1000
// (custom event published by your application)
{
  "source": ["myapp.orders"],
  "detail-type": ["OrderPlaced"],
  "detail": {
    "orderTotal": [{ "numeric": [">", 1000] }],
    "status": ["confirmed"]
  }
}

// 5. Field existence check — match events that have a "errorCode" field
{
  "source": ["myapp.payments"],
  "detail-type": ["PaymentProcessed"],
  "detail": {
    "errorCode": [{ "exists": true }]
  }
}
```

```bash
# -------------------------------------------------------
# AWS CLI: Working with EventBridge
# -------------------------------------------------------

# List all event buses in the account
aws events list-event-buses

# Create a custom event bus
aws events create-event-bus \
  --name my-application-bus

# Create a rule on the custom event bus
aws events put-rule \
  --name "high-value-orders" \
  --event-bus-name "my-application-bus" \
  --event-pattern '{
    "source": ["myapp.orders"],
    "detail-type": ["OrderPlaced"],
    "detail": {
      "orderTotal": [{ "numeric": [">", 1000] }]
    }
  }' \
  --state ENABLED \
  --description "Route high-value orders to fulfillment Lambda"

# Add a Lambda target to the rule
aws events put-targets \
  --rule "high-value-orders" \
  --event-bus-name "my-application-bus" \
  --targets '[
    {
      "Id": "FulfillmentLambda",
      "Arn": "arn:aws:lambda:us-east-1:123456789012:function:process-high-value-order",
      "InputTransformer": {
        "InputPathsMap": {
          "orderId": "$.detail.orderId",
          "total": "$.detail.orderTotal",
          "customerId": "$.detail.customerId"
        },
        "InputTemplate": "{\"orderId\": \"<orderId>\", \"total\": <total>, \"customerId\": \"<customerId>\", \"priority\": \"high\"}"
      }
    }
  ]'

# Publish a custom event to the custom bus
aws events put-events \
  --entries '[
    {
      "EventBusName": "my-application-bus",
      "Source": "myapp.orders",
      "DetailType": "OrderPlaced",
      "Detail": "{\"orderId\": \"ORD-12345\", \"orderTotal\": 1499.99, \"customerId\": \"CUST-789\", \"status\": \"confirmed\"}"
    }
  ]'

# Create a scheduled rule (rate-based) — runs every 5 minutes
aws events put-rule \
  --name "five-minute-heartbeat" \
  --schedule-expression "rate(5 minutes)" \
  --state ENABLED

# Create a scheduled rule (cron-based) — runs at 8 AM UTC Monday-Friday
aws events put-rule \
  --name "weekday-morning-report" \
  --schedule-expression "cron(0 8 ? * MON-FRI *)" \
  --state ENABLED

# List rules on the default event bus
aws events list-rules \
  --event-bus-name default

# Test an event pattern without publishing an event
aws events test-event-pattern \
  --event-pattern '{
    "source": ["myapp.orders"],
    "detail-type": ["OrderPlaced"],
    "detail": {
      "orderTotal": [{ "numeric": [">", 1000] }]
    }
  }' \
  --event '{
    "source": "myapp.orders",
    "detail-type": "OrderPlaced",
    "detail": {
      "orderId": "ORD-99999",
      "orderTotal": 2500,
      "customerId": "CUST-001"
    }
  }'
```

```yaml
# -------------------------------------------------------
# CloudFormation: Complete EventBridge rule with
# cross-account event forwarding and DLQ
# -------------------------------------------------------
AWSTemplateFormatVersion: "2010-09-09"

Resources:

  # Custom event bus for application events
  ApplicationEventBus:
    Type: AWS::Events::EventBus
    Properties:
      Name: application-events

  # Resource policy allowing a different account to put events on this bus
  ApplicationEventBusPolicy:
    Type: AWS::Events::EventBusPolicy
    Properties:
      EventBusName: !Ref ApplicationEventBus
      StatementId: AllowCrossAccountPublish
      Action: events:PutEvents
      Principal: "111122223333"    # The source AWS account ID

  # Dead-letter queue for failed event deliveries
  OrderProcessingDLQ:
    Type: AWS::SQS::Queue
    Properties:
      QueueName: order-processing-dlq
      MessageRetentionPeriod: 1209600   # 14 days

  # EventBridge rule: route high-value orders to Lambda
  HighValueOrderRule:
    Type: AWS::Events::Rule
    Properties:
      Name: high-value-order-routing
      EventBusName: !Ref ApplicationEventBus
      Description: Route orders over $1000 to priority fulfillment function
      EventPattern:
        source:
          - myapp.orders
        detail-type:
          - OrderPlaced
        detail:
          orderTotal:
            - numeric:
                - ">"
                - 1000
          status:
            - confirmed
      State: ENABLED
      Targets:
        - Id: PriorityFulfillmentFunction
          Arn: !GetAtt PriorityFulfillmentFunction.Arn
          # Transform the event before delivery — only send what Lambda needs
          InputTransformer:
            InputPathsMap:
              orderId: "$.detail.orderId"
              total: "$.detail.orderTotal"
              customerId: "$.detail.customerId"
            InputTemplate: >-
              {
                "orderId": "<orderId>",
                "total": <total>,
                "customerId": "<customerId>",
                "priority": "high"
              }
          # Dead-letter queue for this specific target
          DeadLetterConfig:
            Arn: !GetAtt OrderProcessingDLQ.Arn
          # Retry policy: retry for up to 2 hours, max 3 attempts
          RetryPolicy:
            MaximumRetryAttempts: 3
            MaximumEventAgeInSeconds: 7200

  # Grant EventBridge permission to invoke the Lambda
  LambdaInvokePermission:
    Type: AWS::Lambda::Permission
    Properties:
      FunctionName: !GetAtt PriorityFulfillmentFunction.Arn
      Action: lambda:InvokeFunction
      Principal: events.amazonaws.com
      SourceArn: !GetAtt HighValueOrderRule.Arn

  # Placeholder Lambda function (replace with your actual function)
  PriorityFulfillmentFunction:
    Type: AWS::Lambda::Function
    Properties:
      FunctionName: process-high-value-order
      Runtime: python3.12
      Handler: index.handler
      Role: !GetAtt LambdaExecutionRole.Arn
      Code:
        ZipFile: |
          import json
          def handler(event, context):
              print(f"Processing order: {event['orderId']}, total: {event['total']}")
              return {"status": "processed"}

  LambdaExecutionRole:
    Type: AWS::IAM::Role
    Properties:
      AssumeRolePolicyDocument:
        Version: "2012-10-17"
        Statement:
          - Effect: Allow
            Principal:
              Service: lambda.amazonaws.com
            Action: sts:AssumeRole
      ManagedPolicyArns:
        - arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
```

## How to Decide

Use this framework when choosing between EventBridge, SNS, and SQS:

| Need | Best Choice | Why |
|---|---|---|
| Route events from many AWS services to many different targets | EventBridge | Content-based routing on full event body; AWS services publish natively |
| Fan out one message to many subscribers simultaneously | SNS | Simple pub/sub; low latency fan-out to SQS, Lambda, HTTP endpoints |
| Queue work for one consumer to process at its own pace | SQS | Durable work queue; consumer pulls at its own rate |
| Filter events based on the message body (not just attributes) | EventBridge | SNS filter policies only work on attributes, not body |
| Integrate with SaaS partners (Zendesk, Salesforce) | EventBridge Partner Events | Native SaaS integration without custom webhooks |
| Point-to-point with enrichment and filtering | EventBridge Pipes | Built-in source polling, filtering, enrichment, transformation |
| Schedule tasks (cron or rate) | EventBridge Scheduler | More flexible than cron rules; millions of schedules supported |
| Cross-account event delivery | EventBridge (cross-bus target) | Resource policies on event buses enable cross-account publishing |

**Decision shortcut:** Start with EventBridge if events come from AWS services or need content-based routing. Use SNS when you need simple, fast fan-out. Use SQS when you need durable queuing with a single consumer type.

## How This Connects

- **AWS Lambda:** The most common EventBridge target. Lambda functions are invoked synchronously by EventBridge with the matched event as the payload. Input transformation lets you reshape the event before Lambda receives it, keeping Lambda functions focused on business logic rather than event parsing.
- **AWS Step Functions:** EventBridge can start a Step Functions state machine execution as a target, enabling complex multi-step workflows to be triggered by any event. A CodePipeline failure event, for example, can start a rollback state machine that coordinates multiple remediation steps.
- **Amazon CloudWatch Logs / Metrics:** EventBridge rules can target CloudWatch, and CloudWatch can generate EventBridge events on metric alarms. The two services form a monitoring-and-response loop: CloudWatch detects the condition; EventBridge routes the alarm event to the appropriate remediation target.
- **AWS Organizations (Cross-Account Routing):** In a multi-account organization, a common pattern is to publish all application events to a central event bus in a dedicated integration account using cross-bus targets. The central bus aggregates events from all workload accounts and routes them to monitoring, analytics, and compliance targets — creating a single event fabric across the organization.

## Exam Traps

**Trap 1: Thinking EventBridge filter patterns work the same as SNS filter policies.**
SNS filter policies only filter on message attributes (key-value metadata attached to the message), not on the message body. EventBridge event patterns match against the full event JSON body, including any nested field at any depth. If a scenario says "filter based on the content of the message body," EventBridge is the correct answer; SNS filter policies cannot do this.

**Trap 2: Confusing EventBridge with SNS for fan-out.**
EventBridge is not a simple fan-out service. It excels at routing different event types to different targets. SNS excels at taking one message and delivering it to many subscribers simultaneously (fan-out to SQS queues, Lambda functions, HTTP endpoints, mobile push, email). If the scenario describes "one event goes to many different consumers all at once with the same message," SNS is simpler and more appropriate for that specific pattern.

**Trap 3: Not knowing the 300-rules-per-bus limit.**
Each event bus supports up to 300 rules. In large organizations with many event types, this can be a real constraint. The solution is either to use multiple custom buses or to aggregate events through a single rule that routes to a Lambda function, which then applies more complex routing logic internally.

**Trap 4: Forgetting that EventBridge Pipes are point-to-point, not fan-out.**
A Pipe has exactly one source and one target. If you need to send one event to multiple targets, you still need a standard EventBridge rule with multiple target entries, or you route through an intermediary (like publishing to a bus from a Pipe target, then fanning out with rules). Pipes are designed for pipeline-style enrichment workflows, not distribution.

**Trap 5: Assuming CloudWatch Events and EventBridge are different services.**
They are the same service. EventBridge is the new name, and it uses the same API. If you call `aws events` commands, you are using EventBridge. CloudWatch Events still works but is considered legacy. On exams, "EventBridge" and "CloudWatch Events" are interchangeable when referring to event rules and scheduling.

## Summary

- EventBridge routes events based on content-matching rules applied to the full JSON event body, making it more flexible than SNS filter policies, which only work on message attributes.
- Three bus types exist: the default bus (AWS service events), custom buses (your application events), and partner buses (SaaS integrations).
- Each rule supports up to five targets simultaneously; each event bus supports up to 300 rules; EventBridge retries failed deliveries for up to 24 hours with exponential backoff.
- EventBridge Pipes provide managed point-to-point integration with filtering, enrichment, and transformation between a single source and target, replacing custom Lambda polling code.
- EventBridge is the right choice for event-driven architectures with diverse sources and content-based routing; SNS is for fan-out; SQS is for durable work queues.
- EventBridge replaced CloudWatch Events — both use the `aws events` API and the same underlying service; treat them as identical for exam purposes.

## Examples

**Beginner:** A developer wants to automatically run a Lambda function every night at midnight UTC to generate a daily report. They create an EventBridge rule with the schedule expression `cron(0 0 * * ? *)`, add their Lambda function as the target, and grant EventBridge permission to invoke it with a Lambda resource policy. No code changes are needed — the schedule is entirely defined in the rule configuration.

**Intermediate:** An e-commerce platform has three microservices that each need to react to order events: an inventory service that reserves stock, a notification service that emails customers, and an analytics service that logs the order. Instead of having the order service call all three directly (tight coupling), the order service publishes an `OrderPlaced` event to a custom EventBridge bus. A single EventBridge rule with three targets — one Lambda per service — fans the event out to all three simultaneously. Adding a fourth consumer later requires only adding a new rule target, with zero changes to the order service.

**Advanced:** A large financial services company runs workloads in 12 separate AWS accounts under AWS Organizations. They need a central audit trail of all significant application events across all accounts. In each workload account, they create an EventBridge rule that forwards events matching their compliance taxonomy to an event bus in a central security account using a cross-bus target. The central account's event bus has rules that route events to Kinesis Firehose for long-term S3 archival, to a Security Hub custom findings Lambda for compliance scoring, and to an SQS queue feeding a SIEM system. The Schema Registry in the central account maintains versioned schemas for every event type across the entire organization, giving security engineers typed event definitions for their analysis tooling.

## Think About It

1. A colleague proposes using SNS instead of EventBridge to route application events because "SNS already does pub/sub and we're already using it." What questions would you ask to determine whether EventBridge is actually the better choice for their specific use case?

2. Your application publishes events to a custom EventBridge bus, and you have a rule that routes `OrderPlaced` events to Lambda. Two weeks later you add a new analytics service that also needs to receive `OrderPlaced` events. How do you add the new consumer, and how does this compare to the change you would need to make if you had originally used direct Lambda-to-Lambda calls?

3. EventBridge retries failed target invocations for up to 24 hours. What types of target failures would be safe to retry indefinitely, and what types might cause problems if retried? How would you design your targets to handle duplicate event delivery safely?

4. Consider the cross-account event routing pattern where workload accounts forward events to a central event bus. What are the security implications of this design? Who controls the event bus resource policy, and what could go wrong if that policy is misconfigured?

5. EventBridge Pipes were introduced to replace common Lambda polling patterns. What specific operational burdens does a Pipe eliminate compared to writing your own Lambda function that polls an SQS queue, enriches messages by calling an API, and writes results to DynamoDB?

## Quick Check

**Question 1:** A developer needs to filter incoming SNS messages so that only messages where the JSON body contains `"category": "urgent"` trigger a Lambda function. They try using an SNS filter policy but it does not work. What is the correct explanation and solution?

- A) SNS filter policies support body filtering, but the JSON must be escaped. Fix the escaping and it will work.
- B) SNS filter policies only filter on message attributes, not the message body. Subscribe SQS to SNS, then use EventBridge to read from SQS with a body-based event pattern.
- C) SNS filter policies only filter on message attributes, not the message body. Publish to an EventBridge custom bus instead, where event patterns can match on any field in the event body.
- D) SNS does not support Lambda subscriptions with filtering. Use SQS instead.

**Answer: C** — SNS filter policies can only inspect message attributes (metadata attached to the SNS publish call), not the content of the message body itself. EventBridge event patterns match against the full JSON event body, including any nested field. If the filtering requirement is based on body content, publishing to an EventBridge custom bus and using an event pattern is the correct architectural choice.

---

**Question 2:** You have an EventBridge rule on a custom event bus with five targets: Lambda, SQS, Step Functions, Kinesis, and SNS. An event matches the rule, but the Lambda invocation fails. What happens?

- A) EventBridge rolls back delivery to all five targets
- B) EventBridge retries only the Lambda target with exponential backoff, up to 24 hours; the other four targets received the event successfully and are unaffected
- C) EventBridge retries all five targets simultaneously
- D) EventBridge marks the event as failed and drops it immediately

**Answer: B** — EventBridge delivers to each target independently. A failure for one target does not affect delivery to other targets. EventBridge retries the failed Lambda invocation using exponential backoff for up to 24 hours (or the configured `MaximumEventAgeInSeconds`). If a dead-letter queue is configured for that target, events that exhaust all retries are sent to the DLQ.

---

**Question 3:** Which statement about EventBridge Pipes is accurate?

- A) A Pipe can have multiple sources and one target, enabling event aggregation
- B) A Pipe can have one source and multiple targets, making it equivalent to a rule with multiple targets
- C) A Pipe connects exactly one source to exactly one target, with optional filtering, enrichment, and transformation in between
- D) Pipes replace EventBridge rules entirely and are now the recommended way to handle all EventBridge use cases

**Answer: C** — EventBridge Pipes are strictly point-to-point: one source, one target. Between source and target, a Pipe can apply a filter (to drop unwanted records), an enrichment step (Lambda or API Gateway), and an input transformation. Pipes are designed for pipeline-style workflows — particularly reading from streaming or queue sources — not for fan-out. Standard EventBridge rules with multiple targets remain the correct approach when one event needs to reach multiple destinations.

## What's Next

Next, explore AWS Step Functions, which is one of the most powerful EventBridge targets for complex multi-step workflows. Understanding how EventBridge triggers state machine executions — and how state machines can in turn publish events back to EventBridge — completes the picture of fully event-driven orchestration in AWS serverless architectures.
