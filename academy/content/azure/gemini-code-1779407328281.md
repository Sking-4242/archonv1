---
title: "Azure ExpressRoute"
type: content
estimated_minutes: 9
cert_tags: ["az_104", "az_305"]
---

# Azure ExpressRoute

## Overview

A Site-to-Site VPN is great for small offices, but it has a fundamental flaw: the data travels over the public internet. You are at the mercy of your ISP's routing, internet weather, and packet loss. If you are migrating a 50 Terabyte database, or running an algorithmic trading platform, the public internet is too slow and too unpredictable.

**Azure ExpressRoute** solves this. It is a dedicated, private, physical connection between your on-premises infrastructure and Microsoft's global network. It is the direct Azure equivalent to AWS Direct Connect.

## How ExpressRoute Works

You do not run a fiber optic cable directly from your office to an Azure datacenter. Instead, you connect through a connectivity provider (an ISP or a colocation facility like Equinix). 

1. You run a physical cross-connect from your router to the ISP's edge router in a colocation facility.
2. The ISP already has massive, pre-provisioned physical fiber connections directly into the Microsoft Enterprise Edge (MSEE) routers.
3. Your traffic rides this private fiber. **It never touches the public internet.**

Because the connection is private, ExpressRoute offers guaranteed bandwidth (from 50 Mbps up to 100 Gbps), consistently low latency, and a strict 99.95% uptime SLA.

## The Routing Engine: BGP

Unlike a simple VPN where you manually configure static routes, ExpressRoute relies entirely on **BGP (Border Gateway Protocol)**. BGP dynamically exchanges routing information between your on-premises network and Azure. If you add a new VNet in Azure, BGP automatically updates your on-premises routers to know that the new IP space exists.

## Peering Types

To configure ExpressRoute, you must configure BGP "peerings." There are two main types tested on the AZ-305:

**1. Azure Private Peering**
This is used to connect to your Virtual Networks (IaaS). It extends your on-premises IP space directly into the cloud. You use Private Peering to RDP into an Azure VM using its `10.x.x.x` private IP address from your corporate desk.

**2. Microsoft Peering**
This is used to connect to Microsoft's public SaaS and PaaS services (like Microsoft 365, or Azure Storage) *without* going over the internet. Instead of your Office 365 traffic traversing the public web, it gets routed securely over your dedicated ExpressRoute fiber. 

## ExpressRoute + VPN Failover

ExpressRoute is highly reliable, but fiber cuts still happen. A standard architectural best practice is to deploy an ExpressRoute connection as your primary path, and configure a Site-to-Site VPN Gateway as a backup. 

If the ExpressRoute goes down, Azure's routing tables automatically fail over, sending your traffic through the encrypted VPN tunnel over the internet until the physical fiber is repaired. 

## Summary

Azure ExpressRoute provides a dedicated, private physical connection to the Microsoft cloud, bypassing the public internet entirely. It is required for high-bandwidth, low-latency, mission-critical enterprise migrations. It uses BGP to dynamically exchange routes. Private Peering connects to your VNets, while Microsoft Peering connects to public services like M365. 

## What's Next

Now that our infrastructure is connected, we must learn how to route global user traffic to the correct web servers. Our final networking lesson covers Global Traffic Routing using Azure Front Door and Traffic Manager.