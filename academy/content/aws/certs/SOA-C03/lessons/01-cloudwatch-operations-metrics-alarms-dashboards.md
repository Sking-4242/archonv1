---
title: "CloudWatch Operations: Metrics, Alarms, Dashboards, and the Agent"
type: content
estimated_minutes: 15
cert_tags: ["SOA-C03"]
---

# CloudWatch Operations: Metrics, Alarms, Dashboards, and the Agent

## Overview

CloudOps is the operations exam, and Amazon CloudWatch is its most-used service. The general curriculum introduces CloudWatch as a monitoring service; the CloudOps (SOA-C03) exam expects you to *operate* it — configure the CloudWatch agent to collect the metrics that aren't there by default, build alarms (including composite alarms) that drive the right actions, and create dashboards that span accounts and Regions. Domain 1, Task 1.1 ("Implement metrics, alarms, and filters") is the foundation of the exam's largest domain (Monitoring, Logging, Analysis, Remediation, and Performance Optimization, 22%), and the questions are configuration- and troubleshooting-oriented: "metrics are missing, why?", "this alarm didn't fire, why?", "which alarm type reduces noise?".

The operational reality this lesson addresses is that **CloudWatch only shows what it's told to collect**. By default, EC2 publishes CPU, network, and disk *I/O* metrics — but **not memory or disk-space utilization**, because those live inside the guest OS where the hypervisor can't see them. Collecting them requires the **CloudWatch agent**. Likewise, alarms are only useful if they're configured with the right thresholds, periods, missing-data behavior, and actions, and dashboards only help if operators can see across the whole estate. A CloudOps engineer who knows exactly what's collected by default, how to fill the gaps, and how to wire alarms to actions can answer most of Domain 1's monitoring questions on sight.

This lesson covers default vs. custom metrics, the CloudWatch agent, alarm configuration and composite alarms, dashboards, and notifications. After it you will be able to operate CloudWatch monitoring and troubleshoot why metrics or alarms aren't behaving as expected.

## Core Concepts

### Default Metrics vs. What the Agent Collects

EC2 publishes **basic metrics** to CloudWatch automatically at 5-minute granularity (or 1-minute with **detailed monitoring** enabled): CPU utilization, network in/out, disk I/O for instance-store volumes, and status checks. Critically, **memory utilization and disk (filesystem) space used are NOT collected by default** — these are guest-OS-level metrics CloudWatch cannot see from outside. The **unified CloudWatch agent** collects them, along with custom application logs and additional system metrics, and publishes them as custom metrics. This default-vs-agent distinction is one of the most frequently tested facts on the exam: "an alarm on memory usage never triggers" almost always means **the CloudWatch agent isn't installed or configured** to publish the memory metric.

### Configuring and Managing the CloudWatch Agent

The **CloudWatch agent** runs on EC2, on-premises servers, and containers (ECS/EKS) and collects system-level metrics (memory, disk, processes) and logs. Operationally: the instance needs an **IAM role/instance profile** granting `cloudwatch:PutMetricData` and `logs:*` permissions; the agent is installed and configured via a JSON config file (which metrics/logs to collect, at what interval), and is best deployed and managed at scale with **AWS Systems Manager** (Run Command or State Manager push the agent and config to a fleet, and keep them consistent). When agent-collected metrics are missing, the usual causes are a missing IAM permission, a misconfigured agent config file, or the agent not running — the same troubleshooting chain as any producer→CloudWatch pipeline.

### CloudWatch Alarms — Configuration That Matters

An **alarm** watches a single metric (or a metric math expression) and changes state — OK, ALARM, or INSUFFICIENT_DATA — based on a **threshold**, **period**, **evaluation periods**, and **datapoints to alarm**. The operationally important settings: the **period** (how the metric is aggregated, e.g., 5 minutes), **evaluation periods / datapoints to alarm** (how many periods must breach before alarming — used to avoid flapping on a single spike), and **missing-data treatment** (treat missing as breaching, not breaching, ignore, or missing — a common cause of alarms that fire or don't fire unexpectedly). Alarm **actions** can notify an SNS topic, trigger an Auto Scaling action, recover or stop/terminate an EC2 instance, or invoke a Systems Manager action. The exam tests configuring alarms to behave correctly and diagnosing why one didn't fire (often a missing-data setting or too-high "datapoints to alarm").

### Composite Alarms — Reducing Noise

A **composite alarm** combines multiple alarms with a rule expression (AND/OR/NOT) and alarms only when the combination is true — for example, "alarm only if high CPU AND high latency are both happening." Composite alarms **reduce alarm noise and false positives** by suppressing notifications until a meaningful combination of conditions occurs, and they let you send a single notification for a correlated event instead of dozens of individual alarms. The exam pairs "reduce alarm noise / notify only when several conditions coincide" with composite alarms.

### Dashboards Across Accounts and Regions

**CloudWatch dashboards** are customizable, shareable views of metrics and alarms. The operational requirement the exam highlights is **cross-account and cross-Region dashboards** — a central operations team needs one dashboard showing the health of resources across many accounts and Regions. This uses CloudWatch **cross-account observability** (a monitoring account linked to source accounts) so a single dashboard aggregates metrics, logs, and alarms organization-wide. The exam pairs "single dashboard across multiple accounts/Regions" with cross-account observability and shareable dashboards.

### Logs, Metric Filters, and Notifications

CloudWatch Logs ingests application and agent logs, and **metric filters** turn log patterns into metrics (e.g., count "ERROR" lines) that alarms can watch — the standard way to alarm on something appearing in logs. Alarms and AWS services send **notifications via Amazon SNS** (email, SMS, or fan-out to Lambda/queues), and SNS is the hub for alarm and event notifications. A frequent operational pattern: a metric filter counts error log events → an alarm on that metric → an SNS notification (or an automated remediation, covered in the next lesson).

## Configuration Reference

What's collected, and how to fill gaps:

```text
Default EC2 metrics:   CPU, network in/out, disk I/O (instance store), status checks
                       (5-min basic, 1-min with Detailed Monitoring)
NOT default:           memory utilization, disk/filesystem space → require the CloudWatch agent
CloudWatch agent:      memory, disk space, processes, custom logs; needs IAM role + config file;
                       deploy/manage at scale via Systems Manager (Run Command / State Manager)
```

Alarm settings that drive behavior:

```text
period                 aggregation window (e.g., 5 min)
evaluation periods /   how many periods must breach before ALARM (anti-flapping)
  datapoints to alarm
missing data treatment missing → breaching | notBreaching | ignore | missing  (common gotcha)
actions                SNS notify · Auto Scaling · EC2 recover/stop/terminate · SSM
composite alarm        combine alarms with AND/OR/NOT → reduce noise, notify on correlated events
```

Common monitoring patterns:

```text
Alarm on memory/disk       → install CloudWatch agent first (not a default metric)
Alarm on a log pattern     → metric filter → alarm → SNS
One dashboard, many accts  → CloudWatch cross-account observability (monitoring account)
Notify on alarm            → alarm action → SNS topic → email/Lambda/queue
```

## How to Decide

- **Need memory or disk-space metrics?** → install/configure the **CloudWatch agent** (not available by default).
- **Deploy/maintain the agent across a fleet?** → **Systems Manager** (Run Command / State Manager).
- **Alarm fires on a single spike (noisy)?** → raise **datapoints to alarm** / evaluation periods.
- **Alarm should fire only when several conditions coincide?** → **composite alarm**.
- **Alarm never fires / fires unexpectedly with gaps?** → check **missing-data treatment**.
- **One view across accounts/Regions?** → cross-account observability dashboards.
- **Alarm on something in logs?** → metric filter → alarm.

## How This Connects

This lesson is the foundation of the CloudOps monitoring domain and feeds the next lesson on automated remediation (alarms and events trigger Systems Manager and Lambda). It builds on the shared CloudWatch metrics/logs and Systems Manager lessons, taking them to operational-configuration depth, and connects to performance optimization (Task 1.3, the next lessons interpret these metrics) and to every other domain, since monitoring underlies reliability, security, and networking operations.

## Exam Traps

- **Expecting memory/disk-space metrics by default.** They require the CloudWatch agent; an alarm on them with no agent never triggers.
- **Confusing basic and detailed monitoring.** Basic is 5-minute; detailed is 1-minute (and costs more) — relevant when faster reaction is needed.
- **Ignoring missing-data treatment.** It silently changes whether an alarm fires when datapoints are absent.
- **Using many single alarms where a composite fits.** Composite alarms reduce noise by alarming only on a combination.
- **Agent metrics missing.** Check the instance IAM role permissions, the agent config file, and that the agent is running.
- **Forgetting SNS for notifications.** Alarm/event notifications fan out through SNS.

## Summary

CloudWatch only monitors what it's configured to collect: EC2 publishes CPU, network, disk I/O, and status checks by default, but **memory and disk-space utilization require the CloudWatch agent**, deployed and kept consistent at scale with Systems Manager and backed by an instance IAM role. Alarms watch a metric against a threshold over a period, and their real behavior depends on evaluation periods/datapoints-to-alarm (anti-flapping) and missing-data treatment (a frequent cause of surprising behavior); their actions notify SNS or trigger Auto Scaling, EC2 recovery, or Systems Manager. Composite alarms combine conditions to cut noise, metric filters turn log patterns into alarmable metrics, and cross-account observability gives a single dashboard across accounts and Regions. Knowing exactly what's collected by default and how to fill the gaps resolves most of the exam's monitoring and "why didn't it fire" questions.

## Examples

**Example 1 — Missing memory metric.** A memory-utilization alarm never enters ALARM → memory isn't a default EC2 metric; install and configure the **CloudWatch agent** (with the right IAM role) to publish it.

**Example 2 — Noisy alarms.** Operators get paged for every brief CPU spike → increase **datapoints to alarm** (e.g., 3 of 5 periods) or use a **composite alarm** requiring CPU AND latency.

**Example 3 — Cross-account view.** A central team needs one dashboard for 20 accounts → enable **CloudWatch cross-account observability** with a monitoring account.

**Example 4 — Alarm on errors.** Page when "ERROR" appears frequently in logs → a **metric filter** counts ERROR lines, an alarm watches that metric, and the action notifies an **SNS** topic.

## Think About It

An operations team sets a disk-space-used alarm on a fleet of EC2 instances and is puzzled that it stays in INSUFFICIENT_DATA forever. Explain the most likely root cause (think about what CloudWatch can and cannot see from outside the instance), the exact remediation, and one configuration detail you'd check on the alarm itself if the metric were present but the alarm still behaved oddly.

## Quick Check

1. Which two common metrics are NOT collected from EC2 by default, and what's needed to collect them?
2. What does a composite alarm do, and what problem does it solve?
3. Name two alarm settings that affect whether an alarm fires as expected.
4. How do you build one dashboard spanning many accounts and Regions?

*Answers: (1) memory utilization and disk/filesystem space used — they require the CloudWatch agent (with an instance IAM role), deployed via Systems Manager; (2) it combines multiple alarms with AND/OR/NOT logic and fires only on the combination, reducing alarm noise and notifying on correlated events; (3) any two of period, evaluation periods/datapoints-to-alarm, and missing-data treatment; (4) enable CloudWatch cross-account observability with a monitoring account linked to the source accounts and use shareable cross-account/cross-Region dashboards.*

## What's Next

Next: **Automation and Remediation: Systems Manager and EventBridge** — turning monitoring signals into automated operational responses with SSM Automation runbooks and EventBridge.
