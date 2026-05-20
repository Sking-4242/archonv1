---
title: "Canvas Lab: Spot the Security Gaps"
type: canvas
estimated_minutes: 30
cert_tags: ["SAA-C03", "SAP-C02", "SCS-C02"]
canvas_type: review
---

# Canvas Lab: Spot the Security Gaps

## Challenge

An architecture diagram has been pre-loaded on the canvas showing a three-tier web application: a public-facing Application Load Balancer, a fleet of EC2 instances in a private subnet, and an RDS database in another private subnet. The architecture has 8 deliberate security misconfigurations. Your task: identify all 8 gaps, annotate each one with the specific misconfiguration and the correct fix, and propose which AWS service addresses each gap.

## Learning Objectives

- Identify security group misconfigurations that allow overly broad access
- Identify missing encryption configurations on storage and data services
- Identify IAM policy issues including over-permissive roles
- Identify missing security services that should be enabled
- Propose the correct fix for each finding

## Steps

1. Review the ALB Security Group: identify if 0.0.0.0/0 allows inbound on non-HTTPS ports
2. Review the EC2 Security Group: check if it allows 0.0.0.0/0 inbound instead of only ALB-SG
3. Check if the RDS instance has Multi-AZ disabled and no automated backups configured
4. Check if the RDS Security Group allows inbound from 0.0.0.0/0 instead of App-SG only
5. Check if EBS volumes and RDS storage are unencrypted (no KMS key configured)
6. Check if the EC2 IAM Role has `*:*` permissions (AdministratorAccess attached)
7. Check if GuardDuty and CloudTrail are not enabled in this account
8. Check if S3 buckets for application artifacts have Block Public Access disabled
9. For each finding: annotate the canvas with (a) the specific misconfiguration, (b) the correct configuration, (c) the AWS service or feature that enforces it
10. Add a corrected version of the security group chain using proper SG-to-SG references

## Archon Canvas Lab

Open the Archon canvas to complete this lab. Use the component palette on the left to drag services onto the canvas, connect them, and configure their properties.