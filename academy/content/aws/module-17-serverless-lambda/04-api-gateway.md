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

## What's Next

Next up: SAM and Serverless patterns — packaging and deploying serverless applications.