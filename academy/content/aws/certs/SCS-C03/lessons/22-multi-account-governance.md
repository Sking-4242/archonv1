---
title: "Multi-Account Governance"
type: content
estimated_minutes: 19
cert_tags: ["SCS-C03"]
---

# Multi-Account Governance

## Overview

Security at scale on AWS is fundamentally a **multi-account** problem. The Security Specialty exam's Security Foundations and Governance domain (14%) opens with developing a strategy to centrally deploy and manage AWS accounts (Task 6.1): organizing accounts with AWS Organizations, standing up governance with Control Tower, enforcing guardrails with **SCPs, RCPs, declarative policies, and AI opt-out policies**, centrally managing security services through delegated administrators, and controlling **root user** access across the organization. This is architecture-and-policy depth — the exam expects you to design org-wide preventive and detective controls, not just secure a single account.

The principle is **centralized guardrails with decentralized autonomy**. Large organizations need many accounts (for isolation and blast-radius reduction) but cannot afford to secure each one individually or trust each team to get it right. The solution is a governance layer — Organizations for structure, Control Tower for an automated baseline, organization policies for guardrails that *cannot be exceeded*, delegated administration so a central security team manages services everywhere, and centralized root control so the most dangerous identity is locked down org-wide. These controls set boundaries that every account inherits and that even local administrators cannot override. The specialty candidate must know each policy type's scope and effect, because the exam tests precisely which guardrail enforces which requirement — and the relationships among SCPs (cap identities), RCPs (cap resource access), and declarative policies (enforce configuration) are exactly the kind of distinction the exam probes.

This lesson covers Organizations and Control Tower, the organization policy types, delegated administration, and centralized root management. After it you will be able to design multi-account governance with the right guardrails.

## Core Concepts

### AWS Organizations and Organizational Units

**AWS Organizations** is the foundation: it groups your AWS accounts under a **management account**, organized into **organizational units (OUs)** (typically by environment, business unit, or sensitivity). Organizations enables consolidated billing and, critically for security, **organization policies** that apply to OUs/accounts, plus org-wide enablement of services (GuardDuty, Security Hub, CloudTrail org trails) via delegated administration. The account/OU structure is itself a security control — separating production from development, isolating sensitive workloads, and bounding blast radius. The exam assumes Organizations as the baseline for every multi-account control.

### AWS Control Tower

**AWS Control Tower** automates setting up and governing a secure, multi-account **landing zone**. It provisions a baseline — a management account, a **log archive** account (centralized logging), and an **audit/security** account — applies preventive and detective **controls (guardrails)**, and provides **Account Factory** for provisioning new accounts with the baseline already applied. Controls come as mandatory, strongly recommended, and elective, implemented via SCPs (preventive) and Config rules (detective), and Control Tower can deploy optional and custom controls. The exam pairs "stand up a governed multi-account environment with a secure baseline quickly" with Control Tower, and expects you to know it sits on top of Organizations and produces the log-archive/audit account structure used throughout the other domains.

### Service Control Policies (SCPs)

**Service Control Policies** are organization policies that set the **maximum permissions for principals (identities)** in the affected accounts — a guardrail that caps what users and roles can do, *including the root user*, and that no account administrator can exceed. SCPs don't grant; they limit. Classic uses: deny disabling CloudTrail/GuardDuty, deny actions outside approved Regions (data residency), deny leaving the organization, deny creating IAM users (force federation), restrict specific services. Because SCPs cap even root and can't be overridden locally, they're the strongest preventive control for "this must never happen in any account." The exam tests SCPs as identity-side guardrails and their interaction in policy evaluation (a deny in an SCP beats any allow).

### Resource Control Policies (RCPs)

**Resource Control Policies** are a newer organization policy type that set the **maximum permissions on resources** in the organization — the resource-side counterpart to SCPs. Where an SCP limits what *your identities* can do, an RCP limits what *any principal* (including external/anonymous principals and other accounts) can do to *your resources* across the organization. For example, an RCP can enforce that no S3 bucket or KMS key in the organization can be accessed by a principal outside your organization, or require encryption-in-transit on all resources org-wide — a guardrail you'd otherwise have to apply to every resource policy individually. The exam distinguishes them sharply: **SCPs cap identities; RCPs cap access to resources** — together they bound both sides. RCPs are powerful for centrally preventing data exposure (e.g., enforcing `aws:PrincipalOrgID` on resources across the org).

### Declarative Policies and AI Opt-Out

**Declarative policies** are organization management policies that centrally **declare and enforce a desired configuration** for an AWS service across the organization — and keep it enforced even as the service adds features. Examples the exam names: enforce **IMDSv2** on all EC2, **block public access** for EBS snapshots, AMIs, and VPC resources, and control EC2 serial-console access. Unlike SCPs (which deny API actions), declarative policies set the *configuration baseline* and AWS enforces it natively. **AI services opt-out policies** are another management policy that opts the organization out of AWS using your content (processed by AI services) for service improvement — relevant for data-governance and privacy requirements. The exam expects you to match "enforce a service configuration org-wide (e.g., IMDSv2, block EBS public access)" to declarative policies, distinct from SCP action-denies.

### Delegated Administration and Centralized Security

Managing security services from the management account is discouraged (the management account should be minimally used); instead, AWS supports **delegated administrators** — designating a member account (typically the security/audit account) as the administrator for a service (GuardDuty, Security Hub, Macie, IAM Access Analyzer, Config, Firewall Manager, etc.) so a central security team operates that service across the whole organization from one place. This is how org-wide detection, analysis, and policy enforcement (from the earlier domains) are actually run. The exam expects delegated administration as the pattern for centrally managing security services, keeping the management account out of day-to-day operations.

### Centralized Root Access Management

Every member account has a **root user** with unrestricted access — a major risk multiplied across many accounts. **Centralized root access management** lets you manage root across all member accounts from a central point: **remove root credentials** from member accounts (so there's no standing root password/keys to compromise), **prevent root usage**, and provide **recovery at scale** when root is genuinely needed. Combined with **break-glass** procedures (a controlled, audited path to obtain emergency root access) and MFA, this neutralizes one of the largest multi-account attack surfaces. The exam pairs "manage/lock down root across the organization, prevent root use, enable recovery at scale" with centralized root access management plus break-glass design.

## Configuration Reference

Governance building blocks:

```text
AWS Organizations   accounts + OUs; consolidated billing; org policies; delegated admin
AWS Control Tower   automated landing zone (mgmt + log archive + audit accounts), guardrails, Account Factory
Delegated admin     security/audit account runs GuardDuty/Security Hub/Macie/Config/Firewall Mgr org-wide
```

Organization policy types — scope and effect:

```text
SCP                  caps permissions of IDENTITIES (incl. root) per account — preventive deny guardrail
RCP                  caps access to RESOURCES org-wide (incl. external principals) — resource-side guardrail
Declarative policy   enforces desired SERVICE CONFIGURATION (IMDSv2, block EBS/AMI/VPC public access)
AI opt-out policy    opt org out of AI-service content use for improvement
Tag policy           standardize tagging (supports ABAC/cost/governance)
```

Root and account controls:

```text
Centralized root access  remove root creds from member accounts; prevent root use; recover at scale
Break-glass             controlled, audited emergency access path; MFA required
Account/OU structure     isolate prod/dev/sensitive → blast-radius reduction
```

## How to Decide

- **Stand up a governed multi-account baseline fast?** → Control Tower (landing zone + guardrails + Account Factory).
- **Prevent identities from doing something in any account (incl. root)?** → SCP.
- **Prevent any principal (incl. external) from accessing your resources org-wide?** → RCP.
- **Enforce a service configuration org-wide (IMDSv2, block EBS public access)?** → declarative policy.
- **Run security services across all accounts centrally?** → delegated administrator (security account).
- **Lock down root across the org?** → centralized root access management + break-glass + MFA.

## How This Connects

This lesson is the foundation under every other domain: delegated administration is how org-wide Detection (Domain 1) and policy enforcement run; SCPs/RCPs are part of the IAM policy-evaluation model (Domain 4); the log-archive/audit accounts from Control Tower are where Detection's centralized logs live; and blast-radius minimization (Incident Response, Domain 2) is realized through the account/OU structure. The next lesson covers deploying resources consistently into this governed structure.

## Exam Traps

- **Confusing SCPs and RCPs.** SCPs cap what *identities* can do; RCPs cap access to *resources* (including by external principals). You often need both.
- **Using SCPs to enforce configuration.** To enforce IMDSv2 or block EBS public access org-wide, use **declarative policies**; SCPs deny API actions, not service settings.
- **Treating SCPs/RCPs as grants.** They only cap; actual permissions still require identity/resource policy grants.
- **Operating security from the management account.** Use delegated administrators; keep the management account minimally used.
- **Leaving member-account root unmanaged.** Centralized root access management removes standing root credentials and prevents root use across the org.
- **Manual account provisioning.** Control Tower Account Factory bakes the secure baseline into every new account.

## Summary

Multi-account governance sets organization-wide guardrails that every account inherits and no local admin can override. AWS Organizations provides the account/OU structure and org policies; AWS Control Tower automates a secure landing zone (management, log archive, and audit accounts), guardrails, and Account Factory. The policy types divide by scope: **SCPs** cap what identities (even root) can do; **RCPs** cap what any principal — including external ones — can do to your resources org-wide; **declarative policies** enforce a desired service configuration (IMDSv2, block public access for EBS/AMI/VPC); and AI opt-out and tag policies address content use and standardization. Security services are run centrally through **delegated administrators** in a security account, keeping the management account minimally used, and **centralized root access management** removes standing root credentials across member accounts, prevents root usage, and enables recovery at scale with break-glass procedures. Match each requirement to the right guardrail, remembering that SCPs and RCPs cap (never grant) and declarative policies configure.

## Examples

**Example 1 — Region lockdown.** Data residency requires that no account operate outside two Regions → an **SCP** denying actions outside the approved Regions, applied at the org root.

**Example 2 — Block external resource access.** No S3 bucket or KMS key anywhere in the org may be shared outside the organization → an **RCP** requiring `aws:PrincipalOrgID` on resource access org-wide.

**Example 3 — Enforce IMDSv2.** Every EC2 instance must use IMDSv2 and EBS snapshots must not be public → a **declarative policy** enforcing those configurations across the organization.

**Example 4 — Lock down root.** A 100-account org must prevent member-account root use and remove standing root credentials → **centralized root access management** with break-glass for emergencies.

## Think About It

A security team wants three guarantees across 80 accounts: no one (even root) can disable CloudTrail, no resource can be shared with an account outside the organization, and every EC2 instance must enforce IMDSv2. Name the organization policy type that delivers each guarantee, and explain why using the wrong one (for example, an SCP to enforce IMDSv2) would not achieve the intended effect.

## Quick Check

1. What is the difference between an SCP and an RCP?
2. Which organization policy type enforces a service configuration like IMDSv2 or blocking EBS snapshot public access?
3. Why should security services be run from a delegated administrator rather than the management account?
4. What does centralized root access management provide across member accounts?

*Answers: (1) an SCP caps the maximum permissions of identities (users/roles, including root) in affected accounts, while an RCP caps the maximum access any principal — including external principals — can have to your resources across the organization; they bound the identity side and the resource side respectively; (2) a declarative policy; (3) the management account should be minimally used to reduce its risk, so a delegated administrator (typically the security/audit account) centrally operates security services org-wide; (4) it lets you remove standing root credentials from member accounts, prevent root user usage, and provide root recovery at scale (paired with break-glass procedures and MFA).*

## What's Next

Next: **Secure and Consistent Resource Deployment** — infrastructure as code at scale, tagging, central policy enforcement, and secure resource sharing.
