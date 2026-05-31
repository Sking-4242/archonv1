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

## Examples

A startup building a B2B SaaS product is setting up their first production AWS environment. Their architect designs a three-tier VPC with two AZs: two public subnets hosting the ALB and NAT Gateways, two private application subnets for their ECS tasks, and two private data subnets for RDS Multi-AZ. They choose a /16 VPC CIDR (10.10.0.0/16) with /24 public subnets and /22 private subnets, leaving large portions of the address space unallocated. Six months later they add a third AZ and a new service tier without any CIDR conflicts — the upfront space planning paid off immediately. This is the three-tier pattern done right: layered security, HA across AZs, and room to grow.

A company migrates from a monolithic on-premises architecture to AWS and tries to put everything in one VPC. Eighteen months later they have 200 EC2 instances, 15 RDS databases, 3 EKS clusters, and 40 engineers all sharing one VPC. Security reviews flag that a compromised instance in development could reach production databases — there's no network boundary between environments. They re-architect using AWS Control Tower: separate AWS accounts for prod, staging, and dev, each with its own VPC. A centralized Network account hosts a Transit Gateway; workload VPCs attach to it with segmented TGW route tables. The re-architecture takes three months but the blast radius of any single compromise is now limited to a single account. This demonstrates why the "one VPC for everything" anti-pattern breaks down at scale.

A large enterprise adopting AWS at scale uses Control Tower to provision new accounts through an Account Vending Machine. Every new workload account gets a VPC automatically with a pre-approved CIDR range drawn from a master IP address management (IPAM) system — AWS VPC IPAM. The CIDR ranges are guaranteed non-overlapping with all existing VPCs and on-premises ranges. The network team no longer manually reviews VPC creation requests; the automation enforces the policy. This illustrates how CIDR planning transitions from a manual exercise to an automated governance problem at organizational scale, and why tools like AWS IPAM exist.

## Think About It

1. The three-tier VPC pattern places load balancers in public subnets, application servers in private application subnets, and databases in private data subnets. What specific threats does each layer boundary mitigate? If you collapsed the application and data layers into a single private subnet tier, what would you lose?

2. You are designing CIDR ranges for a company that will have 20 VPCs across 4 AWS regions, with possible on-premises connectivity in the future. Their on-premises network uses `192.168.0.0/16`. What address space would you allocate to AWS, and how would you structure the allocation across regions and VPCs to prevent conflicts?

3. AWS Control Tower separates prod, staging, and dev into different AWS accounts rather than different VPCs within the same account. What security and operational benefits does account-level isolation provide that VPC-level isolation alone does not?

4. IPv6 addresses in AWS are globally routable and there is no NAT for IPv6 — every IPv6 resource gets a real internet-routable address. How does this change the security model compared to IPv4, where private subnet resources have RFC 1918 addresses that are not internet-routable by default? What controls replace "not having a public IP" as a security boundary?

5. The Egress-Only Internet Gateway for IPv6 serves the same purpose as a NAT Gateway for IPv4 — outbound only. But unlike NAT Gateway, there is no charge for data processed through an EIGW. Why might AWS have made this pricing decision, and does it change how you would design IPv6-enabled private subnets?

## Quick Check

**Q1.** In a standard three-tier VPC design, which resources are placed in public subnets?
- A) Application servers, RDS databases, and ElastiCache clusters
- B) Load balancers, NAT Gateways, and bastion hosts
- C) ECS tasks, Lambda functions, and internal APIs
- D) All resources that need high availability across AZs

**Answer: B** — Public subnets contain resources that need to be internet-reachable (ALBs) or that need a public IP to perform their function (NAT Gateways). Application servers and databases belong in private subnets.

**Q2.** Why is it critical to avoid overlapping CIDR ranges when designing VPC address space?
- A) AWS will reject VPC creation if the CIDR overlaps with any other VPC globally
- B) Overlapping CIDRs prevent VPC Peering and Transit Gateway connectivity between those VPCs, and the conflict cannot be resolved without rebuilding the VPC
- C) Overlapping CIDRs cause routing loops within the VPC
- D) AWS charges a penalty fee for overlapping CIDRs detected during security audits

**Answer: B** — VPC Peering and Transit Gateway require non-overlapping CIDRs. If two VPCs share an address range, they cannot be connected — and there is no way to change a VPC's CIDR without significant disruption, making upfront planning essential.

**Q3.** What is the role of the Network account in an AWS Control Tower multi-account architecture?
- A) It hosts all production workloads to consolidate networking costs
- B) It serves as the management account for billing and governance
- C) It centrally hosts networking infrastructure such as Transit Gateway, shared VPC endpoints, and hybrid connectivity, which workload account VPCs attach to
- D) It is used only for storing VPC Flow Logs from all other accounts

**Answer: C** — In Control Tower architectures, a dedicated Network account centralizes shared networking services (TGW, Direct Connect, DNS) so that workload accounts can attach to them without each managing their own hybrid connectivity or shared network infrastructure.

## What's Next

Next up: the Canvas Lab — build a multi-subnet VPC with public and private tiers.