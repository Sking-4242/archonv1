---
title: "Compliance Programs and AWS Artifact"
type: content
estimated_minutes: 7
cert_tags: ["aws_ccp", "aws_saa"]
---

# Compliance Programs and AWS Artifact

## Overview

Many organizations operate in regulated industries — healthcare (HIPAA), financial services (PCI-DSS, SOX), government (FedRAMP), or general data protection (GDPR, SOC 2). AWS maintains compliance certifications across hundreds of regulatory frameworks, enabling customers to inherit AWS's compliance posture for the infrastructure layer.

## AWS Compliance Programs

AWS is certified or compliant with a wide range of standards: **SOC 1, 2, 3** (SSAE 16/18 audits covering financial controls and security), **ISO 27001/27017/27018** (information security management), **PCI DSS Level 1** (payment card data), **HIPAA** (health data — AWS provides a BAA for covered entities), **FedRAMP** (US federal government — GovCloud), **GDPR** (EU data protection — AWS provides GDPR-specific documentation and DPAs), **CSA STAR** (cloud security), and many country-specific certifications.

When AWS is certified, you inherit the certification for the infrastructure layer. You still need to certify your application layer separately — your code, your configurations, your data handling practices.

## AWS Artifact

AWS Artifact is the self-service portal for downloading AWS compliance reports and agreements. You can access SOC reports, PCI DSS Attestation of Compliance, ISO certifications, and other compliance documents directly from the AWS console without contacting AWS.

AWS Artifact also manages legal agreements: you can review and accept the Business Associate Agreement (BAA) required under HIPAA, or the GDPR Data Processing Agreement (DPA), through Artifact. This enables self-service compliance agreement management without engaging AWS sales or legal teams.

## Compliance Is a Shared Journey

AWS's compliance certifications cover the infrastructure layer. Your application's compliance requires additional controls: access logging (CloudTrail), encryption of data at rest and in transit, network segmentation, vulnerability scanning, incident response procedures, and regular security assessments.

For complex compliance requirements, AWS offers AWS Security Hub (consolidated compliance posture), AWS Config (compliance rules for resource configurations), AWS Audit Manager (continuous evidence collection for audits), and AWS Compliance Center (curated guidance by industry and regulation). None of these automate compliance — they provide the tooling to support your compliance program.

## Summary

AWS maintains 100+ compliance certifications including SOC 1/2/3, PCI DSS, HIPAA, FedRAMP, and ISO 27001. Customers inherit these certifications for the infrastructure layer. AWS Artifact provides self-service access to compliance reports and legal agreements (BAAs, DPAs). Compliance is shared — your application layer requires its own controls and certifications.

## What's Next

Module 5 complete. No lab for this module — the concepts here are foundational and conceptual. Module 6 introduces the AWS Well-Architected Framework.
