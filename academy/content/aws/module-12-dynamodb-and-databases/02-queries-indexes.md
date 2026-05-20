---
title: "DynamoDB Queries, Scans, and Indexes"
type: content
estimated_minutes: 10
cert_tags: ["SAA-C03", "DVA-C02"]
---

# DynamoDB Queries, Scans, and Indexes

## Overview

DynamoDB's access pattern model is fundamentally different from SQL. You design indexes around your access patterns, not the other way around. This lesson covers Query vs. Scan, Global Secondary Indexes (GSIs), and Local Secondary Indexes (LSIs) — the tools for efficient data access.

## Query vs. Scan

Query retrieves items with a specific partition key value, optionally filtering by sort key. It's O(result set size) — efficient. Scan reads every item in the table and applies a filter expression — O(table size) — expensive and slow on large tables. Use Scans only for small tables or when you need to export the full table. Never scan a production table in a hot path.

## Global Secondary Indexes (GSI)

A GSI is a separate index with a different partition key (and optional sort key) from the base table. DynamoDB maintains the GSI automatically, replicating only the projected attributes you specify. GSIs are eventually consistent with the base table. You can have up to 20 GSIs per table. Example: a table with `user_id` as partition key could have a GSI with `email` as the partition key to enable login by email.

## Local Secondary Indexes (LSI)

LSIs share the base table's partition key but have a different sort key. They must be created at table creation time and cannot be added later. LSIs are strongly consistent (they share partition storage with the base table). Max 5 LSIs per table. Max 10 GB of items (base + LSI projection) per partition key value. LSIs are less flexible than GSIs; GSIs are generally preferred.

## Projection and Index Cost

When creating a GSI or LSI, you choose which attributes to project: ALL (copy every attribute — highest storage cost), KEYS_ONLY (just the primary key attributes), or INCLUDE (specified list). Project only the attributes your query needs. GSI writes consume WCUs from the GSI's provisioned capacity, not the base table — watch out for hot key patterns that overload a GSI partition.

## Summary

Design your DynamoDB access patterns first, then create indexes to support them. Query is efficient; Scan is expensive. GSIs let you add new partition keys for different access patterns. LSIs give you alternate sort keys with strong consistency but must be defined at table creation. Always project the minimum attributes needed.

## What's Next

Next up: DynamoDB Streams, Transactions, and DAX — advanced features for event-driven and performance-critical workloads.