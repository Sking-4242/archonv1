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

## Examples

A mid-sized manufacturing company wants to connect their on-premises ERP system to a new AWS-hosted analytics platform. Their IT team provisions an AWS Site-to-Site VPN in an afternoon — they download the configuration file for their Cisco router, apply it, and within an hour have an encrypted IPSec tunnel active. The connection uses two tunnels for redundancy, and the bandwidth is more than adequate for the batch data transfers they need (a few GB nightly). The entire setup costs a fraction of what a Direct Connect circuit would, and it was live the same day they started. This is the right VPN use case: moderate bandwidth, fast time-to-value, cost sensitivity.

A video streaming company processes petabytes of media assets and needs to move large video files (hundreds of GB each) from their on-premises editing suites to AWS S3 for transcoding. They initially tried Site-to-Site VPN but found throughput inconsistent — sometimes 200 Mbps, sometimes 50 Mbps — causing upload jobs to fail or take unpredictably long. They provisioned a 10 Gbps Direct Connect circuit through an AWS partner colocation. After DX went live (6 weeks later), they got consistent 8 Gbps throughput with latency under 5 ms. The predictability was as important as the speed — their scheduling system now reliably knows how long transfers will take. This illustrates why "consistent bandwidth" is the key phrase in Direct Connect's value proposition.

A global bank uses Direct Connect as their primary hybrid connectivity for all production traffic. A construction crew accidentally cuts the fiber outside their data center, taking down the DX connection. They had already provisioned a Site-to-Site VPN as a standby, with BGP configured to prefer DX routes when it is healthy and automatically fall back to VPN when DX fails. Within minutes of the fiber cut, BGP reconverges and production traffic fails over to the VPN — at reduced bandwidth, but uninterrupted. This is the gold-standard resilience pattern: DX primary, VPN backup, BGP for automatic failover.

## Think About It

1. Direct Connect traffic never traverses the public internet. Why does this matter for latency and consistency beyond just security? What specific properties of internet routing create variability that a dedicated circuit avoids?

2. A single Direct Connect connection offers no redundancy. What are the different failure modes (fiber cut, device failure, facility outage) and which redundancy strategy protects against each? Does dual DX at the same colocation facility protect you from a facility power outage?

3. You are advising a company on whether to use Site-to-Site VPN or Direct Connect. What questions would you ask to determine which is appropriate? Consider bandwidth requirements, latency sensitivity, regulatory requirements, budget, and time-to-provision.

4. AWS Client VPN and Site-to-Site VPN both use VPN technology, but serve different use cases. How would you explain to a non-technical IT manager when to use each, and why you would not use Client VPN to connect a data center to AWS?

5. DX Gateway allows a single Direct Connect connection to reach VPCs in multiple AWS regions. What are the trade-offs of centralizing your hybrid connectivity through a single DX connection versus provisioning separate DX connections per region?

## Quick Check

**Q1.** What is the maximum bandwidth typically available for a single AWS Site-to-Site VPN tunnel?
- A) 100 Mbps
- B) 1.25 Gbps
- C) 10 Gbps
- D) Unlimited — it scales with your internet connection

**Answer: B** — A single Site-to-Site VPN tunnel supports up to approximately 1.25 Gbps, and actual throughput depends on the quality and capacity of the underlying internet connection.

**Q2.** Which statement best describes when to choose Direct Connect over Site-to-Site VPN?
- A) When you need connectivity provisioned in under an hour
- B) When you need encryption over the public internet
- C) When you require consistent, high-bandwidth connectivity with predictable latency for workloads like large file transfers or real-time databases
- D) When you need individual remote users to access AWS resources

**Answer: C** — Direct Connect is the right choice when workloads require consistent throughput and predictable latency; VPN traffic traverses the internet, making both properties variable.

**Q3.** A company's single Direct Connect connection goes down. What is the recommended architecture to maintain hybrid connectivity?
- A) Wait for AWS to restore the DX connection — SLA guarantees quick restoration
- B) Use a second Direct Connect connection to the same colocation facility as a backup
- C) Use a Site-to-Site VPN as a backup path over the internet, with BGP configured to prefer DX when healthy
- D) Switch all workloads to internet-facing endpoints temporarily

**Answer: C** — The AWS-recommended resilience pattern is DX as primary with Site-to-Site VPN as backup using BGP for automatic failover, as this provides a different physical transport path that is unaffected by a DX fiber or facility issue.

## What's Next

Next up: VPC Endpoints — private connectivity to AWS services without NAT or internet.