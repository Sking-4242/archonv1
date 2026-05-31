---
title: "AWS Global Accelerator"
type: content
estimated_minutes: 8
cert_tags: ["SAA-C03", "SAP-C02"]
---

# AWS Global Accelerator

## Overview

AWS Global Accelerator is a networking service that routes user traffic over the AWS global backbone network instead of the public internet, improving availability and performance for TCP and UDP applications. Unlike CloudFront (which caches content), Global Accelerator accelerates connections to application endpoints.

## How Global Accelerator Works

Global Accelerator provides two static Anycast IP addresses (or uses your own BYO-IP). Users connect to the nearest AWS edge location, and traffic immediately enters the AWS backbone network — traveling over AWS's high-bandwidth, low-latency fiber instead of the public internet. The traffic exits to your application endpoint (ALB, NLB, EC2, or Elastic IP) in the target region. This reduces the number of public internet hops and improves consistency.

## Global Accelerator vs. CloudFront

CloudFront caches content at the edge (CDN behavior) — best for static content and cacheable HTTP/HTTPS. Global Accelerator does not cache; it accelerates any TCP or UDP traffic — best for non-cacheable dynamic requests, gaming (UDP), IoT, and applications requiring static IPs. Both route through the AWS backbone, but CloudFront's value is the cache hit; Global Accelerator's value is consistent network path.

## Health Checks and Failover

Global Accelerator continuously monitors endpoint health and routes traffic away from unhealthy endpoints within 30 seconds. Traffic weights can be configured per endpoint group (region). This enables blue/green deployments and regional failover similar to Route 53 failover routing but at the network layer with Anycast IPs (no DNS TTL propagation delay).

## Static Anycast IPs

The two static IPs provided by Global Accelerator are Anycast — the same IPs are advertised from multiple edge locations, and routing directs users to the nearest one. This is valuable for clients that cache IP addresses, whitelisted firewall rules, or mobile apps where DNS changes propagate slowly. You can also bring your own IP addresses (BYOIP) to Global Accelerator.

## Summary

Global Accelerator routes traffic over the AWS backbone from the nearest edge location, reducing latency and improving consistency for TCP/UDP applications. Use CloudFront for cacheable HTTP content; use Global Accelerator for dynamic requests, gaming UDP traffic, and cases where static IPs are required. Health checks enable sub-minute failover without DNS propagation delays.

## Examples

A mobile banking app operates an API backend in us-east-1. The product team notices that users in Southeast Asia report noticeably higher API response times and occasional timeouts. They enable Global Accelerator in front of their Network Load Balancer. Traffic from users in Singapore now enters the AWS backbone at the Singapore edge location rather than traversing 15+ unpredictable public internet hops across the Pacific. The result is a 40% reduction in round-trip time for Asian users — with no change to the application code or backend infrastructure.

An online multiplayer game uses UDP for real-time player state synchronization. CloudFront is not an option because it only handles HTTP/HTTPS. The engineering team deploys Global Accelerator pointing to game servers running on EC2 with Elastic IPs in three regions. The static Anycast IPs are embedded in the game client binary — players connect to the same IP worldwide, and AWS routes each player to the nearest edge. When a regional game server goes unhealthy, Global Accelerator detects the failure within 30 seconds and shifts traffic to the next-closest region without requiring a client update or DNS change.

A financial services firm manages a firewall allowlist for all outbound connections from their trading partner's network. Their trading partner requires advance notice of any IP address change, making DNS-based routing impractical. By placing Global Accelerator in front of their trading API, the firm gives the partner two static Anycast IPs that never change — even when the firm migrates backends, changes regions, or scales endpoints. This BYOIP-compatible, stable-IP property of Global Accelerator solves an operational constraint that Route 53 latency routing with dynamic IPs simply cannot.

## Think About It

1. Why does Global Accelerator improve performance even for requests that travel to the same destination region as they would over the public internet — what specifically changes about the network path?
2. What would happen if you placed Global Accelerator in front of an S3 static website that has high cache-hit potential — would this be a good architectural decision compared to CloudFront?
3. How would you design a blue/green deployment using Global Accelerator's endpoint weights, and what advantage does this approach have over a Route 53 weighted routing strategy during the cutover?
4. A mobile application embeds the Global Accelerator Anycast IPs in its binary and distributes via app stores. Six months later, you need to add a third region. What steps are required, and what steps are NOT required — compared to if you had used Route 53 latency routing instead?
5. What trade-offs exist between using Global Accelerator for failover versus Route 53 failover routing — consider both the failure detection speed and the blast radius of misconfiguration?

## Quick Check

**Q1.** A company needs to route TCP traffic globally with static IP addresses and sub-minute regional failover. Which service is most appropriate?
- A) Amazon CloudFront
- B) Route 53 latency-based routing
- C) AWS Global Accelerator
- D) Elastic Load Balancing with cross-region replication

**Answer: C** — Global Accelerator provides static Anycast IPs, routes TCP/UDP traffic over the AWS backbone, and performs health-based failover within approximately 30 seconds without DNS TTL propagation delays.

**Q2.** What is the primary difference between AWS Global Accelerator and Amazon CloudFront?
- A) CloudFront uses Anycast IPs; Global Accelerator uses dynamic IPs
- B) CloudFront caches content at the edge; Global Accelerator accelerates connections without caching
- C) Global Accelerator only works with S3 origins; CloudFront works with any HTTP origin
- D) CloudFront operates at Layer 3; Global Accelerator operates at Layer 7

**Answer: B** — CloudFront's value is reducing origin load through edge caching of HTTP content; Global Accelerator's value is routing any TCP/UDP traffic over the AWS private backbone with no caching behavior.

**Q3.** A client application hard-codes your API's IP addresses in its configuration. Which Global Accelerator feature ensures those IPs remain stable even if you change backend regions or endpoints?
- A) Health checks with 30-second failover
- B) Static Anycast IP addresses
- C) Endpoint group weights
- D) HTTPS listener termination

**Answer: B** — Global Accelerator provides two static Anycast IPs that remain constant regardless of backend changes, making them safe to embed in clients or firewall allowlists.

## What's Next

Next up: AWS Outposts and hybrid connectivity — extending AWS services to on-premises.