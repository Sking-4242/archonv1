---
title: "Amazon FSx: Purpose-Built Managed File Systems"
type: content
estimated_minutes: 18
cert_tags: ["SAA-C03", "SAP-C02"]
---

# Amazon FSx: Purpose-Built Managed File Systems

## Overview

Amazon FSx exists because EFS and EBS cannot serve every workload. EFS is a solid general-purpose NFS filesystem for Linux, but it does not speak SMB, it does not deliver hundreds of gigabytes per second of parallel throughput, it has no concept of NetApp SnapMirror replication, and it does not support ZFS-native clones and snapshots. When a workload demands a specific protocol, a specific performance tier, or OS-native features that Linux NFS simply does not provide, FSx is the answer. FSx is not a competitor to EFS — it is the category of managed filesystems for everyone EFS was not built for.

AWS currently offers four FSx variants, each targeting a distinct workload class. FSx for Windows File Server targets Windows-native SMB workloads integrated with Active Directory. FSx for Lustre targets high-performance computing and machine learning training. FSx for NetApp ONTAP targets enterprise teams running NetApp on-premises who want to extend or migrate without retraining. FSx for OpenZFS targets high-performance Linux NFS workloads that benefit from ZFS-native data management. Each variant is a fully managed service: AWS handles hardware provisioning, patching, backups, and failover so your team operates the filesystem, not the infrastructure underneath it.

For the AWS certification exams, FSx questions are almost always protocol-driven or workload-driven. The exam will describe a scenario — Windows clients joined to AD, HPC jobs needing hundreds of GB/s, a NetApp migration, a Linux NFS workload needing ZFS clones — and expect you to match it to the correct FSx variant. The traps are subtle: FSx for ONTAP supports NFS, but EFS is almost always the simpler choice for a greenfield Linux workload. FSx for Windows is the only option that gives you SMB with Active Directory integration and VSS. FSx for Lustre is the only option for parallel HPC throughput. Knowing what each variant does and why it exists is more valuable than memorizing its exact throughput numbers.

## Core Concepts

### FSx for Windows File Server

FSx for Windows File Server provides a fully managed Windows-native file server backed by SSD or HDD storage. The protocol is SMB (Server Message Block), the filesystem is NTFS, and the service integrates natively with AWS Managed Microsoft AD or a self-managed on-premises AD domain. This is not a Linux NFS server wearing a compatibility layer — it is a real Windows filesystem with Windows semantics.

The key features that make FSx for Windows irreplaceable for Windows workloads are Active Directory integration, DFS Namespaces, and VSS (Volume Shadow Copy Service). Active Directory integration means your Windows clients authenticate to FSx using the same Kerberos tickets they use for every other domain resource — no separate credentials to manage, no identity translation layer. DFS Namespaces allow multiple file server paths to appear as a single logical namespace (`\\corp\shares\` instead of `\\fsx-12345.corp.example.com\data\`), which is how enterprise Windows environments abstract physical file server locations from end users. VSS (Volume Shadow Copy Service) enables application-consistent snapshots of open files — critical for backing up SQL Server user databases, Exchange mailboxes, or any Windows application that holds file handles open continuously.

FSx for Windows supports Single-AZ and Multi-AZ deployment modes. Single-AZ is cheaper but loses availability if the AZ fails. Multi-AZ deploys a standby file server in a second AZ and performs automatic failover — the DNS endpoint stays the same, and SMB clients reconnect transparently. For production Windows workloads, Multi-AZ is the standard recommendation.

**When to use over EFS:** Any time the workload runs on Windows, requires SMB protocol, integrates with Active Directory, or needs VSS snapshots. EFS cannot speak SMB and has no AD integration. There is no configuration path that makes EFS work for Windows-native workloads.

### FSx for Lustre

Lustre is an open-source parallel filesystem originally developed for the U.S. Department of Energy's national laboratories and used in the world's largest HPC clusters. Its design principle is opposite to a general-purpose filesystem: rather than optimizing for metadata-heavy, many-small-files access patterns, Lustre optimizes for massive sequential throughput across thousands of simultaneous readers and writers. Data is striped across multiple storage nodes so aggregate throughput scales with the number of nodes, not the speed of any single disk.

FSx for Lustre delivers sub-millisecond latencies and can reach hundreds of GB/s aggregate throughput — performance numbers that are physically impossible with EFS, which is designed for consistent low-latency NFS access across many clients, not maximum aggregate bandwidth. The target workloads are HPC simulations, genomics pipelines, deep learning training (where hundreds of GPU nodes simultaneously read training data), video rendering, and financial risk modeling.

A critical feature for ML and HPC workflows is S3 data repository integration. You link an FSx for Lustre filesystem to an S3 bucket and specify a data repository association. Data is not copied to Lustre on creation — it is imported lazily: when a compute node first reads a file path, Lustre fetches it from S3 and caches it on the Lustre filesystem. Subsequent reads come from Lustre at full speed. After computation completes, output files can be exported back to S3 using a data repository task. This pattern is fundamental to cost-efficient HPC on AWS: S3 stores the long-term dataset cheaply; Lustre provides the high-performance scratch layer only during active compute.

Lustre offers two deployment types with meaningfully different failure characteristics. **Scratch** filesystems use no data replication and provide the highest throughput per dollar — if the underlying storage fails, data is lost. Scratch is appropriate for temporary HPC jobs where the input data is already safely in S3 and the Lustre filesystem holds only intermediate computation results. **Persistent** filesystems protect against failures with two sub-types: **Persistent 1** replicates data within a single AZ across multiple storage servers, protecting against individual server failures. **Persistent 2** (the current recommended deployment type) replicates data across multiple AZs, providing higher durability and resilience against a full AZ failure. For new persistent workloads, use Persistent 2 unless you have a specific reason to use Persistent 1. Persistent is appropriate for long-running jobs, workflows where regenerating lost data would be expensive, or any workload where the Lustre filesystem is the authoritative copy of data in progress.

**When to use over EFS:** Any HPC, ML training, or high-throughput data processing workload where aggregate throughput matters more than access patterns. EFS at Max I/O performance mode can handle many-client NFS workloads, but it cannot approach Lustre's throughput for large sequential reads.

### FSx for NetApp ONTAP

FSx for NetApp ONTAP is a managed deployment of the NetApp ONTAP filesystem, providing the complete ONTAP feature set in AWS. The critical differentiator is multi-protocol access: a single FSx for ONTAP filesystem simultaneously presents NFS (v3 and v4.1) for Linux clients, SMB for Windows clients, and iSCSI for block-level access. No other AWS storage service presents all three protocols from the same data store.

Beyond multi-protocol, FSx for ONTAP brings the full suite of ONTAP data management features: **SnapMirror** replicates data to another ONTAP system (on-premises or in another AWS Region) for disaster recovery. **FlexClone** creates writable, space-efficient clones of volumes in seconds without copying data — a CI/CD workflow can clone a 50 TB production dataset for testing without consuming 50 TB of storage. **Thin provisioning** allocates storage on write rather than on volume creation. **Deduplication and compression** reduce storage consumption automatically. **Tiering to S3** moves cold data blocks from the primary NVMe or SSD tier to S3-backed capacity tier storage automatically based on access frequency.

The target audience is any team already running NetApp ONTAP on-premises. They know ONTAP's CLI, they understand its snapshot model, their monitoring integrates with ONTAP, and their runbooks are written for ONTAP. FSx for NetApp ONTAP lets that team extend to AWS without retraining — the same management APIs, the same SnapMirror workflows, the same snapshot policies. This is a lift-and-shift story for storage administrators.

**When to use over EFS:** When you already run ONTAP on-premises and need multi-protocol access, ONTAP-native features (SnapMirror, FlexClone, tiering), or need iSCSI alongside NFS. For a greenfield Linux NFS workload with no ONTAP history, EFS is simpler and cheaper. ONTAP's feature richness is only valuable if you use those features.

### FSx for OpenZFS

FSx for OpenZFS provides a managed OpenZFS filesystem with NFS access (v3 and v4.2). ZFS is a combined filesystem and logical volume manager with a distinctive data model: every write is a copy-on-write operation so the disk is never in an inconsistent state, snapshots are instantaneous and space-efficient because they only record changes from the parent, and clones are writable copies of a snapshot that share unchanged data with the parent.

FSx for OpenZFS delivers up to 1 million IOPS and 12.5 GB/s throughput with sub-millisecond latency — comparable to high-performance EBS volumes but with NFS multi-client access. The typical use case is a Linux workload that currently runs on on-premises ZFS (common in media/entertainment, DevOps, and scientific computing environments) and needs to migrate to AWS while preserving ZFS-native workflows like snapshot-based backups and clone-based test environments.

The difference from FSx for NetApp ONTAP is scope: OpenZFS provides ZFS features over NFS for Linux clients. ONTAP provides NetApp's more extensive enterprise feature set over multiple protocols. If you need ZFS but not multi-protocol access and not the full ONTAP management surface, OpenZFS is the simpler, lower-cost option.

**When to use over EFS:** When the workload needs ZFS-specific features (instant snapshots, writable clones, copy-on-write consistency guarantees) or is migrating from an on-premises ZFS environment. EFS has snapshot capabilities via AWS Backup, but they are not ZFS-native and do not support writable clones.

## Configuration Reference

### FSx for Windows File Server — CLI Creation and AD Join

Creating an FSx for Windows File Server filesystem with Active Directory integration:

```bash
# Step 1: Create the filesystem joined to AWS Managed Microsoft AD
aws fsx create-file-system \
  --file-system-type WINDOWS \
  --storage-capacity 2000 \                         # GiB — minimum 32 GiB
  --storage-type SSD \                              # SSD or HDD
  --subnet-ids subnet-0abc1234 subnet-0def5678 \    # Two subnets for Multi-AZ
  --windows-configuration '{
    "ActiveDirectoryId": "d-9067654321",            # AWS Managed AD directory ID
    "ThroughputCapacity": 32,                       # MB/s — 8 to 2048
    "DeploymentType": "MULTI_AZ_1",                 # or SINGLE_AZ_2
    "PreferredSubnetId": "subnet-0abc1234",
    "AutomaticBackupRetentionDays": 7,
    "DailyAutomaticBackupStartTime": "02:00",
    "WeeklyMaintenanceStartTime": "1:05:00"         # Day:Hour:Minute UTC
  }' \
  --tags Key=Environment,Value=Production Key=Team,Value=IT

# Step 2: Retrieve the DNS name after creation (used for SMB share mapping)
aws fsx describe-file-systems \
  --file-system-ids fs-0123456789abcdef0 \
  --query 'FileSystems[0].DNSName'

# Result example: "amznfsx1234abcd.corp.example.com"
# Map drive on Windows: net use Z: \\amznfsx1234abcd.corp.example.com\share
```

**Console path:** FSx > Create file system > Amazon FSx for Windows File Server > Configure filesystem (storage, throughput, AZ) > Windows Configuration (select AD directory, set throughput capacity) > Review and create.

**To join a self-managed (on-premises) AD instead of AWS Managed AD**, replace `ActiveDirectoryId` with `SelfManagedActiveDirectoryConfiguration`:

```bash
"SelfManagedActiveDirectoryConfiguration": {
  "DomainName": "corp.example.com",
  "UserName": "FSxAdmin",                          # AD user with delegation rights
  "Password": "{{resolve:secretsmanager:fsx-ad-password}}",
  "DnsIps": ["10.0.1.10", "10.0.1.11"],           # Your on-premises DNS servers
  "OrganizationalUnitDistinguishedName": "OU=FSx,DC=corp,DC=example,DC=com"
}
```

### FSx for Lustre — CLI Creation and S3 Data Repository Association

```bash
# Step 1: Create a Persistent Lustre filesystem
aws fsx create-file-system \
  --file-system-type LUSTRE \
  --storage-capacity 1200 \                         # GiB — must be multiple of 1200 for PERSISTENT_2
  --storage-type SSD \
  --subnet-ids subnet-0abc1234 \                    # Lustre is single-AZ
  --lustre-configuration '{
    "DeploymentType": "PERSISTENT_2",               # SCRATCH_1, SCRATCH_2, or PERSISTENT_2
    "PerUnitStorageThroughput": 250,                # MB/s per TiB — 125, 250, 500, or 1000
    "DataCompressionType": "LZ4",                  # Reduces storage consumption
    "AutoImportPolicy": "NEW_CHANGED_DELETED"       # Auto-sync changes from S3
  }' \
  --tags Key=Project,Value=MLTraining

# Step 2: Create a data repository association linking Lustre to S3
aws fsx create-data-repository-association \
  --file-system-id fs-0123456789abcdef0 \
  --file-system-path /datasets \                    # Mount path on the Lustre filesystem
  --data-repository-path s3://my-training-data/ \  # S3 bucket or prefix
  --s3 '{
    "AutoImportPolicy": {
      "Events": ["NEW", "CHANGED", "DELETED"]
    },
    "AutoExportPolicy": {
      "Events": ["NEW", "CHANGED", "DELETED"]      # Auto-export results back to S3
    }
  }'

# Step 3: Mount on EC2 (requires Lustre client installed)
# Amazon Linux 2: sudo amazon-linux-extras install -y lustre
sudo mount -t lustre \
  -o relatime,flock \
  fs-0123456789abcdef0.fsx.us-east-1.amazonaws.com@tcp:/fsx \
  /mnt/fsx
```

**Console path:** FSx > Create file system > Amazon FSx for Lustre > Deployment type (Scratch 1/2 or Persistent 1/2) > Storage (capacity, throughput per TiB) > Data repository integration (S3 bucket, import/export policies) > Review and create.

### FSx for NetApp ONTAP — CLI Creation

```bash
# Create an FSx for NetApp ONTAP filesystem with Multi-AZ
aws fsx create-file-system \
  --file-system-type ONTAP \
  --storage-capacity 1024 \
  --storage-type SSD \
  --subnet-ids subnet-0abc1234 subnet-0def5678 \    # Preferred and standby subnets
  --ontap-configuration '{
    "DeploymentType": "MULTI_AZ_1",                # or SINGLE_AZ_1
    "PreferredSubnetId": "subnet-0abc1234",
    "ThroughputCapacity": 512,                     # MB/s
    "AutomaticBackupRetentionDays": 7,
    "FsxAdminPassword": "{{resolve:secretsmanager:ontap-admin-pw}}"
  }'

# Create a Storage Virtual Machine (SVM) — each SVM is an isolated namespace
aws fsx create-storage-virtual-machine \
  --file-system-id fs-0123456789abcdef0 \
  --name prod-svm \
  --active-directory-configuration '{
    "SelfManagedActiveDirectoryConfiguration": {
      "DomainName": "corp.example.com",
      "UserName": "FSxAdmin",
      "Password": "{{resolve:secretsmanager:ad-password}}",
      "DnsIps": ["10.0.1.10"]
    }
  }'

# Create a volume within the SVM
aws fsx create-volume \
  --volume-type ONTAP \
  --name prod-vol \
  --ontap-configuration '{
    "SvmId": "svm-0123456789abcdef0",
    "JunctionPath": "/vol1",
    "SizeInMegabytes": 102400,
    "StorageEfficiencyEnabled": true,              # Enables dedup + compression
    "TieringPolicy": {
      "Name": "AUTO",                             # AUTO tiers cold data to S3 capacity tier
      "CoolingPeriod": 31
    }
  }'
```

### FSx for OpenZFS — CLI Creation

```bash
aws fsx create-file-system \
  --file-system-type OPENZFS \
  --storage-capacity 512 \
  --storage-type SSD \
  --subnet-ids subnet-0abc1234 \
  --open-zfs-configuration '{
    "DeploymentType": "SINGLE_AZ_1",
    "ThroughputCapacity": 4096,                   # MB/s — 64 to 12288
    "RootVolumeConfiguration": {
      "DataCompressionType": "ZSTD",              # NONE, ZSTD, or LZ4
      "NfsExports": [
        {
          "ClientConfigurations": [
            {
              "Clients": "10.0.0.0/16",
              "Options": ["rw", "crossmnt", "sync", "no_root_squash"]
            }
          ]
        }
      ]
    }
  }'

# Create a child volume with snapshot and clone configuration
aws fsx create-volume \
  --volume-type OPENZFS \
  --name datasets \
  --open-zfs-configuration '{
    "ParentVolumeId": "fsvol-0123456789abcdef0",
    "DataCompressionType": "ZSTD",
    "StorageCapacityReservationGiB": 256,
    "UserAndGroupQuotas": [
      {"Type": "USER", "Id": 1001, "StorageCapacityQuotaGiB": 50}
    ]
  }'
```

**Console path for all FSx variants:** FSx > Create file system > Select variant > Configure deployment type, storage, throughput > Networking (VPC, subnets, security groups) > Backup and maintenance > Tags > Review and create.

### Comparison Table

| FSx Variant | Protocol(s) | Primary Use Case | Key Differentiating Features |
|---|---|---|---|
| Windows File Server | SMB (NFS via DFS workarounds) | Windows workloads, .NET apps, SQL Server user DBs, SharePoint | AD integration, NTFS, VSS, DFS Namespaces, Multi-AZ failover |
| Lustre | POSIX (Lustre client) | HPC, ML training, genomics, video processing | Hundreds GB/s aggregate throughput, S3 lazy-load, parallel striping |
| NetApp ONTAP | NFS + SMB + iSCSI simultaneously | NetApp migrations, multi-protocol enterprise storage | SnapMirror, FlexClone, thin provisioning, dedup, S3 tiering |
| OpenZFS | NFS (v3, v4.2) | ZFS migrations, high-perf Linux NFS, snapshot/clone workflows | ZFS CoW, instant snapshots, writable clones, up to 1M IOPS |
| EFS (for comparison) | NFS (v4.1) | General Linux NFS, serverless, containers | Elastic scaling, Bursting/Provisioned throughput, Access Points |

## How to Decide

| Scenario | Choose |
|---|---|
| Windows clients, Active Directory, SMB shares | FSx for Windows File Server |
| HPC or ML training — need hundreds of GB/s aggregate throughput | FSx for Lustre |
| Existing NetApp ONTAP on-premises — lift-and-shift or extend | FSx for NetApp ONTAP |
| Need NFS + SMB + iSCSI from the same filesystem | FSx for NetApp ONTAP |
| Linux NFS, ZFS features (snapshots, clones), high IOPS | FSx for OpenZFS |
| General Linux NFS, no specific protocol or performance requirements | Amazon EFS |
| Short-lived HPC job, input data in S3, disposable scratch | FSx for Lustre — Scratch deployment |
| Long-running HPC simulation, can't afford data loss on failure | FSx for Lustre — Persistent deployment |
| New workload, no existing storage platform investment | EFS (Linux) or FSx for Windows (Windows) |

**Tie-breaker rule:** If the workload is on Linux and does not require ZFS-specific features, multi-protocol access, or HPC-level throughput, default to EFS. FSx variants earn their cost and operational complexity only when EFS genuinely cannot do the job.

## How This Connects

- **VPC and Security Groups:** All FSx filesystems live inside your VPC and require security group rules that allow the correct protocol port (SMB: 445, NFS: 2049, iSCSI: 3260) from the subnets where your EC2 instances or on-premises clients reside via Direct Connect or VPN.
- **AWS Backup integration:** All four FSx variants integrate with AWS Backup for policy-driven, cross-region backup — FSx does not replace a backup strategy, it complements it. FSx for Windows VSS snapshots are in addition to AWS Backup, not a substitute.
- **Amazon S3 as a staging layer:** FSx for Lustre uses S3 for lazy-load and export, FSx for ONTAP can tier cold data to S3, and FSx for OpenZFS snapshots can be exported to S3 via AWS Backup. S3 threads through every FSx variant as a durable backing store.
- **EC2 instance types and network performance:** FSx throughput is partially constrained by EC2 network bandwidth. High-throughput Lustre workloads require instances with sufficient Enhanced Networking bandwidth (C5n, P4d, Hpc6a) — a Lustre filesystem capable of 300 GB/s is useless if the EC2 instance's network caps at 25 GB/s.
- **DR and Multi-AZ:** FSx for Windows and FSx for ONTAP offer native Multi-AZ HA. FSx for Lustre is single-AZ only — disaster recovery for Lustre relies on S3 data repository associations (the source data is durable in S3). FSx for OpenZFS is single-AZ, with cross-region disaster recovery handled through AWS Backup.

## Exam Traps

**Trap 1: "FSx for ONTAP supports NFS, so it's interchangeable with EFS."** False. FSx for ONTAP is the right choice when you have existing NetApp investment, need multi-protocol, or need ONTAP-specific features like SnapMirror. For a greenfield Linux NFS workload with no ONTAP history, EFS is simpler, cheaper, and more appropriate. ONTAP's feature richness is overhead if you do not use those features.

**Trap 2: "FSx for Lustre Scratch mode is fine for week-long HPC jobs because data can just be re-run."** Dangerous reasoning. A Scratch filesystem has no data replication — an underlying storage failure loses all data on that filesystem. For a 6-day simulation, regenerating from scratch is not just time cost, it is compute cost. Scratch mode is for short jobs (hours, not days) where loss is cheap. Persistent mode is for any workload where mid-job data loss is materially painful.

**Trap 3: "The S3 data repository association copies all data to Lustre immediately."** False. Lustre uses lazy-loading — data is imported from S3 only when first accessed. The first job to touch a file incurs a read penalty as it fetches from S3. If you need all data preloaded before a time-sensitive job starts, you must run a preload task (`aws fsx create-data-repository-task --type IMPORT_METADATA_FROM_REPOSITORY`) or warm the filesystem by reading all files before the compute job begins.

**Trap 4: "FSx for Windows can be mounted on Linux EC2 instances with the right NFS client."** FSx for Windows speaks SMB, not NFS. While Linux can mount SMB shares using the `cifs` kernel module, FSx for Windows is not designed for Linux-primary workloads and does not expose an NFS endpoint. For multi-OS access (Linux NFS + Windows SMB), FSx for NetApp ONTAP is the correct tool.

**Trap 5: "FSx for OpenZFS and FSx for NetApp ONTAP are the same thing for ZFS workloads."** ONTAP is a NetApp product — it uses ONTAP's proprietary filesystem, not ZFS. OpenZFS is based on the open-source ZFS codebase. A team migrating from Sun/Oracle ZFS or on-premises OpenZFS should choose FSx for OpenZFS. A team migrating from NetApp ONTAP should choose FSx for NetApp ONTAP. They are not interchangeable despite both having snapshot and cloning capabilities.

## Summary

- Amazon FSx provides four distinct managed filesystem options, each purpose-built for a specific workload class and protocol requirement — they are not interchangeable, and the correct choice is almost always determined by the protocol, existing platform investment, or performance requirement of the workload.
- FSx for Windows File Server is the only AWS managed storage service that provides SMB with native Active Directory integration, NTFS semantics, DFS Namespaces, and VSS — it is the correct answer whenever the workload is Windows-native.
- FSx for Lustre delivers parallel HPC/ML throughput that no other AWS storage service can match, with S3 lazy-load integration that allows cost-efficient HPC workflows where S3 stores data long-term and Lustre provides a high-performance scratch layer only during active compute.
- FSx for NetApp ONTAP earns its complexity when you already run ONTAP, need multi-protocol (NFS + SMB + iSCSI simultaneously), or need ONTAP-specific data management features like SnapMirror and FlexClone — for greenfield Linux NFS, EFS is the right default.
- FSx for OpenZFS targets Linux NFS workloads migrating from ZFS environments, delivering ZFS-native snapshots and writable clones with up to 1 million IOPS at sub-millisecond latency.
- EFS remains the correct default for general-purpose Linux NFS workloads — FSx variants add cost and operational complexity that is only justified when EFS genuinely cannot satisfy the workload's protocol, performance, or feature requirements.

## Examples

A mid-sized law firm migrates its on-premises Windows file server environment to AWS. Their lawyers' PCs are joined to Active Directory, their backup software uses VSS for consistent snapshots of open files, and their IT team uses DFS Namespaces so that `\\corp\cases\` resolves to whichever physical file server is current without lawyers needing to know hostnames. They deploy FSx for Windows File Server in Multi-AZ configuration, connect it to their existing AWS Managed Microsoft AD, and configure the DNS namespace so `\\corp\cases\` resolves to the FSx DNS endpoint. The lawyers notice nothing changed. VSS backup jobs that previously ran against their on-premises Windows file server now run identically against FSx, because FSx exposes the same VSS provider interface. DFS Namespaces continue to work because FSx integrates with AD-based DFS. The CLI creation command specifies `ActiveDirectoryId` pointing to the AWS Managed AD directory, `DeploymentType: MULTI_AZ_1`, and `ThroughputCapacity: 32` to start — the team can scale throughput capacity online without recreating the filesystem.

A pharmaceutical company trains large deep learning models for drug discovery. Their training datasets are 80 TB of molecular structure data stored in S3. They need a shared filesystem that thousands of GPU cores running in parallel on a P4d EC2 cluster can read simultaneously at hundreds of GB/s with sub-millisecond latency. They provision FSx for Lustre in Persistent mode with 250 MB/s per TiB provisioned throughput, linked to the S3 bucket via a data repository association with `AutoImportPolicy: NEW_CHANGED_DELETED`. Before the first training job, they run a metadata import task to warm the filesystem. During training, each GPU node reads training batches from the Lustre mount at `/mnt/fsx/datasets` — Lustre stripes each file across multiple storage nodes so that aggregate read throughput scales with the size of the filesystem, not with any single storage component. After training, model checkpoints written to `/mnt/fsx/outputs` are automatically exported to S3 via the AutoExportPolicy. The cost model is efficient: 80 TB of Lustre Persistent storage runs during training runs only — between runs, the data lives in S3 at a fraction of the cost.

A DevOps platform team runs a mixed-protocol environment. Build agents on Linux need NFS for their build cache. Windows integration-test VMs need SMB to read shared test fixtures. A legacy Oracle RAC cluster needs iSCSI block storage. Their on-premises solution was NetApp ONTAP, and the storage administrators know SnapMirror, FlexClone, and ONTAP CLI well. They migrate to FSx for NetApp ONTAP in Multi-AZ configuration. They create a single Storage Virtual Machine (SVM), attach it to their Active Directory for SMB authentication, and create volumes for each workload. Linux build agents mount via NFS v4.1, Windows VMs connect via SMB using AD credentials, and Oracle RAC connects via iSCSI — all from the same SVM, all from the same underlying storage pool. The team uses FlexClone to create writable clones of the production data volume for integration testing without duplicating 50 TB of storage. The operational insight: FSx for ONTAP's value is proportional to how deeply the team exploits its feature set. For this team, with existing ONTAP knowledge and a multi-protocol requirement, it is the only option that works.

## Think About It

1. FSx for Lustre lazy-loads data from S3 when first accessed. What performance problem does this create for the first job that runs on a newly provisioned Lustre filesystem linked to an S3 bucket, and what specific steps would you take before launching a time-sensitive HPC job to ensure the performance penalty does not affect the production compute run?
2. Why would a company choose FSx for NetApp ONTAP over EFS for a workload that only needs NFS access on Linux? What would that choice reveal about the organization's priorities, constraints, or existing technology investments — and what ongoing operational cost does it imply?
3. FSx for Windows File Server integrates with Active Directory for authentication and access control. What specific security and operational problems would arise if you tried to serve Windows clients using EFS instead, and what does that gap tell you about when protocol-specific managed services justify their cost premium over general-purpose alternatives?
4. FSx for Lustre offers Scratch (no replication) and Persistent (replicated within AZ) deployment types. A genomics research team plans a week-long simulation job that would take 4 days to re-run from scratch if it fails. Which deployment type is appropriate, and how do you quantify the real cost of choosing the cheaper option if the job fails on day six?
5. How would you decide between FSx for OpenZFS and FSx for NetApp ONTAP for a new workload that needs high-performance NFS and snapshot/clone capabilities, with no existing investment in either platform? What questions would you ask the team before making the recommendation?

## Quick Check

**Q1.** A company needs to deploy a managed file system on AWS with SMB protocol support, Active Directory integration, and VSS snapshot compatibility for Windows workloads running on Windows Server EC2 instances and on-premises Windows clients via Direct Connect. Which FSx option should they choose?

- A) FSx for Lustre
- B) FSx for OpenZFS
- C) FSx for NetApp ONTAP
- D) FSx for Windows File Server

**Answer: D** — FSx for Windows File Server provides native SMB, NTFS, AD integration, and VSS support. FSx for ONTAP also supports SMB, but it is the right choice when you need multi-protocol or have existing ONTAP investment, not when the sole requirement is Windows-native SMB with AD and VSS.

**Q2.** An HPC cluster running on thousands of GPU instances needs a shared filesystem capable of hundreds of GB/s aggregate throughput with sub-millisecond latency. The input training dataset is stored in Amazon S3. Which combination of services provides the most cost-efficient architecture for the active training period?

- A) Amazon EFS in Max I/O performance mode, with direct S3 access from compute nodes
- B) FSx for Lustre linked to the S3 bucket via a data repository association
- C) FSx for NetApp ONTAP with NFS access and S3 tiering enabled
- D) EBS io2 volumes with Multi-Attach enabled across the GPU instances

**Answer: B** — FSx for Lustre is the only AWS storage service designed for HPC-scale aggregate throughput. The S3 data repository association allows the training dataset to remain in S3 long-term and be lazy-loaded into Lustre only during active training runs, minimizing the cost of high-performance storage.

**Q3.** Which FSx deployment type for Lustre is most appropriate for a short-lived, temporary HPC job that runs for 4 hours, where all input data is already stored in S3 and intermediate results do not need to survive a storage failure?

- A) Persistent HDD
- B) Persistent SSD
- C) Scratch
- D) Multi-AZ

**Answer: C** — Scratch deployments have no data replication and are the lowest-cost option. For a 4-hour job where inputs are in S3 and intermediate results are disposable, Scratch is appropriate and cost-efficient. Multi-AZ is not an FSx for Lustre option — Lustre is single-AZ.

## What's Next

Next up: AWS Storage Gateway — bridging on-premises storage with AWS using NFS, SMB, iSCSI, and virtual tape library interfaces.
