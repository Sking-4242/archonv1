---
title: "AWS CloudFormation"
type: content
estimated_minutes: 19
cert_tags: ["CLF-C02", "SAA-C03", "SOA-C03", "SCS-C03"]
---

# AWS CloudFormation

## Overview

AWS CloudFormation is AWS's native **infrastructure as code (IaC)** service. You describe your AWS resources in a declarative template, and CloudFormation provisions and manages them as a single unit called a **stack** — creating, updating, and deleting them in the right dependency order and rolling back on failure. This *service reference* lesson covers templates and stacks, change sets, drift, multi-account/Region deployment with StackSets, safety controls, and what each certification expects.

CloudFormation matters because clicking resources together by hand is error-prone, inconsistent, and unrepeatable. IaC makes infrastructure **versioned, reviewable, and reproducible**: the same template deploys identical environments, changes are previewed before they apply, and entire stacks tear down cleanly. The core mental model is a **template** (the desired state, in YAML/JSON) that CloudFormation continuously reconciles into a **stack** (the actual provisioned resources), tracking and updating them across their lifecycle while managing dependencies automatically.

---

## How It Works

- **Template** — a declarative document with **Resources** (the AWS components to create) and optional **Parameters** (typed inputs), **Mappings**, **Conditions**, **Metadata**, **Outputs** (exported values, optionally cross-stack via `Export`/`ImportValue`), and **intrinsic functions** (`!Ref`, `!GetAtt`, `!Sub`, `!Join`, `Fn::If`).
- **Stack** — the set of resources created from a template; CloudFormation infers and respects **dependency ordering** (and `DependsOn` for explicit ordering).
- **Change sets** — a **preview** of what an update will add, modify, or **replace** before you execute it, preventing surprise changes (some property changes force resource replacement).
- **Rollback** — on a failed create/update, CloudFormation rolls back to the last known-good state by default (configurable).

For scale and reuse: **StackSets** deploy a stack across many **accounts and Regions** from one operation (ideal with AWS Organizations and a delegated administrator); **nested stacks** and **modules** promote reuse; and the **registry** plus **custom resources** (Lambda-backed) manage third-party or bespoke resources.

---

## Key Features

- **Drift detection** — compares actual resource configuration against the template to surface out-of-band manual changes.
- **Change sets** for safe, previewed updates, including replacement awareness.
- **StackSets** for org-wide, multi-account, multi-Region deployment with automatic deployment to new accounts.
- **Deletion policies** (`Retain`/`Snapshot`/`Delete`) and **stack policies** to protect critical resources during updates; **termination protection** against accidental stack deletion.
- **CloudFormation Guard** — policy-as-code to validate templates against rules *before* deployment (a security/compliance gate).
- **Helper tools** — the **CDK** (synthesizes CloudFormation from real code) and **SAM** (serverless shorthand) build on it.

---

## Configuration Reference

- **Parameterize** templates for reuse across environments; avoid hard-coded values and secrets (reference Secrets Manager/SSM).
- **Always use change sets** before applying updates to production, watching for replacements.
- **Protect resources** with deletion policies, stack policies, and termination protection.
- **Deploy org-wide** with StackSets via a delegated administrator; validate templates in CI and enforce **CloudFormation Guard** rules.
- **Use a least-privilege stack/service role** so CloudFormation itself acts with scoped permissions.

---

## Operations and Troubleshooting

- **Stack rollback on failure.** Read the **stack events** to find the *first* failed resource and its reason (insufficient permissions, service limits, invalid properties, dependency timing).
- **Unexpected resource replacement.** Use a **change set** to see whether an update requires replacement before executing; replacement can cause data loss (e.g., a renamed DB).
- **Drift.** Run **drift detection** to find manual changes diverging from the template, then reconcile by updating the template or the resource.
- **Stuck states** like `UPDATE_ROLLBACK_FAILED` — recover with "continue rollback," optionally skipping the problematic resources, then fix and retry.

---

## Integrations

CloudFormation provisions essentially every AWS service, integrates with **AWS Organizations** (StackSets and org-wide deployment), enforces compliance with **CloudFormation Guard**, references secrets from **Secrets Manager/SSM Parameter Store**, and is the backbone of the **CDK**, **SAM**, and **Service Catalog** products. It complements **Systems Manager** (operational automation), **AWS Config** (which records configuration and detects drift/compliance), and CI/CD pipelines (CodePipeline) for deployment. Many AWS Quick Starts and partner solutions ship as templates.

---

## Pricing and Cost Considerations

CloudFormation has **no charge for stacks built from standard AWS resource types** — you pay only for the resources it provisions. (Minor charges apply to **third-party/registry resource handler operations** beyond a free tier, and to any custom-resource Lambda invocations.) The real cost considerations are indirect but significant: IaC prevents costly drift and misconfiguration, makes teardown clean (so you don't leave orphaned billable resources), and enables consistent, reviewable, repeatable environments. Exact charges for third-party resource operations vary.

---

## Exam Relevance

**CLF-C02:** Know CloudFormation as AWS's IaC service that provisions resources from templates as stacks, enabling repeatable, automated deployments. Foundational.

**SAA-C03:** Know templates/stacks, change sets and replacement, StackSets for multi-account, nested stacks, cross-stack outputs, and IaC's role in repeatable architecture. Design depth.

**SOA-C03:** Operate IaC — change sets, drift detection, rollback/stuck-state troubleshooting via stack events, stack policies, and StackSets. Operations depth; central to deployment automation.

**SCS-C03:** Secure and consistent deployment — StackSets for guardrails, **CloudFormation Guard** for policy-as-code, deletion/stack policies, and least-privilege stack roles. Security depth (Domain 6).

---

## Summary

AWS CloudFormation is declarative infrastructure as code: a template (Resources, Parameters, Conditions, Outputs, intrinsic functions) defines the desired state, and CloudFormation provisions and manages it as a stack, ordering dependencies and rolling back on failure. **Change sets** preview updates (including replacements) safely, **drift detection** finds out-of-band changes, **deletion/stack policies** and **termination protection** guard critical resources, and **StackSets** deploy across many accounts and Regions. It underpins the CDK and SAM, enforces compliance via **CloudFormation Guard**, and is free for standard resources (you pay for what it creates). The recurring exam points are change sets and replacement, drift, StackSets for org-wide deployment, and Guard for secure deployment. IaC delivers repeatable, reviewable, consistent, clean-teardown infrastructure.

---

## Quick Check

1. What is the relationship between a template and a stack, and how does CloudFormation know the order to create resources?
2. What does a change set let you preview, and why does "replacement" matter?
3. How do StackSets help deploy infrastructure across an organization?
4. What is drift detection, and what problem does it catch?
5. How can you prevent a critical resource from being accidentally deleted or replaced during a stack operation?

---

## What's Next

Pair this with **AWS Organizations** (StackSets/guardrails), **AWS Systems Manager** (operational automation), and **AWS Config** (drift/compliance recording). The SCS-C03 secure-deployment lesson builds on CloudFormation and Guard.
