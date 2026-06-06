---
title: "VPC Peering and Transit Gateway"
type: content
estimated_minutes: 18
cert_tags: ["SAA-C03", "SAP-C02"]
---

# VPC Peering and Transit Gateway

## Overview

Most production AWS environments grow beyond a single VPC. Security requirements drive workload isolation — production and development in separate VPCs, PCI-DSS cardholder data in an isolated environment, shared services (logging, monitoring, artifact repos) in their own VPC. This isolation creates a connectivity challenge: how do you allow specific communication between VPCs without collapsing all isolation? AWS provides two mechanisms at different ends of the complexity and scale spectrum: VPC Peering for direct two-VPC connections, and Transit Gateway for hub-and-spoke connectivity across many VPCs and hybrid networks.

VPC Peering creates a direct, private network route between two VPCs. Traffic flows through the AWS backbone, not the internet — low latency, no encryption overhead required, no bandwidth limit. But peering has a fundamental architectural limitation: it is non-transitive. If VPC A peers with VPC B and VPC B peers with VPC C, VPC A cannot reach VPC C through VPC B. Every pair of VPCs that needs to communicate must have its own dedicated peering connection. For small numbers of VPCs, this is fine. For large numbers, the combinatorial math becomes unmanageable.

Transit Gateway (TGW) solves the scaling problem with a regional hub-and-spoke model. Every VPC and on-premises connection attaches to the TGW once, and the TGW routes between all attachments. Adding a new VPC means one new attachment — not N-1 new peering connections. TGW also supports transitive routing, inter-region peering, centralized route tables for segmentation, and sharing across accounts via Resource Access Manager (RAM). For any organization managing more than a handful of VPCs or building hybrid connectivity, TGW is the standard architecture.

## Core Concepts

### VPC Peering: Direct Private Connectivity

A VPC Peering Connection is a networking construct that creates a direct, private route between two VPCs. The VPCs can be in the same AWS account, different accounts, the same region, or different regions (inter-region peering). Traffic travels over the AWS global backbone, never the public internet.

Requirements and constraints:
- **Non-overlapping CIDR ranges:** The two VPCs must not share any overlapping IP address space. If VPC A uses `10.0.0.0/16` and VPC B uses `10.0.0.0/24`, the peering connection will be rejected — the more specific range is a subset of the broader range and creates routing ambiguity.
- **One-to-one:** A peering connection connects exactly two VPCs. There is no concept of a multi-VPC peering connection.
- **Route table updates required on both sides:** Creating a peering connection does not automatically enable routing. You must add routes to both VPCs' route tables: in VPC A, a route for VPC B's CIDR pointing to the peering connection; in VPC B, a route for VPC A's CIDR pointing to the same peering connection.
- **Security group updates required:** Security groups in the accepting VPC must explicitly allow traffic from the peer VPC's CIDR (or from the peer VPC's security groups for cross-account peering).

**VPC Peering has no bandwidth limit and no single point of failure.** It is a routing construct, not a physical device — AWS handles redundancy and scaling transparently.

### Non-Transitivity: The Core Limitation

Non-transitivity is the defining limitation of VPC Peering. It cannot be configured away — it is a fundamental property of how peering works.

Consider three VPCs: A peers with B (connection 1), and B peers with C (connection 2). Even with routes correctly configured in all three VPCs, VPC A cannot send traffic to VPC C through VPC B. The packet from A arrives at B's VPC router, which checks its route table — the route to C's CIDR exists (pointing to peering connection 2). But AWS explicitly does not forward the packet across a different peering connection. Traffic can only use a peering connection if the source or destination is within the peered VPC.

This is not a configuration problem you can fix with more routes. It is a deliberate design boundary that prevents one VPC from becoming an uncontrolled transit hub for traffic between two other VPCs.

**The full-mesh math:** For N VPCs all to communicate with each other via peering, you need N × (N-1) / 2 peering connections. For reference:
- 5 VPCs: 10 peering connections, 20 route table entries (2 per connection per VPC)
- 10 VPCs: 45 peering connections, 90 route table entries
- 20 VPCs: 190 peering connections, 380 route table entries
- 50 VPCs: 1,225 peering connections, 2,450 route table entries

At 50 VPCs, maintaining 2,450 route table entries and ensuring every new VPC gets peering connections to every other VPC is operationally unmanageable. This is the problem Transit Gateway was built to solve.

### Transit Gateway: Regional Hub-and-Spoke

AWS Transit Gateway is a managed, scalable regional network hub. Instead of each VPC connecting to every other VPC, each VPC connects once to the TGW via a **TGW attachment**. The TGW routes traffic between all attached networks, including VPCs, Site-to-Site VPN connections, and Direct Connect Gateways.

Key TGW capabilities:
- **Transitive routing:** Traffic from VPC A flows to the TGW, which routes it to VPC B — through the hub, not directly. A to C traffic works the same way, through the same hub, without a direct A-to-C connection.
- **Scale:** Up to 5,000 VPC attachments per TGW. Bandwidth up to 50 Gbps per VPC attachment.
- **Route isolation:** Multiple TGW route tables allow you to segment which attachments can reach which others — prod VPCs in one table, dev VPCs in another, shared services visible to all.
- **Inter-region peering:** Two TGWs in different regions can be peered, creating a global transit backbone.
- **RAM sharing:** A TGW in one account can be shared with other accounts via AWS Resource Access Manager, so a central networking account owns the TGW while application accounts attach their VPCs to it.

With N VPCs and a TGW: N attachments (one per VPC), N route table entries in each VPC (one pointing to the TGW), and the TGW handles all inter-VPC routing. Adding a new VPC means creating one attachment — not N-1 new peering connections.

### TGW Route Tables and Traffic Segmentation

Every TGW has at least one route table. A default TGW allows all-to-all routing — every attached VPC and VPN can reach every other one. This is convenient but not appropriate for environments requiring isolation.

TGW route tables work differently from VPC route tables:
- Each TGW attachment is **associated** with one TGW route table (defines which routing table the attachment uses to look up destinations)
- Routes are **propagated** from attachments into route tables (the TGW learns the CIDR of each attached VPC automatically)
- You can control which VPC CIDRs are propagated into which route tables, creating isolation

**Example segmentation design** for an enterprise with prod, dev, and shared services VPCs:

| Route Table | Associated Attachments | Propagated Routes |
|---|---|---|
| prod-rt | prod-vpc-1, prod-vpc-2, prod-vpc-3 | prod VPC CIDRs + shared-services CIDR |
| dev-rt | dev-vpc-1, dev-vpc-2 | dev VPC CIDRs + shared-services CIDR |
| shared-rt | shared-services-vpc | prod VPC CIDRs + dev VPC CIDRs |

Result: Prod VPCs can reach each other and shared services. Dev VPCs can reach each other and shared services. Neither prod nor dev can reach the other. Shared services can reach both. The shared services VPC is the only VPC with routes to both prod and dev — and it does not initiate traffic, only receives it.

### Inter-Region Peering and Cross-Account Sharing

**TGW inter-region peering** connects two TGWs in different regions. Traffic flows over the AWS backbone (not the internet). You create a peering attachment between TGW-us-east-1 and TGW-eu-west-1, and then add static routes to the appropriate TGW route tables pointing cross-region CIDRs at the peering attachment. This creates a global transit backbone where regional TGWs are the hubs.

**RAM sharing** allows a TGW owned by one AWS account to accept attachments from VPCs in other AWS accounts. The typical pattern: a central networking account owns and manages the TGW and all its route tables. Application team accounts create VPCs and attach them to the shared TGW. Application teams do not need TGW creation permissions — only attachment permissions on the shared TGW. This centralizes network governance without forcing all VPCs into one account.

## Configuration Reference

### CLI: VPC Peering Connection

```bash
# Step 1: Create the peering connection (from VPC A's account)
aws ec2 create-vpc-peering-connection \
  --vpc-id vpc-0aaaa1111 \
  --peer-vpc-id vpc-0bbbb2222 \
  --peer-region us-west-2
  # --peer-region: omit if same region; required for cross-region peering
  # --peer-owner-id: add if peer VPC is in a different account
# Returns: VpcPeeringConnectionId (e.g., pcx-0abc1234)

# Step 2: Accept the peering connection (from VPC B's account/region)
aws ec2 accept-vpc-peering-connection \
  --vpc-peering-connection-id pcx-0abc1234
# The peering connection moves to 'active' status

# Step 3: Add route in VPC A pointing to VPC B's CIDR
aws ec2 create-route \
  --route-table-id rtb-0vpc-a-private \
  --destination-cidr-block 10.1.0.0/16 \
  --vpc-peering-connection-id pcx-0abc1234
# 10.1.0.0/16 is VPC B's CIDR

# Step 4: Add route in VPC B pointing to VPC A's CIDR
# (Run this in VPC B's account/region)
aws ec2 create-route \
  --route-table-id rtb-0vpc-b-private \
  --destination-cidr-block 10.0.0.0/16 \
  --vpc-peering-connection-id pcx-0abc1234
# 10.0.0.0/16 is VPC A's CIDR

# Step 5: Update security groups to allow traffic from peer VPC CIDR
aws ec2 authorize-security-group-ingress \
  --group-id sg-0db-in-vpc-b \
  --protocol tcp \
  --port 5432 \
  --cidr 10.0.0.0/16
# Allow PostgreSQL from VPC A's CIDR range
```

### CLI: Transit Gateway Setup

```bash
# Create the Transit Gateway
aws ec2 create-transit-gateway \
  --description "Central TGW for multi-VPC routing" \
  --options DefaultRouteTableAssociation=disable,DefaultRouteTablePropagation=disable
  # Disable defaults so we explicitly control route table associations and propagations
# Returns: TransitGatewayId (e.g., tgw-0abc1234)

# Attach a VPC to the TGW
# The attachment requires at least one subnet per AZ for TGW ENIs
aws ec2 create-transit-gateway-vpc-attachment \
  --transit-gateway-id tgw-0abc1234 \
  --vpc-id vpc-0prod1 \
  --subnet-ids subnet-0prod1a subnet-0prod1b subnet-0prod1c \
  --tag-specifications 'ResourceType=transit-gateway-attachment,Tags=[{Key=Name,Value=prod-vpc-1-attachment}]'
# Returns: TransitGatewayAttachmentId (e.g., tgw-attach-0prod1)

# Create a TGW route table for production VPCs
aws ec2 create-transit-gateway-route-table \
  --transit-gateway-id tgw-0abc1234 \
  --tag-specifications 'ResourceType=transit-gateway-route-table,Tags=[{Key=Name,Value=prod-rt}]'
# Returns: TransitGatewayRouteTableId (e.g., tgw-rtb-0prod)

# Associate the prod VPC attachment with the prod route table
aws ec2 associate-transit-gateway-route-table \
  --transit-gateway-attachment-id tgw-attach-0prod1 \
  --transit-gateway-route-table-id tgw-rtb-0prod

# Propagate the prod VPC's routes into the prod route table
# (TGW learns VPC CIDR automatically and adds it to the specified route table)
aws ec2 enable-transit-gateway-route-table-propagation \
  --transit-gateway-attachment-id tgw-attach-0prod1 \
  --transit-gateway-route-table-id tgw-rtb-0prod

# Add a route in the VPC's route table pointing to TGW for inter-VPC traffic
# (Run this for each VPC attached to the TGW)
aws ec2 create-route \
  --route-table-id rtb-0prod1-private \
  --destination-cidr-block 10.0.0.0/8 \
  --transit-gateway-id tgw-0abc1234
# All traffic to 10.0.0.0/8 (your entire RFC 1918 AWS range) goes through TGW

# Share the TGW with another account using RAM
aws ram create-resource-share \
  --name "central-tgw-share" \
  --resource-arns arn:aws:ec2:us-east-1:123456789012:transit-gateway/tgw-0abc1234 \
  --principals 987654321098
  # 987654321098 is the account ID of the account you're sharing with
```

### Console Navigation

**VPC Peering:** VPC → Peering Connections → Create Peering Connection. After creation, filter by status "Pending Acceptance" to find connections awaiting acceptance in the peer account. After acceptance, go to Route Tables in each VPC and manually add routes.

**Transit Gateway:** VPC → Transit Gateways → Create Transit Gateway. VPC → Transit Gateway Attachments → Create Transit Gateway Attachment (select the TGW, VPC, and at least one subnet per AZ). VPC → Transit Gateway Route Tables → manage associations and propagations.

**RAM:** AWS RAM console → Create Resource Share → select TGW as the resource → add principal account IDs or OU ARNs.

## How to Decide

| Scenario | Use VPC Peering | Use Transit Gateway |
|---|---|---|
| Connecting 2–4 VPCs with stable topology | Yes — simpler, no fixed cost | Overkill for small counts |
| Connecting 5+ VPCs | No — route table management becomes impractical | Yes — one attachment per VPC |
| Need transitive routing (A→B→C) | No — not supported | Yes — built-in |
| Hybrid connectivity (VPN + VPCs through same hub) | No — VPN attaches to VGW, not peering | Yes — VPN and DX attach to TGW |
| Cross-account VPC connectivity (many accounts) | Works but requires many connections and agreements | Yes — RAM sharing with central TGW |
| Inter-region VPC connectivity | Yes — cross-region peering works | Yes — inter-region TGW peering |
| Need traffic segmentation between groups of VPCs | Very difficult — requires route table discipline per connection | Yes — separate TGW route tables |
| Minimizing per-GB cost for high-volume, 2-VPC traffic | Yes — peering charges only data transfer | TGW adds per-GB processing charge |
| Full mesh needed today with expectation of VPC growth | Reconsider — TGW is cheaper at scale | Yes — future-proof architecture |

## How This Connects

- **VPC Fundamentals:** Both peering and TGW require non-overlapping CIDR ranges across all connected VPCs. The CIDR planning decisions made when creating VPCs determine whether future peering is possible. Retroactively re-addressing a production VPC is costly and risky.
- **Security Groups and NACLs:** After peering or TGW attachment, you must update security groups in each VPC to allow traffic from peer VPC CIDRs. NACLs must also be updated to allow inter-VPC traffic — if the subnets involved have custom NACLs, both inbound and outbound rules for the peer CIDR are required.
- **VPN and Direct Connect:** Transit Gateway is the recommended attachment point for hybrid connectivity at scale. A VPN or Direct Connect Gateway attachment on the TGW means all attached VPCs can reach on-premises — one hybrid connection for many VPCs, instead of one VGW per VPC.
- **RAM (Resource Access Manager):** TGW sharing via RAM is the mechanism that makes a central networking account model practical. The networking team owns TGW; application teams attach their VPCs. This is standard practice in AWS Organizations environments.
- **AWS Network Manager:** Provides centralized visibility and monitoring for TGW-connected networks, including route analyzer, topology diagrams, and CloudWatch metrics — particularly useful for large-scale TGW deployments spanning multiple regions and accounts.

## Exam Traps

**VPC Peering is non-transitive — no exceptions, no configuration workarounds.** The most-tested concept in this lesson. An exam question will describe A peered with B and B peered with C, then ask if A can reach C. The answer is always no — not unless there is a direct A-to-C peering connection. No amount of route table modification changes this.

**Route tables must be updated in BOTH VPCs for peering to work — the peering connection alone is not enough.** Creating and accepting a peering connection does not enable any traffic. You must add routes in VPC A pointing VPC B's CIDR to the peering connection, and add routes in VPC B pointing VPC A's CIDR to the peering connection. Many troubleshooting exam questions describe a peering connection that is "active" but traffic cannot flow — the answer is missing route table entries on one or both sides.

**Overlapping CIDRs prevent peering — even partial overlap.** If VPC A uses `10.0.0.0/16` and VPC B uses `10.0.1.0/24`, the connection is rejected because VPC B's CIDR is a subset of VPC A's CIDR. This is not just identical ranges — any overlap blocks the peering connection. This constraint also applies to TGW: two VPCs with overlapping CIDRs cannot both attach to the same TGW and route between each other.

**Transit Gateway is regional — you cannot attach VPCs from different regions to the same TGW.** Cross-region connectivity requires TGW inter-region peering between two separate TGWs, one in each region. Exam questions sometimes describe a multi-region architecture and ask whether a single TGW can serve both regions — it cannot. This is distinct from a Direct Connect Gateway, which can connect to VPCs in multiple regions.

**TGW has per-attachment and per-GB charges; VPC Peering charges only for data transfer.** For very small numbers of VPCs with low data transfer volumes, TGW can be more expensive than peering. The TGW attachment charge (approximately $0.05/hour per attachment) adds up even with minimal traffic. However, the operational savings of TGW at scale typically outweigh the cost difference beyond 5–6 VPCs.

## Summary

- VPC Peering creates direct, private, non-transitive connections between exactly two VPCs; both VPCs must have non-overlapping CIDRs, and route tables must be updated on both sides.
- N VPCs require N×(N-1)/2 peering connections for full mesh — 10 VPCs need 45 connections, making peering impractical at scale.
- Transit Gateway is a regional hub-and-spoke router; each VPC attaches once and the TGW handles transitive routing between all attachments.
- TGW route tables enable traffic segmentation: prod VPCs can be isolated from dev VPCs while both reach shared services, all on the same TGW.
- TGW supports VPN and Direct Connect attachments, making it the central routing hub for hybrid architectures with many VPCs.
- TGW can be shared across accounts via RAM, enabling a central networking account model in AWS Organizations.

## Examples

A two-team startup builds a data pipeline where a production VPC running ETL jobs must read from a separate analytics VPC running Amazon Redshift. They create a VPC peering connection, accept it, update both VPCs' route tables with the peer CIDR, and add a security group rule on the Redshift cluster allowing the ETL instances' security group. The entire setup takes 20 minutes and requires no ongoing management cost beyond standard data transfer fees. Six months later, the team adds a third VPC for their ML training workloads — the ML VPC needs to read from Redshift but does not need access to the ETL VPC. They add two more peering connections (ML↔Analytics, optionally ETL↔ML if needed) and update the corresponding route tables. At three VPCs with limited connectivity requirements, this is manageable. When they reach seven VPCs, the network architect begins evaluating Transit Gateway.

A global logistics company grew from 5 VPCs to 40 over three years through organic growth and acquisitions. They had used VPC Peering throughout and were managing 180 active peering connections, hundreds of route table entries, and a manual approval process for each new peering request. Adding a new VPC required creating 39 peering connections (one to each existing VPC), getting 39 acceptances from different team accounts, and updating 80 route tables. A network rebuild project migrated all VPCs to a Transit Gateway. Each of the 40 VPCs now has a single TGW attachment. The networking team created four TGW route tables: prod, staging, dev, and shared-services. Each VPC's attachment is associated with the appropriate route table and propagates its CIDR only into the tables that should see it. Adding a new VPC now requires: one attachment, one route table association, one propagation configuration, and one VPC route table entry. What previously took a week now takes under an hour.

A global bank designs a multi-region network architecture. They deploy a Transit Gateway in `us-east-1` for their North American VPCs and a Transit Gateway in `eu-west-1` for their European VPCs. They create a TGW inter-region peering connection between the two TGWs and add static routes in each TGW's route table pointing cross-region CIDRs at the peering attachment. North American VPCs can now reach European VPCs through TGW-us-east-1 → TGW inter-region peering → TGW-eu-west-1 → target VPC. Traffic flows over the AWS global backbone, not the internet. For PCI-DSS compliance, the cardholder data environment VPCs in both regions are placed in isolated TGW route tables that only have routes to other CDE VPCs and the shared security monitoring VPC — TGW route tables enforce the segmentation required by compliance without separate physical infrastructure.

## Think About It

1. VPC Peering is explicitly non-transitive. From a security perspective, why is this actually a feature rather than a limitation? What could go wrong if AWS allowed transitive peering — specifically, think about a scenario where a compromised intermediate VPC could affect connectivity between two unrelated VPCs.

2. You have 8 VPCs that currently have no connectivity to each other. Your network architect proposes using full-mesh VPC peering rather than Transit Gateway to avoid the TGW per-attachment hourly cost. How many peering connections are required? How many route table entries must be managed? At what point (number of VPCs, or data transfer volume) does Transit Gateway become cheaper despite the per-attachment charge?

3. Design a TGW route table architecture for a company with these requirements: 3 production VPCs that must communicate with each other; 2 development VPCs that can communicate with each other but not with prod; 1 shared services VPC (DNS, monitoring) that must be reachable from all VPCs but cannot initiate connections to prod or dev; 1 security monitoring VPC that must receive traffic from all VPCs (for flow logs and metrics) but cannot send traffic to any VPC. How many TGW route tables do you need, what are the associations and propagations for each, and how does the security monitoring VPC work?

4. A company acquires a startup whose AWS environment has 5 VPCs all using `10.0.0.0/16` — the same CIDR as the acquiring company's 10 VPCs. The CTO wants to connect all 15 VPCs together via Transit Gateway. What are the technical obstacles, and what are the practical options? Consider the trade-offs between re-addressing, using a NAT layer, and accepting the connectivity limitation.

5. TGW charges approximately $0.05/hour per attachment and $0.02/GB for data processed. VPC Peering charges $0.01/GB for intra-region data transfer. For a scenario with 6 VPCs all transferring data to a central shared-services VPC at 50 GB/day, calculate the approximate monthly cost of each approach and identify the break-even point where TGW becomes cheaper.

## Quick Check

**Q1.** VPC A is peered with VPC B. VPC B is peered with VPC C. An EC2 instance in VPC A sends a packet to an IP address in VPC C. What happens?

- A) The packet is routed through VPC B to VPC C, provided route tables in VPC B are configured correctly
- B) The packet is dropped — VPC Peering is non-transitive and VPC B cannot forward traffic between two different peering connections
- C) The packet is delivered if VPC A and VPC C are in the same AWS account
- D) The packet is delivered but with higher latency due to the additional hop through VPC B

**Answer: B** — VPC Peering is strictly non-transitive. AWS will not forward a packet arriving on one peering connection across a different peering connection, regardless of route table configuration. A direct peering connection between VPC A and VPC C is required for A-to-C traffic.

**Q2.** A company has 12 VPCs that all need full mesh connectivity. How many VPC peering connections are required if they use VPC Peering instead of Transit Gateway?

- A) 12
- B) 24
- C) 66
- D) 144

**Answer: C** — Full mesh peering requires N×(N-1)/2 connections. For 12 VPCs: 12×11/2 = 66 peering connections. Each connection also requires 2 route table entries (one in each VPC), for a total of 132 route table entries to manage.

**Q3.** A company wants to prevent its development VPCs from communicating with production VPCs, while both sets should be able to reach a shared services VPC. All VPCs are attached to the same Transit Gateway. Which configuration achieves this?

- A) Create separate Transit Gateways for prod and dev VPCs and peer them to the shared services VPC
- B) Use NACLs on the shared services subnets to block direct traffic between prod and dev VPCs
- C) Create separate TGW route tables for prod and dev, each propagating only their own VPC routes plus the shared services VPC route
- D) Attach prod and dev VPCs to different subnets within the shared TGW

**Answer: C** — TGW route tables control which routes are visible to which attachments. A prod route table propagating only prod CIDRs and the shared services CIDR means prod VPCs have no route to dev VPCs, and vice versa. Both tables include the shared services CIDR, so both can reach it. This requires only one TGW with multiple route tables.

## What's Next

Next up: VPN and Direct Connect — extending your VPC to on-premises networks via encrypted internet tunnels and dedicated fiber connections.
