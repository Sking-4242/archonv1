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

## What's Next

Next: Local Zones and Wavelength Zones — specialized infrastructure that extends AWS to specific metro areas and 5G networks for ultra-low-latency use cases.
