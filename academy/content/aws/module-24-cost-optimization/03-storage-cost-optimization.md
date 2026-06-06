---
title: "Storage Cost Optimization"
type: content
estimated_minutes: 12
cert_tags: ["SAA-C03", "SAP-C02"]
---

# Storage Cost Optimization

## Overview

Storage is typically the second-largest AWS cost category after compute — and the most structurally wasteful. Unlike compute (which you notice because it's slow when under-provisioned), storage waste is invisible: data sits in expensive storage classes long past its useful access life, EBS volumes persist after their EC2 instances are terminated, snapshots accumulate for years, and NAT Gateway charges quietly inflate the networking bill every time a private-subnet EC2 instance talks to S3. Storage cost optimization is largely lifecycle discipline — building the policies and configurations that automatically move, transition, and delete data as it ages.

The problem is that AWS storage defaults are expensive. S3 Standard is priced for frequent access. gp2 EBS volumes bundle IOPS with storage in a way that forces over-provisioning. Data transferred through NAT Gateways to S3 pays both NAT Gateway processing fees and data transfer fees unnecessarily. None of these costs have automatic cost-saving behavior — they require explicit configuration to optimize.

For the SAA exam, understand S3 storage classes and lifecycle transitions, S3 Intelligent-Tiering, EBS gp3 migration, eliminating S3 NAT Gateway charges with VPC endpoints, and database cost optimization patterns. SAP adds S3 Object Lock for compliance storage cost, cross-region replication cost implications, and RDS storage auto-scaling. After this lesson, you will be able to identify and fix the most common storage cost inefficiencies in an AWS architecture.

---

## Core Concepts

### S3 Storage Classes and Lifecycle Policies

S3 has eight storage classes with different cost and retrieval characteristics:

| Storage class | Use case | Cost (relative) | Retrieval |
|---|---|---|---|
| Standard | Frequently accessed | $$$$ | Immediate |
| Intelligent-Tiering | Unknown or changing access | $$$ + monitoring fee | Immediate |
| Standard-IA | Infrequent access, rapid retrieval | $$ | Immediate |
| One Zone-IA | Infrequent access, non-critical | $ | Immediate |
| Glacier Instant Retrieval | Archives, millisecond retrieval | $ | Milliseconds |
| Glacier Flexible Retrieval | Archives, 1-12 hour retrieval | $ | Minutes-hours |
| Glacier Deep Archive | Long-term archives | ¢ | 12–48 hours |
| Express One Zone | Ultra-high performance | $$$$$ | Single-digit milliseconds |

**Lifecycle policies** automatically transition objects between storage classes or delete them based on age. Define rules at the bucket or prefix level:

```
After 30 days → Standard-IA (objects rarely accessed after 30 days)
After 90 days → Glacier Instant Retrieval (archival access pattern)
After 365 days → Glacier Deep Archive (regulatory retention)
After 2555 days → Delete (7-year retention complete)
```

**Minimum storage duration charges**: Standard-IA and Glacier classes have minimum storage durations (30 days for Standard-IA, 90 days for Glacier Flexible Retrieval). Storing a 1-day object in Glacier Flexible Retrieval is billed as 90 days. Apply lifecycle transitions only to objects that will stay long enough to benefit.

**Incomplete multipart upload cleanup**: objects uploaded using the multipart upload API that are never completed remain as invisible "orphaned parts" in S3 — billed at Standard pricing indefinitely. Add a lifecycle rule to abort incomplete multipart uploads after 7 days.

---

### S3 Intelligent-Tiering

S3 Intelligent-Tiering automatically moves objects between access tiers based on observed access patterns — no lifecycle rules required, no access pattern knowledge needed.

**Tiers within Intelligent-Tiering**:
- **Frequent Access**: objects accessed in the last 30 days
- **Infrequent Access**: objects not accessed for 30 consecutive days (40% cheaper than Standard)
- **Archive Instant Access**: objects not accessed for 90 days (68% cheaper than Standard)
- **Archive Access** (opt-in): objects not accessed for 90+ days (95% cheaper than Standard, minutes retrieval)
- **Deep Archive Access** (opt-in): objects not accessed for 180+ days (~96% cheaper than Standard, hours retrieval)

**Cost**: a small per-object monitoring fee ($0.0025 per 1,000 objects/month). For small objects (< 128 KB), the monitoring fee can exceed the storage savings — Intelligent-Tiering is cost-effective for objects ≥ 128 KB.

**When to use Intelligent-Tiering**: when access patterns are unpredictable or unknown, when you want automatic optimization without writing lifecycle rules, or when a single bucket holds objects with widely varying access frequencies.

---

### EBS Cost Optimization

EBS costs include: per-GB storage, provisioned IOPS (for io1/io2 volumes), and snapshots.

**gp3 vs. gp2**: `gp3` is the replacement for `gp2` at approximately 20% lower cost per GB. gp3 decouples storage size from IOPS and throughput — you set IOPS (3,000 baseline, up to 16,000) and throughput (125 MB/s baseline, up to 1,000 MB/s) independently of volume size. With gp2, the only way to get more IOPS was to increase volume size (3 IOPS per GB). Teams that sized gp2 volumes larger than needed just to get more IOPS should migrate to gp3 and right-size.

**Migrating gp2 to gp3**: modify the volume type in the console or CLI — no downtime, no data migration, no detach required. The volume stays attached and serving I/O during the type change.

**Unattached volumes**: EBS volumes created from EC2 instances continue to exist and incur charges after the instance is terminated (unless `DeleteOnTermination` was set to true). Identify unattached volumes with Trusted Advisor or a Config rule, confirm they are no longer needed, and delete them.

**Snapshot lifecycle**: snapshots are incremental (each snapshot stores only changed blocks since the previous), but a long chain of snapshots on a frequently-modified database can accumulate significant storage. Use AWS Data Lifecycle Manager (DLM) to automate snapshot creation and deletion — retain the last 7 daily snapshots, the last 4 weekly, and the last 12 monthly.

---

### Data Transfer and NAT Gateway Cost Optimization

AWS charges for data leaving the AWS network (egress to the internet), data crossing regions, and — importantly — data crossing AZs within a region. NAT Gateway adds processing fees on top of data transfer fees.

**S3 Gateway Endpoint**: a free VPC resource that routes traffic from private-subnet EC2 instances directly to S3 over the AWS private network. Without it, S3 traffic from EC2 in private subnets exits through the NAT Gateway, incurring NAT Gateway data processing fees ($0.045/GB in us-east-1). An S3 Gateway Endpoint eliminates NAT Gateway charges for all S3 traffic from the VPC — the most common high-ROI networking cost fix.

**CloudFront for egress reduction**: CloudFront's data transfer rates are lower than direct EC2/ALB egress at scale. If your application serves significant amounts of content to internet users, replacing direct EC2/ALB egress with CloudFront reduces per-GB egress cost and improves latency.

**Cross-AZ data transfer optimization**: AWS charges $0.01/GB for traffic crossing AZ boundaries within a region. High-traffic applications that make many cross-AZ calls (e.g., an application in AZ-a calling a database in AZ-b on every request) can accumulate significant cross-AZ charges. Mitigation: use AZ-aware routing (route traffic to the nearest AZ's resources), enable ElastiCache cluster mode with nodes in each AZ, and use RDS reader endpoints with read-routing that prefers same-AZ replicas.

---

## Configuration Reference

### Example: S3 Lifecycle Policy for Data Lake Raw Zone

```bash
aws s3api put-bucket-lifecycle-configuration \
  --bucket company-data-lake \
  --lifecycle-configuration '{
    "Rules": [
      {
        "ID": "raw-zone-tiering",
      