---
title: "Azure Virtual Machines Deep Dive: Families, Gen 2, and the Temporary Disk"
type: content
estimated_minutes: 12
cert_tags: ["az_104", "az_305"]
---

# Azure Virtual Machines Deep Dive

## Overview

Virtual Machines (VMs) are the foundational Infrastructure as a Service (IaaS) compute offering in Azure. While spinning up a VM seems straightforward, Azure handles underlying hardware abstraction, disk attachment, and networking slightly differently than on-premises hypervisors or AWS EC2. 

As a cloud architect or administrator, selecting the wrong VM size doesn't just impact performance—it can heavily impact your organization's CapEx/OpEx ratio. This lesson breaks down how Azure VMs are structured, the significance of Generation 2 architecture, and a major storage "gotcha" that catches many engineers off guard.

## VM Naming Conventions and Families

Microsoft organizes its hardware fleet into specific VM "Series," optimized for different workloads. The naming convention (e.g., `Standard_D4s_v5`) tells you exactly what hardware you are renting:
* **Standard:** The tier (Basic tiers exist but are rarely used in production).
* **D:** The Series family.
* **4:** The number of vCPUs.
* **s:** Indicates this VM supports Premium SSDs.
* **v5:** The hardware generation (version 5).

**Core VM Families to Memorize:**
* **B-Series (Burstable):** The cheapest option. These VMs accrue "credits" when sitting idle and spend them to burst to 100% CPU when under load. Ideal for domain controllers, small web servers, and development environments. (Equivalent to AWS T-series).
* **D-Series (General Purpose):** A balanced CPU-to-memory ratio. This is the default choice for enterprise applications, web servers, and standard databases. (Equivalent to AWS M-series).
* **E-Series (Memory Optimized):** High memory-to-CPU ratio. Required for in-memory databases (like SAP HANA) or heavy data analytics. (Equivalent to AWS R-series).
* **F-Series (Compute Optimized):** High CPU-to-memory ratio. Best for batch processing, gaming servers, or heavy web traffic. (Equivalent to AWS C-series).
* **N-Series (GPU):** Heavily utilized for machine learning, AI model training, and heavy graphics rendering.

## Generation 1 vs. Generation 2 VMs

When provisioning a VM, Azure will ask you to select an image Generation. 

* **Generation 1:** Boot using traditional BIOS. These were the standard for years and support older, legacy operating systems (like 32-bit architecture).
* **Generation 2:** Boot using UEFI (Unified Extensible Firmware Interface). 

**Why Gen 2 Matters (AZ-104/AZ-305 Focus):**
Always default to Generation 2 for new deployments. Gen 2 VMs support larger OS disks (up to 64 TB compared to Gen 1's 2 TB limit), significantly faster boot and installation times, and advanced security features like **Trusted Launch** and **Confidential Compute**. If you are building a highly secure environment, you must use Gen 2 to enable Secure Boot and vTPM (Virtual Trusted Platform Module), which prevent rootkits and boot-level malware.

## The Temporary Disk "Gotcha"

This is one of the most critical architectural differences in Azure that causes immediate data loss for unprepared engineers.

When you provision a Windows VM in Azure, it comes with an OS disk (`C:` drive) and is automatically attached to a `D:` drive. On Linux, it mounts to `/mnt` or `/mnt/resource`. 

**This attached drive is physical, temporary storage located on the actual hypervisor host running your VM.** It provides extremely fast, low-latency I/O, which makes it perfect for temporary swap files or SQL Server `tempdb`. 

However, it is **ephemeral**. If your VM is resized, shut down (deallocated), or moved to a different host during Microsoft maintenance, **all data on the temporary disk is permanently erased.** You must never store application data, logs, or user files on the temporary disk. Application data must be stored on explicitly created and attached Managed Disks, which are backed by persistent Azure Storage.

## VM Networking: The Detached NIC

In the physical world, a Network Interface Card (NIC) is soldered to the motherboard. In Azure, a NIC is an entirely independent, standalone resource.

When you build a VM, you are actually creating a compute resource and attaching a separate NIC resource to it. That NIC is what holds the private IP address, the public IP address, and the Network Security Group (NSG) rules. 
* **Architectural Advantage:** Because the NIC is independent, if your VM becomes corrupted, you can delete the VM, keep the NIC, and attach it to a brand new VM. The new VM will instantly assume the exact same IP addresses, MAC address, and firewall rules as the old one.

## Summary

Azure VMs are categorized by series (B for Burstable, D for General, E for Memory). Modern architectures should always utilize Generation 2 VMs to unlock UEFI security features like Trusted Launch. Never store persistent data on the temporary disk provided by the host, as it is ephemeral and will be wiped upon deallocation. Finally, remember that network interfaces (NICs) are independent resources that have their own lifecycle separate from the compute instance.