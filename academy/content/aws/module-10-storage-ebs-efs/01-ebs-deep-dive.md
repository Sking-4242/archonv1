---
title: "EBS Deep Dive: Volume Types and Performance"
type: content
estimated_minutes: 18
cert_tags: ["SAA-C03", "CLF-C02"]
---

# EBS Deep Dive: Volume Types and Performance

> **Builds on:** Module 7 Lesson 6 (`06-ebs.md`) introduced EBS fundamentals — volume types, snapshots, and encryption basics — in the context of EC2. This lesson assumes that foundation and goes deeper: full volume type performance specifications, the IOPS vs. throughput distinction, io2 Block Express, Multi-Attach, and snapshot chain management. Skim Module 7's EBS lesson first if you haven't already.

## Overview

Amazon Elastic Block Store (EBS) is the persistent block storage layer for EC2. Every time you launch an EC2 instance and choose a volume for its root device or attach additional storage, you are working with EBS. Unlike the ephemeral instance store that lives on the physical host's local disks, EBS volumes are network-attached — they persist independently of the instance lifecycle. An EBS volume exists until you explicitly delete it. You can stop an instance, come back six months later, and the data is exactly where you left it.

The key architectural constraint that shapes everything about EBS is the Availability Zone boundary. An EBS volume lives in one AZ, and it can only be attached to EC2 instances in that same AZ. This is not a limitation to work around — it is a fundamental design decision that enables the low-latency, high-throughput network path between an instance and its volume. When you need storage accessible across AZs, you need a different service (EFS for file, S3 for object). When you need high-performance block storage tightly coupled to a single instance's workload, EBS is the right tool.

EBS performance has two axes that the exam tests in depth: IOPS (input/output operations per second, measuring how many random read/write transactions the volume can handle) and throughput (megabytes per second, measuring how fast large sequential blocks of data move). These two metrics sound similar but behave very differently. A database doing thousands of tiny 4KB random reads per second is IOPS-bound. A data pipeline doing sequential 1MB writes across a large dataset is throughput-bound. Choosing the wrong volume type because you conflated these two metrics is one of the most common real-world EBS sizing mistakes, and it is a direct exam topic.

## Core Concepts

### gp3: The New General-Purpose Default

gp3 (General Purpose SSD, third generation) is the volume type you should use for almost every new workload unless you have a specific reason to choose otherwise. It delivers 3,000 IOPS and 125 MB/s throughput at baseline — for free, regardless of volume size — and you can independently scale IOPS up to 16,000 and throughput up to 1,000 MB/s by paying extra, without increasing the volume's capacity.

The word "independently" is critical. Its predecessor, gp2, coupled IOPS directly to storage size at a ratio of 3 IOPS per GB. If you needed 6,000 IOPS, you had to provision at least a 2,000 GB volume whether your application actually needed that space or not. This created systematic over-provisioning at cost. With gp3, a 100 GB volume can be configured with 10,000 IOPS. You pay for the IOPS separately, at a lower total cost than over-sizing a gp2 volume. AWS pricing reflects this: gp3 is approximately 20% cheaper per GB than gp2 before even accounting for the savings from not over-provisioning.

The exam will show you scenarios where someone needs "3,000 IOPS on a 20 GB volume." The answer is gp3. With gp2 you would need a 1,000 GB volume to reach 3,000 IOPS (3 IOPS/GB × 1,000 GB). gp3 gets you there at 20 GB with zero size change required.

### gp2: Legacy Burst Model

gp2 is the previous generation general-purpose SSD. You will still see it in exam scenarios because many existing workloads run on gp2, and migration questions are common. The IOPS model is: 3 IOPS per GB, minimum 100 IOPS, maximum 16,000 IOPS (requiring a 5,334 GB volume to hit the ceiling). For volumes under 1,000 GB, gp2 has a burst mechanism that allows up to 3,000 IOPS using I/O credits, similar to the T-series CPU burst model. Credits deplete under sustained load and replenish when I/O drops below baseline. This burst behavior is a common exam trap: a small gp2 volume may handle burst traffic fine in testing but throttle in production when I/O credits run out.

Throughput on gp2 is also tied to IOPS and maxes at 250 MB/s. You cannot configure it independently. For the exam, anytime you see a scenario that demands flexible IOPS/throughput configuration, independent of volume size, gp3 is the answer.

### io2 Block Express: Maximum Performance

io2 Block Express is EBS's highest-performance volume type, designed for the most demanding workloads — large Oracle databases, SAP HANA, SQL Server Always On, high-frequency trading platforms. Key specifications:

- **Maximum IOPS:** 256,000 per volume (16× more than gp3's 16,000 IOPS max)
- **Maximum throughput:** 4,000 MB/s per volume
- **Latency:** Sub-millisecond, consistent (not burst-based)
- **Durability:** 99.999% (five nines) annual failure rate, compared to 99.8–99.9% for other volume types
- **IOPS:GB ratio:** Up to 500:1 (a 200 GB io2 volume can be provisioned at 100,000 IOPS)
- **Multi-Attach:** Supported (covered below)

The 99.999% durability figure is worth memorizing as an exam differentiator. For a critical database where data loss is financially or legally catastrophic, the extra nine over gp3 or io1 is the architectural justification for the higher per-IOPS price. io1 is the older provisioned IOPS type (max 64,000 IOPS, 99.8% durability) — treat it as legacy. For new deployments requiring provisioned IOPS, always use io2.

### HDD Volumes: st1 and sc1

SSD volumes optimize for latency — the ability to quickly locate and transfer any random block on the disk. HDD volumes sacrifice random-access latency in exchange for much higher throughput on large sequential reads and writes, at significantly lower cost per GB. They cannot be used as boot volumes.

**st1 (Throughput Optimized HDD):** Designed for workloads that read or write large sequential data streams — Hadoop, Kafka consumers, MapReduce, ETL pipelines, log aggregation. Maximum throughput: 500 MB/s per volume. Maximum IOPS: 500 (but each "I/O" is a large sequential block, so throughput dominates). Minimum size: 125 GB, maximum: 16 TB. Cost: approximately $0.045/GB-month. The exam will describe a "large sequential workload" or "data lake ingest" and expect you to recognize st1.

**sc1 (Cold HDD):** The cheapest EBS option, designed for infrequently accessed data — archives, compliance data that must be retained but rarely read, cold data tiers. Maximum throughput: 250 MB/s. Cost: approximately $0.015/GB-month. The exam will describe "lowest cost block storage" for infrequent access and expect sc1.

### IOPS vs. Throughput: Why the Distinction Matters

This is one of the most tested concepts in storage questions. IOPS measures how many I/O operations per second the volume can process. Throughput measures how many bytes per second move. The relationship between them depends on I/O size:

```
Throughput (MB/s) = IOPS × I/O block size
```

A volume running 16,000 IOPS at 4 KB blocks produces only 64 MB/s of throughput. The same volume running 16,000 IOPS at 64 KB blocks produces 1,000 MB/s. Database workloads typically use small block sizes (4–16 KB) and are IOPS-bound. Backup and ETL workloads use large sequential blocks (512 KB–1 MB) and are throughput-bound.

When the exam asks why a workload "saturates" before hitting the stated IOPS ceiling, the answer is often the throughput ceiling. gp3's max throughput of 1,000 MB/s caps out at 125,000 4 KB IOPS worth of throughput — so even if you configure 16,000 IOPS, large-block I/O can hit the throughput wall first.

### EBS-Optimized Instances and the Bandwidth Ceiling

A critical concept that exam questions undertest but real architects miss constantly: **the instance type caps your EBS bandwidth, regardless of how the volume is configured.**

EBS-optimized instances provide a dedicated network path between the instance and EBS, preventing EBS traffic from competing with regular network traffic. All modern instance types (C5, M5, R5, and newer) are EBS-optimized by default. Older instance types required manual opt-in.

More importantly, each instance type has a maximum EBS bandwidth specification. An `m5.large` supports approximately 4,750 Mbps (~594 MB/s) of EBS bandwidth. If you attach a gp3 volume configured for 1,000 MB/s throughput to an `m5.large`, you will never exceed ~594 MB/s — because the instance's EBS bandwidth is the bottleneck. The volume's capability is irrelevant beyond that ceiling.

This is why storage benchmarking must be done on the correct instance type. Undersizing the instance invalidates all volume-level configuration choices.

### Multi-Attach: Shared Block Storage

EBS Multi-Attach allows a single io1 or io2 volume to be attached simultaneously to up to 16 Nitro-based EC2 instances within the same AZ. Every attached instance has full read-write access to the entire volume.

The critical requirement: **your application must handle concurrent writes correctly.** Standard Linux filesystems (ext4, XFS) do not support concurrent multi-host writes — they assume exclusive ownership. Multi-Attach requires a cluster-aware filesystem like GFS2 (Global File System 2), OCFS2, or application-level concurrency management.

Use cases: Oracle RAC (Real Application Clusters) for high-availability database clustering, high-availability OLTP applications where two active instances must share block-level storage for failover. The exam will occasionally test that Multi-Attach is io1/io2 only, same AZ, and requires cluster filesystem awareness.

### EBS vs. Instance Store

Instance store volumes are physically attached to the host server running your EC2 instance. They deliver very high IOPS and low latency because there is no network hop. The trade-off: they are ephemeral. If the instance stops, hibernates, or fails, all instance store data is permanently lost. Reboots preserve instance store data; stops do not.

| Characteristic | EBS | Instance Store |
|---|---|---|
| Persistence | Survives instance stop/termination | Lost on instance stop |
| Performance | Network-attached (excellent but not bare-metal) | Bare-metal NVMe, highest possible |
| Cost | Pay per GB + IOPS configured | Included in instance pricing |
| Snapshots | Yes | No |
| AZ portability | Detach/reattach within AZ | Tied to physical host |

Use instance store for temporary data: scratch space, caches, buffers, MapReduce intermediate data. Use EBS for anything that must persist.

## Configuration Reference

### Create a gp3 Volume with Custom IOPS and Throughput

```bash
# Create a 500 GB gp3 volume with 8,000 IOPS and 500 MB/s throughput
# Default baseline is 3,000 IOPS / 125 MB/s — we are increasing both independently
aws ec2 create-volume \
  --availability-zone us-east-1a \
  --volume-type gp3 \
  --size 500 \
  --iops 8000 \                  # Range: 3,000–16,000 IOPS
  --throughput 500 \             # Range: 125–1,000 MB/s
  --encrypted \                  # Always enable encryption
  --tag-specifications 'ResourceType=volume,Tags=[{Key=Name,Value=prod-db-data}]'
```

### Create an io2 Volume with Provisioned IOPS

```bash
# Create a 200 GB io2 volume with 100,000 IOPS (500:1 IOPS:GB ratio — maximum)
# This is appropriate for a high-transaction Oracle or SAP HANA workload
aws ec2 create-volume \
  --availability-zone us-east-1a \
  --volume-type io2 \
  --size 200 \
  --iops 100000 \                # io2 max: 256,000 IOPS; ratio cap: 500 IOPS/GB
  --encrypted \
  --kms-key-id alias/my-ebs-key  # Optional: specify a customer-managed KMS key
```

### Enable Multi-Attach on an io2 Volume

```bash
# Create an io2 volume with Multi-Attach enabled
# Requires Nitro-based instances; all attached instances must be in the same AZ
aws ec2 create-volume \
  --availability-zone us-east-1a \
  --volume-type io2 \
  --size 500 \
  --iops 50000 \
  --multi-attach-enabled \       # Enables attachment to up to 16 instances
  --encrypted

# Attach the same volume to two instances
aws ec2 attach-volume --volume-id vol-0abc123 --instance-id i-0instance1 --device /dev/sdf
aws ec2 attach-volume --volume-id vol-0abc123 --instance-id i-0instance2 --device /dev/sdf
```

### Live Volume Modification (No Downtime Required)

```bash
# Modify a running gp2 volume to gp3, increasing IOPS and throughput
# The volume stays attached and in service during modification
aws ec2 modify-volume \
  --volume-id vol-0abc123def456 \
  --volume-type gp3 \
  --iops 6000 \                  # Increase from gp2's size-linked IOPS
  --throughput 400               # Set independently — impossible on gp2

# Check modification progress
aws ec2 describe-volumes-modifications \
  --volume-ids vol-0abc123def456 \
  --query 'VolumesModifications[*].{State:ModificationState,Progress:Progress}'
```

After a modify-volume on Linux, you may need to extend the filesystem (not the volume — the volume is already at the new size):

```bash
# For XFS filesystem (Amazon Linux 2, most AL2023 defaults):
sudo xfs_growfs /dev/xvdf

# For ext4 filesystem:
sudo resize2fs /dev/xvdf
```

### Console: Volume Type Comparison

Navigate to **EC2 → Volumes → Create volume** to see the type selector. In the console, the volume type dropdown shows current per-GB pricing inline when you select each type.

| Volume Type | Use Case | Max IOPS | Max Throughput | Durability | Price (us-east-1) |
|---|---|---|---|---|---|
| gp3 | General purpose | 16,000 | 1,000 MB/s | 99.8–99.9% | ~$0.08/GB-month |
| gp2 | Legacy general purpose | 16,000 | 250 MB/s | 99.8–99.9% | ~$0.10/GB-month |
| io2 Block Express | Mission-critical DB | 256,000 | 4,000 MB/s | 99.999% | ~$0.125/GB + $0.065/IOPS |
| io1 | Legacy provisioned IOPS | 64,000 | 1,000 MB/s | 99.8–99.9% | ~$0.125/GB + $0.065/IOPS |
| st1 | Sequential throughput | 500 | 500 MB/s | 99.8–99.9% | ~$0.045/GB-month |
| sc1 | Cold archival | 250 | 250 MB/s | 99.8–99.9% | ~$0.015/GB-month |

### Enable Default Encryption for All New Volumes (Account-Level)

Console path: **EC2 → Account attributes → EBS encryption → Enable** (per region, per account).

```bash
# Enable EBS encryption by default for new volumes in the current region
aws ec2 enable-ebs-encryption-by-default

# Verify the setting
aws ec2 get-ebs-encryption-by-default
# Returns: {"EbsEncryptionByDefault": true}
```

## How to Decide

Use this table to select the right volume type given workload characteristics:

| Scenario | Right Volume Type | Why |
|---|---|---|
| General web app, small-to-mid database, default choice | gp3 | Lowest cost, flexible IOPS/throughput, no burst risk |
| Legacy workload already on gp2 with no immediate migration plan | gp2 | Acceptable to leave; migrate to gp3 at next maintenance window |
| Oracle, SAP HANA, SQL Server with >16,000 IOPS requirement | io2 Block Express | Only type reaching 256k IOPS with sub-ms latency and 5-nines durability |
| Need guaranteed IOPS but ≤64,000; cost-sensitive | io1 | Cheaper than io2 when durability SLA isn't the deciding factor |
| Hadoop, Kafka, ETL, large sequential reads/writes | st1 | Throughput-optimized; 500 MB/s at much lower cost than SSD |
| Cold archive, compliance retention, rarely read | sc1 | Lowest EBS cost per GB |
| Temporary scratch space, cache, MapReduce intermediates | Instance store | No persistence needed; maximum raw performance |
| Multiple EC2 instances must share one block volume (same AZ) | io2 with Multi-Attach | Only io1/io2 support Multi-Attach; requires cluster filesystem |
| Instance has IOPS headroom but throughput is saturated | Upgrade instance type or add volumes | Instance EBS bandwidth ceiling is the true limit |

**Decision rule for IOPS vs. throughput:** Ask the workload's I/O size. Random 4–16 KB → IOPS-bound → gp3/io2. Sequential 256 KB+ → throughput-bound → st1 or gp3 with high throughput config.

## How This Connects

- **EC2 instance sizing affects EBS performance.** An io2 volume configured for 256,000 IOPS is useless on an instance with a 10,000 Mbps EBS bandwidth cap. Instance type selection and volume type selection must be co-optimized. This is tested in "why is my storage performance not matching the spec" troubleshooting scenarios.
- **EBS encryption integrates with KMS.** Account-default encryption uses the `aws/ebs` service-managed key. For compliance workloads requiring key rotation control and audit logs, you configure a customer-managed key (CMK) in KMS and reference it when creating volumes. Covered in Module 14 (KMS and encryption).
- **EBS snapshots build on volume type.** Any EBS volume type can be snapshotted. Snapshots are the mechanism for cross-AZ and cross-region data movement, AMI creation, and backup. Covered in the next lesson.
- **Auto Scaling and launch templates reference volume type.** When EC2 Auto Scaling launches new instances, the root volume type and configuration come from the launch template. Specifying gp3 with correct IOPS in the launch template ensures every auto-scaled instance gets the right storage from the start. Covered in Module 6 (Auto Scaling).
- **EBS vs. EFS vs. S3 is a recurring decision.** EBS is block storage, one AZ, one instance (except Multi-Attach). EFS is shared file storage, multi-AZ. S3 is object storage, globally durable. Each module that introduces storage alternatives tests your ability to pick the right service. The key differentiator for EBS: you need a block device, you have a single primary writer, and you need the lowest latency.

## Exam Traps

**Trap 1: "gp2 and gp3 have the same IOPS ceiling so they are equivalent."**
They both top out at 16,000 IOPS, but gp2 requires a 5,334 GB volume to reach that ceiling, while gp3 reaches 16,000 IOPS at any size for an additional per-IOPS charge. Additionally, gp2 caps throughput at 250 MB/s while gp3 allows 1,000 MB/s. They are not equivalent for throughput-sensitive workloads.

**Trap 2: "I configured my io2 volume for 200,000 IOPS so I'll get 200,000 IOPS."**
You will only get 200,000 IOPS if your instance type's EBS bandwidth ceiling supports it. If you are running on an instance that caps at 80,000 IOPS worth of EBS throughput, your 200,000 IOPS volume will never exceed that. The instance is the bottleneck, not the volume.

**Trap 3: "Multi-Attach means any volume type can be shared across instances."**
Multi-Attach is exclusively supported on io1 and io2 volumes. gp3 does not support Multi-Attach. Additionally, Multi-Attach only works within a single AZ, and a standard filesystem like ext4 on a Multi-Attach volume will cause data corruption because it is not cluster-aware.

**Trap 4: "st1 is good for any high-performance storage because it's cheaper than SSD."**
st1 is optimized for sequential throughput, not random IOPS. st1 volumes support only 500 IOPS. A database doing random 4 KB reads will perform catastrophically on st1 compared to gp3. Use st1 only when the access pattern is confirmed sequential.

**Trap 5: "EBS encryption adds latency."**
On modern EC2 instances (Nitro), EBS encryption is handled entirely in hardware by the Nitro security chip. There is no measurable CPU overhead and no latency penalty. This is an explicit AWS design goal. Any answer choice suggesting encryption slows EBS is wrong.

## Summary

- gp3 is the default choice for new EBS volumes — independently configurable IOPS (up to 16,000) and throughput (up to 1,000 MB/s), 20% cheaper than gp2.
- io2 Block Express delivers up to 256,000 IOPS, sub-millisecond latency, and 99.999% durability — use it for mission-critical databases with guaranteed performance requirements.
- st1 (500 MB/s sequential throughput) and sc1 (250 MB/s, lowest cost) are HDD types for sequential and archival workloads respectively; neither can be a boot volume.
- The EBS bandwidth ceiling of the instance type constrains actual volume performance — volume configuration alone is insufficient without matching instance sizing.
- Multi-Attach (io1/io2 only, same AZ, up to 16 instances) enables shared block storage clusters but requires a cluster-aware filesystem like GFS2.
- EBS encryption via Nitro hardware has zero latency penalty; enable it by default at the account level.

## Examples

A small e-commerce startup runs its web application on a single EC2 instance with a PostgreSQL database. They create a 100 GB gp3 volume configured at the default 3,000 IOPS and 125 MB/s. When their Black Friday traffic spikes and the DBA notices query latency climbing, they run `aws ec2 modify-volume` to bump IOPS to 8,000 and throughput to 400 MB/s with no downtime, no data movement, no instance reboot. The modification completes in under an hour while the application continues serving traffic. This is the core value proposition of gp3: you provision conservatively and scale up in minutes when the workload demands it, without over-provisioning upfront.

A fintech company runs a high-transaction Oracle database processing financial trades. Their SLA requires sub-millisecond storage latency and 99.999% annual durability. They provision a 400 GB io2 Block Express volume with 200,000 IOPS. Their application server runs on a `c5n.18xlarge` — an instance type with 19,000 Mbps EBS bandwidth, sufficient to support the IOPS target at their 4 KB I/O size. When their storage architect proposes moving to gp3 to save cost, the team correctly identifies that gp3's 16,000 IOPS ceiling is insufficient for peak transaction rates and the 99.8% durability SLA does not meet their regulatory requirements. The io2 price premium is the right call.

A financial services firm builds a high-availability OLTP cluster where two active EC2 instances must simultaneously write to shared block storage for split-brain protection. They provision an io2 volume with Multi-Attach enabled, attach it to both `r6i.4xlarge` Nitro instances in us-east-1a, and configure GFS2 as the cluster filesystem. Their operations team documents the setup carefully because GFS2 configuration is operationally complex and an incorrectly installed standard filesystem would cause silent data corruption. This is a narrow use case — EFS or RDS Multi-AZ would be simpler in most scenarios — but Multi-Attach with a cluster filesystem is the correct architectural tool when the application requires shared block-level storage with simultaneous write access.

## Think About It

1. A team needs 10,000 IOPS on a dataset that is only 50 GB. On gp2 they would need to provision a 3,334 GB volume to reach 10,000 IOPS (3 IOPS/GB). How does gp3 solve this, and what does this tell you about the design philosophy change from "coupled" to "decoupled" performance models?
2. You configure an io2 volume at 100,000 IOPS and attach it to an `m5.xlarge` instance. Benchmarks show you're only achieving 32,000 IOPS. What is most likely causing this, and how would you diagnose it? What would you change in your architecture?
3. A data engineering team wants to use st1 volumes to store raw data for their Spark ETL pipeline. Their colleague argues that gp3 with high throughput would be better. What criteria would you use to evaluate both options, and under what specific conditions would st1 win the cost-performance comparison?
4. Multi-Attach with ext4 will cause data corruption. Walk through why: what assumption does ext4 make about exclusive disk ownership, and exactly what sequence of events leads to corruption when two hosts write concurrently without filesystem-level coordination?
5. Your security team mandates encryption for all EBS volumes. A developer complains this will slow down the database. How do you address this concern with specifics about where in the hardware stack encryption happens, and what evidence would you present to close the objection?

## Quick Check

**Q1.** A team needs a new EBS volume with 8,000 IOPS on a 100 GB dataset. The volume must cost less than an equivalent gp2 configuration. Which volume type and configuration achieves this?

- A) gp2 at 2,667 GB (to reach 8,000 IOPS at 3 IOPS/GB)
- B) gp3 at 100 GB with 8,000 IOPS configured independently
- C) io1 at 100 GB with 8,000 IOPS
- D) st1 at 100 GB with burst IOPS enabled

**Answer: B** — gp3 decouples IOPS from size, so 8,000 IOPS on a 100 GB volume is valid and cheaper than a 2,667 GB gp2. io1 would also work technically but costs more than gp3 for this IOPS level.

**Q2.** A storage architect attaches an io2 volume configured for 200,000 IOPS to an EC2 instance. Benchmarks show only 60,000 IOPS achieved. The volume configuration is confirmed correct. What is the most likely cause?

- A) io2 volumes require a warm-up period before reaching rated IOPS
- B) EBS encryption overhead is consuming available IOPS
- C) The EC2 instance type's EBS bandwidth ceiling is lower than the volume's rated IOPS
- D) Multi-Attach must be enabled to unlock the full IOPS of io2 volumes

**Answer: C** — The instance EBS bandwidth ceiling caps achievable IOPS regardless of volume configuration. Encryption does not impact IOPS on Nitro instances. Multi-Attach has no bearing on single-instance IOPS.

**Q3.** Which statement about EBS Multi-Attach is correct?

- A) Any EBS volume type supports Multi-Attach if the instance type is Nitro-based
- B) Multi-Attach volumes can be attached to instances in different AZs within the same region
- C) Multi-Attach requires io1 or io2 volume type and a cluster-aware filesystem for concurrent writes
- D) Multi-Attach automatically handles filesystem consistency without special configuration

**Answer: C** — Multi-Attach is exclusive to io1/io2 volumes, limited to the same AZ, and requires a cluster-aware filesystem (e.g., GFS2) to prevent data corruption from uncoordinated concurrent writes.

## What's Next

Next up: EBS Snapshots — incremental mechanics, Fast Snapshot Restore, Data Lifecycle Manager, and AWS Backup for automated, policy-driven backup management.
