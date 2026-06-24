---
title: "Cloud Migration and the AWS Cloud Adoption Framework"
type: content
estimated_minutes: 13
cert_tags: ["CLF-C02"]
---

# Cloud Migration and the AWS Cloud Adoption Framework

## Overview

Most organizations don't start in the cloud — they move to it, and how they plan and execute that move determines whether it succeeds. The Cloud Practitioner exam, Domain 1, Task 1.3, asks you to understand the benefits of and strategies for migrating to the AWS Cloud: the **AWS Cloud Adoption Framework (AWS CAF)** that structures the journey, the **migration strategies** (commonly called the "7 Rs") for moving individual applications, and the **tools** AWS provides to move data and databases. This is a planning-and-vocabulary topic, and the exam tests whether you can recognize the right framework, strategy, and tool for a described situation.

Migration matters because it is rarely just a technical lift — it touches people, processes, governance, and finance. A company can't simply copy its data center to AWS overnight; it has to decide which applications to move, how to move each one, who needs new skills, and how to manage risk along the way. AWS provides structure for this: the CAF organizes the organizational change into perspectives, the 7 Rs give a vocabulary for per-application decisions, and a family of migration tools handles the mechanics of moving servers, databases, and large volumes of data. Knowing these by name and purpose is exactly what Domain 1.3 rewards.

This lesson covers the business benefits of migrating, the AWS CAF perspectives, the 7 Rs migration strategies, and the key migration tools. After it you will be able to match a migration scenario to the right strategy and tool and explain how the CAF guides cloud adoption.

---

## Core Concepts

### Why Organizations Migrate

The exam frames migration benefits in business terms drawn from the CAF: **reduced business risk** (more reliable, secure infrastructure), **improved ESG performance** (environmental, social, and governance — for example, AWS's more efficient, sustainable data centers), **increased revenue** (faster innovation and time to market), and **increased operational efficiency** (less undifferentiated heavy lifting, more automation). Beyond these, migration delivers the economic benefits from the previous lesson — CapEx to OpEx, elasticity, and lower TCO. When a question asks "what's the benefit of migrating," these business outcomes are the intended answers, not technical details.

### The AWS Cloud Adoption Framework (AWS CAF)

The **AWS Cloud Adoption Framework** is AWS's guidance for planning and executing a cloud migration across the *whole organization*, not just the technology. It organizes the work into six **perspectives**, grouped into business and technical capabilities:

- **Business** — aligns IT with business outcomes (business, people, governance perspectives).
- **People** — addresses culture, skills, and change management.
- **Governance** — manages and measures the program, including risk and finances.
- **Platform** — builds and modernizes the technical environment.
- **Security** — ensures the cloud environment meets security and compliance needs.
- **Operations** — runs and supports cloud workloads reliably.

The key exam point is that the CAF recognizes migration is an organizational change — covering people and process, not only infrastructure — and provides a structured way to prepare each area. You don't need to memorize every perspective's details, but you should recognize the CAF as the framework that guides cloud adoption holistically.

### The Migration Strategies — the "7 Rs"

For each application you move, you choose a strategy. AWS describes seven common ones (the "7 Rs"):

- **Rehost** ("lift and shift") — move the application as-is to AWS with minimal change. Fast, lowest effort.
- **Replatform** ("lift, tinker, and shift") — make a few optimizations during the move (e.g., move a self-managed database to Amazon RDS) without changing core architecture.
- **Repurchase** ("drop and shop") — replace the application with a different product, often moving to a SaaS solution.
- **Refactor / Re-architect** — significantly redesign the application to be cloud-native (e.g., adopt serverless or microservices). Highest effort, highest long-term benefit.
- **Retire** — decommission applications that are no longer needed.
- **Retain** ("revisit") — keep certain applications on-premises for now (e.g., due to constraints), revisiting later.
- **Relocate** — move infrastructure (such as VMware workloads) to AWS without purchasing new hardware or changing operations.

The exam may give a scenario and ask which "R" fits — "move quickly with no changes" → rehost; "swap a licensed database for a managed one during the move" → replatform; "switch to a SaaS product" → repurchase; "rebuild as cloud-native" → refactor.

### Migration and Data-Transfer Tools

AWS provides tools to handle the mechanics, and the exam names several:

- **AWS Database Migration Service (AWS DMS)** — migrates databases to AWS with minimal downtime, including ongoing replication; the database is fully operational during the migration.
- **AWS Schema Conversion Tool (AWS SCT)** — converts a database schema from one engine to another (heterogeneous migration), used alongside DMS when changing database engines.
- **AWS Snow Family (e.g., AWS Snowball)** — physical devices for transferring very large volumes of data into (or out of) AWS when moving it over the network would be too slow or costly; you load data onto the device and ship it to AWS.
- **AWS Application Migration Service** — automates rehosting (lift-and-shift) of servers to AWS.
- **AWS DataSync** — automates moving large amounts of data between on-premises storage and AWS over the network.

The recognition pattern: migrating databases → DMS (plus SCT for engine changes); moving huge data volumes physically → Snowball/Snow Family; bulk network data transfer → DataSync; rehosting servers → Application Migration Service.

### Putting It Together

A typical migration uses the CAF to plan the organizational change, the 7 Rs to decide how to treat each application, and the migration tools to execute the moves. For the exam, hold the three layers: **CAF** (the holistic framework), **7 Rs** (per-application strategy), **tools** (the mechanics of moving data and workloads).

---

## Configuration Reference

The 7 Rs at a glance:

```text
Strategy     What it means                              Effort
------------ ------------------------------------------ -------
Rehost       lift and shift, as-is                       low
Replatform   lift, tinker, and shift (minor optimizing)  low-med
Repurchase   drop and shop (switch product, often SaaS)  varies
Refactor     re-architect to cloud-native                high
Retire       decommission what's no longer needed         —
Retain       keep on-prem for now, revisit later          —
Relocate     move infrastructure (e.g., VMware) as-is     low
```

Migration tools → use:

```text
AWS DMS                       migrate databases (low downtime, live replication)
AWS SCT                       convert schema between database engines
AWS Snowball / Snow Family    ship huge data volumes physically to AWS
AWS DataSync                  bulk data transfer over the network
AWS Application Migration Svc automate server rehosting (lift and shift)
```

AWS CAF — six perspectives:

```text
Business · People · Governance | Platform · Security · Operations
(migration is an organizational change, not just infrastructure)
```

---

## How to Decide

- **"Move fast, no changes"** → Rehost. **"Minor optimization during the move" (e.g., to RDS)** → Replatform. **"Switch to a SaaS product"** → Repurchase. **"Rebuild cloud-native"** → Refactor.
- **Migrating a database with minimal downtime?** → AWS DMS (add SCT if changing engines).
- **Petabytes to move and the network is too slow?** → AWS Snowball / Snow Family.
- **Planning the whole adoption across people, process, and tech?** → AWS Cloud Adoption Framework.

---

## How This Connects

This lesson builds the migration case on the cloud-economics benefits from the previous lesson, and its tools connect to Domain 3's database (DMS/SCT) and storage (data transfer) services. The CAF's security and operations perspectives foreshadow Domain 2 (security/compliance) and the Well-Architected operational-excellence pillar. Snowball and DataSync also relate to the hybrid and storage topics in the broader curriculum.

---

## Exam Traps

- **Confusing the 7 Rs.** Rehost = no change (lift and shift); Replatform = minor optimization; Refactor = full re-architecture; Repurchase = switch product/SaaS.
- **Mismatching migration tools.** DMS migrates databases; SCT converts schemas; Snowball moves bulk data physically; DataSync moves data over the network.
- **Thinking the CAF is only technical.** It deliberately spans people, governance, and business — migration is an organizational change.
- **Using the network for petabyte transfers.** When data is too large to move over the network in reasonable time, Snowball/Snow Family is the answer.
- **Overstating effort of rehosting.** Lift-and-shift is the lowest-effort, fastest strategy; refactoring is the highest-effort.

---

## Summary

Migrating to AWS delivers business benefits — reduced risk, improved ESG, increased revenue and operational efficiency — on top of the cloud's economic advantages. AWS structures the journey with the Cloud Adoption Framework, which spans six perspectives (business, people, governance, platform, security, operations) because adoption is an organizational change, not just an infrastructure move. For each application, the 7 Rs provide a strategy vocabulary — rehost, replatform, repurchase, refactor, retire, retain, relocate — and AWS migration tools handle the mechanics: DMS (and SCT) for databases, Snowball/Snow Family for huge data volumes, DataSync for network transfer, and Application Migration Service for server rehosting. Match the scenario to the right strategy and tool.

---

## Examples

**Example 1 — Rehost.** A company under deadline moves its application servers to AWS unchanged to exit a data center quickly → **rehost** (lift and shift), automated with Application Migration Service.

**Example 2 — Replatform.** During migration, a team moves its self-managed MySQL to Amazon RDS for managed operations without redesigning the app → **replatform**.

**Example 3 — DMS + SCT.** Migrating from Oracle to Amazon Aurora PostgreSQL, the team uses **SCT** to convert the schema and **DMS** to move the data with minimal downtime.

**Example 4 — Snowball.** An organization must move 500 TB to AWS but its internet link would take months; it ships the data on **AWS Snowball** devices instead.

---

## Think About It

A company is migrating 40 applications. One is a legacy app they plan to keep on-premises for now, one they'll swap for a SaaS product, one they'll move unchanged to hit a deadline, and one they'll rebuild as serverless. Name the "R" for each, and explain why having this shared vocabulary helps the team plan the migration as a portfolio rather than one big move.

---

## Quick Check

1. What does the AWS Cloud Adoption Framework organize, and why does it include people and governance?
2. Which "R" is lift-and-shift, and which is a full cloud-native rebuild?
3. Which tools migrate a database (with an engine change), and which moves petabytes of data physically?
4. Name two business benefits of migrating that the exam emphasizes.

*Answers: (1) it organizes the whole cloud-adoption journey across six perspectives (business, people, governance, platform, security, operations) because migration is an organizational change, not just infrastructure; (2) rehost is lift-and-shift, refactor/re-architect is the full cloud-native rebuild; (3) AWS DMS migrates the database and AWS SCT converts the schema for an engine change, while AWS Snowball/Snow Family physically ships large data volumes; (4) any two of reduced business risk, improved ESG performance, increased revenue, increased operational efficiency.*

---

## What's Next

Next: **Accessing and Deploying on AWS** — the ways to interact with AWS (Console, CLI, SDKs, infrastructure as code) and the deployment models that determine where your workloads run.
