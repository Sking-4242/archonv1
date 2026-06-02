---
title: "AWS Organizations and Multi-Account Strategy"
type: content
estimated_minutes: 18
cert_tags: ["aws_ccp", "aws_saa", "aws_scs"]
---

# AWS Organizations and Multi-Account Strategy

## Overview

Most organizations beyond the startup stage run multiple AWS accounts — not because managing multiple accounts is inherently convenient, but because the alternative creates risks that are genuinely unacceptable at scale. A single AWS account is a shared-fate container: every IAM user and role in the account shares the same permission namespace, every service limit is shared, every billing line item rolls up to the same invoice, and a misconfiguration in one team's deployment can directly impact another team's production workload. When your development environment, production database, compliance-audited healthcare application, and developer sandboxes all coexist in one account, you are one IAM permission misconfiguration or one runaway script away from a cross-environment disaster. AWS Organizations is the service that makes multi-account architecture manageable — providing the structure, governance, and consolidated billing that allow you to reap isolation benefits without managing each account as a completely independent entity.

AWS Organizations structures accounts in a hierarchy: a root sits at the top, Organizational Units (OUs) are folders that group accounts, and individual AWS accounts sit at the leaves. This tree structure mirrors how real organizations work — you might have a Security OU containing a centralized logging account and a security tooling account, a Production OU containing separate accounts for each application's production environment, and a Development OU where engineers can experiment freely without their work affecting production. The critical capability is that policies attached to an OU apply to every account inside it — including all nested OUs. Attach one Service Control Policy (SCP) to your Production OU and every production account immediately operates within those guardrails, with zero account-level cooperation required.

Service Control Policies are the governance mechanism that makes Organizations more than a billing aggregator. An SCP defines the maximum permissions available to any IAM principal in the accounts it applies to — regardless of what IAM policies in those accounts say. If an SCP denies `ec2:RunInstances` for GPU instance types, no IAM policy in any governed account can override that restriction. The account's own root user, IAM administrators, developers, and service roles all operate within the SCP guardrail. This non-bypassable quality is what makes SCPs valuable: they are organizational governance controls, not just advisory guidance. The one notable exception is the management account itself — SCPs do not apply to the management account, which is a deliberate design choice with significant security implications you must understand.

## Core Concepts

### The Organization Hierarchy: Root, OUs, Accounts

An AWS Organization has exactly one **management account** — the account used to create the organization and the only account that can manage organization-wide settings. Think of it as the administrative root of your governance tree. Below the management account sits the **Root** — the top-level container for all accounts and OUs. Every SCP, tag policy, and backup policy you attach to Root applies to every account in the entire organization.

**Organizational Units (OUs)** are the grouping mechanism. An OU can contain accounts and other OUs, up to five levels deep. The practical value of OUs is policy inheritance: attach a policy to an OU and all accounts within that OU (and all nested OUs and their accounts) automatically inherit it. You do not need to touch each account individually. A common structure for a mid-size company:

```
Root
├── Security OU
│   ├── logging-account
│   └── security-tooling-account
├── Production OU
│   ├── webapp-prod
│   ├── api-prod
│   └── data-prod
├── Development OU
│   ├── webapp-dev
│   └── sandbox
└── Shared Services OU
    ├── network-account
    └── cicd-account
```

**Member accounts** are regular AWS accounts that have been invited to or created within the organization. They retain their own IAM namespaces, their own resources, and their own billing — but their billing is consolidated to the management account, and they are subject to organization-level policies.

### Service Control Policies (SCPs): Restricting, Not Granting

SCPs are the most important Organizations feature from an IAM and security perspective. Their core behavior can be stated precisely: **SCPs restrict the maximum permissions available in a member account but cannot grant any permissions.** An SCP is a ceiling, not a floor.

What this means operationally:
- If an SCP allows `s3:*` and an IAM policy in the account allows `ec2:*`, the effective maximum is only `s3:*` — the IAM policy's EC2 permissions exceed what the SCP permits, so they are suppressed.
- If an SCP allows `s3:*` but no IAM policy grants any S3 permissions, the effective permissions are zero — the SCP's allowance doesn't grant anything by itself.
- If an SCP denies `cloudtrail:StopLogging` and an IAM policy allows it, the SCP Deny wins unconditionally.

SCPs apply to all IAM principals in member accounts: IAM users, IAM roles, and the account root user of member accounts. They do NOT apply to the management account. This means the management account should itself be lightly used — no application workloads, no developer access — because it operates outside SCP guardrails.

SCPs can be written as **Allow-lists** (explicitly list what is permitted; everything else is denied) or **Deny-lists** (explicitly deny specific actions; everything else is determined by IAM policies). AWS enables a default `FullAWSAccess` SCP on all accounts, which is an Allow-list permitting everything — this means SCPs start permissive and you layer restrictions on top.

### Consolidated Billing: One Invoice, Volume Discounts Pooled

AWS Organizations enables **consolidated billing**: all member account charges flow to the management account, which receives one invoice covering the entire organization. Individual account costs are visible as line items, but the management account is financially responsible for all charges.

The financial benefits:
- **Volume discounts** (tiered pricing) — S3, EC2 Reserved Instance coverage, and other services with volume pricing treat the entire organization's usage as a single aggregate for discount calculation. 100 accounts each using 1 TB of S3 data receive the same volume pricing tier as a single account using 100 TB. This pooling effect can produce significant savings at scale.
- **Reserved Instance and Savings Plan sharing** — Reserved Instances and Compute Savings Plans purchased in any account can be applied to matching usage across all accounts in the organization, maximizing utilization of committed spend.
- **Single payment method** — one credit card, one AWS bill, one set of payment contacts.
- **Cost visibility** — AWS Cost Explorer shows cost breakdowns by account, OU, service, tag, and region across the entire organization from the management account.

Consolidated billing does not mean consolidated security or consolidated access. Each account retains completely independent IAM namespaces, security configurations, and resource isolation.

### Tag Policies and Backup Policies

**Tag Policies** enforce consistent tagging standards across all accounts in the organization. They define which tag keys are valid, what values are acceptable for each key, and which resource types must carry specific tags. When a tag policy is attached to an OU, any resource created in accounts within that OU that violates the tag policy is flagged in a compliance report. Tag policies are preventive (they can block non-compliant creates) or detective (report violations without blocking). Consistent tagging is the foundation of cost attribution, compliance reporting, and automated governance.

**Backup Policies** define backup plans using the same JSON format as AWS Backup and can be attached at the OU or organization level, automatically rolling out backup configurations to all accounts within scope. A single backup policy can enforce daily snapshots with 30-day retention across every EC2 and RDS instance in all production accounts, applied from a single policy attachment at the Production OU, with no action required in each individual account.

### Multi-Account Strategy: Why Account-Level Isolation Matters

IAM policies provide fine-grained access control within an account, but they have a fundamental limitation: a sufficiently privileged IAM principal in an account can potentially access any resource in that account. A developer with `AdministratorAccess` in a single-account setup has technical access to every S3 bucket, every RDS database, every KMS key, and every Lambda function — regardless of whether that access makes business sense.

Account-level isolation creates a hard boundary that IAM cannot breach. A developer in the `webapp-dev` account literally cannot access resources in the `data-prod` account — there are no IAM permissions to configure incorrectly, no path to escalate, no misconfiguration risk. Cross-account access is an explicit architectural decision that must be deliberately designed (using cross-account IAM roles, S3 bucket policies with cross-account principals, etc.) rather than something that can happen accidentally.

Common account structures:
- **Per-environment:** dev, staging, prod each in separate accounts — the most common pattern
- **Per-team or business unit:** team A and team B each get their own accounts, with shared services in dedicated accounts
- **Per-compliance domain:** PCI-scoped workloads in one account, HIPAA workloads in another, general workloads in a third
- **Per-application:** large organizations with many independent applications may have an account per application per environment

## Configuration Reference

### SCP JSON: Deny All Actions Outside Approved Regions

This SCP restricts all workloads in governed accounts to only `us-east-1` and `us-west-2`. It is a common enterprise control to prevent unauthorized resource creation in unexpected regions and to reduce the attack surface from dormant regions.

The critical detail is the `NotAction` list — global services that do not operate in a specific region must be excluded, because their API calls go to a global endpoint rather than a regional one. If you do not exclude them, your SCP will block IAM, STS, S3, CloudFront, Route 53, and AWS Support — breaking authentication, global routing, and account management entirely.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      // This SCP Deny is the regional restriction.
      // Effect: Deny — this is an explicit Deny, which beats any IAM Allow.
      // It cannot be overridden by any IAM policy in any governed account.
      "Sid": "DenyActionsOutsideApprovedRegions",
      "Effect": "Deny",

      // NotAction: everything EXCEPT the services listed here.
      // We use NotAction (not Action: *) because global services like IAM, STS,
      // S3, CloudFront, and Route 53 do not operate in specific regions.
      // Their API calls have no aws:RequestedRegion context.
      // If we used "Action": "*" and checked the region condition,
      // IAM calls (which have no region) would match the Deny and break auth.
      // With NotAction, these global services are completely excluded from this Deny statement.
      "NotAction": [
        "iam:*",           // IAM is global — user/role/policy management has no region
        "sts:*",           // STS is global — AssumeRole, GetSessionToken are region-agnostic
        "s3:*",            // S3 bucket namespace is global (even though data is regional)
        "cloudfront:*",    // CloudFront is a global edge network service
        "route53:*",       // Route 53 DNS is global
        "route53domains:*",// Route 53 Domains is global
        "support:*",       // AWS Support API is global
        "budgets:*",       // AWS Budgets is a global billing service
        "organizations:*", // Organizations management operations are global
        "account:*",       // Account settings API is global
        "waf:*",           // WAF Classic is global (WAF v2 is regional — add wafv2: if needed)
        "artifact:*",      // AWS Artifact compliance reports are global
        "trustedadvisor:*" // Trusted Advisor is a global service
        // Add any other global services your accounts use.
        // Review: https://docs.aws.amazon.com/general/latest/gr/aws-service-information.html
      ],

      "Resource": "*",  // Apply to all resources — the region check is in the Condition

      "Condition": {
        // StringNotEquals: the Deny fires when the requested region is NOT in the listed values.
        // Any API call to a region other than us-east-1 or us-west-2 is denied.
        // The null check handles the case where aws:RequestedRegion is absent
        // (e.g., for requests that don't target a specific region) — we block those too.
        "StringNotEquals": {
          "aws:RequestedRegion": [
            "us-east-1",  // US East (N. Virginia)
            "us-west-2"   // US West (Oregon)
            // Add approved regions here as your organization expands.
            // Common additions: eu-west-1 (Ireland), ap-southeast-1 (Singapore)
          ]
        }
      }
    }
  ]
}
```

### SCP JSON: Deny Disabling CloudTrail and Config

This SCP prevents anyone in governed accounts from disabling audit logging — a common attacker tactic to cover tracks after initial access. Even an IAM administrator in the account cannot override this.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      // Protect audit logging from being disabled.
      // CloudTrail captures all API activity — attackers disable it to hide their tracks.
      // AWS Config records configuration changes — required for compliance.
      // This SCP prevents disabling either, even for account administrators.
      "Sid": "DenyDisablingAuditLogging",
      "Effect": "Deny",
      "Action": [
        "cloudtrail:StopLogging",         // Pause event recording on a trail
        "cloudtrail:DeleteTrail",          // Permanently remove a trail
        "cloudtrail:UpdateTrail",          // Could change trail to exclude management events
        "config:StopConfigurationRecorder",// Stop AWS Config from recording changes
        "config:DeleteConfigurationRecorder",
        "config:DeleteDeliveryChannel",    // Remove the channel Config writes to (S3/SNS)
        "config:PutConfigurationRecorder", // Could replace recorder with reduced scope
        "guardduty:DeleteDetector",        // Delete GuardDuty threat detection
        "guardduty:DisassociateFromMasterAccount",  // Disconnect from centralized GuardDuty
        "securityhub:DisableSecurityHub"   // Disable Security Hub findings aggregation
      ],
      "Resource": "*"
      // No Condition — this Deny is unconditional.
      // No circumstance justifies disabling audit logging without management account involvement.
    }
  ]
}
```

### Console Walkthrough: AWS Organizations

**Access Organizations:**
1. Sign in to the management account → search "Organizations" in the top Services search bar → select **AWS Organizations**
2. The main console shows your **Organization tree**: Root at the top, OUs as folders, Accounts as leaf nodes
3. Click any OU to see accounts within it; click an account to see its details, tags, and policies applied to it

**Attach an SCP to an OU:**
1. In the Organizations console → left pane → **Policies** → **Service control policies**
2. Click **Create policy** → enter a name, description, and paste your SCP JSON → **Create policy**
3. Return to the organization tree → click the OU you want to govern → **Policies** tab → **Attach** → select your new SCP → **Attach policy**
4. The SCP now applies to all accounts in that OU and all nested OUs — no action required in individual accounts

**View consolidated billing:**
1. From the management account → search "Billing" → **Billing and Cost Management**
2. Left pane → **Bills** — the invoice shows charges broken down by account name
3. Left pane → **Cost Explorer** → group by **Account** to see spending per member account
4. Savings from Reserved Instance sharing and volume discounts appear automatically in the consolidated invoice

**View SCPs applied to a specific account:**
1. Organizations console → find the account in the tree → click the account
2. **Policies** tab → **Service control policies** — shows all SCPs applied directly and inherited from parent OUs
3. Click any SCP to see its JSON and which accounts it affects

### CLI Commands

**List all accounts in the organization:**
```bash
aws organizations list-accounts \
  --output table
# Returns: account ID, name, email, status, ARN for every member account
# Requires: called from the management account or a delegated admin account
```

**List policies attached to a specific OU or account:**
```bash
# List SCPs on an OU (replace ou-xxxx-xxxxxxxx with your OU ID)
aws organizations list-policies-for-target \
  --target-id ou-xxxx-xxxxxxxx \
  --filter SERVICE_CONTROL_POLICY

# List SCPs directly attached to an account
aws organizations list-policies-for-target \
  --target-id 123456789012 \
  --filter SERVICE_CONTROL_POLICY

# Filters available: SERVICE_CONTROL_POLICY, TAG_POLICY, BACKUP_POLICY, AISERVICES_OPT_OUT_POLICY
```

**List all SCPs in the organization:**
```bash
aws organizations list-policies \
  --filter SERVICE_CONTROL_POLICY
# Returns: policy ID, name, description, ARN for every SCP in the organization
```

**Create an SCP from a file:**
```bash
aws organizations create-policy \
  --name "DenyNonApprovedRegions" \
  --description "Restricts resources to us-east-1 and us-west-2" \
  --type SERVICE_CONTROL_POLICY \
  --content file://region-restriction-scp.json
# Returns: policy ID and metadata — use the ID to attach the policy to OUs
```

**Attach an SCP to an OU:**
```bash
aws organizations attach-policy \
  --policy-id p-xxxxxxxxxxxx \
  --target-id ou-xxxx-xxxxxxxx
# No output on success — call list-policies-for-target to confirm attachment
```

**List OUs under the root:**
```bash
# First get the root ID
ROOT_ID=$(aws organizations list-roots --query 'Roots[0].Id' --output text)

# Then list OUs directly under root
aws organizations list-organizational-units-for-parent \
  --parent-id $ROOT_ID
```

## How to Decide

| Situation | Approach |
|---|---|
| Startup with one account, no isolation | Begin with Organizations now — creating the structure costs nothing; migrating later is harder than starting correctly |
| Dev/prod isolation required | Separate accounts per environment within an Organization — account-level isolation is stronger than any IAM policy |
| Enforce same guardrails across many accounts | SCP attached at OU level — one attachment, applies to all accounts in OU automatically |
| Block a specific high-risk action organization-wide | SCP Deny at Root level — applies to every account in the org, no exceptions in member accounts |
| Allow global services (IAM, STS, S3) in a region-restriction SCP | Use `NotAction` to exclude global services — they have no `aws:RequestedRegion` context |
| Prevent management account from being governed by SCPs | AWS design: SCPs never apply to management account — use it only for org management, no workloads |
| Tag enforcement across all accounts | Tag Policy attached to OU — defines valid tag keys/values and reports or blocks violations |
| Central view of all accounts' costs | Consolidated billing in management account → Cost Explorer → group by Account |
| Prevent audit log tampering in all accounts | SCP Deny on `cloudtrail:StopLogging`, `cloudtrail:DeleteTrail`, `config:StopConfigurationRecorder` at Root |
| Give a team their own AWS account without full org access | Create member account in appropriate OU — team manages their own account, governed by inherited SCPs |

## How This Connects

- **AWS IAM** — SCPs set the maximum permission ceiling for all IAM principals in member accounts. IAM policies within accounts determine actual permissions below that ceiling. The two layers work together: SCPs express organizational policy ("no one in any account may disable CloudTrail"), IAM policies express account-level access decisions. SCPs cannot grant permissions; they can only constrain the space within which IAM operates.
- **AWS IAM Access Analyzer** — when created as an organization-level analyzer (requires Organizations trusted access enabled), a single Access Analyzer instance can monitor external access findings across all member accounts simultaneously from the management account. This makes organization-level Access Analyzer a force multiplier: one setup, org-wide coverage for identifying S3 buckets or IAM roles with unexpected external access.
- **AWS CloudTrail** — Organizations enables an **organization trail** — a single CloudTrail trail that captures API events from all member accounts into a centralized S3 bucket in the logging account. Member accounts cannot delete or modify the organization trail (it appears as read-only). This provides tamper-resistant centralized logging that no individual account owner can disable, complementing the SCP that blocks `cloudtrail:StopLogging`.
- **AWS Security Hub** — Organizations integration allows Security Hub to be deployed centrally: enabled in a delegated administrator account, it automatically aggregates findings from all member accounts. CIS AWS Foundations Benchmark checks, SCP compliance signals, and cross-account GuardDuty findings all flow into a single Security Hub view. Without Organizations, you would need to manually enable Security Hub in each account independently and stitch together the results.
- **AWS Control Tower** — built on top of Organizations, Control Tower provides a pre-built landing zone: an OU structure, a logging account, an audit account, mandatory SCPs (called Guardrails), and automated account vending for new accounts. Control Tower is the recommended starting point for new organizations that want AWS's opinionated best-practice structure, rather than building the OU hierarchy and SCPs manually. Understanding Organizations is prerequisite to understanding Control Tower.

## Exam Traps

1. **SCPs cannot grant permissions — they can only restrict.** A common misconception is that an SCP with `"Effect": "Allow", "Action": "*"` grants permissions. It does not. The `FullAWSAccess` SCP that AWS attaches by default to all accounts is not granting permission — it is permitting the full range of actions so that IAM policies can work. If you remove `FullAWSAccess` and attach nothing else, all IAM policy permissions in that account become ineffective. SCPs define the ceiling; IAM policies fill in the actual grants below that ceiling.

2. **SCPs do not apply to the management account — this is explicit and tested.** The management account operates outside SCP governance. An SCP attached to Root applies to every member account but does not govern the management account's principals. This is a deliberate AWS design decision: the management account is the trust anchor for the organization, and AWS chose not to create a situation where a misconfigured SCP could lock out the entire organization. The security implication is that the management account should have no workloads, minimal IAM users, and be treated as the most sensitive account in the organization.

3. **Region restriction SCPs must use `NotAction` to exclude global services.** If you write an SCP that denies all actions where `aws:RequestedRegion` is not in your approved list using `"Action": "*"`, you will block IAM, STS, S3, CloudFront, and Route 53 — because those services' API calls do not include an `aws:RequestedRegion` context key. They will match the region condition (since there is no region to match) and be denied. The correct pattern is `"NotAction": ["iam:*", "sts:*", "s3:*", "cloudfront:*", "route53:*", ...]` to exclude global services from the regional restriction.

4. **An explicit Deny in an SCP overrides any IAM Allow in the account — regardless of whether it is attached to Root, the OU, or the specific account.** If an SCP anywhere in the hierarchy path from Root to the account contains an explicit Deny for an action, that action is denied for all principals in that account. The evaluation logic: SCP must Allow the action (or no SCP explicitly denies it) AND an IAM policy must Allow it. Both conditions must be true. An SCP Deny is final.

5. **Consolidated billing does not mean shared IAM or shared resources.** Multiple accounts under one organization share one invoice and one payment method, but each account's IAM users, roles, S3 buckets, EC2 instances, and all other resources are completely isolated. An IAM admin in account A cannot access account B's resources through consolidated billing membership. Cross-account access requires explicit IAM trust relationships, bucket policies, or resource-based policies — it is never automatic.

## Summary

- AWS Organizations structures multiple AWS accounts in a hierarchy (Root → OUs → Accounts), enabling centralized governance where policies attached to OUs automatically apply to all accounts within them — one policy change instantly governs hundreds of accounts.
- Service Control Policies (SCPs) define the maximum permission ceiling for all IAM principals in member accounts; they can only restrict, never grant, and their Deny statements cannot be overridden by any IAM policy within governed accounts.
- SCPs do not apply to the management account — the trust anchor account must be treated as the most sensitive account in the organization, with minimal access and no application workloads, because it operates outside all SCP guardrails.
- Consolidated billing rolls all member account charges to the management account's invoice, pooling volume-discount tiers and Reserved Instance coverage across all accounts — a significant cost benefit at scale that requires no resource sharing.
- Region restriction SCPs require a `NotAction` exclusion list for global services (IAM, STS, S3, CloudFront, Route 53, Support) — these services have no `aws:RequestedRegion` context and would be incorrectly blocked without the exclusion.
- Multi-account architecture provides account-level isolation that is architecturally stronger than IAM policies alone: a developer in the dev account literally cannot reach production resources, not because IAM denies it, but because there is no path across account boundaries without an explicit cross-account design.

## Examples

**Beginner:** A twelve-person startup runs everything in a single AWS account: the production web app, developer sandboxes, CI/CD pipelines, and data analytics workloads all share the same IAM namespace and the same billing ledger. A developer accidentally runs a load test against production instead of the dev environment, triggering $4,000 in unexpected data transfer costs — appearing on the same bill as production expenses with no way to isolate who or what caused it. When the team eventually adopts a multi-account structure with separate dev and prod accounts under Organizations, the billing isolation alone justifies the migration: each team's costs are visible in Cost Explorer broken down by account, and a runaway dev script can never charge against the production budget. The migration also eliminates the scenario where a developer's IAM role in dev could theoretically be misconfigured to reach production data — the accounts are isolated at the infrastructure level.

**Intermediate:** A healthcare company subject to HIPAA creates a three-level OU hierarchy: a Production OU (containing accounts for each application's production environment), a Development OU (developer sandboxes), and a Shared Services OU (a centralized logging account and a security tooling account). They attach three SCPs to the Production OU: one denying `cloudtrail:StopLogging` and `cloudtrail:DeleteTrail` to prevent audit log tampering, one requiring all resources to be tagged with a `DataClassification` tag, and one restricting resource creation to `us-east-1` only. Developers in the Dev OU face none of these restrictions and can experiment freely. The SCPs apply to every principal in every production account — including IAM administrators — and cannot be removed from inside those accounts. When an auditor asks how the company ensures CloudTrail logging is always active in production, the answer is a two-sentence explanation of the SCP.

**Advanced:** A global enterprise managing 200 AWS accounts across six business units needs to enforce cost governance, regional compliance, and security baseline controls simultaneously. Rather than auditing 200 accounts individually, the cloud platform team designs an OU hierarchy with five top-level OUs (Production, Development, Sandbox, Shared Services, Decommissioned). They attach SCPs at four levels: at Root (deny disabling CloudTrail, GuardDuty, and Security Hub globally), at Production OU (deny non-approved regions, require compliance tags, deny large GPU instance types), at Sandbox OU (budget-based spending limits, deny Reserved Instance purchases), and at specific accounts for unique compliance requirements. When a new account is created for a new team, it is placed in the correct OU and immediately inherits all applicable SCPs — the account is compliant on day one without any account-level configuration work. The organization trail captures API activity from all 200 accounts into a single centralized logging account, protected from deletion by the Root-level SCP. One platform engineer manages governance for 200 accounts through five SCP policies and a clean OU structure.

## Think About It

1. SCPs restrict maximum permissions in member accounts but do not apply to the management account. Given this, what organizational and technical controls should you put in place to protect the management account itself — and what is the consequence if the management account credentials are compromised in an organization with 200 member accounts?
2. A new account added to a Production OU immediately inherits all SCPs attached to that OU. What is the risk of this automatic inheritance, and what process would you design to vet new accounts before they go into the Production OU to prevent either misconfiguration or security violations?
3. SCPs cannot grant permissions — they only constrain. But `FullAWSAccess` (AWS's default) is an Allow-list SCP that appears to "permit everything." If `FullAWSAccess` is removed from an account and replaced with a tighter Allow-list SCP, what happens to IAM policies in that account that allow services not on the Allow-list?
4. Consolidated billing pools Reserved Instance and Savings Plan coverage across all accounts. This creates an incentive structure where one account's Reserved Instance purchase benefits other accounts. What governance challenges does this create — specifically, which account should "own" organizational Reserved Instance purchases, and how do you attribute their cost benefit fairly in a chargeback model?
5. Organizations enables a centralized organization trail in CloudTrail that member accounts cannot modify or delete. If you also have an SCP that denies `cloudtrail:DeleteTrail` and `cloudtrail:StopLogging`, you have two layers of protection for audit logging. What does each layer protect against, and is there a scenario where you need both — or is one of them redundant?

## Quick Check

**Q1.** An SCP attached to a Production OU explicitly denies `ec2:RunInstances` for GPU instance types. An IAM policy in an account within that OU explicitly allows `ec2:RunInstances` for all instance types. What is the effective permission for a developer role in that account trying to launch a GPU instance?

- A) The launch is allowed because the IAM policy explicitly grants it and is more specific than the SCP
- B) The launch is denied because the SCP Deny overrides the IAM Allow — SCPs define the maximum permissions ceiling
- C) The restriction applies only to IAM users, not to IAM roles
- D) The SCP applies only to the management account, not to member accounts

**Answer: B** — SCPs define the maximum permission ceiling for all IAM principals in member accounts. An explicit Deny in an SCP cannot be overridden by any IAM policy within the governed account. The SCP Deny is evaluated before the IAM Allow and wins unconditionally. This is the fundamental property that makes SCPs valuable as organizational governance controls.

**Q2.** A company attaches an SCP to the organization Root that denies all actions where `aws:RequestedRegion` is not `us-east-1`. Shortly after, engineers in the management account cannot assume IAM roles in member accounts. What is the most likely cause?

- A) The SCP accidentally also applied to the management account, blocking STS operations
- B) The SCP used `"Action": "*"` instead of `"NotAction"` with global services excluded — STS is a global service without `aws:RequestedRegion` context and is being incorrectly blocked in member accounts
- C) Region restriction SCPs require at least two approved regions to function correctly
- D) IAM and STS operations require a separate SCP Allow statement to override region restrictions

**Answer: B** — Region restriction SCPs must use `NotAction` to exclude global services. STS (`sts:AssumeRole`), IAM, S3, CloudFront, and Route 53 are global services whose API calls do not include `aws:RequestedRegion` context. An SCP using `"Action": "*"` with a region condition denies these global service calls because they have no region to match against the approved list. The correct pattern is `"NotAction": ["sts:*", "iam:*", "s3:*", ...]` to exclude them from the regional restriction.

**Q3.** Which of the following accurately describes the scope of Service Control Policies?

- A) SCPs apply to all IAM users and roles in member accounts, including those accounts' root users, but do not apply to the management account
- B) SCPs apply only to IAM roles — IAM users are not governed by SCPs
- C) SCPs apply to the management account and all member accounts equally
- D) SCPs can both grant permissions and restrict them, depending on whether the Effect is Allow or Deny

**Answer: A** — SCPs apply to all IAM principals (users, roles, and the account root user) in member accounts. They explicitly do not apply to the management account — a deliberate design decision to prevent the trust anchor account from being accidentally locked out by a misconfigured SCP. SCPs cannot grant permissions; an SCP Allow does not grant anything — it only permits IAM policies within the account to function up to that limit.

## What's Next

The next module covers storage services — beginning with S3 object storage, including bucket architecture, access control models, versioning, and the relationship between S3 security features and the IAM and Organizations controls you have built in this module.
