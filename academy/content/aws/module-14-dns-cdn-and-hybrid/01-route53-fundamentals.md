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

## Examples

A small e-commerce startup registers their domain through Route 53 and creates a public hosted zone for `shop.example.com`. They add an Alias record pointing to their Application Load Balancer — not a CNAME — because they want the record at the zone apex (shop.example.com, not www.shop.example.com) and Alias records are free and automatically track the ALB's changing IP addresses. This is the beginner-friendly default: always use Alias for AWS resources.

A healthcare company runs an internal patient management system accessible only within their AWS VPCs. They create a private hosted zone for `internal.healthco.com` associated with three VPCs across two regions. EC2 instances query `db.internal.healthco.com` and resolve to their RDS endpoint — traffic never leaves the AWS network and the hostname never appears in public DNS. Health checks on the RDS endpoint trigger CloudWatch alarms, enabling monitoring without direct exposure.

A global SaaS platform prepares for a major DNS migration from a third-party registrar to Route 53. Their current records have a TTL of 86400 (24 hours). Forty-eight hours before the planned cutover, their team lowers TTL to 60 seconds. After the migration, they confirm resolution is working globally, then restore TTL to 3600. The reason this timing matters: they had to wait a full 24-hour cache cycle to pass before the lower TTL took effect — starting the TTL reduction too late would have meant some resolvers still served stale records during the cutover window.

## Think About It

1. Why would you choose a private hosted zone over hard-coding IP addresses in your application configuration files?
2. What would happen if you set a TTL of 1 second on all your records? What are the cost and reliability trade-offs?
3. How would you design Route 53 health checks for a backend service that is only reachable inside a VPC and has no public IP address?
4. Why does Route 53 offer a 100% uptime SLA when no other AWS service does — what architectural properties of DNS make this possible?
5. An Alias record and a CNAME both point to another hostname. What would happen if you tried to use a CNAME at the zone apex (e.g., `example.com` itself), and why does that restriction exist in the DNS specification?

## Quick Check

**Q1.** You need to map `example.com` (the zone apex) to an Application Load Balancer. Which record type should you use?
- A) CNAME
- B) A record with the ALB's IP
- C) Alias record
- D) MX record

**Answer: C** — CNAME cannot be used at the zone apex per DNS specification, and Alias records are the AWS-specific solution that resolves to the ALB's current IPs for free.

**Q2.** You are planning a DNS migration and your records currently have a 24-hour TTL. How far in advance should you lower the TTL to 60 seconds before the migration window?
- A) 5 minutes before
- B) 1 hour before
- C) At least 24 hours before
- D) TTL does not matter for migrations

**Answer: C** — Resolvers cache records for the full TTL duration, so you must wait one full TTL cycle after lowering the value before all resolvers will honor the shorter cache time.

**Q3.** Which Route 53 health check type is most appropriate for monitoring the health of an internal RDS database that has no public endpoint?
- A) HTTP health check pointed at the RDS endpoint
- B) TCP health check pointed at the RDS endpoint
- C) Calculated health check with no children
- D) Health check monitoring a CloudWatch alarm that tracks RDS metrics

**Answer: D** — Route 53's health checkers operate from the public internet and cannot reach private VPC resources directly; monitoring a CloudWatch alarm allows Route 53 to reflect the health of any internally visible metric.

## What's Next

Next up: Route 53 Routing Policies — how to control where users land globally.