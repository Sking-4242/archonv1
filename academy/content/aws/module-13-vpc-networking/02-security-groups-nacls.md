---
title: "Security Groups and Network ACLs"
type: content
estimated_minutes: 18
cert_tags: ["SAA-C03", "SAP-C02", "CLF-C02"]
---

# Security Groups and Network ACLs

## Overview

AWS VPC provides two distinct and complementary traffic filtering mechanisms: Security Groups and Network Access Control Lists (NACLs). Security Groups are stateful, instance-level firewalls that filter traffic at the Elastic Network Interface (ENI) attached to each resource. NACLs are stateless, subnet-level firewalls that filter all traffic entering or leaving a subnet. Together, they implement defense-in-depth — multiple layers of control so that a misconfiguration at one layer does not expose resources protected by the other.

Understanding the precise behavioral differences between Security Groups and NACLs is one of the highest-frequency topics across all AWS certification exams. The core distinction — stateful vs. stateless — has practical consequences that show up in real architectures constantly: a NACL that blocks return traffic because ephemeral ports were not allowed, or a security group that cannot block a known-malicious IP because it has no deny rule. Getting these concepts wrong leads to both exam failures and production security gaps.

This lesson goes deep on how each mechanism works at the packet level, when to use each, how to layer them for defense-in-depth, and the specific configuration details — rule numbers, ephemeral ports, default behaviors — that the exam tests. By the end, you should be able to trace a packet through both filtering layers and predict exactly what will happen.

## Core Concepts

### Security Groups: Stateful Instance-Level Firewalls

A Security Group is a virtual firewall attached to an Elastic Network Interface (ENI). Every EC2 instance, RDS instance, Lambda function in a VPC, ECS task, and EKS node has one or more ENIs, and each ENI has one or more security groups. Security groups evaluate traffic at the ENI — after the traffic has passed through any subnet-level NACLs.

Security groups are **stateful**: AWS tracks the state of each connection. When an inbound connection is explicitly allowed (e.g., TCP port 443 from `0.0.0.0/0`), all return traffic for that connection is automatically permitted regardless of outbound rules. Conversely, if an outbound connection is allowed (e.g., TCP port 443 to `0.0.0.0/0`), the return traffic is automatically permitted regardless of inbound rules. AWS maintains a connection tracking table to implement this statefulness.

Security groups support only **allow rules** — there are no deny rules. Traffic that does not match any allow rule is implicitly denied. This means you cannot use a security group to explicitly block a specific IP address while allowing all others; you can only allow specific sources. This is the key limitation that NACLs are designed to address.

When a security group has multiple rules, AWS evaluates all rules and allows the traffic if any rule matches. Security groups do not have numbered priorities — every rule is evaluated, and any single matching allow rule permits the traffic.

**Why stateful matters:** In a stateless world (like NACLs), a web server responding to a client's HTTP request must have an explicit outbound rule allowing the response. In a stateful security group, the response is automatically allowed because AWS knows it is return traffic for an established inbound connection. This dramatically simplifies rule management and is why security groups are the primary tool for most traffic filtering.

### Security Group Chaining: Identity-Based Access Control

Instead of specifying IP address ranges as traffic sources, security groups allow you to reference other security group IDs. This is the recommended pattern for internal VPC traffic because it decouples access control from IP addresses — which change as instances scale in and out.

A classic three-tier web application uses this chain:

1. **ALB Security Group:** Allows inbound TCP 443 from `0.0.0.0/0` (internet users)
2. **App Security Group:** Allows inbound TCP 8080 from `alb-sg-id` only (not from any IP range)
3. **DB Security Group:** Allows inbound TCP 5432 from `app-sg-id` only

This means: only the ALB can reach the app servers, and only app servers can reach the database. When Auto Scaling adds new EC2 instances to the app tier, they are automatically assigned `app-sg-id` and immediately have access to the database — no IP address updates needed. This is identity-based, not location-based, access control.

The chaining also works cross-account: you can reference a security group in a peer account to allow traffic from specific resources in that account, without knowing or managing IP ranges.

### Network ACLs: Stateless Subnet-Level Firewalls

A Network ACL (NACL) is a stateless firewall applied at the subnet boundary. Every subnet is associated with exactly one NACL; a NACL can be associated with multiple subnets. Traffic flowing into a subnet is evaluated against the NACL's inbound rules; traffic flowing out of a subnet is evaluated against its outbound rules — independently, with no connection tracking between the two.

NACLs evaluate rules in ascending numerical order, and **the first matching rule wins**. Every NACL has a final implicit deny-all rule (represented as `*`) that catches any traffic not matched by a numbered rule. The numbered rules you create take priority over this catch-all.

NACLs support both **allow and deny rules**. This is the capability that security groups lack. You can explicitly deny traffic from a known-malicious IP range at rule number 50, before a broader allow rule at rule number 100 would otherwise permit it.

**Rule numbering conventions:** AWS recommends numbering rules in increments of 100 (100, 200, 300...) to leave room for inserting rules between existing ones without renumbering. The lowest number that matches a packet wins — so place more specific deny rules at lower numbers than broad allow rules.

### Stateless NACLs and the Ephemeral Port Problem

Because NACLs are stateless, they must explicitly allow both directions of every communication. This creates a subtle but frequently tested problem with ephemeral (dynamic) ports.

When a client initiates a TCP connection to a server, the server's well-known port (e.g., 443) is the destination. But the client uses a randomly chosen **ephemeral port** as the source port for its end of the connection — typically in the range 1024–65535 (Linux) or 49152–65535 (Windows). The server's response flows back to this ephemeral port.

If a NACL is protecting a private subnet where your application servers live:
- **Inbound rule:** Allow TCP port 443 from `0.0.0.0/0` (clients connecting to the app)
- **Outbound rule needed:** Allow TCP ports 1024–65535 to `0.0.0.0/0` (responses going back to clients' ephemeral ports)

Without the outbound ephemeral port rule, the NACL blocks every response the server tries to send. The connection appears to hang from the client's perspective.

The same logic applies when a server in a private subnet initiates an outbound connection (e.g., to an external API):
- **Outbound rule:** Allow TCP port 443 to `0.0.0.0/0`
- **Inbound rule needed:** Allow TCP ports 1024–65535 from `0.0.0.0/0` (return traffic arrives on an ephemeral port)

This is the most common NACL misconfiguration in practice and a consistent exam trap.

### Default NACL vs. Custom NACL

The **default NACL** created with every VPC allows all inbound and all outbound traffic. It has two rules in each direction: rule 100 allows all traffic, and the `*` catch-all denies everything not matched. Since rule 100 matches everything first, all traffic passes. The default NACL is permissive — it does not protect anything on its own.

A **custom NACL** starts with no rules at all — only the `*` deny-all catch-all. Until you add explicit allow rules, a custom NACL blocks all traffic in both directions. This is the inverse of security group behavior (which also starts empty but allows nothing — both default to deny, but a custom NACL with no rules is more obviously dangerous because you might expect it to work like the default).

When you associate subnets with a custom NACL, make sure you have added all required rules before completing the association — otherwise you will immediately cut off all traffic to those subnets.

### Defense in Depth: Layering Security Groups and NACLs

The recommended pattern is to use security groups for most traffic filtering (they are stateful, easier to manage, and support SG-ID references) and NACLs as an additional perimeter control for subnet-level blocking.

Use NACLs specifically for:
1. **Explicit IP range blocking:** Blocking a known-malicious /24 CIDR before traffic reaches any instance — security groups cannot do this
2. **Compliance segmentation:** Adding a documented, auditable subnet-level control required by frameworks like PCI-DSS or HIPAA
3. **Emergency blocking:** Quickly blocking an active attack at the subnet level without touching individual instance security groups

A worked example for blocking `192.0.2.0/24` at the subnet level:

```
NACL Rule 90:  DENY   All Traffic   Source: 192.0.2.0/24   (explicit deny before any allows)
NACL Rule 100: ALLOW  TCP 443       Source: 0.0.0.0/0       (normal HTTPS traffic)
NACL Rule 110: ALLOW  TCP 80        Source: 0.0.0.0/0       (HTTP redirect traffic)
*              DENY   All Traffic   Source: 0.0.0.0/0       (implicit catch-all)
```

Traffic from `192.0.2.5` hits rule 90 (deny) before reaching rule 100 (allow) — blocked. Traffic from any other IP hits rule 100 or 110 — allowed.

## Configuration Reference

### CLI: Create and Configure a Custom NACL

```bash
# Create a custom NACL (starts with DENY ALL in both directions)
aws ec2 create-network-acl \
  --vpc-id vpc-0abc1234 \
  --tag-specifications 'ResourceType=network-acl,Tags=[{Key=Name,Value=private-app-nacl}]'
# Returns: NetworkAclId (e.g., acl-0abc1234)

# Add inbound rule: allow HTTPS from internet
aws ec2 create-network-acl-entry \
  --network-acl-id acl-0abc1234 \
  --rule-number 100 \
  --protocol tcp \
  --rule-action allow \
  --ingress \
  --cidr-block 0.0.0.0/0 \
  --port-range From=443,To=443
# --ingress flag: this is an inbound rule

# Add inbound rule: allow return traffic on ephemeral ports (responses from servers app tier called)
aws ec2 create-network-acl-entry \
  --network-acl-id acl-0abc1234 \
  --rule-number 200 \
  --protocol tcp \
  --rule-action allow \
  --ingress \
  --cidr-block 0.0.0.0/0 \
  --port-range From=1024,To=65535
# Critical: without this, return traffic from external APIs is blocked

# Add outbound rule: allow app servers to make outbound HTTPS calls
aws ec2 create-network-acl-entry \
  --network-acl-id acl-0abc1234 \
  --rule-number 100 \
  --protocol tcp \
  --rule-action allow \
  --egress \
  --cidr-block 0.0.0.0/0 \
  --port-range From=443,To=443
# --egress flag: this is an outbound rule

# Add outbound rule: allow responses to clients on ephemeral ports
aws ec2 create-network-acl-entry \
  --network-acl-id acl-0abc1234 \
  --rule-number 200 \
  --protocol tcp \
  --rule-action allow \
  --egress \
  --cidr-block 0.0.0.0/0 \
  --port-range From=1024,To=65535

# Add explicit DENY for a known-bad CIDR — place at a LOWER rule number than allows
aws ec2 create-network-acl-entry \
  --network-acl-id acl-0abc1234 \
  --rule-number 50 \
  --protocol -1 \
  --rule-action deny \
  --ingress \
  --cidr-block 192.0.2.0/24
# protocol -1 = all protocols; rule 50 fires before rule 100, so this CIDR is blocked

# Associate the NACL with a subnet
aws ec2 replace-network-acl-association \
  --association-id aclassoc-0abc \
  --network-acl-id acl-0abc1234
# Note: use replace-network-acl-association (not a create) — a subnet always has exactly one NACL
```

### CLI: Create and Configure a Security Group

```bash
# Create the ALB security group
aws ec2 create-security-group \
  --group-name alb-sg \
  --description "ALB: allow HTTPS from internet" \
  --vpc-id vpc-0abc1234
# Returns: GroupId (e.g., sg-0alb)

# Allow HTTPS inbound from internet
aws ec2 authorize-security-group-ingress \
  --group-id sg-0alb \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0

# Create the app tier security group
aws ec2 create-security-group \
  --group-name app-sg \
  --description "App: allow 8080 from ALB only" \
  --vpc-id vpc-0abc1234
# Returns: GroupId (e.g., sg-0app)

# Allow app port only from ALB security group (not from any IP range)
aws ec2 authorize-security-group-ingress \
  --group-id sg-0app \
  --protocol tcp \
  --port 8080 \
  --source-group sg-0alb
# --source-group references the ALB SG ID — any ENI with sg-0alb can reach app on port 8080

# Create the DB security group
aws ec2 create-security-group \
  --group-name db-sg \
  --description "DB: allow 5432 from app tier only" \
  --vpc-id vpc-0abc1234
# Returns: GroupId (e.g., sg-0db)

# Allow database port only from app security group
aws ec2 authorize-security-group-ingress \
  --group-id sg-0db \
  --protocol tcp \
  --port 5432 \
  --source-group sg-0app
```

### Console Navigation

**Security Groups:** VPC → Security Groups → Create Security Group. After creation, select the SG → Inbound Rules tab → Edit inbound rules → Add Rule. In the Source field, type `sg-` to search for other security groups by ID or name.

**Network ACLs:** VPC → Network ACLs → Create Network ACL. After creation, select the NACL → Inbound Rules tab → Edit inbound rules. Rules display with numbering; the `*` rule at the bottom represents the implicit deny-all and cannot be deleted.

**NACLs vs Security Groups — side-by-side location in console:** Both are under the VPC console in the left navigation. Security Groups are also accessible from the EC2 console under Network & Security.

### Worked Example: Blocking an Attacker CIDR with a NACL

Your threat intelligence feed flags `198.51.100.0/24` as an active scanner. Your public subnet hosts an ALB. You want to block this CIDR at the subnet boundary:

```bash
# Add DENY rule at number 50 — before any ALLOW rules at 100+
aws ec2 create-network-acl-entry \
  --network-acl-id acl-0pub-nacl \
  --rule-number 50 \
  --protocol -1 \
  --rule-action deny \
  --ingress \
  --cidr-block 198.51.100.0/24

# Verify: list all inbound rules in order
aws ec2 describe-network-acls \
  --network-acl-ids acl-0pub-nacl \
  --query 'NetworkAcls[0].Entries[?!Egress]|sort_by(@,&RuleNumber)'
```

Traffic from this CIDR hits rule 50 (deny) before reaching any allow rule. Your security groups are untouched. Other traffic from the internet continues to flow through rule 100 (allow HTTPS).

## How to Decide

| Requirement | Use Security Group | Use NACL |
|---|---|---|
| Allow traffic from a specific port | Yes — primary tool | Supplementary |
| Reference another SG as a source (not an IP) | Yes — only option | No |
| Explicitly deny a specific IP or CIDR | No — cannot deny | Yes — primary use case |
| Allow return traffic automatically | Yes — stateful | No — must add ephemeral port rules |
| Apply control to all resources in a subnet | No — per-ENI | Yes — per-subnet |
| Stateless rule evaluation (numbered priority) | No | Yes — rule numbers required |
| Block an active attacker IP immediately | No | Yes — add deny rule at low number |
| Comply with audit requirement for subnet-level controls | Supplement | Yes — documented subnet boundary |

## How This Connects

- **VPC Fundamentals:** Security groups and NACLs filter traffic that moves through the routing infrastructure — IGW, route tables, and NAT Gateway control where traffic can go; SGs and NACLs control what traffic is allowed when it gets there.
- **VPC Flow Logs:** Flow Logs record whether traffic was accepted or rejected by security groups and NACLs. When diagnosing a connectivity problem, Flow Logs tell you exactly which layer is rejecting traffic — `REJECT` records identify misconfigurations faster than any other tool.
- **VPC Peering and Transit Gateway:** When VPCs are peered, you must update security groups in the accepting VPC to allow traffic from the peer VPC's CIDR range. NACLs on both sides must also permit peered VPC traffic — another case where the stateless ephemeral port rules matter.
- **AWS Network Firewall:** Network Firewall provides deeper packet inspection (layer 7, stateful rule groups, Suricata-compatible rules) that neither security groups nor NACLs can match. SGs and NACLs operate at layers 3 and 4; Network Firewall is added when you need application-layer inspection or IDS/IPS capabilities.
- **Systems Manager Session Manager and VPC Endpoints:** Eliminating bastion hosts (via SSM Session Manager) means you can remove the inbound SSH/RDP allow rules from your security groups entirely — reducing attack surface. This is only possible if the instances can reach SSM endpoints, which requires either internet access or a VPC Interface Endpoint for SSM.

## Exam Traps

**Stateful vs. stateless means security groups don't need outbound rules for return traffic, but NACLs do.** The most-tested concept in this lesson. A security group with only inbound rules still allows the return traffic automatically. A NACL with only inbound allow rules blocks all return traffic. Many exam questions describe a connectivity failure in a scenario where a custom NACL was recently applied — the answer is almost always missing ephemeral port outbound rules.

**NACL rules are evaluated in order; security group rules are not.** Security groups evaluate all rules and allow traffic if any single rule matches. NACLs evaluate rules in ascending numeric order and stop at the first match. This means in a NACL, a deny rule at number 50 overrides an allow rule at number 100. In a security group, you cannot have a deny rule at all — every rule is an allow, and any allow that matches permits the traffic.

**A custom NACL denies all traffic until rules are added; the default NACL allows all traffic.** This is backwards from what many candidates expect. The default NACL is permissive (rule 100 allows all). A custom NACL has only the `*` deny-all and blocks everything until you add rules. Associating a subnet with a newly created custom NACL before adding allow rules immediately cuts off all traffic to that subnet.

**Security groups are attached to ENIs, not to instances directly.** An EC2 instance can have multiple ENIs, and each ENI can have up to 5 security groups. When a question asks what security group is "on the EC2 instance," the technically precise answer is that it is on the ENI. This matters in advanced scenarios involving multiple network interfaces or traffic between two instances in the same security group (traffic between members of the same SG is not automatically allowed — you must add a self-referencing rule).

**NACLs cannot reference security group IDs.** Only security groups can reference other security group IDs as traffic sources. NACLs work only with CIDR ranges. If an exam question asks how to allow traffic from all instances in a specific security group at the subnet level, a NACL cannot do this — only a security group rule with a source SG reference can.

## Summary

- Security groups are stateful, instance-level (ENI-attached) firewalls with allow-only rules; return traffic is automatically permitted.
- NACLs are stateless, subnet-level firewalls with numbered rules evaluated in ascending order; both allow and deny rules are supported.
- NACLs require explicit rules for both directions — including inbound and outbound ephemeral port (1024–65535) rules for return traffic.
- Security group chaining (referencing SG IDs as sources) enables identity-based, IP-independent access control for internal VPC traffic.
- The default NACL allows all traffic; a custom NACL denies all traffic until rules are explicitly added.
- Layer SGs and NACLs for defense-in-depth: use SGs for granular instance-level control, NACLs for subnet-level explicit denies and IP blocking.

## Examples

A three-tier retail platform implements security group chaining as its primary access control. The ALB security group allows inbound TCP 443 from `0.0.0.0/0` — this is the only security group that accepts internet traffic. The app tier security group allows inbound TCP 8080 only from the ALB security group ID. The RDS security group allows inbound TCP 5432 only from the app tier security group ID. During a holiday season sale, Auto Scaling launches 40 additional EC2 instances into the app tier. Each new instance is automatically assigned the app tier security group, immediately gains the ability to connect to RDS on port 5432, and is immediately accessible from the ALB on port 8080 — with zero security group rule changes. No IP ranges need to be managed. This is the core value proposition of security group chaining: access control that scales automatically with your fleet without creating security group rule debt.

A financial services company's security team receives a threat intelligence alert at 2 AM identifying `203.0.113.0/24` as the source of an active credential stuffing attack against their public-facing authentication service. The on-call engineer cannot update security groups to add deny rules (they have no deny capability) but can immediately add a NACL rule. She SSHs to her laptop, runs a single `create-network-acl-entry` command with rule number 50 (before the existing rule 100 that allows HTTPS), and the attack traffic is blocked within seconds — without touching a single security group or restarting any instance. The NACL operates at the subnet boundary, so traffic from the attacker CIDR never reaches the ALB ENI. This illustrates the complementary role of NACLs: rapid, explicit CIDR blocking that security groups fundamentally cannot provide.

A platform team deploys a new private subnet for a batch processing application and creates a custom NACL for it, adding inbound allow rules for the ports their application uses. They associate the subnet with the NACL and launch their EC2 instances. The instances can receive inbound connections but all outbound API calls to external services fail silently. VPC Flow Logs show outbound TCP 443 packets as `ACCEPT` but all inbound responses as `REJECT`. The diagnosis: the custom NACL has an outbound rule allowing TCP 443 and an inbound rule allowing TCP 443, but no inbound rule allowing ephemeral ports 1024–65535. The response packets from the external API arrive on the ephemeral port the EC2 instance opened for the connection — which is in the 1024–65535 range — and the NACL blocks them because only TCP 443 inbound is explicitly allowed. Adding an inbound rule to allow TCP 1024–65535 from `0.0.0.0/0` immediately resolves all outbound call failures. This scenario plays out in production more than any other NACL misconfiguration.

## Think About It

1. Security groups are stateful because AWS tracks connection state. What information does AWS need to record in its connection tracking table to know that an incoming packet is return traffic for an established outbound connection? Why would tracking this same information be computationally impractical at the subnet level (where NACLs operate)?

2. A NACL has inbound rule 90 that denies `203.0.113.0/24`, and inbound rule 100 that allows `0.0.0.0/0` on TCP 443. A packet arrives from `203.0.113.50` on TCP 443. What happens? Now change the rule numbers: deny at 110, allow at 100. What happens to the same packet? Explain why rule number order matters so critically here.

3. You want to allow your application servers to communicate with an RDS database. You could write a security group rule with the app-tier SG as the source, or a NACL rule with the app subnet CIDR as the source. The result is similar connectivity — but what are the technical and operational differences? In which scenario does the NACL approach break while the SG approach still works correctly?

4. An EC2 instance has two security groups attached: SG-A allows inbound TCP 80 from `0.0.0.0/0`, and SG-B allows inbound TCP 443 from `0.0.0.0/0`. SG-A has an outbound rule denying TCP 443. SG-B has an outbound rule allowing all traffic. A request arrives on TCP 443. Is it allowed? Does the outbound deny in SG-A affect the response? Explain how security group rule evaluation works across multiple SGs.

5. Your company's compliance framework requires that every subnet have a documented, subnet-level firewall control, even if security groups are already in place. Some engineers argue this is redundant overhead since security groups already filter traffic at the instance level. Make the technical and compliance case for why NACLs still add meaningful value in this architecture, even for subnets where all instances have well-configured security groups.

## Quick Check

**Q1.** An application in a private subnet initiates an outbound HTTPS request to an external API. The private subnet's NACL has an outbound rule allowing TCP 443 to `0.0.0.0/0`. The response never arrives. What is the most likely cause?

- A) The security group on the EC2 instance is blocking outbound HTTPS
- B) The NACL's inbound rules do not allow TCP ports 1024–65535 for return traffic
- C) The NAT Gateway does not support HTTPS traffic
- D) The NACL's outbound rule should allow TCP 80 instead of TCP 443

**Answer: B** — NACLs are stateless. The response arrives from the API server on the ephemeral port the EC2 instance opened (in the 1024–65535 range). Without an inbound NACL rule allowing these ports, the response is blocked. The security group would automatically allow return traffic (stateful), but the NACL evaluates each packet independently.

**Q2.** A security team needs to immediately block all traffic from IP address `198.51.100.25` from reaching any instance in a public subnet. Which action accomplishes this?

- A) Add a deny rule to every security group attached to instances in the subnet
- B) Add an inbound deny rule to the subnet's NACL at a rule number lower than any existing allow rule
- C) Remove the Internet Gateway route from the subnet's route table
- D) Create a new security group with a deny rule for `198.51.100.25` and attach it to all instances

**Answer: B** — Security groups have no deny rule capability (A and D are impossible). Removing the IGW route (C) would break all internet connectivity for the subnet. Only a NACL can explicitly deny a specific CIDR, and the rule number must be lower than any allow rule that would otherwise match the traffic.

**Q3.** Which statement correctly describes the difference between the default NACL and a custom NACL?

- A) The default NACL denies all traffic; a custom NACL allows all traffic until rules are modified
- B) The default NACL allows all traffic; a custom NACL denies all traffic until allow rules are added
- C) Both default and custom NACLs start by denying all traffic
- D) Custom NACLs are stateful; the default NACL is stateless

**Answer: B** — The default NACL has rule 100 that allows all inbound and all outbound traffic, making it fully permissive. A custom NACL has only the `*` implicit deny-all rule in each direction; until you add explicit allow rules, it blocks all traffic. Both NACLs (default and custom) are stateless — statefulness is a property of security groups only.

## What's Next

Next up: VPC Peering and Transit Gateway — connecting multiple VPCs and understanding when each approach scales.
