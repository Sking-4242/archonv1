---
title: "Route 53 Resolver and Hybrid DNS"
type: content
estimated_minutes: 8
cert_tags: ["SAA-C03", "SAP-C02"]
---

# Route 53 Resolver and Hybrid DNS

## Overview

In hybrid architectures, DNS resolution must work in both directions: AWS resources resolving on-premises hostnames, and on-premises servers resolving AWS private DNS names. Route 53 Resolver enables this bidirectional resolution through Inbound and Outbound Resolver Endpoints.

## The Hybrid DNS Problem

By default, EC2 instances in a VPC use the AWS resolver (169.254.169.253) which knows about Route 53 private hosted zones but not your on-premises DNS domains. On-premises servers use your corporate DNS which knows nothing about AWS private hosted zones. For hybrid connectivity, you need both sides to resolve the other's names.

## Route 53 Resolver Inbound Endpoints

An Inbound Endpoint is a set of ENIs in your VPC subnets that accept DNS queries from outside the VPC (i.e., from on-premises via Direct Connect or VPN). On-premises DNS servers forward queries for AWS private zones (e.g., `*.internal`) to the Inbound Endpoint IPs. Route 53 Resolver answers with the correct private IP from your hosted zone. No outbound query from AWS is needed — on-premises initiates the query.

## Route 53 Resolver Outbound Endpoints

An Outbound Endpoint is a set of ENIs from which the AWS resolver forwards queries to on-premises DNS servers. You configure Resolver Rules: 'forward all queries for *.corp.example.com to on-premises DNS at 192.168.1.53'. When an EC2 instance queries a corporate hostname, the AWS resolver forwards it to your on-premises DNS via the outbound endpoint, using Direct Connect or VPN as the network path.

## DNS Firewall

Route 53 Resolver DNS Firewall lets you block DNS queries from VPC resources to known malicious domains. You define domain lists (AWS-managed or custom) and associated rules (BLOCK, ALERT, ALLOW). DNS Firewall integrates with AWS Firewall Manager for centralized management across accounts. This provides egress DNS filtering — an important control for preventing data exfiltration via DNS and blocking malware C2 domains.

## Summary

Route 53 Resolver Inbound Endpoints let on-premises DNS forward to AWS private zones. Outbound Endpoints forward AWS DNS queries to on-premises DNS. Together they create transparent bidirectional name resolution across the hybrid network. Add DNS Firewall for egress DNS filtering. This is the standard architecture for hybrid DNS in enterprise AWS deployments.

## Examples

A retail company migrates 40% of their workload to AWS over six months while keeping their ERP system on-premises. AWS workloads need to query `erp.corp.retailco.com`, which lives on their corporate DNS. They configure a Route 53 Resolver Outbound Endpoint in their VPC and create a forwarding rule: all queries for `*.corp.retailco.com` are forwarded to their on-premises DNS server at 10.0.1.53 over their Direct Connect connection. EC2 instances resolve corporate hostnames transparently — the AWS resolver handles all other queries itself and only delegates the corporate namespace to on-premises DNS.

An enterprise financial firm extends their AWS environment with three VPCs across two regions. Their security team requires that all outbound DNS resolution from EC2 instances be filtered through DNS Firewall rules before reaching the internet. They create a DNS Firewall domain list using AWS-managed threat intelligence feeds (known malware C2 domains, botnet infrastructure) and associate it with all VPCs via AWS Firewall Manager. When an EC2 instance infected by malware attempts to call home via DNS, the Resolver DNS Firewall blocks the query and logs it to CloudWatch — preventing data exfiltration even though the malware successfully ran.

A global logistics company runs a fully bidirectional hybrid architecture: AWS microservices call on-premises inventory systems, and on-premises warehouse management systems call AWS-hosted APIs. They deploy both an Inbound Endpoint (three ENIs in different AZs for redundancy) and an Outbound Endpoint with forwarding rules. Their on-premises DNS servers are configured with conditional forwarders pointing to the Inbound Endpoint IPs for `*.aws.logistics.internal`. The result: a warehouse server querying `orders.aws.logistics.internal` gets the correct private IP from Route 53; an ECS task querying `inventory.warehouse.logistics.internal` gets the correct on-premises IP from corporate DNS. Neither system needs to know the other's IP addresses directly.

## Think About It

1. Why is it insufficient to simply add AWS private hosted zone records to your on-premises DNS server as static entries — what breaks over time if you do this instead of using Inbound Endpoints?
2. What would happen if you configured an Outbound Endpoint with a forwarding rule for `*.example.com` but forgot to allow UDP port 53 outbound in the endpoint subnet's security group?
3. How would you design the Inbound Endpoint for high availability — how many ENIs, in which subnets, and why does the placement matter?
4. DNS Firewall operates at query time, before a connection is established. What category of threats does this make it effective against — and what threats does it NOT protect against even if DNS Firewall is fully deployed?
5. A company merges with another that also uses AWS and has overlapping private hosted zone namespaces (both use `internal`). How does this create a DNS resolution conflict, and what architectural options exist to resolve it?

## Quick Check

**Q1.** On-premises servers need to resolve AWS private hosted zone names (e.g., `db.internal.corp`). Which Route 53 Resolver component accepts DNS queries forwarded from on-premises DNS servers?
- A) Outbound Endpoint
- B) DNS Firewall
- C) Inbound Endpoint
- D) Resolver Rules

**Answer: C** — Inbound Endpoints are ENIs in VPC subnets that accept DNS queries originating outside the VPC (such as on-premises servers forwarding queries via Direct Connect or VPN).

**Q2.** An EC2 instance needs to resolve `fileserver.corp.example.com`, which is managed by an on-premises DNS server. What must you configure in Route 53 Resolver to make this work?
- A) An Inbound Endpoint with a forwarding rule
- B) A public hosted zone for corp.example.com
- C) An Outbound Endpoint with a forwarding rule for corp.example.com
- D) A CNAME record in the default VPC hosted zone

**Answer: C** — An Outbound Endpoint provides ENIs from which the AWS resolver can forward DNS queries, and a Resolver Rule specifies which domain names (e.g., `*.corp.example.com`) should be forwarded to the on-premises DNS server IP.

**Q3.** Route 53 Resolver DNS Firewall provides protection primarily against which type of threat?
- A) Unauthorized SSH access to EC2 instances
- B) DDoS attacks on public-facing endpoints
- C) DNS queries to malicious or unauthorized external domains from VPC resources
- D) SQL injection in HTTP requests

**Answer: C** — DNS Firewall inspects outbound DNS queries from VPC resources and blocks or alerts on queries to domains matching configured blocklists, preventing malware callbacks and unauthorized data exfiltration via DNS.

## What's Next

Next up: the Module 14 Canvas Lab — design a multi-region Route 53 failover architecture.