---
title: "VPC Peering and Transit Gateway"
type: content
estimated_minutes: 10
cert_tags: ["SAA-C03", "SAP-C02"]
---

# VPC Peering and Transit Gateway

## Overview

When applications span multiple VPCs or need to communicate with on-premises networks, you need inter-VPC connectivity. VPC Peering connects two VPCs directly; Transit Gateway is a managed hub for connecting many VPCs and on-premises networks at scale.

## VPC Peering

VPC Peering creates a direct network connection between two VPCs (same region, cross-region, or cross-account) using private IP addresses. Peering is non-transitive — if VPC A peers with VPC B, and VPC B peers with VPC C, A cannot reach C through B. For 3 VPCs all to communicate, you need 3 peering connections (A-B, B-C, A-C). Peering requires non-overlapping CIDR ranges and explicit route table entries in each VPC. No bandwidth limits, no single point of failure, no additional charge (data transfer fees apply).

## Transitive Peering Problem

Non-transitivity is the key limitation of VPC Peering. An organization with 50 VPCs would need up to 1,225 peering connections to create full mesh connectivity. Managing route tables for this many connections is operationally impractical. This is the problem Transit Gateway solves.

## Transit Gateway (TGW)

TGW is a managed, scalable regional network hub. You attach VPCs and on-premises connections (VPN, Direct Connect Gateway) to the TGW. All attached networks can communicate through the hub without point-to-point connections. Route tables on the TGW control which attachments can reach which others (segmentation). TGW supports up to 5,000 attachments and routes traffic at up to 50 Gbps per attachment. TGW peering connects TGWs across regions for global routing.

## TGW Route Tables and Segmentation

TGW has its own route tables (separate from VPC route tables). Each attachment is associated with a TGW route table. The default route table allows all-to-all communication. For segmentation: create separate route tables — e.g., prod VPCs only talk to each other, dev VPCs are isolated. This is the standard multi-VPC network isolation architecture for enterprises.

## Summary

VPC Peering is simple and cost-effective for a few VPCs but doesn't scale. Transit Gateway is the hub-and-spoke solution for many VPCs, enabling centralized routing and segmentation with a single attachment per VPC. Use peering for simple two-VPC cases; TGW for anything with 5+ VPCs or hybrid connectivity.

## Examples

A two-person startup builds a data pipeline where a production VPC runs ETL jobs that need to read from a separate analytics VPC running Redshift. They create a single VPC peering connection between the two VPCs, add the appropriate route table entries, and update security groups to allow the Redshift port from the ETL instances' security group. The setup takes under 30 minutes and has no ongoing fixed cost beyond data transfer. This is the ideal VPC peering use case: two VPCs, a clear and stable connectivity need, and no requirement for routing through a third VPC.

A global logistics company has grown to 40 VPCs across production, staging, dev, and regional environments, all of which need varying degrees of connectivity to a shared services VPC running DNS, monitoring, and a software artifact repository. They had used peering but were managing 180+ peering connections and hundreds of route table entries. After migrating to Transit Gateway, each VPC has a single TGW attachment. Prod VPCs are associated with a prod TGW route table that excludes dev VPCs; dev VPCs are associated with a dev route table that cannot reach prod. The shared services VPC is propagated into all route tables. What took days to update now takes minutes, and new VPCs are onboarded in under an hour.

A large bank is designing network segmentation for PCI-DSS compliance. They need cardholder data environment (CDE) VPCs to communicate with each other but be completely isolated from all non-CDE VPCs, even though both sets attach to the same Transit Gateway. They create two separate TGW route tables: one for CDE attachments (propagating only CDE VPC routes) and one for non-CDE attachments. Despite sharing the same TGW infrastructure, the routing tables enforce hard isolation — a mis-routed packet from a non-CDE VPC simply has no route to reach a CDE VPC. This is TGW segmentation used for compliance rather than just operational convenience.

## Think About It

1. VPC Peering is non-transitive by design. What would actually need to change in the underlying AWS routing infrastructure to make peering transitive, and why might AWS have deliberately chosen not to support it?

2. You have 10 VPCs. At what point (number of VPCs, frequency of topology changes, need for segmentation) would you choose Transit Gateway over a full mesh of peering connections? What factors push the decision in each direction?

3. Transit Gateway route tables control which attachments can reach which others. How would you design TGW route tables for an organization that requires: production VPCs to communicate with each other, dev VPCs to communicate with each other, but neither prod nor dev to communicate with the other, while both can reach a shared services VPC?

4. VPC Peering requires non-overlapping CIDRs. Transit Gateway has the same requirement. What happens in practice when a company acquires another company whose AWS VPCs use the same RFC 1918 address space — what are the options and their trade-offs?

5. TGW charges per attachment-hour and per GB of data processed. VPC Peering charges only for data transfer. For a scenario with 5 VPCs that transfer very small amounts of data (a few MB/day), which is likely cheaper? Does that change if data transfer grows to 10 TB/day?

## Quick Check

**Q1.** VPC A peers with VPC B, and VPC B peers with VPC C. Can VPC A communicate with VPC C through VPC B?
- A) Yes, as long as route tables in VPC B are configured correctly
- B) No, VPC Peering is non-transitive
- C) Yes, but only if all three VPCs are in the same AWS account
- D) Yes, but only within the same AWS region

**Answer: B** — VPC Peering is non-transitive by design. A to C communication requires a direct peering connection between A and C; traffic cannot route through an intermediate VPC.

**Q2.** What is the primary problem that Transit Gateway solves compared to VPC Peering?
- A) VPC Peering does not support cross-region connectivity
- B) VPC Peering does not encrypt traffic between VPCs
- C) VPC Peering does not scale — full mesh connectivity for many VPCs requires an impractical number of connections and route table entries
- D) VPC Peering is more expensive than Transit Gateway for all use cases

**Answer: C** — The core limitation of VPC Peering is non-transitivity and the resulting scaling problem: N VPCs require up to N*(N-1)/2 peering connections for full mesh, which becomes unmanageable at scale.

**Q3.** Which Transit Gateway feature allows you to prevent dev VPCs from communicating with prod VPCs while both are attached to the same TGW?
- A) Security Groups on TGW attachments
- B) Separate TGW route tables with controlled propagation per attachment
- C) VPC NACLs on the TGW subnet
- D) TGW bandwidth limits per attachment

**Answer: B** — TGW route tables control which routes are visible to which attachments. By associating prod and dev VPCs with separate route tables that do not propagate each other's routes, you enforce isolation without needing separate TGW infrastructure.

## What's Next

Next up: VPN and Direct Connect — connecting on-premises networks to AWS.