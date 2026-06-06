---
title: "Canvas Lab: Exploring AWS Artifact and the Shared Responsibility Model"
type: canvas
estimated_minutes: 20
cert_tags: ["CLF-C02", "SAA-C03"]
canvas_type: open
---

# Canvas Lab: Exploring AWS Artifact and the Shared Responsibility Model

## Challenge

A healthcare startup is preparing for their first HIPAA audit and needs to understand exactly where AWS's compliance responsibilities end and theirs begin. The AWS infrastructure is already running, but the security team has no documentation to present to auditors. Your job is to use AWS Artifact to locate and download AWS's HIPAA attestation and SOC 2 Type II report, execute a Business Associate Agreement (BAA) in Artifact Agreements, and map a sample three-tier architecture to the shared responsibility model — identifying which controls belong to AWS and which belong to the customer.

## Learning Objectives

- Navigate AWS Artifact to locate and download compliance reports including the HIPAA attestation and SOC 2 Type II report
- Execute a Business Associate Agreement (BAA) through Artifact Agreements for HIPAA workloads
- Distinguish between AWS-owned compliance controls (infrastructure certifications) and customer-owned compliance controls (application configuration and data handling)
- Identify which AWS services are designated as HIPAA-eligible under the AWS Business Associate Agreement
- Map a sample architecture to the shared responsibility model, categorizing controls as AWS-managed, shared, or customer-managed

## Steps

1. Sign in to the AWS Management Console and navigate to **AWS Artifact** (search "Artifact" in the top search bar)
2. In the left navigation, click **Reports** — browse the full list and note the compliance frameworks covered (PCI DSS, SOC, ISO, HIPAA, FedRAMP, and others)
3. Locate the **HIPAA Compliance** report (titled "AWS HIPAA Compliance Package") — click to review it and note what it certifies about AWS infrastructure
4. Locate the **SOC 2 Type II** report — click **Download** and accept the NDA agreement; note the audit period and which AWS services are in scope
5. In the left navigation, click **Agreements** — review the available agreement types (BAA, GDPR DPA, etc.)
6. Locate the **AWS Business Associate Addendum (BAA)** — click **Accept agreement** and walk through the acceptance workflow; note that this activates HIPAA-eligible service protections for your account
7. Review the list of **HIPAA-eligible services** linked from the BAA confirmation page (or search "HIPAA eligible services" in AWS docs) — identify at least 5 services relevant to a healthcare workload (e.g., EC2, S3, RDS, Lambda, CloudWatch)
8. On the canvas, draw a simple three-tier architecture: public internet → ALB → EC2 (app tier) → RDS (data tier) with an S3 bucket for document storage
9. For each component in your canvas diagram, annotate whether each security control is **AWS-managed**, **shared**, or **customer-managed** — examples: physical data center security = AWS; OS patching on EC2 = customer; hypervisor security = AWS; S3 bucket policy = customer; encryption in transit = shared
10. Identify two compliance gaps the startup must close themselves that AWS Artifact cannot provide evidence for (e.g., application-level audit logging, user access reviews, workforce training)

## Archon Canvas Lab

Open the Archon canvas to complete this lab. Use the component palette on the left to drag services onto the canvas, connect them, and configure their properties.
