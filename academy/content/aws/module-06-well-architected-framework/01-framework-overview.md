---
title: "Well-Architected Framework Overview"
type: content
estimated_minutes: 8
cert_tags: ["aws_ccp", "aws_saa", "aws_sap"]
---

# Well-Architected Framework Overview

## Overview

The AWS Well-Architected Framework provides architectural best practices for designing and operating reliable, secure, efficient, cost-effective, and sustainable systems in the cloud. Published in 2015 and continuously updated, it's the result of AWS Solutions Architects reviewing thousands of customer architectures and distilling common patterns and anti-patterns.

The framework has six pillars and is available both as a whitepaper (free download) and as the Well-Architected Tool in the AWS console, which guides you through a structured review of any workload against the pillars.

## Why Well-Architected Matters

The Well-Architected Framework is the lingua franca of AWS architecture. When AWS Solutions Architects review a customer's system, they assess it against the six pillars. When certification exams present architecture scenarios, they often test whether you can identify Well-Architected principles being violated or applied. When you design a new system, the six pillars provide a checklist of considerations.

Understanding the framework at a high level (CCP, SAA) and in depth (SAP) is valuable both for exams and for building genuinely good systems. It represents the collective experience of thousands of AWS customer architectures, distilled into actionable guidance.

## The Six Pillars

The six pillars are: **Operational Excellence** (run and improve operations), **Security** (protect data and systems), **Reliability** (recover from failure), **Performance Efficiency** (use resources efficiently), **Cost Optimization** (eliminate unnecessary expense), and **Sustainability** (minimize environmental impact).

A useful memory aid: OPSRPC — Operations, Protection, Reliability, Performance, Resources, Climate. Or: every good AWS architect Should Regularly Practice Cost and Ops skills.

## The Well-Architected Tool

The Well-Architected Tool (in the AWS console under Architecture) provides a guided questionnaire for reviewing a workload against the six pillars. You describe your workload, answer yes/no/N/A questions about your architecture choices, and the tool generates a list of High Risk Issues (HRIs) and Medium Risk Issues (MRIs) with remediation guidance.

The Tool is free, takes 1-3 hours per workload review, and produces actionable output. Use it during architecture design (to catch anti-patterns early), before major launches (to validate readiness), and annually (to assess architectural drift as workloads evolve).

## Summary

The AWS Well-Architected Framework is six pillars of architectural best practices: Operational Excellence, Security, Reliability, Performance Efficiency, Cost Optimization, and Sustainability. It's used for architecture reviews, certification exams, and ongoing workload assessment. The Well-Architected Tool provides a free, guided review in the AWS console that produces prioritized risk findings.

## Examples

A regional hospital network migrating to AWS used the Well-Architected Tool before go-live on their patient portal. They answered the guided questionnaire and discovered they had no automated backups configured for their RDS database — a High Risk Issue flagged under the Reliability pillar. Catching this before launch, rather than after a data-loss incident, is exactly the kind of early validation the Tool is designed to produce.

A mid-sized e-commerce company used the six pillars as a design checklist when redesigning their order processing system. Their engineering lead assigned one pillar to each of six team members for a structured review session. The exercise surfaced a cost problem (Over-provisioned EC2 instances — Cost Optimization pillar) and a security gap (application secrets stored in plaintext environment variables — Security pillar) that had gone unnoticed for months. The framework's breadth forces teams to look beyond what they're already comfortable with.

A financial services firm running a high-frequency trading platform engaged an AWS Solutions Architect for a formal Well-Architected Review. The architect scored the workload against all six pillars, produced a prioritized list of HRIs, and used the output to build a 12-month remediation roadmap. Because the framework is standardized, the firm could use the same review format across three different workloads and compare results — something that ad-hoc architecture reviews rarely enable.

## Think About It

1. The framework was built by distilling patterns from thousands of customer architecture reviews. Why might that process produce better guidance than a small group of experts reasoning from first principles?
2. The six pillars sometimes create tension with each other — for example, adding redundancy for Reliability increases cost. How would you decide which pillar to prioritize when trade-offs are unavoidable?
3. The Well-Architected Tool produces High Risk Issues and Medium Risk Issues, but not all HRIs are equally important to every business. What factors would you weigh when deciding which findings to remediate first?
4. Why might it be valuable to run a Well-Architected review on a workload that is already in production and running smoothly, rather than only using the framework for new designs?
5. What is the difference between using the framework as a checklist and genuinely internalizing it as a design philosophy? What would that difference look like in practice?

## Quick Check

**Q1.** How many pillars does the AWS Well-Architected Framework have?
- A) Four
- B) Five
- C) Six
- D) Seven

**Answer: C** — The framework has six pillars: Operational Excellence, Security, Reliability, Performance Efficiency, Cost Optimization, and Sustainability.

**Q2.** What does the Well-Architected Tool produce after you complete a workload review?
- A) A cost estimate for your architecture
- B) A list of High Risk Issues and Medium Risk Issues with remediation guidance
- C) An auto-remediation script that fixes configuration gaps
- D) A compliance certificate for regulatory purposes

**Answer: B** — The Tool generates prioritized HRIs and MRIs based on your answers to the guided questionnaire, along with remediation recommendations for each finding.

**Q3.** When was the AWS Well-Architected Framework first published?
- A) 2010
- B) 2013
- C) 2015
- D) 2019

**Answer: C** — The framework was published in 2015, drawing on AWS Solutions Architects' reviews of thousands of customer architectures up to that point.

## What's Next

Next: A lesson on each pillar, starting with Operational Excellence.
