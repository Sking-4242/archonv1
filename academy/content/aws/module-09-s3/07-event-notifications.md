---
title: "S3 Event Notifications"
type: content
estimated_minutes: 12
cert_tags: ["SAA-C03", "DVA-C02"]
---

# S3 Event Notifications

## Overview

S3 buckets are not just passive storage — they are event sources. Every object creation, deletion, or restore operation can trigger downstream processing automatically through S3 event notifications. This turns S3 into the first link in an event-driven pipeline: a file lands, a function runs, a queue receives a message, an ETL job starts. No polling loops, no schedulers, no idle compute waiting for work to arrive.

There are two ways to configure S3 event notifications. The original approach configures notifications directly on the bucket and sends events to one of three destinations: Lambda, SQS, or SNS. This is simple and low-latency but limited — each bucket can have at most one notification per destination type per event type, routing logic is minimal, and there is no replay capability. The newer approach routes all S3 events through Amazon EventBridge, which unlocks content-based filtering (filter on any field in the event JSON, not just prefix/suffix), routing to any of EventBridge's dozens of supported targets, event archiving for compliance, and replay for re-processing historical events. For new architectures, EventBridge is the recommended approach.

S3 Object Lambda extends this concept in a different direction. Rather than reacting to events after an object is stored, S3 Object Lambda intercepts GET requests and lets a Lambda function transform the object in-flight before returning it to the caller. The caller sees a modified version of the object — redacted, enriched, format-converted — without the original ever changing and without storing multiple transformed copies. These three patterns (direct notifications, EventBridge routing, Object Lambda) together make S3 a programmable data platform, not just a storage service.

## Core Concepts

### Event Types

S3 event notifications fire on three categories of operations:

- **`s3:ObjectCreated:*`** — any write: Put, Post, Copy, CompleteMultipartUpload. You can subscribe to all with the wildcard or to specific subtypes like `s3:ObjectCreated:Put`.
- **`s3:ObjectRemoved:*`** — any delete: Delete (permanent) or DeleteMarkerCreated (versioned delete). Note: `s3:ObjectRemoved:Delete` fires when a specific version is permanently deleted; `s3:ObjectRemoved:DeleteMarkerCreated` fires when a delete marker is added to a versioned object.
- **`s3:ObjectRestore:*`** — Glacier restore: `s3:ObjectRestore:Post` (restore initiated), `s3:ObjectRestore:Completed` (restore finished and temporary copy is available).

Additional event types exist for replication, lifecycle transitions, and intelligent-tiering transitions but appear less frequently on exams.

### Notification Destinations (Direct Method)

**Lambda**: The most common choice for immediate processing. S3 invokes the Lambda function synchronously (from S3's perspective — the invocation itself is asynchronous to the S3 operation). Good for lightweight, fast processing like thumbnail generation, metadata extraction, or routing logic. Risk: if a massive upload burst (10,000 files at once) triggers 10,000 concurrent Lambda invocations, you may hit the account's Lambda concurrency limit and throttle.

**SQS**: Buffers the events in a queue. Downstream consumers drain the queue at whatever pace they can handle. Good for workloads where processing order matters, where the processing rate must be controlled, or where the processing system (e.g., a fleet of EC2 workers) cannot absorb arbitrary bursts. The queue absorbs spikes; the consumer processes at a steady rate.

**SNS**: Fan-out pattern. One S3 event triggers an SNS topic which delivers to all subscribers simultaneously — multiple Lambda functions, multiple SQS queues, email endpoints. Use when one S3 event must trigger multiple different downstream systems.

### Amazon EventBridge Integration

Enable EventBridge on an S3 bucket with a single API call, and all S3 events flow to the default event bus in real-time. From there, EventBridge rules route events to targets based on content-based filters — you can match on any field in the event JSON, including the object key, storage class, object size, or event source.

EventBridge advantages over direct notifications:
- Route to any of 20+ supported targets: Step Functions, API Gateway, Kinesis, Firehose, another EventBridge bus (cross-account), ECS tasks, etc.
- Content-based filtering on any event field
- Event archive: store all events in an archive for compliance or debugging
- Event replay: re-process archived events against updated rules or new targets
- Schema discovery: EventBridge automatically infers and registers the event schema

EventBridge disadvantage: slightly higher latency than direct Lambda invocation (typically < 1 second additional, but measurable). For sub-second reaction requirements, direct Lambda notification is faster.

### Prefix and Suffix Filters

Both direct notifications and EventBridge rules support key filtering. Direct notifications support prefix and suffix filters — for example, only fire on keys that start with `uploads/` and end with `.jpg`. A single notification rule can have at most one prefix and one suffix filter. You cannot use wildcards in the middle of a key pattern with direct notifications (e.g., `uploads/*/raw.jpg` is not supported — use EventBridge for that level of filtering).

### At-Least-Once Delivery

S3 event notifications guarantee at-least-once delivery. In rare circumstances, an event may be delivered more than once. Your Lambda functions, SQS consumers, and EventBridge targets must be idempotent — processing the same event twice must not cause double processing, double charges, or data corruption. Common patterns: check if output already exists before writing (conditional PUT), use a database transaction with a unique constraint on the event ID, or use S3 object ETags to detect re-processing.

### S3 Object Lambda

Object Lambda intercepts GET requests on an S3 Object Lambda Access Point and invokes a Lambda function to transform the object before returning it to the caller. The Lambda receives the original object (or a presigned URL to fetch it), transforms it, and writes the result to the response stream. The original object in S3 is never modified.

Use cases:
- **PII redaction**: Return the object with sensitive fields masked, based on the caller's IAM identity
- **Format conversion**: Store CSV, return JSON (or Parquet) without storing duplicate copies
- **Dynamic watermarking**: Embed caller identity into returned images
- **Row-level filtering**: Return only the rows the caller is authorized to see from a shared dataset

Object Lambda Access Points sit in front of regular access points. The caller accesses the Object Lambda Access Point ARN; the Lambda function accesses the supporting regular access point to fetch the original object.

## Configuration Reference

### Enable EventBridge Notifications (Recommended)

```bash
# Enable EventBridge integration on a bucket
# This sends ALL S3 events to the default event bus — no per-event-type selection
aws s3api put-bucket-notification-configuration \
  --bucket my-bucket \
  --notification-configuration '{
    "EventBridgeConfiguration": {}
  }'
# That's it — an empty EventBridgeConfiguration object enables the integration
# Events now appear on the default event bus in the same account and region

# Verify EventBridge is enabled
aws s3api get-bucket-notification-configuration \
  --bucket my-bucket
```

```json
// EventBridge rule to match S3 ObjectCreated events on a specific prefix
// eventbridge-rule.json
{
  "source": ["aws.s3"],
  "detail-type": ["Object Created"],
  "detail": {
    "bucket": {
      "name": ["my-bucket"]
      // Only match events from this specific bucket
    },
    "object": {
      "key": [{ "prefix": "uploads/raw/" }]
      // Only match keys that start with uploads/raw/
      // EventBridge supports prefix, suffix, equals, wildcard — much richer than direct notifications
    }
  }
}
```

```bash
# Create the EventBridge rule targeting a Step Functions state machine
aws events put-rule \
  --name "s3-upload-processing" \
  --event-pattern file://eventbridge-rule.json \
  --state ENABLED

# Add a Step Functions state machine as the target
aws events put-targets \
  --rule "s3-upload-processing" \
  --targets '[{
    "Id": "StepFunctionsTarget",
    "Arn": "arn:aws:states:us-east-1:123456789012:stateMachine:UploadProcessing",
    "RoleArn": "arn:aws:iam::123456789012:role/EventBridgeInvokeStepFunctions"
  }]'
```

### Direct Notifications — Lambda, SQS, and SNS

```json
// bucket-notification-config.json
// Configures Lambda, SQS, and SNS destinations simultaneously
{
  "LambdaFunctionConfigurations": [
    {
      "Id": "thumbnail-generator",
      "LambdaFunctionArn": "arn:aws:lambda:us-east-1:123456789012:function:ThumbnailGenerator",
      "Events": ["s3:ObjectCreated:*"],
      // Trigger on any creation event (Put, Copy, CompleteMultipartUpload)
      "Filter": {
        "Key": {
          "FilterRules": [
            { "Name": "Prefix", "Value": "uploads/" },
            // Only keys under the uploads/ prefix
            { "Name": "Suffix", "Value": ".jpg" }
            // AND keys that end in .jpg
          ]
        }
      }
    }
  ],

  "QueueConfigurations": [
    {
      "Id": "etl-queue",
      "QueueArn": "arn:aws:sqs:us-east-1:123456789012:ETLQueue",
      "Events": ["s3:ObjectCreated:Put"],
      // Only direct PUT events — not Copy or CompleteMultipartUpload
      "Filter": {
        "Key": {
          "FilterRules": [
            { "Name": "Prefix", "Value": "data/incoming/" },
            { "Name": "Suffix", "Value": ".csv" }
          ]
        }
      }
    }
  ],

  "TopicConfigurations": [
    {
      "Id": "compliance-fanout",
      "TopicArn": "arn:aws:sns:us-east-1:123456789012:ComplianceTopic",
      "Events": ["s3:ObjectCreated:*", "s3:ObjectRemoved:*"],
      // Both creates and deletes go to the compliance SNS topic
      "Filter": {
        "Key": {
          "FilterRules": [
            { "Name": "Prefix", "Value": "sensitive/" }
          ]
        }
      }
    }
  ]
}
```

```bash
# Apply the notification configuration to the bucket
aws s3api put-bucket-notification-configuration \
  --bucket my-bucket \
  --notification-configuration file://bucket-notification-config.json

# IMPORTANT: Before applying, the Lambda function needs a resource-based policy
# allowing S3 to invoke it. Without this, the notification is saved but Lambda
# invocations will fail with access denied.
aws lambda add-permission \
  --function-name ThumbnailGenerator \
  --statement-id "s3-invoke-permission" \
  --action "lambda:InvokeFunction" \
  --principal "s3.amazonaws.com" \
  --source-arn "arn:aws:s3:::my-bucket" \
  --source-account "123456789012"
# source-account prevents confused deputy attacks from other accounts' S3 buckets
```

### S3 Object Lambda Access Point Setup

```bash
# Step 1: Create a regular (supporting) access point
aws s3control create-access-point \
  --account-id 123456789012 \
  --name my-supporting-access-point \
  --bucket my-bucket

# Step 2: Create the Object Lambda Access Point
aws s3control create-access-point-for-object-lambda \
  --account-id 123456789012 \
  --name my-object-lambda-ap \
  --configuration '{
    "SupportingAccessPoint": "arn:aws:s3:us-east-1:123456789012:accesspoint/my-supporting-access-point",
    "TransformationConfigurations": [
      {
        "Actions": ["GetObject"],
        "ContentTransformation": {
          "AwsLambda": {
            "FunctionArn": "arn:aws:lambda:us-east-1:123456789012:function:PIIRedactor",
            "FunctionPayload": "{\"redactFields\": [\"ssn\", \"creditCard\"]}"
            // Optional JSON payload passed to every Lambda invocation
          }
        }
      }
    ]
  }'

# Callers GET from the Object Lambda Access Point ARN — not the bucket directly
# The Lambda function receives a WriteGetObjectResponse callback URL to write the transformed object
```

```python
# Lambda function structure for S3 Object Lambda
import boto3
import json

s3 = boto3.client("s3")

def lambda_handler(event, context):
    # Fetch the original object using the presigned URL provided by S3
    object_get_context = event["getObjectContext"]
    request_route = object_get_context["outputRoute"]
    request_token = object_get_context["outputToken"]
    s3_url = object_get_context["inputS3Url"]  # Presigned URL to the original object

    # Download and transform
    import urllib.request
    response = urllib.request.urlopen(s3_url)
    original = response.read().decode("utf-8")

    # Example transformation: redact a field
    data = json.loads(original)
    data["ssn"] = "***-**-****"
    transformed = json.dumps(data)

    # Write transformed content back to the caller via the WriteGetObjectResponse API
    s3.write_get_object_response(
        Body=transformed,
        RequestRoute=request_route,
        RequestToken=request_token,
        ContentType="application/json"
    )
    return {"statusCode": 200}
```

## How to Decide

| Requirement | Recommended Approach | Why |
|---|---|---|
| Single downstream action (e.g., thumbnail generation) | Direct Lambda notification | Simplest, lowest latency, fewest moving parts |
| Must buffer bursts and control processing rate | Direct SQS notification | Queue absorbs spikes; consumer drains at own pace |
| One S3 event must trigger multiple systems | SNS fan-out or EventBridge | SNS is simpler for fan-out; EventBridge adds filtering and more targets |
| Complex routing logic, many targets, content-based filtering | EventBridge | Richest filtering, most target types, archive + replay |
| Compliance: must archive all events for 90 days | EventBridge + archive | Direct notifications have no replay capability |
| Transform objects on-the-fly for different consumers | S3 Object Lambda | Single stored copy; transform per-caller without duplicating data |
| Re-process historical events after a bug fix | EventBridge replay | Replay archived events against updated rules |
| Sub-100ms reaction time matters | Direct Lambda notification | Avoids the EventBridge routing hop |

## How This Connects

- **S3 Performance (Lesson 06)**: A burst upload of thousands of objects in seconds will trigger thousands of notifications simultaneously. Understanding Lambda concurrency limits and the SQS buffering pattern connects directly to the multipart upload and prefix distribution concepts from Lesson 06.
- **S3 Access Points (Lesson 08)**: S3 Object Lambda Access Points build on the regular access point infrastructure. Understanding access points (Lesson 08) provides the foundation for understanding how Object Lambda intercepts GET requests.
- **Lambda (Module 11)**: The Lambda execution model — concurrency, throttling, retry behavior — determines whether direct S3-to-Lambda notifications are safe under load or need SQS as a buffer.
- **EventBridge (Module 14)**: S3 EventBridge integration is one entry point into the broader EventBridge event-driven architecture pattern. The same EventBridge rules, targets, archives, and replays work the same way regardless of whether the event came from S3, EC2, or a custom application.
- **SQS (Module 13)**: Choosing SQS as the S3 notification destination means the SQS consumer design (visibility timeout, dead-letter queues, message retention) is directly responsible for processing reliability. An SQS DLQ catches messages that fail processing after N retries, preventing silent data loss.

## Exam Traps

1. **"S3 event notifications guarantee exactly-once delivery."** False. S3 guarantees at-least-once delivery. Events can occasionally be delivered more than once. Lambda functions and SQS consumers must be idempotent. Exam questions sometimes test whether you know this distinction.

2. **"EventBridge and direct Lambda notifications can coexist on the same bucket."** True, but understanding the interaction matters. If you configure both a direct Lambda notification and enable EventBridge, the same event can fire both. If your Lambda and your EventBridge target both perform the same action, you get double processing. Design deliberately.

3. **"You can filter on any part of the key path with direct notifications."** False. Direct notifications support only a single prefix and/or a single suffix per rule. You cannot filter on middle segments of a key path (e.g., match `uploads/*/processed/*.jpg`). For complex key matching, EventBridge's content-based filtering is required.

4. **"S3 Object Lambda transforms the original stored object."** False. Object Lambda intercepts the GET response and transforms the data in-flight. The original object in S3 is never modified. The transformation is per-request and per-caller — different callers can receive different transformations of the same underlying object.

5. **"SQS can receive S3 notifications without any queue policy changes."** False. S3 must be authorized to send messages to the SQS queue. The queue's access policy must include a statement granting `sqs:SendMessage` to the S3 service principal, scoped to the specific source bucket ARN. Without this, the notification is saved but message delivery fails silently.

## Summary

- S3 event notifications fire on ObjectCreated, ObjectRemoved, and ObjectRestore events. Destinations are Lambda (immediate invocation), SQS (buffered queue), and SNS (fan-out) for direct notifications, plus EventBridge for flexible routing.
- EventBridge is the recommended modern approach: richer content-based filtering, more target types, event archive and replay, schema discovery.
- Direct notifications support prefix and suffix key filters only; EventBridge supports arbitrary JSON content matching.
- S3 guarantees at-least-once delivery — consumers must be idempotent to handle duplicate events safely.
- S3 Object Lambda intercepts GET requests on an Object Lambda Access Point and transforms data in-flight via a Lambda function, without modifying the stored original.
- Lambda resource-based policies and SQS queue policies must explicitly grant S3 permission to invoke/enqueue — missing these permissions is the most common configuration failure.

## Examples

A photo-sharing startup needs to generate three thumbnail sizes whenever a user uploads a new photo. They configure a direct S3 event notification so that every `s3:ObjectCreated:*` event on the `uploads/` prefix triggers a Lambda function. The Lambda reads the original image, resizes it, and writes thumbnails to a `thumbnails/` bucket. During off-hours when no uploads occur, there is zero compute cost — no idle server, no polling loop. During peak hours when users upload thousands of photos per minute, Lambda scales concurrently to match the load. The team set a reserved concurrency limit on the thumbnail function to prevent S3 upload bursts from consuming the entire account's Lambda concurrency and impacting other services.

A large e-commerce company ingests order CSV files from hundreds of regional warehouses throughout the day. Processing order matters — files from each warehouse must be processed sequentially. They route `s3:ObjectCreated:Put` events on the `incoming/` prefix to an SQS queue instead of Lambda directly. The queue buffers bursts when many warehouses upload simultaneously. A fleet of EC2 workers drains the queue at a controlled rate, one file at a time per worker per warehouse. They configured a dead-letter queue so that files that fail processing after three attempts are routed to a quarantine queue rather than being dropped. The visibility timeout is set to 10 minutes — longer than any successful processing run — so a worker crash does not cause a file to be processed twice without being intentional.

A security team at a fintech company needs to scan every uploaded object for PII before allowing downstream consumers to access it. They enable Amazon EventBridge on the bucket. An EventBridge rule routes all `Object Created` events to a Step Functions state machine that: (1) invokes an Amazon Macie classification job, (2) waits for the result via a callback token, (3) either tags the object `pii:clean` and moves it to the approved prefix, or moves it to a quarantine prefix and alerts the security team via SNS. They archive all S3 events to EventBridge for 365 days. When a PII detection rule is improved, they replay the archived events for the past 30 days against updated rules to retroactively scan objects that were classified before the improvement — a capability that direct Lambda notifications could never provide.

## Think About It

1. S3 event notifications guarantee at-least-once delivery — an event may fire twice in rare cases. Design a Lambda function for thumbnail generation that is safe to invoke twice for the same S3 object. What check would you add at the start of the function to make it idempotent?

2. A direct Lambda notification fires immediately on object creation. An EventBridge rule adds a small routing hop. In what real-world scenario would that latency difference matter enough to choose direct Lambda notification over EventBridge, even though EventBridge is more feature-rich?

3. S3 Object Lambda transforms objects in-flight per GET request. How would you use this to implement row-level security — returning only the rows a caller is authorized to see from a shared CSV file? What information from the GET request would you use to determine which rows to include?

4. A team configures both a direct Lambda notification and EventBridge on the same bucket for the same event type. What happens when an object is created? How would you audit whether this is causing duplicate processing, and how would you fix it?

5. Your S3 notification triggers a Lambda that writes results to DynamoDB. The Lambda fails halfway through processing, is retried by S3, and processes the same event again. What DynamoDB write pattern would ensure the second invocation does not create duplicate records or overwrite valid partial results with incorrect data?

## Quick Check

**Q1.** Which S3 event notification destination is best for buffering a high-volume burst of object creations and processing them at a controlled rate?
- A) Lambda
- B) SNS
- C) SQS
- D) EventBridge

**Answer: C** — SQS decouples the event production rate from the processing rate. The queue absorbs upload bursts and lets consumers drain at a controlled pace. Lambda invokes immediately and may hit concurrency limits under a large burst; SNS fans out but does not buffer; EventBridge routes but does not buffer.

**Q2.** What does S3 Object Lambda allow that standard S3 GetObject does not?
- A) Download objects faster using Transfer Acceleration
- B) Intercept GET requests and transform the object in-flight via a Lambda function before returning it to the caller
- C) Read objects from multiple buckets in a single API call
- D) Automatically compress objects before returning them

**Answer: B** — S3 Object Lambda intercepts GET requests on an Object Lambda Access Point and invokes a Lambda function to transform the response in-flight. The original stored object is never modified. The transformation is per-request and can vary by caller identity, parameters, or any other logic.

**Q3.** What is the recommended approach for routing S3 events to multiple AWS services with content-based filtering and event replay capability?
- A) Configure multiple direct S3 event notifications, one per destination service
- B) Use SNS fan-out from a single S3 notification
- C) Enable Amazon EventBridge integration on the S3 bucket and use EventBridge rules
- D) Write a Lambda function that manually fans out events to downstream services

**Answer: C** — Amazon EventBridge integration sends all S3 events to an event bus where content-based filtering rules route events to any supported target. EventBridge also provides event archiving and replay — capabilities that direct notifications, SNS fan-out, and manual Lambda fan-out do not offer.

## What's Next

Next up: S3 Access Points — named network endpoints that simplify per-team access management for shared datasets, VPC-restricted access, and Multi-Region Access Points for global routing.
