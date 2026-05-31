---
title: "S3 Replication: CRR and SRR"
type: content
estimated_minutes: 8
cert_tags: ["SAA-C03", "SAP-C02"]
---

# S3 Replication: CRR and SRR

## Overview

S3 Replication automatically copies objects from a source bucket to one or more destination buckets. Cross-Region Replication (CRR) targets buckets in different AWS regions; Same-Region Replication (SRR) targets buckets in the same region. Both require versioning enabled on source and destination.

## Cross-Region Replication (CRR)

CRR replicates objects to a bucket in a different region, typically for disaster recovery, compliance with data residency laws, or latency reduction for geographically distributed users. Each replicated object inherits its storage class unless you configure a different destination class. Replication is asynchronous — there is a slight delay, typically seconds to minutes.

## Same-Region Replication (SRR)

SRR replicates within the same region — useful for log aggregation (copying logs from multiple source buckets into one), test-to-prod data sync, or maintaining a separate copy for analytics workloads. SRR doesn't help with regional DR but does provide an independent copy within the region.

## Replication Rules and Filters

Replication rules can apply to all objects or be filtered by prefix or tag. You can set the destination storage class independently of the source, add object ownership override (useful for cross-account), and configure replication time control (RTC) which provides an SLA for 99.99% of objects replicated within 15 minutes with metrics visibility.

## What Replication Does Not Copy

Existing objects before replication is enabled are not replicated automatically (use S3 Batch Operations for that). Objects already replicated from another rule are not re-replicated (no chaining by default). Delete markers are replicated optionally — you must explicitly enable delete marker replication. Lifecycle actions are not replicated.

## Summary

CRR enables geographic redundancy and regional DR. SRR enables log aggregation and data segregation. Versioning is required on both ends. Existing objects need Batch Operations to backfill. Understand what replication does and does not copy — these edge cases appear on the SAA-C03 exam regularly.

## Examples

A US-based insurance company must store policyholder data in the United States but regulators also require a geographically separate disaster recovery copy. They configure Cross-Region Replication from their primary bucket in `us-east-1` to a backup bucket in `us-west-2`. Both buckets remain in the US, satisfying data residency requirements. If `us-east-1` suffers a total regional outage — an extremely rare event — they can fail over to `us-west-2` with data that replicates continuously rather than through nightly batch backups.

A multi-team engineering organization has five development teams each writing application logs to their own source S3 buckets in `us-east-1`. A central platform team needs all logs in one place for unified analysis. They configure Same-Region Replication from each team's bucket into a single aggregation bucket, also in `us-east-1`. No custom pipeline code, no Lambda glue — just five SRR rules. The platform team's Athena queries hit one bucket; the dev teams never change how their apps write logs.

A global streaming platform replicates its content metadata catalog from a source bucket in `eu-west-1` to destination buckets in `ap-southeast-1` and `us-west-2` using CRR with Replication Time Control. The SLA guarantee that 99.99% of objects replicate within 15 minutes matters because their CDN origin logic checks S3 for updated metadata — a staleness window larger than 15 minutes would cause users in Asia to see outdated content listings after a release. They knowingly pay for RTC's metering visibility to hold the infrastructure accountable to a business SLA.

## Think About It

1. S3 Replication does not replicate objects that existed before the replication rule was enabled. Why do you think AWS made this design choice, and what would you use to backfill existing objects into the destination bucket?
2. Delete markers are not replicated by default — you must opt in. Why might you want delete marker replication in some architectures but explicitly not want it in others? Describe a scenario for each choice.
3. If you configure CRR from Bucket A to Bucket B, and separately configure CRR from Bucket B to Bucket C, will objects written to Bucket A eventually appear in Bucket C? Why or why not, and how would you achieve three-way replication if needed?
4. Replication is asynchronous with typical delays of seconds to minutes. What application design assumptions break down if your code writes to the source bucket and immediately reads from the destination bucket? How would you architect around this?
5. What trade-offs would you weigh when deciding between using CRR for DR versus using S3 Object Lock with a separate backup strategy? Consider cost, recovery time objective, and operational complexity.

## Quick Check

**Q1.** What prerequisite must be configured on both source and destination buckets before S3 Replication can be enabled?
- A) Cross-account IAM permissions
- B) Versioning must be enabled
- C) Both buckets must be in the same AWS account
- D) Server-side encryption must use the same KMS key

**Answer: B** — S3 Replication requires versioning to be enabled on both the source and destination buckets; without versioning, replication cannot be configured.

**Q2.** A company enables CRR on their S3 bucket today. Which objects will be replicated to the destination?
- A) All objects currently in the bucket and all future objects
- B) Only objects created after the replication rule was enabled
- C) Only objects tagged with a replication tag
- D) All objects, but existing objects require manual re-upload to trigger replication

**Answer: B** — CRR (and SRR) only replicates objects created after the replication rule is enabled; existing objects must be copied using S3 Batch Operations to backfill the destination.

**Q3.** What does S3 Replication Time Control (RTC) provide that standard replication does not?
- A) Synchronous replication with zero data loss
- B) An SLA guaranteeing 99.99% of objects replicate within 15 minutes, with replication metrics
- C) Automatic failover of application traffic to the destination region
- D) Replication of lifecycle policy actions to the destination bucket

**Answer: B** — RTC provides a replication SLA (99.99% of objects within 15 minutes) and publishes CloudWatch metrics for replication lag, giving you visibility and an accountable performance target.

## What's Next

Next up: S3 Performance — multipart upload, Transfer Acceleration, and prefix-based request scaling.