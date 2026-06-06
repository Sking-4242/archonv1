---
title: "Compliance Programs and AWS Artifact"
type: content
estimated_minutes: 16
cert_tags: ["CLF-C02", "SAA-C03"]
---

# Compliance Programs and AWS Artifact

## Overview

Compliance is not a destination — it is an ongoing program that requires continuous evidence collection, documented controls, and third-party verification. For organizations in regulated industries — healthcare, financial services, government, payments processing — compliance is not optional. It determines whether you can operate, whether enterprise customers will buy from you, and whether regulators will fine you. Understanding how AWS fits into your compliance program, and what AWS provides versus what you must build, is a practical skill with direct business consequences.

The foundational concept for AWS compliance is inherited compliance. When AWS achieves a compliance certification — PCI DSS Level 1, ISO 27001, SOC 2 Type II, FedRAMP High — customers inherit that certification for the infrastructure layer. This means the physical data centers, the hardware, the hypervisor, and the managed service software stacks are already certified. You do not have to prove those controls — you point to AWS's audit reports as evidence. What you must prove is your application layer: your code, your configurations, your data handling practices, and your access controls.

AWS provides two primary tools for compliance: AWS Artifact (the self-service portal for compliance reports and legal agreements) and the AWS Compliance Center (public documentation mapping AWS services to compliance frameworks). Neither of these tools automates compliance for you — compliance requires human decisions, documented processes, and organizational controls that no tool can substitute for. But they dramatically reduce the evidence collection burden and give you a defensible, auditor-ready paper trail for the infrastructure controls you inherit.

## Core Concepts

### Inherited vs. Achieved Compliance

The single most important compliance concept for CLF-C02 is the distinction between inherited and achieved compliance. When AWS holds a certification, you inherit the infrastructure layer portion of that certification. The layers you build on top — your application, your configurations, your data handling — require independent certification effort.

Think of it as a layered audit: the foundation (AWS infrastructure) is pre-certified by a third party. Your auditor reviews AWS's certification documentation (available in Artifact) and accepts it as evidence for the infrastructure layer without re-testing it. Then your auditor tests the controls you built on top: are your security groups configured correctly? Is your data encrypted with appropriate keys? Are your access logs complete? Do you have an incident response process? Those are your controls to prove.

This inheritance model has a critical caveat: if you use an AWS service for an in-scope system, that specific service must be within scope of AWS's certification. For PCI DSS, not all AWS services are in the PCI scope — AWS publishes a list of PCI DSS in-scope services, and if you process cardholder data through a service not on that list, you cannot claim inheritance for that layer. Always verify service scope before relying on inherited compliance.

### HIPAA: The Business Associate Agreement

HIPAA (Health Insurance Portability and Accountability Act) governs the handling of Protected Health Information (PHI) — any individually identifiable health information. Organizations that create, receive, maintain, or transmit PHI are called covered entities (hospitals, health insurers, healthcare providers). Organizations that handle PHI on behalf of covered entities — including cloud providers — are called business associates.

Before a covered entity can store or process PHI on AWS, a Business Associate Agreement (BAA) must be in place between the covered entity and AWS. The BAA is a legal contract that: specifies what PHI AWS may receive and for what purpose, documents AWS's obligations for PHI security and breach notification, and establishes the division of responsibility under HIPAA between AWS and the customer.

Without a signed BAA, storing PHI on AWS — even with perfect technical controls — is a HIPAA violation. The technical controls (encryption, access logging, access controls) are necessary but not sufficient; the BAA is a separate legal requirement that must be satisfied before any PHI touches AWS systems. AWS makes the BAA available through the Agreements section of AWS Artifact, and it can be accepted online without engaging AWS's legal or sales teams.

Additionally, not all AWS services are HIPAA-eligible. AWS publishes a list of HIPAA-eligible services — only those services may be used to store or process PHI under the BAA. Common HIPAA-eligible services include EC2, S3, RDS, DynamoDB, Lambda, CloudWatch, and CloudTrail, among others. Less commonly-used or newer services may not yet be eligible — always verify before use.

### PCI DSS: Payment Card Security

PCI DSS (Payment Card Industry Data Security Standard) applies to any organization that processes, stores, or transmits cardholder data — credit card numbers, CVVs, expiration dates, or cardholder names combined with account numbers. Compliance is mandatory for any organization accepting card payments, and violations result in fines and potential loss of card processing privileges.

AWS holds PCI DSS Level 1 certification — the highest tier, applicable to organizations processing more than 6 million card transactions per year. As a customer, you inherit this certification for the AWS infrastructure layer. The PCI DSS Responsibility Summary document (available in AWS Artifact) explicitly maps each of the 12 PCI DSS requirements and their sub-requirements to three categories: AWS-owned (infrastructure controls), customer-owned (your application controls), and shared.

What customers must still prove for PCI DSS: network segmentation (isolating cardholder data environments with security groups and NACLs), access control (IAM least privilege, MFA on all accounts that access cardholder data), encryption (both at rest with KMS and in transit with TLS), vulnerability management (EC2 patching via Systems Manager, application vulnerability scanning), logging and monitoring (CloudTrail, VPC Flow Logs, CloudWatch alarms), and a documented incident response procedure. The AWS infrastructure layer does not satisfy any of these — they are application-layer controls entirely owned by the customer.

### SOC 1, SOC 2, SOC 3

SOC (System and Organization Controls) reports are audit reports produced under the AICPA framework by independent certified public accountants. AWS undergoes annual SOC audits covering its infrastructure controls. There are three report types with distinct purposes:

**SOC 1 (SSAE 18):** Covers controls relevant to financial reporting — the integrity, availability, and security of systems that could affect a customer's financial statements. Required by customers with SOX obligations or financial services audits. The SOC 1 is confidential — shared under NDA with customers and their auditors.

**SOC 2 Type II:** Covers the Trust Services Criteria: Security, Availability, Processing Integrity, Confidentiality, and Privacy. "Type II" means the auditor tested controls over a period of 6–12 months (not just verified their existence at a point in time). This is the most widely requested AWS compliance report for enterprise vendor assessments, B2B SaaS security questionnaires, and general cloud security reviews. Confidential — shared under NDA.

**SOC 3:** A public summary of the SOC 2 that can be freely shared without NDA. It confirms that the SOC 2 audit was performed and controls were found effective, but omits the detailed control descriptions and auditor findings. Useful for posting on a company website or responding to informal compliance questions, but insufficient for formal audits or enterprise procurement.

### ISO 27001, ISO 27017, ISO 27018

ISO/IEC 27001 is the international standard for information security management systems (ISMS). Certification proves that an organization has implemented a systematic framework for managing information security risks across people, processes, and technology. AWS's ISO 27001 certification covers the AWS infrastructure and is a commonly required credential for enterprise customers in Europe, Asia-Pacific, and government sectors globally.

**ISO 27017** extends ISO 27001 with cloud-specific security controls — covering the specific security responsibilities of cloud service providers and cloud customers. AWS's ISO 27017 certification addresses controls unique to cloud environments, including virtual machine isolation, administrative operations security, and separation of customer environments.

**ISO 27018** covers the protection of personally identifiable information (PII) in public clouds. AWS's ISO 27018 certification is particularly relevant for GDPR compliance and for customers in data-privacy-sensitive industries. It covers controls for transparency, user consent, data subject rights, and data retention for PII processed in cloud environments.

### FedRAMP and GovCloud

FedRAMP (Federal Risk and Authorization Management Program) is the US government's framework for authorizing cloud services for use by federal agencies. FedRAMP authorization is based on NIST SP 800-53 security controls and comes in three impact levels: Low, Moderate, and High (highest security requirements, for systems handling the most sensitive government data).

AWS GovCloud (US) is a pair of isolated AWS Regions (us-gov-east-1 and us-gov-west-1) designed specifically for US government workloads. GovCloud is physically and logically isolated from standard AWS Regions, accessible only to US citizens and US-based entities, and holds FedRAMP High authorization — the highest tier. Federal agencies that require FedRAMP High must use GovCloud for in-scope systems, and they inherit the FedRAMP infrastructure authorization from AWS, reducing their own Authority to Operate (ATO) timeline significantly.

Standard AWS Regions hold FedRAMP Moderate authorization for many services, which is sufficient for federal systems classified as Moderate impact. The specific FedRAMP authorization documentation is available in AWS Artifact.

### GDPR: European Data Protection

GDPR (General Data Protection Regulation) is the EU's data protection law, applying to any organization that processes personal data of EU residents — regardless of where the organization is based. GDPR compliance involves both technical controls (encryption, access logging, data deletion capabilities) and organizational requirements (Privacy Impact Assessments, data processing records, breach notification procedures, Data Protection Officer roles in some cases).

AWS's role in GDPR compliance is as a data processor — AWS processes personal data on behalf of customers who are data controllers. AWS provides a GDPR Data Processing Addendum (DPA) — a contractual document that governs how AWS handles personal data and commits AWS to GDPR obligations as a processor. The DPA is available through the Agreements section of AWS Artifact.

AWS also provides technical controls that support GDPR compliance: region restrictions via AWS Organizations Service Control Policies (to prevent data from leaving the EU), deletion capabilities (S3 lifecycle policies, RDS deletion, DynamoDB TTL), access logging (CloudTrail), and encryption. These are tools — applying them correctly to your specific data processing activities remains the customer's responsibility.

## Configuration Reference

### AWS Artifact Full Console Walkthrough

**Step 1: Access AWS Artifact**
1. Sign in to the AWS Management Console at console.aws.amazon.com.
2. In the top search bar, type **Artifact** and select **AWS Artifact**.
3. The Artifact home page displays two main sections: **Reports** (compliance documents) and **Agreements** (legal contracts).

**Step 2: Navigate the Reports Tab**
1. Click **Reports** in the left navigation.
2. The reports table shows all available compliance documents. Each row includes: document name, category (certification, attestation, report), status (Active/Archived), and publication date.
3. Use the search box to filter by regulation or standard. Available categories include:

| Search Term | Report Types Returned |
|---|---|
| SOC | SOC 1 Type I, SOC 1 Type II, SOC 2 Type I, SOC 2 Type II, SOC 3 |
| ISO 27001 | ISO 27001 Certificate, ISO 27001 Certification Report |
| ISO 27017 | ISO 27017 Certificate |
| ISO 27018 | ISO 27018 Certificate |
| PCI | PCI DSS Attestation of Compliance, PCI DSS Responsibility Summary |
| FedRAMP | FedRAMP Authorization Package documents |
| HIPAA | HIPAA documentation (eligible services, security whitepaper) |
| GDPR | GDPR documentation, Data Privacy FAQ |
| CSA | CSA STAR Attestation |
| HITRUST | HITRUST CSF Certification |

4. Click any report row to expand it. Review:
   - **Report period**: the dates the audit or certification covers
   - **Audit firm or certification body**: the third party that performed the audit
   - **Services in scope**: critical — verify your specific services are listed
5. To download: check the NDA acknowledgment checkbox and click **Download**. SOC 1, SOC 2, and most certification reports require NDA acknowledgment. SOC 3 does not — it is publicly shareable.

**Step 3: Accept the HIPAA Business Associate Agreement**
1. Click **Agreements** in the left navigation.
2. You will see a list of available agreements for your account.
3. Find **AWS Business Associate Addendum (BAA)** — the HIPAA BAA.
4. Click the agreement row to review the full text.
5. Confirm you have read and agree to the terms, then click **Accept** (or **Download and Accept** in some account configurations).
6. Once accepted, the agreement appears in your **Accepted Agreements** list with the acceptance date.
7. The BAA covers all HIPAA-eligible AWS services. Before storing PHI, verify your specific services are on the HIPAA-eligible services list at aws.amazon.com/compliance/hipaa-eligible-services-reference/.

**Step 4: Review and Accept the GDPR Data Processing Addendum**
1. In the **Agreements** tab, find **AWS GDPR Data Processing Addendum**.
2. Review the DPA terms — it documents AWS's obligations as a data processor under GDPR Article 28.
3. Accept the DPA to establish the required contractual basis for AWS to process personal data of EU residents on your behalf.
4. Note: The DPA acceptance is account-level. For AWS Organizations, accept it in the management account to cover the organization.

### AWS Compliance Center Walkthrough

The AWS Compliance Center (aws.amazon.com/compliance/) is a public-facing resource that does not require an AWS account to access. It provides:

1. **Compliance Programs directory**: A list of all AWS compliance certifications organized by category (Global, Regional, US Government, Industry-Specific). Each entry shows which AWS Regions are covered and links to available documentation.
2. **Services in Scope**: A page listing which AWS services are in scope for each compliance program. Critical for verifying service eligibility before designing an architecture for a regulated workload.
3. **Compliance Center by industry**: Curated compliance guidance for healthcare, financial services, government, and other regulated industries — including architecture guidance, whitepaper recommendations, and relevant AWS services.
4. **Quick Reference Guides**: Downloadable PDFs mapping compliance requirements (e.g., NIST 800-53 controls, ISO 27001 Annex A) to specific AWS services and features.

Use the Compliance Center as your starting point when entering a new regulated market or industry — it shows you what AWS has already certified, which services are eligible, and what reference architecture guidance exists before you begin designing.

### Compliance Support Services Reference

| Tool | Purpose | Customer Action |
|---|---|---|
| AWS Artifact (Reports) | Download AWS third-party audit reports | Download and share with auditors; verify service scope |
| AWS Artifact (Agreements) | Accept HIPAA BAA, GDPR DPA, and other legal agreements | Accept before storing regulated data |
| AWS Compliance Center | Browse compliance certifications and service eligibility | Research before designing regulated architectures |
| AWS Security Hub | Aggregate security control findings against compliance standards (CIS, PCI, FSBP) | Review findings, remediate customer-owned gaps |
| AWS Config | Continuously evaluate resource configurations against compliance rules | Define and enable Config rules for in-scope controls |
| AWS Audit Manager | Continuously collect evidence for compliance audits | Set up assessment frameworks, review evidence collections |
| AWS CloudTrail | API activity logging for audit trail | Enable in all Regions, enable log file validation |
| Amazon Macie | Discover and classify sensitive data (PII) in S3 | Enable to identify PHI/PII in S3 buckets |

## How to Decide

Use this framework to determine what compliance work AWS handles versus what remains yours:

| Compliance Requirement Category | AWS Handles | Customer Handles |
|---|---|---|
| Physical access controls to data centers | AWS (evidenced in SOC 2, ISO 27001) | Verify via Artifact reports |
| Hardware security and decommissioning | AWS (evidenced in SOC 2) | Verify via Artifact reports |
| Hypervisor and tenant isolation | AWS (Nitro, evidenced in SOC 2) | Verify via Artifact reports |
| Infrastructure-layer network security | AWS (evidenced in SOC 2) | Verify via Artifact reports |
| BAA/DPA/legal agreements in place | AWS provides the agreement | Customer must accept the agreement |
| Guest OS patching (EC2) | Not AWS — customer owns this | Systems Manager Patch Manager |
| Application code security | Not AWS — customer owns this | Security testing, code review, SAST/DAST |
| Data encryption at rest | AWS provides KMS and SSE capability | Customer must enable and configure |
| Data encryption in transit | AWS provides TLS endpoints | Customer must enforce TLS between all components |
| Access control (IAM) | AWS provides IAM service | Customer must configure least-privilege policies |
| Audit logging (CloudTrail) | AWS provides CloudTrail | Customer must enable in all Regions |
| Incident response procedures | Not AWS | Customer must document and test procedures |
| Data subject rights (GDPR) | AWS provides deletion/export capabilities | Customer must build processes to honor requests |
| Vendor risk assessment documentation | AWS provides Artifact reports | Customer must review, share, and accept |

**Decision rule:** If a compliance requirement touches the infrastructure layer (physical, hardware, hypervisor, managed service runtime), check Artifact for AWS's evidence. If it touches your application, data handling, access controls, or processes, it is yours to build and prove.

## How This Connects

- **AWS Artifact** — the evidence vault for compliance. Every AWS compliance certification produces documentation that lives here and can be retrieved on demand for audits, enterprise sales, and regulatory reviews.
- **AWS Audit Manager** — the continuous evidence collection service that automatically gathers configuration evidence from AWS Config, CloudTrail, and Security Hub against standard compliance frameworks (SOC 2, PCI DSS, HIPAA, NIST 800-53, ISO 27001). Evidence collected here feeds directly into audit reports.
- **AWS Config** — the configuration compliance service that continuously evaluates your resource configurations against rules you define. For compliance programs requiring continuous monitoring (PCI DSS, HIPAA), Config provides the automated control checks that generate audit evidence.
- **AWS Security Hub** — aggregates findings across your AWS accounts and benchmarks them against compliance frameworks including PCI DSS, CIS Benchmarks, and AWS Foundational Security Best Practices, giving you a real-time view of which customer-owned compliance controls are passing or failing.
- **Amazon Macie** — uses machine learning to automatically discover and classify sensitive data (PII, PHI, financial data) in S3 buckets, helping you identify data that falls within the scope of HIPAA, GDPR, or PCI DSS compliance programs — before your auditor finds it first.

## Exam Traps

**Trap 1: "Using AWS automatically makes my application HIPAA compliant."** False. Signing the HIPAA BAA and using HIPAA-eligible AWS services is necessary but not sufficient for HIPAA compliance. You must also implement appropriate technical safeguards (encryption, access controls, audit logging), administrative safeguards (policies, workforce training, access management processes), and physical safeguards (for any non-cloud components). AWS covers the infrastructure layer; your application and processes cover the rest.

**Trap 2: "The AWS HIPAA BAA is automatically in place when you create an AWS account."** Incorrect. The HIPAA BAA must be explicitly accepted by the customer through the Agreements section of AWS Artifact. It does not apply automatically. Storing PHI in AWS without an accepted BAA is a HIPAA violation regardless of how well-configured your technical controls are.

**Trap 3: "AWS's SOC 2 certification covers my application's SOC 2 compliance."** AWS's SOC 2 covers the infrastructure layer — physical controls, logical access to AWS systems, change management for AWS infrastructure, and availability controls for AWS services. Your SOC 2 audit will test your application's controls: how you manage customer data, how you control access to your application, how you detect and respond to incidents. These are distinct audits. AWS's SOC 2 is evidence for one layer; you need your own audit for the application layer.

**Trap 4: "AWS Artifact is a monitoring service that tracks compliance posture."** Incorrect. AWS Artifact is a document repository for downloading compliance reports and managing legal agreements. It does not monitor your resources or generate findings about your security posture. Compliance posture monitoring is done by Security Hub (findings), Config (rule evaluations), and Audit Manager (evidence collection). Confusing Artifact with these services is a common exam error.

**Trap 5: "FedRAMP compliance requires using AWS GovCloud."** Partially true and easily over-applied. FedRAMP High requires GovCloud (US) for in-scope systems. FedRAMP Moderate is available in standard AWS commercial Regions for many services. Many federal workloads can use commercial AWS Regions if they are classified as Moderate impact. Check the specific impact level requirement for your workload before assuming GovCloud is mandatory.

## Summary

- AWS maintains 100+ compliance certifications including SOC 1/2/3, ISO 27001/27017/27018, PCI DSS Level 1, HIPAA eligibility, FedRAMP High (GovCloud), and GDPR documentation — covering the infrastructure layer for all customers.
- Customers inherit AWS's compliance certifications for the infrastructure layer, but must independently prove application-layer controls: data handling, access control, logging, patching, and incident response.
- The HIPAA BAA must be explicitly accepted in AWS Artifact before any Protected Health Information is stored in AWS — it is not automatic and not optional. Similarly, the GDPR DPA must be accepted to establish the required contractual basis for processing EU personal data.
- AWS Artifact (Reports tab) provides self-service download of SOC 1/2/3, ISO certificates, PCI DSS attestations, and FedRAMP documentation without contacting AWS — these reports satisfy auditors' requests for third-party infrastructure security evidence.
- AWS Compliance Center (aws.amazon.com/compliance/) is a public resource listing all AWS certifications, services in scope per program, and industry-specific compliance guidance — use it to verify service eligibility before designing regulated architectures.
- Compliance tools like AWS Audit Manager, Security Hub, Config, and Macie help collect and maintain evidence for customer-owned controls, but they do not automate compliance — they support the human processes and decisions that compliance programs require.

## Examples

**Beginner:** A first-time founder builds a telehealth app on AWS and asks their lawyer if they need a Business Associate Agreement with AWS since they will store patient health records. The lawyer confirms yes — the BAA is required before any PHI is stored. The founder goes to AWS Artifact, navigates to Agreements, finds the AWS Business Associate Addendum, reads through it, checks the acceptance box, and clicks Accept. It takes 10 minutes. They also check the HIPAA-eligible services page and confirm that S3, RDS, and Lambda — the services they are using — are all listed. With the BAA in place and HIPAA-eligible services selected, the legal prerequisite is satisfied. The technical controls — encryption, access logging, least-privilege IAM — are still the founder's job to implement. But the BAA is done without a lawyer, a phone call, or a legal invoice.

**Intermediate:** A Series A SaaS company is being asked by a Fortune 500 enterprise customer to provide evidence of their cloud infrastructure security controls before executing a data processing agreement. Their security team goes to AWS Artifact, downloads the SOC 2 Type II report (accepting the NDA), and the ISO 27001 certificate. They share both with the enterprise's security team under mutual NDA. The enterprise's auditors review the SOC 2 — confirming that AWS's physical access controls, change management, logical access, and incident response procedures have been tested by an independent CPA firm over a 12-month period. The infrastructure layer is approved. The enterprise now asks for the SaaS company's own SOC 2 report for the application layer. That, the startup still needs to commission — AWS's report does not cover it.

**Advanced:** A healthcare technology company is building an interoperability platform that will receive, process, and route HL7 FHIR data between hospital systems. It is covered under HIPAA as a business associate and must demonstrate compliance with the HIPAA Security Rule's technical, administrative, and physical safeguards. Their compliance architect structures the evidence as follows: for physical and environmental safeguards — they use AWS Artifact to download the SOC 2 Type II report (which covers physical access controls, environmental safeguards, and media handling) and accept the HIPAA BAA. For technical safeguards — they enable encryption at rest (SSE-KMS on S3, encrypted RDS at creation, EBS volume encryption enabled at the account level), enforce TLS on all inter-service connections, implement VPC with private subnets and security groups restricting database access to the application tier only, and enable CloudTrail with log file validation for the entire AWS Organization. For administrative safeguards — they configure AWS IAM Identity Center for workforce access with MFA enforced, use AWS Audit Manager with the HIPAA security rule framework to continuously collect configuration evidence, and document incident response procedures in their ISMS. At audit time, the compliance evidence package is 80% automated — Audit Manager exports configuration evidence directly, Artifact provides the BAA and SOC 2, and Security Hub shows passing status for HIPAA-relevant controls. Manual evidence covers only organizational policies and workforce training records.

## Think About It

1. AWS's PCI DSS certification covers the infrastructure layer. A customer builds a payment processing application on AWS. Does the customer's application automatically inherit PCI DSS compliance for the application layer? Why or why not — and what specific evidence would a PCI QSA (Qualified Security Assessor) still require from the customer?
2. HIPAA requires both a signed BAA and appropriate technical safeguards. If a covered entity stores PHI in AWS with perfect technical controls — full encryption, strict IAM, complete audit logging — but without an accepted BAA in place, what is the compliance status and what are the potential consequences?
3. AWS Audit Manager automatically collects evidence from Config, CloudTrail, and Security Hub against compliance frameworks. What types of compliance evidence can it NOT automatically collect, and who is responsible for those gaps? How does understanding this boundary change how you would plan an audit?
4. GDPR compliance requires honoring data subject access requests (the right to access personal data), right to erasure (the right to be forgotten), and data portability. Which specific AWS services and capabilities support fulfilling these rights — and what must the customer build on top of those services to actually honor a data subject request?
5. Why do you think AWS makes the HIPAA BAA available as a self-service click-through agreement in Artifact rather than a negotiated contract executed by AWS's legal team? What does this design decision reveal about how AWS thinks about compliance at the scale of millions of customers?

## Quick Check

**Q1.** A healthcare company wants to store protected health information (PHI) in Amazon S3 and Amazon RDS on AWS. What must they do before storing PHI to satisfy HIPAA requirements — beyond implementing technical security controls?

- A) Enable server-side encryption on all S3 buckets and RDS instances
- B) Accept the AWS Business Associate Agreement (BAA) through AWS Artifact's Agreements section
- C) Deploy all workloads in AWS GovCloud (US) only
- D) Obtain a FedRAMP High authorization from the Department of Health and Human Services

**Answer: B** — HIPAA requires a signed Business Associate Agreement between covered entities and their business associates — including cloud providers — before PHI is stored or processed. The BAA is available in AWS Artifact's Agreements section and must be explicitly accepted. Technical controls (encryption, access logging) are necessary but legally insufficient without the BAA in place.

**Q2.** A security auditor asks a customer for AWS's SOC 2 Type II report covering the infrastructure used to run their application. Where should the customer obtain this report, and what does the report actually prove?

- A) AWS Security Hub — it proves current security posture across all customer accounts
- B) The AWS Support Center — AWS sends it upon request to verified enterprise customers
- C) AWS Artifact (Reports tab) — it proves that AWS's infrastructure security controls were independently tested and found effective over a 12-month audit period
- D) AWS Config — it tracks all configuration changes and serves as the compliance audit trail

**Answer: C** — AWS Artifact's Reports tab provides self-service download of the SOC 2 Type II report without contacting AWS. The report is produced by an independent CPA firm and proves that AWS's physical, logical, and organizational security controls existed and operated effectively during the audit period — making it the appropriate evidence for infrastructure-layer compliance questions.

**Q3.** When AWS achieves PCI DSS Level 1 certification, what does a customer building a payment application on AWS inherit from that certification, and what must the customer still prove independently?

- A) Full PCI DSS compliance for all components of their application, including code and data handling
- B) Compliance for the infrastructure layer only (physical, hardware, hypervisor); the customer must independently prove application-layer controls including network segmentation, access control, encryption, logging, and vulnerability management
- C) Compliance for all AWS-managed services the customer uses, including the application logic running on those services
- D) Nothing — AWS's PCI certification is specific to AWS's own cardholder data and does not transfer to customers

**Answer: B** — AWS's PCI DSS Level 1 certification covers the AWS infrastructure layer. Customers inherit that certification for the physical, hardware, and hypervisor components. The customer must independently prove all application-layer PCI DSS requirements: network segmentation of the cardholder data environment, least-privilege access control, encryption at rest and in transit, complete audit logging, vulnerability management (including OS patching), and documented incident response procedures. The PCI DSS Responsibility Summary in AWS Artifact explicitly maps which requirements are AWS-owned versus customer-owned.

## What's Next

Module 5 is complete. Module 6 introduces the AWS Well-Architected Framework — the five pillars (Operational Excellence, Security, Reliability, Performance Efficiency, Cost Optimization) that AWS recommends as the foundation for architecting sound cloud workloads.
