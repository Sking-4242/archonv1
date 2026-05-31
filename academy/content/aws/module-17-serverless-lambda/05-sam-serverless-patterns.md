---
title: "AWS SAM and Serverless Application Patterns"
type: content
estimated_minutes: 8
cert_tags: ["DVA-C02", "SAA-C03"]
---

# AWS SAM and Serverless Application Patterns

## Overview

The AWS Serverless Application Model (SAM) is an open-source framework that extends CloudFormation to simplify defining serverless applications. SAM transforms concise YAML definitions into full CloudFormation resources, and the SAM CLI enables local testing before deployment.

## SAM Template Syntax

SAM adds four resource types: AWS::Serverless::Function (Lambda + trigger + IAM role), AWS::Serverless::Api (API Gateway), AWS::Serverless::SimpleTable (DynamoDB table), and AWS::Serverless::StateMachine (Step Functions). A function with an API trigger in SAM is ~10 lines vs. 100+ lines of CloudFormation. SAM deploys via `sam deploy` which calls CloudFormation under the hood. SAM also supports nested apps from the Serverless Application Repository.

## SAM CLI and Local Testing

`sam local start-api` runs API Gateway and Lambda locally using Docker containers matching the Lambda runtime. `sam local invoke` runs a single function with a test event. `sam local generate-event` generates sample event payloads for S3, SQS, DynamoDB, etc. This lets you develop and test Lambda functions without deploying to AWS — critical for rapid iteration. `sam pipeline init` generates CI/CD pipeline definitions for CodePipeline or GitHub Actions.

## Common Serverless Patterns

REST API: API Gateway HTTP API → Lambda → DynamoDB (read/write) with Secrets Manager for any third-party credentials. Async processing: SQS → Lambda (batch processing) → DynamoDB + SNS notification. Event-driven pipeline: S3 event → Lambda → Step Functions → multiple downstream services. Scheduled jobs: EventBridge scheduled rule → Lambda. Fanout: SNS → multiple SQS queues → Lambda consumers. These patterns are the building blocks of virtually every serverless application on AWS.

## Serverless vs. Containers

Lambda: event-driven, auto-scaling to zero, 15-minute max runtime, no server management. ECS/EKS: long-running processes, persistent connections, stateful workloads, over 15 minutes, full control over runtime environment. Choose Lambda for short-lived event-driven tasks; choose containers for always-on services, large memory/CPU needs (>10 GB), or complex dependencies that don't fit Lambda layers. Many architectures use both: Lambda for API handlers, ECS for background workers.

## Summary

SAM simplifies serverless development with concise templates and local testing via Docker. The SAM CLI reduces the deploy-test-fix cycle. Core serverless patterns (REST API, async queue processing, event-driven fanout) solve 80% of serverless architecture problems. Choose Lambda for short event-driven tasks; containers for long-running stateful workloads.

## Examples

A developer building a personal side project uses SAM to define a REST API backed by Lambda and DynamoDB in about 30 lines of YAML. Running `sam local start-api` spins up both services locally using Docker, letting them test the full request path without an AWS account or incurring any costs. When ready, `sam deploy --guided` walks through the first deployment interactively. This illustrates SAM's core value proposition: a dramatically shorter definition and a fast local iteration loop that mirrors the real Lambda runtime.

A mid-size e-commerce company receives large batches of order CSV files from wholesale partners every night via S3. Their architecture follows the async processing pattern: S3 event → Lambda (parses CSV and sends individual order records to SQS) → Lambda (processes each SQS message, writes to DynamoDB, sends SNS confirmation). The two Lambda functions are each defined as `AWS::Serverless::Function` resources in a single SAM template. Each function is decoupled through the queue, so a downstream slowdown does not block the ingest step — a direct application of the fanout and async queue pattern.

A platform engineering team needs to decide whether to migrate their monolithic Java REST service (which holds WebSocket connections, runs background threads, and uses 8 GB of heap) to Lambda. They map the workload against the Lambda/container decision criteria from this lesson: persistent connections (Lambda cannot hold them), background threads (not supported), memory requirement of 8 GB (exceeds Lambda's 10 GB limit only at peak, but the always-on nature of WebSockets rules it out anyway). They keep the service on ECS Fargate. They do migrate the image thumbnail generation and email notification workflows to Lambda. This illustrates that the Lambda-vs-containers decision is workload-specific and the two often coexist in the same application.

## Think About It

1. SAM templates are transformed into CloudFormation before deployment. What are the implications of this for debugging? If a `sam deploy` fails, where would you look first, and what information might be obscured by the transformation layer?
2. `sam local start-api` runs Lambda in a Docker container matching the real runtime. What categories of bugs would local testing catch reliably, and what categories might only surface in a real AWS deployment?
3. The fanout pattern (SNS → multiple SQS queues → multiple Lambda consumers) decouples producers from consumers. What trade-offs does this introduce compared to a producer calling each downstream service directly? When does the added complexity pay off?
4. How would you decide whether a 12-minute batch processing job belongs on Lambda (using its 15-minute maximum) or on ECS Fargate? What factors beyond the timeout would you consider?
5. Your team is designing a new feature and has proposed three approaches: a Lambda function called directly by the frontend, a Lambda function behind API Gateway, and an ECS service behind an ALB. What questions would you ask to determine which architecture fits the requirements?

## Quick Check

**Q1.** A developer runs `sam local start-api` to test a Lambda function locally. Which underlying technology does SAM use to replicate the Lambda execution environment?

- A) A lightweight Python subprocess that mimics the Lambda handler contract
- B) Docker containers configured to match the Lambda runtime environment
- C) A CloudFormation stack deployed to a sandbox AWS account
- D) An EC2 instance pre-installed with the Lambda runtime agent

**Answer: B** — SAM local commands use Docker to pull and run the official Lambda runtime images, creating an environment that closely matches what will run in AWS and allowing local invocation without deployment.

**Q2.** Which serverless pattern would you use when a single upstream event (such as a new order) needs to trigger multiple independent downstream systems (inventory, billing, shipping) without any of them blocking the others?

- A) REST API pattern: API Gateway → Lambda → DynamoDB
- B) Fanout pattern: SNS → multiple SQS queues → multiple Lambda consumers
- C) Scheduled job pattern: EventBridge rule → Lambda
- D) Async processing pattern: single SQS queue → single Lambda function

**Answer: B** — The fanout pattern uses SNS to broadcast a single message to multiple SQS queues, each consumed independently by a dedicated Lambda function, ensuring no consumer blocks another and each can scale and fail independently.

**Q3.** A workload requires persistent TCP connections to clients, runs continuously (not event-driven), and uses 12 GB of memory. Which compute option is most appropriate?

- A) Lambda with Provisioned Concurrency to keep environments warm
- B) Lambda with a 15-minute timeout and recursive self-invocation
- C) ECS or EKS, because the workload requires always-on persistent connections and exceeds Lambda's constraints
- D) Lambda with a custom runtime and a Lambda Extension to manage connections

**Answer: C** — Lambda cannot maintain persistent TCP connections (environments are recycled), is not designed for always-on workloads, and has a 10,240 MB memory ceiling. ECS/EKS handles long-running, stateful, high-memory workloads correctly.

## What's Next

Next up: the Module 17 Canvas Labs — design a serverless API architecture.