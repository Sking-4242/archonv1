---
title: "AWS IAM Identity Center: Federated Access at Scale"
type: content
estimated_minutes: 16
cert_tags: ["SAA-C03", "SAP-C02", "SOA-C02", "SCS-C02"]
---

# AWS IAM Identity Center: Federated Access at Scale

## Overview

AWS IAM Identity Center (formerly AWS Single Sign-On, or SSO) is the AWS-recommended way to manage human access to AWS accounts and applications at any scale. Instead of creating individual IAM Users in every account, IAM Identity Center gives each person a single identity — sourced from your corporate directory or Identity Center's built-in directory — and lets you assign that identity fine-grained permissions across any number of AWS accounts from one centralized place.

The problem IAM Users create at scale is that they multiply with every account. A team of 50 engineers accessing 20 AWS accounts in an AWS Organizations structure would require up to 1,000 IAM Users — each with separate credentials, rotation schedules, MFA devices, and deprovisioning procedures. When an engineer leaves the company, you must find and remove their IAM User in every account they accessed. IAM Identity Center solves this entirely: the person exists once, is assigned to accounts with appropriate permissions, and revoking their access happens in one place — their identity provider.

For the SAA and SAP exams, Identity Center is tested as the correct architecture for any question involving "hundreds of users," "multiple accounts," "single sign-on," "federated access," or "external identity provider." For the SOA exam, the operational aspects — assigning permission sets, configuring provisioning, and troubleshooting access — are tested. After this lesson, you will be able to design a multi-account access model using IAM Identity Center and explain why it replaces IAM Users as the human access pattern.

---

## Core Concepts

### How IAM Identity Center Works — The Mental Model

IAM Identity Center sits between your identity source (where people exist) and your AWS accounts (where permissions are granted). It maintains a mapping: **Person X** (from your directory) has **Permission Set Y** (a collection of IAM policies) in **Account Z** (one or more AWS accounts). When person X logs in, Identity Center synthesizes those grants into a temporary IAM role session scoped to the selected account.

From the user's perspective: they visit the IAM Identity Center portal (a URL like `your-org.awsapps.com/start`), authenticate with their corporate credentials, see a list of all the accounts and roles they have access to, and click to open the console or generate CLI credentials — no IAM User password, no long-lived access keys.

From the AWS architecture perspective: Identity Center creates a service-linked role in each AWS account and assumes it on behalf of the user, returning short-lived credentials scoped to the permission set. Nothing long-lived is stored in the member accounts.

---

### Identity Sources

IAM Identity Center supports three identity source options:

**IAM Identity Center built-in directory**: Identity Center manages users and groups itself. Suitable for organizations that do not have an external directory, small teams, or lab/sandbox environments. Users are created and managed directly in the Identity Center console.

**AWS Managed Microsoft Active Directory (AD)**: Identity Center connects to an AWS Managed AD directory (via AWS Directory Service). Users authenticate against their existing AD credentials. Group memberships in AD drive permission assignments in Identity Center. This is the standard enterprise pattern for organizations with a Windows/Active Directory environment.

**External identity provider via SAML 2.0**: Identity Center federates with an external IdP — Okta, Microsoft Azure AD / Entra ID, Google Workspace, Ping Identity, OneLogin, and others. SAML 2.0 is the industry standard. With an external IdP configured, Identity Center acts purely as the AWS access layer; authentication and user lifecycle (provisioning, deprovisioning) are managed by the IdP. **SCIM** (System for Cross-domain Identity Management) enables automatic provisioning and deprovisioning — when a user is added to a group in Okta, they automatically gain the corresponding AWS access; when they are removed or their account is suspended, access is revoked without any manual AWS action.

---

### Permission Sets

A **permission set** is a collection of IAM policies packaged together and named (e.g., `DeveloperReadOnly`, `DatabaseAdmin`, `FinanceViewer`). It is the unit of permission assignment in Identity Center. Permission sets can contain:

- **AWS managed policies** (e.g., `ReadOnlyAccess`, `AdministratorAccess`)
- **Inline policies** (custom JSON you write)
- **Permission boundaries** (to cap the maximum permissions the permission set can exercise)
- **Customer managed policies** referenced by name (the policy must exist in each target account)

Permission sets are defined once in Identity Center and can be assigned to multiple accounts. If you update a permission set, the change propagates to all account assignments that use it. This is the key operational advantage: a single policy change takes effect across your entire organization without touching each account individually.

---

### Account Assignments

An **account assignment** binds a permission set to a user or group in a specific account. The full triple is: **{User or Group} → {Permission Set} → {AWS Account}**.

For example:
- Group `SRE-Team` → Permission Set `PlatformEngineer` → All production accounts
- Group `Finance-Team` → Permission Set `CostExplorerReadOnly` → Management account only
- User `alice@company.com` → Permission Set `AdministratorAccess` → Sandbox account only

Assignments can be made via the Identity Center console, AWS CLI, or managed via Infrastructure as Code (Terraform, CloudFormation, CDK).

---

### The SSO Portal and CLI/SDK Access

Users access Identity Center through the **AWS access portal** (`https://your-org.awsapps.com/start`). After authenticating, they see tiles for each account and permission set they can assume. Clicking a tile opens the AWS Console already scoped to that account and role.

For CLI and programmatic access, the AWS CLI v2 supports Identity Center natively:

```bash
# Configure a named profile backed by IAM Identity Center
aws configure sso \
  --profile dev-account \
  --sso-start-url https://your-org.awsapps.com/start \
  --sso-region us-east-1 \
  --sso-account-id 123456789012 \
  --sso-role-name DeveloperAccess

# Authenticate (opens browser for IdP login — generates short-lived credentials)
aws sso login --profile dev-account

# Use the profile for any CLI command
aws s3 ls --profile dev-account

# Credentials automatically refresh — no manual rotation needed
```

Short-lived credentials issued by Identity Center are valid for the session duration configured on the permission set (default 1 hour, configurable up to 12 hours). They are automatically refreshed when using the `--profile` flag with the AWS CLI.

---

## Configuration Reference

### Enabling IAM Identity Center

IAM Identity Center is enabled once per AWS Organizations management account and operates organization-wide. It must be enabled in one AWS Region (the "home region") which holds the configuration data.

```
Console path:
AWS Organizations management account →
IAM Identity Center → Enable →
Choose identity source (Built-in directory / Active Directory / External IdP)
```

> **Important:** Identity Center configuration lives in the management account but grants access across all member accounts. Enable it from the management account only.

---

### Creating a Permission Set (CLI)

```bash
# Create a permission set in Identity Center
aws sso-admin create-permission-set \
  --instance-arn arn:aws:sso:::instance/ssoins-1234567890abcdef \
  --name "DeveloperReadOnly" \
  --description "Read-only access to developer-relevant services" \
  --session-duration PT8H                    # ISO 8601 duration; here = 8 hours

# Attach an AWS managed policy to the permission set
aws sso-admin attach-managed-policy-to-permission-set \
  --instance-arn arn:aws:sso:::instance/ssoins-1234567890abcdef \
  --permission-set-arn arn:aws:sso:::permissionSet/ssoins-1234567890abcdef/ps-abcdef123456 \
  --managed-policy-arn arn:aws:iam::aws:policy/ReadOnlyAccess

# Attach an inline (custom) policy to the permission set
aws sso-admin put-inline-policy-to-permission-set \
  --instance-arn arn:aws:sso:::instance/ssoins-1234567890abcdef \
  --permission-set-arn arn:aws:sso:::permissionSet/ssoins-1234567890abcdef/ps-abcdef123456 \
  --inline-policy '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Deny",
      "Action": ["ec2:TerminateInstances", "rds:DeleteDBInstance"],
      "Resource": "*"
    }]
  }'                                         # Layered deny prevents destructive actions even on ReadOnly base
```

---

### Creating an Account Assignment (CLI)

```bash
# Assign a group to a permission set in a specific account
aws sso-admin create-account-assignment \
  --instance-arn arn:aws:sso:::instance/ssoins-1234567890abcdef \
  --target-id 123456789012 \                 # AWS Account ID
  --target-type AWS_ACCOUNT \
  --permission-set-arn arn:aws:sso:::permissionSet/ssoins-1234567890abcdef/ps-abcdef123456 \
  --principal-type GROUP \
  --principal-id abcdef12-1234-1234-1234-abcdef123456   # Group ID from Identity Center directory
  # Identity Center creates a service-linked role in account 123456789012
  # automatically — no manual role creation required
```

---

### Configuring SCIM Provisioning with an External IdP (Okta Example)

```
In IAM Identity Center console:
1. Settings → Identity source → Change → External identity provider
2. Download the IAM Identity Center SAML metadata file
3. Copy the SCIM endpoint URL and generate an access token

In Okta Admin Console:
1. Applications → AWS IAM Identity Center app → Provisioning
2. Set SCIM connector base URL = (Identity Center SCIM endpoint)
3. Set OAuth Bearer Token = (access token from Identity Center)
4. Enable: Push New Users, Push Profile Updates, Push Groups
5. Assign Okta groups to the app — members auto-provision in Identity Center
```

With SCIM active: adding a user to the Okta `AWS-Developers` group automatically creates them in Identity Center and grants whatever account assignments are mapped to that group. Removing them from the group or deactivating their Okta account automatically revokes all AWS access.

---

## How to Decide

| Scenario | Recommended Approach |
|---|---|
| Small team (< 10 users), single account, sandbox | IAM Users with MFA (simple, low overhead) |
| Any production environment, any team size | IAM Identity Center with permission sets |
| Existing corporate AD/Okta/Google Workspace | Identity Center + external IdP via SAML 2.0 + SCIM |
| Multi-account AWS Organizations | Identity Center — single control plane for all account access |
| Cross-account access for automated workloads (services, scripts) | IAM Roles with cross-account trust policies (not Identity Center — that is for human access) |
| Regulatory requirement: no long-lived credentials for humans | Identity Center — all sessions use short-lived credentials, no persistent access keys |

---

## Exam Traps

**Trap 1: "IAM Users scale to any number of users."**
IAM Users have a default limit of 5,000 per account and do not support single sign-on across accounts. For multi-account, multi-user environments, IAM Identity Center is the architecturally correct answer. Any exam question describing "hundreds of users" or "multiple AWS accounts" points to Identity Center.

**Trap 2: "IAM Identity Center requires you to manage credentials in every account."**
The opposite. Identity Center creates temporary role sessions — there are no long-lived IAM User credentials in any member account. Users authenticate through the portal or CLI and receive short-lived tokens. This is a security advantage, not a limitation.

**Trap 3: "External IdP federation replaces IAM entirely."**
IAM still exists in each account. Identity Center creates IAM roles (via service-linked roles) in each account and assigns them to federated users through permission sets. IAM is the enforcement layer; Identity Center is the management and federation layer on top.

**Trap 4: "SAML federation and SCIM are the same thing."**
SAML handles authentication (proving who you are). SCIM handles provisioning (syncing user and group records from the IdP to Identity Center so that assignments are always current). You need both for a complete external IdP integration.

---

## Summary

- IAM Identity Center is the AWS-recommended human access model for any multi-account or multi-user environment — it replaces IAM User management with a centralized, federated identity solution.
- Identity sources: built-in directory (simple), AWS Managed AD (Windows enterprise), or external IdP via SAML 2.0 + SCIM (Okta, Azure AD, Google Workspace).
- Permission sets are the unit of permission management — defined once, assigned to many account/group combinations, and updated in one place to propagate across the organization.
- All Identity Center sessions use short-lived credentials; no long-lived access keys are issued to human users.
- SCIM provisioning automates user lifecycle: adding/removing users from IdP groups automatically grants/revokes AWS access without manual IAM actions.

---

## Examples

A company acquires a startup and needs to give 80 engineers access to their AWS Organizations structure of 15 accounts within two weeks. Rather than creating 80 IAM Users in each of 15 accounts (1,200 users), the platform team connects IAM Identity Center to Okta via SAML + SCIM. They create five permission sets (DeveloperReadOnly, DeveloperPowerUser, DatabaseAdmin, PlatformEngineer, SecurityAuditor) and map them to Okta groups. When the 80 engineers are added to their appropriate Okta groups, they automatically appear in Identity Center with the correct account assignments. The entire migration takes three days. When an engineer is offboarded, their Okta account deactivation revokes all AWS access in seconds.

A security audit finds that several IAM Users in production accounts have access keys that are 18 months old and have never been rotated. The security team migrates all human users to IAM Identity Center and deletes the IAM Users. Post-migration, there are no long-lived human credentials in any account — all access is through short-lived Identity Center sessions. The audit finding is permanently resolved by architecture, not by a key rotation process.

---

## Think About It

1. A developer needs access to 10 AWS accounts to do their job. Compare the operational overhead of managing that access with IAM Users versus IAM Identity Center — for both the initial setup and for the scenario where the developer changes teams and needs a different permission set.
2. Your organization uses Okta as its IdP. You configure IAM Identity Center with SAML 2.0 but do not set up SCIM. An employee is terminated and their Okta account is deactivated. Can they still access AWS? Why or why not — and what does SCIM add to close this gap?
3. A permission set uses `ReadOnlyAccess` (an AWS managed policy). Your security team wants to prevent any user with this permission set from viewing Secrets Manager values. How would you implement this without modifying the `ReadOnlyAccess` policy?

---

## Quick Check

**Q1.** A company has 200 employees who each need access to between 3 and 8 AWS accounts. Which solution minimizes operational overhead for access management?

- A) Create an IAM User for each employee in each account they need access to
- B) Create a single IAM User per employee in the management account and use resource-based policies in each account
- C) Use IAM Identity Center with permission sets assigned to groups, synchronized from the corporate IdP
- D) Use cross-account IAM roles with hardcoded trust policies per employee ARN

**Answer: C** — IAM Identity Center with an external IdP provides a single identity per employee, centralized assignment management, automatic provisioning/deprovisioning via SCIM, and short-lived credentials in all accounts. The other options require per-account IAM User management or static trust policies that are operationally brittle.

**Q2.** What is the purpose of SCIM in an IAM Identity Center configuration?

- A) It encrypts SAML assertions between the IdP and Identity Center
- B) It automatically provisions and deprovisions users and groups in Identity Center based on the IdP's directory state
- C) It generates short-lived credentials for CLI access
- D) It synchronizes IAM policies between accounts in an AWS organization

**Answer: B** — SCIM (System for Cross-domain Identity Management) keeps Identity Center's user and group directory in sync with the external IdP. When a user is added to a group in Okta or removed from the company's directory, SCIM propagates that change to Identity Center automatically.

---

## What's Next

Next: AWS Organizations — multi-account structure, Service Control Policies, and Organizational Units that form the governance layer Identity Center sits on top of.
