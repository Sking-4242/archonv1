---
title: "Amazon Detective"
type: content
estimated_minutes: 15
cert_tags: ["SOA-C03", "SCS-C03"]
---

# Amazon Detective

## Overview

Amazon Detective helps you **investigate, analyze, and quickly identify the root cause** of security findings and suspicious activity. Where GuardDuty and Security Hub tell you *that* something is wrong, Detective helps you understand *how it happened, what was affected, and how far it spread*. It automatically builds a unified, interactive graph of behavior across your accounts so analysts can investigate without manually wrangling logs. This *service reference* lesson covers how Detective ingests and links data, what investigations look like, and what each certification expects.

Detective matters because a security finding is only the start of an investigation. Answering "which other resources did this compromised credential touch?", "when did this behavior start?", and "is this normal for this principal?" traditionally means querying many log sources by hand. Detective automates that correlation: it continuously ingests log data, links entities and activity into a **behavior graph**, establishes baselines, and presents visualizations that let an analyst pivot from a finding to the full story in minutes. The key mental model is **investigation and root-cause analysis** — Detective is the analysis layer that sits downstream of detection (GuardDuty/Security Hub), not a detector itself.

---

## How It Works

Once enabled (ideally org-wide via a delegated administrator), Detective automatically and continuously pulls in data sources — **VPC Flow Logs**, **CloudTrail** management events, **GuardDuty findings**, and **EKS audit logs** — with no agents or manual log pipelines. It processes this data using machine learning, statistical analysis, and graph theory to build a **behavior graph**: a linked model of entities (IAM principals, roles, IP addresses, instances, findings) and their interactions over time, with **baselines** of what is normal for each entity.

An analyst investigating a GuardDuty finding can **pivot directly into Detective** (one-click integration) to see, for that entity: a timeline of activity, geolocation and volume of API calls, newly observed behaviors, associated resources, and how the entity connects to the finding. Visualizations highlight anomalies (e.g., a sudden spike in failed API calls or activity from a new location), letting the analyst determine scope, timeline, and root cause and decide on containment.

---

## Key Features

- **Automatic behavior graph** linking entities and activity across accounts — no manual data engineering.
- **Continuous ingestion** of VPC Flow Logs, CloudTrail, GuardDuty findings, and EKS audit logs.
- **Baselines and anomaly highlighting** so unusual activity stands out against normal behavior.
- **One-click pivot from GuardDuty and Security Hub** findings into a focused investigation.
- **Interactive timelines and visualizations** for scope, geolocation, API-call volume, and entity relationships.
- **Multi-account** investigation via AWS Organizations with a delegated administrator.

---

## Configuration Reference

- **Enable Detective** (org-wide via a delegated administrator, ideally the same security account used for GuardDuty/Security Hub) so investigations span the organization.
- **Ensure source data exists** — Detective is most useful when GuardDuty is enabled and CloudTrail/VPC Flow Logs are flowing; it ingests them automatically once enabled.
- **Integrate with GuardDuty/Security Hub** so analysts can pivot from findings into Detective.
- There are no agents or scan schedules to manage — ingestion and graph-building are automatic.

---

## Operations and Troubleshooting

- **Investigating a finding.** Pivot from the GuardDuty/Security Hub finding into Detective, review the entity's timeline and baselines, identify newly observed behaviors and connected resources, and determine scope and root cause before containment.
- **Sparse data.** Detective's value grows with enabled sources; if investigations feel thin, confirm GuardDuty is on and CloudTrail/VPC Flow Logs are being generated.
- **Service confusion.** Detective **investigates**; it does **not detect** (that's GuardDuty) or **aggregate/score posture** (that's Security Hub). Match the answer to whether the requirement is detection, aggregation, or investigation/root cause.
- **Cost from high-volume sources.** Ingested log volume drives cost; investigate which sources dominate if costs rise.

---

## Integrations

Detective sits downstream of detection: it ingests **GuardDuty findings**, **CloudTrail**, **VPC Flow Logs**, and **EKS audit logs**; integrates with **GuardDuty** and **Security Hub** for one-click pivots from findings; and is managed org-wide through **AWS Organizations**. In the security ecosystem, **GuardDuty detects**, **Security Hub aggregates and scores**, **Detective investigates**, and **EventBridge** drives response — Detective is specifically the investigation/root-cause layer.

---

## Pricing and Cost Considerations

Amazon Detective pricing is **usage-based on the volume of log data ingested** into the behavior graph (GB of CloudTrail, VPC Flow Logs, GuardDuty findings, and EKS audit logs per account/Region per month), with a free trial. Because cost scales with ingested volume, the main consideration is the size and activity of the environment rather than a per-investigation charge. There are no agents or per-query fees; the lever is awareness of which high-volume sources drive ingestion. Exact prices vary by Region.

---

## Exam Relevance

**SOA-C03:** Know Detective as the service for investigating and finding the root cause of security issues, downstream of GuardDuty/Security Hub. Operations depth.

**SCS-C03:** Deepest. Know that Detective builds a behavior graph from CloudTrail, VPC Flow Logs, GuardDuty, and EKS audit logs for **root-cause analysis and scope determination** during incident response, the one-click pivot from GuardDuty, and its distinction from GuardDuty (detection) and Security Hub (aggregation). Security depth — the answer for "investigate / determine scope and root cause."

---

## Summary

Amazon Detective is a security **investigation and root-cause analysis** service that automatically ingests CloudTrail, VPC Flow Logs, GuardDuty findings, and EKS audit logs to build an interactive **behavior graph** of entities and their activity, with baselines that surface anomalies. Analysts pivot one click from a GuardDuty or Security Hub finding into a focused investigation — timeline, geolocation, API-call volume, connected resources — to determine scope and root cause quickly. It is managed org-wide via a delegated administrator and is the **investigation** layer downstream of detection. The defining exam point is its role: GuardDuty detects, Security Hub aggregates, **Detective investigates**.

---

## Quick Check

1. What question does Detective answer that GuardDuty and Security Hub do not?
2. Which data sources does Detective automatically ingest to build its behavior graph?
3. How does an analyst typically start a Detective investigation?
4. In the detect–aggregate–investigate–respond model, which role does Detective play?
5. What primarily drives Detective's cost?

---

## What's Next

Pair this with **Amazon GuardDuty** (detection and the pivot source), **AWS Security Hub** (aggregation), and **AWS CloudTrail**/**Amazon VPC** Flow Logs (the underlying data). See the SCS-C03 incident-response and forensics lessons.
