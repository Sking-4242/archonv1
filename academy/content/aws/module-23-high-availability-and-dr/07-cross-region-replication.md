---
title: "Cross-Region Replication on AWS"
type: content
estimated_minutes: 45
cert_tags: ["SAA-C03", "SAP-C02"]
---

## Overview

Cross-region replication is the practice of automatically copying data from resources in one AWS region to resources in one or more other regions, providing geographic redundancy, improved read performance for distributed applications, and the foundation for disaster recovery architectures. When a primary region experiences a catastrophic failure — whether a natural disaster, large-scale infrastructure failure, or prolonged outage — workloads with cross-region replication can recover by promoting replicas in a secondary region, minimizing data loss and downtime.

Each major AWS data service implements cross-region replication differently, with different consistency models, RPO (Recovery Point Objective) characteristics, and operational trade-offs. S3 Cross-Region Replication (CRR) copies objects asynchronously between buckets. DynamoDB Global Tables uses multi-master replication, allowing writes in any region. RDS cross-region read replicas provide async replication that can be manually promoted. Aurora Global Database uses a dedicated replication layer for sub-second replication across up to five regions. Understanding which service fits which DR scenario is the primary exam skill this lesson builds.

For the SAA-C03 and SAP-C02 exams, cross-region replication questions typically present a business requirement — RTO, RPO, active-active vs. active-passive, relational vs. non-relational, read-heavy vs. write-heavy — and ask which service or combination achieves it. The wrong answers frequently confuse multi-AZ (same-region high availability) with cross-region (geographic DR), or conflate active-active and active-passive capabilities across services.

---

## Core Concepts

### S3 Cross-Region Replication (CRR)

S3 CRR automatically replicates objects written to a source bucket in one region to a destination bucket in a different region. The destination can be in a different AWS account, making it useful for cross-account backup and compliance scenarios. CRR is configured through a replication rule on the source bucket and requires **versioning enabled on both source and destination buckets** — this is the most commonly tested prerequisite.

CRR only replicates **new objects** written after replication is enabled; objects that existed before the rule was created are not retroactively replicated. To replicate existing objects, you use S3 Batch Operations with the `S3PutObjectCopy` operation, explicitly listing all objects from inventory. This distinction is critical and appears frequently on exams. CRR does not replicate delete markers by default (configurable via `DeleteMarkerReplication`), does not replicate objects encrypted with SSE-C (customer-provided keys), and does not replicate objects in Glacier or Deep Archive storage classes. Objects that are transitioned to Glacier by a lifecycle rule after the replication rule is applied are also not replicated — lifecycle actions are applied locally, not propagated cross-region.

**Replication Time Control (RTC)** is an add-on feature that provides a 99.99% SLA that replicated objects will arrive in the destination bucket within 15 minutes. Without RTC, replication is best-effort with no latency guarantee. RTC also provides replication metrics via CloudWatch and S3 replication time monitoring, making it appropriate for compliance-driven scenarios that require a bounded RPO.

### DynamoDB Global Tables

DynamoDB Global Tables provides **multi-master, multi-region replication** — every replica in every region accepts both reads and writes with full read/write capacity. This makes it the only AWS database service natively supporting active-active writes across multiple regions without application-layer routing. Last-writer-wins conflict resolution handles concurrent writes to the same item from different regions: the write with the most recent timestamp wins, and that version propagates to all replicas. Applications that need to reconcile conflicting writes with custom logic must implement that logic themselves, as Global Tables does not support custom conflict resolution.

Global Tables requires **DynamoDB Streams** to be enabled — Streams capture a time-ordered log of item-level changes that the Global Tables replication mechanism uses to propagate changes across regions. Typical replication lag is sub-second under normal conditions, though this is not contractually guaranteed. Adding a new replica region to an existing Global Table triggers a full table export and import to the new region — this can take significant time for large tables and consumes read capacity during the bootstrap phase.

### RDS Cross-Region Read Replicas

RDS cross-region read replicas extend the familiar RDS read replica feature across regional boundaries. Replication is **asynchronous**, meaning there is always some lag between writes to the primary and their appearance on the replica. The replica is read-only by design. For disaster recovery, the key operation is **promotion**: when the primary region becomes unavailable, you promote the cross-region replica to a standalone primary. Promotion breaks the replication link, makes the replica writable, and the application must be reconfigured (or Route 53 DNS updated) to point to the newly promoted instance.

Cross-region read replicas for encrypted RDS instances require a **KMS key in the destination region** — you cannot share KMS keys across regions. When creating a cross-region replica of an encrypted instance, you must specify a KMS key ARN in the destination region, and that key is used to encrypt the replica's storage. This is a frequently tested detail: forgetting the destination KMS key causes the create-replica operation to fail.

### Aurora Global Database

Aurora Global Database is purpose-built for cross-region deployments requiring very low RPO and RTO. Unlike RDS cross-region replicas (which use the standard binlog replication path), Aurora Global Database uses a **dedicated replication infrastructure** separate from the Aurora storage layer. Aurora storage is already distributed across multiple AZs; Global Database adds a layer on top that ships storage writes to secondary regions. This produces typical replication lag **under 1 second** (sub-second RPO) compared to the potentially higher lag of RDS async replication.

Aurora Global Database supports up to **5 secondary regions**, each running a read-only Aurora cluster. For managed failover (also called detach-and-promote), the RTO is typically under 1 minute — Aurora uses "fast database cloning" techniques to promote the secondary quickly. **Write forwarding** is an optional feature that allows applications connected to a secondary region cluster to send writes, which are transparently forwarded to the primary region and committed there, then replicated back. This simplifies application connection management in active-active-read architectures where you want reads local but writes global.

### ECR Cross-Region Replication

Amazon Elastic Container Registry (ECR) supports replication rules that automatically copy container images to destination registries in other regions (and optionally other accounts) when images are pushed to the source registry. This ensures that container images are pre-staged in all regions where workloads may run, eliminating cross-region image pull latency during deployments and ensuring images are available even if the source region is unavailable. Replication rules are configured at the private registry level (not per-repository) and apply to all repositories or specified repositories using filters. Replication is asynchronous and eventual — there is no SLA on replication latency, but images typically appear in destination regions within minutes.

---

## Configuration Reference

### S3 Cross-Region Replication Configuration

```bash
# Step 1: Enable versioning on source bucket (required prerequisite)
aws s3api put-bucket-versioning \
  --bucket my-source-bucket-us-east-1 \
  --versioning-configuration Status=Enabled

# Step 2: Enable versioning on destination bucket (required prerequisite)
aws s3api put-bucket-versioning \
  --bucket my-destination-bucket-eu-west-1 \
  --versioning-configuration Status=Enabled

# Step 3: Create the IAM role that S3 will assume to replicate objects
# Trust policy: allow S3 service to assume this role
cat > s3-replication-trust.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {"Service": "s3.amazonaws.com"},
    "Action": "sts:AssumeRole"
  }]
}
EOF

aws iam create-role \
  --role-name S3ReplicationRole \
  --assume-role-policy-document file://s3-replication-trust.json

# Step 4: Attach permission policy to the replication role
cat > s3-replication-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetReplicationConfiguration",
        "s3:ListBucket"
      ],
      "Resource": "arn:aws:s3:::my-source-bucket-us-east-1"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObjectVersionForReplication",
        "s3:GetObjectVersionAcl",
        "s3:GetObjectVersionTagging"
      ],
      "Resource": "arn:aws:s3:::my-source-bucket-us-east-1/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:ReplicateObject",
        "s3:ReplicateDelete",
        "s3:ReplicateTags"
      ],
      "Resource": "arn:aws:s3:::my-destination-bucket-eu-west-1/*"
    }
  ]
}
EOF

aws iam put-role-policy \
  --role-name S3ReplicationRole \
  --policy-name S3ReplicationPolicy \
  --policy-document file://s3-replication-policy.json

# Step 5: Put the replication configuration on the source bucket
cat > replication-config.json << 'EOF'
{
  "Role": "arn:aws:iam::123456789012:role/S3ReplicationRole",
  "Rules": [
    {
      "ID": "ReplicateAll",
      "Status": "Enabled",
      "Filter": {
        "Prefix": ""
      },
      "Destination": {
        "Bucket": "arn:aws:s3:::my-destination-bucket-eu-west-1",
        "StorageClass": "STANDARD_IA",
        "ReplicationTime": {
          "Status": "Enabled",
          "Time": {"Minutes": 15}
        },
        "Metrics": {
          "Status": "Enabled",
          "EventThreshold": {"Minutes": 15}
        },
        "EncryptionConfiguration": {
          "ReplicaKmsKeyID": "arn:aws:kms:eu-west-1:123456789012:key/destination-key-id"
        }
      },
      "DeleteMarkerReplication": {
        "Status": "Enabled"
      },
      "SourceSelectionCriteria": {
        "SseKmsEncryptedObjects": {
          "Status": "Enabled"
        }
      }
    }
  ]
}
EOF

aws s3api put-bucket-replication \
  --bucket my-source-bucket-us-east-1 \
  --replication-configuration file://replication-config.json
  # ReplicationTime + Metrics: enables Replication Time Control (RTC)
  #   -- 99.99% of objects replicated within 15 minutes, with SLA
  # DeleteMarkerReplication Enabled: replicate delete markers (off by default)
  # EncryptionConfiguration: KMS key in destination region for encrypted objects
  # SseKmsEncryptedObjects Enabled: replicate SSE-KMS encrypted objects
  #   (SSE-C objects still cannot be replicated -- no cross-region key transport)
  # StorageClass STANDARD_IA: store replicas in cheaper storage class

# Step 6: Replicate existing objects using S3 Batch Operations
# (CRR only replicates NEW objects -- existing objects need Batch Operations)
aws s3control create-job \
  --account-id 123456789012 \
  --operation '{"S3ReplicateObject": {}}' \
  --report '{"Bucket": "arn:aws:s3:::my-batch-reports", "Format": "Report_CSV_20180820", "Enabled": true, "Prefix": "replication-job-reports", "ReportScope": "AllTasks"}' \
  --manifest-generator '{
    "S3JobManifestGenerator": {
      "SourceBucket": "arn:aws:s3:::my-source-bucket-us-east-1",
      "EnableManifestOutput": false,
      "Filter": {"EligibleForReplication": true}
    }
  }' \
  --priority 10 \
  --role-arn arn:aws:iam::123456789012:role/S3BatchOperationsRole \
  --no-confirmation-required
```

### DynamoDB Global Tables Configuration

```bash
# Step 1: Create a DynamoDB table with Streams enabled
# (Global Tables requires DynamoDB Streams with NEW_AND_OLD_IMAGES)
aws dynamodb create-table \
  --table-name UserProfiles \
  --attribute-definitions \
    AttributeName=UserId,AttributeType=S \
  --key-schema \
    AttributeName=UserId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --stream-specification StreamEnabled=true,StreamViewType=NEW_AND_OLD_IMAGES \
  --region us-east-1
  # StreamViewType NEW_AND_OLD_IMAGES: required for Global Tables
  # Both old and new item images are captured in each stream record

# Step 2: Wait for table to become ACTIVE
aws dynamodb wait table-exists --table-name UserProfiles --region us-east-1

# Step 3: Add replica regions to create a Global Table
aws dynamodb create-table-replica \
  --table-name UserProfiles \
  --replication-group '[
    {
      "RegionName": "eu-west-1",
      "KMSMasterKeyId": "arn:aws:kms:eu-west-1:123456789012:key/eu-cmk-id",
      "ProvisionedThroughputOverride": {
        "ReadCapacityUnits": 100
      }
    },
    {
      "RegionName": "ap-southeast-1",
      "KMSMasterKeyId": "arn:aws:kms:ap-southeast-1:123456789012:key/ap-cmk-id"
    }
  ]'
  # Each replica can have its own KMS key -- keys are not shared across regions
  # ProvisionedThroughputOverride: set different RCU for replicas (read-heavy secondary regions)
  # Adding replicas triggers full table bootstrap -- existing data is exported and imported
  # Bootstrap duration depends on table size; can take minutes to hours for large tables

# Verify global table status
aws dynamodb describe-table --table-name UserProfiles --region eu-west-1 \
  --query "Table.Replicas"
  # Returns list of replica regions and their ACTIVE/CREATING/DELETING status
```

### RDS Cross-Region Read Replica Configuration

```bash
# Create a cross-region read replica of an encrypted RDS MySQL instance
# The source instance is in us-east-1; replica goes to eu-central-1

aws rds create-db-instance-read-replica \
  --db-instance-identifier myapp-replica-eu \
  --source-db-instance-identifier arn:aws:rds:us-east-1:123456789012:db:myapp-primary \
  --db-instance-class db.r6g.large \
  --availability-zone eu-central-1a \
  --publicly-accessible false \
  --kms-key-id arn:aws:kms:eu-central-1:123456789012:key/eu-kms-key-id \
  --region eu-central-1
  # source-db-instance-identifier: must be the full ARN for cross-region replicas
  # kms-key-id: REQUIRED for encrypted source instances -- must be in DESTINATION region
  # Forgetting this parameter causes the operation to fail with an encryption error
  # The replica is read-only by default -- promote to standalone to make it writable

# Monitor replication lag on the replica
aws cloudwatch get-metric-statistics \
  --namespace AWS/RDS \
  --metric-name ReplicaLag \
  --dimensions Name=DBInstanceIdentifier,Value=myapp-replica-eu \
  --start-time $(date -u -v-1H +%Y-%m-%dT%H:%M:%SZ) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%SZ) \
  --period 60 \
  --statistics Average \
  --region eu-central-1
  # ReplicaLag: seconds behind the primary -- watch for increasing lag under write load

# Promote the replica to standalone (DR failover procedure)
aws rds promote-read-replica \
  --db-instance-identifier myapp-replica-eu \
  --region eu-central-1
  # This operation:
  #   1. Stops replication from us-east-1 primary (replication link broken permanently)
  #   2. Makes the instance writable
  #   3. Changes instance role to standalone primary
  # After promotion, update Route 53 records or application config to point to new endpoint
  # To re-establish replication after primary region recovers, create a new replica
```

### Aurora Global Database Configuration

```bash
# Step 1: Create the primary Aurora Global cluster
aws rds create-global-cluster \
  --global-cluster-identifier myapp-global \
  --engine aurora-mysql \
  --engine-version 8.0.mysql_aurora.3.04.1 \
  --storage-encrypted true \
  --deletion-protection true

# Step 2: Create the primary regional cluster and attach it to the global cluster
aws rds create-db-cluster \
  --db-cluster-identifier myapp-primary-us-east-1 \
  --engine aurora-mysql \
  --engine-version 8.0.mysql_aurora.3.04.1 \
  --global-cluster-identifier myapp-global \
  --master-username admin \
  --master-user-password "$(aws secretsmanager get-secret-value --secret-id myapp-db-password --query SecretString --output text)" \
  --kms-key-id arn:aws:kms:us-east-1:123456789012:key/primary-kms-key \
  --region us-east-1

# Step 3: Add a writer instance to the primary cluster
aws rds create-db-instance \
  --db-instance-identifier myapp-writer-1 \
  --db-cluster-identifier myapp-primary-us-east-1 \
  --db-instance-class db.r6g.2xlarge \
  --engine aurora-mysql \
  --region us-east-1

# Step 4: Add a secondary region cluster (read-only by default)
aws rds create-db-cluster \
  --db-cluster-identifier myapp-secondary-eu-west-1 \
  --engine aurora-mysql \
  --engine-version 8.0.mysql_aurora.3.04.1 \
  --global-cluster-identifier myapp-global \
  --enable-global-write-forwarding true \
  --kms-key-id arn:aws:kms:eu-west-1:123456789012:key/eu-kms-key \
  --region eu-west-1
  # enable-global-write-forwarding: writes sent to secondary cluster endpoint
  #   are transparently forwarded to the primary region for commit
  #   then replicated back to the secondary -- applications don't need to know
  #   which region is primary to issue writes

# Step 5: Add a reader instance to the secondary cluster
aws rds create-db-instance \
  --db-instance-identifier myapp-reader-eu-1 \
  --db-cluster-identifier myapp-secondary-eu-west-1 \
  --db-instance-class db.r6g.xlarge \
  --engine aurora-mysql \
  --region eu-west-1

# Managed failover (promote secondary to primary) -- for planned or DR failover
aws rds failover-global-cluster \
  --global-cluster-identifier myapp-global \
  --target-db-cluster-arn arn:aws:rds:eu-west-1:123456789012:cluster:myapp-secondary-eu-west-1 \
  --allow-data-loss
  # allow-data-loss: required flag -- acknowledges you accept potential data loss
  #   during an unplanned failover where replication lag may leave some commits unreplicated
  # Managed failover typical RTO: under 1 minute
  # Typical RPO: under 1 second (sub-second replication lag)
```

### ECR Cross-Region Replication Configuration

```bash
# Configure ECR replication rules at the private registry level
# This applies to ALL repositories in the registry (or filtered by prefix)
aws ecr put-replication-configuration \
  --replication-configuration '{
    "rules": [
      {
        "destinations": [
          {
            "region": "eu-west-1",
            "registryId": "123456789012"
          },
          {
            "region": "ap-southeast-1",
            "registryId": "123456789012"
          }
        ],
        "repositoryFilters": [
          {
            "filter": "production/",
            "filterType": "PREFIX_MATCH"
          }
        ]
      }
    ]
  }' \
  --region us-east-1
  # repositoryFilters: only replicate repositories whose names start with "production/"
  # Omitting repositoryFilters replicates ALL repositories in the registry
  # Images pushed to any repo matching the filter in us-east-1 will be
  #   automatically pushed to eu-west-1 and ap-southeast-1 registries
  # Replication is asynchronous -- images typically appear in minutes
  # registryId: typically your 12-digit AWS account ID (for same-account replication)

# Verify replication configuration
aws ecr describe-registry --region us-east-1 \
  --query "replicationConfiguration"
```

---

## How to Decide

| Requirement | Best Service | Key Reason |
|---|---|---|
| Active-active writes from multiple regions (non-relational) | DynamoDB Global Tables | Only multi-master option; any region accepts writes |
| Relational database, sub-second RPO, read-heavy secondary | Aurora Global Database | Dedicated replication infra, <1s typical lag |
| Relational database DR, manual promotion acceptable | RDS Cross-Region Read Replica | Async replication, promote to standalone for DR |
| Object storage geo-replication, compliance RPO bounded | S3 CRR with RTC | 15-minute RTC SLA, cross-account supported |
| Object storage geo-replication, best-effort | S3 CRR without RTC | Lower cost, no SLA on replication latency |
| Container image pre-staging in multiple regions | ECR Replication | Automatic push to destination registries on image push |
| Active-active relational with local reads, global writes | Aurora Global Database + write forwarding | Reads local, writes forwarded to primary |

**Decision framework:**
1. Is the data relational (SQL)? → Aurora Global Database (aggressive RPO/RTO) or RDS cross-region replica (moderate RPO, manual promotion).
2. Is the data non-relational key-value or document? → DynamoDB Global Tables (active-active) or DynamoDB cross-region backup via S3 export (passive).
3. Do you need active-active writes across regions? → DynamoDB Global Tables is the only multi-master option among AWS-managed databases.
4. Do you need sub-second RPO for relational workloads? → Aurora Global Database (not RDS, which is async with potentially higher lag).
5. Is the data objects or files? → S3 CRR, with RTC if bounded RPO is required.
6. Are you deploying containers? → ECR replication for pre-staging images.

---

## How This Connects

- **Route 53 Failover**: Cross-region replication provides the data tier for regional failover; Route 53 provides the DNS-layer traffic rerouting. Promoting an RDS cross-region replica or Aurora secondary is the data plane action; updating Route 53 records (or relying on pre-configured failover routing) is the network plane action. Both must happen for a complete DR failover.
- **AWS Backup**: Complements cross-region replication by providing scheduled, policy-driven backups that are copied cross-region. While replication handles real-time data propagation, AWS Backup cross-region copy provides protection against logical corruption (accidental deletes, ransomware) by retaining point-in-time snapshots that replication would otherwise propagate immediately.
- **AWS KMS**: Cross-region replication of encrypted resources almost always requires KMS configuration in destination regions. S3 CRR with SSE-KMS requires a destination KMS key specified in the replication config. RDS cross-region replicas of encrypted instances require a destination-region KMS key. DynamoDB Global Tables allows per-replica KMS keys. KMS Multi-Region Keys (MRKs) simplify this by allowing the same logical key to be available in multiple regions, reducing key management overhead.
- **Amazon CloudWatch and AWS CloudTrail**: Monitoring replication health requires CloudWatch metrics. S3 CRR exposes replication latency and pending bytes metrics (especially with RTC enabled). RDS exposes `ReplicaLag`. DynamoDB Global Tables exposes `ReplicationLatency` per region pair. CloudTrail logs replication configuration changes, promotion events, and policy modifications for audit and compliance.

---

## Exam Traps

**Trap 1: S3 CRR replicates all existing objects when enabled.**
CRR only replicates objects written after the replication rule is created. Objects that exist in the source bucket at the time the rule is enabled are not automatically replicated. To replicate existing objects, you must use S3 Batch Operations. This is one of the most commonly tested S3 replication facts and is frequently presented as a gotcha in scenarios where a company enables CRR and then discovers old data is missing from the destination bucket.

**Trap 2: DynamoDB Global Tables can be added to any existing DynamoDB table.**
Adding a region to a Global Table triggers a full table data bootstrap into the new region. For tables with hundreds of gigabytes or terabytes of data, this takes significant time and consumes read capacity on the source table during the export phase. Additionally, Global Tables requires DynamoDB Streams to be enabled — if Streams are not enabled on an existing table, they must be enabled before adding replicas. The exam occasionally presents this as a straightforward "just add a region" operation; in reality, it requires planning for the bootstrap period.

**Trap 3: Aurora Global Database and RDS cross-region read replicas have the same RPO characteristics.**
Aurora Global Database uses a dedicated replication layer and typically achieves sub-second replication lag. Standard RDS cross-region read replicas use asynchronous binlog-based replication, which can lag by seconds or more under write-heavy workloads. For scenarios requiring the lowest possible RPO for relational databases, Aurora Global Database is the correct choice. If a scenario specifies "near-zero RPO for a MySQL database," the answer is Aurora Global Database — not an RDS MySQL cross-region replica.

**Trap 4: S3 CRR replicates delete markers by default.**
By default, S3 CRR does NOT replicate delete markers. Delete markers are versioned deletion indicators in S3, and they are excluded from replication unless you explicitly enable `DeleteMarkerReplication` in the replication rule. This default behavior is a security and compliance safeguard — an accidental mass-delete in the source region would not propagate to the destination — but it means the destination may retain objects that appear deleted in the source.

**Trap 5: Promoting an RDS cross-region replica preserves the replication relationship.**
Promoting an RDS read replica to a standalone DB instance permanently breaks the replication relationship. After promotion, the instance is completely independent — it is no longer a replica of anything, and the original primary has no awareness of it. To re-establish cross-region replication after recovering from a DR event (when the original primary region comes back online), you must create a new read replica from scratch. This is a manual process with no automatic replication restoration.

---

## Summary

- S3 Cross-Region Replication (CRR) replicates new objects to a destination bucket in another region; existing objects require S3 Batch Operations, and versioning must be enabled on both source and destination.
- DynamoDB Global Tables provides multi-master replication across regions — any region can accept writes — using last-writer-wins conflict resolution and DynamoDB Streams as the replication mechanism.
- RDS cross-region read replicas use asynchronous replication with manual promotion for DR; encrypted source instances require a KMS key in the destination region for the replica.
- Aurora Global Database achieves sub-second RPO using dedicated replication infrastructure separate from storage, with managed failover RTO typically under one minute and optional write forwarding for near-active-active patterns.
- ECR replication automatically copies container images to destination registries in other regions when images are pushed to the source, pre-staging images for multi-region deployments.
- The critical exam decision: DynamoDB Global Tables for active-active non-relational workloads; Aurora Global Database for relational with aggressive RPO; RDS cross-region replicas for relational DR with manual promotion; S3 CRR for object storage replication.

---

## Examples

**Beginner:** A startup runs a simple web application backed by RDS MySQL in us-east-1. Their business continuity plan requires a recovery point in a second region in case of a regional failure. They create an RDS cross-region read replica in us-west-2. The replica continuously applies binary log events from the primary, typically staying within a few seconds of the primary's data. They document the promotion procedure: if us-east-1 becomes unavailable, a team member runs `aws rds promote-read-replica` in us-west-2 and updates the application's database connection string. This is a manual process but achieves their RPO requirement of 5 minutes and RTO of 15 minutes at low cost.

**Intermediate:** An e-commerce company operates in the US and Europe. They use DynamoDB for their shopping cart service, which must accept writes from customers in both regions without cross-region latency. They enable DynamoDB Global Tables across us-east-1 and eu-west-1. Each region has its own API Gateway and Lambda function that writes cart updates to the local DynamoDB replica. Global Tables replicates those changes to the other region within sub-second latency. Their application handles the unlikely last-writer-wins conflict scenario by designing cart operations as idempotent increments rather than full-replacement writes, minimizing the impact of any conflict resolution.

**Advanced:** A financial services company runs a global transaction processing system requiring an RPO of under 1 second and an RTO of under 2 minutes for their relational database. They deploy Aurora Global Database with a primary cluster in us-east-1 and secondary clusters in eu-west-1 and ap-southeast-1. Secondary clusters have write forwarding enabled so regional application instances can issue writes without knowing which cluster is primary. CloudWatch monitors `AuroraGlobalDBReplicationLag` per region pair — if lag exceeds 500ms, a PagerDuty alert fires. They test managed failover quarterly using `aws rds failover-global-cluster`, which promotes eu-west-1 in under 60 seconds with sub-second data loss. S3 CRR with RTC protects their document storage (trade confirmations, statements), and ECR replication ensures their containerized processing services can be launched in any region without pulling images cross-region during an incident.

---

## Think About It

1. A company enables S3 Cross-Region Replication on a bucket that already contains 50,000 objects. Three days later, they check the destination bucket and find it is empty — only new objects written after the rule was created are present. Why is this expected behavior, and what must they do to replicate the existing objects?

2. Your team adds eu-central-1 as a new replica to a 500 GB DynamoDB Global Table that currently has replicas in us-east-1 and ap-southeast-1. What happens during the addition process, and what operational concerns should you plan for?

3. A scenario presents: "A company needs an RTO of 30 seconds and RPO of 5 seconds for their MySQL database across two AWS regions." You have two options: RDS cross-region read replica and Aurora Global Database. Which do you choose and why? What specific characteristics of each service drive the decision?

4. An engineer says: "If we enable S3 CRR with DeleteMarkerReplication disabled, then if someone accidentally deletes all objects in the source bucket, the destination bucket still has all the objects." Is this statement correct? What does this mean for backup and recovery strategy?

5. A company uses DynamoDB Global Tables in us-east-1 and eu-west-1. A network partition occurs for 30 seconds during which both regions accept writes to the same item. When the partition resolves, how does Global Tables determine which write wins? What are the implications for application design?

---

## Quick Check

**Question 1:** A company recently enabled S3 Cross-Region Replication (CRR) from a source bucket in us-east-1 to a destination bucket in eu-west-1. The operations team notices that objects uploaded before CRR was configured are not present in the destination bucket. Objects uploaded after CRR was enabled are replicating correctly. What should the team do to replicate the pre-existing objects?

- A) Disable and re-enable CRR — this triggers a full bucket replication
- B) Use S3 Batch Operations with the S3ReplicateObject operation to replicate existing objects
- C) Copy the objects to a temporary bucket and then copy them back to trigger replication
- D) Update the replication rule to set "ExistingObjectReplication" to "Enabled" in the AWS console

**Answer: B** — S3 CRR only replicates objects written after the rule is created. To replicate existing objects, you must use S3 Batch Operations with the `S3ReplicateObject` operation, which processes objects in bulk using an inventory manifest. Option A is incorrect — disabling and re-enabling CRR does not trigger retrospective replication. Option C would technically create new object versions that would then be replicated, but is operationally complex, incurs double storage costs, and doesn't cleanly preserve existing metadata. Option D refers to a setting that exists but requires S3 Batch Operations to execute — the setting alone doesn't initiate replication of existing objects.

---

**Question 2:** A solutions architect is designing a disaster recovery architecture for a business-critical MySQL database. The requirements specify an RPO of less than 1 second and an RTO of less than 2 minutes. Which solution meets these requirements?

- A) RDS MySQL with Multi-AZ deployment and automated backups
- B) RDS MySQL cross-region read replica with manual promotion procedure
- C) Aurora Global Database with managed cross-region failover
- D) DynamoDB Global Tables with application-layer schema mapping

**Answer: C** — Aurora Global Database is the only option that meets both requirements. It typically achieves sub-second replication lag (RPO < 1 second) using its dedicated replication infrastructure, and managed failover typically completes in under 1 minute (RTO < 2 minutes). Option A (Multi-AZ) provides high availability within a single region — it does not protect against regional failures and is not cross-region. Option B (RDS cross-region read replica) uses async replication with lag that can exceed 1 second, and manual promotion adds human response time to the RTO, making sub-2-minute RTO unreliable. Option D (DynamoDB) is a non-relational service and is not appropriate for a MySQL database workload.

---

**Question 3:** A company uses Amazon DynamoDB Global Tables across three regions. A developer asks: "What happens if two users in different regions simultaneously update the same DynamoDB item while the network is operating normally?" Which statement correctly describes the behavior?

- A) The write is rejected in one region with a ConditionalCheckFailedException until the conflict is resolved
- B) Both writes succeed locally; Global Tables uses last-writer-wins based on the timestamp of each write, and the write with the most recent timestamp propagates to all replicas
- C) Global Tables locks the item across all regions before applying either write, ensuring serializability
- D) Both writes succeed, and both versions are stored as separate versions that the application must reconcile using DynamoDB Streams

**Answer: B** — DynamoDB Global Tables uses last-writer-wins (LWW) conflict resolution. Both writes are accepted in their respective regions immediately (there is no cross-region lock). Global Tables compares the timestamps of conflicting writes during replication and propagates the most recently timestamped version to all replicas. Option A is incorrect — Global Tables does not reject writes due to conflicts; that would require conditional expressions implemented by the application. Option C is incorrect — cross-region locking would require synchronous cross-region coordination, which would introduce unacceptable latency and defeat the purpose of local writes. Option D is incorrect — DynamoDB does not store multiple conflicting versions; only the winning version is retained.

---

## What's Next

The next lesson covers AWS Backup — the centralized, policy-driven backup service that complements cross-region replication by providing scheduled snapshots, cross-region backup copy, vault lock for compliance, and a unified view of backup coverage across RDS, DynamoDB, EFS, EC2, and other services. Understanding how AWS Backup and cross-region replication serve different protection goals (point-in-time recovery vs. real-time replication) is essential for designing complete data protection architectures.
