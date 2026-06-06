---
title: "IAM Advanced: Policies, Roles, and Boundaries"
type: content
estimated_minutes: 14
cert_tags: ["SAA-C03", "SAP-C02"]
---

# IAM Advanced: Policies, Roles, and Boundaries

## Overview

Module 4 introduced IAM fundamentals — users, groups, roles, and the basic mechanics of identity-based policies. This lesson goes deeper into the IAM concepts that govern large, complex AWS environments: permission boundaries, Service Control Policies, cross-account role assumption, and attribute-based access control. These are not edge cases. They are the standard tools AWS architects use to manage access at scale without creating security gaps or operational chaos.

The core problem IAM fundamentals leave unsolved is delegation. In a small team, one person manages IAM and knows every policy. In a large organization with hundreds of teams and thousands of AWS accounts, central control becomes a bottleneck, but decentralized control becomes a risk — teams may grant themselves excessive permissions, misconfigure trust policies, or inadvertently expose resources externally. Permission boundaries, SCPs, and Access Analyzer each address a different facet of this delegation problem, giving organizations a way to let teams move fast without removing organizational guardrails.

For the SAA exam, you need to understand how SCPs, permission boundaries, and cross-account role assumption work and interact. The SAP exam expects you to design multi-account IAM architectures, reason about effective permissions across policy types, and choose the right access control model for complex organizational structures. After this lesson, you will be able to reason through any IAM policy evaluation scenario and design a scalable access control strategy.

---

## Core Concepts

### Permission Boundaries

A permission boundary is a managed IAM policy attached to a role or user that caps the maximum permissions that identity can ever have — regardless of what identity policies grant. If an identity policy allows `s3:*` but the boundary only allows `s3:GetObject`, the effective permission is `s3:GetObject`. The boundary does not grant permissions; it limits them.

The primary use case is **delegated IAM administration**. A central security team can allow product teams to create their own IAM roles for Lambda functions, ECS tasks, or EC2 instances — but only if those roles have the company-standard permission boundary attached. The boundary ensures that no team can grant a role permissions beyond what the boundary allows, preventing privilege escalation even when teams manage their own IAM.

Permission boundaries apply to IAM users and roles — not to resource-based policies, SCPs, or session policies. Effective permissions are always the intersection of the identity policy AND the boundary: neither alone is sufficient.

---

### Service Control Policies (SCPs)

Service Control Policies are AWS Organizations policies applied to organizational units (OUs) or individual accounts. They define the maximum permissions available to every identity in the target accounts — including the root user. An SCP cannot grant permissions; it can only restrict them.

**Key distinction**: SCPs operate at the account level, above IAM. Even if an IAM policy explicitly allows an action, an SCP denying that action blocks it. Even the account root user cannot override an SCP deny. This makes SCPs the right tool for organizational guardrails — things that must never happen in an account regardless of who is acting.

Common SCP patterns:
- Deny `cloudtrail:StopLogging` and `cloudtrail:DeleteTrail` in all accounts to protect audit trails
- Deny actions outside approved AWS regions to enforce data residency
- Deny `iam:CreateAccessKey` for the root user to enforce federation-only access
- Deny purchasing reserved instances in non-production OUs

SCPs affect only principals that belong to the AWS Organization. External principals accessing your account through resource-based policies (e.g., an S3 bucket policy allowing a third-party account) are not constrained by your SCPs.

---

### Cross-Account Role Assumption

The standard mechanism for granting access across AWS accounts is role assumption — never long-term credentials. The pattern requires two components working together.

**In the target account (where the resource lives):** create an IAM role with a trust policy that explicitly allows a specific principal from the source account to assume it. The trust policy is a resource-based policy on the role itself.

**In the source account (where the requester lives):** grant the principal `sts:AssumeRole` permission for the target role's ARN. Both the trust policy and the IAM permission must be in place — either one alone is insufficient.

At runtime, the principal calls `sts:AssumeRole` and receives temporary credentials (access key, secret key, session token) valid for 15 minutes to 12 hours. Those credentials are scoped to the permissions of the assumed role in the target account.

**External ID**: when a third party (e.g., a SaaS vendor) assumes a role in your account, add an external ID to the trust policy — a secret value that the third party must provide when assuming the role. This prevents the "confused deputy" problem where an attacker tricks a trusted service into acting on resources it shouldn't access.

---

### Attribute-Based Access Control (ABAC)

Traditional RBAC (role-based access control) grants permissions based on role membership: developers get the developer role, admins get the admin role. This works at small scale but becomes unmanageable when you have 20 teams, 50 environments, and hundreds of resources — you end up with hundreds of nearly identical roles.

ABAC controls access based on tags attached to both the principal and the resource. A single policy can replace hundreds of role-specific policies: `Allow s3:GetObject where aws:ResourceTag/Team == aws:PrincipalTag/Team`. A principal tagged `Team=payments` can only access resources also tagged `Team=payments`. When a new team joins, you tag their principal and resources — no new roles or policies required.

ABAC is most powerful in dynamic environments where the team, environment, or project membership of resources changes frequently. The tradeoff: it requires disciplined tagging governance. A resource with a missing or wrong tag may be inaccessible or over-accessible. Tag policies in AWS Organizations can enforce required tags and allowed values.

---

### IAM Access Analyzer

IAM Access Analyzer continuously evaluates resource-based policies (S3 buckets, IAM roles, KMS keys, Lambda functions, SQS queues, Secrets Manager secrets) and generates findings whenever a resource is accessible from outside your AWS Organization or account. It identifies unintended external access before it becomes a breach.

Access Analyzer operates in two modes. **External access analysis** flags resources accessible outside your organization — the trust zone you define. **Unused access analysis** identifies roles, users, and permissions that have not been used in a configurable window, supporting least-privilege enforcement.

Access Analyzer also offers policy validation (checks a policy for syntax errors and AWS best practice violations before you deploy it) and policy generation (analyzes CloudTrail logs to generate a minimal policy that grants exactly the permissions an identity actually used over a time period). These tools shift IAM management from reactive to proactive.

---

## Configuration Reference

### Permission Boundary: Delegated Role Creation

```json
// Company-standard permission boundary policy
// Attach to any role created by product teams
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowServiceOperations",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "logs:CreateLogGroup",
        "logs:PutLogEvents"
      ],
      "Resource": "*"
    },
    {
      "Sid": "DenyIAMEscalation",
      "Effect": "Deny",
      "Action": [
        "iam:CreateUser",
        "iam:AttachUserPolicy",
        "iam:CreateAccessKey",
        "iam:PutUserPolicy"
      ],                          // Prevent any role from creating IAM users or keys
      "Resource": "*"
    }
  ]
}
```

```bash
# Apply the boundary when creating a role
aws iam create-role \
  --role-name app-lambda-role \
  --assume-role-policy-document file://trust-policy.json \
  --permissions-boundary arn:aws:iam::123456789012:policy/CompanyStandardBoundary

# Or attach to an existing role
aws iam put-role-permissions-boundary \
  --role-name existing-role \
  --permissions-boundary arn:aws:iam::123456789012:policy/CompanyStandardBoundary
```

---

### Cross-Account Role Assumption

```json
// Step 1: Trust policy on the role in Account B (target account)
// Allows a specific role in Account A to assume this role
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::111111111111:role/DevOpsRole"  // Account A principal
      },
      "Action": "sts:AssumeRole",
      "Condition": {
        "StringEquals": {
          "sts:ExternalId": "unique-external-id-abc123"    // Required for third-party access
        }
      }
    }
  ]
}
```

```json
// Step 2: IAM policy in Account A (source account)
// Grants permission to assume the role in Account B
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "sts:AssumeRole",
      "Resource": "arn:aws:iam::222222222222:role/ReadOnlyAccessRole"  // Account B role ARN
    }
  ]
}
```

```bash
# Runtime: assume the role and get temporary credentials
aws sts assume-role \
  --role-arn arn:aws:iam::222222222222:role/ReadOnlyAccessRole \
  --role-session-name "devops-session-$(date +%s)" \
  --external-id "unique-external-id-abc123" \
  --duration-seconds 3600            # 1 hour; max 12 hours for roles with no MFA requirement

# The response contains AccessKeyId, SecretAccessKey, SessionToken
# Export as environment variables or pass via --profile
```

---

### ABAC Policy Example

```json
// Single policy controlling access to any environment's resources by team
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::*/*",
      "Condition": {
        "StringEquals": {
          "aws:ResourceTag/Team": "${aws:PrincipalTag/Team}",    // Resource tag must match caller's Team tag
          "aws:ResourceTag/Environment": "${aws:PrincipalTag/Environment}"  // And Environment tag
        }
      }
    }
  ]
}
```

> **Note:** ABAC conditions using `${aws:PrincipalTag/...}` are evaluated at request time against the tags on the calling principal. If the principal has no tag for the referenced key, the condition evaluates to false and the request is denied. Ensure tagging policies enforce the required tags before enabling ABAC in production.

---

## How to Decide

**1. Do you need to cap what a role can do, regardless of its identity policies?**
→ Use a **permission boundary**. This is the right tool when delegating IAM management to teams — they can create roles freely, but the boundary ensures no role exceeds approved permissions.

**2. Do you need a guardrail that applies to an entire account or OU, including root?**
→ Use an **SCP**. SCPs are organizational-level controls that no IAM policy can override. Use them for things that must never happen in an account: stopping audit logging, provisioning in unapproved regions, or creating long-term credentials.

**3. Does a principal in one account need to access resources in another account?**
→ Use **cross-account role assumption**. Never share long-term credentials. The calling account needs `sts:AssumeRole` permission; the target account needs a trust policy on the role.

**4. Do you have many teams or environments with similar permissions, and role proliferation is becoming a management problem?**
→ Use **ABAC**. Tag principals and resources consistently, then write tag-based conditions. One policy replaces many team-specific roles.

**5. Do you need to detect unintended external access or identify unused permissions?**
→ Enable **IAM Access Analyzer**. External access findings catch overly permissive resource policies. Unused access findings support least-privilege cleanup.

| Scenario | Tool |
|---|---|
| Allow teams to create their own Lambda roles but cap maximum permissions | Permission Boundary |
| Prevent any identity from disabling CloudTrail in production accounts | SCP |
| CI/CD pipeline in Account A deploys to Account B | Cross-account role assumption |
| 15 teams each need access to their own S3 prefix, managed dynamically | ABAC with tags |
| Audit which S3 buckets are publicly accessible in an account | IAM Access Analyzer (external access) |
| Generate a least-privilege policy for a Lambda role | IAM Access Analyzer (policy generation from CloudTrail) |

---

## How This Connects

- **AWS Organizations** — SCPs are an Organizations feature. Without an Organization, there are no SCPs. The OU hierarchy you design in Organizations directly determines how SCPs apply — guardrails set on a parent OU automatically apply to all child OUs and accounts.
- **AWS STS (Security Token Service)** — the engine behind cross-account role assumption. Every `sts:AssumeRole` call exchanges the caller's long-term or existing temporary credentials for a new set of short-lived credentials scoped to the assumed role.
- **AWS CloudTrail** — IAM Access Analyzer's policy generation feature reads CloudTrail logs to determine what API calls an identity actually made. CloudTrail is also the audit record for every `sts:AssumeRole` call, every policy change, and every IAM action — the essential forensic layer for IAM incidents.
- **AWS Config** — Config rules can continuously evaluate IAM configurations: whether MFA is enabled, whether access keys are rotated, whether roles have permission boundaries attached. Config makes IAM compliance continuous rather than point-in-time.
- **AWS KMS** — KMS key policies are resource-based policies that Access Analyzer evaluates. A KMS key that grants Decrypt to an external account generates an Access Analyzer finding, alerting you to potential unintended key sharing.

---

## Exam Traps

- **SCPs do not grant permissions — they only restrict them.** A common misconception is that attaching an SCP to an account with `Allow s3:*` grants S3 access to identities in the account. It does not. SCPs set ceilings; IAM policies must still grant the actual permissions.
- **Permission boundaries do not affect resource-based policies.** If an S3 bucket policy grants a role access directly, the role can use that access even if its permission boundary does not include S3. Boundaries only constrain identity-based policies.
- **Both the trust policy AND the `sts:AssumeRole` permission are required for cross-account access.** Exam questions often present scenarios where one is missing. A trust policy without the `sts:AssumeRole` IAM permission in the source account fails. The reverse also fails.
- **SCPs do not apply to the management account.** The root management account of an AWS Organization is not subject to SCPs — even SCPs attached to the root OU. This is a deliberate AWS design decision. Minimize use of the management account for workloads specifically because of this gap.
- **Effective permission is always the intersection of all applicable policies.** For an IAM role: the identity policy AND the permission boundary AND any applicable SCP must all allow the action. A deny in any layer blocks the action. Students often forget one layer and get the effective permission wrong.

---

## Summary

- Permission boundaries cap the maximum permissions an IAM role or user can have, regardless of what identity policies grant — the effective permission is the intersection of the identity policy and the boundary.
- Service Control Policies are AWS Organizations guardrails applied at the OU or account level; they restrict maximum permissions for all identities in that scope, including root, and cannot be overridden by any IAM policy.
- Cross-account role assumption requires both a trust policy on the role in the target account and an `sts:AssumeRole` IAM permission in the source account — both are required and neither alone is sufficient.
- ABAC uses tags on principals and resources to control access dynamically with a single policy, replacing dozens of role-specific policies in environments where team or environment membership changes frequently.
- IAM Access Analyzer continuously evaluates resource-based policies and generates findings for any resource accessible outside the organization, and can generate least-privilege policies from CloudTrail activity.
- The management account of an AWS Organization is not subject to SCPs — this is a critical exception that affects how you design organizational guardrail strategies.

---

## Examples

A fast-growing SaaS startup has a single engineering team deploying to both staging and production. Rather than creating separate IAM roles for every environment, they implement ABAC: all S3 buckets and RDS instances are tagged `Environment=staging` or `Environment=prod`, and each developer's IAM role carries the matching `Environment` tag. A single policy — `Allow s3:* where ResourceTag/Environment == PrincipalTag/Environment` — ensures staging engineers never touch production data, with no role proliferation as the team scales from 5 to 50 engineers.

A financial services company running a multi-account AWS Organization needs to guarantee that no workload in their "Payments" OU can ever disable CloudTrail or delete audit logs — even if a compromised admin credential gains those permissions. They attach an SCP to the Payments OU denying `cloudtrail:StopLogging`, `cloudtrail:DeleteTrail`, and `s3:DeleteObject` on the audit log bucket. Because SCPs override all IAM policies including root, the guardrail holds regardless of what credentials an attacker obtains within any Payments account.

A platform engineering team wants to let individual product squads create their own IAM roles for Lambda functions without risking privilege escalation. They create a company-standard permission boundary capping permissions at what squads legitimately need (Lambda invocation, specific DynamoDB tables, CloudWatch Logs), then use an SCP to require that all new IAM roles in product accounts have the boundary attached. Squads create roles freely, but the SCP ensures no role exists without the boundary. IAM Access Analyzer runs in each account and pages the security team if any role, bucket, or key becomes accessible from outside the organization.

---

## Think About It

1. Why does combining an SCP and a permission boundary provide stronger defense-in-depth than either one alone? What specific attack scenario does each one block that the other cannot?
2. What would happen if you attached a permission boundary that is more permissive than the identity policy — for example, the boundary allows `s3:*` but the identity policy only allows `s3:GetObject`? Does the boundary ever expand what a principal can do?
3. How would you decide whether to use ABAC or traditional role-per-team RBAC for an organization with 50 teams working across 30 AWS accounts and 500 S3 buckets? What risks does each model introduce?
4. A principal in Account A has `sts:AssumeRole` permission for a role in Account B, but the role's trust policy does not list Account A's principal. Will the assume-role call succeed? What if both policies allow it but an SCP in Account B denies `sts:AssumeRole`?
5. IAM Access Analyzer generates a finding for an S3 bucket accessible from outside your organization. Before removing external access, what questions would you ask to determine whether this finding represents a real risk or an intentional configuration?

---

## Quick Check

**Q1.** An IAM role has an identity policy granting `s3:*` and a permission boundary that allows only `s3:GetObject` and `s3:PutObject`. What S3 operations can the role perform?

- A) All S3 operations, because the identity policy takes precedence
- B) Only `s3:GetObject` and `s3:PutObject`, because effective permissions are the intersection
- C) No operations, because there is a conflict that results in an implicit deny
- D) All operations except delete, because boundaries only restrict destructive actions

**Answer: B** — Effective permissions are always the intersection of the identity policy and the permission boundary. The boundary caps what the identity policy can grant. Neither alone determines the outcome — both must allow the action.

---

**Q2.** A company attaches an SCP to their production OU denying `ec2:TerminateInstances`. An IAM user in a production account has an administrator policy. Can that user terminate EC2 instances?

- A) Yes, because the administrator policy grants full permissions that override the SCP
- B) Yes, because SCPs do not apply to IAM users with administrator access
- C) No, because the SCP deny overrides any IAM policy, including administrator
- D) No, but only if the SCP is also attached to the account directly, not just the OU

**Answer: C** — SCPs define the maximum permissions in an account. A deny in an SCP cannot be overridden by any IAM policy, including `AdministratorAccess`. The SCP applies to all identities in accounts under the OU, including administrators.

---

**Q3.** A developer in Account A wants to access an S3 bucket in Account B. The S3 bucket policy in Account B grants `s3:GetObject` to Account A's developer IAM user directly. The developer's IAM policy in Account A does not explicitly allow any S3 actions. Can the developer access the bucket?

- A) No, because the developer has no IAM policy allowing S3 access
- B) Yes, because the S3 bucket policy is a resource-based policy that grants cross-account access independently
- C) No, because cross-account access always requires STS role assumption
- D) Yes, but only if the developer also has the IAM permission `s3:GetObject` in Account A

**Answer: D** — For cross-account access via resource-based policies, both the resource-based policy in the target account AND an IAM policy in the source account must allow the action. Unlike same-account access where a resource-based policy alone is sufficient, cross-account access requires permission from both sides.

---

## What's Next

Next: AWS KMS — how encryption keys are created, stored, and used across AWS services, and why envelope encryption is the pattern behind almost every AWS encryption feature.
