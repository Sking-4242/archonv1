---
title: "Amazon Cognito for Application User Authentication"
type: content
estimated_minutes: 13
cert_tags: ["SAA-C03"]
---

# Amazon Cognito for Application User Authentication

## Overview

Everything you have learned about IAM so far governs *AWS* identities — users, roles, and services acting on AWS resources. But the people who use the applications you build are not IAM users. A mobile game with two million players, a retail website, a SaaS dashboard — none of those end users should ever appear in IAM. You need a separate identity system for *application* users, one that handles sign-up, sign-in, password resets, multi-factor authentication, and social or enterprise login at scale. That system, on AWS, is Amazon Cognito.

Cognito exists because building authentication correctly is hard and dangerous to get wrong, and because application user identity is a fundamentally different problem from AWS principal identity. Before managed services like Cognito, every team rebuilt password hashing, token issuance, email verification, and federation — and many did it insecurely. Cognito provides a managed, standards-based identity layer (OAuth 2.0, OpenID Connect, SAML) so your application can authenticate users and, when needed, hand them scoped, temporary AWS credentials.

For the SAA exam, Cognito is named explicitly in Domain 1, Task 1.2 ("Design secure workloads and applications"). You will not be asked to configure it line by line. You *will* be asked to recognize, in a scenario, that end-user authentication for a web or mobile app is a Cognito problem — and to distinguish its two components. After this lesson you will be able to place Cognito correctly and explain the difference between a user pool and an identity pool, which is the distinction the exam tests most.

---

## Core Concepts

### User Pools — Authentication (Who Are You?)

A **Cognito user pool** is a managed user directory. It handles the full sign-up and sign-in lifecycle: registration, email/phone verification, secure password storage, password-reset flows, and multi-factor authentication. When a user signs in successfully, the user pool issues standards-based **JSON Web Tokens (JWTs)** — an ID token, an access token, and a refresh token — that your application uses to authenticate subsequent requests.

User pools also act as an **identity broker**: they can federate to external identity providers so users sign in with Google, Apple, Facebook, or a corporate SAML/OIDC provider, while your application still receives one consistent Cognito token. This is the key value — your app integrates with Cognito once, and Cognito handles the messy details of every upstream provider.

The mental model: a user pool answers **"Who are you?"** It is about *authentication*.

### Identity Pools — Authorization to AWS (What AWS Resources May You Touch?)

A **Cognito identity pool** (formerly "federated identities") does something different: it exchanges a token — from a user pool, a social provider, or a SAML provider — for **temporary, limited AWS credentials** via STS. Those credentials map to an IAM role, so an authenticated app user can directly and securely call AWS services like uploading to a specific S3 prefix or reading their own DynamoDB items, without your backend proxying every request.

Identity pools can also grant credentials to **unauthenticated (guest)** users through a separate, more restrictive IAM role — useful for letting anonymous visitors read public content.

The mental model: an identity pool answers **"What AWS resources may you touch?"** It is about *authorization to AWS*, and it is the bridge between application identity and the IAM world you already know.

### Using Them Together

The two components are independent and often combined. A common pattern: users authenticate through a **user pool** (getting JWTs), then the app passes that token to an **identity pool**, which returns temporary AWS credentials tied to an IAM role. Now the user is both authenticated *and* able to call AWS services with least-privilege, per-user scoping. Critically, you can use a user pool alone (if your backend handles all AWS access) or an identity pool alone (if you federate directly from a social provider) — they are not a required pair.

### Where Cognito Sits Among the Security Services

The exam often presents Cognito alongside other security services to test whether you can tell them apart. Cognito is **application end-user identity**. IAM is **AWS principal identity**. AWS WAF filters malicious HTTP traffic. Secrets Manager stores credentials and rotates them. GuardDuty detects threats. When a scenario describes "users signing up and logging into a mobile/web app," the answer is Cognito — not IAM users, which never scale to application users and were never designed for them.

---

## Configuration Reference

The decision points you configure on a user pool, and a minimal token-verification flow.

**Key user-pool settings (console: Cognito → User pools → Create):**

```text
Sign-in options:        email | phone | username        (immutable after creation)
MFA:                    off | optional | required       (SMS or TOTP authenticator)
Password policy:        min length, character classes, reuse prevention
Account recovery:       email and/or phone
App client:             defines OAuth flows + allowed callback URLs
Identity providers:     Cognito directory + optional Google / Apple / SAML / OIDC
```

**Verifying a Cognito JWT in an application** (the everyday integration — your API validates the token Cognito issued):

```text
1. Client signs in to the user pool, receives an ID token (a signed JWT).
2. Client sends the token on each request:  Authorization: Bearer <id_token>
3. Your API validates the token:
   - signature  → against the user pool's public JWKS keys
   - "iss"      → matches https://cognito-idp.<region>.amazonaws.com/<userPoolId>
   - "aud"      → matches your app client ID
   - "exp"      → token not expired
4. If valid, trust the claims (sub, email, groups) and authorize the request.
```

For AWS access, an **identity pool** is wired to trust that user pool; the app calls `GetCredentialsForIdentity` and receives STS credentials mapped to an IAM role whose policy scopes the user (for example, to `s3:PutObject` on `arn:aws:s3:::app-uploads/${cognito-identity.amazonaws.com:sub}/*` so each user can only write to their own prefix).

---

## How to Decide

- **"Users sign up / log into our app"** → user pool (authentication).
- **"Authenticated app users must call AWS services directly with least privilege"** → identity pool (temporary AWS credentials via IAM role).
- **"Let users log in with Google / corporate SSO"** → user pool federation.
- **"Anonymous visitors need limited read access to AWS resources"** → identity pool with an unauthenticated role.
- **"A backend service or EC2 instance needs AWS access"** → not Cognito at all — that is an IAM role.

---

## How This Connects

Cognito is the end-user counterpart to everything in the IAM lessons. Identity pools hand out IAM-role-backed temporary credentials through **STS** — the same engine behind the cross-account access you just studied — so the per-user S3 scoping pattern reuses IAM policy variables. In a typical SAA reference architecture, Cognito fronts an **API Gateway + Lambda** backend (API Gateway has a native Cognito authorizer), and the app's static assets sit on **S3 + CloudFront**. It complements, but does not replace, **WAF** (traffic filtering) and **Shield** (DDoS) at the edge.

---

## Exam Traps

- **Confusing user pools with identity pools.** User pool = authentication and JWTs ("who are you"). Identity pool = temporary AWS credentials via IAM role ("what AWS can you use"). This swap is the single most common Cognito trap.
- **Reaching for IAM users for application users.** IAM users are for AWS principals and do not scale to app end users — never the right answer for sign-up/sign-in scenarios.
- **Thinking the two pools must be used together.** Either can be used alone depending on whether the app needs direct AWS access.
- **Forgetting guest access.** Identity pools can issue credentials to unauthenticated users via a separate restrictive role.

---

## Summary

Amazon Cognito provides managed identity for *application* users, distinct from IAM's AWS-principal identity. A **user pool** is a user directory that authenticates people and issues JWTs, with built-in MFA, password management, and federation to social and enterprise providers. An **identity pool** exchanges a token for temporary, IAM-role-scoped AWS credentials via STS, enabling least-privilege per-user access to AWS services — including an optional guest role. They can be used independently or together. On the exam, any scenario about end users signing up or logging into a web or mobile app points to Cognito, and the most-tested detail is the user-pool-versus-identity-pool distinction.

---

## Examples

**Example 1 — Mobile app with per-user storage.** Players sign in through a user pool (with Google federation), then an identity pool issues credentials letting each player upload save files only to their own S3 prefix. Authentication and fine-grained AWS authorization, no custom backend.

**Example 2 — Serverless API.** A web dashboard uses a user pool; API Gateway's Cognito authorizer validates the JWT on every call before invoking Lambda. No identity pool is needed because all AWS access happens server-side in Lambda's execution role.

**Example 3 — Public kiosk.** A museum's info app needs no login; an identity pool's unauthenticated role grants read-only access to a DynamoDB table of exhibits.

---

## Think About It

Your app lets users log in with their corporate Microsoft accounts and must let them read files from a shared S3 bucket directly from the browser. Which Cognito component(s) do you need, and which one actually produces the AWS credentials the browser uses? Could you accomplish the login half without writing any password-handling code yourself?

---

## Quick Check

1. Which Cognito component authenticates users and issues JWTs?
2. Which Cognito component returns temporary AWS credentials, and what service issues those credentials under the hood?
3. Why are IAM users the wrong choice for application end users?
4. Can an identity pool grant access to users who have not logged in?

*Answers: (1) a user pool; (2) an identity pool, backed by STS issuing credentials for an IAM role; (3) IAM users are for AWS principals and do not scale to application user volumes or sign-up/sign-in flows; (4) yes, via a separate unauthenticated (guest) IAM role.*

---

## What's Next

You have completed the cert-specific additions for **Domain 1: Design Secure Architectures**. Combined with the shared lessons on IAM, KMS, VPC security, GuardDuty, WAF/Shield, and data protection, you now have full coverage of the 30% of the SAA exam that this domain represents. Next module: **Domain 2 — Design Resilient Architectures.**
