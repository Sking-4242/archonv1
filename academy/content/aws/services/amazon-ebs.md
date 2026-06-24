---
title: "Amazon EBS"
type: content
estimated_minutes: 20
cert_tags: ["CLF-C02", "SAA-C03", "SOA-C03", "SCS-C03"]
---

# Amazon EBS

## Overview

Amazon Elastic Block Store (EBS) provides durable, network-attached **block storage** volumes for EC2 instances — the virtual hard drives that instances boot from and store data on. Where S3 is object storage accessed over an API, EBS presents a raw block device that an operating system formats and mounts like a physical disk. This *service reference* lesson covers EBS volume types and how to choose them, the snapshot model, encryption, performance limits, and what each certification expects.

EBS matters because most stateful EC2 workloads — databases, file systems, boot volumes — need persistent, low-latency block storage that survives instance stop/start and can be backed up and moved. The defining property is that an EBS volume is **network-attached and decoupled from the instance lifecycle**: it persists independently, can be detached and reattached, and is automatically replicated within its Availability Zone for durability. The key constraint to remember is that a volume lives in **one Availability Zone** and can only attach to instances in that same AZ; crossing an AZ or Region boundary requires a snapshot.

---

## How It Works

You create a volume of a chosen type and size, attach it to an instance in the same AZ, and the OS sees a block device to partition, format, and mount. EBS volume types fall into two categories:

- **SSD-backed**, optimized for **IOPS** (transactional, small/random I/O): **gp3** and **gp2** (general purpose) and **io2 Block Express / io1** (provisioned IOPS for the most demanding databases, with io2 offering higher durability and the highest IOPS/throughput).
- **HDD-backed**, optimized for **throughput** (large, sequential I/O): **st1** (throughput optimized — big data, log processing) and **sc1** (cold, lowest cost, infrequent access). HDD types cannot be boot volumes.

**gp3** is the modern general-purpose default: it lets you provision IOPS (baseline 3,000) and throughput independently of capacity, usually at lower cost than gp2 (whose performance scales with size). **Snapshots** are **incremental** point-in-time backups stored durably in S3-backed storage managed by AWS (not visible in your buckets); each snapshot only stores blocks changed since the last one, but you can delete any snapshot safely because AWS retains the blocks newer snapshots still need.

---

## Key Features

- **Snapshots** — incremental, point-in-time backups that are the basis of backup, AZ/Region migration, and AMI creation. Copy them cross-Region (and cross-account) for DR, and automate creation/retention with **Amazon Data Lifecycle Manager** or **AWS Backup**. **Recycle Bin** can protect against accidental snapshot deletion.
- **Encryption** with **KMS**: encrypting a volume also encrypts its snapshots, any volumes restored from those snapshots, and data in transit between the volume and instance. Account-level **default encryption** enforces it on every new volume.
- **Elastic Volumes** — modify type, size (increase only), and provisioned performance with no downtime; the OS then grows the filesystem.
- **Multi-Attach** (io1/io2) — attach one volume to multiple instances in the same AZ for clustered apps using a cluster-aware file system.
- **Fast Snapshot Restore (FSR)** — eliminates the first-touch latency penalty when restoring volumes from a snapshot, important for rapid scale-out from a golden snapshot.

---

## Configuration Reference

- **Right-size type and performance.** gp3 for most workloads; io2 Block Express for high-IOPS/low-latency databases; st1 for throughput-heavy sequential workloads; sc1 for cold data.
- **Default encryption.** Enable account/Region-level EBS encryption by default so every new volume and snapshot is KMS-encrypted with your chosen key.
- **Delete-on-termination.** The root volume defaults to delete-on-terminate; set data volumes to persist if you need to retain them.
- **Backups.** Define a Data Lifecycle Manager or AWS Backup policy with schedule, retention, and cross-Region copy; use Recycle Bin for accidental-deletion protection.

---

## Operations and Troubleshooting

- **AZ binding.** A volume cannot attach across AZs; to move data to another AZ or Region, snapshot it and create a new volume (or copy the snapshot cross-Region first). This is also the only way to "migrate" a volume.
- **Performance limits.** Achieved throughput/IOPS can be capped by the volume type, the provisioned IOPS/throughput, *or* the **instance's EBS bandwidth** — an undersized or non-EBS-optimized instance throttles a fast volume. Diagnose with CloudWatch volume metrics: `VolumeReadOps`/`WriteOps`, throughput, `VolumeQueueLength` (sustained high queue = the volume is the bottleneck), and burst-balance metrics on gp2/st1/sc1.
- **Encrypting an existing unencrypted volume.** You cannot toggle encryption in place: snapshot the volume, **copy the snapshot with encryption enabled** (choosing a KMS key), then create a new volume from the encrypted snapshot and swap it in.
- **Sharing.** Encrypted snapshots shared cross-account require sharing the KMS key (a custom CMK, not the AWS-managed key) with the target account.

---

## Integrations

EBS is the boot and data storage for **EC2**, encrypted by **KMS**, backed up via S3-backed snapshots managed by **AWS Backup**/Data Lifecycle Manager, and monitored by **CloudWatch**. Snapshots underpin **AMIs** and disaster recovery. For shared file access across instances or AZs (which EBS cannot do natively), the companion service is **EFS**; for ephemeral high-speed local disk, it's **instance store**. **GuardDuty Malware Protection for EC2** scans EBS volumes by taking a snapshot, so the snapshot mechanism is a security primitive too.

---

## Pricing and Cost Considerations

EBS charges for **provisioned volume capacity** (per GB-month) regardless of how full the volume is, plus **provisioned IOPS/throughput** for the performance-provisioned types (io1/io2, and any IOPS/throughput you add to gp3 above its baselines), and **snapshot storage** (incremental, in S3-backed storage). The cost levers are right-sizing capacity and performance, choosing **gp3 over gp2** where it is cheaper for equal performance, deleting **unattached volumes** and **stale snapshots**, and using lifecycle/retention policies so backups don't accumulate forever. Because snapshots are incremental, frequent snapshots are cheaper than they appear. Exact prices vary by type, Region, and over time.

---

## Exam Relevance

**CLF-C02:** Know EBS as persistent block storage for EC2, distinct from S3 (object) and instance store (ephemeral), and that snapshots provide backups. Foundational.

**SAA-C03:** Know volume-type selection (gp3 vs. io2 vs. st1/sc1), AZ binding and the snapshot-to-migrate pattern, Multi-Attach, FSR, and encryption — recurring design content.

**SOA-C03:** Operate volumes — CloudWatch metrics and the queue-length/instance-bandwidth diagnosis, Elastic Volumes live resizing, snapshot automation via DLM/AWS Backup, and Recycle Bin. Operations depth.

**SCS-C03:** Secure data at rest — KMS encryption, default-encryption enforcement, the snapshot-copy re-encryption pattern, and cross-account encrypted-snapshot sharing (key sharing required). Security depth.

---

## Summary

Amazon EBS provides durable, network-attached, AZ-bound block storage for EC2: SSD types (gp3/gp2 for general IOPS, io1/io2 for high performance) and HDD types (st1 throughput, sc1 cold). Volumes are resizable live via Elastic Volumes, encrypted with KMS (which also encrypts snapshots and restores), and backed up via incremental snapshots that enable migration and DR. Performance can be limited by the volume settings *or* the instance's EBS bandwidth, and encryption is applied by snapshot-copy rather than in place. The AZ-binding/snapshot-to-migrate rule, the queue-length performance diagnosis, and KMS-key sharing for cross-account snapshots are the frequent exam points. EBS is the persistent disk layer for stateful EC2; EFS is its shared-file complement and instance store its ephemeral fast-local alternative.

---

## Quick Check

1. How does block storage (EBS) differ from object storage (S3) and from ephemeral instance store?
2. Why can't you attach a volume to an instance in another AZ, and what is the procedure to move the data there?
3. Which volume type is the modern general-purpose default, and what does it let you provision independently of capacity?
4. Besides the volume's own settings, what else can throttle EBS throughput, and which metric flags the volume as the bottleneck?
5. What are the exact steps to encrypt an existing unencrypted volume, and what extra step is needed to share an encrypted snapshot cross-account?

---

## What's Next

Pair this with **Amazon EC2** (which EBS boots), **AWS KMS** (volume encryption), and **Amazon EFS** (shared file storage). For backups and DR, see the cert lessons on data integrity and resilient backups.
