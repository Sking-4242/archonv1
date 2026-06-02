---
title: "Security Of the Cloud (AWS Responsibility)"
type: content
estimated_minutes: 14
cert_tags: ["aws_ccp"]
---

# Security Of the Cloud (AWS Responsibility)

## Overview

The phrase "security of the cloud" refers to a vast, largely invisible layer of security infrastructure that AWS builds, operates, and certifies on your behalf. You never configure it, never see it, and never have direct access to it — but it is the foundation on which every AWS service is built. Understanding what AWS does at this layer helps you understand what you can rely on, what you cannot change, and how to demonstrate AWS's security posture to auditors and enterprise customers who demand evidence.

AWS invests billions of dollars annually in the security of its physical and logical infrastructure. This is not a marketing claim — it is verifiable through independent third-party audits whose reports are publicly accessible through AWS Artifact. AWS employs thousands of dedicated security engineers, operates hundreds of data center facilities worldwide, and has built proprietary security hardware (the AWS Nitro System) specifically to eliminate the security risks inherent in traditional hypervisor architectures. No single customer — and very few enterprises — could match this security investment independently.

The practical significance for cloud architects and compliance officers: AWS's security-of-the-cloud layer satisfies large portions of common compliance frameworks for the infrastructure layer. When your auditor asks how you ensure physical access controls, hardware security, and infrastructure-layer DDoS protection, the answer is: AWS handles these, and here is the audit report proving it. Knowing exactly what is in that layer — and how to retrieve the documentation — is a core CLF-C02 skill.

## Core Concepts

### Physical Data Center Security

AWS operates purpose-built data center facilities with security controls that far exceed what most organizations can build independently. The locations of AWS data centers are not publicly disclosed — this is itself a security control, reducing the physical attack surface by eliminating the ability of adversaries to target specific facilities.

Physical security layers at each facility include: outer perimeter security (fencing, vehicle barriers), security guard staffing around the clock, camera surveillance of all entry and exit points, biometric access controls (handprint readers, retina scanners at some facilities), electronic badge access with need-to-know provisioning, and man-trap entries that prevent tailgating (a second door that only opens after the first closes). AWS employees who work at data centers only access the specific areas required for their role — even AWS engineers cannot walk into any data center they choose.

AWS commissions third-party auditors to physically inspect these controls and issue audit reports. Those reports are available to customers via AWS Artifact and can be shared with enterprise customers, auditors, and regulators as evidence of physical security without requiring anyone to visit a data center that AWS will not publicly acknowledge exists.

### Hardware and Infrastructure Security

AWS manages the security of every piece of hardware in its data centers: the servers (compute), the storage systems (SAN, NAS, and object storage infrastructure), and the networking equipment (switches, routers, fiber, peering equipment). Hardware procurement, deployment, maintenance, and decommissioning all occur under AWS security controls.

Particularly important is hardware decommissioning security: when a storage device reaches end of life, AWS uses DOD-standard degaussing and physical destruction to ensure no customer data can be recovered from decommissioned media. You cannot request this process — AWS does it automatically, and the process is documented in audit reports. This is why encryption at rest, while a customer responsibility, is supported by an additional physical destruction guarantee from AWS's hardware lifecycle management.

AWS also manages the firmware on its hardware. This matters because supply-chain attacks targeting server firmware have become a significant threat vector. AWS's custom silicon initiatives (Graviton processors, Nitro cards) give AWS direct control over the firmware supply chain, reducing exposure to third-party firmware vulnerabilities.

### The AWS Nitro System and Hypervisor Security

The hypervisor is the software layer that creates and manages virtual machines on a physical host, enforcing isolation between tenants. In a multi-tenant environment like AWS EC2, the hypervisor is the security boundary between your instance and every other customer running on the same physical machine. A hypervisor vulnerability is an AWS responsibility — not because AWS wrote bad software, but because the customer has no access to the hypervisor and cannot patch it. AWS must patch it.

AWS's Nitro System is a purpose-built hardware and software architecture that fundamentally reimagines how hypervisors work. Instead of running a large hypervisor software stack on the same CPU that handles customer workloads, Nitro offloads virtualization functions to dedicated hardware cards (Nitro Cards) attached to each host. This means:

- The customer's EC2 instance runs on bare-metal compute with almost no hypervisor overhead.
- Virtualization management is handled by a separate processor on the Nitro Card that has no network connectivity accessible to customers.
- The attack surface of the hypervisor is dramatically reduced — an attacker compromising a customer instance cannot reach the Nitro management plane because it is on separate silicon.
- AWS can cryptographically attest the integrity of the Nitro firmware, providing hardware-root-of-trust security assurances.

This architecture is why AWS can offer Bare Metal instance types (e.g., i3.metal, c5.metal) — the Nitro system provides isolation without a traditional hypervisor in the data path. For customers with compliance requirements that prohibit shared hypervisors (some government frameworks), Nitro bare-metal instances are the answer.

### Global Network Infrastructure

AWS operates one of the largest private global networks in the world — a fiber backbone connecting AWS Regions, Availability Zones, and Edge Locations (CloudFront Points of Presence) that carries AWS service traffic off the public internet wherever possible. When you use AWS services in the same Region, traffic between those services typically travels over AWS's private network, not the public internet.

AWS's global network infrastructure security includes: physical fiber security (buried, redundant routes), route security (BGP route filtering to prevent route hijacking), DDoS mitigation at the network edge (AWS Shield Standard, which is free and automatic for all AWS customers), and continuous traffic monitoring by AWS network security teams. AWS has absorbed some of the largest DDoS attacks ever recorded at the infrastructure layer, protecting all customers on that infrastructure simultaneously.

This is why AWS Shield Standard is described as part of AWS's security responsibility — the infrastructure-layer DDoS protection happens at the AWS network boundary, before traffic even reaches your resources. You cannot disable it, configure it, or see its operation. It is part of the foundation.

### Managed Service Software Stacks

When you use a managed AWS service — RDS, Lambda, DynamoDB, ElastiCache, Redshift, or any of the dozens of other managed services — AWS is responsible for the security of the software stack that powers that service. For RDS MySQL, this means AWS patches the MySQL engine, the underlying Linux OS, the storage management software, and the hardware. You consume a database endpoint — you never see or touch the infrastructure behind it.

This is one of the most significant security value propositions in cloud computing: an RDS instance running MySQL is as patched and hardened as AWS's security team makes it. You did not write the database engine, you do not manage the server it runs on, and you are not responsible for vulnerabilities in the MySQL binary. AWS is. When a critical MySQL CVE is published, AWS patches the managed fleet — and your instances receive that patch according to AWS's maintenance schedule, with or without your active involvement.

The corollary: you cannot prevent AWS from patching managed service software. Maintenance windows for RDS and ElastiCache are customer-configurable (you choose when patches apply), but you cannot indefinitely defer patches. This is a design property of managed services, not a limitation — it ensures the managed fleet stays secure.

## Configuration Reference

### AWS Artifact Console Walkthrough

AWS Artifact is the self-service portal for downloading AWS compliance reports and managing compliance agreements. It is where you retrieve third-party audit documentation that proves AWS's security-of-the-cloud controls. Here is how to navigate it:

**Accessing AWS Artifact:**
1. Sign in to the AWS Management Console.
2. In the search bar at the top, type **Artifact** and select **AWS Artifact** from the results.
3. You will land on the AWS Artifact home page, which shows two sections: **Reports** and **Agreements**.

**Navigating to Reports:**
1. Click **Reports** in the left navigation panel.
2. You will see a searchable table of available compliance documents. These are the actual third-party audit reports for AWS's infrastructure.
3. Use the search box to filter by keyword. Try searching:
   - **"SOC"** — returns SOC 1, SOC 2 Type I, SOC 2 Type II, and SOC 3 reports
   - **"ISO"** — returns ISO 27001, ISO 27017, ISO 27018, and ISO 9001 certificates
   - **"PCI"** — returns PCI DSS Attestation of Compliance and PCI DSS Responsibility Summary
   - **"FedRAMP"** — returns FedRAMP authorization documentation
   - **"HIPAA"** — returns HIPAA-related documentation

**Downloading a SOC 2 Type II Report:**
1. Search for **"SOC 2"** in the Reports search box.
2. Find the row labeled **AWS SOC 2 Type II Report** — this is the most commonly requested report for enterprise security questionnaires and vendor risk assessments.
3. Click the report row to expand details. You will see:
   - **Report period** — the dates the audit covers (typically 12 months)
   - **Issuing audit firm** — the independent CPA firm that performed the audit
   - **Services in scope** — the list of AWS services covered by this audit
4. Check the **NDA agreement** checkbox to confirm you have read and agree to the nondisclosure terms (required before download).
5. Click **Download** — the PDF downloads to your machine.
6. The report is confidential — you may share it under NDA with customers and auditors, but not publicly.

**What the SOC 2 Type II Report Proves:**
A SOC 2 Type II report is an audit conducted by an independent CPA firm against the AICPA Trust Services Criteria, covering Security, Availability, Processing Integrity, Confidentiality, and Privacy. Type II means the auditor tested controls over a period of time (typically 6–12 months) — not just verified that controls exist at a point in time. The report proves that AWS's physical, logical, and organizational security controls existed and operated effectively during the audit period. This is the most requested report for B2B SaaS vendor security questionnaires and enterprise procurement security reviews.

**Downloading an ISO 27001 Certificate:**
1. Search for **"ISO 27001"** in the Reports search box.
2. Select the **AWS ISO 27001 Certificate** row.
3. Accept the terms and download the certificate PDF.
4. The certificate shows the certification scope (which AWS services and Regions are in scope), the issuing certification body, and the certificate validity period.

**What ISO 27001 Proves:**
ISO/IEC 27001 is an internationally recognized standard for information security management systems (ISMS). AWS's ISO 27001 certificate proves that AWS's ISMS has been independently assessed and found to meet the standard's requirements for systematically managing information security risks. This is commonly required by European enterprise customers and organizations operating under EU data protection regulations.

**Navigating to Agreements:**
1. Click **Agreements** in the left navigation panel.
2. This section shows the legal agreements available for your AWS account — including the HIPAA Business Associate Agreement and the GDPR Data Processing Addendum.
3. These agreements are covered in detail in the Compliance lesson. From a security-of-the-cloud perspective, these agreements document AWS's security and privacy commitments at the contractual level.

### Key Compliance Reports Available in AWS Artifact

| Report Type | What It Covers | Typical Use Case |
|---|---|---|
| SOC 1 Type II | Financial reporting controls (SSAE 18) | Financial services audits, SOX compliance |
| SOC 2 Type II | Security, availability, processing integrity, confidentiality, privacy | Enterprise vendor security questionnaires, B2B sales |
| SOC 3 | Public summary of SOC 2 (no NDA required) | Website posting, general marketing |
| ISO 27001 Certificate | Information security management system | EU customers, international enterprise |
| ISO 27017 | Cloud-specific security controls | Cloud security assessments |
| ISO 27018 | Protection of PII in public clouds | Data privacy reviews |
| PCI DSS Attestation of Compliance | Payment card data security | Cardholder data environment reviews |
| PCI DSS Responsibility Summary | Which PCI controls are AWS's vs. customer's | PCI self-assessment questionnaires |
| FedRAMP Package | US federal agency authorization documentation | Government procurement |
| HIPAA Documentation | AWS HIPAA-eligible services and controls | Healthcare compliance reviews |
| SOC 2 + HITRUST CSF | Healthcare security framework | Healthcare enterprise sales |

## How to Decide

When evaluating a security control and determining whether it falls under AWS's cloud-layer responsibility, use this framework:

| Question | AWS Responsibility If... |
|---|---|
| Can the customer configure this control in the Console or API? | No — if there is no customer-facing configuration option, it is AWS's |
| Does this control operate at the physical facility level? | Yes — all physical facility controls are AWS's |
| Does this control operate at the hypervisor or below? | Yes — hypervisor isolation and everything below it is AWS's |
| Is this control part of a managed service's software stack (e.g., RDS engine patching)? | Yes — managed service runtime security is AWS's |
| Can the customer opt out of this control? | No — if it cannot be disabled, it is AWS's foundation layer |
| Is this control documented in AWS Artifact audit reports? | Yes — controls documented in AWS's audit reports are AWS-operated |

**Practical example:** A customer asks whether AWS is responsible for DDoS protection at the network layer. Walk through: Can the customer configure or disable it? No — Shield Standard is always on. Is it at the network infrastructure level? Yes. Is it documented in AWS audit reports? Yes. Result: AWS responsibility (Shield Standard infrastructure-layer protection). Note that application-layer DDoS (Layer 7) still requires customer-side WAF configuration — the customer cannot offload that to AWS's infrastructure controls.

## How This Connects

- **AWS Artifact** — the portal where AWS's security-of-the-cloud controls are documented through third-party audit reports. The reports in Artifact are what make AWS's claims about physical and infrastructure security verifiable.
- **AWS Shield Standard** — the always-on DDoS mitigation service that represents AWS's infrastructure-layer network security commitment to every customer at no additional cost.
- **Amazon EC2 Nitro System** — the proprietary hardware and software architecture that underlies EC2's hypervisor security, tenant isolation, and bare-metal instance offerings.
- **AWS GovCloud (US)** — the isolated AWS Regions designed to meet US government compliance requirements including FedRAMP High, representing the highest tier of AWS's infrastructure-level security certification.
- **AWS Compliance Center** — the public documentation portal at aws.amazon.com/compliance/ where AWS lists all active compliance certifications, maps services to compliance frameworks, and provides curated guidance for regulated industries.

## Exam Traps

**Trap 1: "Customers are responsible for the hypervisor on EC2."** Never. The hypervisor is entirely AWS's domain. Customers have zero access to the hypervisor — they cannot configure it, patch it, or inspect it. Hypervisor vulnerabilities are AWS's problem to fix. Customers can choose instance types (including Nitro bare-metal) but cannot interact with the hypervisor layer itself.

**Trap 2: "AWS Shield Standard requires the customer to configure and enable it."** False. AWS Shield Standard is automatically active for all AWS customers at no cost — it requires no setup, no configuration, and no opt-in. It protects against common infrastructure-layer (L3/L4) DDoS attacks at the AWS network boundary. It is one of the clearest examples of a pure AWS responsibility.

**Trap 3: "AWS Artifact is a security service for monitoring customer resources."** Incorrect. AWS Artifact is a compliance document repository — its purpose is to provide self-service access to AWS's audit reports and legal agreements. It does not scan your resources, generate security findings, or monitor your configuration. Monitoring customer resources is the domain of Security Hub, GuardDuty, and Config — customer-side tools.

**Trap 4: "Customers can request to see AWS data centers to verify physical security."** AWS does not permit customer visits to its data center facilities. Physical security verification happens through third-party audit reports (SOC 2, ISO 27001), which are available in AWS Artifact. This is a standard model in the industry — auditors visit on behalf of customers so that no customer can physically inspect the facilities directly.

**Trap 5: "The SOC 3 report is more detailed than the SOC 2 report."** The opposite is true. The SOC 3 is a public summary of the SOC 2 — it can be shared freely without an NDA and is suitable for marketing use, but it lacks the detailed control descriptions and auditor findings in the SOC 2. Enterprise procurement and security reviews require the full SOC 2 Type II, not the SOC 3.

## Summary

- AWS's security-of-the-cloud layer covers physical data center security (facilities, guards, access controls, surveillance), hardware security (servers, storage, networking, firmware, secure decommissioning), hypervisor isolation (the AWS Nitro System enforces tenant separation at the hardware level), global network infrastructure security (private fiber backbone, BGP route filtering, Shield Standard DDoS mitigation), and managed service software stacks (OS and runtime patching for RDS, Lambda, and other managed services).
- Customers have no access to these controls — they cannot configure, inspect, or disable them. Verification comes through third-party audit reports, not direct customer access.
- AWS Artifact is the self-service portal for downloading these audit reports (SOC 1/2/3, ISO 27001, PCI DSS Attestation, FedRAMP documentation) without contacting AWS support or engaging an account team.
- The AWS Nitro System is a proprietary hardware architecture that eliminates traditional hypervisor software from the customer compute path, reducing attack surface and enabling hardware-root-of-trust security assurances.
- AWS Shield Standard provides automatic, always-on infrastructure-layer DDoS protection for all AWS customers at no cost — it is an AWS responsibility, not a customer configuration task.
- Third-party audit reports from AWS Artifact are the correct answer when asked how to verify or document AWS's physical or infrastructure security controls for enterprise customers, regulators, or auditors.

## Examples

**Beginner:** A startup CTO is filling out a vendor security questionnaire from a prospective enterprise customer. Question 47: "Describe the physical security controls at the data centers where customer data is stored." Without AWS, this would require a written description of facilities the CTO has never seen and cannot visit. With AWS Artifact, the CTO downloads the AWS SOC 2 Type II report, attaches it to the questionnaire response, and notes that AWS's independent auditor has verified physical access controls, environmental safeguards, and surveillance systems as part of a 12-month audit. The enterprise's security team accepts the report. The CTO closed a security question without leaving their desk — that is the practical value of AWS's audit posture.

**Intermediate:** A mid-size financial services company is evaluating the security risks of running their core trading engine on EC2. Their security team raises a concern: multi-tenancy means other customers run on the same physical hosts, and they worry about side-channel attacks that could expose in-memory data (like the Spectre/Meltdown class of vulnerabilities). Their AWS solutions architect explains the Nitro System: the management plane runs on dedicated Nitro Cards with no customer-accessible network interface, the compute runs on bare-metal CPUs with hardware-enforced isolation, and AWS's response to Spectre/Meltdown was to patch the Nitro firmware — not the guest OS — because the isolation layer is at the hardware level. For highest assurance, they choose C5 bare-metal instances, which run their workload with no traditional hypervisor at all. The security concern is addressed, and it is addressed entirely by an AWS-controlled layer.

**Advanced:** A US federal agency is migrating a system that processes classified government data and requires FedRAMP High authorization. Their compliance team downloads the AWS GovCloud FedRAMP High authorization package from AWS Artifact to review which controls are AWS-inherited versus customer-owned. They find that of the 421 NIST SP 800-53 controls in FedRAMP High, approximately 117 are fully inherited from AWS (physical and environmental controls, hardware controls, hypervisor controls, infrastructure monitoring) — these do not require agency implementation or documentation. Another 180 are "shared" — AWS provides the capability, the agency must configure and document their use. The remaining controls are entirely agency-owned. By understanding the AWS security-of-the-cloud layer precisely, the agency's ATO team reduces their documentation burden by roughly 28% and cuts their estimated time-to-ATO from 24 months to 16 months.

## Think About It

1. AWS does not disclose the physical locations of its data centers. What specific threat does this ambiguity mitigate, and do you think the trade-off — reduced customer transparency in exchange for physical security — is the correct design choice for a public cloud provider?
2. The AWS Nitro System moves hypervisor management from software running on the customer's CPU to dedicated hardware. What class of attacks does this architectural change defeat, and are there any new attack surfaces it introduces that did not exist in traditional hypervisor architectures?
3. AWS's physical and infrastructure security controls are verified by third-party auditors rather than by customers directly. What are the genuine limitations of relying on audit reports rather than direct inspection — and are there circumstances where those limitations would cause a sophisticated security buyer to distrust the reports?
4. AWS Shield Standard provides infrastructure-layer DDoS protection automatically and at no cost. What specific types of DDoS attacks does it NOT protect against, and why does protecting against those remaining attack types require customer action rather than AWS infrastructure?
5. When AWS patches a critical CVE in the managed MySQL engine on RDS, customers receive that patch during their next maintenance window. What happens in the period between CVE disclosure and patch delivery — who bears the residual risk during that window, and what can a customer do to reduce exposure during that gap?

## Quick Check

**Q1.** A customer running a sensitive financial application on EC2 is concerned that another AWS customer running on the same physical host could read their instance's in-memory data. Who is responsible for preventing this, and what AWS technology specifically addresses this risk?

- A) The customer, by encrypting all data written to memory before use
- B) AWS, through the Nitro System's hardware-enforced isolation between customer workloads on shared physical hosts
- C) The customer, by purchasing Dedicated Hosts to ensure exclusive use of physical hardware
- D) AWS and the customer share equal responsibility for this risk

**Answer: B** — Hypervisor-level tenant isolation is entirely AWS's responsibility, enforced by the Nitro System. The Nitro Card's dedicated management processor enforces isolation at the hardware level, not just in software. A customer on the same physical host has no privileged access to another customer's instance memory. Dedicated Hosts are a customer choice that provides physical host exclusivity — but they are not required for security; Nitro-based isolation already addresses the concern.

**Q2.** A security auditor working with a healthcare company asks for documentation proving that AWS data centers have appropriate physical access controls and environmental safeguards. Where should the company direct the auditor to obtain this documentation without needing to contact AWS directly?

- A) AWS Security Hub, which aggregates security posture data
- B) AWS Config, which tracks resource configuration history
- C) AWS Artifact, which provides self-service access to AWS compliance reports including SOC 2 Type II
- D) The AWS Trusted Advisor dashboard, which covers infrastructure best practices

**Answer: C** — AWS Artifact is the self-service portal for downloading AWS's third-party audit reports including the SOC 2 Type II report, which documents physical access controls, environmental safeguards, and logical security controls as verified by an independent auditor. Security Hub, Config, and Trusted Advisor are customer-facing tools focused on customer security posture, not AWS's own infrastructure audit documentation.

**Q3.** Which of the following is an example of AWS's security responsibility — not the customer's — under the Shared Responsibility Model?

- A) Enabling encryption at rest on an Amazon S3 bucket using a customer-managed KMS key
- B) Configuring security group rules to restrict inbound traffic to an EC2 instance on port 443
- C) Securing the physical servers in AWS data centers, including access controls and surveillance
- D) Patching the guest operating system on an EC2 instance running Amazon Linux 2

**Answer: C** — Physical data center security — including the servers, facilities, access controls, cameras, and environmental systems that house the hardware running EC2 — is entirely AWS's responsibility. Customers have no access to or control over physical infrastructure. Encryption configuration, security group rules, and OS patching on EC2 are all customer responsibilities.

## What's Next

Next lesson covers compliance programs — how AWS's audit reports translate into compliance framework certifications, how customers inherit compliance for the infrastructure layer, and how to use AWS Artifact and the AWS Compliance Center to manage regulatory requirements for HIPAA, PCI DSS, SOC 2, FedRAMP, and GDPR.
