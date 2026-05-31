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

## Examples

A startup running a PostgreSQL RDS instance accidentally executes a `DELETE FROM orders WHERE 1=1` command on the production database — wiping the entire orders table. Because automated backups are enabled with a 7-day retention period and transaction logs are captured every 5 minutes, the DBA uses PITR to restore the database to the exact second before the bad query ran. The restore creates a new RDS instance; the team updates the connection string and resumes normal operations within 30 minutes. This is the textbook PITR recovery scenario that automated backups enable.

A compliance team at a financial company needs to retain database snapshots for 7 years to satisfy audit requirements. Since automated backups only retain for up to 35 days, they run a monthly Lambda function that triggers a manual DB snapshot and tags it with a retention date. These snapshots persist independently of the RDS instance and survive even if the database is deleted. This illustrates how manual snapshots fill the gap for long-term archival that automated backups cannot cover.

A company running RDS in us-east-1 needs a regional disaster recovery strategy. They implement automated snapshot replication to us-west-2 so that a complete regional failure in us-east-1 can be recovered by restoring the latest copied snapshot in the backup region. They document the expected RTO — the time to restore a snapshot and update DNS — and test it quarterly. This shows that cross-region snapshot copy is a deliberate, tested design decision, not a passive safety net.

## Think About It

1. Automated backups are deleted when the DB instance is deleted by default. Why might that default behavior cause a serious incident, and what configuration change prevents it?
2. Restoring from a snapshot always creates a new RDS instance with a new endpoint. What downstream systems and configurations in your application would need to be updated after a restore, and how might you automate that process?
3. If your RTO requires recovering a 5 TB database within 2 hours, what factors about snapshot restore would you need to test in advance to know whether that target is achievable?
4. What is the difference in RPO between automated backup PITR and restoring from a manual snapshot taken 24 hours ago? When would each be the right choice?
5. Why must you copy an encrypted snapshot with a KMS key accessible in the destination region? What does this imply about your key management strategy for cross-region DR?

## Quick Check

**Q1.** What is the maximum retention period for RDS automated backups?
- A) 7 days
- B) 14 days
- C) 35 days
- D) 90 days

**Answer: C** — Automated backups can be retained for 1 to 35 days; anything beyond that requires manual snapshots.

**Q2.** You delete an RDS instance and later realize you need to recover data from it. Which backup type allows recovery if you did NOT enable the "Retain automated backups" option?
- A) Automated backups, because they are stored in S3 independently
- B) Manual DB snapshots, because they persist until explicitly deleted
- C) Transaction logs, because they are stored separately in CloudWatch
- D) Neither — once the instance is deleted, all backups are lost

**Answer: B** — Manual DB snapshots are retained independently of the DB instance lifecycle and survive deletion, making them the safety net for this scenario.

**Q3.** A developer wants to recover a database to the state it was in at 2:47 PM yesterday. Which RDS feature supports this?
- A) DB Snapshot restore to a timestamp
- B) Point-in-Time Recovery using automated backups and transaction logs
- C) Cross-Region Snapshot Copy
- D) Read Replica promotion

**Answer: B** — PITR combines daily automated snapshots with 5-minute transaction log captures to allow recovery to any specific second within the retention window.

## What's Next

Next up: Amazon Aurora — AWS's cloud-native, MySQL/PostgreSQL-compatible database engine.