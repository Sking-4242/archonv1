---
title: "RDS Backups, Snapshots, and PITR"
type: content
estimated_minutes: 8
cert_tags: ["SAA-C03", "CLF-C02"]
---

# RDS Backups, Snapshots, and PITR

## Overview

RDS provides two backup mechanisms: automated backups (enabled by default, stored in S3, supporting point-in-time recovery) and manual DB snapshots (user-initiated, retained until explicitly deleted). Understanding both is required for designing RDS-based recovery strategies.

## Automated Backups

Automated backups run daily during a maintenance window and capture transaction logs every 5 minutes. This enables Point-in-Time Recovery (PITR) to any second within the retention period (1–35 days). Automated backups are stored in S3 (managed by AWS, not visible in your buckets). They are deleted when the DB instance is deleted — unless you enable the 'Retain automated backups' option on deletion.

## DB Snapshots

Manual snapshots are user-initiated EBS volume snapshots that persist until you delete them. Unlike automated backups, they survive DB instance deletion. Create a snapshot before major changes (engine upgrades, schema migrations), for compliance archiving, or before deleting a database. Restoring from a snapshot creates a new DB instance — you cannot restore in-place.

## Cross-Region Snapshot Copy

Automated backups stay in the source region. For regional DR, you must manually copy snapshots to another region (or use automated backup replication for RDS). Shared snapshots can be copied across accounts. Encrypted snapshots require the KMS key to be accessible in the destination region.

## Restoring from Backup

Restoring creates a new RDS instance with a new endpoint. You must update your application's database endpoint, restore any parameter group and option group customizations, and re-apply any security group rules. PITR restores to the latest restorable time or a specific second — useful for recovering from accidental data deletion.

## Summary

Automated backups enable PITR for the retention period. Manual snapshots persist indefinitely and are your safety net before major changes. Cross-region snapshot copy enables regional DR for RDS. Always test your restore process — a backup you can't restore isn't a backup.

## What's Next

Next up: Amazon Aurora — AWS's cloud-native, MySQL/PostgreSQL-compatible database engine.