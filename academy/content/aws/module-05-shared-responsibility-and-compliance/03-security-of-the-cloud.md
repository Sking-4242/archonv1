---
title: "Security Of the Cloud (AWS Responsibility)"
type: content
estimated_minutes: 6
cert_tags: ["aws_ccp"]
---

# Security Of the Cloud (AWS Responsibility)

## Overview

AWS's security responsibilities are extensive and expensive — they're a core part of the value proposition of cloud. AWS invests billions in security annually, employing thousands of security engineers and operating physical data centers with multiple layers of physical and logical security controls.

## Physical and Environmental Security

AWS data centers are purpose-built facilities with perimeter security (fencing, guards, cameras), multiple physical access controls (badge access, biometrics, man-traps), environmental controls (redundant power, cooling, fire suppression), and geographic distribution (multiple AZs and Regions to survive disasters). The locations of AWS data centers are confidential — AWS doesn't publicize which cities house its facilities, as a physical security measure.

AWS undergoes regular third-party audits (SOC 1, SOC 2, SOC 3, ISO 27001, PCI DSS) to verify its physical and logical security controls. These audit reports are available through AWS Artifact.

## Infrastructure Security

AWS is responsible for the security of the global network (fiber, peering, DDoS mitigation at the infrastructure level), the hypervisor that provides isolation between customer workloads on shared hardware, the firmware and hardware of servers, and the managed service software stacks (the RDS database engine, the Lambda runtime, etc.).

Importantly, AWS is responsible for ensuring that your EC2 instances are isolated from other customers' instances running on the same physical host. The hypervisor enforces this boundary — a bug in the hypervisor would be an AWS responsibility, not yours.

## Summary

AWS is responsible for: physical data center security (facilities, guards, access controls), hardware security (servers, networking, storage), the hypervisor and virtualization layer (isolation between customer workloads), global network security, and the software stacks for managed services. These controls are verified by third-party auditors and documented in compliance reports available through AWS Artifact.

## Examples

A company running a multi-tenant analytics platform on EC2 worries that another customer on the same physical host could read their in-memory data through a side-channel attack. This is a legitimate concern in bare-metal virtualization, but it is AWS's problem to solve, not theirs. AWS's Nitro hypervisor is specifically architected to eliminate this class of attack — and if a hypervisor vulnerability were discovered, AWS would be responsible for patching it across the fleet. The customer cannot patch the hypervisor; they have no access to it. This is precisely the boundary the model defines.

A startup CTO is asked by an enterprise prospect: "How do we know your AWS data centers are physically secure?" Rather than describing security controls they've never seen, the CTO downloads the AWS SOC 2 Type II report from AWS Artifact and shares it with the prospect's security team. The report is produced by an independent auditor and covers physical access controls, environmental safeguards, and logical security. The CTO didn't build those controls — AWS did — but the third-party audit gives the enterprise the independent verification they require. This is the practical value of AWS's audit posture for customers trying to close enterprise deals.

A fintech company evaluating AWS vs. colocation for their core banking system calculates what it would cost to replicate AWS's physical security controls in a private data center: redundant power feeds, biometric access systems, 24/7 security staff, fire suppression, quarterly physical penetration testing, and third-party audits. The cost is prohibitive. Moving to AWS doesn't just outsource that burden — it outsources it to an organization that can amortize billions in security investment across millions of customers. The security-of-the-cloud layer is often better than what any individual company could build.

## Think About It

1. AWS doesn't disclose the physical locations of its data centers. What threat does this ambiguity actually mitigate, and do you think the trade-off — less customer transparency in exchange for physical security — is the right call?
2. The hypervisor is the boundary between customer isolation and shared infrastructure. What would happen if a critical hypervisor vulnerability were discovered across all EC2 instance types simultaneously? Who is responsible for the response, and what can a customer actually do while waiting for AWS to patch it?
3. AWS's physical and infrastructure security is verified by third-party auditors, not by customers directly. What are the limitations of relying on audit reports rather than direct inspection — and when might those limitations matter?
4. AWS absorbs DDoS mitigation at the infrastructure layer through AWS Shield Standard. What does that cover, and why does a large-scale application-layer DDoS attack still require customer action despite AWS's infrastructure-level protections?
5. If AWS is responsible for the security of managed service software stacks (like the Lambda runtime), what is the customer's residual risk when using those services — and how should that inform their security architecture decisions?

## Quick Check

**Q1.** A customer is concerned about another AWS customer on the same physical host accessing their EC2 instance's data. Who is responsible for preventing this, and how?
- A) The customer, by encrypting all data in memory
- B) AWS, through hypervisor-enforced isolation between customer workloads
- C) The customer, by using dedicated hosts only
- D) AWS and the customer share this responsibility equally

**Answer: B** — Isolation between customer workloads on shared physical hardware is an AWS responsibility, enforced by the hypervisor. A customer on the same host has no privileged access to another customer's instance.

**Q2.** Where can customers download AWS SOC 2 compliance reports and other third-party audit documents without contacting AWS support?
- A) AWS Security Hub
- B) AWS Config
- C) AWS Artifact
- D) AWS Trusted Advisor

**Answer: C** — AWS Artifact is the self-service portal for downloading compliance reports including SOC 1/2/3, ISO certifications, and PCI DSS documentation.

**Q3.** Which of the following is an example of AWS's security responsibility, NOT the customer's?
- A) Configuring security groups on an EC2 instance
- B) Patching the guest operating system on EC2
- C) Securing the physical servers in AWS data centers
- D) Enabling encryption on an S3 bucket

**Answer: C** — Physical data center security — including facilities, guards, and access controls for the servers that run EC2 — is entirely AWS's responsibility. The customer has no access to or control over physical infrastructure.

## What's Next

Next: Compliance programs — how AWS helps you meet regulatory requirements and the tools available for compliance verification.
