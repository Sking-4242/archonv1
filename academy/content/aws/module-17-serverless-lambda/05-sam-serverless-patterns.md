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

## What's Next

Next up: the Module 17 Canvas Labs — design a serverless API architecture.