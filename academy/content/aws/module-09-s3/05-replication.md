---
title: "S3 Replication: CRR and SRR"
type: content
estimated_minutes: 12
cert_tags: ["SAA-C03", "SAP-C02"]
---

# S3 Replication: CRR and SRR

## Overview

S3 Replication automatically copies objects from a source bucket to one or more destination buckets in an asynchronous, continuous stream. There are two flavors: Cross-Region Replication (CRR), which targets a bucket in a different AWS region, and Same-Region Replication (SRR), which targets a bucket in the same region. Both flavors are rule-based — you define what gets replicated (all objects, a prefix filter, a tag filter, or a combination), where it goes, and what storage class it lands in. Both flavors require versioning to be enabled on source and destination before a replication rule can even be saved.

The motivation behind each flavor is different, and getting that distinction right matters on exams and in real architecture. CRR is primarily about geography: moving data to another region for disaster recovery, reducing read latency for a geographically distributed user base, or satisfying data-residency regulations that require a geographically separate secondary copy. SRR is about logical separation within a region: copying logs from multiple buckets into a single aggregation bucket, maintaining an independent copy for a security audit team, or synchronizing a production bucket to a test environment so integration tests run against real data shapes without touching production.

Replication is asynchronous, which means the destination bucket is eventually consistent with the source. Under normal conditions, replication completes in seconds to a few minutes. If you need a stronger guarantee — both an SLA and CloudWatch metrics proving you hit it — S3 Replication Time Control (RTC) provides a 99.99% SLA that objects replicate within 15 minutes, at additional per-GB cost. Understanding when to pay for RTC versus accepting best-effort timing is a design decision that shows up on both the SAA-C03 and SAP-C02 exams.

## Core Concepts

### Versioning Is Mandatory

Versioning must be enabled on both the source bucket and every destination bucket before you can create a replication rule. This is not optional or configurable — it is a hard prerequisite enforced by the S3 API. The reason is architectural: replication is built on version IDs. When S3 replicates an object, it preserves the source version ID in the destination. If versioning were disabled, there would be no version ID to track, and the replication metadata chain would be broken. You cannot replicate to an unversioned bucket even if you try.

### What Gets Replicated

Once a replication rule is active, all new objects that match the rule's filter are replicated — including their metadata, ACLs (optionally), tags, and object lock settings. You can override the destination storage class per rule, so you can write Standard objects to the source but replicate them to Standard-IA or Glacier Instant Retrieval in the destination to reduce cost. Cross-account replication is supported: you specify the destination bucket ARN and grant the replication IAM role permission to write to the foreign account's bucket.

### What Does Not Get Replicated

This is where exam questions live. Four things are commonly misunderstood:

- **Existing objects**: Objects that existed in the bucket before the replication rule was enabled are not replicated. The rule only catches new writes going forward. To backfill existing objects into a destination bucket, you must use S3 Batch Operations with a "Replicate" job type.
- **Delete markers**: When you delete a versioned object, S3 creates a delete marker. By default, delete markers are not replicated. You must explicitly enable delete marker replication in the rule configuration. This is intentional — in many DR scenarios, you do not want an accidental delete in the source to propagate instantly to your backup.
- **Replicated objects**: If Bucket A replicates to Bucket B, and Bucket B has its own rule replicating to Bucket C, objects written to Bucket A will not automatically appear in Bucket C. Replication does not chain by default. To achieve three-way replication, you need explicit rules from A→C as well.
- **Lifecycle actions**: Lifecycle transitions and expirations are not replicated. Each bucket manages its own lifecycle independently.

### Replication Time Control (RTC)

Standard replication provides a best-effort timing with no SLA. Replication Time Control (RTC) adds two things: a contractual SLA that 99.99% of objects replicate within 15 minutes, and replication metrics published to CloudWatch (pending bytes, pending operations, replication latency). RTC costs more per GB replicated. The decision to enable RTC is a business question, not just a technical one — it is worth paying for when your downstream systems depend on the destination bucket's currency and a 15-minute staleness window is the outer acceptable bound.

### IAM Role for Replication

S3 replication does not run under your user credentials. It requires a dedicated IAM role that S3 assumes on your behalf to read objects from the source and write them to the destination. The role needs `s3:GetReplicationConfiguration` and `s3:ListBucket` on the source, and `s3:ReplicateObject`, `s3:ReplicateDelete`, and `s3:ReplicateTags` on the destination. For cross-account replication, the destination bucket policy must also grant the replication role permission to write to it.

### Encrypted Object Replication

Objects encrypted with SSE-S3 replicate transparently. Objects encrypted with SSE-KMS require explicit configuration: you must specify which KMS key to use for encrypting replicated objects at the destination, and the replication IAM role must have `kms:Decrypt` on the source key and `kms:Encrypt` on the destination key. Without this, replication of SSE-KMS objects will fail silently (the object is skipped). This is a common operational gap.

## Configuration Reference

### IAM Role for Replication

```json
// replication-role-trust-policy.json
// This trust policy allows the S3 service to assume this role
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": { "Service": "s3.amazonaws.com" },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

```json
// replication-role-permissions-policy.json
// Minimum permissions: read from source, write to destination
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetReplicationConfiguration",
        "s3:ListBucket"
      ],
      "Resource": "arn:aws:s3:::my-source-bucket"
      // Only the source bucket ARN — no trailing /*
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObjectVersionForReplication",
        "s3:GetObjectVersionAcl",
        "s3:GetObjectVersionTagging"
      ],
      "Resource": "arn:aws:s3:::my-source-bucket/*"
      // Objects in the source bucket
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:ReplicateObject",
        "s3:ReplicateDelete",
        "s3:ReplicateTags"
      ],
      "Resource": "arn:aws:s3:::my-destination-bucket/*"
      // Objects in the destination bucket
    }
  ]
}
```

```bash
# Create the IAM role
aws iam create-role \
  --role-name S3ReplicationRole \
  --assume-role-policy-document file://replication-role-trust-policy.json

# Attach the permissions policy
aws iam put-role-policy \
  --role-name S3ReplicationRole \
  --policy-name S3ReplicationPolicy \
  --policy-document file://replication-role-permissions-policy.json
```

### Replication Configuration JSON

```json
// replication-config.json
{
  "Role": "arn:aws:iam::123456789012:role/S3ReplicationRole",
  // The IAM role S3 will assume to perform replication

  "Rules": [
    {
      "ID": "replicate-images-to-dr-region",
      // Human-readable rule name — helpful when you have multiple rules

      "Status": "Enabled",
      // Must be Enabled or Disabled — not just present

      "Filter": {
        "Prefix": "images/"
        // Only replicate objects under the images/ prefix
        // Omit Filter entirely (or use empty Prefix "") to replicate all objects
      },

      "Destination": {
        "Bucket": "arn:aws:s3:::my-destination-bucket",
        // Full ARN required — bucket name alone is not accepted

        "StorageClass": "STANDARD_IA",
        // Override destination storage class — saves cost on DR copies
        // If omitted, objects land in the same class as the source

        "ReplicationTime": {
          "Status": "Enabled",
          // Enable Replication Time Control (RTC) for 15-minute SLA
          "Time": { "Minutes": 15 }
        },
        "Metrics": {
          "Status": "Enabled",
          // Publish replication lag metrics to CloudWatch
          "EventThreshold": { "Minutes": 15 }
        }
      },

      "DeleteMarkerReplication": {
        "Status": "Enabled"
        // Opt in to replicate delete markers
        // Set to Disabled if you want source deletes NOT to affect destination
      }
    }
  ]
}
```

```bash
# Enable versioning on source bucket (required before replication)
aws s3api put-bucket-versioning \
  --bucket my-source-bucket \
  --versioning-configuration Status=Enabled

# Enable versioning on destination bucket
aws s3api put-bucket-versioning \
  --bucket my-destination-bucket \
  --versioning-configuration Status=Enabled

# Apply the replication configuration
aws s3api put-bucket-replication \
  --bucket my-source-bucket \
  --replication-configuration file://replication-config.json

# Verify the configuration was applied
aws s3api get-bucket-replication \
  --bucket my-source-bucket
```

### Backfilling Existing Objects with S3 Batch Operations

```bash
# Create a Batch Operations job to replicate existing objects
# First, generate a manifest (list of objects to process)
aws s3control create-job \
  --account-id 123456789012 \
  --operation '{"S3ReplicateObject":{}}' \
  --manifest '{
    "Spec": {"Format": "S3BatchOperations_CSV_20180820", "Fields": ["Bucket","Key"]},
    "Location": {
      "ObjectArn": "arn:aws:s3:::my-manifest-bucket/manifest.csv",
      "ETag": "abc123"
    }
  }' \
  --report '{"Bucket":"arn:aws:s3:::my-report-bucket","Format":"Report_CSV_20180820","Enabled":true,"Prefix":"batch-replication-report","ReportScope":"AllTasks"}' \
  --priority 10 \
  --role-arn arn:aws:iam::123456789012:role/BatchOperationsRole \
  --region us-east-1
# This job reads the manifest and calls ReplicateObject on each listed key
# Progress and failures are written to the report bucket
```

### Console Path

S3 → select source bucket → Management tab → Replication rules → Create replication rule → choose scope (all objects or prefix/tag filter) → choose destination bucket → choose or create IAM role → optionally enable RTC and delete marker replication → Save.

## How to Decide

| Scenario | Use CRR | Use SRR | Enable RTC | Notes |
|---|---|---|---|---|
| DR copy in separate AWS region | Yes | No | Optional | RTC if RPO < 15 min matters contractually |
| Compliance: data must exist in two geographies | Yes | No | No | Asynchronous is usually fine for compliance archiving |
| Latency reduction for global read traffic | Yes | No | No | Pair with MRAP for routing |
| Log aggregation from multiple buckets (same region) | No | Yes | No | Classic SRR pattern |
| Dev/test environment seeded from production | No | Yes | No | Keep dev isolated; control delete marker replication |
| Existing objects must also appear in destination | Either | Either | N/A | Use S3 Batch Operations regardless of CRR/SRR |
| Delete in source must NOT propagate to destination | Either | Either | N/A | Leave delete marker replication Disabled |
| SSE-KMS encrypted objects | Either | Either | N/A | Requires additional KMS key grants in IAM role |

## How This Connects

- **Versioning (Lesson 03)**: Replication requires versioning on both buckets — you cannot enable replication without it. Version IDs are preserved across replication so the destination is a true mirror at the version level.
- **S3 Batch Operations**: The mechanism for backfilling existing objects that predate the replication rule. Understanding that replication is forward-only — and that Batch Operations fills the gap — is a common exam scenario.
- **S3 Access Points and Multi-Region Access Points (Lesson 08)**: MRAP pairs naturally with CRR. You replicate buckets to multiple regions with CRR, then expose them through a single MRAP endpoint that routes reads to the lowest-latency region.
- **KMS (Module 12)**: Encrypting replicated objects at the destination with a different KMS key than the source is a real operational pattern — for example, when replicating cross-account where the source KMS key is not shared with the destination account.
- **IAM (Module 06)**: The replication IAM role is a service-linked delegation pattern. The trust policy grants S3 the ability to assume the role; the permission policy scopes what S3 can do. Getting this role wrong is the most common reason replication silently fails.

## Exam Traps

1. **"Enable replication and all existing objects will copy."** False. Replication is forward-only. Objects that existed before the rule was created are not copied. You need S3 Batch Operations for backfill. This is one of the most frequently tested misconceptions on SAA-C03.

2. **"Delete markers are automatically replicated."** False by default. Delete marker replication must be explicitly enabled in the rule configuration. Many candidates assume it's included, but AWS made it opt-in precisely because propagating deletes to a DR bucket is often the wrong behavior.

3. **"CRR chains automatically — A replicates to B, B replicates to C, so A→C works."** False. Replication does not chain. An object replicated from A to B is not considered a "new write" in B and will not trigger B's rule to C. If you need A→C, create an explicit rule for it.

4. **"RTC means objects replicate synchronously with zero lag."** False. RTC is an SLA (99.99% within 15 minutes), not synchronous replication. There is still replication lag — it's just bounded and measurable. If you need true zero-lag consistency, S3 replication is not the right tool.

5. **"Versioning just needs to be enabled on the source."** False. Both source and destination must have versioning enabled. Enabling it only on the source will cause the `put-bucket-replication` API call to fail with a validation error.

## Summary

- CRR copies objects to a bucket in a different AWS region; SRR copies within the same region. Both require versioning on source and destination.
- Replication is forward-only: objects created before the rule was enabled are not copied. Use S3 Batch Operations to backfill.
- Delete markers are not replicated by default — explicit opt-in required. Replication does not chain across multi-hop rules.
- Replication Time Control (RTC) adds a 15-minute SLA with CloudWatch metrics at additional cost — use it when you have a contractual or business-critical RPO.
- The replication IAM role must have specific permissions on both source and destination. For SSE-KMS objects, the role also needs KMS Decrypt/Encrypt grants.
- Cross-account replication is supported; the destination bucket policy must grant the replication role write access from the source account.

## Examples

A US-based insurance company must store policyholder data in the United States but regulators also require a geographically separate disaster recovery copy. They configure Cross-Region Replication from their primary bucket in `us-east-1` to a backup bucket in `us-west-2`. Both buckets remain within the United States, satisfying data-residency requirements. Because the compliance team was nervous about the existing objects in the source bucket — files loaded before CRR was enabled — they ran an S3 Batch Operations replication job to backfill the destination. Going forward, all new objects replicate automatically. If `us-east-1` suffers a total regional outage, they can fail over to `us-west-2` with confidence that both historical and recent data are present.

A multi-team engineering organization has five development teams each writing application logs to their own S3 buckets in `us-east-1`. A central platform team needs all logs in a single bucket for unified Athena analysis. They configure Same-Region Replication from each team's bucket to a central aggregation bucket, also in `us-east-1`. Each SRR rule filters on no prefix (all objects), uses the same storage class as the source, and explicitly disables delete marker replication — so if a developer accidentally deletes a log file in their team's bucket, the central copy is unaffected. No pipeline code, no Lambda glue, no schedulers — just five SRR rules maintained in infrastructure-as-code.

A global streaming platform replicates its content metadata catalog from `eu-west-1` to `ap-southeast-1` and `us-west-2` using CRR with Replication Time Control enabled on both destination rules. The 15-minute SLA matters because their CDN origin logic reads metadata from S3; a staleness window larger than 15 minutes would cause users in Asia or the Americas to see outdated content listings after a new title release. The platform pays for RTC's per-GB premium and monitors the `ReplicationLatency` CloudWatch metric in their on-call runbook. When the metric spikes above 10 minutes, an alert fires before the SLA is breached. They knowingly traded cost for an accountable, monitorable replication guarantee.

## Think About It

1. S3 Replication does not replicate objects that existed before the rule was enabled. Why do you think AWS made this design choice, and what would you use to backfill existing objects? What considerations would affect the Batch Operations job design for a bucket with hundreds of millions of objects?

2. Delete markers are not replicated by default — you must opt in. Why might you want delete marker replication in a DR scenario? Why might you explicitly not want it? Describe a real architecture where each choice is the correct one.

3. If you configure CRR from Bucket A to Bucket B, and separately configure CRR from Bucket B to Bucket C, will objects written to Bucket A eventually appear in Bucket C? Why or why not? How would you architect three-way replication correctly?

4. Replication is asynchronous. What application design assumptions break if your code writes to the source and immediately reads from the destination? How would you test for this race condition, and how would you architect around it?

5. Your team wants to replicate SSE-KMS encrypted objects cross-account. Walk through every IAM and KMS permission that must be configured, and explain what symptom you would see if any single permission is missing.

## Quick Check

**Q1.** What prerequisite must be configured on both source and destination buckets before S3 Replication can be enabled?
- A) Cross-account IAM permissions
- B) Versioning must be enabled on both buckets
- C) Both buckets must be in the same AWS account
- D) Server-side encryption must use the same KMS key

**Answer: B** — S3 Replication requires versioning on both source and destination. Without it, the `put-bucket-replication` API call returns a validation error. This is a hard requirement, not a recommendation.

**Q2.** A company enables CRR on their S3 bucket today. Which objects will be replicated to the destination?
- A) All objects currently in the bucket and all future objects
- B) Only objects created after the replication rule was enabled
- C) Only objects tagged with a replication tag
- D) All objects, but existing objects require a manual re-upload to trigger replication

**Answer: B** — CRR only replicates objects created after the rule is enabled. Existing objects must be backfilled using S3 Batch Operations with a Replicate operation. Re-uploading is not a scalable or correct approach for large buckets.

**Q3.** What does S3 Replication Time Control (RTC) provide that standard replication does not?
- A) Synchronous replication with zero data loss guarantee
- B) An SLA that 99.99% of objects replicate within 15 minutes, plus CloudWatch replication metrics
- C) Automatic application traffic failover to the destination region
- D) Replication of lifecycle policy transitions to the destination bucket

**Answer: B** — RTC adds two things standard replication lacks: a contractual 15-minute SLA and CloudWatch metrics for pending bytes, pending operations, and replication latency. It does not make replication synchronous.

## What's Next

Next up: S3 Performance — prefix-based throughput scaling, multipart upload, Transfer Acceleration, and S3 Select.
