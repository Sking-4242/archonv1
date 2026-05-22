---
title: "Cloud NAT and Private Google Access"
type: content
estimated_minutes: 9
cert_tags: ["ace", "pca"]
---

# Cloud NAT and Private Google Access

## Overview

Deploying a Virtual Machine with a public external IP address is a massive security risk. Unless specifically required (like a public-facing web server or bastion host), Virtual Machines should only have private, internal IP addresses. 

However, private Virtual Machines still have two fundamental requirements: they need to download OS updates from the public internet, and they need to interact with Google's managed APIs (like Cloud Storage or BigQuery). GCP handles these two requirements using two distinct services.

## 1. Cloud NAT (Outbound Internet Access)

If a VM has only a private IP address, it cannot route traffic to the public internet. To allow outbound internet access without exposing the VM to inbound attacks, you deploy **Cloud NAT** (Network Address Translation).

* **Software-Defined:** Unlike AWS, where you must deploy a physical NAT Gateway appliance into a specific subnet, Cloud NAT in GCP is completely software-defined and distributed. It is attached to a Cloud Router.
* **No Choke Points:** Because it is not a physical appliance, it cannot become a bandwidth bottleneck, and you do not have to architect around NAT Gateway failure scenarios. 

## 2. Private Google Access (PGA)

If your private VM needs to upload a file to a Google Cloud Storage bucket, sending that traffic through Cloud NAT to the public internet and back into Google's network is inefficient and incurs egress costs. 

**Private Google Access (PGA)** is a subnet-level toggle switch. 
When you enable PGA on a subnet, any VM inside that subnet (even without an external IP address) can reach Google's public APIs (like Cloud Storage, BigQuery, or Cloud Pub/Sub) directly over Google's private backbone. 
* *Architectural Note:* The traffic never touches the public internet. This is the GCP equivalent of AWS VPC Endpoints, but vastly simpler to implement because it is just a checkbox on the subnet, requiring no complex routing table updates.

## Summary

Secure cloud architectures demand that Virtual Machines operate without public IP addresses. To allow these private instances to securely download external updates, architects deploy Cloud NAT, a highly scalable, software-defined translation service. To allow these instances to privately interact with Google's PaaS offerings (like BigQuery), architects must enable Private Google Access (PGA) at the subnet level.