---
title: "Sole-Tenant Nodes & Live Migration"
type: content
estimated_minutes: 11
cert_tags: ["ace", "pca"]
---

# Sole-Tenant Nodes & Live Migration

## Overview

As we conclude the Compute module, we must examine two highly specialized compute features. One addresses strict regulatory and licensing constraints (Sole-Tenant Nodes), while the other is Google's crowning engineering achievement that fundamentally differentiates GCP from AWS and Azure (Live Migration).

## Sole-Tenant Nodes

The public cloud is inherently multi-tenant. When you provision an E2 Virtual Machine, you are renting a slice of a physical server. The other slices of that server are rented by other Google customers. The hypervisor isolates your data, but the physical silicon is shared.

**Sole-Tenant Nodes** allow you to rent an entire, dedicated physical server in a Google data center. You are the only customer on that hardware.
* *Regulatory Use Case:* Highly secure industries (Defense, Finance) may be legally prohibited from sharing physical hardware with unknown actors.
* *Licensing Use Case:* Bring Your Own License (BYOL). Legacy enterprise software (like older Microsoft SQL Server or Oracle databases) is often licensed "per physical CPU socket." You cannot accurately apply these licenses to a multi-tenant cloud VM. Sole-Tenant Nodes give you the visibility into the underlying physical hardware required to remain legally compliant with these legacy licenses.

## Live Migration (The GCP Superpower)

Physical hardware breaks. Hypervisors must be patched for zero-day security vulnerabilities. 

In AWS and Azure, when a physical host requires critical maintenance, you receive an email stating: "Your instance will be rebooted during a maintenance window." Your application suffers forced downtime. 

**Google Cloud does not reboot your Virtual Machines for routine maintenance.** It uses **Live Migration**.

When a physical host needs maintenance, Google spins up a new, healthy host right next to it. Without stopping your application, Google's hypervisor begins copying the active memory (RAM) state of your Virtual Machine from the old host to the new host. 
Once the memory is synchronized, the network routing is instantaneously flipped. The VM is now running on the new hardware. 
* *The Result:* Your application experiences a microscopic pause (often less than a second), but the OS is never rebooted, and your application never goes offline. 

*Exam Note:* Spot VMs and GPUs do *not* support Live Migration. Standard VMs do. 

## Summary

Sole-Tenant Nodes provide dedicated physical hardware to satisfy strict regulatory compliance and legacy "per-socket" software licensing requirements. For standard multi-tenant workloads, GCP utilizes Live Migration to seamlessly transfer running Virtual Machines to healthy hardware during maintenance events, entirely eliminating the forced reboots prevalent on competing cloud providers.