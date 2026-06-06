---
title: "EBS Snapshots, DLM, and AWS Backup"
type: content
estimated_minutes: 18
cert_tags: ["SAA-C03", "CLF-C02"]
---

# EBS Snapshots, DLM, and AWS Backup

## Overview

EBS Snapshots are point-in-time backups of EBS volumes stored durably in Amazon S3. They are the foundation of every EBS-based disaster recovery strategy. Snapshots allow you to restore a volume to a prior state, create new volumes from existing data, copy data across Availability Zones and AWS regions, and share data with other AWS accounts — all without direct S3 access or any manual data transfer. AWS handles the storage mechanics entirely behind the scenes.

The incremental design of EBS snapshots is one of the most conceptually important details to understand. The first snapshot of a volume captures every used block. Every subsequent snapshot captures only the blocks that changed since the most recent snapshot. Despite storing only the delta, each snapshot in the chain presents itself as a complete, fully restorable backup. AWS maintains a reference-counting mechanism across the chain so that deleting an intermediate snapshot never orphans data — blocks referenced by any remaining snapshot are preserved, and the chain automatically "reweaves" around the deleted entry. This behavior is non-obvious but directly tested.

Managing snapshot lifecycles — creation schedules, retention periods, cross-region copies — at scale requires automation. AWS provides two mechanisms: Amazon Data Lifecycle Manager (DLM), a purpose-built snapshot automation tool, and AWS Backup, a broader cross-service backup management solution. Understanding when to use each, and how they differ, is a recurring exam topic. This lesson covers snapshot mechanics, both automation tools, encryption interactions, and the cost model that makes incremental snapshots economically viable at scale.

## Core Concepts

### Incremental Mechanics and Chain Deletion

The incrementalmodel works as follows: each snapshot stores only the blocks that differ from the previous snapshot. AWS tracks which blocks belong to which snapshots using an internal reference system. When you look at a snapshot in the console or API, it appears as a complete volume image — but under the hood, AWS reconstructs the full volume state by compositing the chain.

The deletion behavior is what surprises most people. If you have snapshots A → B → C and you delete B, AWS does not lose any data. Any blocks that were unique to B and still referenced by C are moved into C's block store. Any blocks from B that are no longer needed by any remaining snapshot are freed. The result: deleting B leaves you with a valid A → C chain. C is still a complete, restorable snapshot. This means there is no "safe order" to delete snapshots — you can delete any snapshot independently without compromising the others.

Exam implication: the question "what happens if you delete an intermediate snapshot" has a definitive answer — the remaining snapshots are unaffected because AWS consolidates the block references automatically.

Cost is based on the amount of unique changed data each snapshot stores, billed at approximately the same rate as S3 Standard storage (~$0.05/GB-month in most regions). A 500 GB volume where you change 5 GB of data per day accumulates roughly 5 GB × $0.05 = $0.25/day in incremental snapshot storage — far less than storing 500 GB daily.

### Fast Snapshot Restore (FSR)

When you create a new EBS volume from a snapshot, EBS lazy-loads the data. The volume is immediately usable, but blocks are fetched from S3 on first access. Until the full volume is warmed, I/O latency is higher and IOPS may be reduced compared to a fully initialized volume. For test workloads or dev environments this is acceptable. For production environments where new volumes must perform at full spec immediately — fleet scale-out, database restores under SLA — this cold-start problem is a real operational risk.

Fast Snapshot Restore (FSR) pre-warms the snapshot. When FSR is enabled on a snapshot in a specific AZ, AWS continuously maintains a pre-initialized pool of blocks so that volumes created from that snapshot in that AZ achieve full performance from the very first I/O.

Key FSR details:
- **Enabled per snapshot, per AZ.** A snapshot used in two AZs requires FSR to be enabled twice (once per AZ).
- **Cost:** Charged by the snapshot-AZ-hour. Each FSR-enabled snapshot in one AZ costs approximately $0.75/hour. A heavily used fleet may enable FSR on several snapshots across multiple AZs — costs add up.
- **Limit:** Up to 50 FSR-enabled snapshot-AZ pairs per account per region (can be increased via support).
- **Enable/disable dynamically:** You can turn FSR on before a fleet scale-out event and disable it afterward to control cost.

FSR is the right tool when: you create volumes from snapshots frequently at scale, performance from the first I/O matters, and you can afford the hourly cost during the window when rapid restores are expected.

### Snapshot Sharing: Cross-Account and Public

Snapshots are private by default. You can share them:

- **With specific accounts:** Modify the snapshot's permissions to add a target account ID. The target account can then copy the snapshot into their own account. They cannot use a shared (but not copied) snapshot to create volumes indefinitely — they should copy it first for portability.
- **Publicly:** Mark a snapshot as public to allow any AWS account to use it. This is how Amazon publishes its official AMI root device snapshots.
- **Encrypted snapshots:** Cannot be made public. Sharing an encrypted snapshot with a specific account requires that the KMS key used to encrypt it also be shared with that account. Without key access, the target account cannot decrypt the snapshot data.

### Encryption: Inheritance and the Unencrypted-to-Encrypted Path

EBS snapshot encryption behavior follows a consistent inheritance model:

- A snapshot of an **encrypted** volume is automatically encrypted with the same KMS key.
- A volume created from an **encrypted** snapshot is automatically encrypted with the same key.
- A snapshot of an **unencrypted** volume is unencrypted by default.
- You can copy an unencrypted snapshot and enable encryption during the copy — producing an encrypted snapshot from unencrypted source data. This is the standard migration path for encrypting legacy workloads without data loss.
- When you enable **EBS encryption by default** at the account level, all new volumes and snapshots are automatically encrypted with the default key. This does not retroactively encrypt existing volumes.

Exam pattern: "A team has unencrypted EBS volumes and needs to encrypt them without downtime." The answer is: snapshot the volume → copy the snapshot with encryption enabled → create a new encrypted volume from the copy → swap the attachment. The original unencrypted volume is separate throughout.

### Amazon Data Lifecycle Manager (DLM)

DLM automates the creation, retention, cross-region copy, and deletion of EBS snapshots and AMIs. It is purpose-built for EBS backup automation and replaces what teams used to do with custom Lambda + EventBridge combinations.

A DLM lifecycle policy defines:
- **Target resources:** Selected by tag key-value pairs (e.g., `Backup: true`). Any volume or instance with the matching tag is governed by the policy.
- **Schedule:** How often snapshots are taken (hourly, every N hours, daily at a specific time).
- **Retention:** Either count-based (keep last N snapshots) or age-based (delete snapshots older than N days).
- **Cross-region copy rules:** Automatically copy each new snapshot to one or more target regions. You can set independent retention for the copy.
- **Fast Snapshot Restore settings:** Optionally enable FSR on newly created snapshots in specified AZs.

DLM is the right tool when: your backup requirements center on EBS volumes and AMIs, you need simple tag-based scheduling, and compliance requirements do not mandate audit vaults or organization-wide enforcement.

### AWS Backup vs. DLM

AWS Backup is a centralized backup service that covers EBS but also EFS, RDS, DynamoDB, EC2 AMIs, FSx, S3, VMware, and more — a unified backup plane across AWS services. Key differentiators:

| Feature | DLM | AWS Backup |
|---|---|---|
| Services covered | EBS snapshots + AMIs only | EBS, EFS, RDS, DynamoDB, FSx, S3, EC2, on-premises VMware |
| Compliance vault (WORM) | No | Yes — Backup Vault Lock (write-once) |
| Organizational policies | No | Yes — backup policies across AWS Organizations |
| Cross-account backup | Limited | Yes, natively |
| IAM + audit integration | Basic | Full CloudTrail, AWS Backup Audit Manager |
| Complexity | Simple, tag-based | More configuration, more power |

Use DLM for EBS-only automation when compliance requirements are straightforward. Use AWS Backup when you need organization-wide backup governance, cross-service coverage, compliance vaults that prevent deletion, or centralized reporting.

## Configuration Reference

### Create a DLM Lifecycle Policy with Cross-Region Copy

```bash
# Create a DLM policy that tags production volumes and snapshots them daily,
# retaining 14 snapshots, and copies each snapshot to us-west-2

aws dlm create-lifecycle-policy \
  --description "Prod daily snapshot with cross-region copy" \
  --state ENABLED \
  --execution-role-arn arn:aws:iam::123456789012:role/AWSDataLifecycleManagerDefaultRole \
  --policy-details '{
    "PolicyType": "EBS_SNAPSHOT_MANAGEMENT",
    "ResourceTypes": ["VOLUME"],
    "TargetTags": [
      {"Key": "Environment", "Value": "production"}
    ],
    "Schedules": [
      {
        "Name": "DailySnapshots",
        "CreateRule": {
          "Times": ["02:00"],        
          "Interval": 24,
          "IntervalUnit": "HOURS"
        },
        "RetainRule": {
          "Count": 14              
        },
        "CopyTags": true,          
        "CrossRegionCopyRules": [
          {
            "TargetRegion": "us-west-2",
            "Encrypted": true,     
            "RetainRule": {
              "Interval": 30,
              "IntervalUnit": "DAYS"
            },
            "CopyTags": true
          }
        ]
      }
    ]
  }'
```

### Enable Fast Snapshot Restore

```bash
# Enable FSR on a specific snapshot in two AZs
# Cost: ~$0.75/hour per snapshot-AZ pair — enable only when needed
aws ec2 enable-fast-snapshot-restores \
  --availability-zones us-east-1a us-east-1b \
  --source-snapshot-ids snap-0abc123def456789

# Check FSR status
aws ec2 describe-fast-snapshot-restores \
  --filters "Name=snapshot-id,Values=snap-0abc123def456789"
# Look for State: enabled in the output — optimizing → enabled takes a few minutes

# Disable FSR after the scale-out event to stop incurring cost
aws ec2 disable-fast-snapshot-restores \
  --availability-zones us-east-1a us-east-1b \
  --source-snapshot-ids snap-0abc123def456789
```

### Copy a Snapshot with Encryption Enabled (Migration Path)

```bash
# Copy an unencrypted snapshot and encrypt it in the destination
# This is the standard path for encrypting legacy volumes
aws ec2 copy-snapshot \
  --source-region us-east-1 \
  --source-snapshot-id snap-0unencrypted123 \
  --destination-region us-east-1 \
  --encrypted \                       # Enable encryption on the copy
  --kms-key-id alias/my-ebs-key \     # Use CMK; omit to use aws/ebs default key
  --description "Encrypted copy of legacy root volume snapshot"

# The output returns a new snapshot ID — create an encrypted volume from it
aws ec2 create-volume \
  --availability-zone us-east-1a \
  --snapshot-id snap-0newencrypted456 \
  --volume-type gp3
```

### Create an AWS Backup Plan

```bash
# Create an AWS Backup plan with daily backups retained for 35 days
# and monthly backups (first of month) retained for 1 year

aws backup create-backup-plan \
  --backup-plan '{
    "BackupPlanName": "prod-backup-plan",
    "Rules": [
      {
        "RuleName": "DailyBackups",
        "TargetBackupVaultName": "prod-vault",
        "ScheduleExpression": "cron(0 2 * * ? *)",  
        "StartWindowMinutes": 60,
        "CompletionWindowMinutes": 180,
        "Lifecycle": {
          "DeleteAfterDays": 35    
        }
      },
      {
        "RuleName": "MonthlyBackups",
        "TargetBackupVaultName": "prod-vault",
        "ScheduleExpression": "cron(0 3 1 * ? *)",  
        "StartWindowMinutes": 60,
        "CompletionWindowMinutes": 240,
        "Lifecycle": {
          "DeleteAfterDays": 365   
        }
      }
    ]
  }'

# Assign resources to the plan by tag
aws backup create-backup-selection \
  --backup-plan-id <plan-id-from-above> \
  --backup-selection '{
    "SelectionName": "prod-tagged-resources",
    "IamRoleArn": "arn:aws:iam::123456789012:role/AWSBackupDefaultServiceRole",
    "ListOfTags": [
      {
        "ConditionType": "STRINGEQUALS",
        "ConditionKey": "Backup",
        "ConditionValue": "true"
      }
    ]
  }'
```

### Share an Encrypted Snapshot with Another Account

```bash
# Step 1: Share the KMS key with the target account (required for encrypted snapshots)
# This is done in the KMS key policy — add the target account as a key user

# Step 2: Modify snapshot permissions to share with the target account
aws ec2 modify-snapshot-attribute \
  --snapshot-id snap-0abc123encrypted \
  --attribute createVolumePermission \
  --operation-type add \
  --user-ids 987654321098          # Target account ID

# In the target account: copy the shared snapshot before use
aws ec2 copy-snapshot \
  --source-region us-east-1 \
  --source-snapshot-id snap-0abc123encrypted \
  --destination-region us-east-1 \
  --encrypted \
  --kms-key-id alias/aws/ebs       # Re-encrypt with target account's key
```

### Console: Snapshot Management

Navigate to **EC2 → Snapshots** to view all snapshots, their sizes, creation dates, and FSR status. Navigate to **EC2 → Lifecycle Manager** for DLM policies. Navigate to **AWS Backup → Backup plans** for cross-service backup configuration.

To view snapshot cost: **AWS Cost Explorer → Filter by service: Amazon EC2 → Filter by usage type: SnapshotUsage**.

## How to Decide

| Requirement | Recommended Tool | Notes |
|---|---|---|
| Automated EBS-only backups with tag-based targeting | DLM | Simpler, lower configuration overhead |
| Cross-region DR copies of EBS snapshots | DLM or AWS Backup | Both support it; DLM is sufficient for EBS-only |
| Backup EBS + RDS + EFS + DynamoDB from one console | AWS Backup | DLM cannot cover non-EBS resources |
| Compliance vault requiring immutable (WORM) backups | AWS Backup + Vault Lock | DLM has no immutable retention feature |
| Organization-wide backup policy enforcement | AWS Backup + AWS Organizations | DLM does not integrate with Organizations |
| Eliminate cold-start latency for frequently restored snapshots | FSR | Enable per-AZ; disable after scale-out event |
| Encrypt an existing unencrypted volume | Snapshot → encrypted copy → new volume | Cannot encrypt a volume in-place |
| Share a snapshot with a partner account | Modify snapshot permissions + share KMS key | Encrypted snapshots require key sharing |

**Retention design guidance:** Align retention periods to your Recovery Point Objective (RPO). An RPO of 24 hours requires at minimum one snapshot per day. An RPO of 4 hours requires snapshots every 4 hours or more frequently. Factor in the corruption discovery window — if data corruption can go undetected for 7 days, a 7-day retention policy provides zero protection. Retain beyond your maximum expected detection delay.

## How This Connects

- **Snapshots are the mechanism for cross-AZ and cross-region data movement.** An EBS volume is locked to one AZ, but you can snapshot it and create a new volume from that snapshot in any AZ in the same region, or copy the snapshot to any other region. This is how EBS-based DR is architecturally achieved.
- **AMIs use snapshots as their backing store.** When you create an AMI from a running instance, EC2 takes an EBS snapshot of each attached volume. The AMI is essentially a pointer to those snapshots plus launch configuration metadata. Snapshot management and AMI lifecycle management are therefore the same problem domain. Covered in Module 5 (EC2 AMIs).
- **KMS key sharing is required for encrypted snapshot cross-account use.** This creates a dependency on KMS key policy configuration whenever encrypted snapshots are part of a sharing or DR workflow. Covered in Module 14 (KMS).
- **AWS Backup integrates with AWS Organizations for organizational compliance.** Large enterprises use AWS Organizations backup policies to enforce backup coverage across every account in the organization — ensuring dev, staging, and production all meet the same retention standards. Covered in Module 15 (Organizations).
- **DLM and AWS Backup do not conflict — they can run simultaneously.** Some teams use DLM for EBS operational snapshots (short retention, frequent) and AWS Backup for compliance copies (long retention, WORM vault). The two tools complement each other rather than replace.

## Exam Traps

**Trap 1: "Deleting an intermediate snapshot will break the other snapshots in the chain."**
This is false. AWS automatically consolidates the block references. Deleting any snapshot in the chain preserves all data needed by remaining snapshots. No snapshot depends on another snapshot remaining in existence to be restorable.

**Trap 2: "A new volume restored from a snapshot has full performance immediately."**
Without FSR enabled, new volumes lazy-load blocks from S3. Performance is degraded until the volume is fully initialized. FSR is the solution — but it has a per-hour cost and must be enabled per snapshot per AZ.

**Trap 3: "You can share an encrypted snapshot just like an unencrypted one."**
Encrypted snapshots cannot be made public and cannot be used by another account unless that account also has access to the KMS key used for encryption. The snapshot permission grant alone is insufficient.

**Trap 4: "DLM and AWS Backup serve the same purpose."**
DLM handles EBS snapshots and AMIs only. AWS Backup is a multi-service backup service with compliance features (Vault Lock, audit manager, organizational policies) that DLM does not have. They overlap on EBS snapshots but serve different needs at scale.

**Trap 5: "Enabling EBS encryption by default encrypts existing volumes."**
The account-level default encryption setting applies only to newly created volumes going forward. Existing unencrypted volumes are not retroactively encrypted. Migration requires the snapshot-copy-replace process.

## Summary

- EBS snapshots are incremental S3-backed backups — the first snapshot captures all used blocks, subsequent snapshots capture only changed blocks; each remains a complete restorable backup.
- Deleting intermediate snapshots is safe — AWS reweaves block references automatically with no data loss.
- Fast Snapshot Restore (FSR) pre-warms snapshots per AZ, eliminating cold-start I/O latency; costs ~$0.75/hour per snapshot-AZ pair.
- DLM automates EBS snapshot and AMI lifecycle with tag-based policies, retention rules, and cross-region copy — the right tool for EBS-focused automation.
- AWS Backup extends coverage to RDS, EFS, DynamoDB, FSx, and more, adds WORM Vault Lock for compliance, and integrates with AWS Organizations for enterprise-wide enforcement.
- Sharing encrypted snapshots requires sharing the KMS key; converting unencrypted to encrypted is done via snapshot copy with encryption enabled.

## Examples

A SaaS company runs a production PostgreSQL database on EC2 and needs automated nightly backups with two-week retention, without any manual intervention. They create a DLM lifecycle policy targeting volumes tagged `Environment: production`, scheduled at 02:00 UTC daily, retaining the last 14 snapshots. They also add a cross-region copy rule to eu-west-1 with 30-day retention for DR. Three months later, a developer accidentally drops a table and the team restores from the previous night's snapshot in under 20 minutes. The incremental nature of the snapshots means the daily cross-region copy transfers only the day's changed blocks — not 500 GB each night — keeping DR data transfer costs modest.

A gaming platform scale-tests new content drops by launching large EC2 fleets from a golden AMI. During a major release, they spin up 200 instances in five minutes. Without FSR, each instance's first minutes of operation suffer degraded I/O while EBS lazy-loads blocks from S3 — impacting game server startup time and first-match performance. They enable FSR on their golden AMI's snapshot in the two AZs used for fleet launches, paying the per-hour cost only during the 48-hour launch window around each content drop, then disable it. The FSR cost is approximately $0.75/hour × 2 AZs × 48 hours = $72 per release event — a trivial cost against the user experience benefit at their scale.

A financial services firm with operations in 40 AWS accounts needs to demonstrate to auditors that every production account maintains 90-day backup retention with immutable records that cannot be deleted — even by account administrators. They implement AWS Backup with Backup Vault Lock across all accounts using an AWS Organizations backup policy. The vault is configured with a minimum retention of 90 days and legal hold enabled. DLM could not satisfy this requirement because it lacks immutable vault support and organizational policy enforcement. AWS Backup is the architecturally correct choice precisely when compliance requirements exceed what a lightweight automation tool can enforce.

## Think About It

1. EBS snapshots are incremental, but each snapshot behaves as a complete restorable backup. Walk through the block-reference mechanism that makes this possible — how does AWS know which blocks to preserve when you delete an intermediate snapshot?
2. You restore a large io2 database volume from a snapshot and immediately run your application under load. Performance is significantly below expectations. You did not enable FSR. What is happening at the storage layer, and what are two ways to resolve the cold-start problem — one expensive, one cheap?
3. Your DLM policy retains 7 snapshots at daily frequency. A silent data corruption event occurs on day 3 and is not discovered until day 11. What is the outcome, and what retention policy design would protect against this specific failure mode?
4. A partner company needs access to your encrypted EBS snapshot to set up a shared data pipeline. Walk through every step required — KMS key policy, snapshot permission, and what the partner must do in their account — and explain why each step is necessary.
5. You are evaluating whether to use DLM or AWS Backup for a new backup strategy. The workload includes EBS volumes, RDS databases, and DynamoDB tables. What is the deciding factor, and what additional AWS Backup features would you use if the audit team requires proof that backups cannot be tampered with?

## Quick Check

**Q1.** A team deletes an EBS snapshot that sits between two other snapshots in the backup chain. What happens to the data stored in the snapshots on either side?

- A) The data in those snapshots is permanently lost because the chain is broken
- B) AWS automatically consolidates block references; the remaining snapshots are unaffected and fully restorable
- C) The snapshots become read-only until manually re-indexed
- D) AWS creates a new full snapshot to replace the gap in the chain

**Answer: B** — AWS manages snapshot chains with internal block references. Deleting any intermediate snapshot causes AWS to consolidate the needed blocks into adjacent snapshots. No data is lost and no manual intervention is required.

**Q2.** A team enables Fast Snapshot Restore on a snapshot in us-east-1a and creates a new volume from that snapshot in us-east-1b. Will the new volume benefit from FSR?

- A) Yes — FSR applies to all volumes created from the snapshot regardless of AZ
- B) No — FSR must be enabled separately for each AZ where volumes will be created
- C) Yes — FSR is region-wide once enabled on a snapshot
- D) No — FSR only works for volumes created with the io2 volume type

**Answer: B** — FSR is enabled per snapshot per AZ. Enabling it in us-east-1a pre-warms blocks only in that AZ. Creating a volume in us-east-1b from the same snapshot will still cold-start from S3 unless FSR is also enabled for us-east-1b.

**Q3.** A team needs to share an encrypted EBS snapshot with a partner AWS account. The partner reports they cannot create a volume from the snapshot. What is the most likely cause?

- A) Encrypted snapshots cannot be shared between accounts under any circumstances
- B) The snapshot must be decrypted before it can be shared cross-account
- C) The KMS key used to encrypt the snapshot has not been shared with the partner account
- D) The partner account must be in the same AWS region as the snapshot

**Answer: C** — Sharing an encrypted snapshot requires sharing both the snapshot permissions and access to the KMS key. Without access to the encryption key, the partner account cannot decrypt the snapshot data to create a volume.

## What's Next

Next up: Amazon EFS — managed NFS for shared file storage accessible from thousands of clients across multiple AZs simultaneously, with performance modes, storage classes, and Access Points.
