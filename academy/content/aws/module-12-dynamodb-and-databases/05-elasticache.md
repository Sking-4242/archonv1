---
title: "ElastiCache: Redis and Memcached"
type: content
estimated_minutes: 8
cert_tags: ["SAA-C03", "SAP-C02", "CLF-C02"]
---

# ElastiCache: Redis and Memcached

## Overview

Amazon ElastiCache provides fully managed in-memory caching using Redis or Memcached. Caching reduces database load and sub-millisecond reads for frequently accessed data. This lesson covers when to use each engine, common caching patterns, and ElastiCache for Redis's additional data structures.

## Redis vs. Memcached

Memcached: simple key-value caching, multi-threaded, no persistence, no replication. Suitable for stateless, simple cache workloads that need horizontal scaling. Redis: rich data structures (strings, hashes, lists, sets, sorted sets, HyperLogLog, geospatial), persistence (RDB snapshots + AOF log), replication (primary + up to 5 replicas), pub/sub messaging, Lua scripting, and transactions. Redis is almost always the right choice — use Memcached only if you specifically need multi-threading without any Redis features.

## Caching Patterns

Lazy Loading (Cache-Aside): application checks cache first; on miss, reads from DB and populates cache. Simple, but has a cold start penalty and risk of stale data. Write-Through: on every DB write, also write to cache. No stale data, but writes are slower and cache fills with data that may never be read. Write-Behind (Write-Back): write to cache first, asynchronously write to DB. Fastest writes, but risk of data loss if cache fails before DB write. Add TTL to all cached values to prevent unbounded growth and eventual staleness.

## ElastiCache for Redis: Advanced Features

Sorted Sets for leaderboards (ZADD, ZRANGE). Pub/Sub for real-time messaging between microservices. Geospatial commands for location-based queries. Lua scripting for atomic multi-command operations. Redis Streams for durable message streams (similar to Kafka). ElastiCache for Redis also supports Cluster Mode Enabled (data sharded across up to 500 nodes for horizontal write scaling) and Cluster Mode Disabled (one shard, up to 5 replicas for read scaling).

## Session Management

A classic ElastiCache Redis use case is storing HTTP session data. Instead of sessions on individual servers (which breaks horizontal scaling), all servers write/read sessions to a shared Redis cluster. Sessions expire via TTL. This pattern enables stateless web tiers that can be scaled behind a load balancer without sticky sessions.

## Summary

ElastiCache Redis is the go-to in-memory cache for AWS workloads. Lazy loading is the standard pattern; add TTL. Redis sorted sets solve leaderboards, pub/sub solves real-time messaging, and shared session storage solves stateful web tier scaling. Choose Redis over Memcached for almost all new workloads.

## Examples

An e-commerce website loads product detail pages that aggregate data from three different database tables: product info, current inventory, and average review scores. Each page load previously triggered three RDS queries totaling 120ms. After adding ElastiCache Redis with lazy loading and a 60-second TTL, the first visitor after a cache miss pays the full 120ms, but every subsequent visitor in that window gets the pre-assembled page data from cache in under 5ms — dramatically reducing RDS load during flash sale traffic peaks.

A multiplayer mobile game uses a Redis sorted set to maintain a real-time leaderboard of the top 1,000 players by score. When a player completes a level, the game backend calls `ZADD leaderboard <score> <player_id>`, which atomically inserts or updates their rank. Players checking the leaderboard call `ZRANGE leaderboard 0 99 REV WITHSCORES` to get the top 100 in a single command. Redis handles millions of these updates per second without any custom sorting logic — this is exactly the workload sorted sets are designed for.

A financial services firm evaluated write-behind caching to reduce write latency on a high-frequency trading analytics pipeline. After testing, they rejected it: if the ElastiCache cluster failed before the async DB write completed, recent trade data could be lost permanently — unacceptable for an audit trail. They chose write-through instead, accepting the slower write path to guarantee that every write reaches the database before confirming success. The lesson is that caching pattern selection is a data-durability decision, not just a performance one.

## Think About It

1. Lazy loading can serve stale data for up to the TTL duration after an underlying database record changes. What types of data would you consider acceptable for lazy caching, and what types would you never cache this way?
2. Write-through caching fills the cache with every write, including data that may never be read again. How would you design a TTL strategy to prevent the cache from becoming a full copy of your database?
3. Redis offers persistence (RDB snapshots and AOF logs), but ElastiCache Redis is still not a primary database. Why would you never use ElastiCache Redis as your only data store even with persistence enabled?
4. Session storage in Redis enables a stateless web tier, but it introduces Redis as a dependency in the critical path of every authenticated request. How would you design your architecture to handle ElastiCache cluster failures gracefully?
5. What trade-offs would you consider when choosing between Redis Cluster Mode Enabled (sharded) and Cluster Mode Disabled (single shard, multiple replicas) for a read-heavy application?

## Quick Check

**Q1.** In the lazy loading (cache-aside) caching pattern, what happens on a cache miss?
- A) The request fails and the user must retry
- B) The application reads from the database and writes the result into the cache before returning
- C) The cache automatically fetches the missing value from the database
- D) The application reads from the database but does not populate the cache

**Answer: B** — On a cache miss with lazy loading, the application fetches the data from the database, writes it into the cache (usually with a TTL), and then returns it to the caller.

**Q2.** Which Redis data structure is specifically designed for real-time ranking and leaderboard use cases?
- A) Hash
- B) List
- C) Sorted Set
- D) HyperLogLog

**Answer: C** — Redis Sorted Sets maintain an ordered collection of members by score, supporting efficient ranked queries like "top 100 players" via commands such as ZRANGE and ZRANK.

**Q3.** Why should you almost always choose ElastiCache Redis over Memcached for new workloads?
- A) Redis is cheaper per GB of memory than Memcached
- B) Redis supports rich data structures, persistence, replication, and pub/sub; Memcached is simple key-value only with no persistence or replication
- C) Memcached is deprecated and no longer receives AWS updates
- D) Redis is required when using ElastiCache with DynamoDB

**Answer: B** — Redis's additional capabilities — data structures, persistence, replication, pub/sub, and Lua scripting — make it suitable for a far wider range of use cases, whereas Memcached offers only simple multi-threaded key-value caching with no durability or replication.

## What's Next

Next up: Other AWS Databases — Redshift, Neptune, Timestream, QLDB, and DocumentDB overview.