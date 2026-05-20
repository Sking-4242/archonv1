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

## What's Next

Next up: Security Groups and NACLs — the two layers of VPC security.