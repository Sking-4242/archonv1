---
title: "ACM, CloudHSM, and Amazon Macie"
type: content
estimated_minutes: 13
cert_tags: ["SAA-C03", "SAP-C02"]
---

# ACM, CloudHSM, and Amazon Macie

## Overview

This lesson covers three security services that address distinct problems: certificate management, dedicated cryptographic hardware, and sensitive data discovery. They are grouped together not because they are related in function, but because each one fills a specific gap in a complete AWS security architecture and each appears on the exam as a targeted tool for a specific scenario.

AWS Certificate Manager (ACM) eliminates the most common cause of TLS-related outages — certificate expiry — by provisioning, deploying, and automatically renewing certificates for services like ALB, CloudFront, and API Gateway. CloudHSM provides dedicated, single-tenant hardware security modules for organizations whose compliance requirements exceed what KMS's shared hardware model can satisfy. Amazon Macie uses machine learning to scan S3 buckets for sensitive data — PII, credentials, financial records — and surface exposures before they become breaches.

For the SAA exam, know the CloudFront certificate region requirement, when CloudHSM is required versus KMS, and what Macie discovers. SAP adds ACM Private CA for internal PKI, CloudHSM cluster design, and Macie's integration into Security Hub for centralized finding management. After this lesson you will recognize the specific scenario each service addresses and avoid the common exam trap of substituting one for another.

---

## Core Concepts

### AWS Certificate Manager (ACM)

ACM provisions and manages TLS/SSL certificates for AWS services. Public certificates — used for HTTPS on ALB, CloudFront, API Gateway, and other ACM-integrated services — are free. ACM handles the full certificate lifecycle: domain validation (DNS or email), issuance, deployment, and automatic renewal 60 days before expiration. The renewal happens without human intervention, eliminating the operationally common outage caused by a certificate expiring unnoticed.

A critical constraint: **ACM cannot install certificates on EC2 instances or on-premises servers**. ACM certificates are deployed only to ACM-integrated AWS services. For EC2, you must manage certificates through other means: manually, through a third-party CA, or via ACM Private CA paired with your own installation tooling.

A second constraint specific to CloudFront: **ACM certificates for CloudFront distributions must be in `us-east-1`**, regardless of where the origin or the majority of users are located. This is a CloudFront service requirement, not configurable.

---

### ACM Private CA

ACM Private CA is a fully managed private certificate authority for issuing certificates within your organization. Private CA certificates are not publicly trusted — they are for internal endpoints: microservice-to-microservice mTLS, corporate VPN, IoT device identity, or internal web applications.

Private CA integrates with Kubernetes cert-manager, allowing automatic issuance and renewal of short-lived certificates for service mesh workloads without developer involvement. It also integrates with AWS IoT for device certificate provisioning. Unlike running your own CA on EC2, Private CA eliminates the operational burden of CA key management, CRL distribution, and certificate renewal automation.

Pricing: $400/month per active CA plus per-certificate fees. For organizations issuing thousands of certificates, this is cost-effective compared to the engineering effort of operating a self-managed CA. For very small-scale needs, a self-managed CA may be more economical.

---

### AWS CloudHSM

CloudHSM provides dedicated hardware security modules — physical HSM appliances in AWS data centers that you control exclusively. Unlike KMS, where the underlying hardware is shared among AWS customers and AWS manages the hardware administration, CloudHSM gives you single-tenant HSMs where AWS cannot access your keys under any circumstance.

The compliance driver is **FIPS 140-2 Level 3**. KMS is validated at FIPS 140-2 Level 2 (adequate for most regulated workloads). Some regulatory frameworks — certain banking regulations, payment card industry requirements, and government standards — specifically require Level 3, which CloudHSM provides. CloudHSM is also the choice when an organization must be able to prove, with hardware-level assurance, that no third party including AWS can access their keys.

CloudHSM integrates with KMS as a **custom key store**: KMS manages the API and key policies, but the underlying key material is stored in your CloudHSM cluster rather than in KMS's shared infrastructure. This combines KMS's operational convenience with CloudHSM's dedicated hardware.

Operationally, CloudHSM requires more effort: you manage HSM users, key backups, and cluster availability. CloudHSM clusters must span multiple AZs for high availability. If the cluster fails and you have not backed up your key material, the keys are permanently lost.

---

### Amazon Macie

Macie uses machine learning and pattern matching to automatically discover and classify sensitive data stored in S3. It scans object content and metadata to identify personally identifiable information (names, email addresses, SSNs, passport numbers), financial data (credit card numbers, bank account numbers), health information (medical record numbers, diagnoses), and credentials (API keys, private keys, passwords in configuration files).

Macie generates two categories of findings. **Data security findings** identify specific objects containing sensitive data — a CSV file with 10,000 SSNs, a config file containing an AWS access key. **Policy findings** identify bucket-level exposure risks — publicly accessible buckets, buckets with encryption disabled, buckets with overly permissive access policies.

Macie integrates with Security Hub, sending all findings to a central Security Hub dashboard. In a multi-account organization, a Macie administrator account can centrally view findings across all member accounts without needing access to each account individually. Findings can also flow to EventBridge, enabling automated remediation — for example, automatically blocking public access on any bucket that generates a policy finding.

---

## Configuration Reference

### Provisioning an ACM Certificate for an ALB

```bash
# Request a public certificate (DNS validation recommended over email)
aws acm request-certificate \
  --domain-name "app.example.com" \
  --subject-alternative-names "www.example.com" "api.example.com" \
  --validation-method DNS \               # Creates a CNAME record you add to your DNS zone
  --region us-east-1 \                    # Use us-east-1 if this cert is for CloudFront
  --tags Key=Environment,Value=prod

# Once the CNAME validation record is added to your DNS, check status
aws acm describe-certificate \
  --certificate-arn arn:aws:acm:us-east-1:123456789012:certificate/abc-123 \
  --query 'Certificate.Status' \
