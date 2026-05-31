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

## Examples

A SaaS company hosts a multi-tenant web application behind an Application Load Balancer. They have security groups restricting port access, but a penetration test reveals that their application is vulnerable to SQL injection and cross-site scripting. They deploy AWS WAF on their ALB with the `AWSManagedRulesCommonRuleSet` and `AWSManagedRulesSQLiRuleSet` managed rule groups. Within 24 hours WAF is blocking thousands of malicious requests per day — without any changes to application code. This illustrates WAF's role in the defense-in-depth stack: security groups handle port-level access, but WAF handles application-layer threats that operate on valid HTTP traffic over allowed ports.

A media streaming platform experiences a sudden flood of UDP packets targeting their origin servers during a high-profile live event — a volumetric DDoS attack. AWS Shield Standard, which is automatically applied to all their resources, absorbs the L3/L4 flood at the AWS network edge before the packets reach their EC2 instances. The attack peaks at 200 Gbps but the platform stays online. After this incident the platform upgrades to Shield Advanced, which gives them access to the Shield Response Team for proactive engagement and billing protection in case auto-scaling triggered by future attacks inflates their AWS bill. This shows the distinction between Shield Standard (always-on, volumetric protection) and Shield Advanced (managed response and financial protection).

A financial services company uses AWS Network Firewall to enforce strict egress controls on their EC2 instances. All outbound traffic routes through Network Firewall endpoints in dedicated firewall subnets before reaching the Internet Gateway. They configure a domain allowlist that permits HTTPS only to known, approved domains (their payment processor, software package repositories, and monitoring endpoints). When malware on a compromised instance attempts to beacon out to an unknown command-and-control domain, Network Firewall's stateful domain filtering blocks the connection and logs the attempt — a capability that is completely invisible to security groups, which only see IP addresses and port numbers, not domain names.

## Think About It

1. Security groups, NACLs, WAF, and AWS Network Firewall all control traffic in different ways. For each one, describe a specific threat or attack type it is uniquely suited to detect or block that the others cannot handle. Where do their capabilities genuinely overlap versus truly complement each other?

2. AWS WAF operates at Layer 7 and AWS Network Firewall operates at Layers 3–7. For HTTPS traffic, Network Firewall sees encrypted payloads unless TLS inspection is configured. What are the implications for detecting application-layer attacks with Network Firewall versus WAF, and which tool would you use to inspect decrypted HTTPS traffic for SQL injection?

3. Shield Standard is automatically applied to all AWS customers at no cost. Shield Advanced costs ~$3,000/month. What specific capabilities does Shield Advanced provide that justify that cost for some customers, and what type of company or application would you advise to invest in it?

4. Deploying Network Firewall in a centralized shared-services VPC rather than in each individual spoke VPC reduces the number of firewall deployments. What are the trade-offs of this centralized inspection model — what do you gain, what do you lose, and what new failure modes do you introduce?

5. A Network Firewall domain allowlist blocks all outbound HTTPS except to approved domains. An application team argues this will break their deployment because they don't know all the domains their third-party libraries call. How would you approach building the allowlist safely without breaking the application, and what process would you establish for ongoing maintenance?

## Quick Check

**Q1.** Which AWS service would you use to block HTTP requests containing SQL injection patterns targeting an Application Load Balancer?
- A) AWS Network Firewall
- B) Security Groups
- C) AWS WAF
- D) AWS Shield Advanced

**Answer: C** — AWS WAF operates at Layer 7 and can inspect HTTP/HTTPS request content for patterns like SQL injection. Security groups and NACLs only see IP/port metadata, not request content.

**Q2.** What is the key capability that AWS Network Firewall provides that Security Groups and NACLs cannot?
- A) The ability to deny traffic by IP address
- B) Stateful packet inspection, domain-name filtering, and Suricata-compatible IPS rule support
- C) Protection against volumetric DDoS attacks
- D) Subnet-level traffic filtering

**Answer: B** — Network Firewall provides stateful deep packet inspection, domain-based filtering, and IPS signature matching. Security groups and NACLs operate only on IP addresses, ports, and protocols — they cannot inspect traffic content or filter by domain name.

**Q3.** AWS Shield Standard is automatically applied to all AWS customers. What additional protection does Shield Advanced add?
- A) It enables Shield Standard, which is not active by default
- B) It provides L7 application protection through WAF rules
- C) It adds managed DDoS response via the Shield Response Team, enhanced dashboards, and billing credits for DDoS-triggered scaling costs
- D) It provides a dedicated DDoS scrubbing network separate from AWS's shared infrastructure

**Answer: C** — Shield Advanced adds the AWS Shield Response Team (SRT) for proactive DDoS management, detailed attack visibility, and financial protection through billing credits when DDoS attacks trigger auto-scaling. The underlying network-layer DDoS mitigation infrastructure is already provided by Shield Standard.

## What's Next

Next up: the Module 13 Canvas Lab — build a multi-subnet VPC with NAT and routing.