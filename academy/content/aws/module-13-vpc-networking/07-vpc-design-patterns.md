---
title: "VPC Design Patterns and Best Practices"
type: content
estimated_minutes: 8
cert_tags: ["SAA-C03", "SAP-C02"]
---

# VPC Design Patterns and Best Practices

## Overview

Real-world VPC designs follow established patterns. This lesson covers three-tier VPC architecture, CIDR planning for scale, and the multi-VPC hub-and-spoke pattern used in large AWS organizations.

## Three-Tier VPC Layout

The most common VPC pattern has three layers of subnets across at least 2 AZs: Public subnets (load balancers, NAT Gateways, bastion hosts), Private Application subnets (EC2 auto scaling groups, container tasks, Lambda in VPC), Private Data subnets (RDS, ElastiCache, Redshift, OpenSearch). Traffic flows inward: internet → public subnet → private app subnet → private data subnet. Security groups at each layer restrict lateral movement.

## CIDR Planning

Plan CIDR ranges with growth and peering in mind. A /16 VPC CIDR gives 65,536 addresses. Divide into subnets carefully: public subnets can be /24 (254 usable IPs — sufficient for NAT Gateways and load balancers), private app subnets /22 (1,022 IPs), private data subnets /24. Reserve address space for future subnet additions. Avoid overlapping CIDRs with on-premises ranges or other VPCs you might peer with — conflicts cannot be resolved without rebuilding.

## AWS Landing Zone and Control Tower

Large organizations use AWS Control Tower (built on AWS Organizations and Landing Zone Accelerator) to manage a multi-account, multi-VPC environment. The standard structure: Management account (billing, governance), Log Archive account (centralized CloudTrail and Config logs), Audit account (security tools), and Workload accounts (prod, staging, dev) in dedicated OUs. Networking is centralized in a Network account with a TGW — spoke VPCs in workload accounts attach to it.

## IPv6 in VPC

VPCs support dual-stack IPv4/IPv6. AWS assigns a /56 IPv6 CIDR from Amazon's pool at no cost. IPv6 addresses are globally routable (there's no IPv6 NAT — all IPv6 traffic goes direct to internet or stays private). An Egress-Only Internet Gateway provides outbound-only IPv6 internet access for private resources (analogous to NAT Gateway for IPv4). IPv6 support is important for IoT and mobile workloads where address space exhaustion is a concern.

## Summary

Three-tier VPC (public / private-app / private-data) across 2+ AZs is the standard production pattern. Plan CIDRs for growth and peering compatibility. Use Control Tower + multi-account for organizational scale, with a centralized Network account hosting TGW. Understanding these patterns separates architects from practitioners on SAP-C02 and real-world designs.

## What's Next

Next up: the Canvas Lab — build a multi-subnet VPC with public and private tiers.