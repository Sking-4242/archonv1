---
title: "Edge Security: CloudFront, WAF, and Shield Advanced"
type: content
estimated_minutes: 18
cert_tags: ["SCS-C03"]
---

# Edge Security: CloudFront, WAF, and Shield Advanced

## Overview

The edge is where your applications meet the internet, and therefore where most external attacks arrive — DDoS floods, web exploits, bots, and scrapers. The Security Specialty exam's Infrastructure Security domain (18%) opens with *designing, implementing, and troubleshooting security controls for network edge services* (Task 3.1). The exam expects you to assemble a layered edge defense from CloudFront, AWS WAF, and Shield Advanced; to write WAF rules that address real threats (the OWASP Top 10, rate-based abuse, geographic restrictions); and to configure protections like security headers, S3 CORS, and origin access control. This is design-and-implement depth — given an internet-facing application and a threat profile, what edge controls do you put where.

The central idea of edge security is **defense in depth at the perimeter, as far from your origin as possible**. The further out you stop an attack, the less it costs you and the less it reaches your infrastructure. CloudFront terminates connections at hundreds of edge locations and can absorb and filter traffic before it ever touches your origin; WAF inspects requests at Layer 7 and blocks malicious patterns; Shield defends against volumetric and protocol DDoS. Used together, they form a perimeter that filters bad traffic at the edge and only forwards clean requests inward. The specialty skill is choosing and configuring each layer for the anticipated threats, and knowing how they interact — for example, that WAF attached to CloudFront protects globally at the edge, while WAF on a regional ALB protects that Region.

This lesson covers the edge security services, WAF rule design, DDoS protection, and origin protection. After it you will be able to design and troubleshoot a layered edge defense for an internet-facing workload.

---

## Core Concepts

### CloudFront as a Security Boundary

**Amazon CloudFront** is a CDN, but for security it functions as a **protective front door**: clients connect to CloudFront at the edge, and CloudFront connects to your origin (S3, ALB, or custom). This indirection is itself a control — the origin need not be publicly reachable. Key security features: **Origin Access Control (OAC)** restricts an S3 origin so it can *only* be reached through CloudFront (not directly), enforced by a bucket policy; **field-level encryption** encrypts sensitive form fields at the edge so only specific downstream services can decrypt them; **signed URLs and signed cookies** restrict content access to authorized users; **HTTPS enforcement** and modern TLS policies secure data in transit; and **response headers policies** add security headers (HSTS, X-Content-Type-Options, Content-Security-Policy) to every response. CloudFront also integrates **WAF** and **Shield** at the edge. The exam expects you to use CloudFront to keep origins private and to enforce encryption and access controls at the perimeter.

### AWS WAF — Layer 7 Filtering

**AWS WAF** inspects HTTP(S) requests and allows, blocks, counts, or challenges them based on rules, protecting against the **OWASP Top 10** web threats — SQL injection, cross-site scripting, and more. WAF is organized into **web ACLs** containing **rules** and **rule groups**. The rule types the exam tests: **AWS Managed Rule Groups** (pre-built protections for common threats, including a Core rule set, SQLi, known-bad-inputs, and bot control), **rate-based rules** (block source IPs exceeding a request threshold — the primary defense against HTTP floods and brute force), **IP set / geo-match rules** (allow/deny by IP or country for **geographic restrictions**), and **custom rules** matching request components (URI, headers, body, query string) with conditions. WAF can be attached to **CloudFront** (global edge protection), **Application Load Balancers**, **API Gateway**, **AppSync**, and **Cognito user pools**. The exam often asks which threat maps to which rule: SQLi/XSS → managed rule groups; HTTP flood/brute force → rate-based; block a country → geo-match; bots → Bot Control.

### Advanced WAF Capabilities

Beyond basic rules, the specialty exam references **client fingerprinting** and finer controls: **token-based bot mitigation** (CAPTCHA and challenge actions, AWS WAF Bot Control, and Fraud Control/Account Takeover Prevention) distinguishes humans from automated abuse; **rate-based rules** can key on more than IP (e.g., a header or label) for precise throttling; and **labels** let one rule's match inform another's decision. WAF logs (to S3, CloudWatch Logs, or Firehose) feed the detection pipeline. The exam expects you to design rules for nuanced abuse — rate-limit by client characteristics, challenge suspected bots, and protect login endpoints from credential stuffing.

### Shield and Shield Advanced — DDoS Protection

**AWS Shield Standard** is automatic and free, protecting all AWS customers against common network and transport layer (Layer 3/4) DDoS attacks. **AWS Shield Advanced** is the paid tier for internet-facing resources (CloudFront, ALB, Route 53, Global Accelerator, Elastic IPs) and adds: enhanced detection and automatic **application-layer (Layer 7) mitigation**, **24/7 access to the Shield Response Team (SRT)**, **cost protection** (credits for scaling charges caused by an attack), real-time attack visibility, and integration with WAF for automatic rule deployment during attacks. The exam pairs DDoS scenarios with Shield Advanced, and expects you to know it's *configured in advance* on the resources to protect. For Layer 7 floods specifically, Shield Advanced works alongside WAF rate-based rules.

### Origin and Cross-Origin Protections

Two more edge controls appear on the exam. **S3 Cross-Origin Resource Sharing (CORS)** controls which web origins (domains) a browser may use to load resources from a bucket — a misconfigured permissive CORS policy can expose data to unintended sites, so CORS is both a functionality and a security setting. **Origin protection** more broadly means ensuring the origin only accepts traffic from CloudFront — via OAC for S3, and for custom/ALB origins by restricting security groups to CloudFront's IP ranges (or using a shared secret header WAF verifies), so attackers can't bypass the edge and hit the origin directly. The exam tests recognizing that an edge defense is only effective if the origin can't be reached around it.

### CloudFront Geo-Restriction vs. WAF Geo-Match

A subtle exam distinction: there are two ways to restrict access by country, and they operate differently. **CloudFront geographic restrictions** (geo-blocking) are a built-in CloudFront feature that allows or blocks viewers by country at the distribution level — simple, but coarse and CloudFront-only. **AWS WAF geo-match rules** also block by country but live in a web ACL alongside all your other rules, so they can be combined with rate limiting, IP sets, and conditions for fine-grained logic (e.g., "block this country *unless* the request carries a valid token"), and they apply wherever the web ACL is attached (CloudFront, ALB, API Gateway). The exam expects you to choose WAF geo-match when geographic control must be combined with other conditions or applied to non-CloudFront resources, and CloudFront's native geo-restriction for a simple, distribution-wide country block. Recognizing that the same outcome has two mechanisms with different flexibility is the kind of nuance the specialty exam rewards.

### Integrations and OCSF

Task 3.1 mentions integrating with third-party services and ingesting data in **OCSF** format, and using third-party WAF rules. WAF supports **AWS Marketplace managed rule groups** from security vendors, and edge logs can flow into Security Lake (OCSF) for unified analysis. The exam expects awareness that edge protection integrates with the broader detection ecosystem and third-party rule sets, not that you memorize specific vendors.

---

## Configuration Reference

Layered edge defense:

```text
Client ─► CloudFront (TLS, OAC, signed URLs, security headers)
            └─ AWS WAF web ACL (managed rules, rate-based, geo, bot control)
            └─ AWS Shield Advanced (L3/4 + L7 DDoS auto-mitigation, SRT)
          ─► Origin (S3 via OAC only, or ALB restricted to CloudFront)
WAF/CloudFront logs ─► S3/Security Lake (OCSF) for analysis
```

Threat → WAF control:

```text
SQL injection / XSS              AWS Managed Rule Groups (Core, SQLi, known-bad-inputs)
HTTP flood / brute force          Rate-based rules
Block/allow by country            Geo-match rules
Block/allow specific IPs          IP set rules
Bots / scrapers / credential stuffing  WAF Bot Control / CAPTCHA / Fraud Control
Custom app-specific patterns      Custom rules (URI/header/body match + conditions)
```

WAF attachment points:

```text
CloudFront  → global edge protection
ALB         → regional protection for app traffic
API Gateway → protect REST/HTTP APIs
AppSync / Cognito user pools → GraphQL / auth protection
```

Origin protection:

```text
S3 origin    → Origin Access Control (bucket policy allows only CloudFront)
ALB/custom   → security group limited to CloudFront ranges or WAF-verified secret header
```

---

## How to Decide

- **Keep an S3 origin private behind the CDN?** → CloudFront + Origin Access Control.
- **Block SQLi/XSS and common exploits?** → WAF AWS Managed Rule Groups.
- **Stop an HTTP flood or brute force?** → WAF rate-based rules (with Shield Advanced for DDoS).
- **Restrict by country/IP?** → WAF geo-match / IP set rules.
- **Mitigate bots / credential stuffing?** → WAF Bot Control / CAPTCHA / Fraud Control.
- **Protect against volumetric/L7 DDoS with expert support and cost protection?** → Shield Advanced (configured in advance).
- **Ensure attackers can't bypass the edge?** → lock the origin to CloudFront only.

---

## How This Connects

This lesson builds on the SAA-level WAF/Shield/CloudFront introductions and takes them to specialty rule-design depth. It connects to the network controls lesson (defense layers continue inward), to Incident Response (Shield Advanced preparation, WAF rule deployment during attacks), to Detection (WAF/CloudFront logs feed the pipeline and Security Lake), and to Data Protection (TLS/field-level encryption at the edge).

---

## Exam Traps

- **Edge defense with a reachable origin.** WAF/CloudFront are bypassable if the origin accepts direct traffic — lock the origin (OAC, security groups, secret header).
- **Wrong WAF rule for the threat.** SQLi/XSS → managed rule groups; floods → rate-based; country blocking → geo-match. Don't conflate.
- **Expecting Shield Standard to stop L7 floods.** Standard covers common L3/4; application-layer DDoS mitigation and SRT come with Shield Advanced.
- **WAF on the wrong resource.** WAF on CloudFront protects globally at the edge; on an ALB it protects that Region — match scope to need.
- **Permissive S3 CORS.** Overly broad CORS exposes bucket data to unintended web origins.
- **Configuring Shield Advanced after an attack.** It must be set up in advance to auto-mitigate.

---

## Summary

Edge security stops attacks at the perimeter, far from the origin. CloudFront acts as a protective front door — keeping origins private via Origin Access Control, enforcing TLS and security headers, and integrating WAF and Shield. AWS WAF filters Layer 7 traffic with managed rule groups (SQLi/XSS and common exploits), rate-based rules (HTTP floods and brute force), geo/IP rules (geographic restrictions), and bot/fraud controls (credential stuffing and scrapers), attachable to CloudFront, ALB, API Gateway, AppSync, and Cognito. Shield Standard auto-protects against common L3/4 DDoS, while Shield Advanced adds L7 mitigation, the Shield Response Team, and cost protection for internet-facing resources and must be configured in advance. Crucially, an edge defense only works if the origin can't be reached around it — lock origins to CloudFront. Match each control to the anticipated threat, and feed edge logs into the detection pipeline.

---

## Examples

**Example 1 — Private origin.** A static site on S3 must be reachable only through the CDN → CloudFront with **Origin Access Control** and a bucket policy allowing only CloudFront.

**Example 2 — Login protection.** A login API suffers credential stuffing → WAF **rate-based rules** plus **Bot Control / Account Takeover Prevention**, with Shield Advanced for any DDoS component.

**Example 3 — Geo restriction.** Compliance requires blocking traffic from specific countries → WAF **geo-match** rules on the CloudFront web ACL.

**Example 4 — DDoS readiness.** A high-profile launch needs DDoS protection and expert support → **Shield Advanced** on CloudFront/ALB configured before launch, with WAF rate rules.

---

## Think About It

A team puts AWS WAF on their Application Load Balancer and is confused when attackers still reach the application directly and a volumetric attack overwhelms it. Explain two distinct gaps in this design (origin exposure and DDoS scope), and redesign the edge so malicious traffic is filtered globally, the origin can't be bypassed, and volumetric/L7 DDoS is auto-mitigated.

---

## Quick Check

1. How does Origin Access Control protect an S3 origin behind CloudFront?
2. Which WAF rule type defends against HTTP floods and brute force, and which blocks by country?
3. What does Shield Advanced add over Shield Standard?
4. Why is an edge defense ineffective if the origin accepts direct traffic?

*Answers: (1) it ensures the S3 bucket can only be accessed through CloudFront (enforced by a bucket policy), so the origin isn't directly reachable; (2) rate-based rules defend against floods/brute force, geo-match rules block/allow by country; (3) enhanced detection and automatic Layer 7 DDoS mitigation, 24/7 Shield Response Team access, cost protection for attack-driven scaling, and WAF integration — for internet-facing resources, configured in advance; (4) attackers can bypass WAF/CloudFront and hit the origin directly, so the origin must be locked to CloudFront (OAC, restricted security groups, or a WAF-verified secret header).*

---

## What's Next

Next: **Securing Compute Workloads** — hardened images, vulnerability scanning with Inspector, patching, secure administrative access, and protecting workloads (including GenAI) without exposing them.
