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

## Examples

A food delivery platform uses DynamoDB Streams with Lambda to update a real-time order-status dashboard. Whenever a driver marks an order as "delivered," the item modification flows through the stream, triggers a Lambda function, and pushes a WebSocket notification to the customer's browser. The stream acts as the event bus — the delivery team never had to build a separate messaging layer, and the Lambda only runs when data actually changes.

A digital bank needed to transfer funds between two accounts stored in DynamoDB. Using `TransactWriteItems`, they debit the source account and credit the destination account in a single atomic operation. If the source account has insufficient funds (detected by a condition expression), the entire transaction rolls back, leaving both balances unchanged. Without transactions, they would have needed complex application-level retry and compensation logic to handle partial failures.

A real-time bidding platform experienced DynamoDB read latency spikes during peak auction windows because the same popular auction items were read thousands of times per second. After placing DAX in front of DynamoDB, cache hit rates for active auction items reached 95%, reducing DynamoDB read load dramatically and dropping read latency from 5–10ms to under 300 microseconds. The key insight is that DAX's value is concentrated on repeatedly-read hot items — not uniformly distributed access patterns.

## Think About It

1. DynamoDB Streams has a 24-hour retention window. What happens to a Lambda consumer that falls behind by more than 24 hours? How would you design your architecture to prevent this from being a data-loss event?
2. Transactions consume 2x the normal WCU cost. If your workload requires transactions for every write, what does that mean for your capacity planning and cost relative to a non-transactional table?
3. DAX is a write-through cache — writes go to DynamoDB and DAX simultaneously. What consistency guarantee does this give you, and can you think of a scenario where a DAX read could still return stale data?
4. Why would TTL-based deletion be preferable to writing a scheduled job that deletes expired items? Consider cost, operational complexity, and impact on table throughput.
5. You're considering using Streams + Lambda for cross-table replication as an alternative to DynamoDB Global Tables. What trade-offs would you be accepting compared to the managed Global Tables approach?

## Quick Check

**Q1.** How long does DynamoDB Streams retain stream records?
- A) 1 hour
- B) 12 hours
- C) 24 hours
- D) 7 days

**Answer: C** — DynamoDB Streams retains stream records for 24 hours; consumers must process records within this window.

**Q2.** What is the WCU cost multiplier for a DynamoDB Transaction compared to a standard write?
- A) 1x (same cost)
- B) 1.5x
- C) 2x
- D) 4x

**Answer: C** — Transactional writes consume 2x the WCUs of equivalent non-transactional writes, one unit for the prepare phase and one for the commit phase.

**Q3.** DAX is best suited for which type of workload?
- A) Write-heavy workloads requiring strong consistency on every write
- B) Read-heavy workloads that repeatedly access the same items
- C) Batch analytics workloads scanning full tables
- D) Workloads that require cross-table ACID transactions

**Answer: B** — DAX provides maximum benefit when the same items are read repeatedly, allowing the in-memory cache to absorb the traffic instead of hitting DynamoDB on every request.

## What's Next

Next up: DynamoDB Global Tables and Advanced Design Patterns — multi-region active-active and single-table design.