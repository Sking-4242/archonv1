---
title: "WAF, Shield Advanced, and Firewall Manager"
type: content
estimated_minutes: 8
cert_tags: ["SAA-C03", "SAP-C02", "SCS-C02"]
---

# WAF, Shield Advanced, and Firewall Manager

## Overview

The outer perimeter of AWS security includes web application firewalling, DDoS protection, and centralized firewall management. This lesson covers AWS WAF in depth, Shield Advanced, and Firewall Manager for managing security policies at organization scale.

## AWS WAF Rule Groups and Managed Rules

WAF rules evaluate HTTP/HTTPS requests before they reach your application (ALB, CloudFront, API Gateway, AppSync). Rules can inspect any part of the request: URI, headers, body, query strings, IP, geolocation. Rule actions: Allow, Block, Count (for testing). AWS Managed Rule Groups are pre-built, AWS-maintained sets for common threats: AWSManagedRulesCommonRuleSet (OWASP Top 10), AWSManagedRulesSQLiRuleSet, AWSManagedRulesBotControlRuleSet. Rate-based rules automatically block IPs exceeding a request rate threshold (DDoS mitigation at the application layer).

## Shield Advanced

Shield Standard (automatic, free) protects against volumetric L3/L4 DDoS attacks. Shield Advanced ($3,000/month per organization) adds: L7 application-layer DDoS protection with WAF integration, DDoS cost protection (credits for scaling costs during attacks), enhanced visibility and diagnostics, access to the Shield Response Team (SRT) 24/7 for attack mitigation, and automatic application layer DDoS mitigation for protected resources. Use Shield Advanced for high-profile internet-facing applications.

## AWS Firewall Manager

Firewall Manager is a central management service for WAF, Shield Advanced, Security Groups, Network Firewall, and Route 53 DNS Firewall policies across all accounts in an AWS Organization. Define a policy once (e.g., 'all ALBs in production accounts must have WAF with the Common Rule Set') and Firewall Manager automatically applies and maintains it. Non-compliant resources are flagged or auto-remediated. Requires AWS Organizations and Config to be enabled.

## Architecture Pattern: Edge to Core

Defense in depth for a web application: Route 53 (DDoS resistant, health checks) → CloudFront (WAF + Shield Advanced, caching) → ALB (WAF for any traffic not via CloudFront, Security Group) → EC2/ECS (Security Group, IMDSv2, Inspector) → Data tier (Security Group, KMS encryption, private subnet). Each layer adds a security control that an attacker must defeat independently.

## Summary

WAF provides L7 application-layer filtering with managed rule groups for OWASP and bot protection. Shield Advanced adds managed DDoS response and cost protection. Firewall Manager centralizes WAF, Shield, and security group policies across the organization. The defense-in-depth pattern — CloudFront WAF → ALB WAF → Security Groups → encryption — is the standard perimeter architecture.

## Examples

A news media organization publishes breaking stories that occasionally go viral, attracting automated scraping bots that generate 10x normal traffic volume within minutes of publication. They attach the `AWSManagedRulesBotControlRuleSet` WAF rule group to their CloudFront distribution. Bot Control identifies and blocks scrapers using browser fingerprinting and behavioral analysis, reducing bot traffic by over 80% before it ever reaches their origin. They also add a rate-based rule that blocks any single IP sending more than 2,000 requests per 5 minutes — catching unsophisticated volumetric abuse that bot control misses.

An online gaming platform with 5 million players faces a targeted DDoS attack during a major tournament. Attackers flood the platform's UDP game servers with 400 Gbps of amplification traffic. Because the company subscribed to Shield Advanced, the Shield Response Team (SRT) proactively contacts them at attack onset, implements custom mitigations at the AWS edge within 15 minutes, and the cost of the auto-scaling triggered by the attack is later credited back under Shield Advanced's DDoS cost protection. Without Shield Advanced, the platform would have faced both downtime and a six-figure AWS bill from the scaling event.

A large enterprise runs 35 AWS accounts across three business units, each with dozens of ALBs and CloudFront distributions. The central security team must ensure every public-facing endpoint has the OWASP Common Rule Set enabled — but manually configuring WAF on 200+ resources across 35 accounts is untenable. They use Firewall Manager with a single WAF policy specifying `AWSManagedRulesCommonRuleSet`, scoped to all ALBs in accounts tagged `BU=retail` or `BU=wholesale`. Firewall Manager automatically applies the policy to existing and future ALBs matching that scope, and flags any resource out of compliance in Security Hub.

## Think About It

1. WAF rate-based rules block IPs that exceed a request threshold. What legitimate use cases could be broken by a rate-based rule, and how would you configure the rule to avoid blocking real users while still stopping attackers?
2. Shield Standard is free and automatic. Shield Advanced costs $3,000/month per organization. What specific business characteristics would justify paying for Shield Advanced, beyond just "we want more protection"?
3. The defense-in-depth pattern described in this lesson layers WAF at CloudFront, then again at the ALB. Under what circumstances would you put WAF at both layers rather than just at CloudFront? What does the ALB-level WAF catch that CloudFront-level WAF might miss?
4. Firewall Manager can auto-remediate non-compliant resources by attaching the correct WAF web ACL. What risks could arise from automatic remediation in production, and how would you mitigate them while still maintaining centralized enforcement?
5. A new OWASP vulnerability is discovered that is not yet covered by the `AWSManagedRulesCommonRuleSet`. What options do you have in WAF to provide interim protection before AWS updates the managed rule group?

## Quick Check

**Q1.** Which AWS WAF feature automatically blocks IP addresses that exceed a defined request rate threshold?

- A) Geo-match rule
- B) IP set rule
- C) Rate-based rule
- D) Regex pattern set rule

**Answer: C** — Rate-based rules track request counts per IP over a 5-minute window and automatically block any IP that exceeds the configured threshold, providing L7 DDoS mitigation.

**Q2.** What does Shield Advanced provide that Shield Standard does not? (Choose the best answer)

- A) L3/L4 DDoS protection for CloudFront and Route 53
- B) Access to the Shield Response Team, DDoS cost protection, and application-layer attack mitigation with WAF integration
- C) Free WAF web ACLs on all protected resources
- D) Automatic geo-blocking of all traffic from countries associated with attack sources

**Answer: B** — Shield Standard covers basic volumetric DDoS at no cost; Shield Advanced adds 24/7 SRT access, financial cost protection for scaling events caused by attacks, and integrated L7 mitigation via WAF.

**Q3.** Which prerequisites must be in place before AWS Firewall Manager can manage WAF policies across an Organization?

- A) GuardDuty and Inspector must be enabled in the management account
- B) AWS Organizations must be configured and AWS Config must be enabled in all member accounts
- C) Shield Advanced must be subscribed to in every member account
- D) VPC Flow Logs must be enabled and sent to a centralized S3 bucket

**Answer: B** — Firewall Manager requires AWS Organizations for account-level policy scope and AWS Config for resource tracking and compliance evaluation; neither GuardDuty nor Shield Advanced is a prerequisite.

## What's Next

Next up: the Module 15 Canvas Labs — review mode labs where you find and fix security gaps.