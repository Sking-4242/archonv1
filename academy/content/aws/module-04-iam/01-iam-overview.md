---
title: "IAM Overview"
type: content
estimated_minutes: 15
cert_tags: ["CLF-C02", "SAA-C03", "SOA-C02", "DVA-C02"]
---

# IAM Overview

## Overview

AWS Identity and Access Management (IAM) is the service that controls who can authenticate to AWS and what they are authorized to do once authenticated. Every single API call made to AWS — whether you click a button in the Management Console, run a CLI command, or call an API from application code — passes through IAM for both authentication and authorization before AWS executes anything. IAM is not one security feature among many; it is the security control plane for the entire platform. Misconfiguring IAM is the root cause of a significant proportion of AWS security incidents, and understanding it deeply is not optional for anyone working with AWS at any level of seniority.

IAM is a global service. Unlike EC2, S3, or RDS — which are regional — IAM users, groups, roles, and policies exist globally across every AWS Region simultaneously. There is no Region selector on the IAM console. A policy you create in IAM is available in every Region the moment it is saved, and an IAM user created today can authenticate and make API calls in us-east-1, eu-west-1, or ap-southeast-2 without any Region-specific setup. This global scope has important security implications: a compromised IAM credential can be used from anywhere in the world, in any Region, immediately. Security monitoring must therefore cover all Regions, not just the ones where your workloads run.

IAM is permanently free. There is no per-user, per-role, or per-policy charge — ever, regardless of how long your account has existed. You pay for the AWS resources that IAM-authenticated principals access — the EC2 instances, S3 storage, Lambda invocations — not for the identity management layer itself. This matters operationally because it removes any cost incentive to cut corners: there is no reason to share credentials or reuse identities to save money. You should create as many separate identities as your security model requires. The only cost of IAM is operational — the time and process required to manage identities at scale — and the tools covered in this module exist specifically to reduce that operational burden.

## Core Concepts

### Authentication vs. Authorization

These two words are frequently conflated, but they describe two entirely separate checks that happen sequentially on every AWS API call. Getting these confused leads to incorrect troubleshooting — applying the wrong fix to the wrong layer of the problem.

**Authentication** is the process of verifying identity: "Who are you?" When you log in to the AWS console with a username and password, or when your CLI sends an access key ID and secret access key, AWS is verifying that the credential matches a known identity in its records. Authentication is binary — it either succeeds or fails. If it fails, the API call stops immediately with an authentication error, and no further evaluation happens.

**Authorization** is the process of determining what an authenticated identity is permitted to do: "What are you allowed to do here?" After AWS confirms who you are, it evaluates all applicable IAM policies against the specific action you are requesting on the specific resource you are targeting. This evaluation can be complex — multiple policies may apply simultaneously, conditions may need to be checked, and organization-level controls from AWS Organizations may layer on top. Authorization failures look like access denied errors rather than authentication errors, and they require a completely different fix: adjusting policies rather than rotating credentials.

The distinction matters both for troubleshooting and for security design. An identity with perfectly valid credentials but no relevant policy will authenticate successfully and then be denied at authorization. An identity with expired or invalid credentials will fail at authentication before authorization is even evaluated. Knowing which check failed tells you exactly what to look at.

### IAM Is Global, Not Regional

Most AWS services are regional: you create an EC2 instance in a specific Region, and that instance exists only in that Region. IAM is the exception. When you create an IAM user, role, or policy, it is available globally — there is no concept of an IAM user that only exists in one Region.

Why does this matter? First, it means you configure IAM once and it works everywhere with no replication or synchronization lag required. Second, and more critically from a security perspective, it means a compromised IAM credential can be used to make API calls in any Region. An attacker who steals an access key does not need to know which Regions you use — they can probe all of them. This is why AWS security guidance recommends enabling AWS Config and CloudTrail across all Regions, not just the Regions you actively use.

There is one important nuance: some resource-based policies (like S3 bucket policies) are stored alongside the resource, which is regional. But IAM identity-based policies — the ones attached to users, groups, and roles — are genuinely global. The IAM console deliberately does not have a Region selector, which can be disorienting for new users accustomed to switching Regions on other service consoles. If you see the Region selector at the top right and switch to IAM, the IAM console shows the same data regardless of which Region you had selected.

### The Root Account

When you first create an AWS account, you provide an email address and a password. The identity created by this process is the **root user**. The root user is not an IAM user — it is a special account-level identity that has complete, unrestricted access to every resource and every action in the account, including billing management, account closure, and changing the account email address. Root access cannot be restricted by IAM policies. Root cannot be constrained by Service Control Policies applied to the management account. There is no permission boundary or policy mechanism that limits what root can do within its account.

The root user exists because certain administrative tasks — changing the account email, managing the support plan, closing the account, restoring access after all admin IAM users are locked out — require an identity that operates outside the normal IAM permission model. These tasks require root specifically because they cannot be delegated through IAM. For every other task, you should use IAM users or roles. The root account should be protected with a hardware MFA device, its credentials stored in a physically secure location separate from daily-use devices, and it should be used as rarely as possible — ideally only for the handful of tasks that are explicitly root-only.

A critical exam distinction: `AdministratorAccess` is an IAM policy that grants very broad access to most AWS services. A user with `AdministratorAccess` is powerful, but still subject to IAM evaluation logic and can theoretically be restricted by SCPs from AWS Organizations. The root user is a fundamentally different entity — it bypasses IAM entirely and cannot be restricted the same way.

### IAM Identity Types

IAM recognizes four principal types — entities that can make authenticated requests:

**IAM Users** represent individual humans or long-running legacy applications. They have long-term credentials: a username and password for console access, and/or an access key ID plus secret access key for programmatic access. Long-term credentials do not expire automatically, which is both their strength (stable, predictable access) and their primary risk (a leaked key remains valid indefinitely until manually rotated or deactivated). Each user can have a maximum of two access keys simultaneously to support rotation workflows.

**IAM Groups** are collections of IAM Users. Policies attached to a group apply to every user in that group. Groups do not make API calls themselves — they are purely an administrative construct for managing permissions at scale without attaching policies to every individual user. A user can belong to multiple groups simultaneously and inherits the union of all group policies. Groups cannot be nested, and groups cannot be referenced as principals in resource-based policies.

**IAM Roles** are the most powerful and most underutilized IAM construct. Roles have no long-term credentials. Instead, they have a trust policy (specifying who can assume the role) and permission policies (specifying what the role can do). When a principal assumes a role, AWS STS (Security Token Service) issues temporary credentials — an access key, secret key, and session token — that automatically expire after a configurable duration. Roles are how AWS services like EC2, Lambda, and ECS get credentials without requiring secrets to be hardcoded, stored in files, or embedded in code.

**IAM Policies** are the JSON documents that define permissions. They are attached to users, groups, or roles to grant or deny specific API actions on specific resources under specified conditions. Policies are the mechanism through which all authorization decisions are made, and understanding policy JSON deeply is a prerequisite for any meaningful IAM work.

### IAM Credential Types

IAM supports several types of credentials, each suited to different authentication scenarios:

**Console username + password** — used for human login to the AWS Management Console. Can be combined with MFA for a second factor. Passwords are subject to an account-level password policy you configure (minimum length, complexity requirements, rotation period).

**Access key ID + secret access key** — programmatic credentials used by the AWS CLI, SDK, and direct API calls. The access key ID (starts with `AKIA`) identifies which key is being used; the secret access key signs requests cryptographically. These are long-term credentials. If a secret access key is lost after creation, it cannot be retrieved — you must rotate to a new key pair.

**MFA device codes** — time-based or hardware-generated codes that serve as a second authentication factor layered on top of passwords or combined with access keys via `sts:GetSessionToken`. Covered in depth in the MFA lesson.

**Temporary security credentials from STS** — short-lived credentials issued when a role is assumed. Consist of an access key ID (starts with `ASIA`), a secret access key, and a session token. The session token is mandatory and must be included in API requests. These credentials automatically expire and cannot be revoked before expiry (you can only shorten the session duration for new assumptions).

**X.509 certificates** — a legacy credential type supported for some AWS services for SOAP-based API calls. Rarely used in modern architectures. Not a focus for any current certification exam.

### Why IAM Design Decisions Have Long-Term Consequences

IAM design is foundational and difficult to refactor once workloads are in production. Permission models built early in an organization's AWS journey tend to calcify: roles accumulate permissions over time as developers add access to unblock immediate needs, policies get copied and modified rather than centralized, and overly permissive access grants become load-bearing — removing them breaks things. The right time to design IAM carefully is at the start, not after a security incident reveals the gaps.

This is why AWS certifications treat IAM as foundational and deep rather than introductory and shallow. IAM design requires reasoning about threat models, operational workflows, organizational structure, and the blast radius of any potential compromise. A good IAM architecture reflects how the organization actually works, limits what any single compromised identity can access, and includes the audit tooling needed to detect when something goes wrong.

## Configuration Reference

### Console Navigation

**To reach the IAM dashboard:**
1. Log in to the AWS Management Console at `console.aws.amazon.com`
2. In the top search bar, type **IAM** and select **IAM** (listed under Services)
3. The IAM dashboard loads — notice there is no Region selector in the top-right corner. IAM is global; there is intentionally no Region to select.

**IAM Dashboard panels to know:**
- **Security recommendations** — this panel shows prioritized, actionable security findings for your account. Common findings: root MFA not enabled, no IAM users have MFA, access keys exist for the root account. Each finding links directly to the recommended fix. This is the first thing to review on a new or inherited account.
- **IAM users** — click to see every IAM user in the account, their creation date, last activity, whether they have console access, access keys, and MFA enabled. Useful for a quick security posture check.
- **Account ID** — shown prominently on the dashboard. Your 12-digit AWS account ID is required when constructing resource ARNs, cross-account policy principals, and trust policies. Know where to find it quickly.
- **Quick links** — links to Users, Groups, Roles, and Policies for fast navigation.

**To view the IAM users list:**
1. In the left navigation pane, click **Users**
2. The table shows each user, date created, last activity, and columns for console access and MFA
3. Click any user to see their attached policies (both directly attached and via groups), security credentials tab (access keys and their last use, age, and status), and groups they belong to

**To view IAM security recommendations:**
1. On the IAM dashboard, the **Security recommendations** panel is the most prominent section
2. Click any finding to go directly to the relevant resource with remediation options
3. These findings mirror the IAM checks in AWS Trusted Advisor — both draw from the same underlying assessment

### AWS CLI Reference

**Get a summary of all IAM usage in your account:**
```bash
aws iam get-account-summary
```

This command returns a JSON object with counts of IAM entities and limits. It is useful for a quick audit of account scale and for detecting whether you are approaching any service limits. Example annotated output:

```json
{
    "SummaryMap": {
        "Users": 12,                         // Current IAM user count (hard limit: 5,000)
        "Groups": 4,                         // Current IAM group count (limit: 300)
        "Roles": 31,                         // Current IAM role count (limit: 1,000 default)
        "Policies": 8,                       // Customer managed policies you have created
        "AttachedPoliciesPerUserQuota": 10,  // Max policies attachable to one user
        "GroupsPerUserQuota": 10,            // Max groups a single user can belong to
        "UserPolicySizeQuota": 2048,         // Max size (bytes) of all inline policies on a user
        "RolePolicySizeQuota": 10240,        // Max size (bytes) of all inline policies on a role
        "AccessKeysPerUserQuota": 2,         // Max access keys per user (allows rotation)
        "MFADevices": 9,                     // Total MFA devices registered in the account
        "MFADevicesInUse": 9                 // MFA devices actively assigned to a user
    }
}
```

**List all IAM users:**
```bash
aws iam list-users
# Returns a JSON array of all IAM users with creation date, ARN, and last activity
```

**Get details about a specific user:**
```bash
aws iam get-user --user-name alice
# Returns the user's ARN, path, creation date, and PasswordLastUsed timestamp
```

**List all IAM roles:**
```bash
aws iam list-roles
# Returns all roles with their ARN, creation date, and trust policy (AssumeRolePolicyDocument)
```

**List customer managed policies in your account:**
```bash
aws iam list-policies --scope Local
# --scope Local = customer managed policies only
# --scope AWS   = AWS managed policies only
# Omit --scope to see all policies
```

**Get your current caller identity (who am I right now?):**
```bash
aws sts get-caller-identity
# Returns: Account (12-digit ID), UserId, and ARN of the calling principal
# Use this to confirm which IAM identity the CLI is currently using
```

## How to Decide

| Scenario | Right IAM Construct | Why |
|---|---|---|
| Human employee needs AWS console access (small org) | IAM User (or IAM Identity Center for SSO) | Long-term identity tied to a person |
| EC2 instance needs to read from S3 | IAM Role attached to the instance (instance profile) | Temporary credentials, no secrets to manage or rotate |
| Lambda function needs DynamoDB access | IAM Role (Lambda execution role) | AWS assumes role at invocation, credentials auto-expire |
| Group of developers needs identical permissions | IAM Group with customer managed policy | Policy changes propagate to all members simultaneously |
| Third-party SaaS tool needs API access | IAM Role with ExternalId condition | Scoped, auditable, no long-term key sharing |
| More than 5,000 employees need AWS access | IAM Identity Center + external IdP federation | Hard user limit; federation scales without IAM Users |
| Task only root can perform | Root account (then lock it away again) | Changing account email, closing account, managing support plan |
| Auditing all API calls across the account | CloudTrail (uses IAM-authenticated events as source) | Every authenticated action is captured with principal identity |
| CI/CD pipeline in GitHub Actions | IAM Role with OIDC trust policy | No long-term secrets stored in the pipeline |

**The general rule:** Use IAM Roles for any non-human access. Use IAM Users only for humans who genuinely need long-term credentials (and even then, consider IAM Identity Center). Never use root for anything that can be done with a scoped IAM identity.

## How This Connects

- **AWS CloudTrail** — every IAM-authenticated API call generates a CloudTrail event. CloudTrail records the principal's identity, the action, the resource, the source IP, the timestamp, and the result. IAM and CloudTrail are inseparable from a security and audit perspective — they are designed to work together as the identity and activity layers of account governance.
- **AWS STS (Security Token Service)** — IAM Roles work because STS issues temporary credentials when a principal assumes a role. STS is the engine behind role assumption, federated access, cross-account access, and MFA-gated CLI sessions. Understanding STS behavior is fundamental to understanding how roles actually function at runtime.
- **AWS Organizations** — Service Control Policies (SCPs) in Organizations layer on top of IAM policies to restrict the maximum permissions available in member accounts. IAM and Organizations together form the two-layer permission model used in serious multi-account architectures: IAM grants permissions within an account, SCPs cap what can be granted across the organization.
- **Amazon S3** — S3 uses both IAM identity-based policies and its own resource-based bucket policies. Understanding IAM is a prerequisite for understanding S3 access control, which is heavily tested on every AWS certification. The interaction between IAM policies and bucket policies is a frequent source of access control bugs.
- **AWS IAM Identity Center (formerly SSO)** — the recommended solution for human access to AWS at scale. IAM Identity Center federates with external identity providers (Active Directory, Okta, Google Workspace) and maps external groups to IAM Roles, eliminating the need for individual IAM Users while maintaining the full IAM authorization model. Every permission granted through IAM Identity Center ultimately traces to an IAM Role assumption.

## Exam Traps

1. **IAM is NOT regional.** Exam questions sometimes describe "configuring IAM in us-east-1" or ask about IAM in a specific Region context. IAM is global — users, roles, and policies are not Region-specific. If a question implies you need to configure IAM separately per Region, that answer is wrong.

2. **The root account is NOT just another administrator.** `AdministratorAccess` is an IAM policy that can be attached to a user or role — it grants broad access but is still subject to IAM evaluation logic and can be restricted by SCPs. The root user bypasses IAM entirely. Questions that ask "which identity has unrestricted access that cannot be limited by IAM policies" — the answer is root, not a user with `AdministratorAccess`.

3. **IAM is free — permanently.** IAM is not subject to the 12-month AWS Free Tier. It has no cost, ever, regardless of account age or the number of identities created. There is no "advanced tier" or feature that adds cost.

4. **IAM Groups cannot be principals.** Resource-based policies (like S3 bucket policies) can reference IAM users and roles as principals, but not IAM groups. Groups are administrative containers — they cannot make API calls and cannot be referenced as principals in trust policies or resource policies. This is a common incorrect answer in exam questions.

5. **Authentication and authorization are sequential, not simultaneous.** Access failures require knowing which check failed. Valid credentials with no relevant policy = authentication succeeds, authorization fails. Invalid credentials = authentication fails before authorization is even evaluated. These require different fixes. The exam tests whether you know the difference.

## Summary

- IAM is the global, permanently free service that controls authentication ("who are you?") and authorization ("what can you do?") for every single AWS API call, without exception.
- IAM is global — users, groups, roles, and policies exist across all Regions with no per-Region configuration, synchronization, or replication required.
- The root account has unrestricted, unresistable access to everything in the account and cannot be fully restricted by IAM policies — protect it with a hardware MFA device, store credentials securely, and use it only for the small set of tasks that require it.
- The four IAM constructs are Users (long-term, human or legacy machine identities), Groups (administrative collections of users for permission management at scale), Roles (temporary credentials issued by STS for services, cross-account access, and federation), and Policies (JSON permission documents that define what actions are allowed or denied).
- IAM credential types include console passwords, programmatic access keys, MFA codes, STS temporary credentials, and legacy X.509 certificates — each suited to a different authentication scenario.
- IAM design decisions made early in an account's lifecycle are difficult to refactor later — getting the permission model right from the start is far less costly than cleaning up a poorly designed one after a security incident reveals the gaps.

## Examples

**Beginner:** A developer creates their first AWS account, signs in as root, and starts building. They use the root account to create S3 buckets, launch EC2 instances, and run CLI commands from their laptop with root access keys stored in `~/.aws/credentials`. This is the textbook example of what not to do — every IAM best practice is violated. The correct first steps: immediately enable MFA on the root account, create an IAM user or role with only the permissions needed for the current task, store root credentials and MFA device in secure separate locations, and never use root again except for the handful of root-only administrative tasks. The fact that IAM is free means there is zero cost argument for using root instead of a properly scoped IAM identity.

**Intermediate:** A ten-person startup is onboarding their third cloud engineer. The platform lead navigates to IAM, creates a new IAM User for the engineer, adds them to the existing "CloudEngineers" IAM Group, and enables console access with a temporary password that expires at first login. The engineer logs in, is prompted to change their password, and configures MFA using Google Authenticator. Their access — defined by policies attached to the CloudEngineers group — is available immediately. No individual policy documents need to be written or attached. Six months later when the engineer transitions to a consulting role and needs read-only access instead, the platform lead removes them from CloudEngineers and adds them to ReadOnly — a two-minute change. This is the IAM User and Group model operating correctly: permissions at the group level, identity at the user level, group membership as the only connection point.

**Advanced:** A financial services company runs 47 AWS accounts across three organizational units in AWS Organizations. The security team is asked to produce a full IAM posture report: how many IAM users exist across all accounts, whether root MFA is enabled on each account, and whether any access keys are older than 90 days without rotation. They use `aws iam get-account-summary` and `aws iam generate-credential-report` plus `aws iam get-credential-report` across all accounts, executing these commands via a cross-account role using AWS Organizations' trusted access feature. The results feed a centralized security dashboard that shows, account by account, every deviation from IAM best practices. The global nature of IAM — the fact that these reports are account-wide rather than Regional — makes aggregation tractable: 47 API calls (one per account) versus 47 × 30 Region calls if IAM were regional.

## Think About It

1. IAM is a global service with no regional scope. What security and operational implications does this have — and can you think of a scenario where that global nature could create a problem if an attacker gains access to an IAM credential in a Region you are not actively monitoring?
2. If IAM is permanently free, why might an organization still want to minimize the number of IAM Users it creates? What costs or risks remain even when the service itself has no price tag, and what does that tell you about the real drivers of IAM complexity?
3. Authentication answers "Who are you?" and authorization answers "What can you do?" What happens in the gap between them — if authentication succeeds but the authorization evaluation system has a bug or misconfiguration? Have you seen this pattern cause access failures in systems outside of AWS?
4. The root account has complete unrestricted access and cannot be limited by IAM policies. What is the actual list of tasks that require root specifically, and what does the brevity of that list tell you about how often the root account should realistically be used in a healthy AWS environment?
5. What would have to be true about a system for IAM Users alone — without roles — to be sufficient for all access needs? Is there any legitimate modern use case where roles cannot substitute for access keys, or has the ecosystem evolved to the point where the answer is always "prefer roles"?

## Quick Check

**Q1.** Which of the following is true about IAM as an AWS service?

- A) It is region-specific and must be configured separately in each AWS Region
- B) It has no additional cost and operates globally across all AWS Regions
- C) It is free only during the 12-month AWS Free Tier period
- D) Advanced features such as MFA and permission boundaries require a paid subscription

**Answer: B** — IAM is a global service (not region-specific) and is permanently free — not subject to the 12-month free tier. Every IAM feature, including MFA, permission boundaries, and IAM Access Analyzer, is available at no per-user or per-feature charge.

**Q2.** An EC2 instance needs to write application logs to an S3 bucket without storing credentials anywhere in the application or its configuration. What is the correct approach?

- A) Create an IAM User with programmatic access keys and embed them in the application as environment variables
- B) Attach an IAM Role with the required S3 permissions directly to the EC2 instance as an instance profile
- C) Add the EC2 instance's IP address to the S3 bucket policy's Condition block
- D) Use the root account access key and rotate it every 90 days

**Answer: B** — IAM Roles attached to EC2 instances provide temporary credentials automatically through the instance metadata service (IMDS) at `169.254.169.254`. The application retrieves credentials at runtime with no hardcoded secrets, and the credentials rotate automatically before expiration. No manual rotation is ever required.

**Q3.** What is the key difference between authentication and authorization in the context of an AWS API call?

- A) Authentication checks service quotas and resource limits; authorization checks identity
- B) Authentication verifies who you are; authorization determines what actions you are permitted to perform
- C) They are two names for the same IAM evaluation process that runs simultaneously
- D) Authentication is handled by S3 bucket policies; authorization is handled by IAM identity policies

**Answer: B** — Authentication ("who are you?") uses credentials to verify that a known identity is making the request. Authorization ("what can you do?") evaluates all applicable IAM policies against the specific action and resource being requested. Both must succeed for an API call to complete. They are sequential checks, not simultaneous — a failure at authentication stops evaluation before authorization begins.

## What's Next

Next: a deep dive into Users, Groups, and Roles — the three IAM identity constructs you use to build every real-world permission model, including full JSON trust policy examples and console walkthroughs.
