---
title: "Security Groups and Network ACLs"
type: content
estimated_minutes: 10
cert_tags: ["SAA-C03", "SAP-C02", "CLF-C02"]
---

# Security Groups and Network ACLs

## Overview

VPC has two distinct security mechanisms: Security Groups (stateful, instance-level firewall) and Network ACLs (stateless, subnet-level firewall). Both are used in layered defense-in-depth architectures. Understanding the behavioral differences is critical — and a consistent exam topic.

## Security Groups

Security groups are virtual firewalls attached to ENIs (Elastic Network Interfaces — attached to EC2, RDS, Lambda, etc.). They are stateful: if you allow inbound traffic, the return traffic is automatically allowed regardless of outbound rules. Security groups have no Deny rules — traffic not explicitly allowed is implicitly denied. You can reference other security groups as sources (e.g., allow port 5432 from the 'app-sg' security group) instead of IP ranges — this is the recommended approach for internal traffic.

## Security Group Chaining

A common layered security pattern: ALB Security Group allows 443 from 0.0.0.0/0. App Security Group allows 8080 from ALB-SG. DB Security Group allows 5432 from App-SG. Each layer only accepts traffic from the preceding layer's security group — no IP ranges to maintain. This chain remains correct even as instance IPs change.

## Network ACLs

NACLs operate at the subnet level and evaluate all traffic entering or leaving a subnet. They are stateless: you must create both inbound and outbound rules for each communication direction. Rules are numbered and evaluated in ascending order; the first match wins. Unlike security groups, NACLs support both Allow and Deny rules — useful for explicitly blocking specific IP ranges. Each subnet is associated with exactly one NACL; the default NACL allows all traffic.

## SG vs. NACL Comparison

Security Groups: stateful, instance-level, only allow rules, evaluates all rules. NACLs: stateless, subnet-level, allow and deny rules, rules evaluated in number order with first match. Use security groups for most controls (they're easier to manage and stateful). Use NACLs as an additional layer to block specific CIDRs, for compliance segmentation, or to deny traffic before it reaches instances. NACLs are coarser; SGs are more precise.

## VPC Flow Logs

VPC Flow Logs capture network traffic metadata (source/dest IP, ports, protocol, bytes, action ACCEPT/REJECT) for VPC, subnet, or ENI level. Published to CloudWatch Logs or S3. Use for network troubleshooting (why is traffic being rejected?), security forensics, and billing analysis of cross-AZ data transfer. Flow Logs do not capture payload content — just metadata. Not real-time: there's a 10–15 minute delay.

## Summary

Security groups are stateful instance-level allow-lists; NACLs are stateless subnet-level rule lists with explicit deny support. Chain security groups for layered micro-segmentation. Add NACLs for CIDR-level blocking at the subnet boundary. Enable VPC Flow Logs for traffic visibility and forensics. These two controls are the foundation of VPC security.

## What's Next

Next up: VPC Peering and Transit Gateway — connecting VPCs and on-premises networks.