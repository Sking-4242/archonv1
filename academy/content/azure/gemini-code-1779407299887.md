---
title: "Compute Availability: Zones, Sets, and Domains"
type: content
estimated_minutes: 10
cert_tags: ["az_104", "az_305"]
---

# Compute Availability: Zones, Sets, and Domains

## Overview

The cloud is often abstracted as a seamless, infinite pool of compute. As a cloud architect, you must remember the physical reality: the cloud is just a massive building filled with thousands of racks of servers. Hardware fails. Network switches break. Power grids experience anomalies. Microsoft frequently updates the underlying hypervisors running your Virtual Machines, requiring reboots.

Azure places the responsibility of designing for these failures directly on you. To guarantee high availability, you must explicitly instruct Azure on how to physically distribute your Virtual Machines across their datacenter hardware. This is achieved using **Availability Sets** and **Availability Zones**.

## Availability Sets: Surviving the Rack

An Availability Set is a logical grouping capability that ensures the VM resources you place within it are isolated from each other when they are deployed inside a *single* datacenter. 

When you place two or more VMs in an Availability Set, Azure distributes them across two physical boundaries:

**1. Fault Domains (The Physical Boundary)**
A Fault Domain represents a physical rack of servers. All servers in a Fault Domain share a common power source and a common top-of-rack network switch. If the power supply to that rack blows, every VM in that Fault Domain goes offline. 
* By default, Azure provisions up to 3 Fault Domains in an Availability Set. If you deploy 3 Web Servers into an Availability Set, Azure guarantees they will be placed on 3 separate physical racks. A single hardware failure cannot take down your web tier.

**2. Update Domains (The Logical Boundary)**
Microsoft routinely patches the underlying host infrastructure that your VMs run on. These updates occasionally require host reboots. An Update Domain is a logical group of underlying hardware that can undergo maintenance or reboot at the exact same time. 
* By default, Azure creates 5 Update Domains (configurable up to 20). When a planned maintenance event occurs, Azure reboots the hosts one Update Domain at a time, waiting for them to recover before moving to the next. This ensures your application remains online during platform updates.



*Exam Note:* An Availability Set protects you from hardware failures *within* a single datacenter. It offers a 99.95% SLA. However, if the entire datacenter floods or loses internet connectivity, the Availability Set provides zero protection.

## Availability Zones: Surviving the Datacenter

To survive a total datacenter failure, you must use **Availability Zones (AZs)**. 

An Availability Zone is a physically separate datacenter (or group of datacenters) within the same Azure Region. Each AZ has independent power, cooling, and networking. They are connected by high-performance fiber optic networks with round-trip latency of less than 2 milliseconds.

If you deploy your VMs across three Availability Zones, you are physically placing them in entirely different buildings miles apart. If a natural disaster destroys Zone 1, your VMs in Zone 2 and Zone 3 continue serving traffic uninterrupted. Distributing VMs across Availability Zones unlocks Azure's highest compute SLA: 99.99%.

## Strategic Application

You cannot move an existing VM into an Availability Set after it has been created; it must be defined at the time of creation. 

When designing high availability (AZ-305 focus), you must pair these compute distributions with intelligent routing. Placing three VMs in three different Availability Zones is useless if you do not place an **Azure Standard Load Balancer** in front of them to actively detect failures and route user traffic to the healthy zones.

## Summary

Designing for compute failure requires physical awareness. **Fault Domains** protect against local hardware and power failures (rack-level). **Update Domains** protect against planned Microsoft hypervisor maintenance. Both are configured via **Availability Sets** within a single datacenter. To protect against facility-level disasters, you must distribute your workloads across **Availability Zones**, which are physically separate datacenters within a region. 

## What's Next

Next, we will explore Azure Virtual Machine Scale Sets (VMSS) to learn how to automate the horizontal scaling of these VMs based on CPU load and memory pressure.