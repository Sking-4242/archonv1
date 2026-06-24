---
title: "AWS AppSync"
type: content
estimated_minutes: 13
cert_tags: ["SAA-C03"]
---

# AWS AppSync

## Overview

AWS AppSync is a fully managed service for building **GraphQL** (and Pub/Sub) APIs that connect applications to data from multiple sources through a single endpoint. It lets client apps query exactly the data they need, combine data from several backends in one request, and receive **real-time updates** via subscriptions — without you operating GraphQL server infrastructure. This *service reference* lesson covers the AppSync model, resolvers and data sources, real-time and offline features, and what each certification expects.

AppSync matters because modern apps — especially mobile and single-page web apps — benefit from GraphQL's ability to fetch precisely the fields needed in one round trip, aggregate multiple backends, and push live updates. Building and scaling a GraphQL layer yourself is work; AppSync provides it managed. The core mental model is a **GraphQL schema** whose fields are backed by **resolvers** that map to **data sources** (DynamoDB, Lambda, RDS/Aurora via Data API, OpenSearch, HTTP), with built-in **subscriptions** for real-time and caching/offline support for clients. It is the GraphQL counterpart to API Gateway's REST/HTTP APIs.

---

## How It Works

You define a **GraphQL schema** (types, queries, mutations, subscriptions). Each field is connected to a **data source** through a **resolver** (written in JavaScript/VTL) that translates the GraphQL request into a call to the backend and shapes the response. AppSync supports:

- **Data sources** — **DynamoDB**, **AWS Lambda**, **Amazon RDS/Aurora** (via the Data API), **Amazon OpenSearch**, and generic **HTTP** endpoints — and a single query can stitch together several.
- **Real-time subscriptions** — clients subscribe to data changes and AppSync pushes updates over WebSockets automatically when a mutation occurs.
- **Caching** at the API to reduce backend calls and latency.
- **Offline and sync** support for client apps (historically via Amplify DataStore).

Authorization is flexible: **Cognito user pools**, **IAM**, **OIDC**, **Lambda authorizers**, or **API keys**, including fine-grained, field-level authorization.

---

## Key Features

- **Managed GraphQL** with a single endpoint over multiple data sources.
- **Real-time subscriptions** (WebSockets) for live data.
- **Multiple data sources per query** (DynamoDB, Lambda, RDS, OpenSearch, HTTP) with JS/VTL resolvers.
- **Flexible authorization** — Cognito, IAM, OIDC, Lambda authorizers, API keys, plus field-level auth.
- **Caching** and **offline/sync** for responsive clients.
- **Merged APIs** to combine team-owned schemas.

---

## Configuration Reference

- **Define the GraphQL schema** and attach **resolvers** mapping fields to data sources.
- **Choose authorization** (commonly **Cognito user pools** for app users, IAM for service-to-service), and apply field-level rules where needed.
- **Enable caching** for read-heavy fields and **subscriptions** for real-time features.
- **Secure** backends with least-privilege roles and place private data sources in a VPC.

---

## Operations and Troubleshooting

- **AppSync vs. API Gateway.** Use **AppSync** when you want **GraphQL** (precise field selection, multi-source aggregation, built-in real-time subscriptions); use **API Gateway** for REST/HTTP/WebSocket APIs. This is the core exam decision.
- **Authorization errors.** Check the configured auth mode (Cognito/IAM/OIDC/Lambda/API key) and any field-level rules.
- **Slow queries.** Enable caching, optimize resolvers, and ensure backend data sources (DynamoDB indexes, etc.) are designed for the access pattern.
- **Real-time not updating.** Confirm subscriptions are defined in the schema and that mutations trigger them.

---

## Integrations

AppSync resolves to **DynamoDB**, **Lambda**, **RDS/Aurora**, and **OpenSearch**, authorizes with **Cognito**/**IAM**/OIDC/Lambda authorizers, integrates with **AWS Amplify** for front-end app development, monitors via **CloudWatch** and **X-Ray**, and serves mobile/web clients needing real-time and offline data. It is the GraphQL sibling of **API Gateway** in the serverless application stack.

---

## Pricing and Cost Considerations

AppSync bills per **query and data-modification operation** and per **real-time subscription message** (plus connection-minutes), with optional **caching** billed by cache size. Costs scale with API traffic and real-time usage; the levers are enabling caching for read-heavy fields, efficient resolvers, and right-sizing subscriptions. There is no infrastructure to provision. Exact prices vary by Region.

---

## Exam Relevance

**SAA-C03:** Know AppSync as managed GraphQL connecting multiple data sources with real-time subscriptions and flexible (Cognito/IAM/OIDC) authorization, and **AppSync (GraphQL) vs. API Gateway (REST/HTTP)** selection. Design depth.

---

## Summary

AWS AppSync is managed GraphQL: a schema whose fields are backed by resolvers that map to data sources (DynamoDB, Lambda, RDS/Aurora, OpenSearch, HTTP), letting clients fetch exactly the data they need from multiple backends in one request, with built-in real-time subscriptions over WebSockets and caching/offline support. Authorization is flexible (Cognito, IAM, OIDC, Lambda authorizers, API keys, field-level), and it integrates with Amplify for app development. The defining exam point is choosing AppSync (GraphQL, multi-source, real-time) versus API Gateway (REST/HTTP/WebSocket).

---

## Quick Check

1. What does GraphQL let a client do that a typical REST endpoint does not?
2. What connects a GraphQL field to a backend, and which data sources can AppSync use?
3. How does AppSync deliver real-time updates to clients?
4. Which authorization modes does AppSync support?
5. When would you choose AppSync over API Gateway?

---

## What's Next

Pair this with **Amazon API Gateway** (REST/HTTP comparison), **Amazon DynamoDB** and **AWS Lambda** (common resolvers), and **Amazon Cognito** (authorization).
