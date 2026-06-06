---
title: "AWS KMS: Key Management and Encryption"
type: content
estimated_minutes: 13
cert_tags: ["SAA-C03", "SAP-C02"]
---

# AWS KMS: Key Management and Encryption

## Overview

AWS Key Management Service (KMS) is the foundation of encryption across AWS. It creates, stores, and controls access to the cryptographic keys that protect data in S3, RDS, EBS, DynamoDB, Lambda, and dozens of other services. Rather than managing encryption keys yourself — storing them in code, on servers, or in configuration files — you delegate that responsibility to KMS, which handles key generation, storage, rotation, and access control in FIPS 140-3 Level 3 validated hardware security modules.

The problem KMS solves is that encryption is only as strong as key management. Encrypting data with a key stored in the same place as the data provides almost no protection. KMS separates key management from data storage entirely: your data lives in S3 or RDS, your keys live in KMS, and access to those keys is controlled by IAM policies and key policies — with every single use logged to CloudTrail. This separation means that even if an attacker gains access to your encrypted data, they cannot decrypt it without separately compromising your KMS keys and the IAM policies that govern them.

The SAA exam tests KMS key types, envelope encryption, and key policy basics. The SAP exam goes deeper into grants, key rotation strategy, multi-region keys, and CloudHSM as an alternative when KMS's shared hardware model is insufficient for compliance requirements. After this lesson, you will be able to explain envelope encryption, configure key policies, and choose the right key type for a given compliance and operational scenario.

---

## Core Concepts

### KMS Key Types

KMS offers three categories of keys, each suited to different control and compliance needs.

**AWS Managed Keys** (identified by aliases like `aws/s3`, `aws/rds`, `aws/ebs`) are created automatically by AWS services when you first enable encryption. AWS rotates them annually, you cannot view the key material, and you have no control over the key policy. They are sufficient for basic encryption where you need protection but do not need to audit every decryption or control which IAM principals can use the key.

**Customer Managed Keys (CMKs)** are keys you create and control. You define the key policy, you can enable automatic annual rotation, you can restrict which principals can use the key, and you get full CloudTrail audit records of every API call. CMKs are required any time you need to prove to an auditor which identity decrypted protected data, restrict key usage to a specific application, or share a key across accounts.

**Customer-provided key material** allows you to import your own key material into KMS, maintaining external key material provenance. Used when regulations require your organization to hold the original key material outside AWS. Comes with operational complexity — you are responsible for backing up the key material and managing its expiration.

---

### Envelope Encryption

KMS never encrypts large data payloads directly. The KMS `Encrypt` API has a 4 KB limit on plaintext size. For application data — files, database records, messages — KMS uses envelope encryption.

The process: your application calls `kms:GenerateDataKey`, which returns two things: a **plaintext data key** (use it immediately to encrypt data in memory) and an **encrypted data key** (the same key, wrapped by your CMK). Your application encrypts the data locally using the plaintext data key, discards the plaintext key from memory, and stores the ciphertext alongside the encrypted data key.

To decrypt: send the encrypted data key to KMS with `kms:Decrypt`. KMS decrypts it using the CMK and returns the plaintext data key. Your application decrypts the data locally, then discards the plaintext key again.

The CMK never touches the actual data. KMS is called twice per object (once to generate, once to decrypt the data key) rather than once per byte. This scales to petabytes. AWS services like S3 server-side encryption (SSE-KMS), EBS encryption, and RDS encryption all use envelope encryption behind the scenes.

---

### Key Policies and Grants

Every KMS CMK has a **key policy** — a resource-based policy that controls who can use and administer the key. This is unique to KMS: unlike most AWS services where IAM policies alone govern access, KMS requires an explicit Allow in the key policy. An IAM policy granting `kms:Decrypt` on a CMK's ARN is insufficient if the key policy does not also allow that principal.

The default key policy gives the AWS account root full control and enables IAM policies to delegate usage. You customize this to follow least privilege: separate key users (who can encrypt and decrypt) from key administrators (who can manage the key policy and schedule deletion), and explicitly deny any principal that should never access the key.

**Grants** are a programmatic alternative to modifying the key policy. An AWS service like EBS creates a grant on your CMK when you attach an encrypted volume to an EC2 instance — this allows EBS to call `kms:Decrypt` on your behalf without you modifying the key policy. Grants are created and retired automatically by services. You can also create grants for your own applications that need temporary key access.

---

### Key Rotation and Multi-Region Keys

**Automatic key rotation** can be enabled on CMKs. When enabled, KMS generates new key material on a configurable schedule and automatically uses the new material for all new encryptions. The default rotation period is one year (365 days), but since November 2023, AWS allows you to configure a custom rotation period between 90 and 2,560 days. Old key material is retained indefinitely so that data encrypted before rotation can still be decrypted. Rotation does not change the key ID or ARN — applications require no updates.

> **Rotation limitations:** Automatic rotation applies only to **symmetric KMS keys with AWS-generated key material**. The following key types do **not** support automatic rotation and must be rotated manually by creating a new key and re-encrypting data: asymmetric keys (RSA, ECC, SM2), HMAC keys, and keys with imported key material (where the customer supplied the key bytes). For imported key material, manual rotation means generating a new key, importing new material, and updating applications to use the new key alias.

**Multi-Region Keys** replicate the same key material to multiple AWS regions under synchronized key IDs. A value encrypted in `us-east-1` can be decrypted in `eu-west-1` without re-encryption. This matters for global active-active architectures, cross-region data replication, and DynamoDB Global Tables where the same encrypted attribute must be readable in any region. The primary key exists in one region; replica keys are synchronized copies that share the same key material.

---

## Configuration Reference

### Creating a CMK with a Least-Privilege Key Policy

```bash
# Create a symmetric CMK with automatic rotation enabled
aws kms create-key \
  --description "Production app encryption key" \
  --key-usage ENCRYPT_DECRYPT \
  --origin AWS_KMS \
  --tags TagKey=Environment,TagValue=prod \
  --region us-east-1

# Enable automatic annual key rotation
aws kms enable-key-rotation \
  --key-id 1234abcd-12ab-34cd-56ef-1234567890ab \
  --region us-east-1

# Create a human-readable alias
aws kms create-alias \
  --alias-name alias/prod-app-key \
  --target-key-id 1234abcd-12ab-34cd-56ef-1234567890ab \
  --region us-east-1
```

---

### Key Policy: Separate User and Admin Access

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "EnableRootAccountControl",
      "Effect": "Allow",
      "Principal": { "AWS": "arn:aws:iam::123456789012:root" },
      "Action": "kms:*",
      "Resource": "*"                     // Root retains full control; required for IAM delegation to work
    },
    {
      "Sid": "AllowAppRoleToUseKey",
      "Effect": "Allow",
      "Principal": { "AWS": "arn:aws:iam::123456789012:role/ProdAppRole" },
      "Action": [
        "kms:Decrypt",
        "kms:GenerateDataKey",
        "kms:DescribeKey"
      ],
      "Resource": "*"               // Only the actions the app actually needs — not kms:*
    },
    {
      "Sid": "AllowKeyAdministration",
      "Effect": "Allow",
      "Principal": { "AWS": "arn:aws:iam::123456789012:role/KMSAdminRole" },
      "Action": [
        "kms:Create*",
        "kms:Describe*",
        "kms:Enable*",
        "kms:List*",
        "kms:Put*",
        "kms:Update*",
        "kms:Revoke*",
        "kms:Disable*",
        "kms:Get*",
        "kms:Delete*",
        "kms:ScheduleKeyDeletion",
        "kms:CancelKeyDeletion"
      ],
      "Resource": "*"               // Admins manage the key but cannot use it to encrypt/decrypt
    },
    {
      "Sid": "DenyExternalPrincipals",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "kms:*",
      "Resource": "*",
      "Condition": {
        "StringNotEquals": {
          "aws:PrincipalAccount": "123456789012"  // Block any principal not from this account
        }
      }
    }
  ]
}
```

The separation between key users (Decrypt, GenerateDataKey) and key administrators (policy management, deletion) is a core KMS best practice. An administrator who can modify the key policy must not also be able to decrypt production data — this requires separate roles.

---

### Enabling Custom Key Rotation

```bash
# Enable automatic rotation with a custom period (requires AWS KMS key, not imported material)
aws kms enable-key-rotation \
  --key-id alias/prod-app-key \
  --rotation-period-in-days 180    # Custom period: 180 days (range: 90–2,560 days)

# Check rotation status
aws kms get-key-rotation-status \
  --key-id alias/prod-app-key

# List all previous key versions retained for decryption of old ciphertext
aws kms list-key-rotations \
  --key-id alias/prod-app-key
```

---

### Cross-Account Key Usage

```bash
# Grant a role in account 999999999999 the ability to use a key in account 123456789012
# Step 1: Add the cross-account principal to the key policy (in account 123456789012):
{
  "Sid": "AllowCrossAccountUsage",
  "Effect": "Allow",
  "Principal": { "AWS": "arn:aws:iam::999999999999:role/CrossAccountRole" },
  "Action": ["kms:Decrypt", "kms:GenerateDataKey", "kms:DescribeKey"],
  "Resource": "*"
}

# Step 2: Add an IAM policy to the role in account 999999999999:
{
  "Effect": "Allow",
  "Action": ["kms:Decrypt", "kms:GenerateDataKey"],
  "Resource": "arn:aws:kms:us-east-1:123456789012:key/1234abcd-12ab-34cd-56ef-1234567890ab"
}
# Both the key policy AND the IAM policy must allow the action — either alone is insufficient.
```

---

## How to Decide

| Scenario | Key Type | Reason |
|---|---|---|
| Basic encryption, no audit or control needed | AWS Managed Key | Zero operational overhead; AWS handles rotation |
| Need to restrict which roles can decrypt | Customer Managed Key (CMK) | Key policy controls exactly who can use it |
| Need CloudTrail audit of every decryption | CMK | Every KMS API call is logged; AWS Managed Keys also log, but you cannot restrict usage |
| Cross-account encryption | CMK | AWS Managed Keys cannot be shared across accounts |
| Regulatory requirement: hold original key material | Imported key material | Customer controls key provenance; comes with expiration management responsibility |
| FIPS 140-3 Level 3 with dedicated HSM tenancy | CloudHSM | KMS uses shared HSMs; CloudHSM provides single-tenant dedicated hardware |
| Short-lived or temporary key access | KMS Grants | Grants can be retired without modifying the key policy |

---

## Exam Traps

**Trap 1: "IAM policies alone control KMS key access."**
False. KMS requires an explicit Allow in the key policy AND a matching Allow in the IAM policy (unless the key policy explicitly enables IAM delegation). An IAM policy granting `kms:Decrypt` on a CMK ARN does nothing if the key policy does not allow that principal. The key policy is the primary access control mechanism.

**Trap 2: "Key rotation changes the key ID and breaks existing ciphertext."**
False. KMS key rotation is transparent. The key ID and ARN stay the same. Old key material is retained so that data encrypted before rotation can still be decrypted. Applications require no changes when rotation occurs. KMS tracks which version of the key material was used to encrypt each data key.

**Trap 3: "AWS Managed Keys give you full audit visibility."**
Partially true. CloudTrail does log AWS Managed Key usage. However, you cannot restrict which principals use an AWS Managed Key, cannot modify its key policy, and cannot share it across accounts. For true least-privilege access control and cross-account scenarios, you need a CMK.

**Trap 4: "Envelope encryption means the CMK encrypts all data directly."**
False. The CMK encrypts the data key, not the data itself. The data is encrypted locally using the plaintext data key. The CMK never touches the actual data payload. This is why KMS can scale to any data size — the CMK API calls are limited to key material, not bulk data.

**Trap 5: "Multi-Region keys are the same as cross-account sharing."**
Different features. Multi-Region keys replicate key material to multiple regions so that data encrypted in one region can be decrypted in another without re-encryption. Cross-account sharing allows a principal in a different account to use a key from this account. Both features can be combined but serve different purposes.

---

## Summary

- KMS provides three key types: AWS Managed Keys (no control, no cost), Customer Managed Keys (full control, require key policy configuration), and imported key material (customer controls key provenance).
- Envelope encryption separates key management from data encryption: `GenerateDataKey` returns a plaintext data key for local encryption and an encrypted data key for storage; `Decrypt` unwraps the data key when needed. The CMK never touches bulk data.
- Key policies are mandatory — an IAM policy alone is insufficient unless the key policy explicitly enables IAM delegation via the root principal statement.
- Automatic rotation retains all old key versions for decryption and is transparent to applications; since November 2023, rotation periods can be customized between 90 and 2,560 days.
- Multi-Region keys share key material across regions under synchronized key IDs, enabling cross-region decryption without re-encryption.
- CloudHSM provides single-tenant dedicated hardware for workloads where KMS's shared HSM model fails compliance requirements.

---

## Examples

A healthcare company stores patient records in S3. They use SSE-KMS with a CMK. The key policy restricts `kms:Decrypt` to the application's IAM role and the data access audit team. Every query that downloads a patient record generates a CloudTrail event showing the decrypting principal, timestamp, and key used. When a compliance audit requires proof that only authorized roles accessed PHI in a given quarter, the team queries CloudTrail for `kms:Decrypt` events on that CMK ARN. This is only possible with a CMK — AWS Managed Keys generate CloudTrail logs but cannot be restricted to specific principals.

A financial services firm operates an active-active application across `us-east-1` and `eu-west-1`. Customer transaction records are written to DynamoDB in both regions with server-side encryption. They use Multi-Region KMS keys so that a record written in `us-east-1` can be decrypted by the `eu-west-1` replica without sending the encrypted data key back to `us-east-1` for unwrapping. The synchronized key IDs mean the same key policy governs usage in both regions.

---

## Think About It

1. A developer asks why they cannot just store their encryption key in AWS Secrets Manager or Parameter Store instead of using KMS. What are the architectural differences, and when is KMS the necessary choice?
2. A key policy allows `kms:Decrypt` for `arn:aws:iam::123456789012:role/AppRole`. An IAM policy on `AppRole` allows `kms:Decrypt` on the CMK ARN. But the application still gets an access denied error when calling `Decrypt`. What is the most likely cause?
3. A team rotates their CMK today. Data encrypted six months ago is still in S3. Will the application be able to decrypt it tomorrow — and what does KMS do internally to make that work?
4. Your CISO requires that encryption keys for a regulated workload never leave a dedicated hardware device that your organization exclusively controls. Does KMS CMK satisfy this requirement? What does, and what are the trade-offs?

---

## Quick Check

**Q1.** What is the primary difference between an AWS Managed Key and a Customer Managed Key?

- A) AWS Managed Keys cannot be used with S3; CMKs can
- B) Customer Managed Keys allow you to define key policies and control which principals can use them; AWS Managed Keys do not
- C) AWS Managed Keys are stored in CloudHSM; CMKs are stored in software
- D) Customer Managed Keys must be rotated manually; AWS Managed Keys rotate automatically

**Answer: B** — CMKs give you control over the key policy, usage restrictions, and cross-account access. AWS Managed Keys rotate automatically and log to CloudTrail but cannot have their key policies modified or be shared across accounts.

**Q2.** An application calls `kms:GenerateDataKey` and receives a plaintext data key and an encrypted data key. What should the application do next?

- A) Store both the plaintext key and encrypted data key alongside the encrypted data
- B) Send the plaintext key to KMS for safekeeping before encrypting data
- C) Use the plaintext key to encrypt data locally, then discard the plaintext key from memory and store only the encrypted data key alongside the ciphertext
- D) Use the encrypted data key to encrypt the data directly

**Answer: C** — Envelope encryption: encrypt data locally with the plaintext key, discard the plaintext key immediately, and store the encrypted data key with the ciphertext. Never persist the plaintext key.

**Q3.** A team enables automatic key rotation on their CMK. Three months later, the rotation occurs. Data encrypted before rotation is queried by the application. What happens?

- A) The query fails because the old key material no longer exists
- B) KMS decrypts the data using the retained old key material, transparently to the application
- C) The application must manually specify the old key version in its API call
- D) The data must be re-encrypted before it can be decrypted

**Answer: B** — KMS retains all previous key versions after rotation. The key ID and ARN are unchanged. KMS automatically uses the correct version of key material to decrypt data, requiring no application changes.

---

## What's Next

Next: AWS Secrets Manager — managing database credentials, API keys, and other secrets with automatic rotation, cross-account access, and integration with RDS, Redshift, and custom Lambda-based rotation.