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

## What's Next

Next up: S3 Replication — how to copy objects across buckets and regions automatically.