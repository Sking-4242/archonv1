---
title: "Users, Groups, and Roles"
type: content
estimated_minutes: 16
cert_tags: ["CLF-C02", "SAA-C03", "SOA-C02", "DVA-C02"]
---

# Users, Groups, and Roles

## Overview

IAM Users, Groups, and Roles are the three identity constructs you use to build a real-world permission model in AWS. Each one solves a different problem. IAM Users represent persistent identities — people or long-running legacy applications with stable, long-term credentials. IAM Groups are administrative containers that let you manage permissions at scale rather than user by user, eliminating the tedium and error-proneness of attaching the same policies to each person individually. IAM Roles are the most powerful and most commonly misunderstood construct: they provide automatically expiring temporary credentials to anything that cannot or should not use long-term secrets — AWS services, other accounts, federated users, and automated workloads.

Knowing when to use which construct is one of the most common IAM exam question patterns. The scenario typically describes some entity that needs access: "an EC2 instance needs to read from S3," "a developer joins the engineering team," "a cross-account pipeline needs to deploy to production." The answer almost always follows the same rule — role for services and automation, user for humans at small scale or legacy integrations, group for managing human permissions without per-user policy attachment. Understanding the rationale behind that rule, not just the rule itself, is what enables you to apply it correctly to questions you have never seen before.

Understanding the architecture of each construct also helps you reason about its failure modes and threat model. IAM Users can have stale, leaked, or over-permissioned credentials that remain valid indefinitely without active rotation. IAM Groups simplify administration but their permissions can grow broader over time without careful governance — every policy added to a group immediately applies to every user in it. IAM Roles eliminate long-term credential risk but require understanding trust policies and the STS assume-role flow, and a misconfigured trust policy can grant unintended access to the wrong principal. Each construct has a distinct threat surface that shapes how you use it.

## Core Concepts

### IAM Users: Long-Term Identities

An IAM User is a persistent identity within an AWS account with a unique name and stable credentials. Each user can be issued two types of credentials, independently or together:

**Console credentials** — a username and a password that allow the user to log in to the AWS Management Console at `signin.aws.amazon.com/console`. MFA is layered on top of passwords and should always be enabled for any human user who can log in to the console. Without MFA, a stolen password alone grants console access.

**Programmatic credentials** — an access key ID (starts with `AKIA`) and a corresponding secret access key, used by the AWS CLI, SDK, and direct HTTPS API calls. These credentials sign API requests cryptographically. They are static and long-term — they do not expire automatically. A leaked access key from two years ago is still valid unless it was manually rotated or deactivated. Bots scan public repositories for AWS access key patterns within seconds of publication; an accidentally committed key should be treated as compromised immediately.

A single IAM User can have both console and programmatic credentials simultaneously. Each user can have a maximum of two access keys at a time — this limit exists specifically to support rotation workflows: create a new key, update all systems using the old key, then deactivate and delete the old one. A user with no credentials at all is a valid state — useful for placeholder identities or entities that authenticate only through role assumption.

**Why long-term credentials are a structural risk:** The fundamental problem with access keys is that they don't expire on their own. The security model requires active management — regular rotation, monitoring for unused keys, immediate revocation when employees leave or keys are suspected compromised. This operational burden scales poorly and is frequently neglected. It is the main reason AWS guidance says "prefer roles to users for any non-human access."

**Limits you must know:** 5,000 IAM Users per account is the default limit. This limit can technically be raised via an AWS Service Quotas increase request, but AWS strongly discourages this path — for any organization needing to scale beyond a few hundred users, IAM Identity Center with federation to an external identity provider (Active Directory, Okta, Google Workspace) is the architecturally correct solution. IAM Users simply do not scale to enterprise user counts, regardless of the quota limit.

### IAM Groups: Permission Management at Scale

An IAM Group is a named collection of IAM Users. Policies attached to a group apply to every user in the group immediately. When a user is added to a group, they inherit all of the group's permissions. When they are removed, those permissions are revoked instantly.

Groups exist to solve the "N users × M policies" management problem. Without groups: 50 developers × 8 policies = 400 separate policy attachments to maintain. Adding a new permission means 50 updates. Removing a permission means 50 updates. A developer joins the team — attach 8 policies. A developer leaves — remove 8 policies. With groups: one `Developers` group has 8 policies attached. Adding a new permission is one update that propagates to all 50 developers. A developer joins — one `add-user-to-group` operation. A developer leaves — one removal. The operational difference is enormous at any meaningful team size.

**Three things groups cannot do — each is exam-tested:**

Groups cannot be nested. You cannot put a group inside another group. IAM does not support hierarchical group membership. Each user must be individually added to each group they belong to. If you need layered permissions (e.g., "developers" + "read-only admin" + "billing viewer"), you add the user to three separate groups.

Groups cannot be used as principals in resource-based policies or trust policies. An S3 bucket policy cannot say `"Principal": {"AWS": "arn:aws:iam::123456789012:group/Developers"}`. This is invalid. Only users and roles can be principals. If you want to grant an S3 bucket to "all developers," you either grant it to individual users, grant it to a role that developers can assume, or use resource-based policy conditions that match attributes of the requesting identity.

Groups have no credentials. Groups cannot make API calls and cannot authenticate. They are purely administrative. When a user in a group makes an API call, IAM evaluates the user's policies and the group's policies together — the group does not make the call, the user does.

**A user can belong to up to 10 groups simultaneously.** Effective permissions are the union of all policies attached to the user directly plus all policies attached to all groups they belong to, minus any explicit Deny statements in any of those policies (explicit Deny always wins).

**Recommended group structure:** Organize groups by job function, not by team, project, or location. `Developers`, `ReadOnly`, `OpsEngineers`, `BillingAdmins`, `SecurityAuditors`. This structure maps to how permissions actually vary — a developer in the mobile team and a developer in the backend team likely need the same AWS access, even though they are on different teams. Job-function groups make permissions consistent and auditable.

### IAM Roles: Temporary Credentials for Everything Else

IAM Roles are the correct identity construct for any principal that is not a specific named human with long-term credentials. Roles have two distinct policy components:

**Trust policy** — a resource-based policy document stored on the role that defines who (or what) is allowed to assume this role. The trust policy answers: which principals can call `sts:AssumeRole` on this role and receive temporary credentials? Without a correctly configured trust policy, no one can assume the role regardless of what the permission policies say. The principal in a trust policy can be an AWS service (like EC2 or Lambda), another IAM user or role, an entire AWS account, or an external identity provider.

**Permission policies** — one or more identity-based policies (managed or inline) that define what the role can do once it has been assumed. These work exactly like policies attached to an IAM User. There is no structural difference between a permission policy on a role and a permission policy on a user — the same JSON format, the same evaluation logic, the same IAM actions and resource ARNs.

When a principal assumes a role, AWS STS issues **temporary security credentials** consisting of: a temporary access key ID (starts with `ASIA`), a temporary secret access key, and a session token. All three must be used together — API calls using only the access key ID and secret without the session token will fail. The credentials are valid for a configurable duration (15 minutes minimum; 1 hour default maximum; up to 12 hours when `MaxSessionDuration` is explicitly set on the role). When they expire, the principal must call `sts:AssumeRole` again. This automatic expiry is the core security advantage of roles over users — a leaked temporary credential becomes useless without any manual action required.

**Key role use cases:**

**EC2 instance role (instance profile)** — attach a role to an EC2 instance at launch. The EC2 service assumes the role on behalf of the instance and makes the credentials available through the Instance Metadata Service (IMDS) at `http://169.254.169.254/latest/meta-data/iam/security-credentials/<role-name>`. AWS SDKs check this endpoint automatically as part of the default credential provider chain. No credentials are hardcoded anywhere, and EC2 automatically refreshes the credentials before they expire.

**Lambda execution role** — every Lambda function must have an execution role configured when the function is created. Lambda assumes this role at invocation and injects the temporary credentials into the function's runtime environment. The function's permissions are entirely determined by this role. If a Lambda cannot write to SQS, the execution role is missing `sqs:SendMessage` — not an application code issue.

**Cross-account access** — an IAM user or role in Account A can assume a role in Account B if Account B's role has a trust policy allowing Account A's principal, and Account A's policies allow calling `sts:AssumeRole` with Account B's role ARN. This is the standard pattern for multi-account architectures — a CI/CD pipeline in a tools account can assume deployment roles in dev, staging, and production accounts without needing separate credentials for each.

**Federated access (SAML 2.0 and OIDC)** — external identity providers authenticate users and assert identity attributes. IAM maps those assertions to IAM Roles. The user gets temporary AWS credentials without ever having an IAM User in the account. SAML 2.0 is used for enterprise SSO with Active Directory; OIDC is used for workload identity (GitHub Actions, Kubernetes service accounts).

**Service-to-service access** — ECS task roles, Glue job roles, Step Functions execution roles, CodeBuild service roles. Every AWS service that performs actions on your behalf needs a role. These service roles are the most common type of role in any AWS account and are where least-privilege policy design matters most.

### The Trust Policy: Who Can Assume This Role

The trust policy is the feature of roles that has no equivalent in users or groups. It is a separate JSON document attached to the role that must explicitly permit a principal to call `sts:AssumeRole`. Even if the permission policies are wide open, if the trust policy does not list a principal, that principal cannot assume the role at all.

The `Action` field in a trust policy is almost always one of three values: `sts:AssumeRole` (for IAM users, roles, and AWS accounts), `sts:AssumeRoleWithSAML` (for SAML 2.0 federation), or `sts:AssumeRoleWithWebIdentity` (for OIDC/Web Identity federation including GitHub Actions and Amazon Cognito).

For cross-account trust policies involving third-party services, the `ExternalId` condition is essential — it prevents the "confused deputy" attack where a malicious third party tricks AWS into using your role on behalf of their own customers. The ExternalId is a shared secret between you and the third party, verified as a condition on every role assumption.

## Configuration Reference

### JSON Trust Policy: EC2 Instance Role (Fully Annotated)

```json
{
  // "Version" is the policy language version. Always use "2012-10-17".
  // "2008-10-17" is an older version that lacks support for policy variables
  // and modern condition key syntax. Never use the older version.
  "Version": "2012-10-17",

  "Statement": [
    {
      // "Effect": "Allow" — trust policies almost always Allow.
      // They describe who CAN assume the role, not who is blocked.
      "Effect": "Allow",

      // "Principal" identifies who is allowed to assume this role.
      // In a trust policy, "Principal" is required and identifies the
      // entity that can call sts:AssumeRole on this role.
      //
      // "Service" indicates an AWS service is the principal.
      // "ec2.amazonaws.com" is the EC2 service principal — meaning
      // any EC2 instance that has this role attached can assume it.
      //
      // Other common service principals:
      //   "lambda.amazonaws.com"         — Lambda functions
      //   "ecs-tasks.amazonaws.com"      — ECS tasks (Fargate + EC2 launch type)
      //   "glue.amazonaws.com"           — AWS Glue jobs
      //   "states.amazonaws.com"         — AWS Step Functions
      //   "codebuild.amazonaws.com"      — CodeBuild build projects
      //   "firehose.amazonaws.com"       — Kinesis Data Firehose
      "Principal": {
        "Service": "ec2.amazonaws.com"
      },

      // "Action" in a trust policy specifies which STS action is allowed.
      // "sts:AssumeRole" is for IAM users, roles, and AWS services.
      // For SAML federation: "sts:AssumeRoleWithSAML"
      // For OIDC (GitHub Actions, Cognito): "sts:AssumeRoleWithWebIdentity"
      "Action": "sts:AssumeRole"
    }
  ]
}
```

### JSON Trust Policy: Cross-Account Role with ExternalId (Fully Annotated)

This pattern is used when a role in Account B should be assumable only by a specific principal in Account A, with an ExternalId condition to prevent confused deputy attacks:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",

      // "Principal" for cross-account access uses the "AWS" key.
      // You can reference:
      //   - A specific role ARN (most restrictive — only that role)
      //   - A specific user ARN (only that user)
      //   - An account root ARN (the account can manage which of its own
      //     principals call AssumeRole via IAM policies on the Account A side)
      //
      // Using a specific role ARN is best practice: it limits assumption
      // to only the exact pipeline or automation identity that needs it.
      "Principal": {
        "AWS": "arn:aws:iam::111122223333:role/DeploymentPipeline"
      },

      "Action": "sts:AssumeRole",

      "Condition": {
        // ExternalId is a shared secret string agreed upon between you
        // and the entity (or team) in the trusting account.
        //
        // WHY it matters — the "confused deputy" attack:
        // A malicious SaaS vendor serving multiple AWS customers could trick
        // AWS into assuming YOUR role on behalf of ANOTHER customer's request
        // if there is no external secret. The SaaS vendor knows YOUR role ARN
        // (which may be published or discoverable), but they do not know the
        // ExternalId unless you told them. Without ExternalId, any third party
        // that learns your role ARN could potentially exploit the assumption
        // if they can get AWS to call AssumeRole on their behalf.
        //
        // With ExternalId: only callers that know the secret can assume the role,
        // even if they know the role ARN.
        "StringEquals": {
          "sts:ExternalId": "my-unique-external-id-abc123"
        }
      }
    }
  ]
}
```

### AWS CLI Commands

**Create an IAM user:**
```bash
aws iam create-user --user-name alice
# Returns the user's ARN: arn:aws:iam::123456789012:user/alice
```

**Create console login credentials for a user:**
```bash
aws iam create-login-profile \
  --user-name alice \
  --password "Temp@12345!" \
  --password-reset-required
# --password-reset-required forces the user to change their password on first login
```

**Create programmatic access keys for a user:**
```bash
aws iam create-access-key --user-name alice
# Returns:
# {
#   "AccessKey": {
#     "UserName": "alice",
#     "AccessKeyId": "AKIAIOSFODNN7EXAMPLE",
#     "Status": "Active",
#     "SecretAccessKey": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
#     "CreateDate": "2024-01-15T10:00:00Z"
#   }
# }
# IMPORTANT: The SecretAccessKey is returned ONLY in this response.
# It cannot be retrieved again. Save it immediately and securely.
```

**Create a group:**
```bash
aws iam create-group --group-name Developers
```

**Add a user to a group:**
```bash
aws iam add-user-to-group \
  --user-name alice \
  --group-name Developers
```

**Attach a managed policy to a group:**
```bash
aws iam attach-group-policy \
  --group-name Developers \
  --policy-arn arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess
# arn:aws:iam::aws:policy/ prefix = AWS managed policy
# arn:aws:iam::123456789012:policy/ prefix = your customer managed policy
```

**Create a role with a trust policy file:**
```bash
# First, save your trust policy JSON to a local file, e.g., trust-policy.json
# Then create the role referencing that file:
aws iam create-role \
  --role-name MyEC2S3ReadRole \
  --assume-role-policy-document file://trust-policy.json
# Returns the role's ARN — save it for the attach step below
```

**Attach a permission policy to a role:**
```bash
aws iam attach-role-policy \
  --role-name MyEC2S3ReadRole \
  --policy-arn arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess
```

**Assume a role and receive temporary credentials:**
```bash
aws sts assume-role \
  --role-arn arn:aws:iam::123456789012:role/MyEC2S3ReadRole \
  --role-session-name "deployment-session-20240115"
# Returns:
# {
#   "Credentials": {
#     "AccessKeyId": "ASIAIOSFODNN7EXAMPLE",   <- starts with ASIA (temporary)
#     "SecretAccessKey": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
#     "SessionToken": "FQoGZXIvYXdzEJr...",   <- must be included in all API calls
#     "Expiration": "2024-01-15T11:00:00Z"    <- TTL (default 1 hour)
#   }
# }
# Use these three values as AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY,
# and AWS_SESSION_TOKEN environment variables for subsequent CLI calls.
```

**Get your current caller identity (useful for debugging):**
```bash
aws sts get-caller-identity
# Shows the Account, UserId, and ARN of the identity currently in use
# Essential for confirming which role or user the CLI is acting as
```

### Console: Create an IAM Role for EC2 to Access S3

1. Navigate to **IAM** → left pane → **Roles** → **Create role**
2. **Trusted entity type:** select **AWS service** — this creates a role that an AWS service can assume
3. **Use case dropdown:** select **EC2** — this pre-populates the trust policy with `"Principal": {"Service": "ec2.amazonaws.com"}`
4. Click **Next**
5. In the permissions search box, type `S3ReadOnly` and check **AmazonS3ReadOnlyAccess**
6. Click **Next**
7. **Role name:** enter a descriptive name that identifies the workload and access, e.g., `webserver-s3-readonly`
8. **Description:** document what this role grants and which workload uses it — this helps with future audits
9. Expand **Trust policy** to review the JSON that was auto-generated — confirm it shows `ec2.amazonaws.com` as the service principal
10. Click **Create role**
11. **To attach to an EC2 instance:** EC2 console → select the instance → **Actions** → **Security** → **Modify IAM role** → select `webserver-s3-readonly` → **Update IAM role**
12. The instance can now retrieve credentials from IMDS without any code changes or credential files

**To view the trust relationship on an existing role:**
1. IAM → **Roles** → select any role
2. Click the **Trust relationships** tab
3. The trust policy JSON is displayed — this is the document that controls who can assume the role
4. Click **Edit trust policy** to modify it

## How to Decide

| Scenario | Use | Why |
|---|---|---|
| New human employee needs AWS access (small org, < 5,000 users) | IAM User + IAM Group | Long-term identity; permissions via group membership |
| New human employee needs AWS access (large org, SSO) | IAM Identity Center + role mapping | No IAM users; credentials are federated from corporate IdP |
| EC2 instance needs to call AWS services | IAM Role (instance profile) | Temporary credentials via IMDS; no secrets to manage |
| Lambda function needs to access DynamoDB or S3 | IAM Role (Lambda execution role) | AWS assumes the role at invocation; auto-expiring credentials |
| CI/CD pipeline in GitHub Actions needs to deploy | IAM Role with OIDC trust policy | No long-term keys stored in the pipeline at all |
| Third-party SaaS needs access to your account | IAM Role with ExternalId condition | Scoped, auditable, no long-term key sharing with third party |
| Application running on-premises needs AWS API access | IAM User with access keys (or credential provider via IAM Roles Anywhere) | On-premises cannot use instance metadata; IAM Roles Anywhere extends role-based credentials to on-prem |
| Team of 10 engineers shares the same permission set | IAM Group with customer managed policy | Attach policy once to the group; add users as members |
| Permissions that are tightly coupled to one specific resource | Inline policy on the role | Tied to the resource lifecycle; deleted with the resource |
| Permissions shared across many roles | Customer Managed Policy | Update in one place; propagates to all attached roles |

**The master rule:** Prefer roles over users for any automated or service access. Prefer groups over individual policy attachments for human access. Avoid long-term access keys wherever a role or federation can substitute.

## How This Connects

- **AWS STS (Security Token Service)** — roles are unusable without STS. Every `sts:AssumeRole` call is what converts the trust relationship into actual temporary credentials. STS also provides `GetCallerIdentity` — which tells you exactly which IAM principal is making the current API call — an invaluable debugging tool for permission problems.
- **AWS EC2 Instance Metadata Service (IMDS)** — when a role is attached to an EC2 instance, the instance retrieves credentials from `http://169.254.169.254/latest/meta-data/iam/security-credentials/<role-name>`. The AWS SDK's default credential provider chain checks this endpoint automatically. Understanding IMDS helps you understand why application code running on EC2 can call AWS APIs without any explicit credential configuration.
- **AWS Lambda** — every Lambda function requires an execution role configured at function creation time. Lambda's permissions are entirely defined by that role. Debugging "Lambda cannot write to SQS" means checking whether `sqs:SendMessage` is in the execution role's policies, not the Lambda code itself.
- **AWS IAM Identity Center (formerly SSO)** — the recommended replacement for large-scale IAM User management. IAM Identity Center maps external identity provider groups to IAM Roles, meaning corporate employees authenticate with their existing credentials and get temporary role-based AWS access. The IAM Role mechanism is the same — Identity Center is the front-end that automates the federation.
- **AWS CloudTrail** — every `sts:AssumeRole` call is logged in CloudTrail, including who assumed the role, the source IP, the session name, and the time. Every action taken by that assumed role is also logged, attributed to the role session. This makes role usage fully auditable and is a core reason roles are preferred over shared IAM Users — with shared credentials you cannot tell which person took a given action, but with role session names set to include the caller's identity you can.

## Exam Traps

1. **Groups cannot be principals.** A trust policy or resource-based policy cannot reference a group as a principal. `"Principal": {"AWS": "arn:aws:iam::123456789012:group/Developers"}` is invalid. Only users and roles can be principals. This is one of the most common incorrect answer choices on exam questions about S3 bucket policies and cross-account access.

2. **IAM Groups cannot contain other groups.** Nested groups are not supported. A question implying a group-of-groups model is describing something IAM does not support at all. Each user must be individually added to each group. If you need hierarchical permissions, model them with multiple group memberships on the same user.

3. **Roles do not have usernames or passwords.** Roles cannot log in to the console directly — they are assumed, not logged into. Federated users can assume a role and access the console via the federation flow, but the role itself has no login credentials. A question asking "how does an IAM Role log in to the console" is a trap.

4. **Attaching a role to an EC2 instance is automatic credential management, not manual.** When you attach an IAM Role to an EC2 instance, EC2 handles the full assume-role flow automatically and refreshes credentials before they expire. The application just reads from IMDS. This is fundamentally different from a developer manually running `aws sts assume-role` from a terminal — that generates one-time temporary credentials that must be refreshed manually.

5. **The 5,000 IAM User default limit can technically be raised via Service Quotas, but this is not the right architectural path.** For user counts approaching or exceeding 5,000 — or any organization with more than a handful of human users — the architecture must shift to IAM Identity Center with external identity provider federation. Exam questions about large-scale human access to AWS should point to federation, not IAM Users or quota increases.

## Summary

- IAM Users are long-term identities for humans or legacy applications; they carry username/password and/or access key credentials that do not expire automatically and must be actively managed and rotated.
- IAM Groups are administrative collections of users where policies attached to the group immediately apply to all members; groups cannot be nested, cannot make API calls, and cannot be referenced as principals.
- IAM Roles are the preferred identity construct for any non-human access; they issue temporary, auto-expiring credentials via STS and carry no long-term secrets that can leak or need rotation.
- Every role has two policy components that must both be correct: the trust policy (who can assume the role) and permission policies (what the role can do once assumed).
- The default IAM User limit is 5,000 per account (raiseable via Service Quotas, but not the right architectural answer); organizations needing scalable human AWS access should use IAM Identity Center with external identity provider federation.
- The architecture principle to internalize: roles for services and automation, users for humans at small scale or specific legacy integrations, groups to manage human permissions without per-user policy maintenance overhead.

## Examples

**Beginner:** A ten-person SaaS startup onboards a new backend engineer. Rather than attaching five separate policies to a new IAM User individually, the platform lead creates the user, adds them to the existing `BackendEngineers` IAM Group, and the engineer immediately inherits access to CodeCommit, ECR, CloudWatch Logs, the dev S3 bucket, and the dev DynamoDB table — all defined by the group's policies. Six months later the engineer transitions to a part-time consulting role. The platform lead removes them from `BackendEngineers`, adds them to `ReadOnly`. All production write access disappears instantly. No individual policy attachments to hunt down and remove. This is the group model functioning correctly — permissions live on groups, people live on users, group membership is the only lever that needs to change.

**Intermediate:** A production Lambda function processes payment records, reading from a DynamoDB table and writing results to an SQS queue. The team creates a role called `payment-processor-lambda-role` with a trust policy allowing `lambda.amazonaws.com` to assume it. They attach two permission policies: `dynamodb:GetItem` and `dynamodb:Query` scoped to the payments table ARN, and `sqs:SendMessage` scoped to the orders queue ARN. No wildcard resources, no wildcard actions. The Lambda execution role is configured on the function. At invocation, Lambda assumes the role, receives temporary STS credentials, and the function accesses DynamoDB and SQS using those credentials injected into the runtime environment. No access keys exist anywhere in the codebase, configuration, or environment variables. No rotation is required. This is the canonical demonstration of why roles exist.

**Advanced:** A 1,200-person company uses Microsoft Active Directory for employee identity. Rather than creating IAM Users for each employee, the platform team configures SAML 2.0 federation between AD FS (Active Directory Federation Services) and AWS IAM. A SAML assertion attributes map AD group memberships to five IAM Roles: `ReadOnly`, `Developer`, `OpsEngineer`, `SecurityAuditor`, `Billing`. When an engineer changes teams, their AD group membership changes — their AWS role mapping changes automatically. When an employee leaves, disabling their AD account immediately revokes all AWS access. STS credentials in active sessions expire within the session duration configured on each role (1-8 hours). The result: 1,200 AWS-capable employees, zero IAM Users, and all offboarding handled by the existing HR→AD workflow with no AWS-side steps required. This is federation and roles working together at enterprise scale.

## Think About It

1. Groups cannot be nested in IAM, but systems like Active Directory support nested group membership extensively. What specific problems might nested groups introduce in an authorization evaluation system, and why might AWS have deliberately excluded them from the IAM design?
2. Roles issue temporary credentials that expire automatically — but for a long-running EC2 instance operating for months, those credentials expire every hour. What mechanism ensures the application always has valid credentials without any manual intervention, and where in the technology stack does that renewal happen?
3. If a user belongs to three groups where Group A allows an action, Group B allows the same action with a different resource scope, and Group C explicitly denies that action on all resources — what is the effective permission? What does this tell you about where explicit Deny statements in group policies can cause unexpected lockouts?
4. The `ExternalId` condition in a cross-account trust policy protects against the "confused deputy" attack. Who is the "confused deputy" in this scenario, what specifically are they confused about, and why does a shared secret in the condition prevent the attack even if the role ARN is publicly known?
5. A developer wants to give a Lambda function access to S3. Option A: create an IAM User with an access key and pass it as a Lambda environment variable. Option B: create an IAM Role and attach it as the Lambda execution role. Both work technically. Why is Option A a security anti-pattern even if Lambda encrypts environment variables at rest?

## Quick Check

**Q1.** Which of the following statements about IAM Groups is correct?

- A) IAM Groups can contain other IAM Groups (nested groups are supported)
- B) Policies attached to a group apply only to group members who have been active in the last 30 days
- C) IAM Groups can only contain IAM Users — not Roles — and cannot be used as principals in policies
- D) IAM Groups can be referenced as principals in S3 bucket policies to grant bucket access

**Answer: C** — IAM Groups contain only IAM Users (not Roles), cannot be nested, and cannot be referenced as principals in resource-based policies or trust policies. Groups are purely administrative containers used to simplify permission management. They have no credentials and cannot make API calls.

**Q2.** A developer needs to grant an EC2 instance permission to read from an S3 bucket without storing credentials anywhere in the application or its configuration. What is the correct approach?

- A) Create an IAM User with an access key and store it in an EC2 user data script that runs at boot
- B) Attach an IAM Role with the required S3 permissions to the EC2 instance as an instance profile
- C) Add the EC2 instance to an IAM Group that has S3 read permissions attached
- D) Use the root account access key stored in AWS Secrets Manager and retrieved at application startup

**Answer: B** — IAM Roles attached to EC2 instances provide temporary credentials through the instance metadata service at `169.254.169.254`. The AWS SDK retrieves these automatically. No long-term credentials are stored, managed, or rotated manually. The temporary credentials refresh before expiration without any application code changes.

**Q3.** What is the purpose of the trust policy on an IAM Role?

- A) It defines which AWS API actions the role is permitted to perform
- B) It specifies the maximum session duration for the temporary credentials
- C) It defines which principals are allowed to assume the role via `sts:AssumeRole`
- D) It lists the AWS Regions where the role's permissions are valid

**Answer: C** — The trust policy (the assume-role policy document) is a resource-based policy attached to the role that specifies which principals — AWS services, IAM users, roles, AWS accounts, or external identity providers — can call `sts:AssumeRole` on this role to receive temporary credentials. The permission policies separately define what the role can do once assumed. Both must be correctly configured for a role to work as intended.

## What's Next

Next: IAM Policies and JSON Structure — the complete breakdown of policy document syntax, evaluation logic, the S3 dual-ARN pattern, and how to write policies that do exactly what you intend.
