---
title: "Regional Subnets and IP Addressing"
type: content
estimated_minutes: 9
cert_tags: ["ace", "pca"]
---

# Regional Subnets and IP Addressing

## Overview

While the VPC itself is global, the resources you deploy—Virtual Machines, Kubernetes clusters, and Load Balancers—must exist in physical locations. Therefore, while a VPC spans the world, **Subnets are strictly regional.**

## Subnets and Zones

In AWS, a subnet is bound to a single Availability Zone. If a zone fails, that subnet goes offline. 
In GCP, **a subnet spans the entire Region.** If you create a subnet in `us-east1` (South Carolina) with a `10.0.1.0/24` CIDR block, that single subnet covers all the underlying Zones (`us-east1-b`, `us-east1-c`, `us-east1-d`). 
* *The Architectural Advantage:* You can deploy three Virtual Machines across three different physical failure domains (Zones) to achieve high availability, but keep them all on the exact same subnet. This drastically simplifies your firewall rules and IP address management.

## Expanding Subnets

Planning IP spaces is historically a rigid process. If you size a subnet too small, you eventually run out of IP addresses. In legacy networks, fixing this required building a new subnet, moving the servers, and updating the routing tables.

GCP eliminates this friction. Because the network is completely software-defined, you can **expand the CIDR range of a subnet dynamically with zero downtime.**
If your `10.0.1.0/24` (256 addresses) is full, you can execute a single `gcloud` command to expand it to a `/23` (512 addresses). The existing Virtual Machines experience zero network interruption. 
* *Constraint:* You can only expand a subnet; you cannot shrink it. You also cannot expand it if the new IP range overlaps with another existing subnet in your VPC.

## Summary

In GCP, subnets are regional constructs that span across all physical Zones within that Region, vastly simplifying high availability design compared to AWS. To accommodate unexpected growth, GCP allows architects to seamlessly expand the CIDR blocks of active subnets without migrating workloads or incurring downtime.