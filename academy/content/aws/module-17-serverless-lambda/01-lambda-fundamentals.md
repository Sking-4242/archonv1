---
title: "Lambda Fundamentals: Functions, Triggers, and Runtimes"
type: content
estimated_minutes: 10
cert_tags: ["SAA-C03", "DVA-C02", "CLF-C02"]
---

# Lambda Fundamentals: Functions, Triggers, and Runtimes

## Overview

AWS Lambda is the foundational serverless compute service — you upload code, configure a trigger, and Lambda runs your function in response to events without provisioning or managing servers. You pay only for compute time consumed (in 1ms increments) and never for idle time. This lesson covers the Lambda execution model, runtimes, and event sources.

## The Lambda Execution Model

Lambda functions run in isolated execution environments (micro-VMs using AWS Firecracker). Each invocation may reuse an existing warm execution environment or start a new one (cold start). A warm environment reuses the initialized runtime and any initialized global variables, database connections, and cached data — this is the motivation for moving expensive initialization outside the handler function. Cold starts add 100ms to seconds of latency depending on runtime and package size.

## Runtimes and Layers

Lambda supports: Node.js, Python, Java, Go, Ruby, .NET, and custom runtimes via the Runtime API. Each runtime has a managed version (AWS patches it) and custom runtime options. Lambda Layers are ZIP archives containing shared libraries, dependencies, or configuration. Layers mount into the execution environment and can be shared across multiple functions — useful for large dependency packages (e.g., pandas, numpy) to keep your deployment package small and speed up cold starts.

## Memory, CPU, and Timeout

Lambda allocates CPU proportionally to memory. At 1,769 MB, a function gets 1 full vCPU; at 3,548 MB, 2 vCPUs. For CPU-bound workloads, increasing memory reduces execution time (and may reduce cost). Maximum memory is 10,240 MB; maximum timeout is 15 minutes. For tasks longer than 15 minutes, use Step Functions or ECS. Configure the timeout to slightly above the expected p99 execution time — not to the maximum.

## Event Sources and Triggers

Lambda integrates with: API Gateway and ALB (synchronous HTTP trigger), S3 (asynchronous event notification), DynamoDB Streams and Kinesis (stream polling), SQS (queue polling with automatic scaling), SNS (push-based async), EventBridge (event bus rules), Cognito, IoT, and more. Synchronous invokes return a response; asynchronous invokes (S3, SNS, EventBridge) buffer events and retry on failure. For async invokes, configure a Dead Letter Queue (SQS or SNS) to capture failed events.

## Concurrency and Throttling

Lambda scales automatically by running more concurrent instances of your function. The account default concurrency limit is 1,000 concurrent executions per region (can be raised). Reserve concurrency sets a maximum for a specific function, ensuring other functions have capacity. Provisioned Concurrency pre-initializes execution environments, eliminating cold starts — use for latency-sensitive API functions. Throttled invocations return HTTP 429; handle this in callers with exponential backoff.

## Summary

Lambda runs code in response to events without servers. The execution model: cold starts are expensive, keep initialization outside the handler. Memory controls CPU allocation. Concurrency scales automatically up to account limits; use reserved concurrency to protect critical functions. Async triggers use DLQs for error capture. Lambda is the compute layer for serverless architectures.

## Examples

A small e-commerce startup uses Lambda to resize product images immediately after a merchant uploads them to S3. When a file lands in the S3 bucket, an event notification triggers the Lambda function, which reads the original image, creates thumbnail versions, and writes them back. The team pays nothing when no uploads are happening — illustrating Lambda's event-driven, pay-per-invocation model and the S3 async trigger.

A mid-size fintech company processes real-time payment authorization requests through an API Gateway → Lambda chain. Because authorization must complete in under 200 ms, their team discovered that cold starts on their Python function with large dependencies were occasionally breaching SLA. They moved heavy imports outside the handler and enabled Provisioned Concurrency on the function, eliminating cold starts for their latency-sensitive path — a direct application of the execution model and concurrency configuration concepts.

A media streaming platform uses a single Lambda function for video metadata lookups that runs at roughly 50,000 req/min during peak hours. An engineering review found the function was being throttled during traffic spikes because a separate, low-priority batch job was consuming most of the account's 1,000-unit concurrent execution limit. By setting reserved concurrency on the batch function to cap it at 100, they protected the API function — demonstrating why reserved concurrency exists not just to limit a function, but to protect others.

## Think About It

1. Why does moving database connection initialization outside the Lambda handler improve performance, and under what circumstances could it actually cause a problem?
2. What would happen if you set a Lambda function's timeout to the maximum 15 minutes for a task that normally completes in 3 seconds? What are the cost and reliability implications?
3. How would you decide whether to use reserved concurrency versus provisioned concurrency for a latency-sensitive API endpoint? What information would you need?
4. An asynchronous Lambda triggered by S3 fails three times and the events land in the DLQ. What trade-offs exist between processing DLQ messages immediately versus batching them for reprocessing later?
5. If two different teams share the same AWS account and one team's Lambda workload unexpectedly consumes the full 1,000-unit concurrency limit, what options does the other team have — and what does this suggest about account-level architecture decisions?

## Quick Check

**Q1.** A Lambda function that processes uploaded files is experiencing latency spikes on the first invocation after a period of inactivity. What is the most likely cause?

- A) The function's reserved concurrency is set too low
- B) A cold start is occurring because the execution environment was recycled
- C) The function's memory is undersized, causing CPU throttling
- D) The S3 event notification is delayed by eventual consistency

**Answer: B** — Cold starts happen when Lambda must initialize a new execution environment after one has been recycled due to inactivity, adding latency before the handler even runs.

**Q2.** You increase a Lambda function's memory from 512 MB to 1,769 MB. What else changes automatically?

- A) The maximum timeout increases from 5 minutes to 15 minutes
- B) The function gains access to a dedicated VPC
- C) CPU allocation scales proportionally, giving the function one full vCPU
- D) The function is automatically assigned a reserved concurrency of 1

**Answer: C** — Lambda allocates CPU proportionally to memory; at 1,769 MB the function receives exactly one full vCPU, which can dramatically speed up CPU-bound workloads.

**Q3.** Which invocation model requires configuring a Dead Letter Queue to capture events that fail all retry attempts?

- A) Synchronous (API Gateway trigger)
- B) Asynchronous (S3 or SNS trigger)
- C) Stream polling (Kinesis trigger)
- D) SQS queue trigger

**Answer: B** — Asynchronous invocations buffer events and retry on failure; a DLQ (SQS or SNS) captures events that exhaust all retries so they are not silently lost.

## What's Next

Next up: Lambda with VPC, environment variables, and advanced configuration.