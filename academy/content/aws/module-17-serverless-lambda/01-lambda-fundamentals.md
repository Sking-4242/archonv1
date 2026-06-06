---
title: "Lambda Fundamentals: Functions, Triggers, and Runtimes"
type: content
estimated_minutes: 14
cert_tags: ["CLF-C02", "SAA-C03", "SAP-C02"]
---

# Lambda Fundamentals: Functions, Triggers, and Runtimes

## Overview

AWS Lambda is the serverless compute service that lets you run code without provisioning or managing servers. You package your code as a function, configure what event triggers it, and Lambda handles everything else: allocating compute, scaling to meet demand, and shutting down when idle. You pay only for the compute time your function actually uses — billed in 1-millisecond increments — and pay nothing when it is not running.

The design philosophy behind Lambda is that most application code does not need a server running continuously. An image resize operation only needs compute when an image is uploaded. An API handler only needs compute when a request arrives. A data processing job only needs compute during the processing window. Lambda makes that model the default rather than the exception — you define the work, Lambda supplies the compute on demand.

For the SAA exam, Lambda is tested heavily as the compute layer in serverless architectures: what triggers it, how it scales, and how to handle errors. The SAP exam adds concurrency limits, provisioned concurrency design, VPC networking, and Lambda's role in event-driven systems. After this lesson, you will understand how Lambda executes code, how to configure memory and timeout correctly, and how to choose the right trigger type for a given integration pattern.

---

## Core Concepts

### The Execution Model

Lambda runs each function invocation in an isolated **execution environment** — a lightweight virtual machine (powered by AWS Firecracker) that provides a fixed amount of memory, CPU, and ephemeral storage. Each environment runs exactly one invocation at a time.

A **cold start** occurs when Lambda must create a new execution environment to handle an invocation. This initialization phase — downloading and extracting your deployment package, starting the runtime, running any initialization code outside your handler — adds latency ranging from tens of milliseconds (compiled runtimes) to several seconds (large Java or .NET packages). After the handler returns, Lambda may keep the execution environment alive for a period (typically minutes) in case another invocation arrives — this is a **warm** environment. Warm invocations skip the initialization phase.

The practical implication: move expensive initialization (database connections, SDK client creation, loading large configuration files) **outside the handler function**, into module-level code. That initialization runs once during cold start and is reused across all subsequent warm invocations. The handler itself should only contain request-specific logic.

---

### Memory, CPU, and Timeout

Lambda does not let you configure CPU directly. Instead, **memory allocation** controls CPU proportionally. At 1,769 MB of memory, a function receives exactly one full vCPU. At 3,538 MB, two vCPUs. Maximum memory is 10,240 MB (10 GB), providing approximately 6 vCPUs. For CPU-bound tasks, increasing memory reduces execution time and may reduce total cost even though the per-GB-second price stays constant — because the function finishes faster.

Maximum **timeout** is 15 minutes. Set the timeout to slightly above the expected p99 execution time — not to the maximum. An overly generous timeout means stuck invocations consume concurrency for much longer than necessary before timing out, which can exhaust concurrency limits during failures.

**Ephemeral storage** (`/tmp`) provides up to 10 GB per execution environment for temporary file operations. This storage persists across warm invocations within the same execution environment but is not shared across concurrent invocations.

---

### Runtimes and Layers

Lambda supports managed runtimes for: Node.js, Python, Java, Go, Ruby, .NET (C#, F#), and custom runtimes via the **Lambda Runtime API** (any language that can speak the Runtime API protocol). AWS patches and updates managed runtimes; you are responsible for custom runtimes.

**Lambda Layers** are ZIP archives containing shared libraries, dependencies, or configuration. Layers are mounted into the execution environment at `/opt` and can be shared across multiple functions. Common uses: sharing a large dependency package (pandas, numpy, a company-wide logging library) across functions without including it in every deployment package, and distributing configuration or binary utilities. A function can use up to five layers simultaneously.

Layers reduce deployment package size, which speeds up cold starts and simplifies dependency management across a large function portfolio.

---

### Event Sources and Invocation Models

Lambda triggers fall into three invocation models:

**Synchronous**: the caller waits for the function to complete and return a response. API Gateway, ALB, and direct SDK invocations use this model. The caller handles errors — if the function throws, the response contains the error. No automatic retries.

**Asynchronous**: the caller hands the event to Lambda's internal queue and does not wait for a result. S3 event notifications, SNS, EventBridge, and Cognito use this model. Lambda retries failed invocations twice (three attempts total). After all retries are exhausted, the event is sent to a **Dead Letter Queue** (DLQ — an SQS queue or SNS topic) or a **Lambda Destination** (a more flexible routing mechanism that handles both success and failure outcomes).

**Poll-based (streaming/queue)**: Lambda itself polls the source and processes events in batches. DynamoDB Streams, Kinesis Data Streams, SQS, MSK, and self-managed Kafka use this model. Lambda scales the number of concurrent executions based on the number of shards (Kinesis, DynamoDB) or the queue depth (SQS). Failed batch processing behavior depends on the source and bisect-on-error configuration.

---

### Concurrency and Throttling

Lambda **concurrency** is the number of function instances executing simultaneously. Each invocation consumes one unit of concurrency for its duration. The account-level default limit is 1,000 concurrent executions per region (this limit can be raised via a support request).

**Burst scaling rate**: Lambda does not scale to the full concurrency limit instantaneously. When traffic spikes, Lambda adds concurrency in bursts: up to **3,000 new executions in the initial burst** in us-east-1, us-west-2, and eu-west-1; **500 in the initial burst** in all other regions. After the initial burst, Lambda adds up to **500 new concurrent executions per minute** until it reaches the account limit or the reserved concurrency limit. For sudden traffic spikes exceeding this ramp rate, early requests will be throttled. Provisioned concurrency pre-initializes environments ahead of time and avoids this ramp-up entirely.

**Reserved concurrency** allocates a fixed pool of concurrency to a specific function, guaranteeing it is always available and preventing it from consuming other functions' capacity. A function with reserved concurrency of 200 can run at most 200 concurrent executions, and 200 units are always reserved for it (reducing what other functions can use).

**Provisioned concurrency** pre-initializes a specified number of execution environments, keeping them warm and ready to handle invocations instantly. This eliminates cold starts entirely for those environments. Provisioned concurrency has an additional hourly cost but is the correct solution for latency-sensitive APIs that cannot tolerate cold start variability.

Throttled invocations return HTTP 429 (TooManyRequests). Callers should handle throttling with exponential backoff.

---

## Configuration Reference

### Deploying a Lambda Function with Key Settings

```bash
# Create a Lambda function with optimized configuration
aws lambda create-function \
  --function-name prod-image-resizer \
  --runtime python3.12 \
  --role arn:aws:iam::123456789012:role/LambdaExecutionRole \
  --handler image_resizer.handler \
  --zip-file fileb://function.zip \
  --memory-size 1024 \              # 1 GB — provides ~0.58 vCPU
  --timeout 30 \                    # 30-second timeout; set above expected p99
  --environment Variables='{
    "DESTINATION_BUCKET": "prod-resized-images",
    "MAX_WIDTH": "1920",
    "MAX_HEIGHT": "1080",
    "LOG_LEVEL": "INFO"
  }' \
  --ephemeral-storage Size=512 \    # MB of /tmp space; default is 512, max is 10240
  --tracing-config Mode=Active \    # Enable X-Ray active tracing
  --tags Environment=prod,Team=platform

# Retrieve the function ARN for use in triggers and event source mappings
aws lambda get-function-configuration \
  --function-name prod-image-resizer \
  --query 'FunctionArn'
```

---

### Configuring Reserved and Provisioned Concurrency

```bash
# Reserve 200 concurrent executions for this function
# This guarantees availability AND caps usage — other functions cannot use these 200 units
aws lambda put-function-concurrency \
  --function-name prod-image-resizer \
  --reserved-concurrent-executions 200

# Publish a version (required before configuring provisioned concurrency)
aws lambda publish-version \
  --function-name prod-image-resizer

# Configure provisioned concurrency on version 3 — pre-initializes 50 execution environments
# These environments are always warm; zero cold starts for those 50 concurrent slots
aws lambda put-provisioned-concurrency-config \
  --function-name prod-image-resizer \
  --qualifier 3 \                         # version number or alias name
  --provisioned-concurrent-executions 50
  # Provisioned concurrency incurs an additional hourly charge even when idle
  # Use only for latency-sensitive paths (API Gateway + Lambda serving synchronous requests)
```

---

### Configuring a Dead Letter Queue and Destinations

```bash
# Set a DLQ on the function — applies to asynchronous invocations only
aws lambda update-function-configuration \
  --function-name prod-image-resizer \
  --dead-letter-config TargetArn=arn:aws:sqs:us-east-1:123456789012:lambda-dlq

# Configure Lambda Destinations (preferred over DLQ — routes success and failure separately)
aws lambda put-function-event-invoke-config \
  --function-name prod-image-resizer \
  --maximum-retry-attempts 2 \            # Retries for async: 0, 1, or 2 (default 2)
  --maximum-event-age-in-seconds 3600 \   # Discard events older than 1 hour
  --destination-config '{
    "OnSuccess": {
      "Destination": "arn:aws:sqs:us-east-1:123456789012:success-queue"
    },
    "OnFailure": {
      "Destination": "arn:aws:sqs:us-east-1:123456789012:failure-queue"
    }
  }'
  # Destinations support SQS, SNS, EventBridge, and other Lambda functions
  # Destinations include the full invocation record (input + output + metadata)
  # DLQ only receives the original event payload — Destinations provide more context
```

---

### Adding an SQS Event Source Mapping

```bash
# Configure Lambda to poll an SQS queue and process messages in batches
aws lambda create-event-source-mapping \
  --function-name prod-image-resizer \
  --event-source-arn arn:aws:sqs:us-east-1:123456789012:image-upload-queue \
  --batch-size 10 \                        # Process up to 10 messages per invocation
  --maximum-batching-window-in-seconds 30 \ # Wait up to 30s to accumulate a full batch
  --function-response-types ReportBatchItemFailures
  # ReportBatchItemFailures: function reports which items in the batch failed
  # Lambda only re-processes failed items, not the entire batch — prevents poison pill loops
```

---

## How to Decide

| Scenario | Configuration | Reason |
|---|---|---|
| Latency-sensitive synchronous API | Provisioned concurrency + reserved concurrency | Eliminates cold starts; cap prevents runaway scaling |
| Async event processing (S3, SNS) | DLQ or Destinations with retry=2 | Handle transient failures; capture poison pill events |
| Queue-driven processing | SQS event source mapping + ReportBatchItemFailures | Partial batch failures don't replay successful messages |
| Shared library across many functions | Lambda Layer | Single deployment for the dependency; functions stay small |
| Long-running job (> 15 min) | Do not use Lambda | Use ECS Fargate, AWS Batch, or Step Functions |
| Variable CPU needs | Increase memory proportionally | CPU scales with memory; no direct CPU config |
| Code with expensive initialization | Initialize outside handler | Reused across warm invocations; runs once per cold start |

---

## Exam Traps

**Trap 1: "Lambda is billed by the number of invocations only."**
Lambda billing has two components: number of requests and duration (GB-seconds). Duration is memory × execution time, billed in 1-millisecond increments. A function with 1 GB memory running for 100ms costs more than a 128 MB function running for 100ms. Optimizing memory (and thus CPU) affects both performance and cost.

**Trap 2: "Reserved concurrency guarantees performance."**
Reserved concurrency guarantees availability (the pool is always there) and caps usage. It does not eliminate cold starts — a cold start still occurs when a new execution environment is initialized from within that reserved pool. Provisioned concurrency is the feature that eliminates cold starts by pre-initializing environments.

**Trap 3: "Lambda retries automatically for all invocation types."**
Only asynchronous invocations retry automatically (up to 2 times by default). Synchronous invocations (API Gateway, direct SDK calls) do not retry — the caller receives the error and is responsible for retry logic. Poll-based sources (SQS, Kinesis) have their own retry behavior governed by the event source mapping configuration.

**Trap 4: "Increasing timeout improves reliability."**
Setting a long timeout does not fix flaky functions — it delays failure detection. Stuck invocations consume concurrency units for the entire duration of the timeout. The correct approach: set timeout to slightly above the expected p99 execution time, then fix the root cause of timeouts (downstream service calls, network issues, oversized payloads).

**Trap 5: "Ephemeral /tmp storage is shared across concurrent invocations."**
/tmp storage is per execution environment, not shared. Concurrent invocations run in separate environments and cannot read each other's /tmp files. Data written to /tmp by one invocation may persist for subsequent warm invocations in the same environment but is invisible to concurrent invocations.

**Trap 6: "VPC Lambda always has slower cold starts."**
This was true before 2019. AWS redesigned VPC Lambda in 2019 using Hyperplane ENIs, which are pre-allocated and shared across functions in the same VPC/subnet/security group configuration. VPC Lambda cold starts are now comparable to non-VPC Lambda. The old "VPC Lambda is slow" assumption no longer applies to modern Lambda.

---

## Summary

- Lambda executes code in isolated Firecracker microVMs. Cold starts occur on new environment initialization; warm invocations reuse existing environments. Move expensive initialization outside the handler to amortize cold start cost.
- Memory controls CPU proportionally (1,769 MB = 1 vCPU). Increasing memory reduces duration for CPU-bound tasks and may reduce total cost.
- Three invocation models: synchronous (caller handles errors, no retries), asynchronous (Lambda retries twice, DLQ/Destinations capture failures), poll-based (Lambda manages the event source, batch semantics vary by source).
- Concurrency: default account limit is 1,000/region (can be raised). Reserved concurrency guarantees and caps. Provisioned concurrency pre-initializes environments, eliminating cold starts at additional cost.
- Lambda Destinations are preferred over DLQ: they capture both success and failure outcomes with full invocation context. DLQ only captures failure payloads.

---

## Examples

An e-commerce platform receives product image uploads to S3. Each upload triggers an asynchronous Lambda invocation that resizes the image to three resolutions and writes them back to S3. The function is configured with a DLQ and two retry attempts. During a traffic spike, several invocations fail due to a temporary S3 throttle. Lambda retries them automatically. The few that exhaust retries land in the DLQ, where an operator reviews them the next day and replays them. No images are lost, and no manual intervention was needed during the incident.

A financial services API uses API Gateway + Lambda for customer balance lookups. Response time SLA is under 100ms at p99. The team enables provisioned concurrency for 100 execution environments on the production alias. Cold starts are eliminated for the first 100 concurrent requests. Reserved concurrency is set to 500, preventing the function from consuming the entire account concurrency pool during unusual traffic. The team monitors provisioned concurrency utilization in CloudWatch and adjusts the configured amount using Application Auto Scaling tied to a schedule for known traffic patterns.

---

## Think About It

1. A Lambda function connects to an RDS database. Where should the database connection be initialized — inside the handler function or outside it — and why? What happens to that connection across warm invocations?
2. An asynchronous Lambda function processes S3 event notifications. The function has two retry attempts configured. After all retries, events go to an SQS DLQ. What are the possible causes for a message landing in the DLQ, and how would you replay it?
3. A function processes messages from an SQS queue in batches of 10. Occasionally one message in the batch fails processing. Without `ReportBatchItemFailures`, what happens to the other nine messages? With it, what changes?
4. Your team wants to reduce Lambda cold start latency for a customer-facing API. You have two options: use a compiled runtime (Go or Rust) or enable provisioned concurrency with your current Python runtime. What are the trade-offs of each approach?

---

## Quick Check

**Q1.** A Lambda function is invoked synchronously via API Gateway. The function throws an unhandled exception. What happens?

- A) Lambda retries the invocation twice before returning an error to API Gateway
- B) Lambda returns the error to API Gateway immediately with no retries; the caller handles the error
- C) Lambda sends the event to the Dead Letter Queue and returns a 200 OK to API Gateway
- D) Lambda retries once after a 1-second delay

**Answer: B** — Synchronous invocations do not retry. The error is returned directly to the caller (API Gateway), which then returns an appropriate HTTP error response to the client. Automatic retries only apply to asynchronous invocations.

**Q2.** What is the relationship between Lambda memory allocation and CPU?

- A) CPU is configured independently of memory in the Lambda console
- B) CPU is always fixed at 0.5 vCPU regardless of memory setting
- C) Memory and CPU scale proportionally; at 1,769 MB the function receives one full vCPU
- D) Increasing memory above 3 GB disables CPU allocation entirely

**Answer: C** — Lambda allocates CPU proportionally to memory. At 1,769 MB, the function receives one full vCPU. At 3,538 MB, two vCPUs. You cannot configure CPU independently — memory is the only control.

**Q3.** An event source mapping is configured between an SQS queue and a Lambda function with `ReportBatchItemFailures` enabled. The function processes a batch of 10 messages. Messages 3 and 7 fail; the rest succeed. What does Lambda do?

- A) Retries the entire batch of 10 messages
- B) Discards the failed messages and moves on to the next batch
- C) Retries only messages 3 and 7; the other 8 are not re-processed
- D) Sends all 10 messages to the Dead Letter Queue

**Answer: C** — With `ReportBatchItemFailures`, the function returns the message IDs of failed items. Lambda only returns those specific messages to the queue for reprocessing, avoiding duplicate processing of successfully handled messages.

---

## What's Next

Next: Lambda Advanced — VPC networking, Layers deep dive, container image deployments, function URLs, and Lambda@Edge vs. CloudFront Functions.