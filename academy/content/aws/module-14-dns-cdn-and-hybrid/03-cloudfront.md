---
title: "Amazon CloudFront: CDN and Edge Caching"
type: content
estimated_minutes: 12
cert_tags: ["SAA-C03", "SAP-C02", "CLF-C02"]
---

# Amazon CloudFront: CDN and Edge Caching

## Overview

Amazon CloudFront is AWS's global Content Delivery Network (CDN) with 400+ edge locations worldwide. CloudFront caches content at edge locations close to users, reducing latency and offloading origin servers. Beyond caching, CloudFront integrates with WAF, Shield, Lambda@Edge, and CloudFront Functions for edge compute.

## How CloudFront Works

You create a distribution with one or more origins (S3 bucket, ALB, EC2, API Gateway, or any HTTP server). You define cache behaviors — rules matching URL patterns that specify TTL, compression, query string forwarding, and other settings. When a user requests content, CloudFront serves from the nearest edge PoP if cached; otherwise it fetches from the origin, caches the response, and returns it. Cache keys determine what's cached separately — by default, just the URL path.

## Origins and Origin Groups

CloudFront supports S3 origins (static content, use Origin Access Control to keep the bucket private), custom HTTP origins (ALB, EC2, on-premises), and API Gateway. Origin Groups enable automatic failover: configure a primary and secondary origin; if the primary returns a 5xx or specified error code, CloudFront automatically retries against the secondary. Use Origin Groups for CloudFront-level HA failover without Route 53.

## Caching and Cache Invalidation

CloudFront caches based on the cache key: URL path, plus optionally headers, query strings, and cookies you include in the key. Longer TTLs improve cache hit ratio and reduce origin load. Cache invalidation removes objects from edge caches before TTL expires (charged per invalidation path). Use versioned file names (e.g., `app.v2.js`) instead of invalidation — faster propagation and no charge. CloudFront reports cache hit ratio in CloudFront metrics — optimize for high hit ratios.

## Lambda@Edge and CloudFront Functions

Lambda@Edge runs Node.js or Python Lambda functions at CloudFront edge locations in response to viewer or origin request/response events. Use for: A/B testing (modify request based on cookie), bot detection, authentication (JWT validation before forwarding to origin), content personalization, URL rewrites. CloudFront Functions is a lighter, faster alternative for simple JavaScript transformations (URL normalization, header manipulation) with sub-millisecond execution at a fraction of the cost. Choose CF Functions for simple transformations; Lambda@Edge for complex logic needing full Lambda capabilities.

## HTTPS, OAC, and Security

CloudFront enforces HTTPS at the viewer side and can use HTTPS for origin connections. ACM certificates (us-east-1 only) attach to distributions for custom domain TLS. Origin Access Control (OAC) restricts S3 bucket access to CloudFront only — the bucket has no public access. WAF rules attach to CloudFront for application-layer protection. Field-level encryption encrypts specific form fields at the edge, ensuring sensitive data is encrypted before reaching the origin.

## Summary

CloudFront delivers content globally from 400+ edge locations with low latency. Origins can be S3 (with OAC), ALB, or custom HTTP. Cache behaviors control what's cached and for how long. Lambda@Edge and CloudFront Functions enable edge compute. WAF and Shield integrate at the CloudFront layer for perimeter security. CloudFront is the standard answer for global content delivery, TLS termination, and DDoS protection.

## Examples

A marketing agency hosts a global campaign microsite on S3. They create a CloudFront distribution with the S3 bucket as the origin, enable Origin Access Control so the bucket has no public access, and attach an ACM certificate for their custom domain. The site's images, CSS, and JavaScript are served from CloudFront edge locations near each visitor. During a viral campaign moment, CloudFront absorbs millions of requests while the S3 origin handles only cache misses — origin costs stay flat regardless of traffic spikes.

A SaaS platform deploys a React single-page application through CloudFront. Instead of cache-busting with invalidations (which cost money and take time to propagate), their build pipeline appends a content hash to every JavaScript and CSS filename: `main.a3f9b2.js`. The CloudFront TTL for these assets is set to one year. When they deploy a new version, the new hashed filenames are automatically treated as new cache objects and fetched fresh, while stale browsers still hitting the old filename get the cached old version safely. This versioning strategy eliminates invalidation costs and ensures instantaneous propagation.

A media company wants to A/B test a new homepage layout for 10% of their traffic without touching their origin servers. They deploy a Lambda@Edge function on the viewer request event that reads a `test-cohort` cookie: users without the cookie are randomly assigned to group A or B, the cookie is set, and the request is routed to different origin paths accordingly. This logic runs in under 5 milliseconds at the edge without a single request reaching the origin for routing decisions — demonstrating the power of edge compute for traffic shaping that would otherwise require origin-side logic or separate load balancer rules.

## Think About It

1. Why is a high cache hit ratio desirable, and what are two specific things you could change about your cache behavior configuration to improve it?
2. What would happen if you used a CNAME for your CloudFront distribution's alternate domain name but forgot to attach an ACM certificate from the us-east-1 region?
3. How would you decide whether to use CloudFront Functions or Lambda@Edge for a new edge transformation — what questions would you ask to guide that decision?
4. An Origin Group has a primary S3 bucket in us-east-1 and a secondary in eu-west-1. Under what exact condition does CloudFront fail over to the secondary, and what are the latency implications for users during failover?
5. What trade-offs arise from setting a very long TTL (e.g., one year) on a frequently updated API response versus a static binary asset — and how does the nature of the content change your caching strategy?

## Quick Check

**Q1.** You want to serve an S3-hosted website through CloudFront while keeping the S3 bucket completely private (no public bucket policy). Which CloudFront feature enables this?
- A) Signed URLs
- B) Origin Access Control (OAC)
- C) Field-level encryption
- D) Lambda@Edge on the origin response

**Answer: B** — Origin Access Control restricts bucket access to the CloudFront distribution's service principal, allowing you to block all public S3 access while CloudFront continues to fetch and serve content.

**Q2.** Your ACM certificate for a CloudFront custom domain must be created in which AWS region?
- A) The region where your origin (e.g., ALB) is deployed
- B) us-west-2
- C) Any region — CloudFront auto-replicates certificates
- D) us-east-1

**Answer: D** — CloudFront is a global service that only integrates with ACM certificates provisioned in us-east-1, regardless of where your origin or users are located.

**Q3.** Which approach is recommended over cache invalidation for updating static assets served through CloudFront?
- A) Set TTL to 0 for all assets
- B) Use versioned or hashed filenames for each deployment
- C) Attach a Lambda@Edge function to clear cache on every request
- D) Disable caching and always pass requests to the origin

**Answer: B** — Versioned filenames (e.g., `app.v2.js`) cause CloudFront to treat updated files as new cache objects, avoiding invalidation charges and providing instant global propagation without waiting for edge cache purges.

## What's Next

Next up: Global Accelerator — network-layer acceleration for TCP/UDP applications.