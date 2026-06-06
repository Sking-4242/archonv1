---
title: "DynamoDB Global Tables and Single-Table Design"
type: content
estimated_minutes: 18
cert_tags: ["SAA-C03", "SAP-C02", "DVA-C02"]
---

# DynamoDB Global Tables and Single-Table Design

## Overview

DynamoDB Global Tables is AWS's fully managed solution for active-active multi-region replication. Unlike a traditional primary/secondary setup where only one region accepts writes, every Global Tables replica is fully writeable. A write committed in `ap-southeast-1` propagates to `us-east-1` and `eu-west-1` in under a second. There is no elected primary, no failover ceremony, and no application-level routing change required if a region degrades. The practical result is that a globally distributed user base can read and write to the closest region at single-digit millisecond latency without the application knowing about replication at all.

Conflict resolution is the trade-off that makes Global Tables feasible at scale. Because any region can accept a write to the same item at the same moment, simultaneous conflicting writes are possible. DynamoDB resolves these with last-writer-wins based on wall-clock timestamp: the write with the highest `_timestamp` value survives and is applied to all replicas. For most application data — session state, user profiles, product catalog, location updates — this is acceptable. For data where concurrent mutation by multiple regions would be catastrophic (a bank balance, an inventory count), Global Tables is not appropriate without additional application-layer concurrency controls.

Single-table design is a data modeling philosophy specific to DynamoDB. It inverts traditional relational instincts: instead of one table per entity type, you collapse every entity in your domain into one table using a small set of generic keys. The motivation is not aesthetics — it is the constraint that DynamoDB can only join data within a single Query call. If you want to retrieve a user, their organization, and their active subscription in one network round trip, all three records must be in the same table and queryable by the same partition key. This lesson covers both Global Tables operation and the concrete mechanics of single-table design, including write sharding to handle hot partition scenarios.

## Core Concepts

### Global Tables: Active-Active Replication Architecture

A Global Table is a DynamoDB table with one or more replica tables in different AWS regions. You designate a source table and add replica regions. DynamoDB uses DynamoDB Streams internally to capture item-level change records and propagate them to all other replicas. This is why enabling Streams (specifically `NEW_AND_OLD_IMAGES`) is a prerequisite — without Streams, Global Tables cannot see the change feed to replicate.

Each replica is a full, independent copy of the table with its own provisioned capacity (or on-demand billing). Reads and writes to a replica are charged in that region's pricing. The replication traffic itself does not appear as a separate read/write charge, but the replicated write is applied to each destination table and consumes write capacity units there. In practice: a write to `us-east-1` propagates to `eu-west-1` and `ap-southeast-1`, consuming write capacity in all three regions.

The replication lag target is under one second for typical conditions. AWS does not publish a hard SLA on replication latency — for the exam, the answer is "typically under 1 second" or "sub-second." This means a user who writes in one region and immediately reads in another region from a different device may observe eventual consistency for a brief window. Applications that cannot tolerate any cross-region read-after-write inconsistency should route reads back to the same region as the write for that user session.

### Last-Writer-Wins Conflict Resolution

When two regions accept a write to the same item within the replication window, both writes will attempt to apply to all replicas. DynamoDB compares the `_timestamp` attribute (a system-managed microsecond timestamp set at write time) and keeps the write with the higher value. The losing write is discarded on all replicas — it is not merged, it does not raise an error, and the application is not notified.

This means: if your application in `us-east-1` sets `item.balance = 100` and simultaneously your application in `eu-west-1` sets `item.balance = 200`, one of those writes wins based on timestamps. Whichever process had the slightly higher timestamp keeps its value globally. The other process sees its write silently overwritten. For financial data, you must never allow two regions to write the same balance field without an application-level distributed lock or conditional expression strategy — or simply accept that Global Tables is not the right tool for that specific field.

### Single-Table Design: Overloaded Keys

In single-table design, every item in the table shares the same physical attribute names for its partition key (conventionally `PK`) and sort key (`SK`), but the values are type-prefixed strings that encode both the entity type and the entity identifier. A user profile might have `PK=USER#u-123` and `SK=PROFILE`. An order for that user might have `PK=USER#u-123` and `SK=ORDER#ord-456`. Both items live in the same table. A single `Query` with `KeyConditionExpression = "PK = :pk"` and `:pk = USER#u-123` returns both the user profile and all orders in one request — no application-side join, one network call.

The prefixes (`USER#`, `ORDER#`) serve two purposes: they prevent key collisions between entity types that might otherwise have overlapping IDs, and they allow sort key range queries. Because sort keys are sorted lexicographically, `SK BETWEEN "ORDER#" AND "ORDER$"` returns every order regardless of how many there are — the `$` character has a higher ASCII value than any digit or letter, so this range captures all `ORDER#...` sort keys cleanly.

### Access Pattern-First Modeling

The cardinal rule of DynamoDB design is: you must know your access patterns before you design the table. This is the opposite of relational design, where you normalize data into tables and use SQL JOINs to assemble any query at runtime. DynamoDB has no JOINs — the table structure either satisfies a query or it does not.

The design process:
1. List every access pattern the application will need (e.g., "get user by ID," "get all orders for a user," "get order by order ID," "find all users with email X," "list all pending orders sorted by creation date").
2. Assign each pattern to either the base table or a GSI.
3. Every pattern must map to a `Query` or `GetItem` — never a `Scan`. If any pattern requires a `Scan`, you are missing a GSI or a base table key design change.
4. Add attributes to items that exist only to enable GSI access patterns (a `status` attribute that only appears on PENDING items, for example).

### GSIs and Sparse Indexes

A Global Secondary Index (GSI) is a second key structure projected over the same items. GSIs allow you to query by an attribute that is not the base table partition key. A GSI has its own partition key and optional sort key, chosen from any item attributes.

A sparse GSI is one where only a subset of items carry the indexed attribute. DynamoDB only includes an item in a GSI if the item has the GSI's partition key attribute. This is a powerful modeling tool: add a `gsi1pk` attribute to items only when they reach a specific state, and the GSI only ever contains those items. For example, add `gsi1pk = "PENDING"` only to orders that are in PENDING status. The GSI stays small even if the base table has billions of completed orders. Polling workers Query the GSI, not the full table — constant-time lookups regardless of table size.

### Write Sharding for Hot Partitions

DynamoDB partitions data by partition key. If many items share the same partition key value, all writes to those items hit the same partition, potentially saturating its 1,000 write capacity unit limit. This is the "hot partition" problem. A common scenario: a `status` attribute with only a few distinct values (PENDING, ACTIVE, CLOSED). If most traffic writes to PENDING items, the PENDING partition becomes hot.

Write sharding solves this by appending a random or calculated suffix to the partition key, spreading writes across N logical shards: instead of `PK = STATUS#PENDING`, use `PK = STATUS#PENDING#<random 1–10>`. A write picks a random suffix; reads must query all 10 shards and merge results. This spreads 1,000 WCU across 10,000 WCU of capacity. The trade-off: reads are now N parallel Queries instead of one. For write-heavy scenarios, sharding is worth it. For read-heavy scenarios, evaluate whether the parallel-read overhead is acceptable or if a different key design is better.

## Configuration Reference

### Creating a Global Table (CLI)

```bash
# Step 1: Create the base table in us-east-1 with Streams enabled
# Streams must use NEW_AND_OLD_IMAGES for Global Tables replication
aws dynamodb create-table \
  --table-name GlobalOrdersTable \
  --attribute-definitions \
      AttributeName=PK,AttributeType=S \
      AttributeName=SK,AttributeType=S \
  --key-schema \
      AttributeName=PK,KeyType=HASH \
      AttributeName=SK,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST \
  --stream-specification StreamEnabled=true,StreamViewType=NEW_AND_OLD_IMAGES \
  --region us-east-1

# Step 2: Add replica regions to create the Global Table
# This converts the existing table into a Global Table and creates
# identical replica tables in eu-west-1 and ap-southeast-1
aws dynamodb update-table \
  --table-name GlobalOrdersTable \
  --replica-updates \
      '[{"Create": {"RegionName": "eu-west-1"}},
        {"Create": {"RegionName": "ap-southeast-1"}}]' \
  --region us-east-1
# Note: each replica inherits on-demand billing; provisioned requires
# specifying per-replica capacity in the replica configuration block

# Step 3: Verify replication status — wait for all replicas to show ACTIVE
aws dynamodb describe-table \
  --table-name GlobalOrdersTable \
  --region us-east-1 \
  --query 'Table.Replicas[*].{Region:RegionName,Status:ReplicaStatus}'
# Expected output:
# [
#   { "Region": "eu-west-1",       "Status": "ACTIVE" },
#   { "Region": "ap-southeast-1",  "Status": "ACTIVE" }
# ]
```

### Querying a Global Table from a Specific Region

```bash
# Write to eu-west-1 — no special flags needed, it's a normal DynamoDB write
aws dynamodb put-item \
  --table-name GlobalOrdersTable \
  --item '{
      "PK":     {"S": "USER#u-789"},
      "SK":     {"S": "ORDER#ord-001"},
      "status": {"S": "PENDING"},
      "amount": {"N": "149.99"},
      "region_origin": {"S": "eu-west-1"}
  }' \
  --region eu-west-1

# Read the same item from us-east-1 after replication (~<1s lag)
aws dynamodb get-item \
  --table-name GlobalOrdersTable \
  --key '{"PK": {"S": "USER#u-789"}, "SK": {"S": "ORDER#ord-001"}}' \
  --region us-east-1
# The item appears here within ~1 second of the eu-west-1 write
```

### Single-Table Design: Concrete Schema

The following schema stores three entity types — Users, Orders, and OrderItems — in one table, serving five access patterns.

```
Table: AppTable
PK (partition key)   SK (sort key)         Entity Type     Access Pattern Served
-------------------  --------------------  --------------  ---------------------------------
USER#<userId>        PROFILE               User            GetItem: get user by ID
USER#<userId>        ORDER#<orderId>       Order           Query PK=USER#: all orders for user
ORDER#<orderId>      ITEM#<itemId>         OrderItem       Query PK=ORDER#: all items in order
EMAIL#<email>        USER#<userId>         EmailLookup     GSI1: get user by email
PENDING#<shard>      <createdAt>#<orderId> PendingOrder    GSI2: poll next pending orders

GSI1: partition key = gsi1pk, sort key = gsi1sk
  → EMAIL#<email> items project userId for lookup

GSI2: partition key = gsi2pk, sort key = gsi2sk  (sparse — only PENDING items have gsi2pk)
  → Partition key = "PENDING#<shard>" (write sharding across 5 shards)
  → Sort key = <ISO8601 createdAt>#<orderId> (lexicographic sort = chronological sort)
```

```bash
# Write a User item
aws dynamodb put-item \
  --table-name AppTable \
  --item '{
      "PK":     {"S": "USER#u-123"},
      "SK":     {"S": "PROFILE"},
      "name":   {"S": "Alice"},
      "email":  {"S": "alice@example.com"},
      "gsi1pk": {"S": "EMAIL#alice@example.com"},
      "gsi1sk": {"S": "USER#u-123"}
  }'
# gsi1pk/gsi1sk present on every user item → GSI1 supports email lookup

# Write a PENDING Order item (write-sharded, gsi2pk present for sparse GSI2)
aws dynamodb put-item \
  --table-name AppTable \
  --item '{
      "PK":     {"S": "USER#u-123"},
      "SK":     {"S": "ORDER#ord-456"},
      "status": {"S": "PENDING"},
      "amount": {"N": "75.00"},
      "gsi2pk": {"S": "PENDING#3"},
      "gsi2sk": {"S": "2024-06-01T10:30:00Z#ord-456"}
  }'
# gsi2pk uses shard suffix #3 (random 1–5) → write sharding across 5 GSI2 partitions
# When order is fulfilled, remove gsi2pk/gsi2sk → item leaves sparse GSI2 automatically

# Query all orders for a user (base table — single round trip)
aws dynamodb query \
  --table-name AppTable \
  --key-condition-expression "PK = :pk AND begins_with(SK, :prefix)" \
  --expression-attribute-values '{
      ":pk":     {"S": "USER#u-123"},
      ":prefix": {"S": "ORDER#"}
  }'

# Look up a user by email (GSI1)
aws dynamodb query \
  --table-name AppTable \
  --index-name GSI1 \
  --key-condition-expression "gsi1pk = :email" \
  --expression-attribute-values '{":email": {"S": "EMAIL#alice@example.com"}}'

# Poll pending orders from one shard of sparse GSI2
aws dynamodb query \
  --table-name AppTable \
  --index-name GSI2 \
  --key-condition-expression "gsi2pk = :shard" \
  --expression-attribute-values '{":shard": {"S": "PENDING#3"}}' \
  --scan-index-forward true \
  --limit 25
# Repeat for shards 1–5 and merge in application to get full pending queue
```

## How to Decide

Use this table to choose between Global Tables configurations and single-table vs multi-table design.

| Scenario | Recommendation | Reason |
|---|---|---|
| Users in 3+ regions need <100ms reads AND writes | Global Tables active-active | Every region is writeable, no cross-region write latency |
| Only need low-latency reads globally, one write region | DynamoDB + CloudFront or read replicas | Simpler; Global Tables overkill if only reads are global |
| Two regions simultaneously write the same item field | Add application-level conditional writes or avoid Global Tables for that field | LWW will silently drop one write |
| Single region, need HA/DR across AZs | Standard DynamoDB (already multi-AZ by default) | Global Tables adds cost; AZ HA is built in |
| Access patterns fully known upfront, complex entity relationships | Single-table design | All patterns served in one Query; no multi-table joins |
| Access patterns evolving rapidly or team unfamiliar with DynamoDB | Start multi-table, migrate later | Simpler to reason about; avoid over-engineering early |
| High-cardinality partition key with skewed write distribution | Write sharding (random suffix) | Spread load across N partitions |
| Need to query a small subset of items efficiently | Sparse GSI (only qualifying items carry the GSI key) | Index stays small regardless of table size |

## How This Connects

- **DynamoDB Streams** are the underlying mechanism that Global Tables uses for replication — the same Streams feature used for Lambda triggers and CDC pipelines is what makes multi-region replication possible without a separate replication service.
- **GSIs and the base table** serve the same role as indexes in a relational database, but you design them around specific access patterns rather than inferring them from arbitrary queries — this tight coupling between schema and access pattern is the key conceptual difference from SQL.
- **Write sharding** is conceptually related to horizontal partitioning in any distributed system — spreading load by adding entropy to keys — the same principle behind S3 key prefix randomization and Kinesis partition key distribution.
- **Sparse indexes** connect to the idea of partial indexes in PostgreSQL — index only the rows that match a condition — enabling efficient queries on a minority subset without the overhead of indexing every row.
- **Single-table design** and its emphasis on Query-over-Scan directly reflects DynamoDB's pricing model: Scans read every item and consume capacity proportional to table size; Queries read only the items matching the key condition and scale with result size, not table size.

## Exam Traps

**"Global Tables requires you to designate a primary region."** False. Global Tables is active-active — every replica is equal. There is no primary region and no concept of failover between replicas. All regions can accept writes simultaneously.

**"Conflict resolution in Global Tables merges conflicting writes."** False. DynamoDB uses last-writer-wins — the write with the highest timestamp overwrites the other. There is no merge. One write is silently discarded. Applications that need merge semantics must implement them at the application layer.

**"You can add a replica to a Global Table without DynamoDB Streams."** False. Streams must be enabled with `NEW_AND_OLD_IMAGES` before you can create a Global Table or add replicas. Attempting to add a replica to a table without Streams returns an error.

**"Single-table design means you only ever need one GSI."** False. Single-table design means one base table, but complex schemas often require multiple GSIs (sometimes 5+) to serve all access patterns. The "single" refers to the number of tables, not the number of indexes.

**"A Scan on a small table is fine as a temporary solution."** Dangerous assumption. A Scan reads every item in the table and consumes read capacity proportional to table size. As the table grows, that Scan becomes progressively slower and more expensive. Design access patterns properly from the start — retrofitting a table design after it has 100 million items is painful.

## Summary

- DynamoDB Global Tables provides active-active multi-region replication with all replicas writeable and sub-second replication lag; it requires DynamoDB Streams with `NEW_AND_OLD_IMAGES`.
- Conflict resolution is last-writer-wins by timestamp — the write with the highest timestamp wins and the other is silently discarded; this is acceptable for most application data but not for fields requiring atomic cross-region updates.
- Single-table design stores all entity types in one DynamoDB table using overloaded generic keys (`PK`, `SK`) with type-prefixed values, enabling multi-entity retrieval in a single `Query`.
- Access pattern-first design is mandatory: list every access pattern, assign each to a base table `Query` or a GSI, and ensure no pattern requires a `Scan`.
- Sparse GSIs contain only items that carry the GSI partition key attribute — a powerful tool for efficiently querying minority subsets (e.g., only PENDING orders) without indexing the full table.
- Write sharding addresses hot partitions by appending a random suffix to partition keys, spreading writes across N logical shards at the cost of N parallel reads to reassemble results.

## Examples

A ride-sharing company serves drivers and riders across North America, Europe, and Asia. They deployed Global Tables with replicas in `us-east-1`, `eu-west-1`, and `ap-southeast-1`. When a London driver accepts a trip, the write lands in `eu-west-1` within 2ms and propagates to the other two regions within a second. The passenger's app in New York queries `us-east-1` and sees the updated booking status almost immediately. No routing logic was needed — every mobile client is pointed at its regional endpoint and the replication runs transparently. The only design decision was ensuring that driver availability writes (which two dispatchers might update simultaneously) used a conditional expression to prevent last-writer-wins from silently discarding a conflicting status update.

A SaaS billing platform originally used five DynamoDB tables: Accounts, Subscriptions, Invoices, LineItems, and PaymentMethods. Rendering a customer's billing dashboard required five separate `GetItem` calls in sequence, with each depending on IDs returned by the previous. P99 latency for the dashboard page was 85ms. After migrating to single-table design with `PK = ACCOUNT#<id>` as the common partition key, all five entity types for one account were co-located in the same partition. A single `Query` with `PK = ACCOUNT#<id>` retrieved everything at once. Dashboard P99 dropped to 12ms. The migration required re-writing the data access layer and rebuilding the table (since you cannot change the key schema in place), but the latency improvement justified the effort.

A flash-sale e-commerce platform had a `status` attribute on order items with values `QUEUED`, `PROCESSING`, and `SHIPPED`. During sales, thousands of orders per second arrived in `QUEUED` status. A single GSI partition key of `QUEUED` caused the GSI partition to exceed its capacity limit, throttling writes. The team added write sharding: `gsi2pk = QUEUED#<random 1-10>`. Worker processes queried all 10 shards in parallel using `Promise.all()` and merged results. The single overloaded partition became 10 partitions sharing the load, and throttling disappeared. When orders moved to `PROCESSING`, the `gsi2pk` attribute was removed from the item, automatically evicting it from the sparse GSI.

## Think About It

1. Global Tables uses last-writer-wins conflict resolution based on wall-clock timestamp. Two application servers in different regions both increment a counter on the same DynamoDB item at the same millisecond. What is the result, and how would you redesign the system to make concurrent increments safe?
2. In single-table design, all entity types share one table. When you need to restore a backup, you restore the entire table — you cannot selectively restore just the Orders entities without also restoring Users and everything else. How does this operational constraint affect your backup and disaster recovery strategy?
3. A sparse GSI only contains items that have the GSI partition key attribute. Your code has a bug and accidentally writes the `gsi2pk` attribute to a completed order that should not be in the PENDING GSI. How would you detect this and what would you do to fix it without a full table scan?
4. Write sharding spreads writes across N partitions but requires reading from all N shards to get a complete result set. At what write volume does sharding become worth the read complexity? What monitoring metric would you watch to know you have a hot partition problem?
5. The access pattern-first design process requires enumerating all queries before building the table. A new product requirement arrives six months after launch that requires a query your current table design cannot serve without a Scan. Walk through all the options for adding this access pattern and the trade-offs of each.

## Quick Check

**Q1.** You are creating a DynamoDB Global Table with replicas in three regions. You attempt to add a replica region but receive an error. Which of the following is the most likely cause?

- A) Global Tables requires provisioned capacity mode; your table uses on-demand billing
- B) DynamoDB Streams is not enabled on the source table
- C) The replica region does not support DynamoDB
- D) Global Tables requires at least five regions

**Answer: B** — Global Tables requires DynamoDB Streams with `NEW_AND_OLD_IMAGES` enabled. Without Streams, the replication mechanism has no change feed to consume. Enabling Streams is a prerequisite before adding replica regions.

**Q2.** In a single-table DynamoDB design, a user's profile has `PK=USER#u-1` and `SK=PROFILE`. The user's orders have `PK=USER#u-1` and `SK=ORDER#ord-X`. Which operation retrieves the user profile AND all orders in one request?

- A) `GetItem` with key `PK=USER#u-1`
- B) `Scan` with a filter on `PK=USER#u-1`
- C) `Query` with `KeyConditionExpression = "PK = :pk"` and `:pk = USER#u-1`
- D) Two separate `GetItem` calls combined with a `BatchGetItem`

**Answer: C** — A `Query` on the partition key `PK=USER#u-1` returns all items with that partition key value — the PROFILE item and all ORDER# items — in one request. `GetItem` requires the full primary key including sort key and cannot return multiple items.

**Q3.** A DynamoDB GSI has partition key `gsi1pk`. An item in the base table does not have the `gsi1pk` attribute. What happens to that item in the GSI?

- A) The item is added to the GSI with a null value for the partition key
- B) The item is not included in the GSI
- C) DynamoDB raises a validation error when the item is written
- D) The item appears in the GSI under a default partition called `__null__`

**Answer: B** — DynamoDB only projects an item into a GSI when the item contains the GSI's partition key attribute. Items missing that attribute are invisible in the GSI. This is exactly the sparse index pattern — only items with the attribute appear in the index.

## What's Next

Next up: ElastiCache — in-memory caching with Redis and Memcached, covering lazy loading, write-through patterns, cluster mode, and MemoryDB for Redis.
