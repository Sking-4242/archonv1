---
title: "Automation and Remediation: Systems Manager and EventBridge"
type: content
estimated_minutes: 15
cert_tags: ["SOA-C03"]
---

# Automation and Remediation: Systems Manager and EventBridge

## Overview

A CloudOps engineer's goal is operations that run themselves — issues detected and remediated without a human in the loop, routine tasks executed consistently at scale. The SOA-C03 exam tests this across Domain 1 (Task 1.2, "identify and remediate issues") and Domain 3 (Task 3.2, "automate the management of existing resources"), naming **AWS Systems Manager**, **EventBridge**, **Lambda**, and **auto scaling** as the building blocks. The questions are operational: "how do you automatically remediate this," "how do you run this task across a fleet," "the EventBridge rule didn't trigger — why."

The principle is **event-driven, codified operations**. Instead of an engineer SSHing into a server to fix a recurring problem, you encode the fix as a Systems Manager Automation runbook and trigger it automatically when CloudWatch or EventBridge detects the condition. Instead of manually patching or running commands on dozens of instances, you use Systems Manager to do it fleet-wide, consistently and auditably. This is the same automation discipline the security exam applies to incident response, but here applied to everyday operations — keeping resources healthy, configured, and patched. Knowing the Systems Manager capabilities and the EventBridge event-routing model, and how they chain (detect → route → remediate), is the core skill.

This lesson covers Systems Manager's operational capabilities, EventBridge event routing and troubleshooting, and event-driven remediation patterns. After it you will be able to design automated operations and remediation and troubleshoot why an automation didn't run.

## Core Concepts

### AWS Systems Manager — The Operations Toolbox

**AWS Systems Manager (SSM)** is the central operations service, and the exam expects familiarity with its key capabilities. **Run Command** executes commands across a fleet of managed instances without SSH. **Automation runbooks** (documents) are parameterized, multi-step procedures — AWS-provided or custom — that automate operational tasks (restart a service, create an AMI, remediate a finding, resize a volume). **State Manager** enforces a desired configuration over time (e.g., keep the CloudWatch agent installed). **Patch Manager** automates OS patching with baselines and maintenance windows. **Session Manager** gives auditable, keyless shell access. **Parameter Store** holds configuration and secrets. For managed-instance operations, instances need the **SSM Agent** (preinstalled on most AMIs) and an **instance profile** with the SSM permissions. The exam pairs "automate an operational task across instances without scripts/SSH" with Systems Manager (Run Command for ad-hoc, Automation runbooks for repeatable procedures).

### Automation Runbooks for Remediation

**Systems Manager Automation runbooks** are the heart of operational automation: parameterized documents that execute a sequence of steps (call AWS APIs, run scripts, wait for conditions, branch). AWS provides many predefined runbooks (e.g., `AWS-RestartEC2Instance`, `AWSConfigRemediation-*`), and you can author custom ones. Runbooks are how you **automatically remediate** issues — triggered by a CloudWatch alarm, an EventBridge rule, or an AWS Config rule — to fix the problem without human action (restart a hung instance, re-enable a disabled setting, resize an under-provisioned volume). The exam pairs "run a predefined or custom automated procedure to remediate/streamline operations" with Automation runbooks.

### EventBridge — Routing Operational Events

**Amazon EventBridge** is the event bus that routes events from AWS services (and custom sources) to targets based on **rules** that match event patterns. Operationally, EventBridge is how you trigger automation in response to things happening: an EC2 state change, a Config compliance change, a GuardDuty finding, an S3 event, or a scheduled time. A rule's **event pattern** filters which events match, and the rule dispatches to **targets** (Lambda, SSM Automation, SNS, Step Functions, and many more), optionally **transforming/enriching** the event payload. EventBridge also supports **scheduled rules** (cron/rate) for time-based automation. The exam tests building rules to route events to remediation and troubleshooting why a rule didn't fire.

### Troubleshooting EventBridge Rules

A frequent exam scenario is "the EventBridge rule didn't trigger the target." The usual causes: the **event pattern is too specific** and doesn't match the actual event shape (the single most common cause); the **target lacks permission** to be invoked (EventBridge needs permission, e.g., a resource policy on the target or an IAM role); the rule is on the **wrong event bus** (default vs. a custom or partner bus); or the event simply isn't being emitted to EventBridge. Diagnosing means comparing the rule's pattern against a real sample event and checking target permissions — the same systematic approach used throughout CloudOps troubleshooting.

### Event-Driven Remediation Patterns

The canonical automation chain is **detect → route → remediate**: a signal (CloudWatch alarm, Config rule, GuardDuty finding, or a state change) is matched by an **EventBridge rule** (or directly by an alarm action), which invokes a **target** — an **SSM Automation runbook** for an operational fix, a **Lambda function** for custom logic, **Auto Scaling** for capacity, or **Step Functions** for a multi-step workflow. For example: a CloudWatch alarm on instance status-check failure triggers the `AWS-RestartEC2Instance` runbook (or EC2 auto-recovery); a Config rule detecting an unencrypted resource triggers a remediation runbook; an S3 event triggers a Lambda to process the object. **AWS User Notifications** can centralize the human-facing alerts. The exam rewards recognizing this pattern and choosing the right target for the remediation.

### Operational Automation at Scale

Beyond reactive remediation, Systems Manager automates proactive operations: **maintenance windows** schedule patching and runbook execution; **State Manager** continuously enforces configuration; **inventory** tracks installed software; and **Run Command** pushes changes fleet-wide. Combined with EventBridge scheduled rules and Lambda, these let a small team operate a large estate consistently. The exam frames this as using AWS services to automate operational processes rather than performing them manually — the defining CloudOps mindset.

## Configuration Reference

Systems Manager operational capabilities:

```text
Run Command         ad-hoc commands across a fleet (no SSH)
Automation runbooks parameterized multi-step procedures (predefined or custom) — remediation
State Manager       enforce a desired configuration over time
Patch Manager       OS patching: baselines + maintenance windows
Session Manager     keyless, audited shell access
Parameter Store     config + secrets
(needs SSM Agent + instance profile with SSM permissions)
```

EventBridge routing:

```text
Rule = event pattern (filter) → target(s) (Lambda, SSM Automation, SNS, Step Functions, ...)
Scheduled rule = cron/rate expression for time-based automation
Transform/enrich the event payload before delivery
```

Detect → route → remediate:

```text
CloudWatch alarm  → action → SSM Automation / Auto Scaling / EC2 recover
Config rule       → EventBridge → SSM Automation remediation
GuardDuty finding → EventBridge → Lambda / SSM (contain)
S3 event / schedule → EventBridge/notification → Lambda
```

EventBridge "didn't fire" checklist:

```text
1. event pattern too specific → doesn't match the real event (top cause)
2. target lacks invoke permission (resource policy / IAM role)
3. wrong event bus (default vs custom/partner)
4. event not actually emitted to EventBridge
```

## How to Decide

- **Run an ad-hoc command across instances?** → Systems Manager **Run Command**.
- **Repeatable, parameterized remediation procedure?** → **SSM Automation runbook** (predefined or custom).
- **Trigger automation when something happens?** → **EventBridge rule** → target.
- **Time-based automation?** → EventBridge **scheduled rule** (cron/rate).
- **Keep a configuration enforced over time?** → **State Manager**. **Patch a fleet?** → **Patch Manager** + maintenance windows.
- **EventBridge rule didn't trigger?** → check pattern match, target permissions, and event bus.

## How This Connects

This lesson turns the monitoring signals from the previous lesson into automated action, and it's the operational counterpart to the security domain's incident-response automation. It builds on the shared Systems Manager and EventBridge lessons, and it underpins remediation across every domain — performance (auto-remediate an undersized volume), reliability (recover a failed instance), security (remediate a Config finding), and networking. Auto Scaling as a remediation target connects to the next reliability lessons.

## Exam Traps

- **Scripting/SSH where Systems Manager fits.** Run Command and Automation runbooks replace ad-hoc SSH/scripts for fleet operations.
- **Over-specific EventBridge patterns.** The top reason a rule "doesn't fire" is a pattern that doesn't match the real event — compare against a sample.
- **Forgetting target permissions.** EventBridge (and alarms) need permission to invoke the target.
- **Confusing Run Command and Automation.** Run Command is ad-hoc commands; Automation runbooks are multi-step parameterized procedures (for remediation).
- **Manual patching/config.** Use Patch Manager and State Manager to automate and enforce.
- **Wrong event bus.** Custom/partner events arrive on a non-default bus.

## Summary

CloudOps automates operations and remediation rather than performing them by hand. AWS Systems Manager is the toolbox: Run Command for ad-hoc fleet commands, **Automation runbooks** for repeatable parameterized remediation procedures (predefined or custom), State Manager to enforce configuration, Patch Manager for patching, and Session Manager for keyless access — all over managed instances with the SSM Agent and an instance profile. EventBridge routes operational events (state changes, Config/GuardDuty findings, S3 events, schedules) to targets via rules, enabling the canonical **detect → route → remediate** chain that drives SSM Automation, Lambda, Auto Scaling, or Step Functions. When an EventBridge rule doesn't fire, the cause is almost always a too-specific event pattern, a missing target permission, or the wrong event bus. Mastering these building blocks is the essence of the CloudOps automation domains.

## Examples

**Example 1 — Auto-restart.** An instance fails its status check → a CloudWatch alarm triggers the **`AWS-RestartEC2Instance`** Automation runbook (or EC2 auto-recovery) — no human needed.

**Example 2 — Auto-remediate config drift.** A Config rule finds a bucket became public → **EventBridge** routes the change to an **SSM Automation** runbook that re-enables Block Public Access.

**Example 3 — Fleet command.** Restart a service on 200 instances → **Run Command** executes it everywhere without SSH.

**Example 4 — Rule didn't fire.** A remediation never runs on a GuardDuty finding → the **event pattern** was too specific (wrong severity/type filter); fix it against a sample event and confirm target permissions.

## Think About It

A team wants any EC2 instance that drifts from the approved configuration to be automatically corrected, and any instance that fails a status check to be automatically restarted. Describe the AWS services and the detect-route-remediate chain you'd build for each, and explain the first thing you'd check if the automation silently stopped firing after working initially.

## Quick Check

1. What is the difference between Systems Manager Run Command and Automation runbooks?
2. What is the canonical detect-route-remediate chain for automated operations?
3. What is the most common reason an EventBridge rule fails to trigger its target?
4. Which Systems Manager capability enforces a desired configuration over time?

*Answers: (1) Run Command executes ad-hoc commands across managed instances without SSH, while Automation runbooks are parameterized, multi-step procedures (predefined or custom) used for repeatable remediation and operational tasks; (2) a signal (CloudWatch alarm, Config rule, GuardDuty finding, state change, or schedule) is matched by an EventBridge rule (or alarm action) that invokes a target — SSM Automation, Lambda, Auto Scaling, or Step Functions; (3) the event pattern is too specific and doesn't match the actual event shape (also check target permissions and the event bus); (4) State Manager.*

## What's Next

Next: **Performance Optimization and Troubleshooting** — interpreting compute, EBS, RDS, and S3 performance metrics and remediating bottlenecks.
