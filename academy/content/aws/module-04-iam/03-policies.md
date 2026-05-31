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

## Examples

A startup's first IAM policy is a customer managed policy called developer-access. The team writes it with Action: "s3:*" and Resource: "*" to "save time." Three months later, a misconfigured script deletes an entire production S3 bucket. Had the policy followed the JSON structure correctly — specifying the exact bucket ARN in Resource and only the needed actions (s3:GetObject, s3:PutObject) in Action — the scope of the accident would have been limited to the specific bucket the developer was working on. This is the policy JSON structure working as a control plane: precision in the JSON directly translates to precision in the blast radius.

A security team needs to ensure that any principal accessing a sensitive S3 bucket with financial records must have authenticated with MFA. They write an explicit Deny statement with the condition "Condition": {"BoolIfExists": {"aws:MultiFactorAuthPresent": "false"}}. This uses the policy JSON Condition field to enforce MFA at the data layer — even if someone's IAM role would otherwise allow the access, the Deny wins. The lesson's evaluation logic — explicit Deny always wins — is what makes this pattern reliable and non-bypassable.

An operations team manages 40 Lambda functions, each needing slightly different but overlapping permissions. Rather than maintaining 40 inline policies (one embedded in each Lambda role), they create three customer managed policies — lambda-s3-read, lambda-dynamodb-write, lambda-cloudwatch-logs — and attach the appropriate combination to each role. When the S3 bucket ARN changes, they update one managed policy and all 40 functions are updated instantly. This is why managed policies exist: centralized change management at scale that inline policies simply cannot provide.

## Think About It

1. The evaluation logic says an explicit Deny always wins over any Allow. This means a single Deny statement anywhere in any applicable policy can block access regardless of how many Allow statements exist. What are the security benefits of this design? Can you think of a scenario where it creates an unintended operational problem?
2. Wildcards like Action: "s3:*" or Resource: "*" are convenient but dangerous. However, the lesson says to reserve them for administrator roles. What properties of an "administrator role" make wildcards more acceptable there than in an application role, even though administrators are arguably more powerful and more of a target?
3. A managed policy is versioned and reusable; an inline policy is embedded and exists only within one identity. You're building a permission set that will only ever apply to one specific Lambda function and should be deleted when that function is deleted. Which policy type would you choose, and would your answer change if there's a chance the same permissions might be needed by a second Lambda next quarter?
4. Service Control Policies in Organizations can deny an action even when an IAM policy in the account explicitly allows it. From a governance perspective, why is this layered model valuable? Could you achieve the same outcome by editing IAM policies directly in every account, and what problems would that approach introduce?
5. A developer writes a policy with Effect: "Allow", Action: "s3:GetObject", Resource: "arn:aws:s3:::my-bucket". They test it and find they cannot retrieve any objects from the bucket. What is wrong with the policy, and what does correcting it reveal about how ARNs work for S3 objects versus buckets?

## Quick Check

**Q1.** In IAM policy evaluation, what happens if both an explicit Allow and an explicit Deny apply to the same action for the same principal?
- A) The Allow wins because it was applied first
- B) The Deny wins because explicit Deny always overrides Allow
- C) The result depends on which policy was attached most recently
- D) IAM prompts the user to choose which to apply

**Answer: B** — Explicit Deny always wins in IAM policy evaluation, regardless of how many Allow statements exist or the order in which policies were applied.

**Q2.** What is the key operational advantage of a Customer Managed Policy over an Inline Policy?
- A) Inline policies support conditions; managed policies do not
- B) Managed policies can be attached to multiple identities and are updated centrally
- C) Managed policies are automatically created by AWS for common use cases
- D) Inline policies can be shared across multiple AWS accounts

**Answer: B** — Managed policies have their own ARN and can be attached to many users, groups, or roles. Updating the managed policy updates all attached identities at once, unlike inline policies which are tied to a single identity.

**Q3.** Which IAM policy field restricts an action to a specific AWS resource using its Amazon Resource Name?
- A) Effect
- B) Action
- C) Resource
- D) Condition

**Answer: C** — The Resource field specifies the ARN of the resource(s) the statement applies to. Using "*" means all resources; specifying an ARN limits the permission to that specific resource.

## What's Next

Next: The Principle of Least Privilege — the foundational security concept that should drive every IAM policy decision.
