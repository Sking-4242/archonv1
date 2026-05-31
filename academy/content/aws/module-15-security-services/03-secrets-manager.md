---
title: "Secrets Manager and SSM Parameter Store"
type: content
estimated_minutes: 8
cert_tags: ["SAA-C03", "DVA-C02", "SCS-C02"]
---

# Secrets Manager and SSM Parameter Store

## Overview

Hardcoded credentials in code are one of the most common security vulnerabilities. AWS Secrets Manager and Systems Manager Parameter Store provide secure, centralized secrets storage with IAM-controlled access, encryption, and automatic rotation. This lesson covers both services and when to use each.

## AWS Secrets Manager

Secrets Manager stores secrets (database passwords, API keys, OAuth tokens) as JSON key-value objects, encrypted with KMS. Applications retrieve secrets at runtime via SDK calls — no secrets in config files or environment variables. Key feature: automatic rotation. Secrets Manager can automatically rotate RDS, Redshift, and DocumentDB credentials by calling a Lambda function on a schedule, updating the secret value and the database password atomically without application downtime.

## Secrets Manager in Applications

The pattern: application calls `secretsmanager:GetSecretValue` at startup or per-request (with caching). The returned JSON contains credentials. The application parses and uses them. AWS SDKs have a caching client that reduces API calls and handles version transitions during rotation transparently. IAM controls which roles can call GetSecretValue for which secrets via resource policies or IAM policies on the secret ARN.

## SSM Parameter Store

Parameter Store stores strings, StringList, or SecureString (encrypted with KMS) parameters hierarchically (e.g., `/myapp/prod/db-password`). Standard tier is free; Advanced tier supports parameters up to 8 KB and parameter policies (automatic expiration notifications, no automatic rotation built-in). Parameter Store is suitable for configuration values, feature flags, and simple secrets where automatic rotation isn't needed. Tightly integrated with SSM Run Command, CodePipeline, ECS, and Lambda environment variables.

## Secrets Manager vs. Parameter Store

Secrets Manager: purpose-built for secrets, automatic rotation, cross-account support, $0.40/secret/month + API call charges. Parameter Store: config + secrets, no automatic rotation built-in, free for Standard tier. Choose Secrets Manager for database credentials and anything needing automatic rotation. Choose Parameter Store for configuration values, feature flags, and non-rotated parameters. For cost-sensitive workloads with simple secrets, Parameter Store SecureString is acceptable.

## Summary

Secrets Manager provides secure secrets storage with automatic rotation — the standard solution for database credentials and API keys. SSM Parameter Store covers configuration values and simple secrets with a hierarchical namespace. Both integrate with KMS for encryption. Retrieve secrets at runtime via SDK, never embed them in code or config files.

## Examples

A startup's Rails application originally stored its RDS PostgreSQL password in a hardcoded environment variable inside a Docker image. After a routine image scan flagged the credential, the team migrated to Secrets Manager: the app calls `GetSecretValue` at startup, parses the returned JSON for the password, and opens its database connection. They also enable Secrets Manager's built-in RDS rotation on a 30-day schedule. Now even if the image is exfiltrated, the embedded password is gone — and the real credential rotates automatically before anyone could exploit a leak.

A mid-size SaaS company manages dozens of microservices, each with its own third-party API key for payment processors, email providers, and analytics platforms. Rather than storing each key in a per-service `.env` file, the platform team stores all secrets in Secrets Manager under a naming convention like `/payments-service/prod/stripe-key`. Each service's ECS task role has an IAM policy allowing `secretsmanager:GetSecretValue` only on its own secret ARN path. When Stripe rotates an API key, the platform team updates the single secret; all containers pick it up on their next SDK cache refresh with no redeployment.

A DevOps team building a CI/CD pipeline needs to pass dozens of non-sensitive configuration values — feature flags, environment names, dependency URLs — alongside a handful of sensitive tokens to Lambda functions and CodeBuild jobs. They use Parameter Store Standard tier (free) for all non-secret config, with a hierarchical path structure like `/myapp/prod/feature-flags/dark-mode`. For the three sensitive tokens that require encryption, they use Parameter Store SecureString to avoid paying the $0.40/secret/month Secrets Manager cost for simple values that never need automatic rotation.

## Think About It

1. Why is retrieving a secret at application startup via SDK call safer than injecting it as an environment variable, even if the environment variable is sourced from Secrets Manager at deploy time?
2. What would happen if two application instances retrieve a secret simultaneously during a rotation event — one gets the old version and one gets the new version? How does the Secrets Manager SDK caching client handle this, and what responsibility does your Lambda rotation function carry?
3. How would you decide whether to use Secrets Manager or Parameter Store SecureString for a database password that changes quarterly and has no compliance requirement for automated rotation?
4. A security team wants evidence that a specific Lambda function never accessed a production database secret. What AWS services and configurations would you need in place to produce that evidence?
5. What trade-offs exist between caching secrets in application memory for performance versus always fetching the latest version on each request?

## Quick Check

**Q1.** Which Secrets Manager capability most directly addresses the risk of a compromised database credential remaining valid for months?

- A) KMS encryption of the secret value at rest
- B) Automatic secret rotation via a Lambda function
- C) Resource-based IAM policies on the secret ARN
- D) Cross-account secret sharing

**Answer: B** — Automatic rotation periodically replaces the credential, limiting the window of exposure if a secret is ever compromised.

**Q2.** A development team wants to store 50 application configuration values and 3 database passwords in AWS. Cost is a concern and none of the config values need encryption or rotation. What is the most cost-effective approach?

- A) Store all 53 values in Secrets Manager
- B) Store all 53 values in Parameter Store SecureString
- C) Store the 50 config values in Parameter Store Standard tier and the 3 passwords in Secrets Manager
- D) Store everything in S3 with server-side encryption

**Answer: C** — Parameter Store Standard tier is free and appropriate for non-sensitive config; Secrets Manager is purpose-built for secrets needing rotation, but applying it to non-sensitive config adds unnecessary cost.

**Q3.** Which statement correctly describes SSM Parameter Store's SecureString type?

- A) It stores the value in plaintext but restricts access to HTTPS only
- B) It encrypts the value with a KMS key and requires appropriate KMS permissions to retrieve it
- C) It automatically rotates the parameter value on a configurable schedule
- D) It is only available in the Advanced parameter tier

**Answer: B** — SecureString values are encrypted using a KMS key; the caller needs both SSM `GetParameter` permission and the appropriate KMS `Decrypt` permission to retrieve the plaintext value.

## What's Next

Next up: AWS Certificate Manager, CloudHSM, and Macie — additional security services.