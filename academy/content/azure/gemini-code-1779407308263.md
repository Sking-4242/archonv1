---
title: "Conditional Access & Zero Trust Architecture"
type: content
estimated_minutes: 9
cert_tags: ["az_104", "az_500", "az_305"]
---

# Conditional Access & Zero Trust Architecture

## Overview

The traditional network security model operated like a castle with a moat: build a massive firewall, assume everyone inside the network is trusted, and assume everyone outside is a threat. Cloud computing shattered this model. Users now access corporate data from personal smartphones at coffee shops using third-party SaaS applications. 

Microsoft Entra ID addresses this reality through **Conditional Access**, the technical engine that enforces the modern security philosophy known as Zero Trust. Zero Trust operates on a simple premise: *Never trust, always verify.*

## The Core Concept: If / Then

Conditional Access policies are essentially advanced "If / Then" statements evaluated by Microsoft Entra ID at the exact moment an identity attempts to authenticate. 

**The "If" (Signals / Conditions)**
When a user types in their password, Entra ID analyzes the real-time context of the login attempt:
* **User/Group:** Is this the CEO or a summer intern?
* **Location:** Is the login coming from the corporate headquarters IP address, or from an anonymous VPN in a foreign country?
* **Device State:** Is this a corporate-issued, Intune-managed laptop with the latest antivirus updates, or an unmanaged personal iPad?
* **Sign-in Risk:** Did Microsoft's threat intelligence detect that these credentials were recently sold on the dark web?

**The "Then" (Decisions / Controls)**
Based on the combined context of those signals, the Conditional Access engine makes an immediate, automated decision:
* **Block Access:** The risk is too high (e.g., login attempt from an embargoed country).
* **Grant Access:** The context is safe.
* **Require MFA:** The password is correct, but the user is logging in from a new location. Prompt them for a Multi-Factor Authentication token.
* **Require Compliant Device:** Force the user to switch from their personal iPad to their corporate laptop to view the requested data.

## Privileged Identity Management (PIM)

Conditional Access secures everyday logins. But what about highly privileged administrators? 

If an engineer holds the "Owner" RBAC role on a production subscription, a compromise of their account is catastrophic. Historically, administrators held these powerful roles 24/7, 365 days a year, even when they were sleeping or on vacation. This violates the principle of least privilege.

Azure solves this with **Privileged Identity Management (PIM)**. PIM provides "Just-In-Time" (JIT) privileged access. 

With PIM enabled, the engineer has zero administrative rights by default. When a server goes down at 2 AM, the engineer logs into the Azure Portal and *requests* elevation to the Owner role. 
PIM intercepts the request and can enforce several safeguards:
* Require the engineer to provide a ticketing system number as justification.
* Force a fresh MFA prompt.
* Route the request to a manager for manual approval.
* Automatically strip the Owner rights away after exactly 2 hours.

## Summary

Conditional Access is the heart of Azure's Zero Trust architecture, analyzing real-time signals (location, device health, user risk) to enforce dynamic access controls (require MFA, block access). For highly sensitive administrative roles, Privileged Identity Management (PIM) eliminates standing access by requiring administrators to explicitly request Just-In-Time, time-bound elevation.

## What's Next

Now that we understand the foundations of infrastructure, identity, and authorization, Module 3 will dive into the core workload of the cloud: Compute Services and Azure Virtual Machines.