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

## What's Next

Next up: EFS — managed NFS for shared file storage across multiple instances and AZs.