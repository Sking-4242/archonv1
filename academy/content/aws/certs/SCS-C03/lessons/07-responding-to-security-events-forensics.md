---
title: "Responding to Security Events: Forensics, Containment, and Recovery"
type: content
estimated_minutes: 17
cert_tags: ["SCS-C03"]
---

# Responding to Security Events: Forensics, Containment, and Recovery

## Overview

When a real security event is underway, preparation and automation give way to execution: you must capture evidence, understand the scope, contain the threat, remove it, and recover — in the right order and without destroying the data you need to learn from. The Security Specialty exam's Task 2.2 ("Respond to security events") tests exactly this live-response competence: capturing forensic artifacts, searching and correlating logs across services, validating findings to assess scope and impact, containing and eradicating threats, recovering resources, and conducting root cause analysis. These are scenario questions where the order of operations and the choice of technique matter — snapshot before terminate, isolate before investigate-in-place, correlate before concluding.

The hard part of live response is balancing two competing pressures: **stop the damage quickly** and **preserve the truth**. Move too fast and destroy an instance, and you lose the forensic record and may never know how the attacker got in or what else they touched. Move too slowly and the attacker exfiltrates more data or spreads laterally. The specialty discipline resolves this with a disciplined sequence — capture and preserve, contain to stop spread, validate scope, eradicate the threat, recover to a known-good state, and analyze root cause — using AWS-native techniques (EBS snapshots, isolation security groups, session/credential revocation, log correlation, Amazon Detective). The exam rewards knowing both the techniques and their correct sequencing.

This lesson covers forensic artifact capture, log search and correlation, containment and eradication, recovery, and root-cause analysis. After it you will be able to execute a disciplined, evidence-preserving response to a security event on AWS.

---

## Core Concepts

### Capturing and Preserving Forensic Artifacts

The first responsibility in live response is to **capture evidence before it's lost or altered**. For a compromised EC2 instance, this means creating **EBS snapshots** of attached volumes (a point-in-time forensic copy), capturing **memory** where feasible, and collecting relevant **logs** (CloudTrail, VPC Flow Logs, application logs, OS logs via the CloudWatch agent) — copying all of it to an **isolated forensics account** with restricted access and tagging for **chain of custody** (who collected what, when). Snapshots should be taken *before* any destructive action and protected (encrypted, access-restricted, possibly Object Lock). The principle: treat the compromised resource as a crime scene — preserve it first, because eradication is irreversible and destroys evidence.

### Searching and Correlating Logs as Evidence

Understanding an event requires **searching and correlating logs across services**, using the analysis tools from the Detection domain. A typical investigation correlates **CloudTrail** (what API actions the compromised identity took), **VPC Flow Logs** (what it connected to, signs of exfiltration or lateral movement), **Route 53 Resolver query logs** (C2 or exfiltration domains), and **GuardDuty findings** (what was flagged) — joined in Athena, searched in OpenSearch, or normalized in Security Lake. The goal is a timeline: when access began, what the attacker did, and what they reached. This evidence both drives containment decisions and feeds the post-incident root-cause analysis.

### Validating Findings and Assessing Scope

Not every finding is a true positive, and not every true positive is fully understood. **Validating findings** means confirming an alert reflects a real incident and determining its **scope and impact** — which resources, identities, and data are affected. This is where **Amazon Detective** is invaluable: its behavior graph shows the full set of entities and activities connected to a finding, so you can see whether one compromised credential touched one resource or twenty. Validation prevents two failures: over-reacting to a false positive (wasting effort, causing outages) and under-scoping a real incident (containing one instance while the attacker persists elsewhere). The exam expects you to validate and scope before declaring containment complete.

### Containment — Stopping the Spread

**Containment** limits further damage while preserving evidence. AWS-native containment techniques: replace an instance's **security group** with a deny-all **isolation group** (network containment without terminating the host, so forensics remain possible); remove the instance from load balancers/Auto Scaling; **revoke compromised credentials** by attaching a deny-all policy or deleting access keys, and **revoke active sessions** (temporary credentials survive key deletion, so apply a policy denying actions for tokens issued before a cutoff time); isolate affected network segments; and disable or quarantine compromised resources. Network containment via security groups is preferred over termination during active investigation because it stops the threat while keeping the evidence intact.

### Eradication and Recovery

Once contained and understood, **eradication** removes the threat: terminate compromised instances (after snapshots), delete malicious resources, rotate all potentially exposed credentials and secrets, remove persistence mechanisms (rogue IAM users, backdoor policies, unexpected Lambda functions), and patch the exploited vulnerability. **Recovery** restores normal operation from a **known-good state**: rebuild from **hardened, trusted AMIs/images** rather than the compromised instance, **restore data from backups** (verified clean and predating the compromise), and gradually return services while monitoring for recurrence. A subtle exam point: recovering by restoring a backup that already contains the attacker's foothold just reinfects you — choose a restore point known to be clean, and re-harden before returning to service.

### Root Cause Analysis

After recovery, **root cause analysis** determines *how* the incident happened so it can be prevented from recurring. **Amazon Detective** is the named tool — its graph and timeline reconstruct the attack path (initial access, actions, lateral movement). RCA examines the entry vector (leaked key, unpatched vulnerability, misconfiguration), what controls failed, and what would have caught or prevented it. The output feeds back into prevention: tightened IAM, new detections, patched images, updated runbooks. The exam frames RCA as both a technique (Detective-driven investigation) and a discipline (turning the incident into durable improvements).

### Forensics for Containers and Serverless

Live response differs by compute type, and the exam expects awareness beyond EC2. For **containers (ECS/EKS)**, the forensic unit is the task/pod and the underlying node: capture container logs and, where the runtime supports it, snapshot the host node's volume; isolate by adjusting the pod's network policy or the node's security group; and rely on **GuardDuty Runtime Monitoring** signals plus image scanning to understand what ran. Because containers are ephemeral, preserving logs centrally *before* the task is replaced is critical. For **Lambda/serverless**, there is no host to snapshot — evidence lives in **CloudWatch Logs**, **CloudTrail** (invocations and configuration changes), and the function's code/configuration version; containment means disabling triggers, restricting the execution role, or removing the function version, and eradication includes rotating any secrets the function could access. The principle holds across all compute — preserve the available evidence first and contain via the controls appropriate to that service — but the specific artifacts and isolation levers change, so match the technique to the workload type.

### The Correct Sequence

The throughline is **order of operations**: capture/preserve → contain (network isolation, credential/session revocation) → validate scope → eradicate → recover from known-good → root cause. Getting the order wrong — eradicating before preserving, recovering from an infected backup, declaring done before scoping — is the most common way responses fail, and the exam's distractors often reverse the sequence.

---

## Configuration Reference

The live-response sequence:

```text
1. PRESERVE   EBS snapshots, memory, logs → isolated forensics account, tagged (chain of custody)
2. CONTAIN    isolation security group (don't terminate yet); revoke keys AND sessions; isolate subnets
3. VALIDATE   confirm true positive; scope blast radius (Amazon Detective behavior graph)
4. ERADICATE  terminate compromised resources, rotate secrets, remove persistence, patch vuln
5. RECOVER    rebuild from hardened images; restore CLEAN backups (pre-compromise); monitor
6. RCA        Amazon Detective timeline → entry vector + failed controls → prevention improvements
```

Containment techniques:

```text
Network        replace SG with deny-all isolation group; deregister from ELB/ASG
Credentials    delete/disable access keys; attach deny-all policy
Sessions       deny actions for aws:TokenIssueTime < cutoff (kills active temp creds)
Data/IP        block malicious IPs (WAF/Network Firewall); restrict bucket access
```

Correlation sources for scope:

```text
CloudTrail            attacker API actions / what identity did
VPC Flow Logs         connections, lateral movement, exfiltration signs
Route 53 Resolver     C2 / exfiltration domains
GuardDuty / Detective findings + behavior graph for scope
```

---

## How to Decide

- **First action on a compromised instance?** → snapshot/preserve evidence to a forensics account (before anything destructive).
- **Stop a threat but keep investigating?** → network isolation (deny-all security group), not termination.
- **A key leaked — is deleting it enough?** → no; also revoke active sessions (deny on older token-issue time).
- **Determine how far it spread?** → validate and scope with Amazon Detective before declaring containment.
- **Recover safely?** → rebuild from hardened images and restore backups known clean (pre-compromise), then monitor.
- **Prevent recurrence?** → root-cause analysis (Detective) → fix the entry vector and failed controls.

---

## How This Connects

This lesson executes the plan and automation from the prior two Incident Response lessons, consuming the Detection domain's logs and findings as evidence. Containment via security groups and isolation connects to Infrastructure Security (Domain 3); credential/session revocation connects to IAM (Domain 4); evidence snapshots, clean backups, and encryption connect to Data Protection (Domain 5); and the forensics account and RCA-driven improvements connect to Governance (Domain 6).

---

## Exam Traps

- **Terminating before snapshotting.** Destroying a compromised instance before capturing evidence loses the forensic record — preserve first.
- **Deleting a key but not revoking sessions.** Active temporary credentials survive access-key deletion; revoke them via a token-issue-time deny.
- **Recovering from an infected backup.** Restore a point known to be clean (pre-compromise) and re-harden, or you reinfect.
- **Declaring done without scoping.** Validate scope with Detective; an attacker may persist beyond the first resource.
- **Investigating in place by logging into the compromised host.** Prefer isolation + snapshot-based forensics over interacting with the live compromised resource.
- **Skipping root cause.** Without RCA, the same entry vector recurs; turn the incident into prevention.

---

## Summary

Live security response is a disciplined sequence that balances speed with evidence preservation. First capture forensic artifacts — EBS snapshots, memory, and logs — into an isolated forensics account with chain-of-custody tagging, before any destructive action. Contain to stop spread using network isolation (deny-all security groups) rather than termination, and revoke both credentials and active sessions. Validate the finding and scope the blast radius with Amazon Detective's behavior graph by correlating CloudTrail, flow logs, and DNS logs. Then eradicate (terminate after snapshots, rotate secrets, remove persistence, patch), and recover from a known-good state — hardened images and clean, pre-compromise backups — while monitoring for recurrence. Finally, conduct root-cause analysis with Detective to fix the entry vector and failed controls. Order of operations is everything: preserve, contain, validate, eradicate, recover, analyze.

---

## Examples

**Example 1 — Preserve then isolate.** On a compromised instance, the responder snapshots the EBS volume to the forensics account, then swaps in a deny-all isolation security group — threat stopped, evidence intact, host available for analysis.

**Example 2 — Full credential revocation.** A leaked role credential is contained by attaching a deny-all policy and applying a session-revocation policy denying actions for tokens issued before now, killing the attacker's live sessions.

**Example 3 — Scope with Detective.** A single finding looks minor, but **Detective**'s graph reveals the same credential touched twelve resources across two accounts — the response scope expands accordingly.

**Example 4 — Clean recovery.** Rather than restarting the compromised instance, the team rebuilds from a hardened AMI and restores data from a backup taken before the intrusion, then monitors closely.

---

## Think About It

During an incident, a responder's instinct is to immediately terminate a beaconing EC2 instance and restore the application from last night's backup. Walk through what could go wrong with both actions (evidence and reinfection), and rewrite the response as a correctly ordered sequence from preservation through root cause — naming the AWS technique at each step.

---

## Quick Check

1. What should you do to a compromised EC2 instance before any destructive action, and where should the artifacts go?
2. Why is network isolation often preferred over termination during active investigation?
3. Deleting a leaked access key doesn't fully contain it — what else must you do?
4. Which AWS service drives scope assessment and root-cause analysis, and how?

*Answers: (1) capture forensic artifacts — EBS snapshots, memory, and logs — and copy them to an isolated forensics account with chain-of-custody tagging; (2) it stops the threat from spreading while preserving the instance and its evidence for forensic analysis, which termination would destroy; (3) revoke active sessions — temporary credentials survive key deletion — by applying a policy denying actions for tokens issued before a cutoff time (and rotate related secrets); (4) Amazon Detective, via its behavior graph built from CloudTrail, VPC Flow Logs, and GuardDuty findings, which reconstructs scope and the attack timeline.*

---

## What's Next

You've completed Module 2 (Incident Response). Next module: **Infrastructure Security**, starting with edge security — CloudFront, AWS WAF, and Shield Advanced.
