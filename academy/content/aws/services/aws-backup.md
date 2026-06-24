---
title: "AWS Backup"
type: content
estimated_minutes: 15
cert_tags: ["SAA-C03", "SOA-C03", "SCS-C03"]
---

# AWS Backup

## Overview

AWS Backup is a fully managed, **centralized backup service** that automates and consolidates data protection across many AWS services — EBS, EC2, RDS/Aurora, DynamoDB, EFS, FSx, Storage Gateway, S3, and more — from a single place. Instead of configuring and tracking backups service-by-service, you define **backup plans** and **policies** that apply consistently across your resources and accounts. This *service reference* lesson covers backup plans and vaults, cross-Region/account copy, immutability, compliance, and what each certification expects.

AWS Backup matters because data protection is only as good as its consistency and coverage: ad-hoc, per-service backups lead to gaps, untested recovery, and no central proof of compliance. AWS Backup centralizes scheduling, retention, encryption, monitoring, and cross-Region/cross-account copies, and adds **immutability** and governance controls that are essential for ransomware resilience and audit. The core mental model is a **backup plan** (schedules + retention + lifecycle + copy rules) applied to resources (selected directly or by **tags**), storing recovery points in a **backup vault**, optionally locked for immutability and copied to other Regions/accounts for DR.

---

## How It Works

- **Backup plan** — defines **rules**: when to back up (schedule), how long to keep recovery points (**retention**), lifecycle transitions to cold storage, and **copy actions** to other Regions or accounts. Resources are assigned to a plan **directly or by tag**, so new tagged resources are protected automatically.
- **Backup vault** — the encrypted (KMS) container where **recovery points** are stored. **Vault Lock** can make backups **immutable** (WORM) in compliance mode so they cannot be deleted or shortened — even by an administrator — for a defined period, which is central to ransomware resilience.
- **Cross-Region and cross-account copy** — replicate recovery points to another Region (for DR) and to a separate, locked-down backup account (so a compromised production account can't destroy its backups).
- **Restore** — recover a resource from a recovery point; backups are only as good as tested restores.

Across an organization, **AWS Backup** integrates with **Organizations** to apply **backup policies** centrally and report on compliance.

---

## Key Features

- **Centralized, policy-based backups** across many services from one console/API.
- **Tag-based resource selection** so protection scales automatically with new resources.
- **Cross-Region and cross-account copy** for DR and isolation from a compromised account.
- **Backup Vault Lock** for immutable (WORM) recovery points — ransomware/insider resilience.
- **AWS Backup Audit Manager** to monitor and report backup compliance against your policies.
- **KMS encryption** of vaults and **organization-wide policies** via AWS Organizations.

---

## Configuration Reference

- **Create a backup plan** with schedule, retention, lifecycle, and **cross-Region/account copy** rules; assign resources by **tag** for automatic coverage.
- **Use a separate, locked-down backup account** and copy critical recovery points there; enable **Vault Lock** (compliance mode) for immutability.
- **Encrypt vaults with KMS**, and apply **organization backup policies** for consistency across accounts.
- **Use Backup Audit Manager** to prove compliance and catch unprotected resources.

---

## Operations and Troubleshooting

- **A resource isn't being backed up.** Check that it matches the plan's **resource assignment** (tag/selection) and that the service is supported; use Audit Manager to find unprotected resources.
- **Can't meet RPO/RTO.** Adjust backup **frequency** (RPO) and test **restore** times (RTO); cross-Region copies support regional DR.
- **Ransomware concern.** Enable **Vault Lock** immutability and **cross-account copy** so backups survive a compromised production account.
- **Restore validation.** Periodically perform test restores — an untested backup is not a reliable recovery.

---

## Integrations

AWS Backup protects **EBS/EC2**, **RDS/Aurora**, **DynamoDB**, **EFS/FSx**, **Storage Gateway**, **S3**, and more; encrypts vaults with **KMS**; copies across Regions and **accounts** (via AWS Organizations); reports compliance with **Backup Audit Manager**; and integrates with **EventBridge/SNS** for job notifications. It complements service-native snapshots (EBS snapshots, RDS automated backups) by **centralizing and governing** them, and pairs with **S3 Object Lock** and **Vault Lock** for immutable, ransomware-resistant data protection.

---

## Pricing and Cost Considerations

AWS Backup charges for **backup storage** consumed (per GB-month, varying by warm vs. cold storage and by service), **restore** operations (for some services), and **cross-Region/cross-account copy** data transfer and storage. Because copies and long retention multiply storage, the cost levers are right-sizing **retention** and lifecycle to cold storage, scoping cross-Region/account copies to truly critical data, and avoiding redundant backups where service-native ones already suffice. Immutability and DR copies add cost but are often required for compliance/resilience. Exact prices vary by service and Region.

---

## Exam Relevance

**SAA-C03:** Know AWS Backup as centralized, policy/tag-based backup across services with cross-Region/account copy for DR, and how it relates to service-native snapshots. Design depth.

**SOA-C03:** Operate backups — backup plans, schedules/retention, cross-Region copy, restore testing, and Audit Manager compliance. Operations depth (the backup/DR domain).

**SCS-C03:** Secure backups — KMS encryption, **Vault Lock** immutability and **cross-account copy** for ransomware resilience, and org-wide backup policies for governance. Security depth (data integrity/resilient backups).

---

## Summary

AWS Backup centralizes and automates data protection across EBS/EC2, RDS/Aurora, DynamoDB, EFS/FSx, Storage Gateway, S3, and more through **backup plans** (schedule, retention, lifecycle, and cross-Region/account copy rules) that select resources by **tag**, storing **recovery points** in KMS-encrypted **vaults**. **Vault Lock** makes backups immutable (WORM) and **cross-account copy** isolates them from a compromised production account — the core of ransomware-resistant backups — while **Backup Audit Manager** and **Organizations** policies provide governance and proof of compliance. The recurring exam points are centralized tag-based backup, cross-Region/account copy for DR and isolation, and Vault Lock immutability.

---

## Quick Check

1. What problem does AWS Backup solve compared with configuring backups service-by-service?
2. How does tag-based resource selection keep new resources protected automatically?
3. Why copy recovery points to a separate, locked-down backup account, and what makes them immutable?
4. Which feature helps you prove backup compliance and find unprotected resources?
5. What two things must you tune to meet a target RPO and RTO?

---

## What's Next

Pair this with **Amazon EBS** (snapshots), **Amazon RDS/Aurora** (database backups), **AWS KMS** (vault encryption), and **Amazon S3** Object Lock. See the SCS-C03 data-integrity/resilient-backups and SOA-C03 backup-and-DR lessons.
