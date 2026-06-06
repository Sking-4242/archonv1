---
title: "ElastiCache: Redis and Memcached"
type: content
estimated_minutes: 18
cert_tags: ["SAA-C03", "SAP-C02", "DVA-C02", "CLF-C02"]
---

# ElastiCache: Redis and Memcached

## Overview

Amazon ElastiCache is a fully managed in-memory data store service that removes the undifferentiated heavy lifting of deploying, patching, and scaling in-memory caching infrastructure. It currently supports two engines: Valkey (formerly Redis) and Memcached.

> **Naming note:** In 2024, following a Redis licensing change, AWS migrated its managed Redis offering to Valkey — an open-source Redis fork maintained by the Linux Foundation. The service is now called **Amazon ElastiCache for Valkey**. ElastiCache for Memcached continues unchanged. All Redis API commands, data structures, and behaviors are fully compatible with Valkey. Throughout this lesson, "Redis" refers to the engine; in the AWS console and documentation you will see "Valkey" for new deployments. **For exam purposes:** AWS certification exams currently use "ElastiCache for Redis" in question text and answer choices. When you see "Redis" on an exam, it refers to this same Valkey-backed service. Answer questions using "Redis" unless the question specifically asks about the 2024 naming migration. The fundamental value proposition is latency: a database query that takes 5–50ms from an RDS instance can be served in under a millisecond from ElastiCache, because RAM access is four orders of magnitude faster than disk I/O and the network round trip to ElastiCache is often shorter than the query processing time on a relational engine. For read-heavy workloads where the same data is requested repeatedly, caching can reduce database load by 90%+ and compress P99 latency dramatically.

The choice between Redis and Memcached is one of the most common AWS exam questions in this domain, and the answer is almost always Redis. Memcached is a stripped-down, multi-threaded key-value store with no persistence, no replication, no data structures beyond string values, and no pub/sub. It is horizontally scalable by adding nodes, each holding an independent shard of the keyspace. Redis, by contrast, is a data structure server: it natively stores sorted sets, lists, hashes, sets, bitmaps, HyperLogLog, and geospatial indexes. It supports persistence (RDB point-in-time snapshots and AOF append-only log), primary-replica replication, multi-AZ with automatic failover, Cluster Mode for horizontal write scaling, pub/sub messaging, Lua scripting for atomic multi-command operations, and Redis Streams for durable message queues. The only scenario where Memcached has an advantage is if you specifically need multi-threaded CPU utilization from a single node and have no need for any Redis features — an edge case in modern architectures.

Amazon also offers MemoryDB for Redis, a distinct service that should not be confused with ElastiCache for Redis. ElastiCache Redis offers optional persistence but is architecturally a cache — its primary store is memory and persistence is a safety net. MemoryDB for Redis is a durable, primary database built on Redis: it stores every write in a distributed, multi-AZ transaction log before acknowledging success, guaranteeing no data loss even on full cluster failure. MemoryDB provides microsecond read latency and single-digit millisecond write latency with full Redis API compatibility. Use ElastiCache Redis when you want a cache in front of another database; use MemoryDB when you want Redis to be the primary store and cannot tolerate data loss.

## Core Concepts

### Redis vs. Memcached: Feature Comparison

The architectural differences between the two engines produce fundamentally different capability profiles:

| Feature | Redis | Memcached |
|---|---|---|
| Data structures | Strings, hashes, lists, sets, sorted sets, bitmaps, HyperLogLog, geospatial, streams | Strings only |
| Persistence | RDB snapshots + AOF log (optional) | None |
| Replication | Primary + up to 5 read replicas | None |
| Multi-AZ failover | Yes (automatic) | No |
| Cluster mode (sharding) | Yes (up to 500 nodes, 500 shards) | Yes (client-side sharding) |
| Pub/Sub | Yes | No |
| Lua scripting | Yes (atomic multi-command) | No |
| Transactions (MULTI/EXEC) | Yes | No |
| Geospatial commands | Yes (GEOADD, GEODIST, GEORADIUS) | No |
| Multi-threaded | No (single-threaded event loop) | Yes |

The single-threaded nature of Redis is a frequent exam distractor. Redis processes commands sequentially in a single-threaded event loop, which is why Lua scripts and MULTI/EXEC transactions are atomic — no other command can interleave. This is not a performance problem in practice because Redis operations complete in microseconds and the bottleneck is almost always network throughput, not CPU. Memcached's multi-threaded design can better utilize multiple CPU cores for high-connection-count workloads, but this advantage rarely matters for typical web application caching.

### Lazy Loading (Cache-Aside) Pattern

Lazy loading is the most common caching pattern. The application treats the cache as an optional acceleration layer and always falls back to the database on a miss:

```
function get_product(product_id):
    # Step 1: Check the cache first
    cached = redis.get(f"product:{product_id}")
    if cached is not None:
        return deserialize(cached)           # Cache HIT — ~0.5ms

    # Step 2: Cache MISS — fetch from the database
    product = db.query("SELECT * FROM products WHERE id = ?", product_id)
    
    # Step 3: Populate the cache for next time, with a TTL
    redis.setex(
        f"product:{product_id}",
        300,                                 # TTL: 300 seconds (5 minutes)
        serialize(product)
    )
    
    return product                           # Cache MISS — ~20ms (but only first time)
```

Characteristics:
- **Cold start penalty**: On first request (or after TTL expiry), the full database latency is paid.
- **Stale data window**: If the database record changes, the cache serves stale data until TTL expires. A product price update in the database is invisible to cached reads for up to 5 minutes in the example above.
- **Cache only fills with data that is actually requested**: Items that are rarely read are never cached, so the cache stays focused on hot data.
- **Resilience**: If the cache cluster is unavailable, the application degrades gracefully — it simply reads from the database at higher latency. The cache is not in the critical path of correctness, only performance.

### Write-Through Caching Pattern

Write-through ensures the cache is always synchronized with the database by writing to both on every update:

```
function update_product(product_id, new_data):
    # Step 1: Write to the primary database
    db.execute("UPDATE products SET ... WHERE id = ?", product_id, new_data)
    
    # Step 2: Write the updated value to the cache immediately
    redis.setex(
        f"product:{product_id}",
        300,
        serialize(new_data)
    )
    # Cache is now consistent — no stale window
```

Characteristics:
- **No stale data**: Every read after a write returns the updated value immediately.
- **Every write hits cache**: Items are cached even if they are never read again, potentially wasting cache memory. Pair with a TTL to evict stale items that were written but never accessed.
- **Slower writes**: Each write now requires two operations (database + cache) before returning to the caller. If the cache write fails, you have inconsistency.
- **Cache is in the write path**: Unlike lazy loading, a cache failure now affects write operations, not just read performance.

For most read-heavy applications, lazy loading is the default pattern. Write-through is appropriate when stale reads are unacceptable — for example, a payment status that must always be current.

### ElastiCache for Redis: Cluster Mode

Redis Cluster Mode Enabled (CME) shards the keyspace horizontally across multiple primary nodes, each owning a subset of the 16,384 hash slots. This enables horizontal write scaling beyond a single node's throughput.

```
Cluster Mode DISABLED:
  One primary node (all writes here)
  Up to 5 read replicas
  Single endpoint: my-cluster.abc123.ng.0001.use1.cache.amazonaws.com:6379
  → Good for read-heavy workloads, large single-dataset

Cluster Mode ENABLED:
  Multiple shards (e.g., 5 primary nodes + 5 replica nodes = 10 nodes)
  Up to 500 shards × up to 500 nodes = 500 shards total
  Configuration endpoint: my-cluster.cluster.abc123.use1.cache.amazonaws.com:6379
  → Good for write-heavy workloads or datasets larger than one node's RAM
```

The endpoint type changes with cluster mode. With Cluster Mode Disabled, use the **primary endpoint** for reads/writes and **reader endpoint** for read replicas. With Cluster Mode Enabled, use the **configuration endpoint** — the client library (e.g., `redis-py`, `Jedis`) connects to the configuration endpoint and learns the shard topology automatically, routing keys to the correct shard.

**Cluster mode caveat**: Multi-key operations (`MGET`, `MSET`, `DEL key1 key2`) and transactions (`MULTI/EXEC`) only work if all keys hash to the same slot. Use hash tags `{user:123}:session` and `{user:123}:profile` to force co-location of related keys on the same shard.

### Cache Eviction Policies

When a Redis node's memory is full, it must evict keys to make room for new writes. The eviction policy controls which keys are removed:

| Policy | Behavior | Best For |
|---|---|---|
| `noeviction` | Returns error on write when full | When you cannot afford to lose any key |
| `allkeys-lru` | Evicts least recently used key from all keys | General-purpose caches where all keys are candidates |
| `volatile-lru` | Evicts LRU from keys with a TTL set | When some keys must never be evicted (no TTL = protected) |
| `allkeys-lfu` | Evicts least frequently used key from all keys | Workloads with a clear hot/cold key distribution |
| `volatile-lfu` | Evicts LFU from keys with a TTL set | Similar to volatile-lru but frequency-weighted |
| `allkeys-random` | Evicts a random key from all keys | Uniform access patterns where any key is equally replaceable |
| `volatile-ttl` | Evicts key with the shortest remaining TTL | When you want TTL to drive eviction order |

For most caching workloads, `allkeys-lru` is the right default. It ensures the cache converges toward the working set — the keys that are actually used frequently — and silently drops cold data when the cache fills. Set `noeviction` only if every key in the cache is critical and cannot be recomputed from the database.

### TTL Strategy

Every cached value should have a TTL. Without TTL, the cache fills with stale data and eventually relies on the eviction policy to manage memory, which is less predictable than explicit expiry. TTL guidelines:

- **Short TTL (1–60s)**: Rapidly changing data — stock prices, live scores, session tokens near expiry.
- **Medium TTL (1–15 min)**: Typical application data — product details, user profiles, recommendation lists.
- **Long TTL (hours)**: Stable reference data — country codes, category hierarchies, application configuration.
- **No TTL**: Appropriate only for data that is explicitly invalidated on write (write-through pattern where you delete or overwrite the key on every update).

Add a small random jitter to TTLs for items that were cached at the same time (e.g., during a cold start). If 10,000 cached items all have exactly the same TTL, they all expire simultaneously, producing a cache stampede — a thundering herd of database reads hitting at the same instant.

## Configuration Reference

### Creating a Redis Replication Group with Cluster Mode Enabled (CLI)

```bash
# Create a Redis 7.x cluster with Cluster Mode Enabled
# 3 shards, 1 replica per shard = 6 nodes total
aws elasticache create-replication-group \
  --replication-group-id prod-redis-cluster \
  --replication-group-description "Production Redis cluster - CME" \
  --engine redis \
  --engine-version 7.0 \
  --cache-node-type cache.r7g.large \        # r7g = memory-optimized, Graviton3
  --num-node-groups 3 \                      # 3 shards (primary nodes)
  --replicas-per-node-group 1 \              # 1 read replica per shard
  --automatic-failover-enabled \             # promote replica if primary fails
  --multi-az-enabled \                       # spread primaries/replicas across AZs
  --at-rest-encryption-enabled \             # encrypt data at rest (KMS)
  --transit-encryption-enabled \             # enforce TLS in transit
  --auth-token "MyStr0ng!AuthToken" \        # AUTH password (required with TLS)
  --cache-subnet-group-name my-subnet-group \
  --security-group-ids sg-0abc123def456789 \
  --region us-east-1

# Check creation status — wait for "available"
aws elasticache describe-replication-groups \
  --replication-group-id prod-redis-cluster \
  --query 'ReplicationGroups[0].{Status:Status,Endpoint:ConfigurationEndpoint}' \
  --region us-east-1
# Output:
# {
#   "Status": "available",
#   "Endpoint": {
#     "Address": "prod-redis-cluster.cluster.abc123.use1.cache.amazonaws.com",
#     "Port": 6379
#   }
# }
# Use ConfigurationEndpoint for Cluster Mode Enabled clusters
```

### Creating a Cluster Mode Disabled (Non-Clustered) Redis Group

```bash
# Single shard, 2 replicas — read scaling only, no write sharding
aws elasticache create-replication-group \
  --replication-group-id prod-redis-single \
  --replication-group-description "Redis single shard with replicas" \
  --engine redis \
  --engine-version 7.0 \
  --cache-node-type cache.r7g.large \
  --num-cache-clusters 3 \                   # 1 primary + 2 replicas
  --automatic-failover-enabled \
  --multi-az-enabled \
  --at-rest-encryption-enabled \
  --transit-encryption-enabled \
  --auth-token "MyStr0ng!AuthToken" \
  --cache-subnet-group-name my-subnet-group \
  --security-group-ids sg-0abc123def456789 \
  --region us-east-1

# For non-cluster mode, connect using the PRIMARY ENDPOINT for writes
# and the READER ENDPOINT for reads
aws elasticache describe-replication-groups \
  --replication-group-id prod-redis-single \
  --query 'ReplicationGroups[0].NodeGroups[0].{Primary:PrimaryEndpoint,Reader:ReaderEndpoint}'
```

### Connecting and Using Redis Data Structures (Python)

```python
import redis
import json
import random
import time

# Cluster Mode Enabled: use RedisCluster client
from redis.cluster import RedisCluster
rc = RedisCluster(
    host="prod-redis-cluster.cluster.abc123.use1.cache.amazonaws.com",
    port=6379,
    password="MyStr0ng!AuthToken",
    ssl=True,
    decode_responses=True
)

# ─── Lazy Loading pattern ─────────────────────────────────────────────────────
def get_product(product_id: str) -> dict:
    cache_key = f"product:{product_id}"
    
    # 1. Try cache
    cached = rc.get(cache_key)
    if cached:
        return json.loads(cached)
    
    # 2. Miss: query database
    product = db.query_one("SELECT * FROM products WHERE id = %s", product_id)
    
    # 3. Cache with TTL + random jitter (avoid stampede)
    ttl = 300 + random.randint(-30, 30)
    rc.setex(cache_key, ttl, json.dumps(product))
    
    return product

# ─── Sorted Set: Real-time leaderboard ───────────────────────────────────────
def record_score(player_id: str, score: float):
    # ZADD updates score if player already exists — O(log N)
    rc.zadd("leaderboard:global", {player_id: score})

def get_top_players(n: int = 100) -> list:
    # ZRANGE with REV + WITHSCORES returns top N in descending order — O(log N + N)
    return rc.zrange("leaderboard:global", 0, n - 1, rev=True, withscores=True)

def get_player_rank(player_id: str) -> int:
    # ZREVRANK returns 0-based rank from the top — O(log N)
    return rc.zrevrank("leaderboard:global", player_id)

# ─── Session storage ─────────────────────────────────────────────────────────
def create_session(session_id: str, user_data: dict, ttl_seconds: int = 3600):
    # HSET stores session as a hash — individual fields addressable
    rc.hset(f"session:{session_id}", mapping=user_data)
    rc.expire(f"session:{session_id}", ttl_seconds)

def get_session(session_id: str) -> dict:
    return rc.hgetall(f"session:{session_id}")   # returns {} if expired/missing

# ─── Geospatial: nearby drivers ──────────────────────────────────────────────
def add_driver_location(driver_id: str, lon: float, lat: float):
    rc.geoadd("drivers:locations", (lon, lat, driver_id))

def find_nearby_drivers(lon: float, lat: float, radius_km: float) -> list:
    return rc.geosearch(
        "drivers:locations",
        longitude=lon, latitude=lat,
        radius=radius_km, unit="km",
        sort="ASC", count=10
    )
```

### MemoryDB for Redis: Creating a Durable Cluster

```bash
# MemoryDB — Redis-compatible primary database (not a cache)
# Data is persisted to a Multi-AZ transaction log before write acknowledgment
aws memorydb create-cluster \
  --cluster-name prod-memorydb \
  --node-type db.r7g.large \
  --engine-version 7.0 \
  --num-shards 2 \
  --num-replicas-per-shard 1 \
  --tls-enabled \                            # TLS always recommended
  --subnet-group-name my-subnet-group \
  --security-group-ids sg-0abc123def456789 \
  --region us-east-1

# MemoryDB uses a cluster endpoint — same Redis Cluster client as ElastiCache CME
# Key difference: every write is acked only after Multi-AZ transaction log commit
# → Zero data loss even on primary failure, unlike ElastiCache Redis
```

## How to Decide

| Requirement | Service / Configuration | Reason |
|---|---|---|
| Sub-millisecond reads, cache in front of RDS/Aurora | ElastiCache for Redis | Managed cache; data loss on failure is acceptable (recompute from DB) |
| Sub-millisecond reads AND zero data loss, Redis as primary store | MemoryDB for Redis | Durable transaction log; Redis is the database, not a cache |
| Simple key-value cache, no persistence, no replication needed | ElastiCache Memcached | Lower complexity; multi-threaded if single-node CPU is the bottleneck |
| Session storage shared across stateless web servers | ElastiCache Redis (any mode) | TTL-based expiry, HSET for structured session data |
| Real-time leaderboard, ranked queries | ElastiCache Redis sorted sets | ZADD/ZRANGE operations; O(log N) insert and retrieval |
| Pub/Sub for loose microservice coupling | ElastiCache Redis pub/sub | Simple fan-out; no consumer group tracking (use Streams for that) |
| Dataset larger than one node's RAM, high write throughput | ElastiCache Redis Cluster Mode Enabled | Keyspace sharded across multiple primary nodes |
| Read-heavy, single large dataset, automatic failover | ElastiCache Redis Cluster Mode Disabled + replicas | Up to 5 read replicas; simpler multi-key operations |
| Cache stampede risk on cold start | Lazy loading + TTL jitter | Random TTL offset prevents all keys expiring simultaneously |

## How This Connects

- **ElastiCache and RDS/Aurora** are almost always deployed together — ElastiCache sits in front of the relational database as a read-acceleration layer, and the caching patterns (lazy loading, write-through) define how the two stay in sync.
- **Session storage in ElastiCache** enables stateless web tiers behind an Application Load Balancer without sticky sessions — the same architectural principle that allows Auto Scaling to replace web server instances without losing user sessions.
- **Redis Sorted Sets** implement the same ranked query semantics as `ORDER BY score DESC LIMIT N` in SQL, but at sub-millisecond speed because the sort order is maintained incrementally in the data structure on every write — no sort operation at query time.
- **MemoryDB for Redis** occupies the same architectural position as DynamoDB for key-value workloads — a fully managed, durable primary store — but with the Redis API and data structures, enabling a different set of access patterns (sorted sets, pub/sub, streams) that DynamoDB does not natively support.
- **ElastiCache Cluster Mode Enabled** is conceptually parallel to DynamoDB's internal partitioning and to Kinesis Data Streams sharding — distributing a keyspace across multiple nodes to exceed single-node capacity limits, with keys routed by hash.

## Exam Traps

**"ElastiCache Redis with persistence enabled is equivalent to a primary database."** False. ElastiCache Redis persistence (RDB/AOF) is designed to speed up cluster recovery after restart, not to guarantee zero data loss. The persistence files live on the node's local storage, not a distributed log. If the node fails before the RDB snapshot interval or before AOF flush, data written in that window can be lost. Use MemoryDB for Redis if you need Redis as a primary, durable store.

**"Lazy loading prevents stale data."** False. Lazy loading specifically allows stale data — the cache is only updated on a miss, not on writes. Stale data persists until TTL expiry or explicit cache invalidation. Write-through prevents stale data, at the cost of writing to the cache on every database update.

**"Memcached supports replication and failover."** False. Memcached has no replication. If a Memcached node fails, all cached data on that node is lost and must be rehydrated from the database on subsequent cache misses. There is no automatic failover to a replica because there are no replicas. This is one of the key reasons Redis is preferred for most production workloads.

**"Cluster Mode Enabled Redis uses the same primary endpoint as Cluster Mode Disabled."** False. Cluster Mode Enabled requires a configuration endpoint (which encodes the cluster topology). Connecting a single-node Redis client to a CME cluster's configuration endpoint and trying to perform multi-key operations across shards will fail. Use a Redis Cluster-aware client library.

**"ElastiCache is appropriate for storing sensitive data without encryption."** False. ElastiCache for Redis supports encryption at rest and in transit (TLS). For sensitive data — session tokens, PII, financial records — always enable both. The `--transit-encryption-enabled` flag enforces TLS and requires an AUTH token for authentication.

## Summary

- ElastiCache offers two engines: Redis (rich data structures, persistence, replication, pub/sub, cluster mode) and Memcached (simple key-value, multi-threaded, no persistence or replication); prefer Redis for almost all new workloads.
- Lazy loading (cache-aside) populates the cache on read miss and allows stale data up to the TTL window; write-through populates the cache on every write and prevents staleness but makes writes slower.
- Always set a TTL on cached values and add random jitter to prevent cache stampedes when many entries expire simultaneously.
- Cluster Mode Disabled provides read scaling via up to 5 read replicas with a single primary; Cluster Mode Enabled shards the keyspace across up to 500 primary nodes for write scaling, but requires a cluster-aware client and hash tags for multi-key operations.
- Cache eviction policies (`allkeys-lru` for general caching, `volatile-lru` for protecting no-TTL keys) control which keys are dropped when memory is full.
- MemoryDB for Redis is a distinct service — a durable primary database with the Redis API, persisting every write to a Multi-AZ transaction log before acknowledging; use it when Redis must be the source of truth, not just a cache.

## Examples

An e-commerce platform's product detail page aggregated data from three RDS tables: products, inventory, and reviews. Each page load issued three sequential SQL queries taking 80ms total. After adding ElastiCache Redis with lazy loading and a 5-minute TTL, the first request after cache expiry still paid 80ms, but every subsequent request in the window was served from Redis in under 2ms — a 40× latency improvement. During a flash sale that tripled traffic, RDS CPU stayed flat because 97% of product page reads hit the cache. The only issue encountered was a cache stampede during the first deployment when all product keys were loaded simultaneously with identical TTLs; adding ±30-second jitter to each TTL eliminated simultaneous mass expiry on subsequent deployments.

A multiplayer game maintains a global leaderboard with 2 million registered players. Every level completion submits a score. The team originally stored scores in PostgreSQL and computed rankings with `SELECT RANK() OVER (ORDER BY score DESC)` — which took 800ms on the 2M-row table. They migrated to a Redis Sorted Set: each level completion calls `ZADD leaderboard:global <score> <player_id>`, which completes in under 1ms. The top-100 leaderboard is retrieved with `ZRANGE leaderboard:global 0 99 REV WITHSCORES` in under 2ms regardless of how many total players exist. Individual player rank (`ZREVRANK`) takes under 1ms. The sorted set stays in sync with the PostgreSQL scores table via a write-through pattern — every score write updates both stores atomically in a transaction.

A financial services company evaluated ElastiCache Redis for caching their trade confirmation records. Their compliance team raised a concern: if ElastiCache served a stale confirmation status to a downstream risk engine, the engine might allow a second trade that violated position limits. The team made two architectural decisions. First, they used write-through caching for confirmation status — every database write immediately updated the cache key, so reads never observed an old value. Second, they set a 10-second TTL as a safety net even with write-through, so any cache inconsistency caused by a failed cache-write-leg would self-heal in at most 10 seconds. The combination of write-through for consistency and a short TTL as a failsafe gave the compliance team the guarantees they needed without abandoning caching entirely.

## Think About It

1. Lazy loading can serve stale data for up to the TTL duration after a database record changes. For a product's price field, what TTL would you choose and why? What about for a user's account balance field? How does the business impact of serving stale data change your TTL decision?
2. Write-through caching fills the cache on every database write, including records that may never be read again. How would you design TTLs and eviction policies to prevent write-through from turning your cache into an expensive mirror of your database?
3. Redis Cluster Mode Enabled shards the keyspace across multiple nodes, but multi-key operations only work if all keys are on the same shard. How would you design your key naming convention to ensure related data (e.g., all session data for one user) lands on the same shard while still getting the write-scaling benefits of sharding?
4. Session storage in Redis introduces Redis as a dependency in the critical authentication path — every authenticated request must reach Redis. Design an architecture that degrades gracefully when ElastiCache is unavailable, without requiring sticky sessions on the load balancer.
5. MemoryDB for Redis guarantees no data loss by persisting writes to a Multi-AZ transaction log before acknowledging. ElastiCache Redis with AOF persistence enabled can lose data in a failure window. What application scenarios justify the higher cost and write latency of MemoryDB versus ElastiCache Redis?

## Quick Check

**Q1.** An application uses lazy loading with ElastiCache Redis. A product's price is updated in RDS. A customer requests the product detail page 10 seconds later. What does the customer see?

- A) The updated price, because lazy loading refreshes on every write
- B) The old price, because the cache was not updated when RDS was written
- C) An error, because the cache and database are inconsistent
- D) The updated price only if the TTL has expired

**Answer: B** — With lazy loading (cache-aside), the cache is only updated on a cache miss. Writing to RDS does not trigger any cache update. The customer sees the stale cached price until the TTL expires and the next request triggers a cache miss and repopulation.

**Q2.** Your ElastiCache Redis cluster is running Cluster Mode Enabled with 5 shards. You attempt to run `MGET key1 key2 key3` and receive a CROSSSLOT error. What is the most likely cause?

- A) MGET is not supported in Redis Cluster Mode
- B) The keys hash to different hash slots on different shards
- C) You exceeded the maximum key length for cluster mode
- D) The cluster requires AUTH tokens for all multi-key operations

**Answer: B** — In Redis Cluster Mode, each key is assigned to one of 16,384 hash slots and routed to the corresponding shard. `MGET` across keys on different shards is not supported in a single command. Use hash tags (e.g., `{user:123}:key1` and `{user:123}:key2`) to force co-location of related keys on the same shard.

**Q3.** Which AWS service should you choose when you need the Redis API and data structures but cannot afford to lose any data, even on full cluster failure?

- A) ElastiCache for Redis with AOF persistence enabled
- B) ElastiCache for Redis with Cluster Mode Enabled
- C) MemoryDB for Redis
- D) ElastiCache for Redis with Multi-AZ and automatic failover

**Answer: C** — MemoryDB for Redis stores every write in a distributed, Multi-AZ transaction log before acknowledging success. This guarantees zero data loss on node or AZ failure. ElastiCache Redis with AOF or Multi-AZ reduces data loss risk but does not eliminate it — AOF flushes have configurable lag and failover incurs a brief interruption. MemoryDB is the only option where Redis is truly a durable primary database.

## What's Next

Next up: Specialized AWS Databases — Redshift for OLAP analytics, Neptune for graph workloads, QLDB for immutable audit ledgers, DocumentDB for MongoDB compatibility, Timestream for time-series data, and a decision framework for choosing the right database engine.
