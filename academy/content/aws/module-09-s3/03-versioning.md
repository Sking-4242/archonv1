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

## Examples

A startup's developer accidentally runs a script that overwrites 500 product description files in their S3 bucket with empty strings. With versioning enabled, each overwrite created a new version — the previous content versions are still stored. The developer restores all 500 files in minutes by copying the previous version IDs back to the current version. Without versioning, the data would have been unrecoverable because S3 does not keep a "trash" by default.

A healthcare company stores patient intake forms in a versioned S3 bucket and configures a lifecycle rule to expire noncurrent versions after 180 days, retaining only the 3 most recent noncurrent versions of any form. This controls storage growth: a heavily revised form doesn't accumulate unbounded history, but the company still has a meaningful recent audit trail. This is the cost-management pattern for versioning — retention rules that balance compliance needs against bill shock.

A publicly traded company must comply with SEC Rule 17a-4, which requires records to be unalterable for a defined period. They enable S3 Object Lock in Compliance mode with a 7-year retention period on their communications archive bucket. Even the AWS root account cannot delete these objects before retention expires. An IT admin trying to clean up disk space would be unable to remove records prematurely — the lock is enforced at the storage layer, not just by policy. This is WORM compliance implemented at infrastructure level rather than trusting application-layer controls.

## Think About It

1. Why does S3 implement deletion as a "delete marker" instead of actually removing the object when versioning is enabled? What problem does this design solve, and what new problem does it introduce?
2. If every version of an object is stored and billed as a full copy, what would happen to your S3 bill if you enabled versioning on a bucket where a CI/CD pipeline writes a new artifact every 5 minutes, 24/7? How would you design your lifecycle rules to control this?
3. MFA Delete requires the root account to enable it. Why do you think AWS restricts this to root, and what does that tell you about the threat model MFA Delete is defending against?
4. Object Lock Governance mode can be overridden by users with special IAM permissions, while Compliance mode cannot be overridden by anyone. In what business scenario would you choose Governance over Compliance, and what risk are you accepting?
5. What would happen if you restored an old version of a configuration file that an application was actively using? How would you design a versioned S3 workflow to safely promote a previous version to "current" without causing a production incident?

## Quick Check

**Q1.** In a versioned S3 bucket, what happens when you issue a DELETE request on an object key without specifying a version ID?
- A) The object and all its versions are permanently deleted
- B) The most recent version is permanently removed
- C) A delete marker is placed on the key, making the object appear deleted
- D) The DELETE is rejected until you specify a version ID

**Answer: C** — Without a version ID, DELETE places a delete marker; all previous versions remain and can be recovered by deleting the marker or specifying an old version ID.

**Q2.** Which S3 Object Lock mode prevents deletion even by the AWS root account before the retention period expires?
- A) Governance mode
- B) Compliance mode
- C) Legal Hold mode
- D) Strict mode

**Answer: B** — Compliance mode enforces the retention period absolutely; no user, including root, can delete or overwrite the object before the period expires, making it suitable for strict regulatory mandates.

**Q3.** What is a key cost consideration when enabling S3 Versioning on a frequently updated bucket?
- A) Versioning doubles your API call costs
- B) Each version is stored and billed as a full object, multiplying storage costs
- C) Versioned buckets cannot use lifecycle policies
- D) Versioning incurs a per-version metadata fee

**Answer: B** — Every version of an object is billed as a complete stored object; a 1 GB file updated 10 times consumes 10 GB of billable storage unless lifecycle rules expire old versions.

## What's Next

Next up: S3 Security — bucket policies, ACLs, Block Public Access, and encryption options.