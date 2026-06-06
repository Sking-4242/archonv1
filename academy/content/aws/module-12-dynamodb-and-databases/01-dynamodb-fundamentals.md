---
title: "DynamoDB Fundamentals: Tables, Items, Keys, and Capacity"
type: content
estimated_minutes: 15
cert_tags: ["SAA-C03", "DVA-C02", "CLF-C02"]
---

# DynamoDB Fundamentals: Tables, Items, Keys, and Capacity

## Overview

Amazon DynamoDB is a fully managed, serverless NoSQL database that delivers single-digit millisecond performance at any scale. It combines a key-value store (fast point lookups by primary key) with a document store (rich item structures using nested maps, lists, and sets). There are no servers to provision, no OS patches to apply, no connection pools to tune, and no storage limits to plan around — AWS handles all of that. You define a table, choose a primary key, and start writing items. DynamoDB scales storage automatically as your data grows and can sustain millions of requests per second without configuration changes on your part.

What makes DynamoDB architecturally distinct from SQL is its intentional schemalessness at the item level. You define the primary key structure at table creation — that is the only enforced schema. Every other attribute on every item is optional, variable in type, and invisible to DynamoDB's storage layer beyond what you write. Two items in the same table can look completely different from each other. This flexibility is powerful, but it means you must design your data model around your access patterns upfront rather than querying any attribute freely. DynamoDB does not support joins, aggregations, or ad-hoc queries — if you want to retrieve data by something other than the primary key, you need a secondary index.

DynamoDB is the AWS database of choice for serverless architectures, high-traffic web APIs, gaming leaderboards, session stores, IoT time-series data, and any workload that requires low latency at unpredictable scale. It is prominently tested on both DVA-C02 and SAA-C03 because it sits at the intersection of application development patterns (streams, transactions, caching) and architectural decisions (capacity planning, consistency models, cost trade-offs). Understanding the data model deeply — particularly how partition keys drive physical placement — is the foundation everything else builds on.

## Core Concepts

### Tables, Items, and Attributes

A DynamoDB **table** is a top-level namespace for your data. A table contains **items** (analogous to rows in SQL), and each item contains **attributes** (analogous to columns, but optional and schema-free). The only required attribute on every item is the primary key. Everything else is up to the application.

Attribute types fall into three categories: scalar types (String `S`, Number `N`, Binary `B`, Boolean `BOOL`, Null `NULL`), document types (List `L` for ordered mixed-type sequences, Map `M` for nested key-value objects), and set types (StringSet `SS`, NumberSet `NS`, BinarySet `BS` — unordered collections of unique values of the same type). Sets are useful for things like tag lists or permission flags; maps let you embed rich structured objects directly inside an item.

The hard limit is **400 KB per item**, including all attribute names and their values. This limit catches developers who try to grow an item indefinitely — appending audit history, storing large blobs, or denormalizing too aggressively into a single item. The design response is to flatten: make each event its own item rather than appending to an existing one.

### Partition Key (Hash Key)

The **partition key** is the primary dimension of your data model. DynamoDB applies an internal hash function to the partition key value to determine which physical partition stores that item. Items with the same partition key land on the same partition and are stored together. This is why partition key choice is critical for performance: if all your writes target the same partition key value (a "hot partition"), you concentrate all throughput on one physical node and hit throttling limits even when the rest of your table is idle.

A good partition key has high cardinality (many distinct values), distributes reads and writes evenly, and maps cleanly to the dominant access pattern. User IDs, order IDs, device IDs, and session tokens are typical choices. Avoid status fields (`ACTIVE`, `PENDING`), date-only values with heavy write concurrency, or any attribute where one value will dominate traffic.

When the primary key is partition key only (called a **simple primary key**), the partition key value must be unique across the table — no two items can share it.

### Sort Key (Range Key) and Composite Primary Keys

Adding a **sort key** creates a **composite primary key** (partition key + sort key). Within a single partition, DynamoDB physically orders items by their sort key value. This enables efficient range queries: retrieve all items for a given partition key where the sort key falls between two values, starts with a prefix, begins with a string, and so on.

The combination of partition key + sort key must be unique across the table. Multiple items can share the same partition key as long as their sort keys differ. This is the mechanism behind one-to-many modeling in DynamoDB: store all orders for a customer under `customer_id` (partition key) with `order_timestamp` as the sort key, and a single Query retrieves all orders for that customer in date order.

Sort key condition operators in Query: `=`, `<`, `<=`, `>`, `>=`, `BETWEEN`, and `begins_with`. These are evaluated against sorted data — they do not require scanning. This is fundamentally different from a Filter Expression (which applies after all matching partition key items are read) and is much cheaper.

### On-Demand vs. Provisioned Capacity Modes

DynamoDB offers two capacity modes, and choosing the right one is a direct exam topic.

**Provisioned mode**: You specify Read Capacity Units (RCUs) and Write Capacity Units (WCUs). DynamoDB reserves that throughput. You can enable Auto Scaling to adjust provisioned capacity automatically based on utilization targets. Best for predictable, steady-state workloads where you can estimate throughput and want to optimize cost.

**On-Demand mode**: No capacity planning. DynamoDB handles any request volume automatically. You pay per request: currently approximately $1.25 per million write request units and $0.25 per million read request units (prices vary by region). Best for new tables with unknown traffic, workloads with large spikes, and development/test tables.

You can switch a table between modes up to twice per day. If you have a table that spikes heavily once a day (nightly batch, marketing blast), consider whether the per-request premium during the spike is cheaper than provisioning for peak.

### Read Capacity Units (RCUs) and Write Capacity Units (WCUs)

These units are the billing and throttling currency of DynamoDB. Getting the math right is a common exam scenario.

**1 RCU** = one strongly consistent read per second of an item up to **4 KB**. For eventually consistent reads, 1 RCU covers **two** reads per second of items up to 4 KB (i.e., 0.5 RCU per eventually consistent read).

**1 WCU** = one write per second of an item up to **1 KB**. Writes are always strongly consistent and there is no eventual-consistency discount on writes.

Item sizes are rounded up to the nearest unit boundary. An 8.5 KB item requires 3 RCUs for a strongly consistent read (ceil(8.5 / 4) = 3), 1.5 RCUs for eventually consistent, and 9 WCUs for a write (ceil(8.5 / 1) = 9).

### Strongly Consistent vs. Eventually Consistent Reads

DynamoDB replicates data across multiple Availability Zones. By default, reads are **eventually consistent** — DynamoDB may route your read to a replica that hasn't received the very latest write, returning data that is up to a second old. For most use cases (shopping carts, social feeds, leaderboards) this is acceptable.

Setting `ConsistentRead=true` on a GetItem or Query request forces a **strongly consistent read** — DynamoDB routes the read to the partition leader and guarantees you see all writes that completed before the read. This costs 2x the RCUs (or equivalently, the eventual consistency discount disappears). Strong consistency is required for financial balances, inventory counts, and anything where a stale read would cause a correctness problem. Note: GSIs do not support strongly consistent reads at all — only the base table and LSIs support it.

## Configuration Reference

### Create a Table with Partition Key and Sort Key

```bash
aws dynamodb create-table \
  --table-name Orders \
  --attribute-definitions \
      AttributeName=customer_id,AttributeType=S \   # partition key — String
      AttributeName=order_timestamp,AttributeType=S \ # sort key — String (ISO-8601)
  --key-schema \
      AttributeName=customer_id,KeyType=HASH \       # HASH = partition key
      AttributeName=order_timestamp,KeyType=RANGE \  # RANGE = sort key
  --billing-mode PAY_PER_REQUEST \                   # On-Demand mode
  --region us-east-1
```

For Provisioned mode, replace `--billing-mode PAY_PER_REQUEST` with:

```bash
  --billing-mode PROVISIONED \
  --provisioned-throughput ReadCapacityUnits=100,WriteCapacityUnits=50
```

`--attribute-definitions` only needs to list attributes used in key schema or index definitions — not every attribute on your items.

### Write an Item

```bash
aws dynamodb put-item \
  --table-name Orders \
  --item '{
    "customer_id":     {"S": "usr-8821"},
    "order_timestamp": {"S": "2025-03-14T09:00:00Z"},
    "total_amount":    {"N": "129.99"},
    "status":          {"S": "PLACED"},
    "items":           {"L": [
      {"M": {"sku": {"S": "SHOE-42"}, "qty": {"N": "1"}}}
    ]}
  }' \
  --region us-east-1
```

Note the explicit type descriptors (`"S"`, `"N"`, `"L"`, `"M"`) — this is the DynamoDB wire format. AWS SDKs (like the JavaScript DocumentClient or Python boto3 with `TypeDeserializer`) abstract these away.

### Read an Item (Strongly Consistent)

```bash
aws dynamodb get-item \
  --table-name Orders \
  --key '{
    "customer_id":     {"S": "usr-8821"},
    "order_timestamp": {"S": "2025-03-14T09:00:00Z"}
  }' \
  --consistent-read \        # forces strongly consistent read (2x RCU)
  --projection-expression "total_amount, #st" \   # only fetch these attributes
  --expression-attribute-names '{"#st": "status"}' \  # alias reserved word
  --region us-east-1
```

### Calculate RCUs and WCUs

For a **12 KB item**:
- Strongly consistent read: `ceil(12 / 4) = 3 RCUs`
- Eventually consistent read: `ceil(12 / 4) / 2 = 1.5 RCUs`
- Write: `ceil(12 / 1) = 12 WCUs`

If you need to serve **500 strongly consistent reads/second** of that 12 KB item:
- Required RCUs: `500 × 3 = 1,500 RCUs`

### Console Path

DynamoDB → **Tables** → **Create table** → enter Table name and Partition key → optionally add Sort key → under **Table settings** choose **Customize settings** → select **On-demand** or **Provisioned** capacity → **Create table**.

## How to Decide

| Scenario | Recommendation |
|---|---|
| Unknown or highly variable traffic | On-Demand mode |
| Steady, predictable throughput | Provisioned + Auto Scaling |
| Large burst once daily (e.g., nightly batch) | Compare: On-Demand per-request cost vs. Provisioned peak RCU/WCU × hours — whichever is cheaper |
| New table in development | On-Demand — no throttling risk while access patterns are unknown |
| Multiple items sharing a logical parent (orders per customer) | Composite key (partition + sort) |
| One item per entity, pure point lookups | Simple partition key only |
| Cannot tolerate any stale reads | `ConsistentRead=true` — accept 2x RCU cost |
| Stale reads acceptable (most web apps) | Default eventually consistent — save 50% on reads |
| Item approaching 400 KB | Redesign: break into multiple items or store large blobs in S3 with a DynamoDB pointer |

## How This Connects

- **Secondary indexes (GSI/LSI)** build on the primary key model — a GSI defines its own partition key and is governed by the same RCU/WCU billing and hash distribution rules covered here.
- **DynamoDB Streams** emit change records keyed by partition and sort key; understanding the data model helps you process stream records correctly.
- **DAX (DynamoDB Accelerator)** caches GetItem and Query responses — its cache invalidation is tied to item-level writes, which map directly to the primary key structure.
- **Transactions (TransactWriteItems)** apply ACID guarantees across items; the 2x WCU cost is additive on top of the WCU math covered here.
- **IAM and resource-based policies** can grant access at the table level or use condition keys scoped to specific partition key values — key design influences security boundaries.

## Exam Traps

**"On-Demand is always more expensive."** False. On-Demand is cheaper for spiky, low-average-utilization workloads. If your Provisioned table sits at 10% utilization most of the day, you are paying for 90% idle capacity. Run the math for your specific traffic shape.

**"Strongly consistent reads are the default."** False. Eventually consistent reads are the default. You must explicitly set `ConsistentRead=true` to get strong consistency. Many candidates assume consistency is automatic and miss that the default can return stale data.

**"The sort key is optional and adding it doesn't change uniqueness rules."** Misleading. With a composite key, the uniqueness constraint shifts from the partition key alone to the (partition key, sort key) pair. Two items can share a partition key as long as their sort keys differ — this is intentional and enables one-to-many data models.

**"400 KB is the table row limit, not the item limit."** The 400 KB limit applies per item, including all attribute names (not just values). Verbose attribute names eat into your budget. A common mistake is growing a single item by appending history — each append compounds toward the limit.

**"You can add attribute definitions for all your item attributes in create-table."** DynamoDB's `--attribute-definitions` flag in CLI (and the equivalent API parameter) only accepts attributes that appear in key schema or index definitions. Attempting to define non-key attributes there is an error. All other attributes are schemaless — they exist only in the items themselves.

## Summary

- DynamoDB is a fully managed, schemaless key-value + document NoSQL database with single-digit millisecond latency and no infrastructure to manage.
- Every table requires a primary key: either a simple partition key (unique per item) or a composite partition key + sort key (unique pair per item, items with the same partition key are grouped and sorted).
- DynamoDB hashes the partition key to determine physical placement — high cardinality and even distribution are essential to avoid hot partitions and throttling.
- On-Demand capacity charges per request (no planning, higher per-unit cost); Provisioned capacity pre-allocates RCUs/WCUs (lower cost for predictable workloads, risk of throttling if undersized).
- 1 RCU = 1 strongly consistent read of up to 4 KB (or 2 eventually consistent reads); 1 WCU = 1 write of up to 1 KB. Item sizes round up to the next boundary.
- Items are hard-limited to 400 KB including attribute names; design around this by normalizing events into individual items rather than appending to a single large item.

## Examples

A social gaming company launched a mobile leaderboard expecting viral traffic spikes tied to influencer posts. They chose DynamoDB in On-Demand mode with `player_id` as the partition key and `game_id` as the sort key. During a celebrity shoutout, write traffic jumped 400x in under two minutes. Because On-Demand mode has no capacity ceiling, DynamoDB absorbed the spike without any throttle errors or manual intervention. Had they been on Provisioned mode with Auto Scaling, the scale-up lag (typically a few minutes) would have caused throttling at peak. The tradeoff: they paid a higher per-request rate during the spike, but avoided the engineering cost of capacity prediction and the customer-experience cost of throttled writes.

A financial services firm built a trade-confirmation audit log where every trade event is its own DynamoDB item. The key schema uses `account_id` as the partition key and `event_timestamp#event_id` as the sort key (a composite sort key pattern that ensures uniqueness even for sub-millisecond events). Reads use `ConsistentRead=true` because their compliance controls require that an auditor's read reflects all confirmed trades — stale reads are not acceptable in a regulated context. The team calculated that at their write volume (10 KB average item, 200 writes/second), they needed `ceil(10 / 1) × 200 = 2,000 WCUs` provisioned — well within the limit, and predictable enough to use Provisioned mode with Auto Scaling rather than paying On-Demand rates.

An IoT platform ingesting sensor telemetry ran into the 400 KB item limit after a developer tried to store all readings for a device in a single item by appending to a List attribute. Each new reading pushed the item size up by a few hundred bytes; at a one-second sampling rate the item hit 400 KB in under an hour. The fix was straightforward: each sensor reading became its own item (`device_id` as partition key, `reading_timestamp` as sort key). This also improved query efficiency — fetching the last 60 readings was a single bounded Query rather than deserializing a massive list and slicing it in application code.

## Think About It

1. DynamoDB hashes partition key values to distribute items across physical partitions. If you chose `created_date` (e.g., `"2025-03-14"`) as your partition key for a high-write table, what would happen to performance as all writes for a given day land on the same partition? How would you fix it?
2. You have a workload that needs 800 WCUs for one hour each night and zero the rest of the day. Model the monthly cost under Provisioned (minimum 1 WCU always-on, and 800 during the spike) vs. On-Demand (pay per write, assume 1 million writes during the nightly batch). Which wins, and what would change your answer?
3. Two items in the same table: `{customer_id: "A", order_id: "1"}` and `{customer_id: "A", order_id: "2"}`. Is this a valid composite primary key design? What would happen if you tried to put both items in a table that only had `customer_id` as a simple partition key?
4. A GetItem with `ConsistentRead=true` on a 9 KB item costs how many RCUs? What would the same read cost with eventual consistency?
5. You are storing user session tokens in DynamoDB. Sessions expire after 30 minutes. What feature would you use to automatically delete expired session items, and why is it preferable to a scheduled Lambda that runs DELETE operations?

## Quick Check

**Q1.** A DynamoDB item is 6 KB. How many WCUs does a single write of this item consume?

- A) 1 WCU
- B) 4 WCUs
- C) 6 WCUs
- D) 2 WCUs

**Answer: C** — Writes are billed in 1 KB increments, rounded up. `ceil(6 / 1) = 6 WCUs`.

**Q2.** You run a Query that returns 10 items totaling 8 KB, using eventually consistent reads. How many RCUs does this Query consume?

- A) 1 RCU
- B) 2 RCUs
- C) 4 RCUs
- D) 8 RCUs

**Answer: A** — Eventually consistent reads: `ceil(8 / 4) / 2 = 1 RCU`. The 10-item count is irrelevant; what matters is total bytes read, rounded to the next 4 KB boundary, then halved for eventual consistency.

**Q3.** Which statement about DynamoDB's On-Demand capacity mode is correct?

- A) You must specify a minimum and maximum RCU/WCU range before traffic arrives.
- B) On-Demand mode does not support strongly consistent reads.
- C) On-Demand mode charges per read and write request, with no pre-specified throughput required.
- D) On-Demand mode is only available for tables smaller than 10 GB.

**Answer: C** — On-Demand mode requires no capacity specification and bills per individual request. It supports strongly consistent reads (at the same 2x RCU premium) and has no size restrictions.

## What's Next

Next up: DynamoDB Queries, Scans, and Indexes — how to retrieve data efficiently with Query vs. Scan, and when to use GSIs vs. LSIs for alternate access patterns.
