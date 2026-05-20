---
title: "RDS Proxy: Connection Pooling and IAM Auth"
type: content
estimated_minutes: 8
cert_tags: ["SAA-C03", "DVA-C02"]
---

# RDS Proxy: Connection Pooling and IAM Auth

## Overview

RDS Proxy sits between your application and RDS/Aurora, pooling and sharing database connections. It's particularly valuable for Lambda functions and containerized workloads that open and close connections frequently, as well as for improving failover times and centralizing IAM database authentication.

## The Connection Problem

Database connections are expensive to establish — each TCP connection, TLS handshake, and database authentication handshake consumes memory and CPU on the DB instance. Serverless functions and containers can create thousands of connections simultaneously. Without pooling, this exhausts `max_connections` and causes connection refused errors. RDS Proxy holds a pool of persistent connections to the database and multiplexes many application connections onto fewer backend connections.

## How RDS Proxy Works

Your application connects to the Proxy endpoint instead of the DB endpoint. The Proxy maintains a pool of connections to the DB. Idle application connections are held at the proxy without consuming a backend connection slot. The proxy multiplexes many client connections over fewer backend connections. This can reduce DB connection count by 90%+ for Lambda-heavy workloads.

## Failover Improvement

During an RDS Multi-AZ failover, the application's connection to the proxy stays alive. The proxy detects the failover, waits for the new primary to come up, and reconnects the backend connections — all transparently. Application failover time drops from ~60-120 seconds (DNS propagation + reconnect) to typically under 30 seconds with the proxy.

## IAM Database Authentication

RDS Proxy can enforce IAM authentication — instead of a username/password, applications get a short-lived auth token via `generate-db-auth-token` API call, signed with their IAM credentials. This eliminates static database passwords and rotates credentials automatically via Secrets Manager. Particularly valuable for Lambda functions which already have IAM roles.

## Summary

RDS Proxy solves the connection exhaustion problem for serverless and containerized workloads. It also reduces failover time and enables IAM-based database authentication. For Lambda-to-RDS architectures, always place RDS Proxy between them — it's a standard architecture pattern and an exam favorite.

## What's Next

Next up: the Module 11 Canvas Lab — designing a highly available RDS architecture.