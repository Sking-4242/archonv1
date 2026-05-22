---
title: "VNet Peering & VPN Gateways"
type: content
estimated_minutes: 11
cert_tags: ["az_104", "az_305"]
---

# VNet Peering & VPN Gateways

## Overview

A single VNet is an isolated island. In enterprise architectures, you will deploy dozens or hundreds of VNets across different regions to separate business units and workloads. To allow these islands to communicate privately over the Microsoft backbone—without traffic ever touching the public internet—you must connect them. 

Azure provides two primary mechanisms for network connectivity: **VNet Peering** (for cloud-to-cloud) and **VPN Gateways** (for cloud-to-on-premises).

## VNet Peering

VNet Peering is the simplest, fastest, and most common way to connect two Virtual Networks. 
When you peer two VNets, VMs in VNet-A can communicate with VMs in VNet-B using their private IP addresses, exactly as if they were on the same local network.

**Key Peering Constraints (Highly Tested):**
* **Non-Overlapping IP Spaces:** You *cannot* peer VNet-A (10.0.0.0/16) with VNet-B (10.0.0.0/16). Their IP address spaces must not overlap, otherwise the routing tables will collapse.
* **Non-Transitive:** Peering is not a daisy-chain. If VNet-A is peered to VNet-B, and VNet-B is peered to VNet-C... VNet-A **cannot** talk to VNet-C. You must explicitly create a direct peer between A and C, or implement a Hub-and-Spoke architecture with a central firewall router.
* **Global Peering:** You can peer VNets that exist in completely different Azure Regions (e.g., East US to West Europe). The traffic travels securely over Microsoft's private global fiber network. 

## Hub-and-Spoke Architecture

Because peering is non-transitive, creating a full mesh network (where every VNet is directly peered to every other VNet) becomes an unmanageable spiderweb of connections as your footprint grows.

The standard enterprise design is the **Hub-and-Spoke model**. 
You create one central VNet (The Hub). You place your shared services here: your Azure Firewall, your VPN Gateway, and your Domain Controllers. All other application VNets (The Spokes) peer *only* to the Hub. Spoke-to-Spoke traffic is forced to route through the Hub, where the central Azure Firewall inspects and logs the traffic before passing it along.

## VPN Gateways (Site-to-Site)

VNet peering connects Azure to Azure. To connect your on-premises physical datacenter to Azure, you use a **VPN Gateway**.

An Azure VPN Gateway is a managed router deployed into a dedicated subnet (which must be named exactly `GatewaySubnet`). It establishes an encrypted IPsec/IKE tunnel over the public internet to your on-premises VPN device (e.g., a Cisco or Palo Alto firewall).

**Gateway Transit**
This is where Peering and VPNs combine. In the Hub-and-Spoke model, you do not want to build a separate VPN tunnel for every single Spoke VNet. 
Instead, you place one VPN Gateway in the Hub VNet. You then configure the VNet Peering connections to allow **Gateway Transit**. This setting permits the Spoke VNets to "borrow" the Hub's VPN connection to securely reach the on-premises datacenter.

## Summary

VNet Peering connects Azure VNets together privately, but requires non-overlapping IPs and is strictly non-transitive. To manage scale, architects use a Hub-and-Spoke topology. VPN Gateways connect Azure VNets to physical on-premises networks using encrypted IPsec tunnels. By enabling Gateway Transit, Spoke VNets can route through the Hub to reach on-premises resources without requiring their own dedicated VPN hardware.

## What's Next

VPNs are encrypted, but they still rely on the unpredictable latency of the public internet. For enterprises requiring guaranteed bandwidth and ultra-low latency, we must upgrade to Azure ExpressRoute.