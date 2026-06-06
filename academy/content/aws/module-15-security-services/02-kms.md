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
      "Principal": { "AWS": "arn:aws:iam::123456