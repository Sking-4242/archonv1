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

## Examples

A startup building a multi-tenant SaaS product stored all customer records in a single DynamoDB table with `tenant_id` as the partition key. When product managers needed to pull all records for a specific tenant, they used a Query against `tenant_id` — returning only that tenant's items in milliseconds. Had they used Scan, the operation would have read every item across all tenants before filtering, scaling in cost with the total table size, not the result set.

An online marketplace needed a way to look up orders by customer email address, even though the base table used `order_id` as its partition key. They created a GSI with `customer_email` as the partition key and `created_at` as the sort key. When a customer logs in, a Query against the GSI returns all their orders sorted by date — no Scan, no full-table read, and DynamoDB maintains the GSI automatically as orders are written.

A real-time analytics platform discovered their GSI was throttling even though the base table was fine. The root cause was a hot partition in the GSI: nearly all writes had the same GSI partition key value (`status=ACTIVE`), concentrating all GSI write traffic on a single partition. Redistributing write load required restructuring the GSI key to include a shard suffix — an example of why understanding GSI write cost and hot-key patterns matters beyond just query correctness.

## Think About It

1. Why does DynamoDB make you design your access patterns before creating indexes, rather than letting you query any attribute freely like SQL? What architectural constraint drives this?
2. You need a GSI to look up users by email, but email addresses are unique — each partition key value in the GSI will contain exactly one item. Does this affect how you'd design the GSI, and does eventual consistency matter in this case?
3. What would happen if you ran a Scan on a 500 GB table to find one record? Walk through the cost in RCUs and the latency implications compared to a Query.
4. LSIs must be created at table creation time and cannot be added later. How would you handle a new access pattern on an existing table that requires strong consistency but the table has no LSI for it?
5. You're projecting ALL attributes onto a GSI to keep queries simple. What are the storage and write amplification trade-offs compared to projecting KEYS_ONLY?

## Quick Check

**Q1.** What does a DynamoDB Scan operation do that makes it expensive on large tables?
- A) It reads only items matching the partition key, then filters
- B) It reads every item in the table and applies a filter expression after reading
- C) It reads the GSI first, then falls back to the base table
- D) It locks the table while executing to ensure consistency

**Answer: B** — A Scan reads every item in the table regardless of the filter, consuming RCUs proportional to total table size, not result size.

**Q2.** What is the key difference between a GSI and an LSI?
- A) GSIs support strong consistency; LSIs do not
- B) LSIs can be added after table creation; GSIs cannot
- C) GSIs can have a completely different partition key; LSIs must share the base table's partition key
- D) LSIs are only available in on-demand capacity mode

**Answer: C** — A GSI defines its own partition key (and optional sort key), enabling entirely new access patterns; an LSI keeps the same partition key but uses an alternate sort key.

**Q3.** When creating a GSI, which attribute projection option copies every attribute from the base table into the index?
- A) KEYS_ONLY
- B) INCLUDE
- C) ALL
- D) FULL

**Answer: C** — Specifying ALL projects every base table attribute into the GSI, giving full item access from the index but at the highest storage cost.

## What's Next

Next up: DynamoDB Streams, Transactions, and DAX — advanced features for event-driven and performance-critical workloads.