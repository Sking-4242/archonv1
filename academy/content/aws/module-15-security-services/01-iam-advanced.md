---
title: "IAM Advanced: Policies, Roles, and Boundaries"
type: content
estimated_minutes: 12
cert_tags: ["SAA-C03", "SAP-C02", "SCS-C02"]
---

# IAM Advanced: Policies, Roles, and Boundaries

## Overview

You covered IAM fundamentals in Module 4. This lesson goes deeper: permission boundaries, service control policies, cross-account role assumption, and attribute-based access control. These are the IAM concepts that separate working knowledge from mastery — and they appear heavily on associate and professional exams.

## Permission Boundaries

A permission boundary is a managed policy attached to a role or user that sets the maximum permissions it can have. Even if the identity policy grants s3:*, if the boundary only allows s3:GetObject, only GetObject is permitted. Use permission boundaries when delegating IAM administration: allow teams to create their own roles but constrain the maximum permissions those roles can have. The effective permission is the intersection of the identity policy and the boundary.

## Service Control Policies (SCPs)

SCPs are Organization-level policies applied to OUs or accounts. They define the maximum permissions available to any identity in that account — including the root user. SCPs do not grant permissions; they set guardrails. Example: SCP denying `ec2:TerminateInstances` in all production accounts prevents anyone, regardless of IAM role, from terminating instances in prod. Combine SCPs with permission boundaries for defense in depth.

## Cross-Account Role Assumption

To grant a principal in Account A access to resources in Account B: create a role in Account B with a trust policy allowing Account A's principal to assume it; grant the principal in Account A `sts:AssumeRole` permission for that role ARN. The principal calls `sts:AssumeRole` to get temporary credentials, then uses those credentials to access Account B resources. This is the standard pattern for cross-account access — no long-term credential sharing required.

## Attribute-Based Access Control (ABAC)

ABAC uses tags to control access dynamically. Example policy: `'Allow s3:* on * where aws:ResourceTag/Environment == aws:PrincipalTag/Environment'`. A developer with tag `Environment=dev` can only access resources also tagged `Environment=dev`. ABAC scales better than role-per-team RBAC — you don't need to create new roles as the team grows, just tag resources and principals correctly.

## IAM Access Analyzer

IAM Access Analyzer continuously monitors resource policies (S3 bucket policies, IAM roles, KMS key policies, etc.) and generates findings for any resource accessible from outside your organization or account — indicating unintended external access. Use Access Analyzer to audit for overly permissive policies, validate policies before deployment, and generate least-privilege policies based on CloudTrail activity.

## Summary

Advanced IAM: permission boundaries limit maximum permissions for delegated admin; SCPs are organization-level guardrails. Cross-account assumes roles use STS temporary credentials. ABAC scales access control with tags instead of role proliferation. Access Analyzer finds unintended external access automatically. These concepts are the difference between basic IAM use and real security architecture.

## Examples

A fast-growing SaaS startup has a single engineering team deploying to both staging and production. Rather than creating separate IAM roles for every environment, they implement ABAC: all S3 buckets and RDS instances are tagged `Environment=staging` or `Environment=prod`, and each developer's IAM role carries the matching `Environment` tag. A single policy — `Allow s3:* where ResourceTag/Environment == PrincipalTag/Environment` — ensures that staging engineers never touch production data, with no role proliferation as the team scales.

A financial services company running a multi-account AWS Organization needs to guarantee that no workload in their "Payments" OU can ever disable CloudTrail or delete audit logs, even if a compromised admin role gains those permissions. They attach an SCP to the Payments OU that explicitly denies `cloudtrail:StopLogging`, `cloudtrail:DeleteTrail`, and `s3:DeleteObject` on the log bucket. Because SCPs are evaluated before any IAM policy — including root — the guardrail holds regardless of identity.

A platform engineering team wants to let individual product squads create their own IAM roles for Lambda functions without risking privilege escalation. They use permission boundaries: each squad can create roles freely, but only if the role has the company-standard boundary policy attached. The boundary caps maximum permissions at what the squad legitimately needs, preventing any squad from granting itself S3 full access or IAM admin rights. IAM Access Analyzer then continuously flags any role that can be assumed from outside the organization.

## Think About It

1. Why does combining an SCP and a permission boundary provide stronger security than either one alone? What attack scenario does each one block that the other cannot?
2. What would happen if you attached a permission boundary that is MORE permissive than the identity policy? Does the boundary ever expand what a principal can do?
3. How would you decide whether to use ABAC or traditional role-per-team RBAC for a team that works across 50 different AWS accounts and 200 S3 buckets?
4. A principal in Account A has `sts:AssumeRole` for a role in Account B, but the role's trust policy does not list Account A's principal. Will the assume-role call succeed? Why or why not?
5. IAM Access Analyzer generates a finding for an S3 bucket accessible from outside your organization. What factors would you weigh before deciding whether to remove that external access or accept the finding?

## Quick Check

**Q1.** A permission boundary is attached to an IAM role. The identity policy grants `s3:*`. The boundary allows only `s3:GetObject` and `s3:PutObject`. What operations can the role perform on S3?

- A) All S3 operations, because the identity policy grants `s3:*`
- B) Only `s3:GetObject` and `s3:PutObject`, because effective permissions are the intersection
- C) No S3 operations, because there is a conflict between the two policies
- D) All operations except delete, because boundaries only restrict destructive actions

**Answer: B** — Effective permissions are the intersection of the identity policy and the permission boundary; the boundary caps what the identity policy can grant.

**Q2.** Which statement about Service Control Policies (SCPs) is correct?

- A) SCPs grant permissions to IAM users in an AWS account
- B) SCPs can be applied to individual IAM users within an account
- C) An SCP denying an action blocks it even for the account's root user
- D) SCPs override permission boundaries when both are present

**Answer: C** — SCPs set the maximum permissions available to all identities in an account, including root; a deny in an SCP cannot be overridden by any identity policy.

**Q3.** For cross-account role assumption, which two components are required?

- A) A long-term access key in Account B, and an IAM policy in Account A allowing its use
- B) A role in Account B with a trust policy allowing Account A, and `sts:AssumeRole` permission in Account A
- C) VPC peering between Account A and Account B, and an IAM group in Account B
- D) An SCP allowing cross-account access, and a KMS key shared between both accounts

**Answer: B** — The role's trust policy grants permission to be assumed from Account A, and the calling principal in Account A must have explicit `sts:AssumeRole` permission for that role ARN.

## What's Next

Next up: AWS KMS — key management, envelope encryption, and key policies.