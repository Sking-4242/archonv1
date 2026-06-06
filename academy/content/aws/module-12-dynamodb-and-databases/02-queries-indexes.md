---
title: "DynamoDB Queries, Scans, and Indexes"
type: content
estimated_minutes: 15
cert_tags: ["SAA-C03", "DVA-C02"]
---

# DynamoDB Queries, Scans, and Indexes

## Overview

Every data retrieval decision in DynamoDB comes down to a single question: which key am I using to find this data? DynamoDB is not SQL — there is no query planner, no optimizer, and no way to filter by an arbitrary attribute without either scanning the entire table or creating an index. This constraint forces a discipline that most relational database developers find uncomfortable at first: you design your indexes around your access patterns, not your data model. The payoff is predictable, sub-millisecond performance at any scale, because DynamoDB always knows exactly where to look.

This lesson covers the two fundamental retrieval operations — Query and Scan — and the two index types that extend your key space: Global Secondary Indexes (GSIs) and Local Secondary Indexes (LSIs). Understanding the difference between these is one of the most heavily tested areas on both DVA-C02 and SAA-C03. The wrong choice between a GSI and an LSI (or between Query and Scan) is the kind of architectural mistake that shows up as unexpectedly high costs, throttling, or stale data in production.

Filter Expressions are a common source of confusion and deserve special attention: they reduce the items returned to your application but do not reduce the RCUs consumed. All reads happen before the filter is applied. This is counterintuitive to developers coming from SQL, where a WHERE clause drives index selection and eliminates work at the storage layer. In DynamoDB, only KeyConditionExpressions (partition key equality plus an optional sort key condition) reduce the actual amount of data read.

## Core Concepts

### Query: Targeted Reads Within a Partition

A **Query** operation reads all items that share a given partition key value, optionally narrowing the result by a sort key condition. Because DynamoDB physically co-locates items with the same partition key, a Query is a bounded, sequential read — it reads only the data that matches, not the whole table. The cost is proportional to the bytes returned (rounded to 4 KB), not the size of the table.

Query requirements: you must provide an exact equality condition on the partition key (`KeyConditionExpression = "partition_key = :val"`). The sort key condition is optional and can use `=`, `<`, `<=`, `>`, `>=`, `BETWEEN`, or `begins_with`. You cannot use `contains` or `ends_with` in a key condition — those require a Filter Expression applied after the read.

Query results are returned in sort key order by default (ascending). Set `ScanIndexForward=false` to reverse the order (most recent first — useful for timelines).

**Filter Expressions on Query**: after DynamoDB reads all matching partition key items, it applies the filter expression to the result set before returning items to you. You are billed for all items read, not just items that pass the filter. If your Query matches 500 items but your filter passes only 10, you still pay for 500 items worth of RCUs.

### Scan: Full-Table Reads (Use With Caution)

A **Scan** reads every item in the table (or every item in an index) and optionally applies a filter expression. Cost is proportional to the total table size — it does not matter how few items your filter passes. A Scan on a 500 GB table that returns 1 item still reads 500 GB worth of data and consumes the corresponding RCUs (and time).

Legitimate uses for Scan: exporting the full table for a backup or migration, small tables (< a few thousand items) where the scan cost is trivial, or one-time data analysis where you explicitly accept the cost. Never run a Scan in an application hot path — add a GSI instead.

**Parallel Scan**: DynamoDB supports dividing the table into segments and scanning each segment with a separate worker in parallel (set `TotalSegments` and `Segment` on each worker). This reduces wall-clock time but does not reduce total RCU consumption — it just spreads the work across threads. Useful for data export pipelines.

### Global Secondary Indexes (GSI)

A **GSI** is a completely independent index with its own partition key and optional sort key — neither needs to match the base table's key. DynamoDB maintains the GSI automatically: as you write items to the base table, DynamoDB asynchronously replicates the projected attributes to the GSI.

Key GSI properties:
- Can be **created or deleted at any time** (unlike LSIs, which are immutable after table creation).
- Reads from a GSI are **always eventually consistent** — no `ConsistentRead=true` option is available on a GSI.
- GSIs have **their own provisioned or on-demand capacity** independent of the base table. A write to the base table that modifies a GSI-projected attribute consumes WCUs from the GSI as well.
- Up to **20 GSIs per table** (soft limit, can be raised).
- **Sparse indexes**: if an item does not contain the GSI's partition key attribute, it is simply not projected into the GSI. This is intentional and useful — create a GSI on an attribute only some items have to build an efficient index over just that subset.

GSI write amplification is a real cost and throttling risk. If your GSI is on Provisioned mode and you write to the base table faster than the GSI can absorb, the base table write will be throttled waiting for the GSI. Size GSI capacity at least as generously as the base table.

### Local Secondary Indexes (LSI)

An **LSI** shares the base table's partition key but uses a different sort key. It is physically co-located with the base table's partition data, which enables features GSIs cannot support:
- LSIs support **strongly consistent reads** (`ConsistentRead=true` works on LSI queries).
- LSIs share the base table's provisioned capacity — no separate WCU/RCU provisioning.

LSI constraints:
- **Must be created at table creation time.** You cannot add an LSI to an existing table. If you need one on an existing table, you must create a new table and migrate data.
- **Maximum 5 LSIs per table**.
- **10 GB per-partition limit** (combined size of base table items + all LSI projections for items sharing the same partition key). This is a hard limit, not adjustable.
- Up to 20 LSI projections per partition key value before the 10 GB limit becomes a practical concern.

When to choose LSI over GSI: you need strong consistency on reads from an alternate sort key, and you defined the index at table creation. In practice, GSIs are far more commonly used because of their flexibility.

### Projection Types

When creating a GSI or LSI, you specify which attributes are copied into the index:

- **ALL**: every attribute from the base table item is projected. Queries against the index return complete items. Highest storage cost and write amplification.
- **KEYS_ONLY**: only the base table's primary key attributes and the index's key attributes are projected. Lowest cost. If your application needs non-key attributes, it must make a separate GetItem call to the base table.
- **INCLUDE**: you specify an explicit list of non-key attributes to project in addition to the key attributes. Best for queries that need a small, known set of attributes — lower cost than ALL while avoiding the extra GetItem round trip.

Project the minimum attributes your queries need. Over-projecting to ALL is the most common index design mistake — it doubles write cost (base table write + index replication) for no performance benefit if your queries only need the keys.

### Sparse Indexes (GSI Overloading Pattern)

Because DynamoDB only projects an item into a GSI if that item contains the GSI's partition key attribute, you can use **sparse indexes** to efficiently index a subset of items. For example, if only orders with `status=SHIPPED` have a `shipped_at` attribute, creating a GSI on `shipped_at` produces an index containing only shipped orders — no filter expression needed, no wasted reads on unshipped items.

**GSI overloading** takes this further: use a generic attribute name (like `gsi1pk` and `gsi1sk`) and populate it with different values depending on the item type. A users table might set `gsi1pk = "EMAIL#seth@example.com"` for user items and `gsi1pk = "ORG#org-42"` for org-member items, creating a single GSI that serves multiple access patterns. This is a key pattern in single-table DynamoDB design.

## Configuration Reference

### Query with KeyConditionExpression

```bash
aws dynamodb query \
  --table-name Orders \
  --key-condition-expression "customer_id = :cid AND order_timestamp BETWEEN :start AND :end" \
  --expression-attribute-values '{
    ":cid":   {"S": "usr-8821"},
    ":start": {"S": "2025-01-01T00:00:00Z"},
    ":end":   {"S": "2025-03-31T23:59:59Z"}
  }' \
  --scan-index-forward false \     # return results newest-first
  --projection-expression "order_timestamp, total_amount, #st" \
  --expression-attribute-names '{"#st": "status"}' \
  --region us-east-1
```

`--scan-index-forward false` reverses sort key order — most recent first. `--projection-expression` limits which attributes come back (does not reduce RCU cost for a Query — you're billed for full item reads, but reduces network transfer).

### Scan with FilterExpression

```bash
aws dynamodb scan \
  --table-name Orders \
  --filter-expression "#st = :status" \    # applied AFTER reading all items
  --expression-attribute-names '{"#st": "status"}' \
  --expression-attribute-values '{":status": {"S": "PLACED"}}' \
  --region us-east-1
```

Note: `--filter-expression` does not reduce RCU consumption. Every item in the table is read regardless. Add a GSI on `status` if you need to query by status efficiently.

### Create a Table with a GSI

```bash
aws dynamodb create-table \
  --table-name Orders \
  --attribute-definitions \
      AttributeName=customer_id,AttributeType=S \       # base table partition key
      AttributeName=order_timestamp,AttributeType=S \   # base table sort key
      AttributeName=customer_email,AttributeType=S \    # GSI partition key
      AttributeName=status,AttributeType=S \            # GSI sort key
  --key-schema \
      AttributeName=customer_id,KeyType=HASH \
      AttributeName=order_timestamp,KeyType=RANGE \
  --global-secondary-indexes '[
    {
      "IndexName": "email-status-index",
      "KeySchema": [
        {"AttributeName": "customer_email", "KeyType": "HASH"},
        {"AttributeName": "status",         "KeyType": "RANGE"}
      ],
      "Projection": {
        "ProjectionType": "INCLUDE",
        "NonKeyAttributes": ["total_amount", "order_timestamp"]
      },
      "ProvisionedThroughput": {
        "ReadCapacityUnits": 50,
        "WriteCapacityUnits": 50
      }
    }
  ]' \
  --billing-mode PROVISIONED \
  --provisioned-throughput ReadCapacityUnits=100,WriteCapacityUnits=100 \
  --region us-east-1
```

Only attributes used as keys (base table or index) need to appear in `--attribute-definitions`. Projected non-key attributes (`total_amount`, `order_timestamp`) do not.

### Add a GSI to an Existing Table

```bash
aws dynamodb update-table \
  --table-name Orders \
  --attribute-definitions \
      AttributeName=customer_email,AttributeType=S \
  --global-secondary-index-updates '[
    {
      "Create": {
        "IndexName": "email-index",
        "KeySchema": [
          {"AttributeName": "customer_email", "KeyType": "HASH"}
        ],
        "Projection": {"ProjectionType": "KEYS_ONLY"},
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 25,
          "WriteCapacityUnits": 25
        }
      }
    }
  ]' \
  --region us-east-1
```

This is not possible for LSIs — LSIs can only be defined at `create-table` time.

### Query Against a GSI

```bash
aws dynamodb query \
  --table-name Orders \
  --index-name email-status-index \            # specify the GSI name
  --key-condition-expression "customer_email = :email AND #st = :status" \
  --expression-attribute-names '{"#st": "status"}' \
  --expression-attribute-values '{
    ":email":  {"S": "user@example.com"},
    ":status": {"S": "PLACED"}
  }' \
  --region us-east-1
```

Adding `--index-name` routes the Query to the GSI. Results are always eventually consistent from a GSI.

### Console Path

DynamoDB → **Tables** → select table → **Indexes** tab → **Create index** → enter Partition key and optional Sort key → choose Projection type → set capacity → **Create index**.

For LSIs: DynamoDB → **Tables** → **Create table** → expand **Table settings** → **Customize settings** → scroll to **Local secondary indexes** → Add index (only available during table creation, greyed out on existing tables).

## How to Decide

| Requirement | Use |
|---|---|
| Retrieve all items for a known partition key value | Query on base table |
| Retrieve a sorted range of items within a partition | Query with sort key condition (`BETWEEN`, `begins_with`) |
| Need to look up items by an attribute that isn't the primary key | GSI on that attribute |
| Need alternate sort key with strong consistency | LSI (must plan at table creation) |
| Table is small (< 1,000 items) and you need a one-time export | Scan is acceptable |
| Attribute exists on only some items, want efficient index over that subset | Sparse GSI |
| Multiple different access patterns, want to minimize indexes | GSI overloading with generic key names (`gsi1pk`, `gsi1sk`) |
| Need to query by status field (low cardinality, hot writes) | GSI on `status` + shard suffix to avoid hot partitions |
| Strong consistency is required on a non-primary-key attribute | LSI — the only index type supporting `ConsistentRead=true` |

## How This Connects

- **RCU/WCU math from Lesson 1** applies directly here: Query cost = bytes of matching items (rounded up to 4 KB), halved for eventual consistency. Filter Expressions do not change this math — they only reduce the response payload.
- **GSI capacity** is billed separately from the base table in Provisioned mode. A write to the base table that touches GSI-projected attributes generates a write to the GSI, consuming WCUs from the GSI's allocation. Under-provisioning the GSI throttles base table writes.
- **DynamoDB Streams** (Lesson 3) fire on base table writes. GSI replication happens asynchronously and does not fire separate stream events — stream records reflect the base table operation, not the GSI update.
- **DAX caches** (Lesson 3) can cache Query results from GSIs and LSIs, not just base table GetItem calls. Cache invalidation is item-level — a write to an item invalidates that item's cached response.
- **Single-table design** — the advanced pattern of storing multiple entity types in one table — relies heavily on GSI overloading and sparse indexes to serve all access patterns without separate tables.

## Exam Traps

**"A Filter Expression reduces the RCUs consumed by a Scan."** False and heavily tested. A Filter Expression reduces the items returned to the application, but DynamoDB reads every item in the table before applying the filter. You pay for the full read. The only way to reduce read cost is to use a Query with a KeyConditionExpression or to add an index.

**"You can add an LSI to an existing table."** False. LSIs must be defined at table creation and are immutable afterward. If you need a new LSI on an existing table, you must create a new table with the LSI defined and migrate the data. GSIs, by contrast, can be added or deleted at any time.

**"GSIs support strongly consistent reads."** False. GSIs are always eventually consistent. If you need strongly consistent reads from an alternate sort key, you must use an LSI — and plan for it at table creation time. This distinction catches many candidates.

**"The 10 GB per-partition limit applies to GSIs."** The 10 GB limit applies to LSIs (combined base table + LSI projection data per partition key value). GSIs have no equivalent per-partition size limit. Confusing these two index types under the 10 GB constraint is a common error.

**"Projecting ALL attributes into a GSI is always safe because DynamoDB handles the replication."** Projecting ALL doubles (or more) your write amplification and storage cost. Each base table write that changes a projected attribute triggers a corresponding GSI write. If your GSI is under-provisioned for this amplified write traffic, you will see base table write throttling — an unexpected source of throttles that is easy to miss if you're only watching base table metrics.

## Summary

- **Query** is the correct default: it reads only items matching a partition key (and optional sort key condition), costing RCUs proportional to bytes read, not table size.
- **Scan** reads the entire table before filtering and should be avoided in hot paths — add a GSI instead.
- **Filter Expressions** apply after reads and do not reduce RCU consumption; only KeyConditionExpressions reduce the actual data read.
- **GSIs** define an entirely new partition key, can be added at any time, support only eventual consistency, and have their own capacity allocation separate from the base table.
- **LSIs** share the base table's partition key with an alternate sort key, must be created at table creation, support strongly consistent reads, share the base table's capacity, and have a 10 GB per-partition data limit.
- **Sparse indexes** and **GSI overloading** are advanced patterns that reduce index count and cost while serving multiple access patterns from a single GSI.

## Examples

A multi-tenant SaaS product stores all customer activity records in a single DynamoDB table using `tenant_id` as the partition key and `activity_timestamp` as the sort key. When the product analytics team needed to pull all records for a specific tenant within a date range, a Query with a BETWEEN sort key condition on `activity_timestamp` returned the data in milliseconds at a cost proportional to that tenant's data — not the whole table. A competitor's team had built a similar feature using Scan with a FilterExpression and was burning through 10,000 RCUs per request on their 50 GB table, filtering down to the same 200 records. The architectural difference was a single design decision: composite key versus simple key with scan.

An online marketplace needed to look up orders by customer email address even though the base table used `order_id` as its partition key. They added a GSI with `customer_email` as the partition key and `created_at` as the sort key, projecting `order_id`, `status`, and `total_amount` (INCLUDE projection — three specific attributes rather than ALL). When a customer logs in and requests their order history, a single GSI Query returns all their orders sorted by date with only the attributes the UI needs, at no extra GetItem round trips and at minimal storage cost. DynamoDB maintains the GSI automatically — the development team wrote no replication code.

A real-time analytics startup discovered their write throughput was being throttled on the base table even though base table WCU utilization looked healthy in CloudWatch. The actual bottleneck was a GSI they had configured with only 10 WCUs. Every base table write projected four attributes into the GSI, consuming 4x the base table WCU equivalent against the GSI's 10 WCU allocation. Because the GSI was undersized, writes stalled waiting for GSI capacity, which throttled the base table writes too. The fix was scaling the GSI's provisioned WCUs to match the write amplification factor. The lesson: always monitor GSI CloudWatch metrics (ConsumedWriteCapacityUnits for each index, not just the table) and size GSI capacity to absorb the projected write amplification.

## Think About It

1. You have a 200 GB DynamoDB table and you run a Scan with a FilterExpression that passes only 50 items. How many RCUs does this consume, approximately? What would you do differently to serve this access pattern efficiently?
2. You need to retrieve all orders with `status = "SHIPPED"` for a given customer. Your base table has `customer_id` as partition key and `order_timestamp` as sort key. What are your options — Filter Expression on a Query, GSI, LSI — and what are the trade-offs of each?
3. GSIs are eventually consistent. Describe a scenario where this eventually consistent behavior would cause a correctness problem in your application, and explain how you would mitigate it.
4. You're designing a table for a messaging app. Each message has a `conversation_id`, a `sender_id`, and a `sent_at` timestamp. You need to (a) fetch all messages in a conversation in order, and (b) fetch all messages sent by a specific user. How many indexes do you need, and what type are they?
5. What is a sparse index, and why would you prefer it over creating a GSI with a FilterExpression that achieves the same filtering result?

## Quick Check

**Q1.** A DynamoDB Scan runs against a 40 GB table with eventually consistent reads. The FilterExpression passes 5 items totaling 2 KB. Approximately how many RCUs does this Scan consume?

- A) 1 RCU (only the 5 matching items are read)
- B) 5 RCUs (one per matching item)
- C) ~5,000,000 RCUs (all 40 GB is read before filtering)
- D) 0 RCUs (Scans are free in On-Demand mode)

**Answer: C** — A Scan reads the entire table. 40 GB = 40 × 1,024 × 1,024 KB. Eventually consistent reads: `ceil(total_KB / 4) / 2`. The filter is applied after reading all 40 GB — it has no effect on RCU cost.

**Q2.** Which of the following is a correct statement about Local Secondary Indexes?

- A) LSIs support strongly consistent reads and can be added to an existing table at any time.
- B) LSIs support strongly consistent reads but must be created at table creation time.
- C) LSIs have their own separate WCU/RCU capacity and are always eventually consistent.
- D) LSIs allow a completely different partition key from the base table.

**Answer: B** — LSIs share the base table's partition key, support strongly consistent reads, share the base table's capacity, and must be defined at table creation. They cannot be added later.

**Q3.** You query a GSI with `ConsistentRead=true`. What happens?

- A) The request succeeds and returns strongly consistent results from the GSI.
- B) DynamoDB automatically falls back to querying the base table instead.
- C) DynamoDB returns a ValidationException — consistent reads are not supported on GSIs.
- D) The request succeeds but is billed at 2x RCU regardless.

**Answer: C** — DynamoDB does not support `ConsistentRead=true` on GSIs. Attempting it returns a `ValidationException`. Only the base table and LSIs support strongly consistent reads.

## What's Next

Next up: DynamoDB Streams, Transactions, and DAX — event-driven change capture, ACID multi-item operations, and in-memory acceleration for hot-read workloads.
