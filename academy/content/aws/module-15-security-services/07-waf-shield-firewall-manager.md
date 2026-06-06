---
title: "WAF, Shield Advanced, and Firewall Manager"
type: content
estimated_minutes: 13
cert_tags: ["SAA-C03", "SAP-C02"]
---

# WAF, Shield Advanced, and Firewall Manager

## Overview

Encryption, access control, and threat detection protect what's inside your AWS environment. WAF, Shield, and Firewall Manager protect the perimeter — the boundary between your applications and the internet. AWS WAF filters HTTP/HTTPS requests at Layer 7 before they reach your application, blocking SQL injection, cross-site scripting, bot traffic, and other application-layer attacks. AWS Shield defends against Distributed Denial of Service (DDoS) attacks at both the network and application layers. AWS Firewall Manager ties both together, enforcing consistent WAF and Shield policies across every account in an AWS Organization.

The design principle unifying all three is that perimeter security must be layered and centrally managed. A WAF rule attached to a CloudFront distribution protects your global edge; a second WAF on the ALB catches traffic that bypasses CloudFront; security groups restrict what reaches EC2. An organization with 50 AWS accounts cannot manually configure WAF on every ALB in every account — Firewall Manager makes that policy apply automatically to every matching resource, existing and future.

For the SAA exam, understand WAF rule types and managed rule groups, the difference between Shield Standard and Shield Advanced, and what Firewall Manager requires to function. The SAP exam tests WAF web ACL design, Shield Advanced SRT engagement, Firewall Manager policy scoping, and the full defense-in-depth architecture from edge to data tier. After this lesson you will be able to design a complete perimeter security architecture for a multi-account internet-facing application.

---

## Core Concepts

### AWS WAF

AWS WAF is a web application firewall that inspects HTTP/HTTPS requests and applies rules to allow, block, or count them. WAF can be attached to **CloudFront distributions**, **Application Load Balancers**, **API Gateway stages**, and **AppSync GraphQL APIs**. Requests are evaluated before they reach the associated resource.

A **Web ACL** (web access control list) is the WAF resource — it contains an ordered list of rules and rule groups. Rules are evaluated in priority order; the first matching rule's action applies. A default action (Allow or Block) applies if no rule matches.

**Rule types:**
- **IP set rules**: allow or block specific IP addresses or CIDR ranges
- **Geo-match rules**: allow or block requests based on the country of origin
- **Rate-based rules**: automatically block any IP that exceeds a request count within a 5-minute window — the primary WAF mechanism for stopping volumetric application-layer DDoS
- **String match rules**: inspect specific request components (URI path, header values, query strings, body) for specific strings or regex patterns
- **SQL injection and XSS rules**: detect and block common injection attacks in request fields

**AWS Managed Rule Groups** are pre-built, continuously updated rule sets maintained by AWS and AWS marketplace partners. The most important: `AWSManagedRulesCommonRuleSet` (OWASP Top 10 threats), `AWSManagedRulesSQLiRuleSet` (SQL injection), `AWSManagedRulesBotControlRuleSet` (bot detection and mitigation), and `AWSManagedRulesAmazonIpReputationList` (known malicious IPs). Using managed rules eliminates the need to write and maintain individual rule definitions for common attack patterns.

WAF **Count mode** allows a rule to log matches without blocking — essential for testing a new rule in production before switching to Block. Run a new managed rule group in Count mode for a week, review the sampled requests, verify no legitimate traffic matches, then switch to Block.

---

### AWS Shield

**Shield Standard** is automatic and free. It provides always-on protection against the most common volumetric DDoS attacks at Layer 3 (network) and Layer 4 (transport) — UDP reflection, SYN floods, and similar attacks that target bandwidth and connection state. Every AWS customer gets Shield Standard for CloudFront, Route 53, Global Accelerator, Elastic IPs, and ALBs with no configuration required.

**Shield Advanced** ($3,000/month per organization, not per account) adds significant capabilities for high-value internet-facing applications:

- **Layer 7 DDoS detection and automatic mitigation**: Shield Advanced analyzes HTTP request patterns for application-layer DDoS signatures and automatically deploys WAF rate-based rules on associated resources during an attack.
- **Shield Response Team (SRT)**: 24/7 access to AWS DDoS specialists who monitor protected resources during attacks, implement custom mitigations, and escalate within AWS infrastructure.
- **DDoS cost protection**: AWS credits the cost of EC2, CloudFront, and ELB scaling triggered by a DDoS attack — preventing a "bill shock" scenario where an attack causes an organization to receive a six-figure AWS invoice.
- **Enhanced visibility**: real-time attack metrics, attack history, and diagnostics in the Shield Advanced console, accessible during and after an attack.
- **Proactive engagement**: SRT proactively contacts you when attack activity is detected, rather than waiting for you to open a support case.

Shield Advanced requires associating specific resources (CloudFront distributions, EIPs, ALBs, Route 53 hosted zones) with the subscription. Only associated resources receive the advanced protections.

---

### AWS Firewall Manager

Firewall Manager is a centralized policy management service for WAF Web ACLs, Shield Advanced protections, Security Group policies, Network Firewall policies, and Route 53 DNS Firewall rule groups across an AWS Organization. Define a policy once — Firewall Manager applies and maintains it across all matching accounts and resources automatically.

A Firewall Manager **policy** specifies: the policy type (WAF, Shield, Security Group, etc.), the scope (which accounts, OUs, or resource tags it applies to), the policy rules (which Web ACL or Shield protection to apply), and whether to auto-remediate non-compliant resources.

The critical use case: a central security team creates a WAF policy requiring that all ALBs in production accounts have `AWSManagedRulesCommonRuleSet` attached. Firewall Manager applies the Web ACL to every existing ALB in scope, and automatically applies it to any new ALB created in the future. The security team has one policy to maintain; compliance is enforced without any action from individual account teams.

**Prerequisites**: Firewall Manager requires AWS Organizations (for account-level scope), AWS Config (for resource tracking and compliance evaluation), and a Firewall Manager administrator account designated in the management account.

---

### Defense-in-Depth Perimeter Architecture

The standard layered architecture for an internet-facing application on AWS:

**Route 53** → **CloudFront (WAF + Shield Advanced)** → **ALB (WAF + Security Group)** → **EC2/ECS (Security Group, IMDSv2)** → **Data tier (private subnet, KMS encryption, Security Group)**

Each layer adds an independent security control:
- Route 53 provides anycast DDoS resilience and health-check-based failover
- CloudFront's WAF blocks application-layer attacks at the edge before they reach your origin, and Shield Advanced provides L7 DDoS mitigation
- ALB's WAF catches any traffic that bypasses CloudFront (direct access to the ALB DNS name) and provides an additional inspection layer
- Security groups restrict traffic to only expected protocols and ports at every tier
- The data tier is in a private subnet with no internet route, accessible only from the application tier

---

## Configuration Referenc