---
title: "Specialized Compute: Dedicated Hosts & Spot Instances"
type: content
estimated_minutes: 8
cert_tags: ["az_104", "az_305", "az_500"]
---

# Specialized Compute: Dedicated Hosts & Spot Instances

## Overview

We conclude our compute module by looking at the two extremes of the Azure billing and isolation spectrum. On one end, we have organizations with strict regulatory requirements that forbid sharing physical hardware with other tenants. On the other end, we have massive, fault-tolerant batch processing jobs where minimizing OpEx is the only priority. Azure handles these extremes through **Dedicated Hosts** and **Spot Instances**.

## Azure Dedicated Hosts (The Compliance Play)

The defining characteristic of the public cloud is multi-tenancy. When you spin up a standard D-Series Virtual Machine, you are renting a slice of a physical server. The other slices of that server are rented by other Microsoft customers. The hypervisor strictly isolates your memory and CPU, but the physical silicon is shared.

For highly regulated industries (defense, finance, healthcare), or for workloads with extremely strict software licensing terms (e.g., legacy Oracle or SQL Server licenses tied to physical CPU cores), multi-tenancy is sometimes legally prohibited. 

**Azure Dedicated Hosts** solve this by allowing you to rent an entire physical server in a Microsoft datacenter. 
* **Isolation:** You are the only tenant on the physical hardware.
* **Maintenance Control:** Because you own the host, you control the maintenance window. Microsoft will not automatically reboot your host for hypervisor patching; you dictate when that happens.
* **Cost:** You pay for the entire host 24/7, regardless of how many VMs you pack onto it. It is a massive OpEx commitment, justified only by strict compliance or licensing math.

## Azure Spot Instances (The Cost Optimization Play)

Microsoft's datacenters hold massive amounts of excess compute capacity. To monetize hardware that would otherwise sit idle, Microsoft offers **Azure Spot Instances** at discounts of up to 90% off the standard Pay-As-You-Go rate.

* **The Catch (Eviction):** Spot instances do not come with an SLA. If Azure needs that compute capacity back for a customer paying full price, Azure will evict your Spot Instance. You are given exactly a 30-second warning via a REST API endpoint within the VM before the server is shut down or deleted.
* **Eviction Policies:** You can configure the VM to either be *Deallocated* (shut down, but keeping the disks so you can restart it later) or *Deleted* (entirely wiped from existence). 
* **Pricing Policies:** You can be evicted for two reasons: capacity limits, or price. You can set a maximum price you are willing to pay. If the fluctuating market price of the Spot Instance exceeds your maximum, you are evicted.

*Architectural Rule:* Never run a database, a domain controller, or a single-point-of-failure web server on a Spot Instance. They are designed exclusively for stateless, interruptible workloads: batch processing, rendering farms, or worker nodes in a Kubernetes cluster.

## Summary

Dedicated Hosts provide physical hardware isolation for strict regulatory compliance and licensing control, but require paying for the entire server. Spot Instances provide massive cost savings by utilizing excess Microsoft capacity, but require fault-tolerant architectures because the instances can be evicted with only a 30-second warning.

## What's Next

This concludes the Compute module. We will now move into Module 4: Networking, where we will build the Virtual Networks and security boundaries required to securely connect all of these compute resources.