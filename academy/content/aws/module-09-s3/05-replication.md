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

## What's Next

Next up: S3 Performance — multipart upload, Transfer Acceleration, and prefix-based request scaling.