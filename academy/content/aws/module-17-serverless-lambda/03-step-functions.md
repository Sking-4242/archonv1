---
title: "AWS Step Functions: Serverless Orchestration"
type: content
estimated_minutes: 10
cert_tags: ["SAA-C03", "DVA-C02"]
---

# AWS Step Functions: Serverless Orchestration

## Overview

Complex workflows with branching, retries, parallel execution, and long-running processes shouldn't be built as tangled Lambda functions calling each other. Step Functions is a serverless visual workflow orchestrator that manages state, handles errors, and coordinates services into reliable, auditable pipelines.

## State Machine Concepts

A Step Functions state machine is a JSON (or YAML via AWS SAM) definition of a workflow consisting of states. State types: Task (invoke a Lambda, ECS task, DynamoDB API, HTTP call, or other service), Choice (branching based on data), Wait (pause for a duration or timestamp), Parallel (run branches concurrently), Map (iterate over an array), Pass (transform data without calling a service), Succeed, and Fail. Each state transitions to the next until a terminal state (Succeed, Fail) is reached.

## Express vs. Standard Workflows

Standard workflows: durable execution up to 1 year, exactly-once execution, full audit history visible in the console for 90 days. Best for long-running processes, human approval steps, and workflows that need full execution history. Express workflows: high-throughput, at-least-once execution, up to 5 minutes, logs go to CloudWatch. Best for high-volume event processing, IoT pipelines, streaming data enrichment. Cost: Standard charges per state transition; Express charges by duration and invocations.

## Error Handling and Retries

Step Functions has built-in retry logic per state with configurable retry attempts, backoff rate, and interval. Catch blocks handle specific error types (States.TaskFailed, specific Lambda exception classes) and transition to error-handling states. This eliminates boilerplate try-catch-retry code from your Lambda functions — each function does one thing, and the state machine handles orchestration and error recovery.

## Service Integrations

Step Functions integrates with 200+ AWS services without Lambda intermediaries using optimized integrations. You can invoke a Lambda, call DynamoDB APIs, start an ECS task, send an SQS message, call an HTTP endpoint (Express workflows), or run an Athena query directly from a state machine task definition — reducing Lambda functions to only where custom business logic is needed. This simplifies architectures significantly.

## Summary

Step Functions orchestrates complex workflows with built-in retry, branching, parallelism, and error handling. Standard workflows for durable long-running processes; Express for high-throughput short pipelines. 200+ direct service integrations eliminate many Lambda passthrough functions. Use Step Functions whenever you have multi-step processes with error handling, long durations, or human approval steps.

## What's Next

Next up: API Gateway — building managed HTTP APIs for Lambda and other backends.