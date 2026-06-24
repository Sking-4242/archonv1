---
title: "Secure Hybrid and Private Connectivity"
type: content
estimated_minutes: 17
cert_tags: ["SCS-C03"]
---

# Secure Hybrid and Private Connectivity

## Overview

Few AWS environments are islands — they connect to on-premises data centers, to other clouds, and to AWS services that should never traverse the public internet. The Security Specialty exam's Task 3.3 includes designing **secure connectivity between hybrid and multi-cloud networks** and determining secure communication requirements between hybrid environments and AWS, while Task 5.1 (Data Protection) overlaps with private access mechanisms. The exam expects you to choose and secure the right connectivity option — VPN, Direct Connect, PrivateLink, Client VPN, Verified Access — and to understand the encryption and access-control properties of each.

The unifying theme is **private, encrypted, identity-aware connectivity**. The internet is hostile; the specialty discipline keeps traffic off it where possible (private connectivity), encrypts it where it must traverse untrusted networks (VPN, MACsec, TLS), and increasingly gates access by *identity and device posture* rather than just network location (Verified Access). Each option has distinct security properties — a VPN encrypts over the internet, Direct Connect is private but not encrypted by default, PrivateLink keeps service traffic on the AWS backbone, and Verified Access replaces broad VPN tunnels with per-application zero-trust access. Choosing correctly for a given requirement, and layering encryption appropriately, is exactly what the exam tests.

This lesson covers Site-to-Site VPN, Direct Connect and MACsec, PrivateLink and VPC endpoints, Client VPN, and Verified Access. After it you will be able to design secure hybrid and private connectivity matched to security requirements.

---

## Core Concepts

### Site-to-Site VPN — Encrypted Over the Internet

**AWS Site-to-Site VPN** establishes **IPsec-encrypted tunnels** between your on-premises network (a customer gateway) and AWS (a virtual private gateway or transit gateway). Its defining property: it runs **over the public internet but is encrypted**, so traffic is protected in transit even on an untrusted path. It's quick to set up and cost-effective, with two tunnels for redundancy. The trade-offs are variable internet performance and bandwidth limits. The exam picks Site-to-Site VPN for "encrypted hybrid connectivity quickly / cost-effectively," and as a backup for Direct Connect.

### Direct Connect — Private but Not Encrypted by Default

**AWS Direct Connect (DX)** provides a **dedicated, private physical connection** between your data center and AWS, bypassing the public internet entirely. Its security nuance is critical and frequently tested: Direct Connect is **private but not encrypted by default** — it provides consistent performance and a private path, but the data itself isn't cryptographically protected unless you add encryption. To encrypt over Direct Connect you either run an **IPsec VPN over the Direct Connect** connection (defense in depth: private path + encryption) or, for the dedicated connections that support it, enable **MACsec (MAC Security)** — Layer 2 encryption on the Direct Connect link itself. The exam expects you to know that "Direct Connect alone isn't encrypted; add VPN-over-DX or MACsec when encryption in transit is required."

### MACsec — Layer 2 Encryption on Direct Connect

**MACsec** provides point-to-point **Layer 2 encryption** on supported dedicated Direct Connect connections (typically 10 Gbps and 100 Gbps), encrypting traffic at line rate between your router and the AWS Direct Connect device. It's the answer when a requirement demands encryption of Direct Connect traffic with minimal performance impact and without the overhead of an IPsec VPN. The exam mentions MACsec specifically as a Direct Connect encryption option, distinguishing it from VPN-over-DX (Layer 3 IPsec).

### PrivateLink and VPC Endpoints — Private Service Access

**AWS PrivateLink** and **VPC endpoints** keep traffic to AWS services (and to third-party/partner services) on the **AWS private network**, never traversing the internet. Two endpoint types: a **Gateway endpoint** (free, for S3 and DynamoDB) adds a route so traffic to those services stays private; an **Interface endpoint** (PrivateLink, for most other services) creates an ENI in your subnet that privately reaches the service. **Endpoint policies** further restrict *which* resources/actions the endpoint allows, adding an access-control layer. PrivateLink also lets you privately expose *your own* services to other VPCs/accounts/customers without VPC peering or internet exposure. For security, endpoints mean a private/isolated subnet can use AWS services without any internet route, and endpoint policies enforce least privilege at the network-to-service boundary. The exam pairs "access AWS services privately, no internet" with VPC endpoints/PrivateLink, and tests endpoint policies as a control.

### Client VPN — Secure Remote User Access

**AWS Client VPN** provides remote *users* (not site-to-site) with secure, authenticated access into a VPC over a TLS VPN, with authentication via Active Directory, SAML federation, or certificates, and authorization rules controlling which network ranges each user can reach. It's the managed option for "remote workforce needs secure access to private AWS resources." Its trade-off versus newer approaches is that it grants network-level access (an IP range), which is broader than per-application access.

### AWS Verified Access — Zero-Trust Application Access

**AWS Verified Access** provides **secure access to corporate applications without a VPN**, using **zero-trust** principles: every request is evaluated against **access policies** based on **identity** (from an IdP) and **device posture** (from a device-management/trust provider) before access is granted, on a per-application basis. Instead of putting a user on the network (VPN) and trusting them broadly, Verified Access grants access to *one application* only when the identity and device conditions are met, and logs every access decision. The exam favors Verified Access for "replace VPN with identity- and device-aware, per-application zero-trust access" and for reducing the broad network exposure that traditional VPNs create. It's a strategic shift from network-location trust to continuous, contextual authorization.

### Centralized Connectivity and Inspection with Transit Gateway

At scale, hybrid and multi-VPC connectivity is consolidated through **AWS Transit Gateway**, which acts as a cloud router connecting many VPCs, VPNs, and Direct Connect gateways. For security this matters because Transit Gateway enables **centralized inspection and segmentation**: traffic between VPCs (east-west) and between on-premises and AWS can be routed through a dedicated **inspection VPC** running AWS Network Firewall, so all cross-environment traffic is inspected and filtered in one place rather than per-VPC. Transit Gateway **route tables** also enforce segmentation by controlling which attachments can reach which — for example, allowing every VPC to reach shared services but preventing two business-unit VPCs from reaching each other. The exam expects you to recognize Transit Gateway plus a central inspection VPC as the pattern for **scalable, centrally inspected, segmented** hybrid and multi-account networking, rather than a mesh of point-to-point VPN or peering connections that are hard to inspect and govern.

### Choosing and Layering

These options layer. A hybrid environment might use **Direct Connect** for a private, high-performance path, **MACsec or VPN-over-DX** to encrypt it, **PrivateLink/endpoints** so workloads reach AWS services without internet, and **Verified Access** so employees reach internal apps with zero-trust rather than a flat VPN. The specialty skill is matching each requirement — performance, encryption, private service access, remote users, zero-trust — to the right mechanism and combining them for defense in depth.

---

## Configuration Reference

Connectivity options by purpose and security property:

```text
Option                 Path            Encryption                 Best for
---------------------- --------------- -------------------------- -------------------------
Site-to-Site VPN       over internet   IPsec (encrypted)          quick/cheap encrypted hybrid
Direct Connect (DX)    private/dedicated NOT encrypted by default consistent private performance
  + VPN over DX        private         IPsec (L3)                 private path + encryption
  + MACsec             private         L2 line-rate encryption    encrypt DX with minimal overhead
PrivateLink / endpoints AWS backbone   private (TLS to service)   private access to AWS/partner svcs
Client VPN             over internet   TLS                        remote USER access into a VPC
Verified Access        n/a (per-app)   TLS + zero-trust policy    VPN-less, identity+device app access
```

Key exam distinctions:

```text
DX is private but NOT encrypted → add VPN-over-DX or MACsec for encryption in transit
Gateway endpoint = S3/DynamoDB (free); Interface endpoint = PrivateLink (most services)
Endpoint policies restrict which actions/resources the endpoint permits
Client VPN = network-level remote access; Verified Access = per-application zero-trust
```

---

## How to Decide

- **Encrypted hybrid link, fast to set up, cost-sensitive?** → Site-to-Site VPN.
- **Private, consistent-performance path to AWS?** → Direct Connect — and add **MACsec** or **VPN-over-DX** if encryption is required.
- **Reach AWS services privately with no internet route?** → VPC endpoints / PrivateLink (with endpoint policies for least privilege).
- **Remote employees need access into a VPC?** → Client VPN (network-level).
- **Replace VPN with identity- and device-aware, per-app access?** → AWS Verified Access (zero-trust).
- **Expose your own service privately to other accounts/customers?** → PrivateLink.

---

## How This Connects

This lesson completes the Infrastructure Security domain alongside the edge, compute, and network-controls lessons, and overlaps Data Protection (encryption in transit, Task 5.1 — VPN/MACsec/TLS, PrivateLink). PrivateLink/endpoints connect to the isolated-subnet segmentation from the previous lesson, Verified Access connects to IAM/identity (Domain 4), and secure hybrid connectivity underpins multi-account and on-premises governance (Domain 6).

---

## Exam Traps

- **Assuming Direct Connect is encrypted.** DX is private but **not encrypted by default** — add MACsec or VPN-over-DX when encryption in transit is required.
- **Confusing VPN and Direct Connect.** VPN is encrypted over the internet; DX is a private dedicated path (encryption optional).
- **Confusing Client VPN and Site-to-Site VPN.** Client VPN is for remote *users*; Site-to-Site connects *networks*.
- **Forgetting endpoint policies.** VPC endpoints support policies to restrict actions/resources — a least-privilege control, not just connectivity.
- **Using a flat VPN where zero-trust is wanted.** Verified Access grants per-application, identity/device-aware access instead of broad network access.
- **Gateway vs. interface endpoints.** Gateway endpoints are only for S3 and DynamoDB (and free); other services use interface endpoints (PrivateLink).

---

## Summary

Secure connectivity keeps traffic private, encrypted, and increasingly identity-aware. Site-to-Site VPN encrypts hybrid traffic with IPsec over the internet — quick and cheap. Direct Connect provides a private, high-performance path but is **not encrypted by default**, so add MACsec (Layer 2, line-rate) or VPN-over-DX (Layer 3 IPsec) when encryption is required. PrivateLink and VPC endpoints keep service traffic on the AWS backbone with no internet exposure (gateway endpoints for S3/DynamoDB, interface endpoints for the rest), and endpoint policies enforce least privilege. Client VPN gives remote users network-level access, while AWS Verified Access replaces broad VPNs with zero-trust, per-application access gated by identity and device posture and fully logged. Match each requirement to the right mechanism and layer them for private, encrypted, least-exposure connectivity.

---

## Examples

**Example 1 — Encrypted DX.** A bank requires a private path to AWS *and* encryption in transit → **Direct Connect** with **MACsec** (or an IPsec VPN over the DX) — private alone isn't enough.

**Example 2 — Private service access.** Workloads in an isolated subnet must use S3 and Secrets Manager without internet → **gateway endpoint** for S3 and **interface endpoints (PrivateLink)** for Secrets Manager, with endpoint policies.

**Example 3 — Zero-trust apps.** A company wants to retire its VPN and grant access to internal apps based on user identity and device health → **AWS Verified Access**.

**Example 4 — Remote workforce.** Remote engineers need secure access to private resources in a VPC → **AWS Client VPN** with SAML authentication and authorization rules.

---

## Think About It

A security team believes their on-premises-to-AWS traffic is safe "because we use Direct Connect." Explain why that belief is incomplete, the two ways to add encryption to a Direct Connect link, and when you would additionally choose Verified Access over their existing VPN for employee access to internal applications.

---

## Quick Check

1. Is AWS Direct Connect encrypted by default, and how do you add encryption if required?
2. What is the difference between Site-to-Site VPN and AWS Client VPN?
3. How do VPC endpoints/PrivateLink improve security, and what does an endpoint policy add?
4. How does AWS Verified Access differ from a traditional VPN?

*Answers: (1) no — Direct Connect is a private dedicated path but not encrypted by default; add MACsec (Layer 2 line-rate encryption on supported dedicated connections) or run an IPsec VPN over the Direct Connect; (2) Site-to-Site VPN connects whole networks (on-premises to AWS) with IPsec, while Client VPN gives individual remote users authenticated access into a VPC over TLS; (3) they keep traffic to AWS/partner services on the private AWS network with no internet exposure, and an endpoint policy restricts which actions and resources the endpoint permits (least privilege at the network-to-service boundary); (4) Verified Access grants per-application access only when identity and device-posture policies are met (zero-trust, fully logged), rather than placing a user on the network with broad access as a VPN does.*

---

## What's Next

You've completed Module 3 (Infrastructure Security). Next module: **Identity and Access Management** — the largest domain — starting with authentication strategies and federation.
