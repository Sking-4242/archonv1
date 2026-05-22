---
title: "Cloud SQL and Cloud Spanner"
type: content
estimated_minutes: 11
cert_tags: ["cdl", "ace", "pca"]
---

# Cloud SQL and Cloud Spanner

## Overview

Relational databases (RDBMS) enforce strict schemas, ACID transactions, and complex joins. GCP offers two fundamentally different relational database services. Choosing between them is the most common database architectural question on the Professional Cloud Architect exam.

## Cloud SQL (Regional Relational)

**Cloud SQL** is Google's fully managed service for traditional open-source and commercial engines: MySQL, PostgreSQL, and Microsoft SQL Server. It is the direct equivalent to AWS RDS.

* **The Use Case:** Lift-and-shift migrations of existing legacy databases, or standard web applications (like a WordPress site or an internal CRM). 
* **High Availability (HA):** Cloud SQL HA is strictly regional. When configured, GCP creates a primary instance in Zone A and a synchronous standby instance in Zone B. If Zone A fails, the connection automatically fails over to Zone B. 
* **The Ceiling:** Cloud SQL scales vertically. If your database runs out of CPU, you must reboot it onto a larger underlying Virtual Machine. Eventually, you hit the physical limit of how large a single server can be (currently 96 vCPUs and 624 GB of RAM). 

## Cloud Spanner (Global Relational)

What happens if your database needs to process 100,000 transactions per second, globally, with absolute financial accuracy? You cannot use Cloud SQL; it cannot scale horizontally for writes, and replicating it globally introduces replication lag.

**Cloud Spanner** is Google's proprietary superpower. It is the only fully managed relational database in the world that provides **horizontal scalability across the globe with strong consistency.**

* **The Use Case:** Global supply chain logistics, multinational banking ledgers, and massive multiplayer gaming backends. 
* **How it scales:** Unlike Cloud SQL, Spanner does not run on a single machine. It shards your relational tables across hundreds of servers globally. If you need more write capacity, you simply click a button to add more nodes.
* **TrueTime API:** How does Spanner keep a database perfectly synchronized between New York and Tokyo? It relies on the *TrueTime API*, a highly synchronized timekeeping system backed by GPS receivers and atomic clocks physically installed in Google data centers. This ensures that every transaction is perfectly ordered, globally, with zero replication anomalies.

## Summary

When architecting a relational database on GCP, start with **Cloud SQL**. It provides managed MySQL, PostgreSQL, and SQL Server with regional High Availability and automated backups. If—and only if—the workload requires massive global horizontal scalability, multi-region active-active writes, and cannot tolerate the limitations of a single physical server, escalate to **Cloud Spanner**.