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

## What's Next

Next up: AWS Certificate Manager, CloudHSM, and Macie — additional security services.