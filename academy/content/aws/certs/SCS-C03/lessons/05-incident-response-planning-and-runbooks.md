---
title: "Incident Response Planning and Runbooks"
type: content
estimated_minutes: 17
cert_tags: ["SCS-C03"]
---

# Incident Response Planning and Runbooks

## Overview

When a security incident happens, the worst time to figure out what to do is during the incident. The Security Specialty exam's Incident Response domain (14%) begins with *designing and testing an incident response plan* (Task 2.1), because preparation is what separates a contained, well-documented incident from a chaotic, evidence-destroying scramble. The exam expects you to know how the incident response lifecycle maps onto AWS, how to build runbooks and pre-provision the access and tooling responders need, how to minimize blast radius before an incident, and how to test that the plan actually works.

The defining principle of cloud incident response is **prepare in advance and automate**. In a traditional data center, responders might physically access servers; in AWS, response is API-driven, which is both a challenge (you need the right permissions and tooling ready) and an opportunity (you can automate containment and forensics at machine speed). Specialty-level preparation means responders have a pre-defined **break-glass role** with the permissions to investigate and contain, security tools are already deployed (GuardDuty, Detective, logging), the **blast radius** is minimized through account and network segmentation so one compromise can't spread, and **runbooks** codify the steps for each incident type. AWS provides specific services for this — Systems Manager Incident Manager and OpsCenter for managing incidents, automation for remediation, and Fault Injection Service and Resilience Hub for testing — and the exam tests assembling them into a credible IR capability.

This lesson covers the incident response lifecycle on AWS, building runbooks, pre-incident preparation, and validating the plan. After it you will be able to design an incident response capability and recognize the AWS services that operationalize it.

---

## Core Concepts

### The Incident Response Lifecycle on AWS

AWS aligns incident response with the established **NIST lifecycle**: **Preparation → Detection & Analysis → Containment, Eradication & Recovery → Post-incident activity**. Preparation is everything you do before an incident (access, tooling, runbooks, training); detection and analysis is the Detection domain feeding into validation of a real event; containment/eradication/recovery is the active response (isolating, removing the threat, restoring); and post-incident is the lessons-learned and root-cause work. The specialty exam expects you to know that **most of the leverage is in preparation and automation** — you cannot improvise API permissions, log collection, or isolation procedures mid-incident. AWS's *Security Incident Response Guide* whitepaper formalizes this, and the exam's scenarios reward answers grounded in pre-built capability.

### Runbooks and Playbooks

A **runbook** is a documented, repeatable procedure for handling a specific incident type — compromised IAM credentials, a publicly exposed S3 bucket, an EC2 instance beaconing to a known-bad IP. Each runbook defines the detection signal, the validation steps, the containment actions, evidence to collect, and recovery steps. On AWS these are operationalized with **Systems Manager** — **Incident Manager** coordinates the response (engagement, escalation, runbooks as Automation documents), and **OpsCenter** centralizes operational items (OpsItems) to investigate. Runbooks can be **automated** as SSM Automation documents or Step Functions so the routine steps execute consistently and quickly. The exam values runbooks because they reduce reaction time and human error and ensure evidence is preserved correctly.

### Pre-Provisioning Access — The Break-Glass Role

Responders need sufficient permissions *ready in advance* — but those permissions are powerful, so they're tightly controlled. The pattern is a dedicated **incident response (break-glass) role** with the permissions to investigate (read logs, snapshot volumes, describe resources) and contain (modify security groups, isolate instances, revoke sessions), assumable only by authorized responders, with **MFA** required and every assumption **logged in CloudTrail**. Pre-provisioning means you're not creating permissions during the incident (slow, error-prone, and itself a risky change). Many organizations keep this role in a separate **security/forensics account** with cross-account trust, so response tooling and captured evidence are isolated from the compromised environment.

### Minimizing Blast Radius Before an Incident

The most effective containment is the segmentation you did *before* anything happened. **Blast-radius minimization** uses multi-account structure (workloads isolated per account/OU so a compromise is bounded), network segmentation (isolated subnets, least-privilege security groups, so lateral movement is limited), and least-privilege IAM (so stolen credentials can do little). Pre-incident hardening like **Shield Advanced** for DDoS-prone workloads, scoped-down roles, and resource isolation all shrink what an attacker can reach. The exam frames this as configuring services "to be prepared for incidents" — the work that limits damage automatically when prevention fails.

### Pre-Deploying Security Tooling

Preparation also means the investigative and protective tooling is already on: GuardDuty and Security Hub enabled org-wide, Detective ready for graphing, CloudTrail and the centralized logging pipeline capturing evidence, **Shield Advanced** protections configured for internet-facing resources, and forensic tooling (snapshot automation, an isolated forensics account) in place. If these are stood up only after an incident starts, you've lost the early evidence and the time. The exam rewards "deploy security tools and provision access ahead of time" as a hallmark of readiness.

### Severity Classification and Escalation

A response plan needs a shared definition of *how bad* an incident is, because severity drives who is engaged, how fast, and with what authority. The plan should define **severity tiers** (for example, low/medium/high/critical) with concrete criteria — data exfiltration or production credential compromise is critical; a single non-production misconfiguration is low — and map each tier to an **escalation path**: who is paged, which responders assume the break-glass role, when leadership and legal are notified, and when external parties (the AWS Shield Response Team, law enforcement, affected customers) are engaged. **Systems Manager Incident Manager** encodes this with response plans, engagement contacts, and escalation chains, so the right people are pulled in automatically based on severity. The exam expects that preparation includes not just technical runbooks but the human coordination — classification, notification, and escalation — that keeps a high-severity incident from stalling while responders figure out who is in charge.

### Automated Remediation Building Blocks

AWS provides building blocks to **automatically remediate** incidents: **Systems Manager Automation** documents (runbooks that execute remediation steps), **AWS Step Functions** (orchestrating multi-step response workflows), **Lambda** (custom remediation logic), **EventBridge** (triggering response when a finding appears), **Amazon Application Recovery Controller** (managing failover/recovery), and patterns like an **Automated Forensics Orchestrator for EC2** (capturing disk/memory and isolating instances automatically). The design idea is that for well-understood incidents, the response can be codified and triggered automatically — quarantine a flagged instance, revoke a leaked key, block a malicious IP — far faster than a human. The exam expects familiarity with these as the automation layer of IR.

---

## Configuration Reference

The IR lifecycle and where AWS fits:

```text
Preparation        runbooks, break-glass role, pre-deployed tools, segmentation, training
Detection/Analysis GuardDuty/Security Hub/Detective → validate the event
Containment        isolate (SG/NACL), revoke sessions/keys, quarantine instance
Eradication        remove threat (terminate, patch, rotate credentials)
Recovery           restore from backup, rebuild from hardened images
Post-incident      root cause (Detective), lessons learned, runbook updates
```

Preparation checklist (what to build before an incident):

```text
Break-glass IR role   scoped investigate+contain perms, MFA, CloudTrail-logged, cross-account
Runbooks              per incident type, as SSM Automation / Step Functions
Tooling pre-deployed  GuardDuty, Detective, central logging, Shield Advanced
Blast radius          multi-account isolation, network segmentation, least privilege
Forensics account     isolated account for evidence + response tooling
```

Services for IR operations:

```text
Systems Manager Incident Manager   coordinate response, engagement, runbooks
Systems Manager OpsCenter          centralize OpsItems to investigate
SSM Automation / Step Functions / Lambda   automated remediation
EventBridge                        trigger response on findings
Application Recovery Controller     manage recovery/failover
AWS Fault Injection Service / Resilience Hub   test the plan (next lesson)
```

---

## How to Decide

- **Need repeatable response steps?** → runbooks as SSM Automation documents / Step Functions.
- **Responders need power without standing risk?** → pre-provisioned break-glass IR role (MFA, logged, cross-account in a forensics account).
- **Limit how far a compromise spreads?** → minimize blast radius with multi-account isolation, network segmentation, least privilege — before the incident.
- **Coordinate a live incident?** → Systems Manager Incident Manager (and OpsCenter for items).
- **Respond at machine speed to known incidents?** → EventBridge → SSM Automation/Step Functions/Lambda.

---

## How This Connects

This lesson builds on the Detection domain (findings and logs are the inputs to response) and sets up the next two lessons on automating/testing IR and executing the response. The break-glass role and cross-account forensics connect to the IAM (Domain 4) and governance (Domain 6) multi-account patterns; blast-radius minimization connects to Infrastructure Security (Domain 3) segmentation; and recovery connects to Data Protection (Domain 5) backups.

---

## Exam Traps

- **Improvising permissions mid-incident.** Responders need a pre-provisioned, scoped break-glass role; creating permissions during an incident is slow and risky.
- **Treating IR as purely reactive.** Most leverage is in preparation — pre-deployed tools, runbooks, and segmentation that bound the damage.
- **Keeping forensics in the compromised account.** Isolate evidence and tooling in a separate forensics account so an attacker can't reach them.
- **No runbooks.** Ad-hoc response loses evidence and time; codify procedures (SSM Automation/Step Functions).
- **Forgetting to minimize blast radius.** Multi-account and network segmentation done in advance is the most effective containment.
- **Confusing Incident Manager with detection.** Incident Manager coordinates the *response*; detection comes from GuardDuty/Security Hub/Detective.

---

## Summary

Cloud incident response is won in preparation. Map the response to the NIST lifecycle (preparation, detection/analysis, containment/eradication/recovery, post-incident) and invest heavily up front: build per-incident **runbooks** (as Systems Manager Automation documents or Step Functions), pre-provision a scoped **break-glass IR role** (MFA-protected, CloudTrail-logged, ideally in an isolated forensics account), pre-deploy investigative and protective tooling (GuardDuty, Detective, central logging, Shield Advanced), and **minimize blast radius** through multi-account isolation, network segmentation, and least privilege. Operationalize with Systems Manager Incident Manager/OpsCenter and automate remediation with EventBridge, SSM Automation, Step Functions, and Lambda so well-understood incidents are contained at machine speed. The next step is testing that this plan actually works.

---

## Examples

**Example 1 — Break-glass role.** Responders get a pre-built IR role with snapshot/isolate/revoke permissions, assumable only with MFA from a forensics account, every use logged — no permission scramble during an incident.

**Example 2 — Automated quarantine.** A GuardDuty finding for a compromised instance triggers EventBridge → an SSM Automation runbook that snapshots the volume, replaces the security group with an isolation group, and opens an OpsItem.

**Example 3 — Blast-radius design.** Workloads are split across accounts by sensitivity with least-privilege roles, so a compromised dev credential cannot touch production data.

**Example 4 — Runbook for exposed S3.** A runbook for "public bucket detected" validates the finding, enables Block Public Access, captures the bucket policy as evidence, and notifies the owner.

---

## Think About It

A company's incident response consists of "page the on-call engineer, who logs into the production account as an admin and investigates." Identify three weaknesses in this approach (think permissions, evidence isolation, and speed), and describe the prepared capabilities — role, account structure, and automation — you would build so the next incident is contained quickly without granting standing god-mode access.

---

## Quick Check

1. Which phase of the incident response lifecycle holds the most leverage, and why?
2. What is a break-glass IR role, and what protections should it have?
3. How does minimizing blast radius before an incident help containment?
4. Name three AWS building blocks for automated incident remediation.

*Answers: (1) preparation — because you cannot improvise permissions, tooling, log collection, or isolation procedures during an incident, so pre-built capability determines how fast and cleanly you respond; (2) a pre-provisioned role with scoped investigate-and-contain permissions, assumable only by authorized responders with MFA, logged in CloudTrail, and ideally in an isolated forensics account; (3) multi-account isolation, network segmentation, and least privilege bound how far a compromise can spread, so containment is partly automatic; (4) any three of EventBridge, Systems Manager Automation, Step Functions, Lambda, Application Recovery Controller.*

---

## What's Next

Next: **Automating and Testing Incident Response** — automated remediation pipelines, Shield Advanced preparation, and validating the plan with Fault Injection Service and Resilience Hub.
