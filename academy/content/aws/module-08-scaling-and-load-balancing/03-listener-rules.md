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

## What's Next

Next: Auto Scaling Groups — the mechanism for automatically adding and removing EC2 instances based on demand.
