---
title: "Cloud Identity & Google Workspace: The Identity Provider"
type: content
estimated_minutes: 10
cert_tags: ["cdl", "ace", "pca"]
---

# Cloud Identity & Google Workspace: The Identity Provider

## Overview

In AWS, if you want to grant a new engineer access to the console, you log into the AWS IAM dashboard, click "Create User," and generate a password. 

**You cannot do this in Google Cloud.** GCP does not have an internal user directory. It does not store passwords, and it does not manage human user accounts. Instead, GCP completely outsources human identity management to an external Identity Provider (IdP). Understanding this separation is the first step to mastering GCP security.

## The Two Google Directories

To log into GCP, a user must have a Google account. For enterprise environments, this account is managed by one of two services:

**1. Google Workspace (formerly G Suite)**
If your company uses Gmail, Google Drive, and Google Docs, you already have Google Workspace. The exact same username and password an employee uses to check their email is used to log into the GCP Console. 

**2. Cloud Identity**
What if your company uses Microsoft Office 365 and you don't want to pay for Gmail licenses just so your engineers can log into GCP? You use **Cloud Identity**. Cloud Identity is a free Identity as a Service (IDaaS) solution. It provides the exact same directory, groups, and endpoint management features as Google Workspace, but strips away the email and collaboration apps.

## Federation (Active Directory / Entra ID)

Most massive enterprises already have a central source of truth for identities, usually Microsoft Active Directory or Microsoft Entra ID. 

Google Workspace and Cloud Identity act as the bridge. You configure **Federation** (via SAML and SCIM) between Entra ID and Cloud Identity. 
* When HR hires a new engineer, they create the account in Entra ID.
* The account automatically syncs to Cloud Identity.
* When the engineer navigates to `console.cloud.google.com`, GCP redirects them to the Microsoft login page. 
* If HR terminates the engineer in Entra ID, their access to GCP is instantly revoked.

## Google Groups (The Architectural Best Practice)

When applying IAM permissions in GCP, **you should almost never assign a role directly to an individual user's email address.** If you assign the `Compute Admin` role directly to `john@archon.academy`, and John transfers to a different department, an administrator has to hunt down every specific Project where John was individually granted access to remove it. 

*The Best Practice:* Always create a Google Group (e.g., `gcp-network-admins@archon.academy`). Assign the IAM role to the Group. Then, add or remove John from the Group in Cloud Identity. The GCP permissions will automatically align.

## Summary

GCP strictly separates the management of cloud resources from the management of human identities. GCP does not have "IAM Users." Instead, identities are managed in Google Workspace or Cloud Identity, which are often federated with an external IdP like Microsoft Entra ID. To ensure scalable, secure access control, architects must enforce the use of Google Groups rather than attaching permissions to individual human accounts.

## What's Next

Now that we know *who* the users are, we must define *what* they can do. Next, we explore the three tiers of GCP IAM Roles: Basic, Predefined, and Custom.