---
title: "RDS Multi-AZ and Read Replicas"
type: content
estimated_minutes: 20
cert_tags: ["SAA-C03", "SAP-C02", "CLF-C02"]
---

# RDS Multi-AZ and Read Replicas

## Overview

RDS provides two distinct mechanisms for database redundancy and scale, and confusing them is one of the most common mistakes on the Solutions Architect exam. Multi-AZ is a high-availability feature: it maintains a synchronous standby copy of your database in a second Availability Zone, ready to absorb traffic automatically if the primary fails. Read Replicas are a performance feature: they maintain asynchronous copies that can serve read traffic, reducing load on the primary and scaling read throughput horizontally. The two features address completely different problems, and the details — replication mode, whether the secondary is readable, failover mechanics, maximum replica count — are examined directly.

Multi-AZ exists because hardware fails, AZs experience disruptions, and maintenance windows require patching. Without a standby, any of these events means your database is unavailable while AWS recovers the instance or you restore from backup. With Multi-AZ, RDS maintains a hot standby in a different AZ with synchronous replication. Every transaction committed to the primary is simultaneously written to the standby before the commit is acknowledged. This means the standby is always current — zero committed data loss on failover. When a failure is detected, RDS updates the database DNS record to point at the standby, and the application reconnects automatically within 60–120 seconds.

Read Replicas exist because many production databases are read-heavy. An e-commerce catalog, a reporting dashboard, a content management system — these workloads issue far more SELECT queries than INSERTs or UPDATEs. A single primary DB instance has finite read throughput. Read Replicas provide additional read capacity: you create up to 5 (standard RDS) or 15 (Aurora) replicas, each with its own endpoint, and route SELECT traffic to them from your application. Because replication is asynchronous, replicas may lag slightly behind the primary, but for most read workloads this is acceptable. Replicas can also be promoted to standalone writable instances, enabling upgrade strategies and disaster recovery patterns.

## Core Concepts

### Multi-AZ: Synchronous Replication and Automatic Failover

In a standard Multi-AZ deployment, RDS creates a primary instance and a standby instance in different Availability Zones within the same region. The standby is not a separate, independently managed instance — it is a replication target managed entirely by RDS. Replication is **synchronous**: every transaction must be written to the standby's storage before the primary acknowledges the commit to the application. This synchronous guarantee means the RPO (Recovery Point Objective) for Multi-AZ is effectively zero — no committed data can be lost in a failover because the standby always has an identical copy.

The standby is completely opaque to your application. It has no separate endpoint. You cannot query it, connect to it, or use it for reporting. It exists solely to absorb a failover. When a failure condition is detected — primary instance failure, storage failure, network connectivity loss to the primary, or OS/software crash — RDS automatically promotes the standby by updating the DNS record for the primary endpoint (the CNAME). Applications using the standard RDS endpoint reconnect and hit the new primary. The old primary becomes the new standby when it recovers. The failover typically completes in **60–120 seconds**, which is the RTO you should plan for in your application's connection retry logic.

Multi-AZ also benefits planned maintenance. When AWS needs to patch the OS or database engine on a Multi-AZ instance, it patches the standby first, performs a controlled failover to the newly patched standby, and then patches the old primary (now standby). This converts a maintenance outage into a brief failover rather than extended downtime.

### Multi-AZ Multi-Standby Cluster (Two-AZ and Three-AZ Modes)

AWS introduced a newer Multi-AZ Cluster option for MySQL and PostgreSQL that deploys one writer and two readable standby instances across three Availability Zones. This differs from standard Multi-AZ in two critical ways. First, **the standbys are readable** — they can serve SELECT traffic, unlike the invisible standby in standard Multi-AZ. Second, **failover is faster**, typically under 35 seconds, because the standbys are more actively synchronized using a cluster-local replication protocol.

This Multi-AZ Cluster mode is a middle ground between standard Multi-AZ (opaque standby, 60–120s failover) and Aurora (fully featured cluster with distributed storage). For MySQL or PostgreSQL workloads that need faster failover and some read scaling without migrating to Aurora, the Multi-AZ Cluster is worth evaluating. On the exam, distinguish it from standard Multi-AZ by remembering: **Multi-AZ Cluster standbys are readable; standard Multi-AZ standby is not.**

### Read Replicas: Asynchronous Replication and Replication Lag

Read Replicas replicate from the primary using the engine's native asynchronous replication mechanism (MySQL binlog replication, PostgreSQL streaming replication). "Asynchronous" means the primary commits a transaction and acknowledges it to the application immediately, then transmits the change to replicas in the background. The primary does not wait for replicas to confirm the write. This keeps replica overhead low and allows replicas to be placed in distant regions, but it means replicas may be slightly behind the primary at any given moment.

The lag between the primary and a replica is measured in seconds and is exposed as a CloudWatch metric: **ReplicaLag** (in seconds). Typical replication lag on a lightly loaded system is under one second. During heavy write bursts, lag can spike to several seconds or more. Your application design must account for this: if you route a read to a replica immediately after writing to the primary, you may read stale data. For workloads where this matters (e.g., "user just updated their profile, show them the updated view"), read from the primary. For workloads where slight staleness is acceptable (e.g., daily sales report, product catalog), read from replicas.

To monitor replica health, create CloudWatch alarms on `ReplicaLag` with a threshold appropriate to your use case. If ReplicaLag grows continuously, the replica may be under-resourced (too small an instance class to keep up with replication), the primary write rate may exceed what the replica can apply, or there may be a network bottleneck.

### Read Replica Limits and Placement Options

Read Replica limits vary by engine: **MySQL and MariaDB support up to 15 Read Replicas** per source DB instance (updated in 2023); **PostgreSQL, Oracle, and SQL Server support up to 5**. Each replica has its own endpoint (hostname) that your application must explicitly target — RDS does not automatically load-balance reads across replicas. You must configure your application to use the replica endpoint for reads, or use a connection proxy like RDS Proxy that can route reads.

Read Replicas can be placed in three configurations:

- **Same AZ as primary**: Lowest network latency, no cross-AZ data transfer cost, but does not add AZ-level redundancy.
- **Different AZ, same region**: Adds AZ redundancy at a slightly higher replication cost. Best practice for replicas intended for HA-augmenting read scale.
- **Different region (Cross-Region Read Replica)**: The replica runs in a completely separate AWS region and replicates over the public internet (encrypted). Cross-region replicas are the primary RDS DR tool — they can be promoted to standalone instances if the source region fails. Cross-region replication incurs inter-region data transfer charges.

### Promoting a Read Replica

A Read Replica can be promoted to a fully independent, writable standalone DB instance. When promotion occurs, replication from the source is permanently severed — there is no way to re-attach the replica to the source after promotion. The promoted instance becomes its own primary and receives its own endpoint. This is useful in three patterns:

1. **Major version upgrade with near-zero downtime**: Create a Read Replica, upgrade the replica to the new engine major version, test your application against the replica for as long as needed, then promote the replica and cut over your application's connection string. The original primary remains unchanged during testing and becomes a rollback target.

2. **Creating a test copy of production data**: Create a replica, promote it, and run destructive tests or data transformations against the promoted instance. Because replication was asynchronous, it is a very recent copy of production — far more current than a snapshot restore.

3. **Cross-region disaster recovery**: Create a cross-region Read Replica. If the source region becomes unavailable, promote the replica in the backup region to a standalone writable database and update DNS to point your application there.

## Configuration Reference

### AWS CLI: Create a Read Replica

```bash
aws rds create-db-instance-read-replica \
  --db-instance-identifier prod-postgres-replica-01 \   # Name for the new replica instance
  --source-db-instance-identifier prod-postgres-01 \    # Source (primary) instance to replicate from
  --db-instance-class db.m7g.large \                    # Can differ from source — size based on read workload
  --availability-zone us-east-1b \                      # Specific AZ; omit for RDS to choose
  --storage-type gp3 \                                  # Inherits source storage type if omitted
  --auto-minor-version-upgrade \                        # Apply minor patches automatically
  --publicly-accessible false \                         # Keep in private subnet
  --enable-performance-insights \                       # Enable query monitoring on the replica
  --tags Key=Environment,Value=production Key=Role,Value=read-replica
```

**For a cross-region read replica**, add `--source-region` and run the command in the destination region:

```bash
aws rds create-db-instance-read-replica \
  --db-instance-identifier prod-postgres-replica-usw2 \
  --source-db-instance-identifier prod-postgres-01 \
  --source-region us-east-1 \                           # Region of the source instance
  --db-instance-class db.m7g.large \
  --region us-west-2 \                                  # Run this command targeting the destination region
  --storage-encrypted \
  --kms-key-id alias/aws/rds                            # KMS key in us-west-2; required for encrypted cross-region replicas
```

### AWS CLI: Promote a Read Replica

```bash
aws rds promote-read-replica \
  --db-instance-identifier prod-postgres-replica-01 \  # Replica to promote
  --backup-retention-period 7 \                        # Set backup retention on the newly promoted instance
  --preferred-backup-window "03:00-04:00"              # Set backup window post-promotion
# After promotion: the instance is now a standalone writable DB with its own endpoint
# Replication from the original source is permanently severed
```

### AWS CLI: Enable Multi-AZ on an Existing Instance

```bash
aws rds modify-db-instance \
  --db-instance-identifier prod-postgres-01 \
  --multi-az \                                         # Enable Multi-AZ; RDS provisions a standby asynchronously
  --apply-immediately                                  # Apply now (brief performance impact); omit for next maintenance window
# Note: enabling Multi-AZ on a running instance does NOT cause immediate failover
# RDS provisions the standby in a second AZ and syncs it in the background
```

### AWS CLI: Trigger a Manual Failover (for Testing)

```bash
aws rds reboot-db-instance \
  --db-instance-identifier prod-postgres-01 \
  --force-failover
# --force-failover on a Multi-AZ instance triggers a failover to the standby
# Use this to test your application's connection retry behavior
# Also validates that failover completes within your target RTO
```

### CloudWatch: Monitor Replication Lag

```bash
# Get the current ReplicaLag metric for a read replica
aws cloudwatch get-metric-statistics \
  --namespace AWS/RDS \
  --metric-name ReplicaLag \
  --dimensions Name=DBInstanceIdentifier,Value=prod-postgres-replica-01 \
  --start-time 2024-01-15T00:00:00Z \
  --end-time 2024-01-15T01:00:00Z \
  --period 60 \                        # 60-second granularity
  --statistics Maximum                 # Use Maximum to see worst-case lag spikes
```

**Create a CloudWatch Alarm for ReplicaLag:**

```json
{
  "AlarmName": "RDS-ReplicaLag-High",
  "AlarmDescription": "Read replica lag exceeded 30 seconds",
  "Namespace": "AWS/RDS",
  "MetricName": "ReplicaLag",
  "Dimensions": [
    { "Name": "DBInstanceIdentifier", "Value": "prod-postgres-replica-01" }
  ],
  "Statistic": "Maximum",
  "Period": 60,
  "EvaluationPeriods": 3,
  "Threshold": 30,
  "ComparisonOperator": "GreaterThanThreshold",
  "AlarmActions": ["arn:aws:sns:us-east-1:123456789012:db-ops-alerts"],
  "TreatMissingData": "notBreaching"
}
```

### Console Walkthrough: Enabling Multi-AZ on an Existing Instance

1. Navigate to **RDS → Databases** and select the instance.
2. Click **Modify**.
3. Under **Availability & durability**, select **Multi-AZ deployment — Create a standby instance**.
4. Scroll to the bottom. Under **Scheduling of modifications**, choose:
   - **Apply during the next scheduled maintenance window** — lower risk; happens off-peak
   - **Apply immediately** — takes effect now; may cause a brief performance impact during standby sync
5. Click **Continue**, review the summary, and click **Modify DB instance**.
6. The instance status will show **Modifying** while the standby is provisioned and synchronized. For a multi-hundred-GB database, this can take 30–60 minutes.

### Console Walkthrough: Adding a Read Replica

1. Navigate to **RDS → Databases** and select the primary instance.
2. In the **Actions** menu, choose **Create read replica**.
3. Set **DB instance identifier** for the replica.
4. Optionally change the **DB instance class** — replicas can be smaller if read traffic is lighter.
5. Set **Destination region** if creating a cross-region replica; leave default for same-region.
6. Set **Availability Zone** or leave as "No preference."
7. Keep **Publicly accessible** set to No.
8. Click **Create read replica**. The replica will show as **Creating** then **Backing-up** before becoming **Available**.

## How to Decide

Use this criteria to choose between Multi-AZ, Read Replicas, or both:

1. **Is the goal high availability (surviving failures without manual intervention)?** Use Multi-AZ. This is the only feature that provides automatic failover. Read Replicas do not fail over automatically.

2. **Is the goal read scaling (handling more read traffic than the primary alone can serve)?** Use Read Replicas. Direct reporting queries, analytics workloads, and read-heavy application traffic to replica endpoints.

3. **Do you need the secondary to be readable?** If yes — Read Replicas or Multi-AZ Cluster. Standard Multi-AZ standby is NOT readable.

4. **Do you need cross-region redundancy for DR?** Use Cross-Region Read Replicas. Copy your automated backups to a second region AND maintain a cross-region replica for a current copy with low RPO.

5. **Do you need to perform a major version upgrade with minimal downtime?** Create a Read Replica, upgrade it in isolation, test, then promote. This is lower risk than in-place upgrade because you test against a real copy of production data.

6. **Do you need both HA and read scaling?** Use both. Multi-AZ primary for automatic failover, plus Read Replicas for read scale. These features compose independently.

7. **Is your budget limited and this is dev/test?** Disable Multi-AZ. The doubled cost is not justified for non-production databases. A single instance with automated backups is sufficient for dev/test.

## How This Connects

- **Amazon CloudWatch**: The `ReplicaLag` metric on CloudWatch is the health indicator for Read Replicas. Alarms on `ReplicaLag`, `DatabaseConnections`, and `CPUUtilization` provide the minimum operational visibility for RDS deployments with replicas.
- **Amazon Route 53**: Multi-AZ failover works via DNS — RDS updates a CNAME record pointing the primary endpoint at the standby's IP. Your application's DNS TTL settings determine how quickly it picks up the change; short TTLs (30–60 seconds) help. Cross-region DR promotion requires you to update Route 53 records manually or via an automated runbook.
- **AWS RDS Proxy**: A connection proxy that sits between your application and RDS. RDS Proxy handles connection pooling, reduces the overhead of frequent connection open/close cycles, and pins read traffic to replicas automatically. Useful when Lambda functions create large numbers of short-lived DB connections.
- **Amazon Aurora**: Aurora's architecture takes the Read Replica pattern further — all Aurora Replicas share the same distributed storage layer, eliminating replication lag for reads. Promoting an Aurora Replica to primary takes under 30 seconds because there is no data to copy. If you find yourself needing more than 5 Read Replicas or needing faster failover than standard Multi-AZ provides, Aurora is the natural next step.
- **AWS Secrets Manager**: Application connection strings must differentiate between the primary endpoint (writes) and replica endpoints (reads). Secrets Manager can store separate secrets for the writer and reader endpoints, simplifying credential rotation and endpoint management when replicas are added or removed.

## Exam Traps

**Trap 1: The Multi-AZ standby serves read traffic.**
It does not — in standard Multi-AZ. The standby is completely opaque to applications and serves no traffic until a failover promotes it. This is one of the most commonly tested distinctions. Only Multi-AZ Cluster standbys (MySQL/PostgreSQL newer option) and Read Replicas serve reads. If a question says "I want to scale reads," Multi-AZ is the wrong answer.

**Trap 2: Read Replicas provide automatic failover.**
They do not. Promoting a Read Replica is a manual operation — you must execute `promote-read-replica` and update your application's connection string. Multi-AZ provides automatic failover. Read Replicas require deliberate promotion decisions. Questions phrased as "automatically fails over" point to Multi-AZ, not Read Replicas.

**Trap 3: Multi-AZ means zero downtime.**
Multi-AZ significantly reduces downtime — failover completes in 60–120 seconds — but it is not zero downtime. The application will experience a brief connection disruption as DNS updates propagate and connection retry logic reconnects. The RPO is zero (no data loss), but the RTO is 60–120 seconds. Plan your application's connection retry and timeout settings accordingly.

**Trap 4: Cross-region Read Replicas are the same as Multi-AZ.**
They are different features at different scales. Multi-AZ protects against single-AZ failures within a region — it is automatic and synchronous. Cross-region Read Replicas protect against full regional failures — they are asynchronous, have replication lag, and require manual promotion. Cross-region replicas have a non-zero RPO (the current replica lag at the time of the regional failure). Multi-AZ has zero RPO.

**Trap 5: Replication lag on a Read Replica is always negligible.**
Not always. During heavy write bursts, replication lag can spike significantly. The `ReplicaLag` CloudWatch metric should be monitored with an alarm. If your application reads immediately after a write and requires seeing its own writes, it must read from the primary, not a replica. Building applications that transparently route all reads to replicas without awareness of lag can cause subtle data consistency bugs.

## Summary

- Multi-AZ maintains a synchronous standby in a different AZ with automatic failover in 60–120 seconds and zero RPO; the standby serves no reads in standard mode.
- Read Replicas maintain asynchronous copies with their own readable endpoints, scaling read throughput horizontally — up to 15 replicas for MySQL/MariaDB, up to 5 for PostgreSQL/Oracle/SQL Server.
- Multi-AZ Cluster (MySQL/PostgreSQL) deploys one writer and two readable standbys with faster failover under 35 seconds, combining read scale with high availability.
- ReplicaLag is the key CloudWatch metric for monitoring Read Replica health; alarms should be set to detect lag spikes before they cause application-visible staleness.
- Promoting a Read Replica creates a standalone writable instance and permanently severs replication — used for major version upgrades, test environment creation, and cross-region DR activation.
- Production architectures should combine both: Multi-AZ primary for automatic HA and Read Replicas for analytics and read scale workloads.

## Examples

A healthcare SaaS platform runs patient record lookups (reads) and appointment creation (writes) on RDS PostgreSQL. Write volume is low but read queries — patient history, medication lists, scheduling views — account for 90% of all traffic. The team enables Multi-AZ for HA (automated failover if the primary fails) and creates two Read Replicas in different AZs. The application framework is configured to send all SELECT queries to the replica endpoint and all INSERT/UPDATE/DELETE queries to the primary endpoint. A CloudWatch alarm fires on `ReplicaLag > 10s` and notifies the on-call engineer. During a quarterly maintenance window, the Multi-AZ failover mechanism patches the standby, flips DNS, and patches the old primary in under 5 minutes — the application experiences a single reconnect event.

A retail company needs to run heavy analytical SQL queries over the last 90 days of transaction data for a daily business report. These queries take 45 seconds each and were running against the production OLTP database, causing lock contention and latency spikes for live checkout traffic. The team creates a dedicated Read Replica on a db.r7g.2xlarge (Memory Optimized, since the analytics queries benefit from larger sort buffers and in-memory hash joins) and configures the reporting application to connect only to the replica endpoint. The production primary is no longer impacted by analytics. Replication lag for this workload is typically 200ms because the OLTP write rate is low. The analytics team can run queries freely without production risk.

An engineering team must upgrade RDS PostgreSQL from version 14 to version 16 — a two-major-version jump. In-place major version upgrade requires a maintenance window and carries risk. Instead, they create a Read Replica and upgrade the replica from 14 to 15 (major upgrades must be sequential), then from 15 to 16. They point a staging environment at the upgraded replica and run two weeks of load testing. After validating behavior, they promote the replica, update the application's `DATABASE_URL` environment variable, and restart the application containers in a rolling deployment. Total cutover time: under 3 minutes. The old version-14 primary is retained for 48 hours as a rollback target before deletion.

## Think About It

1. Multi-AZ replication is synchronous — every write must commit on both the primary and standby before the application receives an acknowledgment. What is the theoretical latency penalty of this model compared to a single-instance write, and under what network conditions would this penalty become visible?

2. Your application reads from a Read Replica and replication lag spikes to 8 seconds during a heavy batch import. What specific user-visible symptoms would this cause in a social media feed application, and how would you re-architect the read routing logic to prevent them?

3. RDS uses DNS-based failover for Multi-AZ — the CNAME for the primary endpoint is updated to the standby's IP. What happens to existing open database connections during a failover, and what should your application's connection pool configuration look like to handle this gracefully?

4. A cross-region Read Replica in us-west-2 is your DR target for a primary in us-east-1. If us-east-1 becomes completely unavailable, describe the exact manual steps you need to execute to restore service, and identify any pre-work you should have done in advance to make that process faster.

5. If you have 5 Read Replicas and your write throughput on the primary doubles, what happens to ReplicaLag across all replicas, and what architectural options do you have to address it — both within RDS and by considering a migration to Aurora?

## Quick Check

**Q1.** An RDS PostgreSQL database is configured with Multi-AZ. A reporting application needs to run long-running SELECT queries without affecting the primary database. Which solution is correct?

- A) Enable Multi-AZ and point the reporting application at the standby endpoint
- B) Create a Read Replica and point the reporting application at the replica endpoint
- C) Enable Multi-AZ Cluster and point the reporting application at the primary endpoint
- D) Use AWS DMS to stream the data to a separate database for reporting

**Answer: B** — Standard Multi-AZ standby is not readable. Read Replicas have their own endpoint for read traffic and are designed exactly for this use case. DMS (D) is a migration service and introduces unnecessary complexity for this problem.

**Q2.** What is the replication type used by RDS Multi-AZ standard deployments, and what does it guarantee?

- A) Asynchronous — minimizes write latency with potential data loss on failover
- B) Asynchronous — no data loss but eventual consistency on the standby
- C) Synchronous — every committed transaction exists on the standby, guaranteeing zero data loss
- D) Synchronous — standby acknowledges writes within 5 seconds

**Answer: C** — Standard Multi-AZ uses synchronous replication. Every transaction is written to the standby before the primary acknowledges the commit. This guarantees zero committed data loss on failover, which is what makes it the right choice for production HA.

**Q3.** A company's primary RDS instance in us-east-1 fails. They have a Cross-Region Read Replica in us-west-2. What action is required to restore write capability in us-west-2?

- A) Multi-AZ failover automatically promotes the cross-region replica
- B) Run `rds:RebootDBInstance --force-failover` in us-west-2
- C) Manually run `rds:PromoteReadReplica` on the replica in us-west-2, then update the application endpoint
- D) Restore a snapshot from us-east-1 to us-west-2

**Answer: C** — Cross-region replicas do not fail over automatically. You must manually promote the replica using `promote-read-replica` and then update your application's connection string to the newly promoted instance's endpoint. Option A is incorrect because Multi-AZ is single-region and does not cross regions.

## What's Next

Next up: RDS Backups and Snapshots — automated backups, point-in-time recovery, manual snapshots, cross-region copy, and Blue/Green deployments for safe major version upgrades.
