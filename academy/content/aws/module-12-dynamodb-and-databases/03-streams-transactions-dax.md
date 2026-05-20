---
title: "DynamoDB Streams, Transactions, and DAX"
type: content
estimated_minutes: 10
cert_tags: ["SAA-C03", "DVA-C02"]
---

# DynamoDB Streams, Transactions, and DAX

## Overview

DynamoDB Streams enable event-driven architectures by streaming every table change. Transactions add ACID guarantees for multi-item operations. DynamoDB Accelerator (DAX) is an in-memory cache that pushes read performance from milliseconds to microseconds.

## DynamoDB Streams

Streams captures every item modification (INSERT, MODIFY, REMOVE) as a time-ordered log with a 24-hour retention window. Each stream record contains the operation type and optionally the before/after images of the item. Common patterns: trigger a Lambda on writes for real-time processing, replicate changes to Elasticsearch for search, fan out changes to other microservices. Streams + Lambda is DynamoDB's standard event-driven pattern.

## DynamoDB Transactions

TransactWriteItems and TransactGetItems allow you to atomically read or write up to 25 items across multiple tables in a single ACID transaction. Either all operations succeed, or all are rolled back — no partial writes. This supports use cases like: debit account A and credit account B atomically, or check inventory and place order in one operation. Transactions consume 2x the normal WCU (one for prepare, one for commit). Use sparingly — transactions are powerful but expensive.

## DynamoDB Accelerator (DAX)

DAX is a fully managed, in-memory read cache cluster that sits in front of DynamoDB and provides microsecond latency for cached reads (vs. single-digit milliseconds from DynamoDB). Compatible with DynamoDB API — just point your SDK at the DAX endpoint instead. Caches individual item reads and query results. Write-through cache: writes go to DynamoDB and DAX simultaneously. Use DAX for read-heavy workloads with repeated access to the same items (gaming, social feeds, real-time bidding).

## TTL (Time to Live)

TTL lets you automatically expire and delete items after a timestamp attribute exceeds the current epoch time. DynamoDB deletes expired items within 48 hours of expiry (at no write cost). Use TTL for session data, temporary tokens, cache tables, and any data with a natural expiration. Expired items are removed from GSIs and LSIs too. TTL deletions appear in DynamoDB Streams so you can capture expirations for downstream processing.

## Summary

Streams turn DynamoDB into an event source for Lambda and real-time pipelines. Transactions enable ACID guarantees across items at 2x WCU cost. DAX caches reads to microsecond latency for hot-key workloads. TTL automates expiration cleanup at zero cost. Together these make DynamoDB a complete platform for scalable event-driven applications.

## What's Next

Next up: DynamoDB Global Tables and Advanced Design Patterns — multi-region active-active and single-table design.