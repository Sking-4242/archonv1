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

## What's Next

Next up: VPN and Direct Connect — connecting on-premises networks to AWS.