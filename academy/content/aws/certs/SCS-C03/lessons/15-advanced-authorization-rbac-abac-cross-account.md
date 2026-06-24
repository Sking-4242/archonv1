---
title: "Advanced Authorization: RBAC, ABAC, and Cross-Account"
type: content
estimated_minutes: 18
cert_tags: ["SCS-C03"]
---

# Advanced Authorization: RBAC, ABAC, and Cross-Account

## Overview

Once you understand how a single request is evaluated, the next challenge is **designing authorization that scales** — across thousands of users, many teams, multiple accounts, and applications with their own permission models. The Security Specialty exam's Task 4.2 covers exactly this: designing role-based and attribute-based access control, building cross-account access with resource policies and role trust, using IAM paths and IAM Roles Anywhere, and authorizing access *within applications* with Amazon Verified Permissions. These are design questions — given a scaling or cross-account requirement, which authorization model and mechanism do you choose.

The central tension is between **manageability and granularity**. Writing a bespoke policy per user does not scale; granting everyone broad access is insecure. The two scalable models resolve this differently: **RBAC** groups permissions into roles that many principals share, while **ABAC** grants access dynamically based on matching attributes (tags), so one policy serves an entire organization. Cross-account access adds another dimension — securely letting principals in one account use resources in another via role trust or resource policies. And for the access decisions *inside* your own applications (can this user edit this document?), AWS now offers **Verified Permissions** with the Cedar language, separating application authorization from your code. The specialty skill is matching each pattern to the requirement and combining them safely.

This lesson covers RBAC vs. ABAC, cross-account access patterns, IAM paths and Roles Anywhere in authorization design, and application authorization with Verified Permissions. After it you will be able to design scalable, cross-account, and application-level authorization.

---

## Core Concepts

### Role-Based Access Control (RBAC)

**RBAC** grants permissions through **roles** that represent job functions — a "DatabaseAdmin" role, a "ReadOnlyAuditor" role — and principals assume the role appropriate to their function. RBAC is intuitive and easy to audit (you can see who has which role), and it's the default model for most workforce access via IAM Identity Center permission sets. Its limitation is **role explosion**: as you add teams, environments, and resource groupings, the number of distinct roles multiplies (DatabaseAdmin-ProjectA-Prod, DatabaseAdmin-ProjectB-Dev, …), and each needs maintenance. RBAC works well when access maps cleanly to a manageable set of functions; it strains when access depends on many cross-cutting attributes.

### Attribute-Based Access Control (ABAC)

**ABAC** grants access by comparing **attributes** (tags) on the principal and the resource at request time, rather than enumerating roles. A single policy can say "allow access to resources whose `project` tag matches the principal's `project` tag" — and it automatically covers every project without a new policy or role. On AWS, ABAC uses **tags** plus **condition keys** (`aws:PrincipalTag/...` compared to `aws:ResourceTag/...`), with principal tags often delivered as **session tags** from the federated IdP. ABAC's advantages: it **scales without policy proliferation** (one policy, many projects/teams), and access automatically follows attribute changes (tag a new resource, and matching principals get access). Its requirements: disciplined, governed **tagging** (untagged or mistagged resources break the model) and trustworthy attribute sources. The exam pairs "grant access based on team/project/department without a policy per group" with ABAC, and "scale access as you add teams without creating new roles" specifically with ABAC over RBAC.

### Choosing RBAC vs. ABAC (and Combining)

The exam expects you to choose: **RBAC** when access maps to a stable, limited set of job functions and you want simple auditability; **ABAC** when access depends on attributes that vary across many teams/projects/environments and you want to avoid role explosion. They are often **combined** — RBAC for coarse function (you're an admin vs. a reader) and ABAC for fine scope (which project's resources). The decision hinges on whether the dimension of access is a small set of functions (RBAC) or a large, attribute-driven matrix (ABAC).

### Cross-Account Access Patterns

Multi-account organizations constantly need principals in one account to use resources in another, securely. Two mechanisms, from the policy-evaluation lesson: **role assumption** (a role in the target account with a **trust policy** naming the source account/principal; the source principal has `sts:AssumeRole`) — the principal *becomes* an identity in the target account; and **resource-based policies** (the target resource's policy grants the source account directly) — the principal keeps its own identity. Choose role assumption when the caller needs to act broadly as an identity in the target account, and a resource policy when granting access to a specific resource type (S3, KMS, SQS, etc.). Protect third-party cross-account access with **`sts:ExternalId`** (confused-deputy defense) and lock org-internal sharing with **`aws:PrincipalOrgID`**. **IAM role trust policies** are the control point — they decide who may assume a role and under what conditions.

### IAM Paths and Organizing at Scale

**IAM paths** are a hierarchical naming structure for IAM resources (roles, users, policies) — e.g., `/projectA/dev/` — that helps organize and **delegate** at scale. Paths let you write permission policies and boundaries that apply to whole groups of roles by path (e.g., "this team may pass or manage roles under `/projectA/*`"), supporting scalable, delegated administration without enumerating every role. The exam references IAM paths as a mechanism for organizing and scoping authorization in large environments.

### Application Authorization with Amazon Verified Permissions

A different layer of authorization is *within your own applications* — "can **this user** perform **this action** on **this document**?" That is not an AWS API authorization question, so IAM is the wrong tool. **Amazon Verified Permissions** is a fully managed service that externalizes this **application** authorization using the **Cedar** policy language. Your application calls Verified Permissions with the **principal, action, resource, and context**, and Cedar evaluates the applicable policies and returns **Allow or Deny**. This centralizes and externalizes app authorization — policies live outside the code, can change without redeploying, support both RBAC and ABAC, and are analyzable. The exam's key distinction: **IAM authorizes access to AWS APIs/resources; Verified Permissions (Cedar) authorizes actions inside your application** (often paired with Cognito for authentication). Don't use IAM policies to model end-user document-level permissions.

### Putting It Together

A mature design might use IAM Identity Center permission sets (RBAC) for coarse workforce roles, ABAC with session tags for fine-grained resource scope, cross-account role assumption and resource policies for shared services, IAM paths to delegate role management per team, and Verified Permissions for in-application end-user authorization. The specialty skill is selecting the right model and mechanism per layer and keeping each least-privilege.

---

## Configuration Reference

RBAC vs. ABAC:

```text
Model  Grants by            Scales by             Watch out for
------ -------------------- --------------------- ------------------------
RBAC   roles (job function) adding roles          role explosion
ABAC   matching tags        one policy, many tags tagging discipline/governance
Combine: RBAC for coarse function + ABAC for fine resource scope
```

Cross-account mechanisms:

```text
Role assumption     trust policy (who may assume) + caller sts:AssumeRole → becomes target identity
Resource policy     target resource grants source account directly → keeps own identity
Protect: sts:ExternalId (third-party confused-deputy), aws:PrincipalOrgID (org-internal)
```

Application vs. AWS authorization:

```text
IAM                      authorizes AWS API/resource access (principals = AWS identities)
Amazon Verified Permissions  authorizes in-app actions (Cedar: principal, action, resource, context)
                         pairs with Cognito (authn) for app users; policies external to code
IAM paths                hierarchical role/policy naming for scalable delegation
```

---

## How to Decide

- **Access maps to a small set of job functions, easy to audit?** → RBAC.
- **Access depends on team/project/env attributes across many groups?** → ABAC (tags + session tags); avoids role explosion.
- **Both coarse function and fine scope?** → combine RBAC + ABAC.
- **Cross-account: caller acts broadly in the target account?** → role assumption (trust policy). **Grant a specific resource?** → resource policy.
- **Third-party cross-account?** → require `sts:ExternalId`. **Org-internal only?** → `aws:PrincipalOrgID`.
- **Authorize end-user actions inside your app?** → Amazon Verified Permissions (Cedar), not IAM.

---

## How This Connects

This lesson builds directly on policy evaluation (RBAC/ABAC are policy designs; cross-account uses trust and resource policies) and temporary credentials (session tags drive ABAC, role assumption for cross-account). Verified Permissions connects to Cognito and the application-identity material; IAM paths and cross-account patterns connect to multi-account governance (Domain 6); and the next lesson covers analyzing and troubleshooting all of this.

---

## Exam Traps

- **Using RBAC where ABAC fits.** "Scale access as we add teams/projects without new roles" is ABAC; RBAC causes role explosion.
- **ABAC without tag governance.** ABAC depends on disciplined, governed tagging — untagged/mistagged resources silently break access.
- **Using IAM for application authorization.** End-user, document-level "can this user edit this?" is Verified Permissions (Cedar), not IAM policies.
- **Cross-account without ExternalId for third parties.** Omitting `sts:ExternalId` leaves a confused-deputy risk.
- **Forgetting the two-sided cross-account rule.** Role assumption needs the trust policy *and* caller permission; resource-policy access needs both accounts to allow.
- **Confusing role assumption and resource policies.** Assumption makes you an identity in the target account; a resource policy grants you access while keeping your own identity.

---

## Summary

Scalable authorization uses RBAC and ABAC. RBAC grants via job-function roles — simple and auditable but prone to role explosion. ABAC grants by matching principal and resource tags, so one policy serves many teams and projects and access follows attributes automatically — provided tagging is disciplined and governed; it's the answer for scaling without new roles, often combined with RBAC for coarse function plus fine scope. Cross-account access uses role assumption (trust policy + caller permission; the caller becomes a target identity) or resource policies (the resource grants the source account directly), protected by `sts:ExternalId` for third parties and `aws:PrincipalOrgID` for org-internal sharing, with IAM paths organizing delegation at scale. Finally, authorization *inside your applications* belongs to Amazon Verified Permissions (Cedar) — principal/action/resource/context evaluated to allow or deny — not IAM, which authorizes AWS API access. Match the model and mechanism to each layer.

---

## Examples

**Example 1 — ABAC at scale.** A company keeps adding project teams and doesn't want a new role per team → **ABAC**: tag resources and principals with `project`, and one policy grants access where the tags match.

**Example 2 — Cross-account shared service.** A central security account must read logs in every member account → role assumption with trust policies (or resource policies) scoped by `aws:PrincipalOrgID`.

**Example 3 — Third-party access.** A SaaS vendor needs read access to your account → a role trusting the vendor with a required `sts:ExternalId`.

**Example 4 — App permissions.** A document app must enforce "owners can edit, viewers can read" per document → **Amazon Verified Permissions** with Cedar policies, paired with Cognito for sign-in — not IAM.

---

## Think About It

A growing company models access by creating a new IAM role for every combination of team, environment, and resource group, and the number of roles has become unmanageable. Explain how ABAC would collapse many of those roles into a single policy, what tagging governance it requires to be safe, and where you might still keep RBAC for coarse-grained function.

---

## Quick Check

1. What problem does ABAC solve that RBAC struggles with, and what does ABAC depend on?
2. What are the two mechanisms for cross-account access, and how do they differ?
3. What protects a third-party cross-account role from the confused-deputy problem?
4. When do you use Amazon Verified Permissions instead of IAM?

*Answers: (1) ABAC avoids role explosion by granting access through matching principal/resource tags so one policy serves many teams/projects and access follows attributes — but it depends on disciplined, governed tagging; (2) role assumption (a trust policy lets the caller assume a role and become an identity in the target account) and resource-based policies (the resource grants the source account directly while the caller keeps its own identity); (3) requiring an sts:ExternalId in the role's trust policy; (4) for authorizing actions inside your own application (end-user, fine-grained permissions like document access) using Cedar — IAM authorizes access to AWS APIs/resources, not in-application actions.*

---

## What's Next

Next: **Troubleshooting and Analyzing Authorization** — using IAM Policy Simulator and IAM Access Analyzer (external, unused, and internal access, plus custom policy checks) to validate and debug access.
