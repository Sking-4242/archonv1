---
title: "RDS Backups, Snapshots, and Point-in-Time Recovery"
type: content
estimated_minutes: 20
cert_tags: ["SAA-C03", "SAP-C02", "CLF-C02"]
---

# RDS Backups, Snapshots, and Point-in-Time Recovery

## Overview

Every production database needs a backup strategy that can answer two questions precisely: what is your Recovery Point Objective (RPO — how much data can you afford to lose?) and what is your Recovery Time Objective (RTO — how long can you be down?). RDS provides two backup mechanisms designed for different parts of this problem. Automated backups, enabled by default, combine daily snapshots with continuous transaction log capture to enable Point-in-Time Recovery (PITR) to any second within the retention window — giving you the finest possible RPO for a running database. Manual DB snapshots are user-initiated and persist indefinitely, making them the right tool for long-term archival, pre-change safety nets, and cross-account sharing.

Understanding how each mechanism works at a technical level matters because the exam tests the details — not just "automated backups exist." Transaction logs are captured every 5 minutes. Automated backups are stored in S3 managed by AWS but are NOT visible in your S3 buckets. Storage for automated backups is free up to the size of your provisioned DB storage. Restoring from any backup — automated or manual — always creates a new RDS instance with a new endpoint; there is no in-place restore. Every downstream system that connects to your database by endpoint must be updated after a restore.

Beyond the core backup mechanisms, this lesson covers three important extension patterns. Cross-region snapshot copy is the primary tool for achieving regional disaster recovery for RDS. RDS Blue/Green Deployments provide a safe mechanism for major version upgrades — cloning production, validating, and switching over in under a minute. RDS Export to S3 allows you to export snapshot data in Parquet format for analytics workloads using Athena or other tools without impacting the production database. These features together represent a complete data protection and lifecycle management strategy for relational databases on AWS.

## Core Concepts

### Automated Backups and Transaction Log Capture

Automated backups are the foundation of RDS data protection. When automated backups are enabled (the default, with a 1-day retention), RDS takes a daily full snapshot during the configured backup window and captures transaction logs every 5 minutes throughout the day. These logs are stored in S3 managed entirely by AWS — the buckets are not visible in your account's S3 console and cannot be browsed directly.

The combination of daily snapshots and 5-minute transaction log intervals is what enables PITR to any specific second within the retention window. To restore to 2:47:33 PM yesterday, RDS finds the most recent snapshot before that time, restores it to a new instance, and then replays transaction logs forward to the exact target second. This is the same mechanism used by managed database services universally — snapshot + WAL/binlog replay.

The retention period is configurable from **1 to 35 days**. A setting of 0 disables automated backups entirely — never do this in production. For most production databases, 7 days is a reasonable default. Extend to 35 days for workloads where compliance, regulatory requirements, or the nature of data corruption (which may not be discovered for weeks) justify longer windows.

Storage for automated backups is **free up to the size of your provisioned storage**. A 100 GB RDS instance gets 100 GB of automated backup storage at no charge. If your backups exceed that (common when retention > 1 day), you pay the standard S3 rate for the overage. This is a cost factor to monitor as retention periods grow.

Critical behavior: **automated backups are deleted when the DB instance is deleted** unless you explicitly enable "Retain automated backups" on the deletion workflow. This is a default behavior that has caused real production incidents. If you delete an RDS instance and need to recover data from it, automated backups will be gone. Manual snapshots are the protection against this.

### Manual DB Snapshots

Manual DB snapshots are user-initiated EBS volume snapshots of your RDS instance. Unlike automated backups, they are **retained until you explicitly delete them** — they survive DB instance deletion, account reconfigurations, and the passage of time. This persistence makes them the right tool for three specific use cases:

1. **Pre-change safety nets**: Take a manual snapshot before a schema migration, major version upgrade, or any change that could corrupt data. If the change goes wrong, restore from the snapshot.
2. **Long-term compliance archival**: Regulations that require retaining data for 7 years cannot be met with 35-day automated backup retention. A monthly automated Lambda trigger creating manual snapshots and tagging them with retention metadata solves this.
3. **Sharing across accounts or regions**: Manual snapshots can be shared with other AWS accounts (for handoffs, testing, or multi-account architectures) or copied to other regions for DR.

Taking a manual snapshot is a fast, non-blocking operation for Multi-AZ instances because it runs against the standby. For single-AZ instances, there may be a brief I/O suspension during snapshot initiation — typically a few seconds. Size the backup window and snapshot timing accordingly.

### Cross-Region Snapshot Copy

Automated backups are stored in the source region only. To achieve regional disaster recovery, you must explicitly copy snapshots to another region. This is not automatic — you configure it either via manual copy operations or by enabling **automated backup replication** (a per-region setting in RDS that replicates automated backups continuously to a target region).

When copying an encrypted snapshot to another region, the destination region must have a KMS key accessible to RDS, and you must specify it in the copy command. The destination snapshot will be encrypted with the destination region's KMS key. If you use a customer-managed KMS key (CMK), you must create a matching key or a replica key in the destination region. If you use the AWS-managed `alias/aws/rds` key, that key exists automatically in every region.

Shared snapshots (shared from another AWS account) can also be copied to your own account and region. This is the mechanism for database handoffs between accounts — the source account shares the snapshot, the destination account copies it, and then creates a new instance from the copy.

### Restoring from Backup

This is one of the most exam-critical details about RDS: **restoring from any backup always creates a new DB instance**. There is no in-place restore. The new instance gets a new DNS endpoint. After a restore, you must:

- Update your application's database connection string to the new endpoint
- Re-apply any custom parameter group and option group associations (new instances default to the default parameter group)
- Re-apply security group rules to the new instance
- Reconfigure any monitoring or alerting integrations that reference the instance identifier or endpoint

For PITR, you specify a target time and RDS creates the new instance at that state. The "latest restorable time" is displayed in the console and is typically 5 minutes behind the current clock. For snapshot restores, you specify a snapshot ARN and RDS creates the new instance at the state captured in that snapshot.

The replace-endpoint-after-restore behavior is the main operational challenge of RDS DR. You should pre-build runbooks or automation (e.g., a Lambda function that updates an ECS environment variable or Secrets Manager secret with the new endpoint) to reduce RTO. DNS-based endpoint abstraction (using Route 53 CNAME pointing to the RDS endpoint, then updating the CNAME after restore) can reduce the blast radius.

### RDS Blue/Green Deployments

RDS Blue/Green Deployments are a managed feature for safe, low-risk major version upgrades and schema changes. AWS introduced this to solve the common problem of "I need to upgrade my database major version but I can't afford extended downtime or risk."

The mechanism: RDS creates a complete clone of your production database ("green"), including schema, data, and configuration. It sets up logical replication between the blue (production) and green (clone) environments so the clone stays current. You then perform your upgrade or change on the green environment — this can include major version upgrades (e.g., PostgreSQL 14 → 16), schema changes, or parameter group tuning. You test your application against the green environment for as long as needed. When ready, you initiate a **switchover** — RDS stops writes to blue, waits for replication to catch up, then flips the DNS endpoints so green becomes the new production. The switchover typically completes in **under 1 minute**, and the old blue environment is retained as a rollback point.

This is safer than in-place upgrades because: (a) the green environment is tested with real production data, (b) if the switchover fails, you simply discard the green environment and production is untouched, and (c) the switchover is faster than any migration-based approach because the data is already in place. The tradeoff is cost — you run two full database environments during the staging period.

### RDS Export to S3

RDS Export to S3 lets you export a DB snapshot to S3 in **Apache Parquet format**, partitioned by table. This is useful for analytics workloads that need to query RDS data using Athena, Redshift Spectrum, or EMR without placing load on the production database. The export runs from a snapshot (not the live instance), so it has zero production impact.

The export process: RDS reads the snapshot, converts to Parquet column files, and writes them to your S3 bucket with prefix-based table partitioning. You then create an Athena table pointing at the S3 prefix and query the data with standard SQL. The Parquet format is columnar, compressed, and highly efficient for analytics — far better than exporting to CSV.

## Configuration Reference

### AWS CLI: Create a Manual Snapshot

```bash
aws rds create-db-snapshot \
  --db-instance-identifier prod-postgres-01 \        # Source DB instance
  --db-snapshot-identifier prod-postgres-pre-migration-20240115 \  # Descriptive name with date
  --tags Key=Purpose,Value=pre-migration Key=RetainUntil,Value=2024-02-15
# The snapshot is an EBS-level copy — it captures the DB at the moment it's taken
# For Multi-AZ instances, the snapshot runs against the standby with no primary I/O impact
```

### AWS CLI: Restore to a Point in Time

```bash
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier prod-postgres-01 \   # Source instance to restore from
  --target-db-instance-identifier prod-postgres-restored-20240115 \  # NEW instance name
  --restore-time "2024-01-15T14:47:33Z" \              # ISO 8601 UTC timestamp; must be within retention window
  --db-instance-class db.m7g.large \                   # Can change instance class on restore
  --db-subnet-group-name prod-db-subnet-group \        # Required — specify the subnet group
  --vpc-security-group-ids sg-0abc123def456789 \       # Re-apply security groups
  --publicly-accessible false
# After restore completes, this instance has a NEW endpoint
# Update your application connection string to the new endpoint
# The source instance is unaffected — it keeps running
```

**Restore to the latest restorable time** (maximum data recovery):

```bash
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier prod-postgres-01 \
  --target-db-instance-identifier prod-postgres-latest-restore \
  --use-latest-restorable-time \     # Restore to the most recent transaction log position (approx 5 min ago)
  --db-instance-class db.m7g.large \
  --db-subnet-group-name prod-db-subnet-group \
  --vpc-security-group-ids sg-0abc123def456789
```

### AWS CLI: Restore from a Manual Snapshot

```bash
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier prod-postgres-restored-from-snap \
  --db-snapshot-identifier prod-postgres-pre-migration-20240115 \
  --db-instance-class db.m7g.large \
  --db-subnet-group-name prod-db-subnet-group \
  --vpc-security-group-ids sg-0abc123def456789 \
  --no-publicly-accessible
# Note: snapshot restore does NOT support point-in-time targeting
# You get the exact state at snapshot time — no transaction log replay after the snapshot
```

### AWS CLI: Copy a Snapshot Cross-Region

```bash
# Copy a snapshot from us-east-1 to us-west-2 for regional DR
aws rds copy-db-snapshot \
  --source-db-snapshot-identifier arn:aws:rds:us-east-1:123456789012:snapshot:prod-postgres-pre-migration-20240115 \
  --target-db-snapshot-identifier prod-postgres-dr-copy-20240115 \
  --source-region us-east-1 \             # Region of the source snapshot
  --region us-west-2 \                    # Destination region (run this command against us-west-2)
  --kms-key-id alias/aws/rds \            # KMS key in us-west-2; required for encrypted snapshots
  --copy-tags                             # Copy all tags from the source snapshot
```

### AWS CLI: Enable Automated Backup Replication to Another Region

```bash
# Enable automated backup replication — keeps automated backups current in backup region
aws rds enable-db-instance-automated-backups-replication \
  --source-db-instance-arn arn:aws:rds:us-east-1:123456789012:db:prod-postgres-01 \
  --backup-retention-period 7 \
  --kms-key-id alias/aws/rds \
  --region us-west-2
# This continuously replicates automated backups to us-west-2
# Enables PITR in us-west-2 — more current than manual snapshot copies
```

### AWS CLI: Create a Blue/Green Deployment

```bash
aws rds create-blue-green-deployment \
  --blue-green-deployment-name prod-postgres-pg16-upgrade \
  --source prod-postgres-01 \                         # Blue (production) instance ARN or identifier
  --target-engine-version 16.2 \                      # Desired engine version on green
  --target-db-parameter-group-name prod-postgres16-params \  # New parameter group for green
  --tags Key=Purpose,Value=major-version-upgrade
# RDS clones production to "green" and sets up replication
# Test your application against the green endpoint for as long as needed
# Then initiate switchover:
aws rds switchover-blue-green-deployment \
  --blue-green-deployment-identifier bgd-abc123 \
  --switchover-timeout 300    # Max seconds to wait for replication to catch up before aborting
```

### Console Walkthrough: Automated Backups vs Manual Snapshots

Navigate to **RDS → Databases → [your instance] → Maintenance & backups** to see:
- **Automated backups**: Shows backup retention period, backup window, latest restorable time, and transaction log details.
- To restore: Click **Actions → Restore to point in time**. Enter the target timestamp. RDS creates a new instance.

Navigate to **RDS → Snapshots** to see all manual and automated snapshots:
- **Manual** tab: Snapshots you created. Click a snapshot and select **Actions → Copy snapshot** for cross-region copy or **Actions → Restore snapshot** for a new instance.
- **Automated** tab: RDS-managed daily snapshots. These can also be restored from, but they will be deleted if the source instance is deleted without the "Retain automated backups" option.
- **Shared with me** tab: Snapshots from other accounts that have been shared with you.

To configure automated backup replication: Navigate to **RDS → Automated backups → [instance name] → Replicate automatic backups**. Select the destination region and KMS key.

### AWS CLI: Export Snapshot to S3 (Parquet)

```bash
aws rds start-export-task \
  --export-task-identifier prod-postgres-export-20240115 \
  --source-arn arn:aws:rds:us-east-1:123456789012:snapshot:prod-postgres-pre-migration-20240115 \
  --s3-bucket-name my-analytics-data-lake \
  --s3-prefix rds-exports/prod-postgres/ \
  --iam-role-arn arn:aws:iam::123456789012:role/RDSExportRole \   # Role with S3 write and KMS permissions
  --kms-key-id alias/aws/s3
# Export creates Parquet files under s3://my-analytics-data-lake/rds-exports/prod-postgres/
# Directory structure: [prefix]/[export-id]/[database]/[schema]/[table]/[partition-files].parquet
# Query with Athena: CREATE EXTERNAL TABLE ... STORED AS PARQUET LOCATION 's3://...'
```

## How to Decide

Use these criteria to choose the right backup and recovery approach:

1. **Need to recover from accidental data deletion or corruption within the past 35 days?** Use PITR with automated backups. Specify the exact second before the bad operation. This is the most precise recovery mechanism available.

2. **About to make a high-risk change (schema migration, major version upgrade, parameter changes)?** Take a manual snapshot first. The snapshot persists until deleted and gives you a zero-RPO rollback point specific to that moment.

3. **Need to retain database snapshots longer than 35 days for compliance?** Automated backups cannot satisfy this. Use a Lambda function (or EventBridge-triggered automation) to create manual snapshots on a schedule and tag them with retention dates. Implement a separate Lambda to delete expired snapshots.

4. **Need regional DR for RDS?** Enable automated backup replication to a second region (for PITR capability in the DR region) AND maintain a Cross-Region Read Replica (for a current, readable copy with near-zero RPO). Use both for maximum coverage.

5. **About to perform a major version upgrade on a production database?** Use Blue/Green Deployment. Clone production, perform the upgrade on green, test, then switchover in under a minute. Safer than in-place and faster to validate than snapshot-based approaches.

6. **Need to run analytics on production data without impacting the database?** Use RDS Export to S3 (Parquet), then query with Athena. Export from a snapshot for zero production impact. Do not run analytics queries directly against the production primary.

7. **Deleted an RDS instance and need to recover — were automated backups retained?** If you enabled "Retain automated backups" at deletion time, PITR is still possible. If not, only a manual snapshot taken before deletion can save you. This is why pre-deletion manual snapshots are critical operational hygiene.

## How This Connects

- **Amazon S3**: All RDS backups — automated and manual — are physically stored in S3, though AWS-managed automated backups are invisible to your account. Manual snapshots use S3 under the hood but are managed through the RDS console and API, not the S3 console. RDS Export to S3 writes directly to a bucket you control.
- **AWS KMS**: Encrypted RDS instances have encrypted snapshots. Cross-region copy requires a KMS key in the destination region. If you use a customer-managed CMK for RDS encryption, you must replicate or recreate that key in any region you copy snapshots to. Key deletion would make encrypted snapshots permanently unrecoverable.
- **Amazon Athena**: The natural consumer of RDS Export to S3. After exporting a snapshot to Parquet in S3, define an Athena table over the S3 prefix and run ad-hoc SQL analytics. No ETL pipeline required — Athena queries the Parquet files directly. This enables cost-effective analytics on RDS data without a separate data warehouse.
- **AWS Lambda and Amazon EventBridge**: Automation for backup lifecycle management. EventBridge schedules trigger Lambda functions that create manual snapshots on a monthly/quarterly basis, copy them cross-region, tag them with retention metadata, and delete expired snapshots. This is how you implement >35-day retention without manual work.
- **Amazon Route 53**: Because restoring from backup creates a new RDS instance with a new endpoint, abstracting your database endpoint behind a Route 53 CNAME reduces the blast radius. After a restore, update the CNAME record once rather than updating every application configuration that contains the RDS hostname.

## Exam Traps

**Trap 1: Restoring from a backup modifies the existing RDS instance in-place.**
It does not. Restoring always creates a new RDS instance with a new endpoint. The source instance is completely unaffected. This means you have time to validate the restored instance before cutting over, but it also means you must update your application's connection string and any other system referencing the DB endpoint. Questions phrased as "restore the database to 3 PM yesterday" describe a process that results in a new instance, not a modified existing one.

**Trap 2: Automated backups are retained after the DB instance is deleted.**
By default, they are not. Unless you explicitly select "Retain automated backups" during instance deletion, automated backups are destroyed with the instance. Manual snapshots always survive. This is the most important practical reason to take a manual snapshot before deleting any production database.

**Trap 3: PITR allows recovery to any time in history.**
PITR only covers the retention window (1–35 days). If a data corruption event happened 40 days ago and your retention is 35 days, you cannot recover to before the corruption. For long-horizon data protection, you need manual snapshots retained indefinitely.

**Trap 4: Automated backups are visible in S3 and can be managed directly.**
They are not visible in your S3 buckets. AWS manages the backup storage in its own S3 infrastructure. You interact with automated backups exclusively through the RDS console and API. You cannot browse, download, or delete individual automated backup files via S3.

**Trap 5: Blue/Green Deployment and Read Replica promotion are equivalent for major version upgrades.**
They are related but different. Both allow testing a new version against production data before committing. However, Blue/Green Deployment provides a managed switchover with replication catch-up and DNS flip in under a minute, and it retains the blue environment as an explicit rollback. Read Replica promotion is a permanent, manual action — once promoted, replication is severed and you cannot easily revert. For exam questions about "safe, low-risk major version upgrade with ability to roll back," Blue/Green is the more complete answer.

## Summary

- Automated backups (1–35 day retention) combine daily snapshots with 5-minute transaction log capture to enable PITR to any second — they are free up to the DB storage size and are stored in AWS-managed S3 not visible in your account.
- Manual DB snapshots persist until explicitly deleted, survive instance deletion, and are the correct tool for pre-change safety nets, long-term archival beyond 35 days, and cross-account/cross-region sharing.
- Restoring from any backup — automated PITR or manual snapshot — always creates a new RDS instance with a new endpoint; there is no in-place restore and all downstream connections must be updated.
- Cross-region snapshot copy and automated backup replication enable regional DR; encrypted snapshots require a KMS key in the destination region.
- RDS Blue/Green Deployments clone production, allow testing on a live-data copy, and switch over in under a minute — the safest mechanism for major version upgrades.
- RDS Export to S3 exports snapshot data as Parquet for analytics querying with Athena, with zero impact on the production database.

## Examples

A development team runs a script that accidentally executes `TRUNCATE TABLE orders` on the production RDS PostgreSQL database at 10:23 AM. Automated backups are enabled with a 7-day retention period. The on-call engineer uses PITR to restore the database to 10:22:55 AM — 5 seconds before the truncation. The restore creates a new RDS instance (`prod-postgres-restored-10am`) in about 20 minutes. After verifying the orders table is intact, the engineer updates the Secrets Manager secret with the new endpoint, restarts the application containers, and confirms service is restored. The total incident duration from detection to resolution is 35 minutes. Without automated backups and PITR, the RPO would have been the previous night's manual backup — potentially 12+ hours of lost data.

A financial services company is subject to SEC Rule 17a-4 requiring database records to be retained for 7 years with write-once, read-many semantics. Since automated backups max out at 35 days, they implement a monthly Lambda function triggered by EventBridge Scheduler. The function calls `create-db-snapshot` with a naming convention (`audit-YYYY-MM-prod-postgres`) and tags the snapshot with `RetentionExpiry: 2031-01-01`. A separate Lambda runs weekly and deletes manual snapshots whose `RetentionExpiry` tag is in the past. They also enable S3 Object Lock on the bucket they periodically export to (using RDS Export to S3) for the immutability requirement. This architecture separates the retention mechanism (RDS snapshots) from the immutability requirement (S3 Object Lock on exports).

A principal engineer needs to upgrade an RDS PostgreSQL 14 production database to version 16 with a critical business requirement: no more than 3 minutes of write unavailability and a tested rollback path. They create a Blue/Green Deployment targeting version 16 and assign a custom parameter group tuned for the new version's settings. The green environment syncs and replicates from production for 48 hours. During that window, they run their full integration test suite and load tests against the green endpoint. Finding a query regression in one reporting stored procedure, they fix it on green and re-test. When all tests pass, they initiate the switchover — RDS drains connections, waits for replication lag to reach zero, flips the DNS endpoints, and completes the switchover in 47 seconds. The blue environment (PostgreSQL 14) is retained for 72 hours as a rollback target, then deleted.

## Think About It

1. Automated backups are deleted when the DB instance is deleted by default. If you were building an internal platform that allows engineers to spin up and tear down RDS instances for feature development, what guardrails and automation would you put in place to prevent accidental data loss from this default behavior?

2. PITR requires both a snapshot and transaction logs to be intact. What combination of failures or misconfigurations could make PITR fail even though the backup retention period has not expired? What would you test to validate your backup recovery process?

3. Blue/Green Deployments allow you to test a major version upgrade against a live copy of production data for days or weeks before switching over. What categories of issues would this catch that an upgrade in a staging environment (populated from a 2-week-old snapshot) would not catch?

4. After restoring a database from a snapshot, you have a new instance with a new endpoint. Design a Route 53 and Secrets Manager architecture that would reduce the time needed to cut over application traffic to the restored instance. What are the trade-offs of each approach?

5. RDS Export to S3 produces Parquet files — a columnar, compressed format. Why is Parquet better than CSV for the analytics query use case, and what are the situations where the export approach is still the wrong tool (i.e., where you would want a different analytics pattern)?

## Quick Check

**Q1.** A database administrator needs to recover an RDS PostgreSQL database to the state it was in at exactly 9:14:52 AM three days ago. The database has automated backups enabled with a 7-day retention period. Which feature and action accomplishes this?

- A) Restore from the automated daily snapshot taken at midnight that day
- B) Use Point-in-Time Recovery to restore to 9:14:52 AM, which creates a new RDS instance
- C) Copy a manual snapshot to a new region and restore it with the target timestamp
- D) Use Read Replica promotion to roll the replica back to the target time

**Answer: B** — PITR uses the daily snapshot plus transaction logs captured every 5 minutes to reconstruct the database state at any specific second within the retention window. It creates a new instance at that state. Daily snapshot restore (A) only gets you to midnight, not the specific time. Read Replica promotion (D) does not support time-based rollback.

**Q2.** An engineer deletes an RDS instance without enabling "Retain automated backups." They took a manual snapshot two hours before deletion. What data recovery options are available?

- A) Restore from automated backups — they are retained in S3 independently of the instance
- B) Restore from the manual snapshot — it persists until explicitly deleted regardless of instance lifecycle
- C) Both automated backups and the manual snapshot are available
- D) No recovery is possible once the instance is deleted

**Answer: B** — Manual DB snapshots persist until explicitly deleted, regardless of what happens to the source instance. Automated backups are deleted with the instance unless "Retain automated backups" is selected at deletion time. The manual snapshot taken two hours before deletion is the recovery option here.

**Q3.** A company wants to perform a safe, tested major PostgreSQL version upgrade on their production RDS database with the ability to roll back if issues are found during testing. Which RDS feature is the most appropriate?

- A) Create a Read Replica, upgrade it, then promote it; delete the old primary immediately after promotion
- B) Create a Blue/Green Deployment, upgrade the green environment, test, then perform a managed switchover while retaining the blue environment as rollback
- C) Restore the latest automated backup to a new instance, upgrade the restored instance, then swap security group rules
- D) Enable automatic minor version upgrades and wait for the next maintenance window

**Answer: B** — Blue/Green Deployment is specifically designed for this scenario. It clones production to a green environment, allows you to upgrade and test the green, and provides a managed switchover with replication catch-up and DNS flip in under a minute — while retaining the blue environment as an explicit rollback target. Option A (Read Replica promotion) permanently severs replication and deletes the rollback path as stated.

## What's Next

Next up: Amazon Aurora — AWS's cloud-native MySQL and PostgreSQL-compatible engine with distributed storage, sub-30-second failover, and up to 15 readable replicas sharing the same storage layer.
