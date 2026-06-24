---
title: "Amazon CloudFront"
type: content
estimated_minutes: 20
cert_tags: ["CLF-C02", "SAA-C03", "SOA-C03", "SCS-C03"]
---

# Amazon CloudFront

## Overview

Amazon CloudFront is AWS's content delivery network (CDN) — a globally distributed network of edge locations that caches and serves content close to users, reducing latency and offloading origins. It accelerates websites, APIs, video, and software downloads, and doubles as a security and edge-compute layer. This *service reference* lesson covers the CloudFront model, caching and origins, security features (OAC, WAF, signed URLs), edge compute, and what each certification expects.

CloudFront matters because physical distance adds latency: a user in Asia fetching from a Region in North America waits for every round trip. By caching content at hundreds of edge locations worldwide and routing each request to the nearest one over the optimized AWS backbone, CloudFront makes delivery fast and consistent globally while reducing load and data-transfer cost on the origin. The core mental model is a **distribution** that sits between users and one or more **origins** (S3 buckets, load balancers, or any HTTP server), serving cached responses according to **cache behaviors** and applying security and transformation at the edge.

---

## How It Works

A **distribution** is configured with one or more **origins** and a set of **cache behaviors** that map URL path patterns (e.g., `/images/*`) to an origin and a caching/security policy. When a user makes a request, it is routed to the nearest **edge location**:

- On a **cache hit**, the edge serves the cached object immediately.
- On a **cache miss**, the edge fetches from the origin — often via a **regional edge cache** (a mid-tier cache that further reduces origin load) — caches the response per its policy, and returns it.

Caching behavior is governed by **cache policies** (which headers, cookies, and query strings form the **cache key**, plus min/max/default TTLs) and **origin request policies** (what is forwarded to the origin). Including fewer values in the cache key raises the **cache hit ratio**; dynamic or personalized content can bypass caching while still benefiting from the optimized edge network and TLS termination near the user. **Origin groups** enable automatic origin failover for high availability.

---

## Key Features

- **HTTPS/TLS** with ACM certificates; for a custom domain on CloudFront the certificate must be in the **us-east-1** Region. Supports modern TLS and can redirect HTTP→HTTPS.
- **Origin Access Control (OAC)** restricts an S3 (or other) origin so it is reachable only through CloudFront, keeping the bucket fully private (OAC supersedes the legacy OAI).
- **AWS WAF** and **AWS Shield** integrate at the edge for L7 filtering and DDoS absorption (the WAF web ACL for CloudFront is also **us-east-1**/global scope).
- **Edge compute** — **CloudFront Functions** (ultra-lightweight, high-scale JavaScript for header/URL rewrites and request manipulation) and **Lambda@Edge** (heavier Node/Python customization, origin manipulation, personalization).
- **Signed URLs and signed cookies** restrict access to private content; **field-level encryption** protects sensitive form fields.
- **Geo-restriction** allows/blocks by country; **invalidations** force-refresh cached objects before TTL expiry.

---

## Configuration Reference

- **Origins.** S3 (static content, locked down with **OAC**), ALB/EC2/custom HTTP (dynamic), or media-origin services; use **origin groups** for failover.
- **Cache behaviors** map path patterns to origins and to cache/origin-request policies; order them from most to least specific.
- **Certificates** for custom domains come from **ACM in us-east-1**; attach a **WAF web ACL** (us-east-1 scope) for protection.
- **Security**: enable OAC for S3 origins, configure signed URLs/cookies for private content, and set geo-restriction as needed.

---

## Operations and Troubleshooting

- **Stale content.** Objects persist until TTL; force updates with **invalidations** (a small number are free; many cost money) or, better, use **versioned object names** (e.g., `app.v2.js`) so new content has a new cache key.
- **403 from an S3 origin.** Usually an OAC/bucket-policy misconfiguration — the bucket policy must grant access to the CloudFront distribution and block all other access.
- **Low cache hit ratio.** Often caused by a cache key that includes too many headers/cookies/query strings, or `no-cache` directives; tighten the cache policy and forward only what's needed.
- **Monitoring.** CloudFront reports CloudWatch metrics (requests, bytes downloaded/uploaded, 4xx/5xx error rates, **cache hit ratio**) and can emit standard or **real-time logs** to S3/Kinesis for analysis.

---

## Integrations

CloudFront fronts **S3** (with OAC) and **Elastic Load Balancing/EC2** origins, secures traffic with **ACM**, **AWS WAF**, and **AWS Shield** (Standard automatic; Advanced for enhanced DDoS protection), runs **CloudFront Functions/Lambda@Edge** at the edge, is routed to by **Route 53** (alias records), and logs to **S3/Kinesis** with **CloudWatch** metrics. It is the standard edge tier for both performance (caching, global reach over the AWS backbone) and security (DDoS absorption, WAF, private-content controls, keeping origins private).

---

## Pricing and Cost Considerations

CloudFront charges for **data transfer out** to the internet (priced by the geographic region of the edge, tunable with **price classes** that limit which edge regions are used), **HTTP/HTTPS requests**, and optional features (invalidations beyond a free allowance, **Lambda@Edge/Functions** executions, real-time logs, field-level encryption). Importantly, **data transfer from AWS origins like S3 to CloudFront is free**, and serving from cache offloads origin egress — so CloudFront frequently *reduces* total delivery cost while improving performance. The main lever is raising the **cache hit ratio** (less origin traffic) and choosing an appropriate price class. Exact prices vary by edge region and over time.

---

## Exam Relevance

**CLF-C02:** Know CloudFront as a global CDN that caches content at edge locations to reduce latency, improving performance and potentially reducing data-transfer cost. Foundational.

**SAA-C03:** Know distributions, origins (S3 with OAC, ALB), cache behaviors and the cache-key/hit-ratio relationship, HTTPS with ACM in us-east-1, origin failover groups, signed URLs/cookies, and CloudFront as the edge accelerator/security tier. Design depth.

**SOA-C03:** Operate distributions — invalidations vs. versioned names, cache-hit-ratio tuning, logging, and monitoring. Operations depth.

**SCS-C03:** Secure the edge — OAC to keep S3 private, WAF and Shield (us-east-1 scope for CloudFront), signed URLs/cookies, field-level encryption, geo-restriction, and TLS. Security depth.

---

## Summary

Amazon CloudFront is a global CDN that caches content at edge locations to deliver it with low latency over the AWS backbone while offloading origins. A distribution maps cache behaviors to origins (S3 via OAC, ALB/custom HTTP, with origin groups for failover), serves cache hits at the edge and fetches misses via regional edge caches, and applies TLS (ACM in us-east-1), WAF, Shield, signed URLs/cookies, geo-restriction, and edge compute (CloudFront Functions/Lambda@Edge). It both accelerates delivery and hardens the perimeter, and because origin-to-CloudFront transfer is free and caching cuts origin egress, it frequently lowers total cost. The recurring exam points are OAC for private S3 origins, the us-east-1 requirement for CloudFront certificates and WAF, and cache-key tuning for hit ratio.

---

## Quick Check

1. How does a CDN reduce latency for globally distributed users, and what is a regional edge cache?
2. What is Origin Access Control (OAC) used for with an S3 origin, and what replaces forced invalidations as a cleaner update strategy?
3. In which Region must an ACM certificate and a WAF web ACL for a CloudFront distribution reside?
4. Why might a distribution have a low cache hit ratio, and how do you improve it?
5. How can CloudFront reduce overall data-transfer cost even though it charges for transfer out?

---

## What's Next

Pair this with **Amazon S3** (origin), **AWS WAF** and **AWS Shield** (edge security), **AWS KMS/ACM** (TLS), and **Amazon Route 53** (DNS). See the SCS-C03 edge-security lesson for the CloudFront + WAF + Shield pattern.
