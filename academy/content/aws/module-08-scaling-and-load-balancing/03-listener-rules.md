---
title: "ALB Listener Rules"
type: content
estimated_minutes: 12
cert_tags: ["SAA-C03", "SOA-C02"]
---

# ALB Listener Rules

## Overview

An Application Load Balancer listener is a process that checks for incoming connection requests on a specified port and protocol. Every listener contains an ordered set of rules — each rule is a combination of conditions and an action. When a request arrives, the ALB evaluates rules in ascending priority order (lowest number first) and executes the action of the first rule whose conditions match. If no rule matches, the default rule always fires as a catch-all. This evaluation model gives you granular, deterministic control over how traffic is distributed across your backend services.

The power of listener rules goes far beyond simple "send everything to one server" routing. Because conditions can test the host header, URL path, HTTP method, query string parameters, source IP address, and arbitrary HTTP headers, a single ALB can act as the traffic router for an entire microservices platform. You can route `/api/users/*` to a Users service, `/api/orders/*` to an Orders service, and `api.admin.example.com` to an Admin service — all on one load balancer, all via listener rules. This eliminates the operational overhead and cost of deploying a separate load balancer per service.

Actions are equally expressive. Beyond forwarding to a target group, a rule can redirect the client to a different URL (with a configurable status code), return a synthetic HTTP response without touching a backend at all, or authenticate the user via Amazon Cognito or an OIDC-compatible identity provider before forwarding the request. Weighted forwarding distributes a percentage of traffic across multiple target groups simultaneously, making listener rules the native AWS mechanism for canary deployments and A/B testing — with no DNS changes, no external traffic splitters, and instant rollback by adjusting the weights.

## Core Concepts

### Rule Conditions

A rule can have one or more conditions. All conditions in a rule must match (AND logic) for the rule to fire. AWS supports six condition types:

- **Host header** — matches the `Host:` HTTP header, enabling virtual hosting. Example: route `api.example.com` to an API target group and `app.example.com` to a web app target group, both behind the same ALB.
- **Path pattern** — matches against the URL path using wildcards (`*` and `?`). Example: `/api/*` matches `/api/users`, `/api/orders/123`, etc.
- **HTTP header** — matches any arbitrary request header by name and value. Example: route requests with `X-Internal-Service: true` to an internal target group.
- **HTTP request method** — matches the HTTP verb (`GET`, `POST`, `PUT`, `DELETE`, etc.). Example: route `POST /ingest` to a write-optimized target group and `GET /ingest` to a read target group.
- **Query string** — matches one or more key-value pairs in the query string. Example: `version=2` in the query string routes to a v2 target group.
- **Source IP** — matches the client IP against a CIDR block. Example: route internal office IPs to a debug target group with verbose logging enabled.

A rule can combine conditions: a rule that fires only for `POST` requests to `/api/*` from IPs in `10.0.0.0/8` requires all three conditions to be true simultaneously.

### Rule Actions

Each rule specifies exactly one action to execute when its conditions match:

- **Forward** — sends the request to one or more target groups. The simplest and most common action.
- **Weighted forward** — distributes the request across multiple target groups according to specified weights. A 90/10 weighted forward sends 90% of matching requests to `target-group-v1` and 10% to `target-group-v2`.
- **Redirect** — returns an HTTP 301 (permanent) or 302 (temporary) redirect to the client. Supports dynamic URL construction using template variables like `#{host}`, `#{path}`, `#{port}`, `#{protocol}`, and `#{query}`.
- **Fixed response** — returns a synthetic HTTP response directly from the ALB without contacting any backend. Useful for maintenance pages, health-check endpoints, or CORS preflight responses.
- **Authenticate-Cognito** — authenticates the user via Amazon Cognito User Pools before forwarding. If the user is not authenticated, they are redirected to the Cognito hosted UI for login.
- **Authenticate-OIDC** — same as Cognito authentication but against any OIDC-compliant identity provider (Okta, Auth0, Google, Azure AD, etc.).

### Rule Priority

Rules are evaluated in ascending numerical order. Priority 1 is evaluated first; the default rule (marked `default`) is always last. The first matching rule wins — execution stops there. This means rule ordering is load-bearing configuration: a catch-all rule with priority 1 would intercept every request before any specific rules fire.

A common pattern is to number rules in increments of 10 (10, 20, 30...) to leave room for inserting new rules between existing ones without renumbering. The default rule cannot be deleted; it either forwards to a default target group or returns a 503 fixed response.

### Weighted Forwarding for Canary Deployments

Weighted forwarding is the cleanest mechanism for canary releases on AWS. Instead of splitting traffic at the DNS level (which is imprecise due to TTLs and client-side DNS caching) or deploying a separate proxy, you configure the ALB rule itself to split traffic at the request level — every request is individually assigned to a target group according to the weights.

A 90/10 canary means that literally 10 out of every ~100 requests hit the new version, with no session stickiness issues and no DNS propagation delays. You can shift from 10% to 50% to 100% in seconds by updating the rule. Rolling back means shifting weights back to 100/0 — also immediate.

### HTTPS Redirect Rule

The HTTPS redirect pattern is one of the most universal ALB configurations. An HTTP listener on port 80 contains a single rule that redirects every request to the HTTPS equivalent. The `#{host}`, `#{path}`, and `#{query}` template variables preserve the original request destination, so the client lands on the correct HTTPS URL regardless of what path they requested.

This pattern offloads HTTPS enforcement from application code entirely — no `if not request.is_secure(): redirect()` logic, no middleware, no web server config. The ALB handles it at the network layer before the request ever reaches a backend.

## Configuration Reference

### Create a path-based routing rule (CLI)

```bash
# Forward /api/* to the API target group
# Priority 10 is evaluated before priority 20 and the default rule

aws elbv2 create-rule \
  --listener-arn arn:aws:elasticloadbalancing:us-east-1:123456789012:listener/app/my-alb/abc123/def456 \
  --priority 10 \
  --conditions '[
    {
      "Field": "path-pattern",
      "PathPatternConfig": {
        "Values": ["/api/*"]   # Wildcard matches any path under /api/
      }
    }
  ]' \
  --actions '[
    {
      "Type": "forward",
      "TargetGroupArn": "arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/api-service/abc123"
    }
  ]'

# Forward /admin/* with host-header condition (combined AND logic)
aws elbv2 create-rule \
  --listener-arn arn:aws:elasticloadbalancing:us-east-1:123456789012:listener/app/my-alb/abc123/def456 \
  --priority 5 \
  --conditions '[
    {
      "Field": "host-header",
      "HostHeaderConfig": {
        "Values": ["admin.example.com"]   # Only fires for this subdomain
      }
    },
    {
      "Field": "path-pattern",
      "PathPatternConfig": {
        "Values": ["/dashboard/*"]        # AND this path pattern
      }
    }
  ]' \
  --actions '[
    {
      "Type": "forward",
      "TargetGroupArn": "arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/admin-service/xyz789"
    }
  ]'
```

### Weighted forward action for canary deployment (90/10 split)

```bash
aws elbv2 create-rule \
  --listener-arn arn:aws:elasticloadbalancing:us-east-1:123456789012:listener/app/my-alb/abc123/def456 \
  --priority 20 \
  --conditions '[
    {
      "Field": "path-pattern",
      "PathPatternConfig": {
        "Values": ["/checkout/*"]   # Only split traffic for checkout path
      }
    }
  ]' \
  --actions '[
    {
      "Type": "forward",
      "ForwardConfig": {
        "TargetGroups": [
          {
            "TargetGroupArn": "arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/checkout-v1/aaa",
            "Weight": 90    # 90% of /checkout/* requests go to v1 (stable)
          },
          {
            "TargetGroupArn": "arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/checkout-v2/bbb",
            "Weight": 10    # 10% of /checkout/* requests go to v2 (canary)
          }
        ],
        "TargetGroupStickinessConfig": {
          "Enabled": false   # Each request independently assigned; set true to pin a user to one version
        }
      }
    }
  ]'

# To promote v2 to 100% (instant, no DNS change needed):
aws elbv2 modify-rule \
  --rule-arn arn:aws:elasticloadbalancing:us-east-1:123456789012:listener-rule/app/my-alb/abc123/def456/rule123 \
  --actions '[
    {
      "Type": "forward",
      "ForwardConfig": {
        "TargetGroups": [
          {"TargetGroupArn": "...checkout-v1/aaa", "Weight": 0},    # 0 = no traffic
          {"TargetGroupArn": "...checkout-v2/bbb", "Weight": 100}   # Full cutover
        ]
      }
    }
  ]'
```

### HTTPS redirect rule on the HTTP listener (port 80)

```bash
# Create a listener on port 80 that redirects everything to HTTPS
aws elbv2 create-listener \
  --load-balancer-arn arn:aws:elasticloadbalancing:us-east-1:123456789012:loadbalancer/app/my-alb/abc123 \
  --protocol HTTP \
  --port 80 \
  --default-actions '[
    {
      "Type": "redirect",
      "RedirectConfig": {
        "Protocol": "HTTPS",
        "Port": "443",
        "Host": "#{host}",      # Preserve the original Host header
        "Path": "/#{path}",     # Preserve the original path
        "Query": "#{query}",    # Preserve the original query string
        "StatusCode": "HTTP_301"  # 301 = permanent redirect (browsers cache it)
      }
    }
  ]'
# Result: GET http://example.com/app?ref=email → 301 → https://example.com/app?ref=email
# The backend HTTPS listener never sees an unencrypted request.
```

### Fixed response rule (maintenance mode)

```bash
# Return a 503 with a JSON body — useful during planned maintenance
aws elbv2 create-rule \
  --listener-arn arn:aws:elasticloadbalancing:us-east-1:123456789012:listener/app/my-alb/abc123/def456 \
  --priority 1 \
  --conditions '[{"Field": "path-pattern", "PathPatternConfig": {"Values": ["/*"]}}]' \
  --actions '[
    {
      "Type": "fixed-response",
      "FixedResponseConfig": {
        "StatusCode": "503",
        "ContentType": "application/json",
        "MessageBody": "{\"error\": \"Service temporarily unavailable for maintenance. Try again at 06:00 UTC.\"}"
      }
    }
  ]'
# Set this to priority 1 to intercept all traffic; delete it when maintenance ends.
```

## How to Decide

| Requirement | Recommended Action Type |
|---|---|
| Route traffic to different services by URL path | Forward with path-pattern condition |
| Route traffic to different services by subdomain | Forward with host-header condition |
| Split traffic between two versions for canary testing | Weighted forward |
| Force all HTTP traffic to HTTPS | Redirect (301) on port 80 listener |
| Show a maintenance page without touching backends | Fixed response (503) |
| Protect a route without writing auth code | Authenticate-Cognito or Authenticate-OIDC |
| Route internal traffic differently from public traffic | Forward with source-IP condition |
| Route only POST requests to a write-optimized backend | Forward with HTTP-method condition |

**Choosing redirect status code:** Use 301 (permanent) for HTTP→HTTPS redirects — browsers cache it and skip the redirect on subsequent visits, reducing latency. Use 302 (temporary) when the redirect destination may change, such as a temporary maintenance redirect.

**Choosing weighted vs. DNS canary:** Prefer weighted forwarding over Route 53 weighted records for canary deployments. ALB splits at the request level (precise), while DNS splits at the resolver level (imprecise due to TTL caching and connection pooling). ALB also allows instant rollback without waiting for DNS propagation.

## How This Connects

- **Target groups** are the destination for forward and weighted-forward actions — each target group is an independently managed pool of instances, containers, or Lambda functions. Listener rules and target groups are the two halves of ALB traffic routing.
- **ACM (Certificate Manager)** provides the TLS certificate attached to the HTTPS listener. HTTPS redirect rules on the HTTP listener only work when an HTTPS listener with a valid ACM certificate exists on port 443.
- **Auto Scaling Groups** register instances with target groups automatically — when the ASG launches a new instance, it joins the target group that a listener rule forwards to. Scale-out events are transparent to the listener rule configuration.
- **Amazon Cognito** integrates with the authenticate action to provide a full hosted login UI, token issuance, and session management — all without any authentication code in the application. The ALB verifies the Cognito JWT on every request.
- **CloudWatch** exposes per-rule metrics such as request count and HTTP error rates broken down by target group, making it possible to monitor canary health (v2 error rate vs. v1) directly from the weighted forward action configuration.

## Exam Traps

**"Lower priority number means higher priority"** — Priority 1 is evaluated FIRST, not last. Students often invert this. The default rule is always last. When a question describes rule evaluation order, remember: ascending number order, first match wins.

**"You can use ALB path-based routing with NLB"** — Path-based routing, host-header conditions, and HTTP-method conditions are ALB-only features. Network Load Balancers operate at Layer 4 (TCP/UDP) and have no visibility into HTTP headers or paths. If a question mentions host headers or URL paths, the answer involves ALB, not NLB.

**"Weighted forwarding is the same as sticky sessions"** — Weighted forwarding assigns each individual request independently to a target group according to the weight. With stickiness disabled (default), two consecutive requests from the same user might hit different target groups. Sticky sessions (session affinity cookies) are a separate feature that binds a user's subsequent requests to the same specific target within a target group — they operate at different levels.

**"A redirect action contacts the backend"** — A redirect action returns an HTTP 3xx response directly to the client from the ALB. No backend is contacted. This is also true of fixed-response actions. Only forward and authenticate actions result in the ALB contacting a target group.

**"Authenticate-Cognito requires code changes in the application"** — The ALB handles the full Cognito authentication flow (redirect to hosted UI, token validation, session cookie) transparently. The application receives only authenticated requests, with user identity information in HTTP headers. No SDK calls, no OAuth libraries, and no application code changes are required.

## Summary

- ALB listener rules consist of a priority, one or more conditions (AND logic), and one action; the first matching rule in ascending priority order wins.
- Six condition types are available: host header, path pattern, HTTP header, HTTP method, query string, and source IP — they can be combined to create precise routing logic.
- Six action types are available: forward, weighted forward, redirect, fixed response, authenticate-Cognito, and authenticate-OIDC.
- Weighted forwarding enables request-level canary deployments — precise, instant to change, and requiring no DNS modifications.
- The HTTPS redirect pattern (port 80 listener with a redirect action using `#{host}/#{path}?#{query}`) enforces HTTPS at the ALB without any application code changes.
- Rule priority numbers should use gaps (10, 20, 30) to allow inserting rules later; the default rule is always the last-resort catch-all and cannot be deleted.

## Examples

A media company begins decomposing their monolithic web application into microservices. Rather than changing their public DNS or deploying multiple load balancers, they configure listener rules on a single ALB: priority 10 routes `/api/users/*` to a Users service target group, priority 20 routes `/api/media/*` to a Media service target group, and the default rule forwards everything else to the still-running monolith. Each extracted service gets a new rule without any client-side DNS changes. The monolith shrinks gradually while the ALB provides the routing layer for the entire platform — one load balancer, one DNS name, multiple backends.

An engineering team prepares to release a rewritten checkout flow. They create two target groups — `checkout-v1` (current) and `checkout-v2` (new) — and configure a weighted forward action: 90% to v1, 10% to v2. They set up a CloudWatch dashboard showing error rate and p99 latency broken down by target group. Over 48 hours, v2's metrics match v1. They update the rule to 50/50, monitor for another hour, then shift to 0/100. The entire promotion takes three rule modifications and zero DNS changes. If v2 had shown elevated errors at 10%, they would have shifted weights back to 100/0 in under ten seconds — an instant rollback that DNS-based canaries cannot match.

A SaaS company needs to protect their `/admin/*` routes behind SSO without adding authentication code to their Node.js application. They attach an authenticate-OIDC action to the `/admin/*` listener rule, pointing it at their Okta tenant's OIDC discovery URL, client ID, and client secret. When an unauthenticated user visits `https://app.example.com/admin/dashboard`, the ALB intercepts the request, redirects to Okta, handles the token exchange after login, sets an encrypted session cookie, and then forwards the original request to the admin target group with the user's identity in `X-Amzn-OIDC-Identity` and `X-Amzn-OIDC-Data` headers. The Node.js application trusts these headers and renders the page — it never processed an authentication handshake and contains no OAuth library code.

## Think About It

1. Listener rules are evaluated in priority order and the first matching rule wins. What could go wrong if a broad catch-all rule (matching `/*`) is accidentally assigned priority 5 while a specific rule (matching `/api/*`) is assigned priority 10? How would you detect and fix this without downtime?
2. Weighted forwarding with stickiness disabled means consecutive requests from the same user can hit different target groups. What types of applications would break under this behavior, and what feature would you enable to prevent it? What does this reveal about the statefulness assumptions in your application?
3. Why is an ALB-based weighted forward canary more reliable than a Route 53 weighted routing canary? Think through what happens at the DNS layer when you shift weights from 90/10 to 0/100 vs. what happens at the ALB layer.
4. The authenticate-Cognito action handles the entire OAuth/OIDC flow at the ALB layer. What are the security boundaries of this approach — what does the ALB guarantee, and what trust assumptions does the application still need to enforce itself?
5. A fixed-response action can return any HTTP status code and body. Walk through a scenario where a fixed-response rule at priority 1 would be operationally useful, and describe what process you would follow to disable it safely without accidentally dropping legitimate traffic.

## Quick Check

**Q1.** An ALB listener has rules with priorities 5, 10, 20, and a default rule. An incoming request matches the conditions of both priority 10 and priority 20. Which action is executed?

- A) Both actions execute in sequence
- B) Priority 20, because it is more specific
- C) Priority 10, because lower numbers are evaluated first and the first match wins
- D) The default rule fires because multiple rules matched

**Answer: C** — ALB evaluates rules in ascending numeric order and executes the action of the first matching rule. Priority 10 is evaluated before priority 20, and execution stops at the first match.

**Q2.** A team wants to gradually shift 10% of production traffic to a new version of their checkout service without changing DNS records or deploying additional infrastructure. Which ALB listener action accomplishes this?

- A) Fixed response action returning a 302 redirect to the new version
- B) Weighted forward action distributing requests across two target groups
- C) Authenticate-Cognito action before forwarding to the new version
- D) A new listener on a different port for the new version

**Answer: B** — The weighted forward action assigns individual requests to target groups according to configured weights (e.g., 90 to v1, 10 to v2), providing request-level traffic splitting without DNS changes or separate infrastructure.

**Q3.** An ALB HTTP listener on port 80 needs to redirect all traffic to HTTPS while preserving the original host, path, and query string. Which action type and template variables accomplish this?

- A) Fixed-response action with a 301 status code
- B) Forward action to a target group configured for HTTPS
- C) Redirect action using `#{host}`, `/#{path}`, and `#{query}` template variables with status code HTTP_301
- D) Authenticate-OIDC action that redirects unauthenticated users to the HTTPS endpoint

**Answer: C** — The redirect action supports URL template variables that dynamically preserve the original request components. `HTTP_301` signals a permanent redirect, which browsers cache to avoid repeating the redirect on future requests.

## What's Next

Next: Auto Scaling Groups — the mechanism that automatically provisions and replaces EC2 instances to match demand, and how they integrate with ALB target groups for seamless scale-out.
