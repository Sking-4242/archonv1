---
title: "Elastic Load Balancing Overview"
type: content
estimated_minutes: 7
cert_tags: ["aws_saa", "aws_soa", "aws_dva"]
---

# Elastic Load Balancing Overview

## Overview

Elastic Load Balancing (ELB) automatically distributes incoming traffic across multiple targets — EC2 instances, containers, Lambda functions, or IP addresses — in one or more Availability Zones. ELB is the first line of defense for availability and the scaling orchestrator for Auto Scaling Groups.

Without a load balancer, you can't scale horizontally without manual DNS changes. With one, adding or removing backend instances is transparent to users — the load balancer continuously routes traffic only to healthy targets.

## Why Load Balancers?

A single EC2 instance is a single point of failure and a capacity ceiling. Load balancers solve both: they spread traffic across multiple instances (scaling), detect and route around failed instances (availability), and provide a single stable endpoint (DNS name) for your service while the backend instances come and go.

ELB integrates natively with Auto Scaling — when ASG adds an instance, ELB registers it and starts sending traffic. When ASG removes an instance, ELB drains connections (waits for existing requests to complete) before deregistering it. This connection draining ensures zero-dropped-request scale events.

## Health Checks

Every ELB load balancer continuously health-checks its targets. A health check defines: **Protocol** (HTTP, HTTPS, TCP, or gRPC), **Path** (for HTTP/HTTPS — e.g., /health), **Success codes** (200-299), **Interval** (how frequently to check — default 30 seconds), **Healthy/unhealthy threshold** (how many consecutive successes/failures before changing health status).

When a target fails its health check, ELB immediately stops sending new requests to it. Existing requests continue until connection draining completes. When the target passes health checks again, it re-enters the rotation. Health checks must be cheap to compute (a dedicated /health endpoint that returns 200 immediately, without database lookups or complex processing).

## SSL/TLS Termination

ELB can terminate SSL/TLS connections, decrypting HTTPS traffic before forwarding it to backend instances over unencrypted HTTP within the VPC. This offloads the CPU cost of TLS handshakes from your backend instances and centralizes certificate management — rotate the certificate on the load balancer once, not on each instance.

Certificates are managed via AWS Certificate Manager (ACM), which provides free SSL certificates for domains you own and handles automatic renewal. ACM certificates can be attached to ALB/NLB listeners directly from the console.

## Summary

ELB distributes traffic across multiple healthy targets in multiple AZs, enabling horizontal scaling and fault tolerance. It integrates with Auto Scaling for seamless scale-in/scale-out. Health checks continuously verify target availability. SSL/TLS termination offloads crypto CPU cost from backends and centralizes certificate management via ACM.

## What's Next

Next: ALB vs. NLB vs. CLB — the three load balancer types and which to use for different protocols and use cases.
