---
title: "Lambda Advanced: VPC, Destinations, and Power Tuning"
type: content
estimated_minutes: 10
cert_tags: ["SAA-C03", "DVA-C02"]
---

# Lambda Advanced: VPC, Destinations, and Power Tuning

## Overview

Beyond the basics, Lambda has important configuration options that affect security, performance, and reliability: VPC placement for private resource access, Destinations for async success/failure routing, and the Lambda Power Tuning tool for cost/performance optimization.

## Lambda in VPC

By default, Lambda functions run in an AWS-managed VPC and cannot access resources in your private VPC (like RDS, ElastiCache). To connect, configure the Lambda function to run inside your VPC — specify subnets and a security group. Lambda creates ENIs (Hyperplane ENIs) that connect the function to your VPC. Cold starts with VPC were historically slow (ENI creation) but since 2019, Hyperplane ENIs are pre-allocated and shared — VPC Lambda cold starts are now comparable to non-VPC. Always use RDS Proxy between Lambda and RDS to manage connection pooling.

## Lambda Destinations

For asynchronous invocations, Lambda Destinations route the result (success or failure) to a target service. On success: another Lambda, SQS, SNS, or EventBridge. On failure: same targets. This is the modern replacement for DLQ — Destinations give you more flexibility and pass the function's response payload to the next step. Use Destinations to build reliable async pipelines without custom error handling code in each function.

## Lambda Power Tuning

Lambda Power Tuning is an open-source AWS Step Functions state machine that runs your function at multiple memory configurations in parallel, measures execution time and cost, and produces a cost/performance curve. The optimal memory setting is often not the minimum (slower execution costs more total) or maximum (fast but over-allocated). Run Power Tuning for any Lambda function that runs frequently or has high compute requirements. Available via AWS Serverless Application Repository.

## Lambda Extensions

Lambda Extensions are companion processes that run alongside your function code in the same execution environment. Use extensions for: telemetry collection (Datadog Lambda Extension, Dynatrace, Splunk), secret caching (AWS Parameters and Secrets Lambda Extension caches SSM and Secrets Manager values), and security scanning. Extensions receive lifecycle events (Init, Invoke, Shutdown) and can perform work asynchronously while the function handler processes requests.

## Summary

VPC Lambda provides private network access — use RDS Proxy for database connections. Destinations replace DLQs for flexible async pipeline routing. Power Tuning finds the optimal memory-cost tradeoff. Extensions enable observability agents and secret caching without modifying function code. These configurations are required for production-grade Lambda deployments.

## What's Next

Next up: Lambda@Edge and CloudFront Functions — running compute at the CDN edge.