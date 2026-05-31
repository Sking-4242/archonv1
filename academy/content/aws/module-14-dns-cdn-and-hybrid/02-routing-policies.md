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

## Examples

A video streaming startup launches with a single us-east-1 deployment and uses simple routing to point `stream.example.com` at their load balancer. Six months later, they add a us-west-2 region and switch to latency-based routing. Users in California now consistently resolve to the west coast endpoint, cutting their observed playback buffering in half — because Route 53 sends each user to the region with the lowest round-trip latency from their DNS resolver, not just the nearest geographic region.

A fintech company runs a blue/green deployment for their payments API. They set up weighted routing: their stable blue environment receives weight 90, and the newly deployed green environment receives weight 10. They monitor error rates for 30 minutes. Seeing no increase, they shift to 50/50, then 90/10 in favor of green, and finally 100/0. At each step, setting the old environment's weight to 0 (rather than deleting the record) means they can immediately roll back without recreating DNS records.

A multinational retailer faces a legal requirement: user data from EU residents must be processed on EU servers. They implement geolocation routing: users resolving from European countries are directed to `eu-west-1`, while all other traffic defaults to `us-east-1`. They also add a catch-all default record — without a default, users in countries with no explicit geolocation rule would receive a "no answer" response, breaking access entirely. The subtle but critical lesson: geolocation routing requires a default record to avoid silent failures for unmatched locations.

## Think About It

1. Why do latency-based routing decisions depend on the user's DNS resolver location rather than the user's actual IP address — and when might these two locations diverge significantly?
2. What would happen if you configured failover routing with a secondary endpoint but forgot to attach health checks to the primary record?
3. How would you decide between geolocation routing and geoproximity routing for a new product launching in three countries with unclear future expansion plans?
4. A weighted routing deployment has three records with weights 10, 20, and 0. What percentage of traffic does the record with weight 20 receive, and what does the zero-weight record receive?
5. What trade-offs would you consider when deciding how aggressively to lower the weight of an old deployment during a blue/green rollout — what signals tell you when it is safe to proceed?

## Quick Check

**Q1.** Your primary application region fails its health check. Which routing policy type is specifically designed to automatically redirect all traffic to a secondary endpoint in this scenario?
- A) Weighted routing
- B) Latency-based routing
- C) Failover routing
- D) Simple routing

**Answer: C** — Failover routing designates an explicit primary and secondary record and redirects traffic to the secondary only when the primary's health check fails.

**Q2.** You are conducting an A/B test and want 15% of traffic to reach the new version. You have two weighted records. What weights should you assign?
- A) Weight 15 on new, weight 85 on old
- B) Weight 1 on new, weight 9 on old
- C) Weight 0.15 on new, weight 0.85 on old
- D) Both weights must be percentages that add to 100

**Answer: A** — Route 53 distributes traffic proportionally based on the ratio of each weight to the total; weights 15 and 85 produce a 15%/85% split, as do 3 and 17, but A is the most direct representation.

**Q3.** Which routing policy requires Route 53 Traffic Flow to use, due to its need for coordinate-based bias configuration?
- A) Geolocation
- B) Latency-based
- C) Geoproximity
- D) Failover

**Answer: C** — Geoproximity routing, which routes based on geographic coordinates with an adjustable bias, is only available through Route 53 Traffic Flow.

## What's Next

Next up: CloudFront — global content delivery network and edge caching.