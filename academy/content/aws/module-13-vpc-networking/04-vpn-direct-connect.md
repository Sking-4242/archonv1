---
title: "AWS VPN and Direct Connect"
type: content
estimated_minutes: 10
cert_tags: ["SAA-C03", "SAP-C02"]
---

# AWS VPN and Direct Connect

## Overview

Most production architectures have a hybrid component — on-premises data centers or offices that need private connectivity to AWS. AWS offers two mechanisms: Site-to-Site VPN (encrypted internet tunnel, fast to set up) and Direct Connect (dedicated private fiber, consistent bandwidth).

## Site-to-Site VPN

AWS Site-to-Site VPN creates an IPSec encrypted tunnel over the public internet between your on-premises VPN device and an AWS Virtual Private Gateway (VGW) or Transit Gateway. Two tunnels per VPN connection for redundancy. Setup takes minutes to hours. Bandwidth is limited by internet connection quality — typically 1.25 Gbps max per tunnel. Use VPN for quick setup, cost-sensitive hybrid connectivity, or as a failover for Direct Connect.

## Direct Connect (DX)

Direct Connect provides a dedicated private network connection from your data center to an AWS Direct Connect location (colocation facility where AWS maintains equipment). You get consistent, predictable bandwidth (1 Gbps or 10 Gbps port speeds, 50 Mbps–500 Mbps via partners). Traffic never traverses the public internet — lower latency, more consistent throughput. Provisioning takes weeks to months. Use DX for high-bandwidth, latency-sensitive workloads (databases, large file transfers, real-time data).

## Direct Connect Resilience

A single DX connection is not redundant — a fiber cut or device failure breaks connectivity. For resilience: dual DX connections from different colocation facilities (physical redundancy), or DX as primary with Site-to-Site VPN as backup (different transport paths). AWS recommends dual DX at two separate DX locations for maximum resilience. DX Gateway lets one DX connection reach VPCs in multiple regions.

## Client VPN

AWS Client VPN provides OpenVPN-based remote access for individual users (developers, remote workers) connecting to AWS or on-premises resources. Each client authenticates via Active Directory, SAML, or certificate. The client VPN endpoint is associated with a VPC subnet — connected clients get access to that VPC (and anything routable from it). Useful for replacing traditional corporate VPN gateways for AWS-routed traffic.

## Summary

Site-to-Site VPN: fast to provision, encrypted over internet, variable bandwidth. Direct Connect: dedicated fiber, consistent bandwidth, weeks to provision — required for high-throughput or low-latency hybrid workloads. Always design DX with redundancy (dual connections or VPN failover). DX Gateway enables multi-region access from a single DX connection.

## What's Next

Next up: VPC Endpoints — private connectivity to AWS services without NAT or internet.