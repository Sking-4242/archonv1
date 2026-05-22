---
title: "Cloud CDN & Cloud Armor (WAF/DDoS)"
type: content
estimated_minutes: 10
cert_tags: ["ace", "pca", "pcse"]
---

# Cloud CDN & Cloud Armor (WAF/DDoS)

## Overview

A Global Load Balancer solves the routing problem, but it does not inherently solve the caching or security problem. To optimize global performance and protect against malicious traffic, architects must attach specialized edge services directly to the Global External Application Load Balancer.

## Cloud CDN (Content Delivery Network)

Serving static assets (images, CSS, JavaScript) from an E2 Virtual Machine in Iowa to a user in Sydney is an architectural failure. It wastes expensive compute cycles and creates unacceptable latency.

**Cloud CDN** caches this content directly at the Google Edge PoPs.
* **The Integration:** You do not deploy a separate CDN architecture. You simply go to your existing Global Load Balancer, edit the backend service, and click a single checkbox: **"Enable Cloud CDN."** * **The Flow:** The first time a Sydney user requests a logo, the Load Balancer fetches it from Iowa, serves it, and caches a copy in the Sydney Edge Node. The next 100,000 Sydney users retrieve the logo instantly from the edge node, shielding your origin servers from the load and drastically reducing your egress bandwidth costs.

## Cloud Armor (The Shield)

If your Global Load Balancer is exposed to the internet, it will be attacked. You will face SQL injection attempts, Cross-Site Scripting (XSS), and massive volumetric Distributed Denial of Service (DDoS) attacks.

**Cloud Armor** is Google's enterprise Web Application Firewall (WAF) and DDoS mitigation service. It is built on the exact same technology that protects Google Search and YouTube.

* **Edge Enforcement:** Like Cloud CDN, Cloud Armor rules are evaluated at the absolute edge of Google's network. If a malicious botnet in Eastern Europe launches a DDoS attack against your IP, Cloud Armor absorbs and drops the traffic at the European Edge PoPs. *The malicious traffic never traverses the ocean, never enters your VPC, and never touches your Virtual Machines.*
* **Security Policies:** Architects write Cloud Armor rules based on IP addresses, geographic location (e.g., "Block all traffic originating from embargoed countries"), or pre-configured WAF rules that automatically detect OWASP Top 10 vulnerabilities.

## Summary

To harden and accelerate public-facing web applications, architects augment the Global Load Balancer. Cloud CDN caches static assets at the global edge to reduce latency and origin server load. Cloud Armor acts as a perimeter Web Application Firewall and DDoS shield, dropping malicious traffic at the edge of the Google network before it can consume VPC bandwidth or compute resources.