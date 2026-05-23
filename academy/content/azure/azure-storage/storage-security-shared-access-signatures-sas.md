---
title: "Storage Security & Shared Access Signatures (SAS)"
type: content
estimated_minutes: 11
cert_tags: ["az_104", "az_500", "az_305"]
---

# Storage Security & Shared Access Signatures (SAS)

## Overview

Data breaches rarely happen because an attacker breaks AES-256 encryption. They happen because an administrator accidentally commits a root access key to a public GitHub repository, or leaves a Blob container set to "Public Access."

Securing an Azure Storage Account requires a defense-in-depth approach spanning the network layer and the identity layer. Furthermore, when you *do* need to share data with a third party, you must do so using the principle of least privilege via **Shared Access Signatures (SAS)**.

## The Network Layer: Firewalls & Virtual Networks

By default, when you create a new Azure Storage Account, it is accessible from all networks, including the public internet. 

**The immediate architectural fix:** Navigate to the "Networking" blade of the Storage Account and change access to **"Enabled from selected virtual networks and IP addresses."** You can then whitelist specific corporate IP ranges or use **Service Endpoints** and **Private Endpoints** to ensure that only your specific Azure VNets can communicate with the storage account.

## The Identity Layer: RBAC vs. Access Keys

Historically, Azure Storage Accounts relied on two massive, all-powerful **Storage Account Keys** (Access Key 1 and Access Key 2). Anyone possessing these keys had absolute, unrestricted root access to every Blob, File, Queue, and Table inside the account. 

If an application needs to read a single blob, giving it the Storage Account Key is a massive violation of least privilege. 

**The Modern Standard: Microsoft Entra ID (RBAC)**
Microsoft strongly recommends disabling Shared Key access entirely. Instead, you assign Azure RBAC roles (e.g., `Storage Blob Data Reader` or `Storage Blob Data Contributor`) to the Managed Identity of your Virtual Machine or App Service. The application authenticates via Entra ID behind the scenes, eliminating the need to store or rotate static access keys.

## Delegating Access: Shared Access Signatures (SAS)

What if you need to let a vendor upload a log file to your Blob storage, but they don't have an identity in your Microsoft Entra directory? You cannot give them the master Access Key. You use a **Shared Access Signature (SAS)**.

A SAS is a secure, cryptographically signed URI (a URL with a massive query string) that grants restricted access rights to Azure Storage resources. It is the exact equivalent of an AWS S3 Pre-signed URL.

You control three critical parameters when generating a SAS token:
1.  **Scope:** You can restrict the token to a single specific blob, a single container, or the entire service.
2.  **Permissions:** You can grant "Write" access but deny "Read" or "Delete" access. 
3.  **Time-To-Live (TTL):** The token will automatically expire and become mathematically invalid after a specific date and time (e.g., in 15 minutes).

**Types of SAS:**
* **Service SAS:** Secured by the master Storage Account Key. If the master key is regenerated, the SAS token breaks.
* **User Delegation SAS:** The most secure option. Instead of being signed by the master key, it is signed by Microsoft Entra ID credentials. This ensures the SAS token carries the specific RBAC restrictions of the user who created it, offering maximum security and auditing capability.

## Summary

Never leave a Storage Account exposed to the public internet; lock it down using VNet Firewalls and Private Endpoints. Move away from using root Storage Account Keys in favor of Microsoft Entra ID (RBAC) authentication to eliminate static credential theft. When granting temporary access to third parties or client applications, always use a tightly scoped, time-bound Shared Access Signature (SAS).