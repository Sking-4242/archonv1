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

## Examples

A digital health startup building a patient portal wants to accept payment for appointments (requiring PCI DSS compliance) and store medical records (requiring HIPAA compliance). Before AWS, achieving both would have required separate vendor audits, expensive questionnaires, and months of preparation. On AWS, they download the PCI DSS Attestation of Compliance and the SOC 2 report from AWS Artifact to satisfy their auditors for the infrastructure layer. They then sign the HIPAA BAA directly through Artifact. The startup's compliance team still needs to document their application controls, but inheriting the infrastructure certification dramatically shortens their audit timeline.

A US federal agency wants to migrate its case management system to AWS but requires FedRAMP authorization. AWS GovCloud regions hold FedRAMP High authorization — the highest tier — covering the infrastructure layer. The agency inherits this authorization for the infrastructure, but must still complete their own Authority to Operate (ATO) for their application. AWS Audit Manager helps them continuously collect evidence of configuration compliance across their AWS environment, feeding directly into their ATO documentation rather than requiring manual evidence gathering at audit time.

A Series B SaaS company selling to European enterprise customers is asked repeatedly for GDPR compliance documentation. Their security team uses AWS Compliance Center to pull curated guidance for GDPR on AWS, identifies which services have GDPR-relevant documentation, and uses AWS Config rules to continuously verify that no data is being written to regions outside the EU. They also accept the AWS GDPR Data Processing Agreement through Artifact. What used to be a month-long manual compliance project becomes a repeatable, evidence-backed process — because they understood which parts of GDPR AWS handles and which parts they own.

## Think About It

1. AWS's PCI DSS compliance covers the infrastructure layer. A customer builds a payment application on top of AWS. Does the customer's application automatically inherit PCI DSS compliance? Why or why not — and what does the customer still need to do?
2. A company is evaluating AWS Audit Manager versus manually preparing evidence for their SOC 2 audit. What are the real trade-offs — not just in effort, but in the reliability and defensibility of the evidence produced by each approach?
3. GDPR compliance requires knowing where personal data is stored and ensuring it doesn't leave the EU. AWS Config rules can enforce regional restrictions at the infrastructure level. What gaps might still exist even with perfect Config rule enforcement — and who is responsible for closing them?
4. Why do you think AWS makes compliance reports available through a self-service portal (Artifact) rather than requiring customers to request them directly from AWS? What does that design decision reveal about how AWS thinks about compliance at scale?
5. Some compliance frameworks (like HIPAA) require a Business Associate Agreement to be in place before protected health information can be stored. What would happen if a covered entity stored PHI in AWS without signing the BAA — even if all their technical controls were correct?

## Quick Check

**Q1.** A healthcare company wants to store protected health information (PHI) in AWS. What must they do before doing so to satisfy HIPAA requirements?
- A) Enable encryption on all storage services
- B) Sign a Business Associate Agreement (BAA) with AWS through AWS Artifact
- C) Deploy their workload in AWS GovCloud only
- D) Obtain a FedRAMP authorization

**Answer: B** — HIPAA requires a signed BAA between covered entities and their business associates (including cloud providers). AWS provides the BAA through AWS Artifact, and it must be accepted before PHI can be stored on AWS.

**Q2.** A security auditor asks for AWS's SOC 2 Type II report. Where should the customer direct them to obtain this document?
- A) AWS Support Center
- B) The AWS Trust & Safety team
- C) AWS Artifact
- D) AWS Security Hub

**Answer: C** — AWS Artifact is the self-service portal for downloading compliance reports and audit documents, including SOC 1, SOC 2, and SOC 3 reports, without needing to contact AWS.

**Q3.** When AWS achieves PCI DSS Level 1 certification, what does a customer building a payment application on AWS inherit from that certification?
- A) Full PCI DSS compliance for their application
- B) Compliance for the infrastructure layer only; the application layer requires separate certification
- C) Compliance for all AWS-managed services they use, including application logic
- D) Nothing — AWS's certification does not transfer to customers

**Answer: B** — AWS's PCI DSS certification covers the infrastructure layer. Customers inherit that layer's compliance posture but must independently certify their application code, configurations, and data handling practices.

## What's Next

Module 5 complete. No lab for this module — the concepts here are foundational and conceptual. Module 6 introduces the AWS Well-Architected Framework.
