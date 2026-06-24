---
title: "Amazon ElastiCache"
type: content
estimated_minutes: 16
cert_tags: ["CLF-C02", "SAA-C03", "SOA-C03"]
---

# Amazon ElastiCache

## Overview

Amazon ElastiCache is a fully managed **in-memory caching and data store** service, offering **Redis/Valkey** and **Memcached** engines. It puts a microsecond-latency in-memory layer in front of databases and applications to accelerate reads, offload backends, and store ephemeral state like sessions. This *service reference* lesson covers the caching patterns, the engine differences, high availability, security, and what each certification expects.

ElastiCache matters because databases are often the bottleneck: repeated reads of the same data, expensive queries, and session lookups all hammer the database and add latency. An in-memory cache serves that data in microseconds and absorbs read load, dramatically improving performance and reducing database cost and contention. The core mental model is a **read-through/lazy-loaded or write-through cache** sitting between the application and a slower data store (RDS/Aurora/DynamoDB), plus an in-memory store for **session state**, leaderboards, rate limiting, and pub/sub. The two engines suit different needs, and choosing between them is the key decision.

---

## How It Works

You provision a **cluster** of in-memory nodes with a chosen engine:

- **Redis / Valkey** — a rich in-memory data-structure store (strings, hashes, lists, sorted sets, streams) supporting **persistence/snapshots**, **replication**, automatic failover, **Multi-AZ**, pub/sub, transactions, and Lua scripting. Use it when you need durability, replication/HA, complex data types, or features beyond a simple cache. (Valkey is the open-source fork now offered alongside Redis.)
- **Memcached** — a simpler, multi-threaded, pure cache with no persistence or replication, designed to **scale out horizontally** by adding nodes and sharding. Use it for a large, simple, ephemeral cache where you want to scale across cores/nodes and don't need durability or advanced data types.

Common **caching strategies**: **lazy loading** (read-through — load into cache on a miss; simple, but a miss is slower and data can go stale) and **write-through** (write to cache and database together — cache stays fresh but writes are slower and may cache unused data). A **TTL** on entries bounds staleness and evicts cold data.

---

## Key Features

- **Microsecond latency** in-memory access in front of databases and applications.
- **Redis/Valkey HA** — primary/replica replication, **Multi-AZ** with automatic failover, snapshots/persistence, and **cluster mode** for sharded scale-out.
- **Memcached horizontal scale** — multi-threaded nodes and client-side sharding for a large, simple cache.
- **Encryption** at rest and in transit, **AUTH**/RBAC (Redis), and VPC/security-group isolation.
- **ElastiCache Serverless** — capacity that scales automatically without managing nodes.
- **Use cases beyond caching** — session stores, leaderboards/counters, rate limiting, and pub/sub (Redis).

---

## Configuration Reference

- **Choose the engine**: **Redis/Valkey** for persistence, replication/HA, or rich data structures; **Memcached** for a simple, horizontally scalable, ephemeral cache.
- **Pick a caching strategy** (lazy loading vs. write-through, often combined) and set **TTLs** to bound staleness.
- **Enable Multi-AZ with automatic failover** (Redis) for HA, and **cluster mode** to shard large datasets.
- **Encrypt in transit and at rest**, enable Redis **AUTH/RBAC**, and place the cluster in private subnets with a security group allowing only app access.

---

## Operations and Troubleshooting

- **Stale data.** Tune TTLs and choose/combine caching strategies; write-through plus TTL keeps data fresher.
- **Cache misses / cold cache.** Lazy loading makes the first read slow; pre-warm critical keys if needed.
- **Memcached has no HA or persistence.** If you need failover, replication, or durability, you need **Redis/Valkey** — a common exam trap.
- **Evictions / memory pressure.** Monitor CloudWatch eviction and memory metrics; scale up node size or out (sharding) and review TTLs and the eviction policy.

---

## Integrations

ElastiCache fronts **RDS/Aurora** and **DynamoDB** (DynamoDB also has its own cache, **DAX**), runs in a **VPC** with security groups, encrypts with **KMS**, is monitored by **CloudWatch**, and stores **session state** for web tiers behind **ELB**/Auto Scaling (externalizing session state so instances stay stateless). Redis pub/sub and streams support lightweight messaging. It is a core performance and cost-optimization building block in read-heavy and stateful-web architectures.

---

## Pricing and Cost Considerations

ElastiCache charges by **node** (instance type × hours) for node-based clusters (with Reserved nodes for steady workloads), plus backup storage and data transfer; **ElastiCache Serverless** bills by data stored and compute consumed. The cost trade-off is that caching reduces expensive database load and can let you downsize the database, often paying for itself; the levers are right-sizing nodes, choosing Memcached's horizontal scale vs. Redis's features appropriately, and using Serverless for spiky workloads. Exact prices vary by engine, node type, and Region.

---

## Exam Relevance

**CLF-C02:** Know ElastiCache as managed in-memory caching (Redis/Memcached) that improves performance and offloads databases. Foundational.

**SAA-C03:** Know caching strategies (lazy loading vs. write-through, TTL), **Redis/Valkey vs. Memcached** selection (HA/persistence/data types vs. simple horizontal scale), Multi-AZ/cluster mode, session-state externalization, and ElastiCache vs. DynamoDB DAX. Design depth.

**SOA-C03:** Operate caches — Multi-AZ failover, scaling, eviction/memory monitoring, and TTL tuning. Operations depth.

---

## Summary

Amazon ElastiCache is managed in-memory caching offering Redis/Valkey (rich data structures, persistence, replication, Multi-AZ failover, cluster-mode sharding) and Memcached (simple, multi-threaded, horizontally scalable, no persistence/HA). It accelerates reads and offloads databases via lazy-loading and write-through strategies with TTLs, and stores session state, leaderboards, and pub/sub. It runs in a VPC with KMS encryption and Redis AUTH/RBAC, and Serverless removes node management. The recurring exam points are Redis-vs-Memcached selection (HA/persistence/data types vs. simple scale-out), caching strategies and TTLs, and externalizing session state to keep app instances stateless.

---

## Quick Check

1. Which ElastiCache engine offers replication, persistence, and Multi-AZ failover, and which is a simple horizontally scalable cache with none of those?
2. Compare lazy loading and write-through caching, and what does a TTL add?
3. Why is externalizing session state to ElastiCache useful behind an Auto Scaling group?
4. A requirement needs cache failover and durability — which engine must you choose?
5. How can caching reduce overall database cost?

---

## What's Next

Pair this with **Amazon RDS/Aurora** and **Amazon DynamoDB** (the backends it accelerates, and DAX as DynamoDB's cache), and the SAA caching-strategies cert lesson.
