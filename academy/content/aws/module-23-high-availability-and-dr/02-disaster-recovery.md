---
title: "Disaster Recovery Strategies"
type: content
estimated_minutes: 13
cert_tags: ["SAA-C03", "SAP-C02"]
---

# Disaster Recovery Strategies

## Overview

Disaster Recovery (DR) prepares for complete regional failures — scenarios where an entire AWS region becomes unavailable due to a widespread power event, natural disaster, or large-scale infrastructure failure. These events are rare but not theoretical; every major cloud provider has experienced regional-scale disruptions. DR is not HA (which handles component-level and AZ-level failures) — it is the plan for when an entire region is gone and you need to restore service from a completely different geographic location.

DR strategy is characterized by two metrics: **RPO** (Recovery Point Objective — how much data can you afford to lose, measured in time) and **RTO** (Recovery Time Objective — how long can the business be down before the outage becomes catastrophic). These two numbers, combined with the business's cost of downtime per hour, determine how much DR infrastructure is justified. AWS provides four recognized DR patterns that span the full spectrum from hours of downtime (cheap) to near-zero downtime (expensive).

For the SAA exam, understand each DR strategy's mechanism, approximate RTO/RPO, and cost trade-off. SAP adds specific AWS service configurations for each strategy (Aurora Global Database RPO, DMS for migration, cross-region replication configurations) and the decision process for matching business requirements to strategy. After this lesson, you will be able to select the correct DR strategy for any given RTO/RPO requirement and explain the AWS services that implement it.

---

## Core Concepts

### RPO and RTO

**Recovery Point Objective (RPO)**: the maximum amount of data loss acceptable, measured in time. If your RPO is 1 hour, you must snapshot or replicate data at minimum every hour — any data created in the hour before disaster can be lost. Lower RPO = more frequent replication = higher cost.

**Recovery Time Objective (RTO)**: the maximum time acceptable from the moment of disaster to full service restoration. If your RTO is 4 hours, every step of your recovery — detecting the failure, initiating DR, restoring data, starting infrastructure, validating health, switching DNS — must complete within 4 hours. Lower RTO = more standby infrastructure = higher cost.

**Calculating DR justification**: estimate the cost of downtime per hour (lost revenue + SLA penalties + customer churn + regulatory fines). Compare to the monthly cost of DR infrastructure at each strategy tier. If downtime costs $100,000/hour and Warm Standby costs $5,000/month, the math strongly justifies Warm Standby. If downtime costs $500/hour, Backup-Restore is appropriate.

---

### Strategy 1: Backup and Restore

**Mechanism**: take regular backups (snapshots, exports, S3 copies) and cross-region replicate them. If the primary region fails, restore from backup in the DR region, provision infrastructure, and update DNS.

**RPO**: backup frequency (daily snapshots = up to 24 hours data loss; hourly = up to 1 hour data loss).

**RTO**: hours to days, depending on data volume and how much infrastructure must be provisioned and configured from scratch.

**Cost**: lowest — no standby infrastructure runs in the DR region. Pay only for storage of backups.

**AWS tools**: AWS Backup for centralized policy-based backup with cross-region copy rules; RDS automated snapshots with cross-region copy; S3 Cross-Region Replication; DynamoDB on-demand backups.

**Use for**: non-critical workloads, internal tools, dev/staging environments, any workload where multi-hour downtime is acceptable.

---

### Strategy 2: Pilot Light

**Mechanism**: maintain a minimal running footprint in the DR region — typically only the data replication layer (an RDS Read Replica, Aurora Global Database secondary, DynamoDB Global Table). No application servers run. If the primary region fails, the data tier is promoted to writable, application infrastructure is provisioned from CloudFormation/AMIs, and DNS is updated.

**RPO**: near-zero for data (synchronous or near-synchronous replication to the standby database). The replication lag is the RPO ceiling — Aurora Global Database replication lag is typically < 1 second.

**RTO**: 1–4 hours (time to provision EC2/ECS infrastructure from CloudFormation templates and warm the application tier). This is the critical constraint — the infrastructure provisioning step determines how quickly you can serve traffic.

**Cost**: moderate — pay for the standby database instance (smaller than production is acceptable for storage; scale up at DR time), snapshot storage, and replication data transfer.

**Key requirement**: CloudFormation templates and AMIs must be maintained and tested regularly. An 18-month-old CloudFormation template that deploys a deprecated AMI is not a Pilot Light — it is false confidence. Test recovery procedures quarterly.

---

### Strategy 3: Warm Standby

**Mechanism**: a scaled-down but fully functional replica of the production environment runs continuously in the DR region. Application servers run at minimum capacity (enough to handle testing/validation traffic). The database is live and replicating. At DR time: scale up the application tier (Auto Scaling increases desired capacity), update Route 53 or Global Accelerator to point to the DR region.

**RPO**: minutes (from database replication lag; typically < 1 minute with Aurora Global Database or DynamoDB Global Tables).

**RTO**: minutes to under 1 hour (scale-up time + DNS propagation). Much faster than Pilot Light because infrastructure already exists — you are scaling capacity, not provisioning from scratch.

**Cost**: higher than Pilot Light — minimum-capacity application servers run continuously in the DR region. Typically 20–30% of full production infrastructure cost.

**Best for**: systems requiring fast recovery (RTO under 1 hour) where the cost of full Active-Active redundancy is not justified.

---

### Strategy 4: Multi-Site Active-Active

**Mechanism**: both regions serve live production traffic simultaneously. Route 53 weighted or latency-based routing (or Global Accelerator) distributes load across regions. Databases are multi-master or globally replicated (DynamoDB Global Tables, Aurora Global Database with global write forwarding). If one region fails, the other handles 100% of traffic with auto-scaling to absorb the load — no recovery steps required.

**RPO**: zero (no data loss — both regions are actively writing, data is replicated synchronously or with negligible lag).

**RTO**: near-zero — automatic traffic rerouting within 30–60 seconds as health checks detect the failure.

**Cost**: highest — full production capacity must run in both regions simultaneously, plus data replication costs and cross-region traffic.

**Use for**: systems with near-zero tolerance for downtime or data loss — financial trading platforms, critical healthcare infrastructure, payment processing.

---

## Configuration Reference

### Example: Aurora Global Database for Pilot Light / Warm Standby RPO

```bash
# Create an Aurora Global Database (primary cluster in us-east-1)
aws rds create-global-cluster \
  --global-cluster-identifier prod-global-db \
  --engine aurora-postgresql \
  --engine-version 15.4 \
  --storage-encrypted \
  --deletion-protection \
  --region us-east-1

# Create the primary cluster in us-east-1
aws rds create-db-cluster \
  --db-cluster-identifier prod-primary \
  --engine aurora-postgresql \
  --engine-version 15.4 \
  --global-cluster-identifier prod-global-db \
  --master-username admin \
  --master-user-password '{{resolve:secretsmanager:prod/aurora/admin:password}}' \
  --db-subnet-group-name prod-subnet-group \
  --vpc-security-group-ids sg-aurora-prod \
  --region us-east-1

# Add a secondary cluster in us-west-2 (DR region)
aws rds create-db-cluster \
  --db-cluster-identifier prod-secondary \
  --engine aurora-postgresql \
  --engine-version 15.4 \
  --global-cluster-identifier prod-global-db \
  --db-subnet-group-name dr-subnet-group \
  --vpc-security-group-ids sg-aurora-dr \
  --region us-west-2
# Aurora Global Database typically replicates with < 1 second RPO
# To FAIL OVER: remove secondary from global cluster (promotes it to standalone writable primary)

# DR failover command (promotes secondary to standalone — point-in-time of last replication)
aws rds remove-from-global-cluster \
  --global-cluster-identifier prod-global-db \
  --db-cluster-identifier arn:aws:rds:us-west-2:123456789012:cluster:prod-secondary \
  --region us-west-2
# After removal, prod-secondary in us-west-2 becomes writable — update application DNS
```

---

### Example: AWS Backup Cross-Region Copy Policy (Backup-Restore)

```json
{
  "Rules": [
    {
      "RuleName": "daily-backup-with-dr-copy",
      "TargetBackupVaultName": "prod-backup-vault",
      "ScheduleExpression": "cron(0 2 * * ? *)",
      "StartWindowMinutes": 60,
      "CompletionWindowMinutes": 180,
      "Lifecycle": {
        "DeleteAfterDays": 35
      },
      "CopyActions": [
        {
          "DestinationBackupVaultArn": "arn:aws:backup:us-west-2:123456789012:backup-vault:dr-backup-vault",
          "Lifecycle": {
            "DeleteAfterDays": 90
          }
        }
      ]
    }
  ],
  "Resources": [
    "arn:aws:rds:us-east-1:123456789012:db:prod-database",
    "arn:aws:dynamodb:us-east-1:123456789012:table/orders",
    "arn:aws:elasticfilesystem:us-east-1:123456789012:file-system/fs-abc123"
  ]
}
```

> **Note:** AWS Backup copies are asynchronous — there is a delay between the backup completing in the primary region and the copy arriving in the DR region. For Backup-Restore RPO calculations, account for both backup frequency and copy transfer time. RPO = backup interval + copy transfer time, not just backup interval.

---

## How to Decide

**DR strategy selection framework:**

| Business RTO | Business RPO | Recommended Strategy | Monthly Cost (relative) |
|---|---|---|---|
| Days | Hours-Days | Backup and Restore | $ |
| 1–4 hours | Minutes–1 hour | Pilot Light | $$ |
| Minutes–1 hour | Minutes | Warm Standby | $$$ |
| Near-zero | Zero | Multi-Site Active-Active | $$$$ |

**The decision process:**

1. Identify the business impact of downtime (revenue/hour, SLA penalty, regulatory risk)
2. Set RTO and RPO based on what the business can tolerate — not what sounds good
3. Calculate the break-even: if the cheapest strategy that meets the RTO/RPO costs less per month than the expected downtime cost in a realistic disaster scenario, it is justified
4. Choose the strategy that meets the requirements at the lowest cost — do not over-engineer

**Choosing the data replication service:**

- **Aurora Global Database**: PostgreSQL or MySQL, < 1 second replication lag, supports up to 5 secondary regions, write forwarding allows all regions to accept writes
- **DynamoDB Global Tables**: NoSQL, sub-second replication, multi-master (all regions writable simultaneously), built-in conflict resolution
- **S3 Cross-Region Replication (CRR)**: object storage, replication lag minutes, one-way or two-way (Bi-directional CRR)
- **AWS DMS with CDC**: heterogeneous database migration and continuous CDC replication to any target

---

## How This Connects

- **Aurora Global Database** — The standard data replication mechanism for Pilot Light and Warm Standby strategies with PostgreSQL or MySQL. < 1 second replication lag provides near-zero RPO. Failover promotes the secondary to a standalone writable primary.
- **DynamoDB Global Tables** — Multi-master replication for NoSQL workloads across regions. All regions accept writes; conflicts are resolved using last-writer-wins. The standard data layer for Active-Active DynamoDB workloads.
- **Route 53** — DNS failover routing with health checks switches traffic to the DR region when the primary region's health checks fail. DNS TTL (typically 60 seconds for production) determines how quickly clients see the change.
- **AWS Global Accelerator** — Anycast IP-based failover, bypassing DNS TTL delays. Detects regional failures and reroutes traffic within 30 seconds. Preferred over Route 53 for Active-Active latency-sensitive applications.
- **CloudFormation / CDK** — The infrastructure deployment mechanism for Pilot Light recovery. Templates must be maintained, tested, and stored in a region-independent location (S3 with CRR, or SCM) so they are available during a regional failure.
- **AWS Backup** — Centralized cross-service backup with cross-region copy rules, covering RDS, Aurora, EC2 (AMI), EFS, DynamoDB, S3, FSx, and more. The standard implementation of Backup-Restore strategy.

---

## Exam Traps

- **RPO and RTO are business requirements, not technical ones**: many students define RPO and RTO in terms of what's technically achievable. They are business constraints — the maximum loss the business can sustain. A technically achievable 30-second RPO is irrelevant if the business says 4 hours of data loss is acceptable. Design to meet the requirement, not to maximize technical capability.
- **Pilot Light RTO includes infrastructure provisioning time**: students often underestimate Pilot Light RTO because the data is already replicated. The bottleneck is provisioning EC2/ECS infrastructure from CloudFormation in the DR region, which can take 15–45 minutes alone — plus deployment time, health check warm-up, and DNS propagation. Test your actual RTO, don't estimate it.
- **Warm Standby application servers are scaled-down, not production-scale**: Warm Standby runs the application tier at minimum capacity (e.g., 2 instances instead of 20). At DR time, Auto Scaling increases capacity to production levels. If the DR region's Auto Scaling cannot scale fast enough for the traffic level, RTO is longer than expected.
- **Multi-Site Active-Active with Aurora Global Database requires write forwarding for true active-active**: by default, Aurora Global Database has one writable primary region and read-only secondary regions. "Active-Active" with Aurora requires enabling global write forwarding (writes to secondary are forwarded to the primary) or using DynamoDB Global Tables instead.
- **RTO clock starts at disaster detection, not disaster occurrence**: RTO includes the time to detect the failure (monitoring alerts), escalate to decision-makers (approve DR activation), execute recovery steps, and validate restoration. A 2-hour RTO that starts counting when the phone rings at 2 AM requires the entire sequence to complete in 2 hours — including waking up the on-call engineer.

---

## Summary

- RPO defines maximum acceptable data loss (time); RTO defines maximum acceptable downtime. Both are business requirements that drive DR investment level.
- Backup-Restore (cheapest): regular cross-region backups, hours-to-days RTO, cheapest cost. Use AWS Backup with cross-region copy rules.
- Pilot Light: data tier runs continuously in DR region; application tier is provisioned at DR time. Near-zero RPO, 1–4 hour RTO. Aurora Global Database or DMS CDC for data replication.
- Warm Standby: scaled-down full environment runs in DR region; scale up and switch DNS at DR time. Minutes RPO, minutes-to-1-hour RTO. 20–30% of production infrastructure cost continuously.
- Multi-Site Active-Active: both regions serve production traffic; automatic failover with no recovery steps. Near-zero RPO and RTO. Full production cost in both regions.
- All DR strategies require regular testing — untested DR plans are hypotheses. Test at least quarterly under realistic conditions and measure actual RTO.

---

## Examples

A small e-commerce startup runs on a single RDS instance with daily automated snapshots copied to a second region via AWS Backup with cross-region copy rules. Their products are non-perishable goods, site traffic is modest, and a 6-hour outage during a regional disaster would be survivable. They choose Backup-Restore: lowest cost, acceptable 24-hour RPO and 4-hour RTO. The cost of standby infrastructure for a better strategy would exceed their expected downtime cost over a decade. This is the right choice for their risk tolerance and budget.

A healthcare software company operates an appointment scheduling system used by clinic staff. Losing the last four hours of booked appointments would cause real patient-care disruption, but a 90-minute recovery window is acceptable. They implement Pilot Light: an Aurora Global Database secondary runs in us-west-2, keeping replication lag under 1 second. EC2 and ECS infrastructure is defined in CloudFormation but not deployed. They test the recovery procedure quarterly — the last test measured a 78-minute actual RTO (CloudFormation provisioning took 35 minutes, ECS task warm-up took 20 minutes, health check propagation took 8 minutes, Route 53 DNS propagation took 15 minutes). The measured RTO meets the 90-minute requirement with 12 minutes of margin.

A global investment bank operates trading systems where a single minute of downtime costs millions in missed trades and potential regulatory fines. Any data loss is a regulatory violation. They run Multi-Site Active-Active: DynamoDB Global Tables across us-east-1 and eu-west-1 with multi-master writes, Global Accelerator distributing latency-routed trade orders to the nearest region, and each region at full production capacity. When us-east-1 experiences a power disruption, Global Accelerator detects the failing health checks and shifts 100% of traffic to eu-west-1 within 28 seconds, with zero data loss. The annual cost of running full capacity in two regions is less than the expected cost of a single 15-minute outage.

---

## Think About It

1. Why does a lower RPO almost always imply a lower RTO in practice — even though they measure fundamentally different things? Can you construct a realistic scenario where RPO is near-zero but RTO is several hours?
2. A company documents a Pilot Light DR plan but has not tested it in 18 months. Their CloudFormation templates reference an AMI that was deregistered 6 months ago. What is their actual RTO likely to be during a disaster, and what process would prevent this situation?
3. How would you decide between Warm Standby and Multi-Site Active-Active for a payment processing service that processes $5,000 per minute? Build the cost-justification calculation with realistic numbers.
4. Aurora Global Database has a typical replication lag under 1 second. Under what database workload conditions might that lag exceed 1 second, and what would that mean for the actual RPO of a Pilot Light architecture that depends on it?
5. Your RTO target is 2 hours. You design and test a Warm Standby that achieves 45 minutes. Should you report this as "meeting requirements" and move on, or should the measured 45-minute RTO trigger a strategic conversation? What are the implications of each choice?

---

## Quick Check

**Q1.** A company takes daily RDS snapshots and copies them to a DR region. In a regional disaster, how long ago might the most recently replicated data be — and what DR strategy does this represent?

- A) Near-zero data loss; Multi-Site Active-Active
- B) Up to 24 hours data loss; Backup and Restore
- C) Up to 1 hour data loss; Pilot Light
- D) Minutes of data loss; Warm Standby

**Answer: B** — Daily snapshots mean any data written since the last snapshot would be lost in a disaster — up to 24 hours of data loss. This RPO and the lack of running standby infrastructure are the defining characteristics of the Backup and Restore strategy.

---

**Q2.** In a Pilot Light DR architecture, which component is kept running continuously in the DR region?

- A) The full application tier at production scale
- B) A scaled-down application tier serving live traffic
- C) Only the data replication layer (e.g., Aurora Global Database secondary or RDS read replica)
- D) Nothing — all infrastructure is provisioned from scratch at DR time

**Answer: C** — Pilot Light keeps only the data tier running and replicating — the "light" that is always on. Application infrastructure (EC2, ECS, Lambda configuration) exists as code (CloudFormation) but is not deployed until DR is declared, distinguishing Pilot Light from Warm Standby (which runs a live scaled-down application tier).

---

**Q3.** A financial services company requires an RTO of under 5 minutes and RPO of zero for their payment processing platform. Which DR strategy meets both requirements?

- A) Backup and Restore
- B) Pilot Light
- C) Warm Standby
- D) Multi-Site Active-Active

**Answer: D** — Only Multi-Site Active-Active provides near-zero RTO (automatic traffic rerouting, no recovery steps) and zero RPO (both regions actively processing with synchronous or near-synchronous data replication). The other strategies all require recovery time ranging from minutes (Warm Standby) to hours (Backup-Restore), and all have non-zero RPO from replication lag.

---

## What's Next

The next lesson covers Auto Scaling — the service that makes both HA and DR work dynamically. Understanding Target Tracking, Predictive Scaling, and the relationship between ASGs and load balancers is essential for designing self-healing application tiers that handle both normal scaling events and DR scale-up scenarios.
