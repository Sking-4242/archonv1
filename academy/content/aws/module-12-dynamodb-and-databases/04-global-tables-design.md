---
title: "DynamoDB Global Tables and Single-Table Design"
type: content
estimated_minutes: 10
cert_tags: ["SAA-C03", "SAP-C02", "DVA-C02"]
---

# DynamoDB Global Tables and Single-Table Design

## Overview

DynamoDB Global Tables provide fully managed multi-region, active-active replication. Single-table design is the DynamoDB modeling technique that uses one table to store multiple entity types, enabling all access patterns with a minimal number of requests. Both topics are essential for senior-level DynamoDB work.

## Global Tables

Global Tables automatically replicates a DynamoDB table across multiple AWS regions. All replicas are writeable — any region can accept writes and changes propagate to all other regions in under 1 second (typically). Conflict resolution uses last-writer-wins by timestamp. Use Global Tables for globally distributed applications that need low-latency reads and writes in multiple regions, and for multi-region active-active DR.

## Single-Table Design Principles

In traditional database design, each entity type has its own table. In DynamoDB, a common optimization is to store all entity types in one table. You create a generic partition key (e.g., `PK`) and sort key (e.g., `SK`) and overload them with different value formats per entity type. Example: `PK=USER#123, SK=PROFILE` for a user profile; `PK=USER#123, SK=ORDER#456` for an order. This allows a single Query to retrieve a user plus all their orders.

## Access Pattern First Design

The process: (1) identify all access patterns (e.g., 'get user by ID', 'get all orders for a user', 'get order by ID', 'get all users by email'); (2) design the base table PK/SK to serve the most frequent patterns; (3) add GSIs for alternate access patterns. Every pattern must map to a Query, not a Scan. If you can't map a pattern without a Scan, you need another GSI.

## Sparse Indexes

A sparse index contains only items that have the indexed attribute — DynamoDB only includes an item in a GSI if the item has the GSI's partition key attribute. This is a powerful pattern: add a `status` attribute only to items in a specific state (e.g., `status=PENDING`) and create a GSI on `status`. The GSI only contains pending items, making queries for pending work extremely efficient regardless of total table size.

## Summary

Global Tables enable multi-region active-active without custom replication logic. Single-table design collapses multiple entity types into one table, enabling all access patterns via Query. Access-pattern-first design and sparse indexes are the advanced modeling tools that distinguish DynamoDB experts from beginners.

## What's Next

Next up: ElastiCache — in-memory caching with Redis and Memcached.