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

## What's Next

Next: A lesson on each pillar, starting with Operational Excellence.
