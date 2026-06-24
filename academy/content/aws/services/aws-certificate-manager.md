---
title: "AWS Certificate Manager (ACM)"
type: content
estimated_minutes: 14
cert_tags: ["CLF-C02", "SAA-C03", "SOA-C03", "SCS-C03"]
---

# AWS Certificate Manager (ACM)

## Overview

AWS Certificate Manager (ACM) provisions, manages, and **automatically renews** SSL/TLS certificates for use with AWS services, so you can enable HTTPS/TLS on your applications without manually buying, installing, and rotating certificates. It removes the most error-prone parts of TLS: issuance, deployment, and renewal. This *service reference* lesson covers public vs. private certificates, where ACM certificates can be used, the renewal model, and what each certification expects.

ACM matters because TLS is essential for encryption in transit, but managing certificates by hand is a frequent source of outages — an expired certificate takes a site offline, and manual renewal is easy to forget. ACM provides **free public certificates** that AWS issues and **automatically renews and re-deploys**, eliminating that whole class of failure for AWS-integrated endpoints. The core mental model is that ACM issues a certificate, you **associate it with an integrated AWS service** (like a load balancer or CloudFront distribution) that terminates TLS, and ACM handles renewal transparently — you never touch private keys.

---

## How It Works

ACM issues two kinds of certificates:

- **Public certificates** — free, issued by Amazon's public certificate authority and trusted by browsers. You request one for your domain and prove control via **DNS validation** (add a CNAME record — the recommended method, since it enables fully automatic renewal) or **email validation**. ACM then **auto-renews** public certificates before expiry and re-deploys them to associated services with no action from you.
- **Private certificates** — issued by **AWS Private CA** (a separate, paid service) for internal/private PKI use (internal services, mutual TLS), trusted within your organization rather than by public browsers.

A crucial constraint: ACM certificates are used by **integrating AWS services that terminate TLS** — you **cannot export the private key** of a public ACM certificate to install on an arbitrary server. The integrated services include **Elastic Load Balancing (ALB/NLB)**, **Amazon CloudFront**, **API Gateway**, and **AWS App Runner/Global Accelerator**. A certificate is **Regional** (used by services in its Region), with the notable exception that **CloudFront requires the certificate in us-east-1**.

---

## Key Features

- **Free public certificates** with **automatic renewal and re-deployment** (with DNS validation).
- **DNS or email validation**; DNS validation enables hands-off renewal.
- **Tight integration** with ELB, CloudFront, API Gateway, App Runner, and Global Accelerator for TLS termination.
- **AWS Private CA** for internal PKI, mutual TLS, and issuing private certificates at scale.
- **No private-key handling** for public certs — AWS manages keys securely.
- **CloudWatch/EventBridge** expiry notifications and certificate monitoring.

---

## Configuration Reference

- **Request a public certificate** for your domain(s) (including wildcard or SANs) and validate via **DNS** (CNAME) for automatic renewal.
- **Associate** the certificate with the TLS-terminating service (ALB/NLB listener, CloudFront distribution, API Gateway custom domain); for **CloudFront**, request/import the certificate in **us-east-1**.
- **Use AWS Private CA** for internal certificates and mutual TLS.
- **Monitor expiry** via ACM/EventBridge, especially for imported certificates (which ACM does not auto-renew).

---

## Operations and Troubleshooting

- **Certificate "pending validation."** Complete **DNS/email validation**; the required CNAME must be present in the domain's DNS for ACM to issue and later auto-renew.
- **CloudFront won't accept the certificate.** It must be in **us-east-1**; a Regional certificate elsewhere won't attach to a CloudFront distribution.
- **Auto-renewal didn't happen.** Auto-renewal requires the validation records to remain in place (DNS validation); **imported** certificates and email-validated ones may need manual action.
- **Need to install on EC2 directly.** You cannot export a public ACM cert's key — terminate TLS at an integrated service (ALB/CloudFront), or use ACM Private CA / a third-party cert for the host.

---

## Integrations

ACM provides the certificates that **Elastic Load Balancing**, **Amazon CloudFront**, **API Gateway**, **App Runner**, and **Global Accelerator** use to terminate **TLS**; **AWS Private CA** issues internal certificates (and integrates with services needing private trust, including some EKS/IoT use cases); and expiry events flow to **CloudWatch/EventBridge**. It is the standard way to enable encryption in transit on AWS endpoints and a key building block in the SCS data-in-transit domain alongside enforcing HTTPS and PrivateLink.

---

## Pricing and Cost Considerations

**Public ACM certificates are free**, including their automatic renewal — you pay only for the AWS resources (load balancers, CloudFront) that use them. **AWS Private CA** is a **paid** service (a monthly charge per CA plus a per-certificate fee), so internal PKI has real cost that scales with the number of CAs and issued certificates. The main consideration is using free public certificates wherever browser trust is needed and reserving Private CA for genuine internal-PKI/mutual-TLS requirements. Exact Private CA prices vary by Region.

---

## Exam Relevance

**CLF-C02:** Know ACM as the service that provisions and auto-renews free SSL/TLS certificates for AWS services, enabling HTTPS. Foundational.

**SAA-C03:** Know ACM for TLS on ELB/CloudFront/API Gateway, DNS validation and auto-renewal, the Regional/us-east-1-for-CloudFront rule, and that public-cert keys can't be exported. Design depth.

**SOA-C03:** Operate certificates — validation, monitoring expiry, and renewal troubleshooting (especially imported certs). Operations depth.

**SCS-C03:** Secure data in transit — ACM-issued certificates for TLS termination/enforcement, **AWS Private CA** for internal PKI and mutual TLS, and no-export key handling. Security depth (Data Protection in transit).

---

## Summary

AWS Certificate Manager provisions, deploys, and automatically renews SSL/TLS certificates for AWS-integrated services. **Public certificates** are free, browser-trusted, validated via DNS (recommended, for hands-off renewal) or email, and auto-renewed and re-deployed; **AWS Private CA** (paid) issues internal certificates for private PKI and mutual TLS. ACM certificates are used by TLS-terminating services — ELB, CloudFront, API Gateway, App Runner, Global Accelerator — and public-certificate private keys cannot be exported; certificates are Regional, with **CloudFront requiring us-east-1**. The recurring exam points are free auto-renewing public certs, the us-east-1/CloudFront rule, the no-key-export constraint, and Private CA for internal PKI.

---

## Quick Check

1. What does ACM automate that prevents a common cause of outages?
2. Which validation method enables fully automatic renewal, and why?
3. In which Region must a certificate be for use with CloudFront, and why might a Regional cert fail to attach?
4. Why can't you install a public ACM certificate directly on an EC2 instance, and what are the alternatives?
5. What is AWS Private CA used for, and how does its cost differ from public certificates?

---

## What's Next

Pair this with **Elastic Load Balancing** and **Amazon CloudFront** (TLS termination), **Amazon API Gateway** (custom domains), and the SCS-C03 protecting-data-in-transit lesson.
