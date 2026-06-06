---
title: "AWS Global Accelerator"
type: content
estimated_minutes: 10
cert_tags: ["SAA-C03", "SAP-C02"]
---

# AWS Global Accelerator

## Overview

AWS Global Accelerator is a networking service that routes user traffic over the AWS global private backbone network instead of the unpredictable public internet. When a user in Tokyo connects to your API in us-east-1 through the public internet, their packets traverse 15–20 network hops across ISPs and backbone providers, each introducing latency and the possibility of congestion or packet loss. With Global Accelerator, those packets enter the AWS network at the nearest edge location — in Tokyo — and travel the rest of the way over AWS's high-bandwidth, dedicated fiber. The public internet exposure is reduced to the last mile between the user and the nearest AWS edge.

Global Accelerator provides two static Anycast IPv4 addresses that serve as the single entry point for your application worldwide. These same two IPs are advertised from all Global Accelerator edge locations via BGP Anycast routing — users automatically connect to the nearest edge. This Anycast model is what makes the IPs truly static: they never change regardless of what's behind them (which regions, which load balancers, which EC2 instances). This stability matters for scenarios where IP addresses need to be embedded in client software, added to firewall allowlists, or shared with partners months in advance.

For the SAA exam, understand when to use Global Accelerator versus CloudFront (the most-tested distinction for this service), how health-based failover works without DNS TTL delays, and the static Anycast IP value proposition. For the SAP exam, add endpoint group weights for blue/green deployments and the BYOIP (Bring Your Own IP) feature.

---

## Core Concepts

### How Global Accelerator Works

When you create a Global Accelerator, AWS provisions two static Anycast IPs and a globally distributed network of edge locations that advertise those IPs. The architecture:

1. **User connects** to one of the two Anycast IPs — BGP routing directs them to the nearest Global Accelerator edge location (a Point of Presence, typically 50ms or less from any major city)
2. **Traffic enters the AWS backbone** at that edge location — from here, the packet travels over AWS's dedicated private fiber, not the public internet
3. **AWS routes to the endpoint** — the accelerator configuration directs traffic to one or more endpoint groups, each associated with an AWS Region
4. **Endpoint receives the traffic** — supported endpoints: Application Load Balancers, Network Load Balancers, EC2 instances, and Elastic IP addresses

The key improvement: the public internet segment is reduced from the full path (user → 15+ hops → your region) to just the last mile (user → nearest AWS PoP). Everything from the AWS PoP to your endpoint travels over the AWS private network, which AWS controls and optimizes for throughput and latency.

---

### Global Accelerator vs. CloudFront: The Critical Distinction

This comparison appears on nearly every AWS exam. The correct mental model:

**CloudFront** is a CDN — its primary value is **caching content at the edge**. When CloudFront serves a cached image or JavaScript file, the response never touches your origin. The performance benefit comes from serving content from 2ms away instead of 200ms away. CloudFront works at Layer 7 (HTTP/HTTPS) and can perform content-based logic (path routing, header inspection, Lambda@Edge).

**Global Accelerator** does **not cache anything**. Its value is **network path optimization** — routing traffic over the AWS backbone instead of the public internet. Every request still goes all the way to your origin. The improvement is in latency consistency and reduced jitter, not cache hits. Global Accelerator works at Layer 4 (TCP/UDP) and is protocol-agnostic — it works for HTTP APIs, gaming UDP traffic, VoIP, IoT, and any TCP/UDP application.

| Aspect | CloudFront | Global Accelerator |
|---|---|---|
| Caches content | Yes — core value | No |
| Protocol | HTTP/HTTPS only | Any TCP or UDP |
| Static IPs | No — DNS-based | Yes — 2 Anycast IPs |
| Failover speed | DNS TTL-dependent | ~30 seconds |
| Edge compute | Lambda@Edge, CF Functions | No |
| Best for | Static/cacheable HTTP content | Dynamic apps, gaming, static IPs |
| Layer | Layer 7 | Layer 4 |

**When to choose Global Accelerator over CloudFront:**
- Your application is not HTTP/HTTPS (UDP gaming, IoT, custom TCP protocols)
- You need static IPs (embedded in client code, firewall allowlists, partner contracts)
- Failover speed matters more than DNS TTL allows (GA failover: ~30 seconds; DNS failover: TTL-dependent)
- You want consistent, low-jitter performance for a dynamic API where caching provides no benefit

---

### Health Checks and Automatic Failover

Global Accelerator continuously performs health checks on each endpoint. When an endpoint fails, Global Accelerator detects the failure and reroutes traffic within approximately **30 seconds** — without any DNS change, without any TTL wait, and without any client reconfiguration.

This is a significant advantage over Route 53 failover routing. Route 53 failover requires: health check failure detection (1–3 minutes) + DNS TTL expiration for all resolvers to pick up the new record (potentially minutes to hours depending on your TTL). Global Accelerator's health check → reroute path operates at the network layer and is independent of DNS.

The 30-second failover window means: if your primary region's load balancer becomes unhealthy, users experience roughly 30 seconds of failed requests before Global Accelerator shifts traffic to the secondary region. With Route 53 failover and a 60-second TTL, the same scenario takes 2–5 minutes for most users.

---

### Endpoint Groups and Traffic Dials

Global Accelerator routes traffic to **endpoint groups** — each endpoint group is associated with a specific AWS Region and contains one or more endpoints (ALBs, NLBs, EC2 instances, or EIPs).

**Traffic dials** control what percentage of traffic goes to each endpoint group. Setting a traffic dial to 0% removes a region from rotation without deleting the configuration. Setting it to 100% sends all traffic there.

Traffic dials enable **blue/green deployments at the network layer**:
1. Start: primary region at 100%, new region at 0%
2. Test: shift new region to 10%, watch metrics
3. Promote: gradually increase to 50%, 90%, 100%
4. Rollback: set new region back to 0% instantly — no DNS changes, no TTL wait

This is faster and more reliable than Route 53 weighted routing for traffic shifts because changes take effect in seconds rather than waiting for DNS propagation.

---

### Static Anycast IPs: The Stability Advantage

The two Anycast IPs are the defining feature of Global Accelerator for many use cases. They are:

- **Permanent**: they don't change when you change backends, add regions, or modify endpoint configurations
- **Global**: the same two IPs route users to their nearest AWS edge — there's no per-region IP to manage
- **Embeddable**: safe to hardcode in mobile app binaries, IoT device firmware, firewall rules, or partner contracts
- **BYOIP-compatible**: you can bring your own IP ranges to Global Accelerator if you need to maintain specific IPs you already control

The contrast with DNS-based routing: Route 53 latency routing provides a stable hostname, but the underlying IP addresses change as backends change and as DNS resolvers rotate through responses. Any system that caches IP addresses (some CDNs, some corporate DNS resolvers, some IoT devices) may send traffic to a stale IP for hours after a backend change.

---

## Configuration Reference

### Creating a Global Accelerator via the Console

1. Navigate to **Global Accelerator** → **Create accelerator**
2. **Basic configuration**:
   - Name your accelerator
   - IP address type: IPv4 (or Dual-stack for IPv6)
   - Two static Anycast IPs are assigned automatically (or bring your own via BYOIP)
3. **Add listeners**: define the port and protocol (TCP/UDP) your application listens on
   - Example: TCP port 443 for HTTPS, UDP port 5000 for a game server
4. **Add endpoint groups**: one per AWS Region you want to include
   - Traffic dial: 100 for active regions, 0 for standby/canary
   - Health check settings: port, protocol, interval
5. **Add endpoints to each group**: select ALBs, NLBs, EC2 instances, or EIPs in that region
   - Per-endpoint weight: distribute within a region (e.g., 50/50 between two ALBs)
6. Click **Create accelerator** — takes 2–5 minutes to provision

---

### Global Accelerator CLI Operations

```bash
# Create a Global Accelerator
aws globalaccelerator create-accelerator \
  --name my-api-accelerator \
  --ip-address-type IPV4 \
  --enabled \
  --region us-west-2         # Global Accelerator API endpoint is in us-west-2

# The response includes two static Anycast IPs:
# "IpSets": [{"IpFamily": "IPv4", "IpAddresses": ["203.0.113.1", "203.0.113.2"]}]

# Create a TCP listener on port 443
aws globalaccelerator create-listener \
  --accelerator-arn arn:aws:globalaccelerator::123456789012:accelerator/abcd1234 \
  --port-ranges '[{"FromPort":443,"ToPort":443}]' \
  --protocol TCP \
  --region us-west-2

# Create an endpoint group for us-east-1 (primary — traffic dial 100)
aws globalaccelerator create-endpoint-group \
  --listener-arn arn:aws:globalaccelerator::123456789012:accelerator/abcd1234/listener/efgh5678 \
  --endpoint-group-region us-east-1 \
  --traffic-dial-percentage 100 \           # 100 = full traffic, 0 = no traffic
  --health-check-port 443 \
  --health-check-protocol HTTPS \
  --health-check-path /health \
  --threshold-count 3 \
  --endpoint-configurations '[{
    "EndpointId": "arn:aws:elasticloadbalancing:us-east-1:123456789012:loadbalancer/app/my-alb/1234",
    "Weight": 100,
    "ClientIPPreservationEnabled": true
  }]' \
  --region us-west-2

# Create a failover endpoint group for eu-west-1 (standby — traffic dial 0)
aws globalaccelerator create-endpoint-group \
  --listener-arn arn:aws:globalaccelerator::123456789012:accelerator/abcd1234/listener/efgh5678 \
  --endpoint-group-region eu-west-1 \
  --traffic-dial-percentage 0 \             # Standby — no traffic until promoted
  --health-check-port 443 \
  --health-check-protocol HTTPS \
  --health-check-path /health \
  --region us-west-2

# Promote the standby region (blue/green cutover)
aws globalaccelerator update-endpoint-group \
  --endpoint-group-arn arn:aws:globalaccelerator::123456789012:accelerator/abcd1234/listener/efgh5678/endpoint-group/us-east-1 \
  --traffic-dial-percentage 0 \             # Remove primary from rotation
  --region us-west-2

aws globalaccelerator update-endpoint-group \
  --endpoint-group-arn arn:aws:globalaccelerator::123456789012:accelerator/abcd1234/listener/efgh5678/endpoint-group/eu-west-1 \
  --traffic-dial-percentage 100 \           # Promote standby to active
  --region us-west-2

# List accelerators and their static IPs
aws globalaccelerator list-accelerators \
  --query 'Accelerators[*].{Name:Name,IPs:IpSets[0].IpAddresses,Status:Status}' \
  --output table \
  --region us-west-2
```

> **Note**: The Global Accelerator API endpoint is `globalaccelerator.us-west-2.amazonaws.com` — all Global Accelerator CLI commands must specify `--region us-west-2` regardless of where your endpoints are.

---

## How to Decide

| Scenario | Use Global Accelerator | Use CloudFront |
|---|---|---|
| Static IPs required (partner allowlist, embedded in app) | ✅ | ❌ |
| UDP gaming traffic | ✅ | ❌ |
| HTTP API, mostly dynamic responses | ✅ (if static IP or sub-minute failover needed) | ✅ (if caching helps) |
| Static website or media delivery | ❌ | ✅ |
| Sub-minute failover without DNS TTL dependency | ✅ | ❌ |
| Content caching at edge | ❌ | ✅ |
| Custom domain with HTTPS certificate | Both work (CloudFront simpler) | ✅ |

**When neither is clearly dominant**: For HTTPS APIs where you need both static IPs and HTTP-layer features (WAF, path routing), use Global Accelerator in front of an ALB — GA handles the static IP and backbone routing; ALB handles the HTTP-layer logic.

---

## How This Connects

- **Application Load Balancers** — the most common Global Accelerator endpoint. GA routes traffic to the ALB using the AWS backbone; the ALB handles HTTP routing, health checks, and target distribution within the region.
- **Network Load Balancers** — used as GA endpoints for non-HTTP TCP/UDP workloads (gaming, IoT, database proxies). NLB preserves source IP and handles millions of requests per second.
- **Route 53** — both Route 53 latency routing and Global Accelerator solve the "route users to the nearest region" problem. GA does it at the network layer with static IPs and faster failover; Route 53 does it at the DNS layer with zero additional cost for the routing logic.
- **CloudFront** — these services complement rather than compete. A common architecture: CloudFront in front of GA's Anycast IPs for applications that need both caching and static IPs — though this is uncommon and complex.
- **AWS Shield Advanced** — Global Accelerator integrates with Shield Advanced for enhanced DDoS protection at the network layer, benefiting from mitigation at AWS edge locations rather than at the origin.

---

## Exam Traps

- **Global Accelerator does not cache — it accelerates.** CloudFront caches at the edge; Global Accelerator routes over the AWS backbone without caching. If an exam question mentions "reduce origin load" or "serve from cache," the answer is CloudFront, not GA.
- **The GA API is in us-west-2 regardless of your regions.** CLI commands for Global Accelerator always use `--region us-west-2`. This trips up people who specify their workload region.
- **GA failover is ~30 seconds, not instant.** Health check polling intervals plus the detection threshold mean there's always a short failure window. It's much faster than DNS TTL-based failover but not zero.
- **Traffic dials control regional distribution, not endpoint weighting.** Traffic dials are the percentage of overall traffic sent to each endpoint group (region). Per-endpoint weights within a group distribute traffic among endpoints in that region. These are separate concepts.
- **Two static IPs, not one per region.** Global Accelerator provides exactly two static Anycast IPs for the entire accelerator, not separate IPs per region. Both IPs route to all regions — they're Anycast addresses that route to the nearest edge regardless of which IP the client uses.

---

## Summary

- Global Accelerator provides two static Anycast IPs that route user traffic over the AWS private backbone from the nearest edge location, reducing latency and jitter for TCP/UDP applications.
- It does not cache content — its value is network path optimization, not cache hits. CloudFront is for caching; GA is for routing optimization.
- Health-based failover occurs in approximately 30 seconds without DNS TTL delays, making GA faster than Route 53 failover routing for time-sensitive DR scenarios.
- Traffic dials on endpoint groups enable blue/green deployments at the network layer — changes take effect in seconds, not DNS propagation minutes.
- The static Anycast IPs never change regardless of backend modifications, making them safe to embed in client binaries, mobile apps, or firewall allowlists.
- The Global Accelerator API endpoint is always in us-west-2 — all CLI operations require `--region us-west-2`.

---

## Examples

A mobile banking app operates an API backend in us-east-1. Users in Southeast Asia report high API latency and intermittent timeouts during peak trading hours. After profiling, the team determines that their packets traverse 18 hops across 4 different ISPs between Singapore and Virginia before reaching the API. They enable Global Accelerator in front of their Network Load Balancer. Traffic from Singapore now enters the AWS backbone at the Singapore PoP after just 3 hops. Average round-trip time for Asian users drops 40%. The improvement isn't from caching — the API returns personalized, non-cacheable responses — it's entirely from reducing public internet exposure.

An online multiplayer game uses UDP for real-time player state synchronization at 60 packets per second. CloudFront is not an option because it handles only HTTP/HTTPS. The team deploys Global Accelerator pointing to game servers (EC2 instances with Elastic IPs) in three regions. The two static Anycast IPs are embedded in the game client binary. Players worldwide connect to the same two IPs; AWS Anycast routing directs each player to their nearest edge. When the us-west-2 game server cluster becomes unhealthy, Global Accelerator detects failure within 30 seconds and redirects North American traffic to us-east-1 — without any client update, DNS change, or player configuration.

A financial services firm manages a B2B trading API where their partner's risk management team must pre-approve all IP addresses in their firewall ruleset. Approval cycles take 2–4 weeks. Under their previous Route 53 latency routing setup, they needed to notify the partner every time a regional failover changed the ALB's underlying IPs — which could happen during any maintenance window. By placing Global Accelerator in front of their API, the firm gives the partner exactly two static Anycast IPs that never change. The firm can add regions, replace backends, and migrate infrastructure freely — the partner's firewall sees the same two IPs. An operational constraint that required weeks of advance coordination is now solved architecturally.

---

## Think About It

1. Global Accelerator improves performance by routing traffic over the AWS backbone, but the user's data still travels all the way to your origin region. Why does using the AWS backbone improve latency and consistency compared to the public internet, even when the geographic distance is the same?
2. A product manager proposes using Global Accelerator in front of an S3 static website to improve global performance. A solutions architect suggests CloudFront instead. What is the architect's argument, and under what very specific circumstances (if any) would the PM's suggestion actually make sense?
3. Global Accelerator provides health-based failover in ~30 seconds, while Route 53 failover with a 60-second TTL takes 2–5 minutes for most users. For which types of applications does this 2–4 minute difference materially affect the business, and for which types is it negligible?
4. Traffic dials allow you to send 0% of traffic to a region without removing the endpoint group configuration. How would you use this feature to implement a canary deployment strategy, and what metrics would you monitor before increasing the traffic dial?
5. Global Accelerator's Anycast IPs mean both IPs route to the same set of endpoints worldwide. A client hardcodes both IPs for redundancy. If AWS experiences an issue with one of the two Anycast IPs at a specific PoP, what happens to connections using the affected IP from that location?

---

## Quick Check

**Q1.** A company needs to route UDP game traffic globally with static IP addresses and sub-minute failover between regions. Which service is most appropriate?
- A) Amazon CloudFront
- B) Route 53 latency-based routing
- C) AWS Global Accelerator
- D) Application Load Balancer with cross-region routing

**Answer: C** — Global Accelerator supports UDP traffic (CloudFront does not), provides two static Anycast IPs, routes over the AWS backbone, and performs health-based failover in approximately 30 seconds without DNS TTL delays.

**Q2.** What is the primary functional difference between AWS Global Accelerator and Amazon CloudFront?
- A) CloudFront uses Anycast IPs; Global Accelerator uses DNS-based routing
- B) CloudFront caches HTTP content at the edge; Global Accelerator routes all TCP/UDP traffic over the AWS backbone without caching
- C) Global Accelerator is only for S3 origins; CloudFront supports any HTTP origin
- D) CloudFront operates at Layer 4; Global Accelerator operates at Layer 7

**Answer: B** — CloudFront's value is reducing origin load through edge caching of HTTP content. Global Accelerator routes any TCP/UDP traffic over the AWS private backbone with no caching — every request still reaches the origin, but via a faster, more consistent path.

**Q3.** A company embeds Global Accelerator's Anycast IPs in their mobile application binary. They later migrate from us-east-1 to eu-west-1 as their primary region. What action is required to update the static IPs in the app?
- A) New Anycast IPs are assigned when the primary region changes — update the app binary
- B) No action required — the same Anycast IPs continue to work with the new backend configuration
- C) The app must use DNS instead of hardcoded IPs to support backend changes
- D) The accelerator must be deleted and recreated with new IPs for the new region

**Answer: B** — Global Accelerator's two static Anycast IPs remain the same regardless of backend changes, regional migrations, or endpoint modifications. The IPs in the app binary continue to work — users are simply routed to the new regional endpoints through the same two IPs.

---

## What's Next

Next: AWS Outposts, Wavelength, and Local Zones — hybrid and edge deployment options that extend AWS infrastructure to on-premises data centers, 5G networks, and latency-sensitive locations.
