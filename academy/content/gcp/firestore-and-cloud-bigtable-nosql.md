---
title: "Firestore and Cloud Bigtable (NoSQL)"
type: content
estimated_minutes: 10
cert_tags: ["cdl", "ace", "pca"]
---

# Firestore and Cloud Bigtable (NoSQL)

## Overview

Relational databases are rigid. If your data structure changes constantly, or you need to process millions of unstructured IoT sensor readings per second, you need a NoSQL database. GCP splits the NoSQL landscape into two specialized services: one for mobile/web developers, and one for massive analytical scale.

## Firestore (Document NoSQL)

**Firestore** (the successor to Cloud Datastore) is a fully managed, serverless, document-oriented NoSQL database. It is highly comparable to MongoDB or AWS DynamoDB.

* **Data Structure:** Data is stored as JSON-like "Documents" organized into "Collections." It is incredibly flexible. 
* **The Use Case:** Mobile applications, real-time web dashboards, and user profile management.
* **Real-time Sync & Offline Mode:** This is Firestore's killer feature. It natively integrates with web and mobile SDKs. If a user updates a document on their phone, Firestore instantly pushes that update to every other connected client worldwide. Furthermore, if the mobile phone loses cellular service, Firestore caches the data locally and seamlessly syncs it to the cloud when the connection is restored.

## Cloud Bigtable (Wide-Column NoSQL)

Firestore is great for gigabytes or terabytes of data. But what if you are tracking the historical telemetry of 5 million connected vehicles, reading sensor data every second of the day, resulting in petabytes of data? Firestore will buckle. You need **Cloud Bigtable**.

Bigtable is a sparsely populated, wide-column NoSQL database. It is the exact underlying database that powers Google Search, Google Analytics, and Google Maps. It is compatible with the open-source Apache HBase API.

* **The Scale:** It is designed for single-digit millisecond latency at the petabyte scale. It can handle millions of read/write operations per second. 
* **The Use Case:** Time-series data (IoT sensor telemetry), financial market data ticks, and massive analytical graphs. 
* **Architectural Constraint:** Bigtable is not serverless. You must provision Bigtable clusters (Nodes) and pay for them 24/7. It does not support complex SQL queries or multi-row transactions. It is designed purely for blistering speed at massive volume using a single Row Key.

## Summary

GCP NoSQL architectures are split by scale and use case. **Firestore** is a serverless document database offering real-time synchronization and offline caching, making it the default backend for modern mobile and web applications. **Cloud Bigtable** is a provisioned, wide-column database engineered for absolute throughput and low latency at the petabyte scale, acting as the ingestion point for massive IoT and time-series telemetry workloads.