---
title: "Service Accounts and the 'ActAs' Vulnerability"
type: content
estimated_minutes: 13
cert_tags: ["ace", "pca", "pcse"]
---

# Service Accounts and the 'ActAs' Vulnerability

## Overview

When an application, script, or Virtual Machine needs to interact with Google Cloud APIs, it cannot type in a username, password, and an MFA code. It requires a machine identity. 

In GCP, a machine identity is called a **Service Account**. Understanding how Service Accounts operate—and specifically how they can be weaponized for privilege escalation—is a mandatory requirement for the Professional Cloud Security Engineer (PCSE) and Cloud Architect (PCA) exams.

## The Dual Nature of Service Accounts

This is the hardest concept to grasp: **A Service Account is both an Identity AND a Resource.**

1. **As an Identity:** Just like a human user, a Service Account has an email address (e.g., `app-backend@my-project.iam.gserviceaccount.com`). You can grant this email address the `roles/storage.objectAdmin` role so the application can write files to a bucket.
2. **As a Resource:** The Service Account itself exists as an object inside a Project. Because it is a resource, *you can grant human users permissions over it.*

## The `Service Account User` Role (The Privilege Escalation Trap)

Imagine you are a Junior Cloud Engineer. Your IAM permissions are very strict: you only have the `Compute Instance Admin` role, meaning you can create Virtual Machines, but you have zero access to the highly secure Finance Cloud Storage buckets.

However, a Senior Engineer created a Service Account named `finance-reader@my-project...` and gave that Service Account the `Storage Admin` role to read the Finance buckets. 

If you attempt to attach the `finance-reader` Service Account to a new Virtual Machine, GCP will ask a critical question: **"Do you have permission to act as this Service Account?"**

This is the `iam.serviceAccounts.actAs` permission, contained within the **Service Account User** role. 
* If you **DO NOT** have this role, GCP blocks you. 
* If you **DO** have this role, you can attach the `finance-reader` Service Account to your VM. You can then SSH into that VM, and run `gsutil ls gs://finance-secure-bucket`. The bucket allows the request because it thinks the Service Account is asking, not you. 

**You just escalated your privileges.** By acting as the Service Account, you bypassed your own IAM restrictions. Therefore, tightly controlling who holds the `Service Account User` role is one of the most critical defensive architectural practices in GCP.

## Managing Service Account Keys

To authenticate as a Service Account, developers historically downloaded static **JSON Keys**. 
* **The Danger:** These JSON files contain an RSA private key. They never expire. If a developer accidentally commits this JSON file to GitHub, an attacker instantly gains whatever permissions the Service Account holds. This is the #1 cause of GCP account compromises.

**The Architectural Fix (Short-Lived Credentials):**
Modern GCP architecture dictates that you should *almost never* download a static JSON key. 
* If the code is running on a GCP Virtual Machine, Cloud Run, or GKE, simply attach the Service Account to the compute resource. Google's metadata server seamlessly and securely hands short-lived, rotating tokens to the application automatically. No JSON keys required.
* If the developer needs to run the code locally on their laptop, they should use **Service Account Impersonation**. They authenticate with their own human credentials via `gcloud auth login`, and then request a short-lived token (valid for 1 hour) to temporarily impersonate the Service Account.

## Summary

Service Accounts are machine identities used by applications to authenticate to GCP APIs. Because they act as both identities and resources, they present a massive privilege escalation risk. Administrators must tightly restrict the `Service Account User` role (`actAs` permission) to prevent users from attaching highly privileged Service Accounts to compute resources they control. Finally, static JSON keys should be completely avoided in favor of metadata-server tokens and short-lived Service Account Impersonation.

## What's Next

We know how to avoid JSON keys if our code runs inside GCP. But what if our code runs in GitHub Actions, or on an AWS EC2 instance, and needs to access GCP? Next, we explore Workload Identity Federation.