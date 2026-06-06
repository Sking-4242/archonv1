---
title: "S3 Security: Policies, Encryption, and Access Control"
type: content
estimated_minutes: 16
cert_tags: ["SAA-C03", "SAP-C02", "CLF-C02"]
---

# S3 Security: Policies, Encryption, and Access Control

## Overview

S3 security is not a single switch — it is a stack of independent, layered controls that interact with each other. Each layer defends against a different threat vector: IAM policies control identity-level access, bucket policies control resource-level access including cross-account patterns, Block Public Access prevents accidental exposure to the internet regardless of what other policies say, presigned URLs enable time-scoped sharing without modifying bucket permissions, encryption protects data if the storage layer is compromised, and VPC endpoints ensure traffic never traverses the public internet. Understanding how these layers interact — particularly where they conflict or where one overrides another — is what distinguishes an architect from someone who can just click through the Console.

S3 security matters disproportionately because S3 is where sensitive data lives at rest. Databases, application code, backups, logs, PII, financial records — a significant fraction of an organization's most sensitive data passes through S3. Misconfigured S3 buckets are one of the most frequently cited sources of public data breaches in the cloud era. The breaches are not usually caused by sophisticated attacks — they are caused by someone turning off Block Public Access to test something and forgetting to turn it back on, or writing a bucket policy with `"Principal": "*"` without realizing what that means. AWS has responded by making the secure default increasingly the default — Block Public Access is on by default, SSE-S3 encryption is on by default — but understanding why each control exists is necessary to apply it correctly and to recognize when a configuration is insecure.

For the SAA-C03 exam, S3 security is one of the highest-frequency topic areas. You must be able to evaluate a bucket configuration scenario and identify the correct combination of policies, identify which layer is blocking access when access is denied, and select the right sharing mechanism for a described use case. You also need to recognize the SSE encryption options by name and understand what each one implies about key custody, audit capability, and customer responsibility.

## Core Concepts

### Block Public Access: The Override Layer

Block Public Access (BPA) is a dedicated override mechanism that prevents bucket policies and ACLs from granting public access, regardless of what those policies say. It operates at two levels: the AWS account level (applies to all buckets in the account) and the individual bucket level. Account-level BPA is the stronger setting — even if a bucket's own BPA is configured to allow public access, the account-level setting wins.

BPA has four independent settings. **BlockPublicAcls** prevents new ACLs from granting public access and ignores newly added public-granting ACL entries. **IgnorePublicAcls** causes S3 to ignore any existing public-granting ACLs entirely, even if they were created before BPA was enabled. **BlockPublicPolicy** prevents new bucket policies that grant public access from being saved — the PUT request fails with an error. **RestrictPublicBuckets** causes S3 to restrict access to a bucket with a public policy to only the bucket owner and AWS services, effectively neutralizing any existing public-granting bucket policy.

AWS enables all four settings by default on new buckets and at the account level for new accounts. Leave all four enabled for any bucket that does not need public access. The only legitimate reasons to disable BPA are static website hosting that must serve anonymous users, public file download buckets (e.g., open-source software distributions), or S3 origins for CloudFront public distributions where you prefer public bucket access over Origin Access Control.

### IAM Policies vs. Bucket Policies: Two Sides of the Same Door

IAM policies attach to identities — IAM users, groups, and roles. They define what S3 actions that identity is permitted to perform on which resources. Bucket policies attach to the S3 bucket resource itself and define who can perform what actions on the bucket and its objects. Both use the same JSON structure (Effect, Principal, Action, Resource, Condition), and both must allow an action for it to succeed in same-account scenarios — an IAM allow combined with an explicit bucket policy deny will be denied.

The critical difference is **Principal**. IAM policies do not have a Principal element — they define permissions for the identity they are attached to. Bucket policies require a Principal element specifying who the policy applies to: a specific IAM role ARN, an AWS account ID, a service principal, or `"*"` for everyone (public). This makes bucket policies the only mechanism for granting access to external principals (other AWS accounts) and for granting access to AWS services acting on their own (like CloudFront, Macie, or CloudTrail).

**Cross-account access pattern**: In a cross-account scenario where Account B wants to grant Account A's role access to a bucket in Account B, two permissions must both be granted. The bucket policy in Account B must explicitly allow Account A's role ARN. Account A's IAM policy must explicitly allow the role to access external S3 resources. Either alone is insufficient — both sides of the trust must be present. This two-sided requirement is one of the most tested S3 concepts on the exam.

**Policy evaluation**: When evaluating whether a request is allowed, AWS first checks for any explicit Deny in either IAM or bucket policy — an explicit Deny from any source immediately denies the request with no further evaluation. If there is no explicit Deny, AWS checks whether there is an explicit Allow in either IAM or bucket policy for the request. For same-account requests, only one side (IAM or bucket policy) needs to grant the action; for cross-account requests, both sides must grant the action.

### ACLs: Legacy Mechanism to Understand and Disable

Access Control Lists (ACLs) are the original S3 access control mechanism, predating IAM. ACLs are XML-based permission grants that can be attached to buckets or individual objects. They support a limited set of permissions (READ, WRITE, READ_ACP, WRITE_ACP, FULL_CONTROL) against a limited set of grantees (bucket owner, authenticated AWS users, all users — i.e., public).

ACLs are now considered a legacy mechanism. AWS recommends disabling ACLs entirely by setting the bucket's **Object Ownership** to "Bucket owner enforced," which disables the ACL system and makes bucket policies the sole resource-based access control mechanism. When ACLs are disabled, the bucket owner automatically owns all objects uploaded to the bucket by any principal — previously, objects uploaded by external accounts using ACLs were owned by the uploading account, creating scenarios where the bucket owner could not manage their own objects.

For the exam, understand that ACLs exist and what they do, but the correct modern design recommendation is to disable them. Scenarios describing object ownership problems where a bucket owner cannot control objects uploaded by another account are pointing toward the Object Ownership setting and ACL-disabling as the solution.

### Presigned URLs: Time-Limited Access Without Changing Permissions

A presigned URL is a signed HTTPS URL that grants temporary access to a specific S3 object for a limited time window, without requiring the requestor to have any AWS credentials. The URL contains embedded credentials — specifically, it is signed using the AWS credentials of the IAM identity that generated it. When the URL is accessed, S3 verifies the signature and checks that the signing identity still has the required permissions at the time of access, and that the URL has not expired.

The expiration maximum depends on the type of credentials used to sign the URL. IAM role credentials (temporary credentials from STS) can generate presigned URLs valid for up to 12 hours — role credentials themselves expire at most 12 hours, so the presigned URL cannot outlast the underlying credentials. Long-term IAM user access key credentials can generate presigned URLs valid for up to 7 days. AWS strongly recommends using role credentials (not long-term user credentials) for presigned URL generation, accepting the 12-hour limit in exchange for the security benefit of temporary credentials.

A critical operational implication: if the IAM role that generated a presigned URL is deleted, or if the role's permissions are revoked, presigned URLs generated by that role stop working immediately — even if the URL has not yet expired. This is because S3 re-evaluates the signing identity's current permissions at the time the presigned URL is used, not at the time it was generated.

### Encryption at Rest: SSE-S3, SSE-KMS, SSE-C, and Client-Side

S3 offers four encryption options for data at rest. The default since January 2023 is SSE-S3 (Server-Side Encryption with S3-Managed Keys), which encrypts every object with AES-256 and manages all key material within AWS with no cost beyond storage. SSE-S3 satisfies most encryption-at-rest requirements and has no performance impact. It does not provide separate audit trails of key usage or give customers control over key rotation.

SSE-KMS (Server-Side Encryption with AWS KMS Keys) encrypts objects using keys stored and managed in AWS Key Management Service. SSE-KMS adds a per-request cost (approximately $0.03 per 10,000 requests for the KMS API call) but provides: automatic CloudTrail audit logging of every encryption and decryption event, customer control over key rotation policies, the ability to disable a key to immediately revoke access to all data encrypted under it, and support for cross-account key access. Use SSE-KMS when you need auditable key usage, regulatory-required key rotation documentation, or the ability to revoke data access by disabling a key.

SSE-C (Server-Side Encryption with Customer-Provided Keys) requires the client to supply the encryption key with every PUT and GET request in a request header. AWS performs the encryption and decryption using the provided key but never stores the key — it is discarded after each operation. This means if you lose the key, the data is permanently inaccessible. SSE-C is appropriate for organizations with strict key custody requirements where AWS must never hold the key material, and who have the operational maturity to manage per-request key delivery securely.

Client-side encryption encrypts data before it reaches S3 at all. The AWS SDKs provide client-side encryption helpers (the S3 Encryption Client) that handle key wrapping and data encryption locally. S3 stores already-encrypted ciphertext and has no role in key management. This provides the strongest separation of AWS from your key material but requires application-level encryption implementation.

### VPC Endpoints for S3: Private Access Without the Internet

A VPC Gateway Endpoint for S3 is a horizontally scaled, redundant VPC component that enables EC2 instances, Lambda functions, and other VPC resources to communicate with S3 using private AWS network paths — without requiring an internet gateway, NAT gateway, or VPN. There is no additional cost for a VPC Gateway Endpoint for S3 (unlike Interface Endpoints, which are powered by PrivateLink and have hourly and data processing fees).

Gateway Endpoints work by adding route table entries in the VPC that direct S3-bound traffic through the endpoint rather than through the internet. To use a Gateway Endpoint, you create it in the VPC, associate it with the relevant route tables, and optionally attach a bucket policy condition requiring requests to come from the endpoint.

Requiring VPC endpoint access via a bucket policy condition is a common security pattern for sensitive buckets: all legitimate application traffic comes from within the VPC through the endpoint, and any attempt to access the bucket from outside the VPC (e.g., a compromised credential used from a home IP) is denied. The condition key is `aws:sourceVpce` for a specific endpoint ID or `aws:sourceVpc` for any endpoint in a specific VPC.

### Access Logging and CloudTrail Data Events

S3 server access logging records every request made to a bucket — the requester, the operation, the response code, the bytes transferred, and the source IP. Logs are delivered to a separate target S3 bucket as text files. There is no additional AWS cost for enabling access logs, though you are billed for the storage they consume. Access logs are useful for security analysis, usage patterns, and billing investigations.

CloudTrail data events are a higher-fidelity option that captures S3 API calls at the CloudTrail level, including the caller's IAM identity, the request parameters, and the API response. Data events are not enabled by default (management events are) and carry an additional CloudTrail cost. For sensitive buckets containing PII, financial records, or regulated data, enable CloudTrail data events — they provide IAM-identity-linked audit trails that server access logs do not include.

## Configuration Reference

### Real Bucket Policy: Cross-Account Access with VPC Endpoint Condition

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCrossAccountRoleAccess",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::111122223333:role/DataProcessingRole"
      },
      "Action": [
        "s3:GetObject",
        "s3:PutObject"
      ],
      "Resource": "arn:aws:s3:::my-sensitive-data-bucket/*"
    },
    {
      "Sid": "DenyAccessOutsideVpcEndpoint",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:*",
      "Resource": [
        "arn:aws:s3:::my-sensitive-data-bucket",
        "arn:aws:s3:::my-sensitive-data-bucket/*"
      ],
      "Condition": {
        "StringNotEquals": {
          "aws:sourceVpce": "vpce-0a1b2c3d4e5f67890"
        }
      }
    }
  ]
}
```

The first statement grants Account 111122223333's `DataProcessingRole` read and write access to objects. The second statement is a Deny for all principals on all S3 actions unless the request comes through the specific VPC endpoint. Because an explicit Deny overrides any Allow, any request — including from the cross-account role — that does not arrive through the specified VPC endpoint is denied. This enforces private network access as a mandatory control, not just a preference.

```bash
# Apply the bucket policy from a file:
aws s3api put-bucket-policy \
  --bucket my-sensitive-data-bucket \
  --policy file://bucket-policy.json
  # file:// reads the policy JSON from a local file
  # Overwrites the entire current bucket policy; there is no partial update
```

### AWS CLI: Generate a Presigned URL

```bash
# Generate a presigned GET URL valid for 3600 seconds (1 hour):
aws s3 presign s3://my-sensitive-data-bucket/reports/q4-summary.pdf \
  --expires-in 3600
  # Output is a complete HTTPS URL that any HTTP client can GET without AWS credentials
  # The URL includes: the bucket/key, an expiry timestamp, the signing credentials,
  # and a computed HMAC-SHA256 signature
  # The signing identity (whoever runs this command) must have s3:GetObject permission

# Generate a presigned PUT URL (for uploads) using the SDK — the CLI only supports presigned GETs
# Use the Python SDK for presigned PUT:
# import boto3
# s3 = boto3.client('s3')
# url = s3.generate_presigned_url('put_object',
#   Params={'Bucket': 'my-sensitive-data-bucket', 'Key': 'uploads/user-file.pdf'},
#   ExpiresIn=3600)
```

### AWS CLI: Enable SSE-KMS as Default Encryption

```bash
aws s3api put-bucket-encryption \
  --bucket my-sensitive-data-bucket \
  --server-side-encryption-configuration '{
    "Rules": [
      {
        "ApplyServerSideEncryptionByDefault": {
          "SSEAlgorithm": "aws:kms",
          "KMSMasterKeyID": "arn:aws:kms:us-east-1:123456789012:key/mrk-abcdef123456"
        },
        "BucketKeyEnabled": true
      }
    ]
  }'
  # SSEAlgorithm: "aws:kms" for SSE-KMS, "AES256" for SSE-S3
  # KMSMasterKeyID: ARN of your customer-managed KMS key, or omit to use the AWS-managed S3 key
  # BucketKeyEnabled: true reduces KMS API call costs by generating a bucket-level data key
  #   reused for multiple objects, reducing the per-object KMS API calls by up to 99%
```

### AWS CLI: Configure Block Public Access

```bash
# Block all public access at the bucket level:
aws s3api put-public-access-block \
  --bucket my-sensitive-data-bucket \
  --public-access-block-configuration \
    BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
  # All four settings should be true for any non-public bucket

# Verify current Block Public Access settings:
aws s3api get-public-access-block --bucket my-sensitive-data-bucket

# Configure account-level Block Public Access (applies to all buckets in the account):
aws s3control put-public-access-block \
  --account-id 123456789012 \
  --public-access-block-configuration \
    BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
  # Account-level settings are the stronger control — bucket settings cannot override them
```

### Console Walkthrough: Configure S3 Security on a New Bucket

Navigate to **S3** and click **Create bucket**.

**Block Public Access**: Under "Block Public Access settings for this bucket," all four checkboxes are checked by default. Leave them checked unless this bucket explicitly needs to be publicly accessible. If you need to uncheck any setting, AWS displays a warning reminding you of the risk.

**Default encryption**: Under "Default encryption," select **Server-side encryption with Amazon S3 managed keys (SSE-S3)** for the default baseline. Select **Server-side encryption with AWS Key Management Service keys (SSE-KMS)** and specify a KMS key ARN if you need KMS audit trails or cross-account key management. Enable **Bucket Key** to reduce KMS API costs.

After bucket creation, apply a bucket policy: click the bucket, then the **Permissions** tab. Under **Bucket policy**, click **Edit** and paste your JSON policy. The policy editor includes a built-in linter that validates JSON syntax and highlights common errors like missing ARN wildcards.

To enable access logging: on the **Properties** tab, click **Edit** under **Server access logging**. Enable logging and specify a target bucket (must be in the same Region). Use a log file prefix to keep logs organized.

To enable CloudTrail data events: navigate to **CloudTrail** in the console, open your trail, and under **Data events**, add an S3 data event with the bucket ARN. This is separate from S3 and requires a CloudTrail trail to be configured.

## How to Decide

Use these criteria to select S3 security controls for a given scenario:

1. **Does the bucket need any public access?** If no, confirm all four Block Public Access settings are enabled at both the bucket and account level. If yes, disable only the specific BPA settings required for the public use case and write the minimum-required bucket policy granting public access.

2. **Does access need to be granted to principals outside your AWS account?** Use a bucket policy with explicit Principal ARNs for the external accounts or roles. Remember that cross-account access requires allows on both sides (bucket policy in the destination account AND IAM policy in the source account).

3. **Does the use case require sharing a specific object with a non-AWS user without making the bucket public?** Generate a presigned URL. Use role credentials if the sharing window is under 12 hours; use user credentials only if you need up to 7 days and understand the security implications of long-term credentials.

4. **What encryption standard applies?** Default SSE-S3 satisfies most baseline requirements. Choose SSE-KMS when you need auditable key usage, documented key rotation, or the ability to revoke access by disabling a key. Choose SSE-C only when your security policy mandates that AWS never hold key material. Choose client-side encryption only when data must be encrypted before leaving your network.

5. **Does application traffic to S3 need to stay on the AWS private network?** Create a VPC Gateway Endpoint for S3 and add a bucket policy Deny condition using `aws:sourceVpce` to enforce that all access goes through the endpoint. This prevents data exfiltration via compromised credentials used from outside the VPC.

6. **What audit depth is required?** Enable S3 server access logs for request-level visibility at no per-call cost. Enable CloudTrail S3 data events for IAM-identity-linked API audit trails on buckets with sensitive or regulated data.

## How This Connects

- **CloudFront and S3 Origin Access Control (OAC)**: The modern pattern for serving S3 content through CloudFront uses an Origin Access Control identity rather than public bucket access. OAC uses SigV4 signing from CloudFront to S3 and requires a bucket policy that grants CloudFront's service principal access. Block Public Access stays fully enabled, and S3 content is only accessible through CloudFront — not directly.

- **AWS KMS and SSE-KMS**: SSE-KMS bucket encryption integrates with KMS key policies, key grants, and CloudTrail KMS data events. Understanding that KMS generates data encryption keys that encrypt object data (not the KMS key itself) is important for cost estimation — every PUT and GET on an SSE-KMS object generates a KMS API call unless Bucket Key is enabled.

- **VPC and PrivateLink**: While VPC Gateway Endpoints for S3 are free and route table-based, some access patterns (like from on-premises environments or from a specific VPC that cannot modify its route tables) use S3 Interface Endpoints via PrivateLink. Interface Endpoints have hourly and data processing fees. Understanding when each type applies is relevant to network architecture questions.

- **IAM and Service Control Policies**: In AWS Organizations, SCPs can enforce S3 security baselines across all accounts — for example, an SCP can prevent any account in the organization from disabling Block Public Access at the account level. Understanding that SCPs layer on top of bucket policies and IAM policies is essential for enterprise-scale S3 security design.

- **Macie and S3 data classification**: Amazon Macie automatically scans S3 buckets for sensitive data (PII, credentials, financial information) and reports on findings. Macie requires S3 access through its service role and bucket policies must allow Macie's service principal. S3 security configuration directly gates what Macie can discover and alert on.

## Exam Traps

**Trap 1: A bucket policy granting public access makes the bucket public even if Block Public Access is enabled.** This is false. Block Public Access overrides bucket policies and ACLs. If BPA is enabled (specifically `RestrictPublicBuckets`), a bucket policy that grants `"Principal": "*"` access will not result in public access — S3 restricts the bucket to the owner and AWS services only. BPA must be explicitly disabled for the bucket policy's public grant to take effect.

**Trap 2: Presigned URL expiration is set when the URL is generated and cannot be changed.** True — the expiration is baked into the URL signature. But a presigned URL can be effectively invalidated before expiration by revoking the IAM role's permissions or by deleting the role entirely. S3 evaluates the signing identity's current permissions at request time; if the role no longer has `s3:GetObject`, the URL returns 403 immediately even if it has not expired. Do not assume a presigned URL remains valid for its full lifetime in all scenarios.

**Trap 3: SSE-KMS is always more secure than SSE-S3.** Both use AES-256 and both protect data at rest effectively. SSE-KMS adds key management capabilities — not stronger underlying encryption. The choice between them is about key custody, auditability, and operational control, not about the strength of the encryption algorithm. Describing SSE-KMS as "stronger encryption" is inaccurate.

**Trap 4: Cross-account bucket access only requires a bucket policy.** For cross-account S3 access, both sides must allow the action. The bucket policy in Account B must allow Account A's role, AND Account A's IAM policy must allow the role to perform S3 actions on Account B's bucket. If either permission is missing, access is denied. Exam scenarios that show a bucket policy granting cross-account access but describe continued access denied errors are usually pointing to the missing IAM policy on the source account side.

**Trap 5: VPC Gateway Endpoints for S3 cost money like Interface Endpoints do.** VPC Gateway Endpoints for S3 and DynamoDB are free. There is no hourly charge and no data processing charge. Interface Endpoints (used for most other services) use AWS PrivateLink and have both hourly and data fees. This distinction appears in cost optimization scenarios: using a Gateway Endpoint for S3 costs nothing and should always be preferred over routing S3 traffic through a NAT gateway, which does have data processing charges.

## Summary

- S3 security is layered: Block Public Access prevents accidental public exposure at the account and bucket level regardless of bucket policies; bucket policies control resource-level access including cross-account patterns; IAM policies control identity-level access.
- Block Public Access is enabled by default on new buckets and accounts and acts as an override that neutralizes any bucket policy or ACL granting public access until BPA is explicitly disabled.
- Cross-account S3 access requires explicit allows on both sides: the bucket policy in the destination account must allow the source account's role, and the source account's IAM policy must allow the role to access S3 resources in the destination account.
- Presigned URLs embed time-limited access credentials for a specific object; they expire after at most 12 hours for role credentials or 7 days for user credentials, and are invalidated immediately if the signing role's permissions are revoked.
- SSE-S3 (AES-256, default) satisfies baseline encryption requirements; SSE-KMS adds KMS audit trails, key rotation control, and the ability to revoke access by disabling a key; SSE-C requires the client to supply the key on every request and AWS never stores it.
- VPC Gateway Endpoints for S3 are free and enable private network access from VPC resources to S3 without internet routing; combining them with a bucket policy Deny on `aws:sourceVpce` enforces private-network-only access as a mandatory control.

## Examples

A company hosts a public marketing website using S3 static website hosting. To make this work, they must explicitly disable Block Public Access on the bucket and add a bucket policy granting `s3:GetObject` to `"Principal": "*"`. The fact that BPA is on by default and requires two deliberate steps to disable is intentional — AWS designed BPA as a brake against accidentally exposing sensitive data to the public internet. The deliberate process of disabling BPA creates an audit trail (in CloudTrail) showing that a named IAM identity made a conscious choice to enable public access.

A software vendor's processing role in Account A needs to read customer data stored in Account B's S3 bucket. The customer writes a bucket policy in Account B explicitly granting Account A's role `s3:GetObject`. The vendor also confirms that Account A's IAM policy permits the processing role to access external S3 buckets. Both permissions must be present for the access to work — removing either one results in 403 Access Denied. This cross-account S3 pattern illustrates the two-sided permission requirement: bucket policy plus IAM policy, both allowing the same operation, before the request succeeds.

A media company wants to let premium subscribers download full-resolution video files on demand without making the S3 bucket public. Their backend generates a presigned URL scoped to the specific object, valid for 15 minutes, signed with the application's IAM role credentials. The subscriber's browser downloads the file directly from S3 — no proxy server, no egress bottleneck through the application tier. The presigned URL expires before a casual attacker could share it widely, and access is controlled per-subscriber without any change to bucket permissions. When the subscription is cancelled, the application simply stops generating presigned URLs for that subscriber — no bucket policy change, no IAM policy change, just a code path that no longer executes.

## Think About It

1. A bucket policy grants `Allow` for `s3:GetObject` to all users, but Block Public Access is enabled on the bucket. What access do anonymous internet users have, and why? What would you need to change to make the bucket actually publicly accessible?

2. Why does AWS make the secure configuration (Block Public Access on, no public ACLs, SSE-S3 default encryption) the out-of-the-box default for new buckets? What does this design philosophy tell you about the failure modes AWS observed in the early years of S3?

3. SSE-KMS costs more per API call than SSE-S3. Under what specific security or compliance requirements would the extra cost be justified? What capabilities does SSE-KMS provide that SSE-S3 does not, and how would you document those justifications for an internal security review?

4. A presigned URL gives temporary access to a private object. What happens if the IAM role that generated the URL is deleted before the URL expires? What does this tell you about how presigned URLs actually verify authorization, and what are the implications for URL lifetime management?

5. You have a bucket storing sensitive PII that should only be accessed by EC2 instances inside your VPC. What combination of VPC endpoints, bucket policy conditions, and IAM policies would you use to enforce this requirement, and how would you verify that access from outside the VPC is actually blocked?

## Quick Check

**Q1.** An S3 bucket policy grants `"Principal": "*"` access for `s3:GetObject`, but all requests from anonymous internet users still receive a 403 Access Denied error. What is the most likely cause?

- A) The IAM policy on the requesting user's role overrides the bucket policy allow
- B) Block Public Access is enabled at the bucket or account level, overriding the public bucket policy
- C) S3 Standard buckets do not support anonymous public access for GET requests
- D) Public access requires a separate CloudFront distribution to be configured as an intermediary

**Answer: B** — Block Public Access (specifically `RestrictPublicBuckets`) acts as an override that prevents bucket policies granting public access from taking effect. The bucket policy is present but neutralized by BPA. BPA must be explicitly disabled — on both the bucket and the account — for the public grant to take effect.

**Q2.** Which S3 encryption option requires the client to supply the encryption key with every individual request, and AWS never stores the key material?

- A) SSE-S3
- B) SSE-KMS
- C) SSE-C
- D) Client-side encryption

**Answer: C** — SSE-C (Server-Side Encryption with Customer-Provided Keys) requires the client to include the encryption key in the HTTPS request header for every PUT and GET. AWS uses the key to encrypt or decrypt the object and then discards it. AWS never stores the key. If the client loses the key, the encrypted data is permanently inaccessible.

**Q3.** What is the maximum validity period for a presigned URL generated using an IAM role's temporary credentials?

- A) 1 hour
- B) 12 hours
- C) 7 days
- D) 30 days

**Answer: B** — Presigned URLs generated from IAM role credentials (temporary STS credentials) can be valid for a maximum of 12 hours, limited by the maximum duration of the underlying temporary credentials. Long-term IAM user access key credentials can generate presigned URLs valid for up to 7 days. AWS recommends using role credentials despite the 12-hour limit because temporary credentials are inherently safer than long-term access keys.

## What's Next

Next up: S3 Replication — how to automatically copy objects across buckets and Regions for disaster recovery, compliance, and latency reduction.
