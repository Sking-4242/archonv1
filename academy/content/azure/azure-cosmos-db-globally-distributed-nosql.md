---
title: "Azure Cosmos DB: Globally Distributed NoSQL"
type: content
estimated_minutes: 10
cert_tags: ["az_900", "az_104", "az_305"]
---

# Azure Cosmos DB: Globally Distributed NoSQL

## Overview

Azure Cosmos DB is Microsoft's globally distributed, multi-model NoSQL database service. If you are coming from AWS, this is Azure's answer to Amazon DynamoDB—but with significantly more flexibility regarding APIs and data consistency. 

Cosmos DB is designed for highly responsive, global applications (like gaming leaderboards, IoT telemetry, or global retail catalogs) where data must be stored physically close to the user to ensure single-digit millisecond latency. 

## The Multi-Model API Architecture

The most unique feature of Cosmos DB is that it is a single database engine that speaks multiple languages. When you create a Cosmos DB account, you must choose an API. This dictates how your developers will interact with the data. 

**The Supported APIs:**
1.  **Core (SQL) API:** The default. It stores data as JSON documents but allows developers to query them using familiar SQL syntax (e.g., `SELECT * FROM c WHERE c.id = '1'`).
2.  **MongoDB API:** Acts as a drop-in replacement for MongoDB. If you have an existing app written for MongoDB, you can point the connection string to Cosmos DB, and the application won't know the difference.
3.  **Cassandra API:** For column-family data stores.
4.  **Gremlin API:** For graph databases (mapping complex relationships like social networks or fraud detection).
5.  **Table API:** A key-value store, compatible with the older Azure Table Storage.

## Global Distribution (Turnkey Active-Active)

In traditional relational databases, creating a read-replica in another continent is a complex administrative chore. 

In Cosmos DB, global distribution is a toggle switch. You can click a map of the world in the Azure Portal, select "Japan East" and "West Europe," and Cosmos DB will automatically replicate your data to those regions. More importantly, Cosmos DB supports **multi-region writes** (active-active). A user in Tokyo writes to the Japan node, while a user in Paris writes to the Europe node, and Cosmos DB handles the synchronization behind the scenes.

## The Five Consistency Levels

This is the most heavily tested Cosmos DB concept on the AZ-305 exam. When data is replicated globally, it takes time (milliseconds) for light to travel across fiber optic cables. You must architect the trade-off between absolute accuracy (consistency) and speed (performance). 

Cosmos DB offers five granular sliding scales of consistency:

1.  **Strong:** The database guarantees you will always read the most recent write. It is perfectly accurate. *Trade-off:* High latency and lower availability. It must wait for the write to replicate to all regions before acknowledging success.
2.  **Bounded Staleness:** Reads are guaranteed to honor the chronological order of writes, but they might be delayed by a defined window (e.g., "reads can be up to 5 minutes or 100 versions out of date"). Good for global stock tickers.
3.  **Session (Default):** Guarantees consistency *for the specific user making the changes*. If I update my profile picture, I see the new picture immediately. Someone across the world might see the old picture for a few seconds. This provides the best balance of performance and consistency for web apps.
4.  **Consistent Prefix:** Guarantees that users never see out-of-order writes, but there is no guarantee on how delayed the data might be.
5.  **Eventual:** The highest performance and lowest latency, but the weakest consistency. If no further writes occur, the replicas will *eventually* converge. Good for non-critical data like "likes" on a social media post.

## Partitioning

Like DynamoDB, Cosmos DB requires a **Partition Key**. This is the single most important architectural decision you will make. 
Data is physically distributed across underlying servers based on this key. If you build an IoT application and choose "DeviceID" as the partition key, all telemetry for Device A will be stored on the same physical server, making queries for that device incredibly fast. If you choose a bad partition key, you create "hot partitions" where one server is overwhelmed while the others sit idle.

## Summary

Azure Cosmos DB is a fully managed NoSQL database offering single-digit millisecond latency and turnkey global distribution. It supports multiple APIs (SQL, MongoDB, Gremlin). To manage the physics of global replication, architects must choose between five consistency levels, ranging from Strong (accurate but slow) to Eventual (fast but potentially outdated). The Session consistency level is the default and provides the optimal balance for most web applications.