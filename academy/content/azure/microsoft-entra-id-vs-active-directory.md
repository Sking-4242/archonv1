---
title: "Microsoft Entra ID vs. Active Directory"
type: content
estimated_minutes: 12
cert_tags: ["az_900", "az_104", "az_500", "az_305"]
---

# Microsoft Entra ID vs. Active Directory

## Overview

One of the greatest conceptual hurdles when learning Azure identity management is overcoming the legacy of Windows Server Active Directory (AD). For decades, AD has been the undisputed king of enterprise identity. When Microsoft launched their cloud identity provider, they originally called it "Azure Active Directory." They recently renamed it to **Microsoft Entra ID**. 

This was not just a marketing rebrand; it was a necessary correction. Microsoft Entra ID is **not** Windows Server AD running in the cloud. They are fundamentally different technologies engineered for entirely different eras of computing. Understanding the architectural differences between the two is a strict requirement for the AZ-104 and AZ-500 exams.

## The On-Premises Paradigm: Windows Server AD

Windows Server AD was built for a world with physical boundaries. It assumes that a user's computer, the file server they want to access, and the Domain Controller authenticating them are all connected to the same corporate Local Area Network (LAN). 

Because it operates inside a trusted network perimeter, Windows Server AD relies on legacy authentication protocols:
* **LDAP (Lightweight Directory Access Protocol):** Used to query and modify directory data.
* **Kerberos & NTLM:** The core authentication protocols.

Kerberos works brilliantly on a LAN, but it has a fatal flaw in the cloud era: it relies on "tickets" and cannot easily traverse firewalls or operate over the open internet. You cannot securely use Kerberos to authenticate a remote employee logging into a SaaS application like Salesforce or Microsoft 365 from a coffee shop. 

## The Cloud Paradigm: Microsoft Entra ID



Microsoft Entra ID was built for a world with no perimeter. In the cloud, the identity *is* the security perimeter. It assumes that users, devices, and applications are scattered across the globe and connecting over the public internet.

To achieve this, Entra ID completely abandons LDAP, Kerberos, and NTLM. Instead, it speaks the modern languages of the web:
* **REST APIs (Microsoft Graph):** Used to query and modify directory data over HTTPS.
* **SAML 2.0, OpenID Connect, and OAuth 2.0:** Modern, token-based authentication and authorization protocols designed to work securely over HTTP/HTTPS.

Because it uses web protocols, Entra ID allows for seamless federation. An application running in AWS, a SaaS app like Workday, and an Azure Virtual Machine can all trust the same Entra ID token. 

## The "Domain Join" Dilemma

In traditional AD, you "join" a Windows machine to a domain. This creates a deep trust relationship where the machine downloads Group Policy Objects (GPOs) that dictate its security settings, wallpaper, and registry keys.

You **cannot** traditionally domain-join a server directly to Microsoft Entra ID. Entra ID does not support OUs (Organizational Units) or GPOs. Instead, devices can be "Entra Joined" or "Entra Registered," which allows them to be managed via Mobile Device Management (MDM) solutions like Microsoft Intune rather than legacy Group Policy.

*Exam Note:* If an exam scenario states that an organization is migrating legacy applications to Azure Virtual Machines that hard-code Kerberos or require LDAP queries, standard Entra ID will not work. You must recommend **Microsoft Entra Domain Services (Entra DS)**, a managed service that provides traditional Kerberos, NTLM, and LDAP capabilities in the cloud while synchronizing identities from Entra ID.

## Summary

Never treat Microsoft Entra ID as merely "AD in the cloud." Windows Server AD is a legacy, LAN-bound directory service relying on Kerberos and Group Policy. Microsoft Entra ID is a highly scalable, globally distributed Identity and Access Management (IAM) control plane that uses modern web protocols (SAML, OAuth) to authenticate users across any cloud or SaaS application. 

## What's Next

Now that we understand what Entra ID is, we will look at how it governs authorization within Azure using Role-Based Access Control (RBAC) and how it compares to AWS IAM Policies.