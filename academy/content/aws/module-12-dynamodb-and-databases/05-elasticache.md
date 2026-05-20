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

## What's Next

Next up: Other AWS Databases — Redshift, Neptune, Timestream, QLDB, and DocumentDB overview.