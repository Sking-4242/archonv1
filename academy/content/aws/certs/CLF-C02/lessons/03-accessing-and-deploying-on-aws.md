---
title: "Accessing and Deploying on AWS"
type: content
estimated_minutes: 12
cert_tags: ["CLF-C02"]
---

# Accessing and Deploying on AWS

## Overview

Once workloads are in AWS, you need ways to interact with the platform and ways to deploy resources onto it. The Cloud Practitioner exam, Domain 3, Task 3.1 ("Define methods of deploying and operating in the AWS Cloud"), asks you to know the different ways to access AWS services — the Management Console, the command line, software development kits, and infrastructure as code — and to understand the deployment models (cloud, hybrid, on-premises) that describe where your resources live. This is foundational fluency: before you can reason about any service, you need to know how people and programs actually talk to AWS.

The reason this matters is that the *right* access method depends on the task. A person exploring a new service reaches for the visual Console; an engineer automating a repeatable process reaches for the command line or an SDK; a team that wants its entire environment defined, version-controlled, and reproducible reaches for infrastructure as code. Choosing well is the difference between clicking through the same setup fifty times by hand and defining it once in a template that deploys identically every time. The exam tests whether you can match the access method to the situation — one-off manual task versus repeatable automated process — and whether you understand the deployment models that frame the rest of the cloud-concepts material.

This lesson covers the four ways to access AWS, the idea of infrastructure as code, and the three deployment models. After it you will be able to choose an appropriate access method for a task and describe where workloads run under each deployment model.

---

## Core Concepts

### The AWS Management Console

The **AWS Management Console** is the web-based graphical interface for AWS. You sign in with a browser and click through visual menus to create, configure, and monitor resources. The Console is ideal for **learning, exploring, one-time tasks, and visual monitoring** — it's approachable and requires no coding. Its trade-off is that manual clicking doesn't scale or repeat reliably: doing the same setup across many accounts or many times by hand is slow and error-prone. The exam associates the Console with manual, exploratory, and one-off operations.

### The AWS Command Line Interface (CLI)

The **AWS CLI** is a tool that lets you control AWS services from a terminal by typing commands (or putting them in scripts). It is **programmatic access** suited to automation and repeatable operations — you can script a sequence of actions and run it consistently. The CLI is faster than the Console for experienced users and is scriptable, making it a good fit when you need to repeat a task or automate a workflow without writing a full program. Tell: "automate from a script / terminal," "repeatable command-line operations."

### Software Development Kits (SDKs)

**SDKs** let your applications call AWS services directly from code in languages like Python, Java, JavaScript, and others. Where the CLI is for scripts and commands, SDKs are for **building applications** that interact with AWS programmatically — for example, an app that uploads files to Amazon S3 or sends messages to a queue. SDKs are the right answer when software needs to integrate with AWS services as part of its functionality. Tell: "from within an application / in code."

### Infrastructure as Code (IaC)

**Infrastructure as code** means defining your AWS resources in templates or code rather than creating them by hand, so the whole environment can be provisioned automatically, consistently, and repeatably. **AWS CloudFormation** is AWS's primary IaC service: you write a template describing the resources you want, and CloudFormation creates and manages them as a unit (a "stack"). IaC brings huge benefits — consistency (every deployment is identical), version control (infrastructure changes are tracked like code), repeatability (spin up an identical environment on demand), and easy teardown. The exam contrasts IaC with manual Console work: when a scenario stresses **repeatability, consistency, or provisioning the same environment many times**, IaC/CloudFormation is the intended answer; when it's a quick one-off, the Console fits.

### One-Time Operations vs. Repeatable Processes

A recurring exam decision is whether a task is a **one-time operation** or a **repeatable process**. One-time, exploratory, or visual tasks suit the **Console**. Repeatable, automated, or large-scale tasks suit **programmatic access** — the CLI or SDKs for actions, and IaC (CloudFormation) for whole environments. Framing the question this way usually points straight to the right method.

### Deployment Models: Cloud, Hybrid, On-Premises

The exam also expects the three **deployment models** that describe *where* resources run. A **cloud (all-in)** deployment runs entirely on AWS — the typical modern approach, maximizing cloud benefits. A **hybrid** deployment connects on-premises infrastructure with AWS, used when some workloads or data must stay in a local data center (for latency, compliance, or legacy reasons) while others run in the cloud; AWS services like Direct Connect, VPN, and Outposts enable hybrid setups. An **on-premises** (private cloud) deployment runs in your own data center, sometimes using cloud-like technologies. Recognizing which model a scenario describes — fully cloud, a mix of cloud and local, or entirely local — is the core skill for this part of the objective.

---

## Configuration Reference

Ways to access AWS:

```text
Method                  Best for                              Tell
----------------------- ------------------------------------ ----------------------
Management Console      learning, one-off tasks, visual ops   "click through," "explore"
AWS CLI                 scripted/automated command-line ops   "from a script/terminal"
SDKs                    applications calling AWS in code      "from within an application"
IaC (CloudFormation)    repeatable, consistent environments   "provision the same env repeatedly"
```

One-time vs. repeatable:

```text
One-time / exploratory / visual    → Console
Repeatable actions / automation    → CLI or SDK
Repeatable whole environments      → IaC (CloudFormation)
```

Deployment models:

```text
Cloud (all-in)   everything runs on AWS
Hybrid           on-premises + AWS connected (Direct Connect, VPN, Outposts)
On-premises      runs in your own data center
```

---

## How to Decide

- **Exploring or a quick one-off task?** → AWS Management Console.
- **Automating repeatable command-line actions?** → AWS CLI.
- **Building an application that calls AWS?** → an SDK.
- **Provisioning consistent, repeatable environments?** → infrastructure as code (CloudFormation).
- **Where do workloads run?** All on AWS → cloud; mix of local and AWS → hybrid; entirely local → on-premises.

---

## How This Connects

This lesson sets up Domain 3's services by establishing how you interact with them, and it connects back to the deployment models introduced in the cloud-fundamentals module. Infrastructure as code reappears as an operational-excellence and automation theme (Well-Architected, cloud economics), and hybrid deployment connects to the network services (Direct Connect, VPN) covered elsewhere in the curriculum.

---

## Exam Traps

- **Confusing the CLI and SDKs.** The CLI runs commands/scripts in a terminal; SDKs let application code call AWS. "From within an app" → SDK.
- **Using the Console for repeatable work.** Manual clicking doesn't scale or reproduce reliably; repeatable provisioning is IaC's job.
- **Missing the IaC tell.** "Consistent," "repeatable," "the same environment every time" point to CloudFormation/IaC.
- **Mixing up deployment models.** Hybrid specifically means on-premises *connected to* AWS, not fully cloud or fully local.
- **Thinking IaC is only for experts/coders.** It's the standard, recommended way to provision environments reliably, not an exotic option.

---

## Summary

You interact with AWS in four main ways: the Management Console (visual, great for learning and one-off tasks), the CLI (scripted command-line automation), SDKs (applications calling AWS in code), and infrastructure as code via CloudFormation (defining whole environments as templates for consistent, repeatable provisioning). The key decision is one-time-and-visual (Console) versus repeatable-and-automated (CLI, SDK, or IaC). Separately, the three deployment models describe where resources run: cloud (all on AWS), hybrid (on-premises connected to AWS), and on-premises (in your own data center). Matching the access method and deployment model to the scenario is the foundational fluency Domain 3.1 tests.

---

## Examples

**Example 1 — Console.** A new user explores Amazon S3 and creates a single bucket to test it → the **Management Console**.

**Example 2 — IaC.** A team must deploy the same three-tier environment in five accounts identically → **CloudFormation** (infrastructure as code) for consistency and repeatability.

**Example 3 — SDK.** A Python application needs to upload user files to S3 as part of its features → the **AWS SDK** for Python.

**Example 4 — Hybrid.** A bank keeps a regulated database in its own data center but runs its web tier on AWS, connected via Direct Connect → a **hybrid** deployment.

---

## Think About It

A team currently sets up each new test environment by clicking through the Console, and it takes hours and sometimes comes out slightly different each time. Which access method would fix both the time and the inconsistency, and what specific benefits (name at least two) would they gain by defining the environment as code instead?

---

## Quick Check

1. Which access method suits a quick, exploratory, one-off task, and which suits provisioning the same environment repeatedly?
2. What is the difference between the AWS CLI and an SDK?
3. What is infrastructure as code, and which AWS service provides it?
4. Define the hybrid deployment model.

*Answers: (1) the Management Console for one-off/exploratory tasks; infrastructure as code (CloudFormation) for repeatable environments; (2) the CLI runs commands/scripts from a terminal, while an SDK lets application code call AWS services in a programming language; (3) defining AWS resources in templates/code so environments are provisioned automatically, consistently, and repeatably — provided by AWS CloudFormation; (4) on-premises infrastructure connected to and working together with AWS resources.*

---

## What's Next

Next: **AWS Security Services Overview** — the security and compliance services beyond IAM (GuardDuty, Inspector, Shield, WAF, Macie, and more) and where to find AWS security and compliance information.
