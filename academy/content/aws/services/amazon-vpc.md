---
title: "Amazon VPC"
type: content
estimated_minutes: 24
cert_tags: ["CLF-C02", "AIF-C01", "SAA-C03", "SOA-C03", "SCS-C03"]
---

# Amazon VPC

## Overview

Amazon Virtual Private Cloud (VPC) is your logically isolated private network within AWS, where you launch and connect resources with full control over IP addressing, subnets, routing, and security. Almost everything in AWS runs inside a VPC, so understanding VPC networking underpins compute, security, and connectivity across every certification. This *service reference* lesson covers the VPC building blocks, public/private connectivity, the two firewall layers, private and hybrid connectivity options, observability, and what each certification expects.

VPC matters because the cloud network is where availability, security, and connectivity are designed. You decide the IP space, carve it into subnets across Availability Zones, control what can reach the internet, connect to other VPCs and on-premises networks, and define layered firewalls. The core mental model is a hierarchy: a **VPC** (an IP CIDR range, Region-scoped) contains **subnets** (per-AZ CIDR ranges, public or private), whose traffic is directed by **route tables** and filtered by **security groups** (instance/ENI level) and **network ACLs** (subnet level), with **gateways and endpoints** providing connectivity in, out, and to AWS services.

---

## How It Works

- **VPC** — defined by a primary CIDR block (e.g., `10.0.0.0/16`), optionally with secondary CIDRs, scoped to one Region but spanning all of its AZs.
- **Subnets** — CIDR subdivisions, each entirely within one AZ. A subnet is **public** if its route table sends `0.0.0.0/0` to an **internet gateway** and instances have public IPs; otherwise it is **private**. AWS reserves five IPs per subnet.
- **Route tables** — control where subnet traffic goes: to the internet gateway, a NAT gateway, a peering connection, a transit gateway, a virtual private gateway, or VPC endpoints.
- **Internet gateway (IGW)** — a horizontally scaled, highly available gateway enabling bidirectional internet access for public subnets.
- **NAT gateway** — a managed, AZ-scoped service letting private-subnet resources make **outbound** internet connections (updates, API calls) without being reachable inbound; deploy one per AZ for resilience.

**Security layers** (defense in depth): **security groups** are **stateful**, attached to ENIs, allow-rules-only (return traffic is automatically permitted); **network ACLs** are **stateless**, attached to subnets, support both allow and deny rules, and evaluate inbound and outbound traffic independently (so you must allow ephemeral return ports).

---

## Key Features

- **VPC endpoints** reach AWS services privately without the public internet: **Gateway endpoints** (free; for **S3 and DynamoDB**, via route-table entries) and **Interface endpoints / AWS PrivateLink** (billed; private ENIs for most other services and for exposing your own services privately).
- **VPC peering** — private one-to-one connectivity between two VPCs; **non-transitive** (A↔B and B↔C does not give A↔C) and cannot have overlapping CIDRs.
- **Transit Gateway** — a regional hub that interconnects many VPCs and on-premises networks at scale, solving peering's mesh explosion and supporting transitive routing.
- **Site-to-Site VPN** (encrypted tunnels over the internet) and **Direct Connect** (dedicated private circuits) for hybrid connectivity, often combined with Transit Gateway.
- **VPC Flow Logs** capture accepted/rejected connection metadata for monitoring, troubleshooting, and security; **Network Firewall** provides managed stateful L3–L7 filtering; **Network Access Analyzer** and **Reachability Analyzer** verify and troubleshoot paths.

---

## Configuration Reference

- **Plan CIDRs** to avoid overlap with peers, Transit Gateway attachments, and on-premises ranges (overlap breaks peering/routing).
- **Span multiple AZs** with subnets for high availability; use a public/private tiering (public subnets for load balancers and NAT, private subnets for app and data tiers).
- **One NAT gateway per AZ** for resilient outbound access; route private subnets to the NAT in their own AZ.
- **Use gateway endpoints for S3/DynamoDB** (free, and keep traffic off NAT) and **interface endpoints** for other AWS APIs to avoid internet exposure and reduce NAT/data cost.
- **Layer security groups and NACLs**, and enable **Flow Logs** to S3/CloudWatch for visibility.

---

## Operations and Troubleshooting

- **Instance can't reach the internet.** Walk it: route table (IGW for public, NAT for private), public IP/Elastic IP assignment, security group egress, NACL rules (remember ephemeral return ports for stateless NACLs), and the subnet type.
- **Can't reach an AWS service privately.** Verify the VPC endpoint exists and is associated, the route table (gateway endpoint) or private DNS (interface endpoint) settings, and the **endpoint policy**.
- **Cross-VPC traffic fails.** Peering is non-transitive and needs routes on *both* sides with non-overlapping CIDRs; at scale use Transit Gateway.
- **Flow Logs** are the primary tool to see whether specific traffic is ACCEPTed or REJECTed and by which layer, narrowing the cause to a security group vs. NACL vs. routing issue.

---

## Integrations

The VPC is the network home for **EC2**, **RDS**, **ELB**, **ECS/EKS**, **Lambda** (when VPC-attached), and more. It connects privately to AWS services via **PrivateLink/endpoints**, to other VPCs via **peering/Transit Gateway**, and to on-premises via **VPN/Direct Connect**. Security integrates **security groups**, **NACLs**, **Network Firewall**, and **Flow Logs** (frequently analyzed by **GuardDuty**). It is the substrate that almost every other service runs on, and AI workloads often use **interface endpoints** to reach Bedrock/SageMaker privately.

---

## Pricing and Cost Considerations

The VPC, subnets, route tables, security groups, NACLs, and internet gateways are free. Costs come from **NAT gateways** (hourly plus per-GB processed — often a surprising line item; gateway endpoints for S3/DynamoDB avoid NAT charges), **interface endpoints/PrivateLink** (hourly per endpoint plus per-GB), **Transit Gateway** (per attachment and per-GB), **VPN/Direct Connect**, and especially **data transfer** (cross-AZ, cross-Region, and internet egress; same-AZ private traffic is free). The biggest levers are minimizing cross-AZ chatter, using free gateway endpoints for S3/DynamoDB, and right-sizing NAT usage. Exact prices vary by Region.

---

## Exam Relevance

**CLF-C02:** Know the VPC as your isolated private network and the basic pieces (subnets, internet gateway, security groups) conceptually. Foundational.

**AIF-C01:** Know that VPC interface endpoints let AI workloads reach services like Bedrock/SageMaker privately without internet exposure. Conceptual.

**SAA-C03:** Know subnet/AZ design, public vs. private tiers, IGW/NAT, endpoints/PrivateLink (gateway vs. interface), peering vs. Transit Gateway, and VPN/Direct Connect — core, heavily tested architecture content. Design depth.

**SOA-C03:** Operate and troubleshoot connectivity — route tables, NAT resilience, endpoints, and Flow Logs to localize a blocked path. Operations depth.

**SCS-C03:** Secure the network — security groups vs. NACLs (stateful vs. stateless), segmentation, Network Firewall, PrivateLink to avoid internet exposure, and Flow Logs for detection. Security depth.

---

## Summary

Amazon VPC is your isolated, software-defined network in AWS: a CIDR-scoped VPC subdivided into per-AZ public and private subnets, with route tables directing traffic through internet gateways (public) and NAT gateways (private outbound). Security groups (stateful, ENI-level, allow-only) and network ACLs (stateless, subnet-level, allow+deny) provide layered defense; VPC endpoints/PrivateLink reach AWS services privately (gateway endpoints free for S3/DynamoDB); peering (non-transitive) and Transit Gateway interconnect VPCs; VPN/Direct Connect link on-premises; and Flow Logs give visibility. The recurring exam points are stateful-vs-stateless firewalls, gateway-vs-interface endpoints, peering's non-transitivity, and using Flow Logs to localize a blocked path. The VPC is the network foundation for nearly all AWS workloads and drives a large share of data-transfer cost.

---

## Quick Check

1. What makes a subnet public versus private?
2. Compare security groups and network ACLs across stateful/stateless, level, and allow/deny — and what must you remember for NACL return traffic?
3. How do private-subnet instances reach the internet for outbound updates without being publicly reachable, and how many NAT gateways for resilience?
4. Which endpoint type is free and used for S3/DynamoDB, and which uses private ENIs (PrivateLink) for most other services?
5. Why is peering insufficient for connecting many VPCs, and what solves it at scale?

---

## What's Next

Pair this with **Amazon EC2** (what runs in the VPC), **Elastic Load Balancing**, **Amazon Route 53** (private DNS), and **AWS WAF/Shield** for edge security. The SCS-C03 network-security and hybrid-connectivity lessons build directly on this.
