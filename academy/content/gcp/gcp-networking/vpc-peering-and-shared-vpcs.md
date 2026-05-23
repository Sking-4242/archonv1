---
title: "VPC Peering and Shared VPCs"
type: content
estimated_minutes: 11
cert_tags: ["ace", "pca", "pcse"]
---

# VPC Peering and Shared VPCs

## Overview

In enterprise environments, you rarely deploy everything into a single Project or a single VPC. You must isolate workloads for security and billing purposes. However, those isolated workloads often still need to communicate. GCP provides two distinct architectures for multi-project network communication: **VPC Peering** and **Shared VPC**.

## VPC Peering (Decentralized Administration)

VPC Peering allows you to connect two independent VPC networks so that resources within them can communicate using private IP addresses.
* **How it works:** Project A has its own VPC. Project B has its own VPC. You establish a peering connection between them. (Like AWS and Azure, peering is non-transitive).
* **The Administration Model:** Decentralized. The network administrator of Project A controls their firewalls and routing, and the administrator of Project B controls theirs. 
* **Use Case:** Connecting your corporate GCP network to a third-party SaaS vendor's GCP network, or connecting two completely separate business units that require absolute administrative independence.

## Shared VPC (Centralized Administration)

Shared VPC is a highly unique and heavily tested GCP feature. It allows you to separate network administration from compute administration, solving a massive governance problem for enterprises.

* **The Problem:** You have 50 different development teams, each with their own GCP Project. You do not want 50 different teams building their own VPCs, assigning random IP addresses, and creating insecure firewall rules.
* **The Shared VPC Solution:** 1. The Security/Network team creates a **Host Project**. They build a central VPC, define the subnets, and lock down the firewall rules.
    2. They designate the 50 development projects as **Service Projects**.
    3. They "share" specific subnets from the Host Project into the Service Projects.
* **The Result:** When a developer in a Service Project goes to spin up a Virtual Machine, they don't see a local network. They only see the specific subnet that the Network team shared with them. The developer has total control over their VM, but absolutely zero control over the network it runs on. 

## Summary

To connect isolated environments, architects must choose between decentralized and centralized network governance. VPC Peering connects independent networks but leaves security administration decentralized. Shared VPC allows a central IT/Security team to build and secure a master network in a Host Project, and share specific subnets out to developer Service Projects, ensuring strict enterprise governance over IP spacing and firewalls.