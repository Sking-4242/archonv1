---
title: "Amazon Cognito"
type: content
estimated_minutes: 17
cert_tags: ["SAA-C03", "SOA-C03", "SCS-C03"]
---

# Amazon Cognito

## Overview

Amazon Cognito provides **authentication, authorization, and user management** for web and mobile applications. It lets you add sign-up and sign-in to apps, federate with social and enterprise identity providers, and grant authenticated users secure, temporary access to AWS resources — without building and operating your own identity system. This *service reference* lesson covers the two core components (user pools and identity pools), how they differ and combine, security features, and what each certification expects.

Cognito matters because building secure authentication — password storage, MFA, token issuance, federation, account recovery — is hard, security-sensitive, and undifferentiated. Cognito provides it as a managed service that scales to millions of users. The single most important thing to understand is the distinction between its two pieces, which are frequently confused: a **user pool** is a **user directory** that authenticates users and issues tokens (the "who are you" / sign-in part), while an **identity pool** (federated identities) **exchanges a verified identity for temporary AWS credentials** to access AWS services directly (the "what AWS resources can you touch" part). Many apps use a user pool alone, an identity pool alone, or both together.

---

## How It Works

- **User pool** — a managed user directory. Users sign up and sign in (with username/password, or **federated** via Google, Apple, Facebook, or enterprise **SAML/OIDC** providers), and the pool issues standard **JWT tokens** (ID, access, and refresh tokens). It handles MFA, email/phone verification, password policies, account recovery, and a **hosted UI** for sign-in. API Gateway and ALB can authorize requests directly against a user pool. This is the **authentication** layer.
- **Identity pool (federated identities)** — takes a verified identity (a Cognito user pool token, a social/SAML token, or even unauthenticated guest access) and, via **STS**, returns **temporary, limited-privilege AWS credentials** mapped to an IAM role. This lets the app call AWS services (e.g., upload to a specific S3 prefix) directly with least privilege. This is the **authorization-to-AWS** layer.

The common combined pattern: users authenticate against a **user pool**, then the app passes the user-pool token to an **identity pool** to obtain scoped AWS credentials — sign-in plus direct, role-based AWS access.

---

## Key Features

- **User pools**: sign-up/sign-in, **MFA** (SMS/TOTP), hosted UI, password policies, account recovery, **Lambda triggers** to customize the auth flow (pre-sign-up, pre-token-generation, custom auth), and **groups** mapped to IAM roles.
- **Federation**: social identity providers and enterprise **SAML 2.0 / OIDC**, so users bring existing identities.
- **Identity pools**: temporary AWS credentials via STS with **role mapping** (including per-group or rule-based roles) and optional **guest (unauthenticated)** access.
- **Advanced security features**: **compromised-credential** detection, **adaptive authentication** (risk-based MFA), and protection against credential stuffing.
- **Token-based authorization** consumable by **API Gateway** (Cognito authorizers) and **ALB**.

---

## Configuration Reference

- **Choose the component(s)**: a **user pool** if you need a user directory and sign-in; an **identity pool** if you need to hand out temporary AWS credentials; **both** for sign-in plus direct AWS access.
- **Enable MFA and a strong password policy**, and turn on **advanced security features** for risk-based protection.
- **Configure federation** (social/SAML/OIDC) to let users reuse existing identities.
- **Map identity-pool roles** to least-privilege IAM roles (per group or via rules); restrict or disable unauthenticated access unless required.

---

## Operations and Troubleshooting

- **Confusing the two pools.** If the requirement is "let users sign in / a user directory," that's a **user pool**; if it's "give the app temporary AWS credentials to call S3/DynamoDB," that's an **identity pool**. Most "which Cognito component" questions hinge on this.
- **API Gateway returns 401.** Check the Cognito **authorizer** configuration, token validity/expiry, and that the app sends the correct (ID vs. access) token.
- **Over-privileged app users.** Tighten the identity-pool IAM role(s) to least privilege and use group-based role mapping.
- **Account-takeover risk.** Enable advanced security features (adaptive auth, compromised-credential checks) and enforce MFA.

---

## Integrations

Cognito issues tokens consumed by **API Gateway** and **ALB** for request authorization, exchanges identities for AWS credentials via **STS** mapped to **IAM** roles, customizes flows with **Lambda triggers**, federates with **SAML/OIDC** and social providers, and commonly fronts serverless backends (**Lambda**, **AppSync**, **S3**, **DynamoDB**) that authenticated users access. It is the standard managed identity layer for customer-facing (CIAM) applications, complementing **IAM Identity Center** (which is for workforce/AWS-account access, not application end users).

---

## Pricing and Cost Considerations

Cognito **user pools** are priced primarily by **monthly active users (MAU)**, with a free tier of MAUs, and additional charges for **advanced security features** (priced per MAU) and for some federation types; **identity pools** themselves are essentially free (you pay for the AWS resources the issued credentials use). The cost scales with your active user base, so the levers are right-sizing advanced-security usage and understanding MAU-based billing. For very large user bases, MAU pricing is the main planning factor. Exact prices vary by Region and feature tier.

---

## Exam Relevance

**SAA-C03:** Know the **user pool (authentication/directory) vs. identity pool (temporary AWS credentials)** distinction, federation, the combined pattern, and Cognito as the authorizer for API Gateway/serverless apps. Design depth — the two-pool distinction is the classic question.

**SOA-C03:** Operate app identity — MFA, federation configuration, and token/authorizer troubleshooting. Operations depth.

**SCS-C03:** Secure application identity — MFA and advanced security features, least-privilege identity-pool role mapping, federation, and Cognito vs. IAM Identity Center (customer vs. workforce identity). Security depth.

---

## Summary

Amazon Cognito provides managed authentication, authorization, and user management for applications through two components: **user pools** (a user directory that authenticates users — including social/SAML/OIDC federation — and issues JWT tokens, with MFA, hosted UI, and Lambda-trigger customization) and **identity pools** (which exchange a verified identity for temporary, least-privilege AWS credentials via STS and IAM role mapping). They are used separately or together (sign in with a user pool, then get AWS credentials from an identity pool). Advanced security features add risk-based and compromised-credential protection, and tokens authorize requests at API Gateway/ALB. The defining exam point is the user-pool-vs-identity-pool distinction, and Cognito is customer-facing identity, distinct from IAM Identity Center for workforce access.

---

## Quick Check

1. What is the difference between a Cognito user pool and an identity pool, and which issues temporary AWS credentials?
2. Describe the combined pattern that uses both pools together.
3. How can an application authorize API Gateway requests using Cognito?
4. Which features protect against account takeover and credential stuffing?
5. When would you use Cognito versus IAM Identity Center?

---

## What's Next

Pair this with **Amazon API Gateway** (Cognito authorizers), **AWS IAM** (identity-pool role mapping and STS), and **AWS Lambda** (auth-flow triggers and protected backends).
