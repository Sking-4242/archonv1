---
title: "Amazon API Gateway"
type: content
estimated_minutes: 19
cert_tags: ["AIF-C01", "SAA-C03", "SOA-C03", "SCS-C03"]
---

# Amazon API Gateway

## Overview

Amazon API Gateway is a fully managed service for creating, publishing, securing, and operating APIs at any scale. It acts as the front door for clients to reach backend logic — Lambda functions, HTTP services, or other AWS services — handling authorization, throttling, caching, request validation, and observability so your backends don't have to. This *service reference* lesson covers the API types, integrations, authorization, deployment stages, security, and what each certification expects.

API Gateway matters because exposing a backend directly to clients means re-implementing authentication, rate limiting, input validation, and observability for every service. API Gateway centralizes those concerns at the edge of your API, and it pairs naturally with Lambda to build fully serverless backends with no servers to manage. The core mental model is that API Gateway receives client requests, applies request/response processing and security, and **integrates** with a backend that does the actual work, exposing the result through versioned **stages**.

---

## How It Works

API Gateway offers a few API types, and choosing among them is a frequent decision:

- **REST APIs** — full-featured: request/response transformation (mapping templates), API keys and **usage plans**, response **caching**, request validation, WAF integration, and edge/regional/private endpoints. Use when you need those capabilities.
- **HTTP APIs** — lower-latency, lower-cost, simpler APIs for proxying to Lambda or HTTP backends, with built-in JWT/OIDC auth. The modern default when advanced REST-only features aren't needed.
- **WebSocket APIs** — persistent, bidirectional connections for real-time apps (chat, notifications).

Each API has **routes/resources and methods** mapped to **integrations** — **Lambda proxy** (the common serverless pattern), **HTTP** backends, or direct **AWS service** integrations (e.g., put a message to SQS without a Lambda). Requests flow through **stages** (deployment environments like `dev`/`prod`), where throttling, caching, logging, and stage variables are configured. **Mapping templates** (VTL) transform requests/responses on REST APIs.

---

## Key Features

- **Authorization options** — **IAM** (SigV4, for service-to-service), **Amazon Cognito** user pools, **JWT authorizers** (HTTP APIs), and **Lambda authorizers** (custom token or request-based logic), plus **resource policies** to restrict by source IP, VPC, or account.
- **Throttling and usage plans** — account/stage/method rate and burst limits, and **API keys** tied to per-client quotas and throttles to protect backends and meter usage.
- **Caching** (REST) — cache responses at the stage (with TTL and per-key invalidation) to cut backend load and latency.
- **Request validation and transformation** — validate query/headers/body against models and map formats between client and backend.
- **Endpoint types** — edge-optimized (via CloudFront), regional, or **private** (reachable only from a VPC via interface endpoints).
- **Custom domains** with ACM certificates, plus canary release deployments.

---

## Configuration Reference

- **Pick the API type** — HTTP API for simple/low-cost Lambda or HTTP proxying; REST API when you need API keys, response caching, mapping templates, or request validation; WebSocket for real-time.
- **Choose authorization** — Cognito or a JWT/Lambda authorizer for end-user auth; IAM for service-to-service; resource policies to restrict source.
- **Set throttling and usage plans** to protect backends; enable caching on read-heavy REST endpoints.
- **Enable logging** (access and execution logs to CloudWatch) and **X-Ray** tracing; use stages and canary deployments for safe rollout.

---

## Operations and Troubleshooting

- **403/401 errors.** Check the authorizer (Cognito/JWT/Lambda/IAM), the **resource policy**, and API key/usage-plan configuration; a missing or misconfigured authorizer is the usual cause.
- **5xx from integration.** Inspect the backend (Lambda errors/timeouts, HTTP origin health) and the integration timeout (REST integration timeout is bounded); enable execution logging to see the mapped request.
- **Throttling (429).** Adjust stage/method or usage-plan limits, or account quotas; throttling deliberately protects backends from overload.
- **Monitoring.** CloudWatch metrics (`Count`, `Latency`, `IntegrationLatency`, `4XXError`, `5XXError`), access/execution logs, and X-Ray traces diagnose most issues.

---

## Integrations

API Gateway commonly fronts **AWS Lambda** (the serverless API pattern) and HTTP backends, can integrate directly with **AWS services** (SQS, SNS, Step Functions, DynamoDB), authorizes with **Amazon Cognito**/JWT/**Lambda authorizers** and **IAM**, protects with **AWS WAF** (REST/regional) and **Shield**, terminates TLS with **ACM**, can be **private** via VPC interface endpoints, and observes with **CloudWatch** and **X-Ray**. For AI applications, it is a typical secured front end for invoking inference or orchestration backends.

---

## Pricing and Cost Considerations

API Gateway charges per **API call/request**, with **HTTP APIs notably cheaper** than REST APIs, plus charges for optional **caching** (provisioned cache size, REST only) and data transfer. The cost levers are choosing HTTP APIs when you don't need REST-only features, enabling caching to offload backends, and using usage plans to control call volume and protect downstream costs. WebSocket APIs are billed by messages and connection-minutes. Exact prices vary by API type and Region.

---

## Exam Relevance

**AIF-C01:** Know API Gateway as a managed, secured front door for exposing application/AI backends with auth and throttling. Conceptual.

**SAA-C03:** Know REST vs. HTTP vs. WebSocket selection, Lambda proxy integration for serverless APIs, direct AWS-service integrations, authorization options, caching, throttling/usage plans, and private APIs. Design depth.

**SOA-C03:** Operate APIs — stages and canary deployments, throttling, logging/metrics, and troubleshooting 4xx/5xx and 429. Operations depth.

**SCS-C03:** Secure APIs — Cognito/JWT/Lambda authorizers, IAM, resource policies (source/VPC restriction), WAF, private endpoints, and TLS. Security depth.

---

## Summary

Amazon API Gateway is a managed front door for APIs that handles authorization, throttling, caching, validation, and observability so backends don't have to. REST APIs offer the richest features (mapping templates, API keys/usage plans, response caching, request validation), HTTP APIs are the lower-cost low-latency default with built-in JWT auth, and WebSocket APIs enable real-time communication. Routes map to integrations (commonly Lambda proxy, or direct AWS-service integrations), secured by Cognito, JWT/Lambda authorizers, or IAM and resource policies, protected by WAF, deployed through stages with canary releases, and monitored via CloudWatch and X-Ray. The recurring exam points are REST-vs-HTTP selection, the authorization options, and usage plans/throttling to protect backends.

---

## Quick Check

1. When would you choose an HTTP API over a REST API, and what REST-only features might force the choice back?
2. Name four ways to authorize requests to an API Gateway endpoint.
3. How do usage plans, API keys, and throttling protect and meter your backend?
4. How do you make an API reachable only from within your VPC?
5. Which metrics distinguish a slow backend from API Gateway overhead, and which two tools help you trace it?

---

## What's Next

Pair this with **AWS Lambda** (the typical backend), **Amazon Cognito** (user auth), **AWS WAF** (L7 protection), and **AWS Step Functions** (service orchestration behind the API).
