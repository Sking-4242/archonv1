---
title: "DynamoDB Global Tables and Single-Table Design"
type: content
estimated_minutes: 10
cert_tags: ["SAA-C03", "SAP-C02", "DVA-C02"]
---

# DynamoDB Global Tables and Single-Table Design

## Overview

DynamoDB Global Tables provide fully managed multi-region, active-active replication. Single-table design is the DynamoDB modeling technique that uses one table to store multiple entity types, enabling all access patterns with a minimal number of requests. Both topics are essential for senior-level DynamoDB work.

## Global Tables

Global Tables automatically replicates a DynamoDB table across multiple AWS regions. All replicas are writeable — any region can accept writes and changes propagate to all other regions in under 1 second (typically). Conflict resolution uses last-writer-wins by timestamp. Use Global Tables for globally distributed applications that need low-latency reads and writes in multiple regions, and for multi-region active-active DR.

## Single-Table Design Principles

In traditional database design, each entity type has its own table. In DynamoDB, a common optimization is to store all entity types in one table. You create a generic partition key (e.g., `PK`) and sort key (e.g., `SK`) and overload them with different value formats per entity type. Example: `PK=USER#123, SK=PROFILE` for a user profile; `PK=USER#123, SK=ORDER#456` for an order. This allows a single Query to retrieve a user plus all their orders.

## Access Pattern First Design

The process: (1) identify all access patterns (e.g., 'get user by ID', 'get all orders for a user', 'get order by ID', 'get all users by email'); (2) design the base table PK/SK to serve the most frequent patterns; (3) add GSIs for alternate access patterns. Every pattern must map to a Query, not a Scan. If you can't map a pattern without a Scan, you need another GSI.

## Sparse Indexes

A sparse index contains only items that have the indexed attribute — DynamoDB only includes an item in a GSI if the item has the GSI's partition key attribute. This is a powerful pattern: add a `status` attribute only to items in a specific state (e.g., `status=PENDING`) and create a GSI on `status`. The GSI only contains pending items, making queries for pending work extremely efficient regardless of total table size.

## Summary

Global Tables enable multi-region active-active without custom replication logic. Single-table design collapses multiple entity types into one table, enabling all access patterns via Query. Access-pattern-first design and sparse indexes are the advanced modeling tools that distinguish DynamoDB experts from beginners.

## Examples

A ride-sharing company serves drivers and riders across North America, Europe, and Asia. They use DynamoDB Global Tables with replicas in `us-east-1`, `eu-west-1`, and `ap-southeast-1` so that each region reads and writes to a local replica at low latency. When a driver in London accepts a ride, the write lands in `eu-west-1` and replicates to other regions within a second — the customer in San Francisco can check the booking status from the US replica almost immediately. This is the core value proposition of active-active Global Tables: no region is a secondary.

A SaaS platform originally used seven separate DynamoDB tables — one each for users, organizations, memberships, subscriptions, invoices, audit logs, and sessions. Queries joining users to their subscriptions required multiple round trips and complex application-side joins. After migrating to single-table design with `PK=ORG#<id>` and typed sort keys (`SK=USER#<id>`, `SK=SUBSCRIPTION#<id>`), they could retrieve an organization, all its members, and its active subscription in a single Query, slashing latency and request count.

A job queue system used a `status` attribute on task items, but only a small fraction of tasks were ever in the `PENDING` state at once — most were `COMPLETED`. By creating a sparse GSI on `status`, only pending tasks appeared in the index. Polling workers could Query the sparse GSI to find the next batch of pending work, scanning a tiny index rather than the full tasks table — a pattern that stays efficient even as the completed-task history grows to hundreds of millions of items.

## Think About It

1. Global Tables uses last-writer-wins conflict resolution based on timestamp. What types of applications would this be unacceptable for, and how might you mitigate the risk at the application layer?
2. In single-table design, all entity types share one table and one set of partition/sort keys. What are the operational and observability trade-offs compared to having a table per entity type?
3. A sparse index only contains items that have the indexed attribute. What would happen if you accidentally wrote the indexed attribute to items that shouldn't be in the index? How would you detect and prevent this?
4. How would you decide whether to use a GSI or add a Global Table replica to serve users in a new geographic region? What questions would you ask to distinguish the two problems?
5. The access-pattern-first design process requires you to enumerate all access patterns up front. What happens when a new access pattern is discovered after the table is live? What are your options?

## Quick Check

**Q1.** In DynamoDB Global Tables, how does conflict resolution work when two regions write to the same item simultaneously?
- A) The write with the lower timestamp wins
- B) The write with the higher timestamp wins (last-writer-wins)
- C) Both writes are rejected and the application must retry
- D) The primary region's write always wins

**Answer: B** — Global Tables uses last-writer-wins based on timestamp; the most recent write by wall-clock time is the one that survives across all replicas.

**Q2.** In single-table design, what is the purpose of using generic attribute names like `PK` and `SK` instead of descriptive names like `user_id` and `email`?
- A) It reduces storage costs because shorter names compress better
- B) It allows different entity types to share the same key attributes with type-specific value formats
- C) It is required by DynamoDB for tables with more than one entity type
- D) It prevents accidental overwrites between entity types

**Answer: B** — Generic key names allow the same physical key attributes to carry different meanings per entity type (e.g., `PK=USER#123` vs `PK=ORDER#456`), enabling multiple entity types to coexist and be queried efficiently in one table.

**Q3.** What makes a sparse index efficient for querying a small subset of table items?
- A) DynamoDB compresses sparse indexes to take less disk space
- B) Only items that have the GSI's partition key attribute are included in the index, making the index much smaller than the full table
- C) Sparse indexes use stronger consistency than regular GSIs
- D) DynamoDB automatically partitions sparse indexes across more nodes

**Answer: B** — A sparse GSI only contains items where the indexed attribute exists; if only a fraction of items carry the attribute, the index remains small and cheap to query regardless of how large the base table grows.

## What's Next

Next up: ElastiCache — in-memory caching with Redis and Memcached.