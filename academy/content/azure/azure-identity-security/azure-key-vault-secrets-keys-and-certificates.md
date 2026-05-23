---
title: "Azure Key Vault: Secrets, Keys, and Certificates"
type: content
estimated_minutes: 9
cert_tags: ["az_104", "az_500", "az_305"]
---

# Azure Key Vault: Secrets, Keys, and Certificates

## Overview

One of the most common causes of massive enterprise data breaches is hardcoded credentials. A developer writes a database connection string—including the username and password—directly into the application's source code, and commits that code to a Git repository. 

To eliminate this vulnerability, cloud architectures must decouple sensitive information from application code. **Azure Key Vault** is a centralized cloud service for safeguarding cryptographic keys and other secrets. It is the direct equivalent to AWS Key Management Service (KMS) combined with AWS Secrets Manager.

## The Three Pillars of Key Vault

Key Vault provides secure storage and tight access control for three specific types of data:

**1. Secrets Management**
A "secret" is a string of text under 25 KB. This is used for database passwords, API keys, storage account access keys, and connection strings. 
* *The Workflow:* The developer stores the database password in Key Vault. In the application code, they only write the URL pointing to the Key Vault secret. When the app boots up, it authenticates to Key Vault using its Managed Identity, retrieves the password into memory, and connects to the database. The password never exists in the source code.

**2. Key Management**
Key Vault can create and control encryption keys (symmetric and asymmetric) used to encrypt your data. 
* *Hardware Security Modules (HSMs):* For the highest level of security, you can specify that keys be generated and protected by FIPS 140-2 Level 2 validated HSMs. The cryptographic key never leaves the physical hardware boundary of the HSM; applications send data *to* the Key Vault to be encrypted/decrypted.

**3. Certificate Management**
Key Vault lets you easily provision, manage, and deploy public and private Transport Layer Security/Secure Sockets Layer (TLS/SSL) certificates. It can be integrated with public Certificate Authorities (like DigiCert or GlobalSign) to automatically renew your certificates before they expire, completely eliminating the outage risk of an expired SSL cert.

## Security and Access Policies

Because Key Vault holds the "keys to the kingdom," its access model is incredibly strict. Access requires two distinct authorizations:

1.  **Management Plane (RBAC):** Controls who can manage the Key Vault *resource itself*. Who can delete the vault? Who can change the firewall settings? This is governed by standard Azure RBAC (e.g., the `Key Vault Contributor` role).
2.  **Data Plane (Access Policies or RBAC):** Controls who can see the *contents* of the vault. Just because you are the Subscription Owner and can delete the Key Vault does NOT mean you have permission to read the passwords stored inside it. 
    * Historically, Data Plane access was governed by Key Vault Access Policies.
    * The modern best practice (and exam focus) is to use **Azure RBAC for Key Vault data plane**. You assign the `Key Vault Secrets User` role to an application's Managed Identity, ensuring least privilege access directly to the secret values.

## Soft Delete and Purge Protection

If a malicious insider or a careless script deletes your Key Vault, every application relying on it will immediately crash, and any data encrypted by its keys will be permanently unreadable (crypto-shredded).

To prevent this catastrophic data loss, Azure Key Vault enforces two features:
* **Soft Delete:** Retains deleted vaults and vault objects for a configurable period (7 to 90 days). During this time, the deletion can be reversed. It is enabled by default and cannot be disabled.
* **Purge Protection:** An optional feature that prevents anyone—even the highest-level administrator—from forcefully permanently deleting ("purging") the vault before the Soft Delete retention period expires. **This is a mandatory configuration for enterprise production environments.**

## Summary

Azure Key Vault eliminates hardcoded credentials by centrally storing secrets (passwords/API keys), cryptographic keys (HSM-backed encryption), and certificates (automated SSL renewal). Access to the vault requires separate authorization for the Management Plane (the vault resource) and the Data Plane (the secrets inside). To protect against catastrophic crypto-shredding, administrators must ensure Soft Delete and Purge Protection are active.