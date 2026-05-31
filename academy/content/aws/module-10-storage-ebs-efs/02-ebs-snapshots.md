---
title: "EBS Snapshots and Data Lifecycle Manager"
type: content
estimated_minutes: 8
cert_tags: ["SAA-C03", "CLF-C02"]
---

# EBS Snapshots and Data Lifecycle Manager

## Overview

EBS Snapshots are incremental backups stored in S3 that can be used to restore volumes, create AMIs, or copy data across regions and accounts. Data Lifecycle Manager (DLM) automates snapshot creation and retention so you never have to manage backup schedules manually.

## How Snapshots Work

The first snapshot of a volume captures all used blocks. Subsequent snapshots are incremental — only blocks that changed since the last snapshot are stored. Despite this, each snapshot appears as a full standalone backup; you can delete intermediate snapshots without affecting others. Snapshots are stored in S3 (AWS-managed, not visible in your buckets) and billed per GB of changed data.

## Creating Volumes from Snapshots

You can create a new EBS volume from any snapshot, in any AZ within the same region. The new volume is immediately usable but data is loaded lazily from S3 in the background — performance is lower until all blocks are warmed up. Enable Fast Snapshot Restore (FSR) to pre-warm the volume and get full performance immediately after creation (incurs additional cost).

## Cross-Region and Cross-Account Copy

Snapshots can be copied to other regions for DR purposes. Cross-account sharing requires you to modify the snapshot permissions to allow the target account, which can then copy the snapshot into its own account. Encrypted snapshots can only be shared if the encryption key is also shared — or you re-encrypt with a key accessible to the target account.

## Data Lifecycle Manager (DLM)

DLM automates EBS snapshot and AMI creation on a schedule. You define a lifecycle policy: target resources by tag, set a frequency (every N hours, daily at a specific time), and set a retention count or age. DLM automatically deletes old snapshots per the retention rule. This replaces custom Lambda backup scripts for most use cases.

## Summary

EBS Snapshots are incremental S3-backed backups that can restore volumes or seed new ones across regions. Fast Snapshot Restore eliminates cold-start latency. DLM automates backup schedules and retention. Snapshots are the foundation of EBS-based DR strategies.

## Examples

A SaaS company runs a production PostgreSQL database on an EC2 instance and wants nightly backups without manual intervention. They create a DLM lifecycle policy that tags volumes with `Environment: production`, runs a snapshot at 02:00 UTC daily, and retains the last 14 snapshots. When a developer accidentally drops a table, the team restores from the previous night's snapshot in minutes. This is the entry-level snapshot use case: automated incremental backups with zero operational overhead.

A media company stores video rendering outputs on EBS volumes in us-east-1. Their DR plan requires that critical data be recoverable from eu-west-1 within four hours of a regional failure. They configure DLM to copy every daily snapshot to eu-west-1 automatically. Because the snapshots are incremental, only the changed blocks cross the wire each day — keeping cross-region data transfer costs manageable even for large volumes. The lesson here is that cross-region copy is a cost-aware DR technique, not just a checkbox.

A gaming platform spins up new application server fleets during peak events (game launches, esports finals) from a golden AMI backed by an EBS snapshot. Without Fast Snapshot Restore, the first few minutes of each new instance's life suffer degraded I/O while blocks are lazily loaded from S3. They enable FSR in the specific AZs where their fleet launches, paying the per-snapshot-per-AZ cost only for those snapshots. This illustrates the real trade-off behind FSR: you pay to pre-warm capacity, so it only makes sense for snapshots you restore frequently at scale.

## Think About It

1. EBS snapshots are incremental, yet each snapshot behaves as a complete, restorable backup. How does AWS achieve this apparent contradiction, and what does it mean for your costs when you delete an intermediate snapshot?
2. What would happen if you restored a large EBS volume from a snapshot and immediately ran a database benchmark against it, without enabling Fast Snapshot Restore? Why would performance differ from a volume that has been running for hours?
3. You need to share an encrypted EBS snapshot with a partner AWS account. What two things must be true for the partner account to successfully use that snapshot, and why does encryption add this complication?
4. How would you decide whether to build a custom Lambda-based snapshot automation versus using Data Lifecycle Manager? What capabilities would push you toward the custom approach?
5. A DLM policy retains 7 snapshots at daily frequency. If a silent corruption occurs on day 3 and isn't discovered until day 10, what is the consequence — and how would you design a retention policy to guard against this scenario?

## Quick Check

**Q1.** You create a new EBS volume from a snapshot and immediately start your application. What performance characteristic should you expect?
- A) Full performance immediately, because EBS pre-warms all volumes
- B) Slightly reduced performance until all blocks are lazily loaded from S3 in the background
- C) No performance impact, as the snapshot is deleted after restore
- D) Degraded performance permanently, requiring a manual initialization step

**Answer: B** — When restoring from a snapshot, blocks are loaded lazily from S3, causing lower performance until all blocks are warmed; Fast Snapshot Restore can eliminate this.

**Q2.** Which statement best describes how DLM simplifies EBS backup management?
- A) It replaces EBS snapshots with a proprietary backup format stored in Glacier
- B) It requires manual snapshot scheduling via EventBridge rules
- C) It automates snapshot creation, cross-region copy, and retention deletion based on tag-driven lifecycle policies
- D) It only works for volumes attached to EC2 instances, not unattached volumes

**Answer: C** — DLM automates the full snapshot lifecycle — creation, optional cross-region copy, and retention-based deletion — based on resource tags and a defined schedule.

**Q3.** What is required to share an encrypted EBS snapshot with another AWS account?
- A) Nothing extra — encrypted snapshots are shareable like any other snapshot
- B) The snapshot must be decrypted before sharing
- C) The target account must be in the same region
- D) The snapshot's KMS key must also be shared with the target account

**Answer: D** — The target account needs access to the KMS key used to encrypt the snapshot; without key access, the account cannot decrypt and use the snapshot.

## What's Next

Next up: EFS — managed NFS for shared file storage across multiple instances and AZs.