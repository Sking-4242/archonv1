---
title: "AWS Control Tower: Multi-Account Governance at Scale"
type: content
estimated_minutes: 14
cert_tags: ["SAA-C03", "SAP-C02", "SCS-C02"]
---

# AWS Control Tower: Multi-Account Governance at Scale

## Overview

AWS Control Tower is the managed service for setting up and governing a secure, compliant, multi-account AWS environment — called a **landing zone**. It automates the baseline setup that every serious AWS deployment needs: separate accounts for logging and auditing, organizational structure via AWS Organizations, baseline security guardrails, and centralized access management via IAM Identity Center. What would take weeks of manual CloudFormation and Organizations configuration, Control Tower handles in a guided setup wizard and maintains automatically as you add accounts.

The problem Control Tower solves is that AWS best practices for enterprise deployments require a multi-account architecture — one account per workload, environment, or business unit to achieve blast radius isolation, separate billing, and independent permission boundaries. But setting up 10 or 50 or 200 accounts consistently, with the right security configurations every time, is operationally difficult. Control Tower applies the same governance baseline to every account, prevents accounts from drifting out of compliance, and lets you add new accounts in minutes through its account factory.

For the SAA and SAP exams, Control Tower is tested as the correct starting point for any multi-account governance question. The exam expects you to know the landing zone structure (management account, log archive account, audit account), what guardrails are and how they are classified, and how Control Tower relates to AWS Organizations and IAM Identity Center. After this lesson, you will be able to describe the Control Tower landing zone architecture and explain when to use Control Tower versus managing Organizations and SCPs manually.

---

## Core Concepts

### The Landing Zone

A **landing zone** is the baseline multi-account environment that Control Tower sets up. It includes:

**Three foundational accounts:**
- **Management account** (your existing root Organizations account): Where Control Tower itself is configured. Contains the Organizations root, all SCPs, and Control Tower's own resources. Do not run workloads here.
- **Log Archive account**: A dedicated account that aggregates AWS CloudTrail logs and AWS Config records from every account in the organization. Centralized, tamper-resistant, and read-only for all but the audit role.
- **Audit account**: Provides security teams with read-only (or read/write for specific tools) cross-account access to review all accounts in the landing zone. GuardDuty, Security Hub, and other security tooling are typically centralized here.

**Organizational units (OUs):**
Control Tower creates two default OUs:
- **Security OU**: Contains the Log Archive and Audit accounts. Heavily restricted — no application workloads.
- **Sandbox OU**: For developer experimentation with looser guardrails.

You add additional OUs for Production, Development, Staging, and any other environmental or business-unit boundaries your organization needs.

---

### Guardrails (Controls)

A **guardrail** is an automated policy rule that enforces governance across accounts. Control Tower guardrails come in two enforcement mechanisms:

**Preventive guardrails** (implemented as SCPs): Block actions before they happen. For example, "Disallow the deletion of the Log Archive account" prevents any principal in the organization from deleting the log storage account.

**Detective guardrails** (implemented as AWS Config rules): Detect and report non-compliant configurations after the fact. For example, "Detect whether MFA is enabled for the root user" checks each account and flags any that are non-compliant.

Guardrails have three classification levels:

| Classification | Description | Example |
|---|---|---|
| **Mandatory** | Always enabled; cannot be disabled | Disallow changes to CloudTrail configuration in Log Archive account |
| **Strongly Recommended** | AWS recommends enabling; can be disabled with justification | Enable encryption at rest for EBS volumes |
| **Elective** | Optional governance policies for specific compliance needs | Disallow creation of internet gateways |

You apply guardrails at the OU level. All accounts in an OU inherit the guardrails applied to it. This means a policy decision made at the Production OU level automatically applies to every account you add to that OU.

---

### Account Factory

The **Account Factory** is Control Tower's automated account vending machine. When you need a new AWS account, you submit a request through Account Factory (or via Service Catalog, or via the Control Tower API). Account Factory:

1. Creates a new AWS account in your Organizations structure
2. Places it in the correct OU you specify
3. Applies all guardrails for that OU automatically
4. Sets up IAM Identity Center access with the permission sets you configure
5. Applies your baseline CloudFormation template (called the **Account Factory Customization** or AFC) to pre-configure resources like VPCs, logging configurations, and tagging policies

The result: a new account that conforms to your organization's baseline in under 30 minutes, with no manual configuration steps.

**Account Factory for Terraform (AFT)**: For organizations using Terraform, AWS provides AFT — a Terraform-based customization layer that runs after Account Factory creates the account and applies your Terraform configurations automatically.

---

### Drift Detection and Remediation

Once a landing zone is established, configurations can **drift** — an account owner might accidentally delete a required Config rule, modify an SCP, or disable CloudTrail. Control Tower continuously monitors for drift using AWS Config and CloudTrail. When drift is detected, Control Tower flags the affected resource in the console.

Remediation is available for some drift types directly from the console (**Re-register OU** or **Re-baseline** individual accounts). For others, you must resolve the drift manually before Control Tower will mark the account as compliant.

Drift detection does not automatically remediate — it alerts. Preventing drift entirely requires strong SCPs (guardrails) and organizational discipline about which teams have console access to the management account.

---

### How Control Tower Relates to Other Services

Control Tower is an orchestration layer, not a replacement for the services it manages:

| Service | Control Tower Relationship |
|---|---|
| **AWS Organizations** | Control Tower creates and manages the Organizations structure. It uses Organizations as the underlying mechanism for SCPs and account grouping. |
| **AWS IAM Identity Center** | Control Tower enables and configures IAM Identity Center for federated access to all accounts. |
| **AWS CloudTrail** | Control Tower creates an organization-wide trail that aggregates to the Log Archive account. |
| **AWS Config** | Control Tower enables Config in all accounts and creates organization-wide aggregators for centralized compliance visibility. |
| **AWS Service Catalog** | Account Factory uses Service Catalog under the hood for the self-service account provisioning workflow. |
| **AWS Security Hub** | Detective guardrails integrate with Security Hub findings. Security Hub is typically centralized in the Audit account. |

---

## Configuration Reference

### Setting Up Control Tower (Console)

Control Tower setup is a one-time wizard in the management account:

```
1. AWS Console → Control Tower → Set up landing zone
2. Provide:
   - Home Region (where Control Tower configuration lives)
   - Email addresses for Log Archive account and Audit account
   - OU names (default: Security OU, Sandbox OU)
   - Foundation OU configuration
3. Review the pre-enabled mandatory guardrails
4. Click "Set up landing zone" — takes approximately 60 minutes
```

After setup, Control Tower creates ~20 mandatory guardrails (preventive SCPs and detective Config rules) automatically.

---

### Enabling an Elective Guardrail (CLI)

```bash
# List available guardrails for an OU
aws controltower list-enabled-controls \
  --target-identifier arn:aws:organizations::123456789012:ou/o-abc123/ou-xyz-abcdef12

# Enable an elective guardrail on a specific OU
aws controltower enable-control \
  --control-identifier arn:aws:controltower:us-east-1::control/AWS-GR_RESTRICT_ROOT_USER_ACCESS_KEYS \
  --target-identifier arn:aws:organizations::123456789012:ou/o-abc123/ou-xyz-abcdef12
  # The guardrail applies to ALL accounts currently in the OU and all future accounts
  # The control-identifier is the guardrail's ARN from the Control Tower catalog
```

---

### Enrolling an Existing Account into Control Tower

If you have existing AWS accounts in your Organizations structure that were not created through Account Factory, you can enroll them:

```
Control Tower Console → Accounts → Enroll account
Select the account → Confirm the OU placement
Control Tower will:
  - Apply mandatory guardrails to the account
  - Enroll it in Config and CloudTrail aggregation
  - Set up IAM Identity Center access roles
  - Report any initial drift findings
```

---

## How to Decide

| Scenario | Recommendation |
|---|---|
| Starting a new multi-account AWS environment | Use Control Tower — fastest path to a secure baseline |
| Existing organization with manual Organizations/SCP setup | Evaluate migrating to Control Tower; the guardrail catalog and drift detection add significant value |
| Single account, small team | Control Tower is overkill; use AWS Organizations + basic SCPs manually |
| Need highly customized account baselines (complex networking, proprietary tooling) | Control Tower + Account Factory for Terraform (AFT) for post-creation customization |
| Regulated industry requiring specific compliance controls | Control Tower's elective guardrails map to CIS, PCI DSS, NIST, and HIPAA controls |

---

## Exam Traps

**Trap 1: "Control Tower is just AWS Organizations with a different name."**
Control Tower orchestrates Organizations, IAM Identity Center, CloudTrail, Config, and Service Catalog together. Organizations is one of the services Control Tower manages. You could build the same result manually, but Control Tower provides the automation, guardrail catalog, drift detection, and account vending that Organizations alone does not.

**Trap 2: "Guardrails replace SCPs."**
Preventive guardrails ARE SCPs — Control Tower creates and manages them. Detective guardrails are Config rules. "Guardrail" is the Control Tower vocabulary for these policies; underneath, the AWS primitives are unchanged.

**Trap 3: "Control Tower manages existing accounts automatically."**
Control Tower only manages accounts that are enrolled in the landing zone. Accounts created outside of Account Factory (or not subsequently enrolled) are not subject to Control Tower guardrails. You must explicitly enroll existing accounts.

**Trap 4: "You can run production workloads in the management account."**
AWS explicitly recommends against this. The management account has elevated trust (it can override SCPs on any account in the organization). Isolate it to governance functions only. Use separate accounts for all workloads.

---

## Summary

- Control Tower sets up a landing zone: Management account + Log Archive account + Audit account + Organizational Units, with centralized CloudTrail, Config, and IAM Identity Center configured automatically.
- Guardrails are the governance mechanism: preventive (SCPs) block actions; detective (Config rules) detect drift. Classified as Mandatory, Strongly Recommended, or Elective.
- Account Factory automates new account creation — consistent baseline configuration in under 30 minutes, with Terraform support (AFT) for custom post-creation setup.
- Control Tower orchestrates Organizations, IAM Identity Center, CloudTrail, Config, and Service Catalog — it does not replace them, it manages them together.
- Drift detection alerts when guardrail-controlled configurations change; remediation is manual or via re-baselining, not automatic.

---

## Examples

A financial services firm starts a cloud transformation. They have 300 AWS accounts across 6 business units, each with different compliance requirements. They deploy Control Tower with 4 OUs (Production, Non-Production, Sandbox, Regulated). The Regulated OU has all strongly recommended guardrails plus 15 elective guardrails mapping to PCI-DSS controls. When the engineering team needs a new development account, they submit an Account Factory request and receive a compliant, networked account in 25 minutes with all guardrails pre-applied. Six months later, an audit shows zero drift across all 300 accounts.

A startup grows from 1 account to 8 accounts over 18 months, managing Organizations and SCPs manually. They realize their SCP structure is inconsistent across OUs, some accounts are missing CloudTrail configurations, and there is no centralized log storage. They enable Control Tower in the management account and enroll all 8 accounts. After enrollment, Control Tower reports 12 drift findings (missing Config rules, incomplete CloudTrail configurations). They remediate the findings and set up Account Factory for all future accounts. The cost of the migration: one engineering sprint. The benefit: a documented, auditable, consistently governed multi-account environment.

---

## Think About It

1. You are setting up a 50-account AWS organization. Why should you not run application workloads in the management account, and what specific risks does running workloads there create?
2. A detective guardrail fires for "Root user access keys exist" in one of your production accounts. What is the remediation, and why is this guardrail detective rather than preventive?
3. Your organization has strict compliance requirements that prevent certain AWS regions from being used. How would you implement this as a guardrail, and at what OU level would you apply it?
4. An engineering team creates a new VPC in a production account with an internet gateway, which violates your organization's policy. A detective guardrail flags it. What are your options for remediation — and how would a preventive guardrail have prevented it in the first place?

---

## Quick Check

**Q1.** What are the three foundational accounts created or designated in an AWS Control Tower landing zone?

- A) Development, Staging, and Production accounts
- B) Management account, Log Archive account, and Audit account
- C) Root account, Security account, and Billing account
- D) Master account, Member account, and Linked account

**Answer: B** — The Control Tower landing zone establishes a Management account (where Control Tower is configured), a Log Archive account (centralized CloudTrail and Config log storage), and an Audit account (security team access for cross-account review).

**Q2.** A company wants to prevent any IAM principal in any of their 40 AWS accounts from disabling AWS CloudTrail. Which type of Control Tower guardrail implements this?

- A) Detective guardrail implemented as a Config rule
- B) Preventive guardrail implemented as a Service Control Policy
- C) Mandatory guardrail implemented as an IAM permission boundary
- D) Elective guardrail implemented as a CloudWatch alarm

**Answer: B** — Preventive guardrails use SCPs to block actions before they happen. A preventive SCP denying `cloudtrail:StopLogging` and `cloudtrail:DeleteTrail` in member accounts enforces this policy at the Organizations level — no IAM policy in any member account can override an SCP deny.

**Q3.** A developer requests a new AWS account for a production workload. Using AWS Control Tower, how is this account provisioned?

- A) The developer creates a new account in the AWS Organizations console and applies guardrails manually
- B) The developer submits a request through Account Factory, which creates the account, places it in the correct OU, and applies all guardrails automatically
- C) A root user manually creates the account and emails the credentials to the developer
- D) The management account administrator writes a CloudFormation template to create the account

**Answer: B** — Account Factory is the self-service mechanism for creating new, pre-configured accounts. It automates account creation, OU placement, guardrail application, and IAM Identity Center access setup.

---

## What's Next

Next: Module 05 — Shared Responsibility Model and Compliance. The governance architecture you set up with Control Tower is the foundation for proving compliance to auditors.
