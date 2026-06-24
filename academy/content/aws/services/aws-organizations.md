---
title: "AWS Organizations"
type: content
estimated_minutes: 18
cert_tags: ["CLF-C02", "SAA-C03", "SOA-C03", "SCS-C03"]
---

# AWS Organizations

## Overview

AWS Organizations lets you centrally manage and govern multiple AWS accounts as a single organization — consolidating billing, applying governance guardrails, and enabling organization-wide services. As companies grow beyond one account into dozens or hundreds, Organizations is what keeps them governable, secure, and cost-efficient. This *service reference* lesson covers the organization structure, service control policies and other policy types, consolidated billing, delegated administration, and what each certification expects.

Organizations matters because **multi-account is the recommended AWS strategy**: separate accounts isolate workloads, environments, teams, and blast radius far better than separating by tags or VPCs within one account. But many accounts need central control — consistent guardrails, aggregated billing, and one place to enable security services. Organizations provides that control plane. The core mental model is a tree: a **management account** at the root, **organizational units (OUs)** grouping accounts, and **member accounts**, with **policies** (especially SCPs) applied at the root/OU/account level to set guardrails that flow downward.

---

## How It Works

- **Management account** — the account that creates the organization, pays the consolidated bill, and manages it. It is highly privileged and should hold **no workloads** and be tightly protected.
- **Organizational units (OUs)** — containers that group accounts (e.g., by environment or business unit) so policies apply to many accounts at once; OUs can **nest**, and policies inherit down the tree.
- **Member accounts** — the workload and shared-service accounts in the organization.
- **Service control policies (SCPs)** — organization policies that set the **maximum** permissions for accounts/OUs. An SCP **does not grant** access; it **bounds** what IAM in those accounts can allow. Even an account administrator (and the account's own root user) cannot exceed an SCP. SCPs do not apply to the management account.

Other policy types include **resource control policies (RCPs)** (bounding resource-based access org-wide), **declarative policies**, **tag policies**, and **backup policies**. **Delegated administration** lets a member account (typically a dedicated security account) administer an org-wide service so you don't operate from the management account.

---

## Key Features

- **Consolidated billing** — one bill for all accounts, with **volume pricing tiers** reached sooner by aggregating usage and **Reserved Instance/Savings Plans sharing** across accounts.
- **SCPs and RCPs** — central guardrails on identities and on resources (e.g., deny disabling CloudTrail, deny leaving the org, restrict Regions, require encryption).
- **Delegated administrator** — run org-wide services (**GuardDuty, Security Hub, Config, Macie, IAM Access Analyzer, CloudFormation StackSets, Firewall Manager**) from a dedicated account.
- **Account management** — programmatic account creation and, with **AWS Control Tower**, a prescriptive, automated **landing zone** with built-in guardrails and a baseline of security accounts (log archive, audit).
- **Trusted access** — let org-aware AWS services operate across all accounts.

---

## Configuration Reference

- **Design an OU structure** — commonly a Security/Log-Archive/Audit OU plus environment or business-unit OUs — and place accounts accordingly.
- **Apply SCPs at the OU level** for guardrails; start from `FullAWSAccess` and add **deny** guardrails (the safest pattern) rather than rebuilding allow lists.
- **Delegate administration** of security services to a security account; keep the management account workload-free and locked down.
- **Use Control Tower** for an automated, governed landing zone.

---

## Operations and Troubleshooting

- **Action denied despite an IAM allow.** An **SCP** (or RCP) higher in the tree is likely denying it — SCPs bound IAM, so check the account's and OUs' SCPs. (Remember SCPs don't restrict the management account, which can mask testing.)
- **New account not governed.** Verify it's in the correct OU (so it inherits the right SCPs) and that org-wide services **auto-enable** for new accounts.
- **Management account over-exposed.** Move workloads out of it; SCPs don't protect it, so it must be guarded by strong IAM/MFA and minimal use.
- **Billing questions.** Consolidated billing aggregates usage; RI/SP sharing and volume tiers change per-account effective costs.

---

## Integrations

Organizations is the backbone of multi-account security and governance. It enables **delegated administration** and org-wide enablement of **GuardDuty**, **Security Hub**, **Config** (aggregators/conformance packs), **Macie**, **IAM Access Analyzer**, **CloudTrail** (organization trails), **Firewall Manager**, and **CloudFormation StackSets**; bounds permissions via **SCPs/RCPs** alongside **IAM**; integrates with **Control Tower** for landing zones and **AWS Backup** for org-wide backup policies; and supports **RAM** for cross-account resource sharing. Nearly every "do this across all accounts" pattern relies on Organizations.

---

## Pricing and Cost Considerations

AWS Organizations itself is **free**. Its billing impact is generally **positive**: consolidated billing aggregates usage across accounts to reach **volume discount tiers** sooner and **shares Reserved Instances and Savings Plans** across accounts, often lowering total cost. The considerations are governance, not fees — keeping the management account minimal, structuring OUs well, and using SCPs to prevent costly or risky actions (e.g., launching in unapproved Regions or expensive instance types). Control Tower and the downstream security services have their own (often free or usage-based) costs.

---

## Exam Relevance

**CLF-C02:** Know Organizations for **consolidated billing** (volume discounts, RI/SP sharing) and central management of multiple accounts, plus SCPs as guardrails. Foundational.

**SAA-C03:** Know multi-account design, OUs, SCPs, consolidated billing, RAM, and org-wide service enablement. Design depth.

**SOA-C03:** Operate multi-account — StackSets, Config aggregators/conformance packs, and centralized operations. Operations depth.

**SCS-C03:** Deepest. **SCPs/RCPs as guardrails and how they bound IAM evaluation** (explicit deny / maximum permissions), delegated administration of security services, organization CloudTrail, centralized root management, and Control Tower landing zones. Security/governance depth (Domain 6).

---

## Summary

AWS Organizations centrally governs many AWS accounts as a tree of a management account, OUs, and member accounts, applying service control policies (and RCPs, declarative, tag, and backup policies) as guardrails that bound what IAM in each account can allow — SCPs grant nothing and don't apply to the management account. It provides consolidated billing with volume discounts and RI/SP sharing, delegated administration for org-wide security services, and integrates with Control Tower for governed landing zones and RAM for resource sharing. It is free and is the foundation of secure, scalable, cost-efficient multi-account AWS. The recurring exam points are SCPs as a permission ceiling (not a grant), consolidated-billing benefits, and delegating security services away from the management account.

---

## Quick Check

1. What does a service control policy do, why can't an account administrator exceed it, and which account does it not apply to?
2. What are organizational units (OUs) for, and how do policies flow through them?
3. Name two billing benefits of consolidated billing.
4. Why delegate administration of security services to a dedicated account instead of the management account?
5. An IAM policy allows an action but it's still denied org-wide — what should you check?

---

## What's Next

Pair this with **AWS IAM** (SCPs bound IAM evaluation), **AWS Config**, **Amazon GuardDuty**, and **AWS Security Hub** (org-wide enablement), and the SCS-C03 multi-account governance lesson.
