---
title: "S3 Security: Policies, Encryption, and Access Control"
type: content
estimated_minutes: 12
cert_tags: ["SAA-C03", "SAP-C02", "CLF-C02"]
---

# S3 Security: Policies, Encryption, and Access Control

## Overview

S3 has multiple security layers: IAM policies, bucket policies, Access Control Lists, Block Public Access settings, and encryption at rest and in transit. Getting S3 security right is critical — misconfigured buckets are one of the most common sources of cloud data breaches.

## IAM Policies vs. Bucket Policies

IAM policies attach to identities (users, roles) and control what S3 actions they can perform. Bucket policies attach to the bucket and control who can access it — including cross-account principals and AWS services. Both use the same Allow/Deny/Principal/Action/Resource/Condition JSON syntax. When both exist, the effective permission is the union of both, except an explicit Deny always wins.

## Block Public Access

Block Public Access (BPA) is a bucket-level (and account-level) override that prevents any bucket policy or ACL from granting public access, regardless of what the policy says. BPA has four settings: BlockPublicAcls, IgnorePublicAcls, BlockPublicPolicy, and RestrictPublicBuckets. AWS enables all four by default for new buckets. Leave BPA on unless you explicitly need a public bucket (e.g., static website hosting).

## S3 Encryption

S3 offers four encryption options: SSE-S3 (AWS manages keys, AES-256, default), SSE-KMS (you manage keys via AWS KMS, with audit trail and rotation), SSE-C (you provide the key per request, AWS does not store it), and client-side encryption (encrypt before uploading). SSE-S3 is now the default for new objects. SSE-KMS adds a cost per API call but gives you control and CloudTrail audit logging of every key usage.

## Presigned URLs

A presigned URL lets you share access to a private object without changing bucket permissions. The URL contains the requester's credentials and expires after a set time (up to 12 hours for IAM roles, 7 days for user credentials). Use presigned URLs for time-limited downloads, form uploads, or sharing objects with external users without making the bucket public.

## S3 Access Logs and CloudTrail

S3 server access logs record every request made to a bucket — useful for audit and security analysis. CloudTrail data events capture S3 API calls at the API level including who made the call, from where, and with what result. Enable CloudTrail data events for sensitive buckets; use Athena or S3 Select to query logs at scale.

## Summary

S3 security is layered: IAM controls identity, bucket policies control resource access, Block Public Access prevents accidental exposure, and encryption protects data at rest. Presigned URLs enable controlled sharing without opening buckets. Enable CloudTrail data events for sensitive data and always leave Block Public Access on by default.

## Examples

A company hosts a public marketing website using S3 static website hosting. To make this work, they must explicitly disable Block Public Access on the bucket and add a bucket policy granting `s3:GetObject` to `"Principal": "*"`. The fact that BPA is on by default and requires two deliberate steps to disable is intentional — AWS designed BPA as a brake against accidentally exposing sensitive data to the public internet, not an obstacle to legitimate public hosting.

A software vendor sells a product that lets customers analyze their own data stored in S3. The vendor's processing role is in Account A, but the data is in Account B. The customer writes a bucket policy in Account B that grants Account A's role specific `s3:GetObject` permissions. Account A's IAM policy also permits the role to access external S3 buckets. Both must allow the access for it to work — this cross-account S3 access pattern illustrates the union-of-policies rule and why the exam tests both sides of the permission chain.

A media company wants to let premium subscribers download full-resolution video files on demand without making the S3 bucket public. Their backend generates a presigned URL scoped to the specific object, valid for 15 minutes, signed with the application's IAM role credentials. The subscriber clicks a download link and gets the file directly from S3 — no proxy server, no egress bottleneck through the application tier. The presigned URL expires before a casual attacker could share it widely, and revocation is simply a matter of not generating new URLs. This pattern scales to millions of users without changing bucket permissions.

## Think About It

1. A bucket policy grants `Allow` for `s3:GetObject` to all users, but an IAM policy attached to a specific user explicitly `Deny`s `s3:GetObject` on the same bucket. What access does that user have, and why? What does this tell you about the precedence of Deny in AWS policy evaluation?
2. Why does AWS enable all four Block Public Access settings by default on new buckets rather than requiring you to opt in? What does this design philosophy reveal about the failure modes AWS is trying to prevent?
3. SSE-KMS costs more per API call than SSE-S3. Under what specific security or compliance requirements would the extra cost of SSE-KMS be justified, and what additional capability does it give you that SSE-S3 does not?
4. A presigned URL gives temporary access to a private object. What happens if the IAM role that generated the URL is deleted before the URL expires? What does this tell you about how presigned URLs actually work?
5. What trade-offs would you consider when deciding between enabling S3 server access logs versus CloudTrail data events for auditing an S3 bucket that processes sensitive financial records?

## Quick Check

**Q1.** An S3 bucket policy grants public read access, but all requests from outside the AWS network still receive an Access Denied error. What is the most likely cause?
- A) The IAM policy on the requesting user overrides the bucket policy
- B) Block Public Access is enabled at the bucket or account level
- C) S3 standard buckets do not support public access
- D) Public access requires a separate CloudFront distribution

**Answer: B** — Block Public Access acts as an override that prevents bucket policies or ACLs from granting public access regardless of what those policies say; it must be explicitly disabled for public access to work.

**Q2.** Which S3 encryption option requires you to supply the encryption key with every request, and AWS never stores the key?
- A) SSE-S3
- B) SSE-KMS
- C) SSE-C
- D) Client-side encryption

**Answer: C** — SSE-C (Server-Side Encryption with Customer-Provided Keys) has AWS perform the encryption/decryption using a key you provide per request, but AWS discards the key after each operation and never stores it.

**Q3.** What is the maximum validity period for a presigned URL generated using an IAM role?
- A) 1 hour
- B) 12 hours
- C) 7 days
- D) 30 days

**Answer: B** — Presigned URLs generated from IAM role credentials (temporary security credentials) can be valid for a maximum of 12 hours; URLs from long-term IAM user credentials can last up to 7 days.

## What's Next

Next up: S3 Replication — how to copy objects across buckets and regions automatically.