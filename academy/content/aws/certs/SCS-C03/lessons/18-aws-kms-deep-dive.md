---
title: "AWS KMS Deep Dive"
type: content
estimated_minutes: 20
cert_tags: ["SCS-C03"]
---

# AWS KMS Deep Dive

## Overview

AWS Key Management Service is the cryptographic foundation of data protection on AWS, and the Security Specialty exam tests it in depth across Domain 5. Nearly every at-rest encryption feature — S3, EBS, RDS, DynamoDB, Secrets Manager — ultimately uses KMS keys, and the exam expects you to understand not just *that* KMS encrypts, but *how access to keys is controlled*, how **key policies, grants, and IAM** interact, what **encryption context** does, how **envelope encryption** works, and when to use **multi-Region keys**. This is the most cryptographically detailed topic on the exam, and getting the access-control model right is essential because a key is only as secure as the policy governing it.

The defining idea is that **controlling the key is controlling the data**. Encryption shifts the security problem from protecting the data to protecting the keys — if anyone who can read an encrypted object can also use the key, you've gained nothing. KMS's power is its fine-grained, auditable key access control: every key has a **key policy** (the root of trust for that key), access can be delegated via **grants** and **IAM policies**, conditions like **encryption context** bind a key's use to a purpose, and every cryptographic operation is logged in CloudTrail. The specialty candidate must reason about "who can use this key, for what, under what conditions" with the same rigor applied to IAM — because separating who can *manage* a key, who can *use* it, and who can *administer* the resource it protects is how you enforce real data protection (including protection from administrators).

This lesson covers KMS key types, the key-access model (key policies, grants, IAM), encryption context, envelope encryption, rotation, and multi-Region keys. After it you will be able to design and reason about KMS key access for any data-protection requirement.

## Core Concepts

### KMS Key Types

KMS keys come in several types the exam distinguishes. **Customer managed keys (CMKs)** are keys you create and control — you set the key policy, enable rotation, and can disable/delete them; use these when you need control over policy, rotation, and auditing. **AWS managed keys** are created and managed by AWS on your behalf for a service (e.g., `aws/s3`), with policies you can't edit and AWS-controlled rotation — convenient but less controllable. **AWS owned keys** are owned and used by AWS across accounts and aren't in your account at all. Keys are also **symmetric** (the default, used for most encryption) or **asymmetric** (public/private key pairs for encryption or signing), and there are **HMAC keys** for message authentication. The exam's recurring guidance: use **customer managed keys** when you need control over key policy, rotation, access, and audit — the default for sensitive or regulated data.

### The Key Access Model: Key Policy, Grants, IAM

Access to a KMS key is governed by up to three mechanisms, and understanding their interaction is the heart of the topic. The **key policy** is the *primary, mandatory* resource policy on the key — it's the root of trust, and unlike most resources, a KMS key must have a key policy, and by default IAM policies alone cannot grant access unless the key policy delegates to IAM (the key policy statement that allows the account's IAM to manage access). **IAM policies** can then grant principals permission to use the key, *but only if the key policy allows IAM to do so*. **Grants** are a more flexible, temporary delegation mechanism — they grant specific principals specific operations (often used by AWS services to use a key on your behalf for a limited scope), can be created and revoked programmatically, and are ideal for least-privilege, short-lived delegations. The exam tests this carefully: a principal can use a key only if the **key policy** allows it (directly or by delegating to IAM) — an IAM policy granting `kms:Decrypt` does nothing if the key policy doesn't permit IAM-based access to that key.

### Separation of Duties on Keys

A powerful KMS pattern the exam rewards is **separating key administration from key usage**. The key policy can grant one set of principals **administrative** permissions (manage the key, edit its policy, enable/disable, schedule deletion — but *not* use it to decrypt) and a different set **usage** permissions (`kms:Encrypt`, `kms:Decrypt`, `kms:GenerateDataKey` — but not manage the key). This means a database administrator can use a key to run an encrypted database without being able to change who else can use it, and a security admin can manage the key without being able to read the data. Combined with denying even the root/account admin direct decrypt where required, KMS enforces protection *from* privileged insiders — a core data-protection objective.

### Encryption Context

**Encryption context** is a set of non-secret key-value pairs passed during encryption that must be provided identically to decrypt — it's cryptographically bound to the ciphertext (as additional authenticated data) and appears in CloudTrail logs. Its uses: it adds an integrity check (decryption fails if the context doesn't match), it enables **fine-grained authorization** (a key policy or grant condition can require a specific encryption context, so a principal can only decrypt data tagged with a particular context — e.g., a specific tenant or purpose), and it improves auditability (the context shows in logs). The exam pairs encryption context with "bind key usage to a specific context/purpose" and "authorize decryption only for a particular context."

### Envelope Encryption and Data Keys

KMS doesn't encrypt large data directly; it uses **envelope encryption**. KMS generates a **data key** (via `GenerateDataKey`): it returns the **plaintext** data key (used locally to encrypt your data) and an **encrypted** copy of that data key (encrypted under your KMS key). You encrypt the data with the plaintext data key, discard the plaintext key from memory, and store the *encrypted* data key alongside the ciphertext. To decrypt, you send the encrypted data key to KMS (`Decrypt`), get back the plaintext data key, and decrypt your data. This is how AWS services encrypt large objects efficiently while the master key never leaves KMS, and how the **AWS Encryption SDK** works client-side. The exam expects you to explain envelope encryption: the KMS key protects data keys, and data keys protect data — so only KMS (and authorized principals) can unwrap the data key needed to read the data.

### Key Rotation

**Key rotation** changes the cryptographic material backing a key while keeping the same key ID and policy. For customer managed symmetric keys, AWS offers **automatic annual rotation** (and now configurable rotation periods), where KMS retains old key versions so existing ciphertext still decrypts. You can also **manually rotate** by creating a new key and re-encrypting (needed for imported key material and where you control the schedule). Rotation limits the blast radius of a key compromise and is often a compliance requirement. The exam tests that automatic rotation is available for customer managed symmetric keys, retains old material for decryption, and that imported-material and asymmetric keys have different rotation handling (typically manual).

### Multi-Region Keys

**Multi-Region keys** are KMS keys with the *same key material and key ID* replicated across multiple Regions, so ciphertext encrypted in one Region can be decrypted in another without a cross-Region KMS call. They solve specific needs: cross-Region disaster recovery, global data replication (DynamoDB global tables, S3 cross-Region replication of encrypted objects), and active-active architectures. Each regional replica has its own independent key policy. The exam pairs "decrypt the same data in multiple Regions / DR / global replication of encrypted data" with multi-Region keys — and notes the trade-off that replicating key material across Regions has a broader trust footprint than single-Region keys.

## Configuration Reference

KMS key types:

```text
Customer managed key   you control policy, rotation, audit — use for sensitive/regulated data
AWS managed key        AWS-managed per-service (aws/<service>), policy not editable
AWS owned key          AWS-owned, cross-account, not in your account
Symmetric / Asymmetric / HMAC   symmetric default; asymmetric for encrypt/sign; HMAC for MAC
```

Key access model (all must align):

```text
Key policy   PRIMARY, mandatory resource policy = root of trust; must allow access
             (incl. delegating to IAM). IAM alone can't grant key use unless key policy allows.
IAM policy   grants principals key permissions — only effective if key policy delegates to IAM
Grants       flexible, revocable, scoped delegation (often for services/short-lived use)
Separation   admin perms (manage key) vs. usage perms (encrypt/decrypt) to different principals
```

Envelope encryption flow:

```text
Encrypt: GenerateDataKey → {plaintext data key, encrypted data key}
         encrypt data with plaintext key locally → discard plaintext key → store encrypted data key
Decrypt: send encrypted data key → KMS Decrypt → plaintext data key → decrypt data
The KMS key never leaves KMS; data keys protect data, KMS key protects data keys.
```

Other:

```text
Encryption context   non-secret K/V bound to ciphertext; required to match for decrypt; enables authz + audit
Rotation             customer managed symmetric: automatic (retains old versions); imported/asym: manual
Multi-Region keys    same key material/ID across Regions; for DR, global replication, active-active
```

## How to Decide

- **Need control over policy, rotation, and audit?** → customer managed key (not AWS managed).
- **Who can use a key?** → governed by the **key policy** first; IAM only works if the key policy delegates to IAM; use **grants** for flexible/temporary delegation.
- **Separate the data admin from key control?** → split admin vs. usage permissions in the key policy.
- **Bind decryption to a purpose/tenant?** → require a specific **encryption context**.
- **Encrypt large data?** → envelope encryption (`GenerateDataKey`), store the encrypted data key.
- **Decrypt the same data in multiple Regions (DR/global)?** → multi-Region keys.

## How This Connects

KMS is the engine beneath the next lesson (encryption at rest and key-material choices — KMS vs. CloudHSM, BYOK, XKS) and the secrets lesson (Secrets Manager uses KMS). Key policies are resource policies, so they obey the IAM policy-evaluation model from Domain 4. Encryption context and grants connect to fine-grained authorization; multi-Region keys connect to DR and backups (Domain 5) and resilience; and KMS key-policy mistakes are a frequent "logging/encryption broke" root cause from Domain 1.

## Exam Traps

- **Assuming IAM alone grants key access.** A KMS key's **key policy** is the root of trust; IAM permissions work only if the key policy delegates to IAM.
- **Not separating admin from usage.** Best practice splits key management from key use so neither role alone can both control and read.
- **Forgetting encryption context must match.** If you encrypt with a context, you must supply the identical context to decrypt.
- **Thinking KMS encrypts large data directly.** It uses envelope encryption — KMS protects data keys, data keys protect data.
- **Using a single-Region key for multi-Region DR.** Cross-Region decryption of the same ciphertext needs multi-Region keys.
- **AWS managed key when control is required.** AWS managed keys can't have edited policies or controlled rotation — use customer managed keys for regulated data.

## Summary

KMS controls the keys that protect nearly all at-rest data on AWS, so controlling key access *is* controlling the data. Use customer managed keys when you need control over policy, rotation, and audit. Access is governed primarily by the **key policy** (the mandatory root of trust), with IAM effective only when the key policy delegates to it, and **grants** for flexible, revocable delegation — and best practice **separates key administration from key usage**. **Encryption context** binds ciphertext to a purpose and enables fine-grained authorization and auditing. KMS uses **envelope encryption**: it generates data keys (returning a plaintext and an encrypted copy) so the KMS key protects data keys while data keys protect the data, and the master key never leaves KMS. Customer managed symmetric keys support automatic rotation that retains old versions, and **multi-Region keys** replicate the same material across Regions for DR, global replication, and active-active designs. Reason about every key as "who can use it, for what, under what context," exactly as you would an IAM policy.

## Examples

**Example 1 — Separation of duties.** Regulators require that database admins can run an encrypted database but cannot change who decrypts it → the **key policy** grants the DBA role usage (`Decrypt`/`GenerateDataKey`) and a separate security role admin permissions.

**Example 2 — Context-bound decryption.** A multi-tenant system must ensure a tenant can only decrypt its own data → require an **encryption context** of `tenant=<id>` and condition the grant/key policy on it.

**Example 3 — Envelope encryption.** An application encrypts large files client-side → it calls **GenerateDataKey**, encrypts locally with the plaintext data key, stores the encrypted data key with the file, and discards the plaintext key.

**Example 4 — Multi-Region DR.** Encrypted DynamoDB global-table data must be readable in two Regions → a **multi-Region key** so the same ciphertext decrypts in both.

## Think About It

A team grants a user `kms:Decrypt` in an IAM policy, but the user still can't decrypt objects protected by a customer managed key. Explain why the IAM grant alone is insufficient, what the key's own policy must contain, and how you would additionally design the key policy so that this user can decrypt data but cannot change who else can.

## Quick Check

1. What is the root of trust for access to a KMS key, and how do IAM policies relate to it?
2. What is envelope encryption, and why does KMS use it?
3. What does encryption context do, and name two of its benefits.
4. When do you need a multi-Region key?

*Answers: (1) the key policy is the primary, mandatory resource policy and root of trust; IAM policies can grant key permissions only if the key policy delegates access to IAM — IAM alone is insufficient; (2) KMS generates a data key (returning a plaintext copy to encrypt data locally and an encrypted copy to store), so the KMS key protects data keys and data keys protect the (large) data, and the KMS key never leaves KMS; (3) non-secret key-value pairs bound to the ciphertext that must match to decrypt — benefits include an integrity check, fine-grained authorization (conditions requiring a specific context), and improved auditability (it appears in CloudTrail); (4) when the same encrypted data must be decrypted in multiple Regions — e.g., cross-Region DR, global replication (DynamoDB global tables, S3 CRR), or active-active architectures.*

## What's Next

Next: **Encryption at Rest and Key Material Choices** — server-side vs. client-side encryption, KMS vs. CloudHSM, and imported key material, BYOK, and external key stores.
