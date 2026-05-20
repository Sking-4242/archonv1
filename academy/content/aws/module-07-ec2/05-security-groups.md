---
title: "Security Groups and Key Pairs"
type: content
estimated_minutes: 8
cert_tags: ["aws_saa", "aws_soa", "aws_dva"]
---

# Security Groups and Key Pairs

## Overview

Security Groups are the primary network firewall mechanism for EC2 instances — they control what traffic can reach your instances and what traffic your instances can send. Key Pairs provide SSH access to Linux instances and RDP decryption for Windows instances. Both are fundamental EC2 security concepts.

## Security Groups Deep Dive

Security Groups are stateful virtual firewalls attached to EC2 instances (and other resources like RDS, ELB, Lambda in VPC). Rules are defined as Allow rules only — there's no way to explicitly deny traffic in a Security Group (use NACLs for explicit denies). Default behavior: all inbound traffic is denied unless a rule allows it; all outbound traffic is allowed unless a rule restricts it.

**Rule components:** Protocol (TCP, UDP, ICMP, or All), Port range (single port or range), and Source/Destination (IP CIDR or another Security Group ID). The ability to reference another Security Group as a source is powerful — allow traffic only from instances in the web-tier security group, without needing to know their IP addresses. Security Group rules update instantly — no instance restart required.

## Key Pairs for SSH Access

A Key Pair consists of a public key (stored on the EC2 instance in ~/.ssh/authorized_keys) and a private key (a .pem file you download and keep secure). When you SSH to an EC2 instance, you present your private key, and the instance validates it against the stored public key.

Best practices: use a separate key pair per environment (don't use one key pair for everything). Store private keys securely (AWS Secrets Manager, AWS Systems Manager Parameter Store, or a PAM solution). Consider using AWS Systems Manager Session Manager instead of SSH — it requires no inbound port 22, no key management, and creates a full audit trail. Session Manager is the modern, preferred method for accessing EC2 instances.

## Security Group Chaining

Security Group chaining is one of the most powerful VPC security patterns. Instead of specifying IP CIDRs in Security Group rules, you reference other Security Group IDs. For example: the database security group allows port 3306 from the app security group. Now any EC2 instance with the app security group can reach the database, regardless of IP address — and adding or removing instances from the app tier automatically updates the database access without any Security Group changes.

This pattern scales elegantly. You don't need to maintain lists of IP addresses or CIDR blocks — just security group membership. It enables dynamic architectures where instance IPs change (Auto Scaling, spot replacement) without security policy updates.

## Summary

Security Groups are stateful Allow-only firewalls attached to EC2 instances. Rules specify protocol, port, and source/destination (IP or Security Group ID). Key Pairs enable SSH/RDP access — consider replacing with Systems Manager Session Manager for better security and auditability. Security Group chaining references other SG IDs for dynamic, IP-agnostic access control.

## What's Next

Next: EBS volumes and snapshots — the persistent block storage attached to EC2 instances.
