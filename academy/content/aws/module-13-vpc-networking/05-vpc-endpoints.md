---
title: "VPC Endpoints: Private AWS Service Access"
type: content
estimated_minutes: 8
cert_tags: ["SAA-C03", "SAP-C02"]
---

# VPC Endpoints: Private AWS Service Access

## Overview

By default, when EC2 instances in private subnets access AWS services like S3 or DynamoDB, traffic exits via NAT Gateway to the internet, incurring NAT processing charges and bandwidth costs. VPC Endpoints keep that traffic private within the AWS network, eliminating the internet path and the associated costs.

## Gateway Endpoints

Gateway Endpoints are route table entries that redirect traffic to S3 and DynamoDB to AWS-internal endpoints instead of the internet. They are free — no hourly charge, no data processing charge. Add a gateway endpoint to your VPC and update route tables in private subnets to route S3/DynamoDB traffic to the endpoint. This is a quick win for any VPC with S3 or DynamoDB traffic from private subnets.

## Interface Endpoints (AWS PrivateLink)

Interface Endpoints use AWS PrivateLink to create an ENI (elastic network interface) with a private IP in your subnet. The ENI acts as the entry point for traffic to a supported AWS service (EC2 API, CloudWatch, Secrets Manager, SQS, SNS, Kinesis, etc.) or third-party SaaS services. Traffic stays on the AWS network — never touches the internet. Interface endpoints cost ~$0.01/hour plus data processing. Use interface endpoints for services that need private access from VPCs without internet routes (e.g., Lambda in a VPC calling Secrets Manager).

## Endpoint Policies

Both gateway and interface endpoints support endpoint policies — IAM-style JSON policies that restrict which principals, actions, and resources can use the endpoint. Example: restrict an S3 gateway endpoint to only allow reads from a specific S3 bucket. Endpoint policies add a layer of defense: even if an instance's IAM role has broad S3 access, the endpoint policy narrows the blast radius.

## PrivateLink for SaaS

AWS PrivateLink is also used to privately access SaaS applications hosted by AWS partners. The SaaS provider exposes their service via a Network Load Balancer; you create an interface endpoint in your VPC to connect. Traffic stays on AWS's network and never traverses the internet. This is the preferred pattern for enterprise SaaS integrations where security and compliance teams don't want SaaS traffic on the internet.

## Summary

Gateway Endpoints (free) cover S3 and DynamoDB. Interface Endpoints (PrivateLink) cover almost all other AWS services and SaaS. Both eliminate the internet path for AWS service access from private subnets, reducing cost and attack surface. Enable gateway endpoints for S3 and DynamoDB in every production VPC — there's no reason not to.

## What's Next

Next up: Flow Logs, Network Firewall, and the Module 13 Canvas Lab.