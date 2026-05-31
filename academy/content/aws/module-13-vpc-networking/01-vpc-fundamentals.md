---
title: "VPC Fundamentals: Your Private Network on AWS"
type: content
estimated_minutes: 10
cert_tags: ["SAA-C03", "SAP-C02", "CLF-C02"]
---

# VPC Fundamentals: Your Private Network on AWS

## Overview

A Virtual Private Cloud (VPC) is your logically isolated private network within an AWS region. Every resource you launch — EC2, RDS, Lambda, ECS — runs inside a VPC. Understanding VPC architecture is the foundation of all AWS networking and security. This lesson covers the core building blocks.

## VPC Basics

A VPC is a virtual network you define in a single AWS region with a CIDR block (e.g., 10.0.0.0/16 gives you 65,536 IP addresses). Within the VPC, you create subnets — each in a single AZ, with a sub-range of the VPC CIDR. The default VPC in each region has a /16 CIDR and a /20 public subnet in each AZ, preconfigured for internet access. For production workloads, create a custom VPC with explicitly designed subnets.

## Public vs. Private Subnets

A public subnet has a route to the internet via an Internet Gateway (IGW). Resources in public subnets can have public IPs and receive inbound traffic from the internet (if security groups allow). A private subnet has no direct route to the internet. Resources in private subnets can access the internet only via a NAT Gateway (outbound only). The pattern: load balancers and bastion hosts in public subnets; application servers and databases in private subnets.

## Route Tables

Each subnet is associated with a route table — a set of rules that direct outgoing traffic. A route table entry has a destination CIDR and a target. The default local route (e.g., `10.0.0.0/16 → local`) is always present, allowing all VPC resources to communicate. Adding `0.0.0.0/0 → igw-xxx` makes a subnet public. Adding `0.0.0.0/0 → nat-xxx` gives private subnet internet access via NAT. Multiple subnets can share a route table.

## Internet Gateway and NAT Gateway

An Internet Gateway (IGW) attaches to a VPC and enables bidirectional internet access for instances with public IPs. It performs 1:1 NAT between private and public IPs. A NAT Gateway lives in a public subnet and allows instances in private subnets to initiate outbound internet connections (for software updates, API calls) without being reachable inbound. NAT Gateways are AZ-scoped — deploy one per AZ for HA. Each is billed per hour plus per GB of data processed.

## DNS in VPC

Every VPC has an AWS-provided DNS resolver at `169.254.169.253` (or the second IP of the VPC CIDR, e.g., `10.0.0.2`). Enable `enableDnsSupport` and `enableDnsHostnames` on your VPC for private DNS resolution. EC2 instances get private DNS names like `ip-10-0-1-5.us-east-1.compute.internal`. Route 53 Private Hosted Zones let you create custom DNS names within your VPC (e.g., `db.internal`).

## Summary

A VPC is your isolated network environment in AWS. Public subnets have IGW routes for internet-facing resources; private subnets use NAT Gateways for outbound-only internet access. Route tables control traffic flow. AWS DNS handles internal name resolution; Route 53 private hosted zones extend it with custom names. This is the network foundation everything else builds on.

## Examples

A small e-commerce startup launches its first production environment on AWS. They use the default VPC initially, then realize every developer can accidentally deploy internet-facing resources. They create a custom VPC with a /16 CIDR, put their RDS instance in a private subnet, and front it with an EC2 app server also in a private subnet behind an Application Load Balancer in the public subnet. This maps directly to the public/private subnet split: the ALB needs inbound internet access (public subnet + IGW), while the database must never be directly reachable from the internet (private subnet, no route to IGW).

A healthcare SaaS company runs HIPAA-regulated workloads and needs their EC2 application servers to pull OS updates from the internet without being reachable inbound. They deploy a NAT Gateway in each of their two public subnets (one per AZ), and update the private subnet route tables with `0.0.0.0/0 → nat-xxx`. Their app servers initiate outbound connections for package downloads successfully, but no inbound connection from the internet can reach them. This is exactly the NAT Gateway's one-directional design — outbound only, no inbound sessions can be established.

A fintech company acquires another startup and needs to integrate internal services across VPCs. Both VPCs use `10.0.0.0/16`, which creates an address overlap conflict. They cannot peer the VPCs without re-addressing one of them first. This scenario illustrates a critical CIDR planning lesson: overlapping ranges block peering entirely, and rebuilding a production VPC is expensive. It also demonstrates why Route 53 Private Hosted Zones matter — even if internal services used DNS names like `payments.internal` instead of hardcoded IPs, the underlying routing would still fail without non-overlapping CIDRs.

## Think About It

1. Why does AWS require that peered VPCs have non-overlapping CIDR ranges? What would actually break at the network layer if two peered VPCs both used `10.0.0.0/16`?

2. A NAT Gateway must itself live in a public subnet. What would happen if you placed a NAT Gateway in a private subnet? Trace the packet path and explain where it would fail.

3. You have a web application that must be reachable from the internet and a database that must never be. How would you decide which subnets to use, and what specific route table entries would enforce that separation?

4. AWS recommends deploying a NAT Gateway in each AZ rather than sharing one across AZs. What are the trade-offs between the cost savings of a single NAT Gateway versus the resilience of one per AZ? At what scale does the cost trade-off flip?

5. The default VPC already exists in every region with a /20 public subnet per AZ. Why would a production team choose to create a custom VPC instead of using the default, given that the default is pre-configured and ready to use?

## Quick Check

**Q1.** What makes a subnet "public" in AWS VPC terminology?
- A) It has a public IP address assigned to it
- B) Its route table contains a route to an Internet Gateway
- C) It is located in the first AZ of the region
- D) It has a security group that allows inbound traffic from 0.0.0.0/0

**Answer: B** — A subnet is public when its associated route table has a route directing internet-bound traffic (`0.0.0.0/0`) to an Internet Gateway; public IP assignment alone is not sufficient.

**Q2.** A private subnet EC2 instance needs to download a software package from the internet. Which resource enables this while keeping the instance unreachable from inbound internet traffic?
- A) Internet Gateway
- B) VPC Peering Connection
- C) NAT Gateway
- D) VPC Endpoint

**Answer: C** — A NAT Gateway allows instances in private subnets to initiate outbound internet connections while blocking any inbound connections initiated from the internet.

**Q3.** Where does the AWS-provided DNS resolver live in a VPC with CIDR `10.0.0.0/16`?
- A) 10.0.0.1
- B) 10.0.0.2
- C) 169.254.169.253
- D) Both B and C are correct

**Answer: D** — The AWS DNS resolver is accessible at both the second IP of the VPC CIDR (10.0.0.2 for a 10.0.0.0/16 VPC) and the link-local address 169.254.169.253.

## What's Next

Next up: Security Groups and NACLs — the two layers of VPC security.