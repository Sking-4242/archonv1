---
title: "Amazon Route 53"
type: content
estimated_minutes: 18
cert_tags: ["CLF-C02", "SAA-C03", "SOA-C03", "SCS-C03"]
---

# Amazon Route 53

## Overview

Amazon Route 53 is AWS's highly available and scalable Domain Name System (DNS) web service, combined with domain registration and health checking. It translates human-friendly names into IP addresses and, crucially, can route traffic intelligently based on latency, geography, health, and weighting — turning DNS into a global traffic-management and availability tool. This *service reference* lesson covers hosted zones and record types, every routing policy, health checks and failover, private and hybrid DNS, and what each certification expects.

Route 53 matters because DNS is the first control point for directing users to the right endpoint, and AWS makes it programmable and resilient (backed by a 100% availability SLA). Its routing policies let you build global, fault-tolerant architectures: send users to the nearest Region, fail over to a standby, split traffic for canary releases, or comply with data-residency rules. The name "53" refers to the DNS port. The core mental model is a **hosted zone** (a container for a domain's records) holding **records** (name → value mappings) that resolve according to a chosen **routing policy**, optionally gated by **health checks**.

---

## How It Works

- **Hosted zones** — **public** (resolves on the internet) or **private** (resolves only within associated VPCs).
- **Records** — standard DNS types (A, AAAA, CNAME, MX, TXT, NS, SRV) plus the AWS-specific **alias record**, which points to AWS resources (CloudFront, ELB, S3 website, API Gateway, another Route 53 record) — usable at the **zone apex** (where CNAMEs are illegal) and **free of per-query charges**.
- **Routing policies** determine which value is returned:
  - **Simple** — one record, no logic.
  - **Weighted** — split traffic by assigned weights (A/B testing, canary, gradual migration).
  - **Latency-based** — send users to the AWS Region giving them the lowest network latency.
  - **Failover** — primary/secondary, with the secondary served only when the primary's health check fails.
  - **Geolocation** — route by the user's continent/country/state (compliance, localization).
  - **Geoproximity** — route by geographic distance with an adjustable bias to shift load between Regions.
  - **Multivalue answer** — return multiple healthy records for simple client-side load distribution.
  - **IP-based** — route by the client's CIDR for network-aware decisions.

**Health checks** monitor endpoints (HTTP/HTTPS/TCP), other health checks (calculated), or **CloudWatch alarms**, and remove unhealthy targets from responses — the basis of DNS failover.

---

## Key Features

- **Alias records** for zone-apex pointing to AWS resources, with no per-query charge and automatic target tracking.
- **Health checks with failover**, including calculated checks (combine multiple) and CloudWatch-alarm-based checks for metric-driven failover.
- **Traffic Flow** — a visual policy editor and versioned traffic policies for combining routing types.
- **Private hosted zones** for internal VPC name resolution; **Route 53 Resolver** endpoints (inbound/outbound) for hybrid DNS between on-premises and AWS.
- **DNSSEC** signing for response integrity, and **Resolver DNS Firewall** / query logging for security.
- **Domain registration** with auto-renew and transfer.

---

## Configuration Reference

- **Choose a routing policy** to match the goal: failover for DR, latency for global performance, weighted for canary releases, geolocation for residency/localization.
- **Use alias records** for ELB/CloudFront/S3/API Gateway, especially at the apex (CNAMEs are not allowed there).
- **Attach health checks** to records that need automatic failover; set low TTLs where fast failover matters.
- **Associate private hosted zones** with the VPCs that should resolve internal names, and ensure VPC DNS settings are enabled.

---

## Operations and Troubleshooting

- **Failover not working.** Verify the health check targets the right endpoint/path/port, that the records reference the health check, and that TTLs are low enough for timely failover (resolvers cache for the TTL).
- **Apex domain to an AWS resource.** A CNAME is illegal at the apex — use an **alias** record.
- **Propagation/caching delays.** Changes take effect after cached TTLs expire; lower TTLs speed changes but increase query volume and cost.
- **Private resolution fails.** Confirm the private hosted zone is associated with the querying VPC and that VPC **DNS resolution/hostnames** are enabled; for on-premises resolution, check Resolver endpoints and rules.

---

## Integrations

Route 53 routes users to **CloudFront**, **ELB**, **S3** websites, **API Gateway**, and EC2 endpoints via alias records; drives **multi-Region failover** with health checks and **CloudWatch** alarms; provides **private DNS** within VPCs and **hybrid DNS** via Resolver endpoints; and supports security via **DNSSEC** and **Resolver DNS Firewall**. It is the global entry point in front of the edge and regional tiers and a key building block for disaster recovery and global applications.

---

## Pricing and Cost Considerations

Route 53 charges a small monthly fee **per hosted zone**, **per million DNS queries** (with **alias queries to AWS resources free**), for **health checks** (more for HTTPS/string-matching/fast-interval checks), and for **domain registration** (annual, per TLD). Costs are generally modest; the main considerations are consolidating hosted zones, using alias records to avoid query charges, and being mindful of health-check counts and intervals in large failover designs. Exact prices vary by query type and Region.

---

## Exam Relevance

**CLF-C02:** Know Route 53 as AWS's scalable DNS and domain registration service that can route traffic and check endpoint health. Foundational.

**SAA-C03:** Know the routing policies (especially failover, latency, weighted, geolocation/geoproximity, multivalue), alias vs. CNAME and the apex rule, health checks, and multi-Region DR patterns — frequently tested. Design depth.

**SOA-C03:** Operate DNS — health checks and CloudWatch-alarm-based failover, TTL management, and private hosted zones. Operations depth.

**SCS-C03:** Know DNS security — DNSSEC, private hosted zones to avoid public exposure, and Resolver DNS Firewall/query logging for detection of exfiltration over DNS. Security depth.

---

## Summary

Amazon Route 53 is scalable DNS plus domain registration and health checking, where hosted zones hold records that resolve according to routing policies — simple, weighted, latency-based, failover, geolocation, geoproximity, multivalue, and IP-based. Alias records point to AWS resources at the zone apex without per-query charges, and health checks (including CloudWatch-alarm-based) drive automatic failover for resilient multi-Region architectures. Private hosted zones serve internal VPC resolution, Resolver endpoints bridge hybrid DNS, and DNSSEC and Resolver DNS Firewall add security. The recurring exam points are alias-vs-CNAME (apex), choosing the right routing policy for a scenario, and TTL's effect on failover speed. Route 53 is the intelligent global front door for routing users to the right, healthy endpoint.

---

## Quick Check

1. Why must you use an alias record (not a CNAME) to point a zone apex at an ELB or CloudFront distribution, and what's the cost advantage of alias?
2. Which routing policy sends users to the lowest-latency Region, which enables primary/secondary DR, and which biases load between Regions geographically?
3. How do health checks (including CloudWatch-alarm-based) enable DNS-level failover?
4. What is a private hosted zone used for, and what VPC settings must be enabled?
5. How does TTL affect how quickly a failover or record change takes effect?

---

## What's Next

Pair this with **Amazon CloudFront** and **Elastic Load Balancing** (common alias targets) and the multi-Region DR patterns in the architecture and operations cert lessons.
