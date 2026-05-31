---
title: "AWS X-Ray: Distributed Tracing"
type: content
estimated_minutes: 8
cert_tags: ["SAA-C03", "DVA-C02"]
---

# AWS X-Ray: Distributed Tracing

## Overview

In a microservices architecture, a single user request may touch dozens of services. When something is slow or broken, pinpointing the culprit is difficult with logs alone. AWS X-Ray provides distributed tracing — following a request across services to visualize its path, timing, and errors.

## Traces, Segments, and Subsegments

A trace represents the full path of a request through your system. Each service that handles the request creates a segment (with service name, timing, HTTP status, errors). Within a service, subsegments break down the time spent in specific operations (DB queries, external HTTP calls, custom functions). The X-Ray SDK automatically instruments AWS SDK calls and HTTP clients; you add annotations and metadata for custom context.

## Service Map

X-Ray renders a visual service map showing all services involved in handling requests, with response times, error rates, and throughput for each connection. This is the fastest way to identify which service in a chain is introducing latency or errors. Hover on any node to drill into traces for that service. Filter by annotation, user, URL, or error type.

## Sampling Rules

X-Ray does not trace every request — it samples. The default rule traces the first request per second plus 5% of subsequent requests. Custom sampling rules let you trace 100% of error requests and 1% of successful requests — maximizing signal for debugging without overloading the tracing backend. Configure sampling rules in the X-Ray console; they apply to all instrumented services without code changes.

## X-Ray Integration

X-Ray integrates natively with Lambda (traces function invocations with one checkbox), API Gateway (traces API calls), ALB, ECS, EC2 (via X-Ray daemon), AppMesh, and SNS/SQS (trace propagation through queues). The X-Ray daemon runs as a sidecar (ECS), DaemonSet (EKS), or background process (EC2) and batches trace data before sending to X-Ray. For containerized workloads, AWS Distro for OpenTelemetry (ADOT) is the recommended collector — it supports X-Ray, Prometheus, and other backends.

## Summary

X-Ray provides end-to-end distributed tracing for microservices. Traces map request flow; segments and subsegments break down timing. The service map visualizes the dependency graph with performance data. Use sampling rules to balance trace coverage with cost. For new services, use AWS Distro for OpenTelemetry — it's compatible with X-Ray and portable to other backends.

## Examples

A B2C retail company migrated a monolith to five microservices: an API gateway, product catalog, inventory, pricing, and cart service. After go-live, checkout latency spiked intermittently but no single service's CPU looked unusual. By enabling X-Ray across all five services (one checkbox in Lambda, daemon sidecar in ECS), their service map immediately revealed that 90% of the latency budget was being consumed by the pricing service making a synchronous call to an external tax API. Without the trace visualization, correlating that cause across five services' logs would have taken hours. This is X-Ray's core value proposition: turning a "something is slow" signal into a pinpointed bottleneck.

A gaming company running a high-traffic leaderboard API wanted to trace errors without drowning in trace data during peak usage (millions of requests per minute). They configured a custom X-Ray sampling rule: 100% sampling for any request resulting in a 5xx error, and 0.5% sampling for successful requests. During a production incident, every failed request was captured in full detail while background noise from healthy traffic remained minimal. This demonstrates how custom sampling rules let teams maximize debugging signal while controlling cost and data volume.

A platform engineering team building a new data pipeline used AWS Distro for OpenTelemetry (ADOT) instead of the native X-Ray SDK. By instrumenting with OpenTelemetry, they could send traces to X-Ray for AWS-native viewing AND simultaneously export the same traces to their existing Grafana Tempo instance on-premises — without changing application code. This illustrates the strategic value of ADOT: vendor-portable instrumentation that avoids lock-in while still leveraging AWS-native services.

## Think About It

1. Why is a visual service map more useful than reading raw logs from each service individually when diagnosing latency in a chain of five microservices?
2. What trade-offs do you accept when you set sampling to 100% for all requests? Think about cost, storage, performance overhead, and data completeness.
3. How would you decide whether to use subsegments versus annotations in X-Ray when you want to add context to a trace — and what is the functional difference between the two?
4. If X-Ray shows that 80% of your request latency is spent in a downstream DynamoDB call, but DynamoDB's own CloudWatch metrics look healthy, what might explain the discrepancy and how would you investigate further?
5. What would happen to your tracing continuity if one service in a five-service chain is NOT instrumented with X-Ray — how does that affect the trace and the service map?

## Quick Check

**Q1.** In X-Ray terminology, what does a "segment" represent?
- A) The full end-to-end path of a request through all services
- B) A specific operation within a service, such as a database query
- C) The work performed by a single service while handling a request, including timing and status
- D) A sampling rule that determines which requests are traced

**Answer: C** — A segment is created by each service in the call chain and captures that service's contribution to handling the request, including start/end time, HTTP status, and any errors.

**Q2.** What is the default X-Ray sampling behavior?
- A) 100% of all requests are traced
- B) No requests are traced unless a custom rule is defined
- C) The first request each second plus 5% of subsequent requests are traced
- D) Requests are traced only when they result in an error

**Answer: C** — X-Ray's default reservoir-based sampling traces the first request per second and 5% of additional requests, balancing observability coverage with backend cost.

**Q3.** Which component is responsible for batching and forwarding trace data from an ECS task to the X-Ray service?
- A) The X-Ray SDK embedded in the application code
- B) The X-Ray daemon running as a sidecar container
- C) The CloudWatch Agent installed on the container host
- D) An EventBridge rule that triggers on trace events

**Answer: B** — The X-Ray daemon (or ADOT collector) runs alongside the application as a sidecar, receives UDP trace segments from the SDK, batches them, and forwards them to the X-Ray API — reducing the number of HTTPS calls the application itself must make.

## What's Next

Next up: CloudWatch Synthetics and RUM — proactive monitoring before users notice problems.