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

## What's Next

Next up: the Module 15 Canvas Labs — review mode labs where you find and fix security gaps.