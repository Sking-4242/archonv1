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

## What's Next

Module 4's theory is complete. The lab will have you create an IAM user and group, write a least-privilege policy, and design the IAM structure on the Archon canvas.
