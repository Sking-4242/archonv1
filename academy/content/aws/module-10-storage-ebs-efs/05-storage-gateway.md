---
title: "AWS Storage Gateway: Hybrid Cloud Storage"
type: content
estimated_minutes: 8
cert_tags: ["SAA-C03", "SAP-C02"]
---

# AWS Storage Gateway: Hybrid Cloud Storage

## Overview

AWS Storage Gateway is a hybrid cloud storage service that gives on-premises applications seamless access to AWS storage. It runs as a virtual appliance (or hardware appliance) in your data center and presents standard storage interfaces (NFS, SMB, iSCSI) while caching data locally and storing durably in AWS.

## S3 File Gateway

Presents an NFS or SMB share to on-premises clients. Files written to the share are stored as objects in S3. Frequently accessed data is cached locally; cold data is fetched from S3 on demand. Use for file shares, backups, and tiering on-premises data to S3 — particularly when you want to access data via native S3 APIs from the cloud side while presenting an NFS interface locally.

## FSx File Gateway

Similar to S3 File Gateway but backed by FSx for Windows File Server. Provides an SMB interface with local caching and stores data in FSx. Ideal for Windows workloads with AD integration, DFS, and VSS that need a locally cached copy for low-latency access but durable storage in AWS.

## Volume Gateway

Presents iSCSI block storage to on-premises servers. Two modes: Stored Volumes (primary data is on-premises, asynchronous backup snapshots to S3 — minimal disruption if AWS is unreachable) and Cached Volumes (primary data in S3, frequently accessed data cached on-premises — greater storage capacity on-premises with S3 as the authoritative store). Snapshots are EBS snapshots, allowing volume restore to EC2.

## Tape Gateway

Presents a virtual tape library (VTL) interface compatible with existing backup software (Veeam, NetBackup, etc.). Virtual tapes are stored in S3 and archived to S3 Glacier. Use to replace physical tape libraries — same backup software, same workflow, but tapes go to the cloud instead of a physical tape silo.

## Summary

Storage Gateway bridges on-premises storage with AWS. S3 File Gateway for NFS/SMB → S3 file tiering; Volume Gateway for iSCSI block backup; Tape Gateway for virtual tape library replacement. It's the primary answer when an exam question involves on-premises to AWS storage integration or hybrid backup architectures.

## Examples

A regional insurance company has a file server used by branch offices that stores policy documents as NFS shares. Their IT team wants to reduce on-premises storage costs without rewriting any applications or retraining staff. They deploy S3 File Gateway on a VM in their data center, pointing it at an S3 bucket. Branch offices mount the NFS share as before; Storage Gateway caches frequently accessed files locally and transparently writes new files to S3. The cloud team can now query policy documents directly from S3 using native APIs, while on-premises users never know anything changed. This is the beginner S3 File Gateway pattern: transparently extend on-premises storage to S3.

A manufacturing company's factory floor runs legacy SCADA equipment that writes critical sensor logs to a local iSCSI SAN every minute. They cannot move this equipment to the cloud, but they need durable off-site backup. They deploy Volume Gateway in Stored Volumes mode: primary data stays on the local SAN, and asynchronous EBS snapshots back up to AWS every hour. If the on-premises SAN fails, they restore the latest snapshot to an EBS volume on EC2 and keep the factory's data analysis running in the cloud. The key architectural insight is "Stored" — AWS is the backup, not the primary; the factory can survive an AWS connectivity outage because data is local first.

A hospital system runs Veeam Backup on-premises and currently ships physical LTO tapes off-site monthly for regulatory retention. Physical tape handling is slow, error-prone, and requires a courier contract. They deploy Tape Gateway, which presents a virtual tape library to Veeam using the same VTL interface Veeam already knows. Backup jobs run identically; virtual tapes land in S3 and are automatically archived to S3 Glacier after ejection. The compliance team gets the same long-term retention they need, with no tape handling and instant retrieval instead of a 24-hour courier wait. This shows Tape Gateway's core value: zero change to backup software, zero physical media.

## Think About It

1. S3 File Gateway caches frequently accessed data locally but stores all data durably in S3. What happens to end users if the on-premises gateway appliance fails completely — and how does your answer change depending on whether users primarily read existing files versus create new ones?
2. Volume Gateway offers Stored mode (primary data on-premises, backup to AWS) and Cached mode (primary data in S3, cache on-premises). What does choosing Cached mode say about your trust in your WAN link — and what is the consequence if that link goes down during a write-heavy workload?
3. Tape Gateway lets companies keep existing backup software unchanged while moving tapes to the cloud. Is this always the right long-term strategy, or are there scenarios where the familiarity of the existing workflow obscures a better architectural path? What would trigger you to reconsider?
4. All Storage Gateway modes involve a local cache or local primary data. Why is the local component architecturally important rather than just a performance optimization — what failure modes does it protect against?
5. A company is deciding between deploying S3 File Gateway and simply migrating their application to write directly to the S3 API. What factors — technical, organizational, or contractual — would lead you to recommend the Gateway approach over the native S3 API approach?

## Quick Check

**Q1.** An on-premises backup application uses iSCSI to write to a local SAN. The company wants to keep primary data on-premises but asynchronously back up to AWS for disaster recovery. Which Storage Gateway mode fits this requirement?
- A) S3 File Gateway
- B) Tape Gateway
- C) Volume Gateway — Stored Volumes
- D) Volume Gateway — Cached Volumes

**Answer: C** — Stored Volumes keeps primary data on-premises and asynchronously backs up EBS snapshots to AWS, making AWS the durable backup target while on-premises remains authoritative.

**Q2.** A company wants to replace physical tape backups with cloud storage while keeping their existing Veeam backup software and workflows completely unchanged. Which Storage Gateway mode should they use?
- A) S3 File Gateway
- B) Tape Gateway
- C) FSx File Gateway
- D) Volume Gateway — Cached Volumes

**Answer: B** — Tape Gateway presents a virtual tape library (VTL) interface compatible with existing backup software like Veeam, allowing zero changes to backup workflows while storing virtual tapes in S3 and Glacier.

**Q3.** Which Storage Gateway type is best suited for an on-premises application that writes files via NFS, where those files should also be accessible as S3 objects from cloud-based applications?
- A) Volume Gateway — Cached Volumes
- B) Tape Gateway
- C) FSx File Gateway
- D) S3 File Gateway

**Answer: D** — S3 File Gateway presents an NFS (or SMB) interface on-premises and stores each file as an S3 object, making the same data accessible via both the NFS share locally and the S3 API from the cloud.

## What's Next

Next up: the Module 10 Canvas Lab — mounting and connecting EFS across instances.