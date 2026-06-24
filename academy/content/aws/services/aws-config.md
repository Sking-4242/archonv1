---
title: "AWS Config"
type: content
estimated_minutes: 19
cert_tags: ["SCS-C03", "SOA-C03", "SAA-C03", "CLF-C02"]
---

# AWS Config

## Overview

AWS Config is a service that **records the configuration of your AWS resources over time and continuously evaluates that configuration against rules you define**. It answers three questions that are central to security, operations, and compliance: *what does this resource look like right now?*, *what did it look like at any point in the past?*, and *does its configuration comply with my policies?* This is a *service reference* lesson covering Config's recording model, its rules and remediation, multi-account aggregation, and what each certification expects.

Config matters because cloud environments change constantly and those changes are where risk hides — a security group opened to the world, an S3 bucket whose encryption was turned off, an IAM policy that drifted from approved baseline. Without a system of record, you cannot prove compliance, investigate an incident's timeline, or detect drift. AWS Config provides that system of record: it captures a **configuration item** every time a resource is created, modified, or deleted, retains a full configuration history, and evaluates each change against your rules in near real time.

A crucial relationship to understand up front: **AWS Config is the configuration recorder that many other governance and security services depend on.** A large fraction of AWS Security Hub controls are implemented as Config rules, conformance packs are built from Config rules, and automated remediation is driven by Config's compliance evaluations. If Config is not recording a resource type, those higher-level services cannot evaluate it.

---

## How It Works

Config's recording pipeline has a few named components:

- **Configuration recorder** — the component that detects changes to your resources and captures them. You choose which resource types to record (specific types, or all supported types, including global resources like IAM).
- **Configuration item (CI)** — a point-in-time snapshot of a resource's attributes, relationships to other resources, and metadata. Every change produces a new CI, building a **configuration history**.
- **Delivery channel** — where Config delivers configuration snapshots and history: an S3 bucket for storage and, optionally, an SNS topic for notifications.

On top of this recording layer sits the **evaluation layer**: **Config rules**. A rule expresses a desired configuration state, and Config evaluates resources against it whenever they change (and on a periodic schedule for some rules), marking each resource **COMPLIANT** or **NONCOMPLIANT**. Rules come in two kinds:

- **AWS managed rules** — hundreds of prebuilt rules for common requirements (for example "S3 buckets must block public access," "EBS volumes must be encrypted," "root user must not have access keys").
- **Custom rules** — your own logic, implemented either as an **AWS Lambda** function or with **AWS CloudFormation Guard** (a policy-as-code language), for organization-specific requirements.

Because evaluation is tied to the change stream, Config gives you *continuous* compliance, not point-in-time audits: the moment a resource drifts out of compliance, Config knows.

---

## Key Features

- **Configuration history and timeline.** A complete, queryable record of how each resource changed over time — invaluable for incident investigation and change management.
- **Resource relationships.** Config maps relationships (for example, which security groups are attached to which instances), so you can understand blast radius.
- **Conformance packs.** A collection of Config rules and remediation actions packaged as a single deployable unit, so you can apply an entire compliance framework (and deploy it across an organization) consistently.
- **Automatic remediation.** A rule can be associated with an **AWS Systems Manager Automation** document that runs when a resource is found noncompliant — for example automatically re-enabling encryption or removing a public-access setting.
- **Advanced queries.** A SQL-like query language to ask questions across your current configuration state ("show all unencrypted RDS instances in all accounts").
- **Aggregators.** A **multi-account, multi-Region aggregator** rolls up configuration and compliance data from an entire organization into a single view.

---

## Configuration Reference

- **Enable the configuration recorder** in each Region (and account) you want covered, choosing resource types — recording *all* supported types gives the most complete picture but costs more.
- **Global resources** (such as IAM) are recorded in the Regions you designate; avoid double-recording them in every Region to control cost.
- **Delivery channel** points to an S3 bucket (often a centralized logging account bucket) and optionally an SNS topic.
- **Deploy rules** individually, or as **conformance packs** across the organization via the delegated administrator.
- **Attach remediation** by associating a Config rule with an SSM Automation document and the IAM role it needs.

---

## Operations and Troubleshooting

- **Change notifications and response.** Config publishes configuration and compliance change events to **EventBridge**, so you can alert or trigger workflows when a resource becomes noncompliant — a key building block for automated remediation.
- **Drift detection.** Because Config continuously evaluates against rules, it is the natural mechanism for detecting and reacting to configuration drift from an approved baseline.
- **A Security Hub control or conformance pack shows "no data."** The most common cause is that the configuration recorder is not recording the relevant resource type (or is not enabled in that Region). Config is the dependency.
- **Remediation does not run.** Check that the remediation is configured for automatic (not manual) execution, that the SSM Automation document is correct, and that the associated IAM role has the permissions the remediation requires.
- **Cost surprises.** Recording every resource type in every Region, especially noisy types, drives configuration-item volume; scope recording deliberately.

---

## Integrations

AWS Config is foundational plumbing for AWS governance. **AWS Security Hub** implements many of its controls as Config rules and depends on Config recording. **Conformance packs** bundle Config rules to deliver compliance frameworks. **AWS Systems Manager Automation** executes Config's remediations. **EventBridge** carries Config's change events to alerting and automation. **AWS Organizations** enables org-wide conformance packs and aggregators. **AWS Audit Manager** can use Config data as evidence. In short, Config is the configuration system of record that compliance evaluation, drift detection, and automated remediation are all built on.

---

## Pricing and Cost Considerations

AWS Config pricing is usage-based across a few dimensions: the number of **configuration items recorded** (every change to every recorded resource), the number of **rule evaluations**, and **conformance pack** evaluations. The dominant cost lever is the volume of configuration items, which is driven by how many resource types you record, how many resources you have, and how frequently they change. The cost-aware approach is to record the resource types you actually need to govern, record global resources in a single Region, and use periodic rather than change-triggered evaluation where appropriate. As always, exact per-unit prices vary by Region and over time; reason about cost as "proportional to recorded resource churn plus rule evaluations."

---

## Exam Relevance

**CLF-C02:** Recognize AWS Config as the service that tracks and records resource configurations and evaluates them for compliance over time — distinct from CloudTrail, which records *API activity* (who did what) rather than *resource state* (what a resource looks like). Foundational: the Config-vs-CloudTrail distinction is a frequent point.

**SAA-C03:** Know Config records configuration history and evaluates managed/custom rules, supports remediation, and aggregates across accounts — and where it fits in a governed architecture.

**SOA-C03:** Operate it — configure recording, deploy rules and conformance packs, wire automatic remediation through SSM Automation, and use aggregators and advanced queries for fleet-wide compliance. Operations depth.

**SCS-C03:** Deepest. Know Config as the dependency under Security Hub controls; conformance packs for frameworks; custom rules with Lambda or CloudFormation Guard; automatic remediation via SSM Automation; org-wide aggregators and delegated administration; and its role in evaluating compliance of AWS resources (Domain 6). Expect scenarios about continuously evaluating and auto-remediating noncompliant configurations across an organization.

---

## Summary

AWS Config records the configuration of your AWS resources as configuration items over time, building a complete history, and continuously evaluates resources against managed or custom rules to determine compliance. Conformance packs bundle rules into deployable frameworks, automatic remediation runs SSM Automation documents against noncompliant resources, advanced queries interrogate current state, and aggregators roll up an entire organization's compliance into one view. Config is the configuration system of record that Security Hub controls, drift detection, and automated remediation depend on — and the key contrast to keep straight is Config (resource *state* and compliance) versus CloudTrail (API *activity*). Cost scales with recorded configuration-item volume, so scope recording deliberately.

---

## Quick Check

1. What is the difference between AWS Config and AWS CloudTrail in terms of what each records?
2. What is a configuration item, and what triggers Config to create one?
3. How can a Config rule automatically fix a noncompliant resource, and which service executes that fix?
4. A Security Hub control reports "no data." What Config-related cause is most likely?
5. How do you get a single organization-wide view of Config compliance across many accounts and Regions?

---

## What's Next

Pair this with **AWS Security Hub** (whose controls depend on Config) and the SCS-C03 compliance-evaluation lesson in Domain 6. In the SOA-C03 path, this supports the automation and remediation lessons; the EventBridge/SSM Automation pattern recurs throughout operational security.
