---
title: "VPC Design Patterns and CIDR Planning"
type: content
estimated_minutes: 15
cert_tags: ["SAA-C03", "SAP-C02"]
---

# VPC Design Patterns and CIDR Planning

## Overview

Every production AWS environment is built on a VPC network design, and that design is largely irreversible once workloads are running. You can't rename subnets without impact, but more critically you can't change a VPC's primary CIDR without rebuilding it, and you can't peer two VPCs whose address ranges overlap. The decisions you make at the start — how many VPCs, how to size them, how to structure subnets, whether to share a VPC across environments — determine what you can and cannot connect for the life of the organization's AWS presence. Getting this wrong is expensive to fix. This lesson covers the established patterns that avoid those dead ends.

The patterns exist on a spectrum from simple to complex. A single VPC with two tiers of subnets is appropriate for a small team or a prototype. Separate VPCs per environment (prod, staging, dev) add isolation between stages and are suitable for growing teams. A multi-account architecture with AWS Organizations, separate VPCs per account, and a shared Transit Gateway connecting them is the recommended pattern for anything operating at organizational scale — it provides blast radius isolation, separate billing, separate IAM boundaries, and the ability to apply SCPs (Service Control Policies) per environment. Understanding when to graduate from one pattern to the next, and how to design the CIDR space to support all of them, is core to AWS architecture competency.

Running through all of these patterns is the problem of IP address management. VPCs need CIDR ranges that don't overlap with each other, with on-premises networks, or with future VPCs that don't exist yet. In a small environment this is managed manually. At organizational scale — dozens of accounts, hundreds of VPCs, multiple regions, Direct Connect to on-premises — manual CIDR management breaks down. AWS VPC IP Address Manager (IPAM) is the managed service that centralizes CIDR allocation, enforces non-overlap, tracks utilization, and integrates with AWS Organizations to provide a single view of IP usage across an entire organization. IPAM is increasingly exam-relevant and is the expected answer for any question about centralized IP management at scale.

---

## Core Concepts

### Single VPC Pattern — Simple, Appropriate for Small Teams

The simplest pattern: one VPC, all workloads inside it, subnets divided by tier and availability zone. This is appropriate for a startup with one product, a development environment, or a proof-of-concept. The VPC contains public subnets (load balancers, NAT Gateways), private application subnets (compute), and private data subnets (databases). Security groups enforce traffic rules between tiers.

The limitation of the single VPC pattern becomes apparent when the organization grows: development and production workloads share the same VPC, which means a misconfigured EC2 instance in dev can potentially reach production databases over private IPs. There is no network boundary between environments — only security group rules and IAM policies. Security teams with compliance requirements (PCI DSS, HIPAA, SOC 2) typically cannot accept this model for more than a brief period.

### Multi-VPC Per Environment — Network Isolation Between Stages

The next level: separate VPCs for prod, staging, and dev. Each environment has its own address space, its own security groups, and its own route tables. A compromised instance in dev has no network path to prod resources — the environments are network-isolated, not just policy-isolated. Environments can be in the same account (simpler) or different accounts (stronger isolation, recommended).

VPC Peering or Transit Gateway connects VPCs that need to share resources (e.g., a shared services VPC hosting monitoring and authentication). VPC Peering is a direct one-to-one connection with no transitive routing — if VPC A peers with VPC B and VPC B peers with VPC C, A cannot reach C through B. This limits VPC Peering to small numbers of connections. Transit Gateway supports transitive routing and scales to hundreds of VPCs.

### Multi-Account with AWS Organizations — Recommended at Scale

The recommended pattern for any organization beyond small teams: each environment lives in a separate AWS account, not just a separate VPC. Account-level isolation provides guarantees that VPC isolation alone cannot:

- **IAM boundary**: IAM roles in the prod account cannot be assumed from the dev account (without explicit trust policies). Credentials leaked from dev have no access to prod.
- **Service quotas**: Each account has its own EC2, RDS, and Lambda quotas. A runaway process in dev cannot exhaust prod's capacity limits.
- **Billing separation**: Cost is tracked per account. Dev spending does not obscure prod costs.
- **SCP enforcement**: Service Control Policies in AWS Organizations can prevent dev accounts from creating public S3 buckets, disabling CloudTrail, or launching resources in unapproved regions — controls that cannot be enforced at the VPC level.
- **Blast radius**: A security incident in a dev account is contained to that account. The attacker gains dev credentials — not prod.

AWS Control Tower provides the account provisioning framework: it sets up an AWS Organization with a management account, a Log Archive account (centralized S3 bucket for CloudTrail and Config logs from all accounts), an Audit account (security tools, read-only cross-account access), and then workload accounts in OUs (organizational units) — typically a Prod OU, a Non-Prod OU, and a Sandbox OU. Each new workload account is provisioned via an Account Vending Machine (automated via Control Tower Account Factory) with pre-approved guardrails and a VPC baseline applied automatically.

### Hub-and-Spoke with Transit Gateway — Centralized Connectivity

In a multi-account, multi-VPC organization, Transit Gateway (TGW) is the connectivity hub. Each spoke VPC attaches to TGW; TGW route tables control which attachments can route to which. This replaces a mesh of VPC Peering connections that would become unmanageable at scale (n VPCs require n*(n-1)/2 peering connections for full mesh; TGW requires n attachments).

Common TGW route table design for a multi-account org:

- **Spoke VPC route table**: routes to other spokes and to the shared services VPC are in TGW. Default route (internet) routes to an inspection or egress VPC.
- **Shared services route table**: allows spoke VPCs to reach shared services (DNS, authentication, monitoring). Does not allow spoke-to-spoke routing — preventing dev from reaching prod via the shared services path.
- **Inspection VPC route table**: receives all internet-bound traffic from spokes, passes through Network Firewall, routes approved traffic to the egress VPC with NAT and IGW.

TGW also supports VPN attachments (connecting on-premises networks) and Direct Connect Gateway attachments (for dedicated fiber connectivity). A single TGW can serve as the connectivity hub for both cloud VPCs and hybrid on-premises connectivity, making it the central networking primitive in large AWS organizations.

### Three-Tier Subnet Architecture — The Standard Reference Model

Within any single VPC, the standard subnet layout is three tiers across at least two Availability Zones:

| Tier | Subnet Name | Typical CIDR Size | What Lives Here |
|---|---|---|---|
| Public | public-1a, public-1b | /24 (254 IPs) | ALB, NLB, NAT Gateway, bastion host |
| Private App | private-app-1a, private-app-1b | /22 (1,022 IPs) | EC2 ASG, ECS tasks, Lambda (VPC), internal ALB |
| Private Data | private-data-1a, private-data-1b | /24 (254 IPs) | RDS, Aurora, ElastiCache, Redshift, OpenSearch |

Route tables enforce the traffic flow:
- **Public subnet**: IGW as default route. NAT Gateway is placed here to provide outbound internet for private subnets.
- **Private app subnet**: default route to NAT Gateway (or Network Firewall endpoint). No direct internet route.
- **Private data subnet**: no default route to internet. Inbound only from private app subnets via security groups. No outbound internet permitted.

Security groups enforce inter-tier rules: the ALB security group allows port 443 from the internet; the app EC2 security group allows port 8080 from the ALB's security group ID; the RDS security group allows port 5432 from the app EC2 security group ID. No tier can initiate connections to a tier above it.

### CIDR Planning — Non-Overlap Is Non-Negotiable

The fundamental CIDR planning rule: VPCs that might ever need to communicate must have non-overlapping address spaces. This includes VPCs in the same region, different regions, and your on-premises network. Overlap cannot be fixed without rebuilding the VPC — there is no CIDR rename operation.

**Recommended starting framework for a multi-account organization:**

| Use | Address Range | Notes |
|---|---|---|
| On-premises (existing) | 192.168.0.0/16 | Do not use in AWS |
| AWS us-east-1 VPCs | 10.0.0.0/8 → allocate /16 per VPC | Use 10.x.0.0/16 pattern |
| AWS us-west-2 VPCs | 10.1.0.0/16 to 10.15.0.0/16 | Region-prefixed allocation |
| AWS eu-west-1 VPCs | 10.16.0.0/16 to 10.31.0.0/16 | Region-prefixed allocation |
| Shared services VPC | 10.0.0.0/16 | Central hub VPC |
| Prod workload accounts | 10.1.0.0/16, 10.2.0.0/16 ... | One /16 per account |
| Non-prod accounts | 10.32.0.0/16, 10.33.0.0/16 ... | Separate range for isolation |

Use /16 for VPC CIDRs (65,536 addresses) and divide into /22 for large private subnets and /24 for smaller tiers. Leave portions of the VPC CIDR unallocated for future subnet additions — it is trivial to add a new subnet to an existing VPC CIDR range, but impossible to grow the CIDR range itself without adding a secondary CIDR (AWS supports up to 5 secondary CIDRs per VPC, but this adds operational complexity).

### AWS VPC IPAM — Centralized IP Address Management

AWS VPC IP Address Manager (IPAM) is a managed service that centralizes CIDR allocation and tracking for AWS organizations. IPAM operates through a hierarchy of pools:

- **Top-level pool**: the root address space for the organization (e.g., 10.0.0.0/8)
- **Regional pools**: carved from the top-level pool for each AWS region (e.g., 10.0.0.0/12 for us-east-1)
- **Environment pools**: carved from regional pools for prod, non-prod (e.g., 10.0.0.0/16 for us-east-1 prod)
- **VPC allocation**: when a VPC is created, it draws a CIDR from the appropriate pool — IPAM enforces non-overlap automatically

IPAM integrates with AWS Organizations: it can discover all VPCs across all accounts in the organization, map their CIDRs, and detect overlaps. VPC creation can be configured to require IPAM allocation — preventing teams from picking arbitrary CIDRs that conflict with existing ranges. Utilization metrics show which pools are running low, triggering CIDR expansion planning before capacity is exhausted.

### IPv6 Considerations

AWS VPCs support dual-stack IPv4/IPv6. AWS assigns a /56 IPv6 CIDR from Amazon's pool (no cost for the address space itself). Each IPv6 address is globally unique and internet-routable — there is no RFC 1918 equivalent for IPv6 and no IPv6 NAT.

Key architectural difference: IPv4 private subnets use NAT to access the internet, providing implicit inbound blocking (NAT creates session state — unsolicited inbound connections are dropped). IPv6 private subnets use an **Egress-Only Internet Gateway** for outbound-only internet access. The EIGW works like NAT Gateway in terms of blocking unsolicited inbound connections, but it is free (no data processing charge, no hourly charge). Instances in subnets with only an EIGW route get outbound internet access but are not reachable from the internet.

For subnets that should have no internet access whatsoever (data subnets, for example), simply do not add an IPv6 route to the internet or EIGW. The address being globally routable does not mean it is reachable — routing controls whether inbound traffic can reach it, not the address type.

---

## Configuration Reference

### IPAM Pool Hierarchy (CLI)

```bash
# Step 1: Create the IPAM (organization-wide, deployed in a home region)
aws ec2 create-ipam \
  --description "Organization IPAM" \
  --operating-regions RegionName=us-east-1 RegionName=us-west-2 RegionName=eu-west-1
# Note the IPAM ID returned

IPAM_ID="ipam-0abc12345"

# Step 2: Create the top-level pool (organization root address space)
aws ec2 create-ipam-pool \
  --ipam-scope-id scope-<private-scope-id> \
  --address-family ipv4 \
  --description "Org root pool 10.0.0.0/8"
# Note the pool ID

ROOT_POOL="ipam-pool-0root"

# Provision the CIDR into the root pool
aws ec2 provision-ipam-pool-cidr \
  --ipam-pool-id $ROOT_POOL \
  --cidr 10.0.0.0/8

# Step 3: Create a regional sub-pool (allocate from root pool)
aws ec2 create-ipam-pool \
  --ipam-scope-id scope-<private-scope-id> \
  --address-family ipv4 \
  --locale us-east-1 \
  --source-ipam-pool-id $ROOT_POOL \
  --description "us-east-1 regional pool 10.0.0.0/12"

USE1_POOL="ipam-pool-0use1"

aws ec2 allocate-ipam-pool-cidr \
  --ipam-pool-id $ROOT_POOL \
  --netmask-length 12   # allocates a /12 from the /8 for us-east-1

# Step 4: Create an environment sub-pool from the regional pool
aws ec2 create-ipam-pool \
  --ipam-scope-id scope-<private-scope-id> \
  --address-family ipv4 \
  --locale us-east-1 \
  --source-ipam-pool-id $USE1_POOL \
  --description "us-east-1 prod environment" \
  --allocation-min-netmask-length 16 \
  --allocation-max-netmask-length 16
# min and max of 16 forces VPCs to take exactly a /16 from this pool

PROD_POOL="ipam-pool-0prod"

# Step 5: Create a VPC using IPAM allocation (instead of specifying a CIDR manually)
aws ec2 create-vpc \
  --ipv4-ipam-pool-id $PROD_POOL \
  --ipv4-netmask-length 16
# IPAM assigns the next available /16 from the prod pool
# Guaranteed non-overlapping with all other VPCs that used IPAM
```

---

### Three-Tier VPC Reference: Subnet and Route Table Design

**VPC CIDR: 10.1.0.0/16 (us-east-1, prod account)**

| Subnet | CIDR | AZ | Route Table | Default Route Target |
|---|---|---|---|---|
| public-1a | 10.1.0.0/24 | us-east-1a | rtb-public | IGW |
| public-1b | 10.1.1.0/24 | us-east-1b | rtb-public | IGW |
| private-app-1a | 10.1.4.0/22 | us-east-1a | rtb-app-1a | NAT GW (AZ 1a) |
| private-app-1b | 10.1.8.0/22 | us-east-1b | rtb-app-1b | NAT GW (AZ 1b) |
| private-data-1a | 10.1.12.0/24 | us-east-1a | rtb-data | (no default route) |
| private-data-1b | 10.1.13.0/24 | us-east-1b | rtb-data | (no default route) |
| Reserved | 10.1.14.0/23 – 10.1.255.0/24 | — | — | Future use |

CLI to create one example subnet:
```bash
# Create private app subnet in AZ 1a
aws ec2 create-subnet \
  --vpc-id vpc-0abc12345 \
  --cidr-block 10.1.4.0/22 \
  --availability-zone us-east-1a \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=private-app-1a},{Key=Tier,Value=app},{Key=Environment,Value=prod}]'
```

---

### Console Path for IPAM

**VPC → IP Address Manager → Create IPAM**
- Select operating regions (regions where IPAM will track and allocate)
- Enable integration with AWS Organizations to discover VPCs across all member accounts
- Create pools: top-level → regional → environment
- Set allocation min/max netmask per pool to enforce VPC sizing standards
- View IP usage dashboard: utilization percentage per pool, per VPC, overlap detection

---

## How to Decide

| Situation | Recommended Pattern | Reasoning |
|---|---|---|
| Single product, small team (<10 engineers) | Single VPC, three-tier subnets | Simplicity wins; minimal compliance requirements |
| Multiple environments, one team | Separate VPCs per env, same or different accounts | Network isolation between prod and dev |
| Multiple teams, production workloads | Multi-account (Control Tower), VPC per account | IAM boundary, blast radius, SCP enforcement |
| Need to connect 3+ VPCs | Transit Gateway hub-and-spoke | VPC Peering doesn't scale past a few connections |
| Shared services (DNS, auth, monitoring) | Shared services VPC attached to TGW | Central services accessible to all spokes |
| Centralized security inspection | Inspection VPC + TGW routing | Route all egress through Network Firewall |
| 10+ VPCs, need non-overlapping CIDRs | AWS IPAM | Automates allocation, prevents overlap, tracks use |
| Hybrid connectivity | DX or VPN attached to TGW | TGW propagates routes to all attached VPCs |
| IPv6 outbound-only for private subnets | Egress-Only IGW | Free; blocks unsolicited inbound, allows egress |

---

## How This Connects

- **Transit Gateway** is the backbone of the hub-and-spoke pattern. TGW route tables control which VPCs can reach which — enabling fine-grained east-west traffic control and the centralized inspection VPC pattern from the Network Firewall lesson.
- **VPC Endpoints** (Gateway and Interface) are placed in the three-tier model's private subnets. Gateway Endpoints add routes to private subnet route tables. Interface Endpoints provision ENIs in private subnets with security groups allowing port 443. The three-tier layout directly informs where these components land.
- **AWS Organizations and Control Tower** are the organizational layer above VPC design. SCPs restrict what accounts can do (preventing resource creation outside approved regions, preventing public S3 buckets). Control Tower's Account Factory automates VPC creation with the right baseline CIDR from IPAM.
- **AWS IPAM** integrates with VPC creation and with Organizations. IPAM pools can be shared across accounts using AWS Resource Access Manager (RAM) — member accounts draw from the organization's IPAM pools, and the central network account monitors total utilization.
- **Direct Connect and VPN** connect on-premises networks to the hub. Designing CIDR space that doesn't overlap with on-premises RFC 1918 ranges (typically 192.168.0.0/16 or 172.16.0.0/12) is a requirement for hybrid connectivity to work — CIDR planning and hybrid connectivity are directly coupled.

---

## Exam Traps

**"VPC Peering scales to any number of VPCs."** It does not. VPC Peering is one-to-one and non-transitive — if VPC A peers with B and B peers with C, A cannot reach C through B. For more than a handful of VPCs, VPC Peering becomes a management burden. Transit Gateway is the scalable alternative and is almost always the correct answer when the question involves more than two or three VPCs.

**"You can change a VPC's CIDR block if you need to resolve an overlap."** You cannot change a VPC's primary CIDR. You can add secondary CIDRs (up to 5 total), but secondary CIDRs cannot overlap with the primary or with each other, and adding them does not resolve existing overlap with another VPC you need to peer with. CIDR planning must happen upfront.

**"Multi-account isolation is only about billing — VPCs provide the same security isolation."** Account-level isolation provides IAM boundaries, separate service quotas, and SCP enforcement that VPC isolation alone cannot replicate. A security group misconfiguration in the same account could expose resources across VPCs, but a misconfiguration in a dev account has no path to a prod account without explicit cross-account IAM trust. The security model is fundamentally different.

**"Egress-Only Internet Gateways are the IPv6 equivalent of NAT Gateways, so they must cost the same."** EIGW is free — no hourly charge, no data processing charge. NAT Gateway charges for both. This pricing difference matters for architecture decisions involving IPv6. AWS's reasoning is that IPv6 does not require address translation, so the EIGW is simpler infrastructure.

**"AWS IPAM prevents all CIDR overlaps automatically."** IPAM prevents overlaps for VPCs created using IPAM allocation. VPCs created manually with a user-specified CIDR are not checked by IPAM unless you configure VPC creation to require IPAM allocation. IPAM can discover and report on manually-created VPCs, but it cannot retroactively prevent their creation.

---

## Summary

- The **three-tier subnet pattern** (public / private-app / private-data across 2+ AZs) is the standard production VPC layout. Each tier has its own route table and security group rules enforcing one-way traffic flow.
- **Single VPC** is appropriate for small teams. **Multi-VPC per environment** adds network isolation. **Multi-account with AWS Organizations** is the recommended pattern at organizational scale — it provides IAM boundaries, blast radius isolation, and SCP enforcement.
- **Transit Gateway** enables hub-and-spoke connectivity for many VPCs. TGW route tables control traffic segmentation between spoke VPCs, shared services, inspection VPCs, and hybrid on-premises connections.
- **CIDR planning** must happen upfront. VPC primary CIDRs cannot be changed, and overlapping CIDRs block peering and TGW connectivity permanently. Plan for growth, leave address space unallocated, and keep AWS address ranges separate from on-premises RFC 1918 ranges.
- **AWS IPAM** centralizes CIDR allocation across an organization, enforces non-overlap, tracks utilization, and integrates with AWS Organizations. IPAM pools can be shared across accounts via Resource Access Manager.
- **IPv6** is globally routable with no NAT. Use an **Egress-Only Internet Gateway** (free) for outbound-only IPv6 access from private subnets, analogous to NAT Gateway for IPv4.

---

## Examples

A startup with five engineers and one product deploys their first production AWS environment. Their architect sets up a single VPC (10.0.0.0/16) in us-east-1 with two public subnets (/24 each), two private application subnets (/22 each), and two private data subnets (/24 each). They leave 10.0.64.0/10 unallocated for future use. An ALB in the public subnets fronts an ECS cluster in the private app subnets; an RDS Aurora cluster runs in the private data subnets. Six months later they need to add a staging environment. Rather than adding subnets to the prod VPC, they create a second VPC (10.1.0.0/16) in the same account for staging — non-overlapping, isolated at the network layer, and connected to prod only via a VPC Peering connection for a specific shared service. The upfront CIDR planning made this trivial. If they had used 10.0.0.0/16 for both environments, they couldn't peer them.

A company with 200 engineers across 12 product teams migrates from a legacy setup (three giant VPCs with everything mixed together) to a multi-account Control Tower architecture. Each of their 12 teams gets a dedicated AWS account for production and a separate account for non-production. The network team creates a centralized Network account with a Transit Gateway. Each workload account's VPC attaches to TGW. A shared services VPC in the Network account hosts a Route 53 Resolver for internal DNS, a Secrets Manager Interface Endpoint shared via PrivateLink, and a Network Firewall deployment for centralized egress inspection. TGW route tables are designed so that spoke VPCs can reach the shared services VPC but cannot reach each other directly — cross-team traffic must go through the inspection path. Six months after launch, a security incident in one team's dev account is fully contained — the compromised credentials have no network path to any other account.

A large enterprise with 80 AWS accounts across four regions and a 100 Gbps Direct Connect to their on-premises data center deploys AWS IPAM. Their on-premises network uses 10.0.0.0/8 — so they allocate a 172.16.0.0/12 space for AWS (one of the remaining RFC 1918 ranges not in use on-premises). The IPAM top-level pool is 172.16.0.0/12. Regional pools carve out /16 blocks per region. Environment pools further subdivide into /20 blocks per account type. The Account Factory automation in Control Tower draws a /16 from the correct pool when provisioning each new account's VPC — zero human review required for IP allocation. The IPAM dashboard shows that us-east-1's production pool is 70% utilized, triggering a project to expand the regional allocation before new accounts run out of CIDRs. The network team moves from reactive CIDR firefighting to proactive capacity planning.

---

## Think About It

1. The three-tier VPC pattern places databases in private data subnets with no default internet route and security groups allowing only traffic from the application tier. What specific threats does this layout prevent that would be possible in a flat single-tier VPC? If you collapsed all three tiers into one subnet, what attack scenarios would become possible that are blocked in the three-tier model?

2. You are designing CIDR ranges for a company that will have 30 AWS accounts across three regions, with Direct Connect to an on-premises network using 10.0.0.0/8. The company expects to grow to 100 accounts over three years. What address space do you recommend for AWS, how do you allocate it across regions and accounts, and what margins do you build in for growth? Walk through the full allocation logic.

3. AWS Organizations account-level isolation provides security properties that VPC isolation within one account does not. A security architect argues that multi-account is overkill — strong security groups and IAM policies in a single account achieve the same result. Identify three specific security properties that account-level isolation provides that cannot be replicated with VPC isolation alone in a single account.

4. In a hub-and-spoke TGW architecture, a misconfigured TGW route table could allow a dev VPC to reach production databases. How would you design TGW route tables to ensure that dev VPCs can reach shared services (DNS, monitoring) but cannot reach production VPCs? What would the TGW attachment and route table structure look like?

5. AWS IPAM prevents CIDR overlap for VPCs that allocate from IPAM pools, but teams can still create VPCs manually with arbitrary CIDRs unless you enforce IPAM usage. What AWS controls would you use to enforce that all VPC creation must use IPAM allocation — and how would you handle the transition for existing manually-created VPCs that are already deployed?

---

## Quick Check

**Q1.** A solutions architect needs to connect 15 VPCs across five AWS accounts so that all VPCs can communicate with a central shared services VPC. Which connectivity approach should they use?

- A) Create VPC Peering connections between each VPC and the shared services VPC
- B) Deploy a Transit Gateway and attach all 15 VPCs plus the shared services VPC to it
- C) Use AWS Direct Connect to connect all VPCs through the on-premises network
- D) Enable VPC sharing through AWS Resource Access Manager to merge all VPCs

**Answer: B** — Transit Gateway scales to hundreds of VPC attachments and supports transitive routing. VPC Peering would require 15 separate peering connections to the shared services VPC and does not support transitive routing between spokes. TGW is the correct answer whenever the question involves more than a few VPCs needing centralized connectivity.

---

**Q2.** A company plans to use VPC Peering to connect their AWS VPCs to each other and to their on-premises network for future Direct Connect. What CIDR planning requirement must they meet for this to work?

- A) All VPCs must use /24 subnets to support the peering protocol
- B) All VPCs and on-premises networks that may ever need to connect must have non-overlapping CIDR ranges
- C) VPC CIDRs must fall within the 10.0.0.0/8 range to be eligible for peering
- D) Each VPC must have a secondary CIDR that does not overlap with the primary

**Answer: B** — VPC Peering, Transit Gateway, and Direct Connect all require non-overlapping CIDR ranges between connected networks. Overlapping CIDRs permanently block these connectivity options, and VPC primary CIDRs cannot be changed after creation. CIDR planning must account for all possible future connections.

---

**Q3.** An organization uses AWS IPAM to manage IP allocations across 50 accounts. A developer creates a new VPC by manually specifying a CIDR block instead of using IPAM allocation. What is the result?

- A) The VPC creation fails because IPAM blocks manual CIDR specification
- B) IPAM detects the VPC through Organizations integration and retroactively assigns it to the correct pool
- C) The VPC is created with the specified CIDR but IPAM does not enforce non-overlap for manually-specified CIDRs; the VPC may overlap with IPAM-allocated VPCs
- D) The VPC is created but immediately quarantined by IPAM until an administrator approves the CIDR

**Answer: C** — IPAM enforces non-overlap only for VPCs that allocate their CIDR from an IPAM pool. Manually-specified CIDRs bypass IPAM allocation and may overlap with other VPCs. To prevent this, you must use SCPs or IAM policies to block VPC creation requests that do not reference an IPAM pool allocation. IPAM can discover and report on manually-created VPCs, but it cannot block their creation without additional controls.

---

## What's Next

Next: the Module 13 Canvas Lab — build a multi-subnet VPC with public and private tiers, NAT Gateway, VPC Endpoints, and routing verification.
