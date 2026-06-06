---
title: "EBS Volumes and Snapshots"
type: content
estimated_minutes: 14
cert_tags: ["SAA-C03", "SOA-C02", "DVA-C02"]
---

# EBS Volumes and Snapshots

> **Note:** This lesson introduces EBS fundamentals in the context of EC2. Module 10 Lesson 1 (`01-ebs-deep-dive.md`) builds directly on this content with a deeper treatment of all volume types, IOPS vs. throughput distinctions, io2 Block Express, Multi-Attach, and the full snapshot lifecycle. If you are studying for SAA or above, read both lessons in order.

## Overview

Amazon Elastic Block Store (EBS) is the persistent block storage service for EC2. When an EC2 instance needs a disk — for the operating system, for a database, for application data — that disk is almost always an EBS volume. EBS presents storage as a raw block device: the OS sees it as a hard drive, partitions it, formats it with a file system, and reads and writes to it exactly as it would to a physical disk. The critical difference is that EBS volumes are network-attached and persist independently of the EC2 instance — if you terminate an instance, the data on its EBS volumes can survive and be attached to a new instance.

EBS is not a simple commodity storage service. It offers multiple volume types optimized for different performance profiles, a snapshot mechanism for point-in-time backups and data mobility, encryption integrated with KMS, and Multi-Attach capability for shared storage in clustered applications. The choice of volume type alone can mean the difference between a workload that performs well and one that is consistently bottlenecked — choosing gp3 for a sequential log processing job wastes money compared to st1, while choosing st1 for a database doing random I/O would be disastrous.

For the SAA, SOA, and DVA exams, EBS is one of the most heavily tested EC2 topics. You need to know all four volume types, when to use each, how snapshots work (especially the incremental model and cross-region copy pattern), how encryption interacts with snapshots, and how to automate volume management with AWS Backup and DLM.

---

## Core Concepts

### EBS Volume Types: SSD vs. HDD

EBS volumes fall into two fundamental categories based on the storage medium: SSD-backed (optimized for IOPS — random I/O) and HDD-backed (optimized for throughput — sequential I/O). Choosing the wrong category for a workload creates a performance bottleneck that no amount of instance resizing can fix.

**SSD-backed volumes:**

**gp3 (General Purpose SSD)** — The recommended default for nearly all workloads. gp3 provides a baseline of 3,000 IOPS and 125 MB/s throughput, regardless of volume size. IOPS can be independently provisioned up to 16,000 IOPS, and throughput up to 1,000 MB/s — both independently of each other and independently of volume size. This decoupling is the key improvement over the older gp2: you don't have to over-provision storage capacity just to get more IOPS. gp3 is suitable for boot volumes, general databases, development environments, and most production workloads. It cannot be used with EBS Multi-Attach.

**io2 Block Express (Provisioned IOPS SSD)** — For workloads that demand the highest IOPS, lowest latency, or data durability guarantees. io2 Block Express supports up to 256,000 IOPS and 4,000 MB/s throughput per volume, with sub-millisecond latency and 99.999% (five-nines) durability. It is significantly more expensive than gp3. Use io2 for I/O-intensive databases (Oracle, SQL Server, high-transaction-rate PostgreSQL) where gp3's 16,000 IOPS ceiling is insufficient. io2 volumes support EBS Multi-Attach.

**HDD-backed volumes:**

**st1 (Throughput Optimized HDD)** — High sequential throughput at low cost. st1 maxes out at 500 MB/s throughput and is designed for workloads that read and write data in large sequential blocks: log processing, data warehousing ETL pipelines, big data analytics. st1 cannot be used as a boot volume (root volume). It is not suitable for random I/O workloads — its IOPS are low by design.

**sc1 (Cold HDD)** — The lowest-cost EBS option, designed for infrequently accessed data. sc1 provides up to 250 MB/s throughput and is appropriate for data that needs to be on block storage (not S3) but is accessed rarely. Like st1, it cannot be used as a boot volume.

---

### The gp3 vs. gp2 Distinction

You may encounter gp2 in older systems or exam questions. The key differences:

| Feature | gp2 | gp3 |
|---|---|---|
| Baseline IOPS | 3 IOPS per GB (100–16,000 IOPS) | 3,000 IOPS regardless of size |
| IOPS configuration | Tied to volume size | Independent of size |
| Throughput | Up to 250 MB/s | Up to 1,000 MB/s |
| Cost | Higher | ~20% cheaper than gp2 |

gp2's "3 IOPS per GB" model meant you had to over-provision storage to get IOPS. A 100 GB gp2 volume delivers only 300 IOPS — inadequate for most databases. To get 3,000 IOPS on gp2, you needed a 1,000 GB volume. gp3 eliminates this coupling entirely — a 20 GB gp3 delivers the same 3,000 baseline IOPS as a 2,000 GB gp3. For new volumes, always use gp3.

---

### EBS Snapshots: Point-in-Time Backups

A snapshot is a point-in-time copy of an EBS volume stored durably in Amazon S3 (in a bucket managed by AWS — you don't see these snapshots in your S3 console). Snapshots are the primary mechanism for:
- **Backup and recovery**: restore a volume to any snapshot point in time
- **Data migration**: copy a volume across Availability Zones or Regions
- **AMI creation**: AMIs reference the EBS snapshot of the root volume
- **Volume cloning**: create multiple volumes from one snapshot

**Incremental snapshots:** The first snapshot of a volume copies all data blocks. Every subsequent snapshot copies only the blocks that changed since the last snapshot. This means snapshots are fast and storage-efficient for regularly snapshotted volumes — a database that changes 5 GB per day on a 500 GB volume generates daily snapshots of roughly 5 GB each, not 500 GB.

**Restoring from snapshots is always a full volume:** Even though snapshots are stored incrementally, when you restore a snapshot to a new volume, AWS reconstructs the full volume. You don't need to apply incremental snapshots manually — the restore is always to a complete, consistent state.

**Lazy loading after restore:** A newly restored EBS volume has all its data in S3 (the snapshot). As the volume is accessed, blocks are pulled from S3 to the EBS storage on demand. This means the first reads after restoration are slower than normal EBS reads. For time-sensitive workloads, use **Fast Snapshot Restore (FSR)** to pre-warm the volume, eliminating the lazy-loading latency.

---

### Cross-Region and Cross-Account Snapshots

EBS volumes are Availability Zone-scoped — a volume exists in one specific AZ and can only be attached to instances in that same AZ. Moving data to a different AZ, Region, or account requires snapshots:

**Cross-AZ**: Create a snapshot, create a new volume from the snapshot in the destination AZ. The snapshot itself is Region-scoped (available across all AZs in the Region).

**Cross-Region**: Create a snapshot, copy the snapshot to the destination Region (using the Copy Snapshot function). This creates a new snapshot in the target Region with a new Snapshot ID. Create a volume from the copied snapshot.

**Cross-Account**: Share the snapshot with the target account (by AWS account ID). The receiving account can then copy the snapshot or create a volume from it directly.

**Encryption note**: You can copy an unencrypted snapshot and produce an encrypted copy. This is how you encrypt an existing unencrypted EBS volume: snapshot → encrypted copy → new volume from encrypted copy → swap volumes on the instance.

---

### Snapshot Lifecycle Management

Every snapshot costs money (S3 storage priced per GB-month). Without a lifecycle policy, snapshots accumulate indefinitely and storage costs grow without bound. Two tools automate snapshot lifecycle:

**Amazon Data Lifecycle Manager (DLM)**: AWS-native policy engine for EBS snapshots. Define policies that create snapshots on a schedule (hourly, daily, weekly), retain a specified count, and delete older snapshots automatically. DLM is free (you pay only for the snapshot storage).

**AWS Backup**: A centralized backup service that supports EBS alongside RDS, DynamoDB, EFS, and more. Use AWS Backup when you need a unified backup policy across multiple services, compliance-oriented backup vaults, or cross-Region/cross-account backup replication.

---

### EBS Encryption

EBS encryption uses AES-256 and integrates with AWS KMS. When encryption is enabled on a volume, all data at rest is encrypted, all data in transit between the volume and the instance is encrypted, and all snapshots created from the volume are encrypted.

**Enabling encryption at account level**: In the EC2 Console under **EBS Settings**, you can enable "Always encrypt new EBS volumes" for a Region. Once enabled, every new EBS volume created in that Region is automatically encrypted using the default KMS key (or a customer-managed key you specify). This is the recommended setting for production accounts.

**Encrypting an existing unencrypted volume**: There is no in-place encryption toggle. The process:
1. Create a snapshot of the existing unencrypted volume
2. Copy the snapshot with encryption enabled (choose the KMS key)
3. Create a new EBS volume from the encrypted snapshot
4. Stop the instance, detach the old unencrypted volume, attach the new encrypted volume
5. Update the device mapping if needed and start the instance
6. Optionally delete the old unencrypted volume and snapshot

---

## Configuration Reference

### Creating and Managing EBS Volumes via the Console

**Create a new volume:**
1. Navigate to **EC2 → Elastic Block Store → Volumes**
2. Click **Create volume**
3. Configure:
   - **Volume type**: gp3 (recommended default)
   - **Size**: in GiB — for gp3, size is independent of IOPS
   - **IOPS**: for gp3, defaults to 3,000; increase if needed (up to 16,000)
   - **Throughput**: for gp3, defaults to 125 MB/s; increase if needed (up to 1,000 MB/s)
   - **Availability Zone**: must match the AZ of the instance you want to attach to
   - **Encryption**: check "Encrypt this volume" and select the KMS key
4. Click **Create volume**

**Attach to an instance:**
1. Select the volume → **Actions → Attach volume**
2. Select the instance (must be in the same AZ)
3. Choose the device name (`/dev/sdf` through `/dev/sdp` for additional volumes on Linux)
4. Click **Attach volume**
5. On the instance, run `lsblk` to see the new device, then format and mount:
```bash
# After attaching /dev/nvme1n1 (how Nitro instances see EBS volumes)
sudo mkfs.ext4 /dev/nvme1n1         # Format the volume (CAUTION: destroys existing data)
sudo mkdir -p /data
sudo mount /dev/nvme1n1 /data        # Mount it
echo '/dev/nvme1n1 /data ext4 defaults,nofail 0 2' | sudo tee -a /etc/fstab  # Persist across reboots
```

---

### EBS Snapshot Operations via the AWS CLI

```bash
# Create a snapshot of a volume
aws ec2 create-snapshot \
  --volume-id vol-0abc1234567890def \     # Volume to snapshot
  --description "Daily backup 2024-01-15 before deployment" \
  --tag-specifications 'ResourceType=snapshot,Tags=[{Key=Name,Value=mydb-2024-01-15}]' \
  --region us-east-1

# Wait for the snapshot to complete
aws ec2 wait snapshot-completed \
  --snapshot-ids snap-0abc1234567890def

# Copy snapshot to another Region (for DR or migration)
aws ec2 copy-snapshot \
  --source-snapshot-id snap-0abc1234567890def \
  --source-region us-east-1 \               # Source Region
  --description "DR copy of mydb snapshot" \
  --encrypted \                             # Enable encryption on the copy
  --kms-key-id arn:aws:kms:eu-west-1:123456789012:key/abcd-1234 \  # KMS key in target Region
  --region eu-west-1                        # Destination Region

# Create a volume from a snapshot (restoring a backup)
aws ec2 create-volume \
  --snapshot-id snap-0abc1234567890def \
  --volume-type gp3 \
  --iops 6000 \                             # Can change IOPS when restoring
  --throughput 500 \                        # Can change throughput when restoring
  --availability-zone us-east-1a \         # Must match target instance AZ
  --encrypted \
  --region us-east-1

# List all snapshots owned by your account
aws ec2 describe-snapshots \
  --owner-ids self \
  --query 'Snapshots[*].{ID:SnapshotId,VolumeID:VolumeId,Size:VolumeSize,State:State,Description:Description}' \
  --output table

# Delete an old snapshot
aws ec2 delete-snapshot \
  --snapshot-id snap-0oldsnapshotid
```

---

### Setting Up an EBS Snapshot Lifecycle Policy (DLM)

In the console: **EC2 → Elastic Block Store → Lifecycle Manager → Create lifecycle policy**

```bash
# Create a DLM policy via CLI — daily snapshots at 23:00 UTC, retain 7
aws dlm create-lifecycle-policy \
  --description "Daily snapshots of production database volumes" \
  --state ENABLED \
  --execution-role-arn arn:aws:iam::123456789012:role/AWSDataLifecycleManagerDefaultRole \
  --policy-details '{
    "PolicyType": "EBS_SNAPSHOT_MANAGEMENT",
    "ResourceTypes": ["VOLUME"],
    "TargetTags": [{"Key": "Backup", "Value": "daily"}],
    "Schedules": [{
      "Name": "Daily at 11pm UTC",
      "CreateRule": {
        "Interval": 24,
        "IntervalUnit": "HOURS",
        "Times": ["23:00"]
      },
      "RetainRule": {
        "Count": 7
      },
      "CopyTags": true
    }]
  }'
# Tag your volumes with Backup=daily to include them in this policy
```

---

## How to Decide

**Volume type selection:**

| Workload | Volume Type | Why |
|---|---|---|
| OS root volume | gp3 | Default; 3,000 IOPS sufficient for OS |
| MySQL/PostgreSQL production database | gp3 (up to 16k IOPS) or io2 (>16k IOPS) | Depends on IOPS requirements |
| Oracle RAC shared storage | io2 with Multi-Attach | Only io2 supports Multi-Attach |
| SQL Server / Oracle (extreme IOPS) | io2 Block Express | Up to 256,000 IOPS, sub-ms latency |
| Hadoop / ETL sequential processing | st1 | High throughput, low cost for sequential |
| Archival / cold data on block storage | sc1 | Cheapest EBS option |
| Dev/test environment | gp3 | Cheapest SSD, sufficient for most dev workloads |

**When to use FSR (Fast Snapshot Restore):** Enable FSR when a restored volume will serve production traffic immediately — the lazy-loading startup latency can cause performance issues in the first minutes. FSR is priced per AZ, per snapshot, per hour — only enable it when needed.

**Snapshot retention decisions:**
- Regulatory requirement (e.g., 1-year retention): use AWS Backup with a vault
- Operational recovery (1–30 days): DLM is sufficient and simpler
- Cross-Region DR: DLM cross-region copy rules or AWS Backup replication

---

## How This Connects

- **EC2 Instances** — EBS volumes attach to EC2 instances in the same Availability Zone. The root volume (containing the OS) is created automatically at instance launch from the AMI's snapshot. Additional data volumes can be created and attached at any time.
- **AMIs** — An AMI is backed by an EBS snapshot of the root volume. Creating an AMI from a running instance creates a snapshot, and that snapshot is what gets copied when you copy an AMI to another Region.
- **AWS KMS** — EBS encryption uses KMS keys for envelope encryption. The KMS key policy controls who can encrypt/decrypt the volume. Encrypted snapshots shared with other accounts require sharing the KMS key as well.
- **AWS Backup** — A centralized backup service that can manage EBS snapshots alongside backups of RDS, DynamoDB, EFS, and other services. Use it for compliance-driven backup requirements or when you need a unified backup strategy across multiple service types.
- **Amazon Data Lifecycle Manager (DLM)** — Automates EBS snapshot creation and deletion based on tag-based policies. DLM is the right tool for automated operational snapshots; AWS Backup is better for compliance-oriented long-term retention.

---

## Exam Traps

- **EBS volumes are AZ-scoped, not Region-scoped.** A volume in `us-east-1a` cannot be attached to an instance in `us-east-1b`. Cross-AZ data movement requires snapshot → new volume in destination AZ.
- **Snapshots are incremental in storage but not in restore.** You don't restore snapshot 1, then apply snapshot 2, then snapshot 3. Every restore operation produces a complete, consistent volume — AWS handles the incremental reconstruction transparently.
- **Deleting a snapshot that another snapshot depends on is safe.** AWS prevents deletion of snapshots that are referenced by AMIs. For chained incremental snapshots, AWS manages the data sharing between snapshots — deleting an intermediate snapshot only removes the unique data in that snapshot; data needed by later snapshots is preserved.
- **Newly restored volumes have lazy-loaded performance.** A volume restored from a snapshot performs initial reads from S3 while simultaneously being served to the instance. First reads are slower. Use Fast Snapshot Restore to pre-warm if this matters.
- **gp2 IOPS are size-dependent; gp3 IOPS are not.** For the exam, if a question asks how to get more IOPS from a gp2 volume, the answer is to increase the volume size. For gp3, you increase the IOPS setting directly — independent of size. Don't confuse the two models.

---

## Summary

- EBS provides persistent, network-attached block storage for EC2; the four volume types are gp3 (general SSD, default), io2 (extreme IOPS/latency, Multi-Attach), st1 (sequential HDD, ETL/logs), and sc1 (cold HDD, archival).
- gp3 decouples IOPS and throughput from volume size; gp2 tied IOPS to size at 3 IOPS/GB — always use gp3 for new volumes.
- EBS Snapshots are incremental point-in-time backups stored in S3; the first snapshot copies all data, subsequent snapshots copy only changed blocks; restore is always to a complete, consistent volume.
- EBS volumes are Availability Zone-scoped; cross-AZ, cross-Region, and cross-account data movement all require the snapshot → copy → create volume sequence.
- EBS encryption uses AES-256 with KMS; encrypted at rest, in transit, and in all snapshots; enable "Always encrypt new volumes" at the account level for production.
- Automate snapshot lifecycle with Amazon Data Lifecycle Manager (DLM) for operational snapshots or AWS Backup for compliance-oriented long-term retention.

---

## Examples

A small e-commerce startup runs Magento on a single EC2 instance with a 100 GB gp3 root volume. During a flash sale, product catalog queries slow dramatically. Investigating, they find MySQL is doing high random I/O at 3,000 IOPS — the gp3 baseline — and is queue-depth saturated. They move the MySQL data directory to a separate gp3 volume and configure that volume's IOPS to 8,000 (independent of size — a 50 GB gp3 gets 8,000 IOPS without needing to be 2,666 GB as gp2 would require). Query latency drops 60%. This is the key gp3 lesson: you can provision the IOPS your database needs without over-provisioning storage capacity to get there.

A financial analytics firm runs Oracle RAC on two EC2 instances that must share a single block device — Oracle RAC's architecture requires all nodes to write to the same volume simultaneously. They provision a 10 TB io2 Block Express volume with 200,000 IOPS and sub-millisecond latency, and enable EBS Multi-Attach to connect it to both `r7i.16xlarge` instances in `us-east-1a` simultaneously. Oracle RAC handles the distributed lock management at the application layer; EBS provides the raw block device. Before EBS Multi-Attach, this would have required a physical SAN — now it runs as a managed AWS service with 99.999% durability.

A data engineering team at a media company ingests 3 TB of video transcoding logs nightly from CloudFront into an EC2 ETL instance. They initially attached a gp3 volume for storage. The pipeline ran at 180 MB/s — well below their network bandwidth. Profiling showed the bottleneck was sequential read performance on gp3 (which is optimized for random I/O, not sequential throughput). Switching to st1 (Throughput Optimized HDD, up to 500 MB/s sequential) doubled pipeline throughput and reduced their storage cost by 65%. The lesson: the IOPS/throughput distinction is not academic — choosing the wrong axis of optimization for a sequential workload is both slower and more expensive.

---

## Think About It

1. EBS snapshots are incremental — only changed blocks are stored after the first snapshot. If you delete a snapshot in the middle of a chain (e.g., delete snapshot 3 but keep snapshots 2 and 4), what happens to the data from snapshot 3 that snapshot 4 depends on? How does AWS handle this?
2. A team is concerned about the performance of a database immediately after restoring from a snapshot. They're debating between enabling Fast Snapshot Restore for all their production snapshots versus accepting the lazy-loading startup period. What factors would you consider when making this decision, and what does FSR actually cost?
3. If you encrypt an EBS volume using a customer-managed KMS key and then the KMS key is deleted, what happens to the encrypted data? What does this tell you about KMS key lifecycle management for encrypted storage?
4. A compliance requirement mandates that all backup data be retained for 7 years. AWS Data Lifecycle Manager can create and delete snapshots on a schedule. Why might AWS Backup be a better choice for this requirement, and what specific features does it offer that DLM lacks?
5. gp3 allows you to independently configure IOPS and throughput from volume size. How would you use CloudWatch to determine the right IOPS setting for a production database volume — what metrics would you monitor, for how long, and at what percentile?

---

## Quick Check

**Q1.** A database workload requires 20,000 IOPS with sub-millisecond latency. Which EBS volume type should be used?
- A) gp3, with IOPS configured to 20,000
- B) st1, for high throughput
- C) io2 Block Express, which supports up to 256,000 IOPS with sub-millisecond latency
- D) sc1, for cost efficiency

**Answer: C** — gp3 supports a maximum of 16,000 IOPS; for workloads requiring more than 16,000 IOPS or sub-millisecond latency guarantees, io2 Block Express is the correct choice.

**Q2.** A company wants to copy data from an EBS volume in us-east-1 to eu-west-1 for disaster recovery. What is the correct sequence of steps?
- A) Detach the volume in us-east-1 and re-attach it in eu-west-1
- B) Enable EBS Multi-Attach across regions
- C) Create a snapshot in us-east-1, copy the snapshot to eu-west-1, then create a new volume from the copied snapshot
- D) Use the AWS Backup service to directly replicate the EBS volume

**Answer: C** — EBS volumes are AZ-scoped and cannot be directly moved across Regions. The standard cross-Region copy process is: create snapshot (Region-scoped) → copy snapshot to destination Region → create volume from snapshot in target Region.

**Q3.** An administrator enables "Always encrypt new EBS volumes" in a Region's EC2 settings. A developer launches an EC2 instance with a new gp3 root volume and does not specify encryption settings. What is the outcome?
- A) The volume is created unencrypted because the developer did not explicitly enable encryption
- B) The launch fails because encryption settings must be explicitly configured
- C) The volume is automatically encrypted using the account's default KMS key for EBS
- D) The volume is encrypted only if the AMI was created from an encrypted snapshot

**Answer: C** — When "Always encrypt new EBS volumes" is enabled at the account/Region level, all new EBS volumes — including those created during instance launch — are automatically encrypted using the default EBS KMS key, regardless of whether the developer specified encryption.

---

## What's Next

Next: Placement Groups and Elastic IPs — how to control where AWS physically places your EC2 instances to optimize for performance, fault tolerance, or regulatory isolation, and how to manage persistent public IP addresses.
