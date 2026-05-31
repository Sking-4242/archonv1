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

## Examples

A fintech startup launches a data pipeline that reads transaction records from S3, transforms them with a Lambda function, and writes results to DynamoDB. The developer, pressed for time, attaches AdministratorAccess to the Lambda execution role. Six months later, a dependency vulnerability in the Lambda code is exploited, and the attacker uses the function's identity to exfiltrate data from every S3 bucket in the account, including the customer backups bucket. Had the role been scoped to s3:GetObject on the specific input prefix and dynamodb:PutItem on the specific table, the blast radius would have been confined to that single pipeline's data — a textbook demonstration of why least privilege is not optional for production workloads.

A platform engineering team at a retail company uses IAM Access Analyzer to audit an existing microservices environment. They run the CloudTrail-based policy generation feature against six months of activity logs for their order-service IAM Role. The analyzer reveals the role has ec2:Describe* permissions it has never actually used — a remnant from an early prototype. The team removes those permissions with zero application impact. Access Analyzer made the least-privilege policy achievable without manually auditing thousands of CloudTrail events, which illustrates exactly why the tool exists: least privilege is only practical at scale when you have automated insight into what's actually being used.

A DevOps platform team needs to allow developers to create IAM roles for their own applications, but not grant themselves more permissions than they currently have (privilege escalation). They implement permission boundaries: every IAM role that developers create must have a specific managed policy as its permission boundary, capping the maximum permissions any developer-created role can ever hold. Even if a developer writes a policy granting AdministratorAccess to their new role, the permission boundary silently limits what that role can actually do. This is least privilege applied at the delegation layer — constraining not just what people can do, but what they can grant to others.

## Think About It

1. The lesson says "start restrictive, expand as needed" is better than "start broad, remove permissions." But in practice, most teams do the opposite because starting broad is faster. What incentive structures or technical mechanisms could you put in place to make the restrictive-by-default approach the path of least resistance for developers?
2. IAM Access Analyzer generates least-privilege policies by analyzing what API calls have actually been made. What are the limitations of this approach? Can you think of scenarios where a policy generated from historical CloudTrail activity would actually be less secure or less correct than one written from scratch?
3. A permission boundary sets the maximum permissions a user or role can have, but it doesn't grant any permissions itself. If you applied only a permission boundary with no other policies, the user can do nothing. What does this tell you about the relationship between permission boundaries and identity policies, and how does it differ from how SCPs interact with IAM policies in Organizations?
4. The lesson mentions that long-lived access keys are a least-privilege failure because a leaked key from years ago may still be valid. But many applications depend on long-lived access keys for integrations with third-party tools that don't support IAM roles. How would you approach securing those access keys if roles aren't an option, and how would you detect if they were compromised?
5. Least privilege is described as hard because you often don't know what permissions a workload needs until it runs. Does this mean least privilege and rapid development are fundamentally in tension? Or are there development practices that can make them compatible?

## Quick Check

**Q1.** What does IAM Access Analyzer use to generate least-privilege policy recommendations for existing IAM roles?
- A) Manual permission audits submitted by the account owner
- B) CloudTrail logs showing which API calls the role has actually made
- C) AWS Trusted Advisor recommendations based on account age
- D) Comparison against the AWS Managed Policy library

**Answer: B** — IAM Access Analyzer analyzes CloudTrail activity logs to identify which API calls an identity has actually made, then generates a policy that allows exactly those actions — no more.

**Q2.** A permission boundary is applied to an IAM role that has an attached policy granting AdministratorAccess. The permission boundary allows only S3 and CloudWatch actions. What can this role actually do?
- A) Everything, because AdministratorAccess overrides the boundary
- B) Only S3 and CloudWatch actions, because the boundary caps maximum permissions
- C) Nothing, because conflicting policies result in a full deny
- D) Everything except root-level actions

**Answer: B** — A permission boundary defines the maximum permissions available. Even if the attached identity policy grants AdministratorAccess, the effective permissions are the intersection of the identity policy and the boundary — in this case, only S3 and CloudWatch.

**Q3.** Which of the following is a common least privilege mistake in production environments?
- A) Creating separate IAM roles for each application
- B) Using IAM Access Analyzer to review permissions quarterly
- C) Using Action: "*" and Resource: "*" in application role policies
- D) Rotating access keys every 90 days

**Answer: C** — Wildcards like Action: "*" or Resource: "*" grant far more permissions than any application needs and directly violate least privilege. They should be reserved for administrator roles and replaced with specific actions for application workloads.

## What's Next

Next: Multi-Factor Authentication — adding a second factor to IAM user logins to protect against password compromise.
