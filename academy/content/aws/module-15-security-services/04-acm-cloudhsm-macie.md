---
title: "ACM, CloudHSM, and Amazon Macie"
type: content
estimated_minutes: 8
cert_tags: ["SAA-C03", "SAP-C02", "SCS-C02"]
---

# ACM, CloudHSM, and Amazon Macie

## Overview

Three more security services round out the core security toolkit: ACM for TLS certificate management, CloudHSM for hardware security module needs, and Macie for sensitive data discovery in S3.

## AWS Certificate Manager (ACM)

ACM provisions, manages, and automatically renews TLS/SSL certificates for AWS services. ACM public certificates are free — use them for ALB, CloudFront, API Gateway, and other integrated services. ACM does not install certificates on EC2 instances; for EC2 you need to manage certificates manually or via ACM Private CA. Certificates for CloudFront must be in us-east-1 regardless of the distribution's origin region. ACM automatically renews managed certificates before expiration — eliminating the most common cause of outage-by-oversight.

## ACM Private CA

ACM Private CA is a fully managed private certificate authority for issuing certificates within your organization: internal services, IoT devices, corporate VPN, or any use case requiring private PKI. Private CA certificates can be deployed to any service (including EC2) and are not publicly trusted. Use for zero-trust architectures with mutual TLS (mTLS) between services.

## AWS CloudHSM

CloudHSM provides dedicated Hardware Security Modules (physical hardware in AWS data centers) that you exclusively control. Compliance standards like PCI DSS, FIPS 140-2 Level 3, and some banking regulations require HSM-backed key storage — KMS is FIPS 140-2 Level 2 but CloudHSM achieves Level 3. With CloudHSM, AWS cannot access your keys. Use CloudHSM when regulatory requirements mandate FIPS 140-2 Level 3, or when you need to bring your own key material with provable AWS-inaccessibility.

## Amazon Macie

Macie uses machine learning to automatically discover, classify, and protect sensitive data in S3. It identifies personally identifiable information (PII), credentials, financial data, and health information by scanning object content. Macie generates findings for sensitive data exposure, unencrypted buckets, publicly accessible buckets, and unusual access patterns. Use Macie for data classification at scale, compliance reporting (GDPR, HIPAA), and ongoing S3 security posture monitoring.

## Summary

ACM manages TLS certificates for AWS services for free with automatic renewal. ACM Private CA enables private PKI for internal services. CloudHSM is for FIPS 140-2 Level 3 compliance or exclusive key control requirements. Macie automatically discovers sensitive data in S3 and flags exposures. Together these cover certificate management, hardware key security, and data classification.

## Examples

A media company runs a global video streaming platform on CloudFront with an Application Load Balancer as the origin. Their security team previously managed TLS certificates manually, which led to an outage when a certificate expired unnoticed. After migrating to ACM, they provision free public certificates for both the CloudFront distribution (certificate in `us-east-1`) and the ALB (certificate in the ALB's region). ACM's automatic renewal fires 60 days before expiration with no human action required — the expiry-induced outage pattern is eliminated entirely.

A European bank building microservices on EKS needs mutual TLS (mTLS) between every internal service call — a zero-trust requirement from their security policy. Public certificates are unsuitable because the endpoints are internal and not publicly resolvable. They deploy ACM Private CA to act as their internal root CA, issuing short-lived certificates (7-day TTL) to each service's sidecar proxy. Because ACM Private CA integrates with cert-manager on Kubernetes, certificate issuance and renewal happen automatically without developer involvement.

A healthcare analytics company ingests de-identified patient datasets from hospital partners and stores them in S3. Their compliance officer suspects that some data files contain residual PII — names or Social Security numbers — that were missed during anonymization. They enable Amazon Macie across all their S3 buckets. Within 24 hours, Macie surfaces 14 findings identifying files containing names and partial SSNs that were not caught by the hospital's de-identification pipeline. Without Macie, these files could have sat in S3 indefinitely, creating an undetected HIPAA violation.

## Think About It

1. ACM cannot install certificates directly on EC2 instances. Why does this limitation exist, and what architectural choices does it push teams toward?
2. KMS achieves FIPS 140-2 Level 2, while CloudHSM achieves Level 3. For most AWS workloads, KMS is sufficient. What specific scenarios justify the significant additional cost and operational complexity of CloudHSM?
3. Macie scans S3 object content using machine learning. What are the limitations of this approach — what kinds of sensitive data might Macie miss, and how would you design a complementary control?
4. A CloudFront distribution requires its ACM certificate to be in `us-east-1` regardless of where the origin is. Why does this regional constraint exist, and what would you do if your team's standard is to manage all resources in `eu-west-1`?
5. How would you weigh the trade-offs between using ACM Private CA (managed, costs per certificate) versus running your own CA on EC2 with open-source software (free but operationally complex) for an internal microservices mesh?

## Quick Check

**Q1.** An ACM certificate for a CloudFront distribution must be provisioned in which AWS Region?

- A) The same region as the CloudFront origin
- B) Any region, because CloudFront is a global service
- C) `us-east-1`, regardless of the origin's region
- D) The region with the lowest latency to the majority of end users

**Answer: C** — CloudFront requires ACM certificates to reside in `us-east-1`; this is a hard service requirement unrelated to where your origin or users are located.

**Q2.** Which compliance level does AWS CloudHSM achieve that KMS does not?

- A) FIPS 140-2 Level 1
- B) FIPS 140-2 Level 2
- C) FIPS 140-2 Level 3
- D) SOC 2 Type II

**Answer: C** — CloudHSM uses dedicated hardware security modules that achieve FIPS 140-2 Level 3; KMS is certified at Level 2, which is insufficient for some banking and government regulations.

**Q3.** What does Amazon Macie primarily do?

- A) Blocks public S3 bucket access using a managed policy
- B) Encrypts S3 objects using customer-managed KMS keys
- C) Uses machine learning to discover and classify sensitive data stored in S3
- D) Monitors S3 access logs and generates billing alerts for large data transfers

**Answer: C** — Macie scans S3 object content to identify PII, credentials, and other sensitive data types, generating findings for data exposure risks and compliance gaps.

## What's Next

Next up: GuardDuty and Security Hub — threat detection and centralized security posture management.