---
title: "AWS Storage Gateway: Hybrid Cloud Storage"
type: content
estimated_minutes: 18
cert_tags: ["SAA-C03", "SAP-C02"]
---

# AWS Storage Gateway: Hybrid Cloud Storage

## Overview

AWS Storage Gateway solves a problem that most enterprises face during cloud adoption: on-premises applications, backup software, and storage workflows cannot be instantly rewritten to use native S3 APIs or migrated to EC2 overnight. Storage Gateway acts as a translator — it runs as a virtual appliance (or AWS-provided hardware appliance) in your data center or remote office, presents the standard storage interfaces those applications already speak (NFS, SMB, iSCSI, or virtual tape library), and transparently stores data durably in AWS behind that familiar interface. From the application's perspective, it is writing to a local file server or SAN. From AWS's perspective, that data flows to S3, S3 Glacier, or EBS snapshots.

Storage Gateway offers three distinct gateway types, each targeting a different integration pattern. S3 File Gateway presents NFS and SMB shares backed by S3 objects — the primary use case for on-premises file share extension and cloud-accessible file tiering. Volume Gateway presents iSCSI block storage backed by S3-stored EBS snapshots — the primary use case for block-level backup and disaster recovery. Tape Gateway presents a virtual tape library (VTL) compatible with existing enterprise backup software like Veeam, Veritas NetBackup, and Commvault — the primary use case for replacing physical tape infrastructure without touching backup software or workflows. Each gateway type runs on the same VM or hardware appliance platform; what you choose is the interface type, not different hardware products.

For the AWS certification exams, Storage Gateway questions are almost always about which gateway type matches a described hybrid scenario. The key signal words are: "on-premises file shares" or "NFS/SMB to S3" (S3 File Gateway), "iSCSI block storage with on-premises primary data or S3 as primary" (Volume Gateway Stored or Cached), and "existing backup software, virtual tapes, replace physical tape library" (Tape Gateway). A common exam trap is confusing Stored Volumes (primary data on-premises, AWS is the backup) with Cached Volumes (primary data in S3, local cache for hot data) — get those backwards and the architecture fails in a connectivity outage. Understanding which end holds the authoritative copy of data is the central question for Volume Gateway.

## Core Concepts

### S3 File Gateway

S3 File Gateway presents one or more NFS (v3/v4.1) or SMB file shares to on-premises clients. Every file written to a share is stored as an individual S3 object in a bucket you specify — the file's path becomes the object key. Files read from the share are fetched from S3 and cached locally on the gateway appliance for a configurable cache duration; subsequent reads of the same file come from the local cache. The local disk attached to the gateway VM is the cache volume, not the primary storage — primary storage is always S3.

The key design insight of S3 File Gateway is the dual-access model. On-premises clients access data through the NFS or SMB interface as if it were a standard file server. Cloud-side applications access the same data directly via the native S3 API, S3 Event Notifications, S3 Lifecycle policies, and AWS analytics services like Athena. A single write from an on-premises application flows to S3 and immediately becomes available to cloud workloads without any synchronization step. This makes S3 File Gateway particularly powerful for hybrid architectures where on-premises processes generate data that cloud pipelines must process — log aggregation, media ingest, data collection from IoT or industrial systems, and document archiving.

Cache sizing is critical for S3 File Gateway performance. If the working set of frequently accessed files fits within the local cache, reads are fast (local disk latency). If the working set exceeds the cache, reads require fetching from S3 over the WAN, which adds latency. As a general rule, provision cache storage to hold at least the actively accessed dataset for the past several days. The gateway supports cache refresh on writes (new data is immediately cached) but does not proactively prefetch cold data.

**Deployed as:** VM (VMware ESXi, Microsoft Hyper-V, KVM) or AWS hardware appliance. Gateway requires outbound internet or AWS Direct Connect/VPN for connectivity to S3. After deployment, the gateway is activated by entering the gateway IP address in the AWS console or CLI.

### Volume Gateway — Stored Volumes

Volume Gateway presents iSCSI block storage targets to on-premises servers. Applications connect to these targets just as they would connect to a physical SAN — the OS sees a block device that can be formatted with any filesystem. The distinction between Stored and Cached volumes is fundamental and determines the entire failure mode of the architecture.

In **Stored Volumes** mode, primary data lives on-premises on the gateway's local disk. The gateway asynchronously uploads EBS snapshots of the volume to S3 in the background. AWS stores these snapshots as EBS snapshots — they can be restored to a new EBS volume attached to an EC2 instance, providing a path to run the workload in AWS if the on-premises infrastructure fails. The local disk is the authoritative copy; S3 contains the incremental backup history.

Stored Volumes is the correct pattern when the workload requires local-first performance (sub-millisecond block I/O that cannot tolerate WAN latency on every write) and uses AWS purely for disaster recovery. If the AWS connection is disrupted, the on-premises application continues writing to the local volume with zero impact. The recovery scenario is: on-premises storage fails → restore latest EBS snapshot to EC2 → application resumes in AWS. The gap between the last successful snapshot and the failure is the potential data loss window (RPO).

Stored Volumes support 1 GiB to 16 TiB per volume, up to 32 volumes per gateway (512 TiB total). Snapshot frequency is configurable via snapshot schedules.

### Volume Gateway — Cached Volumes

In **Cached Volumes** mode, primary data lives in S3. The gateway maintains a local cache of recently accessed data blocks on the gateway's local disk. Applications connect via iSCSI as before, but when they read a block that is not in the local cache, the gateway fetches it from S3. Writes go to the local cache first and are asynchronously uploaded to S3.

Cached Volumes is the correct pattern when on-premises disk capacity is the constraint and the goal is to expand effective storage capacity without buying more local hardware, while keeping hot data performant through local caching. The trade-off is connectivity dependency: if the WAN link to AWS is interrupted, writes that have not yet been uploaded to S3 may be buffered in the local cache, but reads of data not in the cache will fail. A prolonged outage degrades cached volume behavior significantly.

The recovery scenario for Cached Volumes differs from Stored: since S3 holds the primary data, the current state of the volume is always in S3, and restoring to EC2 creates an EBS volume from the S3-backed data. The local cache is just a performance layer.

Cached Volumes support 1 GiB to 32 TiB per volume, up to 32 volumes per gateway (1,024 TiB total) — the larger per-volume cap reflects that S3, not local disk, is the capacity limit.

### Tape Gateway

Tape Gateway presents a virtual tape library (VTL) to on-premises backup software. The VTL interface is industry-standard — the same API that physical tape libraries expose via SCSI/iSCSI. Enterprise backup software (Veeam, Veritas NetBackup, Commvault Backup & Recovery, Dell EMC NetWorker, IBM Spectrum Protect, Microsoft Azure Backup Server, and others) connects to the virtual tape library exactly as it connects to a physical tape library: it creates virtual tape cartridges, writes backup streams to them, and ejects them to virtual tape slots.

Virtual tapes in active slots reside in S3. When backup software ejects a tape to the "archive" position (equivalent to shipping physical tape to an off-site vault), the tape is automatically moved to S3 Glacier or S3 Glacier Deep Archive. Retrieval from Glacier is on-demand (a few minutes to hours) compared to the 24–48 hour physical courier cycle for physical off-site tape — compliance retention requirements are met while eliminating physical media handling, courier contracts, and tape silo management.

The architectural value of Tape Gateway is zero change to the backup software layer. The backup administrator does not learn new software. Backup policies, schedules, retention rules, and restore procedures work identically. The only change is that physical tapes become virtual objects in S3/Glacier. This is the cleanest migration path for organizations with mature, heavily customized backup configurations that would take months to rewrite in a cloud-native backup solution.

Tape Gateway supports virtual tapes from 100 GiB to 5 TiB in size, with up to 1,500 virtual tapes per gateway (up to 1 PiB total storage in the virtual tape library).

## Configuration Reference

### Gateway Activation Walkthrough

All Storage Gateway types begin with the same activation process.

**Step 1: Deploy the gateway VM**

Download the gateway VM image from the AWS console (VMware OVA, Hyper-V VHD, or KVM image) and deploy it in your hypervisor. Allocate at minimum:
- CPU: 4 vCPUs
- RAM: 16 GiB
- Network adapter: the gateway must have a static IP or DHCP reservation reachable from AWS
- Local disks: one disk for the VM OS, one or more disks for cache/upload buffer (not OS disks)

```bash
# Alternatively, launch gateway as an EC2 instance for cloud-hosted gateway scenarios
aws ec2 run-instances \
  --image-id ami-0123456789abcdef0 \    # Storage Gateway AMI from AWS Marketplace
  --instance-type m5.xlarge \
  --subnet-id subnet-0abc1234 \
  --security-group-ids sg-0abc1234 \
  --block-device-mappings '[
    {"DeviceName":"/dev/xvda","Ebs":{"VolumeSize":80,"VolumeType":"gp3"}},
    {"DeviceName":"/dev/xvdb","Ebs":{"VolumeSize":1000,"VolumeType":"gp3"}}
  ]'
  # /dev/xvdb will be used as the cache disk after gateway activation
```

**Step 2: Activate the gateway via CLI or console**

```bash
# Retrieve activation key from the gateway VM's local HTTP endpoint
# The gateway VM must have internet access or VPC endpoint access to storage.amazonaws.com
ACTIVATION_KEY=$(curl "http://<gateway-ip>/?activationRegion=us-east-1&gatewayType=FILE_S3")

# Activate the gateway
aws storagegateway activate-gateway \
  --activation-key "$ACTIVATION_KEY" \
  --gateway-name "prod-s3-file-gateway" \
  --gateway-timezone "GMT-5:00" \
  --gateway-region us-east-1 \
  --gateway-type FILE_S3    # FILE_S3, FILE_FSX_SMB, STORED, CACHED, or VTL
```

**Step 3: Add local disks as cache and upload buffer**

```bash
# List local disks available on the gateway
aws storagegateway list-local-disks \
  --gateway-arn arn:aws:storagegateway:us-east-1:123456789012:gateway/sgw-12A3456B

# Response includes DiskId for each local disk:
# "DiskId": "dev/xvdb", "DiskSizeInBytes": 1073741824000, "DiskStatus": "present"

# Add disk as cache (S3 File Gateway and Cached Volumes)
aws storagegateway add-cache \
  --gateway-arn arn:aws:storagegateway:us-east-1:123456789012:gateway/sgw-12A3456B \
  --disk-ids "dev/xvdb"

# Add disk as upload buffer (Volume Gateway)
aws storagegateway add-upload-buffer \
  --gateway-arn arn:aws:storagegateway:us-east-1:123456789012:gateway/sgw-12A3456B \
  --disk-ids "dev/xvdb"
```

**Console path for activation:** Storage Gateway > Get started > Select gateway type > Select host platform > Configure network and activate > Add local disks.

### S3 File Gateway — NFS File Share Creation

```bash
# Create an NFS file share backed by an S3 bucket
aws storagegateway create-nfs-file-share \
  --client-token "unique-token-$(date +%s)" \
  --gateway-arn arn:aws:storagegateway:us-east-1:123456789012:gateway/sgw-12A3456B \
  --role arn:aws:iam::123456789012:role/StorageGatewayS3Role \
  --location-arn arn:aws:s3:::my-company-archive \  # S3 bucket ARN
  --default-storage-class S3_INTELLIGENT_TIERING \  # S3_STANDARD, S3_IA, S3_INTELLIGENT_TIERING
  --object-acl bucket-owner-full-control \
  --client-list "10.0.0.0/16" \                     # IP range allowed to mount
  --squash RootSquash \                             # RootSquash, NoSquash, AllSquash
  --nfs-file-share-defaults '{
    "FileMode": "0666",
    "DirectoryMode": "0777",
    "GroupId": 65534,
    "OwnerId": 65534
  }'

# Retrieve the NFS mount point after share creation
aws storagegateway describe-nfs-file-shares \
  --file-share-arn-list arn:aws:storagegateway:us-east-1:123456789012:share/share-12A3456B \
  --query 'NFSFileShareInfoList[0].FileShareARN'

# Mount the share on an on-premises Linux server
sudo mount -t nfs \
  -o nolock,hard,intr \
  <gateway-ip>:/my-company-archive \
  /mnt/archive
```

**To create an SMB file share** instead of NFS, use `create-smb-file-share` with `--authentication ActiveDirectory` and specify the AD domain settings configured on the gateway.

**Console path:** Storage Gateway > File shares > Create file share > NFS or SMB > Select gateway and S3 bucket > Configure access settings > Create.

### Volume Gateway — iSCSI Target Connection

```bash
# Create a stored volume (primary data on-premises)
aws storagegateway create-stored-iscsi-volume \
  --gateway-arn arn:aws:storagegateway:us-east-1:123456789012:gateway/sgw-12A3456B \
  --disk-id "dev/xvdc" \               # Local disk that will hold primary data
  --snapshot-id "" \                   # Empty string = new volume; or specify snapshot ID to restore
  --preserve-existing-data false \
  --target-name "iscsi-vol-01" \
  --network-interface-id "10.0.1.50"   # IP of gateway NIC for iSCSI traffic

# Create a cached volume (primary data in S3, local cache only)
aws storagegateway create-cached-iscsi-volume \
  --gateway-arn arn:aws:storagegateway:us-east-1:123456789012:gateway/sgw-12A3456B \
  --volume-size-in-bytes 107374182400 \  # 100 GiB
  --target-name "cached-vol-01" \
  --network-interface-id "10.0.1.50" \
  --client-token "unique-token-$(date +%s)"

# Connect from a Windows Server iSCSI initiator (PowerShell)
# First, discover targets on the gateway
iscsicli QAddTargetPortal 10.0.1.50
iscsicli ListTargets
# Then connect to the target IQN returned
iscsicli QLoginTarget iqn.1997-05.com.amazon:iscsi-vol-01

# Connect from Linux using open-iscsi
sudo iscsiadm --mode discovery --type sendtargets --portal 10.0.1.50:3260
sudo iscsiadm --mode node \
  --targetname "iqn.1997-05.com.amazon:iscsi-vol-01" \
  --portal 10.0.1.50:3260 \
  --login
# The volume now appears as /dev/sdb — format and mount as normal block device
sudo mkfs.ext4 /dev/sdb
sudo mount /dev/sdb /mnt/iscsi-volume
```

**Console path for Volume Gateway:** Storage Gateway > Volumes > Create volume > Select Stored or Cached > Specify disk/size and target name > Connect iSCSI initiator on server.

### Tape Gateway — Virtual Tape Configuration

```bash
# Create virtual tapes in the active tape library (stored in S3)
aws storagegateway create-tapes \
  --gateway-arn arn:aws:storagegateway:us-east-1:123456789012:gateway/sgw-12A3456B \
  --tape-size-in-bytes 107374182400 \    # 100 GiB per tape
  --client-token "tape-batch-$(date +%s)" \
  --num-tapes-to-create 5 \              # Create 5 tapes at once
  --tape-barcode-prefix "ARCHON" \       # Barcode prefix for tape identification
  --pool-id "pool-12A3456B"              # Storage pool — S3 or Glacier pool

# List active tapes
aws storagegateway list-tapes \
  --gateway-arn arn:aws:storagegateway:us-east-1:123456789012:gateway/sgw-12A3456B \
  --query 'TapeInfos[?TapeStatus==`AVAILABLE`].[TapeARN,TapeBarcode,TapeSizeInBytes]'

# Retrieve an archived tape from Glacier (required before a restore job)
aws storagegateway retrieve-tape-archive \
  --tape-arn arn:aws:storagegateway:us-east-1:123456789012:tape/ARCHON000001 \
  --gateway-arn arn:aws:storagegateway:us-east-1:123456789012:gateway/sgw-12A3456B
# Retrieval takes minutes to hours depending on Glacier tier
```

**Console path:** Storage Gateway > Tape library > Create virtual tape > Select gateway, tape size, barcode prefix, number of tapes, storage pool (S3 for active, Glacier for long-term archive).

### Comparison Table

| Gateway Type | Protocol | Primary Storage Location | Cache Location | Primary Use Case | Connectivity Dependency |
|---|---|---|---|---|---|
| S3 File Gateway | NFS, SMB | S3 (objects) | Local gateway disk | File share extension, data tiering to S3, dual on-prem + cloud access | Writes buffered locally; WAN needed for cold reads |
| Volume Gateway — Stored | iSCSI | Local disk (on-premises) | N/A — local IS primary | Block storage with async S3 DR backup; on-prem is authoritative | WAN outage: on-premises continues normally |
| Volume Gateway — Cached | iSCSI | S3 (EBS snapshots) | Local gateway disk | Expand on-prem block capacity using S3; local cache for hot blocks | WAN outage: reads of uncached blocks fail |
| Tape Gateway | VTL (SCSI/iSCSI) | S3 (active), Glacier (archived) | Local gateway disk | Replace physical tape library; keep existing backup software | WAN needed for tape writes to complete |

## How to Decide

| Scenario | Choose |
|---|---|
| On-premises NFS/SMB file shares, want data in S3 for cloud access | S3 File Gateway |
| Hybrid — on-prem application writes files, cloud application reads same data via S3 API | S3 File Gateway |
| iSCSI block storage, primary data must stay on-premises, AWS for DR/backup only | Volume Gateway — Stored Volumes |
| Need to expand on-prem block storage capacity cheaply, tolerate WAN dependency | Volume Gateway — Cached Volumes |
| Existing backup software (Veeam, NetBackup, Commvault), replace physical tape | Tape Gateway |
| Long-term compliance tape retention, want Glacier cost without courier logistics | Tape Gateway |
| No on-premises requirement, fully cloud-native new workload | Skip Storage Gateway — use native S3, EFS, or EBS directly |

**Key diagnostic question for Volume Gateway:** "Where does the authoritative copy of the data live?" If the answer must be on-premises (for performance, compliance, or connectivity resilience), choose Stored Volumes. If the answer is AWS (for capacity and cost), choose Cached Volumes.

## How This Connects

- **S3 integration is the backbone of all three gateway types:** S3 File Gateway stores objects in S3, Volume Gateway stores EBS snapshots in S3, and Tape Gateway stores virtual tapes in S3 (active) and Glacier (archived). Understanding S3 durability (11 nines) is why Storage Gateway can credibly replace on-premises storage infrastructure — the durability of the backing store is enterprise-grade.
- **AWS Direct Connect improves but does not require Storage Gateway:** Storage Gateway works over the public internet with TLS encryption for all data in transit. However, for production workloads with large data volumes, Direct Connect provides consistent bandwidth and lower latency than a shared internet connection, reducing the WAN bottleneck that limits gateway write throughput.
- **EBS snapshots bridge Volume Gateway to EC2:** Volume Gateway Stored and Cached volumes both produce EBS snapshots as their output in AWS. This means the DR story for Volume Gateway is: restore snapshot to EBS volume, attach to EC2 instance, application runs in cloud. This requires that the EC2 environment is pre-configured or can be bootstrapped quickly — the snapshot alone does not run a workload.
- **Storage Gateway is a migration enabler, not a permanent architecture:** For many organizations, Storage Gateway is the first step in a cloud migration. Files tiered to S3 via S3 File Gateway can later be accessed directly from cloud-native applications without the gateway. Volumes backed up to EBS snapshots can be restored to EC2 permanently. Tape Gateway can eventually be replaced by cloud-native backup solutions. The gateway is a bridge that does not require you to cross all at once.
- **IAM roles control S3 and Glacier access for all gateway types:** The gateway appliance assumes an IAM role to write to S3, create EBS snapshots, and archive to Glacier. This role must grant the specific permissions for each action (`s3:PutObject`, `s3:GetObject`, `ec2:CreateSnapshot`, `glacier:UploadArchive`). Misconfigured IAM is the most common operational issue when first deploying Storage Gateway in an environment with restrictive SCPs.

## Exam Traps

**Trap 1: Confusing Stored Volumes and Cached Volumes — specifically which end holds primary data.** Stored Volumes = primary data is on-premises local disk, AWS holds incremental snapshots. Cached Volumes = primary data is in S3, local disk is a read cache. If the exam says "the company needs primary data to remain on-premises due to latency requirements," that is Stored Volumes. If it says "the company wants to expand storage capacity in AWS while keeping hot data accessible locally," that is Cached Volumes. Getting this backwards is a one-choice error that fails the entire architecture question.

**Trap 2: Assuming S3 File Gateway provides two-way synchronization between on-premises and S3.** S3 File Gateway writes are always on-premises → S3. If a cloud application modifies an S3 object directly (bypassing the gateway), the gateway's local cache will not automatically invalidate. For files modified by cloud applications to appear on the NFS/SMB share, you must invoke a cache refresh on the gateway. This is not a real-time sync — it is a one-primary write path with eventual consistency for cloud-side writes.

**Trap 3: Believing Tape Gateway requires migrating away from existing backup software.** The entire value proposition of Tape Gateway is zero change to backup software. Veeam, NetBackup, Commvault — they all see a VTL interface they already know. The exam may try to suggest that adopting a cloud-native backup solution is always preferable. For organizations with complex, customized backup configurations, Tape Gateway is the lower-risk migration path. Cloud-native backup solutions are not always "better" when the transition cost is high.

**Trap 4: Treating the local gateway appliance as disposable.** If the gateway VM fails, clients lose access to cached or locally stored data until the gateway is restored or replaced. S3 File Gateway can be recovered by deploying a new VM and activating it with the same S3 bucket — but the local cache is lost and cold reads will hit S3 until the cache repopulates. Volume Gateway Stored mode is more resilient because primary data is on the local disk, not the VM — but a corrupted gateway VM still requires recovery. Plan for gateway HA: in critical environments, deploy two gateways and use load balancing or DNS failover.

**Trap 5: Assuming Storage Gateway is only for on-premises deployments.** Storage Gateway can run as an EC2 instance in a VPC, acting as a gateway for other EC2 instances or for inter-region data movement. This is less common but appears in scenarios involving VPC-to-VPC storage integration or region-to-region data tiering. The exam may describe a scenario where Storage Gateway runs in the cloud rather than in a data center.

## Summary

- AWS Storage Gateway is a hybrid storage service that translates on-premises storage protocols (NFS, SMB, iSCSI, VTL) into AWS-native storage — it allows existing applications, servers, and backup software to use AWS storage without any code changes or application rewrites.
- S3 File Gateway stores files as S3 objects with a local cache for hot data — the same data is accessible via NFS/SMB on-premises and via native S3 API from the cloud, making it the correct choice for hybrid file sharing and on-premises-to-cloud data tiering.
- Volume Gateway Stored Volumes keeps primary data on-premises with async EBS snapshot backup to AWS — on-premises is always authoritative, AWS is the disaster recovery target, and the workload is unaffected by a WAN outage.
- Volume Gateway Cached Volumes stores primary data in S3 with a local cache for frequently accessed blocks — AWS is authoritative, on-premises cache provides performance for hot data, but WAN dependency means a connectivity outage degrades read performance for cold blocks.
- Tape Gateway presents a virtual tape library interface to existing backup software, storing virtual tapes in S3 (active) and automatically archiving ejected tapes to S3 Glacier — zero change to backup software, zero physical media, and on-demand Glacier retrieval instead of physical courier logistics.
- Storage Gateway is most valuable as a migration bridge rather than a permanent architecture: it allows incremental cloud adoption while existing on-premises systems continue to operate, with each gateway type providing a path to progressively move workloads to fully cloud-native storage.

## Examples

A regional insurance company has file servers used by branch offices that store policy documents on NFS shares. Their IT team wants to reduce on-premises storage costs without rewriting any applications or retraining staff. They deploy S3 File Gateway on a VMware VM in their data center, pointing it at an S3 bucket with Intelligent-Tiering storage class. Branch offices mount the NFS share at `/mnt/policies` as before — the mount command does not change, the share path does not change, and no client software is updated. Storage Gateway caches recently accessed policy documents locally and writes all new uploads to S3 transparently. The cloud team gains a new capability: they can query policy documents directly from S3 using Amazon Athena and run analytics jobs against the entire document corpus without copying data. The gateway's IAM role has `s3:PutObject` and `s3:GetObject` on the bucket. One year after deployment, 80% of storage has migrated to S3, and the team is evaluating whether to retire the on-premises NAS entirely and have cloud applications write directly to S3.

A manufacturing company's factory floor runs legacy SCADA equipment that writes critical sensor logs and process data to a local iSCSI SAN every second. They cannot introduce WAN latency into the write path — the SCADA software has millisecond write timeout requirements. They need durable off-site backup for disaster recovery. They deploy Volume Gateway in Stored Volumes mode: the SCADA server's iSCSI connection goes to the gateway's local disk, which provides sub-millisecond block I/O. The gateway asynchronously uploads incremental EBS snapshots to S3 every hour. If the on-premises SAN fails, the DR team restores the latest snapshot to an EBS volume attached to an EC2 instance and continues data analysis in the cloud within the RPO of the last successful snapshot. Critically, a WAN outage or AWS service interruption does not affect the factory floor at all — the SCADA system writes to local disk and the snapshot upload simply queues until connectivity resumes.

A hospital system runs Veeam Backup & Replication on-premises and currently ships physical LTO-8 tapes off-site monthly for a 7-year regulatory retention requirement. Physical tape handling involves a courier contract, a climate-controlled off-site vault, a tape inventory tracking system, and a 24–48 hour retrieval SLA when a restore is needed. They deploy Tape Gateway, which presents a virtual tape library to Veeam using the same VTL interface Veeam has always used. The Veeam administrator configures the VTL device (gateway IP, port 3260, discovers iSCSI targets) and immediately sees the virtual tape drive and tape slots in the Veeam device inventory. Backup jobs run on the same schedules as before — no policy changes, no script changes, no retraining. Virtual tapes written during backup jobs land in S3. After Veeam ejects a tape to the archive slot, Storage Gateway automatically moves it to S3 Glacier Deep Archive at roughly $0.00099/GB-month. A restore request that previously required a 48-hour courier pickup now completes in Glacier retrieval time (hours for standard, minutes for expedited). The compliance team retains 7-year regulatory coverage at a fraction of the physical tape logistics cost.

## Think About It

1. S3 File Gateway caches frequently accessed data locally but stores all data durably in S3. What happens to end users if the on-premises gateway appliance fails completely — and how does your answer change depending on whether users primarily read existing files versus create new ones that have not yet been uploaded to S3?
2. Volume Gateway offers Stored mode (primary data on-premises, backup to AWS) and Cached mode (primary data in S3, cache on-premises). What does choosing Cached mode reveal about your organization's tolerance for WAN dependency — and what specific failure scenario would cause the most damage to a workload running in Cached mode?
3. Tape Gateway lets companies keep existing backup software unchanged while moving virtual tapes to S3 and Glacier. Is this always the right long-term strategy, or are there scenarios where the familiarity of the existing workflow obscures a better architectural path — such as cloud-native backup with AWS Backup or application-level backup to S3? What factors would cause you to recommend migration away from Tape Gateway to a fully cloud-native backup approach?
4. All Storage Gateway modes involve a local cache or local primary data. Why is the local component architecturally important rather than just a performance optimization — what failure modes does local storage protect against, and what failure modes does it introduce?
5. A company is deciding between deploying S3 File Gateway and simply migrating their application to write directly to the S3 API. What technical, organizational, or contractual factors would lead you to recommend the gateway approach over native S3 API access — and at what point would you advise them to retire the gateway and go API-native?

## Quick Check

**Q1.** An on-premises backup application uses iSCSI to write to a local SAN every minute. The company needs primary data to remain on-premises for performance reasons, but they want asynchronous disaster recovery backups in AWS so they can restore to EC2 if the on-premises SAN fails. Which Storage Gateway mode fits this requirement?

- A) S3 File Gateway
- B) Tape Gateway
- C) Volume Gateway — Stored Volumes
- D) Volume Gateway — Cached Volumes

**Answer: C** — Stored Volumes keeps primary data on the gateway's local disk (on-premises) and asynchronously uploads EBS snapshots to S3, making AWS the durable backup target. A WAN outage does not interrupt on-premises writes. Cached Volumes would be wrong here because primary data would be in S3, introducing WAN dependency into every block write.

**Q2.** A company wants to replace physical tape backups with cloud storage while keeping their existing Veeam Backup & Replication software and all backup policies, schedules, and restore workflows completely unchanged. Which Storage Gateway mode should they use?

- A) S3 File Gateway with SMB share
- B) Tape Gateway with virtual tape library
- C) Volume Gateway — Cached Volumes
- D) FSx File Gateway

**Answer: B** — Tape Gateway presents a virtual tape library (VTL) interface compatible with Veeam and other enterprise backup software. The backup software requires zero configuration changes — it sees the same VTL device interface it used with physical tape hardware. Virtual tapes are stored in S3 and archived to Glacier when ejected.

**Q3.** Which Storage Gateway type is best suited for an on-premises Linux application that writes files via NFS, where those files must also be directly accessible as S3 objects from cloud-based data processing applications without any synchronization or copy step?

- A) Volume Gateway — Cached Volumes with NFS mount
- B) Tape Gateway with S3 backend
- C) S3 File Gateway with NFS file share
- D) Volume Gateway — Stored Volumes

**Answer: C** — S3 File Gateway presents an NFS interface on-premises and stores each file as an S3 object with the file path as the object key. The same data is simultaneously accessible via the NFS share locally and via the native S3 API from cloud applications, with no synchronization step required because S3 is the primary store.

## What's Next

Next up: the Module 10 Canvas Lab — mounting and connecting EFS across instances, and comparing storage service characteristics in a hands-on environment.
