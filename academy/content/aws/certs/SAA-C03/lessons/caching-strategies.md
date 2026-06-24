---
title: "Caching Strategies on AWS: Edge, In-Memory, and Database Acceleration"
type: content
estimated_minutes: 14
cert_tags: ["SAA-C03"]
---

# Caching Strategies on AWS: Edge, In-Memory, and Database Acceleration

## Overview

Caching is the highest-leverage performance technique on AWS, and it is scattered across the shared lessons — CloudFront appears in the CDN lesson, ElastiCache in the database module, DAX in the DynamoDB module, API Gateway caching in the serverless module. The SAA exam, however, treats caching as one decision space: given a performance or scale problem, *where* should you add a cache, and *which one*? A surprising number of "design a high-performing architecture" questions are really "add the correct cache layer" questions.

A cache stores the result of an expensive operation close to where it's needed so the expensive operation runs less often. The payoff is twofold: lower latency for users and reduced load on origins and databases, which improves both performance and cost. The art is choosing the right layer — caching at the edge solves a different problem than caching in front of a database — and understanding the consistency trade-off every cache introduces. Stale data is the price of speed, and the exam expects you to know which patterns control it.

This lesson consolidates the caching landscape for Domain 3 (Design High-Performing Architectures, especially Tasks 3.3 and 3.4). After it you will be able to look at any latency or read-scaling problem and place the right cache at the right layer.

---

## Core Concepts

### The Caching Layers, From Edge to Data

Think of a request's journey and the cache available at each stop. At the **edge**, closest to the user, **CloudFront** caches static and dynamic content at hundreds of points of presence worldwide. At the **application/API layer**, **API Gateway** can cache endpoint responses. At the **in-memory layer** beside your compute, **ElastiCache** (Redis or Memcached) stores arbitrary application data — query results, sessions, computed values. At the **database layer**, **DAX** provides a DynamoDB-specific in-memory cache, and **RDS/Aurora read replicas** offload read traffic (a form of read scaling adjacent to caching). Each layer intercepts requests earlier than the next, removing load from everything downstream.

The exam reasoning: push the cache as close to the user as the data's freshness tolerance allows. The closer the cache, the bigger the latency win and the more origin load it removes — but the harder it is to invalidate.

### CloudFront — Caching at the Edge

CloudFront is the answer whenever the problem mentions globally distributed users and cacheable content. It serves cached objects from the nearest POP, slashing latency and offloading the origin (S3 or an ALB/EC2). Beyond static assets, it caches dynamic responses using cache policies keyed on headers, cookies, and query strings, and supports TTLs and invalidations for freshness control. Signs to pick CloudFront: "users around the world," "reduce load on origin," "lower latency for static content," "cache API/website responses globally."

### ElastiCache — In-Memory Application Caching

ElastiCache puts a managed Redis or Memcached cluster next to your application for microsecond reads of arbitrary data. The dominant pattern is **cache-aside (lazy loading)**: the app checks the cache; on a miss it reads the database, stores the result, and returns it. A **write-through** strategy updates the cache on every write to keep it fresh at the cost of write latency. A **TTL** bounds staleness. The classic exam use cases are **database query caching** (offload a read-heavy RDS) and **session stores** for stateless application tiers. Redis adds persistence, replication, pub/sub, and sorted sets; Memcached is simpler and purely a multi-threaded cache. When a question says "relational database is overwhelmed by repeated reads," ElastiCache in front of it is the usual fix.

### DAX — Caching for DynamoDB

DynamoDB Accelerator (DAX) is a purpose-built, in-memory cache *for DynamoDB* that delivers microsecond read latency and is API-compatible, so applications use it with minimal code change. Reach for DAX specifically when a DynamoDB table is read-heavy and needs faster-than-single-digit-millisecond reads or relief from read-capacity pressure. Do **not** use DAX for strongly consistent reads that must never be stale — DAX serves eventually consistent cached data. The exam pairs "DynamoDB" + "microsecond reads" / "read-heavy" with DAX, and contrasts it with ElastiCache (which is general-purpose and not DynamoDB-aware).

### Read Replicas — Scaling Reads, Not Quite Caching

While not a cache, RDS/Aurora **read replicas** belong in the same decision space: they offload read queries from the primary by serving them from asynchronously replicated copies, improving read throughput and isolating reporting workloads. Use them when reads (not repeated identical reads) are the bottleneck and the data is relational. If the same queries repeat, a cache (ElastiCache) is more efficient; if diverse reads simply exceed one instance's capacity, replicas scale them out.

---

## Configuration Reference

The placement decision in one view:

```text
Problem                                          → Cache layer
------------------------------------------------ → -------------------------
Global users, static/dynamic web content          → CloudFront (edge)
Repeated identical responses from an API           → API Gateway caching
Read-heavy relational DB, repeated queries         → ElastiCache (cache-aside)
Stateless app needs shared session store           → ElastiCache (Redis)
Read-heavy DynamoDB, microsecond reads             → DAX
Relational read throughput exceeds one instance    → RDS/Aurora read replicas
```

Cache-aside (lazy loading) pseudocode — the pattern to recognize:

```text
value = cache.get(key)
if value is None:            # cache miss
    value = database.read(key)
    cache.set(key, value, ttl=300)   # populate with a freshness bound
return value
# Writes either update-through (cache.set on write) or invalidate the key.
```

Freshness controls to know: **TTL** (bounded staleness), **write-through** (fresh but slower writes), **invalidation** (explicit purge, e.g., CloudFront invalidations).

---

## How to Decide

- **Are users globally distributed and the content cacheable?** → CloudFront at the edge.
- **Is a relational database overwhelmed by repeated reads?** → ElastiCache (cache-aside).
- **Is the data in DynamoDB and you need microsecond reads?** → DAX.
- **Do you need a shared session store for a stateless tier?** → ElastiCache (Redis).
- **Are diverse relational reads simply exceeding one instance?** → read replicas.
- **Must reads be strongly consistent and never stale?** → avoid the cache for those reads; go to the source.

---

## How This Connects

This lesson ties together the shared CloudFront, ElastiCache, DynamoDB (DAX), and RDS/Aurora lessons under one decision framework. It directly supports Domain 3's high-performing database (3.3) and network (3.4) tasks and overlaps Domain 4: caching reduces origin and database load, lowering cost as well as latency. It complements the **messaging/decoupling** lesson — together, caching and decoupling are the two levers most "improve this architecture" questions turn on.

---

## Exam Traps

- **ElastiCache vs. DAX.** DAX is *only* for DynamoDB. A read-heavy *relational* database calls for ElastiCache, not DAX.
- **Caching strongly consistent reads.** Caches serve potentially stale data; if a read must be strongly consistent, don't cache it.
- **CloudFront for a database problem.** CloudFront caches content at the edge; it doesn't fix a database read bottleneck — that's ElastiCache/DAX/replicas.
- **Read replicas for repeated identical queries.** If the same query repeats, a cache is more efficient than replicas; replicas scale *diverse* reads.
- **Forgetting the freshness mechanism.** Every cache answer should imply how staleness is controlled (TTL, write-through, or invalidation).

---

## Summary

Caching is the top performance lever on AWS, and the exam tests where to place it. CloudFront caches content at the edge for globally distributed users and offloads origins. ElastiCache provides general-purpose in-memory caching for read-heavy relational databases and session stores, typically via cache-aside with a TTL. DAX is the DynamoDB-specific in-memory cache for microsecond, read-heavy access. Read replicas scale diverse relational reads. Push the cache as close to the user as freshness allows, and always pair a cache choice with a staleness-control mechanism. Never cache reads that must be strongly consistent.

---

## Examples

**Example 1 — Global media site.** Users worldwide load images and articles. CloudFront serves them from edge POPs, cutting latency and offloading the S3/ALB origin.

**Example 2 — Overwhelmed product database.** A relational catalog database buckles under repeated product-detail reads. ElastiCache with cache-aside and a 5-minute TTL absorbs the repeats; the database load drops sharply.

**Example 3 — Hot DynamoDB table.** A leaderboard on DynamoDB needs microsecond reads at high volume. DAX caches reads with near-zero code change.

**Example 4 — Stateless web tier.** An Auto Scaling group must share user sessions across instances. Redis on ElastiCache holds sessions so any instance can serve any user.

---

## Think About It

A team puts DAX in front of a read-heavy *Amazon RDS* database to "make reads faster" and it doesn't work. Why is DAX the wrong tool here, and what would you use instead for a read-heavy relational database versus a read-heavy DynamoDB table?

---

## Quick Check

1. Which cache layer is closest to globally distributed users, and what does it offload?
2. Which service caches reads specifically for DynamoDB?
3. Describe the cache-aside (lazy loading) pattern in one sentence.
4. When should you NOT serve a read from a cache?

*Answers: (1) CloudFront at the edge, offloading the origin (S3/ALB/EC2); (2) DAX; (3) check the cache, and on a miss read the database, store the result with a TTL, and return it; (4) when the read must be strongly consistent / never stale.*

---

## What's Next

Next: the cross-domain **Cost-Optimized Network and Data Transfer** lesson (Domain 4), which shows how the same edge and routing choices that improve performance also drive — or reduce — your AWS bill.
