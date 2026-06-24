---
title: "Temporary Credentials and Workload Identity"
type: content
estimated_minutes: 17
cert_tags: ["SCS-C03"]
---

# Temporary Credentials and Workload Identity

## Overview

Temporary credentials are the beating heart of secure access on AWS. Almost every well-designed access pattern — federation, role assumption, instance profiles, cross-account access — ultimately works by issuing **short-lived credentials from AWS STS** instead of distributing long-lived keys. The Security Specialty exam (Task 4.1 and parts of 4.2) expects deep familiarity with how temporary credentials are issued and constrained: STS operations and session policies, presigned URLs for time-bound resource access, session tags for ABAC, and **IAM Roles Anywhere** for giving workloads *outside* AWS the same temporary-credential model. This is mechanism-level knowledge — the exam asks how a credential is obtained, how long it lives, and how its permissions are scoped.

The reason temporary credentials matter so much is that **long-lived credentials are the dominant cause of cloud breaches**. An access key that lives forever, sits in a config file or environment variable, and never rotates is a standing invitation. Temporary credentials expire automatically (minutes to hours), are scoped to a role's permissions (and can be further narrowed by session policies), and are issued just-in-time, so a leaked credential is useful only briefly and only within tight bounds. The specialty discipline is to ensure *every* principal — human, application, and external system — gets temporary credentials, and to know the precise mechanisms (STS, presigned URLs, Roles Anywhere) and how to constrain them.

This lesson covers STS and role assumption, session policies and tags, presigned URLs, and IAM Roles Anywhere. After it you will be able to design temporary-credential access for any workload and constrain it precisely.

---

## Core Concepts

### AWS STS and Role Assumption

**AWS Security Token Service (STS)** issues temporary, limited-privilege credentials (an access key, secret key, and session token) that expire after a configurable duration (15 minutes to 12 hours, or up to a role's maximum). The core operations: **AssumeRole** (assume a role within or across accounts), **AssumeRoleWithSAML** and **AssumeRoleWithWebIdentity** (federated assumption from SAML/OIDC), and **GetSessionToken / GetFederationToken**. Assuming a role requires both sides to agree — the role's **trust policy** must permit the caller, and the caller's identity policy must allow `sts:AssumeRole` — the two-sided model. When assumed, the principal acts with the role's permissions, not its own, and the session is identified in CloudTrail (and can carry a **source identity** for traceability across role chains). The exam expects fluency in role assumption as the universal mechanism behind nearly all access.

### Session Policies — Narrowing at Assumption Time

When assuming a role, you can pass a **session policy** — an inline policy that *further restricts* the session's permissions to the intersection of the role's policy and the session policy. Session policies cannot grant more than the role allows; they only narrow. This is powerful for granting scoped-down, just-in-time access: a broker service can assume a broad role but pass a session policy limiting the session to one customer's resources. The exam tests that effective permissions of an assumed session are the **intersection** of the role's identity policy and any session policy (and within the bounds of permission boundaries and SCPs, covered in the policy-evaluation lesson).

### Session Tags and ABAC

**Session tags** are key-value attributes attached to an STS session at assumption time (passed by the IdP or the AssumeRole call). They enable **attribute-based access control (ABAC)**: policies can compare a session tag (e.g., `aws:PrincipalTag/department`) against a resource tag (e.g., `aws:ResourceTag/department`) so a user automatically gets access to resources matching their attributes — without per-user policies. Session tags propagate from federated identities, making ABAC scale elegantly across a workforce. The exam pairs "scale access by attributes without writing a policy per user/team" with session tags and ABAC (detailed in the advanced-authorization lesson).

### Presigned URLs — Time-Bound Resource Access

A **presigned URL** grants temporary, time-limited access to a specific resource (most commonly an **S3 object**) using the credentials of the principal that generated it. Anyone with the URL can perform the specific action (e.g., GET or PUT one object) until it **expires**, without needing AWS credentials of their own. This is the right mechanism for "let an unauthenticated user upload or download one object securely for a limited time" — for example, a customer downloading their report or uploading a file from a browser. The URL inherits the generator's permissions and is scoped to the single operation and object, and its expiration bounds the exposure. The exam expects presigned URLs for time-bound, credential-less access to specific S3 objects.

### IAM Roles Anywhere — Temporary Credentials for External Workloads

Workloads running **outside AWS** — on-premises servers, other clouds, IoT/edge devices — traditionally needed long-lived IAM user access keys, which is exactly the anti-pattern to avoid. **IAM Roles Anywhere** solves this by letting external workloads obtain **temporary AWS credentials using X.509 certificates** from your existing PKI. You register your certificate authority (**AWS Private CA** or an external CA) as a **trust anchor**, define a **profile** mapping to IAM roles, and the workload presents its certificate; IAM Roles Anywhere validates the certificate against the trust anchor and issues temporary credentials (via `CreateSession`). The result: on-premises and multi-cloud workloads get the same short-lived, role-based credentials as AWS-native workloads, eliminating long-lived keys for hybrid systems. The exam pairs "temporary credentials for workloads outside AWS without long-lived keys" with IAM Roles Anywhere and its trust-anchor/PKI model.

### Credential Lifetime and Revocation

A nuance the exam tests: temporary credentials **cannot be revoked individually** before they expire — but you can effectively kill active sessions by attaching a policy that **denies actions for sessions issued before a cutoff time** (using the `aws:TokenIssueTime` condition), which is the standard incident-response containment for a compromised role (from the IR lessons). You also control maximum session duration on the role and the credential request. Choosing appropriate lifetimes (short for sensitive access) and knowing the session-revocation technique are tested skills.

### Instance and Service Identity

Applications on AWS receive temporary credentials automatically through their attached role: **EC2 instance profiles** deliver rotating credentials via IMDS (use **IMDSv2**); **ECS task roles** and **Lambda execution roles** deliver them to containers and functions. The principle is the same — the workload never holds a long-lived key; it assumes a role and AWS rotates the temporary credentials. The exam expects role-based workload identity as the default for any AWS-hosted application.

---

## Configuration Reference

Temporary-credential mechanisms:

```text
Mechanism                 For                                    How
------------------------- -------------------------------------- ---------------------------
STS AssumeRole            cross/in-account role assumption        trust policy + sts:AssumeRole
AssumeRoleWithSAML/WebId  federated humans / web / CI-CD          IdP assertion → STS
Session policy            narrow a session's permissions          intersection with role policy
Session tags              ABAC by attributes                      tags compared in conditions
Presigned URL             time-bound access to one S3 object      generator's creds + expiry
IAM Roles Anywhere        workloads OUTSIDE AWS                    X.509 cert + trust anchor → CreateSession
Instance profile/task/exec role  apps ON AWS                      auto temp creds (use IMDSv2)
```

IAM Roles Anywhere setup:

```text
1. Trust anchor   register your CA (AWS Private CA or external) with Roles Anywhere
2. Profile        map to IAM role(s) with permissions/session policy
3. Workload       presents X.509 cert → validated against trust anchor → CreateSession → temp creds
Result: on-prem / multi-cloud workloads use short-lived role credentials, no IAM user keys
```

Lifetime and revocation:

```text
Duration       15 min – 12 hr (within role max); keep short for sensitive access
Revoke session  cannot revoke a single temp cred; deny actions for aws:TokenIssueTime < cutoff
```

---

## How to Decide

- **Any cross-account or assumed access?** → STS AssumeRole (two-sided trust); narrow with a **session policy** if needed.
- **Scale access by user/resource attributes?** → session tags + ABAC.
- **Let someone upload/download one S3 object temporarily without AWS creds?** → presigned URL with an expiry.
- **Give on-premises / multi-cloud workloads AWS access without long-lived keys?** → IAM Roles Anywhere (X.509 + trust anchor).
- **App on AWS needs credentials?** → its role (instance profile / task / execution role), IMDSv2 enforced.
- **Contain a compromised role's live sessions?** → deny on `aws:TokenIssueTime` before now.

---

## How This Connects

This lesson is the mechanism layer beneath the authentication lesson's federation (which ends in STS) and the foundation for cross-account access in the advanced-authorization lesson. Session policies and tags feed the policy-evaluation and ABAC topics; the session-revocation technique connects to Incident Response containment; and IAM Roles Anywhere connects to hybrid/Private CA (Data Protection) and on-premises governance.

---

## Exam Traps

- **Long-lived keys for external workloads.** Use IAM Roles Anywhere (X.509 + trust anchor) instead of IAM user access keys for on-prem/multi-cloud systems.
- **Thinking session policies grant permissions.** They only *narrow* — effective permission is the intersection of role policy and session policy.
- **Expecting to revoke a single temp credential.** You can't; deny sessions issued before a cutoff (`aws:TokenIssueTime`).
- **Presigned URL scope confusion.** A presigned URL carries the generator's permissions for one operation/object until expiry — keep expirations short.
- **Forgetting two-sided trust.** AssumeRole needs both the role's trust policy and the caller's `sts:AssumeRole` permission.
- **IMDSv1 on instances.** Enforce IMDSv2 so SSRF can't steal the instance's temporary credentials.

---

## Summary

Temporary credentials from STS underpin secure AWS access, replacing long-lived keys for every class of principal. STS issues short-lived credentials through role assumption (AssumeRole, and the SAML/OIDC federated variants) under a two-sided trust model, and session policies narrow a session to the intersection of the role's permissions — useful for just-in-time scoping. Session tags enable attribute-based access control at scale, presigned URLs grant time-bound credential-less access to specific S3 objects, and IAM Roles Anywhere extends the temporary-credential model to workloads outside AWS using X.509 certificates validated against a trust anchor. Temporary credentials can't be revoked individually but live sessions can be killed via a token-issue-time deny, and AWS-hosted apps receive rotating credentials automatically through instance profiles and execution roles (with IMDSv2 enforced). The goal everywhere: short-lived, scoped, just-in-time credentials instead of standing keys.

---

## Examples

**Example 1 — On-prem without keys.** An on-premises batch server needs AWS access without stored access keys → **IAM Roles Anywhere**: register the corporate CA as a trust anchor, and the server presents its X.509 cert for temporary credentials.

**Example 2 — Scoped delegation.** A multi-tenant service assumes a broad role but must limit each request to one tenant's data → pass a **session policy** narrowing the session to that tenant's resources.

**Example 3 — File handoff.** A customer must download a generated report from S3 without an AWS account → a **presigned URL** valid for 15 minutes.

**Example 4 — Containment.** A role's credentials are suspected compromised → attach a policy denying actions for sessions with `aws:TokenIssueTime` before now, killing active sessions.

---

## Think About It

An on-premises application authenticates to AWS using an IAM user access key stored in a config file that hasn't rotated in two years. Explain why this is a high-risk pattern, how IAM Roles Anywhere would replace it (name the trust anchor and certificate flow), and what additional benefit short-lived credentials give you if the workload is ever compromised.

---

## Quick Check

1. What does a session policy do to an assumed session's permissions?
2. How does IAM Roles Anywhere give external workloads AWS credentials without long-lived keys?
3. What is a presigned URL used for, and whose permissions does it carry?
4. Since you can't revoke an individual temporary credential, how do you contain a compromised role's active sessions?

*Answers: (1) it narrows the session to the intersection of the role's permissions and the session policy — it can only restrict, never grant more than the role allows; (2) the workload presents an X.509 certificate from your PKI, which IAM Roles Anywhere validates against a registered trust anchor (your CA) and then issues temporary credentials for a mapped role; (3) time-bound access to a specific resource (typically a single S3 object) without the recipient needing AWS credentials — it carries the permissions of the principal that generated it, until it expires; (4) attach a policy denying actions for sessions issued before a cutoff time using the aws:TokenIssueTime condition.*

---

## What's Next

Next: **IAM Policy Evaluation and Least Privilege** — the full policy-evaluation logic (explicit deny, SCPs, resource and identity policies, permission boundaries, session policies) and designing least-privilege access.
