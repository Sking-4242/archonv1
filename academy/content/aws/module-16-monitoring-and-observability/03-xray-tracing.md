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

## What's Next

Next up: CloudWatch Synthetics and RUM — proactive monitoring before users notice problems.