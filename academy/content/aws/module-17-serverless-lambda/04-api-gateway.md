---
title: "Amazon API Gateway"
type: content
estimated_minutes: 10
cert_tags: ["SAA-C03", "DVA-C02", "CLF-C02"]
---

# Amazon API Gateway

## Overview

API Gateway is a fully managed service for creating, publishing, and securing APIs. It acts as the front door for your backend services — Lambda, EC2, ECS, or any HTTP endpoint — handling request routing, authentication, throttling, and monitoring without any server management.

## REST API vs. HTTP API vs. WebSocket API

API Gateway offers three types. REST API: feature-rich, supports API keys, usage plans, WAF integration, request/response transformation, caching. More expensive. HTTP API: faster, cheaper (~70% less cost), supports OIDC/JWT authentication and Lambda proxy integration. Choose HTTP API for most new Lambda APIs. WebSocket API: maintains persistent connections for real-time bidirectional communication (chat, live dashboards, collaborative tools).

## Integration Types

Lambda Proxy Integration passes the entire request (headers, query params, body) to Lambda as a JSON event; Lambda returns a JSON response that API Gateway proxies back. Lambda Non-Proxy lets you use mapping templates to transform requests before Lambda and responses after. HTTP Integration proxies to any HTTP backend (EC2, load balancer, on-premises). Mock Integration returns a static response — useful for API design and testing without backend implementation.

## Authentication and Authorization

Options: IAM authorization (Sigv4 signing, for internal AWS services), Lambda Authorizers (custom auth logic — validate JWT, call an auth service, return IAM policy), Cognito User Pool Authorizers (validate Cognito JWT tokens natively), API Keys (for basic access control, NOT for security — use with usage plans for rate limiting clients). For public APIs, use Cognito or a Lambda Authorizer with your identity provider's JWT validation.

## Throttling, Caching, and Stages

API Gateway throttles requests at account level (10,000 rps default, 5,000 burst) and per-method level. Response caching (REST API only) caches backend responses by cache key (URL + query strings) for up to 1 hour — reduces Lambda invocations for static responses. Stages represent deployment environments (dev, staging, prod) with separate configuration, throttle limits, and caching settings. Stage variables are environment-specific settings accessible in mapping templates and Lambda ARNs.

## Summary

API Gateway manages the HTTP API layer: routing, authentication, throttling, and monitoring. HTTP API for most Lambda APIs (cheaper, simpler); REST API when you need WAF, API keys, or response transformation; WebSocket for real-time. Lambda Proxy integration is the standard pattern. Always combine API Gateway with Cognito or a Lambda Authorizer — API keys are not a security control.

## Examples

A startup building a mobile fitness app uses API Gateway HTTP API in front of Lambda functions to serve user workout data. They chose HTTP API over REST API because it costs roughly 70% less per million requests and natively validates their Auth0-issued JWT tokens without writing a custom Lambda Authorizer — the OIDC/JWT support built into HTTP API handles it. For a new product with uncertain traffic, the cost difference matters more than the advanced features they do not yet need.

A B2B SaaS platform exposes a public REST API that third-party developers integrate against. They use REST API (not HTTP API) specifically for two features: API Keys tied to usage plans that let them rate-limit each customer to their contracted tier, and WAF integration that blocks malicious traffic before it reaches Lambda. They also enable response caching on their most-read endpoints (product catalog lookups) with a 5-minute TTL, reducing Lambda invocations by 40% during peak hours — demonstrating REST API's advanced features justifying the higher cost.

A financial data company built a real-time trading dashboard using API Gateway WebSocket API. Browser clients connect once and hold a persistent WebSocket connection; when new trade data arrives, the backend Lambda pushes updates to all connected clients by calling the `@connections` management API. The team had to design a DynamoDB table to store active connection IDs (since WebSocket is stateless at the API Gateway level) and clean up stale connections — illustrating the architectural thinking required for real-time bidirectional communication patterns.

## Think About It

1. Why are API Keys explicitly described as "not a security control"? What attack does an API Key fail to prevent that an IAM authorizer or Cognito JWT validation would stop?
2. How would you decide between using a Lambda Authorizer versus a Cognito User Pool Authorizer for a public-facing mobile API? What factors tip the decision each way?
3. API Gateway throttles at 10,000 requests per second at the account level. If you have 20 different APIs across 20 teams in the same account and one API receives a traffic spike, what happens to the other 19 APIs — and what does this suggest about account architecture?
4. What trade-offs exist between enabling response caching on an API Gateway endpoint and always forwarding requests to Lambda? Under what circumstances would caching produce incorrect behavior?
5. You need to expose a legacy on-premises SOAP service to modern mobile clients through a clean REST interface. Which API Gateway integration type would you use, and what transformation work would be required?

## Quick Check

**Q1.** A team is building a new Lambda-backed API. They need JWT authentication with their existing identity provider and want to minimize cost. They do NOT need request/response transformation, WAF, or API keys. Which API Gateway type should they choose?

- A) REST API — it is the most feature-complete and safest default
- B) HTTP API — it is ~70% cheaper, supports OIDC/JWT natively, and has Lambda proxy integration
- C) WebSocket API — it reduces per-request latency through persistent connections
- D) REST API with a Mock Integration — it avoids Lambda costs entirely

**Answer: B** — HTTP API is the recommended choice for most new Lambda-backed APIs: it is significantly cheaper, natively supports OIDC/JWT validation, and supports Lambda proxy integration without the overhead of REST API features the team does not need.

**Q2.** A developer configures API Keys on their API Gateway REST API to protect a private backend. A security reviewer flags this as insufficient. Why?

- A) API Keys are not supported on REST APIs; they only work on HTTP APIs
- B) API Keys are sent in plain text headers and can be easily extracted from client-side code or network traces; they do not prove identity or control permissions
- C) API Keys expire after 90 days and cannot be rotated automatically
- D) API Gateway API Keys do not work with Lambda Proxy Integration

**Answer: B** — API Keys are a client identification mechanism for rate limiting and usage tracking, not an authentication control. Anyone who obtains the key string can make authenticated requests; use Cognito or a Lambda Authorizer for actual security.

**Q3.** Which API Gateway type should you use to build a live collaborative document editing feature where the server needs to push change notifications to all connected users instantly?

- A) REST API with long polling on the client side
- B) HTTP API with response streaming enabled
- C) WebSocket API, which maintains persistent bidirectional connections
- D) REST API with a 1-second cache TTL to reduce latency

**Answer: C** — WebSocket API maintains persistent connections and allows the backend to push messages to clients at any time, which is the correct model for real-time collaborative features where the server initiates communication.

## What's Next

Next up: SAM and Serverless patterns — packaging and deploying serverless applications.