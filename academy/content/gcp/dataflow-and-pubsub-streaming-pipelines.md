---
title: "Dataflow and Pub/Sub: Streaming Pipelines"
type: content
estimated_minutes: 11
cert_tags: ["cdl", "pca"]
---

# Dataflow and Pub/Sub: Streaming Pipelines

## Overview

Data is rarely static. In modern architectures, data flows continuously: clickstreams from a website, fraud detection alerts from a banking app, or sensor data from a manufacturing floor. 

GCP provides two deeply integrated services to ingest and process this massive stream of real-time data: **Cloud Pub/Sub** (the ingestion buffer) and **Cloud Dataflow** (the processing engine). 

## Cloud Pub/Sub (The Shock Absorber)

**Cloud Pub/Sub** is a globally distributed, asynchronous messaging service. It is the GCP equivalent of AWS SNS + SQS combined, or Apache Kafka.

* **The Concept:** A Publisher (e.g., an IoT device) sends a message to a "Topic." A Subscriber (e.g., a database or a processing script) listens to a "Subscription" attached to that Topic.
* **Decoupling:** Pub/Sub decouples the sender from the receiver. If you have 10,000 IoT devices sending data, and your database crashes, the data is not lost. Pub/Sub acts as a massive shock absorber, holding the messages safely in the queue until the database comes back online and pulls them down.
* **Global Routing:** A publisher in Tokyo can publish to a Topic, and a subscriber in London can pull from that exact same Topic with zero complex regional routing required.

## Cloud Dataflow (The Processing Engine)

Once the raw data is sitting in Pub/Sub, it is often useless in its current state. A raw clickstream event might be missing a user ID, or it might be in the wrong JSON format for BigQuery.

**Cloud Dataflow** is a fully managed service for processing data. It is built on the open-source **Apache Beam** SDK. 
* **Unified Model:** In the past, engineers had to write one script for "Batch Processing" (processing a giant CSV file overnight) and a completely different script for "Stream Processing" (processing real-time Pub/Sub messages). Apache Beam provides a unified model. You write the code once, and Dataflow can execute it against either a batch file or a real-time stream.
* **Serverless Execution:** You simply submit the Apache Beam job to GCP. Dataflow automatically spins up Compute Engine VMs, distributes the processing workload, scales the VMs horizontally based on the incoming data volume, and spins them down when the queue is empty.

## Summary

For real-time streaming architectures, architects pair Pub/Sub with Dataflow. **Cloud Pub/Sub** provides a highly durable, globally distributed messaging buffer to decouple publishers from subscribers and absorb massive traffic spikes. **Cloud Dataflow** executes Apache Beam pipelines to transform, enrich, and filter that data in real-time, completely managing the underlying compute infrastructure required for processing.