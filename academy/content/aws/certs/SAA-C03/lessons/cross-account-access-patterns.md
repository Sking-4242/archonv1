---
title: "Cross-Account Access: STS, Role Switching, and Resource Policies"
type: content
estimated_minutes: 14
cert_tags: ["SAA-C03"]
---

# Cross-Account Access: STS, Role Switching, and Resource Policies

## Overview

Most real AWS environments are not a single account. Organizations split workloads across many accounts — separate accounts for production and development, a dedicated security or logging account, per-team or per-application accounts — because account boundaries are the strongest isolation boundary AWS offers. The moment you have more than one account, you face a new problem the IAM fundamentals lesson did not solve: how does a principal in Account A securely use a resource in Account B without copying long-lived credentials around?

The answer is AWS Security Token Service (STS) and the assume-role pattern. Instead of creating an IAM user with permanent access keys in every account, you create an IAM **role** in the target account, grant trusted principals permission to assume it, and hand out only short-lived temporary credentials at the moment of use. This is the backbone of nearly every multi-account design on AWS, and it is the single most heavily tested concept in Domain 1, Task 1.1 ("Design secure access to AWS resources"). The exam will not ask you to recite the API — it will give you a two- or three-account scenario and ask which mechanism grants access with the least standing privilege.

This lesson assumes you already know what IAM users, roles, and policies are. Here you will learn the two-sided trust model that makes cross-account access work, when to reach for a resource-based policy instead of a role, how `ExternalId` defends third-party access, and how role chaining behaves. After this lesson you will be able to read any cross-account scenario and name the correct access path.

---

## Core Concepts

### The Two-Sided Trust Model

Cross-account role assumption always requires **two** policies that must agree. This is the concept students most often get wrong.

First, the role in the **target** account (Account B) has a **trust policy** (also called the assume-role policy document). It names the principal that is *allowed to assume* the role — for example, "any principal in Account A" or one specific role. Second, the **calling** principal in the **source** account (Account A) needs an identity policy granting `sts:AssumeRole` on that specific role ARN. Access is granted only when both sides allow it. The target account controls *who may enter*; the source account controls *who may leave*. Neither side alone is sufficient, which is exactly why the model is secure — no single account can unilaterally grant itself access to another.

When a principal successfully assumes the role, STS returns temporary credentials (an access key, secret key, and session token) that expire — typically after one hour, configurable from 15 minutes up to 12 hours. The principal then acts with the role's permissions, not its own.

### IAM Roles vs. Resource-Based Policies

There are two fundamentally different ways to share access across accounts, and choosing correctly is a frequent exam decision point.

The **role / STS** approach is required when the calling service does not itself support a resource policy. The principal assumes a role and *becomes* an identity in the target account. Use it for EC2, Lambda, or a human switching roles in the console.

The **resource-based policy** approach attaches a policy directly to the resource itself, granting another account access without any role assumption. S3 bucket policies, SQS queue policies, SNS topic policies, KMS key policies, and Lambda resource policies all support this. The cross-account principal keeps its own identity and accesses the resource directly. This is simpler — no `AssumeRole` step — and is the right answer when the question involves one of those resource types. A classic example: letting Account B write objects to an S3 bucket in Account A is best done with a bucket policy, not a role, unless the requirement explicitly needs the caller to take on Account A's identity.

### Role Switching in the Console

The same mechanism powers the "Switch Role" feature in the AWS Management Console. A user signed into Account A can switch into a role in Account B (assuming the trust policy and their identity policy both allow it) and the console seamlessly acts with that role's permissions. This is the standard way to give administrators access to many accounts from a single sign-in identity — no separate username and password per account.

### ExternalId and the Confused Deputy

When you grant access to a **third party** (a SaaS monitoring vendor, for example), the trust policy should require an `sts:ExternalId`. The third party stores a unique ID for you and passes it on every `AssumeRole` call; your trust policy condition requires that exact value. This defends against the **confused deputy** problem: without it, a malicious customer of that same vendor could trick the vendor into assuming *your* role. The `ExternalId` ensures the vendor can only assume your role when acting specifically on your behalf. Expect at least one exam question where the correct answer hinges on recognizing this.

### Role Chaining and Its Limits

**Role chaining** is using one assumed role to assume another (Account A → Role in B → Role in C). It works, but note two exam-relevant constraints: chained role sessions are capped at a **maximum of one hour** regardless of the role's configured maximum session duration, and chaining can complicate auditing. Prefer a direct trust relationship when one exists; chain only when the topology requires it.

---

## Configuration Reference

A complete, working cross-account setup. **Account A** (ID `111111111111`) needs read access to a bucket owned by **Account B** (ID `222222222222`).

**1. The role's trust policy in Account B** — who is allowed to assume it:

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "AWS": "arn:aws:iam::111111111111:role/AppRole" },
    "Action": "sts:AssumeRole",
    "Condition": {
      "StringEquals": { "sts:ExternalId": "archon-shared-2026" }
    }
  }]
}
```

The `Principal` names exactly which identity in Account A may enter. The `ExternalId` condition is included here for the third-party pattern; for first-party access between accounts you own, it can be omitted.

**2. The permissions policy attached to that same role in Account B** — what the role can do once assumed:

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": ["s3:GetObject", "s3:ListBucket"],
    "Resource": [
      "arn:aws:s3:::account-b-data",
      "arn:aws:s3:::account-b-data/*"
    ]
  }]
}
```

**3. The identity policy on `AppRole` in Account A** — permission to leave:

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": "sts:AssumeRole",
    "Resource": "arn:aws:iam::222222222222:role/CrossAccountReadRole"
  }]
}
```

**4. Assuming the role at runtime (CLI):**

```bash
# Returns temporary credentials valid for the role's session duration
aws sts assume-role \
  --role-arn arn:aws:iam::222222222222:role/CrossAccountReadRole \
  --role-session-name appA-read \
  --external-id archon-shared-2026
# The response contains AccessKeyId, SecretAccessKey, and SessionToken.
# Export these (or use a named profile with role_arn + source_profile) and the
# subsequent S3 calls act as the assumed role.
```

For the **resource-based alternative** (no role assumption), the equivalent S3 bucket policy on `account-b-data` would name `arn:aws:iam::111111111111:root` as the `Principal` directly and skip steps 3–4 entirely.

---

## How to Decide

Ask these questions in order:

- **Does the target resource support a resource-based policy (S3, SQS, SNS, KMS, Lambda)?** If yes and the caller can keep its own identity, a resource policy is the simplest correct answer.
- **Does the caller need to *act as* an identity in the target account** (e.g., an EC2 instance or Lambda needing broad access there)? Use an IAM role + STS.
- **Is the consumer a third party outside your control?** Use a role with a required `ExternalId`.
- **Do you have many accounts and human users?** Use IAM Identity Center (covered separately) for federated console access rather than per-account role switching by hand.

---

## How This Connects

This lesson builds directly on **IAM fundamentals** (users, groups, roles, policy structure) and **IAM Advanced** (permission boundaries and SCPs, which cap what an assumed role can do even when its policy allows more). It pairs with **AWS Organizations** — SCPs apply to the target account and can block an assumed role's actions regardless of its permissions policy. In Domain 1 it sits alongside the shared lessons on the shared-responsibility model and least privilege, and it is the prerequisite for understanding **IAM Identity Center**, which automates exactly this assume-role flow across an entire organization.

---

## Exam Traps

- **Forgetting the two-sided requirement.** A trust policy alone does not grant access; the caller also needs `sts:AssumeRole` in its own identity policy. Both must allow.
- **Choosing a role when a resource policy is simpler.** If the scenario is "let Account B read an S3 bucket / receive from an SQS queue," the bucket/queue policy is usually the intended answer.
- **Missing `ExternalId` for third-party access.** Any question mentioning a SaaS vendor or external partner assuming a role is signaling the confused-deputy defense.
- **Assuming chained roles keep a 12-hour session.** Role chaining caps the session at one hour.
- **Thinking an SCP can be overridden by an assumed role.** It cannot — an SCP deny in the target account beats any role permission.

---

## Summary

Cross-account access on AWS rests on STS and a two-sided trust model: the target account's role trust policy says who may enter, and the caller's identity policy grants `sts:AssumeRole` to leave. STS issues short-lived temporary credentials, eliminating long-lived keys. For resources that support them (S3, SQS, SNS, KMS, Lambda), a resource-based policy is often the simpler path and needs no role assumption. Require an `ExternalId` whenever a third party assumes your role, and remember that chained roles are limited to one-hour sessions. Mastering this pattern is the key to Domain 1's access-design questions.

---

## Examples

**Example 1 — First-party data sharing.** A data-engineering account must read a production S3 bucket nightly. Because S3 supports resource policies, the cleanest design is a bucket policy granting the data account's role read access — no STS round-trip needed.

**Example 2 — Centralized admin.** A platform team manages 40 accounts. Each account contains an `OrgAdminRole` trusting the central identity account; admins sign in once and switch roles. Standing privilege in each account is zero until a role is assumed.

**Example 3 — Third-party monitoring.** A cost-optimization SaaS needs read-only billing access. You create a role trusting the vendor's account with a required `ExternalId` the vendor generated for your tenant, scoped to read-only Cost Explorer and CloudWatch actions.

---

## Think About It

You need to let a Lambda function in Account A publish messages to an SNS topic in Account B. There are two valid designs: assume a role in Account B, or attach a resource policy to the SNS topic. Which is simpler, and what would make you choose the role instead? (Hint: consider whether the function needs *any other* Account B permissions beyond publishing.)

---

## Quick Check

1. What two policies must both allow access for a cross-account `AssumeRole` to succeed?
2. Name three AWS resource types that support resource-based policies for cross-account sharing.
3. Why does a third-party role-assumption scenario call for an `ExternalId`?
4. What is the maximum session duration for a chained role?

*Answers: (1) the target role's trust policy and the caller's identity policy granting `sts:AssumeRole`; (2) any three of S3, SQS, SNS, KMS, Lambda; (3) to prevent the confused-deputy problem so the vendor can only assume your role on your behalf; (4) one hour.*

---

## What's Next

Next in this module: **Amazon Cognito for Application User Authentication** — how to handle *end-user* identity (as opposed to the AWS-principal identity covered here) for web and mobile apps, and where Cognito fits among the security services SAA expects you to place correctly.
