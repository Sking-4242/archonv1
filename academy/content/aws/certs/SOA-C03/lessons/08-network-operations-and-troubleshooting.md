---
title: "Network Operations and Troubleshooting"
type: content
estimated_minutes: 16
cert_tags: ["SOA-C03"]
---

# Network Operations and Troubleshooting

## Overview

Networking and Content Delivery is 18% of SOA-C03, and it is the most troubleshooting-heavy domain — its three tasks cover implementing and optimizing networking, configuring DNS and content delivery, and **troubleshooting network connectivity issues**. CloudOps engineers are the people who diagnose "instance A can't reach service B," "the site is serving stale content," "DNS isn't resolving," and "the hybrid link is down." The exam tests these as scenarios where you must reason from symptom through the network layers to the misconfigured component.

The operational principle is **systematic, layer-by-layer diagnosis**. AWS networking has a well-defined stack of controls — security groups, network ACLs, route tables, gateways, DNS, and the edge — and almost every connectivity problem resolves to one specific layer being wrong. The CloudOps skill is walking that stack in order, using the right logs (VPC Flow Logs, ELB/WAF/CloudFront logs, Resolver query logs) to see where traffic dies, and knowing the behavior of each control (stateful vs. stateless, the difference between a route problem and a firewall problem). This lesson collects the network configuration, DNS/CDN operations, and troubleshooting method the exam draws on.

After it you will be able to operate VPC networking, DNS, and content delivery, and systematically troubleshoot connectivity and caching issues.

## Core Concepts

### VPC Configuration and the Control Stack

A VPC's connectivity is governed by a stack of controls the exam expects you to operate: **subnets** (with enough IP space), **route tables** (defining where traffic can go), **internet gateway** (public internet for public subnets), **NAT gateway** (outbound internet for private subnets), **egress-only internet gateway** (outbound IPv6 for private subnets), **security groups** (stateful, instance-level, allow-only), and **network ACLs** (stateless, subnet-level, allow and deny). Operating a VPC means configuring these correctly; troubleshooting means knowing each one's behavior. The single most important distinction for troubleshooting: **security groups are stateful** (return traffic is automatically allowed) while **network ACLs are stateless** (you must allow both directions, including ephemeral ports for return traffic) — a missing ephemeral-port rule on a NACL is a classic "can send but get no reply" cause.

### The Connectivity Troubleshooting Method

For "A can't reach B," walk the stack in order: (1) **Security group** on the target — does it allow the source on the right port? (2) **Network ACL** on both subnets — does it allow the traffic in *both* directions, including ephemeral return ports (it's stateless)? (3) **Route table** — is there a route from source to destination (and back), and to the right gateway (IGW/NAT/TGW/peering)? (4) **Gateways** — is there an internet gateway (public) or NAT (private outbound), and is the resource in a subnet with the right route? (5) **DNS / endpoint** — is the name resolving and the endpoint policy permitting it? **VPC Flow Logs** show accepted/rejected flows to pinpoint where traffic dies (a REJECT at the ENI points to a security group/NACL; no log at all may point to routing). **VPC Reachability Analyzer** traces whether a source can reach a destination and shows the blocking hop. The exam's connectivity questions almost always resolve to a missing return-direction NACL rule, a security group not allowing the source, a missing/incorrect route, or a missing gateway.

### DNS and Route 53 Operations

The exam covers configuring **DNS** and **Route 53**: **Route 53 Resolver** (for DNS resolution, including hybrid scenarios and inbound/outbound endpoints to resolve between on-premises and VPC), **routing policies** (simple, weighted, latency-based, failover, geolocation, geoproximity, multivalue — each for a different traffic-distribution need), and **query logging** (to see and troubleshoot DNS queries). Operationally, DNS problems include a record pointing at the wrong target, a failover not triggering (health-check issue), or hybrid resolution not working (Resolver endpoint/rule misconfiguration). The exam pairs "distribute traffic by latency/weight/geography" with the matching routing policy and "DNS isn't resolving on-prem↔VPC" with Route 53 Resolver endpoints/rules.

### Content Delivery and CloudFront Caching Issues

**Amazon CloudFront** (CDN) and **AWS Global Accelerator** (anycast IP for TCP/UDP, routing to the optimal endpoint) distribute content and services. A specifically named CloudOps skill (5.3.3) is **identifying and remediating CloudFront caching issues** — the common symptom being **stale content** (users see old content after an update). Causes and fixes: the **cache TTL** is too long (objects stay cached); the fix is an **invalidation** (purge specific paths) or a **versioned object name / cache-busting query string** so new content has a new key; or the **cache policy** keys on the wrong headers/query strings so it serves a cached variant. Other CloudFront issues include forwarding the wrong headers/cookies (cache misses or wrong content) and origin access misconfiguration. The exam pairs "users see stale content after a deploy" with invalidation or versioned object names, and "wrong content cached" with cache-policy/header configuration.

### Network Logs for Troubleshooting

The exam (Skill 5.3.2) expects you to **collect and interpret networking logs**: **VPC Flow Logs** (IP traffic accepted/rejected at ENI/subnet/VPC — for connectivity and security analysis), **ELB access logs** (request-level detail for load-balancer issues), **AWS WAF web ACL logs** (which requests were allowed/blocked and why), **CloudFront logs** (edge request detail, cache hit/miss), and **container logs**. Matching the log to the problem is key: connectivity/flow issues → VPC Flow Logs; load-balancer request errors → ELB access logs; blocked web requests → WAF logs; caching/edge behavior → CloudFront logs. **CloudWatch network monitoring** (e.g., Internet Monitor, Network Monitor) adds visibility into network performance.

### Network Protection and Cost

Operating networking also includes **auditing network protection services** in an account — **Route 53 Resolver DNS Firewall** (block malicious domains), **AWS WAF** (web-layer filtering), **AWS Shield** (DDoS), and **AWS Network Firewall** (deep inspection) — and **optimizing network cost** (the data-transfer levers: keep traffic in-AZ/private, use VPC endpoints to avoid NAT/egress, CloudFront to cut egress). The exam pairs these protection services with their purposes and expects awareness that network architecture choices drive cost.

## Configuration Reference

VPC control stack (and behavior for troubleshooting):

```text
Security group   stateful, instance-level, allow-only (return traffic auto-allowed)
Network ACL      stateless, subnet-level, allow + deny (must allow BOTH directions incl. ephemeral)
Route table      where traffic can go (to IGW/NAT/TGW/peering)
IGW / NAT / EIGW public internet / private outbound (IPv4) / private outbound IPv6
```

Connectivity troubleshooting order:

```text
SG (source allowed on port?) → NACL (both directions incl. ephemeral?) → route table (path there & back?)
→ gateway present (IGW/NAT)? → DNS/endpoint resolves & permitted?
Confirm with: VPC Flow Logs (accept/reject), VPC Reachability Analyzer (trace blocking hop)
```

DNS / CDN / logs:

```text
Route 53 Resolver   DNS resolution incl. hybrid (inbound/outbound endpoints + rules)
Routing policies    simple/weighted/latency/failover/geolocation/geoproximity/multivalue
CloudFront stale content → invalidation OR versioned object names / cache-busting; check cache policy
Logs → problem:     VPC Flow Logs (connectivity) · ELB access logs (LB requests) ·
                    WAF logs (blocked requests) · CloudFront logs (cache/edge) · container logs
```

## How to Decide

- **"A can't reach B"?** → walk SG → NACL (both directions!) → route → gateway → DNS/endpoint; confirm with Flow Logs / Reachability Analyzer.
- **Can send but no reply?** → NACL is stateless; add the **ephemeral return-port** rule.
- **Distribute traffic by latency/weight/geo/failover?** → the matching **Route 53 routing policy**.
- **Hybrid DNS not resolving?** → **Route 53 Resolver** inbound/outbound endpoints and rules.
- **Stale content after a deploy?** → **CloudFront invalidation** or **versioned object names**.
- **Which log?** → connectivity → Flow Logs; LB requests → ELB access logs; blocked web → WAF logs; caching → CloudFront logs.

## How This Connects

This lesson operationalizes the shared VPC, flow-logs, Route 53/routing-policies, and CloudFront lessons for the CloudOps networking domain. The connectivity method reuses the security-group/NACL distinction from the security curriculum, the health-check troubleshooting connects to the reliability lesson, and network logs connect to the monitoring domain. Network cost ties to the cost-optimization material.

## Exam Traps

- **Forgetting NACLs are stateless.** Return traffic needs an explicit ephemeral-port rule — the top "no reply" cause.
- **Blaming the firewall when it's routing.** No route (or wrong gateway) blocks traffic even with permissive SG/NACL.
- **CloudFront stale content.** Fix with invalidation or versioned object names; a long TTL alone won't update on its own.
- **Wrong log for the problem.** Flow Logs for connectivity, ELB logs for LB requests, WAF logs for blocked requests, CloudFront logs for caching.
- **Wrong routing policy.** Match the policy (latency/weighted/failover/geo) to the traffic goal.
- **Hybrid DNS without Resolver endpoints.** On-prem↔VPC resolution needs Route 53 Resolver inbound/outbound endpoints and rules.

## Summary

CloudOps networking is dominated by systematic troubleshooting. A VPC's connectivity is governed by security groups (stateful, allow-only), network ACLs (stateless — allow both directions including ephemeral return ports), route tables, and gateways (IGW/NAT/egress-only); diagnose "A can't reach B" by walking that stack in order and confirming with VPC Flow Logs (accept/reject) and Reachability Analyzer. DNS and Route 53 operations include Resolver (and hybrid endpoints/rules), routing policies matched to traffic goals, and query logging. For content delivery, CloudFront stale-content issues are fixed with invalidations or versioned object names, and cache behavior depends on the cache policy. Match each network log to its problem — Flow Logs for connectivity, ELB access logs for load-balancer requests, WAF logs for blocked requests, CloudFront logs for caching. The defining skill is reasoning layer by layer from symptom to the one misconfigured control.

## Examples

**Example 1 — No reply.** An instance accepts connections but responses never arrive → the subnet's **NACL** allows inbound but not the **ephemeral return ports** (NACLs are stateless); add them.

**Example 2 — Can't reach the internet.** A private-subnet instance can't reach the internet → no **NAT gateway** (or no route to it); add the NAT and the route.

**Example 3 — Stale site.** Users see old content after a deploy → issue a **CloudFront invalidation** for the changed paths (or switch to **versioned object names**).

**Example 4 — Which log.** Some web requests are being blocked unexpectedly → check **WAF web ACL logs** to see which rule blocked them and why.

## Think About It

An EC2 instance in a private subnet can reach AWS service endpoints but cannot reach an instance in a peered VPC, while an identically configured instance can. Walk through the layers you'd inspect (security groups, NACLs, route tables, the peering route), explain how VPC Flow Logs would help you localize where the traffic stops, and name the one layer most likely to differ given the symptom.

## Quick Check

1. What is the key behavioral difference between security groups and network ACLs for troubleshooting?
2. In what order do you check controls when diagnosing "A can't reach B"?
3. How do you fix CloudFront serving stale content after a deployment?
4. Match the log to the problem: connectivity issue, blocked web request, load-balancer request error.

*Answers: (1) security groups are stateful (return traffic is automatically allowed), while network ACLs are stateless (you must explicitly allow both directions, including ephemeral return ports) — a missing ephemeral rule is a classic "no reply" cause; (2) security group → network ACL (both directions) → route table → gateway (IGW/NAT) → DNS/endpoint, confirming with VPC Flow Logs / Reachability Analyzer; (3) issue a CloudFront invalidation for the changed paths or use versioned object names / cache-busting so new content has a new cache key; (4) connectivity → VPC Flow Logs, blocked web request → WAF web ACL logs, load-balancer request error → ELB access logs.*

## What's Next

Final lesson: **SOA-C03 Exam Strategy and Question Patterns** — applying the operational and troubleshooting mindset under exam conditions.
