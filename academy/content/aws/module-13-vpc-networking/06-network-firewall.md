---
title: "AWS Network Firewall and Traffic Inspection"
type: content
estimated_minutes: 8
cert_tags: ["SAA-C03", "SAP-C02"]
---

# AWS Network Firewall and Traffic Inspection

## Overview

AWS Network Firewall is a stateful, managed network firewall and intrusion prevention system (IPS) for VPCs. It provides deeper traffic inspection than security groups or NACLs — domain-based filtering, protocol inspection, and Suricata-compatible IPS rules. This lesson covers Network Firewall architecture and complementary network security tools.

## Network Firewall vs. Security Groups

Security groups are instance-level allow/deny for specific ports and CIDRs. They cannot inspect traffic content, filter by domain name, or detect exploits. AWS Network Firewall provides stateful packet inspection, domain name filtering (allow/deny HTTP/HTTPS to specific FQDNs), protocol detection, and Suricata-compatible IPS signatures for known attack patterns. Place Network Firewall at the VPC edge (in dedicated firewall subnets) and route all ingress/egress traffic through it.

## Firewall Architecture

A common deployment: dedicated Firewall subnets in each AZ → Network Firewall endpoints → Internet Gateway. Route table on internet-facing subnets routes outbound traffic to the firewall endpoint; route table on the IGW routes inbound traffic to the firewall. This creates a perimeter inspection zone. Alternatively, centralize the Network Firewall in a shared services VPC and route all spoke VPC traffic through it via Transit Gateway.

## AWS WAF

AWS WAF (Web Application Firewall) operates at Layer 7 and protects HTTP/HTTPS applications on ALB, CloudFront, API Gateway, and AppSync. WAF rules can block SQL injection, XSS, known bad IPs (IP reputation lists), geographic blocking, and custom conditions. AWS Managed Rules provide pre-built rule groups maintained by AWS (e.g., AWSManagedRulesCommonRuleSet). WAF and Network Firewall are complementary — WAF for application-layer web traffic, Network Firewall for network-layer inspection.

## AWS Shield

AWS Shield Standard is automatically applied to all AWS resources, protecting against volumetric DDoS attacks (L3/L4). Shield Advanced is a paid subscription providing enhanced DDoS protection, DDoS cost protection (billing credits for scaling triggered by a DDoS attack), 24/7 access to the AWS Shield Response Team (SRT), and enhanced dashboards. Use Shield Advanced for internet-facing applications with high DDoS risk (gaming, media, financial services).

## Summary

AWS Network Firewall provides stateful packet inspection and IPS at the VPC edge. WAF handles Layer 7 web application attacks on ALB and CloudFront. Shield Standard protects all resources automatically; Shield Advanced adds managed DDoS response. Combine these tools in a defense-in-depth model: Shield at the edge, WAF on HTTP endpoints, Network Firewall for network-layer inspection.

## What's Next

Next up: the Module 13 Canvas Lab — build a multi-subnet VPC with NAT and routing.