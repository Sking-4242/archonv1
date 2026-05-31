---
title: "AWS Organizations and Multi-Account Strategy"
type: content
estimated_minutes: 8
cert_tags: ["aws_ccp", "aws_saa", "aws_soa", "aws_scs"]
---

# AWS Organizations and Multi-Account Strategy

## Overview

Most organizations beyond the startup stage run multiple AWS accounts. A multi-account strategy isolates workloads, limits blast radius, enforces billing boundaries, and simplifies compliance. AWS Organizations is the service that manages multiple accounts under a single umbrella with centralized governance.

Understanding Organizations is increasingly important across all AWS certifications as multi-account architectures have become the standard recommendation.

## Why Multiple Accounts?

A single AWS account creates shared-fate risk: a misconfiguration in one team's deployment can impact another team's resources. IAM permissions span the entire account, making it hard to isolate departments or workloads. A billing mistake in development runs up a tab that appears on the same invoice as production.

The AWS recommended multi-account structure separates accounts by environment (dev/test/staging/prod), by business unit, by workload type, or by regulatory requirement. Separate accounts mean: independent IAM namespaces (no permission leakage), isolated blast radius (an S3 bucket deleted in dev doesn't affect prod), separate billing (cost per team is visible), and simplified compliance (production accounts can have strict controls without blocking developer experimentation in dev accounts).

## AWS Organizations Structure

Organizations uses a hierarchical structure: **Organization** (the root container), **Root** (the top-level parent for all accounts), **Organizational Units (OUs)** (folders that group accounts, up to 5 levels deep), and **Accounts** (individual AWS accounts).

A common structure: Root → Prod OU → {app-prod, db-prod}, Root → Dev OU → {app-dev, sandbox}, Root → Shared Services OU → {logging-account, security-tooling-account}. Policies applied to an OU apply to all accounts within it — this is the mechanism for applying guardrails at scale.

## Service Control Policies (SCPs)

SCPs are the governance mechanism in Organizations. They restrict the maximum permissions available in accounts or OUs — even if an IAM policy in the account allows an action, an SCP can deny it. SCPs don't grant permissions; they constrain the permission space.

Common SCP use cases: prohibit disabling CloudTrail (security audit logging) in any account, restrict instance types to cost-effective families only, prohibit creation of resources in unapproved Regions, require specific tags on all resources, prevent leaving the organization.

SCPs apply to all IAM users and roles in an account, including the account's own root user (except for the management account). This makes them a powerful, non-bypassable governance control.

## Summary

AWS Organizations manages multiple accounts under a single root with centralized governance. OUs (Organizational Units) group accounts into a hierarchy. Service Control Policies (SCPs) are guardrails that restrict maximum permissions across accounts — they cannot be overridden by IAM. Multi-account strategy isolates workloads, limits blast radius, and enables per-team billing. Recommended structure separates prod, dev, and shared services accounts.

## Examples

A twelve-person startup runs everything in a single AWS account: the production web app, developer sandboxes, CI/CD pipelines, and data analytics workloads all share the same IAM namespace and the same billing ledger. A developer accidentally runs a load test against production instead of the dev environment, triggering $4,000 in unexpected data transfer costs with no way to attribute it to the dev team. When they eventually adopt a multi-account structure with separate dev and prod accounts, the billing isolation alone justifies the migration — each team's costs are visible, and a runaway dev script can never charge against the production budget.

A healthcare company subject to HIPAA needs to ensure that production systems storing patient data are completely isolated from developer experimentation. They create a three-level OU hierarchy: a Prod OU (containing accounts for each application's production environment), a Dev OU (containing sandbox accounts for engineers), and a Shared Services OU (containing a centralized logging account and a security tooling account). They attach an SCP to the Prod OU that denies CloudTrail:StopLogging, prevents creation of resources in non-approved Regions, and requires specific compliance tags on all new resources. Developers in the Dev OU face no such restrictions and can experiment freely. The SCP is the mechanism that makes this "strict prod, flexible dev" model enforceable — it's a guardrail that cannot be removed from inside the account it governs.

A global enterprise has 200 AWS accounts across six continents, managed by a central cloud platform team. They need to restrict all accounts to only cost-effective EC2 instance families (no p4d or trn1 GPU instances) to prevent unauthorized high-cost workloads. Rather than auditing every account's IAM policies individually, they attach a single SCP at the Root level: Deny ec2:RunInstances where ec2:InstanceType is not in the approved list. Every account in the organization immediately inherits this restriction — including the root user of each member account. This is Organizations at its most powerful: one policy controlling 200 accounts instantly, with zero account-level cooperation required.

## Think About It

1. SCPs restrict the maximum permissions available in an account, but they don't grant any permissions — they can only limit. An account with a permissive SCP still requires IAM policies for actual access. Given this, what would happen to a new AWS account added to an OU with a very restrictive SCP but no IAM policies of its own? Can the account's own root user override the SCP?
2. The multi-account structure separates environments (dev/test/staging/prod) and workloads. But this creates operational overhead: each account needs its own IAM setup, CloudTrail configuration, billing alerts, and security tooling. At what point does the security benefit of account isolation outweigh the operational cost of managing more accounts — and is there a right answer, or does it depend on organizational context?
3. Organizations allows centralized billing through consolidated billing, meaning the management account pays for all member accounts. What governance risks does this create, and what controls would you put in place to prevent a member account from running up costs that the management account owner can't see until the invoice arrives?
4. The lesson says SCPs apply to all IAM users and roles in a member account, including the account root user — but explicitly NOT the management account. Why do you think AWS made this exception for the management account, and what security implications does it create for the organization as a whole?
5. A company wants to allow each business unit to manage its own AWS accounts within the organization, but prevent any business unit from being able to leave the organization or disable AWS Config (the compliance monitoring service). How would you structure the OUs and SCPs to enforce this, and where in the hierarchy would you attach each SCP?

## Quick Check

**Q1.** A Service Control Policy (SCP) is attached to an OU that denies ec2:RunInstances. An IAM policy in an account within that OU explicitly allows ec2:RunInstances for a specific role. What is the effective permission for that role?
- A) ec2:RunInstances is allowed because the IAM policy explicitly permits it
- B) ec2:RunInstances is denied because the SCP guardrail overrides the IAM policy
- C) The conflict is resolved by whichever policy was created most recently
- D) The SCP applies only to new accounts added after the SCP was created

**Answer: B** — SCPs define the maximum permissions available in an account. An explicit Deny in an SCP cannot be overridden by any IAM policy within that account — the SCP acts as a non-bypassable guardrail.

**Q2.** What is the primary purpose of Organizational Units (OUs) in AWS Organizations?
- A) To create separate billing accounts for each department
- B) To group AWS accounts into a hierarchy so policies can be applied to many accounts at once
- C) To replicate IAM users across multiple AWS accounts automatically
- D) To replace IAM roles for cross-account access

**Answer: B** — OUs group AWS accounts into a manageable hierarchy. SCPs and other policies attached to an OU apply to all accounts within it, enabling governance at scale without touching each account individually.

**Q3.** Which of the following is something that SCPs can do?
- A) Grant permissions to IAM users in member accounts
- B) Override IAM explicit Deny statements within an account
- C) Restrict the maximum permissions available to all principals in an account, including the account root user
- D) Apply only to IAM roles, not IAM users

**Answer: C** — SCPs restrict maximum permissions for all IAM principals in a member account, including the root user of that account. They cannot grant permissions — they can only constrain the permission space within which IAM policies operate.

## What's Next

Module 4's theory is complete. The lab will have you create an IAM user and group, write a least-privilege policy, and design the IAM structure on the Archon canvas.
