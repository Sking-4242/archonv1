---
title: "Elastic Load Balancing (ELB)"
type: content
estimated_minutes: 20
cert_tags: ["CLF-C02", "SAA-C03", "SOA-C03", "SCS-C03"]
---

# Elastic Load Balancing (ELB)

## Overview

Elastic Load Balancing (ELB) automatically distributes incoming traffic across multiple targets — EC2 instances, containers, IP addresses, or Lambda functions — in one or more Availability Zones. It is the front door that makes applications scalable, highly available, and resilient: it spreads load, removes unhealthy targets, terminates TLS, and provides a stable entry point. This *service reference* lesson covers the load balancer types and how to choose them, listeners and target groups, health checks, security, and what each certification expects.

ELB matters because high availability and elasticity require distributing traffic across redundant, replaceable backends. Paired with EC2 Auto Scaling, ELB is half of the canonical elastic web architecture: Auto Scaling changes *how many* instances exist, ELB routes traffic only to the *healthy* ones. The single most important exam decision is **which type of load balancer** to use, because AWS offers several optimized for different network layers and use cases: the **Application Load Balancer (ALB)**, the **Network Load Balancer (NLB)**, and the **Gateway Load Balancer (GWLB)** (plus the legacy Classic Load Balancer, now deprecated for new designs).

---

## How It Works

A load balancer has **listeners** (a protocol/port it accepts on) whose rules forward to **target groups** (collections of registered backends). **Health checks** continuously probe each target, and the load balancer routes only to healthy ones, automatically removing and re-adding targets as their health changes. The three modern types:

- **Application Load Balancer (ALB)** — operates at **Layer 7 (HTTP/HTTPS)**. It routes by **content** — host header, path, HTTP headers, query string, method, source IP — and supports redirects, fixed responses, built-in authentication (OIDC/Cognito), and targets including instances, IPs, containers, and **Lambda**. Use it for web apps, microservices, and anything needing content-based routing.
- **Network Load Balancer (NLB)** — operates at **Layer 4 (TCP/UDP/TLS)**, offering ultra-low latency and extreme throughput, a **static IP per AZ** (and Elastic IP support), and preservation of the source IP. Use it for high-performance, latency-sensitive, non-HTTP, or static-IP requirements.
- **Gateway Load Balancer (GWLB)** — operates at **Layer 3**, transparently inserting fleets of third-party virtual appliances (firewalls, IDS/IPS, deep packet inspection) into the traffic path using the GENEVE protocol. Use it for inline security inspection.

---

## Key Features

- **Cross-zone load balancing** evenly distributes requests across targets in all enabled AZs (on by default for ALB; optional and historically billed for NLB).
- **TLS termination** at the load balancer using **ACM** certificates, offloading encryption from backends, with optional re-encryption to backends for end-to-end TLS; **SNI** supports many certificates on one listener.
- **Sticky sessions** (duration- or application-cookie-based) for stateful apps.
- **Content-based routing** (ALB) by host/path/header for microservices and multi-tenant routing.
- **Health checks** with configurable path, protocol, thresholds, and intervals.
- **Access logs** to S3, **CloudWatch metrics**, and **request tracing**; **WAF** integration on ALB for L7 filtering; **deletion protection**.

---

## Configuration Reference

- **Choose the type** by layer and use case: ALB for HTTP routing and Lambda/microservices; NLB for L4 performance, static IPs, or non-HTTP; GWLB for transparent appliance insertion.
- **Internet-facing vs. internal** scheme determines public vs. private-only addressing; place internet-facing LBs in public subnets and targets in private subnets.
- **Security groups** (ALB) restrict allowed traffic; targets' security groups must allow the load balancer. NLB now supports security groups too.
- **Health-check** path, port, success codes, and thresholds must match the application's real readiness.
- **Attach ACM certificates** for HTTPS/TLS listeners and enable access logging for audit/troubleshooting.

---

## Operations and Troubleshooting

- **5xx errors or "no healthy targets."** Check health-check configuration (path/port/success codes), that target security groups allow the load balancer's traffic, the application's startup time, and target registration. ALB returns specific codes: **502** (bad backend response), **503** (no healthy targets), **504** (backend timeout).
- **TLS issues.** Verify the ACM certificate, listener protocol, SNI for multi-cert listeners, and (for end-to-end encryption) the backend certificate trust.
- **Uneven load.** Enable cross-zone load balancing and review sticky-session settings.
- **Monitoring.** CloudWatch metrics — `RequestCount`, `TargetResponseTime`, `HealthyHostCount`, `HTTPCode_Target_5XX`, `HTTPCode_ELB_5XX` — plus access logs diagnose most issues.

---

## Integrations

ELB fronts **EC2**, **ECS/EKS**, **Lambda** (ALB), and IP targets; pairs with **EC2 Auto Scaling** for elasticity and self-healing; terminates TLS with **ACM**; is protected by **AWS WAF** (ALB) and **AWS Shield**; routed to by **Route 53** and **CloudFront**; and logged/monitored via **S3 access logs** and **CloudWatch**. GWLB integrates third-party security appliances. It is a foundational building block in nearly every multi-tier and microservices architecture.

---

## Pricing and Cost Considerations

ELB charges an hourly (or partial-hour) rate per load balancer plus a capacity-based usage charge measured in **Load Balancer Capacity Units (LCU for ALB, NLCU for NLB)** that reflect new connections, active connections, processed bytes, and (ALB) rule evaluations. The cost levers are choosing the right type (NLB can be cheaper for high-throughput L4; ALB's L7 features cost more per unit), consolidating where sensible, and minimizing cross-AZ data and very high connection churn (which drive LCU consumption). Access-log storage in S3 adds its normal cost. Exact prices vary by type and Region.

---

## Exam Relevance

**CLF-C02:** Know ELB as the service that distributes traffic across multiple targets for availability and scalability, and that it pairs with Auto Scaling. Foundational.

**SAA-C03:** Know ALB vs. NLB vs. GWLB selection, content-based routing, cross-zone balancing, TLS termination/re-encryption with ACM, static IPs (NLB), Lambda targets (ALB), and ELB+Auto Scaling architectures — heavily tested. Design depth.

**SOA-C03:** Operate load balancers — health checks, the 502/503/504 distinction, access logs, CloudWatch metrics, and troubleshooting unhealthy targets. Operations depth.

**SCS-C03:** Secure the edge — TLS termination/re-encryption, WAF on ALB, Shield for DDoS, security groups, and GWLB for inline inspection. Security depth.

---

## Summary

Elastic Load Balancing distributes traffic across healthy targets in multiple AZs using listeners, target groups, and health checks. The Application Load Balancer handles Layer 7 HTTP routing by content (and can target Lambda); the Network Load Balancer handles Layer 4 with ultra-low latency, static IPs, and source-IP preservation; the Gateway Load Balancer transparently inserts inline security appliances. ELB terminates TLS with ACM, integrates with WAF and Shield for protection, and pairs with EC2 Auto Scaling to form the standard elastic, highly available architecture. Choosing the right type for the layer/use case, the 502/503/504 troubleshooting distinction, and TLS/ACM handling are the recurring exam points.

---

## Quick Check

1. Which load balancer routes by host/path at Layer 7, which offers static IPs and ultra-low latency at Layer 4, and which inserts third-party security appliances?
2. How do ELB and EC2 Auto Scaling combine to deliver elastic high availability?
3. Where do you attach the TLS certificate for HTTPS, which service issues it, and how do you serve many certificates on one listener?
4. What do ALB 502, 503, and 504 each indicate?
5. A target group shows no healthy targets — what would you check first?

---

## What's Next

Pair this with **EC2 Auto Scaling**, **Amazon Route 53** (DNS routing to the LB), **Amazon CloudFront** (edge), and **AWS WAF** (L7 protection on ALB).
