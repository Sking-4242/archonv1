---
title: "Amazon EFS: Elastic File System"
type: content
estimated_minutes: 10
cert_tags: ["SAA-C03", "CLF-C02"]
---

# Amazon EFS: Elastic File System

## Overview

Amazon Elastic File System (EFS) provides managed NFS (Network File System) storage that multiple EC2 instances and containers can mount simultaneously across multiple AZs. Unlike EBS (one volume, one AZ), EFS scales automatically and is accessible from any AZ in its region.

## EFS vs. EBS

EBS is block storage attached to one instance in one AZ. EFS is file storage (NFS v4) mountable from thousands of clients across multiple AZs simultaneously. EFS costs more per GB (~$0.30/GB/month for Standard vs. ~$0.08 for gp3 EBS) but eliminates the need to manage capacity — it grows and shrinks automatically. Use EFS for shared filesystems; use EBS for single-instance databases and boot volumes.

## EFS Performance Modes

Bursting Throughput: throughput scales with filesystem size, bursting to high rates for short periods. Provisioned Throughput: set a fixed throughput regardless of storage size (useful when throughput demand exceeds what storage size gives you). Elastic Throughput (recommended): automatically scales throughput up and down to meet workload needs, paying only for what you use. Performance mode: General Purpose (default, low latency) vs. Max I/O (higher aggregate throughput, higher latency — for massively parallel workloads).

## EFS Storage Classes

EFS Standard stores data redundantly across 3+ AZs in the region. EFS Standard-IA and One Zone-IA are cheaper classes for infrequently accessed files. EFS Intelligent Tiering automatically moves files between Standard and IA based on access patterns (after 30 days of no access by default). Use lifecycle management rules to configure this.

## Mounting EFS

Mount EFS using the AWS EFS mount helper (amazon-efs-utils) which wraps the Linux NFS client and handles TLS encryption in transit. Mount targets must exist in each AZ where clients will connect. Each mount target gets a DNS name; use the filesystem DNS name which resolves to the correct AZ mount target based on the client's AZ. Security groups on the mount target must allow NFS traffic (port 2049) from client security groups.

## EFS Access Points

EFS Access Points are application-specific entry points that enforce a specific POSIX user identity and a root directory path. This lets multiple applications share one EFS filesystem with isolated directory trees and separate permission models. Combined with IAM authorization (require IAM identity for EFS mounts), Access Points provide strong multi-tenant isolation.

## Summary

EFS is managed NFS — scalable shared file storage mountable from thousands of clients across AZs. Choose Elastic Throughput for most workloads. Enable Intelligent Tiering to automatically move cold files to IA. Use Access Points for multi-application shared filesystems. EFS is the answer whenever EC2 or container workloads need shared persistent file storage.

## What's Next

Next up: FSx — purpose-built managed file systems for Windows, Lustre, NetApp, and OpenZFS.