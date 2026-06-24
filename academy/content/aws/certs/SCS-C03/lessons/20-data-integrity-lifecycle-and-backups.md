---
title: "Data Integrity, Lifecycle, and Resilient Backups"
type: content
estimated_minutes: 17
cert_tags: ["SCS-C03"]
---

# Data Integrity, Lifecycle, and Resilient Backups

## Overview

Confidentiality (encryption) is only one pillar of data protection; the Security Specialty exam equally tests **integrity** and **availability** — ensuring data cannot be tampered with or maliciously deleted, is retained and expired according to policy, and can be recovered after an incident. Task 5.2 covers protecting data integrity, automatic lifecycle and retention, and secure, resilient backup and replication — including explicit mention of **ransomware protection**. These are design questions about immutability (WORM), retention controls, and backups that survive an attacker who has gained significant access.

The principle that ties this together is **immutability and recoverability against a capable adversary**. Modern threats — especially ransomware — don't just encrypt your data; they try to delete your backups and disable your recovery options first. So the specialty discipline designs controls that *even a privileged or compromised account cannot bypass*: write-once-read-many (WORM) locks that prevent deletion for a retention period, backup vaults that can't be deleted, versioning and MFA-delete that defeat silent overwrites, and isolated, immutable backup copies. The exam rewards designs where recovery is guaranteed because the protective controls cannot be turned off by the attacker, and where data lifecycle (retention and expiration) is enforced automatically and provably.

This lesson covers data-integrity controls (Object Lock, Glacier Vault Lock, versioning), lifecycle and retention, and resilient, ransomware-resistant backups. After it you will be able to design immutable, recoverable, policy-governed data protection.

## Core Concepts

### Versioning and MFA Delete

**S3 versioning** keeps every version of an object, so an overwrite or delete creates a new version rather than destroying data — you can recover prior versions and a delete just adds a "delete marker." Versioning is the foundation for recovering from accidental or malicious overwrites. **MFA Delete** strengthens this by requiring MFA to permanently delete object versions or change the versioning state, so an attacker with normal credentials cannot wipe version history. The exam pairs "recover from overwrite/deletion" with versioning and "prevent permanent deletion without strong authentication" with MFA Delete.

### S3 Object Lock — WORM for Objects

**S3 Object Lock** enforces **write-once-read-many (WORM)**: an object version cannot be overwritten or deleted for a defined period or indefinitely. It has two retention modes the exam distinguishes sharply. **Governance mode** prevents most users from deleting, but principals with a special permission can override/shorten it — suitable for internal policy enforcement. **Compliance mode** is absolute: **no one, not even the root user, can delete or shorten the retention** until it expires — suitable for regulatory immutability and ransomware protection. Object Lock also offers **legal holds** (indefinite protection independent of a retention period). The key exam point: **compliance mode is the truly immutable option** that even root cannot bypass, making it the answer for "ensure data cannot be deleted by anyone, including a compromised admin, for X years."

### S3 Glacier Vault Lock

**S3 Glacier Vault Lock** applies a similar immutable WORM control to Glacier vaults via a **vault lock policy** that, once locked, **cannot be changed** — enforcing retention and compliance controls (e.g., "retain for 7 years, deny deletes") that are irreversible even by the account owner. It's used for long-term, compliance-grade archival where the retention policy itself must be tamper-proof. The exam pairs "lock an archival retention policy so it can never be weakened" with Glacier Vault Lock.

### Lifecycle and Retention Management

Data protection includes **expiring** data per policy as well as retaining it. **S3 Lifecycle policies** automatically transition objects to cheaper storage classes and **expire** (delete) them after defined periods, enforcing retention/disposal requirements at scale. **EFS lifecycle management** moves files to infrequent-access tiers; **FSx** and other services have their own retention/backup policies. The security relevance: lifecycle policies enforce **data minimization** and retention compliance (don't keep data longer than allowed, and do keep it as long as required), and combined with Object Lock they balance "retain immutably for N years, then dispose." The exam tests using lifecycle for automatic retention/disposal and recognizing the interplay with Object Lock retention.

### AWS Backup and Backup Vault Lock

**AWS Backup** centrally manages and automates backups across many services (EBS, RDS, DynamoDB, EFS, S3, and more) with backup plans, schedules, and retention. Its critical security feature is **AWS Backup Vault Lock**, which makes backups **immutable and undeletable** for their retention period — in **compliance mode**, even the root user and AWS cannot delete the backups or shorten retention. This is the backbone of ransomware-resistant backup: an attacker who compromises the account still cannot destroy locked backups. AWS Backup also supports **cross-Region and cross-account copy**, so backups live in a separate account/Region the attacker doesn't control. The exam pairs "centralized, immutable, ransomware-resistant backups" with AWS Backup + Vault Lock + cross-account copy.

### Resilient, Ransomware-Resistant Backup Design

The exam explicitly names **ransomware protection**, and the design pattern combines several controls: **immutable backups** (Backup Vault Lock / Object Lock compliance mode) so they can't be deleted or encrypted by the attacker; **isolation** (copy backups to a separate, locked-down account and Region — a "backup vault account" the production account can't delete from); **least privilege** on backup operations and the vault; **encryption** of backups; and **regular restore testing** to prove recoverability. The principle: assume the attacker gains admin in the production account, and ensure the backups still survive in an isolated, immutable store. The exam rewards designs that separate and lock backups rather than relying on the same account's standard snapshots.

### Other Replication and Transfer Controls

Data protection also covers secure **replication** and **transfer**: **Amazon Data Lifecycle Manager (DLM)** automates EBS snapshot creation, retention, and cross-account/Region copy; **S3 Replication** (cross-Region/same-Region, including replicating to a different account) maintains copies for resilience and can replicate to an immutable destination; and **AWS DataSync** securely transfers large data sets between on-premises and AWS (or between AWS storage) with encryption and integrity validation. These support backup, DR, and compliance copies. The exam references DLM, AWS Backup, and DataSync as the automation tools for resilient, scheduled data copies.

### Governing and Auditing Backups Centrally

In a multi-account organization, backup protection must be governed and proven, not left to each account. **AWS Backup** supports **organization-wide backup policies** (managed through AWS Organizations) that centrally enforce backup plans, retention, and Vault Lock across all accounts, so no account can simply opt out of protection. **AWS Backup Audit Manager** continuously evaluates whether backups meet defined controls — for example, "every production resource is backed up daily and retained 35 days, in a locked vault" — and reports non-compliance, producing audit-ready evidence. This addresses a subtle gap: having backups isn't enough; you must demonstrate that the *right* resources are backed up, immutably, everywhere. The exam rewards designs that centralize backup policy across the organization and continuously audit compliance, tying data resilience to the governance domain rather than treating it as a per-account afterthought. Combined with cross-account isolation and Vault Lock, central backup governance ensures organization-wide, provable recoverability.

## Configuration Reference

Integrity and immutability controls:

```text
S3 Versioning          keep all versions; recover overwrites/deletes (delete markers)
MFA Delete             require MFA to permanently delete versions / change versioning
S3 Object Lock — Governance  most users can't delete; special perm can override
S3 Object Lock — Compliance  NO ONE (incl. root) can delete/shorten until expiry (true WORM)
S3 Object Lock — Legal Hold  indefinite hold, independent of retention period
Glacier Vault Lock     locked vault policy that can't be changed (irreversible retention)
```

Lifecycle, backup, and resilience:

```text
S3 Lifecycle           auto-transition + auto-expire (retention/disposal at scale)
AWS Backup             centralized, scheduled backups across services
AWS Backup Vault Lock  immutable/undeletable backups (compliance mode = even root can't delete)
Cross-account/Region copy  isolate backups from the production account (ransomware resilience)
Data Lifecycle Manager EBS snapshot automation + cross-acct/Region copy
S3 Replication / DataSync  resilient copies / secure bulk transfer
```

Ransomware-resistant backup pattern:

```text
immutable (Vault Lock / Object Lock compliance) + isolated (separate locked account/Region)
+ least privilege on vault + encrypted + tested restores
→ backups survive even if the production account is fully compromised
```

## How to Decide

- **Recover from accidental/malicious overwrite or delete?** → S3 versioning (+ MFA Delete to block permanent deletion).
- **Make data undeletable by anyone, including root, for N years?** → S3 Object Lock **compliance mode** (or Glacier Vault Lock for archival policy).
- **Allow internal overrides but block normal deletes?** → Object Lock **governance mode**.
- **Auto-retain then dispose per policy?** → S3 Lifecycle (with Object Lock for the immutable retention portion).
- **Ransomware-resistant backups?** → AWS Backup + **Vault Lock (compliance)** + **cross-account/Region copy** + tested restores.
- **Automate EBS snapshots / bulk transfer?** → Data Lifecycle Manager / DataSync.

## How This Connects

This lesson extends Data Protection from confidentiality (encryption) to integrity and availability, and it directly supports Incident Response recovery (clean, immutable backups are what you restore from). Immutability via compliance mode connects to the policy-evaluation "even root can be denied" theme (Domain 4) and to governance/compliance retention requirements (Domain 6). Cross-account backup isolation connects to multi-account governance and blast-radius minimization.

## Exam Traps

- **Confusing Object Lock governance and compliance modes.** Governance allows privileged override; compliance is absolute — not even root can delete until expiry.
- **Relying on same-account snapshots for ransomware.** A compromised account can delete normal snapshots; use immutable, isolated backups (Vault Lock + cross-account).
- **Versioning without MFA Delete.** Versioning alone can be undone by an attacker with delete permissions; MFA Delete blocks permanent deletion.
- **Forgetting backups must be tested.** Immutable backups are worthless if restores were never validated.
- **Thinking lifecycle expiration is a security weakness.** Properly used, lifecycle enforces retention/disposal compliance and data minimization.
- **Leaving backups in the production account only.** Isolate copies to a separate, locked-down account/Region.

## Summary

Beyond encryption, data protection demands integrity and recoverability against capable attackers. S3 versioning (with MFA Delete) recovers overwrites and deletions; S3 Object Lock enforces WORM, with governance mode allowing privileged override and **compliance mode making data undeletable by anyone, including root**, until expiry; Glacier Vault Lock makes an archival retention policy irreversible. S3 Lifecycle automates retention and disposal. For backups, AWS Backup centralizes them and **Backup Vault Lock** makes them immutable, while **cross-account and cross-Region copies** isolate them from a compromised production account — the core of ransomware-resistant design, completed by least privilege, encryption, and tested restores. Data Lifecycle Manager, S3 Replication, and DataSync automate resilient copies and transfers. The throughline: design protective controls an attacker who gains admin still cannot bypass, so recovery is guaranteed.

## Examples

**Example 1 — Immutable compliance.** Regulation requires records be undeletable for seven years, even by administrators → **S3 Object Lock compliance mode** (or Glacier Vault Lock) with a 7-year retention.

**Example 2 — Ransomware resilience.** A company must guarantee recovery even if attackers gain account admin → **AWS Backup with Vault Lock (compliance)** copying backups to an isolated, locked-down account in another Region, with regular restore tests.

**Example 3 — Overwrite recovery.** Protect against malicious object overwrites → **S3 versioning** plus **MFA Delete** so versions can't be permanently removed without MFA.

**Example 4 — Retention + disposal.** Keep logs immutably for one year then delete → **Object Lock** for the retention period combined with an **S3 Lifecycle** expiration.

## Think About It

A team believes their nightly EBS and RDS snapshots protect them from ransomware. Explain why standard snapshots in the same account may not survive an attacker who gains administrative access, and redesign the backup strategy using immutability and isolation so that recovery is guaranteed even under full account compromise.

## Quick Check

1. What is the difference between S3 Object Lock governance mode and compliance mode?
2. How does versioning plus MFA Delete protect against malicious deletion?
3. What makes AWS Backup with Vault Lock suitable for ransomware resilience, and what should you add?
4. How do lifecycle policies contribute to data protection?

*Answers: (1) governance mode prevents deletion by most users but lets principals with a special permission override or shorten retention, while compliance mode is absolute — no one, including the root user, can delete or shorten retention until it expires (true WORM); (2) versioning preserves prior object versions so overwrites/deletes are recoverable, and MFA Delete requires MFA to permanently delete versions or change versioning state, so normal credentials can't wipe history; (3) Vault Lock (compliance mode) makes backups immutable and undeletable even by root, so a compromised account can't destroy them — add cross-account/cross-Region copies for isolation, least privilege, encryption, and tested restores; (4) they automatically enforce retention and disposal (data minimization and compliance), and combined with Object Lock they balance immutable retention with eventual deletion.*

## What's Next

Next: **Secrets Management and Data Masking** — Secrets Manager rotation, Parameter Store, and masking sensitive data in logs and messages.
