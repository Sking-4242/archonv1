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

## Examples

A three-tier web application at a retail company uses security group chaining to enforce strict traffic flow. The ALB security group allows HTTPS (443) from `0.0.0.0/0`. The application tier security group allows port 8080 only from the ALB security group ID — not from any IP range. The RDS security group allows port 5432 only from the application tier security group ID. When the DevOps team scales out the app tier by adding new EC2 instances, those instances automatically inherit the app-tier security group and are immediately permitted to reach the database — no IP address updates needed. This is the core value of security group referencing: identity-based rather than location-based access control.

A financial services company receives a threat intelligence alert that a specific /24 CIDR block is actively scanning for open ports. Security groups cannot explicitly block an IP range — they only allow. The security team creates a NACL deny rule with rule number 100 that blocks all traffic from that CIDR before it reaches any instance in the affected subnet. Their existing security groups are untouched. This demonstrates the complementary role of NACLs: they provide an explicit deny capability at the subnet boundary that security groups fundamentally cannot offer.

A platform engineering team is debugging why an application in a private subnet cannot receive responses from an external API it is calling. VPC Flow Logs show the outbound request as ACCEPT but the inbound response as REJECT. The cause: a custom NACL was applied to the private subnet with tight outbound rules, but they forgot that NACLs are stateless — the inbound return traffic (on ephemeral ports 1024–65535) also needs an explicit allow rule. The team adds an inbound allow rule for the ephemeral port range and traffic flows. This is a classic stateless NACL footgun that Flow Logs surface quickly.

## Think About It

1. Security groups are stateful and NACLs are stateless. What does "stateful" actually mean at the packet level — what information does AWS track to make return traffic automatic, and why does that information not exist in a stateless NACL?

2. A NACL rule numbered 90 denies all traffic from `203.0.113.0/24`. Rule 100 allows all traffic from `0.0.0.0/0`. A packet arrives from `203.0.113.5`. What happens, and why? What if the rules were numbered in reverse order?

3. You need to allow your application servers to communicate with an RDS database. Should you use a security group with the app-tier SG as the source, or a NACL with the app subnet CIDR as the source? What are the trade-offs of each approach?

4. VPC Flow Logs capture metadata but not payload. For which security use cases is this sufficient, and for which would you need a tool like AWS Network Firewall or a third-party IDS that inspects actual packet content?

5. If the default NACL allows all traffic, why bother creating custom NACLs at all for a VPC that already has tightly configured security groups?

## Quick Check

**Q1.** Which statement accurately describes the difference between Security Groups and NACLs?
- A) Security Groups operate at the subnet level; NACLs operate at the instance level
- B) Security Groups are stateless; NACLs are stateful
- C) Security Groups are stateful and support only allow rules; NACLs are stateless and support allow and deny rules
- D) Security Groups evaluate rules in numbered order; NACLs evaluate all rules

**Answer: C** — Security groups are stateful (return traffic is automatically allowed) and only support allow rules. NACLs are stateless (both directions must be explicitly allowed) and support both allow and deny rules.

**Q2.** A NACL has three inbound rules: Rule 100 allows port 443, Rule 200 denies all traffic, Rule 300 allows all traffic. A packet arrives on port 80. What is the result?
- A) Allowed, because Rule 300 allows all traffic
- B) Denied, because Rule 200 denies all traffic and is evaluated first
- C) Denied, because no rule explicitly allows port 80 before Rule 200 denies it
- D) Allowed, because security groups will make the final decision

**Answer: C** — NACL rules are evaluated in ascending numeric order; the first match wins. Port 80 is not matched by Rule 100, so Rule 200 (deny all) is the first match and the packet is denied.

**Q3.** What do VPC Flow Logs capture?
- A) Full packet payloads for security forensics
- B) Network traffic metadata including source/destination IPs, ports, and ACCEPT/REJECT decisions
- C) Real-time traffic statistics with zero delay
- D) Only traffic that is explicitly rejected by security groups or NACLs

**Answer: B** — VPC Flow Logs capture network metadata (IPs, ports, protocol, bytes, ACCEPT/REJECT) but not packet payloads, and they are not real-time — there is a 10–15 minute publication delay.

## What's Next

Next up: VPC Peering and Transit Gateway — connecting VPCs and on-premises networks.