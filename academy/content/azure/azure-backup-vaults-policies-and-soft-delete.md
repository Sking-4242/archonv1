---
title: "Azure Backup: Vaults, Policies, and Soft Delete"
type: content
estimated_minutes: 12
cert_tags: ["az_104", "az_305"]
---

# Azure Backup: Vaults, Policies, and Soft Delete

## Overview

A storage snapshot is not a backup. If you take a snapshot of a VM's Managed Disk, that snapshot lives in the same storage account as the disk. If a malicious actor gains Owner access to your subscription and deletes the Storage Account, the disk and the snapshot are destroyed simultaneously.

True backups must be decoupled from the source infrastructure. **Azure Backup** is a managed service that backs up data to a secure, isolated vault. It supports Azure VMs, on-premises servers, SQL databases, and Azure File shares.

## The Vaults: Recovery Services vs. Backup Vaults

To use Azure Backup, you must first create a vault. Azure currently has two distinct vault types. Knowing which to use is critical for the AZ-104:

**1. Recovery Services Vault (The Standard)**
* The legacy, fully-featured vault. 
* *Use Case:* Used to back up Azure VMs, SQL Server running inside VMs, Azure Files, and on-premises physical servers using the Microsoft Azure Recovery Services (MARS) agent. It is also the vault used for Azure Site Recovery (ASR).

**2. Backup Vault (The Modern, Specialized Vault)**
* A newer vault type designed for modern PaaS workloads.
* *Use Case:* Used to back up Azure Database for PostgreSQL, Azure Disks (independently of the VM), and Azure Blob Storage.

## Backup Policies

You do not manually click "Backup" every day. You create a **Backup Policy** and attach resources to it. A policy defines two things:
1. **Schedule:** When the backup occurs (e.g., daily at 2:00 AM).
2. **Retention:** How long the backup is kept. Azure Backup utilizes the Grandfather-Father-Son (GFS) retention scheme. You can specify:
   * Keep daily backups for 30 days.
   * Keep weekly backups for 52 weeks.
   * Keep monthly backups for 60 months.
   * Keep yearly backups for 10 years (crucial for legal compliance).

## Defending Against Ransomware (Crucial for Security/Architecture)

A modern ransomware attack does not just encrypt your production servers; it actively seeks out your backup infrastructure and deletes your historical backups, forcing you to pay the ransom. Azure Backup provides two critical mechanisms to defeat this:

**1. Soft Delete (The 14-Day Safety Net)**
Soft Delete is enabled by default. If a hacker gains administrative access and issues a command to delete all backups inside the Recovery Services Vault, Azure intercepts the command. The backups are moved to a "Soft Deleted" state for 14 days. During this window, the data is completely recoverable. The hacker cannot bypass this waiting period.

**2. Multi-User Authorization (MUA)**
What if the hacker disables Soft Delete *before* deleting the backups? MUA prevents this. 
When MUA is enabled, any destructive action on the vault (disabling soft delete, deleting a backup, lowering retention policies) requires a **Resource Guard**. 
A Resource Guard is a separate Azure resource that should be placed in a completely different subscription owned by the Security Team. To delete a backup, the backup administrator must request temporary Just-In-Time (JIT) access to the Resource Guard from the Security Team. One compromised account is no longer enough to destroy the backups.

## Summary

Azure Backup isolates historical data from production infrastructure to satisfy RPO requirements. It utilizes Recovery Services Vaults for VMs/on-prem and Backup Vaults for modern PaaS. Backups are automated via Backup Policies using GFS retention. To protect the organization against catastrophic ransomware events, architects must ensure Soft Delete is active and implement Multi-User Authorization (MUA) to require multiple human approvals before any destructive action can occur.

## What's Next

Backups satisfy RPO, but restoring a multi-terabyte database from a vault can take hours, violating strict RTO requirements. To achieve rapid recovery, we must use continuous replication. Next, we explore Azure Site Recovery (ASR).