---
title: "Protecting Data in Transit"
type: content
estimated_minutes: 16
cert_tags: ["SCS-C03"]
---

# Protecting Data in Transit

## Overview

Data is most exposed when it moves — between a client and a service, between services, between AWS and on-premises. The Security Specialty exam's Data Protection domain (18%) begins with *designing and implementing controls for data in transit* (Task 5.1): requiring encryption when connecting to resources, providing secure and private access paths, and encrypting traffic between resources. The exam expects you to enforce TLS rather than merely allow it, choose private connectivity over the public internet, and apply inter-node encryption for distributed systems — all design-and-implement skills tested with concrete scenarios.

The principle is **encrypt in transit, everywhere, and prefer private paths**. Allowing TLS is not enough; an attacker can downgrade or intercept plaintext connections, so the specialty discipline is to *require* encryption (reject unencrypted connections) and to keep sensitive traffic off the public internet entirely where possible. AWS provides the mechanisms: TLS termination and policies on load balancers and CloudFront, ACM for certificate management, PrivateLink and VPC endpoints for private service access, and inter-node encryption options for distributed data services. The candidate must know how to *enforce* encryption (not just enable it), how to manage the certificates behind it, and how to make access private and identity-aware. Many exam questions hinge on the difference between "TLS is available" and "plaintext is impossible."

This lesson covers enforcing TLS, certificate management with ACM, private access paths, and inter-node encryption. After it you will be able to design controls that guarantee data is encrypted and privately routed in transit.

---

## Core Concepts

### Enforcing TLS, Not Just Allowing It

The first specialty distinction is **enforcement**. Many services accept both encrypted and unencrypted connections by default, so security requires *requiring* TLS. Techniques: an **S3 bucket policy** that denies requests where `aws:SecureTransport` is `false` (blocking any non-HTTPS access); **ELB/ALB security policies** that specify minimum TLS versions and strong cipher suites and an HTTPS listener that redirects or rejects HTTP; **API Gateway** and **CloudFront** configured to require HTTPS (viewer protocol policy redirect-to-HTTPS or HTTPS-only); and database/connection settings (e.g., RDS parameter `rds.force_ssl`, or requiring TLS on Redshift/ElastiCache). The exam repeatedly tests the pattern "ensure clients *must* use encryption," which means an explicit deny of insecure transport or an enforced HTTPS-only configuration — not just an enabled certificate.

### TLS Policies and Strong Configurations

Enforcing TLS also means enforcing *strong* TLS. **ELB security policies** define which TLS protocol versions and ciphers a load balancer accepts; choosing a modern policy disables weak protocols (old TLS versions) and weak ciphers. CloudFront similarly lets you set a minimum TLS version for viewer connections and uses strong ciphers. The exam expects you to remove legacy TLS/cipher support when a requirement says "use only strong, modern encryption," and to recognize ELB security policies / CloudFront minimum-TLS settings as the levers.

### Certificate Management with ACM

TLS needs certificates, and **AWS Certificate Manager (ACM)** provisions, manages, and **auto-renews** public TLS certificates for use with integrated services (CloudFront, ALB, API Gateway). ACM-managed public certs renew automatically, eliminating expiry outages, and the private key is protected. For **private** certificates (internal services, mutual TLS, IoT), **AWS Private Certificate Authority (Private CA)** issues and manages an internal PKI. A key exam nuance: ACM public certificates integrate with specific AWS services and can't be exported for use on arbitrary servers (use Private CA or imported certs for those). The exam pairs "managed, auto-renewing TLS certs for AWS services" with ACM and "internal PKI / private certificates / mTLS" with Private CA.

### Private and Secure Access Paths

Encrypting traffic is stronger when the traffic also avoids the public internet. The mechanisms (from the connectivity lesson, applied to data protection): **AWS PrivateLink / VPC endpoints** keep traffic to AWS services on the private AWS network (interface endpoints with endpoint policies; gateway endpoints for S3/DynamoDB); **AWS Client VPN** gives remote users an encrypted path into a VPC; and **AWS Verified Access** provides identity- and device-aware access to applications without a broad VPN. For data in transit, the exam wants you to combine **encryption** (TLS) with **private routing** (endpoints/PrivateLink) so sensitive data is both encrypted and never exposed on the internet — for example, an isolated workload reaching Secrets Manager via an interface endpoint over TLS, with an endpoint policy restricting it.

### Inter-Node and Inter-Service Encryption

Distributed data services move data *between their own nodes*, and that internal traffic must be encrypted too. The exam names inter-node encryption for systems like **Amazon EMR** (in-transit encryption between cluster nodes), **Amazon EKS** (encrypting pod-to-pod and control-plane traffic), and **SageMaker** (inter-container/inter-node traffic for distributed training). It also references **Nitro-based encryption**: many current EC2 instance types automatically encrypt traffic between instances within a VPC at the hardware (Nitro) level. The principle: don't assume internal cluster traffic is safe because it's "inside" — enable the service's in-transit encryption options for node-to-node communication when handling sensitive data. The exam tests recognizing that distributed services have their own inter-node encryption settings distinct from the client-facing TLS.

### VPN and Hybrid Encryption in Transit

Data in transit also includes traffic to and from on-premises and other clouds, which overlaps Infrastructure Security but is squarely a data-protection concern. The mechanisms: **Site-to-Site VPN** encrypts hybrid traffic with IPsec over the internet; **Direct Connect** is private but **not encrypted by default**, so add **MACsec** (Layer 2 line-rate encryption on supported dedicated connections) or run an **IPsec VPN over Direct Connect** when encryption in transit is required; and **TLS** still protects application-layer traffic on top of any of these. The exam's recurring data-protection trap is assuming a private path equals an encrypted path — Direct Connect provides isolation and consistent performance but does not cryptographically protect the bytes unless you add MACsec or VPN. When a requirement says "encrypt all data in transit between on-premises and AWS," a bare Direct Connect is insufficient; layer encryption on top. This reinforces the principle that *private* and *encrypted* are distinct properties, and sensitive hybrid data should have both.

### Mutual TLS and Client Authentication

Beyond server-side TLS, some scenarios require **mutual TLS (mTLS)** where the *client* also presents a certificate, authenticating both ends — supported by **API Gateway** (mTLS for APIs) and used in zero-trust and B2B integrations, backed by Private CA for issuing client certs. The exam may present "authenticate the client with a certificate, not just encrypt the channel," which points to mTLS with Private CA.

---

### Enforcing Encryption in Transit Org-Wide

At specialty scale, encryption-in-transit enforcement shouldn't depend on each team remembering to configure it — it should be governed centrally. Two mechanisms recur: **Service Control Policies (SCPs)** can deny actions that would create insecure configurations or require conditions (for example, denying object access without `aws:SecureTransport`), applying the guardrail across every account in the organization; and **AWS Config rules** (with conformance packs) continuously detect non-compliant resources — load balancer listeners allowing weak TLS, S3 buckets without an HTTPS-only policy, unencrypted in-transit settings — and can trigger automatic remediation. Combined, SCPs prevent insecure transport from being configured and Config detects and fixes drift where it slips through. The exam expects the specialty-level answer to enforce TLS as an organization-wide, automatically-verified control, not a per-resource manual setting — the same centralized-governance posture applied to encryption that Domain 6 applies to configuration generally.

## Configuration Reference

Enforcing encryption in transit:

```text
Service        Enforce TLS by...
-------------- ------------------------------------------------------
S3             bucket policy Deny when aws:SecureTransport = false
ALB/NLB        HTTPS listener + strong ELB security policy; redirect/deny HTTP
CloudFront     viewer protocol policy = redirect-to-HTTPS / HTTPS-only; min TLS version
API Gateway    require HTTPS; optional mutual TLS (client certs)
RDS / Redshift / ElastiCache  require SSL/TLS (e.g., rds.force_ssl), in-transit encryption
```

Certificates:

```text
ACM (public)        managed, auto-renewing certs for CloudFront/ALB/API Gateway (not exportable)
AWS Private CA      internal PKI: private certs, mTLS client certs, IoT
```

Private access + inter-node:

```text
PrivateLink / VPC endpoints   private path to AWS services (+ endpoint policies)
Client VPN / Verified Access  encrypted / zero-trust user access
Inter-node encryption          EMR, EKS, SageMaker in-transit options; Nitro VPC encryption
```

---

## How to Decide

- **Force clients to use encryption (no plaintext)?** → deny insecure transport (S3 `aws:SecureTransport`), HTTPS-only listeners/distributions, `rds.force_ssl`.
- **Use only strong TLS versions/ciphers?** → modern ELB security policy / CloudFront minimum TLS.
- **Managed, auto-renewing public certs for AWS services?** → ACM. **Internal PKI / mTLS client certs?** → Private CA.
- **Keep sensitive traffic off the internet?** → PrivateLink / VPC endpoints (with endpoint policies).
- **Encrypt traffic between cluster nodes (EMR/EKS/SageMaker)?** → enable the service's in-transit/inter-node encryption.
- **Authenticate the client, not just encrypt?** → mutual TLS (API Gateway + Private CA).

---

## How This Connects

This lesson opens Data Protection and overlaps Infrastructure Security (PrivateLink, Verified Access, Direct Connect/MACsec from the connectivity lesson) — together they secure traffic both at the network and the encryption layer. ACM and Private CA connect to the key-and-certificate management in the secrets lesson, and enforcing TLS connects to compliance requirements (Domain 6) and to KMS (which protects the data once it's at rest).

---

## Exam Traps

- **Allowing TLS instead of requiring it.** Enforce — deny `aws:SecureTransport=false`, HTTPS-only, `rds.force_ssl` — don't just enable a certificate.
- **Leaving weak TLS/ciphers enabled.** Use a modern ELB security policy / CloudFront minimum TLS to drop legacy protocols.
- **Trying to export ACM public certificates.** ACM public certs integrate with specific AWS services and aren't exportable; use Private CA or imported certs elsewhere.
- **Assuming internal cluster traffic is safe.** Enable inter-node in-transit encryption for EMR/EKS/SageMaker handling sensitive data.
- **Encrypting but routing over the internet.** Combine TLS with PrivateLink/endpoints to keep sensitive traffic private.
- **Server-only TLS when client auth is required.** Use mutual TLS (Private CA) when both ends must authenticate.

---

## Summary

Protecting data in transit means encrypting everywhere and preferring private paths — and crucially *enforcing*, not merely allowing, encryption. Require TLS with controls like an S3 `aws:SecureTransport` deny, HTTPS-only load balancer listeners and CloudFront distributions, and `rds.force_ssl`, and enforce strong protocols/ciphers via ELB security policies and CloudFront minimum-TLS settings. Manage certificates with ACM (auto-renewing public certs for AWS services, not exportable) and AWS Private CA (internal PKI, private and mTLS client certificates). Keep sensitive traffic off the public internet with PrivateLink and VPC endpoints, and secure user access with Client VPN or zero-trust Verified Access. Don't forget inter-node encryption for distributed services (EMR, EKS, SageMaker) and Nitro-level VPC encryption. Where both ends must authenticate, use mutual TLS backed by Private CA.

---

## Examples

**Example 1 — Enforce HTTPS to S3.** A requirement says objects must never be accessed over plaintext → an **S3 bucket policy denying** requests with `aws:SecureTransport = false`.

**Example 2 — Strong TLS only.** A compliance rule bans legacy TLS → set a modern **ELB security policy** and a **CloudFront minimum TLS version**, dropping old protocols.

**Example 3 — Private + encrypted.** An isolated workload must reach Secrets Manager without internet exposure → an **interface VPC endpoint (PrivateLink)** over TLS with an endpoint policy.

**Example 4 — Inter-node.** An EMR cluster processes regulated data → enable **in-transit encryption between cluster nodes**, not just client TLS.

---

## Think About It

A team enables an ACM certificate on their load balancer and considers data-in-transit "done," but a pen test still captures plaintext traffic and notes weak ciphers and internet-exposed internal calls. Identify the three gaps (enforcement, cipher strength, private routing) and the specific control that closes each.

---

## Quick Check

1. How do you *require* (not just allow) encryption for access to an S3 bucket?
2. What is the difference between ACM and AWS Private CA, and what can't you do with an ACM public certificate?
3. How do you keep sensitive in-transit traffic off the public internet while still encrypting it?
4. Why might "internal" cluster traffic still need an encryption setting?

*Answers: (1) attach a bucket policy that denies requests where aws:SecureTransport is false, so only HTTPS works; (2) ACM provisions and auto-renews public TLS certificates for integrated AWS services (CloudFront/ALB/API Gateway) and its public certs aren't exportable, while AWS Private CA runs an internal PKI for private and mutual-TLS client certificates; (3) route it through PrivateLink/VPC endpoints (with endpoint policies) so it stays on the private AWS network while still using TLS; (4) distributed services (EMR, EKS, SageMaker) move data between their own nodes, and that inter-node traffic needs the service's in-transit encryption enabled — "inside the VPC" is not automatically encrypted unless using Nitro-level or service-level encryption.*

---

## What's Next

Next: **AWS KMS Deep Dive** — key types, key policies vs. grants, encryption context, envelope encryption, and multi-Region keys.
