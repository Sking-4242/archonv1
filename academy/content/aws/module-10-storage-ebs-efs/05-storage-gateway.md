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

## What's Next

Next up: the Module 10 Canvas Lab — mounting and connecting EFS across instances.