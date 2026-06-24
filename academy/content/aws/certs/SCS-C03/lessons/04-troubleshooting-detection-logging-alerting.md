---
title: "Troubleshooting Detection, Logging, and Alerting"
type: content
estimated_minutes: 16
cert_tags: ["SCS-C03"]
---

# Troubleshooting Detection, Logging, and Alerting

## Overview

A detection pipeline that silently fails is worse than no pipeline at all, because it creates false confidence — the dashboards are green, but the data isn't flowing. The Security Specialty exam dedicates a full task (Task 1.3) to *troubleshooting* security monitoring, logging, and alerting, and these questions are distinctly diagnostic: they present a symptom ("logs aren't appearing," "the alarm never fired," "GuardDuty isn't covering this account") and ask for the root cause and remediation. This rewards a different skill than design — you must know the common failure modes of each component and reason from symptom to cause.

The reason troubleshooting is its own tested skill is that logging and alerting failures cluster around a few recurring causes: **permissions** (the service or agent lacks rights to write logs or use a KMS key), **configuration** (the agent isn't installed or is misconfigured, the trail doesn't capture the needed event type, the subscription isn't enabled), and **scope** (a new account or Region isn't covered, an organization setting didn't propagate). An effective practitioner has a mental checklist for "logs are missing" and "the alert didn't fire," and can localize the break quickly. The exam tests exactly this: recognizing, for instance, that a too-restrictive KMS key policy is why CloudTrail stopped delivering, or that a Lambda function isn't logging because its execution role lacks CloudWatch Logs permissions.

This lesson works through the common failure modes of the detection pipeline — missing logs, agent issues, permission gaps, and broken alerting — with the diagnostic logic the exam rewards. After it you will be able to take a logging or alerting symptom and identify its root cause and fix.

---

## Core Concepts

### The Permissions Failure Class

The most common reason logs or findings stop is **insufficient permissions**, and it shows up in several forms. A **Lambda function** that produces no logs almost always has an **execution role missing CloudWatch Logs permissions** (`logs:CreateLogGroup`, `logs:CreateLogStream`, `logs:PutLogEvents`) — Lambda only logs if its role allows it. A service writing to an **encrypted destination** fails if the **KMS key policy** doesn't grant the service access: CloudTrail to a KMS-encrypted S3 bucket, or CloudWatch Logs with a KMS-encrypted log group, both stop silently if the key policy omits the service principal. A **VPC Flow Log** to CloudWatch Logs needs an IAM role allowing it to publish. The diagnostic instinct: when a specific source stops logging to a specific destination, check the **role/policy of the producer** and the **resource/key policy of the destination**.

### The Agent and Configuration Failure Class

For OS-level and application logs, the **CloudWatch agent** (or unified agent) must be installed, running, and correctly configured, with an **instance profile** granting `cloudwatch:PutMetricData` and `logs:*` permissions. Symptoms of agent problems: no OS metrics (memory, disk) or no application log files appearing in CloudWatch Logs. Common causes: agent not installed, agent configuration file pointing at the wrong log paths, the instance role lacking permissions, or the agent not started. **Systems Manager** is the standard way to install and manage the agent at scale, so "deploy/repair the agent fleet-wide" → SSM. For service-level logging that's simply **not enabled** — API Gateway access/execution logs, CloudFront logging, ELB access logs, S3 data events — the fix is to turn on the specific logging option, since many are off by default.

### The Scope and Coverage Failure Class

In organizations, detection gaps often come from **scope**: a service enabled per-account but not org-wide, a **new account** not auto-enrolled, a finding produced in a **Region** that isn't aggregated, or an organization trail that a member somehow has permissions to affect. The remedies are the organization patterns from the earlier lessons: enable GuardDuty/Security Hub/Macie via a **delegated administrator with auto-enable for new accounts**, configure **cross-Region aggregation**, and use an **organization CloudTrail trail** members cannot disable. When a question says "Account X isn't covered" or "findings from Region Y don't appear centrally," think scope and auto-enrollment/aggregation settings.

### Diagnosing Missing Logs — A Method

For "logs aren't appearing," work the chain from source to destination: (1) **Is the log type enabled?** (data events, API Gateway logging, flow logs). (2) **Does the producer have permission?** (Lambda execution role, flow-log role, agent instance profile). (3) **Is the destination reachable and writable?** (log group exists, S3 bucket policy allows the service, **KMS key policy** allows the service). (4) **Is there a delivery delay vs. a real failure?** (some logs have minutes of latency). (5) **Scope** — right account/Region. Most missing-log scenarios resolve at step 2 or 3 (a permission or key-policy gap) or step 1 (logging not enabled).

### Diagnosing Alerting Failures

When an alarm or automated response doesn't fire, check the pipeline: the **metric filter** must match the log pattern (a wrong pattern means the metric never increments, so the alarm never triggers); the **alarm** threshold/period/missing-data setting must be correct; the **EventBridge rule** pattern must actually match the finding (a too-specific event pattern is a frequent cause of "the rule never matched"); and the **target** (SNS topic, Lambda) must have permission to be invoked and the SNS topic must have subscriptions. A subtle one: an EventBridge rule for GuardDuty findings with an overly narrow `detail` filter (wrong severity range or finding type) silently matches nothing. Test event patterns against sample events.

### Proactively Validating the Pipeline

Because detection failures are silent, mature teams *validate* the pipeline rather than assume it works — and the exam favors this proactive posture. Techniques include generating **benign test events** that should trigger a known finding or alarm (for example, an intentional, safe action that a metric filter or GuardDuty sample finding should catch) and confirming the alert arrives end to end; using **GuardDuty sample findings** to exercise the EventBridge-to-responder path; and deploying **AWS Config rules** or **Security Hub controls** that flag when a required logging configuration drifts (a trail disabled, a log group deleted, flow logs removed). **Systems Manager State Manager** and **Config conformance packs** can continuously enforce that logging and agents stay configured, automatically remediating drift. The principle: treat the detection pipeline as a production system with its own monitoring, so a broken control is itself detected and corrected rather than discovered during an incident.

### Health Checks and Functional Validation

Task 1.3 also references analyzing the **functionality, permissions, and configuration** of resources, including **health checks** (e.g., Route 53 or load balancer health checks indicating whether a monitored endpoint is actually up) and per-service logging like **CloudFront** and **API Gateway**. Troubleshooting here means validating that the monitoring control is actually exercising the resource and that its results are being captured — a health check misconfigured to the wrong port/path will report false failures, and CloudFront/API Gateway logs that were never enabled produce no data to investigate.

---

## Configuration Reference

Symptom → likely cause → fix:

```text
Symptom                                  Likely cause                         Fix
---------------------------------------- ------------------------------------ -----------------------------
Lambda produces no logs                  execution role lacks logs perms       add logs:CreateLogGroup/Stream/PutLogEvents
CloudTrail/CW Logs stopped (encrypted)   KMS key policy omits the service       grant service principal kms:GenerateDataKey*/Decrypt
No OS metrics / app logs from EC2        CW agent not installed/configured      install/repair via SSM; fix instance profile
S3 object access not logged              data events not enabled                enable CloudTrail S3 data events
API Gateway / CloudFront logs missing    logging option not enabled             turn on access/execution logging
New account not covered                  not auto-enrolled                      delegated admin + auto-enable new accounts
Central findings missing a Region        no cross-Region aggregation            configure Security Hub aggregation Region
Alarm never fires                        metric filter pattern doesn't match    correct the filter pattern/threshold
EventBridge automation never runs        event pattern too narrow / no target perms  fix pattern; allow target invocation
```

"Missing logs" diagnostic chain:

```text
1. log type enabled?  →  2. producer has permission?  →  3. destination writable
   (incl. KMS key policy)  →  4. delivery delay vs failure?  →  5. correct account/Region?
```

Lambda logging permission (the canonical fix):

```json
{
  "Effect": "Allow",
  "Action": ["logs:CreateLogGroup","logs:CreateLogStream","logs:PutLogEvents"],
  "Resource": "arn:aws:logs:*:*:*"
}
```

---

## How to Decide

- **A specific source stopped logging?** → check the producer's role and the destination's resource/KMS key policy first.
- **OS/app logs or metrics missing from EC2?** → CloudWatch agent install/config and instance profile (manage via SSM).
- **A whole account or Region is dark?** → scope: delegated-admin auto-enable and cross-Region aggregation.
- **A specific log type is absent?** → confirm it's enabled (data events, API Gateway/CloudFront/ELB logging are opt-in).
- **An alarm or automation didn't fire?** → verify the metric-filter/event pattern matches and the target has permission/subscriptions.

---

## How This Connects

This lesson closes the Detection domain by ensuring the monitoring, logging, and analysis architectures from the prior three lessons actually work. The KMS-key-policy failures connect to Data Protection (Domain 5); the agent and patch tooling connects to Infrastructure Security (Domain 3, Systems Manager); the delegated-admin/scope fixes connect to Governance (Domain 6); and reliable alerting is the prerequisite for the Incident Response domain that follows.

---

## Exam Traps

- **Blaming the service when it's permissions.** Most "logs missing" cases are a producer role or a destination KMS/bucket policy gap, not a service outage.
- **Forgetting opt-in logging.** Data events, API Gateway, CloudFront, and ELB logging are off by default — absence often means "never enabled."
- **Overlooking the KMS key policy.** Encrypting a log destination without granting the logging service key access silently stops delivery.
- **Too-narrow EventBridge patterns.** An over-specific event pattern matches nothing, so the automation never runs — a common "why didn't it fire" cause.
- **Ignoring scope.** New accounts and un-aggregated Regions create blind spots; fix with delegated-admin auto-enable and aggregation.
- **Mistaking latency for failure.** Some logs/findings have minutes of delay; confirm it's a real failure before deep troubleshooting.

---

## Summary

Troubleshooting detection is a from-symptom-to-cause skill, and failures cluster into three classes: permissions (a producer role or a destination bucket/KMS key policy missing rights — the top cause of missing logs, including Lambda functions and KMS-encrypted CloudTrail/CloudWatch destinations), configuration (the CloudWatch agent not installed/configured, or an opt-in log type like data events or API Gateway/CloudFront logging not enabled), and scope (a new account not auto-enrolled or a Region not aggregated). For missing logs, walk the chain from "is it enabled" through "producer permission," "destination writable including KMS," delivery delay, and account/Region scope. For alerting failures, verify the metric-filter or EventBridge pattern actually matches and the target has permission and subscriptions. These checklists let you localize and fix detection breaks fast.

---

## Examples

**Example 1 — Lambda not logging.** A function emits nothing to CloudWatch Logs → its **execution role lacks logs permissions**; add `logs:CreateLogGroup/CreateLogStream/PutLogEvents`.

**Example 2 — CloudTrail went quiet.** After enabling KMS encryption on the trail's bucket, logs stopped → the **KMS key policy** doesn't grant CloudTrail access; add the service grant.

**Example 3 — Account blind spot.** A newly created account has no GuardDuty findings → it wasn't **auto-enrolled**; enable auto-enable for new accounts via the delegated administrator.

**Example 4 — Alarm silent.** A "root login" alarm never fires → the **metric filter pattern** doesn't match the actual CloudTrail event shape; correct the filter.

---

## Think About It

A team reports three problems: a Lambda function shows no logs, a newly added account produces no findings, and a high-severity-finding automation never triggers. For each, name the most likely root cause and the fix — and explain why all three are "silent" failures that wouldn't be obvious without deliberately validating the pipeline.

---

## Quick Check

1. What is the most common reason a Lambda function produces no CloudWatch logs?
2. After encrypting a log destination with KMS, logging stops — what's the likely cause?
3. Why might a newly created account have no GuardDuty or Security Hub findings?
4. Give two reasons an EventBridge-driven automated response might never run.

*Answers: (1) its execution role lacks CloudWatch Logs permissions (logs:CreateLogGroup/CreateLogStream/PutLogEvents); (2) the KMS key policy doesn't grant the logging service (CloudTrail/CloudWatch Logs) permission to use the key, so delivery fails silently; (3) it wasn't auto-enrolled — enable auto-enable for new accounts via the delegated administrator (and ensure Region aggregation); (4) the event pattern is too narrow and matches nothing, or the target (Lambda/SNS) lacks invocation permission / the SNS topic has no subscriptions.*

---

## What's Next

You've completed Module 1 (Detection). Next module: **Incident Response**, beginning with designing incident response plans and runbooks on AWS.
