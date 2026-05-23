---
title: "Firewalls: Network-based vs. Service Accounts"
type: content
estimated_minutes: 10
cert_tags: ["ace", "pca", "pcse"]
---

# Firewalls: Network-based vs. Service Accounts

## Overview

Firewall architecture in GCP represents another major departure from AWS and Azure. In AWS, Security Groups are attached directly to the Network Interfaces (ENIs) of the compute instances. In GCP, **Firewall Rules are global resources attached to the VPC network itself.**

## How GCP Firewalls Work

GCP firewall rules are stateful (allowing inbound traffic automatically allows the return outbound traffic). Because the rules are applied at the VPC level, you must use a targeting mechanism to tell GCP *which* Virtual Machines the rule actually applies to. There are two primary ways to target a firewall rule:

**1. Target Tags (The Legacy Approach)**
You can attach a simple text string, like `web-server`, to a Virtual Machine. You then write a VPC Firewall Rule that says: "Allow Port 443 Inbound to any instance carrying the `web-server` tag."
* *The Flaw:* Tags are not secure. Any developer with `Compute Instance Admin` rights can add the `web-server` tag to their database VM, accidentally exposing it to the internet.

**2. Target Service Accounts (The Secure Standard)**
This is the enterprise best practice. Instead of targeting a string of text, you target the identity running the VM. You write a Firewall Rule that says: "Allow Port 443 Inbound to any instance running as the `frontend-app@my-project.iam.gserviceaccount.com` Service Account."
* *The Security Advantage:* Because Service Accounts are tightly controlled by IAM, a developer cannot accidentally expose a database server unless they possess the high-privilege `Service Account User` role required to attach that specific identity. 

## Hierarchical Firewall Policies

For massive organizations using Shared VPCs, standard VPC firewall rules are sometimes not enough. An organization might want a global rule that says: "Block SSH (Port 22) from the public internet across the entire company."

**Hierarchical Firewall Policies** allow security teams to enforce firewall rules at the **Organization** or **Folder** level. Because of the GCP resource hierarchy, these rules cascade downward and override any local VPC firewall rules created by developers at the Project level.

## Summary

GCP Firewall rules are stateful, VPC-level constructs. While they can target instances using simple text tags, architects must mandate the use of Target Service Accounts for production workloads to tie network security directly to strict IAM identity controls. For enterprise-wide security mandates, Hierarchical Firewall Policies are deployed at the Organization or Folder level to overrule local project configurations.