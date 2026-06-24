---
title: "AWS Global Accelerator"
type: content
estimated_minutes: 13
cert_tags: ["SAA-C03", "SOA-C03"]
---

# AWS Global Accelerator

## Overview

AWS Global Accelerator improves the **availability and performance** of your applications for global users by routing traffic over the **AWS global network** to the optimal regional endpoint, using **static anycast IP addresses** as a fixed entry point. It is a network-layer accelerator for TCP/UDP traffic, distinct from CloudFront's content caching. This *service reference* lesson covers how it works, when to use it versus CloudFront, failover, and what each certification expects.

Global Accelerator matters because traffic that traverses the public internet suffers variable latency, jitter, and routing inefficiency, and exposing regional endpoints directly gives users no single stable address and slow failover. Global Accelerator solves both: it provides **two static anycast IPs** advertised from AWS edge locations worldwide, so user traffic enters the AWS backbone at the nearest edge and travels the optimized private network to the best healthy endpoint — improving performance and enabling fast regional failover. The core mental model is a **fixed front door (static IPs at the edge) + intelligent routing over the AWS backbone to regional endpoints**, with health checks driving instant failover.

---

## How It Works

You create an **accelerator** with two **static anycast IP addresses** (or bring your own). Traffic to those IPs is received at the **nearest AWS edge location** and routed over the **AWS global network** to your application:

- **Listeners** accept traffic on ports/protocols (TCP/UDP).
- **Endpoint groups** (one per Region) contain **endpoints** — Application/Network Load Balancers, EC2 instances, or Elastic IPs.
- **Traffic dials** and **weights** control how much traffic each Region/endpoint receives, and **health checks** remove unhealthy endpoints, shifting traffic to healthy Regions within seconds.

Because the static IPs are constant and routing is health-aware, clients keep one address while Global Accelerator handles optimal routing and failover behind it.

---

## Key Features

- **Two static anycast IPs** as a fixed, global entry point (no DNS changes on failover).
- **Routing over the AWS global network** for lower, more consistent latency than the public internet.
- **Fast regional failover** via health checks (seconds), shifting traffic to healthy endpoints.
- **Traffic dials and endpoint weights** for blue/green, gradual rollout, and load distribution across Regions.
- **Client affinity** options and support for **TCP and UDP** (including non-HTTP workloads like gaming, IoT, VoIP).
- **Standard and custom-routing** accelerators (custom routing maps users to specific endpoints/ports).

---

## Configuration Reference

- **Create an accelerator** with listeners, **endpoint groups per Region**, and endpoints (ALB/NLB/EC2/EIP).
- **Set traffic dials/weights** for cross-Region distribution and rollouts, and configure **health checks** for failover.
- **Use the static IPs** as your application's stable entry point (allowlist-friendly), optionally bringing your own IPs.

---

## Operations and Troubleshooting

- **Global Accelerator vs. CloudFront.** Use **CloudFront** for cacheable HTTP content (CDN, edge caching, WAF); use **Global Accelerator** for non-cacheable TCP/UDP traffic, static IPs, fast multi-Region failover, and non-HTTP protocols. This is the core exam decision.
- **Failover not happening.** Verify endpoint **health checks** and that multiple Regional endpoint groups exist.
- **Need a fixed IP for allowlisting.** Global Accelerator's static IPs solve the problem of ALBs not having fixed IPs.
- **Uneven traffic.** Adjust traffic dials/weights.

---

## Integrations

Global Accelerator routes to **Application/Network Load Balancers**, **EC2** instances, and **Elastic IPs** across Regions; pairs with **AWS Shield** (the static IPs benefit from DDoS protection) and **Route 53** (DNS); and serves multi-Region, latency-sensitive, or non-HTTP workloads. It complements **CloudFront** (content caching at the edge) — together they cover cacheable web content (CloudFront) and accelerated/failover network traffic (Global Accelerator).

---

## Pricing and Cost Considerations

Global Accelerator charges a **fixed hourly fee per accelerator** plus a **data-transfer-premium** based on the volume and the dominant direction/Region of traffic over the AWS network. The benefit is improved performance and faster failover; the cost consideration is the per-accelerator fee plus premium transfer, so it's justified for global, latency-sensitive, or high-availability multi-Region applications rather than simple single-Region web apps (where CloudFront or plain DNS may suffice). Exact prices vary by Region.

---

## Exam Relevance

**SAA-C03:** Know Global Accelerator's static anycast IPs, AWS-backbone routing, fast multi-Region failover, TCP/UDP support, and especially **Global Accelerator vs. CloudFront** (network/static-IP/failover vs. content caching). Design depth.

**SOA-C03:** Operate it — endpoint groups, health-check-driven failover, and traffic dials for rollouts. Operations depth.

---

## Summary

AWS Global Accelerator gives applications two static anycast IPs as a fixed global entry point and routes user traffic from the nearest edge over the AWS backbone to the optimal healthy regional endpoint (ALB/NLB/EC2/EIP), with health checks enabling fast multi-Region failover and traffic dials/weights for distribution and rollouts. It accelerates TCP/UDP (including non-HTTP) traffic and benefits from Shield DDoS protection. The defining exam point is Global Accelerator (network-layer acceleration, static IPs, fast failover, any TCP/UDP) versus CloudFront (HTTP content caching at the edge).

---

## Quick Check

1. What two things does Global Accelerator provide that improve global application delivery?
2. Why are its static anycast IPs useful, and how does failover avoid DNS changes?
3. How does Global Accelerator differ from CloudFront, and when would you choose each?
4. What endpoint types can be in an endpoint group, and what drives failover between Regions?
5. What do traffic dials and weights let you do?

---

## What's Next

Pair this with **Amazon CloudFront** (caching comparison), **Elastic Load Balancing** (endpoints), **AWS Shield** (DDoS), and **Amazon Route 53** (DNS routing).
