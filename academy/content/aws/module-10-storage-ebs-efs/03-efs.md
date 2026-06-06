---
title: "Amazon EFS: Elastic File System"
type: content
estimated_minutes: 18
cert_tags: ["SAA-C03", "CLF-C02"]
---

# Amazon EFS: Elastic File System

## Overview

Amazon Elastic File System (EFS) is a fully managed, elastic NFS (Network File System) service that provides shared file storage for Linux-based workloads. Unlike EBS — where a volume is bound to one Availability Zone and typically attached to one instance — EFS presents a single filesystem namespace that can be mounted simultaneously by thousands of EC2 instances, ECS tasks, Lambda functions, and on-premises servers, across multiple AZs in a region. The filesystem scales storage automatically from kilobytes to petabytes without provisioning or capacity planning. You pay only for what you store.

The networking model that makes multi-AZ shared access possible is the mount target. EFS creates one mount target per AZ, each with its own IP address and security group. Clients connect to the mount target in their own AZ — keeping traffic local within the AZ for performance — while EFS replicates data durably across multiple AZs behind the scenes. For clients in us-east-1a, traffic goes to the us-east-1a mount target. For clients in us-east-1b, it goes to the us-east-1b mount target. The filesystem DNS name resolves to the correct AZ's mount target automatically based on the requesting client's AZ.

EFS is the right service when multiple compute resources need to read and write the same files concurrently — web content shared across an Auto Scaling fleet, shared configuration or model files for machine learning, user home directories for a Linux platform, or datasets that data science teams need to access from multiple Jupyter instances simultaneously. It is not a replacement for EBS (which delivers lower latency, higher IOPS per volume, and is required for boot volumes and databases with random I/O patterns) or S3 (which is durable object storage for unstructured data at scale). The EBS vs. EFS vs. S3 decision is explicitly tested, and knowing the conditions under which each is correct is a direct exam requirement.

## Core Concepts

### NFSv4.1/4.2 and the Mount Target Architecture

EFS uses the NFSv4.1 and NFSv4.2 protocols — the current major versions of the Network File System standard, originally developed for Unix systems. Any NFS client that speaks NFSv4.1 can mount EFS, including standard Linux NFS clients and the AWS EFS mount helper (`amazon-efs-utils`). The mount helper is recommended because it adds TLS encryption in transit and simplifies mounting by resolving the filesystem DNS name correctly.

Each EFS filesystem has one mount target per AZ. A mount target is an NFS endpoint with a private IP address inside your VPC subnet, governed by a security group. The security group on the mount target must allow inbound TCP on port 2049 (NFS) from the security groups of the clients that need to mount the filesystem.

The filesystem has a DNS name in the form: `<filesystem-id>.efs.<region>.amazonaws.com`. This DNS name resolves to the IP address of the mount target in the same AZ as the querying client — this is the automatic AZ-locality that makes EFS high-availability work. If the mount target in a given AZ is missing or in an error state, clients in that AZ cannot mount the filesystem until the mount target is repaired or recreated.

### Performance Modes

EFS offers two performance modes, set at filesystem creation time and not changeable afterward:

**General Purpose (default):** Optimized for latency-sensitive workloads. Supports up to 35,000 read IOPS and 7,000 write IOPS. Latency for metadata operations (file open, close, stat, readdir) is in the low single-digit milliseconds. This is the correct choice for the vast majority of workloads: web serving, CMS content repositories, home directories, containerized applications, ML model storage.

**Max I/O:** Optimized for aggregate throughput at the cost of higher latency. Supports essentially unlimited aggregate IOPS (tens of thousands of concurrent operations) but adds latency to every metadata operation — typically 10–100ms vs. sub-5ms in General Purpose. Use Max I/O only for massively parallel workloads where hundreds or thousands of instances are performing I/O simultaneously and aggregate throughput matters more than per-operation latency: genomics pipelines, media rendering farms, large-scale scientific computing.

> **Important:** Max I/O performance mode is no longer available when creating new EFS file systems (deprecated for new filesystems as of late 2023). Existing filesystems with Max I/O retain the mode, but new filesystems must use General Purpose mode (which now supports Elastic Throughput for high-concurrency use cases). If you encounter Max I/O on the exam, understand what it does — but for new deployments, General Purpose with Elastic Throughput is the answer.

Exam note: Max I/O has higher latency — not lower. Answers that describe Max I/O as "lower latency than General Purpose" are wrong.

### Throughput Modes

Throughput mode controls how much bandwidth EFS can deliver and how it is billed. This is separate from performance mode.

**Elastic Throughput (recommended for most workloads):** Automatically scales throughput up and down in real time based on actual workload demand, with no configuration required. Throughput scales from a minimum baseline to a maximum of 3 GB/s for reads and 1 GB/s for writes. You pay per GB transferred (not for provisioned throughput). This is the lowest-complexity, lowest-risk option: the system handles capacity automatically and you cannot under-provision or over-provision.

**Provisioned Throughput:** You set a specific throughput value (in MB/s) independent of filesystem size, and you pay for it regardless of whether you use it. Use when you have a predictably high throughput requirement and your filesystem is small — the burst credits from the Bursting model would run out quickly, but Elastic Throughput's cost would be high if throughput is continuously sustained.

**Bursting Throughput:** Throughput scales with filesystem size. The baseline is 50 KB/s per GB of storage used; burst throughput allows up to 100 MB/s (or the size-based rate, whichever is higher) when burst credits are available. This model was the original EFS throughput approach. It works well for larger filesystems with variable workloads, but for small filesystems with sustained I/O demand, burst credits deplete quickly and throughput drops to the baseline.

> **Important:** Bursting Throughput mode is no longer available when creating new EFS file systems (deprecated for new filesystems as of late 2023). New filesystems must choose Elastic or Provisioned throughput. Existing filesystems on Bursting Throughput continue to operate as before. For the exam, understand how Bursting works — but the correct answer for "what throughput mode should a new EFS filesystem use?" is Elastic Throughput for most workloads.

### Storage Classes and Intelligent Tiering

EFS has two primary storage classes:

**EFS Standard:** Data is stored redundantly across three or more AZs within the region. High durability and availability. Approximately $0.30/GB-month (us-east-1).

**EFS Standard-IA (Infrequent Access):** Same multi-AZ durability as Standard but at approximately $0.025/GB-month — roughly 8× cheaper. Trade-off: the first access of a file in IA incurs a per-GB retrieval charge (~$0.01/GB) and slightly higher latency on that first read. Suitable for data that is rarely accessed but must remain available.

**EFS One Zone and One Zone-IA:** Same performance characteristics but data is stored in a single AZ only. Lower cost (~$0.16/GB-month for One Zone) but with reduced durability — an AZ failure means the data is unavailable until the AZ recovers (it is not replicated elsewhere). Appropriate for dev/test environments or data that can be regenerated.

**Lifecycle Management (Intelligent Tiering):** EFS can automatically move files between Standard and Standard-IA based on access patterns. You configure a lifecycle policy specifying the transition threshold: files not accessed in 7, 14, 30, 60, or 90 days are automatically moved to Standard-IA. Files moved to IA are automatically moved back to Standard on first access. This is similar in concept to S3 Intelligent-Tiering but for filesystem semantics. Enable lifecycle management at the filesystem level — it applies to all files in the filesystem.

### EFS Access Points

Access Points are application-specific entry points into an EFS filesystem that enforce two things:

1. **A root directory path.** The Access Point presents a specific directory (e.g., `/app/tenantA/data`) as the apparent root of the filesystem to the mounting client. The mounting client cannot navigate above that path — it cannot see `/app/tenantB/` or `/app/` itself. This is enforced at the mount layer, not just by filesystem permissions.

2. **A POSIX identity.** The Access Point enforces a specific UID and GID for all file operations performed through it, regardless of the UID/GID of the process on the mounting client. If the access point specifies UID 1001 and GID 1001, all files written through that access point are owned by 1001:1001 on disk, and all read operations are evaluated as if performed by UID 1001.

Combined, these features provide strong isolation between multiple applications sharing one filesystem — each application sees only its own directory tree, and file ownership is enforced at the infrastructure level rather than relying on application-level permission management.

Access Points pair with IAM authorization for EFS. When IAM authorization is enabled, an EC2 instance or ECS task must present an IAM identity with a policy that explicitly grants access to the specific Access Point. This means: even if a misconfigured application has a path traversal vulnerability and tries to access `/app/tenantB/`, the IAM policy restricts which access points the application can use, and the access point restricts the visible path.

### Encryption: At Rest and In Transit

**At-rest encryption** is configured at filesystem creation using AWS KMS. All data in the filesystem — including metadata — is encrypted. You choose between the `aws/elasticfilesystem` service-managed key or a customer-managed key (CMK). At-rest encryption cannot be enabled on an existing unencrypted filesystem; you must create a new encrypted filesystem and migrate data. Enable encryption at rest by default: there is no performance penalty.

**In-transit encryption** uses TLS 1.2 and is implemented by the EFS mount helper (`amazon-efs-utils`). The mount helper wraps the NFS connection in a TLS tunnel. To use in-transit encryption, specify the `tls` mount option. Without `tls`, data moves over NFS in plaintext within the VPC network. For compliance workloads, in-transit encryption is typically required.

## Configuration Reference

### Create an EFS Filesystem

```bash
# Create an EFS filesystem with encryption at rest and Elastic throughput
aws efs create-file-system \
  --performance-mode generalPurpose \    # Alt: maxIO
  --throughput-mode elastic \            # Alt: bursting, provisioned
  --encrypted \                          # Enable at-rest encryption
  --kms-key-id alias/aws/elasticfilesystem \  # Or specify a CMK ARN
  --tags Key=Name,Value=prod-shared-fs \
  --backup false                         # AWS Backup integration (enable for production)
```

### Create Mount Targets in Multiple AZs

```bash
# Create mount targets in three AZs — one per AZ where clients will run
# Each mount target needs a subnet ID and security group

# Mount target in AZ 1
aws efs create-mount-target \
  --file-system-id fs-0abc123def456 \
  --subnet-id subnet-aaa111 \            # Subnet in us-east-1a
  --security-groups sg-0mounttarget      # Must allow inbound TCP 2049 from client SGs

# Mount target in AZ 2
aws efs create-mount-target \
  --file-system-id fs-0abc123def456 \
  --subnet-id subnet-bbb222 \            # Subnet in us-east-1b
  --security-groups sg-0mounttarget

# Mount target in AZ 3
aws efs create-mount-target \
  --file-system-id fs-0abc123def456 \
  --subnet-id subnet-ccc333 \            # Subnet in us-east-1c
  --security-groups sg-0mounttarget

# Verify mount targets are in 'available' state
aws efs describe-mount-targets \
  --file-system-id fs-0abc123def456 \
  --query 'MountTargets[*].{AZ:AvailabilityZoneName,State:LifeCycleState,IP:IpAddress}'
```

### Mount EFS on an EC2 Instance (NFS Client)

```bash
# Install the EFS mount helper (Amazon Linux 2 / AL2023)
sudo yum install -y amazon-efs-utils

# Create a mount directory
sudo mkdir -p /mnt/efs

# Mount without TLS (plaintext — acceptable for non-sensitive data inside VPC)
sudo mount -t efs fs-0abc123def456:/ /mnt/efs

# Mount WITH TLS in-transit encryption (recommended for sensitive data)
# The mount helper handles TLS negotiation automatically
sudo mount -t efs -o tls fs-0abc123def456:/ /mnt/efs

# Mount using NFS client directly (without efs-utils, no TLS)
sudo mount -t nfs4 \
  -o nfsvers=4.1,rsize=1048576,wsize=1048576,hard,timeo=600,retrans=2 \
  fs-0abc123def456.efs.us-east-1.amazonaws.com:/ \
  /mnt/efs

# Add to /etc/fstab for persistence across reboots (with TLS):
echo "fs-0abc123def456:/ /mnt/efs efs defaults,_netdev,tls 0 0" | sudo tee -a /etc/fstab
```

### Create an EFS Access Point

```bash
# Create an Access Point for a specific application/tenant
# This access point enforces:
#   - Root directory: /tenants/customer-123 (created if it doesn't exist)
#   - POSIX UID/GID: 1001/1001 for all operations
aws efs create-access-point \
  --file-system-id fs-0abc123def456 \
  --posix-user '{"Uid": 1001, "Gid": 1001}' \
  --root-directory '{
    "Path": "/tenants/customer-123",
    "CreationInfo": {
      "OwnerUid": 1001,
      "OwnerGid": 1001,
      "Permissions": "750"            # rwxr-x--- for the root directory
    }
  }' \
  --tags Key=Tenant,Value=customer-123

# Mount using the access point (the client sees /tenants/customer-123 as /)
sudo mount -t efs \
  -o tls,accesspoint=fsap-0accesspoint123 \
  fs-0abc123def456:/ \
  /mnt/tenant-123
```

### Configure Lifecycle Policy (Move to IA After 30 Days)

```bash
# Enable lifecycle management: move files not accessed in 30 days to Standard-IA
# Files are moved back to Standard on first access (transition-on-access)
aws efs put-lifecycle-configuration \
  --file-system-id fs-0abc123def456 \
  --lifecycle-policies '[
    {
      "TransitionToIA": "AFTER_30_DAYS"   
    },
    {
      "TransitionToPrimaryStorageClass": "AFTER_1_ACCESS"  
    }
  ]'

# Other valid TransitionToIA values: AFTER_7_DAYS, AFTER_14_DAYS, AFTER_60_DAYS, AFTER_90_DAYS

# Verify the policy is applied
aws efs describe-lifecycle-configuration \
  --file-system-id fs-0abc123def456
```

### Console: EFS File System Creation Walkthrough

Navigate to **EFS → Create file system**:
- **Name:** Descriptive label (does not affect DNS or ID)
- **VPC:** Select the VPC where clients will run
- **Availability and durability:** Regional (multi-AZ, recommended) or One Zone
- **Automatic backups:** Enable for production (integrates with AWS Backup)
- **Lifecycle management:** Configure the IA transition threshold
- **Performance settings:** General Purpose / Elastic Throughput for most workloads
- **Encryption:** Always enable; select aws/elasticfilesystem or a CMK

After creation, click **Network** tab to verify mount targets in each AZ and their states. Click **Access points** tab to create Access Points.

## How to Decide

### EFS vs. EBS vs. S3

| Dimension | EBS | EFS | S3 |
|---|---|---|---|
| Storage type | Block | File (NFS) | Object |
| Access pattern | Single instance, low latency random I/O | Multiple instances/AZs, shared file access | Any number of clients, HTTP(S) API |
| Concurrent writers | 1 (Multi-Attach io2 = up to 16, same AZ) | Thousands, any AZ in region | Unlimited, but eventual consistency per key |
| AZ scope | One AZ | Multi-AZ (Standard) or One Zone | Regional (global with replication) |
| Boot volume | Yes | No | No |
| Max size | 64 TB per volume | Petabytes (auto-scales) | Unlimited |
| Typical use case | Database, root volume, single-app storage | Shared content, home directories, ML datasets | Static assets, data lake, archive, backups |
| Approximate cost | ~$0.08/GB-month (gp3) | ~$0.30/GB-month (Standard) | ~$0.023/GB-month (Standard) |

**Decision rule:** Start with the access pattern. Single primary writer, block I/O, lowest latency → EBS. Multiple readers/writers, shared file semantics across instances or AZs → EFS. Unstructured objects accessed via HTTP or SDK, durability at lowest cost, no file system semantics needed → S3.

### EFS Performance Mode Decision

| Workload | Mode |
|---|---|
| Web serving, databases, CMS, ML inference, home directories | General Purpose |
| Genomics pipelines, media rendering, HPC, 1,000+ concurrent clients | Max I/O |

### EFS Throughput Mode Decision

| Workload Pattern | Mode |
|---|---|
| Variable or unpredictable throughput; most new workloads | Elastic |
| Small filesystem, consistently high throughput demand | Provisioned |
| Large filesystem (several TB+), variable throughput, cost-sensitive | Bursting |

## How This Connects

- **EFS mount targets are VPC resources governed by security groups.** Mount target security group configuration is the most common EFS connectivity failure. Inbound TCP 2049 must be allowed from the client's security group. This connects to VPC networking and security group configuration covered in Module 3.
- **EFS Access Points enable IAM-based authorization for mounts.** When an ECS task definition references an EFS volume with an Access Point, the task's IAM task role must have `elasticfilesystem:ClientMount` permission on that Access Point ARN. This creates a direct dependency between EFS access control and IAM policy design, covered in Module 13.
- **EFS Lifecycle Management uses the same conceptual model as S3 Intelligent-Tiering.** Both services automatically move data between hot and cold storage classes based on access frequency. The threshold configuration and retrieval behavior are analogous. Understanding one makes the other easier. S3 lifecycle policies are covered in Module 11.
- **EFS integrates with AWS Backup for snapshot-based backups.** AWS Backup can back up EFS filesystems on a schedule, retaining point-in-time recovery points in a vault. This is distinct from EFS Replication (a separate feature for cross-region filesystem replication). Covered in Module 10 Lesson 02 (AWS Backup).
- **ECS and EKS workloads use EFS for persistent shared volumes.** ECS task definitions support EFS volume mounts natively, allowing stateful containerized workloads to share data across tasks. EKS uses the EFS CSI driver to provision EFS as a PersistentVolume. Covered in Module 8 (containers).

## Exam Traps

**Trap 1: "EFS and EBS Multi-Attach solve the same problem."**
They do not. EBS Multi-Attach is block storage limited to 16 instances in the same AZ, requiring a cluster filesystem. EFS is a managed NFS service supporting thousands of concurrent clients across all AZs in a region with standard filesystem semantics. They are architecturally different tools for different requirements.

**Trap 2: "Max I/O mode delivers lower latency than General Purpose."**
The opposite is true. Max I/O mode has higher latency per metadata operation in exchange for higher aggregate throughput at massive scale. General Purpose is the low-latency option. This is one of the most commonly inverted exam traps for EFS.

**Trap 3: "Elastic Throughput means unlimited throughput at no additional cost."**
Elastic Throughput scales automatically but bills per GB transferred — it is not free. If your workload continuously transfers large amounts of data, Elastic Throughput cost can exceed Provisioned Throughput cost. Choose the right mode based on your actual throughput pattern and run a cost comparison.

**Trap 4: "EFS works with Windows EC2 instances."**
EFS uses NFSv4.1/4.2, which requires a Linux NFS client. Windows instances cannot natively mount EFS. For Windows shared file storage, use Amazon FSx for Windows File Server (SMB protocol). This is a direct differentiator question between EFS and FSx.

**Trap 5: "Adding a lifecycle policy to EFS automatically encrypts cold data differently."**
Lifecycle policy moves data between storage classes (Standard ↔ Standard-IA) but does not change encryption. Data encrypted at rest remains encrypted using the same KMS key regardless of which storage class it moves to. The lifecycle policy is a cost optimization mechanism, not an encryption change.

## Summary

- EFS provides managed NFSv4.1/4.2 shared file storage — mount from thousands of Linux clients across multiple AZs simultaneously; storage auto-scales with no capacity planning required.
- Mount targets are per-AZ NFS endpoints in your VPC; the filesystem DNS name routes clients to the correct AZ's mount target automatically.
- General Purpose mode is low-latency for most workloads; Max I/O is high-throughput for massively parallel clients but adds latency.
- Elastic Throughput (recommended) auto-scales bandwidth and bills per GB transferred; Provisioned sets a fixed throughput you pay for regardless of use; Bursting scales with filesystem size using a credit model.
- Standard-IA storage class reduces cost ~8× for infrequently accessed files; Lifecycle Management moves files automatically after a configurable number of days without access.
- Access Points enforce a root directory path and POSIX UID/GID at the mount level, enabling strong per-application and per-tenant isolation on a shared filesystem.

## Examples

A containerized web application runs on ECS Fargate tasks distributed across three AZs. The application allows users to upload profile images that must be visible to any container regardless of AZ placement. The team mounts an EFS Standard filesystem into each Fargate task using the EFS volume driver in the task definition. EFS Standard replicates data across three AZs transparently — any container writes an image to EFS and any other container can read it immediately, with no application-level synchronization logic. The team enables Lifecycle Management with a 30-day IA threshold: profile images for inactive accounts migrate to Standard-IA automatically, cutting storage costs without any code change. This is the textbook EFS use case: eliminating the per-instance storage limitation for stateful distributed applications.

A data science team at a healthcare company runs 40 Jupyter notebook servers simultaneously on EC2, all analyzing the same shared dataset of 2 TB of anonymized patient records. They mount the dataset on EFS with Elastic Throughput. When all 40 researchers kick off data loading jobs simultaneously, EFS scales throughput to match the burst demand and scales back down when the jobs finish. With Provisioned Throughput, they would have paid for peak capacity 24/7 even though the peak lasts only 30 minutes per day. Elastic Throughput costs approximately one-third as much in this usage pattern. They configure the filesystem in General Purpose mode because per-operation latency for analytical queries matters more than maximum aggregate throughput.

A platform engineering team builds a multi-tenant SaaS product where customer data must be strictly isolated even though it lives on a shared infrastructure filesystem. They create one EFS Access Point per customer, each with a root path of `/tenants/<customer-id>/` and a dedicated POSIX UID/GID. Each application container is assigned an IAM task role that grants `elasticfilesystem:ClientMount` on only that customer's Access Point ARN. When the application code mounts the filesystem via the Access Point, the OS-level root appears to be `/tenants/<customer-id>/` — path traversal attacks that attempt to read `../../otherCustomer/` hit an NFS-enforced boundary, not just an application permission check. This is a security-in-depth pattern: the Access Point provides an infrastructure-level isolation guarantee that application code cannot accidentally or maliciously bypass.

## Think About It

1. EFS costs approximately four times more per GB than gp3 EBS. Under what specific conditions is that price premium architecturally justified, and when would choosing EFS over EBS indicate a design mistake?
2. You deploy EFS with one mount target in us-east-1a and forget to create mount targets in us-east-1b and us-east-1c. Your Auto Scaling group distributes EC2 instances across all three AZs. What happens to instances in 1b and 1c, and how does this affect your application's availability?
3. A workload requires the highest possible aggregate NFS throughput for a 500-instance parallel rendering cluster. Your colleague recommends Max I/O performance mode. Walk through the trade-offs — what do you gain, what do you give up, and for what class of workloads would you reject Max I/O even at large scale?
4. How do EFS Access Points differ from traditional Linux file permissions as a multi-tenancy isolation mechanism? What specific threat does the Access Point's path enforcement guard against that a `chmod`/`chown` approach cannot?
5. You are choosing between EFS Standard and EFS One Zone for a shared filesystem serving EC2 instances in a single AZ. What failure scenario does the Standard tier protect against that One Zone does not, how likely is that scenario, and what cost trade-off must you justify?

## Quick Check

**Q1.** A development team needs shared file storage simultaneously accessible from EC2 instances in us-east-1a, us-east-1b, and us-east-1c. Which AWS storage service is most appropriate, and what must be configured in each AZ?

- A) EBS with Multi-Attach enabled; one volume attached to all instances
- B) Amazon EFS Standard; one mount target created in each AZ's subnet
- C) Amazon S3; one bucket with AZ-specific prefixes per instance
- D) Instance store; data synced between AZs using rsync

**Answer: B** — EFS Standard provides multi-AZ shared NFS storage. Mount targets must be created in each AZ where clients will connect. EBS Multi-Attach is limited to one AZ; S3 is object storage, not a filesystem; instance store is ephemeral and non-shared.

**Q2.** A team configures an EFS filesystem in Max I/O performance mode, expecting lower latency. What will they actually observe compared to General Purpose mode?

- A) Lower latency for all file operations due to optimized I/O scheduling
- B) Higher aggregate throughput but higher latency for metadata operations such as file open and stat
- C) The same latency, but significantly higher maximum IOPS
- D) Lower latency for read operations only; write latency is unchanged

**Answer: B** — Max I/O mode trades higher per-operation latency (especially metadata operations) for higher aggregate throughput suitable for massively parallel workloads. It does not reduce latency — General Purpose is the low-latency mode.

**Q3.** What two things does an EFS Access Point enforce when an application mounts an EFS filesystem through it?

- A) A maximum file size limit and an inactivity timeout for idle connections
- B) A specific POSIX user identity (UID/GID) and a root directory path that the client cannot navigate above
- C) A bandwidth cap per client and encryption of files stored in that directory
- D) An IAM role for the filesystem and a KMS key for per-access-point encryption

**Answer: B** — An EFS Access Point enforces (1) a POSIX UID/GID applied to all file operations regardless of the client process's identity, and (2) a root directory path that becomes the apparent filesystem root, preventing navigation to parent directories.

## What's Next

Next up: Amazon FSx — purpose-built managed file systems for Windows workloads (FSx for Windows File Server), high-performance computing (FSx for Lustre), NetApp ONTAP features, and OpenZFS.
