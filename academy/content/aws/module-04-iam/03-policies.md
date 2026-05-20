---
title: "IAM Policies and JSON Structure"
type: content
estimated_minutes: 10
cert_tags: ["aws_ccp", "aws_saa", "aws_soa", "aws_dva"]
---

# IAM Policies and JSON Structure

## Overview

IAM Policies are JSON documents that specify what actions are permitted or denied on which AWS resources under what conditions. Every permission in AWS is ultimately defined by a policy statement. Understanding policy structure is essential for writing effective permissions and for troubleshooting access issues.

## Policy JSON Structure

Every IAM policy document is a JSON object with a Version and a Statement array. Each statement has four key fields:

**Effect:** Either "Allow" or "Deny". By default, all actions are implicitly denied — you must explicitly Allow. An explicit Deny always overrides an Allow.

**Action:** The AWS API actions being permitted or denied. Uses service:action format (e.g., "s3:GetObject", "ec2:DescribeInstances"). Wildcards are supported ("s3:*" allows all S3 actions, "*" allows all actions on all services).

**Resource:** The ARN (Amazon Resource Name) of the resource(s) the action applies to. "*" means all resources. "arn:aws:s3:::my-bucket/*" means all objects in my-bucket.

**Condition:** (Optional) Additional constraints. Common conditions: limit access to specific IP addresses, require MFA, restrict to specific Regions, require specific tag values.

## Policy Types

**Managed Policies** are standalone policies with their own ARN that can be attached to multiple identities. AWS provides hundreds of pre-built AWS Managed Policies (e.g., AdministratorAccess, ReadOnlyAccess, AmazonS3FullAccess). You can also create Customer Managed Policies for custom permission sets. Managed policies are versioned — you can update a managed policy, and all identities attached to it get the updated permissions.

**Inline Policies** are embedded directly in a single user, group, or role. They have no standalone existence — if you delete the user, the inline policy is deleted too. Inline policies are appropriate for one-off, tightly coupled permissions that should never be reused.

## Policy Evaluation Logic

When a principal makes an API request, IAM evaluates all applicable policies using a specific logic: **1. Explicit Deny wins.** If any policy has an explicit Deny for the action, it's denied — no other policy can override a Deny. **2. Explicit Allow.** If any policy has an explicit Allow and no Deny, the action is allowed. **3. Implicit Deny.** If no policy explicitly allows the action, it's denied by default.

For multi-account setups using AWS Organizations, Service Control Policies (SCPs) act as a guardrail — even if a user's IAM policy allows an action, an SCP at the organization/OU level can deny it. SCPs narrow the maximum permissions available, and IAM policies apply within that bound.

## Summary

IAM Policy JSON has four key fields per statement: Effect (Allow/Deny), Action (service:action), Resource (ARN), and optional Condition. Policy types are Managed (standalone, reusable) and Inline (embedded in one identity). Evaluation logic: explicit Deny always wins, then explicit Allow, then implicit Deny. In Organizations, SCPs layer above IAM policies as guardrails.

## What's Next

Next: The Principle of Least Privilege — the foundational security concept that should drive every IAM policy decision.
