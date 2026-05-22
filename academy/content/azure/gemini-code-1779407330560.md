---
title: "Global Routing: Front Door vs. Traffic Manager"
type: content
estimated_minutes: 10
cert_tags: ["az_104", "az_305"]
---

# Global Routing: Front Door vs. Traffic Manager

## Overview

If you deploy your web application exclusively in the `East US` region, a user in Tokyo will experience high latency because their HTTP requests must travel halfway across the globe. To solve this, you deploy identical copies of your application in `East US`, `West Europe`, and `Japan East`. 

But how do you ensure the Tokyo user is automatically routed to the Japan servers, while the New York user hits the US servers? Azure provides two distinct global load-balancing services to solve this: **Azure Traffic Manager** and **Azure Front Door**. Knowing exactly when to use which is a guaranteed exam scenario.

## Azure Traffic Manager (DNS-Based, Layer 4)

Azure Traffic Manager is a DNS-based traffic load balancer. 
When a user types `www.your-app.com` into their browser, the browser asks Traffic Manager for the IP address. Traffic Manager looks at the user's location, checks the health of your regional servers, and returns the IP address of the closest healthy server. 

**Key Characteristics:**
* **DNS Level Only:** Traffic Manager *never sees the actual user traffic*. It only hands out the IP address. The user's browser then connects directly to your Azure server.
* **Any Protocol:** Because it just hands out IP addresses, it works for any protocol—HTTP, SSH, RDP, FTP, or custom UDP gaming protocols.
* **AWS Equivalent:** Amazon Route 53 Traffic Flow.

## Azure Front Door (Anycast, Layer 7)

Azure Front Door is fundamentally different. It is a Layer 7 (HTTP/HTTPS) reverse proxy and Content Delivery Network (CDN) combined with global load balancing.

When a user in Tokyo types `www.your-app.com`, they do not connect to your server in Japan. They connect to the **Microsoft Edge Node** physically located in Tokyo. Front Door terminates the SSL connection right there at the edge, inspecting the HTTP headers. It then routes the traffic over Microsoft's lightning-fast private fiber backbone to your actual application servers.

**Key Characteristics:**
* **Inline Traffic:** Front Door sits in the middle of the connection. It acts as a shield.
* **HTTP/HTTPS Only:** It only understands web traffic. You cannot use Front Door to load balance a database or an SSH connection.
* **Web Application Firewall (WAF):** Because Front Door sits inline and terminates SSL, it can read the actual web request. You can attach a WAF to Front Door to block SQL injection attacks and cross-site scripting *at the edge*, before the malicious traffic ever reaches your VNet.
* **AWS Equivalent:** A hybrid of AWS Global Accelerator, CloudFront, and AWS WAF.

## The Architectural Decision

How do you choose? Memorize this matrix for the AZ-305:

1. **Is the traffic HTTP/HTTPS?** * If NO (it's UDP, TCP, FTP): You *must* use **Traffic Manager**.
   * If YES: Move to question 2.
2. **Do you need SSL Offloading, global caching (CDN), and an Edge WAF to block attacks before they hit your VNet?**
   * If YES: Use **Front Door**.
   * If NO (you just want simple, cheap regional failover): Use **Traffic Manager**.

## Summary

Global load balancers ensure high availability and low latency by directing users to the optimal regional deployment. **Traffic Manager** is a DNS-level router that supports any protocol but does not inspect the traffic. **Front Door** is an advanced Layer 7 proxy and CDN that sits inline, accelerates HTTP/HTTPS traffic over the Microsoft backbone, and provides Edge WAF security.