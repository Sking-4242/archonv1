---
title: "Backup, Restore, and Disaster Recovery Operations"
type: content
estimated_minutes: 14
cert_tags: ["SOA-C03"]
---

# Backup, Restore, and Disaster Recovery Operations

## Overview

The third reliability task on SOA-C03 is implementing backup and restore strategies — automating backups across AWS resources, restoring to meet RTO and RPO, enabling versioning, and following disaster-recovery procedures. This is core CloudOps work: ensuring that when data is lost or a Region fails, it can be recovered within the business's time and data-loss objectives, at acceptable cost. The exam tests configuration ("automate daily backups across these services") and decision-making ("which restore method meets this RPO at lowest cost," "which DR strategy fits this RTO").

The operational principle is **recoverability governed by RTO/RPO and cost**. Backups are only valuable if they're automated (so they actually happen), comprehensive (covering the resources that matter), retained appropriately, and *restorable* within the recovery objectives. **RTO (Recovery Time Objective)** is how quickly you must recover; **RPO (Recovery Point Objective)** is how much data loss is acceptable. These two numbers drive every backup and DR decision — a tight RPO demands frequent backups or continuous replication; a tight RTO demands a faster (and costlier) DR strategy. CloudOps engineers automate backups with AWS Backup, choose restore methods that hit the objectives, and run DR procedures that match the chosen strategy. This lesson collects that operational knowledge.

After it you will be able to automate backups, choose restore methods for given RTO/RPO and cost, and apply the appropriate DR strategy.

## Core Concepts

### Automating Backups with AWS Backup

**AWS Backup** is the centralized, managed service for automating and governing backups across many AWS services — EC2 instances, EBS volumes, RDS and Aurora databases, DynamoDB tables, EFS and FSx file systems, S3, and more. You define a **backup plan** with rules (frequency, backup window, **retention** period, lifecycle to cold storage) and assign resources by tag or selection, and AWS Backup handles snapshot creation, retention, and **cross-Region and cross-account copy**. This replaces per-service scripts and ad-hoc snapshots with consistent, auditable, policy-driven backups. The exam pairs "automate and centrally manage backups across multiple services" with AWS Backup (and "automate EBS snapshots specifically" can also use **Amazon Data Lifecycle Manager**). Tag-based assignment means new resources are backed up automatically when tagged.

### Restore Methods and RTO/RPO

Restoring is where RTO and RPO get real. The exam emphasizes **point-in-time restore (PITR)** for databases — RDS/Aurora continuously back up transaction logs so you can restore to any second within the retention window, giving a very low RPO; DynamoDB also offers PITR. Restoring from a **snapshot** recovers to the snapshot's moment (RPO = time since last snapshot). The operational decision balances RTO/RPO against cost: more frequent backups and continuous log backup lower RPO but cost more; faster restore paths lower RTO. The exam pairs "restore to a specific moment to minimize data loss" with point-in-time restore and tests choosing the method that meets the stated RTO/RPO at acceptable cost. Note that restoring an RDS snapshot creates a **new instance** (you then repoint applications), an operational detail that affects RTO.

### Versioning for Recovery

**Versioning** protects against overwrite and deletion at the object/file level. **S3 versioning** keeps every version of an object so you can recover a prior version or undo a delete (a delete just adds a delete marker), and **FSx** and other storage services offer their own versioning/backup. Versioning is the lightweight, continuous protection against accidental or malicious changes, complementing scheduled backups. The exam pairs "recover a previous version / undo an overwrite or delete" with versioning (S3, FSx).

### Disaster Recovery Strategies

For Region-level failures, the exam expects the four **DR strategies**, ordered by increasing cost and decreasing RTO/RPO: **Backup & Restore** (restore from backups in another Region — lowest cost, highest RTO, hours); **Pilot Light** (core systems like databases replicated and running minimally, scale up on failover); **Warm Standby** (a scaled-down but fully functional copy running in the DR Region, scale up on failover — minutes); and **Multi-Site Active/Active** (full production in multiple Regions, near-zero RTO/RPO, highest cost). The operational decision matches the strategy to the business's RTO/RPO and budget: relaxed objectives → Backup & Restore; near-zero RTO → active/active. The exam pairs a stated RTO/RPO and cost tolerance with the right strategy.

### DR Procedures and Testing

Following DR procedures operationally means more than having backups: it means the cross-Region copies exist (AWS Backup cross-Region copy, RDS cross-Region snapshots/replicas, S3 cross-Region replication), the failover steps are documented and tested, and recovery has been validated against the RTO/RPO. Untested DR is a hope, not a plan. The exam expects you to recognize that DR readiness includes replicated/copied backups in another Region and validated restore procedures, not just local snapshots.

### Putting Objectives First

The throughline is that **RTO and RPO drive the choices**. Given a tight RPO, you need frequent backups or continuous replication (PITR, cross-Region replication); given a tight RTO, you need a warmer DR strategy (warm standby or active/active) and faster restore paths. Given relaxed objectives and cost sensitivity, backup & restore suffices. CloudOps engineers read the objectives from the requirement and select the backup frequency, restore method, and DR strategy that meet them at the lowest acceptable cost.

## Configuration Reference

Backup automation:

```text
AWS Backup            central, policy-driven backups across EC2/EBS/RDS/DynamoDB/EFS/FSx/S3;
                      backup plans (frequency, window, retention, cold-storage lifecycle);
                      tag-based assignment; cross-Region + cross-account copy
Data Lifecycle Manager  automate EBS snapshots specifically (schedule, retention, copy)
```

Restore methods by objective:

```text
Point-in-time restore (PITR)  RDS/Aurora/DynamoDB → restore to any second in window → low RPO
Snapshot restore              recover to snapshot moment (RPO = time since snapshot);
                              RDS snapshot restore creates a NEW instance (affects RTO)
Versioning                    S3/FSx → recover prior version / undo delete (continuous, lightweight)
```

DR strategies (cost ↑, RTO/RPO ↓):

```text
Backup & Restore     restore from another-Region backups   cheapest, hours
Pilot Light          core (DB) running minimally, scale up  low cost, minutes-hours
Warm Standby         scaled-down full stack running         medium, minutes
Multi-Site Active/Active  full prod in multiple Regions      costliest, near-zero
Match strategy to required RTO/RPO and budget
```

## How to Decide

- **Automate backups across many services centrally?** → **AWS Backup** (tag-based plans, cross-Region copy).
- **Minimize data loss (low RPO) for a database?** → **point-in-time restore** (continuous log backup).
- **Recover a prior object version / undo a delete?** → **versioning**.
- **Choose a DR strategy?** → match RTO/RPO and cost: relaxed → **Backup & Restore**; near-zero RTO → **Warm Standby / Active-Active**; in between → **Pilot Light**.
- **DR readiness?** → ensure cross-Region copies exist and restores are tested.

## How This Connects

This lesson completes the reliability domain, building on the shared HA/DR, RDS backups, and S3 versioning lessons, and on AWS Backup from the security data-protection material. It connects to monitoring (alarms on backup failures), automation (scheduled backups and DR runbooks via Systems Manager), and cost (DR strategy and retention drive spend). RTO/RPO thinking recurs in the architecture and security curricula.

## Exam Traps

- **Manual/ad-hoc snapshots instead of AWS Backup.** Use AWS Backup for centralized, automated, tag-driven backups with cross-Region copy.
- **Snapshot restore when PITR is needed.** For minimal data loss to a specific moment, use point-in-time restore, not the last snapshot.
- **Forgetting RDS snapshot restore creates a new instance.** You must repoint applications — it affects RTO.
- **Local-only backups for DR.** Region-level DR needs cross-Region copies/replication, not just same-Region snapshots.
- **Over- or under-spending on DR.** Match the strategy to RTO/RPO; active/active is overkill for relaxed objectives, and backup & restore won't meet a near-zero RTO.
- **Untested DR.** Readiness requires validated restore procedures.

## Summary

CloudOps backup and DR work is governed by RTO (how fast you must recover) and RPO (how much data loss is acceptable), balanced against cost. AWS Backup centralizes and automates backups across EC2, EBS, RDS, DynamoDB, EFS, FSx, and S3 with policy-driven plans, tag-based assignment, retention, and cross-Region/cross-account copy (Data Lifecycle Manager handles EBS snapshots specifically). Restore methods map to objectives: point-in-time restore gives a very low RPO for databases, snapshot restore recovers to the snapshot's moment (and creates a new RDS instance), and versioning provides continuous, lightweight recovery for S3/FSx. For Region failures, choose among the four DR strategies — Backup & Restore, Pilot Light, Warm Standby, and Active/Active — by matching RTO/RPO and budget, ensuring cross-Region copies exist and restores are tested. Read the objectives first; they drive every choice.

## Examples

**Example 1 — Centralized backups.** A company must back up EC2, RDS, and DynamoDB daily with 35-day retention and a copy in another Region → an **AWS Backup** plan with tag-based assignment and cross-Region copy.

**Example 2 — Low RPO.** A database must lose at most a few seconds of data on recovery → enable **point-in-time restore** (continuous transaction-log backup), not just nightly snapshots.

**Example 3 — Undo a delete.** A user overwrote a critical object → recover the prior version via **S3 versioning**.

**Example 4 — DR for a near-zero RTO.** A revenue-critical app must recover in minutes after a Region failure → a **Warm Standby** (or Active/Active) DR strategy, not Backup & Restore.

## Think About It

A business states an RTO of 15 minutes and an RPO of 5 minutes for a critical database, with a moderate budget. Explain which backup/restore mechanism meets the RPO, which DR strategy is the cheapest that can meet the RTO, and why a nightly-snapshot, restore-from-another-Region approach would fail both objectives.

## Quick Check

1. What do RTO and RPO mean, and how do they drive backup/DR decisions?
2. Which service centralizes and automates backups across many AWS services, and how are resources assigned?
3. Which restore method gives the lowest RPO for a database, and why?
4. Order the four DR strategies from lowest cost/highest RTO to highest cost/lowest RTO.

*Answers: (1) RTO is how quickly you must recover; RPO is how much data loss is acceptable — a tight RPO demands frequent/continuous backups and a tight RTO demands a warmer, faster (costlier) DR strategy; (2) AWS Backup, with resources assigned by tag or selection in a backup plan (plus cross-Region/cross-account copy); (3) point-in-time restore, because RDS/Aurora/DynamoDB continuously back up transaction logs so you can restore to any second within the window, minimizing data loss; (4) Backup & Restore → Pilot Light → Warm Standby → Multi-Site Active/Active.*

## What's Next

Next: **Infrastructure as Code Operations** — provisioning and troubleshooting with CloudFormation, StackSets, and the CDK, plus multi-account/Region deployment.
