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

## What's Next

Next up: DynamoDB Queries, Scans, and Indexes — how to retrieve data efficiently without full table scans.