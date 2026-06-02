---
title: "Principle of Least Privilege"
type: content
estimated_minutes: 15
cert_tags: ["aws_ccp", "aws_saa", "aws_soa", "aws_scs"]
---

# Principle of Least Privilege

## Overview

The Principle of Least Privilege (PoLP) states that every identity — human or machine — should have exactly the permissions required to perform its function, and nothing more. It is not a feature of IAM; it is a security philosophy that should guide every IAM design decision you make. AWS codifies it as a core pillar in the Security domain of the Well-Architected Framework, lists it as a security best practice in every service guide, and tests it as a correct-answer principle across every AWS certification. Understanding it deeply — not just as a definition to recall but as a design constraint that shapes how you write policies — separates practitioners who produce secure systems from those who produce systems that work until they are compromised.

Why does least privilege matter? The practical argument is blast radius. If an EC2 instance is compromised and its IAM role has `AdministratorAccess`, the attacker has full control of your AWS account — they can exfiltrate every piece of data, spin up cryptocurrency mining workloads, delete all backups, pivot to other accounts through cross-account roles, and send bulk email through SES before you detect the intrusion. If the same instance's role has only `s3:GetObject` on one specific bucket prefix containing log files, the attacker can read those log files — that is the entire blast radius. Every permission beyond what a workload actually needs is a loaded weapon pointed at your own system, waiting for a vulnerability or credential leak to discharge it. The difference between those two scenarios is a single IAM design decision made at setup time, and it costs nothing to get right.

Least privilege is also genuinely difficult to implement in practice. You often do not know exactly what permissions a workload needs until it actually runs in production. Development timelines create pressure to grant broader access temporarily and "fix it later" — but later rarely comes, because tightening permissions carries the risk of breaking something and requires testing you did not budget time for. AWS provides tools specifically to bridge this gap: IAM Access Analyzer can generate least-privilege policies from real CloudTrail activity logs, Access Advisor shows you which services a role has actually used (and when), and the IAM credential report provides a full account-wide audit of every user's credential status. These tools exist because AWS recognizes that least privilege is aspirational without automated insight into what is actually happening in your account.

## Core Concepts

### Start Restrictive, Expand As Needed

The path of least resistance in IAM is to start broad ("grant S3 full access to unblock development, we'll restrict it later") and tighten permissions over time. In practice, tightening rarely happens because removing permissions risks breaking things, and every removal requires testing that competes with feature development. Once a workload is in production, its IAM permissions tend to only accumulate — they are rarely pruned.

The correct approach is the opposite: start with no permissions, add only what you know is necessary, observe what fails, and add specific permissions as failures occur. This produces policies that reflect actual usage rather than anticipated usage, and policies you can audit and defend. The process involves more friction initially, but results in a security posture that survives incidents and audits.

**The iterative process for a new workload:**
1. Create the role with no permission policies attached
2. Deploy the application and observe CloudWatch Logs or CloudTrail for `AccessDenied` errors
3. For each error: identify the exact API call that failed (`errorCode: AccessDenied`, `eventName`), the resource ARN it was targeting, and the service namespace
4. Add the minimum specific permission that resolves that failure (`service:SpecificAction` on `specific-resource-arn`)
5. Repeat until the application functions correctly across all code paths
6. Review the resulting policy to confirm every Allow has a clear justification

This process is time-consuming for complex workloads with many code paths, which is why IAM Access Analyzer's policy generation feature is valuable — it automates steps 2 through 5 by analyzing real CloudTrail activity rather than relying on you to trigger every code path manually.

### IAM Access Analyzer: Two Capabilities That Serve Different Goals

IAM Access Analyzer is a service with two distinct capabilities that address different aspects of least privilege and security posture. They use different underlying data and produce different types of findings:

**Capability 1: External Access Findings**

Access Analyzer continuously monitors resource-based policies (S3 bucket policies, IAM role trust policies, KMS key policies, SQS queue policies, Lambda resource policies, Secrets Manager secret policies) and identifies resources that are accessible outside your account or outside your AWS Organization. When a bucket policy grants access to `"Principal": "*"` without sufficient conditions, Access Analyzer creates a finding. When a role's trust policy allows assumption from an external account you don't recognize, Access Analyzer flags it.

Findings appear in the Access Analyzer console with severity information, the specific resource, the principal that has external access, and the specific policy that creates the access. Each finding can be reviewed, archived (acknowledged as intentional), or resolved by updating the policy.

Access Analyzer requires you to create an "analyzer" — a resource that defines the zone of trust. For an account-level analyzer, resources accessible from outside the account are flagged. For an organization-level analyzer, resources accessible from outside the organization are flagged. Create one analyzer per Region where you run workloads.

**Capability 2: Policy Generation from CloudTrail**

This is the most practical tool for achieving least privilege on existing workloads. You specify a role and a CloudTrail data source; Access Analyzer reads the CloudTrail events in that window and generates an IAM policy that allows exactly the API calls the role made on exactly the resources it accessed.

How it works internally:
1. You specify the role ARN and the CloudTrail S3 bucket or trail name, with a date range
2. Access Analyzer reads every CloudTrail event where the role was the principal
3. It identifies the `eventSource`, `eventName` (the API action), and `resources` fields from each event
4. It generates a minimal IAM policy statement for each unique `service:action` → `resource-arn` combination observed
5. The resulting policy document is displayed for your review

This converts "what does this role need?" from a speculative exercise into an empirical analysis. The generated policy reflects what the role actually did, not what someone estimated it would need.

**Critical limitation of policy generation:** It captures only what happened during the CloudTrail window you specified. A workload with code paths that run quarterly (year-end reports, monthly billing reconciliation) will not include those permissions in a policy generated from one week of data. Before treating a generated policy as complete, you must ensure the CloudTrail window covers every operational code path — including error handling paths, maintenance operations, and low-frequency scheduled tasks.

### Access Advisor: Last Accessed Service Data

Every IAM user, group, role, and policy has an **Access Advisor** tab in the IAM console that shows, for each AWS service the principal has permissions for, the last time any action from that service was called. If a role has EC2 permissions and Access Advisor shows EC2 was "last accessed 423 days ago" — or "not accessed" — those EC2 permissions are candidates for removal.

Access Advisor data is at the service level, not the individual API call level. It tells you "DynamoDB was last accessed 7 days ago" but not "specifically `dynamodb:GetItem` was called 40 times today and `dynamodb:DeleteTable` has never been called." For action-level precision, use CloudTrail directly or Access Analyzer policy generation.

Despite its coarser granularity, Access Advisor is valuable because it is free, instant, and requires no setup. The workflow:
1. Open any role, click the **Access Advisor** tab
2. Sort by **Last Accessed** date ascending (most stale permissions at top)
3. Any service showing "Not accessed" for 90+ days is a candidate for removal
4. Services that appear in the permission policies but never appear in Access Advisor data have literally never been used by this role

Access Advisor is also available programmatically via `aws iam generate-service-last-accessed-details`, which returns a job ID. Retrieve the results with `aws iam get-service-last-accessed-details --job-id <id>`. This enables automated access reviews that query Access Advisor across all roles in an account and flag any service that has not been accessed in a configurable window.

### IAM Credential Report: Account-Wide Security Posture

The IAM credential report is an account-level CSV file that lists every IAM user and the complete status of their credentials. One row per user, one column per credential attribute. It is the primary tool for answering these security questions:

- Which IAM users have not logged into the console in more than 90 days?
- Which access keys have not been rotated in more than 90 days?
- Which IAM users have console access but no MFA enabled?
- Are there access keys that have never been used at all?
- Which users have two access keys active simultaneously (potential indicator of missed rotation)?

**Key columns in the credential report:**

| Column | What it tells you |
|---|---|
| `user` | IAM user name |
| `password_enabled` | Whether console password is set (true/false/not_supported for root) |
| `password_last_used` | Timestamp of last console login, or "N/A" if never |
| `password_last_changed` | When the password was last rotated |
| `mfa_active` | Whether an MFA device is registered (true/false) |
| `access_key_1_active` | Whether access key 1 is enabled |
| `access_key_1_last_used_date` | Last time access key 1 made an API call |
| `access_key_1_last_rotated` | When access key 1 was created (creation = rotation event) |
| `access_key_2_active` | Whether access key 2 is enabled |
| `access_key_2_last_used_date` | Last time access key 2 made an API call |
| `access_key_2_last_rotated` | When access key 2 was created |

The report covers all IAM users in the account — not just the current user, not just users in a specific group. It is account-wide and must be generated before retrieval (it is not maintained in real time).

### Permission Boundaries: Delegating IAM Management Without Privilege Escalation

A permission boundary is a managed IAM policy that sets the maximum permissions an IAM user or role can ever exercise, regardless of what identity-based policies are attached. The effective permissions for an identity with a boundary are the intersection (logical AND) of the identity-based policies and the boundary. Even if the identity policy grants `AdministratorAccess`, if the permission boundary only allows S3 and CloudWatch actions, the effective permissions are only S3 and CloudWatch.

**The use case for permission boundaries:** You want to delegate IAM management to developers — specifically, you want developers to be able to create IAM roles for their own Lambda functions and ECS tasks without needing platform team involvement for every deployment. But you do not want a developer to be able to create a role with `AdministratorAccess` and then use that role to escalate their own AWS permissions or access data outside their team's scope.

The solution: require that every role created by developers must include a specific permission boundary policy. Enforce this by giving developers an IAM policy that allows `iam:CreateRole` and `iam:AttachRolePolicy` only when the condition `iam:PermissionsBoundary` equals the ARN of your boundary policy. Now:

- Developers can create service roles for their workloads without platform team involvement
- Any role they create is automatically capped by the boundary at whatever services the boundary permits
- A developer who attaches `AdministratorAccess` to a role they created still cannot perform actions outside the boundary
- The platform team controls what the boundary allows and can update it centrally

Permission boundaries apply only to IAM users and roles — not to IAM groups, not to the account root user. They do not grant any permissions themselves; a role with only a boundary and no identity-based policy has zero effective permissions.

## Configuration Reference

### Console: IAM Access Analyzer

**Enable Access Analyzer (one-time, per account, per Region — must be done in each Region separately):**
1. IAM → left pane → **Access Analyzer** → **Create analyzer**
2. **Analyzer type:** select **Account** for within-account analysis (resources accessible from outside your account are flagged) or **Organization** for organization-level analysis (requires AWS Organizations trusted access enabled)
3. Enter an analyzer name (`prod-access-analyzer`, `us-east-1-analyzer`) and click **Create analyzer**
4. Access Analyzer begins scanning immediately and will continuously monitor for changes

**View Access Analyzer findings:**
1. IAM → **Access Analyzer** → select your analyzer
2. The findings table shows: Resource Type, Resource ARN, the external principal that has access, and Status (Active/Archived/Resolved)
3. Each finding has a direct link to the resource — click to see the specific policy grant that created the finding
4. To acknowledge an intentional finding (e.g., an S3 bucket intentionally public): click the finding → **Archive** — it moves out of the active queue and will not re-alert unless the policy changes

**Generate a least-privilege policy using Access Analyzer:**
1. IAM → **Roles** → select the role → **Permissions** tab → **Generate policy** button
2. Select your CloudTrail trail, the S3 bucket where trail logs are stored, and the date range to analyze
3. Click **Generate policy** — Access Analyzer processes the logs (takes a few minutes for large date ranges)
4. The generated policy appears as a JSON document — review it carefully, especially for wildcard resources that Access Analyzer may have included for actions that targeted `*` in CloudTrail
5. Download or copy the JSON, create it as a customer managed policy, and attach it to the role as a replacement for the existing over-broad policy

### Console: Access Advisor

1. IAM → **Roles** → select any role
2. Click the **Access Advisor** tab
3. The table shows every AWS service the role's policies grant access to, the last accessed date (or "Not accessed"), and the last accessed action
4. Sort by **Last Accessed** date ascending — services with the oldest last-accessed dates or "Not accessed" are candidates for removal
5. Cross-reference with the role's permission policies to identify which policy grants the unused service permissions, then remove those specific statements or policies

### AWS CLI Commands

**Generate the IAM credential report:**
```bash
# Step 1: Request report generation
# First call may take a few seconds for small accounts or up to 4 hours
# for the very first generation (subsequent calls are fast)
aws iam generate-credential-report
# Returns: {"State": "STARTED"} or {"State": "COMPLETE"} or {"State": "INPROGRESS"}
# Repeat until State is COMPLETE before retrieving

# Step 2: Retrieve the report (returns base64-encoded CSV)
aws iam get-credential-report
# Returns: Content (base64 CSV), GeneratedTime, ReportFormat

# Step 3: Decode and save to a CSV file
# On macOS/Linux:
aws iam get-credential-report \
  --query Content \
  --output text | base64 --decode > credential-report.csv

# On Windows (PowerShell):
$encoded = aws iam get-credential-report --query Content --output text
[System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($encoded)) | Out-File credential-report.csv

# The CSV can be opened in Excel or processed with awk/jq for filtering
```

**Get Access Advisor data for a specific role (service-level last-accessed):**
```bash
# Step 1: Start the job (asynchronous — returns a JobId)
JOB_ID=$(aws iam generate-service-last-accessed-details \
  --arn arn:aws:iam::123456789012:role/MyApplicationRole \
  --query JobId \
  --output text)

# Step 2: Retrieve the results (wait 10-30 seconds for the job to complete)
aws iam get-service-last-accessed-details \
  --job-id $JOB_ID
# Returns a list of services with LastAuthenticated timestamp
# Services with no LastAuthenticated field have never been accessed
```

**Check last-used details for a specific access key:**
```bash
aws iam get-access-key-last-used \
  --access-key-id AKIAIOSFODNN7EXAMPLE
# Returns: AccessKeyLastUsed (LastUsedDate, ServiceName, Region)
# If LastUsedDate is absent, the key has never been used
```

**List all access keys for a user with their status and last-used info:**
```bash
# List keys and their status
aws iam list-access-keys --user-name alice

# Get last-used date for a specific key
aws iam get-access-key-last-used --access-key-id AKIAIOSFODNN7EXAMPLE
```

**Create and attach a permission boundary:**
```bash
# 1. Create the boundary policy from a JSON file
aws iam create-policy \
  --policy-name developer-workload-boundary \
  --policy-document file://boundary-policy.json
# boundary-policy.json should list only the services developers' workloads should access
# e.g., s3:*, dynamodb:*, sqs:*, sns:*, cloudwatch:*, logs:*

# 2. Create a new role with the boundary applied from the start
aws iam create-role \
  --role-name DevServiceRole \
  --assume-role-policy-document file://trust-policy.json \
  --permissions-boundary arn:aws:iam::123456789012:policy/developer-workload-boundary

# 3. Apply a boundary to an existing role
aws iam put-role-permissions-boundary \
  --role-name ExistingServiceRole \
  --permissions-boundary arn:aws:iam::123456789012:policy/developer-workload-boundary
```

**Permission boundary policy example (caps a role to application services only):**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      // This boundary allows the listed services — effective permissions
      // are the INTERSECTION of this boundary and the identity-based policies.
      // Even if an identity policy grants AdministratorAccess, the role can
      // only perform actions covered by these services.
      "Sid": "AllowApplicationServices",
      "Effect": "Allow",
      "Action": [
        "s3:*",              // S3 object storage
        "dynamodb:*",        // DynamoDB database
        "sqs:*",             // SQS message queues
        "sns:*",             // SNS notifications
        "cloudwatch:*",      // CloudWatch metrics
        "logs:*",            // CloudWatch Logs
        "xray:*",            // X-Ray tracing
        "secretsmanager:GetSecretValue"  // Reading secrets — not managing them
        // Notably absent: iam:*, ec2:*, organizations:*, billing:*
        // A developer-created role with this boundary can never touch IAM,
        // spin up EC2 instances, or access billing data — even with AdminAccess attached.
      ],
      "Resource": "*"
    }
  ]
}
```

## How to Decide

| Situation | Tool or Approach |
|---|---|
| New workload, permissions unknown | Start with no permissions; add iteratively based on CloudTrail `AccessDenied` errors |
| Existing role that may have excess permissions | Access Analyzer policy generation (analyze CloudTrail); Access Advisor (identify unused services at service level) |
| Full account-wide credential security audit | IAM credential report — covers all users, all keys, MFA status, last-used dates |
| Delegate IAM management to developers without escalation risk | Permission boundaries — require developers to attach boundary to any role they create |
| Continuous monitoring for externally accessible resources | Access Analyzer external access findings (per account, per Region) |
| Compliance requirement: no access keys older than 90 days | Credential report — filter on `access_key_1_last_rotated` > 90 days; automate with Lambda |
| Quarterly access review | Access Advisor + credential report combined — Advisor for service usage, credential report for credential hygiene |
| Action-level precision (what specific APIs was called) | CloudTrail — query by principal ARN for full action history with resources and timestamps |

## How This Connects

- **AWS CloudTrail** — IAM Access Analyzer's policy generation reads CloudTrail event history to determine what API calls a role has actually made. CloudTrail is the data source that converts "what does this role need?" from speculation to evidence. Without CloudTrail, least privilege policy generation is guesswork.
- **AWS IAM Access Analyzer** — functions as both a security scanner (external access findings) and a least-privilege tool (policy generation from CloudTrail). Enabling it organization-wide through AWS Organizations provides account-wide visibility from a single console. It is free for the first 30 days; after that, charged per finding analyzed.
- **AWS Organizations / SCPs** — permission boundaries and SCPs both constrain maximum permissions, but at different scopes. Permission boundaries cap individual roles and users. SCPs cap all principals in an entire account or OU. They complement each other in defense-in-depth: SCPs define organizational guardrails; permission boundaries enable safe delegation of IAM management within accounts.
- **Amazon GuardDuty** — monitors for anomalous IAM behavior patterns: unusual API call sequences, access from unexpected geographic locations, credential exfiltration signatures, and IAM actions that suggest account reconnaissance. GuardDuty and least privilege are complementary: least privilege limits what an attacker can do if they gain access; GuardDuty detects when permissions are being abused even within their authorized scope.
- **AWS Security Hub** — aggregates security findings including IAM Access Analyzer findings from across multiple accounts, scores compliance against standards like CIS AWS Foundations Benchmark (which includes IAM-specific checks), and provides a centralized view of least-privilege violations that would otherwise require checking each account individually.

## Exam Traps

1. **Access Analyzer generates policies from CloudTrail, not from the existing policy itself.** Access Analyzer's policy generation feature analyzes what API calls a role actually made. It does not read the existing attached policy and suggest tighter alternatives. A question asking "how do you generate a least-privilege policy for an existing role" — the answer is Access Analyzer with CloudTrail as the data source, not IAM Policy Simulator (which tests a policy against a simulated request but does not generate a policy).

2. **Permission boundaries do not grant permissions — they only constrain them.** A role with only a permission boundary and no attached identity-based policies has zero effective permissions. The boundary sets the ceiling; identity-based policies must fill in what is actually permitted below the ceiling. This is different from SCPs in an important way: an SCP can be written as an Allow-list (only permit what is listed) or a Deny-list (deny specific actions). A permission boundary is structurally similar to an Allow-list SCP but applies to one role/user.

3. **Access Advisor provides service-level data, not individual API action data.** If an exam question asks "how do you identify which specific IAM actions a role has used," Access Advisor is the wrong answer — it shows service-level granularity ("DynamoDB was accessed 3 days ago") not action-level granularity ("dynamodb:GetItem was called 40 times today"). Action-level detail requires querying CloudTrail directly.

4. **The credential report is account-scoped, not user-scoped.** The IAM credential report lists all IAM users in the account — it is an account-wide snapshot, not a report about the current user. A question asking "which AWS feature provides a CSV of all IAM users and their credential status across the entire account" — the correct answer is the IAM credential report via `aws iam generate-credential-report`.

5. **Least privilege applies most critically to service roles, not just human users.** Candidates sometimes focus least privilege on limiting what humans can do in the console. The more impactful and more commonly violated application is service roles — Lambda execution roles, EC2 instance profiles, ECS task roles. These are the identities that run automated workloads continuously and are the most common target of privilege escalation attacks that exploit over-broad service permissions.

## Summary

- The Principle of Least Privilege means every identity should have exactly the permissions it needs to function — no more — and should be the governing constraint on every IAM policy you write, not an afterthought applied during security reviews.
- Blast radius is the practical argument: scoped permissions confine the damage of any compromise to the minimum possible footprint; `AdministratorAccess` on a Lambda execution role turns a code vulnerability into a full account takeover.
- IAM Access Analyzer generates least-privilege policies by analyzing actual CloudTrail API call history — converting the hard question "what does this workload need?" into an empirical analysis of what it has actually done, subject to the limitation that the CloudTrail window must cover all operational code paths.
- Access Advisor shows last-accessed service data for any IAM principal — the fastest first step for identifying permissions that may be excess, requiring no setup and no cost.
- The IAM credential report is an account-wide CSV of all IAM users, credential ages, last-used dates, and MFA status — the primary tool for credential hygiene audits, compliance reviews, and detecting stale or never-used credentials.
- Permission boundaries enable safe delegation of IAM management: a developer can create roles for their workloads without platform team involvement, but any role they create is automatically capped by the boundary policy — even if they attach `AdministratorAccess` to a role they created, effective permissions are limited to what the boundary allows.

## Examples

**Beginner:** A developer building their first Lambda function attaches `AdministratorAccess` to the Lambda execution role because it is faster than figuring out the specific permissions needed. The function ships to production and runs for 18 months without incident. A vulnerability in a third-party library eventually allows remote code execution. The attacker uses the Lambda's execution role — still carrying `AdministratorAccess` — to enumerate S3 buckets, download the customer database, create a new IAM user with admin access for persistence, and configure an SES rule to send bulk spam. The function needed only `dynamodb:PutItem` on one specific table. Every permission beyond that directly enabled the breach's scope. Least privilege is not an inconvenience — it is the difference between a compromised function and a compromised account.

**Intermediate:** A platform team has 15 microservices, each with an IAM role that was given broad S3, DynamoDB, and SQS access during initial development. After six months of production, they run IAM Access Analyzer policy generation for each role using 90 days of CloudTrail history. For the inventory-sync-role, the analysis reveals that DynamoDB write permissions — added for a feature that was eventually cancelled — have never been used in production. The team removes `dynamodb:PutItem` and `dynamodb:UpdateItem` from that role. For the order-processor-role, the analysis shows the role has only ever called three SQS actions on two specific queue ARNs, confirming the existing policy is already close to minimal. The exercise takes two hours and produces tighter policies for every service with zero application changes and zero access disruption.

**Advanced:** A cloud platform team at a 400-person company needs to allow 50 developers to create and manage IAM roles for their own microservices without requiring platform team approval for each deployment. They design a permission boundary called `developer-workload-boundary` that allows only S3, DynamoDB, SQS, SNS, CloudWatch Logs, and Secrets Manager read operations — explicitly excluding IAM, EC2, Organizations, and billing. Developers receive an IAM policy that allows `iam:CreateRole` and `iam:AttachRolePolicy` only when the condition `iam:PermissionsBoundary` in the request equals the boundary policy ARN. An additional Deny blocks developers from removing or replacing the boundary once set. Now: developers self-service their own service roles without tickets; every developer-created role is automatically capped by the boundary; a developer who attaches `AdministratorAccess` to one of their roles still cannot perform IAM actions or access billing because the boundary excludes those services; and the platform team can update what the boundary allows in one place and every developer-created role automatically inherits the change. Least privilege implemented at the delegation layer, constraining not just what developers can do, but what they can grant to the services they build.

## Think About It

1. "Start restrictive, expand as needed" is the correct approach, but "start broad, restrict later" is what most teams actually do under deadline pressure. What incentive structures or technical mechanisms could make the restrictive-by-default approach the path of least resistance for developers — without requiring them to care about security as a personal priority?
2. IAM Access Analyzer generates policies from historical CloudTrail activity. What are the limitations of a historically derived policy — can you think of scenarios where a policy generated from historical data would actually be less secure or less correct than one written from a design spec?
3. A permission boundary sets the maximum permissions a role can have; SCPs in Organizations also restrict maximum permissions. What is the structural difference between how permission boundaries and SCPs operate, at what layer each applies, and when you would use each versus the other?
4. The credential report shows "access key last used: 2022-03-15" for a key that is still active. Should you immediately delete it? What information would you want to gather first, and how would you approach decommissioning a potentially load-bearing key without causing an outage?
5. Least privilege and development velocity are in genuine tension. Being restrictive slows down development; developers under pressure grant broad access. Is this tension resolvable without just accepting least privilege as a control that developers will resist? What organizational or technical approaches make tight permissions compatible with fast development cycles?

## Quick Check

**Q1.** What data source does IAM Access Analyzer use to generate a least-privilege policy recommendation for an existing IAM role?

- A) A manual permissions survey submitted by the role owner describing intended usage
- B) CloudTrail logs showing which API calls the role has actually made during a specified time window
- C) AWS Trusted Advisor recommendations based on the account's configuration age
- D) A comparison of the existing policy against the closest matching AWS Managed Policy

**Answer: B** — IAM Access Analyzer's policy generation feature reads CloudTrail activity logs to identify every API call made by the role during the specified time window, then generates a policy permitting exactly those actions on exactly those resources. It analyzes actual behavior, not intended behavior or existing policy text.

**Q2.** A permission boundary is attached to an IAM role. The role's identity-based policy grants `AdministratorAccess`. The permission boundary allows only `s3:*` and `cloudwatch:*`. What can this role actually do?

- A) Everything, because `AdministratorAccess` is a broader policy and overrides the boundary
- B) Only S3 and CloudWatch actions — the effective permissions are the intersection of the identity policy and the boundary
- C) Nothing — when an identity policy and a permission boundary conflict, access is fully denied
- D) Everything except root-level and billing actions, which are always excluded from non-root roles

**Answer: B** — A permission boundary defines the maximum permissions an identity can exercise. Effective permissions are the intersection (logical AND) of what the identity-based policies permit and what the boundary permits. Even with `AdministratorAccess` in the identity policy, the role can only perform actions that are both allowed by that policy AND allowed by the boundary — which in this case means only S3 and CloudWatch.

**Q3.** Which AWS feature provides an account-wide CSV file listing all IAM users with their access key ages, last-used dates, MFA status, and console access status?

- A) IAM Access Analyzer findings export in CSV format
- B) AWS Trusted Advisor's IAM security checks report
- C) The IAM credential report generated via `aws iam generate-credential-report`
- D) AWS Config IAM compliance rules report

**Answer: C** — The IAM credential report is an account-scoped CSV that covers every IAM user and the full status of all their credentials — password last used, access key creation dates, access key last-used dates, MFA device enrollment status, and more. It is generated with `aws iam generate-credential-report` and retrieved with `aws iam get-credential-report`.

## What's Next

Next: Multi-Factor Authentication — the second-factor controls that protect IAM credentials when a password or access key is compromised, how different MFA types compare in phishing resistance, and how to enforce MFA at the policy level using IAM Condition blocks.
