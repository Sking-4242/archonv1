---
title: "Listener Rules and Health Checks"
type: content
estimated_minutes: 7
cert_tags: ["aws_saa", "aws_soa"]
---

# Listener Rules and Health Checks

## Overview

ALB Listeners are the entry points that receive traffic on a specific port and protocol. Each listener has a set of rules that evaluate incoming requests and determine which Target Group receives them. Understanding listener rules is key to implementing microservices routing patterns with ALB.

## Listener Rules

A Listener Rule consists of a priority, conditions, and actions. Rules are evaluated in priority order (lowest number first), and the first matching rule wins. The default rule (lowest priority, evaluated last) catches anything that didn't match a higher rule.

**Conditions:** Path patterns (/api/*), host headers (api.example.com), HTTP headers, query strings, source IPs, HTTP methods. Conditions can be combined with AND logic.

**Actions:** Forward to target group, redirect (301/302 to a new URL — useful for HTTP → HTTPS redirects), return a fixed response (e.g., 503 maintenance page), authenticate via Cognito or OIDC (authenticate before forwarding), or weighted forward (A/B testing — 90% to target group A, 10% to target group B).

## Target Groups

A Target Group is a group of resources that a listener rule forwards to. Targets can be EC2 instances, ECS tasks, Lambda functions, or IP addresses (for on-premises servers or resources in other VPCs). Each target group has its own health check configuration.

Target groups enable sophisticated patterns: Blue/Green deployment (two identical target groups, switch traffic between them for zero-downtime deploys), Canary releases (weighted forwarding — 5% to new version, 95% to old), and microservices (each service has its own target group, ALB routes by path).

## Sticky Sessions

Sticky sessions (session affinity) ensure that requests from the same user are always routed to the same target. ALB implements this with cookies: the load balancer sets a cookie on the first response, and subsequent requests with that cookie are routed to the same target.

Sticky sessions are a workaround for stateful applications that store session data locally (in memory or on the instance's filesystem). The better architectural approach is stateless applications that store session data externally (DynamoDB, ElastiCache) — then any instance can serve any user and you don't need sticky sessions. But for legacy applications that can't be refactored immediately, sticky sessions solve the routing problem.

## Summary

ALB listeners define port/protocol entry points. Rules (priority-ordered conditions + actions) route requests to target groups. Actions include forward, redirect, fixed response, authentication, and weighted forwarding. Target groups enable Blue/Green and canary deployment patterns. Sticky sessions are a workaround for stateful applications — stateless architectures are architecturally superior.

## Examples

A media company runs a monolithic web application and begins decomposing it into microservices. Rather than changing their public-facing DNS or deploying multiple load balancers, they configure listener rules on a single ALB: `/api/users/*` forwards to a Users service target group, `/api/media/*` forwards to a Media service target group, and the default rule forwards everything else to the still-running monolith. The migration happens incrementally — each extracted service gets its own rule — without any client-side changes. This path-based routing pattern is one of the most common real-world ALB architectures.

An engineering team wants to release a rewritten checkout flow to 5% of users before a full rollout. They create two target groups — `checkout-v1` (old) and `checkout-v2` (new) — and configure a weighted forward action on the ALB listener: 95% to v1, 5% to v2. They monitor error rates and latency in CloudWatch for 48 hours. When metrics look good, they shift the weight to 50/50, then 100% v2. No DNS changes, no separate infrastructure — the ALB listener rule IS the canary deployment mechanism.

A SaaS company wants to enforce HTTPS across their application without modifying any backend code. They create an HTTP listener on port 80 with a single rule: redirect all traffic to `https://#{host}/#{path}?#{query}` with a 301 status code. Every HTTP request is instantly redirected to the HTTPS listener, which handles TLS termination via ACM and forwards decrypted traffic to the target group. The backend never sees an HTTP request again, and no application code was changed.

## Think About It

1. Listener rules are evaluated in priority order and the first matching rule wins. What could go wrong if a less-specific rule (like a catch-all for `/*`) is accidentally given a lower priority number than a more-specific rule (like `/api/*`)? How would you catch this misconfiguration?
2. Sticky sessions solve the routing problem for stateful applications, but they create a new one: if the "sticky" target becomes unhealthy and is removed, where does that user's session go? What does this reveal about the fundamental limitation of sticky sessions as an architectural choice?
3. Why is weighted forwarding in a listener rule a safer canary strategy than doing a DNS-based canary (splitting traffic at the Route 53 level with weighted records)? What can the ALB approach do that the DNS approach cannot?
4. The lesson describes Blue/Green deployment as two identical target groups with traffic switched between them. What trade-offs does this approach have compared to an in-place rolling deployment? When would you accept the cost of running two full environments simultaneously?
5. How would you use ALB's authentication action (via Cognito or OIDC) in a listener rule to protect a private admin dashboard without writing any authentication code in the application itself? What are the security boundaries of this approach?

## Quick Check

**Q1.** An ALB listener has three rules with priorities 1, 5, and default. A request matches the conditions of both rule 1 and rule 5. Which rule is applied?

- A) Both rules are applied
- B) Rule 5, because it is more specific
- C) Rule 1, because lower priority numbers are evaluated first and the first match wins
- D) The default rule, because multiple matches cause a fallback

**Answer: C** — ALB evaluates rules in ascending priority order (lowest number first) and applies the first rule whose conditions match the request.

**Q2.** A team wants to send 10% of production traffic to a new version of their service for canary testing. Which ALB listener action enables this without changing DNS?

- A) Fixed response action returning a 200 status code
- B) Redirect action with a 302 status code
- C) Weighted forward action splitting traffic between two target groups
- D) Authentication action via Cognito

**Answer: C** — The weighted forward action allows a listener rule to distribute a percentage of requests across multiple target groups, making it the native ALB mechanism for canary and A/B deployments.

**Q3.** Why are stateless applications architecturally preferred over applications that rely on sticky sessions?

- A) Stateless applications are faster because they skip cookie processing
- B) Sticky sessions are not supported by ALB
- C) With stateless apps, any instance can serve any request, so the failure of one target does not disrupt any specific user's session
- D) Sticky sessions increase ALB costs significantly

**Answer: C** — When session data is stored externally (e.g., in ElastiCache or DynamoDB), every instance holds the full application state for any user, eliminating the single-target dependency that sticky sessions create and making the application truly resilient to instance failures.

## What's Next

Next: Auto Scaling Groups — the mechanism for automatically adding and removing EC2 instances based on demand.
