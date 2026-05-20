---
title: "Route 53 Routing Policies"
type: content
estimated_minutes: 10
cert_tags: ["SAA-C03", "SAP-C02"]
---

# Route 53 Routing Policies

## Overview

Route 53's routing policies determine which record value(s) are returned for a DNS query. Beyond simple 'return the IP' behavior, Route 53 can route based on latency, geography, health, and weighted distribution — enabling sophisticated global traffic management without additional infrastructure.

## Simple Routing

Returns a single value (or multiple values randomly for round-robin). No health check integration. Use for single-endpoint domains or when you want basic round-robin across a few IPs. Cannot route around failures.

## Weighted Routing

Associates a weight with each record. Traffic is distributed proportionally — a record with weight 70 receives 70% of traffic relative to the total. Use for gradual blue/green deployments (start new version at weight 10, gradually increase), A/B testing, or distributing load across endpoints in different regions with different capacities. Set a record's weight to 0 to stop sending traffic to it without deleting the record.

## Latency-Based Routing

Returns the record pointing to the AWS region with the lowest round-trip latency from the user's location. Latency is measured between the user's resolver and AWS regions — not the user's exact location. Best for globally distributed applications where users should be served by the nearest region. Combine with health checks to automatically exclude unhealthy regions.

## Failover Routing

Designates one record as Primary and one as Secondary. While the primary is healthy, all traffic goes there. If the primary's health check fails, Route 53 routes to the secondary. Used for active-passive DR: primary is your main region, secondary is your DR region. The secondary can be a static S3 website (for maintenance page), a lighter-capacity deployment, or a full replica.

## Geolocation and Geoproximity

Geolocation routes based on the user's geographic location (continent, country, or US state). Use for legal compliance (serve EU users from EU endpoints), language-specific content, or data sovereignty. Geoproximity is more nuanced — routes based on geographic coordinates with a configurable bias to shift traffic toward or away from a region. Geoproximity requires Route 53 Traffic Flow.

## Summary

Route 53 routing policies: Simple (single value), Weighted (proportional distribution), Latency (nearest region), Failover (active-passive DR), Geolocation (geography-based), Geoproximity (coordinate-based with bias). Always pair Latency and Failover policies with health checks. Weighted routing powers blue/green deployments; Latency powers global low-latency routing.

## What's Next

Next up: CloudFront — global content delivery network and edge caching.