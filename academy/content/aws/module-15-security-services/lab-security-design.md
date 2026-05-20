---
title: "Canvas Lab: Design a Secure Three-Tier Architecture"
type: canvas
estimated_minutes: 30
cert_tags: ["SAA-C03", "SAP-C02"]
canvas_type: open
---

# Canvas Lab: Design a Secure Three-Tier Architecture

## Challenge

Design a security-first three-tier web application architecture from scratch. The application stores customer PII data and must comply with security best practices including: encryption everywhere, least-privilege IAM, no public database access, centralized secret management, threat detection, and audit logging. Document your security decisions on the canvas.

## Learning Objectives

- Apply encryption at rest and in transit for all data stores
- Implement least-privilege IAM using role chaining and permission boundaries
- Use Secrets Manager for all database credentials
- Enable GuardDuty, CloudTrail, and Config
- Design security group chains with no overly broad rules

## Steps

1. Create a VPC with public, private-app, and private-data subnets across 2 AZs
2. Place an ALB in public subnets with an ACM certificate (HTTPS only, redirect HTTP → HTTPS)
3. Attach WAF to the ALB with AWS Managed Rules Common Rule Set
4. Place EC2 (or ECS) in private-app subnets; attach an IAM Role with only the permissions needed
5. Place RDS Aurora in private-data subnets with Multi-AZ enabled and KMS encryption
6. Add an RDS Proxy between the app tier and Aurora, configured for IAM auth
7. Add Secrets Manager storing the DB credentials, with automatic rotation enabled
8. Add a KMS CMK for RDS, EBS, and S3 encryption — annotate key policy principals
9. Add CloudTrail (all regions, log file integrity), Config with security rules, GuardDuty enabled
10. Annotate security group rules using SG references (no 0.0.0.0/0 for inter-tier traffic)
11. Add VPC Gateway Endpoint for S3 and interface endpoint for Secrets Manager

## Archon Canvas Lab

Open the Archon canvas to complete this lab. Use the component palette on the left to drag services onto the canvas, connect them, and configure their properties.