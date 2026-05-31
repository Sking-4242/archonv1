---
title: "Edge Locations and CloudFront POPs"
type: content
estimated_minutes: 6
cert_tags: ["aws_ccp", "aws_saa"]
---

# Edge Locations and CloudFront POPs

## Overview

While Regions and AZs host your compute and storage workloads, Edge Locations are AWS's global content delivery network (CDN) infrastructure. There are over 450 edge locations (Points of Presence) worldwide — far more than the number of Regions — spread across major cities on every inhabited continent.

Edge Locations are primarily used by Amazon CloudFront (CDN) and Amazon Route 53 (DNS). They bring content and DNS resolution physically close to end users, reducing latency from hundreds of milliseconds to single digits for commonly accessed content.

## How CloudFront Uses Edge Locations

When a user requests a CloudFront-served asset (image, video, HTML, API response), CloudFront routes the request to the nearest Edge Location. If the content is cached there, it's served directly from the Edge Location — no trip to your origin server required. If not cached, the Edge Location fetches it from the origin, caches it, and serves it to the user.

This caching layer reduces latency dramatically (requests stay in the user's metro area rather than crossing oceans), reduces load on your origin (a popular asset might be served millions of times from cache without hitting origin), and reduces data transfer costs (CloudFront has lower pricing for data transfer out than most AWS services).

## Regional Edge Caches

Between Edge Locations and your origin, CloudFront maintains 13 Regional Edge Caches — larger caches that sit in between. If an Edge Location doesn't have a cached object, it checks the Regional Edge Cache before going all the way to the origin. This reduces origin load further, since less popular content that has been evicted from Edge Location caches may still be available in Regional Edge Caches.

Understanding this hierarchy — User → Edge Location → Regional Edge Cache → Origin — helps you configure CloudFront TTLs and caching behaviors optimally.

## Other Services That Use Edge Locations

Beyond CloudFront, several AWS services leverage the global Edge network: **Route 53** answers DNS queries from the nearest Edge Location, providing global anycast DNS with ultra-low latency. **AWS Shield** inspects traffic at Edge Locations to detect and mitigate DDoS attacks before malicious traffic reaches your origin. **Lambda@Edge** runs your Lambda functions at CloudFront Edge Locations, enabling request/response modification without a round-trip to an AWS Region. **AWS WAF** (Web Application Firewall) can be attached to CloudFront distributions, inspecting traffic at the Edge Location.

## Summary

Edge Locations are CDN infrastructure (450+ worldwide) distinct from AWS Regions and AZs. They cache content for CloudFront, resolve DNS for Route 53, and provide the point of attack mitigation for Shield and WAF. The hierarchy is: User → Edge Location → Regional Edge Cache → Origin. Edge Locations dramatically reduce latency and origin load for globally distributed applications.

## Examples

A media company streams video tutorials to learners across 60 countries. Without CloudFront, every request would travel from the learner's browser all the way to the origin S3 bucket in us-east-1 — adding 150–300ms of latency for users in Asia or Africa, and causing rebuffering on slower connections. By placing their video assets behind a CloudFront distribution, requests are served from the nearest Edge Location. A learner in Mumbai gets content from the Mumbai Edge Location, not Virginia, cutting latency to under 20ms. This is the most direct and beginner-accessible illustration of what Edge Locations actually do.

An e-commerce platform runs a Route 53 hosted zone for its storefront. During Black Friday traffic spikes, DNS resolution speed matters — slow DNS means a delayed first connection before any page content even loads. Because Route 53 uses the global anycast Edge Location network, DNS queries are answered from whichever Edge Location is nearest to the user, rather than from a central DNS server. The result is single-digit millisecond DNS resolution globally, even under heavy load.

A security-focused SaaS company uses CloudFront with AWS WAF and Shield Standard attached. When they were targeted by a volumetric DDoS attack, malicious traffic hit the Edge Locations first — which have massive aggregate bandwidth capacity far exceeding any single origin server. Shield absorbed and mitigated the bulk of the attack at the edge before traffic ever reached their application servers in the Region. This example illustrates that Edge Locations are not just a performance tool — they are also a security perimeter.

## Think About It

1. CloudFront caches content at Edge Locations to reduce origin load. But what happens when content changes frequently — like a live sports scoreboard or personalized user data? How does that change how you'd configure (or whether you'd even use) CloudFront caching?
2. There are 450+ Edge Locations but only 33 Regions. Why does AWS maintain so many more Edge Locations than Regions? What would be lost if Edge Locations were consolidated into Regions?
3. Lambda@Edge lets you run code at CloudFront Edge Locations. What are the trade-offs of running business logic at the edge versus in a central Region? When would edge execution make things worse?
4. If a Regional Edge Cache already reduces origin load, why do Edge Locations still exist as a separate layer? What does adding the Edge Location layer accomplish that the Regional Edge Cache alone cannot?
5. A startup says they don't need CloudFront because their users are "mostly in the US" and their servers are in us-east-1. Under what conditions would this reasoning hold, and when would it break down?

## Quick Check

**Q1.** Approximately how many CloudFront Edge Locations (Points of Presence) does AWS operate globally?
- A) 33
- B) 100
- C) 450+
- D) 13

**Answer: C** — AWS operates over 450 Edge Locations worldwide; 33 is the number of Regions, and 13 is the number of Regional Edge Caches.

**Q2.** What is the correct order of the CloudFront request hierarchy when a user requests an uncached object?
- A) User → Origin → Regional Edge Cache → Edge Location
- B) User → Edge Location → Regional Edge Cache → Origin
- C) User → Regional Edge Cache → Edge Location → Origin
- D) User → Origin → Edge Location → Regional Edge Cache

**Answer: B** — Requests flow from the user to the nearest Edge Location first; if not cached there, to the Regional Edge Cache; and only then to the origin if still not cached.

**Q3.** Which AWS service uses Edge Locations to answer DNS queries from the location nearest to the end user?
- A) Amazon VPC
- B) AWS Direct Connect
- C) Amazon Route 53
- D) AWS CloudTrail

**Answer: C** — Route 53 uses the global anycast Edge Location network to resolve DNS queries from whichever Edge Location is geographically closest to the requesting user.

## What's Next

Next: Local Zones and Wavelength Zones — specialized infrastructure that extends AWS to specific metro areas and 5G networks for ultra-low-latency use cases.
