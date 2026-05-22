---
title: "Cloud Interconnect & Cloud VPN"
type: content
estimated_minutes: 11
cert_tags: ["ace", "pca"]
---

# Cloud Interconnect & Cloud VPN

## Overview

Enterprise architectures rarely exist entirely in the cloud. They are hybrid. You must connect your physical, on-premises data centers to your GCP Virtual Private Cloud (VPC). 

GCP provides two primary mechanisms for this: **Cloud VPN** (routing over the public internet) and **Cloud Interconnect** (routing over dedicated physical fiber). The architectural decision hinges on bandwidth requirements, latency tolerance, and budget.

## 1. Cloud VPN (IPsec over the Internet)

Cloud VPN establishes a secure, encrypted IPsec tunnel between your on-premises firewall and a GCP Cloud Router. 
* **The Constraint:** The traffic travels over the public internet. You are subject to unpredictable latency, ISP routing anomalies, and packet loss. Bandwidth is generally capped at 3 Gbps per tunnel.
* **High Availability (HA) VPN:** Standard VPNs are legacy. For production workloads, architects must deploy **HA VPN**, which guarantees a 99.99% SLA by mandating the configuration of two independent, active-active tunnels terminating on different Google Edge IPs. 
* **Dynamic Routing:** HA VPN strictly requires the use of **BGP (Border Gateway Protocol)**. You cannot use static routes. BGP ensures that if you add a new subnet in GCP, your on-premises routers automatically learn about the new route without manual intervention.

## 2. Cloud Interconnect (Dedicated Fiber)

If you are migrating a 50 Terabyte database, or if your application requires guaranteed sub-millisecond latency to an on-premises mainframe, the public internet is unacceptable. You need **Cloud Interconnect**.

Cloud Interconnect bypasses the internet entirely. It is the direct equivalent of AWS Direct Connect or Azure ExpressRoute. There are two flavors:

* **Dedicated Interconnect:** You lease a physical fiber-optic cross-connect directly from your enterprise router in a colocation facility into a Google Edge router. You purchase massive bandwidth (10 Gbps or 100 Gbps per circuit). It is highly expensive and requires significant physical networking expertise.
* **Partner Interconnect:** If your data center is not physically near a Google facility, or you only need 1 Gbps of bandwidth, you use a Partner (like Equinix or Verizon). The Partner has a massive, pre-existing physical connection to Google. They carve off a small, logically isolated slice of their fiber and lease it to you. 

*Security Note:* Traffic over Cloud Interconnect travels over private fiber, but it is **not encrypted by default**. If your compliance framework requires encryption in transit, you must deploy an HA VPN tunnel *over* the Cloud Interconnect connection.

## Summary

Hybrid connectivity requires bridging physical networks to the GCP VPC. Cloud VPN provides encrypted, IPsec tunnels over the public internet using BGP for dynamic routing. For enterprise workloads requiring massive bandwidth and guaranteed low latency, architects deploy Cloud Interconnect to bypass the internet entirely via direct physical fiber or partner-managed connections.