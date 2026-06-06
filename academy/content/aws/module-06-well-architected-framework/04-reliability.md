---
title: "Pillar: Reliability"
type: content
estimated_minutes: 18
cert_tags: ["CLF-C02", "SAA-C03", "SAP-C02"]
---

# Pillar: Reliability

## Overview

The Reliability pillar focuses on a workload's ability to perform its intended function correctly and consistently, and to recover automatically when it fails. Reliability is not about preventing all failures — at cloud scale, hardware failures are routine, software bugs happen, and external dependencies behave unexpectedly. Reliability engineering accepts failure as inevitable and designs for fast, automatic recovery rather than attempting to achieve a hypothetically failure-free environment.

The pillar rests on three areas: foundations (ensuring you have the right service limits, network topology, and account structure to support your workload), change management (using Auto Scaling, monitoring, and automated deployment to handle demand changes and deployments without manual intervention), and failure management (using backups, Multi-AZ, multi-region, and chaos engineering to ensure your system can recover from the failures that inevitably occur). Each area addresses a different source of reliability risk: baseline infrastructure configuration, the disruption introduced by changes, and the hardware and software failures that happen in production.

For the CLF-C02 exam, know the five Reliability pillar design principles and the names of the AWS services that implement them (Multi-AZ RDS, Auto Scaling, Route 53, S3 versioning and cross-region replication). For the SAA exam, be prepared to select the appropriate reliability pattern for a described scenario — choosing between Multi-AZ vs. multi-region, selecting the right RTO/RPO mechanism, and configuring health check-based failover. At the SAP level, design for extreme availability targets (five nines), select and justify chaos engineering approaches, and calculate end-to-end availability for complex multi-service architectures.

## Core Concepts

### RTO and RPO: Defining Recovery Requirements Before Designing for Reliability

Before designing any reliability mechanism, you must know two numbers: **Recovery Time Objective (RTO)** — the maximum acceptable time between a failure occurring and the system being restored to service, and **Recovery Point Objective (RPO)** — the maximum acceptable age of the data recovered after a failure (equivalently, the maximum amount of data that can be lost, measured in time).

WHY must you define RTO and RPO before selecting reliability mechanisms? Because the cost of reliability scales dramatically with how aggressive your targets are. A system that can tolerate 24-hour RTO and 24-hour RPO can be reliably protected with daily backups to S3 and manual recovery procedures. A system that requires 1-minute RTO and near-zero RPO requires synchronous multi-region replication, active-active architecture, and automated failover — an order of magnitude more complex and expensive. Knowing your actual business requirement prevents both under-engineering (accepting higher risk than the business can tolerate) and over-engineering (spending on reliability the business does not need).

| RTO Target | Reliability Pattern | AWS Implementation |
|---|---|---|
| Hours to days | Backup and restore | S3 backups, RDS automated snapshots, manual recovery |
| Minutes to hours | Warm standby | Multi-AZ RDS, AMI-based EC2 recovery, pre-configured warm standby environment |
| Seconds to minutes | Active-passive failover | Multi-AZ with automatic failover, Route 53 health-check failover to standby region |
| Near-zero | Active-active | Multi-region with real-time replication, Route 53 latency/weighted routing, Aurora Global Database |

### Automatically Recover from Failure

The core reliability principle is that systems should detect failures and recover without human intervention. The primary mechanisms are: **Auto Scaling** — maintains a desired number of healthy instances and replaces unhealthy ones automatically; **Application Load Balancer health checks** — stops routing traffic to unhealthy targets within seconds of a health check failure; **Multi-AZ RDS** — automatically promotes the standby replica to primary if the primary instance becomes unavailable; **Route 53 health checks** — redirects DNS traffic to a healthy endpoint when a health check fails.

WHY does automatic recovery matter more than fast manual recovery? Because failures happen at the worst possible times — weekend nights, holiday peaks, when your best engineers are unavailable. A manual recovery that takes 20 minutes when the right person is sitting at their desk may take two hours when they need to be paged, access a VPN, and diagnose the situation from scratch. Automatic recovery is not dependent on who is available or how quickly they respond.

### Foundations: Service Quotas and Network Topology

AWS applies service quotas (also called service limits) to every account — maximum numbers of VPCs, EC2 instances, Lambda concurrency, RDS instances, and hundreds of other resources. These quotas exist to protect the shared AWS infrastructure from runaway resource consumption and to give AWS advance notice of large capacity requirements. For a workload's reliability, quotas matter because hitting an unexpected quota during a traffic spike or recovery operation can prevent your automated recovery mechanisms from functioning.

WHY do quotas create reliability risk? Consider an Auto Scaling group configured to scale from 10 to 50 instances during traffic spikes. If the EC2 instance quota in that region is 40, the Auto Scaling group cannot reach 50 — and the application experiences degraded performance or failure at exactly the moment it needs more capacity. Reliability-conscious teams proactively request quota increases before they approach limits, not after they hit them. AWS Service Quotas console allows you to view current limits and submit increase requests.

### Test Recovery Procedures

Designing for reliability is necessary but not sufficient — you must also test your recovery mechanisms regularly. A recovery procedure that has never been executed under realistic conditions is not a reliable recovery procedure. Chaos engineering is the practice of intentionally introducing controlled failures — terminating random EC2 instances, injecting latency into database calls, simulating AZ failures — to validate that your automated recovery mechanisms work as expected and that your team knows how to respond.

WHY does testing matter if the automation should "just work"? Because the gap between designed behavior and actual behavior widens over time. Applications accumulate dependencies that are not reflected in architecture diagrams. Connection pool configurations may not retry correctly after a database failover. Auto Scaling launch templates may reference AMIs that have been deregistered. The only way to discover these gaps before a real failure causes customer impact is to create controlled failures and observe the actual recovery behavior. AWS Fault Injection Service (FIS) provides managed chaos engineering with pre-built fault injection actions.

### Scale Horizontally to Reduce Single Points of Failure

A single large resource is a single point of failure — when it fails, the entire workload is affected. Multiple smaller resources in an active configuration mean that the failure of any one resource reduces overall capacity rather than eliminating it entirely. This principle applies to compute (Auto Scaling groups of EC2 instances instead of one large instance), databases (read replicas, Multi-AZ), networking (multiple NAT gateways across AZs), and any stateful component.

WHY not just make the single resource more reliable instead? Because no individual resource has 100% availability. AWS's EC2 SLA for a single instance is 99.5% — meaning up to approximately 43.8 hours of downtime per year. For a two-instance active-active configuration, the probability of both failing simultaneously is 0.5% × 0.5% = 0.0025%, yielding 99.9975% combined availability — more than a 17× improvement. Horizontal scaling does not prevent individual failures; it prevents individual failures from causing system-wide failures.

## Configuration Reference

### Reliability Patterns: Service Mapping Table

| Reliability Pattern | AWS Service | How to Configure | What It Protects |
|---|---|---|---|
| Multi-AZ database HA | Amazon RDS Multi-AZ | Enable "Multi-AZ DB instance" at creation or via Modify; synchronous standby in separate AZ | AZ failure; automatic failover in 60–120s, RPO = 0 |
| Multi-AZ database HA (superior) | Amazon Aurora | Automatically replicates 6 copies across 3 AZs; faster failover under 30s | AZ failure; storage-layer redundancy; no separate standby needed |
| Compute fleet health + scale | Auto Scaling Group | Set min/desired/max; use ELB health check type; span multiple AZs | Instance failures; traffic spikes; AZ-level capacity loss |
| DNS-layer failover | Route 53 Failover Routing | Create health checks + A records with Primary/Secondary failover policy | Endpoint or region failures; redirects DNS in seconds |
| Cross-region DR for S3 | S3 Cross-Region Replication (CRR) | Enable versioning on source; configure CRR rule with destination bucket in second region | Regional disaster; near-real-time copy in second region |
| Centralized backup management | AWS Backup | Create backup plan with schedule + retention; assign resources by tag or ARN | Accidental deletion, corruption; enables point-in-time restore across services |
| Cross-region database DR | Aurora Global Database | Create Global Database with primary region + secondary region; automated failover under 1 min | Regional failure; RPO near-zero with synchronous replication |
| Quota-related capacity risk | AWS Service Quotas | Review Applied Quotas in Service Quotas console; request increase before approaching limits | Prevent Auto Scaling and recovery failures at limit boundaries |

### Multi-AZ RDS Configuration

Multi-AZ RDS creates a synchronous standby replica of the primary database instance in a separate Availability Zone. Writes to the primary are synchronously replicated to the standby before being acknowledged — ensuring zero data loss on failover. AWS manages the failover automatically: when the primary fails, the standby is promoted and the DNS endpoint is updated within 60–120 seconds.

**Enabling Multi-AZ on a new RDS instance:**
1. Navigate to RDS → Create database
2. Under "Availability and durability" → select "Multi-AZ DB instance"
3. The configuration creates one primary and one standby in a separate AZ
4. No application changes required — the application connects to the same endpoint; AWS reroutes after failover

**Enabling Multi-AZ on an existing RDS instance:**
1. Select the existing DB instance → Modify
2. Under "Availability and durability" → change to Multi-AZ
3. Select "Apply immediately" or "During next maintenance window"
4. Note: Multi-AZ conversion on a large database may take hours; plan accordingly

**Multi-AZ RDS Key Properties:**

| Property | Value | Notes |
|---|---|---|
| Replication type | Synchronous | No data loss on failover (RPO = 0) |
| Failover trigger | AZ failure, instance failure, OS maintenance | Automatic — no manual intervention required |
| Failover time | 60–120 seconds | DNS TTL determines client reconnect time |
| Read scalability | None | Standby is not readable; use read replicas for read scaling |
| Cost | ~2x single-AZ | You pay for both the primary and standby instance |

### Auto Scaling Group: Reliability-Focused Configuration

| Parameter | Recommended Value | Reliability Role |
|---|---|---|
| Minimum capacity | 2+ across 2+ AZs | Ensures baseline availability; single-AZ ASG has no AZ failure protection |
| Maximum capacity | Peak demand + 20% buffer | Prevents runaway scaling; must be within account quotas |
| Health check type | ELB (ALB health check) | Detects application-level failures, not just instance-level EC2 status |
| Health check grace period | Match application startup time | Too short causes premature replacement of healthy instances still starting |
| Multi-AZ span | All AZs in the region | AZ failure reduces capacity proportionally rather than causing complete outage |

### Route 53 Health Check Failover Configuration

**Step 1: Create health checks** — Navigate to Route 53 → Health checks → Create health check. Select "Endpoint" type. Configure protocol (HTTP/HTTPS/TCP), domain name or IP, port, and health check path (e.g., `/health`). Set failure threshold to 3 (3 consecutive failures before marking unhealthy). Set request interval: 10 seconds for faster detection, 30 seconds for lower cost.

**Step 2: Create DNS records with failover routing policy** — Create an A record for the primary endpoint with Routing policy: Failover, Record type: Primary, associated with the health check from Step 1. Create a second A record for the secondary endpoint with Routing policy: Failover, Record type: Secondary.

**Step 3: Set record TTL** — Set TTL to 60 seconds for production failover scenarios. A lower TTL means clients re-query DNS sooner after failover, reducing the window during which clients cache the stale primary address. Higher TTL reduces DNS query volume but increases cutover time.

**Failover behavior:** When the primary health check fails for the threshold number of consecutive checks, Route 53 returns the secondary endpoint's address for all new DNS queries. This pattern extends naturally to multi-region active-passive DR: primary in us-east-1, standby in eu-west-1, with Aurora Global Database providing near-zero-RPO cross-region replication.

### AWS Backup: Centralized Backup Plan

AWS Backup provides centralized backup management across RDS, DynamoDB, EFS, EBS, FSx, Aurora, and S3. A backup plan specifies:
- **Backup rules:** Schedule (cron expression or rate-based), backup window, lifecycle (when to transition to cold storage, when to expire), and optionally a destination vault in a second region for cross-region copies
- **Resource assignment:** Assign by resource tag (e.g., `backup-policy: daily`) or by individual ARN — tag-based assignment is recommended for dynamic environments where resources are created frequently

Cross-region backup copies satisfy the Reliability pillar's requirement that backup data be stored in a geographically separate location from the source — protecting against regional disasters that could destroy both the primary data and co-located backups.

## How to Decide

### Choosing the Right Reliability Pattern for Your RTO/RPO

| If your RTO is... | And your RPO is... | Use this pattern | Key services |
|---|---|---|---|
| 24+ hours | 24 hours | Backup and restore | RDS automated snapshots, S3 versioning, AWS Backup |
| 1–4 hours | 1 hour | Pilot light | Cross-region RDS read replica (promote on DR), AMI-based recovery |
| 15–60 minutes | Minutes | Warm standby | Multi-AZ in primary region, cross-region replication, automated failover |
| Under 5 minutes | Near-zero | Active-passive multi-region | Route 53 health check failover, Aurora Global Database |
| Near-zero | Zero | Active-active multi-region | Route 53 weighted/latency routing, DynamoDB Global Tables, Aurora Global Database |

### Multi-AZ vs. Multi-Region: When to Use Each

| Dimension | Multi-AZ | Multi-Region |
|---|---|---|
| What it protects against | Single AZ failure (data center failure) | AWS Region failure, regional disaster, global latency |
| AWS responsibility | AWS guarantees AZs are physically separate | You configure cross-region replication and failover |
| Data replication | Synchronous (RDS Multi-AZ) — no data loss | Asynchronous (most cross-region services) — some data loss possible |
| Failover time | Seconds to minutes (automatic) | Minutes to tens of minutes (DNS TTL + replication lag) |
| Cost increment | ~2x stateful resources | Significantly higher — full replica in second region |
| Appropriate for | All production workloads | High-value workloads with strict RTO, global user base, or regulatory geographic requirements |

**Decision rule:** Start with Multi-AZ for all production stateful resources. Add multi-region only when the business has a documented RTO requirement that Multi-AZ cannot meet, when regulatory requirements mandate geographic separation, or when serving a global user base with latency requirements.

## How This Connects

- **Amazon RDS Multi-AZ** — the standard implementation of the Reliability pillar's automatic recovery principle for relational databases; synchronous replication ensures zero data loss on AZ failure; automatic promotion eliminates manual intervention
- **AWS Auto Scaling** — implements both "automatically recover from failure" (replacing unhealthy instances) and "stop guessing capacity" (dynamically matching instance count to demand); works with ALB health checks for application-aware instance replacement
- **Amazon Route 53** — implements DNS-layer failover between endpoints, regions, and availability zones; health check integration enables automatic traffic rerouting without manual DNS changes
- **AWS Backup** — centralized backup management across RDS, DynamoDB, EFS, EC2, and other services; implements the "test recovery procedures" principle by providing point-in-time restore capabilities and cross-region backup copies
- **Amazon CloudWatch** — the observability layer that enables all automated reliability mechanisms; Auto Scaling scaling policies, Route 53 health checks, and automated remediation runbooks all depend on CloudWatch metrics and alarms to detect conditions that trigger recovery actions

## Exam Traps

**Trap 1: Confusing RDS Multi-AZ with Read Replicas.** Multi-AZ creates a synchronous standby for high availability — it is a failover target, not a read endpoint. Read replicas provide read scalability (and can be used for DR) but are asynchronous (some data loss possible) and are not automatically promoted on failure. Multi-AZ = HA. Read replicas = read scale + DR option. Both can exist simultaneously on the same instance.

**Trap 2: Assuming that "Multi-AZ" means multi-region.** AZs are physically separate data centers within the same AWS Region. Multi-AZ protects against data center failure within a region. A regional failure affects all AZs in that region simultaneously. Multi-region architecture is required for protection against regional failures. These are different levels of the reliability stack.

**Trap 3: Thinking Auto Scaling is only for scaling.** Auto Scaling maintains fleet health as well as adjusting fleet size. With a minimum capacity of 2, an Auto Scaling group will always launch a replacement when an instance fails — even if scaling policies would otherwise reduce the fleet to 1. Health replacement and capacity scaling are both features of the same Auto Scaling group; separating them conceptually leads to under-configuring minimum capacity.

**Trap 4: Treating RPO = 0 as achievable with backups.** Automated backups and snapshots run on a schedule — they create a recovery point at the time of the last backup. If the database fails between backups, data written since the last backup is lost. RPO = 0 requires synchronous replication (Multi-AZ or Aurora's replication layer) where every write is confirmed in at least two locations before being acknowledged. Backups address RPO in hours; synchronous replication addresses RPO = 0.

**Trap 5: Confusing chaos engineering with uncontrolled failure.** Chaos engineering is a disciplined practice — controlled experiments with defined scope, limited blast radius, and engineers ready to observe and intervene. It is not randomly breaking production. AWS Fault Injection Service (FIS) provides a structured framework for chaos experiments with safety guardrails (stop conditions based on CloudWatch alarms).

## Summary

- Reliability requires defining RTO (maximum acceptable recovery time) and RPO (maximum acceptable data loss) before selecting mechanisms — the cost of reliability scales dramatically with how aggressive these targets are, and over-engineering reliability is as wasteful as under-engineering it.
- Automatic recovery mechanisms — Auto Scaling group health replacement, ALB health check-based traffic rerouting, RDS Multi-AZ failover, Route 53 health check DNS failover — are the Well-Architected answer to failure response; they work faster than humans and do not require on-call engineers to be available.
- Multi-AZ protects against Availability Zone failures and is the baseline reliability requirement for all production stateful resources; multi-region protects against regional failures and is appropriate for high-value workloads with aggressive RTO requirements or a global user base.
- RDS Multi-AZ uses synchronous replication with automatic failover (60–120 seconds) to achieve RPO = 0 and automated recovery; read replicas use asynchronous replication and are not automatically promoted — they serve read scaling and optional DR purposes, not primary HA.
- Chaos engineering — intentionally terminating instances, injecting latency, simulating AZ failures using AWS Fault Injection Service — is the mechanism that validates that your reliability architecture actually works; reliability mechanisms that have never been tested cannot be trusted during an actual failure.
- Service quotas are a reliability risk that is easy to overlook: an Auto Scaling group that needs to scale to 50 instances will fail if the account's EC2 quota is 40; proactive quota review and increase requests are part of Reliability pillar "foundations" work.

## Examples

**Beginner:** A small e-commerce site runs their application on a single EC2 instance behind a manually configured Elastic IP. When that instance fails during a peak shopping day, the site is down for 45 minutes while the team launches and configures a replacement. After the incident, they migrate to an Auto Scaling group with a minimum of 2 instances across two AZs behind an Application Load Balancer. The minimum of 2 means that even after one instance fails, the other continues serving traffic. The ALB health check detects the failure within 30 seconds and stops routing to the unhealthy instance. Auto Scaling launches a replacement automatically. The site's next instance failure causes zero customer-visible downtime.

**Intermediate:** A ride-sharing platform implements chaos engineering to validate their reliability assumptions. They run monthly "game days" — scheduled sessions where engineers use AWS Fault Injection Service to terminate random EC2 instances, inject latency into database calls, and simulate an AZ failure. During one exercise, they discover that database failover works correctly, but the application's connection pool does not retry connections on the new primary endpoint — causing a 90-second outage during which all requests fail. This gap existed for 18 months without being caught. Discovering it in a controlled simulation allows them to fix it without customer impact; the same gap found during a real AZ failure would have caused 90 seconds of total outage at their busiest time.

**Advanced:** A global financial platform targets five-nines availability (99.999% — 5.3 minutes of downtime per year) for their transaction processing service. They model the availability math for each component: compute tier (Auto Scaling, multi-AZ) at 99.99%; Aurora Global Database with cross-region automatic failover at 99.99%; Route 53 at 99.99%. Because components in series multiply their availability (99.99% × 99.99% × 99.99% ≈ 99.97%), they are short of five nines. They decouple components using SQS queues between tiers so a brief compute outage does not cause transaction loss, configure Aurora Global Database for under-one-minute cross-region failover, and set Route 53 health checks at 10-second intervals with a 15-second TTL. The architecture achieves 99.999% measured availability over a six-month period — only because they modeled the math first and targeted the weakest links rather than uniformly improving all components.

## Think About It

1. The Reliability pillar recommends testing recovery procedures with chaos engineering. Many organizations resist this because "testing failures in production sounds reckless." How would you make the case to a risk-averse organization that controlled failure testing actually reduces overall risk, and what safeguards would you put in place before running your first chaos experiment?
2. Multi-AZ architecture improves availability by removing correlated failure risk. What categories of failures does Multi-AZ not protect against, and what architectural choices would address those remaining risks?
3. Auto Scaling can maintain fleet health by replacing unhealthy instances. What are the failure modes of Auto Scaling itself — the conditions under which Auto Scaling fails to replace an unhealthy instance — and how would you design around them?
4. Your application has an availability target of 99.99%. Your payment processing dependency (a third-party service) has an SLA of 99.9%. How do you reason about whether your overall availability target is achievable given this dependency, and what options do you have?
5. Why might a system that recovers automatically from failure be harder to troubleshoot and diagnose when problems occur, and how would you design your observability and runbooks to compensate for this increased diagnostic complexity?

## Quick Check

**Q1.** An e-commerce application stores orders in a single-AZ RDS MySQL database. The engineering team needs to ensure that if the database's AZ fails, the application recovers automatically within two minutes with no data loss. Which change most directly achieves this?

- A) Create an RDS read replica in a second Availability Zone
- B) Enable RDS automated backups with a 1-hour backup window
- C) Enable RDS Multi-AZ deployment
- D) Migrate the database to DynamoDB

**Answer: C** — RDS Multi-AZ creates a synchronous standby replica in a separate AZ and automatically promotes it (within 60–120 seconds) if the primary fails — achieving both zero data loss (RPO = 0) and automatic recovery. A read replica uses asynchronous replication and is not automatically promoted; automated backups address RPO in hours, not seconds.

**Q2.** An Auto Scaling group is configured with minimum=1, maximum=10, desired=3. An AZ failure takes down one of the three running instances. What happens?

- A) The ASG reduces desired capacity to 2 to match the remaining instances
- B) The ASG replaces the failed instance by launching a new one in a healthy AZ, restoring the fleet to 3 instances
- C) The ASG terminates all instances and redeploys in the remaining healthy AZs
- D) Nothing — Auto Scaling only adds instances, it does not replace failed ones

**Answer: B** — Auto Scaling monitors instance health and automatically replaces unhealthy instances to maintain the desired capacity. When a health check fails, the ASG terminates the unhealthy instance and launches a replacement in a healthy AZ.

**Q3.** A company needs cross-region disaster recovery for their RDS PostgreSQL database with an RPO of 4 hours and an RTO of 1 hour. Which approach meets these requirements at the lowest cost?

- A) Aurora Global Database with automatic cross-region failover
- B) RDS Multi-AZ in the primary region with no cross-region component
- C) RDS automated snapshots copied to the DR region hourly, with a documented manual restore procedure
- D) DynamoDB Global Tables with cross-region replication

**Answer: C** — Hourly snapshot copies to the DR region achieve RPO = 1 hour (better than the 4-hour requirement), and manual restore from snapshot can be completed within an hour (meeting RTO). This is the backup-and-restore pattern — the simplest and cheapest DR approach when the RTO/RPO requirements allow time for manual recovery. Aurora Global Database achieves lower RTO/RPO but at significantly higher cost.

## What's Next

Next lesson: the Performance Efficiency pillar — selecting the right compute, storage, database, and networking resources for each workload, using managed services to access advanced technology, and continuously optimizing as demand and AWS offerings evolve.

---
