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

## Examples

A startup builds a multi-tenant SaaS platform where each customer subdomain (`acme.app.io`, `globex.app.io`) maps to a separate microservice cluster. They deploy an ALB with host-based routing rules: requests for `acme.app.io` forward to one target group, `globex.app.io` to another. Because ALB operates at Layer 7 and reads the HTTP `Host` header, it can make this distinction without the clients needing to know any internal IP address — a single ALB DNS name serves all tenants. This is a textbook ALB content-based routing use case.

A financial services firm runs a proprietary binary protocol for real-time trading order entry over TCP port 9001. Their latency requirement is under 2 milliseconds end-to-end. They need a static IP per Availability Zone so clients can whitelist it in their firewalls. ALB is disqualified immediately — it only handles HTTP/HTTPS and adds Layer 7 processing latency. They deploy an NLB: it operates at Layer 4, passes TCP connections through with single-digit-millisecond overhead, assigns an Elastic IP per AZ, and preserves the source IP of each trading terminal. The binary protocol passes through untouched.

An enterprise wants to expose an internal payment microservice to partners across different AWS accounts without peering their entire VPCs. They put an NLB in front of the payment service and enable AWS PrivateLink — the NLB becomes the backing service for a PrivateLink endpoint. Partners connect to the endpoint in their own VPC and traffic never traverses the public internet. This pattern requires NLB specifically; ALB does not support PrivateLink as a backing service.

## Think About It

1. Why does NLB preserve the client's source IP while ALB does not? What does this imply about the network model each uses, and why would source IP preservation matter to an application (for example, one doing rate limiting or fraud detection)?
2. A team argues they should "just always use NLB because it's faster." What important ALB capabilities would they lose, and under what circumstances would that loss actually hurt them?
3. What would happen if you put an NLB in front of an ALB? Why might someone do this (hint: think about static IPs and content-based routing), and what complexity does it introduce?
4. How would you decide between ALB sticky sessions and moving session state to ElastiCache? What trade-offs in cost, complexity, and resilience does each approach carry?
5. CLB supports both Layer 4 and Layer 7 but AWS recommends against it for new workloads. Why might a "does everything" load balancer be less desirable than a purpose-built one?

## Quick Check

**Q1.** A company needs to route HTTP requests with path `/images/*` to one EC2 target group and `/api/*` to a different target group. Which load balancer type supports this?

- A) Network Load Balancer (NLB)
- B) Classic Load Balancer (CLB)
- C) Application Load Balancer (ALB)
- D) Gateway Load Balancer (GWLB)

**Answer: C** — ALB operates at Layer 7 and supports path-based routing rules, allowing different URL paths to be directed to separate target groups.

**Q2.** Which NLB feature makes it the correct choice when a client's firewall administrator needs a fixed, unchanging IP address to whitelist?

- A) Content-based routing
- B) Elastic IP support per Availability Zone
- C) OIDC authentication integration
- D) Cookie-based sticky sessions

**Answer: B** — NLB supports assigning Elastic IPs to each AZ endpoint, providing static IP addresses that clients can reliably whitelist in firewall rules.

**Q3.** At which OSI model layer does an Application Load Balancer operate, and what does that enable?

- A) Layer 3 — routing based on destination IP address
- B) Layer 4 — routing based on TCP/UDP port
- C) Layer 7 — routing based on HTTP headers, paths, and host names
- D) Layer 2 — routing based on MAC address

**Answer: C** — ALB operates at Layer 7 (the application layer), which allows it to inspect HTTP request content — including headers, URL paths, and host names — to make intelligent routing decisions.

## What's Next

Next: Listener rules and health checks — how ALB makes routing decisions and determines backend health.
