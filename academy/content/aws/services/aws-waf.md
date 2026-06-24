---
title: "AWS WAF"
type: content
estimated_minutes: 19
cert_tags: ["SCS-C03", "SOA-C03", "SAA-C03", "CLF-C02"]
---

# AWS WAF

## Overview

AWS WAF is a **web application firewall** that protects your HTTP and HTTPS applications from common web exploits and unwanted traffic at the application layer (Layer 7). It inspects incoming web requests and lets you allow, block, count, or challenge them based on conditions you define — IP address, geography, request content, known attack signatures, request rate, and bot behavior. This is a *service reference* lesson covering what WAF protects, how web ACLs and rules work, the managed protections AWS provides, how to operate and log it, and what each certification expects.

WAF matters because the network firewalls you configure with security groups and NACLs operate at Layers 3 and 4 — they reason about IP addresses and ports, not about the *content* of an HTTP request. A SQL injection string or a cross-site scripting payload sails right through a security group that allows port 443. WAF fills that gap: it understands HTTP, so it can inspect URIs, headers, query strings, and request bodies and block the malicious ones while letting legitimate traffic through. It is the L7 complement to L3/L4 controls and to Shield's DDoS protection.

The central object in WAF is the **web ACL** (web access control list). You create a web ACL, fill it with **rules**, and **associate** it with a supported resource. From then on, every request to that resource is evaluated against the web ACL before it reaches your application.

---

## How It Works

A **web ACL** contains an ordered set of **rules**, each with a **statement** (the condition to match) and an **action** (what to do on a match). The supported actions are:

- **Allow** — let the request through.
- **Block** — reject the request (you can customize the response).
- **Count** — do not block, just tally matches (used for testing a rule before enforcing it).
- **CAPTCHA / Challenge** — interpose a CAPTCHA puzzle or a silent browser challenge to verify the client is a real browser/human, blocking automated clients.

Rule statements can match on a wide range of request attributes: source **IP address** (via IP sets), **geographic** origin, specific **headers**, **URI path**, **query string**, **body**, and **size constraints**. WAF also offers built-in detection for **SQL injection** and **cross-site scripting (XSS)** patterns, and **rate-based rules** that count requests from a source over a time window and act when a threshold is exceeded — the primary tool for mitigating Layer 7 HTTP floods.

Rules are evaluated in priority order, and a **default action** (allow or block) applies to requests that match no rule. Each web ACL has a capacity budget measured in **Web ACL Capacity Units (WCU)**, which bounds how many and how complex its rules can be.

---

## Key Features

- **AWS Managed Rules.** Prebuilt, AWS-maintained rule groups covering broad threat classes — a **Core rule set** aligned to common OWASP risks, **Known Bad Inputs**, **SQL database**, **Linux/POSIX**, **PHP**, **WordPress**, and more. These let you adopt strong protection without hand-writing signatures, and AWS keeps them current.
- **Bot Control.** A managed rule group that identifies and manages bot traffic (verified bots, common bots, targeted bots), so you can block scrapers and abusive automation while allowing good bots.
- **Fraud Control — Account Takeover Prevention (ATP) and Account Creation Fraud Prevention (ACFP).** Managed protections for login and sign-up endpoints that detect credential stuffing and fake-account creation.
- **Rate-based rules.** Throttle or block sources that exceed a request-rate threshold — the L7 flood mitigation lever.
- **CAPTCHA and Challenge actions.** Verify human/browser legitimacy inline.
- **Labels.** Rules can attach labels to requests that later rules evaluate, enabling layered logic within a web ACL.

---

## Configuration Reference

- **Associatable resources.** A web ACL can be associated with **Amazon CloudFront**, **Application Load Balancer**, **Amazon API Gateway** REST APIs, **AWS AppSync** GraphQL APIs, **Amazon Cognito** user pools, **AWS App Runner**, and **AWS Verified Access**. The associated resource determines scope (below).
- **Scope.** When protecting **CloudFront**, the web ACL is **global** and is created in the `us-east-1` Region. When protecting regional resources (ALB, API Gateway), the web ACL is **regional** and must be in the same Region as the resource. This global-vs-regional distinction is a frequent exam detail.
- **Rule ordering and Count mode.** Add new rules in **Count** mode first to observe their impact, then switch to Block once you have confirmed they do not catch legitimate traffic.
- **IP sets and regex pattern sets** are reusable match components referenced by rules.

---

## Operations and Troubleshooting

- **Logging.** WAF can log every inspected request (with the matching rule and action) to **Amazon CloudWatch Logs**, **Amazon S3**, or **Amazon Kinesis Data Firehose**. Logs are essential for tuning rules and investigating incidents, and fields can be redacted to avoid storing sensitive data.
- **Metrics.** WAF emits CloudWatch metrics per rule (allowed, blocked, counted, CAPTCHA), so you can alarm on spikes.
- **A legitimate request is being blocked (false positive).** Identify the offending rule from the logs/metrics, and either tune it, add a scoped exception, or move it to Count while you investigate. Managed rule groups let you exclude or override specific rules within them.
- **An attack is getting through.** Confirm the web ACL is actually associated with the resource, that the relevant managed rule groups are enabled and in Block (not Count) mode, and that rule priority is not letting an earlier Allow rule short-circuit evaluation.
- **Capacity errors.** If you cannot add a rule, you may be hitting the WCU budget; simplify or consolidate rules.

---

## Integrations

AWS WAF is part of the AWS edge-protection stack. It pairs with **AWS Shield** (Standard, automatic L3/L4 DDoS protection for all customers; **Advanced** for enhanced DDoS protection, cost protection, and access to the Shield Response Team) and with **Amazon CloudFront** at the edge for the strongest perimeter. **AWS Firewall Manager** centrally deploys and enforces WAF rules (web ACLs) across many accounts and resources in an organization, ensuring consistent protection and preventing resources from being left unprotected. WAF logs commonly flow to **CloudWatch Logs**, **S3**, or **Kinesis Data Firehose**, and findings/metrics can feed broader monitoring. A clean mental model: security groups/NACLs handle L3/L4, Shield handles DDoS, and **WAF handles L7 application-layer attacks** — together they form defense in depth at the edge.

---

## Pricing and Cost Considerations

AWS WAF pricing is usage-based with three main components: a monthly charge **per web ACL**, a monthly charge **per rule** in a web ACL, and a charge **per million requests** inspected. Managed rule groups that include advanced intelligence — notably **Bot Control** and **Fraud Control (ATP/ACFP)** — carry additional fees beyond the base request charge. The cost levers are therefore the number of web ACLs and rules you maintain and your request volume, plus whether you enable the premium managed protections. Logging to S3/Firehose/CloudWatch incurs that destination's normal storage/ingest cost. Exact per-unit prices vary by Region and over time; reason about cost as "per web ACL + per rule + per million requests, plus premium managed groups."

---

## Exam Relevance

**CLF-C02:** Recognize AWS WAF as the service that protects web applications from common exploits (like SQL injection and XSS) at Layer 7, and that it works with CloudFront, ALB, and API Gateway. Foundational: WAF = web/L7 protection, distinct from Shield (DDoS) and security groups (L3/L4).

**SAA-C03:** Know how to place WAF in front of CloudFront, ALB, or API Gateway; use managed rule groups and rate-based rules; and combine WAF with Shield and CloudFront for edge defense in depth. Architecture-level.

**SOA-C03:** Operate it — enable logging to CloudWatch/S3/Firehose, alarm on blocked-request metrics, tune managed rules using Count mode, and deploy consistently. Operations depth.

**SCS-C03:** Deepest. Know the full set of associatable resources and the global (CloudFront/us-east-1) vs. regional scope; rule actions including CAPTCHA/Challenge; managed rule groups, Bot Control, and Fraud Control; rate-based rules for L7 floods; WCU limits; logging and field redaction; and org-wide enforcement via Firewall Manager. Expect scenarios about protecting an application from OWASP-class attacks, bots, or credential stuffing, and enforcing WAF across an organization.

---

## Summary

AWS WAF is a Layer 7 web application firewall that inspects HTTP/HTTPS requests against a web ACL of rules and allows, blocks, counts, or challenges them. Rules match on IP, geography, content, SQLi/XSS signatures, request rate, and bot behavior, with AWS Managed Rules, Bot Control, and Fraud Control providing maintained protection. Web ACLs attach to CloudFront (global, us-east-1), ALB, API Gateway, AppSync, Cognito, App Runner, and Verified Access, with logging to CloudWatch/S3/Firehose. WAF pairs with Shield (DDoS) and CloudFront at the edge and is enforced org-wide via Firewall Manager. The defining idea: WAF understands the *content* of web requests, which is exactly what L3/L4 controls cannot do.

---

## Quick Check

1. Why can a security group not stop a SQL injection attack, and how does WAF address that gap?
2. What are the four core actions a WAF rule can take on a matching request, and what is Count mode used for?
3. When protecting a CloudFront distribution, in which Region/scope must the web ACL be created, and how does that differ for an ALB?
4. Which WAF feature is the primary tool for mitigating a Layer 7 HTTP flood?
5. How do you enforce a consistent WAF configuration across every account in an organization?

---

## What's Next

Pair this with the SCS-C03 edge-security lesson (CloudFront, WAF, Shield Advanced) and, for org-wide enforcement, the multi-account governance lessons covering Firewall Manager. In the SOA-C03 path, this supports operational monitoring and network operations.
