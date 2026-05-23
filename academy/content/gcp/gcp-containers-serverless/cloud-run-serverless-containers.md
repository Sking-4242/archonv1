---
title: "Cloud Run: Serverless Containers"
type: content
estimated_minutes: 11
cert_tags: ["cdl", "ace", "pca"]
---

# Cloud Run: Serverless Containers

## Overview

Deploying microservices used to require a harsh compromise. You could use serverless functions (like AWS Lambda) and accept strict vendor lock-in and language constraints, or you could use Kubernetes (GKE) and accept a massive operational burden.

**Cloud Run** is Google's bridge. It is a fully managed serverless platform that runs containerized applications. It has become the absolute default recommendation for modern application deployment in GCP. 

## The Knative Foundation

The architectural brilliance of Cloud Run is that it is built on **Knative**, an open-source standard for serverless workloads on Kubernetes. 
* **No Lock-in:** Because it runs standard OCI (Docker) containers and adheres to the Knative API, an application built for Cloud Run can be lifted and shifted directly onto any on-premises Kubernetes cluster tomorrow with zero code changes. 
* **The Contract:** Cloud Run only asks for two things: the container must listen for HTTP requests on the port defined by the `$PORT` environment variable, and it must be stateless (no local disk persistence between requests).

## Scale to Zero and Concurrency

Cloud Run handles all infrastructure provisioning, load balancing, and scaling automatically. 

* **Scale to Zero:** If your application receives no traffic at 3:00 AM, Cloud Run terminates the container. You pay exactly $0.00 for compute while it sits idle.
* **Concurrency (The AWS Lambda Killer):** This is the massive differentiator. In AWS Lambda or Azure Functions, one execution environment handles exactly one request at a time. If 100 users hit your API, AWS spins up 100 Lambda instances. 
  Cloud Run supports **Concurrency**. A single Cloud Run container can handle up to 1,000 simultaneous HTTP requests. If 100 users hit your API, Cloud Run routes them all to a single container instance, drastically reducing Cold Starts and massively reducing your compute bill.

## Revisions and Traffic Splitting

Every time you deploy a new container image to a Cloud Run service, it creates an immutable **Revision**. 

Architects use Revisions to execute safe, zero-downtime deployments. You can deploy Revision V2, but tell Cloud Run to keep routing 100% of production traffic to Revision V1. You then use the GCP Console to split the traffic: sending 5% to V2 (a canary deployment). If error rates remain stable, you adjust the dial to 100%. If V2 crashes, you instantly roll the dial back to V1.

## Summary

Cloud Run is a serverless compute platform that marries the flexibility of Docker containers with the operational simplicity of serverless. By utilizing concurrency, a single container can process hundreds of simultaneous requests, optimizing OpEx. Built on the open-source Knative standard, it prevents vendor lock-in while providing advanced deployment controls like immutable revisions and granular traffic splitting.