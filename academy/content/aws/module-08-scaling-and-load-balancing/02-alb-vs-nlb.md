---
title: "ALB vs. NLB vs. CLB"
type: content
estimated_minutes: 8
cert_tags: ["aws_saa", "aws_soa", "aws_dva"]
---

# ALB vs. NLB vs. CLB

## Overview

AWS offers three load balancer types: Application Load Balancer (ALB), Network Load Balancer (NLB), and Classic Load Balancer (CLB — legacy, not recommended for new workloads). Each operates at a different layer of the OSI model and serves different use cases. Choosing the right one is a frequent exam topic.

## Application Load Balancer (ALB) — Layer 7

ALB operates at Layer 7 (HTTP/HTTPS/gRPC). It understands the content of requests — HTTP headers, URLs, query strings, cookies, source IPs — and routes based on them. This content-based routing enables sophisticated traffic distribution patterns.

**ALB features:** Content-based routing (route /api/* to the API target group, /static/* to a different one), host-based routing (api.example.com → microservice A, app.example.com → microservice B), WebSocket support, HTTP/2 support, native Lambda target support, user authentication via OIDC/Cognito, and sticky sessions (route a user to the same target for the duration of their session).

**Use ALB for:** Web applications, REST APIs, microservices with path-based routing, containerized applications, anything using HTTP/HTTPS.

## Network Load Balancer (NLB) — Layer 4

NLB operates at Layer 4 (TCP/UDP/TLS). It doesn't inspect content — it routes based on IP address, port, and protocol. NLB can handle millions of requests per second with ultra-low latency (single-digit milliseconds). It preserves the source IP address of the client (unlike ALB, which replaces it with the ALB's IP).

**NLB features:** Static IP per AZ (useful for whitelisting), Elastic IP support (bring your own IP), source IP preservation, TLS termination (like ALB), cross-zone load balancing, and PrivateLink support (for exposing services privately across VPC boundaries).

**Use NLB for:** Non-HTTP protocols (SMTP, MQTT, custom TCP), extremely low latency requirements, source IP preservation, static IP requirements, gaming servers, IoT ingestion.

## Choosing Between ALB and NLB

The decision tree: **HTTP/HTTPS?** → Use ALB. **Need content-based routing, auth, or Lambda targets?** → Use ALB. **Non-HTTP protocol?** → Use NLB. **Need static IP or source IP preservation?** → Use NLB. **Ultra-low latency (< 1ms)?** → Use NLB. **Both required?** → NLB in front of ALB is a valid (though complex) pattern.

CLB is the original load balancer — supports both Layer 4 and Layer 7 but with limited features. Don't use CLB for new workloads. Migrate existing CLBs to ALB or NLB.

## Summary

ALB (Layer 7) routes based on HTTP content — path, host, headers — ideal for web applications and microservices. NLB (Layer 4) routes based on IP/port with ultra-low latency and static IPs — ideal for non-HTTP protocols or latency-sensitive applications. CLB is legacy — don't use it for new workloads. For most web applications, ALB is the right choice.

## What's Next

Next: Listener rules and health checks — how ALB makes routing decisions and determines backend health.
