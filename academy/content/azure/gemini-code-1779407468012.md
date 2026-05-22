---
title: "Open Source Databases & Caching"
type: content
estimated_minutes: 8
cert_tags: ["az_104", "az_305"]
---

# Open Source Databases & Caching

## Overview

While Microsoft SQL Server is Azure's flagship, modern development teams heavily rely on open-source relational databases. Azure provides fully managed PaaS offerings for the two most popular open-source engines: **Azure Database for PostgreSQL** and **Azure Database for MySQL**.

Additionally, as we discussed in the Cosmos DB lesson, latency is the enemy of cloud applications. To accelerate database reads and offload traffic from your primary database, enterprise architectures deploy in-memory caching layers. In Azure, this is accomplished via **Azure Cache for Redis**.

## Flexible Server Architecture

When deploying PostgreSQL or MySQL in Azure, you will encounter two deployment models: *Single Server* and *Flexible Server*. 

**Single Server is legacy and on a deprecation path.** For all new architectures and exam questions, the correct answer is **Flexible Server**.

The Flexible Server architecture provides significantly more control than the older PaaS offerings:
* **Custom Maintenance Windows:** You control exactly when Microsoft applies minor version upgrades.
* **Stop/Start Capabilities:** Unlike Azure SQL Database, you can literally "stop" a Flexible Server when not in use (e.g., over the weekend for dev environments) to halt compute billing entirely.
* **High Availability (Zone Redundant):** Flexible Server natively supports spinning up a synchronous standby server in a completely different Availability Zone. If the primary zone goes offline, Azure automatically fails over to the standby instance with zero data loss.

## Read Replicas

Both PostgreSQL and MySQL Flexible Servers support **Read Replicas**. 
If you have a heavy e-commerce site, your primary database handles all the "Writes" (creating new orders). To prevent the database from buckling under the pressure of "Reads" (users browsing the product catalog), you can spin up to 5 Read Replicas.

Azure automatically and asynchronously replicates data from the primary to the replicas. You then update your application code to send all `SELECT` queries to the replicas, freeing up the primary to handle the transactions.

## Azure Cache for Redis

Even with Read Replicas, querying a relational database requires hitting a physical disk (or an SSD), which takes milliseconds. For high-volume data that is accessed repeatedly (like a shopping cart session, or a user's session token), milliseconds are too slow.

**Azure Cache for Redis** is an in-memory data store. Because data is stored in RAM rather than on a disk, access times are measured in microseconds. It is the direct equivalent to AWS ElastiCache.

**Architectural Use Cases:**
* **Data Cache:** A user requests the top 10 news articles. The app checks Redis. If not there (a cache miss), it queries the SQL Database, returns the data, and saves a copy in Redis. The next 10,000 users get the data directly from Redis (a cache hit), saving the SQL Database from 10,000 identical queries.
* **Session Store:** Storing temporary user login states for stateless web applications running behind a load balancer.

## Summary

Azure fully supports open-source databases through the Azure Database for PostgreSQL and MySQL **Flexible Server** deployments. Flexible Server provides advanced PaaS features including start/stop cost savings, custom maintenance windows, and zone-redundant high availability. To alleviate database load for read-heavy applications, architects utilize Read Replicas, and to achieve microsecond latency for frequently accessed data, they deploy Azure Cache for Redis as an in-memory layer.