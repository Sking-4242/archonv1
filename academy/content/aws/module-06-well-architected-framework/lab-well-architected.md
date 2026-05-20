---
title: "Lab: Run the Well-Architected Tool"
type: canvas
estimated_minutes: 25
cert_tags: ["aws_ccp", "aws_saa"]
---

# Lab: Run the Well-Architected Tool

## Challenge

In this lab you'll run a Well-Architected review against a sample workload using the AWS Well-Architected Tool. You'll answer questions for each pillar, identify high-risk issues, and diagram a remediation architecture in Archon.

## Learning Objectives

- Define a workload in the Well-Architected Tool
- Complete a review for at least two pillars (Security and Reliability)
- Identify and document High Risk Issues (HRIs)
- Diagram a remediated architecture in Archon that addresses identified risks

## Steps

1. In the AWS console, navigate to Well-Architected Tool → Define workload (name: 'SampleWebApp', industry: 'General')
2. Start a review → select 'Operational Excellence' → answer the milestone questions
3. Select 'Security' → answer questions about IAM, data protection, network controls
4. Select 'Reliability' → answer questions about multi-AZ, backup, failure recovery
5. Review the 'Improvement Plan' — note all High Risk Issues identified
6. For each HRI, read the improvement guidance AWS provides
7. Open the Archon canvas and build the 'before' architecture (with the identified risks)
8. Create a second canvas view showing the 'after' architecture with each HRI remediated
9. Save milestone in the WAT and download the PDF report

## Archon Canvas Lab

Open the Archon canvas to diagram the architecture for this lab. Use the component library to place AWS services and label each with its key configuration.
