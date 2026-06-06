---
title: "Route 53 Routing Policies"
type: content
estimated_minutes: 14
cert_tags: ["SAA-C03", "SAP-C02"]
---

# Route 53 Routing Policies

## Overview

Route 53's routing policies determine which DNS record value — or values — are returned when a client queries a hostname. The simplest policy returns a single IP address every time. The most sophisticated ones consider the user's geographic location, the measured latency to different AWS regions, the health of backend endpoints, and weighted traffic distributions — all happening invisibly at the DNS layer before the user's browser has opened a single TCP connection.

Routing policies exist because DNS is the cheapest place to implement global traffic management. Routing a user to their nearest healthy region at the DNS layer costs nothing beyond the DNS query itself. Doing the same thing at the application layer requires running load balancers in every region, network round-trips, and additional infrastructure. Route 53 routing policies encode business decisions — "serve EU users from EU infrastructure," "send 10% of traffic to the new version," "fail over to the backup region automatically" — directly into DNS without any application code changes.

For the SAA exam, you need to know all eight routing policy types, when to use each, and the critical details that distinguish them (health check requirements, Traffic Flow requirements, multi-value vs. round-robin behavior). SAP goes deeper into combining policies, Traffic Flow, and geoproximity bias configuration.

---

## Core Concepts

### Simple Routing

Simple routing returns one or more values for a record with no health check integration and no routing logic. If you specify multiple values in a Simple record, Route 53 returns all of them in a random order, and the DNS resolver or client chooses one — this is effectively random round-robin.

**When to use**: single-endpoint domains, or basic round-robin across a small, static set of IPs where all endpoints are always available. Not appropriate for production multi-region or failover scenarios because Route 53 cannot detect or route around failures.

**Key limitation**: Simple routing does not support health checks on the record itself.

---

### Weighted Routing

Weighted routing assigns a numeric weight to each record for the same hostname. Route 53 distributes queries proportionally: a record with weight 70 in a set where the total weight is 100 receives approximately 70% of queries. The weights don't need to add up to 100 — Route 53 calculates proportions from the actual values.

**Weight of 0**: a record with weight 0 receives zero traffic but is not deleted. This lets you stop traffic to an endpoint instantly (set to 0) and resume it instantly (restore the weight) without recreating DNS records — essential for blue/green deployments.

**When to use**: blue/green deployments (gradually shift traffic from old to new version), A/B testing, distributing load across endpoints with different capacities.

**Health check integration**: attach health checks to weighted records so that if an endpoint fails, its weight is effectively removed from the distribution and its share is proportionally redistributed to the remaining healthy records.

---

### Latency-Based Routing

Latency routing returns the record associated with the AWS region that has the lowest measured round-trip latency from the user's DNS resolver. Route 53 maintains a continuously updated latency database by measuring RTT from its resolver network to each AWS region.

**Critical nuance**: the routing decision is based on the latency from the user's **DNS resolver**, not the user's actual IP address. For most users, the resolver is nearby — their ISP's resolver, or a public resolver like 8.8.8.8 (Google DNS, anycast to a nearby node). But users with misconfigured or remote resolvers (pointing their device to a resolver in another country) will get routing decisions based on that resolver's location, not their own. This is a known limitation of DNS-based latency routing.

**When to use**: globally distributed applications where users should be served from their nearest active region. The canonical use case: a multi-region API where each region runs identical services and you want each user automatically routed to the lowest-latency option.

**Combine with health checks**: latency routing plus health checks means Route 53 routes to the nearest *healthy* region — if the nearest region fails its health check, users are redirected to the next-nearest healthy option automatically.

---

### Failover Routing

Failover routing designates one record as **Primary** and one as **Secondary** for the same hostname. Route 53 routes all traffic to the Primary as long as its health check is passing. When the Primary's health check fails, Route 53 automatically routes all traffic to the Secondary.

**Requires a health check on the Primary**. Without a health check on the primary record, Route 53 has no signal to trigger the failover — it will always return the primary record regardless of its actual health.

**When to use**: active-passive disaster recovery. Primary is the production deployment; Secondary is the DR deployment (could be a static S3 website for a maintenance page, a lighter-capacity deployment, or a full replica in another region).

**Recovery**: when the Primary's health check recovers (passes the configured number of consecutive success checks), Route 53 automatically routes traffic back to the Primary.

---

### Geolocation Routing

Geolocation routing returns different record values based on where the user's DNS query originates — by continent, country, or US state. Route 53 identifies the user's location from the source IP of their DNS resolver query.

**The required default record**: if a user queries from a location that has no matching geolocation rule, and there is no default record, Route 53 returns NXDOMAIN (no answer). This silently breaks access for users in unmatched countries. **Always create a default geolocation record** to catch any location not covered by specific rules.

**When to use**: regulatory data sovereignty (EU users must hit EU infrastructure), language/content localization, compliance requirements that differ by jurisdiction.

**Geolocation vs. Latency**: Geolocation is about *where* the user is (compliance, content). Latency is about *how fast* the connection is. A user in Germany might have lower latency to us-east-1 (unlikely but possible on a bad day) — latency routing would send them there; geolocation routing would send them to eu-west-1 regardless of latency.

---

### Geoproximity Routing

Geoproximity routing routes traffic based on the geographic distance between users and your resources, with an adjustable **bias** that can shift the effective boundary between regions. A positive bias expands the geographic area routed to a resource; a negative bias shrinks it.

**Requires Route 53 Traffic Flow** — geoproximity is only available through the Traffic Flow visual policy editor. You cannot create geoproximity records directly in the hosted zone record editor.

**When to use**: when you need geolocation-like routing but want to manually tune the boundaries — for example, shifting more US East traffic toward a Canada region to redistribute load, or gradually expanding the coverage area of a new region as capacity comes online.

---

### Multi-Value Answer Routing

Multi-Value routing returns up to 8 healthy records at random for a single hostname query. Unlike Simple routing (which can also return multiple values), Multi-Value integrates with health checks — unhealthy records are excluded from the returned set.

**Not a load balancer substitute**: DNS clients typically use the first answer returned and only try others if the first fails. Multi-Value doesn't guarantee even distribution. It's a basic client-side failover mechanism, not true load balancing.

**When to use**: simple resilience for small services where you want multiple endpoints but don't have an Application Load Balancer. Each endpoint gets its own health check, and clients get a list of healthy options.

---

### IP-Based Routing

IP-Based routing routes traffic based on the user's IP address by matching against CIDR ranges you define. This is useful when you know exactly which IP ranges correspond to which user populations (e.g., your corporate network, a specific ISP, a known geographic area).

**When to use**: routing users on your corporate network to an internal endpoint, directing traffic from a specific ISP to a closer or better-connected region, implementing custom geographic routing when the built-in geolocation data isn't granular enough.

---

## Configuration Reference

### Creating Routing Policy Records via the Console

Navigate to **Route 53 → Hosted zones → [your zone] → Create record**:

- **Simple**: select Simple routing, enter value(s). Multiple values create round-robin.
- **Weighted**: select Weighted routing → enter the record value → set Weight (0–255) → optionally attach a Health check ID → give the record a Routing policy ID (a string identifying this record within the set, e.g., "us-east-1-blue")
- **Latency**: select Latency routing → enter the record value → select Region → attach health check
- **Failover**: select Failover routing → set Failover record type to Primary or Secondary → attach health check to Primary

---

### Routing Policy CLI Examples

```bash
# Weighted routing — Blue/Green deployment setup
# Blue (current version) at weight 90
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890ABC \
  --change-batch '{
    "Changes": [{
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "api.example.com",
        "Type": "A",
        "SetIdentifier": "blue-us-east-1",        
        "Weight": 90,                              
        "TTL": 60,
        "ResourceRecords": [{"Value": "203.0.113.10"}],
        "HealthCheckId": "abc-123-health-check"    
      }
    }]
  }'

# Green (new version) at weight 10 — gradually increase
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890ABC \
  --change-batch '{
    "Changes": [{
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "api.example.com",
        "Type": "A",
        "SetIdentifier": "green-us-east-1",
        "Weight": 10,
        "TTL": 60,
        "ResourceRecords": [{"Value": "203.0.113.11"}],
        "HealthCheckId": "def-456-health-check"
      }
    }]
  }'

# Latency-based routing — us-east-1 endpoint
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890ABC \
  --change-batch '{
    "Changes": [{
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "app.example.com",
        "Type": "A",
        "SetIdentifier": "us-east-1",
        "Region": "us-east-1",                    
        "AliasTarget": {
          "HostedZoneId": "Z35SXDOTRQ7X7K",
          "DNSName": "my-alb-east.us-east-1.elb.amazonaws.com",
          "EvaluateTargetHealth": true
        }
      }
    }]
  }'

# Failover routing — Primary record with health check
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890ABC \
  --change-batch '{
    "Changes": [{
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "app.example.com",
        "Type": "A",
        "SetIdentifier": "primary",
        "Failover": "PRIMARY",                    
        "TTL": 60,
        "ResourceRecords": [{"Value": "203.0.113.10"}],
        "HealthCheckId": "primary-health-check-id"
      }
    }]
  }'

# Failover routing — Secondary record (no health check required)
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890ABC \
  --change-batch '{
    "Changes": [{
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "app.example.com",
        "Type": "A",
        "SetIdentifier": "secondary",
        "Failover": "SECONDARY",
        "TTL": 60,
        "ResourceRecords": [{"Value": "203.0.113.20"}]
      }
    }]
  }'

# Geolocation routing — EU users to eu-west-1, default for everyone else
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890ABC \
  --change-batch '{
    "Changes": [
      {
        "Action": "UPSERT",
        "ResourceRecordSet": {
          "Name": "app.example.com",
          "Type": "A",
          "SetIdentifier": "europe",
          "GeoLocation": {"ContinentCode": "EU"},  
          "TTL": 300,
          "ResourceRecords": [{"Value": "203.0.113.30"}]
        }
      },
      {
        "Action": "UPSERT",
        "ResourceRecordSet": {
          "Name": "app.example.com",
          "Type": "A",
          "SetIdentifier": "default",
          "GeoLocation": {"CountryCode": "*"},     
          "TTL": 300,
          "ResourceRecords": [{"Value": "203.0.113.10"}]
        }
      }
    ]
  }'
```

---

## How to Decide

| Goal | Policy | Key requirement |
|---|---|---|
| Single endpoint, no logic needed | Simple | None |
| Gradual rollout / blue-green | Weighted | Health checks recommended |
| Route to nearest healthy region | Latency | Health checks required for automatic failover |
| Active-passive DR | Failover | Health check on Primary is mandatory |
| Data sovereignty by country/continent | Geolocation | Default record is mandatory |
| Tune geographic boundaries with bias | Geoproximity | Route 53 Traffic Flow required |
| Return multiple healthy IPs to clients | Multi-Value | Health check per record |
| Route by known IP ranges | IP-Based | CIDR blocks defined upfront |

**Health check requirement summary:**
- **Always required**: Failover (Primary record) — without it, failover never triggers
- **Strongly recommended**: Latency, Weighted, Multi-Value — enables automatic exclusion of unhealthy endpoints
- **Not applicable**: Simple routing does not support health checks per record

---

## How This Connects

- **CloudWatch Alarms** — Route 53 health checks can monitor CloudWatch alarms, enabling health-check-based routing for resources that aren't publicly reachable (internal databases, private EC2 instances).
- **Application Load Balancers** — latency and failover routing most commonly point at ALBs via Alias records with `EvaluateTargetHealth: true`, which causes Route 53 to consider the ALB's own target health when evaluating the record.
- **Route 53 Traffic Flow** — a visual policy editor for creating complex multi-policy routing trees. Required for geoproximity routing and useful for combining multiple policy types (e.g., latency + failover).
- **Amazon CloudFront** — for global applications, the standard architecture is CloudFront in front of regional ALBs, with Route 53 latency routing pointing different regions at their respective CloudFront origins. Route 53 handles the region selection; CloudFront handles the CDN caching.
- **AWS Global Accelerator** — an alternative to latency-based DNS routing that uses Anycast to route users over the AWS backbone rather than the public internet. GA provides faster failover than DNS (seconds vs. DNS TTL-dependent) and two static IP addresses, which DNS routing cannot provide.

---

## Exam Traps

- **Failover routing without a health check on the primary never fails over.** This is the most common failover routing mistake. Without an attached health check, Route 53 always returns the Primary record regardless of its actual health. The health check is not optional for failover to work.
- **Geolocation routing requires a default record.** Without a default, users from countries that don't match any rule receive NXDOMAIN. This is a silent, geography-specific outage. Always add a catch-all geolocation record with `CountryCode: *`.
- **Latency routing uses the resolver's location, not the user's.** Users pointing their devices at resolvers in other countries get routing decisions based on the resolver's location. Large public resolvers (Google 8.8.8.8, Cloudflare 1.1.1.1) use anycast, so this is usually fine — but it's a known nuance the exam tests.
- **Weighted routing with weight 0 does not delete the record.** Setting weight to 0 stops traffic to that endpoint while keeping the record. Exam questions sometimes ask how to "stop traffic to an endpoint without deleting the record" — weight 0 is the answer.
- **Geoproximity requires Traffic Flow.** You cannot create geoproximity records in the standard Route 53 record editor. Traffic Flow is a visual policy editor — and it costs more. Geolocation routing is available in the standard editor; geoproximity is not.

---

## Summary

- Route 53 offers eight routing policies: Simple, Weighted, Latency, Failover, Geolocation, Geoproximity, Multi-Value, and IP-Based — each designed for a different traffic management use case.
- Failover routing requires a health check on the Primary record; without it Route 53 never triggers the failover regardless of the primary's actual health.
- Geolocation routing requires a default record (`CountryCode: *`); without it users from unmatched countries receive NXDOMAIN.
- Latency routing routes based on the round-trip latency from the user's DNS resolver to AWS regions — not the user's physical location.
- Weighted routing with a weight of 0 stops traffic to a record without deleting it, enabling instant rollback in blue/green deployments.
- Geoproximity routing (with coordinate-based bias) requires Route 53 Traffic Flow and is not available in the standard record editor.

---

## Examples

A video streaming startup launches with a single us-east-1 deployment using simple routing. Six months later, they add eu-west-1 and ap-southeast-1 regions and switch to latency-based routing with health checks on all three endpoints. Users in California now consistently resolve to us-east-1; users in Frankfurt resolve to eu-west-1; users in Singapore resolve to ap-southeast-1. When us-east-1 suffers an AZ failure and its health check trips, Route 53 automatically stops returning the us-east-1 record and redirects North American traffic to whichever remaining region has the next-lowest latency — typically eu-west-1. The entire failover happens within one health check cycle plus the DNS TTL.

A fintech company runs a blue/green deployment for their payments API. They create weighted records: blue (production) at weight 90, green (new version) at weight 10, both with health checks. They watch error rates in CloudWatch for 20 minutes. Seeing no regression, they update the weights to 50/50, then 90/10 in favor of green. At each step, if something goes wrong they set green's weight to 0 — not delete the record — so they can instantly resume traffic to green by changing the weight back. After 48 hours of stable operation, they set blue to weight 0 (keeping the record for future use) and green becomes the de-facto 100% production endpoint.

A multinational retailer faces a GDPR requirement: EU user data must be processed on servers physically located in the EU. They implement geolocation routing with continent-based rules: queries from EU → eu-west-1, queries from AS → ap-northeast-1, default (`*`) → us-east-1. They also add country-level overrides: queries from Switzerland → eu-central-1 (in the EU, with Swiss data laws also satisfied). The crucial lesson from their first implementation attempt: they forgot to add the default record. Users in Africa and South America received NXDOMAIN for two hours before the team discovered the geographic coverage gap. The default record is not optional.

---

## Think About It

1. Latency-based routing routes users to the region with the lowest measured latency from their DNS resolver — not their actual IP address. In what real-world scenarios could these two diverge significantly, and how would that affect user experience?
2. Failover routing automatically switches traffic from Primary to Secondary when the primary health check fails. What are the conditions for automatic recovery back to Primary, and what architectural risks exist if the secondary endpoint becomes the default for an extended period?
3. Weighted routing can be used to implement blue/green deployments by gradually shifting traffic from weight 90/10 to 0/100. What specific metrics and signals would you monitor at each step to decide when it's safe to proceed to the next weight ratio?
4. Geolocation and latency routing both influence which regional endpoint a user hits, but for different reasons. Describe a scenario where they would route the same user to different regions, and explain which policy's routing decision would be "more correct" depending on the use case.
5. Multi-Value routing returns up to 8 healthy records at random but is "not a load balancer substitute." In what specific ways does it fall short of what an Application Load Balancer provides, and what is the appropriate use case where Multi-Value routing genuinely solves a problem that an ALB does not?

---

## Quick Check

**Q1.** A Route 53 Failover routing configuration has a Primary record pointing to us-east-1 and a Secondary pointing to eu-west-1, but traffic never fails over to eu-west-1 even when us-east-1 is fully down. What is the most likely cause?
- A) The Secondary record's TTL is too high
- B) No health check is attached to the Primary record
- C) Failover routing only works with Alias records, not A records
- D) The us-east-1 and eu-west-1 records must be in separate hosted zones

**Answer: B** — Without a health check attached to the Primary record, Route 53 has no signal to trigger the failover. It will always return the Primary record regardless of its health. A health check on the Primary is mandatory for failover routing to function.

**Q2.** A company uses Route 53 Geolocation routing to send EU users to eu-west-1 and all other users to us-east-1. Users in Kenya report they cannot resolve the domain at all. What is the most likely cause?
- A) Route 53 does not support African IP addresses
- B) The Geolocation records are using Latency routing instead
- C) There is no default Geolocation record to handle users not matched by any specific rule
- D) TTL values on the Geolocation records are too short

**Answer: C** — Geolocation routing returns NXDOMAIN for users whose location doesn't match any defined rule if no default record exists. A default record with `CountryCode: *` is required to handle all unmatched locations.

**Q3.** Which Route 53 routing policy requires the Route 53 Traffic Flow visual policy editor and cannot be configured directly in the standard hosted zone record editor?
- A) Geolocation
- B) Latency-based
- C) Geoproximity
- D) Multi-Value Answer

**Answer: C** — Geoproximity routing, which routes based on geographic coordinates with an adjustable bias to shift traffic boundaries, is only available through Route 53 Traffic Flow. All other routing policies are available in the standard record editor.

---

## What's Next

Next: Amazon CloudFront — AWS's global content delivery network that caches content at edge locations worldwide, reducing latency and protecting origins from direct traffic.
