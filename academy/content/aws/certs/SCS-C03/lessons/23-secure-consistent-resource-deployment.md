---
title: "Secure and Consistent Resource Deployment"
type: content
estimated_minutes: 17
cert_tags: ["SCS-C03"]
---

# Secure and Consistent Resource Deployment

## Overview

Guardrails define what *must not* happen; the deployment strategy determines what *does* happen, consistently and securely, across many accounts. The Security Specialty exam's Task 6.2 covers implementing a secure and consistent deployment strategy: using **infrastructure as code (IaC)** to deploy resources reliably across accounts, organizing resources with **tags**, enforcing policies and configurations from a **central source**, and **securely sharing resources** across accounts. This is the build-side complement to the governance guardrails — ensuring resources are provisioned the same secure way everywhere, rather than hand-built and inconsistent.

The principle is **consistency as a security property**. Manually created infrastructure drifts: one account's bucket is encrypted and another's isn't, one security group is tight and another is wide open, and no one can prove what's deployed where. Infrastructure as code makes deployments **repeatable, reviewable, and auditable** — the same template produces the same secure configuration every time, changes are version-controlled and peer-reviewed, and security checks can run *before* anything is deployed. Add multi-account deployment (StackSets), policy-as-code validation, disciplined tagging, and controlled resource sharing, and you get an environment where security is built in at provisioning time and consistent across the organization. The specialty candidate must know the AWS IaC and sharing tools and how to embed security into the deployment pipeline.

This lesson covers IaC at scale, policy-as-code validation, tagging, central enforcement, and secure resource sharing. After it you will be able to design a secure, consistent, multi-account deployment strategy.

## Core Concepts

### Infrastructure as Code with CloudFormation

**AWS CloudFormation** provisions resources from declarative templates, giving you repeatable, version-controlled, auditable infrastructure. For security this matters because the template *is* the configuration of record — you can review it, scan it, and know exactly what's deployed. Templates encode secure defaults (encryption on, public access blocked, least-privilege roles) so every deployment inherits them. **CloudFormation StackSets** extend this across **many accounts and Regions** from a single operation — deploying a baseline (e.g., a security configuration, an IAM role, a Config rule) to every account in an OU automatically, including new accounts. The exam pairs "deploy consistent resources/security configuration across many accounts" with CloudFormation StackSets, often integrated with Control Tower.

### Policy as Code: Validating IaC Before Deployment

The security payoff of IaC is **catching problems before they're deployed** — shifting security left. AWS provides tools to validate templates: **CloudFormation Guard (cfn-guard)** is a policy-as-code language that checks templates against your security rules (e.g., "every S3 bucket must have encryption and Block Public Access," "no security group may allow 0.0.0.0/0 on 22") and fails the build if a template violates them; **cfn-lint** catches template errors and some best-practice issues; and **IAM Access Analyzer custom policy checks** (from Domain 4) validate IAM policies in the pipeline. Integrating these as pipeline stages means non-compliant infrastructure never reaches an account. The exam expects policy-as-code (CloudFormation Guard, cfn-lint) as the mechanism for enforcing security standards on IaC pre-deployment, complementing the runtime guardrails (SCPs/RCPs) and detective controls (Config).

### Tagging Strategy

**Tags** organize resources for management, cost allocation, automation, and — importantly — **security**. A consistent tagging strategy (by environment, owner, data classification, cost center) enables **ABAC** (tag-based access control from Domain 4), automated security responses (isolate resources tagged `quarantine`), backup selection (back up resources tagged `backup=daily`), and compliance scoping. **Tag policies** (an organization policy) standardize tag keys/values across the org, and tools enforce required tags. The security relevance: tags drive attribute-based authorization and automated controls, so disciplined, governed tagging is a prerequisite for those mechanisms — untagged or inconsistently tagged resources break ABAC and automation. The exam connects tagging to ABAC, automation, and governance.

### Central Policy and Configuration Enforcement

Beyond deploying resources, you enforce **security configurations from a central source**. **AWS Firewall Manager** centrally manages and enforces firewall policies — WAF rules, Shield Advanced protections, security group policies, Network Firewall, and DNS Firewall — across all accounts and resources in the organization, automatically applying them to existing and new resources and remediating non-compliance. This is how you guarantee, for example, that every internet-facing ALB has a baseline WAF rule set without configuring each one. Firewall Manager requires Organizations and a delegated administrator. The exam pairs "centrally deploy and enforce firewall/WAF/security-group policies across accounts" with Firewall Manager, distinct from configuring WAF on a single resource.

### Secure Resource Sharing: RAM and Service Catalog

Multi-account architectures need to **share resources securely** without copying or over-exposing them. **AWS Resource Access Manager (RAM)** lets you share specific resources (subnets/VPCs, Transit Gateways, Route 53 Resolver rules, License Manager configurations, and more) with other accounts or the whole organization in a controlled, auditable way — for example, a central networking account shares subnets so workload accounts deploy into a governed VPC without each managing its own. **AWS Service Catalog** lets a central team publish **approved, pre-configured products** (CloudFormation-based) that other accounts/users can deploy in a self-service but governed way — so teams provision only vetted, secure configurations, with constraints and least-privilege launch roles. The exam pairs "share specific resources across accounts securely" with RAM and "let teams self-service deploy only approved, secure resource configurations" with Service Catalog.

### Drift Detection and Deployment Integrity

Deploying securely once isn't enough — the environment must *stay* as deployed. **CloudFormation drift detection** identifies when resources have been changed outside of CloudFormation (someone edited a security group by hand), so you can detect and correct configuration drift that bypasses your reviewed templates. This pairs with **AWS Config** (detective control from the compliance lesson) to catch manual changes that violate the intended baseline. The deployment pipeline itself must also be secured: protect the IaC source repository and pipeline with least-privilege roles, require code review and approval for template changes, sign and verify artifacts, and scan templates (CloudFormation Guard) on every change — because an attacker who can modify your IaC or pipeline can deploy malicious infrastructure at scale. The exam's mindset is that consistent, secure deployment is only as trustworthy as the pipeline producing it and the drift controls keeping it intact: secure the supply chain (a recommended-knowledge area for the exam), detect drift, and remediate deviations so the running environment continues to match the reviewed, approved code.

### Putting Secure Deployment Together

A mature pattern: define infrastructure as CloudFormation, validate it with CloudFormation Guard/cfn-lint and Access Analyzer in CI/CD, deploy baselines across accounts with StackSets (and Control Tower), enforce a consistent tagging strategy, centrally apply firewall/WAF policies with Firewall Manager, share networking and other resources with RAM, and offer approved products through Service Catalog. The result is consistent, reviewed, least-privilege infrastructure provisioned the same secure way everywhere — security built into deployment rather than bolted on after. The exam rewards this end-to-end, automated, consistent approach over manual, per-account configuration.

## Configuration Reference

IaC and validation:

```text
CloudFormation            declarative, repeatable, version-controlled provisioning
CloudFormation StackSets   deploy to many accounts/Regions (+ new accounts) from one operation
CloudFormation Guard       policy-as-code: fail builds that violate security rules
cfn-lint                  template linting + best-practice checks
IAM Access Analyzer checks validate IAM policies pre-deployment (CI/CD)
```

Tagging, enforcement, sharing:

```text
Tagging strategy   environment/owner/classification → ABAC, automation, backup, compliance
Tag policies       standardize tags org-wide
AWS Firewall Manager  centrally enforce WAF/Shield/SG/Network Firewall/DNS Firewall policies org-wide
AWS RAM            securely share resources (subnets, TGW, Resolver rules) across accounts/org
AWS Service Catalog  publish approved, pre-configured products for governed self-service
```

## How to Decide

- **Deploy resources consistently and reviewably?** → CloudFormation (IaC).
- **Apply a baseline across many accounts/Regions?** → CloudFormation StackSets (with Control Tower).
- **Stop insecure infrastructure before deployment?** → CloudFormation Guard / cfn-lint / Access Analyzer in CI/CD.
- **Drive ABAC, automation, and backup selection?** → a consistent, governed tagging strategy (+ tag policies).
- **Centrally enforce WAF/firewall/security-group policies org-wide?** → AWS Firewall Manager.
- **Share resources across accounts securely?** → AWS RAM. **Offer governed self-service of approved configs?** → Service Catalog.

## How This Connects

This lesson is the build-side complement to the governance guardrails (previous lesson) — IaC and StackSets deploy into the governed account structure, and policy-as-code enforces standards that mirror the SCP/RCP guardrails before deployment. Firewall Manager operationalizes the edge/network controls from Infrastructure Security (Domain 3) org-wide; tagging connects to ABAC (Domain 4) and backup selection (Domain 5); and Access Analyzer checks connect to the IAM domain.

## Exam Traps

- **Manual, per-account configuration.** Use IaC + StackSets for consistency; manual builds drift and can't be proven.
- **Validating only after deployment.** Shift left with CloudFormation Guard/cfn-lint to block insecure templates pre-deployment.
- **Configuring WAF/firewalls per resource.** Use Firewall Manager to enforce policies centrally across all accounts/resources.
- **Copying resources to share them.** Use RAM to share specific resources securely without duplication.
- **Open self-service provisioning.** Use Service Catalog so teams deploy only approved, constrained configurations.
- **Neglecting tag governance.** ABAC, automation, and backup selection depend on consistent, governed tagging.

## Summary

Secure deployment makes consistency a security property. Infrastructure as code (CloudFormation) provides repeatable, reviewable, auditable provisioning with secure defaults, and StackSets roll baselines across many accounts and Regions (including new ones). Policy-as-code — CloudFormation Guard, cfn-lint, and IAM Access Analyzer checks in CI/CD — blocks insecure infrastructure before it deploys, shifting security left to complement runtime guardrails. A governed tagging strategy (with tag policies) drives ABAC, automation, backup selection, and compliance scoping. AWS Firewall Manager centrally enforces WAF, Shield, security-group, and firewall policies across the organization, while AWS RAM shares resources securely without duplication and AWS Service Catalog offers governed self-service of approved, pre-configured products. Together these provision least-privilege, consistent, vetted infrastructure the same secure way everywhere — security built into deployment rather than retrofitted.

## Examples

**Example 1 — Org-wide baseline.** A security configuration (Config rules, an IAM role, logging) must exist in every account → **CloudFormation StackSets** deployed across the OU, auto-applied to new accounts.

**Example 2 — Block insecure templates.** Developers must not deploy unencrypted buckets or open security groups → **CloudFormation Guard** rules in CI/CD fail any non-compliant template.

**Example 3 — Central WAF.** Every internet-facing ALB across 60 accounts must have a baseline WAF rule set → **AWS Firewall Manager** policy applied org-wide and to new resources.

**Example 4 — Governed self-service.** Teams need to spin up environments but only in approved, secure configurations → **AWS Service Catalog** approved products with launch constraints; shared networking via **RAM**.

## Think About It

A company lets each team build its own infrastructure by hand, and audits keep finding unencrypted buckets, over-permissive security groups, and inconsistent tagging across 50 accounts. Design a deployment strategy that makes these problems structurally impossible to ship, naming the IaC tool, the pre-deployment validation, the multi-account rollout mechanism, and the central enforcement service — and explain how each closes a specific gap.

## Quick Check

1. How do CloudFormation StackSets improve security across many accounts?
2. What is the purpose of CloudFormation Guard, and where does it run?
3. Which service centrally enforces WAF and firewall policies across an organization?
4. What is the difference between AWS RAM and AWS Service Catalog?

*Answers: (1) they deploy a consistent baseline (security configs, roles, rules) to many accounts and Regions from a single operation, including new accounts, eliminating drift and manual per-account setup; (2) it's a policy-as-code tool that validates CloudFormation templates against security rules and fails the build on violations — run in the CI/CD pipeline before deployment (shift-left); (3) AWS Firewall Manager; (4) RAM securely shares specific existing resources (subnets, Transit Gateways, Resolver rules) across accounts without duplication, while Service Catalog publishes approved, pre-configured products that teams can self-service deploy under constraints and least-privilege launch roles.*

## What's Next

Next: **Evaluating Compliance of AWS Resources** — Config rules and remediation, Security Hub standards, Audit Manager, Artifact, and the Well-Architected Tool.
