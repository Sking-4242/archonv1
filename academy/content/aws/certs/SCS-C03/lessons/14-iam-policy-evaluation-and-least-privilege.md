---
title: "IAM Policy Evaluation and Least Privilege"
type: content
estimated_minutes: 20
cert_tags: ["SCS-C03"]
---

# IAM Policy Evaluation and Least Privilege

## Overview

If there is one topic that separates passing the Security Specialty exam from failing it, it is **how AWS decides whether a request is allowed**. The IAM domain (20%) is full of questions that hand you several policies — an identity policy, a resource policy, a service control policy, a permission boundary, maybe a session policy — and ask whether a specific action is permitted, or why an action that "should" work is being denied. Answering requires knowing the **policy evaluation logic** precisely: which policy types exist, how they combine, and the order in which AWS evaluates them. Task 4.2 also asks you to *design* least-privilege policies and interpret them, so this is both an analytical and a design skill.

The reason this is hard is that AWS authorization is the combination of up to six policy types, each with different scope and effect, evaluated by a specific algorithm where **an explicit deny anywhere always wins** and several types act as *boundaries* (caps) rather than grants. A permission boundary or SCP can silently block an action that an identity policy clearly allows, and a resource policy can grant cross-account access that the identity's account never explicitly enabled. The specialty candidate must hold the whole evaluation model in their head and walk a request through it deterministically. Get the model right and the policy-puzzle questions become mechanical; get it fuzzy and they're guesswork.

This lesson covers the policy types, the evaluation algorithm, and least-privilege design. After it you will be able to determine whether any request is allowed given a set of policies, and design policies that grant exactly the needed access.

---

## Core Concepts

### The Policy Types

AWS authorization draws on several policy types, each with a distinct role:

- **Identity-based policies** — attached to IAM users, groups, or roles; they *grant* permissions to the principal.
- **Resource-based policies** — attached to a resource (S3 bucket, KMS key, SQS queue, Lambda); they grant permissions to specified principals, including **cross-account** without role assumption.
- **Permission boundaries** — attached to an IAM user or role; they set the **maximum** permissions that identity can have (a cap, not a grant).
- **Service Control Policies (SCPs)** — AWS Organizations policies on OUs/accounts; they set the **maximum** permissions for *every* principal in the affected accounts (including root) — a cap, not a grant.
- **Resource Control Policies (RCPs)** — AWS Organizations policies that set the **maximum** permissions on *resources* in affected accounts (a newer cap that applies to resource access org-wide).
- **Session policies** — passed at role assumption; they narrow the session to the intersection with the role's permissions.

The crucial mental split: **identity and resource policies *grant*; boundaries, SCPs, RCPs, and session policies *limit*.** An action is allowed only if it is granted *and* not capped out by any boundary and not explicitly denied anywhere.

### The Evaluation Algorithm

AWS evaluates a request through a deterministic flow. Simplified to what the exam tests:

1. **Default deny** — every request starts implicitly denied.
2. **Explicit deny check** — if *any* applicable policy (identity, resource, SCP, RCP, boundary, session) contains an explicit `Deny` that matches, the request is **denied, full stop**. Explicit deny always wins.
3. **Organization SCPs** — the action must be allowed by SCPs for the account; if SCPs don't allow it, denied (SCPs are an allow-list cap at the org level).
4. **Resource-based policy** — an allow here can grant access (and for cross-account, both the resource policy and the caller's identity policy generally must allow, except some services where the resource policy alone suffices).
5. **Identity-based policy** — must allow the action (unless a resource policy alone grants it for same-account or specific cross-account cases).
6. **Permission boundary** — if present, the action must be within the boundary (the effective permission is the intersection of identity policy and boundary).
7. **Session policy** — if present, the action must be within it (intersection).
8. **RCPs** — resource control policies must not cap out the resource access.

If the action survives all of these — granted by identity and/or resource policy, and not excluded by any deny, SCP, RCP, boundary, or session policy — it is **allowed**. The exam's puzzle questions are solved by walking this flow.

### Explicit Deny Always Wins

The most important single rule: **an explicit `Deny` overrides any `Allow`**, in any policy type, always. This is why SCPs and permission boundaries with `Deny` statements are such effective guardrails — they cannot be overridden by a permissive identity policy, not even by an account administrator or root. When a scenario says "the user has full admin but still can't do X," look for an explicit deny in an SCP, RCP, permission boundary, or resource policy.

### Boundaries Cap, They Don't Grant

A frequent exam trap: a **permission boundary** or **SCP** by itself grants nothing. If a permission boundary allows `s3:*` but the identity policy grants nothing, the principal can do nothing — because the boundary only caps, and there's no grant. Effective permissions are the **intersection**: (identity policy grant) ∩ (permission boundary) ∩ (SCP) ∩ (session policy), minus any explicit deny. The candidate must resist reading a boundary or SCP as a grant.

### Resource Policies and Cross-Account Access

**Resource-based policies** are special because they enable **cross-account access without role assumption**: an S3 bucket policy can grant another account's principal read access directly. For cross-account, the general rule is that **both** the resource policy (in the resource's account) and the caller's identity policy (in the caller's account) must allow the action — neither account can unilaterally grant access. (A few services allow the resource policy alone to suffice.) This two-account agreement is the resource-policy analog of the two-sided trust in role assumption, and the exam tests it in cross-account scenarios.

### Conditions and Context

Policy **conditions** refine when a statement applies, using request context keys: `aws:SourceIp`, `aws:PrincipalTag`/`aws:ResourceTag` (ABAC), `aws:MultiFactorAuthPresent` (require MFA), `aws:PrincipalOrgID` (restrict to your organization), `aws:SourceArn`/`aws:SourceAccount` (confused-deputy protection), `aws:RequestedRegion`, and many more. Conditions are how least-privilege gets precise — allowing an action only from your org, only with MFA, only on tagged resources, only from specific networks. The exam expects you to read and write conditions and to recognize patterns like `aws:PrincipalOrgID` to lock a resource policy to your organization.

### Designing for Least Privilege

**Least privilege** means granting exactly the permissions needed and no more. The specialty approach: start from deny-all and add only required actions on specific resources; scope with conditions; prefer managed policies for common patterns but write tight custom policies for sensitive access; use **permission boundaries** to safely delegate IAM (so teams can create roles but never exceed the boundary); and continuously rightsize using IAM Access Analyzer's unused-access findings (next lesson). Least privilege is iterative — grant minimally, observe, and tighten. The exam rewards designs that are specific (named actions/resources), conditional (MFA, org, tags), and bounded (boundaries/SCPs).

---

## Configuration Reference

Policy types — grant vs. cap:

```text
Type                    Attached to        Effect
----------------------- ------------------ ----------------------------------
Identity-based          user/group/role    GRANTS permissions to the principal
Resource-based          a resource         GRANTS (incl. cross-account)
Permission boundary     user/role          CAPS the identity's max permissions
SCP                     OU/account (org)   CAPS every principal in the account
RCP                     OU/account (org)   CAPS access to resources in the account
Session policy          assumed session    CAPS (intersection with role) the session
```

Evaluation order (does the request survive?):

```text
1. default DENY
2. explicit DENY anywhere?           → DENY (always wins)
3. allowed by SCPs?                  → else DENY
4. resource policy allow? (cross-acct: + identity allow)
5. identity policy allow?            → (grant from 4 or 5 required)
6. within permission boundary?       → else DENY
7. within session policy?            → else DENY
8. not capped by RCPs?               → else DENY
→ otherwise ALLOW
Effective = (identity ∪ resource grant) ∩ boundary ∩ SCP ∩ session ∩ RCP − explicit deny
```

Useful condition keys:

```text
aws:PrincipalOrgID        restrict to your organization
aws:MultiFactorAuthPresent require MFA
aws:SourceArn/SourceAccount confused-deputy protection
aws:PrincipalTag / aws:ResourceTag  ABAC
aws:SourceIp / aws:RequestedRegion   network / region constraints
```

---

## How to Decide

- **"Admin user still can't do X"?** → look for an explicit **Deny** in an SCP, RCP, permission boundary, or resource policy.
- **"Boundary/SCP allows it but nothing happens"?** → boundaries/SCPs don't grant; the identity policy must also grant.
- **Cross-account resource access?** → both the resource policy and the caller's identity policy must allow (generally).
- **Delegate IAM safely?** → permission boundaries so teams can't exceed a cap.
- **Lock a resource to your org?** → condition on `aws:PrincipalOrgID`. **Require MFA?** → `aws:MultiFactorAuthPresent`.
- **Design least privilege?** → start deny-all, add specific actions/resources, scope with conditions, bound with boundaries, rightsize with Access Analyzer.

---

## How This Connects

This lesson is the analytical core of the IAM domain, building on temporary credentials (session policies) and feeding the advanced-authorization lesson (RBAC/ABAC, cross-account, Verified Permissions) and the troubleshooting lesson (Policy Simulator and Access Analyzer to test and validate this logic). SCPs and RCPs connect to multi-account governance (Domain 6), and resource policies connect to KMS key policies and S3 controls in Data Protection (Domain 5).

---

## Exam Traps

- **Forgetting explicit deny wins.** Any matching `Deny` — in any policy type — overrides every allow.
- **Reading boundaries/SCPs as grants.** They only cap; a grant must come from an identity or resource policy.
- **Missing the cross-account two-policy rule.** Cross-account resource access generally needs both the resource policy and the caller's identity policy to allow.
- **Ignoring SCPs in an org.** An SCP can block an action no matter how permissive the account's IAM is — even for root.
- **Overlooking RCPs.** Resource control policies cap resource access org-wide and can deny what an identity/resource policy allows.
- **Confusing intersection with union.** Effective permission is the *intersection* of grants and caps, minus denies — not the union.

---

## Summary

AWS authorization combines up to six policy types evaluated by a deterministic algorithm. Identity-based and resource-based policies **grant** permissions (resource policies enabling cross-account access, generally requiring both accounts to allow), while permission boundaries, SCPs, RCPs, and session policies **cap** them. A request starts denied; an **explicit deny anywhere always wins**; SCPs must allow it; a grant must come from an identity and/or resource policy; and it must fall within any permission boundary, session policy, and RCP. Effective permission is the intersection of grants and caps minus any deny. Conditions (org ID, MFA, tags, source ARN) make access precise. Least-privilege design starts from deny-all, grants specific actions on specific resources with tight conditions, bounds delegation with permission boundaries, and rightsizes continuously. Mastering this model turns the exam's policy puzzles into deterministic walk-throughs.

---

## Examples

**Example 1 — Silent block.** A developer with `AdministratorAccess` can't launch large instances → an **SCP** (or permission boundary) explicitly denies those instance types; explicit deny overrides the admin allow.

**Example 2 — Boundary without grant.** A new role has a permission boundary allowing `s3:*` but an empty identity policy → it can do **nothing**, because the boundary only caps and there's no grant.

**Example 3 — Cross-account read.** Account B reads a bucket in Account A → Account A's **bucket policy** allows B's role *and* B's **identity policy** allows the S3 action — both required.

**Example 4 — Org lock.** A bucket should be reachable only by your organization → resource policy condition `aws:PrincipalOrgID` equals your org ID.

---

## Think About It

A user has an identity policy granting `s3:GetObject` on a bucket, the bucket policy allows it, there are no SCPs or session policies, but the request is denied. Walk the evaluation algorithm and name the two remaining policy mechanisms that could be causing the deny — and explain why an explicit deny in either would override the two allows you can see.

---

## Quick Check

1. In AWS policy evaluation, what always overrides an allow?
2. Do permission boundaries and SCPs grant permissions? What do they do?
3. What is required for cross-account access via a resource-based policy?
4. How do you express effective permissions when identity policy, permission boundary, and SCP all apply?

*Answers: (1) an explicit Deny in any applicable policy type; (2) no — they only cap (set the maximum) permissions; an actual grant must come from an identity-based or resource-based policy; (3) generally both the resource-based policy (in the resource's account) and the caller's identity-based policy (in the caller's account) must allow the action; (4) the intersection of the identity policy grant, the permission boundary, and the SCP (and any session policy/RCP), minus any explicit deny.*

---

## What's Next

Next: **Advanced Authorization — RBAC, ABAC, and Cross-Account** — scaling permissions with roles and attributes, designing cross-account access, and application authorization with Amazon Verified Permissions.
