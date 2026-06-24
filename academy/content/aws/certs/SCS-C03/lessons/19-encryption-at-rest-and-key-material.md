---
title: "Encryption at Rest and Key Material Choices"
type: content
estimated_minutes: 19
cert_tags: ["SCS-C03"]
---

# Encryption at Rest and Key Material Choices

## Overview

Encrypting data at rest is table stakes for cloud security, but the Security Specialty exam goes well beyond "turn on encryption." Task 5.2 and 5.3 ask you to *select the appropriate encryption approach and key service* based on specific requirements — server-side versus client-side encryption, KMS versus CloudHSM, and the spectrum of key-material control from AWS-generated keys through **imported key material (BYOK)** to **external key stores (XKS)**. These are decision questions driven by compliance, control, and trust requirements, and the differences are subtle: who generates the key, where it lives, who can use it, and what happens if AWS is removed from the trust equation.

The reason the exam tests this so precisely is that organizations have very different key-control requirements. A standard workload is fine with AWS-managed encryption; a regulated bank may require **FIPS 140-2 Level 3** single-tenant hardware (CloudHSM); a sovereignty-sensitive organization may insist that key material **never enters AWS at all** (external key store). Each requirement maps to a specific AWS capability with specific trade-offs in control, operational burden, and durability responsibility. The specialty candidate must match the requirement to the right encryption type and key service, and understand the responsibility shifts — because with greater key control comes greater responsibility for key availability and durability.

This lesson covers server-side vs. client-side encryption, KMS vs. CloudHSM, the key-material spectrum (AWS-generated, BYOK, XKS), and service-level encryption. After it you will be able to select the correct at-rest encryption approach and key service for any requirement.

## Core Concepts

### Server-Side vs. Client-Side Encryption

The first decision is *where* encryption happens. **Server-side encryption (SSE)** means AWS encrypts the data after receiving it and decrypts it before returning it — the service handles the cryptography, typically using KMS. It's transparent and easy (S3 SSE-KMS, EBS, RDS encryption), and the right default for most workloads. **Client-side encryption** means *you* encrypt the data **before** sending it to AWS, so AWS only ever stores ciphertext and never sees plaintext or your keys — using a toolkit like the **AWS Encryption SDK** or S3 client-side encryption. Client-side is for the strictest requirements where AWS must never have access to plaintext, at the cost of managing the encryption in your application. The exam pairs "AWS must never see plaintext / end-to-end encryption controlled by us" with client-side encryption, and "transparent, managed at-rest encryption" with server-side.

### S3 Encryption Options Specifically

S3 deserves special attention because the exam tests its options precisely: **SSE-S3** (S3-managed keys, AES-256, simplest), **SSE-KMS** (KMS customer managed or AWS managed keys, adds key access control, audit via CloudTrail, and the option of **S3 Bucket Keys** to reduce KMS cost/calls), **SSE-C** (you supply the encryption key with each request; AWS uses it but doesn't store it), and **client-side encryption** (you encrypt before upload). Choose SSE-KMS with a customer managed key when you need control, auditing, and per-key access policies; SSE-C when you must provide your own keys per request but still want server-side encryption; client-side when AWS must never have the plaintext or keys. The exam distinguishes these by who holds/manages the key and whether AWS sees plaintext.

### KMS vs. CloudHSM

The key-storage decision pits convenience against control. **AWS KMS** is a managed, multi-tenant key service (backed by FIPS 140-validated HSMs) — easy, integrated with dozens of services, and sufficient for most needs. **AWS CloudHSM** is a **single-tenant, dedicated hardware security module** that *you* control, providing **FIPS 140-2 Level 3**, where you manage users and keys directly and AWS has no access to your keys. Choose CloudHSM when a requirement demands single-tenant HSMs, FIPS 140-2 Level 3, full customer control of the HSM, or specific cryptographic operations KMS doesn't offer (certain PKCS#11/JCE workloads, custom crypto). KMS can even use CloudHSM as a **custom key store** (KMS-managed convenience with keys in your CloudHSM cluster). The exam pairs "single-tenant, FIPS 140-2 Level 3, we control the HSM" with CloudHSM and "managed, integrated, simple" with KMS.

### The Key-Material Spectrum: AWS-Generated, BYOK, XKS

A central specialty topic is *where the key material comes from and lives*, on a spectrum of increasing customer control:

- **AWS-generated key material** (default): AWS KMS creates, stores, and rotates the key material. AWS is responsible for its durability and availability. Lowest burden, suitable for most cases.
- **Imported key material (BYOK — Bring Your Own Key)**: you generate the key material yourself and **import** it into a KMS key. AWS KMS then performs cryptographic operations using it, but **you are responsible for the original copy's durability** (KMS keeps a working copy available while you need it), automatic rotation isn't available (you re-import to rotate), and there's a dedicated delete API. Use BYOK when policy requires that *you* generate the key material or retain the authoritative copy.
- **External key store (XKS — "Hold Your Own Keys")**: your key material **never enters AWS at all** — it stays in **your external key manager** outside AWS, and KMS calls your **XKS proxy** in real time for every cryptographic operation (double encryption: AWS material plus your external key). Use XKS for strict sovereignty/regulatory requirements that mandate key material remain outside AWS and under your sole control. The trade-off is operational complexity and that the external key manager's availability becomes critical — if it's unreachable, encryption/decryption stops.

The exam tests distinguishing these: BYOK = your key material *inside* KMS (you generated and imported it); XKS = your key material *outside* AWS entirely (KMS orchestrates but never holds it). The further right you go, the more control and the more responsibility for availability and durability you assume.

### Service-Level Encryption at Rest

Most AWS storage and database services offer at-rest encryption integrated with KMS, and the exam expects you to know it's available and how it's keyed: **S3** (SSE options above), **EBS** (volume encryption with KMS; snapshots inherit encryption), **RDS/Aurora** (storage encryption at creation, with the key chosen then — note you generally must encrypt at creation and can't toggle it on an existing unencrypted instance without a snapshot/copy), **DynamoDB** (encrypted at rest by default), **EFS/FSx**, **Redshift**, and more. The recurring exam nuances: encryption is often **set at creation** (you can't simply flip it on later — you re-create or copy with encryption), and choosing a **customer managed key** gives you access control and auditing over the service's encryption.

### Responsibility Shifts with Control

A theme worth internalizing: as you move from AWS-managed keys → customer managed keys → BYOK → CloudHSM/XKS, you gain control but assume more responsibility — for key policies, rotation, and crucially **availability and durability**. Lose imported key material with no backup, and the data it protects is unrecoverable; an unreachable external key store halts cryptographic operations. The exam expects you to weigh this trade-off: choose the least-control option that meets the requirement, because more control means more operational risk you must manage.

## Configuration Reference

Where encryption happens:

```text
Server-side (SSE)   AWS encrypts after receipt (transparent) — default; S3/EBS/RDS via KMS
Client-side         you encrypt before sending — AWS never sees plaintext/keys (AWS Encryption SDK)
```

S3 options:

```text
SSE-S3   S3-managed keys (AES-256), simplest
SSE-KMS  KMS keys — access control + audit; S3 Bucket Keys cut KMS cost
SSE-C    you supply the key per request; AWS uses but doesn't store it
Client-side  you encrypt before upload; AWS stores ciphertext only
```

Key service and key-material spectrum:

```text
KMS         managed, multi-tenant, integrated — most workloads
CloudHSM    single-tenant, FIPS 140-2 Level 3, you control the HSM
AWS-generated   AWS creates/stores/rotates (lowest burden)
BYOK (imported) you generate + import into KMS; you own durability; manual rotation
XKS (external)  key material stays OUTSIDE AWS in your key manager; KMS calls XKS proxy per op
More control → more responsibility (availability/durability)
```

## How to Decide

- **Transparent, managed at-rest encryption?** → server-side (SSE-KMS with a customer managed key for control/audit).
- **AWS must never see plaintext or keys?** → client-side encryption (AWS Encryption SDK).
- **Single-tenant HSM / FIPS 140-2 Level 3 / full HSM control?** → CloudHSM (or KMS custom key store on CloudHSM).
- **Policy requires you to generate/own the key material, kept inside KMS?** → imported key material (BYOK).
- **Key material must never enter AWS (sovereignty)?** → external key store (XKS).
- **Default sensitive workload?** → KMS customer managed key — least burden that still gives control and audit.

## How This Connects

This lesson builds directly on the KMS deep dive (envelope encryption, key policies, customer managed keys) and the data-in-transit lesson (the other half of encryption). CloudHSM and Private CA connect to the certificate/secrets material; the responsibility-shift theme connects to backups and durability (next lesson); and key-material choices connect to compliance and sovereignty requirements in Governance (Domain 6).

## Exam Traps

- **Confusing BYOK and XKS.** BYOK imports your key material *into* KMS; XKS keeps key material *outside* AWS in your own key manager (KMS never holds it).
- **Choosing CloudHSM when KMS suffices.** CloudHSM is for single-tenant/FIPS 140-2 Level 3/full-control requirements; otherwise KMS is simpler and integrated.
- **Forgetting durability responsibility.** With imported key material you must safeguard the original copy; with XKS the external manager's availability is critical.
- **Assuming you can toggle encryption on later.** Many services (e.g., RDS) require encryption at creation; enabling it on existing data means snapshot/copy/re-create.
- **Server-side when client-side is required.** "AWS must never see plaintext" mandates client-side encryption, not SSE.
- **SSE-C vs. SSE-KMS confusion.** SSE-C: you supply the key each request (AWS doesn't store it); SSE-KMS: KMS holds/controls the key with audit and access policy.

## Summary

Selecting at-rest encryption is a series of requirement-driven choices. Decide *where* encryption happens — server-side (transparent, KMS-backed, the default) or client-side (you encrypt first so AWS never sees plaintext, for the strictest needs). For S3 specifically, choose among SSE-S3, SSE-KMS (control + audit), SSE-C (you supply keys), and client-side. Choose the key service by control needs: KMS for managed, integrated encryption; CloudHSM for single-tenant, FIPS 140-2 Level 3, customer-controlled HSMs. Then choose key-material control along a spectrum: AWS-generated (lowest burden), imported key material/BYOK (you generate and import into KMS, owning the original's durability), or external key store/XKS (key material never enters AWS; KMS calls your external proxy per operation). Most services encrypt at rest via KMS, often set at creation. The unifying rule: more key control means more responsibility for availability and durability, so choose the least-control option that satisfies the requirement.

## Examples

**Example 1 — Sovereignty.** Regulation requires that key material never reside in AWS → an **external key store (XKS)** with the keys in the organization's own key manager.

**Example 2 — FIPS 140-2 Level 3.** A requirement mandates single-tenant HSMs under the customer's control → **CloudHSM** (optionally as a KMS custom key store).

**Example 3 — Own the key material, inside KMS.** Policy says the customer must generate the key but can keep it in KMS → **imported key material (BYOK)**, with the customer safeguarding the original copy.

**Example 4 — No plaintext to AWS.** Highly sensitive records must be encrypted such that AWS never sees plaintext → **client-side encryption** with the AWS Encryption SDK before upload.

## Think About It

Two requirements sound similar but lead to different services: (a) "we must generate and own our encryption key material," and (b) "our key material must never exist inside AWS." Explain why (a) points to imported key material (BYOK) while (b) points to an external key store (XKS), and describe the new operational responsibility each choice places on the customer.

## Quick Check

1. What is the difference between server-side and client-side encryption, and when must you use client-side?
2. When would you choose AWS CloudHSM over AWS KMS?
3. How does imported key material (BYOK) differ from an external key store (XKS)?
4. What responsibility do you take on as you move toward more key control?

*Answers: (1) server-side encryption has AWS encrypt/decrypt the data (transparent, KMS-backed), while client-side encryption has you encrypt before sending so AWS only stores ciphertext and never sees plaintext or keys — use client-side when AWS must never have access to plaintext; (2) when you need single-tenant dedicated HSMs, FIPS 140-2 Level 3, full customer control of the HSM, or specific cryptographic operations KMS doesn't provide; (3) BYOK imports your own key material into a KMS key (AWS performs operations with it and you own the original copy's durability), while XKS keeps key material entirely outside AWS in your external key manager and KMS calls your XKS proxy for each operation — the material never enters AWS; (4) greater responsibility for key policy, rotation, and especially the availability and durability of the key material (losing imported material or an unreachable external store can make data unrecoverable or halt operations).*

## What's Next

Next: **Data Integrity, Lifecycle, and Resilient Backups** — Object Lock and Vault Lock (WORM), versioning, lifecycle/retention, AWS Backup, and ransomware-resistant backup design.
