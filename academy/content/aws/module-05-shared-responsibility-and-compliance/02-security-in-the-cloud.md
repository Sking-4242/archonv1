---
title: "Security In the Cloud (Your Responsibility)"
type: content
estimated_minutes: 7
cert_tags: ["aws_ccp", "aws_saa", "aws_scs"]
---

# Security In the Cloud (Your Responsibility)

## Overview

Understanding your security responsibilities requires mapping every component of your architecture and asking: is this managed by AWS, or do I manage it? This lesson catalogs the most important customer-side security responsibilities and the controls available to fulfill them.

## Data Security

You are always responsible for your data, regardless of where it's stored in AWS. Key data security controls: **Encryption at rest** — enable encryption for EBS volumes, S3 objects, RDS instances, and DynamoDB tables. Most AWS services support server-side encryption (SSE) using AWS-managed keys or your own KMS keys. **Encryption in transit** — use TLS for all connections. For EC2-to-RDS, ensure the DB engine is configured to require SSL. For API calls, use HTTPS (AWS endpoints only accept HTTPS for most services). **Data classification** — know what data you have, how sensitive it is, and apply proportional controls (don't treat log data like customer PII).

## IAM and Access Control

IAM is entirely your responsibility. AWS provides the IAM service, but how you configure it — who gets what permissions, whether MFA is enforced, whether least privilege is maintained — is your responsibility. Common failures: overly permissive IAM roles on EC2 (instance has AdministratorAccess because it was convenient), unused long-term access keys that were never revoked, missing MFA on privileged accounts.

Use IAM Access Analyzer, AWS Trusted Advisor, and AWS Security Hub to continuously audit your IAM configuration against best practices.

## Network Security

You control network security through VPC configuration (which subnets are public vs. private, route table rules), Security Groups (stateful firewall rules), NACLs (stateless firewall at subnet boundary), and VPC Flow Logs (network traffic logging). AWS doesn't configure any of these defaults to restrict your traffic — you must design and implement network segmentation. A default VPC is functional but not secure for production workloads.

## Summary

Customer security responsibilities include: data encryption (at rest and in transit), IAM configuration (least privilege, MFA, access key rotation), network security (VPC design, security groups, NACLs), OS patching (for EC2), and application security (code, dependencies, runtime configuration). Tools like IAM Access Analyzer, Security Hub, and Trusted Advisor help audit these controls continuously.

## What's Next

Next: What AWS specifically handles — the security controls that happen below your visibility and responsibility level.
