---
title: "Network Security Groups (NSGs) & ASGs"
type: content
estimated_minutes: 10
cert_tags: ["az_104", "az_500", "az_305"]
---

# Network Security Groups (NSGs) & ASGs

## Overview

If a Virtual Network is the highway system, Network Security Groups (NSGs) are the toll booths and security checkpoints. They filter network traffic to and from Azure resources. Understanding how NSGs are evaluated is heavily tested on both the AZ-104 and AZ-500 exams.

## NSG Fundamentals

An NSG is a basic, stateful, Layer 3/Layer 4 firewall. It contains a list of security rules that allow or deny inbound or outbound network traffic based on source IP, destination IP, port, and protocol.

* **Stateful:** Like AWS Security Groups, if an NSG allows an inbound request on port 443, it automatically allows the outbound response, regardless of the outbound rules.
* **Default Rules:** Every NSG comes with built-in, un-deletable default rules. These rules allow all traffic *inside* the VNet, allow traffic from Azure Load Balancers, allow all outbound traffic to the Internet, and **deny all inbound traffic from the Internet**.

## The Two Attachment Scopes (Subnet vs. NIC)

This is a critical architectural distinction from AWS. In AWS, Security Groups are applied strictly to instances, and Network ACLs (NACLs) are applied to subnets. 

In Azure, there is no NACL. Instead, the exact same NSG resource can be attached at two different scopes:
1. **The Subnet Level:** The rules apply to every single NIC inside that subnet. 
2. **The NIC Level:** The rules apply only to that specific Virtual Machine's network interface.

**The Evaluation Trap:** If you attach an NSG to a Subnet AND a different NSG to a NIC within that subnet, Azure evaluates *both* of them sequentially. 
* For **Inbound** traffic, the Subnet NSG is evaluated first. If it allows the traffic, the NIC NSG is evaluated second. *Both must allow the traffic for it to reach the VM.*
* For **Outbound** traffic, the NIC NSG is evaluated first, followed by the Subnet NSG. 

*Best Practice:* Microsoft highly recommends applying NSGs only at the Subnet level. Managing hundreds of individual NIC-level NSGs leads to administrative nightmare and inevitable security misconfigurations.

## Application Security Groups (ASGs)

Imagine you have 50 VMs in a single subnet. 10 are web servers, 40 are application servers. You need to allow Port 443 only to the 10 web servers. 

If you use a Subnet NSG, you have to write a rule and manually type in the 10 specific IP addresses of the web servers. If you add a new web server, you must manually update the NSG rule. This is brittle.

**Application Security Groups (ASGs)** solve this. An ASG is simply a logical tag you apply to a VM's NIC (e.g., tagging it as "Web-Tier").
Instead of writing an NSG rule using IP addresses, you write the rule using the ASG: *Allow Port 443 to Destination ASG: Web-Tier*.
When a new web server is spun up, you simply tag its NIC with the "Web-Tier" ASG, and it instantly inherits the firewall rules.

## Summary

Network Security Groups (NSGs) provide Layer 3/4 stateful traffic filtering. They can be attached to Subnets or individual NICs, but attaching them to Subnets is the architectural best practice. If both are used, traffic must pass both sets of rules. Application Security Groups (ASGs) allow you to group VMs logically by workload, removing the need to hardcode brittle IP addresses into your NSG rules.

## What's Next

With local VNets secured, we need to look at how to connect multiple VNets together, and how to bridge the Azure cloud back to your on-premises datacenter using Peering and VPN Gateways.