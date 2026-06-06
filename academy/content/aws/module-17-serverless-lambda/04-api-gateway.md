---
title: "Amazon API Gateway"
type: content
estimated_minutes: 13
cert_tags: ["CLF-C02", "SAA-C03", "SAP-C02"]
---

# Amazon API Gateway

## Overview

Lambda functions do not expose HTTP endpoints on their own. API Gateway is the managed service that sits in front of Lambda (and other backends) and turns them into fully functional, production-grade APIs. It handles everything at the API layer that you would otherwise need to build yourself: request routing, TLS termination, authentication, throttling, response caching, logging, and monitoring — without any servers to manage.

The core value proposition is that API management infrastructure is undifferentiated work. Every API needs rate limiting, authentication, and logging. Without API Gateway, every team builds these from scratch in their application code or deploys and maintains dedicated API management software on EC2. API Gateway makes them standard features you configure, not code you write.

For the SAA exam, know the three API types (REST, HTTP, WebSocket), when to use each, integration types (especially Lambda Proxy), authorizer options, and throttling behavior. SAP adds usage plans and API keys for multi-tier rate limiting, request/response transformation with mapping templates, and canary deployments via stage variables. After this lesson, you will be able to choose the right API Gateway type for a given scenario, configure authentication, and set appropriate throttling limits.

---

## Core Concepts

### Three API Types

API Gateway offers three distinct API types, each suited to different use cases:

**REST API** is the original, feature-complete option. It supports: API keys and usage plans for per-client rate limiting, WAF integration for L7 protection, response caching (up to 1 hour TTL), request and response transformation via mapping templates (Velocity Template Language), resource policies for IP-based access control, and custom domain names. REST API is the choice when you need any of these advanced features. Cost: ~$3.50 per million requests.

**HTTP API** was introduced to provide a simpler, cheaper alternative for Lambda-backed APIs. It supports native OIDC and JWT authentication (validate tokens from Cognito, Auth0, Okta without writing a Lambda Authorizer), Lambda proxy integration, private integrations (VPC Link to private ALBs), and automatic deployments. It does not support response caching, WAF, API key usage plans, or mapping templates. Cost: ~$1.00 per million requests (~70% cheaper than REST API). Use HTTP API for the majority of new Lambda-backed APIs.

**WebSocket API** maintains persistent bidirectional connections between clients and the backend. Clients connect once; either side can send messages at any time. Route selection expressions determine which Lambda function handles a given message type. Use WebSocket for real-time features: live dashboards, collaborative editing, multiplayer gaming, chat applications. Each connection has a unique connection ID; the backend stores active connection IDs (typically in DynamoDB) and sends messages using the `@connections` management API.

---

### Integration Types

API Gateway routes requests to backends using four integration types:

**Lambda Proxy Integration** (most common): the entire HTTP request — headers, query string parameters, path parameters, body, and request context — is passed to Lambda as a structured JSON event. Lambda returns a JSON response object that API Gateway unpacks into the HTTP response. This is the default and recommended pattern for new Lambda-backed APIs. The Lambda function has full visibility into the request and full control over the response.

**Lambda Non-Proxy (Custom)**: mapping templates transform the request before it reaches Lambda and transform the response before it is returned to the client. Used when the Lambda function expects a specific input format that does not match the API request structure, or when you need to reshape the Lambda response for the client. Requires VTL (Velocity Template Language) knowledge.

**HTTP Integration**: proxies the request to any HTTP endpoint — an ALB in front of ECS, an EC2 instance, an on-premises server, or any external API. Used to add API Gateway's authentication, throttling, and caching to existing HTTP backends without changing the backend code.

**Mock Integration**: returns a static response without invoking any backend. Used during API design (return stub responses while building the real backend) or for simple health check endpoints.

---

### Authentication and Authorization

API Gateway supports four authorization mechanisms:

**IAM Authorization**: requests are signed with AWS Signature Version 4 (SigV4). The API Gateway validates the signature and checks the caller's IAM permissions. Use for internal, service-to-service APIs where callers are AWS principals with IAM roles.

**Lambda Authorizers**: a Lambda function is invoked with the request's token or request parameters, executes custom authorization logic (validate a JWT, query an external auth service, check a database), and returns an IAM policy document. API Gateway caches the returned policy for a configurable TTL. Use when your identity provider is not natively supported or when authorization requires business logic.

**Cognito User Pool Authorizers**: API Gateway natively validates tokens issued by an Amazon Cognito User Pool. No Lambda Authorizer required. Valid for REST API only. HTTP API supports Cognito tokens via its native JWT authorizer.

**API Keys**: a string value included in the `x-api-key` header. API Keys are used with **usage plans** to throttle and track usage per client — not for authentication. An API key does not prove the caller's identity; it only identifies which client tier they belong to for rate limiting purposes.

---

### Throttling, Caching, and Stages

**Throttling** operates at two levels. Account-level defaults are 10,000 requests per second (RPS) with a burst of 5,000 (token bucket algorithm). These limits are shared across all APIs in the account and region. Method-level throttle settings on specific stages and routes can override the account default for individual endpoints.

**Response caching** (REST API only): API Gateway caches backend responses by cache key (path + query string parameters) for a configurable TTL (0 seconds to 1 hour). Cached responses are returned without invoking Lambda. Cache capacity ranges from 0.5 GB to 237 GB. Useful for read-heavy APIs returning semi-static data (product catalogs, reference data).

**Stages** represent deployment snapshots of an API configuration — `dev`, `staging`, `prod`. Each stage can have independent throttle limits, caching settings, logging configurations, and stage variables. Stage variables act like environment variables for the stage — you can parameterize Lambda ARNs with stage variables to point the same API route to different Lambda function aliases per stage.

---

## Configuration Reference

### Creating an HTTP API with JWT Authorization

```bash
# Create an HTTP API (simplest, cheapest option for Lambda backends)
aws apigatewayv2 create-api \
  --name "prod-orders-api" \
  --protocol-type HTTP \
  --cors-configuration AllowOrigins="https://app.example.com",AllowMethods=GET,POST,AllowHeaders=Authorization,Content-Type \
  --region us-east-1

# Add a JWT authorizer (validates tokens from Cognito User Pool)
aws apigatewayv2 create-authorizer \
  --api-id abc1234567 \
  --name "CognitoJWT" \
  --authorizer-type JWT \
  --identity-source '$request.header.Authorization' \
  --jwt-configuration Audience=1234567890abcdef,Issuer=https://cognito-idp.us-east-1.amazonaws.com/us-east-1_XXXXXXXX \
  --region us-east-1

# Create a Lambda integration
aws apigatewayv2 create-integration \
  --api-id abc1234567 \
  --integration-type AWS_PROXY \
  --integration-uri arn:aws:lambda:us-east-1:123456789012:fu