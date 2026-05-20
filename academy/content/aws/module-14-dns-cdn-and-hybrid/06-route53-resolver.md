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

## What's Next

Next up: the Module 14 Canvas Lab — design a multi-region Route 53 failover architecture.