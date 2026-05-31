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

## Examples

A developer building a personal project opens port 22 (SSH) on their EC2 instance to `0.0.0.0/0` — the entire internet. Within hours, automated bots find the port and begin brute-forcing the default `ec2-user` account. Because the developer had disabled password auth and used a key pair, no breach occurs — but the CloudWatch logs show thousands of failed attempts per minute. Restricting the SSH rule to their home IP (`203.0.113.42/32`) eliminates the noise entirely. This is the most common beginner security mistake EC2 offers.

A three-tier web application uses Security Group chaining to express its access policy. The load balancer security group allows port 443 from `0.0.0.0/0`. The app-tier security group allows port 8080 only from the load balancer's security group ID. The database security group allows port 5432 only from the app-tier security group ID. When an Auto Scaling event launches a new app instance and assigns it the app-tier security group, it immediately gains database access — with no IP address configuration required. When a compromised instance is terminated, its SG membership disappears and so does its database access.

A platform team at a mid-size company eliminates bastion hosts entirely by migrating SSH access to AWS Systems Manager Session Manager. They remove all inbound port 22 rules from every security group. Engineers open terminal sessions through the AWS Console or CLI — each session is authenticated via IAM, encrypted in transit, and logged to CloudTrail and CloudWatch Logs. Auditors gain a full record of every command run on every instance. The security group change — removing a single rule — was the operational trigger, but Session Manager is the architectural shift.

## Think About It

1. Security Groups are stateful, meaning return traffic is automatically allowed. Why does this simplify rule management compared to a stateless firewall — and when might stateless (NACL) rules be preferable?
2. If Security Groups only support Allow rules (no explicit Deny), how would you block a specific IP address that is abusing your API while continuing to serve all other users?
3. A security group rule references another security group ID as its source instead of a CIDR block. What happens to that rule's effective coverage when a new instance joins the referenced security group? What about when an instance leaves?
4. Why is AWS Systems Manager Session Manager considered more secure than traditional SSH with key pairs, even when the key pair is managed carefully?
5. You have a multi-account AWS organization. Your application in Account A needs to accept traffic from EC2 instances in Account B. Security Group chaining doesn't cross accounts. How would you architect this?

## Quick Check

**Q1.** A security group rule for an EC2 instance allows inbound TCP port 443 from `0.0.0.0/0`. What does this mean?
- A) The instance can make outbound HTTPS calls to any IP
- B) Any IP on the internet can initiate an HTTPS connection to this instance
- C) Only AWS services can reach this instance on port 443
- D) The instance will accept HTTPS traffic only from within the VPC

**Answer: B** — The CIDR `0.0.0.0/0` means all IPv4 addresses, so any host on the internet can initiate a connection to this instance on TCP port 443.

**Q2.** What is the default outbound rule behavior for a newly created security group?
- A) All outbound traffic is denied
- B) Only outbound port 80 and 443 are allowed
- C) All outbound traffic is allowed
- D) Outbound traffic mirrors the inbound rules

**Answer: C** — By default, new security groups allow all outbound traffic. Inbound traffic is denied by default and must be explicitly permitted with Allow rules.

**Q3.** Which of the following is the main benefit of referencing a Security Group ID (rather than a CIDR) as a source in a security group rule?
- A) It encrypts traffic between the two groups
- B) It allows the rule to work across AWS Regions
- C) Access is automatically granted or revoked as instances join or leave the referenced group, without needing to track IP addresses
- D) It reduces the cost of data transfer between instances

**Answer: C** — Referencing a Security Group ID means the rule dynamically applies to any instance that holds that group membership, making it ideal for Auto Scaling and dynamic IP environments.

## What's Next

Next: EBS volumes and snapshots — the persistent block storage attached to EC2 instances.
