---
title: "SAA Scenario Decision Drills: Picking the Right Service Under Constraints"
type: content
estimated_minutes: 16
cert_tags: ["SAA-C03"]
---

# SAA Scenario Decision Drills: Picking the Right Service Under Constraints

## Overview

The SAA exam is, at its core, a service-selection exam. Every domain — secure, resilient, high-performing, cost-optimized — presents the same shape of question: here is a business situation with constraints, choose the architecture that best satisfies them. Knowing what each service *does* is necessary but not sufficient; you also have to know what each service is *best at* relative to its neighbors, because the wrong answers are almost always plausible services that are merely a worse fit.

This lesson is deliberately different from the others. Instead of teaching a service, it drills the *decision*. It collects the highest-frequency either/or choices the exam forces — compute, storage, database, decoupling, resilience, and cost — and gives you the discriminating question that resolves each one. These are the comparisons that separate a pass from a fail, because they appear again and again under different cover stories.

Treat this as a capstone for Domains 2, 3, and 4. Work each drill by first naming the deciding constraint, then the service. After this lesson you will recognize the "tell" in a scenario quickly and avoid the distractors that punish surface-level knowledge.

---

## Core Concepts

### Compute: EC2 vs. Lambda vs. Fargate

The deciding constraint is the workload's shape and operational ownership. **Lambda** fits short (≤15 min), event-driven, spiky, or unpredictable workloads where you want zero server management and per-request scaling. **Fargate** fits containerized workloads that run longer than Lambda allows or need container tooling, still without managing servers. **EC2** fits steady, long-running, or specialized workloads (specific instance types, licensing, OS-level control) — and is the cost-optimization play when usage is predictable enough for Reserved Instances or Savings Plans. Tells: "unpredictable/spiky + short" → Lambda; "containers, no servers" → Fargate; "steady 24/7, full control, lowest cost with commitment" → EC2.

### Storage: S3 vs. EBS vs. EFS vs. FSx

The deciding constraint is the access pattern and how many compute nodes need the data. **S3** is object storage for the internet — static assets, backups, data lakes, anything accessed via API and not as a filesystem. **EBS** is block storage attached to a *single* EC2 instance (one-to-one) — boot volumes and databases. **EFS** is a shared POSIX filesystem mountable by *many* EC2 instances at once (Linux). **FSx** provides purpose-built file systems (FSx for Windows for SMB/Windows workloads, FSx for Lustre for HPC). Tells: "object/HTTP/backup/data lake" → S3; "single instance block volume" → EBS; "shared file system across many Linux instances" → EFS; "Windows/SMB shared files" → FSx for Windows.

### Database: RDS/Aurora vs. DynamoDB vs. ElastiCache

The deciding constraint is the data model and scaling pattern. **RDS/Aurora** for relational data needing SQL, joins, and transactions; Aurora when you want managed high availability and read scaling at cloud scale. **DynamoDB** for key-value/document data needing single-digit-millisecond latency at any scale with minimal operations, and for unpredictable or massive throughput. **ElastiCache** when the real need is to cache hot reads in front of a database. Tells: "relational/SQL/transactions" → RDS/Aurora; "key-value, massive scale, serverless, low latency" → DynamoDB; "read-heavy, repeated reads, microseconds" → ElastiCache (or DAX for DynamoDB).

### Resilience: Multi-AZ vs. Multi-Region, and the DR Strategies

The deciding constraint is the required RPO/RTO and blast radius. **Multi-AZ** (within a region) protects against an AZ failure and is the baseline for high availability — RDS Multi-AZ, ASGs across AZs, ALBs spanning AZs. **Multi-Region** protects against a regional failure and supports the lowest RPO/RTO via active-active or warm standby, at higher cost and complexity. The four DR strategies in order of increasing cost and decreasing RTO: **Backup & Restore** (cheapest, hours), **Pilot Light** (core running, minimal), **Warm Standby** (scaled-down full stack, minutes), **Active-Active/Multi-site** (full, near-zero RTO, costliest). Tells: "survive an AZ outage" → Multi-AZ; "survive a region outage / near-zero RTO" → Multi-Region active-active or warm standby.

### Decoupling and Caching (Capstone Cross-Reference)

Two earlier lessons collapse into single tells here. **Decoupling**: consumed once → SQS; fan-out → SNS; replay/multi-consumer streaming → Kinesis; AWS/SaaS event routing → EventBridge. **Caching**: global content → CloudFront; read-heavy relational → ElastiCache; read-heavy DynamoDB → DAX; diverse relational reads → read replicas. Keep these reflexive.

### Cost: The Recurring Levers

When a question adds "most cost-effective," apply the levers: predictable compute → Reserved Instances/Savings Plans; fault-tolerant, interruptible compute → Spot; infrequent object access → S3 Intelligent-Tiering or lifecycle to IA/Glacier; private S3/DynamoDB access → free Gateway endpoints; high-volume egress → CloudFront. "Least operational overhead" usually points to managed/serverless options (Aurora Serverless, DynamoDB, Lambda, Fargate).

---

## Configuration Reference

The discriminating questions, condensed:

```text
Decision          Ask this                                  Answer signals
---------------- ----------------------------------------- ------------------------------
Compute           Short & spiky? Containers? Steady?         Lambda / Fargate / EC2
Storage           Object? One instance? Shared FS? Windows?  S3 / EBS / EFS / FSx
Database          Relational? Key-value at scale? Cache?     RDS-Aurora / DynamoDB / ElastiCache
Resilience        AZ failure? Region failure? RPO/RTO?       Multi-AZ / Multi-Region + DR tier
Decoupling        Once? Many? Replay? Route?                 SQS / SNS / Kinesis / EventBridge
Cost adjective    "cost-effective" / "least overhead"        RI-SP-Spot-tiering / managed-serverless
```

Keyword-to-intent decoder (the exam's vocabulary):

```text
"unpredictable / spiky"        → serverless (Lambda/DynamoDB)
"steady / 24x7 / predictable"   → EC2 + Reserved/Savings Plans
"interruptible / fault-tolerant"→ Spot Instances
"shared across instances"       → EFS
"single-digit ms at any scale"  → DynamoDB
"most cost-effective"           → apply cost levers above
"least operational overhead"    → managed / serverless
"survive region failure"        → Multi-Region (active-active/warm standby)
```

---

## How to Decide

For any scenario: (1) underline the **hard constraints** (latency, RPO/RTO, scale, budget, operational overhead, compliance); (2) identify the **one deciding constraint** that eliminates most options; (3) match it to the service via the tells above; (4) sanity-check the survivors against the *secondary* constraints (cost and overhead usually break ties). The best answer satisfies all stated constraints; distractors satisfy most but violate one.

---

## How This Connects

This lesson is the synthesis of the entire SAA curriculum — it reaches back into every shared compute, storage, database, networking, and resilience lesson and forward into the **Exam Strategy** lesson, which adds the test-taking mechanics on top of this decision content. Use it as your final-review checklist before the exam.

---

## Exam Traps

- **Picking the most powerful service instead of the best-fit.** DynamoDB is not "better" than RDS; it's better *for key-value at scale*. Match the data model.
- **Ignoring "least operational overhead."** This phrase almost always demotes self-managed/EC2 answers in favor of managed/serverless ones.
- **Over-engineering resilience.** If the requirement is to survive an AZ failure, Multi-AZ is correct; jumping to Multi-Region is a costlier wrong answer.
- **Missing the cost adjective.** "Cost-effective" changes the answer — Spot for interruptible work, RIs for steady work, tiering for cold data.
- **EFS vs. EBS.** "Shared across many instances" is EFS; EBS attaches to one instance.

---

## Summary

The SAA exam rewards disciplined service selection. For each scenario, isolate the one deciding constraint and apply the tell: compute by workload shape (Lambda/Fargate/EC2), storage by access pattern (S3/EBS/EFS/FSx), database by data model (RDS-Aurora/DynamoDB/ElastiCache), resilience by failure scope and RPO/RTO (Multi-AZ/Multi-Region plus the four DR tiers), decoupling by delivery semantics (SQS/SNS/Kinesis/EventBridge), and cost by the standard levers. Distractors are plausible-but-worse fits; the right answer is the one that satisfies every stated constraint, with cost and operational overhead breaking ties.

---

## Examples

**Example 1.** "A spiky, event-driven image-processing job runs a few seconds per image with no servers to manage." Deciding constraint: short + spiky + no servers → **Lambda**.

**Example 2.** "Many Linux instances must read and write the same set of files concurrently." Deciding constraint: shared filesystem across instances → **EFS**.

**Example 3.** "A retailer must survive a full AWS Region outage with an RTO of a few minutes." Deciding constraint: region failure + low RTO → **Multi-Region warm standby (or active-active)**.

**Example 4.** "A batch analytics job is fault-tolerant and must be as cheap as possible." Deciding constraint: interruptible + cheapest → **Spot Instances**.

---

## Think About It

A scenario says: "a read-heavy workload on a relational database must scale to handle many *different* report queries with the least operational overhead." Two services tempt you — ElastiCache and read replicas. Which deciding constraint ("different" queries vs. repeated reads, plus "least overhead") points to which service, and would your answer change if the database were DynamoDB instead?

---

## Quick Check

1. Which deciding constraint separates EFS from EBS?
2. A steady 24/7 workload that needs the lowest compute cost points to which option?
3. Which DR strategy gives near-zero RTO at the highest cost?
4. What does the phrase "least operational overhead" usually favor?

*Answers: (1) whether the storage must be shared across many instances (EFS) or attached to one (EBS); (2) EC2 with Reserved Instances or Savings Plans; (3) active-active / multi-site; (4) managed or serverless services.*

---

## What's Next

Final lesson: **SAA-C03 Exam Strategy and Question Patterns** — how to read questions, eliminate distractors, manage time, and apply everything you've drilled here under exam conditions.
