---
title: "AWS Lambda"
type: content
estimated_minutes: 23
cert_tags: ["CLF-C02", "AIF-C01", "SAA-C03", "SOA-C03", "SCS-C03"]
---

# AWS Lambda

## Overview

AWS Lambda is a serverless compute service that runs your code in response to events without you provisioning or managing servers. You upload a **function**, define what triggers it, and Lambda runs it on demand, scaling automatically from zero to many concurrent executions and charging only for the compute time consumed. This *service reference* lesson covers the execution model, invocation patterns, concurrency and scaling, configuration limits, security, and what each certification expects.

Lambda matters because it embodies the serverless model: no servers to patch or scale, automatic high availability across AZs, and pay-per-use billing measured in milliseconds. It is the glue of event-driven architectures — transforming S3 uploads, reacting to GuardDuty findings, backing API Gateway endpoints, processing streams, and running scheduled jobs. The key mental model is that a Lambda function is **stateless and event-driven**: each invocation handles one event in an isolated, ephemeral environment, and you must not rely on local disk or in-memory state persisting between invocations (though a *warm* environment may be reused, which is why module-level initialization is cached).

---

## How It Works

A function consists of your **code** (in a managed runtime — Python, Node.js, Java, .NET, Go, Ruby — or a custom runtime / container image up to 10 GB), a **handler** entry point, and configuration (memory, timeout, IAM execution role, environment variables, optional VPC networking, layers). When a trigger fires, Lambda creates or reuses an isolated **execution environment**, runs the handler with the event payload, and returns the result.

Invocation comes in three patterns, and knowing them is central:

- **Synchronous** (API Gateway, ALB, `Invoke` calls) — the caller waits for the response; errors return to the caller, who handles retries.
- **Asynchronous** (S3, SNS, EventBridge) — the event is queued by Lambda, which **retries failed invocations** (default twice) and can send failures to a **dead-letter queue** or an **on-failure destination**.
- **Event source mapping / poll-based** (SQS, Kinesis, DynamoDB Streams, MSK) — Lambda **polls** the source and invokes the function in **batches**, with stream sources processing per shard in order and retrying the batch.

**Scaling** is automatic: Lambda runs one execution environment per concurrent invocation, scaling up rapidly to an account **concurrency limit** (default 1,000, adjustable). **Cold starts** occur when a new environment must be initialized (download code, start runtime, run init); **provisioned concurrency** keeps environments pre-warmed for latency-sensitive paths, and **SnapStart** reduces Java cold starts via a snapshot.

---

## Key Features

- **Memory and proportional CPU.** Memory is configurable from 128 MB to 10 GB, and **CPU scales with memory** — so adding memory can make a function finish faster (and sometimes cheaper). Timeout is up to **15 minutes**.
- **Execution role** — an IAM role giving the function temporary credentials to call AWS services; the security boundary of the function.
- **Resource-based policy** — controls *who/what may invoke* the function (the other half of its permissions).
- **Layers** to share dependencies, and **container image** packaging for large or custom runtimes.
- **Environment variables** (optionally KMS-encrypted) and **secrets** referenced from Secrets Manager/Parameter Store rather than hard-coded.
- **Concurrency controls** — **reserved concurrency** caps and guarantees a function's share; **provisioned concurrency** pre-warms environments.
- **Ephemeral storage** (`/tmp`, configurable up to 10 GB) and **destinations/DLQs** for async outcomes.

---

## Configuration Reference

- **Tune memory and timeout** as the primary performance/cost knobs; profile to find the cost-optimal memory.
- **VPC configuration.** A function can run in your VPC to reach private resources (RDS, ElastiCache); Lambda uses Hyperplane ENIs for efficient networking, but reaching the internet or AWS public APIs from a VPC-attached function requires a **NAT gateway or VPC endpoints**.
- **Two-sided permissions.** The **execution role** governs what the function can do; the **resource-based policy** governs who can invoke it — both must be correct.
- **Idempotency.** With at-least-once sources (SQS, async retries, stream retries), design handlers to tolerate duplicate delivery.

---

## Operations and Troubleshooting

- **Monitoring.** Lambda emits CloudWatch metrics — `Invocations`, `Errors`, `Duration`, `Throttles`, `ConcurrentExecutions`, `IteratorAge` (stream lag) — and logs to **CloudWatch Logs**; **AWS X-Ray** traces execution. Rising `Throttles` means you hit a concurrency limit; rising `IteratorAge` means stream processing is falling behind.
- **Cold starts.** Mitigate with provisioned concurrency, smaller deployment packages, lean VPC networking, and SnapStart for Java.
- **Errors and retries.** Sync errors return to the caller; async invocations retry then go to a DLQ/destination; poll-based sources retry the batch and can block a shard on a poison message (use bisect-on-error and a failure destination). 
- **Throttling.** Raise the account limit, use **reserved concurrency** to protect critical functions, and remember downstream throttling (a database or API) often surfaces as Lambda errors/timeouts rather than Lambda's own limits.

---

## Integrations

Lambda is the event-driven core of serverless AWS: triggered by **S3**, **API Gateway**, **EventBridge**, **SNS**, **SQS**, **Kinesis**, **DynamoDB Streams**, **Cognito**, **ALB**, and more; assuming an **IAM** role for permissions; reading secrets from **Secrets Manager**; running inside a **VPC** when needed; logging to **CloudWatch**; traced by **X-Ray**; and orchestrated by **Step Functions**. It is the standard tool for **automated remediation** (reacting to Config/GuardDuty/Security Hub findings via EventBridge) and a common piece of AI pipelines (pre/post-processing, orchestration glue, lightweight inference).

---

## Pricing and Cost Considerations

Lambda charges for the **number of requests** and for **compute duration** measured in **GB-seconds** (configured memory × execution time), with a generous perpetual free tier; ephemeral storage above the included amount and provisioned concurrency add charges. Because you pay only while code runs, idle functions cost nothing. The main cost levers are right-sizing memory (more memory may finish faster, sometimes lowering total GB-second cost), reducing duration and unnecessary invocations, and avoiding always-on provisioned concurrency unless latency demands it. For steady, high-volume, long-running compute, EC2/containers are often cheaper; for spiky, event-driven, or bursty work, Lambda usually wins. Exact prices vary by Region and architecture (arm64/Graviton is typically cheaper).

---

## Exam Relevance

**CLF-C02:** Know Lambda as serverless, event-driven compute with no servers to manage and pay-per-use billing, and the serverless value proposition. Foundational.

**AIF-C01:** Know Lambda as serverless glue for orchestrating AI/ML pipelines and lightweight inference around services like Bedrock and SageMaker. Conceptual.

**SAA-C03:** Know event-driven architectures, the three invocation patterns, concurrency/cold starts and provisioned concurrency, VPC access (and the NAT/endpoint requirement), memory-CPU scaling, and Lambda vs. EC2/containers trade-offs. Design depth.

**SOA-C03:** Operate functions — the key metrics (Throttles, IteratorAge), DLQs/destinations, reserved concurrency, and automated remediation workflows. Operations depth.

**SCS-C03:** Secure functions — least-privilege execution roles, resource-based invoke policies, KMS-encrypted environment variables, Secrets Manager references, VPC isolation, and GuardDuty Lambda Protection. Security depth.

---

## Summary

AWS Lambda runs stateless, event-driven functions without server management, scaling automatically and billing per request and per GB-second. Functions are invoked synchronously (caller waits), asynchronously (Lambda queues and retries, with DLQ/destinations), or via poll-based event source mappings (batched, ordered per shard for streams); secured by a least-privilege execution role plus a resource-based invoke policy; configured with memory (which scales CPU), up to a 15-minute timeout, environment variables, and optional VPC networking (needing NAT/endpoints for outbound). Concurrency limits, cold starts (mitigated by provisioned concurrency/SnapStart), and idempotency for at-least-once sources are the recurring exam themes. Lambda is the connective compute of serverless and event-driven AWS, ideal for spiky workloads and automation, with EC2/containers preferred for steady long-running compute.

---

## Quick Check

1. What does "stateless and event-driven" mean for Lambda, and what may still be reused between warm invocations?
2. Name the three invocation patterns, give a trigger for each, and state how failures are handled in each.
3. What is a cold start, and what three techniques reduce its impact?
4. Which two distinct permission mechanisms govern a function, and what does each control?
5. A VPC-attached function can't reach the internet or an AWS public API — what is missing, and which metric reveals a function falling behind on a stream?

---

## What's Next

Pair this with **Amazon API Gateway** (HTTP front end), **Amazon SQS/SNS** and **EventBridge** (event sources and automation), **AWS Step Functions** (orchestration), and **AWS Secrets Manager** (secret references).
