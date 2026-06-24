---
title: "Network Security Controls and Segmentation"
type: content
estimated_minutes: 18
cert_tags: ["SCS-C03"]
---

# Network Security Controls and Segmentation

## Overview

Network controls decide what can talk to what, and they are the backbone of containing threats and limiting blast radius inside AWS. The Security Specialty exam's Task 3.3 covers *designing and troubleshooting network security controls*: permitting and preventing traffic with security groups, network ACLs, and AWS Network Firewall; designing segmentation for north-south and east-west traffic; and identifying unnecessary network access. This is design-and-troubleshoot depth — the exam gives you a topology and a requirement and asks which control enforces it, or presents broken connectivity and asks why traffic is or isn't flowing.

The defining discipline is **segmentation and least-network-privilege**. Just as IAM grants the minimum permissions, network design should permit the minimum connectivity: tiers isolated from each other, subnets without internet access unless required, and explicit rules for every allowed flow. The specialty skill is layering the stateful, instance-level control (security groups) with the stateless, subnet-level control (network ACLs) and the advanced, deep-inspection control (Network Firewall), and knowing precisely how each behaves — because their differences (stateful vs. stateless, allow-only vs. allow-and-deny, return-traffic handling) are exactly what troubleshooting questions hinge on. Add the tools that *find* unnecessary access (Network Access Analyzer, Inspector reachability, VPC Reachability Analyzer), and you can both design and audit a segmented network.

This lesson covers security groups vs. NACLs in depth, Network Firewall, segmentation strategy, and access analysis. After it you will be able to design segmented network controls and troubleshoot why traffic is allowed or blocked.

---

## Core Concepts

### Security Groups — Stateful, Instance-Level

A **security group** is a virtual firewall attached to an ENI (instance, load balancer, RDS, etc.). Its defining properties: it is **stateful** (if you allow inbound traffic, the return traffic is automatically allowed regardless of outbound rules, and vice versa); it supports **allow rules only** (there is no explicit deny — anything not allowed is implicitly denied); and rules can reference **other security groups** as the source/destination, enabling clean tier-to-tier rules (e.g., "allow the app tier's security group to reach the database tier's security group on 3306"). Security groups are the primary, most-used network control and the right place for most allow-listing. The exam expects fluency in stateful behavior and security-group-referencing for segmentation.

### Network ACLs — Stateless, Subnet-Level

A **network ACL (NACL)** is a firewall at the **subnet boundary**. Its defining properties: it is **stateless** (return traffic is *not* automatically allowed — you must explicitly allow both directions, including ephemeral ports for return traffic); it supports **both allow and deny rules**, evaluated in **numbered order** (lowest first, first match wins); and it applies to all resources in the subnet. NACLs are best for **broad, coarse-grained controls** — for example, an explicit **deny of a malicious IP range** at the subnet edge (something security groups cannot do, since they have no deny). The classic exam contrast: security groups are stateful, allow-only, instance-level; NACLs are stateless, allow-and-deny, subnet-level, ordered. Forgetting that NACLs need explicit ephemeral-port rules for return traffic is a top troubleshooting trap.

### AWS Network Firewall — Stateful Deep Inspection

**AWS Network Firewall** is a managed, scalable network firewall providing capabilities beyond security groups and NACLs: **stateful** and **stateless** rule groups, **deep packet inspection**, **domain-name filtering** (allow/deny by FQDN — e.g., permit only approved external domains), **protocol detection**, and **intrusion prevention** (Suricata-compatible rules). It's deployed in a dedicated firewall subnet and traffic is routed through it, often in a **centralized inspection VPC** with Transit Gateway so all egress/ingress is inspected in one place. Network Firewall is the answer for "filter outbound traffic by domain," "inspect traffic for intrusions," or "centralized layer 3–7 traffic inspection at scale." The exam distinguishes it from security groups/NACLs by its deep-inspection and domain-filtering capabilities.

### Segmentation: North-South and East-West

The exam explicitly tests **segmentation** for **north-south** traffic (between your environment and the outside — internet ingress/egress) and **east-west** traffic (between internal components/tiers/accounts). North-south controls include the edge stack (WAF/CloudFront/Shield), NAT and egress filtering (Network Firewall domain rules), and locking down which subnets are public. East-west controls include security-group-to-security-group rules between tiers, **isolated subnets** with no internet route, and account-level isolation via separate VPCs/accounts connected (or deliberately not connected) through Transit Gateway with controlled route tables. Good segmentation means a compromise in one tier or account cannot freely reach others — the network embodiment of blast-radius minimization.

### Isolated Subnets and Routing

Segmentation is enforced as much by **routing** as by firewalls. A subnet is **private** if its route table has no route to an internet gateway; **isolated** if it has no route to the internet at all (no IGW and no NAT), reachable only within the VPC or via VPC endpoints. Sensitive workloads (databases, key material handling) belong in isolated subnets that can reach AWS services privately through **VPC endpoints** rather than the internet. The exam tests recognizing that route-table design — not just firewall rules — determines reachability, and that endpoints keep isolated subnets functional without internet exposure.

### Finding Unnecessary Access

Task 3.3 calls for **identifying unnecessary network access**. AWS provides analysis tools: **Network Access Analyzer** evaluates your network configuration against defined "scopes" to find unintended access paths (e.g., resources reachable from the internet that shouldn't be); **VPC Reachability Analyzer** tests whether a specific source can reach a specific destination and shows the path (excellent for troubleshooting "why can/can't A reach B"); **Amazon Inspector network reachability findings** flag instances with unintended exposure; and **AWS Verified Access** (next lesson) can replace broad VPN access with per-request, identity-aware access. The exam expects you to use these to audit and prove segmentation, not just configure it.

### Troubleshooting Connectivity

Network troubleshooting is a tested skill, and it follows the layers: check the **security group** (stateful allow on the right port/source), the **NACL** (stateless — both directions, including ephemeral ports), the **route table** (is there a path to the destination/gateway), the **Network Firewall** rules (is traffic being dropped by a stateful rule or domain filter), and any **endpoint policies**. **VPC Flow Logs** show accepted/rejected flows to pinpoint where traffic dies, and **Reachability Analyzer** traces the path. The exam's connectivity questions usually resolve to a missing return-direction NACL rule, a security group not allowing the source, a missing route, or a firewall/endpoint policy deny.

---

## Configuration Reference

Security groups vs. NACLs vs. Network Firewall:

```text
Control            Level     State      Rules            Best for
------------------ --------- ---------- ---------------- ----------------------------
Security group     ENI/inst  stateful   allow only       primary allow-listing, SG-to-SG tiering
Network ACL        subnet    stateless  allow + deny      coarse subnet rules, explicit IP DENY
AWS Network Firewall VPC/route stateful+ allow/deny + IPS domain filtering, deep inspection, central egress
```

Segmentation model:

```text
North-south (in/out):  edge (WAF/CloudFront/Shield) + NAT/egress (Network Firewall domain rules)
East-west (internal):  SG-to-SG tier rules; isolated subnets; per-account VPCs via TGW route control
Routing:               private = no IGW route; isolated = no internet at all (use VPC endpoints)
```

Access analysis / troubleshooting:

```text
Network Access Analyzer    find unintended access paths vs. defined scopes
VPC Reachability Analyzer   test/trace whether source can reach destination
Inspector network findings  flag instances with unintended exposure
VPC Flow Logs               see accepted/rejected flows (pinpoint where traffic dies)
```

Connectivity troubleshooting order:

```text
SG (stateful allow?) → NACL (both directions incl. ephemeral?) → route table (path?)
→ Network Firewall (dropped by stateful/domain rule?) → endpoint policy (deny?)
→ confirm with Flow Logs / Reachability Analyzer
```

---

## How to Decide

- **Primary instance-level allow-listing and tier-to-tier rules?** → security groups (stateful, SG-referencing).
- **Explicitly deny an IP range at the subnet edge?** → network ACL (only NACLs can deny).
- **Filter outbound by domain or inspect traffic for intrusions, centrally?** → AWS Network Firewall.
- **Keep sensitive workloads off the internet entirely?** → isolated subnets + VPC endpoints.
- **Prove no unintended exposure exists?** → Network Access Analyzer / Inspector reachability.
- **Diagnose why A can't reach B?** → Reachability Analyzer + VPC Flow Logs, checking SG/NACL/route/firewall in order.

---

## How This Connects

This lesson is the inward continuation of the edge-security lesson and the network embodiment of blast-radius minimization from Incident Response. It builds on the SAA-level security-groups/NACLs and Network Firewall introductions, takes them to specialty troubleshooting depth, and connects to the next lesson on secure hybrid/private connectivity (VPN, Direct Connect, PrivateLink, Verified Access) and to Detection (VPC Flow Logs as a log source).

---

## Exam Traps

- **Expecting deny rules in security groups.** Security groups are allow-only; explicit denies require NACLs.
- **Forgetting NACL statelessness.** NACLs need explicit rules for *both* directions, including ephemeral return ports — a top connectivity-failure cause.
- **Using NACLs for fine-grained tiering.** Prefer security-group-to-security-group references for tier rules; NACLs are coarse subnet controls.
- **Thinking firewalls alone enforce isolation.** Route tables determine reachability — an isolated subnet has no internet route, not just deny rules.
- **Confusing Network Firewall with security groups.** Network Firewall adds domain filtering and deep inspection that security groups/NACLs cannot do.
- **Auditing segmentation by eye.** Use Network Access Analyzer / Reachability Analyzer to *prove* there's no unintended path.

---

## Summary

Network security on AWS layers three controls with distinct behaviors: security groups (stateful, allow-only, instance-level, and able to reference other security groups for clean tiering), network ACLs (stateless, allow-and-deny, subnet-level, ordered — the only way to explicitly deny an IP range, requiring both-direction rules), and AWS Network Firewall (stateful deep inspection with domain filtering and intrusion prevention, often centralized via Transit Gateway). Segmentation controls north-south traffic at the edge and egress, and east-west traffic with security-group tiering, isolated subnets, and per-account VPC route control — enforced as much by route tables (no internet route, VPC endpoints for private access) as by firewalls. Audit unnecessary access with Network Access Analyzer, Inspector reachability, and Reachability Analyzer, and troubleshoot connectivity by walking SG → NACL → route → firewall → endpoint, confirmed with VPC Flow Logs.

---

## Examples

**Example 1 — Tier rules.** The app tier must reach the database on 3306 and nothing else may → a security group on the DB allowing the **app tier's security group** on 3306 (SG-to-SG), no broad CIDR.

**Example 2 — Block a bad range.** A known malicious IP range must be denied at the subnet edge → a **network ACL deny** rule (security groups can't deny).

**Example 3 — Egress control.** Instances may only reach approved external domains → **AWS Network Firewall** domain allow-list in a central inspection VPC.

**Example 4 — Connectivity bug.** An instance can send but gets no replies → the **NACL** allows outbound but not the inbound **ephemeral ports** for return traffic; add them (NACLs are stateless).

---

## Think About It

An instance in a private subnet can initiate connections to an internal service but receives no responses, while another instance with an identical security group works fine. Knowing security groups are stateful and NACLs are stateless, explain the most likely cause, how you'd confirm it with VPC Flow Logs or Reachability Analyzer, and the fix.

---

## Quick Check

1. State three differences between security groups and network ACLs.
2. Which control can explicitly deny a specific IP range, and why can't the other?
3. What capability does AWS Network Firewall add beyond security groups and NACLs?
4. What makes a subnet "isolated," and how do isolated workloads still reach AWS services?

*Answers: (1) security groups are stateful, allow-only, and instance/ENI-level (and can reference other security groups), while NACLs are stateless, support allow and deny, and are subnet-level and evaluated in numbered order; (2) network ACLs can deny — security groups are allow-only with an implicit deny and no explicit deny rules; (3) stateful deep packet inspection, domain-name (FQDN) filtering, and intrusion prevention, typically centralized; (4) an isolated subnet has no route to the internet (no internet gateway and no NAT), and workloads reach AWS services privately through VPC endpoints.*

---

## What's Next

Next: **Secure Hybrid and Private Connectivity** — Site-to-Site VPN, Direct Connect with MACsec, PrivateLink and VPC endpoints, Client VPN, and AWS Verified Access.
