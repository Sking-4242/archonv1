---
title: "AWS Global Accelerator"
type: content
estimated_minutes: 8
cert_tags: ["SAA-C03", "SAP-C02"]
---

# AWS Global Accelerator

## Overview

AWS Global Accelerator is a networking service that routes user traffic over the AWS global backbone network instead of the public internet, improving availability and performance for TCP and UDP applications. Unlike CloudFront (which caches content), Global Accelerator accelerates connections to application endpoints.

## How Global Accelerator Works

Global Accelerator provides two static Anycast IP addresses (or uses your own BYO-IP). Users connect to the nearest AWS edge location, and traffic immediately enters the AWS backbone network — traveling over AWS's high-bandwidth, low-latency fiber instead of the public internet. The traffic exits to your application endpoint (ALB, NLB, EC2, or Elastic IP) in the target region. This reduces the number of public internet hops and improves consistency.

## Global Accelerator vs. CloudFront

CloudFront caches content at the edge (CDN behavior) — best for static content and cacheable HTTP/HTTPS. Global Accelerator does not cache; it accelerates any TCP or UDP traffic — best for non-cacheable dynamic requests, gaming (UDP), IoT, and applications requiring static IPs. Both route through the AWS backbone, but CloudFront's value is the cache hit; Global Accelerator's value is consistent network path.

## Health Checks and Failover

Global Accelerator continuously monitors endpoint health and routes traffic away from unhealthy endpoints within 30 seconds. Traffic weights can be configured per endpoint group (region). This enables blue/green deployments and regional failover similar to Route 53 failover routing but at the network layer with Anycast IPs (no DNS TTL propagation delay).

## Static Anycast IPs

The two static IPs provided by Global Accelerator are Anycast — the same IPs are advertised from multiple edge locations, and routing directs users to the nearest one. This is valuable for clients that cache IP addresses, whitelisted firewall rules, or mobile apps where DNS changes propagate slowly. You can also bring your own IP addresses (BYOIP) to Global Accelerator.

## Summary

Global Accelerator routes traffic over the AWS backbone from the nearest edge location, reducing latency and improving consistency for TCP/UDP applications. Use CloudFront for cacheable HTTP content; use Global Accelerator for dynamic requests, gaming UDP traffic, and cases where static IPs are required. Health checks enable sub-minute failover without DNS propagation delays.

## What's Next

Next up: AWS Outposts and hybrid connectivity — extending AWS services to on-premises.