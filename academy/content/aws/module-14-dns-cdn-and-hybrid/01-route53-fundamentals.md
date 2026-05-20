---
title: "Route 53 Fundamentals: Hosted Zones and Record Types"
type: content
estimated_minutes: 8
cert_tags: ["SAA-C03", "SAP-C02", "CLF-C02"]
---

# Route 53 Fundamentals: Hosted Zones and Record Types

## Overview

Amazon Route 53 is AWS's authoritative DNS service and domain registrar. It resolves domain names to IP addresses, routes users to the nearest healthy endpoint, and supports complex routing policies for multi-region and multi-endpoint architectures. Route 53 is 100% SLA-backed — the only AWS service with a full uptime commitment.

## Hosted Zones

A hosted zone is a container for DNS records for a specific domain (e.g., example.com). Public hosted zones serve DNS queries from the internet. Private hosted zones serve DNS queries from within one or more VPCs — used for internal service discovery (e.g., db.internal resolves to your RDS endpoint). You can have both for the same domain.

## Core Record Types

A (IPv4 address), AAAA (IPv6 address), CNAME (canonical name — alias to another domain, cannot be used at the zone apex), Alias (AWS-specific — like CNAME but works at the zone apex and resolves to AWS resource IPs automatically, no extra DNS hop charge), MX (mail routing), TXT (verification and policy records), NS (name server records), SOA (start of authority). For most AWS resources, use Alias records over CNAMEs — they're free, work at the apex, and automatically track the resource's IP changes.

## TTL and Propagation

TTL (Time to Live) tells resolvers how long to cache a record. Long TTL (hours/days) reduces Route 53 query volume but means changes propagate slowly. Short TTL (60 seconds) allows rapid cutover during migrations but increases query volume. Before a major DNS change or failover test, reduce TTL to 60 seconds 24+ hours in advance; restore after the change is stable.

## Health Checks

Route 53 health checks monitor an endpoint (HTTP/HTTPS/TCP) and report its status. Use health checks with routing policies to automatically route traffic away from unhealthy endpoints. Health checks can also monitor CloudWatch alarms — useful for health-checking internal resources not directly reachable from Route 53's health checkers. Calculated health checks aggregate multiple child health checks into one parent status.

## Summary

Route 53 is the authoritative DNS for AWS. Public hosted zones for internet domains, private for VPC-internal. Use Alias records for AWS resources — they're free and work at the zone apex. Set short TTLs before planned DNS changes. Health checks are the foundation for all routing policy failover logic.

## What's Next

Next up: Route 53 Routing Policies — how to control where users land globally.