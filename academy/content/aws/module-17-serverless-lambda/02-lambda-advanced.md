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

## Examples

A healthcare SaaS company stores patient data in an RDS PostgreSQL instance inside a private VPC subnet. Their Lambda functions that query patient records are configured to run inside the same VPC, with a security group that only allows traffic to the RDS security group on port 5432. They also place RDS Proxy in front of RDS because Lambda's auto-scaling can create hundreds of concurrent database connections, which would exhaust PostgreSQL's connection limit — a textbook application of VPC Lambda combined with RDS Proxy.

A logistics company built an async image-processing pipeline where Lambda functions analyze shipment photos and update a tracking database. Initially, failures were silently lost. They migrated from DLQ-based error handling to Lambda Destinations: on success, the result payload is routed to an EventBridge bus that triggers downstream enrichment; on failure, the full event and error details land in SQS for triage. The result payload forwarding — which DLQs cannot do — was the decisive factor in choosing Destinations.

A high-traffic recommendation engine runs Lambda at 2 million invocations per day, costing more than expected. An engineer ran Lambda Power Tuning and found the function was configured at 128 MB (the minimum) but was CPU-bound on JSON serialization. At 512 MB, execution time dropped from 800 ms to 210 ms; total cost at 512 MB was actually 15% lower than at 128 MB because the faster execution more than offset the higher per-ms memory price — illustrating the non-obvious cost-performance relationship that Power Tuning reveals.

## Think About It

1. Why does AWS recommend always placing RDS Proxy between a Lambda function and an RDS database, even if your Lambda functions have low concurrency today?
2. What trade-offs exist between handling errors inside a Lambda function with try/catch versus delegating all error routing to Lambda Destinations? In what situation would you choose the in-function approach?
3. A Lambda Extension adds 200 ms to every cold start by initializing a telemetry agent. How would you evaluate whether that trade-off is worth it, and what Lambda configuration would reduce the frequency of that cost?
4. If Lambda Power Tuning shows that 3,008 MB is the cheapest configuration for your function, what concerns might you still have before blindly applying that setting in production?
5. Your Lambda function runs in a VPC and needs to call the AWS Secrets Manager API. What networking decision must you make, and what are the two options with different cost and latency profiles?

## Quick Check

**Q1.** A Lambda function configured for VPC access needs to query an RDS database. Why should you place RDS Proxy between them?

- A) RDS Proxy encrypts traffic between Lambda and RDS, which direct connections do not
- B) Lambda auto-scaling can create many short-lived connections that exhaust RDS connection limits; RDS Proxy pools and reuses connections
- C) Direct Lambda-to-RDS connections are not supported without RDS Proxy
- D) RDS Proxy reduces cold start time by pre-warming Lambda ENIs

**Answer: B** — Each Lambda instance opens its own database connection; when Lambda scales out rapidly, hundreds of connections can overwhelm RDS, which has a finite connection limit. RDS Proxy multiplexes those connections.

**Q2.** What capability does Lambda Destinations provide that a Dead Letter Queue (DLQ) cannot?

- A) Routing failed events to multiple SQS queues simultaneously
- B) Forwarding the function's response payload to the next step on both success and failure
- C) Retrying failed invocations automatically with exponential backoff
- D) Encrypting event payloads before routing them to downstream services

**Answer: B** — Destinations pass the function's actual response payload to the configured target, enabling downstream services to act on the result; DLQs only capture the original failed event without the function's output.

**Q3.** Lambda Power Tuning reveals that increasing memory from 128 MB to 512 MB reduces execution time from 900 ms to 300 ms. Given that Lambda pricing is based on GB-seconds, what is the most accurate conclusion?

- A) The higher memory setting always costs more because memory price is higher
- B) You cannot determine cost without knowing the number of invocations
- C) The 512 MB setting may actually cost less because the 3x speed reduction can outweigh the 4x memory increase
- D) The optimal setting is always the one with the lowest execution time

**Answer: C** — Lambda charges GB-seconds (memory × duration); if execution time drops faster than memory increases, the total GB-second cost decreases. This is exactly what Power Tuning is designed to find.

## What's Next

Next up: Lambda@Edge and CloudFront Functions — running compute at the CDN edge.