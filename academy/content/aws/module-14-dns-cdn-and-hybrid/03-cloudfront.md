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

## What's Next

Next up: Global Accelerator — network-layer acceleration for TCP/UDP applications.