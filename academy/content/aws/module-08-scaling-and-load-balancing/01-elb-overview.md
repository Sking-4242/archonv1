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

## Examples

A mid-sized e-commerce retailer runs a checkout service on a fleet of EC2 instances across two Availability Zones. They place an ELB in front of it, pointing at a target group in both AZs. When one instance develops a memory leak and its `/health` endpoint starts returning 503s, the load balancer stops routing traffic to it within two consecutive failed checks — roughly 60 seconds — while their Auto Scaling Group replaces it. Customers never see an error. This is the foundational promise of ELB: a single failed instance does not mean a failed service.

A SaaS company migrates their monolith to AWS and initially terminates TLS on each EC2 instance, requiring the team to manually renew certificates on a dozen servers every 13 months. After attaching an ALB and moving TLS termination to the load balancer, they provision a free ACM certificate once, set auto-renewal, and remove OpenSSL configuration from all their instance launch scripts. Their backend instances now only handle HTTP inside the VPC — CPU utilization drops noticeably during peak traffic because TLS handshakes are no longer competing with application work.

A gaming company notices that their Auto Scaling Group occasionally terminates an instance mid-request during a scale-in event, causing users to lose match progress. They investigate and discover they haven't configured the ELB's connection draining (deregistration delay). After enabling it with a 30-second timeout, the load balancer holds existing connections to a terminating instance open until they complete before it deregisters the target — their ASG then terminates it cleanly. Zero dropped requests on the next scale-in cycle.

## Think About It

1. Why does a load balancer's health check endpoint need to be cheap to compute? What could go wrong if your `/health` route triggers a database query or calls a downstream API before returning 200?
2. ELB integrates with Auto Scaling so that newly launched instances are registered and traffic is routed to them automatically. What would happen if a new instance was registered with the load balancer before its application had finished starting up? How would you prevent requests from hitting an unready instance?
3. SSL/TLS termination at the load balancer means traffic between the ELB and your EC2 instances travels unencrypted inside the VPC. Under what circumstances might that be an unacceptable trade-off, and how would you address it?
4. What trade-offs does the "healthy/unhealthy threshold" setting introduce? If you set the unhealthy threshold very low (e.g., 1 failed check), what risk does that create? If you set it very high (e.g., 10 failed checks), what risk does that create?
5. How would you decide what interval to set for health checks on a backend that serves latency-sensitive requests? What happens to your target instances if the health check interval is too short?

## Quick Check

**Q1.** What is the primary purpose of connection draining (deregistration delay) in ELB?

- A) To encrypt traffic between the load balancer and backend instances
- B) To allow in-flight requests to complete before a target is deregistered
- C) To prevent new instances from receiving traffic before they pass a health check
- D) To cache responses for frequently requested paths

**Answer: B** — Connection draining ensures that existing requests to a deregistering target are given time to complete, preventing dropped connections during scale-in or instance replacement events.

**Q2.** A company wants to manage SSL certificates in one place rather than on each EC2 instance. Which ELB feature enables this?

- A) Health check thresholds
- B) Cross-zone load balancing
- C) SSL/TLS termination at the load balancer using ACM certificates
- D) Sticky sessions

**Answer: C** — ELB can terminate SSL/TLS at the listener using certificates provisioned in ACM, so backends receive plain HTTP and certificate management is centralized on the load balancer.

**Q3.** Which of the following correctly describes what happens when an ELB target fails its health check?

- A) The ASG immediately terminates the instance
- B) ELB stops sending new requests to the target and waits for connection draining before deregistering it
- C) ELB redirects all existing connections to a different target immediately
- D) The load balancer disables the entire Availability Zone the target is in

**Answer: B** — When a target fails its health check threshold, ELB stops routing new traffic to it but allows existing connections to complete via connection draining before fully deregistering the target.

## What's Next

Next: ALB vs. NLB vs. CLB — the three load balancer types and which to use for different protocols and use cases.
