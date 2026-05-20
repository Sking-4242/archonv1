---
title: "Exam Strategy and Certification Path"
type: content
estimated_minutes: 8
cert_tags: ["SAA-C03", "SAP-C02", "CLF-C02"]
---

# Exam Strategy and Certification Path

## Overview

This final lesson summarizes the certification path from Cloud Practitioner to Solutions Architect Professional, provides exam strategy guidance, and points to resources for continued learning after this course.

## AWS Certification Path

Cloud Practitioner (CLF-C02): Foundational, no technical prerequisite. Validates basic cloud literacy. Solutions Architect Associate (SAA-C03): Most popular AWS cert. Tests architectural decision-making across core services. 130 minutes, 65 questions, 72% pass score. Solutions Architect Professional (SAP-C02): Advanced, 3+ years AWS experience recommended. Complex multi-service scenarios, migration architecture, cost/HA tradeoffs. 180 minutes, 75 questions. DevOps Engineer Professional and Specialty certs (Security, Database, ML, Data Analytics) go deeper on specific domains. Start with SAA-C03 — it's the most versatile and widely respected.

## SAA-C03 Exam Strategy

Question format: scenario-based, usually 4 answer choices. One 'most correct' answer, distractors that are close but wrong. Key disqualifiers: 'manually', 'additional maintenance', 'not fully managed', 'higher cost for same result'. Look for: managed services over self-managed, multi-AZ for HA, auto-scaling for elasticity, KMS encryption for security, IAM roles over access keys, CloudFront + S3 for static content. Eliminate answers that violate well-known anti-patterns (single points of failure, public RDS, hardcoded credentials).

## Common Exam Traps

Custom application on EC2 vs. managed service: if a managed service exists for the use case (e.g., SQS for queuing, RDS for relational DB), it's almost always the correct answer over rolling your own on EC2. Over-engineering: if the question says 'simple' or 'low cost', don't choose the complex high-HA multi-region answer. Under-engineering: 'highly available' means at least two AZs, load balancer, and no single EC2 instance. Read every question carefully — 'minimize operational overhead' and 'most cost-effective' often have different correct answers.

## Continued Learning

After this course: AWS Skill Builder (official AWS learning platform with hundreds of courses and practice exams), AWS documentation and whitepapers (especially the Well-Architected Framework and service FAQs), Adrian Cantrill and Stephane Maarek courses (highly rated third-party courses), AWS re:Invent session recordings (architecture deep-dives from AWS engineers), and building real projects on AWS (nothing cements knowledge like hands-on experience with real AWS accounts). The Archon platform gives you a sandbox to design architectures — use it to validate your understanding of every module in this course.

## Summary

Certification path: CLF-C02 → SAA-C03 → SAP-C02 and specialty certs. For SAA-C03: favor managed services, eliminate SPOFs, use multi-AZ, choose based on operational overhead and cost keywords in the question. Practice with official AWS exam prep questions and use Skill Builder. Real hands-on experience (building architectures in AWS) is the best exam prep. You've covered all the services — now reinforce with practice questions and labs.

## What's Next

You have completed the AWS: Zero to Cloud Architect course. Good luck on your certification exam.