---
title: "Cloud Load Balancing: Anycast and the Global Edge"
type: content
estimated_minutes: 12
cert_tags: ["ace", "pca", "pcse"]
---

# Cloud Load Balancing: Anycast and the Global Edge

## Overview

In AWS, if you want to load balance traffic globally across regions, you must daisy-chain multiple services together (e.g., Route 53 pointing to Regional ALBs, or using AWS Global Accelerator). 

Google Cloud simplifies this through its software-defined **Cloud Load Balancing**. Because Google's VPCs are global, their load balancers can act as a single, unified front door for your entire worldwide architecture. The secret to this is Anycast IP routing.

## Global vs. Regional Load Balancing

When an architect provisions a load balancer in GCP, the first decision dictates the geographical scope of the traffic.

**1. Global External Application Load Balancer (HTTP/HTTPS)**
This is the flagship load balancer for web applications. 
* **The Anycast Advantage:** GCP provisions a single, static Anycast IP address. You give this one IP address to your DNS provider. 
* **How it routes:** When a user in Tokyo requests that IP, BGP routing naturally directs them to the closest Google Edge Point of Presence (PoP) in Japan. If your backend servers in Japan are healthy, the traffic stays there. If the Japan servers crash, the Global Load Balancer instantaneously re-routes the Tokyo user's traffic over Google's private fiber to your backup servers in `us-central1`.
* *Zero DNS TTL dependency:* Because the IP address never changes, you do not have to wait for DNS caches to clear during a failover. The routing happens instantly at the network edge.

**2. Regional Load Balancers**
Sometimes, compliance dictates that traffic cannot cross regional borders, or you are running legacy software that requires terminating connections locally.
* **Internal TCP/UDP Load Balancing:** Used to balance traffic *inside* your VPC (e.g., the web tier load balancing traffic to the database tier).
* **Regional External Load Balancing:** Operates exactly like an AWS Network Load Balancer (NLB), distributing traffic to Virtual Machines within a single specific region.

## Proxy vs. Pass-Through

Architects must also distinguish how the load balancer handles the TCP connection.

* **Proxy Load Balancers (Layer 7):** The Global HTTP/HTTPS Load Balancer is a proxy. The user's browser establishes a TCP/SSL connection with the Google Edge Node. The Edge Node terminates the SSL, inspects the HTTP headers, and creates a *second*, separate TCP connection to your backend Virtual Machine. This is required for advanced routing (like sending `/video` requests to one server group and `/api` requests to another).
* **Pass-Through Load Balancers (Layer 4):** The Regional Network Load Balancer is pass-through. It does not terminate the connection. It simply inspects the packet header and forwards the original packet directly to the Virtual Machine. The VM sees the original client's true IP address.

## Summary

GCP Cloud Load Balancing utilizes software-defined Anycast IPs to provide a single, global frontend for applications distributed across multiple regions. This allows for instantaneous, DNS-independent cross-region failover. Architects must choose between Global Proxy load balancers for advanced HTTP/HTTPS traffic routing and Regional Pass-Through load balancers for internal or geographically restricted TCP/UDP traffic.