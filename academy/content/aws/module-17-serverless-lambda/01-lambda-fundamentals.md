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

## What's Next

Next up: Lambda with VPC, environment variables, and advanced configuration.