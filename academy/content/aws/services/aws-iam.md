---
title: "AWS IAM"
type: content
estimated_minutes: 24
cert_tags: ["CLF-C02", "AIF-C01", "SAA-C03", "SOA-C03", "SCS-C03"]
---

# AWS IAM

## Overview

AWS Identity and Access Management (IAM) controls **who** can do **what** to **which** resources in your AWS account. It is the foundation of AWS security: every API call is authenticated to a principal and authorized against policies before it is allowed. Getting IAM right — least privilege, roles over keys, and correct policy evaluation — is the single most important security skill on AWS. This *service reference* lesson covers IAM identities, policy types, the full evaluation logic, roles and STS, federation, and what each certification expects.

IAM matters because access control is where most cloud breaches begin or are prevented. AWS denies by default and grants only what policies explicitly allow, so designing those policies precisely is what keeps an account secure without blocking legitimate work. The core mental model is **principals** (users, roles, federated identities, services) making requests that AWS evaluates against all applicable **policies** to produce an allow or deny, under two overriding rules: **an explicit deny always wins**, and **anything not explicitly allowed is implicitly denied.** Mastering the order in which policy types interact is what the security exam tests above all else.

---

## How It Works

IAM **identities**:

- **Users** — long-lived identities for people or applications, with optional console passwords and access keys. Best practice is to **minimize IAM users** in favor of federation and roles, and to protect the **root user** (MFA, no access keys, used only for the handful of tasks that require it).
- **Groups** — collections of users for attaching shared policies (groups are not principals and cannot be referenced as such).
- **Roles** — identities with policies but **no permanent credentials**; a principal **assumes** a role through **AWS STS** to receive **temporary** credentials (an access key, secret, and session token with an expiry). Roles are the preferred way to grant access to EC2/Lambda/ECS workloads, federated users, and cross-account access.

IAM **policies** are JSON documents whose statements specify **Effect** (Allow/Deny), **Action**, **Resource**, and optional **Condition**. The policy types, all of which can participate in a single authorization decision:

- **Identity-based** — attached to users, groups, or roles.
- **Resource-based** — attached to a resource (S3 bucket, KMS key, SQS queue, Lambda) and naming a **principal**; these enable cross-account access without role assumption.
- **Permissions boundaries** — a **ceiling** on the maximum permissions an identity can be granted (the effective permission is the *intersection* of the boundary and the identity policy).
- **Service control policies (SCPs)** — organization-wide guardrails (via AWS Organizations) that bound what *any* principal in an account can do; they grant nothing, only limit.
- **Session policies** — passed at role-assumption time to further scope that session.

---

## Key Features

- **Roles and STS** for temporary, least-privilege credentials — the cornerstone of secure access (instance roles, IRSA, cross-account `AssumeRole`, federation).
- **Federation** — **IAM Identity Center** (the recommended workforce SSO) and **SAML 2.0 / OIDC** let users sign in with corporate or external identities instead of IAM users; **web identity** federation backs mobile/web apps (often via Cognito).
- **MFA** for stronger authentication, especially on privileged operations (enforceable via the `aws:MultiFactorAuthPresent` condition).
- **Conditions** — fine-grained control by source IP, time, requested Region, MFA presence, encryption, and **tags** (the basis of **ABAC** — attribute-based access control that scales permissions without per-resource policies).
- **IAM Access Analyzer** — finds resources shared **externally**, identifies **unused** access (roles, keys, permissions) to trim, validates policies, and can **generate least-privilege policies** from CloudTrail activity.

---

## Configuration Reference

- **Protect the root user** with MFA, remove its access keys, and use it only when required.
- **Prefer roles and federation** over long-lived IAM users and static access keys; if keys are unavoidable, rotate them.
- **Apply least privilege** — start minimal, grant as needed, and refine with Access Analyzer's generated policies and unused-access findings.
- **Use permissions boundaries** to safely delegate permission management to teams, and **SCPs** to set non-negotiable org-wide guardrails (deny disabling CloudTrail, restrict Regions, etc.).
- **Use tags and conditions (ABAC)** to scale access without an explosion of policies.

---

## Operations and Troubleshooting

- **Access denied — work the evaluation order.** Effective decision = *is there an explicit deny anywhere* (SCP, boundary, session, or any policy)? → *do the SCPs/boundary allow it* (they only limit)? → *is there an explicit allow* in an identity or resource policy? → otherwise *implicit deny*. For **cross-account**, both the **resource-based policy** and the caller's **identity policy** must allow. For **KMS-encrypted** resources, the **key policy** must also allow the principal.
- **Over-permissive access.** Use Access Analyzer **external-access** and **unused-access** findings to locate and trim; review wildcard (`*`) actions/resources.
- **Credential leakage.** Roles/STS eliminate long-lived keys; remove any exposed keys and detect misuse with **GuardDuty** (credential-exfiltration findings).
- **"It works for the admin but not the role."** Often an SCP or permissions boundary capping the role, a missing resource-policy grant, or a Condition (IP/MFA) not satisfied.

---

## Integrations

IAM is universal — every AWS service authorizes against it. It issues temporary credentials via **STS**, federates through **IAM Identity Center**/SAML/OIDC/**Cognito**, governs cross-account and workload access with **roles** (EC2 instance profiles, **IRSA**/Pod Identity for EKS, task roles for ECS, execution roles for Lambda), is bounded org-wide by **SCPs** via **AWS Organizations**, is analyzed by **IAM Access Analyzer**, and is audited by **CloudTrail**. It works hand-in-hand with **KMS** key policies, **S3** bucket policies, and every resource-based policy. It is the control plane for security across the entire platform.

---

## Pricing and Cost Considerations

IAM itself is **free** — no charge for users, roles, groups, or policies — and **IAM Identity Center** and **IAM Access Analyzer** (external- and unused-access analysis) are free as well (some advanced/custom-policy-check features carry usage cost). The "cost" of IAM is operational and risk-related, not monetary: poorly scoped permissions create breach risk, while overly tight ones create friction. The investment is in designing least-privilege policies, using roles and federation, and continuously analyzing access — all of which reduce security risk at no direct service charge.

---

## Exam Relevance

**CLF-C02:** Know IAM users/groups/roles/policies, least privilege, MFA, protecting the root user, and the shared-responsibility role of identity. Foundational.

**AIF-C01:** Know IAM as the access-control layer for securing AI workloads and data (least-privilege roles for SageMaker/Bedrock access). Conceptual.

**SAA-C03:** Know roles for EC2/cross-account/federation, identity vs. resource-based policies, and secure access patterns. Design depth.

**SOA-C03:** Operate identity — roles, access-key hygiene, Access Analyzer, and troubleshooting access. Operations depth.

**SCS-C03:** Deepest. Master the full policy-evaluation logic (explicit deny → SCP/boundary limits → explicit allow → implicit deny), identity vs. resource vs. boundary vs. SCP vs. session policies, ABAC with tags and conditions, federation, STS, and Access Analyzer (external/unused/custom-policy checks). The IAM domain is the most heavily weighted on the security exam.

---

## Summary

AWS IAM authenticates principals and authorizes their requests against policies, denying by default and allowing only what is explicitly permitted, with explicit deny always winning. Identities are users, groups, and (preferably) roles that grant temporary STS credentials; policy types are identity-based, resource-based, permissions boundaries, SCPs, and session policies, evaluated in a defined precedence (explicit deny → SCP/boundary intersection → explicit allow → implicit deny). Roles, federation (IAM Identity Center/SAML/OIDC), MFA, conditions/ABAC, and Access Analyzer enable secure, least-privilege, scalable access; cross-account needs both resource and identity allows, and KMS resources also need the key policy. IAM is free, universal, and the foundation of AWS security — mastery of evaluation order is essential, especially for the security certification.

---

## Quick Check

1. State the IAM evaluation precedence among explicit deny, explicit allow, implicit deny, and SCP/boundary limits.
2. Why are roles (with STS) preferred over IAM users with long-lived access keys?
3. For a cross-account S3 request to an SSE-KMS-encrypted object, which three policies must permit the action?
4. How does a permissions boundary differ from an SCP, and how is the effective permission computed with a boundary?
5. Which Access Analyzer findings help you remove externally-shared and unused access?

---

## What's Next

Pair this with **AWS Organizations** (SCP guardrails), **AWS KMS** (key policies), and **Amazon S3** (resource policies). The SCS-C03 IAM-domain lessons go deeper into evaluation, ABAC, and Access Analyzer.
