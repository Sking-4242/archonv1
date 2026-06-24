---
title: "AWS Secrets Manager"
type: content
estimated_minutes: 17
cert_tags: ["SAA-C03", "SOA-C03", "SCS-C03"]
---

# AWS Secrets Manager

## Overview

AWS Secrets Manager securely stores, manages, and **automatically rotates** secrets — database credentials, API keys, OAuth tokens, and other sensitive strings — and delivers them to applications at runtime via API instead of being hard-coded. This *service reference* lesson covers how secrets are stored and rotated, the layered access model, the comparison with Parameter Store, cross-account and multi-Region patterns, and what each certification expects.

Secrets Manager matters because hard-coded credentials in code, config files, or environment variables are a leading cause of breaches, and static long-lived credentials are dangerous even when stored "securely." Secrets Manager centralizes secrets, encrypts them, controls access with IAM, audits every retrieval, and — its signature feature — **rotates them automatically** so credentials change regularly without application changes or downtime. The core mental model is that an application calls **`GetSecretValue`** at runtime (authorized by IAM plus the KMS key), so the secret never lives in the codebase and can be rotated underneath the app.

---

## How It Works

A **secret** stores an encrypted value (always encrypted with **KMS**) plus metadata and **versions**. Applications retrieve the current value through the Secrets Manager API at runtime. The defining capability is **automatic rotation**: Secrets Manager invokes a **Lambda rotation function** on a schedule that (1) creates a new credential, (2) updates the target service (e.g., the database user), (3) tests it, and (4) marks the new version current — coordinating with **staging labels** (`AWSCURRENT`, `AWSPENDING`, `AWSPREVIOUS`) so in-flight clients aren't broken. For supported databases (**RDS, Aurora, Redshift, DocumentDB**), AWS provides **managed rotation**; for anything else you supply a rotation Lambda (single-user or alternating-users strategies).

Access is layered: the caller's **IAM identity policy**, an optional **resource-based secret policy** (for cross-account sharing), and the **KMS key policy** for the encryption key — **all three** must permit access. Every retrieval and rotation is logged in **CloudTrail**.

---

## Key Features

- **Automatic rotation** via Lambda, with managed rotation for common AWS databases and configurable schedules.
- **KMS encryption** of secret values with your choice of key (enabling cross-account control via the key policy).
- **Fine-grained access** via IAM and **resource-based policies**, including **cross-account** sharing.
- **Versioning and staging labels** to manage rotation safely and roll back to the previous version.
- **Multi-Region replication** of secrets for DR and multi-Region applications (with managed replicas).
- **Service integrations** so RDS, ECS, Lambda, and CloudFormation can reference secrets directly.

---

## Configuration Reference

- **Create a secret** with a chosen KMS key and a least-privilege access policy.
- **Enable rotation** with the appropriate schedule and rotation function (managed for supported databases; custom Lambda otherwise), and prefer the **alternating-users** strategy for zero-downtime rotation of critical databases.
- **Reference at runtime** via the API/SDK or native service integrations rather than embedding values.
- **Replicate** to other Regions if the workload requires multi-Region access or DR.

---

## Operations and Troubleshooting

- **Access denied retrieving a secret.** Verify all three layers: the caller's **IAM** policy, the secret's **resource policy** (for cross-account), and the **KMS key policy** for `kms:Decrypt`.
- **Rotation failures.** Check the rotation Lambda's logs, its permissions to both Secrets Manager and the target service, and **network access** — a database in a private subnet requires the rotation Lambda to be in the VPC with a route to the database.
- **Application breaks after rotation.** Ensure the app fetches the current secret at connect time (or caches with a sensible TTL) rather than indefinitely; the alternating-users strategy avoids a window where the old credential is already invalid.
- **Choosing storage.** For simple, infrequently changed config or secrets that don't need rotation, **Parameter Store SecureString** is free for standard parameters; use Secrets Manager when **managed rotation**, database integration, or cross-Region replication justify the per-secret cost.

---

## Integrations

Secrets Manager encrypts with **KMS**, rotates via **Lambda**, integrates natively with **RDS/Aurora/Redshift/DocumentDB** (managed rotation), is consumed by **ECS**, **Lambda**, **EKS**, and **CloudFormation**, is audited by **CloudTrail**, and shares **cross-account** via resource policies (and KMS key grants) and **Organizations**. It overlaps with **Systems Manager Parameter Store** (the lighter-weight, no-rotation alternative). It is the standard answer for "store and rotate credentials securely."

---

## Pricing and Cost Considerations

Secrets Manager charges **per secret per month** plus **per 10,000 API calls** (with rotation Lambda invocations billed separately as normal Lambda usage). Because **Parameter Store standard SecureString** storage is free (you pay only KMS and, for advanced parameters, a per-parameter fee), the cost trade-off is clear: choose **Parameter Store** for simple secrets that don't need managed rotation, and **Secrets Manager** when automatic rotation, managed database integration, or cross-Region replication justify the per-secret cost. Multi-Region replicas are billed per replica. Exact prices vary by Region.

---

## Exam Relevance

**SAA-C03:** Know Secrets Manager for storing/rotating credentials, the RDS managed-rotation integration, and **Secrets Manager vs. Parameter Store** selection. Design depth.

**SOA-C03:** Operate secrets — rotation setup and troubleshooting (VPC/network, permissions), and referencing secrets from workloads. Operations depth.

**SCS-C03:** Deepest. Automatic rotation to eliminate static credentials, the **three-layer access requirement** (IAM + secret resource policy + KMS key policy), cross-account secret policies, alternating-users rotation, and the Parameter Store comparison. Security depth (Data Protection domain).

---

## Summary

AWS Secrets Manager stores secrets encrypted with KMS, delivers them to applications at runtime via API so they aren't hard-coded, and automatically rotates them with a Lambda rotation function (managed for RDS/Aurora/Redshift/DocumentDB) using staging labels to avoid breaking running clients. Access requires aligned IAM, secret resource policy, and KMS key policy, and every retrieval is audited in CloudTrail; secrets can replicate across Regions. Its key trade-off is cost versus Systems Manager Parameter Store: use Parameter Store SecureString for simple, no-rotation secrets and Secrets Manager when managed rotation and integrations are worth the per-secret charge. The recurring exam points are the three-layer access model, rotation Lambda networking, and the Parameter Store comparison.

---

## Quick Check

1. What is the signature capability of Secrets Manager that Parameter Store lacks natively?
2. Which three policies/permissions must align for a caller to retrieve and decrypt a secret?
3. How does automatic rotation (with staging labels / alternating users) avoid breaking running applications?
4. A rotation Lambda fails to reach a database in a private subnet — what is the likely cause?
5. When would you choose Parameter Store SecureString over Secrets Manager?

---

## What's Next

Pair this with **AWS KMS** (encryption), **AWS Systems Manager** (Parameter Store comparison), **Amazon RDS** (managed rotation), and the SCS-C03 secrets-management lesson.
