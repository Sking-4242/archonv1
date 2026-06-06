---
title: "ALB vs. NLB vs. GWLB"
type: content
estimated_minutes: 16
cert_tags: ["SAA-C03", "SOA-C02", "DVA-C02"]
---

# ALB vs. NLB vs. GWLB

## Overview

AWS offers three current-generation load balancer types — Application Load Balancer (ALB), Network Load Balancer (NLB), and Gateway Load Balancer (GWLB) — plus the legacy Classic Load Balancer (CLB), which AWS no longer recommends for new workloads. Each type operates at a different layer of the OSI model and was purpose-built for a specific class of problem. Choosing the wrong type is a common architectural mistake that can lead to unnecessary cost, missing features, or performance problems that cannot be patched without replacing the load balancer entirely.

The fundamental distinction is the OSI layer at which the load balancer operates. ALB operates at Layer 7 (the application layer) and understands HTTP/HTTPS/gRPC semantics — it can read URLs, headers, cookies, and query strings to make routing decisions. NLB operates at Layer 4 (the transport layer) and works purely with IP addresses, ports, and protocols — it is protocol-agnostic and blazingly fast. GWLB operates at Layer 3 (the network layer) in conjunction with Layer 4, and is designed exclusively for the niche use case of routing traffic through third-party virtual network appliances like firewalls and intrusion detection systems.

For AWS certification, the ALB vs. NLB decision is one of the most frequently tested architectural choices in the exam. Scenario questions will describe a workload and ask you to identify the correct load balancer type. The answer almost always comes down to three signals: what protocol is in use, whether content-based routing is required, and whether static IPs or source IP preservation matter. This lesson gives you a deep model for all three types and the decision criteria to apply them confidently.

## Core Concepts

### Application Load Balancer (ALB) — Layer 7

ALB operates at Layer 7 of the OSI model, meaning it fully parses the HTTP/HTTPS/gRPC request before making a routing decision. It understands the `Host` header, the URL path, query string parameters, HTTP method, source IP, and request body. This content awareness enables ALB to do things that no lower-layer load balancer can: route `/api/*` to a microservice cluster, route `admin.example.com` to a separate target group from `app.example.com`, redirect HTTP to HTTPS, return a fixed 503 maintenance page without hitting any backend, or authenticate users via OIDC before the request ever reaches your application.

ALB supports three target types: EC2 instances, IP addresses (including containers running in ECS/Fargate), and Lambda functions. This makes ALB the natural choice for containerized microservices architectures. It also natively supports WebSocket and HTTP/2, and integrates with AWS WAF to filter malicious requests before they hit your backends. Sticky sessions on ALB are implemented via the `AWSALB` cookie, which ALB inserts and reads to maintain client-to-target affinity.

The WHY: ALB exists because modern web applications are not monoliths. A single public DNS name needs to route to dozens of different services based on URL structure, subdomain, or request attributes. Without content-based routing, you need a separate load balancer per service, which is expensive and operationally complex. ALB consolidates all of this behind a single endpoint with rule-based routing.

### Network Load Balancer (NLB) — Layer 4

NLB operates at Layer 4, meaning it routes based on IP address, port, and protocol (TCP/UDP/TLS) without inspecting application content. The result is extreme performance: NLB can handle millions of requests per second with latency in the single-digit milliseconds — orders of magnitude faster than ALB in high-throughput scenarios because it does not parse application-layer content.

NLB has two capabilities that ALB fundamentally cannot provide. First, static IP addresses: each NLB gets one fixed IP per Availability Zone, and you can assign Elastic IPs to those slots. This means clients can whitelist a fixed IP in their firewall rules — something impossible with ALB, which uses a pool of dynamically managed IPs behind a DNS name. Second, source IP preservation: NLB passes the client's actual IP address to the backend target unchanged. ALB, by contrast, replaces the client IP with its own IP in the TCP connection; backend applications must read the `X-Forwarded-For` header to recover the original client IP. NLB's source IP preservation is important for applications that do IP-based rate limiting, geo-restriction, or fraud detection at the network layer.

NLB also supports AWS PrivateLink: you can expose an NLB as a PrivateLink endpoint service, allowing consumers in other AWS accounts and VPCs to connect to your service privately without VPC peering, internet gateways, or NAT. This is the canonical pattern for SaaS providers offering private connectivity to enterprise customers.

The WHY: NLB exists for workloads that either cannot use HTTP (binary protocols, gaming, IoT, financial data feeds) or need performance and network-level features (static IPs, PrivateLink, source IP) that only a Layer 4 load balancer can provide.

### Gateway Load Balancer (GWLB) — Layer 3/4

GWLB is architecturally different from ALB and NLB. It is not a general-purpose load balancer for your application traffic. Its sole purpose is to transparently insert third-party virtual network appliances — firewalls, intrusion detection/prevention systems (IDS/IPS), deep packet inspection tools — into the traffic path of your VPC without changing network topology or requiring source NAT.

GWLB uses the GENEVE protocol (port 6081) to encapsulate original packets and forward them to a fleet of virtual appliances in a target group. The appliances inspect or transform the packets and return them to GWLB, which then forwards the (potentially modified) traffic to its original destination. From the perspective of the original source and destination, traffic flows normally — GWLB and the appliances are invisible bumps in the wire.

GWLB is deployed in its own VPC alongside the appliance fleet. Traffic from other VPCs is routed through it via Gateway Load Balancer Endpoints (GWLBe), which use VPC endpoint technology. A typical deployment: all ingress internet traffic entering a security VPC is first sent through a GWLB pointing at a Palo Alto or Fortinet firewall fleet before being forwarded to application VPCs.

The WHY: enterprises often have compliance requirements to run all traffic through certified security appliances. Before GWLB, this required complex network topology changes (chaining VPCs together, managing static routes, dealing with asymmetric routing issues). GWLB abstracts all of that complexity into a managed service.

### Classic Load Balancer (CLB) — Legacy

CLB was AWS's original load balancer, predating both ALB and NLB. It supports a hybrid of Layer 4 and Layer 7 features but does so poorly compared to the purpose-built replacements. CLB does not support content-based routing, Lambda targets, WebSocket, HTTP/2, WAF integration, or PrivateLink. AWS has indicated CLB will eventually be deprecated.

The exam rule is simple: CLB is always the wrong answer for a new workload question. If you see CLB as an option, it is almost certainly a distractor. The only correct CLB answer is a migration scenario where you are moving an existing CLB to ALB or NLB.

## Configuration Reference

### AWS CLI: Create ALB vs. NLB — Key Differences

**Create an Application Load Balancer:**

```bash
aws elbv2 create-load-balancer \
  --name my-alb \
  --type application \               # Layer 7 — HTTP/HTTPS/gRPC
  --scheme internet-facing \         # internet-facing | internal
  --subnets subnet-0aaa1111 subnet-0bbb2222 \  # Must specify 2+ subnets in different AZs
  --security-groups sg-0abc99999     # ALB requires a security group; NLB supports security groups optionally (since August 2023)
```

**Create a Network Load Balancer:**

```bash
aws elbv2 create-load-balancer \
  --name my-nlb \
  --type network \                   # Layer 4 — TCP/UDP/TLS
  --scheme internet-facing \
  --subnets subnet-0aaa1111 subnet-0bbb2222
  # Note: --security-groups is optional on NLB (supported since August 2023). If omitted,
  # NLB allows all traffic to reach targets; attaching a security group restricts inbound access.
  # To assign Elastic IPs to NLB nodes, use --subnet-mappings instead of --subnets:
  # --subnet-mappings SubnetId=subnet-0aaa1111,AllocationId=eipalloc-0abc123
```

**Create an NLB with Elastic IP assignment:**

```bash
# First, allocate Elastic IPs (one per AZ):
EIP1=$(aws ec2 allocate-address --domain vpc --query AllocationId --output text)
EIP2=$(aws ec2 allocate-address --domain vpc --query AllocationId --output text)

# Create NLB with static IPs:
aws elbv2 create-load-balancer \
  --name my-static-nlb \
  --type network \
  --scheme internet-facing \
  --subnet-mappings \
    SubnetId=subnet-0aaa1111,AllocationId=$EIP1 \
    SubnetId=subnet-0bbb2222,AllocationId=$EIP2
# Each AZ now has a fixed Elastic IP — clients can whitelist these in firewalls
```

**Create a TCP listener on NLB:**

```bash
aws elbv2 create-listener \
  --load-balancer-arn arn:aws:elasticloadbalancing:...:loadbalancer/net/my-nlb/abc \
  --protocol TCP \    # NLB supports: TCP | UDP | TCP_UDP | TLS
  --port 9001 \
  --default-actions Type=forward,TargetGroupArn=arn:aws:elasticloadbalancing:...:targetgroup/my-tcp-tg/xyz
```

**Create an ALB listener with path-based routing rules:**

```bash
# Create listener (default action: 404 for unmatched paths):
LISTENER_ARN=$(aws elbv2 create-listener \
  --load-balancer-arn arn:aws:elasticloadbalancing:...:loadbalancer/app/my-alb/abc \
  --protocol HTTPS \
  --port 443 \
  --certificates CertificateArn=arn:aws:acm:...:certificate/xyz \
  --default-actions Type=fixed-response,FixedResponseConfig='{StatusCode=404}' \
  --query Listeners[0].ListenerArn --output text)

# Add rule: /api/* → API target group
aws elbv2 create-rule \
  --listener-arn $LISTENER_ARN \
  --priority 10 \
  --conditions Field=path-pattern,Values='/api/*' \
  --actions Type=forward,TargetGroupArn=arn:...:targetgroup/api-tg/abc

# Add rule: /static/* → static assets target group
aws elbv2 create-rule \
  --listener-arn $LISTENER_ARN \
  --priority 20 \
  --conditions Field=path-pattern,Values='/static/*' \
  --actions Type=forward,TargetGroupArn=arn:...:targetgroup/static-tg/def

# Add rule: host-based routing — api.example.com → API target group
aws elbv2 create-rule \
  --listener-arn $LISTENER_ARN \
  --priority 5 \
  --conditions Field=host-header,Values='api.example.com' \
  --actions Type=forward,TargetGroupArn=arn:...:targetgroup/api-tg/abc
```

### Feature Comparison Table

| Feature | ALB | NLB | GWLB | CLB |
|---|---|---|---|---|
| OSI Layer | 7 (Application) | 4 (Transport) | 3/4 (Network) | 4 and 7 (hybrid) |
| Protocols | HTTP, HTTPS, gRPC | TCP, UDP, TLS, TCP_UDP | All IP protocols (GENEVE) | HTTP, HTTPS, TCP, SSL |
| Content-based routing | Yes (path, host, header, method) | No | No | Limited (path only) |
| WebSocket support | Yes (native) | Yes (TCP passthrough) | N/A | No |
| Lambda targets | Yes | No | No | No |
| Static IP per AZ | No (dynamic IP pool) | Yes (Elastic IP assignable) | Yes | No |
| Source IP preservation | No (use X-Forwarded-For) | Yes (native) | Yes | No |
| AWS WAF integration | Yes | No | No | No |
| PrivateLink backing service | No | Yes | No | No |
| Sticky sessions | Yes (cookie-based) | Yes (source IP-based) | N/A | Yes |
| Cross-zone LB default | Enabled (free) | Disabled (charged if enabled) | Disabled (charged if enabled) | Enabled |
| Security groups | Required | Optional (supported since Aug 2023) | Not supported on LB | Required |
| User authentication (OIDC/Cognito) | Yes | No | No | No |
| Throughput | High | Extreme (millions req/sec) | Extreme | Moderate |
| Latency overhead | ~1–5ms (HTTP parsing) | <1ms | <1ms | ~1–5ms |

### Console Paths by Load Balancer Type

- **ALB**: EC2 → Load Balancers → Create load balancer → **Application Load Balancer**
- **NLB**: EC2 → Load Balancers → Create load balancer → **Network Load Balancer**
- **GWLB**: EC2 → Load Balancers → Create load balancer → **Gateway Load Balancer**
- Listener rules (ALB only): EC2 → Load Balancers → select ALB → **Listeners** tab → click listener → **View/edit rules**
- PrivateLink setup (NLB): VPC → Endpoint Services → Create endpoint service → select NLB

## How to Decide

Apply these criteria in order:

1. **Is the protocol HTTP, HTTPS, or gRPC?** If yes, default to ALB. Stop here unless criteria below override it.
2. **Do you need content-based routing** (path, host, header, query string, method)? If yes, you must use ALB — NLB cannot read application-layer content.
3. **Do you need Lambda as a target?** ALB only. NLB does not support Lambda targets.
4. **Do you need WAF integration or OIDC/Cognito authentication?** ALB only.
5. **Is the protocol non-HTTP** (TCP, UDP, custom binary, SMTP, MQTT, FIX protocol)? NLB. ALB cannot handle non-HTTP traffic.
6. **Do clients need a fixed, unchanging IP address** (for firewall whitelisting)? NLB with Elastic IP assignment. ALB uses a dynamic IP pool behind a DNS name.
7. **Do you need source IP preserved at the TCP level** (without relying on X-Forwarded-For headers)? NLB.
8. **Do you need PrivateLink** (cross-account private connectivity)? NLB as the backing service.
9. **Ultra-low latency, sub-millisecond**, millions of requests per second? NLB — it bypasses HTTP parsing.
10. **Do you need to route traffic through a third-party firewall or IDS/IPS appliance fleet?** GWLB. This is the only use case it serves.
11. **Is it a legacy CLB?** Migrate to ALB (for HTTP workloads) or NLB (for TCP workloads). Do not use CLB for new workloads.

**The 90% rule**: If you are building a web application or REST API, use ALB. If the exam describes a non-HTTP protocol, static IPs, source IP, or PrivateLink, use NLB.

## How This Connects

- **Amazon ECS and Fargate**: ALB integrates with ECS via the IP target type, allowing each container task to be individually registered as a target. Path and host-based routing allows a single ALB to front an entire microservices cluster running in ECS. NLB is used when containers expose non-HTTP protocols.
- **AWS WAF**: Attaches to ALB to inspect HTTP/HTTPS requests for SQL injection, XSS, bot signatures, rate limits, and geographic restrictions. Every HTTP request is evaluated by WAF rules before reaching your application. NLB and GWLB do not integrate with WAF.
- **AWS PrivateLink**: NLB is the required backing service for PrivateLink endpoint services. The pattern: put your service behind an NLB, create an endpoint service from that NLB, and allow other AWS accounts to create interface endpoints to connect privately. Used by AWS itself (all AWS PrivateLink-enabled services use this internally).
- **Amazon Cognito / OIDC**: ALB can authenticate users before forwarding requests to your application. The ALB listener redirects unauthenticated users to the Cognito hosted UI or an OIDC provider, validates the token, and passes user identity claims as HTTP headers (`X-Amzn-Oidc-Identity`, etc.) to the backend. This removes authentication logic from application code.
- **AWS Marketplace virtual appliances**: GWLB is the integration point for marketplace firewall appliances (Palo Alto Networks, Fortinet, Check Point, etc.) running as EC2 instances. GWLB provides horizontal scaling and health checking for the appliance fleet, making "bump-in-the-wire" network security scalable and highly available.

## Exam Traps

1. **"ALB has a static IP" — false**: ALB does not have a fixed IP address. Its DNS name resolves to a pool of IPs that AWS manages and changes over time. If a question mentions clients needing to whitelist a fixed IP, the answer is NLB with an Elastic IP, not ALB. A common trap is describing an ALB with Elastic IP — that is not possible.

2. **"NLB can do path-based routing" — false**: NLB operates at Layer 4. It has no visibility into HTTP content. It cannot route `/api/*` to one target group and `/app/*` to another. If a question requires content-based routing, only ALB qualifies. Trick answers sometimes describe NLB with listener rules — NLB listeners only match on port and protocol, not content.

3. **"ALB preserves source IP" — misleading**: ALB does preserve the source IP in the `X-Forwarded-For` HTTP header, but at the TCP level, the connection to the backend comes from the ALB's IP. NLB, by contrast, preserves source IP at the network level — the backend sees the client's actual IP in the TCP connection. For applications doing IP-based logic in code (reading a header), ALB's X-Forwarded-For works. For network-level controls (security group rules, firewall rules based on the source IP of the TCP socket), only NLB provides true source IP preservation.

4. **"GWLB is for high-traffic web applications" — false**: GWLB has no web-facing features. It cannot be used as a general load balancer for EC2 instances serving HTTP traffic. It exists solely to chain traffic through third-party virtual appliances. Choosing GWLB for a web application is always wrong on the exam.

5. **"CLB is a safe default" — false**: CLB is legacy. It lacks features that ALB and NLB provide and AWS does not recommend it for new architectures. On the exam, if you are tempted to choose CLB, re-read the question — the correct answer is almost always ALB or NLB. The one exception is if the question explicitly describes an existing CLB that needs to be migrated, in which case CLB appears in the "before" state of the scenario.

## Summary

- ALB operates at Layer 7 and makes routing decisions based on HTTP content (path, host, headers, cookies) — it is the correct choice for virtually all HTTP/HTTPS web applications, REST APIs, microservices, and containerized workloads.
- NLB operates at Layer 4 with extreme throughput (millions of req/sec) and sub-millisecond latency, supports static IPs via Elastic IP assignment, preserves client source IP at the TCP level, and is required for non-HTTP protocols and AWS PrivateLink.
- GWLB operates at Layer 3/4 using GENEVE encapsulation to transparently route traffic through third-party virtual firewall and IDS/IPS appliances; it is not a general-purpose application load balancer.
- ALB integrates with WAF for request filtering and with Cognito/OIDC for authentication offload; neither capability exists on NLB or GWLB.
- Cross-zone load balancing is enabled by default and free on ALB; it is disabled by default on NLB and GWLB and incurs inter-AZ data transfer charges when enabled.
- CLB is legacy infrastructure — do not use it for new workloads and plan migration to ALB or NLB for existing CLB deployments.

## Examples

A startup builds a multi-tenant SaaS platform where each customer subdomain (`acme.app.io`, `globex.app.io`) maps to a separate microservice cluster. They deploy an ALB with host-based routing rules: requests for `acme.app.io` forward to one target group, `globex.app.io` to another. They add path-based rules on top: within each tenant, `/api/*` routes to an API service target group and `/webhooks/*` routes to a webhook processor target group. Because ALB operates at Layer 7 and reads the HTTP `Host` and path from every request, a single ALB DNS name serves all tenants and all services. They attach AWS WAF to the ALB to block malicious traffic before it reaches any backend. Total cost: one ALB, WAF subscription, and zero per-service load balancers.

A financial services firm runs a proprietary binary protocol for real-time trading order entry over TCP port 9001. Their latency requirement is under 2 milliseconds end-to-end. Compliance requires that each trading terminal's IP address be visible to the backend for audit logging — the backend must see the actual client IP in the socket connection, not an intermediate load balancer IP. They also need to provide their clients with a fixed IP to whitelist in hardware firewalls; a DNS name is not acceptable. ALB is disqualified on all three counts: it only handles HTTP, adds Layer 7 parsing latency, and does not preserve source IP at the TCP level. They deploy an NLB with Elastic IPs assigned per Availability Zone. The binary protocol passes through untouched at Layer 4, the backend sees the trading terminal's source IP natively, and clients receive two static IPs (one per AZ) to whitelist.

An enterprise wants to expose an internal payment microservice to partners across different AWS accounts without peering their entire VPCs or allowing internet routing. They put an NLB in front of the payment service, create a VPC Endpoint Service backed by that NLB, and enable AWS PrivateLink. Partners in their own AWS accounts create Interface VPC Endpoints that connect to the endpoint service. Traffic flows privately from partner VPC to payment service VPC through the AWS backbone — never touching the internet, never requiring overlapping-CIDR VPC peering. The payment service is exposed only on specific ports through the NLB; everything else in the payment VPC remains invisible to partners. This pattern requires NLB specifically — ALB cannot serve as the backing service for a PrivateLink endpoint service.

## Think About It

1. Why does NLB preserve the client's source IP while ALB does not? What does this reveal about the fundamental difference in how each load balancer processes packets? Consider: if ALB forwarded the raw TCP connection unchanged (like NLB does), what would it lose the ability to do?
2. A team argues they should "just always use NLB because it's faster." List three ALB-specific capabilities they would lose, and construct a realistic scenario where each loss would cause a production incident.
3. What would happen if you put an NLB in front of an ALB? Why might someone build this architecture (hint: static IPs + content-based routing), and what complexity and latency does it introduce? What is the single biggest operational downside of this pattern?
4. GWLB uses the GENEVE protocol to forward traffic through virtual appliances and back. What failure mode do you need to design around if one of the virtual appliance instances crashes mid-inspection? How does GWLB's health checking and cross-zone balancing help, and what happens to packets that were in-flight through a failed appliance?
5. ALB supports user authentication via OIDC integration, which means the ALB itself validates the identity token and forwards user identity claims to your application as HTTP headers. What security assumption does your application need to make for this to be safe, and how could it be exploited if that assumption is violated?

## Quick Check

**Q1.** A company needs to route HTTP requests with path `/images/*` to one EC2 target group and `/api/*` to a different target group. Which load balancer type supports this natively?

- A) Network Load Balancer (NLB)
- B) Classic Load Balancer (CLB)
- C) Application Load Balancer (ALB)
- D) Gateway Load Balancer (GWLB)

**Answer: C** — ALB operates at Layer 7 and supports path-based routing rules, allowing different URL paths to be directed to separate target groups. NLB, CLB, and GWLB do not have the capability to inspect HTTP URL paths and make routing decisions based on them.

**Q2.** A client application needs a fixed, unchanging IP address to whitelist in their hardware firewall. They are connecting to a high-throughput service over TCP. Which load balancer type and feature satisfies this requirement?

- A) ALB with a static Elastic IP assigned to the listener
- B) NLB with Elastic IPs assigned per Availability Zone using --subnet-mappings
- C) CLB with a reserved IP allocation
- D) GWLB with a static IP per endpoint service

**Answer: B** — NLB supports Elastic IP assignment per AZ via `--subnet-mappings`, giving each AZ a fixed IP that clients can whitelist. ALB does not support Elastic IP assignment — its IP pool is managed dynamically by AWS. CLB and GWLB do not support Elastic IP assignment for this purpose either.

**Q3.** An enterprise wants to expose a service in VPC-A to consumers in VPC-B (a different AWS account) without VPC peering, without overlapping-CIDR concerns, and without internet routing. Which load balancer type enables AWS PrivateLink to support this pattern?

- A) Application Load Balancer (ALB)
- B) Classic Load Balancer (CLB)
- C) Gateway Load Balancer (GWLB)
- D) Network Load Balancer (NLB)

**Answer: D** — NLB is the required backing service for AWS PrivateLink endpoint services. The producer deploys an NLB, creates a VPC Endpoint Service from it, and consumers create Interface VPC Endpoints to connect. ALB cannot serve as a PrivateLink backing service. GWLB endpoints exist for appliance chaining, not cross-account service exposure.

## What's Next

Next: Auto Scaling Groups — how AWS automatically adjusts the n