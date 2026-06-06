---
title: "AWS X-Ray: Distributed Tracing"
type: content
estimated_minutes: 12
cert_tags: ["SAA-C03", "SAP-C02"]
---

# AWS X-Ray: Distributed Tracing

## Overview

CloudWatch metrics tell you that error rates are rising. CloudWatch Logs tell you which service logged an error. Neither tells you what the request was doing for the 800 milliseconds before the error, which downstream service it called, or how long each step took. In a distributed architecture with multiple services, identifying where latency comes from or which service is causing failures requires a different tool: distributed tracing. AWS X-Ray provides that — it follows a single request as it flows through your application, recording timing and outcome at each service boundary.

The problem distributed tracing solves is causality in complex systems. When five services handle a request in sequence, and one of them is slow, log files from each service show that service's perspective — but correlating those five logs by request ID, rebuilding the timeline, and identifying which service actually caused the delay is manual, slow work. X-Ray automates this: it generates a unique trace ID for each request, passes it through service boundaries, and assembles a visual timeline — the **Service Map** — showing every service involved, how long each took, and where errors occurred.

For the SAA exam, understand traces, segments, subsegments, the Service Map, and sampling. The SAP exam adds custom sampling rules, annotations and metadata for trace filtering, X-Ray Groups for scoping analysis, and AWS Distro for OpenTelemetry (ADOT) as the recommended instrumentation approach for new services. After this lesson, you will be able to instrument a Lambda-based microservices application with X-Ray and use the Service Map to diagnose a latency regression.

---

## Core Concepts

### Traces, Segments, and Subsegments

A **trace** is the complete record of a single request's journey through your application. Each trace has a unique ID — a trace header (`X-Amzn-Trace-Id`) that services pass to each other in HTTP requests or message metadata, so X-Ray can stitch together the full path.

Each service that handles the request creates a **segment** — a record of that service's contribution to handling the request. A segment captures: the service name, start and end time, HTTP status code, any errors or faults, and whether the request was throttled.

Within a segment, **subsegments** record individual operations: a DynamoDB `GetItem` call, an HTTP call to a downstream service, an SQS `SendMessage`, a custom code block you want to time. Subsegments are where most diagnostic value lives — they tell you exactly which database query took 400 ms, which external API call failed, or how long a specific function ran.

**Annotations** are indexed key-value pairs you add to traces for filtering — `userId=abc123`, `orderType=premium`, `featureFlag=newCheckout`. Annotations appear in the X-Ray filter expression language, enabling you to find all traces for a specific user or a specific feature flag value. **Metadata** is similar but not indexed — useful for storing debugging context that you don't need to search on.

---

### The Service Map

The X-Ray **Service Map** is a real-time visual graph of your application's architecture as seen through trace data. Every service that handles traced requests appears as a node; every call between services appears as an edge. Each node and edge shows: average latency, error rate, fault rate, and throughput.

The Service Map makes a class of problems immediately visible that would otherwise require hours of log correlation:
- A single downstream service with a 40% error rate that causes cascading failures upstream
- An external API call that adds 600 ms to every request that reaches it
- A service that appears healthy in CloudWatch (CPU normal, no alarms) but is consistently timing out when called by a specific upstream service

The Service Map is interactive: clicking any node filters to the traces that passed through that service. You can drill into specific traces to see the full waterfall timeline of every segment and subsegment.

---

### Sampling

X-Ray does not record every request by default — high-traffic applications could generate billions of trace records per day, which is expensive and unnecessary for most analysis. **Sampling** controls what fraction of requests are traced.

The **default sampling rule** records the first request each second plus 5% of subsequent requests — the "reservoir + rate" model. This ensures coverage even at low traffic while keeping costs manageable at high traffic.

**Custom sampling rules** let you tune this per service, per URL, per HTTP method, and per other request attributes. The most powerful pattern: trace 100% of error requests, 0.1% of successful requests. You capture all failure signal while sampling healthy traffic aggressively. Custom rules apply to all instrumented services without code changes — they are centrally managed in the X-Ray console.

Sampling rules are evaluated in priority order. The first matching rule's reservoir and rate apply. A rule with priority 1 matching error requests takes precedence over the default rule.

---

### Instrumentation: SDK, Daemon, and ADOT

X-Ray instrumentation has two layers. The **X-Ray SDK** (available for Node.js, Python, Java, Go, .NET, Ruby) runs inside your application code and captures segment data, instruments AWS SDK calls automatically, and propagates the trace header to downstream services. The SDK sends trace data as UDP packets to a local agent.

The **X-Ray daemon** (or sidecar) receives those UDP packets from the SDK, buffers them, and batches HTTPS calls to the X-Ray API — decoupling the application from the network overhead of sending traces. On EC2, the daemon runs as a background process. On ECS, it runs as a sidecar container. On EKS, it runs as a DaemonSet.

**AWS Distro for OpenTelemetry (ADOT)** is the recommended approach for new services. ADOT is AWS's distribution of the OpenTelemetry collector — an open-source, vendor-neutral tracing and metrics standard. Instrumenting with ADOT means your traces can be sent to X-Ray, Prometheus, Jaeger, or any other OpenTelemetry-compatible backend without changing application code. This portability matters when you want to avoid lock-in or when you're running a mix of AWS and on-premises services.

Lambda supports X-Ray tracing with a single configuration setting — no daemon required, as Lambda manages the tracing infrastructure automatically.

---

## Configuration Reference

### Enabling X-Ray on Lambda and ECS

```bash
# Enable X-Ray active tracing on a Lambda function
aws lambda update-function-configuration \
  --function-name my-api-handler \
  --tracing-config Mode=Active \   # Active = sample and send traces; PassThrough = propagate header only
  --region us-east-1

# X-Ray is now active — no SDK changes required for basic tracing.
# For subsegments and annotations, add the 