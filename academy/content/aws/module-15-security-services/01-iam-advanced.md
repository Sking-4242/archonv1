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

## What's Next

Next up: AWS KMS — key management, envelope encryption, and key policies.