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

## Examples

A data engineering team runs Spark jobs on EMR clusters in private subnets that read from and write to S3 constantly — tens of terabytes per job. Without a VPC endpoint, all that S3 traffic would route through a NAT Gateway, incurring $0.045 per GB of processing. After adding a free S3 Gateway Endpoint and updating the private subnet route tables to point S3 traffic to the endpoint, their NAT Gateway data processing charges dropped by over 90%. The S3 traffic now stays on AWS's internal network. This is a textbook "quick win" — five minutes of configuration, immediate and ongoing cost savings with no architectural trade-offs.

A compliance-driven healthcare company runs EC2 instances in a strictly private VPC with no NAT Gateway and no internet route at all. Their application needs to call AWS Secrets Manager to retrieve database credentials at startup. Without a VPC endpoint, the API call would fail entirely because there is no route to the public Secrets Manager endpoint. They create an Interface Endpoint for Secrets Manager in their private subnet, which provisions an ENI with a private IP. The application now resolves `secretsmanager.us-east-1.amazonaws.com` to that private IP and retrieves secrets successfully — the traffic never touches the internet. This is the interface endpoint's defining use case: enabling AWS API access from VPCs with no internet path.

An enterprise security team wants to ensure that even if an EC2 instance's IAM role is compromised, the attacker cannot use the VPC's S3 gateway endpoint to exfiltrate data to a personal S3 bucket. They add an endpoint policy to the gateway endpoint that restricts all S3 actions to only the company's own S3 buckets (identified by the `aws:ResourceOrgID` condition key). Now even a fully privileged IAM role cannot reach buckets outside the organization through this endpoint — the endpoint policy acts as a hard outer boundary independent of IAM. This demonstrates how endpoint policies add a defense-in-depth layer that complements, rather than replaces, IAM policies.

## Think About It

1. Gateway Endpoints are free and Interface Endpoints cost money. Why does AWS charge for Interface Endpoints? What underlying infrastructure difference explains the pricing gap?

2. An EC2 instance in a private subnet can reach S3 through either a NAT Gateway or an S3 Gateway Endpoint. Both work. Why would you choose the endpoint over NAT for this traffic, and are there any scenarios where routing S3 traffic through NAT would actually be preferable?

3. Endpoint policies are separate from IAM policies and both must allow an action for it to succeed. How would you design endpoint and IAM policies together to implement a principle of least privilege for an application that needs read-only access to a specific S3 bucket and no other AWS services?

4. AWS PrivateLink allows SaaS vendors to expose their services as Interface Endpoints in your VPC. From a security architecture perspective, why is this significantly better than whitelisting the SaaS vendor's IP ranges in your security groups or NACLs?

5. If you enable an S3 Gateway Endpoint in a VPC, does traffic from public subnets also use the endpoint, or only private subnets? What controls the routing decision, and what would you need to check to verify that traffic is actually using the endpoint?

## Quick Check

**Q1.** Which AWS services are supported by Gateway Endpoints (the free VPC endpoint type)?
- A) S3 and DynamoDB only
- B) S3, DynamoDB, and EC2 API
- C) All AWS services that have a public endpoint
- D) S3, DynamoDB, SQS, and SNS

**Answer: A** — Gateway Endpoints support only Amazon S3 and Amazon DynamoDB. All other AWS services require Interface Endpoints (PrivateLink), which have an hourly and data processing cost.

**Q2.** What is the primary mechanism by which an Interface Endpoint provides private connectivity to an AWS service?
- A) It updates the VPC route table to redirect service traffic to AWS's internal network
- B) It creates an ENI with a private IP in your subnet that serves as the entry point for service traffic
- C) It establishes an encrypted IPSec tunnel between your VPC and the AWS service
- D) It configures a DNS alias that resolves to a public IP within AWS's network

**Answer: B** — An Interface Endpoint provisions an ENI (Elastic Network Interface) with a private IP address directly in your subnet. Your resources communicate with the endpoint's private IP, and traffic flows entirely within the AWS network.

**Q3.** An endpoint policy on an S3 Gateway Endpoint restricts access to a single S3 bucket. An EC2 instance has an IAM role that allows `s3:GetObject` on all buckets (`*`). Can the instance access objects in other S3 buckets through this endpoint?
- A) Yes — IAM policies take precedence over endpoint policies
- B) No — both the IAM policy and the endpoint policy must allow the action; the endpoint policy restricts the endpoint regardless of IAM permissions
- C) Yes — endpoint policies only apply to cross-account access
- D) No — but the instance can bypass the endpoint and use NAT Gateway to reach other buckets

**Answer: B** — VPC endpoint policies and IAM policies are evaluated independently; both must allow the action. The endpoint policy restricts what can flow through the endpoint, and IAM restricts what the principal can do — the more restrictive combination applies.

## What's Next

Next up: Flow Logs, Network Firewall, and the Module 13 Canvas Lab.