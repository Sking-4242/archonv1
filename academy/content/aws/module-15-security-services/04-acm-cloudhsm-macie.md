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

## What's Next

Next up: GuardDuty and Security Hub — threat detection and centralized security posture management.