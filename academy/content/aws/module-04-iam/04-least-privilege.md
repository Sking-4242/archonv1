---
title: "Principle of Least Privilege"
type: content
estimated_minutes: 7
cert_tags: ["aws_ccp", "aws_saa", "aws_scs"]
---

# Principle of Least Privilege

## Overview

The Principle of Least Privilege (PoLP) states that every identity should have exactly the permissions it needs to perform its function — no more, no less. It is the foundational principle of IAM design and one of the AWS Well-Architected Framework's Security pillar best practices.

In practice, least privilege is hard. It requires knowing exactly what permissions a workload needs — which often isn't clear until the workload runs. AWS provides tools to help bridge this gap.

## Why Least Privilege Matters

Granting excessive permissions creates a larger attack surface. If an EC2 instance has AdministratorAccess and is compromised, the attacker has full control of your AWS account. If the same instance has only the specific S3 read permissions it needs for its application, the blast radius of a compromise is dramatically smaller.

The minimum principle applies at every level: IAM users should have the minimum permissions for their job. EC2 instance roles should have only the permissions the application requires. S3 bucket policies should restrict access to specific principals and prefixes. Lambda execution roles should allow only the services the function calls.

## Implementing Least Privilege in Practice

**Start restrictive, expand as needed.** Begin with a policy that denies everything, then add Allow statements as you discover what's required. This is harder than starting with a broad Allow and removing permissions, but it produces more precise policies.

**Use IAM Access Analyzer.** IAM Access Analyzer generates least-privilege policies by analyzing CloudTrail logs — it sees what API calls your identities actually make and generates a policy that allows exactly those calls. This is the most practical tool for creating least-privilege policies for existing workloads.

**Use permission boundaries.** A permission boundary is a managed policy that sets the maximum permissions an IAM user or role can have. Even if the user has broader policies attached, the permission boundary limits them. Useful for delegating IAM management without granting full IAM admin rights.

## Common Least Privilege Mistakes

**Wildcards in production:** Policies with Action: "*" or Resource: "*" almost always violate least privilege. Reserve wildcards for administrator roles and replace them with specific actions for application workloads.

**Sharing roles between applications:** Each application should have its own IAM role with its specific permissions. Sharing roles couples applications — a vulnerability in one exposes the permissions of both.

**Long-lived access keys:** Access keys don't expire by default. A leaked access key from 2018 may still be valid in 2024. Rotate access keys regularly and prefer roles (temporary credentials) over long-term access keys wherever possible.

## Summary

Least privilege means granting only the permissions needed — nothing more. It reduces blast radius when credentials are compromised. Implement it with IAM Access Analyzer (generates policies from CloudTrail activity), permission boundaries (caps maximum permissions), and regular access reviews. Avoid Action:* in production, share nothing between applications, and rotate access keys.

## What's Next

Next: Multi-Factor Authentication — adding a second factor to IAM user logins to protect against password compromise.
