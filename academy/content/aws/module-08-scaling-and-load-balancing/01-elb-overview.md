---
title: "Elastic Load Balancing Overview"
type: content
estimated_minutes: 14
cert_tags: ["SAA-C03", "SOA-C02", "DVA-C02"]
---

# Elastic Load Balancing Overview

## Overview

Elastic Load Balancing (ELB) is AWS's managed load balancing service that automatically distributes incoming application traffic across multiple targets — EC2 instances, containers, Lambda functions, or IP addresses — in one or more Availability Zones. ELB is not just a convenience feature; it is the architectural prerequisite for building any horizontally scalable, fault-tolerant system on AWS. Without it, adding capacity requires manual DNS manipulation, and a single failing instance means a failing service.

ELB exists to solve two fundamental problems simultaneously: availability and scalability. Availability means that the failure of any individual component does not cause the entire service to fail. Scalability means that as demand grows, you can add more capacity without changing how clients connect. ELB achieves both by presenting a single, stable DNS endpoint to the outside world while dynamically managing a pool of backend targets. Clients always connect to the same hostname. The load balancer decides — transparently — which healthy target handles each request.

As a student preparing for AWS certification, ELB is one of the highest-leverage topics to master deeply. It appears in scenario questions across Solutions Architect, SysOps, and Developer exams because it sits at the intersection of networking, compute, security, and cost. Understanding why each feature exists — not just what it does — is what separates a passing score from a strong one. This lesson covers the foundational mechanics: health checks, connection draining, SSL/TLS termination, cross-zone load balancing, sticky sessions, and an overview of the three ELB types.

## Core Concepts

### Single Point of Failure Elimination

A single EC2 instance is a single point of failure (SPOF). If it crashes, runs out of memory, or becomes unreachable due to a network partition, your application is down. This is unacceptable for production workloads. A load balancer eliminates the SPOF by routing traffic across a minimum of two instances in separate Availability Zones. The failure of one instance — or even one entire AZ — no longer means the failure of the service. The load balancer detects the failure via health checks (covered next) and routes all traffic to the remaining healthy targets, often within 30–60 seconds of the failure occurring.

The WHY matters: cloud infrastructure is designed around the assumption that individual components will fail. Instances are terminated by hardware failures, spot reclamation, runaway processes, or intentional deploys. ELB makes failure a routine, handled event rather than an emergency.

### Health Checks

Health checks are the mechanism by which ELB decides which targets are fit to receive traffic. Every target group has a health check configuration with the following parameters:

- **Protocol**: HTTP, HTTPS, TCP, or gRPC. Use HTTP/HTTPS for web applications so ELB can verify the application layer is functioning, not just that the port is open.
- **Path**: For HTTP/HTTPS, the URL path ELB requests (e.g., `/health`, `/ping`). This should be a dedicated, lightweight endpoint.
- **Port**: Can be the traffic port or a separate override port.
- **Healthy threshold**: Number of consecutive successful checks before a target is marked healthy (default: 3).
- **Unhealthy threshold**: Number of consecutive failed checks before a target is marked unhealthy (default: 3).
- **Interval**: How frequently ELB sends health check requests (default: 30 seconds, minimum: 5 seconds).
- **Timeout**: How long ELB waits for a response before counting the check as failed (default: 5 seconds).
- **Success codes**: HTTP status codes that count as success (default: 200).

The WHY: health checks are your circuit breaker. They ensure ELB only sends traffic to instances that are actually able to handle it. A target can be running and reachable at the TCP level but broken at the application level — for example, if its database connection pool is exhausted. An HTTP health check that returns 503 in that case will take the instance out of rotation even though the TCP port is open. This is why the protocol and path matter.

Your `/health` endpoint must return a response quickly (under the timeout threshold) and must not perform expensive operations. A health check that triggers a database query, calls an external API, or runs a complex business logic check introduces latency and can itself cause cascading failures under load.

### Connection Draining and Deregistration Delay

When a target needs to be removed from a load balancer — because of a scale-in event, a deployment, or a failed health check — ELB does not immediately cut off the connection. Connection draining (called "deregistration delay" for ALB and NLB) is a grace period during which the load balancer stops sending new requests to the departing target but allows in-flight requests to complete naturally.

The default deregistration delay is 300 seconds (5 minutes). You can configure it between 0 and 3600 seconds. For short-lived API requests, 30–60 seconds is usually sufficient. For long-lived connections (file uploads, streaming), you may need the full 300 seconds. Setting it to 0 effectively disables draining — useful if you want fast scale-in but will result in dropped connections.

The WHY: without connection draining, a user who is mid-upload or mid-checkout when an instance is deregistered will get a hard connection reset. That means a failed transaction, a re-upload, or an error page. Connection draining is what makes seamless zero-downtime deployments and scale-in events possible.

### SSL/TLS Termination

ELB can terminate SSL/TLS connections at the load balancer, decrypting HTTPS traffic and forwarding plain HTTP to backend instances inside the VPC. This is called SSL termination (or SSL offloading). The benefits are significant: backend instances no longer bear the CPU cost of TLS handshakes, certificate management is centralized on the load balancer, and you can enforce TLS policy (minimum protocol version, cipher suites) in one place.

AWS Certificate Manager (ACM) integrates directly with ALB and NLB. ACM provides free SSL/TLS certificates for domains you control (verified via DNS or email), handles automatic renewal before expiration, and deploys certificates to load balancers with a single click. You never need to manually deal with certificate files on EC2 instances.

The WHY: TLS handshakes are CPU-intensive, especially for RSA key exchanges. On a high-traffic application, terminating TLS on each backend instance wastes compute capacity that should be serving application logic. Centralizing termination on the load balancer also means you rotate certificates once instead of on every instance. If your compliance requirements demand end-to-end encryption (traffic cannot travel unencrypted even inside the VPC), you configure HTTPS listeners on the target group as well — this is called SSL re-encryption.

### Cross-Zone Load Balancing

By default, each load balancer node distributes traffic only to registered targets within its own Availability Zone. Cross-zone load balancing changes this: each load balancer node distributes traffic evenly across all registered targets in all enabled AZs, regardless of which AZ they're in.

Without cross-zone load balancing, if you have 2 targets in us-east-1a and 8 targets in us-east-1b, each AZ's load balancer node sends traffic only to its local targets. The 2 targets in 1a each receive 25% of total traffic, while the 8 targets in 1b each receive only ~6.25%. With cross-zone load balancing enabled, all 10 targets receive 10% each.

Cross-zone load balancing is enabled by default for ALB (and there is no data transfer charge for inter-AZ traffic within an ALB). For NLB and GWLB, it is disabled by default, and enabling it incurs standard inter-AZ data transfer charges.

The WHY: uneven target counts across AZs are common — ASGs don't always distribute instances perfectly, and instances may fail in one AZ faster than others. Cross-zone balancing prevents the "hot AZ" problem where a smaller set of targets in one zone gets disproportionately hammered.

### Sticky Sessions

Sticky sessions (session affinity) cause ELB to route all requests from a given client to the same target for the duration of a session. This is implemented via a cookie: ELB either inserts its own cookie (`AWSALB` for ALB) or honors an application-generated cookie. The cookie contains a reference to the target, and ELB reads it on each subsequent request to maintain affinity.

The WHY: some legacy applications store session state in memory on the instance (shopping carts, login tokens, wizard state). If a user's next request lands on a different instance, that state is gone and the user gets logged out or loses their cart. Sticky sessions are a band-aid that allows these applications to work behind a load balancer without refactoring session management.

The cost: sticky sessions create load imbalance. If one sticky-session user generates unusually high traffic, their designated instance bears all of it. The better long-term solution is to externalize session state to ElastiCache or DynamoDB so any instance can serve any user — but sticky sessions are the practical bridge when refactoring is not immediately feasible.

## Configuration Reference

### AWS CLI: Create Target Group, Register Targets, and Create an ALB

**Step 1 — Create a target group.**

```bash
aws elbv2 create-target-group \
  --name my-web-tg \
  --protocol HTTP \           # Protocol for traffic to targets
  --port 80 \                 # Port targets listen on
  --vpc-id vpc-0abc12345 \    # VPC containing your targets
  --target-type instance \    # instance | ip | lambda
  --health-check-protocol HTTP \
  --health-check-path /health \        # Lightweight endpoint on your app
  --health-check-interval-seconds 30 \ # Check every 30 seconds
  --health-check-timeout-seconds 5 \   # Fail if no response within 5s
  --healthy-threshold-count 2 \        # 2 successes = healthy
  --unhealthy-threshold-count 3 \      # 3 failures = unhealthy
  --matcher HttpCode=200               # Only 200 counts as success
```

**Step 2 — Register EC2 instances as targets.**

```bash
aws elbv2 register-targets \
  --target-group-arn arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/my-web-tg/abc123 \
  --targets Id=i-0abc12345,Port=80 Id=i-0def67890,Port=80
# Register multiple targets in one call — each as Id=<instance-id>,Port=<port>
```

**Step 3 — Create the Application Load Balancer.**

```bash
aws elbv2 create-load-balancer \
  --name my-alb \
  --subnets subnet-0aaa1111 subnet-0bbb2222 \  # One subnet per AZ (minimum 2)
  --security-groups sg-0xyz99999 \              # Controls inbound access to the ALB
  --scheme internet-facing \                    # internet-facing | internal
  --type application \                          # application | network | gateway
  --ip-address-type ipv4
```

**Step 4 — Create an HTTPS listener with ACM certificate.**

```bash
aws elbv2 create-listener \
  --load-balancer-arn arn:aws:elasticloadbalancing:us-east-1:123456789012:loadbalancer/app/my-alb/abc \
  --protocol HTTPS \
  --port 443 \
  --certificates CertificateArn=arn:aws:acm:us-east-1:123456789012:certificate/xyz \
  --ssl-policy ELBSecurityPolicy-TLS13-1-2-2021-06 \  # Enforce TLS 1.2+ minimum
  --default-actions Type=forward,TargetGroupArn=arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/my-web-tg/abc123
```

**Step 5 — Configure deregistration delay (connection draining).**

```bash
aws elbv2 modify-target-group-attributes \
  --target-group-arn arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/my-web-tg/abc123 \
  --attributes Key=deregistration_delay.timeout_seconds,Value=60
# Reduce from 300s default to 60s for short-lived API requests
# Set to 0 to disable draining entirely (not recommended for stateful connections)
```

### Console Walkthrough: Create an Application Load Balancer

1. **Navigate**: AWS Console → EC2 → Left sidebar: Load Balancing → **Load Balancers** → **Create load balancer**
2. **Select type**: Choose **Application Load Balancer** → **Create**
3. **Basic configuration**:
   - Name: `my-alb`
   - Scheme: **Internet-facing** (for public-facing apps) or **Internal** (for private/VPC-only)
   - IP address type: **IPv4**
4. **Network mapping**:
   - VPC: select your VPC
   - Mappings: check at least two AZs; select one subnet per AZ (use public subnets for internet-facing ALBs)
5. **Security groups**: Assign a security group that allows inbound 80/443 from 0.0.0.0/0 (or your CIDR)
6. **Listeners and routing**:
   - Port 80: set action to **Redirect to HTTPS** (best practice — do not serve HTTP in production)
   - Port 443: **Forward to** → select or create a target group
7. **Create target group** (if not pre-existing):
   - Target type: **Instances**
   - Protocol: HTTP, Port: 80
   - Health check path: `/health`
   - Expand **Advanced health check settings** → set Healthy threshold: 2, Unhealthy threshold: 3, Interval: 30s
   - Register your EC2 instances → **Include as pending below** → **Create target group**
8. **Secure listener settings**: Select ACM certificate for your domain
9. **Review and Create** → copy the DNS name from the load balancer details page

### Health Check Configuration — Recommended Settings

| Setting | Conservative (stable apps) | Aggressive (fast failover) | Notes |
|---|---|---|---|
| Protocol | HTTP | HTTP | Use HTTPS if backend requires it |
| Path | `/health` | `/health` | Avoid `/` — may return auth redirects |
| Interval | 30s | 10s | Lower = faster detection, more check traffic |
| Timeout | 5s | 3s | Must be < interval |
| Healthy threshold | 3 | 2 | Higher = less flapping |
| Unhealthy threshold | 3 | 2 | Lower = faster removal |
| Success codes | 200 | 200 | Can specify ranges: `200-299` |

## How to Decide

Use this checklist when designing a new load-balanced architecture:

1. **Do I need TLS termination?** Yes for almost all public-facing services. Use ACM; it is free and auto-renews. Enable HTTPS listener; add an HTTP→HTTPS redirect rule.
2. **What interval and threshold should I use?** Start with 30s interval and unhealthy threshold of 3 (detects failure in ~90s). If your SLA requires faster failover, reduce to 10s interval with threshold of 2 (detects failure in ~20s), but verify your `/health` endpoint can handle the increased check frequency without becoming a bottleneck.
3. **Should I enable cross-zone load balancing?** Yes for ALB (it's free and enabled by default). For NLB, enable it only if your target counts per AZ are consistently uneven — you will pay for inter-AZ data transfer.
4. **What deregistration delay value should I set?** Match it to your longest expected request duration. For REST APIs: 30–60 seconds. For file upload or streaming: 120–300 seconds. For async workers (SQS consumers): 0 seconds — the worker will finish its current message regardless.
5. **Do I need sticky sessions?** If your app stores session state in-memory and you cannot refactor it: yes, enable duration-based stickiness. Target: refactor to external session store (ElastiCache) and disable sticky sessions as soon as feasible.

## How This Connects

- **Auto Scaling Groups (ASG)**: ELB integrates with ASG to automatically register new instances when they launch and begin draining them before termination. ASG will not terminate an instance until ELB reports deregistration complete.
- **AWS Certificate Manager (ACM)**: Provides free, auto-renewing SSL/TLS certificates that attach directly to ELB listeners. No certificate file management on EC2 instances.
- **AWS WAF**: Can be attached to ALB to inspect and filter HTTP requests before they reach backend targets — block SQL injection, XSS, or specific IP ranges.
- **Amazon Route 53**: Uses ALB/NLB DNS names as Alias records, enabling health-check-based DNS failover and latency-based routing to geographically distributed load balancers.
- **VPC Security Groups**: ELB nodes sit inside your VPC and must be assigned security groups. Backend instances should only accept traffic from the load balancer's security group — not from 0.0.0.0/0 — so the load balancer is the sole entry point.

## Exam Traps

1. **Health check ≠ auto-terminate**: When ELB marks a target unhealthy, it stops routing traffic to it. ELB does not terminate the EC2 instance. Only the Auto Scaling Group terminates instances, and only when its own health check (which can be configured to use ELB health status) marks an instance unhealthy. If ASG is not configured to respect ELB health checks, a failed instance may sit in the target group indefinitely.

2. **Connection draining is not the same as the health check**: Students confuse these. Health checks determine if traffic should be sent to a target. Connection draining controls what happens to existing connections when a target is being removed. Both are independent settings.

3. **Cross-zone load balancing default differs by ELB type**: ALB enables it by default with no data transfer charge. NLB and GWLB disable it by default. Enabling cross-zone on NLB incurs standard inter-AZ data transfer fees. This is a frequent trick question.

4. **Deregistration delay of 0 does not mean instant termination**: Setting deregistration delay to 0 means ELB will not wait — it will immediately stop routing and deregister. But the EC2 instance does not disappear instantly; ASG still has its own lifecycle hook timing. The 0 setting only affects how long ELB waits before deregistering the target from the target group.

5. **ACM certificates cannot be downloaded**: ACM manages the private key and certificate internally. You cannot export private keys from ACM to use on EC2 instances directly. ACM certificates are only deployable to integrated AWS services (ALB, NLB, CloudFront, API Gateway). If you need to install a certificate on an EC2 instance, use AWS Private CA or import an externally obtained certificate.

## Summary

- ELB distributes incoming traffic across multiple healthy targets in multiple Availability Zones, eliminating single points of failure and enabling horizontal scaling without DNS changes.
- Health checks continuously verify targets are functioning at the application layer; targets that fail are silently removed from rotation and re-added once they recover.
- Connection draining (deregistration delay) ensures in-flight requests complete gracefully before a target is removed, making deployments and scale-in events transparent to users.
- SSL/TLS termination at the ELB offloads cryptographic work from backend instances and centralizes certificate management via ACM's free, auto-renewing certificates.
- Cross-zone load balancing distributes traffic evenly across all targets regardless of AZ; it is enabled by default on ALB but disabled by default (and costs extra) on NLB.
- Sticky sessions route a client to the same target for session consistency, but create load imbalance; the preferred alternative is externalizing session state to ElastiCache or DynamoDB.

## Examples

A mid-sized e-commerce retailer runs a checkout service on a fleet of EC2 instances across two Availability Zones. They place an ALB in front of it, with a target group spanning both AZs and a `/health` endpoint that returns 200 immediately with no downstream calls. When one instance develops a memory leak and its `/health` endpoint starts returning 503s, the load balancer marks it unhealthy after three consecutive failed checks — roughly 90 seconds — stops routing new requests to it, and lets existing requests complete via the 60-second deregistration delay. Customers never see an error. Their Auto Scaling Group, configured to use ELB health status, launches a replacement instance. This is the foundational promise of ELB: a single failed instance does not mean a failed service, and the recovery is fully automatic.

A SaaS company migrates their monolith to AWS and initially terminates TLS on each EC2 instance, requiring the team to manually renew certificates on a dozen servers every 13 months. The certificates are stored as files in `/etc/ssl`, managed by a combination of cron jobs and human memory. After attaching an ALB and moving TLS termination to the load balancer, they provision a free ACM certificate once, configure DNS validation, and enable auto-renewal. Their backend instances now only handle HTTP inside the VPC over port 80. CPU utilization drops 8–12% during peak traffic because TLS handshakes — which under RSA-2048 require asymmetric key operations — are no longer competing with application work. They also add an HTTP→HTTPS redirect rule on port 80 so any plaintext request is automatically upgraded, satisfying their compliance requirement for encrypted transit with zero application code changes.

A gaming company operates a live matchmaking service that scales aggressively during peak hours. They notice that during scale-in events their WebSocket connections drop abruptly — users lose match progress mid-game. Investigation reveals deregistration delay is set to 0, meaning instances are deregistered immediately with no draining. Their WebSocket connections are long-lived (up to 10 minutes for a match), so they increase deregistration delay to 600 seconds and configure their ALB with idle timeout at 660 seconds (slightly above the match duration). Now when a scale-in event triggers, the departing instance continues serving active matches until they complete, then gracefully exits. They also configure their ASG's instance protection to prevent termination during active connection windows, using a Lambda lifecycle hook that queries their game server for active session count before signaling completion.

## Think About It

1. Why does a load balancer's health check endpoint need to be cheap to compute? What could go wrong if your `/health` route triggers a database query or calls a downstream API before returning 200? Consider what happens if that downstream API is degraded and your health check starts timing out — what would ELB do to your entire fleet?
2. ELB integrates with Auto Scaling so that newly launched instances are registered and traffic is routed to them automatically. What would happen if a new instance was registered with the load balancer before its application had finished starting up? How would a warm-up period in the health check thresholds (or ASG lifecycle hooks) prevent requests from hitting an unready instance?
3. SSL/TLS termination at the load balancer means traffic between the ELB and your EC2 instances travels unencrypted inside the VPC. Under what compliance frameworks might that be unacceptable (think PCI DSS, HIPAA), and how would you configure SSL re-encryption to achieve end-to-end encryption without sacrificing the certificate management benefits of ACM?
4. What trade-offs does the "healthy/unhealthy threshold" setting introduce? If you set the unhealthy threshold to 1, a single transient health check failure removes the target — what risk does that create? If you set it to 10 with a 30-second interval, a truly failed instance stays in rotation for 5 minutes — what is the business impact?
5. You have an application that stores user session data in instance memory and your team argues for sticky sessions as a permanent solution. Walk through the failure scenario: an instance in the sticky session pool crashes. What happens to all users who had affinity to that instance? How does this compare to the failure mode of an ElastiCache-backed session store?

## Quick Check

**Q1.** What is the primary purpose of connection draining (deregistration delay) in ELB?

- A) To encrypt traffic between the load balancer and backend instances
- B) To allow in-flight requests to complete before a target is deregistered
- C) To prevent new instances from receiving traffic before they pass a health check
- D) To cache responses for frequently requested paths

**Answer: B** — Connection draining ensures that when a target is being removed (scale-in, deployment, or health failure), existing requests are given time to complete. New requests stop being routed immediately, but in-flight connections persist until the deregistration delay expires or they finish naturally. Without it, users experience hard connection resets mid-request.

**Q2.** A company wants to manage SSL certificates in one place rather than on each EC2 instance. Which ELB feature enables this, and which AWS service provides the certificates?

- A) Health check thresholds, managed by AWS Systems Manager
- B) Cross-zone load balancing, using certificates stored in S3
- C) SSL/TLS termination at the load balancer using certificates from AWS Certificate Manager (ACM)
- D) Sticky sessions, with certificates stored in AWS Secrets Manager

**Answer: C** — ELB terminates SSL/TLS at the listener using certificates provisioned in ACM. ACM provides free certificates, handles DNS or email domain validation, and auto-renews them. Backend instances receive plain HTTP, and all certificate operations are managed on the load balancer, not on individual instances.

**Q3.** A team enables cross-zone load balancing on a Network Load Balancer. They have 2 targets in us-east-1a and 8 targets in us-east-1b. Which statement is true?

- A) Each of the 10 targets will receive approximately 10% of total traffic, but the team will be charged for inter-AZ data transfer
- B) Cross-zone load balancing is free on NLB, just like ALB, so there is no extra cost
- C) The 2 targets in 1a will still receive 50% of traffic because each AZ gets equal shares
- D) NLB does not support cross-zone load balancing at all

**Answer: A** — Cross-zone load balancing on NLB distributes traffic evenly across all 10 targets (10% each), but unlike ALB, NLB charges standard inter-AZ data transfer rates when cross-zone is enabled. This is a key exam distinction: ALB cross-zone is free by default; NLB cross-zone costs extra.

## What's Next

Next: ALB vs. NLB vs. GWLB — the three load balancer types in depth, when to use each, and how to choose based on protocol, routing requirements, and latency needs.
