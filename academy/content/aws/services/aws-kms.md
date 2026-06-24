---
title: "AWS Key Management Service (KMS)"
type: content
estimated_minutes: 20
cert_tags: ["SCS-C03", "SOA-C03", "SAA-C03", "CLF-C02", "AIF-C01"]
---

# AWS Key Management Service (KMS)

## Overview

AWS Key Management Service (KMS) is the managed service for **creating and controlling the cryptographic keys** used to encrypt data across AWS. Nearly every AWS service that encrypts data at rest — S3, EBS, RDS, DynamoDB, and dozens more — does so with a KMS key, and KMS centralizes the creation, permissions, rotation, auditing, and lifecycle of those keys. This is a *service reference* lesson covering key types, the envelope-encryption model, how access to keys is controlled, rotation and multi-Region keys, and what each certification expects. (For exam-decision depth on choosing between encryption strategies, the SCS-C03 path also has a dedicated KMS deep-dive lesson; this lesson is the service reference those decisions build on.)

KMS matters because encryption is only as strong as the control over its keys. Encrypting data is easy; the hard part is managing who can use the keys, proving when they were used, rotating them safely, and integrating them with every service that needs them. KMS solves this by keeping key material inside **FIPS 140-validated hardware security modules (HSMs)** that never expose the plaintext key, exposing only cryptographic *operations* through an API, and governing every operation with fine-grained policy and full CloudTrail auditing.

The concept that unlocks KMS is **envelope encryption**: KMS rarely encrypts your bulk data directly. Instead it protects small **data keys**, and those data keys encrypt your data. Understanding that two-level model explains almost everything else about how KMS is used and priced.

---

## How It Works

A **KMS key** (the resource formerly called a customer master key, or CMK) is a logical key whose cryptographic material lives in KMS HSMs. KMS keys come in several types:

- **Symmetric keys** (AES-256) — the default and most common, used for encrypt/decrypt. The key material never leaves KMS; you send data (or a data key) to KMS and get back ciphertext or plaintext.
- **Asymmetric keys** (RSA or elliptic-curve) — a public/private key pair for **encrypt/decrypt** or **sign/verify**, useful when a party outside AWS needs the public key.
- **HMAC keys** — for generating and verifying message authentication codes.

Keys are also categorized by who manages them:

- **Customer managed keys** — you create and fully control them (policies, rotation, enabling/disabling, deletion). Maximum control.
- **AWS managed keys** — created on your behalf by an integrated service (named like `aws/s3`); you can view usage but not change their policy; they rotate automatically.
- **AWS owned keys** — owned and managed entirely by AWS, not visible in your account.

**Envelope encryption** is the operational heart of KMS. To encrypt a large object, a service calls `GenerateDataKey`, which returns a **plaintext data key** and an **encrypted copy** of that data key (encrypted under your KMS key). The service encrypts the data with the plaintext data key, discards the plaintext key from memory, and stores the encrypted data key alongside the ciphertext. To decrypt, it sends the encrypted data key to KMS, which returns the plaintext data key, which decrypts the data. This is why KMS scales: it only ever handles small keys, not your bulk data, and the direct `Encrypt` API is limited to about 4 KB.

**Key material origin** can also vary: AWS-generated (default), **imported** key material (BYOK), an **AWS CloudHSM-backed custom key store**, or an **external key store (XKS)** where key material lives in a key manager outside AWS — for the strongest control-and-residency requirements.

---

## Key Features

- **Key policies, grants, and encryption context.** Access to a key is governed by a **key policy** (a resource-based policy that is the primary control), optionally combined with IAM policies and **grants** (temporary, programmatic delegations of specific operations). **Encryption context** is additional authenticated data (AAD) — key/value pairs bound to an encryption operation that must match on decryption, providing tamper-evidence and a powerful policy condition.
- **Automatic and on-demand rotation.** Customer managed symmetric keys support automatic rotation of the underlying material (annually by default, with a configurable period) and **on-demand rotation**; the key's identifier stays the same, so applications need no change. AWS managed keys rotate automatically.
- **Multi-Region keys.** A primary key can be **replicated** to other Regions as related keys sharing the same key material and key ID, so ciphertext encrypted in one Region can be decrypted in another — essential for cross-Region DR and global applications.
- **Auditing.** Every KMS operation is logged in **AWS CloudTrail**, giving a complete record of who used which key, when, and in what context.
- **Safe deletion.** Keys cannot be deleted immediately; scheduling deletion enforces a **waiting period (7–30 days)**, and keys can be **disabled** instead for reversible removal.

---

## Configuration Reference

- **Create a customer managed key** choosing symmetric/asymmetric/HMAC, usage (encrypt-decrypt or sign-verify), and key material origin.
- **Write the key policy** to define key administrators and key users; the key policy must grant access — IAM permissions alone are not sufficient unless the key policy delegates to IAM.
- **Enable rotation** and set the rotation period for symmetric customer managed keys.
- **Replicate** to additional Regions if you need multi-Region keys.
- **Aliases** (friendly names like `alias/payments`) decouple applications from raw key IDs and make rotation between keys easier to manage.

---

## Operations and Troubleshooting

- **Access denied on decrypt.** The most common cause is the **key policy** (and/or the calling principal's IAM policy and any grants) not permitting `kms:Decrypt` for that principal — remember the key policy is the gatekeeper. A mismatched **encryption context** will also cause decryption to fail.
- **Cross-account use.** To let another account use your key, the key policy must allow that account's principal *and* that principal's IAM policy must allow the KMS action — both sides are required.
- **Cross-Region decryption fails.** Single-Region keys cannot decrypt in another Region; you need a **multi-Region key** for that.
- **Throttling.** Very high request rates can hit KMS request-rate limits; envelope encryption (caching data keys appropriately) and request patterns matter at scale.
- **Cost from request volume.** Because services call KMS on encrypt/decrypt, high-throughput workloads generate many KMS requests; the data-key caching inherent in envelope encryption is what keeps this manageable.

---

## Integrations

KMS is the encryption backbone of AWS. **Server-side encryption** in S3, EBS, RDS, DynamoDB, EFS, SNS, SQS, Secrets Manager, and many more is implemented with KMS keys — often transparently (`aws/service` managed keys) or with your customer managed key for full control. **AWS CloudTrail** records all key usage for audit. **AWS Secrets Manager** and **Systems Manager Parameter Store** use KMS to protect secrets, and Secrets Manager adds rotation on top. **AWS CloudHSM** can back a custom key store for dedicated single-tenant HSMs, and **external key stores (XKS)** integrate third-party key managers. A clean way to remember the boundary: **KMS** is multi-tenant, fully managed, and integrated everywhere; **CloudHSM** is a dedicated, single-tenant HSM you manage directly when regulations demand exclusive control of the hardware.

---

## Pricing and Cost Considerations

KMS pricing has two usage-based components: a small **monthly charge per customer managed key** (AWS managed keys themselves are free; key material imported or stored in custom/external key stores may differ) and a charge **per API request** (Encrypt, Decrypt, GenerateDataKey, ReEncrypt, etc.). A monthly free tier of requests applies. The dominant cost driver for high-throughput systems is request volume, which is exactly why envelope encryption and appropriate data-key caching matter — they let you encrypt terabytes while making relatively few KMS calls. Multi-Region replica keys and custom/external key stores have their own considerations. Exact per-unit prices vary by Region and over time; reason about cost as "per customer managed key per month, plus per cryptographic request."

---

## Exam Relevance

**CLF-C02:** Recognize KMS as the managed service to create and control encryption keys, integrated with AWS services for encryption at rest, with usage logged in CloudTrail. Foundational: KMS = managed keys; know it differs from CloudHSM (dedicated hardware) and Secrets Manager (secret storage/rotation).

**SAA-C03:** Know envelope encryption, customer managed vs. AWS managed keys, multi-Region keys for cross-Region designs, and that services use KMS for SSE. Architecture-level: designing encryption at rest.

**SOA-C03:** Operate it — enable rotation, manage aliases, monitor usage via CloudTrail, and troubleshoot access/throttling. Operations depth.

**SCS-C03:** Deepest. Know key policies vs. IAM vs. grants and which controls access; encryption context as AAD and as a policy condition; envelope encryption and the GenerateDataKey flow; symmetric/asymmetric/HMAC keys; key material origins (AWS, BYOK import, CloudHSM custom key store, XKS); automatic/on-demand/multi-Region rotation; cross-account and cross-Region requirements; and the deletion waiting period. Expect scenarios about least-privilege key access, cross-account encryption, residency/control requirements (BYOK/XKS/CloudHSM), and multi-Region key design.

---

## Summary

AWS KMS creates and controls cryptographic keys held in FIPS-validated HSMs, exposing only cryptographic operations through an audited API. Keys can be symmetric, asymmetric, or HMAC, and customer managed, AWS managed, or AWS owned, with material that is AWS-generated, imported (BYOK), or held in a CloudHSM custom key store or external key store. Envelope encryption — KMS protects small data keys that in turn encrypt bulk data — is what makes KMS scalable and explains the GenerateDataKey flow. Access is governed primarily by the key policy, with IAM and grants, and encryption context binds operations as authenticated data. Keys support automatic, on-demand, and multi-Region rotation, all usage is logged in CloudTrail, and deletion enforces a waiting period. KMS is the integrated encryption backbone of AWS; CloudHSM is the dedicated alternative when exclusive hardware control is required.

---

## Quick Check

1. Explain envelope encryption and why it lets KMS encrypt very large objects despite the ~4 KB direct-encrypt limit.
2. What is the primary access-control mechanism for a KMS key, and why are IAM permissions alone sometimes insufficient?
3. What is encryption context, and what happens if it does not match on decryption?
4. A workload must decrypt in a second Region the data it encrypted in the first. What kind of key do you need?
5. When would you choose CloudHSM or an external key store over a standard KMS customer managed key?

---

## What's Next

Pair this with the SCS-C03 Data Protection lessons (encryption at rest, the KMS deep dive, and secrets management) and the **Amazon Macie** lesson (whose results KMS encrypts). KMS underpins encryption across nearly every other service, so this reference recurs throughout the cert paths.
