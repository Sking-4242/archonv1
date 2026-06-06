---
title: "Secrets Manager and SSM Parameter Store"
type: content
estimated_minutes: 12
cert_tags: ["SAA-C03", "SAP-C02"]
---

# Secrets Manager and SSM Parameter Store

## Overview

Hardcoded credentials are among the most exploited vulnerabilities in cloud environments. A database password embedded in source code, a Docker image, or an environment variable at build time is static — it cannot be rotated without a redeployment, and if it leaks, it remains valid until someone manually changes it. AWS Secrets Manager and Systems Manager Parameter Store exist to eliminate that pattern: store credentials and configuration centrally, retrieve them at runtime via SDK calls, and let AWS handle encryption and — in Secrets Manager's case — automatic rotation.

The two services serve overlapping but distinct purposes. Secrets Manager is purpose-built for credentials that must rotate: database passwords, API keys, OAuth tokens. It handles the full rotation lifecycle — calling a Lambda function to update the secret in the service, then updating the stored secret value — without application downtime. Parameter Store is broader: a hierarchical key-value store for configuration values, feature flags, and simple secrets where automatic rotation is not needed, with a free tier for standard parameters.

The SAA exam tests when to use Secrets Manager versus Parameter Store, how secret rotation works, and how both services integrate with KMS. The SAP exam adds cross-account secret sharing, rotation failure handling, and the cost implications of each service at scale. After this lesson you will be able to choose the right service for a given use case, configure rotation, and retrieve secrets correctly from application code.

---

## Core Concepts

### AWS Secrets Manager

Secrets Manager stores secrets as JSON objects encrypted with a KMS CMK. The canonical use case is database credentials: the secret stores `{"username": "app_user", "password": "s3cr3t", "host": "db.example.com"}`. Applications call `secretsmanager:GetSecretValue` at runtime to retrieve the current value — no secrets in config files, environment variables baked into images, or source code.

The key differentiator is **automatic rotation**. Secrets Manager has built-in rotation support for Amazon RDS (MySQL, PostgreSQL, Oracle, SQL Server), Amazon Redshift, and Amazon DocumentDB. For any other secret, you provide a Lambda rotation function. On the configured schedule (e.g., every 30 days), Secrets Manager invokes the Lambda, which: (1) creates a new credential in the service, (2) tests the new credential, (3) updates the secret value in Secrets Manager, and (4) marks the old version as deprecated. Applications using the Secrets Manager SDK caching client pick up the new credential transparently on their next cache refresh.

Pricing: $0.40 per secret per month plus $0.05 per 10,000 API calls. For a workload with 20 secrets, the cost is $8/month — negligible against the operational risk of static credentials.

---

### SSM Parameter Store

Parameter Store stores parameters in a hierarchical namespace (e.g., `/myapp/prod/db-host`, `/myapp/prod/db-password`). Three value types are supported: **String** (plaintext), **StringList** (comma-separated plaintext), and **SecureString** (encrypted with KMS). Standard tier parameters up to 4 KB are free; Advanced tier supports up to 8 KB and adds parameter policies.

Parameter Store integrates natively with CodePipeline, CodeBuild, ECS task definitions, Lambda environment variables, and Systems Manager Run Command — making it the natural store for configuration values that infrastructure tooling needs to consume without application code changes.

It does **not** have built-in automatic secret rotation. You can build rotation using EventBridge + Lambda, but you are responsible for the entire rotation flow that Secrets Manager handles automatically. For simple configuration values and non-rotated secrets, Parameter Store is significantly more cost-effective. For credentials that must rotate automatically, Secrets Manager is the right choice.

---

### Secret Retrieval Patterns

The correct pattern for retrieving secrets at runtime has two parts: call the API, cache the result.

**Startup retrieval with caching**: fetch the secret once at application startup and cache it in memory. Refresh the cache periodically (every 5–10 minutes) so the application automatically picks up rotated values without restarting. The AWS SDK includes a `SecretsManagerCachingClient` for Python and Java that handles this automatically.

**Never use environment variables baked at deploy time.** Injecting a secret into an ECS container's environment variables at task launch time captures the credential at that moment. If the secret rotates, the container continues using the stale value until it is replaced. The correct ECS pattern is to inject the secret ARN as an environment variable (not the value) and call Secrets Manager at startup, or use ECS native secret injection which fetches the current value at container start.

**Rotation-safe retrieval**: during a Secrets Manager rotation event, two versions of the secret briefly coexist — `AWSCURRENT` (the old value, still valid) and `AWSPENDING` (the new value, being tested). The rotation Lambda must test the new credential before marking it `AWSCURRENT`. Applications requesting `AWSCURRENT` during rotation always get a valid credential. Applications caching the old value continue working until their cache expires.

---

### Cross-Account Secret Sharing

Secrets Manager supports resource-based policies on secrets, allowing a secret in Account A to be accessed by a role in Account B. The secret's resource policy grants `secretsmanager:GetSecretValue` to the cross-account principal, and the KMS key policy on the encrypting CMK must also grant the cross-account principal `kms:Decrypt`. Both policies must allow access — neither alone is sufficient.

This pattern is used when a central platform team manages shared credentials (e.g., a shared analytics database) that multiple product accounts need to access without receiving a copy of the credential.

---

## Configuration Reference

### Storing and Rotating an RDS Secret

```bash
# Store an RDS credential as a Secrets Manager secret
aws secretsmanager create-secret \
  --name "prod/myapp/rds-credentials" \
  --description "Production RDS PostgreSQL credentials" \
  --kms-key-id alias/prod-app-key \             # Use a CMK, not the default aws/secretsmanager
  --secret-string '{"username":"app_user","password":"initial_password","host":"mydb.cluster-abc.us-east-1.rds.amazonaws.com","port":5432,"dbname":"myapp"}' \
  --tags Key=Environment,Value=prod \
  --region us-east-1

# Enable automatic rotation — built-in Lambda for RDS PostgreSQL
aws secretsmanager rotate-secret \
  --secret-id "prod/myapp/rds-credentials" \
  --rotation-rules AutomaticallyAfterDays=30 \  # Rotate every 30 days
  --rotate-immediately \                         # Trigger an immediate rotation to test the setup
  --region us-east-1
```

---

### Retrieving a Secret in Application Code

```python
import boto3, json
from botocore.exceptions import ClientError

# Use the SDK caching client to reduce API calls and handle rotation transparently
# pip install aws-secretsmanager-caching
from aws_secretsmanager_caching import SecretCache, SecretCacheConfig

client = boto3.client('secretsmanager', region_name='us-east-1')
cache = SecretCache(config=SecretCacheConfig(), client=client)

def get_db_credentials():
    # Cache refreshes automatically every 60 seconds by default
    # During rotation, alw