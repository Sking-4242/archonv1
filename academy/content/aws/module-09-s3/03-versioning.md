---
title: "S3 Versioning and Object Lock"
type: content
estimated_minutes: 8
cert_tags: ["SAA-C03", "CLF-C02"]
---

# S3 Versioning and Object Lock

## Overview

Versioning preserves every version of an object in a bucket, protecting against accidental deletes and overwrites. Object Lock extends this into immutable storage suitable for compliance requirements like SEC 17a-4 and WORM (Write Once Read Many) mandates.

## How Versioning Works

When versioning is enabled, every PUT to an existing key creates a new version with a unique version ID instead of overwriting the data. A DELETE places a delete marker — the object appears deleted but all versions remain. You can permanently delete by specifying the version ID. Versioning is bucket-level; once enabled it can be suspended but never fully disabled.

## Version Costs and Management

Every version is billed as a full object. A 1 GB file updated 10 times consumes 10 GB of storage. Use lifecycle rules to expire noncurrent versions after N days to control costs. A common pattern: retain the 3 most recent noncurrent versions and expire all older ones.

## MFA Delete

MFA Delete requires a valid MFA token to permanently delete a version or change versioning state. This protects against accidental or malicious mass deletion. Only the bucket owner (root account) can enable MFA Delete, and it requires versioning to be enabled first.

## S3 Object Lock

Object Lock prevents object versions from being deleted or overwritten for a fixed retention period or indefinitely. Two modes: Governance (users with special IAM permissions can override) and Compliance (no one, including root, can delete before retention expires). Retention periods are set per object or at the bucket level as a default. Object Lock must be enabled at bucket creation.

## Summary

Versioning protects every object version, turning deletes into recoverable markers. Object Lock adds WORM compliance. Use lifecycle rules to manage version accumulation costs. Together, versioning and Object Lock are foundational for any backup or compliance architecture on AWS.

## What's Next

Next up: S3 Security — bucket policies, ACLs, Block Public Access, and encryption options.