---
title: "IAM Policies and JSON Structure"
type: content
estimated_minutes: 18
cert_tags: ["CLF-C02", "SAA-C03", "SOA-C02", "DVA-C02"]
---

# IAM Policies and JSON Structure

## Overview

IAM Policies are the mechanism through which every AWS authorization decision is made. A policy is a JSON document that specifies what actions are permitted or denied, on which resources, under what conditions, and by whom. Every permission in AWS — whether a developer can launch an EC2 instance, whether an application can write to an S3 bucket, whether a Lambda function can publish to SNS — is ultimately expressed as a policy statement evaluated by IAM. If you cannot read and write policy JSON fluently, you cannot design, troubleshoot, or audit IAM permissions effectively. Policy JSON is not optional knowledge for any AWS practitioner above the introductory level.

The policy language is precise and unforgiving. Small mistakes — a trailing slash in an ARN, a missing resource element, using the wrong condition operator, or confusing object-level and bucket-level S3 ARNs — result in either too much access (a security problem) or access failures that are hard to diagnose from error messages alone. Understanding not just what each field does but why it is designed that way is the foundation for writing policies that do exactly what you intend, and for reading policies you did not write and immediately understanding their intent and potential gaps.

There are multiple types of policies in AWS IAM — identity-based, resource-based, managed, inline, permission boundaries, session policies, and SCPs — and they interact with each other through a defined evaluation logic that is frequently tested on every AWS certification. The most important rule to internalize is: explicit Deny wins over everything, explicit Allow grants access only when no Deny applies, and the default outcome when no policy says anything is implicit deny. AWS denies by default. You grant access; you do not grant denial. Understanding this ordering prevents a category of IAM design mistakes where people rely on "not granting" something to prevent access, not realizing that a policy elsewhere may already grant it.

## Core Concepts

### The Seven Fields of a Policy Statement

Every IAM policy document is a JSON object with a `Version` string and a `Statement` array. Each element in `Statement` is an independent permission statement. Seven fields can appear in a statement — some required, some optional:

**Version** — Always `"2012-10-17"`. This is the current and only version of the IAM policy language you should use. The older `"2008-10-17"` version lacks support for policy variables (`${aws:username}` etc.) and modern condition keys. It is not a date you choose based on when you are writing the policy — it is a required literal string that tells IAM which grammar to use. Always include it. Always use `2012-10-17`.

**Sid (Statement ID)** — Optional, but strongly recommended. A human-readable identifier for the statement within the policy, unique within that policy document. Convention: use descriptive PascalCase names that explain the statement's purpose — `"AllowS3ReadOnReportsBucket"`, `"DenyDeleteWithoutMFA"`, `"AllowCloudWatchLogsForLambda"`. Sids appear in AWS CloudTrail access denied logs, which means a well-named Sid immediately tells you in the audit trail which specific statement was the authorization decision. Invest the 10 seconds to write a useful Sid.

**Effect** — Required. Either `"Allow"` or `"Deny"`. Nothing else. The default for every action in AWS is implicit deny — AWS blocks everything not explicitly permitted. An explicit `"Deny"` overrides any `"Allow"` in any policy anywhere in the evaluation chain. This asymmetry is intentional: Deny is the safe failure mode.

**Principal** — Required only in resource-based policies (S3 bucket policies, SQS queue policies, KMS key policies, Lambda resource policies) and trust policies attached to roles. Specifies which IAM entity the statement applies to. Absent in identity-based policies (policies attached to users, groups, or roles), because the attached identity is implicitly the principal. Principals can be IAM users (`arn:aws:iam::123456789012:user/alice`), IAM roles (`arn:aws:iam::123456789012:role/MyRole`), AWS accounts (`arn:aws:iam::123456789012:root`), AWS services (`ec2.amazonaws.com`), or `"*"` (anyone — use with extreme caution, typically only on non-sensitive public resources).

**Action** — Required. The specific AWS API operations covered by this statement. Format is `"service:OperationName"` matching the AWS API exactly — `"s3:GetObject"`, `"ec2:RunInstances"`, `"iam:CreateUser"`, `"dynamodb:PutItem"`. Case convention is mixed case matching the API, though IAM evaluation is case-insensitive. Wildcards are supported: `"s3:*"` matches every S3 operation; `"s3:Get*"` matches every operation starting with Get. You can also use an array for multiple specific actions: `["s3:GetObject", "s3:PutObject"]`. For Deny statements, `NotAction` is sometimes used to deny everything except a list of allowed actions.

**Resource** — Required in most contexts. The ARN (Amazon Resource Name) of the resource the action applies to. `"*"` matches all resources and should be used only when the action is truly resource-independent (e.g., `iam:ListUsers` has no specific resource scope). Scoping the Resource field to a specific ARN — `arn:aws:s3:::my-bucket/*` instead of `"*"` — is one of the most impactful practices in least-privilege design. An overly broad resource scope is the most common form of excess permission in real-world IAM policies.

**Condition** — Optional but powerful. Additional constraints that must all be true for the statement to apply. Conditions evaluate context variables populated at request time — the requester's IP address, whether MFA was used during authentication, the current Region being targeted, the tags on the resource, the tags on the principal, the current time, the requested instance type, and dozens of service-specific keys. Conditions are how you create access control that responds to context, not just identity.

### Policy Types: AWS Managed, Customer Managed, and Inline

**AWS Managed Policies** are pre-built policies created and maintained by AWS. They live in a shared namespace (`arn:aws:iam::aws:policy/<PolicyName>` — note the empty account ID segment, indicating AWS ownership) and cover standard use cases: `AdministratorAccess`, `ReadOnlyAccess`, `AmazonS3FullAccess`, `AmazonEC2ReadOnlyAccess`, `AWSLambdaBasicExecutionRole`. A key property: AWS updates managed policies when new services and features launch, so `AmazonS3FullAccess` will cover new S3 API actions as they are introduced without any action on your part. Useful for getting started and for well-known access patterns. Not appropriate for production workloads that require precise least-privilege scoping.

**Customer Managed Policies** are policies you create and own within your account. They have their own versioned ARN (`arn:aws:iam::<account-id>:policy/<PolicyName>`), can be attached to multiple users, groups, and roles simultaneously, and support up to five version history entries — you can update a policy and roll back to a previous version if needed. When you update a customer managed policy, the change propagates immediately to every identity it is attached to. This makes customer managed policies the correct tool for production permission management: they give you precise control, version history, and the ability to make cross-role changes in a single operation.

**Inline Policies** are embedded directly inside a single user, group, or role — they have no standalone existence. If you delete the user or role, the inline policy is deleted with it. Inline policies cannot be attached to a second identity; they exist only within one. This tight coupling makes them appropriate for permissions that are genuinely unique to a single identity and should not be reused, and for permissions that must be deleted when the owning resource is deleted. In practice, inline policies have two significant disadvantages: they do not appear in the IAM Policies list (making audits harder), and they must be updated one at a time rather than propagating changes across attached identities. Use them sparingly and intentionally.

### Policy Evaluation Logic: Explicit Deny Wins

When an IAM principal makes an API request, IAM evaluates all applicable policies simultaneously using a strict priority ordering:

**Step 1 — Explicit Deny** — If any applicable policy — whether an identity-based policy, a resource-based policy on the target resource, a permission boundary, or an SCP from Organizations — explicitly Denies the requested action, the request is denied immediately and permanently. No other policy can override an explicit Deny. This is the most important rule in IAM evaluation.

**Step 2 — SCPs from Organizations** — In AWS Organizations, Service Control Policies are evaluated as a ceiling on permissions. Even if Step 1 found no explicit Deny, if the SCP does not permit the action (either through an explicit Allow with SCP Allow-list mode, or an implicit restriction via Deny-list mode), access is denied. SCPs are evaluated before IAM identity policies for the effective permission calculation.

**Step 3 — Permission Boundaries** — If a permission boundary is attached to the principal, the effective permissions are the intersection of the identity policies and the boundary. The boundary sets the maximum; identity policies fill in what is actually permitted below the maximum.

**Step 4 — Explicit Allow** — If no Deny applies and no boundary blocks it, and any applicable policy explicitly Allows the requested action on the requested resource, the request is permitted.

**Step 5 — Implicit Deny (the default)** — If no policy explicitly Allows the action, the request is denied. This is the default state for every action in AWS. You are not starting from "allowed everything" and restricting down; you are starting from "allowed nothing" and explicitly granting upward.

**Cross-account access note:** For requests that cross account boundaries (Account A principal accessing Account B resource), both the IAM policy in Account A must allow the action AND the resource-based policy in Account B must allow Account A's principal. Both sides must permit; either side's deny blocks.

### The S3 Dual-ARN Pattern: Why Both ARNs Are Required

S3 has a quirk that trips up almost every IAM practitioner at least once. There are two fundamentally different types of S3 resources, each with a distinct ARN format:

- **The bucket itself**: `arn:aws:s3:::my-bucket` — note: no region, no account ID (S3 bucket names are globally unique)
- **Objects inside the bucket**: `arn:aws:s3:::my-bucket/*` — the `/*` means "all objects within the bucket"

S3 API operations are divided into bucket-level operations and object-level operations, and they require the corresponding ARN type:

- **Bucket-level actions** (`s3:ListBucket`, `s3:GetBucketLocation`, `s3:GetBucketVersioning`, `s3:CreateBucket`, `s3:DeleteBucket`) — must reference the bucket ARN: `arn:aws:s3:::my-bucket`
- **Object-level actions** (`s3:GetObject`, `s3:PutObject`, `s3:DeleteObject`, `s3:GetObjectVersion`) — must reference the object ARN: `arn:aws:s3:::my-bucket/*`

The most common mistake: writing a policy that allows `s3:GetObject` with `Resource: "arn:aws:s3:::my-bucket"`. The ARN targets the bucket resource. `s3:GetObject` is an object-level action. The ARNs don't match in scope — no object in the bucket is matched by the bucket ARN alone. The policy evaluates and finds no applicable Allow, so access is denied with an `AccessDenied` error. The fix: add `/*` to make it `arn:aws:s3:::my-bucket/*`.

The equally common inverse mistake: writing `s3:ListBucket` with `Resource: "arn:aws:s3:::my-bucket/*"`. `ListBucket` operates on the bucket, not on objects. The `/*` ARN matches object resources, not the bucket itself. Correct resource for `ListBucket` is `arn:aws:s3:::my-bucket` without the `/*`.

A correct minimal read policy for S3 always requires two separate statements with two different ARNs.

### Condition Blocks: Context-Aware Access Control

The `Condition` element adds context constraints to a policy statement. A statement with a Condition applies only when all conditions evaluate to true. Multiple conditions within a single operator are ANDed (all must be true). Multiple condition operators in the same Condition block are also ANDed. Multiple values within a single condition key are ORed (any value matching is sufficient).

**Common condition operators:**
- `StringEquals` — exact string match (case sensitive)
- `StringLike` — wildcard string match (`*` and `?`)
- `ArnEquals` / `ArnLike` — ARN comparison (ArnLike supports wildcards)
- `IpAddress` — CIDR range match for IP addresses
- `Bool` — boolean comparison (evaluates only when the key is present)
- `BoolIfExists` — boolean comparison that also applies when the key is absent (treating absence as false)
- `DateGreaterThan` / `DateLessThan` — time-based conditions
- `NumericEquals` / `NumericLessThan` — numeric comparison
- `Null` — checks whether a condition key is present or absent

**Common condition keys used in IAM:**
- `aws:MultiFactorAuthPresent` — boolean, whether MFA was used in the current session
- `aws:SourceIp` — the IP address of the requester (useful for locking down access to known office IPs)
- `aws:RequestedRegion` — the AWS Region the API call is targeting (useful for restricting to approved Regions)
- `aws:PrincipalTag/<key>` — a tag on the IAM principal (enables attribute-based access control, ABAC)
- `aws:ResourceTag/<key>` — a tag on the resource being accessed
- `aws:CalledVia` — the AWS service that called the API on behalf of a principal (e.g., CloudFormation)
- `s3:prefix` — the S3 object key prefix being listed
- `ec2:InstanceType` — the instance type in an EC2 RunInstances request

**The `BoolIfExists` pattern for MFA enforcement** is critically important and frequently tested. `Bool` evaluates the condition only when the key exists in the request context. For some credential types (temporary credentials from role assumptions by AWS services), `aws:MultiFactorAuthPresent` is absent from the context entirely — not false, just missing. A `Bool` condition checking for `false` would not fire because the key is not present, leaving the Deny ineffective. `BoolIfExists` catches both "explicitly false" and "absent from context" as the same condition match, correctly blocking any session that lacks MFA context.

## Configuration Reference

### Policy Example A: Minimal Read-Only S3 Policy (Annotated)

This is the smallest correct policy for reading from a specific S3 bucket. Every field is annotated to explain the reason for that value:

```json
{
  // Required. Always "2012-10-17" — the current policy language version.
  // This is not a date you set; it is the grammar version IAM uses to parse this document.
  "Version": "2012-10-17",

  "Statement": [
    {
      // Sid is optional but strongly recommended.
      // Descriptive names appear in CloudTrail access denied logs,
      // making it immediately clear which statement made the decision.
      "Sid": "AllowListBucketContents",

      "Effect": "Allow",

      // s3:ListBucket allows the principal to list the objects in the bucket
      // (the equivalent of running `aws s3 ls s3://my-data-bucket`).
      // This is a BUCKET-LEVEL action — it requires the BUCKET ARN below.
      // Common mistake: listing action with object ARN (/* suffix) — it won't work.
      "Action": "s3:ListBucket",

      // The bucket ARN: arn:aws:s3:::<bucket-name>
      // Note: NO region, NO account ID in S3 ARNs — bucket names are globally unique.
      // Note: NO trailing /* — this ARN targets the bucket itself, not its objects.
      // s3:ListBucket operates on the bucket, not on objects.
      "Resource": "arn:aws:s3:::my-data-bucket"
    },
    {
      "Sid": "AllowGetObjectFromBucket",

      "Effect": "Allow",

      // s3:GetObject retrieves individual object contents (download a file).
      // This is an OBJECT-LEVEL action — it requires the OBJECT ARN with /* suffix.
      // Common mistake: GetObject with just the bucket ARN (no /*) — it won't work.
      "Action": "s3:GetObject",

      // The object ARN: arn:aws:s3:::<bucket-name>/*
      // The /* wildcard means "any object key within the bucket".
      // To restrict to a specific prefix: arn:aws:s3:::my-data-bucket/reports/*
      // Without the /*, this statement targets the bucket resource — not objects.
      "Resource": "arn:aws:s3:::my-data-bucket/*"
    }
  ]
}
```

### Policy Example B: Production Policy with Allow, Restrict by Prefix, and Explicit Deny Without MFA

This realistic policy grants read/write access to a specific S3 prefix, restricts ListBucket to that prefix, and explicitly denies all access when MFA is not present:

```json
{
  "Version": "2012-10-17",

  "Statement": [
    {
      // Statement 1: Allow listing the bucket — but only the "reports/" prefix.
      // Without the s3:prefix Condition, the principal could list ALL prefixes
      // in the bucket, exposing the names of other data directories even if
      // they cannot access the objects themselves. The prefix condition prevents this.
      "Sid": "AllowListReportsPrefix",
      "Effect": "Allow",
      "Action": "s3:ListBucket",
      "Resource": "arn:aws:s3:::financial-records",
      "Condition": {
        // StringLike supports wildcards (*) in values.
        // "reports/*" matches any object key starting with "reports/"
        // including "reports/2024/q1.csv", "reports/archive/old.csv", etc.
        "StringLike": {
          "s3:prefix": ["reports/*", "reports/"]
          // "reports/" (without wildcard) is needed to allow listing
          // the top-level "reports/" directory entry itself.
        }
      }
    },

    {
      // Statement 2: Allow read/write on objects under the "reports/" prefix.
      // Array syntax for Action allows multiple operations in one statement.
      "Sid": "AllowReportsObjectReadWrite",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",      // Download / read objects
        "s3:PutObject",      // Upload / create objects
        "s3:GetObjectVersion" // Read a specific version (if versioning enabled)
        // Deliberately NOT including s3:DeleteObject — omitting it means the
        // principal cannot delete, without needing an explicit Deny.
        // This is fine for read/write use cases that don't need delete.
      ],
      // ARN scoped to the reports/ prefix — only objects under reports/ are permitted.
      // Objects in other prefixes (e.g., financial-records/raw/) are not covered.
      "Resource": "arn:aws:s3:::financial-records/reports/*"
    },

    {
      // Statement 3: Explicit Deny — blocks ALL S3 access to this bucket
      // when the session does not have MFA context.
      //
      // The Deny overrides the Allow statements above.
      // Explicit Deny ALWAYS beats Explicit Allow in IAM evaluation.
      // A user authenticated without MFA will be denied by this statement
      // regardless of what Statements 1 and 2 say.
      "Sid": "DenyBucketAccessWithoutMFA",
      "Effect": "Deny",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket",
        "s3:GetObjectVersion",
        "s3:PutObjectAcl"
        // Explicitly listing actions is safer than using "s3:*" in a Deny statement.
        // Using "s3:*" in a Deny would also block MFA setup-related actions if any
        // future S3 API calls are added to the MFA setup flow.
      ],
      "Resource": [
        // Both the bucket and the objects must be listed in a Deny
        // that covers both bucket-level and object-level actions.
        "arn:aws:s3:::financial-records",
        "arn:aws:s3:::financial-records/*"
      ],
      "Condition": {
        // BoolIfExists is the CORRECT operator for MFA enforcement.
        //
        // Why NOT "Bool"?
        // "Bool" evaluates ONLY when the condition key exists in the request context.
        // For credentials issued by sts:AssumeRole from an AWS service (e.g., Lambda,
        // ECS), "aws:MultiFactorAuthPresent" is absent from the context entirely.
        // A plain "Bool" condition would NOT fire for absent keys —
        // the Deny would silently not apply, leaving access open.
        //
        // Why "BoolIfExists"?
        // "BoolIfExists" also fires when the key is ABSENT, treating absence as "false".
        // Result: ANY session lacking MFA context is denied — including sessions
        // where MFA was never part of the auth flow (absent key) AND sessions
        // where MFA was explicitly not used (key present but set to "false").
        "BoolIfExists": {
          "aws:MultiFactorAuthPresent": "false"
        }
      }
    }
  ]
}
```

### Policy Example C: Explicit Deny and the "Force MFA Setup" NotAction Pattern

When you want to block all access until a user registers their MFA device, but you also need to allow the MFA setup actions themselves:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      // This single Deny statement blocks everything EXCEPT the listed MFA setup actions.
      // "NotAction" is the inverse of "Action" — the Deny applies to everything
      // NOT in this list. The listed actions are explicitly exempted from the Deny.
      //
      // Why these specific actions?
      // iam:CreateVirtualMFADevice — creates the MFA seed and QR code
      // iam:EnableMFADevice        — associates the MFA device with the user account
      // iam:GetUser                — allows the user to see their own user details
      // iam:ListMFADevices         — shows currently enrolled MFA devices
      // iam:ListVirtualMFADevices  — lists virtual MFA devices (for finding their ARN)
      // iam:ResyncMFADevice        — resyncs a drifted TOTP device without full re-enrollment
      // sts:GetSessionToken        — needed to get temporary credentials with MFA context
      //
      // Without these exceptions: a user who hasn't set up MFA yet would be
      // completely locked out — denied even the actions needed to register MFA.
      // That creates a chicken-and-egg deadlock that requires admin intervention to resolve.
      "Sid": "DenyAllExceptMFASetupWhenMFAAbsent",
      "Effect": "Deny",
      "NotAction": [
        "iam:CreateVirtualMFADevice",
        "iam:EnableMFADevice",
        "iam:GetUser",
        "iam:ListMFADevices",
        "iam:ListVirtualMFADevices",
        "iam:ResyncMFADevice",
        "sts:GetSessionToken"
      ],
      "Resource": "*",
      "Condition": {
        "BoolIfExists": {
          "aws:MultiFactorAuthPresent": "false"
        }
      }
    }
  ]
}
```

### AWS CLI Policy Commands

**Create a customer managed policy from a JSON file:**
```bash
# Save the policy JSON to a file first (e.g., policy.json)
aws iam create-policy \
  --policy-name financial-records-reports-readwrite \
  --policy-document file://policy.json \
  --description "Read/write access to financial-records S3 bucket reports/ prefix. MFA required."
# Returns: PolicyArn — save this for the attach command
# Example: arn:aws:iam::123456789012:policy/financial-records-reports-readwrite
```

**Attach the customer managed policy to a role:**
```bash
aws iam attach-role-policy \
  --role-name DataAnalystRole \
  --policy-arn arn:aws:iam::123456789012:policy/financial-records-reports-readwrite
```

**Attach an AWS managed policy to a group:**
```bash
aws iam attach-group-policy \
  --group-name ReadOnlyUsers \
  --policy-arn arn:aws:iam::aws:policy/ReadOnlyAccess
# arn:aws:iam::aws:policy/ prefix identifies an AWS managed policy (empty account ID)
```

**List all policies attached to a specific role:**
```bash
aws iam list-attached-role-policies --role-name DataAnalystRole
# Returns each attached policy's name and ARN
```

**Simulate a policy to test whether a principal can perform an action:**
```bash
aws iam simulate-principal-policy \
  --policy-source-arn arn:aws:iam::123456789012:role/DataAnalystRole \
  --action-names s3:GetObject \
  --resource-arns arn:aws:s3:::financial-records/reports/q1-2024.csv
# Returns: "allowed" or "denied", and which specific statement was determinative
# Invaluable for debugging without needing to make real API calls
```

**View the current JSON of a specific policy version:**
```bash
aws iam get-policy-version \
  --policy-arn arn:aws:iam::123456789012:policy/financial-records-reports-readwrite \
  --version-id v1
# Returns the full policy document JSON for that version
```

**List all versions of a customer managed policy:**
```bash
aws iam list-policy-versions \
  --policy-arn arn:aws:iam::123456789012:policy/financial-records-reports-readwrite
# IAM retains up to 5 versions per customer managed policy
```

### Console Navigation

**To create a customer managed policy:**
1. IAM → left pane → **Policies** → **Create policy**
2. Select the **JSON** tab (strongly preferred over the visual editor — gives full control and is what you will use in production)
3. Paste your policy document, click **Next**
4. Enter a descriptive **Policy name** and **Description** explaining what it grants and why
5. Click **Create policy**
6. The new policy now appears in your Policies list and can be attached to any user, group, or role

**To use the IAM Policy Simulator (test without real API calls):**
1. IAM → left pane → **Policy Simulator** (near the bottom of the navigation)
2. Select a user, group, or role from the dropdown
3. Select the AWS service and specific action to test
4. Optionally specify a Resource ARN to test against
5. Click **Run simulation** — the result shows allowed or denied, and which policy statement was the deciding factor
6. The simulator evaluates all policies attached to the selected principal, including permission boundaries and SCPs

**To view policies attached to a role:**
1. IAM → **Roles** → select the role
2. **Permissions** tab shows all attached policies (managed and inline) with their type and ARN
3. Click the arrow next to any policy to see a summary; click the policy name to view its full JSON
4. **Trust relationships** tab shows the trust policy (who can assume this role)

## How to Decide

| Decision | Recommendation |
|---|---|
| Permissions needed by many roles and users | Customer Managed Policy — attach to all, update centrally in one place |
| Permissions unique to one identity, coupled to its lifecycle | Inline Policy — tied to that resource; deleted with it |
| Well-known, standard access patterns (ReadOnly, S3Full) | AWS Managed Policy — pre-built, tested, maintained by AWS |
| Restricting S3 object access | Bucket ARN for ListBucket; object ARN with /* for GetObject/PutObject |
| Protecting sensitive data behind MFA | Explicit Deny + `BoolIfExists: aws:MultiFactorAuthPresent: false` |
| Locking down access to specific S3 prefix | StringLike condition on s3:prefix for ListBucket; scoped ARN on object actions |
| Denying one specific action while allowing everything else | Explicit Deny on that action — Deny wins over any Allow, no exceptions |
| Granting a role admin access (break-glass) | AWS Managed `AdministratorAccess` — document, monitor, restrict assumption heavily |
| Capping what developer-created roles can grant | Permission Boundary managed policy on all developer-created roles |
| Testing whether a policy works before deployment | IAM Policy Simulator (`simulate-principal-policy`) |

## How This Connects

- **AWS STS** — condition keys like `aws:MultiFactorAuthPresent` and `sts:ExternalId` are populated by STS when sessions are created. The `aws:MultiFactorAuthPresent` key is only present for IAM user console sessions and `sts:GetSessionToken` calls — its absence from role session context is why `BoolIfExists` is required for MFA enforcement.
- **Amazon S3** — S3 uses both identity-based IAM policies and resource-based bucket policies. For same-account access, either the IAM policy OR the bucket policy can grant access (and neither can explicitly deny). For cross-account access, BOTH must allow. The bucket policy and IAM policy are evaluated together, and the dual-ARN pattern is required in both.
- **AWS Organizations SCPs** — SCPs use the exact same JSON policy language syntax as IAM policies but function as a ceiling on permissions rather than a grant. Mastering IAM policy JSON means you can also read, write, and debug SCPs without learning a separate language.
- **AWS CloudTrail** — when an access denial occurs, CloudTrail captures an `errorCode: "AccessDenied"` event that includes the ARN of the principal, the action attempted, the resource ARN, and the AWS account. The `requestParameters` and `errorMessage` fields often reveal which policy or which condition caused the denial. Well-named policy Sids appear in these error messages.
- **AWS Config** — Config rules can continuously monitor whether IAM policies comply with organizational standards: no policies granting `Action: "*"` on `Resource: "*"`, all roles have permission boundaries, no wildcard Principals in resource policies. Config monitors the policy state continuously, while Policy Simulator tests specific scenarios on demand. Both are needed for a comprehensive governance posture.

## Exam Traps

1. **The S3 dual-ARN pattern.** This is the single most common IAM policy question pattern on every AWS exam. `s3:GetObject` with a bucket ARN (no `/*`) does not work — object actions need the object ARN. `s3:ListBucket` with an object ARN (`/*`) does not work — bucket actions need the bucket ARN. Exam questions will show "the policy looks right but access fails" — always check whether the ARN type matches the action type.

2. **Explicit Deny cannot be overridden by any Allow.** No matter how many Allow statements exist in other policies, a single Deny in any applicable policy blocks the request permanently. Questions will present scenarios with a user in two groups — Group A allows the action, Group B denies it — and ask for the effective permission. Answer: Denied. Always. Without exception.

3. **`Bool` vs `BoolIfExists` for MFA enforcement.** `Bool` fires only when the condition key exists. For credentials that don't set `aws:MultiFactorAuthPresent` (like role sessions from services), the key is absent and `Bool` would not trigger — the Deny silently does not apply. `BoolIfExists` also fires when the key is absent, treating absence as false. Use `BoolIfExists` for MFA enforcement, not `Bool`. The exam tests this distinction explicitly.

4. **Inline policies are not visible in the IAM Policies list.** If you navigate to IAM → Policies, inline policies do not appear there — they are embedded inside the user, group, or role. A question asking "how do you view all policies that apply to a role" — the answer must include checking the role's Permissions tab directly, which shows both managed and inline policies attached to that role.

5. **AWS Managed Policies update automatically; Customer Managed Policies do not unless you update them.** `AmazonS3FullAccess` (AWS Managed) will cover new S3 API actions automatically as AWS releases them. A customer managed policy listing specific S3 actions will not cover new actions until you manually update it. However, a customer managed policy using `s3:*` as the action wildcard will cover new S3 actions automatically because the wildcard matches any `s3:` prefixed API call.

## Summary

- Every IAM policy statement has up to seven fields: Version (always `2012-10-17`), Sid (optional identifier), Effect (Allow or Deny), Principal (resource-based policies only), Action (service:OperationName), Resource (ARN or `*`), and Condition (optional context constraints).
- Evaluation order is strict: explicit Deny wins unconditionally, then SCPs cap permissions, then permission boundaries cap permissions, then explicit Allow grants access, and the default is implicit Deny — AWS denies everything not explicitly permitted.
- S3 requires two separate ARN formats in the same read policy: the bucket ARN (`arn:aws:s3:::bucket-name`) for `s3:ListBucket`, and the object ARN with `/*` (`arn:aws:s3:::bucket-name/*`) for `s3:GetObject` and `s3:PutObject` — confusing them produces access denied errors that are not obvious from the error message alone.
- `BoolIfExists` with `aws:MultiFactorAuthPresent: false` is the correct condition operator for enforcing MFA — `Bool` would not fire for sessions where the MFA key is absent from the context, leaving the Deny ineffective for service-issued credentials.
- Customer Managed Policies are the right tool for production permission management: standalone, reusable across many identities, versioned, and centrally updatable. Inline policies should be rare and intentional.
- Condition blocks enable context-aware access control — restricting access by IP, MFA status, Region, time of day, resource tags, principal tags, and dozens of service-specific keys — giving IAM policies the ability to express sophisticated, context-sensitive authorization logic.

## Examples

**Beginner:** A startup developer writes their first IAM policy for a Lambda function: `"Action": "dynamodb:*"` and `"Resource": "*"`. It works — the function can read and write to DynamoDB tables. Three months later a production incident triggers the wrong code path, which calls `dynamodb:DeleteTable` on the wrong table ARN and deletes six months of production data. Had the policy specified only `dynamodb:GetItem` and `dynamodb:PutItem` in the Action array and the specific table ARN in the Resource field, the code path could not have called `DeleteTable` regardless of what the code attempted. Policy JSON is a blast-radius limiter — precision in the Action and Resource fields directly determines the scope of any accident or compromise.

**Intermediate:** A security team needs to ensure that access to a bucket containing financial records always requires MFA, even for users who are already logged into the console without it. They add a Deny statement to the existing S3 read/write policy: Effect Deny, actions covering all S3 operations on the bucket, a `BoolIfExists` condition on `aws:MultiFactorAuthPresent: false`. Users who log in with a password but no MFA receive an `AccessDenied` error when they navigate to the bucket. They are not locked out of other resources. They must sign out and sign back in with their MFA device to proceed. The Deny-wins rule is what makes this pattern unbypassable — no Allow in any policy they possess can override an explicit Deny while the MFA condition is unsatisfied.

**Advanced:** A platform engineering team manages 80 Lambda functions across 15 microservices. Initially, each function had an inline policy on its execution role. When the team needed to add `logs:CreateLogGroup` and `logs:CreateLogStream` to all 80 functions (discovered missing after a CloudWatch Logs outage), they had to update 80 separate inline policies manually — a three-hour operation requiring careful auditing to ensure no function was missed. After migrating to four customer managed policies (`lambda-logging`, `lambda-s3-read`, `lambda-dynamodb-write`, `lambda-sns-publish`), any future policy update takes seconds and propagates to all attached roles immediately. When AWS later adds a new CloudWatch Logs API call (`logs:StartLiveTail`) that the team needs, it is a single one-line addition to one policy that 80 Lambda functions inherit automatically. The operational case for managed over inline policies is compelling at any meaningful scale.

## Think About It

1. The evaluation rule says explicit Deny always wins over any Allow. This means a single misconfigured Deny can block access for an entire team regardless of how many Allows exist. What operational safeguards would you put in place to prevent a rogue or accidental Deny from causing an outage — and how would you recover if it happened?
2. Wildcards in the Action field (`"s3:*"`) and Resource field (`"*"`) are convenient but violate least privilege. Yet administrator roles often use them. What properties of an administrator role make wildcards more acceptable there than in an application-specific role, even though administrators are arguably higher-value compromise targets?
3. A customer managed policy is versioned and reusable. An inline policy is embedded in one identity. You are building permissions for a specific ECS task that will be decommissioned in 60 days when a project ends. Which type would you choose — and would your answer change if you knew a second ECS task with identical permissions would be needed next month?
4. SCPs in Organizations use the same JSON policy language syntax as IAM policies but act as a ceiling. Could you achieve the same organizational governance by editing IAM policies directly in every member account rather than using SCPs? What specific problems would that approach create at scale, and why does SCPs-as-ceiling solve them?
5. A developer writes a policy with `Effect: Allow`, `Action: s3:GetObject`, and `Resource: arn:aws:s3:::my-bucket`. Testing shows no objects can be retrieved. What is wrong, and how does fixing it reveal the fundamental difference between how IAM ARNs scope to S3 bucket resources versus S3 object resources?

## Quick Check

**Q1.** In IAM policy evaluation, what happens when both an explicit Allow and an explicit Deny apply to the same action for the same principal?

- A) The Allow wins because it was applied first in the evaluation chain
- B) The Deny wins — explicit Deny always overrides any Allow, in any policy
- C) The result depends on which policy was most recently attached to the principal
- D) IAM sends an alert to the account administrator to manually resolve the conflict

**Answer: B** — Explicit Deny always wins in IAM policy evaluation, unconditionally and regardless of the number of Allow statements, the order policies were attached, which policy type the Deny appears in, or any other factor. This rule is absolute and has no exceptions.

**Q2.** An IAM policy has the statement: `Effect: Allow`, `Action: s3:GetObject`, `Resource: "arn:aws:s3:::my-bucket"`. Why will a principal with only this policy fail to download objects from the bucket?

- A) `s3:GetObject` requires the bucket to have versioning enabled before objects can be retrieved
- B) The resource ARN targets the bucket itself, but `s3:GetObject` is an object-level action — the correct ARN pattern is `arn:aws:s3:::my-bucket/*`
- C) `s3:GetObject` requires MFA to be present by default for all S3 buckets
- D) `s3:ListBucket` must also be included in the policy because it is a prerequisite for `s3:GetObject`

**Answer: B** — S3 has two resource types: the bucket (`arn:aws:s3:::my-bucket`) and the objects within it (`arn:aws:s3:::my-bucket/*`). `s3:GetObject` is an object-level operation and must reference the object ARN pattern. A policy statement allowing `s3:GetObject` with only the bucket ARN will never match any object resource, so the Allow never applies to any object retrieval request.

**Q3.** Why should you use `BoolIfExists` rather than `Bool` when writing a Deny condition to block access when `aws:MultiFactorAuthPresent` is false?

- A) `Bool` is deprecated for IAM policy conditions and is no longer a valid operator
- B) `Bool` only evaluates when the condition key is present in the request context; for credentials where MFA context is absent (such as role sessions from AWS services), `Bool` would not fire and the Deny would be ineffective
- C) `BoolIfExists` is required for all Deny effect statements — `Bool` only works with Allow
- D) `Bool` requires a registered MFA device serial number as a parameter; `BoolIfExists` works without it

**Answer: B** — `Bool` evaluates only when the specified condition key is present. For credential types such as temporary credentials from `sts:AssumeRole` by AWS services, `aws:MultiFactorAuthPresent` is absent from the request context entirely — not false, just missing. A plain `Bool` condition checking for `false` would not trigger, leaving the Deny silent and ineffective. `BoolIfExists` treats the absence of the key as `false`, correctly blocking any session that lacks MFA context, including sessions where MFA was never part of the authentication flow.

## What's Next

Next: The Principle of Least Privilege — the foundational security philosophy behind every IAM design decision, and the AWS tools (IAM Access Analyzer, Access Advisor, credential reports) that help you achieve and maintain it in real workloads.
