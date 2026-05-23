---
title: "Virtual Networks (VNets) and Subnets"
type: content
estimated_minutes: 12
cert_tags: ["az_900", "az_104", "az_305"]
---

# Virtual Networks (VNets) and Subnets

## Overview

Networking is where AWS veterans stumble hardest when migrating to Azure. If you try to map AWS VPC concepts directly 1:1 onto Azure Virtual Networks (VNets), you will architect an insecure environment. Azure's philosophy regarding internet access, subnet isolation, and routing is fundamentally different.

A **Virtual Network (VNet)** is the fundamental building block for your private network in Azure. It enables Azure resources, such as VMs, to securely communicate with each other, the internet, and on-premises networks.

## VNets vs. AWS VPCs

Like an AWS VPC, an Azure VNet is a logically isolated section of the cloud dedicated to your subscription. You define an overarching IPv4 address space (e.g., `10.0.0.0/16`) and carve it into smaller Subnets (e.g., `10.0.1.0/24`).

However, the differences emerge immediately:
* **Region Bound:** VNets are scoped to a single Azure Region. They cannot span regions. 
* **No "Internet Gateway" Resource:** In AWS, a VPC cannot reach the internet unless you explicitly attach an Internet Gateway (IGW). In Azure, **every VNet has implicit outbound internet access by default.** * **No Public/Private Subnet Distinction:** In AWS, a subnet is considered "public" if its route table points to an IGW, and "private" if it points to a NAT Gateway. Azure does not recognize "Public" or "Private" subnets. A subnet is just a subnet.

## The Default Outbound Access "Gotcha"

Because Azure provides default outbound access, any VM you place in any subnet can immediately download updates from the internet without you configuring a single router or NAT gateway. 

While convenient for development, this is a massive security risk in production (data exfiltration). To lock this down, Azure Architects must explicitly block outbound traffic using Network Security Groups (NSGs) or route the traffic through an Azure Firewall. 

*Note on Modern Azure:* Microsoft is slowly deprecating default outbound access. For new, secure architectures, you should provision a **NAT Gateway** and attach it to your subnets. This provides a dedicated, static public IP address for all outbound traffic from that subnet, which is required when whitelisting your architecture with third-party SaaS vendors.

## Inbound Internet Access: The Public IP Resource

If a VM needs to be reached *from* the internet (e.g., a web server), you do not place it in a "public subnet." Instead, you create a **Public IP Address** resource and attach it directly to the Virtual Machine's Network Interface Card (NIC), or attach it to a Load Balancer sitting in front of the VM.

## Subnet Delegation

Azure has a unique concept called **Subnet Delegation**. Certain managed Platform as a Service (PaaS) offerings—like Azure SQL Managed Instance, Azure App Service, or Azure NetApp Files—need to be injected directly into your VNet to communicate securely over private IP addresses.

To do this, you must "delegate" an empty subnet to that specific service. Once delegated, that subnet is locked. You cannot deploy standard Virtual Machines into it; it belongs entirely to the PaaS service to manage its underlying infrastructure.

## Summary

An Azure Virtual Network (VNet) is your private, region-bound network boundary. Unlike AWS, Azure does not use Internet Gateways to dictate public vs. private subnets. All subnets have default outbound internet access unless explicitly blocked by a firewall or routed through a NAT Gateway. Inbound access is achieved by attaching Public IP resources directly to NICs or Load Balancers. 

## What's Next

Because subnets don't have implicit security boundaries based on routing, we must secure them using firewalls. Next, we will cover Network Security Groups (NSGs) and Application Security Groups (ASGs).