---
title: "Authentication Strategies and Federation"
type: content
estimated_minutes: 18
cert_tags: ["SCS-C03"]
---

# Authentication Strategies and Federation

## Overview

Identity and Access Management is the single largest domain on the Security Specialty exam (20% of scored content), and it splits into two halves: **authentication** (proving who or what you are) and **authorization** (what you're allowed to do). This lesson covers the authentication half — Task 4.1 — which asks you to design identity solutions for **human, application, and system** access, configure mechanisms for temporary credentials, and troubleshoot authentication. The specialty-level skill is choosing the right identity solution for each kind of principal and integrating with existing identity providers at scale, rather than creating IAM users for everyone.

The defining principle of modern AWS authentication is **federate, don't proliferate**. Creating long-lived IAM users with passwords and access keys does not scale and is a security liability — credentials sprawl, rarely rotate, and become the attacker's favorite target. Instead, the specialty patterns center on **federation** (users authenticate with your existing corporate identity provider and assume roles for temporary access), **IAM Identity Center** (the front door for workforce access across many accounts), **Cognito** (for application end users), and **temporary credentials** everywhere. A candidate at this level should reflexively reach for federation and temporary credentials and treat standing IAM users as the exception requiring justification. The exam tests matching the identity solution — workforce vs. customer, human vs. workload — to the scenario and integrating with IdPs via SAML and OIDC.

This lesson covers the authentication landscape: IAM Identity Center, federation, Cognito, MFA, Directory Service, and root account protection. After it you will be able to design an authentication strategy for any class of principal and troubleshoot authentication failures.

---

## Core Concepts

### The Three Classes of Principal

The exam frames identity around **who or what** is authenticating: **humans** (employees/workforce, and external customers/end users), **applications** (workloads calling AWS), and **systems** (servers, devices, on-premises or other-cloud workloads). Each has a preferred solution: workforce humans → **IAM Identity Center** with federation to your corporate IdP; customer/end users of your apps → **Amazon Cognito**; applications running on AWS → **IAM roles** (instance profiles, execution roles); systems outside AWS → **IAM Roles Anywhere** (next lesson). The recurring mistake the exam punishes is using IAM users (long-lived credentials) for any of these when a federated or role-based temporary-credential solution exists.

### AWS IAM Identity Center — The Workforce Front Door

**AWS IAM Identity Center** (formerly AWS SSO) is the recommended way to manage **workforce** access to multiple AWS accounts and applications from a single place. It connects to an identity source — its built-in directory, **Active Directory**, or an external IdP via **SAML 2.0 / SCIM** (Okta, Entra ID, Ping, etc.) — and grants access through **permission sets** (collections of policies that become IAM roles in the target accounts). Users sign in once to a portal and choose which account/role to access, receiving **temporary credentials**. The benefits: centralized access across an organization, no per-account IAM users, federation with the corporate IdP (so joiners/leavers are managed in one place via SCIM provisioning), and consistent MFA. The exam strongly favors IAM Identity Center for "manage workforce access across many accounts with the corporate identity provider."

### Federation with SAML and OIDC

**Federation** lets users authenticate with an external identity provider and receive temporary AWS credentials, so AWS trusts the IdP rather than storing the credentials itself. Two protocols dominate: **SAML 2.0** (common for enterprise workforce IdPs) and **OIDC/OAuth** (common for web/mobile and CI/CD systems like GitHub Actions). The mechanics: the IdP authenticates the user, AWS validates the assertion/token against a configured **identity provider** trust, and **STS** issues temporary credentials for an assumed role (via `AssumeRoleWithSAML` or `AssumeRoleWithWebIdentity`). Federation is how you avoid IAM users entirely for human and CI/CD access. The exam expects you to recognize SAML for enterprise SSO, OIDC for web/CI/CD, and that both end in STS-issued temporary credentials.

### Amazon Cognito — Application End-User Identity

**Amazon Cognito** handles identity for the **end users of your applications** (customers), which is distinct from workforce/AWS-principal identity. A **user pool** is a managed user directory that authenticates app users (sign-up/sign-in, MFA, password policies) and can federate to social and enterprise IdPs, issuing JWTs. An **identity pool** exchanges a token for **temporary AWS credentials** (via STS) so authenticated app users can access AWS resources with least privilege. The exam's key distinction: Cognito is for *customer/application* identity; IAM Identity Center and IAM are for *workforce/AWS* identity. Don't use IAM users for application end users.

### Multi-Factor Authentication

**MFA** adds a second authentication factor and is a baseline specialty requirement — especially on the **root user** and privileged roles. AWS supports virtual authenticator apps (TOTP), **FIDO2 / hardware security keys** (phishing-resistant, the strongest option), and hardware TOTP tokens. The exam expects MFA enforced via IAM policy conditions (`aws:MultiFactorAuthPresent`) for sensitive actions, MFA required in IAM Identity Center, and phishing-resistant FIDO2 keys for the highest-assurance access. Note AWS has been moving toward *requiring* MFA for root users.

### Directory Service

**AWS Directory Service** provides managed Microsoft Active Directory (**AWS Managed Microsoft AD**) and connectors, used when workloads or IAM Identity Center need to integrate with Active Directory — for example, EC2 Windows instances joined to a domain, or using AD as the identity source for IAM Identity Center. The exam references Directory Service as the AD integration point for authentication and troubleshooting (e.g., a federation or join failure traced to the directory).

### Trusted Identity Propagation

A scaling problem with traditional federation is that once a user assumes a role, downstream services see the *role*, not the person — so access decisions and audit logs lose the real user's identity. **IAM Identity Center trusted identity propagation** addresses this by carrying the user's actual identity (and group memberships) through to connected AWS services — for example, analytics and data services where access should be tied to the individual, not a shared role. The benefit for security is **end-to-end auditability and per-user authorization**: the user's identity flows from the corporate IdP through Identity Center to the service, so logs show *who* accessed data and policies can authorize the specific person rather than a broad role shared by a team. The exam expects awareness that workforce identity can be propagated end-to-end for finer authorization and clearer audit trails, rather than collapsing every user into one assumed role.

### Protecting the Root User

The **root user** has unrestricted access and a small set of tasks only it can perform, so protecting it is a top priority and a tested topic: enable **MFA** (ideally a hardware key), remove or avoid root **access keys** entirely, use root only for the rare tasks that require it, and in an organization, **centralize and lock down root** for member accounts (Domain 6's centralized root management) with **break-glass** procedures for emergency use. The exam treats unprotected root as a critical finding and expects MFA plus minimal, audited use.

---

## Configuration Reference

Principal → identity solution:

```text
Principal                         Solution
--------------------------------- ------------------------------------------
Workforce humans (multi-account)  IAM Identity Center + federation (SAML/SCIM)
Enterprise SSO                    SAML 2.0 federation → STS temporary creds
Web/mobile/CI-CD systems          OIDC federation → AssumeRoleWithWebIdentity
Application end users (customers) Amazon Cognito (user pool + identity pool)
Applications on AWS               IAM roles (instance profile / execution role)
Systems outside AWS               IAM Roles Anywhere (X.509) — next lesson
```

Federation mechanics:

```text
SAML 2.0  enterprise IdP → AssumeRoleWithSAML → STS temp creds
OIDC      web/CI-CD IdP → AssumeRoleWithWebIdentity → STS temp creds
IAM Identity Center  permission sets → roles in target accounts (temp creds)
```

MFA and root protection:

```text
MFA factors  TOTP app · FIDO2/hardware key (phishing-resistant, strongest) · hardware TOTP
Enforce MFA  IAM policy condition aws:MultiFactorAuthPresent = true
Root user    enable MFA, remove access keys, minimal use, centralize/lock in org + break-glass
```

---

## How to Decide

- **Workforce access to many accounts?** → IAM Identity Center federated to the corporate IdP (SAML/SCIM).
- **Enterprise SSO into AWS?** → SAML federation; **web/mobile/CI-CD?** → OIDC federation. Both end in STS temp creds.
- **Authenticate your application's customers?** → Amazon Cognito (not IAM users).
- **Need AD integration?** → AWS Directory Service (Managed Microsoft AD).
- **High-assurance, phishing-resistant MFA?** → FIDO2 hardware security keys.
- **Protect root?** → MFA + no access keys + minimal, audited use + org-level centralization.

---

## How This Connects

This lesson opens the IAM domain and sets up the next four: temporary credentials and workload identity (the STS mechanics behind federation), policy evaluation and least privilege (what the authenticated principal can do), advanced authorization (RBAC/ABAC, Verified Permissions), and troubleshooting. IAM Identity Center and root centralization connect to multi-account governance (Domain 6), and Cognito connects to the AI Practitioner application-identity material.

---

## Exam Traps

- **IAM users for everything.** Workforce → IAM Identity Center; customers → Cognito; workloads → roles; external systems → Roles Anywhere. IAM users (long-lived keys) are the exception, not the default.
- **Confusing Cognito and IAM Identity Center.** Cognito = application *end-user* identity; IAM Identity Center = *workforce/AWS* access.
- **Mixing SAML and OIDC.** SAML for enterprise workforce SSO; OIDC for web/mobile and CI/CD federation.
- **Weak or missing root MFA.** Unprotected root is critical; require MFA (ideally hardware) and remove root access keys.
- **Forgetting federation ends in STS.** Federated access produces temporary credentials via STS, not permanent keys.
- **Ignoring SCIM provisioning.** IAM Identity Center with SCIM auto-manages joiners/leavers from the IdP — better than manual user management.

---

## Summary

Modern AWS authentication means federate and use temporary credentials, not proliferate IAM users. Match the principal to the solution: workforce humans use IAM Identity Center federated to the corporate IdP (SAML/SCIM) with permission sets that become roles; enterprise SSO uses SAML and web/mobile/CI-CD uses OIDC, both issuing STS temporary credentials; application end users use Amazon Cognito (user pools for authentication, identity pools for AWS credentials); applications on AWS use IAM roles; and AD integration uses Directory Service. Enforce MFA broadly — phishing-resistant FIDO2 keys for the highest assurance — and protect the root user with MFA, no access keys, minimal use, and organization-level centralization. The throughline is trusting an identity provider and issuing short-lived credentials rather than storing long-lived ones.

---

## Examples

**Example 1 — Workforce SSO.** A company with Okta needs employees to access 50 AWS accounts → **IAM Identity Center** federated to Okta via SAML/SCIM, access granted through permission sets.

**Example 2 — CI/CD without keys.** GitHub Actions must deploy to AWS without stored access keys → **OIDC federation** (`AssumeRoleWithWebIdentity`) to a scoped role.

**Example 3 — App customers.** A mobile app must authenticate millions of consumers and let them upload to their own S3 prefix → **Cognito** user pool (auth) + identity pool (temporary AWS credentials).

**Example 4 — Root protection.** An audit flags root access keys and no MFA → remove the keys, enable a **FIDO2 hardware key** MFA, and restrict root to break-glass use.

---

## Think About It

A company secures access by creating an IAM user with access keys for every employee and every CI/CD pipeline, and shares the root credentials among three admins "for emergencies." Identify the three distinct authentication anti-patterns here (workforce, automation, root), and redesign each with the appropriate federated or temporary-credential solution, explaining how your design eliminates long-lived credentials.

---

## Quick Check

1. What is the recommended solution for workforce access across many AWS accounts, and what does it issue?
2. What is the difference between Amazon Cognito and IAM Identity Center?
3. Which federation protocol suits enterprise SSO, and which suits web/mobile and CI/CD?
4. Name two ways to protect the root user.

*Answers: (1) AWS IAM Identity Center, federated to the corporate identity provider; it grants access via permission sets that become roles in target accounts, issuing temporary credentials; (2) Cognito provides identity for application end users (customers), while IAM Identity Center manages workforce access to AWS accounts and applications; (3) SAML 2.0 for enterprise SSO, OIDC for web/mobile and CI/CD federation — both produce STS temporary credentials; (4) any two of enable MFA (ideally a FIDO2 hardware key), remove root access keys, use root only for required tasks, and centralize/lock down root in the organization with break-glass procedures.*

---

## What's Next

Next: **Temporary Credentials and Workload Identity** — STS in depth, presigned URLs, session tags, and IAM Roles Anywhere for systems outside AWS.
