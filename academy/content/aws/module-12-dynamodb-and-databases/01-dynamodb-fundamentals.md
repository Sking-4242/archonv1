---
title: "DynamoDB Fundamentals: Tables, Items, and Keys"
type: content
estimated_minutes: 10
cert_tags: ["SAA-C03", "DVA-C02", "CLF-C02"]
---

# DynamoDB Fundamentals: Tables, Items, and Keys

## Overview

Amazon DynamoDB is a fully managed NoSQL key-value and document database that delivers single-digit millisecond performance at any scale. Unlike relational databases, DynamoDB requires no schema changes, no connection management, and no capacity pre-planning (in on-demand mode). It's the database of choice for high-traffic web applications, gaming leaderboards, IoT, and serverless architectures.

## Tables, Items, and Attributes

A DynamoDB table is a collection of items. Each item is a collection of attributes (similar to a row in SQL, but each item can have different attributes). Tables have no fixed schema beyond the primary key. Attribute types: String, Number, Binary, Boolean, Null, List, Map, and StringSet/NumberSet/BinarySet. Items can be up to 400 KB including all attribute names and values.

## Primary Keys

Every item in a DynamoDB table is uniquely identified by its primary key. Two forms: Partition Key only (a single attribute that DynamoDB hashes to determine the physical partition where the item lives) or Partition Key + Sort Key (composite key — items with the same partition key are grouped together and sorted by the sort key). Example: a messaging app might use `conversation_id` as partition key and `timestamp` as sort key, enabling efficient range queries for all messages in a conversation.

## Read and Write Capacity

DynamoDB offers two capacity modes. Provisioned: you specify Read Capacity Units (RCUs) and Write Capacity Units (WCUs) — 1 RCU = 1 strongly consistent read per second of up to 4 KB, 1 WCU = 1 write per second of up to 1 KB. On-Demand: DynamoDB scales capacity automatically; you pay per request. Use On-Demand for unpredictable or low-traffic tables; Provisioned with Auto Scaling for predictable high-traffic workloads.

## Strongly Consistent vs. Eventually Consistent Reads

By default, DynamoDB reads are eventually consistent (reflecting all successful writes from the previous second or so). You can request strongly consistent reads (reflecting all successful writes before the read) by setting `ConsistentRead=true`. Strongly consistent reads consume 2x the RCU. For most applications, eventual consistency is acceptable; use strong consistency for financial or inventory systems that cannot tolerate stale reads.

## Summary

DynamoDB is a managed, schemaless, key-value + document store with single-digit millisecond latency at any scale. Primary keys (partition or composite) define the data model. Choose On-Demand capacity for variable workloads and Provisioned + Auto Scaling for steady-state. The 400 KB item limit and primary key design are the constraints to design around.

## Examples

A social gaming startup launched a mobile trivia app expecting unpredictable traffic spikes around viral moments. They chose DynamoDB in On-Demand mode so the database could scale from a few hundred to millions of requests per second during a celebrity tweet without any manual intervention or throttling. This is the textbook fit for On-Demand capacity: variable, hard-to-forecast workloads where paying per request beats guessing at provisioned units.

An e-commerce platform stores a product catalog with `product_id` as the partition key and variants (size, color) as the sort key. The composite key lets them run a single Query — `WHERE product_id = "SHOE-42"` — to retrieve every variant of a product in one round trip, rather than scanning or making one request per variant. The sort key physically co-locates related items on the same partition, which is exactly what composite keys are designed for.

A fintech company building a payment audit trail initially tried to store all transaction metadata in a single DynamoDB item. They hit the 400 KB item limit when appending event history inline. They redesigned so each event became its own item with `account_id` as partition key and `event_timestamp` as sort key — a pattern that scales to millions of events per account without any size constraint.

## Think About It

1. Why does DynamoDB hash the partition key value rather than storing items in partition-key alphabetical order? What would break if it sorted by key instead?
2. You have a workload that runs 10,000 writes per second for 30 minutes each night and is idle the rest of the day. What capacity mode would you choose, and what would make you reconsider?
3. What would happen if two different items in the same table had identical partition keys but no sort key was defined? How does DynamoDB prevent or handle this?
4. Strongly consistent reads cost 2x the RCUs of eventually consistent reads. Under what circumstances would paying that premium actually be required rather than just "nice to have"?
5. An item has 15 attributes but your application only ever reads 3 of them. What are the trade-offs of storing all 15 attributes versus splitting the item?

## Quick Check

**Q1.** What is the maximum size of a single DynamoDB item?
- A) 4 KB
- B) 64 KB
- C) 400 KB
- D) 4 MB

**Answer: C** — DynamoDB enforces a hard 400 KB limit per item, including all attribute names and values.

**Q2.** Which capacity mode charges you per request rather than requiring you to pre-specify read and write throughput?
- A) Provisioned mode with Auto Scaling
- B) On-Demand mode
- C) Reserved capacity
- D) Burst mode

**Answer: B** — On-Demand mode requires no capacity planning and bills per individual read and write request.

**Q3.** By default, DynamoDB reads are eventually consistent. What must you set to request a strongly consistent read?
- A) `StrongRead=true`
- B) `ConsistentRead=true`
- C) `ReadMode=STRONG`
- D) `ConsistencyLevel=STRONG`

**Answer: B** — Setting `ConsistentRead=true` on a GetItem or Query request forces a strongly consistent read, at the cost of 2x RCU consumption.

## What's Next

Next up: DynamoDB Queries, Scans, and Indexes — how to retrieve data efficiently without full table scans.