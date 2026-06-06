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
    "DESTINATION_BUC