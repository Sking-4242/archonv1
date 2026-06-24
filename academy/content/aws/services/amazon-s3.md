---
title: "Amazon S3"
type: content
estimated_minutes: 24
cert_tags: ["CLF-C02", "AIF-C01", "SAA-C03", "SOA-C03", "SCS-C03"]
---

# Amazon S3

## Overview

Amazon Simple Storage Service (S3) is AWS's object storage service — durable, virtually unlimited storage for files (objects) organized into containers called buckets. It is one of the most widely used AWS services and appears in nearly every architecture: as a data lake, a backup and archive target, static website hosting, a software-distribution origin, a logging destination, and the storage layer for analytics and machine learning. This *service reference* lesson covers the S3 data model, durability and storage classes, consistency, the full access-control model, encryption, data protection, and what each certification expects.

S3 matters because it solves storage at internet scale without capacity planning: you put objects in and AWS handles durability, availability, and scaling transparently. Objects are stored redundantly across a minimum of three Availability Zones within a Region, giving S3 its famous **eleven nines (99.999999999%) of durability**. The key conceptual point is that S3 is *object* storage — you work with whole objects via an HTTP API (PUT/GET/DELETE), each identified by a key within a bucket — not a POSIX file system with directories or a block device you mount. That model is what lets it scale essentially without limit and integrate with everything.

---

## How It Works

The S3 model has a few core pieces:

- **Bucket** — a container with a name that must be **globally unique**, created in a specific Region. Data never leaves that Region unless you replicate it. Buckets have policies, encryption defaults, versioning, and public-access settings.
- **Object** — the stored item: the data (up to 5 TB; uploads above 5 GB use **multipart upload**), plus system and user **metadata**, identified by a **key** (the full name, e.g. `reports/2026/q1.csv`). The "folders" in the console are a UI convenience over a flat keyspace; the `/` is just part of the key.
- **Storage classes** — tiers trading retrieval speed, minimum duration, and availability against cost: **S3 Standard** (frequent access, default), **Standard-Infrequent Access (IA)** and **One Zone-IA** (lower storage cost, retrieval fee, One Zone sacrificing multi-AZ durability), the **Glacier** family — **Instant Retrieval** (archive with millisecond access), **Flexible Retrieval** (minutes-to-hours), and **Deep Archive** (cheapest, hours) — and **Intelligent-Tiering**, which monitors access and moves objects between tiers automatically with no retrieval fees (ideal when access patterns are unknown).
- **Consistency** — S3 provides **strong read-after-write consistency** for all PUT, GET, and LIST operations, so a freshly written or overwritten object is immediately readable.

Requests are authorized by combining identity policies, bucket policy, S3 Block Public Access, ACLs (legacy), and Object Ownership settings, all evaluated together.

---

## Key Features

- **Lifecycle policies** automatically **transition** objects to cheaper classes and **expire** them (and old versions and incomplete multipart uploads) after set times — the primary storage-cost lever.
- **Versioning** keeps every version of an object so you can recover from overwrites and deletes (a delete adds a *delete marker* rather than destroying data) — foundational for ransomware resilience and accidental-deletion recovery.
- **Replication** copies objects to another bucket: **Cross-Region (CRR)** for DR/locality/latency, **Same-Region (SRR)** for log aggregation/compliance, with optional Replication Time Control for an SLA.
- **Encryption.** Server-side encryption is **always on**; options are **SSE-S3** (AWS-managed keys, default), **SSE-KMS** (KMS keys, with auditability and access control — `aws:kms` or the higher-scale S3 Bucket Keys to cut KMS cost), **DSSE-KMS** (dual-layer), and **SSE-C** or client-side encryption for customer-held keys.
- **Object Lock** provides WORM (write-once-read-many) retention in governance or compliance mode — ransomware-resistant, immutable backups.
- **Event notifications** to Lambda, SQS, SNS, or EventBridge trigger processing on object changes.
- **Presigned URLs** grant time-limited access to a specific object without making it public; **Access Points** and **Multi-Region Access Points** simplify access for shared and global datasets.

---

## Configuration Reference

- **S3 Block Public Access** is enabled by default at account and bucket level and should stay on unless a bucket is intentionally public; it overrides any policy/ACL that would otherwise grant public access and is the master safety switch.
- **Bucket policy** (resource-based) is the primary tool for cross-account access and broad rules; combine with IAM identity policies. **Object Ownership / "bucket owner enforced"** disables ACLs so access is policy-only (the recommended modern default).
- **Encryption default** can be set to SSE-KMS with a chosen key and Bucket Keys enabled to reduce per-object KMS calls.
- **Optional features**: static website hosting, Transfer Acceleration (CloudFront-edge-accelerated long-distance uploads), Requester Pays, and access logging / S3 server access logs or CloudTrail data events.

---

## Operations and Troubleshooting

- **Access Denied.** Evaluate the whole picture: Block Public Access, bucket policy, IAM policy, ACLs/Object Ownership, VPC endpoint policy (if accessed privately), and — for SSE-KMS objects — the **KMS key policy** granting the caller `kms:Decrypt`. A very common cause is correct S3 permissions but a KMS key the principal cannot use.
- **Performance.** S3 scales to thousands of requests per second per prefix automatically; spreading keys across prefixes avoids hotspots, multipart upload parallelizes large transfers, and Transfer Acceleration helps long-distance uploads.
- **Cost surprises.** Examine storage-class distribution, accumulated noncurrent versions (old versions still cost money), incomplete multipart uploads, request and retrieval charges (IA/Glacier retrieval and per-request fees), and data-transfer-out/cross-Region replication. Lifecycle rules, Intelligent-Tiering, and an "abort incomplete multipart upload" rule address most of these.
- **Discovering exposure and sensitive data.** Use **Amazon Macie** to find public/unencrypted buckets and locate sensitive data, **IAM Access Analyzer** to detect buckets shared externally, and **S3 Storage Lens** for organization-wide usage and cost analytics.

---

## Integrations

S3 is the connective storage tissue of AWS. **KMS** encrypts objects; **CloudFront** serves them at the edge (with Origin Access Control keeping the bucket private); **Athena**, **Redshift Spectrum**, **EMR**, **Glue**, and **SageMaker** analyze and train on them; **Lambda** processes them via event notifications; **CloudTrail/Config/VPC Flow Logs** use S3 as their canonical log destination; **Macie** discovers sensitive data; and **DataSync**/**Storage Gateway** move data in. For AI/ML workloads, S3 is the standard data lake and model-artifact store. Gateway VPC endpoints provide free, private access from a VPC.

---

## Pricing and Cost Considerations

S3 charges for storage (per GB-month, varying sharply by class), requests (PUT/GET/LIST), data retrieval (for IA and Glacier classes, plus per-GB retrieval fees and minimum storage durations), and data transfer out to the internet or across Regions. The dominant levers are choosing the right storage class per access pattern and using lifecycle policies and Intelligent-Tiering to move cold data down automatically. Hidden costs include retained noncurrent versions, incomplete multipart uploads, IA/Glacier early-deletion and retrieval fees, and per-object KMS calls (mitigated by S3 Bucket Keys). Storage within a Region is cheap; egress and archive retrieval are where surprises occur. Exact prices vary by Region, class, and over time.

---

## Exam Relevance

**CLF-C02:** Know S3 as durable (eleven nines), scalable object storage; the major storage classes and lifecycle transitions for cost; and that it is object (not block/file) storage. Foundational.

**AIF-C01:** Know S3 as the data lake and storage layer for training data and model artifacts feeding services like SageMaker and Bedrock. Conceptual depth.

**SAA-C03:** Know storage-class selection (including Intelligent-Tiering for unknown patterns and One Zone-IA trade-offs), lifecycle and replication (CRR/SRR), encryption options, strong consistency, event-driven processing, and presigned URLs. Design depth — heavily tested.

**SOA-C03:** Operate buckets — lifecycle, replication, versioning, Storage Lens, monitoring, and cost optimization. Operations depth.

**SCS-C03:** Secure data — Block Public Access, bucket policies vs. IAM and the KMS-decrypt requirement, SSE-KMS/Bucket Keys, Object Ownership (disable ACLs), Object Lock for WORM/ransomware resilience, access logging, Macie, and Access Analyzer. Security depth.

---

## Summary

Amazon S3 is durable (eleven nines, ≥3 AZs), virtually unlimited object storage organized as objects (key + data + metadata) in globally named, Region-scoped buckets, with strong read-after-write consistency. Storage classes and lifecycle policies match cost to access patterns (Intelligent-Tiering for unknown patterns; Glacier for archive); versioning and Object Lock provide recovery and immutable WORM protection; replication supports DR and compliance. Access is controlled by Block Public Access, bucket and IAM policies, Object Ownership, and KMS for encryption, with Macie and Access Analyzer detecting exposure. The frequent exam traps are the KMS-decrypt requirement behind "Access Denied," storage-class/lifecycle cost decisions, and Block Public Access as the master safety switch. S3 integrates with virtually every analytics, ML, content-delivery, and logging service, making it the default storage layer of AWS.

---

## Quick Check

1. What makes S3 "object" storage, and how does that differ from EBS block storage?
2. Which storage class suits unknown/changing access patterns with no retrieval fees, and how do Glacier tiers differ from it?
3. Name the controls that together prevent accidental public exposure, and which one is the master override.
4. Why might a GET on an encrypted object fail even when the IAM policy allows s3:GetObject?
5. How do versioning and Object Lock each contribute to ransomware-resistant backups?

---

## What's Next

Pair this with **AWS KMS** (object encryption), **Amazon CloudFront** (edge delivery with OAC), **Amazon Macie** (sensitive-data discovery), and the cert lessons on data protection and logging that use S3 as their storage layer.
